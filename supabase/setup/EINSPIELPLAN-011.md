# Einspielplan: Migration 011 in die bestehende Datenbank

**Stand 14.09.2026. Plan, keine Ausführung.** Nichts davon ist gegen die
bestehende Datenbank gelaufen. Das Einspielen selbst braucht eine ausdrückliche
Freigabe im laufenden Gespräch; eine frühere Freigabe gilt dafür nicht.

> `supabase/setup/testprojekt-einrichtung-001-bis-011.sql` und
> `…-ohne-storage-trigger.sql` sind **Einrichtungsskripte für ein leeres
> Testprojekt**. Sie legen das komplette Schema von 001 an und dürfen **niemals**
> gegen die bestehende Datenbank laufen. In diesem Plan kommen sie nicht vor.

---

## 1. Was aus Migration 011 dort fehlt

Grundlage war zunächst die Bestandsaufnahme vom 10.09.2026. Sie ist inzwischen
**durch eine eigene Messung ersetzt**: Abschnitt 2a hält den Stand vom
13.09.2026 fest. Der Befund deckt sich — aus 011 fehlt praktisch der gesamte
Inhalt:

| Abschnitt | Fehlt | Umkehrbar? |
|---|---|---|
| 1 | privater Bucket `employee-documents` (10 MB, nur PDF/JPEG/PNG) | ja, solange leer |
| 2 | vier Zeilen in `public.document_types` | ja |
| 3 | `private.is_active_employee()`, `private.is_unlinked_document(text)` samt Grants/Revokes | ja |
| 4a | **entfallen.** Die Zeile aus 011 lautete `grant select, insert, delete on storage.objects to authenticated`, `revoke update` von `authenticated`, `revoke all` von `anon`. Sie wird **nicht** eingespielt — siehe „Schritt 4 ist entfallen" in Abschnitt 3. | — |
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
| D | `011-einspielung/01b_rechteherkunft.sql` | Wer hat die Rechte vergeben, mit `GRANT OPTION`? Wem gehören die Funktionen? Hat die Rolle `BYPASSRLS`? Was tut `storage.protect_delete()`? |
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
3. **Gibt es einen zweiten Bucket?** Posten 13 und 42. Jede Policy dieses Plans
   ist auf `employee-documents` eingeschränkt; ein zweiter Bucket wäre trotzdem
   ein Befund, der vor dem Weiterarbeiten geklärt gehört. Nach der Aufnahme vom
   10.09.2026 gibt es keinen — das ist zu bestätigen, nicht anzunehmen.

   Die frühere dritte Frage lautete, ob `grant`/`revoke` auf `storage.objects`
   greifen. Sie ist beantwortet und hat den Plan geändert: `grant` wirkt,
   `revoke` nicht, und die Plattform lässt den Entzug ohnehin nicht zu. Der
   Schritt, der darauf beruhte, ist entfallen.

---

### Korrektur: der `::text`-Fehler in der Bestandsprüfung

Beim ersten Lauf gegen die bestehende Datenbank brach Posten 51 ab:

```
ERROR 42725: operator is not unique: text || "char"
```

Ursache ist ein Typ, kein Tippfehler. Örtlich gemessen am 13.09.2026 mit
PostgreSQL 17.6:

| Spalte | Typ | Verkettung mit `text` |
|---|---|---|
| `pg_trigger.tgenabled` | `"char"` | **mehrdeutig** — `42725` |
| `pg_namespace.nspname` | `name` | eindeutig |
| `pg_policies.cmd`, `.permissive` | `text` | eindeutig |

`"char"` ist ein einzelnes Byte und nicht dasselbe wie `char(1)`; für
`text || "char"` findet PostgreSQL mehrere gleich gute Kandidaten und
entscheidet nicht. Korrigiert ist Posten 51 in `bestandspruefung-011.sql` zu

```sql
tgname::text || ' [' || tgenabled::text || ']'
```

Die Werte von `tgenabled`: `O` aktiv, `D` deaktiviert, `R` nur Replika,
`A` immer aktiv.

**`diagnose-storage-rechte.sql` ist davon nicht betroffen.** Die beiden
Verkettungen dort (Zeile 129 und 151) wurden nachgemessen und laufen
fehlerfrei — `name` und `text` sind eindeutig. Dort ist **nichts zu ändern**;
eine vorsorgliche Umwandlung wäre eine Änderung ohne Befund.

---

## 2a. Die Bestandsaufnahme aus dem Projekt

**Gemessen am 13.09.2026** im Projekt Taxi Germersheim.
`current_user` = `postgres`, Datenbank `postgres`, PostgreSQL 17.6.
Quellen: `bestandspruefung-011.sql` und `011-einspielung/01_sicherung-ist-stand.sql`.

### Was vorhanden ist

| Posten | Befund |
|---|---|
| Vorbedingungen aus 001/002 | alle sieben vorhanden |
| Plattform-Trigger auf `storage.objects` | zwei: `protect_objects_delete` → `storage.protect_delete()`, `update_objects_updated_at` → `storage.update_updated_at_column()` |
| Plattform-Trigger auf `storage.buckets` | zwei: `protect_buckets_delete` → `storage.protect_delete()`, `enforce_bucket_name_length_trigger` → `storage.enforce_bucket_name_length()` |
| `storage.protect_delete()` | **gemessener Rumpf**, nicht vermutet: wirft `42501` mit `Direct deletion from storage tables is not allowed. Use the Storage API instead.`, außer `current_setting('storage.allow_delete_query', true)` steht auf `'true'` |
| RLS auf `storage.objects` | aktiv |
| `TRIGGER`-Recht der ausführenden Rolle | vorhanden |
| Eigentümer `storage.objects` / `storage.buckets` | `supabase_storage_admin` |
| Mitgliedschaft `postgres` → Eigentümer | `USAGE = false` |
| `GRANT OPTION` von `postgres` auf `storage.objects`/`storage.buckets` | **vorhanden**, voller Rechtesatz, Vergeber `supabase_storage_admin` |

### Was fehlt

| Posten | Befund |
|---|---|
| Buckets | keine |
| Storage-Policies | keine |
| `document_types` | **0 Zeilen** — alle vier Dokumentarten fehlen |
| `document_submissions`, `employee_documents`, `sickness_reports` | je 0 Zeilen |
| Funktionen, Trigger, Spalten und Indizes aus 011 | sämtlich abwesend |

Aus 011 fehlt also **alles**. Es gibt keinen Teilbestand, der eine Sonderbehandlung
nötig machte.

### Rechte, die den Entwurf ändern

`authenticated` und `anon` haben auf `storage.objects` **jeweils
`SELECT`, `INSERT`, `UPDATE`, `DELETE`** — tatsächlich den vollen Satz
`DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE`.

Vergeben hat diese Rechte `supabase_storage_admin`. Daraus folgen drei Dinge:

1. **Diese Grants bleiben unverändert.** Es sind Plattform-Grants. Wir vergeben
   dort nichts dazu, und wir entziehen dort nichts — zu `anon` ebenso wenig wie
   zu `authenticated`. Siehe `CLAUDE.md`, Abschnitt „Plattform-Grants auf
   `storage.objects` und `storage.buckets`".
2. **Der Schritt, der sie ändern sollte, ist entfallen.** `04_rechte_storage.sql`
   ist gelöscht; die Begründung steht in Abschnitt 3 unter „Schritt 4 ist
   entfallen". `01b_rechteherkunft.sql` misst den Vergeber weiter,
   `01c_rechtestand_storage.sql` den Rechtestand — beide rein lesend, als
   Befund, nicht als Vorbereitung eines Eingriffs.
3. **Die einzige wirksame Schranke ist damit RLS.** Ohne Policy verweigert sie
   alles. Das ist der Grund, warum ein Grant ohne Policy harmlos ist — und der
   Grund, warum die Policies dieses Plans eng begrenzt sind: nur
   `to authenticated`, keine `UPDATE`- und keine `ALL`-Policy, jede auf den
   Bucket eingeschränkt.

   **Was RLS nicht erfasst:** `TRUNCATE`, `REFERENCES`, `TRIGGER` und
   `MAINTAIN`; der `BEFORE DELETE`-Trigger feuert bei `TRUNCATE` ebenfalls
   nicht. Dass diese vier Rechte über keine exponierte Schnittstelle erreichbar
   sind, ist eine **Ableitung aus der Architektur, kein Messwert**, und wird
   hier nicht als „RLS-geschützt" ausgegeben.

### `service_role`

`service_role` hat auf `document_submissions`, `employee_documents`,
`sickness_reports` und `document_types` **keine** normalen
`SELECT`/`INSERT`/`UPDATE`/`DELETE`-Rechte.

Kein Schritt in `011-einspielung/` fasst `service_role` an, und keiner ergänzt
etwas. Das wäre eine Ausweitung der Rechte unter dem Deckmantel einer
Einspielung. Wenn ein Server-Zugriff gebraucht wird, ist das eine eigene
Entscheidung mit eigener Begründung — nicht ein Nebeneffekt von 011.

### Zwei Angaben, die die Sicherung bisher nicht erfasst hat

Die Frage, ob `GRANT OPTION`/Vergeber und Funktions-Eigentümer noch gebraucht
werden: **ja, beide.** Sie entscheiden über drei konkrete Stellen.

| Angabe | Entscheidet über |
|---|---|
| Vergeber eines Rechts (`aclexplode(relacl).grantor`) | ob ein `revoke` überhaupt etwas bewirkt. Es nimmt nur zurück, was die ausführende Rolle selbst vergeben hat. Stammt das Recht von `supabase_storage_admin` und ist `postgres` dort kein Mitglied (`USAGE = false`), läuft der Befehl ohne Fehler durch, meldet `REVOKE` — und ändert nichts. Gemessen: **auch ohne `WARNING`**, weil die `GRANT OPTION` vorhanden ist. Dieser Messwert hat Schritt 4 zu Fall gebracht. |
| `is_grantable` (GRANT OPTION) | ob ein `grant` wirkt. Gemessen: **vorhanden**. Genau deshalb fasst **kein** Schritt und **keine** Rückwegstufe diese Rechte an: ein `grant` würde hier wirken und einen zweiten Vergeber-Eintrag hinterlassen, den es vorher nicht gab. |
| Eigentümer einer Funktion | ob **R2 des Rückwegs** `private.guard_document_object_delete()` per `create or replace` ersetzen darf. Ohne Eigentümerschaft scheitert das — und es gibt keinen zweiten Hebel, weil `drop` am Trigger scheitert. |
| Eigentümer **und dessen** `UPDATE` auf `storage.objects` | ob `private.lock_document_object()` im Betrieb funktioniert. Sie ist `SECURITY DEFINER` und nimmt ein `select … for update`. Das verlangt `SELECT` **und** `UPDATE`, und zwar für den **Eigentümer**, nicht den Aufrufer. Fehlt das `UPDATE`, legt sich die Funktion klaglos an und scheitert erst bei jeder Einreichung. |

Ergänzt wurde beides in `01_sicherung-ist-stand.sql` (Bereiche 15, 22, 32) und
als eigenständige, rein lesende Nachmessung in `01b_rechteherkunft.sql`.

### Was der Ist-Stand an den Schritten geändert hat

| Schritt | Änderung |
|---|---|
| 02 | unverändert. Der `insert` in `document_types` gelingt, weil `postgres` die Tabelle besitzt und `FORCE RLS` aus ist — der Eigentümer unterliegt der RLS dann nicht. |
| 03 | unverändert, aber mit einer neuen Abhängigkeit: `storage.buckets` gehört `supabase_storage_admin`, RLS ist aktiv, es gibt keine Policy. Der `insert` gelingt nur, wenn `postgres` `BYPASSRLS` hat. `01b` Bereich 15 misst das. |
| 04 | **entfallen.** Der `grant` hätte gewirkt, aber nichts gewonnen; die beiden `revoke` greifen nicht und sind seit dem 21.04.2025 plattformseitig ausgeschlossen. Siehe Abschnitt 3, „Schritt 4 ist entfallen". An seine Stelle tritt die rein lesende Messung `01c_rechtestand_storage.sql`. |
| 06 | unverändert. Es sind keine fremden Policies auf `storage.objects` vorhanden, die Vorprüfung wird also durchlaufen. |
| R3 | keine Werte mehr einzusetzen: die Stufe fasst Rechte nicht mehr an. |
| R4 | Wortlaut der beiden Insert-Policies eingesetzt, wie gemessen. |
| R6 | Das `delete` auf `document_types` ist jetzt **aktiv**, weil dort vorher 0 Zeilen standen. Das `delete` auf `storage.buckets` ist dagegen **entfallen**: `storage.protect_delete()` blockiert es (gemessen, `42501`). Der Bucket geht nur über Storage-API oder Dashboard. |

### `anon` und die Plattform-Grants

Gemessen hat `anon` den vollen Rechtesatz auf `storage.objects`. Weder die
Einspielung noch der Rückweg ändert daran etwas — in beide Richtungen nicht.
Die Projektregel „`anon` bekommt nirgends Rechte" bleibt in Kraft; ihre einzige
Ausnahme sind genau diese bestehenden Plattform-Grants auf `storage.objects`
und `storage.buckets`, und sie gilt für keine andere Tabelle und kein anderes
Schema.

Die Schranke für `anon` ist deshalb nicht der Grant, sondern RLS: **keine
einzige Policy dieses Plans gilt für `anon` oder für `PUBLIC`.** Ohne Policy
verweigert RLS jeden Zugriff. `06_policies_lesen_schreiben.sql` und
`storage-delete-policy-nachtragen.sql` brechen vor ihrem `commit` ab, sobald
auf `storage.objects` eine Policy für `anon` oder `PUBLIC` steht;
`07b_kontrolle_policies.sql` misst es danach noch einmal sichtbar.

Nach `R3` des Rückwegs steht auf `storage.objects` gar keine Policy mehr. Auch
dann verweigert RLS jeden Zugriff — für `anon` wie für `authenticated`.

---

## 3. Reihenfolge

Jeder Schritt ist ein eigener Lauf mit eigener Kontrolle. Nach jedem Schritt wird
die Ausgabe gelesen, bevor der nächste beginnt.

```
0   Freigabe im Gespraech einholen, Backup/Zeitpunkt der Datenbank sichern
1   Sicherung des Ist-Stands  ->  011-einspielung/01_sicherung-ist-stand.sql
1b  Herkunft der Rechte       ->  011-einspielung/01b_rechteherkunft.sql   rein lesend
1c  Rechtestand storage       ->  011-einspielung/01c_rechtestand_storage.sql  rein lesend
2   Teil "public" von 011     ->  011-einspielung/02_public_teil.sql       (umkehrbar)
3   Bucket                    ->  011-einspielung/03_bucket.sql            (umkehrbar)
3b  Kontrolle Bucket          ->  011-einspielung/03b_kontrolle_bucket.sql rein lesend
4   ENTFAELLT - siehe unten
5   Trigger nachtragen        ->  storage-trigger-nachtragen.sql  EINBAHNSTRASSE
6   Policies insert/select    ->  011-einspielung/06_policies_lesen_schreiben.sql
7   DELETE-Policy ZULETZT     ->  storage-delete-policy-nachtragen.sql
7b  Kontrolle Policies        ->  011-einspielung/07b_kontrolle_policies.sql  rein lesend
8   Schlusskontrolle          ->  bestandspruefung-011.sql erneut, rein lesend
```

Die ausführbaren Dateien liegen in `supabase/setup/011-einspielung/`; der Ablauf
steht dort in `README.md`.

Schritt 1 ersetzt die Bestandsprüfung nicht, sondern ergänzt sie:
`bestandspruefung-011.sql` beantwortet **was fehlt**,
`01_sicherung-ist-stand.sql` liefert **den Rückweg**. Beide sind rein lesend.

Die Dateien für Schritt 5 und 7 liegen weiterhin unmittelbar in
`supabase/setup/` und werden **nicht verdoppelt**. Wo ihre Meldungen auf
`testprojekt-einrichtung-ohne-storage-trigger.sql` verweisen, ist in dieser
Reihenfolge Schritt 2 gemeint.

Begründungen, die nicht verschoben werden dürfen:

- **Schritt 2 vor allem Storage:** Die vier Storage-Policies rufen
  `private.is_active_employee()`, `private.is_unlinked_document()` und
  `private.is_admin()` auf. Vorher sind diese Ausdrücke nicht auflösbar.
- **Grants greifen vor RLS** — hier ist aber nichts zu vergeben. Die
  Plattform-Grants stehen bereits und bleiben unverändert. Umgekehrt ist ein
  Grant **ohne** Policy harmlos: RLS ist aktiv und verweigert dann alles. Genau
  darauf ruht dieser Entwurf.
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
entfällt auch Schritt 7. Der Bucket bleibt ohne DELETE-Policy. Damit ist das
Löschen über die Storage-API gesperrt — nicht über einen Rechteentzug, sondern
weil ohne DELETE-Policy keine Zeile sichtbar wird, die gelöscht werden dürfte.
Verwaiste Dateien räumt in diesem Fall niemand automatisch auf; das wäre ein
offener Punkt und keine Lösung, die stillschweigend hingenommen wird.

### Schritt 4 ist entfallen

`04_rechte_storage.sql` sollte `authenticated` das `UPDATE` und `anon` alle
Rechte auf `storage.objects` entziehen. Die Datei ist gelöscht. Drei Gründe:

1. **Der `grant` darin gewann nichts.** `authenticated` hat
   `SELECT`/`INSERT`/`DELETE` längst von `supabase_storage_admin`.
2. **Die beiden `revoke` greifen nicht** — die ausführende Rolle ist nicht der
   Vergeber. Nachgemessen am 14.09.2026, ohne Fehler und ohne `WARNING`; siehe
   Abschnitt 5.
3. **Die Plattform lässt es ohnehin nicht zu.** Supabase führt
   „Revoking privileges on tables in these schemas from API roles (e.g.
   `anon`)" seit dem 21.04.2025 ausdrücklich unter dem, was auf `auth`,
   `storage` und `realtime` nicht mehr möglich ist
   ([Discussion 34270](https://github.com/orgs/supabase/discussions/34270)).
   Auf der Positivliste stehen dort weiterhin RLS-Policies und Trigger — genau
   das, was die Schritte 5, 6 und 7 tun.

**Die frühere Angabe, der Entzug ginge über das Dashboard, war falsch.**
`storage-policies-dashboard.md` beschreibt den **Policy-Editor**; der legt
Policies an und entzieht keine Tabellenrechte. Ein Policy-Editor ist kein
Nachweis für `GRANT`/`REVOKE`. Einen unterstützten Weg zum Entziehen dieser
Rechte gibt es nicht, weder per SQL noch über die Oberfläche.

**An seine Stelle tritt kein Ersatzeingriff, sondern der Verzicht auf einen.**
Der Dateizugriff ruht auf dem privaten Bucket und auf eng begrenzten Policies:
nur `to authenticated`, keine `UPDATE`- und keine `ALL`-Policy, keine Policy
für `anon` oder `PUBLIC`, jede Policy auf `employee-documents` eingeschränkt,
genau eine `DELETE`-Policy mit `is_unlinked_document`. Die Schritte 6 und 7
brechen vor ihrem `commit` ab, wenn eine dieser Bedingungen verletzt ist;
Schritt 7b misst sie danach noch einmal sichtbar.

Dass das gegen das Überschreiben reicht, ist am **14.09.2026 gegen die echte
Storage-API des Testprojekts** gemessen worden — bei **unveränderten**
Plattform-Grants, `authenticated` besaß das Tabellenrecht `UPDATE` dabei
durchgehend. Upsert und `PUT` werden abgelehnt, SHA-256 vorher = nachher.
Siehe `supabase/tests/storage-api/ERGEBNIS-2026-09-14-ueberschreiben.md`.

---

## 4. Rückweg

Ausführbar in `011-einspielung/90_rueckweg.sql`, sechs eigenständige
Transaktionen `R1` bis `R6`. Jede läuft in `begin; …` mit Kontrolle **vor** dem
`commit` — schlägt die Kontrolle an, wird nichts festgeschrieben.

**Die Reihenfolge ist der Kern des Rückwegs: zuerst der Löschzugriff, dann der
Schutz.** `R1` sperrt das Löschen, erst `R2` neutralisiert den Löschschutz.
Umgekehrt entstünde ein Zeitfenster, in dem gelöscht werden darf und die Prüfung
auf verknüpfte Nachweise bereits abgeschaltet ist — in diesem Fenster verschwinden
verknüpfte Dateien unwiederbringlich. `R2` bricht deshalb ab, wenn `R1` nicht
nachweislich gewirkt hat. Gemessen am 13.09.2026 gegen den lokalen Nachbau:
ohne vorheriges `R1` verweigert `R2` den Dienst, und der Schutz bleibt unverändert.

**Die Werte stammen aus der Messung, nicht aus alten Migrationsdateien.** Eine
Migration sagt, was einmal angelegt wurde — nicht, was vor der Einspielung
tatsächlich dastand. `01_sicherung-ist-stand.sql` liest den Ist-Stand aus den
Systemkatalogen und erzeugt daraus **ausführbare** Anweisungen.

**Seit dem 13.09.2026 sind diese Werte eingesetzt.** In `90_rueckweg.sql` gibt es
keine `>>> EINSETZEN <<<`-Stellen mehr; die betroffenen Stellen sind mit
`GEMESSENER AUSGANGSSTAND` überschrieben. Eingesetzt sind der Wortlaut der
beiden Insert-Policies und der Befund, dass `document_types` vorher leer war.
**Der Rechtesatz auf `storage.objects` gehört seit dem 14.09.2026 nicht mehr
dazu** — keine Stufe setzt ihn zurück, weil keine Stufe ihn verändert. Wird der
Rückweg später gebraucht, gehört die Sicherung vorher **erneut** gefahren und
abgeglichen — die Werte gelten für einen Stichtag, nicht für immer.

| Stufe | Rückweg | Quelle der Werte |
|---|---|---|
| `R1` | DELETE-Policy entfernen **und** `private.guard_document_object_delete()` per `create or replace` auf „jedes Loeschen im Bucket verweigern" umstellen. Zwei unabhängige Riegel; die Kontrolle verlangt, dass mindestens einer nachweislich gegriffen hat. Riegel b) ersetzt das frühere `revoke delete … from authenticated`, das wirkungslos gewesen wäre und nur wie ein Riegel ausgesehen hätte — die Funktion dagegen gehört dem Projekt. Das `drop policy` liegt in einem `do`-Block mit `exception when insufficient_privilege`, weil es ohne Eigentümerschaft an `storage.objects` mit `42501` abbricht. Ohne diese Klammer wäre Riegel b) nie zur Ausführung gekommen. **Riegel b) sperrt auch die Storage-API:** der Bucket wird deshalb erst **nach** `R2` geleert. | — |
| `R2` | `private.guard_document_object_delete()` per `create or replace` auf `return old` setzen. **Kein `drop function`, kein `drop trigger`.** Siehe Abschnitt 5. | — |
| `R3` | Übrige Storage-Policies entfernen. **Keine Rechte-Anweisung mehr** — weder `grant` noch `revoke`, weder für `authenticated` noch für `anon`; die Einspielung hat diese Rechte nie verändert. Die drei `drop policy` sind je in einen `do`-Block mit `exception when insufficient_privilege` gefasst: ohne Eigentümerschaft an `storage.objects` scheitert `drop policy` **hart** mit `42501`. Danach steht auf `storage.objects` keine Policy mehr, und RLS verweigert jeden Zugriff. | — |
| `R4` | `document_submissions_employee_insert` und `sickness_reports_employee_insert` auf den gemessenen Wortlaut zurücksetzen. Kommt **vor** `R5`, weil die verschärften Fassungen `private.is_active_employee()` aufrufen. | eingesetzt: Wortlaut der beiden Policies, gemessen 13.09.2026 |
| `R5` | Sperr-Trigger auf den beiden `public`-Tabellen und die drei Funktionen aus 011 entfernen. Ohne `cascade` — scheitert ein `drop` an einer Abhängigkeit, ist das der Befund. Beide Tabellen gehören dem Projekt, das ist unproblematisch. | — |
| `R6` | Indizes, Spalte `client_request_id`, Dokumentarten. **Die einzige Stufe, die Nutzdaten vernichten kann** — sie bricht ab, sobald Objekte im Bucket liegen oder `client_request_id` Werte trägt. Im Zweifel weglassen: ein Index und eine leere Spalte schaden nicht. **Der Bucket ist hier nicht mehr enthalten:** `storage.protect_delete()` verweigert jedes direkte SQL-`DELETE` auf `storage.buckets` mit `42501`. `R6` enthält deshalb bewusst kein `delete from storage.buckets` — der Bucket wird über die Storage-API (`emptyBucket`, dann `deleteBucket`) oder das Dashboard entfernt. Kein Umweg über `storage.allow_delete_query`. | eingesetzt: `document_types` war leer, das `delete` ist aktiv |

Dateien im Objektspeicher entfernt der Rückweg **nicht** und kann es nicht. Ein
SQL-`DELETE` auf `storage.objects` löscht nur den Katalogeintrag und lässt die
Datei als Leiche im Speicher zurück. Dateien gehen ausschließlich über die
Storage-API.

Nach `R1` bis `R6` unterscheidet sich der Stand vom unberührten Vorher-Stand in
**zwei** Punkten. Beide sind bewusst so gewollt, keiner ist selbst behebbar:

| Rückstand | Begründung | selbst behebbar |
|---|---|---|
| neutralisierte Funktion `private.guard_document_object_delete()` | Abschnitt 5 — `drop function` scheitert am Trigger | nein |
| Trigger `storage_objects_guard_delete` bleibt stehen | Abschnitt 5 — `drop trigger` verlangt Eigentümerschaft an `storage.objects` | nein |

**Die Tabellenrechte auf `storage.objects` stehen bewusst nicht mehr in dieser
Tabelle.** Die frühere Fassung führte zwei weitere Punkte auf — `anon` bekommt
seine Rechte nicht zurück und `authenticated` hat am Ende zwei Vergeber. Beide
entstanden erst durch Rechte-Anweisungen in `R1` und `R3`. Diese Anweisungen
sind gestrichen; die Punkte können damit nicht mehr auftreten.

Der Bucket ist ebenfalls **nicht** enthalten: `R6` entfernt ihn nicht und kann
es nicht (siehe die Zeile zu `R6` oben). Solange er steht, ist auch das eine
Abweichung vom Ausgangsstand.

**Gemessen ist das nicht.** Der Lauf vom 14.09.2026 gegen den lokalen Nachbau
galt der **alten** Fassung von `R1`, `R2` und `R3` und ergab vier Unterschiede.
`R1`, `R2` und `R3` sind seither überarbeitet und **nicht erneut gefahren
worden**. Die zwei oben genannten Punkte sind deshalb eine **Erwartung**, kein
Messwert. Siehe `011-einspielung/README.md`, Abschnitt „Lokaler Prüfstand".

**Ein Lauf, der `R1` bis `R6` sauber festgeschrieben hat, ist keine
vollständige Wiederherstellung des Ausgangsstands.** Wiederhergestellt ist, was
oben in `R3` bis `R6` als solches ausgewiesen ist; die beiden Punkte dieser
Tabelle und der Bucket bleiben und gehören im Protokoll getrennt ausgewiesen.

Die vier Zeilen in `document_types` gehören **nicht mehr** dazu. Solange der
Ausgangsstand unbekannt war, blieben sie stehen; seit die Messung zeigt, dass
die Tabelle vorher leer war, stammen sie vollständig aus 011 und `R6` räumt sie
ab.

---

## 5. Die Einschränkung eigener Storage-Trigger — ausdrücklich

Das Schema `storage` gehört `supabase_storage_admin` und gilt als
schreibgeschützt. Örtlich gemessen am 13.09.2026 mit PostgreSQL 17.6, als Rolle
`tg_projekt` gegen den Nachbau, `storage.objects` im Eigentum von
`supabase_storage_admin`:

| Versuch | Ergebnis |
|---|---|
| `create trigger storage_objects_guard_delete …` | **gelingt** — nur `TRIGGER`-Recht nötig |
| `drop trigger storage_objects_guard_delete …` | `42501 must be owner of relation objects` |
| `alter table storage.objects disable trigger …` | `42501 must be owner of table objects` |
| `create or replace function private.guard_…()` | **gelingt** — die Funktion gehört dem Projekt |
| `create policy … on storage.objects` | `42501 must be owner of table objects` |

Der Trigger lässt sich also weder entfernen **noch abschalten**. Für den Trigger
aus Abschnitt 5 folgt daraus:

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
   ist **nicht eindeutig feststellbar**.
   **Daraus folgt eine Entwurfsregel für alle Schritte dieses Plans:**
   `USAGE=false` und ein fehlendes `GRANT OPTION` sind **Vorhersagen, keine
   Beweise**. Die Skripte messen sie und **melden** sie, brechen deswegen aber
   **nicht** ab. Den verbindlichen Befund liefert der Versuch selbst: scheitert
   er, bricht PostgreSQL mit `42501` ab und die gesamte Transaktion fällt
   zurück — es ist dann nichts geändert. Der Dashboard-Weg aus
   `storage-policies-dashboard.md` bleibt die Rückfallebene.
   Abgebrochen wird nur bei **gemessenen Tatsachen über den Bestand**, etwa
   einer Policy für `anon` oder `PUBLIC` auf `storage.objects`.
6. **Kein Eingriff in die Plattform-Trigger.** Gemessen sind **vier**, nicht
   drei: auf `storage.objects` `protect_objects_delete` (BEFORE DELETE, FOR EACH
   STATEMENT → `storage.protect_delete()`) und `update_objects_updated_at`
   (BEFORE UPDATE, FOR EACH ROW), auf `storage.buckets`
   `protect_buckets_delete` (BEFORE DELETE, FOR EACH STATEMENT → dieselbe
   Funktion) und `enforce_bucket_name_length_trigger` (BEFORE INSERT OR UPDATE
   OF `name`, FOR EACH ROW). Alle vier bleiben unberührt. Die Schlusskontrolle
   in `storage-trigger-nachtragen.sql` prüft ausdrücklich nach, dass die beiden
   auf `storage.objects` noch stehen.
7. **Kein Eigentümerwechsel, kein `SET ROLE`, keine Rolleneskalation** — in
   keinem Schritt dieses Plans.

### `grant` und `revoke` sind zwei verschiedene Prüfungen

Dieser Befund wiegt schwerer als die Eigentümerfrage, weil er **keinen Fehler
erzeugt**. Die erste Fassung dieses Abschnitts war zudem in einem Punkt falsch
und ist am 14.09.2026 im örtlichen Nachbau **mit der genauen Rollen- und
Rechtekombination des Projekts** neu gemessen worden.

Entscheidend sind zwei getrennte Prüfungen:

| Befehl | Gefragt wird | Gemessene Antwort im Projekt |
|---|---|---|
| `grant` | Darf die ausführende Rolle dieses Recht weitergeben? → `GRANT OPTION` | **ja** — `postgres` hat auf `storage.objects` und `storage.buckets` den vollen Rechtesatz **`WITH GRANT OPTION`** |
| `revoke` | Ist die ausführende Rolle der **Vergeber** des Eintrags? | **nein** — Vergeber ist `supabase_storage_admin`, und `postgres` ist dort kein Mitglied |

Gemessen am 14.09.2026 gegen den Nachbau dieser Kombination:

```
grant select, insert, delete on storage.objects to authenticated;
  GRANT
-- wirkt: es entsteht ein ZWEITER ACL-Eintrag mit postgres als Vergeber

revoke update on storage.objects from authenticated;
  REVOKE
-- wirkt nicht, und zwar OHNE WARNING
```

**Die frühere Behauptung, dabei erscheine eine `WARNING`, ist damit widerlegt.**
PostgreSQL warnt nur, wenn der Rolle für das Recht die `GRANT OPTION` fehlt. Sie
hat sie hier — der Befehl gilt als zulässig und entfernt trotzdem nichts, weil
kein Eintrag mit diesem Vergeber existiert. Es gibt **kein** akustisches Signal.

Folgen für die Schritte:

- **Schritt 4 ist daran gescheitert und entfallen.** Sein einziger inhaltlicher
  Gewinn wäre der Entzug gewesen, und der greift nicht. Siehe Abschnitt 3.
- **Kein anderer Schritt und keine Rückwegstufe fasst diese Rechte an.** Auch
  `R3` nicht: ein `grant` würde hier wirken und einen zweiten Vergeber-Eintrag
  hinterlassen, den es vorher nicht gab — das wäre keine Wiederherstellung,
  sondern eine zusätzliche Abweichung.

Wer im SQL Editor nur auf `REVOKE` schaut, schreibt fest und glaubt, die Rechte
stünden — bis sich der Entzug im Betrieb als Nichtereignis erweist. Genau
deshalb steht in diesem Plan kein `revoke` auf `storage.objects` mehr.

**Konsequenz für alle Schritte:** Die Kontrolle vor dem `commit` prüft
grundsätzlich das **Ergebnis** mit `has_table_privilege`, niemals den
Rückgabewert des Befehls — und auch nicht den berechneten Mitgliedschaftswert
aus `01b` Bereich 22, der nur eine Vorhersage ist.

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
- **Der überarbeitete Rückweg ist ungeprüft.** `R1`, `R2` und `R3` sind am
  14.09.2026 umgebaut und seither weder lokal noch sonst irgendwo gefahren
  worden. Dasselbe gilt für die neuen Kontrollblöcke in
  `06_policies_lesen_schreiben.sql` und `storage-delete-policy-nachtragen.sql`
  sowie für die Abfragen `01c_rechtestand_storage.sql`,
  `03b_kontrolle_bucket.sql` und `07b_kontrolle_policies.sql`.
- **Nachgewiesen ist dagegen die Verweigerung des Überschreibens** — am
  14.09.2026 gegen die echte Storage-API des **Testprojekts**, 34 von 34
  Prüfungen. Für die bestehende Datenbank sagt auch dieser Lauf nichts.
- Kein Deployment der Website ist Teil dieses Plans.
