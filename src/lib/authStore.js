/**
 * Auth + data layer.
 *
 * This is the ONLY file that knows where data lives. Everything else in the app talks to
 * these functions, and these functions talk to the League API at /api (see api/ at the
 * repo root), which is the only thing that talks to the database.
 *
 * Nothing here caches. Every read goes to the server, and every write returns the
 * server's fresh copy of whatever it changed, so a member who accepts an invite on their
 * phone and refreshes on their laptop sees the same team.
 *
 * Every function either resolves with data or throws an Error whose message is a sentence
 * a member can read. The API writes those sentences; request() below passes them through
 * and supplies one when the network itself failed.
 */

/* ---------- transport ---------- */

/**
 * Fired when the API says the session has ended, so AuthContext can sign the page out
 * instead of every component discovering it separately.
 */
export const SIGNED_OUT_EVENT = 'cstl:signed-out';

async function request(method, path, body) {
  const init = { method, credentials: 'same-origin', headers: {} };
  if (body instanceof FormData) {
    init.body = body;
  } else if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(`/api${path}`, init);
  } catch {
    throw new Error('We could not reach the League server. Check your connection and try again.');
  }

  if (response.status === 204) return null;

  let data = null;
  try {
    data = await response.json();
  } catch {
    // A body that is not JSON is never something a member should see: it is a proxy
    // error page, or index.html because the /api rewrite is missing.
  }

  if (!response.ok) {
    const error = new Error(data?.error ?? 'Something went wrong on our end. Try again in a minute.');
    error.status = response.status;
    error.code = data?.code;
    if (response.status === 401 && !path.startsWith('/auth/')) {
      window.dispatchEvent(new Event(SIGNED_OUT_EVENT));
    }
    throw error;
  }
  if (data === null) {
    throw new Error('Something went wrong on our end. Try again in a minute.');
  }
  return data;
}

/* ---------- validation ---------- */

const STUDENT_EMAIL = /^[^@\s]+@student\.gsu\.edu$/i;

/** The same rule the API and the database enforce, said before the round trip. */
export function validateEmail(email) {
  const v = (email ?? '').trim();
  if (!v) return 'Enter your GSU student email.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Enter a valid email address.';
  if (!STUDENT_EMAIL.test(v)) {
    return 'Use your GSU student email, the one ending in @student.gsu.edu.';
  }
  return null;
}

export function validatePassword(password) {
  const v = password ?? '';
  if (!v) return 'Password is required.';
  if (v.length < 8) return 'Password must be at least 8 characters.';
  if (v.length > 72) return 'Password must be 72 characters or fewer.';
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

/* ---------- auth ----------
 *
 * The "me" shape every sign-in function resolves with, and what fetchMe returns:
 *   {
 *     session: { userId, email, name, isAdmin },
 *     profile: { fullName, resume, application, applicationStatus, decision,
 *                teamEligible, team, teamInbox, ... },
 *   }
 */

/**
 * Creates the account and emails a confirmation link. There is no session yet: the
 * member is signed in when they open that link.
 *
 * @returns {Promise<{ status: 'verify', email: string }>}
 */
export function signUp({ email, password }) {
  return request('POST', '/auth/signup', { email: email.trim(), password });
}

export function verifyEmail({ tokenHash, type }) {
  return request('POST', '/auth/verify', { tokenHash, type });
}

export function resendVerification(email) {
  return request('POST', '/auth/resend', { email: email.trim() });
}

export function signIn({ email, password }) {
  return request('POST', '/auth/login', { email: email.trim(), password });
}

export async function signOut() {
  await request('POST', '/auth/logout');
}

export function requestPasswordReset(email) {
  return request('POST', '/auth/password/forgot', { email: email.trim() });
}

export function resetPassword({ tokenHash, password }) {
  return request('POST', '/auth/password/reset', { tokenHash, password });
}

/** A navigation, not a fetch: the portal login is a full-page redirect. */
export function colorstackSignInUrl(next = '/dashboard') {
  return `/api/auth/colorstack?next=${encodeURIComponent(next)}`;
}

/**
 * The signed-in member, or null when nobody is. A network failure still throws: "we
 * could not tell" is not the same as "signed out", and treating it that way would bounce
 * a member to the login page every time the wifi blinked.
 */
export async function fetchMe() {
  try {
    return await request('GET', '/me');
  } catch (error) {
    if (error.status === 401) return null;
    throw error;
  }
}

/* ---------- profile: resume + application ---------- */

export function saveProfile(patch) {
  return request('PATCH', '/me', patch);
}

/** Uploads a PDF. The server checks the bytes are a PDF, not just the extension. */
export function saveResume(file) {
  const form = new FormData();
  form.append('file', file);
  return request('POST', '/resume', form);
}

export function removeResume() {
  return request('DELETE', '/resume');
}

/** Same-origin, so the session cookie rides along on a plain link. */
export const RESUME_DOWNLOAD_URL = '/api/resume';

/** Submits for review. Rejected if already submitted: a submission is final. */
export function saveApplication(application) {
  return request('POST', '/application', application);
}

export function saveApplicationDraft(application) {
  return request('PUT', '/application/draft', application);
}

/* ============================================================
   Leaderboard standings

   Teams carry raw per-event points as the server stores them. Ranking and composite math
   live in src/lib/season.js, which only ever runs over these numbers; nothing a member
   sends can change them. Events a team has not played are absent from `scores`, which
   the math reads as "not played" rather than as a zero.
   ============================================================ */

/** @returns {Promise<{ teams: Array, updatedAt: string | null }>} */
export function fetchStandings() {
  return request('GET', '/standings');
}

/* ============================================================
   Teams

   Team rules live in the database; TEAM_RULES only mirrors the numbers for display.
   Every team function resolves with the member's team payload:
     {
       eligible: boolean,            // accepted into the League, so teams are open to them
       team: null | {
         id, name, capacity, role,   // role is the member's own: 'captain' | 'member'
         members: Array<Member & { role, isYou }>,
         invites: Array<{ id, member, message, sentAt }>,   // sent by the team, pending
         requests: Array<{ id, member, message, sentAt }>,  // asking to join, pending
       },
       inbox: {
         invites: Array<{ id, team, message, sentAt }>,     // teams inviting the member
         requests: Array<{ id, team, message, sentAt }>,    // the member's own asks
       },
     }
   ============================================================ */

export const TEAM_RULES = { min: 3, max: 4 };

/** Initials fallback for members with no profile picture. */
export function initialsOf(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

/** Seats taken: teammates, including the member, plus invites still pending. */
export function seatsUsed(team) {
  return (team?.members?.length ?? 0) + (team?.invites?.length ?? 0);
}

/**
 * The member directory: accepted members only, never with an email. Already ordered by
 * the server: people on no team, then people on a team with room, then full teams.
 */
export async function fetchMembers(query = '') {
  const data = await request('GET', `/members?q=${encodeURIComponent(query.trim())}`);
  return data.members;
}

/** Every team with at least one member, open teams first. */
export async function fetchTeams() {
  const data = await request('GET', '/teams');
  return data.teams;
}

export function getTeam() {
  return request('GET', '/team');
}

export function createTeam({ name, capacity }) {
  return request('POST', '/teams', { name: name.trim(), capacity: Number(capacity) });
}

export function updateTeam(patch) {
  return request('PATCH', '/team', patch);
}

export function renameTeam(name) {
  return updateTeam({ name: name.trim() });
}

export function leaveTeam() {
  return request('POST', '/team/leave');
}

/** Captain only. The person must be on no team; they join when they accept. */
export function requestTeammate(userId, message = '') {
  return request('POST', '/team/invites', { userId, message: message.trim() });
}

/** Asks to join a team with room. The captain accepts or declines. */
export function requestToJoin(teamId, message = '') {
  return request('POST', `/teams/${teamId}/requests`, { message: message.trim() });
}

/** Withdraws something the member sent: a captain's invite, or their own request. */
export function cancelTeamRequest(inviteId) {
  return request('DELETE', `/team/invites/${inviteId}`);
}

/** Accepts an invite to the member, or (as captain) a request to the team. */
export function acceptTeamInvite(inviteId) {
  return request('POST', `/team/invites/${inviteId}/accept`);
}

export function declineTeamInvite(inviteId) {
  return request('POST', `/team/invites/${inviteId}/decline`);
}

/** Captain only. */
export function removeTeammate(userId) {
  return request('DELETE', `/team/members/${userId}`);
}

/** Relative timestamp for invite rows: "5h ago". */
export function timeAgo(iso) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';

  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return days === 1 ? 'yesterday' : `${days}d ago`;
}

/* ============================================================
   Admin

   The server checks the signed-in account is an admin on every call. These are hidden
   from non-admins in the UI for tidiness, not for safety.
   ============================================================ */

export async function fetchAdminApplications() {
  const data = await request('GET', '/admin/applications');
  return data.applications;
}

/** @returns {Promise<{ application, emailed: boolean, emailError?: string }>} */
export function decideApplication(userId, decision) {
  return request('POST', `/admin/applications/${userId}/decision`, { decision });
}

export function resendDecisionEmail(userId) {
  return request('POST', `/admin/applications/${userId}/email`);
}

export function reopenApplication(userId) {
  return request('POST', `/admin/applications/${userId}/reopen`);
}

export const adminResumeUrl = (userId) => `/api/admin/applications/${userId}/resume`;

/** @returns {Promise<{ events: Array, teams: Array }>} */
export function fetchAdminScores() {
  return request('GET', '/admin/scores');
}

/** `points: null` clears the score. */
export function saveScore({ teamId, eventId, points }) {
  return request('PUT', '/admin/scores', { teamId, eventId, points });
}

export const PURGE_PHRASE = 'DELETE ALL RESUMES';

export function purgeResumes(confirm) {
  return request('POST', '/admin/resumes/purge', { confirm });
}
