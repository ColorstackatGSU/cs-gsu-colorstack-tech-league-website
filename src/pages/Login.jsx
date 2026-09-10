import { useState, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, Trophy, Users, ChartLineUp } from '@phosphor-icons/react';
import { useAuth } from '../lib/AuthContext';
import {
  GlassCard,
  Button,
  Field,
  TextInput,
  PasswordInput,
  StatusMessage,
} from '../components/ui';
import './Auth.css';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const usernameRef = useRef(null);
  const passwordRef = useRef(null);

  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Send the user back where they were headed before the login redirect
  const from = location.state?.from ?? '/dashboard';

  function validate() {
    const next = {};
    if (!username.trim()) next.username = 'Enter your username.';
    if (!password) next.password = 'Enter your password.';
    return next;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');

    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      // Move focus to the first field that needs attention
      if (found.username) usernameRef.current?.focus();
      else passwordRef.current?.focus();
      return;
    }

    setLoading(true);
    try {
      await signIn({ username, password });
      navigate(from, { replace: true });
    } catch (error) {
      setFormError(error.message);
      passwordRef.current?.focus();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth on-dark">
      <div className="auth__orb auth__orb--a" aria-hidden="true" />
      <div className="auth__orb auth__orb--b" aria-hidden="true" />

      <div className="auth__grid">
        {/* ---------- Left: context panel ---------- */}
        <motion.aside
          className="auth__aside"
          initial={{ opacity: 0, x: -22 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <Link to="/" className="auth__back">
            <ArrowLeft size={16} weight="bold" aria-hidden="true" />
            Back to home
          </Link>

          <div className="auth__aside-body">
            <h1 className="auth__aside-title">
              Welcome back to the <span>League</span>
            </h1>
            <p className="auth__aside-text">
              Pick up where you left off. Check your standing, update your resume, or
              finish your application.
            </p>

            <ul className="auth__perks">
              {[
                { icon: ChartLineUp, text: 'Track your points across all five challenges' },
                { icon: Trophy, text: 'See where you land on the live leaderboard' },
                { icon: Users, text: 'Stay visible to partner recruiters' },
              ].map((perk) => (
                <li key={perk.text}>
                  <span className="auth__perk-icon" aria-hidden="true">
                    <perk.icon size={19} weight="duotone" />
                  </span>
                  <span>{perk.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </motion.aside>

        {/* ---------- Right: the form ---------- */}
        <motion.main
          className="auth__main"
          id="main"
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
          <GlassCard title="Log in - TechLeague.exe" className="auth__card">
            <div className="auth__card-head">
              <h2 className="auth__title">Log in</h2>
              <p className="auth__subtitle">
                Enter your username and password to continue.
              </p>
            </div>

            {formError && <StatusMessage tone="error">{formError}</StatusMessage>}

            <form className="auth__form" onSubmit={handleSubmit} noValidate>
              <Field
                label="Username"
                htmlFor="username"
                required
                error={errors.username}
              >
                {({ errorId }) => (
                  <TextInput
                    ref={usernameRef}
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck="false"
                    placeholder="your.username"
                    value={username}
                    invalid={Boolean(errors.username)}
                    aria-describedby={errors.username ? errorId : undefined}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (errors.username) setErrors((p) => ({ ...p, username: null }));
                    }}
                  />
                )}
              </Field>

              <Field
                label="Password"
                htmlFor="password"
                required
                error={errors.password}
              >
                {({ errorId }) => (
                  <PasswordInput
                    ref={passwordRef}
                    id="password"
                    name="password"
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    invalid={Boolean(errors.password)}
                    aria-describedby={errors.password ? errorId : undefined}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors((p) => ({ ...p, password: null }));
                    }}
                  />
                )}
              </Field>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                iconRight={ArrowRight}
                className="auth__submit"
              >
                {loading ? 'Signing you in' : 'Log in'}
              </Button>
            </form>

            <p className="auth__switch">
              New to the League? <Link to="/signup">Create an account</Link>
            </p>
          </GlassCard>
        </motion.main>
      </div>
    </div>
  );
}
