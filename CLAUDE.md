# Projektregeln — Taxi Germersheim 2.0

Diese Datei gilt für jede Sitzung. Sie enthält dauerhafte Regeln, **keinen**
Arbeitsstand — der veraltet und steht in Git.

---

## Was dieses Projekt ist

Eine statische Website aus reinem HTML, CSS und JavaScript. **Es gibt keinen
Build-Schritt** und keine `package.json` im Wurzelverzeichnis. Die Dateien
werden so ausgeliefert, wie sie hier liegen.

Ungefährer Umfang: 85 HTML-, 95 JS-, 34 CSS- und 23 SQL-Dateien.

| Ordner | Inhalt |
|---|---|
| Wurzel | öffentliche Seiten (Buchung, Konto, Flotte, Rechtliches) |
| `fahrer/` | Mitarbeiterportal |
| `admin/` | Verwaltungsbereich |
| `dashboard/` | Auswertungen |
| `supabase/` | Migrationen, Setup-Skripte, lokale Tests |
| `assets/` | Bilder, Marke |

### Die wichtigste Eigenheit

Die JavaScript-Dateien sind IIFE-Module, die über rund **87 verschiedene
`window.*`-Globals** miteinander reden. Es gibt kein Modulsystem und keine
Abhängigkeitsauflösung.

**Folge:** Die Reihenfolge der `<script>`-Tags ist bedeutungstragend. Wer eine
Datei verschiebt, umbenennt oder ein Global umbenennt, muss alle Nutzungsstellen
suchen. Vor solchen Änderungen erst das ganze Feld durchsuchen, nicht raten.

---

## Supabase

### Grundregeln

- **Niemals gegen die Produktivinstanz ausführen** ohne ausdrückliche Freigabe
  im laufenden Gespräch. Eine frühere Freigabe gilt nicht für den nächsten Fall.
- **Bestehende Migrationen werden nie verändert.** Änderungen kommen als neue,
  fortlaufend nummerierte Migration. Ein Hook sperrt Schreibzugriffe auf
  vorhandene Dateien in `supabase/migrations/`; neue Dateien sind erlaubt.
- Lokale SQL-Dateien sind **kein Nachweis** dafür, welche Regeln in der
  produktiven Datenbank aktiv sind. Das muss abgefragt werden.

### Regeln für Policies und Funktionen

- `anon` bekommt **nirgends** Rechte. Einzige Ausnahme: die bestehenden,
  von Supabase verwalteten Plattform-Grants auf `storage.objects` und
  `storage.buckets` — siehe unten.
- In `SECURITY DEFINER`-Funktionen immer `set search_path = ''` und alle Namen
  voll qualifizieren.
- **Grants greifen vor RLS.** Fehlt der Grant, hilft die beste Policy nichts.
- **Permissive Policies verknüpfen mit ODER.** Eine zusätzliche Policy kann
  Zugriff nur erweitern, nie einschränken.
- In `SECURITY DEFINER` ist `current_user` der **Funktionseigentümer**, nicht
  der ursprüngliche Aufrufer. Als Berechtigungsprüfung unbrauchbar.
- `create policy` verlangt Eigentümerschaft an der Tabelle, `create trigger`
  dagegen nur das `TRIGGER`-Recht. Das sind zwei verschiedene Prüfungen.
- Das Schema `storage` gehört `supabase_storage_admin` und gilt als
  schreibgeschützt. Dateioperationen laufen ausschließlich über die
  Storage-API — ein SQL-`DELETE` auf `storage.objects` entfernt nur den
  Katalogeintrag und lässt die Datei als Leiche im Speicher zurück.
- Kein Service-Role-Key im Browser. Ein Publishable-/Anon-Key ist allein kein
  Geheimnis.

### Plattform-Grants auf `storage.objects` und `storage.buckets`

Diese Ausnahme gilt **ausschließlich für diese beiden Tabellen**. Sie ist keine
allgemeine Lockerung und wird auf kein anderes Schema und keine andere Tabelle
übertragen.

- **Bestehende, von Supabase verwaltete Plattform-Grants auf diesen beiden
  Tabellen bleiben unverändert.** Kein `GRANT`, kein `REVOKE`. Supabase führt
  „Revoking privileges on tables in these schemas from API roles (e.g. `anon`)"
  seit dem 21.04.2025 ausdrücklich unter dem, was nicht mehr möglich ist
  ([Discussion 34270](https://github.com/orgs/supabase/discussions/34270)).
  Ein `REVOKE` dort läuft ohne Fehler und ohne Warnung durch und bewirkt nichts.
- **Wir vergeben dort keine zusätzlichen Rechte an `anon`.** Was `anon` an
  Plattform-Grants schon hat, bleibt; dazu kommt von uns nichts.
- **Der Dateizugriff wird durch einen privaten Bucket und ausdrücklich
  begrenzte RLS-Policies geregelt.** Policies nur `to authenticated`, nie für
  `anon` oder `PUBLIC`, keine `UPDATE`- und keine `ALL`-Policy, jede Policy auf
  den Bucket eingeschränkt.
- **Nicht von RLS erfasste Rechte dürfen nicht als RLS-geschützt bezeichnet
  werden.** RLS greift bei `SELECT`, `INSERT`, `UPDATE`, `DELETE` und `MERGE`.
  `TRUNCATE`, `REFERENCES`, `TRIGGER` und `MAINTAIN` erfasst sie **nicht**, und
  der `BEFORE DELETE`-Trigger feuert bei `TRUNCATE` ebenfalls nicht. Diese vier
  Rechte sind über keine exponierte Schnittstelle erreichbar — das ist eine
  Ableitung aus der Architektur, **kein Messwert**, und wird auch so benannt.

---

## Git

- Gearbeitet wird **ausschließlich auf Feature-Branches**, abgezweigt von `dev`.
- `main` und `dev` sind **schreibgeschützt**: kein Edit, kein Write, kein
  Commit, kein Push, kein Merge. Analysieren und Lesen sind dort erlaubt.
- **Kein Force-Push**, in keiner Schreibweise.
- **Kein `git reset --hard`** — auf keinem Branch.
- **Kein `git clean -f`** in irgendeiner Form.
- Merge nach `main` oder `dev` nur durch den Menschen.
- Commit und Push nur auf ausdrückliche Aufforderung, nicht beiläufig.

---

## Testen

### Datenbank

Portables PostgreSQL, **kein Windows-Dienst**:

1. Server starten auf `127.0.0.1:55432`
2. Die Nachbildungen `00_supabase_shim.sql` und `01_storage_shim.sql` aus
   `supabase/tests/local/` laden — sie stellen `auth` und `storage` bereit
3. Die nummerierten Testdateien fahren
4. **Server danach wieder stoppen**

Nur isolierte Testdaten verwenden. Keine produktiven Kunden- oder
Mitarbeiterkonten — IDs sind ebenfalls personenbezogen.

### Oberfläche

Playwright liegt isoliert in `fahrer/tests/` mit eigener `.gitignore` und nutzt
das installierte Chrome statt eines eigenen Browser-Downloads.

### Bekannte Grenzen — nicht überschreiben

- Die **echte Supabase-Storage-API ist lokal nicht verfügbar.** Ein bestandener
  Browser-Stub-Test ist kein Nachweis für das Verhalten der Storage-API.
- Ein Strukturvergleich ist **kein** Testlauf.
- Lokal bestandene Tests sagen nichts über die produktive Instanz.

---

## Was nicht behauptet werden darf

Dieser Punkt hat in diesem Projekt wiederholt Schaden angerichtet. Deshalb
ausdrücklich:

- **Keine erfundenen Fachregeln.** Eine technische Eindeutigkeit ist kein
  Ersatz für eine Geschäftsregel. Im Zweifel fragen.
- **Kein „getestet"** ohne tatsächlichen Testlauf. Was nicht lief, wird als
  ungeprüft benannt.
- **Ungeprüfte Rechte sind kein nachgewiesener Datenabfluss.** Zwischen
  bewiesenem Problem, möglichem Risiko und ungeprüftem Punkt wird getrennt.
- Eine leere Tabelle ist **kein Nachweis** für irgendetwas.
- Bei Unsicherheit: „Nicht eindeutig feststellbar" ist eine gültige Antwort.

---

## Schreibweisen

- **SQL-Kommentare und maschinennahe Texte** ohne Umlaute, transliteriert:
  `Loeschen`, `Eigentuemer`, `gepruefte`. So ist der Bestand durchgehend
  gehalten, und es vermeidet Kodierungsprobleme in Konsolen.
- **Oberflächen- und Datentexte** mit echten Umlauten: `Führerschein`,
  `Personenbeförderungsschein`.
- Kommentare und Meldungen auf Deutsch.
- Beim Einfügen von Text in HTML immer maskieren. Eine Umlaut-Transliteration
  ist **keine** Maskierung.

---

## Aktive Schutz-Hooks

Unter `.claude/hooks/` liegen fünf Hooks, registriert in
`.claude/settings.json`. Beides darf der Assistent **nicht selbst ändern** —
sonst wären die Schutzregeln wertlos. Lockerungen laufen über den Menschen.

| Hook | Wirkung |
|---|---|
| `pfadschutz.ps1` | Schreibsperre auf `main`/`dev`; schützt die Claude-Konfiguration und bestehende Migrationen |
| `git-schutz.ps1` | sperrt Force-Push, Ziel `main`/`dev`, `reset --hard`, `clean -f`, Branch-Löschung, Commit/Merge auf `main`/`dev` |
| `geheimnis-waechter.ps1` | blockt Service-Role-Keys, private Schlüssel, GitHub-Token |
| `testerinnerung.ps1` | erinnert nach SQL-Änderungen an den ausstehenden Testlauf |
| `branch-anzeige.ps1` | zeigt Branch und offene Änderungen beim Sitzungsstart |

Die Hooks sind ein **Geländer gegen Versehen, kein Käfig**. Sie ersetzen weder
Nachdenken noch Rückfragen.
