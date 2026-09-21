import { timingSafeEqual } from 'node:crypto';
import { Hono, type Context, type MiddlewareHandler } from 'hono';
import { z } from 'zod';
import { env } from '../_lib/env.js';
import { HttpError, parse, unwrap } from '../_lib/errors.js';
import {
  decideApplication,
  downloadResume,
  emailDecision,
  listReviews,
  loadReview,
  readScores,
  reopenApplication,
  saveScore,
  toReview,
  type Reviewer,
} from '../_lib/review.js';
import { service } from '../_lib/supabase.js';
import { pdfResponse } from './account.js';

/**
 * Machine-to-machine routes, called by the chapter's admin portal rather than by a browser.
 *
 * Everything else in this API runs as the signed-in member so that RLS decides what they
 * can see. There is no member here: the caller is another one of our own servers, acting
 * on behalf of an officer who is signed in to admin.colorstackatgsu.com and who may not
 * have a Tech League account at all. So these routes authenticate with a shared secret and
 * run as the service role.
 *
 * That trade is only safe because the surface is deliberately tiny. These routes do one
 * thing, the database functions behind them carry their own rules (see
 * supabase/migrations/20260919000001_admin_roster.sql), and every write records who asked
 * for it. Adding a route here that reads member data would undo the reasoning, and should
 * be a route under /api/admin instead, reached with a real session.
 *
 * Mounted above `requireMember` in index.ts, since there is no session to require.
 */
const serviceRoutes = new Hono();

/**
 * Compares the presented secret with the configured one in constant time.
 *
 * `timingSafeEqual` throws on a length mismatch, which would itself leak the secret's
 * length, so the lengths are checked first and a mismatch is reported as a plain failure.
 */
function tokenMatches(presented: string, expected: string) {
  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

const requirePortal: MiddlewareHandler = async (c, next) => {
  const { ADMIN_PORTAL_TOKEN } = env();

  // Unset means the integration is off. Answering 404 rather than 401 keeps a deployment
  // that never configured this from advertising that the routes exist.
  //
  // The code is what tells the portal apart from a stranger. Every error here answers with
  // an { error } body, so a 404 for "the integration is switched off" and a 404 for "no such
  // applicant" look identical from the outside, and the portal was about to show officers
  // "that page does not exist" for the single most likely misconfiguration. The body still
  // says nothing a stranger can use.
  if (!ADMIN_PORTAL_TOKEN) {
    throw new HttpError(404, 'That page of the API does not exist.', 'service_off');
  }

  const header = c.req.header('authorization') ?? '';
  const presented = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!presented || !tokenMatches(presented, ADMIN_PORTAL_TOKEN)) {
    throw new HttpError(401, 'That request was not signed by a service we recognise.');
  }

  await next();
};

serviceRoutes.use('*', requirePortal);

/* ---------- admin roster ---------- */

type AdminRow = {
  email: string;
  full_name: string | null;
  granted_at: string | null;
  granted_by: string | null;
};

serviceRoutes.get('/admins', async (c) => {
  const rows = unwrap(await service().rpc('list_admins')) as AdminRow[];
  return c.json({
    admins: rows.map((row) => ({
      email: row.email,
      fullName: row.full_name,
      grantedAt: row.granted_at,
      grantedBy: row.granted_by,
    })),
  });
});

/**
 * Grants or revokes Tech League admin.
 *
 * `actor` is the portal officer's address, recorded against the change. It is taken from
 * the caller rather than derived here because this API has no way to identify a portal
 * session; the portal authenticates the officer and is trusted to say who they are, which
 * is the same trust the shared secret already establishes.
 */
serviceRoutes.post('/admins', async (c) => {
  const input = parse(
    z.object({
      email: z.email('That is not an email address.'),
      grant: z.boolean('Say whether you are granting or removing admin.'),
      actor: z.email('The officer making the change needs an email address.'),
    }),
    await c.req.json().catch(() => ({}))
  );

  const rows = unwrap(
    await service().rpc('set_admin', {
      p_email: input.email,
      p_grant: input.grant,
      p_actor: input.actor,
    })
  ) as Array<{ email: string; is_admin: boolean }>;

  const row = rows[0];
  if (!row) throw new HttpError(502, 'The admin change did not come back from the database.');

  return c.json({ email: row.email, isAdmin: row.is_admin });
});

/* ---------- application review ---------- */

async function body(c: Context) {
  try {
    return await c.req.json();
  } catch {
    return {};
  }
}

/**
 * The applicant this call is about.
 *
 * Parsed as a uuid before it reaches the database, because these routes run with RLS
 * bypassed: an id that is not a uuid would otherwise arrive at PostgREST as a cast error
 * and come back a 500, and the shape of what the caller may name is the only thing
 * narrowing the rows these routes can touch.
 */
const userIdParam = (c: Context) => parse(z.uuid('That application could not be found.'), c.req.param('id'));

/**
 * The officer this call is made on behalf of.
 *
 * Required on every write, exactly as it is on POST /admins. The Tech League cannot
 * identify a portal session, so the portal says who is acting and the shared secret is
 * what makes that worth believing.
 */
const actorSchema = z.object({
  actor: z.email('The officer making the change needs an email address.'),
});

async function reviewer(c: Context): Promise<Reviewer> {
  const { actor } = parse(actorSchema, await body(c));
  return { kind: 'portal', actor };
}

serviceRoutes.get('/applications', async (c) => {
  const rows = await listReviews(service());
  return c.json({ applications: rows.map(toReview) });
});

serviceRoutes.post('/applications/:id/decision', async (c) => {
  const db = service();
  const userId = userIdParam(c);
  const input = parse(
    actorSchema.extend({
      decision: z.enum(['accepted', 'waitlisted', 'denied'], 'Choose accept, waitlist, or deny.'),
    }),
    await body(c)
  );
  const who: Reviewer = { kind: 'portal', actor: input.actor };

  await decideApplication(db, who, userId, input.decision);
  const result = await emailDecision(db, who, await loadReview(db, userId));
  return c.json({ application: toReview(await loadReview(db, userId)), ...result });
});

serviceRoutes.post('/applications/:id/email', async (c) => {
  const db = service();
  const userId = userIdParam(c);
  const who = await reviewer(c);
  const result = await emailDecision(db, who, await loadReview(db, userId));
  return c.json({ application: toReview(await loadReview(db, userId)), ...result });
});

serviceRoutes.post('/applications/:id/reopen', async (c) => {
  const db = service();
  const userId = userIdParam(c);
  await reopenApplication(db, await reviewer(c), userId);
  return c.json({ application: toReview(await loadReview(db, userId)) });
});

// Answers with the PDF itself, not JSON, so the portal can hand the bytes straight to the
// officer's browser without ever storing a resume of its own.
serviceRoutes.get('/applications/:id/resume', async (c) => {
  const db = service();
  const resume = await downloadResume(db, await loadReview(db, userIdParam(c)));
  return pdfResponse(resume.file, resume.name, c.req.query('download') === '1');
});

/* ---------- scores ---------- */

serviceRoutes.get('/scores', async (c) => c.json(await readScores(service())));

serviceRoutes.put('/scores', async (c) => {
  const input = parse(
    actorSchema.extend({
      teamId: z.uuid('That team could not be found.'),
      eventId: z.string().min(1, 'That event could not be found.'),
      // null clears a score, for an event entered against the wrong team.
      points: z.number('Scores are numbers.').min(0, 'Scores cannot be negative.').nullable(),
    }),
    await body(c)
  );

  await saveScore(service(), { kind: 'portal', actor: input.actor }, input);
  return c.json({ ok: true });
});

export default serviceRoutes;
