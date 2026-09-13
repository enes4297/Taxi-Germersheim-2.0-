-- ===========================================================================
-- Synthetische Testdaten fuer die Storage-API-Tests
-- ===========================================================================
--
-- NUR IM TESTPROJEKT AUSFUEHREN. Dieses Skript LEGT DATEN AN.
--
-- ZUR SCHUTZABFRAGE IN ABSCHNITT 0
--   Sie ist eine BEWUSSTE BESTAETIGUNG DURCH DIE AUSFUEHRENDE PERSON, KEIN
--   technischer Nachweis einer Testumgebung. Das Skript kann nicht erkennen,
--   gegen welche Datenbank es laeuft. Eine leere Tabelle ist KEIN Beleg fuer
--   ein Testprojekt - eine produktive Datenbank kann ebenfalls leer sein.
--   Die Verantwortung fuer die richtige Verbindung liegt vollstaendig bei der
--   ausfuehrenden Person.
--
-- VORHER NOETIG: die vier Auth-Konten
--   Dieses Skript legt KEINE Auth-Konten an. Das geht nicht sinnvoll per SQL:
--   auth.users gehoert supabase_auth_admin, und das Kennwort-Hashing gehoert
--   GoTrue. Die vier Konten werden zuerst im Dashboard angelegt
--   (Authentication -> Users -> Add user, "Auto Confirm User" einschalten),
--   danach laeuft dieses Skript.
--
-- Vier Akteure, rein synthetisch:
--   A        aktiver Mitarbeiter          - darf hochladen
--   B        aktiver Mitarbeiter          - Gegenprobe fremder Ordner
--   admin    profiles.role='admin'        - darf alles lesen
--   inaktiv  employees.portal_active=false - darf NICHT hochladen
--
--   Hinweis zum inaktiven Konto: Es ist bewusst ein vollstaendig angelegter
--   Mitarbeiter, dem allein portal_active fehlt. Nur so weist der Test nach,
--   dass private.is_active_employee() dieses Feld auswertet. Ein Konto ganz
--   ohne Profil wuerde schon an der Verknuepfung scheitern und waere kein
--   Beleg.
--
-- Aufraeumen: Abschnitt 5 am Ende dieser Datei.
-- ===========================================================================


-- ===========================================================================
-- 0) Bestaetigung der Testumgebung
-- ===========================================================================
-- Vor diesem Skript ausfuehren:
--
--   set tg.test_env = 'ICH-BESTAETIGE-ISOLIERTE-TESTUMGEBUNG';
--
-- Die Abschnitte 0 bis 3 laufen in EINEM Vorgang. Schlaegt eine der beiden
-- Schutzabfragen an, wird nichts angelegt - auch dann nicht, wenn der Client
-- nach einem Fehler einfach weitermacht. Der Supabase-SQL-Editor tut das
-- ohnehin nicht, psql ohne ON_ERROR_STOP aber schon.
begin;

do $$
begin
  if coalesce(current_setting('tg.test_env', true), '') <> 'ICH-BESTAETIGE-ISOLIERTE-TESTUMGEBUNG' then
    raise exception 'ABBRUCH: Bestaetigung fehlt. Zuerst ausfuehren: set tg.test_env = ''ICH-BESTAETIGE-ISOLIERTE-TESTUMGEBUNG'';';
  end if;
end
$$;


-- ===========================================================================
-- 1) Die vier Auth-Konten muessen bereits bestehen
-- ===========================================================================
-- Die E-Mail-Adressen muessen mit konfiguration.json uebereinstimmen.
-- example.invalid ist per RFC 6761 dauerhaft nicht aufloesbar - es kann also
-- keine Post an unbeteiligte Dritte gehen.
do $$
declare
  v_fehlend text;
begin
  select string_agg(m.adresse, ', ' order by m.adresse)
    into v_fehlend
  from (values
    ('tg-test-a@example.invalid'),
    ('tg-test-b@example.invalid'),
    ('tg-test-admin@example.invalid'),
    ('tg-test-inaktiv@example.invalid')
  ) as m(adresse)
  where not exists (select 1 from auth.users as u where u.email = m.adresse);

  if v_fehlend is not null then
    raise exception 'ABBRUCH: Diese Auth-Konten fehlen noch: %. Zuerst im Dashboard anlegen (Auto Confirm User).', v_fehlend;
  end if;

  raise notice 'Alle vier Auth-Konten vorhanden.';
end
$$;


-- ===========================================================================
-- 2) Dokumenttyp
-- ===========================================================================
insert into public.document_types (key, label)
values ('tg-test-nachweis', 'Testnachweis (synthetisch)')
on conflict (key) do nothing;


-- ===========================================================================
-- 3) Mitarbeiter und Profile
-- ===========================================================================
-- Die Namen sind frei erfunden. Keine echten Personendaten, keine echten
-- Telefonnummern, keine echten Adressen.
do $$
declare
  r record;
  v_employee uuid;
  v_auth     uuid;
begin
  for r in
    select * from (values
      ('tg-test-a@example.invalid',       'Ada',  'Testfall',  'employee', true,  true),
      ('tg-test-b@example.invalid',       'Bodo', 'Testfall',  'employee', true,  true),
      ('tg-test-admin@example.invalid',   'Cleo', 'Testfall',  'admin',    true,  true),
      ('tg-test-inaktiv@example.invalid', 'Dirk', 'Testfall',  'employee', true,  false)
    ) as t(adresse, vorname, nachname, rolle, profil_aktiv, portal_aktiv)
  loop
    select u.id into v_auth from auth.users as u where u.email = r.adresse;

    -- Mitarbeiter: ueber die synthetische E-Mail wiedererkennbar, damit das
    -- Skript wiederholbar ist.
    select e.id into v_employee
    from public.employees as e
    where e.email = r.adresse;

    if v_employee is null then
      insert into public.employees (first_name, last_name, email, active, portal_active)
      values (r.vorname, r.nachname, r.adresse, true, r.portal_aktiv)
      returning id into v_employee;
    else
      update public.employees
         set active = true, portal_active = r.portal_aktiv
       where id = v_employee;
    end if;

    if exists (select 1 from public.profiles as p where p.auth_user_id = v_auth) then
      update public.profiles
         set employee_id = v_employee,
             role        = r.rolle,
             active      = r.profil_aktiv,
             display_name = r.vorname || ' ' || r.nachname
       where auth_user_id = v_auth;
    else
      insert into public.profiles (auth_user_id, employee_id, display_name, role, active)
      values (v_auth, v_employee, r.vorname || ' ' || r.nachname, r.rolle, r.profil_aktiv);
    end if;

    raise notice 'Testkonto % -> employee %, Rolle %, portal_active %.', r.adresse, v_employee, r.rolle, r.portal_aktiv;
  end loop;
end
$$;

commit;


-- ===========================================================================
-- 4) Kontrolle - rein lesend
-- ===========================================================================
-- Erwartet: vier Zeilen. Bei A, B und admin muss aktiv_laut_regel = true
-- stehen, bei inaktiv false. Genau dieses false ist der Gegenbeweis im Test.
select
  u.email                                   as konto,
  u.id                                      as auth_user_id,
  p.role                                    as rolle,
  p.active                                  as profil_aktiv,
  e.active                                  as mitarbeiter_aktiv,
  e.portal_active                           as portal_aktiv,
  (p.active and e.active and e.portal_active) as aktiv_laut_regel,
  (u.email_confirmed_at is not null)        as bestaetigt
from auth.users as u
join public.profiles  as p on p.auth_user_id = u.id
join public.employees as e on e.id = p.employee_id
where u.email like 'tg-test-%@example.invalid'
order by u.email;


-- ===========================================================================
-- 5) Aufraeumen - erst NACH den Tests, bewusst auskommentiert
-- ===========================================================================
-- Reihenfolge beachten: zuerst die Verknuepfungen, dann die Stammdaten.
-- Die DATEIEN im Bucket raeumt das NICHT weg - dafuer ist die Storage-API
-- zustaendig, siehe 20_storage_api_test.ps1 -Aufraeumen.
--
-- begin;
--   delete from public.document_submissions
--    where employee_id in (select id from public.employees where email like 'tg-test-%@example.invalid');
--   delete from public.employee_documents
--    where employee_id in (select id from public.employees where email like 'tg-test-%@example.invalid');
--   delete from public.profiles
--    where auth_user_id in (select id from auth.users where email like 'tg-test-%@example.invalid');
--   delete from public.employees where email like 'tg-test-%@example.invalid';
--   delete from public.document_types where key = 'tg-test-nachweis';
-- commit;
--
-- Die vier Auth-Konten selbst werden im Dashboard geloescht.
