# Übernahme der öffentlichen Webseite in die Astro-Struktur

Interne Arbeitsunterlage. Sie wird **nicht** mit ausgeliefert — der Prüflauf
`npm run ausgabe-pruefen` stellt sicher, dass keine `.md`-Datei im
Ausgabeordner landet.

Stand: 23.09.2026, nach Schritt 022 (Gluecksrad-Gestaltung).

---

## 1. Branch-Abhängigkeit — bitte beachten

```
dev
 └── feature/012-astro-geruest        (37da686)  Gerüst
      └── feature/013-design-grundlage (c740135)  Design-Grundlage
           └── feature/014-startseite  (fbe9b67)  Startseite
                └── feature/015-yumak-medien (85b6300)  Yumak-Medien
                     └── feature/016-rewards-yumak (c93b315)  Rewards-Seite
                          └── feature/017-grundlagen (6c5e27c)  Grundlagen
                               └── feature/018-rechtsseiten (7caeca5)  Rechtsseiten
                                    └── feature/019-flotte (7401212)  Flotte + Spezial
                                         └── feature/020-konto (307dc82)  Anmeldeseiten
                                              └── feature/022-gluecksrad-design
```

**Jeder Schritt zweigt vom vorigen ab, nicht von `dev`.** Das ist Absicht: 013
setzt auf Gerüst, Übernahme-Liste und Prüfwerkzeugen aus 012 auf, 014 auf der
Design-Grundlage aus 013. Ein Abzweig von `dev` hätte jeweils nichts davon.

**Folge für die Reihenfolge:** Die Kette muss in dieser Reihenfolge nach `dev` —
012, 013, 014, 015, 016, 017, 018, 019, 020, 022. Wird eine übersprungen, kommt ihr Inhalt später doppelt
oder gar nicht mit.

Merge nach `dev` macht der Mensch — nicht der Assistent.

---

## 2. Offene Korrekturen aus `feature/011` — vor jeder Veröffentlichung

`feature/011-einspielung-bestandsdatenbank` trägt **fünf Commits, die noch
nicht in `dev` sind**. Rein lesend geprüft am 19.09.2026. Drei davon betreffen
nur `supabase/` und Dokumentation und sind für die Auslieferung ohne Belang.
**Zwei betreffen Dateien, die im Ausgabeordner landen** — sie enthalten bereits
behobene Portalfehler.

| Commit | Datei | Was behoben wurde | Heutiger Stand auf 012 bis 020 |
|---|---|---|---|
| `316de73` | `fahrer/mitarbeiter.js` | Das Anhang-Abzeichen einer Krankmeldung zeigte **immer** „Ohne Anhang", unabhängig vom Datenbankwert. Jetzt wird `document_submission_id` ausgewertet. | Zeile 528 trägt noch das feste „Ohne Anhang" — **Fehler vorhanden** |
| `8ff510a` | `admin/dokumenteingang-supabase.js` | Die Rolle wurde aus der Menübeschriftung abgeleitet statt aus `profiles` der laufenden Sitzung gelesen; dazu eine ehrliche Meldung bei fehlender Anmeldung oder fehlender Admin-Rolle. | `auth_user_id` kommt in der Datei **nicht vor** — Fehler vorhanden |
| `8ff510a` | `admin/dokumentfristen.html` | Verwaistes schließendes `</div>` entfernt. | Fehler vorhanden |
| `8ff510a` | `admin/sidebar.js` | Fehlender Navigationseintrag „Dokumentfristen" ergänzt. | `dokumentfristen` kommt in der Datei **nicht vor** — Fehler vorhanden |

Gemessen, nicht vermutet: Die drei Suchen nach `Ohne Anhang`, `auth_user_id`
und `dokumentfristen` wurden auf dem aktuellen Branch ausgeführt.

**Daraus folgt:** Würde heute aus `feature/020` heraus veröffentlicht, käme der
alte, fehlerhafte Stand dieser vier Dateien mit — das Übernahme-Werkzeug
kopiert `admin/` und `fahrer/` byteweise so, wie sie im Branch liegen. Die
Korrekturen wären wieder weg.

**Bedingung vor der ersten Veröffentlichung — bitte genau lesen:**

Die Korrekturen aus `feature/011` müssen im **tatsächlichen
Veröffentlichungsstand** enthalten sein, also in genau dem Commit, aus dem
gebaut und hochgeladen wird.

> **Ein Merge nach `dev` allein aktualisiert `feature/020` nicht.**

Die Kette 012 → … → 020 hängt an `dev` in seinem Stand vom 19.09.2026.
Landet `feature/011` danach in `dev`, ändert das an `feature/020` nichts —
die vier Dateien bleiben dort im alten Stand, bis die Kette den neuen
`dev`-Stand selbst übernimmt. Wer aus `feature/020` baut, baut die Fehler mit
ein, auch wenn `dev` längst korrigiert ist.

Vor der Veröffentlichung ist also zu prüfen, ob der Veröffentlichungsstand die
Korrekturen wirklich enthält. Die drei Suchen aus der Tabelle oben genügen
dafür: `Ohne Anhang` in `fahrer/mitarbeiter.js`, `auth_user_id` in
`admin/dokumenteingang-supabase.js`, `dokumentfristen` in `admin/sidebar.js`.

Ein rechnerischer Probe-Merge (`git merge-tree`, ohne etwas zu verändern) zeigt
**keine Konflikte** mit 012/013/014 — die Änderungen liegen in anderen Dateien
beziehungsweise in einem anderen Abschnitt von `CLAUDE.md`.

Hier wurde nichts gemergt und nichts cherry-gepickt.

Nebenbefund: `CLAUDE.md` auf `dev` enthält den Abschnitt „Plattform-Grants auf
`storage.objects` und `storage.buckets`" **nicht** — der kommt erst mit
`2c7dc39` aus `feature/011`. Der in Schritt 012 eingefügte Abschnitt zum
Build-Schritt steht an anderer Stelle und kollidiert damit nicht.

---

## 3. Wie gebaut wird

```
npm ci                   # Abhaengigkeiten, exakt nach package-lock.json
npm run build            # erzeugt dist-oeffentlich/
npm run ausgabe-pruefen     # prüft den Ausgabeordner (Dateien, Prüfsummen)
npm run startseite-pruefen  # Startseite im Browser, Desktop und Mobil
npm run rewards-pruefen     # Rewards-Seite im Browser, mit Testdaten
npm run browser-pruefen     # Zentrale, Portal und Dashboard im Ausgabeordner
npm run grundlagen-pruefen  # Suchmaschinen, Bibliothek, Anrede, Tastatur
npm run grundlagen-browser-pruefen  # dasselbe im Browser, ohne Aussenverbindung
npm run rechtsseiten-pruefen # Darstellung aller sieben Astro-Unterseiten
npm run flotte-pruefen       # Flotte, Spezialfahrten und der Anfrageweg
npm run anmeldung-pruefen    # die vier Anmeldeseiten (simuliert)
npm run gluecksrad-pruefen   # Gluecksrad: Abbildung, Stopp, Darstellung
npm run dev              # örtlicher Entwicklungsserver
npm run preview          # den fertigen Ausgabeordner ansehen
```

**`npm ci`, nicht `npm install`.** `npm ci` installiert exakt die Versionen aus
`package-lock.json` und bricht ab, wenn Lockdatei und `package.json`
auseinanderlaufen. `npm install` darf die Lockdatei verändern — damit wäre
nicht mehr gesagt, dass zwei Rechner dasselbe bauen. `npm install` bleibt dem
Fall vorbehalten, dass absichtlich eine Abhängigkeit hinzukommt.

Der Build tut zwei Dinge nacheinander:

1. **Bauen.** Alles unter `src/pages/` wird zu HTML. Wegen
   `build.format: 'file'` entsteht `index.html` direkt im Ausgabeordner und
   keine Unterordner-Struktur — so bleiben die gewachsenen Adressen wie
   `impressum.html` erhalten.
2. **Übernehmen.** `tools/bestand-uebernehmen.mjs` kopiert danach die
   Bestandsbereiche unverändert in denselben Ordner.

Telemetrie ist abgeschaltet (`astro telemetry disable`).

---

## 4. Wie die Bestandsbereiche übernommen werden

Maßgeblich ist die Liste `UEBERNAHME` in `tools/bestand-uebernehmen.mjs`.
Was dort nicht steht, wird nicht ausgeliefert.

| Eintrag | Zweck | Dateien | Ausgenommen |
|---|---|---|---|
| `admin/` | Zentrale | 164 | — |
| `fahrer/` | Mitarbeiterportal | 8 | `tests/`, die drei `TESTPROTOKOLL-*.md` |
| `dashboard/` | Weiterleitung auf die Zentrale | 1 | — |
| `assets/` | Symbole, Marke, Ortsdaten | 18 | `yumak-notes.txt` |
| Wurzeldateien | 20 Bestandsseiten und die 29 Dateien, die sie brauchen | 49 | siehe unten |

**Seit Schritt 014 kommen die Wurzeldateien dazu.** Die neue Startseite
verlinkt auf `rewards.html`, `spiele.html`, `anmelden.html`,
`impressum.html`, `datenschutz.html` und `hilfe-kontakt.html`; diese Seiten
verweisen weiter. Verlinkte Ziele müssen erreichbar sein, samt ihrer CSS- und
JS-Dateien. Die Liste `WURZELDATEIEN` zählt sie einzeln auf — kein Glob.

**`index.html` steht ausdrücklich NICHT darin.** Die Wurzelseite kommt seit
Schritt 014 aus Astro. Stünde sie in der Liste, überschriebe der Bestand die
neue Startseite. Genau davor schützt `konflikteSuchen()`: Der Build bräche ab,
statt still zu überschreiben.

**Warum `assets/` und `logo.png` mitmüssen, obwohl sie keine Portalseiten
sind:** Die relativen Pfade des Bestands greifen über die Ordnergrenze hinaus.
`admin/` lädt `../assets/icons/*.svg` und `../logo.png`; `fahrer/` lädt
`../admin/supabase-config.js`, `../admin/personal-shared.js`,
`../admin/qualitaet-shared.js`, `../admin/ui-text.js`,
`../admin/ui-visible-terms.js` und `../logo.png`.

Zusätzlich greift überall eine feste Sperre gegen `node_modules/`,
`test-results/`, `.gitkeep`, `.gitignore` und `.DS_Store`.

### Was ausdrücklich draußen bleibt

`supabase/`, sämtliche `*.md`, `screenshots/`, `fahrer/tests/`, `tools/`,
`src/`, `.claude/`, `fix_admin_auth.py`, die Vergleichsseiten und Videobelege
der Vorschau, die Aufnahmen aus `.belege-astro/` sowie die unreferenzierten
Bildvorlagen `logo-original-full.png` und `tg-icon-original.png`.

---

## 5. Namenskonflikte zwischen `public/` und dem Bestand

Beide Welten landen im selben Ausgabeordner. Astro schreibt zuerst alles aus
`public/`, danach kopiert das Werkzeug den Bestand darüber. Ohne Schutz würde
der Bestand eine gleichnamige Datei aus `public/` **still überschreiben**.

**Gefundene Konflikte (geprüft am 19.09.2026):** Die Vorschau bringt neun
Dateien mit, die im Bestand denselben Pfad haben — `assets/brand/taxi-germersheim-logo.svg`
und acht `assets/icons/*.svg` — dazu `yumak-avatar.png`. Alle zehn sind
**byteweise identisch** mit dem Bestand; die Vorschau hatte sie von dort
übernommen.

**Entscheidung:** Diese zehn Dateien wurden **nicht** nach `public/` kopiert.
Der Bestand ist die maßgebliche Fassung; die neuen Seiten verweisen auf
`assets/icons/…`, `assets/brand/…` und `yumak-avatar.png` wie bisher. Nach
`public/assets/` kamen nur `hero/` (8 Dateien) und `fleet/` (14 Dateien) —
dort gibt es im Bestand nichts Gleichnamiges.

**Schutz im Build** (`konflikteSuchen()` in `tools/bestand-uebernehmen.mjs`),
vor dem Kopieren, nicht danach:

- **Gleicher Inhalt** → Warnung, der Build läuft weiter. Die Datei gehört aus
  `public/` entfernt.
- **Abweichender Inhalt** → **der Build bricht ab**, es wird nichts
  überschrieben. Welche Fassung gelten soll, ist eine Entscheidung und keine
  Frage der Kopierreihenfolge.

Beides wurde mit einer absichtlich erzeugten Kollision nachgemessen: Fall
„gleich" endete mit Exitcode 0 und Warnung, Fall „abweichend" mit Exitcode 1
und benannter Datei.

---

## 6. Übernommene Design-Grundlage (Schritt 013)

Quelle ist die Vorschau `C:\Users\enesc\Desktop\taxi-figma-vorschau`,
Commit `113a73e`. **Die Vorschau bleibt die verbindliche Referenz.** Wer hier
etwas ändert, ändert es dort zuerst.

| Datei | Inhalt |
|---|---|
| `src/styles/design.css` | Farben, Schriftfamilien, Radius, Bewegungsklassen, reduzierte Bewegung — aus `src/index.css` der Vorschau |
| `src/styles/schriften.css` | 18 `@font-face`-Blöcke auf örtliche Dateien |
| `public/schriften/` | Outfit (5 Schnitte) und Lora (4 Schnitte), je latin und latin-ext, 18 Dateien, rund 500 KB |
| `src/layouts/Grundlage.astro` | Seitenrahmen, Vorladen der zwei wichtigsten Schriftschnitte |
| `src/components/Abschnitt.astro` | Abschnittsrahmen, dunkel und hell — aus `Section()` |
| `src/components/AbschnittKopf.astro` | Label, Überschrift, Fließtext — aus `SectionHead()` |
| `src/components/Knopf.astro` | drei Ausprägungen; wird zum `<a>`, sobald `href` gesetzt ist |
| `src/components/Enthuellen.astro` | einmalige Enthüllung beim Scrollen — aus `Reveal()` |
| `src/components/HeroBuehne.astro` | das bestätigte Videoverhalten — aus `HeroMedia()` |
| `public/assets/hero/` | 4 Videofassungen, 2 Schlussbilder, 2 Standbilder |
| `public/assets/fleet/` | 14 Fahrzeugbilder, je 1600 und 900 Punkte Breite |

Alle 22 Medien wurden nach dem Build gegen die Vorschau **byteweise**
verglichen.

### Medien im Repository — was das heißt

Die Medien liegen normal in Git, so entschieden am 20.09.2026. Kein Git LFS,
keine externe Medienablage. Aufgenommen wurden ausschließlich die
ausgelieferten Webfassungen: vier Videofassungen (1920 × 1080 und 1280 × 720,
je MP4 und WebM, ohne Tonspur), zwei Schlussbilder, zwei Standbilder, 14
Fahrzeugbilder. **Nicht** aufgenommen: das Originalvideo `Werbung.mp4`, die
Zwischenfassungen aus der Qualitätsabstimmung, die Vergleichsaufnahmen und
-seiten, Sicherungsarchive und Testbelege. Jede der 14 Fahrzeugdateien ist in
der freigegebenen Vorschau nachweislich referenziert.

Umfang: rund 78 MB, davon 75 MB Hero-Medien. Das `.git` maß vorher 33 MB.

**Zur Dauerhaftigkeit, genauer als zuvor von mir formuliert:** Ein späteres
einfaches Löschen der Dateien entfernt sie aus dem Arbeitsstand, **nicht** aus
der Historie — die Commits, die sie enthalten, bleiben bestehen, und ein Klon
lädt sie weiterhin mit. Das heißt aber nicht, dass sie unumkehrbar gespeichert
wären: Mit einem Umschreiben der Historie (`git filter-repo` oder
vergleichbar) lassen sie sich entfernen. Das ändert alle betroffenen
Commit-Kennungen, muss mit allen Beteiligten abgestimmt werden und ist
deshalb ein bewusster Eingriff — aber ein möglicher.

### Zwei bewusste Abweichungen von der Vorschau

1. **Schriften örtlich statt vom Google-CDN.** Die Vorschau lädt sie über
   `fonts.googleapis.com`. Jeder solche Aufruf überträgt die IP-Adresse des
   Besuchers an einen Dritten — für einen deutschen Firmenauftritt ein
   vermeidbares Datenschutzrisiko. Vermeidbar heißt hier: 18 Dateien, rund
   500 KB. Das Aussehen ändert sich dadurch nicht. Die Prüfung stellt fest,
   dass in der ausgelieferten Seite **kein** Aufruf an Google steht.
2. **Kein React.** Die Bausteine sind Astro-Komponenten mit gewöhnlichem
   JavaScript. Die öffentliche Seite bleibt damit ohne Framework-Laufzeit.
   Die Vorlagen sind Zeile für Zeile übernommen, samt Begründungen.

### Videoverhalten — unverändert übernommen

Einmal abspielen, stumm, kein Loop, kein Neustart beim Scrollen. Danach bleibt
das Logo als Schlussbild stehen; auf dem Desktop rückt es in die freie rechte
Fläche, auf Mobil bleibt es mittig. Pause und „Erneut ansehen" sind jederzeit
erreichbar. Bei reduzierter Bewegung wird der Film mit `preload="none"`
eingehängt und nicht gestartet. Bei abgelehntem Autoplay bleibt das Standbild
stehen, bei Ladefehler verschwindet die Bedienung.

Die Bandbreitenbremse aus der Vorschau ist mit übernommen: Film und Schlussbild
hängen sich erst nach `load` plus Leerlauf ins Dokument. Und nur die sichtbare
Bühne tut das — auf Mobil lädt kein Desktop-Film mit.

---


## 7. Übernommene Startseite (Schritt 014)

Quelle ist `src/Site.tsx`, `src/sections.tsx`, `src/layout.tsx` und
`src/shared.tsx` der Vorschau, Commit `113a73e`. **Ohne neue Gestaltung.**

| Datei | Inhalt |
|---|---|
| `src/inhalte.ts` | alle Texte, Leistungen, Flotte, Region, Rewards, FAQ — aus `content.ts` |
| `src/pages/index.astro` | Hero mit Video, Schnellwahl, beide Adressfelder, Anfrageband, Abschlussaufruf |
| `src/components/Kopfbereich.astro` | Navigation, Mobilmenü, Grund beim Scrollen |
| `src/components/Anfragedialog.astro` | die Fahrtanfrage in drei Schritten |
| `src/components/LeistungenAbschnitt.astro` | alle sieben Leistungen, Transportschein-Kasten |
| `src/components/FlotteAbschnitt.astro` | neun Fahrzeuge mit Filter |
| `src/components/RegionAbschnitt.astro` | Bildband mit Orten |
| `src/components/RewardsAbschnitt.astro` | Yumak-Szene, Glücksrad, Box, Taxi Rush |
| `src/components/KontaktAbschnitt.astro` | vier Kontaktwege, häufige Fragen |
| `src/components/Fusszeile.astro` | Adresse, Leistungen, Rechtliches |
| `src/components/Symbol.astro` | alle 18 Symbole an einer Stelle |

Kein React: Die Seite kommt ohne Framework-Laufzeit aus. Die Vorlagen sind
Zeile für Zeile übernommen, samt Begründungen.

### Die Fahrtanfrage endet bei WhatsApp — und sagt das auch

Im Backend gibt es **keine Annahmestelle für Fahrtanfragen** (siehe
`BACKEND-READY.md` und die Prüfung vom 19.09.2026: im ganzen Projekt zwei
`fetch`-Aufrufe, beide auf lokale JSON-Dateien). Der Weg endet deshalb mit
einer vorbereiteten WhatsApp-Nachricht; das Telefon steht gleichwertig daneben.

Die Nachricht trägt **alle erfassten Angaben, unverändert**: Leistung,
Abholadresse, Zieladresse, Zeitpunkt. Sie trägt **keine** Entfernung, keinen
Preis, keine Fahrzeit und keine Bestätigung — nichts davon ist bekannt.

Beschriftet ist es an drei Stellen, damit kein falscher Eindruck entsteht:

- Im Einstieg: „Ihre Anfrage geht über WhatsApp oder Telefon an uns. Eine Fahrt
  ist erst bestätigt, wenn wir uns bei Ihnen gemeldet haben."
- In der Zusammenfassung, vor dem Absenden: „Gesendet ist sie erst, wenn Sie
  dort auf Senden tippen. Eine Fahrt ist damit noch nicht bestätigt."
- Nach dem Öffnen: „WhatsApp wurde geöffnet … Bitte tippen Sie in WhatsApp auf
  Senden – erst dann erreicht uns die Anfrage."

Die Prüfung liest die erzeugte Adresse aus, **ohne etwas zu versenden**:
`window.open` wird abgefangen. Zusätzlich wird geprüft, dass die Nachricht
keines der Wörter `€`, `km`, `Preis`, `Kosten`, `Minuten`, `bestätigt` oder
`gebucht` enthält.

### Erhaltene Einstiege

| Adresse | Wirkung |
|---|---|
| `index.html?page=booking` | öffnet die Fahrtanfrage |
| `index.html?page=rewards` | springt zum Rewards-Abschnitt |
| `index.html?page=help-public` | springt zu Kontakt und häufigen Fragen |
| `index.html?page=services` | springt zu den Leistungen (aus `rewards.html` verlinkt) |
| `index.html?page=home` | Startseite |
| `/?buchung=1#buchung` | öffnet die Fahrtanfrage (Weg der Vorschau) |
| `#spezialfahrten` | alte Sprungmarke, führt zum Leistungsabschnitt |

Der Parameter wird nach der Auswertung aus der Adresse genommen, damit ein
Neuladen oder Browser-Zurück die Anfrage nicht erneut aufspringen lässt.

### Unterschiede zur freigegebenen Vorschau — offen benannt

Drei Stellen weichen bewusst ab. Alle drei betreffen Ziele, die es im Projekt
anders gibt als in der Vorschau.

| Stelle | Vorschau | Hier | Grund |
|---|---|---|---|
| Navigation „Rewards" und „Spiele" | `/rewards`, `/spiele` (Nachbildungen) | `rewards.html`, `spiele.html` | Diese Seiten existieren im Projekt bereits **mit echter Backend-Anbindung**. Eine Nachbildung daneben wäre eine zweite Wahrheit. |
| Rewards-Kacheln Glücksrad und Box | „Als Demo ausprobieren" → `/spiele/gluecksrad-demo`, `/spiele/yumaks-box-demo` | „In der Spielewelt ansehen" → `spiele.html` | **Die Demoseiten sind noch nicht übernommen.** „Als Demo ausprobieren" wäre unwahr, solange sie fehlen. |
| Rewards-Kachel Taxi Rush | `/spiele/taxi-rush` | `spiele.html#taxiRushTitle` | Taxi Rush läuft im Bestand auf `spiele.html`. |
| Hinweistext unter den Kacheln | nennt die Demos | nennt nur, was erreichbar ist | siehe oben |
| Hinweis unter dem Einstieg | „Designvorschau – es wird keine Fahrt gebucht." | „Ihre Anfrage geht über WhatsApp oder Telefon an uns …" | Es ist keine Vorschau mehr; der Satz muss den echten Weg beschreiben. |

Die Zustandsanzeige der beiden gesperrten Kacheln heißt jetzt „Noch gesperrt"
statt „Demo" und nennt den Grund: „für Kundenkonten derzeit gesperrt"
beziehungsweise „erscheint nur nach einem bestätigten Gewinn". Das entspricht
dem tatsächlichen Stand — auf `spiele.html` steht die Schaltfläche des
Glücksrads auf `disabled`.

**Offen für einen späteren Schritt:** Die drei Demoseiten aus der Vorschau
(Glücksrad-Demo, Yumaks-Box-Demo, Taxi Rush als eigene Seite) sind noch nicht
übernommen. Solange das so ist, führt die Startseite ehrlich auf den Bestand.

### Was die Startseite NICHT tut

Sie ändert nichts am Backend, an `customer-auth.js`, an den Migrationen oder an
einer der Bestandsseiten. Sie ersetzt ausschließlich `index.html`.

---

## 8. Was die bisherige Veröffentlichung anpassen muss

### Geklärt am 20.09.2026 (Auskunft der Geschäftsführung)

> Die öffentliche Webseite **https://taxigermersheim.de/** läuft auf
> **WordPress** und ist vom lokalen Entwicklungsprojekt **getrennt**.
> `www` leitet auf die Domain ohne `www` weiter. Hosting und späterer
> Austausch werden mit dem IT-Dienstleister geklärt.

Damit ist die Frage aus Schritt 013 beantwortet, und sie fällt anders aus als
der lokale Befund vermuten ließ: Was heute unter der Domain steht, ist **nicht**
dieses Repository. Das Repository ist der Entwicklungsstand.

**Was daraus folgt:**

- **Die Domainwurzel gilt.** `https://taxigermersheim.de/` ist eine Wurzel, kein
  Unterpfad. `base` in `astro.config.mjs` bleibt deshalb ungesetzt, und die
  wurzelabsoluten Pfade der neuen Seiten (`/assets/hero/…`, `/schriften/…`)
  stimmen. Sollte der Auftritt später doch unter einem Unterpfad liegen, ist
  `base` die einzige nötige Änderung.
- **Der Austausch von WordPress gegen den Ausgabeordner ist ein eigener
  Vorgang** und läuft über den IT-Dienstleister. Er blockiert die lokale
  Umsetzung nicht.
- **Was der Dienstleister braucht:** den Inhalt von `dist-oeffentlich/`, erzeugt
  mit `npm ci && npm run build`. Der Ordner ist ein vollständiger statischer
  Auslieferstand — gebaute öffentliche Seiten und unveränderter Bestand
  nebeneinander, in genau der Ordnerstruktur, die gelten soll.
- **Vor dem Austausch zu klären:** Welche Adressen die heutige WordPress-Seite
  bedient, die es hier nicht gibt. Sonst laufen bestehende Verweise und
  Suchmaschinentreffer ins Leere. Das ist noch **nicht geprüft** — die
  WordPress-Seite wurde nicht abgerufen.
- **Erwünschter Nebeneffekt:** Interne Dateien, die heute im Repository liegen —
  `supabase/` mit 11 Migrationen, alle Testprotokolle und Einspielpläne,
  `screenshots/`, `fix_admin_auth.py` — sind kein Teil der Auslieferung.

Keine Hosting- oder Domaineinstellung wurde angefasst. Die GitHub-CLI wurde
nicht installiert.

---

## 9. Prüfstand nach Schritt 014

Alle Läufe am 20.09.2026, gegen den frisch erzeugten Ausgabeordner.
**290 Prüfungen, alle bestanden.**

**`npm run ausgabe-pruefen`** — 88 Prüfungen, 285 Dateien. Darunter: die
Startseite ist die gebaute, nicht die alte Bestandsseite; alle sechs verlinkten
Unterseiten liegen im Ausgabeordner; alle Bestandsdateien byteweise gleich;
alle 22 Medien byteweise gleich mit der Vorschau; 18 Schriftdateien vorhanden;
kein Aufruf an Google Fonts; keine SQL-, Dokumentations-, Test-, Vergleichs-
oder Quelldatei in der Ausgabe.

**`npm run startseite-pruefen`** — 187 Prüfungen auf Desktop (1440 × 900) und
Mobil (390 × 844):

- Alle verlinkten Unterseiten antworten mit 200.
- Videoverhalten unverändert: läuft einmal von selbst an, Pause hält an, am Ende
  steht das Schlussbild (Deckung 1) und der Film ist ausgeblendet (Deckung 0) —
  kein zweites Logo. Desktop: das Logo rückt. Mobil: es bleibt mittig.
  „Erneut ansehen" startet wieder. Nur die sichtbare Bühne hängt einen Film ein.
- Beide Adressfelder im Einstieg, auf Desktop und Mobil; die Marken melden
  „ausgefüllt".
- **Alle sieben Anfrageknöpfe**, je auf Desktop und Mobil: Dialog sichtbar im
  Bild, die angeklickte Leistung steht sofort im Formular, beide Adressen
  bleiben erhalten, die Seite bleibt hinter dem Dialog stehen, nach dem
  Schließen steht sie wieder an ihrem Platz, die Zusammenfassung nennt die
  richtige Leistung und beide Adressen, die WhatsApp-Nachricht trägt alles und
  nichts Erfundenes, und der Abschluss sagt, dass erst Senden die Anfrage
  abschickt.
- Die Einstiege `?page=booking`, `?page=rewards`, `?page=help-public` und
  `?page=services` landen am richtigen Ort; der Parameter verschwindet danach.
- Kein Block bleibt unsichtbar, keine fehlenden Dateien, keine Skriptfehler.

**`npm run browser-pruefen`** — 15 Prüfungen: Zentrale und Mitarbeiterportal
zeigen ihr Anmeldefeld und laden `../logo.png`, das Dashboard leitet weiter.

**Sichtvergleich mit der Vorschau** —
`VORSCHAU_ORDNER=… node tools/vergleiche-mit-vorschau.mjs` nimmt beide Seiten
unter denselben Bedingungen auf, Film jeweils bis zum Schlussbild vorgespult.
Seitenhöhe Desktop 10663 px gegen 10708 px, Mobil 17680 px gegen 17733 px —
0,4 beziehungsweise 0,3 Prozent Unterschied, erklärt durch die geänderte
Hinweiszeile. Dieselben Abschnitte in derselben Reihenfolge. Die Aufnahmen
liegen in `.belege-astro/vergleich/`; entschieden hat der Mensch am Bild.

### Zwei Fehler, die dabei gefunden und behoben wurden

1. **Die Seite sprang beim Öffnen des Dialogs.** `document.body.style.overflow
   = 'hidden'` verschob die Bildlaufposition — bei drei der sieben Knöpfe um
   rund 480 Punkte, der angeklickte Knopf rutschte von 487 auf 0. Hinter dem
   halbdurchsichtigen Hintergrund ist das zu sehen. Behoben mit
   `position: fixed` und negativem `top`.
2. **Nach dem Schließen fuhr die Seite sichtbar zurück.** Die Wiederherstellung
   lief durch `scroll-behavior: smooth` als Animation über bis zu 1298 Punkte.
   Behoben mit `behavior: 'instant'` — eine Wiederherstellung ist ein Zustand,
   keine Bewegung.

Drei weitere gemeldete „Seitensprünge" waren **Fehler der Prüfung**, nicht der
Seite: Die Scroll-Schleife maß die Seitenhöhe nur einmal, während Bilder noch
nachluden. Das ist korrigiert; die Messung wartet jetzt, bis die Seite
stillsteht.

**Was NICHT geprüft ist:** Es wurde sich nirgends angemeldet, keine Nachricht
versendet und niemand angerufen. Ob Anmeldung, Dokumenteingang und
Krankmeldungen gegen die produktive Instanz funktionieren, sagen diese Läufe
nicht.

---

## 10. Rewards-Seite und Yumak (Schritt 016)

`rewards.html` kommt seit Schritt 016 aus Astro, unter derselben Adresse.

**Was unverändert blieb:** `customer-auth.js`, alle Migrationen, `admin/`,
`fahrer/`, die alte `rewards.html` im Repository. An
`rewards-customer.js` wurden **6 Zeilen ergänzt, keine geändert** — nach dem
Laden werden dieselben Daten zusätzlich als Ereignis weitergereicht, damit die
neue Seite Fortschritt und Stufe daraus ableiten kann. Kein zweiter Aufruf,
kein veränderter Wert.

**Keine erfundenen Kontodaten.** Das Beispielkonto der Vorschau
(`VORSCHAU_KONTO`) ist bewusst nicht übernommen. Punkte, Stufe,
qualifizierende Fahrten und Drehs erscheinen ausschließlich aus
`get_my_rewards_overview`. Ohne Anmeldung steht dort ein Gedankenstrich —
nachgemessen: im Kontobereich keine einzige Ziffer.

**Vier Zustände:** lädt, ohne Anmeldung, geladen (mit eigenem Hinweis bei
leerem Konto), Ladefehler mit Wiederholung und Telefonnummer.

**Aus der Übernahmeliste genommen:** `rewards.html` (kommt aus Astro) und
`rewards-customer.css` (wurde nur von der alten Seite gebraucht).

**Yumak** als wiederverwendbare Komponente `src/components/Yumak.astro` mit
zentralem Controller an `window.Yumak`: `spiele`, `sage`, `ruhe`,
`anhalten`, `fortsetzen`. Nur idle, wave und curious; graue Fassungen,
lighten, Bodenmaske. Standbild bei reduzierter Bewegung, Ladefehler und
abgelehntem Autoplay. Pause außerhalb des Bildes und bei verborgenem Tab.

### Offener Fehler — Yumak startet nicht von selbst

> **Nicht behoben. Nicht als gelöst melden.**

Beobachtung des Auftraggebers am 21.09.2026: Nach dem Neuladen der Seite
bewegt sich Yumak nicht. Erst „Bewegung anhalten" und danach „Bewegung
fortsetzen" startet die Animation.

Die Ursache ist **nicht gesucht und nicht gefunden** — die weitere
Fehlersuche wurde auf Anweisung ausgesetzt. Zweiter offener Punkt: Die
automatisierte Prüfung hatte den Start gemeldet, sie hat den Fehler also
nicht erfasst.

**Zwischenlösung, nicht Behebung:** `STANDBILD_NUR = true` in
`Yumak.astro`. Die Kundenansicht zeigt nur das freigegebene graue Standbild;
die Bedienschaltfläche wird nicht mehr ausgegeben. Controller, Videos und die
vollständige Ablauflogik bleiben erhalten und sind hinter dem Schalter
erreichbar. Ein Umlegen auf `false` bringt den Fehler zurück.

### Funktionaler Abschluss von Schritt 016

- **Anmeldung und Rückkehr:** `anmelden.html` nimmt `?weiter=` entgegen und
  springt danach zurück. Das Ziel wird gegen eine feste Liste geprüft
  (`ERLAUBTE_ZIELE`), ein fremdes Ziel fällt auf `meinkonto.html` zurück —
  damit ist keine Weiterleitung nach außen möglich. Der Rewards-Knopf zeigt
  auf `anmelden.html?weiter=rewards.html`.
- **Gewinnverlauf** aus `rewards_wheel_spins`, dieselbe Abfrage wie in
  `spiele.js`, die letzten zehn Einträge. Eigene Zustände für lädt, leer,
  Fehler und Liste.
- **Abmelden** ruft `signOut` und leert anschließend Name, Punkte, Status,
  Kennzahlen und Gewinnverlauf aus dem Dokument (`persoenlichesLeeren()`).
- **Interne Entwicklungshinweise** aus der Kundenansicht entfernt.

Nicht verändert: Authentifizierung, Punkteberechnung, Berechtigungen,
Datenbankstruktur.

---

## 11. Grundlagen und Einzelfehler (Schritt 017)

**Die ausführliche Fassung steht in `ABSCHLUSS-OEFFENTLICHE-WEBSEITE.md`,
Abschnitt 8.** Hier nur, was den Bau und die Übernahme betrifft.

### Neu im Ausgabeordner

| Datei | Woher |
|---|---|
| `robots.txt`, `sitemap.xml` | erzeugt von `tools/suchmaschinen-dateien.mjs` beim Bauen |
| `favicon.ico`, `favicon-32/192/512.png`, `apple-touch-icon.png` | aus `tg-icon-original.png`, erzeugt von `tools/marke-symbole.mjs` |
| `teilen-vorschau.jpg` | Ausschnitt der echten Aufnahme `mercedes-e-klasse-schwarz-1600.jpg` |
| `vendor/supabase-js-2.117.0.js` | selbst mitgelieferte Bibliothek, feste Version |

Die Symbole und das Vorschaubild liegen in `public/` und werden wie die
übrigen Medien übernommen. Sie werden **nicht bei jedem Bau neu erzeugt** —
`npm run marke-symbole` läuft nur, wenn sich das Markenzeichen ändert.

### Neu in der Übernahme

- **`vendor/`** kommt als eigener Eintrag dazu. `HERKUNFT.md` darin ist eine
  interne Notiz und ausgenommen.
- **Drei Dateien sind aus der Liste genommen:** `konto-einrichtung.html`
  (ausdrückliche Demo, von keiner Seite verlinkt, verlangt einen
  Sitzungsschlüssel, den niemand setzt), `customer-auth-demo.js` (nur von
  jener Seite geladen) und `customer-journey-demo.js` (von niemandem
  geladen). Die Begründung steht ausführlich in `bestand-uebernehmen.mjs`.
- **`auth-demo.css` bleibt.** Trotz des Namens eine echte Stilvorlage von
  elf Kontoseiten.

### Die eine benannte Ausnahme vom Byte-Vergleich

`tools/kopfangaben-bestand.mjs` setzt nach dem Kopieren in jede der 18
Bestandsseiten **einen** Block vor `</head>`: Seitensymbol, canonical und,
wo die Seite noch nichts dazu sagte, eine robots-Angabe.

Damit die Zusicherung „der Bestand wird unverändert ausgeliefert" prüfbar
bleibt, steht der Block zwischen zwei Markierungen (`tg:kopfangaben Anfang`
und `… Ende`) und wird von `ausgabe-pruefen` vor dem Vergleich wieder
herausgeschnitten. Bleibt danach auch nur ein Byte Unterschied, fällt die
Prüfung durch.

**Der Zusatz darf ausschließlich anfügen, niemals umschreiben.** Trifft er
auf eine Seite, die nicht ins Verzeichnis gehört, aber `index` im Kopf
trägt, **bricht er den Bau ab** und verlangt die Korrektur in der Quelldatei.
Genau so ist es am 23.09.2026 bei `meinkonto.html` und `kundenkonto.html`
gelaufen: Ein erster Versuch, das im Ausgabeordner umzuschreiben, wurde vom
Byte-Vergleich sofort als Abweichung gemeldet. Korrigiert wurden die beiden
Quelldateien.

### Was unverändert blieb

Datenbank, Berechtigungen, Punkteberechnung, der Ablauf der Anmeldung,
`admin/`, `fahrer/`, `dashboard/`, die freigegebene Startseite, das
Hero-Video und sein Verhalten. Yumak bleibt Standbild.

`admin/supabase-auth.js`, `admin/taxi-data-service.js` und
`fahrer/employee-supabase.js` laden die Bibliothek **weiterhin vom CDN** —
das gehört zu Punkt 2 und 3 der Reihenfolge, nicht hierher.

---

## 12. Rechtsseiten und Hilfe (Schritt 018)

**Die ausführliche Fassung steht in `ABSCHLUSS-OEFFENTLICHE-WEBSEITE.md`,
Abschnitt 9.** Hier nur, was Bau und Übernahme betrifft.

### Vier weitere Seiten kommen aus Astro

`impressum.html`, `datenschutz.html`, `hilfe-kontakt.html` und `404.html` —
unter denselben Adressen wie bisher. Aus Bestandsmaterial stammen damit noch
**14 von 20** ausgelieferten Seiten.

### Aus der Übernahmeliste genommen

| Datei | Grund |
|---|---|
| `impressum.html` | kommt aus Astro |
| `datenschutz.html` | dito |
| `hilfe-kontakt.html` | dito |
| `404.html` | dito |
| `legal-pages.css` | wurde **nur** von `impressum.html` und `datenschutz.html` geladen |
| `hilfe-kontakt.css` | wurde **nur** von `hilfe-kontakt.html` geladen |

Nachgesehen, nicht vermutet. Stünden die vier HTML-Dateien weiter in der
Liste, überschriebe der Bestand die neuen Seiten — genau davor schützt
`konflikteSuchen()`: Der Build bräche ab, statt still zu überschreiben.

### Neu in `kopfangaben-bestand.mjs`

Die Liste `AUS_ASTRO` nennt jetzt ausdrücklich die sechs Seiten, die Astro
selbst baut. Sie dürfen den nachträglich eingesetzten Kopfblock **nicht**
bekommen — sie bringen Symbol, canonical und Open Graph über
`Grundlage.astro` schon mit. Sonst stünde alles doppelt im Seitenkopf. Die
Liste wächst mit jeder übernommenen Seite.

Der Zusatz bearbeitet dadurch noch 14 statt 18 Bestandsseiten.

### Neue Bauteile

`Unterseitenkopf.astro` (Rückweg, Label, Überschrift) und
`Rechtskarten.astro` (die Kartenreihe der Rechtsseiten). Beide aus dem
vorhandenen Vorrat gebaut, keine neue Gestaltung.

### Zustimmungsbanner: untersucht, bewusst nicht übernommen

Es steuerte genau einen Dienst — Google-Maps-Einbettungen — und im
ausgelieferten Stand gibt es **keinen einzigen `.map-container` und kein
einziges `<iframe>`**. Dazu steht der Kartenschlüssel auf einem Platzhalter.
Ein Schalter ohne Wirkung wäre eine Behauptung über eine Einwilligung, die
nichts einwilligt. Die vollständige Untersuchung steht in Abschnitt 9.2 der
Bestandsaufnahme.

`flotte.html` trägt das wirkungslose Banner weiterhin — die Seite bleibt
vorerst Bestand und wird im nächsten Paket übernommen.

### Die 404-Seite braucht eine Hosting-Einstellung

Die gestaltete Datei allein bewirkt nichts. Der Server muss seine
Fehlerseite für den Statuscode 404 auf `/404.html` zeigen lassen **und**
dabei den Code 404 senden, nicht 200. Das ist Angabe **I4** an den
IT-Dienstleister und von hier aus nicht prüfbar.

---

## 13. Flotte und Spezialfahrten (Schritt 019)

**Die ausführliche Fassung steht in `ABSCHLUSS-OEFFENTLICHE-WEBSEITE.md`,
Abschnitt 10** — dort auch der vollständige Vergleich des alten
Anfragewegs, Feld für Feld. Hier nur, was Bau und Übernahme betrifft.

### Drei weitere Seiten aus Astro

`flotte.html`, `spezialfahrten.html` und `spezial-anfrage.html` — unter
denselben Adressen. Aus Bestandsmaterial stammen damit noch **11 von 20**.

### Aus der Übernahmeliste genommen

| Datei | Grund |
|---|---|
| `flotte.html` | kommt aus Astro |
| `spezialfahrten.html` | dito |
| `spezial-anfrage.html` | dito |
| `special-services.css` | wurde **nur** von diesen beiden Spezialseiten geladen |
| `special-services.js` | wurde **nur** von `spezial-anfrage.html` geladen |

Nachgesehen, nicht vermutet.

### Ein Formular statt zwei

`special-services.js` (762 Zeilen) führte ein **zweites** Anfrageformular
mit eigener Prüfung: neun Fahrtarten, je neun bis fünfzehn Felder. Diese
Felder sind nicht verlorengegangen — sie stehen jetzt in `FAHRTARTEN`
(`inhalte.ts`) und werden vom **gemeinsamen** `Anfragedialog.astro`
erfasst.

Der Dialog nimmt dafür zwei neue Eigenschaften:

```
<Anfragedialog />                              Startseite: ohne Zusatzangaben
<Anfragedialog arten={FAHRTARTEN} pflichtDetails />   Spezialseiten
```

**Die Startseite bleibt unberührt** — weder im Ablauf noch im Gewicht. Der
Prüflauf stellt ausdrücklich fest, dass sie weder den Zusatzblock noch die
Pflichtschaltung trägt.

Entfallen sind aus den Feldsätzen ausschließlich `pickup`, `destination`,
`date` und `time` (und ihre Varianten) — genau die Angaben, die der Dialog
selbst erfasst. Sonst nichts. Der Prüflauf füllt für jede der neun
Fahrtarten jedes Feld aus und sucht jeden Wert in der WhatsApp-Nachricht
wieder.

### Kein Zustimmungsbanner mehr im Auslieferstand

Mit `flotte.html` verschwindet der letzte Schalter ohne Wirkung. Begründung
unverändert Abschnitt 9.2 der Bestandsaufnahme.

### Die Fahrzeugbilder

Kommen jetzt aus `public/assets/fleet/`, in zwei Auflösungen. Die alte
Seite zog sie über einen Katalog im Seitenskript aus `admin/images/` — mit
Dateinamen wie `adminimagesvw-touran-ger-tx-300-premium.jpg.png`, und zwei
Einträge fehlten dort ganz.

### `AUS_ASTRO` wächst auf neun

`kopfangaben-bestand.mjs` bearbeitet dadurch noch 11 statt 14
Bestandsseiten.

---

## 14. Die Anmeldeseiten (Schritt 020)

**Die ausführliche Fassung steht in `ABSCHLUSS-OEFFENTLICHE-WEBSEITE.md`,
Abschnitt 11.** Hier nur, was Bau und Übernahme betrifft.

### Vier weitere Seiten aus Astro

`anmelden.html`, `registrieren.html`, `passwort-vergessen.html` und
`passwort-zuruecksetzen.html` — unter denselben Adressen. Aus
Bestandsmaterial stammen damit noch **7 von 20**.

Eine eigene Bestätigungsseite gibt es nicht: Der Link aus der Reset-Mail
landet auf `passwort-zuruecksetzen.html`, diese Seite **ist** die
Rückkehrseite.

### Aus der Übernahmeliste genommen

Nur die vier HTML-Dateien. **Die Stilvorlagen bleiben**, anders als in den
Schritten 018 und 019: `auth-demo.css`, `style.css`,
`public-visual-repair.css` und `public-system.css` werden weiterhin von
den sieben verbliebenen Kontoseiten gebraucht. Nachgesehen, nicht vermutet.

`public-system.js` bleibt ebenfalls — es sorgt im alten Seitengerüst für
Navigation und Sitzungsverweise. Die vier neuen Seiten laden es nicht mehr;
`Kopfbereich.astro` bringt beides mit.

### Eine Anmeldelogik, nicht zwei

**`customer-auth.js` wurde eingebunden, nicht ersetzt.** An der Datei
selbst wurde nichts geändert. Die vier Seiten rufen dieselben Funktionen wie
bisher: `signInWithPassword`, `signUp`, `getClient` →
`resetPasswordForEmail`, `getClient` → `onAuthStateChange` /
`getSession` / `updateUser`.

Eingebunden wird sie wie auf der Rewards-Seite, als
`<script is:inline src="/customer-auth.js">` am Seitenende.

### Neue Bauteile

`Anmeldekarte.astro` (der Kartenrahmen), `Passwortfeld.astro` (Feld mit
Anzeigen-Schalter) und `Passwortregeln.astro` (die drei Regeln und die
Stärkeanzeige). Die `data-rule`-Schlüssel `len`, `upper`, `number`
und die Klasse `is-ok` heißen wie im Bestand.

### `AUS_ASTRO` wächst auf dreizehn

`kopfangaben-bestand.mjs` bearbeitet dadurch noch 7 statt 11
Bestandsseiten.

---

## 15. Taxi Rush (Schritt 023, einmalig vorgezogen)

> Schritt 022 (Glücksrad) hat hier keinen eigenen Abschnitt: Er hat an
> Bau und Übernahme nichts geändert. Er steht in
> `ABSCHLUSS-OEFFENTLICHE-WEBSEITE.md`, Abschnitt 12.

**Die ausführliche Fassung steht in `ABSCHLUSS-OEFFENTLICHE-WEBSEITE.md`,
Abschnitt 13.** Hier nur, was Bau und Übernahme betrifft.

### Keine neue Astro-Seite

`spiele.html` bleibt eine Bestandsseite. Aus Bestandsmaterial stammen
weiterhin **7 von 20** Seiten. Das Spiel wurde im vorhandenen Markup
ersetzt, nicht als eigene Seite gebaut.

### Neu in der Übernahmeliste

Eine Zeile in `tools/bestand-uebernehmen.mjs`:

```
'spiele.css', 'style.css', 'taxi-rush.css', 'wallet-gutscheine.css',
```

`taxi-rush.js` stand bereits in der Liste. **`design-vorlagen/` steht
nicht darin** und darf nicht hineinkommen — die Vorlage ist eine
Designreferenz, keine auszuliefernde Seite. Der Prüflauf stellt das fest.

### Reihenfolge der Stilvorlagen

`taxi-rush.css` wird in `spiele.html` **nach** `spiele.css` geladen. Das
ist bedeutungstragend: Bei gleicher Genauigkeit gewinnt die spätere Datei.
Der Prüflauf sieht die Reihenfolge ausdrücklich nach.

### Jede Regel trägt `.tr-app ` als Vorsatz

Nicht Kosmetik, sondern nötig: Das Gestaltungssystem der Seite setzt
`!important` auf Elementnamen (`style.css:1317` und `:1334`) und benutzt
`body.tg-public :where(…)` (`public-system.css:72`). Eine einzelne Klasse
verliert dagegen. Mit `.tr-app ` davor liegen die Regeln des Spiels eine
Stufe höher — alle gleichmäßig, die Rangfolge untereinander bleibt.

**Wer hier eine Regel ergänzt, setzt `.tr-app ` davor.** Sonst greift sie
in der ausgelieferten Seite nicht.

Dass trotzdem nichts nach außen wirkt, ist gemessen: dieselbe Seite mit
und ohne `taxi-rush.css`, 208 Elemente außerhalb des Spiels, null
Abweichungen.

### `scroll-padding-top` der Seite beachten

`style.css:4230` setzt am `html`-Element `scroll-padding-top: 84px`. **Der
Browser addiert das zum `scroll-margin-top` eines Abschnitts.** Wer hier
Werte ändert, rechnet mit 84 px mehr als er schreibt. Die 77 px
(Schreibtisch) bzw. 16 px (Handy) an `.tr-app` sind entsprechend gewählt.

### `spiele.css` ist um die alte Fassung erleichtert

126 Regeln entfernt, 53.895 → 33.924 Zeichen. Darunter der Fokusmodus
`taxi-rush-focus-active`, den kein Skript mehr einschaltet. Belegt durch
einen Vollvergleich aller errechneten Eigenschaften über 302 Elemente bei
zwei Bildschirmbreiten: null Abweichungen.

### Neuer Prüflauf

```
npm run rush-pruefen      → 178 Prüfpunkte
```

Er startet einen eigenen Server auf Port 5287, der **sowohl** aus
`dist-oeffentlich/` **als auch** aus dem Projekt liefert — Letzteres nur,
damit die Vorlage zum Vergleich geöffnet werden kann. Deshalb prüft er die
Nicht-Auslieferung an der Übernahmeliste und nicht an einem HTTP-Status:
Ein 200 wäre dort die eigene Brücke, kein Befund.

### Voraussetzung unverändert

Die Korrekturen aus `feature/011` (Abschnitt 2) bleiben Voraussetzung
jeder Veröffentlichung.

---

## 16. Die Kontoübersichten (Schritt 021)

**Die ausführliche Fassung steht in `ABSCHLUSS-OEFFENTLICHE-WEBSEITE.md`,
Abschnitt 14.** Hier nur, was Bau und Übernahme betrifft.

### Sechs weitere Seiten aus Astro — und damit fast alle

`meinkonto.html`, `kunden-einstellungen.html`, `meine-fahrten.html`,
`wallet-gutscheine.html`, `live-fahrt.html` und die Weiterleitung
`kundenkonto.html`, unter denselben Adressen.

> **Aus Bestandsmaterial stammt jetzt genau EINE Seite: `spiele.html`.**
> 19 von 20 kommen aus Astro.

### Aus der Übernahmeliste genommen

Die sechs HTML-Dateien **und fünf Stilvorlagen**:

| Datei | wurde geladen von |
|---|---|
| `auth-demo.css` | den Kontoseiten und den Anmeldeseiten — nach Schritt 020 und 021 von keiner ausgelieferten Seite mehr |
| `kunden-einstellungen.css` | nur `kunden-einstellungen.html` |
| `live-ride.css` | nur `live-fahrt.html` |
| `meinefahrten.css` | nur `meine-fahrten.html` |
| `wallet-gutscheine.css` | nur `wallet-gutscheine.html` |

Nachgesehen, nicht vermutet. Der neue Prüflauf liest alle ausgelieferten
Seiten durch und stellt fest, dass keine mehr darauf verweist.

**Noch in der Liste, obwohl kaum noch gebraucht:** `script.js`,
`home-luxury.css/js`, `public-premium-v2.css/js`, `public-states.css`.
Sie gehören zu Seiten, die bereits aus Astro kommen. Sie wurden hier
**nicht** angefasst — das ist eine eigene Aufräumrunde und gehört nicht in
einen Schritt, der Kontoseiten umbaut.

### `AUS_ASTRO` wächst auf neunzehn

`kopfangaben-bestand.mjs` bearbeitet dadurch nur noch **1** Bestandsseite
statt 7.

### Eine umgedrehte Zusicherung

In `tools/pruefe-grundlagen.mjs` stand seit Schritt 017:

```js
pruefe(existsSync(join(AUSGABE, 'auth-demo.css')),
  'auth-demo.css ist weiterhin dabei - trotz des Namens eine echte Stilvorlage …');
```

Das war richtig, solange elf Kontoseiten sie brauchten. Jetzt gilt das
Gegenteil, und die Zusicherung wurde umgedreht — samt Gegenprobe, dass
keine ausgelieferte Datei sie noch anfordert. **Wer eine Prüfung umdreht,
schreibt dazu, warum.** Die Begründung steht im Quelltext daneben.

### Neues Bauteil `Kontoseite.astro`

Der gemeinsame Rahmen: Seitenkopf, Überschrift, Sperre, Ladevorhang,
Speicherhinweis, Abmeldelogik, Fußzeile. Die fünf geschützten Seiten
füllen nur noch ihren Inhalt und warten auf

```js
const { gesperrt, auth } = await window.tgKontoBereit;
```

**Wer eine weitere Kontoseite baut, nimmt dieses Bauteil.** Eine sechste
eigene Schutzprüfung wäre die Art von Doppelung, bei der eine Fassung
irgendwann anders entscheidet als die andere.

Die Klassennamen `auth-gate`, `auth-gate-card`, `auth-btn` und
`auth-gated-content` kommen aus `requireLogin()` in `customer-auth.js` und
sind dort fest verdrahtet. Sie werden in `Kontoseite.astro` **gestaltet,
nicht umbenannt** — umbenennen hieße, die Anmeldelogik anzufassen.

### Änderung an `customer-auth.js`

Die zweite überhaupt (die erste war in Schritt 017 der Wechsel vom fremden
CDN auf die mitgelieferte Bibliothek). Jeder `localStorage`-Zugriff läuft
jetzt über `speicherLesen` / `speicherSchreiben` / `speicherLoeschen`.
Diese drei werfen nie.

**Wer hier etwas ergänzt, fasst `localStorage` nicht direkt an.** Der
Prüflauf zählt nach: genau drei Stellen, jede in einem `try`-Block.

Neu nach außen: `speicherGesperrt()`.

### Neuer Prüflauf

```
npm run kontoseiten-pruefen      → 181 Prüfpunkte
```

Port 5288. Er schneidet **den gesamten Netzverkehr nach außen ab** und
ersetzt `window.CustomerAuth` durch eine Attrappe. Damit kann er die
produktive Instanz weder lesen noch verändern, unabhängig davon, was in
`admin/supabase-config.js` steht.

Wo die Attrappe gilt, wird das echte `customer-auth.js` durch eine leere
Antwort ersetzt — sonst lädt es vom Prüfserver und überschreibt die
Attrappe am Ende seiner Datei. Das echte `customer-auth.js` läuft dafür in
Abschnitt 7 des Prüflaufs, mit werfendem Speicher.

### Voraussetzung unverändert

Die Korrekturen aus `feature/011` (Abschnitt 2) bleiben Voraussetzung
jeder Veröffentlichung.

---

## 17. Nächster Schritt

> **Die vollständige Bestandsaufnahme der öffentlichen Webseite steht in
> `ABSCHLUSS-OEFFENTLICHE-WEBSEITE.md`** — was fertig ist, was fehlt, was
> ohne Rückfrage machbar ist, und was eine Entscheidung braucht.

**Die Schritte 017 bis 021 sind erledigt** — Abschnitt 11 bis 16 hier,
Abschnitt 8 bis 14 der Bestandsaufnahme. Einmalig vorgezogen und ebenfalls
erledigt: Schritt 022 (Glücksrad) und Schritt 023 (Taxi Rush).

Die verbindliche Reihenfolge bleibt: öffentliche Webseite,
Mitarbeiterportal, Zentrale, danach Rewards, Yumak und Spiele.

### Die Übernahme ist damit abgeschlossen

**19 von 20 öffentlichen Seiten kommen aus Astro.** Aus dem Bestand stammt
nur noch `spiele.html` — und die gehört zu Punkt 4 der Reihenfolge, nicht
zur öffentlichen Webseite im engeren Sinn.

Was jetzt noch fehlt, ist **keine Übernahme mehr**, sondern:

1. **Die Korrekturen aus `feature/011`** (Abschnitt 2). Voraussetzung
   jeder Veröffentlichung, unverändert offen.
2. **Die echte Anmeldung prüfen.** Anleitung in
   `ANLEITUNG-ANMELDETEST.md`. Alle bisherigen Kontoprüfungen liefen mit
   Attrappen; die produktive Instanz wurde nie angefragt.
3. **Die Rechte klären** — ob ein angemeldeter Kunde
   `get_my_rewards_overview`, `rewards_vouchers` und `spin_rewards_wheel`
   überhaupt ausführen darf. Das steht in den Grants und Policies der
   produktiven Instanz, nicht in einer lokalen Datei.
4. **Die Entscheidungen E1 bis E8 und die Fragen I1 bis I6** aus der
   Bestandsaufnahme. Darunter E1: Kunden haben auf `rides` keine Rechte,
   weshalb „Meine Fahrten" und „Fahrtstatus" ohne Daten bleiben.
5. **Eine abschließende Qualitätsrunde.** Vorgemerkt sind dafür:
   - der Yumak-Startfehler (Abschnitt 10); solange er offen ist, bleibt
     `STANDBILD_NUR = true`;
   - Taxi Rush im Querformat eines Handys (844 × 390): Das Spiel passt
     samt Bedienleiste nicht vollständig ins Bild (Abschnitt 13.9 der
     Bestandsaufnahme, Punkt 3);
   - eine Aufräumrunde für `script.js`, `home-luxury.*`,
     `public-premium-v2.*` und `public-states.css` — sie stehen noch in
     der Übernahmeliste, gehören aber zu Seiten, die längst aus Astro
     kommen;
   - fünf aufbereitete Yumak-Clips, weder farbkorrigiert noch verwendet.

**Kein Push, Merge oder Deployment** ohne ausdrückliche Freigabe.
