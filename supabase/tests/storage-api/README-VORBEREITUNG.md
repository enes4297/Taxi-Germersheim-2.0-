# Echte Storage-API-Tests — was noch fehlt

Stand 12.09.2026. Diese Tests laufen gegen das **Supabase-Testprojekt**, nicht
lokal und niemals gegen die Produktivinstanz.

## Warum es diese Tests überhaupt gibt

Der lokale Lauf vom 11.09.2026 hat 17 von 17 Prüfungen bestanden, gelöscht wurde
dort aber per SQL `delete from storage.objects`. Ob die **echte Storage-API**
denselben Weg nimmt, den `BEFORE DELETE`-Trigger auslöst und die Datei wirklich
aus dem Objektspeicher entfernt, ist damit **nicht** geprüft. Genau das ist der
offene Punkt aus `supabase/tests/local/ERGEBNIS-2026-09-11-setupweg.md`,
Grenze 1.

## Was fehlt — Prüfliste

| # | Fehlt | Woher | Status |
|---|---|---|---|
| 1 | Zugangsdaten des Testprojekts (URL + Publishable-Key) | Dashboard → Project Settings → API | **erledigt am 12.09.2026** — nur lokal in `konfiguration.json`; im Repo steht weiterhin ausschliesslich die Produktivinstanz in `admin/supabase-config.js` |
| 2 | Vier Auth-Konten mit Kennwörtern | Dashboard → Authentication → Users → Add user, **Auto Confirm User an** | **erledigt am 12.09.2026** |
| 3 | Stammdaten zu diesen Konten (`employees`, `profiles`, `document_types`) | `10_testkonten.sql` im SQL Editor | **erledigt am 12.09.2026** |
| 4 | `konfiguration.json` neben dieser Datei | Kopie von `konfiguration.beispiel.json` | **ausgefüllt am 12.09.2026** (nur lokal) |
| 4b | `projekt-freigabe.txt` neben dieser Datei | Kopie von `projekt-freigabe.beispiel.txt` | **ausgefüllt am 12.09.2026** (nur lokal) |
| 5 | DELETE-Policy `employee_documents_delete_unlinked` | `supabase/setup/storage-delete-policy-nachtragen.sql` | **eingespielt**, im Lauf vom 12.09.2026 nachgewiesen |
| 6 | Bucket mit den richtigen Grenzen | hat das Basisskript angelegt | **gemessen am 12.09.2026**: 11 MB und `text/plain` werden abgewiesen |

### Die vier Konten

| Konto | Zweck | Besonderheit |
|---|---|---|
| `tg-test-a@example.invalid` | aktiver Mitarbeiter | lädt hoch, löscht |
| `tg-test-b@example.invalid` | zweiter aktiver Mitarbeiter | Gegenprobe: fremder Ordner |
| `tg-test-admin@example.invalid` | Admin | liest fremde Dateien, löst Verknüpfungen |
| `tg-test-inaktiv@example.invalid` | gesperrtes Portalkonto | `portal_active = false` — angemeldet, aber ohne Uploadrecht |

`example.invalid` ist nach RFC 6761 dauerhaft nicht auflösbar. Es kann also
keine Post an Unbeteiligte gehen. Deshalb muss beim Anlegen **Auto Confirm User**
eingeschaltet sein — eine Bestätigungsmail käme nie an.

Das inaktive Konto ist bewusst ein vollständig angelegter Mitarbeiter, dem allein
`portal_active` fehlt. Nur so weist der Test nach, dass
`private.is_active_employee()` dieses Feld auswertet.

### Lokale Einstellungen

- **Node ist auf diesem Rechner nicht auffindbar** (weder im `PATH` noch unter
  `C:\Program Files\nodejs`). Deshalb kommt der Testlauf ohne Node und ohne
  `npm install` aus: `20_storage_api_test.ps1` spricht die REST-Endpunkte
  `auth/v1`, `rest/v1` und `storage/v1` direkt mit `Invoke-WebRequest` an — das
  sind dieselben Aufrufe, die `supabase-js` in `fahrer/employee-supabase.js`
  absetzt. Die Playwright-Tests unter `fahrer/tests/` wären derzeit **nicht**
  lauffähig; für diese Prüfung werden sie auch nicht gebraucht.
- Kein Service-Role-Key, nirgends. Nur der Publishable-Key und Sitzungen der
  vier Testkonten.
- `konfiguration.json` enthält Kennwörter und ist per `.gitignore`
  ausgeschlossen. Der Publishable-Key allein ist kein Geheimnis, die Kennwörter
  sind es. Ebenso ausgeschlossen: `projekt-freigabe.txt` — so kann kein Zweig
  und kein Merge sie unbemerkt auf ein anderes Projekt umbiegen.

## Ablauf

```
1. Dashboard:    vier Konten anlegen (Auto Confirm User)
2. SQL Editor:   set tg.test_env = 'ICH-BESTAETIGE-ISOLIERTE-TESTUMGEBUNG';
                 10_testkonten.sql
3. Dateien:      konfiguration.json ausfüllen (URL, Publishable-Key, vier
                 Kennwörter) und in projekt-freigabe.txt die Kennung des
                 Testprojekts eintragen
4. Gegenprobe:   powershell -File 20_storage_api_test.ps1 -NurPruefen
                 prüft nur die beiden Dateien, baut KEINE Verbindung auf
5. Lauf:         powershell -File 20_storage_api_test.ps1 -Bestaetigung
6. Aufräumen:    powershell -File 20_storage_api_test.ps1 -Bestaetigung -Aufraeumen
                 danach Abschnitt 5 in 10_testkonten.sql
```

## Was der Lauf misst

| Fall | Erwartung |
|---|---|
| A lädt in den eigenen Ordner | gelingt |
| A lädt in den Ordner von B | scheitert |
| gesperrtes Portalkonto lädt hoch | scheitert |
| ohne Anmeldung hochladen | scheitert |
| A holt signierte URL der eigenen Datei | gelingt |
| B holt signierte URL der Datei von A | scheitert |
| Admin holt signierte URL fremder Dateien | gelingt |
| B löscht die Datei von A | scheitert, Datei bleibt |
| **A löscht eine VERKNÜPFTE Datei** | **scheitert, Datei bleibt und ist weiter herunterladbar** |
| A löscht eine unverknüpfte eigene Datei | gelingt, Datei ist danach wirklich weg |
| nach Lösen der Verknüpfung löschen | gelingt |

## Schutzabfragen im Skript

- Ohne `-Bestaetigung` passiert nichts.
- **Freigabe:** `projekt-freigabe.txt` nennt die einzige Projektkennung, gegen
  die gelaufen werden darf. Fehlt die Datei, steht der Platzhalter noch drin
  oder weicht die Kennung von `projektUrl` ab, bricht der Lauf ab — vor der
  ersten Anmeldung. Die zweite Datei ist Absicht: eine Konfiguration, die sich
  selbst bestätigt, wäre keine Schranke.
- Die Projekt-URL aus `admin/supabase-config.js` ist zusätzlich hart gesperrt.
  Steht sie in `konfiguration.json`, bricht der Lauf ab — auch dann, wenn die
  Freigabe sie nennt.
- Kennwörter, Token und Schlüssel werden aus jeder Bildschirmausgabe entfernt.
- Geprüft am 12.09.2026 mit Schein-Kennungen im Scratchpad: alle sechs Abbrüche
  greifen, der passende Fall läuft durch. Das misst die Schranken, nicht die
  Storage-API.
- Hochgeladen werden ausschließlich im Skript erzeugte PDF-Bytes. Keine echten
  Unterlagen, keine echten Personendaten.

## Grenzen — nicht überschreiben

1. Der Nachweis „Datei vorhanden" läuft über eine signierte URL plus Abruf der
   Bytes. Damit ist der umgekehrte Fall **nicht** messbar: Katalogeintrag weg,
   Objekt verwaist im Speicher. Das bliebe unsichtbar.
2. Ein bestandener Lauf gilt für das **Testprojekt**. Über die Produktivinstanz
   sagt er nichts.
3. Das Skript prüft Verhalten, nicht Zusagen der Plattform. Dass Supabase heute
   das TRIGGER-Recht gewährt, bleibt ein Messwert.
4. Nebenläufigkeit wird hier **nicht** geprüft. Der Wettlauf zwischen Löschen
   und Verknüpfen ist lokal mit zwei echten Verbindungen gemessen worden
   (`13_concurrency_run.ps1`); über die Storage-API ist er von außen nicht
   sauber taktbar.

## Ergebnis des Laufs vom 12.09.2026

`20_storage_api_test.ps1 -Bestaetigung -Aufraeumen` gegen das Testprojekt:
**28 von 28 Prüfungen bestanden**, Rückgabewert 0.

Der entscheidende Befund, wegen dem diese Tests überhaupt existieren: Der
Löschversuch auf eine **verknüpfte** Datei entfernt nichts, und die Datei ist
danach unverändert herunterladbar (193 von 193 Bytes). Eine unverknüpfte Datei
verschwindet dagegen wirklich — die signierte URL liefert sie danach nicht mehr.

### Wie die Abwehr tatsächlich aussieht

Die Storage-API antwortet auf den abgewiesenen Löschversuch mit **HTTP 200 und
einem leeren Array**, nicht mit einer Fehlermeldung. Der Gegenversuch macht das
zum Messwert: Beim erfolgreichen Löschen nennt dieselbe Antwort genau einen
entfernten Eintrag, beim verknüpften Fall keinen.

Daraus folgt: Die **DELETE-Policy** blendet die verknüpfte Zeile aus, bevor der
Trigger zu Wort kommt. `DOCUMENT_ALREADY_LINKED` erscheint deshalb nicht in der
Antwort — der Trigger ist die zweite Reihe und über die API nicht sichtbar zu
machen. Das ist kein Mangel: Beide Schichten sind vorhanden, sie greifen nur in
dieser Reihenfolge. Der Trigger-Nachweis selbst ist lokal erbracht
(`15_deletepolicy_run.ps1`), wo sich die Policy gezielt entfernen lässt.

`fahrer/employee-supabase.js` wertet an der entsprechenden Stelle bereits
`data.length` aus und nicht nur `error` — geprüft am 12.09.2026, dort ist
nichts zu ändern.

### Zusätzlich gemessen

| Prüfung | Ergebnis |
|---|---|
| Datei über 10 MB | abgewiesen (HTTP 400) |
| `text/plain` statt der erlaubten Typen | abgewiesen (HTTP 400) |
| signierte URL mit 1 s Gültigkeit, Abruf nach 5 s | abgewiesen (HTTP 400) |
| direkter Objektabruf durch fremdes Konto / ohne Anmeldung | abgewiesen |
| Auflisten des Buckets ohne Anmeldung | leer |

### Was der Lauf hinterlassen hat

Nichts im Bucket: Alle vier Ordner sind leer, `document_submissions` und
`employee_documents` enthalten null Zeilen. Bestehen bleiben die synthetischen
Stammdaten — vier Einträge in `employees`, die zugehörigen `profiles`, die vier
Auth-Konten und der Dokumenttyp `tg-test-nachweis`. Sie werden mit Abschnitt 5
von `10_testkonten.sql` und im Dashboard entfernt.
