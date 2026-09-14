/**
 * Where a member stands, worked out once from the server's profile.
 *
 * The dashboard, the application page and its submitted view all describe the same four
 * stages in the same words and colours, so a member never has to reconcile two pages that
 * each explain their status differently.
 *
 * Tones map to colours in ui.css (.tone--*):
 *   brand    teal     something for you to do
 *   review   mustard  waiting on e-board, nothing for you to do
 *   success  green    accepted, done
 *   waitlist clay     on hold
 *   neutral  grey     closed
 */

export function formatDay(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

/** The four sections of the application form, and what makes each one complete. */
export const SECTIONS = [
  {
    id: 'about',
    title: 'About you',
    done: (a) => Boolean(a.fullName?.trim() && a.personalEmail?.trim() && a.raceEthnicity?.length),
  },
  {
    id: 'academics',
    title: 'Academics',
    done: (a) => Boolean(a.year && a.major && a.gradTerm && a.interest),
  },
  {
    id: 'answers',
    title: 'Short answers',
    done: (a) => Boolean((a.whyJoin?.trim().length ?? 0) >= 40 && a.goals?.trim()),
  },
  {
    id: 'logistics',
    title: 'Logistics',
    done: (a) => Boolean(a.teamPref && a.commitment),
  },
];

export function sectionsDone(application) {
  if (!application) return 0;
  return SECTIONS.filter((s) => s.done(application)).length;
}

/**
 * @returns {{
 *   key: string, tone: string, label: string,
 *   stages: { id: string, title: string, state: 'done'|'current'|'upcoming'|'locked', note: string }[]
 * }}
 */
export function journey(profile) {
  const status = profile?.applicationStatus ?? 'not-started';
  const decision = profile?.decision ?? null;
  const submitted = status === 'submitted';
  const team = profile?.team ?? null;
  const done = sectionsDone(profile?.application);

  let key;
  if (!submitted) key = status === 'draft' ? 'draft' : 'start';
  else if (!decision) key = 'review';
  else if (decision === 'accepted') key = team ? 'on-team' : 'accepted';
  else key = decision; // 'waitlisted' | 'denied'

  const tone = {
    start: 'brand',
    draft: 'brand',
    review: 'review',
    accepted: 'success',
    'on-team': 'success',
    waitlisted: 'waitlist',
    denied: 'neutral',
  }[key];

  // Short, for badges.
  const label = {
    start: 'Not started',
    draft: 'In progress',
    review: 'Under review',
    accepted: 'Accepted',
    'on-team': 'Accepted',
    waitlisted: 'Waitlisted',
    denied: 'Not selected',
  }[key];

  const stages = [
    { id: 'account', title: 'Account', state: 'done', note: 'Email confirmed' },
    {
      id: 'apply',
      title: 'Application',
      state: submitted ? 'done' : 'current',
      note: submitted
        ? `Submitted ${formatDay(profile?.submittedAt)}`
        : status === 'draft'
          ? `${done} of ${SECTIONS.length} sections done`
          : 'About 10 minutes',
    },
    {
      id: 'review',
      title: 'Review',
      state: !submitted ? 'upcoming' : decision ? 'done' : 'current',
      note: !submitted
        ? 'After you submit'
        : decision
          ? `${label} ${formatDay(profile?.decidedAt)}`.trim()
          : 'E-board is reading it',
    },
    {
      id: 'team',
      title: 'Team',
      state: team ? 'done' : decision === 'accepted' ? 'current' : 'locked',
      note: team
        ? team.name
        : decision === 'accepted'
          ? 'Join or start one'
          : decision && decision !== 'accepted'
            ? 'For accepted members'
            : 'Opens when accepted',
    },
  ];

  return { key, tone, label, stages };
}
