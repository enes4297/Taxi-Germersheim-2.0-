-- ===========================================================================
-- Schritt 02 - Der Teil von 011, der im Schema public liegt
-- ===========================================================================
--
-- ENTHAELT die Abschnitte 2, 3, 6, 7, 8 und 10 der Migration 011, wortgleich
-- uebernommen. NICHT enthalten: Bucket, Rechte und Policies auf
-- storage.objects, der Loeschschutz-Trigger. Die kommen in 03 bis 07.
-- Abschnitt 4a der Migration 011 (grant/revoke auf storage.objects) ist
-- ENTFALLEN - siehe README.md, Abschnitt "Schritt 04 ist entfallen".
--
-- REIHENFOLGE - VERBINDLICH
--   01_sicherung-ist-stand.sql   Ausgabe gesichert
--   DIESE DATEI
--   03_bucket.sql
--   storage-trigger-nachtragen.sql          (ein Verzeichnis hoeher)
--   06_policies_lesen_schreiben.sql
--   storage-delete-policy-nachtragen.sql    (ein Verzeichnis hoeher)
--
-- Dieser Schritt kommt zuerst, weil die vier Storage-Policies aus 06 und 07
-- die hier angelegten Funktionen aufrufen. Vorher waeren ihre Ausdruecke
-- nicht aufloesbar.
--
-- VOLLSTAENDIG UMKEHRBAR bis auf eine Stelle: die Spalte
-- sickness_reports.client_request_id. Sie bleibt beim Rueckweg stehen, weil
-- ein drop column bereits geschriebene Vorgangsschluessel vernichten wuerde.
-- Sie ist nullable und stoert nichts. Siehe 90_rueckweg.sql.
--
-- KEINE TESTDATEN. Angelegt werden ausschliesslich die vier fachlichen
-- Dokumentarten aus 011. Keine Konten, keine Mitarbeiter, keine Dateien.
-- ===========================================================================

begin;

-- --- Vorpruefung -----------------------------------------------------------
do $$
declare
  v_fehlend text;
  v_owner   text;
begin
  -- 1) Tabellen aus 001
  v_fehlend := null;
  if to_regclass('public.document_submissions') is null then v_fehlend := concat_ws(', ', v_fehlend, 'public.document_submissions'); end if;
  if to_regclass('public.employee_documents')   is null then v_fehlend := concat_ws(', ', v_fehlend, 'public.employee_documents');   end if;
  if to_regclass('public.sickness_reports')     is null then v_fehlend := concat_ws(', ', v_fehlend, 'public.sickness_reports');     end if;
  if to_regclass('public.document_types')       is null then v_fehlend := concat_ws(', ', v_fehlend, 'public.document_types');       end if;
  if v_fehlend is not null then
    raise exception 'ABBRUCH: Fehlende Tabelle(n): %. Die Migrationen 001 bis 010 sind nicht eingespielt. 011 darf hier nicht laufen.', v_fehlend;
  end if;

  -- 2) Funktionen aus 002, auf die die Policies sich stuetzen
  v_fehlend := null;
  if to_regprocedure('private.is_admin()') is null then
    v_fehlend := 'private.is_admin()';
  end if;
  if to_regprocedure('private.current_user_employee_id()') is null then
    v_fehlend := concat_ws(', ', v_fehlend, 'private.current_user_employee_id()');
  end if;
  if v_fehlend is not null then
    raise exception 'ABBRUCH: Fehlende Funktion(en) aus 002: %.', v_fehlend;
  end if;

  -- 3) document_types.key muss eindeutig sein, sonst greift das
  --    on conflict (key) unten nicht und legt Duplikate an.
  if not exists (
    select 1
    from pg_constraint
    where conrelid = to_regclass('public.document_types')
      and contype in ('p', 'u')
      and (select array_agg(a.attname::text order by a.attname)
             from pg_attribute as a
            where a.attrelid = conrelid and a.attnum = any(conkey)) = array['key']
  ) then
    raise exception 'ABBRUCH: Auf public.document_types fehlt eine Eindeutigkeit auf (key). Das on-conflict unten wuerde Duplikate anlegen.';
  end if;

  -- 4) Schema private
  if not exists (select 1 from pg_namespace where nspname = 'private') then
    raise exception 'ABBRUCH: Schema private fehlt.';
  end if;

  -- 5) Die WICHTIGSTE Vorpruefung dieses Schritts.
  --    private.lock_document_object() nimmt ein "select ... for update" auf
  --    storage.objects. Sie ist SECURITY DEFINER und laeuft damit als ihr
  --    EIGENTUEMER, nicht als authenticated. FOR UPDATE verlangt SELECT UND
  --    UPDATE auf der Tabelle. Fehlt dem Eigentuemer das UPDATE-Recht, legt
  --    sich die Funktion hier ohne Murren an und scheitert erst spaeter im
  --    Betrieb bei jeder Einreichung.
  v_owner := current_user;
  if to_regclass('storage.objects') is null then
    raise exception 'ABBRUCH: storage.objects fehlt. Storage im Projekt aktivieren.';
  end if;
  if not has_table_privilege(v_owner, 'storage.objects', 'SELECT') then
    raise exception 'ABBRUCH: % hat kein SELECT auf storage.objects. private.lock_document_object() koennte die Zeile nicht lesen.', v_owner;
  end if;
  if not has_table_privilege(v_owner, 'storage.objects', 'UPDATE') then
    raise exception 'ABBRUCH: % hat kein UPDATE auf storage.objects. Das "select ... for update" in private.lock_document_object() wuerde im Betrieb scheitern, nicht hier.', v_owner;
  end if;

  raise notice 'Vorpruefung bestanden. Eigentuemer der neuen Funktionen: %', v_owner;
end
$$;


-- ===========================================================================
-- 011 Abschnitt 2) Dokumentarten (wiederholbar, key ist unique)
-- ===========================================================================
insert into public.document_types (key, label)
values
  ('fuehrerschein',                'Führerschein'),
  ('personenbefoerderungsschein',  'Personenbeförderungsschein'),
  ('krankenschein_au',             'Krankenschein / AU'),
  ('sonstiges',                    'Sonstiges')
on conflict (key) do update
  set label = excluded.label;


-- ===========================================================================
-- 011 Abschnitt 3) Serverseitige Berechtigungspruefung
-- ===========================================================================
create or replace function private.is_active_employee()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as p
    join public.employees as e on e.id = p.employee_id
    where p.auth_user_id = (select auth.uid())
      and p.active = true
      and e.active = true
      and e.portal_active = true
  );
$$;

revoke all on function private.is_active_employee() from public;
revoke all on function private.is_active_employee() from anon;
grant execute on function private.is_active_employee() to authenticated;

create or replace function private.is_unlinked_document(p_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_path is not null
     and not exists (select 1 from public.document_submissions where file_path = p_path)
     and not exists (select 1 from public.employee_documents  where file_path = p_path);
$$;

revoke all on function private.is_unlinked_document(text) from public;
revoke all on function private.is_unlinked_document(text) from anon;
grant execute on function private.is_unlinked_document(text) to authenticated;


-- ===========================================================================
-- 011 Abschnitt 6) Bei JEDEM Verknuepfen dieselbe Zeile sperren
-- ===========================================================================
create or replace function private.lock_document_object()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_exists boolean;
begin
  if new.file_path is null then
    return new;
  end if;

  if tg_op = 'UPDATE' and new.file_path is not distinct from old.file_path then
    return new;
  end if;

  if not exists (
    select 1 from storage.objects as o
    where o.bucket_id = 'employee-documents' and o.name = new.file_path
  ) and split_part(new.file_path, '/', 1) !~ '^[0-9a-f-]{36}$' then
    return new;
  end if;

  select true
  into v_exists
  from storage.objects as o
  where o.bucket_id = 'employee-documents'
    and o.name = new.file_path
  for update;

  if v_exists is not true then
    raise exception 'DOCUMENT_FILE_NOT_FOUND' using errcode = '23503';
  end if;

  return new;
end;
$$;

revoke all on function private.lock_document_object() from public;
revoke all on function private.lock_document_object() from anon;
revoke all on function private.lock_document_object() from authenticated;

drop trigger if exists document_submissions_lock_object on public.document_submissions;
create trigger document_submissions_lock_object
  before insert or update of file_path on public.document_submissions
  for each row
  execute function private.lock_document_object();

drop trigger if exists employee_documents_lock_object on public.employee_documents;
create trigger employee_documents_lock_object
  before insert or update of file_path on public.employee_documents
  for each row
  execute function private.lock_document_object();


-- ===========================================================================
-- 011 Abschnitt 7) Dateipfad serverseitig an den angemeldeten Nutzer binden
-- ===========================================================================
drop policy if exists document_submissions_employee_insert on public.document_submissions;
create policy document_submissions_employee_insert
  on public.document_submissions
  as permissive
  for insert
  to authenticated
  with check (
    employee_id = private.current_user_employee_id()
    and status = 'submitted'
    and reviewed_at is null
    and reviewed_by is null
    and private.is_active_employee()
    and (
      file_path is null
      or split_part(file_path, '/', 1) = (select auth.uid())::text
    )
  );


-- ===========================================================================
-- 011 Abschnitt 8) Vorgangsschluessel gegen doppelte Krankmeldungen
-- ===========================================================================
alter table public.sickness_reports
  add column if not exists client_request_id uuid;

comment on column public.sickness_reports.client_request_id is
  'Technischer Vorgangsschluessel des Sendevorgangs. Bleibt ueber Wiederholungen gleich und verhindert Doppel nach verlorener Antwort (011).';

create unique index if not exists uq_sickness_reports_client_request
  on public.sickness_reports(employee_id, client_request_id)
  where client_request_id is not null;

drop policy if exists sickness_reports_employee_insert on public.sickness_reports;
create policy sickness_reports_employee_insert
  on public.sickness_reports
  as permissive
  for insert
  to authenticated
  with check (
    employee_id = private.current_user_employee_id()
    and status = 'submitted'
    and private.is_active_employee()
    and client_request_id is not null
    and (
      document_submission_id is null
      or exists (
        select 1
        from public.document_submissions as ds
        where ds.id = document_submission_id
          and ds.employee_id = private.current_user_employee_id()
      )
    )
  );


-- ===========================================================================
-- 011 Abschnitt 10) Index fuer den Dokumenteingang im Adminbereich
-- ===========================================================================
create index if not exists idx_document_submissions_submitted_at
  on public.document_submissions(submitted_at desc);


-- ===========================================================================
-- Kontrolle - NOCH VOR DEM COMMIT
-- ===========================================================================
-- Schlaegt eine Pruefung an, wird nichts festgeschrieben.
do $$
declare
  v_anzahl integer;
  v_text   text;
begin
  -- 1) Die drei Funktionen stehen
  if to_regprocedure('private.is_active_employee()') is null
     or to_regprocedure('private.is_unlinked_document(text)') is null
     or to_regprocedure('private.lock_document_object()') is null then
    raise exception 'KONTROLLE: Eine der drei Funktionen fehlt.';
  end if;

  -- 2) anon hat auf keiner der drei Funktionen ein Ausfuehrungsrecht.
  --    anon bekommt nirgends Rechte.
  if has_function_privilege('anon', 'private.is_active_employee()', 'EXECUTE')
     or has_function_privilege('anon', 'private.is_unlinked_document(text)', 'EXECUTE')
     or has_function_privilege('anon', 'private.lock_document_object()', 'EXECUTE') then
    raise exception 'KONTROLLE: anon hat ein Ausfuehrungsrecht auf einer der neuen Funktionen.';
  end if;

  -- 3) authenticated darf die beiden Pruefungen aufrufen, die Triggerfunktion
  --    aber nicht.
  if not has_function_privilege('authenticated', 'private.is_active_employee()', 'EXECUTE') then
    raise exception 'KONTROLLE: authenticated fehlt das Ausfuehrungsrecht auf private.is_active_employee().';
  end if;
  if not has_function_privilege('authenticated', 'private.is_unlinked_document(text)', 'EXECUTE') then
    raise exception 'KONTROLLE: authenticated fehlt das Ausfuehrungsrecht auf private.is_unlinked_document(text).';
  end if;
  if has_function_privilege('authenticated', 'private.lock_document_object()', 'EXECUTE') then
    raise exception 'KONTROLLE: authenticated kann private.lock_document_object() direkt aufrufen.';
  end if;

  -- 4) Alle drei Funktionen mit gesetztem search_path. Ohne das waere der
  --    Suchpfad des Aufrufers wirksam.
  --    Der Katalog legt den Wert als 'search_path=""' ab, mit
  --    Anfuehrungszeichen. Deshalb wird auf den Praefix geprueft und nicht
  --    auf Gleichheit - oertlich gemessen am 13.09.2026.
  select string_agg(p.proname::text, ', ' order by p.proname)
  into v_text
  from pg_proc as p
  join pg_namespace as n on n.oid = p.pronamespace
  where n.nspname = 'private'
    and p.proname in ('is_active_employee', 'is_unlinked_document', 'lock_document_object')
    and not exists (
      select 1
      from unnest(coalesce(p.proconfig, array[]::text[])) as cfg
      where cfg like 'search\_path=%'
    );
  if v_text is not null then
    raise exception 'KONTROLLE: Ohne "set search_path = ..": %', v_text;
  end if;

  -- 5) Die beiden Sperr-Trigger stehen und sind aktiv
  select count(*) into v_anzahl
  from pg_trigger
  where tgname in ('document_submissions_lock_object', 'employee_documents_lock_object')
    and not tgisinternal
    and tgenabled = 'O';
  if v_anzahl <> 2 then
    raise exception 'KONTROLLE: Erwartet 2 aktive Sperr-Trigger, gefunden %.', v_anzahl;
  end if;

  -- 6) GENAU EINE INSERT-Policy je Tabelle. Permissive Policies verknuepfen
  --    mit ODER - eine zweite wuerde die Verschaerfung unterlaufen.
  select count(*) into v_anzahl from pg_policies
   where schemaname = 'public' and tablename = 'document_submissions' and cmd = 'INSERT';
  if v_anzahl <> 1 then
    raise exception 'KONTROLLE: % INSERT-Policies auf document_submissions. Erwartet genau 1, sonst verknuepfen sie mit ODER.', v_anzahl;
  end if;
  select count(*) into v_anzahl from pg_policies
   where schemaname = 'public' and tablename = 'sickness_reports' and cmd = 'INSERT';
  if v_anzahl <> 1 then
    raise exception 'KONTROLLE: % INSERT-Policies auf sickness_reports. Erwartet genau 1.', v_anzahl;
  end if;

  -- 7) Die Verschaerfungen stehen tatsaechlich im Policy-Text
  select with_check into v_text from pg_policies
   where schemaname = 'public' and tablename = 'document_submissions'
     and policyname = 'document_submissions_employee_insert';
  if v_text is null or v_text not like '%is_active_employee%' or v_text not like '%split_part%' then
    raise exception 'KONTROLLE: document_submissions_employee_insert enthaelt die Verschaerfung nicht.';
  end if;
  select with_check into v_text from pg_policies
   where schemaname = 'public' and tablename = 'sickness_reports'
     and policyname = 'sickness_reports_employee_insert';
  if v_text is null or v_text not like '%is_active_employee%' or v_text not like '%client_request_id%' then
    raise exception 'KONTROLLE: sickness_reports_employee_insert enthaelt die Verschaerfung nicht.';
  end if;

  -- 8) Spalte, Index und der Index fuer den Dokumenteingang
  if not exists (select 1 from pg_attribute
                  where attrelid = to_regclass('public.sickness_reports')
                    and attname = 'client_request_id' and attnum > 0 and not attisdropped) then
    raise exception 'KONTROLLE: Spalte client_request_id fehlt.';
  end if;
  if to_regclass('public.uq_sickness_reports_client_request') is null then
    raise exception 'KONTROLLE: Index uq_sickness_reports_client_request fehlt.';
  end if;
  if to_regclass('public.idx_document_submissions_submitted_at') is null then
    raise exception 'KONTROLLE: Index idx_document_submissions_submitted_at fehlt.';
  end if;

  -- 9) Die vier Dokumentarten, ohne Duplikate
  select count(*) into v_anzahl from public.document_types
   where key in ('fuehrerschein', 'personenbefoerderungsschein', 'krankenschein_au', 'sonstiges');
  if v_anzahl <> 4 then
    raise exception 'KONTROLLE: Erwartet 4 Dokumentarten aus 011, gefunden %.', v_anzahl;
  end if;

  -- 10) Es wurde KEIN Storage-Objekt angefasst. Dieser Schritt darf das nicht.
  if exists (select 1 from pg_policies where schemaname = 'storage') then
    raise notice 'Hinweis: Es gibt Policies im Schema storage. Dieser Schritt hat keine angelegt.';
  end if;

  raise notice 'Kontrolle bestanden. Schritt 02 kann festgeschrieben werden.';
end
$$;

commit;
