/**
 * Fall 2026 season definition + scoring math.
 *
 * This is the single source of truth for the scoring system: the five graded
 * events, their rubrics, and their weights. The Scoring page renders it and
 * the Leaderboard computes against it, so a rule change happens here once.
 *
 * Scoring model
 * -------------
 * Each event is scored on its own raw rubric (all currently out of 100).
 * A team's raw score converts to a percentage of that event's max, then that
 * percentage is weighted and summed into a composite out of 100. Weighting the
 * percentage rather than the raw points is what keeps one rough round from
 * tanking a standing: a zero costs you that event's weight, never more.
 *
 *   composite = sum over graded events of (raw / max) * weight
 *
 * Events a team has not played yet are excluded from the composite entirely
 * rather than counted as zero, so early-season standings compare like with
 * like. `earnedWeight` reports how much of the 100 has actually been decided.
 */

/* ---------- events ---------- */

/**
 * Order matters: this is the season order shown on both pages.
 * `status` is 'complete' | 'upcoming' | 'tbd'.
 */
export const EVENTS = [
  {
    id: 'kickoff-cup',
    name: 'Kickoff Cup',
    event: 'US Soccer Mini Hackathon',
    date: 'Sept 30',
    weight: 15,
    max: 100,
    status: 'complete',
    partner: 'US Soccer',
    blurb:
      'A mini hackathon tied into the Tech League scoring system, run in partnership with US Soccer. All teams participate.',
    rubric: [
      { label: 'Functionality', points: 40 },
      { label: 'Technical difficulty', points: 20 },
      { label: 'Design/UX', points: 15 },
      { label: 'Presentation', points: 15 },
      { label: 'Creativity', points: 10 },
    ],
  },
  {
    id: 'design-derby',
    name: 'Design Derby',
    event: 'Internal Challenge #1 (UI Build)',
    date: 'October 14',
    weight: 15,
    max: 100,
    status: 'complete',
    blurb:
      'Ship a working mini-project against a design/build prompt over a set window. Submit a demo plus your repo.',
    rubric: [
      { label: 'Functionality', points: 40 },
      { label: 'Technical difficulty', points: 20 },
      { label: 'Design/UX', points: 15 },
      { label: 'Presentation', points: 15 },
      { label: 'Creativity', points: 10 },
    ],
  },
  {
    id: 'crew-clash',
    name: 'Crew Clash',
    event: 'AWS / Kiro Crew Challenge',
    date: 'Oct 23',
    weight: 15,
    max: 100,
    status: 'upcoming',
    partner: 'AWS',
    blurb:
      "A workshop-to-challenge event built around AWS's Kiro and Kiro Crew platform. Teams learn the tool, then apply it to a live multi-step build task, judged by AWS.",
    rubric: [
      { label: 'Functionality', points: 40 },
      { label: 'Technical execution', points: 25 },
      { label: 'Presentation', points: 15 },
      { label: 'Creativity', points: 10 },
      { label: 'Teamwork', points: 10 },
    ],
  },
  {
    id: 'hack-in-the-box',
    name: 'Hack in the Box',
    event: 'Internal Challenge #2 (Cybersecurity)',
    date: 'November 6',
    weight: 15,
    max: 100,
    status: 'upcoming',
    blurb:
      'A beginner-friendly Capture The Flag challenge. Teams solve a series of security puzzles (cryptography, basic exploits, password cracking, etc.) to find hidden flags within a set time window.',
    rubric: [
      { label: 'Flags solved / correctness', points: 50 },
      { label: 'Speed (time bonus)', points: 20 },
      { label: 'Write-up / documentation quality', points: 20 },
      { label: 'Teamwork/collaboration', points: 10 },
    ],
  },
  {
    id: 'championship',
    name: 'Championship Round',
    event: 'Capstone Hackathon',
    date: 'Dec 4',
    weight: 40,
    max: 100,
    status: 'tbd',
    featured: true,
    blurb:
      'The centerpiece. Every partner org in one room: a themed prompt, a build window, then live demos to partner reps and e-board.',
    // Rubric is deliberately empty: the breakdown is still being finalized.
    rubric: [],
    tbdNote:
      'Final scoring breakdown, exact date, and sponsors still being finalized.',
  },
];

/** The Combine is a parallel track, not a graded event. Kept out of EVENTS on purpose. */
export const COMBINE = {
  name: 'The Combine',
  blurb:
    'A mock technical interview experience open to 15 students who apply directly. Students in The Combine do not participate in the Tech League itself; it is a standalone opportunity for students outside the league.',
  note: 'Not scored and does not factor into the leaderboard.',
};

export const TOTAL_WEIGHT = EVENTS.reduce((sum, e) => sum + e.weight, 0);

/** Events that can currently contribute points, in season order. */
export const GRADED_EVENT_IDS = EVENTS.filter((e) => e.status === 'complete').map(
  (e) => e.id
);

export function getEvent(id) {
  return EVENTS.find((e) => e.id === id) ?? null;
}

/* ---------- scoring math ---------- */

/**
 * Composite score for one team's raw results.
 *
 * @param {Record<string, number>} scores raw points keyed by event id; a
 *   missing or non-numeric entry means "not played yet" and is skipped, not
 *   treated as a zero.
 * @returns {{ composite: number, earnedWeight: number, breakdown: Array }}
 *   `composite` is out of 100 across the whole season. `earnedWeight` is how
 *   many of those 100 points have actually been contested so far, which is
 *   what lets the UI say "out of 30 decided" honestly.
 */
export function computeComposite(scores = {}) {
  let composite = 0;
  let earnedWeight = 0;
  const breakdown = [];

  for (const event of EVENTS) {
    const raw = scores[event.id];
    const played = typeof raw === 'number' && Number.isFinite(raw);

    if (!played) {
      breakdown.push({ eventId: event.id, played: false, raw: null, pct: null, weighted: null });
      continue;
    }

    // Clamp so a data-entry slip can't push a team past the event ceiling.
    const clamped = Math.max(0, Math.min(raw, event.max));
    const pct = clamped / event.max;
    const weighted = pct * event.weight;

    composite += weighted;
    earnedWeight += event.weight;
    breakdown.push({
      eventId: event.id,
      played: true,
      raw: clamped,
      pct: pct * 100,
      weighted,
    });
  }

  return { composite, earnedWeight, breakdown };
}

/**
 * Ranks teams by composite, descending.
 *
 * Ties share a rank (two teams at 88.4 are both 2nd, the next is 4th) so the
 * board never invents a separation the scores don't support.
 */
export function rankTeams(teams = []) {
  const scored = teams.map((team) => {
    const { composite, earnedWeight, breakdown } = computeComposite(team.scores);
    return { ...team, composite, earnedWeight, breakdown };
  });

  scored.sort((a, b) => b.composite - a.composite || a.name.localeCompare(b.name));

  let lastComposite = null;
  let lastRank = 0;

  return scored.map((team, i) => {
    // Compare rounded values so two teams displayed as equal also rank as equal.
    const key = team.composite.toFixed(2);
    const rank = key === lastComposite ? lastRank : i + 1;
    lastComposite = key;
    lastRank = rank;
    return { ...team, rank };
  });
}

/** One decimal, but no trailing `.0` noise on whole numbers. */
export function formatScore(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—';
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
