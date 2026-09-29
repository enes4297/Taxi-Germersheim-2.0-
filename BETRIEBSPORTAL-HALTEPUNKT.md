# Betriebsportal — Bericht am verbindlichen Haltepunkt

**Branch:** `feature/030-betriebsportal-neu`
**Stand:** 29.09.2026
**Phasen abgeschlossen:** 0, 1, 2, 3, 4, 19, 21
**Kein echter Betriebsportalcode ist verändert.**

---

## 1. Branch und lokale Commits

| Commit | Inhalt |
|---|---|
| `61d5134` | Ausgangsstand (Schichtplanung aus Schritt 029d) |
| `0d9f344` | Bestandsaufnahme (Phase 0 und 1) |
| `ad17c9c` | Rollenmodell entworfen und lokal geprüft (Phase 2) |
| *dieser* | Architektur, Design-System, Designprobe, Messungen |

Kein Push, kein Merge, kein Deployment, keine produktive Datenänderung.
Arbeitsverzeichnis nach dem Commit sauber.

---

## 2. Bestandsaufnahme — die vier Befunde

Vollständig in `BETRIEBSPORTAL-BESTANDSAUFNAHME.md`. Kurz:

1. **48 von 61 Admin-Seiten haben keine Serverdatenquelle.** Nur sieben
   sprechen mit Supabase. Der Rest läuft über sieben gemeinsame
   `localStorage`-Module. Zwei Dispatcher an zwei Rechnern sehen
   verschiedene Daten.
2. **Zwei unvereinbare Rollenmodelle.** Datenbank: `admin`,
   `dispatcher`, `employee`, durchgesetzt über 94 Policies. Browser:
   neun deutsche Rollen aus `localStorage`, mit Rückfall auf „Chef".
3. **Erfundene Personendaten im ausgelieferten Code** —
   `termin-cockpit.js` mit Namen, Telefonnummern und Gesundheitsbezug;
   `management-shared.js` mit „plausibler Demo-Schätzung" als Kennzahl.
4. **PAJ GPS und Analyse existieren nicht** — kein Netzaufruf, keine
   Zugangsdaten, keine Messung.

**Ausgangszustand der Prüfungen vor dem Umbau:** 1025 bestanden, 0 offen.

---

## 3. Rollenmatrix

Vollständig in `BETRIEBSPORTAL-ROLLENMATRIX.md`.

Fünf serverseitige Rollen mit Mehrfachzuordnung. Geprüft wird nie eine
Rolle, sondern eine **Fähigkeit**.

| Fähigkeit | admin | dispatcher | personal | accounting | employee |
|---|:-:|:-:|:-:|:-:|:-:|
| `operations.read/write` | ✔ | ✔ | — | — | — |
| `fleet.read` | ✔ | ✔ | — | — | — |
| `fleet.write` | ✔ | — | — | — | — |
| `personnel.read/write` | ✔ | — | ✔ | — | — |
| `payroll.read/write` | ✔ | — | ✔ | — | — |
| `customers.read/write` | ✔ | — | — | ✔ | — |
| `finance.read/write` | ✔ | — | — | ✔ | — |
| `rewards.read/write` | ✔ | — | — | — | — |
| `analytics.read` | ✔ | — | — | ✔ | — |
| `security.read/write` | ✔ | — | — | — | — |
| `self.read` | ✔ | ✔ | ✔ | ✔ | ✔ |

**Sicherer Migrationsweg, lokal belegt.** Die 94 vorhandenen Policies
rufen `private.is_admin()` und `private.is_dispatcher_or_admin()` auf —
gemessen 108-mal. Werden nur diese beiden Funktionskörper ersetzt,
übernehmen alle Policies das neue Modell. **Keine bestehende Migration
verändert, keine Policy gelöscht.** Der empfindliche Punkt ist benannt:
ein Befehl ändert 94 Policies gleichzeitig; der Rückweg steht im Entwurf.

**Lokaler Prüflauf gegen die echten Migrationen 001–011: 48 bestanden,
0 offen.** Darunter der Mehrfachfall, das inaktive Profil mit Rolle
`admin`, das Profil ohne Rolle und die unveränderte Wirkung auf die
vorhandenen Policies.

---

## 4. Alte und neue Navigation

| | heute | neu |
|---|---:|---:|
| Seiten / Bereiche | 61 | 11 |
| über die Navigation erreichbar | 12 | alle, je nach Rolle |
| Dispatcher sieht | 12 (unabhängig von der Rolle) | **5** |
| Abschnitte auf dem ersten Bildschirm | 11 | 3 |

Neue Bereiche: **Übersicht · Fahrten · Planung · Fahrer & Fahrzeuge ·
Meldungen** — und für weitere Fähigkeiten Kunden, Personal, Lohn,
Finanzen, Rewards, Analyse. Einstellungen hängt an `security.read` und
sitzt beim Benutzerkonto.

Am Handy höchstens fünf Einträge, der Rest unter „Mehr".

---

## 5. Entfernte Doppelungen im Konzept

| Umgang | Anzahl | Beispiel |
|---|---:|---|
| geht in einen neuen Bereich auf | 12 | Schichtplanung, Mitarbeiter, Fahrzeuge |
| wird zusammengelegt | ~20 | neun Qualitäts- und Vorfallseiten werden **eine** Liste mit Filter |
| bleibt bis zur echten Datenquelle leer | ~14 | Live-Dispo, Telefonzentrale, Termin-Cockpit |
| entfällt | ~15 | Doppelungen der Unternehmenssteuerung ohne eigene Datenquelle |

**Nichts wird gelöscht, bevor der neue Bereich funktionsgleich ist.**

---

## 6. Welche Module eine echte Datenquelle haben — und welche nicht

### Haben sie heute schon

| Bereich | Tabellen |
|---|---|
| Planung / Schichten | `shifts`, `plan_publications` |
| Mitarbeiter | `employees`, `profiles` |
| Fahrzeuge | `vehicles` |
| Dokumente und Fristen | `employee_documents`, `document_types`, `document_submissions` |
| Urlaub und Krankheit | `vacation_requests`, `sickness_reports`, `absences` |
| Rewards | `rewards_*` (sieben Tabellen) |

### Brauchen neue Tabellen

| Bereich | Lage |
|---|---|
| **Fahrten und Fahrtanfragen** | `rides` existiert, wird aber von keiner Portalseite benutzt; Anfragen fehlen ganz |
| **Kunden** | `customers` existiert, wird nicht benutzt |
| **Rechnungen und Zahlungen** | keine Tabelle |
| **Lohnabrechnungen** | keine Tabelle, kein Bucket |
| **Webseitenanalyse** | keine Tabelle, keine Ereigniserfassung |
| **Protokoll der Geschäftsaktionen** | keine Tabelle |

### Funktionieren heute nur lokal im Browser

Alle 48 in der Bestandsaufnahme aufgeführten Seiten — insbesondere
Live-Dispo, Telefonzentrale, Termin-Cockpit, Kunden, Rechnungen,
Zahlungen, Mahnwesen, Beschwerden, Unfälle, Schulungen sowie die
gesamte Unternehmenssteuerung.

### Bleiben in der ersten Umsetzung bewusst leer

PAJ GPS · Webseitenanalyse · Rechnungsversand · E-Mail-Benachrichtigungen
· Yumaks Box. Jeweils mit einem Kasten, der sagt, was fehlt.

---

## 7. Vorbereitete, aber nicht ausgeführte Migrationen

| Entwurf | Zweck | Stand |
|---|---|---|
| `supabase/entwuerfe/012_rollen_und_faehigkeiten.sql` | Rollen und Fähigkeiten | geschrieben, **lokal geprüft**, nicht produktiv eingespielt |

Der Entwurf liegt bewusst **außerhalb** von `supabase/migrations/`, damit
ihn kein Werkzeug versehentlich mitzieht. Er wird erst dorthin
verschoben, wenn er freigegeben ist.

Noch nicht entworfen (nach Ihrer Prioritätenfolge): Fahrten und
Fahrtanfragen, Kunden, Rechnungen und Zahlungen, Meldungen und
Protokoll, Analyse, Lohnabrechnungen.

---

## 8. Sicherheitsbefunde

| # | Befund | Einordnung |
|---|---|---|
| 1 | Rolle aus `localStorage` mit Rückfall auf „Chef" | **belegt.** Die geforderte Rollentrennung existiert heute nicht. **Kein nachgewiesener Datenabfluss** — die so erreichbaren Seiten zeigen Browserdaten; die sieben Seiten mit Serverzugriff bleiben unter RLS. |
| 2 | Erfundene Kundendaten mit Gesundheitsbezug im Auslieferungscode | **belegt.** `termin-cockpit.js`, Zeile 19 ff. |
| 3 | Geschätzte Kennzahlen, als gemessen dargestellt | **belegt.** `management-shared.js`, Zeile 346. |
| 4 | 48 Seiten halten Betriebsdaten ungesichert im Browser | **belegt.** Kein Schutz durch RLS möglich, kein Backup, kein gemeinsamer Stand. |
| 5 | Neue Policies können bestehende nicht einschränken | **belegt aus der Regel.** Permissive Policies verknüpfen mit ODER. Deshalb der Weg über die beiden Prüffunktionen. |
| 6 | Eintritt ins Portal | **geprüft und in Ordnung.** Supabase-Sitzung, Profil, `active`, Rolle in `admin`/`dispatcher`. |
| 7 | Zeilenrecht: Dispatcher sieht Kundendaten nur an einer Fahrt | **offen.** Nicht lösbar, solange es keine Fahrtentabelle gibt. |

Noch **nicht** geprüft: manipulierte IDs gegen die produktive Instanz,
Storage-Pfade ohne signierte Adresse, Rollenwechsel bei offener Seite,
Abmeldung während laufender Anfrage. Diese Prüfungen gehören zur
Umsetzung, nicht zur Probe.

---

## 9. Die Designprobe

**Links** (beide zeigen dasselbe; der zweite ist für das Handy im
selben WLAN):

- Am Rechner: `http://localhost:5300/`
- Im WLAN: `http://192.168.178.141:5300/`

Start mit `npm run probe-portal`.

### Was echt ist und was simuliert

| | |
|---|---|
| **Echt** | die Gestaltung, alle Bedienwege, die Rollenfilterung, alle Zustände, das Verhalten bei 320–1440 px, Tastaturbedienung und Fokus |
| **Simuliert** | sämtliche Daten. Keine Verbindung zu Supabase, kein `fetch`, kein Upload, kein Versand, keine PAJ-Anfrage. Im Prüflauf ist belegt: **null Anfragen nach außen.** |
| **Testdaten** | ausschließlich `Testkunde 01`, `Testfahrer 01`, `Testwagen 01`, `GER-TEST 001` — keine erfundenen Personennamen, keine Telefonnummern, keine Gesundheitsangaben |
| **Kennzeichnung** | Banner „Designprobe – keine echten Daten", dauerhaft, klebend, nicht wegklickbar |

Enthalten sind alle zehn geforderten Ansichten: Dispatcher-Übersicht,
Fahrtenliste, neue Fahrt, Planung, Fahrer/Fahrzeuge, Meldungen,
Personal, Lohnabrechnungen, Rewards, Analyse — dazu Kunden und Finanzen.

**Prüflauf `npm run probe-portal-pruefen`: 106 bestanden, 0 offen.**

---

## 10. Vorher/Nachher — gezählt, nicht geschätzt

`npm run …` beziehungsweise `node tools/miss-bedienwege.mjs` fährt
dieselbe Aufgabe in beiden Oberflächen.

### Aufgabe: eine Schicht planen und veröffentlichen

| Maß | heute | Probe | |
|---|---:|---:|---|
| Klicks und Auswahlen | 6 | 6 | gleich |
| Blätterweg in Pixeln | 140 | **0** | besser |
| Fenster, die sich öffnen | 2 | **1** | besser |

### Erster Bildschirm

| Maß | heute | Probe | |
|---|---:|---:|---|
| anklickbare Elemente insgesamt | 10 | 14 | **schlechter** |
| davon echte Hauptaktionen | 4 | **1** | besser |
| Abschnitte auf der Seite | 11 | **3** | besser |

### Aufgabe: zu den noch nicht zugewiesenen Fahrten

Probe: **1 Klick**, Ziel erreicht. Heute: **nicht möglich** — es gibt
keine Fahrtenliste im Betriebsportal.

### Was diese Zahlen ehrlich sagen

**Die Klickzahl ist nicht gesunken.** Sechs bleiben sechs. Der
Unterschied liegt woanders: kein Blättern, ein Fenster statt zwei, und
statt vier gleichrangiger Schaltflächen nur noch **eine** Hauptaktion.
Genau das war der Befund aus dem gescheiterten Bedienversuch — nicht die
Anzahl der Klicks, sondern die Frage, welcher davon der richtige ist.

**Die Probe hat mehr anklickbare Elemente auf dem ersten Bildschirm:
14 statt 10.** Das sind die Kennzahlen, die absichtlich zur gefilterten
Liste führen. Sie sind Wege, keine konkurrierenden Aktionen — aber es
bleibt ein Punkt, den Sie sich ansehen sollten.

**Der Vergleich ist gegen den bereits verbesserten Stand.** Der Altstand
ist der nach Schritt 029d. Gegen den Stand davor wäre der Unterschied
deutlich größer.

---

## 11. Was Sie entscheiden müssen

| # | Entscheidung | Warum sie ansteht |
|---|---|---|
| 1 | **Wer bekommt welche Rolle?** | Das Modell steht, die Zuordnung ist eine Personalentscheidung. |
| 2 | **Zweite Person mit `admin`?** | Heute gibt es keine Ausfallsicherung. Fällt der einzige Admin aus, kann niemand Rollen vergeben. |
| 3 | **Wann wird der Rollenentwurf eingespielt?** | Er ist lokal geprüft, aber ein Befehl ändert 94 Policies. Braucht Ihre ausdrückliche Freigabe und ein ruhiges Zeitfenster. |
| 4 | **Fahrten: welcher Umfang zuerst?** | Genügen Aufnahme, Zuweisung und Status — oder braucht es sofort Serienfahrten und Krankenfahrten? |
| 5 | **Fahrtanfragen von der Webseite** | Heute endet die Webseite bei Telefon und WhatsApp. Soll eine echte Online-Annahme gebaut werden? Das ist ein eigenes Vorhaben. |
| 6 | **Analyse: rechtliche Freigabe** | Ohne Ihre Freigabe bleibt der Bereich leer. Datenschutzerklärung ergänze ich nicht eigenmächtig. |
| 7 | **PAJ GPS** | Gibt es einen Vertrag mit dokumentierter API? Ohne den bleibt es ein Platzhalter. |
| 8 | **Die 48 Browserspeicher-Seiten** | Enthalten sie möglicherweise echte, von Hand eingegebene Daten? Falls ja, braucht es vor jeder Ablösung einen Export- und Prüfweg. **Das kann ich nicht von außen feststellen.** |
| 9 | **SMTP** | Ohne geprüften Versand bleiben Benachrichtigungen und Rechnungsversand aus. |

---

## 12. Empfohlene Umsetzungsreihenfolge

Begründet, nicht nach Bequemlichkeit sortiert.

| # | Schritt | Warum hier |
|---|---|---|
| 1 | **Rollen einspielen und prüfen** | Alles Weitere hängt daran. Ohne echte Trennung darf kein Lohnbereich entstehen. |
| 2 | **Portalgerüst, Navigation, Design-System** | Das Gerüst trägt jedes Modul. Danach ist jeder Bereich ein kleiner Schritt. |
| 3 | **Planung** | Hat bereits eine echte Datenquelle und ist täglich im Einsatz. Schnellster spürbarer Gewinn. |
| 4 | **Fahrer & Fahrzeuge** | Ebenfalls vorhanden, ergänzt die Planung unmittelbar. |
| 5 | **Fahrten und Fahrtanfragen** | Das größte Loch im Betrieb — und die größte Arbeit. Braucht neue Tabellen. |
| 6 | **Meldungen und Protokoll** | Sobald Fahrten echt sind, entstehen echte Meldungen. |
| 7 | **Personal** | Vorhandene Datenquelle, aber erst sinnvoll mit echter Rollentrennung. |
| 8 | **Lohnabrechnungen** | Besonders geschützt. Erst wenn Rollen und Personal stehen. |
| 9 | **Kunden** | Braucht neue Nutzung von `customers`. |
| 10 | **Rechnungen und Zahlungen** | Braucht Kunden und Fahrten davor. |
| 11 | **Rewards-Verwaltung** | Läuft heute; die Verwaltungsoberfläche ist nachrangig. |
| 12 | **Analyse** | Zuletzt, und nur nach rechtlicher Freigabe. |

Nach **jedem** Modul: Vergleich gegen den Altbestand, automatisierte
Prüfung, manueller Ablauf, Sicherheitsprüfung, lokaler Commit. Keine
große ungeprüfte Gesamtersetzung.

---

## 13. Prüfstand insgesamt

| Prüflauf | Ergebnis | Art |
|---|---|---|
| Rollenmodell (`16_rollen_run.ps1`) | 48 / 0 | **lokal gegen echte Policies** |
| Designprobe (`probe-portal-pruefen`) | 106 / 0 | mit Attrappe (die Probe hat keine Datenquelle) |
| Bestand: 10 vorhandene Prüfläufe | 1025 / 0 | statisch und mit Attrappe |
| **Summe** | **1179 / 0** | |

> **Unverändert streng getrennt:** Nichts davon ist auf der produktiven
> Instanz geprüft. Lokal bestandene Tests sagen nichts über die
> Produktivinstanz. Die Designprobe beweist über echte Daten gar nichts —
> sie zeigt Bedienung und Gestaltung.

---

## 14. Was ich bewusst nicht getan habe

- Keinen bestehenden Portalcode ersetzt oder gelöscht.
- Keine Migration eingespielt, weder lokal dauerhaft noch produktiv.
- Keine `localStorage`-Daten migriert, gelesen oder gelöscht.
- Keine Rolle an ein bestehendes Konto vergeben.
- Keine E-Mail, keine Nachricht, keinen Upload, keine PAJ-Anfrage.
- Die Datenschutzerklärung nicht ergänzt.
- Kein Push, kein Merge, kein Deployment.

---

## 15. Nachbesserung nach dem echten Bedienversuch: Fahrtaufnahme

Der Geschäftsführer hat den Ablauf „Neue Fahrt aufnehmen" vollständig
durchgespielt. Die daraus folgenden Änderungen betreffen **nur die
Designprobe** — es ist weiterhin kein produktiver Portalcode verändert.

### 15.1 Bestandskunde und neuer Kunde sind jetzt zwei Wege

| vorher | jetzt |
|---|---|
| Vier Kundenkarten, fest eingebaut | Suchfeld „Name, Telefonnummer oder Kundennummer" |
| Überschrift „Wer fährt?" | **„Für wen ist die Fahrt?"** |
| Kein Weg für einen neuen Kunden | Eigenes Stammdatenformular, Privatperson oder Firma |
| Adresse immer von Hand | Beim Bestandskunden **vorausgewählt, ein Klick genügt** |

**Bestandskunde.** Nach der Auswahl stehen Telefonnummer und
Standardadresse bereit. Der Schritt „Abholung" zeigt sie als
gespeicherte Adresse mit der Schaltfläche „Diese Adresse übernehmen" —
und daneben „Andere Abholadresse", mit Rückweg.

**Ziel-Vorschläge.** Aus den letzten Fahrten des Kunden: das zuletzt
verwendete Ziel mit Datum, häufige Ziele mit Anzahl, und die ganze
Strecke der letzten Fahrt in einem Klick. **Kein Behandlungsgrund in den
Vorschlägen** — ein Ziel heißt „Testklinik 01", nicht „Dialyse".

**Neuer Kunde.** Vorname und Nachname oder Firmenname, Telefonnummer,
Straße, Hausnummer, Postleitzahl, Ort — alle Pflicht, jedes mit einem
verständlichen Fehlertext. Nach dem Anlegen ist der Kunde für die Fahrt
ausgewählt und seine Adresse als Abholung übernommen. Dass in der echten
Umsetzung eine Dublettenprüfung über Telefonnummer und Adresse laufen
muss, steht im Formular.

**Der Bestand wird nie ganz gezeichnet.** Die Probe führt jetzt **2400
Testkunden**. Die Suche beginnt ab zwei Zeichen, zeigt höchstens acht
Treffer und sagt, wenn es mehr gibt. Auch die Kundenliste im Bereich
„Kunden" zeigt nur die ersten 25 von 2400.

### 15.2 Die Eingabetaste

| Ort | Verhalten |
|---|---|
| Suchfeld | wählt den **markierten** Treffer; Pfeiltasten bewegen die Markierung |
| einzeiliges Pflichtfeld | geht weiter — aber nur, wenn der Schritt gültig ist |
| ungültiges Feld | bleibt stehen und zeigt den Fehler im Klartext |
| mehrzeiliges Hinweisfeld | erzeugt einen Zeilenumbruch |
| letzter Schritt | tut **nichts** — „Fahrt speichern" muss geklickt werden |

Nach jedem Schritt springt der Fokus in das nächste sinnvolle Feld.

### 15.3 Leistung, Rollstuhl, Gepäck, Krankenfahrt

**Rollstuhl** ist kein Ja/Nein mehr, sondern drei verständliche Fälle:
kein Rollstuhl · faltbarer Rollstuhl, Fahrgast kann umgesetzt werden ·
Fahrgast bleibt im Rollstuhl, Rollstuhlfahrzeug erforderlich. Beim
dritten Fall kommen Begleitperson, weitere Fahrgäste und besonderer
Platzbedarf dazu, und es steht da, dass ein ungeeignetes Fahrzeug bei
der Zuweisung als Konflikt gemeldet und nicht stillschweigend vergeben
wird.

**Gepäck**: kein oder normales · viel · sperriges. Bei einer
Flughafenfahrt wird der Abschnitt hervorgehoben.

**Krankenfahrt und Serienfahrt** blenden einen eigenen, als geschützt
gekennzeichneten Abschnitt ein: Transportschein (vorhanden ·
nachgereicht · nicht vorhanden · ungeklärt), Zuzahlungsbefreiung
(befreit · nicht befreit · ungeklärt) und Kostenträger-Genehmigung
(vorhanden · nicht erforderlich · beantragt · fehlt · ungeklärt).

> **Es wird kein Behandlungsgrund und keine Diagnose erfasst.** Nur, was
> für Fahrt und Abrechnung gebraucht wird. Der Abschnitt erscheint nur
> für Rollen mit `operations.write` oder `finance.read`; andere sehen
> einen Hinweis, dass die Abrechnung die Angaben ergänzt. Diese Angaben
> erscheinen **weder in Meldungen noch in der Auswertung** — das ist in
> der Oberfläche auch so benannt.

### 15.4 Das Fenster verschwindet nicht mehr aus Versehen

- Ein Klick auf den dunklen Hintergrund schließt **nicht** — und löst
  auch keine Rückfrage aus.
- Geschlossen wird über „Abbrechen", das Schließen-Symbol oder Escape —
  alle drei mit derselben Sicherheitsprüfung.
- Sobald etwas eingegeben wurde: **„Fahrtaufnahme wirklich abbrechen?
  Ihre bisherigen Eingaben gehen verloren."** mit „Weiter bearbeiten"
  (hervorgehoben) und „Eingaben verwerfen".
- Die Abfrage steht **im selben Fenster**, nicht in einem zweiten
  darüber.
- Zurückgehen zwischen den Schritten verliert nichts.
- Ein versehentliches Neuladen bietet einen **klar gekennzeichneten
  lokalen Entwurf** an. Er liegt nur in diesem Browser, hängt an der
  Anmeldung und ist für eine andere Anmeldung nicht sichtbar. Nach dem
  Speichern wird er entfernt.

### 15.5 Was „Speichern" in der Probe tut

Die Fahrt erscheint in der Liste der ungeplanten Fahrten — **nur in
dieser Sitzung**, mit der Marke „nur Designprobe – nicht gespeichert".
Die Erfolgsmeldung sagt ausdrücklich, dass nichts zentral gespeichert
wurde und die Fahrt nach dem Neuladen wieder weg ist. Sie ist es auch:
der Prüflauf lädt neu und stellt fest, dass keine Probenfahrt übrig
bleibt.

### 15.6 Zusammenfassung

Vor dem Speichern stehen Kunde, Telefon, Kundennummer, Kundenhinweis,
Abholadresse, Ziel, Datum, Uhrzeit, Leistung, Rollstuhlanforderung,
Begleitung, weitere Fahrgäste, Platzbedarf, Gepäck, Transportschein,
Zuzahlung, Genehmigung, Hinweise und die Zuteilung.

Jeder Abschnitt hat **„Bearbeiten"** und springt direkt in den
betreffenden Schritt, ohne etwas anderes zu verlieren.

### 15.7 Drei eigene Fehler, vom Prüflauf gefunden

Alle drei standen im Code, den ich selbst geschrieben hatte:

1. **Der Entwurf wurde eine Stufe zu früh gesichert** — beim Fortsetzen
   landete man einen Schritt vor der Stelle, an der man aufgehört hatte.
2. **Beim Neuzeichnen ging der Fokus verloren.** Der Fensterinhalt wird
   ersetzt; ohne Zutun landet der Fokus beim Seitenkörper und die
   Fokusfalle wäre wirkungslos. Jetzt wird gemerkt, was den Fokus hatte,
   und dasselbe Element danach wieder angesprungen — samt
   Blätterstellung.
3. **Die Sicherheitsabfrage blieb nach dem Speichern hängen** und hätte
   das Erfolgsfenster blockiert.

Dazu eine **Lücke in der Bedienung**, die erst der Prüflauf zeigte: Nach
„Bearbeiten" musste man sich durch alle folgenden Schritte zurück zur
Zusammenfassung klicken. Es gibt jetzt **„Zurück zur Prüfung"**, das in
einem Zug zurückführt.

Und zwei Fehler in den Prüfungen selbst: ein Hinweistext, der nie zu
sehen war, weil er in einem unerreichbaren Zweig stand — und zwei
Prüfungen, die über ihre eigenen Kommentare stolperten (in
`probe-daten.js` steht ausdrücklich, dass ein Ziel **nicht** „Dialyse"
heißt).

### 15.8 Prüfstand

| Prüflauf | Ergebnis |
|---|---|
| `probe-fahrt-pruefen` (17 Blöcke, neu) | **155 bestanden, 0 offen** |
| `probe-portal-pruefen` | 104 bestanden, 0 offen |

Geprüft sind alle vom Auftraggeber genannten Fälle: neuer Kunde,
Bestandskunde mit und ohne Standardadresse, Ziel aus der letzten Fahrt,
Suche im Bestand von 2400, Gastfahrt, Eingabetaste in jedem Schritt und
bei ungültigem Feld, Eingabetaste im mehrzeiligen Feld, alle drei
Rollstuhlfälle, alle drei Gepäckfälle, alle vier
Transportschein-Zustände, alle drei Zuzahlungszustände, Zurückgehen ohne
Datenverlust, Klick daneben, Abbrechen und Escape mit Sicherheitsabfrage,
Speichern als reine Sitzungsfahrt, vollständige Zusammenfassung, 320 ·
390 · 430 · 1440 px, Tastatur mit sichtbarem Fokus und **null
Netzwerkaufrufe im gesamten Lauf**.

> **Einordnung unverändert:** Das ist eine Designprobe. Sie hat keine
> Datenquelle. Der Lauf sagt nichts über die produktive Instanz.
