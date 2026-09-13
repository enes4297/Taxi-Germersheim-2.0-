# Einspielplan: Migration 011 in die bestehende Datenbank

**Stand 13.09.2026. Plan, keine Ausführung.** Nichts davon ist gegen die
bestehende Datenbank gelaufen. Das Einspielen selbst braucht eine ausdrückliche
Freigabe im laufenden Gespräch; eine frühere Freigabe gilt dafür nicht.

> `supabase/setup/testprojekt-einrichtung-001-bis-011.sql` und
> `…-ohne-storage-trigger.sql` sind **Einrichtungsskripte für ein leeres
> Testprojekt**. Sie legen das komplette Schema von 001 an und dürfen **niemals**
> gegen die bestehende Datenbank laufen. In diesem Plan kommen sie nicht vor.

---

## 1. Was aus Migration 011 dort fehlt

Grundlage ist die Bestandsaufnahme vom 10.09.2026 (`storage.buckets` leer, keine
Policies auf `storage.buckets`/`storage.objects`, RLS auf beiden aktiv,
FORCE RLS false, `public.document_types` leer). Diese Aufnahme ist drei Tage alt
und wird hier **nicht als gegeben unterstellt** — Schritt 2 erhebt sie neu.
Unter dieser Annahme fehlt praktisch der gesamte Inhalt von 011:

| Abschnitt | Fehlt | Umkehrbar? |
|---|---|---|
| 1 | privater Bucket `employee-documents` (10 MB, nur PDF/JPEG/PNG) | ja, solange leer |
| 2 | vier Zeilen in `public.document_types` | ja |
| 3 | `private.is_active_employee()`, `private.is_unlinked_document(text)` samt Grants/Revokes | ja |
| 4a | `grant select, insert, delete on storage.objects to authenticated`, `revoke update` von `authenticated`, `revoke all` von `anon` | ja, wenn der Ausgangsstand notiert ist |
| 4b | vier Storage-Policies: `insert_own`, `select_own`, `select_admin`, `delete_unlinked` | ja (im Testprojekt gemessen), sonst Dashboard |
| 5 | `private.guard_document_object_delete()` **und Trigger `storage_objects_guard_delete`** | **Trigger nein — siehe Abschnitt 5 unten** |
| 6 | `private.lock_document_object()` und die Trigger `document_submissions_lock_object`, `employee_documents_lock_object` | ja |
| 7 | verschärfte Policy `document_submissions_employee_insert` (Bindung des Pfades an `auth.uid()`) | ja, Vorfassung steht in `002_rls_policies.sql:604` |
| 8 | Spalte `sickness_reports.client_request_id`, Kommentar, partieller Unique-Index `uq_sickness_reports_client_request`, verschärfte Policy `sickness_reports_employee_insert` | Index/Policy ja, Spalte nur mit Datenverlust |
| 10 | Index `idx_document_submissions_submitted_at`, zwei Policy-Kommentare | ja |

**Was nicht fehlt:** Die Tabellen `document_submissions`, `employee_documents`,
`sickness_reports`, `document_types`, die Spalte `employees.portal_active` sowie
`private.is_admin()` und `private.current_user_employee_id()` stammen aus 001 und
002. 011 setzt sie voraus und legt sie nicht an. Sind sie nicht vorhanden, darf
011 nicht laufen.

*Randnotiz:* Die Abschnittsnummerierung in 011 springt von 8 auf 10. Es fehlt
kein Inhalt, nur die Ziffer 9. Rein kosmetisch — die Datei wird deswegen nicht
angefasst.

---

## 2. Welche rein lesende Bestandsprüfung nötig ist

Drei Abfragen, alle **ohne jede Schreibwirkung**, im SQL Editor, Ausgabe
zurückmelden. Vorher wird nichts eingespielt.

| Nr | Datei | Beantwortet |
|---|---|---|
| A | `supabase/setup/bestandspruefung-011.sql` | Was aus 011 steht dort schon? Welche Vorbedingungen aus 001/002 sind da? Wie viele Bestandszeilen hängen an den neuen Regeln? |
| B | `diagnose-storage-rechte.sql`, Abfrage A | Rolle, Eigentümerschaft, `TRIGGER`-Recht, Rechte von `authenticated`/`anon`, RLS-Zustand, vorhandene Policies und Trigger |
| C | `diagnose-storage-rechte.sql`, Abfrage B | vollständiger **Wortlaut** aller Policies und Trigger auf `storage.objects` |

Zu B: Die Posten **20 bis 23** sind auf ein leeres Testprojekt gemünzt und dort
mit „0 / false" erwartet. In der bestehenden Datenbank sind sie **umgekehrt** zu
lesen — Tabellen vorhanden, Schema `private` vorhanden. Ein „false" bei Posten 21
wäre dort ein Abbruchgrund.

Die drei Antworten entscheiden über drei Dinge, die vorher **nicht** feststehen:

1. **Ist `create policy` auf `storage.objects` möglich?** Im Testprojekt hat es
   funktioniert, obwohl `USAGE=false` und `MEMBER=false` ausgewiesen sind. Warum,
   ist **nicht eindeutig feststellbar** — es ist ein Messwert aus einem anderen
   Projekt, keine Zusage der Plattform. Scheitert es hier mit
   `must be owner of relation objects`, gilt der Dashboard-Weg aus
   `storage-policies-dashboard.md`.
2. **Ist das `TRIGGER`-Recht vorhanden?** Posten 10 bzw. 52. Ohne dieses Recht
   entfällt Abschnitt 5 vollständig, und dann gilt Variante B in Schritt 4.
3. **Greifen `grant`/`revoke` auf `storage.objects`?** Auch das ist ein eigenes
   Recht. Besonders `revoke all on storage.objects from anon` muss vorher gegen
   Posten 13 und 42 abgeglichen werden: Nutzt irgendetwas anderes im Projekt
   Storage mit `anon`, würde der Revoke es abschalten. Nach der Aufnahme vom
   10.09.2026 gibt es keinen anderen Bucket — das ist zu bestätigen, nicht
   anzunehmen.

---

## 3. Reihenfolge

Jeder Schritt ist ein eigener Lauf mit eigener Kontrolle. Nach jedem Schritt wird
die Ausgabe gelesen, bevor der nächste beginnt.

```
0  Freigabe im Gespraech einholen, Backup/Zeitpunkt der Datenbank sichern
1  Bestandspruefung A, B, C  ->  rein lesend, Ausgabe zurueckmelden
2  Teil "public" von 011     ->  Abschnitte 2, 3, 6, 7, 8, 10   (umkehrbar)
3  Bucket                    ->  Abschnitt 1, sonst Dashboard    (umkehrbar)
4  Rechte auf storage.objects->  Abschnitt 4a                    (umkehrbar)
5  Trigger nachtragen        ->  storage-trigger-nachtragen.sql  EINBAHNSTRASSE
6  Policies insert/select    ->  Abschnitt 4b, drei Stueck       (umkehrbar)
7  DELETE-Policy ZULETZT     ->  storage-delete-policy-nachtragen.sql
8  Schlusskontrolle          ->  Bestandspruefung A erneut, rein lesend
```

Begründungen, die nicht verschoben werden dürfen:

- **Schritt 2 vor allem Storage:** Die vier Storage-Policies rufen
  `private.is_active_employee()`, `private.is_unlinked_document()` und
  `private.is_admin()` auf. Vorher sind diese Ausdrücke nicht auflösbar.
- **Schritt 4 vor 6 und 7:** Grants greifen vor RLS. Ohne Grant hilft die beste
  Policy nichts. Umgekehrt ist ein Grant **ohne** Policy harmlos: RLS ist aktiv
  und verweigert dann alles.
- **Schritt 5 vor 7 — der entscheidende Punkt.** Ohne den Trigger
  `storage_objects_guard_delete` wäre die DELETE-Policy die **einzige** Schranke
  beim Löschen. Ihre Prüfung läuft auf dem Snapshot des Statements und sieht eine
  gleichzeitig entstehende Verknüpfung nicht. Zwischen Policy und Trigger darf
  deshalb kein Zeitfenster liegen. Die Vorprüfung in
  `storage-delete-policy-nachtragen.sql` bricht ab, wenn der Trigger fehlt oder
  abgeschaltet ist.
- **Schritt 7 ganz zuletzt:** Permissive Policies verknüpfen mit **ODER**. Eine
  zusätzliche DELETE-Policy kann das Löschrecht nur erweitern, nie einschränken.
  Deshalb besteht die Kontrolle darauf, dass es **genau eine** DELETE-Policy gibt
  — nämlich diese. Posten 44 der Bestandsprüfung misst das.

**Variante B, falls das `TRIGGER`-Recht fehlt:** Schritt 5 entfällt, und dann
entfällt auch Schritt 7. Der Bucket bleibt ohne DELETE-Policy, das Löschen von
Dateien ist für `authenticated` damit vollständig gesperrt, und `revoke delete on
storage.objects from authenticated` gehört in Schritt 4. Verwaiste Dateien
räumt in diesem Fall niemand automatisch auf; das wäre ein offener Punkt und
keine Lösung, die stillschweigend hingenommen wird.

---

## 4. Rückweg

Für jeden Schritt der vorgesehene Rückweg. Alle Schritte laufen in `begin; …`
mit Kontrolle **vor** dem `commit` — schlägt die Kontrolle an, wird nichts
festgeschrieben.

| Schritt | Rückweg |
|---|---|
| 2, Abschnitt 3/6 | `drop trigger … on public.document_submissions` / `… employee_documents`, dann `drop function private.lock_document_object()`. Beide Tabellen gehören dem Projekt, das ist unproblematisch. |
| 2, Abschnitt 7 | `document_submissions_employee_insert` löschen und die Vorfassung aus `002_rls_policies.sql:604` wieder anlegen (ohne die `file_path`-Bedingung). |
| 2, Abschnitt 8 | Index `uq_sickness_reports_client_request` löschen, Policy `sickness_reports_employee_insert` auf die Fassung aus `002_rls_policies.sql:564` zurücksetzen. **Die Spalte `client_request_id` bleibt stehen** — sie ist nullable, stört nichts, und ein `drop column` würde bereits geschriebene Vorgangsschlüssel vernichten. |
| 2, Abschnitt 10 | `drop index if exists public.idx_document_submissions_submitted_at` |
| 3, Bucket | `delete from storage.buckets where id = 'employee-documents'` — **nur wenn der Bucket leer ist**. Liegen Dateien darin, werden sie zuvor über die **Storage-API** entfernt. Ein SQL-`DELETE` auf `storage.objects` löscht nur den Katalogeintrag und lässt die Datei als Leiche im Speicher zurück. |
| 4, Rechte | Den mit Posten 41/42 gemessenen **Ausgangsstand** wiederherstellen. Deshalb muss dieser Stand vor Schritt 4 notiert sein — er ist nicht rekonstruierbar. |
| 6, 7, Policies | `drop policy … on storage.objects`. Im Testprojekt hat das funktioniert; verlangt aber dieselbe Eigentümerprüfung wie `create policy`. Geht es nicht, führt der Weg über das Dashboard. |
| 5, Trigger | **Kein vollständiger Rückbau möglich. Siehe unten.** |

---

## 5. Die Einschränkung eigener Storage-Trigger — ausdrücklich

Das Schema `storage` gehört `supabase_storage_admin` und gilt als
schreibgeschützt. Für den Trigger aus Abschnitt 5 folgt daraus:

1. **`create trigger` und `drop trigger` prüfen Verschiedenes.**
   `create trigger` verlangt nur das `TRIGGER`-Recht auf der Tabelle —
   `drop trigger` verlangt **Eigentümerschaft**. Die Projektrolle hat das erste,
   nicht das zweite. Örtlich nachgewiesen am 11.09.2026.
2. **Damit ist Schritt 5 eine Einbahnstraße.** Wer
   `storage_objects_guard_delete` anlegt, kann ihn selbst nicht wieder entfernen.
   Dafür braucht es `supabase_storage_admin`, also das Dashboard oder den
   Supabase-Support.
3. **Die Einbahnstraße beginnt erst beim `commit`.** Solange die Transaktion
   läuft, nimmt ein `rollback` den Trigger wieder mit — dafür ist keine
   Eigentümerschaft nötig. Genau deshalb steht die Kontrolle in
   `storage-trigger-nachtragen.sql` **vor** dem `commit`.
4. **Der einzige Rückweg nach dem `commit`: die Funktion neutralisieren.**
   `private.guard_document_object_delete()` gehört der Projektrolle. Ein
   `create or replace function` mit einem Rumpf, der nur `return old;` tut,
   schaltet die Prüfung ab, ohne den Trigger zu entfernen. Der Trigger feuert
   weiter, tut aber nichts.
   **`drop function` ist kein Rückweg** — der Trigger hängt daran; der Aufruf
   scheitert, und mit `cascade` würde man wieder Eigentümerschaft brauchen.
   Gelänge es doch, wäre **jedes** `DELETE` auf `storage.objects`
   projektweit kaputt.
5. **Policies dagegen sind eine andere Prüfung.** `create policy` verlangt
   Eigentümerschaft. Im Testprojekt ist es trotz `USAGE=false` gelungen — warum,
   ist **nicht eindeutig feststellbar**. Für die bestehende Datenbank wird das
   nicht vorausgesetzt; Schritt 1 misst es, und der Dashboard-Weg aus
   `storage-policies-dashboard.md` bleibt die Rückfallebene.
6. **Kein Eingriff in die Plattform-Trigger.** `protect_objects_delete` und
   `update_objects_updated_at` bleiben unberührt. Die Schlusskontrolle in
   `storage-trigger-nachtragen.sql` prüft ausdrücklich nach, dass beide noch
   stehen.
7. **Kein Eigentümerwechsel, kein `SET ROLE`, keine Rolleneskalation** — in
   keinem Schritt dieses Plans.

---

## 6. Was dieser Plan nicht abdeckt

- **Nebenläufigkeit.** Das Zusammenspiel von Löschschutz-Trigger und
  Sperr-Trigger ist **ausschließlich lokal** gemessen
  (`supabase/tests/local/13_concurrency_run.ps1`). Weder für das Testprojekt noch
  für die bestehende Datenbank ist dieser Schutz nachgewiesen.
- **Die Bestandsprüfung selbst ist noch nirgends gelaufen.** Sie ist geschrieben
  und rein lesend, aber nicht ausgeführt — auch nicht gegen das Testprojekt.
- Die bestandenen Läufe vom 12. und 13.09.2026 gelten für das **Testprojekt**.
  Über die bestehende Datenbank sagen sie nichts.
- Kein Deployment der Website ist Teil dieses Plans.
