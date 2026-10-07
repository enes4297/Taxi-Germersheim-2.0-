-- ============================================================
-- ENTWURF - NICHT EINGESPIELT
-- ============================================================
-- Diese Datei liegt bewusst NICHT in supabase/migrations/, damit sie
-- von keinem Werkzeug versehentlich mitgezogen wird. Sie wird erst
-- dorthin verschoben, wenn sie lokal gegen echte Policies geprueft und
-- vom Geschaeftsfuehrer ausdruecklich freigegeben ist.
--
-- Zweck: Rollen und Faehigkeiten serverseitig, mit Mehrfachrollen.
-- Siehe BETRIEBSPORTAL-ROLLENMATRIX.md.
--
-- WICHTIG - der empfindliche Punkt:
--   Abschnitt 5 ersetzt private.is_admin() und
--   private.is_dispatcher_or_admin(). Beide werden in den vorhandenen
--   Migrationen 108-mal aufgerufen. Ein einziger Befehl aendert damit
--   das Verhalten von 94 Policies gleichzeitig. Der Rueckweg steht in
--   Abschnitt 7.
--
-- Bestehende Migrationen werden NICHT veraendert und keine vorhandene
-- Policy wird geloescht.
-- ============================================================


-- ------------------------------------------------------------
-- 1. Rollen
-- ------------------------------------------------------------
create table if not exists public.app_roles (
  key         text primary key,
  label       text not null,
  description text,
  created_at  timestamptz not null default now()
);

insert into public.app_roles (key, label, description) values
  ('admin',      'Administration', 'Vollstaendiger Zugriff auf alle internen Bereiche'),
  ('dispatcher', 'Disposition',    'Fahrten, Anfragen, Einsatzplanung, Fahrer- und Fahrzeugstatus'),
  ('personal',   'Personal',       'Mitarbeiter, Urlaub, Krankheit, Dokumente, Lohnabrechnungen'),
  ('accounting', 'Buchhaltung',    'Kunden, Rechnungen, Zahlungen, Finanzauswertungen'),
  ('employee',   'Mitarbeiter',    'Nur eigenes Mitarbeiterportal und eigene Daten')
on conflict (key) do nothing;


-- ------------------------------------------------------------
-- 2. Faehigkeiten je Rolle
-- ------------------------------------------------------------
create table if not exists public.role_capabilities (
  role_key   text not null references public.app_roles(key) on delete cascade,
  capability text not null,
  primary key (role_key, capability)
);

insert into public.role_capabilities (role_key, capability) values
  -- Administration: jede interne Faehigkeit. Bewusst als Daten und
  -- nicht als Sonderfall im Code - es gibt keine Stelle, an der der
  -- Name "admin" fuer sich genommen privilegierend wirkt.
  ('admin', 'operations.read'), ('admin', 'operations.write'),
  ('admin', 'fleet.read'),      ('admin', 'fleet.write'),
  ('admin', 'personnel.read'),  ('admin', 'personnel.write'),
  ('admin', 'payroll.read'),    ('admin', 'payroll.write'),
  ('admin', 'customers.read'),  ('admin', 'customers.write'),
  ('admin', 'finance.read'),    ('admin', 'finance.write'),
  ('admin', 'rewards.read'),    ('admin', 'rewards.write'),
  ('admin', 'analytics.read'),
  ('admin', 'security.read'),   ('admin', 'security.write'),
  ('admin', 'self.read'),

  ('dispatcher', 'operations.read'), ('dispatcher', 'operations.write'),
  ('dispatcher', 'fleet.read'),
  ('dispatcher', 'self.read'),

  ('personal', 'personnel.read'), ('personal', 'personnel.write'),
  ('personal', 'payroll.read'),   ('personal', 'payroll.write'),
  ('personal', 'self.read'),

  ('accounting', 'customers.read'), ('accounting', 'customers.write'),
  ('accounting', 'finance.read'),   ('accounting', 'finance.write'),
  ('accounting', 'analytics.read'),
  ('accounting', 'self.read'),

  ('employee', 'self.read')
on conflict (role_key, capability) do nothing;


-- ------------------------------------------------------------
-- 3. Zuordnung Benutzer zu Rollen - mehrere je Benutzer moeglich
-- ------------------------------------------------------------
create table if not exists public.user_roles (
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  role_key    text not null references public.app_roles(key) on delete restrict,
  granted_at  timestamptz not null default now(),
  granted_by  uuid references public.profiles(id) on delete set null,
  primary key (profile_id, role_key)
);

create index if not exists user_roles_profile_idx on public.user_roles (profile_id);

-- Uebernahme des heutigen Standes. profiles.role bleibt unveraendert
-- bestehen und wird nicht geloescht - siehe Abschnitt 6.
insert into public.user_roles (profile_id, role_key)
select p.id,
       case
         when p.role = 'admin'      then 'admin'
         when p.role = 'dispatcher' then 'dispatcher'
         else 'employee'
       end
from public.profiles as p
on conflict (profile_id, role_key) do nothing;


-- ------------------------------------------------------------
-- 4. Rechte und RLS auf den drei neuen Tabellen
-- ------------------------------------------------------------
-- anon bekommt nirgends Rechte.
revoke all on public.app_roles         from anon;
revoke all on public.role_capabilities from anon;
revoke all on public.user_roles        from anon;

-- Lesen darf authenticated; geschrieben wird ausschliesslich ueber
-- Policies, die security.write verlangen.
grant select on public.app_roles         to authenticated;
grant select on public.role_capabilities to authenticated;
grant select on public.user_roles        to authenticated;
grant insert, update, delete on public.user_roles to authenticated;

alter table public.app_roles         enable row level security;
alter table public.role_capabilities enable row level security;
alter table public.user_roles        enable row level security;


-- ------------------------------------------------------------
-- 5. Die Pruefung
-- ------------------------------------------------------------
-- Eine einzige Quelle: auth.uid() -> profiles -> user_roles ->
-- role_capabilities. Kein Rueckfall, kein Standardwert. Fehlt das
-- Profil, ist es inaktiv oder hat es keine passende Rolle, ist das
-- Ergebnis false.
create or replace function private.has_capability(wanted text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as p
    join public.user_roles as ur on ur.profile_id = p.id
    join public.role_capabilities as rc on rc.role_key = ur.role_key
    where p.auth_user_id = (select auth.uid())
      and p.active = true
      and rc.capability = wanted
  );
$$;

revoke all on function private.has_capability(text) from public;
revoke all on function private.has_capability(text) from anon;
grant execute on function private.has_capability(text) to authenticated;


-- Policies der drei neuen Tabellen.
create policy app_roles_select_internal on public.app_roles
  for select to authenticated
  using (private.has_capability('self.read'));

create policy role_capabilities_select_internal on public.role_capabilities
  for select to authenticated
  using (private.has_capability('self.read'));

-- Eigene Rollen darf jeder sehen - die Oberflaeche braucht das, um zu
-- wissen, was sie anzeigen darf.
create policy user_roles_select_self on public.user_roles
  for select to authenticated
  using (
    profile_id in (
      select p.id from public.profiles as p
      where p.auth_user_id = (select auth.uid()) and p.active = true
    )
  );

create policy user_roles_select_security on public.user_roles
  for select to authenticated
  using (private.has_capability('security.read'));

create policy user_roles_insert_security on public.user_roles
  for insert to authenticated
  with check (private.has_capability('security.write'));

create policy user_roles_update_security on public.user_roles
  for update to authenticated
  using (private.has_capability('security.write'))
  with check (private.has_capability('security.write'));

create policy user_roles_delete_security on public.user_roles
  for delete to authenticated
  using (private.has_capability('security.write'));


-- ------------------------------------------------------------
-- 6. Die beiden vorhandenen Pruefungen auf das neue Modell stellen
-- ------------------------------------------------------------
-- HIER greift die Aenderung auf alle 94 vorhandenen Policies. Der
-- Koerper wird ersetzt, die Signatur bleibt - deshalb muss keine
-- bestehende Migration angefasst und keine Policy geloescht werden.
--
-- is_admin() bedeutet ab jetzt: darf Sicherheitseinstellungen aendern.
-- Das ist genau die Bedeutung, die die vorhandenen Policies ihr geben
-- (Rollen, Konten, Stammdaten loeschen).
create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_capability('security.write');
$$;

-- is_dispatcher_or_admin() bedeutet ab jetzt: darf den Betrieb
-- bedienen. Damit erhalten dispatcher und admin unveraendert Zugriff.
create or replace function private.is_dispatcher_or_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_capability('operations.read');
$$;


-- ------------------------------------------------------------
-- 7. Rueckweg
-- ------------------------------------------------------------
-- Falls die Umstellung zurueckgenommen werden muss, stellen diese
-- beiden Befehle den Stand aus 002_rls_policies.sql wieder her. Die
-- drei neuen Tabellen koennen dabei bestehen bleiben - sie werden dann
-- von keiner Policy mehr gelesen.
--
-- create or replace function private.is_admin()
-- returns boolean language sql stable security definer set search_path = ''
-- as $$
--   select exists (
--     select 1 from public.profiles as p
--     where p.auth_user_id = (select auth.uid())
--       and p.active = true and p.role = 'admin'
--   );
-- $$;
--
-- create or replace function private.is_dispatcher_or_admin()
-- returns boolean language sql stable security definer set search_path = ''
-- as $$
--   select exists (
--     select 1 from public.profiles as p
--     where p.auth_user_id = (select auth.uid())
--       and p.active = true and p.role in ('dispatcher', 'admin')
--   );
-- $$;


-- ------------------------------------------------------------
-- 8. Was diese Datei bewusst NICHT tut
-- ------------------------------------------------------------
-- - Sie aendert public.profiles.role nicht und loescht die Spalte nicht.
-- - Sie vergibt keine neuen Rollen an bestehende Konten ausser der
--   Uebernahme des heutigen Standes in Abschnitt 3.
-- - Sie fasst storage.objects und storage.buckets nicht an.
-- - Sie legt keine Tabellen fuer Fahrten, Kunden, Rechnungen, Lohn oder
--   Analyse an. Das sind eigene Entwuerfe.
