# Betriebsportal — Informationsarchitektur und Design-System

**Branch:** `feature/030-betriebsportal-neu`
**Phasen:** 3 (Informationsarchitektur), 4 (Design-System), 19 (technische Architektur)
**Stand:** 29.09.2026

Entwurf für den Haltepunkt. **Kein bestehender Portalcode ist verändert.**

---

## 1. Von 61 Seiten auf 12 Bereiche

Heute: 61 Seiten, davon 49 über die Navigation nicht erreichbar, 48 ohne
Serverdatenquelle. Das neue Portal hat **zwölf Bereiche**, und was ein
Dispatcher täglich braucht, liegt in den ersten fünf.

### Für alle internen Rollen sichtbar, je nach Fähigkeit

| # | Bereich | Fähigkeit | Was dort passiert |
|---|---|---|---|
| 1 | **Übersicht** | `self.read` | Was ist jetzt wichtig? Kennzahlen, Tagesverlauf, Schnellaktionen |
| 2 | **Fahrten** | `operations.read` | Eingang, ungeplant, geplant, unterwegs, abgeschlossen, storniert, Klärung |
| 3 | **Planung** | `operations.read` | Ein frei wählbarer Tag, eine Zeile je Mitarbeiter |
| 4 | **Fahrer & Fahrzeuge** | `operations.read`, `fleet.read` | Wer ist da, was fährt, was steht |
| 5 | **Kalender** | `operations.read`, `personnel.read` oder `fleet.read` | Tag, Woche, Monat — zeigt nur, entscheidet nichts |
| 6 | **Meldungen** | `operations.read` | Betriebliche Meldungen, rollenabhängig |
| 7 | **Kunden** | `customers.read` | Suche, Kontakt, Fahrten, Hinweise |
| 8 | **Personal** | `personnel.read` | Mitarbeiter, Urlaub, Krankheit, Dokumente, Fristen |
| 9 | **Lohn** | `payroll.read` | Lohnabrechnungen bereitstellen |
| 10 | **Finanzen** | `finance.read` | Rechnungen, Zahlungen, Mahnwesen |
| 11 | **Rewards** | `rewards.read` | Regeln, Punkte, Gutscheine, Glücksrad |
| 12 | **Analyse** | `analytics.read` | Webseite und Betrieb |

**Einstellungen** hängt an `security.read` und sitzt nicht in der
Hauptnavigation, sondern beim Benutzerkonto — dort wird sie gesucht.

### Was ein Dispatcher tatsächlich sieht

Sechs Einträge: Übersicht, Fahrten, Planung, Fahrer & Fahrzeuge,
Kalender, Meldungen. Nicht zwölf. Die Navigation wird nicht ausgegraut, sondern
enthält schlicht nicht, was die Rolle nicht darf — und das ist
**Bequemlichkeit, kein Schutz**. Der Schutz liegt bei RLS.

### Auf kleinen Bildschirmen

Unten eine Leiste mit **höchstens fünf** Einträgen: die ersten fünf für
Dispatcher, für Admin die fünf meistgenutzten plus „Mehr". Nie elf
gleichwertige Punkte nebeneinander.

### Was mit den 61 alten Seiten geschieht

| Umgang | Anzahl | Beispiele |
|---|---:|---|
| geht in einen neuen Bereich auf | 12 | `schichtplanung`, `mitarbeiter`, `fahrzeuge`, `rewards`, `kunden`, `rechnungen` |
| wird zusammengelegt | ~20 | die neun Qualitäts- und Vorfallseiten werden **eine** Liste mit Filter |
| bleibt bis zur echten Datenquelle leer | ~14 | `live-dispo`, `telefonzentrale`, `termin-cockpit` |
| entfällt | ~15 | Doppelungen der Unternehmenssteuerung ohne eigene Datenquelle |

Die genaue Zuordnung je Seite steht in
`BETRIEBSPORTAL-BESTANDSAUFNAHME.md`, Anhang. **Nichts wird gelöscht,
bevor der neue Bereich funktionsgleich ist.**

---

## 2. Jede Seite beantwortet sieben Fragen

Verbindlich für jede Ansicht:

| Frage | Wo sie beantwortet wird |
|---|---|
| Wo bin ich? | Bereichstitel oben links, Eintrag in der Navigation hervorgehoben |
| Was ist jetzt wichtig? | erste Zeile unter dem Titel, nie unter der Falz |
| Was kann ich hier tun? | eine Hauptaktion, rechts oben und am Handy unten fest |
| Was wurde gespeichert? | Rückmeldung an der Stelle der Änderung, nicht am Seitenrand |
| Was ist noch offen? | Zähler im Bereichstitel |
| Was ist ein Fehler? | roter Kasten mit Klartext und einem nächsten Schritt |
| Was passiert als Nächstes? | die Schaltfläche sagt es selbst |

**Keine Fachbegriffe in der Oberfläche.** Nicht `draft`, nicht
`published`, keine Kennungen, keine Tabellennamen. Stattdessen:
„Entwurf — noch nicht für Mitarbeiter sichtbar" und „Veröffentlicht —
Mitarbeiter sehen den Plan".

---

## 3. Design-System

### Herkunft

Alle Werte stammen aus `src/styles/design.css` der freigegebenen
öffentlichen Webseite. Es wird nichts neu erfunden.

| Rolle | Wert |
|---|---|
| Hintergrund | `#18181b` |
| Fläche | `#1f1f23` |
| Fläche zweiter Ordnung | `#252528` |
| Linie | `#2e2e32` |
| Schrift | `#f0ebe0` |
| Schrift gedämpft | `#8d8a82` |
| Marke / aktive Auswahl | `#c8a96e` |
| Schrift auf Marke | `#18181b` |
| Radius | `0.125rem` — gerade Flächen, keine runden Karten |

Schriften **lokal** aus `schriften/`: Outfit (300–700) für Oberfläche,
Lora für Zitate und Hervorhebungen. Kein Google-Fonts-CDN, kein
Symbol-CDN, keine fremde Bibliothek.

Bildzeichen: das vorhandene `logo.png` beziehungsweise
`tg-icon-original.png`. Kein erfundenes Logo.

### Farbe ist sparsam und bedeutet etwas

| Farbe | Bedeutung | sonst nirgends |
|---|---|---|
| Gold `#c8a96e` | aktive Auswahl, Markenführung, Hauptaktion | — |
| Rot `#e06c5a` | Fehler oder akute Gefahr | nie für „wichtig" |
| Grün `#6fae7c` | bestätigter Erfolg, frei/verfügbar | nie für „neu" |
| Grau | alles Übrige | — |

**Nie Farbe allein.** Jeder farbige Zustand trägt zusätzlich Text und
ein Strichsymbol. Wer Rot und Grün nicht unterscheiden kann, liest
denselben Zustand.

### Symbole

Einheitliche Strichsymbole, inline als SVG, `currentColor`, 1,5 px
Strich, 20 px Raster. **Keine Emojis als Bedienungssymbole** — der
heutige Bestand nutzt 👥 🚖 🌅 ⚠️ als Kennzahlensymbole; das entfällt.

### Bedienbarkeit — verbindliche Maße

- Bedienflächen mindestens **44 × 44 px**
- Eingabefelder mindestens **16 px** Schrift (sonst zoomt iOS beim Tippen)
- sichtbarer Fokus: 2 px Gold, 3 px Abstand, auf **jedem** bedienbaren Element
- vollständige Tastaturbedienung, Fokusfalle in jedem Dialog
- kein waagerechter Überlauf bei 320 px
- kein Dialog im Dialog
- keine Auswahl, die weit unter dem auslösenden Element erscheint
- Speichern immer dort, wo bearbeitet wird
- **ein** Weg je Aufgabe

### Die dreizehn Zustände

Jede datenabhängige Ansicht kennt sie, und keine zwei sehen gleich aus:

`lädt` · `leer` · `geladen` · `teilweise geladen` · `Fehler` ·
`keine Berechtigung` · `Sitzung abgelaufen` · `Verbindung unterbrochen` ·
`ungespeicherte Änderung` · `speichert` · `gespeichert` ·
`Veröffentlichung ausstehend` · `veröffentlicht`

**Ein Ladefehler sieht nie wie ein leerer Datenbestand aus.** „Keine
Fahrten für heute" und „Fahrten konnten nicht geladen werden" sind zwei
verschiedene Kästen mit verschiedener Farbe und verschiedenem nächsten
Schritt. Das ist keine Kosmetik: Im heutigen Bestand ist diese
Verwechslung möglich, und sie führt dazu, dass ein Ausfall wie ein
ruhiger Tag aussieht.

### Ein weiterer Zustand, den der Bestand nicht hat

`Vorbereitet — noch keine Datenquelle`. Für Bereiche, deren Tabelle es
noch nicht gibt. Der Kasten sagt, was der Bereich später leistet und was
dafür fehlt. **Keine geschätzten Zahlen, keine Demo-Kunden, keine
erfundenen Fahrten.**

---

## 4. Technische Architektur

### Kein zweites 38 000-Zeilen-Feld

| Baustein | Aufgabe |
|---|---|
| `portal/rahmen/` | Layout, Navigation, Kopfzeile, Sitzungsüberwachung |
| `portal/design/` | Tokens, Grundelemente, Symbole |
| `portal/bausteine/` | Tabelle, Formular, Dialog, Zustandskasten, Filter |
| `portal/bereiche/` | je Bereich ein Modul, das nur seine Ansicht kennt |
| `portal/daten/` | Adapter je Fachbereich — die **einzige** Stelle mit Supabase-Zugriff |
| `portal/integration/` | PAJ GPS und Analyse, je getrennt und abschaltbar |

**Trennung von Darstellung und Zugriff:** Ein Bereichsmodul ruft
`daten/fahrten.js` auf und kennt weder Tabellennamen noch
Supabase-Client. Fällt eine Integration aus, fällt nur sie aus — ein
PAJ-Ausfall blockiert keine Fahrzeugfunktion.

**Keine gegenseitige Abhängigkeit** zwischen Mitarbeiterportal und
Adminmodulen. Die in Schritt 029 abgelöste Abhängigkeit von
`personal-shared.js` kehrt nicht zurück.

### Bestehende Adressen

`admin/schichtplanung.html` und die übrigen heutigen Adressen bleiben
gültig oder werden kontrolliert weitergeleitet. Lesezeichen brechen
nicht unbemerkt.

### Leistung

- nur der sichtbare Zeitraum wird geladen, nicht die ganze Tabelle
- Suche mit Begrenzung und Nachladen
- keine zwei gleichen Anfragen in derselben Ansicht
- Schriften und Bibliotheken lokal
- kein Zwischenspeicher, der Daten zweier Konten vermischt
- gemessen wird, nicht behauptet: Ladezeit je Bereich wird protokolliert

---

## 5. Was diese Phase nicht entscheidet

- **Welche Tabellen für Fahrten, Kunden, Rechnungen, Lohn und Analyse
  entstehen** — eigene Entwürfe, eigene Prüfung.
- **Welche der ~14 vorerst leeren Bereiche zuerst eine Datenquelle
  bekommen** — Reihenfolge ist entschieden, der Umfang nicht.
- **Ob PAJ GPS je angebunden wird** — braucht offizielle API und
  Freigabe.

Alles hier ist **statisch entworfen**. Geprüft wird es an der
Designprobe und danach modulweise.
