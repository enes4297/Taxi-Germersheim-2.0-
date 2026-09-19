// Der Ausgabeordner im Browser: Probeseite, Zentrale, Mitarbeiterportal,
// Dashboard. Nur Aufrufen und Anzeigen - es wird sich nirgends angemeldet und
// nichts abgeschickt.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Playwright liegt bewusst nur in fahrer/tests/ und nutzt das installierte
// Chrome. Es wird nicht zusaetzlich in die Wurzel aufgenommen.
const { chromium } = await import(
  new URL('../fahrer/tests/node_modules/playwright/index.mjs', import.meta.url).href
);

const WURZEL = fileURLToPath(new URL('../dist-oeffentlich', import.meta.url));
// Aufnahmen landen NICHT im Ausgabeordner, sonst wuerden sie mit ausgeliefert.
const BELEGE = process.env.BELEGE_ORDNER || fileURLToPath(new URL('../.belege-astro', import.meta.url));
mkdirSync(BELEGE, { recursive: true });

const TYPEN = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webmanifest': 'application/manifest+json',
};

const server = createServer(async (req, res) => {
  try {
    let p = join(WURZEL, decodeURIComponent(req.url.split('?')[0]));
    if ((await stat(p).catch(() => null))?.isDirectory()) p = join(p, 'index.html');
    const inhalt = await readFile(p);
    res.writeHead(200, { 'content-type': TYPEN[extname(p).toLowerCase()] || 'application/octet-stream' });
    res.end(inhalt);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('nicht gefunden');
  }
});
await new Promise((r) => server.listen(5210, '127.0.0.1', r));
const BASIS = 'http://127.0.0.1:5210';

const ok = [], fehl = [];
const pruefe = (b, t) => { (b ? ok : fehl).push(t); console.log((b ? 'OK   ' : 'FEHL ') + t); };

const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });

for (const [name, pfad, erwartet] of [
  ['Probeseite', '/probe.html', 'Probeseite des Astro-Gerüsts'],
  ['Zentrale', '/admin/index.html', null],
  ['Mitarbeiterportal', '/fahrer/index.html', null],
]) {
  const s = await ctx.newPage();
  const fehler = [];
  s.on('pageerror', (e) => fehler.push('pageerror: ' + e.message));
  s.on('console', (m) => { if (m.type() === 'error') fehler.push(m.text()); });
  // Fehlende Dateien wuerden sich hier zeigen - genau das soll gemessen werden.
  const vermisst = [];
  s.on('response', (r) => { if (r.status() === 404) vermisst.push(new URL(r.url()).pathname); });

  const antwort = await s.goto(BASIS + pfad, { waitUntil: 'load' });
  await s.waitForTimeout(2500);

  pruefe(antwort?.status() === 200, `${name}: Seite wird ausgeliefert (${antwort?.status()})`);
  pruefe(vermisst.length === 0, `${name}: keine fehlenden Dateien${vermisst.length ? ' (' + vermisst.slice(0, 5).join(', ') + ')' : ''}`);

  if (erwartet) {
    const text = await s.evaluate(() => document.body.innerText);
    pruefe(text.includes(erwartet), `${name}: Inhalt sichtbar`);
  } else {
    // Portalseiten: Ein Anmeldefeld muss tatsaechlich sichtbar sein.
    const feld = await s.evaluate(() => {
      const e = document.querySelector('input[type="password"]');
      if (!e) return null;
      const r = e.getBoundingClientRect();
      return { sichtbar: r.width > 4 && r.height > 4, id: e.id || e.name || '(ohne Namen)' };
    });
    pruefe(feld?.sichtbar === true, `${name}: Anmeldefeld sichtbar (${feld ? feld.id : 'kein Passwortfeld gefunden'})`);
    const logo = await s.evaluate(() => {
      const b = [...document.querySelectorAll('img')].find((i) => i.src.includes('logo.png'));
      return b ? b.naturalWidth > 0 : 'kein Logo eingebunden';
    });
    pruefe(logo === true || logo === 'kein Logo eingebunden', `${name}: Logo ueber ../logo.png geladen (${logo})`);
  }

  // Meldungen ueber eine nicht erreichbare Anmeldung sind hier erwartbar und
  // kein Mangel des Geruests; harte Skriptfehler dagegen schon.
  const hart = fehler.filter((f) => f.startsWith('pageerror:'));
  pruefe(hart.length === 0, `${name}: keine Skriptfehler${hart.length ? ' (' + hart[0].slice(0, 120) + ')' : ''}`);
  if (fehler.length) console.log(`     Hinweis ${name}: ${fehler.length} Konsolenmeldung(en), z. B. ${fehler[0].slice(0, 140)}`);

  await s.screenshot({ path: `${BELEGE}/${name.toLowerCase()}.png`, fullPage: false });
  await s.close();
}

// Dashboard: leitet per Skript auf die Zentrale weiter.
const d = await ctx.newPage();
await d.goto(BASIS + '/dashboard/index.html', { waitUntil: 'load' });
await d.waitForTimeout(2000);
pruefe(d.url().includes('/admin/'), `Dashboard leitet auf die Zentrale weiter (${d.url().replace(BASIS, '')})`);
await d.close();

await browser.close();
server.close();
console.log(`\nbestanden: ${ok.length}   fehlgeschlagen: ${fehl.length}`);
if (fehl.length) { console.log('\n' + fehl.join('\n')); process.exitCode = 1; }
