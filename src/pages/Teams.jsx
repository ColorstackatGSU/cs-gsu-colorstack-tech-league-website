import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  UsersThree,
  MagnifyingGlass,
  PaperPlaneTilt,
  Crown,
  HourglassMedium,
  WarningCircle,
  CheckCircle,
  Lock,
} from '@phosphor-icons/react';
import { useAuth } from '../lib/AuthContext';
import { fetchMembers, fetchTeams, seatsUsed, TEAM_RULES } from '../lib/authStore';
import { GlassCard, Button, Badge, StatusMessage, TextInput } from '../components/ui';
import { Reveal } from '../components/Motion';
import Avatar from '../components/Avatar';
import './Dashboard.css';
import './Teams.css';

/* ============================================================
   Teams: every team in the League, and everyone in it.

   Two views of the same people. Teams lists the teams themselves, open ones first,
   so someone looking to join can see where there is room. Members is the directory,
   ordered for someone building a team: people on no team first (a captain can invite
   them), then people on a team with room (you can ask to join it), then people on a
   full team.

   Only accepted members see either: the server refuses anyone else, and this page says
   why instead of showing an error.
   ============================================================ */

/**
 * Loads on mount and whenever `key` changes, debounced so typing in the search box does
 * not send a request per keystroke. Returns the state and a function to load again.
 */
function useLoad(loader, key) {
  const [state, setState] = useState({ status: 'loading', data: null, error: '' });
  const [version, setVersion] = useState(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    let alive = true;
    const timer = setTimeout(() => {
      loaderRef
        .current()
        .then((data) => alive && setState({ status: 'ready', data, error: '' }))
        .catch((error) => alive && setState({ status: 'error', data: null, error: error.message }));
    }, 180);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [key, version]);

  return [state, () => setVersion((v) => v + 1)];
}

/** "Request to join", with an optional note to the captain. */
function JoinRequest({ team, onSent }) {
  const { requestToJoin } = useAuth();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function send() {
    setBusy(true);
    setError('');
    try {
      await requestToJoin(team.id, message);
      setOpen(false);
      onSent(`Asked to join ${team.name}. The captain will see it on their dashboard.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button variant="glass" size="sm" icon={PaperPlaneTilt} onClick={() => setOpen(true)}>
        Request to join
      </Button>
    );
  }

  return (
    <div className="join-request">
      <label className="sr-only" htmlFor={`join-${team.id}`}>
        Note to the captain (optional)
      </label>
      <TextInput
        id={`join-${team.id}`}
        value={message}
        maxLength={280}
        placeholder="Optional note to the captain"
        onChange={(e) => setMessage(e.target.value)}
      />
      <div className="join-request__actions">
        <Button variant="primary" size="sm" icon={PaperPlaneTilt} loading={busy} onClick={send}>
          Send
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
      {error && (
        <p className="panel__error" role="alert">
          <WarningCircle size={16} weight="fill" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

/* ---------- teams view ---------- */

function TeamsList({ onNotice, myTeam }) {
  const [state, reload] = useLoad(fetchTeams, myTeam?.id ?? '');

  if (state.status === 'loading') return <p className="finder__empty">Loading teams&hellip;</p>;
  if (state.status === 'error') return <StatusMessage tone="error">{state.error}</StatusMessage>;
  if (state.data.length === 0) {
    return (
      <p className="finder__empty">
        No teams yet. Be the first: start one from your <Link to="/dashboard">dashboard</Link>.
      </p>
    );
  }

  return (
    <ul className="teams-grid">
      {state.data.map((team) => (
        <li key={team.id}>
          <GlassCard className={`team-card ${team.isYours ? 'team-card--yours' : ''}`}>
            <div className="team-card__head">
              <h3 className="team-card__name wrap-anywhere">{team.name}</h3>
              {team.isYours ? (
                <Badge tone="accent">Your team</Badge>
              ) : team.open ? (
                <Badge tone="success" icon={UsersThree}>
                  {team.capacity - team.seatsTaken} open
                </Badge>
              ) : (
                <Badge tone="neutral" icon={Lock}>
                  Full
                </Badge>
              )}
            </div>
            <p className="team-card__meta">
              {team.memberCount} of {team.capacity} members
              {team.seatsTaken > team.memberCount &&
                ` · ${team.seatsTaken - team.memberCount} invited`}
            </p>

            <ul className="team-card__roster">
              {team.members.map((member) => (
                <li key={member.id} className="team-card__member">
                  <Avatar member={member} />
                  <span className="wrap-anywhere">
                    {member.name}
                    {member.role === 'captain' && (
                      <Crown size={13} weight="fill" aria-label="captain" className="team-card__crown" />
                    )}
                  </span>
                </li>
              ))}
            </ul>

            <div className="team-card__actions">
              {!myTeam && team.open && !team.requested && !team.invitedYou && (
                <JoinRequest
                  team={team}
                  onSent={(message) => {
                    onNotice(message);
                    reload();
                  }}
                />
              )}
              {team.requested && (
                <Badge tone="neutral" icon={HourglassMedium}>
                  Requested
                </Badge>
              )}
              {team.invitedYou && (
                <Link to="/dashboard">
                  <Button variant="primary" size="sm" icon={CheckCircle}>
                    They invited you
                  </Button>
                </Link>
              )}
            </div>
          </GlassCard>
        </li>
      ))}
    </ul>
  );
}

/* ---------- members view ---------- */

const GROUPS = [
  { key: 'free', title: 'Looking for a team', match: (m) => !m.team },
  { key: 'open', title: 'On a team with room', match: (m) => m.team?.open },
  { key: 'full', title: 'On a full team', match: (m) => m.team && !m.team.open },
];

function MembersList({ onNotice, myTeam }) {
  const { requestTeammate } = useAuth();
  const [query, setQuery] = useState('');
  const [state, reload] = useLoad(() => fetchMembers(query), `${query}|${myTeam?.id ?? ''}`);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');

  const isCaptain = myTeam?.role === 'captain';
  const canInvite = isCaptain && seatsUsed(myTeam) < myTeam.capacity;

  const groups = useMemo(
    () =>
      GROUPS.map((group) => ({ ...group, members: (state.data ?? []).filter(group.match) })).filter(
        (group) => group.members.length > 0
      ),
    [state.data]
  );

  async function invite(member) {
    setBusy(member.id);
    setError('');
    try {
      await requestTeammate(member.id);
      onNotice(`Invited ${member.name}. They join once they accept.`);
      reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="finder">
      <label className="finder__label" htmlFor="member-search">
        Search members
      </label>
      <div className="finder__search">
        <MagnifyingGlass size={17} weight="bold" aria-hidden="true" />
        <TextInput
          id="member-search"
          type="search"
          value={query}
          placeholder="Name, major, interest, or team"
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {isCaptain && !canInvite && (
        <p className="finder__note">
          Your team&apos;s seats are all taken or held by pending invites, so you cannot invite
          anyone else right now.
        </p>
      )}

      {error && (
        <p className="panel__error" role="alert">
          <WarningCircle size={16} weight="fill" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}

      {state.status === 'loading' && <p className="finder__empty">Searching&hellip;</p>}
      {state.status === 'error' && <StatusMessage tone="error">{state.error}</StatusMessage>}
      {state.status !== 'loading' && state.data?.length === 0 && (
        <p className="finder__empty">Nobody matches that. Try a different name, major, or team.</p>
      )}

      {groups.map((group) => (
        <section key={group.key} className="member-group" aria-labelledby={`group-${group.key}`}>
          <h3 className="team-section-title" id={`group-${group.key}`}>
            {group.title} <span className="member-group__count">{group.members.length}</span>
          </h3>
          <div className="member-group__list" role="list">
            {group.members.map((member) => (
              <div className="finder__row" role="listitem" key={member.id}>
                <Avatar member={member} />
                <div className="teammate__meta">
                  <p className="teammate__name wrap-anywhere">{member.name}</p>
                  <p className="teammate__sub wrap-anywhere">
                    {[member.year, member.major, member.interest].filter(Boolean).join(' · ')}
                  </p>
                  {member.team && (
                    <p className="member-team wrap-anywhere">
                      <UsersThree size={13} weight="fill" aria-hidden="true" /> {member.team.name}
                    </p>
                  )}
                </div>

                {/* On no team: a captain with a free seat can invite them. */}
                {!member.team &&
                  (member.invited ? (
                    <Badge tone="neutral" icon={HourglassMedium}>
                      Invited
                    </Badge>
                  ) : (
                    canInvite && (
                      <Button
                        variant="glass"
                        size="sm"
                        icon={PaperPlaneTilt}
                        loading={busy === member.id}
                        onClick={() => invite(member)}
                      >
                        Invite
                      </Button>
                    )
                  ))}

                {/* On a team with room: anyone on no team can ask to join it. */}
                {member.team?.open &&
                  !myTeam &&
                  (member.requested ? (
                    <Badge tone="neutral" icon={HourglassMedium}>
                      Requested
                    </Badge>
                  ) : (
                    <JoinRequest
                      team={member.team}
                      onSent={(message) => {
                        onNotice(message);
                        reload();
                      }}
                    />
                  ))}

                {member.team && !member.team.open && !member.team.isYours && (
                  <Badge tone="neutral">Full</Badge>
                )}
                {member.team?.isYours && <Badge tone="accent">Your team</Badge>}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export default function Teams() {
  const { profile } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'members' ? 'members' : 'teams';
  const [notice, setNotice] = useState('');

  function flash(message) {
    setNotice(message);
    setTimeout(() => setNotice(''), 4500);
  }

  const myTeam = profile?.team ?? null;

  return (
    <div className="dash on-dark" id="main">
      <div className="dash__orb" aria-hidden="true" />
      <div className="container dash__inner">
        <Reveal className="dash__header">
          <div>
            <span className="dash__greeting">Fall 2026 Season</span>
            <h1 className="dash__name">Teams</h1>
          </div>
          {myTeam ? (
            <Link to="/dashboard">
              <Badge tone="accent" icon={UsersThree}>
                {myTeam.name} &middot; {myTeam.members.length} of {myTeam.capacity}
              </Badge>
            </Link>
          ) : (
            profile?.teamEligible && <Badge tone="neutral">You are not on a team yet</Badge>
          )}
        </Reveal>

        {!profile?.teamEligible ? (
          <GlassCard className="panel">
            <h2 className="panel__title">Teams open once you are accepted</h2>
            <p className="panel__subtitle">
              Teams of {TEAM_RULES.min}&ndash;{TEAM_RULES.max} are for accepted League members.
              {profile?.decision === 'waitlisted'
                ? ' You are on the waitlist, and we will email you if a spot opens.'
                : profile?.applicationStatus === 'submitted'
                ? ' Your application is in, and we will email you a decision.'
                : ' Apply first, and once you are in you can start a team or join one here.'}
            </p>
            <Link to="/dashboard">
              <Button variant="glass" size="md">
                Back to dashboard
              </Button>
            </Link>
          </GlassCard>
        ) : (
          <GlassCard className="panel">
            <div className="teams-tabs" role="tablist" aria-label="Teams views">
              {[
                { key: 'teams', label: 'Teams' },
                { key: 'members', label: 'Members' },
              ].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.key}
                  className={`teams-tab ${tab === t.key ? 'is-active' : ''}`}
                  onClick={() => setParams(t.key === 'teams' ? {} : { tab: t.key }, { replace: true })}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {notice && <StatusMessage tone="success">{notice}</StatusMessage>}

            <div role="tabpanel">
              {tab === 'teams' ? (
                <TeamsList onNotice={flash} myTeam={myTeam} />
              ) : (
                <MembersList onNotice={flash} myTeam={myTeam} />
              )}
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
