-- Keep a score's author when it is entered from the admin portal.
--
-- scores_guard stamps `entered_by := auth.uid()` on every insert and update. For a member
-- that is exactly right. For the portal it is not: those writes run as the service role,
-- auth.uid() is NULL, and the assignment is unconditional, so it overwrites anything the
-- caller set. Every score entered through the portal landed with no author, and a second
-- update could not repair it because the guard fires again.
--
-- That did not matter while /admin on the Tech League was the only way to enter a score.
-- It matters now: the portal is becoming the only way, so without this every score in the
-- season would have no recorded author. Scores decide the standings, so who typed one is
-- the audit trail most worth keeping.

-- ============================================================================
-- the guard stops clobbering an author it did not set
-- ============================================================================

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

  -- A member's own id always wins, so a member cannot claim a score was entered by
  -- somebody else by sending an entered_by of their choosing. Only when there is no
  -- session at all, which is the service role and therefore the portal, is the value the
  -- caller supplied kept. NULL either way if neither is known.
  new.entered_by := coalesce(auth.uid(), new.entered_by);
  return new;
end;
$$;

-- ============================================================================
-- portal_save_score
-- ============================================================================

/**
 * Writes one team's score on behalf of a portal officer, or clears it.
 *
 * The actor is an email rather than an id because the portal knows officers by address and
 * may not know whether they have a Tech League account at all. actor_profile resolves it
 * when they do; when they do not, the score is still written and the author is simply
 * unknown, which is better than refusing to record a result on the night of an event.
 *
 * Null points clears the row, matching the route's contract.
 */
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
  v_actor uuid;
begin
  if p_actor is null or btrim(p_actor) = '' then
    raise exception 'Every score change has to record who made it.';
  end if;

  if p_points is null then
    delete from public.scores s where s.team_id = p_team and s.event_id = p_event;
    return;
  end if;

  if p_points < 0 then
    raise exception 'Scores cannot be negative.';
  end if;

  v_actor := public.actor_profile(p_actor);

  insert into public.scores (team_id, event_id, points, entered_by)
  values (p_team, p_event, p_points, v_actor)
  on conflict (team_id, event_id)
  do update set points = excluded.points, entered_by = excluded.entered_by;
end;
$$;

-- Same boundary as the other portal functions: the grant is what keeps a signed-in member
-- out, because a check on current_user inside a security definer body would see the owner
-- rather than the caller and pass for everyone.
revoke all on function public.portal_save_score(uuid, text, numeric, text)
  from public, anon, authenticated;
grant execute on function public.portal_save_score(uuid, text, numeric, text) to service_role;
