-- 02_plattform_shim.sql
--
-- Bildet die RECHTELAGE und den LOESCHSCHUTZ nach, die im Projekt Taxi
-- Germersheim am 13.09.2026 gemessen wurden (01_sicherung-ist-stand.sql und
-- 01b_rechteherkunft.sql, PostgreSQL 17.6). Ohne diese Datei liefe alles
-- oertlich als Superuser-Eigentuemer und der Testlauf wuerde genau die
-- Probleme uebersehen, um die es geht.
--
-- ===========================================================================
-- KEINE MIGRATION. Nur fuer die lokale, isolierte PostgreSQL-Instanz.
-- Darf niemals gegen ein Supabase-Projekt laufen.
-- ===========================================================================
--
-- NACHGEBILDETE MESSWERTE (Stand 13.09.2026)
--   Eigentuemer storage.objects/buckets = supabase_storage_admin
--   Projektrolle postgres: NICHT Mitglied (USAGE=false, MEMBER=false),
--     kein Superuser, aber BYPASSRLS=true
--   Rechte auf storage.objects UND storage.buckets, jeweils vergeben von
--     supabase_storage_admin, jeweils der volle Satz
--     DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE:
--       anon, authenticated, service_role -> weitergebbar FALSE
--       postgres                          -> weitergebbar TRUE (GRANT OPTION)
--   RLS auf beiden Tabellen aktiv, keine Storage-Policies, keine Buckets
--   Vier Plattform-Trigger (siehe unten)
--
-- DIE ENTSCHEIDENDE KOMBINATION
--   Die Projektrolle hat GRANT OPTION, ist aber KEIN Mitglied des Vergebers.
--   Das sind zwei verschiedene Dinge, und erst zusammen ergeben sie das
--   tatsaechliche Verhalten:
--     - GRANT OPTION erlaubt ihr, dieselben Rechte WEITERZUGEBEN.
--     - Ein REVOKE entfernt dagegen nur Eintraege, deren VERGEBER die
--       ausfuehrende Rolle ist oder deren Rechte sie erbt.
--   Ob "revoke update on storage.objects from authenticated" damit wirkt,
--   wird hier NICHT behauptet, sondern oertlich gemessen. Der berechnete
--   Mitgliedschaftswert allein genuegt als Begruendung nicht - deshalb bildet
--   dieser Nachbau die Vergeber-Beziehung exakt nach und laesst den Versuch
--   selbst antworten.

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

-- --- Projektrolle ----------------------------------------------------------
-- Entspricht dem, was im Supabase-Projekt die Rolle "postgres" ist:
-- kein Superuser, NICHT Eigentuemerin von storage, aber mit BYPASSRLS.
-- Muss VOR den Grants weiter unten stehen.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'tg_projekt') then
    create role tg_projekt login password 'tgtestlocal' nosuperuser bypassrls createrole;
  end if;
end
$$;

-- --- Plattformfunktionen, woertlich aus der Messung ------------------------
-- Die folgenden drei Rumpfe sind KEINE Erfindung und keine Platzhalter mehr.
-- Sie sind die unveraenderte Ausgabe von pg_get_functiondef() aus dem Projekt
-- (01b_rechteherkunft.sql, Posten 38, 13.09.2026). Nur so verhaelt sich der
-- oertliche Loeschschutz wie der echte.
create or replace function storage.protect_delete()
returns trigger
language plpgsql
as $function$
BEGIN
    -- Check if storage.allow_delete_query is set to 'true'
    IF COALESCE(current_setting('storage.allow_delete_query', true), 'false') != 'true' THEN
        RAISE EXCEPTION 'Direct deletion from storage tables is not allowed. Use the Storage API instead.'
            USING HINT = 'This prevents accidental data loss from orphaned objects.',
                  ERRCODE = '42501';
    END IF;
    RETURN NULL;
END;
$function$;

create or replace function storage.update_updated_at_column()
returns trigger
language plpgsql
as $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

create or replace function storage.enforce_bucket_name_length()
returns trigger
language plpgsql
as $function$
begin
    if length(new.name) > 100 then
        raise exception 'bucket name "%" is too long (% characters). Max is 100.', new.name, length(new.name);
    end if;
    return new;
end;
$function$;

alter function storage.protect_delete()             owner to supabase_storage_admin;
alter function storage.update_updated_at_column()   owner to supabase_storage_admin;
alter function storage.enforce_bucket_name_length() owner to supabase_storage_admin;

-- Die Fassung vor dem 14.09.2026 hatte hier eine erfundene Funktion
-- storage.protect_objects_delete() und einen FOR-EACH-ROW-Trigger. Beides
-- entsprach nicht der Messung und wird entfernt, damit der Nachbau nicht
-- versehentlich am alten Namen haengen bleibt.
drop trigger if exists protect_objects_delete on storage.objects;
drop function if exists storage.protect_objects_delete();
drop function if exists storage.update_objects_updated_at();

-- --- Die vier gemessenen Plattform-Trigger ---------------------------------
-- Woertlich aus 01b_rechteherkunft.sql Posten 36 und der Bestandspruefung
-- Posten 40. BEIDE Loesch-Trigger sind FOR EACH STATEMENT und rufen DIESELBE
-- Funktion storage.protect_delete() auf. Ein direktes SQL-DELETE auf
-- storage.objects ODER storage.buckets scheitert damit mit 42501.
drop trigger if exists update_objects_updated_at          on storage.objects;
drop trigger if exists protect_buckets_delete             on storage.buckets;
drop trigger if exists enforce_bucket_name_length_trigger on storage.buckets;

create trigger protect_objects_delete
  before delete on storage.objects
  for each statement execute function storage.protect_delete();

create trigger update_objects_updated_at
  before update on storage.objects
  for each row execute function storage.update_updated_at_column();

create trigger protect_buckets_delete
  before delete on storage.buckets
  for each statement execute function storage.protect_delete();

create trigger enforce_bucket_name_length_trigger
  before insert or update of name on storage.buckets
  for each row execute function storage.enforce_bucket_name_length();

-- --- Rechte auf storage, nach der Messung vom 13.09.2026 -------------------
-- ENTSCHEIDEND IST DER VERGEBER. Deshalb werden ALLE diese Grants ausdruecklich
-- ALS supabase_storage_admin vergeben - genau wie im Projekt gemessen. Nur dann
-- steht im Katalog derselbe Vergeber, und nur dann beantwortet der oertliche
-- Lauf die Frage, ob ein spaeteres revoke etwas bewirkt.
-- "set local" waere hier falsch: die Datei laeuft ohne umschliessende
-- Transaktion, "set local" gaebe nur eine Warnung aus und bliebe wirkungslos.
--
-- "grant all" umfasst unter PostgreSQL 17 genau den gemessenen Satz
-- DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE.
set role supabase_storage_admin;

grant all on storage.objects to anon, authenticated, service_role;
grant all on storage.buckets to anon, authenticated, service_role;

-- Auch der Eigentuemer hat im Projekt einen ausdruecklichen Eintrag MIT
-- GRANT OPTION. Ohne diese zwei Zeilen zeigte der Nachbau dort "false" und
-- waere nicht deckungsgleich mit der Messung.
grant all on storage.objects to supabase_storage_admin with grant option;
grant all on storage.buckets to supabase_storage_admin with grant option;

-- Die Projektrolle bekommt denselben Satz, aber MIT GRANT OPTION - und
-- trotzdem VOM EIGENTUEMER, nicht von sich selbst. Das ist die Kombination
-- aus der Messung: weitergebbar true, Mitglied im Vergeber false.
grant all on storage.objects to tg_projekt with grant option;
grant all on storage.buckets to tg_projekt with grant option;

reset role;

alter table storage.objects enable row level security;
alter table storage.buckets enable row level security;

-- --- Rechte der Projektrolle ausserhalb von storage ------------------------
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

-- Die Einzelrechte auf storage stehen NICHT mehr hier. Sie kommen oben
-- geschlossen von supabase_storage_admin. Wuerden sie zusaetzlich vom
-- oertlichen Superuser vergeben, entstuende ein zweiter Katalogeintrag mit
-- anderem Vergeber - und der Nachbau wuerde die Frage nach dem revoke
-- verfaelschen.
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

-- --- Kontrolle: stimmt der Nachbau mit der Messung ueberein? ---------------
select
  (select pg_get_userbyid(relowner)::text from pg_class where oid = to_regclass('storage.objects'))  as eigentuemer,
  pg_has_role('tg_projekt', 'supabase_storage_admin', 'USAGE')::text                                 as usage_mitglied,
  pg_has_role('tg_projekt', 'supabase_storage_admin', 'MEMBER')::text                                as member_mitglied,
  (select rolbypassrls::text from pg_roles where rolname = 'tg_projekt')                             as bypassrls,
  has_table_privilege('tg_projekt', 'storage.objects', 'SELECT WITH GRANT OPTION')::text             as obj_grant_option,
  has_table_privilege('tg_projekt', 'storage.buckets', 'SELECT WITH GRANT OPTION')::text             as buck_grant_option,
  (select count(*)::text from pg_trigger t join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'storage' and not t.tgisinternal)                                               as plattform_trigger,
  (select count(*)::text from pg_policies where schemaname = 'storage' and tablename = 'objects')    as policies;

-- Rechteherkunft im Nachbau, im selben Format wie 01b Posten 22. Muss fuer
-- tg_projekt "weitergebbar: true" und fuer die drei Anwendungsrollen
-- "weitergebbar: false" zeigen, Vergeber jeweils supabase_storage_admin.
select
  'storage.' || c.relname::text || ' / ' || a.grantee::regrole::text as gegenstand,
  string_agg(a.privilege_type, ', ' order by a.privilege_type)
    || ' | vergeben von: ' || a.grantor::regrole::text
    || ' | weitergebbar: ' || a.is_grantable::text                   as befund
from pg_class as c
join pg_namespace as n on n.oid = c.relnamespace
cross join lateral aclexplode(c.relacl) as a
where n.nspname = 'storage' and c.relname in ('objects', 'buckets')
group by c.relname, a.grantee, a.grantor, a.is_grantable
order by 1;
