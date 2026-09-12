import { env } from './env.js';

/**
 * Every email the League sends, in one place so the voice stays consistent.
 *
 * Plain inline-styled HTML: mail clients strip <style> blocks and ignore most CSS, and a
 * link that renders as a button in Gmail and as a plain link in Outlook is the best any
 * email gets.
 */

const escape = (value: string) =>
  value.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);

function layout(heading: string, paragraphs: string[], action?: { label: string; href: string }) {
  const body = paragraphs
    .map((p) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.5;color:#1f2a2e">${p}</p>`)
    .join('');
  const button = action
    ? `<p style="margin:24px 0"><a href="${escape(action.href)}" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:999px">${escape(action.label)}</a></p>
       <p style="margin:0 0 16px;font-size:13px;line-height:1.5;color:#5b6b70">Or paste this into your browser:<br>${escape(action.href)}</p>`
    : '';
  return `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px">
    <h1 style="font-size:22px;margin:0 0 16px;color:#1f2a2e">${escape(heading)}</h1>
    ${body}${button}
    <p style="margin:32px 0 0;font-size:13px;color:#5b6b70">ColorStack Tech League at Georgia State University</p>
  </div>`;
}

export function verifyEmail(tokenHash: string, type: 'signup' | 'magiclink') {
  const href = `${env().APP_URL}/verify?token_hash=${encodeURIComponent(tokenHash)}&type=${type}`;
  return {
    subject: 'Confirm your Tech League account',
    html: layout(
      'Confirm your email',
      [
        'Someone, hopefully you, created a ColorStack Tech League account with this address. Confirm it to finish signing up.',
        'The link works once and expires in an hour. If this was not you, ignore this email and nothing happens.',
      ],
      { label: 'Confirm my email', href }
    ),
  };
}

export function resetPasswordEmail(tokenHash: string) {
  const href = `${env().APP_URL}/reset-password?token_hash=${encodeURIComponent(tokenHash)}`;
  return {
    subject: 'Reset your Tech League password',
    html: layout(
      'Reset your password',
      [
        'We got a request to reset the password on your ColorStack Tech League account.',
        'The link works once and expires in an hour. If you did not ask for this, ignore this email and your password stays the same.',
      ],
      { label: 'Choose a new password', href }
    ),
  };
}

export function decisionEmail(decision: 'accepted' | 'denied', firstName: string) {
  const hello = firstName ? `Hi ${escape(firstName)},` : 'Hi,';
  if (decision === 'accepted') {
    return {
      subject: "You're in the ColorStack Tech League",
      html: layout(
        "You're in",
        [
          hello,
          'Your application to the ColorStack Tech League has been accepted. Welcome to the season.',
          'Next, get on a team. Teams are 3 or 4 people: start your own and invite people, or ask to join a team that still has room.',
        ],
        { label: 'Find a team', href: `${env().APP_URL}/teams` }
      ),
    };
  }
  return {
    subject: 'Your ColorStack Tech League application',
    html: layout('About your application', [
      hello,
      'Thank you for applying to the ColorStack Tech League. Spots this season are limited, and we are not able to offer you one this time.',
      'This is not a judgment of your potential. We hope you apply again next season, and every ColorStack at GSU event stays open to you.',
    ]),
  };
}
