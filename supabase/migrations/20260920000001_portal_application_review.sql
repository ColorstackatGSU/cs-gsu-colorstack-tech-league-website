-- Application review and score entry, driven from the chapter's admin portal.
--
-- The portal's officers sign in at admin.colorstackatgsu.com and may have no Tech League
-- account at all, so the routes behind this run as the service role with a shared secret
-- (see api/_routes/service.ts). That is the problem this file exists to solve:
-- decide_application, reopen_application and mark_decision_emailed all open with
-- `if not public.is_admin()`, and is_admin() reads auth.uid(), which is NULL for the
-- service role. Called from the portal they raise 'Only an admin can decide an
-- application.' every time, which reads as a bug in the portal and is not one.
--
-- Rather than loosening that check, the work each one does is moved into an internal
-- function with no check of its own, and two callers are put in front of it:
--
--   decide_application(...)         the member path. Unchanged behaviour: is_admin(),
--                                   then the work. /api/admin still calls this.
--   portal_decide_application(...)  the portal path. EXECUTE is granted to service_role
--                                   and to nobody else, and it carries the officer's
--                                   address the way set_admin already does.
--
-- is_privileged() is deliberately NOT used to gate the portal functions. It asks
-- `current_user in ('postgres', 'service_role')`, and inside a security definer function
-- current_user is the function's owner, so it is true for every caller. It is safe in
-- applications_guard() only because that trigger is not security definer. A grant is the
-- real boundary here, exactly as it is for set_admin().

-- ============================================================================
-- the work, with no opinion about who is asking
-- ============================================================================

create or replace function public.apply_decision(p_user_id uuid, p_decision text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_decision not in ('accepted', 'waitlisted', 'denied') then
    raise exception 'A decision is accepted, waitlisted, or denied.';
  end if;

  update public.applications
     set decision = p_decision
   where user_id = p_user_id and status = 'submitted';
  if not found then
    raise exception 'That application has not been submitted yet.';
  end if;

  -- Teams are for accepted members only, so any other decision takes them off theirs.
  if p_decision <> 'accepted' then
    perform public.vacate_team(p_user_id);
    perform public.cancel_pending_for(p_user_id);
  end if;
end;
$$;

create or replace function public.apply_reopen(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.applications
     set status = 'draft'
   where user_id = p_user_id
     and status = 'submitted';

  if not found then
    raise exception 'That application is not submitted, so there is nothing to reopen.';
  end if;

  -- Reopening clears the decision, and only accepted members can be on a team, so they
  -- come off it until they are accepted again.
  perform public.vacate_team(p_user_id);
  perform public.cancel_pending_for(p_user_id);
end;
$$;

create or replace function public.apply_decision_emailed(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.applications
     set decision_emailed_at = now()
   where user_id = p_user_id and decision is not null;
end;
$$;

-- ============================================================================
-- the member path, unchanged
-- ============================================================================

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
  perform public.apply_decision(p_user_id, p_decision);
end;
$$;

create or replace function public.reopen_application(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only an admin can reopen an application.';
  end if;
  perform public.apply_reopen(p_user_id);
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
  perform public.apply_decision_emailed(p_user_id);
end;
$$;

-- ============================================================================
-- the portal path
-- ============================================================================

/**
 * Resolves an officer's address to a Tech League profile, or NULL.
 *
 * applications.decided_by is a uuid referencing profiles, so an officer who has no Tech
 * League account cannot be recorded in it. NULL is the honest answer in that case: it is
 * what the column already holds for every decision made before the portal existed.
 */
create or replace function public.actor_profile(p_actor text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.id from public.profiles p where p.email = lower(trim(p_actor));
$$;

create or replace function public.portal_decide_application(
  p_user_id uuid, p_decision text, p_actor text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
begin
  if p_actor is null or trim(p_actor) = '' then
    raise exception 'Every decision has to record who made it.';
  end if;

  perform public.apply_decision(p_user_id, p_decision);

  -- applications_guard() sets decided_by from auth.uid() when the decision changes, and
  -- there is no auth.uid() here. This second update touches only decided_by, so the guard
  -- sees no decision change and leaves the rest of the row alone.
  v_actor := public.actor_profile(p_actor);
  if v_actor is not null then
    update public.applications
       set decided_by = v_actor
     where user_id = p_user_id and decision is not null;
  end if;
end;
$$;

create or replace function public.portal_reopen_application(p_user_id uuid, p_actor text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_actor is null or trim(p_actor) = '' then
    raise exception 'Every reopen has to record who asked for it.';
  end if;
  -- Nothing records the actor here: reopening clears decided_by along with the decision,
  -- so there is no column left that would hold it.
  perform public.apply_reopen(p_user_id);
end;
$$;

create or replace function public.portal_mark_decision_emailed(p_user_id uuid, p_actor text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_actor is null or trim(p_actor) = '' then
    raise exception 'Every decision email has to record who sent it.';
  end if;
  perform public.apply_decision_emailed(p_user_id);
end;
$$;

-- ============================================================================
-- who may call these
-- ============================================================================

-- EXECUTE defaults to PUBLIC on a new function. The internals decide an application for
-- an arbitrary user id with no check at all, so leaving that default would hand every
-- signed-in member the admin page's powers.
revoke all on function
  public.apply_decision(uuid, text),
  public.apply_reopen(uuid),
  public.apply_decision_emailed(uuid),
  public.actor_profile(text),
  public.portal_decide_application(uuid, text, text),
  public.portal_reopen_application(uuid, text),
  public.portal_mark_decision_emailed(uuid, text)
from public, anon, authenticated;

grant execute on function
  public.portal_decide_application(uuid, text, text),
  public.portal_reopen_application(uuid, text),
  public.portal_mark_decision_emailed(uuid, text)
to service_role;

-- Restated rather than assumed: the three above are replaced in this file, and the member
-- path stops working the moment their grants are lost.
revoke execute on function
  public.decide_application(uuid, text),
  public.reopen_application(uuid),
  public.mark_decision_emailed(uuid)
from public, anon;

grant execute on function
  public.decide_application(uuid, text),
  public.reopen_application(uuid),
  public.mark_decision_emailed(uuid)
to authenticated;
