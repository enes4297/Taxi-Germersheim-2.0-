// ═══════════════════════════════════════════════════════════════════════════
// Bestaetigte Inhalte der Startseite
// ═══════════════════════════════════════════════════════════════════════════
//
// Uebernommen aus src/content.ts der freigegebenen Vorschau (Commit 113a73e).
// Die Vorschau bleibt die verbindliche Referenz - wer hier etwas aendert,
// aendert es dort zuerst.
//
// ALLES hier stammt aus der bestehenden Website, aus den echten Fahrzeugfotos
// oder aus einer ausdruecklichen Freigabe der Geschaeftsfuehrung. Nichts ist
// ergaenzt, ausgeschmueckt oder geschaetzt.
//
// Ausdruecklich NICHT enthalten, weil nicht belegt:
//   - Preise, Tarife, Zuschlaege, Entfernungen, Fahrzeiten
//   - Wartezeiten, Verfuegbarkeiten, Fahrzeuganzahl im Einsatz
//   - Gruendungsjahr, Mitarbeiterzahl, Firmengeschichte
//   - Punktwerte, Schwellen oder Praemien des Rewards-Programms

// ── Unternehmen (Quelle: impressum.html) ─────────────────────────────────────

export const FIRMA = {
  name: 'Taxi Germersheim GmbH',
  strasse: 'Friedrich-Ebert-Straße 8',
  plz: '76726',
  ort: 'Germersheim',
  land: 'Deutschland',
  telefon: '07274 3567',
  telefonLink: 'tel:+4972743567',
  whatsappNummer: '4972743567',
  email: 'info@taxigermersheim.de',
  whatsapp: 'https://wa.me/4972743567?text=Ich%20m%C3%B6chte%20eine%20Taxi-Fahrt%20anfragen',
  geschaeftsfuehrung: ['Ismet Enes Carman', 'Sermin Duman'],
  registergericht: 'Amtsgericht Landau in der Pfalz',
  registernummer: 'HRB 33841',
} as const;

// ── Navigation ───────────────────────────────────────────────────────────────
//
// ABWEICHUNG ZUR VORSCHAU, ausdruecklich: Dort zeigen „Rewards" und „Spiele"
// auf die Vorschaupfade /rewards und /spiele. Im Projekt gibt es diese Seiten
// bereits als rewards.html und spiele.html - mit echter Anbindung an das
// Backend. Verlinkt wird deshalb der Bestand, nicht eine Nachbildung.

export const NAV: { href: string; label: string }[] = [
  { href: '#leistungen', label: 'Leistungen' },
  { href: '#flotte', label: 'Fahrzeugflotte' },
  { href: 'rewards.html', label: 'Rewards' },
  { href: 'spiele.html', label: 'Spiele' },
  { href: '#kontakt', label: 'Kontakt' },
];

// ── Hero (Quelle: index.html) ────────────────────────────────────────────────

export const HERO = {
  eyebrow: 'Taxi Germersheim · 24/7 erreichbar',
  zeile1: 'Germersheim',
  zeile2: 'fährt mit uns.',
  unterzeile: 'Taxi · Krankenfahrt · Rollstuhl · Flughafen',
  satz: 'Sicher ans Ziel. Rund um die Uhr.',
} as const;

// ── Leistungen ───────────────────────────────────────────────────────────────

export type LeistungId =
  | 'Taxi'
  | 'Krankenfahrten'
  | 'Rollstuhlfahrten'
  | 'Schuelerfahrten'
  | 'Flughafentransfer'
  | 'Ferngruppenfahrten'
  | 'Kurierfahrten';

export interface Leistung {
  id: LeistungId;
  label: string;
  kurz: string;
  symbol: string;
  beschreibung: string;
}

/** Reihenfolge und Beschriftung - massgeblich fuer Dialog, Leiste und Fusszeile. */
export const LEISTUNGEN: Leistung[] = [
  { id: 'Taxi', label: 'Taxi', kurz: 'Taxi', symbol: 'taxi', beschreibung: 'Direkt und zuverlässig ans Ziel.' },
  { id: 'Krankenfahrten', label: 'Krankenfahrten', kurz: 'Kranken­fahrten', symbol: 'medizin', beschreibung: 'Persönlich geplant und zuverlässig durchgeführt.' },
  { id: 'Rollstuhlfahrten', label: 'Rollstuhlfahrten', kurz: 'Rollstuhl­fahrten', symbol: 'rollstuhl', beschreibung: 'Barrierefreie Mobilität.' },
  { id: 'Schuelerfahrten', label: 'Schülerfahrten', kurz: 'Schüler­fahrten', symbol: 'schulranzen', beschreibung: 'Der Schulweg, jeden Tag zur selben Zeit.' },
  { id: 'Flughafentransfer', label: 'Flughafentransfer', kurz: 'Flughafen', symbol: 'flugzeug', beschreibung: 'Entspannt zum Flughafen und zurück.' },
  { id: 'Ferngruppenfahrten', label: 'Fern- und Gruppenfahrten', kurz: 'Fern & Gruppe', symbol: 'gruppe', beschreibung: 'Längere Strecken und Fahrten für mehrere Personen.' },
  { id: 'Kurierfahrten', label: 'Kurierfahrten', kurz: 'Kurier', symbol: 'transporter', beschreibung: 'Direkte Zustellung von A nach B.' },
];

/** Die Leiste im Hero zeigt die fuenf gelaeufigsten Fahrten - sie soll eine
 *  Leiste bleiben und kein Menue werden. Alle sieben stehen im Dialog und im
 *  Leistungsabschnitt. */
export const HERO_LEISTUNGEN = LEISTUNGEN.filter((l) =>
  ['Taxi', 'Krankenfahrten', 'Rollstuhlfahrten', 'Flughafentransfer', 'Kurierfahrten'].includes(l.id),
);

export interface Leistungsblock {
  id: LeistungId;
  kopf: string;
  text: string;
  dazu: string[];
  bild: { src: string; srcMobil: string; alt: string; objectPosition: string } | null;
  /** Welches Motiv fehlt. NUR intern - wird nicht angezeigt. */
  fehltMotiv: string | null;
  aktion: string;
}

export const LEISTUNGSBLOECKE: Leistungsblock[] = [
  {
    id: 'Taxi',
    kopf: 'Taxi- und Alltagsfahrten',
    text: 'Einzelfahrten in der Stadt und in die Nachbarorte – zum Bahnhof, zum Einkauf, abends nach Hause. Erreichbar rund um die Uhr.',
    dazu: ['Stadt- und Regionalfahrten', 'Bahnhof und Pendelstrecken', 'Telefon und WhatsApp'],
    bild: {
      src: '/assets/fleet/mercedes-e-klasse-schwarz-1600.jpg',
      srcMobil: '/assets/fleet/mercedes-e-klasse-schwarz-900.jpg',
      alt: 'Mercedes-Benz E-Klasse T-Modell als Taxi, Kennzeichen GER TX 100',
      objectPosition: '50% 58%',
    },
    fehltMotiv: null,
    aktion: 'Taxifahrt anfragen',
  },
  {
    id: 'Krankenfahrten',
    kopf: 'Krankenfahrten: Arzt, Dialyse, Chemo- und Strahlentherapie',
    text: 'Wir bringen Sie zum Termin und wieder nach Hause. Wiederkehrende Fahrten – etwa zur Dialyse oder zur Bestrahlung – planen wir als feste Serie ein, damit Sie nicht jedes Mal neu anrufen müssen.',
    dazu: ['Arzt- und Klinikfahrten', 'Dialysefahrten', 'Chemo- und Strahlentherapie', 'Regelmäßige Fahrten als feste Serie'],
    bild: {
      src: '/assets/fleet/vw-touran-300-1600.jpg',
      srcMobil: '/assets/fleet/vw-touran-300-900.jpg',
      alt: 'VW Touran als Taxi, Kennzeichen GER TX 300',
      objectPosition: '50% 55%',
    },
    fehltMotiv: 'Es gibt kein Foto vom Einstieg oder vom Innenraum – nur Außenaufnahmen der Fahrzeuge.',
    aktion: 'Krankenfahrt anfragen',
  },
  {
    id: 'Rollstuhlfahrten',
    kopf: 'Rollstuhlfahrten',
    text: 'Für die Beförderung im Rollstuhl steht ein eigens ausgestattetes Fahrzeug bereit: der VW mit dem Kennzeichen GER TX 900. Sagen Sie es bei der Anfrage kurz dazu, damit wir es einplanen.',
    dazu: ['Eigenes Rollstuhlfahrzeug', 'Seitliche Schiebetür', 'Nach Absprache einplanen'],
    bild: {
      src: '/assets/fleet/vw-rollstuhlfahrzeug-1600.jpg',
      srcMobil: '/assets/fleet/vw-rollstuhlfahrzeug-900.jpg',
      alt: 'VW Rollstuhlfahrzeug mit Rollstuhlkennzeichnung an der Seite, Kennzeichen GER TX 900',
      objectPosition: '32% 52%',
    },
    fehltMotiv: 'Die Rampe im Einsatz ist auf keinem Foto zu sehen; das vorhandene Bild zeigt das Fahrzeug von außen.',
    aktion: 'Rollstuhlfahrt anfragen',
  },
  {
    id: 'Schuelerfahrten',
    kopf: 'Schülerfahrten',
    text: 'Morgens zur Schule, mittags zurück. Den täglichen Schulweg fahren wir als feste Serie – mit gleichbleibender Uhrzeit und abgesprochenem Treffpunkt.',
    dazu: ['Täglicher Schulweg', 'Feste Zeiten nach Absprache', 'Regelmäßige Fahrten als feste Serie'],
    bild: {
      src: '/assets/fleet/vw-touran-1600.jpg',
      srcMobil: '/assets/fleet/vw-touran-900.jpg',
      alt: 'VW Touran als Taxi, Kennzeichen GER TX 200',
      objectPosition: '50% 55%',
    },
    fehltMotiv: null,
    aktion: 'Schülerfahrt anfragen',
  },
  {
    id: 'Flughafentransfer',
    kopf: 'Flughafentransfers',
    text: 'Abholung an Ihrer Adresse, Fahrt zum Terminal. Die Rückfahrt können Sie gleich mit anfragen – nennen Sie uns einfach Flugnummer und Landezeit.',
    dazu: ['Abholung an der Haustür', 'Rückfahrt mit anfragen'],
    bild: {
      src: '/assets/fleet/mercedes-e-klasse-weiss-1600.jpg',
      srcMobil: '/assets/fleet/mercedes-e-klasse-weiss-900.jpg',
      alt: 'Mercedes-Benz E-Klasse als Taxi, Kennzeichen GER TX 600',
      objectPosition: '50% 58%',
    },
    fehltMotiv: null,
    aktion: 'Transfer anfragen',
  },
  {
    id: 'Ferngruppenfahrten',
    kopf: 'Fern- und Gruppenfahrten',
    text: 'Längere Strecken fahren wir ebenso wie Fahrten für mehrere Personen. Für Gruppen und viel Gepäck kommt die V-Klasse mit sieben Sitzplätzen.',
    dazu: ['V-Klasse mit sieben Sitzplätzen', 'Platz für Gepäck', 'Firmenkunden'],
    bild: {
      src: '/assets/fleet/mercedes-v-klasse-1600.jpg',
      srcMobil: '/assets/fleet/mercedes-v-klasse-900.jpg',
      alt: 'Mercedes-Benz V-Klasse als Großraumtaxi, Kennzeichen GER TX 800',
      objectPosition: '50% 56%',
    },
    fehltMotiv: 'Vom beladenen Kofferraum gibt es keine Aufnahme.',
    aktion: 'Fahrt anfragen',
  },
  {
    id: 'Kurierfahrten',
    kopf: 'Kurierfahrten',
    text: 'Wir holen Ihre Sendung ab und bringen sie direkt zum Empfänger.',
    dazu: [],
    bild: null,
    fehltMotiv: null,
    aktion: 'Kurierfahrt anfragen',
  },
];

export const LEISTUNGEN_KOPF = {
  label: 'Leistungen',
  titel: 'Diese Fahrten übernehmen wir.',
  text: 'Einmaliger Termin oder regelmäßige Fahrt? Besprechen Sie Ihre Abholung direkt mit uns – am Telefon, über WhatsApp oder über das Formular oben auf der Seite.',
} as const;

// ── Transportschein (Quelle: Freigabe der Geschaeftsfuehrung, 19.09.2026) ────
//
// ACHTUNG, GRENZE: Hier steht ausschliesslich, WAS WIR ANNEHMEN und dass wir
// die noetigen Unterlagen vorab klaeren. Es steht NICHT da, dass eine Kasse die
// Fahrt bezahlt, dass sie genehmigt wird oder dass sie fuer den Fahrgast
// kostenlos ist. Das entscheidet die jeweilige Stelle, nicht wir.

export const TRANSPORTSCHEIN = {
  titel: 'Mit Transportschein unterwegs',
  absaetze: [
    'Wir nehmen Transportscheine aller Krankenkassen an. Auch Fahrten über Rentenversicherungen, die Agentur für Arbeit, Städte und weitere öffentliche Stellen gehören zu unserem Angebot.',
    'Wir klären mit Ihnen vorab, welche Unterlagen und gegebenenfalls Genehmigungen für Ihre Fahrt benötigt werden.',
  ],
  aktion: 'Fahrt besprechen',
} as const;

export const ANFRAGE_BAND = {
  titel: 'Einmaliger Termin oder regelmäßige Fahrt?',
  text: 'Besprechen Sie Ihre Abholung direkt mit uns. Am Telefon geht es meist am schnellsten.',
} as const;

// ── Fahrzeugflotte (Quelle: flotte.html) ─────────────────────────────────────

export type FahrzeugKategorie = 'Taxi' | 'Großraum' | 'Elektro' | 'Rollstuhl';

export interface Fahrzeug {
  name: string;
  typ: string;
  kennzeichen: string | null;
  kategorie: FahrzeugKategorie;
  sitzplaetze: number | null;
  einsatz: string;
  besonderheit: string;
  bild: string | null;
  bildMobil: string | null;
}

export const FLOTTE: Fahrzeug[] = [
  { name: 'Mercedes-Benz E 220 d T-Modell', typ: 'Taxi', kennzeichen: 'GER TX 100', kategorie: 'Taxi', sitzplaetze: 4, einsatz: 'Alltag, Bahnhof, Klinikfahrten', besonderheit: 'Komfortables T-Modell mit großem Kofferraum', bild: '/assets/fleet/mercedes-e-klasse-schwarz-1600.jpg', bildMobil: '/assets/fleet/mercedes-e-klasse-schwarz-900.jpg' },
  { name: 'VW Touran', typ: 'Taxi', kennzeichen: 'GER TX 200', kategorie: 'Taxi', sitzplaetze: 5, einsatz: 'Kurzstrecke, Stadtverkehr, Schülerfahrten', besonderheit: 'Hohe Alltagstauglichkeit', bild: '/assets/fleet/vw-touran-1600.jpg', bildMobil: '/assets/fleet/vw-touran-900.jpg' },
  { name: 'VW Touran', typ: 'Taxi', kennzeichen: 'GER TX 300', kategorie: 'Taxi', sitzplaetze: 5, einsatz: 'Arzttermine, Besorgungsfahrten', besonderheit: 'Komfortabler Einstieg', bild: '/assets/fleet/vw-touran-300-1600.jpg', bildMobil: '/assets/fleet/vw-touran-300-900.jpg' },
  { name: 'VW Touran', typ: 'Taxi', kennzeichen: 'GER TX 400', kategorie: 'Taxi', sitzplaetze: 5, einsatz: 'Regionalfahrten, Pendelverkehr', besonderheit: 'Variabler Innenraum', bild: '/assets/fleet/vw-touran-400-1600.jpg', bildMobil: '/assets/fleet/vw-touran-400-900.jpg' },
  { name: 'Mercedes-Benz B-Klasse', typ: 'Taxi', kennzeichen: 'GER TX 500', kategorie: 'Taxi', sitzplaetze: 4, einsatz: 'Innenstadt und Kurztransfers', besonderheit: 'Ruhiges Fahrverhalten', bild: null, bildMobil: null },
  { name: 'Mercedes-Benz E-Klasse', typ: 'Taxi', kennzeichen: 'GER TX 600', kategorie: 'Taxi', sitzplaetze: 4, einsatz: 'Business, Fernfahrten', besonderheit: 'Premium-Limousine mit hohem Komfort', bild: '/assets/fleet/mercedes-e-klasse-weiss-1600.jpg', bildMobil: '/assets/fleet/mercedes-e-klasse-weiss-900.jpg' },
  { name: 'Tesla Model Y', typ: 'Elektrotaxi', kennzeichen: 'GER TX 700', kategorie: 'Elektro', sitzplaetze: 4, einsatz: 'Leise Stadt- und Regionalfahrten', besonderheit: 'Elektrischer Antrieb', bild: null, bildMobil: null },
  { name: 'Mercedes-Benz V-Klasse', typ: 'Großraumtaxi', kennzeichen: 'GER TX 800', kategorie: 'Großraum', sitzplaetze: 7, einsatz: 'Gruppen, Flughafentransfer, Firmenkunden', besonderheit: 'Viel Platz für Gepäck', bild: '/assets/fleet/mercedes-v-klasse-1600.jpg', bildMobil: '/assets/fleet/mercedes-v-klasse-900.jpg' },
  { name: 'VW Rollstuhlfahrzeug', typ: 'Rollstuhlfahrzeug', kennzeichen: 'GER TX 900', kategorie: 'Rollstuhl', sitzplaetze: null, einsatz: 'Barrierefreie Beförderung', besonderheit: 'Barrierefrei und komfortabel unterwegs.', bild: '/assets/fleet/vw-rollstuhlfahrzeug-1600.jpg', bildMobil: '/assets/fleet/vw-rollstuhlfahrzeug-900.jpg' },
];

export const FLOTTE_KOPF = {
  label: 'Flotte',
  titel: 'Unsere Fahrzeuge',
  text: 'Vom Taxi bis zum Rollstuhlfahrzeug.',
} as const;

export const FLOTTE_FILTER: (FahrzeugKategorie | 'Alle')[] = ['Alle', 'Taxi', 'Großraum', 'Elektro', 'Rollstuhl'];

// ── Region (Quelle: index.html) ──────────────────────────────────────────────

export const REGION = {
  label: 'Region',
  zeilen: ['Hier sind wir zuhause.', 'Hier arbeiten wir.', 'Hier leben wir.', 'Hier kennen uns unsere Kunden.'],
  plz: '76726',
  orte: ['Germersheim', 'Sondernheim', 'Rülzheim', 'Bellheim', 'Lingenfeld', 'Umgebung'],
} as const;

// ── Rewards ──────────────────────────────────────────────────────────────────
//
// Bewusst OHNE Punktwerte, Schwellen oder Praemien.
//
// ABWEICHUNG ZUR VORSCHAU, ausdruecklich: Die Vorschau fuehrt von hier auf
// eigene Demoseiten (/spiele/gluecksrad-demo, /spiele/yumaks-box-demo,
// /spiele/taxi-rush). Diese Seiten sind noch nicht uebernommen. Verlinkt wird
// deshalb die bestehende Seite spiele.html - und die Beschriftung sagt, was
// dort tatsaechlich zu finden ist. Ein „Als Demo ausprobieren" waere an dieser
// Stelle unwahr, solange die Demoseiten fehlen.

export const REWARDS = {
  label: 'Rewards',
  titel: 'Was steckt in Yumaks Box?',
  text: 'Yumak führt durch unsere Spielewelt. Dort gibt es ein Glücksrad, eine Box und ein Fahrspiel – und für Fahrgäste, die regelmäßig mit uns fahren, das Rewards-Programm.',
  hauptaktion: 'Spiele entdecken',
  zweiteAktion: 'So funktionieren Rewards',
  hauptziel: 'spiele.html',
  zweitesZiel: 'rewards.html',
  yumakName: 'Yumak',
  yumakRolle: 'Gastgeber der Spielewelt',
  yumakText: 'Yumak zeigt, was es in der Spielewelt zu entdecken gibt.',
  hinweis:
    'Glücksrad und Box gehören zum Rewards-Programm. Taxi Rush können Sie in der Spielewelt sofort spielen.',
} as const;

export const REWARDS_STATIONEN: {
  id: 'gluecksrad' | 'box' | 'rush';
  titel: string;
  text: string;
  zustand: 'gesperrt' | 'spielbar';
  zustandText: string;
  ziel: string;
  zielText: string;
  zusatz: string | null;
}[] = [
  {
    id: 'gluecksrad',
    titel: 'Glücksrad',
    text: 'Sieben Felder – vom kleinen Punktgewinn bis zum seltensten Ergebnis.',
    zustand: 'gesperrt',
    zustandText: 'Noch gesperrt',
    ziel: 'spiele.html#wheelTitle',
    zielText: 'In der Spielewelt ansehen',
    zusatz: 'für Kundenkonten derzeit gesperrt',
  },
  {
    id: 'box',
    titel: 'Yumaks Box',
    text: 'Das seltenste Feld auf dem Rad.',
    zustand: 'gesperrt',
    zustandText: 'Noch gesperrt',
    ziel: 'spiele.html#boxTitle',
    zielText: 'In der Spielewelt ansehen',
    zusatz: 'erscheint nur nach einem bestätigten Gewinn',
  },
  {
    id: 'rush',
    titel: 'Taxi Rush',
    text: 'Fahrgast einsammeln, sicher ans Ziel bringen.',
    zustand: 'spielbar',
    zustandText: 'Sofort spielbar',
    ziel: 'spiele.html#taxiRushTitle',
    zielText: 'Jetzt spielen',
    zusatz: null,
  },
];

/** Feldaufteilung des Rades, fuer die Vorschaugrafik.
 *  Quelle: public.rewards_wheel_rules(), Migration 007. */
export const RAD_FELDER = [
  { name: '5 Punkte', anteil: 35 },
  { name: '10 Punkte', anteil: 25 },
  { name: '20 Punkte', anteil: 18 },
  { name: '30 Punkte', anteil: 10 },
  { name: '50 Punkte', anteil: 7 },
  { name: 'Gutschein 20,00 €', anteil: 4 },
  { name: 'Yumaks Box', anteil: 1 },
];

// ── Kontakt und haeufige Fragen (Quelle: hilfe-kontakt.html) ─────────────────

export const KONTAKT_KOPF = {
  label: 'Kontakt',
  titel: 'Wie können wir helfen?',
  text: 'Schnelle Antworten und direkte Kontaktmöglichkeiten für alle Fragen rund um Taxi Germersheim.',
} as const;

export const FAQ: { frage: string; antwort: string }[] = [
  { frage: 'Wie buche ich eine Fahrt?', antwort: 'Nutzen Sie den Anfragebereich auf dieser Startseite oder rufen Sie uns unter 07274 – 3567 an.' },
  { frage: 'Wie kann ich eine geplante Fahrt ändern?', antwort: 'Kontaktieren Sie uns telefonisch oder über WhatsApp und halten Sie die Angaben zu Ihrer Fahrt bereit.' },
  { frage: 'Wie storniere ich eine Fahrt?', antwort: 'Rufen Sie uns unter 07274 – 3567 an oder schreiben Sie uns über WhatsApp, damit wir Ihre Fahrt prüfen können.' },
  { frage: 'Welche Unterlagen brauche ich für eine Krankenfahrt?', antwort: 'Je nach Fahrt können eine ärztliche Verordnung und eine Genehmigung der Krankenkasse erforderlich sein. Klären Sie die Unterlagen bitte vorab mit Ihrer Krankenkasse oder mit uns.' },
  { frage: 'Wie buche ich eine Rollstuhlfahrt?', antwort: 'Kontaktieren Sie uns direkt und teilen Sie uns den benötigten Rollstuhltyp sowie mögliche Begleitpersonen mit.' },
  { frage: 'Wie funktionieren Rewards-Punkte?', antwort: 'Ihren aktuellen Punktestand und die verfügbaren Vorteile finden Sie im Bereich Rewards.' },
];

// ── Google-Bewertung (Quelle: index.html) ────────────────────────────────────
//
// ACHTUNG: Diese Werte stehen so auf der bestehenden Startseite. Sie sind damit
// uebernommener Bestand, KEINE Erfindung - aber sie beschreiben eine fremde
// Plattform und aendern sich laufend. Vor einem Produktivgang gehoeren sie
// ueberprueft oder live angebunden. Deshalb stehen sie isoliert und lassen sich
// mit einem Griff abschalten.

export const BEWERTUNG = {
  anzeigen: true,
  wert: '5,0',
  anzahl: '230+',
  quelle: 'Google-Bewertungen',
} as const;

// ── Fusszeile ────────────────────────────────────────────────────────────────

export const FOOTER_LINKS = [
  { href: '#kontakt', label: 'Kontakt' },
  { href: 'impressum.html', label: 'Impressum' },
  { href: 'datenschutz.html', label: 'Datenschutz' },
];

export const COPYRIGHT = '© 2026 Taxi Germersheim GmbH';

// ── Rewards-Seite ────────────────────────────────────────────────────────────
//
// ACHTUNG, GRENZE: Hier stehen ausschliesslich REGELN des Programms, keine
// Kontodaten. Punkte, Stufe, qualifizierende Fahrten, verfuegbare Drehs und
// der Gewinnverlauf kommen einzig aus get_my_rewards_overview beziehungsweise
// rewards_wheel_spins. Es gibt auf dieser Seite keine Beispielwerte und keine
// Platzhalterzahlen, die wie ein Kontostand aussehen koennten.
//
// Die Werte unten sind am 21.09.2026 gegen die Migrationen geprueft:
//   5 Fahrten je Dreh, Drehs sammeln sich an, 0 Punkte Kosten,
//   90 Tage Gutscheingueltigkeit, Wahrscheinlichkeiten wie aufgefuehrt
//     -> public.rewards_wheel_rules(), Migration 007
//   200 Punkte Geburtstagsbonus
//     -> bonus_points constant integer := 200, Migration 005

export const REWARDS_REGELN = {
  /** NUR INTERN - steht nicht auf der Kundenseite. */
  quelle: 'public.rewards_wheel_rules() · Migration 007',
  fahrtenProDreh: 5,
  punktkostenProDreh: 0,
  gutscheinGueltigTage: 90,
  geburtstagsbonusPunkte: 200,
  gewinne: [
    { name: '5 Punkte', anteil: 35 },
    { name: '10 Punkte', anteil: 25 },
    { name: '20 Punkte', anteil: 18 },
    { name: '30 Punkte', anteil: 10 },
    { name: '50 Punkte', anteil: 7 },
    { name: 'Gutschein 20,00 €', anteil: 4 },
    { name: 'Yumaks Box', anteil: 1 },
  ],
} as const;

/**
 * Die Stufen sind im Projekt nur als REIHENFOLGE hinterlegt
 * (admin/rewards.js: Bronze 1, Silber 2, Gold 3, Platin 4, VIP 5).
 * Punktschwellen und Vorteile je Stufe gibt es dort NICHT - sie werden
 * deshalb auch nicht behauptet.
 */
export const REWARDS_STUFEN = ['Bronze', 'Silber', 'Gold', 'Platin', 'VIP'] as const;

export const REWARDS_SEITE = {
  label: 'Rewards',
  titelOben: 'Treue soll',
  titelUnten: 'sich lohnen.',
  text: 'Für Fahrgäste, die regelmäßig mit uns fahren: Punkte sammeln, Stufen erreichen und Drehs am Glücksrad verdienen.',
  ohneAnmeldung: {
    titel: 'Ihr Punktestand erscheint nach der Anmeldung',
    text: 'Punkte, Stufe und verfügbare Drehs gehören zu Ihrem persönlichen Konto. Sie werden erst nach der Anmeldung geladen und sind nur für Sie sichtbar.',
  },
  laedt: 'Ihre Rewards werden geladen …',
  fehler: {
    titel: 'Ihre Rewards konnten gerade nicht geladen werden',
    text: 'Bitte versuchen Sie es in einem Moment noch einmal. Wenn es weiterhin nicht klappt, erreichen Sie uns telefonisch.',
    aktion: 'Erneut versuchen',
  },
  leer: {
    titel: 'Noch keine qualifizierenden Fahrten',
    text: 'Ihr Konto ist angelegt. Sobald Fahrten dazukommen, erscheinen hier Punkte, Stufe und Drehs.',
  },
} as const;

// ── Rechtsseiten und Hilfe (Schritt 018) ─────────────────────────────────────
//
// ═══════════════════════════════════════════════════════════════════════════
// REGEL FUER DIESEN ABSCHNITT: TEXT UNVERAENDERT UEBERNOMMEN
// ═══════════════════════════════════════════════════════════════════════════
//
// Jede Zeile hier steht wortgleich so in impressum.html, datenschutz.html,
// hilfe-kontakt.html beziehungsweise 404.html des Bestands. Es wurde nichts
// umformuliert, nichts gekuerzt und vor allem nichts ERGAENZT.
//
// Das ist keine Bequemlichkeit, sondern Absicht: Rechtstexte sind vom
// Auftraggeber verantwortet, nicht vom Entwickler. Was dort fehlt, wird
// intern in ABSCHLUSS-OEFFENTLICHE-WEBSEITE.md (Abschnitt 2.7) festgehalten
// und dem Auftraggeber genannt - es wird nicht selbst hinzugedichtet. Eine
// erfundene Pflichtangabe waere schlimmer als eine fehlende, weil sie
// aussieht, als haette sie jemand geprueft.
//
// Geaendert wurde ausschliesslich AUSZEICHNUNG, nie Inhalt:
//   - Die Rufnummer steht im Impressum als tel:072743567. Ueberall sonst im
//     Projekt gilt FIRMA.telefonLink (tel:+4972743567), das auch aus dem
//     Ausland waehlbar ist. Die ANGEZEIGTE Nummer bleibt unveraendert.

export interface Rechtskarte {
  label: string;
  titel: string;
  /** Absaetze als Klartext. `zeilen` wird mit Zeilenumbruch gesetzt. */
  zeilen?: string[];
  /** Beschriftete Werte, etwa „Telefon: 07274 3567". */
  werte?: { name: string; wert: string; href?: string }[];
  /** Ueber die halbe Breite hinaus - wie legal-content-card--wide. */
  breit?: boolean;
}

export const IMPRESSUM = {
  label: 'Rechtliches',
  titel: 'Impressum',
  text: 'Rechtliche Angaben zu Taxi Germersheim GmbH.',
  karten: [
    {
      label: 'Unternehmen',
      titel: 'Unternehmensdaten',
      zeilen: ['Taxi Germersheim GmbH', 'Friedrich-Ebert-Straße 8', '76726 Germersheim', 'Deutschland'],
    },
    {
      label: 'Erreichbarkeit',
      titel: 'Kontakt',
      werte: [
        { name: 'Telefon', wert: '07274 3567', href: 'tel:+4972743567' },
        { name: 'E-Mail', wert: 'info@taxigermersheim.de', href: 'mailto:info@taxigermersheim.de' },
      ],
    },
    {
      label: 'Vertretung',
      titel: 'Geschäftsführung',
      zeilen: ['Ismet Enes Carman', 'Sermin Duman'],
    },
    {
      label: 'Register',
      titel: 'Registerdaten',
      werte: [
        { name: 'Registergericht', wert: 'Amtsgericht Landau in der Pfalz' },
        { name: 'Registernummer', wert: 'HRB 33841' },
        { name: 'Steuernummer', wert: '41/650/23698' },
      ],
    },
    {
      label: 'Behörde',
      titel: 'Genehmigungsbehörde',
      zeilen: ['Kreisverwaltung Germersheim', 'Luitpoldplatz 1', '76726 Germersheim'],
      breit: true,
    },
  ] as Rechtskarte[],
} as const;

export const DATENSCHUTZ = {
  label: 'Rechtliches',
  titel: 'Datenschutz',
  text: 'Informationen zum Umgang mit personenbezogenen Daten.',
  karten: [
    {
      label: 'Datenschutz',
      titel: 'Verantwortlicher',
      zeilen: ['Taxi Germersheim GmbH', 'Friedrich-Ebert-Straße 8', '76726 Germersheim'],
      werte: [{ name: '', wert: 'info@taxigermersheim.de', href: 'mailto:info@taxigermersheim.de' }],
    },
    {
      label: 'Datenschutz',
      titel: 'Erhebung personenbezogener Daten',
      zeilen: ['Name, Telefonnummer, E-Mail, Abholadresse, Zieladresse und Fahrtdetails bei Buchungsanfragen.'],
    },
    {
      label: 'Datenschutz',
      titel: 'Zweck der Verarbeitung',
      zeilen: ['Bearbeitung von Anfragen, Durchführung von Fahrten, Kontaktaufnahme und Kundenservice.'],
    },
    {
      label: 'Datenschutz',
      titel: 'Rechtsgrundlage',
      zeilen: ['Art. 6 Abs. 1 lit. b DSGVO und Art. 6 Abs. 1 lit. f DSGVO.'],
    },
    {
      label: 'Datenschutz',
      titel: 'Speicherdauer',
      zeilen: ['Daten werden nur so lange gespeichert, wie es für die Bearbeitung und gesetzliche Pflichten erforderlich ist.'],
    },
    {
      label: 'Datenschutz',
      titel: 'Weitergabe von Daten',
      zeilen: ['Keine Weitergabe an Dritte, außer wenn es zur Durchführung der Fahrt oder gesetzlich erforderlich ist.'],
    },
    {
      label: 'Datenschutz',
      titel: 'Rechte der Nutzer',
      zeilen: ['Auskunft, Berichtigung, Löschung, Einschränkung, Widerspruch und Datenübertragbarkeit.'],
      breit: true,
    },
    {
      label: 'Datenschutz',
      titel: 'Kontakt bei Datenschutzfragen',
      werte: [{ name: '', wert: 'info@taxigermersheim.de', href: 'mailto:info@taxigermersheim.de' }],
      breit: true,
    },
  ] as Rechtskarte[],
} as const;

/**
 * Die haeufigen Fragen der HILFESEITE.
 *
 * ACHTUNG, bewusst getrennt von FAQ: Die Startseite fuehrt SECHS Fragen, die
 * Hilfeseite ACHT - sie hat zusaetzlich „Wie löse ich einen Gutschein ein?"
 * und „Wie kann ich Taxi Germersheim kontaktieren?". Auch die erste Antwort
 * weicht ab („Buchungsbereich auf unserer Startseite" statt
 * „Anfragebereich auf dieser Startseite"), was auf einer Unterseite auch
 * richtiger ist. Beides bleibt so, wie es im Bestand steht - ein
 * Zusammenlegen waere eine inhaltliche Aenderung.
 */
export const FAQ_HILFE: { frage: string; antwort: string }[] = [
  { frage: 'Wie buche ich eine Fahrt?', antwort: 'Nutzen Sie den Buchungsbereich auf unserer Startseite oder rufen Sie uns unter 07274 – 3567 an.' },
  { frage: 'Wie kann ich eine geplante Fahrt ändern?', antwort: 'Kontaktieren Sie uns telefonisch oder über WhatsApp und halten Sie die Angaben zu Ihrer Fahrt bereit.' },
  { frage: 'Wie storniere ich eine Fahrt?', antwort: 'Rufen Sie uns unter 07274 – 3567 an oder schreiben Sie uns über WhatsApp, damit wir Ihre Fahrt prüfen können.' },
  { frage: 'Welche Unterlagen brauche ich für eine Krankenfahrt?', antwort: 'Je nach Fahrt können eine ärztliche Verordnung und eine Genehmigung der Krankenkasse erforderlich sein. Klären Sie die Unterlagen bitte vorab mit Ihrer Krankenkasse oder mit uns.' },
  { frage: 'Wie buche ich eine Rollstuhlfahrt?', antwort: 'Kontaktieren Sie uns direkt und teilen Sie uns den benötigten Rollstuhltyp sowie mögliche Begleitpersonen mit.' },
  { frage: 'Wie funktionieren Rewards-Punkte?', antwort: 'Ihren aktuellen Punktestand und die verfügbaren Vorteile finden Sie im Bereich Rewards.' },
  { frage: 'Wie löse ich einen Gutschein ein?', antwort: 'Verfügbare Gutscheine und deren Status sehen Sie in Ihrem Kundenkonto unter Wallet & Gutscheine.' },
  { frage: 'Wie kann ich Taxi Germersheim kontaktieren?', antwort: 'Sie erreichen uns per Telefon, WhatsApp und E-Mail oder persönlich in der Friedrich-Ebert-Str. 8 in Germersheim.' },
];

export const HILFE = {
  label: 'Hilfe & Kontakt',
  titel: 'Wie können wir helfen?',
  text: 'Schnelle Antworten und direkte Kontaktmöglichkeiten für alle Fragen rund um Taxi Germersheim.',
  kontaktLabel: 'Direkter Kontakt',
  kontaktTitel: 'Wir sind für Sie erreichbar',
  fragenLabel: 'Gut zu wissen',
  fragenTitel: 'Häufige Fragen',
  rechtLabel: 'Informationen',
  rechtTitel: 'Rechtliches',
  /** Die Rufnummer mit Gedankenstrich - so steht sie auf der Hilfeseite. */
  telefonAnzeige: '07274 – 3567',
  /**
   * „Route anzeigen" fuehrt auf die Google-Kartensuche. Das ist ein
   * gewoehnlicher Verweis nach draussen, KEINE Einbettung: Es wird nichts
   * nachgeladen, solange niemand darauf klickt. Deshalb braucht er auch
   * keine vorherige Zustimmung - siehe die Untersuchung des
   * Zustimmungsbanners in ABSCHLUSS-OEFFENTLICHE-WEBSEITE.md, Abschnitt 9.2.
   */
  routeZiel:
    'https://www.google.com/maps/search/?api=1&query=Taxi%20Germersheim%20GmbH%2C%20Friedrich-Ebert-Str.%208%2C%2076726%20Germersheim',
} as const;

export const FEHLERSEITE = {
  label: '404 Fehlerseite',
  titel: 'Seite nicht gefunden',
  text: 'Die gewünschte Seite konnte leider nicht gefunden werden.',
  /**
   * Zusatz gegenueber dem Bestand — bewusst KEINE inhaltliche Aussage ueber
   * Rechte oder Leistungen, sondern reine Wegweisung. Der Bestand bot nur
   * „Zur Startseite", „Jetzt anrufen" und „WhatsApp schreiben"; die Liste
   * darunter fuehrt zu Zielen, die es nachweislich gibt.
   */
  hinweis: 'Vielleicht hilft einer dieser Wege weiter:',
  wege: [
    { ziel: 'index.html#leistungen', text: 'Unsere Leistungen', zusatz: 'Taxi, Krankenfahrten, Rollstuhl, Flughafen und mehr' },
    { ziel: 'index.html#flotte', text: 'Fahrzeugflotte', zusatz: 'Welches Fahrzeug für welche Fahrt' },
    { ziel: 'hilfe-kontakt.html', text: 'Hilfe und Kontakt', zusatz: 'Häufige Fragen und alle Kontaktwege' },
    { ziel: 'rewards.html', text: 'Rewards', zusatz: 'Punkte, Stufen und Drehs' },
  ],
} as const;

// ── Spezialfahrten: Fahrtarten und ihre Zusatzangaben (Schritt 019) ─────────
//
// ═══════════════════════════════════════════════════════════════════════════
// HERKUNFT UND ZWECK
// ═══════════════════════════════════════════════════════════════════════════
//
// Wortgleich uebernommen aus SERVICE_CONFIG in special-services.js. Jede
// Beschriftung, jede Auswahlmoeglichkeit und jede Pflichtangabe steht dort
// genauso. Es wurde kein Feld hinzugefuegt, keines weggelassen und keine
// Pflichtangabe zur freiwilligen gemacht.
//
// WARUM DAS HIER STEHT UND NICHT IN EINEM ZWEITEN FORMULAR:
// Der gemeinsame Anfragedialog erfasst Abholadresse, Zieladresse, Leistung
// und Zeitpunkt - das deckt den Alltagsfall. Fuer eine Dialysefahrt, einen
// Rollstuhltransport oder eine Kurierfahrt reicht das nicht: Dort haengt an
// Verordnung, Rollstuhltyp oder Zustellzeit, ob die Fahrt ueberhaupt
// durchfuehrbar ist. Diese Angaben gehen deshalb NICHT verloren - sie
// erweitern denselben Dialog um einen zusaetzlichen Block, statt ein zweites
// Formular mit eigener Pruefung danebenzustellen.
//
// PFLICHTANGABEN, GENAU WIE BISHER:
// `pflicht: true` wird nur dann durchgesetzt, wenn der Dialog aus dem
// Spezialweg heraus geoeffnet wurde - also von spezialfahrten.html oder
// spezial-anfrage.html. Auf der Startseite bleiben die Zusatzangaben
// freiwillig; dort war es nie anders, und die freigegebene Startseite soll
// sich nicht aendern.

export type FeldArt = 'text' | 'tel' | 'email' | 'date' | 'time' | 'number' | 'auswahl' | 'mehrfach' | 'notiz';

export interface Detailfeld {
  id: string;
  label: string;
  art: FeldArt;
  pflicht: boolean;
  optionen?: string[];
  platzhalter?: string;
}

export interface Fahrtart {
  /** Schluessel des Bestands - steht in jedem Direktlink (?service=…). */
  id: string;
  titel: string;
  /** Die freigegebene Leistung, unter der die Fahrt laeuft. */
  leistung: LeistungId | null;
  beschreibung: string;
  vorteile: string[];
  /** Der Hinweis des Bestands - wortgleich, besonders bei Kosten. */
  hinweis: string;
  /** Vorbelegung einzelner Felder, wie im Bestand ueber `preset`. */
  vorbelegt?: Record<string, string>;
  felder: Detailfeld[];
}

const FELD_NAME: Detailfeld = { id: 'name', label: 'Name', art: 'text', pflicht: true };
const FELD_TELEFON: Detailfeld = { id: 'phone', label: 'Telefonnummer', art: 'tel', pflicht: true };
const BEGLEITUNG: Detailfeld = {
  id: 'companion', label: 'Begleitperson', art: 'auswahl', pflicht: true,
  optionen: ['Keine', 'Eine Begleitperson', 'Mehrere Begleitpersonen'],
};

/** Die Felder der Krankenfahrt - Grundlage auch fuer Dialyse und Chemo. */
const KRANKENFAHRT_FELDER: Detailfeld[] = [
  FELD_NAME,
  FELD_TELEFON,
  { id: 'roundtrip', label: 'Hin- und Rückfahrt', art: 'auswahl', pflicht: true, optionen: ['Nur Hinfahrt', 'Hin- und Rückfahrt'] },
  { id: 'rideType', label: 'Fahrttyp', art: 'auswahl', pflicht: true, optionen: ['Krankenfahrt', 'Dialyse', 'Chemo', 'Strahlentherapie', 'Ambulante Behandlung', 'Stationäre Aufnahme/Entlassung'] },
  { id: 'insurance', label: 'Krankenkasse (optional)', art: 'text', pflicht: false },
  { id: 'prescription', label: 'Verordnung vorhanden', art: 'auswahl', pflicht: true, optionen: ['Ja', 'Nein', 'Unklar'] },
  { id: 'approval', label: 'Genehmigung vorhanden', art: 'auswahl', pflicht: true, optionen: ['Ja', 'Nein', 'Unklar'] },
  BEGLEITUNG,
  { id: 'notes', label: 'Besondere Hinweise', art: 'notiz', pflicht: false },
];

/**
 * Die neun Fahrtarten des Bestands, in der Reihenfolge von LIST in
 * special-services.js.
 *
 * ZWEI HABEN KEINE ENTSPRECHUNG unter den sieben freigegebenen Leistungen -
 * `leistung: null` sagt das ausdruecklich, statt eine Zuordnung zu erfinden:
 *
 *   series    „Serienfahrten" ist keine eigene Leistung, sondern eine
 *             Wiederholung. Die freigegebenen Leistungstexte nennen sie bei
 *             Kranken- und Schuelerfahrten als „feste Serie".
 *   business  „Firmen- und Geschaeftskunden" ist eine Kundenart, keine
 *             Fahrtleistung. Die Leistung „Fern- und Gruppenfahrten" nennt
 *             Firmenkunden, deckt sie aber nicht ab.
 *
 * In beiden Faellen traegt die Nachricht die Fahrtart ausdruecklich als
 * eigene Zeile - so geht die Angabe nicht verloren.
 */
export const FAHRTARTEN: Fahrtart[] = [
  {
    id: 'medical',
    titel: 'Krankenfahrten',
    leistung: 'Krankenfahrten',
    beschreibung: 'Fahrten zu Arzt, Klinik, Therapie sowie stationärer Aufnahme und Entlassung persönlich vorbereiten.',
    vorteile: [
      'Sitzende Beförderung und Rollstuhlbeförderung möglich',
      'Hin- und Rückfahrt gemeinsam planbar',
      'Transparenter Hinweis zu Verordnung und Genehmigung',
    ],
    hinweis: 'Je nach Fahrt können Verordnung und Genehmigung der Krankenkasse erforderlich sein. Eine verbindliche Kostenübernahme kann hier nicht zugesagt werden.',
    felder: KRANKENFAHRT_FELDER,
  },
  {
    id: 'dialysis',
    titel: 'Dialysefahrten',
    leistung: 'Krankenfahrten',
    beschreibung: 'Fahrten zu Arzt, Klinik, Therapie sowie stationärer Aufnahme und Entlassung persönlich vorbereiten.',
    vorteile: [
      'Sitzende Beförderung und Rollstuhlbeförderung möglich',
      'Hin- und Rückfahrt gemeinsam planbar',
      'Transparenter Hinweis zu Verordnung und Genehmigung',
    ],
    hinweis: 'Je nach Fahrt können Verordnung und Genehmigung der Krankenkasse erforderlich sein. Eine verbindliche Kostenübernahme kann hier nicht zugesagt werden.',
    vorbelegt: { rideType: 'Dialyse' },
    felder: KRANKENFAHRT_FELDER,
  },
  {
    id: 'chemo',
    titel: 'Chemo- und Strahlentherapiefahrten',
    leistung: 'Krankenfahrten',
    beschreibung: 'Fahrten zu Arzt, Klinik, Therapie sowie stationärer Aufnahme und Entlassung persönlich vorbereiten.',
    vorteile: [
      'Sitzende Beförderung und Rollstuhlbeförderung möglich',
      'Hin- und Rückfahrt gemeinsam planbar',
      'Transparenter Hinweis zu Verordnung und Genehmigung',
    ],
    hinweis: 'Je nach Fahrt können Verordnung und Genehmigung der Krankenkasse erforderlich sein. Eine verbindliche Kostenübernahme kann hier nicht zugesagt werden.',
    vorbelegt: { rideType: 'Chemo' },
    felder: KRANKENFAHRT_FELDER,
  },
  {
    id: 'wheelchair',
    titel: 'Rollstuhlfahrten',
    leistung: 'Rollstuhlfahrten',
    beschreibung: 'Barrierearme Fahrten mit Rampe, Sicherung und optionaler Begleitperson persönlich planen.',
    vorteile: [
      'Manueller und elektrischer Rollstuhl auswählbar',
      'Faltbar/nicht faltbar und Umsteigen abfragbar',
      'Zugangssituation vorab abstimmbar',
    ],
    hinweis: 'Bitte teilen Sie uns Rollstuhltyp und Zugangssituation möglichst genau mit.',
    felder: [
      FELD_NAME,
      FELD_TELEFON,
      { id: 'wheelchairType', label: 'Rollstuhltyp', art: 'auswahl', pflicht: true, optionen: ['Manueller Rollstuhl', 'Elektrischer Rollstuhl'] },
      { id: 'foldable', label: 'Rollstuhl faltbar', art: 'auswahl', pflicht: true, optionen: ['Ja', 'Nein'] },
      { id: 'canTransfer', label: 'Person kann umsteigen', art: 'auswahl', pflicht: true, optionen: ['Ja', 'Nein'] },
      BEGLEITUNG,
      { id: 'stairSituation', label: 'Treppen / besondere Zugangssituation', art: 'notiz', pflicht: false },
      { id: 'dimensions', label: 'Maße / Gewicht (optional)', art: 'text', pflicht: false },
      { id: 'notes', label: 'Zusätzliche Hinweise', art: 'notiz', pflicht: false },
    ],
  },
  {
    id: 'series',
    titel: 'Serienfahrten',
    leistung: null,
    beschreibung: 'Regelmäßige Fahrten mit Wochenstruktur sowie Hin- und Rückfahrt persönlich vorbereiten.',
    vorteile: [
      'Dialyse M/W/F als Beispiel hinterlegbar',
      'Tägliche Schüler- oder Therapiefahrten planbar',
      'Wochenzusammenfassung vor der Abstimmung',
    ],
    hinweis: 'Eine Serienfahrt wird erst nach persönlicher Bestätigung verbindlich.',
    felder: [
      FELD_NAME,
      FELD_TELEFON,
      { id: 'startDate', label: 'Startdatum', art: 'date', pflicht: true },
      { id: 'endDate', label: 'Enddatum (optional)', art: 'date', pflicht: false },
      { id: 'weekdays', label: 'Wochentage', art: 'mehrfach', pflicht: true, optionen: ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'] },
      { id: 'direction', label: 'Fahrtart', art: 'auswahl', pflicht: true, optionen: ['Nur Hinfahrt', 'Hin- und Rückfahrt'] },
      { id: 'outboundTime', label: 'Uhrzeit Hinfahrt', art: 'time', pflicht: true },
      { id: 'returnTime', label: 'Uhrzeit Rückfahrt', art: 'time', pflicht: false },
      { id: 'rideType', label: 'Fahrttyp', art: 'auswahl', pflicht: true, optionen: ['Dialyse', 'Schülerfahrt', 'Therapiefahrt', 'Firmenfahrt', 'Standardfahrt'] },
      { id: 'companion', label: 'Begleitperson', art: 'auswahl', pflicht: true, optionen: ['Keine', 'Begleitperson eingeplant'] },
      { id: 'remark', label: 'Bemerkung', art: 'notiz', pflicht: false },
    ],
  },
  {
    id: 'airport',
    titel: 'Flughafentransfers',
    leistung: 'Flughafentransfer',
    beschreibung: 'Transfers für FRA, FKB, STR oder weitere Flughäfen auf Anfrage persönlich vorbereiten.',
    vorteile: [
      'Terminal und Flugnummer optional',
      'Normales Taxi oder Großraumtaxi auswählbar',
      'Festpreisanfrage persönlich abstimmbar',
    ],
    hinweis: 'Der Preis wird erst nach persönlicher Prüfung bestätigt.',
    felder: [
      FELD_NAME,
      FELD_TELEFON,
      { id: 'airport', label: 'Flughafen', art: 'auswahl', pflicht: true, optionen: ['Frankfurt Airport FRA', 'Karlsruhe/Baden-Baden FKB', 'Stuttgart Airport STR', 'Weiterer Flughafen auf Anfrage'] },
      { id: 'terminal', label: 'Terminal (optional)', art: 'text', pflicht: false },
      { id: 'flightNumber', label: 'Flugnummer (optional)', art: 'text', pflicht: false },
      { id: 'persons', label: 'Anzahl Personen', art: 'number', pflicht: true },
      { id: 'bags', label: 'Anzahl Koffer', art: 'number', pflicht: true },
      { id: 'childSeat', label: 'Kindersitz benötigt', art: 'auswahl', pflicht: true, optionen: ['Nein', 'Ja, 1', 'Ja, 2+'] },
      { id: 'vehicleType', label: 'Taxiart', art: 'auswahl', pflicht: true, optionen: ['Normales Taxi', 'Großraumtaxi'] },
      { id: 'roundtrip', label: 'Hin- und Rückfahrt', art: 'auswahl', pflicht: true, optionen: ['Nur Hinfahrt', 'Hin- und Rückfahrt'] },
      { id: 'returnFlightDate', label: 'Rückflugdatum (optional)', art: 'date', pflicht: false },
      { id: 'fixedPrice', label: 'Festpreisanfrage', art: 'auswahl', pflicht: true, optionen: ['Ja', 'Nein'] },
    ],
  },
  {
    id: 'business',
    titel: 'Firmen- und Geschäftskunden',
    leistung: null,
    beschreibung: 'Planung für Firmen- und Geschäftskunden mit Ansprechpartnern und wiederkehrenden Leistungen.',
    vorteile: [
      'Mitarbeiterfahrten, Flughafentransfers und Kurierfahrten kombinierbar',
      'Bahn- und Schichtpersonal kann als Leistung markiert werden',
      'Individuelle Vereinbarungen persönlich abstimmbar',
    ],
    hinweis: 'Vereinbarungen und Abrechnung werden persönlich geprüft und bestätigt.',
    felder: [
      { id: 'company', label: 'Firmenname', art: 'text', pflicht: true },
      { id: 'contact', label: 'Ansprechpartner', art: 'text', pflicht: true },
      FELD_TELEFON,
      { id: 'email', label: 'E-Mail', art: 'email', pflicht: true },
      { id: 'billingAddress', label: 'Rechnungsadresse', art: 'notiz', pflicht: true },
      { id: 'ridesPerMonth', label: 'Erwartete Fahrten pro Monat', art: 'number', pflicht: true },
      { id: 'services', label: 'Gewünschte Leistungen', art: 'mehrfach', pflicht: true, optionen: ['Zentrale Buchung', 'Wiederkehrende Fahrten', 'Monatsrechnung', 'Flughafentransfers', 'Mitarbeiterfahrten', 'Kurierfahrten', 'Bahn- und Schichtpersonal'] },
      { id: 'invoiceMode', label: 'Rechnungswunsch', art: 'auswahl', pflicht: true, optionen: ['Monatsrechnung', 'Wochenrechnung', 'Einzelfahrten'] },
      { id: 'remark', label: 'Bemerkung', art: 'notiz', pflicht: false },
    ],
  },
  {
    id: 'student',
    titel: 'Schülerfahrten',
    leistung: 'Schuelerfahrten',
    beschreibung: 'Regelmäßige Schülerbeförderung mit festen Abholzeiten, Hin- und Rückfahrt und individueller Abstimmung.',
    vorteile: [
      'Wochentage und Zeitfenster klar definierbar',
      'Abstimmung mit Eltern, Schule oder Träger',
      'Begleitbedarf direkt abfragbar',
    ],
    hinweis: 'Eine persönliche Abstimmung und Bestätigung ist erforderlich.',
    felder: [
      { id: 'name', label: 'Ansprechpartner', art: 'text', pflicht: true },
      FELD_TELEFON,
      { id: 'passengers', label: 'Anzahl Fahrgäste', art: 'number', pflicht: true },
      { id: 'weekdays', label: 'Wochentage', art: 'mehrfach', pflicht: true, optionen: ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'] },
      { id: 'times', label: 'Uhrzeiten', art: 'text', pflicht: true, platzhalter: 'z. B. Hinfahrt 07:15, Rückfahrt 13:20' },
      { id: 'support', label: 'Begleitbedarf', art: 'auswahl', pflicht: true, optionen: ['Kein Begleitbedarf', 'Begleitperson nötig', 'Individuell zu klären'] },
      { id: 'period', label: 'Zeitraum', art: 'text', pflicht: true, platzhalter: 'z. B. Schuljahr 2026/27' },
    ],
  },
  {
    id: 'courier',
    titel: 'Kurierfahrten',
    leistung: 'Kurierfahrten',
    beschreibung: 'Direktfahrten für Dokumente, Ersatzteile und kleine Sendungen inklusive Zeitfenster vorbereiten.',
    vorteile: [
      'Zeitkritische Zustellung kennzeichnen',
      'Kontakte für Abholung und Empfang erfassen',
      'Sendungsart und Größe angeben',
    ],
    hinweis: 'Gefährliche oder gesetzlich verbotene Güter sind ausgeschlossen. Eine Beauftragung erfolgt erst nach persönlicher Bestätigung.',
    felder: [
      FELD_NAME,
      FELD_TELEFON,
      { id: 'shipmentType', label: 'Art der Sendung', art: 'text', pflicht: true },
      { id: 'shipmentSize', label: 'Ungefähre Größe', art: 'auswahl', pflicht: true, optionen: ['Dokumente', 'Kleine Sendung', 'Mittelgroße Sendung'] },
      { id: 'pickupTime', label: 'Abholzeit', art: 'time', pflicht: true },
      { id: 'latestDelivery', label: 'Späteste Zustellung', art: 'time', pflicht: true },
      { id: 'pickupContact', label: 'Ansprechpartner Abholung', art: 'text', pflicht: true },
      { id: 'dropContact', label: 'Ansprechpartner Empfang', art: 'text', pflicht: true },
    ],
  },
];

/**
 * Felder, die der gemeinsame Dialog bereits selbst erfasst.
 *
 * Sie stehen in den Bestandslisten oben mit drin (pickup, destination, date,
 * time und ihre Varianten). Im Dialog werden sie NICHT ein zweites Mal
 * gezeigt - sonst stuende dieselbe Frage zweimal auf einer Seite.
 *
 * `ersetztDurch` sagt, welches Feld des Dialogs die Angabe traegt. Der
 * Prueflauf rechnet damit nach, dass wirklich nichts verlorengeht.
 */
export const VOM_DIALOG_ERFASST: Record<string, string> = {
  pickup: 'Abholadresse',
  destination: 'Zieladresse',
  date: 'Zeitpunkt',
  time: 'Zeitpunkt',
  pickupDate: 'Zeitpunkt',
  pickupTime: 'Zeitpunkt',
};

export const SPEZIAL_SEITE = {
  label: 'Spezialfahrten',
  titel: 'Mobilität, wenn es darauf ankommt.',
  text: 'Persönlich geplant. Zuverlässig durchgeführt.',
  bereichLabel: 'Leistungsspektrum',
  bereichTitel: 'Vier Bereiche, persönlich abgestimmt auf Anlass, Bedarf und Ablauf.',
  /** Die vier Gruppen der Bestandsseite, wortgleich. */
  gruppen: [
    { titel: 'Mobilität', text: 'Für individuelle Wege, barrierearme Beförderung und planbare Transfers.', arten: ['wheelchair', 'series', 'airport'] },
    { titel: 'Gesundheit & Betreuung', text: 'Für Arzt, Klinik und wiederkehrende Behandlungen mit verlässlicher Terminabstimmung.', arten: ['medical', 'dialysis', 'chemo'] },
    { titel: 'Schule & Organisation', text: 'Für regelmäßige Schülerbeförderung und abgestimmte Mobilität im Unternehmensalltag.', arten: ['student', 'business'] },
    { titel: 'Kurier & Logistik', text: 'Für Dokumente, Ersatzteile und kleine Sendungen mit klar vereinbarten Zeitfenstern.', arten: ['courier'] },
  ],
} as const;

export const ANFRAGE_SEITE = {
  label: 'Spezialfahrten',
  titel: 'Anfrage vorbereiten',
  text: 'Bereiten Sie die wichtigsten Angaben für die persönliche Abstimmung vor.',
  /**
   * Wortgleich aus dem Bestand. Der Satz ist wichtig: Er sagt, dass NICHTS
   * automatisch uebermittelt wird - und das gilt unveraendert weiter.
   */
  keineUebermittlung: 'Die Angaben werden nicht online versendet. Nutzen Sie anschließend den Buchungsassistenten oder stimmen Sie die Fahrt direkt mit uns ab.',
} as const;
