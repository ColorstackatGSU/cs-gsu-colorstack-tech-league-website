import { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import * as store from './authStore';

const AuthContext = createContext(null);

/**
 * The signed-in member, loaded from the server.
 *
 * `status` is 'loading' until the first /api/me answers, then 'ready'. Route guards wait
 * for 'ready' before deciding anything, because "we have not asked yet" and "signed out"
 * are different answers, and treating the first as the second would bounce every signed-in
 * member to the login page on every refresh.
 *
 * `loadError` is set when that first request could not reach the server at all, so the
 * app can say so instead of pretending the member is signed out.
 *
 * Every action returns the server's fresh copy and replaces local state with it. There is
 * no local cache to go stale.
 */
export function AuthProvider({ children }) {
  const [status, setStatus] = useState('loading');
  const [loadError, setLoadError] = useState('');
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  // Why the API last signed this page out, when it said. Login explains it.
  const [signOutReason, setSignOutReason] = useState(null);

  const apply = useCallback((me) => {
    setSession(me?.session ?? null);
    setProfile(me?.profile ?? null);
    return me;
  }, []);

  // Team actions answer with just the team payload; fold it into the profile.
  const applyTeam = useCallback((payload) => {
    setProfile((prev) =>
      prev
        ? { ...prev, teamEligible: payload.eligible, team: payload.team, teamInbox: payload.inbox }
        : prev
    );
    return payload;
  }, []);

  const refresh = useCallback(async () => {
    try {
      const me = await store.fetchMe();
      apply(me);
      setLoadError('');
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setStatus('ready');
    }
  }, [apply]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Coming back to the tab re-reads the server, so an invite accepted on another device
  // shows up without a manual refresh. Throttled so tab-flicking does not hammer the API.
  const lastRefresh = useRef(0);
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastRefresh.current < 15_000) return;
      lastRefresh.current = Date.now();
      refresh();
    }
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refresh]);

  // The API said the session is gone (expired, or signed out elsewhere).
  useEffect(() => {
    function onSignedOut(event) {
      setSignOutReason(event.detail?.code ?? null);
      apply(null);
    }
    window.addEventListener(store.SIGNED_OUT_EVENT, onSignedOut);
    return () => window.removeEventListener(store.SIGNED_OUT_EVENT, onSignedOut);
  }, [apply]);

  const signIn = useCallback(async (credentials) => apply(await store.signIn(credentials)), [apply]);

  // No session yet: the member is signed in when they open the emailed link.
  const signUp = useCallback((credentials) => store.signUp(credentials), []);

  const verifyEmail = useCallback(async (params) => apply(await store.verifyEmail(params)), [apply]);

  const resetPassword = useCallback(async (params) => apply(await store.resetPassword(params)), [apply]);

  const signOut = useCallback(async () => {
    try {
      await store.signOut();
    } finally {
      // Signed out locally even if the request failed: the member asked to leave, and
      // the server clears the cookies on the next request it does receive anyway.
      apply(null);
    }
  }, [apply]);

  const updateProfile = useCallback(async (patch) => apply(await store.saveProfile(patch)), [apply]);
  const uploadResume = useCallback(async (file) => apply(await store.saveResume(file)), [apply]);
  const deleteResume = useCallback(async () => apply(await store.removeResume()), [apply]);
  const submitApplication = useCallback(
    async (application) => apply(await store.saveApplication(application)),
    [apply]
  );
  const sendPersonalEmailLink = useCallback(
    async (email) => apply(await store.sendPersonalEmailLink(email)),
    [apply]
  );
  const saveDraft = useCallback(
    async (application) => apply(await store.saveApplicationDraft(application)),
    [apply]
  );

  /* ---------- team ----------
     Joining is mutual either way round: an invite waits for the invitee, a request
     waits for the captain. These throw with the server's reason when a rule refuses
     (team full, already on a team, not the captain), so callers show the message. */

  const createTeam = useCallback(async (input) => applyTeam(await store.createTeam(input)), [applyTeam]);
  const updateTeam = useCallback(async (patch) => applyTeam(await store.updateTeam(patch)), [applyTeam]);
  const renameTeam = useCallback(async (name) => applyTeam(await store.renameTeam(name)), [applyTeam]);
  const leaveTeam = useCallback(async () => applyTeam(await store.leaveTeam()), [applyTeam]);
  const requestTeammate = useCallback(
    async (userId, message) => applyTeam(await store.requestTeammate(userId, message)),
    [applyTeam]
  );
  const requestToJoin = useCallback(
    async (teamId, message) => applyTeam(await store.requestToJoin(teamId, message)),
    [applyTeam]
  );
  const cancelTeamRequest = useCallback(
    async (inviteId) => applyTeam(await store.cancelTeamRequest(inviteId)),
    [applyTeam]
  );
  const acceptTeamInvite = useCallback(
    async (inviteId) => applyTeam(await store.acceptTeamInvite(inviteId)),
    [applyTeam]
  );
  const declineTeamInvite = useCallback(
    async (inviteId) => applyTeam(await store.declineTeamInvite(inviteId)),
    [applyTeam]
  );
  const removeTeammate = useCallback(
    async (userId) => applyTeam(await store.removeTeammate(userId)),
    [applyTeam]
  );

  const value = useMemo(
    () => ({
      status,
      loadError,
      session,
      profile,
      isAuthed: Boolean(session),
      isAdmin: Boolean(session?.isAdmin),
      refresh,
      signIn,
      signUp,
      verifyEmail,
      resetPassword,
      signOut,
      updateProfile,
      uploadResume,
      deleteResume,
      submitApplication,
      saveDraft,
      sendPersonalEmailLink,
      createTeam,
      updateTeam,
      renameTeam,
      leaveTeam,
      requestTeammate,
      requestToJoin,
      cancelTeamRequest,
      acceptTeamInvite,
      declineTeamInvite,
      removeTeammate,
    }),
    [
      status,
      loadError,
      session,
      profile,
      signOutReason,
      refresh,
      signIn,
      signUp,
      verifyEmail,
      resetPassword,
      signOut,
      updateProfile,
      uploadResume,
      deleteResume,
      submitApplication,
      saveDraft,
      sendPersonalEmailLink,
      createTeam,
      updateTeam,
      renameTeam,
      leaveTeam,
      requestTeammate,
      requestToJoin,
      cancelTeamRequest,
      acceptTeamInvite,
      declineTeamInvite,
      removeTeammate,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** What to call the member: their name once we have one, otherwise their email. */
export function displayName(session) {
  return session?.name?.trim() || session?.email || '';
}
