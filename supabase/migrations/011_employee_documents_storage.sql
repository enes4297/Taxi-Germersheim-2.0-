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
grant select, insert on storage.objects to authenticated;
-- Keine breiten Loeschrechte: Bereinigung laeuft ausschliesslich ueber die
-- kontrollierte Funktion in Abschnitt 5.
revoke delete, update on storage.objects from authenticated;
revoke all on storage.objects from anon;

do $$
begin
  drop policy if exists employee_documents_insert_own   on storage.objects;
  drop policy if exists employee_documents_select_own   on storage.objects;
  drop policy if exists employee_documents_select_admin on storage.objects;
  drop policy if exists employee_documents_delete_own   on storage.objects;
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

-- Bewusst KEINE UPDATE- und KEINE DELETE-Policy fuer Mitarbeiter.


-- ===========================================================================
-- 5) Kontrollierte Bereinigung genau eines verwaisten Uploads
-- ===========================================================================
-- Warum keine reine Policy?
--   Eine DELETE-Policy koennte die Verknuepfung nur zum Zeitpunkt ihrer
--   Auswertung pruefen. Ein gleichzeitiges Einfuegen in
--   document_submissions koennte danach committen - zurueck bliebe ein
--   Datensatz, dessen Datei nicht mehr existiert.
--
-- Loesung: beide Seiten sperren dieselbe Zeile in storage.objects.
--   - Diese Funktion nimmt die Sperre und prueft DANACH die Verknuepfung.
--   - Der Trigger in Abschnitt 6 nimmt beim Verknuepfen dieselbe Sperre.
--   Damit kann keine der beiden Seiten die andere uebersehen.
create or replace function public.cleanup_my_orphan_document(p_path text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_object_id uuid;
begin
  if not private.is_active_employee() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if p_path is null
     or split_part(p_path, '/', 1) is distinct from (select auth.uid())::text then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  -- Erst sperren, dann pruefen.
  select o.id
  into v_object_id
  from storage.objects as o
  where o.bucket_id = 'employee-documents'
    and o.name = p_path
  for update;

  if v_object_id is null then
    return false;                       -- nichts zu bereinigen
  end if;

  if not private.is_unlinked_document(p_path) then
    raise exception 'DOCUMENT_ALREADY_LINKED' using errcode = '42501';
  end if;

  delete from storage.objects where id = v_object_id;
  return true;
end;
$$;

revoke all on function public.cleanup_my_orphan_document(text) from public;
revoke all on function public.cleanup_my_orphan_document(text) from anon;
grant execute on function public.cleanup_my_orphan_document(text) to authenticated;

comment on function public.cleanup_my_orphan_document(text) is
  'Entfernt genau einen noch unverknuepften eigenen Upload. Sperrt die Zeile in storage.objects und prueft danach die Verknuepfung (011).';


-- ===========================================================================
-- 6) Gegenstueck: beim Verknuepfen dieselbe Zeile sperren
-- ===========================================================================
-- Verhindert, dass ein Datensatz auf eine Datei zeigt, die im selben Moment
-- bereinigt wird. Greift nur fuer Pfade im Nachweis-Bucket.
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
  before insert on public.document_submissions
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
-- 8) Fremde Anhaenge an Krankmeldungen ausschliessen
-- ===========================================================================
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
-- 9) Keine doppelte Krankmeldung bei verlorener Antwort
-- ===========================================================================
-- Geht die Serverantwort verloren, obwohl gespeichert wurde, wiederholt der
-- Client den Aufruf. Ohne Eindeutigkeit entstuende ein zweiter Datensatz.
-- Fachlich gilt: je Mitarbeiter und Beginndatum genau eine Krankmeldung.
-- Der zweite Versuch scheitert dann mit SQLSTATE 23505 und wird vom Client
-- als "bereits gespeichert" behandelt.
--
-- Hinweis: Legt sich nur an, wenn keine Duplikate vorhanden sind. Bei
-- vorhandenen Duplikaten bricht die Migration hier bewusst ab, damit die
-- Daten zuerst geprueft werden.
create unique index if not exists uq_sickness_reports_employee_start
  on public.sickness_reports(employee_id, start_date);


-- ===========================================================================
-- 10) Index fuer den Dokumenteingang im Adminbereich
-- ===========================================================================
create index if not exists idx_document_submissions_submitted_at
  on public.document_submissions(submitted_at desc);

comment on policy employee_documents_insert_own on storage.objects is
  'Upload nur in den eigenen Ordner und nur mit aktiver Mitarbeiterberechtigung (011).';
comment on policy employee_documents_select_admin on storage.objects is
  'Aktive Admins duerfen alle Nachweise im Bucket lesen (011).';
