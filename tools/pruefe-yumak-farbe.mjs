// ═══════════════════════════════════════════════════════════════════════════
// Fellkorrektur ueber den ganzen Clip pruefen
// ═══════════════════════════════════════════════════════════════════════════
//
// Ein einzelnes Standbild sagt nichts darueber, ob die Korrektur waehrend der
// Bewegung haelt. Flackern entsteht genau dann, wenn die Schutzmaske von Bild
// zu Bild kippt - etwa weil ein Auge kurz halb geschlossen ist und die
// Saettigung unter die Schwelle rutscht.
//
// Deshalb wird JEDES Bild beider Fassungen verglichen:
//
//   Augen und Nase  Anzahl der Punkte mit Saettigung ueber 80 und der
//                   Hoechstwert. Beides muss in beiden Fassungen nahezu
//                   gleich sein - und von Bild zu Bild ruhig verlaufen.
//   Fliege          Anzahl der Punkte, bei denen Blau deutlich ueber Rot
//                   liegt. Muss erhalten bleiben.
//   Fell            Mittleres Rot minus Blau ueber die ganze Figur. Soll in
//                   der korrigierten Fassung nahe null liegen.
//   Flackern        Groesste Aenderung von einem Bild zum naechsten. Ein
//                   ruhiger Verlauf heisst: kein Farbspringen.
//
// Aufruf:  node tools/pruefe-yumak-farbe.mjs [zustand ...]

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FFMPEG, FFPROBE } from './yumak-quellen.mjs';

const WURZEL = fileURLToPath(new URL('..', import.meta.url));
const MEDIEN = join(WURZEL, 'public', 'assets', 'yumak');
const TEMP = join(WURZEL, '.belege-astro', 'farbpruefung');
mkdirSync(TEMP, { recursive: true });

// VOLLE AUFLOESUNG, nicht verkleinert.
//
// Erster Versuch mass auf 180 Punkten Breite. Dort ist das Auge nur zwei bis
// drei Punkte gross, und die Verkleinerung mittelt es mit dem Fell ringsum -
// die Saettigung faellt dadurch unter die Schwelle. Gemessen kam "5 gegen 2
// Punkte" heraus und damit ein Fehlalarm, obwohl der Augen-Spitzenwert in
// voller Aufloesung nachweislich von 103 auf 102 ging.
const BREITE = 0;   // 0 = Breite der Datei uebernehmen
const S_HOCH = 80;  // ab hier: Auge oder Nase
const BLAU = 12;    // ab hier: Fliege

const zustaende = process.argv.slice(2).length ? process.argv.slice(2) : ['idle', 'wave', 'curious'];

function bilder(datei, name) {
  const roh = join(TEMP, name + '.rgb');
  execFileSync(FFMPEG, [
    '-v', 'error', '-y', '-i', datei,
    '-f', 'rawvideo', '-pix_fmt', 'rgb24', roh,
  ]);
  return readFileSync(roh);
}

function messen(b, off, px) {
  let hoch = 0, maxSat = 0, blau = 0, summeRB = 0, figur = 0;
  for (let i = 0; i < px; i++) {
    const j = off + i * 3;
    const R = b[j], G = b[j + 1], B = b[j + 2];
    const mx = Math.max(R, G, B), mn = Math.min(R, G, B);
    if (mx < 26) continue;              // Hintergrund
    figur += 1;
    const sat = mx - mn;
    if (sat > maxSat) maxSat = sat;
    if (sat > S_HOCH) hoch += 1;
    if (B - R > BLAU) blau += 1;
    summeRB += R - B;
  }
  return { hoch, maxSat, blau, rb: figur ? summeRB / figur : 0, figur };
}

const spanne = (xs) => Math.max(...xs) - Math.min(...xs);
const groessterSprung = (xs) => {
  let m = 0;
  for (let i = 1; i < xs.length; i++) m = Math.max(m, Math.abs(xs[i] - xs[i - 1]));
  return m;
};

console.log('Alle Bilder beider Fassungen verglichen.\n');

let alleGut = true;

for (const id of zustaende) {
  const warm = join(MEDIEN, `${id}-gross.mp4`);
  const grau = join(MEDIEN, `${id}-grau-gross.mp4`);

  const b = Number(execFileSync(FFPROBE, ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width', '-of', 'csv=p=0', warm], { encoding: 'utf8' }).trim());
  const h = Number(execFileSync(FFPROBE, ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=height', '-of', 'csv=p=0', warm], { encoding: 'utf8' }).trim());
  const px = b * h, byte = px * 3;

  const rohW = bilder(warm, 'warm');
  const rohG = bilder(grau, 'grau');
  const n = Math.min(Math.floor(rohW.length / byte), Math.floor(rohG.length / byte));

  const w = [], g = [];
  for (let i = 0; i < n; i++) {
    w.push(messen(rohW, i * byte, px));
    g.push(messen(rohG, i * byte, px));
  }

  const mw = (xs, k) => xs.reduce((a, c) => a + c[k], 0) / xs.length;

  console.log(`── ${id}  (${n} Bilder) ──────────────────────────────────`);
  console.log(`  Augen und Nase, Punkte mit Saettigung > ${S_HOCH}`);
  console.log(`      warm   Mittel ${mw(w, 'hoch').toFixed(0).padStart(4)}   grau   Mittel ${mw(g, 'hoch').toFixed(0).padStart(4)}   Erhalt ${(mw(g, 'hoch') / Math.max(1, mw(w, 'hoch')) * 100).toFixed(0)} %`);
  console.log(`  Hoechste Saettigung im Bild`);
  console.log(`      warm   Mittel ${mw(w, 'maxSat').toFixed(0).padStart(4)}   grau   Mittel ${mw(g, 'maxSat').toFixed(0).padStart(4)}`);
  console.log(`  Fliege, Punkte mit Blau deutlich ueber Rot`);
  console.log(`      warm   Mittel ${mw(w, 'blau').toFixed(0).padStart(4)}   grau   Mittel ${mw(g, 'blau').toFixed(0).padStart(4)}   Erhalt ${(mw(g, 'blau') / Math.max(1, mw(w, 'blau')) * 100).toFixed(0)} %`);
  console.log(`  Fell, mittleres Rot minus Blau ueber die Figur`);
  console.log(`      warm   ${mw(w, 'rb').toFixed(1).padStart(5)}        grau   ${mw(g, 'rb').toFixed(1).padStart(5)}`);

  const rbFolge = g.map((x) => x.rb);
  const hochFolge = g.map((x) => x.hoch);
  const sprungRB = groessterSprung(rbFolge);
  const sprungHoch = groessterSprung(hochFolge);
  console.log(`  Flackern von Bild zu Bild`);
  console.log(`      Farbton  groesster Sprung ${sprungRB.toFixed(2)}   Spanne ${spanne(rbFolge).toFixed(2)}`);
  console.log(`      Augen    groesster Sprung ${sprungHoch}   Spanne ${spanne(hochFolge)}`);

  // Urteil, an Zahlen gebunden.
  const erhaltAuge = mw(g, 'hoch') / Math.max(1, mw(w, 'hoch'));
  const erhaltBlau = mw(g, 'blau') / Math.max(1, mw(w, 'blau'));
  const urteil = [];
  if (erhaltAuge < 0.9) { urteil.push('Augen/Nase verlieren Farbe'); alleGut = false; }
  if (erhaltBlau < 0.9) { urteil.push('Fliege verliert Farbe'); alleGut = false; }
  if (Math.abs(mw(g, 'rb')) > 3) { urteil.push('Fell noch nicht neutral'); alleGut = false; }
  if (sprungRB > 1.5) { urteil.push('Farbton springt zwischen Bildern'); alleGut = false; }
  console.log(`  Ergebnis: ${urteil.length ? urteil.join('; ') : 'in Ordnung'}\n`);
}

rmSync(TEMP, { recursive: true, force: true });
console.log(alleGut ? 'Alle geprueften Zustaende in Ordnung.' : 'Mindestens ein Punkt ist auffaellig - siehe oben.');
if (!alleGut) process.exitCode = 1;
