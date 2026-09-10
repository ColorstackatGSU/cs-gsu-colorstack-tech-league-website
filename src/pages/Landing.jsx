import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  Code,
  Rocket,
  FileText,
  Microphone,
  Trophy,
  Sparkle,
} from '@phosphor-icons/react';
import { GlassCard, Button, Badge, SectionHeading } from '../components/ui';
import { Reveal, Stagger, StaggerItem, RevealText } from '../components/Motion';
import PartnerCarousel from '../components/PartnerCarousel';
import './Landing.css';

/* Content mirrors the official Program Overview & Scoring Guide. */

const CHALLENGES = [
  {
    icon: Code,
    name: 'Technical Skills',
    weight: '20%',
    points: '100 pts',
    blurb:
      'A timed set of 3-5 LeetCode-style problems tied to data structures, algorithms, and SQL. Solo work rolls up into your team total.',
    scoring: ['Correctness: 60', 'Efficiency: 20', 'Code quality: 20'],
  },
  {
    icon: Rocket,
    name: 'Build / Project',
    weight: '15%',
    points: '100 pts',
    blurb:
      'Ship a working mini-project against a prompt over a 1-2 week window. Submit a demo plus your repo.',
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
    name: 'Resume',
    weight: '10%',
    points: '100 pts',
    blurb:
      'Structured review against a standardized rubric by e-board or visiting partner reps. Resubmit to earn improvement points.',
    scoring: [
      'Impact statements: 30',
      'Relevance: 25',
      'Technical depth: 25',
      'Formatting: 20',
    ],
  },
  {
    icon: Microphone,
    name: 'Mock Interview',
    weight: '15%',
    points: '100 pts',
    blurb:
      '20-30 minute technical or behavioral interviews run by partner volunteers and trained upperclassmen.',
    scoring: [
      'Problem-solving / STAR: 35',
      'Communication: 25',
      'Answer quality: 25',
      'Composure: 15',
    ],
  },
  {
    icon: Trophy,
    name: 'Capstone Hackathon',
    weight: '40%',
    points: '150 pts',
    blurb:
      'The centerpiece. A themed prompt, a fixed afternoon build window, then live demos to partner reps and e-board.',
    scoring: [
      'Functionality: 50',
      'Technical execution: 30',
      'Presentation: 30',
      'Creativity: 20',
      'Teamwork: 20',
    ],
    featured: true,
  },
];

const PHASES = [
  {
    phase: 'Phase 1',
    week: 'Week 1',
    title: 'Kickoff',
    body: 'Register solo or in teams of 2-4. Teams lock after kickoff so scoring stays consistent. Everyone gets a scorecard.',
  },
  {
    phase: 'Phase 2',
    week: 'Weeks 2-6',
    title: 'Challenge Rounds',
    body: 'A new challenge drops each week or two. Submit proof, get scored on the rubric, watch points post to the leaderboard.',
  },
  {
    phase: 'Phase 3',
    week: 'Week of 9/28',
    title: 'Capstone Mini Hackathon',
    body: 'One afternoon. A themed prompt at the start, 3-4 hours to build, then a live demo and Q&A with the judging panel.',
  },
  {
    phase: 'Phase 4',
    week: 'Wrap-up',
    title: 'Awards',
    body: 'Points total up, final standings go live, prizes go out, and top performers get shared with partner recruiters, with your consent.',
  },
];

export default function Landing() {
  const heroRef = useRef(null);
  const reduce = useReducedMotion();

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
        style={reduce ? undefined : { y: orbOneY }}
      />
      <motion.div
        className="landing__orb landing__orb--two"
        aria-hidden="true"
        style={reduce ? undefined : { y: orbTwoY }}
      />

      {/* ---------------- Hero ---------------- */}
      <section className="hero" ref={heroRef}>
        <motion.div
          className="hero__inner container"
          style={reduce ? undefined : { y: heroY, opacity: heroOpacity }}
        >
          <GlassCard className="hero__window">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge tone="accent" icon={Sparkle}>
              Fall semester &middot; Applications open
            </Badge>
          </motion.div>

          <RevealText
            className="hero__title"
            text="Get the reps that get you hired."
            delay={0.16}
          />

          <motion.p
            className="hero__subtitle"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.5 }}
          >
            The ColorStack Tech League is a semester-long, points-based program at
            Georgia State. Five challenge types, one live leaderboard, and a capstone
            hackathon judged by partner engineers, built so the skills that get people
            hired stop being a thing you cram for.
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
              { value: '2-4', label: 'Members per team' },
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
                    <p className="challenge__scoring-label">
                      Scored on <span>{challenge.points}</span>
                    </p>
                    <ul className="challenge__list">
                      {challenge.scoring.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
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
            title="Four phases, one semester"
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
            subtitle="The Tech League runs on a partnership between ColorStack, ProGSU, CS Club, and NSBE. Each org brings its own members, mentors, and judges, which is why the League reaches further than any one club could on its own."
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
