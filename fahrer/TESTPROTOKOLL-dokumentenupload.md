# Testprotokoll — Privater Dokumentenupload

Stand 10.09.2026, Branch `feature/mitarbeiter-dokumentenupload`.

## Status in einem Satz

> **Lokal getestet. Die echte Storage-API von Supabase wurde nicht getestet —
> es wurde nichts in Produktion ausgeführt und keine Datei hochgeladen.**

## Ergebnis

| Prüfebene | Ergebnis | Art |
|---|---|---|
| RLS- und Policy-Tests, lokale PostgreSQL-Instanz | **46 von 46 bestanden** | echt, gegen PostgreSQL |
| Nebenläufigkeit über **zwei echte Verbindungen** | **2 von 2 Fällen bestanden** | echt, gegen PostgreSQL |
| Browsertests Portal | **37 von 37 bestanden** | **simuliert**, Backend ersetzt |
| Browsertests Admin (Krankmeldungen + Dokumenteingang) | **10 von 10 bestanden** | **simuliert**, Backend ersetzt |
| Echte Storage-API (Upload, Download, signierte URLs, Löschen der Datei) | **nicht getestet** | — |

### Nebenläufigkeitstest — `13_concurrency_run.ps1`

Zwei getrennte `psql`-Verbindungen, gezielt verschränkt (kein Lasttest):

| Fall | Ablauf | Ergebnis |
|---|---|---|
| **A** | Löschen beginnt zuerst und hält die Transaktion; Verknüpfen läuft hinein | Verbindung B blockiert und meldet dann **`DOCUMENT_FILE_NOT_FOUND`**; 0 Verknüpfungen, 0 Dateien — **keine hängende Referenz** |
| **B** | Verknüpfen beginnt zuerst und hält; Löschen läuft hinein | Löschversuch blockiert und meldet **`DOCUMENT_ALREADY_LINKED`**; 1 Verknüpfung, **Datei bleibt erhalten** |

Fall B belegt, dass der `BEFORE DELETE`-Trigger im Rennen tatsächlich greift —
die Policy allein hätte hier zum Auswertungszeitpunkt noch keine Verknüpfung
gesehen.

## Zweite Nachbesserung — Storage-API und Vorgangsschlüssel

**a) Das direkte SQL-`DELETE` war falsch.** `cleanup_my_orphan_document`
entfernte die Zeile aus `storage.objects` — das löscht nur den Katalogeintrag,
die Datei bliebe im Objektspeicher zurück. Supabase verlangt Dateioperationen
über die Storage-API. Die Funktion ist **ersatzlos entfernt**.

Neu:
- Der Client ruft `storage.from(bucket).remove([path])` auf. Nur dieser Weg
  entfernt auch das Objekt selbst.
- Die Storage-API setzt dabei ein `DELETE` auf `storage.objects` ab und wertet
  die RLS aus. Die neue Policy `employee_documents_delete_unlinked` erlaubt das
  nur im eigenen Ordner, nur aktiven Mitarbeitern und nur für unverknüpfte
  Dateien.
- Verbindlich abgesichert wird das durch den `BEFORE DELETE`-Trigger
  `storage_objects_guard_delete`, der innerhalb desselben Statements läuft —
  also unter der Zeilensperre.

**b) Die Sperre deckte nur `INSERT` auf `document_submissions` ab.** Jetzt
greift `private.lock_document_object()` auf **allen** Schreibwegen:
`INSERT` und `UPDATE OF file_path`, sowohl auf `document_submissions` als auch
auf `employee_documents`.

**c) Die fachliche Eindeutigkeit `(employee_id, start_date)` war erfunden.**
Sie hätte zwei getrennte Vorgänge mit demselben Beginndatum verschmolzen.
Ersetzt durch einen technischen Vorgangsschlüssel:
- neue Spalte `sickness_reports.client_request_id`,
- partieller eindeutiger Index `(employee_id, client_request_id)`,
- die Insert-Policy verlangt den Schlüssel für Portal-Einträge,
- der Client erzeugt ihn **einmal je Sendevorgang** und schickt ihn bei jeder
  Wiederholung unverändert mit; verworfen wird er erst nach bestätigtem Erfolg.

**Ein Konflikt gilt nur dann als Erfolg**, wenn er auf genau diesem Index
auftritt **und** der vorhandene Datensatz inhaltlich passt — Beginn, Ende,
Notiz und Dokumentverknüpfung. Ein beliebiger `23505` wird **nicht** als
Erfolg behandelt; bei abweichendem Inhalt meldet das Portal
`REQUEST_ID_CONTENT_MISMATCH` als Fehler.

## Nachbesserung nach der Prüfung

Zwei Berechtigungslücken der ersten Fassung wurden behoben:

**1. Die Storage-Policies prüften nur den Pfad gegen `auth.uid()`.** Damit
konnten auch Kunden, Disponenten ohne Mitarbeiterzuordnung und deaktivierte
Mitarbeiter in ihrem eigenen Ordner arbeiten. Neu prüft
`private.is_active_employee()` serverseitig eine vertrauenswürdige Zuordnung:
aktives Profil → aktiver, portalfreigeschalteter Mitarbeiter. Der separate
Lesezugriff aktiver Admins bleibt unverändert.

**2. `delete_own` erlaubte das Löschen sämtlicher eigener Dateien.** Die
unbegrenzte DELETE-Policy wurde entfernt. Der aktuelle Stand steht im
Abschnitt darüber: Bereinigt wird über die Storage-API, begrenzt durch
`employee_documents_delete_unlinked` und den `BEFORE DELETE`-Trigger — genau
eine Datei, nur im eigenen Ordner, nur wenn sie von keinem Datensatz
referenziert wird.

**Zum Wettlauf zwischen Verknüpfen und Löschen:** Eine reine Policy genügt
dafür nicht — sie prüft die Verknüpfung nur zum Auswertungszeitpunkt, ein
gleichzeitiges `INSERT` könnte danach committen. Deshalb sperren beide Seiten
dieselbe Zeile in `storage.objects`: Die Bereinigungsfunktion nimmt die Sperre
und prüft **danach**; der Trigger `document_submissions_lock_object` nimmt beim
Verknüpfen dieselbe Sperre und lehnt ab, wenn die Datei nicht mehr existiert
(`23503 DOCUMENT_FILE_NOT_FOUND`). Damit kann keine Seite die andere übersehen.

## Was echt getestet wurde und was simuliert ist

**Echt** heißt hier: gegen eine laufende PostgreSQL-Instanz mit den echten
Migrationen und den echten Policies. Die Rollen `anon` und `authenticated`
sowie die JWT-Ansprüche werden über `set_config` gesetzt — das ist derselbe
Mechanismus, den PostgREST verwendet. Die Policy-Ausdrücke selbst laufen also
unverändert.

**Simuliert** heißt: Im Browser werden `supabase-config.js` und
`employee-supabase.js` bzw. `supabase-auth.js` durch Stubs ersetzt. Getestet
wird damit das Verhalten der Oberfläche, nicht die Netzwerkschicht.

**Nicht getestet** ist die Supabase-Storage-API selbst. Sie ist ein eigener
Dienst und wird von der lokalen Nachbildung nicht bereitgestellt. Konkret
ungeprüft:

- ob `file_size_limit` (10 MB) und `allowed_mime_types` vom Storage-Dienst
  tatsächlich durchgesetzt werden — die Werte stehen korrekt im Bucket, ihre
  Wirkung ist lokal nicht prüfbar,
- das tatsächliche Hoch- und Herunterladen,
- `createSignedUrl` und die Gültigkeitsdauer der Adressen,
- das Verhalten bei Abbrüchen mitten im Upload.

Die clientseitige Größen- und Typprüfung in `uploadDocumentSubmission` ist
getestet — sie ist aber nur eine Vorprüfung, keine Sicherheitsgrenze. Die
verbindliche Grenze zieht der Storage-Dienst.

## 1. RLS-Tests (`supabase/tests/local/12_document_upload_test.sql`)

| Nr | Prüfung | Ergebnis |
|---|---|---|
| 1–4 | Bucket existiert, **privat**, 10485760 Byte, genau PDF/JPEG/PNG | bestanden |
| 5–6 | Vier Dokumenttypen, keine Duplikate bei wiederholtem Einspielen | bestanden |
| 7 | Upload in den **eigenen** Ordner erlaubt | ohne Fehler |
| 8 | Upload in **fremden** Ordner | `42501 new row violates row-level security policy` |
| 9 | Eigene Datei für den Besitzer sichtbar | 1 Zeile |
| 10 | **Anderer Mitarbeiter** sieht sie nicht | 0 Zeilen |
| 11 | **Kunde** sieht sie nicht | 0 Zeilen |
| 12 | **Anonym** | `42501 permission denied for table objects` |
| 13 | **Aktiver Admin** sieht sie | 1 Zeile |
| 14 | **Inaktives Admin-Profil** sieht sie nicht | 0 Zeilen |
| 15 | Überschreiben | `42501` — keine UPDATE-Policy vorhanden |
| 16 | Einreichung mit eigenem Pfad, ID kommt zurück | bestanden |
| 17 | **Fremder Dateipfad** im eigenen Datensatz | `42501` |
| 18 | Krankmeldung mit **eigenem** Anhang | ohne Fehler |
| 19 | Krankmeldung mit **fremdem** Anhang | `42501` |
| 20 | Anhang und Krankmeldung gehören demselben Mitarbeiter | 1 Zeile |
| 21 | **Fremde** Datei löschen | 0 Zeilen |
| 22 | **Eigene** verwaiste Datei bereinigen | 1 Zeile |
| 23 | Admin sieht den Dokumenteingang inkl. Namen | 2 Zeilen |
| 24 | Kunde sieht keine Einreichungen | 0 Zeilen |
| **25** | **Kunde lädt in den EIGENEN Ordner** | `42501 new row violates row-level security policy` |
| **26** | **Disponent ohne Mitarbeiterberechtigung** | `42501` |
| **27** | **Inaktiver Mitarbeiter lädt hoch** | `42501` |
| **28** | **Inaktiver Mitarbeiter liest eigene Datei** | 0 Zeilen |
| **29** | **Inaktiver Mitarbeiter bereinigt** | `42501 Not authorized` |
| 30 | Direktes `DELETE` auf `storage.objects` | `42501 permission denied for table objects` |
| 31 | Eigener **unverknüpfter** Upload wird bereinigt | `true` |
| 32 | Datei ist danach wirklich entfernt | 0 Zeilen |
| 33 | Einreichung mit vorhandener Datei erlaubt | ohne Fehler |
| **34** | **Bereits eingereichte Datei** kann nicht bereinigt werden | `42501 DOCUMENT_ALREADY_LINKED` |
| **35** | **Im geprüften Bestand referenzierte Datei** geschützt | `42501 DOCUMENT_ALREADY_LINKED` |
| 36 | Fremder Pfad über die Funktion | `42501 Not authorized` |
| 37 | Einreichung ohne vorhandene Datei (Wettlauf-Gegenstück) | `23503 DOCUMENT_FILE_NOT_FOUND` |
| 38 | Erste Krankmeldung wird gespeichert | ohne Fehler |
| **39** | **Wiederholung nach verlorener Antwort** | `23505 duplicate key value violates unique constraint "uq_sickness_reports_employee_start"` |
| **40** | **Genau EINE Krankmeldung in der Datenbank** | 1 Zeile |

## 2. Browsertests Portal (Auswahl der neuen Fälle)

| Nr | Test | Ergebnis |
|---|---|---|
| U1 | Dokumenttypen kommen aus der Datenbank, verstecktes Feld trägt die **ID** | bestanden |
| U2 | Upload, dann Datensatz — Erfolg erst danach | bestanden |
| U3 | Datei > 10 MB abgelehnt | bestanden |
| U4 | Unerlaubter Dateityp abgelehnt | bestanden |
| U5 | **Teilfehler**: Datei übertragen, Datensatz gescheitert → kein Erfolg, Datei entfernt | bestanden |
| U6 | Teilfehler ohne Bereinigung verweist an die Zentrale | bestanden |
| U7 | Ohne Datei wird gar nicht erst hochgeladen | bestanden |
| U8 | Öffnen läuft über eine signierte Adresse, keine öffentliche URL | bestanden |
| U9 | Einreichungen nach dem Neuladen weiterhin sichtbar | bestanden |
| K1 | Krankenschein wird als Anhang verknüpft (`documentSubmissionId` gesetzt) | bestanden |
| K2 | Ohne Anhang wird das ausdrücklich gesagt | bestanden |
| K3 | **Teilfehler beim Anhang → gar keine Krankmeldung angelegt** | bestanden |
| K4 | Wiederholung: **1** Upload, **1** gespeicherte Krankmeldung | bestanden |
| K5 | Verlorene Antwort → kein zweiter Datensatz, Erfolg wird gemeldet | bestanden |

### Zur Wiederholung nach unklarem Netzwerkfehler

Der Browsertest **K5** zeigt nur, dass die Oberfläche richtig reagiert. Er
**beweist nicht**, dass kein zweiter Datensatz entsteht — das entscheidet die
Datenbank. Der eigentliche Nachweis sind die SQL-Tests **39 und 40**: Der
zweite identische `INSERT` scheitert an
`uq_sickness_reports_employee_start` mit `23505`, und danach liegt genau
**eine** Zeile in der Tabelle.

Der Client erkennt `23505`, lädt den vorhandenen Datensatz und meldet Erfolg —
statt einen zweiten anzulegen oder fälschlich einen Fehler zu zeigen.

Fachliche Festlegung dabei: **je Mitarbeiter und Beginndatum genau eine
Krankmeldung.** Das ist eine bewusste Einschränkung. Soll ein Mitarbeiter für
denselben Beginntag mehrfach melden können, müsste die Eindeutigkeit anders
geschnitten werden — etwa über einen vom Client mitgegebenen Vorgangsschlüssel.

## 3. Browsertests Admin

| Nr | Test | Ergebnis |
|---|---|---|
| D1 | Nachweise mit Name, Art, Datei, Datum, Status, Notiz | bestanden |
| D2 | Öffnen über signierte URL, genau der richtige Pfad wird signiert | bestanden |
| D3 | Fehlende Dateiberechtigung → Hinweis statt Absturz | bestanden |
| D4 | Ohne Einreichungen klare Meldung | bestanden |
| D5 | Fehlende Leseberechtigung ehrlich gemeldet, keine erfundenen Zeilen | bestanden |
| D6 | Notiz und Dateiname werden escaped | bestanden |
| A1–A4 | Krankmeldungsansicht (aus dem Vorgängerbranch) | bestanden |

## 4. Zwei echte Fehler, die die Tests gefunden haben

**a) `visibleLabel()` verfälschte Datenbank-IDs.**
Die Funktion ist eine Umlaut-Transliteration für Demo-Texte (`ue` → `ü`) und
**kein** HTML-Escaper. Beim Rendern der Dokumenttypen wurde aus der ID
`t-fuehrerschein` ein `t-führerschein` — der Upload hätte einen nicht
existierenden Typ referenziert. Zusätzlich bot sie keinerlei Schutz vor
Markup aus der Datenbank.
Behoben durch ein echtes `escHtml()`; die neue, datenbankgestützte Ausgabe
verwendet ausschließlich dieses. Der Fehler wäre ohne Test nicht aufgefallen,
weil er nur bei Umlaut-Ersatzschreibweisen auftritt.

**b) Der Popup-Blocker verwarf das Öffnen von Dateien.**
`window.open()` wurde erst nach dem `await` auf die signierte URL aufgerufen —
außerhalb des Klick-Kontexts und damit blockiert. Der „Ansehen"-Knopf hätte in
echten Browsern nichts getan. Behoben: Das Fenster wird synchron im Klick
geöffnet und die signierte Adresse nachgereicht; scheitert das Signieren, wird
das Fenster geschlossen und ein Hinweis gezeigt. Gilt jetzt gleichermaßen für
Portal und Adminbereich.

Zusätzlich zwei Fehler **im Testaufbau** (nicht im Produkt): ein zu früher
Rollenwechsel vor dem Lesen der Testidentitäten, und eine Stub-URL, die auf die
Portalseite selbst zeigte, wodurch dort die App lief und weiterleitete.

## 5. Verbleibende Grenzen

- **Die Migration wurde nicht in Produktion ausgeführt.** Sie lief ausschließlich
  gegen die lokale Instanz.
- **Die Storage-API ist ungetestet** (siehe oben). Insbesondere die Durchsetzung
  von Größen- und Typgrenzen muss nach dem Einspielen einmal praktisch geprüft
  werden — mit einer eigens erzeugten Testdatei, nicht mit echten Nachweisen.
- **Kein PostgREST**: Fehlerübersetzung (SQLSTATE → HTTP) und das Verhalten von
  eingebetteten Joins sind nicht abgedeckt.
- **Kein GoTrue**: JWT-Ansprüche werden simuliert.
- **Verwaiste Dateien**: Bereinigt wird nur der unmittelbare Fall „Upload
  erfolgreich, Datensatz gescheitert", und zwar über die Storage-API
  (`remove`). Bricht der Browser zwischen beiden Schritten
  ab, bleibt eine Datei im eigenen Ordner liegen. Ein regelmäßiger Aufräumlauf
  bräuchte weiter reichende Rechte und ist bewusst **nicht** Teil dieses
  Schritts.
- **Die entscheidende offene Grenze: Das tatsächliche Entfernen der Datei aus
  dem Objektspeicher ist nicht geprüft.** Die lokale Nachbildung enthält nur
  `storage.objects` als Tabelle — keinen Storage-Dienst und keinen
  Objektspeicher. Nachgewiesen ist ausschließlich die Datenbankseite: wer
  löschen darf, wann das gefiltert wird und dass verknüpfte Dateien erhalten
  bleiben. **Dass `remove()` auch die Datei selbst löscht, ist unbelegt.**

  Konkret fehlt dafür: ein laufender `storage-api`-Dienst mit Objektspeicher.
  Der bräuchte entweder Docker plus Supabase-CLI (beides ist auf diesem Rechner
  nicht installiert und Docker benötigt Adminrechte) oder ein separates
  Supabase-Testprojekt, das wir bewusst zurückgestellt haben. Ohne eines von
  beiden lässt sich dieser Punkt nicht abschließen.
- **Der Nebenläufigkeitstest deckt die Datenbankseite ab, nicht den
  Storage-Dienst.** Ob die Storage-API bei einem abgelehnten `DELETE` das
  Objekt unangetastet lässt, ist damit ebenfalls nicht belegt.
- **Der eindeutige Index legt sich nur an, wenn keine Duplikate vorhanden
  sind.** Da er partiell auf `client_request_id is not null` wirkt und die
  Spalte neu ist, kann er beim Einspielen nicht an Altdaten scheitern.
- **Disponenten sehen keine Nachweise.** `document_submissions_select_admin` und
  die Storage-Policy erlauben nur `profiles.role = 'admin'`. Das entspricht dem
  bestehenden Schema und wurde nicht umgangen.
- **Kein Freigabe- oder Prüfprozess.** `status` bleibt bei `submitted`;
  `reviewed_at`/`reviewed_by` werden nicht gesetzt.
- **Kein Service-Role-Key im Browser.** Es wird durchgehend derselbe Client mit
  dem Publishable Key verwendet; alle Grenzen ziehen RLS und die
  Storage-Policies.
