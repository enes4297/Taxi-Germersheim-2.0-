# Taxi-Germersheim-2.0-

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