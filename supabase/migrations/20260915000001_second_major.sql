-- Second major: optional, from the same list as the first one.
--
-- Deliberately not part of applications_submission_is_complete. Most applicants have one
-- major, and a blank here means "not double majoring", not "unanswered".

alter table public.applications
  add column second_major text;

comment on column public.applications.second_major is
  'Optional. NULL means the applicant is not double majoring.';

-- The length ceiling lives in one CHECK covering every text answer, so it has to be
-- replaced rather than added to.
alter table public.applications
  drop constraint applications_lengths;

alter table public.applications
  add constraint applications_lengths check (
        coalesce(length(full_name), 0) <= 120
    and coalesce(length(personal_email), 0) <= 254
    and coalesce(length(year), 0) <= 60
    and coalesce(length(major), 0) <= 80
    and coalesce(length(second_major), 0) <= 80
    and coalesce(length(grad_term), 0) <= 20
    and coalesce(length(interest), 0) <= 80
    and coalesce(length(why_join), 0) <= 4000
    and coalesce(length(goals), 0) <= 4000
    and coalesce(length(experience), 0) <= 4000
  );

-- A submitted application's answers are frozen. The guard compares the answer columns by
-- name, so a new column is invisible to it until it is listed here.
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
           new.year, new.major, new.second_major, new.grad_term, new.interest, new.team_pref,
           new.why_join, new.goals, new.experience, new.commitment)
          is distinct from
          (old.full_name, old.school_email, old.personal_email, old.race_ethnicity,
           old.year, old.major, old.second_major, old.grad_term, old.interest, old.team_pref,
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

-- Column privileges are per column, so a new one is unwritable by members until granted.
grant insert (second_major), update (second_major)
  on public.applications to authenticated;
