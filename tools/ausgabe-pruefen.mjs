// ═══════════════════════════════════════════════════════════════════════════
// Ausgabeordner pruefen
// ═══════════════════════════════════════════════════════════════════════════
//
// Drei Fragen, jede mit einer Messung statt einer Annahme:
//
//   1. Liegt die Probeseite da, und liegt sie als .html (nicht als Ordner)?
//   2. Sind Zentrale, Mitarbeiterportal und Dashboard vollstaendig und
//      BYTEGLEICH uebernommen? Bytegleich, weil "unveraendert funktionieren"
//      sich nicht aus einer Dateiliste ableiten laesst.
//   3. Ist nichts drin, was dort nicht hingehoert - interne Dokumentation,
//      SQL, Testbelege, Quelldateien?
//
// Das ist eine Pruefung des Ausgabeordners, kein Oberflaechentest. Ob die
// Anmeldung der Zentrale im Browser funktioniert, sagt dieses Skript nicht.

import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { UEBERNAHME } from './bestand-uebernehmen.mjs';

const WURZEL = fileURLToPath(new URL('..', import.meta.url));
const AUSGABE = join(WURZEL, 'dist-oeffentlich');

const ok = [];
const fehl = [];
const pruefe = (bedingung, text) => {
  (bedingung ? ok : fehl).push(text);
  console.log((bedingung ? 'OK   ' : 'FEHL ') + text);
};

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

if (!existsSync(AUSGABE)) {
  console.error('Ausgabeordner fehlt. Zuerst "npm run build" ausfuehren.');
  process.exit(1);
}

// ── 1. Probeseite ──────────────────────────────────────────────────────────
const probe = join(AUSGABE, 'probe.html');
pruefe(existsSync(probe), 'Probeseite liegt als probe.html im Ausgabeordner');
if (existsSync(probe)) {
  const inhalt = await readFile(probe, 'utf8');
  pruefe(inhalt.includes('noindex'), 'Probeseite traegt noindex');
  pruefe(inhalt.includes('Astro-Gerüsts'), 'Probeseite hat ihren Inhalt');
}
pruefe(
  !existsSync(join(AUSGABE, 'probe', 'index.html')),
  'kein Ordner probe/ - build.format "file" wirkt, bestehende URLs bleiben moeglich',
);

// ── 2. Bestandsbereiche vollstaendig und bytegleich ────────────────────────
for (const regel of UEBERNAHME) {
  const quelle = join(WURZEL, regel.von);
  const ziel = join(AUSGABE, regel.von);

  if (!existsSync(ziel)) {
    pruefe(false, `${regel.von} fehlt im Ausgabeordner`);
    continue;
  }

  const istOrdner = (await stat(quelle)).isDirectory();
  if (!istOrdner) {
    pruefe((await pruefsumme(quelle)) === (await pruefsumme(ziel)), `${regel.von} ist bytegleich`);
    continue;
  }

  const drin = await dateienUnter(ziel);
  let abweichend = 0;
  for (const d of drin) {
    if ((await pruefsumme(join(quelle, ...d.split('/')))) !== (await pruefsumme(join(ziel, ...d.split('/'))))) {
      abweichend += 1;
    }
  }
  pruefe(abweichend === 0, `${regel.von}: alle ${drin.length} Dateien bytegleich mit dem Bestand`);

  // Ausgeschlossenes darf nicht doch mitgekommen sein.
  for (const aus of regel.ausser) {
    pruefe(!drin.some((d) => d === aus || d.startsWith(aus + '/')), `${regel.von}: "${aus}" ist nicht ausgeliefert`);
  }
}

// ── 3. Nichts Internes im Ausgabeordner ────────────────────────────────────
const alle = await dateienUnter(AUSGABE);
const verboten = [
  ['SQL-Dateien', (d) => d.endsWith('.sql')],
  ['interne Dokumentation', (d) => d.endsWith('.md')],
  ['Supabase-Ordner', (d) => d.startsWith('supabase/')],
  ['Bildschirmaufnahmen', (d) => d.startsWith('screenshots/')],
  ['Claude-Konfiguration', (d) => d.startsWith('.claude/')],
  ['Werkzeuge und Quellen', (d) => d.startsWith('tools/') || d.startsWith('src/')],
  ['Abhaengigkeiten', (d) => d.includes('node_modules/')],
  ['Testbelege', (d) => d.includes('test-results/') || d.includes('/tests/')],
  ['Python-Skripte', (d) => d.endsWith('.py')],
];
for (const [name, trifft] of verboten) {
  const treffer = alle.filter(trifft);
  pruefe(treffer.length === 0, `keine ${name} im Ausgabeordner${treffer.length ? ': ' + treffer.slice(0, 3).join(', ') : ''}`);
}

console.log(`\nDateien im Ausgabeordner: ${alle.length}`);
console.log(`bestanden: ${ok.length}   fehlgeschlagen: ${fehl.length}`);
if (fehl.length) {
  console.log('\n' + fehl.join('\n'));
  process.exitCode = 1;
}
