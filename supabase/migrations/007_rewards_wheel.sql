create table if not exists public.rewards_spin_transactions (
  id uuid primary key default gen_random_uuid(),
  rewards_account_id uuid not null references public.rewards_accounts(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict,
  amount integer not null check (amount <> 0),
  transaction_type text not null check (transaction_type in ('manual_grant', 'ride_milestone', 'wheel_spin', 'adjustment')),
  reason text,
  note text,
  created_by uuid null,
  created_at timestamptz not null default now()
);

create index if not exists idx_rewards_spin_transactions_account
  on public.rewards_spin_transactions(rewards_account_id, created_at desc);

create index if not exists idx_rewards_spin_transactions_customer
  on public.rewards_spin_transactions(customer_id, created_at desc);

create table if not exists public.rewards_wheel_spins (
  id uuid primary key default gen_random_uuid(),
  rewards_account_id uuid not null references public.rewards_accounts(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict,
  prize_type text not null check (
    prize_type in (
      'points_5',
      'points_10',
      'points_20',
      'points_30',
      'points_50',
      'voucher_20',
      'yumaks_box'
    )
  ),
  points_awarded integer null check (points_awarded is null or points_awarded > 0),
  voucher_id uuid null references public.rewards_vouchers(id) on delete set null,
  yumaks_box_won boolean not null default false,
  fulfillment_status text null check (fulfillment_status is null or fulfillment_status in ('pending', 'fulfilled')),
  fulfilled_at timestamptz null,
  fulfilled_by uuid null,
  spin_source text null default 'earned_ride_spin',
  created_by uuid null,
  created_at timestamptz not null default now(),
  constraint rewards_wheel_spin_prize_check
    check (
      (
        prize_type in ('points_5', 'points_10', 'points_20', 'points_30', 'points_50')
        and points_awarded is not null
        and voucher_id is null
        and yumaks_box_won = false
      )
      or (
        prize_type = 'voucher_20'
        and points_awarded is null
        and voucher_id is not null
        and yumaks_box_won = false
      )
      or (
        prize_type = 'yumaks_box'
        and points_awarded is null
        and voucher_id is null
        and yumaks_box_won = true
      )
    )
);

create index if not exists idx_rewards_wheel_spins_account
  on public.rewards_wheel_spins(rewards_account_id, created_at desc);

create index if not exists idx_rewards_wheel_spins_customer
  on public.rewards_wheel_spins(customer_id, created_at desc);

create index if not exists idx_rewards_wheel_spins_prize_type
  on public.rewards_wheel_spins(prize_type, created_at desc);

alter table public.rewards_spin_transactions enable row level security;
alter table public.rewards_wheel_spins enable row level security;

revoke all on table public.rewards_spin_transactions from anon;
revoke all on table public.rewards_spin_transactions from authenticated;
revoke all on table public.rewards_wheel_spins from anon;
revoke all on table public.rewards_wheel_spins from authenticated;

grant select on table public.rewards_spin_transactions to authenticated;
grant select on table public.rewards_wheel_spins to authenticated;

grant insert, update on table public.rewards_spin_transactions to authenticated;
grant insert, update on table public.rewards_wheel_spins to authenticated;

create policy rewards_spin_transactions_admin_dispatcher_select
  on public.rewards_spin_transactions
  as permissive
  for select
  to authenticated
  using (private.is_dispatcher_or_admin());

create policy rewards_spin_transactions_admin_dispatcher_write
  on public.rewards_spin_transactions
  as permissive
  for insert
  to authenticated
  with check (private.is_dispatcher_or_admin());

create policy rewards_wheel_spins_admin_dispatcher_select
  on public.rewards_wheel_spins
  as permissive
  for select
  to authenticated
  using (private.is_dispatcher_or_admin());

create policy rewards_wheel_spins_admin_dispatcher_write
  on public.rewards_wheel_spins
  as permissive
  for insert
  to authenticated
  with check (private.is_dispatcher_or_admin());

create policy rewards_wheel_spins_admin_dispatcher_update
  on public.rewards_wheel_spins
  as permissive
  for update
  to authenticated
  using (private.is_dispatcher_or_admin())
  with check (private.is_dispatcher_or_admin());

create or replace function public.rewards_wheel_rules()
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'qualifying_rides_per_spin', 5,
    'spins_accumulate', true,
    'point_cost_per_spin', 0,
    'voucher_validity_days', 90,
    'probabilities', jsonb_build_object(
      'points_5', 0.35,
      'points_10', 0.25,
      'points_20', 0.18,
      'points_30', 0.10,
      'points_50', 0.07,
      'voucher_20', 0.04,
      'yumaks_box', 0.01
    )
  );
$$;

revoke all on function public.rewards_wheel_rules() from public;
revoke all on function public.rewards_wheel_rules() from anon;
grant execute on function public.rewards_wheel_rules() to authenticated;

create or replace function public.rewards_account_spin_balance(p_rewards_account_id uuid)
returns integer
language sql
security definer
set search_path = ''
as $$
  select coalesce(sum(amount), 0)::integer
  from public.rewards_spin_transactions
  where rewards_account_id = p_rewards_account_id;
$$;

revoke all on function public.rewards_account_spin_balance(uuid) from public;
revoke all on function public.rewards_account_spin_balance(uuid) from anon;
grant execute on function public.rewards_account_spin_balance(uuid) to authenticated;

create or replace function public.grant_rewards_spin(
  p_rewards_account_id uuid,
  p_amount integer,
  p_reason text,
  p_note text default null
)
returns public.rewards_spin_transactions
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_row public.rewards_accounts%rowtype;
  transaction_row public.rewards_spin_transactions%rowtype;
begin
  if not private.is_dispatcher_or_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Spin amount must be positive' using errcode = '22023';
  end if;

  select *
  into account_row
  from public.rewards_accounts
  where id = p_rewards_account_id
  for update;

  if not found then
    raise exception 'Rewards account not found' using errcode = 'P0002';
  end if;

  if account_row.status = 'paused' then
    raise exception 'REWARDS_ACCOUNT_PAUSED';
  elsif account_row.status = 'blocked' then
    raise exception 'REWARDS_ACCOUNT_BLOCKED';
  end if;

  insert into public.rewards_spin_transactions (
    rewards_account_id,
    customer_id,
    amount,
    transaction_type,
    reason,
    note,
    created_by
  ) values (
    account_row.id,
    account_row.customer_id,
    p_amount,
    'manual_grant',
    nullif(trim(coalesce(p_reason, '')), ''),
    nullif(trim(coalesce(p_note, '')), ''),
    auth.uid()
  )
  returning * into transaction_row;

  return transaction_row;
end;
$$;

revoke all on function public.grant_rewards_spin(uuid, integer, text, text) from public;
revoke all on function public.grant_rewards_spin(uuid, integer, text, text) from anon;
grant execute on function public.grant_rewards_spin(uuid, integer, text, text) to authenticated;

create or replace function public.spin_rewards_wheel(
  p_rewards_account_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_row public.rewards_accounts%rowtype;
  available_spins integer;
  prize_type text;
  points_awarded integer;
  voucher_row public.rewards_vouchers%rowtype;
  spin_row public.rewards_wheel_spins%rowtype;
  spin_id uuid;
  roll double precision;
  actor_name text;
  next_balance integer;
begin
  if not private.is_dispatcher_or_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select *
  into account_row
  from public.rewards_accounts
  where id = p_rewards_account_id
  for update;

  if not found then
    raise exception 'Rewards account not found' using errcode = 'P0002';
  end if;

  if account_row.status = 'paused' then
    raise exception 'REWARDS_ACCOUNT_PAUSED';
  elsif account_row.status = 'blocked' then
    raise exception 'REWARDS_ACCOUNT_BLOCKED';
  end if;

  available_spins := coalesce(
    (select sum(amount)
     from public.rewards_spin_transactions
     where rewards_account_id = account_row.id),
    0
  );

  if available_spins < 1 then
    raise exception 'REWARDS_NO_SPINS_AVAILABLE';
  end if;

  insert into public.rewards_spin_transactions (
    rewards_account_id,
    customer_id,
    amount,
    transaction_type,
    reason,
    created_by
  ) values (
    account_row.id,
    account_row.customer_id,
    -1,
    'wheel_spin',
    'Glücksrad',
    auth.uid()
  );

  roll := random();

  if roll < 0.35 then
    prize_type := 'points_5';
    points_awarded := 5;
  elsif roll < 0.60 then
    prize_type := 'points_10';
    points_awarded := 10;
  elsif roll < 0.78 then
    prize_type := 'points_20';
    points_awarded := 20;
  elsif roll < 0.88 then
    prize_type := 'points_30';
    points_awarded := 30;
  elsif roll < 0.95 then
    prize_type := 'points_50';
    points_awarded := 50;
  elsif roll < 0.99 then
    prize_type := 'voucher_20';
    points_awarded := null;
  else
    prize_type := 'yumaks_box';
    points_awarded := null;
  end if;

  if prize_type like 'points_%' then
    next_balance := account_row.points_balance + points_awarded;

    select coalesce(nullif(trim(profiles.display_name), ''), profiles.role, 'Mitarbeiter')
    into actor_name
    from public.profiles as profiles
    where profiles.auth_user_id = auth.uid()
    limit 1;

    insert into public.rewards_transactions (
      rewards_account_id,
      customer_id,
      transaction_type,
      points,
      points_balance_after,
      reason,
      note,
      created_by,
      created_by_name
    ) values (
      account_row.id,
      account_row.customer_id,
      'wheel_reward',
      points_awarded,
      next_balance,
      'Glücksrad',
      'Glücksrad-Gewinn: ' || points_awarded || ' Punkte',
      auth.uid(),
      coalesce(actor_name, 'Mitarbeiter')
    );

    update public.rewards_accounts
    set points_balance = next_balance,
        updated_at = now()
    where id = account_row.id;
  elsif prize_type = 'voucher_20' then
    select *
    into voucher_row
    from public.issue_rewards_voucher(
      account_row.id,
      2000,
      current_date + 90,
      'Glücksrad-Gewinn'
    );
  end if;

  insert into public.rewards_wheel_spins (
    rewards_account_id,
    customer_id,
    prize_type,
    points_awarded,
    voucher_id,
    yumaks_box_won,
    fulfillment_status,
    spin_source,
    created_by
  ) values (
    account_row.id,
    account_row.customer_id,
    prize_type,
    points_awarded,
    voucher_row.id,
    prize_type = 'yumaks_box',
    case when prize_type = 'yumaks_box' then 'pending' else null end,
    'earned_ride_spin',
    auth.uid()
  )
  returning * into spin_row;

  return jsonb_build_object(
    'spin_id', spin_row.id,
    'prize_type', spin_row.prize_type,
    'points_awarded', spin_row.points_awarded,
    'voucher_id', spin_row.voucher_id,
    'yumaks_box_won', spin_row.yumaks_box_won,
    'fulfillment_status', spin_row.fulfillment_status,
    'message', case
      when spin_row.prize_type = 'points_5' then '5 Punkte gewonnen'
      when spin_row.prize_type = 'points_10' then '10 Punkte gewonnen'
      when spin_row.prize_type = 'points_20' then '20 Punkte gewonnen'
      when spin_row.prize_type = 'points_30' then '30 Punkte gewonnen'
      when spin_row.prize_type = 'points_50' then '50 Punkte gewonnen'
      when spin_row.prize_type = 'voucher_20' then '20,00 € Gutschein gewonnen'
      when spin_row.prize_type = 'yumaks_box' then 'Yumaks Box gewonnen'
      else 'Glücksrad gewonnen'
    end
  );
end;
$$;

revoke all on function public.spin_rewards_wheel(uuid) from public;
revoke all on function public.spin_rewards_wheel(uuid) from anon;
grant execute on function public.spin_rewards_wheel(uuid) to authenticated;

create or replace function public.fulfill_yumaks_box(
  p_spin_id uuid
)
returns public.rewards_wheel_spins
language plpgsql
security definer
set search_path = ''
as $$
declare
  spin_row public.rewards_wheel_spins%rowtype;
begin
  if not private.is_dispatcher_or_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select *
  into spin_row
  from public.rewards_wheel_spins
  where id = p_spin_id
  for update;

  if not found then
    raise exception 'Wheel spin not found' using errcode = 'P0002';
  end if;

  if spin_row.prize_type <> 'yumaks_box' or spin_row.yumaks_box_won = false then
    raise exception 'Spin is not a Yumaks Box prize';
  end if;

  if spin_row.fulfillment_status = 'fulfilled' then
    return spin_row;
  end if;

  update public.rewards_wheel_spins
  set fulfillment_status = 'fulfilled',
      fulfilled_at = now(),
      fulfilled_by = auth.uid()
  where id = p_spin_id
  returning * into spin_row;

  return spin_row;
end;
$$;

revoke all on function public.fulfill_yumaks_box(uuid) from public;
revoke all on function public.fulfill_yumaks_box(uuid) from anon;
grant execute on function public.fulfill_yumaks_box(uuid) to authenticated;

create or replace function public.rewards_wheel_summary(p_day date default current_date)
returns table (
  spins_total bigint,
  points_wins_total bigint,
  vouchers_total bigint,
  yumaks_box_total bigint
)
language sql
security definer
set search_path = ''
as $$
  select
    count(*) filter (where created_at::date = p_day) as spins_total,
    count(*) filter (
      where prize_type in ('points_5', 'points_10', 'points_20', 'points_30', 'points_50')
        and created_at::date = p_day
    ) as points_wins_total,
    count(*) filter (
      where prize_type = 'voucher_20'
        and created_at::date = p_day
    ) as vouchers_total,
    count(*) filter (
      where prize_type = 'yumaks_box'
        and created_at::date = p_day
    ) as yumaks_box_total
  from public.rewards_wheel_spins;
$$;

revoke all on function public.rewards_wheel_summary(date) from public;
revoke all on function public.rewards_wheel_summary(date) from anon;
grant execute on function public.rewards_wheel_summary(date) to authenticated;

create or replace function public.rewards_wheel_active_member_count(p_day date default current_date)
returns bigint
language sql
security definer
set search_path = ''
as $$
  select count(distinct rewards_account_id)
  from public.rewards_wheel_spins
  where created_at::date = p_day;
$$;

revoke all on function public.rewards_wheel_active_member_count(date) from public;
revoke all on function public.rewards_wheel_active_member_count(date) from anon;
grant execute on function public.rewards_wheel_active_member_count(date) to authenticated;

DO $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'rewards_transactions'
      and column_name = 'transaction_type'
  ) then
    if exists (
      select 1
      from pg_constraint
      where conrelid = 'public.rewards_transactions'::regclass
        and conname = 'rewards_transactions_transaction_type_check'
    ) then
      alter table public.rewards_transactions
drop constraint rewards_transactions_transaction_type_check;
    end if;

    alter table public.rewards_transactions
      add constraint rewards_transactions_transaction_type_check
      check (transaction_type in (
        'ride_reward',
        'birthday_bonus',
        'manual_credit',
        'manual_debit',
        'voucher_redemption',
        'adjustment',
        'wheel_reward'
      ));
  end if;
end $$;
