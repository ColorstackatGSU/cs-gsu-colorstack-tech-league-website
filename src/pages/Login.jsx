import { useState, useRef } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, Trophy, Users, ChartLineUp } from '@phosphor-icons/react';
import { useAuth } from '../lib/AuthContext';
import { resendVerification } from '../lib/authStore';
import ColorStackButton from '../components/ColorStackButton';
import {
  GlassCard,
  Button,
  Field,
  TextInput,
  PasswordInput,
  StatusMessage,
} from '../components/ui';
import './Auth.css';

/** Why the ColorStack login bounced back here, in words. Keyed by ?colorstack=. */
const COLORSTACK_MESSAGES = {
  cancelled: 'You cancelled Sign in with ColorStack. You can use your email and password instead.',
  expired: 'That sign-in took too long or was started in another tab. Try again.',
  not_student:
    'Your ColorStack profile does not have a verified @student.gsu.edu address, so we could not sign you in with it. Create an account with your student email instead.',
  unavailable: 'Sign in with ColorStack is not available right now. Use your email and password instead.',
  error: 'Something went wrong signing in with ColorStack. Try again, or use your email and password.',
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [resend, setResend] = useState({ loading: false, message: '' });

  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  const { signIn, signOutReason } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const colorstackMessage = COLORSTACK_MESSAGES[params.get('colorstack')] ?? '';

  // Send the user back where they were headed before the login redirect
  const from = location.state?.from ?? '/dashboard';

  function validate() {
    const next = {};
    if (!email.trim()) next.email = 'Enter your student email.';
    if (!password) next.password = 'Enter your password.';
    return next;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');
    setUnconfirmed(false);
    setResend({ loading: false, message: '' });

    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      // Move focus to the first field that needs attention
      if (found.email) emailRef.current?.focus();
      else passwordRef.current?.focus();
      return;
    }

    setLoading(true);
    try {
      await signIn({ email, password });
      navigate(from, { replace: true });
    } catch (error) {
      setFormError(error.message);
      setUnconfirmed(error.code === 'email_not_confirmed');
      passwordRef.current?.focus();
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResend({ loading: true, message: '' });
    try {
      await resendVerification(email);
      setResend({
        loading: false,
        message: `If ${email.trim()} has an unconfirmed account, a new link is on its way.`,
      });
    } catch (error) {
      setResend({ loading: false, message: error.message });
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
          <GlassCard className="auth__card">
            <div className="auth__card-head">
              <h2 className="auth__title">Log in</h2>
              <p className="auth__subtitle">
                Use the student email and password you signed up with.
              </p>
            </div>

            {colorstackMessage && !formError && (
              <StatusMessage tone="error">{colorstackMessage}</StatusMessage>
            )}
            {formError && <StatusMessage tone="error">{formError}</StatusMessage>}
            {!formError && signOutReason === 'email_not_confirmed' && (
              <StatusMessage tone="error">
                Your email has not been confirmed yet. Log in and we can send you a new link.
              </StatusMessage>
            )}
            {unconfirmed && (
              <div className="auth__resend">
                <Button variant="glass" size="sm" loading={resend.loading} onClick={handleResend}>
                  Send a new confirmation link
                </Button>
                {resend.message && <StatusMessage tone="success">{resend.message}</StatusMessage>}
              </div>
            )}

            <form className="auth__form" onSubmit={handleSubmit} noValidate>
              <Field
                label="Student email"
                htmlFor="email"
                required
                error={errors.email}
              >
                {({ errorId }) => (
                  <TextInput
                    ref={emailRef}
                    id="email"
                    name="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck="false"
                    placeholder="jrivera1@student.gsu.edu"
                    value={email}
                    invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? errorId : undefined}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors((p) => ({ ...p, email: null }));
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

              <p className="auth__forgot">
                <Link to="/forgot-password">Forgot your password?</Link>
              </p>
            </form>

            <ColorStackButton />

            <p className="auth__switch">
              New to the League? <Link to="/signup">Create an account</Link>
            </p>
          </GlassCard>
        </motion.main>
      </div>
    </div>
  );
}
