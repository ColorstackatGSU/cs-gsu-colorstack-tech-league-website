-- Verified addresses: the account's student email, and the application's personal email.
--
-- email_verified_at is ours, not Supabase's. auth.users.email_confirmed_at is set straight
-- away whenever the project's "Confirm email" switch is off, so trusting it meant a student
-- could sign up and log in without ever opening the link we sent. The API stamps this
-- column only when someone proves they hold the address: opening the confirmation link, a
-- password reset link, or signing in through the ColorStack portal (which has verified the
-- address itself). Login and every authenticated request refuse an account without it.
--
-- personal_email_verified_at is the same idea for the address decisions are emailed to.
-- A typo there used to mean an accepted student never heard back. It is cleared whenever
-- the address changes, and an application cannot be submitted until it is set.
--
-- Neither column is in any member grant: only the service role writes them.

alter table public.profiles
  add column email_verified_at timestamptz;

comment on column public.profiles.email_verified_at is
  'When the member proved they hold their student email. Set by the API only.';

-- Accounts that already went through a link or the portal. welcomed_at is only ever
-- stamped on those two paths. Everyone else confirms on their next login.
update public.profiles
   set email_verified_at = coalesce(welcomed_at, now())
 where welcomed_at is not null
    or colorstack_sub is not null;


alter table public.applications
  add column personal_email_verified_at timestamptz;

comment on column public.applications.personal_email_verified_at is
  'When the member opened the confirmation link sent to personal_email. Set by the API only.';

-- Before: a changed address is an unconfirmed address, and only the service role (or an
-- admin) may say otherwise.
create or replace function public.applications_personal_email_reset()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE'
     and lower(coalesce(new.personal_email, '')) is distinct from lower(coalesce(old.personal_email, '')) then
    new.personal_email_verified_at := null;
  end if;

  if tg_op = 'INSERT' and not public.is_privileged() then
    new.personal_email_verified_at := null;
  end if;

  return new;
end;
$$;

create trigger applications_personal_email_reset
  before insert or update on public.applications
  for each row execute function public.applications_personal_email_reset();

-- After, so an incomplete submission still fails on applications_submission_is_complete
-- first and says what is actually missing.
create or replace function public.applications_require_confirmed_email()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'submitted'
     and (tg_op = 'INSERT' or old.status = 'draft')
     and new.personal_email_verified_at is null then
    raise exception 'Confirm your personal email before submitting your application.';
  end if;
  return null;
end;
$$;

create trigger applications_require_confirmed_email
  after insert or update on public.applications
  for each row execute function public.applications_require_confirmed_email();
