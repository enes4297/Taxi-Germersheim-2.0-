-- 13_concurrency_setup.sql
--
-- Vorbereitung fuer den Nebenlaeufigkeitstest (13_concurrency_run.ps1).
-- Legt zwei Dateien im Ordner des Testmitarbeiters an, die im Test jeweils
-- gleichzeitig geloescht und verknuepft werden.
--
-- NUR LOKALE TESTUMGEBUNG.

do $$
declare
  v_ma_uid uuid;
  v_ma_emp uuid;
begin
  select auth_user_id into strict v_ma_uid from tg_test.identities where schluessel = 'mitarbeiter';
  select employee_id  into strict v_ma_emp from public.profiles where auth_user_id = v_ma_uid;

  delete from public.document_submissions where note like 'TESTDATA-013%';
  delete from storage.objects where name like '%testdata-013%';

  insert into storage.objects (bucket_id, name)
  values ('employee-documents', v_ma_uid::text || '/2099/testdata-013-fall-a.pdf'),
         ('employee-documents', v_ma_uid::text || '/2099/testdata-013-fall-b.pdf');
end
$$;

-- Die vom Testskript benoetigten Werte ausgeben.
select
  (select auth_user_id from tg_test.identities where schluessel = 'mitarbeiter')::text as ma_uid,
  (select p.employee_id
     from public.profiles as p
     join tg_test.identities as i on i.auth_user_id = p.auth_user_id
    where i.schluessel = 'mitarbeiter')::text as ma_emp;
