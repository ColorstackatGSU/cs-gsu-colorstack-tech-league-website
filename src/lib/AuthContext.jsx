import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import * as store from './authStore';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => store.getSession());
  const [profile, setProfile] = useState(() => {
    const s = store.getSession();
    return s ? store.getProfile(s.userId) : null;
  });

  // Keep tabs in sync: signing out in one tab signs out the others.
  useEffect(() => {
    function onStorage(event) {
      if (event.key === 'cstl.session') {
        const next = store.getSession();
        setSession(next);
        setProfile(next ? store.getProfile(next.userId) : null);
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const signIn = useCallback(async (credentials) => {
    const next = await store.signIn(credentials);
    setSession(next);
    setProfile(store.getProfile(next.userId));
    return next;
  }, []);

  const signUp = useCallback(async (credentials) => {
    const next = await store.signUp(credentials);
    setSession(next);
    setProfile(store.getProfile(next.userId));
    return next;
  }, []);

  const signOut = useCallback(() => {
    store.signOut();
    setSession(null);
    setProfile(null);
  }, []);

  const updateProfile = useCallback(
    (patch) => {
      if (!session) return null;
      const next = store.saveProfile(session.userId, patch);
      setProfile(next);
      return next;
    },
    [session]
  );

  const uploadResume = useCallback(
    (file) => {
      if (!session) return null;
      const next = store.saveResume(session.userId, file);
      setProfile(next);
      return next;
    },
    [session]
  );

  const deleteResume = useCallback(() => {
    if (!session) return null;
    const next = store.removeResume(session.userId);
    setProfile(next);
    return next;
  }, [session]);

  const submitApplication = useCallback(
    (application) => {
      if (!session) return null;
      const next = store.saveApplication(session.userId, application);
      setProfile(next);
      return next;
    },
    [session]
  );

  const saveDraft = useCallback(
    (application) => {
      if (!session) return null;
      const next = store.saveApplicationDraft(session.userId, application);
      setProfile(next);
      return next;
    },
    [session]
  );

  /* ---------- team ----------
     addTeammate throws when the roster is full or the person is already on,
     so callers surface the message rather than failing silently. */

  const addTeammate = useCallback(
    (member) => {
      if (!session) return null;
      const next = store.addTeammate(session.userId, member);
      setProfile(next);
      return next;
    },
    [session]
  );

  const removeTeammate = useCallback(
    (memberId) => {
      if (!session) return null;
      const next = store.removeTeammate(session.userId, memberId);
      setProfile(next);
      return next;
    },
    [session]
  );

  const renameTeam = useCallback(
    (name) => {
      if (!session) return null;
      const next = store.renameTeam(session.userId, name);
      setProfile(next);
      return next;
    },
    [session]
  );

  const value = useMemo(
    () => ({
      session,
      profile,
      isAuthed: Boolean(session),
      signIn,
      signUp,
      signOut,
      updateProfile,
      uploadResume,
      deleteResume,
      submitApplication,
      saveDraft,
      addTeammate,
      removeTeammate,
      renameTeam,
    }),
    [
      session,
      profile,
      signIn,
      signUp,
      signOut,
      updateProfile,
      uploadResume,
      deleteResume,
      submitApplication,
      saveDraft,
      addTeammate,
      removeTeammate,
      renameTeam,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
