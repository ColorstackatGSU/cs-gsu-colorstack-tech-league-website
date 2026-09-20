import { useState, useRef, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadSimple,
  FilePdf,
  Trash,
  DownloadSimple,
  Eye,
  HourglassMedium,
  CheckCircle,
  ArrowRight,
  WarningCircle,
  ClipboardText,
  PencilSimpleLine,
  MagnifyingGlass,
  Confetti,
  UsersThree,
  HandHeart,
  Trophy,
  Check,
} from '@phosphor-icons/react';
import { useAuth, displayName } from '../lib/AuthContext';
import { RESUME_DOWNLOAD_URL, RESUME_VIEW_URL } from '../lib/authStore';
import { journey, formatDay, SECTIONS } from '../lib/journey';
import { EVENTS } from '../lib/season';
import { GlassCard, Button, Badge, StatusMessage } from '../components/ui';
import { Reveal } from '../components/Motion';
import { Timeline, StatusPill } from '../components/Journey';
import PersonalEmailConfirm from '../components/PersonalEmailConfirm';
import TeamPanel from '../components/TeamPanel';
import './Dashboard.css';

// The API refuses anything larger: Vercel caps a request body at 4.5 MB.
const MAX_BYTES = 4 * 1024 * 1024;
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

function scrollToTeam() {
  document.getElementById('team')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * The one card that answers "where do I stand, and what do I do now?". Everything about
 * the application lives here, so the rest of the dashboard never has to repeat it.
 */
function StatusHero({ profile, session }) {
  const j = journey(profile);
  const application = profile?.application;
  const firstName = (profile?.fullName ?? '').trim().split(/\s+/)[0];
  const personal = application?.personalEmail;
  const decisionTo = profile?.personalEmailVerified && personal ? personal : session?.email;

  const content = {
    start: {
      icon: ClipboardText,
      title: 'Apply to the League',
      body: 'It takes about 10 minutes and saves as you go, so you can stop and finish later on any device. E-board reviews on a rolling basis, so sooner is better.',
      action: { to: '/apply', label: 'Start application' },
    },
    draft: {
      icon: PencilSimpleLine,
      title: 'Finish your application',
      body: 'Everything you have written so far is saved. Pick up where you left off.',
      action: { to: '/apply', label: 'Continue application' },
    },
    review: {
      icon: MagnifyingGlass,
      title: 'Your application is under review',
      body: (
        <>
          Submitted {formatDay(profile?.submittedAt)}. When e-board decides, this page changes
          and we email <strong className="wrap-anywhere">{decisionTo}</strong>. There is nothing
          you need to do until then.
        </>
      ),
      secondary: { to: '/apply', label: 'View what you submitted' },
    },
    accepted: {
      icon: Confetti,
      title: firstName ? `You're in, ${firstName}` : "You're in the League",
      body: 'Welcome to the season. Your next step is getting on a team of 3 or 4 before the first challenge: start one, or ask to join one that has room.',
      action: { onClick: scrollToTeam, label: 'Get on a team' },
      secondary: { to: '/teams', label: 'Browse all teams' },
    },
    'on-team': {
      icon: UsersThree,
      title: "You're all set",
      body: (
        <>
          You are on <strong>{profile?.team?.name}</strong>. Points post to the leaderboard
          within a few days of each challenge.
        </>
      ),
      action: { to: '/leaderboard', label: 'See the leaderboard', icon: Trophy },
      secondary: { onClick: scrollToTeam, label: 'Manage your team' },
    },
    waitlisted: {
      icon: HourglassMedium,
      title: "You're on the waitlist",
      body: (
        <>
          Spots are full right now. If one opens, this page updates and we email{' '}
          <strong className="wrap-anywhere">{decisionTo}</strong>. Nothing to do until then.
        </>
      ),
      secondary: { to: '/apply', label: 'View what you submitted' },
    },
    denied: {
      icon: HandHeart,
      title: "We couldn't offer you a spot this season",
      body: 'Spots were limited, and this is not a judgment of your potential. Every ColorStack at GSU event stays open to you, and we hope you apply again next season.',
    },
  }[j.key];

  const Icon = content.icon;
  const renderAction = (a, variant) => {
    if (!a) return null;
    const button = (
      <Button variant={variant} size="md" icon={a.icon} iconRight={variant === 'primary' && !a.icon ? ArrowRight : undefined} onClick={a.onClick}>
        {a.label}
      </Button>
    );
    return a.to ? <Link to={a.to}>{button}</Link> : button;
  };

  return (
    <GlassCard className={`status-hero tone--${j.tone}`} aria-labelledby="status-title">
      <div className="status-hero__top">
        <span className="status-hero__icon" aria-hidden="true">
          <Icon size={34} weight="duotone" />
        </span>
        <div className="status-hero__copy">
          <StatusPill tone={j.tone}>{j.label}</StatusPill>
          <h2 className="status-hero__title" id="status-title">
            {content.title}
          </h2>
          <p className="status-hero__body">{content.body}</p>

          {j.key === 'draft' && application && (
            <ul className="status-hero__sections" aria-label="Application sections">
              {SECTIONS.map((s) => {
                const done = s.done(application);
                return (
                  <li key={s.id} className={done ? 'is-done' : ''}>
                    {done ? <Check size={13} weight="bold" aria-hidden="true" /> : <span className="status-hero__sections-dot" aria-hidden="true" />}
                    {s.title}
                    <span className="sr-only">{done ? ' (done)' : ' (not done)'}</span>
                  </li>
                );
              })}
            </ul>
          )}

          {(content.action || content.secondary) && (
            <div className="status-hero__actions">
              {renderAction(content.action, 'primary')}
              {renderAction(content.secondary, content.action ? 'ghost' : 'glass')}
            </div>
          )}

          {profile?.applicationStatus === 'submitted' && personal && !profile.personalEmailVerified && j.key !== 'denied' && (
            <div className="status-hero__notice">
              <p className="status-hero__notice-lead">
                Want decisions at <strong className="wrap-anywhere">{personal}</strong> instead? Confirm it first.
              </p>
              <PersonalEmailConfirm email={personal} editable={false} compact />
            </div>
          )}
        </div>
      </div>

      <div className="status-hero__timeline">
        <Timeline stages={j.stages} tone={j.tone} />
      </div>
    </GlassCard>
  );
}

export default function Dashboard() {
  const { session, profile, uploadResume, deleteResume } = useAuth();
  const [removing, setRemoving] = useState(false);
  const location = useLocation();
  const isWelcome = location.state?.welcome;

  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [justUploaded, setJustUploaded] = useState(false);
  const inputRef = useRef(null);

  const resume = profile?.resume ?? null;

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
          `That file is ${formatSize(file.size)}. Please upload a PDF under 4 MB.`
        );
        return;
      }

      setUploading(true);
      uploadResume(file)
        .then(() => {
          setJustUploaded(true);
          setTimeout(() => setJustUploaded(false), 4200);
        })
        .catch((error) => setUploadError(error.message))
        .finally(() => {
          setUploading(false);
          // Lets the same file be chosen again after a failed upload.
          if (inputRef.current) inputRef.current.value = '';
        });
    },
    [uploadResume]
  );

  function onDrop(event) {
    event.preventDefault();
    setDragging(false);
    handleFile(event.dataTransfer.files?.[0]);
  }

  async function onRemove() {
    setUploadError('');
    setJustUploaded(false);
    setRemoving(true);
    try {
      await deleteResume();
    } catch (error) {
      setUploadError(error.message);
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="dash on-dark">
      <div className="dash__orb" aria-hidden="true" />

      <div className="container dash__inner">
        {/* ---------- header ---------- */}
        <Reveal className="dash__header">
          <div>
            <span className="dash__greeting">{isWelcome ? 'Welcome,' : 'Welcome back,'}</span>
            <h1 className="dash__name wrap-anywhere">{displayName(session)}</h1>
          </div>
        </Reveal>

        {isWelcome && (
          <StatusMessage tone="success">
            Your email is confirmed and your account is ready. Here is where things stand.
          </StatusMessage>
        )}

        {/* ---------- status ---------- */}
        <Reveal delay={0.05}>
          <StatusHero profile={profile} session={session} />
        </Reveal>

        {/* ---------- team, once it is open to them ---------- */}
        {profile?.teamEligible && (
          <Reveal delay={0.08}>
            <div id="team" className="dash__anchor">
              <TeamPanel />
            </div>
          </Reveal>
        )}

        <div className="dash__grid">
          {/* ---------- resume ---------- */}
          <Reveal delay={0.1} className="dash__col">
            <GlassCard className="panel">
              <div className="panel__head">
                <div>
                  <h2 className="panel__title">Your resume</h2>
                  <p className="panel__subtitle">
                    Goes into the book League partners use when recruiting for internships.
                    Optional, but it is how recruiters find you. Delete it any time to take
                    it out.
                  </p>
                </div>
                {resume ? (
                  <StatusPill tone="success" icon={CheckCircle}>
                    In the resume book
                  </StatusPill>
                ) : (
                  <StatusPill tone="neutral">Not uploaded</StatusPill>
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
                        {formatSize(resume.size)} &middot;{' '}
                        {resume.source === 'colorstack' ? 'Copied from ColorStack' : 'Uploaded'}{' '}
                        {formatDate(resume.uploadedAt)}
                      </p>
                    </div>
                    <div className="resume-file__actions">
                      <a
                        href={RESUME_VIEW_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn--glass btn--sm"
                      >
                        <Eye size={17} weight="bold" aria-hidden="true" />
                        <span>View</span>
                      </a>
                      <a
                        href={RESUME_DOWNLOAD_URL}
                        className="btn btn--ghost btn--sm"
                        aria-label="Download your resume"
                      >
                        <DownloadSimple size={17} weight="bold" aria-hidden="true" />
                      </a>
                      <Button
                        variant="danger"
                        size="sm"
                        icon={Trash}
                        loading={removing}
                        onClick={onRemove}
                      >
                        Remove
                      </Button>
                    </div>
                    {resume.source === 'colorstack' && (
                      <p className="resume-file__note">
                        We copied this from your ColorStack at GSU profile and keep our own
                        copy. Deleting it in the portal does not delete it here; remove it
                        here too if you want it gone. Upload a new one to replace it.
                      </p>
                    )}
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
                      <p className="dropzone__hint">PDF only &middot; up to 4 MB</p>

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
                  Resume saved. It is in the partner resume book now.
                </StatusMessage>
              )}
            </GlassCard>
          </Reveal>

          {/* ---------- season ---------- */}
          <Reveal delay={0.14} className="dash__col">
            <GlassCard className="panel">
              <div className="panel__head">
                <div>
                  <h2 className="panel__title">The season</h2>
                  <p className="panel__subtitle">
                    Five scored events, played as a team. Points post within a few days of
                    each one.
                  </p>
                </div>
                <Link to="/scoring" className="dash__text-link">
                  How scoring works
                </Link>
              </div>

              <ol className="season-list">
                {EVENTS.map((e) => (
                  <li key={e.id} className={`season-list__item is-${e.status}`}>
                    <span className="season-list__date">{e.date}</span>
                    <span className="season-list__name">
                      {e.name}
                      {e.status === 'complete' && (
                        <Badge tone="neutral" className="season-list__badge">
                          Done
                        </Badge>
                      )}
                    </span>
                    <span className="season-list__weight">{e.weight}%</span>
                  </li>
                ))}
              </ol>
            </GlassCard>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
