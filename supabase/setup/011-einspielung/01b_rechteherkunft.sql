-- ===========================================================================
-- Schritt 01b - Nachmessung: Herkunft der Rechte und Rollenlage
-- ===========================================================================
--
-- REIN LESEND. Ein einziges select. Aendert nichts.
--
-- WARUM NACHTRAEGLICH
--   Die erste Fassung von 01_sicherung-ist-stand.sql hat GRANT OPTION,
--   Vergeber und Funktionseigentuemer nicht erfasst. Beides wird gebraucht.
--   In 01_sicherung-ist-stand.sql sind die Bereiche 15, 22 und 32 inzwischen
--   ergaenzt; diese Datei liefert genau diese drei nach, ohne dass die
--   vollstaendige Sicherung erneut laufen muss.
--
-- WAS DAVON ABHAENGT
--   1. Der Befund zu den Rechten auf storage.objects. Ein revoke nimmt NUR
--      zurueck, was die AUSFUEHRENDE Rolle selbst vergeben hat. Stammt das
--      Recht von supabase_storage_admin und ist die ausfuehrende Rolle dort
--      kein Mitglied, laeuft der Befehl OHNE FEHLER durch, meldet "REVOKE" -
--      und bewirkt nichts.
--      NACHGEMESSEN am 14.09.2026 im oertlichen Nachbau: dabei erscheint
--      NICHT EINMAL eine WARNING. PostgreSQL warnt nur, wenn die Rolle fuer
--      das Recht gar keine GRANT OPTION hat. Sie HAT sie hier (gemessen:
--      weitergebbar true) - der Befehl gilt damit als zulaessig und entfernt
--      trotzdem nichts, weil kein Eintrag mit diesem Vergeber existiert.
--      DIESER BEFUND HAT SCHRITT 04 ZU FALL GEBRACHT. Es gibt keinen Schritt
--      mehr, der diese Rechte veraendert - weder per grant noch per revoke.
--      Supabase fuehrt das Entziehen von Rechten an API-Rollen in auth,
--      storage und realtime seit dem 21.04.2025 ohnehin unter dem, was nicht
--      mehr moeglich ist. Bereich 22 bleibt als MESSUNG stehen, nicht als
--      Vorbereitung eines Eingriffs. Geregelt wird der Zugriff ueber den
--      privaten Bucket und die Policies der Schritte 06 und 07; siehe
--      CLAUDE.md, "Plattform-Grants auf storage.objects und storage.buckets".
--   2. Der Rueckweg neutralisiert private.guard_document_object_delete() per
--      create or replace. Das verlangt Eigentuemerschaft an der Funktion.
--      Bereich 32 beantwortet das.
--   3. private.lock_document_object() ist SECURITY DEFINER und nimmt ein
--      "select ... for update" auf storage.objects. Das verlangt SELECT UND
--      UPDATE - und zwar fuer den EIGENTUEMER der Funktion, nicht fuer den
--      Aufrufer. Fehlt dem Eigentuemer das UPDATE, legt sich die Funktion
--      klaglos an und scheitert erst im Betrieb bei jeder Einreichung.
--      Bereich 32 misst auch das.
--   4. Schritt 03 schreibt in storage.buckets. Dort ist RLS aktiv, die
--      Tabelle gehoert supabase_storage_admin und es gibt keine Policy.
--      Ob der insert durchgeht, haengt an BYPASSRLS der ausfuehrenden Rolle.
--      Bereich 15 misst das.
--
-- GRENZE
--   Auch das bleibt eine Momentaufnahme und eine Vorhersage. Sie ersetzt die
--   Kontrolle vor dem commit nicht - sie sagt nur vorher, was dort zu
--   erwarten ist.
-- ===========================================================================

with ziel_tabellen as (
  select unnest(array[
    'storage.objects',
    'storage.buckets',
    'public.document_submissions',
    'public.employee_documents',
    'public.sickness_reports',
    'public.document_types'
  ]) as vollname
),
ziel_funktionen as (
  select unnest(array[
    'private.is_active_employee()',
    'private.is_unlinked_document(text)',
    'private.is_admin()',
    'private.current_user_employee_id()',
    'private.guard_document_object_delete()',
    'private.lock_document_object()'
  ]) as signatur
)

-- --- 15) Lage der ausfuehrenden Rolle je Tabelle --------------------------
select
  15                                   as nr,
  'Rollenlage'                         as bereich,
  current_user || ' / ' || z.vollname  as gegenstand,
  '-- Eigentuemer: ' || pg_get_userbyid(c.relowner)::text
    || ' | ist Eigentuemer: ' || (c.relowner = current_user::regrole::oid)::text
    || ' | Mitglied USAGE: '  || pg_has_role(current_user, c.relowner, 'USAGE')::text
    || ' | Mitglied MEMBER: ' || pg_has_role(current_user, c.relowner, 'MEMBER')::text
    || ' | RLS aktiv: ' || c.relrowsecurity::text
    || ' | BYPASSRLS: ' || (select r.rolbypassrls::text from pg_roles as r where r.rolname = current_user)
    || ' | SUPERUSER: '  || (select r.rolsuper::text     from pg_roles as r where r.rolname = current_user)
                                       as befund
from pg_class as c
join ziel_tabellen as z on to_regclass(z.vollname) = c.oid

union all

-- --- 22) Herkunft jedes Rechts: Vergeber und GRANT OPTION ----------------
select
  22,
  'Rechteherkunft',
  z.vollname || ' / ' || case when a.grantee = 0 then 'PUBLIC' else a.grantee::regrole::text end
    || ' <- ' || a.grantor::regrole::text,
  '-- ' || string_agg(a.privilege_type, ', ' order by a.privilege_type)
    || ' | vergeben von: ' || a.grantor::regrole::text
    || ' | weitergebbar: ' || a.is_grantable::text
    -- Diese Spalte hiess frueher "entziehbar". Der Name war falsch: sie misst
    -- die MITGLIEDSCHAFT im Vergeber, nicht das Ergebnis eines revoke. Die
    -- Messung vom 13.09.2026 hat gezeigt, wie irrefuehrend das ist - hier
    -- stand "false", waehrend "weitergebbar" true war. Beides ist richtig und
    -- bedeutet Verschiedenes. Beides ist hier ein BEFUND: kein Schritt dieses
    -- Ablaufs veraendert die Rechte auf storage.objects.
    || ' | ausfuehrende Rolle ist Vergeber oder erbt dessen Rechte: '
    || (a.grantor::regrole::text = current_user
        or pg_has_role(current_user, a.grantor, 'USAGE'))::text
from pg_class as c
join ziel_tabellen as z on to_regclass(z.vollname) = c.oid
cross join lateral aclexplode(c.relacl) as a
group by c.oid, z.vollname, a.grantee, a.grantor, a.is_grantable

union all

-- --- 32) Eigentuemer und Bauart der betroffenen Funktionen ---------------
select
  32,
  'Funktionseigentuemer',
  f.signatur,
  '-- Eigentuemer: ' || pg_get_userbyid(p.proowner)::text
    || ' | von ' || current_user || ' ersetzbar: '
    || pg_has_role(current_user, p.proowner, 'USAGE')::text
    || ' | SECURITY DEFINER: ' || p.prosecdef::text
    || ' | search_path: ' || coalesce(array_to_string(p.proconfig, ', '), '(keiner)')
    || ' | Eigentuemer auf storage.objects SELECT/UPDATE: '
    || has_table_privilege(pg_get_userbyid(p.proowner), 'storage.objects', 'SELECT')::text
    || '/' || has_table_privilege(pg_get_userbyid(p.proowner), 'storage.objects', 'UPDATE')::text
from ziel_funktionen as f
join pg_proc as p on p.oid = to_regprocedure(f.signatur)

union all

-- --- 34) Wer wuerde Eigentuemer der NEUEN Funktionen? --------------------
-- Die Funktionen aus 011 gehoeren nachher der Rolle, die sie anlegt. Deren
-- Rechte auf storage.objects entscheiden ueber das "select ... for update"
-- in private.lock_document_object(). Schritt 02 prueft das noch einmal
-- selbst und bricht ab, wenn das UPDATE fehlt.
select
  34,
  'Kuenftiger Eigentuemer',
  current_user,
  '-- ' || current_user || ' auf storage.objects: SELECT '
    || has_table_privilege(current_user, 'storage.objects', 'SELECT')::text
    || ', UPDATE ' || has_table_privilege(current_user, 'storage.objects', 'UPDATE')::text
    || ', DELETE ' || has_table_privilege(current_user, 'storage.objects', 'DELETE')::text
    || ', TRIGGER ' || has_table_privilege(current_user, 'storage.objects', 'TRIGGER')::text
    || ' | auf storage.buckets: INSERT '
    || has_table_privilege(current_user, 'storage.buckets', 'INSERT')::text
    || ', DELETE ' || has_table_privilege(current_user, 'storage.buckets', 'DELETE')::text

union all

-- --- 36) Plattform-Trigger, die einem SQL-DELETE im Weg stehen -----------
-- storage.protect_delete() haengt sowohl an storage.objects als auch an
-- storage.buckets. Fuer den Rueckweg ist das entscheidend: ein
-- "delete from storage.buckets" kann daran scheitern.
select
  36,
  'Loeschschutz der Plattform',
  c.relname::text || ' / ' || t.tgname::text,
  '-- ' || pg_get_triggerdef(t.oid, true)
from pg_trigger as t
join pg_class as c on c.oid = t.tgrelid
join pg_namespace as n on n.oid = c.relnamespace
where n.nspname = 'storage'
  and not t.tgisinternal
  and t.tgname like '%protect%'

union all

-- --- 38) Was storage.protect_delete() TATSAECHLICH tut -------------------
-- Bisher eine Annahme, hier ein Messwert. Der Trigger haengt an
-- storage.objects UND an storage.buckets. Wenn er ein SQL-DELETE grundsaetzlich
-- verweigert, kann der Rueckweg den Bucket nicht per SQL entfernen - dann
-- fuehrt der Weg ueber das Dashboard. Die oertliche Nachbildung ist an dieser
-- Stelle nur ein Platzhalter und beweist nichts.
select
  38,
  'Plattformfunktion',
  n.nspname::text || '.' || p.proname::text || '()',
  pg_get_functiondef(p.oid)
from pg_proc as p
join pg_namespace as n on n.oid = p.pronamespace
where n.nspname = 'storage'
  and p.proname in ('protect_delete', 'enforce_bucket_name_length',
                    'update_updated_at_column', 'foldername')

order by nr, gegenstand;
