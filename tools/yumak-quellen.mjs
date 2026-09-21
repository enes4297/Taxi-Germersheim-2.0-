// ═══════════════════════════════════════════════════════════════════════════
// Yumak: Quelldateien und Zustaende
// ═══════════════════════════════════════════════════════════════════════════
//
// Eine Stelle fuer alles, was die Werkzeuge gemeinsam brauchen.
//
// DIE QUELLDATEIEN WERDEN NUR GELESEN. Kein Werkzeug in diesem Ordner
// schreibt in den Quellordner, benennt dort um oder loescht etwas. Alles
// Erzeugte landet unter public/assets/yumak/.
//
// Die Quelldateien tragen eine DOPPELTE Endung ("yumak_idle_v1.mp4.mp4").
// Das wird hier beim Lesen beruecksichtigt und beim Schreiben korrigiert.
//
// yumak_walk_right_test_v0 ist eine Testfassung und steht bewusst NICHT in
// der Liste.

import { existsSync } from 'node:fs';
import { join } from 'node:path';

/** Wo die Originale liegen. Ueberschreibbar ueber YUMAK_QUELLE. */
export const QUELLORDNER = process.env.YUMAK_QUELLE || 'C:/Users/enesc/Desktop/Yumak animation';

const FFBIN = process.env.FFMPEG_BIN || 'C:/Users/enesc/ffmpeg-tg/ffmpeg-9.0.1-essentials_build/bin';
export const FFMPEG = join(FFBIN, 'ffmpeg.exe');
export const FFPROBE = join(FFBIN, 'ffprobe.exe');

/**
 * Die acht Zustaende.
 *
 * `zielhoehe` ist die Hoehe der Buehne in CSS-Punkten, auf die dieser Clip
 * gerechnet wird. Sie ergibt sich aus der geplanten Darstellung:
 * Buehne 320 Punkte hoch auf dem Desktop, 200 auf dem Telefon. Mit doppelter
 * Bildpunktdichte macht das 640 beziehungsweise 400 echte Punkte - deshalb
 * die zwei Groessen.
 */
export const ZUSTAENDE = [
  { id: 'idle', quelle: 'yumak_idle_v1', zweck: 'Standardzustand' },
  { id: 'wave', quelle: 'yumak_wave_v1', zweck: 'Begruessung beim ersten Erscheinen' },
  { id: 'curious', quelle: 'yumak_curious_v1', zweck: 'macht auf etwas aufmerksam' },
  { id: 'happy', quelle: 'yumak_happy_v1', zweck: 'freundliche Reaktion' },
  { id: 'reach', quelle: 'yumak_reach_v1', zweck: 'zeigt auf einen Bereich' },
  { id: 'box', quelle: 'yumak_box_v1', zweck: 'Yumaks Box' },
  { id: 'sleep', quelle: 'yumak_sleep_v1', zweck: 'laengerer Ruhezustand' },
  { id: 'walk-right', quelle: 'yumak_walk_right_v1', zweck: 'Ortswechsel in der Buehne' },
];

/** Vollstaendiger Pfad einer Quelldatei - mit der doppelten Endung. */
export function quellDatei(id) {
  const z = ZUSTAENDE.find((x) => x.id === id);
  if (!z) throw new Error(`Unbekannter Zustand: ${id}`);
  const doppelt = join(QUELLORDNER, `${z.quelle}.mp4.mp4`);
  const einfach = join(QUELLORDNER, `${z.quelle}.mp4`);
  if (existsSync(doppelt)) return doppelt;
  if (existsSync(einfach)) return einfach;
  return doppelt; // fuer die Fehlermeldung des Aufrufers
}
