-- 010_rewards_read_function_guards_seed.sql
--
-- Isolierte Testdaten fuer 010_rewards_read_function_guards_test.sql
--
-- ===========================================================================
-- NUR IN EINER AUSDRUECKLICH IDENTIFIZIERTEN, ISOLIERTEN TESTUMGEBUNG
-- AUSFUEHREN. Dieses Skript LEGT DATEN AN.
-- ===========================================================================
--
-- WICHTIG ZUR SCHUTZABFRAGE IN ABSCHNITT 0
--   Abschnitt 0 ist eine BEWUSSTE BESTAETIGUNG DURCH DIE AUSFUEHRENDE PERSON,
--   KEIN technischer Nachweis einer Testumgebung. Das Skript kann nicht
--   erkennen, gegen welche Datenbank es laeuft. Insbesondere ist eine leere
--   Tabelle public.customers KEIN Beleg fuer eine Testumgebung - eine
--   produktive Datenbank kann zu jedem Zeitpunkt ebenfalls leer sein.
--   Die Verantwortung fuer die richtige Verbindung liegt vollstaendig bei der
--   ausfuehrenden Person.
--
-- Erzeugt werden sechs Akteure:
--   kunde_a       Kunde, verknuepft, Rewards-Konto aktiv, Spin-Guthaben 2
--   kunde_b       Kunde, verknuepft, Rewards-Konto aktiv, Spin-Guthaben 5
--   mitarbeiter   profiles.role='employee',   active=true
--   admin         profiles.role='admin',      active=true
--   disponent     profiles.role='dispatcher', active=true
--   inaktiv       profiles.role='admin',      active=FALSE
--
--   Hinweis zum inaktiven Profil: Es traegt bewusst die Rolle 'admin'. Nur so
--   weist der Test nach, dass private.is_admin() das Feld active auswertet.
--   Ein inaktives Profil mit role='employee' wuerde ohnehin an der Rolle
--   scheitern und waere damit kein Beleg.
--
-- Aufraeumen: Abschnitt 6 am Ende dieser Datei (auskommentiert).


-- ===========================================================================
-- 0) Bestaetigung der Testumgebung
-- ===========================================================================
-- Vor diesem Skript ausfuehren:
--
--   set tg.test_env = 'ICH-BESTAETIGE-ISOLIERTE-TESTUMGEBUNG';
--
-- Bitte vorher die unten ausgegebenen Verbindungsdaten pruefen.

do $$
declare
  v_confirm text := current_setting('tg.test_env', true);
begin
  raise notice 'Datenbank: %   Benutzer: %   Server: %',
    current_database(), current_user, version();

  if coalesce(v_confirm, '') <> 'ICH-BESTAETIGE-ISOLIERTE-TESTUMGEBUNG' then
    raise exception
      'ABBRUCH: Testumgebung nicht bestaetigt. Pruefe die Verbindung (Datenbank: %) und fuehre dann aus: set tg.test_env = ''ICH-BESTAETIGE-ISOLIERTE-TESTUMGEBUNG'';',
      current_database();
  end if;
end
$$;


-- ===========================================================================
-- 1) Gemeinsame Zuordnung der Testidentitaeten
--    EINZIGE Quelle der Wahrheit. Seed UND Testskript lesen ausschliesslich
--    aus tg_test.identities. Damit koennen customers.auth_user_id,
--    profiles.auth_user_id und die im Test simulierten JWT-Subjekte nicht
--    auseinanderlaufen.
--
--    VARIANTE A (Benutzer ueber Supabase Authentication > Users angelegt):
--      Nur die sechs auth_user_id-Werte im VALUES-Block unten ersetzen und
--      danach Abschnitt 2 ueberspringen. Alles Weitere folgt automatisch.
--
--    VARIANTE B (Standard): Werte unveraendert lassen, Abschnitt 2 ausfuehren.
-- ===========================================================================
create schema if not exists tg_test;

create table if not exists tg_test.identities (
  schluessel   text primary key,
  auth_user_id uuid not null unique,
  email        text not null,
  beschreibung text not null
);

insert into tg_test.identities (schluessel, auth_user_id, email, beschreibung)
values
  ('kunde_a',     '11111111-1111-4111-8111-111111111111', 'tg-test-kunde-a@test.invalid',     'Kunde A, verknuepft'),
  ('kunde_b',     '22222222-2222-4222-8222-222222222222', 'tg-test-kunde-b@test.invalid',     'Kunde B, verknuepft'),
  ('mitarbeiter', '33333333-3333-4333-8333-333333333333', 'tg-test-mitarbeiter@test.invalid', 'employee, active'),
  ('admin',       '44444444-4444-4444-8444-444444444444', 'tg-test-admin@test.invalid',       'admin, active'),
  ('disponent',   '55555555-5555-4555-8555-555555555555', 'tg-test-disponent@test.invalid',   'dispatcher, active'),
  ('inaktiv',     '66666666-6666-4666-8666-666666666666', 'tg-test-inaktiv@test.invalid',     'admin, active=false')
on conflict (schluessel) do update
  set auth_user_id = excluded.auth_user_id,
      email        = excluded.email,
      beschreibung = excluded.beschreibung;

-- Feste Zuordnung Kunde -> Kundendatensatz (unabhaengig von den Auth-IDs)
create table if not exists tg_test.customer_map (
  schluessel  text primary key references tg_test.identities(schluessel),
  customer_id uuid not null unique,
  name        text not null,
  phone       text not null
);

insert into tg_test.customer_map (schluessel, customer_id, name, phone)
values
  ('kunde_a', 'a0000000-0000-4000-8000-0000000000a1', 'TESTDATA-010 Kunde A', '+49000000001'),
  ('kunde_b', 'b0000000-0000-4000-8000-0000000000b1', 'TESTDATA-010 Kunde B', '+49000000002')
on conflict (schluessel) do update
  set customer_id = excluded.customer_id;


-- ===========================================================================
-- 2) Auth-Benutzer  (bei VARIANTE A ueberspringen)
-- ===========================================================================
-- Achtung: Der Spaltenbestand von auth.users haengt von der Supabase-Version
-- ab. Schlaegt der Insert wegen NOT-NULL-Spalten fehl, ergaenze die leeren
-- Textspalten, z. B. confirmation_token, recovery_token, email_change,
-- email_change_token_new, email_change_token_current jeweils mit ''.
-- Passwoerter werden bewusst nicht gesetzt: Die Tests melden sich nicht an,
-- sondern simulieren den JWT-Anspruch.

insert into auth.users (
  instance_id, id, aud, role, email,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
)
select
  '00000000-0000-0000-0000-000000000000',
  i.auth_user_id,
  'authenticated',
  'authenticated',
  i.email,
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  now(),
  now()
from tg_test.identities as i
on conflict (id) do nothing;


-- ===========================================================================
-- 3) Kunden
--    auth_user_id kommt aus tg_test.identities - damit passt es zwangslaeufig
--    zu den im Testskript simulierten JWT-Subjekten.
--    Der Trigger customers_create_rewards_account (003) legt das zugehoerige
--    Rewards-Konto automatisch an; es wird NICHT manuell eingefuegt.
-- ===========================================================================
insert into public.customers (id, customer_type, name, email, phone, auth_user_id)
select m.customer_id, 'privat', m.name, i.email, m.phone, i.auth_user_id
from tg_test.customer_map as m
join tg_test.identities  as i on i.schluessel = m.schluessel
on conflict (id) do update
  set auth_user_id = excluded.auth_user_id,
      email        = excluded.email,
      name         = excluded.name;


-- ===========================================================================
-- 4) Mitarbeiterstammsatz und Verwaltungsprofile
--    auth_user_id ebenfalls aus tg_test.identities.
-- ===========================================================================
insert into public.employees (id, first_name, last_name, email, employment_type, status, active, portal_active)
select 'e0000000-0000-4000-8000-0000000000e1', 'TESTDATA-010', 'Mitarbeiter', i.email, 'vollzeit', 'active', true, true
from tg_test.identities as i
where i.schluessel = 'mitarbeiter'
on conflict (id) do nothing;

insert into public.profiles (id, auth_user_id, employee_id, display_name, role, active)
select v.pid, i.auth_user_id, v.employee_id, v.display_name, v.role, v.active
from (values
  ('c0000000-0000-4000-8000-0000000000c1'::uuid, 'mitarbeiter', 'e0000000-0000-4000-8000-0000000000e1'::uuid, 'TESTDATA-010 Mitarbeiter', 'employee',   true),
  ('c0000000-0000-4000-8000-0000000000c2'::uuid, 'admin',       null::uuid,                                    'TESTDATA-010 Admin',      'admin',      true),
  ('c0000000-0000-4000-8000-0000000000c3'::uuid, 'disponent',   null::uuid,                                    'TESTDATA-010 Disponent',  'dispatcher', true),
  ('c0000000-0000-4000-8000-0000000000c4'::uuid, 'inaktiv',     null::uuid,                                    'TESTDATA-010 Inaktiv',    'admin',      false)
) as v(pid, schluessel, employee_id, display_name, role, active)
join tg_test.identities as i on i.schluessel = v.schluessel
on conflict (id) do update
  set auth_user_id = excluded.auth_user_id,
      role         = excluded.role,
      active       = excluded.active;


-- ===========================================================================
-- 5) Spin-Guthaben und Gluecksrad-Ergebnisse
--    Alle Testdatensaetze tragen reason = 'TESTDATA-010' bzw.
--    spin_source = 'TESTDATA-010' und sind daran eindeutig erkennbar.
--
--    Sollstand nach diesem Abschnitt:
--      Kunde A: +3 -1 = 2   (der positive Posten ist Voraussetzung fuer Test 22)
--      Kunde B: +5     = 5
-- ===========================================================================
insert into public.rewards_spin_transactions
  (rewards_account_id, customer_id, amount, transaction_type, reason)
select ra.id, ra.customer_id, v.amount, v.ttype, 'TESTDATA-010'
from tg_test.customer_map as m
join public.rewards_accounts as ra on ra.customer_id = m.customer_id
join (values
  ('kunde_a',  3, 'manual_grant'),
  ('kunde_a', -1, 'wheel_spin'),
  ('kunde_b',  5, 'manual_grant')
) as v(schluessel, amount, ttype) on v.schluessel = m.schluessel
where not exists (
  select 1 from public.rewards_spin_transactions as st
  where st.rewards_account_id = ra.id and st.reason = 'TESTDATA-010'
);

insert into public.rewards_wheel_spins
  (rewards_account_id, customer_id, prize_type, points_awarded, yumaks_box_won, spin_source)
select ra.id, ra.customer_id, v.prize, v.pts, v.box, 'TESTDATA-010'
from tg_test.customer_map as m
join public.rewards_accounts as ra on ra.customer_id = m.customer_id
join (values
  ('kunde_a', 'points_10',   10, false),
  ('kunde_b', 'yumaks_box', null,  true)
) as v(schluessel, prize, pts, box) on v.schluessel = m.schluessel
where not exists (
  select 1 from public.rewards_wheel_spins as ws
  where ws.rewards_account_id = ra.id and ws.spin_source = 'TESTDATA-010'
);


-- ===========================================================================
-- 6) Pflichtkontrolle: harte Pruefung der Sollwerte
--    Bricht ab, wenn die Testdaten nicht exakt stimmen. Ohne diese Zusicherung
--    sind die Berechtigungstests nicht aussagekraeftig.
-- ===========================================================================
do $$
declare
  v_a integer;
  v_b integer;
  v_a_pos integer;
  v_a_status text;
  v_fehlend integer;
begin
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

  select count(*) into v_fehlend
  from tg_test.identities as i
  where not exists (select 1 from auth.users as u where u.id = i.auth_user_id);

  if v_fehlend > 0 then
    raise exception 'ABBRUCH: % Testidentitaet(en) haben keinen passenden auth.users-Datensatz.', v_fehlend;
  end if;
  if v_a <> 2 then
    raise exception 'ABBRUCH: Spin-Guthaben Kunde A ist %, erwartet 2.', v_a;
  end if;
  if v_b <> 5 then
    raise exception 'ABBRUCH: Spin-Guthaben Kunde B ist %, erwartet 5.', v_b;
  end if;
  if v_a_pos < 1 then
    raise exception 'ABBRUCH: Kunde A hat keinen positiven Spin-Posten. Test 22 wuerde zu frueh abbrechen.';
  end if;
  if v_a_status is distinct from 'active' then
    raise exception 'ABBRUCH: Rewards-Konto Kunde A hat Status %, erwartet active.', v_a_status;
  end if;

  raise notice 'Seed in Ordnung: Guthaben A=% (positive Posten %), B=%, Kontostatus A=%.',
    v_a, v_a_pos, v_b, v_a_status;
end
$$;

-- Uebersicht zur Sichtkontrolle
select
  m.schluessel,
  i.auth_user_id,
  ra.id                                                   as rewards_konto_id,
  ra.status                                               as kontostatus,
  (select coalesce(sum(st.amount), 0)
     from public.rewards_spin_transactions as st
    where st.rewards_account_id = ra.id)                  as spin_guthaben
from tg_test.customer_map as m
join tg_test.identities as i        on i.schluessel  = m.schluessel
join public.customers   as c        on c.id          = m.customer_id
join public.rewards_accounts as ra  on ra.customer_id = c.id
order by m.schluessel;

select p.display_name, p.role, p.active, p.auth_user_id
from public.profiles as p
join tg_test.identities as i on i.auth_user_id = p.auth_user_id
order by p.role, p.active;


-- ===========================================================================
-- 7) AUFRAEUMEN (bei Bedarf entkommentieren)
-- ===========================================================================
-- delete from public.rewards_wheel_spins       where spin_source = 'TESTDATA-010';
-- delete from public.rewards_spin_transactions where reason      = 'TESTDATA-010';
-- delete from public.rewards_accounts
--   where customer_id in (select customer_id from tg_test.customer_map);
-- delete from public.customers
--   where id in (select customer_id from tg_test.customer_map);
-- delete from public.profiles
--   where auth_user_id in (select auth_user_id from tg_test.identities);
-- delete from public.employees where id = 'e0000000-0000-4000-8000-0000000000e1';
-- delete from auth.users
--   where id in (select auth_user_id from tg_test.identities);
-- drop schema tg_test cascade;
