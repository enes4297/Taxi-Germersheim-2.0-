// ═══════════════════════════════════════════════════════════════════════════
// Yumak-Medien aufbereiten
// ═══════════════════════════════════════════════════════════════════════════
//
// Liest die acht Originale (nur lesend!) und schreibt optimierte Ableitungen
// nach public/assets/yumak/.
//
// WAS DABEI PASSIERT
//   - doppelte Dateiendung wird korrigiert: yumak_idle_v1.mp4.mp4 -> idle
//   - Tonspur entfernt (-an). Alle acht Originale haben eine, gebraucht wird
//     keine, und sie kostet nur Platz.
//   - Groesse an die tatsaechliche Darstellung angepasst, nicht an eine
//     runde Zahl: Die Buehne ist 360x320 Punkte auf dem Desktop und 225x200
//     auf dem Telefon. Bei doppelter Bildpunktdichte ergibt das die
//     Faktoren unten.
//   - Qualitaetsbasierte Kodierung (CRF), KEINE feste Dateigroesse. Fell,
//     Augen und Konturen sind der Pruefstein; eine Obergrenze in Megabyte
//     waere hier das falsche Ziel.
//   - Standbild je Zustand als Rueckfall bei reduzierter Bewegung,
//     blockiertem Autoplay und Ladefehler.
//
// Aufruf:  node tools/yumak-aufbereiten.mjs

import { execFileSync } from 'node:child_process';
import { mkdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ZUSTAENDE, quellDatei, FFMPEG, FFPROBE } from './yumak-quellen.mjs';

const WURZEL = fileURLToPath(new URL('..', import.meta.url));
const ZIEL = join(WURZEL, 'public', 'assets', 'yumak');
mkdirSync(ZIEL, { recursive: true });

// Ein Quellpunkt wird in der Buehne zu 0,2691 Punkten (siehe yumak-lage.mjs).
// Mal zwei fuer die Bildpunktdichte heutiger Bildschirme.
const FAKTOR = { gross: 0.2691 * 2, klein: 0.1681 * 2 };

// CRF: kleiner = besser. 20 ist fuer H.264 sichtbar verlustarm. Bewusst
// hoeher angesetzt als noetig waere, weil das Motiv fast schwarz ist - dort
// fallen Stufen im Verlauf zuerst auf.
//
// NUR H.264, KEIN VP9/WebM. Gemessen am 21.09.2026: VP9 kam bei diesem
// Material nicht ueber SSIM 0,947 (walk-right), waehrend H.264 bei 0,989 lag
// - und die WebM-Datei war dabei GROESSER. Niedrigere VP9-CRF-Werte aenderten
// das kaum (crf 22: 0,947 bei +40 % Groesse). Das duerfte am fast schwarzen,
// feinkoernigen Fell liegen. Eine zweite Fassung, die schlechter aussieht und
// mehr wiegt, hat keinen Zweck; H.264 unterstuetzt ohnehin jeder Browser.
const CRF = { h264: 20 };

const mb = (p) => (statSync(p).size / 1048576).toFixed(2);

function lauf(args) {
  execFileSync(FFMPEG, ['-v', 'error', '-y', ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
}

const bericht = [];

for (const z of ZUSTAENDE) {
  const quelle = quellDatei(z.id);
  if (!existsSync(quelle)) {
    console.error(`FEHLT: ${quelle}`);
    process.exit(1);
  }

  const zeile = { id: z.id, quelle: Number(mb(quelle)) };

  for (const [stufe, faktor] of Object.entries(FAKTOR)) {
    const b = Number(
      execFileSync(FFPROBE, ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width', '-of', 'csv=p=0', quelle], { encoding: 'utf8' }).trim(),
    );
    // Hoehe rechnet ffmpeg mit -2 auf eine gerade Zahl aus, damit das
    // Seitenverhaeltnis exakt erhalten bleibt.
    const breite = Math.round((b * faktor) / 2) * 2;
    const skala = `scale=${breite}:-2:flags=lanczos`;

    const mp4 = join(ZIEL, `${z.id}-${stufe}.mp4`);
    lauf([
      '-i', quelle,
      '-an',
      '-vf', skala,
      '-c:v', 'libx264', '-crf', String(CRF.h264), '-preset', 'slow',
      '-pix_fmt', 'yuv420p', '-profile:v', 'high',
      '-movflags', '+faststart',
      mp4,
    ]);

    zeile[stufe] = { breite, mp4: Number(mb(mp4)) };
  }

  // Standbild: ein Bild aus der Mitte des Clips. Es traegt den Rueckfall bei
  // reduzierter Bewegung, blockiertem Autoplay und Ladefehler - deshalb eine
  // Pose, die fuer sich allein steht.
  const dauer = Number(
    execFileSync(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', quelle], { encoding: 'utf8' }).trim(),
  );
  const standbild = join(ZIEL, `${z.id}-standbild.jpg`);
  const breiteGross = zeile.gross.breite;
  lauf([
    '-ss', String(dauer * 0.5), '-i', quelle,
    '-vframes', '1', '-update', '1',
    '-vf', `scale=${breiteGross}:-2:flags=lanczos`,
    '-q:v', '3',
    standbild,
  ]);
  zeile.standbild = Number(mb(standbild));

  bericht.push(zeile);
  console.log(`fertig: ${z.id}`);
}

console.log('\nZustand      | Original | gross            | klein            | Standbild');
let summe = 0;
for (const z of bericht) {
  summe += z.gross.mp4 + z.klein.mp4 + z.standbild;
  console.log(
    `${z.id.padEnd(12)} | ${String(z.quelle).padStart(5)} MB | ` +
      `${String(z.gross.breite).padStart(3)} px ${String(z.gross.mp4).padStart(5)} MB | ` +
      `${String(z.klein.breite).padStart(3)} px ${String(z.klein.mp4).padStart(5)} MB | ` +
      `${String(z.standbild).padStart(5)} MB`,
  );
}
const quellsumme = bericht.reduce((a, c) => a + c.quelle, 0);
console.log(`\nOriginale zusammen: ${quellsumme.toFixed(1)} MB`);
console.log(`Ableitungen zusammen: ${summe.toFixed(1)} MB (beide Groessen plus Standbilder)`);
console.log(`Was ein Besucher tatsaechlich laedt: nur EINE Fassung je Zustand, und nur die gerade gezeigte.`);
