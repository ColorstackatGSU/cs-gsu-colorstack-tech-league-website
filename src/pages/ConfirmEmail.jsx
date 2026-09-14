import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, EnvelopeOpen, WarningCircle } from '@phosphor-icons/react';
import { useAuth } from '../lib/AuthContext';
import { announceEmailConfirmed, confirmPersonalEmail } from '../lib/authStore';
import { Button, StatusMessage } from '../components/ui';
import AuthCard from '../components/AuthCard';

/**
 * Where the personal-email confirmation link lands. Often opened on a phone that is signed
 * in nowhere, so it works without a session.
 *
 * A button rather than confirming on load, for the same reason as /verify: mail scanners
 * open every link before the person does.
 */
export default function ConfirmEmail() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const { isAuthed, refresh } = useAuth();

  const [state, setState] = useState({ loading: false, error: '', email: '' });

  async function confirm() {
    setState({ loading: true, error: '', email: '' });
    try {
      const result = await confirmPersonalEmail(token);
      announceEmailConfirmed('personal');
      if (isAuthed) refresh();
      setState({ loading: false, error: '', email: result.email });
    } catch (err) {
      setState({ loading: false, error: err.message, email: '' });
    }
  }

  if (!token) {
    return (
      <AuthCard>
        <div className="auth__sent">
          <span className="auth__sent-icon" aria-hidden="true">
            <WarningCircle size={34} weight="duotone" />
          </span>
          <h1 className="auth__title">That link is incomplete</h1>
          <p className="auth__subtitle">
            Open the link straight from the email, or send a new one from your application.
          </p>
          <p className="auth__switch">
            <Link to="/apply">Go to my application</Link>
          </p>
        </div>
      </AuthCard>
    );
  }

  if (state.email) {
    return (
      <AuthCard>
        <div className="auth__sent" aria-live="polite">
          <span className="auth__sent-icon auth__sent-icon--success" aria-hidden="true">
            <CheckCircle size={34} weight="duotone" />
          </span>
          <h1 className="auth__title">Email confirmed</h1>
          <p className="auth__subtitle">
            We will send your Tech League decision to{' '}
            <strong className="wrap-anywhere">{state.email}</strong>. If your application is open
            in another tab, it has already updated.
          </p>
          <Link to={isAuthed ? '/apply' : '/login'}>
            <Button variant="primary" size="md">
              {isAuthed ? 'Back to my application' : 'Log in to continue'}
            </Button>
          </Link>
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
        <h1 className="auth__title">Confirm your personal email</h1>
        <p className="auth__subtitle">
          This is where we will email your Tech League decision. One click and you are done.
        </p>

        {state.error && <StatusMessage tone="error">{state.error}</StatusMessage>}

        <Button
          variant="primary"
          size="lg"
          icon={CheckCircle}
          loading={state.loading}
          onClick={confirm}
          className="auth__submit"
        >
          {state.loading ? 'Confirming' : 'Confirm this email'}
        </Button>

        {state.error && (
          <p className="auth__switch">
            <Link to="/apply">Go to my application</Link> to send a new link.
          </p>
        )}
      </div>
    </AuthCard>
  );
}
