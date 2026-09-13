-- ===========================================================================
-- Einrichtung des Supabase-TESTPROJEKTS "taxi-germersheim-test"
-- ALTERNATIVFASSUNG OHNE EIGENE TRIGGER AUF storage.objects
-- ===========================================================================
--
-- Anlass
--   Supabase schraenkt das Schema "storage" seit dem 21.04.2025 ein. Die
--   Tabelle storage.objects gehoert supabase_storage_admin; die Projektrolle
--   ist dort nicht Eigentuemerin. PostgreSQL verlangt aber:
--     CREATE POLICY  -> Eigentuemerschaft an der Tabelle
--     CREATE TRIGGER -> das TRIGGER-Recht auf der Tabelle
--   Beides kann in einem Supabase-Projekt fehlen.
--
--   Diese Fassung erzwingt nichts. Sie prueft beide Faehigkeiten getrennt,
--   indem sie sie einmal tatsaechlich versucht und sofort zuruecknimmt, und
--   richtet dann genau das ein, was zulaessig ist. Was nicht geht, wird
--   uebersprungen und am Ende als offener Punkt ausgewiesen.
--
--   KEIN Eigentuemerwechsel. KEINE Rolleneskalation. KEIN SET ROLE.
--
-- Unterschied zur Vollfassung (testprojekt-einrichtung-001-bis-011.sql)
--   Es wird KEIN Trigger auf storage.objects angelegt. Der Schutz gegen das
--   Loeschen bereits verknuepfter Nachweise ruht damit allein auf der
--   DELETE-Policy. Die Sperren auf der Verknuepfungsseite (Trigger auf
--   public.document_submissions und public.employee_documents) bleiben
--   vollstaendig erhalten - sie liegen in unserem eigenen Schema und sind
--   uneingeschraenkt zulaessig.
--   Was dadurch entfaellt und was an seine Stelle tritt, steht ausfuehrlich
--   in Abschnitt 5 weiter unten.
--
-- Sicherheitslage beim Ueberspringen
--   Auf storage.objects ist RLS bei Supabase standardmaessig aktiv. Ohne
--   Policies ist deshalb NICHTS erreichbar. Ein uebersprungener Abschnitt
--   laesst den Bucket also verschlossen, niemals offen. Der Fehlerfall ist
--   damit die sichere Richtung.
--
-- NUR IM TESTPROJEKT AUSFUEHREN. Nicht gegen die Produktivinstanz.
--   Die Faehigkeitsproben in Teil 0 nehmen kurz eine ACCESS-EXCLUSIVE-Sperre
--   auf storage.objects. Im leeren Testprojekt folgenlos, im laufenden
--   Betrieb nicht.
--
-- NICHT enthalten (bewusst):
--   - keine lokalen Testnachbildungen (00_supabase_shim, 01_storage_shim)
--   - keine Testdaten und keine Testkonten
--
-- Die Migrationen 001 bis 010 sind WORTGLEICH uebernommen. Aus 011 sind alle
-- Teile wortgleich uebernommen, die nicht auf storage.objects schreiben; die
-- Storage-Teile sind bedingt ausgefuehrt und entsprechend gekennzeichnet.
-- Die Migrationsdateien selbst bleiben unveraendert.
--
-- Ausfuehrung
--   Supabase Dashboard -> SQL Editor -> Inhalt einfuegen -> Run.
--   Alles laeuft in EINER Transaktion: Entweder alles wird uebernommen oder
--   nichts. Ein Abbruch hinterlaesst also keinen halben Stand.
--
--   ABER: Das Skript ist fuer ein LEERES Projekt gedacht. Ein zweiter
--   Durchlauf auf einem bereits eingerichteten Projekt bricht ab, weil die
--   Migrationen 003, 006, 007 und 009 ihre Policies mit "create policy" ohne
--   vorheriges "drop policy if exists" anlegen. Der Abbruch ist folgenlos
--   (alles wird zurueckgerollt), aber er laeuft nicht durch. Oertlich
--   nachgewiesen am 11.09.2026.
-- ===========================================================================

begin;

-- ---------------------------------------------------------------------------
-- TEIL 0 - Vorpruefung und Faehigkeitsproben
-- ---------------------------------------------------------------------------
-- Harte Voraussetzungen fuehren zum Abbruch. Die Storage-Faehigkeiten fuehren
-- NICHT zum Abbruch, sondern werden gemerkt und spaeter ausgewertet.
create temporary table tg_faehigkeit (
  schluessel text primary key,
  moeglich   boolean not null,
  detail     text
) on commit drop;

do $tg_precheck$
declare
  v_storage_owner   name;
  v_eigentuemer     boolean;
  v_nur_set_role    boolean;
  v_trigger_recht   boolean;
  v_buckets_insert  boolean;
  v_buckets_update  boolean;
  v_probe_policy    boolean := false;
  v_probe_trigger   boolean := false;
  v_rollen_fehlen   text;
begin
  -- 1) Die von Supabase bereitgestellten Rollen muessen vorhanden sein.
  select string_agg(r, ', ')
  into v_rollen_fehlen
  from unnest(array['anon','authenticated','service_role']) as r
  where not exists (select 1 from pg_roles where rolname = r);

  if v_rollen_fehlen is not null then
    raise exception 'ABBRUCH: Folgende Rollen fehlen: %. Ist das wirklich ein Supabase-Projekt?', v_rollen_fehlen;
  end if;

  -- 2) Das Schema storage muss vorhanden sein.
  if to_regclass('storage.objects') is null or to_regclass('storage.buckets') is null then
    raise exception 'ABBRUCH: storage.objects oder storage.buckets fehlt. Storage im Projekt aktivieren und erneut versuchen.';
  end if;

  -- 3) Katalogwerte einsammeln.
  select pg_get_userbyid(c.relowner)
  into v_storage_owner
  from pg_class as c
  join pg_namespace as n on n.oid = c.relnamespace
  where n.nspname = 'storage' and c.relname = 'objects';

  v_eigentuemer    := pg_has_role(current_user, v_storage_owner, 'USAGE');
  v_nur_set_role   := pg_has_role(current_user, v_storage_owner, 'MEMBER');
  v_trigger_recht  := has_table_privilege(current_user, 'storage.objects', 'TRIGGER');
  v_buckets_insert := has_table_privilege(current_user, 'storage.buckets', 'INSERT');
  -- UPDATE wird getrennt gebraucht: "insert ... on conflict do update" verlangt
  -- das UPDATE-Recht bereits beim Planen, auch wenn gar kein Konflikt auftritt.
  v_buckets_update := has_table_privilege(current_user, 'storage.buckets', 'UPDATE');

  -- 4) Faehigkeiten tatsaechlich erproben statt aus Katalogwerten zu schliessen.
  --    Die Probe-Policy erlaubt nichts (using false), der Probe-Trigger wird
  --    nie ausgeloest. Beide werden sofort wieder entfernt; schlaegt eine Probe
  --    fehl, nimmt der exception-Block sie ueber den internen Sicherungspunkt
  --    vollstaendig zurueck.
  begin
    execute 'create policy tg_probe_policy on storage.objects '
         || 'for select to authenticated using (false)';
    execute 'drop policy tg_probe_policy on storage.objects';
    v_probe_policy := true;
  exception
    when insufficient_privilege then
      v_probe_policy := false;
  end;

  begin
    execute 'create trigger tg_probe_trigger before update on storage.objects '
         || 'for each row execute function pg_catalog.suppress_redundant_updates_trigger()';
    execute 'drop trigger tg_probe_trigger on storage.objects';
    v_probe_trigger := true;
  exception
    when insufficient_privilege then
      v_probe_trigger := false;
  end;

  insert into tg_faehigkeit (schluessel, moeglich, detail) values
    ('bucket_anlegen',   v_buckets_insert, 'INSERT auf storage.buckets'),
    ('bucket_aendern',   v_buckets_update, 'UPDATE auf storage.buckets'),
    ('storage_policy',   v_probe_policy,   format('Eigentuemer=%s, USAGE=%s, MEMBER=%s', v_storage_owner, v_eigentuemer, v_nur_set_role)),
    ('storage_trigger',  v_probe_trigger,  format('TRIGGER-Recht laut Katalog=%s', v_trigger_recht)),
    ('storage_grant',    v_eigentuemer,    'GRANT/REVOKE auf storage.objects setzt Eigentuemerschaft voraus');

  raise notice '--- Vorpruefung ---------------------------------------------';
  raise notice 'Benutzer:                          %', current_user;
  raise notice 'Eigentuemer storage.objects:       %', v_storage_owner;
  raise notice 'Eigentuemer-Mitglied (USAGE):      %', v_eigentuemer;
  raise notice 'Mitglied nur per SET ROLE:         %', v_nur_set_role;
  raise notice 'TRIGGER-Recht (Katalog):           %', v_trigger_recht;
  raise notice 'INSERT auf storage.buckets:        %', v_buckets_insert;
  raise notice 'UPDATE auf storage.buckets:        %', v_buckets_update;
  raise notice 'Probe CREATE POLICY erfolgreich:   %', v_probe_policy;
  raise notice 'Probe CREATE TRIGGER erfolgreich:  %', v_probe_trigger;
  raise notice '-------------------------------------------------------------';

  raise notice 'Vorpruefung bestanden. Storage-Teile werden je nach Faehigkeit ausgefuehrt oder uebersprungen.';
end
$tg_precheck$;


-- ###########################################################################
-- ## MIGRATION 001_schema
-- ## (unveraendert aus supabase/migrations/001_schema.sql)
-- ###########################################################################

-- Supabase schema scaffold for future backend integration.
-- This file is not executed in the current demo setup.

create extension if not exists "uuid-ossp";

create table if not exists public.employees (
  id uuid primary key default uuid_generate_v4(),
  first_name text not null,
  last_name text not null,
  phone text,
  email text,
  employment_type text,
  status text not null default 'active',
  active boolean not null default true,
  portal_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vehicles (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  license_plate text,
  vehicle_type text,
  seats integer,
  wheelchair_accessible boolean default false,
  status text,
  mileage integer,
  tuv_due_date date,
  service_due_date date,
  insurance_due_date date,
  tire_status text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key default uuid_generate_v4(),
  auth_user_id uuid references auth.users(id) on delete cascade,
  employee_id uuid references public.employees(id) on delete set null,
  display_name text,
  role text not null default 'employee',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.document_types (
  id uuid primary key default uuid_generate_v4(),
  key text not null unique,
  label text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.ride_series (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.document_submissions (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid not null references public.employees(id) on delete restrict,
  document_type_id uuid references public.document_types(id) on delete set null,
  file_path text,
  file_name text,
  mime_type text,
  status text not null default 'submitted',
  note text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.employee_documents (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid not null references public.employees(id) on delete restrict,
  document_type_id uuid references public.document_types(id) on delete set null,
  document_number text,
  issued_at date,
  valid_until date,
  issuing_authority text,
  status text not null default 'submitted',
  review_status text,
  reminder_days integer,
  note text,
  file_path text,
  reviewed_at timestamptz,
  reviewed_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shifts (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid not null references public.employees(id) on delete restrict,
  shift_date date not null,
  start_time time,
  end_time time,
  status text not null default 'draft',
  vehicle_id uuid references public.vehicles(id) on delete set null,
  note text,
  plan_status text not null default 'draft',
  created_by text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.plan_publications (
  id uuid primary key default uuid_generate_v4(),
  plan_date date not null,
  status text not null default 'draft',
  version integer not null default 1,
  published_at timestamptz,
  published_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.absences (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid not null references public.employees(id) on delete restrict,
  type text not null,
  start_date date not null,
  end_date date not null,
  status text not null default 'requested',
  note text,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vacation_requests (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid not null references public.employees(id) on delete restrict,
  start_date date not null,
  end_date date not null,
  note text,
  status text not null default 'requested',
  submitted_at timestamptz not null default now(),
  processed_at timestamptz,
  processed_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sickness_reports (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid not null references public.employees(id) on delete restrict,
  start_date date not null,
  expected_end_date date,
  note text,
  submission_source text,
  document_submission_id uuid references public.document_submissions(id) on delete set null,
  status text not null default 'submitted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete set null,
  employee_id uuid references public.employees(id) on delete set null,
  type text not null,
  title text not null,
  message text,
  priority text,
  read_at timestamptz,
  related_entity_type text,
  related_entity_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  assignee_user_id uuid references auth.users(id) on delete set null,
  due_date date,
  priority text,
  status text not null default 'open',
  related_entity_type text,
  related_entity_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default uuid_generate_v4(),
  customer_type text,
  name text,
  facility text,
  phone text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rides (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid references public.customers(id) on delete set null,
  employee_id uuid references public.employees(id) on delete set null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  ride_date date,
  ride_time time,
  pickup text,
  destination text,
  ride_type text,
  status text,
  passengers integer,
  note text,
  series_id uuid references public.ride_series(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.employees enable row level security;
alter table public.vehicles enable row level security;
alter table public.profiles enable row level security;
alter table public.document_types enable row level security;
alter table public.ride_series enable row level security;
alter table public.document_submissions enable row level security;
alter table public.employee_documents enable row level security;
alter table public.shifts enable row level security;
alter table public.plan_publications enable row level security;
alter table public.absences enable row level security;
alter table public.vacation_requests enable row level security;
alter table public.sickness_reports enable row level security;
alter table public.notifications enable row level security;
alter table public.tasks enable row level security;
alter table public.customers enable row level security;
alter table public.rides enable row level security;

create index if not exists idx_shifts_employee_id on public.shifts(employee_id);
create index if not exists idx_shifts_shift_date on public.shifts(shift_date);
create index if not exists idx_shifts_status on public.shifts(status);
create index if not exists idx_plan_publications_plan_date on public.plan_publications(plan_date);
create index if not exists idx_absences_employee_id on public.absences(employee_id);
create index if not exists idx_vacation_requests_employee_id on public.vacation_requests(employee_id);
create index if not exists idx_employee_documents_employee_id on public.employee_documents(employee_id);
create index if not exists idx_notifications_employee_id on public.notifications(employee_id);
create index if not exists idx_rides_customer_id on public.rides(customer_id);
create index if not exists idx_rides_series_id on public.rides(series_id);


-- ###########################################################################
-- ## MIGRATION 002_rls_policies
-- ## (unveraendert aus supabase/migrations/002_rls_policies.sql)
-- ###########################################################################

-- Second migration: role-based RLS policies for Taxi Germersheim.
-- This file assumes the schema from 001_schema.sql is already present.

create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon;
grant usage on schema private to authenticated;

create or replace function private.current_user_employee_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.employee_id
  from public.profiles as p
  where p.auth_user_id = (select auth.uid())
    and p.active = true
  limit 1;
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as p
    where p.auth_user_id = (select auth.uid())
      and p.active = true
      and p.role = 'admin'
  );
$$;

create or replace function private.is_dispatcher_or_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as p
    where p.auth_user_id = (select auth.uid())
      and p.active = true
      and p.role in ('dispatcher', 'admin')
  );
$$;

revoke all on function private.current_user_employee_id() from public;
revoke all on function private.current_user_employee_id() from anon;
grant execute on function private.current_user_employee_id() to authenticated;

revoke all on function private.is_admin() from public;
revoke all on function private.is_admin() from anon;
grant execute on function private.is_admin() to authenticated;

revoke all on function private.is_dispatcher_or_admin() from public;
revoke all on function private.is_dispatcher_or_admin() from anon;
grant execute on function private.is_dispatcher_or_admin() to authenticated;

-- Enable RLS on all relevant tables.
alter table public.employees enable row level security;
alter table public.vehicles enable row level security;
alter table public.profiles enable row level security;
alter table public.document_types enable row level security;
alter table public.ride_series enable row level security;
alter table public.document_submissions enable row level security;
alter table public.employee_documents enable row level security;
alter table public.shifts enable row level security;
alter table public.plan_publications enable row level security;
alter table public.absences enable row level security;
alter table public.vacation_requests enable row level security;
alter table public.sickness_reports enable row level security;
alter table public.notifications enable row level security;
alter table public.tasks enable row level security;
alter table public.customers enable row level security;
alter table public.rides enable row level security;

-- Minimal grants for authenticated users. No anon access.
grant usage on schema public to authenticated;
revoke all on table public.employees from anon;
revoke all on table public.vehicles from anon;
revoke all on table public.profiles from anon;
revoke all on table public.document_types from anon;
revoke all on table public.ride_series from anon;
revoke all on table public.document_submissions from anon;
revoke all on table public.employee_documents from anon;
revoke all on table public.shifts from anon;
revoke all on table public.plan_publications from anon;
revoke all on table public.absences from anon;
revoke all on table public.vacation_requests from anon;
revoke all on table public.sickness_reports from anon;
revoke all on table public.notifications from anon;
revoke all on table public.tasks from anon;
revoke all on table public.customers from anon;
revoke all on table public.rides from anon;
grant select, insert, update, delete on table public.employees to authenticated;
grant select, insert, update, delete on table public.vehicles to authenticated;
grant select, insert, update, delete on table public.profiles to authenticated;
grant select, insert, update, delete on table public.document_types to authenticated;
grant select, insert, update, delete on table public.ride_series to authenticated;
grant select, insert, update, delete on table public.document_submissions to authenticated;
grant select, insert, update, delete on table public.employee_documents to authenticated;
grant select, insert, update, delete on table public.shifts to authenticated;
grant select, insert, update, delete on table public.plan_publications to authenticated;
grant select, insert, update, delete on table public.absences to authenticated;
grant select, insert, update, delete on table public.vacation_requests to authenticated;
grant select, insert, update, delete on table public.sickness_reports to authenticated;
grant select, insert on table public.notifications to authenticated;
revoke update on table public.notifications from authenticated;
grant update (read_at) on table public.notifications to authenticated;
grant select, insert, update, delete on table public.tasks to authenticated;
grant select, insert, update, delete on table public.customers to authenticated;
grant select, insert, update, delete on table public.rides to authenticated;

-- Indexes for RLS checks.
drop index if exists public.idx_profiles_auth_user_id;
create unique index if not exists idx_profiles_auth_user_id_unique
  on public.profiles(auth_user_id)
  where auth_user_id is not null;
create index if not exists idx_profiles_employee_id on public.profiles(employee_id);
create index if not exists idx_shifts_employee_id on public.shifts(employee_id);
create index if not exists idx_shifts_vehicle_id on public.shifts(vehicle_id);
create index if not exists idx_document_submissions_employee_id on public.document_submissions(employee_id);
create index if not exists idx_employee_documents_employee_id on public.employee_documents(employee_id);
create index if not exists idx_vacation_requests_employee_id on public.vacation_requests(employee_id);
create index if not exists idx_sickness_reports_employee_id on public.sickness_reports(employee_id);
create index if not exists idx_notifications_employee_id on public.notifications(employee_id);
create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_tasks_assignee_user_id on public.tasks(assignee_user_id);
create index if not exists idx_rides_employee_id on public.rides(employee_id);
create index if not exists idx_rides_series_id on public.rides(series_id);

-- Drop existing policies to keep the migration idempotent.
do $$
begin
  drop policy if exists profiles_select_self on public.profiles;
  drop policy if exists profiles_select_admin on public.profiles;
  drop policy if exists profiles_admin_insert on public.profiles;
  drop policy if exists profiles_admin_update on public.profiles;
  drop policy if exists profiles_admin_delete on public.profiles;

  drop policy if exists employees_select_admin on public.employees;
  drop policy if exists employees_select_dispatcher on public.employees;
  drop policy if exists employees_select_self on public.employees;
  drop policy if exists employees_admin_insert on public.employees;
  drop policy if exists employees_admin_update on public.employees;
  drop policy if exists employees_admin_delete on public.employees;

  drop policy if exists vehicles_select_admin_dispatcher on public.vehicles;
  drop policy if exists vehicles_admin_dispatcher_insert on public.vehicles;
  drop policy if exists vehicles_admin_dispatcher_update on public.vehicles;
  drop policy if exists vehicles_admin_delete on public.vehicles;

  drop policy if exists document_types_select_authenticated on public.document_types;
  drop policy if exists document_types_admin_manage on public.document_types;
  drop policy if exists document_types_admin_update on public.document_types;

  drop policy if exists ride_series_select_authenticated on public.ride_series;
  drop policy if exists ride_series_select_admin_dispatcher on public.ride_series;
  drop policy if exists ride_series_admin_manage on public.ride_series;
  drop policy if exists ride_series_admin_update on public.ride_series;

  drop policy if exists shifts_select_admin_dispatcher on public.shifts;
  drop policy if exists shifts_select_self_published on public.shifts;
  drop policy if exists shifts_admin_dispatcher_insert on public.shifts;
  drop policy if exists shifts_admin_dispatcher_update on public.shifts;
  drop policy if exists shifts_admin_delete on public.shifts;

  drop policy if exists plan_publications_select_admin_dispatcher on public.plan_publications;
  drop policy if exists plan_publications_select_employee_published on public.plan_publications;
  drop policy if exists plan_publications_admin_dispatcher_insert on public.plan_publications;
  drop policy if exists plan_publications_admin_dispatcher_update on public.plan_publications;
  drop policy if exists plan_publications_admin_delete on public.plan_publications;

  drop policy if exists absences_select_admin_dispatcher on public.absences;
  drop policy if exists absences_admin_insert on public.absences;
  drop policy if exists absences_admin_update on public.absences;
  drop policy if exists absences_admin_delete on public.absences;

  drop policy if exists vacation_requests_select_admin on public.vacation_requests;
  drop policy if exists vacation_requests_select_self on public.vacation_requests;
  drop policy if exists vacation_requests_employee_insert on public.vacation_requests;
  drop policy if exists vacation_requests_admin_update on public.vacation_requests;
  drop policy if exists vacation_requests_admin_delete on public.vacation_requests;

  drop policy if exists sickness_reports_select_admin on public.sickness_reports;
  drop policy if exists sickness_reports_select_self on public.sickness_reports;
  drop policy if exists sickness_reports_employee_insert on public.sickness_reports;
  drop policy if exists sickness_reports_admin_update on public.sickness_reports;
  drop policy if exists sickness_reports_admin_delete on public.sickness_reports;

  drop policy if exists document_submissions_select_admin on public.document_submissions;
  drop policy if exists document_submissions_select_self on public.document_submissions;
  drop policy if exists document_submissions_employee_insert on public.document_submissions;
  drop policy if exists document_submissions_admin_update on public.document_submissions;
  drop policy if exists document_submissions_admin_delete on public.document_submissions;

  drop policy if exists employee_documents_select_admin on public.employee_documents;
  drop policy if exists employee_documents_select_self on public.employee_documents;
  drop policy if exists employee_documents_admin_insert on public.employee_documents;
  drop policy if exists employee_documents_admin_update on public.employee_documents;
  drop policy if exists employee_documents_admin_delete on public.employee_documents;

  drop policy if exists notifications_select_self on public.notifications;
  drop policy if exists notifications_select_admin_dispatcher on public.notifications;
  drop policy if exists notifications_admin_dispatcher_insert on public.notifications;
  drop policy if exists notifications_update_self_read_at on public.notifications;

  drop policy if exists tasks_select_admin_dispatcher on public.tasks;
  drop policy if exists tasks_select_self on public.tasks;
  drop policy if exists tasks_admin_dispatcher_insert on public.tasks;
  drop policy if exists tasks_admin_dispatcher_update on public.tasks;
  drop policy if exists tasks_admin_delete on public.tasks;

  drop policy if exists customers_admin_dispatcher_select on public.customers;
  drop policy if exists customers_admin_dispatcher_insert on public.customers;
  drop policy if exists customers_admin_dispatcher_update on public.customers;
  drop policy if exists customers_admin_delete on public.customers;

  drop policy if exists rides_admin_dispatcher_select on public.rides;
  drop policy if exists rides_admin_dispatcher_insert on public.rides;
  drop policy if exists rides_admin_dispatcher_update on public.rides;
  drop policy if exists rides_admin_delete on public.rides;
end
$$;

-- Profiles.
create policy profiles_select_self
  on public.profiles
  as permissive
  for select
  to authenticated
  using (auth_user_id = (select auth.uid()));

create policy profiles_select_admin
  on public.profiles
  as permissive
  for select
  to authenticated
  using (private.is_admin());

create policy profiles_admin_insert
  on public.profiles
  as permissive
  for insert
  to authenticated
  with check (private.is_admin());

create policy profiles_admin_update
  on public.profiles
  as permissive
  for update
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy profiles_admin_delete
  on public.profiles
  as permissive
  for delete
  to authenticated
  using (private.is_admin());

-- Employees.
create policy employees_select_admin
  on public.employees
  as permissive
  for select
  to authenticated
  using (private.is_admin());

create policy employees_select_dispatcher
  on public.employees
  as permissive
  for select
  to authenticated
  using (private.is_dispatcher_or_admin());

create policy employees_select_self
  on public.employees
  as permissive
  for select
  to authenticated
  using (id = private.current_user_employee_id());

create policy employees_admin_insert
  on public.employees
  as permissive
  for insert
  to authenticated
  with check (private.is_admin());

create policy employees_admin_update
  on public.employees
  as permissive
  for update
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy employees_admin_delete
  on public.employees
  as permissive
  for delete
  to authenticated
  using (private.is_admin());

-- Vehicles.
create policy vehicles_select_admin_dispatcher
  on public.vehicles
  as permissive
  for select
  to authenticated
  using (
    private.is_dispatcher_or_admin()
    or exists (
      select 1
      from public.shifts as s
      where s.vehicle_id = vehicles.id
        and s.employee_id = private.current_user_employee_id()
        and s.plan_status = 'published'
    )
  );

create policy vehicles_admin_dispatcher_insert
  on public.vehicles
  as permissive
  for insert
  to authenticated
  with check (private.is_dispatcher_or_admin());

create policy vehicles_admin_dispatcher_update
  on public.vehicles
  as permissive
  for update
  to authenticated
  using (private.is_dispatcher_or_admin())
  with check (private.is_dispatcher_or_admin());

create policy vehicles_admin_delete
  on public.vehicles
  as permissive
  for delete
  to authenticated
  using (private.is_admin());

-- Document types and ride series.
create policy document_types_select_authenticated
  on public.document_types
  as permissive
  for select
  to authenticated
  using (true);

create policy document_types_admin_manage
  on public.document_types
  as permissive
  for insert
  to authenticated
  with check (private.is_admin());

create policy document_types_admin_update
  on public.document_types
  as permissive
  for update
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy ride_series_select_admin_dispatcher
  on public.ride_series
  as permissive
  for select
  to authenticated
  using (private.is_dispatcher_or_admin());

create policy ride_series_admin_manage
  on public.ride_series
  as permissive
  for insert
  to authenticated
  with check (private.is_dispatcher_or_admin());

create policy ride_series_admin_update
  on public.ride_series
  as permissive
  for update
  to authenticated
  using (private.is_dispatcher_or_admin())
  with check (private.is_dispatcher_or_admin());

-- Shifts.
create policy shifts_select_admin_dispatcher
  on public.shifts
  as permissive
  for select
  to authenticated
  using (private.is_dispatcher_or_admin());

create policy shifts_select_self_published
  on public.shifts
  as permissive
  for select
  to authenticated
  using (
    employee_id = private.current_user_employee_id()
    and plan_status = 'published'
  );

create policy shifts_admin_dispatcher_insert
  on public.shifts
  as permissive
  for insert
  to authenticated
  with check (private.is_dispatcher_or_admin());

create policy shifts_admin_dispatcher_update
  on public.shifts
  as permissive
  for update
  to authenticated
  using (private.is_dispatcher_or_admin())
  with check (private.is_dispatcher_or_admin());

create policy shifts_admin_delete
  on public.shifts
  as permissive
  for delete
  to authenticated
  using (private.is_admin());

-- Plan publications.
create policy plan_publications_select_admin_dispatcher
  on public.plan_publications
  as permissive
  for select
  to authenticated
  using (private.is_dispatcher_or_admin());

create policy plan_publications_select_employee_published
  on public.plan_publications
  as permissive
  for select
  to authenticated
  using (status = 'published');

create policy plan_publications_admin_dispatcher_insert
  on public.plan_publications
  as permissive
  for insert
  to authenticated
  with check (private.is_dispatcher_or_admin());

create policy plan_publications_admin_dispatcher_update
  on public.plan_publications
  as permissive
  for update
  to authenticated
  using (private.is_dispatcher_or_admin())
  with check (private.is_dispatcher_or_admin());

create policy plan_publications_admin_delete
  on public.plan_publications
  as permissive
  for delete
  to authenticated
  using (private.is_admin());

-- Absences.
create policy absences_select_admin_dispatcher
  on public.absences
  as permissive
  for select
  to authenticated
  using (private.is_dispatcher_or_admin());

create policy absences_admin_insert
  on public.absences
  as permissive
  for insert
  to authenticated
  with check (private.is_admin());

create policy absences_admin_update
  on public.absences
  as permissive
  for update
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy absences_admin_delete
  on public.absences
  as permissive
  for delete
  to authenticated
  using (private.is_admin());

-- Vacation requests.
create policy vacation_requests_select_admin
  on public.vacation_requests
  as permissive
  for select
  to authenticated
  using (private.is_admin());

create policy vacation_requests_select_self
  on public.vacation_requests
  as permissive
  for select
  to authenticated
  using (employee_id = private.current_user_employee_id());

create policy vacation_requests_employee_insert
  on public.vacation_requests
  as permissive
  for insert
  to authenticated
  with check (
    employee_id = private.current_user_employee_id()
    and status = 'requested'
    and processed_at is null
    and processed_by is null
  );

create policy vacation_requests_admin_update
  on public.vacation_requests
  as permissive
  for update
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy vacation_requests_admin_delete
  on public.vacation_requests
  as permissive
  for delete
  to authenticated
  using (private.is_admin());

-- Sickness reports.
create policy sickness_reports_select_admin
  on public.sickness_reports
  as permissive
  for select
  to authenticated
  using (private.is_admin());

create policy sickness_reports_select_self
  on public.sickness_reports
  as permissive
  for select
  to authenticated
  using (employee_id = private.current_user_employee_id());

create policy sickness_reports_employee_insert
  on public.sickness_reports
  as permissive
  for insert
  to authenticated
  with check (
    employee_id = private.current_user_employee_id()
    and status = 'submitted'
  );

create policy sickness_reports_admin_update
  on public.sickness_reports
  as permissive
  for update
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy sickness_reports_admin_delete
  on public.sickness_reports
  as permissive
  for delete
  to authenticated
  using (private.is_admin());

-- Document submissions.
create policy document_submissions_select_admin
  on public.document_submissions
  as permissive
  for select
  to authenticated
  using (private.is_admin());

create policy document_submissions_select_self
  on public.document_submissions
  as permissive
  for select
  to authenticated
  using (employee_id = private.current_user_employee_id());

create policy document_submissions_employee_insert
  on public.document_submissions
  as permissive
  for insert
  to authenticated
  with check (
    employee_id = private.current_user_employee_id()
    and status = 'submitted'
    and reviewed_at is null
    and reviewed_by is null
  );

create policy document_submissions_admin_update
  on public.document_submissions
  as permissive
  for update
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy document_submissions_admin_delete
  on public.document_submissions
  as permissive
  for delete
  to authenticated
  using (private.is_admin());

-- Employee documents.
create policy employee_documents_select_admin
  on public.employee_documents
  as permissive
  for select
  to authenticated
  using (private.is_admin());

create policy employee_documents_select_self
  on public.employee_documents
  as permissive
  for select
  to authenticated
  using (employee_id = private.current_user_employee_id());

create policy employee_documents_admin_insert
  on public.employee_documents
  as permissive
  for insert
  to authenticated
  with check (private.is_admin());

create policy employee_documents_admin_update
  on public.employee_documents
  as permissive
  for update
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy employee_documents_admin_delete
  on public.employee_documents
  as permissive
  for delete
  to authenticated
  using (private.is_admin());

-- Notifications.
create policy notifications_select_self
  on public.notifications
  as permissive
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or employee_id = private.current_user_employee_id()
  );

create policy notifications_select_admin_dispatcher
  on public.notifications
  as permissive
  for select
  to authenticated
  using (private.is_dispatcher_or_admin());

create policy notifications_admin_dispatcher_insert
  on public.notifications
  as permissive
  for insert
  to authenticated
  with check (private.is_dispatcher_or_admin());

create policy notifications_update_self_read_at
  on public.notifications
  as permissive
  for update
  to authenticated
  using (
    user_id = (select auth.uid())
    or employee_id = private.current_user_employee_id()
  )
  with check (
    user_id = (select auth.uid())
    or employee_id = private.current_user_employee_id()
  );

-- Tasks.
create policy tasks_select_admin_dispatcher
  on public.tasks
  as permissive
  for select
  to authenticated
  using (private.is_dispatcher_or_admin());

create policy tasks_select_self
  on public.tasks
  as permissive
  for select
  to authenticated
  using (assignee_user_id = (select auth.uid()));

create policy tasks_admin_dispatcher_insert
  on public.tasks
  as permissive
  for insert
  to authenticated
  with check (private.is_dispatcher_or_admin());

create policy tasks_admin_dispatcher_update
  on public.tasks
  as permissive
  for update
  to authenticated
  using (private.is_dispatcher_or_admin())
  with check (private.is_dispatcher_or_admin());

create policy tasks_admin_delete
  on public.tasks
  as permissive
  for delete
  to authenticated
  using (private.is_admin());

-- Customers and rides.
create policy customers_admin_dispatcher_select
  on public.customers
  as permissive
  for select
  to authenticated
  using (private.is_dispatcher_or_admin());

create policy customers_admin_dispatcher_insert
  on public.customers
  as permissive
  for insert
  to authenticated
  with check (private.is_dispatcher_or_admin());

create policy customers_admin_dispatcher_update
  on public.customers
  as permissive
  for update
  to authenticated
  using (private.is_dispatcher_or_admin())
  with check (private.is_dispatcher_or_admin());

create policy customers_admin_delete
  on public.customers
  as permissive
  for delete
  to authenticated
  using (private.is_admin());

create policy rides_admin_dispatcher_select
  on public.rides
  as permissive
  for select
  to authenticated
  using (private.is_dispatcher_or_admin());

create policy rides_admin_dispatcher_insert
  on public.rides
  as permissive
  for insert
  to authenticated
  with check (private.is_dispatcher_or_admin());

create policy rides_admin_dispatcher_update
  on public.rides
  as permissive
  for update
  to authenticated
  using (private.is_dispatcher_or_admin())
  with check (private.is_dispatcher_or_admin());

create policy rides_admin_delete
  on public.rides
  as permissive
  for delete
  to authenticated
  using (private.is_admin());


-- ###########################################################################
-- ## MIGRATION 003_rewards_backend
-- ## (unveraendert aus supabase/migrations/003_rewards_backend.sql)
-- ###########################################################################

-- Rewards backend for the existing customers schema.
-- Automatic ride rewards remain intentionally disabled until the rides UI uses
-- Supabase and one unambiguous points formula matches the approved exclusions.

create table if not exists public.rewards_accounts (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid not null unique references public.customers(id) on delete cascade,
  points_balance integer not null default 0 check (points_balance >= 0),
  qualifying_rides integer not null default 0 check (qualifying_rides >= 0),
  level text not null default 'bronze' check (level in ('bronze', 'silver', 'gold', 'platinum', 'vip')),
  status text not null default 'active' check (status in ('active', 'paused', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rewards_transactions (
  id uuid primary key default uuid_generate_v4(),
  rewards_account_id uuid not null references public.rewards_accounts(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict,
  ride_id uuid references public.rides(id) on delete set null,
  transaction_type text not null check (transaction_type in (
    'ride_reward',
    'birthday_bonus',
    'manual_credit',
    'manual_debit',
    'voucher_redemption',
    'adjustment'
  )),
  points integer not null check (points <> 0),
  points_balance_after integer not null check (points_balance_after >= 0),
  reason text not null check (length(trim(reason)) > 0),
  note text,
  created_by uuid,
  created_by_name text,
  reward_year integer check (reward_year between 2000 and 9999),
  created_at timestamptz not null default now()
);

create index if not exists idx_rewards_accounts_status on public.rewards_accounts(status);
create index if not exists idx_rewards_accounts_level on public.rewards_accounts(level);
create index if not exists idx_rewards_transactions_account_created
  on public.rewards_transactions(rewards_account_id, created_at desc);
create index if not exists idx_rewards_transactions_customer
  on public.rewards_transactions(customer_id);

create unique index if not exists uq_rewards_transactions_ride_type
  on public.rewards_transactions(ride_id, transaction_type)
  where ride_id is not null;

create unique index if not exists uq_rewards_transactions_birthday_year
  on public.rewards_transactions(customer_id, transaction_type, reward_year)
  where transaction_type = 'birthday_bonus' and reward_year is not null;

create or replace function private.set_rewards_account_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.prevent_rewards_transaction_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Rewards transactions are immutable';
end;
$$;

drop trigger if exists rewards_accounts_set_updated_at on public.rewards_accounts;
create trigger rewards_accounts_set_updated_at
before update on public.rewards_accounts
for each row execute function private.set_rewards_account_updated_at();

drop trigger if exists rewards_transactions_immutable on public.rewards_transactions;
create trigger rewards_transactions_immutable
before update or delete on public.rewards_transactions
for each row execute function private.prevent_rewards_transaction_mutation();

create or replace function private.create_rewards_account_for_customer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.rewards_accounts (customer_id)
  values (new.id)
  on conflict (customer_id) do nothing;
  return new;
end;
$$;

revoke all on function private.set_rewards_account_updated_at() from public;
revoke all on function private.set_rewards_account_updated_at() from anon;
revoke all on function private.set_rewards_account_updated_at() from authenticated;
revoke all on function private.prevent_rewards_transaction_mutation() from public;
revoke all on function private.prevent_rewards_transaction_mutation() from anon;
revoke all on function private.prevent_rewards_transaction_mutation() from authenticated;
revoke all on function private.create_rewards_account_for_customer() from public;
revoke all on function private.create_rewards_account_for_customer() from anon;
revoke all on function private.create_rewards_account_for_customer() from authenticated;

drop trigger if exists customers_create_rewards_account on public.customers;
create trigger customers_create_rewards_account
after insert on public.customers
for each row execute function private.create_rewards_account_for_customer();

insert into public.rewards_accounts (customer_id)
select customers.id
from public.customers as customers
on conflict (customer_id) do nothing;

create or replace function public.book_rewards_points(
  p_rewards_account_id uuid,
  p_points integer,
  p_reason text,
  p_note text default null
)
returns public.rewards_transactions
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_row public.rewards_accounts%rowtype;
  transaction_row public.rewards_transactions%rowtype;
  next_balance integer;
  actor_name text;
begin
  if not private.is_dispatcher_or_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if p_points = 0 then
    raise exception 'Points must not be zero' using errcode = '22023';
  end if;

  if nullif(trim(p_reason), '') is null then
    raise exception 'Reason is required' using errcode = '22023';
  end if;

  select *
  into account_row
  from public.rewards_accounts
  where id = p_rewards_account_id
  for update;

  if not found then
    raise exception 'Rewards account not found' using errcode = 'P0002';
  end if;

  next_balance := account_row.points_balance + p_points;
  if next_balance < 0 then
    raise exception 'Points balance must not become negative' using errcode = '22003';
  end if;

  select coalesce(nullif(trim(profiles.display_name), ''), profiles.role, 'Mitarbeiter')
  into actor_name
  from public.profiles as profiles
  where profiles.auth_user_id = auth.uid()
  limit 1;

  insert into public.rewards_transactions (
    rewards_account_id,
    customer_id,
    transaction_type,
    points,
    points_balance_after,
    reason,
    note,
    created_by,
    created_by_name
  ) values (
    account_row.id,
    account_row.customer_id,
    case when p_points > 0 then 'manual_credit' else 'manual_debit' end,
    p_points,
    next_balance,
    trim(p_reason),
    nullif(trim(coalesce(p_note, '')), ''),
    auth.uid(),
    coalesce(actor_name, 'Mitarbeiter')
  )
  returning * into transaction_row;

  update public.rewards_accounts
  set points_balance = next_balance
  where id = account_row.id;

  return transaction_row;
end;
$$;

alter table public.rewards_accounts enable row level security;
alter table public.rewards_transactions enable row level security;

revoke all on table public.rewards_accounts from anon;
revoke all on table public.rewards_transactions from anon;
revoke all on table public.rewards_accounts from authenticated;
revoke all on table public.rewards_transactions from authenticated;

grant select on table public.rewards_accounts to authenticated;
grant update (status, level) on table public.rewards_accounts to authenticated;
grant select on table public.rewards_transactions to authenticated;

create policy rewards_accounts_admin_dispatcher_select
  on public.rewards_accounts
  as permissive
  for select
  to authenticated
  using (private.is_dispatcher_or_admin());

create policy rewards_accounts_admin_dispatcher_update
  on public.rewards_accounts
  as permissive
  for update
  to authenticated
  using (private.is_dispatcher_or_admin())
  with check (private.is_dispatcher_or_admin());

create policy rewards_transactions_admin_dispatcher_select
  on public.rewards_transactions
  as permissive
  for select
  to authenticated
  using (private.is_dispatcher_or_admin());

revoke all on function public.book_rewards_points(uuid, integer, text, text) from public;
revoke all on function public.book_rewards_points(uuid, integer, text, text) from anon;
grant execute on function public.book_rewards_points(uuid, integer, text, text) to authenticated;


-- ###########################################################################
-- ## MIGRATION 004_rewards_status_guard
-- ## (unveraendert aus supabase/migrations/004_rewards_status_guard.sql)
-- ###########################################################################

create or replace function public.book_rewards_points(
  p_rewards_account_id uuid,
  p_points integer,
  p_reason text,
  p_note text default null
)
returns public.rewards_transactions
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_row public.rewards_accounts%rowtype;
  transaction_row public.rewards_transactions%rowtype;
  next_balance integer;
  actor_name text;
begin
  if not private.is_dispatcher_or_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if p_points = 0 then
    raise exception 'Points must not be zero' using errcode = '22023';
  end if;

  if nullif(trim(p_reason), '') is null then
    raise exception 'Reason is required' using errcode = '22023';
  end if;

  select *
  into account_row
  from public.rewards_accounts
  where id = p_rewards_account_id
  for update;

  if not found then
    raise exception 'Rewards account not found' using errcode = 'P0002';
  end if;

  if account_row.status = 'paused' then
    raise exception 'REWARDS_ACCOUNT_PAUSED';
  elsif account_row.status = 'blocked' then
    raise exception 'REWARDS_ACCOUNT_BLOCKED';
  end if;

  next_balance := account_row.points_balance + p_points;
  if next_balance < 0 then
    raise exception 'Points balance must not become negative' using errcode = '22003';
  end if;

  select coalesce(nullif(trim(profiles.display_name), ''), profiles.role, 'Mitarbeiter')
  into actor_name
  from public.profiles as profiles
  where profiles.auth_user_id = auth.uid()
  limit 1;

  insert into public.rewards_transactions (
    rewards_account_id,
    customer_id,
    transaction_type,
    points,
    points_balance_after,
    reason,
    note,
    created_by,
    created_by_name
  ) values (
    account_row.id,
    account_row.customer_id,
    case when p_points > 0 then 'manual_credit' else 'manual_debit' end,
    p_points,
    next_balance,
    trim(p_reason),
    nullif(trim(coalesce(p_note, '')), ''),
    auth.uid(),
    coalesce(actor_name, 'Mitarbeiter')
  )
  returning * into transaction_row;

  update public.rewards_accounts
  set points_balance = next_balance
  where id = account_row.id;

  return transaction_row;
end;
$$;

revoke all on function public.book_rewards_points(uuid, integer, text, text) from public;
revoke all on function public.book_rewards_points(uuid, integer, text, text) from anon;
grant execute on function public.book_rewards_points(uuid, integer, text, text) to authenticated;


-- ###########################################################################
-- ## MIGRATION 005_rewards_birthday_bonus
-- ## (unveraendert aus supabase/migrations/005_rewards_birthday_bonus.sql)
-- ###########################################################################

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'customers'
      and column_name in ('birth_date', 'birthday', 'date_of_birth', 'dob', 'birthDate')
  ) then
    alter table public.customers
      add column if not exists birth_date date;
  end if;
end $$;

create unique index if not exists uq_rewards_transactions_birthday_year
  on public.rewards_transactions(customer_id, transaction_type, reward_year)
  where transaction_type = 'birthday_bonus' and reward_year is not null;

create or replace function public.book_rewards_birthday_bonus(
  p_rewards_account_id uuid
)
returns public.rewards_transactions
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_row public.rewards_accounts%rowtype;
  transaction_row public.rewards_transactions%rowtype;
  next_balance integer;
  actor_name text;
  current_year integer;
  birthday_column text;
  birth_date_value date;
  bonus_points constant integer := 200;
begin
  if not private.is_dispatcher_or_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select *
  into account_row
  from public.rewards_accounts
  where id = p_rewards_account_id
  for update;

  if not found then
    raise exception 'Rewards account not found' using errcode = 'P0002';
  end if;

  if account_row.status = 'paused' then
    raise exception 'REWARDS_ACCOUNT_PAUSED';
  elsif account_row.status = 'blocked' then
    raise exception 'REWARDS_ACCOUNT_BLOCKED';
  end if;

  select column_name
  into birthday_column
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'customers'
    and column_name in ('birth_date', 'birthday', 'date_of_birth', 'dob', 'birthDate')
  order by
    case column_name
      when 'birth_date' then 1
      when 'birthday' then 2
      when 'date_of_birth' then 3
      when 'dob' then 4
      when 'birthDate' then 5
      else 6
    end
  limit 1;

  if birthday_column is null then
    raise exception 'REWARDS_BIRTH_DATE_MISSING';
  end if;

  execute format(
    'select %I from public.customers where id = $1',
    birthday_column
  )
  into birth_date_value
  using account_row.customer_id;

  if birth_date_value is null then
    raise exception 'REWARDS_BIRTH_DATE_MISSING';
  end if;

  if not (
    extract(month from birth_date_value) = extract(month from current_date)
    and extract(day from birth_date_value) = extract(day from current_date)
  ) then
    raise exception 'REWARDS_NOT_BIRTHDAY';
  end if;

  current_year := extract(year from current_date)::int;

  if exists (
    select 1
    from public.rewards_transactions
    where customer_id = account_row.customer_id
      and transaction_type = 'birthday_bonus'
      and reward_year = current_year
  ) then
    raise exception 'REWARDS_BIRTHDAY_ALREADY_GRANTED';
  end if;

  next_balance := account_row.points_balance + bonus_points;

  select coalesce(nullif(trim(profiles.display_name), ''), profiles.role, 'Mitarbeiter')
  into actor_name
  from public.profiles as profiles
  where profiles.auth_user_id = auth.uid()
  limit 1;

  insert into public.rewards_transactions (
    rewards_account_id,
    customer_id,
    transaction_type,
    points,
    points_balance_after,
    reason,
    note,
    created_by,
    created_by_name,
    reward_year
  ) values (
    account_row.id,
    account_row.customer_id,
    'birthday_bonus',
    bonus_points,
    next_balance,
    'Geburtstagsbonus',
    'Geburtstagsbonus ' || current_year,
    auth.uid(),
    coalesce(actor_name, 'Mitarbeiter'),
    current_year
  )
  returning * into transaction_row;

  update public.rewards_accounts
  set points_balance = next_balance
  where id = account_row.id;

  return transaction_row;
end;
$$;

revoke all on function public.book_rewards_birthday_bonus(uuid) from public;
revoke all on function public.book_rewards_birthday_bonus(uuid) from anon;
grant execute on function public.book_rewards_birthday_bonus(uuid) to authenticated;


-- ###########################################################################
-- ## MIGRATION 006_rewards_vouchers
-- ## (unveraendert aus supabase/migrations/006_rewards_vouchers.sql)
-- ###########################################################################

create table if not exists public.rewards_vouchers (
  id uuid primary key default gen_random_uuid(),
  rewards_account_id uuid not null references public.rewards_accounts(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict,
  code text not null unique,
  value_cents integer not null check (value_cents > 0),
  status text not null default 'open' check (status in ('open', 'redeemed', 'blocked')),
  issued_at timestamptz not null default now(),
  valid_until date not null,
  redeemed_at timestamptz null,
  created_by uuid null,
  redeemed_by uuid null,
  note text null,
  blocked_at timestamptz null,
  blocked_by uuid null,
  block_reason text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_rewards_vouchers_account on public.rewards_vouchers(rewards_account_id);
create index if not exists idx_rewards_vouchers_customer on public.rewards_vouchers(customer_id);
create index if not exists idx_rewards_vouchers_status on public.rewards_vouchers(status);

create or replace function private.set_rewards_vouchers_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists rewards_vouchers_set_updated_at on public.rewards_vouchers;
create trigger rewards_vouchers_set_updated_at
before update on public.rewards_vouchers
for each row execute function private.set_rewards_vouchers_updated_at();

create or replace function public.issue_rewards_voucher(
  p_rewards_account_id uuid,
  p_value_cents integer,
  p_valid_until date,
  p_note text default null
)
returns public.rewards_vouchers
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_row public.rewards_accounts%rowtype;
  voucher_row public.rewards_vouchers%rowtype;
  next_code text;
begin
  if not private.is_dispatcher_or_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if p_value_cents is null or p_value_cents <= 0 then
    raise exception 'REWARDS_VOUCHER_INVALID_EXPIRY';
  end if;

  if p_valid_until is null or p_valid_until < current_date then
    raise exception 'REWARDS_VOUCHER_INVALID_EXPIRY';
  end if;

  select *
  into account_row
  from public.rewards_accounts
  where id = p_rewards_account_id
  for update;

  if not found then
    raise exception 'Rewards account not found' using errcode = 'P0002';
  end if;

  if account_row.status = 'paused' then
    raise exception 'REWARDS_ACCOUNT_PAUSED';
  elsif account_row.status = 'blocked' then
    raise exception 'REWARDS_ACCOUNT_BLOCKED';
  end if;

  next_code := 'TG-' || extract(year from current_date)::int::text || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);

  insert into public.rewards_vouchers (
    rewards_account_id,
    customer_id,
    code,
    value_cents,
    valid_until,
    created_by,
    note
  ) values (
    account_row.id,
    account_row.customer_id,
    next_code,
    p_value_cents,
    p_valid_until,
    auth.uid(),
    nullif(trim(coalesce(p_note, '')), '')
  )
  returning * into voucher_row;

  return voucher_row;
end;
$$;

create or replace function public.redeem_rewards_voucher(
  p_voucher_id uuid
)
returns public.rewards_vouchers
language plpgsql
security definer
set search_path = ''
as $$
declare
  voucher_row public.rewards_vouchers%rowtype;
  account_row public.rewards_accounts%rowtype;
begin
  if not private.is_dispatcher_or_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select *
  into voucher_row
  from public.rewards_vouchers
  where id = p_voucher_id
  for update;

  if not found then
    raise exception 'Voucher not found' using errcode = 'P0002';
  end if;

  if voucher_row.status = 'redeemed' then
    raise exception 'REWARDS_VOUCHER_ALREADY_REDEEMED';
  elsif voucher_row.status = 'blocked' then
    raise exception 'REWARDS_VOUCHER_BLOCKED';
  elsif voucher_row.valid_until < current_date then
    raise exception 'REWARDS_VOUCHER_EXPIRED';
  end if;

  select *
  into account_row
  from public.rewards_accounts
  where id = voucher_row.rewards_account_id
  for update;

  if account_row.status = 'paused' then
    raise exception 'REWARDS_ACCOUNT_PAUSED';
  elsif account_row.status = 'blocked' then
    raise exception 'REWARDS_ACCOUNT_BLOCKED';
  end if;

  update public.rewards_vouchers
  set status = 'redeemed',
      redeemed_at = now(),
      redeemed_by = auth.uid(),
      updated_at = now()
  where id = voucher_row.id
  returning * into voucher_row;

  return voucher_row;
end;
$$;

create or replace function public.block_rewards_voucher(
  p_voucher_id uuid,
  p_reason text
)
returns public.rewards_vouchers
language plpgsql
security definer
set search_path = ''
as $$
declare
  voucher_row public.rewards_vouchers%rowtype;
begin
  if not private.is_dispatcher_or_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select *
  into voucher_row
  from public.rewards_vouchers
  where id = p_voucher_id
  for update;

  if not found then
    raise exception 'Voucher not found' using errcode = 'P0002';
  end if;

  if voucher_row.status = 'redeemed' then
    raise exception 'REWARDS_VOUCHER_ALREADY_REDEEMED';
  end if;

  if voucher_row.status = 'blocked' then
    return voucher_row;
  end if;

  update public.rewards_vouchers
  set status = 'blocked',
      blocked_at = now(),
      blocked_by = auth.uid(),
      block_reason = nullif(trim(coalesce(p_reason, '')), ''),
      updated_at = now()
  where id = voucher_row.id
  returning * into voucher_row;

  return voucher_row;
end;
$$;

create or replace function public.unblock_rewards_voucher(
  p_voucher_id uuid
)
returns public.rewards_vouchers
language plpgsql
security definer
set search_path = ''
as $$
declare
  voucher_row public.rewards_vouchers%rowtype;
begin
  if not private.is_dispatcher_or_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select *
  into voucher_row
  from public.rewards_vouchers
  where id = p_voucher_id
  for update;

  if not found then
    raise exception 'Voucher not found' using errcode = 'P0002';
  end if;

  if voucher_row.status <> 'blocked' then
    return voucher_row;
  end if;

  if voucher_row.valid_until < current_date then
    raise exception 'REWARDS_VOUCHER_EXPIRED';
  end if;

  update public.rewards_vouchers
  set status = 'open',
      blocked_at = null,
      blocked_by = null,
      block_reason = null,
      updated_at = now()
  where id = voucher_row.id
  returning * into voucher_row;

  return voucher_row;
end;
$$;

alter table public.rewards_vouchers enable row level security;

revoke all on table public.rewards_vouchers from anon;
revoke all on table public.rewards_vouchers from authenticated;

grant select on table public.rewards_vouchers to authenticated;

create policy rewards_vouchers_admin_dispatcher_select
  on public.rewards_vouchers
  as permissive
  for select
  to authenticated
  using (private.is_dispatcher_or_admin());

create policy rewards_vouchers_admin_dispatcher_update
  on public.rewards_vouchers
  as permissive
  for update
  to authenticated
  using (private.is_dispatcher_or_admin())
  with check (private.is_dispatcher_or_admin());

revoke all on function public.issue_rewards_voucher(uuid, integer, date, text) from public;
revoke all on function public.issue_rewards_voucher(uuid, integer, date, text) from anon;
grant execute on function public.issue_rewards_voucher(uuid, integer, date, text) to authenticated;

revoke all on function public.redeem_rewards_voucher(uuid) from public;
revoke all on function public.redeem_rewards_voucher(uuid) from anon;
grant execute on function public.redeem_rewards_voucher(uuid) to authenticated;

revoke all on function public.block_rewards_voucher(uuid, text) from public;
revoke all on function public.block_rewards_voucher(uuid, text) from anon;
grant execute on function public.block_rewards_voucher(uuid, text) to authenticated;

revoke all on function public.unblock_rewards_voucher(uuid) from public;
revoke all on function public.unblock_rewards_voucher(uuid) from anon;
grant execute on function public.unblock_rewards_voucher(uuid) to authenticated;


-- ###########################################################################
-- ## MIGRATION 007_rewards_wheel
-- ## (unveraendert aus supabase/migrations/007_rewards_wheel.sql)
-- ###########################################################################

create table if not exists public.rewards_spin_transactions (
  id uuid primary key default gen_random_uuid(),
  rewards_account_id uuid not null references public.rewards_accounts(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict,
  amount integer not null check (amount <> 0),
  transaction_type text not null check (transaction_type in ('manual_grant', 'ride_milestone', 'wheel_spin', 'adjustment')),
  reason text,
  note text,
  created_by uuid null,
  created_at timestamptz not null default now()
);

create index if not exists idx_rewards_spin_transactions_account
  on public.rewards_spin_transactions(rewards_account_id, created_at desc);

create index if not exists idx_rewards_spin_transactions_customer
  on public.rewards_spin_transactions(customer_id, created_at desc);

create table if not exists public.rewards_wheel_spins (
  id uuid primary key default gen_random_uuid(),
  rewards_account_id uuid not null references public.rewards_accounts(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict,
  prize_type text not null check (
    prize_type in (
      'points_5',
      'points_10',
      'points_20',
      'points_30',
      'points_50',
      'voucher_20',
      'yumaks_box'
    )
  ),
  points_awarded integer null check (points_awarded is null or points_awarded > 0),
  voucher_id uuid null references public.rewards_vouchers(id) on delete set null,
  yumaks_box_won boolean not null default false,
  fulfillment_status text null check (fulfillment_status is null or fulfillment_status in ('pending', 'fulfilled')),
  fulfilled_at timestamptz null,
  fulfilled_by uuid null,
  spin_source text null default 'earned_ride_spin',
  created_by uuid null,
  created_at timestamptz not null default now(),
  constraint rewards_wheel_spin_prize_check
    check (
      (
        prize_type in ('points_5', 'points_10', 'points_20', 'points_30', 'points_50')
        and points_awarded is not null
        and voucher_id is null
        and yumaks_box_won = false
      )
      or (
        prize_type = 'voucher_20'
        and points_awarded is null
        and voucher_id is not null
        and yumaks_box_won = false
      )
      or (
        prize_type = 'yumaks_box'
        and points_awarded is null
        and voucher_id is null
        and yumaks_box_won = true
      )
    )
);

create index if not exists idx_rewards_wheel_spins_account
  on public.rewards_wheel_spins(rewards_account_id, created_at desc);

create index if not exists idx_rewards_wheel_spins_customer
  on public.rewards_wheel_spins(customer_id, created_at desc);

create index if not exists idx_rewards_wheel_spins_prize_type
  on public.rewards_wheel_spins(prize_type, created_at desc);

alter table public.rewards_spin_transactions enable row level security;
alter table public.rewards_wheel_spins enable row level security;

revoke all on table public.rewards_spin_transactions from anon;
revoke all on table public.rewards_spin_transactions from authenticated;
revoke all on table public.rewards_wheel_spins from anon;
revoke all on table public.rewards_wheel_spins from authenticated;

grant select on table public.rewards_spin_transactions to authenticated;
grant select on table public.rewards_wheel_spins to authenticated;

grant insert, update on table public.rewards_spin_transactions to authenticated;
grant insert, update on table public.rewards_wheel_spins to authenticated;

create policy rewards_spin_transactions_admin_dispatcher_select
  on public.rewards_spin_transactions
  as permissive
  for select
  to authenticated
  using (private.is_dispatcher_or_admin());

create policy rewards_spin_transactions_admin_dispatcher_write
  on public.rewards_spin_transactions
  as permissive
  for insert
  to authenticated
  with check (private.is_dispatcher_or_admin());

create policy rewards_wheel_spins_admin_dispatcher_select
  on public.rewards_wheel_spins
  as permissive
  for select
  to authenticated
  using (private.is_dispatcher_or_admin());

create policy rewards_wheel_spins_admin_dispatcher_write
  on public.rewards_wheel_spins
  as permissive
  for insert
  to authenticated
  with check (private.is_dispatcher_or_admin());

create policy rewards_wheel_spins_admin_dispatcher_update
  on public.rewards_wheel_spins
  as permissive
  for update
  to authenticated
  using (private.is_dispatcher_or_admin())
  with check (private.is_dispatcher_or_admin());

create or replace function public.rewards_wheel_rules()
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'qualifying_rides_per_spin', 5,
    'spins_accumulate', true,
    'point_cost_per_spin', 0,
    'voucher_validity_days', 90,
    'probabilities', jsonb_build_object(
      'points_5', 0.35,
      'points_10', 0.25,
      'points_20', 0.18,
      'points_30', 0.10,
      'points_50', 0.07,
      'voucher_20', 0.04,
      'yumaks_box', 0.01
    )
  );
$$;

revoke all on function public.rewards_wheel_rules() from public;
revoke all on function public.rewards_wheel_rules() from anon;
grant execute on function public.rewards_wheel_rules() to authenticated;

create or replace function public.rewards_account_spin_balance(p_rewards_account_id uuid)
returns integer
language sql
security definer
set search_path = ''
as $$
  select coalesce(sum(amount), 0)::integer
  from public.rewards_spin_transactions
  where rewards_account_id = p_rewards_account_id;
$$;

revoke all on function public.rewards_account_spin_balance(uuid) from public;
revoke all on function public.rewards_account_spin_balance(uuid) from anon;
grant execute on function public.rewards_account_spin_balance(uuid) to authenticated;

create or replace function public.grant_rewards_spin(
  p_rewards_account_id uuid,
  p_amount integer,
  p_reason text,
  p_note text default null
)
returns public.rewards_spin_transactions
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_row public.rewards_accounts%rowtype;
  transaction_row public.rewards_spin_transactions%rowtype;
begin
  if not private.is_dispatcher_or_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Spin amount must be positive' using errcode = '22023';
  end if;

  select *
  into account_row
  from public.rewards_accounts
  where id = p_rewards_account_id
  for update;

  if not found then
    raise exception 'Rewards account not found' using errcode = 'P0002';
  end if;

  if account_row.status = 'paused' then
    raise exception 'REWARDS_ACCOUNT_PAUSED';
  elsif account_row.status = 'blocked' then
    raise exception 'REWARDS_ACCOUNT_BLOCKED';
  end if;

  insert into public.rewards_spin_transactions (
    rewards_account_id,
    customer_id,
    amount,
    transaction_type,
    reason,
    note,
    created_by
  ) values (
    account_row.id,
    account_row.customer_id,
    p_amount,
    'manual_grant',
    nullif(trim(coalesce(p_reason, '')), ''),
    nullif(trim(coalesce(p_note, '')), ''),
    auth.uid()
  )
  returning * into transaction_row;

  return transaction_row;
end;
$$;

revoke all on function public.grant_rewards_spin(uuid, integer, text, text) from public;
revoke all on function public.grant_rewards_spin(uuid, integer, text, text) from anon;
grant execute on function public.grant_rewards_spin(uuid, integer, text, text) to authenticated;

create or replace function public.spin_rewards_wheel(
  p_rewards_account_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_row public.rewards_accounts%rowtype;
  available_spins integer;
  prize_type text;
  points_awarded integer;
  voucher_row public.rewards_vouchers%rowtype;
  spin_row public.rewards_wheel_spins%rowtype;
  spin_id uuid;
  roll double precision;
  actor_name text;
  next_balance integer;
begin
  if not private.is_dispatcher_or_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select *
  into account_row
  from public.rewards_accounts
  where id = p_rewards_account_id
  for update;

  if not found then
    raise exception 'Rewards account not found' using errcode = 'P0002';
  end if;

  if account_row.status = 'paused' then
    raise exception 'REWARDS_ACCOUNT_PAUSED';
  elsif account_row.status = 'blocked' then
    raise exception 'REWARDS_ACCOUNT_BLOCKED';
  end if;

  available_spins := coalesce(
    (select sum(amount)
     from public.rewards_spin_transactions
     where rewards_account_id = account_row.id),
    0
  );

  if available_spins < 1 then
    raise exception 'REWARDS_NO_SPINS_AVAILABLE';
  end if;

  insert into public.rewards_spin_transactions (
    rewards_account_id,
    customer_id,
    amount,
    transaction_type,
    reason,
    created_by
  ) values (
    account_row.id,
    account_row.customer_id,
    -1,
    'wheel_spin',
    'Glücksrad',
    auth.uid()
  );

  roll := random();

  if roll < 0.35 then
    prize_type := 'points_5';
    points_awarded := 5;
  elsif roll < 0.60 then
    prize_type := 'points_10';
    points_awarded := 10;
  elsif roll < 0.78 then
    prize_type := 'points_20';
    points_awarded := 20;
  elsif roll < 0.88 then
    prize_type := 'points_30';
    points_awarded := 30;
  elsif roll < 0.95 then
    prize_type := 'points_50';
    points_awarded := 50;
  elsif roll < 0.99 then
    prize_type := 'voucher_20';
    points_awarded := null;
  else
    prize_type := 'yumaks_box';
    points_awarded := null;
  end if;

  if prize_type like 'points_%' then
    next_balance := account_row.points_balance + points_awarded;

    select coalesce(nullif(trim(profiles.display_name), ''), profiles.role, 'Mitarbeiter')
    into actor_name
    from public.profiles as profiles
    where profiles.auth_user_id = auth.uid()
    limit 1;

    insert into public.rewards_transactions (
      rewards_account_id,
      customer_id,
      transaction_type,
      points,
      points_balance_after,
      reason,
      note,
      created_by,
      created_by_name
    ) values (
      account_row.id,
      account_row.customer_id,
      'wheel_reward',
      points_awarded,
      next_balance,
      'Glücksrad',
      'Glücksrad-Gewinn: ' || points_awarded || ' Punkte',
      auth.uid(),
      coalesce(actor_name, 'Mitarbeiter')
    );

    update public.rewards_accounts
    set points_balance = next_balance,
        updated_at = now()
    where id = account_row.id;
  elsif prize_type = 'voucher_20' then
    select *
    into voucher_row
    from public.issue_rewards_voucher(
      account_row.id,
      2000,
      current_date + 90,
      'Glücksrad-Gewinn'
    );
  end if;

  insert into public.rewards_wheel_spins (
    rewards_account_id,
    customer_id,
    prize_type,
    points_awarded,
    voucher_id,
    yumaks_box_won,
    fulfillment_status,
    spin_source,
    created_by
  ) values (
    account_row.id,
    account_row.customer_id,
    prize_type,
    points_awarded,
    voucher_row.id,
    prize_type = 'yumaks_box',
    case when prize_type = 'yumaks_box' then 'pending' else null end,
    'earned_ride_spin',
    auth.uid()
  )
  returning * into spin_row;

  return jsonb_build_object(
    'spin_id', spin_row.id,
    'prize_type', spin_row.prize_type,
    'points_awarded', spin_row.points_awarded,
    'voucher_id', spin_row.voucher_id,
    'yumaks_box_won', spin_row.yumaks_box_won,
    'fulfillment_status', spin_row.fulfillment_status,
    'message', case
      when spin_row.prize_type = 'points_5' then '5 Punkte gewonnen'
      when spin_row.prize_type = 'points_10' then '10 Punkte gewonnen'
      when spin_row.prize_type = 'points_20' then '20 Punkte gewonnen'
      when spin_row.prize_type = 'points_30' then '30 Punkte gewonnen'
      when spin_row.prize_type = 'points_50' then '50 Punkte gewonnen'
      when spin_row.prize_type = 'voucher_20' then '20,00 € Gutschein gewonnen'
      when spin_row.prize_type = 'yumaks_box' then 'Yumaks Box gewonnen'
      else 'Glücksrad gewonnen'
    end
  );
end;
$$;

revoke all on function public.spin_rewards_wheel(uuid) from public;
revoke all on function public.spin_rewards_wheel(uuid) from anon;
grant execute on function public.spin_rewards_wheel(uuid) to authenticated;

create or replace function public.fulfill_yumaks_box(
  p_spin_id uuid
)
returns public.rewards_wheel_spins
language plpgsql
security definer
set search_path = ''
as $$
declare
  spin_row public.rewards_wheel_spins%rowtype;
begin
  if not private.is_dispatcher_or_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select *
  into spin_row
  from public.rewards_wheel_spins
  where id = p_spin_id
  for update;

  if not found then
    raise exception 'Wheel spin not found' using errcode = 'P0002';
  end if;

  if spin_row.prize_type <> 'yumaks_box' or spin_row.yumaks_box_won = false then
    raise exception 'Spin is not a Yumaks Box prize';
  end if;

  if spin_row.fulfillment_status = 'fulfilled' then
    return spin_row;
  end if;

  update public.rewards_wheel_spins
  set fulfillment_status = 'fulfilled',
      fulfilled_at = now(),
      fulfilled_by = auth.uid()
  where id = p_spin_id
  returning * into spin_row;

  return spin_row;
end;
$$;

revoke all on function public.fulfill_yumaks_box(uuid) from public;
revoke all on function public.fulfill_yumaks_box(uuid) from anon;
grant execute on function public.fulfill_yumaks_box(uuid) to authenticated;

create or replace function public.rewards_wheel_summary(p_day date default current_date)
returns table (
  spins_total bigint,
  points_wins_total bigint,
  vouchers_total bigint,
  yumaks_box_total bigint
)
language sql
security definer
set search_path = ''
as $$
  select
    count(*) filter (where created_at::date = p_day) as spins_total,
    count(*) filter (
      where prize_type in ('points_5', 'points_10', 'points_20', 'points_30', 'points_50')
        and created_at::date = p_day
    ) as points_wins_total,
    count(*) filter (
      where prize_type = 'voucher_20'
        and created_at::date = p_day
    ) as vouchers_total,
    count(*) filter (
      where prize_type = 'yumaks_box'
        and created_at::date = p_day
    ) as yumaks_box_total
  from public.rewards_wheel_spins;
$$;

revoke all on function public.rewards_wheel_summary(date) from public;
revoke all on function public.rewards_wheel_summary(date) from anon;
grant execute on function public.rewards_wheel_summary(date) to authenticated;

create or replace function public.rewards_wheel_active_member_count(p_day date default current_date)
returns bigint
language sql
security definer
set search_path = ''
as $$
  select count(distinct rewards_account_id)
  from public.rewards_wheel_spins
  where created_at::date = p_day;
$$;

revoke all on function public.rewards_wheel_active_member_count(date) from public;
revoke all on function public.rewards_wheel_active_member_count(date) from anon;
grant execute on function public.rewards_wheel_active_member_count(date) to authenticated;

DO $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'rewards_transactions'
      and column_name = 'transaction_type'
  ) then
    if exists (
      select 1
      from pg_constraint
      where conrelid = 'public.rewards_transactions'::regclass
        and conname = 'rewards_transactions_transaction_type_check'
    ) then
      alter table public.rewards_transactions
drop constraint rewards_transactions_transaction_type_check;
    end if;

    alter table public.rewards_transactions
      add constraint rewards_transactions_transaction_type_check
      check (transaction_type in (
        'ride_reward',
        'birthday_bonus',
        'manual_credit',
        'manual_debit',
        'voucher_redemption',
        'adjustment',
        'wheel_reward'
      ));
  end if;
end $$;


-- ###########################################################################
-- ## MIGRATION 008_rewards_yumaks_fulfillment_guard
-- ## (unveraendert aus supabase/migrations/008_rewards_yumaks_fulfillment_guard.sql)
-- ###########################################################################

create or replace function public.fulfill_yumaks_box(
  p_spin_id uuid
)
returns public.rewards_wheel_spins
language plpgsql
security definer
set search_path = ''
as $$
declare
  spin_row public.rewards_wheel_spins%rowtype;
begin
  if not private.is_dispatcher_or_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select *
  into spin_row
  from public.rewards_wheel_spins
  where id = p_spin_id
  for update;

  if not found then
    raise exception 'Wheel spin not found' using errcode = 'P0002';
  end if;

  if spin_row.prize_type <> 'yumaks_box' then
    raise exception 'REWARDS_NOT_YUMAKS_BOX';
  end if;

  if spin_row.fulfillment_status = 'fulfilled' then
    raise exception 'REWARDS_YUMAKS_ALREADY_FULFILLED';
  end if;

  if spin_row.fulfillment_status is null or spin_row.fulfillment_status <> 'pending' then
    raise exception 'REWARDS_YUMAKS_INVALID_STATUS';
  end if;

  update public.rewards_wheel_spins
  set fulfillment_status = 'fulfilled',
      fulfilled_at = now(),
      fulfilled_by = auth.uid()
  where id = p_spin_id
  returning * into spin_row;

  return spin_row;
end;
$$;

revoke all on function public.fulfill_yumaks_box(uuid) from public;
revoke all on function public.fulfill_yumaks_box(uuid) from anon;
grant execute on function public.fulfill_yumaks_box(uuid) to authenticated;


-- ###########################################################################
-- ## MIGRATION 009_customer_auth_rewards_access
-- ## (unveraendert aus supabase/migrations/009_customer_auth_rewards_access.sql)
-- ###########################################################################

create extension if not exists "uuid-ossp";

alter table public.customers
  add column if not exists auth_user_id uuid null;

create unique index if not exists uq_customers_auth_user_id
  on public.customers(auth_user_id)
  where auth_user_id is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'customers_auth_user_id_fk'
  ) then
    alter table public.customers
      add constraint customers_auth_user_id_fk
      foreign key (auth_user_id) references auth.users(id)
      on delete set null;
  end if;
end
$$;

create or replace function public.claim_customer_account()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
  current_email text;
  normalized_email text;
  match_count integer;
  match_row public.customers%rowtype;
begin
  current_user_id := auth.uid();
  if current_user_id is null then
    raise exception 'CUSTOMER_NOT_FOUND';
  end if;

  select u.email
  into current_email
  from auth.users as u
  where u.id = current_user_id
  limit 1;

  if current_email is null or trim(current_email) = '' then
    raise exception 'CUSTOMER_NOT_FOUND';
  end if;

  if not exists (
    select 1
    from auth.users as u
    where u.id = current_user_id
      and u.email_confirmed_at is not null
  ) then
    raise exception 'CUSTOMER_EMAIL_NOT_VERIFIED';
  end if;

  normalized_email := lower(trim(current_email));

  select count(*)
  into match_count
  from public.customers as c
  where lower(trim(c.email)) = normalized_email;

  if match_count = 0 then
    raise exception 'CUSTOMER_NOT_FOUND';
  elsif match_count > 1 then
    raise exception 'CUSTOMER_EMAIL_AMBIGUOUS';
  end if;

  select c.*
  into match_row
  from public.customers as c
  where lower(trim(c.email)) = normalized_email
  limit 1;

  if match_row.auth_user_id is not null and match_row.auth_user_id <> current_user_id then
    raise exception 'CUSTOMER_ALREADY_LINKED';
  end if;

  if exists (
    select 1
    from public.customers as c
    where c.auth_user_id = current_user_id
      and c.id <> match_row.id
  ) then
    raise exception 'AUTH_USER_ALREADY_LINKED';
  end if;

  if match_row.auth_user_id is null then
    update public.customers
    set auth_user_id = current_user_id
    where id = match_row.id;
  end if;

  return jsonb_build_object(
    'linked', true,
    'customer_id', match_row.id
  );
end;
$$;

revoke all on function public.claim_customer_account() from public;
revoke all on function public.claim_customer_account() from anon;
grant execute on function public.claim_customer_account() to authenticated;

create or replace function public.get_my_rewards_overview()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
  customer_row public.customers%rowtype;
  account_row public.rewards_accounts%rowtype;
  overview jsonb;
begin
  current_user_id := auth.uid();
  if current_user_id is null then
    raise exception 'CUSTOMER_ACCOUNT_NOT_LINKED';
  end if;

  select c.*
  into customer_row
  from public.customers as c
  where c.auth_user_id = current_user_id
  limit 1;

  if not found then
    raise exception 'CUSTOMER_ACCOUNT_NOT_LINKED';
  end if;

  select a.*
  into account_row
  from public.rewards_accounts as a
  where a.customer_id = customer_row.id
  limit 1;

  if not found then
    raise exception 'CUSTOMER_ACCOUNT_NOT_LINKED';
  end if;

  overview := jsonb_build_object(
    'customer_id', customer_row.id,
    'customer_name', coalesce(trim(customer_row.name), 'Kunde'),
    'rewards_account_id', account_row.id,
    'status', account_row.status,
    'points_balance', account_row.points_balance,
    'level', account_row.level,
    'qualifying_rides', account_row.qualifying_rides,
    'available_spins', coalesce((
      select sum(st.amount)
      from public.rewards_spin_transactions as st
      where st.rewards_account_id = account_row.id
    ), 0)::integer,
    'spins_earned', coalesce((
      select sum(st.amount)
      from public.rewards_spin_transactions as st
      where st.rewards_account_id = account_row.id
        and st.amount > 0
    ), 0)::integer,
    'spins_used', coalesce((
      select abs(sum(st.amount))
      from public.rewards_spin_transactions as st
      where st.rewards_account_id = account_row.id
        and st.amount < 0
    ), 0)::integer
  );

  return overview;
end;
$$;

revoke all on function public.get_my_rewards_overview() from public;
revoke all on function public.get_my_rewards_overview() from anon;
grant execute on function public.get_my_rewards_overview() to authenticated;

create or replace function public.spin_my_rewards_wheel()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
  customer_row public.customers%rowtype;
  account_row public.rewards_accounts%rowtype;
begin
  current_user_id := auth.uid();
  if current_user_id is null then
    raise exception 'CUSTOMER_ACCOUNT_NOT_LINKED';
  end if;

  select c.*
  into customer_row
  from public.customers as c
  where c.auth_user_id = current_user_id
  limit 1;

  if not found then
    raise exception 'CUSTOMER_ACCOUNT_NOT_LINKED';
  end if;

  select a.*
  into account_row
  from public.rewards_accounts as a
  where a.customer_id = customer_row.id
  limit 1;

  if not found then
    raise exception 'CUSTOMER_ACCOUNT_NOT_LINKED';
  end if;

  if account_row.status = 'paused' then
    raise exception 'REWARDS_ACCOUNT_PAUSED';
  elsif account_row.status = 'blocked' then
    raise exception 'REWARDS_ACCOUNT_BLOCKED';
  end if;

  if not exists (
    select 1
    from public.rewards_spin_transactions as st
    where st.rewards_account_id = account_row.id
      and st.amount > 0
  ) then
    raise exception 'REWARDS_NO_SPINS_AVAILABLE';
  end if;

  raise exception 'CUSTOMER_WHEEL_BLOCKED_BY_BACKEND';
end;
$$;

revoke all on function public.spin_my_rewards_wheel() from public;
revoke all on function public.spin_my_rewards_wheel() from anon;
grant execute on function public.spin_my_rewards_wheel() to authenticated;

alter table public.customers enable row level security;

revoke all on table public.customers from anon;
revoke all on table public.customers from authenticated;
grant select on table public.customers to authenticated;

drop policy if exists customers_customer_self_select on public.customers;
create policy customers_customer_self_select
  on public.customers
  as permissive
  for select
  to authenticated
  using (auth_user_id = auth.uid());

create policy rewards_accounts_customer_self_select
  on public.rewards_accounts
  as permissive
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.customers as c
      where c.id = rewards_accounts.customer_id
        and c.auth_user_id = auth.uid()
    )
  );

create policy rewards_transactions_customer_self_select
  on public.rewards_transactions
  as permissive
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.rewards_accounts as ra
      join public.customers as c on c.id = ra.customer_id
      where ra.id = rewards_transactions.rewards_account_id
        and c.auth_user_id = auth.uid()
    )
  );

create policy rewards_vouchers_customer_self_select
  on public.rewards_vouchers
  as permissive
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.rewards_accounts as ra
      join public.customers as c on c.id = ra.customer_id
      where ra.id = rewards_vouchers.rewards_account_id
        and c.auth_user_id = auth.uid()
    )
  );

create policy rewards_spin_transactions_customer_self_select
  on public.rewards_spin_transactions
  as permissive
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.rewards_accounts as ra
      join public.customers as c on c.id = ra.customer_id
      where ra.id = rewards_spin_transactions.rewards_account_id
        and c.auth_user_id = auth.uid()
    )
  );

create policy rewards_wheel_spins_customer_self_select
  on public.rewards_wheel_spins
  as permissive
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.rewards_accounts as ra
      join public.customers as c on c.id = ra.customer_id
      where ra.id = rewards_wheel_spins.rewards_account_id
        and c.auth_user_id = auth.uid()
    )
  );

grant select on table public.rewards_accounts to authenticated;
grant select on table public.rewards_transactions to authenticated;
grant select on table public.rewards_vouchers to authenticated;
grant select on table public.rewards_spin_transactions to authenticated;
grant select on table public.rewards_wheel_spins to authenticated;


-- ###########################################################################
-- ## MIGRATION 010_rewards_read_function_guards
-- ## (unveraendert aus supabase/migrations/010_rewards_read_function_guards.sql)
-- ###########################################################################

-- 010_rewards_read_function_guards.sql
--
-- Zweck
--   Drei lesende Rewards-Funktionen aus 007_rewards_wheel.sql sind SECURITY DEFINER
--   und fuer jede authenticated-Rolle ausfuehrbar, prueften bisher aber weder
--   Eigentuemerschaft noch Rolle. Diese Migration ergaenzt ausschliesslich die
--   Autorisierungspruefung.
--
-- Regeln laut Vorgabe
--   public.rewards_account_spin_balance(uuid)
--     -> eigenes Kundenkonto ODER aktiver Admin/Disponent
--   public.rewards_wheel_summary(date)
--     -> ausschliesslich aktiver Admin/Disponent
--   public.rewards_wheel_active_member_count(date)
--     -> ausschliesslich aktiver Admin/Disponent
--
-- Ausdruecklich NICHT Gegenstand dieser Migration
--   - Keine Aenderung an Signaturen, Rueckgabetypen oder Parameter-Defaults.
--   - Keine Aenderung der fachlichen Rechenlogik (identische SELECTs wie in 007).
--   - Keine Aenderung an Rewards-Spielregeln.
--   - Keine Freischaltung des Kunden-Gluecksrads; spin_my_rewards_wheel() bleibt
--     unveraendert und endet weiterhin mit CUSTOMER_WHEEL_BLOCKED_BY_BACKEND.
--   - Keine bestehende Migration wird umgeschrieben.
--   - Keine Policy-, Tabellen- oder Grant-Aenderung ausser den unten wiederholten,
--     bereits in 007 gesetzten revoke/grant-Anweisungen (idempotent).
--
-- Hinweis zu den Grants
--   Die Rollen "Admin" und "Disponent" sind keine Datenbankrollen, sondern stehen
--   in public.profiles.role. Der Datenbank-GRANT muss deshalb weiterhin auf
--   "authenticated" lauten; die eigentliche Rechtepruefung erfolgt in der Funktion.
--
-- Fehlerbild
--   Verstoesse melden SQLSTATE 42501 (insufficient_privilege) mit dem Text
--   'Not authorized' - identisch zum bereits etablierten Muster aus
--   003/004/005/006/007/008.

-- ---------------------------------------------------------------------------
-- 1) Spin-Guthaben eines Rewards-Kontos
--    Signatur unveraendert: (p_rewards_account_id uuid) returns integer
-- ---------------------------------------------------------------------------
create or replace function public.rewards_account_spin_balance(p_rewards_account_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_owner boolean;
begin
  if p_rewards_account_id is null then
    raise exception 'Rewards account id is required' using errcode = '22023';
  end if;

  -- Eigentuemerpruefung: gehoert das Konto dem aufrufenden Kunden?
  -- Ausdruck bewusst identisch zur Policy rewards_accounts_customer_self_select (009).
  select exists (
    select 1
    from public.rewards_accounts as ra
    join public.customers as c
      on c.id = ra.customer_id
    where ra.id = p_rewards_account_id
      and c.auth_user_id = auth.uid()
  )
  into v_is_owner;

  if not v_is_owner and not private.is_dispatcher_or_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  -- Rechenlogik unveraendert gegenueber 007_rewards_wheel.sql
  return (
    select coalesce(sum(st.amount), 0)::integer
    from public.rewards_spin_transactions as st
    where st.rewards_account_id = p_rewards_account_id
  );
end;
$$;

comment on function public.rewards_account_spin_balance(uuid) is
  'Spin-Guthaben eines Rewards-Kontos. Zugriff: eigenes Kundenkonto oder aktiver Admin/Disponent (010).';

revoke all on function public.rewards_account_spin_balance(uuid) from public;
revoke all on function public.rewards_account_spin_balance(uuid) from anon;
grant execute on function public.rewards_account_spin_balance(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 2) Betriebsweite Gluecksrad-Tagesstatistik
--    Signatur unveraendert: (p_day date default current_date)
--    returns table (spins_total, points_wins_total, vouchers_total, yumaks_box_total)
-- ---------------------------------------------------------------------------
create or replace function public.rewards_wheel_summary(p_day date default current_date)
returns table (
  spins_total bigint,
  points_wins_total bigint,
  vouchers_total bigint,
  yumaks_box_total bigint
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_dispatcher_or_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  -- Rechenlogik unveraendert gegenueber 007_rewards_wheel.sql
  return query
  select
    count(*) filter (where ws.created_at::date = p_day) as spins_total,
    count(*) filter (
      where ws.prize_type in ('points_5', 'points_10', 'points_20', 'points_30', 'points_50')
        and ws.created_at::date = p_day
    ) as points_wins_total,
    count(*) filter (
      where ws.prize_type = 'voucher_20'
        and ws.created_at::date = p_day
    ) as vouchers_total,
    count(*) filter (
      where ws.prize_type = 'yumaks_box'
        and ws.created_at::date = p_day
    ) as yumaks_box_total
  from public.rewards_wheel_spins as ws;
end;
$$;

comment on function public.rewards_wheel_summary(date) is
  'Betriebsweite Gluecksrad-Tagesstatistik. Zugriff: ausschliesslich aktiver Admin/Disponent (010).';

revoke all on function public.rewards_wheel_summary(date) from public;
revoke all on function public.rewards_wheel_summary(date) from anon;
grant execute on function public.rewards_wheel_summary(date) to authenticated;

-- ---------------------------------------------------------------------------
-- 3) Anzahl aktiver Gluecksrad-Teilnehmer eines Tages
--    Signatur unveraendert: (p_day date default current_date) returns bigint
-- ---------------------------------------------------------------------------
create or replace function public.rewards_wheel_active_member_count(p_day date default current_date)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_dispatcher_or_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  -- Rechenlogik unveraendert gegenueber 007_rewards_wheel.sql
  return (
    select count(distinct ws.rewards_account_id)
    from public.rewards_wheel_spins as ws
    where ws.created_at::date = p_day
  );
end;
$$;

comment on function public.rewards_wheel_active_member_count(date) is
  'Anzahl aktiver Gluecksrad-Teilnehmer eines Tages. Zugriff: ausschliesslich aktiver Admin/Disponent (010).';

revoke all on function public.rewards_wheel_active_member_count(date) from public;
revoke all on function public.rewards_wheel_active_member_count(date) from anon;
grant execute on function public.rewards_wheel_active_member_count(date) to authenticated;


-- ###########################################################################
-- ## MIGRATION 011_employee_documents_storage - ANGEPASSTE FASSUNG
-- ##
-- ## Abschnitte 2, 3, 6, 7, 8 und 10 sind wortgleich aus
-- ## supabase/migrations/011_employee_documents_storage.sql uebernommen.
-- ## Abschnitte 1 und 4 sind inhaltsgleich, aber bedingt ausgefuehrt.
-- ## Abschnitt 5 (Trigger auf storage.objects) ENTFAELLT - siehe dort.
-- ###########################################################################


-- ===========================================================================
-- 1) Privater Bucket - bedingt
-- ===========================================================================
-- Die Migration 011 verwendet hier "insert ... on conflict (id) do update".
-- Das verlangt das UPDATE-Recht auf storage.buckets bereits beim Planen, auch
-- wenn gar kein Konflikt auftritt - und genau daran scheitert es in einem
-- eingeschraenkten Projekt mit der Meldung "permission denied for table
-- buckets". Deshalb hier getrennte Wege: anlegen, wenn es den Bucket noch
-- nicht gibt; nachziehen nur, wenn etwas abweicht UND das Recht da ist.
-- Inhaltlich ist das Ergebnis dasselbe.
do $tg_bucket$
declare
  v_b        record;
  v_darf_neu boolean := (select moeglich from tg_faehigkeit where schluessel = 'bucket_anlegen');
  v_darf_upd boolean := (select moeglich from tg_faehigkeit where schluessel = 'bucket_aendern');
  v_soll_typ text[]  := array['application/pdf', 'image/jpeg', 'image/png'];
begin
  select * into v_b from storage.buckets where id = 'employee-documents';

  if v_b.id is null then
    -- Das blosse INSERT-Recht genuegt als Aussage NICHT: auf storage.buckets
    -- ist RLS aktiv, und eine fehlende Policy laesst das INSERT trotz Recht
    -- scheitern ("new row violates row-level security policy"). Deshalb wird
    -- es hier versucht statt vorhergesagt. Beide Faelle melden 42501.
    if not v_darf_neu then
      raise notice 'UEBERSPRUNGEN: Bucket employee-documents. Kein INSERT-Recht auf storage.buckets. Bitte im Dashboard unter Storage anlegen: Name employee-documents, privat, Groessenlimit 10485760 Byte, erlaubte Typen application/pdf, image/jpeg, image/png.';
      return;
    end if;

    begin
      insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      values (
        'employee-documents',
        'employee-documents',
        false,                                            -- niemals oeffentlich
        10485760,                                         -- 10 MB
        v_soll_typ
      );
      raise notice 'OK: Bucket employee-documents angelegt (privat, 10 MB, PDF/JPEG/PNG).';
    exception
      when insufficient_privilege then
        raise notice 'UEBERSPRUNGEN: Bucket employee-documents liess sich per SQL nicht anlegen (Rechte oder RLS auf storage.buckets). Das ist der Normalfall bei Supabase. Bitte im Dashboard unter Storage anlegen: Name employee-documents, privat, Groessenlimit 10485760 Byte, erlaubte Typen application/pdf, image/jpeg, image/png.';
    end;
    return;
  end if;

  if v_b.public = false
     and v_b.file_size_limit = 10485760
     and v_b.allowed_mime_types @> v_soll_typ
     and v_soll_typ @> v_b.allowed_mime_types then
    raise notice 'OK: Bucket employee-documents vorhanden und korrekt eingestellt.';
    return;
  end if;

  if not v_darf_upd then
    raise notice 'ACHTUNG: Bucket employee-documents weicht ab (public=%, limit=%, typen=%) und kann ohne UPDATE-Recht auf storage.buckets nicht korrigiert werden. Bitte im Dashboard einstellen: privat, 10485760 Byte, application/pdf + image/jpeg + image/png.',
      v_b.public, v_b.file_size_limit, array_to_string(v_b.allowed_mime_types, ', ');
    return;
  end if;

  begin
    update storage.buckets
    set public             = false,
        file_size_limit    = 10485760,
        allowed_mime_types = v_soll_typ
    where id = 'employee-documents';
    raise notice 'OK: Bucket employee-documents auf die Sollwerte nachgezogen.';
  exception
    when insufficient_privilege then
      raise notice 'ACHTUNG: Bucket employee-documents weicht ab und liess sich per SQL nicht korrigieren (Rechte oder RLS auf storage.buckets). Bitte im Dashboard einstellen: privat, 10485760 Byte, application/pdf + image/jpeg + image/png.';
  end;
end
$tg_bucket$;


-- ===========================================================================
-- 2) Dokumenttypen (wiederholbar, key ist unique)
-- ===========================================================================
insert into public.document_types (key, label)
values
  ('fuehrerschein',                'Führerschein'),
  ('personenbefoerderungsschein',  'Personenbeförderungsschein'),
  ('krankenschein_au',             'Krankenschein / AU'),
  ('sonstiges',                    'Sonstiges')
on conflict (key) do update
  set label = excluded.label;


-- ===========================================================================
-- 3) Serverseitige Berechtigungspruefung
-- ===========================================================================
-- Eine bloße Anmeldung genuegt NICHT. Verlangt wird eine vertrauenswuerdige
-- Zuordnung: ein aktives Profil, das auf einen aktiven, fuer das Portal
-- freigeschalteten Mitarbeiter zeigt. Damit sind Kunden, Disponenten ohne
-- Mitarbeiterzuordnung und deaktivierte Mitarbeiter ausgeschlossen.
create or replace function private.is_active_employee()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as p
    join public.employees as e on e.id = p.employee_id
    where p.auth_user_id = (select auth.uid())
      and p.active = true
      and e.active = true
      and e.portal_active = true
  );
$$;

revoke all on function private.is_active_employee() from public;
revoke all on function private.is_active_employee() from anon;
grant execute on function private.is_active_employee() to authenticated;

-- Ist eine Datei noch mit keinem Datensatz verknuepft?
-- SECURITY DEFINER, damit die Pruefung nicht durch die RLS des Aufrufers
-- eingeschraenkt wird - sonst wuerde eine fremde Verknuepfung uebersehen.
create or replace function private.is_unlinked_document(p_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_path is not null
     and not exists (select 1 from public.document_submissions where file_path = p_path)
     and not exists (select 1 from public.employee_documents  where file_path = p_path);
$$;

revoke all on function private.is_unlinked_document(text) from public;
revoke all on function private.is_unlinked_document(text) from anon;
grant execute on function private.is_unlinked_document(text) to authenticated;


-- ===========================================================================
-- 4) Rechte und Policies auf storage.objects - bedingt
-- ===========================================================================
-- Inhaltlich identisch zu Abschnitt 4 der Migration 011. Ausgefuehrt wird
-- jeweils nur, was die Vorpruefung tatsaechlich erlaubt hat.
--
-- Wird der Policy-Teil uebersprungen, bleibt der Bucht vollstaendig
-- verschlossen: RLS ist auf storage.objects standardmaessig aktiv, und ohne
-- passende Policy trifft niemand zu. Der Fehlerfall ist also die sichere
-- Richtung. Die Policies sind dann im Dashboard nachzutragen; die genauen
-- Ausdruecke stehen in supabase/setup/storage-policies-dashboard.md.
do $tg_storage_grants$
begin
  if not (select moeglich from tg_faehigkeit where schluessel = 'storage_grant') then
    raise notice 'UEBERSPRUNGEN: GRANT/REVOKE auf storage.objects (setzt Eigentuemerschaft voraus). Es gelten die Standardrechte von Supabase; der Zugriff wird dann ausschliesslich ueber RLS geregelt.';
    return;
  end if;

  -- DELETE ist noetig, weil das Entfernen einer Datei ueber die Storage-API
  -- laufen MUSS (nur sie loescht auch das Objekt im Speicher, nicht bloss den
  -- Katalogeintrag). Die Storage-API prueft dabei die RLS auf storage.objects.
  execute 'grant select, insert, delete on storage.objects to authenticated';
  execute 'revoke update on storage.objects from authenticated';
  execute 'revoke all on storage.objects from anon';
  raise notice 'OK: Rechte auf storage.objects gesetzt.';
end
$tg_storage_grants$;

do $tg_storage_policies$
begin
  if not (select moeglich from tg_faehigkeit where schluessel = 'storage_policy') then
    raise notice 'UEBERSPRUNGEN: Storage-Policies. Bucket bleibt damit vollstaendig gesperrt (RLS aktiv, keine Policy trifft zu). Bitte die vier Policies im Dashboard anlegen - Wortlaut in supabase/setup/storage-policies-dashboard.md.';
    return;
  end if;

  execute 'drop policy if exists employee_documents_insert_own       on storage.objects';
  execute 'drop policy if exists employee_documents_select_own       on storage.objects';
  execute 'drop policy if exists employee_documents_select_admin     on storage.objects';
  execute 'drop policy if exists employee_documents_delete_own       on storage.objects';
  execute 'drop policy if exists employee_documents_delete_unlinked  on storage.objects';

  -- Hochladen: eigener Ordner UND aktive Mitarbeiterberechtigung.
  execute $pol$
    create policy employee_documents_insert_own
      on storage.objects
      as permissive
      for insert
      to authenticated
      with check (
        bucket_id = 'employee-documents'
        and (storage.foldername(name))[1] = (select auth.uid())::text
        and private.is_active_employee()
      )
  $pol$;

  -- Lesen: eigene Dateien, ebenfalls nur mit aktiver Mitarbeiterberechtigung.
  execute $pol$
    create policy employee_documents_select_own
      on storage.objects
      as permissive
      for select
      to authenticated
      using (
        bucket_id = 'employee-documents'
        and (storage.foldername(name))[1] = (select auth.uid())::text
        and private.is_active_employee()
      )
  $pol$;

  -- Lesen: aktive Admins duerfen alle Nachweise im Bucket ansehen.
  execute $pol$
    create policy employee_documents_select_admin
      on storage.objects
      as permissive
      for select
      to authenticated
      using (
        bucket_id = 'employee-documents'
        and private.is_admin()
      )
  $pol$;

  -- Loeschen: eigener Ordner, aktive Mitarbeiterberechtigung UND die Datei
  -- darf von keinem Datensatz referenziert sein. In dieser Fassung ist das
  -- die EINZIGE Pruefung auf der Loeschseite - siehe Abschnitt 5.
  execute $pol$
    create policy employee_documents_delete_unlinked
      on storage.objects
      as permissive
      for delete
      to authenticated
      using (
        bucket_id = 'employee-documents'
        and (storage.foldername(name))[1] = (select auth.uid())::text
        and private.is_active_employee()
        and private.is_unlinked_document(name)
      )
  $pol$;

  -- Bewusst KEINE UPDATE-Policy: Dateien werden nicht ueberschrieben.

  raise notice 'OK: Vier Storage-Policies angelegt.';
end
$tg_storage_policies$;


-- ===========================================================================
-- 5) ENTFAELLT: Trigger auf storage.objects
-- ===========================================================================
-- Die Vollfassung legt hier private.guard_document_object_delete() als
-- BEFORE-DELETE-Trigger auf storage.objects an. In dieser Fassung nicht.
--
-- WARUM NICHT
--   Supabase empfiehlt ausdruecklich, das Schema storage als schreibgeschuetzt
--   zu behandeln, und hat die zulaessigen SQL-Eingriffe zum 21.04.2025
--   eingeschraenkt. Ob das TRIGGER-Recht auf storage.objects im jeweiligen
--   Projekt vorhanden ist, ist nicht zugesichert. Ein Trigger, der bei einem
--   Plattform-Update verschwindet oder das Anlegen des gesamten Skripts
--   verhindert, ist als Sicherheitsanker ungeeignet.
--
-- WAS DADURCH WEGFAELLT
--   Der Trigger war die zweite, verbindliche Pruefung beim Loeschen. Er
--   schloss genau EINEN Fall: Verknuepfen und Bereinigen laufen im selben
--   Augenblick auf denselben Pfad, und zwar in der Reihenfolge
--   "Verknuepfen zuerst, Loeschen faellt hinein". Ohne Trigger entscheidet
--   dort allein die DELETE-Policy, die ihre Pruefung auf dem Schnappschuss
--   des Loeschbefehls ausfuehrt und eine gerade erst festgeschriebene
--   Verknuepfung deshalb uebersehen kann.
--
-- WAS BLEIBT
--   1. Die DELETE-Policy verhindert das Loeschen verknuepfter Nachweise in
--      allen nicht gleichzeitigen Faellen - das ist der Normalbetrieb.
--   2. Die Sperren auf der Verknuepfungsseite (Abschnitt 6) bleiben
--      vollstaendig. Sie liegen auf unseren eigenen Tabellen und sind
--      uneingeschraenkt zulaessig. Sie decken die GEFAEHRLICHE Richtung ab:
--      Gewinnt das Loeschen das Rennen, scheitert das Verknuepfen mit
--      DOCUMENT_FILE_NOT_FOUND. Es entsteht also keine Verknuepfung, die auf
--      eine verschwundene Datei zeigt.
--   3. Der verbleibende Restfall ist die umgekehrte Richtung: Die
--      Verknuepfung besteht, die Datei wurde im selben Augenblick entfernt.
--      Folge ist ein ins Leere zeigender Verweis - ein kaputter Download im
--      Adminbereich, KEIN Datenabfluss und kein Fremdzugriff.
--   4. Gegen genau diesen Restfall gibt es unten eine Pruefabfrage, mit der
--      solche Verweise gefunden werden koennen.
--
-- WIE WAHRSCHEINLICH IST DER RESTFALL
--   Er verlangt, dass derselbe Mitarbeiter denselben, gerade erst
--   hochgeladenen Pfad in zwei Sitzungen im selben Sekundenbruchteil
--   gleichzeitig verknuepft und bereinigt. Die Bereinigung im Portal laeuft
--   ausschliesslich auf dem Fehlerpfad unmittelbar nach einem
--   fehlgeschlagenen Speichern, auf einem Pfad, den sonst niemand kennt.
--
-- UNGEPRUEFT
--   Der lokale Nebenlaeufigkeitstest (supabase/tests/local/13_concurrency_*)
--   wurde MIT Trigger bestanden. Fuer diese Fassung ohne Trigger ist er noch
--   nicht wiederholt worden. Das Verhalten von Fall B ist damit hier nicht
--   nachgewiesen, sondern nur hergeleitet.
--
-- SAUBERE LANGFRISTIGE LOESUNG
--   Eine bewachte Loeschung gehoert serverseitig in eine Edge Function mit
--   Service-Rolle: dort erst die Verknuepfung pruefen, dann ueber die
--   Storage-API loeschen. Das ist der von Supabase vorgesehene Weg und haelt
--   den privilegierten Schluessel aus dem Browser heraus. Nicht Gegenstand
--   dieses Skripts.


-- ===========================================================================
-- 6) Bei JEDEM Verknuepfen dieselbe Zeile sperren
-- ===========================================================================
-- Wortgleich aus Migration 011. Deckt alle Schreibwege ab, ueber die ein
-- Dateipfad verknuepft werden kann:
--   - INSERT auf document_submissions
--   - UPDATE von document_submissions.file_path
--   - INSERT auf employee_documents
--   - UPDATE von employee_documents.file_path
-- Greift nur fuer Pfade im Nachweis-Bucket; andere Pfade bleiben unberuehrt.
create or replace function private.lock_document_object()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_exists boolean;
begin
  if new.file_path is null then
    return new;
  end if;

  -- Beim UPDATE nur pruefen, wenn sich der Pfad tatsaechlich aendert.
  if tg_op = 'UPDATE' and new.file_path is not distinct from old.file_path then
    return new;
  end if;

  -- Pfade ausserhalb des Nachweis-Buckets werden nicht eingeschraenkt.
  if not exists (
    select 1 from storage.objects as o
    where o.bucket_id = 'employee-documents' and o.name = new.file_path
  ) and split_part(new.file_path, '/', 1) !~ '^[0-9a-f-]{36}$' then
    return new;
  end if;

  select true
  into v_exists
  from storage.objects as o
  where o.bucket_id = 'employee-documents'
    and o.name = new.file_path
  for update;

  if v_exists is not true then
    raise exception 'DOCUMENT_FILE_NOT_FOUND' using errcode = '23503';
  end if;

  return new;
end;
$$;

revoke all on function private.lock_document_object() from public;
revoke all on function private.lock_document_object() from anon;
revoke all on function private.lock_document_object() from authenticated;

drop trigger if exists document_submissions_lock_object on public.document_submissions;
create trigger document_submissions_lock_object
  before insert or update of file_path on public.document_submissions
  for each row
  execute function private.lock_document_object();

drop trigger if exists employee_documents_lock_object on public.employee_documents;
create trigger employee_documents_lock_object
  before insert or update of file_path on public.employee_documents
  for each row
  execute function private.lock_document_object();


-- ===========================================================================
-- 6a) Ersatz fuer den entfallenen Storage-Trigger: Pruefung auf tote Verweise
-- ===========================================================================
-- Findet Verknuepfungen, deren Datei nicht mehr existiert - also genau den
-- Restfall aus Abschnitt 5. Rein lesend, aendert nichts.
--
-- SECURITY INVOKER mit Absicht: Die Funktion laeuft mit den Rechten der
-- aufrufenden Person. Ein Admin sieht ueber employee_documents_select_admin
-- alle Objekte im Bucket. Solange diese Policy fehlt (siehe Abschnitt 4),
-- sieht die Funktion KEINE Objekte und meldet dann faelschlich jeden Verweis
-- als tot. In dem Fall ist zuerst die Policy nachzutragen.
create or replace function public.check_document_link_integrity()
returns table (
  quelle       text,
  datensatz_id uuid,
  employee_id  uuid,
  file_path    text
)
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  return query
  select 'document_submissions'::text, ds.id, ds.employee_id, ds.file_path
  from public.document_submissions as ds
  where ds.file_path is not null
    and not exists (
      select 1 from storage.objects as o
      where o.bucket_id = 'employee-documents' and o.name = ds.file_path
    )
  union all
  select 'employee_documents'::text, ed.id, ed.employee_id, ed.file_path
  from public.employee_documents as ed
  where ed.file_path is not null
    and not exists (
      select 1 from storage.objects as o
      where o.bucket_id = 'employee-documents' and o.name = ed.file_path
    );
end;
$$;

comment on function public.check_document_link_integrity() is
  'Listet Nachweisverweise ohne zugehoerige Datei. Ersetzt die Kontrollfunktion des entfallenen Storage-Triggers. Nur fuer aktive Admins, rein lesend.';

revoke all on function public.check_document_link_integrity() from public;
revoke all on function public.check_document_link_integrity() from anon;
grant execute on function public.check_document_link_integrity() to authenticated;


-- ===========================================================================
-- 7) Dateipfad serverseitig an den angemeldeten Nutzer binden
-- ===========================================================================
-- Wortgleich aus Migration 011.
drop policy if exists document_submissions_employee_insert on public.document_submissions;
create policy document_submissions_employee_insert
  on public.document_submissions
  as permissive
  for insert
  to authenticated
  with check (
    employee_id = private.current_user_employee_id()
    and status = 'submitted'
    and reviewed_at is null
    and reviewed_by is null
    and private.is_active_employee()
    and (
      file_path is null
      or split_part(file_path, '/', 1) = (select auth.uid())::text
    )
  );


-- ===========================================================================
-- 8) Vorgangsschluessel und Schutz vor doppelten Krankmeldungen
-- ===========================================================================
-- Wortgleich aus Migration 011.
alter table public.sickness_reports
  add column if not exists client_request_id uuid;

comment on column public.sickness_reports.client_request_id is
  'Technischer Vorgangsschluessel des Sendevorgangs. Bleibt ueber Wiederholungen gleich und verhindert Doppel nach verlorener Antwort (011).';

create unique index if not exists uq_sickness_reports_client_request
  on public.sickness_reports(employee_id, client_request_id)
  where client_request_id is not null;

drop policy if exists sickness_reports_employee_insert on public.sickness_reports;
create policy sickness_reports_employee_insert
  on public.sickness_reports
  as permissive
  for insert
  to authenticated
  with check (
    employee_id = private.current_user_employee_id()
    and status = 'submitted'
    and private.is_active_employee()
    and client_request_id is not null
    and (
      document_submission_id is null
      or exists (
        select 1
        from public.document_submissions as ds
        where ds.id = document_submission_id
          and ds.employee_id = private.current_user_employee_id()
      )
    )
  );


-- ===========================================================================
-- 10) Index fuer den Dokumenteingang im Adminbereich
-- ===========================================================================
create index if not exists idx_document_submissions_submitted_at
  on public.document_submissions(submitted_at desc);


-- ###########################################################################
-- ## TEIL Z - Kontrolle
-- ###########################################################################
-- Der Datenbankteil MUSS vollstaendig sein, sonst Abbruch.
-- Die Storage-Teile werden ausgewiesen, fuehren aber nicht zum Abbruch:
-- Fehlen sie, ist der Bucket gesperrt, nicht offen.

do $tg_check$
declare
  v_tabellen   integer;
  v_ohne_rls   text;
  v_ohne_grant text;
  v_anon       text;
  v_policies   integer;
  v_storage_p  integer;
  v_trigger    integer;
  v_typen      integer;
  v_bucket     record;
  v_offen      text := '';
begin
  select count(*) into v_tabellen
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r';

  select string_agg(c.relname, ', ')
  into v_ohne_rls
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity = false;

  -- Bei ausgeschalteter automatischer Tabellenfreigabe muss jede Tabelle
  -- einen ausdruecklichen Grant haben, sonst ist sie fuer die App unsichtbar.
  select string_agg(c.relname, ', ')
  into v_ohne_grant
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
    and not has_table_privilege('authenticated', c.oid, 'SELECT');

  -- anon darf auf KEINER Tabelle im Schema public Rechte haben.
  select string_agg(c.relname, ', ')
  into v_anon
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
    and has_table_privilege('anon', c.oid, 'SELECT');

  select count(*) into v_policies from pg_policies where schemaname = 'public';
  select count(*) into v_typen    from public.document_types;

  select count(*) into v_storage_p
  from pg_policies
  where schemaname = 'storage' and tablename = 'objects'
    and policyname like 'employee_documents%';

  select count(*) into v_trigger
  from pg_trigger t join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  where not t.tgisinternal
    and n.nspname = 'public'
    and c.relname in ('document_submissions','employee_documents')
    and t.tgname like '%lock_object';

  select * into v_bucket from storage.buckets where id = 'employee-documents';

  raise notice '--------------------------------------------------------';
  raise notice 'Tabellen in public:            %', v_tabellen;
  raise notice 'Ohne RLS:                      %', coalesce(v_ohne_rls, 'keine - gut');
  raise notice 'Ohne Grant fuer authenticated: %', coalesce(v_ohne_grant, 'keine - gut');
  raise notice 'Mit Rechten fuer anon:         %', coalesce(v_anon, 'keine - gut');
  raise notice 'Policies in public:            %', v_policies;
  raise notice 'Dokumenttypen:                 %', v_typen;
  raise notice 'Sperr-Trigger (eigene Tab.):   % (erwartet 2)', v_trigger;
  raise notice 'Storage-Policies (eigene):     % (erwartet 4)', v_storage_p;
  raise notice 'Bucket employee-documents:     %',
    case when v_bucket.id is null then 'FEHLT'
         else format('public=%s limit=%s typen=%s', v_bucket.public, v_bucket.file_size_limit,
                     array_to_string(v_bucket.allowed_mime_types, ', ')) end;
  raise notice '--------------------------------------------------------';

  -- Harte Bedingungen: der Datenbankteil muss stimmen.
  if v_ohne_rls is not null then
    raise exception 'ABBRUCH: Tabellen ohne RLS: %', v_ohne_rls;
  end if;
  if v_ohne_grant is not null then
    raise exception 'ABBRUCH: Tabellen ohne Grant fuer authenticated: %', v_ohne_grant;
  end if;
  if v_anon is not null then
    raise exception 'ABBRUCH: anon hat Rechte auf: %', v_anon;
  end if;
  if v_typen <> 4 then
    raise exception 'ABBRUCH: % Dokumenttypen statt 4.', v_typen;
  end if;
  if v_trigger <> 2 then
    raise exception 'ABBRUCH: % Sperr-Trigger statt 2. Diese liegen im eigenen Schema und muessen anlegbar sein.', v_trigger;
  end if;

  -- Weiche Bedingungen: Storage. Fehlt etwas, bleibt der Bucket gesperrt.
  if v_bucket.id is null then
    v_offen := v_offen || E'\n  - Bucket employee-documents im Dashboard anlegen (privat, 10485760 Byte, application/pdf + image/jpeg + image/png).';
  elsif v_bucket.public then
    raise exception 'ABBRUCH: Bucket employee-documents ist OEFFENTLICH. Das ist unzulaessig.';
  end if;

  if v_storage_p < 4 then
    v_offen := v_offen || format(E'\n  - Nur %s von 4 Storage-Policies vorhanden. Wortlaut in supabase/setup/storage-policies-dashboard.md, anzulegen unter Storage -> Policies.', v_storage_p);
  end if;

  if v_offen = '' then
    raise notice 'EINRICHTUNG VOLLSTAENDIG (ohne eigenen Storage-Trigger, wie vorgesehen).';
  else
    raise notice 'DATENBANKTEIL VOLLSTAENDIG. NOCH OFFEN: %', v_offen;
    raise notice 'Bis dahin ist der Bucket gesperrt, nicht offen - Uploads schlagen fehl.';
  end if;
end
$tg_check$;

commit;

-- Abschliessende Uebersicht als Ergebnistabelle.
select 'Tabellen public'          as posten, count(*)::text as wert from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r'
union all select 'Policies public',          count(*)::text from pg_policies where schemaname='public'
union all select 'Storage-Policies (eigene)', count(*)::text from pg_policies where schemaname='storage' and tablename='objects' and policyname like 'employee_documents%'
union all select 'Eigene Trigger auf storage.objects', coalesce((select count(*)::text from pg_trigger t where t.tgrelid = to_regclass('storage.objects') and not t.tgisinternal), '0')
union all select 'Dokumenttypen',            count(*)::text from public.document_types
union all select 'Bucket oeffentlich?',      coalesce((select public::text from storage.buckets where id='employee-documents'), 'Bucket fehlt')
union all select 'Bucket Groessenlimit',     coalesce((select file_size_limit::text from storage.buckets where id='employee-documents'), '-')
union all select 'Bucket Dateitypen',        coalesce((select array_to_string(allowed_mime_types, ', ') from storage.buckets where id='employee-documents'), '-');
