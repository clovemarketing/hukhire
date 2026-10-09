-- =====================================================================
--  HUK HIRE: database setup for Supabase
--  Run ONCE on a fresh project: Supabase dashboard → SQL Editor →
--  New query → paste this whole file → Run.
--  If it stops halfway with an error, run 00_reset.sql, then run this again.
--
--  What this file creates
--    PART 1  Tables (where data lives)
--    PART 2  Helper functions (who is an admin, proctor, etc.)
--    PART 3  Automatic actions (new user → profile row)
--    PART 4  Security rules (Row Level Security policies)
--    PART 5  Exam-taking functions (start, save answer, submit, grading)
--    PART 6  Admin and proctor functions (publish exam, publish results)
--    PART 7  Live updates and permissions
-- =====================================================================


-- =====================================================================
-- PART 1  TABLES
-- Plain English: each table is like one sheet in Excel. Each row is
-- one record (one exam, one question, one answer...).
-- =====================================================================

-- Admin roles: what each kind of admin is allowed to do
create table public.admin_roles (
  id           text primary key,                 -- 'super_admin', 'exam_manager', 'reviewer'
  name         text not null,
  description  text,
  permissions  text[] not null default '{}'
);

-- One profile per login. Supabase keeps the email/password in its own
-- private "auth.users" table; this table holds everything else.
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  role          text not null default 'student' check (role in ('admin', 'proctor', 'student')),
  admin_role_id text references public.admin_roles (id),
  name          text not null default '',
  email         text not null,
  phone         text,
  status        text not null default 'active' check (status in ('active', 'pending', 'invited', 'deactivated', 'revoked')),
  -- student fields
  institution   text,
  program       text,
  cohort        text,
  -- proctor fields
  availability  text not null default 'offline' check (availability in ('online', 'busy', 'away', 'offline')),
  timezone      text not null default 'Asia/Kolkata',
  device        jsonb not null default '{}'::jsonb,
  -- admin fields
  title         text,
  created_at    timestamptz not null default now(),
  last_active_at timestamptz
);

-- Personal settings (theme, notification choices)
create table public.user_settings (
  user_id       uuid primary key references public.profiles (id) on delete cascade,
  theme         text not null default 'brand' check (theme in ('brand', 'mono')),
  notifications jsonb not null default '{"email": true, "inApp": true, "sms": false, "reminders": true}'::jsonb,
  device        jsonb not null default '{}'::jsonb,
  updated_at    timestamptz not null default now()
);

-- Organisation-wide settings: always exactly one row (id = 1)
create table public.org_settings (
  id             int primary key default 1 check (id = 1),
  organization   jsonb not null default '{}'::jsonb,
  exam_defaults  jsonb not null default '{}'::jsonb,
  security       jsonb not null default '{}'::jsonb,
  notifications  jsonb not null default '{}'::jsonb,
  updated_at     timestamptz not null default now()
);

-- Question bank folders, e.g. "Core Java"
create table public.sections (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  subject      text not null default '',
  description  text,
  created_at   timestamptz not null default now()
);

-- Questions WITHOUT their answers. Students receive these (through a
-- function), so the correct answer must never be stored here.
create table public.questions (
  id             uuid primary key default gen_random_uuid(),
  section_id     uuid not null references public.sections (id),
  type           text not null check (type in ('single', 'multi', 'truefalse', 'short', 'long', 'numeric', 'coding', 'upload')),
  prompt         text not null,
  code           text,
  options        jsonb not null default '[]'::jsonb,   -- [{"id":"a","text":"..."}, ...]
  marks          numeric not null default 1 check (marks > 0),
  negative_marks numeric not null default 0 check (negative_marks >= 0),
  difficulty     text not null default 'medium' check (difficulty in ('easy', 'medium', 'hard')),
  tags           text[] not null default '{}',
  status         text not null default 'active' check (status in ('active', 'retired')),
  created_by     uuid references public.profiles (id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- The answer key, kept in its own table that only admins can read.
create table public.question_keys (
  question_id  uuid primary key references public.questions (id) on delete cascade,
  answer       jsonb,          -- ["b"] for choice questions, "42" for numeric, "Singleton" for short, null for long
  explanation  text
);

-- Exams
create table public.exams (
  id                uuid primary key default gen_random_uuid(),
  code              text not null unique,
  title             text not null,
  description       text not null default '',
  category          text not null default 'Technical',
  status            text not null default 'draft' check (status in ('draft', 'scheduled', 'live', 'completed', 'archived')),
  start_at          timestamptz,
  end_at            timestamptz,
  timezone          text not null default 'Asia/Kolkata',
  duration_minutes  int not null default 60 check (duration_minutes between 5 and 480),
  grace_minutes     int not null default 5 check (grace_minutes between 0 and 60),
  attempts_allowed  int not null default 1 check (attempts_allowed between 1 and 5),
  instructions      text[] not null default '{}',
  sections          jsonb not null default '[]'::jsonb,   -- ordered [{"id": section uuid, "title": "..."}]
  negative_marking  boolean not null default true,
  proctoring_mode   text not null default 'live' check (proctoring_mode in ('live', 'recorded', 'none')),
  proctoring        jsonb not null default '{"camera": true, "mic": true, "screen": true, "idCheck": true}'::jsonb,
  security          jsonb not null default '{"tabPolicy": "warn", "maxTabSwitches": 3, "copyPaste": false, "fullscreen": true, "browserLock": false, "ipRestriction": "", "deviceLimit": 1}'::jsonb,
  result_rules      jsonb not null default '{"passingScore": 60, "release": "manual", "showScore": true, "showSectionBreakdown": true, "showAnswers": false, "feedback": true}'::jsonb,
  draft_step        int not null default 1,
  created_by        uuid references public.profiles (id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (end_at is null or start_at is null or end_at > start_at)
);

-- Which questions are in which exam, in order
create table public.exam_questions (
  exam_id      uuid not null references public.exams (id) on delete cascade,
  question_id  uuid not null references public.questions (id),
  position     int not null default 0,
  primary key (exam_id, question_id)
);

-- Which students may take which exam
create table public.exam_candidates (
  exam_id      uuid not null references public.exams (id) on delete cascade,
  student_id   uuid not null references public.profiles (id) on delete cascade,
  assigned_at  timestamptz not null default now(),
  primary key (exam_id, student_id)
);

-- Which proctors watch which exam (is_lead = runs the live session)
create table public.exam_proctors (
  exam_id      uuid not null references public.exams (id) on delete cascade,
  proctor_id   uuid not null references public.profiles (id) on delete cascade,
  is_lead      boolean not null default false,
  primary key (exam_id, proctor_id)
);

-- One attempt = one student sitting one exam
create table public.attempts (
  id              uuid primary key default gen_random_uuid(),
  exam_id         uuid not null references public.exams (id) on delete cascade,
  student_id      uuid not null references public.profiles (id) on delete cascade,
  status          text not null default 'in_progress' check (status in ('in_progress', 'submitted', 'terminated')),
  started_at      timestamptz not null default now(),
  ends_at         timestamptz not null,
  submitted_at    timestamptz,
  auto_submitted  boolean not null default false,
  tab_switches    int not null default 0,
  answered_count  int not null default 0,     -- progress shown to proctors (never the answers)
  identity        text not null default 'pending' check (identity in ('pending', 'verified', 'mismatch')),
  risk            text not null default 'low' check (risk in ('low', 'medium', 'high')),
  warnings        int not null default 0,
  flagged         boolean not null default false,
  ip_address      text,
  user_agent      text
);
create index on public.attempts (exam_id);
create index on public.attempts (student_id);

-- Each saved answer (autosave writes here)
create table public.attempt_answers (
  attempt_id   uuid not null references public.attempts (id) on delete cascade,
  question_id  uuid not null references public.questions (id),
  value        jsonb,
  review       boolean not null default false,
  saved_at     timestamptz not null default now(),
  primary key (attempt_id, question_id)
);

-- Scores, created only by the submit function
create table public.results (
  id               uuid primary key default gen_random_uuid(),
  attempt_id       uuid not null unique references public.attempts (id) on delete cascade,
  exam_id          uuid not null references public.exams (id) on delete cascade,
  student_id       uuid not null references public.profiles (id) on delete cascade,
  score            numeric not null default 0,
  max_score        numeric not null default 0,
  percentage       int not null default 0,
  status           text not null default 'under_review' check (status in ('pass', 'fail', 'under_review')),
  sections         jsonb not null default '[]'::jsonb,
  per_question     jsonb not null default '{}'::jsonb,
  needs_manual_review boolean not null default false,  -- true when long answers need a human
  incident_level   text not null default 'none' check (incident_level in ('none', 'low', 'medium', 'high')),
  feedback         text,
  published        boolean not null default false,
  published_at     timestamptz,
  withheld_reason  text,
  created_at       timestamptz not null default now()
);
create index on public.results (exam_id);
create index on public.results (student_id);

-- A proctor's live monitoring session for an exam
create table public.proctor_sessions (
  id          uuid primary key default gen_random_uuid(),
  exam_id     uuid not null unique references public.exams (id) on delete cascade,
  proctor_id  uuid not null references public.profiles (id),
  status      text not null default 'scheduled' check (status in ('scheduled', 'live', 'completed')),
  started_at  timestamptz,
  ended_at    timestamptz,
  notes       text not null default '',
  summary     jsonb
);

-- Everything that happens during a session: tab switches, warnings, notes...
create table public.session_events (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.proctor_sessions (id) on delete cascade,
  attempt_id  uuid references public.attempts (id) on delete cascade,
  type        text not null,          -- joined, tab_switch, face_missing, warning, note, flag...
  severity    text not null default 'low' check (severity in ('low', 'medium', 'high')),
  message     text not null default '',
  created_by  uuid references public.profiles (id),
  created_at  timestamptz not null default now()
);
create index on public.session_events (session_id, created_at desc);

-- Incidents flagged by proctors
create table public.incidents (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references public.proctor_sessions (id) on delete cascade,
  exam_id      uuid not null references public.exams (id) on delete cascade,
  attempt_id   uuid references public.attempts (id) on delete set null,
  student_id   uuid not null references public.profiles (id) on delete cascade,
  type         text not null,
  severity     text not null default 'medium' check (severity in ('low', 'medium', 'high')),
  status       text not null default 'open' check (status in ('open', 'reviewing', 'escalated', 'resolved', 'dismissed')),
  description  text not null default '',
  resolution   text not null default '',
  evidence     jsonb not null default '[]'::jsonb,
  reported_by  uuid references public.profiles (id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Each person's notification inbox
create table public.notifications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  type          text not null,
  title         text not null,
  message       text not null default '',
  action_label  text,
  action_url    text,
  read          boolean not null default false,
  created_at    timestamptz not null default now()
);
create index on public.notifications (user_id, created_at desc);

-- Admin dashboard "recent activity" feed
create table public.activity_log (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references public.profiles (id) on delete set null,
  actor_name  text not null default 'System',
  text        text not null,
  icon        text not null default 'info',
  tone        text not null default '',
  created_at  timestamptz not null default now()
);


-- =====================================================================
-- PART 2  HELPER FUNCTIONS
-- Small questions the security rules ask: "is this person an admin?"
-- "security definer" lets them look up roles without being blocked by
-- the very rules that use them.
-- =====================================================================

create function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and status = 'active'
$$;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.my_role() = 'admin', false)
$$;

create function public.is_proctor_of(p_exam uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.my_role() = 'proctor'
     and exists (select 1 from public.exam_proctors where exam_id = p_exam and proctor_id = auth.uid())
$$;

create function public.proctor_session_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select s.id from public.proctor_sessions s
  where public.my_role() = 'proctor'
    and (s.proctor_id = auth.uid() or exists (select 1 from public.exam_proctors ep where ep.exam_id = s.exam_id and ep.proctor_id = auth.uid()))
$$;

create function public.is_candidate_of(p_exam uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.my_role() = 'student'
     and exists (select 1 from public.exam_candidates where exam_id = p_exam and student_id = auth.uid())
$$;

-- Students a proctor may see: candidates of exams they are assigned to
create function public.proctor_can_see_student(p_student uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.my_role() = 'proctor' and exists (
    select 1 from public.exam_candidates c
    join public.exam_proctors p on p.exam_id = c.exam_id
    where c.student_id = p_student and p.proctor_id = auth.uid())
$$;

create function public.log_activity(p_text text, p_icon text default 'info', p_tone text default '') returns void
language sql security definer set search_path = public as $$
  insert into public.activity_log (actor_id, actor_name, text, icon, tone)
  values (auth.uid(), coalesce((select name from public.profiles where id = auth.uid()), 'System'), p_text, p_icon, p_tone)
$$;


-- =====================================================================
-- PART 3  AUTOMATIC ACTIONS (triggers)
-- =====================================================================

-- When anyone signs up, create their profile. Everyone starts as a
-- STUDENT. Only an admin can promote someone to proctor or admin, so a
-- visitor can never make themselves an admin by editing the sign-up form.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name, phone, institution, program)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'phone',
    new.raw_user_meta_data ->> 'institution',
    new.raw_user_meta_data ->> 'program'
  );
  insert into public.user_settings (user_id) values (new.id);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Non-admins can edit their own name/phone etc., but NOT their role,
-- status or email. This trigger quietly puts those back.
-- (Runs only for website users. The SQL Editor and the Supabase dashboard
-- are trusted, so 02_make_me_admin.sql can create the first admin.)
create function public.guard_profile_update() returns trigger
language plpgsql set search_path = public as $$
begin
  if current_user in ('authenticated', 'anon') and not public.is_admin() then
    new.role          := old.role;
    new.admin_role_id := old.admin_role_id;
    new.status        := old.status;
    new.email         := old.email;
    new.cohort        := old.cohort;
    new.created_at    := old.created_at;
  end if;
  -- an admin cannot demote or deactivate themselves by accident
  if old.id = auth.uid() and old.role = 'admin' and (new.role <> 'admin' or new.status <> 'active') then
    raise exception 'You cannot remove your own admin access.';
  end if;
  return new;
end $$;

create trigger profiles_guard
  before update on public.profiles
  for each row execute function public.guard_profile_update();

-- Keep "updated_at" fresh automatically
create function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at := now(); return new; end $$;

create trigger exams_touch     before update on public.exams     for each row execute function public.touch_updated_at();
create trigger questions_touch before update on public.questions for each row execute function public.touch_updated_at();
create trigger incidents_touch before update on public.incidents for each row execute function public.touch_updated_at();


-- =====================================================================
-- PART 4  SECURITY RULES (Row Level Security)
-- Plain English: RLS is a lock on every table. A row is visible or
-- changeable ONLY if one of the "policies" below says so. Anything not
-- listed is denied. Exam answers, scoring and results are written only
-- by the functions in PART 5 and 6, never directly by a browser.
-- =====================================================================

alter table public.admin_roles      enable row level security;
alter table public.profiles         enable row level security;
alter table public.user_settings    enable row level security;
alter table public.org_settings     enable row level security;
alter table public.sections         enable row level security;
alter table public.questions        enable row level security;
alter table public.question_keys    enable row level security;
alter table public.exams            enable row level security;
alter table public.exam_questions   enable row level security;
alter table public.exam_candidates  enable row level security;
alter table public.exam_proctors    enable row level security;
alter table public.attempts         enable row level security;
alter table public.attempt_answers  enable row level security;
alter table public.results          enable row level security;
alter table public.proctor_sessions enable row level security;
alter table public.session_events   enable row level security;
alter table public.incidents        enable row level security;
alter table public.notifications    enable row level security;
alter table public.activity_log     enable row level security;

-- admin_roles: admins read; super admins change
create policy "admins read roles"   on public.admin_roles for select to authenticated using (public.is_admin());
create policy "super admins manage roles" on public.admin_roles for all to authenticated
  using (public.is_admin() and (select admin_role_id from public.profiles where id = auth.uid()) = 'super_admin')
  with check (public.is_admin() and (select admin_role_id from public.profiles where id = auth.uid()) = 'super_admin');

-- profiles
create policy "see own profile"            on public.profiles for select to authenticated using (id = auth.uid());
create policy "admins see all profiles"    on public.profiles for select to authenticated using (public.is_admin());
create policy "proctors see their candidates" on public.profiles for select to authenticated using (public.proctor_can_see_student(id));
create policy "edit own profile"           on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "admins edit profiles"       on public.profiles for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins delete profiles"     on public.profiles for delete to authenticated using (public.is_admin() and id <> auth.uid());

-- user_settings: only your own
create policy "own settings" on public.user_settings for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- org_settings: any signed-in user can read (exam defaults, support email); admins change
create policy "read org settings"    on public.org_settings for select to authenticated using (true);
create policy "admins edit org settings" on public.org_settings for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- question bank: admins only (students get questions through start_attempt)
create policy "admins manage sections"  on public.sections      for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins manage questions" on public.questions     for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins manage keys"      on public.question_keys for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- exams
create policy "admins manage exams"   on public.exams for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "proctors see assigned exams" on public.exams for select to authenticated using (public.is_proctor_of(id));
create policy "students see their published exams" on public.exams for select to authenticated
  using (status in ('scheduled', 'live', 'completed') and public.is_candidate_of(id));

-- exam links
create policy "admins manage exam questions"  on public.exam_questions  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "proctors count exam questions" on public.exam_questions  for select to authenticated using (public.is_proctor_of(exam_id));
create policy "admins manage candidates"      on public.exam_candidates for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "students see own assignments"  on public.exam_candidates for select to authenticated using (student_id = auth.uid());
create policy "proctors see exam candidates"  on public.exam_candidates for select to authenticated using (public.is_proctor_of(exam_id));
create policy "admins manage proctors"        on public.exam_proctors   for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "proctors see own assignments"  on public.exam_proctors   for select to authenticated using (proctor_id = auth.uid());

-- attempts: read-only from the browser; writes happen in PART 5 functions
create policy "admins see attempts"        on public.attempts for select to authenticated using (public.is_admin());
create policy "students see own attempts"  on public.attempts for select to authenticated using (student_id = auth.uid());
create policy "proctors see exam attempts" on public.attempts for select to authenticated using (public.is_proctor_of(exam_id));

-- answers: students see their own; admins see all; proctors never
create policy "students see own answers" on public.attempt_answers for select to authenticated
  using (exists (select 1 from public.attempts a where a.id = attempt_id and a.student_id = auth.uid()));
create policy "admins see answers" on public.attempt_answers for select to authenticated using (public.is_admin());

-- results: admins only. Students read results through my_results() /
-- my_result(), which respect each exam's visibility rules.
create policy "admins manage results" on public.results for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- proctoring
create policy "admins manage sessions"  on public.proctor_sessions for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "proctors see sessions"   on public.proctor_sessions for select to authenticated using (id in (select public.proctor_session_ids()));
create policy "proctors update sessions" on public.proctor_sessions for update to authenticated
  using (id in (select public.proctor_session_ids())) with check (id in (select public.proctor_session_ids()));

create policy "admins see events"     on public.session_events for select to authenticated using (public.is_admin());
create policy "proctors see events"   on public.session_events for select to authenticated using (session_id in (select public.proctor_session_ids()));
create policy "proctors add events"   on public.session_events for insert to authenticated
  with check (session_id in (select public.proctor_session_ids()) and created_by = auth.uid());

create policy "admins manage incidents"  on public.incidents for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "proctors see incidents"   on public.incidents for select to authenticated using (session_id in (select public.proctor_session_ids()));
create policy "proctors add incidents"   on public.incidents for insert to authenticated
  with check (session_id in (select public.proctor_session_ids()) and reported_by = auth.uid());
create policy "proctors update incidents" on public.incidents for update to authenticated
  using (session_id in (select public.proctor_session_ids())) with check (session_id in (select public.proctor_session_ids()));

-- notifications: your own inbox only
create policy "read own notifications"   on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "update own notifications" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "delete own notifications" on public.notifications for delete to authenticated using (user_id = auth.uid());
create policy "admins send notifications" on public.notifications for insert to authenticated with check (public.is_admin());

-- activity feed: admins read
create policy "admins read activity" on public.activity_log for select to authenticated using (public.is_admin());


-- =====================================================================
-- PART 5  EXAM-TAKING FUNCTIONS
-- The browser calls these by name (supabase.rpc('start_attempt', ...)).
-- They check every rule on the server, so a student editing the
-- website cannot skip the timer, see the answer key, or change a score.
-- =====================================================================

-- Start (or resume) an exam. Returns the attempt and the questions
-- WITHOUT correct answers.
create function public.start_attempt(p_exam_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  e   public.exams;
  a   public.attempts;
  used int;
  sess public.proctor_sessions;
begin
  if public.my_role() is distinct from 'student' then raise exception 'Only students can take exams.'; end if;
  select * into e from public.exams where id = p_exam_id;
  if not found or not public.is_candidate_of(p_exam_id) then raise exception 'This exam is not assigned to you.'; end if;

  -- resume an unfinished attempt
  select * into a from public.attempts where exam_id = p_exam_id and student_id = auth.uid() and status = 'in_progress'
  order by started_at desc limit 1;

  if not found then
    if e.status not in ('scheduled', 'live') then raise exception 'This exam is not open.'; end if;
    if now() < e.start_at then raise exception 'This exam has not opened yet.'; end if;
    if now() > e.end_at then raise exception 'The exam window has closed.'; end if;
    select count(*) into used from public.attempts where exam_id = p_exam_id and student_id = auth.uid();
    if used >= e.attempts_allowed then raise exception 'You have already used all your attempts for this exam.'; end if;

    insert into public.attempts (exam_id, student_id, ends_at)
    values (p_exam_id, auth.uid(), least(now() + make_interval(mins => e.duration_minutes), e.end_at + make_interval(mins => e.grace_minutes)))
    returning * into a;

    if e.status = 'scheduled' then update public.exams set status = 'live' where id = e.id; end if;
    select * into sess from public.proctor_sessions where exam_id = e.id;
    if found then
      if sess.status = 'scheduled' then update public.proctor_sessions set status = 'live', started_at = now() where id = sess.id; end if;
      insert into public.session_events (session_id, attempt_id, type, severity, message, created_by)
      values (sess.id, a.id, 'joined', 'low', 'Started the exam', auth.uid());
    end if;
  end if;

  return jsonb_build_object(
    'attempt', jsonb_build_object(
      'id', a.id, 'examId', a.exam_id, 'status', a.status, 'startedAt', a.started_at, 'endsAt', a.ends_at,
      'remainingSeconds', greatest(0, extract(epoch from (a.ends_at - now()))::int), 'tabSwitches', a.tab_switches,
      'answers', coalesce((select jsonb_object_agg(question_id, jsonb_build_object('value', value, 'review', review, 'savedAt', saved_at, 'visited', true))
                           from public.attempt_answers where attempt_id = a.id), '{}'::jsonb)),
    'exam', jsonb_build_object('id', e.id, 'code', e.code, 'title', e.title, 'durationMinutes', e.duration_minutes,
      'sections', e.sections, 'proctoringMode', e.proctoring_mode, 'security', e.security),
    'questions', coalesce((
      select jsonb_agg(jsonb_build_object('id', q.id, 'type', q.type, 'prompt', q.prompt, 'code', q.code, 'options', q.options,
                                          'marks', q.marks, 'negativeMarks', case when e.negative_marking then q.negative_marks else 0 end,
                                          'sectionId', q.section_id) order by eq.position)
      from public.exam_questions eq join public.questions q on q.id = eq.question_id
      where eq.exam_id = e.id), '[]'::jsonb)
  );
end $$;

-- Autosave one answer
create function public.save_answer(p_attempt_id uuid, p_question_id uuid, p_value jsonb, p_review boolean default false) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare a public.attempts; t timestamptz := now();
begin
  select * into a from public.attempts where id = p_attempt_id and student_id = auth.uid();
  if not found then raise exception 'Attempt not found.'; end if;
  if a.status <> 'in_progress' then raise exception 'This attempt is no longer open.'; end if;
  if now() > a.ends_at + interval '30 seconds' then raise exception 'Time is up for this exam.'; end if;
  if not exists (select 1 from public.exam_questions where exam_id = a.exam_id and question_id = p_question_id) then
    raise exception 'That question is not part of this exam.';
  end if;

  insert into public.attempt_answers (attempt_id, question_id, value, review, saved_at)
  values (p_attempt_id, p_question_id, p_value, coalesce(p_review, false), t)
  on conflict (attempt_id, question_id) do update set value = excluded.value, review = excluded.review, saved_at = t;

  update public.attempts set answered_count = (
    select count(*) from public.attempt_answers
    where attempt_id = p_attempt_id and value is not null and value <> 'null'::jsonb and value <> '""'::jsonb and value <> '[]'::jsonb
  ) where id = p_attempt_id;
  return t;
end $$;

-- Record integrity events from the exam page (tab switch, offline, online)
create function public.log_attempt_event(p_attempt_id uuid, p_type text) returns int
language plpgsql security definer set search_path = public as $$
declare a public.attempts; s_id uuid; limit_n int; sev text := 'low'; msg text;
begin
  select * into a from public.attempts where id = p_attempt_id and student_id = auth.uid();
  if not found or a.status <> 'in_progress' then return 0; end if;
  if p_type not in ('tab_switch', 'offline', 'online', 'fullscreen_exit') then raise exception 'Unknown event type.'; end if;
  select id into s_id from public.proctor_sessions where exam_id = a.exam_id;

  if p_type = 'tab_switch' then
    select coalesce((security ->> 'maxTabSwitches')::int, 3) into limit_n from public.exams where id = a.exam_id;
    update public.attempts set tab_switches = tab_switches + 1,
      risk = case when tab_switches + 1 > limit_n then 'high' when risk = 'low' then 'medium' else risk end
    where id = p_attempt_id returning * into a;
    sev := case when a.tab_switches > limit_n then 'high' else 'medium' end;
    msg := 'Switched away from the exam tab (' || a.tab_switches || ' total)';
  elsif p_type = 'offline' then sev := 'medium'; msg := 'Connection lost';
  elsif p_type = 'online' then msg := 'Reconnected';
  else sev := 'medium'; msg := 'Left full-screen mode';
  end if;

  if s_id is not null then
    insert into public.session_events (session_id, attempt_id, type, severity, message, created_by)
    values (s_id, p_attempt_id, case p_type when 'offline' then 'disconnect' when 'online' then 'reconnect' else p_type end, sev, msg, auth.uid());
  end if;
  return a.tab_switches;
end $$;

-- Internal: grade one attempt and create its result. Called by
-- submit_attempt and by proctors ending an attempt.
create function public.grade_attempt(p_attempt_id uuid, p_auto boolean, p_status text default 'submitted') returns public.results
language plpgsql security definer set search_path = public as $$
declare
  a public.attempts; e public.exams; r public.results;
  q record; earned numeric; total numeric := 0; maxs numeric := 0;
  per jsonb := '{}'::jsonb; secs jsonb; manual boolean := false; pct int; given_sorted text; key_sorted text;
  published boolean; pass_mark int;
begin
  select * into a from public.attempts where id = p_attempt_id for update;
  select * into r from public.results where attempt_id = p_attempt_id;
  if found then return r; end if;
  select * into e from public.exams where id = a.exam_id;

  for q in
    select qq.id, qq.type, qq.marks, qq.section_id, case when e.negative_marking then qq.negative_marks else 0 end as neg,
           k.answer, aa.value
    from public.exam_questions eq
    join public.questions qq on qq.id = eq.question_id
    left join public.question_keys k on k.question_id = qq.id
    left join public.attempt_answers aa on aa.attempt_id = a.id and aa.question_id = qq.id
    where eq.exam_id = e.id
  loop
    maxs := maxs + q.marks;
    earned := 0;
    if q.value is null or q.value in ('null'::jsonb, '""'::jsonb, '[]'::jsonb) then
      earned := 0;
    elsif q.type in ('single', 'multi', 'truefalse') then
      if jsonb_typeof(q.value) = 'array' and jsonb_typeof(q.answer) = 'array' then
        select string_agg(x, ',' order by x) into given_sorted from jsonb_array_elements_text(q.value) x;
        select string_agg(x, ',' order by x) into key_sorted   from jsonb_array_elements_text(q.answer) x;
        earned := case when given_sorted = key_sorted then q.marks else -q.neg end;
      end if;
    elsif q.type = 'numeric' then
      begin
        earned := case when (q.value #>> '{}')::numeric = (q.answer #>> '{}')::numeric then q.marks else 0 end;
      exception when others then earned := 0;   -- not a number
      end;
    elsif q.type = 'short' then
      earned := case when lower(trim(q.value #>> '{}')) = lower(trim(q.answer #>> '{}')) then q.marks else 0 end;
    else
      manual := true;    -- long/coding/upload: a reviewer marks it later
    end if;
    total := total + earned;
    per := per || jsonb_build_object(q.id::text, earned);
  end loop;

  total := greatest(0, total);
  pct := case when maxs > 0 then round(total / maxs * 100)::int else 0 end;
  pass_mark := coalesce((e.result_rules ->> 'passingScore')::int, 60);
  published := (e.result_rules ->> 'release') = 'immediate' and not manual;

  select coalesce(jsonb_agg(jsonb_build_object(
           'sectionId', s ->> 'id', 'title', s ->> 'title',
           'score', greatest(0, coalesce((select sum((per ->> eq.question_id::text)::numeric) from public.exam_questions eq
                                 join public.questions qq on qq.id = eq.question_id
                                 where eq.exam_id = e.id and qq.section_id::text = s ->> 'id'), 0)),
           'maxScore', coalesce((select sum(qq.marks) from public.exam_questions eq join public.questions qq on qq.id = eq.question_id
                                 where eq.exam_id = e.id and qq.section_id::text = s ->> 'id'), 0))), '[]'::jsonb)
    into secs from jsonb_array_elements(e.sections) s;

  update public.attempts set status = p_status, submitted_at = now(), auto_submitted = p_auto where id = a.id;

  insert into public.results (attempt_id, exam_id, student_id, score, max_score, percentage, status, sections, per_question,
                              needs_manual_review, incident_level, published, published_at)
  values (a.id, e.id, a.student_id, total, maxs, pct,
          case when published then (case when pct >= pass_mark then 'pass' else 'fail' end) else 'under_review' end,
          secs, per, manual,
          case when a.risk = 'high' then 'high' when a.risk = 'medium' or a.tab_switches > 0 then 'low' else 'none' end,
          published, case when published then now() end)
  returning * into r;

  insert into public.notifications (user_id, type, title, message, action_label, action_url)
  values (a.student_id, 'exam', 'Submission received: ' || e.title,
          case when published then 'Your result is ready.' else 'Your result will appear once it is published.' end,
          case when published then 'View result' else 'View attempts' end,
          case when published then 'student/result-detail.html?id=' || r.id else 'student/attempts.html' end);
  return r;
end $$;

-- Submit an exam (students). p_auto = true when the timer ran out.
create function public.submit_attempt(p_attempt_id uuid, p_auto boolean default false) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a public.attempts; r public.results; e public.exams; s_id uuid;
begin
  select * into a from public.attempts where id = p_attempt_id and student_id = auth.uid();
  if not found then raise exception 'Attempt not found.'; end if;
  r := public.grade_attempt(p_attempt_id, p_auto);
  select * into e from public.exams where id = a.exam_id;
  select id into s_id from public.proctor_sessions where exam_id = a.exam_id;
  if s_id is not null and a.status = 'in_progress' then
    insert into public.session_events (session_id, attempt_id, type, severity, message, created_by)
    values (s_id, a.id, 'submitted', 'low', case when p_auto then 'Auto-submitted when time ran out' else 'Submitted the exam' end, auth.uid());
  end if;
  return jsonb_build_object('attemptId', a.id, 'resultId', r.id, 'published', r.published, 'examTitle', e.title,
    'confirmation', 'HH-' || upper(substr(replace(a.id::text, '-', ''), 1, 8)));
end $$;

-- Student results list, respecting each exam's visibility rules
create function public.my_results() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(
    case when r.published then jsonb_build_object(
      'id', r.id, 'examId', e.id, 'examTitle', e.title, 'examCode', e.code, 'published', true, 'publishedAt', r.published_at,
      'submittedAt', a.submitted_at, 'status', r.status,
      'score', case when (e.result_rules ->> 'showScore')::boolean then r.score end,
      'maxScore', case when (e.result_rules ->> 'showScore')::boolean then r.max_score end,
      'percentage', case when (e.result_rules ->> 'showScore')::boolean then r.percentage end)
    else jsonb_build_object('id', r.id, 'examId', e.id, 'examTitle', e.title, 'examCode', e.code, 'published', false,
      'submittedAt', a.submitted_at, 'status', 'under_review') end
    order by a.submitted_at desc), '[]'::jsonb)
  from public.results r join public.exams e on e.id = r.exam_id join public.attempts a on a.id = r.attempt_id
  where r.student_id = auth.uid()
$$;

-- One result in detail, again respecting the visibility rules
create function public.my_result(p_result_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare r public.results; e public.exams; a public.attempts; out jsonb; rules jsonb;
begin
  select * into r from public.results where id = p_result_id and student_id = auth.uid();
  if not found then raise exception 'Result not found.'; end if;
  select * into e from public.exams where id = r.exam_id;
  select * into a from public.attempts where id = r.attempt_id;
  if not r.published then
    return jsonb_build_object('id', r.id, 'examId', e.id, 'examTitle', e.title, 'examCode', e.code, 'published', false, 'submittedAt', a.submitted_at);
  end if;
  rules := e.result_rules;
  out := jsonb_build_object('id', r.id, 'examId', e.id, 'examTitle', e.title, 'examCode', e.code, 'published', true,
    'publishedAt', r.published_at, 'submittedAt', a.submitted_at, 'status', r.status, 'rules', rules,
    'passingScore', (rules ->> 'passingScore')::int,
    'durationSeconds', extract(epoch from (a.submitted_at - a.started_at))::int,
    'cohort', (select count(*) from public.results where exam_id = e.id),
    'rank', (select count(*) + 1 from public.results x where x.exam_id = e.id and x.percentage > r.percentage));
  if (rules ->> 'showScore')::boolean then out := out || jsonb_build_object('score', r.score, 'maxScore', r.max_score, 'percentage', r.percentage); end if;
  if (rules ->> 'showSectionBreakdown')::boolean then out := out || jsonb_build_object('sections', r.sections); end if;
  if (rules ->> 'feedback')::boolean then out := out || jsonb_build_object('feedback', r.feedback); end if;
  if (rules ->> 'showAnswers')::boolean then
    out := out || jsonb_build_object('review', (
      select coalesce(jsonb_agg(jsonb_build_object('id', q.id, 'type', q.type, 'prompt', q.prompt, 'code', q.code, 'options', q.options,
             'marks', q.marks, 'correct', k.answer, 'explanation', k.explanation, 'given', aa.value,
             'earned', (r.per_question ->> q.id::text)::numeric) order by eq.position), '[]'::jsonb)
      from public.exam_questions eq join public.questions q on q.id = eq.question_id
      left join public.question_keys k on k.question_id = q.id
      left join public.attempt_answers aa on aa.attempt_id = r.attempt_id and aa.question_id = q.id
      where eq.exam_id = e.id));
  end if;
  return out;
end $$;


-- =====================================================================
-- PART 6  ADMIN AND PROCTOR FUNCTIONS
-- =====================================================================

-- Publish an exam after checking it is complete
create function public.publish_exam(p_exam_id uuid) returns text
language plpgsql security definer set search_path = public as $$
declare e public.exams; problems text[] := '{}'; lead uuid; new_status text;
begin
  if not public.is_admin() then raise exception 'Only admins can publish exams.'; end if;
  select * into e from public.exams where id = p_exam_id;
  if not found then raise exception 'Exam not found.'; end if;
  if e.status <> 'draft' then raise exception 'Only draft exams can be published.'; end if;
  if e.start_at is null or e.end_at is null then problems := problems || 'set the exam window'::text; end if;
  if not exists (select 1 from public.exam_questions where exam_id = e.id) then problems := problems || 'add at least one question'::text; end if;
  if not exists (select 1 from public.exam_candidates where exam_id = e.id) then problems := problems || 'assign candidates'::text; end if;
  select proctor_id into lead from public.exam_proctors where exam_id = e.id order by is_lead desc limit 1;
  if e.proctoring_mode = 'live' and lead is null then problems := problems || 'assign a proctor for live proctoring'::text; end if;
  if exists (select 1 from public.exam_questions eq join public.questions q on q.id = eq.question_id
             left join public.question_keys k on k.question_id = q.id
             where eq.exam_id = e.id and q.type in ('single', 'multi', 'truefalse', 'short', 'numeric') and k.answer is null) then
    problems := problems || 'some questions have no correct answer set'::text;
  end if;
  if array_length(problems, 1) > 0 then raise exception 'Fix these before publishing: %.', array_to_string(problems, '; '); end if;

  new_status := case when now() >= e.start_at and now() < e.end_at then 'live' else 'scheduled' end;
  update public.exams set status = new_status where id = e.id;
  if lead is not null then
    insert into public.proctor_sessions (exam_id, proctor_id, status, started_at)
    values (e.id, lead, case when new_status = 'live' then 'live' else 'scheduled' end, case when new_status = 'live' then now() end)
    on conflict (exam_id) do nothing;
    insert into public.notifications (user_id, type, title, message, action_label, action_url)
    select proctor_id, 'assignment', 'New assignment: ' || e.code, 'You are assigned to proctor ' || e.title || '.', 'View assignment', 'proctor/assigned-exams.html'
    from public.exam_proctors where exam_id = e.id;
  end if;
  insert into public.notifications (user_id, type, title, message, action_label, action_url)
  select student_id, 'exam', e.title || ' has been scheduled', 'Opens ' || to_char(e.start_at at time zone e.timezone, 'DD Mon YYYY, HH12:MI AM') || '.', 'View exam', 'student/exam-details.html?id=' || e.id
  from public.exam_candidates where exam_id = e.id;
  perform public.log_activity('published ' || e.title, 'send', 'ok');
  return new_status;
end $$;

-- Publish results (admins). Sends each student a notification.
create function public.publish_results(p_result_ids uuid[]) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.is_admin() then raise exception 'Only admins can publish results.'; end if;
  with upd as (
    update public.results r set published = true, published_at = now(), withheld_reason = null,
      status = case when r.percentage >= coalesce((e.result_rules ->> 'passingScore')::int, 60) then 'pass' else 'fail' end
    from public.exams e
    where e.id = r.exam_id and r.id = any (p_result_ids) and not r.published
    returning r.id, r.student_id, r.percentage, e.title
  ), notes as (
    insert into public.notifications (user_id, type, title, message, action_label, action_url)
    select student_id, 'result', 'Your ' || title || ' result is out', 'You scored ' || percentage || '%.', 'View result', 'student/result-detail.html?id=' || id
    from upd returning 1
  ) select count(*) into n from upd;
  return n;
end $$;

-- Withhold a published result
create function public.withhold_result(p_result_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Only admins can withhold results.'; end if;
  update public.results set published = false, published_at = null, status = 'under_review', withheld_reason = p_reason where id = p_result_id;
end $$;

-- Proctor actions on a candidate's attempt: warn, verify identity,
-- escalate, end attempt. Each one is also written to the event log.
create function public.proctor_action(p_attempt_id uuid, p_action text, p_message text default '') returns void
language plpgsql security definer set search_path = public as $$
declare a public.attempts; s_id uuid; sev text := 'medium'; msg text;
begin
  select * into a from public.attempts where id = p_attempt_id;
  if not found then raise exception 'Attempt not found.'; end if;
  if not (public.is_proctor_of(a.exam_id) or public.is_admin()) then raise exception 'You are not assigned to this exam.'; end if;
  select id into s_id from public.proctor_sessions where exam_id = a.exam_id;

  case p_action
    when 'warn' then
      update public.attempts set warnings = warnings + 1 where id = a.id returning * into a;
      msg := 'Warning ' || a.warnings || ': ' || p_message;
    when 'message' then sev := 'low'; msg := 'Message: ' || p_message;
    when 'verify' then
      update public.attempts set identity = 'verified' where id = a.id; sev := 'low'; msg := 'Identity verified by proctor';
    when 'mismatch' then
      update public.attempts set identity = 'mismatch', risk = 'high' where id = a.id; sev := 'high'; msg := 'Identity does not match ID photo';
    when 'escalate' then
      update public.attempts set flagged = true, risk = 'high' where id = a.id;
      update public.incidents set status = 'escalated' where attempt_id = a.id and status in ('open', 'reviewing');
      insert into public.notifications (user_id, type, title, message, action_label, action_url)
      select id, 'incident', 'Escalation from a proctor', p_message, 'Review incidents', 'admin/incidents.html' from public.profiles where role = 'admin' and status = 'active';
      sev := 'high'; msg := 'Escalated to admin: ' || p_message;
    when 'terminate' then
      if a.status = 'in_progress' then perform public.grade_attempt(a.id, false, 'terminated'); end if;
      sev := 'high'; msg := 'Attempt ended by proctor: ' || p_message;
    else raise exception 'Unknown action.';
  end case;

  if s_id is not null then
    insert into public.session_events (session_id, attempt_id, type, severity, message, created_by)
    values (s_id, a.id, case p_action when 'verify' then 'identity' when 'mismatch' then 'identity' when 'terminate' then 'escalate' else p_action end, sev, msg, auth.uid());
  end if;
end $$;

-- End a proctor session and store its summary
create function public.end_session(p_session_id uuid, p_notes text) returns void
language plpgsql security definer set search_path = public as $$
declare s public.proctor_sessions;
begin
  select * into s from public.proctor_sessions where id = p_session_id;
  if not found or not (p_session_id in (select public.proctor_session_ids()) or public.is_admin()) then raise exception 'Session not found.'; end if;
  update public.proctor_sessions set status = 'completed', ended_at = now(), notes = coalesce(p_notes, notes),
    summary = (select jsonb_build_object(
      'submitted', count(*) filter (where status <> 'in_progress'),
      'flagged', count(*) filter (where flagged),
      'warnings', coalesce(sum(warnings), 0))
      from public.attempts where exam_id = s.exam_id)
  where id = p_session_id;
end $$;


-- =====================================================================
-- PART 7  LIVE UPDATES AND PERMISSIONS
-- =====================================================================

-- Turn on live updates for the proctor console and notification badge
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.session_events, public.incidents, public.attempts, public.notifications;
  end if;
end $$;

-- Visitors who are not signed in ("anon") get nothing at all.
revoke all on all tables in schema public from anon;
revoke execute on all functions in schema public from anon, public;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on all functions in schema public to authenticated;
-- These run only inside other functions or triggers, never from a browser
revoke execute on function public.grade_attempt(uuid, boolean, text) from authenticated;
revoke execute on function public.handle_new_user() from authenticated;
revoke execute on function public.log_activity(text, text, text) from authenticated;

-- Starting data: admin roles and organisation settings
insert into public.admin_roles (id, name, description, permissions) values
  ('super_admin',  'Super admin',      'Full access including admin management and system settings.',
     array['exams.manage','questions.manage','users.manage','proctoring.view','results.publish','reports.view','settings.manage','admins.manage']),
  ('exam_manager', 'Exam manager',     'Creates and schedules exams, manages candidates and proctors.',
     array['exams.manage','questions.manage','users.manage','proctoring.view','reports.view']),
  ('reviewer',     'Results reviewer', 'Reviews incidents and publishes results.',
     array['proctoring.view','results.publish','reports.view']);

insert into public.org_settings (id, organization, exam_defaults, security, notifications) values (1,
  '{"name": "HUK HIRE Assessments", "legalName": "", "domain": "hukhire.com", "timezone": "Asia/Kolkata", "supportEmail": "support@hukhire.com", "locale": "en-IN"}',
  '{"durationMinutes": 60, "graceMinutes": 5, "attemptsAllowed": 1, "passingScore": 60, "negativeMarking": true, "proctoringMode": "live", "release": "manual"}',
  '{"mfaForAdmins": true, "sessionTimeoutMinutes": 30, "passwordMinLength": 10, "tabPolicy": "warn", "maxTabSwitches": 3, "ipAllowlist": "", "dataRetentionDays": 180}',
  '{"emailCandidates": true, "smsReminders": false, "proctorAlerts": true, "dailyDigest": true}');

-- Done. Next: create your own login, then run 02_make_me_admin.sql.
