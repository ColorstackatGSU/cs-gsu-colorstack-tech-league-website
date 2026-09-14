import type { Session, SupabaseClient } from '@supabase/supabase-js';
import type { Context, MiddlewareHandler } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { HttpError } from './errors.js';
import { asMember, authClient } from './supabase.js';

/**
 * Member sessions, held in HttpOnly cookies.
 *
 * Why cookies rather than handing the browser a token to keep: an HttpOnly cookie cannot
 * be read by any script on the page, so an XSS bug cannot walk off with a session. And
 * the ColorStack callback ends in a redirect, which can set a cookie but has no clean way
 * to hand a token to JavaScript.
 *
 * SameSite=Lax is the CSRF defence: a form on another site posting here arrives without
 * these cookies. requireSameOrigin below is the second layer, for older browsers.
 *
 * Both cookies are scoped to /api, since nothing else on the site needs to see them.
 */

const ACCESS_COOKIE = 'tl_access';
const REFRESH_COOKIE = 'tl_refresh';
// Refresh tokens are rotated on every use, so this is "30 days since last visit".
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export type Member = { id: string; email: string };

export type AuthedEnv = {
  Variables: {
    member: Member;
    db: SupabaseClient;
    accessToken: string;
  };
};

function secure(c: Context) {
  return new URL(c.req.url).protocol === 'https:';
}

export function setSession(c: Context, session: Session) {
  const options = {
    httpOnly: true,
    secure: secure(c),
    sameSite: 'Lax',
    path: '/api',
    maxAge: SESSION_MAX_AGE,
  } as const;
  setCookie(c, ACCESS_COOKIE, session.access_token, options);
  setCookie(c, REFRESH_COOKIE, session.refresh_token, options);
}

export function clearSession(c: Context) {
  deleteCookie(c, ACCESS_COOKIE, { path: '/api', secure: secure(c) });
  deleteCookie(c, REFRESH_COOKIE, { path: '/api', secure: secure(c) });
}

export function readAccessToken(c: Context) {
  return getCookie(c, ACCESS_COOKIE) ?? null;
}

/**
 * Works out who is calling, refreshing the session if the access token has expired.
 * Returns null for a signed-out caller rather than throwing, so routes that behave
 * differently when signed out can use it too.
 */
export async function resolveMember(c: Context): Promise<{ member: Member; accessToken: string } | null> {
  const access = getCookie(c, ACCESS_COOKIE);
  const refresh = getCookie(c, REFRESH_COOKIE);
  if (!access && !refresh) return null;

  const auth = authClient().auth;

  if (access) {
    // getClaims verifies the signature (locally, against the project's published keys,
    // when it uses asymmetric signing) and the expiry. A cookie is an input like any
    // other, and a token that only decodes has proved nothing.
    const { data } = await auth.getClaims(access);
    const claims = data?.claims;
    if (claims?.sub && typeof claims.email === 'string') {
      return { member: { id: claims.sub, email: claims.email }, accessToken: access };
    }
  }

  if (!refresh) {
    clearSession(c);
    return null;
  }

  const { data, error } = await auth.refreshSession({ refresh_token: refresh });
  if (error || !data.session || !data.user?.email) {
    // A refresh that fails is a sign-out (revoked, expired, or replayed), not something
    // to retry. Clearing the cookies stops every later request repeating the attempt.
    clearSession(c);
    return null;
  }

  setSession(c, data.session);
  return {
    member: { id: data.user.id, email: data.user.email },
    accessToken: data.session.access_token,
  };
}

/** Everything mounted below this is for signed-in members only. */
export const requireMember: MiddlewareHandler<AuthedEnv> = async (c, next) => {
  const resolved = await resolveMember(c);
  if (!resolved) {
    throw new HttpError(401, 'Your session has ended. Log in again to continue.', 'signed_out');
  }
  const db = asMember(resolved.accessToken);

  // Login already refuses an unconfirmed account, but a session issued before that rule
  // existed would otherwise keep working for up to 30 days.
  const { data: profile } = await db
    .from('profiles')
    .select('email_verified_at')
    .eq('id', resolved.member.id)
    .maybeSingle();
  if (!profile?.email_verified_at) {
    clearSession(c);
    throw new HttpError(
      401,
      'Confirm your email to continue. Log in and we can send you a new link.',
      'email_not_confirmed'
    );
  }

  c.set('member', resolved.member);
  c.set('accessToken', resolved.accessToken);
  c.set('db', db);
  await next();
};

/**
 * Refuses a state-changing request whose Origin is another site. Browsers attach Origin
 * to every cross-origin POST, so a mismatch is a page elsewhere trying to act as the
 * member. A missing Origin is let through: same-origin GETs omit it, and so do the
 * non-browser clients this cannot protect anyway.
 */
export const requireSameOrigin: MiddlewareHandler = async (c, next) => {
  if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
    const origin = c.req.header('origin');
    if (origin && origin !== new URL(c.req.url).origin) {
      throw new HttpError(403, 'That request came from another site, so it was refused.');
    }
  }
  await next();
};
