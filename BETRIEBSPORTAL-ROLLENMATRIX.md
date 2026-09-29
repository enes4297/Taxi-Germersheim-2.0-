# Betriebsportal — Rollen, Fähigkeiten und Migrationsweg

**Branch:** `feature/030-betriebsportal-neu`
**Phase:** 2 (Rollentrennung), Entwurf für den Haltepunkt
**Stand:** 29.09.2026

Dieses Dokument beschreibt das künftige Berechtigungsmodell und den Weg
vom heutigen Modell dorthin. **Nichts davon ist eingespielt.** Die
zugehörige SQL liegt bewusst als Entwurf außerhalb von
`supabase/migrations/`.

---

## 1. Die Entscheidung: kleines Fähigkeitsmodell, nicht ein Rollenfeld

Der Auftrag fragt ausdrücklich, ob ein Modell mit `roles`, `user_roles`
und Fähigkeiten sauberer ist als ein einzelnes Rollenfeld. **Ja** — und
zwar aus einem Grund, der sich am Bestand zeigen lässt.

Heute steht in `public.profiles.role` **ein** Textwert. Ein Benutzer, der
Dispatcher **und** Buchhaltung ist, lässt sich damit nicht abbilden. Man
müsste eine Mischrolle `dispatcher_accounting` erfinden — und bei jeder
weiteren Kombination die nächste. Genau das verlangt der Auftrag nicht.

Der Entwurf hat deshalb drei kleine Tabellen:

| Tabelle | Inhalt |
|---|---|
| `public.app_roles` | die fünf Rollen, je mit Anzeigename |
| `public.role_capabilities` | welche Fähigkeit zu welcher Rolle gehört |
| `public.user_roles` | welcher Benutzer welche Rollen hat (mehrere möglich) |

Geprüft wird im Betrieb nie eine Rolle, sondern immer eine **Fähigkeit**.
Das ist der entscheidende Punkt: Wenn später eine Rolle dazukommt oder
sich eine Zuständigkeit verschiebt, ändert sich **eine Zeile in
`role_capabilities`** — nicht 94 Policies.

Warum nicht kleiner? Ein reines `user_roles` ohne Fähigkeiten würde
bedeuten, dass jede Policy die Rollennamen aufzählt
(`role in ('admin','personal')`). Dann steht die Fachlogik wieder in 94
Policies verteilt. Warum nicht größer? Ein volles Rechtesystem mit
Objekt-, Feld- und Zeilenrechten wäre hier nicht zu betreiben und nicht
zu prüfen. Die drei Tabellen sind die kleinste Lösung, die Mehrfachrollen
wirklich trägt.

---

## 2. Die fünf Rollen

| Schlüssel | Anzeigename | Zweck |
|---|---|---|
| `admin` | Administration | vollständiger Zugriff auf alle internen Bereiche |
| `dispatcher` | Disposition | Fahrten, Anfragen, Einsatzplanung, Fahrer- und Fahrzeugstatus, betriebliche Meldungen |
| `personal` | Personal | Mitarbeiterverwaltung, Urlaub, Krankheit, persönliche Dokumente, Dokumentfristen, Lohnabrechnungen |
| `accounting` | Buchhaltung | Kunden, Rechnungen, Zahlungen, notwendige Finanzauswertungen |
| `employee` | Mitarbeiter | ausschließlich eigenes Mitarbeiterportal und eigene Daten |

Ein Konto kann mehrere Rollen haben. `admin` erhält jede interne
Fähigkeit — nicht durch einen Sonderfall im Code, sondern durch Einträge
in `role_capabilities`. Es gibt damit **keine** Stelle, an der ein Name
„admin" privilegierend wirkt.

---

## 3. Die Fähigkeiten

Bewusst wenige, entlang der Bereiche des neuen Portals:

| Fähigkeit | Bedeutung |
|---|---|
| `operations.read` / `operations.write` | Fahrten, Fahrtanfragen, Einsatz- und Schichtplanung, betriebliche Meldungen |
| `fleet.read` / `fleet.write` | Fahrzeugstammdaten, Fahrzeugdokumente, Werkstatt |
| `personnel.read` / `personnel.write` | Mitarbeiter, Urlaub, Krankheit, persönliche Dokumente, Fristen |
| `payroll.read` / `payroll.write` | Lohnabrechnungen bereitstellen und verwalten |
| `customers.read` / `customers.write` | Kundenstammdaten |
| `finance.read` / `finance.write` | Rechnungen, Zahlungen, Mahnwesen |
| `rewards.read` / `rewards.write` | Rewards-Verwaltung |
| `analytics.read` | Webseiten- und Betriebsauswertung |
| `security.read` / `security.write` | Rollen, Konten, Einstellungen, Sicherheitsprotokolle |
| `self.read` | eigenes Mitarbeiterportal, eigene Daten |

### Rollenmatrix

| Fähigkeit | admin | dispatcher | personal | accounting | employee |
|---|:-:|:-:|:-:|:-:|:-:|
| `operations.read` | ✔ | ✔ | — | — | — |
| `operations.write` | ✔ | ✔ | — | — | — |
| `fleet.read` | ✔ | ✔ | — | — | — |
| `fleet.write` | ✔ | — | — | — | — |
| `personnel.read` | ✔ | — | ✔ | — | — |
| `personnel.write` | ✔ | — | ✔ | — | — |
| `payroll.read` | ✔ | — | ✔ | — | — |
| `payroll.write` | ✔ | — | ✔ | — | — |
| `customers.read` | ✔ | — | — | ✔ | — |
| `customers.write` | ✔ | — | — | ✔ | — |
| `finance.read` | ✔ | — | — | ✔ | — |
| `finance.write` | ✔ | — | — | ✔ | — |
| `rewards.read` | ✔ | — | — | — | — |
| `rewards.write` | ✔ | — | — | — | — |
| `analytics.read` | ✔ | — | — | ✔ | — |
| `security.read` | ✔ | — | — | — | — |
| `security.write` | ✔ | — | — | — | — |
| `self.read` | ✔ | ✔ | ✔ | ✔ | ✔ |

### Zwei Punkte, die eine Fähigkeit allein nicht löst

**Kundendaten für den Dispatcher.** Der Auftrag sagt: Kontaktdaten nur,
soweit für eine konkrete Fahrt nötig. Das ist keine Frage der Fähigkeit,
sondern der **Zeile**: Der Dispatcher hat kein `customers.read`, sieht
aber über `operations.read` die Kontaktangaben, die an einer ihm
zugeordneten Fahrt hängen. Das muss die Policy auf `rides` leisten, nicht
die Rollenmatrix. Solange es keine Fahrtentabelle im Portal gibt, ist
dieser Punkt **offen** und darf nicht als gelöst dargestellt werden.

**Krankmeldungen.** Der Dispatcher sieht laut Auftrag nur „Neue
Krankmeldung eingegangen". Das ist eine Meldung unter
`operations.read` — der Inhalt liegt unter `personnel.read`. Zwei
getrennte Datenwege, nicht ein Datensatz mit ausgeblendeten Feldern.

---

## 4. Woher die Rolle kommt — und woher nicht

**Quelle ist ausschließlich die Datenbank.** Eine Funktion
`private.has_capability(text)` liest über `auth.uid()` das Profil, dessen
Rollen und deren Fähigkeiten. Sie ist `security definer` mit
`set search_path = ''` und voll qualifizierten Namen, wie alle
bestehenden Prüffunktionen des Projekts.

Nicht akzeptiert werden: `localStorage`, `sessionStorage`,
URL-Parameter, Formularfelder, JavaScript-Variablen, Anzeigenamen.

**Kein Rückfall.** Kein `|| "Chef"`, kein `|| "admin"`, kein
Standardwert. Fehlt das Profil, ist es inaktiv oder hat es keine Rolle,
ist das Ergebnis `false` — kein Zugriff. Das gilt auch, wenn die Abfrage
selbst fehlschlägt: Die Oberfläche zeigt dann „Berechtigung konnte nicht
geprüft werden" und keinen Inhalt. Ein Ladefehler darf nie wie eine
erteilte Berechtigung aussehen.

**Die Oberfläche richtet sich nach denselben Fähigkeiten**, aber sie
schützt nichts. Sie fragt dieselbe Quelle und blendet aus, was nicht
bedienbar ist — damit niemand auf Knöpfe trifft, die er nicht benutzen
darf. Der Schutz liegt bei RLS, Grants und den Funktionen.

---

## 5. Der Migrationsweg — und sein empfindlicher Punkt

### Warum zusätzliche Policies nichts absichern

Eine Projektregel, die hier entscheidend wird: **Permissive Policies
verknüpfen mit ODER.** Neue Policies neben die 94 bestehenden zu legen,
kann den Zugriff nur **erweitern**, nie einschränken. Ein Fähigkeitsmodell
„zusätzlich" einzuführen, würde also gar nichts sichern.

### Der gangbare Weg: die Prüffunktionen ersetzen

Gemessen: `private.is_admin()` und `private.is_dispatcher_or_admin()`
werden in den Migrationen **108-mal** aufgerufen — in Policies,
Triggern und Funktionen. Alle Policies fragen also nicht `profiles.role`
ab, sondern diese beiden Funktionen.

Damit gibt es einen sauberen Weg:

1. Neue Tabellen anlegen (`app_roles`, `role_capabilities`,
   `user_roles`), mit RLS und ohne jedes Recht für `anon`.
2. `user_roles` aus dem heutigen `profiles.role` befüllen —
   `admin` → `admin`, `dispatcher` → `dispatcher`, alles andere →
   `employee`.
3. `private.has_capability(text)` anlegen.
4. `private.is_admin()` und `private.is_dispatcher_or_admin()` per
   `create or replace` auf das neue Modell umstellen.

**Keine bestehende Migration wird verändert, keine bestehende Policy
gelöscht.** Alle 108 Aufrufstellen übernehmen das neue Modell in dem
Moment, in dem die beiden Funktionen ersetzt sind.

### Der empfindliche Punkt, ausdrücklich benannt

Genau diese Eleganz ist auch das Risiko: **Ein einziger Befehl ändert das
Verhalten von 94 Policies gleichzeitig.** Ein Fehler in der
Funktionsdefinition sperrt entweder alle aus oder öffnet zu viel.

Daraus folgt zwingend:

- Der Entwurf wird **lokal gegen echte Policies** geprüft, mit dem
  portablen PostgreSQL und den vorhandenen Nachbildungen — nicht nur mit
  einer Browser-Attrappe.
- Geprüft wird für jede der fünf Rollen und zusätzlich für: kein Profil,
  inaktives Profil, Profil ohne Rolle, unbekannte Rolle.
- Die Einspielung in die produktive Instanz erfolgt **nur** nach
  ausdrücklicher Freigabe im laufenden Gespräch und **nicht** durch den
  Assistenten nebenbei.
- Der Rückweg wird mitgeliefert: Die alte Definition der beiden
  Funktionen steht im Entwurf als Kommentar, damit sie sich in einem
  Schritt wiederherstellen lässt.

### Was mit `profiles.role` geschieht

Nichts — vorerst. Die Spalte bleibt unverändert bestehen. Sie wird nach
der Umstellung nicht mehr für Berechtigungen gelesen, aber auch nicht
entfernt, solange nicht belegt ist, dass keine Stelle sie mehr braucht.
**Bestehende produktive Rollen werden nicht ungefragt verändert.**

---

## 6. Was am Haltepunkt noch offen ist

| Punkt | Stand |
|---|---|
| Fähigkeitsmodell und Matrix | entworfen, hier dokumentiert |
| Entwurf der Migration | geschrieben, **nicht produktiv eingespielt** |
| Lokale Prüfung gegen echte Policies | **gelaufen — 48 bestanden, 0 offen** |
| Prüfung auf der produktiven Instanz | **nicht gelaufen** |
| Zeilenrecht Dispatcher → Kundendaten an einer Fahrt | offen, braucht erst die Fahrtentabelle |
| Wer welche Rolle erhält | Entscheidung des Auftraggebers |
| Zweite Person mit `admin` als Ausfallsicherung | Empfehlung, noch nicht entschieden |

---

## 7. Der lokale Prüflauf

`supabase/tests/local/16_rollen_run.ps1` fährt einen isolierten,
portablen PostgreSQL auf `127.0.0.1:55432`, lädt die Nachbildungen für
`auth` und `storage`, spielt **die echten Migrationen 001–011** ein,
dann den Entwurf, und prüft anschließend. Der Server wird danach wieder
gestoppt. Zur Produktivinstanz besteht zu keinem Zeitpunkt eine
Verbindung; alle acht Testkonten sind erfunden
(`…@example.invalid`).

**Ergebnis: 48 Prüfungen bestanden, 0 offen.**

Geprüft wurde:

- die vollständige Rollenmatrix für alle fünf Rollen, in beide
  Richtungen — also auch, dass der Dispatcher Personalakten, Lohn,
  Rechnungen, Rewards und Sicherheitseinstellungen **nicht** bekommt;
- der Mehrfachfall: ein Konto mit `dispatcher` **und** `accounting`
  erhält die Vereinigung beider Fähigkeiten und nichts darüber hinaus;
- die Grenzfälle: inaktives Profil (obwohl mit Rolle `admin`), Profil
  ganz ohne Rolle, unbekannte Fähigkeit — alle drei liefern `false`.
  Es gibt keinen Rückfall auf eine privilegierte Rolle;
- die Wirkung auf die 94 vorhandenen Policies: `is_admin()` und
  `is_dispatcher_or_admin()` bedeuten nach dem Ersetzen für alle fünf
  Rollen und für das inaktive Profil genau dasselbe wie vorher;
- dass `anon` auf den drei neuen Tabellen keine Rechte hat und RLS auf
  allen dreien aktiv ist.

### Ein Fund aus dem ersten Lauf

Der erste Lauf schlug fehl: `admin` hatte keine einzige Fähigkeit. Grund
war die Reihenfolge — der Entwurf übernimmt `user_roles` aus
`profiles.role`, und die Testprofile entstanden erst **danach**. Das war
ein Fehler im Test, nicht im Modell, ist aber ein Hinweis für die echte
Einspielung: **Abschnitt 3 des Entwurfs wirkt nur auf Profile, die zum
Zeitpunkt der Einspielung schon vorhanden sind.** Später angelegte
Konten brauchen ihre Rolle ausdrücklich. Das gehört in die
Betriebsanleitung.

> **Einordnung nach Projektregel.** Das Modell ist damit **lokal gegen
> echte Policies geprüft** — nicht nur statisch, nicht nur mit einer
> Attrappe. Es ist **nicht** auf der produktiven Instanz geprüft, und
> lokal bestandene Tests sagen nichts über die Produktivinstanz.
