-- 12_document_upload_test.sql
--
-- Prueft Migration 011 auf Datenbankebene: Bucket, Dokumenttypen,
-- Storage-Policies, Pfadbindung und die Verknuepfung von Krankenscheinen.
--
-- NUR LOKALE TESTUMGEBUNG. Voraussetzung: 00_supabase_shim, 01_storage_shim,
-- Migrationen 001-011, danach 010_..._seed.sql.
-- Alle Testzeilen tragen 'TESTDATA-012' und werden am Ende entfernt.

drop table if exists pg_temp._tg_doc;
create temporary table _tg_doc (nr int, pruefung text, ergebnis text, status text);

do $$
declare
  v_ma_uid    uuid;  v_ma_emp  uuid;
  v_ma2_uid   uuid;  v_ma2_emp uuid;
  v_admin_uid   uuid;
  v_dispo_uid   uuid;
  v_kunde_uid   uuid;
  v_inaktiv_uid uuid;

  v_pfad_eigen  text;
  v_pfad_fremd  text;
  v_sub_id      uuid;
  v_sub_fremd   uuid;
  v_rows        integer;
  v_txt         text;
  v_sqlstate    text;
  v_message     text;
  v_bucket      record;
begin
  -- Identitaeten VOR dem ersten Rollenwechsel lesen.
  select auth_user_id into strict v_ma_uid    from tg_test.identities where schluessel = 'mitarbeiter';
  select auth_user_id into strict v_admin_uid from tg_test.identities where schluessel = 'admin';
  select auth_user_id into strict v_dispo_uid from tg_test.identities where schluessel = 'disponent';
  select auth_user_id into strict v_kunde_uid from tg_test.identities where schluessel = 'kunde_a';
  select auth_user_id into strict v_inaktiv_uid from tg_test.identities where schluessel = 'inaktiv';
  select employee_id  into strict v_ma_emp    from public.profiles where auth_user_id = v_ma_uid;

  -- Zweiter Mitarbeiter (Disponentenkonto bekommt einen employees-Satz).
  insert into public.employees (id, first_name, last_name, employment_type, status, active, portal_active)
  values ('e0000000-0000-4000-8000-0000000000e3', 'TESTDATA-012', 'Kollege', 'teilzeit', 'active', true, true)
  on conflict (id) do nothing;
  v_ma2_emp := 'e0000000-0000-4000-8000-0000000000e3';
  update public.profiles set employee_id = v_ma2_emp where auth_user_id = v_dispo_uid;
  v_ma2_uid := v_dispo_uid;

  v_pfad_eigen := v_ma_uid::text || '/2099/testdata-012-eigen.pdf';
  v_pfad_fremd := v_ma2_uid::text || '/2099/testdata-012-fremd.pdf';

  ---------------------------------------------------------------------------
  -- A) Bucket-Einstellungen
  ---------------------------------------------------------------------------
  select * into v_bucket from storage.buckets where id = 'employee-documents';

  insert into _tg_doc values (1, 'Bucket existiert',
    coalesce(v_bucket.id, '<fehlt>'),
    case when v_bucket.id is not null then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  insert into _tg_doc values (2, 'Bucket ist privat',
    case when v_bucket.public then 'OEFFENTLICH' else 'privat' end,
    case when v_bucket.public is false then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  insert into _tg_doc values (3, 'Groessenlimit 10 MB',
    coalesce(v_bucket.file_size_limit::text, '<null>'),
    case when v_bucket.file_size_limit = 10485760 then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  insert into _tg_doc values (4, 'Nur PDF, JPEG und PNG erlaubt',
    coalesce(array_to_string(v_bucket.allowed_mime_types, ', '), '<null>'),
    case when v_bucket.allowed_mime_types @> array['application/pdf','image/jpeg','image/png']
          and array_length(v_bucket.allowed_mime_types, 1) = 3
         then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  ---------------------------------------------------------------------------
  -- B) Dokumenttypen
  ---------------------------------------------------------------------------
  select count(*) into v_rows from public.document_types
   where key in ('fuehrerschein','personenbefoerderungsschein','krankenschein_au','sonstiges');
  insert into _tg_doc values (5, 'Vier Dokumenttypen vorhanden',
    v_rows::text, case when v_rows = 4 then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  select count(*) into v_rows from (
    select key from public.document_types group by key having count(*) > 1
  ) as d;
  insert into _tg_doc values (6, 'Keine doppelten Dokumenttypen',
    v_rows::text || ' Duplikat(e)',
    case when v_rows = 0 then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  ---------------------------------------------------------------------------
  -- C) Upload in den EIGENEN Ordner
  ---------------------------------------------------------------------------
  begin
    perform set_config('role', 'authenticated', false);
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_ma_uid, 'role', 'authenticated')::text, false);
    insert into storage.objects (bucket_id, name) values ('employee-documents', v_pfad_eigen);
    v_sqlstate := null;
  exception when others then v_sqlstate := sqlstate; v_message := sqlerrm; end;
  execute 'reset role'; perform set_config('request.jwt.claims', '', false);

  insert into _tg_doc values (7, 'Upload in den eigenen Ordner erlaubt',
    coalesce(v_sqlstate || ' ' || v_message, 'ohne Fehler'),
    case when v_sqlstate is null then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  ---------------------------------------------------------------------------
  -- D) Upload in einen FREMDEN Ordner
  ---------------------------------------------------------------------------
  begin
    perform set_config('role', 'authenticated', false);
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_ma_uid, 'role', 'authenticated')::text, false);
    insert into storage.objects (bucket_id, name) values ('employee-documents', v_pfad_fremd);
    v_sqlstate := null;
  exception when others then v_sqlstate := sqlstate; v_message := sqlerrm; end;
  execute 'reset role'; perform set_config('request.jwt.claims', '', false);

  insert into _tg_doc values (8, 'Upload in fremden Ordner abgelehnt',
    coalesce(v_sqlstate || ' ' || v_message, 'DURCHGELAUFEN'),
    case when v_sqlstate = '42501' then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  ---------------------------------------------------------------------------
  -- E) Sichtbarkeit der hochgeladenen Datei
  ---------------------------------------------------------------------------
  begin
    perform set_config('role', 'authenticated', false);
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_ma_uid, 'role', 'authenticated')::text, false);
    select count(*) into v_rows from storage.objects where name = v_pfad_eigen;
    v_sqlstate := null;
  exception when others then v_sqlstate := sqlstate; v_rows := -1; end;
  execute 'reset role'; perform set_config('request.jwt.claims', '', false);
  insert into _tg_doc values (9, 'Eigene Datei ist fuer den Besitzer sichtbar',
    v_rows::text || ' Zeile(n)', case when v_rows = 1 then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  begin
    perform set_config('role', 'authenticated', false);
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_ma2_uid, 'role', 'authenticated')::text, false);
    select count(*) into v_rows from storage.objects where name = v_pfad_eigen;
    v_sqlstate := null;
  exception when others then v_sqlstate := sqlstate; v_rows := -1; end;
  execute 'reset role'; perform set_config('request.jwt.claims', '', false);
  insert into _tg_doc values (10, 'Anderer Mitarbeiter sieht die Datei NICHT',
    v_rows::text || ' Zeile(n)', case when v_rows = 0 then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  begin
    perform set_config('role', 'authenticated', false);
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_kunde_uid, 'role', 'authenticated')::text, false);
    select count(*) into v_rows from storage.objects where name = v_pfad_eigen;
    v_sqlstate := null;
  exception when others then v_sqlstate := sqlstate; v_rows := -1; end;
  execute 'reset role'; perform set_config('request.jwt.claims', '', false);
  insert into _tg_doc values (11, 'Kunde sieht die Datei NICHT',
    v_rows::text || ' Zeile(n)', case when v_rows = 0 then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  begin
    perform set_config('role', 'anon', false);
    perform set_config('request.jwt.claims', '', false);
    select count(*) into v_rows from storage.objects where name = v_pfad_eigen;
    v_sqlstate := null;
  exception when others then v_sqlstate := sqlstate; v_message := sqlerrm; v_rows := -1; end;
  execute 'reset role'; perform set_config('request.jwt.claims', '', false);
  insert into _tg_doc values (12, 'Anonym wird abgewiesen',
    coalesce(v_sqlstate || ' ' || v_message, v_rows::text || ' Zeile(n)'),
    case when v_sqlstate = '42501' or v_rows = 0 then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  begin
    perform set_config('role', 'authenticated', false);
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_admin_uid, 'role', 'authenticated')::text, false);
    select count(*) into v_rows from storage.objects where name = v_pfad_eigen;
    v_sqlstate := null;
  exception when others then v_sqlstate := sqlstate; v_rows := -1; end;
  execute 'reset role'; perform set_config('request.jwt.claims', '', false);
  insert into _tg_doc values (13, 'Aktiver Admin sieht die Datei',
    v_rows::text || ' Zeile(n)', case when v_rows = 1 then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  -- Inaktives Admin-Profil darf NICHT
  begin
    perform set_config('role', 'authenticated', false);
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_inaktiv_uid, 'role', 'authenticated')::text, false);
    select count(*) into v_rows from storage.objects where name = v_pfad_eigen;
    v_sqlstate := null;
  exception when others then v_sqlstate := sqlstate; v_rows := -1; end;
  execute 'reset role'; perform set_config('request.jwt.claims', '', false);
  insert into _tg_doc values (14, 'Inaktives Admin-Profil sieht die Datei NICHT',
    v_rows::text || ' Zeile(n)', case when v_rows = 0 then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  ---------------------------------------------------------------------------
  -- F) Kein Ueberschreiben, begrenztes Loeschen
  ---------------------------------------------------------------------------
  begin
    perform set_config('role', 'authenticated', false);
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_ma_uid, 'role', 'authenticated')::text, false);
    update storage.objects set name = name || '-neu' where name = v_pfad_eigen;
    get diagnostics v_rows = row_count;
    v_sqlstate := null;
  exception when others then v_sqlstate := sqlstate; v_message := sqlerrm; v_rows := -1; end;
  execute 'reset role'; perform set_config('request.jwt.claims', '', false);
  insert into _tg_doc values (15, 'Ueberschreiben ist nicht moeglich',
    case when v_sqlstate is not null then v_sqlstate || ' ' || v_message
         else v_rows::text || ' Zeile(n) geaendert' end,
    case when v_sqlstate = '42501' or v_rows = 0 then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  ---------------------------------------------------------------------------
  -- G) document_submissions: Pfadbindung
  ---------------------------------------------------------------------------
  begin
    perform set_config('role', 'authenticated', false);
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_ma_uid, 'role', 'authenticated')::text, false);
    insert into public.document_submissions
      (employee_id, document_type_id, file_path, file_name, mime_type, status, note)
    values
      (v_ma_emp,
       (select id from public.document_types where key = 'krankenschein_au'),
       v_pfad_eigen, 'testdata-012-eigen.pdf', 'application/pdf', 'submitted', 'TESTDATA-012')
    returning id into v_sub_id;
    v_sqlstate := null;
  exception when others then v_sqlstate := sqlstate; v_message := sqlerrm; end;
  execute 'reset role'; perform set_config('request.jwt.claims', '', false);
  insert into _tg_doc values (16, 'Einreichung mit eigenem Pfad erlaubt, ID zurueck',
    coalesce(v_sub_id::text, coalesce(v_sqlstate || ' ' || v_message, '<null>')),
    case when v_sub_id is not null then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  begin
    perform set_config('role', 'authenticated', false);
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_ma_uid, 'role', 'authenticated')::text, false);
    insert into public.document_submissions (employee_id, file_path, status, note)
    values (v_ma_emp, v_pfad_fremd, 'submitted', 'TESTDATA-012 fremdpfad');
    v_sqlstate := null;
  exception when others then v_sqlstate := sqlstate; v_message := sqlerrm; end;
  execute 'reset role'; perform set_config('request.jwt.claims', '', false);
  insert into _tg_doc values (17, 'Fremder Dateipfad im eigenen Datensatz abgelehnt',
    coalesce(v_sqlstate || ' ' || v_message, 'DURCHGELAUFEN'),
    case when v_sqlstate = '42501' then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  ---------------------------------------------------------------------------
  -- H) Krankmeldung mit eigenem Anhang
  ---------------------------------------------------------------------------
  begin
    perform set_config('role', 'authenticated', false);
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_ma_uid, 'role', 'authenticated')::text, false);
    insert into public.sickness_reports
      (employee_id, start_date, expected_end_date, note, submission_source, document_submission_id, status)
    values (v_ma_emp, date '2099-06-20', date '2099-06-25', 'TESTDATA-012',
            'Mitarbeiterportal', v_sub_id, 'submitted');
    v_sqlstate := null;
  exception when others then v_sqlstate := sqlstate; v_message := sqlerrm; end;
  execute 'reset role'; perform set_config('request.jwt.claims', '', false);
  insert into _tg_doc values (18, 'Krankmeldung mit eigenem Anhang erlaubt',
    coalesce(v_sqlstate || ' ' || v_message, 'ohne Fehler'),
    case when v_sqlstate is null then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  ---------------------------------------------------------------------------
  -- I) Krankmeldung mit FREMDEM Anhang
  ---------------------------------------------------------------------------
  -- Fremde Einreichung als Eigentuemerrolle anlegen.
  insert into public.document_submissions (employee_id, file_path, status, note)
  values (v_ma2_emp, v_pfad_fremd, 'submitted', 'TESTDATA-012 fremde einreichung')
  returning id into v_sub_fremd;

  begin
    perform set_config('role', 'authenticated', false);
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_ma_uid, 'role', 'authenticated')::text, false);
    insert into public.sickness_reports
      (employee_id, start_date, note, submission_source, document_submission_id, status)
    values (v_ma_emp, date '2099-06-26', 'TESTDATA-012 fremdanhang',
            'Mitarbeiterportal', v_sub_fremd, 'submitted');
    v_sqlstate := null;
  exception when others then v_sqlstate := sqlstate; v_message := sqlerrm; end;
  execute 'reset role'; perform set_config('request.jwt.claims', '', false);
  insert into _tg_doc values (19, 'Krankmeldung mit fremdem Anhang abgelehnt',
    coalesce(v_sqlstate || ' ' || v_message, 'DURCHGELAUFEN'),
    case when v_sqlstate = '42501' then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  ---------------------------------------------------------------------------
  -- J) Verknuepfung stimmt
  ---------------------------------------------------------------------------
  select count(*) into v_rows
  from public.sickness_reports as s
  join public.document_submissions as d on d.id = s.document_submission_id
  where s.note = 'TESTDATA-012' and d.employee_id = s.employee_id;
  insert into _tg_doc values (20, 'Anhang und Krankmeldung gehoeren demselben Mitarbeiter',
    v_rows::text || ' Zeile(n)', case when v_rows = 1 then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  ---------------------------------------------------------------------------
  -- K) Bereinigung eines verwaisten Uploads
  ---------------------------------------------------------------------------
  begin
    perform set_config('role', 'authenticated', false);
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_ma2_uid, 'role', 'authenticated')::text, false);
    delete from storage.objects where name = v_pfad_eigen;
    get diagnostics v_rows = row_count;
    v_sqlstate := null;
  exception when others then v_sqlstate := sqlstate; v_rows := -1; end;
  execute 'reset role'; perform set_config('request.jwt.claims', '', false);
  insert into _tg_doc values (21, 'Fremde Datei kann nicht geloescht werden',
    v_rows::text || ' Zeile(n) geloescht',
    case when v_rows = 0 then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  begin
    perform set_config('role', 'authenticated', false);
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_ma_uid, 'role', 'authenticated')::text, false);
    delete from storage.objects where name = v_pfad_eigen;
    get diagnostics v_rows = row_count;
    v_sqlstate := null;
  exception when others then v_sqlstate := sqlstate; v_rows := -1; end;
  execute 'reset role'; perform set_config('request.jwt.claims', '', false);
  insert into _tg_doc values (22, 'Eigene verwaiste Datei kann bereinigt werden',
    v_rows::text || ' Zeile(n) geloescht',
    case when v_rows = 1 then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  ---------------------------------------------------------------------------
  -- L) Dokumenteingang im Adminbereich
  ---------------------------------------------------------------------------
  begin
    perform set_config('role', 'authenticated', false);
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_admin_uid, 'role', 'authenticated')::text, false);
    select count(*) into v_rows
    from public.document_submissions as d
    join public.employees as e on e.id = d.employee_id
    where d.note like 'TESTDATA-012%';
    v_sqlstate := null;
  exception when others then v_sqlstate := sqlstate; v_rows := -1; end;
  execute 'reset role'; perform set_config('request.jwt.claims', '', false);
  insert into _tg_doc values (23, 'Admin sieht den Dokumenteingang inkl. Namen',
    v_rows::text || ' Zeile(n)', case when v_rows = 2 then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  begin
    perform set_config('role', 'authenticated', false);
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_kunde_uid, 'role', 'authenticated')::text, false);
    select count(*) into v_rows from public.document_submissions where note like 'TESTDATA-012%';
    v_sqlstate := null;
  exception when others then v_sqlstate := sqlstate; v_rows := -1; end;
  execute 'reset role'; perform set_config('request.jwt.claims', '', false);
  insert into _tg_doc values (24, 'Kunde sieht keine Einreichungen',
    v_rows::text || ' Zeile(n)', case when v_rows = 0 then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  ---------------------------------------------------------------------------
  -- Aufraeumen
  ---------------------------------------------------------------------------
  delete from public.sickness_reports      where note like 'TESTDATA-012%';
  delete from public.document_submissions  where note like 'TESTDATA-012%';
  delete from storage.objects              where name like '%testdata-012%';
  update public.profiles set employee_id = null where auth_user_id = v_dispo_uid;
  delete from public.employees where id = 'e0000000-0000-4000-8000-0000000000e3';
end
$$;

select nr, pruefung, ergebnis, status from _tg_doc order by nr;

select count(*) filter (where status = 'BESTANDEN')  as bestanden,
       count(*) filter (where status <> 'BESTANDEN') as fehlgeschlagen,
       case when count(*) filter (where status <> 'BESTANDEN') = 0
            then 'ALLE TESTS BESTANDEN' else 'ACHTUNG: Fehlschlaege' end as gesamt
from _tg_doc;
