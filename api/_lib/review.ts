import type { SupabaseClient } from '@supabase/supabase-js';
import { decisionEmail } from './emails.js';
import { HttpError, unwrap } from './errors.js';
import { sendMail } from './mailer.js';
import { RESUME_BUCKET, resumePath } from './supabase.js';

/**
 * Application review and score entry for /api/service, which runs as the service role on
 * behalf of an officer in the chapter's admin portal, who may have no Tech League account
 * at all. Every function here takes the client to run as rather than building one.
 *
 * The database functions behind the writes check is_admin(), which is false for the
 * service role, so the portal goes through the portal_* functions in
 * supabase/migrations/20260920000001_portal_application_review.sql. Each carries the
 * officer's address as `actor` so the write is attributed to them.
 */

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
  second_major: string | null;
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
  'user_id, status, full_name, school_email, personal_email, personal_email_verified_at, race_ethnicity, year, major, second_major, ' +
  'grad_term, interest, team_pref, why_join, goals, experience, commitment, decision, ' +
  'decided_at, decision_emailed_at, submitted_at, updated_at, ' +
  'profile:profiles!applications_user_id_fkey(email, resume_name, resume_size, resume_uploaded_at)';

export function toReview(row: ReviewRow) {
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
    secondMajor: row.second_major,
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

export async function listReviews(db: SupabaseClient) {
  const rows = unwrap(
    await db.from('applications').select(REVIEW_COLUMNS).order('submitted_at', { ascending: true, nullsFirst: false })
  ) as unknown as ReviewRow[];
  return rows;
}

export async function loadReview(db: SupabaseClient, userId: string) {
  const row = unwrap(
    await db.from('applications').select(REVIEW_COLUMNS).eq('user_id', userId).maybeSingle()
  ) as unknown as ReviewRow | null;
  if (!row) throw new HttpError(404, 'That application could not be found.');
  return row;
}

export async function decideApplication(db: SupabaseClient, actor: string, userId: string, decision: string) {
  unwrap(await db.rpc('portal_decide_application', { p_user_id: userId, p_decision: decision, p_actor: actor }));
}

export async function reopenApplication(db: SupabaseClient, actor: string, userId: string) {
  unwrap(await db.rpc('portal_reopen_application', { p_user_id: userId, p_actor: actor }));
}

async function markDecisionEmailed(db: SupabaseClient, actor: string, userId: string) {
  unwrap(await db.rpc('portal_mark_decision_emailed', { p_user_id: userId, p_actor: actor }));
}

/**
 * Emails the member their decision and stamps it as sent.
 *
 * Returns rather than throws on a failed send, because the decision itself is already
 * saved and is not undone by an email that did not go. The portal shows the
 * application as "not emailed" with a button to try again.
 */
export async function emailDecision(db: SupabaseClient, actor: string, row: ReviewRow) {
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

  await markDecisionEmailed(db, actor, row.user_id);
  return { emailed: true };
}

/** The stored resume as a Blob, with the 404s the two resume routes both need. */
export async function downloadResume(db: SupabaseClient, row: ReviewRow) {
  if (!row.profile?.resume_name) {
    throw new HttpError(404, 'This applicant has not uploaded a resume.');
  }
  const { data, error } = await db.storage.from(RESUME_BUCKET).download(resumePath(row.user_id));
  if (error || !data) throw new HttpError(404, 'That resume file could not be found.');
  return { file: data, name: row.profile.resume_name };
}

/* ---------- scores ---------- */

export async function readScores(db: SupabaseClient) {
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

  return {
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
  };
}

/**
 * Writes or clears one team's score for one event, through portal_save_score, which
 * records the officer's address as the author. The portal has no session, so the
 * scores_guard trigger has no auth.uid() to stamp.
 */
export async function saveScore(
  db: SupabaseClient,
  actor: string,
  input: { teamId: string; eventId: string; points: number | null }
) {
  unwrap(
    await db.rpc('portal_save_score', {
      p_team: input.teamId,
      p_event: input.eventId,
      p_points: input.points,
      p_actor: actor,
    })
  );
}
