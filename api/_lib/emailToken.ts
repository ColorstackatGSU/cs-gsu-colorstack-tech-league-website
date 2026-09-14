import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from './env.js';

/**
 * Signed links for confirming an application's personal email.
 *
 * Stateless on purpose: the token carries who, which address and until when, signed with
 * a key derived from the service role key. Nothing to store or clean up, and replaying a
 * link only confirms the same address for the same member again, which is harmless. A link
 * for an address the member has since changed simply no longer matches their application.
 */

const TTL_MS = 24 * 60 * 60 * 1000;

const key = () => createHmac('sha256', env().SUPABASE_SERVICE_ROLE_KEY).update('personal-email-v1').digest();

const sign = (payload: string) => createHmac('sha256', key()).update(payload).digest('base64url');

export function personalEmailToken(userId: string, email: string) {
  const payload = Buffer.from(
    JSON.stringify({ u: userId, e: email.toLowerCase(), x: Date.now() + TTL_MS })
  ).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

/** The member and address a token vouches for, or null if it is forged or expired. */
export function readPersonalEmailToken(token: string): { userId: string; email: string } | null {
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;

  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;

  try {
    const { u, e, x } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (typeof u !== 'string' || typeof e !== 'string' || typeof x !== 'number' || x < Date.now()) return null;
    return { userId: u, email: e };
  } catch {
    return null;
  }
}
