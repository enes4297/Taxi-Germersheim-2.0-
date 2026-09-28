# Abschluss der öffentlichen Webseite — Bestandsaufnahme und Plan

Interne Arbeitsunterlage. Sie wird **nicht** mit ausgeliefert.

Stand: 23.09.2026. Aufgenommen auf `feature/016-rewards-yumak` (`c93b315`),
**fortgeschrieben nach Schritt 017 bis 020 und 022** auf `feature/022-gluecksrad-design`.

> **Was die Schritte 017 bis 020 und 022 erledigt haben, steht in Abschnitt 8 bis 12 am Ende.** Die
> Abschnitte 1 bis 7 sind der Befund vom 23.09.2026 und bleiben als
> Ausgangslage stehen; erledigte Punkte sind dort mit ✔ gekennzeichnet.

Grundlage ist der tatsächlich gebaute Ordner `dist-oeffentlich/` (318 Dateien),
nicht der Quelltext allein.

**Verbindliche Reihenfolge des Auftraggebers:**
1. Öffentliche Webseite vollständig fertigstellen ← *diese Unterlage*
2. Mitarbeiterportal
3. Dispatcher / Zentrale
4. Danach Rewards, Yumak und Spiele verbessern

Yumak, Rewards-Gestaltung und Spiele werden bis Punkt 4 **nicht**
weiterentwickelt.

---

## 0. Wie in dieser Unterlage geprüft wurde

Drei Aussagekraftstufen, durchgehend getrennt:

| Stufe | Bedeutung |
|---|---|
| **gemessen** | Im Browser (Chrome über Playwright) am gebauten Ordner nachgesehen oder per Dateivergleich festgestellt. |
| **simuliert** | Im Browser mit isolierten Testdaten geprüft; die echten Skripte waren dabei abgeklemmt. Sagt nichts über die produktive Instanz. |
| **ungeprüft** | Nicht ausgeführt. Wird als ungeprüft benannt, nicht als funktionierend. |

**Was in dieser Untersuchung NICHT geschehen ist:** keine Anmeldung, keine
Registrierung, kein Passwort-Reset, keine Nachricht versendet, kein Anruf,
kein Schreibzugriff auf die Datenbank, keine Hosting- oder Domaineinstellung
berührt. Die laufende WordPress-Seite wurde nicht abgerufen. Alle
Browser-Läufe liefen gegen einen lokalen Server; ausgehende Verbindungen
waren bis auf das Nachladen der Supabase-Bibliothek gesperrt.

---

## 1. Was fertig ist

### 1.1 Gebaut und geprüft

| Bereich | Stand | Nachweis |
|---|---|---|
| **Startseite** (`index.html`) | Vollständig im freigegebenen Design. Hero-Video, alle sieben Leistungen, Fahrtanfrage in drei Schritten, Flotte, Region, Rewards-Szene, Kontakt, Footer. | **gemessen**: 187 Prüfungen bestanden, Desktop und Mobil |
| **Rewards-Seite** (`rewards.html`) | Im neuen Design, echte Datenanbindung, vier Zustände, Gewinnverlauf, Abmelden leert persönliche Angaben. | **simuliert**: 66 Prüfungen mit Testdaten |
| **Ausgabeordner** | Bestand byteweise unverändert übernommen, nichts Internes dabei (keine SQL-Dateien, keine Dokumentation, keine Testbelege, keine Sichtproben). | **gemessen**: 86 Prüfungen bestanden |
| **Verweise** | Kein toter relativer Verweis auf keiner der 21 Wurzelseiten. Alle Bilder, Skripte und Stylesheets vorhanden. | **gemessen** |
| **Mobile Bedienung** | Kein waagerechter Überlauf auf einer der 21 Seiten, weder bei 1440 px noch bei 390 px. | **gemessen** |
| **Skriptfehler** | Keine auf einer der 21 Seiten. | **gemessen** |
| **Schriften** | 18 Dateien selbst ausgeliefert, kein Aufruf an Google Fonts. | **gemessen** |
| **Erreichbarkeit im Text** | Telefon, WhatsApp, E-Mail, Adresse und „rund um die Uhr" stehen auf den Kontaktseiten. | **gemessen** |
| **Mitarbeiterbereiche** | `admin/` (164 Dateien), `fahrer/` (8), `dashboard/` (1) unverändert im Ausgabeordner. Alle 64 internen Seiten tragen `noindex`. | **gemessen** |

### 1.2 Der Anmeldeweg ist technisch echt verdrahtet

Das ist wichtig zu trennen — **verdrahtet heißt nicht erprobt**:

| Funktion | Verdrahtung | Erprobung |
|---|---|---|
| Anmelden | `supabase.auth.signInWithPassword` | **ungeprüft** |
| Registrieren | `supabase.auth.signUp` mit Vor-/Nachname, Telefon | **ungeprüft** |
| Passwort vergessen | `resetPasswordForEmail` mit neutraler Rückmeldung (verrät nicht, ob es das Konto gibt) | **ungeprüft** |
| Neues Passwort setzen | `onAuthStateChange` → `PASSWORD_RECOVERY` → `updateUser` | **ungeprüft** |
| Abmelden | `signOut`, danach werden persönliche Angaben aus der Seite entfernt | **simuliert** |
| Rückkehr nach Anmeldung | `anmelden.html?weiter=…`, gegen feste Liste geprüft | **simuliert**, auch die Abweisung eines fremden Ziels |
| Rewards-Daten | `rpc('get_my_rewards_overview')`, Gewinne aus `rewards_wheel_spins` | **simuliert** |
| Gutscheine | `from('rewards_vouchers')` | **ungeprüft** |

Kein Service-Role-Schlüssel im Browser — nur der Publishable-Schlüssel.
**gemessen.**

### 1.3 Ehrliche Texte, keine erfundenen Daten

Nachgesehen und bestätigt — die Seiten behaupten nichts, was sie nicht haben:

- Die Fahrtanfrage sagt ausdrücklich, dass erst das Absenden in WhatsApp die
  Anfrage abschickt. Keine Entfernungen, keine Preise, keine Bestätigung.
- `live-fahrt.html`: „Derzeit liegen für dieses Kundenkonto keine verifizierten
  Live-Fahrtdaten vor … werden deshalb nicht simuliert."
- `meine-fahrten.html`: „Noch keine Fahrten verfügbar."
- `spezial-anfrage.html`: „Es findet keine automatische Übermittlung statt."
- Die Rewards-Seite zeigt ohne Anmeldung einen Gedankenstrich, keine Beispielzahlen.

---

## 2. Was fehlt oder nicht funktioniert

### 2.1 Der größte Posten: 19 von 21 Seiten tragen noch das alte Design

**gemessen.** Aus Astro kommen nur `index.html` und `rewards.html`. Alles
andere ist unverändertes Bestandsmaterial im alten Aussehen:

```
Bestand:  404  anmelden  datenschutz  flotte  hilfe-kontakt  impressum
          konto-einrichtung  kunden-einstellungen  kundenkonto  live-fahrt
          meine-fahrten  meinkonto  passwort-vergessen  passwort-zuruecksetzen
          registrieren  spezial-anfrage  spezialfahrten  spiele  wallet-gutscheine
Astro:    index  rewards
```

Wer von der neuen Startseite auf „Impressum" klickt, landet sichtbar in einer
anderen Webseite. Das ist der Hauptteil der verbleibenden Arbeit.

### 2.2 Gemessene Einzelfehler

| # | Fehler | Wo | Wirkung |
|---|---|---|---|
| ~~F1~~ | ~~**Zwei Fahrzeuge ohne Bild.**~~ **RICHTIGSTELLUNG vom 23.09.2026: kein Fehler.** Die `<img>`-Elemente von `b-klasse` und `tesla-y` haben zwar kein `src` — das Skript setzt `data-has-original-image="false"`, und `public-system.css:584` blendet den ganzen Bildbereich daraufhin aus und legt die Karte neu um. Nachgesehen im Browser: beide Karten stehen sauber als Textkarte mit allen Angaben da, keine leere Fläche. Mein erster Befund war am DOM gemessen, nicht am Sichtbaren. Offen bleibt allein, dass **zwei Fotos fehlen** — das ist Entscheidung E2, kein Programmfehler. | `flotte.html` | nichts zu tun |
| F2 | **`?page=why`, `?page=medical`, `?page=faq` werden nicht behandelt.** Die neue Startseite kennt nur `booking`, `rewards`, `help-public`, `services`, `home`. | 10 Verweise im Bestand | „Über uns" (5×), Krankenfahrten (4×), FAQ (1×) landen oben auf der Startseite statt am Abschnitt |
| F3 | **Geglückte Registrierung wird als Fehler angezeigt.** Braucht das Konto eine E-Mail-Bestätigung, wirft `signUp` einen Fehler, den `registrieren.html` in den roten Fehlerkasten schreibt. | `customer-auth.js:367`, `registrieren.html:285` | Der Kunde hält eine erfolgreiche Registrierung für gescheitert |
| F4 | **Kein Konto-Einstieg auf der neuen Startseite.** Sie lädt `customer-auth.js` gar nicht, zeigt also nie „Mein Konto". Ein einziger Anmelde-Verweis, im Footer. | `index.html` | Angemeldete Kunden sehen das nicht; abgemeldete finden den Einstieg schwer |
| F5 | **Gemischte Anrede.** Neue Seiten siezen, acht Bestandsseiten duzen. `hilfe-kontakt.html` tut beides nebeneinander: „Rufen Sie uns direkt an" neben „Schreib uns direkt". | 8 Seiten | Wirkt wie zwei verschiedene Unternehmen |
| F6 | **Umlaute in sichtbarem Text transliteriert.** „Das Passwort erfuellt noch nicht alle Regeln", „Persoenliche Daten", „Praeferenzen", „Zurueck". Die Projektregel verlangt hier echte Umlaute. | `registrieren.html:256`, `konto-einrichtung.html` | Sichtbar unsauber |
| F7 | **`tel:072743567`** statt `tel:+4972743567` auf 5 Verweisen. | 5 Stellen | Aus dem Ausland und auf manchen Geräten nicht wählbar |
| F8 | **Demo-Seite im Auslieferstand.** `konto-einrichtung.html` legt das Konto nur im Browser ab („Demo ohne echte Kontosicherheit") und nutzt `customer-auth-demo.js`. Von keiner Seite verlinkt, aber über die Adresse erreichbar. | `konto-einrichtung.html` | Gehört so nicht auf die Domain |
| F9 | **Tote Datei im Auslieferstand.** `customer-journey-demo.js` (499 Zeilen) wird von keiner Seite geladen. | Wurzel | Unnötiger Ballast |

### 2.3 Suchmaschinen-Grundlagen — die Lücke vor dem WordPress-Tausch

**gemessen.** Für eine Seite, die eine bestehende, indexierte WordPress-Seite
ablösen soll, ist das der kritischste Block:

| Fehlt | Bemerkung |
|---|---|
| **`robots.txt`** | nicht vorhanden |
| **`sitemap.xml`** | nicht vorhanden |
| **Favicon** | auf **keiner** der 21 Seiten ein `rel="icon"` |
| **`canonical` auf der Startseite** | fehlt; 7 Bestandsseiten haben eins, die neue Startseite nicht |
| **`og:`-Angaben auf der Startseite** | fehlen; beim Teilen per WhatsApp entsteht keine Vorschaukarte — ausgerechnet auf dem Kanal, über den die Fahrtanfragen laufen |
| **Strukturierte Daten** | kein `application/ld+json` auf der ganzen Seite. Für ein örtliches Taxiunternehmen (`LocalBusiness` / `TaxiService` mit Adresse, Telefon, Erreichbarkeit) ist das der größte einzelne Hebel |
| **Absolute `canonical`-Adressen** | die vorhandenen sind relativ (`href="flotte.html"`) statt vollständig |

### 2.4 Ladeverhalten

**gemessen** am gebauten Ordner:

| | bis `load` | Hero-Video danach | Summe |
|---|---|---|---|
| Startseite Desktop | 1,65 MB (LCP ~770 ms) | `hero-1080.webm` 23,4 MB | **~25 MB** |
| Startseite Mobil | 1,03 MB (LCP ~420 ms) | `hero-720.webm` 8,9 MB | **~10 MB** |
| Rewards Desktop | 0,69 MB (LCP ~410 ms) | — | 0,69 MB |

Die erste Anzeige ist schnell — die Bremse greift, das Video kommt erst nach
dem Laden und im Leerlauf. Die **Datenmenge** bleibt trotzdem hoch. Das ist
keine Designfrage, sondern eine Mengenfrage; die freigegebene Gestaltung
bleibt davon unberührt.

Dazu: **32 von 33 Yumak-Dateien werden derzeit nicht abgerufen** (≈ 11 MB im
Ausgabeordner), weil die Kundenansicht nur das Standbild zeigt. Die kleinen
Fassungen `*-klein.mp4` werden vom Bauteil **überhaupt nie** verwendet — auch
auf dem Handy lädt es `-gross`. Aufräumen, wenn Yumak an die Reihe kommt.

### 2.5 Barrierefreiheit

**gemessen**, nur Grundlagen:

- Kein **Sprunglink** („Zum Inhalt springen") auf einer einzigen Seite.
- Die neue Startseite hat **kein `<main>`** (die Bestandsseiten haben eins).
- Genau eine `<h1>` je Seite, Überschriftenordnung plausibel. Kein `<img>` ohne `alt`.
- Anfassflächen unter 40 px: Startseite 51 von 111 bedienbaren Elementen
  (überwiegend Navigations- und Fußzeilenverweise). Kein Prüfurteil, ein Messwert.
- **Nicht geprüft:** Farbkontraste, Tastaturbedienung im Detail, Screenreader.

### 2.6 Abhängigkeit von einem fremden Netz

**gemessen** — und der Beleg war eindeutig: Sperrt man `cdn.jsdelivr.net`,
melden **19 von 20 Seiten Skriptfehler**; nur die neue Startseite bleibt
unversehrt. `passwort-zuruecksetzen.html` bricht mit
`PASSWORD_RECOVERY_UNAVAILABLE` ab.

Ursache: `customer-auth.js:63` lädt die Supabase-Bibliothek zur Laufzeit von
`https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2` — **ohne feste
Version** und ohne Integritätsprüfung.

Drei Folgen, nüchtern benannt:
1. **Verfügbarkeit:** Fällt der CDN aus, funktioniert die Anmeldung nicht.
2. **Änderungsrisiko:** `@2` liefert jeweils die neueste 2.x. Was morgen
   ausgeliefert wird, ist heute nicht festgelegt.
3. **Datenschutz:** Beim Aufruf geht die IP-Adresse jedes Besuchers an einen
   Dritten. In der Datenschutzerklärung steht davon nichts.

Die Bibliothek lässt sich stattdessen mitliefern. Das ist gut machbar und
hängt an keiner Entscheidung.

### 2.7 Impressum und Datenschutz — Inhalt, nicht Bewertung

> **Keine rechtliche Freigabe und keine rechtliche Bewertung.** Was folgt,
> ist ein Abgleich des vorhandenen Textes mit dem, was die Seite technisch
> tatsächlich tut. Die Prüfung, was erforderlich ist, gehört zu einem
> Rechtsbeistand.

**Im Impressum vorhanden:** Firma, Anschrift, Telefon, E-Mail,
Geschäftsführung (zwei Personen), Registergericht Landau, HRB 33841,
Steuernummer, Genehmigungsbehörde Kreisverwaltung Germersheim.

**Im Impressum nicht vorhanden:** Umsatzsteuer-Identifikationsnummer (angegeben
ist eine Steuernummer — das sind zwei verschiedene Dinge), Hinweis zur
EU-Streitbeilegungsplattform, inhaltlich Verantwortlicher.

**In der Datenschutzerklärung vorhanden:** Verantwortlicher, erhobene Daten bei
Buchungsanfragen, Zweck, Rechtsgrundlage (Art. 6 Abs. 1 lit. b und f DSGVO),
Speicherdauer, Weitergabe, Betroffenenrechte, Kontakt.

**Was die Seite tut, wovon die Erklärung nichts sagt:**

| Tatsächliches Verhalten | Belegt durch |
|---|---|
| **WhatsApp ist der Hauptweg der Fahrtanfrage** — Daten gehen an Meta | 12 `wa.me`-Verweise, die Fahrtanfrage endet dort |
| **Supabase** speichert Konten, Punkte, Gewinne; Serverstandort nicht genannt | `admin/supabase-config.js` |
| **jsdelivr** erhält die IP jedes Besuchers | `customer-auth.js:63` |
| **Kundenkonto, Anmeldung, Rewards-Programm, Gewinnverlauf** kommen nicht vor | Rewards-Seite, Kontoseiten |
| **Im Browser gespeicherte Daten** (Sitzungsmerkmal, Zustimmung, Profil) | `localStorage`-Nutzung |
| Hinweis auf das **Beschwerderecht bei der Aufsichtsbehörde** | fehlt im Text |
| **Google Maps** wird im Zustimmungsbanner genannt, in der Erklärung nicht | Bannertext gegen Erklärungstext |

**Technische Einbindung, gemessen:**

- Das Zustimmungsbanner steht nur auf **3 von 21 Seiten**
  (`datenschutz`, `flotte`, `impressum`). Auf der neuen Startseite und auf
  allen Kontoseiten fehlt es.
- Auf **4 Seiten fehlt der Verweis auf Datenschutz und Impressum**
  (`konto-einrichtung`, `kundenkonto`, `live-fahrt`, `spiele`).
- Der Google-Maps-Schlüssel steht auf dem Platzhalter
  `YOUR_GOOGLE_MAPS_API_KEY` (`script.js:183`). **Maps wird derzeit nirgends
  geladen**, die Adressvervollständigung fällt still in einen Ersatzmodus.
  Die übrigen Google-Verweise sind reine Links, keine Einbettungen.
- Die Registrierung verlangt ein Häkchen auf **„Nutzungsbedingungen"** — der
  Verweis zeigt auf `datenschutz.html`. **Eine Seite mit Nutzungsbedingungen
  gibt es nicht** (`registrieren.html:105`).

### 2.8 Die Fahrtanfrage, vollständig verfolgt

**gemessen**, ohne dass eine Nachricht versendet wurde:

```
Startseite → Leistung wählen (7 Knöpfe) → Dialog öffnet an Ort und Stelle
   → Schritt 1 gewählte Leistung sichtbar
   → Schritt 2 Abholadresse, Zieladresse, Datum, Uhrzeit
   → Schritt 3 Zusammenfassung
   → „In WhatsApp übernehmen" → wa.me/4972743567 mit vorausgefülltem Text
   → HIER ENDET DIE KETTE
```

Alles daran arbeitet: alle sieben Knöpfe, die Adressübernahme, die Nachricht
mit Leistung und beiden Adressen, die ehrliche Beschriftung. Telefon steht
gleichwertig daneben.

**Wo die Kette endet:** Der Kunde muss die Nachricht selbst abschicken. Danach
existiert die Anfrage **nur in WhatsApp**. Es gibt keine Bestätigung, keine
Vorgangsnummer, keinen Eintrag, keine Übersicht für die Zentrale.

**Warum `meine-fahrten.html` immer leer bleiben wird** — nachgesehen in
`002_rls_policies.sql`: Die Tabelle `public.rides` hat genau die passenden
Felder (`pickup`, `destination`, `ride_date`, `ride_time`, `ride_type`,
`passengers`, `note`), aber **alle vier Policies lauten auf
`private.is_dispatcher_or_admin()`**. Ein angemeldeter Kunde darf dort weder
schreiben noch lesen. Dasselbe gilt für `public.customers`.

→ Daraus folgt Entscheidung **E1** in Abschnitt 4.

### 2.9 Voraussetzungen für die Ablösung von WordPress

| Punkt | Stand |
|---|---|
| Läuft an der Domainwurzel | **Voraussetzung, gemessen**: 39 wurzelabsolute Verweise in den Astro-Seiten (`/assets/…`, `/_astro/…`, `/schriften/…`). Ein Unterpfad erfordert `base` in `astro.config.mjs` |
| Ausgabeordner vollständig | **ja**, 318 Dateien, 108 MB, `npm ci && npm run build` |
| Adressen der heutigen WordPress-Seite | **unbekannt** — die Seite wurde nicht abgerufen. Ohne diese Liste laufen bestehende Verweise und Suchtreffer ins Leere |
| 301-Weiterleitungen alt → neu | **offen**, hängt an der Liste |
| Supabase „Site URL" und „Redirect URLs" | **offen**. `signUp` übergibt kein `emailRedirectTo` — die Bestätigungsmail benutzt die im Projekt hinterlegte Site URL. Der Passwort-Reset verlangt, dass `https://taxigermersheim.de/passwort-zuruecksetzen.html` freigeschaltet ist. Sonst brechen beide Mailwege nach dem Umzug |
| Mitarbeiterbereiche unter derselben Domain | **Tatsache**: `admin/` und `fahrer/` liegen im Auslieferordner, tragen `noindex`, sind aber über die Adresse erreichbar. Der Zugriffsschutz sitzt in Supabase. Ob das so gewollt ist, ist zu entscheiden |
| `404.html` als Fehlerseite des Servers | **offen**, Servereinstellung |
| HTTPS, `www` → ohne `www` | laut Auskunft vorhanden |
| Korrekturen aus `feature/011` | **erledigt am 28.09.2026** — die vier Code-Korrekturen sind übernommen, siehe Abschnitt 20.6. Die SQL-Einspielung bleibt bewusst auf ihrem Branch und gehört zum Admin-/Dispatcher-Paket |

---

## 3. Was ich selbst erledigen kann

Ohne Rückfrage, ohne fremde Angaben, ohne die freigegebene Gestaltung
anzutasten:

| # | Arbeit | Aufwand |
|---|---|---|
| **A1** | Suchmaschinen-Grundlagen: `robots.txt`, `sitemap.xml`, Favicon, `canonical` und `og:`-Angaben auf allen Astro-Seiten, `LocalBusiness`/`TaxiService`-Daten aus `inhalte.ts` | klein |
| **A2** | Supabase-Bibliothek mitliefern statt vom CDN nachladen — feste Version im Projekt | klein |
| **A3** | F1 Fahrzeugbilder, F2 `?page=`-Einstiege, F3 Registrierungsmeldung, F6 Umlaute, F7 `tel:`-Format | klein |
| **A4** | F4 Konto-Einstieg im Kopf der neuen Seiten, mit „Mein Konto" bei bestehender Sitzung | klein |
| **A5** | Sprunglink und `<main>` auf den Astro-Seiten; Anfassflächen nachmessen | klein |
| **A6** | F8/F9 aus der Übernahmeliste nehmen (`konto-einrichtung.html`, `customer-journey-demo.js`, `customer-auth-demo.js`) | sehr klein |
| **A7** | Zustimmungsbanner und Rechtsverweise auf allen Seiten vereinheitlichen — **Technik**, nicht Textinhalt | mittel |
| **A8** | F5 Anrede vereinheitlichen, sobald die Richtung feststeht (→ E3) | mittel |
| **A9** | Rechtsseiten nach Astro: `impressum`, `datenschutz`, `hilfe-kontakt`, `404` — **bestehender Text unverändert**, nur neues Gewand | mittel |
| **A10** | `flotte.html` und `spezialfahrten.html` nach Astro — Inhalte liegen in `inhalte.ts` bereits vollständig vor, samt sauberer Fahrzeugbilder in zwei Größen | mittel |
| **A11** | Kontoseiten nach Astro: `anmelden`, `registrieren`, `passwort-vergessen`, `passwort-zuruecksetzen`, `meinkonto`, `kunden-einstellungen`, `meine-fahrten`, `wallet-gutscheine`, `live-fahrt` — **ohne `customer-auth.js` umzuschreiben** | groß |
| **A12** | Einen Prüflauf ergänzen, der jede öffentliche Seite auf Verweise, Skriptfehler, Überlauf, Rechtsverweise und Suchmaschinen-Grundlagen prüft | mittel |

---

## 4. Was eine Entscheidung oder Angaben braucht

### Von Ihnen

| # | Frage | Warum sie blockiert |
|---|---|---|
| **E1** | **Echte Online-Annahmestelle für Fahrtanfragen — ja oder nein?** Heute endet die Anfrage in WhatsApp. Eine echte Annahme braucht eine neue Migration (Kunden dürfen auf `rides` weder schreiben noch lesen) **und** eine Stelle in der Zentrale, an der die Anfrage ankommt und beantwortet wird. Damit hängt sie an Punkt 3 Ihrer Reihenfolge. **Meine Empfehlung: als eigenen Vorgang nach der Zentrale führen, nicht in den Abschluss der öffentlichen Seite ziehen.** Bis dahin bleibt WhatsApp/Telefon — es ist ehrlich beschriftet und es funktioniert | ohne Entscheidung bleibt `meine-fahrten.html` dauerhaft leer |
| **E2** | **Zwei Fahrzeugfotos fehlen**: Mercedes B-Klasse (GER TX 500) und Tesla Model Y (GER TX 700). Gibt es diese Fahrzeuge noch? Wenn ja: Fotos. Wenn nein: aus der Flotte nehmen | F1 und die neue Flottenseite |
| **E3** | **Anrede: „Sie" oder „du"?** Die neue Startseite siezt. Acht Bestandsseiten duzen. Ich empfehle durchgehend „Sie" — es passt zum freigegebenen Text und zur Kundschaft von Krankenfahrten | A8, A9, A11 |
| **E4** | **Nutzungsbedingungen**: Die Registrierung lässt sie bestätigen, es gibt sie nicht. Schreiben lassen — oder das Häkchen auf die Datenschutzhinweise beschränken? | A11 |
| **E5** | **`?page=why` („Über uns", 5 Verweise)**: auf `#region` leiten, oder soll ein eigener „Über uns"-Abschnitt entstehen? | F2 |
| **E6** | **Impressum und Datenschutz zur rechtlichen Prüfung geben.** Ich habe die inhaltlichen Lücken in 2.7 aufgelistet. Die Bewertung gehört zu einem Rechtsbeistand — ich gebe dazu keine Freigabe | vor Veröffentlichung |
| **E7** | **`spezial-anfrage.html`**: zweiter Anfrageweg neben dem neuen Dialog. Behalten oder auf den Dialog zusammenführen? | A11 |
| **E8** | **Datenmenge des Hero-Videos**: ~23 MB Desktop, ~9 MB Mobil. Die Gestaltung bleibt unangetastet — es ginge nur um eine sparsamere Fassung derselben Aufnahme. So lassen oder ansehen? | freiwillig |

### Vom IT-Dienstleister

| # | Angabe | Wofür |
|---|---|---|
| **I1** | **Liste aller Adressen der heutigen WordPress-Seite.** Am einfachsten deren `sitemap.xml`, sonst ein Bildschirmfoto der Seitenübersicht im WordPress-Menü | 301-Weiterleitungen, sonst brechen Suchtreffer und verteilte Verweise weg |
| **I2** | **Supabase-Projekteinstellungen.** ⚠️ **Seit dem 28.09.2026 kein offener Punkt mehr, sondern ein belegter Fehler** — siehe Abschnitt 17. Der Kunden-Reset landet auf der alten Site URL `http://127.0.0.1:8000/admin/login.html`, obwohl die Kundenseite nachweislich das richtige Ziel sendet. **Zuerst zu klären: Verwendet die Recovery-Mailvorlage `{{ .ConfirmationURL }}`?** Danach die Empfehlung aus Abschnitt 19.2 | Ohne das kommt kein Kunde ins Konto zurück, der sein Passwort vergisst |
| **I3** | **Wie wird ausgeliefert?** Statischer Webspace, Objektspeicher, Container? Wer spielt `dist-oeffentlich/` ein? | Bauanleitung und Übergabeform |
| **I4** | **Kann `404.html` als Fehlerseite gesetzt werden?** | Fehlerseite |
| **I5** | **Sollen `admin/` und `fahrer/` unter derselben Domain liegen** oder auf eine eigene Subdomain? | Zuschnitt des Ausgabeordners |
| **I6** | **Google-Maps-Schlüssel** — gibt es einen? Nur nötig, wenn die Adressvervollständigung zurückkommen soll | derzeit Platzhalter, Maps lädt nicht |

> **Zu keiner dieser Angaben gehören Zugangsdaten.** Für eine echte
> Anmeldeprüfung melden Sie sich selbst mit einem Testkonto an und sagen mir,
> was Sie sehen — ich erhalte und protokolliere keine Zugangsdaten.

---

## 5. Reihenfolge nach Abhängigkeit

```
STUFE 0 — unabhängig, sofort, blockiert nichts
   A1 Suchmaschinen-Grundlagen
   A2 Supabase-Bibliothek mitliefern
   A3 fünf Einzelfehler
   A5 Sprunglink und <main>
   A6 Demo-Dateien aus der Auslieferung
   A12 Prüflauf für alle öffentlichen Seiten

STUFE 1 — braucht nur eine kurze Antwort
   E3 Anrede  ──────────────► A8
   E5 „Über uns"-Ziel ──────► F2 fertig
   E2 zwei Fahrzeugfotos ───► A10

STUFE 2 — Seiten ins neue Gewand, aufsteigendes Risiko
   A9  Rechtsseiten          (kein Backend berührt)
   A10 Flotte, Spezialfahrten (kein Backend berührt)
   A7  Banner und Rechtsverweise vereinheitlichen
   A11 Kontoseiten           (echte Anmeldung hängt dran)

STUFE 3 — vor der Veröffentlichung, nicht davor lösbar
   feature/011 Code-Korrekturen                 ← erledigt (Schritt 027)
   E6 rechtliche Prüfung der Rechtstexte        ← blockierend
   I1 Adressliste WordPress → Weiterleitungen   ← blockierend
   I2 Passwort-Reset Kunde reparieren            ← blockierend, belegt
   eigener SMTP-Dienst statt 2 Mails/Stunde      ← blockierend, belegt
   SPF, DKIM, DMARC fuer die Domain              ← blockierend
   taxigermersheim.de in die Redirect URLs       ← blockierend
   I3–I5 Auslieferung klären
   echte Anmeldeprüfung mit Ihrem Testkonto

EIGENER VORGANG, NACH DER ZENTRALE
   E1 echte Online-Annahmestelle
```

**Warum diese Ordnung:** Stufe 0 ist reiner Gewinn ohne Rückfrage und macht
gleichzeitig den Ballast weg, den man sonst in jede neue Seite mitschleppt.
A2 zuerst, weil jede weitere Seite sonst dieselbe CDN-Abhängigkeit erbt. A9
vor A11, weil die Rechtsseiten kein Backend berühren — dort lässt sich das
Seitengerüst für alle Unterseiten in Ruhe einfahren, bevor die echte
Anmeldung daran hängt.

---

## 6. Empfehlung für das nächste Arbeitspaket

> **Schritt 017 — Grundlagen und Einzelfehler.**
> Branch `feature/017-grundlagen` von `feature/016-rewards-yumak`.

Inhalt: **A1, A2, A3, A5, A6, A12.**

| Warum dieses Paket | |
|---|---|
| Keine Entscheidung nötig | Es kann sofort losgehen |
| Keine Gestaltungsfrage | Die freigegebene Startseite und das Hero-Video bleiben unangetastet |
| Kein Backend berührt | Authentifizierung, Berechnungen, Berechtigungen, Datenbankstruktur bleiben, wie sie sind |
| Räumt vor dem großen Teil auf | Jede später umgestellte Seite erbt sonst CDN-Abhängigkeit und fehlende Grundlagen |
| Beseitigt die einzige echte Ausfallstelle | Ohne A2 hängt die Anmeldung an einem fremden Netz |
| Überschaubar | Alle sechs Punkte sind klein und einzeln prüfbar |

**Nicht in diesem Paket:** keine Seite ins neue Gewand (das ist Schritt 018
und folgende), kein Yumak, keine Rewards-Gestaltung, keine Spiele, keine
Änderung an Hosting oder Domain.

**Ergebnis am Ende:** Ausgabeordner ohne Demo-Dateien und ohne fremdes CDN,
mit `robots.txt`, `sitemap.xml`, Favicon, Vorschaukarte und strukturierten
Daten; fünf gemessene Einzelfehler behoben; ein Prüflauf, der alle
öffentlichen Seiten abdeckt statt nur zwei.

---

## 7. Was diese Unterlage NICHT belegt

- **Kein einziger echter Anmeldevorgang.** Anmelden, Registrieren,
  Passwort-Reset und Gutscheine sind **verdrahtet, nicht erprobt**.
- Die Rewards-Kontodarstellung ist **mit Testdaten** geprüft, nicht gegen die
  produktive Instanz.
- Impressum und Datenschutz sind **inhaltlich abgeglichen, nicht rechtlich
  bewertet**. Hier wird keine Freigabe erteilt.
- Die laufende WordPress-Seite wurde **nicht abgerufen**.
- Farbkontraste, Tastaturbedienung und Screenreader sind **nicht geprüft**.
- Der offene Yumak-Startfehler ist **weiterhin offen** und wurde
  auftragsgemäß nicht untersucht.

---

## 8. Schritt 017 — Grundlagen und Einzelfehler (erledigt)

Branch `feature/017-grundlagen`, abgezweigt von `feature/016-rewards-yumak`
(`c93b315`). Die beiden Planungsunterlagen sind dabei mitgenommen worden.

### 8.1 Suchmaschinen- und Teilen-Grundlagen ✔

| Was | Wie |
|---|---|
| **Titel und Beschreibungen** | waren auf beiden Astro-Seiten schon vorhanden und bleiben unverändert |
| **canonical** | jetzt auf **allen 20** ausgelieferten Seiten, mit vollständiger Adresse. Die Startseite bekommt bewusst `https://taxigermersheim.de/` und nicht `/index.html` — sonst konkurrieren zwei Adressen für dieselbe Seite |
| **Open Graph** | auf den Astro-Seiten: Titel, Beschreibung, Adresse, Bild 1200 × 630, Alternativtext, `twitter:card`. Damit entsteht beim Teilen per WhatsApp eine Vorschaukarte — auf dem Kanal, über den die Fahrtanfragen laufen |
| **Vorschaubild** | **Ausschnitt einer echten Aufnahme** unserer E-Klasse GER TX 100, nur zugeschnitten und verkleinert. Keine Montage, keine aufgesetzte Schrift |
| **Favicon** | aus dem vorhandenen Markenzeichen `tg-icon-original.png` erzeugt: `favicon.ico` (32), `favicon-192/512.png`, `apple-touch-icon.png` (180, mit Grund `#18181b`, weil iOS sonst Schwarz hinter die Transparenz legt). Auf allen 20 Seiten verlinkt |
| **sitemap.xml** | **9 Seiten**, ausdrückliche Liste, kein Glob: Start, Rewards, Spiele, Flotte, Spezialfahrten, Spezialanfrage, Hilfe/Kontakt, Impressum, Datenschutz |
| **Ausschluss** | **11 Seiten** tragen `noindex,follow`: alle Kontoseiten und die Fehlerseite. `meinkonto.html` und `kundenkonto.html` standen auf `index,follow` — in der **Quelldatei** korrigiert |
| **Strukturierte Daten** | `TaxiService` auf der Startseite mit Name, Anschrift, Rufnummer, E-Mail, Einsatzgebiet und den sieben Leistungen |

**robots.txt sperrt bewusst nichts.** Zwei Gründe, beide in der Datei selbst
nachzulesen: Sie ist öffentlich lesbar — eine Liste gesperrter Pfade wäre nur
ein Wegweiser dorthin. Und eine per `Disallow` gesperrte Seite wird gar nicht
abgerufen, also auch das `noindex` darin nicht gelesen; eine bereits
aufgenommene Adresse bliebe im Verzeichnis stehen. Der Ausschluss läuft
deshalb über `noindex` im Seitenkopf, der Zugriffsschutz über die Anmeldung
und die Datenbankregeln.

**Nur belegte Angaben in den strukturierten Daten.** Ausdrücklich **nicht**
ausgezeichnet, jeweils mit Begründung im Quelltext: die Google-Bewertung
(5,0 aus 230+ — fremde Plattform, nicht nachgeprüft, und eine selbst
ausgezeichnete Bewertung ist genau das, was Suchmaschinen als
Selbstauszeichnung behandeln), eine Koordinate (haben wir nicht), ein
Preisrahmen (gibt es im Projekt nicht), eine USt-IdNr. (im Impressum steht
eine Steuernummer — das ist etwas anderes). Die Erreichbarkeit „rund um die
Uhr" ist aufgenommen, weil die Seite das selbst schon sagt.

**Lokale Vorschau und Veröffentlichung sind getrennt.** `site` in
`astro.config.mjs` steht auf `https://taxigermersheim.de`, damit canonical,
Open Graph und sitemap.xml vollständige Adressen tragen — das verlangen
Suchmaschinen und Messengerdienste. In der lokalen Vorschau stehen diese
Angaben also bereits auf der späteren Domain. Das sind Textangaben im
Seitenkopf, keine Weiterleitung: Wer lokal klickt, bleibt lokal.
**Veröffentlicht wurde nichts.**

### 8.2 Supabase-Bibliothek jetzt mitgeliefert ✔

`@supabase/supabase-js` **2.117.0**, fest genagelt, unter
`vendor/supabase-js-2.117.0.js`. Es ist dieselbe Datei, die jsdelivr unter
`@supabase/supabase-js@2` ausgeliefert hat (in der `package.json` des Pakets
als `"jsdelivr": "dist/umd/supabase.js"` benannt) — nur eben selbst
mitgeliefert und auf eine Version festgelegt.

**Der Nachweis, gemessen:** Bei hart gesperrter Außenverbindung laden jetzt
**alle 19 Seiten fehlerfrei**, auf Desktop und Mobil — und es wird **kein
einziger Abruf nach draußen versucht**. Vorher meldeten unter denselben
Bedingungen 19 von 20 Seiten Skriptfehler, `passwort-zuruecksetzen.html`
brach mit `PASSWORD_RECOVERY_UNAVAILABLE` ab.

Damit sind drei Dinge zugleich erledigt: Die Anmeldung hängt nicht mehr an
einem fremden Netz, was ausgeliefert wird, ist festgelegt, und die IP-Adresse
der Besucher geht nicht mehr an einen Dritten.

**Nicht angefasst:** `admin/supabase-auth.js`, `admin/taxi-data-service.js`
und `fahrer/employee-supabase.js` laden weiterhin vom CDN. Das ist Absicht —
Zentrale und Mitarbeiterportal sind Punkt 2 und 3 der Reihenfolge. Ebenfalls
unverändert: Datenbank, Berechtigungen, Punkteberechnung, alle Aufrufe und
der Ablauf der Anmeldung selbst.

### 8.3 Einzelfehler ✔

| # | Stand |
|---|---|
| F1 | **kein Fehler** — Richtigstellung, siehe 2.2. Die beiden Fahrzeuge ohne Foto werden bereits sauber als Textkarte dargestellt. **Es wurde kein Bild erfunden.** Offen bleibt E2: zwei echte Fotos fehlen |
| F2 | `?page=why` → `#region`, `?page=medical` → `#leistung-krankenfahrten`, `?page=faq` → `#kontakt`. **Gemessen:** alle drei landen am Abschnitt, Desktop und Mobil |
| F3 | Wartet das Konto auf die E-Mail-Bestätigung, wirft `signUp` keinen Fehler mehr; `registrieren.html` zeigt einen grünen Hinweis mit der Adresse, an die die Mail ging, und bleibt stehen |
| F4 | Konto-Einstieg im Kopf (Desktop und mobiles Menü) und in der Fußzeile |
| F5 | **72 Ersetzungen** in 13 Dateien, durchgehend „Sie" |
| F6 | „erfuellt" → „erfüllt"; die übrigen transliterierten Texte standen in `konto-einrichtung.html`, die jetzt nicht mehr ausgeliefert wird |
| F7 | *offen* — die fünf `tel:072743567` stehen in Bestandsseiten, die in Schritt 018 ohnehin neu entstehen. Sie funktionieren aus Deutschland |
| F8/F9 | `konto-einrichtung.html`, `customer-auth-demo.js`, `customer-journey-demo.js` aus der Auslieferung genommen |

**Zum Konto-Einstieg, weil es um eine Behauptung geht:** Der Ausgangszustand
ist „Anmelden". Auf „Mein Konto" wird **nur** umgestellt, wenn eine Sitzung
tatsächlich festgestellt wurde — nie in die andere Richtung, und nie geraten.
Zuerst wird im Browserspeicher nachgesehen, ob überhaupt ein
Supabase-Sitzungsschlüssel (`sb-…-auth-token`) vorliegt; nur dann wird die
Bibliothek geladen und `hydrateSession()` befragt. Liegt nichts vor, gibt es
sicher keine Sitzung — und die 213-kB-Bibliothek muss gar nicht erst geladen
werden. Fällt die Prüfung aus, bleibt „Anmelden" stehen; der Weg funktioniert
dann immer noch, er ist nur einen Klick länger.

**Zu F8:** `konto-einrichtung.html` ist eine ausdrückliche Demo („Demo ohne
echte Kontosicherheit"), die das Konto nur im Browser anlegt. Nachgesehen,
nicht vermutet: Sie verlangt den Sitzungsschlüssel
`taxiCustomerDemoRegistrationDraft`, den **keine** Datei im Projekt setzt —
auch `registrieren.html` nicht. Kein Verweis führt auf sie. **Es geht keine
Kundenfunktion verloren.** `auth-demo.css` bleibt dagegen dabei: trotz des
Namens eine echte Stilvorlage von elf Kontoseiten.

### 8.4 Bedienung und Ausgabe ✔

- **Sprungmarke** „Zum Inhalt springen" auf beiden Astro-Seiten, sichtbar
  beim ersten Tabulatorsprung. **Gemessen:** 175 × 40 px, im Bild, Desktop
  und Mobil. Auf der Startseite zusätzlich „Direkt zur Fahrtanfrage" — die
  gab es schon.
- **Hauptinhaltsbereich** `<main id="inhalt">` jetzt auch auf der Startseite.
- **Tastaturfokus:** nachgemessen auf zehn Seiten, 28 Tabulatorsprünge je
  Seite. Sichtbar überall bis auf zwei Felder in `spezial-anfrage.html` —
  unsichtbare Stellvertreter (1 × 1 px, `opacity: 0`) hinter einer sichtbaren
  Schaltfläche. Wer dorthin tabbte, sah den Fokus verschwinden. Sie sind
  jetzt mit `tabIndex = -1` aus der Tabulatorfolge genommen; die sichtbare
  Schaltfläche davor hat ihren eigenen Fokusring.
- **Startseite, Hero-Video und dessen Verhalten** sind unangetastet — 187
  Prüfungen unverändert bestanden.
- **Yumak** bleibt Standbild. An Rewards und Spielen wurde nichts
  weiterentwickelt; in `spiele.html` wurde ausschließlich die Anrede geändert.

### 8.5 Rechtstexte — unverändert, Abweichungen dokumentiert

**An Impressum und Datenschutzerklärung wurde inhaltlich nichts geändert.**
Es wurden keine Pflichtangaben, keine Einwilligungen und keine
Nutzungsbedingungen erfunden, und es wird **keine rechtliche Freigabe
behauptet**. Die offenen Punkte stehen unverändert in Abschnitt 2.7:

- Impressum: keine USt-IdNr. (angegeben ist eine Steuernummer), kein Hinweis
  zur EU-Streitbeilegungsplattform, kein inhaltlich Verantwortlicher.
- Datenschutzerklärung: WhatsApp als Hauptweg der Fahrtanfrage, Supabase,
  Kundenkonto, Rewards-Programm, Gewinnverlauf, im Browser gespeicherte Daten
  und das Beschwerderecht bei der Aufsichtsbehörde kommen dort nicht vor.
- Die Registrierung lässt „Nutzungsbedingungen" bestätigen, die es als
  Dokument nicht gibt (Entscheidung E4).
- Das Zustimmungsbanner steht weiterhin nur auf 3 von 20 Seiten (A7).

**Eine technische Abweichung hat sich durch Schritt 017 verkleinert:** Der
Bannertext sagt, externe Dienste würden erst nach Zustimmung geladen. Für
Google Maps stimmte das schon vorher (der Schlüssel ist ein Platzhalter,
Maps lädt nirgends). Für jsdelivr stimmte es **nicht** — dieser Abruf ist
jetzt ersatzlos weg.

### 8.6 Was geprüft wurde — und was nicht

**Echt geprüft am gebauten Ergebnis:**

| Lauf | Ergebnis |
|---|---|
| `ausgabe-pruefen` | **86 / 86** — Bestand byteweise unverändert, nichts Internes dabei |
| `grundlagen-pruefen` (neu) | **63 / 63** — Dateien, Seitenköpfe, Bibliothek, Demo-Dateien, Anrede, Tastatur |
| `grundlagen-browser-pruefen` (neu) | **28 / 28** — Desktop und Mobil |
| `startseite-pruefen` | **187 / 187** — unverändert |
| `rewards-pruefen` | **66 / 66** — unverändert |
| `browser-pruefen` | **15 / 15** — Zentrale und Mitarbeiterportal unverändert |

Der Byte-Vergleich bleibt aussagekräftig: Der eine Kopfblock, den der Build
in die Bestandsseiten einsetzt, steht zwischen zwei Markierungen und wird vor
dem Vergleich wieder herausgeschnitten. Bleibt danach auch nur ein Byte
Unterschied, fällt die Prüfung durch. **Das hat sich sofort bewährt:** Ein
erster Versuch, die `robots`-Angabe im Ausgabeordner umzuschreiben, wurde
prompt als Abweichung gemeldet. Korrigiert wurden daraufhin die beiden
Quelldateien, und das Werkzeug bricht den Build jetzt ab, statt umzuschreiben.

**Vorgetäuscht, ausdrücklich nicht echt geprüft:** der Anmeldestatus für
„Mein Konto" und die Registrierungsantwort. Dabei wurde die echte
`customer-auth.js` abgefangen und durch eine Attrappe ersetzt. Ein
bestandener Lauf sagt, dass die Seite sich bei dieser Antwort richtig
verhält — er sagt **nicht**, dass die Anmeldung gegen die produktive Instanz
funktioniert.

**Weiterhin nicht geschehen:** keine echte Anmeldung, kein Konto angelegt,
kein Passwort zurückgesetzt, keine Nachricht versendet, kein Schreibzugriff
auf die Datenbank, keine Hosting- oder Domaineinstellung berührt.

### 8.8 Richtigstellung zum Anmeldetest (nachgetragen 23.09.2026)

> **Eine ausbleibende Bestätigungsmail beweist NICHT, dass die
> Supabase-Weiterleitungsadressen falsch eingestellt sind.**

Im Bericht zu Schritt 017 war das so dargestellt, als wäre der
Registrierungstest zugleich der Nachweis für Angabe **I2**. Das ist
falsch und wird hiermit richtiggestellt.

Bleibt die Mail aus, kommen mindestens diese Ursachen in Frage, und keine
davon lässt sich von außen unterscheiden:

- Der Mailversand ist im Supabase-Projekt gar nicht eingerichtet oder das
  Kontingent des eingebauten Versands ist erschöpft.
- Die Bestätigung per E-Mail ist im Projekt abgeschaltet — dann entsteht
  sofort eine Sitzung und es SOLL keine Mail kommen.
- Die Mail wurde zugestellt, liegt aber im Spam-Ordner oder wurde vom
  Mailanbieter abgewiesen.
- Die Adresse existiert bereits als Konto; Supabase antwortet dann aus
  gutem Grund neutral, ohne das zu verraten.
- Und erst dann: eine unpassende Site-URL oder Weiterleitungsadresse.

Die Weiterleitungsadresse wirkt ohnehin erst auf den **Link in der Mail**,
nicht auf ihr Zustandekommen. Eine falsche Einstellung äußert sich also
eher darin, dass die Mail ankommt und ihr Link ins Leere führt.

**Festgehalten als ungeklärte Ursache.** I2 bleibt eine Angabe, die im
Supabase-Projekt nachgesehen werden muss — sie lässt sich nicht aus dem
Verhalten der Webseite erschließen. Was ein Test des Registrierungswegs
tatsächlich zeigt, steht in 8.6: dass die Seite bei ausstehender
Bestätigung den richtigen Hinweis anzeigt. Mehr nicht.

---

### 8.7 Was nach Schritt 017 offen bleibt

Unverändert offen: **A7** (Banner und Rechtsverweise vereinheitlichen),
**A8/A9/A10/A11** (die Seiten ins neue Gewand), **F7** (`tel:`-Format),
sämtliche Entscheidungen **E1 bis E8** und alle Angaben **I1 bis I6**.
Dazu: der Yumak-Startfehler, die ungeprüfte echte Anmeldung und die
Korrekturen aus `feature/011`.

**Nächstes Paket: Schritt 018 — Rechtsseiten nach Astro.** Branch
`feature/018-rechtsseiten` von `feature/017-grundlagen`. Inhalt:
`impressum.html`, `datenschutz.html`, `hilfe-kontakt.html` und `404.html` im
freigegebenen Design, **bestehender Text unverändert**, dazu A7 für diese
Seiten. Kein Backend berührt, keine Entscheidung nötig — und es fährt das
Seitengerüst für alle weiteren Unterseiten ein, bevor in A11 die echte
Anmeldung daran hängt.

---

## 9. Schritt 018 — Impressum, Datenschutz, Hilfe/Kontakt, 404 (erledigt)

Branch `feature/018-rechtsseiten`, abgezweigt von `feature/017-grundlagen`
(`6c5e27c`). Vier Seiten kommen jetzt aus Astro; aus Bestandsmaterial
stammen damit noch 14 von 20.

### 9.1 Was übernommen wurde

| Seite | Inhalt | Gestaltung |
|---|---|---|
| `impressum.html` | 5 Angabenkarten, wortgleich | neu |
| `datenschutz.html` | 8 Abschnitte, wortgleich | neu |
| `hilfe-kontakt.html` | 4 Kontaktwege, **8** häufige Fragen, 2 Rechtsverweise, wortgleich | neu |
| `404.html` | Überschrift, Text und die drei Wege des Bestands, dazu vier Wegweiser auf vorhandene Seiten | neu |

Gemeinsam genutzt: `Grundlage.astro` (Seitenkopf, canonical, Open Graph,
Symbole), `Kopfbereich`, `Fusszeile`, `Sprungmarken`, `Enthuellen`,
`Symbol` — dieselben Schriften, Farben und Abstände wie Start- und
Rewards-Seite. Neu dazu: `Unterseitenkopf.astro` und
`Rechtskarten.astro`, beide aus dem vorhandenen Bestandteilvorrat gebaut.

**Adressen unverändert.** Die vier Dateinamen bleiben; alle 17 Bestandsseiten,
die auf sie verweisen, treffen weiterhin.

**Aus der Bestandsübernahme genommen:** die vier alten HTML-Dateien und
`legal-pages.css` sowie `hilfe-kontakt.css`. Nachgesehen, nicht vermutet:
`legal-pages.css` wurde **nur** von `impressum.html` und `datenschutz.html`
geladen, `hilfe-kontakt.css` **nur** von `hilfe-kontakt.html`. Es entsteht
keine doppelte Ausgabe; der Byte-Vergleich in `ausgabe-pruefen` würde einen
Namenskonflikt ohnehin melden, statt still zu überschreiben.

**Die häufigen Fragen sind bewusst getrennt von denen der Startseite.** Die
Startseite führt sechs, die Hilfeseite acht — zusätzlich „Wie löse ich einen
Gutschein ein?" und „Wie kann ich Taxi Germersheim kontaktieren?". Auch die
erste Antwort weicht ab („Buchungsbereich auf unserer Startseite" statt
„Anfragebereich auf dieser Startseite"), was auf einer Unterseite richtiger
ist. Zusammenlegen wäre eine inhaltliche Änderung gewesen; beides steht
deshalb getrennt in `inhalte.ts` als `FAQ` und `FAQ_HILFE`.

### 9.2 Das Zustimmungsbanner — untersucht, nicht kopiert

> **Ergebnis: Das Banner wird NICHT auf die neuen Seiten übernommen. Es
> steuert im ausgelieferten Stand nichts.**

Der Auftrag lautete ausdrücklich, seine tatsächliche Funktion zu prüfen,
bevor es weiterverteilt wird. Das ist geschehen — hier der Befund.

**Was es steuert, gemessen im Quelltext:** genau einen Dienst.
`script.js:1155` definiert `hasExternalConsent()`, und der einzige Ort, an
dem diese Funktion etwas bewirkt, ist `refreshMapContainers()`: Bei
Zustimmung wird ein Google-Maps-`<iframe>` in ein `.map-container`-Element
gesetzt, ohne Zustimmung ein Platzhalter. Nichts anderes hängt daran — keine
Zählpixel, keine Schriften, keine sonstigen Einbettungen.

**Warum es dort nichts mehr zu steuern gibt, zwei voneinander unabhängige
Gründe:**

1. **Es gibt keine Karte mehr.** `.map-container` kommt ausschließlich in der
   **alten** `index.html` vor — und die wird seit Schritt 014 nicht mehr
   ausgeliefert. Im gesamten Ausgabeordner steht **kein einziger
   `.map-container` und kein einziges `<iframe>`**. Nachgemessen, auf allen
   20 Seiten.
2. **Und selbst dort würde nichts laden.** Der Kartenschlüssel steht auf dem
   Platzhalter `YOUR_GOOGLE_MAPS_API_KEY` (`script.js:183`). Ohne Schlüssel
   liefert die Einbettungsadresse nichts.

**Daraus folgt:** Auf `impressum.html`, `datenschutz.html` und `flotte.html`
steht heute ein Schalter, der einen Dienst freigibt, den es nicht gibt. Ein
solcher Schalter ist schlimmer als keiner: Er behauptet gegenüber dem
Besucher eine Entscheidung, die gar nichts entscheidet, und er lässt die
Seite sorgfältiger aussehen, als sie ist.

Auf den vier neuen Seiten wird deshalb **keine Einwilligungslogik
eingeführt**. Der Prüflauf `rechtsseiten-pruefen` stellt in beide Richtungen
sicher: kein Zustimmungsschalter **und** keine Einbettung eines fremden
Dienstes.

**„Route anzeigen" auf der Hilfeseite ist kein Gegenbeispiel.** Das ist ein
gewöhnlicher Verweis auf die Google-Kartensuche. Es wird nichts nachgeladen,
solange niemand darauf klickt — und wer klickt, verlässt die Seite sichtbar.
Ein Verweis braucht keine vorherige Einwilligung, eine Einbettung schon.

**Wann das Banner wieder gebraucht wird — und dann richtig:** sobald ein
echter Kartenschlüssel hinterlegt und eine Karte eingebettet wird
(Entscheidung **I6**), oder sobald ein anderer Dienst von außen eingebunden
wird. Dann gehört die Einwilligung an die Stelle, an der der Dienst
tatsächlich geladen wird — nicht als Schalter auf Vorrat.

**Offen und nicht angefasst:** `flotte.html` trägt das wirkungslose Banner
weiterhin. Die Seite bleibt vorerst Bestand; sie wird im nächsten Paket
übernommen, und damit verschwindet es dort von selbst. Es hier zu entfernen
hätte eine Bestandsdatei geändert, ohne dass die Seite neu entsteht.

### 9.3 Die häufigen Fragen ohne Skript

Auf der Startseite sind die häufigen Fragen Schaltflächen mit
JavaScript-Animation. Auf der Hilfeseite sind sie `<details>`/`<summary>` —
so wie im Bestand auch.

Das ist Absicht: Eine Hilfeseite muss auch dann funktionieren, wenn das
Skript scheitert. Der Browser bringt Aufklappen, Tastaturbedienung und
Vorlesen von sich aus mit. **Geprüft:** Klick öffnet, Klick schließt,
Eingabetaste öffnet, zu Beginn ist alles zugeklappt.

### 9.4 Die 404-Seite ist nicht das 404-Verhalten

> **Diese Datei ist eine gestaltete Seite. Ob ein Besucher sie zu sehen
> bekommt, entscheidet allein der Webserver.**

Solange das nicht eingestellt ist, geschieht je nach Hosting eines von drei
Dingen:

1. Die Fehlerseite des Anbieters erscheint statt unserer.
2. Eine leere Seite erscheint.
3. Unsere Seite erscheint — **aber mit Statuscode 200 („alles in
   Ordnung")**. Dann nimmt jede Suchmaschine jede falsche Adresse als
   gültige Seite ins Verzeichnis auf. Das ist die unangenehmste Variante,
   weil sie nach außen wie ein Erfolg aussieht.

**Angabe I4 an den IT-Dienstleister, konkret:** Die Fehlerseite des Servers
für den Statuscode 404 muss auf `/404.html` zeigen, und die Antwort muss
den Code **404** tragen, nicht 200. Auf jedem gängigen Hosting ist das eine
einzelne Einstellung oder Zeile — aber sie muss jemand setzen. **Von hier
aus nicht prüfbar**: Der lokale Prüfserver liefert, was er findet; er sagt
nichts über die spätere Serverkonfiguration.

Die Seite selbst trägt `noindex` — eine Fehlerseite gehört nicht ins
Verzeichnis.

### 9.5 Rechtstexte: unverändert, Lücken weiterhin offen

**Es wurde kein Satz umformuliert, gekürzt oder ergänzt.** Der Prüflauf
vergleicht in beide Richtungen:

- **Vollständigkeit:** 22 Textbausteine des Impressums, 16 der
  Datenschutzerklärung und 21 der Hilfeseite werden im sichtbaren Text der
  neuen Seiten gesucht. Fehlt einer, fällt die Prüfung durch.
- **Gegenprobe:** Es wird ausdrücklich danach gesucht, ob etwas
  **dazuerfunden** wurde — USt-IdNr., Streitbeilegung, Nutzungsbedingungen,
  AGB, Aufsichtsbehörde, Datenschutzbeauftragte. Findet sich eines davon,
  fällt die Prüfung ebenfalls durch.

Diese Gegenprobe ist der eigentliche Punkt: Eine selbst hinzugeschriebene
Pflichtangabe sähe aus, als hätte sie jemand geprüft — und niemand hat sie
geprüft.

**Die bekannten Lücken bleiben unverändert offen** (Abschnitt 2.7,
Entscheidung E6): im Impressum fehlen USt-IdNr., EU-Streitbeilegung und
inhaltlich Verantwortlicher; die Datenschutzerklärung nennt WhatsApp,
Supabase, Kundenkonto, Rewards-Programm, Gewinnverlauf, die im Browser
gespeicherten Daten und das Beschwerderecht bei der Aufsichtsbehörde nicht.
**Hier wird keine rechtliche Freigabe behauptet.**

Eine Änderung zur Auszeichnung, ohne Inhalt: Die Rufnummer im Impressum
verweist jetzt auf `tel:+4972743567` statt `tel:072743567` — die
**angezeigte** Nummer ist unverändert. Damit ist sie auch aus dem Ausland
wählbar. Das erledigt F7 für diese Seiten.

### 9.6 Was geprüft wurde

| Lauf | Ergebnis |
|---|---|
| `rechtsseiten-pruefen` (neu) | **107 / 107** — Desktop und Mobil |
| `ausgabe-pruefen` | **80 / 80** |
| `grundlagen-pruefen` | **62 / 62** |
| `grundlagen-browser-pruefen` | **28 / 28** |
| `startseite-pruefen` | **187 / 187** — unverändert |
| `rewards-pruefen` | **66 / 66** — unverändert |
| `browser-pruefen` | **15 / 15** — unverändert |

Im Einzelnen geprüft, je Seite und je Bildschirmgröße: Inhaltstreue gegen
die alte Fassung, keine erfundene Rechtsangabe, keine Skriptfehler, keine
fehlende Datei, kein waagerechter Überlauf, genau eine Hauptüberschrift,
Hauptinhaltsbereich vorhanden, Fließtext mindestens 14 px, keine überlange
Zeile, **jedes** verlinkte Ziel erreichbar (18 je Seite), Sprungmarke beim
ersten Tabulatorsprung sichtbar, und bei 26 Tabulatorsprüngen je Seite
zeigt **jedes** bedienbare Element seinen Fokus.

**Drei Befunde des Prüflaufs sind während der Arbeit aufgetreten und
behoben worden:**

1. Die Beschriftungen „Registergericht", „Registernummer" und
   „Steuernummer" standen in Versalschreibung da. Im Bestand waren sie
   normal geschrieben. Bei einer Registerangabe ist die Schreibweise Teil
   dessen, was dort steht — zurückgestellt auf normale Schreibweise.
2. Der Schlusssatz auf Impressum und Datenschutz lief über die volle
   Seitenbreite (gemessen 84 em, rund 160 Zeichen je Zeile). Begrenzt.
3. Die Antworten der häufigen Fragen ebenso. Begrenzt.

**Zwei gemeldete Befunde waren Messfehler meines eigenen Prüflaufs, keine
Seitenfehler** — beide korrigiert, statt die Schwelle aufzuweichen: Die
12-px-Zeilen lagen in der gemeinsamen Fußzeile, die seit Schritt 013
freigegeben ist und genauso auf der Startseite steht; gemessen wird jetzt
nur noch innerhalb von `<main>`. Und acht gemeldete „überlange Zeilen" auf
der Hilfeseite waren die `<li>`-Behälter um Frage und Antwort, nicht der
Text selbst; gemessen werden jetzt nur Blattelemente.

**Nicht geprüft und weiterhin offen:** das tatsächliche HTTP-404-Verhalten
(Angabe I4), die echte Anmeldung, und die rechtliche Bewertung der Texte.

### 9.7 Unverändert geblieben

Startseite, Hero-Video und sein Verhalten, Fahrtanfrage, Rewards-Seite,
Yumak (weiterhin Standbild), `admin/`, `fahrer/`, `dashboard/`, Datenbank,
Berechtigungen, Punkteberechnung und der Ablauf der Anmeldung.

---

## 10. Schritt 019 — Flotte und Spezialfahrten (erledigt)

Branch `feature/019-flotte`, abgezweigt von `feature/018-rechtsseiten`
(`7caeca5`). Drei weitere Seiten kommen aus Astro; aus Bestandsmaterial
stammen damit noch **11 von 20**.

### 10.1 Flotte

Alle **neun** Fahrzeuge mit denselben Angaben wie im Bestand: Name,
Kennzeichen, Kategorie, Sitzplätze, Einsatzbereich, Besonderheit. **Es wurde
kein Merkmal hinzugefügt.** Die fünf Filter (Alle, Taxi, Großraum, Elektro,
Rollstuhl) arbeiten wie bisher; dazu zeigt die Seite jetzt an, wie viele
Fahrzeuge gerade sichtbar sind, und jede Karte hat einen Anfrageknopf.

**Die Bilder kommen aus `public/assets/fleet/`**, in zwei Auflösungen, wie
auf der Startseite. Die alte Seite zog sie aus `admin/images/` über einen
Katalog im Seitenskript — mit Dateinamen wie
`adminimagesvw-touran-ger-tx-300-premium.jpg.png`, und zwei Einträge fehlten
dort ganz.

**B-Klasse (GER TX 500) und Tesla Model Y (GER TX 700)** erscheinen als
Textkarte: kein Bildbereich, kein Platzhalterbild, kein Foto eines anderen
Fahrzeugs. Der Prüflauf stellt beides ausdrücklich fest — dass kein leerer
Bildbereich entsteht **und** dass kein Ersatzbild untergeschoben wurde.
Entscheidung **E2** (zwei fehlende Fotos) bleibt davon unberührt offen.

**Das Zustimmungsbanner ist entfernt.** Begründung unverändert Abschnitt 9.2:
Es steuerte allein Google-Maps-Einbettungen, und auf der Flottenseite gab es
nie eine Karte. Damit trägt keine ausgelieferte Seite mehr einen Schalter
ohne Wirkung.

Neu und klein: `flotte.html?kategorie=Rollstuhl` wählt den Filter direkt vor.

### 10.2 Der alte Anfrageweg — Vergleich Feld für Feld

> Das war der eigentliche Kern dieses Pakets. Der Bestand führte für
> Spezialfahrten ein **zweites Formular** mit eigener Prüfung:
> `spezial-anfrage.html` und `special-services.js`, neun Fahrtarten, je neun
> bis fünfzehn Felder.

**Was verglichen wurde:** Felder, Fahrttypen, Prüfregeln und Ziele des alten
Wegs gegen den gemeinsamen Anfragedialog.

#### Ergebnis des Vergleichs

| Fahrtart | Felder Bestand | Felder neu | Entfallen — und warum |
|---|---|---|---|
| `medical` Krankenfahrten | 13 | 9 | `pickup`, `destination`, `date`, `time` |
| `dialysis` Dialysefahrten | 13 | 9 | dieselben vier |
| `chemo` Chemo/Strahlentherapie | 13 | 9 | dieselben vier |
| `wheelchair` Rollstuhlfahrten | 13 | 9 | dieselben vier |
| `series` Serienfahrten | 13 | 11 | `pickup`, `destination` |
| `airport` Flughafentransfers | 15 | 12 | `pickup`, `pickupDate`, `pickupTime` |
| `business` Firmenkunden | 9 | 9 | — |
| `student` Schülerfahrten | 9 | 7 | `pickup`, `destination` |
| `courier` Kurierfahrten | 10 | 8 | `pickup`, `destination` |

**Jedes einzelne entfallene Feld ist eines, das der gemeinsame Dialog selbst
erfasst** — Abholadresse, Zieladresse, Datum und Uhrzeit. Sie standen im
Bestand zusätzlich in jedem Feldsatz und hätten sonst zweimal auf derselben
Seite gestanden. **Sonst ist nichts entfallen.** Kein Feld, keine
Auswahlmöglichkeit, keine Pflichtangabe, keine Beschriftung.

Das ist nicht behauptet, sondern nachgerechnet: Der Prüflauf füllt für jede
der neun Fahrtarten **jedes** Feld aus und sucht **jeden** eingegebenen Wert
in der vorbereiteten WhatsApp-Nachricht wieder. Fehlt einer, fällt die
Prüfung durch.

#### Zwei Fahrtarten ohne Entsprechung — ausdrücklich benannt

Sieben der neun lassen sich einer der freigegebenen Leistungen zuordnen. Zwei
nicht:

- **`series` Serienfahrten** ist keine eigene Leistung, sondern eine
  Wiederholung. Die freigegebenen Leistungstexte nennen sie bei Kranken- und
  Schülerfahrten als „feste Serie".
- **`business` Firmen- und Geschäftskunden** ist eine Kundenart, keine
  Fahrtleistung. „Fern- und Gruppenfahrten" nennt Firmenkunden, deckt sie
  aber nicht ab.

Beide tragen in `FAHRTARTEN` ausdrücklich `leistung: null`, statt eine
Zuordnung zu erfinden. Die Leistungswahl bleibt beim Nutzer — und die
**Fahrtart steht in jedem Fall als eigene Zeile in der Nachricht**, damit
genau die Angabe nicht verlorengeht, wegen der die Anfrage gestellt wird.

#### Prüfregeln: unverändert übernommen

Pflichtfeld nicht leer · E-Mail enthält ein `@` · Telefonnummer mindestens
sechs Zeichen · Mehrfachauswahl mindestens eine Option. Dieselben Regeln,
dieselben Meldungstexte.

Sie greifen **nur auf den Spezialseiten** (`pflichtDetails`). Auf der
Startseite gab es nie Zusatzangaben; dort ändert sich nichts — der Prüflauf
stellt ausdrücklich fest, dass die Startseite weder den Zusatzblock noch die
Pflichtschaltung trägt.

#### Ziele und Direktlinks: erhalten

| Was | Stand |
|---|---|
| `spezial-anfrage.html?service=<schlüssel>` | alle neun geprüft |
| unbekannter `?service`-Wert | fällt wie bisher auf `medical` zurück |
| `#specialRequest` | führt weiter zum Anfragebereich |
| Vorbelegung `rideType` bei Dialyse und Chemo | geprüft |
| Abschluss über WhatsApp oder Telefon | unverändert |
| „Die Angaben werden nicht online versendet." | steht wortgleich da |

**Eine Doppelung, offen benannt:** Bei `airport` fragt der Dialog die
„Zieladresse" und zusätzlich das Bestandsfeld „Flughafen". Im alten Formular
gab es keine Zieladresse, sondern nur den Flughafen. Beide bleiben — das
Feld zu streichen wäre ein Verlust, die Zieladresse zu unterdrücken ein
Sonderfall in der gemeinsamen Logik. Wer nur den Flughafen nennen will, kann
ihn in beide Felder schreiben.

#### Was sich geändert hat

Das zweite Formular entfällt. **Eine Formularlogik, eine Prüfung, eine
Nachricht.** `special-services.js` (762 Zeilen) und `special-services.css`
werden nicht mehr ausgeliefert; die neun Fahrtarten und alle ihre Felder
stehen in `FAHRTARTEN` in `inhalte.ts` und werden vom gemeinsamen
Anfragedialog erfasst.

Mit `special-services.js` entfällt nebenbei auch der Befund aus Schritt 017:
die zwei unsichtbaren Stellvertreterfelder, auf denen der Tastaturfokus
verschwand. Sie sind nicht behoben, sondern es gibt sie nicht mehr.

### 10.3 Eingaben bleiben erhalten

Die Zusatzangaben liegen in den Feldern selbst, nicht in einem
Zwischenspeicher. Wer etwas einträgt, den Dialog schließt und erneut öffnet,
findet seine Eingabe wieder — geprüft. Dasselbe gilt beim Zurückgehen
zwischen den Schritten. Genau daran hing im Bestand ein Fehler, der hier
nicht wiederholt wird.

### 10.4 Was geprüft wurde

| Lauf | Ergebnis |
|---|---|
| `flotte-pruefen` (neu) | **199 / 199** — Desktop und Mobil |
| `rechtsseiten-pruefen` (erweitert) | **167 / 167** — jetzt sieben Seiten |
| `ausgabe-pruefen` | **75 / 75** |
| `grundlagen-pruefen` | **60 / 60** |
| `grundlagen-browser-pruefen` | **28 / 28** |
| `startseite-pruefen` | **187 / 187** — unverändert |
| `rewards-pruefen` | **66 / 66** — unverändert |
| `browser-pruefen` | **15 / 15** — unverändert |

Im Einzelnen: alle neun Fahrzeuge mit ihren Angaben · alle sieben Fotos
laden wirklich · die zwei ohne Foto ohne leeren Bildbereich und ohne
Ersatzbild · jeder der fünf Filter zeigt genau die erwartete Zahl · der
Direktlink auf eine Kategorie · alle neun `?service=`-Einstiege · für jede
der neun Fahrtarten der vollständige Weg bis zur WhatsApp-Adresse mit
Wiederfinden **jedes** Werts · Pflichtangaben halten den Dialog an und
werden benannt · Eingaben überstehen Schließen und Öffnen · Vorbelegung bei
Dialyse und Chemo · Tastatur, Fokus, Lesbarkeit und mobile Darstellung auf
allen sieben Astro-Unterseiten.

**Es wurde keine Nachricht versendet.** `window.open` war abgefangen, die
Adresse nur gelesen. Es wurde nichts angerufen und nichts abgeschickt.

**Zwei Meldungen waren Messfehler des Prüflaufs, keine Seitenfehler** —
beide korrigiert, statt die Schwelle aufzuweichen:

1. „kein Preis" schlug bei Flughafentransfers an, weil dort das
   Bestandsfeld **„Festpreisanfrage"** steht. Das ist die *Frage* nach einem
   Festpreis, keine Preisangabe; sie stand so schon im alten Formular. Die
   Prüfung sucht jetzt nach einer *Behauptung* — einem Betrag, einer
   Entfernung, einer zugesagten Bestätigung —, nicht nach einem Wort.
2. Zwei „überlange Zeilen" entstanden, weil die Breitenbegrenzung an der
   Hülle statt am Absatz hing: Die Hülle rechnet `em` gegen ihre eigene
   Schriftgröße (16 px), der Absatz steht auf 15 px. Dieselbe Breite war
   dort 49 statt 46 em. Begrenzung an den Absatz verschoben.

### 10.5 Unverändert geblieben

Startseite, Hero-Video und sein Verhalten, Rewards, Yumak (weiterhin
Standbild), Spiele, `admin/`, `fahrer/`, `dashboard/`, Datenbank,
Berechtigungen und der Ablauf der Anmeldung. Die freigegebenen
Leistungstexte und der Transportschein-Text stehen wortgleich da; es wurden
keine Preise, Kostenzusagen, Fahrzeugmerkmale oder Leistungsversprechen
ergänzt.

### 10.6 Was nach Schritt 019 offen bleibt

Unverändert: **A11** (Kontoseiten ins neue Gewand), **F7** für die
verbleibenden Bestandsseiten, die Entscheidungen **E1 bis E8** und die
Angaben **I1 bis I6**. Dazu der Yumak-Startfehler, die ungeprüfte echte
Anmeldung und die Korrekturen aus `feature/011`.

Aus Bestandsmaterial stammen noch: `anmelden`, `registrieren`,
`passwort-vergessen`, `passwort-zuruecksetzen`, `meinkonto`, `kundenkonto`,
`kunden-einstellungen`, `meine-fahrten`, `wallet-gutscheine`, `live-fahrt`
und `spiele`.

---

## 11. Schritt 020 — Die Anmeldeseiten (erledigt)

Branch `feature/020-konto`, abgezweigt von `feature/019-flotte` (`7401212`).
Vier weitere Seiten kommen aus Astro; aus Bestandsmaterial stammen damit
noch **7 von 20**.

### 11.1 Was übernommen wurde — und was dafür ermittelt wurde

Ermittelt wurden zuerst die **tatsächlichen** Dateien und Abhängigkeiten,
statt nach Namen zu raten:

| Seite | Skripte | Stilvorlagen |
|---|---|---|
| `anmelden.html` | `public-system.js`, `customer-auth.js` | style, public-visual-repair, auth-demo, public-system |
| `registrieren.html` | dieselben | dieselben |
| `passwort-vergessen.html` | dieselben | dieselben |
| `passwort-zuruecksetzen.html` | dieselben | dieselben |

**Eine eigene Bestätigungsseite gibt es nicht.** Der Link aus der Reset-Mail
landet auf `passwort-zuruecksetzen.html` — diese Seite **ist** die
Rückkehrseite. Sie liest das Zugangsmerkmal aus `#access_token=…&type=recovery`
beziehungsweise `?code=…&type=recovery`.

`public-system.js` wird nicht mehr geladen: Es sorgte für Navigation und
Sitzungsverweise im alten Seitengerüst. Beides bringt jetzt `Kopfbereich.astro`
mit — seit Schritt 017 samt Konto-Einstieg.

### 11.2 Eine Anmeldelogik, nicht zwei

**`customer-auth.js` wurde eingebunden, nicht ersetzt und nicht nachgebaut.**
Die Seiten rufen dieselben Funktionen wie bisher:

| Seite | Aufruf |
|---|---|
| Anmelden | `CustomerAuth.signInWithPassword(email, passwort)` |
| Registrieren | `CustomerAuth.signUp(email, passwort, { firstName, lastName, fullName, phone })` |
| Passwort vergessen | `getClient()` → `auth.resetPasswordForEmail(email, { redirectTo })` |
| Neues Passwort | `getClient()` → `onAuthStateChange`, `getSession`, `updateUser` |

An der Datei selbst wurde **nichts geändert**. Es gibt weiterhin genau eine
Stelle im Projekt, die weiß, wie eine Anmeldung geht.

### 11.3 Unverändert übernommen

Alle Kennungen, die die Abläufe brauchen: `loginForm`, `loginEmail`,
`loginPassword`, `loginError`, `authLoginNotice` · `registerForm`,
`regFirstName`, `regLastName`, `regEmail`, `regPhone`, `regPassword`,
`regPasswordConfirm`, `regTerms`, `registerError`, `registerHinweis` ·
`forgotForm`, `forgotEmail`, `forgotError`, `forgotSuccess` ·
`resetPasswordForm`, `newPassword`, `confirmPassword`, `recoveryChecking`,
`recoveryInvalid`, `recoverySuccess`, `resetError` · dazu `passwordRules`
mit den `data-rule`-Schlüsseln `len`, `upper`, `number`.

Ebenso alle Feldnamen (`email`, `password`, `firstName`, …), alle
Prüfregeln, alle Meldungstexte und die drei Passwortregeln mit ihrer
Gewichtung.

**Die feste Liste erlaubter Rückkehrziele** bleibt unverändert:
`rewards.html`, `spiele.html`, `meinkonto.html`, `wallet-gutscheine.html`,
`meine-fahrten.html`, `index.html`. Alles andere fällt auf `meinkonto.html`
zurück — geprüft auch mit einer fremden Domain und einem Pfadwechsel
(`../admin/login.html`).

### 11.4 Was besser geworden ist

- **Ladezustände.** Beim Anmelden sagt der Knopf jetzt „Wird angemeldet …"
  und nimmt keinen zweiten Klick an. Im Bestand fehlte das hier — wer
  zweimal drückte, schickte zwei Anmeldungen los. Bei den drei anderen
  Seiten gab es das schon.
- **Die Bildspalte der alten Anmeldeseite ist weg.** Ihre drei Stichpunkte
  standen auf dem Handy in einer rund 60 Punkte schmalen Spalte, ein Wort je
  Zeile. Sie stehen jetzt unter dem Formular, wo sie lesbar sind.
- **Passwortmanager und mobile Tastatur** sind ausdrücklich angekündigt:
  `autocomplete` (`email`, `current-password`, `new-password`, `given-name`,
  `family-name`, `tel`), `inputmode`, `autocapitalize="off"` und
  `spellcheck="false"` bei Adressen. Geprüft, Feld für Feld.
- **Eingabefelder mindestens 16 px.** Darunter zoomt iOS beim Antippen.
  Gemessen auf allen vier Seiten.
- **Die vier Seiten stehen auf `noindex`** — das galt schon seit Schritt 017
  und bleibt.

### 11.5 Was ausdrücklich so bleibt, weil es Absicht ist

**Die neutrale Rückmeldung bei „Passwort vergessen".** Die Seite sagt nie,
ob es zu einer Adresse ein Konto gibt — auch wenn Supabase „user not found"
meldet, erscheint dieselbe Bestätigung. Sonst ließe sich hier durchprobieren,
wer Kunde ist. Der Prüflauf stellt das in beide Richtungen fest: gleiche
Meldung bei Treffer und Nicht-Treffer, und **kein** Wort wie „kein Konto"
oder „nicht gefunden" im Text.

**Das Zugangsmerkmal verschwindet sofort aus der Adresszeile.** Sonst stünde
es im Verlauf des Browsers, in jedem `Referer` und in jedem Bildschirmfoto
dieser Seite. Geprüft.

**Das Formular bleibt verborgen, bis der Link trägt.** Wer ein Passwort in
ein Feld tippt, das nichts speichern kann, hat es zweimal getippt.

**Nach der Passwortänderung wird abgemeldet** — die Sitzung des Reset-Links
soll nicht weiterleben.

**In keinem Protokoll dieser Seiten steht eine Adresse, ein Merkmal oder ein
Passwort.** Die Fehlerausgaben nennen nur, *dass* etwas schiefging.

### 11.6 Offenes Veröffentlichungshindernis

> **Das Häkchen bei der Registrierung verlangt die Zustimmung zu
> „Nutzungsbedingungen". Ein solches Dokument gibt es im Projekt nicht.**

Der Verweis zeigt seit jeher auf `datenschutz.html`, also auf etwas anderes.
**Hier wurde kein Text erfunden** — eine selbst geschriebene
Nutzungsbedingung sähe aus, als hätte sie jemand geprüft, und niemand hat
sie geprüft. Der Verweis steht deshalb unverändert.

Das ist **Entscheidung E4** und ein Hindernis **vor** der Veröffentlichung:
Ein Häkchen, das auf ein nicht vorhandenes Dokument zeigt, sollte nicht
öffentlich stehen. Der Prüflauf stellt ausdrücklich fest, dass der Verweis
unverändert auf `datenschutz.html` zeigt und nichts dazugedichtet wurde.

### 11.7 Was geprüft wurde — und was das NICHT belegt

| Lauf | Ergebnis |
|---|---|
| `anmeldung-pruefen` (neu) | **154 / 154** — Desktop und Mobil |
| `ausgabe-pruefen` | **71 / 71** |
| `grundlagen-pruefen` | **60 / 60** |
| `grundlagen-browser-pruefen` | **28 / 28** |
| `rechtsseiten-pruefen` | **167 / 167** — unverändert |
| `flotte-pruefen` | **199 / 199** — unverändert |
| `startseite-pruefen` | **187 / 187** — unverändert |
| `rewards-pruefen` | **66 / 66** — unverändert |
| `browser-pruefen` | **15 / 15** — unverändert |

**Echt geprüft:** Darstellung, Beschriftungen, Schriftgrößen, Sprungmarke,
sichtbarer Fokus bei 20 Tabulatorsprüngen je Seite, `autocomplete` und
`inputmode` Feld für Feld, der Anzeigen-Schalter, kein waagerechter
Überlauf, keine fehlende Datei, kein Abruf nach draußen — und dass im
ausgelieferten Quelltext kein Merkmal und kein Passwort steht.

**Simuliert — und damit ausdrücklich NICHT belegt:** sämtliche Abläufe. Die
echte `customer-auth.js` war durch eine Attrappe ersetzt, die vorgegebene
Antworten liefert. Geprüft wurde, ob die Seite bei diesen Antworten richtig
reagiert:

- ungültige Eingaben (E-Mail-Form, Passwortlänge, Telefonnummer,
  abweichende Wiederholung, fehlendes Häkchen) — jeweils mit der richtigen
  Meldung, dem Fokus im richtigen Feld und **ohne dass überhaupt etwas
  angefordert wird**
- Fehlerantworten des Dienstes, auch `CUSTOMER_NOT_FOUND` (wird übersetzt,
  der technische Schlüssel steht nicht auf der Seite)
- sechs Rückkehrziele, davon drei abzuweisende
- Registrierung mit und ohne sofortige Sitzung
- alle vier Zustände der Reset-Seite
- die drei Passwortregeln, der Reihe nach

**Ein bestandener Lauf belegt NICHT**, dass eine Anmeldung gegen Supabase
funktioniert, dass eine Registrierung ein Konto anlegt, dass eine Mail
zugestellt wird oder dass ein Reset-Link trägt.

**Es wurde kein Konto angelegt, sich nirgends angemeldet, keine Mail
ausgelöst und nichts an produktiven Daten verändert.** Die Testwerte enden
auf `.invalid` — eine Endung, die es per Norm nicht gibt.

Die Anleitung für den echten Test steht in **`ANLEITUNG-ANMELDETEST.md`**.

### 11.8 Ein gemessener Fehler während der Arbeit

Die Beschriftung „SICHERHEIT" klebte auf der Registrierungsseite am
Telefonfeld darüber. Ursache, nachgemessen statt geraten: `m-0` am
`<fieldset>` nullt auch den Abstand nach oben, den der Abstandshelfer des
Formulars setzt — `margin-top: 0px` statt 28 px. Mit `mx-0` stimmt es. Dazu
lag die `<legend>` im `space-y` der Felder und wurde behandelt wie ein Feld;
die Felder liegen jetzt in einer eigenen Hülle.

### 11.9 Unverändert geblieben

Startseite, Hero-Video, Rewards, Yumak, Spiele, Flotte, Spezialfahrten,
`admin/`, `fahrer/`, `dashboard/`, Datenbank, Berechtigungen — und
`customer-auth.js` selbst.

### 11.10 Umfang des nächsten Pakets

Aus Bestandsmaterial stammen noch: `meinkonto.html`, `kundenkonto.html`
(nur eine Weiterleitung), `kunden-einstellungen.html`, `meine-fahrten.html`,
`wallet-gutscheine.html`, `live-fahrt.html` und `spiele.html`.

Die ersten sechs sind **Schritt 021 — Kontoübersichten**. `spiele.html`
gehört zu Punkt 4 der Reihenfolge und bleibt liegen.

---

## 12. Schritt 022 — Das Glücksrad (Gestaltung, einmalig vorgezogen)

Branch `feature/022-gluecksrad-design`, abgezweigt von `feature/020-konto`
(`307dc82`). **Einmalig vorgezogen** auf Wunsch des Auftraggebers; danach
geht es mit dem Abschluss der öffentlichen Webseite weiter.

> **Es wurde keine Teilnahme aktiviert.** Das Glücksrad bleibt für Kunden
> gesperrt, genau wie zuvor. Dieser Schritt hat das Aussehen übernommen,
> sonst nichts.

### 12.1 Der Stand der Anbindung — nachgesehen, nicht vorausgesetzt

Der Auftrag verlangte ausdrücklich, den Stand zu prüfen statt ihn
anzunehmen. Ergebnis:

| Frage | Befund |
|---|---|
| Wird `spin_rewards_wheel` im Kundenbereich aufgerufen? | **Nein.** Der einzige Aufruf im Projekt steht in `admin/rewards.js:807`, also in der Zentrale |
| Ist die Schaltfläche am Rad bedienbar? | **Nein.** In *jedem* Zustand `disabled` — „Nicht verfügbar", „Bald verfügbar", „Kein Dreh verfügbar" |
| Gibt es eine Gewinnlogik im Browser? | **Nein**, und es kam auch keine dazu |

Daran ändert dieser Schritt nichts. Der Prüflauf stellt alle drei Punkte
ausdrücklich fest, damit es auch so bleibt.

### 12.2 Was übernommen wurde

Aus `design-vorlagen/Taxi-Germersheim-Gluecksrad.html`: der Goldring mit
Kegelverlauf und Riffelung, der Zeiger, die Nabe mit dem **Bildzeichen ohne
Schriftzug**, die Segmentfarben und die Drehbewegung (fünf Umdrehungen,
4800 ms, `cubic-bezier(.12,.65,.08,1)`).

Das Bildzeichen lag in der Vorlage als eingebettete Datei; es liegt jetzt
als `public/assets/brand/tg-bildzeichen.svg` im Projekt. **Geprüft: Es
enthält kein `<text>` und keine Buchstabenfolge „TAXI" oder
„GERMERSHEIM"** — es ist wirklich das Zeichen ohne Schrift.

**Die Vorlage selbst wird nicht ausgeliefert.** `design-vorlagen/` steht
nicht in der Übernahmeliste; der Prüflauf stellt fest, dass weder der Ordner
noch die Datei im Ausgabeordner landen.

### 12.3 Abweichung der Vorlage — benannt und behandelt

> **Die Vorlage zeigt sieben GLEICH GROSSE Felder. Die hinterlegten
> Wahrscheinlichkeiten sind nicht gleich.**

| Feld | Wahrscheinlichkeit | Feldanteil auf dem Rad |
|---|---|---|
| 5 Punkte | 35 % | 14,3 % |
| 10 Punkte | 25 % | 14,3 % |
| 20 Punkte | 18 % | 14,3 % |
| 30 Punkte | 10 % | 14,3 % |
| 50 Punkte | 7 % | 14,3 % |
| Gutschein 20,00 € | 4 % | 14,3 % |
| Yumaks Box | 1 % | 14,3 % |

(Quelle: `public.rewards_wheel_rules()` und der `roll`-Block in
Migration 007.)

Gleich große Felder legen Gleichverteilung nahe. **Angepasst wurde nicht die
Größe** — ein Feld mit 1 % wäre 3,6 Grad breit und unlesbar, und die
Gestaltung ist freigegeben —, **sondern die Umgebung:** Unter dem Rad steht
jetzt, dass alle Felder gleich groß dargestellt sind, dass die Feldgröße
nichts über die Gewinnchance sagt, und wo die Werte stehen. Die Vorlage sagt
dasselbe in ihrem Vorschautext; hier steht es in der Kundenansicht.

**Die Beschriftungen stimmen** — geprüft gegen die sieben `prize_type`-Werte
der Migration, in derselben Reihenfolge. Einzige Abweichung in der
Schreibweise: Auf dem Radfeld steht „20 €", in Regel und Ergebnistext
„20,00 €". Auf einem Radfeld ist der kurze Wert lesbarer; der Betrag ist
derselbe.

### 12.4 Wie ein bestätigtes Serverergebnis später auf das Feld kommt

Das war die eigentliche Vorbereitungsaufgabe.

```js
window.TaxiGluecksrad.stoppeAuf('voucher_20')   // → Promise<Feld|null>
```

`stoppeAuf()` **nimmt einen Gewinntyp entgegen**. Sie würfelt nicht, sie
rät nicht, und sie enthält keine Zufallsfunktion — der Prüflauf sucht
ausdrücklich nach `Math.random` und `crypto.getRandomValues` und findet
keines. Ist der Schlüssel unbekannt, **dreht sich das Rad gar nicht** und
die Funktion meldet `null`; ein Rad, das bei unbekanntem Ergebnis irgendwo
stehen bliebe, würde einen Gewinn behaupten.

Die sieben Schlüssel sind genau die der Migration: `points_5`, `points_10`,
`points_20`, `points_30`, `points_50`, `voucher_20`, `yumaks_box`.

**Die Zuordnung ist gemessen, nicht gerechnet:** Für jeden der sieben
Schlüssel wird gedreht und anschließend aus der *tatsächlichen* Drehung und
der Geometrie der Felder bestimmt, welches Feld unter dem Zeiger steht.
Abweichung überall unter 0,001 Grad, auf einem Feld von 51,43 Grad.

### 12.5 Ein Fehler, den der Prüflauf gefunden hat

Der erste Entwurf zählte den Drehwinkel fort: `rotation + 360*5 + rest`.
Nach sieben Drehungen lag der Zeiger 0,043 Grad daneben, und der Wert wuchs
weiter.

Die Ursache war **nicht** die Rechnung, sondern die Ablage: **Der Browser
rundet, wenn er `style.transform` als Text speichert.** Aus
`10902.857142857143` wird `rotate(10902.9deg)` — sechs geltende Ziffern. Je
größer der Winkel, desto gröber die Rundung. Bei tausend Drehungen wären es
Grad statt Bruchteile, und das Rad träfe das Feld nicht mehr.

Behoben an der Ursache: Der abgelegte Winkel bleibt jetzt **immer zwischen
0 und 360**; die vollen Umdrehungen leben nur in der Bildfolge, nicht im
Zustand. Sichtbar ist das dasselbe. Die Abweichung ist damit von 0,043 auf
unter 0,0005 Grad gefallen — und sie wächst nicht mehr mit der Zahl der
Drehungen. Der Prüflauf sieht seither ausdrücklich nach, dass der abgelegte
Winkel unter 360 bleibt.

### 12.6 Die Designprobe

`sichtproben/gluecksrad.html` — bedienbar, mit Auswahlliste für das
Testergebnis, außerhalb der Produktionsausgabe.

Sie trägt oben den Streifen **„Demo – keine echten Gewinne"** mit dem Satz,
dass keine Drehs verbraucht, keine Punkte gebucht und keine Gutscheine
erzeugt werden, und dass im echten Betrieb ausschließlich der Server
entscheidet.

**Die Auswahlliste gibt es nur dort.** Der Prüflauf stellt fest, dass
`spiele.html` kein einziges `<select>` enthält.

Die Probe lädt **nicht** `spiele.js` — das würde die gesamte
Rewards-Initialisierung mitstarten, die dort weder Elemente noch eine
Anmeldung vorfindet. Deshalb steht die Radlogik jetzt in einer eigenen
Datei `gluecksrad.js`, die **beide** benutzen. Zwei getrennte
Radimplementierungen wären die Art von Doppelung, bei der eine von beiden
irgendwann anders rechnet.

### 12.7 Was geprüft wurde

| Lauf | Ergebnis |
|---|---|
| `gluecksrad-pruefen` (neu) | **77 / 77** — Desktop und Mobil |
| `ausgabe-pruefen` | **72 / 72** |
| `grundlagen-pruefen` | **60 / 60** |
| `browser-pruefen` | **15 / 15** |
| `startseite-pruefen` | **187 / 187** — unverändert |
| `rewards-pruefen` | **66 / 66** — unverändert |
| `anmeldung-pruefen` | **154 / 154** — unverändert |

Im Einzelnen: der Stand der Anbindung · die Beschriftungen gegen Migration
007 · für jeden der sieben Gewinntypen der gemessene Stopp auf dem richtigen
Feld, auf Desktop und Handy · unbekanntes Ergebnis dreht nicht · der
abgelegte Winkel bleibt unter 360 · fünf gleichzeitige Anfragen werden zu
einer · mehrfaches Klicken · reduzierte Bewegung (Ergebnis in 0 ms statt
4800 ms, auf dem richtigen Feld) · Zeigerposition mittig auf 0 px genau ·
Radgröße 540 px Desktop, 311 px Handy · Beschriftungshöhe 42 bzw. 25 px ·
kein waagerechter Überlauf · Vorlage und Probe nicht ausgeliefert.

**Alles mit isolierten Testwerten** — den sieben Schlüsselwörtern der
Migration. Kein echter Dreh, keine Anmeldung, keine Punkte, keine
Gutscheine, keine Datenbankverbindung.

Nebenbei behoben: Der Radbereich bekam `scroll-margin-top: 104px`. Der
klebende Seitenkopf ist 88 px hoch, der Zeiger sitzt 31 px unter dem Anfang
des Bereichs — beim Anspringen lag er dahinter.

### 12.8 Was für eine echte Teilnahme noch fehlt

Das ist **nicht** Gegenstand dieses Schritts und wurde ausdrücklich nicht
angefasst:

1. **Der Aufruf von `spin_rewards_wheel`** aus dem Kundenbereich. Die
   Funktion existiert in Migration 007 und wird heute nur von der Zentrale
   gerufen.
2. **Die Freigabe der Schaltfläche.** Sie ist in jedem Zustand gesperrt;
   das muss eine bewusste Entscheidung aufheben, nicht ein Nebeneffekt.
3. **Die Rechte.** Ob ein angemeldeter Kunde `spin_rewards_wheel` überhaupt
   ausführen darf, ist **ungeprüft** — das steht in den Grants und Policies
   der produktiven Instanz, nicht in einer lokalen Datei.
4. **Der Umgang mit einem Fehlschlag.** Was die Seite zeigt, wenn der
   Aufruf scheitert, nachdem der Dreh bereits abgebucht wurde, ist nicht
   festgelegt. Die Migration bucht den Dreh ab, *bevor* sie den Gewinn
   ermittelt — ein abgebrochener Aufruf darf keinen verlorenen Dreh
   hinterlassen, ohne dass es jemand merkt.
5. **Yumaks Box.** Bei `yumaks_box` entsteht ein Vorgang mit Status
   `pending`. Was der Kunde dann sieht und wie es weitergeht, ist offen.
6. **Eine echte Anmeldung** — dieselbe offene Prüfung wie in Schritt 020.

**Punkt 4 und 5 sind Geschäftsregeln, keine Gestaltung.** Sie gehören
beantwortet, bevor eine Teilnahme freigeschaltet wird.

### 12.9 Unverändert geblieben

Rewards-Regeln, Gewinnwahrscheinlichkeiten, Anmeldung, Datenbanklogik,
`customer-auth.js`, Startseite, Hero-Video, Yumak, Taxi Rush, Yumaks Box,
`admin/`, `fahrer/`, `dashboard/`. An `spiele.js` wurde nur die Radlogik
herausgelöst; Rewards-Status, Verlauf und Box sind Zeile für Zeile
dieselben.

---

## 13. Schritt 023 — Taxi Rush (einmalig vorgezogen)

Branch `feature/023-taxi-rush`, abgezweigt von `79fd595`. **Einmalig
vorgezogen** auf Wunsch des Auftraggebers; danach geht es mit den sechs
ausstehenden Kontoseiten weiter.

> **Die alte Spielfassung ist ersetzt, nicht ergänzt.** Es gibt genau ein
> Taxi Rush für Kunden. Keine Rewards-Punkte, keine Gutscheine, keine
> Anmeldung — der Bestwert liegt allein im Browser des Spielers.

### 13.1 Was übernommen wurde

Aus `design-vorlagen/Taxi-Rush.html`: Spiellogik und Gestaltung
unverändert. Geprüft und gemessen, nicht behauptet:

| Merkmal | Vorlage | Hier |
|---|---|---|
| Fahrzeuge | Limousine, Großraum | gleich |
| Haltepunkte | 18 | 18 |
| Startzeit | 75 s | 75 s |
| Leben | 3 | 3 |
| Zeitbonus je Fahrt | +12 s | +12 s |
| Grundtempo | 165 | 165 |
| Tempoanstieg | `1-exp(-elapsed/120)` | gleich |
| Ton beim Laden | aus | aus |
| Werbeflächen am Straßenrand | `roadsideAd()` | gleich oft gezeichnet |

Orts- und Straßennamen stehen **nur in der Anzeige über dem Spielfeld** —
der Prüflauf sucht nach Namen in den `txt()`-Aufrufen des Spielfelds und
findet keine. Die Herkunft der Namen (bahnhof.de, germersheim.eu,
bundeswehr.de) steht als Kommentar über der Liste; die Strecke dazwischen
ist frei gestaltet, und das sagt auch die Fußzeile des Spiels.

### 13.2 Vier Änderungen für die Einbindung — und nur diese vier

Die Vorlage ist eine eigenständige Seite. Hier läuft sie in einer
Spielewelt mit Navigation, Formularen und anderen Abschnitten.

1. **Alles hängt an einer Wurzel.** `$()` sucht nur innerhalb von
   `[data-taxi-rush]`. Die Kennungen heißen `data-tr="…"` statt `id="…"`.
2. **Die Schleife läuft nur, wenn das Spiel zu sehen ist.** Sie startet
   beim Öffnen und wird beim Wegscrollen, beim verborgenen Tab und beim
   Verlassen der Seite gestoppt. `schleifeLaeuft` ist der Riegel gegen
   eine zweite Schleife — die wäre ein doppelt so schnelles Spiel, und man
   sähe es nicht sofort.
3. **Die Tastatur greift nur bei laufendem Spiel und Fokus im Spiel.** Die
   Vorlage hängt an `window` und ruft `preventDefault()` für Pfeiltasten,
   Leertaste, P und Escape. Auf einer Seite mit Eingabefeldern wäre das
   ein Fehler.
4. **Das Markenzeichen kommt aus einer Datei** statt als eingebettete
   Daten — dieselbe, die das Glücksrad benutzt.

**Nicht übernommen: `window.taxiRushPreview`.** Die Entwicklungsdiagnostik
der Vorlage legt den kompletten Spielzustand offen. Der Prüflauf stellt
fest, dass sie im ausgelieferten Quelltext nicht gesetzt wird — und zur
Gegenprobe, dass die Vorlage sie sehr wohl enthält.

**Die Vorlage selbst wird nicht ausgeliefert.** `design-vorlagen/` steht
nicht in der Übernahmeliste.

### 13.3 Der Bestwert der alten Fassung wird NICHT übernommen

Das war eine ausdrückliche Auflage, und die Prüfung ergab: **Die beiden
Fassungen zählen nachweislich anders.**

| | alte Fassung | diese Fassung |
|---|---|---|
| Abholung | +75 | +20 |
| Ablieferung | +200 | +100 |
| Münze | +35 | +25 |
| Bonus | +500 | +400 |
| Fahrtzeit | `dt · 16 · Tempofaktor` | `Tempo · dt · 0,018` |
| Speicherschlüssel | `tg_taxi_rush_best_score` | `tg-rush-best-v1` |

Deshalb **eigener Schlüssel**. Der alte Wert wird gelesen, aber weder
überschrieben noch gelöscht — er gehört dem Spieler. Steht dort etwas,
sagt die Seite einmal, warum der Rekord hier bei null anfängt:

> „Ihr Bestwert aus der vorigen Fassung (4.711) wird nicht übernommen:
> Diese Version zählt die Punkte anders. Der alte Wert bleibt
> gespeichert."

Ohne alten Wert erscheint der Hinweis nicht. Beides geprüft.

### 13.4 Zwei Befunde aus dem Prüflauf, die echte Fehler waren

**Erstens: Der klebende Seitenkopf verdeckte die Bedienung.** Der Kopf
liegt auf `z-index: 100` und gewinnt gegen alles im Spiel — das soll er
auch. Aber Punkte, Zeit, Ton- und Pausenknopf lagen darunter. Behoben
durch einen Abstand beim Anspringen des Abschnitts.

Dabei die eigentliche Stolperstelle: **`style.css` setzt am
`html`-Element `scroll-padding-top: 84px`. Der Browser addiert das zum
`scroll-margin-top` des Abschnitts.** Ein „voller" Wert von 130 stand in
Wahrheit bei 214 und schob unten die Bedienleiste aus dem Bild. Gemessen,
dann auf 77 (Schreibtisch) bzw. 16 (Handy) korrigiert.

**Zweitens: Die Seite färbte auf das Spiel ab.** Das Gestaltungssystem
der Seite arbeitet mit `!important` auf Elementnamen:

| Datei | Regel | erzwingt |
|---|---|---|
| `style.css:1334` | `button, .button, …` | `min-height`, `border-radius`, `font-size`, `font-weight` |
| `style.css:1317` | `p, li, small, label` | `color`, `line-height` |
| `public-system.css:72` | `body.tg-public :where(a, button, …)` | `font-family` |
| `public-system.css` | `body.tg-public :where(h1, h2, h3, p)` | `letter-spacing` |

Ohne Gegenwehr sahen die Knöpfe des Spiels aus wie Seitenknöpfe (15 px,
Schriftstärke 850, 16 px Radius, 52 statt 46 px hoch), und die kleinen
Zeilen im Auftragsfenster hatten die Grautöne der Seite statt des Goldes
der Vorlage.

Behoben mit zwei Mitteln, beide **ausschließlich innerhalb von
`.tr-app`**:

- ein Zurücksetzer `.tr-app :where(button)` bzw.
  `.tr-app :where(p, li, small, label)` — `:where()` zählt bei der
  Genauigkeit nicht mit, der Zurücksetzer steht damit hoch genug gegen die
  Elementregeln der Seite und niedrig genug, dass die eigenen Klassen des
  Spiels ihn wieder überschreiben;
- `.tr-app ` vor jeder Regel, damit die Regeln des Spiels genauer sind als
  `body.tg-public :where(…)`.

**`!important` wurde gezielt gesetzt, nicht pauschal.** Ein erster Versuch
hatte es auf alle betroffenen Eigenschaften gelegt — und damit die
Rangfolge *innerhalb* der Vorlage verdreht: Dort schlägt `.help`
(wichtig) das allgemeinere `.hero p` (normal); mit `!important` auf beiden
gewann plötzlich `.hero p`, und die Bedienhinweise standen in 14 statt
10 px. Zurückgenommen und auf genau die Stellen beschränkt, die der
Zurücksetzer sonst überschreiben würde.

### 13.5 Was der Vergleich mit der Vorlage ergeben hat

Nicht acht Stichproben, sondern **jedes Element in Dokumentreihenfolge**:
28 errechnete Eigenschaften und die Breite, auf Schreibtisch und Handy.

| | Ergebnis |
|---|---|
| 1440 px | **2460 Werte über 82 Elemente — alle gleich** |
| 390 px | **2453 Werte über 82 Elemente — alle gleich** |

> **Achtung, ehrliche Korrektur:** Dieser Vergleich lief zunächst gar
> nicht und meldete trotzdem „stimmt überein". Die Hülle heißt in der
> Vorlage `.app`, hier `.tr-app`; der Aufnehmer gab still `null` zurück,
> und der Vergleich wurde übersprungen. Der Prüflauf stellt seither
> ausdrücklich fest, dass die Vorlage vermessen werden konnte — ein
> stiller Ausfall ist schlimmer als eine Abweichung.

Erst danach kamen die echten Unterschiede zum Vorschein, darunter drei
Portierungsfehler: `width: 260px` und `text-align: center` standen im
falschen Medienblock, und `min-width: 230px` am Auftragsfenster fehlte
ganz.

**Drei bewusste Unterschiede**, benannt statt verschwiegen:

1. **Ein Element mehr** — `p.tr-oldbest` mit dem Hinweis zum alten
   Bestwert. Den gibt es in der Vorlage nicht, weil es dort keine alte
   Fassung gab.
2. **Andere Elementnamen:** `main` → `div` (eine Seite hat nur ein
   `main`, und das gehört der Spielewelt), `h1` → `h4` und `h2` → `h4`
   (die Seite hat bereits eine `h1`; die Rangfolge der Überschriften muss
   stimmen). Dazu Klassen, wo die Vorlage `id`s benutzt.
3. **Andere Höhe des Spielfelds** — `calc(100dvh - 280px)` statt
   `- 210px`, auf dem Handy `- 210px` statt `- 102px`. Die Vorlage stand
   allein auf der Seite; hier kommen der klebende Seitenkopf und der
   Abstand beim Anspringen dazu.

Dazu eine gemessene Folge der Einbettung: **Die Spielespalte der Seite
ist am Handy 327 statt 390 px breit.** Sechs Teile mit einer Höchstbreite
(Auftragsfenster, Fahrzeugknöpfe, Hinweistexte) stoßen deshalb früher an.
Das ist dieselbe CSS in einem engeren Kasten, keine geänderte Gestaltung.

Die Kennzeichnung rechts oben trägt bewusst einen anderen Text: In der
Vorlage steht dort „SPIELBARE DESIGNVORSCHAU", hier **„NUR SPIELSCORE ·
KEINE REWARDS"**. Ebenso ist die Ansprache durchgehend auf „Sie"
umgestellt, wie auf der übrigen Webseite.

### 13.6 Der Beweis, dass das Spiel nicht nach außen abfärbt

Dass jeder Selektor mit `.tr-` beginnt, ist ein Argument. Der Beweis ist
eine Messung: dieselbe Seite einmal **mit** und einmal **ohne**
`taxi-rush.css`, dann jedes Element außerhalb des Spiels vergleichen.

> **208 Elemente, 15 Eigenschaften und die Größe je Element — null
> Abweichungen.**

Die Vorfahren des Spiels sind ausgenommen: Sie ändern ihre Höhe
zwangsläufig mit, weil das Spiel darin liegt. Und beide Messungen stehen
am Seitenanfang, sonst trüge der klebende Kopf einmal `is-scrolled` und
einmal nicht — der Unterschied wäre die eigene Messung gewesen.

### 13.7 Aufräumen: die alte Spielfassung

`spiele.css` enthielt **126 Regeln der alten Fassung**, darunter einen
kompletten Fokusmodus (`taxi-rush-focus-active`), den kein Skript mehr
einschaltet. Alle entfernt — 53.895 auf 33.924 Zeichen.

Dass dabei nichts verrutscht ist, wurde gemessen und nicht gehofft: Für
**jedes** Element der Seite wurden alle errechneten Eigenschaften und der
Kasten einmal mit der alten und einmal mit der neuen `spiele.css`
verglichen. **302 Elemente, zwei Bildschirmbreiten, null Abweichungen.**

Ein erster Durchgang war zu vorsichtig: Eine Regel wie
`.gw-rush-game.is-crashing .gw-rush-viewport` blieb stehen, weil ein Teil
des Selektors noch lebte. Sie kann trotzdem nie greifen — ein toter Teil
genügt.

### 13.8 Was geprüft wurde

| Lauf | Ergebnis |
|---|---|
| `rush-pruefen` (neu) | **178 / 178** |
| `ausgabe-pruefen` | 73 / 73 |
| `grundlagen-pruefen` | 60 / 60 |
| `rechtsseiten-pruefen` | 167 / 167 |
| `flotte-pruefen` | 199 / 199 |
| `anmeldung-pruefen` | 154 / 154 |
| `gluecksrad-pruefen` | 77 / 77 |
| `rewards-pruefen` | 66 / 66 |
| `startseite-pruefen` | 187 / 187 |
| `browser-pruefen` | 15 / 15 |
| `grundlagen-browser-pruefen` | 28 / 28 |

**Der Ablauf wurde gespielt, nicht behauptet.** Im echten Chrome:
gestartet · gelenkt (an den Bildpunkten gemessen: Pfeiltaste, Pfeilknopf,
Tippen) · Fahrgast aufgenommen · Fahrt abgeschlossen (die Zeit sprang um
11 s nach oben, der Rest ist die laufende Uhr) · pausiert (Zeit und
Punkte stehen still) · fortgesetzt · Kollision (ein Leben weniger) ·
Spielende von selbst · Ergebnis mit Punkten und Fahrten · Neustart (75 s,
3 Leben) · Rekord gespeichert und nach dem Neuladen noch da · beide
Fahrzeuge · Tempostufe steigt · Ton an und wieder aus.

Dazu: Pfeiltasten scrollen die Seite, solange der Fokus nicht im Spiel
liegt · im Menü fängt das Spiel gar nichts ab · die Leertaste tippt in
einem Eingabefeld ein Leerzeichen, auch während das Spiel läuft ·
Wegscrollen hält an und reißt die Seite nicht zurück · fünf zusätzliche
`oeffnen()` lassen die Uhr weiter im Takt laufen (4 s in 4 s; zwei
Schleifen wären ~8) · verborgener Tab pausiert · nach dem Schließen
bewegt sich nichts mehr und keine Taste wird abgefangen · reduzierte
Bewegung · gesperrter Speicher.

### 13.9 Verbleibende Einschränkungen — offen benannt

1. **Mobil wurde EMULIERT, nicht auf einem echten Gerät geprüft.**
   Chrome mit Touch-Emulation bei 390 × 844, 430 × 932, 320 × 568 und
   844 × 390. Ein echtes Gerät verhält sich bei Wischgesten, Tastatur und
   Adressleiste anders.

2. **Zur Flüssigkeit gibt es keine Zusage.** Es wurde **keine Bildrate
   gemessen**. Was gemessen wurde: dass genau eine Animationsschleife
   läuft und die Uhr im Takt bleibt. Das ist etwas anderes als „läuft
   flüssig".

3. **Im Querformat eines Handys (844 × 390) passt das Spiel nicht
   vollständig ins Bild.** 390 px Höhe minus Seitenkopf lassen zu wenig
   übrig. Boost und Lenkpfeile sind erst nach kurzem Scrollen zu sehen;
   Wischen über dem Spielfeld lenkt weiterhin ohne Scrollen. Hochkant
   passt alles. Ebenso wird bei einem nur 720 px hohen Fenster die
   Fußzeile des Spiels angeschnitten.

4. **Ein Speicherfehler außerhalb von Taxi Rush.** Bei gesperrtem
   `localStorage` wirft `customer-auth.js` unbehandelt — die Datei greift
   an sieben Stellen ohne `try/catch` auf den Speicher zu
   (`customer-auth.js:118–188`). **Das ist ein Bestandsbefund, nicht
   Taxi Rush**, und wurde in diesem Schritt bewusst nicht angefasst: Die
   Anmeldelogik bleibt unverändert. Der Prüflauf trennt beides und nennt
   den fremden Fehler getrennt.

5. **Der Yumak-Startfehler** bleibt offen wie bisher.

### 13.10 Unverändert geblieben

Glücksrad, Rewards-Regeln, Gewinnwahrscheinlichkeiten, Yumak, Startseite,
Hero-Video, `customer-auth.js`, `spiele.js`, `admin/`, `fahrer/`,
`dashboard/`. An `spiele.css` wurden ausschließlich tote Regeln der alten
Spielfassung entfernt, mit Messung belegt.

Geändert wurden insgesamt fünf Dateien: `spiele.html`, `spiele.css`,
`taxi-rush.js`, `tools/bestand-uebernehmen.mjs` (eine Zeile: `taxi-rush.css`
in die Übernahmeliste) und `package.json` (ein Prüfbefehl). Neu:
`taxi-rush.css`, `tools/pruefe-taxi-rush.mjs` und die Designvorlage.

---

## 14. Schritt 021 — Die Kontoübersichten (erledigt)

Branch `feature/021-kontoseiten`, abgezweigt von `feature/023-taxi-rush`
(`d6977d7`), damit Glücksrad und Taxi Rush erhalten bleiben.

> **Damit stammt keine öffentliche Seite mehr aus dem Bestand außer
> `spiele.html`.** 19 von 20 Seiten kommen aus Astro.

### 14.1 Was diese Seiten wirklich laden — nachgesehen, nicht vermutet

Vor dem Umbau wurde jede der sechs Seiten auf ihre Datenzugriffe
durchsucht. Das Ergebnis war überraschend schmal:

| Seite | Lädt | Speichert |
|---|---|---|
| `meinkonto.html` | Sitzung (`getProfile`, `getSessionSnapshot`) **und** `rpc('get_my_rewards_overview')` | nichts |
| `kunden-einstellungen.html` | Sitzung (E-Mail, Telefon – nur Anzeige) | `client.auth.updateUser({ password })` |
| `wallet-gutscheine.html` | `from('rewards_vouchers').select(…).order('issued_at')` | nichts |
| `meine-fahrten.html` | **nichts** | nichts |
| `live-fahrt.html` | **nichts** | nichts |
| `kundenkonto.html` | **nichts** – Weiterleitung | nichts |

**Drei der sechs Seiten haben überhaupt keine Datenquelle.** Das ist kein
Versehen: `public.rides` trägt in `002_rls_policies.sql` alle vier Regeln
auf `private.is_dispatcher_or_admin()`. Ein angemeldeter Kunde hat auf
seine eigenen Fahrten weder Lese- noch Schreibrecht. Jede Fahrtenliste
oder Live-Position wäre also erfunden — und genau das war untersagt.

Alle Aufrufe wurden **unverändert** übernommen: dieselben Funktionen,
dieselben Tabellen, dieselben Spalten, dieselbe Sortierung.

### 14.2 Der gemeldete Speicherfehler — untersucht und behoben

Der Befund aus Schritt 023 wurde zuerst gemessen, dann repariert.

**Die Ursache:** `persistProfile()` in `customer-auth.js` griff ungeschützt
auf `localStorage` zu. Der Aufruf kam aus `syncSessionState()` und damit
aus `hydrateSession()`. Ist der Speicher gesperrt, wirft schon der
Zugriff — die Ausnahme riss `hydrateSession()` ab, und weil die
Kontoseiten darauf warteten, wurde
`document.body.classList.remove('auth-pending')` nie erreicht.

**Die gemessene Folge:**

| Seite | vorher | nachher |
|---|---|---|
| `meinkonto.html` | dauerhaft „Konto wird geladen …", 2 Fehler | bedienbar |
| `kunden-einstellungen.html` | dauerhaft „Konto wird geladen …", 2 Fehler | bedienbar |
| `meine-fahrten.html` | dauerhaft „Konto wird geladen …", 2 Fehler | bedienbar |
| `wallet-gutscheine.html` | dauerhaft „Konto wird geladen …", 2 Fehler | bedienbar |
| `live-fahrt.html` | kam durch (benutzte `requireLoginAsync`) | bedienbar |

Vier von fünf Seiten zeigten einen schwarzen Bildschirm mit einem Satz —
für immer.

**Die Behebung** liegt in `customer-auth.js`, nicht in einer zweiten
Anmeldelogik. Jeder Speicherzugriff läuft jetzt über drei Funktionen
(`speicherLesen`, `speicherSchreiben`, `speicherLoeschen`), die **nie
werfen**. Schlägt der Speicher fehl, merkt sich die Seite den Stand für
diesen Besuch in einer `Map` — die Anmeldung funktioniert, sie überlebt
nur kein Neuladen. `bootstrap()` fängt zusätzlich ab, damit nichts
unbehandelt scheitert.

Neu ist `CustomerAuth.speicherGesperrt()`. Es meldet, **ob es wirklich
geklemmt hat** — keine Vermutung. Nur dann erscheint unten ein Hinweis:

> „Der Browserspeicher ist gesperrt. Ihre Anmeldung gilt deshalb nur für
> diesen Besuch und wird beim Schließen des Fensters vergessen. Prüfen Sie
> die Einstellungen für Cookies und Websitedaten, wenn Sie angemeldet
> bleiben möchten."

**Keine Sitzung wird vorgetäuscht.** Ohne nachgewiesene Sitzung bleibt
gesperrt — im Zweifel zu, nie auf. Das ist im Prüflauf für alle fünf
Seiten festgehalten.

### 14.3 Geschützte Inhalte waren sichtbar

Der zweite Befund aus derselben Messung.

`auth-demo.css` legte über den gesperrten Bereich nur
`filter: blur(2px) saturate(0.7)`. Gemessen: `visibility: visible`,
`opacity: 1`, `display: block`. Der Text stand im Dokument, war markierbar
und kopierbar — bei größerer Schrift auch lesbar. Ein Weichzeichner ist
keine Zugangssperre.

Jetzt gilt `display: none`. Der Prüflauf misst für jede der fünf Seiten,
dass der Bereich **nicht sichtbar** ist, und sucht zusätzlich im
sichtbaren Text nach Wörtern wie „Mitglied seit", „Gutschein" oder
„Passwort" — er findet keines.

Nebenbei: Die Sperre liegt jetzt **unter** dem Seitenkopf (z-index 30
gegen 40). Vorher deckte sie auch die Navigation zu; ein abgemeldeter
Besucher kam nirgendwo mehr hin außer über die drei Knöpfe der Karte.

### 14.4 Ein Ladefehler ist kein leeres Konto

Der dritte Befund, und der ausdrücklich benannte.

Im Bestand stand um den Rewards-Aufruf ein `catch`, das den Fehler
verschluckte und `rewardsOverview = null` setzte. Danach zeigten alle vier
Kennzahlen „—". **Bei einem Serverfehler sah ein Kunde genau dasselbe wie
bei einem frisch angelegten Konto: vier Striche.**

Jetzt drei unterscheidbare Zustände, gemessen:

| Fall | Kennzahl | Hinweis |
|---|---|---|
| lädt | `…` | — |
| leeres Konto | `0` | keiner |
| Ladefehler | `–` | sichtbarer Kasten mit „Erneut versuchen" |

Der Fehlertext sagt ausdrücklich: *„Das ist ein Ladefehler und bedeutet
nicht, dass Ihr Konto leer ist."*

Dieselbe Trennung bei den Gutscheinen — dort machte der Bestand es als
einzige Seite bereits richtig („Noch keine Gutscheine" gegen „Gutscheine
nicht verfügbar"). Beides bleibt wortgleich, ergänzt um den Satz, dass der
Fehler nichts über den Bestand aussagt, und um einen
Wiederholungsknopf.

### 14.5 Die Abmeldung leert jetzt wirklich

Im Bestand rief der Abmeldeknopf `signOut()` und leitete danach weiter.
Die persönlichen Anzeigen wurden **nicht** geleert — man verließ sich
darauf, dass die Weiterleitung schneller ist als das Auge. Bleibt sie aus
(kein Netz, ein Fehler), standen Name, Telefon und E-Mail weiter da.

Jetzt: **erst leeren, dann abmelden, dann weiterleiten.** Gemessen mit
einer Attrappe, deren `signOut()` absichtlich hängen bleibt — die Seite
steht dann still, und alle neun `data-konto-persoenlich`-Felder sind
bereits auf „—". Kein Name, keine E-Mail, keine Telefonnummer, kein
Punktestand mehr im sichtbaren Text.

Statt `window.alert` erscheint bei einem Fehlschlag ein Kasten auf der
Seite, der sagt, dass die Angaben bereits ausgeblendet sind.

### 14.6 Eine Schutzprüfung, nicht sechs

Im Bestand stand die Abfolge *Sitzung herstellen → Zugang prüfen →
freigeben* fünfmal nebeneinander, jedes Mal etwas anders formuliert. Jetzt
steht sie einmal in `Kontoseite.astro` und liefert ihr Ergebnis über ein
Versprechen:

```js
const { gesperrt, auth } = await window.tgKontoBereit;
if (gesperrt) return;
```

**Es löst immer auf** — auch wenn die Sitzungsabfrage scheitert. Ein
hängendes Versprechen wäre genau der Fehler aus 14.2 gewesen.

`customer-auth.js` wurde **eingebunden, nicht ersetzt**. Die Sperre selbst
kommt weiterhin aus `requireLogin()`; diese Datei ruft sie, sie baut sie
nicht nach. Der Prüflauf stellt für jede Seite fest, dass kein eigener
Supabase-Client angelegt und niemand selbst angemeldet wird.

### 14.7 Aus der Bestandskopie genommen

Die sechs HTML-Dateien **und** fünf Stilvorlagen, die ausschließlich zu
ihnen gehörten: `auth-demo.css`, `kunden-einstellungen.css`,
`live-ride.css`, `meinefahrten.css`, `wallet-gutscheine.css`.
Nachgesehen, nicht vermutet — der Prüflauf liest alle ausgelieferten
Seiten durch und stellt fest, dass keine mehr darauf verweist.

Eine Zusicherung in `pruefe-grundlagen.mjs` musste dabei **umgedreht**
werden: Bis Schritt 020 verlangte sie, dass `auth-demo.css` dabei ist
(„trotz des Namens eine echte Stilvorlage von elf Kontoseiten"). Jetzt
gilt das Gegenteil.

`kundenkonto.html` bleibt eine reine Weiterleitung — bewusst ohne den
gemeinsamen Seitenrahmen. Alle vier Mechanismen aus dem Bestand sind
übernommen: `meta refresh`, `location.replace`, ein sichtbarer Verweis und
`noindex,follow` mit `canonical` auf `meinkonto.html`.

### 14.8 Was geprüft wurde

| Lauf | Ergebnis |
|---|---|
| `kontoseiten-pruefen` (neu) | **181 / 181** |
| `ausgabe-pruefen` | 62 / 62 |
| `grundlagen-pruefen` | 60 / 60 |
| `rechtsseiten-pruefen` | 167 / 167 |
| `flotte-pruefen` | 199 / 199 |
| `anmeldung-pruefen` | 154 / 154 |
| `gluecksrad-pruefen` | 77 / 77 |
| `rush-pruefen` | 178 / 178 |
| `rewards-pruefen` | 66 / 66 |
| `startseite-pruefen` | 187 / 187 |
| `browser-pruefen` | 15 / 15 |
| `grundlagen-browser-pruefen` | 28 / 28 |

Im Einzelnen, auf Desktop (1440 × 900) und Handy (390 × 844 und
320 × 568): Adressen und `noindex` · die Weiterleitung · eine
Anmeldelogik · abgemeldet (Bereich unsichtbar, Sperre sichtbar, Weg zur
Anmeldung erreichbar) · angemeldet mit Daten (Name, E-Mail, Telefon,
Beitrittsjahr, Initialen, Punkte deutsch formatiert, Level übersetzt,
Gutscheine mit Betrag, Code, Status und Datum) · leeres Konto · Ladefehler
mit Wiederholung · keine erfundenen Fahrten, Beträge, Zeiten oder
Kennzeichen · gesperrter Speicher (Attrappe **und** echtes
`customer-auth.js`) · Abmelden (Leeren vor dem Abmelden, Ziel
`anmelden.html?loggedOut=1`) · Passwortdialog (Regeln, Stärke,
abweichende Bestätigung, Erfolg, Fehlschlag, Anzeigen-Schalter, Escape,
Fokusrückkehr) · Tastaturlauf bis zum Abmeldeknopf · kein waagerechter
Überlauf.

### 14.9 Was dieser Prüflauf NICHT belegt

> **Jede Sitzung und jede Datenantwort in diesem Lauf ist SIMULIERT.**
> Der gesamte Netzverkehr nach außen wurde abgeschnitten; es gab keine
> Verbindung zu Supabase. Es wurden keine produktiven Kontodaten
> angefasst und keine Nachricht ausgelöst.

Offen bleiben deshalb, unverändert:

1. **Die echte Anmeldung ist ungeprüft** — dieselbe offene Prüfung wie in
   Schritt 020. Die Anleitung dafür steht in `ANLEITUNG-ANMELDETEST.md`.
2. **Ob `get_my_rewards_overview` einem angemeldeten Kunden antwortet**,
   ist ungeprüft. Das steht in den Grants und Policies der produktiven
   Instanz.
3. **Ob ein Kunde `rewards_vouchers` lesen darf**, ebenso — dieselbe
   offene Frage wie beim Glücksrad in Schritt 022.
4. **E1 bleibt offen:** Kunden haben auf `rides` keine Rechte. Solange das
   so ist, bleiben „Meine Fahrten" und „Fahrtstatus" ohne Daten. Das ist
   eine Entscheidung, keine Gestaltungsfrage.

Eine bestandene Prüfung mit Attrappe ist **kein Nachweis** für das
Verhalten der produktiven Instanz.

### 14.10 Unverändert geblieben

Startseite, Hero-Video, Glücksrad, Taxi Rush, Yumak, Rewards-Regeln und
-Berechnungen, Datenbank, Rollen und Berechtigungen, `admin/`, `fahrer/`,
`dashboard/`. An `customer-auth.js` wurde ausschließlich der
Speicherzugriff abgesichert und `speicherGesperrt()` ergänzt — an der
Anmeldung selbst, an `signInWithPassword`, `signUp`, `signOut`,
`requireLogin` und `hydrateSession` ändert sich nichts.

**Der offene Taxi-Rush-Befund bleibt bestehen:** Im Querformat eines
Handys (844 × 390) passt das Spiel samt Bedienleiste nicht vollständig ins
Bild; Boost und Lenkpfeile sind erst nach kurzem Scrollen zu sehen. Siehe
Abschnitt 13.9, Punkt 3 — für die abschließende Qualitätsrunde vorgemerkt.

---

## 15. Schritt 024 — Die abschließende Qualitätsrunde

Branch `feature/024-qualitaetsrunde`, abgezweigt von
`feature/021-kontoseiten` (`eb98f9e`).

Keine Übernahme mehr, sondern ein Durchgang über den fertigen Auftritt:
Was ist noch falsch, unklar oder unnötig schwer?

### 15.1 Fünf gemessene Fehler, alle behoben

#### (1) Eine verspätete Antwort brachte persönliche Daten zurück

Der Auftrag nannte es ausdrücklich: *„`display:none` schützt lediglich
die Darstellung."* Genau daran hing ein echter Fehler.

**Gemessen** mit einer Antwortzeit von drei Sekunden: Meldet sich jemand
ab, während die Abfrage noch läuft, kommt deren Antwort **danach** an —
und schrieb die Werte zurück auf den Bildschirm.

| Seite | vorher | nachher |
|---|---|---|
| `wallet-gutscheine.html` | Gutscheincode `TG-GEHEIM-1` stand nach dem Abmelden wieder da | nichts |
| `meinkonto.html` | Name „Test Kundin" stand wieder da | nichts |

Behoben mit einem **Sitzungsstand**: `window.tgKontoStand()` zählt bei
jeder Abmeldung hoch. Jede Seite merkt sich den Stand vor ihrer Abfrage
und verwirft die Antwort, wenn er sich geändert hat.

```js
const stand = window.tgKontoStand();
const antwort = await abfrage();
if (stand !== window.tgKontoStand()) return;   // verwerfen
```

Das Aufräumen selbst ist jetzt eine benannte Funktion
(`window.tgKontoRaeumen()`), damit es prüfbar ist und eine spätere Stelle
— etwa eine abgelaufene Sitzung — dasselbe tun kann, ohne es nachzubauen.

> **Was das NICHT ist:** eine Rechteprüfung. Es verhindert nur, dass der
> Browser zeigt, was niemand mehr sehen soll. Ob der Server die Daten
> überhaupt herausgeben darf, bleibt eine Frage der Grants und Policies —
> unverändert offen.

**Ebenfalls gemessen und in Ordnung:** Ohne Sitzung wird **gar nichts**
angefordert. Weder `meinkonto.html` noch `wallet-gutscheine.html` ruft
`getClient()`, `rpc()` oder `from()` auf, solange die Sperre greift.

#### (2) Der Abmeldeknopf war wirkungslos, solange geladen wurde

Auf `meinkonto.html` stand die Verdrahtung des Abmeldeknopfs **hinter**
`await ladeRewards()`. Bei drei Sekunden Antwortzeit waren das drei
Sekunden, in denen ein Druck auf „Abmelden" nichts tat.

Jetzt wird der Knopf **als Erstes** verdrahtet. Gemessen: Er greift,
während die Kennzahlen noch auf „…" stehen.

#### (3) Serien- und Firmenanfragen trugen eine fremde Leistung

Der Auftrag nannte auch das ausdrücklich. Es stimmte:

| Fahrtart | angezeigt (vorher) |
|---|---|
| Serienfahrt, ohne Vorwahl | **Taxi** — nie gewählt, nur vorbelegt |
| Serienfahrt nach Flughafenwahl | **Flughafentransfer** — übernommen |
| Firmenkonto nach Krankenfahrt | **Krankenfahrten** — übernommen |

`fahrtartSetzen()` setzte die Leistung nur, wenn die Fahrtart eine hatte
— nahm eine vorhandene aber nie weg. Serienfahrt und Firmenkonto haben
bewusst `leistung: null`.

Jetzt steht dort die **Fahrtart selbst** — das, was der Kunde wirklich
angeklickt hat:

> vorher: `GEWÄHLTE LEISTUNG  Flughafentransfer`
> nachher: `IHRE ANFRAGE  Serienfahrten`

Und die Nachricht an die Zentrale trägt gar keine `Leistung:`-Zeile mehr,
wenn es keine gibt. Vorher wäre dort eine Angabe gestanden, die der Kunde
nie gemacht hat. Fahrtarten **mit** Leistung zeigen sie unverändert.

#### (4) Flughafen und Ziel standen unverbunden nebeneinander

In der Nachricht:

```
Zieladresse: Testziel 2
…
Flughafen: Frankfurt Airport FRA
```

Welche Angabe gilt? Das musste die Zentrale raten.

Jetzt wird ein **leeres** Zielfeld mit dem gewählten Flughafen gefüllt.
Ein bereits ausgefülltes Ziel wird **nie** überschrieben — gemessen mit
„Hotel Mustermann, Speyer": bleibt stehen.

> **Offen und als Vorschlag unten:** Eine Fahrt *vom* Flughafen hat ihn
> als Abhol-, nicht als Zieladresse. Dafür bräuchte es ein Feld
> „Fahrtrichtung". Das ist eine neue Pflichtangabe und damit eine
> Entscheidung des Auftraggebers, keine stille Änderung.

#### (5) Der Anfragedialog ließ den Fokus draußen

Der Dialog trägt `role="dialog"` und `aria-modal="true"` — verspricht
also, dass nichts dahinter erreichbar ist. Gemessen stand der Fokus beim
Öffnen noch auf der Sprungmarke am Seitenanfang. Wer mit der Tastatur
arbeitet, wanderte mit Tab durch die Seite **hinter** dem offenen Dialog.

Behoben in drei Teilen, alle gemessen:
1. Beim Öffnen fährt der Fokus ins erste Eingabefeld (`dlg-pickup`).
2. Die Tabulatortaste läuft im Dialog um und verlässt ihn nicht.
3. Beim Schließen kehrt der Fokus auf den öffnenden Knopf zurück —
   geprüft auf `index.html` („Fahrt anfragen") und `spezial-anfrage.html`
   („Anfrage vorbereiten").

### 15.2 Ladeverhalten — mit einer Korrektur an meiner eigenen Messung

> **Erst falsch gemessen, dann richtig.** Ein erster Durchgang meldete
> das Logo mit 231 KB auf jeder Seite und die Startseite mit 25,2 MB.
> Beides war ein Fehler meines Prüfservers: Er lieferte unkomprimiert
> aus, und die Zählung addierte `dataReceived` und `loadingFinished` —
> also jedes Byte zweimal.

Richtig gemessen:

| Datei | roh | gzip | brotli |
|---|---|---|---|
| `taxi-germersheim-logo.svg` | 231 KB | 21 KB | **16 KB** |
| `style.css` | 311 KB | 45 KB | **36 KB** |
| `_astro/…css` (Design) | 68 KB | 11 KB | **9 KB** |

**Das Logo ist also kein Befund.** Eine vorbereitete Verkleinerung wurde
verworfen — sie hätte 14 % gebracht, bei einem Wert, der über die Leitung
ohnehin 16 KB beträgt.

Was sich **nicht** wegkomprimieren lässt, sind Bilder und Video. Dort lag
der echte Befund:

**Die Spielewelt lud zwei Fotos von 2,6 und 2,4 MB** —
`admin/images/mercedes-*-ger-tx-*-premium.jpg.png`, beides Fotos in PNG
kodiert, 1448 px breit, dargestellt mit höchstens 640 px, hinter einem
dunklen Verlauf.

| | vorher | nachher |
|---|---|---|
| Bild 1 | 2679 KB | **206 KB** |
| Bild 2 | 2436 KB | **174 KB** |
| `spiele.html` gesamt | 6260 KB | **1526 KB** |

Umgerechnet nach WebP bei 1280 px. **Die Ähnlichkeit ist gemessen:**
SSIM 0,979 und 0,982 gegenüber der Vorlage; die gerenderte Seite vorher
gegen nachher erreicht SSIM 0,995. Dieselben Fotos, nur nicht mehr als
PNG. Die Originale in `admin/images/` bleiben unangetastet.

### 15.3 Ausgelieferte Dateien ohne einen einzigen Verweis

Gemessen über **alle 213 durchsuchbaren Dateien** des Ausgabeordners —
`admin/`, `fahrer/` und `dashboard/` eingeschlossen, wie beauftragt:

| Datei | Größe | Befund |
|---|---|---|
| `script.js` | 278 KB | kein Verweis |
| `public-premium-v2.css` | 74 KB | kein Verweis |
| `public-states.css` | 71 KB | kein Verweis |
| `home-luxury.css` | 40 KB | nur von `public-states.css` |
| `home-luxury.js` | 7 KB | kein Verweis |
| `public-premium-v2.js` | 1 KB | kein Verweis |

Alle sechs aus der Übernahmeliste genommen: **471 KB**.

**Bewusst NICHT entfernt**, weil nachweislich gebraucht:

- `logo.png` (566 KB) — von **63** Seiten in `admin/` und `fahrer/`.
- `yumak-avatar.png` (165 KB) — ein echtes Bild auf der Startseite. Es
  erschien in der ersten Messung als „ungenutzt", weil es unterhalb der
  Falz liegt und erst beim Scrollen geladen wird.
- `style.css`, `public-system.css`, `public-visual-repair.css`,
  `public-system.js`, `rewards-customer.js` — von `spiele.html` bzw.
  `rewards.html` geladen.
- Die vorbereiteten Yumak-Medien wurden nicht angefasst.

### 15.4 Der Rundgang

13 öffentliche Seiten, Desktop (1440 × 900) und Handy (390 × 844):

| Prüfung | Ergebnis |
|---|---|
| Kopfzeile vorhanden | 13 / 13 auf beiden |
| Fußzeile vorhanden | 13 / 13 |
| genau eine `h1` | 13 / 13 |
| waagerechter Überlauf | keiner |
| fehlende Dateien | keine |
| Skriptfehler in der Konsole | keine |
| Sprungmarke als erster Tabstopp | 13 / 13 |
| Bedienpunkte ohne Fokusring | **0 von 472** |
| Verweise ohne Ziel (`#`, leer) | 0 |

### 15.5 Taxi Rush — vom Auftraggeber auf einem echten Gerät gespielt

> **Der Auftraggeber hat Taxi Rush auf einem echten Handy gespielt,
> einschließlich Wischsteuerung, und für gut befunden** (25.09.2026).

Das hebt die Einschränkung aus Abschnitt 13.9 Punkt 1 **teilweise** auf.
Weiterhin gilt und ist **nicht** geprüft:

- **ein Gerät, nicht viele.** Über andere Geräte, Bildschirmgrößen,
  Browser oder ältere Hardware sagt das nichts.
- **das Querformat nicht.** Bei 844 × 390 passt das Spiel samt
  Bedienleiste weiterhin nicht vollständig ins Bild; Boost und Lenkpfeile
  sind erst nach kurzem Scrollen zu sehen. Siehe Abschnitt 13.9 Punkt 3.
- **keine Bildratenmessung.** Es gibt weiterhin keine Zusage zur
  Flüssigkeit, nur den Nachweis, dass genau eine Animationsschleife
  läuft.

An Taxi Rush wurde in dieser Runde nichts geändert.

### 15.6 Was geprüft wurde

| Lauf | Ergebnis |
|---|---|
| `qualitaet-pruefen` (neu) | **45 / 45** |
| `ausgabe-pruefen` | 56 / 56 |
| `grundlagen-pruefen` | 60 / 60 |
| `startseite-pruefen` | 187 / 187 |
| `flotte-pruefen` | 199 / 199 |
| `rechtsseiten-pruefen` | 167 / 167 |
| `anmeldung-pruefen` | 154 / 154 |
| `kontoseiten-pruefen` | 181 / 181 |
| `gluecksrad-pruefen` | 77 / 77 |
| `rush-pruefen` | 178 / 178 |
| `rewards-pruefen` | 66 / 66 |
| `browser-pruefen` | 15 / 15 |
| `grundlagen-browser-pruefen` | 28 / 28 |

`ausgabe-pruefen` sank von 62 auf 56, weil sechs Bestandsdateien weniger
ausgeliefert werden. Kein Rückschritt.

> **Alle Sitzungen und Datenantworten sind simuliert.** Der Netzverkehr
> nach außen war abgeschnitten; keine Verbindung zu Supabase, keine
> Nachricht hat den Rechner verlassen (`window.open` abgefangen), keine
> produktiven Daten wurden angefasst, kein Gewinn ausgelöst.

### 15.7 Unverändert geblieben

Startseite und Hero-Video, Glücksrad, Taxi Rush, Yumak (weiterhin
Standbild), Rewards-Regeln und -Berechnungen, Datenbank, Rollen und
Berechtigungen, `admin/`, `fahrer/`, `dashboard/`. Die Originalbilder in
`admin/images/` sind unberührt; geändert wurden nur die beiden
Stilvorlagen, die sie als Hintergrund luden.

---

## 16. Schritt 025 — Kopfzeile, Spielevorschauen und drei Handy-Fehler

Branch `feature/025-kopfzeile-teaser`, abgezweigt von `159901a`.

### 16.1 Die Kopfzeile auf `spiele.html`

Die Spielewelt ist übernommener Bestand und wird nicht gebaut. Sie trug
deshalb noch eine eigene, zur Laufzeit zusammengesetzte Kopfzeile.
Gemessen bei 1440 px:

| | freigegeben (Astro) | Spielewelt (vorher) |
|---|---|---|
| Logo | 107 × 52 px | deutlich größer |
| Kopfhöhe | 81 px | 114 px |
| Navigation | Leistungen, Fahrzeugflotte, Rewards, Spiele, Kontakt, Anmelden, Telefon, WhatsApp, Fahrt anfragen | Startseite, Leistungen-Aufklappmenü, Fahrzeugflotte, Rewards, Kontakt |

`tools/kopfzeile-bestand.mjs` schneidet beim Bauen die **echte** Kopfzeile
aus dem fertigen Astro-Ergebnis heraus und setzt sie in `spiele.html` ein.
Eine Quelle, ein Aussehen: Ändert sich `Kopfbereich.astro`, ändert sich
`spiele.html` beim nächsten Build mit.

**Die eigentliche Schwierigkeit waren Kaskadenschichten.** Tailwind legt
seine Klassen in `@layer utilities`. Ungeschichtetes CSS gewinnt gegen
geschichtetes **immer** — unabhängig von Genauigkeit und Reihenfolge.
`style.css` ist ungeschichtet und schlug deshalb jede Regel der neuen
Kopfzeile. Gemessen:

| Bestandsregel | schlug | Folge |
|---|---|---|
| `.hidden` aus `style.css` | `.lg\:flex` | Navigation unsichtbar |
| `a{color:inherit}` | `.text-white/72` | falsche Verweisfarbe |
| `button{…!important}` | Schriftklassen | falsche Schriftgröße |
| `button svg{width:22px!important}` | `.w-[18px]` | zu große Symbole |
| `body.gameworld-body::after` (z-index 99) | Kopfzeile (z-index 40) | Kopfzeile vollständig verdeckt |

Von Hand dagegenzuhalten wäre eine zweite Kopfzeile in Zeitlupe gewesen.
Das Werkzeug arbeitet deshalb **mechanisch**: Es liest alle Klassennamen
der Kopfzeile — aus dem Markup *und* aus ihrem Bedienskript — sucht im
Design-Bündel die zugehörigen Regeln und gibt sie noch einmal aus,
ungeschichtet und auf `header[data-kopf]` begrenzt.

**Was dabei dreimal schiefging und gemessen korrigiert wurde:**

1. *Das ganze Bündel verlinkt.* Das holt Tailwinds Grundbereinigung
   („Preflight") mit, und die nimmt **der ganzen Spielewelt** Abstände und
   Schriftstärken: `BUTTON.drive` padding-left 6 px → 0, `P` margin-top
   14 px → 0, `H2` font-weight 700 → 400. Jetzt kommen nur Schriften,
   Eigenschaftsanmeldungen und Variablen mit — Letztere auf der Kopfzeile
   selbst statt auf `:root`, damit kein Variablenname der Spielewelt
   überschrieben werden kann. Die Grundbereinigung wird eigens auf
   `header[data-kopf]` umgeschrieben.
2. *Nur Nachfahren angesprochen.* Die Kopfzeile trägt Klassen am
   Wurzelelement selbst (`border-b`). `header[data-kopf] .border-b` trifft
   die nicht — sie war dadurch 80 statt 81 px hoch.
3. *Klassen des Bedienskripts übersehen.* Mit geöffnetem Mobilmenü wird
   die Kopfzeile schmaler; das Logo maß auf `rewards.html` 74 × 36 px und
   auf `spiele.html` 0 × 0.

**Ergebnis:** 0 von 50 Elementen weichen ab — bei 1440 px und bei 390 px,
im geschlossenen wie im geöffneten Mobilmenü. Logo 107 × 52 (PC) und
82 × 40 (Handy) auf beiden Seiten, Mobilmenü mit denselben zehn Einträgen
einschließlich Konto-Einstieg.

**Eine benannte Abweichung bleibt:** `spiele.html` setzt für das Dokument
`overflow-y: auto` und zeigt am Schreibtisch eine klassische
Bildlaufleiste; die Astro-Seiten blenden ihre aus. Der nutzbare Streifen
ist dadurch am PC 15 px schmaler. Das ist eine Eigenschaft der Seite, kein
Fehler der Kopfzeile, und auf dem Handy nicht vorhanden. Die Spielewelt
behält ihre Bildlaufleiste.

### 16.2 Die Spielevorschauen auf der Startseite

Vorher standen dort nachgezeichnete Motive: ein Rad aus Farbverläufen mit
einem „Y" in der Nabe und ein Rechteck auf ein paar Balken, samt einer
dauerhaft laufenden Animation der Fahrbahnstriche.

`tools/spielbilder.mjs` (`npm run spielbilder`) nimmt die Bilder jetzt dort
auf, wo sie herkommen: in der gebauten Spielewelt, im echten Browser.

| Datei | Größe | Inhalt |
|---|---|---|
| `gluecksrad-vorschau.webp` | 900 × 900, 63 KB | das Rad, wie es in der Spielewelt steht — Goldring, Zeiger, Nabe mit dem Bildzeichen. **Kein Dreh wird ausgelöst.** |
| `taxi-rush-vorschau.webp` | 1200 × 900, 30 KB | eine Spielszene: Taxi, Straße, Häuser, Bäume, Abholzone |

Beide zusammen 93 KB übertragen, im Browser gemessen. Die PNG-Aufnahmen
bleiben als Zwischenstand im Temp-Ordner und werden **nicht** ausgeliefert.

Zwei Bildausschnitte mussten nachgebessert werden — beide gemessen, nicht
geschätzt:

- Das Rad war in der Karte 356 px hoch bei 290 px Fläche und oben wie
  unten angeschnitten. Erst `h-[92%] w-auto`, dann `h-full w-full` im
  Gitter ergaben beide ein zu großes Bild; eine Prozenthöhe in einem
  Gitter, dessen Zeile sich nach dem Inhalt richtet, läuft im Kreis. Das
  Bild steht jetzt selbst absolut auf `inset-0`.
- Die Marke „Sofort spielbar" schnitt die Anzeige mit Abhol- und Zielort
  an. Die oberste Zeile des Spielfelds wird deshalb nicht mehr
  mitaufgenommen.

In den Karten läuft nichts dauerhaft: 0 Dauer-Animationen, kein Video,
kein Spielfeld, kein eingebetteter Rahmen. Die Aussagen stimmen: Das Rad
ist „Noch gesperrt" und führt zu „In der Spielewelt ansehen" mit dem
Zusatz „für Kundenkonten derzeit gesperrt" — **keine Teilnahme wird
versprochen**. Yumaks Box ist „Noch gesperrt" und „erscheint nur nach
einem bestätigten Gewinn" — **nicht als fertige Funktion dargestellt**.
Taxi Rush ist „Sofort spielbar" und führt auf `spiele.html#taxiRushTitle`.

### 16.3 Drei Fehler von einem echten iPhone

Gemeldet mit zwei Bildschirmaufnahmen.

**Die Mitgliedskarte schnitt Punkte und Status ab.** Die Karte hatte
`aspect-ratio: 1.586 / 1` — das Maß einer Scheckkarte — und
`overflow-hidden`. Das war ein Deckel. Nachgestellt mit auf 140 Prozent
vergrößerter Schrift: 248 px Inhalt in 209 px Karte, „Punkte" und
„Status" unten weg; ein langer Name wurde zusätzlich mit `truncate`
gekürzt. Die Kartenform ist jetzt eine **Mindesthöhe** (210 / 260 / 322 px
— dieselben Werte, die das alte Seitenverhältnis an den jeweiligen
Spaltenbreiten ergab), die Karte selbst eine Spalte, ihr Inhalt nimmt den
übrigen Platz ein, und der Name bricht um. Kleinere Schrift wäre die
falsche Antwort gewesen: Sie macht die Karte nicht lesbarer, nur enger.

**Die Kopfzeile überdeckte „Ihre Spiele".** `spiele.html` rechnet mit
`scroll-padding-top: 84px`, gemessen für die alte 88-px-Kopfzeile. Mit der
freigegebenen landete „Glücksrad" 59 px unter dem oberen Rand und damit
hinter der Kopfzeile. Der eingesetzte Block setzt jetzt 121 px am
Schreibtisch und 105 px am Handy — Kopfhöhe plus 40 px Luft. Alle sechs
Sprungziele der Spielewelt stehen frei; geprüft wird nicht nur gerechnet,
sondern der Punkt im Text wirklich abgefragt.

**Das Glücksrad war oval.** Der Goldring war ein Gitterelement mit
`width: 100%; aspect-ratio: 1`. Damit hängen zwei Größen voneinander ab:
Die Zeilenhöhe des Gitters richtet sich nach dem Element, die Höhe des
Elements nach dem Gitter. Wie ein Browser das auflöst, ist nicht überall
gleich.

> **Offen gesagt: Der Fehler ließ sich hier nicht nachstellen.** In Chrome
> war das Rad bei allen neun gemessenen Breiten (320 bis 1440 px) exakt
> quadratisch — Bühne, Goldring, Scheibe und Nabe. Geändert wurde
> trotzdem, weil die Ursache benennbar ist: Der Ring liegt jetzt absolut
> auf der quadratischen Bühne und hat keine eigene Höhenrechnung mehr.
> Ob das auf dem iPhone genügt, kann nur ein Blick auf dem Gerät zeigen.

Die Scheibe selbst ist ein SVG mit quadratischer `viewBox` und der Vorgabe
`xMidYMid meet` — sie kann durch Skalierung nicht verzerrt werden.

### 16.4 Zwei neue Prüfläufe

| Lauf | Umfang |
|---|---|
| `npm run kopf-teaser-pruefen` | 55 / 55 — Kopfzeile Element für Element gegen `rewards.html`, Mobilmenü, Vorschaubilder, Aussagen und Ziele der drei Karten |
| `npm run handy-pruefen` | 13 / 13 — Mitgliedskarte in drei Fällen, sechs Sprungziele, Radform bei neun Breiten |

Beide laufen mit abgeschnittenem Netzverkehr. Die Anzeigewerte der
Mitgliedskarte werden für die Messung gesetzt — erfundene Zahlen, **keine
echten Kontodaten**, kein Dreh am Rad.

Ein eigener Fehler in der Prüfung selbst sei erwähnt, weil er beinahe
einen Fehlalarm erzeugt hätte: Die erste Ruheprüfung maß los, bevor das
weiche Scrollen überhaupt begonnen hatte, hielt die stehende Seite für
Ruhe und meldete eine verdeckte Überschrift, wo keine war. Sie wartet
jetzt, bis die Seite sich bewegt hat **und** danach ruhig bleibt.

### 16.5 Alle Prüfläufe nach Schritt 025

| Lauf | Ergebnis |
|---|---|
| `ausgabe-pruefen` | 56 / 56 |
| `grundlagen-pruefen` | 60 / 60 |
| `rechtsseiten-pruefen` | 167 / 167 |
| `flotte-pruefen` | 199 / 199 |
| `anmeldung-pruefen` | 154 / 154 |
| `kontoseiten-pruefen` | 181 / 181 |
| `gluecksrad-pruefen` | 77 / 77 |
| `rush-pruefen` | 178 / 178 |
| `startseite-pruefen` | 187 / 187 |
| `qualitaet-pruefen` | 45 / 45 |
| `browser-pruefen` | 15 / 15 |
| `grundlagen-browser-pruefen` | 28 / 28 |
| `kopf-teaser-pruefen` | 55 / 55 |
| `handy-pruefen` | 13 / 13 |

`rewards-pruefen` braucht einen laufenden Vorschau-Server auf Port 5200
und wurde hier nicht gefahren.

### 16.6 Unverändert geblieben

Hero und Hero-Video, Spiellogik, Gewinnregeln, Rewards-Berechnungen,
Datenbank, Rollen und Berechtigungen, `admin/`, `fahrer/`, `dashboard/`.
Yumak bleibt Standbild. Die alte Kopfzeile bleibt im Dokument stehen und
wird nur ausgeblendet — so bleibt die byteweise Prüfung des Bestands
möglich; `ausgabe-pruefen` schneidet die eingesetzten Blöcke wieder heraus
und vergleicht den Rest Byte für Byte.

`RAD_FELDER` in `src/inhalte.ts` wird seit dem Austausch der
Vorschaugrafik nicht mehr verwendet. Die Tabelle bildet die Feldaufteilung
aus Migration 007 ab und wurde deshalb stehen gelassen, statt sie
beiläufig zu löschen.

---

## 17. Passwort-Reset für Kunden — belegtes Veröffentlichungshindernis

Stand 28.09.2026. Untersucht in Schritt 026, **nicht behoben**.

### 17.1 Der Befund in einem Satz

Die Kundenseite fordert den Reset technisch korrekt an, Supabase nimmt den
Link an — **die Weiterleitung landet trotzdem auf der alten Site URL**, und
der Kunde kommt nie auf die Seite, auf der er sein Passwort vergeben könnte.

### 17.2 Was gemessen wurde

**a) Die Kundenseite sendet das richtige Ziel.** Nicht aus dem Quelltext
geschlossen, sondern zur Laufzeit abgefangen (die Anfrage wurde dabei
abgebrochen, es ging keine Mail hinaus):

```
Herkunft http://192.168.178.141:5200
  POST /auth/v1/recover
  redirect_to = http://192.168.178.141:5200/passwort-zuruecksetzen.html

Herkunft http://127.0.0.1:5200
  POST /auth/v1/recover
  redirect_to = http://127.0.0.1:5200/passwort-zuruecksetzen.html
```

Bestätigt in einem zweiten Durchgang durch eine vorübergehend eingebaute,
sichtbare Diagnosezeile auf dem Gerät des Auftraggebers:

```
redirectTo: http://192.168.178.141:5200/passwort-zuruecksetzen.html
Projekt:    rzqhzyzabakrsokuqebc.supabase.co
```

Das Projekt ist damit ebenfalls bestätigt — die Einstellungen wurden im
richtigen Projekt vorgenommen.

**b) Supabase nimmt den Link an.** Aus dem Auth-Log des Projekts:

| Feld | Wert |
|---|---|
| Endpunkt | `/verify` |
| action | `login` |
| status | `303` |
| Fehler | keiner |
| referer | `http://127.0.0.1:8000/admin/login.html` |

Der Recovery-Code war also gültig, der Dienst hat eine Sitzung ausgestellt
und weitergeleitet. **Der Fehler liegt nicht beim Code und nicht beim
Zeitablauf.**

**c) Die Weiterleitung geht trotzdem an die alte Adresse.** Eine
**frisch nach der Änderung** erzeugte Mail führte erneut auf
`http://127.0.0.1:8000/admin/login.html`. Am Handy erscheint dort „keine
Verbindung", weil `127.0.0.1:8000` der eigene Rechner des Telefons ist.

Und das, obwohl zu diesem Zeitpunkt unter **Redirect URLs** gespeichert war:

```
http://192.168.178.141:5200/passwort-zuruecksetzen.html
http://127.0.0.1:5200/passwort-zuruecksetzen.html
http://192.168.178.141:5200/**
```

### 17.3 Was der Code NICHT ist

Im ganzen Projekt durchsucht:

| Suche | Treffer |
|---|---|
| `:8000` | **0** |
| `admin/login` als Weiterleitungsziel | **0** |
| `SITE_URL` / `site_url` | **0** |
| `resetPasswordForEmail` in `admin/`, `fahrer/`, `dashboard/` | **0** |
| `verifyOtp`, `exchangeCodeForSession` | **0** |

Alle fünf `createClient`-Aufrufe lesen dieselbe `admin/supabase-config.js`
(`window.TaxiSupabaseConfig`) — **ein Projekt, ein Schlüssel**. Der
Flow-Typ ist mangels `flowType`-Angabe **implicit**; Recovery-Links kommen
also als `#access_token=…&type=recovery`.
`src/pages/passwort-zuruecksetzen.astro` nimmt beide Formen an (Raute mit
`access_token` oder Abfrage mit `code`), wartet auf `PASSWORD_RECOVERY`,
leert danach die Adresszeile und ruft `updateUser({ password })`. **Diese
Seite ist vollständig und korrekt.**

### 17.4 Warum die alte Site URL vermutlich mit Absicht dort steht

`admin/login.html` ist **selbst eine Recovery-Landeseite**:

```js
// admin/login.js:303-315
function parseRecoveryHash() {
  const params = new URLSearchParams(hash);
  if (params.get("type") === "recovery" && accessToken && refreshToken) …
}
// :440 → client.auth.setSession({…}) → toggleRecoveryMode(true)
```

Sie liest den Recovery-Hash, setzt die Sitzung und zeigt ein
Passwortformular. Damit das funktioniert, muss die Site URL auf sie zeigen —
und der Adminbereich lief während der Entwicklung auf Port 8000.

**Die Site URL wurde deshalb nicht angefasst.** Sie zu ersetzen, würde die
Passwortwiederherstellung für Verwaltung und Mitarbeiterportal unbrauchbar
machen. Der Auftraggeber hat das ausdrücklich so entschieden.

### 17.5 Was noch offen ist

Eine Prüfung steht aus und ist die naheliegendste verbliebene Erklärung:

> **Der Inhalt der Mailvorlage `Authentication → Emails → Reset Password`
> ist nicht bekannt.** Verwendet sie `{{ .ConfirmationURL }}`, baut Supabase
> das Ziel selbst. Steht dort dagegen `{{ .SiteURL }}` oder eine
> ausgeschriebene Adresse, ist das Ziel fest eingebaut — dann hilft **keine
> Erlaubnisliste**, und genau das würde das beobachtete Verhalten
> vollständig erklären.

Weitere denkbare, ebenfalls ungeprüfte Ursachen: eine Abweichung in der
Schreibweise der gespeicherten Einträge, oder eine Verzögerung, bis
geänderte Einstellungen greifen. **Keine davon ist nachgewiesen** — sie
werden hier als offen geführt, nicht als Ursache behauptet.

### 17.6 Folge

**Der Passwort-Reset für Kundenkonten ist nicht funktionsfähig.** Ein Kunde,
der sein Passwort vergisst, erhält zwar eine Mail, landet aber auf einer
Adresse, die es für ihn nicht gibt. Es gibt keinen zweiten Weg zurück ins
Konto.

Das ist ein **Veröffentlichungshindernis** und gehört in die Liste
„vor Veröffentlichung erforderlich".

---

## 18. Der eingebaute Maildienst reicht für den Betrieb nicht

Der Supabase-Standardversand ist auf **zwei Authentifizierungs-E-Mails pro
Stunde** begrenzt — projektweit, nicht pro Empfänger.

Betroffen sind alle Mails, die an Konten hängen: Registrierungsbestätigung,
Passwort-Reset, Einladungen, Adressänderungen.

**Was das im Betrieb bedeutet:** Melden sich an einem Vormittag drei Kunden
neu an, bekommt der dritte seine Bestätigungsmail nicht. Vergisst jemand
sein Passwort, während zwei Registrierungen liefen, kommt sein Reset-Link
nicht an. Der Versand schlägt dabei **still** fehl — die Seite zeigt
weiterhin ihre neutrale Bestätigung, denn sie erfährt nichts davon.

Hinzu kommt: Der eingebaute Versand ist ausdrücklich nur für Entwicklung
gedacht und gibt keine Zustellgarantie.

> **Vor der Veröffentlichung muss ein eigener SMTP-Dienst eingerichtet
> werden** (`Project Settings → Authentication → SMTP Settings`), zum
> Beispiel über den vorhandenen Geschäftsmailanbieter. Dafür werden
> Zugangsdaten des Mailkontos benötigt — sie gehören in die
> Supabase-Einstellungen, **nicht** in dieses Projektverzeichnis.

Zusätzlich empfehlenswert, sobald die Domain steht: SPF-, DKIM- und
DMARC-Einträge für `taxigermersheim.de`, sonst landen die Mails mit hoher
Wahrscheinlichkeit im Spam.

**Das ist eine zweite, unabhängige Veröffentlichungsbedingung** — sie
besteht auch dann, wenn die Weiterleitung aus Abschnitt 17 behoben ist.

---

## 19. Getrennte Ziele für Kunden und Verwaltung — Bestandsaufnahme

### 19.1 Was es heute gibt (nur gelesen, nichts geändert)

Durchsucht wurden Quelltext, Migrationen, Setup-Dateien und die interne
Dokumentation.

| Gesucht | Ergebnis |
|---|---|
| Konzeptpapier oder Notiz zu getrennten Recovery-Zielen | **nicht vorhanden** |
| SQL, Migration oder Setup-Datei zu Auth-Adressen | **nicht vorhanden** — die Werte stehen ausschließlich im Dashboard |
| `emailRedirectTo` irgendwo im Code | **0 Treffer** |

**Zwei Landeseiten existieren, aber unabgestimmt:**

| Seite | Nimmt entgegen | Ziel wird gesetzt durch |
|---|---|---|
| `admin/login.html` | `#access_token…&type=recovery` (implicit) | **nichts im Code** — allein die Site URL |
| `passwort-zuruecksetzen.html` | Raute *oder* `?code=` | `redirectTo` aus `passwort-vergessen.html` |

Sie sind unabhängig voneinander entstanden. Ein gemeinsames Konzept, welche
Mail wohin führen soll, gibt es nicht.

**Zweite Folge derselben Lücke:** `signUp` übergibt **kein**
`emailRedirectTo`. Die Registrierungsbestätigung hängt damit ebenfalls
allein an der Site URL — sie führt heute also genauso auf die alte
Admin-Adresse. Das war bereits als Angabe **I2** vermerkt und ist damit
kein neuer, aber ein nun belegter Punkt.

### 19.2 Empfehlung für den produktiven Stand unter taxigermersheim.de

**Nichts davon jetzt umsetzen.** Die Site URL, die Authentifizierung und die
Datenbank bleiben unverändert, bis der Auftraggeber freigibt.

Der Kern: **Die Site URL ist nur ein Rückfallwert.** Wer sie als Steuerung
benutzt, kann immer nur einen Weg bedienen. Jeder Mailweg sollte sein Ziel
selbst mitgeben; dann ist es gleich, worauf die Site URL zeigt.

**Schritt 1 — Jeder Weg nennt sein Ziel selbst.**

| Stelle | Heute | Vorschlag |
|---|---|---|
| `passwort-vergessen` (Kunde) | `redirectTo` wird gesetzt ✓ | unverändert |
| Registrierung (Kunde) | kein `emailRedirectTo` | `emailRedirectTo: <Herkunft>/anmelden.html?bestaetigt=1` ergänzen |
| Passwort-Reset Verwaltung | **gibt es nicht** — läuft über das Dashboard und damit über die Site URL | eine eigene Anforderung in `admin/login.js` mit `redirectTo: <Herkunft>/admin/login.html` |

Erst wenn die Verwaltung ihr Ziel selbst mitgibt, ist die Site URL frei.

**Schritt 2 — Erlaubnisliste vollständig.** Alle Ziele eintragen, die
tatsächlich vorkommen:

```
https://taxigermersheim.de/passwort-zuruecksetzen.html
https://taxigermersheim.de/anmelden.html
https://taxigermersheim.de/admin/login.html
```

Die lokalen Entwicklungsadressen können daneben stehen bleiben; sie sind
im Internet nicht erreichbar und damit kein Risiko.

**Schritt 3 — Site URL erst danach.** Sie sollte dann auf
`https://taxigermersheim.de` zeigen — den Weg, der im Betrieb der
häufigste ist. **Voraussetzung ist Schritt 1**, sonst verliert die
Verwaltung ihre Passwortwiederherstellung.

**Schritt 4 — Eigener SMTP-Dienst** (Abschnitt 18). Unabhängig von allem
Übrigen.

**Schritt 5 — Mailvorlage prüfen.** Enthält die Recovery-Vorlage etwas
anderes als `{{ .ConfirmationURL }}`, greift keiner der Schritte 1 bis 3.
Diese Prüfung steht noch aus (Abschnitt 17.5) und sollte die **erste** sein.

**Reihenfolge:** 5 → 1 → 2 → 3 → 4.

### 19.3 Was in dieser Untersuchung nicht getan wurde

Keine Supabase-Einstellung geändert. Keine Site URL angefasst. Keine
Datenbank, keine Rolle, keine Berechtigung, keine Rewards-Regel berührt.
Keine E-Mail ausgelöst — die Messung in 17.2 a) brach die Anfrage ab, bevor
sie das Gerät verließ. Keine Tokens, Passwörter, Schlüssel oder
Authorization-Header angefordert, ausgegeben oder protokolliert.

Die vorübergehend eingebaute Diagnosezeile ist wieder entfernt; die Quelle
ist danach buchstabengleich mit dem Stand davor, und im gebauten Ergebnis
findet sich keine Spur mehr davon.

---

## 20. Schritt 027 — Auth-Korrekturen und Übernahme aus feature/011

Branch `feature/027-auth-korrekturen`, abgezweigt von `b8d0155`.

### 20.1 Registrierungsbestätigung gibt ihr Ziel jetzt selbst mit

**Vorher:** `CustomerAuth.signUp` übergab kein `emailRedirectTo`. Die
Bestätigungsmail hing damit an der projektweiten **Site URL** — und die
zeigt gemessen auf `http://127.0.0.1:8000/admin/login.html`, die
Anmeldeseite der Verwaltung. Ein Kunde wäre nach dem Klick in der
Bestätigungsmail dort gelandet, nicht im eigenen Konto.

**Jetzt:** `signUp` baut das Ziel aus der eigenen Herkunft — dieselbe
Bauart wie beim Passwort-Reset:

```js
new URL('/anmelden.html?bestaetigt=1', window.location.origin).href
```

Damit stimmt es in jeder Umgebung: lokal, im WLAN und später unter der
echten Domain, ohne dass irgendwo eine Adresse fest eingetragen werden
müsste. Bei `file://` gibt es keine brauchbare Herkunft; dann wird kein
Ziel mitgegeben und die Registrierung bleibt trotzdem möglich.

**Gemessen** auf Netzebene — die Anfrage wurde abgefangen und
abgebrochen, es ging nichts an Supabase:

```
POST /auth/v1/signup
redirect_to = http://127.0.0.1:5295/anmelden.html?bestaetigt=1
```

> **Was das NICHT belegt:** ob Supabase dieses Ziel auch **befolgt**. Das
> hängt an der Erlaubnisliste des Projekts („Redirect URLs"). Steht die
> Adresse nicht dort, fällt Supabase weiterhin auf die Site URL zurück.
> Das ist eine Projekteinstellung und lässt sich aus dem Code nicht
> erzwingen. **Für die künftige Domain muss
> `https://taxigermersheim.de/anmelden.html` in die Liste.**

### 20.2 Warum `anmelden.html` das richtige Ziel ist

Geprüft wurden die vorhandenen öffentlichen Seiten. `anmelden.html` ist
die passende Landeseite:

- Sie wertet bereits `?registered=1` aus und kennt den Zustand „gerade
  registriert".
- Sie ist der Ort, an dem es nach der Bestätigung weitergeht — entweder
  durch Weiterleitung ins Konto oder durch die Anmeldung.
- `meinkonto.html` wäre falsch: Sie ist geschützt und würde ohne Sitzung
  sofort zurückwerfen.
- Eine eigene Seite wäre eine zusätzliche Seite für einen Zustand, der
  schon abgebildet ist.

**Beide Rückkehrformen werden verarbeitet** — geprüft:

| Form | Adresse | Verhalten |
|---|---|---|
| implicit | `?bestaetigt=1#access_token=…&type=signup` | Sitzung wird übernommen, Weiterleitung ins Konto |
| PKCE | `?bestaetigt=1&code=…` | ebenso |
| ohne Merkmal | `?bestaetigt=1` | Hinweis, hier anzumelden |
| Fehler | `?error=…&error_code=…` | Fehlerkennung wird benannt |

Das Projekt läuft derzeit auf **implicit** (kein `flowType` gesetzt,
Vorgabe von supabase-js v2). Die PKCE-Form wird trotzdem bedient, damit
ein Wechsel nichts zerbricht.

In **allen** Fällen wird die Adresszeile geleert — Zugangsmerkmale
gehören nicht in Verlauf, Referer oder Bildschirmfoto. Die Fehlermeldung
zeigt nur die **Kennung** des Dienstes, nicht seine Beschreibung: Die kann
die E-Mail-Adresse enthalten.

Weitergeleitet wird **nur** bei einer Rückkehr aus der Mail. Wer die
Anmeldeseite angemeldet aufruft, bleibt dort.

### 20.3 Abmelden verschluckt keine Fehler mehr

**Vorher** in `customer-auth.js`:

```js
try { await client.auth.signOut(); } catch (_error) { /* ignore */ }
syncSessionState(null);
return true;          // ← meldete IMMER Erfolg
```

Die Oberfläche sagte „abgemeldet", auch wenn der Dienst nichts widerrufen
hatte. Für eine Sicherheitshandlung ist das die falsche Auskunft: Auf
anderen Geräten wäre die Anmeldung weiter gültig gewesen, ohne dass es
jemand erfahren hätte.

**Jetzt** werden **beide** Wege geprüft, auf denen ein Fehlschlag ankommen
kann — eine geworfene Ausnahme **und** ein zurückgegebenes `{ error }`.
Der mitgelieferte Client meldet Fehler nämlich als Rückgabewert, nicht als
Ausnahme; das war der Weg, der durchrutschte.

Örtlich aufgeräumt wird **immer** — niemand soll angemeldet aussehen, wenn
er es nicht mehr sein will. Erst danach wird der Fehler weitergereicht.

**Gemessen** gegen die echte `customer-auth.js`, auf Netzebene:

| Antwort des Dienstes | Ergebnis |
|---|---|
| 204 | Erfolg |
| 500 | **Fehler** gemeldet |
| Verbindungsabbruch | **Fehler** gemeldet |
| 403 | Erfolg — der Client wertet 401/403/404 bewusst als „Sitzung ohnehin fort" |

In **allen vier** Fällen ist die Sitzung örtlich beendet. Der Wortlaut des
Dienstes erscheint nie in der Oberfläche.

> Dass der Abmelde-Endpunkt wirklich gerufen wurde, zeigen die
> unterschiedlichen Ergebnisse je Antwort: Ohne Sitzung wäre jeder Fall
> gleich ausgegangen.

**Drei aufrufende Stellen wurden angepasst**, damit der Fehler dort
ankommt, wo er hingehört:

- `meinkonto.html` und `kunden-einstellungen.html` zeigten schon eine
  ehrliche Meldung — sie greift jetzt tatsächlich.
- `rewards.html` verschluckte den Fehler ebenfalls und zeigte „abgemeldet".
  Jetzt erscheint daneben ein Hinweis, wenn der Widerruf nicht bestätigt
  wurde.
- `passwort-zuruecksetzen.html` meldete sich **innerhalb** desselben
  `try` ab, in dem das Passwort geändert wird. Ein Fehler beim Abmelden
  hätte die bereits angezeigte Erfolgsmeldung überschrieben und dem Kunden
  gesagt, das Passwort sei nicht geändert worden — **das wäre falsch
  gewesen**. Der Aufruf hat jetzt ein eigenes `try`, und ein
  fehlgeschlagener Widerruf erscheint als Zusatz neben dem Erfolg.

**Der Geltungsbereich bleibt `global`** — der Vorgabewert. Nachgesehen im
mitgelieferten Client (`signOut(e = {scope:'global'})`) und in der
offiziellen Dokumentation. Damit verfallen alle Refresh-Tokens des Kontos.

> **Grenze, unverändert:** Ein bereits ausgestellter Access-Token bleibt
> bis zu seinem Ablauf gültig — ein signiertes JWT lässt sich nicht
> zurückholen. Der Widerruf trifft die Refresh-Tokens.

### 20.4 Der Kunden-Passwortreset bleibt offen

Unverändert gegenüber Abschnitt 17: **Er funktioniert nicht.** Die
Kundenseite sendet das richtige Ziel, Supabase nimmt den Link an, die
Weiterleitung fällt trotzdem auf die alte Site URL zurück.

Die Korrektur aus 20.1 ändert daran **nichts** — sie betrifft die
Registrierungsbestätigung, einen anderen Mailweg. Beide hingen an
derselben Ursache; behoben ist bisher nur der eine, und auch der nur
soweit es der Code kann.

**Als Nächstes zu klären bleibt der Inhalt der Recovery-Mailvorlage**
(Abschnitt 17.5).

### 20.5 Mailversand bleibt Veröffentlichungsvoraussetzung

Unverändert gegenüber Abschnitt 18: Der eingebaute Supabase-Versand lässt
**zwei Authentifizierungs-E-Mails pro Stunde** zu, projektweit, und
schlägt still fehl. Vor der Veröffentlichung sind erforderlich:

- ein **eigener SMTP-Dienst** (`Project Settings → Authentication → SMTP Settings`)
- **SPF**, **DKIM** und **DMARC** für `taxigermersheim.de`

Ohne beides landen Bestätigungs- und Reset-Mails im Spam oder gar nicht
beim Kunden — unabhängig davon, ob die Weiterleitung stimmt.

### 20.6 Übernommen aus feature/011

| Commit | Übernommen | Inhalt |
|---|---|---|
| `316de73` | **ja**, unverändert | Anhang-Badge im Mitarbeiterportal wertet `document_submission_id` aus |
| `8ff510a` | **ja**, unverändert | Rollenprüfung aus `profiles`, Navigationseintrag „Dokumentfristen", verwaistes `</div>` entfernt |
| `2c7dc39` | **nur der CLAUDE.md-Teil** | Regel zu den Plattform-Grants auf `storage.objects`/`storage.buckets` |
| `266de08` | **nein** | Prüfbelege zum Rückweg R1–R3 der 011-Einspielung |
| `8102c08` | **nein** | Funktionstest und Testdaten-Bereinigung der 011-Einspielung |

**Warum die drei SQL-Commits nicht vollständig übernommen wurden:**

- Sie enthalten rund 4 000 Zeilen SQL zur Einspielung der Bestandsdatenbank
  — **Protokoll eines Vorgangs, der gegen die produktive Instanz bereits
  ausgeführt wurde.** Sie gehören zum Admin-/Dispatcher-Paket, nicht zum
  Abschluss der öffentlichen Webseite.
- Der übernommene Code **hängt nicht davon ab**: geprüft, 0 Verweise aus
  `fahrer/mitarbeiter.js`, `admin/dokumenteingang-supabase.js`,
  `admin/sidebar.js` und `admin/dokumentfristen.html` auf diese Dateien.
  Die Datenbankseite ist über `supabase/migrations/011_…` bereits
  vorhanden.
- `266de08` und `8102c08` ließen sich einzeln **nicht sauber anwenden** —
  sie bauen auf Dateien auf, die erst `2c7dc39` anlegt.
- `2c7dc39` ändert außerdem `supabase/tests/local/02_plattform_shim.sql`,
  das **lokale Testgerüst**. Diese Änderung ließe sich nur mit einem Lauf
  des portablen PostgreSQL belegen, der hier nicht Teil des Auftrags war.
  Eine ungeprüfte Änderung am Testgerüst zu übernehmen wäre schlechter,
  als sie auf ihrem Branch zu lassen.
- **Nichts geht verloren:** `feature/011-einspielung-bestandsdatenbank`
  besteht unverändert weiter.

**Warum der CLAUDE.md-Teil doch übernommen wurde:** Er hält fest, dass
Supabase das Entziehen von Rechten an API-Rollen in `storage` seit dem
21.04.2025 nicht mehr zulässt — ein `REVOKE` dort läuft ohne Fehler durch
und bewirkt nichts. Ohne diese Notiz läuft die nächste Arbeit am
Dateizugriff erneut in dieselbe Falle. Die Regel gilt unabhängig davon, wo
die Einspielskripte liegen.

**Keine bestehende Migration wurde angefasst** — geprüft: 0 Dateien unter
`supabase/migrations/` berührt.

### 20.7 Ein zusätzlicher Befund

Beim Nachzählen nach der Übernahme fiel in `admin/dokumentfristen.html`
ein **zweiter** Markup-Fehler auf, eine Zeile unter dem behobenen: Im
Abschnitt „Eingang aus dem Mitarbeiterportal" wird
`<div class="admin-panel-head">` geöffnet und nie geschlossen — drei
öffnende, zwei schließende `<div>`.

Vorher hob sich das gegen das verwaiste `</div>` aus dem Nachbarabschnitt
in der **Gesamtzahl** auf. Beide Stellen waren trotzdem falsch, nur in
entgegengesetzter Richtung: Nach der Übernahme stand die Datei bei 17
öffnenden zu 16 schließenden, während die Schwesterseiten `fahrzeuge.html`
und `rechnungen.html` ausgeglichen sind.

Ergänzt, jetzt 17 zu 17. **Das ging über den Auftrag hinaus** — es wurde
beim Prüfen der beauftragten Korrektur gefunden und betrifft dieselbe
Datei und dieselbe Zeilengruppe.

### 20.8 Was nicht gemacht wurde

- **Keine neue Admin-Passwortwiederherstellung.** Sie gehört zum
  Admin-/Dispatcher-Paket.
- Keine Supabase-Einstellung geändert, keine Site URL angefasst, keine
  Datenbank, Rolle, Berechtigung oder Rewards-Regel berührt.
- Keine E-Mail ausgelöst, kein Konto angelegt, keine Anmeldung
  durchgeführt.

### 20.9 Prüfläufe

| Lauf | Ergebnis |
|---|---|
| `auth-027-pruefen` (neu) | **37 / 37** |
| `ausgabe-pruefen` | 56 / 56 |
| `anmeldung-pruefen` | 154 / 154 |
| `kontoseiten-pruefen` | 181 / 181 |
| `rewards-pruefen` | 66 / 66 |
| `qualitaet-pruefen` | 45 / 45 |

Gefahren wurden nur die Läufe, die diese Änderungen berühren.

> **Alles simuliert.** Der Netzverkehr nach außen war abgeschnitten.
> Die Prüfung belegt, dass die Seiten das Richtige senden und richtig
> reagieren — **nicht**, dass Supabase die Ziele befolgt oder Mails
> zustellt.

**Ein eigener Fehler in der Prüfung sei erwähnt,** weil er beinahe drei
Fehlalarme erzeugt hätte: Die ersten Fassungen ersetzten
`window.CustomerAuth.getClient` durch eine Attrappe. `customer-auth.js`
holt ihren Client aber über eine Funktion **im Modulabschluss** — die
Attrappe wirkte nie, und der Lauf meldete Fehler im Code, wo keine waren.
Gemessen wird jetzt auf **Netzebene**: Die Anfragen werden abgefangen und
selbst beantwortet.

---

## 21. Schritt 028 — Mitarbeiterportal: Gestaltung und Zugangsschutz

Branch `feature/028-mitarbeiterportal`, abgezweigt von `14d137e`.

### 21.1 Bestandsaufnahme

| Frage | Befund |
|---|---|
| Seiten | zwei: `fahrer/index.html` (Anmeldung), `fahrer/mitarbeiter.html` (Portal) |
| Skripte | `app.js`, `employee-supabase.js`, `mitarbeiter-login.js`, `mitarbeiter.js`; dazu aus `admin/`: `supabase-config.js`, `personal-shared.js`, `qualitaet-shared.js`, `ui-visible-terms.js`, `ui-text.js` |
| Stil | eine Datei, `fahrer/app.css` |
| Echte Sitzung nötig | `mitarbeiter.html` — geprüft über `EmployeeSupabase.checkSession()`: echte Supabase-Sitzung **und** Profil mit `active = true` und `employee_id` |
| Daten gelesen | `profiles`, `employees`, `shifts` (nur veröffentlichte), `vehicles`, `vacation_requests`, `sickness_reports`, `document_types`, `document_submissions` |
| Daten geschrieben | Urlaubsantrag, Krankmeldung, Dokumenteinreichung |
| Dateien | Upload in den Storage-Bucket der Nachweise; Abruf nur über **signierte Adresse** (`getSignedDocumentUrl`, 60 Sekunden) |
| Besonders schützenswert | Krankmeldungen mit Zeitraum und Nachweis, Führerschein, Personenbeförderungsschein, Name, Beschäftigungsart |
| Nur Attrappe | die örtlichen Zusatzhinweise aus `AdminPersonnelDemo` (siehe 21.5) |

**Vor der Anmeldung sichtbar?** Nein. `body[data-portal-loading]` verbirgt
den Inhalt, bis die Sitzungsprüfung durch ist. Gemessen bei absichtlich
verlangsamter Antwort: Der Inhalt bleibt verborgen.

### 21.2 Drei Sicherheitsbefunde — belegt, dann behoben

Alle drei wurden **zuerst nachgestellt**, bevor etwas geändert wurde.

**Befund 1 — eine Zeile im Browserspeicher genügte.**
Der Wächter `requireDemoSession()` las eine Marke aus dem Browserspeicher
und ließ durch, wenn darin `authenticated: true` stand. Nachgestellt:
Marke gesetzt, `mitarbeiter.html` direkt aufgerufen → **Portalinhalt
sichtbar**, ohne jede Anmeldung.

Behoben: Es gibt nur noch **eine** Eintrittsprüfung, `checkSession()`.
Die Marke bleibt als Bequemlichkeit, trägt aber keine Entscheidung mehr.
Nachgemessen: derselbe Aufruf landet jetzt auf `index.html`, und im
Dokument steht kein Portalinhalt.

**Befund 2 — ein Ausfall der Konfiguration machte aus dem Portal ein Demo.**
Fiel `admin/supabase-config.js` aus (404, gesperrt, Netz weg), schaltete
das Portal in einen Demo-Modus, in dem allein die Marke aus Befund 1
geprüft wurde. Die Inhalte kamen dann aus `AdminPersonnelDemo` — mit
**erfundenen Personen**. Die Anmeldeseite zeigte in diesem Fall den
Hinweis „Demo-Zugang: demo / demo".

> **Genau gemessen, damit nichts Falsches behauptet wird:** Der Zugang
> selbst ließ sich nicht auslösen — das E-Mail-Feld weist „demo" als
> ungültig ab, bevor das Formular absendet. Wirksam war der **Hinweis**:
> Er nannte Zugangsdaten, sobald die Konfiguration ausfiel.

Behoben: Kein Ersatzweg mehr. Ohne eingerichtete Verbindung gibt es keine
Anmeldung, und die Seite sagt, woran es liegt. Der Demo-Zugang und sein
Hinweis sind aus Quelle **und** Auslieferung entfernt.

**Befund 3 — die Bibliothek kam von einem fremden Netz.**
`employee-supabase.js` lud `cdn.jsdelivr.net/npm/@supabase/supabase-js@2`
— ohne feste Version. Gemessen: Der Aufruf ging beim Öffnen der
Anmeldeseite hinaus.

Behoben: Es wird die mitgelieferte `vendor/supabase-js-2.117.0.js`
geladen, dieselbe Datei wie auf der öffentlichen Webseite seit Schritt 017.
Nachgemessen: kein Aufruf mehr an ein fremdes CDN.

### 21.3 Zwei weitere Befunde aus der eigenen Prüfung

**Gesperrter Browserspeicher brach das Portal ab.** Die Ausnahme kam aus
`admin/personal-shared.js:835`. Ein gesperrter Speicher ist keine
Störung, sondern eine Einstellung des Browsers — sie darf die Bedienung
nicht verhindern. Abgesichert an allen acht Stellen im Portal; der Zähler
für Untätigkeit hält dann einen Wert im Arbeitsspeicher.
`admin/personal-shared.js` selbst wurde **nicht** angefasst — die
Verwaltung gehört in ein eigenes Paket.

**Abmelden meldete Erfolg, auch wenn der Dienst nichts widerrief.**
`signOut()` prüfte weder eine geworfene Ausnahme noch ein
zurückgegebenes `{ error }` — dieselbe Lücke wie im Kundenbereich, dort in
Schritt 027 geschlossen. Jetzt wird örtlich immer aufgeräumt, und bei
unbestätigtem Widerruf erscheint auf der Anmeldeseite: *„Sie sind auf
diesem Gerät abgemeldet. Der Abschluss der Abmeldung wurde allerdings
nicht bestätigt …"* Kein technischer Wortlaut, keine Kennung.

> Unverändert gilt: Ein bereits ausgestellter Access-Token bleibt bis zu
> seinem Ablauf gültig. Der Widerruf trifft die Refresh-Tokens.

### 21.4 Die Gestaltung

Dieselbe Bildsprache wie die öffentliche Webseite — kein zweites Design,
sondern dieselben Werte:

| | vorher | nachher |
|---|---|---|
| Schrift | Segoe UI (System) | **Outfit** und **Lora**, aus dem eigenen Bestand |
| Gold | `#f0c96b` (hell, gelblich) | **`#c8a96e`** — der Markenton |
| Grund | Blauverlauf `#090b12 → #121723` | **`#18181b`**, flächig |
| Kanten | 12–20 px rund | **gerade**, wie auf der Webseite |
| Marke | Textplatzhalter „TG" | **das Bildzeichen**, 107 × 52 px wie im Seitenkopf |
| Symbole | Emoji (🗓️ 🌴 🩺 📄) | **Strichzeichnungen** im Stil der Webseite |
| Eingabefelder | 15 px | **16 px** — darunter zoomt iOS beim Antippen |

**Zwei Darstellungsfehler nebenbei behoben**, beide gemessen und im Bild
gesehen:

- Bei 390 px standen „Heute" und „Morgen" nebeneinander; die Zustandsmarke
  und der rechte Kartenrand wurden **abgeschnitten**. Jetzt untereinander
  bis 720 px.
- Die Dienstplanzeile war eine umbrechende Flexbox: Bei 390 px rutschte
  das Fahrzeug neben das Datum und die Uhrzeit darunter. Jetzt ein Gitter
  mit fester Zuordnung, unter 380 px untereinander.

**Was besonders verlangt war:**

- „Heute" und „Morgen" stehen als eigene Karten mit eigener Überschrift;
  die Karte für heute trägt einen goldenen Rand.
- Die **Schichtzeit** ist die größte Zeile der Karte (bis 38 px, Lora).
- Das **Fahrzeug** steht abgesetzt unter einer Trennlinie. Fehlt es,
  heißt es „Fahrzeug offen" — nichts wird erfunden.
- **Dienstplan und Veröffentlichungszustand** sind unterscheidbar: der
  geplante Dienst in Gold, die Veröffentlichung schlicht mit Rand.
- **Urlaub und Krankmeldung** sind getrennte Schnellaktionen und getrennte
  Bereiche.
- Beim **Dokumentenupload** bleibt die gewählte Datei als goldgerahmte
  Zeile mit Entfernen-Schaltfläche sichtbar.
- **Keine untere Navigationsleiste** — geprüft.

### 21.5 Was NICHT geändert wurde

- **Keine Funktion entfernt**, kein Klassenname umbenannt: `mitarbeiter.js`
  erzeugt einen Teil des Markups zur Laufzeit und setzt feste Namen.
- **Anmeldung, Supabase-Anbindung, Rollen, Abfragen, Speicherzugriffe und
  Geschäftslogik** unverändert.
- **Keine Datenbankmigration**, keine produktiven Daten angefasst.
- **Öffentliche Webseite, Dispatcher- und Adminbereich** gestalterisch
  unberührt. Gegengeprüft: `ausgabe-pruefen` 56/56, `startseite-pruefen`
  187/187, `kontoseiten-pruefen` 181/181, `auth-027-pruefen` 37/37.
- **Keine E-Mail-Funktion** erfunden oder aktiviert.

**Offen, bewusst nicht in diesem Schritt:** Das Portal lädt weiterhin
`admin/personal-shared.js` für örtliche Zusatzhinweise („noch nicht
übermittelt"). Das Modul bringt Vorgabedaten mit erfundenen Personen mit.
Sie erscheinen im Portal **nicht** — jede Anzeige filtert auf die
Mitarbeiterkennung aus der geprüften Sitzung, und die Vorgabekennungen
(MA-1xx) passen nie. Nachgemessen: null erfundene Namen im Portaltext. Das
Modul ganz abzulösen berührt 26 Stellen und gehört in einen eigenen
Schritt.

### 21.6 Prüfung

`npm run portal-pruefen` — **69 / 69**:

| Bereich | geprüft |
|---|---|
| Zugangsschutz | abgemeldet · gefälschte Marke · Konfiguration fehlt · Dienst antwortet nicht · angemeldet |
| Herkunft | kein fremdes CDN · keine erfundenen Personen |
| Datenstände | Schicht heute und morgen · kein veröffentlichter Plan · langsame Antwort · Fahrzeug vorhanden und nicht vorhanden |
| Abmelden | bestätigt · **nicht** bestätigt |
| Dateien | zu groß · unzulässiger Typ · ohne Datei — gegen die **echte** Anbindung, vor jedem Netzaufruf |
| Browserspeicher | gesperrt |
| Darstellung | 320 · 390 · 430 · 1440 px, je Überlauf, Schriftgrößen, Bedienflächen, Schrift, untere Leiste, Skriptfehler, fehlende Dateien |
| Tastatur | 7 Elemente in 8 Schritten, jedes mit sichtbarem Umriss |

> **Alles simuliert.** Keine Anmeldung, kein Upload, kein Datensatz, kein
> Netzverkehr nach außen. Alle Namen, Zeiten und Kennzeichen erfunden.

**Ein eigener Fehler in der Prüfung sei erwähnt**, weil er echte Arbeit
gekostet hat: Die erste Fassung ersetzte `window.EmployeeSupabase` durch
eine Attrappe. Das echte Skript lädt danach und **überschreibt** sie — die
Aufnahmen zeigten in Wahrheit die Anmeldeseite. Ersetzt wird jetzt die
Datei auf Netzebene.

Der Prüflauf hat außerdem einen Fehler gefunden, den ich selbst eingebaut
hatte: Beim Entfernen des Demo-Modus blieb eine Verwendung der gelöschten
Variablen `isSupabase` stehen — `ReferenceError` bei jedem Seitenaufruf.

### 21.7 Offen und nur am echten System prüfbar

Diese drei sind **nicht** belegt und bleiben als manueller Test:

1. **Ob die Regeln der Datenbank (RLS) fremde Daten wirklich abweisen** —
   ob also eine manipulierte Kennung ins Leere läuft. Hier wurde nur
   geprüft, dass das Portal keine fremde Kennung *sendet*.
2. **Ob eine Mitarbeiterrolle wirklich keine Verwaltungsrechte hat.**
   `checkSession()` verlangt `active` und `employee_id`; ob die Datenbank
   einer solchen Rolle Dispatcher- oder Adminfunktionen verweigert, muss
   am Projekt geprüft werden.
3. **Ob eine Datei im Speicher ohne signierte Adresse unerreichbar ist.**
   Das Portal ruft ausschließlich über `getSignedDocumentUrl` ab
   (60 Sekunden Gültigkeit) — dass der Bucket privat ist, ist damit nicht
   bewiesen.

Ein solcher Test verlangt eine echte Anmeldung gegen die produktive
Instanz. Produktive personenbezogene Daten dürfen dabei nicht verändert
werden.
