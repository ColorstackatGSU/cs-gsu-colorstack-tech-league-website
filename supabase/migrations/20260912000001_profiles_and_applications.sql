-- Profiles and League applications.
--
-- Every account is a GSU student, full stop. The site is for GSU students, the decision
-- email goes to the address the account was verified with, and an admin reviewing an
-- application needs to know the person behind it is who they say. So the student domain is
-- a CHECK on profiles rather than only a regex in the signup form: an account created by
-- any other route (the ColorStack callback, the dashboard, a script) fails the same way.
--
-- The browser never talks to this database. Every request goes through the API in api/,
-- which runs queries as the signed-in member (their JWT, so auth.uid() and every policy
-- below apply) and only reaches for the service role where no member is signed in yet:
-- creating the account, and the ColorStack callback.
--
-- Supabase grants anon and authenticated every privilege on new public tables by default.
-- Each table below revokes that first and grants back only what a member can do, so a
-- forgotten policy fails closed instead of open.

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;


-- ============================================================================
-- profiles
-- ============================================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,

  -- Copied from auth.users at creation. Lowercase because every lookup (linking a
  -- ColorStack sign-in to an existing account, above all) is by email, and drifting
  -- casing quietly turns one person into two.
  email text not null unique,

  -- What the rest of the site calls them. Filled from the application or the ColorStack
  -- profile, whichever arrives first; null until then, and the UI falls back to the email.
  full_name text,

  -- Set by hand in the Supabase dashboard. There is deliberately no API route that
  -- changes it, so becoming an admin is always a person's decision.
  is_admin boolean not null default false,

  -- The portal's stable member id, set the first time they use Sign in with ColorStack.
  colorstack_sub text unique,

  linkedin_url     text,
  github_url       text,
  discord_username text,

  -- The file itself lives in the private `resumes` bucket at <id>/resume.pdf. The path is
  -- derived, never stored, so no row can point a download at somebody else's file.
  resume_name        text,
  resume_size        integer,
  resume_uploaded_at timestamptz,
  resume_source      text,
  -- The portal's resume_uploaded_at claim, compared verbatim on each ColorStack sign-in
  -- to decide whether to download a fresh copy. Text because it is their value, not ours.
  colorstack_resume_uploaded_at text,
  -- Set when the member deletes their resume, cleared when they upload one. Deleting is the
  -- opt-out from partners seeing it, so a later ColorStack sign-in must not quietly copy
  -- their portal resume back in.
  resume_deleted_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint profiles_email_is_student
    check (email = lower(email) and email ~ '^[^@\s]+@student\.gsu\.edu$'),
  constraint profiles_full_name_length
    check (full_name is null or length(full_name) <= 120),
  constraint profiles_resume_source_known
    check (resume_source is null or resume_source in ('upload', 'colorstack')),
  constraint profiles_resume_is_whole
    check ((resume_name is null) = (resume_uploaded_at is null)),
  constraint profiles_resume_size_sane
    check (resume_size is null or resume_size between 1 and 4194304)
);

comment on table public.profiles is
  'One row per auth user, created by trigger. Student accounts only.';
comment on column public.profiles.is_admin is
  'Grants the /admin page. Set by hand; no route writes it.';

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Every auth user gets a profile in the same transaction. If the email is not a student
-- address the CHECK above fails, and so does creating the auth user: the API validates
-- first so a member sees a sentence, but this is what holds when something skips the API.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, lower(new.email));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Security definer so policies on other tables can ask without the caller needing to read
-- profiles. Without that, a policy on applications that reads profiles would recurse
-- through the profiles policy that calls this.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

alter table public.profiles enable row level security;

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
-- Column grants, not a policy, are what stop a member writing is_admin, email or
-- colorstack_sub: a policy can say which rows, only a grant can say which columns.
grant update (full_name, linkedin_url, github_url, discord_username,
              resume_name, resume_size, resume_uploaded_at, resume_source, resume_deleted_at)
  on public.profiles to authenticated;

create policy profiles_select_own_or_admin on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());


-- ============================================================================
-- applications
-- ============================================================================

create table public.applications (
  user_id uuid primary key references public.profiles (id) on delete cascade,

  status text not null default 'draft',

  full_name      text,
  school_email   text,
  personal_email text,
  race_ethnicity text[],
  year           text,
  major          text,
  grad_term      text,
  interest       text,
  team_pref      text,
  why_join       text,
  goals          text,
  experience     text,
  commitment     text,

  -- Admin review. Null is "not decided yet", which is also what every draft is.
  decision            text,
  decided_at          timestamptz,
  decided_by          uuid references public.profiles (id) on delete set null,
  -- Stamped only after the email actually leaves, so a failed send shows up in the admin
  -- view as unsent and can be retried rather than looking like it went.
  decision_emailed_at timestamptz,

  submitted_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint applications_status_known
    check (status in ('draft', 'submitted')),
  constraint applications_decision_known
    check (decision is null or decision in ('accepted', 'denied')),
  constraint applications_decision_needs_submission
    check (decision is null or status = 'submitted'),

  constraint applications_school_email_is_student
    check (school_email is null or school_email ~ '^[^@\s]+@student\.gsu\.edu$'),
  constraint applications_personal_email_shape
    check (personal_email is null or personal_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  constraint applications_team_pref_known
    check (team_pref is null or team_pref in ('team', 'have-team')),
  constraint applications_commitment_known
    check (commitment is null or commitment in ('1-2', '3-5', '6-8', '9+')),

  constraint applications_lengths check (
        coalesce(length(full_name), 0) <= 120
    and coalesce(length(personal_email), 0) <= 254
    and coalesce(length(year), 0) <= 60
    and coalesce(length(major), 0) <= 80
    and coalesce(length(grad_term), 0) <= 20
    and coalesce(length(interest), 0) <= 80
    and coalesce(length(why_join), 0) <= 4000
    and coalesce(length(goals), 0) <= 4000
    and coalesce(length(experience), 0) <= 4000
  ),

  -- Same seven 2024 SPD-15 categories plus an explicit decline as the member portal, and
  -- the same three states: NULL is never answered, {'Prefer not to say'} is asked and
  -- declined, anything else is an answer. cardinality() rather than array_length(),
  -- because array_length('{}', 1) is NULL, NULL passes a CHECK, and the portal shipped
  -- exactly that bug before catching it.
  constraint applications_race_ethnicity_known check (
    race_ethnicity is null
    or (
      cardinality(race_ethnicity) >= 1
      and race_ethnicity <@ array[
            'American Indian or Alaska Native',
            'Asian',
            'Black or African American',
            'Hispanic or Latino',
            'Middle Eastern or North African',
            'Native Hawaiian or Pacific Islander',
            'White',
            'Prefer not to say'
          ]::text[]
      and (
        not ('Prefer not to say' = any (race_ethnicity))
        or cardinality(race_ethnicity) = 1
      )
    )
  ),

  -- A draft may be any shape. A submission must be whole, and saying so here means a
  -- request that skips the form's validation still cannot file half an application.
  constraint applications_submission_is_complete check (
    status = 'draft'
    or (
          length(btrim(coalesce(full_name, ''))) > 0
      and school_email is not null
      and personal_email is not null
      and lower(personal_email) <> lower(school_email)
      and race_ethnicity is not null
      and year is not null
      and major is not null
      and grad_term is not null
      and interest is not null
      and team_pref is not null
      and commitment is not null
      and length(btrim(coalesce(why_join, ''))) >= 40
      and length(btrim(coalesce(goals, ''))) > 0
    )
  )
);

comment on table public.applications is
  'One per member. Editable as a draft; frozen once submitted except by an admin.';
comment on column public.applications.race_ethnicity is
  'Self-identified, multi-select, 2024 SPD-15 categories. Admin-only: never shown to other '
  'members, never in the directory.';

create index applications_review_idx
  on public.applications (status, decision, submitted_at);

-- Who is running this statement with authority beyond a member's: an admin, or code that
-- is not a member session at all (the service role, a security definer function owned by
-- postgres, someone in psql).
create or replace function public.is_privileged()
returns boolean
language sql
stable
as $$
  select current_user in ('postgres', 'service_role') or public.is_admin();
$$;

-- The immutability rule lives here, not in the API, because the API is not the only
-- thing that can write a row. A submitted application's answers never change. Moving it
-- back to draft is the one way to let a member edit again, and only an admin can do it.
create or replace function public.applications_guard()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and old.status = 'submitted' then
    if new.status = 'draft' then
      if not public.is_privileged() then
        raise exception 'Your application has already been submitted, so it can no longer be changed.';
      end if;
      -- Reopening wipes the decision: whatever was decided was about answers that are
      -- about to change.
      new.decision := null;
      new.decided_at := null;
      new.decided_by := null;
      new.decision_emailed_at := null;
      new.submitted_at := null;
    elsif (new.full_name, new.school_email, new.personal_email, new.race_ethnicity,
           new.year, new.major, new.grad_term, new.interest, new.team_pref,
           new.why_join, new.goals, new.experience, new.commitment)
          is distinct from
          (old.full_name, old.school_email, old.personal_email, old.race_ethnicity,
           old.year, old.major, old.grad_term, old.interest, old.team_pref,
           old.why_join, old.goals, old.experience, old.commitment) then
      raise exception 'Your application has already been submitted, so it can no longer be changed.';
    end if;
  end if;

  if new.status = 'submitted' and (tg_op = 'INSERT' or old.status = 'draft') then
    new.submitted_at := now();
  end if;

  if new.decision is distinct from (case when tg_op = 'UPDATE' then old.decision end) then
    if not public.is_privileged() then
      raise exception 'Only an admin can decide an application.';
    end if;
    new.decided_at := case when new.decision is null then null else now() end;
    new.decided_by := auth.uid();
    new.decision_emailed_at := null;
  end if;

  return new;
end;
$$;

create trigger applications_guard
  before insert or update on public.applications
  for each row execute function public.applications_guard();

create trigger applications_touch_updated_at
  before update on public.applications
  for each row execute function public.touch_updated_at();

-- Keeps profiles.full_name following the application, so a teammate list or an invite
-- shows the name the member actually typed.
create or replace function public.applications_sync_name()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if length(btrim(coalesce(new.full_name, ''))) > 0 then
    update public.profiles
       set full_name = btrim(new.full_name)
     where id = new.user_id
       and full_name is distinct from btrim(new.full_name);
  end if;
  return new;
end;
$$;

create trigger applications_sync_name
  after insert or update of full_name on public.applications
  for each row execute function public.applications_sync_name();

alter table public.applications enable row level security;

revoke all on public.applications from anon, authenticated;
grant select on public.applications to authenticated;
grant insert (user_id, status, full_name, school_email, personal_email, race_ethnicity,
              year, major, grad_term, interest, team_pref, why_join, goals, experience,
              commitment)
  on public.applications to authenticated;
grant update (status, full_name, school_email, personal_email, race_ethnicity,
              year, major, grad_term, interest, team_pref, why_join, goals, experience,
              commitment)
  on public.applications to authenticated;

-- Nobody reads anyone else's application. Admins read all of them to review.
create policy applications_select_own_or_admin on public.applications
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy applications_insert_own on public.applications
  for insert to authenticated
  with check (user_id = auth.uid());

-- USING on status = 'draft' is what makes a second submit touch zero rows. The trigger
-- would refuse it anyway; this means it never gets that far.
create policy applications_update_own_draft on public.applications
  for update to authenticated
  using (user_id = auth.uid() and status = 'draft')
  with check (user_id = auth.uid());


-- ============================================================================
-- Admin actions
-- ============================================================================

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

  update public.applications
     set status = 'draft'
   where user_id = p_user_id
     and status = 'submitted';

  if not found then
    raise exception 'That application is not submitted, so there is nothing to reopen.';
  end if;

  -- Reopening clears the decision, and only accepted members can be on a team, so they
  -- come off it until they are accepted again. vacate_team is defined with teams.
  perform public.vacate_team(p_user_id);
  perform public.cancel_pending_for(p_user_id);
end;
$$;

revoke execute on function public.reopen_application(uuid) from public, anon;
grant execute on function public.reopen_application(uuid) to authenticated;
