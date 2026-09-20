# Übernahme der öffentlichen Webseite in die Astro-Struktur

Interne Arbeitsunterlage. Sie wird **nicht** mit ausgeliefert — der Prüflauf
`npm run ausgabe-pruefen` stellt sicher, dass keine `.md`-Datei im
Ausgabeordner landet.

Stand: 19.09.2026, nach Schritt 013 (Design-Grundlage).

---

## 1. Branch-Abhängigkeit — bitte beachten

```
dev
 └── feature/012-astro-geruest      (37da686)  Gerüst
      └── feature/013-design-grundlage         Design-Grundlage
```

**`feature/013-design-grundlage` zweigt nicht von `dev` ab, sondern von
`feature/012-astro-geruest`.** Das ist Absicht: 013 setzt auf dem Build-Gerüst,
der Übernahme-Liste und den Prüfwerkzeugen aus 012 auf. Ein Abzweig von `dev`
hätte nichts davon.

**Folge für die Reihenfolge:** 012 muss vor 013 nach `dev` gelangen. Geht 013
zuerst, kommt das Gerüst zweimal mit. Jeder weitere Schritt (014 Startseite und
folgende) zweigt vom jeweils letzten gesicherten Schritt ab, solange die Kette
nicht in `dev` aufgelöst ist.

Merge nach `dev` macht der Mensch — nicht der Assistent.

---

## 2. Offene Korrekturen aus `feature/011` — vor jeder Veröffentlichung

`feature/011-einspielung-bestandsdatenbank` trägt **fünf Commits, die noch
nicht in `dev` sind**. Rein lesend geprüft am 19.09.2026. Drei davon betreffen
nur `supabase/` und Dokumentation und sind für die Auslieferung ohne Belang.
**Zwei betreffen Dateien, die im Ausgabeordner landen** — sie enthalten bereits
behobene Portalfehler.

| Commit | Datei | Was behoben wurde | Heutiger Stand auf 012/013 |
|---|---|---|---|
| `316de73` | `fahrer/mitarbeiter.js` | Das Anhang-Abzeichen einer Krankmeldung zeigte **immer** „Ohne Anhang", unabhängig vom Datenbankwert. Jetzt wird `document_submission_id` ausgewertet. | Zeile 528 trägt noch das feste „Ohne Anhang" — **Fehler vorhanden** |
| `8ff510a` | `admin/dokumenteingang-supabase.js` | Die Rolle wurde aus der Menübeschriftung abgeleitet statt aus `profiles` der laufenden Sitzung gelesen; dazu eine ehrliche Meldung bei fehlender Anmeldung oder fehlender Admin-Rolle. | `auth_user_id` kommt in der Datei **nicht vor** — Fehler vorhanden |
| `8ff510a` | `admin/dokumentfristen.html` | Verwaistes schließendes `</div>` entfernt. | Fehler vorhanden |
| `8ff510a` | `admin/sidebar.js` | Fehlender Navigationseintrag „Dokumentfristen" ergänzt. | `dokumentfristen` kommt in der Datei **nicht vor** — Fehler vorhanden |

Gemessen, nicht vermutet: Die drei Suchen nach `Ohne Anhang`, `auth_user_id`
und `dokumentfristen` wurden auf dem aktuellen Branch ausgeführt.

**Daraus folgt:** Würde heute aus `feature/013` heraus veröffentlicht, käme der
alte, fehlerhafte Stand dieser vier Dateien mit — das Übernahme-Werkzeug
kopiert `admin/` und `fahrer/` byteweise so, wie sie im Branch liegen. Die
Korrekturen wären wieder weg.

**Bedingung vor der ersten Veröffentlichung — bitte genau lesen:**

Die Korrekturen aus `feature/011` müssen im **tatsächlichen
Veröffentlichungsstand** enthalten sein, also in genau dem Commit, aus dem
gebaut und hochgeladen wird.

> **Ein Merge nach `dev` allein aktualisiert `feature/013` nicht.**

`feature/013` zweigt von `feature/012` ab, und das von `dev` in seinem Stand
vom 19.09.2026. Landet `feature/011` danach in `dev`, ändert das an
`feature/013` nichts — die vier Dateien bleiben dort im alten Stand, bis
`feature/013` den neuen `dev`-Stand selbst übernimmt. Wer aus `feature/013`
baut, baut die Fehler mit ein, auch wenn `dev` längst korrigiert ist.

Vor der Veröffentlichung ist also zu prüfen, ob der Veröffentlichungsstand die
Korrekturen wirklich enthält. Die drei Suchen aus der Tabelle oben genügen
dafür: `Ohne Anhang` in `fahrer/mitarbeiter.js`, `auth_user_id` in
`admin/dokumenteingang-supabase.js`, `dokumentfristen` in `admin/sidebar.js`.

Ein rechnerischer Probe-Merge (`git merge-tree`, ohne etwas zu verändern) zeigt
**keine Konflikte** mit 012/013 — die Änderungen liegen in anderen Dateien
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
npm run ausgabe-pruefen  # prüft den Ausgabeordner (Dateien, Prüfsummen)
npm run probe-pruefen    # Probeseite im Browser, Desktop und Mobil
npm run browser-pruefen  # Zentrale, Portal und Dashboard im Ausgabeordner
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
   `build.format: 'file'` entsteht `probe.html`, nicht `probe/index.html` —
   so bleiben die gewachsenen Adressen wie `impressum.html` erhalten.
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
| `logo.png` | Logo | 1 | — |
| `yumak-avatar.png` | Yumak-Abbildung | 1 | — |

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

## 7. Was die bisherige Veröffentlichung anpassen muss

Heute wird das Repository so ausgeliefert, wie es liegt: die Wurzel **ist** der
veröffentlichte Ordner. Nach dem Umbau gilt das nicht mehr.

**Die eine notwendige Änderung:** Veröffentlicht wird künftig
`dist-oeffentlich/`, nicht die Repository-Wurzel. Er ist in `.gitignore` und
muss vorher mit `npm ci && npm run build` erzeugt werden.

**Erwünschter Nebeneffekt:** Interne Dateien, die heute mit im veröffentlichten
Ordner liegen — `supabase/` mit 11 Migrationen, alle Testprotokolle und
Einspielpläne, `screenshots/`, `fix_admin_auth.py` — sind danach nicht mehr
Teil der Auslieferung.

### Offene Voraussetzung — weiterhin ungeklärt

> **Wie wird die bestehende Webseite veröffentlicht, und läuft sie an der
> Domainwurzel oder unter einem Unterpfad?**

Im Repository liegt **keine** Deploy-Konfiguration: keine Workflow-Datei unter
`.github/`, keine `CNAME`, keine `.nojekyll`, kein Hoster-Manifest. Aus dem
Projekt geht nicht hervor, wie und wohin veröffentlicht wird.

Das entscheidet zwei Dinge:

- **Läuft die Seite unter einem Unterpfad** (etwa
  `…/Taxi-Germersheim-2.0-/`), muss in `astro.config.mjs` `base` gesetzt
  werden. Alle absoluten Pfade der neuen Seiten (`/assets/hero/…`,
  `/schriften/…`) beziehen sich sonst auf die falsche Wurzel. Die
  Bestandsseiten arbeiten mit relativen Pfaden und wären nicht betroffen — die
  neuen schon.
- **Wer den Build ausführt.** Von Hand vor dem Hochladen, oder automatisch.

**Diese Frage muss vor Schritt 014 beantwortet sein**, denn dort wird
`index.html` ersetzt — die Einstiegsseite.

---

## 8. Prüfstand nach Schritt 013

Alle Läufe am 19.09.2026, gegen den frisch erzeugten Ausgabeordner.

**`npm run ausgabe-pruefen`** — 35 Prüfungen bestanden, 235 Dateien.
Darunter: alle 193 Bestandsdateien byteweise gleich; alle 22 Medien byteweise
gleich mit der Vorschau; 18 Schriftdateien vorhanden; kein Aufruf an Google
Fonts in der ausgelieferten Seite; keine SQL-, Dokumentations-, Test-,
Vergleichs- oder Quelldatei im Ausgabeordner.

**`npm run probe-pruefen`** — 37 Prüfungen bestanden, Desktop (1440 × 900),
Mobil (390 × 844) und reduzierte Bewegung:

- Outfit und Lora sind tatsächlich geladen (`document.fonts.check`), nicht
  still auf die Systemschrift zurückgefallen.
- Beide Bühnen stehen im Markup, aber **nur eine hängt einen Film ein**.
- Der Film läuft von selbst an; Pause hält ihn an; am Ende steht das
  Schlussbild mit Deckung 1, der Film mit Deckung 0 — kein zweites Logo.
- Desktop: das Logo rückt (`matrix(0.5568, 0, 0, 0.5568, 451, -93)`).
  Mobil: es bleibt mittig (`none`).
- „Erneut ansehen" startet den Film wieder.
- Reduzierte Bewegung: `preload="none"`, nichts läuft von selbst, „Abspielen"
  wird angeboten, alle Blöcke sind sofort sichtbar.
- Nach dem Durchscrollen ist kein Block unsichtbar geblieben.
- Keine fehlenden Dateien, keine Skriptfehler.

**`npm run browser-pruefen`** — 15 Prüfungen bestanden: Zentrale und
Mitarbeiterportal zeigen ihr Anmeldefeld und laden `../logo.png`, das Dashboard
leitet auf `/admin/login.html?auth_reason=no_user` weiter.

Aufnahmen liegen in `.belege-astro/` (in `.gitignore`, nicht in der Ausgabe).

**Was damit NICHT geprüft ist:** Es wurde sich nirgends angemeldet. Ob
Anmeldung, Dokumenteingang und Krankmeldungen gegen die produktive Instanz
funktionieren, sagen diese Läufe nicht.

---

## 9. Nächster Schritt

**Schritt 014 — Startseite.** Branch `feature/014-startseite` von
`feature/013-design-grundlage`.

`index.html` als Astro-Seite: Kopfbereich, Hero mit beiden Adressfeldern und
Schnellwahl, die sieben Leistungen mit dem Transportschein-Kasten, Flotte,
Region, Rewards-Teaser, Kontakt, Fußzeile. Die Abfragen `?page=booking`,
`?page=rewards` und `?page=help-public` müssen weiter am richtigen Abschnitt
landen.

Vorher zu klären: die Veröffentlichungsfrage aus Abschnitt 7 und die
Behandlung der Fahrtanfrage — eine Annahmestelle im Backend gibt es nicht, der
Weg endet wie heute bei WhatsApp und Telefon.
