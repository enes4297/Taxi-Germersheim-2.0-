-- 010_rewards_read_function_guards_seed.sql
--
-- Isolierte Testdaten fuer 010_rewards_read_function_guards_test.sql
--
-- !!! NUR IN EINER TESTUMGEBUNG AUSFUEHREN !!!
--   Dieses Skript LEGT DATEN AN. Es darf nicht gegen die produktive Datenbank
--   laufen. Es werden ausschliesslich synthetische Konten mit erkennbaren
--   Test-UUIDs und .invalid-Adressen erzeugt. Es werden keine produktiven
--   Kunden- oder Mitarbeiterdaten gelesen, kopiert oder referenziert.
--
-- Sicherheitsabfrage
--   Abschnitt 0 bricht ab, wenn in public.customers bereits Datensaetze
--   existieren, die nicht zu diesem Testbestand gehoeren. Das verhindert ein
--   versehentliches Ausfuehren gegen Produktion. Bewusst uebersteuern:
--   set tg.allow_seed = 'yes';  vor dem Skript ausfuehren.
--
-- Erzeugt werden sechs Akteure:
--   Kunde A          verknuepft, Rewards-Konto aktiv, Spin-Guthaben vorhanden
--   Kunde B          verknuepft, Rewards-Konto aktiv, Spin-Guthaben vorhanden
--   Mitarbeiter      profiles.role='employee', active=true
--   Admin            profiles.role='admin', active=true
--   Disponent        profiles.role='dispatcher', active=true
--   Inaktiv          profiles.role='admin', active=FALSE
--
--   Hinweis zum inaktiven Profil: Es traegt bewusst die Rolle 'admin'. Nur so
--   weist der Test nach, dass private.is_admin() das Feld active auswertet.
--   Ein inaktives Profil mit role='employee' wuerde ohnehin an der Rolle
--   scheitern und waere damit kein Beleg.
--
-- Aufraeumen: Abschnitt 5 am Ende dieser Datei (auskommentiert).

-- ---------------------------------------------------------------------------
-- 0) Schutz gegen versehentliche Ausfuehrung gegen Produktion
-- ---------------------------------------------------------------------------
do $$
declare
  v_fremde bigint;
  v_override text := current_setting('tg.allow_seed', true);
begin
  select count(*) into v_fremde
  from public.customers
  where id not in (
    'a0000000-0000-4000-8000-0000000000a1'::uuid,
    'b0000000-0000-4000-8000-0000000000b1'::uuid
  );

  if v_fremde > 0 and coalesce(v_override, '') <> 'yes' then
    raise exception
      'ABBRUCH: public.customers enthaelt % fremde Datensaetze. Sieht nach Produktion aus. Wenn das wirklich eine Testumgebung ist: set tg.allow_seed = ''yes'';',
      v_fremde;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 1) Auth-Benutzer
-- ---------------------------------------------------------------------------
-- VARIANTE A (empfohlen):
--   Die sechs Benutzer im Testprojekt ueber Authentication > Users anlegen,
--   danach diesen Abschnitt 1 ueberspringen und im Testskript die echten
--   User-IDs eintragen.
--
-- VARIANTE B (unten): direkter Insert in auth.users.
--   Achtung: Der Spaltenbestand von auth.users haengt von der Supabase-Version
--   ab. Schlaegt der Insert wegen NOT-NULL-Spalten fehl, ergaenze die leeren
--   Textspalten, z. B.:
--     confirmation_token, recovery_token, email_change, email_change_token_new,
--     email_change_token_current  jeweils mit ''
--   Passwoerter werden bewusst nicht gesetzt: Die Tests melden sich nicht an,
--   sondern simulieren den JWT-Anspruch.

insert into auth.users (
  instance_id, id, aud, role, email,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
)
values
  ('00000000-0000-0000-0000-000000000000','11111111-1111-4111-8111-111111111111','authenticated','authenticated','tg-test-kunde-a@test.invalid',      now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000','22222222-2222-4222-8222-222222222222','authenticated','authenticated','tg-test-kunde-b@test.invalid',      now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000','33333333-3333-4333-8333-333333333333','authenticated','authenticated','tg-test-mitarbeiter@test.invalid',  now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000','44444444-4444-4444-8444-444444444444','authenticated','authenticated','tg-test-admin@test.invalid',        now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000','55555555-5555-4555-8555-555555555555','authenticated','authenticated','tg-test-disponent@test.invalid',    now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000','66666666-6666-4666-8666-666666666666','authenticated','authenticated','tg-test-inaktiv@test.invalid',      now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb, now(), now())
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 2) Kunden
--    Der Trigger customers_create_rewards_account (003) legt das zugehoerige
--    Rewards-Konto automatisch an. Es wird deshalb NICHT manuell eingefuegt.
-- ---------------------------------------------------------------------------
insert into public.customers (id, customer_type, name, email, phone, auth_user_id)
values
  ('a0000000-0000-4000-8000-0000000000a1', 'privat', 'TESTDATA-010 Kunde A', 'tg-test-kunde-a@test.invalid', '+49000000001', '11111111-1111-4111-8111-111111111111'),
  ('b0000000-0000-4000-8000-0000000000b1', 'privat', 'TESTDATA-010 Kunde B', 'tg-test-kunde-b@test.invalid', '+49000000002', '22222222-2222-4222-8222-222222222222')
on conflict (id) do update
  set auth_user_id = excluded.auth_user_id,
      email        = excluded.email;

-- ---------------------------------------------------------------------------
-- 3) Mitarbeiter- und Verwaltungsprofile
-- ---------------------------------------------------------------------------
insert into public.employees (id, first_name, last_name, email, employment_type, status, active, portal_active)
values ('e0000000-0000-4000-8000-0000000000e1', 'TESTDATA-010', 'Mitarbeiter', 'tg-test-mitarbeiter@test.invalid', 'vollzeit', 'active', true, true)
on conflict (id) do nothing;

insert into public.profiles (id, auth_user_id, employee_id, display_name, role, active)
values
  ('c0000000-0000-4000-8000-0000000000c1','33333333-3333-4333-8333-333333333333','e0000000-0000-4000-8000-0000000000e1','TESTDATA-010 Mitarbeiter','employee',   true),
  ('c0000000-0000-4000-8000-0000000000c2','44444444-4444-4444-8444-444444444444', null,                                  'TESTDATA-010 Admin',      'admin',      true),
  ('c0000000-0000-4000-8000-0000000000c3','55555555-5555-4555-8555-555555555555', null,                                  'TESTDATA-010 Disponent',  'dispatcher', true),
  ('c0000000-0000-4000-8000-0000000000c4','66666666-6666-4666-8666-666666666666', null,                                  'TESTDATA-010 Inaktiv',    'admin',      false)
on conflict (id) do update
  set auth_user_id = excluded.auth_user_id,
      role         = excluded.role,
      active       = excluded.active;

-- ---------------------------------------------------------------------------
-- 4) Spin-Guthaben und Gluecksrad-Ergebnisse
--    Alle Testdatensaetze tragen reason = 'TESTDATA-010' bzw.
--    spin_source = 'TESTDATA-010' und sind daran eindeutig erkennbar.
--
--    Erwartete Spin-Guthaben nach diesem Seed:
--      Kunde A: +3 -1 = 2   (positiver Posten noetig fuer Test 22)
--      Kunde B: +5     = 5
-- ---------------------------------------------------------------------------
insert into public.rewards_spin_transactions
  (rewards_account_id, customer_id, amount, transaction_type, reason)
select ra.id, ra.customer_id, v.amount, v.ttype, 'TESTDATA-010'
from public.rewards_accounts as ra
join (values
  ('a0000000-0000-4000-8000-0000000000a1'::uuid,  3, 'manual_grant'),
  ('a0000000-0000-4000-8000-0000000000a1'::uuid, -1, 'wheel_spin'),
  ('b0000000-0000-4000-8000-0000000000b1'::uuid,  5, 'manual_grant')
) as v(customer_id, amount, ttype) on v.customer_id = ra.customer_id
where not exists (
  select 1 from public.rewards_spin_transactions as st
  where st.rewards_account_id = ra.id and st.reason = 'TESTDATA-010'
);

insert into public.rewards_wheel_spins
  (rewards_account_id, customer_id, prize_type, points_awarded, yumaks_box_won, spin_source)
select ra.id, ra.customer_id, v.prize, v.pts, v.box, 'TESTDATA-010'
from public.rewards_accounts as ra
join (values
  ('a0000000-0000-4000-8000-0000000000a1'::uuid, 'points_10',   10, false),
  ('b0000000-0000-4000-8000-0000000000b1'::uuid, 'yumaks_box', null,  true)
) as v(customer_id, prize, pts, box) on v.customer_id = ra.customer_id
where not exists (
  select 1 from public.rewards_wheel_spins as ws
  where ws.rewards_account_id = ra.id and ws.spin_source = 'TESTDATA-010'
);

-- ---------------------------------------------------------------------------
-- Kontrolle: Stimmen die Testdaten?
-- ---------------------------------------------------------------------------
select
  c.name                                                as akteur,
  ra.id                                                 as rewards_konto_id,
  ra.status                                             as kontostatus,
  (select coalesce(sum(st.amount), 0)
     from public.rewards_spin_transactions as st
    where st.rewards_account_id = ra.id)                as spin_guthaben,
  (select count(*)
     from public.rewards_spin_transactions as st
    where st.rewards_account_id = ra.id and st.amount > 0) as positive_posten
from public.customers as c
join public.rewards_accounts as ra on ra.customer_id = c.id
where c.id in ('a0000000-0000-4000-8000-0000000000a1','b0000000-0000-4000-8000-0000000000b1')
order by c.name;
-- ERWARTUNG: Kunde A -> Guthaben 2, positive_posten >= 1, kontostatus 'active'
--            Kunde B -> Guthaben 5, positive_posten >= 1, kontostatus 'active'
-- Kunde A MUSS mindestens einen positiven Posten und ein aktives Konto haben,
-- sonst bricht spin_my_rewards_wheel() in Test 22 zu frueh ab.

select auth_user_id, role, active, display_name
from public.profiles
where display_name like 'TESTDATA-010%'
order by role, active;

-- ---------------------------------------------------------------------------
-- 5) AUFRAEUMEN (bei Bedarf entkommentieren)
-- ---------------------------------------------------------------------------
-- delete from public.rewards_wheel_spins        where spin_source = 'TESTDATA-010';
-- delete from public.rewards_spin_transactions  where reason      = 'TESTDATA-010';
-- delete from public.rewards_accounts
--   where customer_id in ('a0000000-0000-4000-8000-0000000000a1','b0000000-0000-4000-8000-0000000000b1');
-- delete from public.customers
--   where id in ('a0000000-0000-4000-8000-0000000000a1','b0000000-0000-4000-8000-0000000000b1');
-- delete from public.profiles where display_name like 'TESTDATA-010%';
-- delete from public.employees where id = 'e0000000-0000-4000-8000-0000000000e1';
-- delete from auth.users where email like 'tg-test-%@test.invalid';
