# Testprotokoll — Versandbestätigungen im Mitarbeiterportal

Stand 10.09.2026, Branch `fix/mitarbeiterportal-versandbestaetigungen`.

## Ergebnis

| Prüfebene | Ergebnis |
|---|---|
| Browsertests (Playwright, echter Chrome) | **14 von 14 bestanden** |
| Rückgabevertrag des Urlaubsantrags (PostgreSQL, RLS) | **8 von 8 bestanden** |

Beide Läufe wurden tatsächlich ausgeführt, nicht nur beschrieben.

## Was geändert wurde

Grundregel im Code: **Eine Speicherung im Browser ist keine Übermittlung.**
Erfolg wird ausschließlich gemeldet, wenn das Backend einen gespeicherten
Datensatz mit ID bestätigt hat.

| Vorgang | Vorher | Nachher |
|---|---|---|
| Urlaubsantrag **mit** Supabase | „✓ Urlaubsantrag wurde gesendet." bereits bei `result.ok` | Erfolg erst bei `result.ok` **und** `result.data.id` |
| Urlaubsantrag **ohne** Supabase | „✓ Urlaubsantrag wurde gesendet." | „Noch nicht übermittelt. Bitte melde dich direkt bei der Zentrale." |
| Krankmeldung | „✓ Krankmeldung wurde gesendet." | dieselbe Warnung |
| Dokument | „✓ Dokument wurde gesendet." | dieselbe Warnung |

Dazu: dauerhafte Warnhinweise über den Formularen für Krankmeldung und
Dokumente, Kennzeichnung `Nicht übermittelt` an lokalen Listeneinträgen,
Beschriftungen ohne Versandversprechen.

Bestehende lokale Einträge bleiben erhalten — es wird weiterhin gespeichert,
nur nicht mehr als gesendet ausgegeben.

## 1. Rückgabevertrag des Urlaubsantrags

Zuerst die Frage, ob die verschärfte Prüfung `result.data.id` korrekt
gespeicherte Anträge fälschlich ablehnen kann.

`employee-supabase.js` setzt
`.insert(payload).select("id, …").single()` ab. PostgREST übersetzt das nach
`INSERT … RETURNING`. Fällt das `RETURNING` unter RLS leer aus, meldet
`.single()` einen Fehler — ein gespeicherter Antrag würde dann als Fehlschlag
angezeigt. Geprüft in der lokalen PostgreSQL-Instanz mit den Policies aus
`002_rls_policies.sql`
(`supabase/tests/local/10_vacation_return_contract_test.sql`):

| Nr | Prüfung | Ergebnis |
|---|---|---|
| 0 | Mitarbeiterprofil hat `employee_id` | bestanden |
| 1 | `INSERT` als Mitarbeiter erlaubt | ohne Fehler |
| 2 | `RETURNING` liefert eine `id` (entspricht `result.data.id`) | bestanden |
| 3 | `RETURNING` liefert die eigene `employee_id` | bestanden |
| 4 | `RETURNING` liefert `status = requested` | bestanden |
| 5 | Mitarbeiter kann den eigenen Antrag lesen | 1 Zeile |
| 6 | Kunde sieht den fremden Antrag nicht | 0 Zeilen |
| 7 | Zurücknahme durch Mitarbeiter wird verhindert | 0 Zeilen geändert |

**Ergebnis: Die neue Prüfung lehnt korrekt gespeicherte Anträge nicht ab.**
`ok: true` impliziert einen Datensatz mit `id`.

Nebenbefund aus Nr. 7: Ein Mitarbeiter kann seinen Antrag serverseitig nicht
zurückziehen — das `UPDATE` ändert **0 Zeilen und wirft keinen Fehler**. Ein
künftiger Zurückziehen-Knopf gegen Supabase müsste also die betroffene
Zeilenzahl prüfen, sonst entstünde genau wieder eine falsche Erfolgsmeldung.

## 2. Browsertests

Playwright 1.63 mit dem auf dem Rechner vorhandenen Chrome, statischer
Testserver auf `127.0.0.1:8787`. `supabase-config.js` und
`employee-supabase.js` werden pro Test durch Stubs ersetzt — **es wird nie
eine Verbindung zu Supabase aufgebaut**, es entstehen keine produktiven
Anträge und keine hochgeladenen Dateien.

| Nr | Test | Ergebnis |
|---|---|---|
| T1 | Urlaubsantrag mit bestätigtem Datensatz meldet Erfolg, Liste ohne „Nicht übermittelt" | bestanden |
| T2 | Backend-Fehler (`ok: false`) → rote Meldung, kein Modal, kein „✓" | bestanden |
| T3 | `ok: true` ohne Datensatz → Fehler statt Erfolg | bestanden |
| T3b | `ok: true` mit `data: null` → Fehler statt Erfolg | bestanden |
| T4 | Netzwerkfehler → Fehlermeldung, keine unbehandelten Seitenfehler, Eingaben bleiben erhalten | bestanden |
| T5 | Ungültiger Zeitraum → Backend wird gar nicht erst aufgerufen | bestanden |
| T6 | Krankmeldung: Dauerhinweis vor dem Absenden, danach Warnung, nie „gesendet" | bestanden |
| T7 | Dokument: dasselbe | bestanden |
| T8 | Warnung der Krankmeldung bleibt nach späterem Urlaubserfolg unverändert stehen | bestanden |
| T9 | Fehlerklasse verschwindet beim erfolgreichen zweiten Versuch | bestanden |
| T10 | Urlaubsantrag ohne Backend meldet „Noch nicht übermittelt" | bestanden |
| T11 | Lokale Einträge überleben den Reload und bleiben gekennzeichnet | bestanden |
| T12 | Zurückziehen bestätigt keine Serveränderung | bestanden |
| T13 | Kein Text „gesendet" in den Bereichen Krankmeldung und Dokument | bestanden |

### Im Testaufbau gefundene und behobene Fehler

Beide betrafen den Test, nicht das Produkt:

1. **Rollenwechsel zu früh** (SQL-Test Nr. 6): Die Kunden-UUID wurde aus dem
   Schema `tg_test` gelesen, *nachdem* die Rolle bereits auf `authenticated`
   gewechselt hatte — diese Rolle hat dort keine Rechte. Der Test meldete einen
   Fehler statt „0 Zeilen". Behoben, indem alle Identitäten vor dem ersten
   Rollenwechsel gelesen werden.
2. **Drawer-Overlay fing Klicks ab** (T8, T13): Beim Wechsel zwischen
   Bereichen liegt ein Overlay über den Kacheln. Der Backdrop selbst ist nicht
   anklickbar, weil der Drawer davor liegt. Behoben, indem der sichtbare
   Schließen-Knopf des offenen Bereichs verwendet wird — so, wie es auch eine
   Person tun würde.

## 3. Testumgebung ausführen

```powershell
# einmalig: portable Node und Playwright, ohne Browser-Download
#   https://nodejs.org/dist/v24.21.0/node-v24.21.0-win-x64.zip
#   npm install @playwright/test   (PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1)
#   node_modules als Junction nach fahrer/tests/ verlinken

cd fahrer/tests
npx playwright test --config playwright.config.mjs
```

Der Testserver bindet ausschließlich an `127.0.0.1`, legt keinen
Windows-Dienst an und benötigt keine Firewall-Freigabe.

## 4. Was weiterhin nicht übertragen wird

- **Krankmeldungen** verlassen das Gerät nicht. Das Portal hat keinen
  Schreibzugriff auf `public.sickness_reports`.
- **Dokumente** verlassen das Gerät nicht. Es gibt im Client keinen
  Upload-Aufruf und keinen Schreibzugriff auf `public.document_submissions`;
  gespeichert wird nur der Dateiname.
  *Hinweis zur Genauigkeit:* Dass im Projektcode kein Storage-Aufruf vorkommt,
  belegt **nicht**, dass in Supabase kein Bucket existiert. Belegt ist nur,
  dass dieses Portal keinen verwendet.
- Die Datei aus dem **Krankmeldungsformular** (`name="demoFile"`) wird vom
  Handler nicht ausgelesen.
- **Urlaub zurückziehen** wirkt nur lokal; serverseitig ändert das `UPDATE`
  null Zeilen (siehe Abschnitt 1, Nr. 7).
- Die Listen für Krankmeldungen und Dokumente greifen auf `emp()` aus dem
  lokalen Datenbestand zu. Im Supabase-Modus ist `state.employeeId` eine UUID,
  zu der es dort keinen Eintrag gibt — die Listen bleiben dann leer.
