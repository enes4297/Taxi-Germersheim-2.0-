# Gezielte Einspielung der fehlenden Teile aus Migration 011

**Stand 14.09.2026. Nichts davon ist gegen das Projekt Taxi Germersheim
gelaufen.** Das Einspielen braucht eine ausdrückliche Freigabe im laufenden
Gespräch; eine frühere Freigabe gilt dafür nicht.

Der zugehörige Plan mit allen Begründungen steht in
[`../EINSPIELPLAN-011.md`](../EINSPIELPLAN-011.md).

---

## Wofür dieser Ordner da ist

Migration 011 soll **nicht am Stück** eingespielt werden. Die bestehende
Datenbank hat Teile davon möglicherweise schon, und einige Schritte sind nicht
umkehrbar. Deshalb liegt hier jeder Abschnitt als eigener Lauf mit eigener
Vorprüfung und eigener Kontrolle **vor** dem `commit`.

Ausdrücklich **nicht** verwendet werden
`testprojekt-einrichtung-001-bis-011.sql` und
`…-ohne-storage-trigger.sql`. Das sind Einrichtungsskripte für ein leeres
Testprojekt; sie legen das komplette Schema ab 001 an. Sie dürfen niemals
gegen die bestehende Datenbank laufen.

**Keine Testkonten, keine Testdaten.** Nichts in diesem Ordner legt Konten,
Mitarbeiter oder Beispieldatensätze an. Die einzigen Zeilen, die entstehen,
sind die vier Dokumentarten aus Abschnitt 2 der Migration — das sind
Stammdaten, keine Testdaten.

---

## Reihenfolge

Jede Datei wird einzeln in den SQL Editor kopiert. Nach jedem Lauf wird die
Ausgabe gelesen, bevor der nächste beginnt.

| # | Datei | Umkehrbar? |
|---|---|---|
| 01 | `01_sicherung-ist-stand.sql` | rein lesend |
| 01b | `01b_rechteherkunft.sql` | rein lesend |
| 01c | `01c_rechtestand_storage.sql` | rein lesend |
| 02 | `02_public_teil.sql` | ja |
| 03 | `03_bucket.sql` | ja |
| 03b | `03b_kontrolle_bucket.sql` | rein lesend |
| 05 | `../storage-trigger-nachtragen.sql` | **nein — Einbahnstraße** |
| 06 | `06_policies_lesen_schreiben.sql` | ja |
| 07 | `../storage-delete-policy-nachtragen.sql` | ja |
| 07b | `07b_kontrolle_policies.sql` | rein lesend |
| 08 | `../bestandspruefung-011.sql` erneut | rein lesend |
| — | `90_rueckweg.sql` | nur im Rückfall |

**Die Nummer 04 fehlt, weil Schritt 04 entfallen ist.** `04_rechte_storage.sql`
sollte `authenticated` das `UPDATE` und `anon` alle Rechte auf
`storage.objects` entziehen. Dieser Schritt hatte kein erreichbares Ziel und
ist gelöscht; die Begründung steht unten im Abschnitt
„Schritt 04 ist entfallen". Die frühere Kontrolle `04b_kontrolle_rechte.sql`
lebt als **rein lesende Messung** `01c_rechtestand_storage.sql` weiter — sie
hält den Rechtestand fest, statt ihn zu verändern.

Schritt 05 und 07 liegen bewusst weiterhin in `supabase/setup/` und sind hier
**nicht verdoppelt**. Beide haben bereits Vorprüfung und Kontrolle vor dem
`commit`, und beide nennen im Kopf ausdrücklich ihre Nummer in dieser
Reihenfolge. Wo ihre Abbruchmeldungen auf
`testprojekt-einrichtung-ohne-storage-trigger.sql` verweisen, ist hier
**Schritt 02** gemeint.

Die Nummern 05 und 07 fehlen in diesem Ordner deshalb. Das ist Absicht, keine
Lücke.

### Was die Reihenfolge trägt

- **02 vor allem Storage.** Die Storage-Policies rufen
  `private.is_active_employee()`, `private.is_unlinked_document()` und
  `private.is_admin()` auf. Vorher sind diese Ausdrücke nicht auflösbar.
- **Grants greifen vor RLS** — aber es gibt hier nichts zu vergeben. Die
  Plattform-Grants auf `storage.objects` stehen bereits und bleiben
  unverändert. Umgekehrt ist ein Grant **ohne** Policy harmlos: RLS ist aktiv
  und verweigert dann alles. Genau darauf ruht dieser Entwurf.
- **05 vor 07.** Ohne den Trigger wäre die DELETE-Policy die einzige Schranke.
  Ihre Prüfung läuft auf dem Snapshot des Statements und sieht eine gleichzeitig
  entstehende Verknüpfung nicht. Zwischen Policy und Trigger darf kein
  Zeitfenster liegen.
- **07 ganz zuletzt.** Permissive Policies verknüpfen mit **ODER**. Eine
  zusätzliche DELETE-Policy kann das Löschrecht nur erweitern, nie einschränken.

---

## Der gemessene Ist-Stand, 13.09.2026

Rolle `postgres`, Datenbank `postgres`, PostgreSQL 17.6. Vollständig in
[`../EINSPIELPLAN-011.md`](../EINSPIELPLAN-011.md), Abschnitt 2a. Drei Befunde
ändern das Verhalten der Schritte:

1. **Aus 011 fehlt alles.** Keine Buckets, keine Storage-Policies, `document_types`
   leer, keine der neuen Funktionen, Trigger, Spalten oder Indizes. Es gibt
   keinen Teilbestand, der eine Sonderbehandlung nötig machte.
2. **`authenticated` und `anon` haben auf `storage.objects` bereits alles** —
   `DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE`,
   vergeben von `supabase_storage_admin`. Diese Grants bleiben **unverändert**.
   Der Zugriff wird über den privaten Bucket und die Policies der Schritte 06
   und 07 geregelt. `01b_rechteherkunft.sql` misst den Vergeber,
   `01c_rechtestand_storage.sql` den Stand.
3. **`service_role` hat auf den vier `public`-Tabellen keine
   `SELECT`/`INSERT`/`UPDATE`/`DELETE`-Rechte.** Kein Schritt hier fasst
   `service_role` an, und keiner ergänzt still etwas. Ein Server-Zugriff wäre
   eine eigene Entscheidung mit eigener Begründung, kein Nebeneffekt von 011.

Zwei weitere Abhängigkeiten, die erst durch die Messung sichtbar wurden:

- Schritt 03 schreibt in `storage.buckets`. Die Tabelle gehört
  `supabase_storage_admin`, RLS ist aktiv und es gibt **keine** Policy. Der
  `insert` gelingt nur über `BYPASSRLS` der ausführenden Rolle.
- Schritt 02 schreibt in `public.document_types`. Das gelingt, weil `postgres`
  die Tabelle besitzt und `FORCE RLS` aus ist — der Eigentümer unterliegt der
  RLS dann nicht.

---

## Grenzen eigener Storage-Trigger

Örtlich gemessen am 13.09.2026 mit PostgreSQL 17.6, Rolle `tg_projekt`,
`storage.objects` im Eigentum von `supabase_storage_admin`:

| Versuch | Ergebnis |
|---|---|
| `create trigger …` | **gelingt** — nur `TRIGGER`-Recht nötig |
| `drop trigger …` | `42501 must be owner of relation objects` |
| `alter table … disable trigger …` | `42501 must be owner of table objects` |
| `create or replace function private.guard_…()` | **gelingt** |
| `create policy … on storage.objects` | `42501 must be owner of table objects` |

Daraus folgt:

1. Der Trigger `storage_objects_guard_delete` lässt sich von der Projektrolle
   weder **entfernen** noch **abschalten**. Wer ihn anlegt, muss damit rechnen,
   dass er bleibt.
2. Die Einbahnstraße beginnt erst beim `commit`. Ein `rollback` nimmt den
   Trigger mit — dafür ist keine Eigentümerschaft nötig. Genau deshalb steht
   die Kontrolle vor dem `commit`.
3. Der einzige verbleibende Hebel ist der **Körper der Funktion**.
   `90_rueckweg.sql` Stufe `R2` ersetzt ihn per `create or replace` durch
   `return old`. Der Trigger feuert weiter und prüft nichts mehr. Das ist eine
   Neutralisierung, kein Rückbau.
4. **`drop function` ist kein Rückweg.** Der Trigger hängt daran; ohne
   `cascade` scheitert es, mit `cascade` müsste der Trigger fallen — und genau
   das darf die Projektrolle nicht. Ein Trigger ohne Funktion würde bei jedem
   `DELETE` auf `storage.objects` einen Fehler werfen und damit den gesamten
   Objektspeicher des Projekts lahmlegen.
5. Ein vollständiger Rückbau geht nur über Dashboard oder Supabase-Support.
6. Die **vier** Plattform-Trigger bleiben **unberührt**: auf `storage.objects`
   `protect_objects_delete` und `update_objects_updated_at`, auf
   `storage.buckets` `protect_buckets_delete` und
   `enforce_bucket_name_length_trigger`. Jede Kontrolle in diesem Ordner prüft
   nach, dass die beiden auf `storage.objects` noch stehen.

---

## Zwei Messwerte, die den Entwurf bestimmen

### `USAGE=false` ist keine Vorhersage, auf die man sich verlässt

Im Testprojekt gelang `create policy` **trotz** `USAGE=false`. Deshalb brechen
die Schritte hier bei einem fehlenden Katalogrecht **nicht** ab. Sie messen es,
melden es als Hinweis und **versuchen es trotzdem**. Scheitert der Versuch,
bricht PostgreSQL mit `42501` ab, die gesamte Transaktion fällt zurück und es
ist nichts geändert.

Abgebrochen wird nur bei **gemessenen Tatsachen über den Bestand** — etwa einem
zweiten Bucket, den eine Policy ohne Bucketfilter mit erfassen würde.

### `grant` und `revoke` sind zwei verschiedene Prüfungen

Eine frühere Fassung dieses Abschnitts war falsch. Sie stützte sich auf einen
Nachbau, in dem die Projektrolle **keine** `GRANT OPTION` hatte, und schloss
daraus auf zwei `WARNING`-Zeilen. Die vollständige Nachmessung zeigt: `postgres`
hat auf `storage.objects` und `storage.buckets` den vollen Rechtesatz
**`WITH GRANT OPTION`**, vergeben von `supabase_storage_admin`.

Die beiden Befehle fragen Verschiedenes:

| Befehl | Gefragt wird | Antwort im Projekt |
|---|---|---|
| `grant` | Darf ich dieses Recht weitergeben? → `GRANT OPTION` | **ja** |
| `revoke` | Bin ich der **Vergeber** dieses Eintrags? | **nein** — das ist `supabase_storage_admin` |

Nachgemessen am 14.09.2026 gegen den Nachbau genau dieser Kombination:

```
grant select, insert, delete on storage.objects to authenticated;
  GRANT
-- wirkt: es entsteht ein ZWEITER ACL-Eintrag, Vergeber ist die Projektrolle

revoke update on storage.objects from authenticated;
  REVOKE
-- wirkt nicht - und zwar OHNE jede WARNING
```

**Es gibt hier kein akustisches Signal.** PostgreSQL warnt nur, wenn der Rolle
für das Recht die `GRANT OPTION` fehlt; sie hat sie. Der Befehl gilt als
zulässig und entfernt trotzdem nichts, weil kein Eintrag mit diesem Vergeber
existiert. Wer nur auf `REVOKE` schaut, schreibt fest und glaubt, der Entzug
stünde.

Auch die Spalte in `01b` Posten 22 beantwortet die Frage **nicht**: sie misst
die Mitgliedschaft im Vergeber, nicht das Ergebnis eines `revoke`. Sie hieß
früher „entziehbar" — der Name war irreführend und ist berichtigt.

Deshalb prüft jede Kontrolle das **Ergebnis** mit `has_table_privilege` und
niemals den Rückgabewert des Befehls oder einen berechneten Vorhersagewert.

---

## Schritt 04 ist entfallen

`04_rechte_storage.sql` enthielt drei Anweisungen: einen `grant` an
`authenticated`, ein `revoke update` von `authenticated` und ein `revoke all`
von `anon`. Die Datei ist gelöscht. Drei Gründe, in dieser Reihenfolge:

1. **Der `grant` gewann nichts.** `authenticated` hat
   `SELECT`/`INSERT`/`DELETE` längst von `supabase_storage_admin`. Er hätte nur
   einen zweiten Vergeber-Eintrag angelegt.
2. **Die beiden `revoke` greifen nicht.** Sie entfernen nur Einträge, die die
   ausführende Rolle selbst vergeben hat — und laufen sonst ohne Fehler und
   ohne Warnung durch. Siehe den Abschnitt darüber.
3. **Die Plattform lässt es ohnehin nicht zu.** Supabase führt
   „Revoking privileges on tables in these schemas from API roles (e.g.
   `anon`)" seit dem 21.04.2025 ausdrücklich unter dem, was auf `auth`,
   `storage` und `realtime` nicht mehr möglich ist
   ([Discussion 34270](https://github.com/orgs/supabase/discussions/34270)).
   Erlaubt bleiben auf einer Positivliste, die `storage.objects` und
   `storage.buckets` einschließt: RLS-Policies und Trigger. Genau das tun die
   Schritte 05, 06 und 07.

**Die frühere Angabe, der Entzug ginge über das Dashboard, war falsch.** Sie
stand im Kopf von `04_rechte_storage.sql`, im `EINSPIELPLAN-011.md` und hier.
`storage-policies-dashboard.md` beschreibt den Policy-Editor — der legt
Policies an und entzieht keine Tabellenrechte. Ein Policy-Editor ist kein
Nachweis für `GRANT`/`REVOKE`. Einen unterstützten Weg zum Entziehen dieser
Rechte gibt es nicht, weder per SQL noch über die Oberfläche.

### Was an die Stelle tritt

Der Dateizugriff wird durch einen **privaten Bucket** und **ausdrücklich
begrenzte RLS-Policies** geregelt:

- Policies nur `to authenticated`, nie für `anon` oder `PUBLIC`
- keine `UPDATE`-Policy und keine `ALL`-Policy
- jede Policy auf den Bucket `employee-documents` eingeschränkt
- genau eine `DELETE`-Policy, und die prüft `is_unlinked_document`

`07b_kontrolle_policies.sql` misst diese vier Punkte nach dem Lauf; die
Kontrollen in 06 und 07 brechen schon vor ihrem `commit` ab, wenn einer
verletzt ist.

Dass das reicht, ist am **14.09.2026 gegen die echte Storage-API des
Testprojekts** gemessen worden: Überschreiben per Upsert und per `PUT` wird
abgelehnt, und der Inhalt der Datei ist danach byteweise unverändert
(SHA-256 vorher = nachher). Der Lauf fand bei **unveränderten
Plattform-Grants** statt — `authenticated` besaß das Tabellenrecht `UPDATE`
dabei durchgehend. Siehe
[`../../tests/storage-api/ERGEBNIS-2026-09-14-ueberschreiben.md`](../../tests/storage-api/ERGEBNIS-2026-09-14-ueberschreiben.md).

### Was das nicht heißt

`TRUNCATE`, `REFERENCES`, `TRIGGER` und `MAINTAIN` werden von RLS **nicht**
erfasst, und der `BEFORE DELETE`-Trigger feuert bei `TRUNCATE` ebenfalls nicht.
Diese vier Rechte sind über keine exponierte Schnittstelle erreichbar — das ist
eine **Ableitung aus der Architektur, kein Messwert**, und wird auch nirgends
als „RLS-geschützt" bezeichnet.

---

## Rückweg

`90_rueckweg.sql`, sechs eigenständige Transaktionen `R1` bis `R6`.

**Zuerst der Löschzugriff, dann der Schutz.** `R1` sperrt das Löschen, erst
`R2` neutralisiert den Löschschutz. Umgekehrt entstünde ein Zeitfenster, in dem
gelöscht werden darf und die Prüfung auf verknüpfte Nachweise bereits
abgeschaltet ist — in diesem Fenster verschwinden verknüpfte Dateien
unwiederbringlich.

`R1` hat dafür zwei Riegel: **a)** die `DELETE`-Policy entfernen und **b)** die
eigene Funktion `private.guard_document_object_delete()` per
`create or replace` auf „alles verweigern" umstellen. Riegel b) ersetzt das
frühere `revoke delete on storage.objects from authenticated` — das wäre
wirkungslos gewesen und hätte nur so ausgesehen wie ein Riegel. Die Funktion
dagegen gehört dem Projekt, und ein `create or replace` darauf gelingt.

**`R2` verlangt mehr als `R1`.** `R1` lässt einen der beiden Riegel genügen;
`R2` nimmt aber genau Riegel b) wieder heraus und bricht deshalb ab, solange
noch eine `DELETE`- oder `ALL`-Policy auf `storage.objects` steht.

**Der Bucket wird nach `R2` geleert, nicht vorher.** Solange Riegel b) steht,
lehnt der Trigger jedes Löschen im Bucket ab — auch über die Storage-API.
`R6` verlangt einen leeren Bucket.

Die Werte für `R3`, `R4` und `R6` stammen aus der Ausgabe von
`01_sicherung-ist-stand.sql` vom 13.09.2026, **nicht** aus alten
Migrationsdateien. Eine Migration sagt, was einmal angelegt wurde — nicht, was
vor der Einspielung tatsächlich dastand.

**Sie sind eingesetzt.** Es gibt keine `>>> EINSETZEN <<<`-Stellen mehr:

| Stufe | Eingesetzter Messwert |
|---|---|
| `R4` | Wortlaut der beiden Insert-Policies vor der Verschärfung |
| `R6` | `document_types` hatte 0 Zeilen — das `delete` der vier Dokumentarten ist deshalb aktiv |

Für `R3` wird **kein** Rechtestand mehr eingesetzt: die Stufe vergibt und
entzieht auf `storage.objects` nichts.

Die Werte gelten für den **Stichtag 13.09.2026**. Wird der Rückweg später
gebraucht, gehört `01_sicherung-ist-stand.sql` vorher erneut gefahren.

### Was der Rückweg nicht kann

- **Hochgeladene Dateien entfernt er nicht.** `storage.objects` ist nur der
  Katalog. Ein SQL-`DELETE` dort löscht den Eintrag und lässt die Datei als
  Leiche im Objektspeicher zurück. Dateien gehen ausschließlich über die
  Storage-API (`remove`). `R6` bricht ab, solange Objekte im Bucket liegen.
- **Den Storage-Trigger entfernt er nicht.** Siehe oben.
- **Den Bucket entfernt er nicht** — und versucht es auch nicht mehr. Auf
  `storage.buckets` sitzt der Plattform-Trigger `protect_buckets_delete`
  (`BEFORE DELETE … FOR EACH STATEMENT EXECUTE storage.protect_delete()`).
  Dessen Rumpf ist inzwischen **gemessen**: er wirft `42501` mit
  `Direct deletion from storage tables is not allowed. Use the Storage API instead.`
  Ein direktes SQL-`DELETE` ist damit ausgeschlossen. `R6` enthält deshalb
  **kein** `delete from storage.buckets`. Der Bucket wird über die Storage-API
  (`emptyBucket`, dann `deleteBucket`) oder das Dashboard entfernt. **Kein
  Umweg über `storage.allow_delete_query`**, und keine Änderung an den
  Plattform-Triggern — `90_rueckweg.sql` verwendet beides nirgends. Bis das
  geschehen ist, gilt der Bucket als **offener Punkt**; `R6` meldet ihn als
  solchen.
- **Nachträglich entstandene Werte stellt er nicht her.** Wurde
  `sickness_reports.client_request_id` befüllt, gingen diese Werte beim
  Entfernen der Spalte verloren. `R6` misst das und bricht ab.
- **Die Tabellenrechte auf `storage.objects` und `storage.buckets` fasst er
  nicht an** — weder bei `authenticated` noch bei `anon`. Die Einspielung hat
  sie nie verändert; es gibt dort nichts wiederherzustellen. Die früheren
  `revoke`/`grant`-Zeilen in `R1` und `R3` sind ersatzlos gestrichen: das
  `revoke` wäre wirkungslos gewesen, das `grant` dagegen **wirksam** — es hätte
  einen zweiten Vergeber-Eintrag angelegt, den es vorher nicht gab, und den
  Stand damit **weiter** vom Ausgangsstand entfernt. Die Schranke nach `R3` ist
  RLS: es steht dann keine Policy mehr auf `storage.objects`, und ohne Policy
  verweigert RLS jeden Zugriff — auch für `anon`.
- **`private.guard_document_object_delete()` bleibt bestehen.** Vor 011 gab es
  die Funktion nicht. `drop function` ist aber kein gangbarer Weg, solange der
  Trigger an ihr hängt.

### Wiederherstellung und Sicherheitsänderung sind zweierlei

`90_rueckweg.sql` trennt das im Kopf und in den Meldungen ausdrücklich:

| | Inhalt |
|---|---|
| **A) Wiederherstellung des Ausgangsstands** | die Policies, Trigger, Funktionen, Spalten und Indizes, die `R1` bis `R6` nachweislich auf den gemessenen Stand zurückdrehen |
| **B) bewusst beibehaltene Sicherheitsänderungen** | `storage_objects_guard_delete` bleibt neutralisiert stehen; `private.guard_document_object_delete()` bleibt bestehen |
| **C) offen** | der Bucket — per SQL nicht zu entfernen, Storage-API oder Dashboard |

Die Tabellenrechte auf `storage.objects` tauchen in keiner der drei Gruppen
auf. Sie gehören in keine: sie wurden nie verändert.

**Ein Lauf, der A vollständig erledigt hat, ist trotzdem keine vollständige
Wiederherstellung des Ausgangsstands.** Der Schlussbericht von `R6` weist die
Gruppen getrennt aus und sagt das wörtlich.

---

## Lokaler Prüfstand

Alle Schritte wurden am 13.09.2026 gegen einen **lokalen Nachbau** gefahren:
portables PostgreSQL 17.6 auf `127.0.0.1:55432`, die Nachbildungen aus
`supabase/tests/local/` (`00_supabase_shim`, `01_storage_shim`,
`02_plattform_shim`) und die Migrationen 001 bis 010 als Rolle `tg_projekt` —
ohne Testdaten und ohne 011.

`02_plattform_shim.sql` wurde dafür am 14.09.2026 an den **vollständig
nachgemessenen** Projektstand angeglichen:

- die drei Plattformfunktionen `storage.protect_delete()`,
  `storage.update_updated_at_column()` und
  `storage.enforce_bucket_name_length()` mit ihrem **gemessenen Rumpf**, im
  Eigentum von `supabase_storage_admin`. Die früher erfundenen Platzhalter
  `storage.protect_objects_delete()` und `storage.update_objects_updated_at()`
  sind entfallen;
- alle **vier** Plattform-Trigger, nicht nur drei;
- die Grants an `anon`, `authenticated` und `service_role` werden ausdrücklich
  **als** `supabase_storage_admin` vergeben;
- die Projektrolle erhält denselben vollen Satz **`WITH GRANT OPTION`**, und
  zwar ebenfalls **vom Eigentümer**. Genau diese Kombination steht im Projekt:
  `grant` ist damit zulässig, `revoke` bleibt wirkungslos. Ein zusätzlicher
  Grant durch einen Superuser hätte einen zweiten Vergeber-Eintrag erzeugt und
  die Frage verfälscht;
- auch der Eigentümer selbst hat im Projekt einen ausdrücklichen Eintrag mit
  `GRANT OPTION`; ohne ihn wich der Nachbau in einer Spalte ab.

Erst dadurch bildet der Nachbau den gemessenen Fall ab. Alle zehn ACL-Zeilen
stimmen mit der Projektmessung überein.

Gelaufen ist:

- `01b_rechteherkunft.sql` gegen den Vorher-Stand: 33 Zeilen, fehlerfrei. Der
  Nachbau weist für `storage.objects` `von tg_projekt entziehbar: false` aus.
- `02` und `03` als `tg_projekt`: beide Kontrollen bestanden, `commit`.
- Das damalige `04` als `tg_projekt`: die beiden `revoke` liefen **ohne Fehler**
  durch und bewirkten nichts. Die Kontrolle schlug an und rollte die
  Transaktion zurück: `authenticated hat noch UPDATE auf storage.objects`.
  Dieser Lauf ist der Grund, warum es Schritt 04 nicht mehr gibt.
- `06` als `tg_projekt`: `create policy` scheiterte mit
  `42501 must be owner of table objects`, die Transaktion fiel vollständig
  zurück. Die Vorprüfung hatte das als **Vorhersage** gemeldet, nicht als
  Abbruchgrund — so gebaut, weil im Testprojekt `create policy` trotz
  `USAGE=false` gelang.
- `02`, `03`, `06`, `05`, `07` als Eigentümerrolle: alle Kontrollen bestanden.
  Das damalige `04` lief dabei mit; es ist inzwischen entfallen.
- `90_rueckweg.sql` `R1` bis `R6` gegen den vollständig eingespielten Nachbau:
  alle sechs `commit` — allerdings erst, nachdem die 011-Storage-Policies wie im
  Projekt vorgesehen über den Dashboard-Weg entfernt waren. Der Vergleich mit
  dem unberührten Vorher-Nachbau (Policies, Trigger, Funktionsrümpfe, Spalten,
  Indizes, Buckets, `document_types`, Rechte **samt Vergeber**) ergab **vier**
  Unterschiede:
  die neutralisierte Funktion `private.guard_document_object_delete()`,
  der Trigger `storage_objects_guard_delete`, die nicht zurückgegebenen Rechte
  von `anon` — und `authenticated` mit Rechten von **zwei** Vergebern,
  `supabase_storage_admin` und der ausführenden Projektrolle.
  Die vier Zeilen in `document_types` waren **nicht** darunter — seit die
  Messung sagt, dass sie aus 011 stammen, räumt `R6` sie ab.
  Der Bucket war ebenfalls nicht darunter, weil `R6` ihn nicht anfasst;
  er bleibt als offener Punkt stehen.
- Dabei fielen zwei Fehler im Rückweg auf, die behoben sind: `R1` und `R3`
  starben am ersten `drop policy` (`42501 must be owner of relation objects`),
  bevor der Rest der Stufe lief. Anders als `revoke` ist `drop policy` **kein**
  stiller Leerlauf. Beide fassen ihre `drop policy` jetzt in `do`-Blöcke mit
  `exception when insufficient_privilege`.
- `R2` **ohne** vorheriges `R1`: brach mit
  `ABBRUCH R2: Der Loeschzugriff ist offen` ab, der Löschschutz blieb
  unverändert aktiv.

### Dieses Protokoll gilt für die alte Fassung von `R1`, `R2` und `R3`

**`R1`, `R2` und `R3` sind am 14.09.2026 überarbeitet und seither nicht erneut
gefahren worden.** Geändert hat sich:

- `R1` sperrt das Löschen nicht mehr über `revoke delete on storage.objects`,
  sondern über Riegel b) — den ausgetauschten Funktionsrumpf.
- `R2` und `R3` setzen jetzt voraus, dass **keine** `DELETE`- und **keine**
  `ALL`-Policy mehr steht. Das ist strenger als die Kontrolle von `R1`, und
  zwar mit Absicht: `R2` nimmt den Riegel b) wieder heraus.
- `R3` enthält überhaupt keine Rechte-Anweisung mehr.

Damit ist der Teil des Protokolls, der die zurückbleibenden `anon`-Rechte und
die zwei Vergeber bei `authenticated` nennt, **überholt**. Diese beiden
Unterschiede können nicht mehr entstehen, weil keine Stufe mehr Rechte anfasst.
Zu erwarten sind noch zwei: die neutralisierte Funktion und der stehende
Trigger.

**Erwartet ist nicht gemessen.** Der Lauf gegen den lokalen Nachbau steht aus.
Bis er vorliegt, gilt der überarbeitete Rückweg als **ungeprüft** — und
ebenso die neuen Kontrollblöcke in `06`, in
`../storage-delete-policy-nachtragen.sql` und die Abfrage
`07b_kontrolle_policies.sql`.

### Was dieser Prüfstand nicht beweist

Ein lokal bestandener Lauf sagt **nichts** über die bestehende Instanz. Der
Nachbau bildet Rechte und Eigentümerschaft nach, nicht die echte Plattform. Vor
allem:

- Die **echte Supabase-Storage-API ist lokal nicht verfügbar.** Ob ein Upload
  oder ein `remove` über die API durchgeht, ist hier nicht geprüft und kann
  hier nicht geprüft werden.
- **`storage.protect_delete()` ist jetzt mit dem gemessenen Rumpf nachgebildet.**
  Der frühere Platzhalter hatte keinen Rumpf, der etwas verweigern konnte.
  `01b` Posten 38 hat den echten Rumpf gelesen; `02_plattform_shim.sql` setzt
  ihn wortgleich ein. Gemessen wirft er `42501` mit
  `Direct deletion from storage tables is not allowed. Use the Storage API instead.`,
  außer `current_setting('storage.allow_delete_query', true)` steht auf `'true'`.
  Damit ist belegt: ein `delete from storage.buckets` per SQL geht **nicht**.
  `R6` versucht es deshalb gar nicht mehr.
- Ob `postgres` im Projekt überhaupt das `DELETE`-Recht auf `storage.buckets`
  hätte, ist für `R6` ohne Belang geworden — der Trigger greift vorher. `01b`
  Posten 34 misst das Recht weiterhin, als Befund, nicht als Bedingung.
- `create policy` auf `storage.objects` bleibt ein **offener Messwert**. Lokal
  scheitert es mit `42501` — im Testprojekt gelang es trotz `USAGE=false`.
  Welcher Fall eintritt, entscheidet der Lauf, nicht die Vorhersage.
- Das `grant`/`revoke`-Verhalten ist dagegen **nicht** mehr offen: der Nachbau
  hält seit dem 14.09.2026 die genaue Rechtekombination des Projekts
  (voller Satz `WITH GRANT OPTION`, Vergeber `supabase_storage_admin`) und
  reproduziert damit den gemessenen Fall. Siehe den Abschnitt oben.
