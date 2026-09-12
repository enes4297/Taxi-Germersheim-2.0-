-- 14_dashboard_policies.sql
--
-- Bildet Schritt 3 des Einrichtungswegs nach: die vier Storage-Policies, die
-- im Supabase-Dashboard von Hand angelegt werden. Wortlaut exakt wie in
-- supabase/setup/storage-policies-dashboard.md.
--
-- Wird lokal als supabase_storage_admin ausgefuehrt, weil im Projekt die
-- Projektrolle sie nicht anlegen kann.
--
-- REIHENFOLGE: Die DELETE-Policy kommt zuletzt, nach dem Trigger.
--
-- ===========================================================================
-- KEINE MIGRATION. Nur fuer die lokale, isolierte PostgreSQL-Instanz.
-- ===========================================================================

drop policy if exists employee_documents_insert_own      on storage.objects;
drop policy if exists employee_documents_select_own      on storage.objects;
drop policy if exists employee_documents_select_admin    on storage.objects;
drop policy if exists employee_documents_delete_unlinked on storage.objects;

create policy employee_documents_insert_own
  on storage.objects
  as permissive
  for insert
  to authenticated
  with check (
    bucket_id = 'employee-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and private.is_active_employee()
  );

create policy employee_documents_select_own
  on storage.objects
  as permissive
  for select
  to authenticated
  using (
    bucket_id = 'employee-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and private.is_active_employee()
  );

create policy employee_documents_select_admin
  on storage.objects
  as permissive
  for select
  to authenticated
  using (
    bucket_id = 'employee-documents'
    and private.is_admin()
  );

-- ZULETZT: erst ab hier darf ueberhaupt geloescht werden.
create policy employee_documents_delete_unlinked
  on storage.objects
  as permissive
  for delete
  to authenticated
  using (
    bucket_id = 'employee-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and private.is_active_employee()
    and private.is_unlinked_document(name)
  );

select policyname, cmd, roles::text
  from pg_policies
 where schemaname = 'storage' and tablename = 'objects'
 order by policyname;
