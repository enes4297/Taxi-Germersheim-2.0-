// ═══════════════════════════════════════════════════════════════════════════
// Die Startseite im Browser — Desktop und Mobil
// ═══════════════════════════════════════════════════════════════════════════
//
// Geprueft wird, was man sonst nur behaupten koennte:
//   - Navigation und alle verlinkten Ziele
//   - alle SIEBEN Anfrageknoepfe: Dialog sichtbar, richtige Leistung sofort
//     sichtbar, eingegebene Adressen erhalten, kein Sprung durch die Seite
//   - die WhatsApp-Nachricht traegt alle erfassten Angaben
//   - Videoverhalten: einmal laufen, Pause, Schlussbild, erneut ansehen
//   - die Einstiege ?page=booking, ?page=rewards, ?page=help-public
//
// WICHTIG ZUR AUSSAGEKRAFT: Es wird KEINE Nachricht versendet. window.open
// wird abgefangen; die Adresse wird nur gelesen. Es wird nichts angerufen und
// nichts abgeschickt.
//
// Und: Alles wird auf `[role="dialog"]` eingegrenzt und zusaetzlich die
// tatsaechliche Deckung und Lage im Bild gemessen. Eine Pruefung, die nur auf
// `:visible` baut, hat hier schon einmal Erfolg gemeldet, wo der Mensch
// nichts sah.

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

const ABHOLUNG = 'Friedrich-Ebert-Straße 8, Germersheim';
const FAHRZIEL = 'Klinikum Landau, Landau';

/** Knopfbeschriftung → erwartete Leistung in Dialog und Zusammenfassung. */
const FAELLE = [
  ['Taxifahrt anfragen', 'Taxi', 'Taxi'],
  ['Krankenfahrt anfragen', 'Krankenfahrten', 'Krankenfahrten'],
  ['Rollstuhlfahrt anfragen', 'Rollstuhlfahrten', 'Rollstuhlfahrten'],
  ['Schülerfahrt anfragen', 'Schülerfahrten', 'Schuelerfahrten'],
  ['Transfer anfragen', 'Flughafentransfer', 'Flughafentransfer'],
  ['Fahrt anfragen', 'Fern- und Gruppenfahrten', 'Ferngruppenfahrten'],
  ['Kurierfahrt anfragen', 'Kurierfahrten', 'Kurierfahrten'],
];

const TYPEN = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.woff2': 'font/woff2', '.mp4': 'video/mp4',
  '.webm': 'video/webm', '.webmanifest': 'application/manifest+json',
};

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
await new Promise((r) => server.listen(5213, '127.0.0.1', r));
const BASIS = 'http://127.0.0.1:5213';

const ok = [], fehl = [];
const pruefe = (b, t) => { (b ? ok : fehl).push(t); console.log((b ? 'OK   ' : 'FEHL ') + t); };

const browser = await chromium.launch({ channel: 'chrome' });

/** Nichts verlassen die Seite: window.open wird abgefangen und nur notiert. */
const OPEN_ABFANGEN = `window.__geoeffnet = [];
  window.open = (u) => { window.__geoeffnet.push(String(u)); return null; };`;

for (const [name, vp, mobil] of [
  ['desktop', { width: 1440, height: 900 }, false],
  ['mobil', { width: 390, height: 844 }, true],
]) {
  const ctx = await browser.newContext({ viewport: vp, isMobile: mobil, hasTouch: mobil, deviceScaleFactor: 1 });
  await ctx.addInitScript(OPEN_ABFANGEN);
  const s = await ctx.newPage();
  const fehler = [], vermisst = [];
  s.on('pageerror', (e) => fehler.push('pageerror: ' + e.message));
  s.on('console', (m) => { if (m.type() === 'error') fehler.push(m.text()); });
  s.on('response', (r) => {
    const pfad = new URL(r.url()).pathname;
    if (r.status() === 404 && pfad !== '/favicon.ico') vermisst.push(pfad);
  });

  const antwort = await s.goto(BASIS + '/', { waitUntil: 'load' });
  pruefe(antwort?.status() === 200, `${name}: Startseite wird ausgeliefert (${antwort?.status()})`);

  // ── Navigation: jedes Ziel muss existieren ────────────────────────────
  const ziele = await s.evaluate(() =>
    [...document.querySelectorAll('header a[href], footer a[href]')]
      .map((a) => a.getAttribute('href'))
      .filter((h) => h && !h.startsWith('#') && !h.startsWith('tel:') && !h.startsWith('mailto:') && !h.startsWith('http')),
  );
  let tot = [];
  for (const z of [...new Set(ziele)]) {
    const r = await s.request.get(BASIS + '/' + z);
    if (!r.ok()) tot.push(z);
  }
  pruefe(tot.length === 0, `${name}: alle ${new Set(ziele).size} verlinkten Unterseiten sind erreichbar${tot.length ? ' (tot: ' + tot.join(', ') + ')' : ''}`);

  // ── Videoverhalten ────────────────────────────────────────────────────
  await s.waitForFunction(() => document.querySelector('[data-hero-buehne] video'), null, { timeout: 12000 });
  await s.waitForTimeout(1600);
  const lesen = `(() => {
    const b = [...document.querySelectorAll('[data-hero-buehne]')].find((x) => x.getBoundingClientRect().width > 4);
    const v = b && b.querySelector('video');
    const sb = b && b.querySelector('img[aria-hidden="true"]');
    return {
      fuer: b && b.dataset.fuer,
      videoZahl: document.querySelectorAll('[data-hero-buehne] video').length,
      laeuft: v ? !v.paused && !v.ended : null,
      videoDeckung: v ? Number(getComputedStyle(v).opacity) : null,
      schlussDeckung: sb ? Number(getComputedStyle(sb).opacity) : null,
      versatz: sb ? getComputedStyle(sb).transform : null,
      knopf: b && b.querySelector('[data-hero-knopftext]') ? b.querySelector('[data-hero-knopftext]').textContent.trim() : null,
    };
  })()`;
  let z = await s.evaluate(lesen);
  pruefe(z?.fuer === (mobil ? 'mobil' : 'desktop'), `${name}: die passende Hero-Buehne ist sichtbar (${z?.fuer})`);
  pruefe(z?.videoZahl === 1, `${name}: nur die sichtbare Buehne haengt einen Film ein (${z?.videoZahl})`);
  pruefe(z?.laeuft === true, `${name}: der Film laeuft von selbst an`);

  await s.screenshot({ path: `${BELEGE}/start-${name}-hero.png` });

  await s.locator('[data-hero-buehne]:visible [data-hero-knopf]').first().click();
  await s.waitForTimeout(400);
  z = await s.evaluate(lesen);
  pruefe(z?.laeuft === false && z?.knopf === 'Abspielen', `${name}: Pause haelt den Film an (${z?.knopf})`);

  await s.evaluate(() => {
    const v = document.querySelector('[data-hero-buehne] video');
    v.currentTime = Math.max(0, v.duration - 0.25);
    v.play();
  });
  await s.waitForFunction(() => document.querySelector('[data-hero-buehne] video')?.ended, null, { timeout: 10000 });
  await s.waitForTimeout(1500);
  z = await s.evaluate(lesen);
  pruefe(z?.schlussDeckung === 1 && z?.videoDeckung === 0, `${name}: Schlussbild steht, Film ausgeblendet - kein zweites Logo`);
  pruefe(z?.knopf === 'Erneut ansehen', `${name}: „Erneut ansehen" wird angeboten (${z?.knopf})`);
  const gerueckt = z?.versatz && z.versatz !== 'none';
  pruefe(mobil ? !gerueckt : gerueckt, `${name}: Logo ${mobil ? 'bleibt mittig' : 'rueckt in die freie Flaeche'}`);
  await s.screenshot({ path: `${BELEGE}/start-${name}-schlussbild.png` });

  await s.locator('[data-hero-buehne]:visible [data-hero-knopf]').first().click();
  await s.waitForTimeout(700);
  pruefe((await s.evaluate(lesen))?.laeuft === true, `${name}: „Erneut ansehen" startet den Film wieder`);

  // ── Adressen EINMAL oben eintragen ────────────────────────────────────
  const anhang = mobil ? '-mobil' : '';
  await s.locator(`input#schnell-pickup${anhang}`).fill(ABHOLUNG);
  await s.locator(`input#schnell-destination${anhang}`).fill(FAHRZIEL);

  // Die Marken neben den Feldern muessen den Stand zeigen.
  const marken = await s.evaluate(() =>
    [...document.querySelectorAll('[data-feldmarke]')].map((e) => e.textContent.trim()),
  );
  pruefe(marken.every((m) => m.startsWith('✓')), `${name}: beide Felder melden „ausgefüllt" (${[...new Set(marken)].join(' / ')})`);

  // Ganze Seite einmal durchlaufen, damit alles enthuellt und geladen ist.
  await s.evaluate(async () => {
    // Die Hoehe bei JEDEM Schritt neu lesen: Waehrend Bilder nachladen,
    // waechst die Seite. Mit einem einmal gemessenen Wert endet der Durchlauf
    // zu frueh, und die unteren Bloecke bleiben unenthuellt - das sah wie ein
    // Seitenfehler aus, war aber ein Fehler der Pruefung.
    for (let y = 0; y < document.body.scrollHeight; y += 400) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 110));
    }
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise((r) => setTimeout(r, 500));
    window.scrollTo(0, 0);
  });
  await s.waitForTimeout(900);

  const versteckt = await s.evaluate(() =>
    [...document.querySelectorAll('[data-enthuellen-ziel]')].filter((e) => Number(getComputedStyle(e).opacity) < 0.9).length,
  );
  pruefe(versteckt === 0, `${name}: kein Block ist unsichtbar geblieben (${versteckt})`);

  await s.screenshot({ path: `${BELEGE}/start-${name}-ganz.png`, fullPage: true });

  // ── Die sieben Anfrageknoepfe ─────────────────────────────────────────
  const dlg = s.locator('[role="dialog"]');

  for (const [knopf, leistung, kennung] of FAELLE) {
    // Ueber das Merkmal ansprechen, nicht ueber den Text: Im Markup stehen
    // Zeilenumbrueche um die Beschriftung, ein verankerter Textvergleich
    // greift dadurch nicht. Dass die Beschriftung stimmt, wird gleich
    // daneben eigens geprueft.
    const b2 = s.locator(`#leistungen [data-anfrage-oeffnen][data-leistung="${kennung}"]`).first();
    pruefe((await b2.innerText()).trim() === knopf, `${name} · ${knopf}: der Knopf traegt seine Beschriftung`);

    // Mittig ins Bild holen, BEVOR gemessen wird: sonst zaehlt Playwrights
    // eigenes Heranscrollen beim Klick als Seitensprung.
    // Erst warten, bis die Seite still steht. Solange noch ein Bild nachlaedt,
    // waechst sie unter dem Knopf weg; Playwright scrollt ihn beim Klick dann
    // erneut heran, und genau das sah wie ein Seitensprung aus. Gemessen:
    // drei angebliche Spruenge von rund 480 Punkten, alle nur dadurch.
    await s.waitForFunction(() => {
      const bilder = [...document.images].every((i) => i.complete);
      const h = document.body.scrollHeight;
      const gleich = window.__hoehe === h;
      window.__hoehe = h;
      return bilder && gleich;
    }, null, { timeout: 15000, polling: 250 });

    await b2.evaluate((el) => el.scrollIntoView({ block: 'center' }));

    // Warten, bis der Knopf wirklich stillsteht: Nach dem Heranscrollen
    // laeuft noch die Enthuellung des Blocks, und auf Mobil bewegte sich der
    // Knopf dadurch bis zu 96 Punkte weiter. Zwei gleiche Messungen
    // hintereinander heissen: es bewegt sich nichts mehr.
    let knopfVor = -1;
    for (let i = 0; i < 40; i += 1) {
      const jetzt = await b2.evaluate((el) => Math.round(el.getBoundingClientRect().top));
      if (jetzt === knopfVor) break;
      knopfVor = jetzt;
      await s.waitForTimeout(250);
    }
    const vorY = await s.evaluate(() => Math.round(window.scrollY));

    await b2.click();
    await s.waitForTimeout(800);

    // Waehrend der Dialog offen ist, wird die Seite mit `position: fixed`
    // festgehalten - `window.scrollY` ist dann naturgemaess 0 und taugt hier
    // nicht als Mass. Gemessen wird, was den Menschen betrifft: Der
    // angeklickte Knopf muss hinter dem Dialog dort bleiben, wo er war.
    const knopfNach = await b2.evaluate((el) => Math.round(el.getBoundingClientRect().top));
    pruefe(Math.abs(knopfNach - knopfVor) <= 8,
      `${name} · ${knopf}: die Seite bleibt hinter dem Dialog stehen (Knopf ${knopfVor} → ${knopfNach} px)`);

    // Wirklich sichtbar, im Dialog, im Bild.
    const sicht = await s.evaluate(() => {
      const d = document.querySelector('[role="dialog"]');
      if (!d || d.hidden) return false;
      let o = 1, e = d;
      while (e && e !== document.body) { o *= Number(getComputedStyle(e).opacity); e = e.parentElement; }
      const f = d.querySelector('#dlg-pickup');
      if (!f || o < 0.9) return false;
      const r = f.getBoundingClientRect();
      return r.width > 4 && r.top > -5 && r.bottom < window.innerHeight + 5;
    });
    pruefe(sicht, `${name} · ${knopf}: Anfrageformular sichtbar im Bild`);

    // Gewaehlte Leistung sofort sichtbar, schon auf Schritt 1.
    const sofort = await s.evaluate(() => {
      const el = document.querySelector('[data-gewaehlte-leistung]');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { text: el.innerText.replace(/\s+/g, ' ').trim(), imBild: r.top > -5 && r.bottom < window.innerHeight + 5 && r.width > 4 };
    });
    pruefe(Boolean(sofort?.text.includes(leistung)) && sofort?.imBild === true,
      `${name} · ${knopf}: „${leistung}" steht sofort im Formular (${sofort?.text ?? 'nicht gefunden'})`);

    // Adressen erhalten.
    const adressen = await s.evaluate(() => ({
      ab: document.querySelector('#dlg-pickup')?.value,
      zi: document.querySelector('#dlg-dest')?.value,
    }));
    pruefe(adressen.ab === ABHOLUNG && adressen.zi === FAHRZIEL, `${name} · ${knopf}: Adressen erhalten`);

    // Bis zur Zusammenfassung.
    await dlg.locator('[data-anfrage-weiter]').click();
    await s.waitForTimeout(350);
    await dlg.locator('[data-anfrage-weiter]').click();
    await s.waitForTimeout(450);

    const zus = await s.evaluate(() => {
      const w = {};
      for (const el of document.querySelectorAll('[data-zus]')) w[el.dataset.zus] = el.textContent.trim();
      return w;
    });
    pruefe(zus.service === leistung, `${name} · ${knopf}: Zusammenfassung nennt „${leistung}" (${zus.service})`);
    pruefe(zus.pickup === ABHOLUNG && zus.destination === FAHRZIEL, `${name} · ${knopf}: Zusammenfassung traegt beide Adressen`);

    // ── WhatsApp: Adresse pruefen, NICHT senden ────────────────────────
    await s.evaluate(() => { window.__geoeffnet = []; });
    await dlg.locator('[data-anfrage-weiter]').click();
    await s.waitForTimeout(400);

    const url = await s.evaluate(() => window.__geoeffnet[0] || null);
    const text = url ? decodeURIComponent(new URL(url).searchParams.get('text') || '') : '';
    pruefe(Boolean(url && url.startsWith('https://wa.me/4972743567')), `${name} · ${knopf}: WhatsApp-Adresse mit der Zentrale als Empfaenger`);
    pruefe(text.includes(leistung) && text.includes(ABHOLUNG) && text.includes(FAHRZIEL),
      `${name} · ${knopf}: die Nachricht traegt Leistung und beide Adressen`);
    // Keine erfundenen Angaben.
    for (const wort of ['€', 'km', 'Preis', 'Kosten', 'Minuten', 'bestätigt', 'gebucht']) {
      if (!text.includes(wort)) continue;
      pruefe(false, `${name} · ${knopf}: die Nachricht enthaelt „${wort}" - das ist nicht belegt`);
    }

    if (knopf === 'Schülerfahrt anfragen') await s.screenshot({ path: `${BELEGE}/start-${name}-dialog-schueler.png` });

    // Abschluss muss sagen, dass noch nichts gesendet und nichts bestaetigt ist.
    const abschluss = await s.evaluate(() => {
      const el = document.querySelector('[data-anfrage-abschluss]');
      return el && !el.hidden ? el.innerText.replace(/\s+/g, ' ') : null;
    });
    pruefe(Boolean(abschluss && /auf Senden/i.test(abschluss)),
      `${name} · ${knopf}: der Abschluss sagt, dass erst Senden die Anfrage abschickt`);

    if (knopf === 'Kurierfahrt anfragen') await s.screenshot({ path: `${BELEGE}/start-${name}-abschluss.png` });

    await dlg.locator('[data-anfrage-schliessen]').click();
    await s.waitForTimeout(500);

    // Nach dem Schliessen muss man genau dort weiterlesen, wo man war.
    const zurueckY = await s.evaluate(() => Math.round(window.scrollY));
    pruefe(Math.abs(zurueckY - vorY) <= 8,
      `${name} · ${knopf}: nach dem Schliessen steht die Seite wieder an ihrem Platz (${vorY} → ${zurueckY})`);
  }

  pruefe(vermisst.length === 0, `${name}: keine fehlenden Dateien${vermisst.length ? ' (' + vermisst.slice(0, 4).join(', ') + ')' : ''}`);
  const hart = fehler.filter((f) => f.startsWith('pageerror:'));
  pruefe(hart.length === 0, `${name}: keine Skriptfehler${hart.length ? ' (' + hart[0].slice(0, 140) + ')' : ''}`);

  await ctx.close();
}

// ══ Bestehende Einstiege ═══════════════════════════════════════════════════
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(OPEN_ABFANGEN);

  const s1 = await ctx.newPage();
  await s1.goto(BASIS + '/index.html?page=booking', { waitUntil: 'load' });
  await s1.waitForTimeout(1400);
  const offen = await s1.evaluate(() => {
    const d = document.querySelector('[role="dialog"]');
    return Boolean(d && !d.hidden && Number(getComputedStyle(d).opacity) > 0.9);
  });
  pruefe(offen, '?page=booking öffnet die Fahrtanfrage');
  pruefe(!(await s1.evaluate(() => window.location.search.includes('page='))), '?page=booking wird danach aus der Adresse genommen');
  await s1.close();

  for (const [frage, marke] of [['rewards', 'rewards'], ['help-public', 'kontakt'], ['services', 'leistungen']]) {
    const s2 = await ctx.newPage();
    await s2.goto(`${BASIS}/index.html?page=${frage}`, { waitUntil: 'load' });
    await s2.waitForTimeout(1500);
    const nah = await s2.evaluate((m) => {
      const el = document.getElementById(m);
      if (!el) return null;
      return Math.abs(el.getBoundingClientRect().top) < 140;
    }, marke);
    pruefe(nah === true, `?page=${frage} landet beim Abschnitt #${marke}`);
    await s2.close();
  }
  await ctx.close();
}

await browser.close();
server.close();
console.log(`\nbestanden: ${ok.length}   fehlgeschlagen: ${fehl.length}`);
if (fehl.length) { console.log('\n' + fehl.join('\n')); process.exitCode = 1; }
