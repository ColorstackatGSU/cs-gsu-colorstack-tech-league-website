import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  Code,
  Rocket,
  FileText,
  Trophy,
} from '@phosphor-icons/react';
import { GlassCard, Button, Badge, SectionHeading } from '../components/ui';
import {
  Reveal,
  Stagger,
  StaggerItem,
  RevealText,
  useIsSmallScreen,
} from '../components/Motion';
import PartnerCarousel from '../components/PartnerCarousel';
import { mountDoodles } from '../doodles/doodles.js';
import './Landing.css';
import '../doodles/doodles.css';

/* Content mirrors the official Program Overview & Scoring Guide. */

const CHALLENGES = [
  {
    icon: Code,
    name: 'Kickoff Cup',
    weight: '15%',
    points: '100 pts',
    blurb:
      'A mini hackathon tied into the Tech League scoring system, featuring US Soccer. All teams participate.',
    scoring: [
      'Functionality: 40',
      'Technical difficulty: 20',
      'Design/UX: 15',
      'Presentation: 15',
      'Creativity: 10',
    ],
  },
  {
    icon: Rocket,
    name: 'Design Derby',
    weight: '15%',
    points: '100 pts',
    blurb:
      'Ship a working mini-project against a design/build prompt over a set window. Submit a demo plus your repo.',
    scoring: [
      'Functionality: 40',
      'Technical difficulty: 20',
      'Design/UX: 15',
      'Presentation: 15',
      'Creativity: 10',
    ],
  },
  {
    icon: FileText,
    name: 'Crew Clash',
    weight: '15%',
    points: '100 pts',
    blurb:
      "A workshop-to-challenge event built around AWS's Kiro and Kiro Crew platform. Teams learn the tool, then apply it to a live multi-step build task, judged by AWS.",
    scoring: [
      'Functionality: 40',
      'Technical execution: 25',
      'Presentation: 15',
      'Creativity: 10',
      'Teamwork: 10',
    ],
  },
  {
    icon: Trophy,
    name: 'Hack in the Box',
    weight: '15%',
    points: '100 pts',
    blurb:
      'A beginner-friendly Capture The Flag challenge. Teams solve a series of security puzzles (cryptography, basic exploits, password cracking, etc.) to find hidden flags within a set time window.',
    scoring: [
      'Flags solved / correctness: 50',
      'Speed (time bonus): 20',
      'Write-up / documentation quality: 20',
      'Teamwork/collaboration: 10',
    ],
  },
  {
    icon: Trophy,
    name: 'Championship Round',
    weight: '40%',
    points: '100 pts',
    blurb:
      'The centerpiece. Every partner org in one room: a themed prompt, a build window, then live demos to partner reps and e-board.',
    scoring: [],
    featured: true,
  },
];

const PHASES = [
  {
    phase: 'Kickoff',
    week: 'Sept 30',
    title: 'Kickoff Cup',
    body: 'A mini hackathon featuring US Soccer. Compete in a team of 3-4, meet the other orgs, and get your scorecard. Teams lock after kickoff so scoring stays consistent.',
  },
  {
    phase: 'Phase 2',
    week: 'October 14',
    title: 'Design Derby',
    body: 'The first scored challenge, run with a partner organization. Submit proof, get scored on the rubric, and watch your points post to the leaderboard.',
  },
  {
    phase: 'Phase 3',
    week: 'October 23',
    title: 'Crew Clash',
    body: "A live head-to-head night with AWS. Everyone competes in the same room on the same prompt, learning and building with AWS's Kiro and Kiro Crew platform, with points on the board that evening.",
  },
  {
    phase: 'Phase 4',
    week: 'November 6',
    title: 'Hack in the Box',
    body: 'The second scored challenge: a beginner-friendly Capture The Flag competition, so you get reps in front of a new set of mentors and judges.',
  },
  {
    phase: 'Finale',
    week: 'Dec 4 · 12-6pm',
    title: 'Championship Round',
    body: 'The centerpiece. Every partner org together in one room with its own sponsors: a themed prompt at noon, six hours to build, then live demos and Q&A with the judging panel. Final standings and prizes follow.',
  },
];

export default function Landing() {
  const heroRef = useRef(null);
  const reduce = useReducedMotion();
  const small = useIsSmallScreen();

  // Decorative notebook doodles in the side gutters. Returns its own cleanup.
  useEffect(() => mountDoodles(), []);

  // Scroll-linked motion is desktop-only. On a phone the viewport is short
  // enough that a drifting, fading hero still covers the section below it,
  // which is what made the sections look like they were overlapping.
  const still = reduce || small;

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  // Hero drifts and fades as you scroll past it
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '22%']);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);

  // Background orb parallax, tied to overall page scroll. Decorative layers
  // only; foreground text never moves. Different rates sell the depth.
  const { scrollYProgress: pageScroll } = useScroll();
  const orbOneY = useTransform(pageScroll, [0, 1], ['0%', '-14%']);
  const orbTwoY = useTransform(pageScroll, [0, 1], ['0%', '-26%']);

  return (
    <div className="landing">
      <motion.div
        className="landing__orb landing__orb--one"
        aria-hidden="true"
        style={still ? undefined : { y: orbOneY }}
      />
      <motion.div
        className="landing__orb landing__orb--two"
        aria-hidden="true"
        style={still ? undefined : { y: orbTwoY }}
      />

      {/* ---------------- Hero ---------------- */}
      <section className="hero" ref={heroRef}>
        <motion.div
          className="hero__inner container"
          style={still ? undefined : { y: heroY, opacity: heroOpacity }}
        >
          <GlassCard className="hero__window">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <p className="hero__status">
              Fall semester &middot; Applications open
            </p>
          </motion.div>

          <RevealText
            className="hero__title"
            text="ColorStack Tech League"
            delay={0.16}
          />

          <motion.p
            className="hero__subtitle"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.5 }}
          >
            The Tech League is a semester-long competition at Georgia State
            where you earn points through five types of challenges. Track your rank
            on a live leaderboard and wrap up with a mini hackathon.
            It's built to help you gain job-ready skills naturally, no last-minute cramming needed.
          </motion.p>

          <motion.div
            className="hero__actions"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.62 }}
          >
            <Link to="/signup">
              <Button variant="primary" size="lg" iconRight={ArrowRight}>
                Apply to the League
              </Button>
            </Link>
            <a href="#challenges">
              <Button variant="glass" size="lg">
                See the challenges
              </Button>
            </a>
          </motion.div>

          <motion.dl
            className="hero__stats"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.8 }}
          >
            {[
              { value: '5', label: 'Challenge types' },
              { value: '550', label: 'Points on the board' },
              { value: '3-4', label: 'Members per team' },
              { value: '1', label: 'Capstone hackathon' },
            ].map((stat) => (
              <div className="hero__stat" key={stat.label}>
                <dt className="hero__stat-value">{stat.value}</dt>
                <dd className="hero__stat-label">{stat.label}</dd>
              </div>
            ))}
          </motion.dl>
          </GlassCard>
        </motion.div>

        <div className="hero__scroll-hint" aria-hidden="true">
          <span className="hero__scroll-line" />
        </div>
      </section>

      {/* ---------------- Challenges ---------------- */}
      <section className="section on-dark" id="challenges">
        <div className="container">
          <SectionHeading
            eyebrow="The five challenges"
            title="Every challenge builds one specific skill"
            subtitle="Each one has its own rubric and point value. Your raw points convert to a percentage of that category's max, then get weighted into a composite score out of 100, so one rough round never tanks your standing."
          />

          <Stagger className="challenges__grid" gap={0.06}>
            {CHALLENGES.map((challenge) => (
              <StaggerItem key={challenge.name}>
                <GlassCard
                  interactive
                                    className={`challenge ${challenge.featured ? 'challenge--featured' : ''}`}
                >
                  <div className="challenge__head">
                    <span className="challenge__icon" aria-hidden="true">
                      <challenge.icon size={24} weight="duotone" />
                    </span>
                    <Badge tone={challenge.featured ? 'accent' : 'neutral'}>
                      {challenge.weight} of final
                    </Badge>
                  </div>

                  <h3 className="challenge__name">{challenge.name}</h3>
                  <p className="challenge__blurb">{challenge.blurb}</p>

                  <div className="challenge__scoring">
                    {challenge.scoring.length > 0 ? (
                      <>
                        <p className="challenge__scoring-label">
                          Scored on <span>{challenge.points}</span>
                        </p>
                        <ul className="challenge__list">
                          {challenge.scoring.map((line) => (
                            <li key={line}>{line}</li>
                          ))}
                        </ul>
                      </>
                    ) : (
                      <p className="challenge__scoring-label">
                        Scoring breakdown still being finalized.
                      </p>
                    )}
                  </div>
                </GlassCard>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ---------------- Timeline ---------------- */}
      <section className="section on-dark" id="timeline">
        <div className="container">
          <SectionHeading
            eyebrow="How it runs"
            title="Five milestones, one semester"
          />

          <Stagger className="timeline" gap={0.09}>
            {PHASES.map((phase) => (
              <StaggerItem key={phase.phase}>
                <div className="timeline__row">
                  <div className="timeline__marker" aria-hidden="true">
                    <span className="timeline__dot" />
                    <span className="timeline__line" />
                  </div>
                  <GlassCard interactive className="timeline__card">
                    <div className="timeline__meta">
                      <span className="timeline__phase">{phase.phase}</span>
                      <Badge tone="neutral">{phase.week}</Badge>
                    </div>
                    <h3 className="timeline__title">{phase.title}</h3>
                    <p className="timeline__body">{phase.body}</p>
                  </GlassCard>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ---------------- Partners ---------------- */}
      <section className="section on-dark" id="partners">
        <div className="container">
          <SectionHeading
            eyebrow="Built together"
            title="This isn't just a ColorStack thing"
            subtitle="The Tech League is a team effort between ColorStack, CS Club, and progsu! Every org brings in its own members, mentors, and experiences allowing the League to reach way more people than any single club could on its own."
          />
          <Reveal>
            <PartnerCarousel />
          </Reveal>
        </div>
      </section>

      {/* ---------------- CTA ---------------- */}
      <section className="section on-dark">
        <div className="container">
          <Reveal>
            <GlassCard interactive className="cta">
              <span className="cta__glow" aria-hidden="true" />
              <Badge tone="accent" icon={Trophy}>
                Spots are limited
              </Badge>
              <h2 className="cta__title">Ready to apply?</h2>
              <p className="cta__body">
                Create your account, upload your resume so partner recruiters can find
                you, and submit your application. It takes about five minutes. E-board
                reviews applications on a rolling basis and emails every applicant a
                decision.
              </p>
              <div className="cta__actions">
                <Link to="/signup">
                  <Button variant="primary" size="lg" iconRight={ArrowRight}>
                    Start your application
                  </Button>
                </Link>
                <Link to="/login">
                  <Button variant="glass" size="lg">
                    I already have one
                  </Button>
                </Link>
              </div>
            </GlassCard>
          </Reveal>
        </div>
      </section>

      <footer className="footer">
        <div className="container footer__inner">
          <p>ColorStack Tech League &middot; Georgia State University</p>
          <p className="footer__note">
            Scoring rubrics are starting templates and may be finalized by e-board before
            kickoff.
          </p>
        </div>
      </footer>
    </div>
  );
}
