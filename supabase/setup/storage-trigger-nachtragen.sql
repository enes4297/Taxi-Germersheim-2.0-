-- ===========================================================================
-- Nachtrag: BEFORE-DELETE-Trigger auf storage.objects
-- ===========================================================================
--
-- WOFUER
-- Abschnitt 5 der Migration 011 (private.guard_document_object_delete und der
-- Trigger storage_objects_guard_delete). Wortgleich uebernommen.
--
-- WARUM ALS EIGENE DATEI
-- Die Diagnose im Testprojekt hat zwei Rechte getrennt ausgewiesen:
--   Eigentuemer-Mitgliedschaft auf storage.objects: USAGE=false, MEMBER=false
--   TRIGGER-Recht auf storage.objects:              true
-- Das sind zwei verschiedene Pruefungen in PostgreSQL. Die Fassung
-- testprojekt-einrichtung-ohne-storage-trigger.sql laesst den Trigger weg und
-- ist damit strenger als noetig. Dieser Nachtrag holt allein den Trigger nach.
--
-- STAND 12.09.2026 - EINE ERWARTUNG HAT SICH NICHT BESTAETIGT
--   Aus USAGE=false war geschlossen worden, CREATE POLICY sei unmoeglich. Das
--   Basisskript entscheidet aber nicht nach Katalogwerten, sondern versucht ein
--   "create policy" tatsaechlich - und es ist gelungen. Die vier Storage-
--   Policies wurden dadurch angelegt. Warum das trotz USAGE=false geht, ist
--   offen und nicht eindeutig feststellbar.
--   Fuer DIESE Datei aendert das nichts: Sie legt weiterhin KEINE Policy an.
--   Die DELETE-Policy employee_documents_delete_unlinked wurde im Testprojekt
--   wieder entfernt, damit sie nicht vor dem Trigger steht.
--
-- REIHENFOLGE - VERBINDLICH
--   1. testprojekt-einrichtung-ohne-storage-trigger.sql       (SQL Editor)
--   2. DIESE DATEI                                            (SQL Editor)
--   3. DELETE-Policy employee_documents_delete_unlinked ZULETZT nachziehen,
--      Wortlaut in storage-policies-dashboard.md.
-- Grund: Ohne diesen Trigger ist die DELETE-Policy die einzige Schranke. Ihre
-- Pruefung laeuft auf dem Snapshot des Statements und sieht eine gleichzeitig
-- entstehende Verknuepfung nicht. Zwischen Policy und Trigger darf deshalb
-- kein Zeitfenster liegen.
--
-- WAS DIESE DATEI NICHT TUT
--   - kein Eigentuemerwechsel, kein SET ROLE, keine Rolleneskalation
--   - kein GRANT und kein REVOKE auf storage.objects
--   - KEINE Policy, insbesondere keine DELETE-Policy. Die gehoert ins
--     Dashboard und kommt erst NACH diesem Nachtrag.
--   - kein Eingriff in die Plattform-Trigger protect_objects_delete und
--     update_objects_updated_at. Beide bleiben unberuehrt; dieser Nachtrag
--     legt ausschliesslich storage_objects_guard_delete an. Die Kontrolle
--     unten prueft ausdruecklich nach, dass beide noch dastehen.
--   - kein DELETE auf storage.objects. Dateien werden ausschliesslich ueber
--     die Storage-API entfernt.
-- ===========================================================================
-- EINBAHNSTRASSE - VORHER LESEN
--   Die Projektrolle kann diesen Trigger anlegen, aber NICHT wieder
--   entfernen: "drop trigger" verlangt Eigentuemerschaft an storage.objects,
--   "create trigger" nur das TRIGGER-Recht. Zum Zurueckbauen braucht es
--   supabase_storage_admin, also das Dashboard oder den Supabase-Support.
--   Oertlich nachgewiesen am 11.09.2026.
--
--   Die Einbahnstrasse beginnt erst beim COMMIT. Solange die Transaktion
--   laeuft, nimmt ein Ruecklauf den Trigger wieder mit - dafuer braucht es
--   keine Eigentuemerschaft. Genau deshalb steht die Kontrolle NOCH VOR dem
--   commit: Schlaegt sie an, wird nichts festgeschrieben.
-- ===========================================================================


begin;

-- --- Vorpruefung -----------------------------------------------------------
do $$
declare
  v_trigger_recht boolean;
  v_delete_policy boolean;
begin
  if to_regclass('storage.objects') is null then
    raise exception 'ABBRUCH: storage.objects fehlt. Storage im Projekt aktivieren.';
  end if;

  v_trigger_recht := has_table_privilege(current_user, 'storage.objects', 'TRIGGER');
  if not v_trigger_recht then
    raise exception 'ABBRUCH: Kein TRIGGER-Recht auf storage.objects. Dann ist der Wettlauf per Trigger nicht zu schliessen. Stattdessen: DELETE-Policy weglassen und die automatische Bereinigung im Frontend abschalten.';
  end if;

  -- Die Funktion aus Abschnitt 3 der Migration 011 muss es geben.
  if to_regprocedure('private.is_unlinked_document(text)') is null then
    raise exception 'ABBRUCH: private.is_unlinked_document(text) fehlt. Zuerst testprojekt-einrichtung-ohne-storage-trigger.sql ausfuehren.';
  end if;

  -- Warnung, falls die Reihenfolge bereits verletzt wurde.
  select exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'employee_documents_delete_unlinked'
  ) into v_delete_policy;

  if v_delete_policy then
    raise warning 'Die DELETE-Policy bestand bereits, bevor dieser Trigger angelegt wurde. In diesem Zeitfenster war das Loeschen ungeschuetzt. Bestand pruefen: public.check_document_link_integrity().';
  end if;

  raise notice 'Vorpruefung bestanden. TRIGGER-Recht vorhanden, is_unlinked_document vorhanden.';
end
$$;


-- --- Abschnitt 5 der Migration 011 -----------------------------------------
-- Die Storage-API setzt ein DELETE auf storage.objects ab. Dieser Trigger
-- laeuft innerhalb desselben Statements, nachdem PostgreSQL die Zeilensperre
-- auf der zu loeschenden Zeile haelt, und holt sich fuer die Pruefung einen
-- frischen Snapshot. Damit sieht er eine Verknuepfung, die waehrend des
-- Wartens auf die Sperre festgeschrieben wurde.
--
-- Gegenstueck ist der Trigger aus Abschnitt 6 (lock_document_object): Beim
-- Verknuepfen nimmt er auf derselben Zeile ein FOR UPDATE. Keine der beiden
-- Seiten kann die andere uebersehen.
create or replace function private.guard_document_object_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.bucket_id is distinct from 'employee-documents' then
    return old;
  end if;

  -- Bewusst KEINE Wartungsausnahme. current_user bezeichnet in einer
  -- SECURITY-DEFINER-Funktion den Eigentuemer der Funktion, nicht den
  -- urspruenglichen Aufrufer - als Berechtigungspruefung unbrauchbar.
  -- Soll eine verknuepfte Datei entfernt werden, wird zuerst die
  -- Verknuepfung geloest.
  if not private.is_unlinked_document(old.name) then
    raise exception 'DOCUMENT_ALREADY_LINKED' using errcode = '42501';
  end if;

  return old;
end;
$$;

revoke all on function private.guard_document_object_delete() from public;
revoke all on function private.guard_document_object_delete() from anon;
revoke all on function private.guard_document_object_delete() from authenticated;

-- Anlegen bzw. Bestand belassen.
--
-- WICHTIG: "drop trigger" verlangt EIGENTUEMERSCHAFT an storage.objects, nicht
-- bloss das TRIGGER-Recht. Das sind wieder zwei verschiedene Pruefungen.
-- Oertlich nachgewiesen am 11.09.2026: "create trigger" gelingt der
-- Projektrolle, "drop trigger" scheitert mit "must be owner of relation
-- objects". Ein unbedingtes "drop trigger if exists" wuerde diese Datei daher
-- beim zweiten Lauf abbrechen lassen.
--
-- Besteht der Trigger bereits, bleibt er unberuehrt. Das genuegt: Die Funktion
-- wurde oben mit "create or replace" erneuert, und der Trigger ruft sie
-- namentlich auf. Eine geaenderte Fassung wirkt dadurch sofort.
do $$
begin
  if exists (
    select 1 from pg_trigger
    where tgrelid = to_regclass('storage.objects')
      and tgname  = 'storage_objects_guard_delete'
      and not tgisinternal
  ) then
    raise notice 'OK: Trigger storage_objects_guard_delete bestand bereits. Funktion erneuert, Trigger unveraendert gelassen.';
  else
    execute 'create trigger storage_objects_guard_delete '
         || 'before delete on storage.objects '
         || 'for each row execute function private.guard_document_object_delete()';
    raise notice 'OK: Trigger storage_objects_guard_delete angelegt.';
  end if;
end
$$;

-- --- Kontrolle im selben Vorgang, VOR dem commit ---------------------------
-- Prueft dreierlei und bricht bei jedem Verstoss ab. Ein Abbruch hier rollt
-- den gesamten Nachtrag zurueck; der Trigger ist dann wieder weg.
--   1. storage_objects_guard_delete ist vorhanden.
--   2. Er ist eingeschaltet und hat die erwartete Definition.
--   3. Die beiden Plattform-Trigger stehen unveraendert da.
do $$
declare
  v_zustand "char";
  v_def     text;
  v_platt   text;
begin
  select t.tgenabled, pg_get_triggerdef(t.oid)
    into v_zustand, v_def
  from pg_trigger as t
  where t.tgrelid = to_regclass('storage.objects')
    and t.tgname  = 'storage_objects_guard_delete'
    and not t.tgisinternal;

  if not found then
    raise exception 'ABBRUCH: Trigger storage_objects_guard_delete ist nach dem Anlegen nicht vorhanden.';
  end if;

  -- tgenabled: O = eingeschaltet, D = abgeschaltet, R = nur Replika,
  -- A = immer. Nur O und A feuern im Normalbetrieb.
  if v_zustand not in ('O', 'A') then
    raise exception 'ABBRUCH: Trigger storage_objects_guard_delete ist vorhanden, aber NICHT aktiv (tgenabled=%).', v_zustand;
  end if;

  if v_def !~ 'BEFORE DELETE'
     or v_def !~ 'FOR EACH ROW'
     or v_def !~ 'guard_document_object_delete' then
    raise exception 'ABBRUCH: Trigger storage_objects_guard_delete hat eine unerwartete Definition: %', v_def;
  end if;

  -- Plattform-Trigger: nur nachsehen, nichts anfassen.
  select string_agg(t.tgname, ', ' order by t.tgname)
    into v_platt
  from pg_trigger as t
  where t.tgrelid = to_regclass('storage.objects')
    and not t.tgisinternal
    and t.tgname in ('protect_objects_delete', 'update_objects_updated_at');

  if v_platt is distinct from 'protect_objects_delete, update_objects_updated_at' then
    raise exception 'ABBRUCH: Plattform-Trigger fehlen oder heissen anders. Gefunden: %', coalesce(v_platt, 'keine');
  end if;

  raise notice 'KONTROLLE OK: storage_objects_guard_delete vorhanden und aktiv (tgenabled=%).', v_zustand;
  raise notice 'KONTROLLE OK: Plattform-Trigger unveraendert vorhanden: %.', v_platt;
  raise notice 'KONTROLLE OK: Definition: %', v_def;
end
$$;

commit;


-- ===========================================================================
-- Abschliessende Kontrolle - rein lesend, laeuft nach dem commit mit
-- ===========================================================================
-- Erwartet werden genau drei eigene Trigger:
--   protect_objects_delete        (Plattform)
--   storage_objects_guard_delete  (dieser Nachtrag, Zustand "aktiv")
--   update_objects_updated_at     (Plattform)
--
-- Bei den Policies darf JETZT noch keine DELETE-Zeile erscheinen. Erscheint
-- eine, steht die DELETE-Policy vor dem Trigger - dann Reihenfolge pruefen.
select
  'Trigger'       as art,
  t.tgname::text  as name,
  case t.tgenabled
    when 'O' then 'aktiv'
    when 'D' then 'DEAKTIVIERT'
    when 'R' then 'nur Replika'
    when 'A' then 'immer aktiv'
    else t.tgenabled::text
  end             as zustand,
  pg_get_triggerdef(t.oid) as definition
from pg_trigger as t
where t.tgrelid = to_regclass('storage.objects')
  and not t.tgisinternal

union all

select
  'DELETE-Policy',
  p.policyname::text,
  'vorhanden - Reihenfolge pruefen',
  coalesce(p.qual, '')
from pg_policies as p
where p.schemaname = 'storage'
  and p.tablename  = 'objects'
  and p.cmd        = 'DELETE'

order by 1, 2;
