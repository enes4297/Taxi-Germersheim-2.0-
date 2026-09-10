-- 011_employee_documents_storage.sql
--
-- Privater Dokumentenupload fuer Mitarbeiternachweise.
--
-- Ausgangslage laut produktiver Bestandsaufnahme vom 10.09.2026:
--   storage.buckets leer, keine Policies auf storage.buckets/storage.objects,
--   RLS auf beiden Tabellen aktiv, FORCE RLS false,
--   public.document_types leer.
--
-- Diese Migration legt an:
--   1. den privaten Bucket 'employee-documents' (10 MB, nur PDF/JPEG/PNG)
--   2. die vier Dokumenttypen, wiederholbar ohne Duplikate
--   3. Storage-Policies: Mitarbeiter nur im eigenen Ordner, Admins lesend
--   4. verschaerfte Insert-Policies fuer document_submissions und
--      sickness_reports, damit Dateipfade und Anhaenge serverseitig an den
--      angemeldeten Nutzer gebunden sind
--
-- Ausdruecklich NICHT enthalten:
--   - keine oeffentlichen Buckets, keine oeffentlichen URLs
--   - keine UPDATE-Policy auf storage.objects (kein Ueberschreiben, auch
--     nicht eigener Dateien)
--   - keine breiten Loeschrechte: Mitarbeiter duerfen ausschliesslich im
--     eigenen Ordner loeschen, damit ein verwaister Upload nach einem
--     fehlgeschlagenen Datensatz bereinigt werden kann
--   - kein Freigabe- oder Pruefprozess (bleibt spaeterer Schritt)
--   - keine Aenderung an bestehenden Migrationsdateien
--
-- Pfadkonvention
--   <auth.uid()>/<jahr>/<zufalls-uuid>.<endung>
--   Der erste Ordner ist immer die auth.uid() des Hochladenden. Sie stammt
--   aus dem JWT und ist clientseitig nicht faelschbar.

-- ---------------------------------------------------------------------------
-- 1) Privater Bucket
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'employee-documents',
  'employee-documents',
  false,                                                  -- niemals oeffentlich
  10485760,                                               -- 10 MB
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do update
  set public             = false,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- 2) Dokumenttypen (wiederholbar, key ist unique)
-- ---------------------------------------------------------------------------
insert into public.document_types (key, label)
values
  ('fuehrerschein',                'Führerschein'),
  ('personenbefoerderungsschein',  'Personenbeförderungsschein'),
  ('krankenschein_au',             'Krankenschein / AU'),
  ('sonstiges',                    'Sonstiges')
on conflict (key) do update
  set label = excluded.label;

-- ---------------------------------------------------------------------------
-- 3) Rechte und Policies auf storage.objects
-- ---------------------------------------------------------------------------
-- Grants entsprechen dem Supabase-Standard; RLS bleibt die eigentliche Grenze.
grant select, insert, delete on storage.objects to authenticated;
revoke all on storage.objects from anon;

do $$
begin
  drop policy if exists employee_documents_insert_own  on storage.objects;
  drop policy if exists employee_documents_select_own  on storage.objects;
  drop policy if exists employee_documents_select_admin on storage.objects;
  drop policy if exists employee_documents_delete_own  on storage.objects;
end
$$;

-- Hochladen: ausschliesslich in den eigenen Ordner des angemeldeten Nutzers.
create policy employee_documents_insert_own
  on storage.objects
  as permissive
  for insert
  to authenticated
  with check (
    bucket_id = 'employee-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Lesen: eigene Dateien.
create policy employee_documents_select_own
  on storage.objects
  as permissive
  for select
  to authenticated
  using (
    bucket_id = 'employee-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Lesen: aktive Admins duerfen alle Nachweise im Bucket ansehen.
-- private.is_admin() prueft auth.uid(), profiles.active und die Rolle.
create policy employee_documents_select_admin
  on storage.objects
  as permissive
  for select
  to authenticated
  using (
    bucket_id = 'employee-documents'
    and private.is_admin()
  );

-- Loeschen: nur im eigenen Ordner. Zweck ist die Bereinigung eines verwaisten
-- Uploads, wenn direkt danach das Speichern des Datensatzes scheitert.
-- Bewusst KEINE Loeschrechte fuer fremde Dateien und keine fuer Admins -
-- ein Aufraeumprozess mit weiter reichenden Rechten waere ein eigener Schritt.
create policy employee_documents_delete_own
  on storage.objects
  as permissive
  for delete
  to authenticated
  using (
    bucket_id = 'employee-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Bewusst keine UPDATE-Policy: Dateien koennen nicht ueberschrieben werden,
-- auch nicht die eigenen. Jeder Upload bekommt einen eindeutigen Namen.

-- ---------------------------------------------------------------------------
-- 4) Dateipfad serverseitig an den angemeldeten Nutzer binden
-- ---------------------------------------------------------------------------
-- Ergaenzt die Policy aus 002 um die Pfadbindung. Ohne diese Bedingung koennte
-- ein Mitarbeiter zwar keine fremde Datei hochladen, aber einen fremden
-- Dateipfad in seinen eigenen Datensatz eintragen.
drop policy if exists document_submissions_employee_insert on public.document_submissions;
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
    and (
      file_path is null
      or split_part(file_path, '/', 1) = (select auth.uid())::text
    )
  );

-- ---------------------------------------------------------------------------
-- 5) Fremde Anhaenge an Krankmeldungen ausschliessen
-- ---------------------------------------------------------------------------
-- Ergaenzt die Policy aus 002: Ein verknuepfter Nachweis muss dem eigenen
-- Mitarbeiter gehoeren. Ohne diese Bedingung koennte eine fremde
-- document_submission-ID an die eigene Krankmeldung gehaengt werden.
drop policy if exists sickness_reports_employee_insert on public.sickness_reports;
create policy sickness_reports_employee_insert
  on public.sickness_reports
  as permissive
  for insert
  to authenticated
  with check (
    employee_id = private.current_user_employee_id()
    and status = 'submitted'
    and (
      document_submission_id is null
      or exists (
        select 1
        from public.document_submissions as ds
        where ds.id = document_submission_id
          and ds.employee_id = private.current_user_employee_id()
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 6) Index fuer den Dokumenteingang im Adminbereich
-- ---------------------------------------------------------------------------
create index if not exists idx_document_submissions_submitted_at
  on public.document_submissions(submitted_at desc);

comment on policy employee_documents_insert_own on storage.objects is
  'Mitarbeiter laden ausschliesslich in den eigenen Ordner <auth.uid()>/... hoch (011).';
comment on policy employee_documents_select_admin on storage.objects is
  'Aktive Admins duerfen alle Nachweise im Bucket lesen (011).';
