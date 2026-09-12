import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle } from '@phosphor-icons/react';
import { useAuth } from '../lib/AuthContext';
import { passwordStrength, validatePassword } from '../lib/authStore';
import { Button, Field, PasswordInput, StatusMessage } from '../components/ui';
import AuthCard from '../components/AuthCard';

/**
 * Where the reset email's link lands. Like Verify, nothing is spent until the member
 * submits, so a mail scanner opening the link first does no harm.
 */
export default function ResetPassword() {
  const [params] = useSearchParams();
  const tokenHash = params.get('token_hash') ?? '';

  const { resetPassword } = useAuth();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const strength = useMemo(() => passwordStrength(password), [password]);

  async function handleSubmit(event) {
    event.preventDefault();
    const found = {};
    const passError = validatePassword(password);
    if (passError) found.password = passError;
    if (!confirm) found.confirm = 'Re-enter your password.';
    else if (confirm !== password) found.confirm = 'Passwords do not match.';
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setLoading(true);
    setFormError('');
    try {
      await resetPassword({ tokenHash, password });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setFormError(err.message);
      setLoading(false);
    }
  }

  if (!tokenHash) {
    return (
      <AuthCard>
        <div className="auth__card-head">
          <h1 className="auth__title">That link is incomplete</h1>
          <p className="auth__subtitle">Open the link straight from the email, or ask for a new one.</p>
        </div>
        <p className="auth__switch">
          <Link to="/forgot-password">Send me a new link</Link>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <div className="auth__card-head">
        <h1 className="auth__title">Choose a new password</h1>
        <p className="auth__subtitle">
          This signs you out everywhere else, in case someone else had your old one.
        </p>
      </div>

      {formError && <StatusMessage tone="error">{formError}</StatusMessage>}

      <form className="auth__form" onSubmit={handleSubmit} noValidate>
        <div>
          <Field
            label="New password"
            htmlFor="new-password"
            required
            error={errors.password}
            helper="At least 8 characters, with a letter and a number."
          >
            {({ errorId, helperId }) => (
              <PasswordInput
                id="new-password"
                name="new-password"
                autoComplete="new-password"
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
                    className={`strength__bar ${i < strength.score ? `is-on is-lvl-${strength.score}` : ''}`}
                  />
                ))}
              </div>
              <span className="strength__label">{strength.label}</span>
            </div>
          )}
        </div>

        <Field label="Confirm new password" htmlFor="confirm-password" required error={errors.confirm}>
          {({ errorId }) => (
            <PasswordInput
              id="confirm-password"
              name="confirm-password"
              autoComplete="new-password"
              value={confirm}
              invalid={Boolean(errors.confirm)}
              aria-describedby={errors.confirm ? errorId : undefined}
              onChange={(e) => {
                setConfirm(e.target.value);
                if (errors.confirm) setErrors((p) => ({ ...p, confirm: null }));
              }}
            />
          )}
        </Field>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          icon={CheckCircle}
          loading={loading}
          className="auth__submit"
        >
          Save new password
        </Button>
      </form>

      {formError && (
        <p className="auth__switch">
          <Link to="/forgot-password">Send me a new link</Link>
        </p>
      )}
    </AuthCard>
  );
}
