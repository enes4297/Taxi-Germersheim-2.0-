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
gekennzeichneten Abschnitt ein:

| Überschrift | Auswahlmöglichkeiten |
|---|---|
| Transportschein | Vorhanden · Wird nachgereicht · Nicht vorhanden · Noch ungeklärt |
| Zuzahlungsbefreiung | Befreit · Nicht befreit · Noch ungeklärt |
| **Genehmigung der Krankenkasse** | Vorhanden · Beantragt · Nicht vorhanden · Nicht erforderlich · Noch ungeklärt |

Das Wort „Genehmigung" steht nur in der Überschrift und wiederholt sich
in keiner der Auswahlmöglichkeiten.

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
Zuzahlung, Genehmigung der Krankenkasse, Hinweise und die Zuteilung.
In der Zusammenfassung steht sie als „Genehmigung der Krankenkasse:
Vorhanden“ beziehungsweise mit dem gewählten Zustand.

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
| `probe-fahrt-pruefen` (17 Blöcke, neu) | **168 bestanden, 0 offen** |
| `probe-portal-pruefen` | 104 bestanden, 0 offen |

Geprüft sind alle vom Auftraggeber genannten Fälle: neuer Kunde,
Bestandskunde mit und ohne Standardadresse, Ziel aus der letzten Fahrt,
Suche im Bestand von 2400, Gastfahrt, Eingabetaste in jedem Schritt und
bei ungültigem Feld, Eingabetaste im mehrzeiligen Feld, alle drei
Rollstuhlfälle, alle drei Gepäckfälle, alle vier
Transportschein-Zustände, alle drei Zuzahlungszustände, alle fünf
Zustände der Genehmigung der Krankenkasse samt ihrer Reihenfolge, Zurückgehen ohne
Datenverlust, Klick daneben, Abbrechen und Escape mit Sicherheitsabfrage,
Speichern als reine Sitzungsfahrt, vollständige Zusammenfassung, 320 ·
390 · 430 · 1440 px, Tastatur mit sichtbarem Fokus und **null
Netzwerkaufrufe im gesamten Lauf**.

> **Einordnung unverändert:** Das ist eine Designprobe. Sie hat keine
> Datenquelle. Der Lauf sagt nichts über die produktive Instanz.

### 15.9 Manueller Durchlauf und letzte sprachliche Änderung

Der Geschäftsführer hat die überarbeitete Fahrtaufnahme am 29.09.2026
**manuell vollständig durchgespielt** und als richtig bestätigt.

> **Einordnung:** Das ist ein manueller Test **an der Designprobe**,
> nicht am produktiven System. Die Probe hat keine Datenquelle. Über das
> Verhalten gegen Supabase sagt dieser Durchlauf nichts.

Daraus folgte eine sprachliche Änderung: Die Überschrift heißt jetzt
**„Genehmigung der Krankenkasse"** statt „Kostenträger-Genehmigung",
und die Auswahlmöglichkeiten wiederholen das Wort „Genehmigung" nicht
mehr. Die Reihenfolge ist vorgegeben: Vorhanden · Beantragt · Nicht
vorhanden · Nicht erforderlich · Noch ungeklärt. In der Zusammenfassung
steht die Zeile als „Genehmigung der Krankenkasse: Vorhanden"
beziehungsweise mit dem gewählten Zustand.

Die Prüfung sichert seither zusätzlich ab, dass es **genau fünf**
Möglichkeiten in **dieser Reihenfolge** gibt, dass sich das Wort
„Genehmigung" in keiner von ihnen wiederholt, dass die alte Überschrift
verschwunden ist und dass die längere Beschriftung auch bei 320 Pixeln
nicht seitlich ausbricht.

---

## 16. Nachbesserung nach dem manuellen Test der Planung

Der Geschäftsführer hat die Planung der Designprobe am 30.09.2026
manuell getestet und drei Bedienprobleme gemeldet. Alle drei sind
behoben. **Nur die Designprobe — kein produktiver Portalcode verändert,
keine Migration ausgeführt.**

### 16.1 Der manuelle Befund

| # | Befund | Einordnung |
|---|---|---|
| 1 | Beim Tippen von `15:30` wurde die erste `1` sofort als Stunde übernommen, der Fokus sprang zur Minute. Eine normale Eingabe war kaum möglich. | echter Mangel |
| 2 | Im Konfliktfilter schien sich beim Ändern einer Zeile eine andere mitzuverändern; nach weiteren Klicks verschwanden alle Zeilen, und es stand dort „Für diesen Zeitraum ist nichts eingetragen. Das ist kein Fehler." | echter Mangel |
| 3 | Beim Veröffentlichen hieß es sinngemäß, der Plan lasse sich veröffentlichen und die Konflikte blieben sichtbar — zu leicht und zu wenig verständlich. | echter Mangel |

### 16.2 Zeiteingabe — Ursache und Behebung

`<input type="time">` hat innen zwei Abschnitte. Der Browser übernimmt
die erste Ziffer sofort als Stunde und springt weiter. Das ist kein
Fehler der Probe, sondern das Verhalten des eingebauten Feldes — und für
die Zentrale unbrauchbar.

Ersetzt durch ein eigenes Modul,
[probe-zeitfeld.js](probe-betriebsportal/probe-zeitfeld.js):

- gewöhnliches Textfeld, `inputmode="numeric"`, Platzhalter `HH:MM`
- von links nach rechts tippbar, **nichts springt**
- `1530` wird beim Verlassen zu `15:30`, `930` zu `09:30`
- gültig ist `00:00` bis `23:59`; Stunde und Minute werden getrennt
  begründet abgelehnt
- Unvollständiges wird **nicht** übernommen; der Fehler steht direkt am
  Feld
- Beginn und Ende sind getrennte Felder
- Nachtschicht über Mitternacht ist erlaubt und wird als solche benannt
- die Eingabetaste übernimmt nur vollständig Gültiges
- Escape verwirft die laufende Eingabe und stellt den zuletzt
  übernommenen Wert wieder her
- beim Hineinspringen ist der Wert markiert und in einem Zug
  überschreibbar
- übernommen wird beim Verlassen, **nie während des Tippens** — sonst
  würde die Zeile bei jedem Zeichen neu gezeichnet und der Fokus spränge
  heraus

Dasselbe Feld benutzt jetzt auch der Fahrtassistent.

### 16.3 Zeilenverhalten — die eigentliche Ursache

Der Befund „eine andere Zeile schien sich mitzuverändern" hatte eine
strukturelle Ursache: **Planzeilen wurden über ihre Stelle im Array
angesprochen**, nicht über die Person. Im Markup stand `data-zeile="3"`.
Wer gefiltert oder eine andere Reihenfolge erzeugt hätte, hätte mit
derselben Nummer eine andere Person getroffen. Auch „Plan von gestern
übernehmen" kopierte stellenweise statt nach Person.

Behoben: Jede Zeile und jedes Bedienelement trägt die
**Mitarbeiterkennung**. Es gibt im gesamten Planungscode keine
Adressierung über Zeilennummern mehr — der Prüflauf stellt das
ausdrücklich fest. Auch die Konflikte werden nach Kennung geführt, und
„Plan von gestern übernehmen" ordnet über die Kennung zu.

**Der Leerzustand war zusätzlich falsch beschriftet.** Er benutzte den
allgemeinen Satz für einen leeren Datenbestand. Jetzt hat jeder Filter
seinen eigenen, ehrlichen Zustand:

| Lage | Text |
|---|---|
| Konfliktfilter, alles gelöst | **„Alle Konflikte gelöst."** — dazu die Erklärung, dass die Zeilen nicht verschwunden sind, sowie „Alle Mitarbeiter anzeigen" und „Letzte Änderung rückgängig" |
| Filter „nur ungeplant", nichts offen | „Alles eingeplant." |
| Suche ohne Treffer | „Kein Treffer" mit „Suche zurücksetzen" |
| wirklich keine Mitarbeiter | „Keine Mitarbeiter" |

Der Satz „Für diesen Zeitraum ist nichts eingetragen" erscheint im
Konfliktfilter nicht mehr. Gefiltert wird ausschließlich die **Anzeige**
— ein Filterwechsel kann keine Eingabe löschen. Neu ist außerdem
**„Letzte Änderung rückgängig"**.

### 16.4 Veröffentlichung mit Konfliktprüfung

**Der erste Klick veröffentlicht nichts mehr.** Er öffnet die
Konfliktprüfung mit Tag, vollständigem Datum, Anzahl eingeplanter
Mitarbeiter, Anzahl ohne Fahrzeug, Anzahl der Konflikte — und einer
Liste, die jeden Punkt im Klartext erklärt:

> „Testfahrer 01 und Testfahrer 05 verwenden gleichzeitig GER-TEST 001."
> „Testfahrer 03 ist im Dienst, aber es wurde kein Fahrzeug zugewiesen."
> „Testfahrer 02: Die individuelle Uhrzeit ist unvollständig."

Zwei Arten werden unterschieden:

**Technisch ungültig — Veröffentlichung nicht möglich.** Unvollständige
oder ungültige Uhrzeit, unbekannter Mitarbeiterdatensatz, ungültige
Fahrzeugkennung. Es gibt genau **eine** Schaltfläche: „Zur Planung
zurück". Kein Ausweg.

**Betrieblicher Konflikt — bewusste Entscheidung möglich.** Fahrzeug
doppelt zur selben Zeit, Mitarbeiter ohne Fahrzeug, Fahrzeug nicht
verfügbar. Primär und hervorgehoben: „Zurück und korrigieren". Sekundär
und deutlich zurückhaltender: „Trotzdem veröffentlichen".

Wer trotzdem will, bekommt eine **zweite** Bestätigung: Tag, Datum und
Konfliktanzahl erneut, dazu ein **Pflichtfeld „Grund für die
Veröffentlichung"**. Ohne Grund wird nicht veröffentlicht. Der
endgültige Knopf heißt „Trotz Konflikten veröffentlichen".

Danach zeigt die Probe, **was protokolliert würde**: wer, wann, welcher
Tag, wie viele Konflikte, welcher Grund. In der Designprobe wird nichts
gespeichert — das steht auch so da. Ebenso, dass Mitarbeiter später
ausschließlich ihre eigene Schicht sehen, keine Konfliktliste und keine
Daten anderer.

Die Überschneidung wird jetzt über **Zeiträume** erkannt, nicht mehr nur
über gleiche Anfangszeiten; Schichten über Mitternacht werden dafür in
zwei Abschnitte zerlegt.

### 16.5 Ein vierter Mangel, vom Prüflauf gefunden

Bei **320 × 568** war der Konfliktfilter mit der Maus nicht erreichbar:
Die klebende Aktionsleiste stapelte vier Schaltflächen übereinander und
nahm mit dem Banner fast den halben Bildschirm ein — sie lag über den
Filtern. Das hätte auf einem kleinen Telefon genauso zugeschlagen.

Behoben: In der klebenden Leiste stehen nur noch der Stand und die
Hauptaktion. „Letzte Änderung rückgängig", „Änderungen verwerfen" und
„Entwurf speichern" stehen im Fluss darüber.

### 16.6 Zwei Fehler in meinen eigenen Prüfungen

- Ein Testaufbau löste einen Konflikt und erwartete den Leerzustand —
  dabei blieben zwei weitere Konflikte offen, die der Tagesplan von
  Anfang an mitbringt. Der Leerzustand war also zu Recht nicht da.
- Eine Prüfung suchte „Alle Mitarbeiter anzeigen" ohne Einschränkung und
  traf den Filterknopf in der Werkzeugleiste statt den Knopf im
  Leerzustand. Sie bestand, ohne etwas zu belegen.

Außerdem: `page.fill` feuert nur `input`, kein `change`. Das Zeitfeld
übernimmt bewusst erst beim Verlassen — der Prüflauf muss das Feld also
verlassen, so wie ein Mensch weiterklickt. Angepasst wurde die Prüfung,
nicht die Anwendung.

### 16.7 Prüfstand

| Prüflauf | Ergebnis |
|---|---|
| `probe-planung-pruefen` (13 Blöcke, neu) | **105 bestanden, 0 offen** |
| `probe-fahrt-pruefen` | 168 bestanden, 0 offen |
| `probe-portal-pruefen` | 106 bestanden, 0 offen |

Geprüft sind alle vom Auftraggeber genannten Fälle: `15:30`, `1530`,
unvollständige Zeit, ungültige Minuten, Nachtschicht, Einfügen eines
kopierten Wertes, zwei unabhängige Mitarbeiterzeilen, Konflikt entsteht,
Konflikt wird gelöst, richtiger Leerzustand, Filterwechsel ohne
Datenverlust, Rückgängig, technische Sperre, betrieblicher Konflikt,
zurück zur Korrektur, bewusste Veröffentlichung mit Pflichtgrund,
Abbruch der zweiten Bestätigung, keine Veröffentlichung beim ersten
Klick, keine Konfliktdaten in der Mitarbeiteransicht, 320 · 390 · 430 ·
1440 px, Tastatur und sichtbarer Fokus, **null Netzwerkaufrufe**.

> **Einordnung unverändert:** Designprobe ohne Datenquelle. Der Lauf
> sagt nichts über die produktive Instanz.

---

## 17. Abwesenheiten wirken auf die Planung

Vor „Fahrer & Fahrzeuge" eingeschoben: Krankheit und genehmigter Urlaub
bestimmen jetzt den Tagesstatus. **Nur die Designprobe — kein
produktiver Portalcode verändert, keine Migration ausgeführt.**

### 17.1 Vier Zustände statt zwei

Aus „Im Dienst / Frei" sind vier echte Planungszustände geworden:
**Im Dienst · Frei · Krank · Urlaub**. Sie sind keine Optik — sie
schlagen auf Filter, Kennzahlen, Konflikterkennung und Veröffentlichung
durch.

| Datensatz | Wirkung auf die Planung |
|---|---|
| Krankmeldung | Status **Krank**, roter Hinweis „Fahrer ist an diesem Tag krank" mit Zeitraum |
| Urlaub, **genehmigt** | Status **Urlaub**, Hinweis „Fahrer hat an diesem Tag genehmigten Urlaub" mit Zeitraum |
| Urlaub, **beantragt** | nur Hinweis „Urlaub beantragt – noch nicht genehmigt", der Fahrer **bleibt planbar**, keine Sperre |
| Urlaub, **abgelehnt** oder **storniert** | **keine** Wirkung, wird nicht angezeigt |

**Krankheit hat Vorrang vor Urlaub.** Liegt für denselben Tag beides
wirksam vor, gilt Krank — und der Widerspruch wird zusätzlich als
**technischer Datenkonflikt** gemeldet, der die Veröffentlichung
vollständig sperrt.

Zugeordnet wird ausschließlich über **Mitarbeiterkennung und Datum**.
Keine Array-Stellen, keine angezeigten Namen. Ein Wechsel zwischen heute
und morgen rechnet die Abwesenheiten neu.

### 17.2 Die Ausnahme — möglich, aber nicht nebenbei

Wer einen Kranken oder Urlauber auf „Im Dienst" setzt, bekommt **keine
stille Übernahme**. Es öffnet sich eine Nachfrage, die die Lage benennt
(„Fahrer ist krank" beziehungsweise „Fahrer hat genehmigten Urlaub") und
zwei Wege anbietet:

- **„Status beibehalten"** — hervorgehoben, die sichere Wahl
- **„Trotz Abwesenheit einplanen"** — zurückhaltend; erst dann erscheint
  das **Pflichtfeld für den Grund**

Ohne Grund entsteht keine Ausnahme. Mit Grund wird die Zeile sichtbar
markiert: „Ausnahme: trotz Abwesenheit eingeplant" samt Grund — und der
rote Abwesenheitshinweis **bleibt daneben stehen**. Die Ausnahme lässt
sich mit einem Klick wieder aufheben.

**Der Abwesenheitsdatensatz wird dabei nie verändert.** Kein Klick auf
„Im Dienst" löscht eine Krankmeldung oder einen Urlaub. Es entsteht
ausschließlich eine begründete Ausnahme für **diesen einen Tag** in der
Planzeile. Der Prüflauf stellt nach jeder Ausnahme ausdrücklich fest,
dass der Datensatz unverändert vorhanden ist.

### 17.3 Konflikte

| Fall | Art |
|---|---|
| krank **und** genehmigter Urlaub am selben Tag | **technisch** — sperrt vollständig |
| krank/Urlaub **und** begründete Ausnahme im Dienst | betrieblich, als „begründete Ausnahme" gekennzeichnet |
| abwesend, aber eine Schicht steht noch im Plan | betrieblich — „Diese Schicht ist nicht aktiv — bitte auf ‚Krank' setzen oder eine Ausnahme begründen." |
| Abwesenheit deckt nur einen Teil der Schicht | betrieblich — bei Nachtschichten über Mitternacht |
| Abwesenheit **ohne** eingeplante Schicht | **kein** Konflikt |

Die Konfliktliste nennt Fahrer, Datum, Art der Abwesenheit, Zeitraum und
die geplante Schicht mit Kennzeichen.

### 17.4 Filter

Sieben Ansichten als umbrechende Schaltflächen mit Zähler: **Alle · Im
Dienst · Frei · Krank · Urlaub · Nur ungeplant · Nur Konflikte**. Jede
hat ihren eigenen ehrlichen Leerzustand; der allgemeine Satz „Für diesen
Zeitraum ist nichts eingetragen" erscheint in keinem davon.

### 17.5 Was der Mitarbeiter später sieht

Das Erfolgsfenster zeigt eine **Mitarbeitervorschau**. Dort steht bei
einer Ausnahme genau ein Satz:

> „Trotz eingetragener Abwesenheit eingeplant – bitte mit der Zentrale
> klären."

**Nicht** dort: der interne Grund, die Art der Abwesenheit, irgendeine
Angabe zur Krankheit. Der Prüflauf liest gezielt diesen Abschnitt aus und
stellt fest, dass weder der Grund noch das Wort „krank" darin vorkommt.
Kommentarlos „Krank" neben einer normalen Schicht kann im Portal nicht
entstehen.

Im Protokollteil — getrennt davon, für die Zentrale — stehen dagegen
alle Angaben: wer, wann, welcher Fahrer, welche Abwesenheit, welcher
Zeitraum, welche Schicht und welcher Grund. **In der Designprobe wird
nichts gespeichert**, das steht auch so da.

### 17.6 Ein Zeitzonenfehler, vom Prüflauf gefunden

Die Prüfung der teilweisen Überschneidung schlug fehl, und die Ursache
lag tiefer: `alsIso()` bildete das Datum über `toISOString()`, also nach
UTC. In Mitteleuropa ist örtlich Mitternacht bereits der Vortag in UTC —
ein aus `2026-09-30T00:00:00` gebautes Datum ergab `2026-09-29`. Beim
Rechnen mit dem Folgetag hat das einen Konflikt verschluckt.

Behoben: Das Datum wird jetzt aus den örtlichen Feldern gebildet. Der
Fehler wäre im Betrieb nur nachts aufgefallen — also genau dann, wenn
Nachtschichten geplant werden.

### 17.7 Prüfstand

| Prüflauf | Ergebnis |
|---|---|
| `probe-planung-pruefen` (20 Blöcke) | **163 bestanden, 0 offen** |
| `probe-fahrt-pruefen` | 168 bestanden, 0 offen |
| `probe-portal-pruefen` | 107 bestanden, 0 offen |

Neu geprüft: Krankheit setzt den Tagesstatus, genehmigter Urlaub setzt
ihn, beantragter Urlaub bleibt planbar, abgelehnter und stornierter
Urlaub wirken nicht, ein Klick auf „Im Dienst" löscht keine Abwesenheit,
die Ausnahme verlangt einen Pflichtgrund, krank plus Urlaub wird als
Datenkonflikt erkannt und sperrt, die teilweise Überschneidung bei
Nachtschicht wird erkannt, der Konfliktfilter zeigt die Betroffenen, die
Veröffentlichung nennt den Konflikt verständlich, die Ausnahme erscheint
in der Protokollvorschau, Kennungen bleiben stabil, der Wechsel von heute
auf morgen rechnet neu — und **null Netzwerkaufrufe**.

> **Einordnung unverändert:** Designprobe ohne Datenquelle. Der Lauf
> sagt nichts über die produktive Instanz.

### 17.8 Manuelle Freigabe der Planungsprobe

Am 30.09.2026 hat der Geschäftsführer die Planung vollständig manuell
durchgespielt und freigegeben. Bestätigt wurden: die Zeiteingabe,
Konflikte und Filter, der Erhalt aller Änderungen, die verständliche
Warnung beim Veröffentlichen und der Pflichtgrund bei „Trotzdem
veröffentlichen".

> **Einordnung — ausdrücklich:** Das ist eine **manuelle Prüfung der
> Designprobe**. Die Probe hat keine Datenquelle, keine
> Supabase-Verbindung und keine echten Daten. Dieser Durchlauf sagt
> **nichts** darüber aus, wie sich das produktive Betriebsportal
> verhält. Er belegt, dass der entworfene Bedienweg verstanden und als
> richtig empfunden wurde — nicht mehr und nicht weniger.

---

## 18. Fahrer & Fahrzeuge

Nach der Freigabe der Planung gebaut. **Nur die Designprobe — kein
produktiver Portalcode verändert, keine Migration ausgeführt, keine
Supabase-Daten berührt.**

### 18.1 Eine Wahrheit, zwei Ansichten

Der Bereich arbeitet auf **demselben Tagesentwurf wie die Planung**. Er
hat denselben Umschalter Heute/Morgen, und eine Zuweisung hier steht
dort sofort genauso — der Prüflauf weist das nach, indem er nach einer
Zuweisung in die Planung wechselt und denselben Konflikt vorfindet.

Deshalb bekommt das Modul [probe-team.js](probe-betriebsportal/probe-team.js)
die Planungshelfer gereicht, statt eigene zu bauen. Zwei getrennte
Rechnungen über denselben Tag wären genau die Sorte Fehler, die im
Bestand zu 48 Seiten mit eigenem Browserspeicher geführt hat.

### 18.2 Fahrer

Karten statt Tabelle, weil eine Karte mehr Platz für Klartext hat.
Jede zeigt Initialen, Name, Beschäftigung, Tagesstatus, Schichtzeit,
Fahrzeug, Telefonnummer (nur für berechtigte Rollen), eine
Dokumentwarnung und als Vorschau des späteren Prüfprotokolls die letzte
Änderung mit Person und Uhrzeit.

Filter: **Alle · Im Dienst · Frei · Urlaub · Krank · Dokument fehlt**,
jeweils mit Zähler. Dazu eine Namenssuche, die beim Tippen filtert.

Ein Klick öffnet die Fahrerakte mit: heutiger und morgiger Schicht,
aktuellem Fahrzeug, Kontakt und Beschäftigung, Fahrerdokumenten mit
Gültigkeit, Urlaub und Krankheit (nur Art und Zeitraum — **kein
Krankheitsgrund, keine ärztliche Angabe**) sowie dem Lohnbereich.

### 18.3 Fahrzeuge

Der angezeigte Zustand wird **abgeleitet**, nicht doppelt gespeichert:
Grundzustand (frei / Werkstatt / gesperrt) zuerst, darüber Zuweisung und
laufende Fahrt. So können Karte und Plan nicht auseinanderlaufen.

| Zustand | Herkunft |
|---|---|
| Frei | einsatzbereit, niemand fährt es an diesem Tag |
| Zugewiesen | ein Fahrer im Dienst hat es im Tagesplan |
| Unterwegs | zusätzlich läuft eine Fahrt darauf |
| Werkstatt / Gesperrt | gepflegter Grundzustand, schlägt alles andere |

Jede Karte zeigt Name, Kennzeichen, Art, Sitzplätze,
Rollstuhleignung, aktuellen Fahrer, heutigen Einsatz, Kilometerstand
sowie TÜV, Versicherung und nächsten Service mit Warnung bei
abgelaufenem oder bald ablaufendem Termin.

**Sicherheitskritische Zustände stehen als Text da, nicht nur als
Farbe.** Bei einem gesperrten Fahrzeug steht der Sperrgrund im Klartext
auf der Karte.

### 18.4 Zuweisung

Zwei Wege, beide über dieselbe einfache Auswahl: vom Fahrzeug aus
(„Fahrer zuweisen") und aus der Fahrerakte („Fahrzeug zuweisen").

- Angeboten werden **nur einsatzbereite** Fahrzeuge. Werkstatt und
  Sperre stehen in einem eigenen Abschnitt darunter — sichtbar, mit
  Grund, aber nicht wählbar.
- Ein bereits belegtes Fahrzeug ist gekennzeichnet („belegt durch …").
- Vor dem Übernehmen kommt eine Zusammenfassung mit vorher und nachher.
- Bei Doppelbelegung wird vorher gesagt, dass ein Konflikt entsteht;
  „Trotzdem zuweisen" ist zurückhaltend gestaltet und führt über den
  bereits freigegebenen Konfliktweg.
- Danach gibt es **Rückgängig**.

Wird ein Fahrzeug trotzdem angesteuert, das gesperrt ist, erklärt die
Oberfläche warum und was zu tun ist — sie lehnt nicht wortlos ab.

### 18.5 Fahrzeugzustand ändern

„Werkstatt" und „Sperren" verlangen einen **Pflichtgrund**. Ist das
Fahrzeug an diesem Tag zugewiesen, wird vorher gewarnt und die Zuweisung
beim Übernehmen gelöst — sonst stünde ein nicht einsatzbereites Fahrzeug
im Tagesplan.

### 18.6 Lohnabrechnungen

Sichtbar nur mit `payroll.read`, bereitstellen nur mit `payroll.write` —
also Administration und Personal. **Die Disposition sieht die Überschrift
und darunter „Keine Berechtigung", sonst nichts**; kein einziger
Dateiname, kein Weg zum Hochladen. Bankdaten und Gehalt sind ihr
ausdrücklich verschlossen.

Der Ablauf: Mitarbeiter steht fest, Monat und Jahr wählen, Datei wählen,
eindeutige Bezeichnung wird gebildet. **Eine vorhandene Abrechnung wird
nicht still überschrieben** — es entsteht eine neue Version, und dafür
ist ein Grund Pflicht. Sichtbar bleibt, wer sie wann bereitgestellt hat.

In der Probe wird nichts hochgeladen. Der Mitarbeiter bekäme später nur
einen Hinweis, dass eine Abrechnung bereitliegt — nie die Datei als
E-Mail- oder Nachrichtenanhang.

### 18.7 Rollen

Ausschließlich über das entworfene Fähigkeitenmodell — keine Rolle aus
`localStorage`, kein Rückfall.

| | Fahrer | Fahrzeuge | Zuweisen | Zustand ändern | Lohn |
|---|:-:|:-:|:-:|:-:|:-:|
| Administration | ✔ | ✔ | ✔ | ✔ | ✔ |
| Disposition | ✔ | ✔ | ✔ | — | — |
| Personal | ✔ | — | — | — | ✔ |
| Buchhaltung | — | — | — | — | — |

Personal sieht die Fahrer, aber keine Fahrzeugkarten — und bekommt das
gesagt statt nur nichts zu sehen. Buchhaltung kommt in den Bereich gar
nicht hinein.

### 18.8 Protokollvorschau

Jede wichtige Änderung endet mit einem Fenster „Was protokolliert
würde": wer, wann, was betroffen ist, vorher, nachher und gegebenenfalls
der Grund. Ausdrücklich **nicht** darin: Passwörter, Zugangsschlüssel,
ärztliche Inhalte, Lohnbeträge. Der Prüflauf stellt fest, dass im
Lohnprotokoll kein Betrag vorkommt.

### 18.9 Vier eigene Fehler, vom Prüflauf gefunden

1. **Die Suche filterte erst beim Verlassen des Feldes.** Ursache: Sie
   hing am `change`-Ereignis. Live zu filtern hieß bisher, den Fokus zu
   verlieren, weil der Bereich neu gezeichnet wird. Behoben an der
   Wurzel: `zeichnen()` merkt sich jetzt, welches Feld den Fokus hatte
   **und wo der Schreibzeiger stand**, und stellt beides wieder her. Das
   hilft auch der Suche in der Planung.
2. **Vom Fahrer aus gab es keinen Weg zur Zuweisung** — nur vom Fahrzeug
   aus. Aufgefallen ist es, weil meine Prüfung den Weg über einen
   internen Aufruf nahm statt über die Oberfläche. Das war ein Notbehelf,
   der genau diese Lücke verdeckt hätte. Jetzt gibt es den Knopf in der
   Fahrerakte, und die Prüfung benutzt ihn.
3. **Das Zuweisungsfenster vom Fahrer aus zeigte keinen Fehlertext.**
   Ein abgelehntes gesperrtes Fahrzeug hätte dort keinen Grund genannt.
4. **Die Initialen ergaben „T0"** statt „T01", weil der zweite Namensteil
   aus Ziffern besteht.
5. **Der PAJ-GPS-Platzhalter war verschwunden.** Er stand im alten
   Bereich, den ich ersetzt habe — beim Neubau ist er untergegangen. Das
   ist eine echte Regression: Die Probe hätte den offenen
   Integrationsstand nicht mehr benannt. Der Gegenlauf
   `probe-portal-pruefen` hat sie gefunden, nicht der neue Lauf. Genau
   dafür gibt es Gegenläufe.

### 18.10 Zwei Fehlalarme in den Prüfungen — getrennt benannt

- Ich hatte erwartet, dass F01 „zugewiesen" ist. Gemessen ist es
  **unterwegs**, weil eine Fahrt darauf läuft — und F02 gilt als
  **frei**, weil sein eingetragener Fahrer krank ist. Beides ist richtig
  so; falsch war meine Erwartung.
- Die Suche nach Gesundheitsangaben schlug an, weil die Oberfläche den
  Satz „kein Krankheitsgrund und keine ärztliche Angabe" enthält. Die
  Prüfung sucht jetzt nach Behandlungsarten und nach einem Datenfeld,
  das so etwas aufnehmen würde — und verlangt zusätzlich, dass dieser
  Satz dasteht.

Dazu ein bekannter Fallstrick, der wieder zuschlug: `[data-dialog-zu]`
trifft zuerst den Hintergrund, der vom Fenster verdeckt wird. Gemeint
war die Schaltfläche.

### 18.11 Prüfstand

| Prüflauf | Ergebnis |
|---|---|
| `probe-team-pruefen` (13 Blöcke, neu) | **144 bestanden, 0 offen** |
| `probe-planung-pruefen` | 163 bestanden, 0 offen |
| `probe-fahrt-pruefen` | 168 bestanden, 0 offen |
| `probe-portal-pruefen` | 107 bestanden, 0 offen |

Geprüft: Rollen und gesperrte Bereiche, Suche und Filter, Fahrer- und
Fahrzeugzustände, Zuweisen und Lösen, gesperrtes Fahrzeug,
Werkstattfahrzeug, Rollstuhlkennzeichnung, Doppelzuweisung, Rückgängig,
offene Eingaben beim Schließen, der Lohnbereich für Administration und
Personal, keine Lohndaten für die Disposition, stabile Kennungen statt
Array-Positionen, der Zustandsabgleich mit der Planung, 320 · 390 · 430 ·
1440 px, Tastatur und sichtbarer Fokus — und **null Netzwerkaufrufe**.

> **Einordnung unverändert:** Designprobe ohne Datenquelle. Der Lauf
> sagt nichts über die produktive Instanz.

---

## 19. Letzte Prüfung vor dem Speichern

Nach der manuellen Freigabe von „Fahrer & Fahrzeuge" drei
Bedienkorrekturen. **Nur die Designprobe — kein produktiver
Portalcode verändert, keine Migration ausgeführt.**

### 19.1 Der manuelle Befund

Der Geschäftsführer hat „Fahrer & Fahrzeuge" vollständig geprüft und
zwölf Punkte als bestanden bestätigt — darunter, dass die Disposition
keine Lohndaten sieht, die Zuweisung sofort in der Planung erscheint,
gesperrte Fahrzeuge begründet und nicht wählbar sind und Version 2 einer
Abrechnung einen Pflichtgrund verlangt.

> **Einordnung:** Auch das ist eine **manuelle Prüfung der
> Designprobe**, nicht des produktiven Portals.

### 19.2 Zwei Stufen statt einer

Bei jeder begründungspflichtigen Änderung schließt der erste Klick
nichts mehr ab:

```
Eingaben  →  „Änderung prüfen"  →  Zusammenfassung mit Begründung
                                   ├─ „Zurück und ändern"   (hervorgehoben)
                                   └─ „Verbindlich speichern"
```

„Zurück und ändern" führt mit **vollständig erhaltenen Eingaben** ins
Formular. Erst „Verbindlich speichern" schließt ab und erzeugt die
Protokollvorschau.

Angewendet auf: **Werkstattstatus · Fahrzeugsperre · Einplanung trotz
Abwesenheit · Veröffentlichung trotz Konflikt · neue Version einer
Lohnabrechnung.**

### 19.3 Ein Protokolleintrag bleibt, wie er ist

Das ist nicht nur eine Absprache. `protokollieren()` friert jeden
Eintrag mit `Object.freeze` ein, und die beiden Anfangseinträge sind es
ebenfalls. Ein nachträglicher Schreibversuch läuft ins Leere — der
Prüflauf **versucht es ausdrücklich** und stellt fest, dass Grund und
Zustand unverändert bleiben.

Eine spätere Korrektur ist damit zwangsläufig ein **neuer Vorgang** mit
eigenem Grund und eigenem Eintrag. Auch das ist geprüft: Nach einer
Korrektur steht der erste Eintrag unverändert daneben.

### 19.4 Lohnvorschau vollständig

Vor dem verbindlichen Bereitstellen **und** in der Protokollvorschau
stehen: Mitarbeiter, Abrechnungsmonat, Abrechnungsjahr, Dateiname, neue
Versionsnummer, vorherige Versionsnummer, der Satz **„Die vorhandene
Version bleibt erhalten."**, bereitgestellt von, Datum und Uhrzeit sowie
der Pflichtgrund.

**Keine Beträge, keine Inhalte der Datei** — weder in der Vorschau noch
im allgemeinen Prüfprotokoll. Der Prüflauf sucht gezielt nach `€` und
`EUR` und findet nichts.

Die vorhandene Abrechnung bleibt in der Liste stehen; die neue kommt als
eigene Version dazu. Auch das ist gemessen: Nach dem Vorgang liegen
Version 1 **und** Version 2 vor.

### 19.5 Disposition vereinfacht

Der Bereich „Lohnabrechnungen" fehlt in der Fahrerakte für die
Disposition jetzt **vollständig** — nicht einmal als gesperrte
Überschrift. Das hält die Akte einfach.

**Die Sperre hängt trotzdem an der Fähigkeit, nicht an der
Sichtbarkeit.** `lohnAbschnitt()` wird ohne `payroll.read` nie
aufgerufen; `team-lohn-neu` und `team-lohn-fertig` prüfen
`payroll.write` jeweils noch einmal eigens. Der Prüflauf ruft beides als
Disposition **direkt** auf und stellt fest, dass nichts geöffnet und
nichts bereitgestellt wird.

Administration und Personal behalten ihren Zugriff unverändert — auch
das ist eigens geprüft.

### 19.6 Drei angepasste Prüfblöcke — keine Fehler, sondern Folgen

| Block | Warum er anschlug |
|---|---|
| 8 (Fahrzeugzustand) | fuhr den alten einstufigen Ablauf |
| 10 (Lohnabrechnung) | ebenso, dazu zwei geänderte Texte |
| 9 (Rollen) | erwartete die entfernte gesperrte Überschrift |

Alle drei sind Folgen **gewollter** Verhaltensänderungen. Sie haben
sofort angeschlagen, statt stillschweigend weiterzulaufen — genau dafür
sind sie da. Dasselbe in der Planungsprüfung an sieben Stellen.

Beim Umstellen habe ich nicht nur den Klick verschoben, sondern die neue
Stufe belegt: dass „Letzte Prüfung" erscheint, die Begründung darin
steht, der Weg zurück da ist und **nach dem ersten Klick nachweislich
noch nichts gesetzt ist**.

### 19.7 Prüfstand

| Prüflauf | vorher | jetzt |
|---|---:|---:|
| `probe-team-pruefen` | 144 | **197 / 0** |
| `probe-planung-pruefen` | 163 | **171 / 0** |
| `probe-fahrt-pruefen` | 168 | **168 / 0** |
| `probe-portal-pruefen` | 107 | **107 / 0** |

Alle vollständig beendet, null Netzwerkaufrufe.

> **Einordnung unverändert:** Designprobe ohne Datenquelle. Der Lauf
> sagt nichts über die produktive Instanz.
