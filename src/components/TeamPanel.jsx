import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UsersThree,
  X,
  Check,
  PencilSimple,
  Envelope,
  HourglassMedium,
  WarningCircle,
  Crown,
  MagnifyingGlass,
  SignOut,
  Plus,
} from '@phosphor-icons/react';
import { useAuth } from '../lib/AuthContext';
import { timeAgo, TEAM_RULES, seatsUsed } from '../lib/authStore';
import { GlassCard, Button, Badge, StatusMessage, TextInput, Select } from './ui';
import Avatar from './Avatar';

/* ============================================================
   The dashboard's team panel.

   Three states, following the member through the season:
     not accepted yet   teams are closed to them, and it says why
     accepted, no team  their inbox, the requests they sent, and "start a team"
     on a team          the roster, and for the captain every control over it

   Every action goes to the server and the panel re-renders from its answer. When a
   rule refuses (the team filled up, someone else joined first), the server's sentence
   is shown as it is.
   ============================================================ */

const rowMotion = {
  layout: true,
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, x: -12 },
  transition: { duration: 0.22 },
};

function useAction() {
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(null);

  async function run(key, fn, success) {
    setError('');
    setNotice('');
    setBusy(key);
    try {
      await fn();
      if (success) {
        setNotice(success);
        setTimeout(() => setNotice(''), 4000);
      }
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setBusy(null);
    }
  }

  return { error, notice, busy, run };
}

function Feedback({ error, notice }) {
  return (
    <>
      {error && (
        <p className="panel__error" role="alert">
          <WarningCircle size={16} weight="fill" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
      {notice && <StatusMessage tone="success">{notice}</StatusMessage>}
    </>
  );
}

/* ---------- not accepted yet ---------- */

function Locked({ status, decision }) {
  const message =
    decision === 'denied'
      ? 'Teams are for accepted League members, so this season they are closed to you.'
      : decision === 'waitlisted'
        ? 'You are on the waitlist. If a spot opens and you are accepted, you can start a team or join one here.'
        : status === 'submitted'
        ? 'Teams open once your application is accepted. We will email you, and then you can start a team or join one here.'
        : 'Teams open once you apply and are accepted. Finish your application first.';

  return (
    <GlassCard className="panel team-panel">
      <div className="panel__head">
        <div>
          <h2 className="panel__title">Your team</h2>
          <p className="panel__subtitle">
            Teams run {TEAM_RULES.min}&ndash;{TEAM_RULES.max} people.
          </p>
        </div>
        <Badge tone="neutral" icon={UsersThree}>
          Not yet
        </Badge>
      </div>
      <p className="team-locked">{message}</p>
      {status !== 'submitted' && decision !== 'denied' && (
        <Link to="/apply">
          <Button variant="primary" size="md">
            {status === 'draft' ? 'Continue application' : 'Start application'}
          </Button>
        </Link>
      )}
    </GlassCard>
  );
}

/* ---------- accepted, no team ---------- */

function NoTeam({ inbox }) {
  const { createTeam, acceptTeamInvite, declineTeamInvite, cancelTeamRequest } = useAuth();
  const { error, notice, busy, run } = useAction();
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState('4');

  async function onCreate(event) {
    event.preventDefault();
    await run('create', () => createTeam({ name, capacity }));
  }

  return (
    <GlassCard className="panel team-panel">
      <div className="panel__head">
        <div>
          <h2 className="panel__title">Get on a team</h2>
          <p className="panel__subtitle">
            Teams run {TEAM_RULES.min}&ndash;{TEAM_RULES.max} people. Start your own and
            invite people, or ask to join a team that still has room.
          </p>
        </div>
        <Badge tone="accent" icon={UsersThree}>
          No team yet
        </Badge>
      </div>

      {inbox.invites.length > 0 && (
        <section className="inbox" aria-labelledby="inbox-heading">
          <div className="inbox__head">
            <Envelope size={18} weight="duotone" aria-hidden="true" />
            <h3 className="inbox__title" id="inbox-heading">
              Invites for you
            </h3>
            <Badge tone="accent">{inbox.invites.length}</Badge>
          </div>
          <ul className="inbox__list">
            <AnimatePresence initial={false}>
              {inbox.invites.map((invite) => (
                <motion.li key={invite.id} className="invite" {...rowMotion}>
                  <div className="invite__meta">
                    <p className="invite__name wrap-anywhere">
                      <strong>{invite.team.name}</strong> invited you
                    </p>
                    <p className="invite__sub wrap-anywhere">
                      Captain {invite.team.captain} &middot; {invite.team.memberCount} of{' '}
                      {invite.team.capacity} &middot; {timeAgo(invite.sentAt)}
                    </p>
                    {invite.message && (
                      <p className="invite__message wrap-anywhere">&ldquo;{invite.message}&rdquo;</p>
                    )}
                  </div>
                  <div className="invite__actions">
                    <Button
                      variant="primary"
                      size="sm"
                      icon={Check}
                      loading={busy === `accept-${invite.id}`}
                      // No success message: accepting replaces this whole view with the
                      // team, which is the confirmation, and a message set here would be
                      // unmounted before anyone saw it.
                      onClick={() => run(`accept-${invite.id}`, () => acceptTeamInvite(invite.id))}
                    >
                      Accept
                    </Button>
                    <Button
                      variant="glass"
                      size="sm"
                      loading={busy === `decline-${invite.id}`}
                      onClick={() => run(`decline-${invite.id}`, () => declineTeamInvite(invite.id))}
                    >
                      Decline
                    </Button>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </section>
      )}

      {inbox.requests.length > 0 && (
        <section className="team-requests" aria-labelledby="requests-heading">
          <h3 className="team-section-title" id="requests-heading">
            Waiting on a captain
          </h3>
          <ul className="roster roster--single">
            <AnimatePresence initial={false}>
              {inbox.requests.map((request) => (
                <motion.li key={request.id} className="teammate teammate--pending" {...rowMotion}>
                  <div className="teammate__meta">
                    <p className="teammate__name wrap-anywhere">{request.team.name}</p>
                    <p className="teammate__sub">
                      <HourglassMedium size={12} weight="fill" aria-hidden="true" /> You asked to
                      join &middot; {timeAgo(request.sentAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="teammate__remove"
                    onClick={() => run(`cancel-${request.id}`, () => cancelTeamRequest(request.id))}
                    aria-label={`Withdraw your request to join ${request.team.name}`}
                  >
                    <X size={15} weight="bold" aria-hidden="true" />
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </section>
      )}

      <Feedback error={error} notice={notice} />

      <div className="team-start">
        <form className="team-create" onSubmit={onCreate}>
          <h3 className="team-section-title">Start a team</h3>
          <div className="team-create__fields">
            <label className="sr-only" htmlFor="new-team-name">
              Team name
            </label>
            <TextInput
              id="new-team-name"
              value={name}
              maxLength={40}
              placeholder="Team name, e.g. Merge Conflict"
              onChange={(e) => setName(e.target.value)}
            />
            <label className="sr-only" htmlFor="new-team-capacity">
              Team size
            </label>
            <Select
              id="new-team-capacity"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
            >
              <option value="3">3 people</option>
              <option value="4">4 people</option>
            </Select>
          </div>
          <Button type="submit" variant="primary" size="md" icon={Plus} loading={busy === 'create'}>
            Create team
          </Button>
          <p className="finder__note">
            You will be the captain. You can rename it or change its size later.
          </p>
        </form>

        <div className="team-browse">
          <h3 className="team-section-title">Join a team</h3>
          <p className="panel__subtitle">
            See which teams have room and ask to join. The captain says yes or no.
          </p>
          <Link to="/teams">
            <Button variant="glass" size="md" icon={MagnifyingGlass}>
              Browse teams
            </Button>
          </Link>
        </div>
      </div>
    </GlassCard>
  );
}

/* ---------- on a team ---------- */

function OnTeam({ team }) {
  const {
    updateTeam,
    leaveTeam,
    removeTeammate,
    cancelTeamRequest,
    acceptTeamInvite,
    declineTeamInvite,
  } = useAuth();
  const { error, notice, busy, run } = useAction();
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(team.name);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const isCaptain = team.role === 'captain';
  const seats = seatsUsed(team);
  const openSeats = Math.max(0, team.capacity - seats);

  async function onSaveName() {
    const ok = await run('rename', () => updateTeam({ name: draftName }));
    if (ok) setEditingName(false);
  }

  return (
    <GlassCard className="panel team-panel">
      <div className="panel__head">
        <div>
          <h2 className="panel__title">Your team</h2>
          <p className="panel__subtitle">
            {isCaptain
              ? 'You are the captain. Invite people who are not on a team yet, and answer requests to join.'
              : 'Your captain manages invites and requests.'}
          </p>
        </div>
        <Badge
          tone={team.members.length >= TEAM_RULES.min ? 'success' : 'neutral'}
          icon={UsersThree}
        >
          {team.members.length} of {team.capacity}
        </Badge>
      </div>

      {/* ---------- requests to join: the captain's inbox ---------- */}
      {team.requests.length > 0 && (
        <section className="inbox" aria-labelledby="team-requests-heading">
          <div className="inbox__head">
            <Envelope size={18} weight="duotone" aria-hidden="true" />
            <h3 className="inbox__title" id="team-requests-heading">
              Asking to join
            </h3>
            <Badge tone="accent">{team.requests.length}</Badge>
          </div>
          <ul className="inbox__list">
            <AnimatePresence initial={false}>
              {team.requests.map((request) => (
                <motion.li key={request.id} className="invite" {...rowMotion}>
                  <Avatar member={request.member} />
                  <div className="invite__meta">
                    <p className="invite__name wrap-anywhere">
                      <strong>{request.member.name}</strong> wants to join
                    </p>
                    <p className="invite__sub wrap-anywhere">
                      {[request.member.year, request.member.major].filter(Boolean).join(' · ')}
                      {' · '}
                      {timeAgo(request.sentAt)}
                    </p>
                    {request.message && (
                      <p className="invite__message wrap-anywhere">&ldquo;{request.message}&rdquo;</p>
                    )}
                  </div>
                  {isCaptain && (
                    <div className="invite__actions">
                      <Button
                        variant="primary"
                        size="sm"
                        icon={Check}
                        loading={busy === `accept-${request.id}`}
                        onClick={() =>
                          run(
                            `accept-${request.id}`,
                            () => acceptTeamInvite(request.id),
                            `${request.member.name} is on your team.`
                          )
                        }
                      >
                        Accept
                      </Button>
                      <Button
                        variant="glass"
                        size="sm"
                        loading={busy === `decline-${request.id}`}
                        onClick={() => run(`decline-${request.id}`, () => declineTeamInvite(request.id))}
                      >
                        Decline
                      </Button>
                    </div>
                  )}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </section>
      )}

      {/* ---------- name and size ---------- */}
      <div className="team-name">
        {editingName ? (
          <div className="team-name__edit">
            <label className="sr-only" htmlFor="team-name-input">
              Team name
            </label>
            <TextInput
              id="team-name-input"
              value={draftName}
              maxLength={40}
              onChange={(e) => setDraftName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSaveName()}
            />
            <Button variant="secondary" size="sm" loading={busy === 'rename'} onClick={onSaveName}>
              Save
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setEditingName(false)}>
              Cancel
            </Button>
          </div>
        ) : isCaptain ? (
          <button
            type="button"
            className="team-name__display"
            onClick={() => {
              setDraftName(team.name);
              setEditingName(true);
            }}
          >
            <span className="team-name__value">{team.name}</span>
            <PencilSimple size={15} weight="bold" aria-hidden="true" />
          </button>
        ) : (
          <p className="team-name__value">{team.name}</p>
        )}

        {isCaptain && (
          <div className="team-size">
            <label className="team-size__label" htmlFor="team-capacity">
              Team size
            </label>
            <Select
              id="team-capacity"
              value={String(team.capacity)}
              disabled={busy === 'capacity'}
              onChange={(e) =>
                run('capacity', () => updateTeam({ capacity: Number(e.target.value) }))
              }
            >
              <option value="3">3 people</option>
              <option value="4">4 people</option>
            </Select>
          </div>
        )}
      </div>

      {/* ---------- roster ---------- */}
      <ul className="roster">
        <AnimatePresence initial={false}>
          {team.members.map((member) => (
            <motion.li
              key={member.id}
              className={`teammate ${member.isYou ? 'teammate--you' : ''}`}
              {...rowMotion}
            >
              <Avatar member={member} />
              <div className="teammate__meta">
                <p className="teammate__name wrap-anywhere">{member.name}</p>
                <p className="teammate__sub wrap-anywhere">
                  {member.role === 'captain' ? (
                    <>
                      <Crown size={12} weight="fill" aria-hidden="true" /> Captain
                    </>
                  ) : (
                    [member.year, member.major].filter(Boolean).join(' · ')
                  )}
                </p>
              </div>
              {member.isYou ? (
                <Badge tone="accent">You</Badge>
              ) : (
                isCaptain && (
                  <button
                    type="button"
                    className="teammate__remove"
                    onClick={() =>
                      run(`remove-${member.id}`, () => removeTeammate(member.id), `${member.name} was removed.`)
                    }
                    aria-label={`Remove ${member.name} from your team`}
                  >
                    <X size={15} weight="bold" aria-hidden="true" />
                  </button>
                )
              )}
            </motion.li>
          ))}

          {/* Invites waiting on an answer hold a seat, shown as pending. */}
          {team.invites.map((invite) => (
            <motion.li key={invite.id} className="teammate teammate--pending" {...rowMotion}>
              <Avatar member={invite.member} />
              <div className="teammate__meta">
                <p className="teammate__name wrap-anywhere">{invite.member.name}</p>
                <p className="teammate__sub">
                  <HourglassMedium size={12} weight="fill" aria-hidden="true" /> Invited &middot;{' '}
                  {timeAgo(invite.sentAt)}
                </p>
              </div>
              {isCaptain && (
                <button
                  type="button"
                  className="teammate__remove"
                  onClick={() => run(`cancel-${invite.id}`, () => cancelTeamRequest(invite.id))}
                  aria-label={`Cancel your invite to ${invite.member.name}`}
                >
                  <X size={15} weight="bold" aria-hidden="true" />
                </button>
              )}
            </motion.li>
          ))}
        </AnimatePresence>

        {/* Empty seats, so the roster cap reads at a glance. */}
        {Array.from({ length: openSeats }).map((_, i) => (
          <li key={`empty-${i}`} className="teammate teammate--empty" aria-hidden="true">
            <span className="teammate__avatar teammate__avatar--empty">+</span>
            <span className="teammate__sub">Open seat</span>
          </li>
        ))}
      </ul>

      <Feedback error={error} notice={notice} />

      <div className="team-footer">
        {isCaptain && openSeats > 0 && (
          <Link to="/teams?tab=members">
            <Button variant="glass" size="md" icon={MagnifyingGlass}>
              Find people to invite
            </Button>
          </Link>
        )}
        {team.members.length < TEAM_RULES.min && (
          <p className="finder__note">
            Teams need at least {TEAM_RULES.min} people to compete and appear on the
            leaderboard.
          </p>
        )}

        {confirmLeave ? (
          <div className="team-leave">
            <p className="team-leave__text">
              {isCaptain && team.members.length > 1
                ? 'Leave the team? The longest-standing member becomes captain.'
                : team.members.length === 1
                  ? 'Leave the team? You are the only member, so the team will be deleted.'
                  : 'Leave the team?'}
            </p>
            <Button
              variant="danger"
              size="sm"
              icon={SignOut}
              loading={busy === 'leave'}
              onClick={() => run('leave', leaveTeam)}
            >
              Yes, leave
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmLeave(false)}>
              Stay
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" icon={SignOut} onClick={() => setConfirmLeave(true)}>
            Leave team
          </Button>
        )}
      </div>
    </GlassCard>
  );
}

export default function TeamPanel() {
  const { profile } = useAuth();

  if (!profile?.teamEligible) {
    return <Locked status={profile?.applicationStatus} decision={profile?.decision} />;
  }
  if (!profile.team) {
    return <NoTeam inbox={profile.teamInbox ?? { invites: [], requests: [] }} />;
  }
  return <OnTeam team={profile.team} />;
}
