-- Second migration: role-based RLS policies for Taxi Germersheim.
-- This file assumes the schema from 001_schema.sql is already present.

create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon;
grant usage on schema private to authenticated;

create or replace function private.current_user_employee_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.employee_id
  from public.profiles as p
  where p.auth_user_id = (select auth.uid())
    and p.active = true
  limit 1;
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as p
    where p.auth_user_id = (select auth.uid())
      and p.active = true
      and p.role = 'admin'
  );
$$;

create or replace function private.is_dispatcher_or_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as p
    where p.auth_user_id = (select auth.uid())
      and p.active = true
      and p.role in ('dispatcher', 'admin')
  );
$$;

revoke all on function private.current_user_employee_id() from public;
revoke all on function private.current_user_employee_id() from anon;
grant execute on function private.current_user_employee_id() to authenticated;

revoke all on function private.is_admin() from public;
revoke all on function private.is_admin() from anon;
grant execute on function private.is_admin() to authenticated;

revoke all on function private.is_dispatcher_or_admin() from public;
revoke all on function private.is_dispatcher_or_admin() from anon;
grant execute on function private.is_dispatcher_or_admin() to authenticated;

-- Enable RLS on all relevant tables.
alter table public.employees enable row level security;
alter table public.vehicles enable row level security;
alter table public.profiles enable row level security;
alter table public.document_types enable row level security;
alter table public.ride_series enable row level security;
alter table public.document_submissions enable row level security;
alter table public.employee_documents enable row level security;
alter table public.shifts enable row level security;
alter table public.plan_publications enable row level security;
alter table public.absences enable row level security;
alter table public.vacation_requests enable row level security;
alter table public.sickness_reports enable row level security;
alter table public.notifications enable row level security;
alter table public.tasks enable row level security;
alter table public.customers enable row level security;
alter table public.rides enable row level security;

-- Minimal grants for authenticated users. No anon access.
grant usage on schema public to authenticated;
revoke all on table public.employees from anon;
revoke all on table public.vehicles from anon;
revoke all on table public.profiles from anon;
revoke all on table public.document_types from anon;
revoke all on table public.ride_series from anon;
revoke all on table public.document_submissions from anon;
revoke all on table public.employee_documents from anon;
revoke all on table public.shifts from anon;
revoke all on table public.plan_publications from anon;
revoke all on table public.absences from anon;
revoke all on table public.vacation_requests from anon;
revoke all on table public.sickness_reports from anon;
revoke all on table public.notifications from anon;
revoke all on table public.tasks from anon;
revoke all on table public.customers from anon;
revoke all on table public.rides from anon;
grant select, insert, update, delete on table public.employees to authenticated;
grant select, insert, update, delete on table public.vehicles to authenticated;
grant select, insert, update, delete on table public.profiles to authenticated;
grant select, insert, update, delete on table public.document_types to authenticated;
grant select, insert, update, delete on table public.ride_series to authenticated;
grant select, insert, update, delete on table public.document_submissions to authenticated;
grant select, insert, update, delete on table public.employee_documents to authenticated;
grant select, insert, update, delete on table public.shifts to authenticated;
grant select, insert, update, delete on table public.plan_publications to authenticated;
grant select, insert, update, delete on table public.absences to authenticated;
grant select, insert, update, delete on table public.vacation_requests to authenticated;
grant select, insert, update, delete on table public.sickness_reports to authenticated;
grant select, insert on table public.notifications to authenticated;
revoke update on table public.notifications from authenticated;
grant update (read_at) on table public.notifications to authenticated;
grant select, insert, update, delete on table public.tasks to authenticated;
grant select, insert, update, delete on table public.customers to authenticated;
grant select, insert, update, delete on table public.rides to authenticated;

-- Indexes for RLS checks.
drop index if exists public.idx_profiles_auth_user_id;
create unique index if not exists idx_profiles_auth_user_id_unique
  on public.profiles(auth_user_id)
  where auth_user_id is not null;
create index if not exists idx_profiles_employee_id on public.profiles(employee_id);
create index if not exists idx_shifts_employee_id on public.shifts(employee_id);
create index if not exists idx_shifts_vehicle_id on public.shifts(vehicle_id);
create index if not exists idx_document_submissions_employee_id on public.document_submissions(employee_id);
create index if not exists idx_employee_documents_employee_id on public.employee_documents(employee_id);
create index if not exists idx_vacation_requests_employee_id on public.vacation_requests(employee_id);
create index if not exists idx_sickness_reports_employee_id on public.sickness_reports(employee_id);
create index if not exists idx_notifications_employee_id on public.notifications(employee_id);
create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_tasks_assignee_user_id on public.tasks(assignee_user_id);
create index if not exists idx_rides_employee_id on public.rides(employee_id);
create index if not exists idx_rides_series_id on public.rides(series_id);

-- Drop existing policies to keep the migration idempotent.
do $$
begin
  drop policy if exists profiles_select_self on public.profiles;
  drop policy if exists profiles_select_admin on public.profiles;
  drop policy if exists profiles_admin_insert on public.profiles;
  drop policy if exists profiles_admin_update on public.profiles;
  drop policy if exists profiles_admin_delete on public.profiles;

  drop policy if exists employees_select_admin on public.employees;
  drop policy if exists employees_select_dispatcher on public.employees;
  drop policy if exists employees_select_self on public.employees;
  drop policy if exists employees_admin_insert on public.employees;
  drop policy if exists employees_admin_update on public.employees;
  drop policy if exists employees_admin_delete on public.employees;

  drop policy if exists vehicles_select_admin_dispatcher on public.vehicles;
  drop policy if exists vehicles_admin_dispatcher_insert on public.vehicles;
  drop policy if exists vehicles_admin_dispatcher_update on public.vehicles;
  drop policy if exists vehicles_admin_delete on public.vehicles;

  drop policy if exists document_types_select_authenticated on public.document_types;
  drop policy if exists document_types_admin_manage on public.document_types;
  drop policy if exists document_types_admin_update on public.document_types;

  drop policy if exists ride_series_select_authenticated on public.ride_series;
  drop policy if exists ride_series_select_admin_dispatcher on public.ride_series;
  drop policy if exists ride_series_admin_manage on public.ride_series;
  drop policy if exists ride_series_admin_update on public.ride_series;

  drop policy if exists shifts_select_admin_dispatcher on public.shifts;
  drop policy if exists shifts_select_self_published on public.shifts;
  drop policy if exists shifts_admin_dispatcher_insert on public.shifts;
  drop policy if exists shifts_admin_dispatcher_update on public.shifts;
  drop policy if exists shifts_admin_delete on public.shifts;

  drop policy if exists plan_publications_select_admin_dispatcher on public.plan_publications;
  drop policy if exists plan_publications_select_employee_published on public.plan_publications;
  drop policy if exists plan_publications_admin_dispatcher_insert on public.plan_publications;
  drop policy if exists plan_publications_admin_dispatcher_update on public.plan_publications;
  drop policy if exists plan_publications_admin_delete on public.plan_publications;

  drop policy if exists absences_select_admin_dispatcher on public.absences;
  drop policy if exists absences_admin_insert on public.absences;
  drop policy if exists absences_admin_update on public.absences;
  drop policy if exists absences_admin_delete on public.absences;

  drop policy if exists vacation_requests_select_admin on public.vacation_requests;
  drop policy if exists vacation_requests_select_self on public.vacation_requests;
  drop policy if exists vacation_requests_employee_insert on public.vacation_requests;
  drop policy if exists vacation_requests_admin_update on public.vacation_requests;
  drop policy if exists vacation_requests_admin_delete on public.vacation_requests;

  drop policy if exists sickness_reports_select_admin on public.sickness_reports;
  drop policy if exists sickness_reports_select_self on public.sickness_reports;
  drop policy if exists sickness_reports_employee_insert on public.sickness_reports;
  drop policy if exists sickness_reports_admin_update on public.sickness_reports;
  drop policy if exists sickness_reports_admin_delete on public.sickness_reports;

  drop policy if exists document_submissions_select_admin on public.document_submissions;
  drop policy if exists document_submissions_select_self on public.document_submissions;
  drop policy if exists document_submissions_employee_insert on public.document_submissions;
  drop policy if exists document_submissions_admin_update on public.document_submissions;
  drop policy if exists document_submissions_admin_delete on public.document_submissions;

  drop policy if exists employee_documents_select_admin on public.employee_documents;
  drop policy if exists employee_documents_select_self on public.employee_documents;
  drop policy if exists employee_documents_admin_insert on public.employee_documents;
  drop policy if exists employee_documents_admin_update on public.employee_documents;
  drop policy if exists employee_documents_admin_delete on public.employee_documents;

  drop policy if exists notifications_select_self on public.notifications;
  drop policy if exists notifications_select_admin_dispatcher on public.notifications;
  drop policy if exists notifications_admin_dispatcher_insert on public.notifications;
  drop policy if exists notifications_update_self_read_at on public.notifications;

  drop policy if exists tasks_select_admin_dispatcher on public.tasks;
  drop policy if exists tasks_select_self on public.tasks;
  drop policy if exists tasks_admin_dispatcher_insert on public.tasks;
  drop policy if exists tasks_admin_dispatcher_update on public.tasks;
  drop policy if exists tasks_admin_delete on public.tasks;

  drop policy if exists customers_admin_dispatcher_select on public.customers;
  drop policy if exists customers_admin_dispatcher_insert on public.customers;
  drop policy if exists customers_admin_dispatcher_update on public.customers;
  drop policy if exists customers_admin_delete on public.customers;

  drop policy if exists rides_admin_dispatcher_select on public.rides;
  drop policy if exists rides_admin_dispatcher_insert on public.rides;
  drop policy if exists rides_admin_dispatcher_update on public.rides;
  drop policy if exists rides_admin_delete on public.rides;
end
$$;

-- Profiles.
create policy profiles_select_self
  on public.profiles
  as permissive
  for select
  to authenticated
  using (auth_user_id = (select auth.uid()));

create policy profiles_select_admin
  on public.profiles
  as permissive
  for select
  to authenticated
  using (private.is_admin());

create policy profiles_admin_insert
  on public.profiles
  as permissive
  for insert
  to authenticated
  with check (private.is_admin());

create policy profiles_admin_update
  on public.profiles
  as permissive
  for update
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy profiles_admin_delete
  on public.profiles
  as permissive
  for delete
  to authenticated
  using (private.is_admin());

-- Employees.
create policy employees_select_admin
  on public.employees
  as permissive
  for select
  to authenticated
  using (private.is_admin());

create policy employees_select_dispatcher
  on public.employees
  as permissive
  for select
  to authenticated
  using (private.is_dispatcher_or_admin());

create policy employees_select_self
  on public.employees
  as permissive
  for select
  to authenticated
  using (id = private.current_user_employee_id());

create policy employees_admin_insert
  on public.employees
  as permissive
  for insert
  to authenticated
  with check (private.is_admin());

create policy employees_admin_update
  on public.employees
  as permissive
  for update
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy employees_admin_delete
  on public.employees
  as permissive
  for delete
  to authenticated
  using (private.is_admin());

-- Vehicles.
create policy vehicles_select_admin_dispatcher
  on public.vehicles
  as permissive
  for select
  to authenticated
  using (
    private.is_dispatcher_or_admin()
    or exists (
      select 1
      from public.shifts as s
      where s.vehicle_id = vehicles.id
        and s.employee_id = private.current_user_employee_id()
        and s.plan_status = 'published'
    )
  );

create policy vehicles_admin_dispatcher_insert
  on public.vehicles
  as permissive
  for insert
  to authenticated
  with check (private.is_dispatcher_or_admin());

create policy vehicles_admin_dispatcher_update
  on public.vehicles
  as permissive
  for update
  to authenticated
  using (private.is_dispatcher_or_admin())
  with check (private.is_dispatcher_or_admin());

create policy vehicles_admin_delete
  on public.vehicles
  as permissive
  for delete
  to authenticated
  using (private.is_admin());

-- Document types and ride series.
create policy document_types_select_authenticated
  on public.document_types
  as permissive
  for select
  to authenticated
  using (true);

create policy document_types_admin_manage
  on public.document_types
  as permissive
  for insert
  to authenticated
  with check (private.is_admin());

create policy document_types_admin_update
  on public.document_types
  as permissive
  for update
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy ride_series_select_admin_dispatcher
  on public.ride_series
  as permissive
  for select
  to authenticated
  using (private.is_dispatcher_or_admin());

create policy ride_series_admin_manage
  on public.ride_series
  as permissive
  for insert
  to authenticated
  with check (private.is_dispatcher_or_admin());

create policy ride_series_admin_update
  on public.ride_series
  as permissive
  for update
  to authenticated
  using (private.is_dispatcher_or_admin())
  with check (private.is_dispatcher_or_admin());

-- Shifts.
create policy shifts_select_admin_dispatcher
  on public.shifts
  as permissive
  for select
  to authenticated
  using (private.is_dispatcher_or_admin());

create policy shifts_select_self_published
  on public.shifts
  as permissive
  for select
  to authenticated
  using (
    employee_id = private.current_user_employee_id()
    and plan_status = 'published'
  );

create policy shifts_admin_dispatcher_insert
  on public.shifts
  as permissive
  for insert
  to authenticated
  with check (private.is_dispatcher_or_admin());

create policy shifts_admin_dispatcher_update
  on public.shifts
  as permissive
  for update
  to authenticated
  using (private.is_dispatcher_or_admin())
  with check (private.is_dispatcher_or_admin());

create policy shifts_admin_delete
  on public.shifts
  as permissive
  for delete
  to authenticated
  using (private.is_admin());

-- Plan publications.
create policy plan_publications_select_admin_dispatcher
  on public.plan_publications
  as permissive
  for select
  to authenticated
  using (private.is_dispatcher_or_admin());

create policy plan_publications_select_employee_published
  on public.plan_publications
  as permissive
  for select
  to authenticated
  using (status = 'published');

create policy plan_publications_admin_dispatcher_insert
  on public.plan_publications
  as permissive
  for insert
  to authenticated
  with check (private.is_dispatcher_or_admin());

create policy plan_publications_admin_dispatcher_update
  on public.plan_publications
  as permissive
  for update
  to authenticated
  using (private.is_dispatcher_or_admin())
  with check (private.is_dispatcher_or_admin());

create policy plan_publications_admin_delete
  on public.plan_publications
  as permissive
  for delete
  to authenticated
  using (private.is_admin());

-- Absences.
create policy absences_select_admin_dispatcher
  on public.absences
  as permissive
  for select
  to authenticated
  using (private.is_dispatcher_or_admin());

create policy absences_admin_insert
  on public.absences
  as permissive
  for insert
  to authenticated
  with check (private.is_admin());

create policy absences_admin_update
  on public.absences
  as permissive
  for update
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy absences_admin_delete
  on public.absences
  as permissive
  for delete
  to authenticated
  using (private.is_admin());

-- Vacation requests.
create policy vacation_requests_select_admin
  on public.vacation_requests
  as permissive
  for select
  to authenticated
  using (private.is_admin());

create policy vacation_requests_select_self
  on public.vacation_requests
  as permissive
  for select
  to authenticated
  using (employee_id = private.current_user_employee_id());

create policy vacation_requests_employee_insert
  on public.vacation_requests
  as permissive
  for insert
  to authenticated
  with check (
    employee_id = private.current_user_employee_id()
    and status = 'requested'
    and processed_at is null
    and processed_by is null
  );

create policy vacation_requests_admin_update
  on public.vacation_requests
  as permissive
  for update
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy vacation_requests_admin_delete
  on public.vacation_requests
  as permissive
  for delete
  to authenticated
  using (private.is_admin());

-- Sickness reports.
create policy sickness_reports_select_admin
  on public.sickness_reports
  as permissive
  for select
  to authenticated
  using (private.is_admin());

create policy sickness_reports_select_self
  on public.sickness_reports
  as permissive
  for select
  to authenticated
  using (employee_id = private.current_user_employee_id());

create policy sickness_reports_employee_insert
  on public.sickness_reports
  as permissive
  for insert
  to authenticated
  with check (
    employee_id = private.current_user_employee_id()
    and status = 'submitted'
  );

create policy sickness_reports_admin_update
  on public.sickness_reports
  as permissive
  for update
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy sickness_reports_admin_delete
  on public.sickness_reports
  as permissive
  for delete
  to authenticated
  using (private.is_admin());

-- Document submissions.
create policy document_submissions_select_admin
  on public.document_submissions
  as permissive
  for select
  to authenticated
  using (private.is_admin());

create policy document_submissions_select_self
  on public.document_submissions
  as permissive
  for select
  to authenticated
  using (employee_id = private.current_user_employee_id());

create policy document_submissions_employee_insert
  on public.document_submissions
  as permissive
  for insert
  to authenticated
  with check (
    employee_id = private.current_user_employee_id()
    and status = 'submitted'
    and reviewed_at is null
    and reviewed_by is null
  );

create policy document_submissions_admin_update
  on public.document_submissions
  as permissive
  for update
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy document_submissions_admin_delete
  on public.document_submissions
  as permissive
  for delete
  to authenticated
  using (private.is_admin());

-- Employee documents.
create policy employee_documents_select_admin
  on public.employee_documents
  as permissive
  for select
  to authenticated
  using (private.is_admin());

create policy employee_documents_select_self
  on public.employee_documents
  as permissive
  for select
  to authenticated
  using (employee_id = private.current_user_employee_id());

create policy employee_documents_admin_insert
  on public.employee_documents
  as permissive
  for insert
  to authenticated
  with check (private.is_admin());

create policy employee_documents_admin_update
  on public.employee_documents
  as permissive
  for update
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy employee_documents_admin_delete
  on public.employee_documents
  as permissive
  for delete
  to authenticated
  using (private.is_admin());

-- Notifications.
create policy notifications_select_self
  on public.notifications
  as permissive
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or employee_id = private.current_user_employee_id()
  );

create policy notifications_select_admin_dispatcher
  on public.notifications
  as permissive
  for select
  to authenticated
  using (private.is_dispatcher_or_admin());

create policy notifications_admin_dispatcher_insert
  on public.notifications
  as permissive
  for insert
  to authenticated
  with check (private.is_dispatcher_or_admin());

create policy notifications_update_self_read_at
  on public.notifications
  as permissive
  for update
  to authenticated
  using (
    user_id = (select auth.uid())
    or employee_id = private.current_user_employee_id()
  )
  with check (
    user_id = (select auth.uid())
    or employee_id = private.current_user_employee_id()
  );

-- Tasks.
create policy tasks_select_admin_dispatcher
  on public.tasks
  as permissive
  for select
  to authenticated
  using (private.is_dispatcher_or_admin());

create policy tasks_select_self
  on public.tasks
  as permissive
  for select
  to authenticated
  using (assignee_user_id = (select auth.uid()));

create policy tasks_admin_dispatcher_insert
  on public.tasks
  as permissive
  for insert
  to authenticated
  with check (private.is_dispatcher_or_admin());

create policy tasks_admin_dispatcher_update
  on public.tasks
  as permissive
  for update
  to authenticated
  using (private.is_dispatcher_or_admin())
  with check (private.is_dispatcher_or_admin());

create policy tasks_admin_delete
  on public.tasks
  as permissive
  for delete
  to authenticated
  using (private.is_admin());

-- Customers and rides.
create policy customers_admin_dispatcher_select
  on public.customers
  as permissive
  for select
  to authenticated
  using (private.is_dispatcher_or_admin());

create policy customers_admin_dispatcher_insert
  on public.customers
  as permissive
  for insert
  to authenticated
  with check (private.is_dispatcher_or_admin());

create policy customers_admin_dispatcher_update
  on public.customers
  as permissive
  for update
  to authenticated
  using (private.is_dispatcher_or_admin())
  with check (private.is_dispatcher_or_admin());

create policy customers_admin_delete
  on public.customers
  as permissive
  for delete
  to authenticated
  using (private.is_admin());

create policy rides_admin_dispatcher_select
  on public.rides
  as permissive
  for select
  to authenticated
  using (private.is_dispatcher_or_admin());

create policy rides_admin_dispatcher_insert
  on public.rides
  as permissive
  for insert
  to authenticated
  with check (private.is_dispatcher_or_admin());

create policy rides_admin_dispatcher_update
  on public.rides
  as permissive
  for update
  to authenticated
  using (private.is_dispatcher_or_admin())
  with check (private.is_dispatcher_or_admin());

create policy rides_admin_delete
  on public.rides
  as permissive
  for delete
  to authenticated
  using (private.is_admin());
