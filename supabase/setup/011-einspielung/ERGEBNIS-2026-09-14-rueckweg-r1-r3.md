# Ergebnis — gezielter Lauf gegen R1–R3 und die neuen Policy-Kontrollen

Stand 14.09.2026. Gegenstand: die am 14.09.2026 überarbeiteten Rückweg-Stufen
`R1`, `R2`, `R3` aus `90_rueckweg.sql` sowie die neuen Kontrollblöcke in
`06_policies_lesen_schreiben.sql` und `../storage-delete-policy-nachtragen.sql`.
Kein Wiederholungslauf der gesamten Testsuite — gezielt nur diese Stellen.

**NUR LOKAL.** Portables PostgreSQL auf `127.0.0.1:55432`, Datenbank `tgruw`,
eigens für diesen Lauf angelegt (nicht wiederverwendet, weil die vorhandenen
Test-Datenbanken ältere Fassungen der Skripte abbilden). Nichts davon lief
gegen das Originalprojekt.

## Aufbau

Shims (`00_supabase_shim.sql`, `01_storage_shim.sql`, `02_plattform_shim.sql`)
→ `testprojekt-einrichtung-ohne-storage-trigger.sql` als `tg_projekt`
(Migrationen 001–010, Bucket) → `storage-trigger-nachtragen.sql` (Schritt 05)
als `tg_projekt` → `06_policies_lesen_schreiben.sql` (Schritt 06) und
`../storage-delete-policy-nachtragen.sql` (Schritt 07), beide als
`supabase_storage_admin`, weil `tg_projekt` lokal — anders als im gemessenen
Testprojekt — keine Eigentümerschaft an `storage.objects` hat und `create
policy`/`drop policy` deshalb mit `42501` scheitern. Das ist eine bekannte,
in `06_policies_lesen_schreiben.sql` dokumentierte Lücke des Nachbaus, keine
neue Erkenntnis.

## Ein Fehler gefunden und behoben

`90_rueckweg.sql`, Vorprüfung von `R1`: `t.tgenabled || ')'` verknüpfte den
Typ `"char"` mit `text` uneindeutig und brach mit
`operator is not unique: unknown || "char"` ab, bevor R1 überhaupt zum
eigentlichen Riegel kam. Behoben mit explizitem Cast `t.tgenabled::text`.
Nach dem Fix lief R1 durch. Betroffene Prüfung danach wiederholt (siehe unten).

## Löschriegel (R1) — funktional geprüft

- `R1` gegen den Nachbau ausgeführt: Riegel a) (drop policy) scheitert lokal
  mit `must be owner of relation objects` und wird von R1 selbst abgefangen —
  genau das dokumentierte Verhalten bei fehlender Eigentümerschaft. Riegel b)
  (Funktionsrumpf ersetzt) greift, Kontrolle R1 bestanden.
- Funktionaler Test: mit `set storage.allow_delete_query = 'true'` (umgeht nur
  den Plattform-Trigger `protect_objects_delete`, der jedes direkte SQL-DELETE
  ohnehin sperrt) ein `DELETE` auf `storage.objects` im Bucket
  `employee-documents` versucht. Ergebnis: abgelehnt mit
  `RUECKWEG_R1_LOESCHSPERRE: Loeschen im Bucket employee-documents ist
  waehrend des Rueckwegs gesperrt.` Das Objekt blieb bestehen.

## Neutralisierung erst nach DELETE-/ALL-Policy-Ende (R2)

- `R2` mit noch bestehender DELETE-Policy ausgeführt: bricht ab mit
  `ABBRUCH R2: Auf storage.objects stehen noch 1 DELETE-/ALL-Policy(s).`
  Policy-Zustand danach unverändert (weiterhin 1).
- DELETE-Policy als Eigentümer entfernt, `R2` erneut ausgeführt: läuft durch,
  Kontrolle R2 bestanden. Funktionskörper danach geprüft: reiner
  `return old`-Rumpf, kein `RUECKWEG_R1_LOESCHSPERRE`-Marker mehr,
  `EXECUTE` für `anon`/`authenticated`/`public` entzogen. Anschließender
  funktionaler Test: dasselbe `DELETE` wie oben, diesmal ohne Riegel —
  gelingt, Objekt ist entfernt.

## R3

- Mit `tg_projekt` ausgeführt: Vorprüfung bestanden (0 DELETE-/ALL-Policies),
  `drop policy` scheitert lokal mit `must be owner of relation objects`
  (dieselbe Eigentümerschaftslücke wie oben), R3 bricht deshalb an der
  eigenen Kontrolle korrekt ab, statt eine falsche Erfolgsmeldung auszugeben.
- Mit `supabase_storage_admin` (Eigentümer) wiederholt: alle drei
  verbleibenden 011-Policies entfernt, Kontrolle R3 bestanden, keine
  Policy für `anon` oder `PUBLIC` auf `storage.objects`.

## Neue Kontrollblöcke in Schritt 06/07 — negativ geprüft

Jeweils eine unerlaubte Policy angelegt, Schritt 07 erneut gefahren, Policy
danach wieder entfernt:

| Angelegte Policy | Ergebnis |
|---|---|
| `for update` (authenticated) | `ABBRUCH: Es gibt 1 UPDATE-Policy(s) auf storage.objects. Dateien duerfen nicht ueberschrieben werden.` |
| `for all` (authenticated) | `ABBRUCH: Es gibt 1 ALL-Policy(s) auf storage.objects. Sie decken UPDATE und DELETE mit ab.` |
| `for select to anon` | `ABBRUCH: Auf storage.objects stehen Policies fuer anon oder PUBLIC: ... (anon). Damit waere der Bucket ueber den Anon-Key erreichbar.` |
| `for select to public` | `ABBRUCH: Auf storage.objects stehen Policies fuer anon oder PUBLIC: ... (public). Damit waere der Bucket ueber den Anon-Key erreichbar.` |

Jeder Abbruch rollte die gesamte Transaktion zurück; die vier ursprünglichen
011-Policies standen danach unverändert da (mit `07b_kontrolle_policies.sql`
nachgesehen). Die Basislinie mit allen 12 Prüfungen aus
`07b_kontrolle_policies.sql` bestand vor und nach den Negativtests.

## Was das nicht beweist

Wie immer beim lokalen Nachbau: keine Aussage über die produktive Instanz,
keine echte Storage-API. Die Eigentümerschaftslücke (Schritt 06/07/R3 mussten
lokal als `supabase_storage_admin` statt `tg_projekt` laufen) ist ein bekannter
Unterschied zum gemessenen Testprojekt-Verhalten, kein neuer Befund.
