import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  ArrowLeft,
  Check,
  PaperPlaneTilt,
  PencilSimple,
  CloudCheck,
  CircleNotch,
  WarningCircle,
} from '@phosphor-icons/react';
import { useAuth } from '../lib/AuthContext';
import { journey, formatDay, SECTIONS } from '../lib/journey';
import {
  GlassCard,
  Button,
  Field,
  TextInput,
  TextArea,
  Select,
  StatusMessage,
  ErrorSummary,
} from '../components/ui';
import { StatusPill, Timeline } from '../components/Journey';
import PersonalEmailConfirm from '../components/PersonalEmailConfirm';
import './Apply.css';

const YEARS = [
  'Freshman',
  'Sophomore',
  'Junior',
  'Senior',
  "Master's student",
  'PhD student',
];

const MAJORS = [
  'Computer Science',
  'Computer Information Systems',
  'Data Science',
  'Software Engineering',
  'Cybersecurity',
  'Mathematics',
  'Engineering',
  'Other',
];

// Wide on purpose. The first list leaned toward the big-company job titles, which left
// out the people who came to the League to build games, trade, or do research.
const INTERESTS = [
  'Software Engineering',
  'Web Development',
  'Mobile Development',
  'Game Development',
  'Data Science / ML',
  'AI / Machine Learning Research',
  'Quantitative Development / Fintech',
  'Cybersecurity',
  'DevOps / Infrastructure',
  'Cloud Engineering',
  'Embedded Systems / Hardware',
  'Robotics',
  'Data Engineering',
  'Database / Backend Systems',
  'Systems Programming',
  'Computer Graphics / XR',
  'Product Management',
  'UI/UX Design',
  'Business Analytics / Consulting',
  'IT / Systems Administration',
  'QA / Test Engineering',
  'Technical Writing / Developer Relations',
  'Research / Academia',
  'Entrepreneurship / Startups',
  'Still figuring it out',
];

// Teams are 3 or 4 people and every League member competes on one. This only tells
// e-board who still needs help finding people once applications are accepted.
const TEAM_PREFS = [
  { value: 'team', label: 'Help me find a team of 3-4' },
  { value: 'have-team', label: 'I already have teammates in mind' },
];

const COMMITMENTS = [
  { value: '1-2', label: '1-2 hours' },
  { value: '3-5', label: '3-5 hours' },
  { value: '6-8', label: '6-8 hours' },
  { value: '9+', label: '9+ hours' },
];

// The same 2024 SPD-15 categories the member portal asks, so the chapter's numbers line up
// across both. "Prefer not to say" stands alone: ticking it clears the rest, and ticking
// anything else clears it.
const RACE_ETHNICITY = [
  'American Indian or Alaska Native',
  'Asian',
  'Black or African American',
  'Hispanic or Latino',
  'Middle Eastern or North African',
  'Native Hawaiian or Pacific Islander',
  'White',
];
const DECLINE = 'Prefer not to say';

/**
 * Graduation terms, generated from today so the list never goes stale.
 * Starts at the term we're currently in and runs six years out, which
 * covers freshmen through PhD students.
 */
function buildGradTerms(years = 6) {
  const now = new Date();
  const year = now.getFullYear();
  // Jan-Apr = Spring, May-Jul = Summer, Aug-Dec = Fall
  const month = now.getMonth();
  const startIndex = month <= 3 ? 0 : month <= 6 ? 1 : 2;

  const seasons = ['Spring', 'Summer', 'Fall'];
  const terms = [];

  for (let y = 0; y <= years; y++) {
    seasons.forEach((season, s) => {
      // skip terms that already passed this calendar year
      if (y === 0 && s < startIndex) return;
      terms.push(`${season} ${year + y}`);
    });
  }
  return terms;
}

const GRAD_TERMS = buildGradTerms();

const EMPTY = {
  fullName: '',
  personalEmail: '',
  raceEthnicity: [],
  year: '',
  major: '',
  secondMajor: '',
  gradTerm: '',
  interest: '',
  teamPref: '',
  whyJoin: '',
  goals: '',
  experience: '',
  commitment: '',
};

// The four form sections from journey.js, then a review step before the one thing that
// cannot be undone.
const STEPS = [...SECTIONS.map((s) => s.title), 'Review'];
const REVIEW = STEPS.length - 1;

const MIN_WHY = 40;
const AUTOSAVE_MS = 1200;

function answersFrom(application) {
  const answers = application ?? {};
  return Object.fromEntries(Object.keys(EMPTY).map((key) => [key, answers[key] ?? EMPTY[key]]));
}

/** Every answer, grouped as the form asks them. Shared by the review step and the submitted view. */
function AnswerSections({ values, schoolEmail, onEdit }) {
  const groups = [
    [
      ['Full name', values.fullName],
      ['School email', schoolEmail],
      ['Personal email', values.personalEmail],
      ['Race / ethnicity', values.raceEthnicity.join(', ')],
    ],
    [
      ['Year', values.year],
      ['Major', values.major],
      ['Second major', values.secondMajor || 'Not answered (optional)'],
      ['Expected graduation', values.gradTerm],
      ['Area of interest', values.interest],
    ],
    [
      ['Why you want to join', values.whyJoin, true],
      ['What you want out of the semester', values.goals, true],
      ['Experience so far', values.experience || 'Not answered (optional)', true],
    ],
    [
      ['Teammates', TEAM_PREFS.find((t) => t.value === values.teamPref)?.label],
      ['Time per week', COMMITMENTS.find((c) => c.value === values.commitment)?.label],
    ],
  ];

  return (
    <div className="answers">
      {SECTIONS.map((section, i) => {
        const complete = section.done(values);
        return (
          <section key={section.id} className={`answers__section ${complete ? '' : 'is-incomplete'}`} aria-labelledby={`answers-${section.id}`}>
            <div className="answers__head">
              <h3 className="answers__title" id={`answers-${section.id}`}>
                {section.title}
              </h3>
              {onEdit && !complete && (
                <span className="answers__missing">
                  <WarningCircle size={14} weight="fill" aria-hidden="true" /> Needs answers
                </span>
              )}
              {onEdit && (
                <button type="button" className="answers__edit" onClick={() => onEdit(i)}>
                  <PencilSimple size={14} weight="bold" aria-hidden="true" />
                  Edit<span className="sr-only"> {section.title}</span>
                </button>
              )}
            </div>
            <dl className="answers__list">
              {groups[i].map(([label, value, long]) => (
                <div key={label} className={long ? 'is-long' : ''}>
                  <dt>{label}</dt>
                  <dd className="wrap-anywhere">{value || '-'}</dd>
                </div>
              ))}
            </dl>
          </section>
        );
      })}
    </div>
  );
}

function SaveIndicator({ state, savedAt }) {
  if (state === 'saving') {
    return (
      <span className="save-indicator" role="status">
        <CircleNotch size={15} weight="bold" className="btn__spinner" aria-hidden="true" /> Saving
      </span>
    );
  }
  if (state === 'error') {
    return (
      <span className="save-indicator is-error" role="status">
        <WarningCircle size={15} weight="fill" aria-hidden="true" /> Not saved. Check your connection.
      </span>
    );
  }
  if (savedAt) {
    return (
      <span className="save-indicator is-saved" role="status">
        <CloudCheck size={16} weight="fill" aria-hidden="true" /> Saved{' '}
        {savedAt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
      </span>
    );
  }
  return <span className="save-indicator">Saves as you go</span>;
}

export default function Apply() {
  const { session, profile, submitApplication, saveDraft } = useAuth();
  // The account is a verified student address, so it is the school email. Never typed.
  const schoolEmail = session?.email ?? '';
  // Straight from the server: a submitted application is final.
  const submitted = profile?.applicationStatus === 'submitted';

  if (submitted) {
    return <Submitted profile={profile} schoolEmail={schoolEmail} />;
  }
  return (
    <ApplicationForm
      profile={profile}
      schoolEmail={schoolEmail}
      submitApplication={submitApplication}
      saveDraft={saveDraft}
    />
  );
}

/* ---------------- submitted: read-only, status first ---------------- */

function Submitted({ profile, schoolEmail }) {
  const values = answersFrom(profile?.application);
  const j = journey(profile);

  return (
    <div className="apply on-dark">
      <div className="container apply__narrow">
        <div className="apply__header">
          <Link to="/dashboard" className="apply__back">
            <ArrowLeft size={16} weight="bold" aria-hidden="true" />
            Dashboard
          </Link>
        </div>

        <h1 className="apply__title">Your application</h1>

        <GlassCard className={`apply__status tone--${j.tone}`}>
          <div className="apply__status-head">
            <StatusPill tone={j.tone}>{j.label}</StatusPill>
            <span className="apply__status-date">Submitted {formatDay(profile?.submittedAt)}</span>
          </div>
          <Timeline stages={j.stages} tone={j.tone} />
          {values.personalEmail && !profile?.personalEmailVerified && j.key !== 'denied' && (
            <PersonalEmailConfirm email={values.personalEmail} editable={false} compact />
          )}
        </GlassCard>

        <GlassCard className="apply__card">
          <AnswerSections values={values} schoolEmail={schoolEmail} />
          <p className="apply__fineprint">
            Submitted applications cannot be changed. If something needs fixing, email{' '}
            <a href="mailto:official@colorstackatgsu.com">official@colorstackatgsu.com</a>.
          </p>
        </GlassCard>
      </div>
    </div>
  );
}

/* ---------------- the form ---------------- */

function ApplicationForm({ profile, schoolEmail, submitApplication, saveDraft }) {
  const [step, setStep] = useState(0);
  const [furthest, setFurthest] = useState(0);
  // Only the fields the form edits; the school email above is not one of them.
  const [values, setValues] = useState(() => answersFrom(profile?.application));
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');

  const [saveState, setSaveState] = useState('idle'); // 'idle' | 'saving' | 'error'
  const [savedAt, setSavedAt] = useState(null);
  const lastSaved = useRef(JSON.stringify(answersFrom(profile?.application)));

  const summaryRef = useRef(null);
  const topRef = useRef(null);
  const firstRender = useRef(true);

  // Bring the new step into view without yanking the whole window
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [step]);

  const save = useCallback(
    async (next) => {
      const serialized = JSON.stringify(next);
      if (serialized === lastSaved.current) return;
      setSaveState('saving');
      try {
        await saveDraft(next);
        lastSaved.current = serialized;
        setSavedAt(new Date());
        setSaveState('idle');
      } catch {
        setSaveState('error');
      }
    },
    [saveDraft]
  );

  // Autosave: a moment after typing stops, and never while submitting.
  useEffect(() => {
    if (submitting) return undefined;
    const timer = setTimeout(() => save(values), AUTOSAVE_MS);
    return () => clearTimeout(timer);
  }, [values, save, submitting]);

  function set(field, value) {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  }

  function toggleRace(option) {
    const current = values.raceEthnicity;
    let next;
    if (option === DECLINE) {
      next = current.includes(DECLINE) ? [] : [DECLINE];
    } else if (current.includes(option)) {
      next = current.filter((v) => v !== option);
    } else {
      next = [...current.filter((v) => v !== DECLINE), option];
    }
    set('raceEthnicity', next);
  }

  function validateStep(index) {
    const found = {};
    const v = values;

    if (index === 0) {
      if (!v.fullName.trim()) found.fullName = 'Enter your full name.';

      if (!v.personalEmail.trim()) {
        found.personalEmail = 'Enter a personal email.';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.personalEmail.trim())) {
        found.personalEmail = 'Enter a valid email address.';
      } else if (v.personalEmail.trim().toLowerCase() === schoolEmail.toLowerCase()) {
        // A student address can lapse after graduation, which is exactly when
        // recruiters follow up, so the two have to differ.
        found.personalEmail = 'Use a different address from your school email.';
      }

      if (v.raceEthnicity.length === 0) {
        found.raceEthnicity = 'Choose at least one option, or "Prefer not to say".';
      }
    }

    if (index === 1) {
      if (!v.year) found.year = 'Select your year.';
      if (!v.major) found.major = 'Select your major.';
      // Optional, but picking the same thing twice is a slip, not a double major.
      if (v.secondMajor && v.secondMajor === v.major) {
        found.secondMajor = 'Pick a different major from your first one.';
      }
      if (!v.gradTerm) found.gradTerm = 'Select your expected graduation term.';
      if (!v.interest) found.interest = 'Pick the area you are most interested in.';
    }

    if (index === 2) {
      if (!v.whyJoin.trim()) {
        found.whyJoin = 'Tell us why you want to join.';
      } else if (v.whyJoin.trim().length < MIN_WHY) {
        found.whyJoin = `Give us a bit more, at least ${MIN_WHY} characters.`;
      }
      if (!v.goals.trim()) found.goals = 'Tell us what you want to get out of the League.';
    }

    if (index === 3) {
      if (!v.teamPref) found.teamPref = 'Let us know how you are finding teammates.';
      if (!v.commitment) found.commitment = 'Select your expected time commitment.';
    }

    return found;
  }

  function goTo(index) {
    setErrors({});
    setActionError('');
    setStep(index);
    setFurthest((f) => Math.max(f, index));
  }

  function goNext() {
    const found = validateStep(step);
    setErrors(found);

    if (Object.keys(found).length > 0) {
      // Focus the summary so screen readers announce all problems at once
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    save(values);
    goTo(step + 1);
  }

  const emailConfirmed =
    Boolean(profile?.personalEmailVerified) &&
    (profile?.application?.personalEmail ?? '').toLowerCase() === values.personalEmail.trim().toLowerCase();
  const incomplete = SECTIONS.filter((s) => !s.done(values));
  const canSubmit = incomplete.length === 0 && emailConfirmed;

  async function onSubmit() {
    setSubmitting(true);
    setActionError('');
    try {
      await submitApplication(values);
      window.scrollTo({ top: 0 });
    } catch (error) {
      setActionError(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  function jumpToField(field) {
    const el = document.getElementById(field);
    el?.focus();
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  const progress = (step / REVIEW) * 100;

  return (
    <div className="apply on-dark">
      <div className="container apply__narrow" ref={topRef}>
        <div className="apply__header">
          <Link to="/dashboard" className="apply__back">
            <ArrowLeft size={16} weight="bold" aria-hidden="true" />
            Dashboard
          </Link>
          <SaveIndicator state={saveState} savedAt={savedAt} />
        </div>

        <h1 className="apply__title">Apply to the ColorStack Tech League</h1>
        <p className="apply__subtitle">
          About 10 minutes. Your answers save as you go, and you will see everything once more
          before you submit.
        </p>

        {/* step rail: completed steps are links back */}
        <nav className="apply__rail" aria-label="Application steps">
          <ol className="apply__rail-list">
            {STEPS.map((title, i) => {
              const done = i < REVIEW ? SECTIONS[i].done(values) && i !== step : false;
              const reachable = i <= furthest || done;
              return (
                <li
                  key={title}
                  className={`apply__rail-item ${i === step ? 'is-current' : ''} ${done ? 'is-done' : ''}`}
                >
                  <button
                    type="button"
                    className="apply__rail-button"
                    onClick={() => goTo(i)}
                    disabled={!reachable || i === step}
                    aria-current={i === step ? 'step' : undefined}
                  >
                    <span className="apply__rail-dot" aria-hidden="true">
                      {done ? <Check size={15} weight="bold" /> : i + 1}
                    </span>
                    <span className="apply__rail-label">{title}</span>
                    {done && <span className="sr-only"> (complete)</span>}
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="apply__rail-track" aria-hidden="true">
            <motion.div
              className="apply__rail-fill"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </nav>

        <GlassCard className="apply__card">
          <ErrorSummary errors={errors} onJump={jumpToField} headingRef={summaryRef} />

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -18 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="apply__step"
            >
              <h2 className="apply__step-title">
                <span className="apply__step-count">
                  Step {step + 1} of {STEPS.length}
                </span>
                {step === REVIEW ? 'Review and submit' : STEPS[step]}
              </h2>

              {/* ---------- About you ---------- */}
              {step === 0 && (
                <>
                  <Field label="Full name" htmlFor="fullName" required error={errors.fullName}>
                    {({ errorId }) => (
                      <TextInput
                        id="fullName"
                        name="fullName"
                        autoComplete="name"
                        placeholder="Jordan Rivera"
                        value={values.fullName}
                        invalid={Boolean(errors.fullName)}
                        aria-describedby={errors.fullName ? errorId : undefined}
                        onChange={(e) => set('fullName', e.target.value)}
                      />
                    )}
                  </Field>

                  <Field
                    label="School email"
                    htmlFor="schoolEmail"
                    helper="From your account, already confirmed."
                  >
                    {({ helperId }) => (
                      <TextInput
                        id="schoolEmail"
                        name="schoolEmail"
                        type="email"
                        value={schoolEmail}
                        readOnly
                        disabled
                        aria-describedby={helperId}
                      />
                    )}
                  </Field>

                  <div className="apply__email-group">
                    <Field
                      label="Personal email"
                      htmlFor="personalEmail"
                      required
                      error={errors.personalEmail}
                      helper="Where we send your decision. Your .edu address stops working after you graduate."
                    >
                      {({ errorId, helperId }) => (
                        <TextInput
                          id="personalEmail"
                          name="personalEmail"
                          type="email"
                          inputMode="email"
                          autoComplete="home email"
                          autoCapitalize="none"
                          spellCheck="false"
                          placeholder="jordan.rivera@gmail.com"
                          value={values.personalEmail}
                          invalid={Boolean(errors.personalEmail)}
                          aria-describedby={errors.personalEmail ? errorId : helperId}
                          onChange={(e) => set('personalEmail', e.target.value)}
                        />
                      )}
                    </Field>
                    {values.personalEmail.trim().toLowerCase() !== schoolEmail.toLowerCase() && (
                      <PersonalEmailConfirm email={values.personalEmail} />
                    )}
                  </div>

                  <fieldset className="apply__fieldset" id="raceEthnicity">
                    <legend className="field__label">
                      How do you identify?
                      <span className="field__required" aria-hidden="true">
                        *
                      </span>
                    </legend>
                    <p className="field__helper">
                      Choose all that apply. Only League admins see this. It is how the chapter
                      reports who the League serves, and it never affects whether you are
                      accepted.
                    </p>
                    <div className="apply__options">
                      {[...RACE_ETHNICITY, DECLINE].map((option) => {
                        const checked = values.raceEthnicity.includes(option);
                        return (
                          <label
                            key={option}
                            className={`apply__option ${checked ? 'is-selected' : ''}`}
                          >
                            <input
                              type="checkbox"
                              name="raceEthnicity"
                              value={option}
                              checked={checked}
                              onChange={() => toggleRace(option)}
                            />
                            <span>{option}</span>
                          </label>
                        );
                      })}
                    </div>
                    {errors.raceEthnicity && (
                      <p className="field__error" role="alert">
                        <span>{errors.raceEthnicity}</span>
                      </p>
                    )}
                  </fieldset>
                </>
              )}

              {/* ---------- Academics ---------- */}
              {step === 1 && (
                <>
                  <div className="apply__row">
                    <Field label="Year" htmlFor="year" required error={errors.year}>
                      {({ errorId }) => (
                        <Select
                          id="year"
                          name="year"
                          value={values.year}
                          invalid={Boolean(errors.year)}
                          aria-describedby={errors.year ? errorId : undefined}
                          onChange={(e) => set('year', e.target.value)}
                        >
                          <option value="">Select your year</option>
                          {YEARS.map((y) => (
                            <option key={y} value={y}>
                              {y}
                            </option>
                          ))}
                        </Select>
                      )}
                    </Field>

                    <Field label="Major" htmlFor="major" required error={errors.major}>
                      {({ errorId }) => (
                        <Select
                          id="major"
                          name="major"
                          value={values.major}
                          invalid={Boolean(errors.major)}
                          aria-describedby={errors.major ? errorId : undefined}
                          onChange={(e) => {
                            set('major', e.target.value);
                            // The second list hides whatever the first one holds, so a
                            // second major that just became the primary would vanish from
                            // the options while still sitting in state.
                            if (values.secondMajor === e.target.value) set('secondMajor', '');
                          }}
                        >
                          <option value="">Select your major</option>
                          {MAJORS.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </Select>
                      )}
                    </Field>
                  </div>

                  <div className="apply__row">
                    <Field
                      label="Second major"
                      htmlFor="secondMajor"
                      helper="Only if you are double majoring."
                      error={errors.secondMajor}
                    >
                      {({ helperId, errorId }) => (
                        <Select
                          id="secondMajor"
                          name="secondMajor"
                          value={values.secondMajor}
                          invalid={Boolean(errors.secondMajor)}
                          aria-describedby={errors.secondMajor ? errorId : helperId}
                          onChange={(e) => set('secondMajor', e.target.value)}
                        >
                          <option value="">None</option>
                          {MAJORS.filter((m) => m !== values.major).map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </Select>
                      )}
                    </Field>

                    <Field
                      label="Expected graduation"
                      htmlFor="gradTerm"
                      required
                      error={errors.gradTerm}
                    >
                      {({ errorId }) => (
                        <Select
                          id="gradTerm"
                          name="gradTerm"
                          value={values.gradTerm}
                          invalid={Boolean(errors.gradTerm)}
                          aria-describedby={errors.gradTerm ? errorId : undefined}
                          onChange={(e) => set('gradTerm', e.target.value)}
                        >
                          <option value="">Select your graduation term</option>
                          {GRAD_TERMS.map((term) => (
                            <option key={term} value={term}>
                              {term}
                            </option>
                          ))}
                        </Select>
                      )}
                    </Field>
                  </div>

                  <Field
                    label="What area interests you most?"
                    htmlFor="interest"
                    required
                    error={errors.interest}
                  >
                    {({ errorId }) => (
                      <Select
                        id="interest"
                        name="interest"
                        value={values.interest}
                        invalid={Boolean(errors.interest)}
                        aria-describedby={errors.interest ? errorId : undefined}
                        onChange={(e) => set('interest', e.target.value)}
                      >
                        <option value="">Select an area</option>
                        {INTERESTS.map((i) => (
                          <option key={i} value={i}>
                            {i}
                          </option>
                        ))}
                      </Select>
                    )}
                  </Field>
                </>
              )}

              {/* ---------- Short answers ---------- */}
              {step === 2 && (
                <>
                  <Field
                    label="Why do you want to be part of the ColorStack Tech League?"
                    htmlFor="whyJoin"
                    required
                    error={errors.whyJoin}
                    helper={
                      values.whyJoin.trim().length < MIN_WHY
                        ? `${values.whyJoin.trim().length} of at least ${MIN_WHY} characters. A few honest sentences is perfect.`
                        : `${values.whyJoin.trim().length} characters. Looks good.`
                    }
                  >
                    {({ errorId, helperId }) => (
                      <TextArea
                        id="whyJoin"
                        name="whyJoin"
                        rows={5}
                        placeholder="What made you want to join? Be honest, there's no right answer."
                        value={values.whyJoin}
                        invalid={Boolean(errors.whyJoin)}
                        aria-describedby={errors.whyJoin ? errorId : helperId}
                        onChange={(e) => set('whyJoin', e.target.value)}
                      />
                    )}
                  </Field>

                  <Field
                    label="What do you want to get out of the semester?"
                    htmlFor="goals"
                    required
                    error={errors.goals}
                    helper="An internship, interview reps, a project for your portfolio, community, whatever it actually is."
                  >
                    {({ errorId, helperId }) => (
                      <TextArea
                        id="goals"
                        name="goals"
                        rows={4}
                        placeholder="By the end of the semester, I want to..."
                        value={values.goals}
                        invalid={Boolean(errors.goals)}
                        aria-describedby={errors.goals ? errorId : helperId}
                        onChange={(e) => set('goals', e.target.value)}
                      />
                    )}
                  </Field>

                  <Field
                    label="Tell us about your experience so far"
                    htmlFor="experience"
                    helper="Optional. Classes, projects, languages, past internships, or nothing yet, which is completely fine."
                  >
                    {({ helperId }) => (
                      <TextArea
                        id="experience"
                        name="experience"
                        rows={4}
                        placeholder="I've taken CSC 2720, built a couple of small projects in Python..."
                        value={values.experience}
                        aria-describedby={helperId}
                        onChange={(e) => set('experience', e.target.value)}
                      />
                    )}
                  </Field>
                </>
              )}

              {/* ---------- Logistics ---------- */}
              {step === 3 && (
                <>
                  <fieldset className="apply__fieldset">
                    <legend className="field__label">
                      How are you finding teammates?
                      <span className="field__required" aria-hidden="true">
                        *
                      </span>
                    </legend>
                    <p className="field__helper">
                      Every League member competes on a team of 3 or 4. You pick or form one
                      after you are accepted.
                    </p>
                    <div className="apply__options" id="teamPref">
                      {TEAM_PREFS.map((pref) => (
                        <label
                          key={pref.value}
                          className={`apply__option ${
                            values.teamPref === pref.value ? 'is-selected' : ''
                          }`}
                        >
                          <input
                            type="radio"
                            name="teamPref"
                            value={pref.value}
                            checked={values.teamPref === pref.value}
                            onChange={(e) => set('teamPref', e.target.value)}
                          />
                          <span>{pref.label}</span>
                        </label>
                      ))}
                    </div>
                    {errors.teamPref && (
                      <p className="field__error" role="alert">
                        <span>{errors.teamPref}</span>
                      </p>
                    )}
                  </fieldset>

                  <Field
                    label="How much time can you realistically give per week?"
                    htmlFor="commitment"
                    required
                    error={errors.commitment}
                    helper="Be honest. This helps us pair teams fairly."
                  >
                    {({ errorId, helperId }) => (
                      <Select
                        id="commitment"
                        name="commitment"
                        value={values.commitment}
                        invalid={Boolean(errors.commitment)}
                        aria-describedby={errors.commitment ? errorId : helperId}
                        onChange={(e) => set('commitment', e.target.value)}
                      >
                        <option value="">Select an option</option>
                        {COMMITMENTS.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </Select>
                    )}
                  </Field>
                </>
              )}

              {/* ---------- Review ---------- */}
              {step === REVIEW && (
                <>
                  <p className="apply__review-lead">
                    Take one last look. Once you submit, your answers are locked while e-board
                    reviews them.
                  </p>

                  <AnswerSections values={values} schoolEmail={schoolEmail} onEdit={goTo} />

                  <div className="checklist" aria-labelledby="checklist-title">
                    <h3 className="checklist__title" id="checklist-title">
                      Before you submit
                    </h3>
                    <ul className="checklist__list">
                      <li className={incomplete.length === 0 ? 'is-done' : ''}>
                        <span className="checklist__mark" aria-hidden="true">
                          {incomplete.length === 0 ? <Check size={13} weight="bold" /> : null}
                        </span>
                        {incomplete.length === 0
                          ? 'Every required question is answered'
                          : `Finish ${incomplete.map((s) => s.title).join(', ')}`}
                      </li>
                      <li className={emailConfirmed ? 'is-done' : ''}>
                        <span className="checklist__mark" aria-hidden="true">
                          {emailConfirmed ? <Check size={13} weight="bold" /> : null}
                        </span>
                        Personal email confirmed
                      </li>
                    </ul>
                    {!emailConfirmed && values.personalEmail && (
                      <PersonalEmailConfirm email={values.personalEmail} />
                    )}
                  </div>

                  <p className="apply__notice">
                    <strong>Your resume is shared with League partners.</strong> Any resume
                    you upload goes into the resume book partner recruiters use for
                    internships. To take yours out, delete it from your dashboard. Resumes
                    are deleted about a month after the season ends.
                  </p>
                </>
              )}
            </motion.div>
          </AnimatePresence>

          {actionError && <StatusMessage tone="error">{actionError}</StatusMessage>}

          <div className="apply__actions">
            <div className="apply__actions-left">
              {step > 0 && (
                <Button variant="ghost" size="md" icon={ArrowLeft} onClick={() => goTo(step - 1)}>
                  Back
                </Button>
              )}
            </div>
            <div className="apply__actions-right">
              {step === REVIEW ? (
                <Button
                  variant="primary"
                  size="md"
                  icon={PaperPlaneTilt}
                  loading={submitting}
                  disabled={!canSubmit}
                  onClick={onSubmit}
                >
                  Submit application
                </Button>
              ) : (
                <Button variant="primary" size="md" iconRight={ArrowRight} onClick={goNext}>
                  {step === REVIEW - 1 ? 'Review answers' : 'Continue'}
                </Button>
              )}
            </div>
          </div>
          {step === REVIEW && !canSubmit && (
            <p className="apply__blocked" role="status">
              {incomplete.length > 0
                ? 'Finish the sections marked above to submit.'
                : 'Confirm your personal email to submit. Open the link we sent you.'}
            </p>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
