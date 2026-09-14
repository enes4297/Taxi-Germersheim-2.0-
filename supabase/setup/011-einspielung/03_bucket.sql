-- ===========================================================================
-- Schritt 03 - Privater Bucket employee-documents
-- ===========================================================================
--
-- Abschnitt 1 der Migration 011, wortgleich uebernommen.
--
-- REIHENFOLGE: nach 02_public_teil.sql, vor 03b_kontrolle_bucket.sql und dem
-- Trigger aus storage-trigger-nachtragen.sql (Schritt 05).
--
-- UNGEFAEHRLICH IN DIESER STELLUNG: Der Bucket ist zu diesem Zeitpunkt
-- vollstaendig gesperrt. RLS auf storage.objects ist aktiv und es gibt noch
-- keine Policy fuer diesen Bucket - ohne Policy verweigert RLS alles. Der
-- Bucket entsteht leer und bleibt unerreichbar, bis Schritt 06 und 07 laufen.
--
-- FALLS DIESER SCHRITT SCHEITERT: Der Bucket laesst sich genauso im Dashboard
-- anlegen. Werte in storage-policies-dashboard.md, Schritt 1.
-- ===========================================================================

begin;

-- --- Vorpruefung -----------------------------------------------------------
do $$
declare
  v_public boolean;
begin
  if to_regclass('storage.buckets') is null then
    raise exception 'ABBRUCH: storage.buckets fehlt. Storage im Projekt aktivieren.';
  end if;
  if not has_table_privilege(current_user, 'storage.buckets', 'INSERT') then
    raise exception 'ABBRUCH: % darf nicht in storage.buckets schreiben. Bucket im Dashboard anlegen, siehe storage-policies-dashboard.md Schritt 1.', current_user;
  end if;

  -- Gibt es den Bucket schon, darf er auf keinen Fall oeffentlich sein.
  select b.public into v_public from storage.buckets as b where b.id = 'employee-documents';
  if v_public is true then
    raise notice 'ACHTUNG: Bucket employee-documents ist derzeit OEFFENTLICH. Dieser Schritt stellt ihn auf privat.';
  end if;

  -- Ein vorhandener Bucket mit Inhalt waere ein voellig anderer Fall.
  if exists (select 1 from storage.objects where bucket_id = 'employee-documents') then
    raise exception 'ABBRUCH: Im Bucket employee-documents liegen bereits Objekte. Das war nicht erwartet. Erst klaeren, woher sie stammen.';
  end if;
end
$$;


-- --- 011 Abschnitt 1 -------------------------------------------------------
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


-- --- Kontrolle - NOCH VOR DEM COMMIT --------------------------------------
do $$
declare
  b record;
begin
  select * into b from storage.buckets where id = 'employee-documents';
  if b is null then
    raise exception 'KONTROLLE: Bucket employee-documents wurde nicht angelegt.';
  end if;
  if b.public is not false then
    raise exception 'KONTROLLE: Bucket ist oeffentlich. Das darf er niemals sein.';
  end if;
  if b.file_size_limit is distinct from 10485760 then
    raise exception 'KONTROLLE: Groessengrenze ist %, erwartet 10485760.', b.file_size_limit;
  end if;
  if not (b.allowed_mime_types @> array['application/pdf', 'image/jpeg', 'image/png']
          and array_length(b.allowed_mime_types, 1) = 3) then
    raise exception 'KONTROLLE: Zugelassene Dateitypen stimmen nicht: %', b.allowed_mime_types;
  end if;

  -- Der Bucket muss zu diesem Zeitpunkt noch unerreichbar sein.
  if exists (select 1 from pg_policies
              where schemaname = 'storage' and tablename = 'objects') then
    raise notice 'Hinweis: Es gibt bereits Policies auf storage.objects. Pruefen, ob sie diesen Bucket betreffen.';
  end if;

  raise notice 'Kontrolle bestanden. Bucket ist privat, leer und ohne Policy noch unerreichbar.';
end
$$;

commit;
