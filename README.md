# Taxi-Germersheim-2.0-

## Öffentliche Webseite bauen

Seit Schritt 012 wird der öffentliche Bereich mit Astro gebaut. Zentrale,
Mitarbeiterportal und Dashboard bleiben unverändert und werden nach dem Build
Datei für Datei übernommen.

```
npm ci                   # Abhaengigkeiten, exakt nach package-lock.json
npm run build            # erzeugt dist-oeffentlich/
npm run ausgabe-pruefen  # prüft den Ausgabeordner
npm run probe-pruefen    # Probeseite im Browser, Desktop und Mobil
npm run browser-pruefen  # Zentrale, Portal und Dashboard im Ausgabeordner
npm run dev              # örtlicher Entwicklungsserver
npm run preview          # den fertigen Ausgabeordner ansehen
```

`npm ci` statt `npm install`: Es installiert exakt die Versionen aus
`package-lock.json` und bricht ab, wenn Lockdatei und `package.json`
auseinanderlaufen. So bauen zwei Rechner dasselbe. `npm install` bleibt dem
Fall vorbehalten, dass absichtlich eine Abhängigkeit hinzukommt.

Veröffentlicht wird künftig `dist-oeffentlich/`, nicht die Repository-Wurzel.
Einzelheiten, die Liste der übernommenen Bereiche, die Branch-Abhängigkeit und
der offene Punkt zur Veröffentlichung: `UEBERNAHME-OEFFENTLICH.md`.


## Fahrzeugflotte pflegen

- Seite: flotte.html
- Kartenbereich: section mit Klasse fleet-grid
- Neues Fahrzeug hinzufügen: eine komplette article.fleet-card kopieren und Inhalte anpassen
- Bild austauschen: src im jeweiligen img der Karte ersetzen
- Styles: dedizierter Block Fahrzeugflotte Seite in style.css

## Kundenkonto pflegen

- Hauptseite: meinkonto.html
- Legacy-Alias: kundenkonto.html leitet ohne eigene Kontodaten auf meinkonto.html weiter
- Unterseiten: meine-fahrten.html, live-fahrt.html, wallet-gutscheine.html und kunden-einstellungen.html
- Profil- und Sessiondaten: customer-auth.js
- Rewards-Übersicht: Supabase-RPC get_my_rewards_overview
- Styles: gemeinsame Kundensektionen in public-system.css

## Rewards pflegen

- Seite: rewards.html
- Datenquelle: Supabase-RPC get_my_rewards_overview
- Rendering und Formatierung: rewards-customer.js
- Ohne erfolgreiche Session oder RPC bleiben Kontowerte leer beziehungsweise werden als Gedankenstrich dargestellt
- Styles: Rewards-Bereich in public-system.css

## Abzeichen-System pflegen

- Hauptbereich: rewards.html, Karte rewards-badges
- Kategorien: Fahrten, Treue, Krankenfahrten, Flughafen, Geheim, Saison
- Statuslogik im Design: is-unlocked und is-locked
- Geheime Abzeichen: is-secret ohne Fortschrittsanzeige
- Das aktuelle backendgebundene Kundenkonto zeigt keine lokalen Demo-Abzeichen.