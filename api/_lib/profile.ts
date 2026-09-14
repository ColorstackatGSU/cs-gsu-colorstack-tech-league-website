import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { unwrap } from './errors.js';
import type { Member } from './session.js';

/**
 * The member's own view of themselves: what GET /api/me returns, and what every route
 * that changes it returns too, so the frontend always replaces its copy with the server's
 * rather than guessing at what changed.
 *
 * Column names are snake_case in the database and camelCase here, and this file is the
 * only place that translates between them.
 */

export const RACE_ETHNICITY = [
  'American Indian or Alaska Native',
  'Asian',
  'Black or African American',
  'Hispanic or Latino',
  'Middle Eastern or North African',
  'Native Hawaiian or Pacific Islander',
  'White',
  'Prefer not to say',
] as const;

const DECLINE = 'Prefer not to say';

const text = (max: number) => z.string().trim().max(max, `Keep that under ${max} characters.`);

const declineAlone = (values: string[]) => !values.includes(DECLINE) || values.length === 1;
const declineMessage = '"Prefer not to say" cannot be combined with other answers.';

const raceEthnicityChoices = z
  .array(z.enum(RACE_ETHNICITY, 'Pick from the listed options.'))
  .refine(declineAlone, { message: declineMessage });

// An empty string from a <select> left on its placeholder means "not answered yet".
const optionalChoice = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .union([z.enum(values), z.literal('')])
    .optional()
    .transform((value) => (value === '' ? null : value));

/** A draft may be any subset of the application, including empty. */
export const draftSchema = z.object({
  fullName: text(120).optional(),
  personalEmail: text(254).optional(),
  // Nothing ticked yet is stored as NULL, never '{}': see the race_ethnicity CHECK.
  raceEthnicity: raceEthnicityChoices
    .transform((values) => (values.length > 0 ? [...new Set(values)] : null))
    .optional(),
  year: text(60).optional(),
  major: text(80).optional(),
  gradTerm: text(20).optional(),
  interest: text(80).optional(),
  teamPref: optionalChoice(['team', 'have-team']),
  whyJoin: text(4000).optional(),
  goals: text(4000).optional(),
  experience: text(4000).optional(),
  commitment: optionalChoice(['1-2', '3-5', '6-8', '9+']),
});

/** A submission must be whole. The database checks this again; this is where it gets said nicely. */
export const submissionSchema = z.object({
  fullName: text(120).min(1, 'Enter your full name.'),
  personalEmail: z.email('Enter a valid personal email address.').max(254),
  raceEthnicity: raceEthnicityChoices
    .min(1, 'Choose at least one option, or "Prefer not to say".')
    .transform((values) => [...new Set(values)]),
  year: text(60).min(1, 'Select your year.'),
  major: text(80).min(1, 'Select your major.'),
  gradTerm: text(20).min(1, 'Select your expected graduation term.'),
  interest: text(80).min(1, 'Pick the area you are most interested in.'),
  teamPref: z.enum(['team', 'have-team'], 'Let us know how you want to find a team.'),
  whyJoin: text(4000).min(40, 'Tell us a bit more about why you want to join, at least 40 characters.'),
  goals: text(4000).min(1, 'Tell us what you want to get out of the League.'),
  experience: text(4000).default(''),
  commitment: z.enum(['1-2', '3-5', '6-8', '9+'], 'Select your expected time commitment.'),
});

export type Draft = z.infer<typeof draftSchema>;
export type Submission = z.infer<typeof submissionSchema>;

type ApplicationRow = {
  status: 'draft' | 'submitted';
  full_name: string | null;
  school_email: string | null;
  personal_email: string | null;
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
  submitted_at: string | null;
  personal_email_verified_at: string | null;
};

export function toRow(input: Draft | Submission) {
  // `undefined` is dropped by JSON and so leaves the column alone on update; an explicit
  // empty string clears it, which is what a member emptying a field in a draft means.
  const blankToNull = (value: string | undefined) => (value === undefined ? undefined : value || null);
  return {
    full_name: blankToNull(input.fullName),
    personal_email: blankToNull(input.personalEmail?.toLowerCase()),
    race_ethnicity: input.raceEthnicity,
    year: blankToNull(input.year),
    major: blankToNull(input.major),
    grad_term: blankToNull(input.gradTerm),
    interest: blankToNull(input.interest),
    team_pref: input.teamPref,
    why_join: blankToNull(input.whyJoin),
    goals: blankToNull(input.goals),
    experience: blankToNull(input.experience),
    commitment: input.commitment,
  };
}

export function fromRow(row: ApplicationRow) {
  return {
    fullName: row.full_name ?? '',
    schoolEmail: row.school_email ?? '',
    personalEmail: row.personal_email ?? '',
    raceEthnicity: row.race_ethnicity ?? [],
    year: row.year ?? '',
    major: row.major ?? '',
    gradTerm: row.grad_term ?? '',
    interest: row.interest ?? '',
    teamPref: row.team_pref ?? '',
    whyJoin: row.why_join ?? '',
    goals: row.goals ?? '',
    experience: row.experience ?? '',
    commitment: row.commitment ?? '',
  };
}

export const APPLICATION_COLUMNS =
  'status, full_name, school_email, personal_email, race_ethnicity, year, major, grad_term, ' +
  'interest, team_pref, why_join, goals, experience, commitment, decision, decided_at, submitted_at, ' +
  'personal_email_verified_at';

const PROFILE_COLUMNS =
  'full_name, is_admin, linkedin_url, github_url, discord_username, ' +
  'resume_name, resume_size, resume_uploaded_at, resume_source, colorstack_sub';

/** Loads everything the dashboard shows, as the member, in parallel. */
export async function loadMe(db: SupabaseClient, member: Member) {
  const [profile, application, team] = await Promise.all([
    db.from('profiles').select(PROFILE_COLUMNS).eq('id', member.id).single(),
    db.from('applications').select(APPLICATION_COLUMNS).eq('user_id', member.id).maybeSingle(),
    db.rpc('my_team'),
  ]);

  const p = unwrap(profile) as unknown as {
    full_name: string | null;
    is_admin: boolean;
    linkedin_url: string | null;
    github_url: string | null;
    discord_username: string | null;
    resume_name: string | null;
    resume_size: number | null;
    resume_uploaded_at: string | null;
    resume_source: 'upload' | 'colorstack' | null;
    colorstack_sub: string | null;
  };
  const a = unwrap(application) as unknown as ApplicationRow | null;
  const t = unwrap(team) as {
    eligible: boolean;
    team: unknown;
    inbox: { invites: unknown[]; requests: unknown[] };
  };

  return {
    session: {
      userId: member.id,
      email: member.email,
      name: p.full_name,
      isAdmin: p.is_admin,
    },
    profile: {
      fullName: p.full_name,
      linkedinUrl: p.linkedin_url,
      githubUrl: p.github_url,
      discordUsername: p.discord_username,
      colorstackLinked: Boolean(p.colorstack_sub),
      resume: p.resume_name
        ? {
            name: p.resume_name,
            size: p.resume_size,
            type: 'application/pdf',
            uploadedAt: p.resume_uploaded_at,
            source: p.resume_source,
          }
        : null,
      application: a ? { ...fromRow(a), schoolEmail: a.school_email ?? member.email } : null,
      applicationStatus: a?.status ?? 'not-started',
      submittedAt: a?.submitted_at ?? null,
      decision: a?.decision ?? null,
      decidedAt: a?.decided_at ?? null,
      // Only ever true for the address currently on the application: changing it clears this.
      personalEmailVerified: Boolean(a?.personal_email && a.personal_email_verified_at),
      teamEligible: t.eligible,
      team: t.team,
      teamInbox: t.inbox,
    },
  };
}
