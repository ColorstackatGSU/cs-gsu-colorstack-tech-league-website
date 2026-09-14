import { useEffect, useState } from 'react';
import { CheckCircle, EnvelopeSimple, PaperPlaneTilt } from '@phosphor-icons/react';
import { useAuth } from '../lib/AuthContext';
import { onEmailConfirmed } from '../lib/authStore';
import { Button } from './ui';
import './journey.css';

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_COOLDOWN = 30;
// Stop polling eventually: a tab left open all night should not ask the server forever.
const POLL_EVERY_MS = 5000;
const POLL_FOR_MS = 15 * 60 * 1000;

/**
 * Confirms the personal email on an application, in place.
 *
 * Three states the member can see at a glance: not confirmed (with the one button that
 * fixes it), link sent (waiting, and this updates by itself the moment they open the link,
 * on this device or another), and confirmed.
 */
export default function PersonalEmailConfirm({ email, compact = false, editable = true }) {
  const { profile, sendPersonalEmailLink, refresh } = useAuth();
  const address = (email ?? '').trim().toLowerCase();
  const onFile = (profile?.application?.personalEmail ?? '').toLowerCase();
  const confirmed = Boolean(profile?.personalEmailVerified) && onFile === address;

  const [sentTo, setSentTo] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const waiting = !confirmed && sentTo === address && address !== '';

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // While waiting, notice the confirmation without a manual refresh: instantly if it was
  // opened in another tab of this browser, within a few seconds if on another device.
  useEffect(() => {
    if (!waiting) return undefined;
    const stop = onEmailConfirmed((kind) => kind === 'personal' && refresh());
    const started = Date.now();
    const timer = setInterval(() => {
      if (Date.now() - started > POLL_FOR_MS) clearInterval(timer);
      else if (document.visibilityState === 'visible') refresh();
    }, POLL_EVERY_MS);
    return () => {
      stop();
      clearInterval(timer);
    };
  }, [waiting, refresh]);

  if (!EMAIL_SHAPE.test(address)) return null;

  async function send() {
    setSending(true);
    setError('');
    try {
      await sendPersonalEmailLink(address);
      setSentTo(address);
      setCooldown(RESEND_COOLDOWN);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  if (confirmed) {
    return (
      <div className={`email-confirm is-confirmed ${compact ? 'is-compact' : ''}`} role="status">
        <CheckCircle size={20} weight="fill" aria-hidden="true" />
        <p className="email-confirm__text">
          <strong>Confirmed.</strong> Your decision will be emailed to{' '}
          <span className="wrap-anywhere">{address}</span>.
        </p>
      </div>
    );
  }

  return (
    <div className={`email-confirm ${waiting ? 'is-waiting' : 'is-pending'} ${compact ? 'is-compact' : ''}`}>
      <div className="email-confirm__row">
        {waiting ? (
          <span className="email-confirm__pulse" aria-hidden="true" />
        ) : (
          <EnvelopeSimple size={20} weight="duotone" aria-hidden="true" />
        )}
        <p className="email-confirm__text" aria-live="polite">
          {waiting ? (
            <>
              <strong>Link sent to <span className="wrap-anywhere">{address}</span>.</strong>{' '}
              Open it on any device. This updates by itself as soon as you do.
            </>
          ) : (
            <>
              <strong>Not confirmed yet.</strong> We email your decision here, so make sure it
              reaches you.
            </>
          )}
        </p>
      </div>

      {error && (
        <p className="email-confirm__error" role="alert">
          {error}
        </p>
      )}

      <div className="email-confirm__actions">
        <Button
          variant={waiting ? 'ghost' : 'secondary'}
          size="sm"
          icon={PaperPlaneTilt}
          loading={sending}
          disabled={cooldown > 0}
          onClick={send}
        >
          {waiting
            ? cooldown > 0
              ? `Send again in ${cooldown}s`
              : 'Send it again'
            : 'Send confirmation link'}
        </Button>
        {waiting && (
          <span className="email-confirm__hint">
            Check your spam folder too.{editable ? " Wrong address? Edit it and send again." : ""}
          </span>
        )}
      </div>
    </div>
  );
}
