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
  Sparkle,
  ClipboardText,
  Clock,
  Confetti,
  UsersThree,
} from '@phosphor-icons/react';
import { useAuth, displayName } from '../lib/AuthContext';
import { RESUME_DOWNLOAD_URL, RESUME_VIEW_URL } from '../lib/authStore';
import { GlassCard, Button, Badge, StatusMessage } from '../components/ui';
import { Reveal, Stagger, StaggerItem } from '../components/Motion';
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
  const applicationStatus = profile?.applicationStatus ?? 'not-started';
  const decision = profile?.decision ?? null;

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

  const steps = [
    { done: true, label: 'Account created' },
    { done: Boolean(resume), label: 'Resume uploaded' },
    { done: applicationStatus === 'submitted', label: 'Application sent' },
    { done: Boolean(profile?.team), label: 'On a team' },
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
            <h1 className="dash__name wrap-anywhere">{displayName(session)}</h1>
          </div>
          <Badge tone={completed === steps.length ? 'success' : 'accent'}>
            {completed} of {steps.length} steps complete
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
                animate={{ width: `${(completed / steps.length) * 100}%` }}
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
                    Every resume goes into the book League partners use when recruiting
                    for internships. Keep it current, or delete it to take it out.
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
                {applicationStatus === 'submitted' && decision === 'accepted' && (
                  <Badge tone="success" icon={CheckCircle}>
                    Accepted
                  </Badge>
                )}
                {applicationStatus === 'submitted' && decision === 'waitlisted' && (
                  <Badge tone="accent" icon={HourglassMedium}>
                    Waitlisted
                  </Badge>
                )}
                {applicationStatus === 'submitted' && decision === 'denied' && (
                  <Badge tone="neutral">Decided</Badge>
                )}
                {applicationStatus === 'submitted' && !decision && (
                  <Badge tone="accent" icon={Clock}>
                    Under review
                  </Badge>
                )}
                {applicationStatus === 'draft' && <Badge tone="neutral">Draft saved</Badge>}
              </div>

              {applicationStatus === 'submitted' && decision === 'accepted' ? (
                <div className="app-done">
                  <span className="app-done__icon" aria-hidden="true">
                    <Confetti size={36} weight="duotone" />
                  </span>
                  <p className="app-done__title">You&apos;re in the League</p>
                  <p className="app-done__body">
                    Welcome to the season. Next, get on a team of 3 or 4: start one below, or
                    find a team with room.
                  </p>
                  <Link to="/teams">
                    <Button variant="primary" size="md" icon={UsersThree}>
                      Browse teams
                    </Button>
                  </Link>
                </div>
              ) : applicationStatus === 'submitted' && decision === 'waitlisted' ? (
                <div className="app-done">
                  <span className="app-done__icon" aria-hidden="true">
                    <HourglassMedium size={36} weight="duotone" />
                  </span>
                  <p className="app-done__title">You&apos;re on the waitlist</p>
                  <p className="app-done__body">
                    Spots this season are full right now. If one opens, we will email you
                    straight away and you can join a team from here. Nothing to do until then.
                  </p>
                </div>
              ) : applicationStatus === 'submitted' && decision === 'denied' ? (
                <div className="app-done">
                  <p className="app-done__title">Thank you for applying</p>
                  <p className="app-done__body">
                    Spots this season were limited and we could not offer you one this time.
                    We emailed you the details, and we hope you apply again next season.
                  </p>
                </div>
              ) : applicationStatus === 'submitted' ? (
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
