// ═══════════════════════════════════════════════════════════════════════════
// Uebergaenge wave -> idle und curious -> idle pruefen
// ═══════════════════════════════════════════════════════════════════════════
//
// Gemessen wird im FERTIG ZUSAMMENGESETZTEN Bild der Buehne, also nach
// lighten, Bodenmaske und Ausrichtung - nicht in der Videodatei. Nur so
// zaehlt, was der Mensch sieht.
//
// Vier Groessen je Zustand:
//   Standlinie   unterste Bildzeile mit Figur. Sie darf zwischen den
//                Zustaenden nicht wandern, sonst huepft Yumak.
//   Mitte        waagerechte Mitte der Figur.
//   Hoehe        von der obersten Figurzeile bis zur Standlinie.
//   Farbton      mittleres Rot minus Blau ueber die Figur.
//
// Voraussetzung: 'npm run sichtprobe' laeuft auf Port 5203.

const { chromium } = await import(
  new URL('../fahrer/tests/node_modules/playwright/index.mjs', import.meta.url).href
);

const BASIS = process.env.SICHTPROBE || 'http://127.0.0.1:5203';
const ok = [], fehl = [];
const pruefe = (b, t) => { (b ? ok : fehl).push(t); console.log((b ? 'OK   ' : 'FEHL ') + t); };

const browser = await chromium.launch({ channel: 'chrome' });

/** Liest die Figur aus dem zusammengesetzten Buehnenbild. */
const AUSWERTEN = `async (d) => {
  const img = new Image();
  await new Promise((r) => { img.onload = r; img.src = 'data:image/png;base64,' + d; });
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const px = ctx.getImageData(0, 0, c.width, c.height).data;

  // Der Grund der Buehne ist dunkel und ruhig. Als Figur zaehlt, was deutlich
  // heller ist - gemessen liegt der Grund bei etwa 26 bis 43.
  const SCHWELLE = 62;
  let x0 = c.width, x1 = -1, y0 = c.height, y1 = -1, rb = 0, n = 0;
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      const i = (y * c.width + x) * 4;
      const R = px[i], G = px[i+1], B = px[i+2];
      if ((R + G + B) / 3 < SCHWELLE) continue;
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
      rb += R - B; n += 1;
    }
  }
  if (n === 0) return null;
  return {
    standlinie: Math.round((y1 / c.height) * 1000) / 10,
    mitte: Math.round(((x0 + x1) / 2 / c.width) * 1000) / 10,
    hoehe: Math.round(((y1 - y0) / c.height) * 1000) / 10,
    farbton: Math.round((rb / n) * 10) / 10,
    punkte: n,
  };
}`;

for (const [name, vp, mobil] of [
  ['desktop', { width: 1280, height: 900 }, false],
  ['mobil', { width: 390, height: 844 }, true],
]) {
  const ctx = await browser.newContext({ viewport: vp, isMobile: mobil, hasTouch: mobil, deviceScaleFactor: 2 });
  const s = await ctx.newPage();
  const harteFehler = [];
  s.on('pageerror', (e) => harteFehler.push(e.message));

  await s.goto(BASIS + '/yumak-rewards.html', { waitUntil: 'load' });
  await s.locator('.buehne').scrollIntoViewIfNeeded();
  await s.waitForTimeout(1200);

  async function lesen() {
    const buf = await s.locator('.buehne').screenshot();
    return s.evaluate(eval('(' + AUSWERTEN + ')'), buf.toString('base64'));
  }

  /** Zustand starten und mitten im Clip messen - nicht am Rand. */
  async function zustandMessen(id) {
    await s.locator(`[data-zustand="${id}"]`).click();
    await s.waitForTimeout(2200);
    return lesen();
  }

  const werte = {};
  for (const id of ['wave', 'curious', 'idle']) werte[id] = await zustandMessen(id);

  console.log(`\n── ${name} ──────────────────────────────────`);
  console.log('Zustand  | Standlinie | Mitte | Höhe  | Farbton R-B');
  for (const [id, w] of Object.entries(werte)) {
    console.log(`${id.padEnd(8)} |   ${String(w.standlinie).padStart(5)} %  | ${String(w.mitte).padStart(4)} % | ${String(w.hoehe).padStart(4)} % | ${String(w.farbton).padStart(5)}`);
  }

  for (const [von] of [['wave'], ['curious']]) {
    const a = werte[von], b = werte.idle;
    pruefe(Math.abs(a.standlinie - b.standlinie) <= 2.5,
      `${name} · ${von} → idle: Standlinie bleibt (${a.standlinie} % → ${b.standlinie} %)`);
    pruefe(Math.abs(a.mitte - b.mitte) <= 6,
      `${name} · ${von} → idle: Figur bleibt waagerecht an ihrem Platz (${a.mitte} % → ${b.mitte} %)`);
    pruefe(Math.abs(a.hoehe - b.hoehe) <= 12,
      `${name} · ${von} → idle: kein Groessensprung (${a.hoehe} % → ${b.hoehe} %)`);
    pruefe(Math.abs(a.farbton - b.farbton) <= 3,
      `${name} · ${von} → idle: kein Farbsprung (R-B ${a.farbton} → ${b.farbton})`);
  }

  // Der Uebergang selbst: waehrend der Blende darf die Figur nicht springen.
  await s.locator('[data-zustand="wave"]').click();
  await s.waitForTimeout(4700);          // kurz vor dem Ende von wave
  const vorWechsel = await lesen();
  await s.waitForTimeout(900);           // mitten in der Blende auf idle
  const imWechsel = await lesen();
  pruefe(imWechsel !== null && Math.abs(imWechsel.standlinie - vorWechsel.standlinie) <= 3,
    `${name} · während der Blende bleibt die Standlinie (${vorWechsel.standlinie} % → ${imWechsel?.standlinie} %)`);
  pruefe(imWechsel !== null && imWechsel.punkte > vorWechsel.punkte * 0.5,
    `${name} · die Figur verschwindet in der Blende nicht`);

  pruefe(harteFehler.length === 0, `${name}: keine Skriptfehler${harteFehler.length ? ' (' + harteFehler[0].slice(0, 100) + ')' : ''}`);
  await ctx.close();
}

await browser.close();
console.log(`\nbestanden: ${ok.length}   fehlgeschlagen: ${fehl.length}`);
if (fehl.length) { console.log('\n' + fehl.join('\n')); process.exitCode = 1; }
