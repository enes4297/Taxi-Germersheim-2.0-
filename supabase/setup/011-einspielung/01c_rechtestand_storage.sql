-- ===========================================================================
-- Schritt 01c - Messung: Rechtestand auf storage.objects
-- ===========================================================================
--
-- REIN LESEND. Ein einziges select. Aendert nichts.
--
-- WOZU
--   Diese Abfrage haelt fest, welche Tabellenrechte auf storage.objects
--   tatsaechlich gelten. Sie ist eine MESSUNG fuer die Dokumentation, kein
--   Einspielschritt. Es gibt nichts, was danach anders waere.
--
-- FRUEHER WAR DAS 04b
--   Es gab einmal einen Schritt 04, der authenticated das UPDATE und anon
--   alle Rechte auf storage.objects entziehen sollte; diese Abfrage war seine
--   Vorher/Nachher-Kontrolle. Schritt 04 ist entfallen. Supabase fuehrt
--   "Revoking privileges on tables in these schemas from API roles (e.g.
--   anon)" seit dem 21.04.2025 ausdruecklich unter dem, was NICHT mehr
--   moeglich ist. Ein revoke dort laeuft ohne Fehler und ohne Warnung durch
--   und bewirkt nichts.
--   Einen Weg ueber das Dashboard gibt es dafuer ebenfalls nicht - die
--   frueher an dieser Stelle behauptete Dashboard-Anleitung war falsch.
--   Geregelt wird der Zugriff stattdessen ueber den privaten Bucket und die
--   Policies der Schritte 06 und 07. Siehe CLAUDE.md, Abschnitt
--   "Plattform-Grants auf storage.objects und storage.buckets".
--
-- WANN AUSFUEHREN
--   Einmal, wann immer der Rechtestand belegt werden soll. Ein Vorher/Nachher
--   ist nicht mehr noetig, weil kein Schritt diese Rechte anfasst.
--
-- LESART DER SPALTE "bewertung"
--   OK           - so erwartet.
--   PLATTFORM    - Das Recht besteht, stammt von supabase_storage_admin und
--                  wird von uns nicht angetastet. Kein Mangel, sondern der
--                  vereinbarte Zustand. Die Schranke ist RLS, nicht der Grant.
--                  ACHTUNG: RLS erfasst SELECT, INSERT, UPDATE, DELETE und
--                  MERGE. TRUNCATE, REFERENCES, TRIGGER und MAINTAIN erfasst
--                  sie NICHT, und der BEFORE-DELETE-Trigger feuert bei
--                  TRUNCATE ebenfalls nicht. Diese Zeilen duerfen deshalb
--                  nicht als "RLS-geschuetzt" gelesen werden.
--   ABWEICHUNG   - so nicht erwartet, nachgehen.
--   UNVERAENDERT HALTEN - keine Zielvorgabe, nur Beobachtung.
-- ===========================================================================

select
  z.nr,
  z.rolle,
  z.recht,
  z.hat_recht,
  z.herkunft,
  z.bewertung
from (
  -- --- authenticated: SELECT, INSERT, DELETE sollen da sein ---------------
  select
    1 as nr, 'authenticated' as rolle, 'SELECT' as recht,
    has_table_privilege('authenticated', 'storage.objects', 'SELECT') as hat_recht,
    coalesce((select string_agg(distinct a.grantor::regrole::text, ', ')
                from pg_class as c
                cross join lateral aclexplode(c.relacl) as a
               where c.oid = to_regclass('storage.objects')
                 and a.grantee = 'authenticated'::regrole
                 and a.privilege_type = 'SELECT'), '(kein Eintrag)') as herkunft,
    case when has_table_privilege('authenticated', 'storage.objects', 'SELECT')
         then 'OK' else 'ABWEICHUNG' end as bewertung

  union all
  select 2, 'authenticated', 'INSERT',
    has_table_privilege('authenticated', 'storage.objects', 'INSERT'),
    coalesce((select string_agg(distinct a.grantor::regrole::text, ', ')
                from pg_class as c
                cross join lateral aclexplode(c.relacl) as a
               where c.oid = to_regclass('storage.objects')
                 and a.grantee = 'authenticated'::regrole
                 and a.privilege_type = 'INSERT'), '(kein Eintrag)'),
    case when has_table_privilege('authenticated', 'storage.objects', 'INSERT')
         then 'OK' else 'ABWEICHUNG' end

  union all
  select 3, 'authenticated', 'DELETE',
    has_table_privilege('authenticated', 'storage.objects', 'DELETE'),
    coalesce((select string_agg(distinct a.grantor::regrole::text, ', ')
                from pg_class as c
                cross join lateral aclexplode(c.relacl) as a
               where c.oid = to_regclass('storage.objects')
                 and a.grantee = 'authenticated'::regrole
                 and a.privilege_type = 'DELETE'), '(kein Eintrag)'),
    case when has_table_privilege('authenticated', 'storage.objects', 'DELETE')
         then 'OK' else 'ABWEICHUNG' end

  union all
  -- --- authenticated: UPDATE besteht als Plattform-Grant weiter.
  --     Gesperrt wird das Ueberschreiben nicht ueber dieses Recht, sondern
  --     dadurch, dass es KEINE UPDATE-Policy gibt. Am 14.09.2026 gegen die
  --     echte Storage-API des Testprojekts nachgewiesen.
  select 4, 'authenticated', 'UPDATE (Plattform-Grant)',
    has_table_privilege('authenticated', 'storage.objects', 'UPDATE'),
    coalesce((select string_agg(distinct a.grantor::regrole::text, ', ')
                from pg_class as c
                cross join lateral aclexplode(c.relacl) as a
               where c.oid = to_regclass('storage.objects')
                 and a.grantee = 'authenticated'::regrole
                 and a.privilege_type = 'UPDATE'), '(kein Eintrag)'),
    case when has_table_privilege('authenticated', 'storage.objects', 'UPDATE')
         then 'PLATTFORM' else 'OK' end

  union all
  -- --- anon: Plattform-Grants bestehen; wir vergeben dort nichts dazu ------
  --     Die Schranke ist, dass es KEINE Policy fuer anon oder PUBLIC gibt.
  --     Ohne Policy verweigert RLS jeden Zugriff.
  select 5, 'anon', 'Plattform-Grants (wir vergeben nichts dazu)',
    (has_table_privilege('anon', 'storage.objects', 'SELECT')
     or has_table_privilege('anon', 'storage.objects', 'INSERT')
     or has_table_privilege('anon', 'storage.objects', 'UPDATE')
     or has_table_privilege('anon', 'storage.objects', 'DELETE')),
    coalesce((select string_agg(distinct a.grantor::regrole::text, ', ')
                from pg_class as c
                cross join lateral aclexplode(c.relacl) as a
               where c.oid = to_regclass('storage.objects')
                 and a.grantee = 'anon'::regrole), '(kein Eintrag)'),
    case when (has_table_privilege('anon', 'storage.objects', 'SELECT')
            or has_table_privilege('anon', 'storage.objects', 'INSERT')
            or has_table_privilege('anon', 'storage.objects', 'UPDATE')
            or has_table_privilege('anon', 'storage.objects', 'DELETE'))
         then 'PLATTFORM' else 'OK' end

  union all
  -- --- service_role und postgres: reine Beobachtung, kein Ziel -------------
  --     Kein Schritt dieses Ablaufs fasst diese Rechte an. Die Zeilen stehen
  --     hier, damit der Rechtestand vollstaendig dokumentiert ist.
  select 6, 'service_role', 'alle vorhandenen',
    null::boolean,
    coalesce((select string_agg(a.privilege_type || ' von ' || a.grantor::regrole::text
                                || case when a.is_grantable then ' (weitergebbar)' else '' end,
                                ', ' order by a.privilege_type)
                from pg_class as c
                cross join lateral aclexplode(c.relacl) as a
               where c.oid = to_regclass('storage.objects')
                 and a.grantee = 'service_role'::regrole), '(kein Eintrag)'),
    'UNVERAENDERT HALTEN'

  union all
  -- Hier steht bewusst current_user und nicht der feste Name 'postgres'.
  -- Im Projekt ist das dasselbe; im oertlichen Nachbau heisst die Rolle
  -- anders, und mit dem festen Namen haette die Zeile dort immer
  -- "(kein Eintrag)" gemeldet - ein Messfehler, kein Befund.
  select 7, current_user, 'alle vorhandenen',
    null::boolean,
    coalesce((select string_agg(a.privilege_type || ' von ' || a.grantor::regrole::text
                                || case when a.is_grantable then ' (weitergebbar)' else '' end,
                                ', ' order by a.privilege_type)
                from pg_class as c
                cross join lateral aclexplode(c.relacl) as a
               where c.oid = to_regclass('storage.objects')
                 and a.grantee = current_user::regrole), '(kein Eintrag)'),
    'UNVERAENDERT HALTEN'

  union all
  -- --- Der Riegel, der unabhaengig von allen Rechten wirkt -----------------
  select 8, '(Tabelle)', 'RLS aktiv',
    (select c.relrowsecurity from pg_class as c where c.oid = to_regclass('storage.objects')),
    'Policies auf storage.objects: '
      || (select count(*)::text from pg_policies
           where schemaname = 'storage' and tablename = 'objects'),
    case when (select c.relrowsecurity from pg_class as c
                where c.oid = to_regclass('storage.objects'))
         then 'OK' else 'ABWEICHUNG' end
) as z
order by z.nr;
