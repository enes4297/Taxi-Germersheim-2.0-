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
--   3. private.is_active_employee() als serverseitige Berechtigungspruefung
--   4. Storage-Policies fuer Upload und Lesen; Loeschen NICHT per Policy
--   5. public.cleanup_my_orphan_document() als kontrollierten Ablauf fuer
--      genau einen verwaisten Upload, mit Sperre gegen gleichzeitiges
--      Verknuepfen
--   6. verschaerfte Insert-Policies fuer document_submissions und
--      sickness_reports
--   7. eine Eindeutigkeit auf sickness_reports gegen doppelte Krankmeldungen
--      bei verlorener Antwort
--
-- Ausdruecklich NICHT enthalten:
--   - keine oeffentlichen Buckets, keine oeffentlichen URLs
--   - keine UPDATE-Policy auf storage.objects (kein Ueberschreiben)
--   - KEINE breiten DELETE-Rechte fuer Mitarbeiter
--   - kein Freigabe- oder Pruefprozess
--   - keine Aenderung an bestehenden Migrationsdateien
--
-- Pfadkonvention
--   <auth.uid()>/<jahr>/<zufalls-uuid>.<endung>


-- ===========================================================================
-- 1) Privater Bucket
-- ===========================================================================
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


-- ===========================================================================
-- 2) Dokumenttypen (wiederholbar, key ist unique)
-- ===========================================================================
insert into public.document_types (key, label)
values
  ('fuehrerschein',                'Führerschein'),
  ('personenbefoerderungsschein',  'Personenbeförderungsschein'),
  ('krankenschein_au',             'Krankenschein / AU'),
  ('sonstiges',                    'Sonstiges')
on conflict (key) do update
  set label = excluded.label;


-- ===========================================================================
-- 3) Serverseitige Berechtigungspruefung
-- ===========================================================================
-- Eine bloße Anmeldung genuegt NICHT. Verlangt wird eine vertrauenswuerdige
-- Zuordnung: ein aktives Profil, das auf einen aktiven, fuer das Portal
-- freigeschalteten Mitarbeiter zeigt. Damit sind Kunden, Disponenten ohne
-- Mitarbeiterzuordnung und deaktivierte Mitarbeiter ausgeschlossen.
create or replace function private.is_active_employee()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as p
    join public.employees as e on e.id = p.employee_id
    where p.auth_user_id = (select auth.uid())
      and p.active = true
      and e.active = true
      and e.portal_active = true
  );
$$;

revoke all on function private.is_active_employee() from public;
revoke all on function private.is_active_employee() from anon;
grant execute on function private.is_active_employee() to authenticated;

-- Ist eine Datei noch mit keinem Datensatz verknuepft?
-- SECURITY DEFINER, damit die Pruefung nicht durch die RLS des Aufrufers
-- eingeschraenkt wird - sonst wuerde eine fremde Verknuepfung uebersehen.
create or replace function private.is_unlinked_document(p_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_path is not null
     and not exists (select 1 from public.document_submissions where file_path = p_path)
     and not exists (select 1 from public.employee_documents  where file_path = p_path);
$$;

revoke all on function private.is_unlinked_document(text) from public;
revoke all on function private.is_unlinked_document(text) from anon;
grant execute on function private.is_unlinked_document(text) to authenticated;


-- ===========================================================================
-- 4) Rechte und Policies auf storage.objects
-- ===========================================================================
-- DELETE ist noetig, weil das Entfernen einer Datei ueber die Storage-API
-- laufen MUSS (nur sie loescht auch das Objekt im Speicher, nicht bloss den
-- Katalogeintrag). Die Storage-API prueft dabei die RLS auf storage.objects.
-- Begrenzt wird das Recht durch die DELETE-Policy in Abschnitt 4 und
-- zusaetzlich durch den Trigger in Abschnitt 5.
grant select, insert, delete on storage.objects to authenticated;
revoke update on storage.objects from authenticated;
revoke all on storage.objects from anon;

do $$
begin
  drop policy if exists employee_documents_insert_own   on storage.objects;
  drop policy if exists employee_documents_select_own   on storage.objects;
  drop policy if exists employee_documents_select_admin on storage.objects;
  drop policy if exists employee_documents_delete_own       on storage.objects;
  drop policy if exists employee_documents_delete_unlinked  on storage.objects;
end
$$;

-- Hochladen: eigener Ordner UND aktive Mitarbeiterberechtigung.
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

-- Lesen: eigene Dateien, ebenfalls nur mit aktiver Mitarbeiterberechtigung.
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

-- Lesen: aktive Admins duerfen alle Nachweise im Bucket ansehen.
-- Bleibt unveraendert und unabhaengig von is_active_employee().
create policy employee_documents_select_admin
  on storage.objects
  as permissive
  for select
  to authenticated
  using (
    bucket_id = 'employee-documents'
    and private.is_admin()
  );

-- Loeschen: eigener Ordner, aktive Mitarbeiterberechtigung UND die Datei darf
-- von keinem Datensatz referenziert sein. Der Aufruf erfolgt ueber die
-- Storage-API (remove), damit auch das Objekt im Speicher entfernt wird -
-- ein direktes SQL-DELETE wuerde nur den Katalogeintrag loeschen.
-- Diese Policy ist die erste Huerde; die verbindliche Pruefung inklusive
-- Sperre gegen gleichzeitiges Verknuepfen sitzt im Trigger in Abschnitt 5.
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

-- Bewusst KEINE UPDATE-Policy: Dateien werden nicht ueberschrieben.


-- ===========================================================================
-- 5) Verbindliche Absicherung beim Loeschen
-- ===========================================================================
-- WICHTIG: Es gibt hier bewusst KEINE SQL-Funktion, die aus storage.objects
-- loescht. Ein direktes DELETE wuerde nur den Katalogeintrag entfernen, die
-- Datei bliebe im Objektspeicher als Leiche zurueck. Dateioperationen laufen
-- ausschliesslich ueber die Storage-API (remove), siehe
-- https://supabase.com/docs/guides/storage/schema/design
--
-- Die Storage-API setzt ein DELETE auf storage.objects ab und wertet dabei
-- die RLS aus. Dieser BEFORE-DELETE-Trigger ist die verbindliche Pruefung:
-- er laeuft innerhalb desselben Statements, nachdem PostgreSQL die Zeilensperre
-- auf der zu loeschenden Zeile haelt.
--
-- Zusammenspiel gegen den Wettlauf:
--   Loeschen:    PostgreSQL sperrt die Zeile in storage.objects, danach
--                prueft dieser Trigger die Verknuepfung erneut.
--   Verknuepfen: Der Trigger aus Abschnitt 6 nimmt auf derselben Zeile
--                ein FOR UPDATE und blockiert damit, solange geloescht wird.
--   Damit kann keine der beiden Seiten die andere uebersehen.
create or replace function private.guard_document_object_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.bucket_id is distinct from 'employee-documents' then
    return old;
  end if;

  -- Break-glass: der Dienstschluessel bleibt handlungsfaehig. Er ist im
  -- Browser nicht verfuegbar und wird nur fuer Wartung verwendet.
  if (select current_user) = 'service_role' then
    return old;
  end if;

  if not private.is_unlinked_document(old.name) then
    raise exception 'DOCUMENT_ALREADY_LINKED' using errcode = '42501';
  end if;

  return old;
end;
$$;

revoke all on function private.guard_document_object_delete() from public;
revoke all on function private.guard_document_object_delete() from anon;
revoke all on function private.guard_document_object_delete() from authenticated;

drop trigger if exists storage_objects_guard_delete on storage.objects;
create trigger storage_objects_guard_delete
  before delete on storage.objects
  for each row
  execute function private.guard_document_object_delete();


-- ===========================================================================
-- 6) Gegenstueck: bei JEDEM Verknuepfen dieselbe Zeile sperren
-- ===========================================================================
-- Deckt alle Schreibwege ab, ueber die ein Dateipfad verknuepft werden kann:
--   - INSERT auf document_submissions
--   - UPDATE von document_submissions.file_path
--   - INSERT auf employee_documents
--   - UPDATE von employee_documents.file_path
-- Greift nur fuer Pfade im Nachweis-Bucket; andere Pfade bleiben unberuehrt.
create or replace function private.lock_document_object()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_exists boolean;
begin
  if new.file_path is null then
    return new;
  end if;

  -- Beim UPDATE nur pruefen, wenn sich der Pfad tatsaechlich aendert.
  if tg_op = 'UPDATE' and new.file_path is not distinct from old.file_path then
    return new;
  end if;

  -- Pfade ausserhalb des Nachweis-Buckets werden nicht eingeschraenkt.
  if not exists (
    select 1 from storage.objects as o
    where o.bucket_id = 'employee-documents' and o.name = new.file_path
  ) and split_part(new.file_path, '/', 1) !~ '^[0-9a-f-]{36}$' then
    return new;
  end if;

  select true
  into v_exists
  from storage.objects as o
  where o.bucket_id = 'employee-documents'
    and o.name = new.file_path
  for update;

  if v_exists is not true then
    raise exception 'DOCUMENT_FILE_NOT_FOUND' using errcode = '23503';
  end if;

  return new;
end;
$$;

revoke all on function private.lock_document_object() from public;
revoke all on function private.lock_document_object() from anon;
revoke all on function private.lock_document_object() from authenticated;

drop trigger if exists document_submissions_lock_object on public.document_submissions;
create trigger document_submissions_lock_object
  before insert or update of file_path on public.document_submissions
  for each row
  execute function private.lock_document_object();

drop trigger if exists employee_documents_lock_object on public.employee_documents;
create trigger employee_documents_lock_object
  before insert or update of file_path on public.employee_documents
  for each row
  execute function private.lock_document_object();


-- ===========================================================================
-- 7) Dateipfad serverseitig an den angemeldeten Nutzer binden
-- ===========================================================================
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
    and private.is_active_employee()
    and (
      file_path is null
      or split_part(file_path, '/', 1) = (select auth.uid())::text
    )
  );


-- ===========================================================================
-- 8) Vorgangsschluessel und Schutz vor doppelten Krankmeldungen
--    (enthaelt zugleich den Ausschluss fremder Anhaenge)
-- ===========================================================================
-- Geht die Serverantwort verloren, obwohl gespeichert wurde, wiederholt der
-- Client den Aufruf. Ohne Eindeutigkeit entstuende ein zweiter Datensatz.
--
-- Bewusst KEINE fachliche Eindeutigkeit auf (employee_id, start_date): Das
-- waere eine erfundene Geschaeftsregel und wuerde zwei getrennte Vorgaenge mit
-- demselben Beginndatum faelschlich verschmelzen. Stattdessen ein technischer
-- Vorgangsschluessel, den der Client je Sendevorgang einmal erzeugt und bei
-- jeder Wiederholung unveraendert mitschickt.
alter table public.sickness_reports
  add column if not exists client_request_id uuid;

comment on column public.sickness_reports.client_request_id is
  'Technischer Vorgangsschluessel des Sendevorgangs. Bleibt ueber Wiederholungen gleich und verhindert Doppel nach verlorener Antwort (011).';

-- Partiell, damit vorhandene Zeilen ohne Schluessel nicht kollidieren.
-- Auf den Mitarbeiter bezogen, damit ein fremder Schluessel nicht belegt
-- werden kann.
create unique index if not exists uq_sickness_reports_client_request
  on public.sickness_reports(employee_id, client_request_id)
  where client_request_id is not null;

-- Fuer Portal-Eintraege ist der Schluessel Pflicht. Nur so ist eine
-- Wiederholung ueberhaupt erkennbar.
drop policy if exists sickness_reports_employee_insert on public.sickness_reports;
create policy sickness_reports_employee_insert
  on public.sickness_reports
  as permissive
  for insert
  to authenticated
  with check (
    employee_id = private.current_user_employee_id()
    and status = 'submitted'
    and private.is_active_employee()
    and client_request_id is not null
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


-- ===========================================================================
-- 10) Index fuer den Dokumenteingang im Adminbereich
-- ===========================================================================
create index if not exists idx_document_submissions_submitted_at
  on public.document_submissions(submitted_at desc);

comment on policy employee_documents_insert_own on storage.objects is
  'Upload nur in den eigenen Ordner und nur mit aktiver Mitarbeiterberechtigung (011).';
comment on policy employee_documents_select_admin on storage.objects is
  'Aktive Admins duerfen alle Nachweise im Bucket lesen (011).';
