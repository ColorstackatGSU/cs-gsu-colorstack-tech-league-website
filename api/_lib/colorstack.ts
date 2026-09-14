import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';
import { env } from './env.js';
import { HttpError } from './errors.js';
import { RACE_ETHNICITY } from './profile.js';

/**
 * The client half of "Sign in with ColorStack at GSU".
 *
 * Follows https://api.colorstackatgsu.com/docs/oauth: authorization code with PKCE (S256,
 * mandatory), state checked on the way back, the client secret sent by HTTP Basic from
 * this server and never from the browser.
 *
 * Claims come from /userinfo rather than the ID token, because the resume claims are only
 * ever served there. The token is exchanged server to server over TLS with client
 * authentication, which is what lets OIDC skip validating an ID token signature; we never
 * take one from the browser.
 *
 * The portal's tokens are used once, during the callback, and thrown away. Nothing here
 * keeps a refresh token, so there is no background sync: a changed portal resume is
 * picked up the next time the member signs in with ColorStack.
 */

export const SCOPES = ['openid', 'profile', 'email', 'socials', 'discord', 'demographics', 'resume'];

function colorstackConfig() {
  const { COLORSTACK_ISSUER, COLORSTACK_CLIENT_ID, COLORSTACK_CLIENT_SECRET, COLORSTACK_REDIRECT_URI } = env();
  if (!COLORSTACK_ISSUER || !COLORSTACK_CLIENT_ID || !COLORSTACK_CLIENT_SECRET || !COLORSTACK_REDIRECT_URI) {
    throw new HttpError(503, 'Sign in with ColorStack is not available right now. Use your email and password instead.');
  }
  return { COLORSTACK_ISSUER, COLORSTACK_CLIENT_ID, COLORSTACK_CLIENT_SECRET, COLORSTACK_REDIRECT_URI };
}

export function startAuthorization() {
  const { COLORSTACK_ISSUER, COLORSTACK_CLIENT_ID, COLORSTACK_REDIRECT_URI } = colorstackConfig();
  const state = randomBytes(24).toString('base64url');
  const verifier = randomBytes(48).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');

  const url = new URL(`${COLORSTACK_ISSUER}/oauth2/authorize`);
  url.search = new URLSearchParams({
    response_type: 'code',
    client_id: COLORSTACK_CLIENT_ID,
    // Matched literally by the portal: scheme, host, port, path, no trailing slash.
    redirect_uri: COLORSTACK_REDIRECT_URI,
    scope: SCOPES.join(' '),
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  }).toString();

  return { url: url.toString(), state, verifier };
}

/**
 * What ColorStack said when it refused, for the log. Error responses from the portal carry
 * an OAuth error code and description, never a token, so the body is safe to log; it is
 * still cut short so an unexpected HTML page cannot flood the function log.
 */
async function describeFailure(response: Response) {
  const text = await response.text().catch(() => '');
  const challenge = response.headers.get('www-authenticate');
  const body = text.length > 500 ? `${text.slice(0, 500)}...` : text;
  return [response.status, challenge && `www-authenticate: ${challenge}`, body && `body: ${body}`]
    .filter(Boolean)
    .join(' ');
}

export async function exchangeCode(code: string, verifier: string) {
  const { COLORSTACK_ISSUER, COLORSTACK_CLIENT_ID, COLORSTACK_CLIENT_SECRET, COLORSTACK_REDIRECT_URI } = colorstackConfig();
  const basic = Buffer.from(
    `${encodeURIComponent(COLORSTACK_CLIENT_ID)}:${encodeURIComponent(COLORSTACK_CLIENT_SECRET)}`
  ).toString('base64');

  const response = await fetch(`${COLORSTACK_ISSUER}/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: COLORSTACK_REDIRECT_URI,
      code_verifier: verifier,
    }),
  });
  if (!response.ok) {
    throw new Error(`ColorStack token exchange failed: ${await describeFailure(response)}`);
  }
  const body = z.object({ access_token: z.string() }).parse(await response.json());
  return body.access_token;
}

/**
 * Every claim except sub can be missing. Consent is all or nothing, so a member who allows
 * the sign-in grants every scope we asked for, but the portal omits a claim whose field
 * the member left blank on their profile. So every field is optional, and blank strings
 * are treated the same as absent rather than written over something we already had.
 */
const optionalText = z
  .string()
  .nullish()
  .transform((value) => (value && value.trim() ? value.trim() : undefined));

const claimsSchema = z.object({
  sub: z.string().min(1),
  given_name: optionalText,
  family_name: optionalText,
  name: optionalText,
  major: optionalText,
  class_year: optionalText,
  // Just the season: 'Spring' | 'Summer' | 'Fall'. The year comes separately in grad_year.
  grad_term: optionalText,
  grad_year: z.number().int().nullish(),
  email: optionalText,
  email_verified: z.boolean().nullish(),
  personal_email: optionalText,
  linkedin_url: optionalText,
  github_url: optionalText,
  discord_username: optionalText,
  race_ethnicity: z.array(z.string()).nullish(),
  resume_download_url: optionalText,
  resume_filename: optionalText,
  resume_uploaded_at: optionalText,
});

export type ColorStackClaims = z.infer<typeof claimsSchema>;

export async function fetchClaims(accessToken: string): Promise<ColorStackClaims> {
  const response = await fetch(`${colorstackConfig().COLORSTACK_ISSUER}/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`ColorStack userinfo failed: ${await describeFailure(response)}`);
  }
  return claimsSchema.parse(await response.json());
}

const MAX_RESUME_BYTES = 4 * 1024 * 1024;

/**
 * Downloads the member's portal resume with the access token.
 *
 * The URL comes from a claim, so it is checked to be on the issuer before the token is
 * attached to it. A bearer token sent wherever a claim points is a token handed to anyone
 * who can influence that claim.
 */
export async function downloadResume(claims: ColorStackClaims, accessToken: string) {
  if (!claims.resume_download_url) return null;
  const url = new URL(claims.resume_download_url);
  if (url.origin !== new URL(colorstackConfig().COLORSTACK_ISSUER).origin) {
    throw new Error(`refusing to send the ColorStack token to ${url.origin}`);
  }

  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) throw new Error(`ColorStack resume download failed: ${await describeFailure(response)}`);

  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length === 0 || bytes.length > MAX_RESUME_BYTES) {
    throw new Error(`ColorStack resume is ${bytes.length} bytes, outside what we store`);
  }
  if (bytes.subarray(0, 5).toString('latin1') !== '%PDF-') {
    throw new Error('ColorStack resume is not a PDF');
  }
  return bytes;
}

/**
 * Maps portal claims onto the application form's fields, keeping only values the form
 * would itself accept. A portal value the form has no option for is dropped rather than
 * stored as something the member can then never select again.
 *
 * The shapes come from cs-gsu_backend (MemberClaims.java and the members migration), not
 * from the docs page: grad_term is only the season and grad_year the number, so the
 * form's "Spring 2028" is built from both. class_year's fifth value, "Graduate Student",
 * is left blank because the form splits it into Master's and PhD and we cannot tell which.
 */
const YEARS = ['Freshman', 'Sophomore', 'Junior', 'Senior'];
const MAJORS = [
  'Computer Science',
  'Computer Information Systems',
  'Data Science',
  'Software Engineering',
  'Cybersecurity',
  'Mathematics',
  'Engineering',
];

/**
 * The portal's answer, kept only if applications_race_ethnicity_known would accept it:
 * every value a known category, and "Prefer not to say" only on its own. Anything else is
 * dropped rather than inserted, because a CHECK violation on the application insert would
 * fail the whole sign-in, not just this field.
 */
function raceEthnicityPrefill(values: string[] | null | undefined) {
  if (!values || values.length === 0) return undefined;
  const unique = [...new Set(values)];
  const known = unique.every((value) => (RACE_ETHNICITY as readonly string[]).includes(value));
  const declineAlone = !unique.includes('Prefer not to say') || unique.length === 1;
  return known && declineAlone ? unique : undefined;
}

export function applicationPrefill(claims: ColorStackClaims) {
  const fullName =
    claims.name ?? ([claims.given_name, claims.family_name].filter(Boolean).join(' ') || undefined);
  const personal = claims.personal_email?.toLowerCase();
  return {
    full_name: fullName,
    personal_email: personal && personal !== claims.email?.toLowerCase() ? personal : undefined,
    race_ethnicity: raceEthnicityPrefill(claims.race_ethnicity),
    year: claims.class_year && YEARS.includes(claims.class_year) ? claims.class_year : undefined,
    major: claims.major && MAJORS.includes(claims.major) ? claims.major : undefined,
    grad_term:
      claims.grad_term && ['Spring', 'Summer', 'Fall'].includes(claims.grad_term) && claims.grad_year
        ? `${claims.grad_term} ${claims.grad_year}`
        : undefined,
  };
}
