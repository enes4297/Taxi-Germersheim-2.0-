# Testprotokoll — Privater Dokumentenupload

Stand 10.09.2026, Branch `feature/mitarbeiter-dokumentenupload`.

## Status in einem Satz

> **Lokal getestet. Die echte Storage-API von Supabase wurde nicht getestet —
> es wurde nichts in Produktion ausgeführt und keine Datei hochgeladen.**

## Ergebnis

| Prüfebene | Ergebnis | Art |
|---|---|---|
| RLS- und Policy-Tests, lokale PostgreSQL-Instanz | **24 von 24 bestanden** | echt, gegen PostgreSQL |
| Browsertests Portal | **32 von 32 bestanden** | **simuliert**, Backend ersetzt |
| Browsertests Admin (Krankmeldungen + Dokumenteingang) | **10 von 10 bestanden** | **simuliert**, Backend ersetzt |
| Echte Storage-API (Upload, Download, signierte URLs) | **nicht getestet** | — |

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
  erfolgreich, Datensatz gescheitert". Bricht der Browser zwischen beiden
  Schritten ab, bleibt eine Datei im eigenen Ordner liegen. Ein regelmäßiger
  Aufräumlauf bräuchte weiter reichende Rechte und ist bewusst **nicht** Teil
  dieses Schritts.
- **Disponenten sehen keine Nachweise.** `document_submissions_select_admin` und
  die Storage-Policy erlauben nur `profiles.role = 'admin'`. Das entspricht dem
  bestehenden Schema und wurde nicht umgangen.
- **Kein Freigabe- oder Prüfprozess.** `status` bleibt bei `submitted`;
  `reviewed_at`/`reviewed_by` werden nicht gesetzt.
- **Kein Service-Role-Key im Browser.** Es wird durchgehend derselbe Client mit
  dem Publishable Key verwendet; alle Grenzen ziehen RLS und die
  Storage-Policies.
