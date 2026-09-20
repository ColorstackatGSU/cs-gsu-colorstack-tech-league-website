import { useEffect, useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Trophy,
  CaretDown,
  ArrowRight,
  WarningCircle,
} from '@phosphor-icons/react';
import { GlassCard, Button, Badge, SectionHeading } from '../components/ui';
import { Reveal } from '../components/Motion';
import { fetchStandings } from '../lib/authStore';
import { EVENTS, getEvent, rankTeams, formatScore, TOTAL_WEIGHT } from '../lib/season';
import './Leaderboard.css';

const MEDALS = { 1: 'gold', 2: 'silver', 3: 'bronze' };

/**
 * How often an open leaderboard asks for fresh standings.
 *
 * Polling rather than a push channel, deliberately. The browser in this app never talks to
 * Supabase, only to /api, and a socket would mean handing it a key and a second auth path
 * to secure. Standings are a few kilobytes and change a handful of times a night, so asking
 * every few seconds is live enough to watch scores land during an event, and a hidden tab
 * does not ask at all.
 */
const REFRESH_MS = 5000;

/** How long a team whose score just changed stays highlighted. */
const FLASH_MS = 2400;

/**
 * Standings that keep themselves current while the page is visible.
 *
 * A failed refresh keeps the last good standings on screen and marks them stale rather than
 * swapping the board for an error: a blip on event-night wifi should not blank the room's
 * screen. Only the very first load can end in the error state.
 */
function useLiveStandings() {
  const [state, setState] = useState({ status: 'loading', teams: [], stale: false, checkedAt: null });
  const lastBody = useRef('');

  useEffect(() => {
    let alive = true;
    let timer = null;
    let inFlight = false;

    async function refresh() {
      if (inFlight) return;
      inFlight = true;
      try {
        const data = await fetchStandings();
        if (!alive) return;
        // Same standings as last time: only the freshness changes, so rows do not re-render.
        const body = JSON.stringify(data.teams);
        const changed = body !== lastBody.current;
        lastBody.current = body;
        setState((prev) => ({
          status: 'ready',
          teams: changed ? data.teams : prev.teams,
          stale: false,
          checkedAt: Date.now(),
        }));
      } catch {
        if (!alive) return;
        setState((prev) =>
          prev.status === 'ready' ? { ...prev, stale: true } : { ...prev, status: 'error' }
        );
      } finally {
        inFlight = false;
      }
    }

    function schedule() {
      clearInterval(timer);
      timer = document.hidden ? null : setInterval(refresh, REFRESH_MS);
    }

    // Coming back to the tab refreshes at once, instead of showing standings from whenever
    // it was hidden until the next tick.
    function onVisibility() {
      if (!document.hidden) refresh();
      schedule();
    }

    refresh();
    schedule();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return state;
}

/** Ids of teams whose composite moved since the last standings, cleared after a moment. */
function useChangedTeams(ranked) {
  const previous = useRef(null);
  const timer = useRef(null);
  const [changed, setChanged] = useState(() => new Set());

  useEffect(() => {
    const before = previous.current;
    previous.current = new Map(ranked.map((t) => [t.id, t.composite.toFixed(2)]));
    // The first standings are not a change, they are the page loading.
    if (!before) return;

    const moved = new Set(
      ranked.filter((t) => before.has(t.id) && before.get(t.id) !== t.composite.toFixed(2)).map((t) => t.id)
    );
    if (moved.size === 0) return;
    setChanged(moved);
    // A ref, not an effect cleanup: a second change inside the window must restart the
    // clock, and a re-render with nothing moved must not cancel it and leave rows lit.
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setChanged(new Set()), FLASH_MS);
  }, [ranked]);

  useEffect(() => () => clearTimeout(timer.current), []);

  return changed;
}

/** "Live", with how fresh the numbers are, ticking so the room can trust the screen. */
function LiveIndicator({ checkedAt, stale }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!checkedAt) return null;
  const seconds = Math.max(0, Math.round((now - checkedAt) / 1000));
  const age = seconds < 3 ? 'just now' : seconds < 60 ? `${seconds}s ago` : `${Math.round(seconds / 60)}m ago`;

  return (
    <p className={`lb-live ${stale ? 'lb-live--stale' : ''}`}>
      <span className="lb-live__dot" aria-hidden="true" />
      {stale ? `Reconnecting… last updated ${age}` : `Live · updated ${age}`}
    </p>
  );
}

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

function TeamRow({ team, expanded, onToggle, maxComposite, flash }) {
  const panelId = `lb-detail-${team.id}`;

  return (
    <motion.li
      layout="position"
      transition={{ layout: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }}
      className={`lb-row ${expanded ? 'lb-row--open' : ''} ${flash ? 'lb-row--flash' : ''}`}
    >
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
    </motion.li>
  );
}

export default function Leaderboard() {
  const state = useLiveStandings();
  const [openId, setOpenId] = useState(null);

  const ranked = useMemo(() => rankTeams(state.teams), [state.teams]);
  const changed = useChangedTeams(ranked);
  const maxComposite = ranked.length > 0 ? ranked[0].composite : 0;

  // Events count as scored once the server holds a score for them, not when
  // season.js says their date has passed: a finished event nobody has graded
  // yet has decided nothing.
  const scoredEvents = useMemo(
    () => EVENTS.filter((e) => state.teams.some((t) => typeof t.scores?.[e.id] === 'number')),
    [state.teams]
  );
  const decidedWeight = scoredEvents.reduce((sum, e) => sum + e.weight, 0);
  const anyScores = scoredEvents.length > 0;

  return (
    <div className="leaderboard">
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

            <LiveIndicator checkedAt={state.checkedAt} stale={state.stale} />
          </Reveal>
        </div>
      </section>

      <section className="section on-dark">
        <div className="container">
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
                Standings could not be loaded. We will keep trying.
              </p>
            </GlassCard>
          )}

          {state.status === 'ready' && !anyScores && (
            <GlassCard className="lb-card">
              <p className="lb-empty">
                <Trophy size={22} weight="fill" aria-hidden="true" />
                No scores posted yet. First results go up after {EVENTS[0].name} on{' '}
                {EVENTS[0].date}.
                {ranked.length > 0 &&
                  ` ${ranked.length} ${ranked.length === 1 ? 'team is' : 'teams are'} ready to compete.`}
              </p>
            </GlassCard>
          )}

          {state.status === 'ready' && anyScores && (
            <Reveal>
              <GlassCard className="lb-card" title="standings.csv">
                <div className="lb-head" aria-hidden="true">
                  <span>Rank</span>
                  <span>Team</span>
                  <span className="lb-head__score">Composite</span>
                </div>
                <p className="sr-only" aria-live="polite">
                  {changed.size > 0 ? 'Standings updated.' : ''}
                </p>
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
                      flash={changed.has(team.id)}
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
    </div>
  );
}
