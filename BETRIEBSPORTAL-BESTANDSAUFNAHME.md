# Betriebsportal — Bestandsaufnahme vor dem Umbau

**Branch:** `feature/030-betriebsportal-neu`
**Ausgangscommit:** `61d5134` („Schichtplanung: ein Weg zur Schicht statt vier")
**Stand:** 29.09.2026
**Phasen:** 0 (Bestand schützen) und 1 (Funktionsinventur), erster Durchgang

Dieses Dokument hält fest, **was heute tatsächlich da ist** — gemessen am
Code, nicht aus der Erinnerung. Es bewertet noch nichts und baut noch
nichts um.

> **Einordnung nach Projektregel.** Alles in diesem Dokument ist
> **statisch geprüft** (Messung an den Dateien) oder **mit isolierter
> Attrappe geprüft** (die Prüfläufe). Nichts davon ist eine Aussage über
> die produktive Supabase-Instanz.

---

## 0. Ausgangslage

| Punkt | Befund |
|---|---|
| Branch vorher | `feature/029b-tagesveroeffentlichung` |
| Ausgangscommit | `61d5134` |
| Arbeitsverzeichnis | sauber, keine offenen Änderungen |
| Neuer Branch | `feature/030-betriebsportal-neu`, abgezweigt von `61d5134` |

### Abweichung von der Projektregel — bewusst und benannt

`CLAUDE.md` verlangt, Feature-Branches von `dev` abzuzweigen. Gemessen:

- `dev` steht auf `a32b0c7`
- HEAD enthält **27 Commits, die `dev` nicht hat**
- `dev` enthält **0 Commits, die HEAD nicht hat**

Ein Abzweig von `dev` würde 27 geprüfte Commits verwerfen — darunter das
gesamte Mitarbeiterportal und die neue Schichtplanung. Der Auftrag nennt
ausdrücklich den „aktuellen geprüften Stand". Deshalb ist von `61d5134`
abgezweigt. Das Zusammenführen nach `dev` bleibt wie immer beim Menschen.

### Ausgangszustand der automatisierten Prüfungen

Alle vor dem Umbau ausgeführt, damit später belegbar ist, was der Umbau
verändert hat:

| Prüflauf | Ergebnis |
|---|---|
| `ausgabe-pruefen` | 56 / 0 |
| `grundlagen-pruefen` | 60 / 0 |
| `rechtsseiten-pruefen` | 167 / 0 |
| `flotte-pruefen` | 199 / 0 |
| `kontoseiten-pruefen` | 181 / 0 |
| `rewards-pruefen` | 66 / 0 |
| `portal-pruefen` | 99 / 0 |
| `schichten-pruefen` | 115 / 0 |
| `auth-027-pruefen` | 37 / 0 |
| `qualitaet-pruefen` | 45 / 0 |
| **Summe** | **1025 bestanden, 0 offen** |

Weitere vorhandene Prüfläufe (`startseite-pruefen`, `anmeldung-pruefen`,
`gluecksrad-pruefen`, `rush-pruefen`, `handy-pruefen`, `sichtprobe-pruefen`,
`yumak-*`, `kopf-teaser-pruefen`, `browser-pruefen`,
`grundlagen-browser-pruefen`) betreffen die öffentliche Webseite und sind
vom Umbau des Betriebsportals nicht berührt.

### Manuelle Prüfungen

In `ANLEITUNG-PORTALTEST.md`, Anhang A, sind bisher **zwei** manuelle
Tests am echten System als bestanden protokolliert: die Anmeldung des
Testfahrers und das Anlegen des Testfahrzeugs. Alles andere im
Mitarbeiterportal ist **weiterhin nur mit Attrappe geprüft**.

---

## 1. Umfang des heutigen Betriebsportals

| Bereich | Umfang |
|---|---|
| `admin/` HTML-Seiten | **61** |
| `admin/` JavaScript | **79 Dateien, 38 346 Zeilen** |
| `admin/` CSS | **17 Dateien, 11 986 Zeilen** |
| `fahrer/` | 2 Seiten, 4 Skripte, 1 Stylesheet |
| `dashboard/` | 1 Seite |
| Migrationen | 11, mit zusammen 94 Policies |

Zum Vergleich: die gesamte neue öffentliche Webseite besteht aus 23
Astro-Komponenten und 15 Seiten.

---

## 2. Der wichtigste Befund: fast alles läuft im Browserspeicher

Gemessen wurde für jede der 61 Seiten, woher ihre Daten kommen. Dabei
wurden die auf fast jeder Seite eingebundenen gemeinsamen Dateien
(`auth.js`, `supabase-auth.js`, `supabase-config.js`) **getrennt**
gezählt — sonst sieht jede Seite gleich aus.

| Datenquelle | Seiten |
|---|---:|
| **Supabase** (echter Server) | **7** |
| **nur Browserspeicher** (`localStorage`) | **48** |
| keine eigene Datenquelle (reine Anzeige/Hülle) | 6 |

Die sieben Seiten mit echter Anbindung sind:
`schichtplanung`, `mitarbeiter`, `wochenplanung`, `fahrzeuge`, `rewards`,
`dokumentfristen`, `abwesenheiten` — dazu `login` als Anmeldung.

### Was „nur Browserspeicher" praktisch bedeutet

Sieben gemeinsame Module halten den gesamten übrigen Betrieb in
`localStorage`-Schlüsseln:

| Modul | Schlüssel | Zeilen |
|---|---|---:|
| `personal-shared.js` | `adminV17PersonnelState` | 1364 |
| `qualitaet-shared.js` | `adminV18QualityState` | 1324 |
| `systemcenter-shared.js` | `adminV20SystemCenterState` | 1279 |
| `management-shared.js` | `adminV19ManagementState` | 1032 |
| `planung-v25-shared.js` | `adminV25PlanningCore` | 776 |
| `finanzen-shared.js` | `adminV16FinanceState` | 603 |
| `termin-intake-shared.js` | `adminV24QuickIntake` | 591 |

Folgen, die sich daraus **zwingend** ergeben:

- Zwei Dispatcher an zwei Rechnern sehen **verschiedene** Daten. Es gibt
  keinen gemeinsamen Stand.
- Wer den Browserspeicher leert, verliert alles.
- Nichts davon ist gesichert, exportierbar oder nachvollziehbar.
- Keine dieser Daten ist durch RLS geschützt — sie liegen im Browser.

Das betrifft unter anderem **Fahrten, Fahrtanfragen, Kunden, Rechnungen,
Zahlungen, Mahnwesen, Beschwerden, Unfälle, Schulungen, Urlaub** und die
gesamte Unternehmenssteuerung.

### Erfundene Personendaten im ausgelieferten Code

`admin/termin-cockpit.js` enthält ab Zeile 19 fest eingebaute
„Kundenprofile" mit **erfundenen Namen, erfundenen Telefonnummern und
Gesundheitsbezug** (Dialyse, Strahlentherapie) — zum Beispiel
„Herr Müller, 0171 221100, Dialyse Speyer".

Das ist keine Testdatei, sondern ausgelieferter Code. Diese Angaben
erscheinen in der Oberfläche wie echte Kundendaten. Der Auftrag verlangt
ausdrücklich, keine Fantasiedaten als echte Daten darzustellen — dies ist
der deutlichste Fall im Bestand.

---

## 3. Navigation und Erreichbarkeit

- Die Seitenleiste (`sidebar.js`) führt **12** Seiten.
- `auth.js` kennt daneben eine zweite, ältere Navigation mit rund **50**
  Einträgen.
- **49 Seiten** sind über die heutige Seitenleiste nicht erreichbar. Sie
  werden überwiegend nur in `auth.js` und in den gemeinsamen
  Speichermodulen erwähnt — erreichbar also nur durch direkte Eingabe der
  Adresse.
- `wochenplanung.html` hat **keinen einzigen** Verweis, obwohl die Seite
  echten Supabase-Zugriff besitzt.

---

## 4. Zwei Rollenmodelle, die nicht zusammenpassen

Das ist der wichtigste Sicherheitsbefund der Bestandsaufnahme.

### Modell A — Datenbank (wirksam)

`public.profiles.role`, Standardwert `'employee'`. In den Migrationen
kommen genau drei Werte vor:

`admin` · `dispatcher` · `employee`

Darauf bauen alle 94 Policies auf. Das ist **serverseitig durchgesetzt**.

### Modell B — Browser (nicht wirksam)

`admin/auth.js` kennt **neun** deutsche Rollen:

`Chef` · `Geschaeftsleitung` · `Disposition` · `Buchhaltung` · `Fahrer` ·
`Werkstatt` · `Personalverwaltung` · `Qualitaetsmanagement` ·
`Mitarbeiter`

Dazu gehört eine Tabelle `ROLE_PAGE_ACCESS`, die jeder Seite Rollen
zuordnet. Diese Rolle stammt aus `localStorage`
(`localStorage.getItem(KEY_ROLE)`) und fällt, wenn nichts gesetzt ist,
auf **`"Chef"`** zurück — die höchste Rolle.

### Was davon trägt, und was nicht

**Der Eintritt ins Betriebsportal ist echt geschützt.** `auth.js` prüft
vor der Anzeige: gültige Supabase-Sitzung, vorhandenes Profil,
`active === true` und `role` in `["admin", "dispatcher"]`. Wer das nicht
erfüllt, wird zur Anmeldung zurückgeschickt.

**Die Trennung *innerhalb* des Portals trägt nicht.** Die neun Rollen sind
Navigationsfilter im Browser. Ein angemeldeter Dispatcher kann die Rolle
im Browserspeicher auf `Chef` setzen und alle Navigationseinträge und
Seiten öffnen.

**Genaue Einordnung — kein nachgewiesener Datenabfluss.** Die so
erreichbaren Seiten zeigen fast ausschließlich Daten aus dem
Browserspeicher, also Daten, die der Benutzer ohnehin selbst besitzt. Die
sieben Seiten mit echtem Serverzugriff bleiben durch RLS geschützt, die
nur `admin`/`dispatcher` kennt. Es ist damit **belegt, dass die vom
Auftrag geforderte Rollentrennung heute nicht existiert** — es ist
**nicht** belegt, dass darüber fremde Daten abfließen. Das wäre getrennt
zu prüfen.

**Für Phase 2 folgt daraus:** Die geforderte Trennung zwischen Dispatcher
und Admin (Lohn, Personalakten, Krankmeldungen, Rollenverwaltung) lässt
sich mit dem heutigen Modell nicht herstellen. Sie braucht eine
serverseitige Entsprechung.

---

## 5. Datenbank — was es gibt

21 Tabellen in `public`:

`absences` · `customers` · `document_submissions` · `document_types` ·
`employee_documents` · `employees` · `notifications` ·
`plan_publications` · `profiles` · `rewards_accounts` ·
`rewards_spin_transactions` · `rewards_transactions` ·
`rewards_vouchers` · `rewards_wheel_spins` · `ride_series` · `rides` ·
`shifts` · `sickness_reports` · `tasks` · `vacation_requests` ·
`vehicles`

Bemerkenswert: `rides` und `customers` **existieren** als Tabellen, werden
aber von keiner Seite des Betriebsportals gelesen oder geschrieben —
Fahrten und Kunden laufen heute vollständig über den Browserspeicher.

Für Lohnabrechnungen (Phase 9) und Webseitenanalyse (Phase 14) gibt es
**keine** Tabellen. Beides bräuchte neue, additive Migrationen.

---

## 6. Der Datendienst

`admin/taxi-data-service.js` (1254 Zeilen) ist die einzige Stelle mit
einem geordneten Supabase-Zugriff. Er deckt ab:

Mitarbeiter · Fahrzeuge · Schichten · Planveröffentlichungen ·
Benachrichtigungen · Dokumente · Urlaub · Krankmeldungen

Er deckt **nicht** ab: Fahrten, Fahrtanfragen, Kunden, Rechnungen,
Zahlungen, Rewards-Verwaltung, Analyse.

Damit ist die technische Grundlage für das neue Portal vorhanden, aber
nur für etwa ein Drittel der geforderten Bereiche.

---

## 7. Was das für den Master-Auftrag bedeutet

Diese Punkte sind Folgerungen aus den Messungen oben, keine Vorwegnahme
von Entscheidungen.

1. **Phase 6 (Fahrten), 11 (Kunden), 12 (Rechnungen)** haben heute keine
   Serverdatenquelle. Der Auftrag verlangt ausdrücklich, nichts
   vorzutäuschen. Für diese Bereiche gibt es nur zwei ehrliche Wege:
   neue additive Migrationen — oder ein klar benannter Leerzustand.
2. **Phase 2 (Rollentrennung)** braucht eine Entscheidung über das
   Rollenmodell: bleiben die drei Datenbankrollen und die neun
   Browserrollen verschwinden, oder werden zusätzliche Rollen
   serverseitig eingeführt? Das ist eine Geschäftsentscheidung, keine
   technische.
3. **Phase 9 (Lohnabrechnungen)** und **Phase 14 (Analyse)** sind
   vollständig neu. Beide brauchen Migrationen und für die Analyse eine
   rechtliche Freigabe.
4. **Phase 10 (PAJ GPS)**: noch nicht untersucht — folgt.
5. **48 Seiten im Browserspeicher** lassen sich nicht „mitnehmen". Für
   jede ist zu entscheiden: übernehmen mit echter Datenquelle,
   zurückstellen, oder entfallen lassen.

---

## 8. PAJ GPS — untersucht, Ergebnis eindeutig

Gemessen im gesamten Bestand (ohne `node_modules` und Ausgabeordner):

- **Kein einziger Netzaufruf.** Weder `fetch`, noch `XMLHttpRequest`,
  noch eine PAJ-Adresse.
- **Keine Zugangsdaten** im ausgelieferten Code.
- Vorhanden ist ein Platzhalter `PajLocationProvider` in
  `planung-v25-shared.js`, der einen Text „PAJ GPS später" zurückgibt,
  und eine Einstellungskarte `data-settings-section="paj-demo"` in
  `einstellungen.html`.
- Diese Karte sagt selbst: „Echte PAJ-Verbindung benötigt eine sichere
  serverseitige Schnittstelle."

**Einordnung:** Es gibt heute **keine** PAJ-Integration — weder eine
sichere noch eine unsichere. Damit ist nichts abzusichern und nichts
abzuschalten. Ohne dokumentierte API und Berechtigung bleibt der
Integrationsstatus **offen**, wie der Auftrag es verlangt. Ein Aufbau wäre
nur serverseitig sinnvoll und ist keine Aufgabe dieser Phase.

---

## 9. Webseitenanalyse — heute nicht vorhanden

Gemessen in `src/`, `admin/` und `fahrer/`: **kein** `gtag`, **kein**
Google Tag Manager, **kein** Matomo, **kein** Plausible, **kein**
`dataLayer`. Es findet heute keinerlei Besuchermessung statt.

Das ist für Phase 14 eine gute Ausgangslage: es gibt nichts abzulösen und
keine Altlast an Einwilligungen. Alles, was kommt, kann von Anfang an
datensparsam gebaut werden. Die rechtliche Freigabe bleibt eine
Entscheidung des Auftraggebers.

---

## 10. Erfundene Kennzahlen

Neben den erfundenen Kundenprofilen (Abschnitt 2) gibt es einen zweiten
Fall: `management-shared.js` berechnet betriebliche Kennzahlen und
vermerkt im Code selbst „Aus Dispo-Wartefeldern, sonst plausible
Demo-Schätzung."

Eine geschätzte Zahl, die wie eine gemessene aussieht, ist für eine
Betriebsentscheidung schlechter als gar keine Zahl. Im neuen Portal darf
eine Kennzahl entweder belegt sein oder als nicht vorhanden erscheinen —
nichts dazwischen.

---

## 11. Nächste Schritte

Abgeschlossen: Phase 0 vollständig, Phase 1 im ersten Durchgang
(Datenquellen, Navigation, Rollen, PAJ, Analyse).

Offen und als Nächstes:

1. Phase 1 vertiefen: je Funktion Lese- und Schreibwege, bekannte Lücken
   und Zuordnung zum neuen Portal.
2. Phase 2: Rollenmatrix als Vorschlag, einschließlich der Frage, welche
   Rollen serverseitig überhaupt existieren sollen.
3. Phase 3/4: neue Informationsarchitektur und Design-System aus der
   öffentlichen Webseite ableiten.
4. Phase 21: klickbare Designprobe — danach der **verbindliche
   Haltepunkt** und die Freigabe des Auftraggebers.

Kein Umbau am echten Betriebsportalcode vor diesem Haltepunkt.

---

## Anhang — Seitentabelle

Erzeugt aus dem Code. „Zeilen eigener Code" zählt nur die Skripte, die
nicht auf mindestens fünf Seiten eingebunden sind.

| Seite | Datenquelle (gemessen) | Zeilen eigener Code | in Navigation | Verweise | Rollen laut `auth.js` |
|---|---|---:|:---:|---:|---:|
| `schichtplanung` | Supabase | 3686 | ja | 14 | 3 |
| `mitarbeiter` | Supabase | 2452 | - | 2 | 4 |
| `fahrzeuge` | Supabase | 2406 | ja | 16 | 3 |
| `wochenplanung` | Supabase | 1798 | - | 0 | 0 |
| `rewards` | Supabase | 1117 | ja | 1 | 0 |
| `abwesenheiten` | Supabase | 508 | - | 3 | 4 |
| `dokumentfristen` | Supabase | 407 | ja | 4 | 4 |
| `tagesplanung` | nur Browserspeicher | 3291 | - | 6 | 0 |
| `live-dispo` | nur Browserspeicher | 2512 | - | 11 | 3 |
| `termin-cockpit` | nur Browserspeicher | 1779 | ja | 5 | 0 |
| `telefonzentrale` | nur Browserspeicher | 1726 | - | 5 | 3 |
| `aufgaben-center` | nur Browserspeicher | 1625 | - | 6 | 0 |
| `benachrichtigungen-center` | nur Browserspeicher | 1590 | - | 4 | 0 |
| `arbeitsplatz` | nur Browserspeicher | 1535 | - | 4 | 0 |
| `rollen-rechte` | nur Browserspeicher | 1449 | - | 2 | 0 |
| `kunden` | nur Browserspeicher | 1148 | ja | 13 | 4 |
| `einstellungen` | nur Browserspeicher | 937 | ja | 11 | 4 |
| `termin-schnellerfassung` | nur Browserspeicher | 935 | - | 4 | 0 |
| `login` | nur Browserspeicher | 803 | - | 2 | 0 |
| `index` | nur Browserspeicher | 742 | ja | 21 | 5 |
| `fahrer` | nur Browserspeicher | 695 | ja | 13 | 2 |
| `serienfahrten` | nur Browserspeicher | 620 | - | 4 | 3 |
| `rechnungen` | nur Browserspeicher | 538 | ja | 11 | 3 |
| `werkstatt` | nur Browserspeicher | 481 | - | 9 | 6 |
| `export-backup` | nur Browserspeicher | 399 | - | 2 | 3 |
| `krankenkassen` | nur Browserspeicher | 295 | - | 2 | 2 |
| `abrechnungszentrale` | nur Browserspeicher | 280 | - | 3 | 4 |
| `beschwerden` | nur Browserspeicher | 252 | - | 4 | 5 |
| `urlaubsplanung` | nur Browserspeicher | 230 | - | 2 | 4 |
| `personaluebersicht` | nur Browserspeicher | 193 | - | 5 | 5 |
| `personalaufgaben` | nur Browserspeicher | 147 | - | 1 | 5 |
| `betriebssteuerung` | nur Browserspeicher | 145 | - | 1 | 5 |
| `schulungen` | nur Browserspeicher | 142 | - | 1 | 2 |
| `monatsabschluss` | nur Browserspeicher | 135 | - | 4 | 3 |
| `fundbuero` | nur Browserspeicher | 129 | - | 2 | 4 |
| `kapazitaetsplanung` | nur Browserspeicher | 126 | - | 1 | 4 |
| `zahlungen` | nur Browserspeicher | 118 | - | 2 | 2 |
| `qualitaetsberichte` | nur Browserspeicher | 108 | - | 1 | 5 |
| `controlling` | nur Browserspeicher | 107 | - | 3 | 3 |
| `pruefungen` | nur Browserspeicher | 105 | - | 2 | 4 |
| `mitteilungen` | nur Browserspeicher | 103 | - | 1 | 5 |
| `pruefcenter` | nur Browserspeicher | 103 | - | 1 | 3 |
| `geschaeftsfuehrer-dashboard` | nur Browserspeicher | 102 | ja | 5 | 6 |
| `nachfrageprognose` | nur Browserspeicher | 102 | - | 1 | 4 |
| `szenarien` | nur Browserspeicher | 102 | - | 2 | 3 |
| `kassenuebersicht` | nur Browserspeicher | 99 | - | 1 | 2 |
| `massnahmen` | nur Browserspeicher | 88 | - | 2 | 5 |
| `qualitaetsuebersicht` | nur Browserspeicher | 81 | - | 1 | 5 |
| `unfaelle` | nur Browserspeicher | 81 | - | 3 | 3 |
| `vorfaelle` | nur Browserspeicher | 78 | - | 2 | 4 |
| `fahrzeuguebergaben` | nur Browserspeicher | 73 | - | 1 | 2 |
| `mahnwesen` | nur Browserspeicher | 73 | - | 1 | 2 |
| `geschaeftsberichte` | nur Browserspeicher | 64 | - | 2 | 6 |
| `entscheidungscenter` | nur Browserspeicher | 62 | - | 1 | 4 |
| `ziele` | nur Browserspeicher | 43 | - | 1 | 6 |
| `dokumente` | keine eigene Datenquelle | 412 | - | 8 | 4 |
| `verlauf` | keine eigene Datenquelle | 363 | - | 4 | 4 |
| `hilfe` | keine eigene Datenquelle | 327 | - | 2 | 5 |
| `statistiken` | keine eigene Datenquelle | 323 | ja | 10 | 5 |
| `live-karte` | keine eigene Datenquelle | 241 | - | 7 | 4 |
| `benutzer` | keine eigene Datenquelle | 216 | - | 4 | 1 |
