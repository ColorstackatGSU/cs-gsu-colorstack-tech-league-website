import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadSimple,
  FilePdf,
  Trash,
  DownloadSimple,
  CheckCircle,
  ArrowRight,
  WarningCircle,
  Sparkle,
  ClipboardText,
  Clock,
  UsersThree,
  MagnifyingGlass,
  PaperPlaneTilt,
  X,
  Check,
  PencilSimple,
  Envelope,
  HourglassMedium,
} from '@phosphor-icons/react';
import { useAuth } from '../lib/AuthContext';
import {
  fetchMembers,
  initialsOf,
  timeAgo,
  TEAM_RULES,
  MEMBERS_ARE_MOCK,
} from '../lib/authStore';
import { GlassCard, Button, Badge, StatusMessage, TextInput } from '../components/ui';
import { Reveal, Stagger, StaggerItem } from '../components/Motion';
import './Dashboard.css';

const MAX_BYTES = 2 * 1024 * 1024; // 2MB; localStorage caps near 5MB total
const ACCEPTED = ['application/pdf'];

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}


/* ============================================================
   Team builder

   Search the member directory and pick teammates. Everything here runs
   against mock data in authStore.js: once Google sign-in lands, fetchMembers
   queries real accounts and this component does not change.
   ============================================================ */

function Avatar({ member }) {
  if (member.picture) {
    return <img className="teammate__avatar" src={member.picture} alt="" />;
  }
  return (
    <span className="teammate__avatar teammate__avatar--initials" aria-hidden="true">
      {initialsOf(member.name)}
    </span>
  );
}

function TeamPanel() {
  const {
    profile,
    requestTeammate,
    cancelTeamRequest,
    acceptTeamInvite,
    declineTeamInvite,
    seedInvites,
    removeTeammate,
    renameTeam,
  } = useAuth();

  const team = profile?.team ?? { name: '', members: [], sent: [], received: [] };
  const roster = team.members ?? [];
  const sent = team.sent ?? [];
  const received = team.received ?? [];

  // The user occupies one seat and is never in the members array. Pending
  // requests are held too, so the roster cannot be oversubscribed.
  const seatsUsed = roster.length + 1;
  const isFull = seatsUsed + sent.length >= TEAM_RULES.max;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(team.name ?? '');

  // No server means nobody can send the user a request, so mock ones are
  // dropped in once per account to make the inbox real.
  useEffect(() => {
    seedInvites();
  }, [seedInvites]);

  // Debounced directory lookup, so typing does not fire a request per keystroke.
  useEffect(() => {
    let cancelled = false;
    setSearching(true);

    const timer = setTimeout(() => {
      fetchMembers(query)
        .then((members) => {
          if (!cancelled) setResults(members);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 220);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  // Anyone already on the roster or already asked drops out of the results.
  const available = useMemo(
    () =>
      results.filter(
        (m) =>
          !roster.some((r) => r.id === m.id) && !sent.some((r) => r.id === m.id)
      ),
    [results, roster, sent]
  );

  function flash(message) {
    setNotice(message);
    setTimeout(() => setNotice(''), 4000);
  }

  function onRequest(member) {
    setError('');
    try {
      requestTeammate(member);
      flash(`Request sent to ${member.name}. They will see it in their inbox.`);
    } catch (err) {
      setError(err.message);
    }
  }

  function onAccept(invite) {
    setError('');
    try {
      acceptTeamInvite(invite.id);
      flash(`${invite.name} is on your team.`);
    } catch (err) {
      setError(err.message);
    }
  }

  function onSaveName() {
    renameTeam(draftName);
    setEditingName(false);
  }

  return (
    <GlassCard className="panel team-panel">
      <div className="panel__head">
        <div>
          <h2 className="panel__title">Your team</h2>
          <p className="panel__subtitle">
            Teams run {TEAM_RULES.min}&ndash;{TEAM_RULES.max} people, including you.
            Send a request and they join once they accept.
          </p>
        </div>
        <Badge
          tone={seatsUsed >= TEAM_RULES.min ? 'success' : 'neutral'}
          icon={UsersThree}
        >
          {seatsUsed} of {TEAM_RULES.max}
        </Badge>
      </div>

      {/* ---------- inbox: requests sent TO the user ---------- */}
      {received.length > 0 && (
        <section className="inbox" aria-labelledby="inbox-heading">
          <div className="inbox__head">
            <Envelope size={18} weight="duotone" aria-hidden="true" />
            <h3 className="inbox__title" id="inbox-heading">
              Team requests
            </h3>
            <Badge tone="accent">{received.length}</Badge>
          </div>

          <ul className="inbox__list">
            <AnimatePresence initial={false}>
              {received.map((invite) => (
                <motion.li
                  key={invite.id}
                  className="invite"
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.22 }}
                >
                  <Avatar member={invite} />
                  <div className="invite__meta">
                    <p className="invite__name wrap-anywhere">
                      <strong>{invite.name}</strong> wants to team up
                    </p>
                    <p className="invite__sub wrap-anywhere">
                      {invite.year} &middot; {invite.major} &middot;{' '}
                      {timeAgo(invite.sentAt)}
                    </p>
                    {invite.message && (
                      <p className="invite__message wrap-anywhere">
                        &ldquo;{invite.message}&rdquo;
                      </p>
                    )}
                  </div>
                  <div className="invite__actions">
                    <Button
                      variant="primary"
                      size="sm"
                      icon={Check}
                      onClick={() => onAccept(invite)}
                    >
                      Accept
                    </Button>
                    <Button
                      variant="glass"
                      size="sm"
                      onClick={() => declineTeamInvite(invite.id)}
                    >
                      Decline
                    </Button>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </section>
      )}

      {/* ---------- team name ---------- */}
      <div className="team-name">
        {editingName ? (
          <div className="team-name__edit">
            <label className="sr-only" htmlFor="team-name-input">
              Team name
            </label>
            <TextInput
              id="team-name-input"
              value={draftName}
              maxLength={40}
              placeholder="e.g. Merge Conflict"
              onChange={(e) => setDraftName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSaveName()}
            />
            <Button variant="secondary" size="sm" onClick={onSaveName}>
              Save
            </Button>
          </div>
        ) : (
          <button
            type="button"
            className="team-name__display"
            onClick={() => {
              setDraftName(team.name ?? '');
              setEditingName(true);
            }}
          >
            <span className="team-name__value">{team.name || 'Name your team'}</span>
            <PencilSimple size={15} weight="bold" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* ---------- current roster ---------- */}
      <ul className="roster">
        <li className="teammate teammate--you">
          <Avatar member={{ name: profile?.application?.fullName || 'You' }} />
          <div className="teammate__meta">
            <p className="teammate__name wrap-anywhere">
              {profile?.application?.fullName || 'You'}
            </p>
            <p className="teammate__sub">Team captain</p>
          </div>
          <Badge tone="accent">You</Badge>
        </li>

        <AnimatePresence initial={false}>
          {roster.map((member) => (
            <motion.li
              key={member.id}
              className="teammate"
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.22 }}
            >
              <Avatar member={member} />
              <div className="teammate__meta">
                <p className="teammate__name wrap-anywhere">{member.name}</p>
                <p className="teammate__sub wrap-anywhere">
                  {member.year} &middot; {member.major}
                </p>
              </div>
              <button
                type="button"
                className="teammate__remove"
                onClick={() => removeTeammate(member.id)}
                aria-label={`Remove ${member.name} from your team`}
              >
                <X size={15} weight="bold" aria-hidden="true" />
              </button>
            </motion.li>
          ))}

          {/* Requests waiting on an answer hold a seat, shown as pending. */}
          {sent.map((invite) => (
            <motion.li
              key={invite.id}
              className="teammate teammate--pending"
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.22 }}
            >
              <Avatar member={invite} />
              <div className="teammate__meta">
                <p className="teammate__name wrap-anywhere">{invite.name}</p>
                <p className="teammate__sub">
                  <HourglassMedium size={12} weight="fill" aria-hidden="true" />{' '}
                  Waiting &middot; sent {timeAgo(invite.sentAt)}
                </p>
              </div>
              <button
                type="button"
                className="teammate__remove"
                onClick={() => cancelTeamRequest(invite.id)}
                aria-label={`Cancel your request to ${invite.name}`}
              >
                <X size={15} weight="bold" aria-hidden="true" />
              </button>
            </motion.li>
          ))}
        </AnimatePresence>

        {/* Empty seats, so the roster cap reads at a glance. */}
        {Array.from({
          length: Math.max(0, TEAM_RULES.max - seatsUsed - sent.length),
        }).map((_, i) => (
          <li key={`empty-${i}`} className="teammate teammate--empty" aria-hidden="true">
            <span className="teammate__avatar teammate__avatar--empty">+</span>
            <span className="teammate__sub">Open seat</span>
          </li>
        ))}
      </ul>

      {error && (
        <p className="panel__error" role="alert">
          <WarningCircle size={16} weight="fill" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}

      {notice && <StatusMessage tone="success">{notice}</StatusMessage>}

      {/* ---------- directory search ---------- */}
      <div className="finder">
        <label className="finder__label" htmlFor="member-search">
          Find teammates
        </label>
        <div className="finder__search">
          <MagnifyingGlass size={17} weight="bold" aria-hidden="true" />
          <TextInput
            id="member-search"
            type="search"
            value={query}
            placeholder="Search by name, major, or interest"
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="finder__results" role="list">
          {searching && available.length === 0 && (
            <p className="finder__empty">Searching&hellip;</p>
          )}

          {!searching && available.length === 0 && (
            <p className="finder__empty">
              Nobody left to ask here. Try a different name, major, or interest.
            </p>
          )}

          {available.map((member) => (
            <div className="finder__row" role="listitem" key={member.id}>
              <Avatar member={member} />
              <div className="teammate__meta">
                <p className="teammate__name wrap-anywhere">{member.name}</p>
                <p className="teammate__sub wrap-anywhere">
                  {member.year} &middot; {member.major} &middot; {member.interest}
                </p>
              </div>
              {member.status === 'on-team' ? (
                <Badge tone="neutral">On a team</Badge>
              ) : (
                <Button
                  variant="glass"
                  size="sm"
                  icon={PaperPlaneTilt}
                  disabled={isFull}
                  onClick={() => onRequest(member)}
                >
                  Request
                </Button>
              )}
            </div>
          ))}
        </div>

        {MEMBERS_ARE_MOCK && (
          <p className="finder__note">
            Preview roster. Once Google sign-in is live, this searches real League
            members and your request lands in their inbox for real.
          </p>
        )}
      </div>
    </GlassCard>
  );
}

export default function Dashboard() {
  const { session, profile, uploadResume, deleteResume } = useAuth();
  const location = useLocation();
  const isWelcome = location.state?.welcome;

  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [justUploaded, setJustUploaded] = useState(false);
  const inputRef = useRef(null);

  const resume = profile?.resume ?? null;
  const applicationStatus = profile?.applicationStatus ?? 'not-started';

  const handleFile = useCallback(
    (file) => {
      setUploadError('');

      if (!file) return;

      if (!ACCEPTED.includes(file.type)) {
        setUploadError('Please upload a PDF. Other formats are not accepted.');
        return;
      }

      if (file.size > MAX_BYTES) {
        setUploadError(
          `That file is ${formatSize(file.size)}. Please upload a PDF under 2 MB.`
        );
        return;
      }

      setUploading(true);
      const reader = new FileReader();

      reader.onload = () => {
        try {
          uploadResume({
            name: file.name,
            size: file.size,
            type: file.type,
            dataUrl: reader.result,
          });
          setJustUploaded(true);
          setTimeout(() => setJustUploaded(false), 4200);
        } catch {
          setUploadError(
            'Could not save your resume. Your browser storage may be full.'
          );
        } finally {
          setUploading(false);
        }
      };

      reader.onerror = () => {
        setUploadError('Could not read that file. Please try again.');
        setUploading(false);
      };

      reader.readAsDataURL(file);
    },
    [uploadResume]
  );

  function onDrop(event) {
    event.preventDefault();
    setDragging(false);
    handleFile(event.dataTransfer.files?.[0]);
  }

  function onRemove() {
    deleteResume();
    setUploadError('');
    setJustUploaded(false);
  }

  const steps = [
    { done: true, label: 'Account created' },
    { done: Boolean(resume), label: 'Resume uploaded' },
    { done: applicationStatus === 'submitted', label: 'Application sent' },
  ];
  const completed = steps.filter((s) => s.done).length;

  return (
    <div className="dash on-dark" id="main">
      <div className="dash__orb" aria-hidden="true" />

      <div className="container dash__inner">
        {/* ---------- header ---------- */}
        <Reveal className="dash__header">
          <div>
            <span className="dash__greeting">
              {isWelcome ? 'Welcome to the League,' : 'Welcome back,'}
            </span>
            <h1 className="dash__name wrap-anywhere">{session?.username}</h1>
          </div>
          <Badge tone={completed === 3 ? 'success' : 'accent'}>
            {completed} of 3 steps complete
          </Badge>
        </Reveal>

        {/* ---------- progress ---------- */}
        <Reveal delay={0.06}>
          <GlassCard className="progress">
            <ol className="progress__list">
              {steps.map((step, i) => (
                <li
                  key={step.label}
                  className={`progress__step ${step.done ? 'is-done' : ''}`}
                >
                  <span className="progress__icon" aria-hidden="true">
                    {step.done ? (
                      <CheckCircle size={20} weight="fill" />
                    ) : (
                      <span className="progress__num">{i + 1}</span>
                    )}
                  </span>
                  <span className="progress__label">{step.label}</span>
                  {step.done && <span className="sr-only">(complete)</span>}
                </li>
              ))}
            </ol>
            <div className="progress__track" aria-hidden="true">
              <motion.div
                className="progress__fill"
                initial={{ width: 0 }}
                animate={{ width: `${(completed / 3) * 100}%` }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </GlassCard>
        </Reveal>

        <div className="dash__grid">
          {/* ---------- resume ---------- */}
          <Reveal delay={0.1} className="dash__col">
            <GlassCard className="panel">
              <div className="panel__head">
                <div>
                  <h2 className="panel__title">Your resume</h2>
                  <p className="panel__subtitle">
                    Partner recruiters review these when sourcing for internships. Keep
                    it current.
                  </p>
                </div>
                {resume && (
                  <Badge tone="success" icon={CheckCircle}>
                    Uploaded
                  </Badge>
                )}
              </div>

              <AnimatePresence mode="wait">
                {resume ? (
                  <motion.div
                    key="file"
                    className="resume-file"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.28 }}
                  >
                    <span className="resume-file__icon" aria-hidden="true">
                      <FilePdf size={26} weight="duotone" />
                    </span>
                    <div className="resume-file__meta">
                      <p className="resume-file__name wrap-anywhere">{resume.name}</p>
                      <p className="resume-file__sub">
                        {formatSize(resume.size)} &middot; Uploaded{' '}
                        {formatDate(resume.uploadedAt)}
                      </p>
                    </div>
                    <div className="resume-file__actions">
                      <a
                        href={resume.dataUrl}
                        download={resume.name}
                        className="btn btn--glass btn--sm"
                      >
                        <DownloadSimple size={17} weight="bold" aria-hidden="true" />
                        <span>Download</span>
                      </a>
                      <Button variant="danger" size="sm" icon={Trash} onClick={onRemove}>
                        Remove
                      </Button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="drop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.22 }}
                  >
                    <div
                      className={`dropzone ${dragging ? 'is-dragging' : ''}`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragging(true);
                      }}
                      onDragLeave={() => setDragging(false)}
                      onDrop={onDrop}
                    >
                      <span className="dropzone__icon" aria-hidden="true">
                        <UploadSimple size={30} weight="duotone" />
                      </span>
                      <p className="dropzone__title">
                        Drag your resume here, or choose a file
                      </p>
                      <p className="dropzone__hint">PDF only &middot; up to 2 MB</p>

                      <input
                        ref={inputRef}
                        type="file"
                        accept="application/pdf"
                        className="sr-only"
                        id="resume-input"
                        onChange={(e) => handleFile(e.target.files?.[0])}
                      />
                      <Button
                        variant="secondary"
                        size="md"
                        loading={uploading}
                        icon={UploadSimple}
                        onClick={() => inputRef.current?.click()}
                      >
                        {uploading ? 'Uploading' : 'Choose file'}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {uploadError && (
                <p className="panel__error" role="alert">
                  <WarningCircle size={16} weight="fill" aria-hidden="true" />
                  <span>{uploadError}</span>
                </p>
              )}

              {justUploaded && (
                <StatusMessage tone="success">
                  Resume saved. Recruiters can see it once your application is in.
                </StatusMessage>
              )}
            </GlassCard>
          </Reveal>

          {/* ---------- application ---------- */}
          <Reveal delay={0.16} className="dash__col">
            <GlassCard className="panel">
              <div className="panel__head">
                <div>
                  <h2 className="panel__title">League application</h2>
                  <p className="panel__subtitle">
                    Tell us who you are and why you want in. Takes about five minutes.
                  </p>
                </div>
                {applicationStatus === 'submitted' && (
                  <Badge tone="accent" icon={Clock}>
                    Under review
                  </Badge>
                )}
                {applicationStatus === 'draft' && <Badge tone="neutral">Draft saved</Badge>}
              </div>

              {applicationStatus === 'submitted' ? (
                <div className="app-done">
                  <span className="app-done__icon" aria-hidden="true">
                    <Clock size={36} weight="duotone" />
                  </span>
                  <p className="app-done__title">Application under review</p>
                  <p className="app-done__body">
                    Your application is in. E-board reviews applications on a rolling
                    basis and will email you a decision at the address you gave us.
                    Spots are limited, so not every applicant is accepted each cycle.
                  </p>
                  <Link to="/apply">
                    <Button variant="glass" size="md">
                      Review my answers
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="app-start">
                  <span className="app-start__icon" aria-hidden="true">
                    <ClipboardText size={30} weight="duotone" />
                  </span>
                  <p className="app-start__body">
                    We'll ask about your school details, your year, what you want out of
                    the League, and how you like to work on a team.
                  </p>
                  <ul className="app-start__list">
                    {['Basic info', 'Academic details', 'Short answers'].map((item) => (
                      <li key={item}>
                        <Sparkle size={13} weight="fill" aria-hidden="true" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Link to="/apply">
                    <Button variant="primary" size="md" iconRight={ArrowRight}>
                      {applicationStatus === 'draft'
                        ? 'Continue application'
                        : 'Start application'}
                    </Button>
                  </Link>
                </div>
              )}
            </GlassCard>
          </Reveal>
        </div>

        {/* ---------- team ---------- */}
        <Reveal delay={0.18}>
          <TeamPanel />
        </Reveal>

        {/* ---------- challenge overview ---------- */}
        <Reveal delay={0.2}>
          <h2 className="dash__section-title">What's ahead</h2>
        </Reveal>

        <Stagger className="dash__challenges" gap={0.055}>
          {[
            { name: 'Technical Skills', weight: '20%' },
            { name: 'Build / Project', weight: '15%' },
            { name: 'Resume', weight: '10%' },
            { name: 'Mock Interview', weight: '15%' },
            { name: 'Capstone Hackathon', weight: '40%' },
          ].map((c) => (
            <StaggerItem key={c.name}>
              <GlassCard interactive className="mini-card">
                <span className="mini-card__name">{c.name}</span>
                <span className="mini-card__weight">{c.weight}</span>
              </GlassCard>
            </StaggerItem>
          ))}
        </Stagger>

        <Reveal delay={0.1}>
          <p className="dash__footnote">
            Points post to the leaderboard within a few days of each submission deadline.
            Standings go live once the first challenge round closes.
          </p>
        </Reveal>
      </div>
    </div>
  );
}
