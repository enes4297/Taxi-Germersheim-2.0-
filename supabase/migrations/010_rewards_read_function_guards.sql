-- 010_rewards_read_function_guards.sql
--
-- Zweck
--   Drei lesende Rewards-Funktionen aus 007_rewards_wheel.sql sind SECURITY DEFINER
--   und fuer jede authenticated-Rolle ausfuehrbar, prueften bisher aber weder
--   Eigentuemerschaft noch Rolle. Diese Migration ergaenzt ausschliesslich die
--   Autorisierungspruefung.
--
-- Regeln laut Vorgabe
--   public.rewards_account_spin_balance(uuid)
--     -> eigenes Kundenkonto ODER aktiver Admin/Disponent
--   public.rewards_wheel_summary(date)
--     -> ausschliesslich aktiver Admin/Disponent
--   public.rewards_wheel_active_member_count(date)
--     -> ausschliesslich aktiver Admin/Disponent
--
-- Ausdruecklich NICHT Gegenstand dieser Migration
--   - Keine Aenderung an Signaturen, Rueckgabetypen oder Parameter-Defaults.
--   - Keine Aenderung der fachlichen Rechenlogik (identische SELECTs wie in 007).
--   - Keine Aenderung an Rewards-Spielregeln.
--   - Keine Freischaltung des Kunden-Gluecksrads; spin_my_rewards_wheel() bleibt
--     unveraendert und endet weiterhin mit CUSTOMER_WHEEL_BLOCKED_BY_BACKEND.
--   - Keine bestehende Migration wird umgeschrieben.
--   - Keine Policy-, Tabellen- oder Grant-Aenderung ausser den unten wiederholten,
--     bereits in 007 gesetzten revoke/grant-Anweisungen (idempotent).
--
-- Hinweis zu den Grants
--   Die Rollen "Admin" und "Disponent" sind keine Datenbankrollen, sondern stehen
--   in public.profiles.role. Der Datenbank-GRANT muss deshalb weiterhin auf
--   "authenticated" lauten; die eigentliche Rechtepruefung erfolgt in der Funktion.
--
-- Fehlerbild
--   Verstoesse melden SQLSTATE 42501 (insufficient_privilege) mit dem Text
--   'Not authorized' - identisch zum bereits etablierten Muster aus
--   003/004/005/006/007/008.

-- ---------------------------------------------------------------------------
-- 1) Spin-Guthaben eines Rewards-Kontos
--    Signatur unveraendert: (p_rewards_account_id uuid) returns integer
-- ---------------------------------------------------------------------------
create or replace function public.rewards_account_spin_balance(p_rewards_account_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_owner boolean;
begin
  if p_rewards_account_id is null then
    raise exception 'Rewards account id is required' using errcode = '22023';
  end if;

  -- Eigentuemerpruefung: gehoert das Konto dem aufrufenden Kunden?
  -- Ausdruck bewusst identisch zur Policy rewards_accounts_customer_self_select (009).
  select exists (
    select 1
    from public.rewards_accounts as ra
    join public.customers as c
      on c.id = ra.customer_id
    where ra.id = p_rewards_account_id
      and c.auth_user_id = auth.uid()
  )
  into v_is_owner;

  if not v_is_owner and not private.is_dispatcher_or_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  -- Rechenlogik unveraendert gegenueber 007_rewards_wheel.sql
  return (
    select coalesce(sum(st.amount), 0)::integer
    from public.rewards_spin_transactions as st
    where st.rewards_account_id = p_rewards_account_id
  );
end;
$$;

comment on function public.rewards_account_spin_balance(uuid) is
  'Spin-Guthaben eines Rewards-Kontos. Zugriff: eigenes Kundenkonto oder aktiver Admin/Disponent (010).';

revoke all on function public.rewards_account_spin_balance(uuid) from public;
revoke all on function public.rewards_account_spin_balance(uuid) from anon;
grant execute on function public.rewards_account_spin_balance(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 2) Betriebsweite Gluecksrad-Tagesstatistik
--    Signatur unveraendert: (p_day date default current_date)
--    returns table (spins_total, points_wins_total, vouchers_total, yumaks_box_total)
-- ---------------------------------------------------------------------------
create or replace function public.rewards_wheel_summary(p_day date default current_date)
returns table (
  spins_total bigint,
  points_wins_total bigint,
  vouchers_total bigint,
  yumaks_box_total bigint
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_dispatcher_or_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  -- Rechenlogik unveraendert gegenueber 007_rewards_wheel.sql
  return query
  select
    count(*) filter (where ws.created_at::date = p_day) as spins_total,
    count(*) filter (
      where ws.prize_type in ('points_5', 'points_10', 'points_20', 'points_30', 'points_50')
        and ws.created_at::date = p_day
    ) as points_wins_total,
    count(*) filter (
      where ws.prize_type = 'voucher_20'
        and ws.created_at::date = p_day
    ) as vouchers_total,
    count(*) filter (
      where ws.prize_type = 'yumaks_box'
        and ws.created_at::date = p_day
    ) as yumaks_box_total
  from public.rewards_wheel_spins as ws;
end;
$$;

comment on function public.rewards_wheel_summary(date) is
  'Betriebsweite Gluecksrad-Tagesstatistik. Zugriff: ausschliesslich aktiver Admin/Disponent (010).';

revoke all on function public.rewards_wheel_summary(date) from public;
revoke all on function public.rewards_wheel_summary(date) from anon;
grant execute on function public.rewards_wheel_summary(date) to authenticated;

-- ---------------------------------------------------------------------------
-- 3) Anzahl aktiver Gluecksrad-Teilnehmer eines Tages
--    Signatur unveraendert: (p_day date default current_date) returns bigint
-- ---------------------------------------------------------------------------
create or replace function public.rewards_wheel_active_member_count(p_day date default current_date)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_dispatcher_or_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  -- Rechenlogik unveraendert gegenueber 007_rewards_wheel.sql
  return (
    select count(distinct ws.rewards_account_id)
    from public.rewards_wheel_spins as ws
    where ws.created_at::date = p_day
  );
end;
$$;

comment on function public.rewards_wheel_active_member_count(date) is
  'Anzahl aktiver Gluecksrad-Teilnehmer eines Tages. Zugriff: ausschliesslich aktiver Admin/Disponent (010).';

revoke all on function public.rewards_wheel_active_member_count(date) from public;
revoke all on function public.rewards_wheel_active_member_count(date) from anon;
grant execute on function public.rewards_wheel_active_member_count(date) to authenticated;
