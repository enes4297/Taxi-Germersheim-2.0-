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

**Reihenfolge beachten — verbindlich:**

1. `testprojekt-einrichtung-ohne-storage-trigger.sql` im SQL Editor.
   Vorher gibt es die Funktionen `private.is_active_employee()`,
   `private.is_unlinked_document()` und `private.is_admin()` noch nicht, auf die
   alle vier Policies sich stützen.
2. `storage-trigger-nachtragen.sql` im SQL Editor.
3. Bucket und die drei lesenden/schreibenden Policies hier im Dashboard.
4. Die DELETE-Policy `employee_documents_delete_unlinked` **zuletzt**.

Der Grund für Schritt 4: Ohne den Trigger aus Schritt 2 ist die DELETE-Policy die
einzige Schranke. Ihre Prüfung läuft auf dem Snapshot des Statements und sieht
eine gleichzeitig entstehende Verknüpfung nicht. Zwischen Policy und Trigger darf
deshalb kein Zeitfenster liegen.

**Das TRIGGER-Recht ist eine andere Prüfung als die Eigentümerschaft.** Die
Diagnose im Testprojekt hat beides getrennt ausgewiesen: Mitgliedschaft im
Eigentümer `USAGE=false`/`MEMBER=false`, TRIGGER-Recht dagegen `true`. Policies
gehen deshalb nur über das Dashboard — der Trigger aber sehr wohl über SQL.

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

## Was diese Fassung leistet — und was offen bleibt

Der `BEFORE DELETE`-Trigger auf `storage.objects` aus Abschnitt 5 der Migration
011 **entfällt nicht**. Er wird per `storage-trigger-nachtragen.sql` angelegt;
das TRIGGER-Recht liegt laut Diagnose vor. Damit greift das vollständige
Zusammenspiel:

- Beim Löschen hält PostgreSQL die Zeilensperre auf `storage.objects`, danach
  prüft der Trigger die Verknüpfung mit frischem Snapshot erneut.
- Beim Verknüpfen nimmt der Trigger aus Abschnitt 6
  (`private.lock_document_object`) auf derselben Zeile ein `FOR UPDATE`.
- Keine der beiden Seiten kann die andere übersehen.

Der Trigger ist auch der einzige Teil dieses Aufbaus, der **unabhängig von RLS**
greift. Die Rolle `postgres` hat `BYPASSRLS` — für sie sind alle vier Policies
wirkungslos, der Trigger dagegen feuert.

**Kontrolle der Policies nicht im SQL Editor vornehmen.** Aus demselben Grund:
Wer dort als `postgres` ein `select` oder `delete` absetzt, umgeht RLS und misst
nichts. Die Policies sind nur in einer echten angemeldeten Sitzung prüfbar.

### Wenn das Dashboard `schema "private" does not exist` meldet

Die vier Ausdrücke rufen Funktionen aus dem Schema `private` auf. Migration 002
vergibt `usage on schema private` nur an `authenticated`. Hat die Rolle, mit der
das Dashboard die Policy anlegt, dieses Recht nicht, scheitert das Anlegen mit
genau dieser Meldung. Lokal am 11.09.2026 reproduziert. Abhilfe im SQL Editor:

```sql
grant usage on schema private to supabase_storage_admin;
```

Das vergibt die Projektrolle an ihrem **eigenen** Schema — keine
Rechteausweitung für uns. Erst danach die Policy erneut anlegen.

### Der Trigger lässt sich nicht mehr zurücknehmen

`create trigger` verlangt nur das TRIGGER-Recht, `drop trigger` dagegen
Eigentümerschaft an `storage.objects`. Die Projektrolle kann
`storage_objects_guard_delete` also anlegen, aber nicht wieder entfernen; dafür
braucht es `supabase_storage_admin`. Das ist vor Schritt 2 zu wissen.

### Offen

- Der gesamte Ablauf wurde am 11.09.2026 **lokal** durchgespielt, mit
  nachgebildeter Rechtelage: 17 von 17 Prüfungen bestanden, 46 Verhaltenstests,
  beide Nebenläufigkeitsfälle. Protokoll:
  `supabase/tests/local/ERGEBNIS-2026-09-11-setupweg.md`.
- Gegen das Testprojekt ist **nichts davon gelaufen**.
- Gelöscht wurde lokal per SQL. Die **echte Storage-API ist nicht geprüft** —
  ob sie denselben Weg nimmt und den Trigger auslöst, steht aus.
- Der Trigger schützt die Reihenfolge; er ersetzt keinen Testlauf.
- Verwaiste Verweise findet weiterhin `public.check_document_link_integrity()`
  (nur Admins, rein lesend).

### Falls das TRIGGER-Recht doch fehlt

Dann ist der Wettlauf mit Löschrecht nicht zu schließen. In dem Fall:
DELETE-Policy **gar nicht anlegen** und die automatische Bereinigung in
`fahrer/employee-supabase.js` abschalten. Verwaiste Uploads räumt dann ein
Admin-Vorgang auf. Ein „erst prüfen, dann löschen" in einer Edge Function ist
**kein** Ersatz — Prüfung und Löschen wären zwei getrennte Vorgänge ohne
gehaltene Sperre dazwischen.

## Quellen

- [Restricting Access on Auth, Storage, and Realtime Schemas on April 21, 2025](https://github.com/orgs/supabase/discussions/34270)
- [The Storage Schema | Supabase Docs](https://supabase.com/docs/guides/storage/schema/design)
- [Storage Access Control | Supabase Docs](https://supabase.com/docs/guides/storage/security/access-control)
- [PostgreSQL: CREATE POLICY](https://www.postgresql.org/docs/17/sql-createpolicy.html) — „You must be the owner of a table to create or change policies for it."
- [PostgreSQL: CREATE TRIGGER](https://www.postgresql.org/docs/17/sql-createtrigger.html) — „the user must have the TRIGGER privilege on the table."
