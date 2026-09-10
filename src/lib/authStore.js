/**
 * Auth + data persistence layer.
 *
 * This is the ONLY file that knows where data lives. Everything else in the
 * app talks to these functions. To move to Supabase/Firebase later, rewrite
 * the bodies here to make network calls — every call site keeps working
 * because the signatures and return shapes stay the same.
 *
 * Current backing store: localStorage (per-browser, survives refresh).
 *
 * SECURITY NOTE: passwords are hashed with SHA-256 so they are not sitting in
 * localStorage in plain text, but this is NOT production-grade auth — there is
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
