import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, EnvelopeSimple } from '@phosphor-icons/react';
import { requestPasswordReset } from '../lib/authStore';
import { Button, Field, TextInput } from '../components/ui';
import AuthCard from '../components/AuthCard';

/**
 * Asks for a reset link. The answer is the same whether or not the address has an
 * account, so this page cannot be used to find out which students have signed up.
 */
export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!email.trim()) {
      setError('Enter your student email.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard>
      {sent ? (
        <div className="auth__sent" aria-live="polite">
          <span className="auth__sent-icon" aria-hidden="true">
            <EnvelopeSimple size={34} weight="duotone" />
          </span>
          <h1 className="auth__title">Check your inbox</h1>
          <p className="auth__subtitle">
            If <strong className="wrap-anywhere">{email.trim()}</strong> has a Tech League
            account, a link to choose a new password is on its way. It expires in an hour.
          </p>
          <p className="auth__switch">
            <Link to="/login">Back to log in</Link>
          </p>
        </div>
      ) : (
        <>
          <div className="auth__card-head">
            <h1 className="auth__title">Forgot your password?</h1>
            <p className="auth__subtitle">
              Enter your student email and we will send you a link to choose a new one.
            </p>
          </div>

          <form className="auth__form" onSubmit={handleSubmit} noValidate>
            <Field label="Student email" htmlFor="email" required error={error}>
              {({ errorId }) => (
                <TextInput
                  id="email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck="false"
                  placeholder="jrivera1@student.gsu.edu"
                  value={email}
                  invalid={Boolean(error)}
                  aria-describedby={error ? errorId : undefined}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
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
              Send reset link
            </Button>
          </form>

          <p className="auth__switch">
            Remembered it? <Link to="/login">Log in</Link>
          </p>
        </>
      )}
    </AuthCard>
  );
}
