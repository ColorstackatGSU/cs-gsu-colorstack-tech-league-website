import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Check,
  X,
  EnvelopeSimple,
  ArrowCounterClockwise,
  ArrowLeft,
  CaretLeft,
  CaretRight,
  HourglassMedium,
  WarningCircle,
  MagnifyingGlass,
  FilePdf,
  DownloadSimple,
  ArrowSquareOut,
  CheckCircle,
  Tray,
  Keyboard,
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
import { GlassCard, Button, StatusMessage } from '../components/ui';
import { StatusPill } from '../components/Journey';
import { Reveal } from '../components/Motion';
import './Dashboard.css';
import './Admin.css';

/* ============================================================
   Admin: a review workspace, the applicant pool, and scores.

   Every action here is checked again by the API against the signed-in account, so this
   page being reachable is not what grants anything. It exists to make the work quick:
   a queue to work through oldest first, the whole application on one screen, and a
   decision that emails the applicant only after a deliberate second click.
   ============================================================ */

const DAY = 24 * 60 * 60 * 1000;

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function waitingDays(iso) {
  if (!iso) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / DAY));
}

const TEAM_PREF_LABELS = { team: 'Wants help finding a team', 'have-team': 'Has teammates in mind' };
const COMMITMENT_LABELS = { '1-2': '1-2 hrs / week', '3-5': '3-5 hrs / week', '6-8': '6-8 hrs / week', '9+': '9+ hrs / week' };

/** Same colours as the member's own dashboard, so both sides of a decision look alike. */
function statusOf(a) {
  if (a.status === 'draft') return { tone: 'brand', label: 'Draft' };
  if (a.decision === 'accepted') return { tone: 'success', label: 'Accepted' };
  if (a.decision === 'waitlisted') return { tone: 'waitlist', label: 'Waitlisted' };
  if (a.decision === 'denied') return { tone: 'neutral', label: 'Denied' };
  return { tone: 'review', label: 'To review' };
}

const needsEmail = (a) => Boolean(a.decision && !a.decisionEmailedAt);

const FILTERS = [
  { key: 'review', label: 'To review', tone: 'review', match: (a) => a.status === 'submitted' && !a.decision },
  { key: 'accepted', label: 'Accepted', tone: 'success', match: (a) => a.decision === 'accepted' },
  { key: 'waitlisted', label: 'Waitlisted', tone: 'waitlist', match: (a) => a.decision === 'waitlisted' },
  { key: 'denied', label: 'Denied', tone: 'neutral', match: (a) => a.decision === 'denied' },
  { key: 'drafts', label: 'Drafts', tone: 'brand', match: (a) => a.status === 'draft' },
  { key: 'unsent', label: 'Email not sent', tone: 'waitlist', match: needsEmail },
  { key: 'all', label: 'All', tone: 'neutral', match: () => true },
];

const DECISIONS = {
  accepted: { verb: 'Accept', icon: Check, variant: 'primary', key: 'a' },
  waitlisted: { verb: 'Waitlist', icon: HourglassMedium, variant: 'glass', key: 'w' },
  denied: { verb: 'Deny', icon: X, variant: 'danger', key: 'd' },
};

/** Where the decision email goes: the personal address only once they confirmed it. */
const emailTarget = (a) =>
  a.personalEmail && a.personalEmailVerified
    ? { address: a.personalEmail, note: 'personal email, confirmed' }
    : { address: a.email, note: a.personalEmail ? 'school email; personal email not confirmed' : 'school email' };

/* ---------- CSV ---------- */

function exportCsv(items, label) {
  // Race and ethnicity are left out on purpose: they are for aggregate reporting on the
  // Applicant pool tab, not for a spreadsheet that gets forwarded around.
  const columns = [
    ['Name', (a) => a.fullName],
    ['School email', (a) => a.email],
    ['Personal email', (a) => a.personalEmail],
    ['Personal email confirmed', (a) => (a.personalEmailVerified ? 'yes' : 'no')],
    ['Year', (a) => a.year],
    ['Major', (a) => a.major],
    ['Second major', (a) => a.secondMajor],
    ['Graduating', (a) => a.gradTerm],
    ['Interest', (a) => a.interest],
    ['Teammates', (a) => TEAM_PREF_LABELS[a.teamPref]],
    ['Time per week', (a) => COMMITMENT_LABELS[a.commitment]],
    ['Status', (a) => statusOf(a).label],
    ['Submitted', (a) => (a.submittedAt ? new Date(a.submittedAt).toISOString().slice(0, 10) : '')],
    ['Resume', (a) => (a.resume ? 'yes' : 'no')],
  ];
  const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [columns.map(([h]) => cell(h)).join(','), ...items.map((a) => columns.map(([, f]) => cell(f(a))).join(','))].join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `tech-league-${label.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/* ---------- overview ---------- */

function Overview({ items, onPick }) {
  const submitted = items.filter((a) => a.status === 'submitted');
  const review = submitted.filter((a) => !a.decision);
  const oldest = review.reduce((max, a) => Math.max(max, waitingDays(a.submittedAt)), 0);
  const unsent = items.filter(needsEmail).length;

  const tiles = [
    { key: 'review', tone: 'review', value: review.length, label: 'Waiting for review', sub: review.length ? `Oldest ${oldest} day${oldest === 1 ? '' : 's'}` : 'Queue is clear' },
    { key: 'accepted', tone: 'success', value: submitted.filter((a) => a.decision === 'accepted').length, label: 'Accepted' },
    { key: 'waitlisted', tone: 'waitlist', value: submitted.filter((a) => a.decision === 'waitlisted').length, label: 'Waitlisted' },
    { key: 'drafts', tone: 'brand', value: items.filter((a) => a.status === 'draft').length, label: 'Drafts in progress' },
  ];

  const pipeline = [
    ['review', review.length],
    ['success', submitted.filter((a) => a.decision === 'accepted').length],
    ['waitlist', submitted.filter((a) => a.decision === 'waitlisted').length],
    ['neutral', submitted.filter((a) => a.decision === 'denied').length],
  ];

  return (
    <div className="admin-overview">
      <div className="admin-tiles">
        {tiles.map((t) => (
          <button key={t.key} type="button" className={`admin-tile tone--${t.tone}`} onClick={() => onPick(t.key)}>
            <span className="admin-tile__value">{t.value}</span>
            <span className="admin-tile__label">{t.label}</span>
            {t.sub && <span className="admin-tile__sub">{t.sub}</span>}
          </button>
        ))}
      </div>

      {submitted.length > 0 && (
        <div className="admin-pipeline" aria-label={`${submitted.length} submitted applications`}>
          <div className="admin-pipeline__bar" aria-hidden="true">
            {pipeline.map(([tone, n]) =>
              n > 0 ? <span key={tone} className={`tone--${tone}`} style={{ flexGrow: n }} /> : null
            )}
          </div>
          <span className="admin-pipeline__label">{submitted.length} submitted this season</span>
        </div>
      )}

      {unsent > 0 && (
        <button type="button" className="admin-alert" onClick={() => onPick('unsent')}>
          <WarningCircle size={18} weight="fill" aria-hidden="true" />
          {unsent} decision email{unsent === 1 ? '' : 's'} did not send. Review and resend
          <CaretRight size={14} weight="bold" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

/* ---------- detail ---------- */

function Detail({ application: a, position, onPrev, onNext, onBack, onChange }) {
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(null); // a DECISIONS key
  const [confirmReopen, setConfirmReopen] = useState(false);
  const confirmRef = useRef(null);
  const name = a.fullName || a.email;
  const status = statusOf(a);
  const target = emailTarget(a);

  useEffect(() => {
    setConfirming(null);
    setConfirmReopen(false);
    setError('');
  }, [a.userId]);

  useEffect(() => {
    if (confirming) confirmRef.current?.focus();
  }, [confirming]);

  const act = useCallback(
    async (key, fn, done, advance) => {
      setBusy(key);
      setError('');
      try {
        const result = await fn();
        setConfirming(null);
        setConfirmReopen(false);
        onChange(
          result.application,
          result.emailError
            ? { tone: 'error', message: `${name}: ${result.emailError}` }
            : { tone: 'success', message: done },
          advance
        );
      } catch (err) {
        setError(err.message);
      } finally {
        setBusy(null);
      }
    },
    [name, onChange]
  );

  // Keyboard review: A / W / D start a decision, Enter confirms it (the focused button),
  // Escape backs out. J / K move through the list.
  useEffect(() => {
    function onKey(event) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.target.closest('input, textarea, select')) return;
      const key = event.key.toLowerCase();
      if (key === 'escape') {
        setConfirming(null);
        return;
      }
      if (key === 'j') onNext?.();
      if (key === 'k') onPrev?.();
      if (a.status !== 'submitted') return;
      const decision = Object.entries(DECISIONS).find(([d, v]) => v.key === key && a.decision !== d);
      if (decision) setConfirming(decision[0]);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [a, onNext, onPrev]);

  const facts = [
    ['Year', a.year],
    ['Major', a.major],
    ...(a.secondMajor ? [['Second major', a.secondMajor]] : []),
    ['Graduating', a.gradTerm],
    ['Interest', a.interest],
    ['Teammates', TEAM_PREF_LABELS[a.teamPref]],
    ['Time', COMMITMENT_LABELS[a.commitment]],
    ['Race / ethnicity', a.raceEthnicity.join(', ')],
  ];

  return (
    <article className="admin-detail" aria-labelledby="admin-detail-name">
      <div className="admin-detail__nav">
        <button type="button" className="admin-detail__back" onClick={onBack}>
          <ArrowLeft size={16} weight="bold" aria-hidden="true" /> All applications
        </button>
        <span className="admin-detail__position">{position}</span>
        <div className="admin-detail__arrows">
          <button type="button" onClick={onPrev} disabled={!onPrev} aria-label="Previous application (K)">
            <CaretLeft size={16} weight="bold" aria-hidden="true" />
          </button>
          <button type="button" onClick={onNext} disabled={!onNext} aria-label="Next application (J)">
            <CaretRight size={16} weight="bold" aria-hidden="true" />
          </button>
        </div>
      </div>

      <header className="admin-detail__head">
        <div className="admin-detail__who">
          <h2 className="admin-detail__name wrap-anywhere" id="admin-detail-name">
            {a.fullName || 'No name yet'}
          </h2>
          <p className="admin-detail__meta">
            {a.submittedAt
              ? `Submitted ${formatDate(a.submittedAt)}${!a.decision ? ` · waiting ${waitingDays(a.submittedAt)} day${waitingDays(a.submittedAt) === 1 ? '' : 's'}` : ''}`
              : `Draft · last edited ${formatDate(a.updatedAt)}`}
          </p>
        </div>
        <StatusPill tone={status.tone}>{status.label}</StatusPill>
      </header>

      {/* ---------- decision ---------- */}
      {a.status === 'submitted' && (
        <section className={`admin-decide tone--${status.tone}`} aria-label="Decision">
          {confirming ? (
            <div className="admin-decide__confirm" role="group" aria-labelledby="confirm-title">
              <p className="admin-decide__title" id="confirm-title">
                {DECISIONS[confirming].verb} {name}?
              </p>
              <p className="admin-decide__text">
                We email <strong className="wrap-anywhere">{target.address}</strong> ({target.note}) straight away.
                {a.decision === 'accepted' && confirming !== 'accepted' && ' They also come off their team.'}
              </p>
              <div className="admin-decide__buttons">
                <Button
                  ref={confirmRef}
                  variant={DECISIONS[confirming].variant === 'glass' ? 'secondary' : DECISIONS[confirming].variant}
                  size="md"
                  icon={EnvelopeSimple}
                  loading={busy === confirming}
                  onClick={() =>
                    act(
                      confirming,
                      () => decideApplication(a.userId, confirming),
                      `${DECISIONS[confirming].verb === 'Waitlist' ? 'Waitlisted' : DECISIONS[confirming].verb + 'ed'} ${name} and emailed them.`,
                      true
                    )
                  }
                >
                  {DECISIONS[confirming].verb} and send email
                </Button>
                <Button variant="ghost" size="md" onClick={() => setConfirming(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="admin-decide__buttons">
                {Object.entries(DECISIONS)
                  .filter(([d]) => a.decision !== d)
                  .map(([d, v]) => (
                    <Button key={d} variant={v.variant} size="md" icon={v.icon} onClick={() => setConfirming(d)}>
                      {a.decision ? `Change to ${v.verb.toLowerCase()}` : v.verb}
                      <kbd className="admin-kbd" aria-hidden="true">{v.key.toUpperCase()}</kbd>
                    </Button>
                  ))}
              </div>
              <p className="admin-decide__text">
                Decision email goes to <strong className="wrap-anywhere">{target.address}</strong>{' '}
                <span className="admin-muted">({target.note})</span>
              </p>
            </>
          )}

          {needsEmail(a) && !confirming && (
            <div className="admin-decide__unsent">
              <WarningCircle size={18} weight="fill" aria-hidden="true" />
              <span>The {a.decision} email has not been sent.</span>
              <Button
                variant="secondary"
                size="sm"
                icon={EnvelopeSimple}
                loading={busy === 'email'}
                onClick={() => act('email', () => resendDecisionEmail(a.userId), `Emailed ${name} their decision.`)}
              >
                Send it now
              </Button>
            </div>
          )}
          {a.decision && a.decisionEmailedAt && !confirming && (
            <p className="admin-decide__sent">
              <CheckCircle size={16} weight="fill" aria-hidden="true" /> {status.label} {formatDate(a.decidedAt)}, emailed{' '}
              {formatDate(a.decisionEmailedAt)}
            </p>
          )}
        </section>
      )}

      {error && (
        <p className="panel__error" role="alert">
          <WarningCircle size={16} weight="fill" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}

      {/* ---------- contact + facts ---------- */}
      <section className="admin-block" aria-labelledby="facts-title">
        <h3 className="admin-block__title" id="facts-title">
          At a glance
        </h3>
        <dl className="admin-facts">
          <div className="is-wide">
            <dt>School email</dt>
            <dd className="wrap-anywhere">{a.email}</dd>
          </div>
          <div className="is-wide">
            <dt>Personal email</dt>
            <dd className="wrap-anywhere">
              {a.personalEmail || '-'}{' '}
              {a.personalEmail && (
                <span className={`admin-flag ${a.personalEmailVerified ? 'is-ok' : 'is-warn'}`}>
                  {a.personalEmailVerified ? 'Confirmed' : 'Not confirmed'}
                </span>
              )}
            </dd>
          </div>
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd className="wrap-anywhere">{value || '-'}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="admin-block" aria-labelledby="resume-title">
        <h3 className="admin-block__title" id="resume-title">
          Resume
        </h3>
        {a.resume ? (
          <div className="admin-resume">
            <FilePdf size={26} weight="duotone" aria-hidden="true" />
            <span className="admin-resume__name wrap-anywhere">{a.resume.name}</span>
            <a className="btn btn--glass btn--sm" href={adminResumeUrl(a.userId)} target="_blank" rel="noopener noreferrer">
              <span>Open</span>
              <ArrowSquareOut size={16} weight="bold" aria-hidden="true" />
            </a>
          </div>
        ) : (
          <p className="admin-muted">No resume on file.</p>
        )}
      </section>

      <section className="admin-block" aria-labelledby="words-title">
        <h3 className="admin-block__title" id="words-title">
          In their words
        </h3>
        {[
          ['Why they want to join', a.whyJoin],
          ['What they want out of the semester', a.goals],
          ['Experience so far', a.experience],
        ].map(([label, value]) => (
          <div key={label} className="admin-answer">
            <h4 className="admin-answer__label">{label}</h4>
            {value ? (
              <blockquote className="admin-answer__text wrap-anywhere">{value}</blockquote>
            ) : (
              <p className="admin-muted">Not answered.</p>
            )}
          </div>
        ))}
      </section>

      {/* Kept apart from the decision buttons, behind a confirmation, because it undoes
          more than it looks like: it once turned two finished applications back into
          drafts with one click each, and neither applicant was told. */}
      {a.status === 'submitted' && (
        <div className="admin-reopen">
          {confirmReopen ? (
            <div className="admin-reopen__confirm" role="group" aria-labelledby={`reopen-${a.userId}`}>
              <p className="admin-reopen__title" id={`reopen-${a.userId}`}>
                Reopen {name}&apos;s application?
              </p>
              <ul className="admin-reopen__effects">
                <li>It goes back to a draft, and they will need to submit it again.</li>
                {a.decision && (
                  <li>
                    Their decision (<strong>{a.decision}</strong>) is cleared.
                  </li>
                )}
                {a.decision === 'accepted' && <li>They come off their team until accepted again.</li>}
                <li>They are not emailed. Tell them yourself if they need to act.</li>
              </ul>
              <div className="admin-reopen__buttons">
                <Button
                  variant="danger"
                  size="sm"
                  icon={ArrowCounterClockwise}
                  loading={busy === 'reopen'}
                  onClick={() =>
                    act('reopen', () => reopenApplication(a.userId), `Reopened ${name}'s application. It is a draft again.`)
                  }
                >
                  Yes, reopen it
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmReopen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <button type="button" className="admin-reopen__link" onClick={() => setConfirmReopen(true)}>
              Reopen this application for edits&hellip;
            </button>
          )}
        </div>
      )}
    </article>
  );
}

/* ---------- review workspace ---------- */

const SORTS = {
  oldest: { label: 'Oldest first', fn: (x, y) => (x.submittedAt ?? x.updatedAt).localeCompare(y.submittedAt ?? y.updatedAt) },
  newest: { label: 'Newest first', fn: (x, y) => (y.submittedAt ?? y.updatedAt).localeCompare(x.submittedAt ?? x.updatedAt) },
  name: { label: 'Name', fn: (x, y) => (x.fullName || x.email).localeCompare(y.fullName || y.email) },
};

function Applications({ items, setItems, filter, setFilter }) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('oldest');
  const [selectedId, setSelectedId] = useState(null);
  const [feedback, setFeedback] = useState({ tone: 'success', message: '' });

  const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f.key, items.filter(f.match).length])), [items]);
  const active = FILTERS.find((f) => f.key === filter) ?? FILTERS[0];

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter(active.match)
      .filter((a) => !q || [a.fullName, a.email, a.personalEmail, a.major, a.secondMajor, a.interest].some((v) => v?.toLowerCase().includes(q)))
      .sort(SORTS[sort].fn);
  }, [items, active, query, sort]);

  const index = shown.findIndex((a) => a.userId === selectedId);
  // Kept visible after a decision moves it out of the current filter, so the admin sees
  // what they just did until they move on.
  const selected = items.find((a) => a.userId === selectedId) ?? null;

  const handleChange = useCallback(
    (updated, outcome, advance) => {
      // Worked out against the list as it was, before this one left the filter.
      const next = advance ? shown[index + 1] ?? shown[index - 1] ?? null : null;
      setItems((prev) => prev.map((item) => (item.userId === updated.userId ? updated : item)));
      setFeedback(outcome);
      if (advance && outcome.tone === 'success' && !active.match(updated)) {
        setSelectedId(next?.userId ?? null);
      }
    },
    [shown, index, active, setItems]
  );

  return (
    <div className="admin-review">
      <div className="admin-toolbar">
        <label className="admin-search">
          <MagnifyingGlass size={18} weight="bold" aria-hidden="true" />
          <span className="sr-only">Search applications</span>
          <input
            type="search"
            className="input"
            placeholder="Search name, email, major"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label className="admin-sort">
          <span className="sr-only">Sort</span>
          <select className="input input--select" value={sort} onChange={(e) => setSort(e.target.value)}>
            {Object.entries(SORTS).map(([key, s]) => (
              <option key={key} value={key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <Button variant="glass" size="sm" icon={DownloadSimple} onClick={() => exportCsv(shown, active.label)} disabled={shown.length === 0}>
          Export CSV
        </Button>
      </div>

      <div className="admin-filters" role="group" aria-label="Filter applications">
        {FILTERS.filter((f) => f.key !== 'unsent' || counts.unsent > 0).map((f) => (
          <button
            key={f.key}
            type="button"
            className={`admin-chip tone--${f.tone} ${filter === f.key ? 'is-active' : ''}`}
            aria-pressed={filter === f.key}
            onClick={() => setFilter(f.key)}
          >
            {f.label} <span className="admin-chip__count">{counts[f.key]}</span>
          </button>
        ))}
      </div>

      <StatusMessage tone={feedback.tone}>{feedback.message}</StatusMessage>

      <div className={`admin-split ${selected ? 'has-selection' : ''}`}>
        <div className="admin-list-wrap">
          {shown.length === 0 ? (
            <div className="admin-empty">
              <Tray size={34} weight="duotone" aria-hidden="true" />
              <p>{query ? 'No applications match that search.' : filter === 'review' ? 'Nothing waiting. The queue is clear.' : 'Nothing here.'}</p>
            </div>
          ) : (
            <ul className="admin-list">
              {shown.map((a) => {
                const s = statusOf(a);
                return (
                  <li key={a.userId}>
                    <button
                      type="button"
                      className={`admin-item tone--${s.tone} ${a.userId === selectedId ? 'is-selected' : ''}`}
                      aria-current={a.userId === selectedId ? 'true' : undefined}
                      onClick={() => setSelectedId(a.userId)}
                    >
                      <span className="admin-item__main">
                        <span className="admin-item__name wrap-anywhere">{a.fullName || a.email}</span>
                        <span className="admin-item__sub">{[a.year, a.major].filter(Boolean).join(' · ') || a.email}</span>
                      </span>
                      <span className="admin-item__side">
                        <span className="admin-item__status">
                          <span className="admin-item__dot" aria-hidden="true" />
                          {s.label}
                        </span>
                        <span className="admin-item__flags">
                          {needsEmail(a) && (
                            <WarningCircle size={15} weight="fill" className="is-warn" aria-label="Decision email not sent" />
                          )}
                          {a.resume && <FilePdf size={15} weight="fill" aria-label="Has resume" />}
                          <span>{a.submittedAt ? formatDate(a.submittedAt) : 'Draft'}</span>
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="admin-pane">
          {selected ? (
            <Detail
              key={selected.userId}
              application={selected}
              position={index >= 0 ? `${index + 1} of ${shown.length}` : 'Moved out of this filter'}
              onPrev={index > 0 ? () => setSelectedId(shown[index - 1].userId) : null}
              onNext={index >= 0 && index < shown.length - 1 ? () => setSelectedId(shown[index + 1].userId) : null}
              onBack={() => setSelectedId(null)}
              onChange={handleChange}
            />
          ) : (
            <div className="admin-empty admin-empty--pane">
              <Keyboard size={34} weight="duotone" aria-hidden="true" />
              <p>Pick an application to read it.</p>
              <p className="admin-muted">
                Shortcuts: <kbd className="admin-kbd">J</kbd> <kbd className="admin-kbd">K</kbd> next and previous,{' '}
                <kbd className="admin-kbd">A</kbd> <kbd className="admin-kbd">W</kbd> <kbd className="admin-kbd">D</kbd> accept, waitlist, deny.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- applicant pool ---------- */

function Breakdown({ title, rows, total }) {
  const max = Math.max(1, ...rows.map(([, n]) => n));
  return (
    <section className="admin-breakdown" aria-labelledby={`bd-${title}`}>
      <h3 className="admin-block__title" id={`bd-${title}`}>
        {title}
      </h3>
      <ul className="admin-bars">
        {rows.map(([label, n]) => (
          <li key={label}>
            <span className="admin-bars__label">{label}</span>
            <span className="admin-bars__track" aria-hidden="true">
              <span className="admin-bars__fill" style={{ width: `${(n / max) * 100}%` }} />
            </span>
            <span className="admin-bars__value">
              {n}
              <span className="admin-muted"> · {total ? Math.round((n / total) * 100) : 0}%</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function tally(items, pick) {
  const map = new Map();
  for (const a of items) {
    for (const value of [pick(a)].flat()) {
      if (!value) continue;
      map.set(value, (map.get(value) ?? 0) + 1);
    }
  }
  return [...map.entries()].sort((x, y) => y[1] - x[1]);
}

function Pool({ items }) {
  const [scope, setScope] = useState('submitted');
  const pool = items.filter((a) => (scope === 'accepted' ? a.decision === 'accepted' : a.status === 'submitted'));
  const total = pool.length;

  if (items.every((a) => a.status !== 'submitted')) {
    return <p className="admin-muted">No submitted applications yet. The breakdown appears once some come in.</p>;
  }

  const withResume = pool.filter((a) => a.resume).length;
  const confirmed = pool.filter((a) => a.personalEmailVerified).length;

  return (
    <div className="admin-pool">
      <div className="admin-filters" role="group" aria-label="Which applicants">
        {[
          ['submitted', 'Everyone who submitted'],
          ['accepted', 'Accepted only'],
        ].map(([key, label]) => (
          <button key={key} type="button" className={`admin-chip tone--brand ${scope === key ? 'is-active' : ''}`} aria-pressed={scope === key} onClick={() => setScope(key)}>
            {label}
          </button>
        ))}
      </div>

      <div className="admin-tiles admin-tiles--small">
        <div className="admin-tile tone--brand">
          <span className="admin-tile__value">{total}</span>
          <span className="admin-tile__label">Applicants</span>
        </div>
        <div className="admin-tile tone--success">
          <span className="admin-tile__value">{total ? Math.round((withResume / total) * 100) : 0}%</span>
          <span className="admin-tile__label">Have a resume</span>
        </div>
        <div className="admin-tile tone--review">
          <span className="admin-tile__value">{total ? Math.round((confirmed / total) * 100) : 0}%</span>
          <span className="admin-tile__label">Confirmed personal email</span>
        </div>
      </div>

      <p className="admin-muted">
        Race and ethnicity are shown here only as totals, for chapter reporting. They never affect a decision.
      </p>

      <div className="admin-breakdowns">
        <Breakdown title="Year" rows={tally(pool, (a) => a.year)} total={total} />
        <Breakdown title="Major" rows={tally(pool, (a) => a.major)} total={total} />
        <Breakdown title="Area of interest" rows={tally(pool, (a) => a.interest)} total={total} />
        <Breakdown title="Time per week" rows={tally(pool, (a) => COMMITMENT_LABELS[a.commitment])} total={total} />
        <Breakdown title="Teammates" rows={tally(pool, (a) => TEAM_PREF_LABELS[a.teamPref])} total={total} />
        <Breakdown title="Race / ethnicity (select all)" rows={tally(pool, (a) => a.raceEthnicity)} total={total} />
      </div>
    </div>
  );
}

/* ---------- scores ---------- */

const scoreKey = (teamId, eventId) => `${teamId}:${eventId}`;
const asText = (points) => (points === undefined || points === null ? '' : String(points));

/** Why a typed value cannot be saved, or '' when it can. Empty is valid: it clears the score. */
function scoreProblem(text, event) {
  const trimmed = text.trim();
  if (trimmed === '') return '';
  const points = Number(trimmed);
  if (!Number.isFinite(points) || points < 0 || points > event.max) return `Enter 0 to ${event.max}, or leave it empty.`;
  return '';
}

function ScoreCell({ team, event, value, saved, error, onChange }) {
  const pending = value.trim() !== saved;
  const problem = pending ? scoreProblem(value, event) : '';
  const shown = problem || error;
  const status = shown ? 'error' : pending ? 'pending' : 'idle';

  return (
    <td className={`admin-score admin-score--${status}`}>
      <label className="sr-only" htmlFor={`score-${team.id}-${event.id}`}>
        {team.name}, {event.name}, out of {event.max}
        {pending ? ', not saved yet' : ''}
      </label>
      <span className="admin-score__box">
        <input
          id={`score-${team.id}-${event.id}`}
          className="input admin-score__input"
          type="number"
          inputMode="decimal"
          min="0"
          max={event.max}
          step="0.5"
          placeholder="-"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          aria-invalid={status === 'error' || undefined}
          title={shown || undefined}
        />
        {pending && !shown && (
          <span className="admin-score__was" aria-hidden="true">
            was {saved === '' ? '-' : saved}
          </span>
        )}
      </span>
      {shown && (
        <span className="admin-score__error" role="alert">
          {shown}
        </span>
      )}
    </td>
  );
}

/**
 * Score entry. Typing only stages a change; nothing reaches the leaderboard until the admin
 * reviews the list of changes and confirms it. Scores go live for every open leaderboard
 * within seconds of saving, so a stray keystroke in the wrong row should not be one blur
 * away from public.
 */
function Scores() {
  const [state, setState] = useState({ status: 'loading', data: null, error: '' });
  // Typed values, keyed by team:event. A draft equal to the saved value is not a change.
  const [drafts, setDrafts] = useState({});
  // Server errors from the last save, keyed the same way.
  const [errors, setErrors] = useState({});
  const [reviewing, setReviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const confirmRef = useRef(null);

  useEffect(() => {
    let alive = true;
    fetchAdminScores()
      .then((data) => alive && setState({ status: 'ready', data, error: '' }))
      .catch((error) => alive && setState({ status: 'error', data: null, error: error.message }));
    return () => {
      alive = false;
    };
  }, []);

  const changes = useMemo(() => {
    if (!state.data) return [];
    const list = [];
    for (const team of state.data.teams) {
      for (const event of state.data.events) {
        const key = scoreKey(team.id, event.id);
        if (!(key in drafts)) continue;
        const before = asText(team.scores[event.id]);
        const after = drafts[key].trim();
        if (after === before) continue;
        list.push({ key, team, event, before, after, problem: scoreProblem(after, event) });
      }
    }
    return list;
  }, [state.data, drafts]);

  const invalid = changes.filter((c) => c.problem).length;
  const showReview = reviewing && changes.length > 0 && invalid === 0;

  // Leaving the page drops staged scores, so the browser asks first.
  useEffect(() => {
    if (changes.length === 0) return undefined;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [changes.length]);

  useEffect(() => {
    if (showReview) confirmRef.current?.focus();
  }, [showReview]);

  function edit(key, value) {
    setResult(null);
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setDrafts((prev) => ({ ...prev, [key]: value }));
  }

  function discard() {
    setDrafts({});
    setErrors({});
    setReviewing(false);
  }

  async function saveAll() {
    setSaving(true);
    const failed = {};
    const landed = new Map();
    // One at a time, so a failure is attributable to its cell and the rest still land.
    for (const change of changes) {
      const points = change.after === '' ? null : Number(change.after);
      try {
        await saveScore({ teamId: change.team.id, eventId: change.event.id, points });
        landed.set(change.key, points);
      } catch (err) {
        failed[change.key] = err.message;
      }
    }

    setState((prev) => ({
      ...prev,
      data: {
        ...prev.data,
        teams: prev.data.teams.map((team) => {
          const scores = { ...team.scores };
          for (const event of prev.data.events) {
            const key = scoreKey(team.id, event.id);
            if (!landed.has(key)) continue;
            const points = landed.get(key);
            if (points === null) delete scores[event.id];
            else scores[event.id] = points;
          }
          return { ...team, scores };
        }),
      },
    }));
    setDrafts((prev) => {
      const next = { ...prev };
      for (const key of landed.keys()) delete next[key];
      return next;
    });
    setErrors(failed);
    setReviewing(false);
    setSaving(false);
    setResult({ saved: landed.size, failed: Object.keys(failed).length });
  }

  if (state.status === 'loading') return <p className="admin-muted">Loading teams&hellip;</p>;
  if (state.status === 'error') return <StatusMessage tone="error">{state.error}</StatusMessage>;

  const { events, teams } = state.data;
  if (teams.length === 0) {
    return (
      <div className="admin-empty">
        <Tray size={34} weight="duotone" aria-hidden="true" />
        <p>No teams yet. They appear here once accepted members form them.</p>
      </div>
    );
  }

  return (
    <>
      <p className="admin-muted">
        Raw points against each event&apos;s rubric. Type as many as you like, then review and save them together;
        empty a box to clear a score. Teams under {TEAM_RULES.min} members stay off the leaderboard until they are
        scored.
      </p>

      {result && (
        <StatusMessage tone={result.failed ? 'error' : 'success'}>
          {result.saved > 0 &&
            `Saved ${result.saved} ${result.saved === 1 ? 'score' : 'scores'}. The leaderboard has ${result.saved === 1 ? 'it' : 'them'} now.`}
          {result.failed > 0 &&
            ` ${result.failed} ${result.failed === 1 ? 'change' : 'changes'} did not save and ${result.failed === 1 ? 'is' : 'are'} still marked below.`}
        </StatusMessage>
      )}

      {changes.length > 0 && (
        <section className="admin-decide tone--review admin-scores-review" aria-label="Unsaved score changes">
          {showReview ? (
            <div className="admin-decide__confirm" role="group" aria-labelledby="scores-confirm-title">
              <p className="admin-decide__title" id="scores-confirm-title">
                Save {changes.length} score {changes.length === 1 ? 'change' : 'changes'}?
              </p>
              <ul className="admin-scores-review__list">
                {changes.map((c) => (
                  <li key={c.key}>
                    <strong className="wrap-anywhere">{c.team.name}</strong>
                    <span className="admin-muted"> · {c.event.name}: </span>
                    {c.before === '' ? (
                      <span>
                        new score of <strong>{c.after}</strong>
                      </span>
                    ) : c.after === '' ? (
                      <span>
                        <strong>{c.before}</strong> cleared
                      </span>
                    ) : (
                      <span>
                        {c.before} &rarr; <strong>{c.after}</strong>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              <p className="admin-decide__text">Every open leaderboard picks these up within a few seconds.</p>
              <div className="admin-decide__buttons">
                <Button ref={confirmRef} variant="primary" size="md" icon={Check} loading={saving} onClick={saveAll}>
                  {changes.length === 1 ? 'Save it' : `Save all ${changes.length}`}
                </Button>
                <Button variant="ghost" size="md" disabled={saving} onClick={() => setReviewing(false)}>
                  Keep editing
                </Button>
              </div>
            </div>
          ) : (
            <div className="admin-scores-review__bar">
              <p className="admin-decide__text">
                <strong>
                  {changes.length} score {changes.length === 1 ? 'change' : 'changes'} not saved yet.
                </strong>
                {invalid > 0 && ` Fix the ${invalid === 1 ? 'one' : invalid} marked in red first.`}
              </p>
              <div className="admin-decide__buttons">
                <Button variant="primary" size="md" disabled={invalid > 0} onClick={() => setReviewing(true)}>
                  Review and save
                </Button>
                <Button variant="ghost" size="md" icon={ArrowCounterClockwise} onClick={discard}>
                  Discard
                </Button>
              </div>
            </div>
          )}
        </section>
      )}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th scope="col">Team</th>
              {events.map((event) => (
                <th key={event.id} scope="col">
                  {event.name}
                  <span className="admin-table__sub">out of {event.max} · {event.weight}%</span>
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
                    {team.members} of {team.capacity} members
                  </span>
                </th>
                {events.map((event) => {
                  const key = scoreKey(team.id, event.id);
                  const saved = asText(team.scores[event.id]);
                  return (
                    <ScoreCell
                      key={event.id}
                      team={team}
                      event={event}
                      value={key in drafts ? drafts[key] : saved}
                      saved={saved}
                      error={errors[key]}
                      onChange={(value) => edit(key, value)}
                    />
                  );
                })}
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
  { key: 'applications', label: 'Review' },
  { key: 'pool', label: 'Applicant pool' },
  { key: 'scores', label: 'Scores' },
];

export default function Admin() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.find((t) => t.key === params.get('tab')) ?? TABS[0];
  const [state, setState] = useState({ status: 'loading', items: [], error: '' });
  const [filter, setFilter] = useState('review');
  // Scores stays mounted once opened, so changes staged there survive a look at another tab.
  const [scoresOpened, setScoresOpened] = useState(tab.key === 'scores');
  useEffect(() => {
    if (tab.key === 'scores') setScoresOpened(true);
  }, [tab.key]);

  useEffect(() => {
    let alive = true;
    fetchAdminApplications()
      .then((items) => alive && setState({ status: 'ready', items, error: '' }))
      .catch((error) => alive && setState({ status: 'error', items: [], error: error.message }));
    return () => {
      alive = false;
    };
  }, []);

  const setItems = useCallback((fn) => setState((prev) => ({ ...prev, items: fn(prev.items) })), []);

  function openTab(key) {
    setParams(key === 'applications' ? {} : { tab: key }, { replace: true });
  }

  return (
    <div className="dash admin on-dark">
      <div className="container dash__inner">
        <Reveal className="dash__header">
          <div>
            <span className="dash__greeting">League admin</span>
            <h1 className="dash__name">Applications &amp; scores</h1>
          </div>
        </Reveal>

        {state.status === 'loading' && <p className="admin-muted">Loading applications&hellip;</p>}
        {state.status === 'error' && <StatusMessage tone="error">{state.error}</StatusMessage>}

        {state.status === 'ready' && (
          <Overview
            items={state.items}
            onPick={(key) => {
              setFilter(key);
              openTab('applications');
            }}
          />
        )}

        <GlassCard className="panel admin-panel">
          <div className="admin-tabs" role="tablist" aria-label="Admin sections">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab.key === t.key}
                className={`admin-tab ${tab.key === t.key ? 'is-active' : ''}`}
                onClick={() => openTab(t.key)}
              >
                {t.label}
                {t.key === 'applications' && state.status === 'ready' && (
                  <span className="admin-tab__count">{state.items.filter(FILTERS[0].match).length}</span>
                )}
              </button>
            ))}
          </div>
          <div role="tabpanel">
            {scoresOpened && (
              <div hidden={tab.key !== 'scores'}>
                <Scores />
              </div>
            )}
            {tab.key === 'pool' && state.status === 'ready' && <Pool items={state.items} />}
            {tab.key === 'applications' && state.status === 'ready' && (
              <Applications items={state.items} setItems={setItems} filter={filter} setFilter={setFilter} />
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
