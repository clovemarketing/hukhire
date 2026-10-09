-- LOCAL TESTING ONLY. Imitates the parts of Supabase (auth schema, roles) that 01_setup.sql relies on.
-- Never run this on a real Supabase project; Supabase already has these.
-- Minimal imitation of the Supabase platform pieces, for local testing only.
do $$ begin if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls; end if; end $$;
grant usage on schema public to anon, authenticated, service_role;
create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text unique, raw_user_meta_data jsonb default '{}'::jsonb, created_at timestamptz default now());
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated;
create publication supabase_realtime;
-- Supabase gives these roles table access by default; RLS then decides rows.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
