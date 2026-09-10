import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  FloppyDisk,
  PaperPlaneTilt,
  Clock,
} from '@phosphor-icons/react';
import { useAuth } from '../lib/AuthContext';
import {
  GlassCard,
  Button,
  Field,
  TextInput,
  TextArea,
  Select,
  Badge,
  StatusMessage,
  ErrorSummary,
} from '../components/ui';
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

const INTERESTS = [
  'Software Engineering',
  'Data Science / ML',
  'Cybersecurity',
  'Product Management',
  'DevOps / Infrastructure',
  'Mobile Development',
  'UI/UX Design',
  'Still figuring it out',
];

const TEAM_PREFS = [
  { value: 'team', label: 'Put me on a team of 2-4' },
  { value: 'solo', label: 'I want to compete solo' },
  { value: 'have-team', label: 'I already have a team' },
  { value: 'either', label: 'Either works for me' },
];

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
  schoolEmail: '',
  personalEmail: '',
  year: '',
  major: '',
  gradTerm: '',
  interest: '',
  teamPref: '',
  whyJoin: '',
  goals: '',
  experience: '',
  commitment: '',
  consentShare: false,
};

const STEPS = [
  { id: 0, title: 'About you', fields: ['fullName', 'schoolEmail', 'personalEmail'] },
  { id: 1, title: 'Academics', fields: ['year', 'major', 'gradTerm', 'interest'] },
  { id: 2, title: 'Short answers', fields: ['whyJoin', 'goals', 'experience'] },
  { id: 3, title: 'Logistics', fields: ['teamPref', 'commitment', 'consentShare'] },
];

const MIN_WHY = 40;

export default function Apply() {
  const { profile, submitApplication, saveDraft } = useAuth();

  const [step, setStep] = useState(0);
  const [values, setValues] = useState(() => ({ ...EMPTY, ...profile?.application }));
  const [errors, setErrors] = useState({});
  const [saved, setSaved] = useState('');
  const [submitted, setSubmitted] = useState(profile?.applicationStatus === 'submitted');

  const summaryRef = useRef(null);
  const topRef = useRef(null);

  // Bring the new step into view without yanking the whole window
  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [step]);

  function set(field, value) {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  }

  function validateStep(index) {
    const found = {};
    const v = values;

    if (index === 0) {
      if (!v.fullName.trim()) found.fullName = 'Enter your full name.';
      if (!v.schoolEmail.trim()) {
        found.schoolEmail = 'Enter your school email.';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.schoolEmail.trim())) {
        found.schoolEmail = 'Enter a valid email address.';
      } else if (!/\.edu$/i.test(v.schoolEmail.trim())) {
        found.schoolEmail = 'Please use your school (.edu) email address.';
      }

      if (!v.personalEmail.trim()) {
        found.personalEmail = 'Enter a personal email.';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.personalEmail.trim())) {
        found.personalEmail = 'Enter a valid email address.';
      } else if (
        v.personalEmail.trim().toLowerCase() === v.schoolEmail.trim().toLowerCase()
      ) {
        // A student address can lapse after graduation, which is exactly when
        // recruiters follow up, so the two have to differ.
        found.personalEmail = 'Use a different address from your school email.';
      }
    }

    if (index === 1) {
      if (!v.year) found.year = 'Select your year.';
      if (!v.major) found.major = 'Select your major.';
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
      if (!v.teamPref) found.teamPref = 'Let us know how you want to compete.';
      if (!v.commitment) found.commitment = 'Select your expected time commitment.';
    }

    return found;
  }

  function goNext() {
    const found = validateStep(step);
    setErrors(found);

    if (Object.keys(found).length > 0) {
      // Focus the summary so screen readers announce all problems at once
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }

    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
      setSaved('');
    } else {
      submitApplication(values);
      setSubmitted(true);
    }
  }

  function goBack() {
    setErrors({});
    setSaved('');
    if (step > 0) setStep((s) => s - 1);
  }

  function onSaveDraft() {
    saveDraft(values);
    setSaved('Draft saved. You can come back and finish later.');
    setTimeout(() => setSaved(''), 4200);
  }

  function jumpToField(field) {
    const el = document.getElementById(field);
    el?.focus();
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /* ---------------- submitted state ---------------- */

  if (submitted) {
    return (
      <div className="apply on-dark" id="main">
        <div className="container apply__narrow">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <GlassCard className="apply__done">
              <span className="apply__done-icon" aria-hidden="true">
                <Clock size={44} weight="duotone" />
              </span>
              <h1 className="apply__done-title">Application received</h1>
              <p className="apply__done-body">
                Thanks, {values.fullName.split(' ')[0] || 'for applying'}. E-board reviews
                applications on a rolling basis and will email a decision to{' '}
                <strong className="wrap-anywhere">
                  {values.personalEmail || values.schoolEmail}
                </strong>
                . Spots are limited, so not every applicant is accepted each cycle.
              </p>

              <div className="apply__recap">
                <h2 className="apply__recap-title">What you told us</h2>
                <dl className="apply__recap-list">
                  {[
                    ['Name', values.fullName],
                    ['School email', values.schoolEmail],
                    ['Personal email', values.personalEmail],
                    ['Year', values.year],
                    ['Major', values.major],
                    ['Graduating', values.gradTerm],
                    ['Interest', values.interest],
                    [
                      'Competing',
                      TEAM_PREFS.find((t) => t.value === values.teamPref)?.label ?? '-',
                    ],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd className="wrap-anywhere">{value || '-'}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              {!profile?.resume && (
                <StatusMessage tone="error">
                  You have not uploaded a resume yet. Recruiters use it to reach out about
                  internships. Add it from your dashboard.
                </StatusMessage>
              )}

              <div className="apply__done-actions">
                <Link to="/dashboard">
                  <Button variant="primary" size="md" iconRight={ArrowRight}>
                    Back to dashboard
                  </Button>
                </Link>
                <Button
                  variant="glass"
                  size="md"
                  onClick={() => {
                    setSubmitted(false);
                    setStep(0);
                  }}
                >
                  Edit my answers
                </Button>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    );
  }

  /* ---------------- form ---------------- */

  const current = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="apply on-dark" id="main">
      <div className="container apply__narrow" ref={topRef}>
        <div className="apply__header">
          <Link to="/dashboard" className="apply__back">
            <ArrowLeft size={16} weight="bold" aria-hidden="true" />
            Dashboard
          </Link>
          <Badge tone="neutral">
            Step {step + 1} of {STEPS.length}
          </Badge>
        </div>

        <h1 className="apply__title">Apply to the ColorStack Tech League</h1>
        <p className="apply__subtitle">
          A few questions so e-board knows who you are and what you want out of the
          semester. Spots are limited and applications are reviewed on a rolling
          basis.
        </p>

        {/* step rail */}
        <div className="apply__rail">
          <ol className="apply__rail-list">
            {STEPS.map((s, i) => (
              <li
                key={s.id}
                className={`apply__rail-item ${i === step ? 'is-current' : ''} ${
                  i < step ? 'is-done' : ''
                }`}
                aria-current={i === step ? 'step' : undefined}
              >
                <span className="apply__rail-dot" aria-hidden="true">
                  {i < step ? <CheckCircle size={15} weight="fill" /> : i + 1}
                </span>
                <span className="apply__rail-label">{s.title}</span>
              </li>
            ))}
          </ol>
          <div className="apply__rail-track" aria-hidden="true">
            <motion.div
              className="apply__rail-fill"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </div>

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
              <h2 className="apply__step-title">{current.title}</h2>

              {/* ---------- Step 0 ---------- */}
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
                    required
                    error={errors.schoolEmail}
                    helper="Use your GSU address so we can verify you're a student."
                  >
                    {({ errorId, helperId }) => (
                      <TextInput
                        id="schoolEmail"
                        name="schoolEmail"
                        type="email"
                        inputMode="email"
                        autoComplete="school email"
                        autoCapitalize="none"
                        spellCheck="false"
                        placeholder="jrivera1@student.gsu.edu"
                        value={values.schoolEmail}
                        invalid={Boolean(errors.schoolEmail)}
                        aria-describedby={errors.schoolEmail ? errorId : helperId}
                        onChange={(e) => set('schoolEmail', e.target.value)}
                      />
                    )}
                  </Field>

                  <Field
                    label="Personal email"
                    htmlFor="personalEmail"
                    required
                    error={errors.personalEmail}
                    helper="Where we'll send decisions and program updates. Your .edu address stops working after you graduate."
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
                </>
              )}

              {/* ---------- Step 1 ---------- */}
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
                          onChange={(e) => set('major', e.target.value)}
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

              {/* ---------- Step 2 ---------- */}
              {step === 2 && (
                <>
                  <Field
                    label="Why do you want to be part of the ColorStack Tech League?"
                    htmlFor="whyJoin"
                    required
                    error={errors.whyJoin}
                    helper={`${values.whyJoin.trim().length} characters. Aim for a few honest sentences.`}
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

              {/* ---------- Step 3 ---------- */}
              {step === 3 && (
                <>
                  <fieldset className="apply__fieldset">
                    <legend className="field__label">
                      How do you want to compete?
                      <span className="field__required" aria-hidden="true">
                        *
                      </span>
                    </legend>
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
                        <option value="1-2">1-2 hours</option>
                        <option value="3-5">3-5 hours</option>
                        <option value="6-8">6-8 hours</option>
                        <option value="9+">9+ hours</option>
                      </Select>
                    )}
                  </Field>

                  <label className="apply__consent">
                    <input
                      type="checkbox"
                      checked={values.consentShare}
                      onChange={(e) => set('consentShare', e.target.checked)}
                    />
                    <span>
                      <strong>Share my profile with partner recruiters.</strong> If I'm a
                      top performer, ColorStack can share my resume and standing with
                      partner recruiting contacts for internship opportunities. Optional,
                      and I can change this later.
                    </span>
                  </label>
                </>
              )}
            </motion.div>
          </AnimatePresence>

          {saved && <StatusMessage tone="success">{saved}</StatusMessage>}

          <div className="apply__actions">
            <div className="apply__actions-left">
              {step > 0 && (
                <Button variant="ghost" size="md" icon={ArrowLeft} onClick={goBack}>
                  Back
                </Button>
              )}
            </div>
            <div className="apply__actions-right">
              <Button variant="glass" size="md" icon={FloppyDisk} onClick={onSaveDraft}>
                Save draft
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={goNext}
                iconRight={step === STEPS.length - 1 ? undefined : ArrowRight}
                icon={step === STEPS.length - 1 ? PaperPlaneTilt : undefined}
              >
                {step === STEPS.length - 1 ? 'Submit application' : 'Continue'}
              </Button>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
