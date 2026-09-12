import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CaretDown,
  Check,
  X,
  EnvelopeSimple,
  ArrowCounterClockwise,
  DownloadSimple,
  WarningCircle,
} from '@phosphor-icons/react';
import {
  adminResumeUrl,
  decideApplication,
  fetchAdminApplications,
  fetchAdminScores,
  reopenApplication,
  resendDecisionEmail,
  saveScore,
  TEAM_RULES,
} from '../lib/authStore';
import { GlassCard, Button, Badge, StatusMessage } from '../components/ui';
import { Reveal } from '../components/Motion';
import './Dashboard.css';
import './Teams.css';
import './Admin.css';

/* ============================================================
   Admin: reviewing applications and entering scores.

   Every action here is checked again by the API against the signed-in account, so this
   page being reachable is not what grants anything. It only exists to make the admin's
   work quick: decide an application and the email goes in the same click, enter a score
   and the leaderboard has it on the next load.
   ============================================================ */

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

const TEAM_PREF_LABELS = { team: 'Wants help finding a team', 'have-team': 'Has teammates in mind' };
const COMMITMENT_LABELS = { '1-2': '1-2 hours', '3-5': '3-5 hours', '6-8': '6-8 hours', '9+': '9+ hours' };

/* ---------- applications ---------- */

const FILTERS = [
  { key: 'review', label: 'To review', match: (a) => a.status === 'submitted' && !a.decision },
  { key: 'accepted', label: 'Accepted', match: (a) => a.decision === 'accepted' },
  { key: 'denied', label: 'Denied', match: (a) => a.decision === 'denied' },
  { key: 'drafts', label: 'Drafts', match: (a) => a.status === 'draft' },
  { key: 'all', label: 'All', match: () => true },
];

/**
 * One application, expandable to its full answers.
 *
 * The outcome of an action is reported to the list rather than shown in the row: deciding
 * an application usually moves it out of the current filter, and a message rendered inside
 * a row that just unmounted is a message nobody reads. That matters most when the email
 * failed to send.
 */
function ApplicationRow({ application, onChange }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');
  const a = application;
  const name = a.fullName || a.email;

  async function act(key, fn, done) {
    setBusy(key);
    setError('');
    try {
      const result = await fn();
      onChange(result.application, result.emailError
        ? { tone: 'error', message: `${name}: ${result.emailError}` }
        : { tone: 'success', message: done(result) });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  }

  const details = [
    ['Student email', a.email],
    ['Personal email', a.personalEmail],
    ['Race / ethnicity', a.raceEthnicity.join(', ')],
    ['Year', a.year],
    ['Major', a.major],
    ['Graduating', a.gradTerm],
    ['Interest', a.interest],
    ['Teammates', TEAM_PREF_LABELS[a.teamPref]],
    ['Time per week', COMMITMENT_LABELS[a.commitment]],
  ];

  return (
    <li className={`admin-app ${open ? 'is-open' : ''}`}>
      <button
        type="button"
        className="admin-app__summary"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="admin-app__who">
          <span className="admin-app__name wrap-anywhere">{a.fullName || 'No name yet'}</span>
          <span className="admin-app__email wrap-anywhere">{a.email}</span>
        </span>
        <span className="admin-app__badges">
          {a.status === 'draft' && <Badge tone="neutral">Draft</Badge>}
          {a.decision === 'accepted' && <Badge tone="success">Accepted</Badge>}
          {a.decision === 'denied' && <Badge tone="neutral">Denied</Badge>}
          {a.decision && !a.decisionEmailedAt && <Badge tone="accent">Not emailed</Badge>}
          {a.submittedAt && <span className="admin-app__date">{formatDate(a.submittedAt)}</span>}
        </span>
        <CaretDown size={18} weight="bold" className="admin-app__caret" aria-hidden="true" />
      </button>

      {open && (
        <div className="admin-app__detail">
          <dl className="admin-app__facts">
            {details.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd className="wrap-anywhere">{value || '—'}</dd>
              </div>
            ))}
          </dl>

          {[
            ['Why they want to join', a.whyJoin],
            ['What they want out of it', a.goals],
            ['Experience so far', a.experience],
          ].map(([label, value]) => (
            <div key={label} className="admin-app__answer">
              <h4>{label}</h4>
              <p className="wrap-anywhere">{value || '—'}</p>
            </div>
          ))}

          <div className="admin-app__actions">
            {a.resume ? (
              <a className="btn btn--glass btn--sm" href={adminResumeUrl(a.userId)}>
                <DownloadSimple size={17} weight="bold" aria-hidden="true" />
                <span>Resume</span>
              </a>
            ) : (
              <span className="admin-app__muted">No resume on file</span>
            )}

            {a.status === 'submitted' && a.decision !== 'accepted' && (
              <Button
                variant="primary"
                size="sm"
                icon={Check}
                loading={busy === 'accept'}
                onClick={() =>
                  act('accept', () => decideApplication(a.userId, 'accepted'), () => `Accepted ${name} and emailed them.`)
                }
              >
                Accept
              </Button>
            )}
            {a.status === 'submitted' && a.decision !== 'denied' && (
              <Button
                variant="danger"
                size="sm"
                icon={X}
                loading={busy === 'deny'}
                onClick={() =>
                  act('deny', () => decideApplication(a.userId, 'denied'), () => `Denied ${name} and emailed them.`)
                }
              >
                Deny
              </Button>
            )}
            {a.decision && !a.decisionEmailedAt && (
              <Button
                variant="glass"
                size="sm"
                icon={EnvelopeSimple}
                loading={busy === 'email'}
                onClick={() =>
                  act('email', () => resendDecisionEmail(a.userId), () => `Emailed ${name} their decision.`)
                }
              >
                Send decision email
              </Button>
            )}
            {a.status === 'submitted' && (
              <Button
                variant="ghost"
                size="sm"
                icon={ArrowCounterClockwise}
                loading={busy === 'reopen'}
                onClick={() =>
                  act('reopen', () => reopenApplication(a.userId), () => `Reopened ${name}'s application. It is a draft again.`)
                }
              >
                Reopen for edits
              </Button>
            )}
          </div>

          {a.decision === 'accepted' && (
            <p className="admin-app__muted">
              Changing an accepted member to denied also takes them off their team.
            </p>
          )}
          {a.status === 'submitted' && (
            <p className="admin-app__muted">
              Reopening clears the decision and lets them edit and resubmit. It also takes
              them off their team until they are accepted again.
            </p>
          )}

          {error && (
            <p className="panel__error" role="alert">
              <WarningCircle size={16} weight="fill" aria-hidden="true" />
              <span>{error}</span>
            </p>
          )}
        </div>
      )}
    </li>
  );
}

function Applications() {
  const [state, setState] = useState({ status: 'loading', items: [], error: '' });
  const [filter, setFilter] = useState('review');
  const [feedback, setFeedback] = useState({ tone: 'success', message: '' });

  useEffect(() => {
    let alive = true;
    fetchAdminApplications()
      .then((items) => alive && setState({ status: 'ready', items, error: '' }))
      .catch((error) => alive && setState({ status: 'error', items: [], error: error.message }));
    return () => {
      alive = false;
    };
  }, []);

  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f.key, state.items.filter(f.match).length])),
    [state.items]
  );
  const active = FILTERS.find((f) => f.key === filter);
  const shown = state.items.filter(active.match);

  function replace(updated, outcome) {
    setState((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.userId === updated.userId ? updated : item)),
    }));
    setFeedback(outcome);
  }

  if (state.status === 'loading') return <p className="finder__empty">Loading applications&hellip;</p>;
  if (state.status === 'error') return <StatusMessage tone="error">{state.error}</StatusMessage>;

  return (
    <>
      <div className="admin-filters" role="group" aria-label="Filter applications">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={`teams-tab ${filter === f.key ? 'is-active' : ''}`}
            aria-pressed={filter === f.key}
            onClick={() => setFilter(f.key)}
          >
            {f.label} <span className="member-group__count">{counts[f.key]}</span>
          </button>
        ))}
      </div>

      <StatusMessage tone={feedback.tone}>{feedback.message}</StatusMessage>

      {shown.length === 0 ? (
        <p className="finder__empty">Nothing here.</p>
      ) : (
        <ul className="admin-apps">
          {shown.map((application) => (
            <ApplicationRow key={application.userId} application={application} onChange={replace} />
          ))}
        </ul>
      )}
    </>
  );
}

/* ---------- scores ---------- */

function ScoreCell({ team, event, initial }) {
  const [value, setValue] = useState(initial === undefined ? '' : String(initial));
  const [saved, setSaved] = useState(initial === undefined ? '' : String(initial));
  const [status, setStatus] = useState('idle'); // idle | saving | saved | error
  const [error, setError] = useState('');

  async function commit() {
    const trimmed = value.trim();
    if (trimmed === saved) return;
    const points = trimmed === '' ? null : Number(trimmed);
    if (points !== null && (!Number.isFinite(points) || points < 0 || points > event.max)) {
      setStatus('error');
      setError(`Enter 0 to ${event.max}, or leave it empty.`);
      return;
    }
    setStatus('saving');
    setError('');
    try {
      await saveScore({ teamId: team.id, eventId: event.id, points });
      setSaved(trimmed);
      setStatus('saved');
    } catch (err) {
      setStatus('error');
      setError(err.message);
    }
  }

  return (
    <td className={`admin-score admin-score--${status}`}>
      <label className="sr-only" htmlFor={`score-${team.id}-${event.id}`}>
        {team.name}, {event.name}, out of {event.max}
      </label>
      <input
        id={`score-${team.id}-${event.id}`}
        className="input admin-score__input"
        type="number"
        inputMode="decimal"
        min="0"
        max={event.max}
        step="0.5"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setStatus('idle');
        }}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        aria-invalid={status === 'error' || undefined}
        title={error || undefined}
      />
      {status === 'error' && (
        <span className="admin-score__error" role="alert">
          {error}
        </span>
      )}
    </td>
  );
}

function Scores() {
  const [state, setState] = useState({ status: 'loading', data: null, error: '' });

  useEffect(() => {
    let alive = true;
    fetchAdminScores()
      .then((data) => alive && setState({ status: 'ready', data, error: '' }))
      .catch((error) => alive && setState({ status: 'error', data: null, error: error.message }));
    return () => {
      alive = false;
    };
  }, []);

  if (state.status === 'loading') return <p className="finder__empty">Loading teams&hellip;</p>;
  if (state.status === 'error') return <StatusMessage tone="error">{state.error}</StatusMessage>;

  const { events, teams } = state.data;
  if (teams.length === 0) return <p className="finder__empty">No teams yet.</p>;

  return (
    <>
      <p className="panel__subtitle">
        Raw points against each event&apos;s rubric. Saves when you leave a box; empty it to
        clear a score. Teams under {TEAM_RULES.min} members stay off the leaderboard until
        they are scored.
      </p>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th scope="col">Team</th>
              {events.map((event) => (
                <th key={event.id} scope="col">
                  {event.name}
                  <span className="admin-table__sub">out of {event.max}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {teams.map((team) => (
              <tr key={team.id}>
                <th scope="row">
                  <span className="wrap-anywhere">{team.name}</span>
                  <span className="admin-table__sub">
                    {team.members} of {team.capacity}
                  </span>
                </th>
                {events.map((event) => (
                  <ScoreCell key={event.id} team={team} event={event} initial={team.scores[event.id]} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ---------- page ---------- */

const TABS = [
  { key: 'applications', label: 'Applications', Component: Applications },
  { key: 'scores', label: 'Scores', Component: Scores },
];

export default function Admin() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.find((t) => t.key === params.get('tab')) ?? TABS[0];

  return (
    <div className="dash on-dark" id="main">
      <div className="container dash__inner">
        <Reveal className="dash__header">
          <div>
            <span className="dash__greeting">League admin</span>
            <h1 className="dash__name">Admin</h1>
          </div>
        </Reveal>

        <GlassCard className="panel">
          <div className="teams-tabs" role="tablist" aria-label="Admin sections">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab.key === t.key}
                className={`teams-tab ${tab.key === t.key ? 'is-active' : ''}`}
                onClick={() => setParams(t.key === 'applications' ? {} : { tab: t.key }, { replace: true })}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div role="tabpanel">
            <tab.Component />
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
