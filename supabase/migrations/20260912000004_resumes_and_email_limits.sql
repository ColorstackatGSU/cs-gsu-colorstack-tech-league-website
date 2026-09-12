-- Resume storage, and a rate limit on the emails anyone can make us send.
--
-- Resumes work the way the member portal's do: every uploaded resume is shared with the
-- League's partners, there is no toggle, and deleting the file is the opt-out. One file per
-- member at <user id>/resume.pdf in a private bucket; the API streams it back to its owner
-- and to admins, and nothing is ever served from a public URL.
--
-- Retention: resumes are kept for about a month after the season, then the whole Supabase
-- project is deleted when the site is retired.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('resumes', 'resumes', false, 4194304, array['application/pdf']);

-- The first path segment is the owner. storage.foldername splits on '/', so a member can
-- only read or write inside their own folder, and an admin can read every folder.
create policy resumes_select_own_or_admin on storage.objects
  for select to authenticated
  using (
    bucket_id = 'resumes'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

create policy resumes_insert_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

create policy resumes_update_own on storage.objects
  for update to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

create policy resumes_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);


-- ============================================================================
-- email_sends
-- ============================================================================
-- Signup, "resend my link" and "forgot password" all send an email to an address typed by
-- someone who is not signed in. Without a limit, that is a button anyone can press to
-- flood a student's inbox from our mailbox, and every one of those sends counts against
-- the chapter mailbox's daily Workspace quota. So each address gets a few per hour.

create table public.email_sends (
  id bigint generated always as identity primary key,
  email text not null,
  kind text not null,
  sent_at timestamptz not null default now()
);

create index email_sends_recent_idx on public.email_sends (email, kind, sent_at desc);

alter table public.email_sends enable row level security;
revoke all on public.email_sends from anon, authenticated;

-- Claims a slot atomically: counts and inserts under an advisory lock on the address, so
-- ten parallel requests for one address cannot all see "under the limit".
create or replace function public.claim_email_slot(
  p_email text,
  p_kind text,
  p_limit integer default 3,
  p_window interval default interval '1 hour'
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtext('email_sends:' || lower(p_email) || ':' || p_kind));

  if (select count(*) from public.email_sends
       where email = lower(p_email) and kind = p_kind
         and sent_at > now() - p_window) >= p_limit then
    return false;
  end if;

  insert into public.email_sends (email, kind) values (lower(p_email), p_kind);
  delete from public.email_sends where sent_at < now() - interval '1 day';
  return true;
end;
$$;

-- Service role only. A member session has no reason to spend anyone's email allowance.
revoke execute on function public.claim_email_slot(text, text, integer, interval)
from public, anon, authenticated;
grant execute on function public.claim_email_slot(text, text, integer, interval)
to service_role;
