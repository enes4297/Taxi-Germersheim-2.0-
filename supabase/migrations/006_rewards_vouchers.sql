create table if not exists public.rewards_vouchers (
  id uuid primary key default gen_random_uuid(),
  rewards_account_id uuid not null references public.rewards_accounts(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict,
  code text not null unique,
  value_cents integer not null check (value_cents > 0),
  status text not null default 'open' check (status in ('open', 'redeemed', 'blocked')),
  issued_at timestamptz not null default now(),
  valid_until date not null,
  redeemed_at timestamptz null,
  created_by uuid null,
  redeemed_by uuid null,
  note text null,
  blocked_at timestamptz null,
  blocked_by uuid null,
  block_reason text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_rewards_vouchers_account on public.rewards_vouchers(rewards_account_id);
create index if not exists idx_rewards_vouchers_customer on public.rewards_vouchers(customer_id);
create index if not exists idx_rewards_vouchers_status on public.rewards_vouchers(status);

create or replace function private.set_rewards_vouchers_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists rewards_vouchers_set_updated_at on public.rewards_vouchers;
create trigger rewards_vouchers_set_updated_at
before update on public.rewards_vouchers
for each row execute function private.set_rewards_vouchers_updated_at();

create or replace function public.issue_rewards_voucher(
  p_rewards_account_id uuid,
  p_value_cents integer,
  p_valid_until date,
  p_note text default null
)
returns public.rewards_vouchers
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_row public.rewards_accounts%rowtype;
  voucher_row public.rewards_vouchers%rowtype;
  next_code text;
begin
  if not private.is_dispatcher_or_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if p_value_cents is null or p_value_cents <= 0 then
    raise exception 'REWARDS_VOUCHER_INVALID_EXPIRY';
  end if;

  if p_valid_until is null or p_valid_until < current_date then
    raise exception 'REWARDS_VOUCHER_INVALID_EXPIRY';
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

  next_code := 'TG-' || extract(year from current_date)::int::text || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);

  insert into public.rewards_vouchers (
    rewards_account_id,
    customer_id,
    code,
    value_cents,
    valid_until,
    created_by,
    note
  ) values (
    account_row.id,
    account_row.customer_id,
    next_code,
    p_value_cents,
    p_valid_until,
    auth.uid(),
    nullif(trim(coalesce(p_note, '')), '')
  )
  returning * into voucher_row;

  return voucher_row;
end;
$$;

create or replace function public.redeem_rewards_voucher(
  p_voucher_id uuid
)
returns public.rewards_vouchers
language plpgsql
security definer
set search_path = ''
as $$
declare
  voucher_row public.rewards_vouchers%rowtype;
  account_row public.rewards_accounts%rowtype;
begin
  if not private.is_dispatcher_or_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select *
  into voucher_row
  from public.rewards_vouchers
  where id = p_voucher_id
  for update;

  if not found then
    raise exception 'Voucher not found' using errcode = 'P0002';
  end if;

  if voucher_row.status = 'redeemed' then
    raise exception 'REWARDS_VOUCHER_ALREADY_REDEEMED';
  elsif voucher_row.status = 'blocked' then
    raise exception 'REWARDS_VOUCHER_BLOCKED';
  elsif voucher_row.valid_until < current_date then
    raise exception 'REWARDS_VOUCHER_EXPIRED';
  end if;

  select *
  into account_row
  from public.rewards_accounts
  where id = voucher_row.rewards_account_id
  for update;

  if account_row.status = 'paused' then
    raise exception 'REWARDS_ACCOUNT_PAUSED';
  elsif account_row.status = 'blocked' then
    raise exception 'REWARDS_ACCOUNT_BLOCKED';
  end if;

  update public.rewards_vouchers
  set status = 'redeemed',
      redeemed_at = now(),
      redeemed_by = auth.uid(),
      updated_at = now()
  where id = voucher_row.id
  returning * into voucher_row;

  return voucher_row;
end;
$$;

create or replace function public.block_rewards_voucher(
  p_voucher_id uuid,
  p_reason text
)
returns public.rewards_vouchers
language plpgsql
security definer
set search_path = ''
as $$
declare
  voucher_row public.rewards_vouchers%rowtype;
begin
  if not private.is_dispatcher_or_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select *
  into voucher_row
  from public.rewards_vouchers
  where id = p_voucher_id
  for update;

  if not found then
    raise exception 'Voucher not found' using errcode = 'P0002';
  end if;

  if voucher_row.status = 'redeemed' then
    raise exception 'REWARDS_VOUCHER_ALREADY_REDEEMED';
  end if;

  if voucher_row.status = 'blocked' then
    return voucher_row;
  end if;

  update public.rewards_vouchers
  set status = 'blocked',
      blocked_at = now(),
      blocked_by = auth.uid(),
      block_reason = nullif(trim(coalesce(p_reason, '')), ''),
      updated_at = now()
  where id = voucher_row.id
  returning * into voucher_row;

  return voucher_row;
end;
$$;

create or replace function public.unblock_rewards_voucher(
  p_voucher_id uuid
)
returns public.rewards_vouchers
language plpgsql
security definer
set search_path = ''
as $$
declare
  voucher_row public.rewards_vouchers%rowtype;
begin
  if not private.is_dispatcher_or_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select *
  into voucher_row
  from public.rewards_vouchers
  where id = p_voucher_id
  for update;

  if not found then
    raise exception 'Voucher not found' using errcode = 'P0002';
  end if;

  if voucher_row.status <> 'blocked' then
    return voucher_row;
  end if;

  if voucher_row.valid_until < current_date then
    raise exception 'REWARDS_VOUCHER_EXPIRED';
  end if;

  update public.rewards_vouchers
  set status = 'open',
      blocked_at = null,
      blocked_by = null,
      block_reason = null,
      updated_at = now()
  where id = voucher_row.id
  returning * into voucher_row;

  return voucher_row;
end;
$$;

alter table public.rewards_vouchers enable row level security;

revoke all on table public.rewards_vouchers from anon;
revoke all on table public.rewards_vouchers from authenticated;

grant select on table public.rewards_vouchers to authenticated;

create policy rewards_vouchers_admin_dispatcher_select
  on public.rewards_vouchers
  as permissive
  for select
  to authenticated
  using (private.is_dispatcher_or_admin());

create policy rewards_vouchers_admin_dispatcher_update
  on public.rewards_vouchers
  as permissive
  for update
  to authenticated
  using (private.is_dispatcher_or_admin())
  with check (private.is_dispatcher_or_admin());

revoke all on function public.issue_rewards_voucher(uuid, integer, date, text) from public;
revoke all on function public.issue_rewards_voucher(uuid, integer, date, text) from anon;
grant execute on function public.issue_rewards_voucher(uuid, integer, date, text) to authenticated;

revoke all on function public.redeem_rewards_voucher(uuid) from public;
revoke all on function public.redeem_rewards_voucher(uuid) from anon;
grant execute on function public.redeem_rewards_voucher(uuid) to authenticated;

revoke all on function public.block_rewards_voucher(uuid, text) from public;
revoke all on function public.block_rewards_voucher(uuid, text) from anon;
grant execute on function public.block_rewards_voucher(uuid, text) to authenticated;

revoke all on function public.unblock_rewards_voucher(uuid) from public;
revoke all on function public.unblock_rewards_voucher(uuid) from anon;
grant execute on function public.unblock_rewards_voucher(uuid) to authenticated;
