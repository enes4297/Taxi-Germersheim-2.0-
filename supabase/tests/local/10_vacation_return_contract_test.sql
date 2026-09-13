-- 10_vacation_return_contract_test.sql
--
-- Prueft den Rueckgabevertrag von EmployeeSupabase.createVacationRequest auf
-- Datenbankebene: Liefert INSERT ... RETURNING unter RLS wirklich eine Zeile
-- mit id zurueck, wenn ein Mitarbeiter einen Urlaubsantrag speichert?
--
-- Hintergrund
--   employee-supabase.js macht:
--     .from("vacation_requests").insert(payload)
--     .select("id, employee_id, start_date, end_date, note, status").single()
--   PostgREST setzt das als INSERT ... RETURNING um. Faellt das RETURNING
--   wegen einer fehlenden SELECT-Policy leer aus, meldet .single() einen
--   Fehler - ein korrekt gespeicherter Antrag wuerde dann faelschlich als
--   Fehlschlag angezeigt. Genau das muss ausgeschlossen sein.
--
-- NUR LOKALE TESTUMGEBUNG. Legt einen Testantrag an und entfernt ihn wieder.

drop table if exists pg_temp._tg_vac_contract;
create temporary table _tg_vac_contract (
  nr int, pruefung text, ergebnis text, status text
);

do $$
declare
  v_mitarbeiter_uid uuid;
  v_kunde_a_uid     uuid;
  v_employee_id     uuid;
  v_id              uuid;
  v_employee_out    uuid;
  v_status_out      text;
  v_rows            integer;
  v_sqlstate        text;
  v_message         text;
begin
  -- Alle Identitaeten VOR dem ersten Rollenwechsel lesen. Die Rolle
  -- authenticated hat auf dem Schema tg_test keine Rechte.
  select auth_user_id into strict v_mitarbeiter_uid
  from tg_test.identities where schluessel = 'mitarbeiter';

  select auth_user_id into strict v_kunde_a_uid
  from tg_test.identities where schluessel = 'kunde_a';

  select employee_id into strict v_employee_id
  from public.profiles where auth_user_id = v_mitarbeiter_uid;

  insert into _tg_vac_contract values
    (0, 'Mitarbeiterprofil hat employee_id',
     coalesce(v_employee_id::text, '<null>'),
     case when v_employee_id is not null then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  ---------------------------------------------------------------------------
  -- Als Mitarbeiter einfuegen und Rueckgabe pruefen
  ---------------------------------------------------------------------------
  begin
    perform set_config('role', 'authenticated', false);
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_mitarbeiter_uid, 'role', 'authenticated')::text, false);

    insert into public.vacation_requests (employee_id, start_date, end_date, note, status)
    values (v_employee_id, date '2099-01-02', date '2099-01-05', 'TESTDATA-010 Vertragspruefung', 'requested')
    returning id, employee_id, status into v_id, v_employee_out, v_status_out;

    v_sqlstate := null;
  exception when others then
    v_sqlstate := sqlstate;
    v_message  := sqlerrm;
  end;

  execute 'reset role';
  perform set_config('request.jwt.claims', '', false);

  insert into _tg_vac_contract values
    (1, 'INSERT als Mitarbeiter erlaubt',
     coalesce(v_sqlstate || ' ' || v_message, 'ohne Fehler'),
     case when v_sqlstate is null then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  insert into _tg_vac_contract values
    (2, 'RETURNING liefert eine id (entspricht result.data.id)',
     coalesce(v_id::text, '<null>'),
     case when v_id is not null then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  insert into _tg_vac_contract values
    (3, 'RETURNING liefert die eigene employee_id',
     coalesce(v_employee_out::text, '<null>'),
     case when v_employee_out = v_employee_id then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  insert into _tg_vac_contract values
    (4, 'RETURNING liefert status = requested',
     coalesce(v_status_out, '<null>'),
     case when v_status_out = 'requested' then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  ---------------------------------------------------------------------------
  -- Gegenprobe: Kann der Mitarbeiter den Antrag anschliessend lesen?
  -- (Das ist die Policy, von der das RETURNING abhaengt.)
  ---------------------------------------------------------------------------
  begin
    perform set_config('role', 'authenticated', false);
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_mitarbeiter_uid, 'role', 'authenticated')::text, false);

    select count(*) into v_rows
    from public.vacation_requests
    where note = 'TESTDATA-010 Vertragspruefung';

    v_sqlstate := null;
  exception when others then
    v_sqlstate := sqlstate; v_message := sqlerrm; v_rows := -1;
  end;

  execute 'reset role';
  perform set_config('request.jwt.claims', '', false);

  insert into _tg_vac_contract values
    (5, 'Mitarbeiter kann den eigenen Antrag lesen',
     v_rows::text || ' Zeile(n)',
     case when v_rows = 1 then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  ---------------------------------------------------------------------------
  -- Gegenprobe: Ein Kunde darf den Antrag NICHT sehen
  ---------------------------------------------------------------------------
  begin
    perform set_config('role', 'authenticated', false);
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_kunde_a_uid, 'role', 'authenticated')::text, false);

    select count(*) into v_rows
    from public.vacation_requests
    where note = 'TESTDATA-010 Vertragspruefung';

    v_sqlstate := null;
  exception when others then
    v_sqlstate := sqlstate; v_message := sqlerrm; v_rows := -1;
  end;

  execute 'reset role';
  perform set_config('request.jwt.claims', '', false);

  insert into _tg_vac_contract values
    (6, 'Kunde sieht den fremden Antrag nicht',
     v_rows::text || ' Zeile(n)',
     case when v_rows = 0 then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  ---------------------------------------------------------------------------
  -- Gegenprobe: Kann der Mitarbeiter den Antrag zurueckziehen (UPDATE)?
  -- Erwartung laut 002: NEIN - es gibt keine UPDATE-Policy fuer Mitarbeiter.
  ---------------------------------------------------------------------------
  begin
    perform set_config('role', 'authenticated', false);
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_mitarbeiter_uid, 'role', 'authenticated')::text, false);

    update public.vacation_requests
    set status = 'withdrawn'
    where id = v_id;

    get diagnostics v_rows = row_count;
    v_sqlstate := null;
  exception when others then
    v_sqlstate := sqlstate; v_message := sqlerrm; v_rows := -1;
  end;

  execute 'reset role';
  perform set_config('request.jwt.claims', '', false);

  insert into _tg_vac_contract values
    (7, 'Zuruecknahme durch Mitarbeiter wird verhindert',
     case when v_sqlstate is not null
          then v_sqlstate || ' ' || v_message
          else v_rows::text || ' Zeile(n) geaendert' end,
     case when v_sqlstate is not null or v_rows = 0 then 'BESTANDEN' else 'FEHLGESCHLAGEN' end);

  -- Aufraeumen
  delete from public.vacation_requests where note = 'TESTDATA-010 Vertragspruefung';
end
$$;

select nr, pruefung, ergebnis, status from _tg_vac_contract order by nr;

select count(*) filter (where status = 'BESTANDEN')  as bestanden,
       count(*) filter (where status <> 'BESTANDEN') as fehlgeschlagen
from _tg_vac_contract;
