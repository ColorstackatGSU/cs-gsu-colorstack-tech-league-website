import { randomBytes } from 'node:crypto';
import { Hono, type Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { z } from 'zod';
import {
  applicationPrefill,
  downloadResume,
  exchangeCode,
  fetchClaims,
  startAuthorization,
  type ColorStackClaims,
} from '../_lib/colorstack.js';
import { resetPasswordEmail, verifyEmail, welcomeEmail } from '../_lib/emails.js';
import { HttpError, parse, unwrap } from '../_lib/errors.js';
import { sendMail } from '../_lib/mailer.js';
import { loadMe } from '../_lib/profile.js';
import { clearSession, readAccessToken, setSession } from '../_lib/session.js';
import { asMember, authClient, RESUME_BUCKET, resumePath, service } from '../_lib/supabase.js';

/**
 * Accounts: email and password, and Sign in with ColorStack at GSU.
 *
 * Plain signup is the front door. Most GSU students are not ColorStack members, so the
 * portal login is offered beside it, never instead of it.
 *
 * Verification email is sent by us, not by Supabase. Supabase's built-in mailer only
 * delivers to the project's own team and a handful of messages an hour, so instead the
 * admin API generates the one-time token without sending anything, and the link goes out
 * through the chapter mailbox (mailer.ts).
 *
 * Links in those emails land on a page in the SPA, and that page POSTs the token here.
 * They never point at a GET that consumes the token, because GSU mail is Microsoft 365,
 * whose Safe Links scanner fetches every URL in an email before the student sees it. A
 * link that signs you in on GET would be spent by the scanner and dead on arrival.
 */
const auth = new Hono();

const STUDENT_EMAIL = /^[^@\s]+@student\.gsu\.edu$/;

const studentEmail = z
  .string('Enter your GSU student email.')
  .trim()
  .toLowerCase()
  .max(254)
  .regex(STUDENT_EMAIL, 'Use your GSU student email, the one ending in @student.gsu.edu.');

const newPassword = z
  .string('Enter a password.')
  .min(8, 'Password must be at least 8 characters.')
  // bcrypt, which Supabase Auth uses, silently ignores everything past 72 bytes.
  .max(72, 'Password must be 72 characters or fewer.')
  .refine((value) => /[a-zA-Z]/.test(value) && /[0-9]/.test(value), {
    message: 'Include at least one letter and one number.',
  });

const anyEmail = z.string().trim().toLowerCase().max(254);

async function body(c: Context) {
  try {
    return await c.req.json();
  } catch {
    throw new HttpError(400, 'That request is not valid.');
  }
}

/** Spends one of this address's emails for the hour, or refuses. */
async function claimEmailSlot(email: string, kind: 'verify' | 'recovery') {
  const allowed = unwrap(await service().rpc('claim_email_slot', { p_email: email, p_kind: kind }));
  return allowed === true;
}

async function send(email: string, message: { subject: string; html: string }) {
  try {
    await sendMail([email], message.subject, message.html);
  } catch (err) {
    console.error('email send failed', err);
    throw new HttpError(502, 'We could not send that email just now. Try again in a minute.');
  }
}

/**
 * Sends the welcome email the first time an account becomes usable, and never again.
 *
 * Never throws. The member has just confirmed or signed in, and a welcome that did not
 * send is not a reason to fail that. The claim is given back on failure so a later
 * sign-in tries again.
 */
async function welcomeOnce(userId: string, email: string) {
  try {
    const claimed = unwrap(await service().rpc('claim_welcome', { p_user_id: userId }));
    if (claimed !== true) return;
    const profile = unwrap(
      await service().from('profiles').select('full_name').eq('id', userId).single()
    ) as { full_name: string | null };
    const firstName = (profile.full_name ?? '').trim().split(/\s+/)[0] ?? '';
    const message = welcomeEmail(firstName);
    try {
      await sendMail([email], message.subject, message.html);
    } catch (err) {
      await service().rpc('release_welcome', { p_user_id: userId });
      throw err;
    }
  } catch (err) {
    console.error('welcome email failed', err);
  }
}

async function profileIdByEmail(email: string) {
  const row = unwrap(
    await service().from('profiles').select('id').eq('email', email).maybeSingle()
  ) as { id: string } | null;
  return row?.id ?? null;
}

/* ---------- email and password ---------- */

auth.post('/signup', async (c) => {
  const { email, password } = parse(z.object({ email: studentEmail, password: newPassword }), await body(c));

  if (!(await claimEmailSlot(email, 'verify'))) {
    throw new HttpError(
      429,
      'We have already sent a few confirmation links to that address. Check your inbox and spam folder, or try again in an hour.'
    );
  }

  const { data, error } = await service().auth.admin.generateLink({ type: 'signup', email, password });
  if (error) {
    if (error.code === 'email_exists' || error.code === 'user_already_exists') {
      throw new HttpError(409, 'An account with that email already exists. Log in instead.');
    }
    if (error.code === 'weak_password') {
      throw new HttpError(422, 'That password is too weak. Try a longer one.');
    }
    throw error;
  }

  await send(email, verifyEmail(data.properties.hashed_token, 'signup'));
  return c.json({ status: 'verify', email }, 201);
});

/**
 * Sends a fresh confirmation link to an account that never confirmed. Answers the same
 * way whether or not the account exists, so this cannot be used to test which students
 * have signed up.
 */
auth.post('/resend', async (c) => {
  const { email } = parse(z.object({ email: anyEmail }), await body(c));
  const id = STUDENT_EMAIL.test(email) ? await profileIdByEmail(email) : null;

  if (id) {
    const { data } = await service().auth.admin.getUserById(id);
    if (data.user && !data.user.email_confirmed_at && (await claimEmailSlot(email, 'verify'))) {
      const link = await service().auth.admin.generateLink({ type: 'magiclink', email });
      if (link.error) throw link.error;
      const type = link.data.properties.verification_type === 'signup' ? 'signup' : 'magiclink';
      await send(email, verifyEmail(link.data.properties.hashed_token, type));
    }
  }

  return c.json({ status: 'sent' });
});

auth.post('/verify', async (c) => {
  const { tokenHash, type } = parse(
    z.object({
      tokenHash: z.string().min(1, 'That link is incomplete.'),
      type: z.enum(['signup', 'magiclink'], 'That link is incomplete.'),
    }),
    await body(c)
  );

  const { data, error } = await authClient().auth.verifyOtp({ token_hash: tokenHash, type });
  if (error || !data.session || !data.user?.email) {
    throw new HttpError(
      400,
      'That link has expired or has already been used. Log in and we can send you a new one.',
      'link_expired'
    );
  }

  setSession(c, data.session);
  const member = { id: data.user.id, email: data.user.email };
  await welcomeOnce(member.id, member.email);
  return c.json(await loadMe(asMember(data.session.access_token), member));
});

auth.post('/login', async (c) => {
  const { email, password } = parse(
    z.object({ email: anyEmail.min(1, 'Enter your email.'), password: z.string().min(1, 'Enter your password.') }),
    await body(c)
  );

  const { data, error } = await authClient().auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code === 'email_not_confirmed') {
      throw new HttpError(
        403,
        'Confirm your email before logging in. Check your inbox for the link, or send yourself a new one.',
        'email_not_confirmed'
      );
    }
    if (error.status === 429) {
      throw new HttpError(429, 'Too many attempts. Wait a few minutes and try again.');
    }
    // One message for an unknown email and a wrong password, so this cannot be used to
    // find out which students have accounts.
    throw new HttpError(401, 'Incorrect email or password.');
  }

  setSession(c, data.session);
  const member = { id: data.user.id, email: data.user.email ?? email };
  return c.json(await loadMe(asMember(data.session.access_token), member));
});

auth.post('/logout', async (c) => {
  const token = readAccessToken(c);
  if (token) {
    // Revokes this session's refresh token, so a copied cookie stops working too. A
    // failure here still signs the browser out below, which is what the member asked for.
    await service().auth.admin.signOut(token, 'local').catch(() => undefined);
  }
  clearSession(c);
  return c.body(null, 204);
});

/** Same answer whether or not the account exists, for the same reason as /resend. */
auth.post('/password/forgot', async (c) => {
  const { email } = parse(z.object({ email: anyEmail }), await body(c));
  const id = STUDENT_EMAIL.test(email) ? await profileIdByEmail(email) : null;

  if (id && (await claimEmailSlot(email, 'recovery'))) {
    const { data, error } = await service().auth.admin.generateLink({ type: 'recovery', email });
    if (error) throw error;
    await send(email, resetPasswordEmail(data.properties.hashed_token));
  }

  return c.json({ status: 'sent' });
});

auth.post('/password/reset', async (c) => {
  const { tokenHash, password } = parse(
    z.object({ tokenHash: z.string().min(1, 'That link is incomplete.'), password: newPassword }),
    await body(c)
  );

  const { data, error } = await authClient().auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' });
  if (error || !data.session || !data.user?.email) {
    throw new HttpError(400, 'That reset link has expired or has already been used. Ask for a new one.', 'link_expired');
  }

  const updated = await service().auth.admin.updateUserById(data.user.id, { password });
  if (updated.error) {
    throw new HttpError(422, 'That password was not accepted. Try a longer one.');
  }

  // Someone resetting a password may be locking out whoever else had it, so every session
  // on the account ends, and this browser signs in afresh with the new password.
  //
  // Not "sign out the others and keep the recovery session": tried, and the password
  // change had already revoked that session too, so the browser that just reset was
  // handed a refresh token that no longer existed and got signed out within the hour.
  // Access tokens already issued elsewhere stay valid until they expire (up to an hour),
  // since each request checks the token's signature rather than asking Auth.
  await service().auth.admin.signOut(data.session.access_token, 'global').catch(() => undefined);
  const fresh = await authClient().auth.signInWithPassword({ email: data.user.email, password });
  if (fresh.error || !fresh.data.session) {
    throw new HttpError(409, 'Your password was changed. Log in with your new password.');
  }

  setSession(c, fresh.data.session);
  const member = { id: data.user.id, email: data.user.email };
  return c.json(await loadMe(asMember(fresh.data.session.access_token), member));
});

/* ---------- Sign in with ColorStack at GSU ---------- */

const OAUTH_COOKIE = 'tl_oauth';

// Only same-site paths, so the login cannot be turned into a redirect to anywhere.
const safeNext = (value: string | undefined) =>
  value && value.startsWith('/') && !value.startsWith('//') ? value : '/dashboard';

auth.get('/colorstack', (c) => {
  let started: ReturnType<typeof startAuthorization>;
  try {
    started = startAuthorization();
  } catch (err) {
    // A navigation, not a fetch, so a JSON error would be a blank page of JSON.
    console.error('colorstack sign-in unavailable', err);
    return c.redirect('/login?colorstack=unavailable');
  }
  const { url, state, verifier } = started;
  setCookie(c, OAUTH_COOKIE, JSON.stringify({ state, verifier, next: safeNext(c.req.query('next')) }), {
    httpOnly: true,
    secure: new URL(c.req.url).protocol === 'https:',
    // Lax, not Strict: the portal's redirect back is a top-level navigation from another
    // site, and Strict would drop this cookie on exactly that request.
    sameSite: 'Lax',
    path: '/api/auth',
    maxAge: 600,
  });
  return c.redirect(url);
});

/**
 * Finds the account a ColorStack member belongs to, creating it if there is none.
 *
 * By portal id first, then by student email, which the portal has always verified.
 * Linking by email to an account that never confirmed needs care: anyone can sign up with
 * a student address they do not own and set a password, then wait. If we simply confirmed
 * that account, the squatter's password would open the real student's account. So an
 * unconfirmed account's password is replaced with random bytes as it is linked.
 */
async function accountFor(claims: ColorStackClaims, email: string) {
  const db = service();

  const bySub = unwrap(
    await db.from('profiles').select('id').eq('colorstack_sub', claims.sub).maybeSingle()
  ) as { id: string } | null;
  if (bySub) return bySub.id;

  let id = await profileIdByEmail(email);
  if (id) {
    const { data } = await db.auth.admin.getUserById(id);
    if (data.user && !data.user.email_confirmed_at) {
      const { error } = await db.auth.admin.updateUserById(id, {
        email_confirm: true,
        password: randomBytes(32).toString('base64url'),
      });
      if (error) throw error;
    }
  } else {
    const { data, error } = await db.auth.admin.createUser({ email, email_confirm: true });
    if (error) throw error;
    id = data.user.id;
  }

  unwrap(await db.from('profiles').update({ colorstack_sub: claims.sub }).eq('id', id));
  return id;
}

/**
 * Fills in what we do not already have. Never overwrites: a member who edited something
 * here meant it, and a blank in the portal is not an instruction to blank it here.
 */
async function prefill(userId: string, email: string, claims: ColorStackClaims) {
  const db = service();
  const fill = <T extends Record<string, unknown>>(current: Record<string, unknown> | null, incoming: T) =>
    Object.fromEntries(
      Object.entries(incoming).filter(([key, value]) => value !== undefined && (current?.[key] ?? null) === null)
    );

  const profile = unwrap(
    await db.from('profiles').select('full_name, linkedin_url, github_url, discord_username').eq('id', userId).single()
  ) as Record<string, unknown>;
  const prefilled = applicationPrefill(claims);
  const profilePatch = fill(profile, {
    full_name: prefilled.full_name,
    linkedin_url: claims.linkedin_url,
    github_url: claims.github_url,
    discord_username: claims.discord_username,
  });
  if (Object.keys(profilePatch).length > 0) {
    unwrap(await db.from('profiles').update(profilePatch).eq('id', userId));
  }

  const application = unwrap(
    await db
      .from('applications')
      .select('status, full_name, personal_email, race_ethnicity, year, major, grad_term')
      .eq('user_id', userId)
      .maybeSingle()
  ) as ({ status: string } & Record<string, unknown>) | null;

  if (!application) {
    unwrap(await db.from('applications').insert({ user_id: userId, school_email: email, ...fill(null, prefilled) }));
  } else if (application.status === 'draft') {
    const patch = fill(application, prefilled);
    if (Object.keys(patch).length > 0) {
      unwrap(await db.from('applications').update(patch).eq('user_id', userId));
    }
  }
}

const safeFilename = (name: string | undefined) => {
  const cleaned = (name ?? 'resume.pdf').replace(/[\\/\p{Cc}"]/gu, '').trim().slice(0, 120);
  return /\.pdf$/i.test(cleaned) ? cleaned : `${cleaned || 'resume'}.pdf`;
};

/**
 * Keeps our copy of the member's portal resume current.
 *
 * We hold our own copy: deleting it in the portal does not delete it here, and nothing in
 * the protocol could make it. The dashboard tells members that plainly. A resume they
 * uploaded here themselves always wins, and one they deleted here stays deleted.
 */
async function syncResume(userId: string, claims: ColorStackClaims, accessToken: string) {
  if (!claims.resume_download_url || !claims.resume_uploaded_at) return;
  const db = service();

  const profile = unwrap(
    await db
      .from('profiles')
      .select('resume_name, resume_source, resume_deleted_at, colorstack_resume_uploaded_at')
      .eq('id', userId)
      .single()
  ) as {
    resume_name: string | null;
    resume_source: string | null;
    resume_deleted_at: string | null;
    colorstack_resume_uploaded_at: string | null;
  };

  if (profile.resume_source === 'upload' || profile.resume_deleted_at) return;
  if (profile.resume_name && profile.colorstack_resume_uploaded_at === claims.resume_uploaded_at) return;

  const bytes = await downloadResume(claims, accessToken);
  if (!bytes) return;

  const upload = await db.storage
    .from(RESUME_BUCKET)
    .upload(resumePath(userId), bytes, { contentType: 'application/pdf', upsert: true });
  if (upload.error) throw upload.error;

  unwrap(
    await db
      .from('profiles')
      .update({
        resume_name: safeFilename(claims.resume_filename),
        resume_size: bytes.length,
        resume_uploaded_at: new Date().toISOString(),
        resume_source: 'colorstack',
        colorstack_resume_uploaded_at: claims.resume_uploaded_at,
      })
      .eq('id', userId)
  );
}

/** A Supabase session for an account we have already established the identity of. */
async function sessionFor(email: string) {
  const link = await service().auth.admin.generateLink({ type: 'magiclink', email });
  if (link.error) throw link.error;
  const type = link.data.properties.verification_type === 'signup' ? 'signup' : 'magiclink';
  const { data, error } = await authClient().auth.verifyOtp({ token_hash: link.data.properties.hashed_token, type });
  if (error || !data.session) throw error ?? new Error('no session from magic link');
  return data.session;
}

// The path the portal registered for this client. It is matched literally, so it is
// /api/auth/callback and not something more descriptive.
auth.get('/callback', async (c) => {
  const fail = (reason: string) => c.redirect(`/login?colorstack=${reason}`);

  const raw = getCookie(c, OAUTH_COOKIE);
  deleteCookie(c, OAUTH_COOKIE, { path: '/api/auth' });

  if (c.req.query('error')) {
    return fail(c.req.query('error') === 'access_denied' ? 'cancelled' : 'error');
  }

  let saved: { state: string; verifier: string; next: string } | null = null;
  try {
    saved = raw ? JSON.parse(raw) : null;
  } catch {
    saved = null;
  }
  const code = c.req.query('code');
  if (!saved || !code || c.req.query('state') !== saved.state) {
    return fail('expired');
  }

  try {
    const accessToken = await exchangeCode(code, saved.verifier);
    const claims = await fetchClaims(accessToken);

    const email = claims.email?.toLowerCase();
    if (!email || !STUDENT_EMAIL.test(email) || claims.email_verified === false) {
      return fail('not_student');
    }

    const userId = await accountFor(claims, email);
    await prefill(userId, email, claims);
    try {
      await syncResume(userId, claims, accessToken);
    } catch (err) {
      // A resume that did not copy is not a reason to refuse the sign-in. The member can
      // upload one from the dashboard, and the next ColorStack sign-in tries again.
      console.error('colorstack resume sync failed', err);
    }

    // After prefill, so the welcome can greet them by the name the portal gave us.
    await welcomeOnce(userId, email);
    setSession(c, await sessionFor(email));
    return c.redirect(safeNext(saved.next));
  } catch (err) {
    console.error('colorstack callback failed', err);
    return fail('error');
  }
});

export default auth;
