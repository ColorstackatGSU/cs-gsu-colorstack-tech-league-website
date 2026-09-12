-- Season events and the scores teams earn at them.
--
-- Scoring is server-authoritative. Admins write scores and nobody else can: members have
-- SELECT and nothing more. The frontend's src/lib/season.js still does the weighting and
-- ranking for display, but it only ever works on raw points that came from this table, so
-- there is no request a member can make that changes where a team stands.
--
-- events mirrors the EVENTS array in season.js. The ids are the join key between the two
-- and must match exactly; weight and max are stored here too so a score can be checked
-- against its event's ceiling on the way in rather than trusted to the admin page.

create table public.events (
  id text primary key,
  name text not null,
  weight numeric(5, 2) not null,
  max_points numeric(6, 2) not null,
  position integer not null unique,

  constraint events_id_shape check (id ~ '^[a-z0-9-]+$'),
  constraint events_weight_range check (weight > 0 and weight <= 100),
  constraint events_max_positive check (max_points > 0)
);

comment on table public.events is
  'Mirrors EVENTS in src/lib/season.js. Ids must match it exactly.';

insert into public.events (id, name, weight, max_points, position) values
  ('kickoff',         'Build Night & Mock Interviews', 15, 100, 1),
  ('internal-1',      'Internal Challenge 1',          15, 100, 2),
  ('challenge-night', 'Challenge Night',               15, 100, 3),
  ('internal-2',      'Internal Challenge 2',          15, 100, 4),
  ('finale',          'Mini Hackathon',                40, 100, 5);

create table public.scores (
  team_id uuid not null references public.teams (id) on delete cascade,
  -- restrict, so retiring an event cannot silently erase what teams earned at it.
  event_id text not null references public.events (id) on delete restrict,
  points numeric(6, 2) not null,
  entered_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  primary key (team_id, event_id),
  constraint scores_points_not_negative check (points >= 0)
);

create trigger scores_touch_updated_at
  before update on public.scores
  for each row execute function public.touch_updated_at();

-- A CHECK cannot look at another table, so the event ceiling is a trigger. Refusing rather
-- than clamping: season.js clamps for display, but a 110 stored as 100 hides a typo that
-- an admin would want to know they made.
create or replace function public.scores_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_max numeric;
begin
  select e.max_points into v_max from public.events e where e.id = new.event_id;
  if new.points > v_max then
    raise exception 'That event is scored out of %, so % is too high.', v_max, new.points;
  end if;
  new.entered_by := auth.uid();
  return new;
end;
$$;

create trigger scores_guard
  before insert or update on public.scores
  for each row execute function public.scores_guard();

alter table public.events enable row level security;
alter table public.scores enable row level security;

revoke all on public.events, public.scores from anon, authenticated;
grant select on public.events to authenticated;
grant select, insert, update, delete on public.scores to authenticated;

create policy events_select_signed_in on public.events
  for select to authenticated using (true);

create policy scores_select_signed_in on public.scores
  for select to authenticated using (true);

-- The grant above lets a member attempt a write; these are what refuse it.
create policy scores_insert_admin on public.scores
  for insert to authenticated with check (public.is_admin());

create policy scores_update_admin on public.scores
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy scores_delete_admin on public.scores
  for delete to authenticated using (public.is_admin());

revoke execute on function public.scores_guard() from public, anon, authenticated;


-- ============================================================================
-- standings
-- ============================================================================
-- The shape the Leaderboard has always read: teams with raw per-event points, unranked.
-- Ranking stays in season.js so a rule change happens in one place.
--
-- A team is on the board once it has enough people to compete or once it has been scored.
-- The second clause matters: a team that drops to two members mid-season keeps the
-- points it already earned on the board.

create or replace function public.standings()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'teams', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', t.id,
               'name', t.name,
               'members', (select count(*) from public.team_members tm where tm.team_id = t.id),
               'scores', coalesce((
                 select jsonb_object_agg(s.event_id, s.points)
                   from public.scores s where s.team_id = t.id
               ), '{}'::jsonb)
             ) order by lower(t.name))
        from public.teams t
       where (select count(*) from public.team_members tm where tm.team_id = t.id) >= 3
          or exists (select 1 from public.scores s where s.team_id = t.id)
    ), '[]'::jsonb),
    'updatedAt', (select max(s.updated_at) from public.scores s)
  );
$$;

revoke execute on function public.standings() from public, anon;
grant execute on function public.standings() to authenticated;
