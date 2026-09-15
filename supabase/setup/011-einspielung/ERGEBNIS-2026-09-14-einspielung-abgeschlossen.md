# Ergebnis — Einspielung von Migration 011 im Originalprojekt abgeschlossen

Stand 14.09.2026. Gegenstand: die manuelle, schrittweise Einspielung der
fehlenden Teile von Migration 011 gegen das **Originalprojekt** Taxi
Germersheim, Schritt für Schritt im SQL Editor ausgeführt, jeder Schritt mit
eigener Vorprüfung und eigener Kontrolle vor dem `commit`.

## Ausgeführte Schritte, alle im Originalprojekt bestätigt

| Schritt | Datei | Ergebnis |
|---|---|---|
| 05 | `../storage-trigger-nachtragen.sql` | Löschschutz-Trigger `storage_objects_guard_delete` aktiv, beide Plattform-Trigger (`protect_objects_delete`, `update_objects_updated_at`) unverändert, keine DELETE-Policy zu diesem Zeitpunkt |
| 06 | `06_policies_lesen_schreiben.sql` | drei Policies angelegt (`employee_documents_insert_own`, `employee_documents_select_own`, `employee_documents_select_admin`), „Success. No rows returned" |
| 07 | `../storage-delete-policy-nachtragen.sql` | vierte Policy `employee_documents_delete_unlinked` angelegt, Löschschutz-Trigger weiterhin aktiv |
| 07b | `07b_kontrolle_policies.sql` | **alle 12 Zeilen OK** — vier Policies ausschließlich für `authenticated`, WITH CHECK der INSERT-Policy enthält Bucket `employee-documents`, eigenen `auth.uid()`-Ordner und `private.is_active_employee()`, keine UPDATE-/ALL-/anon-/PUBLIC-Policy, beide Plattform-Trigger vorhanden, RLS aktiv, Bucket privat |
| — | Abschlusskontrolle übrige Bestandteile (Dokumenttypen, Funktionen, Trigger auf public, INSERT-Policies, `client_request_id`, Indizes) | **alle 15 Zeilen OK** — inklusive vollständiger Indexdefinitionen (`uq_sickness_reports_client_request`, `idx_document_submissions_submitted_at`) und vollständiger WITH-CHECK-Ausdrücke beider INSERT-Policies |

Die Schritte 01, 01b, 01c, 02, 03, 03b waren bereits vor diesem Gesprächsteil
erfolgreich gelaufen (siehe `README.md`, Abschnitt „Reihenfolge").

## Damit bestätigte Einrichtungspunkte

- Bucket `employee-documents`: privat, Größenlimit und MIME-Typen wie
  vorgesehen (aus Schritt 03b).
- Vier Dokumentarten in `public.document_types`.
- Berechtigungsfunktionen `private.is_active_employee()`,
  `private.is_unlinked_document(text)`, `private.lock_document_object()`
  vorhanden, mit den vorgesehenen EXECUTE-Rechten (nicht für PUBLIC, nicht
  für `anon`).
- Sperr-Trigger `document_submissions_lock_object` und
  `employee_documents_lock_object` vorhanden und aktiv.
- Löschschutz-Trigger `storage_objects_guard_delete` auf
  `storage.objects` aktiv.
- Vier Policies auf `storage.objects`, ausschließlich für `authenticated`,
  keine UPDATE-, keine ALL-, keine anon-/PUBLIC-Policy.
- INSERT-Policy `document_submissions_employee_insert` mit dem vorgesehenen
  WITH CHECK (`employee_id`, `status`, `reviewed_at`/`reviewed_by`,
  `is_active_employee()`, eigener `auth.uid()`-Ordner).
- INSERT-Policy `sickness_reports_employee_insert` mit dem vorgesehenen
  WITH CHECK (`employee_id`, `status`, `is_active_employee()`,
  `client_request_id`, Verknüpfungsprüfung auf `document_submissions`).
- Spalte `sickness_reports.client_request_id` (Typ `uuid`) und der
  eindeutige partielle Index `uq_sickness_reports_client_request` auf
  `(employee_id, client_request_id) where client_request_id is not null`.
- Index `idx_document_submissions_submitted_at` auf
  `(submitted_at desc)`.

Alle Prüfungen sind **strukturell**: Vorhandensein, Rechte, Policy-Text,
Trigger-Zustand, Indexdefinition. Es handelt sich um die vollständige,
gezielte Einspielung der bis dahin fehlenden Teile von Migration 011.

## Was das ausdrücklich nicht beweist

- **Kein produktiver Verhaltenstest.** Kein Upload über die echte
  Storage-API, kein Abruf durch einen angemeldeten Mitarbeiter, kein
  Admin-Zugriff, keine Krankmeldung mit Anhang ist bisher im Originalprojekt
  ausgeführt worden. Die Policies sind strukturell korrekt hinterlegt; ob sie
  im Zusammenspiel mit Auth-Session, Storage-API und Oberfläche das
  vorgesehene Verhalten zeigen, ist damit noch nicht gezeigt.
- Frühere lokale Nachbau-Läufe (siehe
  `ERGEBNIS-2026-09-14-rueckweg-r1-r3.md`) bilden Rechte und Eigentümerschaft
  nach, nicht die echte Storage-API. Sie sind kein Ersatz für einen
  Funktionstest im Originalprojekt.

Ein gezielter Funktionstest über das echte Mitarbeiterportal ist als
nächster Schritt vorgesehen, aber zum Zeitpunkt dieses Standes noch nicht
durchgeführt.
