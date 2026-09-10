-- 010_rewards_read_function_guards_test.sql
--
-- Berechtigungstest zu 010_rewards_read_function_guards.sql
--
-- ===========================================================================
-- NUR IN EINER AUSDRUECKLICH IDENTIFIZIERTEN, ISOLIERTEN TESTUMGEBUNG
-- AUSFUEHREN. Voraussetzung: 010_rewards_read_function_guards_seed.sql
-- wurde dort erfolgreich eingespielt.
-- ===========================================================================
--
-- IDENTITAETEN
--   Dieses Skript enthaelt KEINE fest verdrahteten Benutzer-IDs. Es liest alle
--   Identitaeten aus tg_test.identities und die Kundenzuordnung aus
--   tg_test.customer_map - denselben Tabellen, aus denen das Seed-Skript
--   customers.auth_user_id und profiles.auth_user_id befuellt hat. Damit
--   koennen Testdaten und simulierte JWT-Subjekte nicht auseinanderlaufen,
--   auch wenn die Auth-Benutzer ueber die Supabase-Oberflaeche angelegt wurden.
--   Produktive Kunden- oder Mitarbeiter-IDs kommen hier nicht vor und duerfen
--   auch nicht eingetragen werden - UUIDs echter Konten sind personenbezogen.
--
-- LESEND
--   Aufgerufen werden nur rewards_account_spin_balance, rewards_wheel_summary,
--   rewards_wheel_active_member_count und spin_my_rewards_wheel. Keine dieser
--   Funktionen schreibt Daten; spin_my_rewards_wheel endet immer mit einer
--   Exception, bevor ein INSERT/UPDATE erreicht wird (geprueft in 009).
--   Einzige Schreiboperation ist eine TEMP-Tabelle der eigenen Sitzung.
--
-- PRUEFTIEFE
--   - Erwartete Berechtigungsfehler muessen SQLSTATE 42501 melden.
--     Ein beliebiger anderer Fehler gilt als FEHLGESCHLAGEN.
--   - JEDER erfolgreiche Aufruf wird gegen einen unabhaengig als
--     Eigentuemerrolle ermittelten Sollwert verglichen. Ein Aufruf, der zwar
--     durchlaeuft, aber einen falschen Wert liefert, gilt als FEHLGESCHLAGEN.
--   - Admin und Disponent werden getrennt geprueft.
--   - Ein inaktives Profil mit Rolle 'admin' weist nach, dass active
--     ausgewertet wird.
--
-- VORHER / NACHHER
--   Vor der Migration MUESSEN fehlschlagen: 5, 6, 7, 9, 10, 11, 12, 19, 20, 21.
--   Die anonymen Tests 1 bis 3 sind bereits VOR der Migration bestanden:
--   007_rewards_wheel.sql hat anon das EXECUTE-Recht entzogen, der Aufruf
--   scheitert also schon am GRANT - ebenfalls mit SQLSTATE 42501.
--   Nach der Migration muessen alle 22 Tests bestanden sein.


-- ===========================================================================
-- 0) Vorpruefung der Testdaten
--    Bricht ab, wenn Seed fehlt oder die Sollwerte nicht exakt stimmen.
-- ===========================================================================
do $$
declare
  v_a integer;
  v_b integer;
  v_a_pos integer;
  v_a_status text;
begin
  if to_regclass('tg_test.identities') is null
     or to_regclass('tg_test.customer_map') is null then
    raise exception 'ABBRUCH: tg_test.identities/customer_map fehlen. Bitte zuerst 010_rewards_read_function_guards_seed.sql ausfuehren.';
  end if;

  if (select count(*) from tg_test.identities) <> 6 then
    raise exception 'ABBRUCH: tg_test.identities enthaelt % statt 6 Eintraege.',
      (select count(*) from tg_test.identities);
  end if;

  select coalesce(sum(st.amount), 0),
         count(*) filter (where st.amount > 0)
    into v_a, v_a_pos
  from tg_test.customer_map as m
  join public.rewards_accounts as ra on ra.customer_id = m.customer_id
  left join public.rewards_spin_transactions as st on st.rewards_account_id = ra.id
  where m.schluessel = 'kunde_a';

  select coalesce(sum(st.amount), 0)
    into v_b
  from tg_test.customer_map as m
  join public.rewards_accounts as ra on ra.customer_id = m.customer_id
  left join public.rewards_spin_transactions as st on st.rewards_account_id = ra.id
  where m.schluessel = 'kunde_b';

  select ra.status into v_a_status
  from tg_test.customer_map as m
  join public.rewards_accounts as ra on ra.customer_id = m.customer_id
  where m.schluessel = 'kunde_a';

  if v_a <> 2 then
    raise exception 'ABBRUCH: Spin-Guthaben Kunde A ist %, erwartet exakt 2. Seed pruefen.', v_a;
  end if;
  if v_b <> 5 then
    raise exception 'ABBRUCH: Spin-Guthaben Kunde B ist %, erwartet exakt 5. Seed pruefen.', v_b;
  end if;
  if v_a_pos < 1 then
    raise exception 'ABBRUCH: Kunde A hat keinen positiven Spin-Posten. Test 22 wuerde zu frueh abbrechen.';
  end if;
  if v_a_status is distinct from 'active' then
    raise exception 'ABBRUCH: Rewards-Konto Kunde A hat Status %, erwartet active.', v_a_status;
  end if;

  raise notice 'Vorpruefung bestanden: Guthaben A=2, B=5, Kontostatus A=active, positive Posten A=%.', v_a_pos;
end
$$;


-- ===========================================================================
-- 1) Ergebnistabelle
--    pg_temp-qualifiziert, damit unter keinen Umstaenden eine gleichnamige
--    dauerhafte Tabelle geloescht werden kann.
-- ===========================================================================
drop table if exists pg_temp._tg_test_ergebnisse;
create temporary table _tg_test_ergebnisse (
  nr        int,
  akteur    text,
  funktion  text,
  erwartet  text,
  sollwert  text,
  istwert   text,
  status    text
);


-- ===========================================================================
-- 2) Testlauf
-- ===========================================================================
do $$
declare
  -- Identitaeten ausschliesslich aus der gemeinsamen Zuordnung
  v_kunde_a_uid     uuid;
  v_kunde_b_uid     uuid;
  v_mitarbeiter_uid uuid;
  v_admin_uid       uuid;
  v_disponent_uid   uuid;
  v_inaktiv_uid     uuid;

  v_konto_a uuid;
  v_konto_b uuid;

  -- Sollwert-SQL fuer die Tagesstatistik, einmal definiert und mehrfach genutzt
  c_soll_summary constant text :=
      'select to_jsonb(t)::text from ('
   || 'select count(*) filter (where created_at::date = current_date) as spins_total,'
   || ' count(*) filter (where prize_type in (''points_5'',''points_10'',''points_20'',''points_30'',''points_50'') and created_at::date = current_date) as points_wins_total,'
   || ' count(*) filter (where prize_type = ''voucher_20'' and created_at::date = current_date) as vouchers_total,'
   || ' count(*) filter (where prize_type = ''yumaks_box'' and created_at::date = current_date) as yumaks_box_total'
   || ' from public.rewards_wheel_spins) as t';

  c_soll_member constant text :=
      'select count(distinct rewards_account_id)::text from public.rewards_wheel_spins where created_at::date = current_date';

  r          record;
  v_ist      text;
  v_soll     text;
  v_status   text;
  v_sqlstate text;
  v_message  text;
begin
  select auth_user_id into strict v_kunde_a_uid     from tg_test.identities where schluessel = 'kunde_a';
  select auth_user_id into strict v_kunde_b_uid     from tg_test.identities where schluessel = 'kunde_b';
  select auth_user_id into strict v_mitarbeiter_uid from tg_test.identities where schluessel = 'mitarbeiter';
  select auth_user_id into strict v_admin_uid       from tg_test.identities where schluessel = 'admin';
  select auth_user_id into strict v_disponent_uid   from tg_test.identities where schluessel = 'disponent';
  select auth_user_id into strict v_inaktiv_uid     from tg_test.identities where schluessel = 'inaktiv';

  select ra.id into strict v_konto_a
  from tg_test.customer_map as m
  join public.rewards_accounts as ra on ra.customer_id = m.customer_id
  where m.schluessel = 'kunde_a';

  select ra.id into strict v_konto_b
  from tg_test.customer_map as m
  join public.rewards_accounts as ra on ra.customer_id = m.customer_id
  where m.schluessel = 'kunde_b';

  for r in
    select * from (values
      -- nr, Akteur, DB-Rolle, JWT-sub, Bezeichnung,
      --   auszufuehrendes SQL (als Testrolle),
      --   Erwartung OK/FEHLER, erwarteter SQLSTATE, erwartete Meldung,
      --   SQL fuer den Sollwert (als Eigentuemerrolle)

      -- --- anonym: scheitert bereits am fehlenden EXECUTE-Recht (seit 007) ---
      ( 1,'anonym','anon',null::uuid,'spin_balance(Konto A)',
        format('select public.rewards_account_spin_balance(%L::uuid)::text', v_konto_a),
        'FEHLER','42501',null::text,null::text),
      ( 2,'anonym','anon',null::uuid,'wheel_summary(heute)',
        'select to_jsonb(t)::text from public.rewards_wheel_summary(current_date) as t',
        'FEHLER','42501',null,null),
      ( 3,'anonym','anon',null::uuid,'active_member_count(heute)',
        'select public.rewards_wheel_active_member_count(current_date)::text',
        'FEHLER','42501',null,null),

      -- --- Kunde A ---
      ( 4,'Kunde A','authenticated',v_kunde_a_uid,'spin_balance(EIGENES Konto A)',
        format('select public.rewards_account_spin_balance(%L::uuid)::text', v_konto_a),
        'OK',null,null,
        format('select coalesce(sum(amount),0)::text from public.rewards_spin_transactions where rewards_account_id = %L::uuid', v_konto_a)),
      ( 5,'Kunde A','authenticated',v_kunde_a_uid,'spin_balance(FREMDES Konto B)',
        format('select public.rewards_account_spin_balance(%L::uuid)::text', v_konto_b),
        'FEHLER','42501',null,null),
      ( 6,'Kunde A','authenticated',v_kunde_a_uid,'wheel_summary(heute)',
        'select to_jsonb(t)::text from public.rewards_wheel_summary(current_date) as t',
        'FEHLER','42501',null,null),
      ( 7,'Kunde A','authenticated',v_kunde_a_uid,'active_member_count(heute)',
        'select public.rewards_wheel_active_member_count(current_date)::text',
        'FEHLER','42501',null,null),

      -- --- Kunde B ---
      ( 8,'Kunde B','authenticated',v_kunde_b_uid,'spin_balance(EIGENES Konto B)',
        format('select public.rewards_account_spin_balance(%L::uuid)::text', v_konto_b),
        'OK',null,null,
        format('select coalesce(sum(amount),0)::text from public.rewards_spin_transactions where rewards_account_id = %L::uuid', v_konto_b)),
      ( 9,'Kunde B','authenticated',v_kunde_b_uid,'spin_balance(FREMDES Konto A)',
        format('select public.rewards_account_spin_balance(%L::uuid)::text', v_konto_a),
        'FEHLER','42501',null,null),

      -- --- Mitarbeiter (role='employee', active=true) ---
      (10,'Mitarbeiter','authenticated',v_mitarbeiter_uid,'spin_balance(fremdes Konto A)',
        format('select public.rewards_account_spin_balance(%L::uuid)::text', v_konto_a),
        'FEHLER','42501',null,null),
      (11,'Mitarbeiter','authenticated',v_mitarbeiter_uid,'wheel_summary(heute)',
        'select to_jsonb(t)::text from public.rewards_wheel_summary(current_date) as t',
        'FEHLER','42501',null,null),
      (12,'Mitarbeiter','authenticated',v_mitarbeiter_uid,'active_member_count(heute)',
        'select public.rewards_wheel_active_member_count(current_date)::text',
        'FEHLER','42501',null,null),

      -- --- Admin (role='admin', active=true) ---
      (13,'Admin','authenticated',v_admin_uid,'spin_balance(fremdes Konto A)',
        format('select public.rewards_account_spin_balance(%L::uuid)::text', v_konto_a),
        'OK',null,null,
        format('select coalesce(sum(amount),0)::text from public.rewards_spin_transactions where rewards_account_id = %L::uuid', v_konto_a)),
      (14,'Admin','authenticated',v_admin_uid,'wheel_summary(heute)',
        'select to_jsonb(t)::text from public.rewards_wheel_summary(current_date) as t',
        'OK',null,null, c_soll_summary),
      (15,'Admin','authenticated',v_admin_uid,'active_member_count(heute)',
        'select public.rewards_wheel_active_member_count(current_date)::text',
        'OK',null,null, c_soll_member),

      -- --- Disponent (role='dispatcher', active=true) ---
      (16,'Disponent','authenticated',v_disponent_uid,'spin_balance(fremdes Konto B)',
        format('select public.rewards_account_spin_balance(%L::uuid)::text', v_konto_b),
        'OK',null,null,
        format('select coalesce(sum(amount),0)::text from public.rewards_spin_transactions where rewards_account_id = %L::uuid', v_konto_b)),
      (17,'Disponent','authenticated',v_disponent_uid,'wheel_summary(heute)',
        'select to_jsonb(t)::text from public.rewards_wheel_summary(current_date) as t',
        'OK',null,null, c_soll_summary),
      (18,'Disponent','authenticated',v_disponent_uid,'active_member_count(heute)',
        'select public.rewards_wheel_active_member_count(current_date)::text',
        'OK',null,null, c_soll_member),

      -- --- Inaktives Profil mit Rolle 'admin': active muss ausgewertet werden ---
      (19,'Inaktiv (admin, active=false)','authenticated',v_inaktiv_uid,'spin_balance(fremdes Konto A)',
        format('select public.rewards_account_spin_balance(%L::uuid)::text', v_konto_a),
        'FEHLER','42501',null,null),
      (20,'Inaktiv (admin, active=false)','authenticated',v_inaktiv_uid,'wheel_summary(heute)',
        'select to_jsonb(t)::text from public.rewards_wheel_summary(current_date) as t',
        'FEHLER','42501',null,null),
      (21,'Inaktiv (admin, active=false)','authenticated',v_inaktiv_uid,'active_member_count(heute)',
        'select public.rewards_wheel_active_member_count(current_date)::text',
        'FEHLER','42501',null,null),

      -- --- Regression: Kunden-Gluecksrad bleibt gesperrt ---
      --     Kunde A ist verknuepft, Konto aktiv, positiver Spin-Posten vorhanden
      --     (in Abschnitt 0 hart geprueft). Die Funktion muss deshalb bis zur
      --     Endsperre durchlaufen und darf NICHT vorher mit
      --     CUSTOMER_ACCOUNT_NOT_LINKED, REWARDS_ACCOUNT_PAUSED,
      --     REWARDS_ACCOUNT_BLOCKED oder REWARDS_NO_SPINS_AVAILABLE abbrechen.
      (22,'Kunde A','authenticated',v_kunde_a_uid,'spin_my_rewards_wheel() bleibt gesperrt',
        'select public.spin_my_rewards_wheel()::text',
        'FEHLER','P0001','CUSTOMER_WHEEL_BLOCKED_BY_BACKEND',null)
    ) as t(nr, akteur, dbrolle, jwt_sub, funktion, sql_text,
           erwartet, erw_sqlstate, erw_meldung, sql_soll)
    order by 1
  loop
    -- Sollwert als Eigentuemerrolle ermitteln, BEVOR die Rolle gewechselt wird
    v_soll := null;
    if r.sql_soll is not null then
      execute r.sql_soll into v_soll;
    end if;

    begin
      perform set_config('role', r.dbrolle, false);
      if r.jwt_sub is null then
        perform set_config('request.jwt.claims', '', false);
      else
        perform set_config('request.jwt.claims',
          json_build_object('sub', r.jwt_sub, 'role', r.dbrolle)::text, false);
      end if;

      execute r.sql_text into v_ist;

      v_sqlstate := null;
      v_message  := null;
    exception when others then
      v_sqlstate := sqlstate;
      v_message  := sqlerrm;
      v_ist      := null;
    end;

    execute 'reset role';
    perform set_config('request.jwt.claims', '', false);

    -- Bewertung
    if r.erwartet = 'OK' then
      if v_sqlstate is not null then
        v_status := 'FEHLGESCHLAGEN (unerwarteter Fehler ' || v_sqlstate || ': ' || v_message || ')';
      elsif r.sql_soll is null then
        v_status := 'FEHLGESCHLAGEN (kein Sollwert definiert)';
      elsif coalesce(v_ist, '<null>') is distinct from coalesce(v_soll, '<null>') then
        v_status := 'FEHLGESCHLAGEN (falscher Wert)';
      else
        v_status := 'BESTANDEN';
      end if;
    else
      if v_sqlstate is null then
        v_status := 'FEHLGESCHLAGEN (Aufruf lief unberechtigt durch)';
      elsif v_sqlstate is distinct from r.erw_sqlstate then
        v_status := 'FEHLGESCHLAGEN (falscher SQLSTATE ' || v_sqlstate || ', erwartet ' || r.erw_sqlstate || ')';
      elsif r.erw_meldung is not null and position(r.erw_meldung in coalesce(v_message,'')) = 0 then
        v_status := 'FEHLGESCHLAGEN (falsche Meldung: ' || coalesce(v_message,'') || ')';
      else
        v_status := 'BESTANDEN';
      end if;
    end if;

    insert into _tg_test_ergebnisse values (
      r.nr,
      r.akteur,
      r.funktion,
      case when r.erwartet = 'OK'
           then 'OK'
           else 'FEHLER ' || r.erw_sqlstate || coalesce(' / ' || r.erw_meldung, '') end,
      coalesce(v_soll, '-'),
      case when v_sqlstate is null
           then 'OK -> ' || coalesce(v_ist, '<null>')
           else v_sqlstate || ' -> ' || v_message end,
      v_status
    );
  end loop;

  execute 'reset role';
end
$$;


-- ===========================================================================
-- 3) Ergebnisse
-- ===========================================================================
select nr, akteur, funktion, erwartet, sollwert, istwert, status
from _tg_test_ergebnisse
order by nr;

select
  count(*)                                                as tests_gesamt,
  count(*) filter (where status = 'BESTANDEN')            as bestanden,
  count(*) filter (where status <> 'BESTANDEN')           as fehlgeschlagen,
  case when count(*) filter (where status <> 'BESTANDEN') = 0
       then 'ALLE TESTS BESTANDEN'
       else 'ACHTUNG: ' || count(*) filter (where status <> 'BESTANDEN') || ' Test(s) fehlgeschlagen'
  end                                                     as gesamtergebnis
from _tg_test_ergebnisse;


-- ===========================================================================
-- 4) Kontrolle der Ausfuehrungsrechte (unabhaengig von den Funktionsaufrufen)
-- ===========================================================================
select p.proname                                                   as funktion,
       has_function_privilege('anon',          p.oid, 'EXECUTE')   as anon_darf,
       has_function_privilege('authenticated', p.oid, 'EXECUTE')   as auth_darf,
       p.prosecdef                                                 as security_definer,
       coalesce(array_to_string(p.proconfig, ', '), '(kein search_path)') as konfiguration
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('rewards_account_spin_balance',
                    'rewards_wheel_summary',
                    'rewards_wheel_active_member_count')
order by p.proname;
-- ERWARTUNG: anon_darf = false, auth_darf = true, security_definer = true,
--            konfiguration enthaelt search_path=
