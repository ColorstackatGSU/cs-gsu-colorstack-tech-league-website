import { Hono, type Context, type MiddlewareHandler } from 'hono';
import { z } from 'zod';
import { decisionEmail } from '../_lib/emails.js';
import { HttpError, parse, unwrap } from '../_lib/errors.js';
import { sendMail } from '../_lib/mailer.js';
import type { AuthedEnv } from '../_lib/session.js';
import { RESUME_BUCKET, resumePath } from '../_lib/supabase.js';
import { pdfResponse } from './account.js';

/**
 * The /admin page's API: reviewing applications and entering scores.
 *
 * Everything runs as the signed-in admin, not the service role, so the same RLS policies
 * decide what they can do. The check below only turns a non-admin away early with a clear
 * message; it is not what protects the data.
 */
const admin = new Hono<AuthedEnv>();

const requireAdmin: MiddlewareHandler<AuthedEnv> = async (c, next) => {
  const profile = unwrap(
    await c.get('db').from('profiles').select('is_admin').eq('id', c.get('member').id).single()
  ) as { is_admin: boolean };
  if (!profile.is_admin) {
    throw new HttpError(403, 'This page is for League admins.');
  }
  await next();
};

admin.use('*', requireAdmin);

async function body(c: Context) {
  try {
    return await c.req.json();
  } catch {
    return {};
  }
}

const userIdParam = (c: Context) => parse(z.uuid('That application could not be found.'), c.req.param('id'));

/* ---------- applications ---------- */

type ReviewRow = {
  user_id: string;
  status: 'draft' | 'submitted';
  full_name: string | null;
  school_email: string | null;
  personal_email: string | null;
  personal_email_verified_at: string | null;
  race_ethnicity: string[] | null;
  year: string | null;
  major: string | null;
  grad_term: string | null;
  interest: string | null;
  team_pref: string | null;
  why_join: string | null;
  goals: string | null;
  experience: string | null;
  commitment: string | null;
  decision: 'accepted' | 'waitlisted' | 'denied' | null;
  decided_at: string | null;
  decision_emailed_at: string | null;
  submitted_at: string | null;
  updated_at: string;
  profile: { email: string; resume_name: string | null; resume_size: number | null; resume_uploaded_at: string | null } | null;
};

// applications has two foreign keys to profiles (user_id, decided_by), so the embed has
// to name which one it means or PostgREST refuses the query as ambiguous.
const REVIEW_COLUMNS =
  'user_id, status, full_name, school_email, personal_email, personal_email_verified_at, race_ethnicity, year, major, ' +
  'grad_term, interest, team_pref, why_join, goals, experience, commitment, decision, ' +
  'decided_at, decision_emailed_at, submitted_at, updated_at, ' +
  'profile:profiles!applications_user_id_fkey(email, resume_name, resume_size, resume_uploaded_at)';

function toReview(row: ReviewRow) {
  return {
    userId: row.user_id,
    email: row.profile?.email ?? row.school_email,
    status: row.status,
    fullName: row.full_name,
    personalEmail: row.personal_email,
    personalEmailVerified: Boolean(row.personal_email_verified_at),
    raceEthnicity: row.race_ethnicity ?? [],
    year: row.year,
    major: row.major,
    gradTerm: row.grad_term,
    interest: row.interest,
    teamPref: row.team_pref,
    whyJoin: row.why_join,
    goals: row.goals,
    experience: row.experience,
    commitment: row.commitment,
    decision: row.decision,
    decidedAt: row.decided_at,
    decisionEmailedAt: row.decision_emailed_at,
    submittedAt: row.submitted_at,
    updatedAt: row.updated_at,
    resume: row.profile?.resume_name
      ? { name: row.profile.resume_name, size: row.profile.resume_size, uploadedAt: row.profile.resume_uploaded_at }
      : null,
  };
}

admin.get('/applications', async (c) => {
  const rows = unwrap(
    await c
      .get('db')
      .from('applications')
      .select(REVIEW_COLUMNS)
      .order('submitted_at', { ascending: true, nullsFirst: false })
  ) as unknown as ReviewRow[];
  return c.json({ applications: rows.map(toReview) });
});

async function loadReview(c: Context<AuthedEnv>, userId: string) {
  const row = unwrap(
    await c.get('db').from('applications').select(REVIEW_COLUMNS).eq('user_id', userId).maybeSingle()
  ) as unknown as ReviewRow | null;
  if (!row) throw new HttpError(404, 'That application could not be found.');
  return row;
}

/**
 * Emails the member their decision and stamps it as sent.
 *
 * Returns rather than throws on a failed send, because the decision itself is already
 * saved and is not undone by an email that did not go. The admin page shows the
 * application as "not emailed" with a button to try again.
 */
async function emailDecision(c: Context<AuthedEnv>, row: ReviewRow) {
  if (!row.decision) return { emailed: false, emailError: 'There is no decision to email yet.' };

  // The personal address, as the application page promises: a student address can
  // lapse, and this email is the one they most need to receive.
  // Only once confirmed, though: an unconfirmed one may be a typo, and the student address
  // is known to work.
  const to =
    (row.personal_email_verified_at ? row.personal_email : null) ?? row.profile?.email ?? row.school_email;
  if (!to) return { emailed: false, emailError: 'This applicant has no email address on file.' };

  const firstName = (row.full_name ?? '').trim().split(/\s+/)[0] ?? '';
  const message = decisionEmail(row.decision, firstName);
  try {
    await sendMail([to], message.subject, message.html);
  } catch (err) {
    console.error('decision email failed', err);
    return { emailed: false, emailError: 'The decision is saved, but the email did not send. Try sending it again.' };
  }

  unwrap(await c.get('db').rpc('mark_decision_emailed', { p_user_id: row.user_id }));
  return { emailed: true };
}

admin.post('/applications/:id/decision', async (c) => {
  const userId = userIdParam(c);
  const { decision } = parse(
    z.object({ decision: z.enum(['accepted', 'waitlisted', 'denied'], 'Choose accept, waitlist, or deny.') }),
    await body(c)
  );

  unwrap(await c.get('db').rpc('decide_application', { p_user_id: userId, p_decision: decision }));
  const result = await emailDecision(c, await loadReview(c, userId));
  return c.json({ application: toReview(await loadReview(c, userId)), ...result });
});

admin.post('/applications/:id/email', async (c) => {
  const userId = userIdParam(c);
  const result = await emailDecision(c, await loadReview(c, userId));
  return c.json({ application: toReview(await loadReview(c, userId)), ...result });
});

admin.post('/applications/:id/reopen', async (c) => {
  const userId = userIdParam(c);
  unwrap(await c.get('db').rpc('reopen_application', { p_user_id: userId }));
  return c.json({ application: toReview(await loadReview(c, userId)) });
});

admin.get('/applications/:id/resume', async (c) => {
  const row = await loadReview(c, userIdParam(c));
  if (!row.profile?.resume_name) {
    throw new HttpError(404, 'This applicant has not uploaded a resume.');
  }
  const { data, error } = await c.get('db').storage.from(RESUME_BUCKET).download(resumePath(row.user_id));
  if (error || !data) throw new HttpError(404, 'That resume file could not be found.');
  return pdfResponse(data, row.profile.resume_name, c.req.query('download') === '1');
});

/* ---------- scores ---------- */

admin.get('/scores', async (c) => {
  const db = c.get('db');
  const [events, teams] = await Promise.all([
    db.from('events').select('id, name, weight, max_points, position').order('position'),
    db.from('teams').select('id, name, capacity, team_members(count), scores(event_id, points)').order('name'),
  ]);

  const teamRows = unwrap(teams) as unknown as Array<{
    id: string;
    name: string;
    capacity: number;
    team_members: Array<{ count: number }>;
    scores: Array<{ event_id: string; points: number }>;
  }>;

  return c.json({
    events: (unwrap(events) as Array<{ id: string; name: string; weight: number; max_points: number }>).map((e) => ({
      id: e.id,
      name: e.name,
      weight: Number(e.weight),
      max: Number(e.max_points),
    })),
    teams: teamRows.map((t) => ({
      id: t.id,
      name: t.name,
      capacity: t.capacity,
      members: t.team_members[0]?.count ?? 0,
      scores: Object.fromEntries(t.scores.map((s) => [s.event_id, Number(s.points)])),
    })),
  });
});

admin.put('/scores', async (c) => {
  const input = parse(
    z.object({
      teamId: z.uuid('That team could not be found.'),
      eventId: z.string().min(1, 'That event could not be found.'),
      // null clears a score, for an event entered against the wrong team.
      points: z.number('Scores are numbers.').min(0, 'Scores cannot be negative.').nullable(),
    }),
    await body(c)
  );
  const db = c.get('db');

  if (input.points === null) {
    unwrap(await db.from('scores').delete().eq('team_id', input.teamId).eq('event_id', input.eventId));
  } else {
    const written = unwrap(
      await db
        .from('scores')
        .upsert({ team_id: input.teamId, event_id: input.eventId, points: input.points })
        .select('team_id')
    ) as unknown[];
    if (written.length === 0) throw new HttpError(403, 'That score was not saved.');
  }

  return c.json({ ok: true });
});

export default admin;
