import { useState, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, CheckCircle, Sparkle } from '@phosphor-icons/react';
import { useAuth } from '../lib/AuthContext';
import {
  validateUsername,
  validatePassword,
  passwordStrength,
} from '../lib/authStore';
import {
  GlassCard,
  Button,
  Field,
  TextInput,
  PasswordInput,
  StatusMessage,
} from '../components/ui';
import './Auth.css';

export default function Signup() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const usernameRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmRef = useRef(null);

  const { signUp } = useAuth();
  const navigate = useNavigate();

  const strength = useMemo(() => passwordStrength(password), [password]);

  function validate() {
    const next = {};
    const nameError = validateUsername(username);
    if (nameError) next.username = nameError;
    const passError = validatePassword(password);
    if (passError) next.password = passError;
    if (!confirm) next.confirm = 'Re-enter your password.';
    else if (confirm !== password) next.confirm = 'Passwords do not match.';
    return next;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');

    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      if (found.username) usernameRef.current?.focus();
      else if (found.password) passwordRef.current?.focus();
      else confirmRef.current?.focus();
      return;
    }

    setLoading(true);
    try {
      await signUp({ username, password });
      // New members land on the resume step, which is the point of the account
      navigate('/dashboard', { replace: true, state: { welcome: true } });
    } catch (error) {
      setFormError(error.message);
      usernameRef.current?.focus();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth on-dark">
      <div className="auth__orb auth__orb--a" aria-hidden="true" />
      <div className="auth__orb auth__orb--b" aria-hidden="true" />

      <div className="auth__grid">
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
            <span className="auth__eyebrow">
              <Sparkle size={14} weight="fill" aria-hidden="true" />
              Applications open
            </span>
            <h1 className="auth__aside-title">
              Start building your <span>track record</span>
            </h1>
            <p className="auth__aside-text">
              One account gets you into every challenge, onto the leaderboard, and in
              front of partner recruiters.
            </p>

            <ol className="auth__steps">
              {[
                { n: '1', text: 'Create your account' },
                { n: '2', text: 'Upload your resume for recruiters' },
                { n: '3', text: 'Submit your League application' },
              ].map((step, i) => (
                <li key={step.n} className={i === 0 ? 'is-current' : ''}>
                  <span className="auth__step-num">{step.n}</span>
                  <span>{step.text}</span>
                </li>
              ))}
            </ol>
          </div>
        </motion.aside>

        <motion.main
          className="auth__main"
          id="main"
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
          <GlassCard title="New account — register.exe" className="auth__card">
            <div className="auth__card-head">
              <h2 className="auth__title">Create your account</h2>
              <p className="auth__subtitle">
                Takes about a minute. You can upload your resume right after.
              </p>
            </div>

            {formError && <StatusMessage tone="error">{formError}</StatusMessage>}

            <form className="auth__form" onSubmit={handleSubmit} noValidate>
              <Field
                label="Username"
                htmlFor="username"
                required
                error={errors.username}
                helper="3–24 characters. Letters, numbers, underscores, and periods."
              >
                {({ errorId, helperId }) => (
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
                    aria-describedby={errors.username ? errorId : helperId}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (errors.username) setErrors((p) => ({ ...p, username: null }));
                    }}
                    onBlur={() => {
                      const err = validateUsername(username);
                      if (err && username) setErrors((p) => ({ ...p, username: err }));
                    }}
                  />
                )}
              </Field>

              <div>
                <Field
                  label="Password"
                  htmlFor="new-password"
                  required
                  error={errors.password}
                  helper="At least 8 characters, with a letter and a number."
                >
                  {({ errorId, helperId }) => (
                    <PasswordInput
                      ref={passwordRef}
                      id="new-password"
                      name="new-password"
                      autoComplete="new-password"
                      placeholder="Create a password"
                      value={password}
                      invalid={Boolean(errors.password)}
                      aria-describedby={errors.password ? errorId : helperId}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errors.password) setErrors((p) => ({ ...p, password: null }));
                      }}
                    />
                  )}
                </Field>

                {password && (
                  <div className="strength" aria-live="polite">
                    <div className="strength__bars">
                      {[0, 1, 2, 3].map((i) => (
                        <span
                          key={i}
                          className={`strength__bar ${
                            i < strength.score ? `is-on is-lvl-${strength.score}` : ''
                          }`}
                        />
                      ))}
                    </div>
                    <span className="strength__label">{strength.label}</span>
                  </div>
                )}
              </div>

              <Field
                label="Confirm password"
                htmlFor="confirm-password"
                required
                error={errors.confirm}
              >
                {({ errorId }) => (
                  <PasswordInput
                    ref={confirmRef}
                    id="confirm-password"
                    name="confirm-password"
                    autoComplete="new-password"
                    placeholder="Re-enter your password"
                    value={confirm}
                    invalid={Boolean(errors.confirm)}
                    aria-describedby={errors.confirm ? errorId : undefined}
                    onChange={(e) => {
                      setConfirm(e.target.value);
                      if (errors.confirm) setErrors((p) => ({ ...p, confirm: null }));
                    }}
                    onBlur={() => {
                      if (confirm && confirm !== password) {
                        setErrors((p) => ({ ...p, confirm: 'Passwords do not match.' }));
                      }
                    }}
                  />
                )}
              </Field>

              {confirm && confirm === password && !errors.confirm && (
                <p className="auth__match">
                  <CheckCircle size={15} weight="fill" aria-hidden="true" />
                  Passwords match
                </p>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                iconRight={ArrowRight}
                className="auth__submit"
              >
                {loading ? 'Creating your account' : 'Create account'}
              </Button>
            </form>

            <p className="auth__switch">
              Already a member? <Link to="/login">Log in</Link>
            </p>
          </GlassCard>
        </motion.main>
      </div>
    </div>
  );
}
