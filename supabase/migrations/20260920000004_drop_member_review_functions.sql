-- Drop the member-path review functions.
--
-- decide_application, reopen_application and mark_decision_emailed were the entry points
-- for the in-app /admin page, which is gone. Each only checked is_admin() and then called
-- the matching apply_* function. The portal_* functions call apply_* directly, so those
-- stay (as do apply_decision, apply_reopen and apply_decision_emailed). Nothing in the
-- API or the client calls the three dropped here.

drop function if exists public.decide_application(uuid, text);
drop function if exists public.reopen_application(uuid);
drop function if exists public.mark_decision_emailed(uuid);
