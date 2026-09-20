-- Admin roster management, driven from the chapter's admin portal.
--
-- Until now `profiles.is_admin` was set by hand in the Supabase dashboard, deliberately:
-- there was no route that wrote it, so becoming an admin was always a person's decision
-- made somewhere a member could not reach. That property is kept here. Nothing a signed-in
-- member can call touches these functions: EXECUTE is revoked from `authenticated` below,
-- and the only caller is the service route, which authenticates a request from the admin
-- portal with a shared secret rather than with a member session.
--
-- What changes is where the person does it. Opening the Supabase dashboard to flip a
-- boolean means whoever runs the League needs production database access for a routine
-- task, and it leaves no record of who did it.

create table public.admin_grants (
  id bigint generated always as identity primary key,

  -- The address the grant was made against, not a user id. A profile can be deleted;
  -- the record that somebody was once given admin should outlive it.
  target_email text not null,

  -- true for a grant, false for a revoke. Two rows tell the whole story of an account.
  granted boolean not null,

  -- Who did it. This is a portal admin's address, which is not necessarily a Tech League
  -- account, so it is text rather than a foreign key.
  actor text not null,

  created_at timestamptz not null default now(),

  constraint admin_grants_emails_lowercase
    check (target_email = lower(target_email) and actor = lower(actor))
);

comment on table public.admin_grants is
  'Append-only record of who granted or revoked Tech League admin, and when.';

create index admin_grants_target_idx on public.admin_grants (target_email, created_at desc);

-- ============================================================================
-- functions
-- ============================================================================

/**
 * The current admin roster, newest grant first.
 *
 * `granted_at` comes from the audit table rather than from profiles, so an admin who was
 * created before this migration simply has no date rather than a misleading one.
 */
create or replace function public.list_admins()
returns table (email text, full_name text, granted_at timestamptz, granted_by text)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.email,
    p.full_name,
    g.created_at,
    g.actor
  from public.profiles p
  left join lateral (
    select ag.created_at, ag.actor
      from public.admin_grants ag
     where ag.target_email = p.email
       and ag.granted
     order by ag.created_at desc
     limit 1
  ) g on true
  where p.is_admin
  order by g.created_at desc nulls last, p.email;
$$;

/**
 * Grants or revokes Tech League admin, and records who did it.
 *
 * Refuses rather than silently doing nothing when there is no account for the address.
 * The Tech League has no invite-before-signup path the way the portal's `admins` table
 * does: a `profiles` row is created by trigger from an auth user, so there is nothing to
 * attach a pending grant to. Inventing one would mean storing a promise of elevated
 * access against an unverified address, which is the thing worth avoiding.
 *
 * The last admin cannot be revoked. Recovering from an empty roster means going back to
 * the Supabase dashboard, which is the situation this whole migration exists to end.
 */
create or replace function public.set_admin(p_email text, p_grant boolean, p_actor text)
returns table (email text, is_admin boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(p_email));
  v_actor text := lower(trim(p_actor));
  v_id uuid;
  v_already boolean;
  v_others integer;
begin
  if v_actor is null or v_actor = '' then
    raise exception 'Every admin change has to record who made it.';
  end if;

  select p.id, p.is_admin into v_id, v_already
    from public.profiles p
   where p.email = v_email;

  if v_id is null then
    raise exception
      'There is no Tech League account for %. They need to create one on the Tech League site first, then you can make them an admin.',
      v_email;
  end if;

  -- Already in the requested state. Returning quietly rather than raising keeps the
  -- portal's button idempotent, so a double click is not an error the officer has to read.
  if v_already = p_grant then
    return query select v_email, v_already;
    return;
  end if;

  if not p_grant then
    select count(*) into v_others
      from public.profiles p
     where p.is_admin and p.email <> v_email;

    if v_others = 0 then
      raise exception
        'That is the only Tech League admin left. Make someone else an admin first, then remove this one.';
    end if;
  end if;

  update public.profiles set is_admin = p_grant where id = v_id;

  insert into public.admin_grants (target_email, granted, actor)
  values (v_email, p_grant, v_actor);

  return query select v_email, p_grant;
end;
$$;

-- ============================================================================
-- who may call these
-- ============================================================================

alter table public.admin_grants enable row level security;

-- No policy is declared on purpose. RLS with no policy denies every row to `anon` and
-- `authenticated`, and the service role bypasses RLS entirely, so the audit trail is
-- readable by the portal and by nobody in the browser.
revoke all on public.admin_grants from anon, authenticated;

-- EXECUTE defaults to PUBLIC on a new function, which on a security definer function that
-- writes is_admin would be a route to self-promotion for any signed-in member. These two
-- revokes are the whole access control for this file.
revoke all on function public.list_admins() from public, anon, authenticated;
revoke all on function public.set_admin(text, boolean, text) from public, anon, authenticated;

grant execute on function public.list_admins() to service_role;
grant execute on function public.set_admin(text, boolean, text) to service_role;
