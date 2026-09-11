import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Trophy,
  Info,
  CaretDown,
  ArrowRight,
  WarningCircle,
} from '@phosphor-icons/react';
import { GlassCard, Button, Badge, SectionHeading } from '../components/ui';
import { Reveal } from '../components/Motion';
import { fetchStandings, subscribeToStandings } from '../lib/authStore';
import { EVENTS, getEvent, rankTeams, formatScore, TOTAL_WEIGHT } from '../lib/season';
import './Leaderboard.css';

const MEDALS = { 1: 'gold', 2: 'silver', 3: 'bronze' };

function RankCell({ rank }) {
  const medal = MEDALS[rank];
  return (
    <span className={`lb-rank ${medal ? `lb-rank--${medal}` : ''}`}>
      {medal && <Trophy size={15} weight="fill" aria-hidden="true" />}
      {rank}
    </span>
  );
}

/** Per-event detail for one team, revealed by the row toggle. */
function TeamBreakdown({ team }) {
  return (
    <div className="lb-detail">
      <ul className="lb-detail__list">
        {team.breakdown.map((b) => {
          const event = getEvent(b.eventId);
          if (!event) return null;
          return (
            <li key={b.eventId} className="lb-detail__row">
              <div className="lb-detail__meta">
                <span className="lb-detail__name">{event.name}</span>
                <span className="lb-detail__weight">{event.weight}% weight</span>
              </div>

              {b.played ? (
                <>
                  <span className="lb-detail__bar" aria-hidden="true">
                    <span
                      className="lb-detail__fill"
                      style={{ '--pct': `${b.pct}%` }}
                    />
                  </span>
                  <span className="lb-detail__nums">
                    <span className="lb-detail__raw">
                      {b.raw}/{event.max}
                    </span>
                    <span className="lb-detail__weighted">
                      +{formatScore(b.weighted)}
                    </span>
                  </span>
                </>
              ) : (
                <>
                  <span className="lb-detail__bar lb-detail__bar--empty" aria-hidden="true" />
                  <span className="lb-detail__nums">
                    <span className="lb-detail__pending">
                      {event.status === 'tbd' ? 'TBD' : 'Not played'}
                    </span>
                  </span>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function TeamRow({ team, expanded, onToggle, maxComposite }) {
  const panelId = `lb-detail-${team.id}`;

  return (
    <li className={`lb-row ${expanded ? 'lb-row--open' : ''}`}>
      <button
        type="button"
        className="lb-row__main"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={panelId}
      >
        <RankCell rank={team.rank} />

        <span className="lb-row__team">
          <span className="lb-row__name">{team.name}</span>
          <span className="lb-row__meta">
            {team.members} {team.members === 1 ? 'member' : 'members'}
          </span>
        </span>

        <span className="lb-row__track" aria-hidden="true">
          <span
            className="lb-row__trackfill"
            style={{
              '--pct': `${maxComposite > 0 ? (team.composite / maxComposite) * 100 : 0}%`,
            }}
          />
        </span>

        <span className="lb-row__score">
          <span className="lb-row__composite">{formatScore(team.composite)}</span>
          <span className="lb-row__outof">/ {formatScore(team.earnedWeight)}</span>
        </span>

        <CaretDown
          size={18}
          weight="bold"
          className="lb-row__caret"
          aria-hidden="true"
        />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            id={panelId}
            key="detail"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <TeamBreakdown team={team} />
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

export default function Leaderboard() {
  const [state, setState] = useState({ status: 'loading', teams: [], isPreview: false });
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    let alive = true;
    fetchStandings()
      .then((data) => {
        if (!alive) return;
        setState({ status: 'ready', teams: data.teams, isPreview: data.isPreview });
      })
      .catch(() => {
        if (!alive) return;
        setState({ status: 'error', teams: [], isPreview: false });
      });
    // Live updates: an admin saving a score in this tab or another one
    // pushes straight into the board without a refresh.
    const unsubscribe = subscribeToStandings((next) => {
      if (!alive) return;
      setState((cur) => ({ ...cur, status: 'ready', teams: next.teams }));
    });

    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);

  const ranked = useMemo(() => rankTeams(state.teams), [state.teams]);
  const maxComposite = ranked.length > 0 ? ranked[0].composite : 0;

  // How much of the season has actually been decided. Every team plays the
  // same events, so reading it off the leader is accurate.
  const decidedWeight = ranked.length > 0 ? ranked[0].earnedWeight : 0;
  const scoredEvents = EVENTS.filter((e) => e.status === 'complete');

  return (
    <main className="leaderboard">
      <section className="section leaderboard__hero on-dark">
        <div className="container">
          <Reveal>
            <Badge tone="accent" icon={Trophy}>
              Fall 2026 Season
            </Badge>
            <h1 className="leaderboard__title">Leaderboard</h1>
            <p className="leaderboard__lede">
              Composite scores out of 100, weighted across all five events. Expand any
              team to see how their points were earned.
            </p>

            <div className="leaderboard__stats">
              <div className="lb-stat">
                <span className="lb-stat__value">{formatScore(decidedWeight)}</span>
                <span className="lb-stat__label">
                  of {TOTAL_WEIGHT} points decided
                </span>
              </div>
              <div className="lb-stat">
                <span className="lb-stat__value">{scoredEvents.length}</span>
                <span className="lb-stat__label">
                  of {EVENTS.length} events scored
                </span>
              </div>
              <div className="lb-stat">
                <span className="lb-stat__value">{ranked.length}</span>
                <span className="lb-stat__label">teams competing</span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section on-dark">
        <div className="container">
          {state.isPreview && (
            <Reveal>
              <p className="lb-preview" role="note">
                <Info size={17} weight="fill" aria-hidden="true" />
                <span>
                  <strong>Preview data.</strong> These standings are placeholders for
                  layout. Real scores post after each event.
                </span>
              </p>
            </Reveal>
          )}

          {state.status === 'loading' && (
            <GlassCard className="lb-card">
              <ul className="lb-list lb-list--loading" aria-live="polite" aria-busy="true">
                <li className="sr-only">Loading standings…</li>
                {Array.from({ length: 6 }).map((_, i) => (
                  <li key={i} className="lb-skeleton" aria-hidden="true">
                    <span className="lb-skeleton__bar" />
                  </li>
                ))}
              </ul>
            </GlassCard>
          )}

          {state.status === 'error' && (
            <GlassCard className="lb-card">
              <p className="lb-empty">
                <WarningCircle size={22} weight="fill" aria-hidden="true" />
                Standings could not be loaded. Refresh to try again.
              </p>
            </GlassCard>
          )}

          {state.status === 'ready' && ranked.length === 0 && (
            <GlassCard className="lb-card">
              <p className="lb-empty">
                <Trophy size={22} weight="fill" aria-hidden="true" />
                No scores posted yet. First results go up after the Kickoff Cup on
                Sept 30.
              </p>
            </GlassCard>
          )}

          {state.status === 'ready' && ranked.length > 0 && (
            <Reveal>
              <GlassCard className="lb-card" title="standings.csv">
                <div className="lb-head" aria-hidden="true">
                  <span>Rank</span>
                  <span>Team</span>
                  <span className="lb-head__score">Composite</span>
                </div>
                <ul className="lb-list">
                  {ranked.map((team) => (
                    <TeamRow
                      key={team.id}
                      team={team}
                      expanded={openId === team.id}
                      onToggle={() =>
                        setOpenId((cur) => (cur === team.id ? null : team.id))
                      }
                      maxComposite={maxComposite}
                    />
                  ))}
                </ul>
                <p className="lb-foot">
                  Composite is shown out of the {formatScore(decidedWeight)} points
                  decided so far, not the full {TOTAL_WEIGHT}. Unplayed events are
                  excluded rather than counted as zero.
                </p>
              </GlassCard>
            </Reveal>
          )}
        </div>
      </section>

      <section className="section on-dark">
        <div className="container">
          <SectionHeading
            eyebrow="How it adds up"
            title="Scoring, in short"
            subtitle="Raw points become a percentage of the event max, then get weighted into the composite."
          />
          <Reveal>
            <ul className="lb-weights">
              {EVENTS.map((e) => (
                <li key={e.id} className="lb-weight">
                  <span className="lb-weight__pct">{e.weight}%</span>
                  <span className="lb-weight__name">{e.name}</span>
                  <span className="lb-weight__event">{e.phase} · {e.date}</span>
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal>
            <div className="lb-more">
              <Link to="/scoring">
                <Button variant="ghost" size="lg" iconRight={ArrowRight}>
                  Full scoring system
                </Button>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
