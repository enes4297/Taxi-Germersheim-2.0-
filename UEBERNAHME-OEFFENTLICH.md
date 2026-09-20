# Übernahme der öffentlichen Webseite in die Astro-Struktur

Interne Arbeitsunterlage. Sie wird **nicht** mit ausgeliefert — der Prüflauf
`npm run ausgabe-pruefen` stellt sicher, dass keine `.md`-Datei im
Ausgabeordner landet.

Stand: 20.09.2026, nach Schritt 014 (Startseite).

---

## 1. Branch-Abhängigkeit — bitte beachten

```
dev
 └── feature/012-astro-geruest        (37da686)  Gerüst
      └── feature/013-design-grundlage (c740135)  Design-Grundlage
           └── feature/014-startseite             Startseite
```

**Jeder Schritt zweigt vom vorigen ab, nicht von `dev`.** Das ist Absicht: 013
setzt auf Gerüst, Übernahme-Liste und Prüfwerkzeugen aus 012 auf, 014 auf der
Design-Grundlage aus 013. Ein Abzweig von `dev` hätte jeweils nichts davon.

**Folge für die Reihenfolge:** Die Kette muss in dieser Reihenfolge nach `dev` —
012, dann 013, dann 014. Wird eine übersprungen, kommt ihr Inhalt später doppelt
oder gar nicht mit.

Merge nach `dev` macht der Mensch — nicht der Assistent.

---

## 2. Offene Korrekturen aus `feature/011` — vor jeder Veröffentlichung

`feature/011-einspielung-bestandsdatenbank` trägt **fünf Commits, die noch
nicht in `dev` sind**. Rein lesend geprüft am 19.09.2026. Drei davon betreffen
nur `supabase/` und Dokumentation und sind für die Auslieferung ohne Belang.
**Zwei betreffen Dateien, die im Ausgabeordner landen** — sie enthalten bereits
behobene Portalfehler.

| Commit | Datei | Was behoben wurde | Heutiger Stand auf 012/013/014 |
|---|---|---|---|
| `316de73` | `fahrer/mitarbeiter.js` | Das Anhang-Abzeichen einer Krankmeldung zeigte **immer** „Ohne Anhang", unabhängig vom Datenbankwert. Jetzt wird `document_submission_id` ausgewertet. | Zeile 528 trägt noch das feste „Ohne Anhang" — **Fehler vorhanden** |
| `8ff510a` | `admin/dokumenteingang-supabase.js` | Die Rolle wurde aus der Menübeschriftung abgeleitet statt aus `profiles` der laufenden Sitzung gelesen; dazu eine ehrliche Meldung bei fehlender Anmeldung oder fehlender Admin-Rolle. | `auth_user_id` kommt in der Datei **nicht vor** — Fehler vorhanden |
| `8ff510a` | `admin/dokumentfristen.html` | Verwaistes schließendes `</div>` entfernt. | Fehler vorhanden |
| `8ff510a` | `admin/sidebar.js` | Fehlender Navigationseintrag „Dokumentfristen" ergänzt. | `dokumentfristen` kommt in der Datei **nicht vor** — Fehler vorhanden |

Gemessen, nicht vermutet: Die drei Suchen nach `Ohne Anhang`, `auth_user_id`
und `dokumentfristen` wurden auf dem aktuellen Branch ausgeführt.

**Daraus folgt:** Würde heute aus `feature/014` heraus veröffentlicht, käme der
alte, fehlerhafte Stand dieser vier Dateien mit — das Übernahme-Werkzeug
kopiert `admin/` und `fahrer/` byteweise so, wie sie im Branch liegen. Die
Korrekturen wären wieder weg.

**Bedingung vor der ersten Veröffentlichung — bitte genau lesen:**

Die Korrekturen aus `feature/011` müssen im **tatsächlichen
Veröffentlichungsstand** enthalten sein, also in genau dem Commit, aus dem
gebaut und hochgeladen wird.

> **Ein Merge nach `dev` allein aktualisiert `feature/014` nicht.**

Die Kette 012 → 013 → 014 hängt an `dev` in seinem Stand vom 19.09.2026.
Landet `feature/011` danach in `dev`, ändert das an `feature/014` nichts —
die vier Dateien bleiben dort im alten Stand, bis `feature/014` den neuen
`dev`-Stand selbst übernimmt. Wer aus `feature/014` baut, baut die Fehler mit
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
npm run browser-pruefen     # Zentrale, Portal und Dashboard im Ausgabeordner
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

## 10. Nächster Schritt

**Schritt 015 — Unterseiten.** Branch `feature/015-unterseiten` von
`feature/014-startseite`.

Zur Auswahl, in dieser Reihenfolge sinnvoll:

1. **Rechtliches und Hilfe** — `impressum.html`, `datenschutz.html`,
   `hilfe-kontakt.html`, `404.html` im neuen Design. Kleinster Umfang, kein
   Backend berührt.
2. **Flotte und Spezialfahrten** — `flotte.html` und `spezialfahrten.html`.
   Beide Inhalte stehen bereits auf der neuen Startseite; zu klären ist, ob die
   Seiten bleiben oder auf die Abschnitte weiterleiten.
3. **Demoseiten der Spielewelt** — Glücksrad-Demo und Yumaks-Box-Demo aus der
   Vorschau. Erst danach dürfen die Rewards-Kacheln wieder „Als Demo
   ausprobieren" heißen.
4. **Anmeldung und Konto** — `anmelden.html`, `registrieren.html`, die
   Kontoseiten. Höchstes Risiko: Hier hängt die echte Anmeldung dran.
   `customer-auth.js` wird dabei nicht umgeschrieben, nur eingebunden.
