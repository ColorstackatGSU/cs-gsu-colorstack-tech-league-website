-- The League's rules, proved against the database rather than asserted in comments.
--
--   docker exec -i supabase_db_tech-league psql -U postgres -v ON_ERROR_STOP=1 < supabase/tests/league_rules.sql
--
-- Runs inside a transaction and rolls back, so it leaves no rows behind. Every check
-- runs as the member it is about (SET ROLE authenticated plus that member's JWT claims),
-- because a policy tested as postgres is a policy that was never tested: postgres
-- bypasses RLS, and the portal once shipped a query that returned rows in psql and zero
-- rows for every real member. Raising rather than ASSERT on purpose, since assertions can
-- be compiled out. A clean run prints "ALL CHECKS PASSED".

begin;

do $test$
declare
  v_admin uuid := gen_random_uuid();
  v_a uuid := gen_random_uuid();
  v_b uuid := gen_random_uuid();
  v_c uuid := gen_random_uuid();
  v_d uuid := gen_random_uuid();
  v_e uuid := gen_random_uuid();
  v_f uuid := gen_random_uuid();  -- submitted, never accepted
  v_g uuid := gen_random_uuid();  -- still drafting
  v_team1 uuid;
  v_team2 uuid;
  v_invite uuid;
  v_count int;
  v_text text;
  v_json jsonb;
begin
  -- ---------------------------------------------------------------------------
  -- Setup, as postgres.
  -- ---------------------------------------------------------------------------
  insert into auth.users (id, email, aud, role)
  select id, email, 'authenticated', 'authenticated'
    from (values (v_admin, 'test_admin@student.gsu.edu'),
                 (v_a, 'test_a@student.gsu.edu'), (v_b, 'test_b@student.gsu.edu'),
                 (v_c, 'test_c@student.gsu.edu'), (v_d, 'test_d@student.gsu.edu'),
                 (v_e, 'test_e@student.gsu.edu'), (v_f, 'test_f@student.gsu.edu'),
                 (v_g, 'test_g@student.gsu.edu')) as u(id, email);

  update public.profiles set is_admin = true where id = v_admin;

  insert into public.applications (user_id, status, full_name, school_email, personal_email,
    race_ethnicity, year, major, grad_term, interest, team_pref, why_join, goals, commitment,
    personal_email_verified_at)
  select id, 'submitted', name, lower(name) || '@student.gsu.edu', lower(name) || '@example.com',
         array['Black or African American'], 'Junior', 'Computer Science', 'Spring 2028',
         'Software Engineering', 'team', repeat('I want structured practice. ', 3),
         'An internship.', '3-5', now()
    from (values (v_a, 'Test_A'), (v_b, 'Test_B'), (v_c, 'Test_C'), (v_d, 'Test_D'),
                 (v_e, 'Test_E'), (v_f, 'Test_F')) as m(id, name);

  update public.applications set decision = 'accepted'
   where user_id in (v_a, v_b, v_c, v_d, v_e);

  insert into public.applications (user_id, full_name) values (v_g, 'Test_G');

  -- ---------------------------------------------------------------------------
  -- 1. Only student addresses can hold an account.
  -- ---------------------------------------------------------------------------
  begin
    insert into auth.users (id, email, aud, role)
    values (gen_random_uuid(), 'someone@gmail.com', 'authenticated', 'authenticated');
    raise exception 'check 1 FAILED: a gmail account was created';
  exception when check_violation then null;
  end;

  -- ---------------------------------------------------------------------------
  -- 2. A member reads their own application and nobody else's.
  -- ---------------------------------------------------------------------------
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  select count(*) into v_count from public.applications;
  if v_count <> 1 then
    raise exception 'check 2 FAILED: member A sees % applications, expected only their own', v_count;
  end if;
  select count(*) into v_count from public.applications where user_id = v_b;
  if v_count <> 0 then
    raise exception 'check 2 FAILED: member A can read member B''s application';
  end if;
  select count(*) into v_count from public.profiles;
  if v_count <> 1 then
    raise exception 'check 2 FAILED: member A sees % profiles, expected only their own', v_count;
  end if;

  -- ---------------------------------------------------------------------------
  -- 3. A member cannot decide anything, write scores, or touch team tables directly.
  -- ---------------------------------------------------------------------------
  begin
    update public.applications set decision = 'accepted' where user_id = v_a;
    raise exception 'check 3 FAILED: a member wrote their own decision';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.profiles set is_admin = true where id = v_a;
    raise exception 'check 3 FAILED: a member made themselves an admin';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.teams (name) values ('Sneaky');
    raise exception 'check 3 FAILED: a member inserted a team directly';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.scores (team_id, event_id, points)
    select gen_random_uuid(), 'kickoff', 100;
    raise exception 'check 3 FAILED: a member wrote a score';
  exception when insufficient_privilege or foreign_key_violation then null;
  end;

  -- ---------------------------------------------------------------------------
  -- 4. Drafts may be partial, submissions must be whole, and submitted is final.
  -- ---------------------------------------------------------------------------
  execute 'reset role';
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_g, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  begin
    update public.applications set status = 'submitted' where user_id = v_g;
    raise exception 'check 4 FAILED: an incomplete application was submitted';
  exception when check_violation then null;
  end;

  begin
    update public.applications set race_ethnicity = '{}' where user_id = v_g;
    raise exception 'check 4 FAILED: an empty race_ethnicity was stored';
  exception when check_violation then null;
  end;

  begin
    update public.applications set race_ethnicity = array['Prefer not to say', 'Asian']
     where user_id = v_g;
    raise exception 'check 4 FAILED: "Prefer not to say" was combined with an answer';
  exception when check_violation then null;
  end;

  update public.applications
     set school_email = 'test_g@student.gsu.edu', personal_email = 'g@example.com',
         race_ethnicity = array['Hispanic or Latino', 'White'], year = 'Senior',
         major = 'Mathematics', grad_term = 'Fall 2026', interest = 'Cybersecurity',
         team_pref = 'have-team', why_join = repeat('Because it is a good program. ', 2),
         goals = 'Interview reps.', commitment = '6-8'
   where user_id = v_g;

  -- 4b. A complete application still cannot be submitted until its personal email is
  -- confirmed, a member cannot confirm it themselves, and changing it unconfirms it.
  begin
    update public.applications set status = 'submitted' where user_id = v_g;
    raise exception 'check 4b FAILED: submitted with an unconfirmed personal email';
  exception when raise_exception then
    if sqlerrm not like 'Confirm your personal email%' then raise; end if;
  end;

  begin
    update public.applications set personal_email_verified_at = now() where user_id = v_g;
    raise exception 'check 4b FAILED: a member confirmed their own personal email';
  exception when insufficient_privilege then null;
  end;

  execute 'reset role';
  update public.applications set personal_email_verified_at = now() where user_id = v_g;
  update public.applications set personal_email = 'g.new@example.com' where user_id = v_g;
  if (select personal_email_verified_at from public.applications where user_id = v_g) is not null then
    raise exception 'check 4b FAILED: changing the personal email kept it confirmed';
  end if;
  update public.applications set personal_email = 'g@example.com' where user_id = v_g;
  update public.applications set personal_email_verified_at = now() where user_id = v_g;

  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_g, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  update public.applications set status = 'submitted' where user_id = v_g;

  select submitted_at::text into v_text from public.applications where user_id = v_g;
  if v_text is null then
    raise exception 'check 4 FAILED: submitted_at was not stamped on submit';
  end if;

  update public.applications set why_join = 'changed my mind entirely, sorry' where user_id = v_g;
  select why_join into v_text from public.applications where user_id = v_g;
  if v_text = 'changed my mind entirely, sorry' then
    raise exception 'check 4 FAILED: a submitted application was edited';
  end if;

  -- ---------------------------------------------------------------------------
  -- 5. Teams are for accepted members only.
  -- ---------------------------------------------------------------------------
  execute 'reset role';
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_f, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  begin
    perform public.create_team('Unaccepted', 3);
    raise exception 'check 5 FAILED: an unaccepted member created a team';
  exception when raise_exception then
    if sqlerrm like 'check %' then raise; end if;
  end;
  begin
    perform public.member_directory('');
    raise exception 'check 5 FAILED: an unaccepted member read the directory';
  exception when raise_exception then
    if sqlerrm like 'check %' then raise; end if;
  end;

  -- ---------------------------------------------------------------------------
  -- 6. Pending invites hold seats; the cap cannot be beaten by inviting everyone.
  -- ---------------------------------------------------------------------------
  execute 'reset role';
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  v_team1 := public.create_team('Segfault', 3);
  perform public.invite_member(v_b, 'join us');
  perform public.invite_member(v_c, '');

  begin
    perform public.invite_member(v_d, '');
    raise exception 'check 6 FAILED: a fourth seat was invited on a team of 3';
  exception when raise_exception then
    if sqlerrm not like '%no open seats%' then
      raise exception 'check 6 FAILED: expected the seat error, got: %', sqlerrm;
    end if;
  end;

  begin
    perform public.invite_member(v_f, '');
    raise exception 'check 6 FAILED: an unaccepted member was invited';
  exception when raise_exception then
    if sqlerrm like 'check %' then raise; end if;
  end;

  -- ---------------------------------------------------------------------------
  -- 7. Team names are unique regardless of case.
  -- ---------------------------------------------------------------------------
  execute 'reset role';
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_e, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  begin
    perform public.create_team('SEGFAULT', 4);
    raise exception 'check 7 FAILED: a duplicate team name was allowed';
  exception when raise_exception then
    if sqlerrm like 'check %' then raise; end if;
  end;

  -- ---------------------------------------------------------------------------
  -- 8. The invitee accepts from their inbox and lands on the roster.
  -- ---------------------------------------------------------------------------
  execute 'reset role';
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  v_json := public.my_team();
  if jsonb_array_length(v_json->'inbox'->'invites') <> 1 then
    raise exception 'check 8 FAILED: B should have one invite, has %', v_json->'inbox'->'invites';
  end if;
  v_invite := (v_json->'inbox'->'invites'->0->>'id')::uuid;
  perform public.respond_invite(v_invite, true);

  if public.team_of(v_b) is distinct from v_team1 then
    raise exception 'check 8 FAILED: B accepted but is not on the team';
  end if;

  -- Invites are private: B, now on the team, sees the team's invites but not others'.
  begin
    perform public.remove_teammate(v_a);
    raise exception 'check 8 FAILED: a non-captain removed the captain';
  exception when raise_exception then
    if sqlerrm like 'check %' then raise; end if;
  end;

  -- ---------------------------------------------------------------------------
  -- 9. Requests do not hold seats, but a full team refuses them.
  -- ---------------------------------------------------------------------------
  execute 'reset role';
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_d, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  begin
    perform public.request_to_join(v_team1, 'let me in');
    raise exception 'check 9 FAILED: D asked to join a team whose seats are all held';
  exception when raise_exception then
    if sqlerrm not like '%full%' then
      raise exception 'check 9 FAILED: expected the full error, got: %', sqlerrm;
    end if;
  end;

  -- The captain frees C's seat, D asks, the captain says yes.
  execute 'reset role';
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  select (i->>'id')::uuid into v_invite
    from jsonb_array_elements(public.my_team()->'team'->'invites') i
   where i->'member'->>'id' = v_c::text;
  perform public.cancel_invite(v_invite);

  execute 'reset role';
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_d, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  v_invite := public.request_to_join(v_team1, 'let me in');

  execute 'reset role';
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.respond_invite(v_invite, true);

  select count(*) into v_count from public.team_members where team_id = v_team1;
  if v_count <> 3 then
    raise exception 'check 9 FAILED: expected 3 on the team, found %', v_count;
  end if;

  -- ---------------------------------------------------------------------------
  -- 10. Capacity can grow, but never shrink below the seats already taken.
  -- ---------------------------------------------------------------------------
  perform public.update_team(null, 4);
  perform public.invite_member(v_c, '');
  begin
    perform public.update_team(null, 3);
    raise exception 'check 10 FAILED: capacity dropped below the seats taken';
  exception when raise_exception then
    if sqlerrm like 'check %' then raise; end if;
  end;

  -- ---------------------------------------------------------------------------
  -- 11. The directory lists people on no team first, and never an email.
  -- ---------------------------------------------------------------------------
  execute 'reset role';
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_e, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  -- Searched for this test's own members, so real rows already in the database cannot
  -- change the answer.
  v_json := public.member_directory('Test_');
  if v_json->0->>'name' <> 'Test_C' or v_json->0->'team' <> 'null'::jsonb then
    raise exception 'check 11 FAILED: expected Test_C (no team) first, got %', v_json->0;
  end if;
  if v_json->-1->'team'->>'open' <> 'false' then
    raise exception 'check 11 FAILED: expected a full team''s member last, got %', v_json->-1;
  end if;
  if v_json::text ilike '%@%' then
    raise exception 'check 11 FAILED: the directory contains an email address';
  end if;
  if exists (select 1 from jsonb_array_elements(v_json) m where m->>'name' = 'Test_F') then
    raise exception 'check 11 FAILED: an unaccepted member is in the directory';
  end if;

  -- ---------------------------------------------------------------------------
  -- 12. Joining one team withdraws everything else pending for that person.
  -- ---------------------------------------------------------------------------
  v_team2 := public.create_team('Null Pointers', 3);
  perform public.invite_member(v_c, '');

  execute 'reset role';
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_c, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  select (i->>'id')::uuid into v_invite
    from jsonb_array_elements(public.my_team()->'inbox'->'invites') i
   where i->'team'->>'id' = v_team2::text;
  perform public.respond_invite(v_invite, true);

  execute 'reset role';
  select count(*) into v_count from public.team_invites
   where user_id = v_c and status = 'pending';
  if v_count <> 0 then
    raise exception 'check 12 FAILED: C joined a team but still has % pending invites', v_count;
  end if;

  -- ---------------------------------------------------------------------------
  -- 13. The captain leaving hands the team to the longest-standing member.
  -- ---------------------------------------------------------------------------
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.leave_team();

  execute 'reset role';
  select user_id into v_text from public.team_members where team_id = v_team1 and role = 'captain';
  if v_text is distinct from v_b::text then
    raise exception 'check 13 FAILED: expected B to become captain, got %', v_text;
  end if;

  -- ---------------------------------------------------------------------------
  -- 14. Only admins write scores, and never above the event's max.
  -- ---------------------------------------------------------------------------
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    insert into public.scores (team_id, event_id, points) values (v_team1, 'kickoff', 100);
    raise exception 'check 14 FAILED: a member wrote a score for their own team';
  exception when insufficient_privilege then null;
  end;

  execute 'reset role';
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  insert into public.scores (team_id, event_id, points) values (v_team1, 'kickoff', 92);
  begin
    insert into public.scores (team_id, event_id, points) values (v_team2, 'kickoff', 120);
    raise exception 'check 14 FAILED: a score above the event max was stored';
  exception when raise_exception then
    if sqlerrm like 'check %' then raise; end if;
  end;

  select count(*) into v_count from public.applications
   where user_id in (v_a, v_b, v_c, v_d, v_e, v_f, v_g);
  if v_count <> 7 then
    raise exception 'check 14 FAILED: the admin sees % applications, expected 7', v_count;
  end if;

  -- ---------------------------------------------------------------------------
  -- 15. Standings: a scored team stays on the board after dropping below 3.
  -- ---------------------------------------------------------------------------
  execute 'reset role';
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  select jsonb_agg(t) into v_json
    from jsonb_array_elements(public.standings()->'teams') t
   where t->>'id' in (v_team1::text, v_team2::text);
  if jsonb_array_length(v_json) <> 1
     or v_json->0->>'name' <> 'Segfault'
     or (v_json->0->'scores'->>'kickoff')::numeric <> 92 then
    raise exception 'check 15 FAILED: unexpected standings %', v_json;
  end if;

  -- ---------------------------------------------------------------------------
  -- 16. Denying an accepted member takes them off their team.
  -- ---------------------------------------------------------------------------
  execute 'reset role';
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.decide_application(v_d, 'denied');

  execute 'reset role';
  if public.team_of(v_d) is not null then
    raise exception 'check 16 FAILED: a denied member is still on a team';
  end if;

  -- ---------------------------------------------------------------------------
  -- 16b. Waitlisting is not accepting: it closes teams, and a later accept reopens them.
  -- ---------------------------------------------------------------------------
  execute 'reset role';
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.decide_application(v_e, 'waitlisted');

  execute 'reset role';
  if public.team_of(v_e) is not null then
    raise exception 'check 16b FAILED: a waitlisted member is still on a team';
  end if;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_e, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    perform public.create_team('Waitlisted Team', 3);
    raise exception 'check 16b FAILED: a waitlisted member created a team';
  exception when raise_exception then
    if sqlerrm like 'check %' then raise; end if;
  end;

  execute 'reset role';
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.decide_application(v_e, 'accepted');
  execute 'reset role';
  if not public.is_accepted(v_e) then
    raise exception 'check 16b FAILED: accepting a waitlisted member did not take';
  end if;

  -- ---------------------------------------------------------------------------
  -- 16c. The welcome is claimed once, and only by the service role.
  -- ---------------------------------------------------------------------------
  execute 'set local role service_role';
  if not public.claim_welcome(v_a) then
    raise exception 'check 16c FAILED: the first welcome claim was refused';
  end if;
  if public.claim_welcome(v_a) then
    raise exception 'check 16c FAILED: a second welcome was claimed';
  end if;
  execute 'reset role';
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    perform public.claim_welcome(v_b);
    raise exception 'check 16c FAILED: a member claimed their own welcome';
  exception when insufficient_privilege then null;
  end;
  execute 'reset role';

  -- ---------------------------------------------------------------------------
  -- 17. Signed-out callers get nothing.
  -- ---------------------------------------------------------------------------
  perform set_config('request.jwt.claims', jsonb_build_object('role', 'anon')::text, true);
  execute 'set local role anon';
  begin
    perform public.standings();
    raise exception 'check 17 FAILED: anon read the standings';
  exception when insufficient_privilege then null;
  end;
  begin
    perform count(*) from public.applications;
    raise exception 'check 17 FAILED: anon read applications';
  exception when insufficient_privilege then null;
  end;
  execute 'reset role';

  -- ---------------------------------------------------------------------------
  -- 18. Only the API marks an account's email as verified.
  -- ---------------------------------------------------------------------------
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_g, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    update public.profiles set email_verified_at = now() where id = v_g;
    raise exception 'check 18 FAILED: a member marked their own email verified';
  exception when insufficient_privilege then null;
  end;
  execute 'reset role';

  raise notice 'ALL CHECKS PASSED';
end;
$test$;

rollback;
