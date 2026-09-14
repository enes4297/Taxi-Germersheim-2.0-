-- ===========================================================================
-- Schritt 06 - Policies fuer Hochladen und Lesen auf storage.objects
-- ===========================================================================
--
-- Abschnitt 4b der Migration 011, ohne die DELETE-Policy, plus die beiden
-- Policy-Kommentare aus Abschnitt 10.
--
-- WAS HIER ENTSTEHT
--   employee_documents_insert_own    Hochladen in den eigenen Ordner
--   employee_documents_select_own    Lesen der eigenen Dateien
--   employee_documents_select_admin  Lesen aller Nachweise durch aktive Admins
--
-- WAS HIER AUSDRUECKLICH NICHT ENTSTEHT
--   Kein Loeschzugriff. Die DELETE-Policy kommt erst in Schritt 07 - und zwar
--   NACH dem Loeschschutz-Trigger aus Schritt 05. Diese Reihenfolge ist nicht
--   kosmetisch: erst der Schutz, dann das Recht. Umgekehrt gaebe es ein
--   Zeitfenster, in dem Dateien ohne die Pruefung entfernt werden koennen.
--   Ebenso keine UPDATE-Policy und keine ALL-Policy. Dateien werden nicht
--   ueberschrieben, und eine ALL-Policy wuerde stillschweigend auch UPDATE
--   und DELETE mit abdecken.
--   Ebenso keine Policy fuer anon oder PUBLIC. Die Plattform-Grants auf
--   storage.objects bleiben unveraendert - die Schranke ist allein RLS, und
--   ohne Policy verweigert RLS jeden Zugriff. Siehe CLAUDE.md, Abschnitt
--   "Plattform-Grants auf storage.objects und storage.buckets".
--
-- ZUR EIGENTUEMERSCHAFT - BITTE GENAU LESEN
--   create policy verlangt Eigentuemerschaft an der Tabelle. storage.objects
--   gehoert supabase_storage_admin. Der Katalogwert pg_has_role(..., 'USAGE')
--   sagt dazu etwas - aber er ist eine VORHERSAGE, kein Beweis. Im
--   Testprojekt war diese Vorhersage falsch: dort stand USAGE auf false und
--   create policy gelang trotzdem.
--   Deshalb wird hier gemessen und gemeldet, aber nicht abgebrochen. Der
--   verbindliche Befund ist der Versuch selbst. Scheitert er, bricht
--   PostgreSQL mit 42501 ab, die gesamte Transaktion faellt zurueck und es
--   ist nichts geaendert. Dann fuehrt der Weg ueber das Dashboard, siehe
--   storage-policies-dashboard.md.
--
-- PERMISSIVE POLICIES VERKNUEPFEN MIT ODER
--   Nach diesem Schritt gibt es ZWEI SELECT-Policies. Das ist so gewollt:
--   eigene Dateien ODER Admin. Eine zusaetzliche fremde Policy koennte den
--   Zugriff aber nur ERWEITERN, niemals einschraenken. Die Vorpruefung bricht
--   deshalb ab, sobald auf storage.objects eine Policy steht, die nicht aus
--   011 stammt.
--
-- RUECKWEG: siehe 90_rueckweg.sql. Die Ausgangs-Policies stehen in der
-- Sicherung aus Schritt 01, Bereich "Policy".
-- ===========================================================================

begin;

-- --- Vorpruefung -----------------------------------------------------------
do $$
declare
  v_eigentuemer text;
  v_fremde      text;
  v_vorhanden   text;
begin
  -- 1) Voraussetzungen aus den frueheren Schritten.
  if to_regprocedure('private.is_active_employee()') is null then
    raise exception 'ABBRUCH: private.is_active_employee() fehlt. Erst Schritt 02 ausfuehren.';
  end if;
  if to_regprocedure('private.is_admin()') is null then
    raise exception 'ABBRUCH: private.is_admin() fehlt. Diese Funktion stammt aus einer frueheren Migration.';
  end if;
  if to_regprocedure('storage.foldername(text)') is null then
    raise exception 'ABBRUCH: storage.foldername(text) fehlt. Ohne sie greift keine der Pfadpruefungen.';
  end if;
  if not exists (select 1 from storage.buckets where id = 'employee-documents') then
    raise exception 'ABBRUCH: Bucket employee-documents fehlt. Erst Schritt 03 ausfuehren.';
  end if;

  -- 2) Grants muessen schon stehen. Grants greifen vor RLS - eine Policy auf
  --    eine Tabelle ohne Grant bewirkt nichts. Diese Grants stammen von der
  --    Plattform; kein Schritt dieses Ablaufs vergibt oder entzieht sie.
  --    Fehlen sie wider Erwarten, ist das ein Befund am Projekt und kein
  --    vergessener Schritt.
  if not has_table_privilege('authenticated', 'storage.objects', 'SELECT')
     or not has_table_privilege('authenticated', 'storage.objects', 'INSERT') then
    raise exception 'ABBRUCH: authenticated fehlt SELECT oder INSERT auf storage.objects. Das sind Plattform-Grants; dieser Ablauf ergaenzt sie nicht. Erst 01c_rechtestand_storage.sql fahren und klaeren, warum sie fehlen.';
  end if;

  -- 3) RLS muss aktiv sein, sonst waeren die Policies wirkungslos und der
  --    Zugriff durch die Grants allein bereits offen.
  if not (select relrowsecurity from pg_class where oid = to_regclass('storage.objects')) then
    raise exception 'ABBRUCH: RLS auf storage.objects ist nicht aktiv. Policies waeren wirkungslos.';
  end if;

  -- 4) Keine fremde Policy auf storage.objects. Permissive Policies
  --    verknuepfen mit ODER - eine unbekannte Policy koennte den Zugriff nur
  --    ausweiten.
  select string_agg(policyname, ', ' order by policyname) into v_fremde
  from pg_policies
  where schemaname = 'storage' and tablename = 'objects'
    and policyname not in ('employee_documents_insert_own',
                           'employee_documents_select_own',
                           'employee_documents_select_admin',
                           'employee_documents_delete_own',
                           'employee_documents_delete_unlinked');
  if v_fremde is not null then
    raise exception 'ABBRUCH: Auf storage.objects stehen Policies, die nicht aus 011 stammen: %. Permissive Policies verknuepfen mit ODER - sie koennten den Zugriff ausweiten. Erst klaeren, wofuer sie da sind.', v_fremde;
  end if;

  -- 5) Was von 011 steht schon da? Nur melden - die drei Policies dieses
  --    Schritts werden gleich ohnehin neu gesetzt.
  select coalesce(string_agg(policyname, ', ' order by policyname), 'keine') into v_vorhanden
  from pg_policies where schemaname = 'storage' and tablename = 'objects';
  raise notice 'Policies auf storage.objects vorher: %', v_vorhanden;

  -- 6) Die Eigentuemerfrage messen und melden - NICHT abbrechen.
  select pg_get_userbyid(relowner)::text into v_eigentuemer
  from pg_class where oid = to_regclass('storage.objects');
  raise notice 'Eigentuemer storage.objects: %. Ausfuehrende Rolle: %. Mitglied im Eigentuemer (USAGE): %.',
    v_eigentuemer, current_user, pg_has_role(current_user, v_eigentuemer, 'USAGE');
  if not pg_has_role(current_user, v_eigentuemer, 'USAGE') then
    raise notice 'HINWEIS: Laut Katalog ist % kein Mitglied von %. Das ist eine Vorhersage, kein Beweis - im Testprojekt gelang create policy trotz USAGE=false. Der Versuch laeuft jetzt. Scheitert er mit 42501, faellt alles zurueck.', current_user, v_eigentuemer;
  end if;

  raise notice 'Vorpruefung bestanden.';
end
$$;


-- --- 011 Abschnitt 4b, ohne DELETE ----------------------------------------
-- Nur die drei Policies dieses Schritts werden geraeumt. Eine vorhandene
-- DELETE-Policy wird hier NICHT angefasst - sie gehoert zu Schritt 07, und
-- ihr Entfernen waere ein Eingriff in den Loeschzugriff.
drop policy if exists employee_documents_insert_own   on storage.objects;
drop policy if exists employee_documents_select_own   on storage.objects;
drop policy if exists employee_documents_select_admin on storage.objects;

-- Hochladen: eigener Ordner UND aktive Mitarbeiterberechtigung.
create policy employee_documents_insert_own
  on storage.objects
  as permissive
  for insert
  to authenticated
  with check (
    bucket_id = 'employee-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and private.is_active_employee()
  );

-- Lesen: eigene Dateien, ebenfalls nur mit aktiver Mitarbeiterberechtigung.
create policy employee_documents_select_own
  on storage.objects
  as permissive
  for select
  to authenticated
  using (
    bucket_id = 'employee-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and private.is_active_employee()
  );

-- Lesen: aktive Admins duerfen alle Nachweise im Bucket ansehen.
-- Bleibt unveraendert und unabhaengig von is_active_employee().
create policy employee_documents_select_admin
  on storage.objects
  as permissive
  for select
  to authenticated
  using (
    bucket_id = 'employee-documents'
    and private.is_admin()
  );

-- Die beiden Policy-Kommentare aus 011 Abschnitt 10.
comment on policy employee_documents_insert_own on storage.objects is
  'Upload nur in den eigenen Ordner und nur mit aktiver Mitarbeiterberechtigung (011).';
comment on policy employee_documents_select_admin on storage.objects is
  'Aktive Admins duerfen alle Nachweise im Bucket lesen (011).';


-- --- Kontrolle - NOCH VOR DEM COMMIT --------------------------------------
do $$
declare
  v_anzahl integer;
  v_text   text;
begin
  -- 1) Die drei Policies stehen, jede fuer die richtige Aktion und Rolle.
  for v_text, v_anzahl in
    select x.name, x.soll from (values
      ('employee_documents_insert_own',   1),
      ('employee_documents_select_own',   1),
      ('employee_documents_select_admin', 1)
    ) as x(name, soll)
  loop
    if not exists (select 1 from pg_policies
                    where schemaname = 'storage' and tablename = 'objects'
                      and policyname = v_text) then
      raise exception 'KONTROLLE: Policy % fehlt.', v_text;
    end if;
  end loop;

  -- 2) Kein Zugriff fuer anon und kein Zugriff fuer PUBLIC ueber die Rollen-
  --    liste der Policy. "to authenticated" ist hier Pflicht.
  if exists (select 1 from pg_policies
              where schemaname = 'storage' and tablename = 'objects'
                and policyname in ('employee_documents_insert_own',
                                   'employee_documents_select_own',
                                   'employee_documents_select_admin')
                and not (roles = array['authenticated']::name[])) then
    raise exception 'KONTROLLE: Mindestens eine der neuen Policies gilt nicht ausschliesslich fuer authenticated.';
  end if;

  -- 3) KEINE UPDATE-Policy auf storage.objects - nicht aus diesem Schritt und
  --    auch sonst keine. Das Ueberschreiben einer vorhandenen Datei wird
  --    ausschliesslich dadurch verhindert, dass es keine UPDATE-Policy gibt;
  --    das Tabellenrecht UPDATE besitzt authenticated als Plattform-Grant
  --    weiter. Am 14.09.2026 gegen die echte Storage-API des Testprojekts
  --    nachgewiesen (supabase/tests/storage-api/).
  select count(*) into v_anzahl from pg_policies
   where schemaname = 'storage' and tablename = 'objects' and cmd = 'UPDATE';
  if v_anzahl > 0 then
    raise exception 'KONTROLLE: Es gibt eine UPDATE-Policy auf storage.objects. Dateien duerfen nicht ueberschrieben werden.';
  end if;

  -- 3b) KEINE ALL-Policy. Eine Policy mit "for all" deckt SELECT, INSERT,
  --     UPDATE und DELETE gemeinsam ab. Sie wuerde damit sowohl das
  --     Ueberschreiben als auch das Loeschen oeffnen, ohne dass in cmd jemals
  --     'UPDATE' oder 'DELETE' auftaucht - Pruefung 3 allein wuerde das nicht
  --     bemerken.
  select count(*) into v_anzahl from pg_policies
   where schemaname = 'storage' and tablename = 'objects' and cmd = 'ALL';
  if v_anzahl > 0 then
    raise exception 'KONTROLLE: Es gibt eine ALL-Policy auf storage.objects. Sie wuerde UPDATE und DELETE mit abdecken.';
  end if;

  -- 3c) KEINE Policy fuer anon oder PUBLIC - auf keiner Policy der Tabelle,
  --     nicht nur auf den dreien dieses Schritts. Pruefung 2 sieht nur die
  --     eigenen. anon besitzt die Plattform-Grants auf storage.objects; die
  --     bleiben unveraendert. Genau deshalb ist die fehlende Policy die
  --     einzige Schranke: ohne Policy verweigert RLS jeden Zugriff. Eine
  --     Policy "to public" gilt fuer JEDE Rolle, anon eingeschlossen.
  select string_agg(policyname || ' (' || array_to_string(roles, ', ') || ')',
                    ', ' order by policyname)
    into v_text
  from pg_policies
  where schemaname = 'storage' and tablename = 'objects'
    and roles && array['anon', 'public']::name[];
  if v_text is not null then
    raise exception 'KONTROLLE: Auf storage.objects stehen Policies fuer anon oder PUBLIC: %. Damit waere der Bucket ueber den Anon-Key erreichbar.', v_text;
  end if;

  -- 4) Der Bucketfilter darf in keiner der drei Policies fehlen - sonst
  --    gaelte sie fuer den gesamten Objektspeicher.
  if exists (select 1 from pg_policies
              where schemaname = 'storage' and tablename = 'objects'
                and policyname in ('employee_documents_insert_own',
                                   'employee_documents_select_own',
                                   'employee_documents_select_admin')
                and coalesce(qual, '') || coalesce(with_check, '') not like '%employee-documents%') then
    raise exception 'KONTROLLE: In mindestens einer Policy fehlt die Einschraenkung auf den Bucket employee-documents.';
  end if;

  -- 5) Die beiden Mitarbeiter-Policies muessen BEIDES pruefen: den eigenen
  --    Ordner und die aktive Berechtigung. Fehlt eines davon, waere der
  --    Zugriff weiter als vorgesehen.
  for v_text in
    select unnest(array['employee_documents_insert_own', 'employee_documents_select_own'])
  loop
    if not exists (select 1 from pg_policies
                    where schemaname = 'storage' and tablename = 'objects'
                      and policyname = v_text
                      and coalesce(qual, '') || coalesce(with_check, '') like '%foldername%'
                      and coalesce(qual, '') || coalesce(with_check, '') like '%is_active_employee%') then
      raise exception 'KONTROLLE: In % fehlt die Ordner- oder die Berechtigungspruefung.', v_text;
    end if;
  end loop;

  -- 6) Die Admin-Policy prueft is_admin() und ist bewusst NICHT an
  --    is_active_employee() gebunden.
  if not exists (select 1 from pg_policies
                  where schemaname = 'storage' and tablename = 'objects'
                    and policyname = 'employee_documents_select_admin'
                    and qual like '%is_admin%') then
    raise exception 'KONTROLLE: employee_documents_select_admin prueft nicht is_admin().';
  end if;

  -- 7) Die beiden Plattform-Trigger stehen unveraendert.
  select count(*) into v_anzahl from pg_trigger
   where tgrelid = to_regclass('storage.objects')
     and not tgisinternal
     and tgname in ('protect_objects_delete', 'update_objects_updated_at');
  if v_anzahl <> 2 then
    raise exception 'KONTROLLE: Erwartet 2 Plattform-Trigger auf storage.objects, gefunden %. Dieser Schritt fasst Trigger nicht an.', v_anzahl;
  end if;

  -- 8) Der Bucket ist weiterhin privat.
  if (select public from storage.buckets where id = 'employee-documents') is not false then
    raise exception 'KONTROLLE: Bucket employee-documents ist nicht mehr privat.';
  end if;

  raise notice 'Kontrolle bestanden. Schritt 06 kann festgeschrieben werden. Loeschzugriff besteht weiterhin NICHT - dafuer sind Schritt 05 und 07 zustaendig, in dieser Reihenfolge.';
end
$$;

commit;
