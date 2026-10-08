# Storage-API im Testprojekt geprüft — 12.09.2026

Geprüft wurde der Dokumentenupload gegen die **echte Supabase-Storage-API** des
Testprojekts. Das ist genau der Punkt, den der lokale Lauf vom 11.09.2026 offen
lassen musste: Dort wurde per SQL `delete from storage.objects` gelöscht.

| | |
|---|---|
| Lauf | `supabase/tests/storage-api/20_storage_api_test.ps1 -Bestaetigung -Aufraeumen` |
| Ziel | Supabase-Testprojekt, Kennung nur lokal in `projekt-freigabe.txt` |
| Ergebnis | **28 von 28 Prüfungen bestanden**, Rückgabewert 0 |
| Gegen die Produktivinstanz ausgeführt | **nichts** |
| Verwendete Daten | ausschließlich synthetisch: vier Konten auf `example.invalid`, im Skript erzeugte PDF-Bytes |

Kein Service-Role-Key, kein Browser, kein Node: Der Lauf spricht `auth/v1`,
`rest/v1` und `storage/v1` direkt an — dieselben Endpunkte, die `supabase-js` in
`fahrer/employee-supabase.js` absetzt.

## Prüfung des Ziels vor dem ersten Schreibzugriff

Eine bloße Abweichung von der Produktivinstanz genügt nicht. Deshalb drei
Stufen, alle **vor** dem ersten Upload:

1. `projekt-freigabe.txt` nennt die einzige erlaubte Projektkennung. Weicht
   `projektUrl` ab, bricht der Lauf ab, bevor eine Verbindung entsteht. Die
   Kennung stammt bewusst aus einer zweiten Datei — eine Konfiguration, die sich
   selbst bestätigt, wäre keine Schranke.
2. Die Kennung aus `admin/supabase-config.js` ist hart gesperrt, auch wenn die
   Freigabe sie nennen sollte.
3. Nach der Anmeldung wird **positiv** gemessen, dass das Ziel die vier
   synthetischen Konten in genau dem Zustand trägt, den `10_testkonten.sql`
   herstellt — einschließlich `portal_active = false` beim inaktiven Konto.
   Trifft das nicht zu, endet der Lauf ohne Schreibzugriff.

Alle sechs Abbruchwege sind am 12.09.2026 mit Schein-Kennungen im Scratchpad
gemessen worden; der passende Fall läuft durch.

## Die 28 Prüfungen

### Anmeldung und Kennzeichen (3)

| Prüfung | Ergebnis |
|---|---|
| Alle vier Testkonten können sich anmelden | bestanden |
| Zielprojekt trägt die vier synthetischen Testkonten | bestanden, 4 von 4 |
| Eigenes Profil lesbar (`employee_id`) | bestanden |

### Hochladen (4)

| Prüfung | Ergebnis |
|---|---|
| A lädt in den eigenen Ordner hoch | bestanden, HTTP 200 |
| A kann **nicht** in den Ordner von B hochladen | bestanden, HTTP 400 |
| Gesperrtes Portalkonto kann **nicht** hochladen | bestanden, HTTP 400 |
| Ohne Anmeldung kann niemand hochladen | bestanden, HTTP 400 |

Das gesperrte Konto meldet sich erfolgreich an und scheitert erst am Upload.
Genau das weist nach, dass `private.is_active_employee()` `portal_active`
auswertet — ein Konto ohne Profil wäre schon an der Verknüpfung gescheitert und
wäre kein Beleg.

### Grenzen des Buckets (2)

| Prüfung | Ergebnis |
|---|---|
| Datei über der Größengrenze (11 MB) | abgewiesen, HTTP 400 |
| Unerlaubter Dateityp (`text/plain`) | abgewiesen, HTTP 400 |

### Lesen (9)

| Prüfung | Ergebnis |
|---|---|
| A erhält eine signierte URL für die eigene Datei | bestanden |
| B erhält **keine** signierte URL für die Datei von A | bestanden, HTTP 400 |
| Admin erhält eine signierte URL für fremde Dateien | bestanden |
| Datei ist tatsächlich abrufbar (URL **und** Bytes) | bestanden |
| A lädt die eigene Datei vollständig herunter | bestanden, 193 von 193 Bytes |
| Admin lädt die fremde Datei vollständig herunter | bestanden, 193 von 193 Bytes |
| B erhält die Datei von A auch nicht direkt (ohne signierte URL) | bestanden, HTTP 400 |
| Ohne Anmeldung ist die Datei nicht abrufbar | bestanden, HTTP 400 |
| Ohne Anmeldung ist der Bucket nicht auflistbar | bestanden, leere Liste |

### Ablauf signierter URLs (1)

| Prüfung | Ergebnis |
|---|---|
| Gültigkeit 1 s, Abruf nach 5 s | abgewiesen, HTTP 400 |

### Löschen — der eigentliche Punkt (9)

| Prüfung | Ergebnis |
|---|---|
| B kann die Datei von A **nicht** löschen | bestanden, Datei danach noch abrufbar |
| Zweite Datei für den Verknüpfungsfall hochgeladen | bestanden |
| Verknüpfung in `document_submissions` angelegt | bestanden |
| **Verknüpfte Datei bleibt beim Löschversuch erhalten** | **bestanden** |
| Löschversuch entfernt nachweislich nichts (0 Einträge gemeldet) | bestanden |
| Verknüpfte Datei ist danach unverändert herunterladbar | bestanden, 193 von 193 Bytes |
| Unverknüpfte eigene Datei lässt sich löschen | bestanden, danach nicht mehr abrufbar |
| Erfolgreiches Löschen meldet den entfernten Eintrag | bestanden, 1 Eintrag |
| Nach dem Lösen der Verknüpfung ist die Datei löschbar | bestanden |

## Befund: Die Policy greift vor dem Trigger

Der erste Lauf meldete einen Fehlschlag, weil eine Prüfung die Trigger-Meldung
`DOCUMENT_ALREADY_LINKED` in der Antwort erwartete. Sie erscheint nicht. Die
Storage-API antwortet auf den Löschversuch einer verknüpften Datei mit **HTTP
200 und einem leeren Array** — kein Fehler.

Der Gegenversuch macht daraus einen Messwert statt einer Vermutung: Beim
Löschen einer **unverknüpften** Datei nennt dieselbe Antwort genau einen
entfernten Eintrag, beim verknüpften Fall keinen.

Daraus folgt: Die **DELETE-Policy** `employee_documents_delete_unlinked` blendet
die verknüpfte Zeile aus, bevor der `BEFORE DELETE`-Trigger zu Wort kommt. Der
Trigger ist die zweite Reihe und über die API nicht sichtbar zu machen. Beide
Schichten sind vorhanden, sie greifen nur in dieser Reihenfolge. Der
Trigger-Nachweis selbst bleibt der lokale Lauf `15_deletepolicy_run.ps1`, wo
sich die Policy gezielt entfernen lässt.

Für die Oberfläche heißt das: `supabase-js .remove()` liefert hier **keinen
Fehler**, sondern `data = []`. Wer nur auf `error` prüft, meldet fälschlich
Erfolg. `fahrer/employee-supabase.js` wertet an der betreffenden Stelle bereits
`data.length` aus — geprüft am 12.09.2026, dort ist nichts zu ändern.

## Grenzen — nicht überschreiben

1. **Nebenläufigkeit ist hier nicht geprüft.** Der Wettlauf zwischen Löschen und
   Verknüpfen ist **ausschließlich lokal** gemessen worden
   (`supabase/tests/local/13_concurrency_run.ps1`, zwei echte Verbindungen unter
   Zeilensperre). Über die Storage-API ist er von außen nicht sauber taktbar.
   Für das Testprojekt und für die Produktivinstanz ist dieser Schutz damit
   **nicht** nachgewiesen.
2. Der Nachweis „Datei vorhanden" läuft über eine signierte URL plus Abruf der
   Bytes. Der umgekehrte Fall — Katalogeintrag weg, Objekt verwaist im
   Speicher — bleibt von außen unsichtbar.
3. Ein bestandener Lauf gilt für das **Testprojekt**. Über die Produktivinstanz
   sagt er nichts.
4. Gemessen wurde Verhalten, keine Zusage der Plattform. Dass Supabase heute das
   `TRIGGER`-Recht gewährt und `CREATE POLICY` im SQL-Editor zulässt, bleibt ein
   Messwert und kann sich ändern.
5. Der **Anzeigename** des Zielprojekts ist über die Datenschnittstelle nicht
   lesbar; dafür bräuchte es die Management-API und ein persönliches
   Zugriffstoken. Gemessen wurde der Inhalt des Projekts, nicht sein Name.
6. Die Prüfung fuhr die REST-Endpunkte direkt an, nicht den Browsercode. Was die
   Portaloberfläche daraus macht, steht hier nicht.

## Hinterlassener Zustand

Im Bucket: **nichts**. Alle vier Ordner sind leer, `document_submissions` und
`employee_documents` enthalten null Zeilen — nach dem Lauf nachgemessen.

Bestehen bleiben die synthetischen Stammdaten: vier Einträge in `employees`, die
zugehörigen `profiles`, die vier Auth-Konten und der Dokumenttyp
`tg-test-nachweis`. Sie werden mit Abschnitt 5 von `10_testkonten.sql` und im
Dashboard entfernt, wenn das Testprojekt nicht weiter gebraucht wird.
