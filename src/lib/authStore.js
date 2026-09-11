/**
 * Auth + data persistence layer.
 *
 * This is the ONLY file that knows where data lives. Everything else in the
 * app talks to these functions. To move to Supabase/Firebase later, rewrite
 * the bodies here to make network calls, every call site keeps working
 * because the signatures and return shapes stay the same.
 *
 * Current backing store: localStorage (per-browser, survives refresh).
 *
 * SECURITY NOTE: passwords are hashed with SHA-256 so they are not sitting in
 * localStorage in plain text, but this is NOT production-grade auth, there is
 * no salt and no server. A real deployment must move verification server-side
 * (bcrypt/argon2). Do not ship this as the real login.
 */

const USERS_KEY = 'cstl.users';
const SESSION_KEY = 'cstl.session';
const PROFILE_KEY = 'cstl.profiles';

/* ---------- storage helpers (defensive: storage can throw) ---------- */

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/* ---------- hashing ---------- */

async function hashPassword(password) {
  try {
    const data = new TextEncoder().encode(password);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    // crypto.subtle needs a secure context; fall back so dev over plain http works
    return `plain:${password}`;
  }
}

/* ---------- simulated latency so loading states are real ---------- */

const delay = (ms = 620) => new Promise((r) => setTimeout(r, ms));

/* ---------- demo accounts ----------
 *
 * Two seeded logins so the whole flow can be clicked through without
 * registering first:
 *
 *   demo / demo1234  , fresh account, nothing done yet
 *   applied / demo1234, resume uploaded + application already submitted
 *
 * Seeding is skipped entirely in a production build, and it never
 * overwrites an account that already exists (so edits you make while
 * clicking around survive a refresh). Delete this block, and the call in
 * main.jsx, when real auth lands.
 */

const DEMO_PASSWORD = 'demo1234';

const DEMO_APPLICATION = {
  fullName: 'Jordan Rivera',
  schoolEmail: 'jrivera1@student.gsu.edu',
  personalEmail: 'jordan.rivera@gmail.com',
  year: 'Sophomore',
  major: 'Computer Science',
  gradTerm: 'Spring 2028',
  interest: 'Software Engineering',
  teamPref: 'team',
  whyJoin:
    'I want structured practice instead of cramming before career fairs. The League gives me a reason to build and interview every single week.',
  goals:
    'Land a summer internship, get two solid projects on my resume, and stop freezing up in technical interviews.',
  experience:
    'Took CSC 2720 and 3210. Built a small budgeting app in React and a Python scraper for class schedules.',
  commitment: '3-5',
  consentShare: true,
};

export async function seedDemoAccounts() {
  if (!import.meta.env.DEV) return;

  const users = read(USERS_KEY, {});
  const profiles = read(PROFILE_KEY, {});
  let changed = false;

  const seeds = [
    { username: 'demo', profile: null },
    {
      username: 'applied',
      profile: {
        resume: {
          name: 'jordan-rivera-resume.pdf',
          size: 148_000,
          type: 'application/pdf',
          // 1-page valid PDF so the download link actually opens
          dataUrl:
            'data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+PgplbmRvYmoKMiAwIG9iago8PC9UeXBlL1BhZ2VzL0tpZHNbMyAwIFJdL0NvdW50IDE+PgplbmRvYmoKMyAwIG9iago8PC9UeXBlL1BhZ2UvUGFyZW50IDIgMCBSL01lZGlhQm94WzAgMCAyMDAgMjAwXT4+CmVuZG9iagp4cmVmCjAgNAowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMDkgMDAwMDAgbiAKMDAwMDAwMDA1NiAwMDAwMCBuIAowMDAwMDAwMTExIDAwMDAwIG4gCnRyYWlsZXIKPDwvU2l6ZSA0L1Jvb3QgMSAwIFI+PgpzdGFydHhyZWYKMTkwCiUlRU9G',
          uploadedAt: new Date().toISOString(),
        },
        application: DEMO_APPLICATION,
        applicationStatus: 'submitted',
        // Partially built team, so the team panel shows a populated roster
        // with an open seat still left to fill.
        team: {
          name: 'Merge Conflict',
          members: [
            { id: 'm-amara', name: 'Amara Okafor', email: 'aokafor3@student.gsu.edu', picture: null, major: 'Computer Science', year: 'Junior', interest: 'Software Engineering', status: 'on-team' },
            { id: 'm-devin', name: 'Devin Brooks', email: 'dbrooks12@student.gsu.edu', picture: null, major: 'Computer Science', year: 'Sophomore', interest: 'Backend', status: 'on-team' },
          ],
        },
      },
    },
  ];

  for (const seed of seeds) {
    if (users[seed.username]) continue; // never clobber existing data

    const id = crypto.randomUUID();
    users[seed.username] = {
      id,
      username: seed.username,
      passwordHash: await hashPassword(DEMO_PASSWORD),
      createdAt: new Date().toISOString(),
    };
    if (seed.profile) profiles[id] = seed.profile;
    changed = true;
  }

  if (changed) {
    write(USERS_KEY, users);
    write(PROFILE_KEY, profiles);
  }
}

/* ---------- validation ---------- */

export function validateUsername(username) {
  const v = (username ?? '').trim();
  if (!v) return 'Username is required.';
  if (v.length < 3) return 'Username must be at least 3 characters.';
  if (v.length > 24) return 'Username must be 24 characters or fewer.';
  if (!/^[a-zA-Z0-9_.]+$/.test(v)) {
    return 'Use only letters, numbers, underscores, and periods.';
  }
  return null;
}

export function validatePassword(password) {
  const v = password ?? '';
  if (!v) return 'Password is required.';
  if (v.length < 8) return 'Password must be at least 8 characters.';
  if (!/[a-zA-Z]/.test(v) || !/[0-9]/.test(v)) {
    return 'Include at least one letter and one number.';
  }
  return null;
}

/** 0-4 strength score plus a human label, for the signup meter. */
export function passwordStrength(password) {
  const v = password ?? '';
  if (!v) return { score: 0, label: '' };
  let score = 0;
  if (v.length >= 8) score++;
  if (v.length >= 12) score++;
  if (/[a-z]/.test(v) && /[A-Z]/.test(v)) score++;
  if (/[0-9]/.test(v)) score++;
  if (/[^a-zA-Z0-9]/.test(v)) score++;
  score = Math.min(score, 4);
  return { score, label: ['Too weak', 'Weak', 'Fair', 'Strong', 'Excellent'][score] };
}

/* ---------- auth ---------- */

export async function signUp({ username, password }) {
  await delay();

  const nameError = validateUsername(username);
  if (nameError) throw new Error(nameError);
  const passError = validatePassword(password);
  if (passError) throw new Error(passError);

  const key = username.trim().toLowerCase();
  const users = read(USERS_KEY, {});
  if (users[key]) {
    throw new Error('That username is already taken. Try another.');
  }

  users[key] = {
    id: crypto.randomUUID(),
    username: username.trim(),
    passwordHash: await hashPassword(password),
    createdAt: new Date().toISOString(),
  };

  if (!write(USERS_KEY, users)) {
    throw new Error('Could not save your account. Check that browser storage is enabled.');
  }

  const session = { userId: users[key].id, username: users[key].username };
  write(SESSION_KEY, session);
  return session;
}

export async function signIn({ username, password }) {
  await delay();

  if (!username?.trim()) throw new Error('Username is required.');
  if (!password) throw new Error('Password is required.');

  const key = username.trim().toLowerCase();
  const users = read(USERS_KEY, {});
  const user = users[key];

  // Same message for unknown user and wrong password: never reveal which
  // usernames exist.
  const genericError = 'Incorrect username or password.';
  if (!user) throw new Error(genericError);

  const attempted = await hashPassword(password);
  if (attempted !== user.passwordHash) throw new Error(genericError);

  const session = { userId: user.id, username: user.username };
  write(SESSION_KEY, session);
  return session;
}

export function signOut() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* nothing to do */
  }
}

export function getSession() {
  return read(SESSION_KEY, null);
}

/* ---------- profile: resume + application ---------- */

export function getProfile(userId) {
  const profiles = read(PROFILE_KEY, {});
  return (
    profiles[userId] ?? {
      resume: null,
      application: null,
      applicationStatus: 'not-started',
    }
  );
}

export function saveProfile(userId, patch) {
  const profiles = read(PROFILE_KEY, {});
  const next = { ...getProfile(userId), ...patch };
  profiles[userId] = next;
  write(PROFILE_KEY, profiles);
  return next;
}

/**
 * Stores a resume as a base64 data URL so it survives a refresh and can be
 * re-downloaded. localStorage caps around 5MB, hence the 2MB file limit
 * enforced in the UI.
 */
export function saveResume(userId, { name, size, type, dataUrl }) {
  return saveProfile(userId, {
    resume: { name, size, type, dataUrl, uploadedAt: new Date().toISOString() },
  });
}

export function removeResume(userId) {
  return saveProfile(userId, { resume: null });
}

export function saveApplication(userId, application) {
  return saveProfile(userId, { application, applicationStatus: 'submitted' });
}

export function saveApplicationDraft(userId, application) {
  return saveProfile(userId, { application, applicationStatus: 'draft' });
}

/* ============================================================
   Leaderboard standings

   Preview data. There is no server yet, so standings are seeded here and the
   rest of the app reads them through fetchStandings(). When a real backend
   lands, rewrite this function's body to make a network call: the return shape
   is the contract, and the Leaderboard page keeps working unchanged.

   Raw scores are per-event points against that event's own rubric max (see
   src/lib/season.js). Events a team has not played are simply absent from the
   scores object, which the compositing math reads as "not played" rather than
   as a zero.

   Teams are cross-club: anyone can team with anyone, so a team carries no
   org affiliation and the board never displays one.
   ============================================================ */

export const STANDINGS_ARE_PREVIEW = true;

const SEED_STANDINGS = [
  { id: 't-segfault',  name: 'Segfault',          members: 4, scores: { 'kickoff': 92, 'internal-1': 88 } },
  { id: 't-null-ptr',  name: 'Null Pointers',     members: 4, scores: { 'kickoff': 86, 'internal-1': 91 } },
  { id: 't-merge',     name: 'Merge Conflict',    members: 3, scores: { 'kickoff': 90, 'internal-1': 83 } },
  { id: 't-runtime',   name: 'Runtime Terror',    members: 4, scores: { 'kickoff': 81, 'internal-1': 89 } },
  { id: 't-stack',     name: 'Stack Overflow',    members: 4, scores: { 'kickoff': 84, 'internal-1': 80 } },
  { id: 't-cache',     name: 'Cache Money',       members: 3, scores: { 'kickoff': 78, 'internal-1': 85 } },
  { id: 't-ctrl-alt',  name: 'Ctrl Alt Elite',    members: 4, scores: { 'kickoff': 76, 'internal-1': 79 } },
  { id: 't-semicolon', name: 'Missing Semicolon', members: 2, scores: { 'kickoff': 71, 'internal-1': 74 } },
  { id: 't-panic',     name: 'Kernel Panic',      members: 3, scores: { 'kickoff': 69, 'internal-1': 72 } },
  { id: 't-infinite',  name: 'Infinite Loop',     members: 4, scores: { 'kickoff': 64, 'internal-1': 70 } },
];

/**
 * Current season standings.
 *
 * @returns {Promise<{ teams: Array, updatedAt: string, isPreview: boolean }>}
 *   Teams carry raw per-event scores; ranking and composite math live in
 *   src/lib/season.js so the display layer stays the only thing that changes
 *   when the scoring rules change.
 */
export async function fetchStandings() {
  await delay(420);
  return {
    teams: SEED_STANDINGS.map((t) => ({ ...t, scores: { ...t.scores } })),
    updatedAt: new Date().toISOString(),
    isPreview: STANDINGS_ARE_PREVIEW,
  };
}

/* ============================================================
   Member directory + teams

   MOCK DATA. There is no server and no Google sign-in yet, so the pool of
   people you can team up with is seeded here. Every member is shaped like a
   Google account payload (`name`, `email`, `picture`) plus the League fields
   we collect ourselves, so when Google auth lands this array gets replaced by
   a real query and the call sites below keep working unchanged.

   `avatar` holds initials rather than a photo URL: a real Google profile
   picture drops into `picture` and the UI falls back to initials when it is
   missing, which is also what happens for members who never set one.

   Team rules live in TEAM_RULES so the Dashboard and any future server-side
   check read the same numbers.
   ============================================================ */

export const MEMBERS_ARE_MOCK = true;

export const TEAM_RULES = { min: 2, max: 4 };

const MOCK_MEMBERS = [
  { id: 'm-amara',   name: 'Amara Okafor',      email: 'aokafor3@student.gsu.edu',   picture: null, major: 'Computer Science',        year: 'Junior',    interest: 'Software Engineering', status: 'open' },
  { id: 'm-devin',   name: 'Devin Brooks',      email: 'dbrooks12@student.gsu.edu',  picture: null, major: 'Computer Science',        year: 'Sophomore', interest: 'Backend',              status: 'open' },
  { id: 'm-priya',   name: 'Priya Raman',       email: 'praman1@student.gsu.edu',    picture: null, major: 'Computer Information Systems', year: 'Senior', interest: 'Data',             status: 'open' },
  { id: 'm-marcus',  name: 'Marcus Hall',       email: 'mhall28@student.gsu.edu',    picture: null, major: 'Computer Science',        year: 'Freshman',  interest: 'Frontend',             status: 'open' },
  { id: 'm-sofia',   name: 'Sofia Delgado',     email: 'sdelgado4@student.gsu.edu',  picture: null, major: 'Mathematics',             year: 'Junior',    interest: 'Machine Learning',     status: 'open' },
  { id: 'm-tyrone',  name: 'Tyrone Jackson',    email: 'tjackson19@student.gsu.edu', picture: null, major: 'Computer Science',        year: 'Sophomore', interest: 'Software Engineering', status: 'open' },
  { id: 'm-hana',    name: 'Hana Kim',          email: 'hkim7@student.gsu.edu',      picture: null, major: 'Computer Information Systems', year: 'Junior', interest: 'Product',          status: 'open' },
  { id: 'm-luis',    name: 'Luis Moreno',       email: 'lmoreno2@student.gsu.edu',   picture: null, major: 'Computer Science',        year: 'Senior',    interest: 'Cloud / DevOps',       status: 'on-team' },
  { id: 'm-chloe',   name: 'Chloe Bennett',     email: 'cbennett5@student.gsu.edu',  picture: null, major: 'Data Science',            year: 'Sophomore', interest: 'Data',                 status: 'open' },
  { id: 'm-andre',   name: 'Andre Whitfield',   email: 'awhitfield6@student.gsu.edu',picture: null, major: 'Computer Science',        year: 'Junior',    interest: 'Backend',              status: 'on-team' },
  { id: 'm-naomi',   name: 'Naomi Osei',        email: 'nosei1@student.gsu.edu',     picture: null, major: 'Computer Science',        year: 'Freshman',  interest: 'Frontend',             status: 'open' },
  { id: 'm-jamal',   name: 'Jamal Carter',      email: 'jcarter31@student.gsu.edu',  picture: null, major: 'Cybersecurity',           year: 'Senior',    interest: 'Security',             status: 'open' },
  { id: 'm-elena',   name: 'Elena Petrova',     email: 'epetrova2@student.gsu.edu',  picture: null, major: 'Computer Science',        year: 'Junior',    interest: 'Machine Learning',     status: 'open' },
  { id: 'm-kwame',   name: 'Kwame Mensah',      email: 'kmensah8@student.gsu.edu',   picture: null, major: 'Computer Information Systems', year: 'Sophomore', interest: 'Product',       status: 'open' },
  { id: 'm-riley',   name: 'Riley Thompson',    email: 'rthompson14@student.gsu.edu',picture: null, major: 'Computer Science',        year: 'Senior',    interest: 'Software Engineering', status: 'open' },
  { id: 'm-ximena',  name: 'Ximena Flores',     email: 'xflores3@student.gsu.edu',   picture: null, major: 'Data Science',            year: 'Junior',    interest: 'Data',                 status: 'open' },
];

/** Initials fallback for members with no profile picture. */
export function initialsOf(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

/**
 * Searchable member directory.
 *
 * @param {string} query  Matched against name, email, major, and interest.
 * @returns {Promise<Array>} Members, already excluding nobody: the caller
 *   filters out people already on its team so this stays a pure lookup.
 */
export async function fetchMembers(query = '') {
  await delay(260);

  const q = query.trim().toLowerCase();
  if (!q) return MOCK_MEMBERS.map((m) => ({ ...m }));

  return MOCK_MEMBERS.filter((m) =>
    [m.name, m.email, m.major, m.interest].some((field) =>
      field.toLowerCase().includes(q)
    )
  ).map((m) => ({ ...m }));
}

/**
 * The signed-in user's team.
 *
 * Stored on the profile so it survives a refresh like everything else.
 * Shape: { name: string, members: Array<Member> }. `members` holds the
 * teammates the user picked, not counting the user themselves.
 */
export function getTeam(userId) {
  return getProfile(userId).team ?? null;
}

export function saveTeam(userId, team) {
  return saveProfile(userId, { team });
}

/** Adds a member, enforcing the roster cap (the user counts toward it). */
export function addTeammate(userId, member) {
  const team = getTeam(userId) ?? { name: '', members: [] };

  if (team.members.some((m) => m.id === member.id)) {
    throw new Error(`${member.name} is already on your team.`);
  }
  // +1 for the user themselves, who is never in the members array.
  if (team.members.length + 1 >= TEAM_RULES.max) {
    throw new Error(
      `Teams cap at ${TEAM_RULES.max} people, including you. Remove someone first.`
    );
  }

  return saveTeam(userId, { ...team, members: [...team.members, { ...member }] });
}

export function removeTeammate(userId, memberId) {
  const team = getTeam(userId) ?? { name: '', members: [] };
  return saveTeam(userId, {
    ...team,
    members: team.members.filter((m) => m.id !== memberId),
  });
}

export function renameTeam(userId, name) {
  const team = getTeam(userId) ?? { name: '', members: [] };
  return saveTeam(userId, { ...team, name: name.trim().slice(0, 40) });
}
