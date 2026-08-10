-- Supabase schema scaffold for future backend integration.
-- This file is not executed in the current demo setup.

create extension if not exists "uuid-ossp";

create table if not exists public.profiles (
  id uuid primary key default uuid_generate_v4(),
  auth_user_id uuid,
  employee_id uuid null,
  display_name text,
  role text not null default 'employee',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.employees (
  id uuid primary key default uuid_generate_v4(),
  first_name text,
  last_name text,
  phone text,
  email text,
  employment_type text,
  status text,
  active boolean not null default true,
  portal_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vehicles (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  license_plate text,
  vehicle_type text,
  seats integer,
  wheelchair_accessible boolean default false,
  status text,
  mileage integer,
  tuv_due_date date,
  service_due_date date,
  insurance_due_date date,
  tire_status text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shifts (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid not null references public.employees(id) on delete restrict,
  shift_date date not null,
  start_time text,
  end_time text,
  status text not null default 'draft',
  vehicle_id uuid references public.vehicles(id) on delete set null,
  note text,
  plan_status text not null default 'draft',
  created_by text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.plan_publications (
  id uuid primary key default uuid_generate_v4(),
  plan_date date not null,
  status text not null default 'draft',
  version integer not null default 1,
  published_at timestamptz,
  published_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.absences (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid not null references public.employees(id) on delete restrict,
  type text not null,
  start_date date not null,
  end_date date not null,
  status text not null default 'requested',
  note text,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vacation_requests (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid not null references public.employees(id) on delete restrict,
  start_date date not null,
  end_date date not null,
  note text,
  status text not null default 'requested',
  submitted_at timestamptz not null default now(),
  processed_at timestamptz,
  processed_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sickness_reports (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid not null references public.employees(id) on delete restrict,
  start_date date not null,
  expected_end_date date,
  note text,
  submission_source text,
  document_submission_id uuid,
  status text not null default 'submitted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.document_types (
  id uuid primary key default uuid_generate_v4(),
  key text not null unique,
  label text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.employee_documents (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid not null references public.employees(id) on delete restrict,
  document_type_id uuid references public.document_types(id) on delete set null,
  document_number text,
  issued_at date,
  valid_until date,
  issuing_authority text,
  status text not null default 'submitted',
  review_status text,
  reminder_days integer,
  note text,
  file_path text,
  reviewed_at timestamptz,
  reviewed_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.document_submissions (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid not null references public.employees(id) on delete restrict,
  document_type_id uuid references public.document_types(id) on delete set null,
  file_path text,
  file_name text,
  mime_type text,
  status text not null default 'submitted',
  note text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid,
  employee_id uuid,
  type text not null,
  title text not null,
  message text,
  priority text,
  read_at timestamptz,
  related_entity_type text,
  related_entity_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  assignee_user_id uuid,
  due_date date,
  priority text,
  status text not null default 'open',
  related_entity_type text,
  related_entity_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default uuid_generate_v4(),
  customer_type text,
  name text,
  facility text,
  phone text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rides (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid references public.customers(id) on delete set null,
  employee_id uuid references public.employees(id) on delete set null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  ride_date date,
  ride_time text,
  pickup text,
  destination text,
  ride_type text,
  status text,
  passengers integer,
  note text,
  series_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ride_series (
  id uuid primary key default uuid_generate_v4(),
  name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_shifts_employee_id on public.shifts(employee_id);
create index if not exists idx_shifts_shift_date on public.shifts(shift_date);
create index if not exists idx_shifts_status on public.shifts(status);
create index if not exists idx_plan_publications_plan_date on public.plan_publications(plan_date);
create index if not exists idx_absences_employee_id on public.absences(employee_id);
create index if not exists idx_vacation_requests_employee_id on public.vacation_requests(employee_id);
create index if not exists idx_employee_documents_employee_id on public.employee_documents(employee_id);
create index if not exists idx_notifications_employee_id on public.notifications(employee_id);
create index if not exists idx_rides_customer_id on public.rides(customer_id);
