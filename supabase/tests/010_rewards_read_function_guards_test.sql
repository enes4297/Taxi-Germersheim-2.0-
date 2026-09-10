-- 010_rewards_read_function_guards_test.sql
--
-- Berechtigungstest zu 010_rewards_read_function_guards.sql
--
-- SICHERHEITSHINWEIS
--   Dieses Skript ist lesend. Es ruft ausschliesslich die drei geprueften
--   Funktionen sowie spin_my_rewards_wheel() auf. Keine dieser Funktionen
--   schreibt Daten (spin_my_rewards_wheel endet immer mit einer Exception,
--   bevor irgendein INSERT/UPDATE erreicht wird - geprueft in 009).
--   Einzige Schreiboperation ist eine TEMP-Tabelle in der eigenen Sitzung.
--
-- REIHENFOLGE
--   1. Zuerst 010_rewards_read_function_guards.sql einspielen.
--   2. Dann dieses Skript ausfuehren.
--   3. Zum Vergleich kann es auch VOR der Migration laufen: dann muessen
--      mehrere Tests FEHLGESCHLAGEN melden - genau das ist der Nachweis,
--      dass die Luecke bestand.
--
-- VORBEREITUNG
--   Unten im DO-Block die sechs Platzhalter ausfuellen.
--   Passende IDs findest du mit der Hilfsabfrage ganz am Ende dieser Datei.
--
-- ROLLENSIMULATION
--   set_config('role', ...) und set_config('request.jwt.claims', ...) setzen
--   die Sitzungsrolle und den JWT-Anspruch, den auth.uid() auswertet.
--   Nach jedem Test wird die Rolle zurueckgesetzt. Sollte nach einem Abbruch
--   etwas haengen bleiben, hilft ein einzelnes:  reset role;

drop table if exists _tg_test_ergebnisse;
create temp table _tg_test_ergebnisse (
  nr        int,
  akteur    text,
  funktion  text,
  erwartet  text,
  ergebnis  text,
  status    text
);

do $$
declare
  ---------------------------------------------------------------------------
  -- HIER AUSFUELLEN
  ---------------------------------------------------------------------------
  v_kunde_a_uid     uuid := '00000000-0000-0000-0000-00000000000a';  -- customers.auth_user_id  Kunde A
  v_kunde_a_konto   uuid := '00000000-0000-0000-0000-0000000000a1';  -- rewards_accounts.id     Kunde A
  v_kunde_b_uid     uuid := '00000000-0000-0000-0000-00000000000b';  -- customers.auth_user_id  Kunde B
  v_kunde_b_konto   uuid := '00000000-0000-0000-0000-0000000000b1';  -- rewards_accounts.id     Kunde B
  v_mitarbeiter_uid uuid := '00000000-0000-0000-0000-00000000000e';  -- profiles.auth_user_id   role='employee', active
  v_admin_uid       uuid := '00000000-0000-0000-0000-00000000000d';  -- profiles.auth_user_id   role='admin' oder 'dispatcher', active
  ---------------------------------------------------------------------------

  r        record;
  v_out    text;
  v_erg    text;
  v_status text;
begin
  for r in
    select * from (values
      -- nr, Akteur, DB-Rolle, JWT-sub, Bezeichnung, auszufuehrendes SQL, Erwartung
      ( 1,'anonym',      'anon',          null::uuid,
        'spin_balance(Konto A)',
        format('select public.rewards_account_spin_balance(%L::uuid)::text', v_kunde_a_konto), 'FEHLER'),
      ( 2,'anonym',      'anon',          null::uuid,
        'wheel_summary(heute)',
        'select to_jsonb(t)::text from public.rewards_wheel_summary(current_date) as t', 'FEHLER'),
      ( 3,'anonym',      'anon',          null::uuid,
        'active_member_count(heute)',
        'select public.rewards_wheel_active_member_count(current_date)::text', 'FEHLER'),

      ( 4,'Kunde A',     'authenticated', v_kunde_a_uid,
        'spin_balance(eigenes Konto A)',
        format('select public.rewards_account_spin_balance(%L::uuid)::text', v_kunde_a_konto), 'OK'),
      ( 5,'Kunde A',     'authenticated', v_kunde_a_uid,
        'spin_balance(FREMDES Konto B)',
        format('select public.rewards_account_spin_balance(%L::uuid)::text', v_kunde_b_konto), 'FEHLER'),
      ( 6,'Kunde A',     'authenticated', v_kunde_a_uid,
        'wheel_summary(heute)',
        'select to_jsonb(t)::text from public.rewards_wheel_summary(current_date) as t', 'FEHLER'),
      ( 7,'Kunde A',     'authenticated', v_kunde_a_uid,
        'active_member_count(heute)',
        'select public.rewards_wheel_active_member_count(current_date)::text', 'FEHLER'),

      ( 8,'Kunde B',     'authenticated', v_kunde_b_uid,
        'spin_balance(eigenes Konto B)',
        format('select public.rewards_account_spin_balance(%L::uuid)::text', v_kunde_b_konto), 'OK'),
      ( 9,'Kunde B',     'authenticated', v_kunde_b_uid,
        'spin_balance(FREMDES Konto A)',
        format('select public.rewards_account_spin_balance(%L::uuid)::text', v_kunde_a_konto), 'FEHLER'),

      (10,'Mitarbeiter', 'authenticated', v_mitarbeiter_uid,
        'spin_balance(fremdes Konto A)',
        format('select public.rewards_account_spin_balance(%L::uuid)::text', v_kunde_a_konto), 'FEHLER'),
      (11,'Mitarbeiter', 'authenticated', v_mitarbeiter_uid,
        'wheel_summary(heute)',
        'select to_jsonb(t)::text from public.rewards_wheel_summary(current_date) as t', 'FEHLER'),
      (12,'Mitarbeiter', 'authenticated', v_mitarbeiter_uid,
        'active_member_count(heute)',
        'select public.rewards_wheel_active_member_count(current_date)::text', 'FEHLER'),

      (13,'Admin/Dispo', 'authenticated', v_admin_uid,
        'spin_balance(fremdes Konto A)',
        format('select public.rewards_account_spin_balance(%L::uuid)::text', v_kunde_a_konto), 'OK'),
      (14,'Admin/Dispo', 'authenticated', v_admin_uid,
        'wheel_summary(heute)',
        'select to_jsonb(t)::text from public.rewards_wheel_summary(current_date) as t', 'OK'),
      (15,'Admin/Dispo', 'authenticated', v_admin_uid,
        'active_member_count(heute)',
        'select public.rewards_wheel_active_member_count(current_date)::text', 'OK'),

      -- Regressionstest: Kunden-Gluecksrad bleibt gesperrt (darf sich NICHT aendern)
      (16,'Kunde A',     'authenticated', v_kunde_a_uid,
        'spin_my_rewards_wheel() bleibt gesperrt',
        'select public.spin_my_rewards_wheel()::text', 'FEHLER')
    ) as t(nr, akteur, dbrolle, jwt_sub, funktion, sql_text, erwartet)
    order by 1
  loop
    begin
      perform set_config('role', r.dbrolle, false);
      if r.jwt_sub is null then
        perform set_config('request.jwt.claims', '', false);
      else
        perform set_config(
          'request.jwt.claims',
          json_build_object('sub', r.jwt_sub, 'role', r.dbrolle)::text,
          false
        );
      end if;

      execute r.sql_text into v_out;

      v_erg    := 'OK -> ' || coalesce(v_out, '(null)');
      v_status := case when r.erwartet = 'OK' then 'BESTANDEN' else 'FEHLGESCHLAGEN' end;
    exception when others then
      v_erg    := 'FEHLER ' || sqlstate || ' -> ' || sqlerrm;
      v_status := case when r.erwartet = 'FEHLER' then 'BESTANDEN' else 'FEHLGESCHLAGEN' end;
    end;

    execute 'reset role';
    perform set_config('request.jwt.claims', '', false);

    insert into _tg_test_ergebnisse
      values (r.nr, r.akteur, r.funktion, r.erwartet, v_erg, v_status);
  end loop;

  execute 'reset role';
end
$$;

-- ---------------------------------------------------------------------------
-- Ergebnis
-- ---------------------------------------------------------------------------
select
  nr,
  akteur,
  funktion,
  erwartet,
  status,
  ergebnis
from _tg_test_ergebnisse
order by nr;

-- Kurzfassung: alles bestanden?
select
  count(*)                                              as tests_gesamt,
  count(*) filter (where status = 'BESTANDEN')          as bestanden,
  count(*) filter (where status = 'FEHLGESCHLAGEN')     as fehlgeschlagen,
  case
    when count(*) filter (where status = 'FEHLGESCHLAGEN') = 0
      then 'ALLE TESTS BESTANDEN'
    else 'ACHTUNG: mindestens ein Test fehlgeschlagen'
  end                                                   as gesamtergebnis
from _tg_test_ergebnisse;

-- ---------------------------------------------------------------------------
-- Hilfsabfrage: passende Test-IDs ermitteln (nur IDs, keine Personendaten)
-- ---------------------------------------------------------------------------
-- Zwei Kunden MIT Rewards-Konto und verknuepftem Auth-Benutzer:
--
--   select c.auth_user_id as kunde_uid, ra.id as rewards_konto_id
--   from public.customers as c
--   join public.rewards_accounts as ra on ra.customer_id = c.id
--   where c.auth_user_id is not null
--   order by ra.created_at
--   limit 2;
--
-- Je ein Mitarbeiter- und ein Admin/Dispo-Konto:
--
--   select auth_user_id, role
--   from public.profiles
--   where active = true
--     and auth_user_id is not null
--     and role in ('employee', 'admin', 'dispatcher')
--   order by role;
