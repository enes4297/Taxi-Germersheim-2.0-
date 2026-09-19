# Übernahme der öffentlichen Webseite in die Astro-Struktur

Interne Arbeitsunterlage. Sie wird **nicht** mit ausgeliefert — der Prüflauf
`npm run ausgabe-pruefen` stellt sicher, dass keine `.md`-Datei im
Ausgabeordner landet.

Stand: 19.09.2026, Schritt 012 (Gerüst) abgeschlossen.

---

## 1. Wie gebaut wird

```
npm install              # einmalig
npm run build            # erzeugt dist-oeffentlich/
npm run ausgabe-pruefen  # prüft den Ausgabeordner (Dateien, Prüfsummen)
npm run browser-pruefen  # ruft den Ausgabeordner im Browser auf
npm run dev              # örtlicher Entwicklungsserver
```

`browser-pruefen` nutzt das Playwright aus `fahrer/tests/` und das installierte
Chrome — es wird nichts zusätzlich in die Wurzel aufgenommen. Die Aufnahmen
landen in `.belege-astro/`, außerhalb des Ausgabeordners und in `.gitignore`.

Der Build tut zwei Dinge nacheinander:

1. **Bauen.** Alles unter `src/pages/` wird zu HTML. Wegen
   `build.format: 'file'` entsteht `probe.html`, nicht `probe/index.html` —
   so bleiben die gewachsenen Adressen wie `impressum.html` erhalten.
2. **Übernehmen.** `tools/bestand-uebernehmen.mjs` kopiert danach die
   Bestandsbereiche unverändert in denselben Ordner.

Der Ausgabeordner ist damit ein vollständiger Auslieferstand: gebaute
öffentliche Seiten und unveränderter Bestand nebeneinander, in genau der
Ordnerstruktur, die heute schon gilt.

Telemetrie ist abgeschaltet (`astro telemetry disable`).

---

## 2. Wie die Bestandsbereiche übernommen werden

Maßgeblich ist die Liste `UEBERNAHME` in `tools/bestand-uebernehmen.mjs`.
Was dort nicht steht, wird nicht ausgeliefert.

| Eintrag | Zweck | Dateien | Ausgenommen |
|---|---|---|---|
| `admin/` | Zentrale | 164 | — |
| `fahrer/` | Mitarbeiterportal | 8 | `tests/`, die drei `TESTPROTOKOLL-*.md` |
| `dashboard/` | Weiterleitung auf die Zentrale | 1 | — |
| `assets/` | Symbole, Marke, Ortsdaten | 18 | `yumak-notes.txt` |
| `logo.png` | Logo | 1 | — |

**Warum `assets/` und `logo.png` mitmüssen, obwohl sie keine Portalseiten
sind:** Die relativen Pfade des Bestands greifen über die Ordnergrenze hinaus.
`admin/` lädt `../assets/icons/*.svg` und `../logo.png`; `fahrer/` lädt
`../admin/supabase-config.js`, `../admin/personal-shared.js`,
`../admin/qualitaet-shared.js`, `../admin/ui-text.js`,
`../admin/ui-visible-terms.js` und `../logo.png`. Fehlte einer dieser Pfade,
bräche das Portal, ohne dass an ihm selbst etwas geändert worden wäre.

Zusätzlich greift in jedem Eintrag eine feste Sperre gegen `node_modules/`,
`test-results/`, `.gitkeep`, `.gitignore` und `.DS_Store`.

### Was ausdrücklich draußen bleibt

`supabase/` (Migrationen, Setup-Skripte, lokale Tests), sämtliche `*.md`,
`screenshots/`, `fahrer/tests/`, `tools/`, `src/`, `.claude/`,
`fix_admin_auth.py` sowie die unreferenzierten Bildvorlagen
`logo-original-full.png` und `tg-icon-original.png`.

### Wenn später ein Bereich dazukommt

Einen Eintrag in `UEBERNAHME` ergänzen, mehr nicht. Die Prüfung vergleicht
danach automatisch alle Dateien des neuen Eintrags byteweise gegen den Bestand.

---

## 3. Was die bisherige Veröffentlichung anpassen muss

Heute wird das Repository so ausgeliefert, wie es liegt: die Wurzel **ist** der
veröffentlichte Ordner. Nach dem Umbau gilt das nicht mehr.

**Die eine notwendige Änderung:** Veröffentlicht wird künftig
`dist-oeffentlich/`, nicht die Repository-Wurzel.

Daran hängen drei Punkte:

1. **Der Ausgabeordner muss vor der Veröffentlichung erzeugt werden.** Er ist
   in `.gitignore` und liegt bewusst nicht im Repository. Wer heute den
   Ordnerinhalt hochlädt, muss künftig vorher `npm install && npm run build`
   ausführen — von Hand oder über einen Automatismus.
2. **Nebeneffekt, der ausdrücklich erwünscht ist:** Interne Dateien, die heute
   mit im veröffentlichten Ordner liegen — `supabase/` mit 11 Migrationen,
   alle Testprotokolle und Einspielpläne, `screenshots/`, `fix_admin_auth.py` —
   sind danach nicht mehr Teil der Auslieferung. Das ist eine Verbesserung
   gegenüber heute, keine Nebenwirkung des Umbaus.
3. **Falls die Seite unter einem Unterpfad läuft** (etwa
   `…/Taxi-Germersheim-2.0-/` statt unter einer eigenen Domain), muss in
   `astro.config.mjs` zusätzlich `base` gesetzt werden. **Ungeprüft:** Im
   Repository liegt keine Deploy-Konfiguration — keine Workflow-Datei, keine
   `CNAME`, kein `.nojekyll`. Wie und wohin heute veröffentlicht wird, geht aus
   dem Projekt nicht hervor und muss vor dem ersten echten Seitenschritt
   geklärt werden.

Nicht betroffen: die Adressen selbst. `index.html`, `admin/…`, `fahrer/…`,
`dashboard/…` und die 21 Wurzelseiten behalten ihre Pfade.

---

## 4. Prüfstand nach Schritt 012

**Ausgabeordner** — `npm run ausgabe-pruefen`, 23 Prüfungen bestanden,
194 Dateien. Darin: Probeseite als `probe.html`, kein Ordner `probe/`, alle
192 übernommenen Dateien byteweise gleich mit dem Bestand, und keine SQL-,
Dokumentations-, Test- oder Quelldatei im Ausgabeordner.

**Browser** — `npm run browser-pruefen` gegen einen örtlichen Server auf dem
Ausgabeordner, 15 Prüfungen bestanden:

- Probeseite wird ausgeliefert und zeigt ihren Inhalt.
- Zentrale: Anmeldefeld `admin-password` sichtbar, `../logo.png` geladen, keine
  Skriptfehler.
- Mitarbeiterportal: Anmeldefeld `password` sichtbar, `../logo.png` geladen,
  keine Skriptfehler.
- Dashboard leitet auf `/admin/login.html?auth_reason=no_user` weiter.

Die einzige 404-Meldung im Protokoll ist `/favicon.ico` — eine Anfrage, die der
Browser von sich aus stellt. Das Projekt hat kein Favicon, auch heute nicht.

**Was damit NICHT geprüft ist:** Es wurde sich nirgends angemeldet. Ob
Anmeldung, Dokumenteingang oder Krankmeldungen gegen die produktive Instanz
weiterhin funktionieren, sagt dieser Lauf nicht — er zeigt, dass die Seiten
unverändert ausgeliefert werden und fehlerfrei starten.

---

## 5. Nächster Schritt

Schritt 013: Design-Grundlage aus der freigegebenen Vorschau
(`C:\Users\enesc\Desktop\taxi-figma-vorschau`, Commit `113a73e`) als
Astro-Komponenten. Noch keine Bestandsseite ersetzen.

Die Vorschau bleibt unverändert als Designreferenz bestehen.
