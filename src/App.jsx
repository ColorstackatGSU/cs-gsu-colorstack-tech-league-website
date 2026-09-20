import { useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext';
import Navbar from './components/Navbar';
import SmoothScroll, { useSmoothScroll } from './components/SmoothScroll';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Apply from './pages/Apply';
import Scoring from './pages/Scoring';
import Leaderboard from './pages/Leaderboard';
import Verify from './pages/Verify';
import ConfirmEmail from './pages/ConfirmEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Teams from './pages/Teams';
import Admin from './pages/Admin';
import { startAppDoodles } from './doodles/app-doodles.js';
import './doodles/app-doodles.css';

/**
 * Shown while the first session check is in flight, and when it could not reach the
 * server. Deciding "signed out" before the server has answered would bounce every
 * signed-in member to the login page on every refresh.
 */
function SessionPending() {
  const { status, loadError, refresh } = useAuth();
  return (
    <div className="session-pending on-dark" aria-live="polite">
      {status === 'loading' ? (
        <p>Loading your account&hellip;</p>
      ) : (
        <>
          <p>{loadError}</p>
          <button type="button" className="btn btn--glass btn--md" onClick={refresh}>
            <span>Try again</span>
          </button>
        </>
      )}
    </div>
  );
}

/** Sends signed-out visitors to login, remembering where they were headed. */
function RequireAuth({ children }) {
  const { status, loadError, isAuthed } = useAuth();
  const location = useLocation();

  if (status === 'loading' || (!isAuthed && loadError)) return <SessionPending />;
  if (!isAuthed) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}

/** /admin for admins. The API refuses everyone else regardless; this just says so first. */
function RequireAdmin({ children }) {
  const { isAdmin } = useAuth();
  return <RequireAuth>{isAdmin ? children : <Navigate to="/dashboard" replace />}</RequireAuth>;
}

/** Signed-in users have no reason to see login/signup. */
function RedirectIfAuthed({ children }) {
  const { status, isAuthed } = useAuth();
  if (status === 'loading') return <SessionPending />;
  if (isAuthed) return <Navigate to="/dashboard" replace />;
  return children;
}

/**
 * Scroll handling on navigation: jump to top on a new page, but honor
 * in-page #anchors so the landing nav links still work.
 */
function ScrollManager() {
  const { pathname, hash } = useLocation();
  const { scrollTo } = useSmoothScroll();

  useEffect(() => {
    // Routed through the smooth-scroll API rather than window.scrollTo so
    // Lenis stays the single owner of scroll position. Calling the native
    // method directly would move the page out from under Lenis, which then
    // eases back from where it thought it was and reads as a snap-back.
    if (hash) {
      const el = document.querySelector(hash);
      if (el) {
        scrollTo(el);
        return;
      }
    }
    scrollTo(0, { immediate: true });
  }, [pathname, hash, scrollTo]);

  return null;
}

export default function App() {
  // Decorative doodles for the dashboard and application. Returns its own cleanup.
  useEffect(() => startAppDoodles(), []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <SmoothScroll>
          <ScrollManager />
          <a className="skip-link" href="#main">
            Skip to content
          </a>
          <Navbar />
          {/* The app's one <main> landmark, and the skip link's target. Pages
              render their own content inside it and no longer carry an
              `id="main"` of their own, which used to mean either no landmark
              at all or two elements answering to the same id. */}
          <main id="main">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/scoring" element={<Scoring />} />
            <Route
              path="/leaderboard"
              element={
                <RequireAuth>
                  <Leaderboard />
                </RequireAuth>
              }
            />
            <Route
              path="/login"
              element={
                <RedirectIfAuthed>
                  <Login />
                </RedirectIfAuthed>
              }
            />
            <Route
              path="/signup"
              element={
                <RedirectIfAuthed>
                  <Signup />
                </RedirectIfAuthed>
              }
            />
            <Route
              path="/dashboard"
              element={
                <RequireAuth>
                  <Dashboard />
                </RequireAuth>
              }
            />
            <Route
              path="/apply"
              element={
                <RequireAuth>
                  <Apply />
                </RequireAuth>
              }
            />
            <Route
              path="/teams"
              element={
                <RequireAuth>
                  <Teams />
                </RequireAuth>
              }
            />
            <Route
              path="/admin"
              element={
                <RequireAdmin>
                  <Admin />
                </RequireAdmin>
              }
            />
            {/* Reached from emailed links, so they work signed in or out. */}
            <Route path="/verify" element={<Verify />} />
            <Route path="/confirm-email" element={<ConfirmEmail />} />
            <Route
              path="/forgot-password"
              element={
                <RedirectIfAuthed>
                  <ForgotPassword />
                </RedirectIfAuthed>
              }
            />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </main>
        </SmoothScroll>
      </AuthProvider>
    </BrowserRouter>
  );
}
