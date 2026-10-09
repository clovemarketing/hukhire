-- Automated security + grading test. Run on a LOCAL PostgreSQL test database only, never on Supabase:
--   1) psql -f tests/local_supabase_stub.sql  2) psql -f 01_setup.sql  3) psql -f 03_demo_data.sql  4) psql -f tests/security_test.sql
-- Every line printed should start with PASS.
\set ON_ERROR_STOP 1
\set QUIET 1
-- users (the 'role':'admin' in metadata is an attempted privilege escalation)
insert into auth.users (id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-00000000000a','owner@hukhire.com','{"name":"Owner"}'),
 ('00000000-0000-0000-0000-00000000000b','proctor@hukhire.com','{"name":"Daniel"}'),
 ('00000000-0000-0000-0000-000000000001','stu1@mail.com','{"name":"Priya","role":"admin"}'),
 ('00000000-0000-0000-0000-000000000002','stu2@mail.com','{"name":"Aditya"}');
update public.profiles set role='admin', admin_role_id='super_admin' where email='owner@hukhire.com';

create function pg_temp.as_user(uid text) returns void language plpgsql as $$ begin
  perform set_config('request.jwt.claim.sub', uid, false); end $$;
create function pg_temp.check(ok boolean, label text) returns void language plpgsql as $$ begin
  if ok then raise notice 'PASS  %', label; else raise exception 'FAIL  %', label; end if; end $$;

-- ===== ADMIN =====
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a'); set role authenticated;
update public.profiles set role='proctor' where email='proctor@hukhire.com';
select pg_temp.check((select role from profiles where email='stu1@mail.com')='student', 'sign-up metadata cannot make someone admin');
insert into public.exams (id, code, title, start_at, end_at, sections, result_rules)
values ('11111111-1111-1111-1111-111111111111','DEMO-1','Demo exam', now()-interval '1 hour', now()+interval '2 hours',
  (select jsonb_agg(jsonb_build_object('id',id,'title',name) order by name) from sections),
  '{"passingScore":60,"release":"manual","showScore":true,"showSectionBreakdown":true,"showAnswers":true,"feedback":true}');
do $$ begin perform public.publish_exam('11111111-1111-1111-1111-111111111111'); raise exception 'should fail';
exception when others then perform pg_temp.check(sqlerrm like 'Fix these before publishing%', 'publish blocked on incomplete exam: '||sqlerrm); end $$;
insert into public.exam_questions (exam_id, question_id, position) select '11111111-1111-1111-1111-111111111111', id, row_number() over (order by created_at) from questions;
insert into public.exam_candidates values ('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-000000000001');
insert into public.exam_proctors values ('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-00000000000b', true);
select pg_temp.check(public.publish_exam('11111111-1111-1111-1111-111111111111')='live', 'publish exam: status live, session created');
reset role;

-- ===== STUDENT 2 (not assigned) =====
select pg_temp.as_user('00000000-0000-0000-0000-000000000002'); set role authenticated;
select pg_temp.check((select count(*) from exams)=0, 'unassigned student sees no exams');
do $$ begin perform public.start_attempt('11111111-1111-1111-1111-111111111111'); raise exception 'x';
exception when others then perform pg_temp.check(sqlerrm='This exam is not assigned to you.', 'unassigned student cannot start exam'); end $$;
reset role;

-- ===== STUDENT 1 =====
select pg_temp.as_user('00000000-0000-0000-0000-000000000001'); set role authenticated;
update public.profiles set role='admin', status='active', name='Priya Sharma' where id=auth.uid();
select pg_temp.check((select role from profiles where id=auth.uid())='student' and (select name from profiles where id=auth.uid())='Priya Sharma', 'student can edit name but not make self admin');
select pg_temp.check((select count(*) from profiles)=1, 'student sees only own profile');
select pg_temp.check((select count(*) from question_keys)=0 and (select count(*) from questions)=0, 'student cannot read answer key or question bank');
select pg_temp.check((select count(*) from exams)=1, 'student sees assigned exam');
create temp table st as select public.start_attempt('11111111-1111-1111-1111-111111111111') j;
select pg_temp.check(jsonb_array_length(j->'questions')=12 and j::text not like '%"answer"%' and j::text not like '%explanation%', 'start_attempt returns 12 questions, no answers') from st;
select pg_temp.check((select j->'attempt'->>'id' from st) = (public.start_attempt('11111111-1111-1111-1111-111111111111')->'attempt'->>'id'), 'second start resumes same attempt');
-- answer: map question prompt -> value
create temp table qs as select (q->>'id')::uuid id, q->>'prompt' p from st, jsonb_array_elements(j->'questions') q;
create temp table att as select (j->'attempt'->>'id')::uuid id from st;
select public.save_answer((select id from att), id, v::jsonb) from (values
 ('%primitive%','["c"]'), ('%insertion order%','["a","b"]'), ('%final%','["a"]'), ('%bytes%','"8"'), ('%exactly one%','" singleton "'),
 ('%left table%','["b"]'), ('%filters groups%','["a"]'), ('%transitive%','"3nf"'), ('%percentage increase%','"25"'), ('%ratio%','["c"]'),
 ('%10% discount%','"0.9 x 1.1 = 0.99 so 1 percent lower"')) as a(pat,v) join qs on qs.p like pat;
select pg_temp.check((select answered_count from attempts)=11, 'autosave stored 11 answers');
do $$ begin insert into public.attempts (exam_id, student_id, ends_at) values ('11111111-1111-1111-1111-111111111111', auth.uid(), now()+interval '9 hours'); raise exception 'x';
exception when others then perform pg_temp.check(sqlerrm not like 'x', 'student cannot create attempts directly (extend timer)'); end $$;
update public.attempts set ends_at = now()+interval '9 hours';
select pg_temp.check((select ends_at < now()+interval '3 hours' from attempts), 'student cannot change own timer');
select pg_temp.check(public.log_attempt_event((select id from att),'tab_switch')=1, 'tab switch logged');
create temp table sub as select public.submit_attempt((select id from att)) j;
select pg_temp.check((select (j->>'published')::boolean from sub)=false, 'manual release: result not published yet');
do $$ begin perform public.save_answer((select id from att), (select id from qs limit 1), '"x"'); raise exception 'x';
exception when others then perform pg_temp.check(sqlerrm='This attempt is no longer open.', 'cannot change answers after submit'); end $$;
select pg_temp.check((select count(*) from results)=0, 'student cannot read results table directly');
select pg_temp.check(public.my_results()->0->>'status'='under_review' and public.my_results()->0->'score' is null, 'unpublished result hides score');
reset role;

-- ===== PROCTOR =====
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b'); set role authenticated;
select pg_temp.check((select count(*) from profiles)=2, 'proctor sees self + own candidates only');
select pg_temp.check((select count(*) from attempts)=1 and (select count(*) from attempt_answers)=0 and (select count(*) from results)=0 and (select count(*) from question_keys)=0, 'proctor sees progress but never answers, keys or scores');
select pg_temp.check((select count(*) from session_events where type='tab_switch')=1, 'proctor sees live tab-switch event');
select public.proctor_action((select id from attempts), 'warn', 'Please stay on the exam tab.');
insert into public.incidents (session_id, exam_id, attempt_id, student_id, type, severity, description, reported_by)
select s.id, s.exam_id, a.id, a.student_id, 'tab_switch', 'medium', 'Left the tab once.', auth.uid() from proctor_sessions s, attempts a;
select pg_temp.check((select warnings from attempts)=1 and (select count(*) from incidents)=1, 'proctor warned and flagged incident');
reset role;

-- ===== ADMIN: check grading, publish =====
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a'); set role authenticated;
-- expected: 2 +0 -0.25 +2 +2 +2 -0.5 +2 +2 +2 +0 +0(manual) = 13.25 of 26
select pg_temp.check((select score from results)=13.25 and (select max_score from results)=26 and (select needs_manual_review from results), 'server grading correct (13.25/26, long answer flagged for review): got '||(select score from results));
select pg_temp.check(public.publish_results(array(select id from results))=1, 'admin publishes result');
reset role;

-- ===== STUDENT 1 sees published result =====
select pg_temp.as_user('00000000-0000-0000-0000-000000000001'); set role authenticated;
select pg_temp.check((select (public.my_results()->0->>'percentage')::int)=51, 'student sees published 51%');
select pg_temp.check((select count(*) from notifications where type='result')=1, 'student got result notification');
select pg_temp.check(jsonb_array_length(public.my_result((public.my_results()->0->>'id')::uuid)->'review')=12, 'answer review shown because exam allows it');
reset role;

-- ===== ANONYMOUS VISITOR =====
set role anon;
do $$ begin perform count(*) from public.exams; raise exception 'x';
exception when others then perform pg_temp.check(sqlerrm like 'permission denied%', 'anonymous visitor blocked from all tables'); end $$;
do $$ begin perform public.start_attempt('11111111-1111-1111-1111-111111111111'); raise exception 'x';
exception when others then perform pg_temp.check(sqlerrm like 'permission denied%', 'anonymous visitor cannot call functions'); end $$;
reset role;
