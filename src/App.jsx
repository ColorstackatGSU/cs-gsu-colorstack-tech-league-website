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
import Admin from './pages/Admin';
import { startAppDoodles } from './doodles/app-doodles.js';
import './doodles/app-doodles.css';

/** Sends signed-out visitors to login, remembering where they were headed. */
function RequireAuth({ children }) {
  const { isAuthed } = useAuth();
  const location = useLocation();

  if (!isAuthed) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}

/** Signed-in users have no reason to see login/signup. */
function RedirectIfAuthed({ children }) {
  const { isAuthed } = useAuth();
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
          <Navbar />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/scoring" element={<Scoring />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
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
              path="/admin"
              element={
                <RequireAuth>
                  <Admin />
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
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </SmoothScroll>
      </AuthProvider>
    </BrowserRouter>
  );
}
