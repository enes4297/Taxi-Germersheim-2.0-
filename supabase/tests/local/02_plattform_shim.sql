-- 02_plattform_shim.sql
--
-- Bildet die RECHTELAGE des Supabase-Testprojekts nach, wie sie die Diagnose
-- vom 11.09.2026 ausgewiesen hat. Ohne diese Datei laeuft alles lokal als
-- Superuser-Eigentuemer und der Testlauf wuerde Rechteprobleme uebersehen.
--
-- ===========================================================================
-- KEINE MIGRATION. Nur fuer die lokale, isolierte PostgreSQL-Instanz.
-- Darf niemals gegen ein Supabase-Projekt laufen.
-- ===========================================================================
--
-- Nachgebildete Messwerte:
--   Eigentuemer storage.objects/buckets = supabase_storage_admin
--   Projektrolle: NICHT Mitglied (USAGE=false, MEMBER=false), aber BYPASSRLS
--   TRIGGER-Recht auf storage.objects = true
--   SELECT/INSERT/UPDATE auf storage.buckets = true
--   authenticated auf storage.objects: SELECT/INSERT/UPDATE/DELETE = alle true
--   anon           auf storage.objects: SELECT/INSERT/UPDATE/DELETE = alle true
--   RLS aktiv, keine Storage-Policies, keine Buckets
--
-- GRENZE: Die beiden Plattform-Trigger werden nur dem NAMEN nach nachgebildet.
-- Ihr echtes Verhalten ist nicht bekannt und wird hier nicht behauptet.
-- Geprueft werden kann damit ausschliesslich, ob unser Einrichtungsweg sie
-- unveraendert stehen laesst und ob ein zweiter BEFORE-DELETE-Trigger daneben
-- funktioniert.

-- --- Eigentuemerrolle des Storage-Schemas ----------------------------------
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'supabase_storage_admin') then
    create role supabase_storage_admin nologin nosuperuser;
  end if;
end
$$;

alter schema storage         owner to supabase_storage_admin;
alter table  storage.buckets owner to supabase_storage_admin;
alter table  storage.objects owner to supabase_storage_admin;

-- --- Plattformbestand: die zwei vorhandenen Trigger -------------------------
-- Platzhalter. Beide tun bewusst nichts Fachliches.
create or replace function storage.protect_objects_delete()
returns trigger
language plpgsql
as $$
begin
  -- Platzhalter fuer den Plattform-Trigger gleichen Namens.
  return old;
end;
$$;

create or replace function storage.update_objects_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

alter function storage.protect_objects_delete()   owner to supabase_storage_admin;
alter function storage.update_objects_updated_at() owner to supabase_storage_admin;

drop trigger if exists protect_objects_delete    on storage.objects;
drop trigger if exists update_objects_updated_at on storage.objects;

create trigger protect_objects_delete
  before delete on storage.objects
  for each row execute function storage.protect_objects_delete();

create trigger update_objects_updated_at
  before update on storage.objects
  for each row execute function storage.update_objects_updated_at();

-- --- Rechte der Anwendungsrollen, exakt nach Diagnosezeile 13 und 14 --------
-- Vollstaendige Grants fuer beide Rollen. Das ist der Supabase-Standard und
-- laesst sich ohne Eigentuemerschaft NICHT zuruecknehmen. Einzige Schranke
-- bleibt damit die RLS.
grant all on storage.objects to anon, authenticated;
grant all on storage.buckets to authenticated;
grant select on storage.buckets to anon;

alter table storage.objects enable row level security;
alter table storage.buckets enable row level security;

-- --- Projektrolle ----------------------------------------------------------
-- Entspricht dem, was im Supabase-Projekt die Rolle "postgres" ist:
-- kein Superuser, NICHT Eigentuemerin von storage, aber mit BYPASSRLS.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'tg_projekt') then
    create role tg_projekt login password 'tgtestlocal' nosuperuser bypassrls createrole;
  end if;
end
$$;

-- Rechte im eigenen Bereich: dort ist die Projektrolle Eigentuemerin.
alter schema public owner to tg_projekt;
grant create, usage on schema public to tg_projekt;
-- CREATE auf der Datenbank: noetig fuer "create schema private" aus 002.
do $$ begin execute format('grant create on database %I to tg_projekt', current_database()); end $$;
grant usage on schema auth    to tg_projekt;
grant usage on schema storage to tg_projekt;

-- Supabase vergibt fuer die Projektrolle Standardrechte im Schema public.
-- Ohne diese Zeilen bekaemen die von tg_projekt angelegten Tabellen lokal
-- gar keine Grants und die Tests wuerden aus dem falschen Grund scheitern.
alter default privileges for role tg_projekt in schema public
  grant all on tables    to anon, authenticated, service_role;
alter default privileges for role tg_projekt in schema public
  grant all on functions to anon, authenticated, service_role;
alter default privileges for role tg_projekt in schema public
  grant all on sequences to anon, authenticated, service_role;

-- Die beiden entscheidenden Einzelrechte auf storage.
grant trigger                  on storage.objects to tg_projekt;
grant select, insert, update   on storage.buckets to tg_projekt;
grant select, insert, update, delete on storage.objects to tg_projekt;
grant execute on function storage.foldername(text) to tg_projekt;
grant execute on function auth.uid()  to tg_projekt;
grant execute on function auth.role() to tg_projekt;

-- Migration 001 legt Fremdschluessel auf auth.users an. Dafuer braucht die
-- Projektrolle das REFERENCES-Recht. In Supabase hat die Rolle postgres es;
-- ohne diese Zeile wuerde der Lauf aus einem Grund scheitern, den es im
-- Projekt nicht gibt.
grant select, references on auth.users to tg_projekt;

-- Die Rolle, die im Dashboard die Storage-Policies anlegt, muss die in den
-- Ausdruecken verwendeten Namen aufloesen koennen. auth.uid() gehoert dazu.
-- Welche Rolle das im Dashboard genau ist, ist nicht dokumentiert; dass
-- Storage-Policies mit auth.uid() dort funktionieren, ist allgemeine Praxis.
grant usage on schema auth to supabase_storage_admin;
grant execute on function auth.uid() to supabase_storage_admin;

-- Die vorhandenen Tabellen aus dem Shim gehoeren noch postgres; im Projekt
-- gehoerten sie der Projektrolle. Es gibt zu diesem Zeitpunkt aber noch keine
-- (die Migrationen laufen erst danach), deshalb hier nichts zu tun.

-- --- Kontrolle: stimmt die nachgebildete Lage mit der Diagnose ueberein? ----
select
  (select pg_get_userbyid(relowner)::text from pg_class where oid = to_regclass('storage.objects'))                    as eigentuemer,
  pg_has_role('tg_projekt', 'supabase_storage_admin', 'USAGE')::text                                                   as usage_mitglied,
  pg_has_role('tg_projekt', 'supabase_storage_admin', 'MEMBER')::text                                                  as member_mitglied,
  has_table_privilege('tg_projekt', 'storage.objects', 'TRIGGER')::text                                                as trigger_recht,
  (select rolbypassrls::text from pg_roles where rolname = 'tg_projekt')                                               as bypassrls,
  concat_ws('/', has_table_privilege('anon','storage.objects','SELECT')::text,
                 has_table_privilege('anon','storage.objects','INSERT')::text,
                 has_table_privilege('anon','storage.objects','UPDATE')::text,
                 has_table_privilege('anon','storage.objects','DELETE')::text)                                         as anon_rechte,
  (select count(*)::text from pg_policies where schemaname='storage' and tablename='objects')                          as policies;
