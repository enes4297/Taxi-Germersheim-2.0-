do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'customers'
      and column_name in ('birth_date', 'birthday', 'date_of_birth', 'dob', 'birthDate')
  ) then
    alter table public.customers
      add column if not exists birth_date date;
  end if;
end $$;

create unique index if not exists uq_rewards_transactions_birthday_year
  on public.rewards_transactions(customer_id, transaction_type, reward_year)
  where transaction_type = 'birthday_bonus' and reward_year is not null;

create or replace function public.book_rewards_birthday_bonus(
  p_rewards_account_id uuid
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
  current_year integer;
  birthday_column text;
  birth_date_value date;
  bonus_points constant integer := 200;
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

  select column_name
  into birthday_column
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'customers'
    and column_name in ('birth_date', 'birthday', 'date_of_birth', 'dob', 'birthDate')
  order by
    case column_name
      when 'birth_date' then 1
      when 'birthday' then 2
      when 'date_of_birth' then 3
      when 'dob' then 4
      when 'birthDate' then 5
      else 6
    end
  limit 1;

  if birthday_column is null then
    raise exception 'REWARDS_BIRTH_DATE_MISSING';
  end if;

  execute format(
    'select %I from public.customers where id = $1',
    birthday_column
  )
  into birth_date_value
  using account_row.customer_id;

  if birth_date_value is null then
    raise exception 'REWARDS_BIRTH_DATE_MISSING';
  end if;

  if not (
    extract(month from birth_date_value) = extract(month from current_date)
    and extract(day from birth_date_value) = extract(day from current_date)
  ) then
    raise exception 'REWARDS_NOT_BIRTHDAY';
  end if;

  current_year := extract(year from current_date)::int;

  if exists (
    select 1
    from public.rewards_transactions
    where customer_id = account_row.customer_id
      and transaction_type = 'birthday_bonus'
      and reward_year = current_year
  ) then
    raise exception 'REWARDS_BIRTHDAY_ALREADY_GRANTED';
  end if;

  next_balance := account_row.points_balance + bonus_points;

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
    created_by_name,
    reward_year
  ) values (
    account_row.id,
    account_row.customer_id,
    'birthday_bonus',
    bonus_points,
    next_balance,
    'Geburtstagsbonus',
    'Geburtstagsbonus ' || current_year,
    auth.uid(),
    coalesce(actor_name, 'Mitarbeiter'),
    current_year
  )
  returning * into transaction_row;

  update public.rewards_accounts
  set points_balance = next_balance
  where id = account_row.id;

  return transaction_row;
end;
$$;

revoke all on function public.book_rewards_birthday_bonus(uuid) from public;
revoke all on function public.book_rewards_birthday_bonus(uuid) from anon;
grant execute on function public.book_rewards_birthday_bonus(uuid) to authenticated;
