-- ===========================================================================
-- Rueckweg - Ruecknahme der Einspielung von 011
-- ===========================================================================
--
-- NICHT AM STUECK AUSFUEHREN. Diese Datei enthaelt sechs eigenstaendige
-- Transaktionen R1 bis R6. Jede wird einzeln in den SQL Editor kopiert, und
-- zwar in dieser Reihenfolge. Jede hat eine eigene Vorpruefung und eine
-- eigene Kontrolle VOR dem commit.
--
-- Jede Stufe prueft zu Beginn noch einmal nach, was die vorige erreicht hat.
-- Das ist keine Doppelung: es sind getrennte Transaktionen, und zwischen
-- ihnen kann jemand etwas im Dashboard geaendert haben.
--
-- ---------------------------------------------------------------------------
-- DIE REIHENFOLGE IST DER KERN DIESER DATEI
-- ---------------------------------------------------------------------------
--   ZUERST wird der Loeschzugriff gesperrt (R1).
--   ERST DANACH wird der Loeschschutz neutralisiert (R2).
--
--   Umgekehrt entstuende ein Zeitfenster, in dem Mitarbeiter loeschen duerfen
--   und die Pruefung auf verknuepfte Nachweise bereits abgeschaltet ist. In
--   diesem Fenster koennen verknuepfte Dokumente entfernt werden, und die
--   Datensaetze in document_submissions und employee_documents zeigen danach
--   auf nicht mehr vorhandene Dateien. Das ist nicht reparabel - die Datei
--   ist weg.
--
--   R2 bricht deshalb ab, wenn R1 nicht nachweislich gewirkt hat.
--
-- ---------------------------------------------------------------------------
-- GRENZEN EIGENER STORAGE-TRIGGER - AUSDRUECKLICH
-- ---------------------------------------------------------------------------
--   Der Trigger storage_objects_guard_delete auf storage.objects ist eine
--   EINBAHNSTRASSE. Oertlich gemessen am 13.09.2026 mit PostgreSQL 17.6, als
--   Rolle tg_projekt auf einer Tabelle im Eigentum von
--   supabase_storage_admin:
--
--     create trigger ...                          gelingt  (nur TRIGGER-Recht noetig)
--     drop trigger ...                            42501    'must be owner of relation objects'
--     alter table ... disable trigger ...         42501    'must be owner of table objects'
--     create or replace function private...()     gelingt  (Funktion gehoert dem Projekt)
--
--   Daraus folgt dreierlei:
--
--   1. Der Trigger laesst sich von der Projektrolle NICHT entfernen und auch
--      NICHT abschalten. Wer ihn anlegt, muss damit rechnen, dass er bleibt.
--      Die Einbahnstrasse beginnt mit dem commit von Schritt 05.
--   2. Der einzige Hebel, der der Projektrolle bleibt, ist der KOERPER der
--      Funktion. R2 ersetzt ihn durch 'return old' - der Trigger feuert dann
--      weiterhin, prueft aber nichts mehr. Das ist eine Neutralisierung, kein
--      Rueckbau.
--   3. drop function ist KEIN Rueckweg. Der Trigger haengt an der Funktion;
--      ohne cascade scheitert es, mit cascade muesste der Trigger fallen -
--      und genau das darf die Projektrolle nicht. Ein Trigger, dessen
--      Funktion fehlt, wuerde bei jedem DELETE auf storage.objects einen
--      Fehler werfen und damit den gesamten Objektspeicher des Projekts
--      lahmlegen. Deshalb steht in dieser Datei nirgends ein
--      drop function private.guard_document_object_delete().
--
--   Ein vollstaendiger Rueckbau des Triggers geht nur ueber den Weg, der
--   Eigentuemerrechte hat: Dashboard beziehungsweise Supabase-Support.
--
-- ---------------------------------------------------------------------------
-- ZWEI VERSCHIEDENE DINGE - NICHT VERMISCHEN
-- ---------------------------------------------------------------------------
--   Dieser Rueckweg tut zweierlei, und das Ergebnis ist NICHT dasselbe:
--
--   A) WIEDERHERSTELLUNG DES AUSGANGSSTANDS
--      Zurueckgesetzt auf den am 13.09.2026 gemessenen Stand werden:
--        - die beiden Insert-Policies in public          (R4)
--        - die Storage-Policies aus 011                  (R1 und R3)
--        - Sperr-Trigger und Funktionen aus 011          (R5)
--        - Spalte, Indizes und die vier Dokumentarten    (R6)
--      Fuer diese Punkte gilt: nachher steht wieder da, was vorher dastand.
--
--      NICHT DABEI, WEIL NIE VERAENDERT: die Tabellenrechte auf
--      storage.objects und storage.buckets. Die Einspielung hat dort weder
--      etwas vergeben noch etwas entzogen - es sind Plattform-Grants von
--      supabase_storage_admin. Ein Rueckweg, der sie "wiederherstellt",
--      wuerde einen Eingriff rueckgaengig machen, den es nie gab, und dabei
--      mit einem grant einen ZWEITEN Vergeber-Eintrag neu anlegen. Deshalb
--      steht in dieser Datei kein grant und kein revoke auf storage.objects.
--      Siehe CLAUDE.md, "Plattform-Grants auf storage.objects und
--      storage.buckets".
--
--   B) BEWUSST BEIBEHALTENE SICHERHEITSAENDERUNGEN
--      Diese Punkte werden ABSICHTLICH nicht auf den Ausgangsstand
--      zurueckgesetzt. Sie sind Abweichungen und bleiben es:
--        1. Der Trigger storage_objects_guard_delete bleibt auf
--           storage.objects stehen. Er ist nur neutralisiert, nicht entfernt,
--           weil die Projektrolle ihn nicht entfernen darf (siehe oben).
--        2. Die Funktion private.guard_document_object_delete() bleibt
--           bestehen. Vor 011 gab es sie nicht - aber drop function ist kein
--           gangbarer Weg, solange der Trigger an ihr haengt (siehe oben).
--
--   Hinzu kommt ein Punkt, der gar nicht in SQL erledigt werden kann:
--        4. Der Bucket employee-documents. Siehe R6.
--
--   FOLGE FUER DIE BERICHTERSTATTUNG: Ein Lauf, der A vollstaendig erledigt
--   hat, ist trotzdem KEINE vollstaendige Wiederherstellung des
--   Ausgangsstands. Wer das so nennt, verschweigt B. Die Abschlussmeldung in
--   R6 nennt beide Teile getrennt; sie ist der Wortlaut, der gilt.
--
-- ---------------------------------------------------------------------------
-- WAS DIESER RUECKWEG NICHT KANN
-- ---------------------------------------------------------------------------
--   - Hochgeladene Dateien entfernt er NICHT. storage.objects ist nur der
--     Katalog. Ein SQL-DELETE dort loescht den Eintrag und laesst die Datei
--     als Leiche im Objektspeicher zurueck. Dateien werden ausschliesslich
--     ueber die Storage-API entfernt (remove). R6 bricht deshalb ab, solange
--     im Bucket noch Objekte liegen.
--   - Die vier Plattform-Trigger protect_objects_delete,
--     update_objects_updated_at, protect_buckets_delete und
--     enforce_bucket_name_length_trigger fasst er nicht an. Sie stammen nicht
--     aus 011.
--   - Den BUCKET entfernt er NICHT. Beide Loesch-Trigger rufen
--     storage.protect_delete() auf, und diese Funktion verweigert JEDES
--     direkte SQL-DELETE auf storage.objects und storage.buckets mit 42501
--     (Rumpf gelesen am 13.09.2026). R6 enthaelt deshalb bewusst kein delete
--     auf storage.buckets; der Bucket geht ueber die Storage-API oder das
--     Dashboard. Den Schalter storage.allow_delete_query benutzt diese Datei
--     an keiner Stelle.
--   - Werte, die nach der Einspielung entstanden sind, stellt er nicht her.
--     Wurde sickness_reports.client_request_id befuellt, gehen diese Werte
--     beim Entfernen der Spalte verloren. R6 misst das und bricht ab.
--   - Die Tabellenrechte auf storage.objects und storage.buckets fasst er
--     NICHT an - weder entziehend noch vergebend, weder bei authenticated
--     noch bei anon. Die Einspielung hat sie nicht veraendert; es gibt dort
--     nichts wiederherzustellen. Was anon an Plattform-Grants hatte, hat es
--     danach unveraendert. Die Schranke ist und bleibt RLS: nach R1 und R3
--     steht keine Policy mehr auf storage.objects, und ohne Policy verweigert
--     RLS jeden Zugriff.
--     ACHTUNG, NICHT VERWECHSELN: RLS erfasst SELECT, INSERT, UPDATE, DELETE
--     und MERGE. TRUNCATE, REFERENCES, TRIGGER und MAINTAIN erfasst sie
--     NICHT, und der BEFORE-DELETE-Trigger feuert bei TRUNCATE ebenfalls
--     nicht. Diese vier Rechte sind ueber keine exponierte Schnittstelle
--     erreichbar - das ist eine Ableitung aus der Architektur, KEIN Messwert,
--     und darf nicht als "RLS-geschuetzt" bezeichnet werden.
--
-- ---------------------------------------------------------------------------
-- WOHER DIE WERTE KOMMEN
-- ---------------------------------------------------------------------------
--   Aus der Ausgabe von 01_sicherung-ist-stand.sql vom 13.09.2026, NICHT aus
--   alten Migrationsdateien. Eine Migration sagt, was einmal angelegt wurde -
--   nicht, was vor der Einspielung tatsaechlich dastand.
--
--   Die gemessenen Werte stehen inzwischen EINGESETZT in dieser Datei. Die
--   Stellen sind mit "GEMESSENER AUSGANGSSTAND" beziehungsweise "GEMESSEN"
--   ueberschrieben. Es gibt keine offenen Platzhalter mehr.
--
--   Eingesetzt wurden:
--     (Der Rechtestand auf storage.objects wird hier NICHT mehr eingesetzt.
--      R3 vergibt und entzieht dort nichts. Gemessen wird er weiterhin, rein
--      lesend, mit 01c_rechtestand_storage.sql.)
--     R4  der Wortlaut der beiden Insert-Policies vor der Verschaerfung.
--     R6  document_types hatte 0 Zeilen - die vier Dokumentarten stammen
--         damit vollstaendig aus 011 und werden entfernt.
--     R6  der Rumpf von storage.protect_delete() (01b, Posten 38). Er
--         entscheidet, dass der Bucket nicht per SQL entfernt werden kann.
--
--   WICHTIG: Diese Werte gelten fuer den Stand vom 13.09.2026. Wird der
--   Rueckweg spaeter gebraucht, gehoert 01_sicherung-ist-stand.sql vorher
--   erneut gefahren und die Werte abgeglichen.
-- ===========================================================================


-- ===========================================================================
-- R1 - Loeschzugriff sperren. IMMER ZUERST.
-- ===========================================================================
-- Zwei Riegel, unabhaengig voneinander:
--   a) die DELETE-Policy entfernen -> ohne Policy verweigert RLS jedes DELETE
--   b) die EIGENE Trigger-Funktion auf "alles verweigern" umstellen -> der
--      BEFORE-DELETE-Trigger laesst dann kein DELETE im Bucket mehr durch
-- Einer von beiden genuegt, um den Zugriff zu sperren. Beide sind besser.
-- Die Kontrolle verlangt, dass MINDESTENS EINER nachweislich gegriffen hat.
--
-- KEIN REVOKE MEHR. Frueher stand als Riegel b) hier
--   revoke delete on storage.objects from authenticated;
-- Das ist entfallen. Die Rechte dort sind Plattform-Grants von
-- supabase_storage_admin; ein revoke der Projektrolle entfernt nur EIGENE
-- Eintraege und laeuft sonst ohne Fehler und ohne Warnung ins Leere. Es haette
-- also nur den Anschein eines Riegels erzeugt. Riegel b) in der neuen Fassung
-- wirkt dagegen sicher: die Funktion gehoert dem Projekt.
--
-- FOLGE FUER DEN BUCKET - BITTE VOR R1 LESEN
--   Riegel b) verweigert JEDES Loeschen im Bucket employee-documents, auch
--   ueber die Storage-API. Solange er steht, laesst sich der Bucket nicht
--   leeren. R2 hebt ihn wieder auf (der Trigger gibt danach alles durch), und
--   R6 verlangt einen leeren Bucket. Die Dateien werden deshalb NACH R2
--   entfernt, nicht vorher.
begin;

do $$
begin
  if to_regclass('storage.objects') is null then
    raise exception 'ABBRUCH: storage.objects fehlt.';
  end if;
  raise notice 'Vorher - DELETE-/ALL-Policies auf storage.objects: %, Trigger storage_objects_guard_delete: %',
    (select count(*) from pg_policies
      where schemaname = 'storage' and tablename = 'objects'
        and cmd in ('DELETE', 'ALL')),
    coalesce((select case when t.tgenabled in ('O', 'A') then 'aktiv'
                          else 'vorhanden, aber nicht aktiv (tgenabled=' || t.tgenabled || ')' end
                from pg_trigger as t
               where t.tgrelid = to_regclass('storage.objects')
                 and t.tgname = 'storage_objects_guard_delete'
                 and not t.tgisinternal), 'fehlt');
  -- Nur als Befund, nicht als Bedingung: die Tabellenrechte werden hier
  -- weder geprueft noch veraendert. Sie stammen von der Plattform.
  raise notice 'Unveraendert (Plattform-Grant, nur Befund) - DELETE-Recht authenticated auf storage.objects: %',
    has_table_privilege('authenticated', 'storage.objects', 'DELETE');
end
$$;

-- a) Riegel ueber RLS. Beide Namen aus 011, falls eine aeltere Fassung steht.
--
--    "drop policy" verlangt EIGENTUEMERSCHAFT an storage.objects. Die hat die
--    Projektrolle nicht - gemessen am 13.09.2026: Eigentuemer ist
--    supabase_storage_admin, postgres ist dort kein Mitglied. Der Befehl
--    wirft dann 42501 "must be owner of relation objects".
--    Stuende er hier nackt, wuerde er die GESAMTE Transaktion abbrechen,
--    bevor Riegel b) ueberhaupt versucht wird - und R1 koennte nie etwas
--    erreichen. Deshalb wird dieser eine Fehler ABGEFANGEN und gemeldet.
--    Das schwaecht nichts ab: ob der Loeschzugriff gesperrt ist, entscheidet
--    allein die Kontrolle unten, und die prueft das ERGEBNIS.
--    Oertlich nachgemessen am 14.09.2026 als Rolle tg_projekt: der Fehler
--    tritt genau so auf.
do $$
begin
  execute 'drop policy if exists employee_documents_delete_unlinked on storage.objects';
  execute 'drop policy if exists employee_documents_delete_own      on storage.objects';
  raise notice 'R1 a) Riegel steht: DELETE-Policies auf storage.objects sind entfernt.';
exception
  when insufficient_privilege then
    raise notice 'R1 a) Riegel steht NICHT: %. drop policy verlangt Eigentuemerschaft an storage.objects. Die DELETE-Policy muss im Dashboard entfernt werden. Jetzt zaehlt allein Riegel b).', sqlerrm;
end
$$;

-- b) Riegel ueber die eigene Trigger-Funktion.
--    private.guard_document_object_delete() gehoert dem Projekt; ein
--    "create or replace" darauf gelingt immer (oertlich nachgewiesen am
--    13.09.2026). Diese Fassung verweigert JEDES Loeschen im Bucket
--    employee-documents - unabhaengig davon, ob die Datei verknuepft ist und
--    ob Riegel a) gegriffen hat. security definer und set search_path = ''
--    bleiben erhalten.
--    Ersetzt wird nur, wenn die Funktion ueberhaupt da ist. Waere sie es
--    nicht, wuerde ein "create or replace" eine Funktion anlegen, an der kein
--    Trigger haengt - das saehe nach einem Riegel aus und waere keiner.
do $r1b$
begin
  if to_regprocedure('private.guard_document_object_delete()') is null then
    raise notice 'R1 b) Riegel steht NICHT: private.guard_document_object_delete() fehlt. Dann gibt es dort auch nichts zu sperren - jetzt zaehlt allein Riegel a). Die Kontrolle unten prueft das Ergebnis.';
  else
    execute $f$
      create or replace function private.guard_document_object_delete()
      returns trigger
      language plpgsql
      security definer
      set search_path = ''
      as $koerper$
      begin
        -- RUECKWEG_R1_LOESCHSPERRE: waehrend des Rueckwegs zu 011 ist das
        -- Loeschen im Bucket gesperrt. R2 hebt das wieder auf.
        if old.bucket_id = 'employee-documents' then
          raise exception 'RUECKWEG_R1_LOESCHSPERRE: Loeschen im Bucket employee-documents ist waehrend des Rueckwegs gesperrt.'
            using errcode = '42501';
        end if;
        return old;
      end
      $koerper$;
    $f$;
    raise notice 'R1 b) Riegel steht: private.guard_document_object_delete() verweigert jedes Loeschen im Bucket employee-documents.';
  end if;
end
$r1b$;

do $$
declare
  v_policies integer;
  v_sperre   boolean;
  v_trigger  boolean;
begin
  -- DELETE und ALL zusammen: eine Policy "for all" deckt das Loeschen mit ab,
  -- ohne dass in cmd jemals 'DELETE' steht.
  select count(*) into v_policies from pg_policies
   where schemaname = 'storage' and tablename = 'objects'
     and cmd in ('DELETE', 'ALL');

  -- Riegel b) gilt nur als gegriffen, wenn BEIDES stimmt: die Sperre steht im
  -- Funktionskoerper UND der Trigger, der sie aufruft, ist aktiv. Eine Sperre
  -- in einer Funktion, die niemand aufruft, ist keine.
  v_sperre := coalesce(
    pg_get_functiondef(to_regprocedure('private.guard_document_object_delete()'))
      like '%RUECKWEG_R1_LOESCHSPERRE%', false);
  v_trigger := exists (select 1 from pg_trigger as t
                        where t.tgrelid = to_regclass('storage.objects')
                          and t.tgname = 'storage_objects_guard_delete'
                          and not t.tgisinternal
                          and t.tgenabled in ('O', 'A'));

  -- Gesperrt ist der Zugriff, wenn keine DELETE-/ALL-Policy mehr steht ODER
  -- Riegel b) greift. Trifft keines von beidem zu, ist NICHTS erreicht - dann
  -- darf R2 keinesfalls laufen, und diese Transaktion faellt hier zurueck.
  if v_policies > 0 and not (v_sperre and v_trigger) then
    raise exception 'KONTROLLE R1: Der Loeschzugriff ist NICHT gesperrt. Es stehen weiterhin % DELETE-/ALL-Policy(s), und Riegel b) greift nicht (Sperre im Funktionskoerper: %, Trigger aktiv: %). drop policy verlangt Eigentuemerschaft an storage.objects; die hat die Projektrolle nicht. In diesem Zustand darf R2 NICHT ausgefuehrt werden. Die DELETE-Policy zuerst im Dashboard entfernen.', v_policies, v_sperre, v_trigger;
  end if;

  raise notice 'KONTROLLE R1 bestanden. Verbleibende DELETE-/ALL-Policies: %, Sperre im Funktionskoerper: %, Trigger aktiv: %. Der Loeschzugriff ist gesperrt. Erst jetzt darf R2 laufen.', v_policies, v_sperre, v_trigger;
  raise notice 'HINWEIS R1: Die Tabellenrechte auf storage.objects sind unveraendert geblieben - dieser Schritt vergibt und entzieht dort nichts.';
end
$$;

commit;


-- ===========================================================================
-- R2 - Loeschschutz neutralisieren. ERST NACH R1.
-- ===========================================================================
-- Kein drop trigger, kein drop function. Siehe Kopf, "Grenzen eigener
-- Storage-Trigger". Ersetzt wird ausschliesslich der Funktionskoerper.
begin;

do $$
declare
  v_policies integer;
begin
  -- R1 muss nachweislich gewirkt haben. Das wird hier neu gemessen, weil
  -- zwischen den Transaktionen jemand etwas geaendert haben kann.
  --
  -- DIESE PRUEFUNG IST STRENGER ALS DIE VON R1 - mit Absicht. R1 laesst zwei
  -- Riegel gelten: keine Policy ODER die Sperre in der Trigger-Funktion.
  -- R2 nimmt aber genau diese Sperre wieder heraus. Bliebe die DELETE-Policy
  -- stehen, waere der Loeschzugriff unmittelbar nach R2 offen. Deshalb gilt
  -- hier allein: es darf KEINE DELETE- und KEINE ALL-Policy mehr geben.
  select count(*) into v_policies from pg_policies
   where schemaname = 'storage' and tablename = 'objects'
     and cmd in ('DELETE', 'ALL');

  if v_policies > 0 then
    raise exception 'ABBRUCH R2: Auf storage.objects stehen noch % DELETE-/ALL-Policy(s). R2 nimmt die Sperre aus der Trigger-Funktion heraus - danach waere das Loeschen sofort offen. Die Policy zuerst entfernen; verlangt das Eigentuemerschaft, geht es nur ueber das Dashboard.', v_policies;
  end if;

  if to_regprocedure('private.guard_document_object_delete()') is null then
    raise exception 'ABBRUCH R2: private.guard_document_object_delete() fehlt. Steht der Trigger trotzdem noch, wirft jedes DELETE auf storage.objects einen Fehler. Das ist ein Fall fuer den Support, nicht fuer dieses Skript.';
  end if;

  raise notice 'Vorpruefung R2 bestanden. Loeschzugriff gesperrt, Funktion vorhanden.';
end
$$;

-- Der Trigger feuert danach weiterhin, prueft aber nichts mehr.
-- security definer und set search_path = '' bleiben erhalten - eine
-- neutralisierte Funktion darf nicht zusaetzlich eine offene Suchpfad-
-- Angriffsflaeche hinterlassen.
create or replace function private.guard_document_object_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Neutralisiert im Rahmen des Rueckwegs zu 011. Der Trigger laesst sich von
  -- der Projektrolle nicht entfernen und nicht abschalten, deshalb wird hier
  -- nur der Koerper geleert. Keine Pruefung mehr.
  return old;
end
$$;

revoke all on function private.guard_document_object_delete() from public;
revoke all on function private.guard_document_object_delete() from anon;
revoke all on function private.guard_document_object_delete() from authenticated;

do $$
declare
  v_def text;
begin
  v_def := pg_get_functiondef(to_regprocedure('private.guard_document_object_delete()'));

  if v_def like '%DOCUMENT_ALREADY_LINKED%' then
    raise exception 'KONTROLLE R2: Die Funktion enthaelt weiterhin die Pruefung. Das create or replace hat nicht gegriffen.';
  end if;
  if v_def like '%RUECKWEG_R1_LOESCHSPERRE%' then
    raise exception 'KONTROLLE R2: Die Funktion enthaelt weiterhin die Loeschsperre aus R1. Das create or replace hat nicht gegriffen.';
  end if;
  if v_def not like '%search_path%' then
    raise exception 'KONTROLLE R2: Der neuen Funktion fehlt set search_path. Nicht festschreiben.';
  end if;
  if has_function_privilege('anon', 'private.guard_document_object_delete()', 'EXECUTE')
     or has_function_privilege('authenticated', 'private.guard_document_object_delete()', 'EXECUTE') then
    raise exception 'KONTROLLE R2: anon oder authenticated haben EXECUTE auf der Trigger-Funktion.';
  end if;

  -- Der Trigger MUSS weiterhin dastehen. Fehlt er, ist etwas anderes
  -- passiert, als dieses Skript vorsieht.
  if not exists (select 1 from pg_trigger
                  where tgrelid = to_regclass('storage.objects')
                    and tgname = 'storage_objects_guard_delete') then
    raise notice 'HINWEIS R2: Der Trigger storage_objects_guard_delete steht nicht mehr. Dieses Skript hat ihn nicht entfernt - jemand mit Eigentuemerrechten muss das getan haben.';
  else
    raise notice 'KONTROLLE R2 bestanden. Der Trigger storage_objects_guard_delete BLEIBT bestehen und feuert weiterhin, prueft aber nichts mehr. Ein vollstaendiger Rueckbau ist nur mit Eigentuemerrechten moeglich.';
  end if;

  -- Die Plattform-Trigger unveraendert.
  if (select count(*) from pg_trigger
       where tgrelid = to_regclass('storage.objects') and not tgisinternal
         and tgname in ('protect_objects_delete', 'update_objects_updated_at')) <> 2 then
    raise exception 'KONTROLLE R2: Die beiden Plattform-Trigger stehen nicht mehr wie erwartet.';
  end if;
end
$$;

commit;


-- ===========================================================================
-- R3 - Uebrige Policies auf storage.objects zuruecknehmen (KEINE Rechte)
-- ===========================================================================
begin;

-- R3 laeuft nach R2. Zu diesem Zeitpunkt ist die Loeschsperre aus R1 bereits
-- wieder aufgehoben - der Trigger gibt alles durch. Die einzige verbliebene
-- Schranke ist damit die fehlende DELETE-Policy, und genau die wird hier
-- verlangt, mit demselben Massstab wie in der Vorpruefung von R2.
do $$
declare
  v_policies integer;
begin
  select count(*) into v_policies from pg_policies
   where schemaname = 'storage' and tablename = 'objects'
     and cmd in ('DELETE', 'ALL');

  if v_policies > 0 then
    raise exception 'ABBRUCH R3: Auf storage.objects stehen noch % DELETE-/ALL-Policy(s). Zuerst R1 ausfuehren und bestehen lassen; verlangt das Entfernen Eigentuemerschaft, geht es nur ueber das Dashboard.', v_policies;
  end if;

  raise notice 'Vorpruefung R3 bestanden. DELETE-/ALL-Policies auf storage.objects: %.', v_policies;
end
$$;

-- Wie in R1: "drop policy" verlangt Eigentuemerschaft an storage.objects, die
-- die Projektrolle nicht hat. Der Fehler wird abgefangen und gemeldet, damit
-- er nicht die uebrigen Teile von R3 mitreisst. Ob die Policies wirklich weg
-- sind, prueft die Kontrolle unten am Ergebnis.
do $$
begin
  execute 'drop policy if exists employee_documents_insert_own   on storage.objects';
  execute 'drop policy if exists employee_documents_select_own   on storage.objects';
  execute 'drop policy if exists employee_documents_select_admin on storage.objects';
  raise notice 'R3: Die uebrigen 011-Policies auf storage.objects sind entfernt.';
exception
  when insufficient_privilege then
    raise notice 'R3: Die 011-Policies auf storage.objects konnten NICHT entfernt werden: %. Das verlangt Eigentuemerschaft an storage.objects. Sie gehoeren ins Dashboard. Die Kontrolle unten bricht deshalb ab.', sqlerrm;
end
$$;

-- --- HIER STAND FRUEHER EIN RECHTE-BLOCK - ER IST ENTFALLEN ---------------
-- Frueher folgten an dieser Stelle
--   revoke all on storage.objects from authenticated;
--   revoke all on storage.objects from anon;
--   grant  all on storage.objects to   authenticated;
-- Das ist ersatzlos gestrichen. Begruendung, kurz:
--   1. Die Einspielung hat diese Rechte NIE veraendert. Es gibt nichts
--      zurueckzunehmen. Ein Rueckweg stellt her, was war - er greift nicht
--      dort ein, wo er nie war.
--   2. Das revoke waere ohnehin wirkungslos: die Eintraege stammen von
--      supabase_storage_admin, ein revoke der Projektrolle entfernt nur
--      eigene - ohne Fehler und ohne Warnung.
--   3. Das grant dagegen WAERE wirksam und haette Schaden angerichtet: es
--      legt einen zweiten Vergeber-Eintrag an, den es vorher nicht gab. Der
--      Rueckweg haette den Stand also weiter vom Ausgangsstand entfernt.
-- Die Schranke nach diesem Schritt ist RLS: es steht dann keine Policy mehr
-- auf storage.objects, und ohne Policy verweigert RLS jeden Zugriff - auch
-- fuer anon, das seine Plattform-Grants unveraendert behaelt.
-- Siehe CLAUDE.md, "Plattform-Grants auf storage.objects und storage.buckets".


do $$
declare
  v_offen  text;
  v_alle   integer;
begin
  select string_agg(policyname, ', ' order by policyname) into v_offen
  from pg_policies
  where schemaname = 'storage' and tablename = 'objects'
    and policyname like 'employee_documents%';
  if v_offen is not null then
    raise exception 'KONTROLLE R3: Es stehen noch Policies aus 011: %', v_offen;
  end if;

  -- Keine Policy fuer anon oder PUBLIC - weder aus 011 noch aus einer anderen
  -- Quelle. Das ist hier keine Formalie: die Plattform-Grants von anon bleiben
  -- unveraendert, die fehlende Policy ist also die einzige Schranke.
  select string_agg(policyname || ' (' || array_to_string(roles, ', ') || ')',
                    ', ' order by policyname)
    into v_offen
  from pg_policies
  where schemaname = 'storage' and tablename = 'objects'
    and roles && array['anon', 'public']::name[];
  if v_offen is not null then
    raise exception 'KONTROLLE R3: Auf storage.objects stehen Policies fuer anon oder PUBLIC: %. Sie stammen nicht aus 011 und werden hier nicht entfernt - erst klaeren, wofuer sie da sind.', v_offen;
  end if;

  select count(*) into v_alle from pg_policies
   where schemaname = 'storage' and tablename = 'objects';
  raise notice 'R3: Verbleibende Policies auf storage.objects: %.', v_alle;

  -- Die Tabellenrechte werden hier NICHT geprueft und NICHT veraendert. Sie
  -- sind Plattform-Grants und waren nie Gegenstand der Einspielung. Wer den
  -- Stand sehen will, faehrt 01c_rechtestand_storage.sql - rein lesend. An
  -- dieser Stelle steht ausdruecklich kein Abgleich mit einem Sollwert: was
  -- dabei als "Abweichung" gemeldet wuerde, waere keine.
  if exists (
    select 1 from pg_class as c
    cross join lateral aclexplode(c.relacl) as a
    where c.oid = to_regclass('storage.objects')
      and a.grantor::regrole::text = current_user
  ) then
    raise notice 'HINWEIS R3: Auf storage.objects steht ein ACL-Eintrag, den % vergeben hat. Diese Datei vergibt dort nichts - der Eintrag stammt aus einer anderen Quelle, moeglicherweise aus einer frueheren Fassung dieses Rueckwegs. Nachsehen mit 01c_rechtestand_storage.sql, Spalte "vergeben von".', current_user;
  end if;

  raise notice 'KONTROLLE R3 bestanden. Die Policies aus 011 sind von storage.objects entfernt, und es steht dort keine Policy fuer anon oder PUBLIC. Die Tabellenrechte sind unveraendert geblieben - dieser Rueckweg fasst sie nicht an.';
end
$$;

commit;


-- ===========================================================================
-- R4 - Insert-Policies in public auf den gemessenen Wortlaut zuruecksetzen
-- ===========================================================================
-- Diese Stufe kommt VOR R5. Die verschaerften Policies rufen
-- private.is_active_employee() auf. Wuerde die Funktion zuerst fallen,
-- scheiterte es an der Abhaengigkeit - oder schlimmer, mit cascade fiele die
-- Policy mit und die Tabelle staende ohne Insert-Policy da.
begin;

do $$
begin
  if to_regclass('public.document_submissions') is null
     or to_regclass('public.sickness_reports') is null then
    raise exception 'ABBRUCH R4: Eine der beiden Tabellen fehlt.';
  end if;
  raise notice 'Aktueller WITH CHECK document_submissions_employee_insert: %',
    coalesce((select with_check from pg_policies
               where schemaname = 'public' and tablename = 'document_submissions'
                 and policyname = 'document_submissions_employee_insert'), '(fehlt)');
  raise notice 'Aktueller WITH CHECK sickness_reports_employee_insert: %',
    coalesce((select with_check from pg_policies
               where schemaname = 'public' and tablename = 'sickness_reports'
                 and policyname = 'sickness_reports_employee_insert'), '(fehlt)');
end
$$;

drop policy if exists document_submissions_employee_insert on public.document_submissions;
drop policy if exists sickness_reports_employee_insert     on public.sickness_reports;

-- --- GEMESSENER AUSGANGSSTAND, 13.09.2026 ---------------------------------
-- Wortlaut aus der Ausgabe von 01_sicherung-ist-stand.sql, Bereich "Policy".
-- Nicht aus einer Migrationsdatei abgeschrieben - die Ausgabe zeigt, was vor
-- der Einspielung tatsaechlich dastand.
--
-- Was damit zurueckgeht, im Vergleich zur Fassung aus 011:
--   document_submissions: die Bindung des Pfades an auth.uid() faellt weg,
--                         ebenso private.is_active_employee().
--   sickness_reports:     client_request_id IS NOT NULL faellt weg, ebenso die
--                         Pruefung der Verknuepfung und is_active_employee().
-- Das ist gewollt. Ein Rueckweg stellt den Ausgangsstand her, er verbessert
-- ihn nicht.
create policy document_submissions_employee_insert on public.document_submissions as permissive for insert to authenticated with check (((employee_id = private.current_user_employee_id()) AND (status = 'submitted'::text) AND (reviewed_at IS NULL) AND (reviewed_by IS NULL)));
create policy sickness_reports_employee_insert on public.sickness_reports as permissive for insert to authenticated with check (((employee_id = private.current_user_employee_id()) AND (status = 'submitted'::text)));


do $$
declare
  v_tab text;
  v_pol text;
begin
  foreach v_tab in array array['document_submissions', 'sickness_reports'] loop
    v_pol := case when v_tab = 'document_submissions'
                  then 'document_submissions_employee_insert'
                  else 'sickness_reports_employee_insert' end;

    -- Eine Tabelle mit RLS und ohne Insert-Policy nimmt gar nichts mehr an.
    -- Das waere ein Ausfall, kein Rueckweg.
    if not exists (select 1 from pg_policies
                    where schemaname = 'public' and tablename = v_tab
                      and policyname = v_pol) then
      raise exception 'KONTROLLE R4: Policy % fehlt. Wurde der Wortlaut aus Schritt 01 eingesetzt? Ohne Insert-Policy nimmt public.% keine Eintraege mehr an.', v_pol, v_tab;
    end if;

    -- Permissive Policies verknuepfen mit ODER: genau eine INSERT-Policy.
    if (select count(*) from pg_policies
         where schemaname = 'public' and tablename = v_tab and cmd = 'INSERT') <> 1 then
      raise exception 'KONTROLLE R4: Auf public.% steht nicht genau eine INSERT-Policy.', v_tab;
    end if;

    -- Die zurueckgesetzte Policy darf die 011-Verschaerfung nicht mehr tragen.
    if exists (select 1 from pg_policies
                where schemaname = 'public' and tablename = v_tab
                  and policyname = v_pol
                  and with_check like '%is_active_employee%') then
      raise notice 'HINWEIS R4: % prueft weiterhin is_active_employee(). Das ist nur richtig, wenn der gemessene Ausgangsstand das schon tat. Sonst wurde der falsche Wortlaut eingesetzt.', v_pol;
    end if;
  end loop;

  raise notice 'KONTROLLE R4 bestanden.';
end
$$;

commit;


-- ===========================================================================
-- R5 - Sperr-Trigger und Funktionen aus 011 entfernen
-- ===========================================================================
-- Diese Objekte liegen in public und private und gehoeren dem Projekt.
-- Hier gilt die Einbahnstrasse aus dem Kopf NICHT - drop trigger gelingt,
-- weil die Tabellen dem Projekt gehoeren.
--
-- Kein cascade. Ein cascade wuerde stillschweigend mitreissen, was noch
-- haengt. Scheitert ein drop an einer Abhaengigkeit, ist das der Befund.
begin;

do $$
begin
  if exists (select 1 from pg_policies
              where schemaname = 'storage' and tablename = 'objects'
                and (qual like '%is_unlinked_document%' or with_check like '%is_active_employee%')) then
    raise exception 'ABBRUCH R5: Auf storage.objects steht noch eine Policy, die diese Funktionen aufruft. Zuerst R3.';
  end if;
  if exists (select 1 from pg_policies
              where schemaname = 'public'
                and (coalesce(qual, '') || coalesce(with_check, '')) like '%is_active_employee%') then
    raise exception 'ABBRUCH R5: In public ruft noch eine Policy is_active_employee() auf. Zuerst R4.';
  end if;
  raise notice 'Vorpruefung R5 bestanden.';
end
$$;

drop trigger if exists document_submissions_lock_object on public.document_submissions;
drop trigger if exists employee_documents_lock_object   on public.employee_documents;

drop function if exists private.lock_document_object();
drop function if exists private.is_unlinked_document(text);
drop function if exists private.is_active_employee();

-- private.guard_document_object_delete() bleibt ABSICHTLICH stehen.
-- Sie haengt am Trigger auf storage.objects, den die Projektrolle nicht
-- entfernen kann. R2 hat sie neutralisiert. Siehe Kopf.

do $$
begin
  if to_regprocedure('private.lock_document_object()') is not null
     or to_regprocedure('private.is_unlinked_document(text)') is not null
     or to_regprocedure('private.is_active_employee()') is not null then
    raise exception 'KONTROLLE R5: Mindestens eine der drei Funktionen aus 011 steht noch.';
  end if;
  if exists (select 1 from pg_trigger
              where tgrelid in (to_regclass('public.document_submissions'),
                                to_regclass('public.employee_documents'))
                and tgname in ('document_submissions_lock_object',
                               'employee_documents_lock_object')) then
    raise exception 'KONTROLLE R5: Ein Sperr-Trigger steht noch.';
  end if;
  if to_regprocedure('private.guard_document_object_delete()') is null then
    raise exception 'KONTROLLE R5: private.guard_document_object_delete() wurde entfernt. Steht der Trigger auf storage.objects noch, wirft ab jetzt jedes DELETE einen Fehler. Nicht festschreiben.';
  end if;
  raise notice 'KONTROLLE R5 bestanden. private.guard_document_object_delete() bleibt neutralisiert bestehen - das ist so vorgesehen.';
end
$$;

commit;


-- ===========================================================================
-- R6 - Spalte, Indizes, Dokumentarten, Bucket
-- ===========================================================================
-- Diese Stufe ist die einzige, die NUTZDATEN vernichten kann. Sie bricht
-- deshalb ab, sobald Daten daran haengen.
--
-- Sie ist auch die einzige, die weggelassen werden darf: ein zusaetzlicher
-- Index, eine leere Spalte und vier Zeilen in document_types schaden nicht.
-- Im Zweifel R6 ueberspringen.
begin;

do $$
declare
  v_objekte integer;
  v_werte   integer;
begin
  select count(*) into v_objekte from storage.objects where bucket_id = 'employee-documents';
  if v_objekte > 0 then
    raise exception 'ABBRUCH R6: Im Bucket employee-documents liegen % Objekt(e). Sie muessen ueber die Storage-API entfernt werden (remove), und zwar NACH R2: solange die Loeschsperre aus R1 steht, lehnt der Trigger auch die Storage-API ab. Ein SQL-DELETE loescht nur den Katalogeintrag und laesst die Dateien als Leichen im Objektspeicher zurueck.', v_objekte;
  end if;

  if exists (select 1 from pg_attribute
              where attrelid = to_regclass('public.sickness_reports')
                and attname = 'client_request_id' and attnum > 0 and not attisdropped) then
    execute 'select count(client_request_id) from public.sickness_reports' into v_werte;
    if v_werte > 0 then
      raise exception 'ABBRUCH R6: In sickness_reports.client_request_id stehen % Werte. Das Entfernen der Spalte wuerde sie vernichten. Entweder die Werte sichern oder R6 weglassen - die Spalte schadet nicht.', v_werte;
    end if;
  end if;

  raise notice 'Vorpruefung R6 bestanden. Bucket leer, keine Werte in client_request_id.';
end
$$;

drop index if exists public.idx_document_submissions_submitted_at;
drop index if exists public.uq_sickness_reports_client_request;
alter table public.sickness_reports drop column if exists client_request_id;

-- --- Die vier Dokumentarten aus 011 ---------------------------------------
-- GEMESSEN am 13.09.2026: public.document_types hatte 0 Zeilen, alle vier
-- Dokumentarten fehlten. Sie stammen damit vollstaendig aus 011 und gehoeren
-- zum Rueckweg. Frueher stand dieses delete auskommentiert hier, weil der
-- Ausgangsstand nicht bekannt war - jetzt ist er es.
do $$
declare
  v_fremd integer;
begin
  select count(*) into v_fremd
  from public.document_types
  where key not in ('fuehrerschein', 'personenbefoerderungsschein',
                    'krankenschein_au', 'sonstiges');
  if v_fremd > 0 then
    raise notice 'HINWEIS R6: In document_types stehen % Zeile(n), die nicht aus 011 stammen. Sie bleiben unberuehrt.', v_fremd;
  end if;
end
$$;

delete from public.document_types
 where key in ('fuehrerschein', 'personenbefoerderungsschein',
               'krankenschein_au', 'sonstiges');

-- --- Bucket ---------------------------------------------------------------
-- HIER STEHT BEWUSST KEIN DELETE.
--
-- GEMESSEN am 13.09.2026 (01b_rechteherkunft.sql, Posten 36 und 38): auf
-- storage.buckets haengt
--   protect_buckets_delete BEFORE DELETE ON storage.buckets
--     FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete()
-- und storage.protect_delete() wirft bei JEDEM direkten SQL-DELETE
--   ERRCODE 42501
--   'Direct deletion from storage tables is not allowed. Use the Storage API
--    instead.'
-- Derselbe Trigger haengt unter dem Namen protect_objects_delete auch auf
-- storage.objects. Das Verhalten ist damit kein Verdacht mehr, sondern
-- gelesener Funktionsrumpf.
--
-- NACHGEMESSEN am 14.09.2026 im oertlichen Nachbau, der diesen Rumpf seit
-- dieser Fassung woertlich enthaelt: der Fehler tritt genau so auf.
--
-- Ein "delete from storage.buckets" an dieser Stelle koennte also nicht
-- gelingen. Es wuerde die GESAMTE Transaktion R6 zurueckrollen und damit auch
-- die Spalte, die beiden Indizes und die vier Dokumentarten wieder stehen
-- lassen - der Rueckweg waere schlechter dran als ohne diese Zeile.
--
-- ZWEI WEGE, DIE HIER AUSDRUECKLICH NICHT GEGANGEN WERDEN
--   1. "set storage.allow_delete_query = 'true'" wuerde den Schutz aushebeln.
--      Ausgeschlossen. Der Schutz ist der Grund, warum in diesem Projekt
--      keine Dateileichen im Objektspeicher entstehen.
--   2. Den Plattform-Trigger abschalten oder entfernen. Ausgeschlossen. Er
--      gehoert supabase_storage_admin und stammt nicht aus 011.
--
-- DER BUCKET WIRD DESHALB AUSSERHALB VON SQL ENTFERNT:
--   Storage-API:  erst emptyBucket('employee-documents'),
--                 dann  deleteBucket('employee-documents')
--   oder Dashboard: Storage -> employee-documents -> Delete bucket
--
-- Die Vorpruefung oben hat bereits nachgewiesen, dass keine Objekte mehr im
-- Bucket liegen. Die Kontrolle unten meldet den verbliebenen Bucket als
-- OFFENEN PUNKT und nicht als Fehler - R6 soll deswegen nicht scheitern.

do $$
declare
  v_arten integer;
begin
  if exists (select 1 from pg_attribute
              where attrelid = to_regclass('public.sickness_reports')
                and attname = 'client_request_id' and attnum > 0 and not attisdropped) then
    raise exception 'KONTROLLE R6: Die Spalte client_request_id steht noch.';
  end if;
  if to_regclass('public.idx_document_submissions_submitted_at') is not null
     or to_regclass('public.uq_sickness_reports_client_request') is not null then
    raise exception 'KONTROLLE R6: Ein Index aus 011 steht noch.';
  end if;

  select count(*) into v_arten from public.document_types
  where key in ('fuehrerschein', 'personenbefoerderungsschein',
                'krankenschein_au', 'sonstiges');
  if v_arten > 0 then
    raise exception 'KONTROLLE R6: In document_types stehen noch % der vier Dokumentarten aus 011.', v_arten;
  end if;

  -- Der Bucket ist KEIN Abbruchgrund. Sein Fortbestehen ist der ERWARTETE
  -- Zustand nach diesem Skript - siehe die Begruendung oben.
  if exists (select 1 from storage.buckets where id = 'employee-documents') then
    raise notice 'OFFEN NACH R6: Der Bucket employee-documents besteht weiter. Das ist erwartet und kein Fehler - storage.protect_delete() laesst kein SQL-DELETE auf storage.buckets zu. Zu entfernen ueber die Storage-API (emptyBucket, dann deleteBucket) oder das Dashboard. Solange er steht, ist der Rueckweg NICHT abgeschlossen.';
  else
    raise notice 'Der Bucket employee-documents ist bereits ausserhalb von SQL entfernt worden.';
  end if;

  raise notice '--- STAND NACH R6 -------------------------------------------';
  raise notice 'WIEDERHERGESTELLT: Spalte client_request_id, beide Indizes und die vier Dokumentarten sind entfernt; die Policies stehen wieder auf dem am 13.09.2026 gemessenen Wortlaut.';
  raise notice 'NIE VERAENDERT, DESHALB AUCH NICHT WIEDERHERGESTELLT: die Tabellenrechte auf storage.objects und storage.buckets. Sie sind Plattform-Grants; diese Datei hat dort nichts vergeben und nichts entzogen, auch nicht bei anon. Die Schranke ist RLS - und RLS erfasst TRUNCATE, REFERENCES, TRIGGER und MAINTAIN NICHT.';
  raise notice 'BEWUSST BEIBEHALTEN (keine Wiederherstellung, sondern Absicht): 1. Der Trigger storage_objects_guard_delete auf storage.objects bleibt bestehen und ist nur neutralisiert. 2. Die Funktion private.guard_document_object_delete() bleibt bestehen; vor 011 gab es sie nicht. Beides ist eine Abweichung vom Ausgangsstand.';
  raise notice 'OFFEN, AUSSERHALB VON SQL: der Bucket employee-documents, falls oben gemeldet.';
  raise notice 'Dieser Stand darf deshalb NICHT als vollstaendige Wiederherstellung des Ausgangsstands bezeichnet werden.';
end
$$;

commit;
