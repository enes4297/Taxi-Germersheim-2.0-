-- 11_sickness_reports_test.sql
--
-- Prueft die Uebertragung der Krankmeldung nach public.sickness_reports auf
-- Datenbankebene: Schreibrecht, Rueckgabe der ID, erneutes Laden, Admin-Sicht
-- und der Schutz gegen Zugriffe anderer Mitarbeiter und Kunden.
--
-- NUR LOKALE TESTUMGEBUNG. Voraussetzung: 010_..._seed.sql wurde eingespielt.
-- Alle Testzeilen tragen die Notiz 'TESTDATA-011' und werden am Ende geloescht.

drop table if exists pg_temp._tg_sick;
create temporary table _tg_sick (nr int, pruefung text, ergebnis text, status text);

do $$
declare
  v_ma_uid    uuid;  -- Mitarbeiter (Antragsteller)
  v_ma_emp    uuid;
  v_ma2_uid   uuid;  -- zweiter Mitarbeiter, geliehen vom Disponentenprofil
  v_ma2_emp   uuid;
  v_admin_uid uuid;
  v_dispo_uid uuid;
  v_kunde_uid uuid;

  v_id        uuid;
  v_emp_out   uuid;
  v_status    text;
  v_source    text;
  v_docid     uuid;
  v_rows      integer;
  v_sqlstate  text;
  v_message   text;
begin
  -- Alle Identitaeten VOR dem ersten Rollenwechsel lesen.
  select auth_user_id into strict v_ma_uid    from tg_test.identities where schluessel = 'mitarbeiter';
  select auth_user_id into strict v_admin_uid from tg_test.identities where schluessel = 'admin';
  select auth_user_id into strict v_dispo_uid from tg_test.identities where schluessel = 'disponent';
  select auth_user_id into strict v_kunde_uid from tg_test.identities where schluessel = 'kunde_a';
  select employee_id  into strict v_ma_emp    from public.profiles where auth_user_id = v_ma_uid;

  -- Zweiter Mitarbeiter fuer den Fremdzugriffstest: eigener employees-Satz,
  -- verknuepft mit dem Disponentenkonto.
  insert into public.employees (id, first_name, last_name, employment_type, status, active, portal_active)
  values ('e0000000-0000-4000-8000-0000000000e2', 'TESTDATA-011', 'Kollege', 'teilzeit', 'active', true, true)
  on conflict (id) do nothing;
  v_ma2_emp := 'e0000000-0000-4000-8000-0000000000e2';

  update public.profiles set employee_id = v_ma2_emp where auth_user_id = v_dispo_uid;
  v_ma2_uid := v_dispo_uid;

  ---------------------------------------------------------------------------
  -- 1) Mitarbeiter speichert eine Krankmeldung, RETURNING liefert die ID
  ---------------------------------------------------------------------------
  begin
    perform set_config('role', 'authenticated', false);
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_ma_uid, 'role', 'authenticated')::text, false);

    insert into public.sickness_reports
      (employee_id, start_date, expected_end_date, note, submission_source, document_submission_id, status)
    values
      (v_ma_emp, date '2099-06-01', date '2099-06-04', 'TESTDATA-011', 'Mitarbeiterportal', null, 'submitted')
    returning id, employee_id, status, submission_source, document_submission_id
      into v_id, v_emp_out, v_status, v_source, v_docid;

    v_sqlstate := null;
  exception when others then
    v_sqlstate := sqlstate; v_message := sqlerrm;
  end;
  execute 'reset role'; perform set_config('request.jwt.claims', '', false);

  insert into _tg_sick values (1, 'Mitarbeiter darf speichern',
    coalesce(v_sqlstate || ' ' || v_message, 'ohne Fehler'),
    case when v_sqlstate is null then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  insert into _tg_sick values (2, 'RETURNING liefert id (result.data.id)',
    coalesce(v_id::text, '<null>'),
    case when v_id is not null then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  insert into _tg_sick values (3, 'employee_id stammt vom angemeldeten Nutzer',
    coalesce(v_emp_out::text, '<null>'),
    case when v_emp_out = v_ma_emp then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  insert into _tg_sick values (4, 'status = submitted',
    coalesce(v_status, '<null>'),
    case when v_status = 'submitted' then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  insert into _tg_sick values (5, 'kein Dateianhang verknuepft',
    coalesce(v_docid::text, 'null'),
    case when v_docid is null then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  insert into _tg_sick values (6, 'Quelle = Mitarbeiterportal',
    coalesce(v_source, '<null>'),
    case when v_source = 'Mitarbeiterportal' then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  ---------------------------------------------------------------------------
  -- 2) Fremde employee_id unterschieben wird verhindert
  ---------------------------------------------------------------------------
  begin
    perform set_config('role', 'authenticated', false);
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_ma_uid, 'role', 'authenticated')::text, false);

    insert into public.sickness_reports (employee_id, start_date, note, status)
    values (v_ma2_emp, date '2099-06-10', 'TESTDATA-011 fremd', 'submitted');

    v_sqlstate := null;
  exception when others then
    v_sqlstate := sqlstate; v_message := sqlerrm;
  end;
  execute 'reset role'; perform set_config('request.jwt.claims', '', false);

  insert into _tg_sick values (7, 'Meldung fuer fremden Mitarbeiter abgelehnt',
    coalesce(v_sqlstate || ' ' || v_message, 'DURCHGELAUFEN'),
    case when v_sqlstate = '42501' then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  ---------------------------------------------------------------------------
  -- 3) status manipulieren wird verhindert (Policy verlangt 'submitted')
  ---------------------------------------------------------------------------
  begin
    perform set_config('role', 'authenticated', false);
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_ma_uid, 'role', 'authenticated')::text, false);

    insert into public.sickness_reports (employee_id, start_date, note, status)
    values (v_ma_emp, date '2099-06-11', 'TESTDATA-011 status', 'accepted');

    v_sqlstate := null;
  exception when others then
    v_sqlstate := sqlstate; v_message := sqlerrm;
  end;
  execute 'reset role'; perform set_config('request.jwt.claims', '', false);

  insert into _tg_sick values (8, 'Vorgetaeuschter Status accepted abgelehnt',
    coalesce(v_sqlstate || ' ' || v_message, 'DURCHGELAUFEN'),
    case when v_sqlstate = '42501' then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  ---------------------------------------------------------------------------
  -- 4) Erneutes Laden: Mitarbeiter sieht die eigene Meldung
  ---------------------------------------------------------------------------
  begin
    perform set_config('role', 'authenticated', false);
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_ma_uid, 'role', 'authenticated')::text, false);
    select count(*) into v_rows from public.sickness_reports where note like 'TESTDATA-011%';
    v_sqlstate := null;
  exception when others then
    v_sqlstate := sqlstate; v_message := sqlerrm; v_rows := -1;
  end;
  execute 'reset role'; perform set_config('request.jwt.claims', '', false);

  insert into _tg_sick values (9, 'Mitarbeiter laedt die eigene Meldung erneut',
    v_rows::text || ' Zeile(n)',
    case when v_rows = 1 then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  ---------------------------------------------------------------------------
  -- 5) Anderer Mitarbeiter sieht sie NICHT
  ---------------------------------------------------------------------------
  begin
    perform set_config('role', 'authenticated', false);
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_ma2_uid, 'role', 'authenticated')::text, false);
    select count(*) into v_rows from public.sickness_reports where note like 'TESTDATA-011%';
    v_sqlstate := null;
  exception when others then
    v_sqlstate := sqlstate; v_message := sqlerrm; v_rows := -1;
  end;
  execute 'reset role'; perform set_config('request.jwt.claims', '', false);

  insert into _tg_sick values (10, 'Anderer Mitarbeiter sieht die Meldung nicht',
    v_rows::text || ' Zeile(n)',
    case when v_rows = 0 then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  ---------------------------------------------------------------------------
  -- 6) Kunde sieht sie NICHT
  ---------------------------------------------------------------------------
  begin
    perform set_config('role', 'authenticated', false);
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_kunde_uid, 'role', 'authenticated')::text, false);
    select count(*) into v_rows from public.sickness_reports where note like 'TESTDATA-011%';
    v_sqlstate := null;
  exception when others then
    v_sqlstate := sqlstate; v_message := sqlerrm; v_rows := -1;
  end;
  execute 'reset role'; perform set_config('request.jwt.claims', '', false);

  insert into _tg_sick values (11, 'Kunde sieht die Meldung nicht',
    v_rows::text || ' Zeile(n)',
    case when v_rows = 0 then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  ---------------------------------------------------------------------------
  -- 7) Anonym sieht sie NICHT
  ---------------------------------------------------------------------------
  begin
    perform set_config('role', 'anon', false);
    perform set_config('request.jwt.claims', '', false);
    select count(*) into v_rows from public.sickness_reports where note like 'TESTDATA-011%';
    v_sqlstate := null;
  exception when others then
    v_sqlstate := sqlstate; v_message := sqlerrm; v_rows := -1;
  end;
  execute 'reset role'; perform set_config('request.jwt.claims', '', false);

  insert into _tg_sick values (12, 'Anonym wird abgewiesen',
    coalesce(v_sqlstate || ' ' || v_message, v_rows::text || ' Zeile(n)'),
    case when v_sqlstate = '42501' or v_rows = 0 then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  ---------------------------------------------------------------------------
  -- 8) Admin sieht die eingegangene Meldung (Admin-Bereich)
  ---------------------------------------------------------------------------
  begin
    perform set_config('role', 'authenticated', false);
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_admin_uid, 'role', 'authenticated')::text, false);
    select count(*) into v_rows from public.sickness_reports where note like 'TESTDATA-011%';
    v_sqlstate := null;
  exception when others then
    v_sqlstate := sqlstate; v_message := sqlerrm; v_rows := -1;
  end;
  execute 'reset role'; perform set_config('request.jwt.claims', '', false);

  insert into _tg_sick values (13, 'Admin sieht die eingegangene Meldung',
    v_rows::text || ' Zeile(n)',
    case when v_rows = 1 then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  ---------------------------------------------------------------------------
  -- 9) Admin kann den Namen mitlesen (Join employees), wie in der Admin-Ansicht
  ---------------------------------------------------------------------------
  begin
    perform set_config('role', 'authenticated', false);
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_admin_uid, 'role', 'authenticated')::text, false);
    select count(*) into v_rows
    from public.sickness_reports as s
    join public.employees as e on e.id = s.employee_id
    where s.note like 'TESTDATA-011%';
    v_sqlstate := null;
  exception when others then
    v_sqlstate := sqlstate; v_message := sqlerrm; v_rows := -1;
  end;
  execute 'reset role'; perform set_config('request.jwt.claims', '', false);

  insert into _tg_sick values (14, 'Admin-Ansicht kann den Mitarbeiternamen mitlesen',
    v_rows::text || ' Zeile(n)',
    case when v_rows = 1 then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  ---------------------------------------------------------------------------
  -- 10) Mitarbeiter darf den Status NICHT nachtraeglich aendern
  ---------------------------------------------------------------------------
  begin
    perform set_config('role', 'authenticated', false);
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_ma_uid, 'role', 'authenticated')::text, false);
    update public.sickness_reports set status = 'accepted' where id = v_id;
    get diagnostics v_rows = row_count;
    v_sqlstate := null;
  exception when others then
    v_sqlstate := sqlstate; v_message := sqlerrm; v_rows := -1;
  end;
  execute 'reset role'; perform set_config('request.jwt.claims', '', false);

  insert into _tg_sick values (15, 'Mitarbeiter kann den Status nicht aendern',
    case when v_sqlstate is not null then v_sqlstate || ' ' || v_message
         else v_rows::text || ' Zeile(n) geaendert' end,
    case when v_sqlstate is not null or v_rows = 0 then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  ---------------------------------------------------------------------------
  -- Aufraeumen
  ---------------------------------------------------------------------------
  delete from public.sickness_reports where note like 'TESTDATA-011%';
  update public.profiles set employee_id = null where auth_user_id = v_dispo_uid;
  delete from public.employees where id = 'e0000000-0000-4000-8000-0000000000e2';
end
$$;

select nr, pruefung, ergebnis, status from _tg_sick order by nr;

select count(*) filter (where status = 'BESTANDEN')  as bestanden,
       count(*) filter (where status <> 'BESTANDEN') as fehlgeschlagen,
       case when count(*) filter (where status <> 'BESTANDEN') = 0
            then 'ALLE TESTS BESTANDEN' else 'ACHTUNG: Fehlschlaege' end as gesamt
from _tg_sick;
