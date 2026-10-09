-- =====================================================================
--  HUK HIRE: RESET (use only if 01_setup.sql failed halfway, or on the
--  STAGING project to start over).
--  ⚠ Deletes ALL HUK HIRE tables and data. Login accounts are kept.
--  NEVER run this on the production project once real candidates exist.
-- =====================================================================
drop trigger if exists on_auth_user_created on auth.users;
drop table if exists
  public.activity_log, public.notifications, public.incidents, public.session_events, public.proctor_sessions,
  public.results, public.attempt_answers, public.attempts, public.exam_proctors, public.exam_candidates,
  public.exam_questions, public.exams, public.question_keys, public.questions, public.sections,
  public.org_settings, public.user_settings, public.profiles, public.admin_roles cascade;
drop function if exists
  public.my_role(), public.is_admin(), public.is_proctor_of(uuid), public.proctor_session_ids(), public.is_candidate_of(uuid),
  public.proctor_can_see_student(uuid), public.log_activity(text, text, text), public.handle_new_user(),
  public.guard_profile_update(), public.touch_updated_at(), public.start_attempt(uuid),
  public.save_answer(uuid, uuid, jsonb, boolean), public.log_attempt_event(uuid, text), public.grade_attempt(uuid, boolean, text),
  public.submit_attempt(uuid, boolean), public.my_results(), public.my_result(uuid), public.publish_exam(uuid),
  public.publish_results(uuid[]), public.withhold_result(uuid, text), public.proctor_action(uuid, text, text),
  public.end_session(uuid, text) cascade;
-- Now run 01_setup.sql again.
