import { useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Plus,
  Trash,
  ArrowCounterClockwise,
  CheckCircle,
  Lock,
  PencilSimple,
} from '@phosphor-icons/react';
import { useAuth } from '../lib/AuthContext';
import { GlassCard, Button, Badge, StatusMessage } from '../components/ui';
import { Reveal } from '../components/Motion';
import {
  getStandings,
  setTeamScore,
  updateTeam,
  addTeam,
  removeTeam,
  resetStandings,
  subscribeToStandings,
  isAdminUsername,
} from '../lib/authStore';
import { EVENTS, rankTeams, formatScore, TOTAL_WEIGHT } from '../lib/season';
import './Admin.css';

/**
 * Score entry for one team across every event.
 *
 * Inputs are uncontrolled-ish: they hold a local string while focused so a
 * half-typed value ("1" on the way to "85") is never pushed through the
 * scoring math, and commit on blur or Enter.
 */
function ScoreInput({ team, event, onCommit }) {
  const stored = team.scores[event.id];
  const [draft, setDraft] = useState(stored ?? '');
  const [editing, setEditing] = useState(false);

  // Track external changes (another tab, a reset) unless mid-edit.
  useEffect(() => {
    if (!editing) setDraft(stored ?? '');
  }, [stored, editing]);

  function commit() {
    setEditing(false);
    const trimmed = String(draft).trim();

    if (trimmed === '') {
      onCommit(null);
      return;
    }

    const n = Number(trimmed);
    if (!Number.isFinite(n)) {
      setDraft(stored ?? '');
      return;
    }
    // Clamp here too so the field shows what was actually stored.
    const clamped = Math.max(0, Math.min(n, event.max));
    setDraft(clamped);
    onCommit(clamped);
  }

  return (
    <label className="adm-score">
      <span className="sr-only">
        {event.name} score for {team.name}
      </span>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={event.max}
        value={draft}
        placeholder="—"
        onFocus={() => setEditing(true)}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
          if (e.key === 'Escape') {
            setDraft(stored ?? '');
            setEditing(false);
            e.currentTarget.blur();
          }
        }}
        className={`adm-score__input ${stored === undefined ? 'is-empty' : ''}`}
      />
      <span className="adm-score__max">/{event.max}</span>
    </label>
  );
}

/** Inline-editable team name. */
function TeamName({ team, onRename }) {
  const [draft, setDraft] = useState(team.name);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(team.name);
  }, [team.name, editing]);

  function commit() {
    setEditing(false);
    const next = draft.trim();
    if (next && next !== team.name) onRename(next);
    else setDraft(team.name);
  }

  return (
    <span className="adm-team">
      <input
        className="adm-team__input"
        value={draft}
        aria-label={`Team name for ${team.name}`}
        onFocus={() => setEditing(true)}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
          if (e.key === 'Escape') {
            setDraft(team.name);
            setEditing(false);
            e.currentTarget.blur();
          }
        }}
      />
      <PencilSimple size={13} weight="bold" aria-hidden="true" className="adm-team__pencil" />
    </span>
  );
}

export default function Admin() {
  const { session } = useAuth();
  const [standings, setStandings] = useState(() => getStandings());
  const [savedAt, setSavedAt] = useState(null);
  const [newTeam, setNewTeam] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  const canScore = isAdminUsername(session?.username);

  // Stay in sync with edits from other tabs.
  useEffect(() => subscribeToStandings(setStandings), []);

  // Briefly surface that a write landed.
  const flashSaved = useCallback(() => {
    setSavedAt(Date.now());
  }, []);

  useEffect(() => {
    if (!savedAt) return;
    const id = setTimeout(() => setSavedAt(null), 1600);
    return () => clearTimeout(id);
  }, [savedAt]);

  const ranked = useMemo(() => rankTeams(standings.teams), [standings.teams]);

  if (!canScore) {
    return (
      <main className="admin">
        <section className="section admin__hero">
          <div className="container">
            <GlassCard className="admin__denied">
              <Lock size={30} weight="fill" aria-hidden="true" />
              <h1 className="admin__denied-title">Scoring console</h1>
              <p className="admin__denied-body">
                This area is for e-board. Your account doesn't have scoring access.
              </p>
              <Link to="/leaderboard">
                <Button variant="primary" iconRight={ArrowRight}>
                  Back to the leaderboard
                </Button>
              </Link>
            </GlassCard>
          </div>
        </section>
      </main>
    );
  }

  function handleScore(teamId, eventId, value) {
    setTeamScore(teamId, eventId, value);
    setStandings(getStandings());
    flashSaved();
  }

  function handleRename(teamId, name) {
    updateTeam(teamId, { name });
    setStandings(getStandings());
    flashSaved();
  }

  function handleMembers(teamId, members) {
    updateTeam(teamId, { members: Math.max(1, Math.min(6, Number(members) || 1)) });
    setStandings(getStandings());
    flashSaved();
  }

  function handleAdd(e) {
    e.preventDefault();
    const name = newTeam.trim();
    if (!name) return;
    addTeam({ name });
    setNewTeam('');
    setStandings(getStandings());
    flashSaved();
  }

  function handleRemove(teamId, name) {
    if (!window.confirm(`Remove ${name}? This deletes their scores too.`)) return;
    removeTeam(teamId);
    setStandings(getStandings());
    flashSaved();
  }

  function handleReset() {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    resetStandings();
    setStandings(getStandings());
    setConfirmReset(false);
    flashSaved();
  }

  return (
    <main className="admin">
      <section className="section admin__hero">
        <div className="container">
          <Reveal>
            <div className="admin__head">
              <div>
                <Badge tone="accent" icon={PencilSimple}>
                  E-board only
                </Badge>
                <h1 className="admin__title">Scoring console</h1>
                <p className="admin__lede">
                  Enter raw points for each team. Changes save instantly and every
                  open leaderboard updates live. Leave a field blank to mark an
                  event unplayed.
                </p>
              </div>
              <div className="admin__headactions">
                <Link to="/leaderboard">
                  <Button variant="ghost" iconRight={ArrowRight}>
                    View leaderboard
                  </Button>
                </Link>
              </div>
            </div>

            <div aria-live="polite" className="admin__saved">
              {savedAt && (
                <StatusMessage tone="success">
                  Saved. Leaderboard updated.
                </StatusMessage>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section admin__grid-wrap">
        <div className="container">
          <GlassCard className="admin__card" title="score_entry.csv">
            <div className="admin__scroll">
              <table className="admin__table">
                <caption className="sr-only">
                  Raw score entry for every team across all five events
                </caption>
                <thead>
                  <tr>
                    <th scope="col" className="admin__th-rank">#</th>
                    <th scope="col" className="admin__th-team">Team</th>
                    {EVENTS.map((e) => (
                      <th scope="col" key={e.id} className="admin__th-event">
                        <span className="admin__th-name">{e.name}</span>
                        <span className="admin__th-weight">{e.weight}%</span>
                      </th>
                    ))}
                    <th scope="col" className="admin__th-total">Composite</th>
                    <th scope="col">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.map((team) => (
                    <tr key={team.id}>
                      <td className="admin__rank">{team.rank}</td>
                      <td className="admin__teamcell">
                        <TeamName
                          team={team}
                          onRename={(name) => handleRename(team.id, name)}
                        />
                        <label className="adm-members">
                          <span className="sr-only">Members on {team.name}</span>
                          <input
                            type="number"
                            min={1}
                            max={6}
                            value={team.members}
                            onChange={(e) => handleMembers(team.id, e.target.value)}
                          />
                          <span>members</span>
                        </label>
                      </td>

                      {EVENTS.map((event) => (
                        <td key={event.id} className="admin__scorecell">
                          <ScoreInput
                            team={team}
                            event={event}
                            onCommit={(v) => handleScore(team.id, event.id, v)}
                          />
                        </td>
                      ))}

                      <td className="admin__total">
                        <span className="admin__composite">
                          {formatScore(team.composite)}
                        </span>
                        <span className="admin__outof">
                          / {formatScore(team.earnedWeight)}
                        </span>
                      </td>

                      <td className="admin__actions">
                        <button
                          type="button"
                          className="admin__remove"
                          onClick={() => handleRemove(team.id, team.name)}
                          aria-label={`Remove ${team.name}`}
                        >
                          <Trash size={16} weight="bold" aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="admin__hint">
              Scores are raw points against each event's own max. The composite is
              computed automatically: (raw ÷ max) × weight, summed. Unplayed events
              are excluded rather than counted as zero, so a team's composite is
              shown out of the {TOTAL_WEIGHT} points decided so far.
            </p>
          </GlassCard>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="admin__tools">
            <GlassCard className="admin__tool">
              <h2 className="admin__tool-title">Add a team</h2>
              <form className="admin__addform" onSubmit={handleAdd}>
                <label className="sr-only" htmlFor="new-team">
                  New team name
                </label>
                <input
                  id="new-team"
                  className="admin__addinput"
                  value={newTeam}
                  onChange={(e) => setNewTeam(e.target.value)}
                  placeholder="Team name"
                />
                <Button type="submit" variant="primary" icon={Plus} disabled={!newTeam.trim()}>
                  Add
                </Button>
              </form>
            </GlassCard>

            <GlassCard className="admin__tool">
              <h2 className="admin__tool-title">Reset standings</h2>
              <p className="admin__tool-body">
                Discards every edit and restores the seeded preview standings.
              </p>
              <Button
                variant={confirmReset ? 'danger' : 'ghost'}
                icon={confirmReset ? undefined : ArrowCounterClockwise}
                onClick={handleReset}
                onBlur={() => setConfirmReset(false)}
              >
                {confirmReset ? 'Click again to confirm' : 'Reset to seed data'}
              </Button>
            </GlassCard>
          </div>
        </div>
      </section>
    </main>
  );
}
