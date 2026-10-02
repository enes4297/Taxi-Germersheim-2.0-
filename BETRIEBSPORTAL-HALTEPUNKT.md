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
hat dieselbe Tageswahl (siehe 21.4: Zurück, Heute, Morgen, Vor und
freies Datum), und eine Zuweisung hier steht
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

### 19.8 Manuelle Freigabe von „Fahrer & Fahrzeuge"

Am 30.09.2026 hat der Geschäftsführer den Bereich vollständig manuell
durchgespielt und freigegeben. Bestätigt wurden: Fahrerzustände und
Dokumentwarnungen, die Rollenbegrenzungen, die Fahrzeugzuweisung in
beide Richtungen mit sofortiger Wirkung in der Planung, die
Unauswählbarkeit gesperrter Fahrzeuge, Werkstattstatus mit Pflichtgrund,
der Erhalt vorhandener Lohnabrechnungsversionen, die vollständige Sperre
für die Buchhaltung, der zweistufige Ablauf „Änderung prüfen → Zurück
und ändern → Verbindlich speichern" und die Unveränderlichkeit des
Protokolls nach dem verbindlichen Speichern.

> **Einordnung — ausdrücklich:** Das ist eine **manuelle Prüfung der
> Designprobe**. Die Probe hat keine Datenquelle, keine
> Supabase-Verbindung und keine echten Daten. Der Durchlauf belegt, dass
> der entworfene Bedienweg verstanden und als richtig empfunden wurde —
> **nicht**, wie sich das produktive Betriebsportal verhält.

---

## 20. Meldungen & Aufgaben

Ein Eingang für alles, was bearbeitet werden muss. **Nur die
Designprobe — kein produktiver Portalcode verändert, keine Migration
ausgeführt, keine Supabase-Daten berührt.**

### 20.1 Vier Arten, eine Liste

| Art | Bedeutung |
|---|---|
| **Meldung** | reine Information, noch ohne Arbeitsauftrag |
| **Aufgabe** | braucht eine Entscheidung oder Bearbeitung |
| **Warnung** | entsteht automatisch aus einem kritischen Zustand |
| **Nachricht** | von Hand geschriebene betriebliche Mitteilung |

Jede Art ist im Klartext bezeichnet, nicht nur farblich. Reiter: **Neu ·
Mir zugewiesen · In Bearbeitung · Wartet auf Rückmeldung · Erledigt ·
Alle**, dazu ein Themenfilter über acht Themen und eine Suche über
Vorgang und betroffene Person.

Jeder Eintrag nennt Titel, Art, Thema, betroffene Person oder Fahrt,
Eingangszeit, Dringlichkeit, Zuständigkeit, Bearbeitungsstand — und hat
**genau eine Hauptaktion**.

### 20.2 Warnungen werden nicht gespeichert

Das ist die wichtigste Entscheidung dieses Bereichs. Warnungen entstehen
**jedes Mal neu** aus dem vorhandenen Zustand: Dokumentfristen aus
`dokumentstand()`, Planungskonflikte aus `konflikteVon()`. Gespeichert
wird ausschließlich, wie jemand mit ihnen umgegangen ist — Zustand,
Zuständigkeit, gesehen.

Der Grund steht im Bestand: 48 Seiten mit eigenem Browserspeicher, die
alle ihre eigene Wahrheit führen. Eine zweite Kopie einer Warnung wäre
genau derselbe Fehler im Kleinen.

### 20.3 Die Glocke ist keine Aufgabenverwaltung

Sie zählt nur **Ungesehenes** und sitzt im Portalkopf über jedem
Bereich. Ein Klick auf eine Glockenmeldung öffnet den passenden Vorgang.

**„Gesehen" heißt nicht „erledigt".** Das Öffnen setzt den Punkt
zurück, ändert aber weder Zustand noch Zuständigkeit — der Prüflauf
stellt fest, dass der Vorgang danach weiterhin unter „Neu" steht. Keine
Aufgabe kann allein dadurch verschwinden, dass jemand die Glocke öffnet.

### 20.4 Urlaub — über Fähigkeiten, nicht über Rollennamen

Entschieden wird mit `absence.decide`. Diese Fähigkeit ist bewusst
**eigenständig**, damit sie einer Person einzeln gegeben werden kann,
ohne ihr die ganze Personalrolle zu geben.

| | sieht Antrag | Planungswirkung | Empfehlung | entscheidet |
|---|:-:|:-:|:-:|:-:|
| Administration | ✔ | ✔ | — | ✔ |
| Personal | ✔ | ✔ | — | ✔ |
| Disposition | ✔ | ✔ | ✔ | — |
| Buchhaltung | — | — | — | — |

Die Disposition hinterlässt „Aus Planungssicht möglich" oder „Ersatz
erforderlich".

**Korrektur nach dem manuellen Test vom 30.09.2026.** Eine frühere
Fassung dieser Probe hatte an dieser Stelle einen Schalter, mit dem sich
die Disposition `absence.decide` **selbst** geben konnte, um vorzuführen,
dass eine Fähigkeit einzeln vergeben werden kann. Das war fachlich und
sicherheitstechnisch falsch: Niemand erweitert seine eigenen Rechte. Der
Schalter ist **ersatzlos entfernt**. An seiner Stelle steht ein Hinweis,
dass eine zusätzliche Fähigkeit ausschließlich die Administration in der
Benutzer- und Rechteverwaltung vergibt. Der Prüflauf
`tools/pruefe-probe-vorgaenge.mjs` weist jetzt das Gegenteil nach: Es
gibt keinen solchen Schalter, und die Disposition hat
`absence.decide` nicht.

Dass eine Fähigkeit einzeln vergeben werden **kann**, bleibt richtig —
das ist die Eigenschaft des Modells aus `012_rollen_und_faehigkeiten.sql`.
Nur vorgeführt wird es nicht mehr an der falschen Stelle.

Der Ablauf: Antrag öffnen → Zeitraum, Arbeitstage und Auswirkung auf
veröffentlichte Schichten → Genehmigen, Ablehnen oder Rückfrage →
**letzte Prüfung** → Verbindlich speichern. Eine Ablehnung verlangt
einen Grund; der Mitarbeiter sieht ihn. Interne Notizen bleiben intern
und sind als solche gekennzeichnet.

**Gemeinsamer Zustand:** Eine Genehmigung schreibt in dieselben
`abwesenheiten`, aus denen Planung und Fahrerstatus lesen. Der Prüflauf
genehmigt einen Urlaub und findet danach in der Planung `urlaub` und auf
der Fahrerkarte `urlaub` — ohne zweite Kopie.

### 20.5 Krankmeldung

Die Planung kennt den Status sofort — der Prüflauf stellt fest, dass
`M02` dort als `krank` geführt wird, bevor irgendjemand den Vorgang
geöffnet hat.

| | Zeitraum | Planungswirkung | Ersatzbedarf | Bescheinigung |
|---|:-:|:-:|:-:|:-:|
| Disposition | ✔ | ✔ | ✔ | — |
| Personal / Administration | ✔ | ✔ | ✔ | ✔ |

In der allgemeinen Übersicht steht **keine Diagnose und keine
medizinische Angabe** — das ist auch so ausgeschrieben. Die
Bescheinigung wird der Disposition nicht angezeigt und nicht
ausgeliefert; sie öffnet sich nur über eine kurz gültige, signierte
Adresse, nie über eine öffentliche und nie als Anhang.

Eine **Folgebescheinigung** hängt am bestehenden Vorgang und erzeugt
keinen zweiten. Eine **Zeitraumkorrektur** dagegen überschreibt nichts:
Sie legt einen neuen Vorgang an, der auf den alten verweist, und
protokolliert das. Der Prüflauf zählt nach.

### 20.6 Zuständigkeit und Paralleländerung

Eine Aufgabe kann niemandem zugewiesen, einer Person zugewiesen,
übernommen oder weitergegeben werden. Jede Übernahme und Weitergabe ist
protokolliert, mit wer und wann.

Ändert jemand anderes den Vorgang, während er offen ist, erkennt die
Ansicht das an der Versionsnummer und warnt: **„Jemand anderes hat
diesen Vorgang inzwischen geändert"** mit dem Weg „Aktuellen Stand
laden". Es wird nie still überschrieben.

### 20.7 Fahrt- und Kundenanfragen

Nur als Eingang und Verweis. Die Hauptaktion führt zur Fahrt; es
entsteht **keine zweite Kopie** der Fahrt in der Aufgabenliste. Das steht
auch im Vorgang selbst.

### 20.8 Protokoll

Bei jeder wichtigen Änderung: wer, wann, welcher Vorgang, vorher,
nachher, Entscheidung, Begründung, Zuweisung. Der Prüflauf durchsucht
das gesamte Protokoll und stellt fest, dass weder Passwörter noch
Tokens, weder Diagnosen noch Beträge darin vorkommen.

Ein geschriebener Eintrag ist per `Object.freeze` unveränderlich — auch
hier wird der Schreibversuch ausdrücklich unternommen.

### 20.9 Ein echter Befund aus dem Gegenlauf: zwei Wahrheiten

Der Portallauf schlug an — und die Ursache war keine veraltete
Erwartung, sondern ein echter Mangel. Der neue Eingang führt Vorgänge,
während **Übersicht und Navigationszähler noch aus der alten
`meldungen`-Liste zählten**. Beide Ansichten hätten verschiedene Zahlen
gezeigt: genau der Fehler, den dieser Bereich vermeiden soll.

Behoben: Die alte Liste ist entfallen. Übersicht und Navigation zählen
jetzt aus `offeneFuerMich()` — demselben Bestand wie der Eingang. Im
Code steht, warum.

Dabei fiel ein zweiter Punkt auf: Der Navigationszähler läuft beim
allerersten Zeichnen, bevor das Vorgangsmodul geladen ist. Er bleibt
dann leer, statt zu scheitern.

### 20.10 Drei eigene Fehler in den Prüfungen — getrennt benannt

Diesmal lagen alle drei in den Prüfungen, nicht in der Oberfläche:

1. **Zwei Fehlalarme derselben Sorte.** Die Suche nach „Diagnose"
   schlug auf den Satz an, der genau das zusichert — „weder Diagnose
   noch medizinische Angaben". Ebenso bei „interne Notizen": Der Treffer
   war der Hinweis, dass sie in der Mitarbeiter-Vorschau **nicht**
   erscheinen. Beide Prüfungen verlangen den Satz jetzt, statt ihn zu
   verbieten, und suchen zusätzlich nach einem Feld, das solche Angaben
   aufnehmen würde. *Das ist in dieser Sitzung bereits das dritte Mal —
   eine Zusicherung im Text sieht für eine Textsuche aus wie ein
   Verstoß.*
2. **Reiter-Fallstrick an drei Stellen.** Nach „Übernehmen" steht ein
   Vorgang unter „In Bearbeitung", nach einer Entscheidung unter
   „Erledigt" — im Reiter „Neu" ist er dann zu Recht nicht mehr.
3. **`page.$eval` statt `page.$$eval`** — die Einzahlform liefert ein
   Element, keine Liste.

### 20.11 Prüfstand

| Prüflauf | Ergebnis |
|---|---|
| `probe-vorgaenge-pruefen` (15 Blöcke, neu) | **138 bestanden, 0 offen** |
| `probe-team-pruefen` | 197 bestanden, 0 offen |
| `probe-planung-pruefen` | 171 bestanden, 0 offen |
| `probe-fahrt-pruefen` | 168 bestanden, 0 offen |
| `probe-portal-pruefen` | 107 bestanden, 0 offen |

Alle vollständig beendet, **null Netzwerkaufrufe**.

> **Einordnung unverändert:** Designprobe ohne Datenquelle. Der Lauf
> sagt nichts über die produktive Instanz.

---

## 21. Sechs Befunde des manuellen Tests — und die Ergänzung zur Administration

Der Nutzer hat „Meldungen & Aufgaben" vollständig von Hand geprüft und
sechs echte Lücken gefunden. Dazu kam eine Ergänzung zur übergeordneten
Berechtigung der Administration. Alles Folgende ist in der Designprobe
umgesetzt — **kein produktiver Umbau, keine Migration, keine
Supabase-Daten.**

### 21.1 Ein Vorgang, zwei Verantwortungen

**Der Befund:** Die Disposition konnte einen Krankheitsvorgang komplett
auf „Erledigt" setzen. Danach kam das Personal nicht mehr an seinen
Dokumentprüfauftrag.

**Die Ursache:** Der Vorgang hatte genau einen Zustand. Wer ihn setzen
durfte, setzte ihn für alle.

**Die Änderung:** Ein Krankheitsvorgang zerfällt in zwei Teilschritte
mit je eigenem Zustand, eigenem Verantwortlichen und eigener Fähigkeit.

| Teilschritt | braucht | Hauptaktion | vertraulich |
|---|---|---|:-:|
| Planung | `operations.write` | „Planung bearbeitet" | — |
| Personalprüfung | `personnel.read` | „Dokumentprüfung abgeschlossen" | ✔ |

Der **Gesamtstand wird berechnet, nicht gespeichert**: erledigt ist der
Vorgang erst, wenn jeder Pflichtteil fertig ist. Damit kann ihn niemand
durch seinen eigenen Schritt schließen.

Wer einen Teilschritt nicht bearbeiten darf, sieht **den Stand, nicht
den Inhalt** — die Disposition weiß, dass die Personalprüfung noch
offen ist, ohne die Bescheinigung zu sehen.

### 21.2 Erledigt, Archiv, Wiedereröffnung

- „Erledigt" und „Archiv" sind **zwei Reiter**. Nach 90 Tagen wandert
  ein abgeschlossener Vorgang vom einen in den anderen.
- **Gelöscht wird nichts.** Das steht auch so in der Ansicht. Eine
  echte spätere Löschung wäre eine eigene Aufbewahrungsregel und nicht
  Sache dieser Oberfläche.
- Durchsuchbar nach **Vorgangsnummer, Mitarbeiter, Thema und
  Zeitraum**. Der Zeitraum greift auf das Abschlussdatum, ersatzweise
  auf den Eingang.
- **Abschlussdatum und vorgesehenes Archivdatum** stehen im Vorgang.
- Eine **Wiedereröffnung verlangt einen Grund**, setzt Abschluss- und
  Archivdatum zurück und erzeugt einen eigenen Protokolleintrag. Ohne
  Grund geschieht nichts. Der bisherige Abschluss bleibt im Protokoll.

### 21.3 Kein Selbstberechtigungsschalter

Siehe 20.4. Der Schalter ist **ersatzlos entfernt**; an seiner Stelle
steht, wer eine Fähigkeit vergeben darf. Der Prüflauf weist das
Gegenteil nach.

### 21.4 Die Planung erreicht jeden Tag

Statt „heute / morgen" gibt es **Zurück, Heute, Morgen, Vor und ein
freies Datumsfeld**. Für einen Tag ohne gespeicherten Plan entsteht ein
leerer, bearbeitbarer Plan — sonst ließe sich ein Urlaub in drei Wochen
gar nicht nachsehen.

Dabei wurde ein Zeitzonenfehler gefunden und behoben: `alsIso()` ging
über `toISOString()` und machte aus lokaler Mitternacht den Vortag.
Aufgefallen wäre das erst nachts bei der Planung einer Nachtschicht.

### 21.5 Der Kalender

Ein neuer Bereich `probe-kalender.js` mit **Tag-, Wochen- und
Monatssicht**, freier Datumswahl, Heute und Blättern. Ein Klick auf
einen Tag öffnet dessen Tagesansicht; von dort führt jeder Eintrag in
den Bereich, der ihn verantwortet.

Der Kalender **ändert nichts**:

- Er liest den **gespeicherten** Plan, nicht den Tagesentwurf der
  Planung. Blättern im Kalender schaltet den Entwurf nicht um — sonst
  verlöre die Planung beim bloßen Nachsehen ihre offenen Eingaben. Der
  Prüflauf weist das eigens nach.
- Die Filter sind **reine Anzeigefilter**. Das ist auch ausgeschrieben.

Der Inhalt hängt an Fähigkeiten, nicht an ausgeblendeten Knöpfen:

| Inhalt | braucht |
|---|---|
| Fahrten | `operations.read` |
| Schichten | `operations.read` |
| Abwesenheiten | `operations.read` oder `personnel.read` |
| Fahrzeugtermine (TÜV, Service, Versicherung) | `fleet.read` |
| Dokumentfristen | `personnel.read` |

**Im Kalender steht nie eine Diagnose, eine Bescheinigung oder eine
sonstige medizinische Angabe** — nur „Krank" als Tatsache der
Einsatzplanung, und das auch nur für Rollen, die den Einsatz planen.
Die Buchhaltung bekommt den Kalender gar nicht erst angeboten.

### 21.6 Administration als übergeordnete Berechtigung

Die Administration darf auch Aufgaben des Personals bearbeiten. Dabei
gilt:

- **Sie handelt immer als sie selbst.** Protokolliert werden Konto,
  unveränderliche Kennung, Rolle, Datum und Uhrzeit — zum Beispiel
  „Testleitung 01 – Administration". Nie nur „bearbeitet von Admin",
  und **nie unter fremdem Namen**.
- **Bereits zugewiesene oder begonnene Aufgaben müssen ausdrücklich
  übernommen werden.** Die Übernahme einer begonnenen oder
  vertraulichen Aufgabe **verlangt einen Grund**.
- **Die bisherige Bearbeitung bleibt sichtbar.** „Aktuell
  verantwortlich" und „zuletzt bearbeitet" sind zwei getrennte Felder.
  Personal sieht, wer übernommen hat.
- Wer **mehrere** Teilschritte bearbeiten darf — und das ist bei der
  Administration der Regelfall — bekommt **keine mehrdeutige
  Hauptaktion**, sondern je einen Knopf am Teilschritt. Sie muss sagen,
  welchen Schritt sie meint.

Alle Konten der Probe sind Testpersonen: `Testleitung 01`,
`Testdisposition 01`, `Testpersonal 01`, `Testbuchhaltung 01`,
`Testmitarbeiter 01`. **Keine echten Namen.**

### 21.7 Was dabei zu korrigieren war

1. **Der Fall `vg-weitergeben` war beim Umbau mit herausgefallen** —
   ein früherer Zeilenersatz hatte ihn mitgenommen. Gefunden, weil das
   Änderungsskript „FEHLT" meldete, nicht weil ein Test fehlschlug.
2. **Die Übernahme durch die Administration griff auf den falschen
   Teilschritt.** `meinTeil()` liefert den *ersten* erlaubten Teil; die
   Administration darf beide. Das war keine Testschwäche, sondern eine
   echte Lücke im Entwurf — behoben durch Aktionen, die den
   Teilschritt ausdrücklich benennen.
3. **Der Kalender hätte den Tagesentwurf der Planung umgeschaltet**,
   weil `planEntwurf()` auf `zustand.planDatum` arbeitet. Er liest
   jetzt `D.planung[tag]` direkt.

### 21.8 Zwei Befunde aus dem Gegenlauf

Die vollständigen Läufe der schon freigegebenen Bereiche haben zwei
Folgen dieser Arbeit aufgedeckt, die im neuen Prüflauf nicht auffielen:

1. **Ein echter Darstellungsfehler.** Das neue Datumsfeld `.tagfeld input`
   stand auf 14 px. Unter 16 px zoomt iOS beim Hineintippen in das Feld
   und verschiebt die ganze Ansicht. Gefunden von
   `probe-planung-pruefen` und `probe-team-pruefen`, die jede
   Eingabefläche nachmessen — **nicht** vom neuen Lauf, der auf die
   Fachlogik sah. Behoben auf 16 px.
2. **Zwei Zählungen, die nachzuziehen waren.** `probe-portal-pruefen`
   prüfte „Disposition sieht fünf Bereiche" und „Administration sieht
   elf". Mit dem Kalender sind es sechs und zwölf. Das ist **kein
   Fehler, sondern die Folge einer gewollten Änderung** — die beiden
   Zusicherungen wurden angepasst und die Änderung hier benannt, statt
   sie stillschweigend zu verschieben.

3. **Ein umbenanntes Bedienelement.** Der alte Tagesumschalter hieß
   `plan-tag:0` / `plan-tag:1`. Mit der freien Tageswahl heißt er
   `plan-heute` / `plan-morgen`. Sechs Stellen in
   `probe-planung-pruefen` und `probe-portal-pruefen` zeigten noch auf den
   alten Namen und liefen dort in eine Zeitüberschreitung — die Läufe
   brachen **ab**, ohne eine Zusammenfassung zu drucken. Ein Lauf, der
   keine Bilanz ausgibt, ist kein bestandener Lauf; das ist der
   Unterschied zwischen `code=1` mit Befund und `code=1` mit Absturz.

### 21.9 Prüfstand

| Prüflauf | Ergebnis |
|---|---|
| `probe-teilung-pruefen` (10 Blöcke, neu) | **97 bestanden, 0 offen** |
| `probe-vorgaenge-pruefen` | 137 bestanden, 0 offen |
| `probe-team-pruefen` | 197 bestanden, 0 offen |
| `probe-planung-pruefen` | 171 bestanden, 0 offen |
| `probe-fahrt-pruefen` | 168 bestanden, 0 offen |
| `probe-portal-pruefen` | 107 bestanden, 0 offen |

Zusammen **877 Zusicherungen, 0 offen**. Alle sechs Läufe vollständig
beendet — jeder mit einer gedruckten Bilanz, keiner abgebrochen.
**Null Netzwerkaufrufe** in jedem Lauf.

> **Einordnung unverändert:** Designprobe ohne Datenquelle, ohne Upload,
> ohne Versand. Diese Läufe sagen **nichts** über die produktive
> Instanz. Was hier „bestanden" heißt, ist eine Aussage über die
> Oberfläche der Probe — nicht über RLS, nicht über Storage, nicht über
> echte Rollen.

---

## 22. Dokumentprüfung ohne Dokument — ein Befund des manuellen Tests

**Der Befund (Nutzer, 01.10.2026).** Als Personal die Krankmeldung
übernommen. Die eingereichte Bescheinigung ließ sich nirgends öffnen
oder ansehen. Sichtbar waren nur „Dokumentprüfung abgeschlossen" und
darunter „Weitergeben". **Damit ließ sich eine Dokumentprüfung
abschließen, ohne das Dokument geprüft zu haben.**

### 22.1 Was tatsächlich los war

Der Bescheinigungsblock war vorhanden — er stand nur **unter** dem
Teilschrittblock mit der Abschlussaktion. Wer nicht weiterscrollte,
sah den Abschlussknopf und sonst nichts. Dazu kam: Der einzige Knopf
hieß „Datei sicher prüfen" und erzeugte lediglich eine Quittung — es
gab **keine Einsicht**, und es gab **kein Prüfergebnis**. Die
Oberfläche nannte den Schritt „Prüfung", ohne dass irgendetwas zu
prüfen gewesen wäre.

Das ist nicht in erster Linie ein Darstellungsfehler. Eine Aktion,
die „abgeschlossen" sagt, ohne dass die Handlung möglich war, ist
eine **Scheinprüfung** — und im Protokoll stünde anschließend, die
Prüfung habe stattgefunden.

### 22.2 Die Änderung

**Reihenfolge.** Im Vorgangsdialog steht jetzt erst der Inhalt, dann
die Handlung: Zusammenfassung → Krankmeldung → Bescheinigung →
Teilschritte. Der Prüflauf vergleicht die Stellung der beiden Blöcke
und besteht nur, wenn die Bescheinigung vorne steht.

**Drei benannte Schritte.** Der Bescheinigungsblock führt eine
sichtbare Kette:

| Schritt | Was geschieht | Was festgehalten wird |
|---|---|---|
| 1. Bescheinigung ansehen | Dateiname ist anklickbar, öffnet die sichere Vorschau | Konto, Kennung, Rolle, Datum, Uhrzeit |
| 2. Prüfergebnis festhalten | vier fest benannte Ergebnisse | das gewählte Ergebnis |
| 3. Teilschritt abschließen | erst jetzt verfügbar | wie bisher |

**Die Sperre.** Ohne Einsicht **und** Ergebnis gibt es keinen
Abschluss — weder am Teilschritt noch in der Fußzeile. Die Aktion
wird **sichtbar gesperrt, nicht versteckt**, mit ausgeschriebenem
Grund: „Die Bescheinigung wurde noch nicht geöffnet. Erst ansehen,
dann bewerten, dann abschließen."

Ein gesperrter Knopf ist Bequemlichkeit, kein Schutz. Die Bedingung
steht deshalb **auch in der Aktion selbst**; der Prüflauf ruft
`vg-teil-erledigen`, `vg-erledigen` und `vg-ergebnis` unter Umgehung
der Oberfläche direkt auf und weist nach, dass nichts geschieht.

**Die vier Ergebnisse** sind eine feste Liste, kein Freitextfeld:
gültig und Zeitraum stimmt · Zeitraum weicht ab · nicht lesbar oder
unvollständig · falsche Person oder falscher Vorgang. Ein freies Feld
würde früher oder später eine Diagnose aufnehmen. **Keines dieser
Ergebnisse nennt einen medizinischen Grund.**

### 22.3 Die Vorschau

Sie zeigt Dateiname, Mitarbeiter, gemeldeten Zeitraum, Eingang und
wer gerade hineinsieht — und einen deutlich als **Platzhalter**
bezeichneten Anzeigebereich.

Was dort ausdrücklich steht: In dieser Designprobe gibt es **keine
Datei**, und die echte Supabase-Storage-API ist hier **nicht
verfügbar**. Gezeigt wird der Rahmen der Anzeige, nicht ein geprüftes
Verhalten der Storage-API. Im Portal wäre es eine kurz gültige,
signierte Adresse — kein Herunterladen auf Vorrat, kein Anhang per
E-Mail, keine öffentliche Adresse.

**Der Inhalt der Bescheinigung wird nicht abgetippt und nirgends
gespeichert.** Festgehalten wird allein, *dass* geöffnet wurde.

Das bloße Öffnen des Dialogs gilt noch nicht als Einsicht; es braucht
die ausdrückliche Bestätigung. Escape bricht ab, ohne etwas zu
vermerken — der Prüflauf weist beides nach.

### 22.4 Was sich für die Disposition nicht ändert

Sie sieht **weder Datei noch Dateiname**, keinen Anzeigebereich,
keine Prüfkette und keinen Knopf dafür. Auch der direkte Aufruf von
`vg-bescheinigung` und `vg-einsicht-ja` bewirkt bei ihr nichts. Ihr
eigener Teilschritt „Planung" bleibt unberührt — dort gibt es nichts
anzusehen, also auch nichts zu sperren.

Die Administration sieht die Prüfkette, **muss aber ebenfalls erst
ansehen und bewerten**, bevor sie die Personalprüfung abschließen
kann. Eine übergeordnete Berechtigung ist kein Freibrief, einen
Schritt zu überspringen.

### 22.5 Was ich damals bewusst NICHT entschieden habe

> **Nachtrag 01.10.2026:** Die hier offenen Fragen zur Folge eines
> auffälligen Prüfergebnisses sind inzwischen vom Geschäftsführer
> entschieden. Siehe Abschnitt 23. Offen bleibt allein die
> Aufbewahrung.

Was betrieblich folgen soll, wenn das Ergebnis „Zeitraum weicht ab"
oder „nicht lesbar" lautet — ob der Teilschritt dann überhaupt
abgeschlossen werden darf, ob automatisch eine Rückfrage entsteht, ob
eine neue Bescheinigung angefordert wird —, ist eine
**Geschäftsregel**. Ich habe sie nicht erfunden. Derzeit gilt: Jedes
der vier Ergebnisse erlaubt den Abschluss, und das Ergebnis steht im
Protokoll. **Das ist eine offene Frage an den Geschäftsführer, keine
Festlegung.**

Ebenso offen: die Aufbewahrungsfrist für Bescheinigungen und ob ein
Prüfergebnis nach dem Abschluss noch änderbar sein soll.

### 22.6 Ein eigener Fehler im Prüflauf — zum vierten Mal derselbe

Die Prüfung „keine Diagnose in der Vorschau" suchte nach dem **Wort**
„Diagnose". Getroffen hat sie den Satz, der eine Diagnose
**ausschließt**: „Keine Diagnose, kein Krankheitsgrund, kein
Dokumentinhalt."

Das ist in dieser Sitzung der **vierte Fehlalarm derselben Art**. Eine
Zusicherung im Text sieht für eine Textsuche aus wie ein Verstoß.
Behoben wie zuvor, und diesmal in zwei getrennte Prüfungen zerlegt:

1. Die Zusicherung **muss** dastehen.
2. Es darf **kein Beschriftungsfeld** (`<dt>`) geben, das eine Diagnose,
   einen Krankheitsgrund, einen Befund oder ein Attest aufnehmen
   würde.

Die zweite Form ist die belastbare: Sie prüft die **Struktur**, nicht
den Fließtext. Dass mir derselbe Fehler viermal unterläuft, gehört
hierher und nicht in eine Fußnote.

### 22.7 Prüfstand nach der Korrektur

| Prüflauf | Ergebnis |
|---|---|
| `probe-dokument-pruefen` (9 Blöcke, neu) | **90 bestanden, 0 offen** |
| `probe-teilung-pruefen` | 99 bestanden, 0 offen |
| `probe-vorgaenge-pruefen` | 137 bestanden, 0 offen |
| `probe-team-pruefen` | 197 bestanden, 0 offen |
| `probe-planung-pruefen` | 171 bestanden, 0 offen |
| `probe-fahrt-pruefen` | 168 bestanden, 0 offen |
| `probe-portal-pruefen` | 107 bestanden, 0 offen |

Zusammen **969 Zusicherungen, 0 offen**, null Netzwerkaufrufe.

Der Planungslauf brach im Reihendurchlauf einmal an `page.goto` ab —
eine Zeitüberschreitung beim Start des Browsers, keine Zusicherung.
Einzeln ausgeführt: 171 / 0. Auch das steht hier, statt es
wegzulassen.

> **Was dieser Lauf NICHT zeigt:** Es gibt in der Probe keine Datei
> und keine Storage-API. Belegt ist die Reihenfolge der Bedienung und
> dass die Sperren auch beim direkten Aufruf der Aktionen greifen.
> **Ob die echte Supabase-Storage-API eine Bescheinigung richtig
> schützt oder ausliefert, ist damit unverändert ungeprüft.**

### 22.8 Zwei weitere Befunde aus den Gegenläufen

**1. Eine zu kleine Bedienfläche — echter Fehler.** Der anklickbare
Dateiname sah aus wie ein Verweis im Fließtext und war damit unter
36 px hoch. Ein Verweis, der wie Text aussieht, muss trotzdem mit dem
Finger zu treffen sein. Gefunden von `probe-vorgaenge-pruefen` bei
allen vier Breiten. Behoben mit `min-height: 36px` und Innenabstand.

**2. Ein flatternder Prüflauf — mein Fehler, nicht der der
Oberfläche.** `probe-planung-pruefen` meldete zweimal, „15:30" sei als
„30" im Feld gelandet. **Einzeln ausgeführt lief derselbe Prüflauf
mit 171 / 0 durch.**

Die Ursache: Das Zeitfeld markiert beim Hineinspringen seinen ganzen
Inhalt, aber erst im nächsten Frame (`requestAnimationFrame`).
Tippt der Prüflauf sofort los, fällt dieses `select()` zwischen zwei
Anschläge, und die nächste Ziffer ersetzt das schon Getippte. Unter
Last — sieben Browserläufe hintereinander — wurde das Zeitfenster
groß genug.

**Das ist kein Fehler der Oberfläche.** Ein Mensch tippt nicht
innerhalb eines Frames nach dem Hineinspringen. Es war ein Fehler
dieses Prüflaufs. Behoben, indem der Frame abgewartet wird — **nicht**,
indem die Zusicherung weicher gemacht wird.

Festgehalten, weil ein flatternder Prüflauf schlimmer ist als keiner:
Er gewöhnt daran, Rot zu übersehen. Eine Zusicherung, die mal
besteht und mal nicht, sagt nichts aus — bis geklärt ist, woran es
liegt.

---

## 23. Die Geschäftsregel zur Dokumentprüfung

Vorgabe des Geschäftsführers vom 01.10.2026, sieben Punkte. **Keine
Annahme der Designprobe** — und deshalb auch der einzige Ort, an dem
in diesem Bereich eine Fachregel steht.

Umgesetzt ausschließlich in der Designprobe: keine Migration, keine
Supabase-Datenänderung, kein Push, Merge oder Deployment.

### 23.1 Die drei Ergebnisse und ihre Folge

| Prüfergebnis | Teilschritt | Was automatisch entsteht | Abschluss erlaubt |
|---|---|---|---|
| **Alles in Ordnung** | darf geschlossen werden | — | sofort |
| **Zeitraum weicht ab** | bleibt offen | Rückfrage mit dem abweichenden Zeitraum | erst nach der Klärung |
| **Nicht lesbar oder unvollständig** | bleibt offen | Anforderung einer neuen Bescheinigung | erst nach Eingang **und** Prüfung der neuen Datei |

| **Falsche Person oder falscher Vorgang** | bleibt offen | Markierung „Zuordnung ungeklärt" + Klärungsaufgabe | erst nach geklärter Zuordnung, siehe Abschnitt 24 |

Jede Auswahlkarte nennt ihre Folge, **bevor** sie gedrückt wird. Wer
„Zeitraum weicht ab" wählt, weiß vorher, dass daraus eine Rückfrage
entsteht.

> **Nachtrag 01.10.2026:** Der vierte Fall war hier zunächst als
> offene Frage vermerkt, weil keine Regel vorlag. Sie liegt inzwischen
> vor; er steht wieder zur Auswahl. Siehe Abschnitt 24.

### 23.2 Eine Kette von Nachweisen statt einer Datei

Aus `daten.datei` ist `daten.nachweise` geworden — eine Liste. Jeder
Eintrag hat:

| Feld | Bedeutung |
|---|---|
| `nr` | fortlaufende Nummer, 1, 2, 3 … |
| `art` | Erstbescheinigung, Folgebescheinigung, Ersatz nach Beanstandung |
| `eingang` | eigene Eingangszeit |
| `einsicht` | wer hat sie wann geöffnet (Konto, Kennung, Rolle, Datum, Uhrzeit) |
| `ergebnis` | das festgehaltene Prüfergebnis |
| `gesperrt` | Ergebnis festgehalten, nicht mehr überschreibbar |
| `beanstandet` | als nicht lesbar beanstandet, bleibt erhalten |

**Geprüft wird immer der letzte Eintrag.** Daraus folgt der dritte
Fall von selbst: Geht eine neue Datei ein, ist sie der letzte
Eintrag, hat noch keine Einsicht — und die Prüfung beginnt bei
Schritt 1. Das musste nicht eigens programmiert werden.

**Nichts wird überschrieben.** Die beanstandete Datei behält Nummer,
Eingangszeit, Art, Einsicht und Ergebnis und bleibt mit dem Vermerk
„beanstandet, bleibt erhalten" in der Liste stehen. Beide hängen am
selben Krankheitsvorgang.

Die **Folgebescheinigung** (längere Krankheit) läuft über dieselbe
Kette: Sie ist eine eigene Datei und bekommt deshalb ihre eigene
Prüfung. Die frühere getrennte Liste `daten.folge` ist entfallen —
zwei Listen für dasselbe wären zwei Wahrheiten gewesen.

### 23.3 Korrekturen

Ein festgehaltenes Ergebnis ist **gesperrt**. Es gibt kein „Ergebnis
ändern" mehr, und der direkte Aufruf von `vg-ergebnis` auf einen
gesperrten Nachweis bewirkt nichts.

Eine Korrektur läuft über `vg-pruefkorrektur`:

1. Pflichtgrund — ohne ihn entsteht **nichts**, auch kein Vorgang.
2. Es entsteht ein **eigener Vorgang**, der auf den ursprünglichen
   verweist (`bezugAuf`). Dort beginnt die Prüfung von vorn.
3. Das alte Ergebnis bleibt unverändert stehen.

Protokolliert werden **wer** (Konto, unveränderliche Kennung, Rolle),
**wann** (Datum, Uhrzeit), **betroffener Vorgang**, **vorheriger
Zustand**, **neuer Zustand** und der **Grund**. Der Eintrag ist
eingefroren.

**Kein medizinischer Freitext.** Der Grund ist ein Freitextfeld für
die Begründung der Korrektur; der Dialog schreibt ausdrücklich dazu,
was dort nicht hineingehört. Das Prüfergebnis selbst ist **kein**
Freitext, sondern eine der drei festen Angaben — ein freies Feld
würde früher oder später eine Diagnose aufnehmen.

### 23.4 Rollen

Für die **Disposition** ändert sich nichts: kein Dateiname, keine
Nachweisliste, keine Prüfkette, kein Prüfergebnis, keine Vorschau,
kein Knopf dafür. Der Prüflauf ruft alle sechs Aktionen
(`vg-bescheinigung`, `vg-einsicht-ja`, `vg-ergebnis`,
`vg-neue-bescheinigung`, `vg-klaerung-ja`, `vg-pruefkorrektur`) unter
Umgehung der Oberfläche direkt auf und weist nach, dass bei ihr
nichts geschieht.

**Personal und Administration** müssen die Datei tatsächlich öffnen,
die Einsicht bestätigen und ein zulässiges Ergebnis wählen. **Die
Administration darf diese Prüfung nicht überspringen** — eine
übergeordnete Berechtigung ist kein Freibrief. Sie handelt dabei
unter eigenem Namen.

### 23.5 Aufbewahrung — offene rechtliche Entscheidung

**Es ist bewusst KEINE automatische Lösch- oder Aufbewahrungsfrist
festgelegt.** Kein Code entfernt einen Nachweis aus der Kette; es
gibt kein Feld für eine Frist und keine Logik, die eine prüfen
würde. Der Prüflauf sucht im Quelltext danach und besteht nur, wenn
nichts davon da ist. Auch nach dem Abschluss der Personalprüfung
bleiben alle Nachweise mit ihren Ergebnissen erhalten.

**Wie lange eine Arbeitsunfähigkeitsbescheinigung aufbewahrt werden
darf und ab wann sie gelöscht werden muss, ist eine offene
rechtliche Entscheidung.** Sie berührt Aufbewahrungspflichten,
Datenminimierung und Löschpflichten bei Gesundheitsdaten. Das ist
nichts, was aus der Oberfläche abgeleitet werden kann, und nichts,
was ich festlege.

Bis diese Entscheidung vorliegt, **wächst die Kette und wird nichts
gelöscht**. Das ist die vorsichtige Richtung: Eine zu lange
aufbewahrte Datei lässt sich später löschen, eine zu früh gelöschte
nicht zurückholen. Es ist aber ausdrücklich **kein Dauerzustand**.

### 23.6 Was dieser Stand NICHT belegt

Es gibt in der Probe **keine Datei und keine Storage-API**. Belegt
ist, dass die Geschäftsregel in der Oberfläche **und in den Aktionen**
durchgesetzt wird — nicht, dass eine echte Bescheinigung geschützt
oder richtig ausgeliefert würde. Der Übergang auf echte Dateien ist
ein eigener Schritt mit eigener Prüfung.

### 23.7 Was beim Umsetzen schiefging

**Ein echter Fehler in der Regel selbst.** Nach dem Klären der
Rückfrage blieb der Abschluss gesperrt — die Sperre fragte nur das
Ergebnis ab („verlangt eine Folge, also zu") und nicht, ob diese
Folge inzwischen erledigt ist. Damit war Regel 2 genau in ihrer
zweiten Hälfte („erst nach der Klärung") nicht umgesetzt. Gefunden
beim Durchspielen von Hand, **bevor** der Prüflauf stand. Behoben:
Die Sperre sucht jetzt die Klärung, die zu diesem Nachweis gehört,
und gibt frei, sobald sie erledigt ist. Fehlt eine Klärung ganz,
bleibt gesperrt — der Fall dürfte nicht vorkommen und wird im
Zweifel als Sperre behandelt, nicht als Freigabe.

**Zwei Stellen in bestehenden Prüfläufen**, beide Folge der
Umstellung, nicht Fehler:

1. `probe-vorgaenge-pruefen` zählte `daten.folge.length === 1`. Die
   Folgebescheinigung steht jetzt in derselben Kette wie die
   Erstbescheinigung, also sind es zwei Nachweise. Angepasst.
2. Dieselbe Prüfung suchte `/signierte Adresse/` im rohen Text. Der
   Satz bricht im Quelltext um, und eine rohe Textsuche sieht dann
   einen fehlenden Satz. Behoben durch Glätten der Leerzeichen — die
   gleiche Falle wie beim Diagnose-Fehlalarm, nur andersherum.

**Und ein dritter, selbst gemachter.** Beim Einsetzen der Glättung
ging der Backslash verloren: Aus `/\s+/g` wurde `/s+/g`. Der
Prüflauf ersetzte daraufhin jedes **s** im Text durch ein Leerzeichen
und meldete drei Fehlschläge, von denen zwei vorher bestanden hatten
— unter anderem „Personal sieht die Bescheinigung", weil aus
„Testbescheinigung" „Te tbe cheinigung" geworden war.

Ursache: Das Änderungsskript lief über `node -e` in der Shell, und der
Backslash wurde unterwegs gefressen. **Zum dritten Mal in dieser
Sitzung ein Zeichen, das eine Ersetzungsschicht nicht überlebt hat**
— vorher zweimal `$` in `String.replace`, das dort ein einzelnes `# Betriebsportal — Bericht am verbindlichen Haltepunkt

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
hat dieselbe Tageswahl (siehe 21.4: Zurück, Heute, Morgen, Vor und
freies Datum), und eine Zuweisung hier steht
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

### 19.8 Manuelle Freigabe von „Fahrer & Fahrzeuge"

Am 30.09.2026 hat der Geschäftsführer den Bereich vollständig manuell
durchgespielt und freigegeben. Bestätigt wurden: Fahrerzustände und
Dokumentwarnungen, die Rollenbegrenzungen, die Fahrzeugzuweisung in
beide Richtungen mit sofortiger Wirkung in der Planung, die
Unauswählbarkeit gesperrter Fahrzeuge, Werkstattstatus mit Pflichtgrund,
der Erhalt vorhandener Lohnabrechnungsversionen, die vollständige Sperre
für die Buchhaltung, der zweistufige Ablauf „Änderung prüfen → Zurück
und ändern → Verbindlich speichern" und die Unveränderlichkeit des
Protokolls nach dem verbindlichen Speichern.

> **Einordnung — ausdrücklich:** Das ist eine **manuelle Prüfung der
> Designprobe**. Die Probe hat keine Datenquelle, keine
> Supabase-Verbindung und keine echten Daten. Der Durchlauf belegt, dass
> der entworfene Bedienweg verstanden und als richtig empfunden wurde —
> **nicht**, wie sich das produktive Betriebsportal verhält.

---

## 20. Meldungen & Aufgaben

Ein Eingang für alles, was bearbeitet werden muss. **Nur die
Designprobe — kein produktiver Portalcode verändert, keine Migration
ausgeführt, keine Supabase-Daten berührt.**

### 20.1 Vier Arten, eine Liste

| Art | Bedeutung |
|---|---|
| **Meldung** | reine Information, noch ohne Arbeitsauftrag |
| **Aufgabe** | braucht eine Entscheidung oder Bearbeitung |
| **Warnung** | entsteht automatisch aus einem kritischen Zustand |
| **Nachricht** | von Hand geschriebene betriebliche Mitteilung |

Jede Art ist im Klartext bezeichnet, nicht nur farblich. Reiter: **Neu ·
Mir zugewiesen · In Bearbeitung · Wartet auf Rückmeldung · Erledigt ·
Alle**, dazu ein Themenfilter über acht Themen und eine Suche über
Vorgang und betroffene Person.

Jeder Eintrag nennt Titel, Art, Thema, betroffene Person oder Fahrt,
Eingangszeit, Dringlichkeit, Zuständigkeit, Bearbeitungsstand — und hat
**genau eine Hauptaktion**.

### 20.2 Warnungen werden nicht gespeichert

Das ist die wichtigste Entscheidung dieses Bereichs. Warnungen entstehen
**jedes Mal neu** aus dem vorhandenen Zustand: Dokumentfristen aus
`dokumentstand()`, Planungskonflikte aus `konflikteVon()`. Gespeichert
wird ausschließlich, wie jemand mit ihnen umgegangen ist — Zustand,
Zuständigkeit, gesehen.

Der Grund steht im Bestand: 48 Seiten mit eigenem Browserspeicher, die
alle ihre eigene Wahrheit führen. Eine zweite Kopie einer Warnung wäre
genau derselbe Fehler im Kleinen.

### 20.3 Die Glocke ist keine Aufgabenverwaltung

Sie zählt nur **Ungesehenes** und sitzt im Portalkopf über jedem
Bereich. Ein Klick auf eine Glockenmeldung öffnet den passenden Vorgang.

**„Gesehen" heißt nicht „erledigt".** Das Öffnen setzt den Punkt
zurück, ändert aber weder Zustand noch Zuständigkeit — der Prüflauf
stellt fest, dass der Vorgang danach weiterhin unter „Neu" steht. Keine
Aufgabe kann allein dadurch verschwinden, dass jemand die Glocke öffnet.

### 20.4 Urlaub — über Fähigkeiten, nicht über Rollennamen

Entschieden wird mit `absence.decide`. Diese Fähigkeit ist bewusst
**eigenständig**, damit sie einer Person einzeln gegeben werden kann,
ohne ihr die ganze Personalrolle zu geben.

| | sieht Antrag | Planungswirkung | Empfehlung | entscheidet |
|---|:-:|:-:|:-:|:-:|
| Administration | ✔ | ✔ | — | ✔ |
| Personal | ✔ | ✔ | — | ✔ |
| Disposition | ✔ | ✔ | ✔ | — |
| Buchhaltung | — | — | — | — |

Die Disposition hinterlässt „Aus Planungssicht möglich" oder „Ersatz
erforderlich".

**Korrektur nach dem manuellen Test vom 30.09.2026.** Eine frühere
Fassung dieser Probe hatte an dieser Stelle einen Schalter, mit dem sich
die Disposition `absence.decide` **selbst** geben konnte, um vorzuführen,
dass eine Fähigkeit einzeln vergeben werden kann. Das war fachlich und
sicherheitstechnisch falsch: Niemand erweitert seine eigenen Rechte. Der
Schalter ist **ersatzlos entfernt**. An seiner Stelle steht ein Hinweis,
dass eine zusätzliche Fähigkeit ausschließlich die Administration in der
Benutzer- und Rechteverwaltung vergibt. Der Prüflauf
`tools/pruefe-probe-vorgaenge.mjs` weist jetzt das Gegenteil nach: Es
gibt keinen solchen Schalter, und die Disposition hat
`absence.decide` nicht.

Dass eine Fähigkeit einzeln vergeben werden **kann**, bleibt richtig —
das ist die Eigenschaft des Modells aus `012_rollen_und_faehigkeiten.sql`.
Nur vorgeführt wird es nicht mehr an der falschen Stelle.

Der Ablauf: Antrag öffnen → Zeitraum, Arbeitstage und Auswirkung auf
veröffentlichte Schichten → Genehmigen, Ablehnen oder Rückfrage →
**letzte Prüfung** → Verbindlich speichern. Eine Ablehnung verlangt
einen Grund; der Mitarbeiter sieht ihn. Interne Notizen bleiben intern
und sind als solche gekennzeichnet.

**Gemeinsamer Zustand:** Eine Genehmigung schreibt in dieselben
`abwesenheiten`, aus denen Planung und Fahrerstatus lesen. Der Prüflauf
genehmigt einen Urlaub und findet danach in der Planung `urlaub` und auf
der Fahrerkarte `urlaub` — ohne zweite Kopie.

### 20.5 Krankmeldung

Die Planung kennt den Status sofort — der Prüflauf stellt fest, dass
`M02` dort als `krank` geführt wird, bevor irgendjemand den Vorgang
geöffnet hat.

| | Zeitraum | Planungswirkung | Ersatzbedarf | Bescheinigung |
|---|:-:|:-:|:-:|:-:|
| Disposition | ✔ | ✔ | ✔ | — |
| Personal / Administration | ✔ | ✔ | ✔ | ✔ |

In der allgemeinen Übersicht steht **keine Diagnose und keine
medizinische Angabe** — das ist auch so ausgeschrieben. Die
Bescheinigung wird der Disposition nicht angezeigt und nicht
ausgeliefert; sie öffnet sich nur über eine kurz gültige, signierte
Adresse, nie über eine öffentliche und nie als Anhang.

Eine **Folgebescheinigung** hängt am bestehenden Vorgang und erzeugt
keinen zweiten. Eine **Zeitraumkorrektur** dagegen überschreibt nichts:
Sie legt einen neuen Vorgang an, der auf den alten verweist, und
protokolliert das. Der Prüflauf zählt nach.

### 20.6 Zuständigkeit und Paralleländerung

Eine Aufgabe kann niemandem zugewiesen, einer Person zugewiesen,
übernommen oder weitergegeben werden. Jede Übernahme und Weitergabe ist
protokolliert, mit wer und wann.

Ändert jemand anderes den Vorgang, während er offen ist, erkennt die
Ansicht das an der Versionsnummer und warnt: **„Jemand anderes hat
diesen Vorgang inzwischen geändert"** mit dem Weg „Aktuellen Stand
laden". Es wird nie still überschrieben.

### 20.7 Fahrt- und Kundenanfragen

Nur als Eingang und Verweis. Die Hauptaktion führt zur Fahrt; es
entsteht **keine zweite Kopie** der Fahrt in der Aufgabenliste. Das steht
auch im Vorgang selbst.

### 20.8 Protokoll

Bei jeder wichtigen Änderung: wer, wann, welcher Vorgang, vorher,
nachher, Entscheidung, Begründung, Zuweisung. Der Prüflauf durchsucht
das gesamte Protokoll und stellt fest, dass weder Passwörter noch
Tokens, weder Diagnosen noch Beträge darin vorkommen.

Ein geschriebener Eintrag ist per `Object.freeze` unveränderlich — auch
hier wird der Schreibversuch ausdrücklich unternommen.

### 20.9 Ein echter Befund aus dem Gegenlauf: zwei Wahrheiten

Der Portallauf schlug an — und die Ursache war keine veraltete
Erwartung, sondern ein echter Mangel. Der neue Eingang führt Vorgänge,
während **Übersicht und Navigationszähler noch aus der alten
`meldungen`-Liste zählten**. Beide Ansichten hätten verschiedene Zahlen
gezeigt: genau der Fehler, den dieser Bereich vermeiden soll.

Behoben: Die alte Liste ist entfallen. Übersicht und Navigation zählen
jetzt aus `offeneFuerMich()` — demselben Bestand wie der Eingang. Im
Code steht, warum.

Dabei fiel ein zweiter Punkt auf: Der Navigationszähler läuft beim
allerersten Zeichnen, bevor das Vorgangsmodul geladen ist. Er bleibt
dann leer, statt zu scheitern.

### 20.10 Drei eigene Fehler in den Prüfungen — getrennt benannt

Diesmal lagen alle drei in den Prüfungen, nicht in der Oberfläche:

1. **Zwei Fehlalarme derselben Sorte.** Die Suche nach „Diagnose"
   schlug auf den Satz an, der genau das zusichert — „weder Diagnose
   noch medizinische Angaben". Ebenso bei „interne Notizen": Der Treffer
   war der Hinweis, dass sie in der Mitarbeiter-Vorschau **nicht**
   erscheinen. Beide Prüfungen verlangen den Satz jetzt, statt ihn zu
   verbieten, und suchen zusätzlich nach einem Feld, das solche Angaben
   aufnehmen würde. *Das ist in dieser Sitzung bereits das dritte Mal —
   eine Zusicherung im Text sieht für eine Textsuche aus wie ein
   Verstoß.*
2. **Reiter-Fallstrick an drei Stellen.** Nach „Übernehmen" steht ein
   Vorgang unter „In Bearbeitung", nach einer Entscheidung unter
   „Erledigt" — im Reiter „Neu" ist er dann zu Recht nicht mehr.
3. **`page.$eval` statt `page.$$eval`** — die Einzahlform liefert ein
   Element, keine Liste.

### 20.11 Prüfstand

| Prüflauf | Ergebnis |
|---|---|
| `probe-vorgaenge-pruefen` (15 Blöcke, neu) | **138 bestanden, 0 offen** |
| `probe-team-pruefen` | 197 bestanden, 0 offen |
| `probe-planung-pruefen` | 171 bestanden, 0 offen |
| `probe-fahrt-pruefen` | 168 bestanden, 0 offen |
| `probe-portal-pruefen` | 107 bestanden, 0 offen |

Alle vollständig beendet, **null Netzwerkaufrufe**.

> **Einordnung unverändert:** Designprobe ohne Datenquelle. Der Lauf
> sagt nichts über die produktive Instanz.

---

## 21. Sechs Befunde des manuellen Tests — und die Ergänzung zur Administration

Der Nutzer hat „Meldungen & Aufgaben" vollständig von Hand geprüft und
sechs echte Lücken gefunden. Dazu kam eine Ergänzung zur übergeordneten
Berechtigung der Administration. Alles Folgende ist in der Designprobe
umgesetzt — **kein produktiver Umbau, keine Migration, keine
Supabase-Daten.**

### 21.1 Ein Vorgang, zwei Verantwortungen

**Der Befund:** Die Disposition konnte einen Krankheitsvorgang komplett
auf „Erledigt" setzen. Danach kam das Personal nicht mehr an seinen
Dokumentprüfauftrag.

**Die Ursache:** Der Vorgang hatte genau einen Zustand. Wer ihn setzen
durfte, setzte ihn für alle.

**Die Änderung:** Ein Krankheitsvorgang zerfällt in zwei Teilschritte
mit je eigenem Zustand, eigenem Verantwortlichen und eigener Fähigkeit.

| Teilschritt | braucht | Hauptaktion | vertraulich |
|---|---|---|:-:|
| Planung | `operations.write` | „Planung bearbeitet" | — |
| Personalprüfung | `personnel.read` | „Dokumentprüfung abgeschlossen" | ✔ |

Der **Gesamtstand wird berechnet, nicht gespeichert**: erledigt ist der
Vorgang erst, wenn jeder Pflichtteil fertig ist. Damit kann ihn niemand
durch seinen eigenen Schritt schließen.

Wer einen Teilschritt nicht bearbeiten darf, sieht **den Stand, nicht
den Inhalt** — die Disposition weiß, dass die Personalprüfung noch
offen ist, ohne die Bescheinigung zu sehen.

### 21.2 Erledigt, Archiv, Wiedereröffnung

- „Erledigt" und „Archiv" sind **zwei Reiter**. Nach 90 Tagen wandert
  ein abgeschlossener Vorgang vom einen in den anderen.
- **Gelöscht wird nichts.** Das steht auch so in der Ansicht. Eine
  echte spätere Löschung wäre eine eigene Aufbewahrungsregel und nicht
  Sache dieser Oberfläche.
- Durchsuchbar nach **Vorgangsnummer, Mitarbeiter, Thema und
  Zeitraum**. Der Zeitraum greift auf das Abschlussdatum, ersatzweise
  auf den Eingang.
- **Abschlussdatum und vorgesehenes Archivdatum** stehen im Vorgang.
- Eine **Wiedereröffnung verlangt einen Grund**, setzt Abschluss- und
  Archivdatum zurück und erzeugt einen eigenen Protokolleintrag. Ohne
  Grund geschieht nichts. Der bisherige Abschluss bleibt im Protokoll.

### 21.3 Kein Selbstberechtigungsschalter

Siehe 20.4. Der Schalter ist **ersatzlos entfernt**; an seiner Stelle
steht, wer eine Fähigkeit vergeben darf. Der Prüflauf weist das
Gegenteil nach.

### 21.4 Die Planung erreicht jeden Tag

Statt „heute / morgen" gibt es **Zurück, Heute, Morgen, Vor und ein
freies Datumsfeld**. Für einen Tag ohne gespeicherten Plan entsteht ein
leerer, bearbeitbarer Plan — sonst ließe sich ein Urlaub in drei Wochen
gar nicht nachsehen.

Dabei wurde ein Zeitzonenfehler gefunden und behoben: `alsIso()` ging
über `toISOString()` und machte aus lokaler Mitternacht den Vortag.
Aufgefallen wäre das erst nachts bei der Planung einer Nachtschicht.

### 21.5 Der Kalender

Ein neuer Bereich `probe-kalender.js` mit **Tag-, Wochen- und
Monatssicht**, freier Datumswahl, Heute und Blättern. Ein Klick auf
einen Tag öffnet dessen Tagesansicht; von dort führt jeder Eintrag in
den Bereich, der ihn verantwortet.

Der Kalender **ändert nichts**:

- Er liest den **gespeicherten** Plan, nicht den Tagesentwurf der
  Planung. Blättern im Kalender schaltet den Entwurf nicht um — sonst
  verlöre die Planung beim bloßen Nachsehen ihre offenen Eingaben. Der
  Prüflauf weist das eigens nach.
- Die Filter sind **reine Anzeigefilter**. Das ist auch ausgeschrieben.

Der Inhalt hängt an Fähigkeiten, nicht an ausgeblendeten Knöpfen:

| Inhalt | braucht |
|---|---|
| Fahrten | `operations.read` |
| Schichten | `operations.read` |
| Abwesenheiten | `operations.read` oder `personnel.read` |
| Fahrzeugtermine (TÜV, Service, Versicherung) | `fleet.read` |
| Dokumentfristen | `personnel.read` |

**Im Kalender steht nie eine Diagnose, eine Bescheinigung oder eine
sonstige medizinische Angabe** — nur „Krank" als Tatsache der
Einsatzplanung, und das auch nur für Rollen, die den Einsatz planen.
Die Buchhaltung bekommt den Kalender gar nicht erst angeboten.

### 21.6 Administration als übergeordnete Berechtigung

Die Administration darf auch Aufgaben des Personals bearbeiten. Dabei
gilt:

- **Sie handelt immer als sie selbst.** Protokolliert werden Konto,
  unveränderliche Kennung, Rolle, Datum und Uhrzeit — zum Beispiel
  „Testleitung 01 – Administration". Nie nur „bearbeitet von Admin",
  und **nie unter fremdem Namen**.
- **Bereits zugewiesene oder begonnene Aufgaben müssen ausdrücklich
  übernommen werden.** Die Übernahme einer begonnenen oder
  vertraulichen Aufgabe **verlangt einen Grund**.
- **Die bisherige Bearbeitung bleibt sichtbar.** „Aktuell
  verantwortlich" und „zuletzt bearbeitet" sind zwei getrennte Felder.
  Personal sieht, wer übernommen hat.
- Wer **mehrere** Teilschritte bearbeiten darf — und das ist bei der
  Administration der Regelfall — bekommt **keine mehrdeutige
  Hauptaktion**, sondern je einen Knopf am Teilschritt. Sie muss sagen,
  welchen Schritt sie meint.

Alle Konten der Probe sind Testpersonen: `Testleitung 01`,
`Testdisposition 01`, `Testpersonal 01`, `Testbuchhaltung 01`,
`Testmitarbeiter 01`. **Keine echten Namen.**

### 21.7 Was dabei zu korrigieren war

1. **Der Fall `vg-weitergeben` war beim Umbau mit herausgefallen** —
   ein früherer Zeilenersatz hatte ihn mitgenommen. Gefunden, weil das
   Änderungsskript „FEHLT" meldete, nicht weil ein Test fehlschlug.
2. **Die Übernahme durch die Administration griff auf den falschen
   Teilschritt.** `meinTeil()` liefert den *ersten* erlaubten Teil; die
   Administration darf beide. Das war keine Testschwäche, sondern eine
   echte Lücke im Entwurf — behoben durch Aktionen, die den
   Teilschritt ausdrücklich benennen.
3. **Der Kalender hätte den Tagesentwurf der Planung umgeschaltet**,
   weil `planEntwurf()` auf `zustand.planDatum` arbeitet. Er liest
   jetzt `D.planung[tag]` direkt.

### 21.8 Zwei Befunde aus dem Gegenlauf

Die vollständigen Läufe der schon freigegebenen Bereiche haben zwei
Folgen dieser Arbeit aufgedeckt, die im neuen Prüflauf nicht auffielen:

1. **Ein echter Darstellungsfehler.** Das neue Datumsfeld `.tagfeld input`
   stand auf 14 px. Unter 16 px zoomt iOS beim Hineintippen in das Feld
   und verschiebt die ganze Ansicht. Gefunden von
   `probe-planung-pruefen` und `probe-team-pruefen`, die jede
   Eingabefläche nachmessen — **nicht** vom neuen Lauf, der auf die
   Fachlogik sah. Behoben auf 16 px.
2. **Zwei Zählungen, die nachzuziehen waren.** `probe-portal-pruefen`
   prüfte „Disposition sieht fünf Bereiche" und „Administration sieht
   elf". Mit dem Kalender sind es sechs und zwölf. Das ist **kein
   Fehler, sondern die Folge einer gewollten Änderung** — die beiden
   Zusicherungen wurden angepasst und die Änderung hier benannt, statt
   sie stillschweigend zu verschieben.

3. **Ein umbenanntes Bedienelement.** Der alte Tagesumschalter hieß
   `plan-tag:0` / `plan-tag:1`. Mit der freien Tageswahl heißt er
   `plan-heute` / `plan-morgen`. Sechs Stellen in
   `probe-planung-pruefen` und `probe-portal-pruefen` zeigten noch auf den
   alten Namen und liefen dort in eine Zeitüberschreitung — die Läufe
   brachen **ab**, ohne eine Zusammenfassung zu drucken. Ein Lauf, der
   keine Bilanz ausgibt, ist kein bestandener Lauf; das ist der
   Unterschied zwischen `code=1` mit Befund und `code=1` mit Absturz.

### 21.9 Prüfstand

| Prüflauf | Ergebnis |
|---|---|
| `probe-teilung-pruefen` (10 Blöcke, neu) | **97 bestanden, 0 offen** |
| `probe-vorgaenge-pruefen` | 137 bestanden, 0 offen |
| `probe-team-pruefen` | 197 bestanden, 0 offen |
| `probe-planung-pruefen` | 171 bestanden, 0 offen |
| `probe-fahrt-pruefen` | 168 bestanden, 0 offen |
| `probe-portal-pruefen` | 107 bestanden, 0 offen |

Zusammen **877 Zusicherungen, 0 offen**. Alle sechs Läufe vollständig
beendet — jeder mit einer gedruckten Bilanz, keiner abgebrochen.
**Null Netzwerkaufrufe** in jedem Lauf.

> **Einordnung unverändert:** Designprobe ohne Datenquelle, ohne Upload,
> ohne Versand. Diese Läufe sagen **nichts** über die produktive
> Instanz. Was hier „bestanden" heißt, ist eine Aussage über die
> Oberfläche der Probe — nicht über RLS, nicht über Storage, nicht über
> echte Rollen.

---

## 22. Dokumentprüfung ohne Dokument — ein Befund des manuellen Tests

**Der Befund (Nutzer, 01.10.2026).** Als Personal die Krankmeldung
übernommen. Die eingereichte Bescheinigung ließ sich nirgends öffnen
oder ansehen. Sichtbar waren nur „Dokumentprüfung abgeschlossen" und
darunter „Weitergeben". **Damit ließ sich eine Dokumentprüfung
abschließen, ohne das Dokument geprüft zu haben.**

### 22.1 Was tatsächlich los war

Der Bescheinigungsblock war vorhanden — er stand nur **unter** dem
Teilschrittblock mit der Abschlussaktion. Wer nicht weiterscrollte,
sah den Abschlussknopf und sonst nichts. Dazu kam: Der einzige Knopf
hieß „Datei sicher prüfen" und erzeugte lediglich eine Quittung — es
gab **keine Einsicht**, und es gab **kein Prüfergebnis**. Die
Oberfläche nannte den Schritt „Prüfung", ohne dass irgendetwas zu
prüfen gewesen wäre.

Das ist nicht in erster Linie ein Darstellungsfehler. Eine Aktion,
die „abgeschlossen" sagt, ohne dass die Handlung möglich war, ist
eine **Scheinprüfung** — und im Protokoll stünde anschließend, die
Prüfung habe stattgefunden.

### 22.2 Die Änderung

**Reihenfolge.** Im Vorgangsdialog steht jetzt erst der Inhalt, dann
die Handlung: Zusammenfassung → Krankmeldung → Bescheinigung →
Teilschritte. Der Prüflauf vergleicht die Stellung der beiden Blöcke
und besteht nur, wenn die Bescheinigung vorne steht.

**Drei benannte Schritte.** Der Bescheinigungsblock führt eine
sichtbare Kette:

| Schritt | Was geschieht | Was festgehalten wird |
|---|---|---|
| 1. Bescheinigung ansehen | Dateiname ist anklickbar, öffnet die sichere Vorschau | Konto, Kennung, Rolle, Datum, Uhrzeit |
| 2. Prüfergebnis festhalten | vier fest benannte Ergebnisse | das gewählte Ergebnis |
| 3. Teilschritt abschließen | erst jetzt verfügbar | wie bisher |

**Die Sperre.** Ohne Einsicht **und** Ergebnis gibt es keinen
Abschluss — weder am Teilschritt noch in der Fußzeile. Die Aktion
wird **sichtbar gesperrt, nicht versteckt**, mit ausgeschriebenem
Grund: „Die Bescheinigung wurde noch nicht geöffnet. Erst ansehen,
dann bewerten, dann abschließen."

Ein gesperrter Knopf ist Bequemlichkeit, kein Schutz. Die Bedingung
steht deshalb **auch in der Aktion selbst**; der Prüflauf ruft
`vg-teil-erledigen`, `vg-erledigen` und `vg-ergebnis` unter Umgehung
der Oberfläche direkt auf und weist nach, dass nichts geschieht.

**Die vier Ergebnisse** sind eine feste Liste, kein Freitextfeld:
gültig und Zeitraum stimmt · Zeitraum weicht ab · nicht lesbar oder
unvollständig · falsche Person oder falscher Vorgang. Ein freies Feld
würde früher oder später eine Diagnose aufnehmen. **Keines dieser
Ergebnisse nennt einen medizinischen Grund.**

### 22.3 Die Vorschau

Sie zeigt Dateiname, Mitarbeiter, gemeldeten Zeitraum, Eingang und
wer gerade hineinsieht — und einen deutlich als **Platzhalter**
bezeichneten Anzeigebereich.

Was dort ausdrücklich steht: In dieser Designprobe gibt es **keine
Datei**, und die echte Supabase-Storage-API ist hier **nicht
verfügbar**. Gezeigt wird der Rahmen der Anzeige, nicht ein geprüftes
Verhalten der Storage-API. Im Portal wäre es eine kurz gültige,
signierte Adresse — kein Herunterladen auf Vorrat, kein Anhang per
E-Mail, keine öffentliche Adresse.

**Der Inhalt der Bescheinigung wird nicht abgetippt und nirgends
gespeichert.** Festgehalten wird allein, *dass* geöffnet wurde.

Das bloße Öffnen des Dialogs gilt noch nicht als Einsicht; es braucht
die ausdrückliche Bestätigung. Escape bricht ab, ohne etwas zu
vermerken — der Prüflauf weist beides nach.

### 22.4 Was sich für die Disposition nicht ändert

Sie sieht **weder Datei noch Dateiname**, keinen Anzeigebereich,
keine Prüfkette und keinen Knopf dafür. Auch der direkte Aufruf von
`vg-bescheinigung` und `vg-einsicht-ja` bewirkt bei ihr nichts. Ihr
eigener Teilschritt „Planung" bleibt unberührt — dort gibt es nichts
anzusehen, also auch nichts zu sperren.

Die Administration sieht die Prüfkette, **muss aber ebenfalls erst
ansehen und bewerten**, bevor sie die Personalprüfung abschließen
kann. Eine übergeordnete Berechtigung ist kein Freibrief, einen
Schritt zu überspringen.

### 22.5 Was ich damals bewusst NICHT entschieden habe

> **Nachtrag 01.10.2026:** Die hier offenen Fragen zur Folge eines
> auffälligen Prüfergebnisses sind inzwischen vom Geschäftsführer
> entschieden. Siehe Abschnitt 23. Offen bleibt allein die
> Aufbewahrung.

Was betrieblich folgen soll, wenn das Ergebnis „Zeitraum weicht ab"
oder „nicht lesbar" lautet — ob der Teilschritt dann überhaupt
abgeschlossen werden darf, ob automatisch eine Rückfrage entsteht, ob
eine neue Bescheinigung angefordert wird —, ist eine
**Geschäftsregel**. Ich habe sie nicht erfunden. Derzeit gilt: Jedes
der vier Ergebnisse erlaubt den Abschluss, und das Ergebnis steht im
Protokoll. **Das ist eine offene Frage an den Geschäftsführer, keine
Festlegung.**

Ebenso offen: die Aufbewahrungsfrist für Bescheinigungen und ob ein
Prüfergebnis nach dem Abschluss noch änderbar sein soll.

### 22.6 Ein eigener Fehler im Prüflauf — zum vierten Mal derselbe

Die Prüfung „keine Diagnose in der Vorschau" suchte nach dem **Wort**
„Diagnose". Getroffen hat sie den Satz, der eine Diagnose
**ausschließt**: „Keine Diagnose, kein Krankheitsgrund, kein
Dokumentinhalt."

Das ist in dieser Sitzung der **vierte Fehlalarm derselben Art**. Eine
Zusicherung im Text sieht für eine Textsuche aus wie ein Verstoß.
Behoben wie zuvor, und diesmal in zwei getrennte Prüfungen zerlegt:

1. Die Zusicherung **muss** dastehen.
2. Es darf **kein Beschriftungsfeld** (`<dt>`) geben, das eine Diagnose,
   einen Krankheitsgrund, einen Befund oder ein Attest aufnehmen
   würde.

Die zweite Form ist die belastbare: Sie prüft die **Struktur**, nicht
den Fließtext. Dass mir derselbe Fehler viermal unterläuft, gehört
hierher und nicht in eine Fußnote.

### 22.7 Prüfstand nach der Korrektur

| Prüflauf | Ergebnis |
|---|---|
| `probe-dokument-pruefen` (9 Blöcke, neu) | **90 bestanden, 0 offen** |
| `probe-teilung-pruefen` | 99 bestanden, 0 offen |
| `probe-vorgaenge-pruefen` | 137 bestanden, 0 offen |
| `probe-team-pruefen` | 197 bestanden, 0 offen |
| `probe-planung-pruefen` | 171 bestanden, 0 offen |
| `probe-fahrt-pruefen` | 168 bestanden, 0 offen |
| `probe-portal-pruefen` | 107 bestanden, 0 offen |

Zusammen **969 Zusicherungen, 0 offen**, null Netzwerkaufrufe.

Der Planungslauf brach im Reihendurchlauf einmal an `page.goto` ab —
eine Zeitüberschreitung beim Start des Browsers, keine Zusicherung.
Einzeln ausgeführt: 171 / 0. Auch das steht hier, statt es
wegzulassen.

> **Was dieser Lauf NICHT zeigt:** Es gibt in der Probe keine Datei
> und keine Storage-API. Belegt ist die Reihenfolge der Bedienung und
> dass die Sperren auch beim direkten Aufruf der Aktionen greifen.
> **Ob die echte Supabase-Storage-API eine Bescheinigung richtig
> schützt oder ausliefert, ist damit unverändert ungeprüft.**

### 22.8 Zwei weitere Befunde aus den Gegenläufen

**1. Eine zu kleine Bedienfläche — echter Fehler.** Der anklickbare
Dateiname sah aus wie ein Verweis im Fließtext und war damit unter
36 px hoch. Ein Verweis, der wie Text aussieht, muss trotzdem mit dem
Finger zu treffen sein. Gefunden von `probe-vorgaenge-pruefen` bei
allen vier Breiten. Behoben mit `min-height: 36px` und Innenabstand.

**2. Ein flatternder Prüflauf — mein Fehler, nicht der der
Oberfläche.** `probe-planung-pruefen` meldete zweimal, „15:30" sei als
„30" im Feld gelandet. **Einzeln ausgeführt lief derselbe Prüflauf
mit 171 / 0 durch.**

Die Ursache: Das Zeitfeld markiert beim Hineinspringen seinen ganzen
Inhalt, aber erst im nächsten Frame (`requestAnimationFrame`).
Tippt der Prüflauf sofort los, fällt dieses `select()` zwischen zwei
Anschläge, und die nächste Ziffer ersetzt das schon Getippte. Unter
Last — sieben Browserläufe hintereinander — wurde das Zeitfenster
groß genug.

**Das ist kein Fehler der Oberfläche.** Ein Mensch tippt nicht
innerhalb eines Frames nach dem Hineinspringen. Es war ein Fehler
dieses Prüflaufs. Behoben, indem der Frame abgewartet wird — **nicht**,
indem die Zusicherung weicher gemacht wird.

Festgehalten, weil ein flatternder Prüflauf schlimmer ist als keiner:
Er gewöhnt daran, Rot zu übersehen. Eine Zusicherung, die mal
besteht und mal nicht, sagt nichts aus — bis geklärt ist, woran es
liegt.

---

## 23. Die Geschäftsregel zur Dokumentprüfung

Vorgabe des Geschäftsführers vom 01.10.2026, sieben Punkte. **Keine
Annahme der Designprobe** — und deshalb auch der einzige Ort, an dem
in diesem Bereich eine Fachregel steht.

Umgesetzt ausschließlich in der Designprobe: keine Migration, keine
Supabase-Datenänderung, kein Push, Merge oder Deployment.

### 23.1 Die drei Ergebnisse und ihre Folge

| Prüfergebnis | Teilschritt | Was automatisch entsteht | Abschluss erlaubt |
|---|---|---|---|
| **Alles in Ordnung** | darf geschlossen werden | — | sofort |
| **Zeitraum weicht ab** | bleibt offen | Rückfrage mit dem abweichenden Zeitraum | erst nach der Klärung |
| **Nicht lesbar oder unvollständig** | bleibt offen | Anforderung einer neuen Bescheinigung | erst nach Eingang **und** Prüfung der neuen Datei |

Jede Auswahlkarte nennt ihre Folge, **bevor** sie gedrückt wird. Wer
„Zeitraum weicht ab" wählt, weiß vorher, dass daraus eine Rückfrage
entsteht.

**Ein vierter Fall ist entfallen.** „Falsche Person oder falscher
Vorgang" stand zwischenzeitlich zur Auswahl. Für ihn liegt **keine
Regel** vor, und eine erfundene Folge wäre schlimmer als eine
fehlende Auswahl. Das ist eine **offene Frage**, keine Festlegung —
falls dieser Fall vorkommt, braucht er eine eigene Entscheidung.

### 23.2 Eine Kette von Nachweisen statt einer Datei

Aus `daten.datei` ist `daten.nachweise` geworden — eine Liste. Jeder
Eintrag hat:

| Feld | Bedeutung |
|---|---|
| `nr` | fortlaufende Nummer, 1, 2, 3 … |
| `art` | Erstbescheinigung, Folgebescheinigung, Ersatz nach Beanstandung |
| `eingang` | eigene Eingangszeit |
| `einsicht` | wer hat sie wann geöffnet (Konto, Kennung, Rolle, Datum, Uhrzeit) |
| `ergebnis` | das festgehaltene Prüfergebnis |
| `gesperrt` | Ergebnis festgehalten, nicht mehr überschreibbar |
| `beanstandet` | als nicht lesbar beanstandet, bleibt erhalten |

**Geprüft wird immer der letzte Eintrag.** Daraus folgt der dritte
Fall von selbst: Geht eine neue Datei ein, ist sie der letzte
Eintrag, hat noch keine Einsicht — und die Prüfung beginnt bei
Schritt 1. Das musste nicht eigens programmiert werden.

**Nichts wird überschrieben.** Die beanstandete Datei behält Nummer,
Eingangszeit, Art, Einsicht und Ergebnis und bleibt mit dem Vermerk
„beanstandet, bleibt erhalten" in der Liste stehen. Beide hängen am
selben Krankheitsvorgang.

Die **Folgebescheinigung** (längere Krankheit) läuft über dieselbe
Kette: Sie ist eine eigene Datei und bekommt deshalb ihre eigene
Prüfung. Die frühere getrennte Liste `daten.folge` ist entfallen —
zwei Listen für dasselbe wären zwei Wahrheiten gewesen.

### 23.3 Korrekturen

Ein festgehaltenes Ergebnis ist **gesperrt**. Es gibt kein „Ergebnis
ändern" mehr, und der direkte Aufruf von `vg-ergebnis` auf einen
gesperrten Nachweis bewirkt nichts.

Eine Korrektur läuft über `vg-pruefkorrektur`:

1. Pflichtgrund — ohne ihn entsteht **nichts**, auch kein Vorgang.
2. Es entsteht ein **eigener Vorgang**, der auf den ursprünglichen
   verweist (`bezugAuf`). Dort beginnt die Prüfung von vorn.
3. Das alte Ergebnis bleibt unverändert stehen.

Protokolliert werden **wer** (Konto, unveränderliche Kennung, Rolle),
**wann** (Datum, Uhrzeit), **betroffener Vorgang**, **vorheriger
Zustand**, **neuer Zustand** und der **Grund**. Der Eintrag ist
eingefroren.

**Kein medizinischer Freitext.** Der Grund ist ein Freitextfeld für
die Begründung der Korrektur; der Dialog schreibt ausdrücklich dazu,
was dort nicht hineingehört. Das Prüfergebnis selbst ist **kein**
Freitext, sondern eine der drei festen Angaben — ein freies Feld
würde früher oder später eine Diagnose aufnehmen.

### 23.4 Rollen

Für die **Disposition** ändert sich nichts: kein Dateiname, keine
Nachweisliste, keine Prüfkette, kein Prüfergebnis, keine Vorschau,
kein Knopf dafür. Der Prüflauf ruft alle sechs Aktionen
(`vg-bescheinigung`, `vg-einsicht-ja`, `vg-ergebnis`,
`vg-neue-bescheinigung`, `vg-klaerung-ja`, `vg-pruefkorrektur`) unter
Umgehung der Oberfläche direkt auf und weist nach, dass bei ihr
nichts geschieht.

**Personal und Administration** müssen die Datei tatsächlich öffnen,
die Einsicht bestätigen und ein zulässiges Ergebnis wählen. **Die
Administration darf diese Prüfung nicht überspringen** — eine
übergeordnete Berechtigung ist kein Freibrief. Sie handelt dabei
unter eigenem Namen.

### 23.5 Aufbewahrung — offene rechtliche Entscheidung

**Es ist bewusst KEINE automatische Lösch- oder Aufbewahrungsfrist
festgelegt.** Kein Code entfernt einen Nachweis aus der Kette; es
gibt kein Feld für eine Frist und keine Logik, die eine prüfen
würde. Der Prüflauf sucht im Quelltext danach und besteht nur, wenn
nichts davon da ist. Auch nach dem Abschluss der Personalprüfung
bleiben alle Nachweise mit ihren Ergebnissen erhalten.

**Wie lange eine Arbeitsunfähigkeitsbescheinigung aufbewahrt werden
darf und ab wann sie gelöscht werden muss, ist eine offene
rechtliche Entscheidung.** Sie berührt Aufbewahrungspflichten,
Datenminimierung und Löschpflichten bei Gesundheitsdaten. Das ist
nichts, was aus der Oberfläche abgeleitet werden kann, und nichts,
was ich festlege.

Bis diese Entscheidung vorliegt, **wächst die Kette und wird nichts
gelöscht**. Das ist die vorsichtige Richtung: Eine zu lange
aufbewahrte Datei lässt sich später löschen, eine zu früh gelöschte
nicht zurückholen. Es ist aber ausdrücklich **kein Dauerzustand**.

### 23.6 Was dieser Stand NICHT belegt

Es gibt in der Probe **keine Datei und keine Storage-API**. Belegt
ist, dass die Geschäftsregel in der Oberfläche **und in den Aktionen**
durchgesetzt wird — nicht, dass eine echte Bescheinigung geschützt
oder richtig ausgeliefert würde. Der Übergang auf echte Dateien ist
ein eigener Schritt mit eigener Prüfung.

### 23.7 Was beim Umsetzen schiefging

**Ein echter Fehler in der Regel selbst.** Nach dem Klären der
Rückfrage blieb der Abschluss gesperrt — die Sperre fragte nur das
Ergebnis ab („verlangt eine Folge, also zu") und nicht, ob diese
Folge inzwischen erledigt ist. Damit war Regel 2 genau in ihrer
zweiten Hälfte („erst nach der Klärung") nicht umgesetzt. Gefunden
beim Durchspielen von Hand, **bevor** der Prüflauf stand. Behoben:
Die Sperre sucht jetzt die Klärung, die zu diesem Nachweis gehört,
und gibt frei, sobald sie erledigt ist. Fehlt eine Klärung ganz,
bleibt gesperrt — der Fall dürfte nicht vorkommen und wird im
Zweifel als Sperre behandelt, nicht als Freigabe.

**Zwei Stellen in bestehenden Prüfläufen**, beide Folge der
Umstellung, nicht Fehler:

1. `probe-vorgaenge-pruefen` zählte `daten.folge.length === 1`. Die
   Folgebescheinigung steht jetzt in derselben Kette wie die
   Erstbescheinigung, also sind es zwei Nachweise. Angepasst.
2. Dieselbe Prüfung suchte `/signierte Adresse/` im rohen Text. Der
   Satz bricht im Quelltext um, und eine rohe Textsuche sieht dann
   einen fehlenden Satz. Behoben durch Glätten der Leerzeichen — die
   gleiche Falle wie beim Diagnose-Fehlalarm, nur andersherum.


bedeutet und aus `$eval` ein `$eval` machte.

Die Lehre ist nicht „sorgfältiger sein", sondern: Solche Zeichen
gehören nicht durch zwei Ersetzungsschichten. Skripte werden als
Datei geschrieben und mit `node datei.mjs` ausgeführt, und
Sonderzeichen werden aus `String.fromCharCode` zusammengesetzt statt
wörtlich eingetippt.

### 23.8 Prüfstand

| Prüflauf | Ergebnis |
|---|---|
| `probe-regeln-pruefen` (9 Blöcke, neu) | **121 bestanden, 0 offen** |
| `probe-dokument-pruefen` | 91 bestanden, 0 offen |
| `probe-teilung-pruefen` | 99 bestanden, 0 offen |
| `probe-vorgaenge-pruefen` | 137 bestanden, 0 offen |
| `probe-team-pruefen` | 197 bestanden, 0 offen |
| `probe-planung-pruefen` | 171 bestanden, 0 offen |
| `probe-fahrt-pruefen` | 168 bestanden, 0 offen |
| `probe-portal-pruefen` | 107 bestanden, 0 offen |

Zusammen **1091 Zusicherungen, 0 offen**, null Netzwerkaufrufe. Alle
acht Läufe vollständig beendet, jeder mit gedruckter Bilanz.

Der neue Lauf prüft jede der sieben Regeln einzeln und ruft dabei
jede Aktion auch **unter Umgehung der Oberfläche** direkt auf. Ein
gesperrter Knopf ist Bequemlichkeit; die Regel muss in der Aktion
stehen.

> **Einordnung:** Designprobe ohne Datenquelle, ohne Datei, ohne
> Storage-API. Belegt ist, dass die Geschäftsregel in Oberfläche und
> Aktionen durchgesetzt wird — **nicht**, dass eine echte
> Bescheinigung geschützt oder richtig ausgeliefert würde.

---

## 24. Der vierte Prüffall: falsche Person oder falscher Vorgang

Vorgabe des Geschäftsführers vom 01.10.2026. Umgesetzt ausschließlich
in der Designprobe: keine Migration, keine Supabase-Datenänderung,
kein Push, Merge oder Deployment.

Dies ist der aufwendigste der vier Fälle, weil hier ein
**Gesundheitsdokument von einer Person zu einer anderen wandert**.
Entsprechend ist nichts davon ein einziger Klick.

### 24.1 Was beim Festhalten des Ergebnisses passiert

| | |
|---|---|
| Personalprüfung | **bleibt offen** |
| Der Nachweis | wird als **„Zuordnung ungeklärt"** markiert und gesperrt |
| Verwendung | er gilt **nicht** als geprüft oder gültig |
| Es entsteht | eine **Klärungsaufgabe** für Personal oder Administration |
| Die Datei | wird **nicht gelöscht** und **nicht von selbst** umgehängt |

Die Sperre sitzt in `pruefungOffen()` und greift deshalb auch, wenn
die Aktion direkt aufgerufen wird. Der Prüflauf ruft
`vg-teil-erledigen` und `vg-erledigen` unter Umgehung der
Oberfläche auf und weist nach, dass nichts geschieht.

### 24.2 Die Neuzuordnung — erste Fassung, drei Stufen

> **Überholt am 01.10.2026.** Diese Fassung ließ nur eine *andere*
> Person wählen und schloss die bisherige aus. Damit war die zweite
> Hälfte des Falls — *falscher Vorgang* bei richtiger Person — gar
> nicht abbildbar. Siehe Abschnitt 25. Der Abschnitt bleibt stehen,
> damit nachvollziehbar ist, was geändert wurde.

**Nur Personal und Administration** sehen die Knöpfe dafür, und nur
sie kommen durch die Aktionen (`R.darf("personnel.read")` in jeder
einzelnen).

| Stufe | Was zu sehen ist | Was gespeichert wird |
|---|---|---|
| **1. Wahl** | Nachweis, bisherige Zuordnung, Auswahl der Person (die bisherige ist nicht darunter) | nichts |
| **2. Prüfen** | bisherige Zuordnung, neue Zuordnung, handelnde Person, **Pflichtgrund** | nichts |
| **Verbindlich speichern** | — | die Neuzuordnung |

Auf Stufe 1 gibt es **kein** „Verbindlich speichern". Ohne Auswahl
führt „Weiter" nicht weiter, ohne Grund speichert „Verbindlich
speichern" nichts — kein Vorgang, keine Zuordnung. „Zurück" führt
nach Stufe 1, Escape bricht wirkungslos ab.

### 24.3 Was mit der Datei geschieht — und was nicht

Die Datei wird **nicht verschoben und nicht gelöscht**. Stattdessen
ist der Weg von beiden Seiten lesbar:

- Der **alte Eintrag bleibt stehen**, mit Nummer, Eingangszeit,
  Einsicht, Ergebnis und dem Vermerk „Neu zugeordnet zu Vorgang … ·
  bleibt hier als Spur erhalten". Er ist dort **nicht mehr anklickbar**
  und taugt nicht als Nachweis.
- Der **Zielvorgang** bekommt einen Eintrag mit demselben Dateinamen
  und derselben Eingangszeit, dem Vermerk „Aus Vorgang … neu
  zugeordnet" — und **ohne Einsicht und ohne Ergebnis**.

Das ist eine bewusste Modellierung: In einem echten System gibt es
**eine** Datei im Speicher, und nur die Verknüpfung wandert. Der
Spur-Eintrag ist die Verknüpfung, die bleibt, damit der alte Vorgang
nachvollziehbar bleibt.

Der Zielvorgang ist ein offener Krankheitsvorgang dieser Person,
sonst wird einer angelegt, der auf den alten verweist.

### 24.4 Dort beginnt die Prüfung bei Schritt 1

Im Zielvorgang steht „1. Bescheinigung ansehen — Noch nicht
geöffnet". **Die Einsicht aus dem falschen Vorgang zählt dort nicht.**
Ohne Einsicht gibt es kein Ergebnis zu wählen, ohne Ergebnis keinen
Abschluss — auch nicht per direktem Aufruf.

**Hier lag ein echtes Loch, gefunden beim Durchspielen von Hand:**
Die neu angelegten Vorgänge hatten **keine Teilschritte** und damit
auch keine Prüfsperre. Ihr Abschluss wäre ohne Einsicht und ohne
Ergebnis möglich gewesen — die ganze Regel hätte sich durch eine
Neuzuordnung umgehen lassen. Dasselbe galt für die beiden
Korrekturwege aus Abschnitt 23, die vorher schon Vorgänge anlegten.

Behoben mit einer **Fabrik** `D.krankheitsTeile()`: Die Teilschritte
eines Krankheitsvorgangs stehen jetzt an einer Stelle, und alle drei
Anlegestellen benutzen sie. Eine Fabrik, nicht ein gemeinsames
Objekt — jeder Vorgang braucht seine eigenen Zustände, ein geteiltes
Objekt wäre eine zweite Wahrheit gewesen.

Zweiter Befund derselben Art: Die neuen Vorgänge waren mit
`sichtbar: ["operations.read"]` angelegt, und Personal hat diese
Fähigkeit nicht — der eigene Zielvorgang war für Personal gar nicht
sichtbar. Jetzt `["operations.read", "personnel.read"]`, wie beim
festen Krankheitsvorgang.

### 24.5 Wenn sich die Zuordnung nicht klären lässt

„Zuordnung lässt sich nicht klären" verlangt ebenfalls einen
Pflichtgrund und ändert dann **nichts**: Der Nachweis bleibt
markiert und gesperrt, die Klärungsaufgabe bleibt offen, der Vorgang
bleibt offen, es entsteht kein neuer Vorgang, nichts wird gelöscht.

Festgehalten wird es trotzdem — damit später niemand raten muss,
warum hier nichts weitergeht.

### 24.6 Protokoll und Rollen

Protokolliert werden bei der Neuzuordnung: **ursprüngliche Zuordnung**
(Person und Vorgang), **neue Zuordnung** (Person und Vorgang),
**handelnde Person**, **unveränderliche Kennung**, **Rolle**,
**Datum**, **Uhrzeit** und der **Grund**. Der Eintrag ist
eingefroren. Keine Diagnose, kein medizinischer Freitext.

Die **Disposition** sieht weder Dateiname noch Datei noch
Nachweisliste, keine Prüfkette, keine Markierung „Zuordnung
ungeklärt" und keinen Knopf zur Neuzuordnung. Alle fünf Aktionen
bewirken bei ihr auch beim direkten Aufruf nichts — und löschen
insbesondere nichts.

### 24.7 Was dieser Stand NICHT belegt

Es gibt in der Probe **keine Datei und keine Storage-API**. Belegt
ist, dass die Regel in Oberfläche **und** Aktionen durchgesetzt wird
— nicht, dass eine echte Bescheinigung beim Umhängen zwischen zwei
Personen geschützt bliebe. Genau dieser Fall — ein Gesundheitsdokument
wechselt den Betroffenen — ist beim Übergang auf echte Dateien und
echte RLS-Regeln eigens zu prüfen.

Die **Aufbewahrung** bleibt unverändert eine offene rechtliche
Entscheidung (Abschnitt 23.5). Die Neuzuordnung macht sie nicht
einfacher: Der Spur-Eintrag beim alten Vorgang ist ein weiterer
Datenpunkt, dessen Aufbewahrung zu entscheiden ist.

### 24.8 Prüfstand

| Prüflauf | Ergebnis |
|---|---|
| `probe-zuordnung-pruefen` (7 Blöcke, neu) | **115 bestanden, 0 offen** |
| `probe-regeln-pruefen` | 123 bestanden, 0 offen |
| `probe-dokument-pruefen` | 91 bestanden, 0 offen |
| `probe-teilung-pruefen` | 99 bestanden, 0 offen |
| `probe-vorgaenge-pruefen` | 137 bestanden, 0 offen |
| `probe-team-pruefen` | 197 bestanden, 0 offen |
| `probe-planung-pruefen` | 171 bestanden, 0 offen |
| `probe-fahrt-pruefen` | 168 bestanden, 0 offen |
| `probe-portal-pruefen` | 107 bestanden, 0 offen |

Zusammen **1208 Zusicherungen, 0 offen**, null Netzwerkaufrufe. Alle
neun Läufe vollständig beendet, jeder mit gedruckter Bilanz.

**Zwei Zusicherungen waren nachzuziehen, keine Fehler:**
`probe-regeln-pruefen` und `probe-dokument-pruefen` sicherten „genau
drei Ergebnisse" zu. Mit dem vierten Fall sind es vier. Die Änderung
ist gewollt, die Zusicherungen sind angepasst und die Anpassung steht
hier — statt sie stillschweigend zu verschieben.

> **Einordnung:** Designprobe ohne Datenquelle, ohne Datei, ohne
> Storage-API. Belegt ist, dass die Regel in Oberfläche und Aktionen
> durchgesetzt wird — **nicht**, dass eine echte Bescheinigung beim
> Umhängen zwischen zwei Personen geschützt bliebe.

---

## 25. Die Neuzuordnung richtet sich auf den Zielvorgang

**Der Befund (Nutzer, 01.10.2026).** Der Fall heißt „Falsche Person
**oder** falscher Vorgang", aber die Neuzuordnung wählte nur eine
andere Person und schloss die bisherige aus. **Eine Bescheinigung
ließ sich nicht einem anderen Krankheitsvorgang derselben Person
zuordnen.**

Das ist kein Randfall: Wer zweimal im Monat krank war, hat zwei
Vorgänge, und eine Bescheinigung kann am falschen hängen — bei
völlig richtiger Person.

### 25.1 Vier Stufen statt drei

| Stufe | Was gewählt wird | Was gespeichert wird |
|---|---|---|
| **1. Person** | Suche und Auswahl aus dem Mitarbeiterbestand. **Die bisherige Person steht mit zur Wahl** und ist als „bisherige Zuordnung" gekennzeichnet. Keine freie Texteingabe. | nichts |
| **2. Vorgang** | ein Krankheitsvorgang dieser Person — mit Vorgangsnummer, gemeldetem Zeitraum, Zustand und vorhandenen Nachweisen. **Der aktuelle Vorgang ist ausgeschlossen.** | nichts |
| **3. Neu anlegen** | nur wenn kein passender existiert: Zeitraum prüfen und bestätigen | nichts |
| **4. Letzte Prüfung** | beide Seiten, Dateiname, Eingangszeit, Konto, Rolle, **Pflichtgrund** | nichts |
| **Verbindlich speichern** | — | die Neuzuordnung |

„Zurück und ändern" führt **eine Stufe zurück**, nicht aus dem
Vorgang heraus. Wer auf Stufe 1 die Person wechselt, verliert die
Vorgangswahl — sie hing an der alten Person.

### 25.2 Der Zielvorgang wird gezeigt, nicht erraten

Jede Vorgangskarte nennt **Nummer, gemeldeten Zeitraum, Zustand und
die Zahl der bereits vorhandenen Nachweise**. Wer entscheidet, wohin
ein Gesundheitsdokument gehört, soll nicht raten müssen, was dort
schon liegt.

Der **aktuelle Vorgang ist nie Ziel** — weder als Karte noch über
den direkten Aufruf von `vg-zuordnung-vorgang`. Der Prüflauf ruft
ihn mit sich selbst als Ziel auf und weist nach, dass nichts
geschieht.

### 25.3 Einen neuen Vorgang anlegen — ohne Ableitung

Gibt es keinen passenden, wird das Anlegen **ausdrücklich angeboten**,
statt es stillschweigend zu tun. Vorher ist der **Zeitraum zu prüfen**:
Er ist aus dem bisherigen Vorgang übernommen, das steht auch so da,
und er ist änderbar. Ein Ende vor dem Beginn wird abgewiesen.

**Aus dem Inhalt der Bescheinigung wird nichts gelesen und nichts
abgeleitet.** Das Dokument ist in dieser Probe ein Platzhalter; aber
auch im Portal wäre ein aus einem Gesundheitsdokument
herausgelesener Zeitraum eine Behauptung, die niemand geprüft hat.

### 25.4 Beide Fälle, getrennt geprüft

| | Fall A | Fall B |
|---|---|---|
| Person | andere (Testfahrer 05) | **dieselbe** (Testfahrer 02) |
| Zielvorgang | neu angelegt | vorhandener V0008 |
| Neuer Vorgang entsteht | ja, genau einer | **nein** |
| Alter Vorgang | behält die Spur, bleibt offen | behält die Spur, bleibt offen |
| Im Ziel | Nachweis Nr. 1, ungeprüft | Nachweis Nr. 2 neben dem vorhandenen, ungeprüft |

Damit Fall B überhaupt prüfbar ist, gibt es in den Testdaten einen
**zweiten Krankheitsvorgang derselben Person** (`V0008`, frühere
Krankmeldung mit eigenem Nachweis). Er ist kein Beiwerk: Ohne ihn
ließe sich der halbe Fall nicht prüfen.

### 25.5 Nach dem Speichern

- Der alte Vorgang behält **nur die unveränderliche Spur**: Nummer,
  Eingangszeit, Einsicht, Ergebnis und den Verweis auf den
  Zielvorgang. Dort nicht mehr anklickbar, nicht als Nachweis
  verwendbar, und der Vorgang bleibt **offen**.
- Im Zielvorgang beginnt die Prüfung **bei Schritt 1**. Frühere
  Einsicht und früheres Prüfergebnis gelten dort **nicht**.
- **Keine Datei wird gelöscht.**
- Die **Disposition** sieht weiterhin keine Dokumentangaben: kein
  Dateiname, keine Nachweisliste, keine Prüfkette, keine Markierung
  „Zuordnung ungeklärt", keinen Knopf. Der Prüflauf ruft **neun**
  Aktionen direkt auf und weist nach, dass bei ihr nichts geschieht
  und nichts gelöscht wird.

Protokolliert werden bisherige Person **und bisheriger Vorgang**,
neue Person **und neuer Vorgang** (mit dem Hinweis „neu angelegt",
wenn er es war), Konto, unveränderliche Kennung, Rolle, Datum,
Uhrzeit und Grund.

### 25.6 Ein echter Bedienfehler, beim Durchspielen gefunden

Die Mitarbeitersuche wertete erst beim **Verlassen** des Feldes aus
(`change`). Wer tippte und dann direkt auf eine Karte klickte,
löste mit dem Verlassen ein Neuzeichnen aus — die Karte unter dem
Mauszeiger wurde ausgetauscht und **der Klick ging verloren**. Im
Durchspielen sah das aus wie „die Auswahl greift nicht".

Behoben in zwei Teilen: Die Suche filtert jetzt **beim Tippen**
(`input`), und beim Verlassen wird nur noch gezeichnet, wenn sich
der Wert wirklich geändert hat. Der Schreibzeiger bleibt dabei an
seiner Stelle.

Der Prüflauf sichert genau diesen Ablauf: tippen, dann sofort
klicken, dann „Weiter" — und Stufe 2 muss kommen.

### 25.7 Was dieser Stand NICHT belegt

Es gibt in der Probe **keine Datei und keine Storage-API**. Belegt
ist, dass die Regel in Oberfläche **und** Aktionen durchgesetzt wird
— nicht, dass eine echte Bescheinigung beim Umhängen geschützt
bliebe. Dieser Fall ist beim Übergang auf echte Dateien und echte
RLS-Regeln eigens zu prüfen, und er ist der heikelste der vier: Ein
Gesundheitsdokument wechselt den Betroffenen oder den Vorgang.

Die **Aufbewahrung** bleibt eine offene rechtliche Entscheidung
(Abschnitt 23.5).

### 25.8 Prüfstand

| Prüflauf | Ergebnis |
|---|---|
| `probe-zuordnung-pruefen` (8 Blöcke, neu geschrieben) | **125 bestanden, 0 offen** |
| `probe-regeln-pruefen` | 123 bestanden, 0 offen |
| `probe-dokument-pruefen` | 91 bestanden, 0 offen |
| `probe-teilung-pruefen` | 99 bestanden, 0 offen |
| `probe-vorgaenge-pruefen` | 137 bestanden, 0 offen |
| `probe-team-pruefen` | 197 bestanden, 0 offen |
| `probe-planung-pruefen` | 171 bestanden, 0 offen |
| `probe-fahrt-pruefen` | 168 bestanden, 0 offen |
| `probe-portal-pruefen` | 107 bestanden, 0 offen |

Zusammen **1218 Zusicherungen, 0 offen**, null Netzwerkaufrufe. Alle
neun Läufe vollständig beendet, jeder mit gedruckter Bilanz.

Der zweite Krankheitsvorgang in den Testdaten hat **keine** bestehende
Zusicherung verschoben — die Läufe zählen Vorgänge nur relativ
(vorher/nachher), nicht absolut. Das war vor dem Einfügen geprüft.

**Ein eigener Fehler im neuen Prüflauf:** Die Zusicherung suchte
„Übernommen aus Vorgang V0002" mit einem Leerzeichen. `textContent`
setzt zwischen `<dt>` und `<dd>` keines — der Text lautet
„Übernommen ausVorgang V0002". Behoben.

> **Einordnung:** Designprobe ohne Datenquelle, ohne Datei, ohne
> Storage-API. Belegt ist, dass die Regel in Oberfläche und Aktionen
> durchgesetzt wird — **nicht**, dass eine echte Bescheinigung beim
> Umhängen geschützt bliebe.

---

## 26. Ein Knopf, der mehr versprach, als er tat

**Der Befund (Nutzer, 01.10.2026).** Auf der Listenkarte stand ein
goldener Hauptknopf **„Dokumentprüfung abgeschlossen"** — bei einem
neuen Vorgang, beide Teilschritte offen, niemand verantwortlich, die
Bescheinigung nicht geöffnet.

### 26.1 Was daran falsch war

Der Klick selbst war harmlos: `hauptaktion()` hat immer nur
`vg-oeffnen` zurückgegeben, nie eine speichernde Aktion. Es wurde
also nichts abgeschlossen.

**Das macht es nicht besser, sondern schlechter.** Ein goldener
Hauptknopf mit „abgeschlossen" lässt jemanden glauben, er habe etwas
abgeschlossen. Wer ihn in einer Liste von zwölf Karten drückt und
weiterklickt, trägt diesen Glauben mit sich. Die Oberfläche hat
behauptet, was sie nicht tat — und zwar an der Stelle, an der sie am
lautesten spricht.

Die Ursache war eine gut gemeinte Zeile aus Abschnitt 21: Nachdem
der Abschlussknopf nicht mehr „Erledigt" heißen sollte, bekam er den
Namen des eigenen Teilschritts — und diese Benennung landete
versehentlich auch auf der Listenkarte.

### 26.2 Die Änderung

Die Listenkarte beschreibt jetzt nur noch, **was der Klick tut**:

| Thema | Hauptknopf |
|---|---|
| Krankheit | **Krankmeldung prüfen** |
| Urlaub (Aufgabe) | Antrag öffnen |
| Fahrt | Zur Fahrt |
| Dokument | Dokument öffnen |
| alles andere | **Vorgang öffnen** |
| bereits erledigt | Ansehen |

Der Name des Teilschritts kommt dort nicht mehr vor. **Eine
Abschlussbeschriftung erscheint ausschließlich im geöffneten
Vorgang**, am jeweiligen Teilschritt.

Der Prüflauf geht **alle fünf Rollen und alle Reiter** durch, liest
jeden Knopf jeder Karte und besteht nur, wenn keiner davon
„abgeschlossen", „erledigt", „bearbeitet", „gespeichert",
„bestätigt", „genehmigt" oder „verbindlich" enthält. Die Übersicht
und die Glocke werden mitgeprüft.

Gesucht wird nach **behauptetem Abschluss**, nicht nach einzelnen
Wörtern: „Dokument öffnen" und „Krankmeldung prüfen" sagen, was
passieren wird, und sind in Ordnung.

### 26.3 Fünf Voraussetzungen statt vier

Neu dazugekommen ist die **Übernahme** als erste Bedingung. Bisher
konnte jemand einen Teilschritt abschließen, ohne je verantwortlich
gewesen zu sein.

| # | Bedingung | Sperrgrund, wenn sie fehlt |
|---|---|---|
| 1 | Teilschritt übernommen | „Der Teilschritt ist noch niemandem zugewiesen. Bitte zuerst übernehmen." |
| 2 | Bescheinigung geöffnet | „Die Bescheinigung wurde noch nicht geöffnet." |
| 3 | Einsicht bestätigt | (dieselbe — das Öffnen allein zählt nicht) |
| 4 | gültiges Prüfergebnis | „Es liegt noch kein Prüfergebnis vor." |
| 5 | Folgeaufgaben geklärt | „Die Rückfrage zum Zeitraum ist noch nicht geklärt." usw. |

Ist **jemand anderes** verantwortlich, lautet der Grund
„Verantwortlich ist … Übernehmen Sie den Teilschritt, wenn Sie ihn
abschließen wollen." Das gilt **auch für die Administration**: Sie
darf übernehmen — mit Grund —, aber nicht im Vorbeigehen abschließen,
was jemand anderes bearbeitet.

Die Begründung für Bedingung 1: Wer einen Teilschritt abschließt,
trägt die Verantwortung dafür. Dann soll er auch als
Verantwortlicher dastehen und nicht als jemand, der im Vorbeigehen
einen Haken gesetzt hat.

### 26.4 Die Sperre liegt nicht im Knopf

Alle fünf Bedingungen stehen in `teilOffen()`, und `teilOffen()` wird
in der **Aktion** geprüft, nicht nur beim Zeichnen. Der Prüflauf ruft
`vg-teil-erledigen` an jeder der fünf Stationen direkt auf und
weist jedes Mal nach, dass der Teilschritt offen bleibt.

Die Aktion ist **sichtbar gesperrt, nicht versteckt** — mit
ausgeschriebenem Grund darunter. Wer nicht abschließen kann, soll
sehen warum.

### 26.5 Was das für die bestehenden Prüfläufe bedeutete

Vier Läufe schlossen Teilschritte ab, ohne sie vorher zu übernehmen.
Das ging bisher und geht jetzt nicht mehr. Sie übernehmen den
Teilschritt nun vorher — **das ist Teil des Ablaufs, keine
Umgehung**: Genau so läuft es auch für einen Menschen.

Festgehalten, weil die Unterscheidung zählt: Hätte ich stattdessen
die Zusicherungen aufgeweicht, wäre die neue Regel nicht geprüft,
sondern wegdefiniert.

### 26.6 Eine eigene Zusicherung, die zu scharf war

Der neue Lauf prüfte „ein Klick auf die Karte ändert und speichert
nichts" durch Vergleich des **ganzen** Vorgangs. Das schlug fehl —
und zwar zu Recht: Öffnen setzt `gesehen` auf `true`. Das ist gewollt
und steht seit Abschnitt 20.3 so da: **gesehen ist nicht erledigt**,
und die Glocke muss herunterzählen.

Die Zusicherung ist jetzt zweigeteilt:

1. Kein **Fachzustand** ändert sich (Zustand, Teilschritte, Daten,
   Verantwortliche, Abschlussdatum) und **kein Protokolleintrag**
   entsteht.
2. Der Vorgang wird **als gesehen vermerkt** — und das wird eigens
   geprüft, statt es bloß zu dulden.

Das ist der Unterschied zwischen „der Test war falsch" und „der Test
war ungenau". Er war ungenau: Er verbot etwas Richtiges mit.

### 26.7 Prüfstand

| Prüflauf | Ergebnis |
|---|---|
| `probe-karten-pruefen` (6 Blöcke, neu) | **43 bestanden, 0 offen** |
| `probe-zuordnung-pruefen` | 125 bestanden, 0 offen |
| `probe-regeln-pruefen` | 123 bestanden, 0 offen |
| `probe-dokument-pruefen` | 93 bestanden, 0 offen |
| `probe-teilung-pruefen` | 100 bestanden, 0 offen |
| `probe-vorgaenge-pruefen` | 137 bestanden, 0 offen |
| `probe-team-pruefen` | 197 bestanden, 0 offen |
| `probe-planung-pruefen` | 171 bestanden, 0 offen |
| `probe-fahrt-pruefen` | 168 bestanden, 0 offen |
| `probe-portal-pruefen` | 107 bestanden, 0 offen |

Zusammen **1264 Zusicherungen, 0 offen**, null Netzwerkaufrufe. Alle
zehn Läufe vollständig beendet, jeder mit gedruckter Bilanz.

**Neun Zusicherungen in drei Läufen waren nachzuziehen**, alle Folge
der neuen Übernahme-Bedingung:

- Vier Stellen schlossen Teilschritte ohne Übernahme. Sie übernehmen
  jetzt vorher.
- Zwei Stellen prüften den Sperrgrund und bekamen jetzt „noch
  niemandem zugewiesen" statt des fachlichen Grundes — weil die
  Übernahme als erste Bedingung geprüft wird.
- Eine Stelle zählte drei Protokolleinträge; es sind vier, die
  Übernahme kommt dazu.
- Zwei Stellen sicherten zu, die **Planung** sei nicht gesperrt. Sie
  ist es jetzt bis zur Übernahme — braucht aber weiterhin keine
  Dokumentprüfung. Genau dieser Unterschied wird nun geprüft.

Zusammen **1301 Zusicherungen, 0 offen**, null Netzwerkaufrufe. Alle
zehn Läufe vollständig beendet, jeder mit gedruckter Bilanz.

Vier Selektoren waren dabei noch nachzujustieren: Das Umstellen auf
`.dialog-kasten` hatte ich zu weit gefasst. `vg-uebernehmen` und
`vg-weitergeben` sind die **Gesamtaktionen** und liegen auf der
Karte, nicht im Dialog — sie adressieren jetzt ausdrücklich die Karte
(`.vorgang[data-vorgang=…]`). Beides zu genau zu machen ist richtig;
beides pauschal umzustellen war es nicht.

> **Einordnung:** Designprobe ohne Datenquelle. Der Lauf sagt nichts
> über die produktive Instanz.

---

## 27. Zwei Bedienkorrekturen nach der fachlichen Freigabe

Die Krankmeldung ist fachlich geprüft und bestanden. Zwei
Bedienbefunde blieben (Nutzer, 01.10.2026).

### 27.1 Die Dokumentvorschau hatte nur einen Ausgang

**Der Befund.** Beim Öffnen der Bescheinigung gab es nur
„Schließen" — und das verließ den **ganzen Vorgang**. Wer nur kurz
hineinsehen wollte, musste ihn danach neu öffnen.

Das war eine Folge der Bauweise: Die Probe hat **genau eine
Dialogebene** (keine verschachtelten Fenster), und die Vorschau
ersetzt den Vorgangsdialog. „Schließen" schloss darum die Ebene, nicht
die Vorschau.

**Jetzt zwei getrennte Wege:**

| Weg | Wirkung |
|---|---|
| **‹ Zurück zur Krankmeldung** (Kopf und Fuß) | schließt nur die Vorschau; der Vorgang bleibt offen |
| **✕ Vorgang verlassen** (Kopf und Fuß) | verlässt alles — mit Sicherheitsabfrage, wenn die Prüfung unfertig ist |
| **Escape** | wirkt wie „Zurück zur Krankmeldung" |
| **Klick neben das Fenster** | ebenso |

Dass Escape und der Klick daneben **zurückführen** und nicht hinaus,
ist Absicht: Ein versehentliches Escape soll nicht die halbe Arbeit
kosten. Umgesetzt über den vorhandenen `dialogSchutz` des Rahmens —
er gibt `false` zurück und zeichnet stattdessen den Vorgang.

Erhalten bleiben bei der Rückkehr: **Übernahme, Einsicht,
Prüfergebnis, Bearbeitungsstand und die Scrollposition**. Letztere
wird vor dem Öffnen der Vorschau gemerkt und danach wieder gesetzt;
der Prüflauf scrollt auf 220 px und vergleicht.

Auch **„Einsicht bestätigen"** führt jetzt in den Vorgang zurück
statt hinaus — mit derselben Scrollposition.

**Die Sicherheitsabfrage** ist kein nacktes „Sind Sie sicher?":

> Die Dokumentprüfung ist noch nicht abgeschlossen. „Vorgang
> verlassen" noch einmal drücken, um den ganzen Vorgang zu
> schließen — oder „Zurück zur Krankmeldung", um weiterzuarbeiten.

Sie nennt, **was** unfertig ist, **was** zu tun ist und **wie** man
zurückkommt.

**Eine Falle, die ich dabei vermeiden musste:** Bliebe der
`dialogSchutz` nach der Rückkehr gesetzt, würde Escape im Vorgang
diesen nicht mehr schließen, sondern nur neu zeichnen — ein Dialog,
aus dem man nicht herauskommt. `vorgangDialog()` löscht den Schutz
deshalb bei **jedem** Zeichnen, egal auf welchem Weg. Der Prüflauf
drückt am Ende Escape im Vorgang und besteht nur, wenn er sich
schließt.

### 27.2 Die Karte zeigte Aktionen, die es nicht mehr gab

**Der Befund.** Nach Abschluss der eigenen Personalprüfung zeigte die
Karte für Personal weiter „Übernehmen" und „Weitergeben" — obwohl
Testpersonal bereits verantwortlich, der eigene Teilschritt erledigt
und nur noch der Teilschritt **einer anderen Rolle** offen war.

Die alten Bedingungen fragten den **Gesamtstand** ab („solange nicht
alles erledigt ist, zeige Übernehmen") — nicht, ob mir selbst
überhaupt noch etwas offensteht. Die Knöpfe hätten nichts bewirkt oder,
schlimmer, den fremden Teil angefasst.

**Jetzt leiten sich die Aktionen aus `kartenlage(v)` ab** — dem
Teilschritt, der **mir** offensteht:

| Lage | Aktionen auf der Karte | Hauptknopf |
|---|---|---|
| eigener Teil offen, unzugewiesen | **Übernehmen** | Krankmeldung prüfen |
| eigener Teil offen, selbst übernommen | **Weitergeben** | Krankmeldung prüfen |
| eigener Teil offen, fremd übernommen | **Übernehmen** (fragt dann nach dem Grund) | Krankmeldung prüfen |
| eigener Teil erledigt | **keine** | **Krankmeldung ansehen** |
| nur fremder Teil offen | **keine** | **Krankmeldung ansehen** |
| ganzer Vorgang erledigt | **Wiedereröffnen**, falls berechtigt | Ansehen |

Der **Hauptknopf** unterscheidet jetzt ebenfalls: Steht mir nichts
offen, heißt er „ansehen" statt „prüfen". Sonst verspricht er eine
Arbeit, die es für mich nicht gibt.

Die Kartenaktionen **nennen den Teilschritt ausdrücklich**
(`vg-teil-uebernehmen:V0002|personal`). Damit kann eine Karte nie den
Teil einer anderen Rolle anfassen — vorher lief sie über die
Gesamtaktion, die sich ihren Teil selbst suchte.

**Dieselben Regeln in den Aktionen:**

- `vg-teil-uebernehmen` und `vg-teil-weitergeben` weisen einen
  **erledigten** Teilschritt ab.
- `vg-teil-weitergeben` weist ab, wer den Teilschritt nicht selbst
  hat.
- `vg-uebernehmen` und `vg-weitergeben` — die Gesamtaktionen — gelten
  nur noch für Vorgänge **ohne** Teilschritte und weisen alles andere
  ab.

Der Prüflauf ruft alle fünf direkt auf und weist jedes Mal nach, dass
sich nichts ändert.

### 27.3 Was dabei an den Prüfläufen zu ändern war

Seit die Karte ihre Aktionen aus dem Teilschritt ableitet, gibt es
dieselben `data-tun`-Werte an **zwei** Stellen: auf der Karte und im
geöffneten Vorgang. Ein Selektor ohne Bereich trifft die Karte — die
vom Dialog verdeckt ist, sodass der Klick ins Leere geht.

Für einen Menschen ist das kein Problem: Er sieht die Karte nicht,
solange der Dialog offen ist. Für die Prüfläufe schon. **31 Selektoren
in sechs Läufen** adressieren den Dialog jetzt ausdrücklich
(`.dialog-kasten [data-tun=…]`). Das ist nicht nur eine Reparatur,
sondern genauer: Vorher hing es an der Reihenfolge im Dokument,
welches Element getroffen wurde.

### 27.4 Derselbe eigene Fehler, zum vierten Mal

Beim Einsetzen der neuen Prüfblöcke wurde `page.$$eval` erneut zu
`page.$eval` — und `nodes.map is not a function` beendete den Lauf.

Die Ursache ist jedes Mal dieselbe: `String.replace` deutet `$$` im
**Ersatztext** als ein einzelnes `$`. Das steht seit Abschnitt 23.7 in
diesem Bericht — und ich habe es trotzdem wieder getan, weil mein
Änderungshelfer intern `String.replace` benutzt.

**Eine Lehre, die man aufschreibt und nicht anwendet, ist keine.** Die
belastbare Form ist nicht „aufpassen", sondern: Der Ersatztext darf
nicht durch `String.replace` gehen. Entweder als **Funktion**
übergeben (`replace(a, () => b)` — dann wird nichts gedeutet) oder über
Index und `slice` einsetzen.

Gefunden hat es der Lauf selbst, nicht ich. Dass ein Lauf mit
`TypeError` abbricht und **keine Bilanz druckt**, ist dabei das
Entscheidende: Hätte er stillschweigend weniger geprüft, wäre es
durchgegangen.

### 27.5 Prüfstand

| Prüflauf | Ergebnis |
|---|---|
| `probe-karten-pruefen` (8 Blöcke, erweitert) | **79 bestanden, 0 offen** |
| `probe-teilung-pruefen` | 100 bestanden, 0 offen |
| `probe-regeln-pruefen` | 123 bestanden, 0 offen |
| `probe-dokument-pruefen` | 93 bestanden, 0 offen |
| `probe-zuordnung-pruefen` | 125 bestanden, 0 offen |
| `probe-vorgaenge-pruefen` | 138 bestanden, 0 offen |
| `probe-team-pruefen` | 197 bestanden, 0 offen |
| `probe-planung-pruefen` | 171 bestanden, 0 offen |
| `probe-fahrt-pruefen` | 168 bestanden, 0 offen |
| `probe-portal-pruefen` | 107 bestanden, 0 offen |

> **Einordnung:** Designprobe ohne Datenquelle. Der Lauf sagt nichts
> über die produktive Instanz.

---

## 28. Der vollständige Rundgang — Teil 1: eine Datenwahrheit

Der Nutzer hat die ganze Designprobe durchlaufen und sechzehn
Befunde gemeldet. Dieser Abschnitt behandelt die vier, bei denen
**dieselbe Sache verschiedene Zahlen hatte**. Die übrigen folgen in
eigenen Abschnitten.

Alles nur in der Designprobe: keine produktive Adminseite ersetzt,
keine Migration, keine Supabase-Daten, kein Push, Merge oder
Deployment.

### 28.1 Drei Zahlen für einen Tag

**Gemessen.** Am selben Tag, ohne eine Fahrt zu ändern:
Kalender 10, Fahrtenliste „Alle" 10, **Übersicht 9**.

**Ursache im Code.** Jede Ansicht rechnete selbst:

| Stelle | Rechnung |
|---|---|
| `uebersicht()` | `D.fahrten.filter(f => !["storniert"].includes(f.zustand))` |
| `fahrten()` | `D.fahrten` ungefiltert |
| `probe-kalender.js` | `D.fahrten.length` |

Die Übersicht rechnete eine stornierte Fahrt heraus, die anderen
nicht. Drei Stellen, drei Rechnungen, drei Wahrheiten.

**Geändert.** In `probe-daten.js` steht jetzt je Begriff **eine**
Funktion. Wer eine Zahl braucht, ruft sie; niemand filtert mehr
selbst:

| Funktion | Definition |
|---|---|
| `fahrtenHeute()` | alle Fahrten des Tages, **storniert eingeschlossen** |
| `nichtZugewiesen()` | Eingang oder ungeplant **und** kein Fahrer |
| `nachZeit()` | aufsteigend, fehlende Zeit hinten, bei Gleichstand nach Nummer |
| `mitZeit()` / `ohneZeit()` | die beiden Abschnitte getrennt |

Dass storniert **enthalten** ist, ist eine Festlegung und keine
Nebensache: Eine stornierte Fahrt ist am Tag passiert und gehört in
die Tagesmenge. Wer nur die aktiven sehen will, filtert. In der Probe
gibt es nur den laufenden Tag; sobald Fahrten ein Datum tragen, kommt
der Tagesvergleich an **diese** Stelle und an keine andere.

### 28.2 Die Karte sagte vier, die Liste zeigte zwei

**Gemessen.** „4 noch nicht zugewiesen" öffnete den Filter
„Ungeplant" mit 2 Fahrten.

**Ursache.** Die Karte rechnete `ungeplant + eingang`, ihr Sprungziel
war aber der **Zustandsfilter** `fahrten:ungeplant`. Zwei
verschiedene Mengen, eine Zahl.

**Geändert.** Es gibt den Filter **„Noch nicht zugewiesen"**
(`fahrten:offen`), der genau `nichtZugewiesen()` zeigt. Die
Definition enthält bewusst auch „kein Fahrer": Eine ungeplante Fahrt,
auf der schon jemand steht, ist zugewiesen. Der Prüflauf setzt bei
einer ungeplanten Fahrt einen Fahrer und weist nach, dass sie
herausfällt.

### 28.3 Neun Warnungen, Reiter „Erledigt"

**Gemessen.** „9 Warnungen" öffnete Meldungen im Reiter
„Erledigt (3)".

**Zwei Ursachen.** Erstens setzte der Sprung **keinen Reiter** — es
blieb der zuletzt gewählte stehen. Zweitens, und schlimmer: Im
Rahmen stand

```js
const [bereichId, filter] = ziel.dataset.ziel.split(":");
if (filter) zustand.fahrtFilter = filter;
```

**Jeder** Sprung mit Zusatz setzte den **Fahrtfilter** — auch einer in
die Meldungen. Der Zusatz gehörte niemandem.

**Geändert.** Der Zusatz gehört dem Zielbereich. Der Rahmen gibt ihn
über `ProbeBereiche.sprungziel(bereich, zusatz)` an das Zielmodul
weiter, **bevor** gezeichnet wird. Die Meldungen haben einen Reiter
„Offene Warnungen", gespeist aus `offeneWarnungen()` — derselben
Funktion, aus der die Kennzahl ihre Zahl nimmt. Kennzahl,
Reiterzähler und Zielliste sind damit dieselbe Menge.

Der Prüflauf wählt eigens vorher einen anderen Reiter und springt
dann — das war der eigentliche Befund.

### 28.4 Fahrten standen unsortiert

**Ursache.** `fahrten()` sortierte nicht; der Tagesverlauf sortierte
mit `a.zeit.localeCompare(b.zeit)` eigenständig.

**Geändert.** Alle Listen nehmen `D.nachZeit()`. Bei gleicher
Uhrzeit entscheidet die Vorgangsnummer — damit ist die Reihenfolge
stabil und nicht von der Eingabereihenfolge abhängig; der Prüflauf
sortiert dieselben zwei Fahrten in beiden Richtungen und vergleicht.

Fahrten **ohne geklärte Zeit** stehen in einem eigenen, benannten
Abschnitt „Zeit noch nicht geklärt" — nicht zwischen den Uhrzeiten.
Dort steht auch, warum: *die Reihenfolge wäre erfunden.*

Damit das überhaupt prüfbar ist, hat eine Fahrt im Bestand jetzt
bewusst keine Zeit (`FA-0002`, „Rückfrage zur Uhrzeit offen"). Vorher
trug sie 11:15 und widersprach damit ihrem eigenen Hinweis.

### 28.5 Erledigt, ausgeblendet, archiviert, wiedereröffnet

**Der Wunsch.** Erledigte Vorgänge sollen aus der täglichen
Arbeitsliste verschwinden können — **ohne Daten zu löschen**.

**Ursache.** Zwischen „fachlich erledigt" und „nach 90 Tagen
archiviert" gab es keinen Zustand. Wer seine Liste leer haben wollte,
hatte keine Wahl.

**Vier Zustände, ausdrücklich getrennt benannt:**

| Zustand | Wer entscheidet | Wirkung |
|---|---|---|
| **fachlich erledigt** | berechnet aus den Teilschritten | steht in „Erledigt" |
| **ausgeblendet** | ein Mensch, über die Ansicht | steht im Archiv, nicht in „Erledigt" |
| **archiviert** | die Zeit, 90 Tage nach Abschluss | steht im Archiv |
| **wiedereröffnet** | ein Mensch, mit Pflichtgrund | zurück in die Arbeit, Ausblendung aufgehoben |

Die Trennung steht als `LISTENSTAENDE` im Code, nicht nur im
Oberflächentext — der Prüflauf liest beides nach.

**„Aus Erledigt-Liste entfernen"** ändert allein `v.ausListe`. Der
Prüflauf vergleicht Titel, Teilschritte, Daten, Zustand,
Verantwortliche, Abschlussdatum, Archivdatum und Notizen **vor und
nach** der Aktion als Ganzes und besteht nur, wenn sie Zeichen für
Zeichen gleich sind. Der Vorgang steht danach im Archiv, ist über die
Suche auffindbar, und die Zeile sagt, **warum** er dort steht.

Protokolliert werden Person, Kennung, Rolle, Datum, Uhrzeit,
betroffener Vorgang, **vorheriger und nachheriger Listenstatus** —
und dass er auffindbar bleibt.

Der Weg **zurück** in die Arbeitsliste ist da. Und eine
**Wiedereröffnung hebt die Ausblendung auf**: Sonst wäre der Vorgang
wieder zu tun und trotzdem unsichtbar. Das ist kein Nebeneffekt,
sondern eigens so gebaut und eigens geprüft.

Das Archiv erklärt jetzt **beide** Wege hinein und wiederholt, dass
keiner davon ein Löschen ist. Die 90-Tage-Regel bleibt unverändert;
die Ausblendung tritt nicht an ihre Stelle, sondern daneben.

### 28.6 Was offen bleibt

- **Keine Löschung, auch keine spätere.** Die Aufbewahrungsfrist ist
  weiterhin eine offene rechtliche Entscheidung (Abschnitt 23.5). Die
  Ausblendung ändert daran nichts — sie ist ausdrücklich keine
  Löschung und auch kein Ersatz dafür.
- **Ein Tag.** Die Probe kennt nur den laufenden Tag. Ob „Fahrten
  heute" später den Kalendertag der Abholung oder der Anlage meint,
  ist eine Festlegung, die mit echten Daten zu treffen ist. Die
  Stelle dafür ist `fahrtenHeute()` und nur sie.

### 28.7 Ein eigener Fehler im Prüflauf

Die Zusicherung „der Abschnitt sagt, warum nicht einsortiert wird"
las `page.textContent(".flaeche")`. Davon gibt es mehrere, und
`textContent` nimmt nur die erste — den Filterblock. Der Hinweis
steht in der zweiten. Behoben durch Lesen des ganzen Hauptbereichs.

Kein Produktfehler: Der Satz stand von Anfang an da, die Prüfung
schaute an die falsche Stelle.

### 28.8 Prüfstand Teil 1

| Prüflauf | Ergebnis |
|---|---|
| `probe-wahrheit-pruefen` (7 Blöcke, neu) | **78 bestanden, 0 offen** |

Die übrigen Läufe folgen, wenn alle sechzehn Befunde umgesetzt sind —
ein Gegenlauf auf halbem Weg sagt wenig.

> **Einordnung:** Designprobe ohne Datenquelle. Der Lauf sagt nichts
> über die produktive Instanz.
