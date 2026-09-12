-- Teams, rosters, and the two ways onto one.
--
-- The rules, as the League runs them:
--
--   * Teams are 3 or 4 people. The captain picks the capacity and can change it, but
--     never below the seats already taken.
--   * Only accepted members can be on a team, invite, or be invited. Nobody builds a team
--     around someone the League has not admitted.
--   * One team per person.
--   * Two ways in, both needing a yes from the other side:
--       invite   the captain asks someone who is on no team; they accept or decline.
--       request  someone on no team asks to join; the captain accepts or declines.
--   * A pending invite holds a seat. Without that a captain could invite the whole
--     directory and overfill the roster when they all say yes. A pending request does not
--     hold one, or anyone could lock a team by asking to join it; the seat is checked when
--     the captain says yes instead.
--   * Joining a team withdraws every other invite and request that person had pending,
--     which is also what frees the seats those invites were holding elsewhere.
--   * The captain can remove people. When the captain leaves, the longest-standing member
--     takes over. When the last person leaves, the team is deleted, unless it has already
--     been scored, in which case it stays so the leaderboard does not rewrite history.
--
-- Every rule is enforced here rather than in the API. Members get no write grants on
-- these tables at all: every change goes through a function below, which checks who is
-- asking, and the triggers underneath hold the invariants even for code that skips them.
-- A function raises a plain sentence on refusal, and the API passes that sentence
-- straight to the member, so every message in this file is written to be read by one.

-- ============================================================================
-- Tables
-- ============================================================================

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  capacity smallint not null default 4,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint teams_name_shape
    check (name = btrim(name) and length(name) between 1 and 40),
  constraint teams_capacity_range
    check (capacity between 3 and 4)
);

-- Case-insensitive, because "Merge Conflict" and "merge conflict" on the same leaderboard
-- read as one team with a duplicate row.
create unique index teams_name_unique on public.teams (lower(name));

create trigger teams_touch_updated_at
  before update on public.teams
  for each row execute function public.touch_updated_at();

create table public.team_members (
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member',
  -- clock_timestamp, not now(): now() is fixed for a whole transaction, so two people
  -- joining inside one would tie, and who inherits the captaincy would come down to
  -- whichever uuid sorts first.
  joined_at timestamptz not null default clock_timestamp(),

  primary key (team_id, user_id),
  constraint team_members_one_team_each unique (user_id),
  constraint team_members_role_known check (role in ('captain', 'member'))
);

create unique index team_members_one_captain
  on public.team_members (team_id) where role = 'captain';

create table public.team_invites (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  -- Always the person outside the team, whichever side started it.
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- invite: the captain asked them. request: they asked the team.
  kind text not null,
  created_by uuid references public.profiles (id) on delete set null,
  message text not null default '',
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz,

  constraint team_invites_kind_known check (kind in ('invite', 'request')),
  constraint team_invites_status_known
    check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  constraint team_invites_message_length check (length(message) <= 280)
);

-- One live conversation between a team and a person, whichever direction it runs.
create unique index team_invites_one_pending
  on public.team_invites (team_id, user_id) where status = 'pending';

create index team_invites_user_pending_idx
  on public.team_invites (user_id) where status = 'pending';


-- ============================================================================
-- Helpers
-- ============================================================================

create or replace function public.is_accepted(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.applications a
     where a.user_id = p_user and a.decision = 'accepted'
  );
$$;

create or replace function public.team_of(p_user uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select tm.team_id from public.team_members tm where tm.user_id = p_user;
$$;

-- Accepted teammates plus invites still waiting on an answer. Requests are not counted;
-- see the header for why.
create or replace function public.team_seats_taken(p_team uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select (select count(*) from public.team_members tm where tm.team_id = p_team)::integer
       + (select count(*) from public.team_invites i
           where i.team_id = p_team and i.kind = 'invite' and i.status = 'pending')::integer;
$$;

create or replace function public.captained_team(p_user uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select tm.team_id from public.team_members tm
   where tm.user_id = p_user and tm.role = 'captain';
$$;

-- The public face of a member everywhere another member can see them: no email, and no
-- application answers beyond the three the directory is for.
create or replace function public.member_card(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id,
    'name', coalesce(nullif(btrim(p.full_name), ''), 'League member'),
    'year', a.year,
    'major', a.major,
    'interest', a.interest
  )
  from public.profiles p
  left join public.applications a on a.user_id = p.id
  where p.id = p_user;
$$;

create or replace function public.cancel_pending_for(p_user uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.team_invites
     set status = 'cancelled', responded_at = now()
   where user_id = p_user and status = 'pending';
$$;

-- Takes someone off whatever team they are on and tidies up after them.
create or replace function public.vacate_team(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_team uuid;
  v_role text;
  v_next uuid;
begin
  select tm.team_id, tm.role into v_team, v_role
    from public.team_members tm where tm.user_id = p_user;
  if not found then
    return;
  end if;

  perform 1 from public.teams t where t.id = v_team for update;

  delete from public.team_members where user_id = p_user;

  if v_role = 'captain' then
    select tm.user_id into v_next
      from public.team_members tm
     where tm.team_id = v_team
     order by tm.joined_at, tm.user_id
     limit 1;
    if v_next is not null then
      update public.team_members set role = 'captain'
       where team_id = v_team and user_id = v_next;
    end if;
  end if;

  if not exists (select 1 from public.team_members tm where tm.team_id = v_team) then
    update public.team_invites
       set status = 'cancelled', responded_at = now()
     where team_id = v_team and status = 'pending';
    if not exists (select 1 from public.scores s where s.team_id = v_team) then
      delete from public.teams where id = v_team;
    end if;
  end if;
end;
$$;


-- ============================================================================
-- Invariants
-- ============================================================================
-- Each guard locks the team row before counting. Two captains' worth of "accept" landing
-- in the same instant would otherwise both count three members, both insert, and leave a
-- team of five. The lock makes the second one count after the first has committed.

create or replace function public.team_members_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_capacity smallint;
begin
  select t.capacity into v_capacity from public.teams t where t.id = new.team_id for update;
  if not found then
    raise exception 'That team no longer exists.';
  end if;
  if not public.is_accepted(new.user_id) then
    raise exception 'Only accepted League members can be on a team.';
  end if;
  if exists (select 1 from public.team_members tm where tm.user_id = new.user_id) then
    raise exception 'That person is already on a team.';
  end if;
  if (select count(*) from public.team_members tm where tm.team_id = new.team_id) >= v_capacity then
    raise exception 'That team is already full.';
  end if;
  return new;
end;
$$;

create trigger team_members_guard
  before insert on public.team_members
  for each row execute function public.team_members_guard();

create or replace function public.team_invites_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_capacity smallint;
begin
  if new.status <> 'pending' then
    return new;
  end if;

  select t.capacity into v_capacity from public.teams t where t.id = new.team_id for update;
  if not found then
    raise exception 'That team no longer exists.';
  end if;
  if not public.is_accepted(new.user_id) then
    raise exception 'Teams are only open to accepted League members.';
  end if;
  if exists (select 1 from public.team_members tm where tm.user_id = new.user_id) then
    if new.kind = 'invite' then
      raise exception 'That person is already on a team.';
    end if;
    raise exception 'Leave your current team before asking to join another.';
  end if;
  if new.kind = 'invite' and public.team_seats_taken(new.team_id) >= v_capacity then
    raise exception 'Your team has no open seats, counting invites still waiting on an answer. Cancel one first.';
  end if;
  return new;
end;
$$;

create trigger team_invites_guard
  before insert on public.team_invites
  for each row execute function public.team_invites_guard();

create or replace function public.teams_capacity_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.capacity < public.team_seats_taken(new.id) then
    raise exception 'The team already has more people than that, counting invites still waiting on an answer.';
  end if;
  return new;
end;
$$;

create trigger teams_capacity_guard
  before update of capacity on public.teams
  for each row execute function public.teams_capacity_guard();


-- ============================================================================
-- Member actions
-- ============================================================================

create or replace function public.create_team(p_name text, p_capacity integer)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_name text := btrim(coalesce(p_name, ''));
  v_team uuid;
begin
  if v_uid is null then
    raise exception 'Sign in to create a team.';
  end if;
  if not public.is_accepted(v_uid) then
    raise exception 'You can create a team once your League application is accepted.';
  end if;
  if public.team_of(v_uid) is not null then
    raise exception 'You are already on a team. Leave it before starting a new one.';
  end if;
  if length(v_name) not between 1 and 40 then
    raise exception 'Give your team a name between 1 and 40 characters.';
  end if;
  if p_capacity is null or p_capacity not in (3, 4) then
    raise exception 'Teams can have 3 or 4 people.';
  end if;
  if exists (select 1 from public.teams t where lower(t.name) = lower(v_name)) then
    raise exception 'Another team already has that name.';
  end if;

  insert into public.teams (name, capacity, created_by)
  values (v_name, p_capacity, v_uid)
  returning id into v_team;

  -- Before the member insert, so the seats on other teams this person was invited to are
  -- freed first, and so an invite to this person does not linger as "pending".
  perform public.cancel_pending_for(v_uid);

  insert into public.team_members (team_id, user_id, role)
  values (v_team, v_uid, 'captain');

  return v_team;
end;
$$;

create or replace function public.update_team(p_name text default null, p_capacity integer default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_team uuid := public.captained_team(auth.uid());
  v_name text := btrim(p_name);
begin
  if v_team is null then
    raise exception 'Only the team captain can change the team.';
  end if;

  if p_name is not null then
    if length(v_name) not between 1 and 40 then
      raise exception 'Give your team a name between 1 and 40 characters.';
    end if;
    if exists (select 1 from public.teams t
                where lower(t.name) = lower(v_name) and t.id <> v_team) then
      raise exception 'Another team already has that name.';
    end if;
    update public.teams set name = v_name where id = v_team;
  end if;

  if p_capacity is not null then
    if p_capacity not in (3, 4) then
      raise exception 'Teams can have 3 or 4 people.';
    end if;
    update public.teams set capacity = p_capacity where id = v_team;
  end if;
end;
$$;

create or replace function public.leave_team()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.team_of(auth.uid()) is null then
    raise exception 'You are not on a team.';
  end if;
  perform public.vacate_team(auth.uid());
end;
$$;

create or replace function public.remove_teammate(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_team uuid := public.captained_team(auth.uid());
begin
  if v_team is null then
    raise exception 'Only the team captain can remove people.';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'You cannot remove yourself. Leave the team instead.';
  end if;
  if public.team_of(p_user_id) is distinct from v_team then
    raise exception 'That person is not on your team.';
  end if;
  perform public.vacate_team(p_user_id);
end;
$$;

create or replace function public.invite_member(p_user_id uuid, p_message text default '')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_team uuid := public.captained_team(auth.uid());
  v_pending text;
  v_id uuid;
begin
  if v_team is null then
    raise exception 'Only the team captain can invite people.';
  end if;
  if p_user_id = v_uid then
    raise exception 'You are already on your own team.';
  end if;

  select i.kind into v_pending from public.team_invites i
   where i.team_id = v_team and i.user_id = p_user_id and i.status = 'pending';
  if v_pending = 'request' then
    raise exception 'They already asked to join. Accept their request instead.';
  elsif v_pending = 'invite' then
    raise exception 'You already have an invite out to them.';
  end if;

  insert into public.team_invites (team_id, user_id, kind, created_by, message)
  values (v_team, p_user_id, 'invite', v_uid, btrim(coalesce(p_message, '')))
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.request_to_join(p_team_id uuid, p_message text default '')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_pending text;
  v_id uuid;
begin
  if not public.is_accepted(v_uid) then
    raise exception 'You can ask to join a team once your League application is accepted.';
  end if;
  if public.team_of(v_uid) is not null then
    raise exception 'Leave your current team before asking to join another.';
  end if;

  select i.kind into v_pending from public.team_invites i
   where i.team_id = p_team_id and i.user_id = v_uid and i.status = 'pending';
  if v_pending = 'invite' then
    raise exception 'That team already invited you. Accept their invite instead.';
  elsif v_pending = 'request' then
    raise exception 'You already asked to join that team.';
  end if;

  if public.team_seats_taken(p_team_id) >= (select t.capacity from public.teams t where t.id = p_team_id) then
    raise exception 'That team is full.';
  end if;

  insert into public.team_invites (team_id, user_id, kind, created_by, message)
  values (p_team_id, v_uid, 'request', v_uid, btrim(coalesce(p_message, '')))
  returning id into v_id;

  return v_id;
end;
$$;

-- Withdraws something the caller started: a captain's invite, or a member's request.
create or replace function public.cancel_invite(p_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v public.team_invites;
begin
  select * into v from public.team_invites i where i.id = p_invite_id for update;
  if not found or v.status <> 'pending' then
    raise exception 'That is no longer pending.';
  end if;
  if (v.kind = 'invite' and public.captained_team(v_uid) is distinct from v.team_id)
     or (v.kind = 'request' and v.user_id <> v_uid) then
    raise exception 'You can only cancel invites and requests you sent.';
  end if;

  update public.team_invites
     set status = 'cancelled', responded_at = now()
   where id = p_invite_id;
end;
$$;

-- Answers something addressed to the caller: an invite to them, or a request to the team
-- they captain.
create or replace function public.respond_invite(p_invite_id uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v public.team_invites;
  v_capacity smallint;
begin
  select * into v from public.team_invites i where i.id = p_invite_id for update;
  if not found or v.status <> 'pending' then
    raise exception 'That is no longer available.';
  end if;
  if v.kind = 'invite' and v.user_id <> v_uid then
    raise exception 'That invite is not addressed to you.';
  end if;
  if v.kind = 'request' and public.captained_team(v_uid) is distinct from v.team_id then
    raise exception 'Only the team captain can answer requests to join.';
  end if;

  if not p_accept then
    update public.team_invites
       set status = 'declined', responded_at = now()
     where id = p_invite_id;
    return;
  end if;

  select t.capacity into v_capacity from public.teams t where t.id = v.team_id for update;

  if public.team_of(v.user_id) is not null then
    if v.kind = 'invite' then
      raise exception 'Leave your current team before accepting.';
    end if;
    raise exception 'They joined another team in the meantime.';
  end if;
  -- An invite already holds its seat. A request does not, so check there is one to give.
  if v.kind = 'request' and public.team_seats_taken(v.team_id) >= v_capacity then
    raise exception 'Your team has no open seats, counting invites still waiting on an answer.';
  end if;

  update public.team_invites
     set status = 'accepted', responded_at = now()
   where id = p_invite_id;

  perform public.cancel_pending_for(v.user_id);

  insert into public.team_members (team_id, user_id, role)
  values (v.team_id, v.user_id, 'member');
end;
$$;


-- ============================================================================
-- Reads
-- ============================================================================

-- Everything the dashboard needs about the caller's team and inbox, in one round trip.
create or replace function public.my_team()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_team uuid;
  v_role text;
  v_team_json jsonb;
begin
  select tm.team_id, tm.role into v_team, v_role
    from public.team_members tm where tm.user_id = v_uid;

  if v_team is not null then
    select jsonb_build_object(
      'id', t.id,
      'name', t.name,
      'capacity', t.capacity,
      'role', v_role,
      'members', (
        select coalesce(jsonb_agg(
                 public.member_card(tm.user_id)
                 || jsonb_build_object('role', tm.role,
                                       'isYou', tm.user_id = v_uid,
                                       'joinedAt', tm.joined_at)
                 order by tm.role = 'captain' desc, tm.joined_at), '[]'::jsonb)
          from public.team_members tm where tm.team_id = t.id
      ),
      'invites', (
        select coalesce(jsonb_agg(
                 jsonb_build_object('id', i.id,
                                    'member', public.member_card(i.user_id),
                                    'message', i.message,
                                    'sentAt', i.created_at)
                 order by i.created_at), '[]'::jsonb)
          from public.team_invites i
         where i.team_id = t.id and i.kind = 'invite' and i.status = 'pending'
      ),
      'requests', (
        select coalesce(jsonb_agg(
                 jsonb_build_object('id', i.id,
                                    'member', public.member_card(i.user_id),
                                    'message', i.message,
                                    'sentAt', i.created_at)
                 order by i.created_at), '[]'::jsonb)
          from public.team_invites i
         where i.team_id = t.id and i.kind = 'request' and i.status = 'pending'
      )
    )
    into v_team_json
    from public.teams t where t.id = v_team;
  end if;

  return jsonb_build_object(
    'eligible', public.is_accepted(v_uid),
    'team', v_team_json,
    'inbox', jsonb_build_object(
      'invites', (
        select coalesce(jsonb_agg(
                 jsonb_build_object('id', i.id,
                                    'team', public.team_summary(i.team_id),
                                    'message', i.message,
                                    'sentAt', i.created_at)
                 order by i.created_at desc), '[]'::jsonb)
          from public.team_invites i
         where i.user_id = v_uid and i.kind = 'invite' and i.status = 'pending'
      ),
      'requests', (
        select coalesce(jsonb_agg(
                 jsonb_build_object('id', i.id,
                                    'team', public.team_summary(i.team_id),
                                    'message', i.message,
                                    'sentAt', i.created_at)
                 order by i.created_at desc), '[]'::jsonb)
          from public.team_invites i
         where i.user_id = v_uid and i.kind = 'request' and i.status = 'pending'
      )
    )
  );
end;
$$;

create or replace function public.team_summary(p_team uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', t.id,
    'name', t.name,
    'capacity', t.capacity,
    'memberCount', (select count(*) from public.team_members tm where tm.team_id = t.id),
    'seatsTaken', public.team_seats_taken(t.id),
    'captain', (select public.member_card(tm.user_id)->>'name'
                  from public.team_members tm
                 where tm.team_id = t.id and tm.role = 'captain')
  )
  from public.teams t where t.id = p_team;
$$;

-- The directory and the Teams page are for people who can act on them. Anyone else would
-- be browsing a list of students they cannot team with, which is a list of names and
-- majors with no purpose.
create or replace function public.require_team_access()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (public.is_accepted(auth.uid()) or public.is_admin()) then
    raise exception 'Teams open up once your League application is accepted.';
  end if;
end;
$$;

-- Accepted members only, never with an email. Ordered for someone looking for people:
-- members on no team first (a captain can invite them), then members on a team that
-- still has room (you can ask to join it), then members on a full team.
create or replace function public.member_directory(p_query text default '')
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_my_team uuid := public.team_of(auth.uid());
  -- Escaped so a search for "50%" matches that text rather than everything.
  v_q text := replace(replace(replace(btrim(coalesce(p_query, '')), '\', '\\'), '%', '\%'), '_', '\_');
begin
  perform public.require_team_access();

  return coalesce((
    select jsonb_agg(entry order by sort_group, lower(entry->>'name'))
    from (
      select
        case
          when t.id is null then 0
          when public.team_seats_taken(t.id) < t.capacity then 1
          else 2
        end as sort_group,
        public.member_card(a.user_id) || jsonb_build_object(
          'team', case when t.id is null then null else jsonb_build_object(
                    'id', t.id,
                    'name', t.name,
                    'open', public.team_seats_taken(t.id) < t.capacity,
                    'isYours', t.id = v_my_team) end,
          'invited', exists (select 1 from public.team_invites i
                              where i.user_id = a.user_id and i.team_id = v_my_team
                                and i.kind = 'invite' and i.status = 'pending'),
          'requested', t.id is not null and exists (
                         select 1 from public.team_invites i
                          where i.user_id = v_uid and i.team_id = t.id
                            and i.kind = 'request' and i.status = 'pending')
        ) as entry
      from public.applications a
      left join public.team_members tm on tm.user_id = a.user_id
      left join public.teams t on t.id = tm.team_id
      where a.decision = 'accepted'
        and a.user_id <> v_uid
        and (
          v_q = ''
          or a.full_name ilike '%' || v_q || '%'
          or a.major ilike '%' || v_q || '%'
          or a.interest ilike '%' || v_q || '%'
          or t.name ilike '%' || v_q || '%'
        )
      order by sort_group, lower(a.full_name)
      limit 300
    ) directory
  ), '[]'::jsonb);
end;
$$;

-- Every team, open ones first, with its roster.
create or replace function public.teams_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  perform public.require_team_access();

  return coalesce((
    select jsonb_agg(entry order by (entry->>'open')::boolean desc, lower(entry->>'name'))
    from (
      select public.team_summary(t.id) || jsonb_build_object(
        'open', public.team_seats_taken(t.id) < t.capacity,
        'isYours', t.id = public.team_of(v_uid),
        'requested', exists (select 1 from public.team_invites i
                              where i.team_id = t.id and i.user_id = v_uid
                                and i.kind = 'request' and i.status = 'pending'),
        'invitedYou', exists (select 1 from public.team_invites i
                               where i.team_id = t.id and i.user_id = v_uid
                                 and i.kind = 'invite' and i.status = 'pending'),
        'members', (
          select coalesce(jsonb_agg(
                   public.member_card(tm.user_id) || jsonb_build_object('role', tm.role)
                   order by tm.role = 'captain' desc, tm.joined_at), '[]'::jsonb)
            from public.team_members tm where tm.team_id = t.id
        )
      ) as entry
      from public.teams t
      where exists (select 1 from public.team_members tm where tm.team_id = t.id)
    ) overview
  ), '[]'::jsonb);
end;
$$;


-- ============================================================================
-- Admin: application decisions
-- ============================================================================
-- Lives here rather than with applications because a denial reaches into teams: someone
-- the League has turned down comes off their roster and loses every pending invite.

create or replace function public.decide_application(p_user_id uuid, p_decision text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only an admin can decide an application.';
  end if;
  if p_decision not in ('accepted', 'denied') then
    raise exception 'A decision is either accepted or denied.';
  end if;

  update public.applications
     set decision = p_decision
   where user_id = p_user_id and status = 'submitted';
  if not found then
    raise exception 'That application has not been submitted yet.';
  end if;

  if p_decision = 'denied' then
    perform public.vacate_team(p_user_id);
    perform public.cancel_pending_for(p_user_id);
  end if;
end;
$$;

create or replace function public.mark_decision_emailed(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only an admin can do that.';
  end if;
  update public.applications
     set decision_emailed_at = now()
   where user_id = p_user_id and decision is not null;
end;
$$;


-- ============================================================================
-- Row-Level Security and grants
-- ============================================================================

alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.team_invites enable row level security;

revoke all on public.teams, public.team_members, public.team_invites from anon, authenticated;
grant select on public.teams, public.team_members, public.team_invites to authenticated;

-- Team names and who is on which team are what the leaderboard and the Teams page show
-- to every signed-in member anyway.
create policy teams_select_signed_in on public.teams
  for select to authenticated using (true);

create policy team_members_select_signed_in on public.team_members
  for select to authenticated using (true);

-- Invites are private to the two sides of them.
create policy team_invites_select_involved on public.team_invites
  for select to authenticated
  using (
    user_id = auth.uid()
    or team_id = public.team_of(auth.uid())
    or public.is_admin()
  );

-- Supabase grants EXECUTE on new functions to anon and authenticated by default. Internal
-- helpers are revoked from both, since several of them act on an arbitrary user id and
-- trust their caller to have checked who is asking.
revoke execute on function
  public.cancel_pending_for(uuid),
  public.vacate_team(uuid),
  public.team_members_guard(),
  public.team_invites_guard(),
  public.teams_capacity_guard()
from public, anon, authenticated;

revoke execute on function
  public.is_accepted(uuid),
  public.team_of(uuid),
  public.team_seats_taken(uuid),
  public.captained_team(uuid),
  public.member_card(uuid),
  public.team_summary(uuid),
  public.require_team_access(),
  public.create_team(text, integer),
  public.update_team(text, integer),
  public.leave_team(),
  public.remove_teammate(uuid),
  public.invite_member(uuid, text),
  public.request_to_join(uuid, text),
  public.cancel_invite(uuid),
  public.respond_invite(uuid, boolean),
  public.my_team(),
  public.member_directory(text),
  public.teams_overview(),
  public.decide_application(uuid, text),
  public.mark_decision_emailed(uuid)
from public, anon;

-- Callable only from inside the functions above. member_card and team_summary would hand
-- anyone a name for any id, and is_accepted would tell anyone how any application went.
revoke execute on function
  public.is_accepted(uuid), public.member_card(uuid), public.team_summary(uuid)
from authenticated;

grant execute on function
  public.team_of(uuid),
  public.team_seats_taken(uuid),
  public.captained_team(uuid),
  public.require_team_access(),
  public.create_team(text, integer),
  public.update_team(text, integer),
  public.leave_team(),
  public.remove_teammate(uuid),
  public.invite_member(uuid, text),
  public.request_to_join(uuid, text),
  public.cancel_invite(uuid),
  public.respond_invite(uuid, boolean),
  public.my_team(),
  public.member_directory(text),
  public.teams_overview(),
  public.decide_application(uuid, text),
  public.mark_decision_emailed(uuid)
to authenticated;
