// ═══════════════════════════════════════════════════════════════════════════
// Yumak vermessen: Figurgroesse, Grundlinie, Mitte
// ═══════════════════════════════════════════════════════════════════════════
//
// Die acht Clips haben DREI verschiedene Seitenverhaeltnisse und sehr
// unterschiedliche Figurengroessen. Wer sie ohne Angleichung nacheinander
// zeigt, bekommt Spruenge. Diese Messung liefert je Zustand:
//
//   oben       - oberste Bildzeile der Figur, Anteil der Bildhoehe
//   grund      - Standlinie: wo die Figur den Boden beruehrt
//   mitte      - waagerechte Mitte der Figur
//   hoehe      - grund - oben, also die tatsaechliche Figurhoehe
//
// WIE DIE GRUNDLINIE GEFUNDEN WIRD
//   Unter der Figur liegt eine Spiegelung auf dem Studioboden. Eine einfache
//   Helligkeitsschwelle zaehlt die mit und setzt die Grundlinie zu tief - das
//   war beim ersten Versuch so. Deshalb wird die Zeile gesucht, in der die
//   Anzahl heller Bildpunkte am staerksten abfaellt: Das ist die Kante
//   zwischen Koerper und Spiegelung.
//
// Gemessen wird ueber mehrere Bilder je Clip und der Median genommen, damit
// eine einzelne Pose das Ergebnis nicht verzieht.
//
// Aufruf:  node tools/yumak-lage.mjs
// Schreibt: sichtproben/yumak-lage.json  (nur Messwerte, keine Medien)

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ZUSTAENDE, quellDatei, FFMPEG, FFPROBE } from './yumak-quellen.mjs';

const WURZEL = fileURLToPath(new URL('..', import.meta.url));
const TEMP = join(WURZEL, '.belege-astro', 'yumak-messung');
const ZIEL = join(WURZEL, 'sichtproben', 'yumak-lage.json');

const RASTER = 240; // Messraster, quadratisch
const SCHWELLE = 42; // deutlich ueber dem Grund (4-17), unter dem Fell
const BILDER = [0.08, 0.2, 0.35, 0.5, 0.65, 0.8, 0.94]; // Anteile der Laufzeit

mkdirSync(TEMP, { recursive: true });
mkdirSync(join(WURZEL, 'sichtproben'), { recursive: true });

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

function dauer(datei) {
  return Number(
    execFileSync(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', datei], {
      encoding: 'utf8',
    }).trim(),
  );
}

/** Graustufen-Rohbild in festem Raster. Seitenverhaeltnis wird bewusst
 *  verzerrt - gemessen werden Anteile, keine Punkte. */
function graubild(datei, sekunde) {
  const aus = join(TEMP, 'messung.gray');
  execFileSync(FFMPEG, [
    '-v', 'error', '-y',
    '-ss', String(sekunde), '-i', datei,
    '-vframes', '1', '-update', '1',
    '-vf', `scale=${RASTER}:${RASTER},format=gray`,
    '-f', 'rawvideo', aus,
  ]);
  return readFileSync(aus);
}

function vermessen(b) {
  // Zeilenweise zaehlen, wie viele Punkte hell sind.
  const jeZeile = new Array(RASTER).fill(0);
  let x0 = RASTER, x1 = -1, y0 = RASTER;
  for (let y = 0; y < RASTER; y++) {
    for (let x = 0; x < RASTER; x++) {
      if (b[y * RASTER + x] > SCHWELLE) {
        jeZeile[y] += 1;
        if (y < y0) y0 = y;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
      }
    }
  }

  // Grundlinie: staerkster Abfall in der unteren Haelfte. Ueber drei Zeilen
  // geglaettet, sonst gewinnt ein einzelner Ausreisser.
  const glatt = jeZeile.map((_, i) =>
    (jeZeile[Math.max(0, i - 1)] + jeZeile[i] + jeZeile[Math.min(RASTER - 1, i + 1)]) / 3,
  );
  let grund = RASTER - 1;
  let groessterAbfall = -Infinity;
  for (let y = Math.floor(RASTER * 0.45); y < RASTER - 2; y++) {
    const abfall = glatt[y] - glatt[y + 2];
    if (abfall > groessterAbfall) {
      groessterAbfall = abfall;
      grund = y + 1;
    }
  }

  return { oben: y0 / RASTER, grund: grund / RASTER, links: x0 / RASTER, rechts: x1 / RASTER };
}

const ergebnis = {};

for (const z of ZUSTAENDE) {
  const datei = quellDatei(z.id);
  if (!existsSync(datei)) {
    console.error(`FEHLT: ${datei}`);
    process.exit(1);
  }
  const d = dauer(datei);
  const messungen = BILDER.map((anteil) => vermessen(graubild(datei, d * anteil)));

  const oben = median(messungen.map((m) => m.oben));
  const grund = median(messungen.map((m) => m.grund));
  const links = median(messungen.map((m) => m.links));
  const rechts = median(messungen.map((m) => m.rechts));

  const breiteQuelle = Number(
    execFileSync(FFPROBE, ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width', '-of', 'csv=p=0', datei], { encoding: 'utf8' }).trim(),
  );
  const hoeheQuelle = Number(
    execFileSync(FFPROBE, ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=height', '-of', 'csv=p=0', datei], { encoding: 'utf8' }).trim(),
  );

  ergebnis[z.id] = {
    quelle: { breite: breiteQuelle, hoehe: hoeheQuelle, dauer: Number(d.toFixed(2)) },
    oben: Number(oben.toFixed(3)),
    grund: Number(grund.toFixed(3)),
    mitte: Number(((links + rechts) / 2).toFixed(3)),
    figurhoehe: Number((grund - oben).toFixed(3)),
    figurbreite: Number((rechts - links).toFixed(3)),
  };
}

// ── Wie gross ist die Katze wirklich? ─────────────────────────────────────
//
// Die Figurhoehe allein taugt NICHT als Massstab: Eine liegende Katze ist
// naturgemaess flacher als eine sitzende. Nach der Hoehe anzugleichen wuerde
// die schlafende Katze auf das 1,8fache aufblasen - gemessen und verworfen.
//
// Stattdessen die Diagonale der Figur in QUELLPUNKTEN. Sie verbindet Breite
// und Hoehe und haengt viel weniger von der Pose ab. Das Ergebnis unten zeigt:
// Die acht Clips liegen innerhalb weniger Prozent beieinander - die Katze ist
// bereits ueberall etwa gleich gross gerendert. Was springt, sind die
// Bildformate und die Lage der Standlinie, nicht die Figur.
for (const [, m] of Object.entries(ergebnis)) {
  const bQ = m.figurbreite * m.quelle.breite;
  const hQ = m.figurhoehe * m.quelle.hoehe;
  m.diagonale = Math.round(Math.hypot(bQ, hQ));
}
const diagonalen = Object.values(ergebnis).map((m) => m.diagonale);
const dMittel = diagonalen.reduce((a, c) => a + c, 0) / diagonalen.length;
const streuung = Math.max(...diagonalen.map((d) => Math.abs(d - dMittel) / dMittel));

// Einheitlicher Faktor Quellpunkt -> Buehnenpunkt. Bezug ist idle: Seine
// Figurhoehe soll die gewuenschte Hoehe in der Buehne ergeben.
const BUEHNE = { breite: 360, hoehe: 320, figurhoehe: 250, ankerX: 0.5, ankerY: 0.88 };
const faktor = BUEHNE.figurhoehe / (ergebnis.idle.figurhoehe * ergebnis.idle.quelle.hoehe);

for (const [, m] of Object.entries(ergebnis)) {
  const bR = m.quelle.breite * faktor;
  const hR = m.quelle.hoehe * faktor;
  m.darstellung = {
    // Groesse des Videoelements in Buehnenpunkten
    breite: Math.round(bR),
    hoehe: Math.round(hR),
    // Verschiebung, damit (mitte, grund) auf dem Anker der Buehne liegt
    links: Math.round(BUEHNE.breite * BUEHNE.ankerX - m.mitte * bR),
    oben: Math.round(BUEHNE.hoehe * BUEHNE.ankerY - m.grund * hR),
    // Wie gross die Katze damit tatsaechlich erscheint
    katzeRendert: Math.round(m.diagonale * faktor),
  };
}

ergebnis.__buehne = { ...BUEHNE, faktor: Number(faktor.toFixed(4)) };
writeFileSync(ZIEL, JSON.stringify(ergebnis, null, 2), 'utf8');

console.log('Zustand       | Quelle      | oben  grund | Figur H x B  | Mitte | Diagonale | Katze in der Buehne');
for (const [id, m] of Object.entries(ergebnis)) {
  if (id.startsWith('__')) continue;
  console.log(
    `${id.padEnd(13)} | ${String(m.quelle.breite + 'x' + m.quelle.hoehe).padEnd(11)} | ${m.oben.toFixed(2)}  ${m.grund.toFixed(2)}  | ${m.figurhoehe.toFixed(2)} x ${m.figurbreite.toFixed(2)}  | ${m.mitte.toFixed(2)}  |   ${String(m.diagonale).padStart(4)}    | ${String(m.darstellung.katzeRendert).padStart(3)} Punkte`,
  );
}
console.log(
  `\nDiagonale der Figur: Mittel ${Math.round(dMittel)} Quellpunkte, groesste Abweichung ${(streuung * 100).toFixed(1)} %.`,
);
console.log(`Buehne ${BUEHNE.breite}x${BUEHNE.hoehe}, ein Quellpunkt = ${faktor.toFixed(4)} Buehnenpunkte.`);
rmSync(TEMP, { recursive: true, force: true });
console.log(`\ngeschrieben: ${ZIEL}`);
