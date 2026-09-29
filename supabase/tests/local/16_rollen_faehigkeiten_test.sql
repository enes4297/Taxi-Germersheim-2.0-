-- ============================================================
-- Test zum Entwurf 012_rollen_und_faehigkeiten.sql
-- ============================================================
-- Prueft das Faehigkeitsmodell gegen die ECHTEN Policies aus den
-- Migrationen 001-011 - nicht gegen eine Attrappe.
--
-- NUR LOKAL. Alle Kennungen sind erfunden und beginnen mit 'TEST'.
-- Es werden keine produktiven Konten verwendet.
--
-- Geprueft werden zwei Dinge:
--   A) has_capability() liefert fuer jede Rolle genau die Matrix aus
--      BETRIEBSPORTAL-ROLLENMATRIX.md.
--   B) Nach dem Ersetzen der beiden Pruefunktionen verhalten sich die
--      94 vorhandenen Policies weiterhin richtig - insbesondere sehen
--      dispatcher und admin unveraendert, was sie vorher sahen, und
--      niemand sonst sieht mehr.
-- ============================================================

\set ON_ERROR_STOP on

-- ------------------------------------------------------------
-- Testkonten. Bewusst erfundene UUIDs mit sprechendem Anfang.
-- ------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-4000-a000-000000000001', 'test-admin@example.invalid'),
  ('00000000-0000-4000-a000-000000000002', 'test-dispatcher@example.invalid'),
  ('00000000-0000-4000-a000-000000000003', 'test-personal@example.invalid'),
  ('00000000-0000-4000-a000-000000000004', 'test-accounting@example.invalid'),
  ('00000000-0000-4000-a000-000000000005', 'test-employee@example.invalid'),
  ('00000000-0000-4000-a000-000000000006', 'test-inaktiv@example.invalid'),
  ('00000000-0000-4000-a000-000000000007', 'test-ohnerolle@example.invalid'),
  ('00000000-0000-4000-a000-000000000008', 'test-mehrfach@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, auth_user_id, display_name, role, active) values
  ('10000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000001', 'TESTADMIN',      'admin',      true),
  ('10000000-0000-4000-a000-000000000002', '00000000-0000-4000-a000-000000000002', 'TESTDISPATCHER', 'dispatcher', true),
  ('10000000-0000-4000-a000-000000000003', '00000000-0000-4000-a000-000000000003', 'TESTPERSONAL',   'employee',   true),
  ('10000000-0000-4000-a000-000000000004', '00000000-0000-4000-a000-000000000004', 'TESTBUCHHALT',   'employee',   true),
  ('10000000-0000-4000-a000-000000000005', '00000000-0000-4000-a000-000000000005', 'TESTMITARBEIT',  'employee',   true),
  ('10000000-0000-4000-a000-000000000006', '00000000-0000-4000-a000-000000000006', 'TESTINAKTIV',    'admin',      false),
  ('10000000-0000-4000-a000-000000000007', '00000000-0000-4000-a000-000000000007', 'TESTOHNEROLLE',  'employee',   true),
  ('10000000-0000-4000-a000-000000000008', '00000000-0000-4000-a000-000000000008', 'TESTMEHRFACH',   'employee',   true)
on conflict (id) do nothing;


-- ------------------------------------------------------------
-- Rollen der Testkonten
-- ------------------------------------------------------------
-- Ausdruecklich vollstaendig gesetzt und nicht auf die Uebernahme im
-- Entwurf gestuetzt: Der Entwurf wird vom Testlaeufer VOR diesen
-- Profilen eingespielt, seine Uebernahme aus profiles.role kann sie
-- also gar nicht erfasst haben. Beim ersten Lauf hat genau das den
-- Test fehlschlagen lassen - ein Fehler im Test, nicht im Modell.
delete from public.user_roles where profile_id in (
  '10000000-0000-4000-a000-000000000001',
  '10000000-0000-4000-a000-000000000002',
  '10000000-0000-4000-a000-000000000003',
  '10000000-0000-4000-a000-000000000004',
  '10000000-0000-4000-a000-000000000005',
  '10000000-0000-4000-a000-000000000006',
  '10000000-0000-4000-a000-000000000007',
  '10000000-0000-4000-a000-000000000008'
);

insert into public.user_roles (profile_id, role_key) values
  ('10000000-0000-4000-a000-000000000001', 'admin'),
  ('10000000-0000-4000-a000-000000000002', 'dispatcher'),
  ('10000000-0000-4000-a000-000000000003', 'personal'),
  ('10000000-0000-4000-a000-000000000004', 'accounting'),
  ('10000000-0000-4000-a000-000000000005', 'employee'),
  -- 006 hat die Rolle admin, ist aber inaktiv - muss trotzdem nichts duerfen.
  ('10000000-0000-4000-a000-000000000006', 'admin'),
  -- 007 bekommt bewusst KEINE Rolle.
  ('10000000-0000-4000-a000-000000000008', 'dispatcher'),
  ('10000000-0000-4000-a000-000000000008', 'accounting')
on conflict do nothing;


-- ------------------------------------------------------------
-- Hilfsmittel: als bestimmter Benutzer pruefen
-- ------------------------------------------------------------
create or replace function pg_temp.als(benutzer uuid, faehigkeit text)
returns boolean
language plpgsql
as $$
declare
  ergebnis boolean;
begin
  perform set_config('request.jwt.claim.sub', benutzer::text, true);
  select private.has_capability(faehigkeit) into ergebnis;
  return ergebnis;
end;
$$;

create or replace function pg_temp.pruefe(bezeichnung text, ist boolean, soll boolean)
returns void
language plpgsql
as $$
begin
  if ist is not distinct from soll then
    raise notice 'OK    %', bezeichnung;
  else
    raise exception 'FEHL  % (erwartet %, war %)', bezeichnung, soll, ist;
  end if;
end;
$$;


-- ============================================================
-- A) Die Rollenmatrix
-- ============================================================
do $$
declare
  ADMIN      uuid := '00000000-0000-4000-a000-000000000001';
  DISPO      uuid := '00000000-0000-4000-a000-000000000002';
  PERSONAL   uuid := '00000000-0000-4000-a000-000000000003';
  BUCHHALT   uuid := '00000000-0000-4000-a000-000000000004';
  MITARBEIT  uuid := '00000000-0000-4000-a000-000000000005';
  INAKTIV    uuid := '00000000-0000-4000-a000-000000000006';
  OHNEROLLE  uuid := '00000000-0000-4000-a000-000000000007';
  MEHRFACH   uuid := '00000000-0000-4000-a000-000000000008';
begin
  raise notice '--- Administration ---';
  perform pg_temp.pruefe('admin darf den Betrieb bedienen',     pg_temp.als(ADMIN, 'operations.write'), true);
  perform pg_temp.pruefe('admin darf Lohn bereitstellen',       pg_temp.als(ADMIN, 'payroll.write'),    true);
  perform pg_temp.pruefe('admin darf Sicherheit aendern',       pg_temp.als(ADMIN, 'security.write'),   true);
  perform pg_temp.pruefe('admin darf Rewards verwalten',        pg_temp.als(ADMIN, 'rewards.write'),    true);

  raise notice '--- Disposition ---';
  perform pg_temp.pruefe('dispatcher darf den Betrieb bedienen', pg_temp.als(DISPO, 'operations.write'), true);
  perform pg_temp.pruefe('dispatcher darf Fahrzeuge sehen',      pg_temp.als(DISPO, 'fleet.read'),       true);
  perform pg_temp.pruefe('dispatcher darf KEINE Fahrzeugstammdaten aendern', pg_temp.als(DISPO, 'fleet.write'),     false);
  perform pg_temp.pruefe('dispatcher sieht KEINE Personalakten',  pg_temp.als(DISPO, 'personnel.read'),   false);
  perform pg_temp.pruefe('dispatcher sieht KEINE Lohnabrechnung', pg_temp.als(DISPO, 'payroll.read'),     false);
  perform pg_temp.pruefe('dispatcher aendert KEINE Sicherheit',   pg_temp.als(DISPO, 'security.write'),   false);
  perform pg_temp.pruefe('dispatcher verwaltet KEINE Rewards',    pg_temp.als(DISPO, 'rewards.write'),    false);
  perform pg_temp.pruefe('dispatcher sieht KEINE Rechnungen',     pg_temp.als(DISPO, 'finance.read'),     false);

  raise notice '--- Personal ---';
  perform pg_temp.pruefe('personal sieht Personalakten',        pg_temp.als(PERSONAL, 'personnel.read'),  true);
  perform pg_temp.pruefe('personal darf Lohn bereitstellen',    pg_temp.als(PERSONAL, 'payroll.write'),   true);
  perform pg_temp.pruefe('personal bedient NICHT den Betrieb',  pg_temp.als(PERSONAL, 'operations.write'), false);
  perform pg_temp.pruefe('personal sieht KEINE Rechnungen',     pg_temp.als(PERSONAL, 'finance.read'),    false);
  perform pg_temp.pruefe('personal aendert KEINE Sicherheit',   pg_temp.als(PERSONAL, 'security.write'),  false);

  raise notice '--- Buchhaltung ---';
  perform pg_temp.pruefe('buchhaltung sieht Rechnungen',        pg_temp.als(BUCHHALT, 'finance.read'),    true);
  perform pg_temp.pruefe('buchhaltung sieht Kunden',            pg_temp.als(BUCHHALT, 'customers.read'),  true);
  perform pg_temp.pruefe('buchhaltung sieht Auswertung',        pg_temp.als(BUCHHALT, 'analytics.read'),  true);
  perform pg_temp.pruefe('buchhaltung sieht KEINE Personalakten', pg_temp.als(BUCHHALT, 'personnel.read'), false);
  perform pg_temp.pruefe('buchhaltung sieht KEINEN Lohn',       pg_temp.als(BUCHHALT, 'payroll.read'),    false);
  perform pg_temp.pruefe('buchhaltung bedient NICHT den Betrieb', pg_temp.als(BUCHHALT, 'operations.write'), false);

  raise notice '--- Mitarbeiter ---';
  perform pg_temp.pruefe('mitarbeiter sieht eigenes',           pg_temp.als(MITARBEIT, 'self.read'),      true);
  perform pg_temp.pruefe('mitarbeiter bedient NICHT den Betrieb', pg_temp.als(MITARBEIT, 'operations.read'), false);
  perform pg_temp.pruefe('mitarbeiter sieht KEINE Personalakten', pg_temp.als(MITARBEIT, 'personnel.read'), false);
  perform pg_temp.pruefe('mitarbeiter sieht KEINEN fremden Lohn', pg_temp.als(MITARBEIT, 'payroll.read'),  false);

  raise notice '--- Grenzfaelle: kein Rueckfall auf eine privilegierte Rolle ---';
  perform pg_temp.pruefe('inaktives Profil hat NICHTS',         pg_temp.als(INAKTIV, 'security.write'),   false);
  perform pg_temp.pruefe('inaktives Profil auch nicht self',    pg_temp.als(INAKTIV, 'self.read'),        false);
  perform pg_temp.pruefe('Profil ohne Rolle hat NICHTS',        pg_temp.als(OHNEROLLE, 'self.read'),      false);
  perform pg_temp.pruefe('Profil ohne Rolle erst recht nicht security', pg_temp.als(OHNEROLLE, 'security.write'), false);
  perform pg_temp.pruefe('unbekannte Faehigkeit ist nie wahr',  pg_temp.als(ADMIN, 'gibtesnicht.write'),  false);

  raise notice '--- Mehrfachrolle ---';
  perform pg_temp.pruefe('mehrfach bedient den Betrieb',        pg_temp.als(MEHRFACH, 'operations.write'), true);
  perform pg_temp.pruefe('mehrfach sieht Rechnungen',           pg_temp.als(MEHRFACH, 'finance.read'),    true);
  perform pg_temp.pruefe('mehrfach sieht KEINE Personalakten',  pg_temp.als(MEHRFACH, 'personnel.read'),  false);
  perform pg_temp.pruefe('mehrfach aendert KEINE Sicherheit',   pg_temp.als(MEHRFACH, 'security.write'),  false);
end;
$$;


-- ============================================================
-- B) Die 94 vorhandenen Policies nach dem Ersetzen
-- ============================================================
-- Die Policies rufen private.is_admin() und
-- private.is_dispatcher_or_admin() auf. Geprueft wird, dass diese
-- beiden Funktionen nach der Umstellung dasselbe bedeuten wie vorher.
create or replace function pg_temp.istAdmin(benutzer uuid)
returns boolean language plpgsql as $$
declare e boolean;
begin
  perform set_config('request.jwt.claim.sub', benutzer::text, true);
  select private.is_admin() into e; return e;
end; $$;

create or replace function pg_temp.istDispo(benutzer uuid)
returns boolean language plpgsql as $$
declare e boolean;
begin
  perform set_config('request.jwt.claim.sub', benutzer::text, true);
  select private.is_dispatcher_or_admin() into e; return e;
end; $$;

do $$
declare
  ADMIN      uuid := '00000000-0000-4000-a000-000000000001';
  DISPO      uuid := '00000000-0000-4000-a000-000000000002';
  PERSONAL   uuid := '00000000-0000-4000-a000-000000000003';
  MITARBEIT  uuid := '00000000-0000-4000-a000-000000000005';
  INAKTIV    uuid := '00000000-0000-4000-a000-000000000006';
begin
  raise notice '--- Wirkung auf die vorhandenen Policies ---';
  perform pg_temp.pruefe('is_admin: admin ja',              pg_temp.istAdmin(ADMIN),     true);
  perform pg_temp.pruefe('is_admin: dispatcher nein',       pg_temp.istAdmin(DISPO),     false);
  perform pg_temp.pruefe('is_admin: personal nein',         pg_temp.istAdmin(PERSONAL),  false);
  perform pg_temp.pruefe('is_admin: mitarbeiter nein',      pg_temp.istAdmin(MITARBEIT), false);
  perform pg_temp.pruefe('is_admin: inaktiv nein',          pg_temp.istAdmin(INAKTIV),   false);

  perform pg_temp.pruefe('is_dispatcher_or_admin: admin ja',        pg_temp.istDispo(ADMIN),     true);
  perform pg_temp.pruefe('is_dispatcher_or_admin: dispatcher ja',   pg_temp.istDispo(DISPO),     true);
  perform pg_temp.pruefe('is_dispatcher_or_admin: personal nein',   pg_temp.istDispo(PERSONAL),  false);
  perform pg_temp.pruefe('is_dispatcher_or_admin: mitarbeiter nein', pg_temp.istDispo(MITARBEIT), false);
  perform pg_temp.pruefe('is_dispatcher_or_admin: inaktiv nein',    pg_temp.istDispo(INAKTIV),   false);
end;
$$;

-- ------------------------------------------------------------
-- C) anon bekommt nirgends Rechte auf den neuen Tabellen
-- ------------------------------------------------------------
do $$
declare n int;
begin
  select count(*) into n
  from information_schema.role_table_grants
  where grantee = 'anon'
    and table_schema = 'public'
    and table_name in ('app_roles', 'role_capabilities', 'user_roles');
  perform pg_temp.pruefe('anon hat keine Rechte auf den neuen Tabellen', n = 0, true);

  select count(*) into n
  from pg_tables
  where schemaname = 'public'
    and tablename in ('app_roles', 'role_capabilities', 'user_roles')
    and rowsecurity = true;
  perform pg_temp.pruefe('RLS ist auf allen drei Tabellen aktiv', n = 3, true);
end;
$$;

select 'Alle Pruefungen des Rollenentwurfs bestanden.' as ergebnis;
