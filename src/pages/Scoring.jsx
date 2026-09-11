import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Trophy,
  Microphone,
  Info,
  CheckCircle,
  Clock,
  Question,
} from '@phosphor-icons/react';
import { useAuth } from '../lib/AuthContext';
import { GlassCard, Button, Badge, SectionHeading } from '../components/ui';
import { Reveal, Stagger, StaggerItem } from '../components/Motion';
import { EVENTS, COMBINE, TOTAL_WEIGHT } from '../lib/season';
import './Scoring.css';

/* Content mirrors the Fall 2026 Scoring System guide. Data lives in
   src/lib/season.js so the leaderboard scores against the same rules. */

const STATUS_META = {
  complete: { label: 'Scored', tone: 'accent', icon: CheckCircle },
  upcoming: { label: 'Upcoming', tone: 'neutral', icon: Clock },
  tbd: { label: 'Details TBD', tone: 'neutral', icon: Question },
};

function EventCard({ event, index }) {
  const meta = STATUS_META[event.status] ?? STATUS_META.upcoming;
  const StatusIcon = meta.icon;

  return (
    <GlassCard
      interactive
      className={`score-event ${event.featured ? 'score-event--featured' : ''}`}
    >
      <div className="score-event__head">
        <span className="score-event__order" aria-hidden="true">
          {index + 1}
        </span>
        <div className="score-event__headings">
          <div className="score-event__weightline">
            <span className="score-event__weight">{event.weight}%</span>
            <span className="score-event__of">of final</span>
          </div>
          <h3 className="score-event__name">{event.name}</h3>
          <p className="score-event__event">
            {event.phase}
            {event.date && <span className="score-event__date"> · {event.date}</span>}
          </p>
        </div>
        <Badge tone={meta.tone} icon={StatusIcon}>
          {meta.label}
        </Badge>
      </div>

      <p className="score-event__blurb">{event.blurb}</p>

      {event.rubric.length > 0 ? (
        <div className="score-event__rubric">
          <p className="score-event__rubric-title">
            Scored on {event.max} pts
          </p>
          <ul className="score-event__criteria">
            {event.rubric.map((c) => (
              <li key={c.label} className="score-criterion">
                <span className="score-criterion__label">{c.label}</span>
                <span className="score-criterion__bar" aria-hidden="true">
                  <span
                    className="score-criterion__fill"
                    style={{ '--pct': `${(c.points / event.max) * 100}%` }}
                  />
                </span>
                <span className="score-criterion__points">{c.points}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="score-event__tbd">
          <Info size={16} weight="fill" aria-hidden="true" />
          {event.tbdNote}
        </p>
      )}
    </GlassCard>
  );
}

export default function Scoring() {
  // Standings are members-only, so signed-out visitors get pointed at signup
  // rather than bounced through a login redirect.
  const { isAuthed } = useAuth();

  return (
    <main className="scoring">
      {/* ---------------- Header ---------------- */}
      <section className="section scoring__hero on-dark">
        <div className="container">
          <Reveal>
            <Badge tone="accent" icon={Trophy}>
              Fall 2026 Season
            </Badge>
            <h1 className="scoring__title">Scoring System</h1>
            <p className="scoring__lede">
              Every challenge builds one specific skill. Each one has its own rubric and
              point value. Your raw points convert to a percentage of that category's
              max, then get weighted into a composite score out of 100, so one rough
              round never tanks your standing.
            </p>
            <p className="scoring__confirm">
              <CheckCircle size={18} weight="fill" aria-hidden="true" />
              AWS is confirmed on board for the season.
            </p>
            <div className="scoring__actions">
              <Link to={isAuthed ? '/leaderboard' : '/signup'}>
                <Button variant="primary" size="lg" iconRight={ArrowRight}>
                  {isAuthed ? 'View the leaderboard' : 'Apply to the League'}
                </Button>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------------- How the math works ---------------- */}
      <section className="section on-dark">
        <div className="container">
          <Reveal>
            <GlassCard className="scoring__math" title="how_scoring_works.txt">
              <ol className="scoring__steps">
                <li>
                  <span className="scoring__step-n" aria-hidden="true">1</span>
                  <div>
                    <h3>Earn raw points</h3>
                    <p>
                      Each event is judged on its own rubric, out of 100 points.
                    </p>
                  </div>
                </li>
                <li>
                  <span className="scoring__step-n" aria-hidden="true">2</span>
                  <div>
                    <h3>Convert to a percentage</h3>
                    <p>
                      Your raw score becomes a percentage of that event's max, so
                      rubrics with different shapes stay comparable.
                    </p>
                  </div>
                </li>
                <li>
                  <span className="scoring__step-n" aria-hidden="true">3</span>
                  <div>
                    <h3>Apply the weight</h3>
                    <p>
                      That percentage is multiplied by the event's weight and added to
                      your composite. A bad round costs you that event's weight, and
                      never more than that.
                    </p>
                  </div>
                </li>
              </ol>
              <p className="scoring__formula" aria-label="Composite equals the sum over events of raw divided by max, times weight.">
                <code>composite = Σ (raw ÷ max) × weight</code>
              </p>
            </GlassCard>
          </Reveal>
        </div>
      </section>

      {/* ---------------- Season order / events ---------------- */}
      <section className="section on-dark" id="events">
        <div className="container">
          <SectionHeading
            eyebrow="Season order"
            title="Five events, one composite"
            subtitle="Listed in the order they run. Weights add up to 100%."
          />
          <Stagger className="scoring__events" gap={0.07}>
            {EVENTS.map((event, i) => (
              <StaggerItem key={event.id}>
                <EventCard event={event} index={i} />
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ---------------- Weight summary ---------------- */}
      <section className="section on-dark" id="weights">
        <div className="container">
          <SectionHeading eyebrow="At a glance" title="Weight summary" />
          <Reveal>
            <GlassCard className="weights">
              <div className="weights__scroll">
                <table className="weights__table">
                  <caption className="sr-only">
                    Weight of each scored event toward the final composite score
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Phase</th>
                      <th scope="col">Event</th>
                      <th scope="col" className="weights__num">Weight</th>
                    </tr>
                  </thead>
                  <tbody>
                    {EVENTS.map((e) => (
                      <tr key={e.id}>
                        <th scope="row">{e.phase}</th>
                        <td>
                          {e.name}
                          {e.status === 'tbd' && ' (TBD)'}
                        </td>
                        <td className="weights__num">
                          <span className="weights__pill">{e.weight}%</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <th scope="row" colSpan={2}>Total</th>
                      <td className="weights__num">
                        <span className="weights__pill weights__pill--total">
                          {TOTAL_WEIGHT}%
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </GlassCard>
          </Reveal>
        </div>
      </section>

      {/* ---------------- The Combine ---------------- */}
      <section className="section on-dark" id="combine">
        <div className="container">
          <Reveal>
            <GlassCard className="combine">
              <div className="combine__head">
                <Badge tone="neutral" icon={Microphone}>
                  Parallel track
                </Badge>
                <h2 className="combine__title">{COMBINE.name}</h2>
              </div>
              <p className="combine__body">{COMBINE.blurb}</p>
              <p className="combine__note">
                <Info size={16} weight="fill" aria-hidden="true" />
                {COMBINE.note}
              </p>
            </GlassCard>
          </Reveal>
        </div>
      </section>

      {/* ---------------- CTA ---------------- */}
      <section className="section on-dark">
        <div className="container">
          <Reveal>
            <GlassCard interactive className="scoring__cta">
              <span className="cta__glow" aria-hidden="true" />
              <h2 className="scoring__cta-title">
                #1 — top of the board?
              </h2>
              <p className="scoring__cta-body">That could be your team on Dec 4.</p>
              <div className="scoring__cta-actions">
                {isAuthed && (
                  <Link to="/leaderboard">
                    <Button variant="primary" size="lg" iconRight={ArrowRight}>
                      See the standings
                    </Button>
                  </Link>
                )}
                <Link to="/signup">
                  <Button
                    variant={isAuthed ? 'ghost' : 'primary'}
                    size="lg"
                    iconRight={isAuthed ? undefined : ArrowRight}
                  >
                    Apply to the League
                  </Button>
                </Link>
              </div>
            </GlassCard>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
