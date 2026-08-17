create extension if not exists "uuid-ossp";

alter table public.customers
  add column if not exists auth_user_id uuid null;

create unique index if not exists uq_customers_auth_user_id
  on public.customers(auth_user_id)
  where auth_user_id is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'customers_auth_user_id_fk'
  ) then
    alter table public.customers
      add constraint customers_auth_user_id_fk
      foreign key (auth_user_id) references auth.users(id)
      on delete set null;
  end if;
end
$$;

create or replace function public.claim_customer_account()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
  current_email text;
  normalized_email text;
  match_count integer;
  match_row public.customers%rowtype;
begin
  current_user_id := auth.uid();
  if current_user_id is null then
    raise exception 'CUSTOMER_NOT_FOUND';
  end if;

  select u.email
  into current_email
  from auth.users as u
  where u.id = current_user_id
  limit 1;

  if current_email is null or trim(current_email) = '' then
    raise exception 'CUSTOMER_NOT_FOUND';
  end if;

  if not exists (
    select 1
    from auth.users as u
    where u.id = current_user_id
      and u.email_confirmed_at is not null
  ) then
    raise exception 'CUSTOMER_EMAIL_NOT_VERIFIED';
  end if;

  normalized_email := lower(trim(current_email));

  select count(*)
  into match_count
  from public.customers as c
  where lower(trim(c.email)) = normalized_email;

  if match_count = 0 then
    raise exception 'CUSTOMER_NOT_FOUND';
  elsif match_count > 1 then
    raise exception 'CUSTOMER_EMAIL_AMBIGUOUS';
  end if;

  select c.*
  into match_row
  from public.customers as c
  where lower(trim(c.email)) = normalized_email
  limit 1;

  if match_row.auth_user_id is not null and match_row.auth_user_id <> current_user_id then
    raise exception 'CUSTOMER_ALREADY_LINKED';
  end if;

  if exists (
    select 1
    from public.customers as c
    where c.auth_user_id = current_user_id
      and c.id <> match_row.id
  ) then
    raise exception 'AUTH_USER_ALREADY_LINKED';
  end if;

  if match_row.auth_user_id is null then
    update public.customers
    set auth_user_id = current_user_id
    where id = match_row.id;
  end if;

  return jsonb_build_object(
    'linked', true,
    'customer_id', match_row.id
  );
end;
$$;

revoke all on function public.claim_customer_account() from public;
revoke all on function public.claim_customer_account() from anon;
grant execute on function public.claim_customer_account() to authenticated;

create or replace function public.get_my_rewards_overview()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
  customer_row public.customers%rowtype;
  account_row public.rewards_accounts%rowtype;
  overview jsonb;
begin
  current_user_id := auth.uid();
  if current_user_id is null then
    raise exception 'CUSTOMER_ACCOUNT_NOT_LINKED';
  end if;

  select c.*
  into customer_row
  from public.customers as c
  where c.auth_user_id = current_user_id
  limit 1;

  if not found then
    raise exception 'CUSTOMER_ACCOUNT_NOT_LINKED';
  end if;

  select a.*
  into account_row
  from public.rewards_accounts as a
  where a.customer_id = customer_row.id
  limit 1;

  if not found then
    raise exception 'CUSTOMER_ACCOUNT_NOT_LINKED';
  end if;

  overview := jsonb_build_object(
    'customer_id', customer_row.id,
    'customer_name', coalesce(trim(customer_row.name), 'Kunde'),
    'rewards_account_id', account_row.id,
    'status', account_row.status,
    'points_balance', account_row.points_balance,
    'level', account_row.level,
    'qualifying_rides', account_row.qualifying_rides,
    'available_spins', coalesce((
      select sum(st.amount)
      from public.rewards_spin_transactions as st
      where st.rewards_account_id = account_row.id
    ), 0)::integer,
    'spins_earned', coalesce((
      select sum(st.amount)
      from public.rewards_spin_transactions as st
      where st.rewards_account_id = account_row.id
        and st.amount > 0
    ), 0)::integer,
    'spins_used', coalesce((
      select abs(sum(st.amount))
      from public.rewards_spin_transactions as st
      where st.rewards_account_id = account_row.id
        and st.amount < 0
    ), 0)::integer
  );

  return overview;
end;
$$;

revoke all on function public.get_my_rewards_overview() from public;
revoke all on function public.get_my_rewards_overview() from anon;
grant execute on function public.get_my_rewards_overview() to authenticated;

create or replace function public.spin_my_rewards_wheel()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
  customer_row public.customers%rowtype;
  account_row public.rewards_accounts%rowtype;
begin
  current_user_id := auth.uid();
  if current_user_id is null then
    raise exception 'CUSTOMER_ACCOUNT_NOT_LINKED';
  end if;

  select c.*
  into customer_row
  from public.customers as c
  where c.auth_user_id = current_user_id
  limit 1;

  if not found then
    raise exception 'CUSTOMER_ACCOUNT_NOT_LINKED';
  end if;

  select a.*
  into account_row
  from public.rewards_accounts as a
  where a.customer_id = customer_row.id
  limit 1;

  if not found then
    raise exception 'CUSTOMER_ACCOUNT_NOT_LINKED';
  end if;

  if account_row.status = 'paused' then
    raise exception 'REWARDS_ACCOUNT_PAUSED';
  elsif account_row.status = 'blocked' then
    raise exception 'REWARDS_ACCOUNT_BLOCKED';
  end if;

  if not exists (
    select 1
    from public.rewards_spin_transactions as st
    where st.rewards_account_id = account_row.id
      and st.amount > 0
  ) then
    raise exception 'REWARDS_NO_SPINS_AVAILABLE';
  end if;

  raise exception 'CUSTOMER_WHEEL_BLOCKED_BY_BACKEND';
end;
$$;

revoke all on function public.spin_my_rewards_wheel() from public;
revoke all on function public.spin_my_rewards_wheel() from anon;
grant execute on function public.spin_my_rewards_wheel() to authenticated;

alter table public.customers enable row level security;

revoke all on table public.customers from anon;
revoke all on table public.customers from authenticated;
grant select on table public.customers to authenticated;

drop policy if exists customers_customer_self_select on public.customers;
create policy customers_customer_self_select
  on public.customers
  as permissive
  for select
  to authenticated
  using (auth_user_id = auth.uid());

create policy rewards_accounts_customer_self_select
  on public.rewards_accounts
  as permissive
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.customers as c
      where c.id = rewards_accounts.customer_id
        and c.auth_user_id = auth.uid()
    )
  );

create policy rewards_transactions_customer_self_select
  on public.rewards_transactions
  as permissive
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.rewards_accounts as ra
      join public.customers as c on c.id = ra.customer_id
      where ra.id = rewards_transactions.rewards_account_id
        and c.auth_user_id = auth.uid()
    )
  );

create policy rewards_vouchers_customer_self_select
  on public.rewards_vouchers
  as permissive
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.rewards_accounts as ra
      join public.customers as c on c.id = ra.customer_id
      where ra.id = rewards_vouchers.rewards_account_id
        and c.auth_user_id = auth.uid()
    )
  );

create policy rewards_spin_transactions_customer_self_select
  on public.rewards_spin_transactions
  as permissive
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.rewards_accounts as ra
      join public.customers as c on c.id = ra.customer_id
      where ra.id = rewards_spin_transactions.rewards_account_id
        and c.auth_user_id = auth.uid()
    )
  );

create policy rewards_wheel_spins_customer_self_select
  on public.rewards_wheel_spins
  as permissive
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.rewards_accounts as ra
      join public.customers as c on c.id = ra.customer_id
      where ra.id = rewards_wheel_spins.rewards_account_id
        and c.auth_user_id = auth.uid()
    )
  );

grant select on table public.rewards_accounts to authenticated;
grant select on table public.rewards_transactions to authenticated;
grant select on table public.rewards_vouchers to authenticated;
grant select on table public.rewards_spin_transactions to authenticated;
grant select on table public.rewards_wheel_spins to authenticated;
