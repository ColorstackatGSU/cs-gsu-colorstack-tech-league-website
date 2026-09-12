import { createSign } from 'node:crypto';
import { env, isProduction } from './env.js';

/**
 * Outbound email, sent as the chapter's own mailbox.
 *
 * The same arrangement as the member portal (cs-gsu_backend, Mailer.java and
 * GmailSender.java): Gmail's HTTPS API, authenticated by the chapter's service account
 * with domain-wide delegation for gmail.send, acting as official@. One key to manage
 * across both sites, no third-party provider, and no DNS records the registrar cannot
 * create.
 *
 * With neither variable set the message is printed instead, which is the local default so
 * the whole signup flow can be clicked through with no mailbox: the link is in the
 * terminal. That fallback refuses to run in production, where printing a sign-in link to a
 * log would be both a silent failure and a leak.
 *
 * send throws on failure. Callers decide what a failed send means for them, and none of
 * them should pretend it went.
 */

type Credentials = { client_email: string; private_key: string };

let cachedToken: { value: string; expiresAt: number } | null = null;

const base64url = (input: Buffer | string) => Buffer.from(input).toString('base64url');

async function accessToken(credentials: Credentials, sendAs: string) {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;

  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64url(
    JSON.stringify({
      iss: credentials.client_email,
      // Without sub the key authenticates as the service account, which owns no mailbox,
      // and every send fails with "precondition check failed".
      sub: sendAs,
      scope: 'https://www.googleapis.com/auth/gmail.send',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    })
  );
  const signature = createSign('RSA-SHA256')
    .update(`${header}.${claims}`)
    .sign(credentials.private_key, 'base64url');

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${header}.${claims}.${signature}`,
    }),
  });
  if (!response.ok) {
    throw new Error(`Gmail token request failed: ${response.status} ${await response.text()}`);
  }
  const body = (await response.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: body.access_token, expiresAt: Date.now() + body.expires_in * 1000 };
  return cachedToken.value;
}

// RFC 2047, so a subject with an apostrophe or an em dash arrives intact.
const encodeHeader = (value: string) => `=?UTF-8?B?${Buffer.from(value).toString('base64')}?=`;

function mime(from: string, to: string[], subject: string, html: string) {
  const body = Buffer.from(html).toString('base64').replace(/.{76}/g, '$&\r\n');
  return [
    `From: ${from}`,
    `To: ${to.join(', ')}`,
    `Subject: ${encodeHeader(subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    body,
  ].join('\r\n');
}

export async function sendMail(to: string[], subject: string, html: string) {
  if (to.length === 0) throw new Error('sendMail needs at least one recipient');
  const { GMAIL_SEND_AS, GOOGLE_CREDENTIALS_JSON, MAIL_FROM } = env();

  if (!GMAIL_SEND_AS || !GOOGLE_CREDENTIALS_JSON) {
    if (isProduction()) {
      throw new Error('No mail transport configured: set GMAIL_SEND_AS and GOOGLE_CREDENTIALS_JSON');
    }
    console.info(`[mail] not sent, no transport configured\n  to: ${to.join(', ')}\n  ${subject}\n${html}`);
    return;
  }

  const credentials = JSON.parse(GOOGLE_CREDENTIALS_JSON) as Credentials;
  const token = await accessToken(credentials, GMAIL_SEND_AS);

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    // Base64url, which is what the API expects rather than standard base64.
    body: JSON.stringify({ raw: base64url(mime(MAIL_FROM, to, subject, html)) }),
  });
  if (!response.ok) {
    throw new Error(`Gmail send failed: ${response.status} ${await response.text()}`);
  }
}
