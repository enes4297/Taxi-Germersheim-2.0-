# Mitgelieferte Fremdbibliotheken

Interne Notiz. Wird **nicht** ausgeliefert — `tools/ausgabe-pruefen.mjs`
stellt sicher, dass keine `.md`-Datei im Ausgabeordner landet.

## `supabase-js-2.117.0.js`

| | |
|---|---|
| Paket | `@supabase/supabase-js` |
| Version | **2.117.0**, fest genagelt (`--save-exact` in `package.json`) |
| Datei | `node_modules/@supabase/supabase-js/dist/umd/supabase.js` |
| SHA-256 | `7b9e9c64109e15c338fa58c2bc77c32fb1c459bd587e22fc6b72cca80a388645` |
| Größe | 217 874 Byte |
| Aufgenommen | 23.09.2026, Schritt 017 |

**Warum diese Datei und keine andere:** In der `package.json` des Pakets steht
`"jsdelivr": "dist/umd/supabase.js"`. Genau diese Datei hat der CDN unter
`https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2` ausgeliefert. Es ist
derselbe Build, nur fest auf eine Version genagelt und selbst mitgeliefert —
keine andere Bibliothek und kein anderer Bauweg.

**Warum überhaupt:** Bis Schritt 017 holte `customer-auth.js` die Bibliothek
zur Laufzeit von jsdelivr, und zwar unter `@2`, also jeweils die neueste 2.x.
Gemessen am 23.09.2026: Bei gesperrtem CDN meldeten **19 von 20 öffentlichen
Seiten Skriptfehler**, `passwort-zuruecksetzen.html` brach mit
`PASSWORD_RECOVERY_UNAVAILABLE` ab. Dazu kam, dass die IP-Adresse jedes
Besuchers an einen Dritten ging.

**Erneuern:** `npm run fremdbibliothek-erneuern` kopiert die Datei aus
`node_modules/` hierher und nennt die neue Prüfsumme. Die Version wird in
`package.json` geändert, nicht hier.

**Prüfen:** `npm run fremdbibliothek-pruefen` vergleicht Byte für Byte gegen
`node_modules/` und schlägt an, wenn beides auseinanderläuft.

## Noch nicht umgestellt

`admin/supabase-auth.js`, `admin/taxi-data-service.js` und
`fahrer/employee-supabase.js` laden weiterhin vom CDN. Das ist Absicht:
Schritt 017 betrifft ausschließlich die öffentliche Webseite. Die
Zentrale und das Mitarbeiterportal sind Punkt 2 und 3 der Reihenfolge.
