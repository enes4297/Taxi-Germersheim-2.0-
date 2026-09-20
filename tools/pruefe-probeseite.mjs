// ═══════════════════════════════════════════════════════════════════════════
// Probeseite der Design-Grundlage im Browser
// ═══════════════════════════════════════════════════════════════════════════
//
// Geprueft wird, was man sonst nur behaupten koennte:
//   - Darstellung auf Desktop und Mobil
//   - die oertlichen Schriften sind wirklich geladen (nicht still auf die
//     Systemschrift zurueckgefallen)
//   - das bestaetigte Videoverhalten: einmal laufen, Pause, Schlussbild,
//     erneut ansehen
//   - reduzierte Bewegung: nichts startet von selbst, der Film wird nicht
//     geladen, "Abspielen" bleibt erreichbar
//   - auf Mobil haengt NUR die Mobilbuehne einen Film ein
//
// Das Filmende wird durch Vorspulen ausgeloest, nicht durch Abwarten - sonst
// dauerte jeder Lauf 23 Sekunden je Buehne.

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const { chromium } = await import(
  new URL('../fahrer/tests/node_modules/playwright/index.mjs', import.meta.url).href
);

const WURZEL = fileURLToPath(new URL('../dist-oeffentlich', import.meta.url));
const BELEGE = process.env.BELEGE_ORDNER || fileURLToPath(new URL('../.belege-astro', import.meta.url));
mkdirSync(BELEGE, { recursive: true });

const TYPEN = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.woff2': 'font/woff2', '.mp4': 'video/mp4',
  '.webm': 'video/webm', '.webmanifest': 'application/manifest+json',
};

// Der Server muss Bereichsanfragen beantworten, sonst spielt Chrome die
// Videodatei nicht ab.
const server = createServer(async (req, res) => {
  try {
    let p = join(WURZEL, decodeURIComponent(req.url.split('?')[0]));
    if ((await stat(p).catch(() => null))?.isDirectory()) p = join(p, 'index.html');
    const inhalt = await readFile(p);
    const typ = TYPEN[extname(p).toLowerCase()] || 'application/octet-stream';
    const bereich = req.headers.range?.match(/bytes=(\d+)-(\d*)/);
    if (bereich) {
      const von = Number(bereich[1]);
      const bis = bereich[2] ? Number(bereich[2]) : inhalt.length - 1;
      res.writeHead(206, {
        'content-type': typ,
        'content-range': `bytes ${von}-${bis}/${inhalt.length}`,
        'accept-ranges': 'bytes',
        'content-length': bis - von + 1,
      });
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
await new Promise((r) => server.listen(5212, '127.0.0.1', r));
const BASIS = 'http://127.0.0.1:5212';

const ok = [], fehl = [];
const pruefe = (b, t) => { (b ? ok : fehl).push(t); console.log((b ? 'OK   ' : 'FEHL ') + t); };

const browser = await chromium.launch({ channel: 'chrome' });

/** Liest den Zustand der sichtbaren Buehne aus dem DOM. */
const buehneLesen = () => `(() => {
  const buehnen = [...document.querySelectorAll('[data-hero-buehne]')];
  const sichtbar = buehnen.find((b) => b.getBoundingClientRect().width > 4);
  if (!sichtbar) return null;
  const v = sichtbar.querySelector('video');
  const s = sichtbar.querySelector('img[aria-hidden="true"]');
  const knopf = sichtbar.querySelector('[data-hero-knopftext]');
  const bedienung = sichtbar.querySelector('[data-hero-bedienung]');
  return {
    fuer: sichtbar.dataset.fuer,
    buehnenZahl: buehnen.length,
    videoZahl: document.querySelectorAll('[data-hero-buehne] video').length,
    hatVideo: Boolean(v),
    preload: v ? v.preload : null,
    laeuft: v ? !v.paused && !v.ended : null,
    beendet: v ? v.ended : null,
    dauer: v ? Math.round(v.duration) : null,
    videoDeckung: v ? Number(getComputedStyle(v).opacity) : null,
    schlussDeckung: s ? Number(getComputedStyle(s).opacity) : null,
    schlussVersatz: s ? getComputedStyle(s).transform : null,
    knopftext: knopf ? knopf.textContent.trim() : null,
    bedienungSichtbar: bedienung ? !bedienung.hidden : null,
  };
})()`;

// ══ 1. Desktop und Mobil, Darstellung und Videoverhalten ══════════════════
for (const [name, vp, mobil] of [
  ['desktop', { width: 1440, height: 900 }, false],
  ['mobil', { width: 390, height: 844 }, true],
]) {
  const ctx = await browser.newContext({ viewport: vp, isMobile: mobil, hasTouch: mobil, deviceScaleFactor: 1 });
  const s = await ctx.newPage();
  const fehler = [];
  const vermisst = [];
  s.on('pageerror', (e) => fehler.push('pageerror: ' + e.message));
  s.on('console', (m) => { if (m.type() === 'error') fehler.push(m.text()); });
  s.on('response', (r) => {
    const pfad = new URL(r.url()).pathname;
    if (r.status() === 404 && pfad !== '/favicon.ico') vermisst.push(pfad);
  });

  const antwort = await s.goto(BASIS + '/probe.html', { waitUntil: 'load' });
  pruefe(antwort?.status() === 200, `${name}: Probeseite wird ausgeliefert (${antwort?.status()})`);

  // Schriften: geladen heisst geladen, nicht "steht im CSS".
  const schriften = await s.evaluate(async () => {
    await document.fonts.ready;
    return {
      outfit: document.fonts.check('600 16px Outfit'),
      lora: document.fonts.check('400 16px Lora'),
      familie: getComputedStyle(document.body).fontFamily,
    };
  });
  pruefe(schriften.outfit && schriften.lora, `${name}: Outfit und Lora sind geladen (${schriften.familie.split(',')[0]})`);

  // Der Film haengt sich erst nach "load" plus Leerlauf ein.
  await s.waitForFunction(() => document.querySelector('[data-hero-buehne] video'), null, { timeout: 12000 });
  await s.waitForTimeout(1800);

  let z = await s.evaluate(buehneLesen());
  pruefe(z?.fuer === (mobil ? 'mobil' : 'desktop'), `${name}: die passende Buehne ist sichtbar (${z?.fuer})`);
  pruefe(z?.buehnenZahl === 2, `${name}: beide Buehnen stehen im Markup (${z?.buehnenZahl})`);
  // Der entscheidende Punkt fuer die Bandbreite: nur EIN Film im Dokument.
  pruefe(z?.videoZahl === 1, `${name}: nur die sichtbare Buehne haengt einen Film ein (${z?.videoZahl})`);
  pruefe(z?.laeuft === true, `${name}: der Film laeuft von selbst an`);
  pruefe(z?.knopftext === 'Pause', `${name}: die Bedienung bietet „Pause" (${z?.knopftext})`);

  await s.screenshot({ path: `${BELEGE}/probe-${name}-oben.png` });

  // ── Pause ───────────────────────────────────────────────────────────────
  await s.locator('[data-hero-buehne]:visible [data-hero-knopf]').first().click();
  await s.waitForTimeout(400);
  z = await s.evaluate(buehneLesen());
  pruefe(z?.laeuft === false && z?.knopftext === 'Abspielen',
    `${name}: Pause haelt den Film an und bietet „Abspielen" (${z?.knopftext})`);

  // ── Schlussbild ─────────────────────────────────────────────────────────
  // Vorspulen statt abwarten. Das Ereignis "ended" ist dasselbe.
  await s.evaluate(() => {
    const v = document.querySelector('[data-hero-buehne] video');
    v.currentTime = Math.max(0, v.duration - 0.25);
    v.play();
  });
  await s.waitForFunction(() => {
    const v = document.querySelector('[data-hero-buehne] video');
    return v && v.ended;
  }, null, { timeout: 10000 });
  await s.waitForTimeout(1600);

  z = await s.evaluate(buehneLesen());
  pruefe(z?.schlussDeckung === 1, `${name}: das Schlussbild steht (Deckung ${z?.schlussDeckung})`);
  pruefe(z?.videoDeckung === 0, `${name}: der Film ist ausgeblendet - kein zweites Logo (Deckung ${z?.videoDeckung})`);
  pruefe(z?.knopftext === 'Erneut ansehen', `${name}: die Bedienung bietet „Erneut ansehen" (${z?.knopftext})`);

  // Auf dem Desktop rueckt das Logo nach rechts, auf Mobil bleibt es mittig.
  const gerueckt = z?.schlussVersatz && z.schlussVersatz !== 'none';
  pruefe(mobil ? !gerueckt : gerueckt,
    `${name}: Logo ${mobil ? 'bleibt mittig' : 'rueckt in die freie Flaeche'} (${z?.schlussVersatz?.slice(0, 40)})`);

  await s.screenshot({ path: `${BELEGE}/probe-${name}-schlussbild.png` });

  // ── Erneut ansehen ──────────────────────────────────────────────────────
  await s.locator('[data-hero-buehne]:visible [data-hero-knopf]').first().click();
  await s.waitForTimeout(900);
  z = await s.evaluate(buehneLesen());
  pruefe(z?.laeuft === true && z?.beendet === false, `${name}: „Erneut ansehen" startet den Film wieder`);

  // ── Ganze Seite ─────────────────────────────────────────────────────────
  await s.evaluate(async () => {
    const h = document.body.scrollHeight;
    for (let y = 0; y < h; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); }
  });
  await s.waitForTimeout(800);

  // Die Enthuellung darf nichts dauerhaft unsichtbar lassen.
  const versteckt = await s.evaluate(() =>
    [...document.querySelectorAll('[data-enthuellen-ziel]')]
      .filter((e) => Number(getComputedStyle(e).opacity) < 0.9).length,
  );
  pruefe(versteckt === 0, `${name}: nach dem Durchlauf ist kein Block unsichtbar geblieben (${versteckt})`);

  await s.screenshot({ path: `${BELEGE}/probe-${name}-ganz.png`, fullPage: true });

  pruefe(vermisst.length === 0, `${name}: keine fehlenden Dateien${vermisst.length ? ' (' + vermisst.slice(0, 4).join(', ') + ')' : ''}`);
  const hart = fehler.filter((f) => f.startsWith('pageerror:'));
  pruefe(hart.length === 0, `${name}: keine Skriptfehler${hart.length ? ' (' + hart[0].slice(0, 120) + ')' : ''}`);

  await ctx.close();
}

// ══ 2. Reduzierte Bewegung ════════════════════════════════════════════════
{
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
  });
  const s = await ctx.newPage();
  await s.goto(BASIS + '/probe.html', { waitUntil: 'load' });
  await s.waitForTimeout(2500);

  const z = await s.evaluate(buehneLesen());
  pruefe(z?.hatVideo === true, 'reduzierte Bewegung: der Film ist erreichbar, aber nicht gestartet');
  pruefe(z?.preload === 'none', `reduzierte Bewegung: preload="none" - es werden keine Daten geladen (${z?.preload})`);
  pruefe(z?.laeuft === false, 'reduzierte Bewegung: nichts laeuft von selbst an');
  pruefe(z?.knopftext === 'Abspielen', `reduzierte Bewegung: „Abspielen" wird angeboten (${z?.knopftext})`);

  const sichtbar = await s.evaluate(() =>
    [...document.querySelectorAll('[data-enthuellen-ziel]')]
      .every((e) => Number(getComputedStyle(e).opacity) === 1),
  );
  pruefe(sichtbar, 'reduzierte Bewegung: alle Bloecke sind sofort sichtbar');

  await s.screenshot({ path: `${BELEGE}/probe-reduzierte-bewegung.png` });
  await ctx.close();
}

await browser.close();
server.close();
console.log(`\nbestanden: ${ok.length}   fehlgeschlagen: ${fehl.length}`);
if (fehl.length) { console.log('\n' + fehl.join('\n')); process.exitCode = 1; }
