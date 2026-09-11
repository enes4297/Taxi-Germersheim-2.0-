-- ===========================================================================
-- Diagnose: Welche Eingriffe auf storage sind in diesem Projekt moeglich?
-- ===========================================================================
--
-- EINE Abfrage, REIN LESEND. Aendert nichts, legt nichts an, loescht nichts.
-- Im Supabase SQL Editor des TESTPROJEKTS ausfuehren und die Ausgabe
-- zurueckmelden.
--
-- Beantwortet zugleich, ob der abgebrochene Durchlauf Reste hinterlassen hat:
-- Die Posten 20 bis 23 muessen bei einem sauberen Ruecklauf alle leer bzw.
-- 0 sein.
-- ===========================================================================

select nr, posten, wert
from (values

  -- --- Wer bin ich? ------------------------------------------------------
  ( 1, 'Rolle (current_user)',
       current_user::text),
  ( 2, 'Sitzungsrolle (session_user)',
       session_user::text),
  ( 3, 'Rolle erbt Rechte (rolinherit)',
       (select rolinherit::text from pg_roles where rolname = current_user)),
  ( 4, 'Rolle ist Superuser',
       (select rolsuper::text from pg_roles where rolname = current_user)),
  ( 5, 'Rolle umgeht RLS (rolbypassrls)',
       (select rolbypassrls::text from pg_roles where rolname = current_user)),

  -- --- Eigentum und Mitgliedschaft ---------------------------------------
  ( 6, 'Eigentuemer storage.objects',
       (select pg_get_userbyid(relowner)::text from pg_class where oid = to_regclass('storage.objects'))),
  ( 7, 'Eigentuemer storage.buckets',
       (select pg_get_userbyid(relowner)::text from pg_class where oid = to_regclass('storage.buckets'))),
  ( 8, 'Mitglied im Eigentuemer, USAGE  -> entscheidet ueber CREATE POLICY',
       (select pg_has_role(current_user, relowner, 'USAGE')::text from pg_class where oid = to_regclass('storage.objects'))),
  ( 9, 'Mitglied im Eigentuemer, MEMBER -> nur per SET ROLE erreichbar',
       (select pg_has_role(current_user, relowner, 'MEMBER')::text from pg_class where oid = to_regclass('storage.objects'))),

  -- --- Einzelrechte auf storage.objects ----------------------------------
  (10, 'TRIGGER-Recht auf storage.objects -> entscheidet ueber CREATE TRIGGER',
       has_table_privilege(current_user, 'storage.objects', 'TRIGGER')::text),
  (11, 'SELECT / INSERT / UPDATE / DELETE auf storage.objects',
       concat_ws(' / ',
         has_table_privilege(current_user, 'storage.objects', 'SELECT')::text,
         has_table_privilege(current_user, 'storage.objects', 'INSERT')::text,
         has_table_privilege(current_user, 'storage.objects', 'UPDATE')::text,
         has_table_privilege(current_user, 'storage.objects', 'DELETE')::text)),
  (12, 'SELECT / INSERT / UPDATE auf storage.buckets',
       concat_ws(' / ',
         has_table_privilege(current_user, 'storage.buckets', 'SELECT')::text,
         has_table_privilege(current_user, 'storage.buckets', 'INSERT')::text,
         has_table_privilege(current_user, 'storage.buckets', 'UPDATE')::text)),

  -- --- Rechte der Anwendungsrollen ---------------------------------------
  (13, 'authenticated auf storage.objects: SELECT/INSERT/UPDATE/DELETE',
       concat_ws(' / ',
         has_table_privilege('authenticated', 'storage.objects', 'SELECT')::text,
         has_table_privilege('authenticated', 'storage.objects', 'INSERT')::text,
         has_table_privilege('authenticated', 'storage.objects', 'UPDATE')::text,
         has_table_privilege('authenticated', 'storage.objects', 'DELETE')::text)),
  (14, 'anon auf storage.objects: SELECT/INSERT/UPDATE/DELETE',
       concat_ws(' / ',
         has_table_privilege('anon', 'storage.objects', 'SELECT')::text,
         has_table_privilege('anon', 'storage.objects', 'INSERT')::text,
         has_table_privilege('anon', 'storage.objects', 'UPDATE')::text,
         has_table_privilege('anon', 'storage.objects', 'DELETE')::text)),

  -- --- Aktueller Zustand des Schemas storage ------------------------------
  (15, 'RLS auf storage.objects aktiv',
       (select relrowsecurity::text from pg_class where oid = to_regclass('storage.objects'))),
  (16, 'RLS auf storage.buckets aktiv',
       (select relrowsecurity::text from pg_class where oid = to_regclass('storage.buckets'))),
  (17, 'Policies auf storage.objects',
       (select coalesce(string_agg(policyname, ', ' order by policyname), 'keine')
          from pg_policies where schemaname = 'storage' and tablename = 'objects')),
  (18, 'Eigene Trigger auf storage.objects',
       (select coalesce(string_agg(tgname, ', ' order by tgname), 'keine')
          from pg_trigger where tgrelid = to_regclass('storage.objects') and not tgisinternal)),
  (19, 'Vorhandene Buckets',
       (select coalesce(string_agg(id, ', ' order by id), 'keine') from storage.buckets)),

  -- --- Ruecklauf-Kontrolle: hat der Abbruch Reste hinterlassen? -----------
  -- Bei sauberem Ruecklauf in einem leeren Projekt: 0, 0, keine, keine.
  (20, 'Tabellen im Schema public (erwartet 0 bei sauberem Ruecklauf)',
       (select count(*)::text from pg_class c join pg_namespace n on n.oid = c.relnamespace
         where n.nspname = 'public' and c.relkind = 'r')),
  (21, 'Schema private vorhanden (erwartet false)',
       (select (count(*) > 0)::text from pg_namespace where nspname = 'private')),
  (22, 'Tabelle public.document_types vorhanden (erwartet false)',
       (to_regclass('public.document_types') is not null)::text),
  (23, 'Funktionen im Schema private (erwartet 0)',
       (select count(*)::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'private'))

) as t(nr, posten, wert)
order by nr;
