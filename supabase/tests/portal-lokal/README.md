# Lokale Portal-Testfassung

Fährt den **echten Portalcode im echten Browser** gegen das Supabase-
**Testprojekt**. Kein Node, kein Playwright, kein Build — auf diesem Rechner ist
Node nicht vorhanden, deshalb läuft beides in Windows PowerShell.

| Datei | Zweck |
|---|---|
| `10_testserver.ps1` | liefert die Projektdateien unverändert aus, ersetzt **nur** `/admin/supabase-config.js` |
| `20_portal_ui_test.ps1` | steuert Chrome über das DevTools-Protokoll durch die Abläufe |
| `cdp-hilfe.ps1` | schmale Steuerung für Chrome (WebSocket, Sitzungen, Klicks, Dateiauswahl) |
| `ERGEBNIS-2026-09-13-portal-ui.md` | Befund des Laufs vom 13.09.2026 mit seinen Grenzen |

## Ablauf

```
1. Vorbereitung: supabase/tests/storage-api/konfiguration.json und
                 projekt-freigabe.txt ausgefuellt (siehe README-VORBEREITUNG.md)
2. Server:       powershell -File 10_testserver.ps1 -Bestaetigung -Port 8791
3. Lauf:         powershell -File 20_portal_ui_test.ps1 -Bestaetigung -Port 8791
4. Beenden:      stop.txt neben 10_testserver.ps1 anlegen
```

Zusätzliche Schalter des Laufs: `-Sichtbar` zeigt den Browser statt kopflos,
`-Behalten` lässt die Testdaten liegen, `-DebugPort` verschiebt den
Steueranschluss von Chrome.

## Warum die Konfiguration ersetzt und nicht überschrieben wird

`admin/supabase-config.js` im Arbeitsverzeichnis enthält die Produktivinstanz
und wird **nie geändert**. Der Testserver liest sie nur, um deren Kennung hart
zu sperren, und liefert stattdessen eine zur Laufzeit erzeugte Fassung aus, die
auf das Testprojekt zeigt. Diese Fassung liegt nirgends auf der Platte.

## Schranken in beiden Skripten

- Ohne `-Bestaetigung` passiert nichts.
- `projekt-freigabe.txt` nennt die einzige erlaubte Projektkennung. Weicht
  `konfiguration.json` ab, bricht der Lauf ab, bevor eine Verbindung entsteht.
  Die zweite Datei ist Absicht: eine Konfiguration, die sich selbst bestätigt,
  wäre keine Schranke.
- Die Kennung aus `admin/supabase-config.js` ist zusätzlich hart gesperrt.
- Vor dem ersten Schreibzugriff wird **positiv** gemessen, dass das Ziel die
  vier synthetischen Testkonten im erwarteten Zustand trägt.
- Der Lauf prüft, dass der Server tatsächlich die Testfassung ausliefert.
- Schlüssel, Kennwörter, Token und signierte Adressen erscheinen nirgends in
  der Ausgabe oder in der Aufzeichnung.
- Hochgeladen werden ausschließlich im Skript erzeugte PDF-Bytes.

## Bekannte Grenzen

Stehen vollständig in `ERGEBNIS-2026-09-13-portal-ui.md`. Die wichtigsten: Der
Schutz bei **gleichzeitigen Vorgängen** ist weiterhin nur lokal geprüft, der
**Fehlerfall der Verknüpfung** wurde nicht erzwungen, und ein bestandener Lauf
gilt für das Testprojekt — über die Produktivinstanz sagt er nichts.
