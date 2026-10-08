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

  if account_row.status = 'paused' then
    raise exception 'REWARDS_ACCOUNT_PAUSED';
  elsif account_row.status = 'blocked' then
    raise exception 'REWARDS_ACCOUNT_BLOCKED';
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

revoke all on function public.book_rewards_points(uuid, integer, text, text) from public;
revoke all on function public.book_rewards_points(uuid, integer, text, text) from anon;
grant execute on function public.book_rewards_points(uuid, integer, text, text) to authenticated;
