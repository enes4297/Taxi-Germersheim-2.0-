// ═══════════════════════════════════════════════════════════════════════════
// Bestandsbereiche in den Ausgabeordner uebernehmen
// ═══════════════════════════════════════════════════════════════════════════
//
// Der Build erzeugt nur die oeffentlichen Seiten. Zentrale, Mitarbeiterportal
// und Dashboard werden nicht gebaut, sondern unveraendert kopiert - Datei fuer
// Datei, nach einer ausdruecklichen Liste.
//
// Bewusst KEIN pauschales Kopieren des Repositorys: Interne Dokumentation,
// SQL-Dateien, Sicherungen, Testbelege und Bildschirmaufnahmen gehoeren nicht
// in einen oeffentlich ausgelieferten Ordner. Was hier nicht ausdruecklich
// steht, wird nicht ausgeliefert.
//
// Die relativen Pfade bleiben dabei erhalten: fahrer/ laedt ueber "../admin/"
// und "../logo.png", admin/ laedt ueber "../assets/". Deshalb muessen assets/
// und logo.png mitkommen, obwohl sie selbst keine Portalseiten sind.

import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Was uebernommen wird.
 *
 * `ausser` gilt jeweils relativ zu `von` und schliesst Datei oder Ordner aus.
 */
export const UEBERNAHME = [
  {
    von: 'admin',
    zweck: 'Zentrale (Verwaltungsbereich)',
    ausser: [],
  },
  {
    von: 'fahrer',
    zweck: 'Mitarbeiterportal',
    // Der Playwright-Ordner und die Testprotokolle sind interne Arbeitsmittel.
    ausser: ['tests', 'TESTPROTOKOLL-dokumentenupload.md', 'TESTPROTOKOLL-krankmeldung-supabase.md', 'TESTPROTOKOLL-versandbestaetigungen.md'],
  },
  {
    von: 'dashboard',
    zweck: 'Weiterleitung auf die Zentrale',
    ausser: [],
  },
  {
    von: 'assets',
    zweck: 'Symbole, Marke und Ortsdaten - von admin/ ueber ../assets/ geladen',
    ausser: ['yumak-notes.txt'],
  },
  {
    von: 'vendor',
    zweck: 'Mitgelieferte Supabase-Bibliothek, feste Version statt fremdem CDN',
    // HERKUNFT.md ist eine interne Notiz und gehoert nicht in die Auslieferung.
    ausser: ['HERKUNFT.md'],
  },
];

/**
 * Wurzeldateien des Bestands, die mit ausgeliefert werden.
 *
 * Ausdrueckliche Liste, kein Glob: Die neue Startseite verlinkt auf
 * rewards.html, spiele.html, anmelden.html, impressum.html und
 * datenschutz.html. Diese Seiten verweisen ihrerseits weiter. Verlinkte Ziele
 * muessen im Ausgabeordner samt der Dateien erreichbar sein, die sie brauchen
 * - sonst fuehren Verweise ins Leere.
 *
 * NICHT enthalten und auch nicht enthalten sein duerfen:
 *   index.html               - erzeugt der Build selbst (siehe unten)
 *   rewards.html             - seit Schritt 016 ebenfalls aus Astro
 *   rewards-customer.css     - wurde nur von der alten rewards.html gebraucht
 *   impressum.html           - seit Schritt 018 aus Astro
 *   datenschutz.html         - dito
 *   hilfe-kontakt.html       - dito
 *   404.html                 - dito
 *   legal-pages.css          - wurde NUR von impressum.html und
 *                              datenschutz.html geladen (nachgesehen)
 *   hilfe-kontakt.css        - wurde NUR von hilfe-kontakt.html geladen
 *   flotte.html              - seit Schritt 019 aus Astro
 *   spezialfahrten.html      - dito
 *   spezial-anfrage.html     - dito
 *   special-services.css     - wurde NUR von spezial-anfrage.html und
 *                              spezialfahrten.html geladen (nachgesehen)
 *   special-services.js      - wurde NUR von spezial-anfrage.html geladen.
 *                              Die neun Fahrtarten und alle ihre Felder
 *                              stehen jetzt in FAHRTARTEN (inhalte.ts) und
 *                              werden vom gemeinsamen Anfragedialog erfasst.
 *   fix_admin_auth.py        - Werkzeug, von keiner Seite referenziert
 *   logo-original-full.png   - Bildvorlage, von keiner Seite referenziert
 *   tg-icon-original.png     - dito
 *   *.md, package*.json      - interne Dateien
 *
 * SEIT SCHRITT 017 ausdruecklich NICHT MEHR enthalten - nachgesehen, nicht
 * vermutet: Keine dieser drei Dateien gehoert zu einer erreichbaren
 * Kundenfunktion. Sie bleiben im Repository liegen, sie werden nur nicht mehr
 * ausgeliefert.
 *   konto-einrichtung.html   - eine ausdrueckliche Demo ("Demo ohne echte
 *                              Kontosicherheit"), die das Konto nur im Browser
 *                              anlegt. Sie verlangt den Sitzungsschluessel
 *                              taxiCustomerDemoRegistrationDraft - den setzt
 *                              KEINE Datei im Projekt, auch registrieren.html
 *                              nicht. Die Seite leitet also immer sofort auf
 *                              registrieren.html zurueck. Kein Verweis fuehrt
 *                              auf sie.
 *   customer-auth-demo.js    - die Schein-Anmeldung dieser Demo, ueber
 *                              localStorage. Sie wurde nur von
 *                              konto-einrichtung.html geladen.
 *   customer-journey-demo.js - 499 Zeilen, von keiner einzigen Seite geladen.
 *
 * WEITERHIN enthalten, trotz des Namens: auth-demo.css. Das ist eine reine
 * Stilvorlage und wird von ELF echten Kontoseiten gebraucht. Der Name ist
 * irrefuehrend, die Datei ist es nicht.
 *
 * WICHTIG zu index.html und rewards.html: Beide Seiten kommen inzwischen aus
 * Astro - index.html seit Schritt 014, rewards.html seit Schritt 016. Stuenden
 * sie hier, wuerde der Bestand die neuen Seiten ueberschreiben. Genau davor
 * schuetzt konflikteSuchen(): Der Build braeche ab, statt still zu
 * ueberschreiben. Die alte rewards.html bleibt im Repository liegen; sie wird
 * nur nicht mehr ausgeliefert.
 */
const WURZELDATEIEN = [
  // Oeffentliche Seiten
  'anmelden.html',
  'kunden-einstellungen.html', 'kundenkonto.html',
  'live-fahrt.html', 'meine-fahrten.html', 'meinkonto.html', 'passwort-vergessen.html',
  'passwort-zuruecksetzen.html', 'registrieren.html',
  'spiele.html', 'wallet-gutscheine.html',
  // Stilvorlagen
  'auth-demo.css', 'home-luxury.css', 'kunden-einstellungen.css',
  'live-ride.css', 'meinefahrten.css', 'public-premium-v2.css',
  'public-states.css', 'public-system.css', 'public-visual-repair.css',
  'spiele.css', 'style.css', 'wallet-gutscheine.css',
  // Skripte
  'customer-auth.js', 'home-luxury.js',
  'public-premium-v2.js', 'public-system.js', 'rewards-customer.js', 'script.js',
  'spiele.js', 'taxi-rush.js',
  // Bilder
  'logo.png', 'yumak-avatar.png',
];

for (const datei of WURZELDATEIEN) {
  UEBERNAHME.push({ von: datei, zweck: 'Bestandsseite oder von ihr benoetigte Datei', ausser: [] });
}

/** Gilt ueberall, zusaetzlich zu den Listen oben. */
export const NIE_MITNEHMEN = [
  /(^|[\\/])node_modules([\\/]|$)/,
  /(^|[\\/])test-results([\\/]|$)/,
  /(^|[\\/])\.gitkeep$/,
  /(^|[\\/])\.gitignore$/,
  /(^|[\\/])\.DS_Store$/,
];

function istAusgeschlossen(pfadRelativZurWurzel, regelAusser, basis) {
  const innen = relative(basis, pfadRelativZurWurzel);
  const teile = innen.split(sep);
  if (regelAusser.some((a) => teile[0] === a || innen === a)) return true;
  return NIE_MITNEHMEN.some((r) => r.test(innen));
}

/**
 * Namenskonflikte suchen, BEVOR kopiert wird.
 *
 * Zu diesem Zeitpunkt liegt im Ausgabeordner schon alles, was Astro erzeugt
 * hat - gebaute Seiten und der komplette Inhalt von public/. Traegt eine
 * dieser Dateien denselben Pfad wie eine Bestandsdatei, wuerde das Kopieren
 * sie ueberschreiben. Still darf das nicht passieren:
 *
 *   - Gleicher Inhalt: nur eine ueberfluessige Dublette. Sie wird gemeldet,
 *     der Build laeuft weiter. Die Datei gehoert dann aus public/ entfernt -
 *     der Bestand ist die massgebliche Fassung.
 *   - Abweichender Inhalt: Der Build bricht ab. Welche der beiden Fassungen
 *     gelten soll, ist eine Entscheidung und keine Frage der Reihenfolge,
 *     in der zufaellig kopiert wird.
 */
async function konflikteSuchen(wurzel, ziel) {
  const gleich = [];
  const abweichend = [];

  for (const regel of UEBERNAHME) {
    const quelle = join(wurzel, regel.von);
    if (!existsSync(quelle)) continue;

    const istOrdner = (await stat(quelle)).isDirectory();
    const kandidaten = istOrdner
      ? (await dateienUnter(quelle)).filter((d) => !istAusgeschlossen(join(quelle, d), regel.ausser, quelle))
      : [''];

    for (const d of kandidaten) {
      const rel = d ? `${regel.von}/${d}` : regel.von;
      const imZiel = join(ziel, rel);
      if (!existsSync(imZiel)) continue;
      const a = await pruefsumme(join(wurzel, rel));
      const b = await pruefsumme(imZiel);
      (a === b ? gleich : abweichend).push(rel);
    }
  }

  return { gleich, abweichend };
}

async function dateienUnter(ordner, basis = ordner) {
  const raus = [];
  for (const e of await readdir(ordner, { withFileTypes: true })) {
    const p = join(ordner, e.name);
    if (e.isDirectory()) raus.push(...(await dateienUnter(p, basis)));
    else raus.push(relative(basis, p).split(sep).join('/'));
  }
  return raus;
}

const pruefsumme = async (p) => createHash('sha256').update(await readFile(p)).digest('hex');

/**
 * Kopiert die Bestandsbereiche nach `ziel`.
 * Gibt je Eintrag die Anzahl uebernommener Dateien zurueck.
 */
export async function bestandKopieren(wurzel, ziel, melden = () => {}) {
  const { gleich, abweichend } = await konflikteSuchen(wurzel, ziel);

  if (abweichend.length) {
    throw new Error(
      'Namenskonflikt: Diese Dateien liegen sowohl in public/ als auch im Bestand, ' +
        'mit UNTERSCHIEDLICHEM Inhalt. Es wurde nichts ueberschrieben. Bitte entscheiden, ' +
        'welche Fassung gilt, und die andere entfernen:\n  ' +
        abweichend.join('\n  '),
    );
  }
  for (const d of gleich) {
    melden(
      `Dublette: ${d} liegt in public/ UND im Bestand, inhaltlich gleich. ` +
        'Der Bestand gilt; die Datei gehoert aus public/ entfernt.',
    );
  }

  const bericht = [];

  for (const regel of UEBERNAHME) {
    const quelle = join(wurzel, regel.von);
    if (!existsSync(quelle)) {
      bericht.push({ ...regel, fehlt: true, dateien: 0 });
      continue;
    }

    const zielPfad = join(ziel, regel.von);
    const istOrdner = (await stat(quelle)).isDirectory();

    if (istOrdner) {
      await cp(quelle, zielPfad, {
        recursive: true,
        filter: (q) => !istAusgeschlossen(q, regel.ausser, quelle),
      });
      const ausBestand = (await dateienUnter(quelle)).filter(
        (d) => !istAusgeschlossen(join(quelle, d), regel.ausser, quelle),
      );
      bericht.push({ ...regel, dateien: ausBestand.length });
    } else {
      await mkdir(dirname(zielPfad), { recursive: true });
      await cp(quelle, zielPfad);
      bericht.push({ ...regel, dateien: 1 });
    }
  }

  return bericht;
}

/** Astro-Einbindung: laeuft, sobald der Build der Seiten fertig ist. */
export default function bestandUebernehmen() {
  return {
    name: 'bestand-uebernehmen',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const wurzel = fileURLToPath(new URL('..', import.meta.url));
        const ziel = fileURLToPath(dir);
        const bericht = await bestandKopieren(wurzel, ziel, (t) => logger.warn(t));

        // Die Wurzeldateien einzeln zu melden waere eine Wand aus 49 Zeilen.
        // Ordner einzeln, Wurzeldateien als eine Summe.
        let wurzelZahl = 0;
        for (const eintrag of bericht) {
          if (eintrag.fehlt) {
            logger.warn(`${eintrag.von} nicht gefunden - nichts uebernommen`);
          } else if (eintrag.zweck.startsWith('Bestandsseite')) {
            wurzelZahl += eintrag.dateien;
          } else {
            logger.info(`${eintrag.von}: ${eintrag.dateien} Dateien (${eintrag.zweck})`);
          }
        }
        if (wurzelZahl) logger.info(`Wurzeldateien des Bestands: ${wurzelZahl} (verlinkte Seiten und ihre Dateien)`);
      },
    },
  };
}
