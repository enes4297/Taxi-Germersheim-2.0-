// ═══════════════════════════════════════════════════════════════════════════
// Vorschaubilder AUS DEN ECHTEN SPIELEN erzeugen
// ═══════════════════════════════════════════════════════════════════════════
//
// Die Startseite zeigte fuer Gluecksrad und Taxi Rush nachgezeichnete
// Motive: ein Rad aus Farbverlaeufen mit einem "Y" in der Nabe und eine
// abstrakte Strassenszene. Beides sah dem, was in der Spielewelt wirklich
// steht, nicht mehr aehnlich.
//
// Dieses Werkzeug nimmt die Bilder dort auf, wo sie herkommen: in der
// gebauten Spielewelt, im echten Browser. Kein fremdes Motiv, keine
// Handzeichnung - und bei jeder Aenderung am Spiel neu erzeugbar.
//
// ───────────────────────────────────────────────────────────────────────────
// WARUM NICHT IM BUILD
// ───────────────────────────────────────────────────────────────────────────
//
// Dafuer braeuchte der Build einen Browser. Die Bilder aendern sich nur,
// wenn sich die Spiele aendern; sie liegen deshalb als Datei im Projekt und
// werden bei Bedarf neu erzeugt:
//
//     npm run build            (die Spielewelt muss gebaut sein)
//     npm run spielbilder
//
// ───────────────────────────────────────────────────────────────────────────
// WAS AUFGENOMMEN WIRD
// ───────────────────────────────────────────────────────────────────────────
//
//   gluecksrad-vorschau.webp   das Rad, wie es in der Spielewelt steht:
//                              Goldring, Zeiger, Nabe mit dem Bildzeichen
//                              ohne Schriftzug. KEIN Dreh wird ausgeloest -
//                              das Rad steht still, wie es fuer Kunden
//                              ohnehin gesperrt ist.
//
//   taxi-rush-vorschau.webp    eine Spielszene: Taxi, Strasse, Haeuser,
//                              Gegenverkehr. Aufgenommen nach ein paar
//                              Sekunden Fahrt, damit die Strasse belebt ist.
//
// Beide als WebP - ein Foto-PNG waere um ein Vielfaches groesser.

import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const WURZEL = fileURLToPath(new URL('..', import.meta.url));
const AUSGABE = join(WURZEL, 'dist-oeffentlich');
const ZIEL = join(WURZEL, 'public', 'assets', 'spielewelt');
// Die PNG-Aufnahmen sind Zwischenstand. Sie duerfen NICHT in public/
// liegen - alles dort wird ausgeliefert, und ein Foto-PNG ist ein
// Vielfaches der WebP-Datei.
const ZWISCHEN = join(tmpdir(), 'tg-spielbilder');
const PORT = 5341;
const ADRESSE = `http://127.0.0.1:${PORT}`;

if (!existsSync(AUSGABE)) {
  console.error('Der Ausgabeordner fehlt. Zuerst "npm run build" ausfuehren.');
  process.exit(1);
}
await mkdir(ZIEL, { recursive: true });
await mkdir(ZWISCHEN, { recursive: true });

const { chromium } = await import(
  new URL('../fahrer/tests/node_modules/playwright/index.mjs', import.meta.url).href
);

const TYP = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.mp4': 'video/mp4', '.webm': 'video/webm',
};
const server = createServer(async (req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  try {
    const b = await readFile(join(AUSGABE, p));
    res.writeHead(200, { 'Content-Type': TYP[extname(p).toLowerCase()] || 'application/octet-stream' });
    return res.end(b);
  } catch { res.writeHead(404); res.end('nicht gefunden'); }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

const browser = await chromium.launch({ channel: 'chrome' });

/** Aufgenommen wird gross; die Karte zeigt es spaeter kleiner. */
const BREITE = 1200;

// ── 1. Das Gluecksrad ──────────────────────────────────────────────────────
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
  // Kein Netz nach aussen: Die Rewards-Abfrage soll nicht einmal versucht
  // werden. Das Rad steht dann im Zustand "nicht angemeldet" - genau dem,
  // den ein Besucher der Startseite kennt.
  await page.route('**://**', (r) => (r.request().url().startsWith(ADRESSE) ? r.continue() : r.abort()));
  await page.goto(`${ADRESSE}/spiele.html`, { waitUntil: 'load' });
  await page.waitForTimeout(1800);

  const rad = await page.$('.gw-wheel-shell');
  if (!rad) throw new Error('spielbilder: .gw-wheel-shell nicht gefunden');
  await rad.scrollIntoViewIfNeeded();
  await page.waitForTimeout(700);

  /*
    Etwas Luft rundherum mitnehmen.

    Eine Aufnahme genau auf den Kasten des Rades schneidet die Spitze des
    Zeigers ab - sie steht oben ueber den Ring hinaus. Deshalb wird ein
    quadratischer Ausschnitt mit 5 Prozent Rand genommen. Quadratisch,
    damit das Rad rund bleibt.
  */
  const k = await rad.boundingBox();
  const seite = Math.max(k.width, k.height);
  const rand = Math.round(seite * 0.05);
  const kante = Math.round(seite) + 2 * rand;
  await page.screenshot({
    path: join(ZWISCHEN, 'gluecksrad-vorschau.png'),
    clip: {
      x: Math.round(k.x + k.width / 2 - kante / 2),
      y: Math.round(k.y + k.height / 2 - kante / 2),
      width: kante,
      height: kante,
    },
  });
  await page.close();
  console.log('Glücksrad aufgenommen.');
}

// ── 2. Taxi Rush ───────────────────────────────────────────────────────────
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
  await page.route('**://**', (r) => (r.request().url().startsWith(ADRESSE) ? r.continue() : r.abort()));
  await page.goto(`${ADRESSE}/spiele.html`, { waitUntil: 'load' });
  await page.waitForTimeout(1500);

  await page.evaluate(() => document.querySelector('.tr-app').scrollIntoView({ block: 'start' }));
  // Warten, bis die Seite steht - sie scrollt weich.
  let letzte = -1;
  let ruhig = 0;
  for (let i = 0; i < 60; i += 1) {
    const jetzt = await page.evaluate(() => Math.round(scrollY));
    ruhig = jetzt === letzte ? ruhig + 1 : 0;
    if (ruhig >= 3) break;
    letzte = jetzt;
    await page.waitForTimeout(100);
  }

  await page.locator('[data-tr="start"]').click();
  // Ein paar Sekunden fahren, damit Haeuser, Gegenverkehr und die goldene
  // Abholzone im Bild sind. Kurz genug, dass das Taxi noch weit vorn steht.
  await page.waitForTimeout(3200);

  const feld = await page.$('[data-tr="canvas"]');
  if (!feld) throw new Error('spielbilder: Spielfeld nicht gefunden');

  /*
    Mittig auf 4:3 zuschneiden - dasselbe Seitenverhaeltnis wie die Karte
    auf der Startseite.

    Das Spielfeld ist rund 1206 x 719 breit; in eine 4:3-Karte gelegt
    wuerde der Browser die Raender wegschneiden und das Taxi kleiner
    zeigen. Wird gleich richtig aufgenommen, bleibt das Taxi gross - und
    auf dem Handy erkennbar. Die Strasse mit dem Taxi liegt in der Mitte,
    also wird mittig geschnitten.
  */
  const k = await feld.boundingBox();
  /*
    Die oberste Zeile des Spielfelds wird weggelassen. Dort steht die
    Anzeige mit Abholort und Ziel - in der Karte auf der Startseite liegt
    genau darueber die Marke "Sofort spielbar" und schneidet sie an. Ein
    halb verdeckter Text sieht nach Fehler aus. Das Taxi bleibt dabei gut
    in der Mitte.
  */
  const oben = Math.round(k.height * 0.24);
  const hoehe = Math.round(k.height) - oben;
  const breite = Math.round((hoehe * 4) / 3);
  const links = Math.round(k.x + (k.width - breite) / 2);
  await page.screenshot({
    path: join(ZWISCHEN, 'taxi-rush-vorschau.png'),
    clip: { x: links, y: Math.round(k.y) + oben, width: breite, height: hoehe },
  });
  await page.close();
  console.log('Taxi Rush aufgenommen.');
}

await browser.close();
server.close();

// ── 3. Nach WebP umrechnen ─────────────────────────────────────────────────
//
// ffmpeg liegt portabel im Benutzerordner - dieselbe Fassung, mit der in
// Schritt 024 die Hintergrundbilder umgerechnet wurden.
const FFMPEG = join(process.env.USERPROFILE || '', 'ffmpeg-tg', 'ffmpeg-9.0.1-essentials_build', 'bin', 'ffmpeg.exe');
if (!existsSync(FFMPEG)) {
  console.error(`ffmpeg nicht gefunden: ${FFMPEG}`);
  console.error('Die PNG-Aufnahmen liegen in public/assets/spielewelt/ und muessen noch umgerechnet werden.');
  process.exit(1);
}

for (const [name, breite] of [['gluecksrad-vorschau', 900], ['taxi-rush-vorschau', BREITE]]) {
  const png = join(ZWISCHEN, `${name}.png`);
  const webp = join(ZIEL, `${name}.webp`);
  const r = spawnSync(FFMPEG, [
    '-y', '-v', 'error', '-i', png,
    '-vf', `scale=${breite}:-2:flags=lanczos`,
    '-c:v', 'libwebp', '-quality', '86', '-compression_level', '6',
    webp,
  ], { encoding: 'utf8' });
  if (r.status !== 0) {
    console.error(`ffmpeg schlug fehl fuer ${name}:`, r.stderr);
    process.exit(1);
  }
  const vorher = Math.round(statSync(png).size / 1024);
  const nachher = Math.round(statSync(webp).size / 1024);
  console.log(`${name}.webp  ${nachher} KB  (PNG-Aufnahme ${vorher} KB)`);
}

console.log('\nFertig. Die PNG-Aufnahmen bleiben als Zwischenstand liegen und');
console.log('werden nicht ausgeliefert - public/ nimmt nur die .webp mit.');
