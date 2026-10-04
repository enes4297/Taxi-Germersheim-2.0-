# Betriebsportal — Bericht am verbindlichen Haltepunkt

**Branch:** `feature/030-betriebsportal-neu`
**Stand:** 04.10.2026 (dritter Durchgang)
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

---

## 29. Der Rundgang — Teil 2: der Kalender führt dorthin, wo es weitergeht

Fünf Befunde zum Kalender. Nur die Designprobe: keine produktive
Adminseite ersetzt, keine Migration, keine Supabase-Daten, kein Push,
Merge oder Deployment.

### 29.1 Krankheit und Urlaub landeten am gleichen Ort

**Gemessen.** „Testfahrer 02 – Krank" und „Testfahrer 06 – Urlaub"
öffneten **beide** nur den Bereich „Fahrer & Fahrzeuge".

**Ursache.** Beide Einträge trugen `ziel: "team"`. Der Kalender wusste,
*dass* jemand krank ist, aber nicht, *welcher Vorgang* dazugehört. Der
Leser musste ihn selbst suchen.

**Geändert.** `D.vorgaengeZuAbwesenheit(mitarbeiterId, iso, art)` sucht
über die **Mitarbeiterkennung** und den gemeldeten Zeitraum — nicht
über den Namen, denn ein Name ist keine Kennung. Daraus folgen drei
Fälle:

| Treffer | Verhalten |
|---|---|
| genau einer | der Vorgang wird **direkt geöffnet** |
| mehrere | **Auswahl** mit Vorgangsnummer, Zeitraum und Zustand — es wird nicht geraten |
| keiner | **ehrlicher Hinweis**, kein Öffnen-Knopf, kein Sprung |

Erledigte Vorgänge zählen mit: Wer im Kalender auf eine abgeschlossene
Krankmeldung klickt, will sie ansehen.

**Die Rollenrechte bleiben.** Der Prüflauf springt als Disposition in
den Krankheitsvorgang und besteht nur, wenn dort Zeitraum und
Planungswirkung stehen — aber kein Dateiname, kein Prüfergebnis und
kein Ergebniswert. Ein Sprung öffnet keine Tür.

### 29.2 Fahrzeugtermine zeigten in die Menge

**Ursache.** `ziel: "team"` und als Titel nur das Kennzeichen.

**Geändert.** Es gibt eine **Fahrzeugakte** als Dialog mit
Fahrzeugname, Kennzeichen, stabiler Kennung, Art und Fristen aller
drei Termine, aktuellem Zustand und — falls vorhanden — der Sperre mit
Grund. Der **angefragte** Termin ist hervorgehoben und als „aus dem
Kalender" gekennzeichnet; so weiß der Leser, warum er hier ist.

Verknüpft wird über `fahrzeug-F02-tuev` — die **stabile Kennung**,
nicht das Kennzeichen. Ein Kennzeichen kann wechseln. Der Prüflauf
sucht im Quelltext eigens danach, dass kein Sprungziel aus dem
Kennzeichen gebaut wird, und weist nach, dass eine unbekannte Kennung
abgewiesen wird und ohne `fleet.read` nichts aufgeht.

Was die Probe **nicht** hat, steht in der Akte: Werkstattbelege,
Rechnungen und Reifenwechsel sind nicht hinterlegt — es wird nichts
erfunden.

### 29.3 „4 Schichten" sagte nicht, wer gemeint ist

**Geändert.** Jede Schicht erscheint einzeln:

```
Testfahrer 01 · 06:00–14:00 · GER-TEST 001 · Im Dienst · veröffentlicht
Testfahrer 03 · 14:00–22:00 · kein Fahrzeug · Im Dienst · veröffentlicht
```

Mit Mitarbeitername, Zeit von/bis, Fahrzeug **oder** ausdrücklich
„kein Fahrzeug", Zustand des Mitarbeiters und Planstatus. Die Anzahl
ergibt sich damit aus genau den Einträgen, die darunter stehen — sie
ist keine eigene Rechnung mehr.

### 29.4 „1 Schicht" an einem Tag ohne jede Schicht

**Gemessen.** Alle sechs Mitarbeiter auf Frei, Krank oder Urlaub — und
der Kalender zeigte **„1 Schicht"**.

**Ursache.** Die Zählung war
`plan.zeilen.filter(z => z.von && z.bis).length`. Sie fragte die
Abwesenheit nicht. Eine Schichtzeit, die von einer früheren Planung
stehen geblieben war, galt als Schicht.

**Die eigentliche Ursache war tiefer:** Die Planung hatte diese
Prüfung (`tagesstatus`, `konflikteVon`), der Kalender hatte sie nicht.
Zwei Bewertungen für dieselbe Zeile.

**Geändert.** `D.schichtbefund(zeile, iso)` in `probe-daten.js` ist
jetzt **die** Bewertung. Sie gibt zurück:

| Feld | Bedeutung |
|---|---|
| `status` | dienst / frei / krank / urlaub |
| `hatZeit` | steht überhaupt eine Zeit drin? |
| `gueltig` | zählt das als normale Schicht? |
| `konflikt` | wenn nicht: der Befund im Klartext |
| `ausnahme` | bewusst trotz Abwesenheit eingeplant? |

Gültig ist eine Schicht nur, wenn eine Zeit steht **und** der
Mitarbeiter wirksam im Dienst ist. Der Prüflauf vergleicht die Zahl
des Kalenders mit derselben Rechnung über die Planungsdaten und
besteht nur bei Gleichheit.

**Eine ungültige Schicht verschwindet nicht.** Sie wird benannt:

- „Ungültige Schicht – Mitarbeiter ist krank"
- „Ungültige Schicht – Mitarbeiter hat genehmigten Urlaub"
- „Schicht vorhanden, Mitarbeiter steht auf Frei"

Stilles Weglassen wäre genauso falsch wie stilles Mitzählen. Die
Konflikte haben einen eigenen Anzeigefilter, damit man sie
ausblenden **kann** — aber nicht muss.

Eine **bestätigte Ausnahme** („trotz Abwesenheit eingeplant") bleibt
erlaubt, gilt als Schicht und wird als „bestätigte Ausnahme"
ausgewiesen. Sie ist eine Entscheidung, die jemand getroffen und
begründet hat. Die **Abwesenheit selbst** bleibt dabei unverändert —
der Prüflauf liest sie nach der Ausnahme noch einmal.

### 29.5 Was bestanden hatte, bleibt gesichert

Manuell bestanden und jetzt als Regression festgehalten:

- „Fahrzeuge" ausschalten entfernt **nur** Fahrzeugtermine; Schichten
  und Abwesenheiten bleiben in unveränderter Zahl.
- „Fahrten" ausschalten entfernt **nur** Fahrten.
- **Kein Filter verändert Daten** — der Prüflauf vergleicht den
  ganzen Plan als Text vor und nach dem Umschalten.
- Eine **ungespeicherte Planungseingabe** übersteht den Wechsel in den
  Kalender, das Blättern und die Rückkehr. Geprüft mit einer getippten
  Zeit, die danach noch im Feld steht.
- Der Kalender ruft `planEntwurf()` **nicht** auf — im Quelltext
  nachgesehen, nicht nur im Verhalten.

### 29.6 Prüfstand Teil 2

| Prüflauf | Ergebnis |
|---|---|
| `probe-kalenderwege-pruefen` (9 Blöcke, neu) | **88 bestanden, 0 offen** |

> **Einordnung:** Designprobe ohne Datenquelle. Der Lauf sagt nichts
> über die produktive Instanz.

---

## 30. Der Rundgang — Teil 3: vier Bereiche, die nur aussahen wie Bereiche

### Der gemessene Ausgangszustand

Im vollständigen manuellen Rundgang waren vier Bereiche **sichtbar, aber
nicht bedienbar**. Das ist genau die Art Befund, die eine Designprobe
liefern soll: Die Fläche war da, die Bedienung nicht.

| Bereich | Was der Rundgang gemessen hat |
|---|---|
| Kunden | Suchfeld ohne Wirkung, Zeilen ohne Ziel, kein Anlegen |
| Personal | Liste ohne Akte, zweite Mitarbeiterwahrheit neben `mitarbeiter[]` |
| Finanzen | Rechnungen ohne Akte, keine Zahlung, keine Mahnung, keine Korrektur |
| Rewards | Fünf Stufen als Text, kein Konto, keine Korrektur |

### Die Ursachen im Code

**Kunden.** `kunden()` in `probe-bereiche.js` gab eine Tabelle aus
`D.kunden` aus. Es gab kein Zustandsfeld für die Suche, also konnte das
Feld nichts filtern, und keine Zeile trug ein `data-tun` — damit gab es
nichts, was ein Klick hätte auslösen können. Der Fahrtassistent führte
zudem eine **eigene** Kundenliste; ein dort neu angelegter Kunde
existierte im Kundenbereich nicht.

**Personal.** Neben `mitarbeiter[]` stand ein zweites Feld `personal[]`
mit eigenen Namen und eigenen Angaben. Zwei Listen über dieselben
Menschen laufen auseinander, sobald eine gepflegt wird und die andere
nicht — und niemand merkt, welche gerade stimmt.

**Finanzen.** `rechnungen[]` kannte Nummer, Betrag und Zustand, aber
keinen Kunden, keine Positionen, keine Zahlungen und keine Version. Ohne
Version ist keine Korrektur möglich, die den alten Stand nicht
überschreibt.

**Rewards.** Die Stufen standen als Fließtext in der Ansicht. Es gab
keine Konten, keine qualifizierenden Fahrten und keinen Verlauf.

### Was geändert wurde

**Eine Quelle je Sache.** `personal` ist jetzt eine **Sicht** auf
`mitarbeiter[]`: `personal = mitarbeiter.map((m) => personalVon(m.id))`.
Die zusätzlichen Angaben liegen getrennt in `personalZusatz`, verschlüsselt
über dieselbe Kennung. Eine zweite Wahrheit ist damit nicht mehr
konstruierbar, nicht weil jemand aufpasst, sondern weil es nur eine Liste
gibt. Ebenso beim Kundenbestand: Der Fahrtassistent legt über
`D.kundeAnlegen()` in **denselben** Bestand an, den der Kundenbereich
zeigt, und schreibt die Kennung an die Fahrt.

**Neu: `probe-akten.js` (959 Zeilen).** Ein eigenes Modul für Akten und
Aktionen, eingeordnet zwischen `probe-vorgaenge` und `probe-kalender`.
Darin: Kundenakte, Personalakte, Rechnungsakte, Rewardskonto, Neuanlage
eines Kunden in zwei Schritten mit Pflichtfeldern, Buchungsdialog,
Zahlung, Mahnung, Rechnungskorrektur als neue Version und manuelle
Rewardskorrektur.

**Die Aktenzeile.** Jede Zeile einer Liste ist jetzt eine echte
`<button class="aktenzeile" data-tun aria-label>`. Keine Zeile sieht
anklickbar aus, ohne es zu sein; Zeilen, die nur anzeigen, tragen
`ist-anzeige` und haben keine Klickoptik.

**Korrektur statt Überschreiben.** Eine Rechnungskorrektur erzeugt eine
**neue Version** mit Pflichtgrund. Die alte Version bleibt. Protokolliert
werden handelndes Konto, Rolle, Zeitpunkt, vorheriger Zustand, neuer
Zustand und Grund. Die Einträge sind `Object.freeze` — ein späterer Zugriff
kann sie nicht mehr ändern.

**Die manuelle Rewardskorrektur** verlangt `rewards.write` **und**
`security.read`. Nach der Rollenverteilung dieser Probe trifft das nur auf
die Administration zu. Die Prüfung steht in der Aktion selbst, nicht nur in
der Anzeige — der direkte Aufruf wird ebenso abgewiesen.

### Offene Geschäftsregeln — ausdrücklich nicht erfunden

Diese Punkte sind in der Oberfläche als offen gekennzeichnet und mit
**keiner** Zahl gefüllt:

- die Punktzahlen der Rewardsstufen unterhalb von VIP
- die Mahnstufen und Mahngebühren
- die Zahlungsfrist einer Rechnung
- die Aufbewahrungsfrist für Krankheitsnachweise (rechtliche Entscheidung)
- ob eine Rechnungskorrektur eine Gutschrift oder eine Neuausstellung ist

Festgelegt sind nur die Regeln, die der Geschäftsführer genannt hat:
VIP ab 100 qualifizierenden Fahrten, 200 Geburtstagspunkte, keine Punkte
für Krankenfahrten, Dialyse und Flughafen, Glücksrad 5 bis 50 Punkte,
20-€-Gutschein, Yumaks Box gesperrt.

### Zwei eigene Fehler, getrennt benannt

1. **Ich habe meine eigene Regel gebrochen.** Die Anzeigezeilen trugen die
   Klasse `aktenzeile` und erbten damit `cursor: pointer` und den
   Hover-Effekt — genau die Klickoptik ohne Bedienbarkeit, die Block 16
   verbietet. Der eigene Prüflauf hat es gefunden, nicht ich. Behoben mit
   `.aktenzeile.ist-anzeige { cursor: default; background: none; }`.
   Derselbe Fehler stak später in `.kennzahl` der Analyse und wurde dort
   gleich mit erledigt.
2. **Ein widersprüchlicher Testwert.** Mein Arbeitszeitmodell gab M02
   „Vollzeit · 40 Std." bei einer Teilzeitbeschäftigung. Die Modelle
   richten sich jetzt nach `mitarbeiter[]`.

### Ein Fehlalarm, getrennt benannt

Mein Prüflauf behauptete, die Buchhaltung habe kein `customers.write` und
dürfe deshalb keinen Kunden anlegen. Die Buchhaltung **hat** dieses Recht.
Nicht die Oberfläche war falsch, sondern meine Annahme. Die Prüfung nimmt
jetzt die Disposition, die wirklich keine Kundenrechte hat, und prüft den
direkten Aufruf.

---

## 31. Der Rundgang — Teil 4: ein Zeitraum, der etwas bewirkt

### Der gemessene Ausgangsfehler

Im Analysebereich stand im Kopf: **„Zeitraum: letzte 7 Tage"**. Kein
Knopf, kein Hover, keine andere Wahl. Daneben standen Zahlen, die zu
keinem Zeitraum gehörten.

### Die Ursache im Code

In `probe-daten.js`:

```js
const analyse = {
  zeitraum: "letzte 7 Tage",
  kennzahlen: [ { name: "Besuche", wert: "1.284", ... }, ... ],
  aktionen: [...],
  seiten: [...]
};
```

und in `probe-bereiche.js` nur `<p>Zeitraum: ${h(a.zeitraum)}</p>`.

Es gab **nichts zu wählen, weil es nichts zu rechnen gab.** Die Zahlen
waren einzeln hingeschrieben. Ein Zeitraumknopf hätte sie nicht ändern
können — er hätte nur die Beschriftung getauscht und damit eine
Auswertung behauptet, die nicht existiert.

### Was geändert wurde

**Tageswerte statt Endzahlen.** Es liegen jetzt **400 Tage** Testwerte
vor, je Tag und je Ereignis. Jede Kennzahl der Seite wird über den
gewählten Bereich **summiert**.

Das ist der entscheidende Punkt gegen die Anforderung „keine zufällig
voneinander abweichenden Zeiträume": Die Kennzahlen reagieren nicht
gemeinsam, weil jemand sie gemeinsam aktualisiert, sondern weil sie aus
**einer einzigen Rechnung** kommen. `analyseAuswertung(von, bis)` ist die
einzige Stelle, an der eine Zahl dieser Seite entsteht. Zwei verschiedene
Zeiträume auf einer Seite sind damit nicht konfigurierbar, sondern
strukturell ausgeschlossen.

**Die Tageswerte sind nicht zufällig.** Sie entstehen aus dem Tagesabstand
(`analyseTagwert`), mit einem niedrigeren Wochenendwert. Ein `Math.random`
hätte bei jedem Zeichnen andere Zahlen ergeben — damit wäre kein Prüflauf
möglich und keine Anzeige wiederholbar. Der Prüflauf prüft ausdrücklich,
dass kein `Math.random` in der Anzeige steht.

**Sieben Zeiträume**, jeder eine echte Schaltfläche mit `aria-pressed`:
Heute, Gestern, Letzte 7 Tage, Letzte 30 Tage, Dieser Monat, Letzter
Monat, Eigener Zeitraum. Der gewählte Zeitraum bleibt im Kopf sichtbar,
mit Von, Bis und Tageszahl — „1 Tag", nicht „1 Tage".

**Eigener Zeitraum.** Zwei `type="date"`-Felder, übernommen bei
`change`, also wenn das Datum vollständig ist. Mit nur einem gefüllten
Feld wird **keine Zahl gezeigt**, sondern um die Eingabe gebeten: Eine
halbe Auswahl ergibt keine Auswertung, und eine Zahl ohne Zeitraum wäre
eine Behauptung. Eine verdrehte Eingabe (bis vor von) wird gedreht, nicht
als leer gewertet.

**Schätzung heißt Schätzung.** Jede Kachel sagt, woher ihre Zahl kommt:

| Kennzahl | Art |
|---|---|
| Seitenaufrufe, Besuche | gezählt |
| Besucher, wiederkehrend | **Schätzung**, mit Tilde: `~` |
| die drei Quoten | gerechnet, aus denselben Tagen |

Der Grund steht in der Ansicht: Ein Mensch mit Handy und Rechner zählt
doppelt, wer Speicherfunktionen blockiert, gar nicht. Deshalb ist
„Besucher" keine Zählung und wird auch nicht als eine ausgegeben.

**Was hier nicht passiert** — als eigener Abschnitt in der Ansicht: keine
Einzelverfolgung, keine Nutzer- oder Gerätekennung, keine IP in den
Zahlen, kein fremder Trackingdienst, kein Aufruf nach außen. Die
Mitarbeiter- und Adminnutzung zählt nicht als Besuch.

### Ein eigener Fehler, getrennt benannt

Die Kacheln nutzen `.kennzahl`, und diese Klasse ist als Schaltfläche
gebaut — `cursor: pointer` und Hover. In der Analyse führt keine Kachel
irgendwohin. Das war wieder Klickoptik ohne Bedienbarkeit, derselbe Fehler
wie bei der Aktenzeile. Behoben mit `.kennzahl.ist-anzeige`, und der
Prüflauf sucht jetzt gezielt nach Kacheln mit Zeiger ohne Schaltfläche.

### Was dieser Lauf nicht sagt

Es findet **heute keine Besuchermessung statt.** Es ist kein Trackingdienst
angebunden, und es gibt keine Datenquelle. Alle Zahlen sind erfundene
Testwerte der Designprobe, in der Ansicht auch so gekennzeichnet. Im
produktiven Portal bleibt der Bereich leer, bis eine datensparsame
Ereigniserfassung eingerichtet und rechtlich geprüft ist. Diese Prüfung
steht aus — **welche Ereignisse überhaupt erhoben werden dürfen, ist eine
offene rechtliche Entscheidung**, keine technische.

---

## 32. Was die Gegenläufe an meiner eigenen Arbeit gefunden haben

Die bestehenden Prüfläufe sind beim vollständigen Durchlauf über die
Blöcke 1 bis 16 **viermal** auf Fehler gestoßen, die ich selbst eingebaut
hatte. Sie stehen hier getrennt, weil sie nichts mit den gemeldeten
Befunden des Rundgangs zu tun haben.

### 32.1 Der Kunde wurde beim Zeichnen angelegt — ein ernster Fehler

Block 8 verlangte einen gemeinsamen Kundenbestand: Ein im Fahrtassistenten
neu eingegebener Kunde muss auch im Kundenbereich auftauchen. Ich habe den
Aufruf `D.kundeAnlegen(...)` dafür in `schrittPruefen()` gesetzt — und
`schrittPruefen()` ist die **Zeichenfunktion** von Schritt 5, nicht die
Speicherfunktion.

Folge: Jedes Neuzeichnen von Schritt 5 hätte einen weiteren Kunden angelegt
und einen weiteren Protokolleintrag geschrieben. Ein Schritt zurück und
wieder vor hätte Doppelgänger erzeugt. Zusätzlich griff `speichern()` auf
die dortige lokale Variable `angelegt` zu, die in seinem Geltungsbereich
nicht existiert.

Behoben: Das Anlegen steht jetzt in `speichern()` und läuft genau einmal.
Die Prüfansicht **zeigt** nur an, was passieren wird — „Kundenbestand:
wird mit dem Speichern neu angelegt". Gefunden hat das
`probe-fahrt-pruefen`, nicht ich.

Die Regel dahinter, für künftige Arbeit: **Eine Zeichenfunktion verändert
keine Daten.** Sie kann beliebig oft laufen; alles, was sie verändert,
verändert sie beliebig oft.

### 32.2 Ich hatte den Zwei-Zeichen-Schutz gestrichen

Die Kundensuche gab bei weniger als zwei Zeichen den Hinweis „Mindestens
zwei Zeichen eingeben. Der Bestand hat N Kunden — es werden nie alle
gezeigt." Beim Ausbau der Suche auf Firma, Anschrift und E-Mail habe ich
diese Schwelle entfernt.

Das war **keine Forderung aus Block 8.** Dort stand: Suche beim Tippen,
auch über Adresse und E-Mail, und Enter bei genau einem Treffer. Von einer
niedrigeren Schwelle war nicht die Rede. Bei einem Zeichen trifft die
Suche einen großen Teil von über zweitausend Einträgen — das ist keine
Suche, sondern eine Liste.

Die Schwelle ist wieder da, und der Kundenbereich hält sie jetzt ebenso
ein wie der Fahrtassistent: eine Suchfunktion, zwei Oberflächen, eine
Regel. Die Suche beim Tippen und die zusätzlichen Suchfelder bleiben.

### 32.3 Zwei Gesundheitsangaben in meinen Testdaten

Der Portallauf prüft, dass im Quelltext keine Behandlungsart steht. Er hat
zwei Stellen gefunden, die ich geschrieben hatte:

- ein Rewardsprotokoll-Eintrag eines benannten Testkunden mit dem Grund
  `"Dialysefahrt — ausgeschlossen"`
- ein Rechnungsposten `"Dialysefahrt Testklinik 02"`, dazu ein
  `"Rollstuhlzuschlag"`

Beides hängt eine Behandlungsart an einen Kunden. Dass es Testdaten sind,
ändert daran nichts — die Projektregel verbietet erfundene
Gesundheitsangaben ausdrücklich. Ersetzt durch `"Fahrt einer
ausgeschlossenen Kategorie"`, `"Vertragsfahrt Testklinik 02"` und
`"Wartezeitzuschlag"`.

**Die Unterscheidung, die hier getroffen wird**, und zwar bewusst:

| Angabe | Bewertung |
|---|---|
| `REWARDS_AUSSCHLUSS = ["Krankenfahrten", "Dialyse", "Flughafenfahrten"]` | **erlaubt** — abstrakte Kategorieregel, keine Person; vom Geschäftsführer so genannt |
| „Dialysefahrt" im Protokoll eines Kunden | **verboten** — Behandlungsart an einem Menschen |
| „Bleibt im Rollstuhl" als Fahrzeugbedarf | **erlaubt** — betrieblich notwendig, um ein Fahrzeug zu wählen; keine Diagnose |

Der Prüflauf nimmt jetzt genau die eine Regelzeile aus und sucht danach
unverändert streng weiter. Er ist damit nicht schwächer, sondern genauer.

### 32.4 Eine Erwartung, die den gemeldeten Fehler festgeschrieben hatte

Der Portallauf erwartete, dass die Übersichtskennzahl „noch nicht
zugewiesen" in den Filter `ungeplant` springt.

**Genau das war der gemeldete Fehler aus Block 14:** Die Übersicht zeigte
„4 nicht zugewiesen", der Filter danach 2 Fahrten. Eine Fahrt im Eingang
ohne Fahrer ist ebenfalls nicht zugewiesen, fiel aber aus dem Filter
`ungeplant` heraus. Die alte Erwartung hat diese Abweichung also
festgehalten, statt sie zu verhindern.

Neue Erwartung, strenger belegt: Die Kennzahl zielt auf `fahrten:offen`,
der Filter `offen` zeigt `D.nichtZugewiesen()` — dieselbe Funktion, aus
der auch die Zahl auf der Karte kommt. Geprüft wird nicht nur, dass der
Filter gedrückt ist, sondern dass **die Zahl auf der Karte und die Anzahl
der Zeilen in der Liste übereinstimmen**. Der Filter `ungeplant` bleibt
daneben bestehen und wird weiterhin geprüft — nur nicht mehr als Ziel der
Kennzahl.

---

## 33. Zwei Anforderungen, die sich widersprachen

Das muss offen stehen, weil hier eine frühere Festlegung geändert wurde.

**Die frühere Anforderung** (nach der fachlichen Freigabe der
Krankmeldung): „gesamter Vorgang erledigt → ausschließlich ‚Ansehen' und —
falls berechtigt — ‚Wiedereröffnen'." Der Prüflauf `probe-karten-pruefen`
hat das als Knopfzahl festgehalten: genau einer beziehungsweise genau zwei.

**Die spätere Anforderung** (Block 1 des vollständigen Rundgangs):
„Erledigte Vorgänge aus der Arbeitsliste entfernen" — ohne zu löschen.
Dafür braucht die Karte einen dritten Knopf.

**Beide zugleich sind nicht erfüllbar.** Ich habe die spätere umgesetzt und
die Erwartung des Prüflaufs angepasst, aber nicht aufgeweicht:

Der Sinn der früheren Regel war, dass an einem erledigten Vorgang **keine
Bearbeitung** mehr angeboten wird — kein Übernehmen, kein Weitergeben, kein
Abschluss. Genau das wird jetzt geprüft, und zwar über zwei Wege statt über
eine Zahl:

1. Jede Beschriftung muss aus einer festen erlaubten Menge stammen:
   `Ansehen`, `Aus Erledigt-Liste entfernen`, `Zurück in die Arbeitsliste`,
   `Wiedereröffnen`. Ein vierter Knopf mit beliebigem Text fällt weiterhin
   auf.
2. **Keine** Aktion hinter einem Knopf darf `uebernehmen`, `weitergeben`,
   `erledigen` oder `abschliessen` heißen — geprüft an `data-tun`, nicht an
   der Beschriftung.

Zusätzlich wird jetzt belegt, dass „Aus Erledigt-Liste entfernen"
**nichts löscht**: Die Anzahl der Vorgänge bleibt gleich, und der Vorgang
ist danach weiterhin über `vorgangVon()` erreichbar. Das war vorher nicht
geprüft.

**Falls der Geschäftsführer die frühere Festlegung so gemeint hat, dass
auch kein Listenknopf erscheinen darf**, muss Block 1 anders gelöst werden
— etwa über eine Aktion im geöffneten Vorgang statt auf der Karte. Das ist
eine Entscheidung, die ich nicht treffe.

### Ein Fehlalarm desselben Laufs, getrennt benannt

Derselbe Lauf meldete „Aus Erledigt-Liste entfernen" als
Abschlussbeschriftung, weil das Suchmuster das Wort `erledigt` enthält. Die
Beschriftung behauptet aber keinen Abschluss — sie nennt die **Liste**, aus
der etwas entfernt wird. Herausgenommen wird deshalb ausschließlich der
Listenname `Erledigt-Liste`; alles andere wird unverändert streng geprüft.
Damit die Ausnahme das Muster nicht stumpf macht, prüft der Lauf jetzt
zusätzlich, dass „Als erledigt markieren" und „Dokumentprüfung
abgeschlossen" weiterhin anschlagen.

---

## 34. Alle Prüfläufe, vollständig gefahren

Stand 02.10.2026. Jeder Lauf wurde bis zur gedruckten Abschlussbilanz
gefahren. Ein Lauf ohne Bilanz gilt nicht als bestanden.

| Prüflauf | Ergebnis |
|---|---|
| `probe-portal-pruefen` | **112 bestanden, 0 offen** |
| `probe-fahrt-pruefen` | **170 bestanden, 0 offen** |
| `probe-planung-pruefen` | **171 bestanden, 0 offen** |
| `probe-team-pruefen` | **197 bestanden, 0 offen** |
| `probe-vorgaenge-pruefen` | **138 bestanden, 0 offen** |
| `probe-teilung-pruefen` | **100 bestanden, 0 offen** |
| `probe-dokument-pruefen` | **93 bestanden, 0 offen** |
| `probe-regeln-pruefen` | **123 bestanden, 0 offen** |
| `probe-zuordnung-pruefen` | **125 bestanden, 0 offen** |
| `probe-karten-pruefen` | **88 bestanden, 0 offen** |
| `probe-wahrheit-pruefen` | **78 bestanden, 0 offen** |
| `probe-kalenderwege-pruefen` | **88 bestanden, 0 offen** |
| `probe-akten-pruefen` (neu) | **240 bestanden, 0 offen** |
| `probe-analyse-pruefen` (neu) | **113 bestanden, 0 offen** |
| **Summe** | **1 836 bestanden, 0 offen** |

In allen vierzehn Läufen: **null Anfragen nach außen.** Jeder Browserkontext
bricht jede Verbindung ab, die nicht auf den eigenen Testserver zeigt, und
zählt sie. Die Zähler stehen am Ende jedes Laufs bei 0.

### Was diese Zahlen nicht sagen

- Es ist **keine Datenquelle** angebunden. Alles steht im Speicher des
  Browsers und ist nach dem Neuladen weg.
- **Kein Lauf** sagt etwas über die produktive Supabase-Instanz: nicht über
  RLS, nicht über Grants, nicht über das Verhalten der Storage-API.
- Die echte **Storage-API ist lokal nicht verfügbar.** Der
  Bescheinigungsablauf ist vollständig nachgebildet; dass er gegen den
  echten Speicher ebenso läuft, ist damit **nicht** gezeigt.
- Es wurde **keine E-Mail** versendet, **keine PDF** erzeugt, **keine
  PAJ-Anfrage** gestellt.
- Die Läufe prüfen die Designprobe. Der produktive Verwaltungsbereich unter
  `admin/` ist **unverändert** und von all dem nicht berührt.

---

## 35. Was jetzt wo steht

### Umgesetzt in der Designprobe

Alle sechzehn Punkte des Rundgangs. Die Blöcke 7 und 11 waren
Regressionsschutz und wurden gesichert, nicht verändert.

| Block | Umgesetzt |
|---|---|
| 1 | Erledigte aus der Arbeitsliste nehmen, ohne Löschen; Archiv; Wiedereröffnen; Protokoll mit vorherigem und neuem Listenstand |
| 2 | Chronologische Sortierung, eigener Abschnitt „Zeit noch nicht geklärt", stabile Zweitsortierung über die Kennung |
| 3 | Krankheit und Urlaub im Kalender führen zum konkreten Vorgang; mehrere Treffer → Auswahl; keiner → ehrlicher Hinweis |
| 4 | Fahrzeugtermine führen über die Fahrzeugkennung zur Akte, nicht über das Kennzeichen |
| 5 | Schichten einzeln mit Name, Zeit, Fahrzeug, Zustand, Planstatus |
| 6 | Ungültige Schichten als Konflikt, gleiche Zahl in Kalender, Planung und Übersicht |
| 7 | Kalenderfilter unverändert, als Regression gesichert |
| 8 | Kundenbereich vollständig bedienbar, ein gemeinsamer Bestand mit dem Fahrtassistenten |
| 9 | Personalbereich mit Akte; `personal` ist jetzt eine Sicht auf `mitarbeiter[]` |
| 10 | Finanzbereich mit Akte, Zahlung, Mahnung, Korrektur als neue Version |
| 11 | Lohnbereich unverändert, als Regression gesichert |
| 12 | Rewards mit Konten, Stufen, Glücksrad, manueller Korrektur |
| 13 | Analyse mit echter Zeitraumauswahl über Tageswerte |
| 14 | Eine Datenwahrheit für „Fahrten heute" und „noch nicht zugewiesen" |
| 15 | Warnungen richtig verknüpft, gleiche Zahl an drei Stellen |
| 16 | Bedienoptik nur bei echter Bedienbarkeit, Tastatur, Fokus, Beschriftung |

### Offene Geschäftsentscheidungen — nicht erfunden

1. Die Punktzahlen der Rewardsstufen unterhalb von VIP.
2. Mahnstufen, Mahngebühren und Zahlungsfrist.
3. Aufbewahrungs- und Löschfrist für Krankheitsnachweise — **rechtliche**
   Entscheidung.
4. Ob eine Rechnungskorrektur eine Gutschrift oder eine Neuausstellung ist.
5. Welche Ereignisse die Analyse überhaupt erheben darf — **rechtliche**
   Entscheidung; ohne sie bleibt der Bereich produktiv leer.
6. Ob auf der Karte eines erledigten Vorgangs ein Listenknopf stehen darf
   (siehe Abschnitt 33).

### Noch nicht im produktiven Portal vorhanden

Nichts davon. Es ist ausschließlich die Designprobe unter
`probe-betriebsportal/`. Der produktive Bereich `admin/` ist unverändert.

### Noch nicht gegen Supabase geprüft

- ob RLS fremde Daten tatsächlich abweist
- Verhalten der Storage-API für Bescheinigungen und Lohn-PDF
- die echten Rollen und Grants der produktiven Instanz
- Passwort-Zurücksetzen für Kunden
- SMTP mit SPF, DKIM und DMARC
- das ovale Glücksrad auf dem iPhone

---

## 36. Manueller Testweg

Vorschau: `npm run probe-portal`, dann im Browser die genannte Adresse.
Die Rolle wird oben rechts umgeschaltet. **Nichts davon verlässt den
Browser.**

### A. Analyse — der Zeitraum (Block 13)

1. Rolle **Testleitung 01 – Administration**, Bereich **Analyse**.
2. Oben steht der Kasten „Alle Zahlen hier sind erfunden". Lesen.
3. Im Abschnitt **Zeitraum** stehen sieben Knöpfe. „Letzte 7 Tage" ist
   gedrückt, und im Kopf steht der Zeitraum mit Von, Bis und Tageszahl.
4. Auf **Heute** klicken. Erwartung: Der Kopf nennt „Heute · 1 Tag", und
   **jede** Zahl auf der Seite wird kleiner — auch die Balken, auch die
   Quoten. Keine Zahl bleibt stehen.
5. Auf **Letzte 30 Tage**. Alle Zahlen steigen gemeinsam.
6. **Letzter Monat** wählen. Der Kopf nennt den vollen Vormonat.
7. **Eigener Zeitraum** wählen. Zwei Datumsfelder erscheinen. Erwartung:
   **Solange nur eines gefüllt ist, steht keine einzige Kennzahl da**,
   sondern die Bitte, beide Felder zu füllen.
8. Beide füllen, das Bis-Datum **vor** das Von-Datum setzen. Erwartung:
   Der Zeitraum wird gedreht, nicht als leer gewertet.
9. Beide auf denselben Tag setzen. Erwartung: „1 Tag", nicht „1 Tage".
10. Mit der **Tabulatortaste** auf einen Zeitraumknopf, mit **Enter**
    auslösen. Erwartung: wirkt wie ein Klick.
11. Mit der Maus über eine Kennzahlkachel fahren. Erwartung: **kein**
    Zeiger, **keine** Hervorhebung — sie führt nirgendwohin.
12. Prüfen, dass „Besucher" und „wiederkehrend" mit `~` und dem Wort
    **Schätzung** stehen, „Seitenaufrufe" und „Besuche" mit **gezählt**.

### B. Kunden (Block 8)

1. Bereich **Kunden**. Ein Zeichen eintippen. Erwartung: Hinweis
   „Mindestens zwei Zeichen eingeben".
2. `Testallee` eintippen. Erwartung: Treffer schon beim Tippen — gesucht
   wird auch in der **Anschrift**.
3. `testkunde03@example.invalid` eintippen. Erwartung: Treffer über die
   **E-Mail**.
4. Eine Suche eingeben, die **genau einen** Treffer hat, und **Enter**
   drücken. Erwartung: Die Kundenakte öffnet sich.
5. In der Akte: Anschrift, Kontostand, Fahrten, Rechnungen, Rewards. Eine
   Fahrt anklicken. Erwartung: Sie führt zum Vorgang.
6. **Neuen Kunden anlegen**. Zwei Schritte, Pflichtfelder Name und
   Telefon. Nach dem Speichern: Der Kunde steht in der Liste mit der
   Marke „neu in der Probe".
7. Jetzt **Neue Fahrt aufnehmen**, einen Kunden **neu** eingeben, bis
   Schritt 5 gehen. Erwartung: Dort steht „Kundenbestand: wird mit dem
   Speichern neu angelegt" — **noch nicht angelegt**.
8. Einen Schritt **zurück** und wieder **vor**, mehrfach. Dann speichern.
   Anschließend im Kundenbereich suchen. Erwartung: Der Kunde steht
   **genau einmal** da, nicht mehrfach.

### C. Personal, Finanzen, Rewards (Blöcke 9, 10, 12)

1. Rolle **Testpersonal 01**, Bereich **Personal**. Eine Zeile anklicken:
   Personalakte mit Beschäftigung, Vertrag, Urlaub, Schichten.
2. Erwartung: **keine** medizinische Angabe in der Akte und in der Liste.
3. Rolle **Testbuchhaltung 01**, Bereich **Finanzen**. Eine Rechnung
   anklicken: Posten, Zahlungen, Verlauf, PDF-Platzhalter.
4. **Zahlung erfassen**, dann **Mahnung**, dann **Korrektur**. Erwartung:
   Die Korrektur verlangt einen **Pflichtgrund** und erzeugt eine
   **neue Version**; die alte bleibt im Verlauf stehen.
5. Bereich **Rewards**: fünf Stufen, VIP ab 100 qualifizierenden Fahrten,
   200 Geburtstagspunkte. Die Ausschlüsse stehen als Kategorien da.
   Erwartung: Die Punktzahlen unterhalb von VIP sind **ausdrücklich als
   offen** gekennzeichnet, nicht mit einer Zahl gefüllt.
6. Als Buchhaltung eine **manuelle Rewardskorrektur** versuchen.
   Erwartung: nicht möglich. Als Administration: möglich, mit
   Pflichtgrund und Protokoll.

### D. Gegenprobe Disposition

Rolle **Testdisposition 01**. Erwartung: Die Bereiche Kunden, Personal,
Finanzen, Lohn, Rewards und Analyse sind **nicht** sichtbar. Eine
Krankmeldung öffnen: weder Dateiname noch Datei noch Prüfergebnis.

---

## 37. Ein Datumsfeld für das ganze Portal

### Der gemessene Ausgangsfehler

Beim Eingeben des Jahres sprang das Feld nach der ersten Ziffer zurück zum
Tag. Aus `02102026` wurde etwas wie `2026-02-00`. Eine normale Eingabe von
links nach rechts war nicht möglich.

### Die Ursache

Nicht unser Code, sondern das Verhalten von `<input type="date">`: Das Feld
hat innen drei Abschnitte und übernimmt jeden, sobald er „voll" scheint.
Genau derselbe Mangel wie bei `<input type="time">`, der dieses Portal
schon ein eigenes **Zeitmodul** gekostet hat.

Deshalb hilft kein Flicken an der Aufrufstelle. Es waren **zehn** solche
Felder an **fünf** Stellen:

| Datei | Felder |
|---|---|
| `probe-bereiche.js` | Planungsdatum, Analyse von, Analyse bis |
| `probe-kalender.js` | Kalendertag |
| `probe-team.js` | Planungsdatum in der Schichtleiste |
| `probe-vorgaenge.js` | Archivfilter von/bis, Neuzuordnung von/bis |
| `probe-fahrtassistent.js` | Datum der Fahrt |

### Was gebaut wurde

**Neu: `probe-datumsfeld.js`** (`window.ProbeDatum`), nach demselben Muster
wie das Zeitmodul. Ein gewöhnliches Textfeld mit eigener Prüfung:

- Eingabe von links nach rechts, nichts springt
- `02102026`, `2102026`, `02.10.2026`, `2.10.2026`, `02-10-2026`,
  `02/10/2026` und ISO `2026-10-02` werden angenommen
- **echte** Datumsprüfung: 31.02. ist ungültig, 29.02.2024 gültig,
  29.02.2026 nicht, 1900 kein Schaltjahr, 2000 schon
- ungültige Werte werden **nicht übernommen**; der Fehler steht am Feld,
  mit `aria-invalid` und `aria-describedby`
- Enter übernimmt nur Gültiges, Escape verwirft die laufende Änderung
- beim Betreten wird ein vorhandener Wert markiert
- 16 px Schriftgröße — darunter zoomt iOS beim Fokus hinein

**Nach außen immer ISO, angezeigt immer TT.MM.JJJJ.** Der Bestand rechnet
mit ISO; der Mensch liest TT.MM.JJJJ. Beides getrennt zu halten verhindert,
dass ein Anzeigeformat in die Daten sickert.

**Eine Anmeldung für das ganze Portal.** `ProbeDatum.anmelden()` wird genau
einmal in `probe-bereiche.js` gerufen und verteilt nach Kennung an Planung,
Kalender, Analyse, Archivfilter, Neuzuordnung und Fahrtaufnahme. Eine
Eigenlösung daneben kann es nicht mehr geben, weil es **kein natives
Datumsfeld mehr gibt** — der Prüflauf zählt in allen Rollen und allen
Bereichen nach: null.

### Zwei eigene Fehler, die der Prüflauf gefunden hat

1. **Das Markieren beim Betreten löschte die Eingabe.** `select()` lief in
   einem `requestAnimationFrame`, also **nach** dem ersten Tastendruck, und
   markierte dann die schon getippte Ziffer — die der nächste Anschlag
   ersetzte. Aus `01092026` wurde `2026`. Behoben: Markiert wird nur, wenn
   seit dem Betreten nichts getippt wurde. **Derselbe Fehler steckte im
   Zeitmodul** und ist dort mit behoben — ihn nur an einer Stelle zu
   beheben hieße, ihn an der anderen stehen zu lassen.
2. **Der Fokusmerker traf das falsche Feld.** `fokusMerken()` nahm den
   ersten Datensatzschlüssel des Elements — bei
   `data-datum`/`-kennung`/`-teil` also `datum` mit leerem Wert — und baute
   daraus `[data-datum]`. Bei den zwei Datumsfeldern der Analyse traf das
   immer das erste. Nach dem Neuzeichnen saß der Fokus im Von-Feld, obwohl
   er im Bis-Feld war. Behoben: Eine `id` ist eindeutig und wird bevorzugt.

---

## 38. Der Kalenderfilter: ein Klick statt sechs

### Der gemessene Ausgangsfehler

Jeder Klick schaltete **genau eine** Kategorie um. Wer nur die
Abwesenheiten sehen wollte, musste fünf andere Filter einzeln ausschalten.

### Was geändert wurde

Ein Klick wählt die Kategorie **allein** aus. Ein zweiter Klick auf
dieselbe Kategorie führt zu „alle" zurück. Damit sind beide häufigen
Absichten je ein Klick.

Geprüft wird gegen die **sichtbaren** Kategorien, nicht gegen alle: Wer die
Dokumentfristen nicht sehen darf, soll mit dem zweiten Klick nicht in einen
Zustand geraten, in dem eine unsichtbare Kategorie eingeschaltet ist.

Die Leiste sagt jetzt auch, was der Klick tut — über `aria-label` und über
einen Satz darunter: „Alle Kategorien sind sichtbar. Ein Klick auf eine
Kategorie zeigt nur diese." beziehungsweise „Eingeschränkt auf … Noch ein
Klick auf dieselbe Kategorie zeigt wieder alle."

Der Prüflauf belegt für **alle sechs** Kategorien beide Richtungen, dass
der Filter **keine Daten** ändert (Planung, Abwesenheiten und Fahrzeuge
sind vorher und nachher byteweise gleich), dass Ansicht, Datum und Filter
ein Neuzeichnen überleben, und dass ein erfundener Filtername über den
direkten Aufruf nichts bewirkt.

---

## 39. Herkunft und Rückweg

### Der gemessene Ausgangsfehler

Kalendereinträge öffneten inzwischen den richtigen Datensatz, aber die
Zielseite wurde bereits im Hintergrund gewechselt:

- Krankmeldung aus dem Kalender → beim Schließen in **Meldungen**
- Fahrzeugtermin aus dem Kalender → beim Schließen in **Fahrer &
  Fahrzeuge**

### Die Ursache

`kal-ziel` rief `R.geheZu(bereich)`. Der Bereichswechsel **war** der Weg
zum Datensatz, und danach gab es keinen Weg zurück — die Herkunft war
nirgends festgehalten.

### Was gebaut wurde

Eine **Herkunft** im Rahmen: `{ bereich, name, wiederherstellen, scroll,
scrollHaupt }`. Der Kalender legt sie an, bevor er wechselt, und sichert
dabei Ansicht, Datum und Filter — die Filter werden **kopiert**, nicht
verwiesen; ein Verweis hätte spätere Änderungen mitgenommen und wäre damit
kein Zustand, sondern nur ein Zeiger.

`R.geheZuMitHerkunft()` wechselt mit festgehaltener Herkunft.
`dialogSchliessen()` kehrt danach dorthin zurück — damit gilt es für
**Schließen, Escape und den Knopf** gleichermaßen, ohne dass jeder Dialog
es einzeln können muss.

Der Knopf **„Zurück zum Kalender"** wird in `dialogOeffnen()` eingesetzt —
an **einer** Stelle für jedes Fenster. In jedem Dialog einzeln hätte jeder
neue Dialog die Chance, ihn zu vergessen.

**Keine pauschale Rücksprungseite:** Wer einen Datensatz direkt in seinem
Fachbereich öffnet, setzt keine Herkunft — dann führt Schließen wie bisher
dorthin zurück. Und ein ausdrücklicher Bereichswechsel (`geheZu`) **gibt
die Herkunft auf**; sonst hätte das Schließen eines späteren Fensters in
einen Bereich zurückgesprungen, den der Mensch längst verlassen hat.

### Die beiden ausdrücklich genannten Fälle

| Fall | Ergebnis |
|---|---|
| Krankmeldung **Testfahrer 02 vom 03.10.2026** | öffnet `V0002`; Schließen, Escape und der Knopf führen in den Kalender zurück — Tagesansicht, 03.10.2026, alle Filter wie vorher |
| Fahrzeugtermin **Testwagen 01 vom 20.10.2026** | öffnet die Akte von `F01` mit hervorgehobenem Service-Termin; Escape führt in den Kalender vom 20.10.2026 zurück |

---

## 40. Die Fahrzeugakte widerspricht sich nicht mehr

### Der gemessene Ausgangsfehler

Beim Fahrzeugtermin Testwagen 01 am 20.10.2026 stand **gleichzeitig**:

- oben „Unterwegs"
- „Aktueller Zustand: Frei"
- „Heute zugewiesen: Testfahrer 01"

### Die Ursache — drei Bezugspunkte ohne Beschriftung

| Angabe | woher sie kam |
|---|---|
| die Marke oben | `fahrzeugLage(planEntwurf(), f)` — aus dem Plan des Tages, den die **Planung** gerade offen hatte |
| „Aktueller Zustand" | `f.zustand`, der Stammzustand, der zu **keinem** Tag gehört |
| „Heute zugewiesen" | ebenfalls aus dem Entwurf, hieß aber „heute" — und wenn die Planung auf einem anderen Tag stand, meinte es einen **dritten** Tag |

### Was geändert wurde

Jede Zeile nennt jetzt ihren Bezug, und jeder Tag steht mit konkretem
Datum da:

- **Zustand im Fahrzeugstamm** — „gilt dauerhaft, nicht für einen
  einzelnen Tag"
- **Einsatz heute, Freitag, 02.10.2026** — „aus dem veröffentlichten Plan
  für heute"
- **Einsatz am Dienstag, 20.10.2026** — „der im Kalender gewählte Tag —
  nicht heute"

Gelesen wird der **gespeicherte** Plan, nicht der Entwurf. Ein Entwurf
gehört zu dem Tag, den die Planung offen hat; er sagt nichts über den
20.10.

**Ein Widerspruch ist damit nicht mehr konstruierbar**, weil es keine
Angabe ohne Bezugstag gibt. Der Prüflauf belegt das strukturell: Die
Begriffe „Aktueller Zustand" und „Heute zugewiesen" dürfen **nicht
vorkommen**, und jede Einsatzzeile **muss** ein Datum im Format TT.MM.JJJJ
tragen.

**Nebenbefund, ehrlich benannt:** Im Testbestand stehen M01 und M05
gleichzeitig auf F01 (beide 06:00–14:00). Die Akte zählte das vorher flach
auf und ließ es normal aussehen. Jetzt heißt es „mehrfach vergeben, siehe
Konflikt", mit einem eigenen Kasten: „Das ist ein Konflikt der Planung,
nicht eine Eigenschaft des Fahrzeugs."

---

## 41. Keine Kundennummern, dafür Firmenkunden mit Fahrgast

### Der gemessene Ausgangsfehler

In der Oberfläche standen Kundennummern (`KD-0003`). Im Betrieb werden
keine verwendet. Und bei einem Firmenkunden fehlte jede Angabe zur
tatsächlich beförderten oder zuständigen Person.

### Was geändert wurde

**Das Feld `kundennummer` ist aus dem Datenmodell entfernt** — an allen
sieben Stellen, auch bei den tausend erzeugten Testkunden. Es stand nur
deshalb da, weil ich es für die Verknüpfung gebraucht zu haben glaubte;
verknüpft wird aber über `id`.

**Die technische Kennung bleibt intern und wird nirgends gezeigt.** Weder
als „Kundennummer" noch als „Kennung". Der Grund: Eine Nummer, die in der
Akte steht, wird genannt — und ist damit eine betriebliche Kundennummer,
auch wenn sie anders heißt. Sie ist auch **kein Suchbegriff**: Sonst wäre
sie über die Suche doch wieder eine Nummer. Der Prüflauf durchsucht die
sichtbaren Texte von Kunden, Finanzen, Rewards, Fahrten, Übersicht,
Kundenakte, Rewardskonto, Rechnungsakte, Fahrtaufnahme und Trefferliste auf
`KD-\d`, das Wort „Kundennummer" und `K\d{4}` — nichts davon kommt vor.

**An ihrer Stelle steht, was im Betrieb hilft:** in der Kundenliste der
Ansprechpartner (bei Privatkunden ein Strich), in der Rewardsliste der Ort,
in der Trefferliste der Fahrtaufnahme die Anschrift.

### Verknüpfungen laufen nie über den Namen

Vorher hatten `rechnungenVonKunde` und `rewardsVonKunde` einen **Rückfall
auf den Namen**, und `fahrtenVonKunde` lief **ausschließlich** über ihn.
Das ist weg:

- jede Fahrt trägt `kundeId` (eine Gastfahrt bewusst leer)
- jede Rechnung und jedes Rewardskonto tragen `kundeId`
- `rewardskontoVon()` nimmt jetzt die Kennung, nicht den Namen

Der Prüflauf legt einen **zweiten Kunden mit demselben Namen** an und
belegt, dass er keine fremden Fahrten, Rechnungen oder Rewardskonten
einsammelt. Hängt ein Beleg an keiner Kennung, taucht er bei keinem
gleichnamigen Kunden auf — eine Beziehung, die niemand hergestellt hat,
soll die Oberfläche nicht erfinden.

### Firmenkunde und Fahrgast sind zwei verschiedene Dinge

| Angabe | wo sie steht |
|---|---|
| Firma (Pflicht), Telefon (Pflicht), Ansprechpartner, Abteilung, E-Mail, Anschrift, betrieblicher Hinweis | am **Kunden** |
| Fahrgast / Ansprechpartner | an der **einzelnen Fahrt** |

Die Firma ist der Auftraggeber; der Fahrgast wechselt von Fahrt zu Fahrt.
Beides in ein Feld zu legen hieße, eine Fahrt der falschen Person
zuzuordnen. Die Akte und die Fahrtaufnahme sagen das ausdrücklich, und die
Zusammenfassung vor dem Speichern nennt beide getrennt: „Auftraggeber
(Firma)" und „Fahrgast / Ansprechpartner". Die Fahrt bleibt mit dem
Firmenkunden verknüpft.

Das Feld ist **nicht Pflicht** — keine Angabe ist erlaubt, dann fährt
niemand namentlich mit. **Kein medizinisches Freitextfeld** kam dazu; das
Feld trägt den ausdrücklichen Hinweis, dass dort keine Gesundheitsangabe
hingehört.

### Die Pflichtfeldprüfung

Der geprüfte Ablauf bleibt unverändert: Abbrechen legt nichts an, „Zurück
und ändern" erhält alle Eingaben, erst „Verbindlich anlegen" erzeugt genau
einen Kunden, und er ist sofort in Suche und Fahrtaufnahme verfügbar.

Verbessert: Der Fehler steht jetzt **direkt am Feld** (`aria-invalid`,
`aria-describedby`), der Fokus springt auf das **erste** ungültige Feld, und
der zusammenfassende Hinweis bleibt zusätzlich. Vorher musste man aus
„Bitte ausfüllen: Telefonnummer" selbst heraussuchen, welches Feld gemeint
war.

---

## 42. Eine bezahlte Rechnung ist abgeschlossen

### Der gemessene Ausgangsfehler

Bei `RE-2026-0001` mit Zustand „bezahlt" waren **Zahlung erfassen** und
**Mahnung vorbereiten** aktiv.

### Die Ursache

Die Knöpfe hingen allein an `finance.write`. Der **Zustand** der Rechnung
kam in der Entscheidung nicht vor — weder in der Anzeige noch in der
Aktion.

### Was geändert wurde

Eine Funktion `rechnungSperre(r, art)` an **einer** Stelle, gefragt von der
Anzeige **und** von der Aktion. Deshalb bleibt ein direkter Aufruf von
`ak-zahlung` auf eine bezahlte Rechnung wirkungslos — ein fehlender Knopf
ist kein Schutz. Zusätzlich wird unmittelbar **vor dem Schreiben** noch
einmal geprüft: Zwischen dem Öffnen des Fensters und dem Klick kann die
Rechnung bezahlt worden sein.

Eine **Korrektur als neue Version** bleibt möglich — sie überschreibt
nichts, sondern stellt richtig.

Die Akte sagt auch, **warum** die Knöpfe fehlen. Eine stumme Sperre ist
keine Erklärung.

### Offene Geschäftsentscheidung

**Rückzahlung, Überzahlung und Storno sind nicht festgelegt** und werden
nicht erfunden. Die Sperrmeldung benennt das ausdrücklich: „Rückzahlung und
Überzahlung sind noch nicht festgelegt — bitte zuerst entscheiden lassen."

---

## 43. Rückweg in den Finanzdialogen

### Der gemessene Ausgangsfehler

Nach einem versehentlichen Klick auf „Zahlung erfassen", „Mahnung
vorbereiten" oder „Korrektur als neue Version" gab es nur „Schließen" —
die Rechnung war weg und musste neu gesucht werden.

### Was geändert wurde

Jede Finanzaktion hat jetzt in **beiden** Stufen:

- **Zurück zur Rechnung** — führt in die Akte, ohne etwas zu speichern
- **Abbrechen / Schließen** — verlässt das Fenster
- **Escape** wirkt wie „Zurück zur Rechnung", nicht wie „hinaus"
- bei begonnener Eingabe kommt vor dem endgültigen Verlassen eine
  Sicherheitsabfrage (`ProbeAkten.offeneEingabe()` meldet das dem Rahmen,
  wie es Team und Vorgänge schon tun)

**Gespeichert wird erst nach der letzten Prüfung.** Der Prüflauf belegt für
alle drei Aktionen, dass auf dem Rückweg weder eine Zahlung noch ein
Verlaufseintrag entsteht.

### Ein eigener Fehler, den der Prüflauf gefunden hat

„Zurück zur Rechnung" behielt den Entwurf — aber das **erneute Öffnen** der
Aktion legte einen neuen an und warf ihn damit weg. Der Rückweg war so nur
die halbe Zusage. Behoben: Dieselbe Aktion auf derselben Rechnung führt den
begonnenen Entwurf weiter. Eine **andere** Aktion oder eine andere Rechnung
fängt neu an — ein Betrag aus einer Zahlung hat in einer Mahnung nichts zu
suchen.

---

## 44. Erledigte Vorgänge: eine Rückmeldung mit Rückgängig

Das geprüfte Verhalten bleibt vollständig erhalten: nichts wird gelöscht,
der Vorgang steht weiter unter „Alle" und im Archiv, Zeitpunkt und
handelnde Person bleiben protokolliert, „Zurück in die Arbeitsliste" stellt
ihn wieder her, und „Wiedereröffnen" ist eine getrennte fachliche Aktion.

**Neu:** Nach dem Entfernen erscheint eine kurze Rückmeldung mit
**Rückgängig**. Sie sagt ausdrücklich, dass nichts gelöscht wurde, und wo
der Vorgang jetzt steht.

Sie hängt am Vorgang, **nicht an einer Zeitschaltung**: Eine Rückmeldung,
die nach fünf Sekunden verschwindet, hat jemand, der langsamer liest, nie
gesehen. Sie verschwindet, wenn der Vorgang zurückgeholt wurde — dann wäre
sie eine Unwahrheit — oder wenn man sie wegklickt.

---

## 45. Einstellungen → Rollen & Rechte

### Was gebaut wurde

**Neu: `probe-einstellungen.js`** und ein Bereich **Einstellungen**, der
`security.write` verlangt. In dieser Probe hat das ausschließlich die
Administration.

**Rolle und einzelne Freigabe bleiben getrennt:**

- `rollenRechte[rolle]` gilt für **alle** Konten dieser Rolle
- `kontoRechte[kennung]` sind **zusätzliche** Freigaben für ein Konto
- `FAEHIGKEITEN` bleibt unverändert als **Ausgangsverteilung** — daran
  zeigt die Oberfläche, was jemand geändert hat

Ohne diese Trennung wäre nach einer Weile nicht mehr erkennbar, ob jemand
ein Recht aus seiner Rolle hat oder weil es ihm einmal einzeln gegeben
wurde. Im Bearbeitungsfenster sind Rechte, die aus der Rolle kommen,
abgesetzt und gesperrt dargestellt.

**Verstecken ist kein Schutz.** Jede Aktion (`es-rolle`, `es-konto`,
`es-weiter`, `es-zurueck`, `es-ja`) prüft `security.write` **selbst**. Der
Prüflauf ruft für Disposition, Personal, Buchhaltung und Mitarbeiter alle
fünf Aktionen direkt auf: kein Recht ändert sich, kein Fenster öffnet sich.

**Navigation und Aktion folgen derselben Fähigkeit.** Der Prüflauf nimmt
der Buchhaltung `analytics.read`, und danach ist der Bereich nicht nur aus
der Navigation verschwunden — ein direkter Sprung dorthin wird abgewiesen.

**Die letzte Administration bleibt handlungsfähig.** Geprüft wird nicht
„bin ich noch drin", sondern „gibt es **danach** noch irgendein Konto, das
`security.write` **und** `self.read` hat". Das ist der Unterschied zwischen
einer Höflichkeit und einem Schutz: Auch wer einem **anderen**
Administrationskonto das Recht nimmt, darf das letzte nicht treffen. Die
Prüfung läuft beim Zeichnen **und** unmittelbar vor dem Schreiben — ein
direkter Aufruf hat die Anzeige nie gesehen.

**Letzte Prüfung und Protokoll.** Vor dem Speichern: betroffene Rolle
beziehungsweise betroffenes Konto, vorher, nachher, was dazukommt, was
entzogen wird, wer danach noch Rechte verwalten kann, das handelnde Konto
und ein **Pflichtgrund**. Protokolliert werden Name, Kennung, Rolle, Datum,
Uhrzeit, Ziel, vorher, nachher und Grund. Eine spätere Korrektur kommt als
**neuer Eintrag** dazu; ein bestehender wird nie überschrieben.

### Wo die Wunschliste feiner ist als das Modell — offen gekennzeichnet

Die genannten Fähigkeiten „Fahrten sehen" und „Planung sehen" sind im
Modell **ein** Recht (`operations.read`); ebenso „Personal sehen" und
„Krankheitszeiträume sehen" (`personnel.read`) sowie „Personal bearbeiten"
und „Gesundheitsdokumente prüfen" (`personnel.write`).

Das steht **in der Oberfläche an jeder betroffenen Zeile** und unter
„Offene Entscheidungen". Es wird **nicht** stillschweigend aufgeteilt: Eine
Aufteilung von `operations.read` müsste an 27 Stellen entschieden werden,
und eine falsche Einordnung versteckt eine funktionierende Ansicht, ohne
dass es auffällt. Ob die Aufteilung kommen soll, ist eine Entscheidung, die
ich nicht treffe.

Ebenfalls offen und so gekennzeichnet: die genaue spätere Verteilung für
Buchhaltung, Personal und Disposition, und ob für die Rechtevergabe ein
Vieraugenprinzip gelten soll.

---

## 46. Zwei getrennte Administrationskonten

Für den Start sind zwei Personen als Administration vorgesehen. In der
Designprobe stehen sie als **Testidentitäten**:

| Kennung | Name | Rolle |
|---|---|---|
| `U-ADM-01` | Enes Carman | Administration |
| `U-ADM-02` | Fatih Duman | Administration |

**Kein gemeinsames Administrationskonto.** Bei einem gemeinsamen Konto
steht im Protokoll nur „Administration", und niemand kann sagen, wer
gehandelt hat.

Die Kontowahl erscheint im Banner, aber nur dort, wo es für eine Rolle mehr
als ein Konto gibt — ein Auswahlfeld mit einem einzigen Eintrag ist eine
Bedienung, die nichts bedient. `benutzer()` nennt jetzt das **Konto** statt
der Rolle; im Protokoll stehen Name, Kennung, Rolle, Datum und Uhrzeit.

Der Prüflauf lässt **beide** Konten dieselbe Aktion ausführen und belegt,
dass die beiden Protokolleinträge unterscheidbar sind.

**Es wird kein echtes Konto angelegt**, kein Passwort hinterlegt und nichts
in Supabase verändert. Zugangsdaten stehen weder in den Testdaten noch im
Protokoll — ein Protokoll ist kein Ort für Geheimnisse. Der Prüflauf sucht
in beiden nach `passwort|password|kennwort|token|secret|schluessel`.

---

## 47. Analyse nach dem Umbau

Die funktionierende Berechnung ist **unberührt**: Heute 180 Seitenaufrufe,
letzte 30 Tage 5.724, und alle Kennzahlen reagieren gemeinsam. Der Prüflauf
belegt beide Zahlen ausdrücklich und vergleicht nach dem Umbau, dass „Letzte
30 Tage" **genau dieselben** Werte zeigt wie vorher.

Mit dem gemeinsamen Datumsfeld geprüft:

| Eingabe | Verhalten |
|---|---|
| nur Startdatum | keine Kennzahl, Bitte beide Felder zu füllen |
| nur Enddatum | keine Kennzahl |
| gültiger Zeitraum | alle Kennzahlen, Balken und Quoten gemeinsam |
| **Ende vor Beginn** | **Fehler**, keine Kennzahl, keine Tageszahl im Kopf |
| unmögliches Datum (31.02.) | keine Kennzahl, Fehler am Feld |

**Geändertes Verhalten, ausdrücklich benannt:** Ein verdrehter Zeitraum
wurde vorher stillschweigend **gedreht**. Der Geschäftsführer hat danach
einen **Fehler** verlangt. Das ist auch das bessere Verhalten: Wer „01.10."
bis „01.09." eintippt, hat sich vertippt und soll das sehen, statt stumm
eine andere Auswertung zu bekommen, als er gemeint hat. Die alte Erwartung
in `probe-analyse-pruefen` („eine verdrehte Eingabe wird gedreht, nicht als
leer gewertet") gilt damit nicht mehr und ist angepasst.

**Nie teilweise alte Zahlen:** Bei unvollständigem oder verdrehtem Zeitraum
wird **gar keine** Kennzahl gezeichnet. Der Prüflauf prüft die Anzahl der
Kennzahlkacheln auf null — eine stehengebliebene alte Zahl wäre damit
sichtbar.

---

## 48. Eigene Fehler und veraltete Prüferwartungen

Getrennt aufgeführt, wie verlangt.

### 48.1 Eigene Umsetzungsfehler

| Fehler | Wirkung | Gefunden von |
|---|---|---|
| `select()` im `requestAnimationFrame` beim Betreten eines Datums- oder Zeitfeldes | Wer sofort nach dem Klick tippte, verlor die ersten Zeichen: aus `01092026` wurde `2026` | eigener Prüflauf |
| `fokusMerken()` baute den Wähler aus dem ersten Datensatzschlüssel | Bei zwei Datumsfeldern nebeneinander sprang der Fokus nach dem Neuzeichnen immer ins **erste** | eigener Prüflauf |
| `stand.datum` der Fahrtaufnahme war leer, nachdem `data-feld="datum"` wegfiel | Das Feld zeigte „heute", `schrittFehler(4)` verlangte trotzdem ein Datum | beim Bauen bemerkt |
| `datumFehler` fehlte im Anfangszustand des Kalenders | Zwei Zustände, die gleich sind, sahen beim Vergleich verschieden aus | eigener Prüflauf |
| `ak-zahlung` legte beim erneuten Öffnen einen neuen Entwurf an | „Zurück zur Rechnung" behielt die Eingabe, das Wiederöffnen warf sie weg — der Rückweg war nur die halbe Zusage | eigener Prüflauf |

Die ersten beiden sind **dieselbe Art Fehler**: eine Annahme darüber, was
zwischen zwei Bildern passiert. Beide steckten auch im **Zeitmodul** und
sind dort mit behoben — ihn nur an einer Stelle zu beheben hieße, ihn an der
anderen stehen zu lassen.

### 48.2 Fehler in meinen eigenen Prüfläufen

Diese gehören getrennt, weil sie **nichts** über die Oberfläche sagen:

1. **Der Filter blieb eingeschränkt.** Ein vorheriger Abschnitt hatte den
   Kalender auf „nur Abwesenheiten" gestellt. Am 20.10. stand dann nichts
   da — nicht weil der Fahrzeugtermin fehlte, sondern weil er ausgefiltert
   war. Erst „alle", dann suchen.
2. **Dreimal „Weiter" reicht nicht.** Eine Gastfahrt braucht Abhol- und
   Zieladresse. Der Assistent blieb zu Recht in Schritt 2 stehen; mein
   Prüflauf hielt das für einen Mangel.
3. **„30 Tage" steht auch auf dem Knopf.** Ich habe den ganzen
   Flächentext durchsucht statt nur den Kopf.
4. **„Supabase" steht im Kopfkommentar.** Mein Modul sagt ausdrücklich
   „kennt weder Supabase noch fetch" — und meine Suche nach `supabase`
   schlug darauf an. Jetzt wird im Code **ohne Kommentare** gesucht.
5. **`innerText` liefert die CSS-Großschreibung.** Die Konfliktliste setzt
   ihre Überschriften per CSS in Großbuchstaben; dort stand „WIRD
   ENTZOGEN", und meine Suche nach `/wird entzogen/` fand nichts. Die
   Oberfläche war richtig, meine Suche war es nicht.
6. **`page.fill()` mit einem ISO-Datum** geht am neuen Feld vorbei — es
   nimmt TT.MM.JJJJ. Die Prüfläufe tippen jetzt Zeichen für Zeichen, so wie
   ein Mensch.

### 48.3 Veraltete Prüferwartungen — angepasst mit Begründung

Jede Anpassung steht als Kommentar **im Prüflauf selbst**, nicht nur hier.

| Lauf | Alte Erwartung | Weshalb sie nicht mehr gilt | Neue, strengere Erwartung |
|---|---|---|---|
| `probe-portal` | „Administration sieht alle zwölf Bereiche" | Der dreizehnte Bereich (Einstellungen) wurde ausdrücklich verlangt. Eine feste Zahl hält ohnehin nur fest, **wie viele** Bereiche es gibt, nicht **welche** | die **Menge** der Bereiche, und dass Einstellungen an `security.write` hängt |
| `probe-fahrt` | Der Platzhalter nennt „Name, Telefonnummer oder Kundennummer" | Es gibt keine Kundennummern mehr. Ein Platzhalter, der nach einer Nummer fragt, die es nicht gibt, schickt in die Irre | er nennt Name und Telefonnummer **und keine** Kundennummer |
| `probe-fahrt` | Die Suche findet Testkunde 03 über `KD-0003` | dieselbe Änderung | sie findet ihn über die **Anschrift**, und die technische Kennung findet **nichts** |
| `probe-akten` | Suche „nach der Kundennummer"; Enter-Treffer über `KD-0002`; der Hinweis nennt „Kundennummer"; die Akte zeigt Kundennummer **und** Kennung | dieselbe Änderung. Eine Nummer, die in der Akte steht, wird dem Kunden genannt — und ist damit eine betriebliche Kundennummer, auch wenn sie „Kennung" heißt | Suche nach **Firma**, Enter über die **Telefonnummer**, der Hinweis ohne Nummer, die Akte ohne beides — und ausdrücklich: die Kennung ist **kein** Suchbegriff |
| `probe-akten` | „er hat eine Kundennummer" | dieselbe Änderung | er hat eine stabile **technische Kennung**, und `kundennummer` existiert nicht |
| `probe-analyse` | „eine verdrehte Eingabe wird gedreht, nicht als leer gewertet" | Der Geschäftsführer hat danach ausdrücklich einen **Fehler** verlangt. Das ist auch das bessere Verhalten: Wer sich vertippt, soll das sehen, statt stumm eine andere Auswertung zu bekommen. Eine Eingabe stillschweigend zurechtzubiegen ist eine Annahme über die Absicht | **Fehlermeldung**, keine Kennzahl, keine Tageszahl — und in der richtigen Reihenfolge wieder dieselben Zahlen |
| `probe-analyse` | „beide sind echte Datumsfelder" (`type="date"`) | das native Feld ist portalweit ersetzt | beide gehören zum **gemeinsamen Modul** — sonst wäre auch eine Eigenlösung erlaubt |

**Keine** dieser Anpassungen macht einen Lauf schwächer. In fünf Fällen
prüft er danach mehr als vorher.

---

## 50. Alle sechzehn Prüfläufe, vollständig gefahren

Stand 02.10.2026. Jeder Lauf wurde bis zur gedruckten Abschlussbilanz
gefahren. Ein Lauf ohne Bilanz gilt nicht als bestanden.

| Prüflauf | Ergebnis |
|---|---|
| `probe-portal-pruefen` | **114 bestanden, 0 offen** |
| `probe-fahrt-pruefen` | **172 bestanden, 0 offen** |
| `probe-planung-pruefen` | **171 bestanden, 0 offen** |
| `probe-team-pruefen` | **197 bestanden, 0 offen** |
| `probe-vorgaenge-pruefen` | **138 bestanden, 0 offen** |
| `probe-teilung-pruefen` | **105 bestanden, 0 offen** |
| `probe-dokument-pruefen` | **93 bestanden, 0 offen** |
| `probe-regeln-pruefen` | **123 bestanden, 0 offen** |
| `probe-zuordnung-pruefen` | **126 bestanden, 0 offen** |
| `probe-karten-pruefen` | **88 bestanden, 0 offen** |
| `probe-wahrheit-pruefen` | **78 bestanden, 0 offen** |
| `probe-kalenderwege-pruefen` | **109 bestanden, 0 offen** |
| `probe-akten-pruefen` | **243 bestanden, 0 offen** |
| `probe-analyse-pruefen` | **123 bestanden, 0 offen** |
| `probe-datum-pruefen` (neu) | **162 bestanden, 0 offen** |
| `probe-rechte-pruefen` (neu) | **218 bestanden, 0 offen** |
| **Summe** | **2 260 bestanden, 0 offen** |

In allen sechzehn Läufen: **null Anfragen nach außen.** Jeder
Browserkontext bricht jede Verbindung ab, die nicht auf den eigenen
Testserver zeigt, und zählt sie. Die Zähler stehen am Ende jedes Laufs
bei 0.

### Was in diesem Durchgang dazukam

| Punkt | wo belegt |
|---|---|
| gemeinsames Datumsmodul in allen betroffenen Bereichen | `probe-datum` 1–3 |
| vollständige Tastaturbedienung der Datumsfelder | `probe-datum` 2 |
| Einzelfilter und Rückkehr zu „alle", alle sechs Kategorien, beide Richtungen | `probe-datum` 4, `probe-kalenderwege` 8 |
| Kalenderherkunft mit Datum, Ansicht, Filtern und Scrollposition | `probe-datum` 5 |
| Rückweg für jede Kalenderkategorie, Schließen/Escape/Knopf | `probe-datum` 5 |
| keine widersprüchlichen Fahrzeugzustände | `probe-datum` 5, `probe-kalenderwege` 7 |
| keine sichtbaren betrieblichen Kundennummern (10 Ansichten) | `probe-rechte` 1 |
| technische Kunden-ID bleibt stabil, gleichnamiger Kunde sammelt nichts ein | `probe-rechte` 2 |
| Firmenkunde und Fahrgast getrennt geführt | `probe-rechte` 3 |
| bezahlte Rechnung blockiert Zahlung und Mahnung, auch direkt aufgerufen | `probe-rechte` 4 |
| Finanzdialoge mit Rückweg, Eingaben erhalten | `probe-rechte` 5 |
| entfernte Vorgänge bleiben gespeichert und wiederherstellbar | `probe-rechte` 6 |
| zwei Admin-Testidentitäten mit unterscheidbaren Protokollen | `probe-rechte` 7 |
| Rollenfähigkeiten greifen in Navigation **und** Aktion | `probe-rechte` 8, 10 |
| Administration kann sich nicht selbst aussperren | `probe-rechte` 9 |
| keine Diagnose, kein medizinischer Freitext, keine Zugangsdaten | `probe-rechte` 7, 11 |
| 320, 390, 430 und 1440 px ohne Überlauf | `probe-datum` 7, `probe-rechte` 11 |
| null Netzaufrufe | alle sechzehn Läufe |

### Was diese Zahlen nicht sagen

- Es ist **keine Datenquelle** angebunden. Alles steht im Speicher des
  Browsers und ist nach dem Neuladen weg.
- **Kein Lauf** sagt etwas über die produktive Supabase-Instanz: nicht
  über RLS, nicht über Grants, nicht über das Verhalten der Storage-API.
- Die **Rechteverwaltung ist eine Vorführung.** Es wird keine
  Supabase-Rolle angelegt, kein Grant vergeben und keine RLS-Policy
  geändert. Dass dieselbe Rechtelogik serverseitig greift, ist damit
  **nicht** gezeigt — und genau das wäre im Betrieb der entscheidende
  Teil: Eine Prüfung im Browser schützt nichts.
- Die zwei Administrationskonten sind **Testidentitäten**. Es gibt kein
  echtes Konto, kein Passwort, keine Anmeldung.
- Es wurde **keine E-Mail** versendet, **keine PDF** erzeugt, **keine
  PAJ-Anfrage** gestellt.
- Der produktive Verwaltungsbereich unter `admin/` ist **unverändert**.

### Noch nicht gegen Supabase geprüft

- ob RLS fremde Daten tatsächlich abweist
- ob die hier geschalteten Fähigkeiten serverseitig Entsprechungen haben
- Verhalten der Storage-API für Bescheinigungen und Lohn-PDF
- die echten Rollen und Grants der produktiven Instanz
- Passwort-Zurücksetzen für Kunden
- SMTP mit SPF, DKIM und DMARC
- das ovale Glücksrad auf dem iPhone

---

## 51. Manueller Testweg

Vorschau: `npm run probe-portal`, dann die genannte Adresse im Browser.
Rolle und Konto stehen oben im Banner. **Nichts davon verlässt den
Browser.**

### A. Das Datumsfeld (Block 1)

1. Rolle **Administration**, Bereich **Kalender**. Ins Datumsfeld klicken.
2. `20102026` tippen — Ziffer für Ziffer hinsehen. Erwartung: Jede Ziffer
   landet rechts, **nichts springt**, der Fokus bleibt im Feld.
3. **Enter**. Erwartung: Das Feld zeigt `20.10.2026`, und der Kalender
   steht auf diesem Tag.
4. `31.02.2026` tippen, Enter. Erwartung: **Nicht übernommen.** Unter dem
   Feld steht „Der Monat 02.2026 hat 28 Tage."
5. `29.02.2024` eintragen. Erwartung: angenommen — ein Schaltjahr.
6. Irgendetwas tippen und **Escape** drücken. Erwartung: Der letzte gültige
   Wert kommt zurück, und **nichts schließt sich**.
7. Dasselbe in **Planung**, **Analyse → Eigener Zeitraum**, **Meldungen →
   Archiv** und in der **Fahrtaufnahme, Schritt 4**. Erwartung: überall
   dasselbe Feld, dasselbe Verhalten.

### B. Kalenderfilter und Rückweg (Blöcke 2–4)

1. Bereich **Kalender**, Datum **03.10.2026**, Tagesansicht.
2. Einmal auf **Abwesenheiten** klicken. Erwartung: **Nur** Abwesenheiten
   bleiben gold, alle anderen aus — ein Klick, nicht sechs.
3. Noch einmal auf **Abwesenheiten**. Erwartung: alle wieder gold.
4. Wieder auf Abwesenheiten einschränken, dann die **Krankmeldung
   Testfahrer 02** öffnen. Erwartung: Es öffnet sich `V0002`, und unten
   steht **„Zurück zum Kalender"**.
5. Diesen Knopf drücken. Erwartung: Tagesansicht, 03.10.2026, der Filter
   **steht noch auf Abwesenheiten**, dieselbe Scrollposition.
6. Dasselbe mit **Escape** und mit **Schließen** — gleiches Ergebnis.
7. Alle Filter wieder anschalten, Datum **20.10.2026**. Den
   **Fahrzeugtermin Testwagen 01** öffnen. Erwartung:
   - die Akte von Testwagen 01, der Service-Termin hervorgehoben
   - **keine** Zeile „Aktueller Zustand" und **keine** „Heute zugewiesen"
   - stattdessen „Zustand im Fahrzeugstamm", „Einsatz heute, **02.10.2026**"
     und „Einsatz am **20.10.2026**" — jede mit Datum
   - der Hinweis, dass zwei verschiedene Tage gezeigt werden
8. **Escape**. Erwartung: zurück im Kalender vom 20.10.2026.
9. Gegenprobe: In **Fahrer & Fahrzeuge** ein Fahrzeug direkt öffnen.
   Erwartung: **kein** Knopf „Zurück zum Kalender", und Schließen führt in
   Fahrer & Fahrzeuge zurück.

### C. Kunden und Firmenkunden (Blöcke 5–7)

1. Bereich **Kunden**. Erwartung: **nirgends** eine Kundennummer, keine
   `KD-…`, kein `K0003`, nicht in der Liste, nicht in der Akte.
2. `Testallee` eintippen. Erwartung: Testkunde 03 wird gefunden.
3. `K0003` eintippen. Erwartung: **kein** Treffer — die technische Kennung
   ist kein Suchbegriff.
4. **Testfirma 04** öffnen. Erwartung: Ansprechpartner und Abteilung, und
   der Satz, dass die Firma der Auftraggeber ist.
5. **Neuen Kunden anlegen**, **Firmenkunde** wählen. Erwartung: Felder für
   Ansprechpartner und Abteilung erscheinen.
6. Ohne Eingabe auf **Weiter**. Erwartung: Der Fehler steht **am Feld**, und
   der Schreibzeiger sitzt im ersten ungültigen Feld.
7. Ausfüllen, **Weiter**, **Zurück und ändern**. Erwartung: alle Eingaben
   noch da. Dann **Abbrechen** — es entsteht **kein** Kunde.
8. Noch einmal anlegen, diesmal **Verbindlich anlegen**. Erwartung: genau
   **ein** Kunde, sofort in der Suche.
9. **Neue Fahrt aufnehmen**, diesen Firmenkunden wählen. Erwartung: ein
   Feld **„Fahrgast / Ansprechpartner"** erscheint, mit dem Hinweis, dass es
   nicht der Auftraggeber ist. Ausfüllen und bis zur Zusammenfassung gehen.
   Erwartung: „Auftraggeber (Firma)" und „Fahrgast / Ansprechpartner"
   stehen **getrennt** da.

### D. Finanzen (Blöcke 8–9)

1. Rolle **Buchhaltung**, Bereich **Finanzen**. Die Rechnung mit Zustand
   **bezahlt** öffnen.
2. Erwartung: **kein** „Zahlung erfassen", **kein** „Mahnung vorbereiten".
   Stattdessen ein Abschnitt „Was hier nicht mehr geht" mit Begründung, und
   der Hinweis, dass Rückzahlung und Überzahlung **offen** sind.
3. „Korrektur als neue Version" ist weiterhin da.
4. Eine **offene** Rechnung öffnen, **Zahlung erfassen** klicken, einen
   Betrag eintragen, **Zurück zur Rechnung**. Erwartung: Sie sind in der
   Akte, **nichts** wurde gespeichert.
5. Noch einmal „Zahlung erfassen". Erwartung: Ihr Betrag ist **noch da**.
6. **Escape** drücken. Erwartung: zurück zur Rechnung, das Fenster bleibt
   offen.
7. Etwas eintragen und **Abbrechen** drücken. Erwartung: eine
   Sicherheitsabfrage, bevor etwas verloren geht.

### E. Erledigte Vorgänge (Block 10)

1. Rolle **Administration**, **Meldungen**, Reiter **Erledigt**.
2. Bei einem Vorgang **Aus Erledigt-Liste entfernen**. Erwartung: Eine
   Rückmeldung erscheint: „Nichts gelöscht …" mit **Rückgängig**.
3. Reiter **Alle** und **Archiv** prüfen. Erwartung: Der Vorgang steht in
   beiden.
4. Zurück auf **Erledigt**, **Rückgängig** drücken. Erwartung: Er ist
   wieder da, und die Rückmeldung verschwindet.

### F. Rollen & Rechte (Blöcke 11–12)

1. Rolle **Administration**. Erwartung: Oben erscheint eine zweite Auswahl
   **Konto** mit **Enes Carman** und **Fatih Duman**.
2. Auf **Fatih Duman** stellen. Erwartung: Links steht „Fatih Duman ·
   Administration · U-ADM-02".
3. Bereich **Einstellungen** öffnen.
4. **Rolle Buchhaltung** anklicken, den Haken bei **Analyse sehen**
   entfernen, **Weiter zur Prüfung**.
5. Erwartung: Die Prüfung zeigt, was entzogen wird, welches Konto betroffen
   ist, und **wer danach noch Rechte verwalten kann**.
6. Ohne Grund auf **Verbindlich speichern**. Erwartung: Es passiert
   **nichts**, und es wird nach dem Grund gefragt.
7. Einen Grund eintragen und speichern. Dann auf Rolle **Buchhaltung**
   umstellen. Erwartung: **Analyse** ist aus der Navigation verschwunden.
8. Zurück als Administration: **Konto U-DIS-01** anklicken, **Urlaub
   entscheiden** ankreuzen, speichern. Erwartung: Die Freigabe steht am
   **Konto**, nicht an der Rolle — in der Liste als „1 einzeln".
9. **Rolle Administration** anklicken und **Rechte verwalten** abwählen,
   **Weiter**. Erwartung: Eine Fehlermeldung, dass danach **kein einziges
   Konto** mehr Rechte verwalten könnte — und **kein** Speicherknopf.
10. Unten im Bereich: das **Protokoll der Rechteänderungen** mit Name,
    Kennung, Zeit, Ziel, vorher, nachher und Grund.

### G. Analyse (Block 13)

1. Bereich **Analyse**, **Heute**. Erwartung: 180 Seitenaufrufe.
2. **Letzte 30 Tage**. Erwartung: 5.724 — und **alle** Zahlen ändern sich
   mit.
3. **Eigener Zeitraum**. Nur das Von-Datum eintragen. Erwartung: **keine**
   Kennzahl, sondern die Bitte, beide Felder zu füllen.
4. Beide eintragen. Erwartung: alle Kennzahlen, und im Kopf stehen Von, Bis
   und die Tageszahl.
5. Das Bis-Datum **vor** das Von-Datum setzen. Erwartung: „Das Ende liegt
   vor dem Beginn" — **keine** Kennzahl, auch keine alte.
6. Zurück auf **Letzte 30 Tage**. Erwartung: wieder 5.724.

### H. Gegenprobe Disposition

Rolle **Testdisposition 01**. Erwartung: **Einstellungen** ist nicht
sichtbar, Kunden, Personal, Lohn, Finanzen, Rewards und Analyse ebenfalls
nicht. Eine Krankmeldung öffnen: weder Dateiname noch Datei noch
Prüfergebnis.

---

## 52. Der Aktenweg: von der Kundenakte in die Rechnung und zurück

### Die gemessenen Ausgangsfehler

1. In der Akte von Testkunde 03 stand `RE-2026-0002` als `<li>` — nicht
   anklickbar, mit der Tastatur nicht erreichbar.
2. „Rewards-Konto öffnen" öffnete das richtige Konto, hatte aber **keinen
   Weg zurück**.

### Die Ursache

Es gab genau **eine** Dialogebene und keine Erinnerung daran, woraus ein
Fenster geöffnet wurde. „Zurück" konnte es deshalb gar nicht geben — nicht
weil der Knopf fehlte, sondern weil das Ziel nicht festgehalten war.

### Was gebaut wurde

Ein **Aktenweg** als Stapel. Jeder Eintrag hält fest, welche Akte offen war
und wo in ihr der Blick stand. Verschachtelte Fenster gibt es weiterhin
nicht — es wird immer nur **ein** Fenster gezeigt, der Stapel liegt daneben.

Ein Stapel und nicht ein einzelner Verweis: Von der Kundenakte in die
Rechnung und von dort weiter muss jeder Schritt **einzeln** zurückgehen
können.

| Bedienung | Wirkung |
|---|---|
| Rechnungszeile anklicken oder mit **Enter** | öffnet die Rechnungsakte dieses Kunden |
| **Zurück zur Kundenakte** (Kopf **und** Fuß) | genau dieser Kunde, dieselbe Scrollposition |
| **Escape** | wirkt wie der Rückweg, nicht wie Schließen |
| **Schließen** | verlässt den gesamten Aktenweg und räumt den Stapel ab |

Der Knopf steht in **Kopf und Fuß**: Wer unten in einer langen Akte steht,
soll nicht erst nach oben scrollen müssen.

**Die Berechtigung steht in der Aktion.** `ak-rechnung-aus-kunde` prüft
`finance.read` selbst, und zusätzlich, dass die Rechnung **diesem** Kunden
gehört — eine fremde Nummer im Knopfwert öffnet keine fremde Akte.

**Keine erfundene Herkunft.** Wird das Rewards-Konto aus der Rewardsliste
geöffnet, wird **kein** Weg gemerkt: Dann gibt es keine Kundenakte, aus der
man käme, und eine zu behaupten wäre eine Unwahrheit. Der Prüflauf belegt
beide Fälle.

### Ein eigener Fehler, vom Rauchtest gefunden

Die gemerkte Scrollposition war nicht die, an der der Mensch stand. Ursache:
Der Browser holt das angeklickte Element in den Blick, sobald es den Fokus
bekommt — und das passiert **vor** dem Klick-Ereignis. Was mein Code dann
las, war die vom Browser verschobene Position.

Im Alltag fällt das kaum auf, weil man nur anklickt, was man sieht. Bei
Tastaturbedienung und bei einem Knopf am Rand des Blickfeldes aber schon.
Gelesen wird die Position jetzt bei `pointerdown` beziehungsweise `keydown`
— beide kommen vor dem Fokuswechsel.

---

## 53. Die Einstellungsseite springt nicht mehr

### Der gemessene Ausgangsfehler

Beim Umschalten eines Rechts sprang die lange Seite nach ganz oben, und der
Tastaturfokus war weg. Die Änderung kam an — aber bei einem Recht weit
unten musste man jedes Mal wieder hinunterscrollen.

### Die Ursache

`geaendert()` rief `R.dialogOeffnen(rechteDialog())`. Das ersetzt den
**ganzen** Fensterinhalt: Der Rumpf beginnt wieder bei 0, und
`dialogOeffnen()` setzt den Fokus auf das erste Element.

### Was geändert wurde

Ein Haken baut das Fenster **nicht mehr neu**. Der Haken selbst steht schon
richtig — der Browser hat ihn umgeschaltet. Neu gezeichnet wird nur, was vom
Entwurf abhängt: der Änderungsblock und die Fehlerzeile.

Damit **können** Scrollposition und Fokus nicht verlorengehen, statt
hinterher wiederhergestellt zu werden. Das ist der Unterschied zwischen „es
geht nicht kaputt" und „es wird repariert".

Für die Fälle, in denen das Fenster wirklich neu gebaut werden muss, gibt es
`neuZeichnenAnPosition()`: Es merkt Rumpfposition und fokussiertes Recht,
zeichnet neu und stellt beides wieder her — zweimal, weil der Browser beim
Setzen des Fokus noch verschieben kann.

Der Prüflauf prüft ausdrücklich auf der **letzten** Berechtigung der Liste —
bei einem Recht ganz oben wäre der Unterschied nicht zu sehen. Geprüft
werden Tastatur (Leertaste), Maus und ein ausdrückliches Neuzeichnen der
Fläche.

---

## 54. Der Pflichtgrund sagt, was fehlt

### Der gemessene Ausgangsfehler

Bei „Verbindlich speichern" ohne Grund wurde richtig nichts gespeichert —
aber es leuchtete nur das Eingabefeld. Wer nicht weiß, warum, probiert es
noch einmal.

### Was geändert wurde

| Anforderung | Umsetzung |
|---|---|
| Meldung am Feld | „Bitte einen Grund eingeben." direkt darunter |
| Fokus ins Feld | mit Schreibzeiger **am Ende** — wer etwas zu Kurzes getippt hat, soll weiterschreiben können |
| Fehlerzustand | `aria-invalid="true"` am Feld |
| für Screenreader | `role="alert"` und `aria-live="polite"`, über `aria-describedby` dem Feld zugeordnet |
| erst mit gültigem Grund speichern | unverändert, mindestens drei Zeichen |
| direkter Aufruf ohne Grund | unverändert wirkungslos |

**Beim Tippen verschwindet die Meldung wieder** — ohne Neuzeichnen, damit
der Schreibzeiger im Feld bleibt. Eine Fehlermeldung, die stehen bleibt,
während man sie gerade behebt, ist falsch.

---

## 55. Die Rechte sind fachlich getrennt

### Der Auftrag

`operations.read` verband „Fahrten sehen" und „Planung sehen";
`personnel.read` verband Personalansicht und Krankheitszeiträume. Für die
Rollenvergabe zu grob — wer planen durfte, musste zwangsläufig die Fahrten
sehen.

Ich hatte diese Aufteilung im vorigen Durchgang **abgelehnt** und als offene
Entscheidung gekennzeichnet, weil sie an 27 Stellen entschieden werden muss
und eine falsche Einordnung eine funktionierende Ansicht versteckt. Der
Geschäftsführer hat sie jetzt ausdrücklich verlangt — damit ist sie
entschieden und umgesetzt.

### Die neuen Fähigkeiten

| Fähigkeit | Was sie öffnet |
|---|---|
| `fahrten.read` | Bereich **Fahrten**, Fahrten im Kalender |
| `planung.read` | Bereich **Planung**, Schichten und Konflikte im Kalender |
| `personal.read` | Bereich **Personal**, Personalakte, Dokumentfristen — **ohne** Krankheit |
| `krankheit.read` | gemeldete Zeiträume und vertrauliche Inhalte eines Krankheitsvorgangs |
| `dokument.pruefen` | **die engste Stufe:** Bescheinigung öffnen, Einsicht bestätigen, Ergebnis wählen |

`personnel.write` heißt jetzt nur noch „Personal bearbeiten" — die
Dokumentprüfung ist herausgelöst.

**Warum die Dokumentprüfung noch einmal getrennt ist:** Wer einen
Krankheitszeitraum sehen darf, darf damit noch nicht die ärztliche
Bescheinigung aufmachen. Der Zeitraum ist eine betriebliche Angabe, die
Datei ist ein Gesundheitsdokument. Dazwischen liegt der eigentliche
Unterschied im Schutzbedarf.

### Wie die Umstellung ohne Regression gelang

Ein blindes Ersetzen an 27 Stellen wäre genau der Fehler gewesen, den ich
vorher benannt habe. Stattdessen:

1. Die neuen feinen Fähigkeiten eingeführt.
2. Die alten groben Kennungen bleiben als **Frage** gültig:
   `darf("operations.read")` heißt jetzt „hat Fahrten- **oder**
   Planungssicht". Kein Konto **besitzt** sie noch — sie stehen in keiner
   Rolle und in keiner Freigabe, und in den Einstellungen sind sie nicht
   schaltbar.
3. Dann wurde jede Stelle einzeln angesehen, die **genau** sein muss, und
   auf die feine Fähigkeit umgestellt.

Dadurch hat keine Stelle still ihren Schutz verloren, und die präzisen
Stellen sind präzise geworden. Der Prüflauf belegt, dass die groben
Kennungen in keiner Rolle mehr stehen.

### Die Einordnung, Stelle für Stelle

| Stelle | vorher | jetzt | Begründung |
|---|---|---|---|
| Bereich Fahrten | `operations.read` | `fahrten.read` | |
| Bereich Planung | `operations.read` | `planung.read` | |
| Kalender: Fahrten | `operations.read` | `fahrten.read` | |
| Kalender: Schichten, Konflikte | `operations.read` | `planung.read` | Ein Konflikt ist ein Widerspruch im **Schichtplan**, keine Eigenschaft einer Fahrt |
| Kalender: Abwesenheiten | `operations.read` oder `personnel.read` | `planung.read` oder `krankheit.read` | Die Planung muss wissen, **dass** jemand ausfällt; der **Grund** hängt an `krankheit.read` und wird am Vorgang geprüft |
| Kalender: Dokumentfristen | `personnel.read` | `personal.read` | Führerschein und P-Schein sind Stammdaten, nicht Krankheit |
| Bereich Personal, Personalakte | `personnel.read` | `personal.read` | |
| Krankheitsinhalte am Vorgang | `personnel.read` | `krankheit.read` | |
| Bescheinigung öffnen, Einsicht, Ergebnis, Neuzuordnung | `personnel.read` | `dokument.pruefen` | Gesundheitsdokument |
| Teilschritt „Personalprüfung" | `personal.read` | `dokument.pruefen` | Dieser Teilschritt **ist** die Dokumentprüfung |
| Wiedereröffnen eines Krankheitsvorgangs | `personnel.read` | `krankheit.read` | Eine Entscheidung über einen Krankheitsvorgang |
| Fahrer sehen, Telefonnummer | `operations.read` oder `personnel.read` | `fahrten.read`, `planung.read` oder `personal.read` | Die Zentrale braucht die Nummer für Rückfragen zur Schicht, das Personal für die Stammdaten |

### Was der Prüflauf belegt

- **Nur `planung.read`:** Planung sichtbar, Fahrten nicht; im Kalender nur
  Schichten, Konflikte und Abwesenheiten; ein direkter Sprung nach Fahrten
  wird abgewiesen.
- **Nur `fahrten.read`:** umgekehrt, und im Kalender nur die Fahrten.
- **Nur `personal.read`:** Bereich Personal erreichbar, aber **kein**
  Dateiname, **kein** Knopf zur Bescheinigung — und die direkt aufgerufenen
  Dokumentaktionen ändern nichts.
- **`krankheit.read` ohne `dokument.pruefen`:** Der Zeitraum ist sichtbar,
  die Bescheinigung bleibt verschlossen, auch über den direkten Aufruf. An
  ihrer Stelle steht ein ehrlicher Satz statt eines fehlenden Knopfes.
- Die **Aussperrsperre** für die Rechteverwaltung greift unverändert, auch
  über den direkten Aufruf.

---

## 56. Eigene Fehler, Prüflauffehler und offene Entscheidungen

### 56.1 Echte Oberflächenfehler — alle fünf behoben

| Befund | Ursache | Behoben |
|---|---|---|
| 1. `RE-2026-0002` in der Kundenakte nicht anklickbar | die Zeile war ein `<li>`, keine Schaltfläche; es gab keine Herkunft, also konnte „Zurück" nicht existieren | echte `<button>` mit `aria-label`, Aktenweg als Stapel, Rückweg in Kopf und Fuß, Escape wie Rückweg, „Schließen" räumt den Weg ab |
| 2. Kein Rückweg aus dem Rewards-Konto | dieselbe Ursache | derselbe Aktenweg; aus der Rewardsliste geöffnet **bewusst kein** Rückweg |
| 3. Einstellungsseite sprang nach oben, Fokus weg | `geaendert()` rief `dialogOeffnen(rechteDialog())` und ersetzte den ganzen Fensterinhalt | ein Haken baut das Fenster **nicht mehr neu**; nur der Änderungsblock wird gezeichnet |
| 4. Pflichtgrund ohne Meldung | der Fehler stand nur als Sammelmeldung, nicht am Feld | „Bitte einen Grund eingeben." am Feld, Fokus hinein, `aria-invalid`, `role="alert"`, `aria-live`, `aria-describedby` |
| 5. Rechte zu grob zusammengefasst | `operations.read` und `personnel.read` fassten je zwei Dinge zusammen | fünf getrennte Fähigkeiten, siehe Abschnitt 55 |

### 56.2 Eigene Umsetzungsfehler

**Die gemerkte Scrollposition war die falsche.** Der Browser holt das
angeklickte Element in den Blick, sobald es den Fokus bekommt — und das
passiert **vor** dem Klick-Ereignis. Was mein Code dann las, war die vom
Browser verschobene Position. Im Alltag fällt das kaum auf, weil man nur
anklickt, was man sieht; bei Tastaturbedienung und bei einem Knopf am Rand
des Blickfeldes aber schon. Gelesen wird die Position jetzt bei
`pointerdown` beziehungsweise `keydown`.

**Die Dokumentknöpfe hingen nur an der Aktion.** Nach der Aufteilung prüften
`vg-bescheinigung`, `vg-einsicht-ja` und `vg-ergebnis` richtig auf
`dokument.pruefen` — aber der **Knopf** war weiterhin sichtbar. Der eigene
Prüflauf hat das gefunden. Jetzt steht an seiner Stelle ein Satz, der sagt
warum: „Die Bescheinigung öffnen darf nur, wer Gesundheitsdokumente prüfen
darf. Der gemeldete Zeitraum ist davon getrennt und hier sichtbar."

### 56.3 Fehler in meinen Prüfläufen

Diese gehören getrennt, weil sie **nichts** über die Oberfläche sagen.

**Feste Datumsangaben neben Daten, die aus „heute" entstehen.** Das ist der
schwerwiegendste: Im Prüflauf zur Neuzuordnung stand `"2026-10-03"` als
Krankheitsende. Der Zeitraum von `V0002` beginnt dagegen am **heutigen** Tag
— er wird aus `alsIso(heute)` gerechnet. Solange der Lauf am 02.10.2026
lief, lag das feste Ende nach dem Beginn und alles passte. Zwei Tage später
lag es **davor**, und die Oberfläche hat zu Recht „Das Ende liegt vor dem
Beginn" gemeldet.

Ein festes Datum neben Daten aus „heute" ist eine **Zeitbombe**: Der Lauf
besteht, bis der Kalender weiterläuft. Betroffen waren der Zuordnungs- und
der Datumslauf; an **sechzehn** Stellen wird der Tag jetzt aus dem Bestand
gerechnet.

**Eine Prüfung, die aus dem falschen Grund bestand.** „Ein Ende vor dem
Beginn wird abgewiesen" prüfte nur, **dass** ein `.feldfehler` da war — sie
hätte auch bei „Zeitraum unvollständig" bestanden. Jetzt wird der
**Fehlertext** geprüft.

**Ein unrealistischer Rauchtest.** Ich habe die Akte programmatisch auf
Position 300 gescrollt und dann eine Zeile angeklickt, die bei 893 lag. Ein
Mensch klickt nicht auf etwas, das er nicht sieht. Der Prüflauf holt die
Zeile jetzt erst in den Blick — so, wie es tatsächlich bedient wird.

**Ein Rauchtest, der an der falschen Stelle suchte.** `v.nachweise` gibt es
nicht; die Nachweise liegen in `v.daten.nachweise`. Die Prüfung war damit
leer und hätte alles bestanden.

### 56.4 Veraltete Prüferwartungen — angepasst mit Begründung

| Lauf | Alte Erwartung | Weshalb sie nicht mehr gilt |
|---|---|---|
| `probe-rechte` | Die Sammelmeldung sagt „Bitte einen Grund eintragen." | Der Hinweis steht jetzt **am Feld** und heißt „Bitte einen Grund eingeben." Geprüft wird dort — und zusätzlich `aria-invalid` und `role="alert"` |

Das ist die einzige in diesem Durchgang. Alle übrigen sechzehn Läufe sind
ohne Anpassung durchgelaufen — die Rechteaufteilung hat **keine** bestehende
Erwartung gebrochen. Das war der Zweck des Umwegs über die groben Kennungen
als Frage.

### 56.5 Bewusst offene Geschäftsentscheidungen

| Punkt | Stand |
|---|---|
| Die spätere Verteilung für Buchhaltung, Personal und Disposition | **nicht festgelegt.** Die Probe zeigt, dass sie schaltbar ist, und legt nichts fest |
| Ob „Fahrten bearbeiten" und „Planung bearbeiten" getrennt werden sollen | **offen.** `operations.write` ist weiterhin eines; getrennt wurden nur die **Lese**rechte, wie verlangt |
| Ob für die Rechtevergabe ein Vieraugenprinzip gelten soll | **offen** |
| Rückzahlung, Überzahlung und Storno bei Rechnungen | **offen**, benannt in der Sperrmeldung |
| Mahnstufen, Mahngebühren, Zahlungsfrist | **offen** |
| Aufbewahrungs- und Löschfrist für Krankheitsnachweise | **offene rechtliche Entscheidung** |
| Punktzahlen der Rewardsstufen unterhalb von VIP | **offen** |
| Welche Ereignisse die Analyse erheben darf | **offene rechtliche Entscheidung**; ohne sie bleibt der Bereich produktiv leer |

**Erledigt und damit nicht mehr offen:** „Fahrten sehen" und „Planung
sehen" sind getrennt, ebenso „Personalstammdaten sehen" und
„Krankheitszeiträume sehen", und die Dokumentprüfung ist noch einmal eigens
geschützt.

---

## 58. Alle siebzehn Prüfläufe, vollständig gefahren

Stand 04.10.2026. Jeder Lauf bis zur gedruckten Abschlussbilanz.

| Prüflauf | Ergebnis |
|---|---|
| `probe-portal-pruefen` | **114 bestanden, 0 offen** |
| `probe-fahrt-pruefen` | **172 bestanden, 0 offen** |
| `probe-planung-pruefen` | **171 bestanden, 0 offen** |
| `probe-team-pruefen` | **197 bestanden, 0 offen** |
| `probe-vorgaenge-pruefen` | **138 bestanden, 0 offen** |
| `probe-teilung-pruefen` | **105 bestanden, 0 offen** |
| `probe-dokument-pruefen` | **93 bestanden, 0 offen** |
| `probe-regeln-pruefen` | **123 bestanden, 0 offen** |
| `probe-zuordnung-pruefen` | **126 bestanden, 0 offen** |
| `probe-karten-pruefen` | **88 bestanden, 0 offen** |
| `probe-wahrheit-pruefen` | **78 bestanden, 0 offen** |
| `probe-kalenderwege-pruefen` | **109 bestanden, 0 offen** |
| `probe-akten-pruefen` | **243 bestanden, 0 offen** |
| `probe-analyse-pruefen` | **123 bestanden, 0 offen** |
| `probe-datum-pruefen` | **162 bestanden, 0 offen** |
| `probe-rechte-pruefen` | **220 bestanden, 0 offen** |
| `probe-aktenweg-pruefen` (neu) | **121 bestanden, 0 offen** |
| **Summe** | **2 383 bestanden, 0 offen** |

In allen siebzehn Läufen: **null Anfragen nach außen.**

### Was diese Zahlen nicht sagen

- Es ist **keine Datenquelle** angebunden. Alles liegt im Speicher des
  Browsers und ist nach dem Neuladen weg.
- **Die Rechteverwaltung ist eine Vorführung.** Eine Prüfung im Browser
  schützt nichts. Dass die fünf neuen Fähigkeiten serverseitig
  Entsprechungen haben — Supabase-Rollen, Grants, RLS —, ist **nicht**
  gezeigt und wäre im Betrieb der entscheidende Teil.
- **Kein Lauf** sagt etwas über die produktive Instanz: nicht über RLS,
  nicht über Grants, nicht über das Verhalten der Storage-API.
- Die zwei Administrationskonten sind **Testidentitäten**. Kein echtes
  Konto, kein Passwort, keine Anmeldung.
- Der produktive Verwaltungsbereich unter `admin/` ist **unverändert**.

---

## 59. Manueller Testweg

Vorschau: `npm run probe-portal`, dann die genannte Adresse im Browser.
Rolle und Konto stehen oben im Banner. **Nichts davon verlässt den
Browser.**

### A. Rechnung aus der Kundenakte (Punkt 1)

1. Rolle **Administration**, Bereich **Kunden**, `Testkunde 03` suchen und
   die Zeile anklicken.
2. In der Akte nach unten zu **Rechnungen** scrollen. Erwartung:
   `RE-2026-0002` ist eine **Schaltfläche** — der Zeiger wird zur Hand, und
   die Zeile hebt sich beim Überfahren ab.
3. Mit **Tabulator** dorthin, dann **Enter**. Erwartung: Die
   Rechnungsakte `RE-2026-0002` öffnet sich — **nicht** die
   Finanzübersicht.
4. Erwartung: **Zurück zur Kundenakte** steht **oben und unten**.
5. Den unteren Knopf drücken. Erwartung: Sie sind bei Testkunde 03, und
   zwar **an derselben Stelle** in der Akte wie vorher.
6. Noch einmal die Rechnung öffnen, dann **Escape**. Erwartung: dasselbe.
7. Noch einmal öffnen, dann **Schließen**. Erwartung: Der ganze Aktenweg
   ist verlassen — keine Kundenakte mehr offen.
8. Gegenprobe als **Testdisposition 01**: Die Disposition sieht den
   Kundenbereich nicht. Ein direkter Aufruf bleibt wirkungslos.

### B. Rückweg aus dem Rewards-Konto (Punkt 2)

1. Wieder in der Akte von Testkunde 03: **Rewards-Konto öffnen**.
2. Erwartung: **Zurück zur Kundenakte** steht **oben und unten**.
3. Drücken. Erwartung: Testkunde 03, dieselbe Scrollposition.
4. **Escape** aus dem Konto: dasselbe. **Schließen**: alles verlassen.
5. Gegenprobe: Bereich **Rewards**, dort eine Kontozeile anklicken.
   Erwartung: Das Konto öffnet, aber es gibt **keinen** Rückweg — Sie
   kommen aus keiner Kundenakte, und es wird keine erfunden.

### C. Scrollposition in der Rechteverwaltung (Punkt 3)

1. Rolle **Administration**, Bereich **Einstellungen**, **Rolle
   Disposition** anklicken.
2. Im Fenster **ganz nach unten** scrollen, zur letzten Berechtigung
   („Eigene Übersicht und Meldungen sehen").
3. Mit **Tabulator** dorthin und **Leertaste** drücken. Erwartung: Die
   Seite **bleibt stehen**, der Fokus bleibt auf dem Schalter, und weiter
   unten erscheint der Änderungsblock.
4. Noch einmal Leertaste. Erwartung: dasselbe.
5. Dasselbe mit der **Maus** auf einer anderen Berechtigung weit unten.

### D. Pflichtgrund (Punkt 4)

1. In derselben Rolle ein Recht ändern, **Weiter zur Prüfung**.
2. **Verbindlich speichern** ohne Grund. Erwartung:
   - unter dem Grundfeld steht **„Bitte einen Grund eingeben."**
   - der Schreibzeiger sitzt **im Feld**
   - das Feld ist rot umrandet
   - es wurde **nichts** gespeichert
3. Anfangen zu tippen. Erwartung: Die Meldung verschwindet, der
   Schreibzeiger bleibt im Feld.
4. Mit gültigem Grund speichern. Erwartung: Die Änderung ist da und steht
   im Protokoll unten im Bereich.

### E. Getrennte Rechte (Punkt 5)

1. Bereich **Einstellungen**, **Rolle Disposition**. Erwartung: Es gibt
   jetzt **getrennte** Schalter für **Fahrten sehen** und **Planung
   sehen**.
2. **Fahrten sehen** abwählen, mit Grund speichern.
3. Auf Rolle **Disposition** umstellen. Erwartung: **Planung** ist da,
   **Fahrten** ist aus der Navigation verschwunden. Im **Kalender** gibt es
   die Kategorie „Fahrten" nicht mehr, Schichten und Konflikte schon.
4. Zurück als Administration: **Fahrten sehen** wieder an, **Planung
   sehen** aus. Erwartung: genau umgekehrt.
5. **Rolle Personal**: Erwartung: getrennte Schalter für
   **Personalstammdaten sehen**, **Krankheitszeiträume sehen** und
   **Gesundheitsdokumente prüfen**.
6. **Gesundheitsdokumente prüfen** abwählen, speichern. Dann als
   **Testpersonal 01** eine Krankmeldung öffnen. Erwartung: Der gemeldete
   Zeitraum ist zu sehen, aber **kein Dateiname** und **kein Knopf** zur
   Bescheinigung — stattdessen ein Satz, der sagt warum.
7. Zusätzlich **Krankheitszeiträume sehen** abwählen. Erwartung: Auch der
   vertrauliche Teil ist weg; die Stammdaten im Bereich **Personal**
   bleiben.
8. Gegenprobe der Sperre: **Rolle Administration**, **Rechte verwalten**
   abwählen, **Weiter**. Erwartung: Fehlermeldung, dass danach kein Konto
   mehr Rechte verwalten könnte — und **kein** Speicherknopf.

### F. Was nicht zurückgebaut sein darf

- In der Kundenakte steht **keine** Kundennummer und **keine** Kennung.
- **Neue Fahrt für diesen Kunden** übernimmt Testkunde 03 **und** die
  Abholadresse „Testallee".
- **Abbrechen** legt keine Fahrt an; es bleiben zwei offene Fahrten.
- Rechteänderungen werden erst nach der abschließenden Prüfung gespeichert.
- Die **Analyse** verschwindet bei entzogener Berechtigung wirklich — auch
  über einen direkten Sprung.
