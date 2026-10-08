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

  v_inaktiv_ma_uid constant uuid := '77777777-7777-4777-8777-777777777777';
  v_inaktiv_emp    constant uuid := 'e0000000-0000-4000-8000-0000000000e4';

  v_pfad_eigen   text;
  v_pfad_eigen2  text;
  v_pfad_fremd   text;
  v_pfad_fremd2  text;
  v_pfad_inaktiv text;
  v_pfad_frei    text;
  v_pfad_bestand text;
  v_bool         boolean;
  v_vorgang_a    constant uuid := 'aaaa1111-2222-4333-8444-555566667777';
  v_vorgang_b    constant uuid := 'bbbb1111-2222-4333-8444-555566667777';
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

  v_pfad_eigen  := v_ma_uid::text  || '/2099/testdata-012-eigen.pdf';
  v_pfad_fremd  := v_ma2_uid::text || '/2099/testdata-012-fremd.pdf';
  v_pfad_fremd2 := v_ma2_uid::text || '/2099/testdata-012-fremd-vorhanden.pdf';

  /* Eine EXISTIERENDE fremde Datei, damit Test 17 wirklich die Pfadbindung
     der Policy prueft und nicht schon am Trigger scheitert. */
  insert into storage.objects (bucket_id, name) values ('employee-documents', v_pfad_fremd2)
  on conflict do nothing;

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
    values (v_ma_emp, v_pfad_fremd2, 'submitted', 'TESTDATA-012 fremdpfad');
    v_sqlstate := null;
  exception when others then v_sqlstate := sqlstate; v_message := sqlerrm; end;
  execute 'reset role'; perform set_config('request.jwt.claims', '', false);
  insert into _tg_doc values (17, 'Fremder (existierender) Dateipfad im eigenen Datensatz abgelehnt',
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
      (employee_id, start_date, expected_end_date, note, submission_source, document_submission_id, status, client_request_id)
    values (v_ma_emp, date '2099-06-20', date '2099-06-25', 'TESTDATA-012',
            'Mitarbeiterportal', v_sub_id, 'submitted', gen_random_uuid());
    v_sqlstate := null;
  exception when others then v_sqlstate := sqlstate; v_message := sqlerrm; end;
  execute 'reset role'; perform set_config('request.jwt.claims', '', false);
  insert into _tg_doc values (18, 'Krankmeldung mit eigenem Anhang erlaubt',
    coalesce(v_sqlstate || ' ' || v_message, 'ohne Fehler'),
    case when v_sqlstate is null then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  ---------------------------------------------------------------------------
  -- I) Krankmeldung mit FREMDEM Anhang
  ---------------------------------------------------------------------------
  -- Fremde Einreichung als Eigentuemerrolle anlegen. Die zugehoerige Datei
  -- muss dafuer existieren - der Trigger aus 011 verlangt das.
  insert into storage.objects (bucket_id, name) values ('employee-documents', v_pfad_fremd)
  on conflict do nothing;

  insert into public.document_submissions (employee_id, file_path, status, note)
  values (v_ma2_emp, v_pfad_fremd, 'submitted', 'TESTDATA-012 fremde einreichung')
  returning id into v_sub_fremd;

  begin
    perform set_config('role', 'authenticated', false);
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_ma_uid, 'role', 'authenticated')::text, false);
    insert into public.sickness_reports
      (employee_id, start_date, note, submission_source, document_submission_id, status, client_request_id)
    values (v_ma_emp, date '2099-06-26', 'TESTDATA-012 fremdanhang',
            'Mitarbeiterportal', v_sub_fremd, 'submitted', gen_random_uuid());
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
  insert into _tg_doc values (21, 'Fremde Datei wird von der Loesch-Policy gefiltert',
    coalesce(v_sqlstate || ' ' || v_message, v_rows::text || ' Zeile(n) geloescht'),
    case when v_sqlstate is null and v_rows = 0 then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  begin
    perform set_config('role', 'authenticated', false);
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_ma_uid, 'role', 'authenticated')::text, false);
    delete from storage.objects where name = v_pfad_eigen;
    get diagnostics v_rows = row_count;
    v_sqlstate := null;
  exception when others then v_sqlstate := sqlstate; v_rows := -1; end;
  execute 'reset role'; perform set_config('request.jwt.claims', '', false);
  /* Auch die EIGENE Datei ist per direktem DELETE nicht mehr entfernbar -
     Bereinigung laeuft ausschliesslich ueber die Storage-API (remove),
     (Tests 31 bis 35). */
  insert into _tg_doc values (22, 'Eigene VERKNUEPFTE Datei wird ebenfalls gefiltert',
    coalesce(v_sqlstate || ' ' || v_message, v_rows::text || ' Zeile(n) geloescht'),
    case when v_sqlstate is null and v_rows = 0 then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

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
  -- M) Nur AKTIVE MITARBEITER duerfen den eigenen Ordner nutzen
  ---------------------------------------------------------------------------
  begin
    perform set_config('role', 'authenticated', false);
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_kunde_uid, 'role', 'authenticated')::text, false);
    insert into storage.objects (bucket_id, name)
    values ('employee-documents', v_kunde_uid::text || '/2099/testdata-012-kunde.pdf');
    v_sqlstate := null;
  exception when others then v_sqlstate := sqlstate; v_message := sqlerrm; end;
  execute 'reset role'; perform set_config('request.jwt.claims', '', false);
  insert into _tg_doc values (25, 'Kunde laedt in den EIGENEN Ordner: verweigert',
    coalesce(v_sqlstate || ' ' || v_message, 'DURCHGELAUFEN'),
    case when v_sqlstate = '42501' then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  update public.profiles set employee_id = null where auth_user_id = v_dispo_uid;
  begin
    perform set_config('role', 'authenticated', false);
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_dispo_uid, 'role', 'authenticated')::text, false);
    insert into storage.objects (bucket_id, name)
    values ('employee-documents', v_dispo_uid::text || '/2099/testdata-012-dispo.pdf');
    v_sqlstate := null;
  exception when others then v_sqlstate := sqlstate; v_message := sqlerrm; end;
  execute 'reset role'; perform set_config('request.jwt.claims', '', false);
  insert into _tg_doc values (26, 'Disponent ohne Mitarbeiterberechtigung: verweigert',
    coalesce(v_sqlstate || ' ' || v_message, 'DURCHGELAUFEN'),
    case when v_sqlstate = '42501' then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);
  update public.profiles set employee_id = v_ma2_emp where auth_user_id = v_dispo_uid;

  ---------------------------------------------------------------------------
  -- N) Inaktiver Mitarbeiter: hochladen, lesen, bereinigen
  ---------------------------------------------------------------------------
  insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', v_inaktiv_ma_uid, 'authenticated',
          'authenticated', 'tg-test-012-inaktiv-ma@test.invalid', now(),
          '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now())
  on conflict (id) do nothing;

  insert into public.employees (id, first_name, last_name, employment_type, status, active, portal_active)
  values (v_inaktiv_emp, 'TESTDATA-012', 'Inaktiv', 'teilzeit', 'inactive', false, false)
  on conflict (id) do update set active = false, portal_active = false;

  insert into public.profiles (id, auth_user_id, employee_id, display_name, role, active)
  values ('c0000000-0000-4000-8000-0000000000d1', v_inaktiv_ma_uid, v_inaktiv_emp,
          'TESTDATA-012 Inaktiver Mitarbeiter', 'employee', true)
  on conflict (id) do update set auth_user_id = excluded.auth_user_id,
                                 employee_id  = excluded.employee_id, active = true;

  v_pfad_inaktiv := v_inaktiv_ma_uid::text || '/2099/testdata-012-inaktiv.pdf';

  begin
    perform set_config('role', 'authenticated', false);
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_inaktiv_ma_uid, 'role', 'authenticated')::text, false);
    insert into storage.objects (bucket_id, name) values ('employee-documents', v_pfad_inaktiv);
    v_sqlstate := null;
  exception when others then v_sqlstate := sqlstate; v_message := sqlerrm; end;
  execute 'reset role'; perform set_config('request.jwt.claims', '', false);
  insert into _tg_doc values (27, 'Inaktiver Mitarbeiter laedt hoch: verweigert',
    coalesce(v_sqlstate || ' ' || v_message, 'DURCHGELAUFEN'),
    case when v_sqlstate = '42501' then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  insert into storage.objects (bucket_id, name) values ('employee-documents', v_pfad_inaktiv)
  on conflict do nothing;

  begin
    perform set_config('role', 'authenticated', false);
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_inaktiv_ma_uid, 'role', 'authenticated')::text, false);
    select count(*) into v_rows from storage.objects where name = v_pfad_inaktiv;
    v_sqlstate := null;
  exception when others then v_sqlstate := sqlstate; v_rows := -1; end;
  execute 'reset role'; perform set_config('request.jwt.claims', '', false);
  insert into _tg_doc values (28, 'Inaktiver Mitarbeiter liest eigene Datei: verweigert',
    v_rows::text || ' Zeile(n)', case when v_rows = 0 then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  begin
    perform set_config('role', 'authenticated', false);
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_inaktiv_ma_uid, 'role', 'authenticated')::text, false);
    delete from storage.objects where bucket_id = 'employee-documents' and name = v_pfad_inaktiv;
    get diagnostics v_rows = row_count;
    v_sqlstate := null;
  exception when others then v_sqlstate := sqlstate; v_message := sqlerrm; end;
  execute 'reset role'; perform set_config('request.jwt.claims', '', false);
  insert into _tg_doc values (29, 'Inaktiver Mitarbeiter bereinigt: verweigert',
    coalesce(v_sqlstate || ' ' || v_message, v_rows::text || ' Zeile(n) geloescht'),
    case when v_sqlstate is null and v_rows = 0 then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  ---------------------------------------------------------------------------
  -- O) Kein direktes DELETE mehr fuer Mitarbeiter
  ---------------------------------------------------------------------------
  begin
    perform set_config('role', 'authenticated', false);
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_ma_uid, 'role', 'authenticated')::text, false);
    delete from storage.objects where name = v_pfad_inaktiv;
    get diagnostics v_rows = row_count;
    v_sqlstate := null;
  exception when others then v_sqlstate := sqlstate; v_message := sqlerrm; v_rows := -1; end;
  execute 'reset role'; perform set_config('request.jwt.claims', '', false);
  insert into _tg_doc values (30, 'Loeschen fremder Datei bewirkt nichts',
    coalesce(v_sqlstate || ' ' || v_message, v_rows::text || ' Zeile(n)'),
    case when v_sqlstate is null and v_rows = 0 then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  ---------------------------------------------------------------------------
  -- P) Bereinigung nur fuer unverknuepfte Dateien
  ---------------------------------------------------------------------------
  v_pfad_frei := v_ma_uid::text || '/2099/testdata-012-frei.pdf';
  begin
    perform set_config('role', 'authenticated', false);
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_ma_uid, 'role', 'authenticated')::text, false);
    insert into storage.objects (bucket_id, name) values ('employee-documents', v_pfad_frei);
    delete from storage.objects where bucket_id = 'employee-documents' and name = v_pfad_frei;
    get diagnostics v_rows = row_count;
    v_bool := v_rows = 1;
    v_sqlstate := null;
  exception when others then v_sqlstate := sqlstate; v_message := sqlerrm; v_bool := null; end;
  execute 'reset role'; perform set_config('request.jwt.claims', '', false);
  insert into _tg_doc values (31, 'Eigener UNVERKNUEPFTER Upload wird bereinigt',
    coalesce(v_bool::text, v_sqlstate || ' ' || v_message),
    case when v_bool is true then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  select count(*) into v_rows from storage.objects where name = v_pfad_frei;
  insert into _tg_doc values (32, 'Datei ist danach wirklich entfernt',
    v_rows::text || ' Zeile(n)', case when v_rows = 0 then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  v_pfad_eigen2 := v_ma_uid::text || '/2099/testdata-012-verknuepft.pdf';
  begin
    perform set_config('role', 'authenticated', false);
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_ma_uid, 'role', 'authenticated')::text, false);
    insert into storage.objects (bucket_id, name) values ('employee-documents', v_pfad_eigen2);
    insert into public.document_submissions (employee_id, file_path, file_name, mime_type, status, note)
    values (v_ma_emp, v_pfad_eigen2, 'verknuepft.pdf', 'application/pdf', 'submitted', 'TESTDATA-012 verknuepft');
    v_sqlstate := null;
  exception when others then v_sqlstate := sqlstate; v_message := sqlerrm; end;
  execute 'reset role'; perform set_config('request.jwt.claims', '', false);
  insert into _tg_doc values (33, 'Einreichung mit vorhandener Datei erlaubt',
    coalesce(v_sqlstate || ' ' || v_message, 'ohne Fehler'),
    case when v_sqlstate is null then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  begin
    perform set_config('role', 'authenticated', false);
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_ma_uid, 'role', 'authenticated')::text, false);
    delete from storage.objects where bucket_id = 'employee-documents' and name = v_pfad_eigen2;
    get diagnostics v_rows = row_count;
    v_sqlstate := null;
  exception when others then v_sqlstate := sqlstate; v_message := sqlerrm; end;
  execute 'reset role'; perform set_config('request.jwt.claims', '', false);
  insert into _tg_doc values (34, 'Bereits EINGEREICHTE Datei bleibt erhalten',
    coalesce(v_sqlstate || ' ' || v_message, v_rows::text || ' Zeile(n) geloescht'),
    case when v_sqlstate is null and v_rows = 0
          and exists (select 1 from storage.objects where name = v_pfad_eigen2)
         then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  v_pfad_bestand := v_ma_uid::text || '/2099/testdata-012-bestand.pdf';
  insert into storage.objects (bucket_id, name) values ('employee-documents', v_pfad_bestand);
  insert into public.employee_documents (employee_id, file_path, status, note)
  values (v_ma_emp, v_pfad_bestand, 'accepted', 'TESTDATA-012 bestand');

  begin
    perform set_config('role', 'authenticated', false);
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_ma_uid, 'role', 'authenticated')::text, false);
    delete from storage.objects where bucket_id = 'employee-documents' and name = v_pfad_bestand;
    get diagnostics v_rows = row_count;
    v_sqlstate := null;
  exception when others then v_sqlstate := sqlstate; v_message := sqlerrm; end;
  execute 'reset role'; perform set_config('request.jwt.claims', '', false);
  insert into _tg_doc values (35, 'Im geprueften Bestand referenzierte Datei bleibt erhalten',
    coalesce(v_sqlstate || ' ' || v_message, v_rows::text || ' Zeile(n) geloescht'),
    case when v_sqlstate is null and v_rows = 0
          and exists (select 1 from storage.objects where name = v_pfad_bestand)
         then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  begin
    perform set_config('role', 'authenticated', false);
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_ma2_uid, 'role', 'authenticated')::text, false);
    delete from storage.objects where bucket_id = 'employee-documents' and name = v_pfad_eigen2;
    get diagnostics v_rows = row_count;
    v_sqlstate := null;
  exception when others then v_sqlstate := sqlstate; v_message := sqlerrm; end;
  execute 'reset role'; perform set_config('request.jwt.claims', '', false);
  insert into _tg_doc values (36, 'Fremder Mitarbeiter kann die Datei nicht loeschen',
    coalesce(v_sqlstate || ' ' || v_message, v_rows::text || ' Zeile(n) geloescht'),
    case when v_sqlstate is null and v_rows = 0 then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  ---------------------------------------------------------------------------
  -- Q) Verknuepfen auf eine nicht vorhandene Datei
  ---------------------------------------------------------------------------
  begin
    perform set_config('role', 'authenticated', false);
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_ma_uid, 'role', 'authenticated')::text, false);
    insert into public.document_submissions (employee_id, file_path, status, note)
    values (v_ma_emp, v_ma_uid::text || '/2099/gibt-es-nicht.pdf', 'submitted', 'TESTDATA-012 fehlt');
    v_sqlstate := null;
  exception when others then v_sqlstate := sqlstate; v_message := sqlerrm; end;
  execute 'reset role'; perform set_config('request.jwt.claims', '', false);
  insert into _tg_doc values (37, 'Einreichung ohne vorhandene Datei abgelehnt',
    coalesce(v_sqlstate || ' ' || v_message, 'DURCHGELAUFEN'),
    case when coalesce(v_message, '') like '%DOCUMENT_FILE_NOT_FOUND%'
         then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  ---------------------------------------------------------------------------
  -- R) Keine zweite Krankmeldung bei verlorener Antwort
  ---------------------------------------------------------------------------
  begin
    perform set_config('role', 'authenticated', false);
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_ma_uid, 'role', 'authenticated')::text, false);
    insert into public.sickness_reports
      (employee_id, start_date, expected_end_date, note, submission_source, status, client_request_id)
    values (v_ma_emp, date '2099-07-07', date '2099-07-09', 'TESTDATA-012 wiederholung',
            'Mitarbeiterportal', 'submitted', v_vorgang_a);
    v_sqlstate := null;
  exception when others then v_sqlstate := sqlstate; v_message := sqlerrm; end;
  execute 'reset role'; perform set_config('request.jwt.claims', '', false);
  insert into _tg_doc values (38, 'Erste Krankmeldung mit Vorgangsschluessel gespeichert',
    coalesce(v_sqlstate || ' ' || v_message, 'ohne Fehler'),
    case when v_sqlstate is null then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  -- Antwort ging verloren: identische Wiederholung mit DEMSELBEN Schluessel.
  begin
    perform set_config('role', 'authenticated', false);
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_ma_uid, 'role', 'authenticated')::text, false);
    insert into public.sickness_reports
      (employee_id, start_date, expected_end_date, note, submission_source, status, client_request_id)
    values (v_ma_emp, date '2099-07-07', date '2099-07-09', 'TESTDATA-012 wiederholung',
            'Mitarbeiterportal', 'submitted', v_vorgang_a);
    v_sqlstate := null;
  exception when others then v_sqlstate := sqlstate; v_message := sqlerrm; end;
  execute 'reset role'; perform set_config('request.jwt.claims', '', false);
  insert into _tg_doc values (39, 'Wiederholung desselben Vorgangs abgewiesen (23505)',
    coalesce(v_sqlstate || ' ' || v_message, 'DURCHGELAUFEN'),
    case when v_sqlstate = '23505'
          and v_message like '%uq_sickness_reports_client_request%'
         then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  select count(*) into v_rows from public.sickness_reports
   where employee_id = v_ma_emp and client_request_id = v_vorgang_a;
  insert into _tg_doc values (40, 'Genau EINE Krankmeldung fuer diesen Vorgang',
    v_rows::text || ' Zeile(n)', case when v_rows = 1 then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  -- Gleicher Schluessel, VERAENDERTER Inhalt: darf nicht still durchgehen.
  begin
    perform set_config('role', 'authenticated', false);
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_ma_uid, 'role', 'authenticated')::text, false);
    insert into public.sickness_reports
      (employee_id, start_date, expected_end_date, note, submission_source, status, client_request_id)
    values (v_ma_emp, date '2099-07-20', date '2099-07-25', 'TESTDATA-012 anderer inhalt',
            'Mitarbeiterportal', 'submitted', v_vorgang_a);
    v_sqlstate := null;
  exception when others then v_sqlstate := sqlstate; v_message := sqlerrm; end;
  execute 'reset role'; perform set_config('request.jwt.claims', '', false);
  insert into _tg_doc values (41, 'Gleicher Schluessel mit anderem Inhalt abgewiesen',
    coalesce(v_sqlstate || ' ' || v_message, 'DURCHGELAUFEN'),
    case when v_sqlstate = '23505' then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  select count(*) into v_rows from public.sickness_reports
   where employee_id = v_ma_emp and client_request_id = v_vorgang_a
     and start_date = date '2099-07-07';
  insert into _tg_doc values (42, 'Der bestehende Inhalt wurde nicht veraendert',
    v_rows::text || ' Zeile(n) mit dem urspruenglichen Beginndatum',
    case when v_rows = 1 then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  -- ZWEI verschiedene Vorgaenge mit demselben Beginndatum: beide gueltig.
  begin
    perform set_config('role', 'authenticated', false);
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_ma_uid, 'role', 'authenticated')::text, false);
    insert into public.sickness_reports
      (employee_id, start_date, expected_end_date, note, submission_source, status, client_request_id)
    values (v_ma_emp, date '2099-07-07', date '2099-07-08', 'TESTDATA-012 zweiter vorgang',
            'Mitarbeiterportal', 'submitted', v_vorgang_b);
    v_sqlstate := null;
  exception when others then v_sqlstate := sqlstate; v_message := sqlerrm; end;
  execute 'reset role'; perform set_config('request.jwt.claims', '', false);
  insert into _tg_doc values (43, 'Zweiter Vorgang mit gleichem Beginndatum erlaubt',
    coalesce(v_sqlstate || ' ' || v_message, 'ohne Fehler'),
    case when v_sqlstate is null then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  select count(*) into v_rows from public.sickness_reports
   where employee_id = v_ma_emp and start_date = date '2099-07-07';
  insert into _tg_doc values (44, 'Beide Vorgaenge bleiben unterscheidbar',
    v_rows::text || ' Zeile(n)', case when v_rows = 2 then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  -- Ohne Vorgangsschluessel darf ein Portal-Eintrag gar nicht entstehen.
  begin
    perform set_config('role', 'authenticated', false);
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_ma_uid, 'role', 'authenticated')::text, false);
    insert into public.sickness_reports
      (employee_id, start_date, note, submission_source, status)
    values (v_ma_emp, date '2099-08-01', 'TESTDATA-012 ohne schluessel',
            'Mitarbeiterportal', 'submitted');
    v_sqlstate := null;
  exception when others then v_sqlstate := sqlstate; v_message := sqlerrm; end;
  execute 'reset role'; perform set_config('request.jwt.claims', '', false);
  insert into _tg_doc values (45, 'Krankmeldung ohne Vorgangsschluessel abgelehnt',
    coalesce(v_sqlstate || ' ' || v_message, 'DURCHGELAUFEN'),
    case when v_sqlstate = '42501' then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  -- Ein fremder Vorgangsschluessel kollidiert nicht (Index ist je Mitarbeiter).
  begin
    perform set_config('role', 'authenticated', false);
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_ma2_uid, 'role', 'authenticated')::text, false);
    insert into public.sickness_reports
      (employee_id, start_date, note, submission_source, status, client_request_id)
    values (v_ma2_emp, date '2099-07-07', 'TESTDATA-012 anderer mitarbeiter',
            'Mitarbeiterportal', 'submitted', v_vorgang_a);
    v_sqlstate := null;
  exception when others then v_sqlstate := sqlstate; v_message := sqlerrm; end;
  execute 'reset role'; perform set_config('request.jwt.claims', '', false);
  insert into _tg_doc values (46, 'Gleicher Schluessel bei anderem Mitarbeiter erlaubt',
    coalesce(v_sqlstate || ' ' || v_message, 'ohne Fehler'),
    case when v_sqlstate is null then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  ---------------------------------------------------------------------------
  -- Aufraeumen
  ---------------------------------------------------------------------------
  delete from public.sickness_reports      where note like 'TESTDATA-012%';
  delete from public.employee_documents    where note like 'TESTDATA-012%';
  delete from public.document_submissions  where note like 'TESTDATA-012%';
  delete from storage.objects              where name like '%testdata-012%';
  update public.profiles set employee_id = null where auth_user_id = v_dispo_uid;
  delete from public.profiles  where id = 'c0000000-0000-4000-8000-0000000000d1';
  delete from public.employees where id in ('e0000000-0000-4000-8000-0000000000e3', v_inaktiv_emp);
  delete from auth.users       where id = v_inaktiv_ma_uid;
end
$$;

select nr, pruefung, ergebnis, status from _tg_doc order by nr;

select count(*) filter (where status = 'BESTANDEN')  as bestanden,
       count(*) filter (where status <> 'BESTANDEN') as fehlgeschlagen,
       case when count(*) filter (where status <> 'BESTANDEN') = 0
            then 'ALLE TESTS BESTANDEN' else 'ACHTUNG: Fehlschlaege' end as gesamt
from _tg_doc;
