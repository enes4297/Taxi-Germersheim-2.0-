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

  if spin_row.prize_type <> 'yumaks_box' then
    raise exception 'REWARDS_NOT_YUMAKS_BOX';
  end if;

  if spin_row.fulfillment_status = 'fulfilled' then
    raise exception 'REWARDS_YUMAKS_ALREADY_FULFILLED';
  end if;

  if spin_row.fulfillment_status is null or spin_row.fulfillment_status <> 'pending' then
    raise exception 'REWARDS_YUMAKS_INVALID_STATUS';
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
