-- ===========================================================================
-- Schritt 07b - Kontrollabfrage zum Policy-Stand auf storage.objects
-- ===========================================================================
--
-- REIN LESEND. Ein einziges select. Aendert nichts.
--
-- WARUM NACHTRAEGLICH UND ALS ABFRAGE
--   Schritt 06 und Schritt 07 pruefen dasselbe bereits vor ihrem commit -
--   aber ueber "raise exception" und "raise notice". Der Supabase SQL Editor
--   zeigt NOTICE-Zeilen nicht an; er meldet nur "Success. No rows returned".
--   Sichtbar wird ein bestandener Lauf damit nur ueber eine Abfrage, die
--   Zeilen zurueckgibt. Genau das ist diese Datei.
--
-- WAS SIE NICHT IST
--   Kein Ersatz fuer die Kontrollen in 06 und 07. Die laufen INNERHALB der
--   jeweiligen Transaktion und koennen zurueckrollen. Diese hier laeuft
--   danach und stellt nur fest, was steht.
--
-- WARUM SIE AUF ANON, PUBLIC, UPDATE UND ALL SO GENAU SCHAUT
--   Die Tabellenrechte auf storage.objects bleiben unveraendert: es sind
--   Plattform-Grants von supabase_storage_admin, und authenticated wie anon
--   tragen dort den vollen Satz. Die EINZIGE Schranke ist damit RLS - und RLS
--   wirkt nur ueber Policies. Konkret heisst das:
--     - Eine Policy fuer anon oder PUBLIC macht den Bucket ueber den
--       Anon-Key erreichbar. "to public" gilt fuer JEDE Rolle.
--     - Eine UPDATE-Policy erlaubt das Ueberschreiben vorhandener Dateien.
--     - Eine ALL-Policy deckt SELECT, INSERT, UPDATE und DELETE gemeinsam ab,
--       ohne dass in pg_policies.cmd jemals 'UPDATE' oder 'DELETE' steht.
--   Siehe CLAUDE.md, "Plattform-Grants auf storage.objects und
--   storage.buckets".
--
-- WAS SIE NICHT BEANTWORTET
--   Ob TRUNCATE, REFERENCES, TRIGGER oder MAINTAIN erreichbar sind. RLS
--   erfasst diese vier Rechte NICHT, und der BEFORE-DELETE-Trigger feuert bei
--   TRUNCATE ebenfalls nicht. Dass sie ueber keine exponierte Schnittstelle
--   erreichbar sind, ist eine Ableitung aus der Architektur und KEIN Messwert.
--   Diese Abfrage misst sie deshalb nicht und stellt sie auch nicht als
--   "RLS-geschuetzt" dar.
--
-- LESART
--   Spalte "ergebnis" muss in allen Zeilen OK lauten. Jede Zeile mit
--   ABWEICHUNG ist ein Befund, kein Schoenheitsfehler.
-- ===========================================================================

select
  p.nr,
  p.pruefung,
  p.erwartet,
  p.gemessen,
  case when p.erfuellt then 'OK' else 'ABWEICHUNG' end as ergebnis
from (

  -- --- 1) Genau die vier Policies aus 011, keine weitere -------------------
  select 1 as nr,
    'Policies auf storage.objects' as pruefung,
    'genau die vier aus 011' as erwartet,
    coalesce((select string_agg(policyname, ', ' order by policyname)
                from pg_policies
               where schemaname = 'storage' and tablename = 'objects'),
             '(keine)') as gemessen,
    (select coalesce(array_agg(policyname order by policyname), '{}'::name[])
       from pg_policies
      where schemaname = 'storage' and tablename = 'objects')
      = array['employee_documents_delete_unlinked',
              'employee_documents_insert_own',
              'employee_documents_select_admin',
              'employee_documents_select_own']::name[] as erfuellt

  union all
  -- --- 2) Keine Policy fuer anon oder PUBLIC ------------------------------
  --     "to public" gilt fuer jede Rolle, anon eingeschlossen.
  select 2, 'Policies fuer anon oder PUBLIC', 'keine',
    coalesce((select string_agg(policyname || ' (' || array_to_string(roles, ', ') || ')',
                                ', ' order by policyname)
                from pg_policies
               where schemaname = 'storage' and tablename = 'objects'
                 and roles && array['anon', 'public']::name[]),
             '(keine)'),
    not exists (select 1 from pg_policies
                 where schemaname = 'storage' and tablename = 'objects'
                   and roles && array['anon', 'public']::name[])

  union all
  -- --- 3) Alle Policies gelten ausschliesslich fuer authenticated ---------
  select 3, 'Rollenliste je Policy', 'ueberall nur authenticated',
    coalesce((select string_agg(distinct array_to_string(roles, ', '), ' | ')
                from pg_policies
               where schemaname = 'storage' and tablename = 'objects'),
             '(keine Policy)'),
    not exists (select 1 from pg_policies
                 where schemaname = 'storage' and tablename = 'objects'
                   and roles <> array['authenticated']::name[])

  union all
  -- --- 4) Keine UPDATE-Policy --------------------------------------------
  --     Das Tabellenrecht UPDATE besitzt authenticated als Plattform-Grant
  --     weiter. Gesperrt ist das Ueberschreiben allein dadurch, dass es keine
  --     UPDATE-Policy gibt. Am 14.09.2026 gegen die echte Storage-API des
  --     Testprojekts nachgewiesen (supabase/tests/storage-api/).
  select 4, 'UPDATE-Policies', 'keine',
    (select count(*)::text from pg_policies
      where schemaname = 'storage' and tablename = 'objects' and cmd = 'UPDATE'),
    not exists (select 1 from pg_policies
                 where schemaname = 'storage' and tablename = 'objects'
                   and cmd = 'UPDATE')

  union all
  -- --- 5) Keine ALL-Policy ------------------------------------------------
  select 5, 'ALL-Policies (for all)', 'keine',
    (select count(*)::text from pg_policies
      where schemaname = 'storage' and tablename = 'objects' and cmd = 'ALL'),
    not exists (select 1 from pg_policies
                 where schemaname = 'storage' and tablename = 'objects'
                   and cmd = 'ALL')

  union all
  -- --- 6) Genau eine DELETE-Policy ----------------------------------------
  --     Permissive Policies verknuepfen mit ODER. Eine zweite koennte das
  --     Loeschrecht nur erweitern.
  select 6, 'DELETE-Policies', 'genau eine',
    (select count(*)::text from pg_policies
      where schemaname = 'storage' and tablename = 'objects' and cmd = 'DELETE'),
    (select count(*) from pg_policies
      where schemaname = 'storage' and tablename = 'objects' and cmd = 'DELETE') = 1

  union all
  -- --- 7) Jede Policy ist auf den Bucket eingeschraenkt -------------------
  --     Ohne diese Einschraenkung gaelte sie fuer den gesamten Objektspeicher.
  select 7, 'Bucketfilter in jeder Policy', 'ueberall vorhanden',
    coalesce((select string_agg(policyname, ', ' order by policyname)
                from pg_policies
               where schemaname = 'storage' and tablename = 'objects'
                 and coalesce(qual, '') || coalesce(with_check, '')
                     not like '%employee-documents%'),
             '(keine Policy ohne Bucketfilter)'),
    not exists (select 1 from pg_policies
                 where schemaname = 'storage' and tablename = 'objects'
                   and coalesce(qual, '') || coalesce(with_check, '')
                       not like '%employee-documents%')

  union all
  -- --- 8) Die DELETE-Policy prueft die Verknuepfung -----------------------
  select 8, 'employee_documents_delete_unlinked prueft is_unlinked_document',
    'ja',
    coalesce((select case when qual like '%is_unlinked_document%' then 'ja' else 'NEIN' end
                from pg_policies
               where schemaname = 'storage' and tablename = 'objects'
                 and policyname = 'employee_documents_delete_unlinked'),
             '(Policy fehlt)'),
    exists (select 1 from pg_policies
             where schemaname = 'storage' and tablename = 'objects'
               and policyname = 'employee_documents_delete_unlinked'
               and qual like '%is_unlinked_document%')

  union all
  -- --- 9) Der Loeschschutz-Trigger steht und feuert -----------------------
  select 9, 'Trigger storage_objects_guard_delete', 'vorhanden und aktiv',
    coalesce((select case t.tgenabled
                       when 'O' then 'aktiv'
                       when 'D' then 'DEAKTIVIERT'
                       when 'R' then 'nur Replika'
                       when 'A' then 'immer aktiv'
                       else t.tgenabled::text end
                from pg_trigger as t
               where t.tgrelid = to_regclass('storage.objects')
                 and t.tgname = 'storage_objects_guard_delete'
                 and not t.tgisinternal),
             '(fehlt)'),
    exists (select 1 from pg_trigger as t
             where t.tgrelid = to_regclass('storage.objects')
               and t.tgname = 'storage_objects_guard_delete'
               and not t.tgisinternal
               and t.tgenabled in ('O', 'A'))

  union all
  -- --- 10) Die beiden Plattform-Trigger sind unberuehrt -------------------
  select 10, 'Plattform-Trigger auf storage.objects', 'beide vorhanden',
    coalesce((select string_agg(t.tgname::text, ', ' order by t.tgname)
                from pg_trigger as t
               where t.tgrelid = to_regclass('storage.objects')
                 and not t.tgisinternal
                 and t.tgname in ('protect_objects_delete',
                                  'update_objects_updated_at')),
             '(keiner)'),
    (select count(*) from pg_trigger as t
      where t.tgrelid = to_regclass('storage.objects')
        and not t.tgisinternal
        and t.tgname in ('protect_objects_delete',
                         'update_objects_updated_at')) = 2

  union all
  -- --- 11) RLS ist aktiv --------------------------------------------------
  --     Ohne RLS waeren alle Policies wirkungslos und die Plattform-Grants
  --     allein massgeblich.
  select 11, 'RLS auf storage.objects', 'aktiv',
    coalesce((select case when c.relrowsecurity then 'aktiv' else 'AUS' end
                from pg_class as c where c.oid = to_regclass('storage.objects')),
             '(Tabelle fehlt)'),
    coalesce((select c.relrowsecurity
                from pg_class as c where c.oid = to_regclass('storage.objects')),
             false)

  union all
  -- --- 12) Der Bucket ist privat ------------------------------------------
  select 12, 'Bucket employee-documents', 'privat (public = false)',
    coalesce((select case when b.public then 'OEFFENTLICH' else 'privat' end
                from storage.buckets as b where b.id = 'employee-documents'),
             '(Bucket fehlt)'),
    coalesce((select not b.public
                from storage.buckets as b where b.id = 'employee-documents'),
             false)

) as p
order by p.nr;
