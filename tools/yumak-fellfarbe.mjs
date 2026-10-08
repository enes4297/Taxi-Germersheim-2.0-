// ═══════════════════════════════════════════════════════════════════════════
// Yumak entbraeunen: Fell nach neutralgrau, Augen, Nase und Fliege behalten
// ═══════════════════════════════════════════════════════════════════════════
//
// Yumak ist in Wirklichkeit grau. In den Clips wirkt das Fell warm-braun:
// gemessen liegt R minus B im Fell bei 13 bis 43.
//
// WARUM EIN PAUSCHALER GRAUFILTER FALSCH WAERE
//   Er wuerde auch die bernsteinfarbenen Augen, die rosa Nase und die
//   dunkelblaue Fliege entfaerben. Deshalb wird nur das Fell angefasst.
//
// WIE DAS FELL VOM REST GETRENNT WIRD - gemessen an idle, nicht geschaetzt:
//
//   Bereich        Saettigung (max-min)   Kennzeichen
//   Augen          119 bis 122            sehr hoch
//   Nase            66                    hoch
//   Fell            0 bis 50 (97,9 %)     niedrig bis mittel
//   Fliege          19, aber B > R         das einzige Blau im Bild
//
//   Daraus zwei Regeln:
//     1. Saettigung unter 45 -> Fell, wird entfaerbt.
//        Zwischen 45 und 65 gleitender Uebergang, damit keine Kante entsteht.
//        Ueber 65 -> Augen und Nase, bleiben unveraendert.
//     2. Wo Blau groesser ist als Rot, bleibt die Farbe. Das schuetzt die
//        Fliege, die sonst unter Regel 1 fiele.
//
// KEIN BLAUSTICH: Entfaerbt wird zur Neutralen hin (Saettigung 0), es wird
// nichts ins Kalte verschoben. Helligkeit, Fellzeichnung und Streifen bleiben
// unangetastet - Entfaerben aendert die Luminanz nicht.
//
// Die Originale werden nur gelesen.
//
// Aufruf:  node tools/yumak-fellfarbe.mjs [zustand ...]
//          ohne Angabe: nur idle

import { execFileSync } from 'node:child_process';
import { mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ZUSTAENDE, quellDatei, FFMPEG, FFPROBE } from './yumak-quellen.mjs';

const WURZEL = fileURLToPath(new URL('..', import.meta.url));
const ZIEL = join(WURZEL, 'public', 'assets', 'yumak');
mkdirSync(ZIEL, { recursive: true });

const FAKTOR = { gross: 0.2691 * 2, klein: 0.1681 * 2 };
const CRF = 20;

/** Schwellen der Fell-Erkennung. */
const S_VOLL = 45; // darunter: sicher Fell
const S_AUS = 65;  // darueber: sicher Auge oder Nase
const BLAU = 4;    // ab wieviel B ueber R gilt ein Punkt als blau

// Maske: weiss = entfaerben, schwarz = Farbe behalten.
//   sattGrad  1 bei Saettigung <= S_VOLL, 0 ab S_AUS
//   blauGrad  1 wo deutlich blau
const sat = 'max(max(r(X,Y),g(X,Y)),b(X,Y))-min(min(r(X,Y),g(X,Y)),b(X,Y))';
const sattGrad = `clip((${S_AUS}-(${sat}))/(${S_AUS}-${S_VOLL}),0,1)`;
const blauGrad = `clip((b(X,Y)-r(X,Y)-${BLAU})/6,0,1)`;
const maske = `255*(${sattGrad})*(1-(${blauGrad}))`;

/**
 * Die Filterkette.
 * 1. Quelle dreifach teilen
 * 2. eine Kopie vollstaendig entfaerben
 * 3. aus einer Kopie die Maske rechnen
 * 4. Original und entfaerbte Fassung nach Maske mischen
 */
// WICHTIG: durchgehend in gbrp rechnen, nicht in yuv420p.
//
// Erster Versuch am 21.09.2026 lieferte die Maske als Graubild an
// maskedmerge, waehrend die Bilder in yuv420p vorlagen. ffmpeg wandelt die
// Maske dann still um - und die beiden Farbebenen bekommen den neutralen
// Wert 128. Das heisst: ueberall halb entfaerbt, auch Augen und Nase.
// Gemessen: Augensaettigung fiel von 103 auf 42, obwohl die Maske dort
// korrekt schwarz war.
//
// In gbrp tragen alle drei Ebenen dieselbe Maske, und es gibt keine
// Unterabtastung der Farbe. Erst ganz am Ende zurueck nach yuv420p.
function kette(skala) {
  return [
    `[0:v]${skala},format=gbrp,split=3[org][ent][msk]`,
    `[ent]hue=s=0,format=gbrp[grau]`,
    `[msk]geq=r='${maske}':g='${maske}':b='${maske}'[m]`,
    `[org][grau][m]maskedmerge,format=yuv420p[aus]`,
  ].join(';');
}

const mb = (p) => (statSync(p).size / 1048576).toFixed(2);
const wunsch = process.argv.slice(2);
const liste = wunsch.length ? ZUSTAENDE.filter((z) => wunsch.includes(z.id)) : ZUSTAENDE.filter((z) => z.id === 'idle');

for (const z of liste) {
  const quelle = quellDatei(z.id);
  const breiteQuelle = Number(
    execFileSync(FFPROBE, ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width', '-of', 'csv=p=0', quelle], { encoding: 'utf8' }).trim(),
  );

  for (const [stufe, faktor] of Object.entries(FAKTOR)) {
    const breite = Math.round((breiteQuelle * faktor) / 2) * 2;
    const skala = `scale=${breite}:-2:flags=lanczos`;
    const aus = join(ZIEL, `${z.id}-grau-${stufe}.mp4`);
    execFileSync(FFMPEG, [
      '-v', 'error', '-y',
      '-i', quelle,
      '-an',
      '-filter_complex', kette(skala),
      '-map', '[aus]',
      '-c:v', 'libx264', '-crf', String(CRF), '-preset', 'slow',
      '-pix_fmt', 'yuv420p', '-profile:v', 'high',
      '-movflags', '+faststart',
      aus,
    ]);
    console.log(`  ${z.id}-grau-${stufe}.mp4  ${mb(aus)} MB`);
  }

  // Standbild in derselben Korrektur - der Rueckfall darf nicht anders
  // aussehen als der Film.
  const dauer = Number(
    execFileSync(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', quelle], { encoding: 'utf8' }).trim(),
  );
  const breite = Math.round((breiteQuelle * FAKTOR.gross) / 2) * 2;
  const standbild = join(ZIEL, `${z.id}-grau-standbild.jpg`);
  execFileSync(FFMPEG, [
    '-v', 'error', '-y',
    '-ss', String(dauer * 0.5), '-i', quelle,
    '-frames:v', '1',
    '-filter_complex', kette(`scale=${breite}:-2:flags=lanczos`),
    '-map', '[aus]',
    '-q:v', '3',
    standbild,
  ]);
  console.log(`  ${z.id}-grau-standbild.jpg  ${mb(standbild)} MB`);
}

console.log(`\nFertig: ${liste.map((z) => z.id).join(', ')}`);
console.log('Die Originale und die unkorrigierten Ableitungen bleiben unveraendert liegen.');
