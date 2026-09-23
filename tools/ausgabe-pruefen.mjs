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
import { NIE_MITNEHMEN, UEBERNAHME } from './bestand-uebernehmen.mjs';
import { ANFANG, ENDE, BETROFFENE_SEITEN } from './kopfangaben-bestand.mjs';
import { OEFFENTLICHE_SEITEN, NICHT_INS_VERZEICHNIS } from './suchmaschinen-dateien.mjs';

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

/**
 * Den in Schritt 017 eingesetzten Kopfblock wieder herausschneiden.
 *
 * Nur so bleibt die Zusicherung "der Bestand wird unveraendert
 * ausgeliefert" pruefbar: Es gibt genau EINE benannte Ausnahme, und die
 * wird hier rueckgaengig gemacht, bevor verglichen wird. Bleibt danach auch
 * nur ein Byte Unterschied, faellt die Pruefung durch.
 */
function kopfblockEntfernen(text) {
  const a = text.indexOf(ANFANG);
  if (a < 0) return { text, hatte: false };
  const e = text.indexOf(ENDE, a);
  if (e < 0) return { text, hatte: false };
  // Genau das Gegenstueck zum Einsetzen, kein Herumraten an Leerzeichen:
  // kopfangaben-bestand.mjs setzt vor `</head>` den Text
  //     ANFANG + "\n  " + … + ENDE + "\n  "
  // ein. Entfernt wird deshalb von ANFANG bis einschliesslich ENDE und der
  // eine Abschluss "\n  " dahinter - Byte fuer Byte dasselbe rueckwaerts.
  const ABSCHLUSS = '\n  ';
  let ende = e + ENDE.length;
  if (text.startsWith(ABSCHLUSS, ende)) ende += ABSCHLUSS.length;
  return { text: text.slice(0, a) + text.slice(ende), hatte: true };
}

const pruefsumme = async (p) => createHash('sha256').update(await readFile(p)).digest('hex');

/** Wie pruefsumme, aber ohne den eingesetzten Kopfblock. */
async function pruefsummeOhneKopfblock(p) {
  const roh = await readFile(p, 'utf8');
  const { text } = kopfblockEntfernen(roh);
  return createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');
}

if (!existsSync(AUSGABE)) {
  console.error('Ausgabeordner fehlt. Zuerst "npm run build" ausfuehren.');
  process.exit(1);
}

// ── 1. Startseite ──────────────────────────────────────────────────────────
const probe = join(AUSGABE, 'index.html');
pruefe(existsSync(probe), 'Startseite liegt als index.html im Ausgabeordner');
if (existsSync(probe)) {
  const inhalt = await readFile(probe, 'utf8');
  pruefe(inhalt.includes('Germersheim'), 'Startseite hat ihren Inhalt');
  // Der Bestand darf die gebaute Startseite nicht ueberschrieben haben.
  pruefe(!inhalt.includes('home-luxury.js'), 'die gebaute Startseite steht da, nicht die alte Bestandsseite');
  pruefe(!inhalt.includes('noindex'), 'die Startseite ist nicht von Suchmaschinen ausgeschlossen');
}

// Verlinkte Unterseiten muessen erreichbar sein - samt der Dateien, die sie
// brauchen. Sonst fuehrt ein Verweis von der Startseite ins Leere.
const VERLINKT = ['rewards.html', 'spiele.html', 'anmelden.html', 'impressum.html', 'datenschutz.html', 'hilfe-kontakt.html'];
for (const v of VERLINKT) pruefe(existsSync(join(AUSGABE, v)), `verlinkte Seite ${v} liegt im Ausgabeordner`);

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
    // HTML-Seiten, in die Schritt 017 den Kopfblock einsetzt, werden ohne
    // diesen Block verglichen. Alles andere byteweise wie bisher.
    const mitBlock = BETROFFENE_SEITEN.includes(regel.von);
    const links = await pruefsumme(quelle);
    const rechts = mitBlock ? await pruefsummeOhneKopfblock(ziel) : await pruefsumme(ziel);
    pruefe(links === rechts, `${regel.von} ist bytegleich${mitBlock ? ' (ohne den eingesetzten Kopfblock)' : ''}`);
    continue;
  }

  // Ausgegangen wird vom BESTAND, nicht vom Zielordner: In assets/ liegen
  // dort inzwischen auch die neuen Medien aus public/. Die gehoeren nicht in
  // diesen Vergleich - sie haben im Bestand gar keine Entsprechung.
  const ausBestand = (await dateienUnter(quelle)).filter(
    (d) => !regel.ausser.includes(d.split('/')[0]) && !NIE_MITNEHMEN.some((r) => r.test(d)),
  );
  const drin = await dateienUnter(ziel);

  let fehlend = 0;
  let abweichend = 0;
  for (const d of ausBestand) {
    const imZiel = join(ziel, ...d.split('/'));
    if (!existsSync(imZiel)) { fehlend += 1; continue; }
    if ((await pruefsumme(join(quelle, ...d.split('/')))) !== (await pruefsumme(imZiel))) abweichend += 1;
  }
  pruefe(fehlend === 0, `${regel.von}: keine Bestandsdatei fehlt in der Ausgabe (${fehlend})`);
  pruefe(abweichend === 0, `${regel.von}: alle ${ausBestand.length} Bestandsdateien bytegleich`);

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
  ['Testbelege', (d) => d.includes('test-results/') || d.includes('/tests/') || d.includes('belege')],
  ['Python-Skripte', (d) => d.endsWith('.py')],
  // Die Vergleichsseiten und Videobelege der Vorschau bleiben dort. Sie
  // dienten der Qualitaetsfreigabe und haben in der Auslieferung nichts
  // verloren.
  ['Vergleichsseiten der Vorschau', (d) => d.startsWith('vergleich')],
  ['Platzhalterdateien', (d) => d.endsWith('.gitkeep')],
  // Die oertlichen Sichtproben sind Arbeitsmittel zur Beurteilung und haben
  // in der Auslieferung nichts verloren.
  ['Sichtproben', (d) => d.startsWith('sichtproben') || d.includes('walk-anfang') || d.includes('walk-ende')],
];
for (const [name, trifft] of verboten) {
  const treffer = alle.filter(trifft);
  pruefe(treffer.length === 0, `keine ${name} im Ausgabeordner${treffer.length ? ': ' + treffer.slice(0, 3).join(', ') : ''}`);
}

// ── 4. Die uebernommene Design-Grundlage ist vollstaendig ──────────────────
// Ein fehlendes Medium faellt im Browser sonst erst auf, wenn jemand genau
// hinsieht - ein fehlender Schriftschnitt gar nicht, der faellt still auf die
// Systemschrift zurueck.
// Der Pfad zur Vorschau steht bewusst NICHT im Quelltext: Er zeigt auf ein
// Verzeichnis auf genau einem Rechner. Wer den Abgleich will, setzt
// VORSCHAU_ORDNER; sonst wird dieser eine Punkt uebersprungen und das auch
// gesagt. Die uebrigen Pruefungen laufen unabhaengig davon.
const VORSCHAU = process.env.VORSCHAU_ORDNER;

const medien = alle.filter((d) => d.startsWith('assets/hero/') || d.startsWith('assets/fleet/'));
pruefe(medien.length === 22, `alle 22 Hero- und Fahrzeugmedien liegen im Ausgabeordner (${medien.length})`);

if (VORSCHAU && existsSync(join(VORSCHAU, 'public/assets/hero'))) {
  let abw = 0;
  for (const d of medien) {
    const inVorschau = join(VORSCHAU, 'public', ...d.split('/'));
    if (!existsSync(inVorschau)) { abw += 1; continue; }
    if ((await pruefsumme(join(AUSGABE, ...d.split('/')))) !== (await pruefsumme(inVorschau))) abw += 1;
  }
  pruefe(abw === 0, `Medien byteweise gleich mit der freigegebenen Vorschau (${medien.length} geprueft)`);
} else {
  console.log('HINW  VORSCHAU_ORDNER nicht gesetzt oder nicht erreichbar - Medienabgleich uebersprungen');
}

const schriften = alle.filter((d) => d.startsWith('schriften/') && d.endsWith('.woff2'));
pruefe(schriften.length === 18, `alle 18 Schriftdateien liegen oertlich vor (${schriften.length})`);

const seite = await readFile(probe, 'utf8');
pruefe(
  !/fonts\.(googleapis|gstatic)\.com/.test(seite),
  'kein Aufruf an Google Fonts in der ausgelieferten Seite',
);
pruefe(/_astro\/[^"]+\.css/.test(seite), 'die Seite bindet das gebaute CSS-Bundle ein');

console.log(`\nDateien im Ausgabeordner: ${alle.length}`);
console.log(`bestanden: ${ok.length}   fehlgeschlagen: ${fehl.length}`);
if (fehl.length) {
  console.log('\n' + fehl.join('\n'));
  process.exitCode = 1;
}
