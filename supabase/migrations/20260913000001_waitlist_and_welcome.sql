-- A waitlist decision, and a record of who has been sent the welcome email.
--
-- Waitlisted sits between accepted and denied: the League has no spot for them yet but
-- may later. It is not accepted, so everything is_accepted() gates (teams, invites, the
-- directory) stays closed to them, and moving an accepted member onto the waitlist takes
-- them off their team the same way a denial does. Accepting them later is the ordinary
-- accept.

alter table public.applications
  drop constraint applications_decision_known;

alter table public.applications
  add constraint applications_decision_known
    check (decision is null or decision in ('accepted', 'waitlisted', 'denied'));

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


-- ============================================================================
-- welcomed_at
-- ============================================================================
-- Stamped by the API when the welcome email is sent, which happens the first time an
-- account becomes usable: on confirming the email, or on first sign-in with ColorStack.
-- It makes the email once-only, so confirming a second time (a fresh link after a
-- password reset, say) does not welcome them again.
--
-- Not in the member's column grants: only the service role writes it.

alter table public.profiles
  add column welcomed_at timestamptz;

comment on column public.profiles.welcomed_at is
  'When the welcome email was sent. Set once, by the API.';

-- Claims the welcome atomically, so two confirmations landing together send one email.
create or replace function public.claim_welcome(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  with claimed as (
    update public.profiles
       set welcomed_at = now()
     where id = p_user_id and welcomed_at is null
    returning 1
  )
  select exists (select 1 from claimed);
$$;

revoke execute on function public.claim_welcome(uuid) from public, anon, authenticated;
grant execute on function public.claim_welcome(uuid) to service_role;

-- If the send then fails, the API gives the claim back so a later sign-in can try again.
create or replace function public.release_welcome(p_user_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles set welcomed_at = null where id = p_user_id;
$$;

revoke execute on function public.release_welcome(uuid) from public, anon, authenticated;
grant execute on function public.release_welcome(uuid) to service_role;
