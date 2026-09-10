-- Rewards backend for the existing customers schema.
-- Automatic ride rewards remain intentionally disabled until the rides UI uses
-- Supabase and one unambiguous points formula matches the approved exclusions.

create table if not exists public.rewards_accounts (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid not null unique references public.customers(id) on delete cascade,
  points_balance integer not null default 0 check (points_balance >= 0),
  qualifying_rides integer not null default 0 check (qualifying_rides >= 0),
  level text not null default 'bronze' check (level in ('bronze', 'silver', 'gold', 'platinum', 'vip')),
  status text not null default 'active' check (status in ('active', 'paused', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rewards_transactions (
  id uuid primary key default uuid_generate_v4(),
  rewards_account_id uuid not null references public.rewards_accounts(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict,
  ride_id uuid references public.rides(id) on delete set null,
  transaction_type text not null check (transaction_type in (
    'ride_reward',
    'birthday_bonus',
    'manual_credit',
    'manual_debit',
    'voucher_redemption',
    'adjustment'
  )),
  points integer not null check (points <> 0),
  points_balance_after integer not null check (points_balance_after >= 0),
  reason text not null check (length(trim(reason)) > 0),
  note text,
  created_by uuid,
  created_by_name text,
  reward_year integer check (reward_year between 2000 and 9999),
  created_at timestamptz not null default now()
);

create index if not exists idx_rewards_accounts_status on public.rewards_accounts(status);
create index if not exists idx_rewards_accounts_level on public.rewards_accounts(level);
create index if not exists idx_rewards_transactions_account_created
  on public.rewards_transactions(rewards_account_id, created_at desc);
create index if not exists idx_rewards_transactions_customer
  on public.rewards_transactions(customer_id);

create unique index if not exists uq_rewards_transactions_ride_type
  on public.rewards_transactions(ride_id, transaction_type)
  where ride_id is not null;

create unique index if not exists uq_rewards_transactions_birthday_year
  on public.rewards_transactions(customer_id, transaction_type, reward_year)
  where transaction_type = 'birthday_bonus' and reward_year is not null;

create or replace function private.set_rewards_account_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.prevent_rewards_transaction_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Rewards transactions are immutable';
end;
$$;

drop trigger if exists rewards_accounts_set_updated_at on public.rewards_accounts;
create trigger rewards_accounts_set_updated_at
before update on public.rewards_accounts
for each row execute function private.set_rewards_account_updated_at();

drop trigger if exists rewards_transactions_immutable on public.rewards_transactions;
create trigger rewards_transactions_immutable
before update or delete on public.rewards_transactions
for each row execute function private.prevent_rewards_transaction_mutation();

create or replace function private.create_rewards_account_for_customer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.rewards_accounts (customer_id)
  values (new.id)
  on conflict (customer_id) do nothing;
  return new;
end;
$$;

revoke all on function private.set_rewards_account_updated_at() from public;
revoke all on function private.set_rewards_account_updated_at() from anon;
revoke all on function private.set_rewards_account_updated_at() from authenticated;
revoke all on function private.prevent_rewards_transaction_mutation() from public;
revoke all on function private.prevent_rewards_transaction_mutation() from anon;
revoke all on function private.prevent_rewards_transaction_mutation() from authenticated;
revoke all on function private.create_rewards_account_for_customer() from public;
revoke all on function private.create_rewards_account_for_customer() from anon;
revoke all on function private.create_rewards_account_for_customer() from authenticated;

drop trigger if exists customers_create_rewards_account on public.customers;
create trigger customers_create_rewards_account
after insert on public.customers
for each row execute function private.create_rewards_account_for_customer();

insert into public.rewards_accounts (customer_id)
select customers.id
from public.customers as customers
on conflict (customer_id) do nothing;

create or replace function public.book_rewards_points(
  p_rewards_account_id uuid,
  p_points integer,
  p_reason text,
  p_note text default null
)
returns public.rewards_transactions
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_row public.rewards_accounts%rowtype;
  transaction_row public.rewards_transactions%rowtype;
  next_balance integer;
  actor_name text;
begin
  if not private.is_dispatcher_or_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if p_points = 0 then
    raise exception 'Points must not be zero' using errcode = '22023';
  end if;

  if nullif(trim(p_reason), '') is null then
    raise exception 'Reason is required' using errcode = '22023';
  end if;

  select *
  into account_row
  from public.rewards_accounts
  where id = p_rewards_account_id
  for update;

  if not found then
    raise exception 'Rewards account not found' using errcode = 'P0002';
  end if;

  next_balance := account_row.points_balance + p_points;
  if next_balance < 0 then
    raise exception 'Points balance must not become negative' using errcode = '22003';
  end if;

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
    case when p_points > 0 then 'manual_credit' else 'manual_debit' end,
    p_points,
    next_balance,
    trim(p_reason),
    nullif(trim(coalesce(p_note, '')), ''),
    auth.uid(),
    coalesce(actor_name, 'Mitarbeiter')
  )
  returning * into transaction_row;

  update public.rewards_accounts
  set points_balance = next_balance
  where id = account_row.id;

  return transaction_row;
end;
$$;

alter table public.rewards_accounts enable row level security;
alter table public.rewards_transactions enable row level security;

revoke all on table public.rewards_accounts from anon;
revoke all on table public.rewards_transactions from anon;
revoke all on table public.rewards_accounts from authenticated;
revoke all on table public.rewards_transactions from authenticated;

grant select on table public.rewards_accounts to authenticated;
grant update (status, level) on table public.rewards_accounts to authenticated;
grant select on table public.rewards_transactions to authenticated;

create policy rewards_accounts_admin_dispatcher_select
  on public.rewards_accounts
  as permissive
  for select
  to authenticated
  using (private.is_dispatcher_or_admin());

create policy rewards_accounts_admin_dispatcher_update
  on public.rewards_accounts
  as permissive
  for update
  to authenticated
  using (private.is_dispatcher_or_admin())
  with check (private.is_dispatcher_or_admin());

create policy rewards_transactions_admin_dispatcher_select
  on public.rewards_transactions
  as permissive
  for select
  to authenticated
  using (private.is_dispatcher_or_admin());

revoke all on function public.book_rewards_points(uuid, integer, text, text) from public;
revoke all on function public.book_rewards_points(uuid, integer, text, text) from anon;
grant execute on function public.book_rewards_points(uuid, integer, text, text) to authenticated;
