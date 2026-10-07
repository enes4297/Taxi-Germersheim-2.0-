// ═══════════════════════════════════════════════════════════════════════════
// Neue Startseite gegen die freigegebene Vorschau
// ═══════════════════════════════════════════════════════════════════════════
//
// Beide Seiten werden unter denselben Bedingungen aufgenommen: gleiche
// Breite, gleiche Wartezeiten, Film in beiden Faellen bis zum Schlussbild
// vorgespult, damit nicht ein laufendes Bild gegen ein anderes verglichen
// wird.
//
// Das Ergebnis sind Aufnahmen zum Ansehen - KEINE automatische Freigabe. Ob
// die Gestaltung uebereinstimmt, entscheidet der Mensch am Bild.
//
// Aufruf:  VORSCHAU_ORDNER=... node tools/vergleiche-mit-vorschau.mjs

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const { chromium } = await import(
  new URL('../fahrer/tests/node_modules/playwright/index.mjs', import.meta.url).href
);

const NEU = fileURLToPath(new URL('../dist-oeffentlich', import.meta.url));
const VORSCHAU = process.env.VORSCHAU_ORDNER;
const BELEGE = process.env.BELEGE_ORDNER || fileURLToPath(new URL('../.belege-astro/vergleich', import.meta.url));
mkdirSync(BELEGE, { recursive: true });

if (!VORSCHAU || !existsSync(join(VORSCHAU, 'dist', 'index.html'))) {
  console.error('VORSCHAU_ORDNER fehlt oder enthaelt kein gebautes dist/. Abbruch.');
  process.exit(1);
}

const TYPEN = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.webm': 'video/webm',
};

function serverFuer(wurzel, port, spa) {
  const s = createServer(async (req, res) => {
    try {
      let p = join(wurzel, decodeURIComponent(req.url.split('?')[0]));
      if ((await stat(p).catch(() => null))?.isDirectory()) p = join(p, 'index.html');
      let inhalt;
      try {
        inhalt = await readFile(p);
      } catch (e) {
        // Die Vorschau ist eine Einzelseitenanwendung: unbekannte Pfade
        // liefern index.html.
        if (!spa) throw e;
        p = join(wurzel, 'index.html');
        inhalt = await readFile(p);
      }
      const typ = TYPEN[extname(p).toLowerCase()] || 'application/octet-stream';
      const bereich = req.headers.range?.match(/bytes=(\d+)-(\d*)/);
      if (bereich) {
        const von = Number(bereich[1]);
        const bis = bereich[2] ? Number(bereich[2]) : inhalt.length - 1;
        res.writeHead(206, { 'content-type': typ, 'content-range': `bytes ${von}-${bis}/${inhalt.length}`, 'accept-ranges': 'bytes', 'content-length': bis - von + 1 });
        res.end(inhalt.subarray(von, bis + 1));
        return;
      }
      res.writeHead(200, { 'content-type': typ, 'accept-ranges': 'bytes' });
      res.end(inhalt);
    } catch {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('nicht gefunden');
    }
  });
  return new Promise((r) => s.listen(port, '127.0.0.1', () => r(s)));
}

const sNeu = await serverFuer(NEU, 5216, false);
const sAlt = await serverFuer(join(VORSCHAU, 'dist'), 5217, true);

const browser = await chromium.launch({ channel: 'chrome' });

for (const [name, vp, mobil] of [
  ['desktop', { width: 1440, height: 900 }, false],
  ['mobil', { width: 390, height: 844 }, true],
]) {
  for (const [fassung, basis] of [['neu', 'http://127.0.0.1:5216'], ['vorschau', 'http://127.0.0.1:5217']]) {
    const ctx = await browser.newContext({ viewport: vp, isMobile: mobil, hasTouch: mobil, deviceScaleFactor: 1 });
    const s = await ctx.newPage();
    await s.goto(basis + '/', { waitUntil: 'load' });

    // Film bis zum Schlussbild vorspulen, damit beide Aufnahmen denselben
    // Zustand zeigen.
    await s.waitForFunction(() => document.querySelector('video'), null, { timeout: 15000 }).catch(() => {});
    await s.waitForTimeout(2000);
    await s.evaluate(() => {
      const v = document.querySelector('video');
      if (v && Number.isFinite(v.duration)) { v.currentTime = Math.max(0, v.duration - 0.2); v.play(); }
    });
    await s.waitForTimeout(2600);

    await s.screenshot({ path: `${BELEGE}/${name}-${fassung}-hero.png` });

    // Ganze Seite: erst durchlaufen, damit alles enthuellt und geladen ist.
    await s.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 400) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 110));
      }
      window.scrollTo(0, document.body.scrollHeight);
      await new Promise((r) => setTimeout(r, 600));
      window.scrollTo(0, 0);
    });
    await s.waitForTimeout(900);
    await s.screenshot({ path: `${BELEGE}/${name}-${fassung}-ganz.png`, fullPage: true });

    const masse = await s.evaluate(() => ({
      hoehe: document.body.scrollHeight,
      abschnitte: [...document.querySelectorAll('section[id]')].map((e) => e.id),
    }));
    console.log(`${name} · ${fassung}: Seitenhoehe ${masse.hoehe} px, Abschnitte: ${masse.abschnitte.join(', ')}`);

    await ctx.close();
  }
}

await browser.close();
sNeu.close();
sAlt.close();
console.log(`\nAufnahmen liegen in ${BELEGE}`);
