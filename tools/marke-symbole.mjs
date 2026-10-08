// ═══════════════════════════════════════════════════════════════════════════
// Seitensymbole aus dem vorhandenen Markenzeichen erzeugen
// ═══════════════════════════════════════════════════════════════════════════
//
// Quelle ist AUSSCHLIESSLICH `tg-icon-original.png` - das freigegebene
// Markenzeichen, das seit jeher im Projekt liegt. Es wird nur skaliert,
// quadratisch gefuellt und einmal hinterlegt. Nichts wird neu gezeichnet,
// nichts hinzuerfunden.
//
// Das Zeichen ist hochkant (942 x 1186). Fuer ein quadratisches Symbol wird es
// auf 88 % der Kantenlaenge gebracht und mittig eingesetzt - sonst klebt es an
// den Raendern und wird in runden Masken beschnitten.
//
// Erzeugt nach public/:
//   favicon-32.png        Adressleiste und Lesezeichen
//   favicon-192.png       Android-Startbildschirm
//   favicon-512.png       hohe Aufloesung
//   apple-touch-icon.png  iOS, 180 px, MIT Grund - iOS legt sonst Schwarz
//                         hinter die Transparenz
//   favicon.ico           Rueckfall fuer Abrufe ohne <link>, etwa /favicon.ico
//
// Aufruf: npm run marke-symbole

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const WURZEL = fileURLToPath(new URL('..', import.meta.url));
const QUELLE = join(WURZEL, 'tg-icon-original.png');
const ZIEL = join(WURZEL, 'public');
const FFMPEG = process.env.FFMPEG_PFAD || 'ffmpeg';

/** Grund fuer das iOS-Symbol - derselbe Wert wie theme-color im Seitenkopf. */
const GRUND = '#18181b';

mkdirSync(ZIEL, { recursive: true });

/**
 * Ein Symbol erzeugen.
 *
 * `grund === null` haelt die Durchsichtigkeit. Sonst wird das Zeichen ueber
 * eine Farbflaeche gelegt.
 *
 * WICHTIG: Fuer den undurchsichtigen Fall wird ausdruecklich `overlay` ueber
 * eine Farbebene benutzt und NICHT `pad=…:color=…`. Bei einer Quelle mit
 * Alphakanal fuellt `pad` zwar die Raender, laesst die durchsichtigen Stellen
 * IM Bild aber unberuehrt - und die wurden dann als weisser Kasten
 * ausgegeben. Nachgesehen, nicht vermutet: Der erste Versuch mit `pad` hat
 * genau so ein weisses Rechteck geliefert.
 */
function rendern(kante, ziel, grund) {
  const hoehe = Math.round((kante * 88) / 100);
  if (!grund) {
    execFileSync(FFMPEG, ['-y', '-v', 'error', '-i', QUELLE, '-vf',
      `scale=-1:${hoehe}:flags=lanczos,pad=${kante}:${kante}:(ow-iw)/2:(oh-ih)/2:color=#00000000`,
      '-frames:v', '1', ziel]);
  } else {
    execFileSync(FFMPEG, ['-y', '-v', 'error',
      '-f', 'lavfi', '-i', `color=c=0x${grund.replace('#', '')}:s=${kante}x${kante}:d=1`,
      '-i', QUELLE,
      '-filter_complex', `[1:v]scale=-1:${hoehe}:flags=lanczos[z];[0:v][z]overlay=(W-w)/2:(H-h)/2,format=rgb24`,
      '-frames:v', '1', ziel]);
  }
  return readFileSync(ziel).length;
}

/**
 * ICO mit einem einzigen 32er-PNG darin.
 *
 * Seit Windows Vista darf im ICO-Container eine vollstaendige PNG-Datei
 * stehen; das sparen wir uns an Bitmap-Umrechnung. Der Kopf ist 6 Byte,
 * danach ein Verzeichniseintrag von 16 Byte, danach die PNG-Daten.
 */
function icoSchreiben(pngPfad, icoPfad) {
  const png = readFileSync(pngPfad);
  const kopf = Buffer.alloc(6);
  kopf.writeUInt16LE(0, 0); // reserviert
  kopf.writeUInt16LE(1, 2); // Typ 1 = Symbol
  kopf.writeUInt16LE(1, 4); // ein Bild
  const eintrag = Buffer.alloc(16);
  eintrag.writeUInt8(32, 0); // Breite
  eintrag.writeUInt8(32, 1); // Hoehe
  eintrag.writeUInt8(0, 2); // Farben in der Palette: 0 = keine Palette
  eintrag.writeUInt8(0, 3); // reserviert
  eintrag.writeUInt16LE(1, 4); // Farbebenen
  eintrag.writeUInt16LE(32, 6); // Bit je Bildpunkt
  eintrag.writeUInt32LE(png.length, 8);
  eintrag.writeUInt32LE(6 + 16, 12); // Versatz der Bilddaten
  writeFileSync(icoPfad, Buffer.concat([kopf, eintrag, png]));
  return 6 + 16 + png.length;
}

const werke = [
  ['favicon-32.png', 32, null],
  ['favicon-192.png', 192, null],
  ['favicon-512.png', 512, null],
  ['apple-touch-icon.png', 180, GRUND],
];

/**
 * Das Vorschaubild fuers Teilen (og:image), 1200 x 630.
 *
 * Es ist ein AUSSCHNITT EINER ECHTEN AUFNAHME unserer eigenen E-Klasse
 * (GER TX 100) - dasselbe Foto, das auf der Startseite und in der Flotte
 * steht. Es wird nur zugeschnitten und verkleinert. Keine Montage, keine
 * hinzugefuegte Schrift, keine Aussage, die nicht ohnehin auf der Seite
 * steht: Wer das Bild beim Teilen sieht, sieht ein Fahrzeug, das es gibt.
 *
 * 1200 x 630 ist das von den gaengigen Diensten erwartete Seitenverhaeltnis.
 * Die Quelle ist 1600 x 1200; zugeschnitten wird waagerecht auf volle Breite
 * und senkrecht mittig, leicht nach unten versetzt, damit das Fahrzeug und
 * nicht der Himmel im Bild steht.
 */
function teilbildRendern() {
  const quelle = join(WURZEL, 'public', 'assets', 'fleet', 'mercedes-e-klasse-schwarz-1600.jpg');
  const ziel = join(ZIEL, 'teilen-vorschau.jpg');
  execFileSync(FFMPEG, ['-y', '-v', 'error', '-i', quelle, '-vf',
    'crop=1600:840:0:(ih-840)*0.62,scale=1200:630:flags=lanczos',
    '-q:v', '4', '-frames:v', '1', ziel]);
  return readFileSync(ziel).length;
}

console.log(`Quelle: tg-icon-original.png\n`);
for (const [name, kante, grund] of werke) {
  const bytes = rendern(kante, join(ZIEL, name), grund);
  console.log(`  ${name.padEnd(24)} ${String(kante).padStart(3)} px  ${String(bytes).padStart(7)} Byte${grund ? `  Grund ${grund}` : '  durchsichtig'}`);
}
const icoBytes = icoSchreiben(join(ZIEL, 'favicon-32.png'), join(ZIEL, 'favicon.ico'));
console.log(`  ${'favicon.ico'.padEnd(24)}  32 px  ${String(icoBytes).padStart(7)} Byte  enthaelt favicon-32.png`);

const teilBytes = teilbildRendern();
console.log(`\nVorschaubild fuers Teilen (Ausschnitt einer echten Aufnahme):`);
console.log(`  ${'teilen-vorschau.jpg'.padEnd(24)} 1200 x 630  ${String(teilBytes).padStart(7)} Byte`);
console.log(`\nfertig - nach public/ geschrieben`);
