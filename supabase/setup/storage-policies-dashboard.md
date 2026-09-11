# Storage-Policies für `employee-documents` im Dashboard anlegen

Diese Datei wird gebraucht, wenn `testprojekt-einrichtung-ohne-storage-trigger.sql`
meldet:

```
UEBERSPRUNGEN: Storage-Policies. Bucket bleibt damit vollstaendig gesperrt ...
```

Hintergrund: Supabase hat die zulässigen SQL-Eingriffe im Schema `storage` zum
21.04.2025 eingeschränkt. `storage.objects` gehört `supabase_storage_admin`.
PostgreSQL verlangt für `CREATE POLICY` Eigentümerschaft an der Tabelle — die
Projektrolle hat sie nicht. Der vorgesehene Weg ist deshalb das Dashboard.

**Reihenfolge beachten:** Das SQL-Skript muss vorher gelaufen sein, sonst gibt es
die Funktionen `private.is_active_employee()`, `private.is_unlinked_document()`
und `private.is_admin()` noch nicht, auf die alle vier Policies sich stützen.

---

## Schritt 1 — Bucket

Falls das Skript den Bucket nicht anlegen konnte:
**Storage → New bucket**

| Feld | Wert |
|---|---|
| Name | `employee-documents` |
| Public bucket | **aus** |
| File size limit | `10485760` Byte (10 MB) |
| Allowed MIME types | `application/pdf`, `image/jpeg`, `image/png` |

Der Bucket darf **niemals** öffentlich sein.

---

## Schritt 2 — Die vier Policies

**Storage → Policies → `employee-documents` → New policy → For full customization**

Jeweils Rolle `authenticated` auswählen. Die Ausdrücke sind wortgleich die aus
Abschnitt 4 der Migration 011.

### 1. `employee_documents_insert_own` — Hochladen

Operation: **INSERT** · WITH CHECK:

```sql
bucket_id = 'employee-documents'
and (storage.foldername(name))[1] = (select auth.uid())::text
and private.is_active_employee()
```

Eigener Ordner **und** aktive Mitarbeiterberechtigung. Eine bloße Anmeldung
genügt nicht.

### 2. `employee_documents_select_own` — Eigene Nachweise lesen

Operation: **SELECT** · USING:

```sql
bucket_id = 'employee-documents'
and (storage.foldername(name))[1] = (select auth.uid())::text
and private.is_active_employee()
```

### 3. `employee_documents_select_admin` — Admin liest alles

Operation: **SELECT** · USING:

```sql
bucket_id = 'employee-documents'
and private.is_admin()
```

### 4. `employee_documents_delete_unlinked` — Nur unverknüpfte Dateien löschen

Operation: **DELETE** · USING:

```sql
bucket_id = 'employee-documents'
and (storage.foldername(name))[1] = (select auth.uid())::text
and private.is_active_employee()
and private.is_unlinked_document(name)
```

Das ist die Bereinigung verwaister Uploads. Ohne `is_unlinked_document` wäre es
ein breites Löschrecht auf alle eigenen Dateien.

### Bewusst KEINE UPDATE-Policy

Dateien werden nicht überschrieben. Jeder Upload bekommt einen neuen Pfad.

---

## Schritt 3 — Kontrolle

Nur lesend, im SQL Editor:

```sql
select policyname, cmd, roles::text, qual, with_check
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
  and policyname like 'employee_documents%'
order by policyname;
```

Erwartet: genau vier Zeilen. Sind es weniger, ist der Bucket noch gesperrt —
Uploads schlagen dann fehl. Das ist die sichere Richtung, aber eben nicht
fertig.

---

## Was an dieser Fassung fehlt

Der `BEFORE DELETE`-Trigger auf `storage.objects` aus Abschnitt 5 der Migration
011 entfällt. Die Folgen stehen ausführlich im Skript selbst bei
`5) ENTFAELLT`. Kurz:

- Die DELETE-Policy verhindert das Löschen verknüpfter Nachweise im
  Normalbetrieb.
- Die Sperren auf unseren eigenen Tabellen (`document_submissions`,
  `employee_documents`) bleiben vollständig und verhindern weiterhin, dass eine
  Verknüpfung auf eine verschwundene Datei zeigt.
- Offen bleibt allein die umgekehrte Gleichzeitigkeit: Verknüpfung besteht,
  Datei wurde im selben Augenblick entfernt. Ergebnis wäre ein ins Leere
  zeigender Verweis — ein kaputter Download, kein Fremdzugriff.
- Solche Verweise findet `public.check_document_link_integrity()` (nur Admins,
  rein lesend).
- Dieses Verhalten ist **hergeleitet, nicht nachgemessen**: Der lokale
  Nebenläufigkeitstest `supabase/tests/local/13_concurrency_*` wurde mit
  Trigger bestanden und für die Fassung ohne Trigger noch nicht wiederholt.

## Quellen

- [Restricting Access on Auth, Storage, and Realtime Schemas on April 21, 2025](https://github.com/orgs/supabase/discussions/34270)
- [The Storage Schema | Supabase Docs](https://supabase.com/docs/guides/storage/schema/design)
- [Storage Access Control | Supabase Docs](https://supabase.com/docs/guides/storage/security/access-control)
- [PostgreSQL: CREATE POLICY](https://www.postgresql.org/docs/17/sql-createpolicy.html) — „You must be the owner of a table to create or change policies for it."
- [PostgreSQL: CREATE TRIGGER](https://www.postgresql.org/docs/17/sql-createtrigger.html) — „the user must have the TRIGGER privilege on the table."
