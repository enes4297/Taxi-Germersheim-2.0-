# Anleitung: Mitarbeiterportal mit dem Testfahrer prüfen

Interne Arbeitsunterlage. Sie wird **nicht** mit ausgeliefert.

Stand: 29.09.2026, nach Schritt 029.

---

## Warum Sie das selbst machen müssen

Alles, was ich am Portal geprüft habe, lief mit **isolierten Attrappen**:
Die Verbindung zu Supabase war abgeschnitten, alle Namen, Zeiten und
Kennzeichen waren erfunden. Damit lässt sich feststellen, ob die Seiten
richtig reagieren — aber **nicht**, ob die Regeln der Datenbank fremde
Daten wirklich abweisen und ob eine Mitarbeiterrolle wirklich keine
Verwaltungsrechte hat.

Dafür braucht es eine echte Anmeldung und echte Testdaten. Beides legen
**Sie** an; ich habe nichts angelegt, nichts hochgeladen und nichts an der
produktiven Instanz verändert.

---

## Vorbereitung

**Server starten** (ein Fenster, bleibt offen):

```
npm run build
npx astro preview --host 0.0.0.0 --port 5200
```

| | PC | Handy im WLAN |
|---|---|---|
| Portal-Anmeldung | http://127.0.0.1:5200/fahrer/index.html | http://192.168.178.141:5200/fahrer/index.html |
| Portal | http://127.0.0.1:5200/fahrer/mitarbeiter.html | http://192.168.178.141:5200/fahrer/mitarbeiter.html |

Die WLAN-Adresse ist die des Entwicklungsrechners; mit `ipconfig`
nachsehen (Eintrag „IPv4-Adresse").

---

## Welche Konten Sie brauchen

| | wofür | Hinweis |
|---|---|---|
| **Testfahrer** (vorhanden) | alle Abläufe | das Konto, mit dem Sie sich bereits angemeldet haben |
| **Zweiter Testfahrer** (fehlt) | nur für Test 8 (fremder Zugriff) | **Kein echtes Mitarbeiterkonto verwenden.** Ich lege keines an — das entscheiden Sie |

> Test 8 ist der einzige, der ein zweites Konto braucht. Alle übrigen
> Tests gehen ohne.

---

## Welche Testdaten Sie anlegen

Alle über die **bestehende Verwaltung** (`admin/`), nicht über die
Datenbank direkt. Bitte jeden Datensatz eindeutig als Test kennzeichnen —
das erleichtert das Aufräumen in Schritt „Bereinigung".

### A) Testfahrzeug

1. `admin/fahrzeuge.html` öffnen.
2. Neues Fahrzeug anlegen:
   - **Name:** `TESTWAGEN-029`
   - **Kennzeichen:** ein Kennzeichen, das es bei Ihnen **nicht** gibt,
     z. B. `GER-TEST 999`
   - Typ: beliebig
3. Speichern. Die Kennung (ID) kurz notieren — für die Bereinigung.

### B) Testschicht für **heute**

1. `admin/schichtplanung.html` öffnen.
2. Die Zeile des Testfahrers suchen (Karte mit seinem Namen).
3. Auf **„Mitarbeiter für heute einplanen"** klicken.
   Oben in der Karte wechselt der Zustand auf **„im Dienst"**.
4. Auf **„Fahrzeug zuweisen"** klicken.
   Darunter klappt **„Fahrzeug wählen"** auf und zeigt **alle Fahrzeuge
   aus der Fahrzeugverwaltung** als Karten — je mit Fahrzeugname und
   Kennzeichen.
5. Die Karte **TESTWAGEN-029 · GER-TEST 999** anklicken.
   Sie schließt sich, und bei **„Zugewiesenes Fahrzeug"** steht jetzt
   `GER-TEST 999`. Beim erneuten Öffnen ist die Karte **gold umrandet**.
6. Auf **„Schicht ändern"** klicken.
   Darunter klappt **„Schicht wählen"** auf: oben die Vorlagen
   (Frühschicht, Tagschicht, Spätschicht, Nachtschicht …), darunter
   **„oder eigene Zeit"** mit zwei Feldern.
7. Entweder eine Vorlage anklicken — oder Beginn und Ende selbst
   eintragen und auf **„Zeit übernehmen"** klicken.
   Bei **„Schichtbeginn"** und **„Schichtende"** stehen danach die
   gewählten Zeiten.
8. Oben rechts auf **„Planung speichern"**.
   Damit ist die Schicht gespeichert — aber noch ein **Entwurf**. Im
   Portal ist sie jetzt bewusst **nicht** sichtbar.
9. Oben rechts bei **„Veröffentlichen für"** von *morgen* auf
   **heute · TT.MM.JJJJ** umstellen. Das Datum steht im Klartext da.
10. Auf **„Plan veröffentlichen"** klicken.
11. Die Rückfrage nennt noch einmal den Tag und die Anzahl der Schichten —
    bestätigen.

**Erwartung:** Unter der Kopfleiste erscheint
„Plan für heute, TT.MM.JJJJ, veröffentlicht: N Schicht(en) sind jetzt im
Mitarbeiterportal sichtbar."

> **Warum zwei Schritte?** Speichern ist nicht Veröffentlichen. Das Portal
> zeigt ausschließlich veröffentlichte Schichten
> (`plan_status = 'published'`, Regel `shifts_select_self_published`).
> Eine nur gespeicherte Schicht erscheint dort **nicht** — das ist kein
> Fehler, sondern Absicht.

> **Hinweis zur Vorauswahl:** Es steht **morgen** voreingestellt. Wer
> nichts umstellt, veröffentlicht wie bisher den morgigen Plan. Für den
> heutigen Tag muss die Auswahl bewusst umgestellt werden — so kann kein
> Tag versehentlich veröffentlicht werden.

> **Bis Schritt 029 war beides nicht möglich.** „Plan veröffentlichen"
> war fest auf morgen verdrahtet, und „Fahrzeug zuweisen" bzw. „Schicht
> ändern" waren Umschalter mit festen Werten — man konnte weder ein
> Fahrzeug noch eine Schichtzeit auswählen. Beides ist behoben — siehe
> Abschnitte 23 und 24 der Abschlussunterlage.

### C) Testschicht für **morgen**

Wie B), aber in der Spalte **„Morgen"**, Zeit `14:00`–`22:00` und
**ohne Fahrzeug**. Beim Veröffentlichen die Auswahl auf
**morgen · TT.MM.JJJJ** stellen (das ist die Vorauswahl).

So lässt sich beides prüfen: zugewiesenes Fahrzeug (heute) und offenes
Fahrzeug (morgen).

### D) Test-Urlaubsantrag

Den legen Sie **nicht** in der Verwaltung an, sondern im Portal — das ist
Test 5. Er trägt dann automatisch den Testfahrer.

Bitte in das Bemerkungsfeld schreiben: `TESTANTRAG 029 – bitte löschen`

### E) Test-PDF

Eine harmlose Datei **ohne persönliche Angaben**, die nur lokal bleibt.

**So erzeugen Sie sie** (Windows, ohne Zusatzprogramm):

1. Editor öffnen, hineinschreiben:
   `TESTDATEI 029 - kein Inhalt - bitte loeschen`
2. Datei speichern als `testdatei-029.txt`.
3. Datei öffnen, **Drucken** → Drucker **„Microsoft Print to PDF"** →
   speichern als `testdatei-029.pdf`.

Alternativ: ein beliebiges Foto einer Wand oder eines leeren Blattes als
JPEG. **Kein Führerschein, kein Ausweis, keine echte Bescheinigung.**

> Die Datei bleibt bei Ihnen auf der Platte. Sie wird **nicht**
> automatisch hochgeladen — das tun Sie in Test 6 von Hand.

---

## Die Tests

### Test 1 — Anmelden

`fahrer/index.html` öffnen, mit dem Testfahrer anmelden.

**Erwartung:** Sie landen auf `mitarbeiter.html`, oben stehen Ihr Name und
das heutige Datum.

| Stattdessen | Bedeutung |
|---|---|
| „E-Mail-Adresse oder Passwort ist falsch." | Zugangsdaten stimmen nicht — **oder** das Konto ist gesperrt/unbestätigt. Die Meldung sagt das absichtlich nicht; sonst ließe sich durchprobieren, welche Adressen es gibt |
| „Für dieses Konto ist kein aktiver Mitarbeiterzugang hinterlegt." | Konto existiert, aber `profiles.employee_id` fehlt oder `active` ist nicht gesetzt |
| „Die Anmeldung ist gerade nicht möglich …" | Die Verbindung ist nicht eingerichtet — `admin/supabase-config.js` wurde nicht geladen |

### Test 2 — Heute und morgen

**Erwartung nach B) und C):**

- Karte **„Heute"**: goldener Rand, Zustandsmarke „Heute geplant",
  Arbeitszeit groß, darunter abgesetzt **`TESTWAGEN-029 · GER-TEST 999`**
- Karte **„Morgen"**: Zustandsmarke „Veröffentlicht", Arbeitszeit,
  **kein** Fahrzeugblock oder Hinweis „Fahrzeug offen"

**Ohne angelegte Schichten** steht dort „Heute frei" bzw. „Morgen frei" —
genau das haben Sie bisher gesehen, und es ist richtig, solange keine
Zuweisung existiert.

**Bitte prüfen:** Steht in „Meine Woche" die heutige Zeile hervorgehoben?
Sind die übrigen Tage als „Frei" gekennzeichnet?

### Test 3 — Nicht veröffentlichter Plan

1. In der Verwaltung eine **dritte** Schicht für übermorgen anlegen —
   **nicht** veröffentlichen.
2. Portal neu laden.

**Erwartung:** Übermorgen steht weiterhin „Frei". Die unveröffentlichte
Schicht darf **nicht** erscheinen.

> Das ist die wichtigste Verwechslungsgefahr: Dienstplan und
> Veröffentlichungszustand sind zweierlei.

### Test 4 — Falsche Rolle

Mit dem **Testfahrer** `admin/login.html` aufrufen und anmelden.

**Erwartung:** „Zugriff verweigert. Nur aktive Admins oder Dispatcher
dürfen sich anmelden."

**Bitte zusätzlich:** Nach dieser Abweisung `admin/dokumentfristen.html`
direkt in die Adresszeile eingeben. **Erwartung:** keine Nachweise anderer
Mitarbeiter, sondern der Hinweis auf fehlende Berechtigung.

### Test 5 — Urlaubsantrag

Im Portal → **Urlaub** → Zeitraum wählen → Bemerkung `TESTANTRAG 029 –
bitte löschen` → senden.

**Erwartung:**
- Der Knopf zeigt während des Sendens **„Wird gesendet …"** und ist
  gesperrt.
- Danach: **„Urlaub vom TT.MM.JJJJ bis TT.MM.JJJJ wurde übermittelt und
  liegt der Zentrale vor."** — mit dem Zeitraum im Text.
- Der Antrag erscheint in der Liste darunter.
- In der Verwaltung ist er sichtbar.

**Bitte prüfen:** Zweimal schnell hintereinander auf „Senden" tippen. Es
darf **nur ein** Antrag entstehen.

### Test 6 — Dokumentenupload

Im Portal → **Dokument senden** → Dokumentart wählen → `testdatei-029.pdf`
auswählen.

**Erwartung vor dem Senden:** Der Dateiname steht als goldgerahmte Zeile
da, mit einer Schaltfläche zum Entfernen.

Senden.

**Erwartung:** Ladezustand, danach eine Erfolgsmeldung, die **nennt, was
eingereicht wurde**. Das Dokument erscheint in der Liste und in
`admin/dokumentfristen.html`.

**Dann die Abweisungen prüfen** — beide dürfen **nicht** durchgehen:

| Datei | Erwartete Meldung |
|---|---|
| eine `.html`- oder `.svg`-Datei (z. B. eine gespeicherte Webseite) | „Nur PDF, JPEG und PNG sind erlaubt." |
| eine Datei über 10 MB (z. B. ein großes Foto) | „Die Datei ist größer als 10 MB." |

> Beide Grenzen stehen **auch serverseitig** im Speicher-Bucket
> (Migration 011: `allowed_mime_types`, `file_size_limit`). Die
> Browserprüfung ist nur die erste Hürde.

### Test 7 — Dateizugriff

1. Im Portal das hochgeladene Dokument öffnen.
2. Die Adresse aus der Adresszeile **kopieren**.
3. Ein **privates Fenster** öffnen (nicht angemeldet) und die Adresse
   einfügen.

**Erwartung:** Die Datei ist zunächst erreichbar (der Link ist signiert)
und **nach etwa einer Minute nicht mehr**.

4. **Wichtiger noch:** Aus der Adresse den signierten Teil entfernen (alles
   ab `?token=`) und die verbleibende Adresse im privaten Fenster öffnen.

**Erwartung:** **Kein Zugriff.** Wenn die Datei so erreichbar ist, ist der
Bucket öffentlich — bitte sofort melden.

> Bitte schicken Sie mir **keine** dieser Adressen. Die Beschreibung
> „erreichbar / nicht erreichbar" genügt.

### Test 8 — Fremder Zugriff (braucht das zweite Testkonto)

1. Mit dem **zweiten** Testfahrer anmelden.
2. Die Entwicklerwerkzeuge öffnen, Reiter **Konsole**.
3. Folgendes eingeben — es fragt gezielt nach den Daten des **ersten**
   Testfahrers:

```js
const c = await window.EmployeeSupabase.getClient?.() ?? null;
```

Falls `getClient` nicht verfügbar ist, genügt der einfachere Weg:
Im Portal des zweiten Kontos nachsehen, ob dort **nur** dessen eigene
Schichten, Urlaube und Dokumente stehen.

**Erwartung:** Kein Datensatz des ersten Testfahrers ist sichtbar — weder
Schicht noch Fahrzeug noch Dokument.

### Test 9 — Abmelden

Im Portal → Kürzel oben rechts → **Abmelden**.

**Erwartung:** Name und alle persönlichen Angaben verschwinden
**sofort**, dann landen Sie auf der Anmeldeseite.

| Stattdessen | Bedeutung |
|---|---|
| „Sie sind auf diesem Gerät abgemeldet. Der Abschluss der Abmeldung wurde allerdings nicht bestätigt …" | Der Dienst hat den Widerruf nicht bestätigt. Auf anderen Geräten kann die Anmeldung noch gelten — dort bitte ebenfalls abmelden |

**Danach:** `mitarbeiter.html` direkt in die Adresszeile eingeben.
**Erwartung:** Sie landen sofort wieder auf der Anmeldeseite, ohne dass
Portalinhalt aufblitzt.

### Test 10 — Am Handy

Tests 1, 2, 5 und 6 einmal am Handy wiederholen. Achten Sie auf:

- Zoomt die Seite beim Antippen eines Feldes? **Sollte sie nicht.**
- Ist etwas abgeschnitten oder lässt sich die Seite seitlich schieben?
- Sind die Flächen groß genug zum Treffen?

---

## Bereinigung — alle Testdaten wieder entfernen

**Bitte in dieser Reihenfolge**, sonst blockieren Verknüpfungen das
Löschen.

| # | Was | Wo |
|---|---|---|
| 1 | **Dokumenteinreichungen** des Testfahrers löschen | `admin/dokumentfristen.html` → Eingereichte Nachweise |
| 2 | **Datei im Speicher** prüfen | Supabase → Storage → `employee-documents` → Ordner des Testfahrers. Es darf **keine** Datei zurückbleiben |
| 3 | **Urlaubsantrag** `TESTANTRAG 029` löschen | Verwaltung, Urlaubsbereich |
| 4 | **Krankmeldung** (falls angelegt) löschen | Verwaltung, Abwesenheiten |
| 5 | **Schichten** von heute, morgen und übermorgen löschen | Schichtplanung |
| 6 | **Fahrzeug** `TESTWAGEN-029` löschen | `admin/fahrzeuge.html` |
| 7 | **Testdatei** auf der eigenen Platte löschen | `testdatei-029.pdf` und `.txt` |

**Endkontrolle:** Portal des Testfahrers neu laden. Es muss wieder
überall „frei" stehen und die Dokumentliste leer sein.

> **Reihenfolge 1 vor 2:** Eine Datei, die noch von einer Einreichung
> referenziert wird, lässt sich nicht entfernen — ein Trigger in
> Migration 011 verhindert das mit Absicht.

> **Was Sie NICHT löschen sollen:** das Testfahrer-Konto selbst, sein
> Mitarbeiterprofil und die Dokumentarten. Die werden weiter gebraucht.

---

## Was Sie mir zurückmelden — und was nicht

**Bitte melden:**

- Welcher Test welches Ergebnis hatte
- Den **Wortlaut** jeder Fehlermeldung
- Bei Test 7: „erreichbar" oder „nicht erreichbar", **ohne die Adresse**
- Bei Test 8: ob fremde Daten sichtbar waren
- Was am Handy auffiel

**Bitte NICHT schicken:**

- Passwörter
- Signierte Dateiadressen, Tokens, Schlüssel
- Bildschirmfotos mit echten Namen, Kennzeichen oder Dokumenten
- Echte Mitarbeiterdaten

---

## Anhang A — Protokoll der manuellen Tests am echten System

Hier wird nur festgehalten, **was** geprüft wurde und **wie es ausging**.
Keine Namen, keine E-Mail-Adressen, keine Kennungen, keine Zugangsdaten.

| Test | Datum | Ergebnis |
|---|---|---|
| **1 — Anmelden** | 29.09.2026 | **bestanden.** Anmeldung mit dem Testfahrer-Konto führte zur Weiterleitung auf `mitarbeiter.html`; die Begrüßung nannte die angemeldete Person und die Tageszeit. Vom Auftraggeber am echten System durchgeführt und bestätigt. |
| **Testfahrzeug anlegen** | 29.09.2026 | **bestanden.** `TESTWAGEN-029` / `GER-TEST 999` über `admin/fahrzeuge.html` angelegt; nach dem Neuladen weiterhin in der Liste. Damit ist belegt, dass die Verwaltung in die Tabelle `vehicles` schreiben kann. |

> **Was Test 1 belegt:** Der Anmeldeweg funktioniert gegen die produktive
> Instanz — Passwortprüfung, Profilprüfung (`active`, `employee_id`),
> Weiterleitung und die Anzeige der eigenen Identität.
>
> **Was er NICHT belegt:** ob fremde Daten abgewiesen werden, ob die
> Rollentrennung greift und ob Dateien im Speicher geschützt sind. Dafür
> stehen die Tests 4, 7 und 8 aus.
