-- ===========================================================================
-- Nachtrag: DELETE-Policy employee_documents_delete_unlinked
-- ===========================================================================
--
-- WOFUER
-- Die vierte und letzte Policy aus Abschnitt 4 der Migration 011, wortgleich
-- uebernommen. Die drei anderen Policies (INSERT eigener Ordner, SELECT
-- eigener Ordner, SELECT Admin) hat das Basisskript bereits angelegt.
--
-- REIHENFOLGE - DIESE DATEI KOMMT ZULETZT
--   1. testprojekt-einrichtung-ohne-storage-trigger.sql   (SQL Editor)
--   2. storage-trigger-nachtragen.sql                     (SQL Editor)
--   3. DIESE DATEI                                        (SQL Editor)
-- Grund: Ohne den Trigger storage_objects_guard_delete waere diese Policy die
-- einzige Schranke beim Loeschen. Ihre Pruefung laeuft auf dem Snapshot des
-- Statements und sieht eine gleichzeitig entstehende Verknuepfung nicht.
-- Zwischen Policy und Trigger darf deshalb kein Zeitfenster liegen. Die
-- Vorpruefung unten bricht ab, wenn der Trigger fehlt oder abgeschaltet ist.
--
-- STAND 12.09.2026
--   Im Testprojekt haben CREATE POLICY und DROP POLICY im SQL Editor
--   funktioniert. Der Dashboard-Umweg aus storage-policies-dashboard.md ist
--   dort also nicht noetig. Warum das trotz USAGE=false und MEMBER=false
--   gelingt, ist nach wie vor nicht eindeutig feststellbar - es ist ein
--   Messwert, keine Zusage der Plattform. Sollte CREATE POLICY hier doch mit
--   "must be owner of relation objects" scheitern, gilt wieder der
--   Dashboard-Weg: storage-policies-dashboard.md, Schritt 2, Punkt 4.
--
-- WAS DIESE DATEI NICHT TUT
--   - keine weitere Policy. Sie fasst die drei bestehenden nicht an.
--   - kein GRANT und kein REVOKE auf storage.objects
--   - keinen Trigger; die Trigger werden nur gelesen
--   - kein DELETE auf storage.objects. Dateien werden ausschliesslich ueber
--     die Storage-API entfernt.
--
-- HINWEIS ZUR WIRKUNG
--   Permissive Policies verknuepfen mit ODER. Eine zusaetzliche DELETE-Policy
--   koennte das Loeschrecht daher nur erweitern, nie einschraenken. Die
--   Kontrolle unten besteht deshalb darauf, dass es GENAU EINE DELETE-Policy
--   gibt - naemlich diese.
--   Die Rolle postgres hat BYPASSRLS. Fuer sie ist diese Policy wirkungslos;
--   nur der Trigger greift. Ein "delete" im SQL Editor misst darum nichts.
-- ===========================================================================


begin;

-- --- Vorpruefung -----------------------------------------------------------
do $$
declare
  v_zustand "char";
  v_grant   boolean;
  v_fehlend text;
begin
  if to_regclass('storage.objects') is null then
    raise exception 'ABBRUCH: storage.objects fehlt. Storage im Projekt aktivieren.';
  end if;

  -- Die Policy ruft beide Funktionen auf. Fehlt eine, waere der Ausdruck
  -- nicht aufloesbar.
  v_fehlend := null;
  if to_regprocedure('private.is_active_employee()') is null then
    v_fehlend := 'private.is_active_employee()';
  end if;
  if to_regprocedure('private.is_unlinked_document(text)') is null then
    v_fehlend := concat_ws(', ', v_fehlend, 'private.is_unlinked_document(text)');
  end if;
  if v_fehlend is not null then
    raise exception 'ABBRUCH: Fehlende Funktion(en): %. Zuerst testprojekt-einrichtung-ohne-storage-trigger.sql ausfuehren.', v_fehlend;
  end if;

  -- Der Trigger MUSS vor dieser Policy stehen, sonst entsteht genau das
  -- Zeitfenster, das er schliessen soll.
  select t.tgenabled into v_zustand
  from pg_trigger as t
  where t.tgrelid = to_regclass('storage.objects')
    and t.tgname  = 'storage_objects_guard_delete'
    and not t.tgisinternal;

  if not found then
    raise exception 'ABBRUCH: Trigger storage_objects_guard_delete fehlt. Diese Policy darf erst NACH storage-trigger-nachtragen.sql angelegt werden.';
  end if;

  -- tgenabled: O = eingeschaltet, D = abgeschaltet, R = nur Replika,
  -- A = immer. Nur O und A feuern im Normalbetrieb.
  if v_zustand not in ('O', 'A') then
    raise exception 'ABBRUCH: Trigger storage_objects_guard_delete ist vorhanden, aber NICHT aktiv (tgenabled=%). Ohne ihn keine DELETE-Policy.', v_zustand;
  end if;

  -- Grants greifen VOR der RLS. Ohne DELETE-Grant bleibt die Policy folgenlos.
  v_grant := has_table_privilege('authenticated', 'storage.objects', 'DELETE');
  if not v_grant then
    raise warning 'authenticated hat kein DELETE-Recht auf storage.objects. Die Policy wird angelegt, bleibt aber wirkungslos - Grants greifen vor der RLS.';
  end if;

  raise notice 'Vorpruefung bestanden. Trigger aktiv (tgenabled=%), DELETE-Grant fuer authenticated: %.', v_zustand, v_grant;
end
$$;


-- --- Die Policy, wortgleich aus Abschnitt 4 der Migration 011 ---------------
-- Loeschen: eigener Ordner, aktive Mitarbeiterberechtigung UND die Datei darf
-- von keinem Datensatz referenziert sein. Das ist die Bereinigung verwaister
-- Uploads. Ohne is_unlinked_document waere es ein breites Loeschrecht auf alle
-- eigenen Dateien.
-- Diese Policy ist die erste Huerde; die verbindliche Pruefung inklusive
-- Sperre gegen gleichzeitiges Verknuepfen sitzt im Trigger.
do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'employee_documents_delete_unlinked'
  ) then
    execute 'drop policy employee_documents_delete_unlinked on storage.objects';
    raise notice 'Bestehende Policy employee_documents_delete_unlinked entfernt, wird neu angelegt.';
  end if;
end
$$;

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
  );


-- --- Kontrolle im selben Vorgang, VOR dem commit ----------------------------
-- Bricht bei jedem Verstoss ab; dann wird nichts festgeschrieben und der
-- Stand bleibt unveraendert.
do $$
declare
  v_anzahl  integer;
  v_name    text;
  v_perm    text;
  v_rollen  text;
  v_qual    text;
  v_zustand "char";
begin
  -- Genau eine DELETE-Policy. Mehrere wuerden sich mit ODER verknuepfen.
  select count(*) into v_anzahl
  from pg_policies
  where schemaname = 'storage' and tablename = 'objects' and cmd = 'DELETE';

  if v_anzahl <> 1 then
    raise exception 'ABBRUCH: Es gibt % DELETE-Policies auf storage.objects, erwartet ist genau eine.', v_anzahl;
  end if;

  select p.policyname, p.permissive, array_to_string(p.roles, ', '), coalesce(p.qual, '')
    into v_name, v_perm, v_rollen, v_qual
  from pg_policies as p
  where p.schemaname = 'storage' and p.tablename = 'objects' and p.cmd = 'DELETE';

  if v_name <> 'employee_documents_delete_unlinked' then
    raise exception 'ABBRUCH: Die DELETE-Policy heisst %, erwartet employee_documents_delete_unlinked.', v_name;
  end if;

  if v_rollen <> 'authenticated' then
    raise exception 'ABBRUCH: Die Policy gilt fuer %, erwartet ausschliesslich authenticated.', v_rollen;
  end if;

  -- Alle vier Bedingungen muessen im gespeicherten Ausdruck stehen. Fehlt
  -- is_unlinked_document, waere es ein breites Loeschrecht.
  if v_qual !~ 'employee-documents'
     or v_qual !~ 'foldername'
     or v_qual !~ 'is_active_employee'
     or v_qual !~ 'is_unlinked_document' then
    raise exception 'ABBRUCH: Der USING-Ausdruck ist unvollstaendig: %', v_qual;
  end if;

  -- Der Trigger muss unveraendert dastehen.
  select t.tgenabled into v_zustand
  from pg_trigger as t
  where t.tgrelid = to_regclass('storage.objects')
    and t.tgname  = 'storage_objects_guard_delete'
    and not t.tgisinternal;

  if not found or v_zustand not in ('O', 'A') then
    raise exception 'ABBRUCH: Trigger storage_objects_guard_delete fehlt oder ist nicht aktiv.';
  end if;

  raise notice 'KONTROLLE OK: Genau eine DELETE-Policy, Name %, Art %, Rolle %.', v_name, v_perm, v_rollen;
  raise notice 'KONTROLLE OK: USING enthaelt Bucket, Ordnerbindung, is_active_employee und is_unlinked_document.';
  raise notice 'KONTROLLE OK: Trigger storage_objects_guard_delete weiterhin aktiv (tgenabled=%).', v_zustand;
end
$$;

commit;


-- ===========================================================================
-- Abschliessende Kontrolle - rein lesend, laeuft nach dem commit mit
-- ===========================================================================
-- Erwartet werden genau fuenf Zeilen:
--   Policy  employee_documents_delete_unlinked   DELETE (PERMISSIVE)
--   Policy  employee_documents_insert_own        INSERT (PERMISSIVE)
--   Policy  employee_documents_select_admin      SELECT (PERMISSIVE)
--   Policy  employee_documents_select_own        SELECT (PERMISSIVE)
--   Trigger storage_objects_guard_delete         aktiv
--
-- Steht bei einer Policy eine andere Rolle als authenticated - insbesondere
-- public oder anon -, ist das ein Befund und keine Nebensaechlichkeit.
select
  'Policy'                             as art,
  p.policyname::text                   as name,
  p.cmd || ' (' || p.permissive || ')' as zustand,
  array_to_string(p.roles, ', ')       as rollen,
  coalesce(p.qual, '(kein USING)')     as ausdruck
from pg_policies as p
where p.schemaname = 'storage'
  and p.tablename  = 'objects'

union all

select
  'Trigger',
  t.tgname::text,
  case t.tgenabled
    when 'O' then 'aktiv'
    when 'D' then 'DEAKTIVIERT'
    when 'R' then 'nur Replika'
    when 'A' then 'immer aktiv'
    else t.tgenabled::text
  end,
  '-',
  pg_get_triggerdef(t.oid)
from pg_trigger as t
where t.tgrelid = to_regclass('storage.objects')
  and t.tgname  = 'storage_objects_guard_delete'
  and not t.tgisinternal

order by 1, 2;
