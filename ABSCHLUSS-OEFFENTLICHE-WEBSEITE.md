# Abschluss der öffentlichen Webseite — Bestandsaufnahme und Plan

Interne Arbeitsunterlage. Sie wird **nicht** mit ausgeliefert.

Stand: 23.09.2026. Aufgenommen auf `feature/016-rewards-yumak` (`c93b315`),
**fortgeschrieben nach Schritt 017** auf `feature/017-grundlagen`.

> **Was Schritt 017 erledigt hat, steht in Abschnitt 8 am Ende.** Die
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
| Korrekturen aus `feature/011` | **offen und blockierend**, siehe `UEBERNAHME-OEFFENTLICH.md` Abschnitt 2 |

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
| **I2** | **Supabase-Projekteinstellungen**: Trägt „Site URL" die künftige Domain? Steht `https://taxigermersheim.de/passwort-zuruecksetzen.html` in den „Redirect URLs"? **Keine Schlüssel nötig — nur die Antwort ja oder nein** | Bestätigungs- und Reset-Mails brechen sonst nach dem Umzug |
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
   feature/011 in den Veröffentlichungsstand    ← blockierend
   E6 rechtliche Prüfung der Rechtstexte        ← blockierend
   I1 Adressliste WordPress → Weiterleitungen   ← blockierend
   I2 Supabase-Adressen prüfen                  ← blockierend
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
