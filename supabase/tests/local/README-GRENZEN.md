# Lokale Testumgebung — was sie beweist und was nicht

Die Dateien in diesem Ordner richten eine **lokale, isolierte PostgreSQL-Instanz**
ein, um die Migrationen und die Berechtigungstests wirklich auszuführen. Sie sind
**keine Migrationen** und dürfen niemals gegen ein Supabase-Projekt laufen.

## Aufbau

| Datei | Zweck |
|---|---|
| `00_supabase_shim.sql` | Minimale Nachbildung der Supabase-Plattform: Rollen `anon`/`authenticated`/`service_role`, Schema `auth` mit `auth.users`, `auth.uid()`, `auth.role()`, Standardrechte im Schema `public`, Erweiterungen `uuid-ossp` und `pgcrypto`. |
| `run-local-tests.ps1` | Richtet Datenbank ein, spielt Shim + Migrationen + Seed ein, führt die Tests vor und nach Migration 010 aus. |
| `ERGEBNIS-2026-09-10.md` | Tatsächliches Ergebnis des Laufs vom 10.09.2026. |

Verwendet wurde PostgreSQL **17.6** (portable Binaries von EnterpriseDB), entpackt
nach `%USERPROFILE%\pgtest-tg`, gestartet auf `127.0.0.1:55432`, ohne Windows-Dienst
und ohne Firewall-Freigabe. Restlos entfernbar durch Löschen des Ordners.

## Was der lokale Lauf belegt

- Die Migrationen `001`–`009` **und** `010` laufen syntaktisch fehlerfrei durch.
- `010` ist **idempotent** — zweimaliges Einspielen ohne Fehler.
- Signaturen und Rückgabetypen bleiben nach `010` unverändert:
  `rewards_account_spin_balance(p_rewards_account_id uuid) → integer`,
  `rewards_wheel_active_member_count(p_day date) → bigint`,
  `rewards_wheel_summary(p_day date) → TABLE(4 Spalten)`.
- Die Autorisierungslogik greift wie vorgesehen: 10 gezielt fehlschlagende Tests
  vor `010`, 22 von 22 bestanden danach.
- Die Ausführungsrechte entsprechen dem produktiven Export:
  `anon` = false, `authenticated` = true, `SECURITY DEFINER` = true, `search_path=""`.

## Was der lokale Lauf NICHT belegt

Diese Grenzen sind wichtig und dürfen nicht überlesen werden.

### 1. Die produktiven Eigentümerrechte bleiben offen

Lokal gehören alle Funktionen und Tabellen der Rolle `postgres`, und diese ist
hier **Superuser mit `BYPASSRLS`**. Dadurch umgehen die `SECURITY DEFINER`-Funktionen
lokal die Row-Level-Security — genau deshalb war die Lücke im Vorher-Lauf sichtbar
(Kunde A las das fremde Konto B mit dem echten Wert 5).

**In der produktiven Supabase-Datenbank ist nicht dokumentiert, wem die Funktionen
gehören und ob dieser Eigentümer RLS umgeht.** Der lokale Lauf beantwortet das
nicht. Er zeigt, dass die Lücke unter der Bedingung „Eigentümer umgeht RLS"
ausnutzbar ist — nicht, dass diese Bedingung in Produktion zutrifft.

Bis das geklärt ist, gilt weiterhin: **kein nachgewiesener Datenabfluss in
Produktion.** Nötig dafür wären die Metadaten zu `pg_proc.proowner`,
`pg_roles.rolsuper` / `rolbypassrls` und `pg_class.relforcerowsecurity`.

Lokal gemessen (nur zur Einordnung, **nicht** auf Produktion übertragbar):
`relforcerowsecurity = false` auf `customers`, `rewards_accounts`,
`rewards_spin_transactions`, `rewards_wheel_spins`.

### 2. `auth.users` ist stark vereinfacht

Die Nachbildung enthält nur die von Migrationen und Seed benötigten Spalten. Ein
echtes Supabase-`auth.users` hat deutlich mehr Spalten, teils `NOT NULL`. Ob der
Seed-Insert dort ohne Ergänzungen durchläuft, ist mit diesem Lauf **nicht** geprüft.

### 3. Kein PostgREST, kein GoTrue

Getestet wurde direkt auf der Datenbank mit simulierten JWT-Ansprüchen über
`request.jwt.claims`. Nicht getestet sind: das reale Verhalten der REST-Schicht,
Token-Ausstellung und -Prüfung, Rollenwechsel durch `authenticator`, sowie
Fehlerübersetzung durch PostgREST (SQLSTATE `42501` wird dort zu HTTP 403).

### 4. Keine Aussage über den echten Datenbestand

Alle Werte stammen aus synthetischen Testdaten (`TESTDATA-010`). Über Umfang oder
Inhalt der produktiven Rewards-Daten sagt der Lauf nichts.

### 5. Andere Plattformunterschiede

Nicht nachgebildet: Supabase-eigene Erweiterungen (`pg_graphql`, `pgjwt`, `pgsodium`,
`supabase_vault`), Realtime, Storage, Edge Functions, sowie die genaue
Supabase-Rollenhierarchie (`authenticator`, `supabase_admin`, `supabase_auth_admin`).

## Empfehlung

Der lokale Lauf ist ein starker Vorabnachweis für Syntax und Logik. Für die
verbindliche Freigabe sollte `010` zusätzlich in einem separaten
Supabase-Testprojekt eingespielt und dort dasselbe Testskript ausgeführt werden.
