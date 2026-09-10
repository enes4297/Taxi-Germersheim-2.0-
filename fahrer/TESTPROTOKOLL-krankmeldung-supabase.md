# Testprotokoll — Krankmeldung nach Supabase

Stand 10.09.2026, Branch `feature/mitarbeiter-krankmeldung-supabase`,
am 10.09.2026 nach `dev` gemergt.

## Status in einem Satz

> **Lokal getestet — die echte Übertragung nach Supabase ist noch nicht
> praktisch bestätigt.**

Alle Nachweise unten stammen aus einer lokalen PostgreSQL-Instanz und aus
Browsertests mit ersetztem Backend. Gegen die produktive Supabase-Instanz
wurde **keine** Krankmeldung gesendet, **kein** Datensatz angelegt und
**keine** Abfrage ausgeführt. Bevor das Portal produktiv genutzt wird, muss
eine echte Übertragung einmal praktisch überprüft werden — sinnvollerweise mit
einem eigens dafür angelegten Testkonto, nicht mit produktiven Personendaten.

## Ergebnis

| Prüfebene | Ergebnis |
|---|---|
| RLS-Tests gegen lokale PostgreSQL-Instanz | **15 von 15 bestanden** |
| Browsertests Portal (Playwright, echter Chrome) | **21 von 21 bestanden** |
| Browsertests Admin-Ansicht | **4 von 4 bestanden** |

Alles tatsächlich ausgeführt. **Keine produktive Datenbankänderung, keine
produktiven Testdaten.**

## Schema — keine Migration nötig

`public.sickness_reports` existiert bereits vollständig (`001_schema.sql`) und
hat die passenden Policies (`002_rls_policies.sql`). Verwendete Felder:

| Feld | Belegung |
|---|---|
| `employee_id` | aus dem Profil des angemeldeten Nutzers, **nicht** aus dem Formular |
| `start_date` | „Krank ab" |
| `expected_end_date` | „Voraussichtlich bis", optional |
| `note` | freiwillige Notiz |
| `submission_source` | `Mitarbeiterportal` |
| `document_submission_id` | **immer `null`** — es wird kein Anhang übertragen |
| `status` | `submitted` (von der Policy erzwungen) |

Es wurden **keine** Felder für Diagnosen oder Gesundheitsangaben eingeführt.
Das Notizfeld trägt jetzt den Hinweis „Bitte keine Diagnosen oder
medizinischen Angaben eintragen."

## 1. RLS-Tests (`supabase/tests/local/11_sickness_reports_test.sql`)

| Nr | Prüfung | Ergebnis |
|---|---|---|
| 1 | Mitarbeiter darf speichern | ohne Fehler |
| 2 | `RETURNING` liefert `id` | `6cda6062-…` |
| 3 | `employee_id` stammt vom angemeldeten Nutzer | bestanden |
| 4 | `status = submitted` | bestanden |
| 5 | kein Dateianhang verknüpft | `null` |
| 6 | Quelle = `Mitarbeiterportal` | bestanden |
| 7 | Meldung für **fremden** Mitarbeiter abgelehnt | `42501 new row violates row-level security policy` |
| 8 | vorgetäuschter Status `accepted` abgelehnt | `42501` |
| 9 | Mitarbeiter lädt die eigene Meldung erneut | 1 Zeile |
| 10 | **anderer Mitarbeiter** sieht sie nicht | 0 Zeilen |
| 11 | **Kunde** sieht sie nicht | 0 Zeilen |
| 12 | **anonym** wird abgewiesen | `42501 permission denied for table` |
| 13 | **Admin** sieht die eingegangene Meldung | 1 Zeile |
| 14 | Admin-Ansicht kann den Mitarbeiternamen mitlesen (Join) | 1 Zeile |
| 15 | Mitarbeiter kann den Status nicht ändern | 0 Zeilen geändert |

## 2. Browsertests Portal

Neu bzw. geändert gegenüber dem Vorgängerbranch:

| Nr | Test | Ergebnis |
|---|---|---|
| T6 | Krankmeldung wird übermittelt, Erfolg erst mit ID; `employeeId` wird **nicht** aus dem Formular gesendet; Liste zeigt „Übermittelt" + „Ohne Anhang" | bestanden |
| T6b | Backend-Fehler → kein Erfolg, Eingaben bleiben erhalten | bestanden |
| T6c | `ok` ohne Datensatz → Fehler statt Erfolg | bestanden |
| T6d | Netzwerkfehler → Fehler, keine unbehandelten Seitenfehler, Absenden wieder möglich | bestanden |
| T6e | Dateifeld **deaktiviert**, Beschriftung und Hinweis „Dateianhang noch nicht verfügbar" | bestanden |
| T6f | Meldung erscheint nach dem **Neuladen** weiterhin | bestanden |
| T6g | Ohne Backend: „Noch nicht übermittelt …" | bestanden |
| T8 | Fehlermeldung der Krankmeldung wird durch späteren Urlaubserfolg **nicht** überschrieben | bestanden |
| T14 | Lokale Altbestände werden nicht als übermittelt ausgegeben und nicht nachträglich übertragen | bestanden |

Die übrigen zwölf Tests aus dem Vorgängerbranch laufen unverändert weiter.

## 3. Browsertests Admin-Ansicht

| Nr | Test | Ergebnis |
|---|---|---|
| A1 | Admin sieht Name, Zeitraum, Status, Eingangsweg, Notiz und „Nicht übermittelt" beim Nachweis | bestanden |
| A2 | Ohne Einträge klare Meldung statt leerer Tabelle | bestanden |
| A3 | Ohne Berechtigung ehrliche Fehlermeldung, **keine erfundenen Zeilen** | bestanden |
| A4 | Notiztext wird escaped ausgegeben, kein Markup ausgeführt | bestanden |

## Im Test gefundener und behobener Fehler

**Lokale Altbestände verschwanden im Supabase-Modus stillschweigend.**
`renderAbsences` filterte über `emp()`; im Supabase-Modus ist `state.employeeId`
eine UUID, zu der es im lokalen Bestand keinen Eintrag gibt — die Liste war
leer, obwohl Daten vorhanden waren.

Inhalte einfach anzuzeigen wäre riskant: Ein lokaler Altbestand lässt sich
keinem angemeldeten Konto sicher zuordnen, und ein Gerät kann geteilt sein.
Umgesetzt ist deshalb ein neutraler Hinweis mit Anzahl, ohne Inhalte:

> Auf diesem Gerät liegen noch N ältere, nicht übermittelte Einträge aus einer
> früheren Version. Sie werden nicht nachträglich übertragen – bitte bei Bedarf
> direkt bei der Zentrale melden.

Der Test prüft zusätzlich, dass die Altdaten unverändert im Browserspeicher
liegen bleiben und dass genau **ein** Datensatz übertragen wurde.

## Zugriffsrechte — wichtiger Hinweis

Die Policy `sickness_reports_select_admin` erlaubt das Lesen ausschließlich
Konten mit `profiles.role = 'admin'`. **Disponenten sehen die Liste nicht.**
Das entspricht dem bestehenden Schema und wurde bewusst nicht umgangen. Wenn
die Disposition Zugriff braucht, wäre das eine eigene Policy-Änderung als
separate Migration — nicht Teil dieses Schritts.

## Was produktiv ungeprüft bleibt

- Die Migration `010` ist produktiv, `sickness_reports` selbst wurde **nicht**
  angefasst. Es wurde **nichts** in der Produktivdatenbank ausgeführt.
- Ob in der Produktivdatenbank dieselben Policies aktiv sind wie in
  `002_rls_policies.sql`, wurde im Rahmen der früheren Prüfung bestätigt; für
  `sickness_reports` liegt jedoch **kein** produktiver Verhaltenstest vor.
- Die Admin-Ansicht wurde gegen einen Client-Ersatz getestet, nicht gegen
  PostgREST. Fehlerübersetzung und Join-Verhalten der echten REST-Schicht sind
  damit nicht abgedeckt.
- Der reale Anmeldeweg (GoTrue) ist nicht Teil der Tests; JWT-Ansprüche werden
  simuliert.

## Weiterhin offen

- **Dokumentenupload** — eigener Schritt.
- **Urlaub zurückziehen** — eigener Schritt. Serverseitig ändert das `UPDATE`
  null Zeilen, ohne Fehler; ein Knopf müsste die Zeilenzahl prüfen.
- **Krankenschein als Datei** — Feld ist deaktiviert und beschriftet. Dass im
  Projektcode kein Storage-Aufruf vorkommt, belegt nicht, dass in Supabase kein
  Bucket existiert; belegt ist nur, dass dieses Portal keinen verwendet.
