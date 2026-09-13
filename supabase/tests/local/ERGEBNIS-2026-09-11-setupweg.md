# Einrichtungsweg lokal geprüft — 11.09.2026

Geprüft wurde der vorbereitete Ablauf **Basisskript → Trigger-Nachtrag →
Storage-Policies** in einer lokalen, isolierten PostgreSQL-Instanz.

| | |
|---|---|
| Lauf | `supabase/tests/local/14_setupweg_run.ps1` |
| Umgebung | PostgreSQL 17.6 portabel, `127.0.0.1:55432`, Datenbank `tgsetup` |
| Ergebnis | **17 von 17 Prüfungen bestanden**, davon 46 Verhaltenstests aus `12_document_upload_test.sql` und beide Nebenläufigkeitsfälle |
| Gegen Supabase ausgeführt | **nichts** |

## Nachgebildete Rechtelage

Ohne diesen Schritt wäre der Lauf wertlos: Lokal ist `postgres` Superuser und
Eigentümer von allem, damit fällt jede Rechteprüfung anders aus als im Projekt.
`02_plattform_shim.sql` stellt die gemessene Lage her und der Lauf prüft sie
zuerst gegen die Diagnose:

| Merkmal | Diagnose Testprojekt | Lokal hergestellt |
|---|---|---|
| Eigentümer `storage.objects` | `supabase_storage_admin` | gleich |
| Mitgliedschaft USAGE / MEMBER | false / false | gleich |
| `TRIGGER` auf `storage.objects` | true | gleich |
| Projektrolle `BYPASSRLS` | true (`postgres`) | true (`tg_projekt`) |
| `authenticated` S/I/U/D | true/true/true/true | gleich |
| `anon` S/I/U/D | true/true/true/true | gleich |
| RLS aktiv, keine Policies, keine Buckets | ja | gleich |

## Ergebnisse im Einzelnen

### Basisskript

- Läuft als Nicht-Eigentümer **vollständig durch**, ohne Abbruch.
- `UEBERSPRUNGEN: GRANT/REVOKE auf storage.objects` — erkannt, nicht gescheitert.
- `UEBERSPRUNGEN: Storage-Policies` — erkannt, nicht gescheitert.
- `OK: Bucket employee-documents angelegt (privat, 10 MB, PDF/JPEG/PNG).`
- 21 Tabellen in `public`, Schema `private` samt Funktionen vorhanden.

### Trigger-Nachtrag

- Legt `storage_objects_guard_delete` an. Erster Lauf: `OK: Trigger angelegt`.
- Zweiter Lauf: `OK: Trigger bestand bereits` — wiederholbar, ohne Fehler.

### Plattform-Trigger

`pg_get_triggerdef()` von `protect_objects_delete` und
`update_objects_updated_at` ist vor und nach dem gesamten Ablauf **zeichengleich**.
Danach stehen genau drei Trigger auf `storage.objects`, in dieser Reihenfolge:

```
protect_objects_delete, storage_objects_guard_delete, update_objects_updated_at
```

### Policies

Vier Policies, alle ausschließlich für `authenticated`. Keine gilt für `public`
oder `anon`.

### Verhalten (46 Tests aus `12_document_upload_test.sql`)

Alle bestanden — Upload nur in den eigenen Ordner, nur für aktive Mitarbeiter,
Admin-Lesezugriff, kein Überschreiben, Pfadbindung, Vorgangsschlüssel.

### `anon` trotz voller Grants

- Lesen: 0 Zeilen sichtbar.
- Schreiben: `new row violates row-level security policy for table "objects"`.

Die Grants für `anon` lassen sich ohne Eigentümerschaft **nicht** zurücknehmen.
Die RLS trägt diese Sperre allein — sie ist damit nicht bloß eine zweite
Schranke, sondern die einzige.

### Nebenläufigkeit (beide Fälle, zwei echte Verbindungen)

| Fall | Erwartet | Gemessen |
|---|---|---|
| A — Löschen zuerst, Verknüpfen fällt hinein | Verknüpfen scheitert, keine hängende Referenz | `DOCUMENT_FILE_NOT_FOUND`, 0 Verknüpfungen, 0 Dateien |
| B — Verknüpfen zuerst, Löschen fällt hinein | Datei bleibt erhalten | `DOCUMENT_ALREADY_LINKED`, 1 Verknüpfung, 1 Datei |

Kein Lauf hat ein verknüpftes Dokument verloren.

---

## Zwei Funde, die den Ablauf verändert haben

### 1. `drop trigger` verlangt Eigentümerschaft, `create trigger` nicht

Einzeln gemessen:

```
create trigger ... on storage.objects   -> gelingt (TRIGGER-Recht genügt)
drop trigger   ... on storage.objects   -> ERROR: must be owner of relation objects
drop trigger if exists <nicht vorhanden> -> nur NOTICE, keine Rechteprüfung
```

Folgen:

- Die erste Fassung von `storage-trigger-nachtragen.sql` hatte ein unbedingtes
  `drop trigger if exists`. Erster Lauf wäre gutgegangen, **jeder weitere wäre
  abgebrochen.** Korrigiert: Bestand wird belassen, die Funktion per
  `create or replace` erneuert.
- **Einbahnstraße:** Die Projektrolle kann den Trigger anlegen, aber nicht mehr
  entfernen. Zum Zurückbauen braucht es `supabase_storage_admin`.
- Die Fähigkeitsprobe im Basisskript meldet deshalb
  `Probe CREATE TRIGGER erfolgreich: f`, obwohl das Katalogrecht `t` ist — sie
  scheitert am Aufräumen ihrer eigenen Probe, nicht am Anlegen. Das ist ein
  falsches Negativ. Für den hier geprüften Weg folgenlos, weil das Basisskript
  den Trigger ohnehin nicht anlegt. Für `testprojekt-einrichtung-001-bis-011.sql`
  ist es der Grund, warum diese Fassung abbräche.

### 2. Die Dashboard-Rolle muss `private` auflösen können

Die Policy-Ausdrücke rufen `private.is_active_employee()`,
`private.is_admin()` und `private.is_unlinked_document()` auf. Migration 002
vergibt `usage on schema private` nur an `authenticated`. Legt eine Rolle die
Policies an, die dieses USAGE nicht hat, scheitert das Anlegen mit
`ERROR: schema "private" does not exist` — lokal so aufgetreten und
reproduziert.

Abhilfe, falls das Dashboard das meldet:

```sql
grant usage on schema private to supabase_storage_admin;
```

Das vergibt die Projektrolle an ihrem **eigenen** Schema. Keine Rechteausweitung
für uns.

---

## Grenzen — nicht überschreiben

1. **Die echte Supabase-Storage-API ist lokal nicht verfügbar.** Gelöscht wurde
   per SQL `delete from storage.objects`. Ob die Storage-API denselben Weg nimmt,
   den Trigger auslöst und die Datei im Objektspeicher entfernt, ist damit
   **nicht** geprüft. Das bleibt der wichtigste offene Punkt.
2. **Die beiden Plattform-Trigger sind nur dem Namen nach nachgebildet.**
   Ihr echtes Verhalten ist unbekannt. Geprüft ist, dass unser Ablauf sie
   unberührt lässt und ein zweiter `BEFORE DELETE`-Trigger daneben funktioniert
   — nicht, wie sie im Projekt wirken.
3. **Das TRIGGER-Recht belegt keine offizielle Unterstützung.** Supabase
   behandelt `storage` als schreibgeschützt. Dass das Recht heute vorliegt,
   ist ein Messwert, keine Zusage. Ein Plattform-Update kann den Trigger
   entfernen oder das Recht zurückziehen. Der Bestand gehört deshalb regelmäßig
   kontrolliert — die Abfrage steht am Ende von
   `supabase/setup/storage-trigger-nachtragen.sql`.
4. **Kein PostgREST, kein GoTrue.** Rollenwechsel wurden über
   `request.jwt.claims` simuliert.
5. **Lokal bestanden sagt nichts über das Testprojekt** und erst recht nichts
   über die Produktivinstanz.
6. Die Rolle `tg_projekt` ist eine Nachbildung der Projektrolle, nicht die
   Rolle `postgres` des Testprojekts. Übereinstimmung besteht in den sieben
   oben aufgeführten Merkmalen, nicht darüber hinaus.

## Reproduktion

```
powershell -File supabase/tests/local/14_setupweg_run.ps1
```

Setzt das Cluster aus `run-local-tests.ps1` voraus. Legt die Datenbank
`tgsetup` neu an und stoppt den Server am Ende wieder.
