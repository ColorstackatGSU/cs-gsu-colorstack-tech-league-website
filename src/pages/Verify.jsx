import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, EnvelopeOpen, WarningCircle } from '@phosphor-icons/react';
import { useAuth } from '../lib/AuthContext';
import { Button, StatusMessage } from '../components/ui';
import AuthCard from '../components/AuthCard';

/**
 * Where the confirmation email's link lands.
 *
 * The member presses a button to confirm rather than the page confirming on load. GSU
 * mail runs through Microsoft 365, whose link scanner opens every URL in an email before
 * the student does. A page that spent the one-time token on load would be spent by the
 * scanner, and the student would click a link that was already dead.
 */
export default function Verify() {
  const [params] = useSearchParams();
  const tokenHash = params.get('token_hash') ?? '';
  const type = params.get('type') === 'magiclink' ? 'magiclink' : 'signup';

  const { verifyEmail } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function confirm() {
    setLoading(true);
    setError('');
    try {
      await verifyEmail({ tokenHash, type });
      navigate('/dashboard', { replace: true, state: { welcome: true } });
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  if (!tokenHash) {
    return (
      <AuthCard>
        <div className="auth__sent">
          <span className="auth__sent-icon" aria-hidden="true">
            <WarningCircle size={34} weight="duotone" />
          </span>
          <h1 className="auth__title">That link is incomplete</h1>
          <p className="auth__subtitle">
            Open the link straight from the email, or log in and we can send you a new one.
          </p>
          <p className="auth__switch">
            <Link to="/login">Go to log in</Link>
          </p>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <div className="auth__sent">
        <span className="auth__sent-icon" aria-hidden="true">
          <EnvelopeOpen size={34} weight="duotone" />
        </span>
        <h1 className="auth__title">Confirm your email</h1>
        <p className="auth__subtitle">
          One click and your Tech League account is ready. You will land on your dashboard,
          signed in.
        </p>

        {error && <StatusMessage tone="error">{error}</StatusMessage>}

        <Button
          variant="primary"
          size="lg"
          icon={CheckCircle}
          loading={loading}
          onClick={confirm}
          className="auth__submit"
        >
          {loading ? 'Confirming' : 'Confirm my email'}
        </Button>

        {error && (
          <p className="auth__switch">
            <Link to="/login">Go to log in</Link> to get a fresh link.
          </p>
        )}
      </div>
    </AuthCard>
  );
}
