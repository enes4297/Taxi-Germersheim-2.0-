# Anleitung: Anmeldung, Registrierung und Passwort selbst prüfen

Interne Arbeitsunterlage. Sie wird **nicht** mit ausgeliefert.

Stand: 23.09.2026, nach Schritt 020.

---

## Warum Sie das selbst machen müssen

Alles, was ich an den vier Seiten geprüft habe, ist **simuliert**: Die echte
`customer-auth.js` war dabei durch eine Attrappe ersetzt, die vorgegebene
Antworten liefert. Damit lässt sich feststellen, ob die Seite richtig
reagiert — aber **nicht**, ob eine Anmeldung gegen Supabase funktioniert
oder ob eine Mail ankommt.

Dafür braucht es eine echte Anmeldung, und **Zugangsdaten bleiben bei
Ihnen**. Ich habe keine angelegt, keine Mail ausgelöst und nichts an
produktiven Daten verändert.

---

## Vorbereitung

**Server starten** (ein Fenster, bleibt offen):

```
npm run build
npm run preview
```

**Die Seiten liegen dann hier:**

| | PC | Handy im WLAN |
|---|---|---|
| Anmelden | http://127.0.0.1:5200/anmelden.html | http://192.168.178.141:5200/anmelden.html |
| Registrieren | http://127.0.0.1:5200/registrieren.html | http://192.168.178.141:5200/registrieren.html |
| Passwort vergessen | http://127.0.0.1:5200/passwort-vergessen.html | http://192.168.178.141:5200/passwort-vergessen.html |

**Legen Sie sich eine Testadresse zu**, die Sie wirklich abrufen können und
die kein Kundenkonto ist — zum Beispiel eine Plus-Adresse Ihres eigenen
Postfachs (`ihrname+tgtest1@…`). Für jeden neuen Durchgang eine neue Zahl,
dann kommen Sie sich nicht selbst in die Quere.

> **Bitte keine produktive Kundenadresse verwenden.** Auch eine E-Mail-Adresse
> ist eine personenbezogene Angabe.

---

## Test 1 — Registrierung und Bestätigungsmail

1. `registrieren.html` öffnen.
2. Vorname, Nachname, Ihre Testadresse und eine Telefonnummer eintragen.
3. Ein Passwort vergeben. **Achten Sie auf die drei Haken** unter dem Feld:
   8 Zeichen, ein Großbuchstabe, eine Zahl. Erst wenn alle drei grün sind,
   nimmt das Formular es an.
4. Passwort wiederholen, Häkchen setzen, **Konto erstellen**.

**Was jetzt passieren sollte — und was es bedeutet:**

| Was Sie sehen | Bedeutung |
|---|---|
| **Grüner Hinweis** „Fast geschafft: Ihr Konto wurde angelegt … E-Mail an `ihre-adresse`" | Das Konto ist angelegt und wartet auf die Bestätigung. Die Seite bleibt stehen, der Knopf bleibt gesperrt. |
| **Sprung zu `anmelden.html?registered=1`** | Im Supabase-Projekt ist die Bestätigungspflicht abgeschaltet — Sie sind sofort angemeldet. Auch in Ordnung, nur anders. |
| **Roter Kasten** mit einer Meldung | Der Dienst hat abgelehnt. Bitte den Wortlaut notieren. |

5. **Postfach prüfen, auch den Spam-Ordner.**

> ⚠️ **Wenn keine Mail kommt, sagt das noch nichts über die Ursache.**
> In Frage kommen mindestens: der Mailversand ist im Supabase-Projekt gar
> nicht eingerichtet; das Kontingent des eingebauten Versands ist erschöpft;
> die Bestätigungspflicht ist abgeschaltet (dann *soll* keine Mail kommen);
> die Mail wurde abgewiesen oder liegt im Spam; oder die Adresse existiert
> schon als Konto. Erst zuletzt käme eine falsche Site-URL in Frage.
> Bitte nur festhalten, was Sie sehen — die Ursache klären wir danach.

6. Falls eine Mail kommt: **Link anklicken.** Wo landen Sie? Bitte die
   Adresse aus der Adresszeile notieren.

**Bitte notieren:** Welcher der drei Fälle oben eingetreten ist · ob eine
Mail kam und wie lange es dauerte · wohin der Link geführt hat.

---

## Test 2 — Anmeldung

1. `anmelden.html` öffnen.
2. **Erst absichtlich falsch:** eine erfundene Adresse und irgendein
   Passwort. Erwartung: ein roter Hinweis, die Seite bleibt stehen, der
   Knopf ist danach wieder bedienbar.
3. **Dann richtig:** Testadresse und Passwort aus Test 1.

**Erwartung:** Sie landen auf `meinkonto.html`.

**Wenn stattdessen** „Ihr Kundenkonto konnte noch nicht mit Taxi Germersheim
verknüpft werden" erscheint: Das Konto existiert in Supabase, ist aber nicht
mit einem Kundendatensatz verbunden. Das ist **kein Fehler dieser Seite** —
die Verknüpfung passiert im Backend. Bitte melden.

---

## Test 3 — Rückkehr nach der Anmeldung

Das ist der Punkt, den ich nur simuliert prüfen konnte.

1. Abmelden (in „Mein Konto").
2. Diese Adresse öffnen: `…/anmelden.html?weiter=rewards.html`
3. Anmelden.

**Erwartung:** Sie landen auf `rewards.html`, nicht auf `meinkonto.html`.

4. **Gegenprobe:** `…/anmelden.html?weiter=https://example.com/`
   Anmelden. **Erwartung:** Sie landen auf `meinkonto.html` — das fremde
   Ziel wird abgewiesen. Wenn Sie hier irgendwo anders landen, bitte sofort
   melden; das wäre ein Sicherheitsproblem.

---

## Test 4 — Passwort vergessen und neu vergeben

1. `passwort-vergessen.html` öffnen, Testadresse eintragen, **Reset-Link
   senden**.
2. **Erwartung:** die neutrale Bestätigung erscheint.

> Die Seite sagt **absichtlich nie**, ob es zu einer Adresse ein Konto gibt —
> auch bei einer unbekannten Adresse kommt dieselbe Bestätigung. Sonst ließe
> sich hier durchprobieren, wer Kunde ist. **Das ist kein Fehler.**

3. **Gegenprobe:** dasselbe mit einer Adresse, die es sicher nicht gibt.
   Erwartung: exakt dieselbe Meldung.
4. Postfach prüfen. Kommt eine Mail: **Link anklicken.**

**Was jetzt passieren sollte:**

| Was Sie sehen | Bedeutung |
|---|---|
| „Recovery-Link wird geprüft …", dann **zwei Passwortfelder** | Der Link trägt. Weiter mit Schritt 5. |
| **„Dieser Link ist nicht mehr gültig."** | Der Link ist abgelaufen, wurde schon benutzt — oder die Adresse steht nicht in den „Redirect URLs" des Supabase-Projekts (Angabe **I2**). |

5. Neues Passwort vergeben, wiederholen, **Passwort speichern**.
   **Erwartung:** „Ihr Passwort wurde erfolgreich geändert." und Sie sind
   abgemeldet.
6. Mit dem **neuen** Passwort anmelden.

**Bitte prüfen Sie dabei eines mit:** Steht nach dem Öffnen des Mail-Links
noch etwas wie `#access_token=…` in der Adresszeile? **Das sollte sofort
verschwinden.** Wenn es stehen bleibt, bitte melden — aber **schicken Sie
mir den Wert nicht**; die Angabe „es stand noch etwas da" genügt.

---

## Test 5 — Am Handy

Bitte Test 1 und 2 einmal am Handy wiederholen. Achten Sie auf:

- **Zoomt die Seite beim Antippen eines Feldes?** Sollte sie nicht.
- **Kommt die richtige Tastatur?** Bei E-Mail mit `@`, bei Telefon die
  Zifferntastatur.
- **Bietet Ihr Passwortmanager an, das Passwort zu speichern** — und beim
  nächsten Mal auszufüllen?
- Lässt sich das Passwort mit **Anzeigen** sichtbar machen und wieder
  verbergen?

---

## Was Sie mir zurückmelden — und was nicht

**Bitte melden:**

- Welcher Fall bei Registrierung und Passwort-Reset eingetreten ist
- Ob und wann Mails ankamen, und wohin die Links führten
- Den **Wortlaut** jeder Fehlermeldung, die Sie sehen
- Ob die Rückkehr über `?weiter=` funktioniert hat
- Was am Handy auffiel

**Bitte NICHT schicken:**

- Passwörter — auch keine Testpasswörter
- Den Inhalt von `access_token`, `code` oder ähnlichen Werten aus der
  Adresszeile
- Bildschirmfotos, auf denen ein solcher Wert oder ein Passwort steht
- Echte Kundenadressen

Für alles, was ich zur Fehlersuche brauche, reicht die Beschreibung.

---

## Danach: die offenen Angaben an den IT-Dienstleister

Je nachdem, was Sie sehen, wird eine dieser Angaben fällig:

- **I2** — Trägt die „Site URL" des Supabase-Projekts die künftige Domain,
  und steht `https://taxigermersheim.de/passwort-zuruecksetzen.html` in den
  „Redirect URLs"? Keine Schlüssel nötig, nur ja oder nein.
- **Mailversand** — Ist im Supabase-Projekt ein eigener Mailversand
  hinterlegt, oder läuft es über den eingebauten mit seinem engen
  Kontingent?
- **Bestätigungspflicht** — Ist „Confirm email" im Projekt an oder aus?

Alle drei lassen sich nur **im Supabase-Projekt nachsehen**, nicht aus dem
Verhalten der Webseite erschließen.
