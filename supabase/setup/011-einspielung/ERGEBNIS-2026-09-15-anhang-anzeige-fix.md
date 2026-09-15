# Ergebnis — Anzeigefehler „Ohne Anhang" behoben und manuell geprueft

Stand 15.09.2026. Anschluss an
`ERGEBNIS-2026-09-14-einspielung-abgeschlossen.md`: der dort angekuendigte
gezielte Funktionstest im Originalprojekt fand am 14.09.2026 statt und deckte
einen Anzeigefehler im Mitarbeiterportal auf.

## Beobachtung im Originalprojekt

Am 14.09.2026 wurde im Krankmeldungsformular vor dem Absenden nachweislich
eine Bildvorschau samt Dateiname angezeigt
(`TEST-Portal-14-09-2026.png.png`, Zeitraum 14.09.2026–14.09.2026). Nach dem
Absenden zeigte die Liste der Krankmeldungen im Portal trotzdem
„Ohne Anhang".

Zuvor waren bereits zwei Testmeldungen bewusst ohne Datei gesendet worden.

## Ursache

Reine Anzeigeursache, **kein** Upload- und **kein** Verknuepfungsfehler:

- `employee-supabase.js`, `createSicknessReport()`: uebertraegt
  `document_submission_id` korrekt in der Einfuegung (Zeile ~433). Der
  Docstring darueber („Dateianhaenge werden bewusst NICHT uebertragen") ist
  aus einer frueheren Version stehen geblieben und war zum Zeitpunkt des
  Fehlers bereits falsch — er beschrieb nicht mehr den tatsaechlichen Code.
- `mitarbeiter.js`, `renderAbsences()` (Zeile 528, vor dem Fix): das Badge
  `„Ohne Anhang"` war **fest verdrahtet** und wertete `document_submission_id`
  des geladenen Datensatzes nicht aus. Jede Krankmeldung erschien unabhaengig
  vom tatsaechlichen Datenbankwert mit diesem Text.
- Im `admin/`-Bereich wird `document_submission_id` bei Krankmeldungen
  aktuell an keiner Stelle ausgewertet; das Fahrerportal war die einzige
  Stelle mit einer (fehlerhaften) Anzeige dazu.

## Fix

`fahrer/mitarbeiter.js`, `renderAbsences()`: Badge haengt jetzt vom
tatsaechlichen Wert ab —

```js
${r.document_submission_id
  ? '<span class="status-pill info">Mit Anhang</span>'
  : '<span class="status-pill neutral">Ohne Anhang</span>'}
```

## Pruefung

- Syntaxpruefung der geaenderten Datei manuell durchgefuehrt (kein
  Node/Playwright-Lauf; kein Node im Bash-PATH dieser Sitzung verfuegbar).
- **Manuelle Gegenpruefung im Portal nach Neuladen, gegen das
  Originalprojekt:** von den drei vorhandenen Test-Krankmeldungen zeigt das
  Portal jetzt korrekt einmal „Ohne Anhang" und zweimal „Mit Anhang" —
  passend zu den Datenbankwerten. Damit ist bestaetigt: Fuer den
  14.09.2026er-Datensatz mit sichtbarer Vorschau vor dem Absenden war
  `document_submission_id` tatsaechlich gesetzt; der Fehler lag ausschliesslich
  in der Anzeige, nicht im Upload oder in der Verknuepfung.
- Keine automatisierte Testsuite erneut vollstaendig durchlaufen (nicht
  angefordert). Kein neuer Testdatensatz im Originalprojekt erzeugt, nichts
  geloescht.

## Was das ausdruecklich nicht beweist

- Kein Beleg, dass der Upload-Schritt (`uploadDocumentSubmission`) in jedem
  Fall zuverlaessig ist — nur, dass er bei den drei vorhandenen Testfaellen
  zum erwarteten Datenbankstand gefuehrt hat.
- Keine Aussage zu den lokalen Altbestaenden auf einzelnen Geraeten; die
  bleiben unveraendert und werden weiterhin gesondert (neutraler Hinweis,
  keine Inhalte) angezeigt.
