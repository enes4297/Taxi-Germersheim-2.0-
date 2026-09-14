-- ===========================================================================
-- Schritt 01 - Sicherung des Ist-Stands vor dem Einspielen von 011
-- ===========================================================================
--
-- REIN LESEND. Ein einziges select, keine Transaktion, kein DO-Block, kein
-- insert/update/delete/create/grant/revoke. Aendert nichts.
--
-- WOFUER
--   Der Rueckweg muss aus dem GEMESSENEN Ist-Stand bestehen, nicht aus alten
--   Migrationsdateien. Eine Migration sagt, was einmal angelegt wurde - nicht,
--   was heute dasteht. Zwischenzeitliche Aenderungen im Dashboard oder per
--   SQL Editor wuerden dabei uebersehen.
--
--   Diese Abfrage liest den aktuellen Zustand aus den Systemkatalogen und
--   erzeugt daraus ausfuehrbare Anweisungen. Die Spalte "anweisung" stellt
--   den Ist-Stand wieder her.
--
-- SO WIRD SIE VERWENDET
--   1. Im SQL Editor ausfuehren.
--   2. Die vollstaendige Ausgabe sichern (Download als CSV oder Kopie in eine
--      Datei). Ohne diese Ausgabe gibt es keinen belastbaren Rueckweg.
--   3. Erst danach beginnt Schritt 02.
--
-- GRENZEN - NICHT UEBERSCHREIBEN
--   - Die Ausgabe ist eine Momentaufnahme. Aendert danach jemand etwas im
--     Dashboard, ist sie veraltet.
--   - Objekte im Schema storage kann die Projektrolle teils NICHT
--     zurueckbauen. Was der Rueckweg leisten kann und was nicht, steht in
--     README.md, Abschnitt "Grenzen eigener Storage-Trigger".
--   - Die Anweisungen sind nach Kategorie sortiert, nicht nach
--     Ausfuehrungsreihenfolge. Die verbindliche Reihenfolge des Rueckwegs
--     steht in 90_rueckweg.sql.
--   - Dateien im Objektspeicher sichert diese Abfrage NICHT. Sie kann es
--     nicht: storage.objects ist nur der Katalog. Dateien liegen im
--     Objektspeicher und werden ausschliesslich ueber die Storage-API
--     bewegt.
--   - Keine Nutzdaten. Die Abfrage liest ausschliesslich Systemkataloge,
--     keine Inhalte aus Mitarbeiter- oder Kundentabellen.
-- ===========================================================================

with ziel_tabellen as (
  select unnest(array[
    'public.document_submissions',
    'public.employee_documents',
    'public.sickness_reports',
    'public.document_types',
    'storage.objects',
    'storage.buckets'
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

-- --- 1) Policies: vollstaendiger Wortlaut als create policy ----------------
select
  10                                   as nr,
  'Policy'                             as bereich,
  p.schemaname || '.' || p.tablename || ' / ' || p.policyname as gegenstand,
  'create policy ' || quote_ident(p.policyname::text)
    || ' on ' || quote_ident(p.schemaname::text) || '.' || quote_ident(p.tablename::text)
    || ' as ' || lower(p.permissive)
    || ' for ' || lower(p.cmd)
    || ' to ' || array_to_string(p.roles, ', ')
    || coalesce(' using (' || p.qual || ')', '')
    || coalesce(' with check (' || p.with_check || ')', '')
    || ';'                             as anweisung
from pg_policies as p
join ziel_tabellen as z
  on z.vollname = p.schemaname || '.' || p.tablename

union all

-- --- 2) Tabellenrechte: je Rolle eine grant-Anweisung ----------------------
-- Der Ist-Stand der Grants ist nicht rekonstruierbar, wenn er nicht vorher
-- notiert ist. Fuer storage.objects ist das eine reine Beweissicherung:
-- KEIN Schritt dieses Ablaufs und KEINE Stufe des Rueckwegs veraendert dort
-- Rechte. Die Zeilen halten fest, was war - sie sind keine Vorlage fuer eine
-- Wiederherstellung.
select
  20,
  'Tabellenrecht',
  z.vollname || ' / ' || case when a.grantee = 0 then 'PUBLIC' else a.grantee::regrole::text end,
  'grant ' || string_agg(a.privilege_type, ', ' order by a.privilege_type)
    || ' on ' || z.vollname
    || ' to ' || case when a.grantee = 0 then 'public' else quote_ident(a.grantee::regrole::text) end
    || ';'
from pg_class as c
join ziel_tabellen as z on to_regclass(z.vollname) = c.oid
cross join lateral aclexplode(c.relacl) as a
group by c.oid, z.vollname, a.grantee

union all

-- --- 2b) Herkunft der Rechte: WER hat sie vergeben, mit GRANT OPTION? -----
-- Das entscheidet, ob ein revoke ueberhaupt etwas bewirkt. Ein revoke nimmt
-- nur zurueck, was die AUSFUEHRENDE Rolle selbst vergeben hat. Stammt das
-- Recht von einer anderen Rolle, laeuft der Befehl ohne Fehler durch, meldet
-- "REVOKE" - und bewirkt NICHTS. Nur eine WARNING weist darauf hin, und die
-- steht im SQL Editor nicht im Ergebnisgitter.
--
-- Ebenso fuer grant: ohne GRANT OPTION meldet PostgreSQL
-- "WARNING: no privileges were granted" und schreibt trotzdem "GRANT".
select
  22,
  'Rechteherkunft',
  z.vollname || ' / ' || case when a.grantee = 0 then 'PUBLIC' else a.grantee::regrole::text end
    || ' <- ' || a.grantor::regrole::text,
  '-- ' || string_agg(a.privilege_type, ', ' order by a.privilege_type)
    || ' vergeben von ' || a.grantor::regrole::text
    || ', weitergebbar: ' || a.is_grantable::text
    || case when a.grantor::regrole::text = current_user
            then ' -> von ' || current_user || ' entziehbar'
            else ' -> von ' || current_user || ' NUR entziehbar, wenn Mitglied in '
                 || a.grantor::regrole::text || ' (' || pg_has_role(current_user, a.grantor, 'USAGE')::text || ')'
       end
from pg_class as c
join ziel_tabellen as z on to_regclass(z.vollname) = c.oid
cross join lateral aclexplode(c.relacl) as a
group by c.oid, z.vollname, a.grantee, a.grantor, a.is_grantable

union all

-- --- 2c) Lage der ausfuehrenden Rolle ------------------------------------
-- Entscheidet ueber create policy (Eigentuemerschaft), ueber grant/revoke
-- (GRANT OPTION oder Mitgliedschaft im Vergeber) und ueber RLS (BYPASSRLS).
select
  15,
  'Rollenlage',
  current_user || ' / ' || z.vollname,
  '-- Eigentuemer: ' || pg_get_userbyid(c.relowner)::text
    || ' | ist Eigentuemer: ' || (c.relowner = current_user::regrole::oid)::text
    || ' | Mitglied USAGE: '  || pg_has_role(current_user, c.relowner, 'USAGE')::text
    || ' | Mitglied MEMBER: ' || pg_has_role(current_user, c.relowner, 'MEMBER')::text
    || ' | BYPASSRLS: ' || (select r.rolbypassrls::text from pg_roles as r where r.rolname = current_user)
    || ' | SUPERUSER: '  || (select r.rolsuper::text      from pg_roles as r where r.rolname = current_user)
from pg_class as c
join ziel_tabellen as z on to_regclass(z.vollname) = c.oid

union all

-- --- 3) Rechte, die AUSDRUECKLICH fehlen ----------------------------------
-- Ein fehlendes Recht ist im Katalog nicht sichtbar, aber fuer den Rueckweg
-- genauso wichtig: Wer hinterher zu viel zurueckgibt, weitet die Rechte aus.
select
  25,
  'Fehlendes Recht',
  z.vollname || ' / ' || r.rolname::text,
  '-- ' || r.rolname::text || ' hat auf ' || z.vollname
    || ' NICHT: ' || string_agg(pr.p, ', ' order by pr.p)
from pg_class as c
join ziel_tabellen as z on to_regclass(z.vollname) = c.oid
cross join (select unnest(array['SELECT','INSERT','UPDATE','DELETE','TRIGGER']) as p) as pr
join pg_roles as r on r.rolname in ('anon', 'authenticated', 'service_role')
where not has_table_privilege(r.rolname, c.oid, pr.p)
group by c.oid, z.vollname, r.rolname

union all

-- --- 4) Funktionen: vollstaendige Definition ------------------------------
select
  30,
  'Funktion',
  f.signatur,
  pg_get_functiondef(to_regprocedure(f.signatur)) || ';'
from ziel_funktionen as f
where to_regprocedure(f.signatur) is not null

union all

-- --- 4b) Eigentuemer der Funktionen --------------------------------------
-- Aus zwei Gruenden noetig:
--   1. create or replace function verlangt Eigentuemerschaft. Der Rueckweg
--      neutralisiert private.guard_document_object_delete() genau so - das
--      geht nur als Eigentuemer.
--   2. Eine SECURITY DEFINER-Funktion laeuft mit den Rechten ihres
--      EIGENTUEMERS. private.lock_document_object() nimmt ein
--      "select ... for update" auf storage.objects; das verlangt SELECT UND
--      UPDATE. Fehlt dem Eigentuemer das UPDATE, legt sich die Funktion
--      klaglos an und scheitert erst im Betrieb bei jeder Einreichung.
select
  32,
  'Funktionseigentuemer',
  f.signatur,
  '-- Eigentuemer: ' || pg_get_userbyid(p.proowner)::text
    || ' | SECURITY DEFINER: ' || p.prosecdef::text
    || ' | search_path: ' || coalesce(array_to_string(p.proconfig, ', '), '(keiner)')
    || ' | Eigentuemer hat auf storage.objects SELECT/UPDATE: '
    || has_table_privilege(pg_get_userbyid(p.proowner), 'storage.objects', 'SELECT')::text
    || '/' || has_table_privilege(pg_get_userbyid(p.proowner), 'storage.objects', 'UPDATE')::text
from ziel_funktionen as f
join pg_proc as p on p.oid = to_regprocedure(f.signatur)

union all

-- --- 5) Ausfuehrungsrechte auf diesen Funktionen --------------------------
select
  35,
  'Funktionsrecht',
  f.signatur || ' / ' || case when a.grantee = 0 then 'PUBLIC' else a.grantee::regrole::text end,
  'grant ' || string_agg(a.privilege_type, ', ' order by a.privilege_type)
    || ' on function ' || f.signatur
    || ' to ' || case when a.grantee = 0 then 'public' else quote_ident(a.grantee::regrole::text) end
    || ';'
from ziel_funktionen as f
join pg_proc as pr on pr.oid = to_regprocedure(f.signatur)
cross join lateral aclexplode(pr.proacl) as a
group by f.signatur, a.grantee

union all

-- --- 6) Trigger: vollstaendige Definition ---------------------------------
-- Die Plattform-Trigger protect_objects_delete und update_objects_updated_at
-- werden mitgeschrieben, damit nachweisbar bleibt, dass sie unveraendert
-- geblieben sind. Angefasst werden sie nicht.
--
-- Interne Trigger bleiben aussen vor: das sind die Fremdschluesseltrigger,
-- sie gehoeren zum Bestand der Constraints, sind nicht einzeln nachbildbar
-- und wuerden die Ausgabe nur zuschuetten. Ihre Anzahl steht in Posten 45.
select
  40,
  'Trigger',
  z.vollname || ' / ' || t.tgname::text
    || ' [' || t.tgenabled::text || ']',
  pg_get_triggerdef(t.oid, true) || ';'
from pg_trigger as t
join ziel_tabellen as z on to_regclass(z.vollname) = t.tgrelid
where not t.tgisinternal

union all

select
  45,
  'Trigger (intern)',
  z.vollname,
  '-- ' || count(*)::text || ' interne Trigger (Fremdschluessel). Nicht'
    || ' einzeln nachbildbar, gehoeren zu den Constraints.'
from pg_trigger as t
join ziel_tabellen as z on to_regclass(z.vollname) = t.tgrelid
where t.tgisinternal
group by z.vollname

union all

-- --- 7) Indizes auf den betroffenen Tabellen ------------------------------
select
  50,
  'Index',
  i.schemaname || '.' || i.indexname,
  i.indexdef || ';'
from pg_indexes as i
join ziel_tabellen as z on z.vollname = i.schemaname || '.' || i.tablename

union all

-- --- 8) Spalten der betroffenen Tabellen ---------------------------------
-- Nur Name und Typ. Damit ist nachtraeglich feststellbar, welche Spalte 011
-- hinzugefuegt hat und welche schon dastand.
select
  60,
  'Spalte',
  z.vollname,
  '-- ' || string_agg(a.attname::text || ' ' || format_type(a.atttypid, a.atttypmod),
                      ', ' order by a.attnum)
from pg_class as c
join ziel_tabellen as z on to_regclass(z.vollname) = c.oid
join pg_attribute as a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
group by c.oid, z.vollname

union all

-- --- 9) RLS-Zustand ------------------------------------------------------
select
  70,
  'RLS',
  z.vollname,
  '-- RLS aktiv: ' || c.relrowsecurity::text
    || ', FORCE RLS: ' || c.relforcerowsecurity::text
    || ', Eigentuemer: ' || pg_get_userbyid(c.relowner)::text
from pg_class as c
join ziel_tabellen as z on to_regclass(z.vollname) = c.oid

union all

-- --- 10) Bucket-Zeilen als insert ----------------------------------------
select
  80,
  'Bucket',
  b.id,
  'insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)'
    || ' values (' || quote_literal(b.id) || ', ' || quote_literal(b.name) || ', '
    || b.public::text || ', ' || coalesce(b.file_size_limit::text, 'null') || ', '
    || coalesce(quote_literal(b.allowed_mime_types::text) || '::text[]', 'null') || ');'
from storage.buckets as b

union all

-- --- 11) Anzahl Objekte je Bucket ---------------------------------------
-- Nur die Anzahl, keine Pfade. Ein Pfad beginnt mit der auth.uid() und ist
-- damit personenbezogen.
select
  85,
  'Objekte',
  o.bucket_id,
  '-- ' || count(*)::text || ' Objekt(e) im Katalog. Entfernen ausschliesslich'
    || ' ueber die Storage-API, niemals per SQL-DELETE.'
from storage.objects as o
group by o.bucket_id

union all

-- --- 12) Kopfzeile mit Zeitpunkt und Rolle ------------------------------
select
  0,
  'Kopf',
  'Sicherung',
  '-- Ist-Stand gelesen am ' || now()::text
    || ' als ' || current_user::text
    || ' in Datenbank ' || current_database()
    || ', PostgreSQL ' || current_setting('server_version')

order by nr, gegenstand;
