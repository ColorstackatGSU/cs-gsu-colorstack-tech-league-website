-- Record WHICH OFFICER acted, by address, not by Tech League profile.
--
-- 20260920000002 resolved the acting officer to a `profiles` row and stored that id in
-- `scores.entered_by`. That cannot work for the people who will actually be using this.
-- `profiles.email` is constrained to `^[^@\s]+@student\.gsu\.edu$`, because a Tech League
-- profile is a student account. A chapter officer signs in to the admin portal with a
-- chapter address, and the only admin on the roster today is
-- official@colorstackatgsu.com, which that CHECK forbids. So `actor_profile()` returned
-- NULL for the real roster and every portal write landed unattributed, which is the exact
-- thing 20260920000002 was written to prevent.
--
-- The identifier that always exists is the address the portal authenticated. It is not a
-- foreign key and cannot be, since the person may have no Tech League account at all, and
-- that is fine: this is an audit note about who pressed the button, not a relationship.
--
-- The uuid columns stay and keep their meaning. A score entered by a student admin inside
-- the Tech League still records `entered_by`; a score entered from the portal records
-- `entered_by_email`. Reading "who entered this" means preferring the email and falling
-- back to the profile, which is what the view at the bottom does.

alter table public.scores
  add column if not exists entered_by_email text;

alter table public.applications
  add column if not exists decided_by_email text;

comment on column public.scores.entered_by_email is
  'The portal officer who entered this, by address. NULL when a Tech League admin entered it directly, in which case entered_by holds their profile.';
comment on column public.applications.decided_by_email is
  'The portal officer who decided this, by address. NULL when decided inside the Tech League, in which case decided_by holds their profile.';

-- ============================================================================
-- portal_save_score, attributing by address
-- ============================================================================

create or replace function public.portal_save_score(
  p_team uuid,
  p_event text,
  p_points numeric,
  p_actor text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_actor, '')));
begin
  if v_email = '' then
    raise exception 'Every score change has to record who made it.';
  end if;

  if p_points is null then
    delete from public.scores s where s.team_id = p_team and s.event_id = p_event;
    return;
  end if;

  if p_points < 0 then
    raise exception 'Scores cannot be negative.';
  end if;

  -- Checked here rather than left to the foreign key, because a violation surfaces as a
  -- 23503 the API has no mapping for, which reached the officer as "something went wrong
  -- on our end" for the ordinary case of a team that was deleted while their tab was open.
  if not exists (select 1 from public.teams t where t.id = p_team) then
    raise exception 'That team could not be found. It may have been deleted since this page loaded.';
  end if;

  if not exists (select 1 from public.events e where e.id = p_event) then
    raise exception 'That event could not be found.';
  end if;

  insert into public.scores (team_id, event_id, points, entered_by_email)
  values (p_team, p_event, p_points, v_email)
  on conflict (team_id, event_id)
  do update set points = excluded.points,
                entered_by_email = excluded.entered_by_email,
                -- The previous author was a Tech League admin acting in their own session.
                -- They did not enter this value, so their id must not stay attached to it.
                entered_by = null;
end;
$$;

revoke all on function public.portal_save_score(uuid, text, numeric, text)
  from public, anon, authenticated;
grant execute on function public.portal_save_score(uuid, text, numeric, text) to service_role;

-- ============================================================================
-- portal_decide_application: attribute by address, and stop mislabelling a missing row
-- ============================================================================

/**
 * An unknown application reported "That application has not been submitted yet."
 *
 * apply_decision updates `where user_id = ? and status = 'submitted'` and raises that
 * sentence on `not found`, which cannot tell a row that is a draft from a row that is not
 * there at all. An officer following a stale link was told the applicant had not finished,
 * which is a different problem with a different response.
 */
create or replace function public.portal_decide_application(
  p_user_id uuid,
  p_decision text,
  p_actor text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_actor, '')));
begin
  if v_email = '' then
    raise exception 'Every decision has to record who made it.';
  end if;

  if not exists (select 1 from public.applications a where a.user_id = p_user_id) then
    raise exception 'That application could not be found.' using errcode = 'no_data_found';
  end if;

  perform public.apply_decision(p_user_id, p_decision);

  -- A second, narrow update. The applications guard watches the decision columns, and
  -- touching only this one keeps it from re-stamping anything it already set.
  update public.applications
     set decided_by_email = v_email
   where user_id = p_user_id;
end;
$$;

revoke all on function public.portal_decide_application(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.portal_decide_application(uuid, text, text) to service_role;

-- ============================================================================
-- reading it back
-- ============================================================================

/**
 * Who entered a score, however it was entered.
 *
 * A single expression so every caller answers the question the same way, rather than each
 * one remembering that there are two columns and which takes precedence.
 */
create or replace function public.score_author(p_entered_by uuid, p_entered_by_email text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    p_entered_by_email,
    (select p.email from public.profiles p where p.id = p_entered_by)
  );
$$;

revoke all on function public.score_author(uuid, text) from public, anon;
grant execute on function public.score_author(uuid, text) to authenticated, service_role;
