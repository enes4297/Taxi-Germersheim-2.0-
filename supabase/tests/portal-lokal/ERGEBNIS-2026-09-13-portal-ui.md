# Portaloberfläche gegen das Testprojekt geprüft — 13.09.2026

Geprüft wurde der vollständige Ablauf **im echten Browser mit dem echten
Portalcode**: Anmeldung, Dokumenteinreichung, Anzeige nach Neuladen,
Admin-Einsicht, Abgrenzung gegen einen fremden Mitarbeiter und Krankmeldung mit
Anhang. Keine Attrappen, keine nachgebauten Backend-Antworten.

| | |
|---|---|
| Lauf | `10_testserver.ps1 -Bestaetigung -Port 8791`, dann `20_portal_ui_test.ps1 -Bestaetigung -Port 8791` |
| Browser | installiertes Chrome, kopflos, gesteuert über das DevTools-Protokoll |
| Ziel | Supabase-**Testprojekt**, Kennung nur lokal in `projekt-freigabe.txt` |
| Ergebnis | **32 von 32 Prüfungen bestanden**, Rückgabewert 0 |
| Gegen die Produktivinstanz ausgeführt | **nichts** |
| Verwendete Daten | ausschließlich synthetisch: vier Konten auf `example.invalid`, zwei im Skript erzeugte PDF (238 / 239 Byte) |

## Wie „echter Code ohne Stubs" hier hergestellt wird

`10_testserver.ps1` liefert die Dateien dieses Arbeitsverzeichnisses
unverändert von der Platte aus — HTML, CSS und alle JavaScript-Module. Genau
**eine** Ausnahme: `/admin/supabase-config.js` wird nicht von der Platte
gelesen, sondern zur Laufzeit aus `konfiguration.json` erzeugt und zeigt auf das
Testprojekt. Die Datei im Arbeitsverzeichnis wird dabei nur gelesen, nie
geschrieben; sie enthält weiterhin ausschließlich die Produktivinstanz — und
deren Kennung ist im Server hart gesperrt.

Alles andere ist der Produktionscode: `fahrer/mitarbeiter-login.js`,
`fahrer/employee-supabase.js`, `fahrer/mitarbeiter.js`,
`admin/supabase-auth.js`, `admin/auth.js`, `admin/dokumenteingang-supabase.js`
und `supabase-js` aus dem CDN. Geschrieben wird in dieselbe Datenbank und
denselben privaten Bucket, die auch der Storage-API-Lauf vom 12.09.2026 benutzt
hat.

Die drei Konten laufen in **getrennten Browsersitzungen** mit eigenem Speicher.
Ohne das würde jede neue Anmeldung die vorige aus dem Sitzungsspeicher werfen,
und „B sieht nichts" wäre kein Befund, sondern ein Nebeneffekt.

## Die 32 Prüfungen

### Ziel und Anmeldung (4)

| Prüfung | Ergebnis |
|---|---|
| Zielprojekt trägt die vier synthetischen Testkonten | bestanden, 4 von 4, davon 1 ohne Portalrecht |
| Mitarbeiter A meldet sich über das Anmeldeformular an | bestanden |
| Mitarbeiter B meldet sich an | bestanden |
| Admin meldet sich im Verwaltungsbereich an | bestanden |

### A reicht ein Dokument ein (7)

| Prüfung | Ergebnis |
|---|---|
| Bereich „Dokument senden" lässt sich öffnen | bestanden |
| Dokumentarten kommen aus der Datenbank und lassen sich wählen | bestanden, gewählt: „Testnachweis (synthetisch)" |
| Synthetische PDF-Datei ist im Formular ausgewählt | bestanden |
| Die Einreichung steht anschließend in `document_submissions` | bestanden |
| Die Datei liegt im privaten Ordner von A | bestanden, 1 Datei |
| A kann die eigene Datei über das Portal öffnen (signierte Adresse) | bestanden |
| Nach dem Neuladen ist die Einreichung weiterhin gelistet | bestanden, Status „Übermittelt" |

Die Datei wurde über `DOM.setFileInputFiles` in das Feld gelegt — dieselbe
Dateiauswahl, die der Browser beim Klick auf „Datei auswählen" erzeugt. Kein
`new File()` im Seitenkontext.

### Erfolg erst nach gespeicherter Verknüpfung (3)

Der entscheidende Punkt der Oberfläche: Ein gelungener Upload allein darf nicht
als Erfolg gemeldet werden. Gemessen wurde das, indem **die echte Anfrage an die
echte Datenbank an der Leitung angehalten** wurde (`Fetch`-Domäne des
DevTools-Protokolls, `POST .../rest/v1/document_submissions`). Es ist dieselbe
Anfrage mit derselben Antwort, nur später durchgelassen — keine erfundene
Antwort, kein Stub.

| Prüfung | Ergebnis |
|---|---|
| Die Verknüpfung ließ sich zum Messen anhalten | bestanden |
| Datei liegt bereits im Speicher, während die Verknüpfung noch aussteht | bestanden: 1 Datei im Ordner von A, 0 Zeilen in `document_submissions` |
| Solange die Verknüpfung aussteht, meldet die Oberfläche **keinen** Erfolg | bestanden, Rückmeldung in diesem Moment leer |
| Nach dem Durchlassen erscheint der Erfolg | bestanden: „✓ Dokument wurde übermittelt und liegt der Zentrale vor." |

### Der Admin sieht und öffnet das Dokument (4)

| Prüfung | Ergebnis |
|---|---|
| Admin sieht die Einreichung von A im Dokumenteingang (`admin/dokumentfristen.html`) | bestanden |
| Der Verwaltungsbereich weist den Admin nicht ab | bestanden, kein Rücksprung auf `login.html` |
| Der Klick auf „Öffnen" führt zu einem Fenster mit signierter Adresse | bestanden |
| Diese Adresse liefert die Datei tatsächlich aus | bestanden, HTTP 200, **238 von 238 Byte** |

Die signierte Adresse wurde ausschließlich maschinell geprüft und **nirgends
ausgegeben** — weder in der Konsole noch in der Aufzeichnung.

### Mitarbeiter B kommt nicht heran (3)

| Prüfung | Ergebnis |
|---|---|
| Die Einreichung von A taucht bei B nicht in der Liste auf | bestanden, Anzeige: „Noch kein Dokument übermittelt." |
| B erhält für die Datei von A keine signierte Adresse | bestanden, `getSignedDocumentUrl()` liefert `null` |
| B sieht die Einreichung auch in der Datenschnittstelle nicht | bestanden, 0 sichtbare Einreichungen |

Der zweite Punkt läuft bewusst über den echten Portalcode: Aufgerufen wurde
`window.EmployeeSupabase.getSignedDocumentUrl(<Pfad von A>)` in der Seite von B.
Die Abweisung kommt also aus der Policy, nicht daraus, dass die Oberfläche den
Pfad nicht kennt.

### Krankmeldung mit Anhang (7)

| Prüfung | Ergebnis |
|---|---|
| Bereich „Krankmeldung senden" lässt sich öffnen | bestanden |
| Krankenschein ist als Anhang ausgewählt | bestanden |
| Krankmeldung wird als übermittelt gemeldet | bestanden |
| Die Rückmeldung nennt den angehängten Krankenschein | bestanden |
| Krankmeldung steht mit verknüpftem Nachweis in `sickness_reports` | bestanden |
| Der Anhang ist als eigene Einreichung gespeichert | bestanden |
| Krankmeldung und Anhang zeigen auf denselben Datensatz | bestanden |
| Beide synthetischen Dateien liegen im Ordner von A | bestanden, 2 Dateien |

### Aufräumen (2)

| Prüfung | Ergebnis |
|---|---|
| Nach dem Aufräumen liegen keine Testdateien mehr im Bucket | bestanden, 0 |
| Nach dem Aufräumen stehen keine Testeinreichungen mehr in der Tabelle | bestanden, 0 |

Die Reihenfolge ist keine Kosmetik: erst die Krankmeldung, dann die
Verknüpfung, erst danach die Datei. Andersherum blockt die DELETE-Policy den
Löschversuch — und das zu Recht. Die Dateien entfernt das Konto von A selbst
über die Storage-API; ein SQL-`DELETE` würde nur den Katalogeintrag löschen.

## Grenzen — nicht überschreiben

1. **Nebenläufigkeit bleibt offen.** Der Wettlauf zwischen Löschen und
   Verknüpfen ist weiterhin **ausschließlich lokal** gemessen
   (`supabase/tests/local/13_concurrency_run.ps1`, zwei echte Verbindungen unter
   Zeilensperre). Weder für das Testprojekt noch für die Produktivinstanz ist
   dieser Schutz nachgewiesen.
2. **Der Fehlerfall der Verknüpfung wurde nicht erzwungen.** Gemessen ist:
   Solange die Verknüpfung aussteht, erscheint kein Erfolg. Was die Oberfläche
   meldet, wenn die Verknüpfung endgültig **scheitert** — und ob die verwaiste
   Datei dann wirklich entfernt wird — ist hier **ungeprüft**. Eine erfundene
   Fehlerantwort wäre ein Stub gewesen und war deshalb nicht erlaubt.
3. **Die Anzeige der PDF selbst ist nicht gemessen.** Gemessen ist, dass der
   Browser ein Fenster öffnet und dessen Adresse auf eine signierte Adresse des
   privaten Buckets setzt, und dass diese Adresse genau die hochgeladenen Bytes
   liefert. Ob Chromes PDF-Anzeige daraus ein Bild macht, sagt der Lauf nicht.
4. **Nur Chrome, nur kopflos.** Kein zweiter Browser, kein echtes Mobilgerät,
   keine Prüfung der Darstellung.
5. **Nur die Rolle `admin`.** Der Zugang mit `dispatcher` und die Abweisung
   eines Mitarbeiterkontos im Verwaltungsbereich sind hier nicht gefahren.
6. **Das gesperrte Portalkonto wurde nicht über die Oberfläche gefahren.** Für
   dieses Konto liegt nur die API-Messung vom 12.09.2026 vor.
7. **Fehlermeldungen der Oberfläche sind ungeprüft.** Zu große Datei, falscher
   Dateityp, abgelaufene Sitzung: an der API am 12.09.2026 gemessen, über die
   Oberfläche nicht.
8. Ein bestandener Lauf gilt für das **Testprojekt**. Über die Produktivinstanz
   sagt er nichts.

## Hinterlassener Zustand

Nach dem Lauf nachgemessen: **0 Dateien** in allen vier Ordnern des Buckets,
**0 Zeilen** in `document_submissions`, `employee_documents` und
`sickness_reports`.

Bestehen bleiben die synthetischen Stammdaten — vier Einträge in `employees`,
die zugehörigen `profiles`, die vier Auth-Konten und fünf `document_types`. Sie
werden auf Wunsch mit Abschnitt 5 von
`supabase/tests/storage-api/10_testkonten.sql` und im Dashboard entfernt.

Lokal nicht im Repo: `chrome-profil/`, `testdateien/` und `ergebnis-ui-*.txt`
sind durch `.gitignore` ausgeschlossen. Die erzeugten PDF löscht das Skript
selbst.
