# Anleitung: Anmeldung, Registrierung und Passwort selbst prüfen

Interne Arbeitsunterlage. Sie wird **nicht** mit ausgeliefert.

Stand: 28.09.2026, nach Schritt 025.

> **Was sich gegenüber dem Stand vom 23.09.2026 geändert hat**
>
> - `npm run preview` bindet nur auf `127.0.0.1` und ist vom Handy **nicht**
>   erreichbar. Der Aufruf unten ist entsprechend korrigiert.
> - Seit Schritt 021 gibt es fünf weitere Kontoseiten. Nach der Anmeldung
>   ist deshalb mehr zu sehen als nur „Mein Konto"; Test 2 nennt jetzt, was
>   dort im Einzelnen stehen muss.
> - Ein sichtbarer Kontoname allein beweist noch nicht, dass die Kontodaten
>   geladen wurden. Die Seite hat für den Fehlerfall eigene, benannte
>   Meldungen — sie stehen jetzt in Test 2.

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
npx astro preview --host 0.0.0.0 --port 5200
```

> **Warum nicht `npm run preview`?** Der Aufruf ohne `--host` bindet nur auf
> `127.0.0.1`. Am PC funktioniert er, vom Handy ist er nicht erreichbar —
> der Aufruf läuft dann scheinbar, und das Handy bekommt eine
> Zeitüberschreitung. Mit `--host 0.0.0.0` hört der Server auf allen
> Netzwerkkarten.

**Die Seiten liegen dann hier:**

| | PC | Handy im WLAN |
|---|---|---|
| Anmelden | http://127.0.0.1:5200/anmelden.html | http://192.168.178.141:5200/anmelden.html |
| Registrieren | http://127.0.0.1:5200/registrieren.html | http://192.168.178.141:5200/registrieren.html |
| Passwort vergessen | http://127.0.0.1:5200/passwort-vergessen.html | http://192.168.178.141:5200/passwort-vergessen.html |
| Mein Konto | http://127.0.0.1:5200/meinkonto.html | http://192.168.178.141:5200/meinkonto.html |

Die WLAN-Adresse ist die des Entwicklungsrechners und kann sich ändern; sie
lässt sich mit `ipconfig` nachsehen (Eintrag „IPv4-Adresse").

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

### Und dann bitte genau hinsehen

**Ein sichtbarer Name beweist noch nichts.** Der Name kommt aus der Sitzung
selbst; die übrigen Angaben kommen aus zwei getrennten Abfragen, und die
können einzeln fehlschlagen, ohne dass die Seite leer aussieht.

Auf `meinkonto.html` stehen sechs Felder. Bitte alle sechs ansehen:

| Feld | Woher es kommt |
|---|---|
| Name | aus der Sitzung |
| E-Mail | aus der Sitzung |
| Telefon | aus dem Kundendatensatz |
| Mitglied seit | aus dem Kundendatensatz |
| Punkte und Stufe | aus der Rewards-Abfrage |
| Qualifizierende Fahrten und verfügbare Drehs | aus der Rewards-Abfrage |

**Was die Zeichen bedeuten:**

| Was Sie sehen | Bedeutung |
|---|---|
| Echte Werte in allen sechs Feldern | Alles geladen. |
| **`…`** bleibt stehen | Die Abfrage läuft noch oder hängt. Nach einigen Sekunden bitte melden. |
| **`—`** steht dort | Das Feld wurde geleert, ein Wert kam nicht an. |
| **„Ihr Rewards-Stand ist gerade nicht abrufbar."** mit „Erneut versuchen" | Die Rewards-Abfrage ist fehlgeschlagen. Name und E-Mail können trotzdem dastehen. Bitte melden. |
| **„Der Browserspeicher ist gesperrt."** | Der Browser lässt keine Sitzung speichern (privates Fenster, blockierte Website-Daten). Kein Fehler der Seite. |

**Bitte melden:** welche der sechs Felder gefüllt waren und welche nicht —
die **Werte selbst brauche ich nicht**, „gefüllt" oder „leer" genügt.

### Die weiteren Kontoseiten (seit Schritt 021)

Erst ansehen, wenn Test 2 durch ist:

| Seite | Was dort stehen sollte |
|---|---|
| `kunden-einstellungen.html` | Ihre Stammdaten, änderbar |
| `meine-fahrten.html` | **Noch keine Fahrten.** Für Kundenkonten gibt es auf die Fahrtentabelle bislang keinen Zugriff (alle vier Regeln hängen an der Dispatcher-/Admin-Prüfung). Die Seite sagt das mit „Hier finden Sie künftig Ihre kommenden und vergangenen Fahrten." — das ist der bekannte offene Punkt, kein neuer Fehler. |
| `wallet-gutscheine.html` | Guthaben und Gutscheine |
| `live-fahrt.html` | die laufende Fahrt — ohne laufende Fahrt ein Hinweis |

> Ein **leerer** Bereich und ein **Ladefehler** sind zweierlei. Die Seiten
> sollen das auseinanderhalten und es sagen. Wenn eine Seite einfach leer
> aussieht, ohne zu erklären warum, ist das ein Befund — bitte melden.

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
