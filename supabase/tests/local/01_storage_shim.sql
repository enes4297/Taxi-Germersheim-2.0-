-- 01_storage_shim.sql
--
-- Ergaenzung der Supabase-Testnachbildung um das Storage-Schema.
--
-- ===========================================================================
-- KEINE MIGRATION. Nur fuer die lokale, isolierte PostgreSQL-Instanz.
-- Darf niemals gegen ein Supabase-Projekt laufen.
-- ===========================================================================
--
-- Nachgebildet wird so viel, wie Migration 011 und die Policy-Tests brauchen:
--   storage.buckets, storage.objects, storage.foldername()
--
-- GRENZE: Das ist NUR die Datenbankseite. Die eigentliche Storage-API
-- (Upload, Download, signierte URLs, Groessen- und MIME-Pruefung) laeuft in
-- Supabase in einem eigenen Dienst und wird hier NICHT nachgebildet.
-- file_size_limit und allowed_mime_types werden von diesem Dienst
-- durchgesetzt, nicht von PostgreSQL - lokal sind sie deshalb nur als Wert
-- pruefbar, nicht in ihrer Wirkung.

create schema if not exists storage;
grant usage on schema storage to anon, authenticated, service_role;

create table if not exists storage.buckets (
  id                 text primary key,
  name               text not null,
  owner              uuid,
  public             boolean not null default false,
  avif_autodetection boolean not null default false,
  file_size_limit    bigint,
  allowed_mime_types text[],
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table if not exists storage.objects (
  id               uuid primary key default gen_random_uuid(),
  bucket_id        text references storage.buckets(id),
  name             text,
  owner            uuid,
  owner_id         text,
  metadata         jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  last_accessed_at timestamptz not null default now()
);

create unique index if not exists storage_objects_bucket_name_key
  on storage.objects(bucket_id, name);

-- Entspricht der Supabase-Funktion: alle Pfadteile ohne den Dateinamen.
create or replace function storage.foldername(name text)
returns text[]
language plpgsql
immutable
as $$
declare
  parts text[];
begin
  parts := string_to_array(name, '/');
  return parts[1 : greatest(array_length(parts, 1) - 1, 0)];
end;
$$;

grant execute on function storage.foldername(text) to anon, authenticated, service_role;

alter table storage.buckets enable row level security;
alter table storage.objects enable row level security;

-- Buckets sind fuer angemeldete Nutzer lesbar (wie in Supabase ueblich),
-- damit der Client Limits kennt. Schreiben bleibt ohne Policy gesperrt.
drop policy if exists shim_buckets_select on storage.buckets;
create policy shim_buckets_select
  on storage.buckets for select to authenticated using (true);

grant select on storage.buckets to authenticated;
revoke all on storage.buckets from anon;

select 'Storage-Shim eingerichtet' as status;
