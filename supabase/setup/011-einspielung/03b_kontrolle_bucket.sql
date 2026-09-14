-- ===========================================================================
-- Schritt 03b - Kontrollabfrage zum Bucket employee-documents
-- ===========================================================================
--
-- REIN LESEND. Ein einziges select. Aendert nichts.
--
-- WARUM NACHTRAEGLICH UND ALS ABFRAGE
--   03_bucket.sql prueft dasselbe bereits vor dem commit - aber ueber
--   "raise exception" und "raise notice". Der Supabase SQL Editor zeigt
--   NOTICE-Zeilen nicht an; er meldet nur "Success. No rows returned".
--   Sichtbar wird ein bestandener Lauf damit nur ueber eine Abfrage, die
--   Zeilen zurueckgibt. Genau das ist diese Datei.
--
-- WAS SIE NICHT IST
--   Kein Ersatz fuer die Kontrolle in 03_bucket.sql. Die laeuft INNERHALB der
--   Transaktion und kann zurueckrollen. Diese hier laeuft danach und stellt
--   nur fest, was steht.
--
-- LESART
--   Spalte "ergebnis" muss in allen Zeilen OK lauten. Jede Zeile mit
--   ABWEICHUNG ist ein Befund, kein Schoenheitsfehler - Schritt 06 und 07
--   setzen auf diesem Stand auf.
-- ===========================================================================

select
  p.nr,
  p.pruefung,
  p.erwartet,
  p.gemessen,
  case when p.erfuellt then 'OK' else 'ABWEICHUNG' end as ergebnis
from (
  -- 1) Existiert der Bucket ueberhaupt, und genau einmal?
  select
    1 as nr,
    'Bucket vorhanden' as pruefung,
    'genau eine Zeile mit id = employee-documents' as erwartet,
    (select count(*)::text from storage.buckets where id = 'employee-documents')
      || ' Zeile(n)' as gemessen,
    (select count(*) from storage.buckets where id = 'employee-documents') = 1 as erfuellt

  union all

  -- 2) Privat. Ein oeffentlicher Bucket gaebe jede Datei ohne Anmeldung frei.
  select
    2,
    'Nicht oeffentlich',
    'public = false',
    coalesce((select b.public::text from storage.buckets as b
               where b.id = 'employee-documents'), '(kein Bucket)'),
    (select b.public is false from storage.buckets as b
      where b.id = 'employee-documents')

  union all

  -- 3) Groessengrenze. 10 MB, in Bytes.
  select
    3,
    'Groessengrenze',
    '10485760 Bytes (10 MB)',
    coalesce((select b.file_size_limit::text from storage.buckets as b
               where b.id = 'employee-documents'), '(kein Wert)'),
    (select b.file_size_limit = 10485760 from storage.buckets as b
      where b.id = 'employee-documents')

  union all

  -- 4) Genau drei zugelassene Dateitypen - nicht mehr. Ein vierter Eintrag
  --    waere eine stillschweigende Erweiterung und faellt hier auf.
  select
    4,
    'Zugelassene Dateitypen',
    'application/pdf, image/jpeg, image/png - und sonst nichts',
    coalesce((select array_to_string(b.allowed_mime_types, ', ') from storage.buckets as b
               where b.id = 'employee-documents'), '(kein Wert)'),
    (select b.allowed_mime_types @> array['application/pdf', 'image/jpeg', 'image/png']
            and array_length(b.allowed_mime_types, 1) = 3
       from storage.buckets as b
      where b.id = 'employee-documents')

  union all

  -- 5) Zusatz, nicht angefordert, aber fuer die naechsten Schritte wichtig:
  --    zu diesem Zeitpunkt darf der Bucket noch leer sein. Liegen Objekte
  --    darin, stammen sie nicht aus diesem Einspielvorgang.
  select
    5,
    'Bucket noch leer',
    '0 Objekte',
    (select count(*)::text from storage.objects where bucket_id = 'employee-documents')
      || ' Objekt(e)' as gemessen,
    (select count(*) from storage.objects where bucket_id = 'employee-documents') = 0
) as p
order by p.nr;
