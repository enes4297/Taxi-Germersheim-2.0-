-- ===========================================================================
-- Bestandspruefung vor dem Einspielen von Migration 011
-- ===========================================================================
--
-- REIN LESEND. Aendert nichts, legt nichts an, loescht nichts. Keine
-- DO-Bloecke, keine Funktionsaufrufe mit Nebenwirkung, keine Transaktion.
--
-- WOFUER
--   Vor dem Einspielen von 011 in die BESTEHENDE Datenbank muss gemessen
--   werden, was dort tatsaechlich schon steht. Lokale SQL-Dateien sind dafuer
--   kein Nachweis. Die Bestandsaufnahme vom 10.09.2026 ist aelter als dieser
--   Stand und wird hier nicht als gegeben unterstellt, sondern neu erhoben.
--
-- ABLAUF
--   Abfrage A dieser Datei im SQL Editor ausfuehren, Ausgabe zurueckmelden.
--   Danach zusaetzlich Abfrage A und B aus diagnose-storage-rechte.sql - die
--   beantworten, WELCHE Eingriffe auf storage in diesem Projekt ueberhaupt
--   moeglich sind. Die dortigen Posten 20 bis 23 sind auf ein LEERES
--   Testprojekt gemuenzt; in der bestehenden Datenbank sind sie umgekehrt zu
--   lesen (Tabellen vorhanden, Schema private vorhanden).
--
-- VORAUSSETZUNG
--   Die Migrationen 001 bis 010 sind eingespielt. Fehlt eine der dort
--   angelegten Tabellen, bricht diese Abfrage mit einer eindeutigen Meldung
--   ab. Das ist dann selbst der Befund und bedeutet: 011 darf nicht laufen.
-- ===========================================================================

select nr, abschnitt, posten, wert
from (values

  -- --- Vorbedingungen aus 001 und 002 ------------------------------------
  ( 1, 'Vorbedingung', 'public.document_submissions vorhanden',
       (to_regclass('public.document_submissions') is not null)::text),
  ( 2, 'Vorbedingung', 'public.employee_documents vorhanden',
       (to_regclass('public.employee_documents') is not null)::text),
  ( 3, 'Vorbedingung', 'public.sickness_reports vorhanden',
       (to_regclass('public.sickness_reports') is not null)::text),
  ( 4, 'Vorbedingung', 'public.document_types vorhanden',
       (to_regclass('public.document_types') is not null)::text),
  ( 5, 'Vorbedingung', 'Spalte employees.portal_active vorhanden',
       (exists (select 1 from pg_attribute
                 where attrelid = to_regclass('public.employees')
                   and attname = 'portal_active' and attnum > 0 and not attisdropped))::text),
  ( 6, 'Vorbedingung', 'private.is_admin() vorhanden',
       (to_regprocedure('private.is_admin()') is not null)::text),
  ( 7, 'Vorbedingung', 'private.current_user_employee_id() vorhanden',
       (to_regprocedure('private.current_user_employee_id()') is not null)::text),

  -- --- 011 Abschnitt 1: Bucket -------------------------------------------
  (10, '011/1', 'Bucket employee-documents vorhanden',
       (exists (select 1 from storage.buckets where id = 'employee-documents'))::text),
  (11, '011/1', 'Bucket: public / Groessengrenze / MIME-Typen',
       coalesce((select concat_ws(' / ', b.public::text, b.file_size_limit::text,
                                  array_to_string(b.allowed_mime_types, ','))
                   from storage.buckets as b where b.id = 'employee-documents'),
                '(Bucket fehlt)')),
  (12, '011/1', 'Objekte im Bucket (wichtig fuer den Rueckweg)',
       (select count(*)::text from storage.objects where bucket_id = 'employee-documents')),
  (13, '011/1', 'Sonstige Buckets im Projekt',
       (select coalesce(string_agg(id, ', ' order by id), 'keine')
          from storage.buckets where id <> 'employee-documents')),

  -- --- 011 Abschnitt 2: Dokumentarten ------------------------------------
  (20, '011/2', 'Zeilen in public.document_types',
       (select count(*)::text from public.document_types)),
  (21, '011/2', 'Fehlende der vier Schluessel aus 011',
       (select coalesce(string_agg(k, ', ' order by k), 'keiner')
          from unnest(array['fuehrerschein','personenbefoerderungsschein',
                            'krankenschein_au','sonstiges']) as k
         where not exists (select 1 from public.document_types as d where d.key = k))),

  -- --- 011 Abschnitt 3: Berechtigungsfunktionen --------------------------
  (30, '011/3', 'private.is_active_employee() vorhanden',
       (to_regprocedure('private.is_active_employee()') is not null)::text),
  (31, '011/3', 'private.is_unlinked_document(text) vorhanden',
       (to_regprocedure('private.is_unlinked_document(text)') is not null)::text),
  (32, '011/3', 'is_active_employee: EXECUTE fuer authenticated / anon',
       case when to_regprocedure('private.is_active_employee()') is null then '(Funktion fehlt)'
            else concat_ws(' / ',
                   has_function_privilege('authenticated', 'private.is_active_employee()', 'EXECUTE')::text,
                   has_function_privilege('anon',          'private.is_active_employee()', 'EXECUTE')::text)
       end),

  -- --- 011 Abschnitt 4: Rechte und Policies auf storage.objects ----------
  (40, '011/4', 'RLS auf storage.objects aktiv',
       (select relrowsecurity::text from pg_class where oid = to_regclass('storage.objects'))),
  (41, '011/4', 'authenticated auf storage.objects: SELECT/INSERT/UPDATE/DELETE',
       concat_ws(' / ',
         has_table_privilege('authenticated', 'storage.objects', 'SELECT')::text,
         has_table_privilege('authenticated', 'storage.objects', 'INSERT')::text,
         has_table_privilege('authenticated', 'storage.objects', 'UPDATE')::text,
         has_table_privilege('authenticated', 'storage.objects', 'DELETE')::text)),
  (42, '011/4', 'anon auf storage.objects: SELECT/INSERT/UPDATE/DELETE',
       concat_ws(' / ',
         has_table_privilege('anon', 'storage.objects', 'SELECT')::text,
         has_table_privilege('anon', 'storage.objects', 'INSERT')::text,
         has_table_privilege('anon', 'storage.objects', 'UPDATE')::text,
         has_table_privilege('anon', 'storage.objects', 'DELETE')::text)),
  (43, '011/4', 'Policies auf storage.objects',
       (select coalesce(string_agg(policyname, ', ' order by policyname), 'keine')
          from pg_policies where schemaname = 'storage' and tablename = 'objects')),
  (44, '011/4', 'DELETE-Policies auf storage.objects (permissive verknuepft mit ODER)',
       (select count(*)::text from pg_policies
         where schemaname = 'storage' and tablename = 'objects' and cmd = 'DELETE')),

  -- --- 011 Abschnitt 5: Loeschschutz-Trigger auf storage.objects ---------
  (50, '011/5', 'private.guard_document_object_delete() vorhanden',
       (to_regprocedure('private.guard_document_object_delete()') is not null)::text),
  (51, '011/5', 'Eigene Trigger auf storage.objects',
       (select coalesce(string_agg(tgname || ' [' || tgenabled || ']', ', ' order by tgname), 'keine')
          from pg_trigger
         where tgrelid = to_regclass('storage.objects') and not tgisinternal)),
  (52, '011/5', 'TRIGGER-Recht auf storage.objects -> entscheidet ueber CREATE TRIGGER',
       has_table_privilege(current_user, 'storage.objects', 'TRIGGER')::text),
  (53, '011/5', 'Mitglied im Eigentuemer USAGE -> entscheidet ueber CREATE POLICY',
       (select pg_has_role(current_user, relowner, 'USAGE')::text
          from pg_class where oid = to_regclass('storage.objects'))),
  (54, '011/5', 'Eigentuemer storage.objects',
       (select pg_get_userbyid(relowner)::text
          from pg_class where oid = to_regclass('storage.objects'))),

  -- --- 011 Abschnitt 6: Sperr-Trigger auf den Verknuepfungswegen ---------
  (60, '011/6', 'private.lock_document_object() vorhanden',
       (to_regprocedure('private.lock_document_object()') is not null)::text),
  (61, '011/6', 'Trigger document_submissions_lock_object vorhanden',
       (exists (select 1 from pg_trigger
                 where tgrelid = to_regclass('public.document_submissions')
                   and tgname = 'document_submissions_lock_object'))::text),
  (62, '011/6', 'Trigger employee_documents_lock_object vorhanden',
       (exists (select 1 from pg_trigger
                 where tgrelid = to_regclass('public.employee_documents')
                   and tgname = 'employee_documents_lock_object'))::text),

  -- --- 011 Abschnitt 7: Insert-Policy document_submissions ---------------
  (70, '011/7', 'WITH CHECK von document_submissions_employee_insert',
       coalesce((select with_check from pg_policies
                  where schemaname = 'public' and tablename = 'document_submissions'
                    and policyname = 'document_submissions_employee_insert'),
                '(Policy fehlt)')),
  (71, '011/7', 'INSERT-Policies auf document_submissions',
       (select coalesce(string_agg(policyname, ', ' order by policyname), 'keine')
          from pg_policies
         where schemaname = 'public' and tablename = 'document_submissions' and cmd = 'INSERT')),

  -- --- 011 Abschnitt 8: Vorgangsschluessel Krankmeldung ------------------
  (80, '011/8', 'Spalte sickness_reports.client_request_id vorhanden',
       (exists (select 1 from pg_attribute
                 where attrelid = to_regclass('public.sickness_reports')
                   and attname = 'client_request_id' and attnum > 0 and not attisdropped))::text),
  (81, '011/8', 'Index uq_sickness_reports_client_request vorhanden',
       (to_regclass('public.uq_sickness_reports_client_request') is not null)::text),
  (82, '011/8', 'WITH CHECK von sickness_reports_employee_insert',
       coalesce((select with_check from pg_policies
                  where schemaname = 'public' and tablename = 'sickness_reports'
                    and policyname = 'sickness_reports_employee_insert'),
                '(Policy fehlt)')),
  (83, '011/8', 'INSERT-Policies auf sickness_reports',
       (select coalesce(string_agg(policyname, ', ' order by policyname), 'keine')
          from pg_policies
         where schemaname = 'public' and tablename = 'sickness_reports' and cmd = 'INSERT')),

  -- --- 011 Abschnitt 10: Index fuer den Dokumenteingang ------------------
  (90, '011/10', 'Index idx_document_submissions_submitted_at vorhanden',
       (to_regclass('public.idx_document_submissions_submitted_at') is not null)::text),

  -- --- Bestandsdaten: was haengt an den geaenderten Regeln? --------------
  -- Eine leere Tabelle ist kein Nachweis fuer irgendetwas. Diese Zahlen
  -- sagen nur, wie viele vorhandene Zeilen von den neuen Triggern und
  -- Policies betroffen waeren.
  (95, 'Bestand', 'Zeilen in document_submissions / davon mit file_path',
       (select concat_ws(' / ', count(*)::text, count(file_path)::text)
          from public.document_submissions)),
  (96, 'Bestand', 'Zeilen in employee_documents / davon mit file_path',
       (select concat_ws(' / ', count(*)::text, count(file_path)::text)
          from public.employee_documents)),
  (97, 'Bestand', 'Zeilen in sickness_reports',
       (select count(*)::text from public.sickness_reports)),
  (98, 'Bestand', 'file_path-Werte, die auf kein Storage-Objekt zeigen',
       (select count(*)::text
          from (select file_path from public.document_submissions where file_path is not null
                union
                select file_path from public.employee_documents  where file_path is not null) as p
         where not exists (select 1 from storage.objects as o
                            where o.bucket_id = 'employee-documents' and o.name = p.file_path)))

) as t(nr, abschnitt, posten, wert)
order by nr;
