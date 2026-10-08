-- 00_supabase_shim.sql
--
-- Supabase-Testnachbildung fuer eine LOKALE, ISOLIERTE PostgreSQL-Instanz.
--
-- ===========================================================================
-- KEINE MIGRATION. Diese Datei liegt bewusst ausserhalb von
-- supabase/migrations/ und darf NIEMALS gegen ein Supabase-Projekt laufen.
-- Sie bildet nur so viel von der Supabase-Plattform nach, wie die Migrationen
-- 001 bis 010 und die Berechtigungstests benoetigen.
-- ===========================================================================
--
-- Nachgebildet werden:
--   - Rollen anon, authenticated, service_role
--   - Standardrechte im Schema public wie bei Supabase
--   - Schema auth mit einer vereinfachten Tabelle auth.users
--   - Funktion auth.uid() auf Basis von request.jwt.claims
--   - Erweiterungen uuid-ossp und pgcrypto
--
-- GRENZEN siehe supabase/tests/local/README-GRENZEN.md

-- ---------------------------------------------------------------------------
-- Erweiterungen
-- ---------------------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Rollen wie in einem Supabase-Projekt
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end
$$;

grant usage on schema public to anon, authenticated, service_role;

-- Supabase vergibt im Schema public breite Standardrechte. Das ist wichtig fuer
-- die Aussagekraft der Tests: Erst dadurch haben die revoke-Anweisungen in
-- 002_rls_policies.sql ueberhaupt etwas zu entziehen.
alter default privileges in schema public grant all on tables    to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Schema auth
-- ---------------------------------------------------------------------------
create schema if not exists auth;
grant usage on schema auth to anon, authenticated, service_role;

-- Vereinfachte Nachbildung von auth.users. Enthaelt nur die Spalten, die von
-- den Migrationen und vom Seed benoetigt werden.
create table if not exists auth.users (
  id                 uuid primary key,
  instance_id        uuid,
  aud                varchar(255),
  role               varchar(255),
  email              varchar(255) unique,
  encrypted_password varchar(255),
  email_confirmed_at timestamptz,
  raw_app_meta_data  jsonb,
  raw_user_meta_data jsonb,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

-- auth.uid() wie in Supabase: liest das sub-Feld aus dem JWT-Anspruch.
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid;
$$;

-- auth.role() wird von den Migrationen nicht benoetigt, aber der
-- Vollstaendigkeit halber ergaenzt.
create or replace function auth.role()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  );
$$;

grant execute on function auth.uid()  to anon, authenticated, service_role;
grant execute on function auth.role() to anon, authenticated, service_role;

select 'Supabase-Shim eingerichtet' as status;
