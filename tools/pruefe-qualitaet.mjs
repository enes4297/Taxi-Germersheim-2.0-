// ═══════════════════════════════════════════════════════════════════════════
// Qualitaetsrunde — die Befunde aus Schritt 024, damit sie nicht wiederkommen
// ═══════════════════════════════════════════════════════════════════════════
//
// Dieser Lauf prueft NUR, was in der abschliessenden Qualitaetsrunde
// gefunden und behoben wurde. Die breiten Prueflaeufe der Schritte 014
// bis 023 bleiben davon unberuehrt.
//
// ───────────────────────────────────────────────────────────────────────────
// WAS HIER SIMULIERT IST
// ───────────────────────────────────────────────────────────────────────────
//
//   Sitzungen und Datenantworten sind SIMULIERT; der Netzverkehr nach
//   aussen ist abgeschnitten. Keine Verbindung zu Supabase, keine
//   Nachricht verlaesst den Rechner (window.open wird abgefangen), keine
//   produktiven Daten werden angefasst.
//
// ───────────────────────────────────────────────────────────────────────────
// DIE FUENF BEFUNDE
// ───────────────────────────────────────────────────────────────────────────
//
//   1. Eine verspaetete Antwort schrieb nach dem Abmelden persoenliche
//      Angaben zurueck auf den Bildschirm.
//   2. Der Abmeldeknopf war wirkungslos, solange die Rewards-Abfrage lief.
//   3. Serien- und Firmenanfragen trugen eine Leistung, die niemand
//      gewaehlt hatte.
//   4. Bei Flughafenanfragen standen zwei Ortsangaben unverbunden
//      nebeneinander.
//   5. Der Anfragedialog liess den Fokus ausserhalb - trotz aria-modal.
//
// Aufruf: npm run qualitaet-pruefen

import { createServer } from 'node:http';
import { readFile, readdir, stat } from 'node:fs/promises';
import { join, extname, relative } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const { chromium } = await import(
  new URL('../fahrer/tests/node_modules/playwright/index.mjs', import.meta.url).href
);

const WURZEL = fileURLToPath(new URL('..', import.meta.url));
const AUSGABE = join(WURZEL, 'dist-oeffentlich');
const PORT = 5289;
const ADRESSE = `http://127.0.0.1:${PORT}`;

const TYP = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.mp4': 'video/mp4', '.webm': 'video/webm',
};

const ok = [];
const fehl = [];
const pruefe = (b, t) => { (b ? ok : fehl).push(t); console.log((b ? 'OK   ' : 'FEHL ') + t); };
const hinweis = (t) => console.log('     · ' + t);

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

// ═══════════════════════════════════════════════════════════════════════════
// 1. Verspaetete Antworten nach dem Abmelden
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 1. Verspaetete Antworten (simulierte Sitzung) ──');

/** Attrappe mit LANGSAMER Antwort - drei Sekunden. */
function langsameAttrappe() {
  const nutzer = {
    id: 't', email: 'testkonto@example.invalid', created_at: '2024-05-06T00:00:00Z',
    user_metadata: { full_name: 'Test Kundin', phone: '0170 0000000' },
  };
  const rewards = { points_balance: 1234, level: 'gold', available_spins: 3, qualifying_rides: 17 };
  const gutscheine = [{
    code: 'TG-GEHEIM-1', value_cents: 2000, status: 'open',
    valid_until: '2099-12-31', redeemed_at: null, issued_at: '2026-01-02',
  }];
  const langsam = (w) => new Promise((r) => setTimeout(() => r({ data: w, error: null }), 3000));
  window.CustomerAuth = {
    hydrateSession: async () => true,
    isLoggedIn: () => true,
    speicherGesperrt: () => false,
    patchNav: () => {},
    getProfile: () => ({ fullName: 'Test Kundin', email: nutzer.email, phone: '0170 0000000', registeredAt: nutzer.created_at }),
    getSessionSnapshot: () => ({ session: { access_token: 't' }, user: nutzer, profile: null, customerId: 'k', linked: true }),
    getClient: async () => ({
      rpc: () => langsam(rewards),
      from: () => ({ select() { return this; }, order: () => langsam(gutscheine) }),
      auth: { updateUser: async () => ({ data: {}, error: null }) },
    }),
    // Haengt absichtlich: So bleibt die Seite stehen und ist messbar.
    signOut: async () => new Promise(() => {}),
    requireLogin: () => false,
  };
}

const GEHEIM = /Test Kundin|testkonto@example|0170 0000000|1\.234|TG-GEHEIM-1/;

for (const [seite, was] of [['meinkonto.html', 'Name und Punkte'], ['wallet-gutscheine.html', 'Gutscheincode']]) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.route('**://**', (r) => (r.request().url().startsWith(ADRESSE) ? r.continue() : r.abort()));
  await ctx.route('**/customer-auth.js', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '/* Attrappe */' }));
  await ctx.addInitScript(langsameAttrappe);
  const page = await ctx.newPage();
  await page.goto(`${ADRESSE}/${seite}`, { waitUntil: 'load' });
  await page.waitForTimeout(700);

  // Abmelden, WAEHREND die Abfrage laeuft.
  await page.evaluate(() => window.tgKontoRaeumen());
  await page.waitForTimeout(500);
  const direkt = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
  pruefe(!GEHEIM.test(direkt), `${seite}: direkt nach dem Abmelden steht nichts Persoenliches mehr da (${was})`);

  // Die verspaetete Antwort abwarten.
  await page.waitForTimeout(3300);
  const spaet = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
  const gefunden = (spaet.match(GEHEIM) || [])[0];
  pruefe(!GEHEIM.test(spaet),
    `${seite}: die verspaetete Antwort schreibt NICHTS zurueck${gefunden ? ' (gefunden: ' + gefunden + ')' : ''}`);
  await ctx.close();
}

// Der Zaehler selbst.
{
  const geruest = await readFile(join(AUSGABE, 'meinkonto.html'), 'utf8');
  pruefe(/window\.tgKontoStand\s*=/.test(geruest), 'Der Sitzungsstand wird bereitgestellt (tgKontoStand)');
  pruefe(/window\.tgKontoRaeumen\s*=/.test(geruest), 'Das Aufraeumen ist eine eigene Funktion (tgKontoRaeumen)');
  pruefe(/sitzungsstand \+= 1/.test(geruest), 'und zaehlt beim Aufraeumen hoch');
  pruefe((geruest.match(/nochGueltig\(\)/g) || []).length >= 3,
    'meinkonto.html prueft den Stand an mehreren Stellen');
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. Der Abmeldeknopf wirkt sofort
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 2. Abmelden waehrend des Ladens ──');
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.route('**://**', (r) => (r.request().url().startsWith(ADRESSE) ? r.continue() : r.abort()));
  await ctx.route('**/customer-auth.js', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '/* Attrappe */' }));
  await ctx.addInitScript(langsameAttrappe);
  const page = await ctx.newPage();
  await page.goto(`${ADRESSE}/meinkonto.html`, { waitUntil: 'load' });
  await page.waitForTimeout(700);

  // Die Abfrage laeuft noch (drei Sekunden). Jetzt klicken.
  const laedtNoch = await page.evaluate(() =>
    document.querySelector('[data-rewards-wert="punkte"]').textContent.trim() === '…');
  pruefe(laedtNoch, 'Die Rewards-Abfrage laeuft noch (Anzeige steht auf "…")');

  await page.locator('#kontoAbmelden').click();
  await page.waitForTimeout(500);
  const gewirkt = await page.evaluate(() => ({
    text: document.getElementById('kontoAbmelden').textContent.trim(),
    geleert: [...document.querySelectorAll('[data-konto-persoenlich]')].every((e) => e.textContent.trim() === '—'),
  }));
  pruefe(/Wird abgemeldet/.test(gewirkt.text),
    `Der Abmeldeknopf wirkt SOFORT, auch waehrend die Abfrage laeuft ("${gewirkt.text}")`);
  pruefe(gewirkt.geleert, 'und die persoenlichen Anzeigen sind schon geleert');
  await ctx.close();
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. Keine uebernommene Leistung bei Serien- und Firmenanfragen
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 3. Serien- und Firmenanfragen ──');
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await ctx.route('**://**', (r) => (r.request().url().startsWith(ADRESSE) ? r.continue() : r.abort()));
  // KEINE Nachricht verlaesst den Rechner.
  await ctx.addInitScript(() => { window.__z = []; window.open = (u) => { window.__z.push(String(u)); return null; }; });
  const page = await ctx.newPage();

  /** Fahrtart oeffnen - wahlweise nach einer anderen. */
  async function oeffne(art, vorher) {
    await page.goto(`${ADRESSE}/spezial-anfrage.html`, { waitUntil: 'load' });
    await page.waitForTimeout(450);
    if (vorher) {
      await page.evaluate((a) => document.querySelector(`[data-fahrtart="${a}"]`).click(), vorher);
      await page.waitForTimeout(350);
      await page.evaluate(() => document.querySelector('[data-anfrage-schliessen]').click());
      await page.waitForTimeout(250);
    }
    await page.evaluate((a) => document.querySelector(`[data-fahrtart="${a}"]`).click(), art);
    await page.waitForTimeout(450);
    return page.evaluate(() => {
      const d = document.querySelector('[data-anfrage-dialog]');
      const sichtbar = [...d.querySelectorAll('[data-leistungsanzeige]')].filter((e) => !e.hidden);
      return {
        anzeige: sichtbar.map((e) => e.innerText.replace(/\s+/g, ' ').trim()).join(' | '),
        schluessel: sichtbar.map((e) => e.dataset.leistungsanzeige),
      };
    });
  }

  for (const [art, vorher, erwartet] of [
    ['series', null, 'Serienfahrten'],
    ['series', 'airport', 'Serienfahrten'],
    ['business', 'medical', 'Firmen- und Geschäftskunden'],
  ]) {
    const z = await oeffne(art, vorher);
    const name = `${art}${vorher ? ' nach ' + vorher : ' ohne Vorwahl'}`;
    pruefe(z.schluessel.length === 1 && z.schluessel[0] === '',
      `${name}: KEINE der sieben Leistungen wird angezeigt`);
    pruefe(z.anzeige.includes(erwartet),
      `${name}: stattdessen steht die Fahrtart da ("${z.anzeige}")`);
    pruefe(!/Flughafentransfer|Krankenfahrten|^Taxi$/.test(z.anzeige),
      `${name}: keine uebernommene oder vorbelegte Leistung`);
  }

  // Und die Fahrtarten MIT Leistung zeigen sie weiterhin.
  const mit = await oeffne('airport', null);
  pruefe(mit.schluessel[0] === 'Flughafentransfer' && /Gewählte Leistung/i.test(mit.anzeige),
    `Flughafen zeigt weiterhin die Leistung ("${mit.anzeige}")`);
  await ctx.close();
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. Eindeutige Flughafen- und Zielangabe
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 4. Flughafen und Ziel ──');
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await ctx.route('**://**', (r) => (r.request().url().startsWith(ADRESSE) ? r.continue() : r.abort()));
  await ctx.addInitScript(() => { window.__z = []; window.open = (u) => { window.__z.push(String(u)); return null; }; });
  const page = await ctx.newPage();

  async function zielNach(vorgabe) {
    await page.goto(`${ADRESSE}/spezial-anfrage.html`, { waitUntil: 'load' });
    await page.waitForTimeout(450);
    await page.evaluate(() => document.querySelector('[data-fahrtart="airport"]').click());
    await page.waitForTimeout(400);
    if (vorgabe) {
      await page.evaluate((v) => {
        const e = document.querySelector('[data-anfrage-dialog] [data-anfrage-feld="destination"]');
        e.value = v;
        e.dispatchEvent(new Event('input', { bubbles: true }));
      }, vorgabe);
      await page.waitForTimeout(200);
    }
    // Flughafen waehlen.
    await page.evaluate(() => {
      const s = document.querySelector('[data-detail-satz]:not([hidden]) [data-detail-feld="airport"]');
      s.selectedIndex = 1;
      s.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.waitForTimeout(300);
    return page.evaluate(() => ({
      ziel: document.querySelector('[data-anfrage-dialog] [data-anfrage-feld="destination"]').value,
      flughafen: document.querySelector('[data-detail-satz]:not([hidden]) [data-detail-feld="airport"]').value,
    }));
  }

  const leer = await zielNach('');
  pruefe(leer.ziel === leer.flughafen,
    `Leeres Zielfeld wird mit dem gewaehlten Flughafen gefuellt ("${leer.ziel}")`);

  const eigen = await zielNach('Hotel Mustermann, Speyer');
  pruefe(eigen.ziel === 'Hotel Mustermann, Speyer',
    `Ein eingetragenes Ziel wird NICHT ueberschrieben ("${eigen.ziel}")`);
  hinweis(`gewaehlter Flughafen daneben: ${eigen.flughafen}`);
  await ctx.close();
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. Der Fokus im Anfragedialog
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 5. Fokus und Tastatur im Dialog ──');
for (const seite of ['index.html', 'spezial-anfrage.html']) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.route('**://**', (r) => (r.request().url().startsWith(ADRESSE) ? r.continue() : r.abort()));
  const page = await ctx.newPage();
  await page.goto(`${ADRESSE}/${seite}`, { waitUntil: 'load' });
  await page.waitForTimeout(600);

  const knopf = page.locator('[data-anfrage-oeffnen]:visible').first();
  const beschriftung = ((await knopf.textContent()) || '').trim();
  await knopf.click();
  await page.waitForTimeout(600);

  pruefe(await page.evaluate(() => document.querySelector('[data-anfrage-dialog]').contains(document.activeElement)),
    `${seite}: beim Oeffnen faehrt der Fokus IN den Dialog`);
  pruefe(await page.evaluate(() => document.activeElement.matches('input, select, textarea')),
    `${seite}: und zwar in ein Eingabefeld`);

  // Tabulator-Umlauf: Vom letzten Punkt aus landet Tab wieder beim ersten.
  const umlauf = await page.evaluate(() => {
    const blatt = document.querySelector('[data-anfrage-blatt]');
    const l = [...blatt.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])')]
      .filter((e) => !e.closest('[hidden]') && e.getBoundingClientRect().width > 0);
    if (!l.length) return null;
    l[l.length - 1].focus();
    return { anzahl: l.length, letzter: l[l.length - 1].tagName };
  });
  await page.keyboard.press('Tab');
  await page.waitForTimeout(200);
  pruefe(await page.evaluate(() => document.querySelector('[data-anfrage-blatt]').contains(document.activeElement)),
    `${seite}: die Tabulatortaste bleibt im Dialog (${umlauf ? umlauf.anzahl : 0} Bedienpunkte)`);

  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  const zurueck = await page.evaluate(() => (document.activeElement.textContent || '').trim());
  pruefe(zurueck === beschriftung,
    `${seite}: nach dem Schliessen kehrt der Fokus auf "${beschriftung}" zurueck (gemessen: "${zurueck}")`);
  await ctx.close();
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. Ausgelieferte Dateien: nichts Ungenutztes, nichts Fehlendes
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 6. Ausgelieferte Dateien ──');
{
  for (const weg of ['home-luxury.css', 'home-luxury.js', 'public-premium-v2.css', 'public-premium-v2.js', 'public-states.css', 'script.js']) {
    pruefe(!existsSync(join(AUSGABE, weg)), `${weg} wird nicht mehr ausgeliefert`);
  }

  // Gegenprobe: WIRKLICH kein Verweis mehr, ueber alle Ordner.
  async function alle(ordner) {
    const aus = [];
    for (const e of await readdir(ordner, { withFileTypes: true })) {
      const p = join(ordner, e.name);
      if (e.isDirectory()) aus.push(...await alle(p));
      else aus.push(p);
    }
    return aus;
  }
  const dateien = (await alle(AUSGABE)).filter((d) => /\.(html|js|css)$/i.test(d));
  const verweise = [];
  for (const d of dateien) {
    const t = await readFile(d, 'utf8');
    for (const weg of ['home-luxury', 'public-premium-v2', 'public-states.css', '"script.js"', "'script.js'", 'src="script.js"']) {
      if (t.includes(weg)) verweise.push(`${relative(AUSGABE, d).replace(/\\/g, '/')} → ${weg}`);
    }
  }
  pruefe(verweise.length === 0,
    `Keine der ${dateien.length} ausgelieferten Dateien verweist noch darauf`);
  for (const v of verweise.slice(0, 5)) hinweis(v);

  // Die grossen Hintergrundbilder der Spielewelt.
  for (const bild of ['assets/spielewelt/ger-tx-100-hintergrund.webp', 'assets/spielewelt/ger-tx-800-hintergrund.webp']) {
    const da = existsSync(join(AUSGABE, bild));
    pruefe(da, `${bild} liegt im Ausgabeordner`);
    if (da) {
      const kb = Math.round((await stat(join(AUSGABE, bild))).size / 1024);
      pruefe(kb < 400, `und ist mit ${kb} KB deutlich kleiner als die 2679 bzw. 2436 KB vorher`);
    }
  }
  const spieleCss = await readFile(join(AUSGABE, 'spiele.css'), 'utf8');
  pruefe(!/admin\/images\/mercedes-[ev]-klasse-ger-tx/.test(spieleCss),
    'spiele.css laedt keine Mehrmegabyte-PNG mehr aus admin/images');
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. Der Rundgang: Kopf, Fuss, eine h1, kein Ueberlauf
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 7. Rundgang ueber die oeffentlichen Seiten ──');
{
  const SEITEN = ['index.html', 'flotte.html', 'spezialfahrten.html', 'spezial-anfrage.html',
    'rewards.html', 'spiele.html', 'impressum.html', 'datenschutz.html', 'hilfe-kontakt.html',
    '404.html', 'anmelden.html', 'registrieren.html', 'passwort-vergessen.html'];

  for (const [name, vp] of [['PC', { width: 1440, height: 900 }], ['Handy', { width: 390, height: 844 }]]) {
    const ctx = await browser.newContext({ viewport: vp });
    await ctx.route('**://**', (r) => (r.request().url().startsWith(ADRESSE) ? r.continue() : r.abort()));
    let schlecht = 0;
    const merkmale = [];
    for (const s of SEITEN) {
      const page = await ctx.newPage();
      const fehlend = [];
      const skriptfehler = [];
      page.on('response', (r) => { if (r.status() === 404) fehlend.push(r.url().replace(ADRESSE, '')); });
      page.on('pageerror', (e) => skriptfehler.push(String(e.message).slice(0, 50)));
      await page.goto(`${ADRESSE}/${s}`, { waitUntil: 'load' }).catch(() => { });
      await page.waitForTimeout(400);
      const m = await page.evaluate(() => ({
        kopf: !!document.querySelector('header'),
        fuss: !!document.querySelector('footer'),
        h1: document.querySelectorAll('h1').length,
        ueberlauf: document.documentElement.scrollWidth > innerWidth + 1,
        sprung: !!document.querySelector('a[href="#inhalt"], a[href^="#"][class*="sr-"], .sr-only a, a[href="#inhalt"]'),
      }));
      const gut = m.kopf && m.fuss && m.h1 === 1 && !m.ueberlauf && !fehlend.length && !skriptfehler.length;
      if (!gut) {
        schlecht++;
        merkmale.push(`${s}: ${JSON.stringify(m)} fehlend=${fehlend.length} fehler=${skriptfehler[0] || 0}`);
      }
      await page.close();
    }
    pruefe(schlecht === 0,
      `${name}: alle ${SEITEN.length} Seiten haben Kopf, Fusszeile, genau eine h1, keinen Ueberlauf, keine fehlende Datei, keinen Skriptfehler`);
    for (const m of merkmale) hinweis(m);
    await ctx.close();
  }
}

await browser.close();
server.close();

console.log('\n═══════════════════════════════════════════════════════════');
console.log(`Qualitaetsrunde: ${ok.length} bestanden, ${fehl.length} nicht bestanden`);
if (fehl.length) {
  console.log('\nNicht bestanden:');
  for (const f of fehl) console.log('  - ' + f);
}
console.log('\nSitzungen und Datenantworten sind SIMULIERT. Keine Verbindung zu');
console.log('Supabase, keine Nachricht verlaesst den Rechner.');
console.log('═══════════════════════════════════════════════════════════');
process.exit(fehl.length ? 1 : 0);
