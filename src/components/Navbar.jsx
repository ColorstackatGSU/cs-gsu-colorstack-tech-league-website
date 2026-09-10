import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { List, X, SignOut, UserCircle } from '@phosphor-icons/react';
import { useAuth } from '../lib/AuthContext';
import { Button } from './ui';
import './Navbar.css';

const PUBLIC_LINKS = [
  { to: '/#about', label: 'About' },
  { to: '/#challenges', label: 'Challenges' },
  { to: '/#scoring', label: 'Scoring' },
  { to: '/#timeline', label: 'Timeline' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { isAuthed, session, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Nav gains a solid glass backing once you leave the hero
  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 24);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the mobile menu on navigation
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.hash]);

  // Lock body scroll and allow Escape to close while the menu is open
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKey(e) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    window.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  function handleSignOut() {
    signOut();
    navigate('/');
  }

  const onLanding = location.pathname === '/';

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>

      <header className={`nav ${scrolled ? 'nav--scrolled' : ''}`}>
        <div className="nav__inner container">
          <Link to="/" className="nav__brand" aria-label="ColorStack Tech League, home">
            <span className="nav__logo" aria-hidden="true">
              <img
                src="/colorstack-gsu-logo.png"
                alt=""
                width="30"
                height="30"
                decoding="async"
              />
            </span>
            <span className="nav__brand-text">
              <strong>ColorStack</strong>
              <span>Tech League</span>
            </span>
          </Link>

          <nav className="nav__links" aria-label="Main">
            {onLanding &&
              PUBLIC_LINKS.map((link) => (
                <a key={link.to} href={link.to} className="nav__link">
                  {link.label}
                </a>
              ))}
            {isAuthed && (
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  `nav__link ${isActive ? 'nav__link--active' : ''}`
                }
              >
                Dashboard
              </NavLink>
            )}
          </nav>

          <div className="nav__actions">
            {isAuthed ? (
              <>
                <Link to="/dashboard" className="nav__user">
                  <UserCircle size={20} weight="fill" aria-hidden="true" />
                  <span className="wrap-anywhere">{session.username}</span>
                </Link>
                <Button variant="ghost" size="sm" icon={SignOut} onClick={handleSignOut}>
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <Link to="/login" className="nav__link nav__link--tight">
                  Log in
                </Link>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/signup')}
                >
                  Apply now
                </Button>
              </>
            )}
          </div>

          <button
            className="nav__burger"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
          >
            {menuOpen ? (
              <X size={24} weight="bold" aria-hidden="true" />
            ) : (
              <List size={24} weight="bold" aria-hidden="true" />
            )}
          </button>
        </div>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            id="mobile-menu"
            className="mobile-menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.nav
              className="mobile-menu__panel"
              aria-label="Mobile"
              initial={{ y: -18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -12, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              {onLanding &&
                PUBLIC_LINKS.map((link) => (
                  <a key={link.to} href={link.to} className="mobile-menu__link">
                    {link.label}
                  </a>
                ))}

              {isAuthed ? (
                <>
                  <Link to="/dashboard" className="mobile-menu__link">
                    Dashboard
                  </Link>
                  <Link to="/apply" className="mobile-menu__link">
                    Application
                  </Link>
                  <button className="mobile-menu__link" onClick={handleSignOut}>
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="mobile-menu__link">
                    Log in
                  </Link>
                  <Link to="/signup" className="mobile-menu__link mobile-menu__link--cta">
                    Apply now
                  </Link>
                </>
              )}
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
