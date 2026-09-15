# Ergebnis — Funktionstest im Originalprojekt bestaetigt, Testdaten bereinigt

Stand 15.09.2026. Anschluss an
`ERGEBNIS-2026-09-14-einspielung-abgeschlossen.md` (strukturelle Einspielung)
und `ERGEBNIS-2026-09-15-anhang-anzeige-fix.md` (Anzeigefehler-Fix). Dieses
Dokument fasst den seitdem durchgefuehrten praktischen Funktionstest gegen
das Originalprojekt zusammen und dokumentiert die anschliessende Bereinigung
der dabei entstandenen Testdaten.

## 1. Bestaetigte Funktionstests im Originalprojekt

Durchgefuehrt ueber den echten Portalcode gegen die produktive
Supabase-Instanz, mit dem Testkonto `fahrer.test@taxigermersheim.de`
(Mitarbeiter-ID `c14a34be-35d9-4d18-b21e-4aeb3827c446`, auth-Ordner
`e58924c4-5af4-46f2-845a-a25fdac5757e`).

| Test | Ergebnis |
|---|---|
| Dokumentenupload (separater Testupload, ohne Krankmeldung) | Mitarbeiter sieht die Datei im Portal und kann sie oeffnen; Admin sieht und oeffnet sie unter `admin/dokumentfristen.html` |
| Krankmeldung MIT Anhang | Bild-Vorschau und Dateiname vor dem Absenden sichtbar; nach dem Absenden korrekt mit Krankenschein verknuepft (`document_submission_id` gesetzt) |
| Krankmeldung OHNE Anhang | wie vorgesehen ohne Verknuepfung gespeichert (`document_submission_id = null`) |
| Anzeige nach dem Anzeige-Fix (siehe unten) | nach Neuladen zeigte das Portal korrekt einmal „Ohne Anhang" und zweimal „Mit Anhang", passend zu den Datenbankwerten |

## 2. Dabei gefundener und behobener Fehler

Waehrend dieses Funktionstests fiel auf, dass eine Krankmeldung mit
nachweislich vorhandenem Anhang trotzdem als „Ohne Anhang" angezeigt wurde.
Ursache und Fix stehen vollstaendig in
[`ERGEBNIS-2026-09-15-anhang-anzeige-fix.md`](ERGEBNIS-2026-09-15-anhang-anzeige-fix.md):
reine Anzeigeursache in `renderAbsences()` (`fahrer/mitarbeiter.js`), kein
Upload- oder Verknuepfungsfehler. Committet in
`316de73` auf `feature/011-einspielung-bestandsdatenbank`.

## 3. Bereinigung der Testdaten

Der Funktionstest legte in der Datenbank drei Krankmeldungen, drei
Dokumenteinreichungen und drei Dateien im Bucket `employee-documents`
(Ordner `e58924c4-5af4-46f2-845a-a25fdac5757e/2026/`) an. Vor der Bereinigung
wurde eine lesende Bestandsaufnahme erstellt, die fuer jeden Dateipfad die
tatsaechlichen Verknuepfungen aus `document_submissions`, `employee_documents`
und `sickness_reports` zusammenfuehrte — keine zusaetzlichen, unerwarteten
Verknuepfungen vorhanden.

### Entfernte Datensaetze

| sickness_reports.id | document_submission_id | Notiz |
|---|---|---|
| `46276d5c-e592-48ad-810c-c2323071ae91` | `4163d560-78c2-448f-9430-d893ecba2063` | FUNKTIONSTEST - keine echte Krankmeldung |
| `9e0c7fe2-4101-4605-a780-e304e873168c` | `aee61884-81fd-4f4e-82f7-597cf96b8fd9` | FUNKTIONSTEST - mit anhang |
| `e267b703-c2ed-4fb8-84cd-d763e99b3f42` | `null` | FUNKTIONSTEST - keine echte Krankmeldung |

| document_submissions.id | Dateipfad |
|---|---|
| `4163d560-78c2-448f-9430-d893ecba2063` | `e58924c4-5af4-46f2-845a-a25fdac5757e/2026/34402106-b35c-472e-99bf-aa40bf0fd436.png` |
| `aee61884-81fd-4f4e-82f7-597cf96b8fd9` | `e58924c4-5af4-46f2-845a-a25fdac5757e/2026/eeec437a-f8eb-4f98-875d-bbb6cc7cf276.png` |
| `0a021137-2984-4f66-adb4-e6f165ab4c81` | `e58924c4-5af4-46f2-845a-a25fdac5757e/2026/a2dc1539-898c-4f50-9939-a1f9535060ee.png` |

Alle drei Dateien trugen denselben hochgeladenen Testdateinamen
`TEST-Portal-14-09-2026.png.png`.

### Ablauf

1. **SQL-Transaktion** (`begin ... commit` in einem Lauf): sperrte zuerst
   alle sechs bekannten Zeilen sowie zusaetzlich jede Zeile, die nur ueber
   die drei Dateipfade oder die drei `document_submission_id`-Werte
   erreichbar war (`for update`), pruefte danach Mitarbeiterzuordnung,
   erwartete Verknuepfungen und das Fehlen unbekannter zusaetzlicher
   Verweise, loeschte in der Reihenfolge `sickness_reports` vor
   `document_submissions` und pruefte die Zeilenzahl jedes Schritts per
   `RAISE EXCEPTION` gegen Abweichung. Waere irgendeine Pruefung
   fehlgeschlagen, waere die gesamte Transaktion ohne Wirkung geblieben.
2. **Storage-API** (kein SQL-`DELETE`, kein Service-Role-Key): ueber den
   im Browser bereits angemeldeten Testmitarbeiter, mit einer Client-Instanz
   nach demselben Muster wie `client()` in `fahrer/employee-supabase.js`
   (`window.supabase.createClient(cfg.url, cfg.publishableKey)` mit der
   Konfiguration aus `admin/supabase-config.js`). Vor dem Entfernen wurden
   Projekt-Adresse und `auth.uid()` der Sitzung geprueft. Die drei Pfade
   wurden per `storage.from('employee-documents').remove([...])` entfernt;
   ausgewertet wurde die tatsaechlich zurueckgegebene Liste der entfernten
   Objekte (`data`), nicht nur das Fehlen eines Fehlers.

### Bestaetigtes Endergebnis

Abschliessende lesende Kontrolle im Originalprojekt:

```
krankmeldungen         = 0
dokumenteinreichungen  = 0
dateien                = 0
```

Alle drei Zaehler betreffen ausschliesslich die sechs oben genannten
Datensatz-IDs und drei Dateipfade. Testkonto, Mitarbeiterprofil,
Dokumenttypen und lokale Altbestaende auf anderen Geraeten sind von der
Bereinigung nicht betroffen und wurden nicht angefasst.

## Was das ausdruecklich nicht beweist

- Kein Beleg fuer das Verhalten bei gleichzeitigen Zugriffen ausserhalb
  dieser einen Bereinigung — die Sperren galten fuer die Dauer dieser
  Transaktion.
- Kein erneuter struktureller oder automatisierter Testlauf; die
  Bestaetigung stuetzt sich auf die drei genannten manuellen
  Funktionstests und die drei lesenden Kontrollabfragen.
