-- =====================================================================
--  HUK HIRE: make yourself the first admin
--  1. In Supabase: Authentication → Users → Add user → "Create new user".
--     Enter YOUR email and a strong password, tick "Auto Confirm User".
--  2. Change the email below to that same email, then run this file.
--  Every new account starts as a student. Only an admin can promote
--  someone, so this one-time step creates the first admin by hand.
-- =====================================================================
-- If you created your login BEFORE running 01_setup.sql, this adds the
-- missing profile row first (it does nothing if the profile exists).
insert into public.profiles (id, email, name)
select u.id, u.email, split_part(u.email, '@', 1) from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);
insert into public.user_settings (user_id)
select id from public.profiles p where not exists (select 1 from public.user_settings s where s.user_id = p.id);

update public.profiles
set role = 'admin', admin_role_id = 'super_admin', title = 'Platform owner'
where email = 'designer@clovetech.com';

-- Check it worked: you should see one row with role = admin
select email, role, admin_role_id from public.profiles where role = 'admin';
