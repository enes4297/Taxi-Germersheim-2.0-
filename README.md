# Taxi-Germersheim-2.0-

## Fahrzeugflotte pflegen

- Seite: flotte.html
- Kartenbereich: section mit Klasse fleet-grid
- Neues Fahrzeug hinzufügen: eine komplette article.fleet-card kopieren und Inhalte anpassen
- Bild austauschen: src im jeweiligen img der Karte ersetzen
- Styles: dedizierter Block Fahrzeugflotte Seite in style.css

## Kundenkonto pflegen

- Seite: kundenkonto.html
- Dashboard-Bereich: section mit id account und Klasse account-page
- Kartenstruktur: article.account-card mit data-account-card
- Datenfelder: über data-account-field für spätere API/Backend-Anbindung vorbereitet
- Profilbild austauschen: src der account-avatar in kundenkonto.html ersetzen
- Styles: dedizierter Block Kundenkonto Seite in style.css

## Rewards pflegen

- Seite: rewards.html
- Level-System: rewards-level-grid in rewards.html
- Abzeichen / Belohnungen / Punkte: eigene Karten mit data-rewards-field vorbereitet
- Glücksrad: rewards-wheel-placeholder ist als spätere Erweiterungsfläche vorgesehen
- Styles: dedizierter Block Rewards Seite in style.css

## Abzeichen-System pflegen

- Hauptbereich: rewards.html, Karte rewards-badges
- Kategorien: Fahrten, Treue, Krankenfahrten, Flughafen, Geheim, Saison
- Statuslogik im Design: is-unlocked und is-locked
- Geheime Abzeichen: is-secret ohne Fortschrittsanzeige
- Kundenkonto-Übersicht: kompakte Badge-Vorschau in kundenkonto.html