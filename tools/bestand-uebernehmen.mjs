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

import { cp, mkdir, readdir, stat } from 'node:fs/promises';
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
    von: 'logo.png',
    zweck: 'Logo - von admin/ und fahrer/ ueber ../logo.png geladen',
    ausser: [],
  },
];

/** Gilt ueberall, zusaetzlich zu den Listen oben. */
const NIE_MITNEHMEN = [
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

async function zaehleDateien(ordner) {
  let n = 0;
  for (const eintrag of await readdir(ordner, { withFileTypes: true })) {
    if (eintrag.isDirectory()) n += await zaehleDateien(join(ordner, eintrag.name));
    else n += 1;
  }
  return n;
}

/**
 * Kopiert die Bestandsbereiche nach `ziel`.
 * Gibt je Eintrag die Anzahl uebernommener Dateien zurueck.
 */
export async function bestandKopieren(wurzel, ziel) {
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
      bericht.push({ ...regel, dateien: await zaehleDateien(zielPfad) });
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
        const bericht = await bestandKopieren(wurzel, ziel);

        for (const eintrag of bericht) {
          if (eintrag.fehlt) logger.warn(`${eintrag.von} nicht gefunden - nichts uebernommen`);
          else logger.info(`${eintrag.von}: ${eintrag.dateien} Dateien (${eintrag.zweck})`);
        }
      },
    },
  };
}
