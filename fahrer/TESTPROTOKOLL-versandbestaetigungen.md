# Testprotokoll — Versandbestätigungen im Mitarbeiterportal

Stand 10.09.2026, Branch `fix/mitarbeiterportal-versandbestaetigungen`.

## Was geändert wurde

Grundregel im Code: **Eine Speicherung im Browser ist keine Übermittlung.**
Erfolg wird ausschließlich gemeldet, wenn das Backend einen gespeicherten
Datensatz mit ID bestätigt hat.

| Vorgang | Vorher | Nachher |
|---|---|---|
| Urlaubsantrag **mit** Supabase | „✓ Urlaubsantrag wurde gesendet." bereits bei `result.ok` | Erfolg erst bei `result.ok` **und** `result.data.id`; Text „Urlaubsantrag wurde übermittelt und liegt der Zentrale vor." |
| Urlaubsantrag **ohne** Supabase | „✓ Urlaubsantrag wurde gesendet." | „Noch nicht übermittelt. Bitte melde dich direkt bei der Zentrale." |
| Krankmeldung | „✓ Krankmeldung wurde gesendet." | „Noch nicht übermittelt. Bitte melde dich direkt bei der Zentrale." |
| Dokument | „✓ Dokument wurde gesendet." | „Noch nicht übermittelt. Bitte melde dich direkt bei der Zentrale." |

Zusätzlich: dauerhafte Warnhinweise über den Formularen für Krankmeldung und
Dokumente, Kennzeichnung `Nicht übermittelt` an den Listeneinträgen,
Beschriftungen ohne Versandversprechen.

Bestehende lokale Einträge bleiben erhalten — es wird weiterhin gespeichert,
nur nicht mehr als gesendet ausgegeben.

## Was statisch geprüft wurde

Ohne JavaScript-Laufzeitumgebung auf diesem Rechner (kein Node, Deno oder Bun,
keine Browser-Automatisierung) ließ sich der Code **nicht ausführen**. Geprüft
wurde deshalb:

- Alle im JavaScript verwendeten Selektoren existieren im HTML
  (`data-portal-vac-feedback`, `data-portal-absence-feedback`,
  `data-portal-doc-feedback`, `data-portal-modal*`).
- Alle verwendeten CSS-Klassen existieren in `app.css`
  (`.section-feedback`, `.is-error`, `.is-warning`, `.status-pill`, `.demo-note`).
- Klammer- und Backtick-Bilanz in `mitarbeiter.js` ausgeglichen
  (`{}` 339/339, `()` 768/768, Backticks gerade).
- Keine verwaisten Referenzen auf die entfernte lokale `feedback`-Variable.
- Kein „gesendet" mehr in ausgegebenem Text; verbleibende Treffer stehen
  ausschließlich in Kommentaren.

## Manuell zu prüfen — sechs Fälle

Portal über einen lokalen Webserver öffnen (`fahrer/index.html` über `http://`,
nicht per Doppelklick — Supabase-Auth funktioniert nicht über `file://`).

### Erfolgsfälle

**F1 — Urlaubsantrag mit funktionierender Supabase-Anbindung**
1. Als Mitarbeiter anmelden, Bereich „Urlaub" öffnen.
2. Gültigen Zeitraum wählen, absenden.
3. **Erwartet:** grüne Meldung „✓ Urlaubsantrag wurde übermittelt und liegt der
   Zentrale vor.", Modal „Urlaubsantrag übermittelt", der Antrag erscheint in
   der Liste **ohne** Kennzeichnung „Nicht übermittelt".
4. **Gegenprobe:** Eintrag muss in `public.vacation_requests` liegen.

**F2 — Krankmeldung**
1. Bereich „Krankmeldung" öffnen.
2. **Erwartet schon vor dem Absenden:** oranger Dauerhinweis „Krankmeldungen
   werden derzeit nicht automatisch übermittelt …".
3. Zeitraum wählen, absenden.
4. **Erwartet:** orange Meldung „Noch nicht übermittelt. Bitte melde dich direkt
   bei der Zentrale.", Modal „Noch nicht übermittelt", Eintrag in der Liste mit
   Kennzeichnung „Nicht übermittelt". **Kein Häkchen, kein „gesendet".**

**F3 — Dokument**
1. Bereich „Dokument" öffnen, Dauerhinweis muss sichtbar sein.
2. Dokumentart wählen, Datei auswählen, absenden.
3. **Erwartet:** gleiche orange Meldung wie F2, Eintrag mit Kennzeichnung
   „Nicht übermittelt".

### Fehlerfälle

**F4 — Urlaubsantrag, Backend lehnt ab**
Simulation: in der Browserkonsole vor dem Absenden
```js
window.EmployeeSupabase.createVacationRequest = async () => ({ ok: false, error: 'TEST' });
```
**Erwartet:** rote Meldung „Urlaubsantrag konnte nicht übermittelt werden. Bitte
versuche es noch einmal oder melde dich direkt bei der Zentrale.", **kein** Modal,
**kein** Erfolgstext.

**F5 — Urlaubsantrag, Backend meldet OK ohne Datensatz**
```js
window.EmployeeSupabase.createVacationRequest = async () => ({ ok: true, data: {} });
```
**Erwartet:** dieselbe rote Fehlermeldung. Dieser Fall wurde vorher
fälschlich als Erfolg gemeldet.

**F6 — Urlaubsantrag, Netzwerkfehler**
```js
window.EmployeeSupabase.createVacationRequest = async () => { throw new Error('Netzwerk'); };
```
**Erwartet:** dieselbe rote Fehlermeldung, Eintrag im Konsolenprotokoll,
kein Absturz, Formular bleibt ausgefüllt.

### Zusätzlich

**F7 — Ungültiger Zeitraum:** Enddatum vor Startdatum → rote Meldung
„Bitte wähle einen gültigen Zeitraum.", kein Speichern.

**F8 — Bestehende Einträge:** Vor dem Update erfasste lokale Krankmeldungen und
Dokumente müssen nach dem Update weiterhin in den Listen erscheinen.

## Was weiterhin fehlt

- **Krankmeldungen** erreichen `public.sickness_reports` nicht. Die Tabelle und
  die passende Policy `sickness_reports_employee_insert` existieren bereits.
- **Dokumente** erreichen `public.document_submissions` nicht, und es gibt
  keinen Storage-Bucket. Hochgeladen wird nichts — gespeichert wird nur der
  Dateiname.
- Die Datei aus dem Krankmeldungsformular (`name="demoFile"`) wird vom Handler
  gar nicht erst ausgelesen.
- **Urlaub zurückziehen** funktioniert nur im lokalen Zweig. In `002` gibt es
  keine UPDATE-Policy für Mitarbeiter auf `vacation_requests`.
- Die Listen für Krankmeldungen und Dokumente greifen auf `emp()` aus dem
  lokalen Datenbestand zu. Im Supabase-Modus ist `state.employeeId` eine UUID,
  zu der es dort keinen Eintrag gibt — die Listen bleiben dann leer.
