// ═══════════════════════════════════════════════════════════════════════════
// Die sechs Kontoseiten — Schutz, Daten, Fehlerbilder, Abmeldung
// ═══════════════════════════════════════════════════════════════════════════
//
// ───────────────────────────────────────────────────────────────────────────
// WAS HIER SIMULIERT IST — UND WAS NICHT
// ───────────────────────────────────────────────────────────────────────────
//
//   SIMULIERT ist JEDE Sitzung und JEDE Datenantwort. Es gibt in diesem
//   Prueflauf keine Verbindung zu Supabase. Der ganze Netzverkehr nach
//   aussen wird abgeschnitten (`ctx.route`), und `window.CustomerAuth`
//   wird durch eine Attrappe ersetzt, die genau die Antworten liefert,
//   die der jeweilige Fall braucht.
//
//   Das heisst: Dieser Lauf beweist, wie die SEITEN auf vier Zustaende
//   reagieren - angemeldet mit Daten, angemeldet ohne Daten, Ladefehler,
//   abgemeldet. Er beweist NICHT,
//     - dass eine echte Anmeldung funktioniert,
//     - dass `get_my_rewards_overview` einem Kunden antwortet,
//     - dass ein Kunde `rewards_vouchers` lesen darf,
//     - dass die Rechte in der produktiven Instanz passen.
//   Diese vier Punkte bleiben ausdruecklich offen.
//
//   NICHT simuliert sind die Seiten selbst: Markup, Stile, Tastaturlauf
//   und die Schutzlogik aus `customer-auth.js` laufen im echten Chrome.
//
//   Es werden KEINE produktiven Kontodaten angefasst und KEINE Nachricht
//   ausgeloest. Die Attrappe kennt nur erfundene Testwerte.
//
// ───────────────────────────────────────────────────────────────────────────
// DIE WICHTIGSTEN PRUEFUNGEN
// ───────────────────────────────────────────────────────────────────────────
//
//   1. OHNE SITZUNG IST NICHTS ZU SEHEN. Nicht verwischt, nicht blass -
//      weg. Im Bestand lag nur `filter: blur(2px)` darueber.
//
//   2. EIN LADEFEHLER IST KEIN LEERES KONTO. Beides muss sich auf dem
//      Bildschirm unterscheiden lassen.
//
//   3. GESPERRTER SPEICHER HAELT DIE SEITE NICHT AN. Im Bestand blieben
//      vier von fuenf Seiten dauerhaft auf "Konto wird geladen …".
//
//   4. ABMELDEN LEERT DIE PERSOENLICHEN ANZEIGEN - auch wenn die
//      Weiterleitung ausbleibt.
//
// Aufruf: npm run kontoseiten-pruefen

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const { chromium } = await import(
  new URL('../fahrer/tests/node_modules/playwright/index.mjs', import.meta.url).href
);

const WURZEL = fileURLToPath(new URL('..', import.meta.url));
const AUSGABE = join(WURZEL, 'dist-oeffentlich');
const PORT = 5288;
const ADRESSE = `http://127.0.0.1:${PORT}`;

const TYP = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.mp4': 'video/mp4', '.webm': 'video/webm',
};

const ok = [];
const fehl = [];
const pruefe = (bedingung, text) => {
  (bedingung ? ok : fehl).push(text);
  console.log((bedingung ? 'OK   ' : 'FEHL ') + text);
};
const hinweis = (t) => console.log('     · ' + t);

const server = createServer(async (req, res) => {
  const pfad = decodeURIComponent(req.url.split('?')[0]);
  try {
    const daten = await readFile(join(AUSGABE, pfad));
    res.writeHead(200, { 'Content-Type': TYP[extname(pfad).toLowerCase()] || 'application/octet-stream' });
    return res.end(daten);
  } catch {
    res.writeHead(404);
    res.end('nicht gefunden');
  }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

/** Die fuenf geschuetzten Seiten. Die Weiterleitung wird gesondert geprueft. */
const GESCHUETZT = [
  { datei: 'meinkonto.html', bereich: 'customer-account', name: 'Mein Konto' },
  { datei: 'kunden-einstellungen.html', bereich: 'customer-settings-page', name: 'Konto & Einstellungen' },
  { datei: 'meine-fahrten.html', bereich: 'customer-rides', name: 'Meine Fahrten' },
  { datei: 'wallet-gutscheine.html', bereich: 'customer-wallet', name: 'Gutscheine' },
  { datei: 'live-fahrt.html', bereich: 'live-ride-page', name: 'Fahrtstatus' },
];

const lies = (p) => readFile(join(AUSGABE, p), 'utf8');

// ═══════════════════════════════════════════════════════════════════════════
// 1. Uebernahme: Adressen, Auslieferung, noindex
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 1. Uebernahme und Adressen ──');
{
  for (const s of [...GESCHUETZT.map((g) => g.datei), 'kundenkonto.html']) {
    pruefe(existsSync(join(AUSGABE, s)), `${s} liegt unter derselben Adresse im Ausgabeordner`);
  }

  // Die alten Stilvorlagen der sechs Seiten duerfen weg sein - aber nur,
  // wenn sie auch wirklich niemand mehr braucht.
  for (const datei of ['auth-demo.css', 'kunden-einstellungen.css', 'live-ride.css', 'meinefahrten.css', 'wallet-gutscheine.css']) {
    pruefe(!existsSync(join(AUSGABE, datei)), `${datei} wird nicht mehr ausgeliefert`);
  }

  // Gegenprobe: Keine ausgelieferte Seite verweist noch darauf.
  const { readdir } = await import('node:fs/promises');
  const wurzelDateien = (await readdir(AUSGABE)).filter((d) => d.endsWith('.html'));
  let verweise = 0;
  for (const d of wurzelDateien) {
    const inhalt = await lies(d);
    for (const weg of ['auth-demo.css', 'kunden-einstellungen.css', 'live-ride.css', 'meinefahrten.css', 'wallet-gutscheine.css']) {
      if (inhalt.includes(weg)) { verweise++; hinweis(`${d} verweist noch auf ${weg}`); }
    }
  }
  pruefe(verweise === 0, `Keine ausgelieferte Seite verweist noch auf die entfernten Stilvorlagen (${wurzelDateien.length} Seiten geprueft)`);

  // noindex - persoenliche Bereiche gehoeren nicht in den Index.
  for (const g of GESCHUETZT) {
    const inhalt = await lies(g.datei);
    pruefe(/name="robots" content="noindex/.test(inhalt), `${g.datei}: steht auf noindex`);
  }
  const weiter = await lies('kundenkonto.html');
  pruefe(/name="robots" content="noindex,follow"/.test(weiter), 'kundenkonto.html: noindex,follow wie bisher');
  pruefe(/http-equiv="refresh" content="0; url=meinkonto\.html"/.test(weiter), 'kundenkonto.html: Weiterleitung auch ohne JavaScript');
  pruefe(/location\.replace\('meinkonto\.html'\)/.test(weiter), 'kundenkonto.html: location.replace, damit die Zurueck-Taste nicht schleift');
  pruefe(/rel="canonical" href="[^"]*meinkonto\.html"/.test(weiter), 'kundenkonto.html: canonical zeigt auf meinkonto.html');

  // Die Verzeichnisdatei darf keine Kontoseite nennen.
  const sitemap = await lies('sitemap.xml');
  let inSitemap = 0;
  for (const s of [...GESCHUETZT.map((g) => g.datei), 'kundenkonto.html']) {
    if (sitemap.includes(s)) inSitemap++;
  }
  pruefe(inSitemap === 0, 'Keine Kontoseite steht in der sitemap.xml');
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. Eine Anmeldelogik, keine zweite
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 2. Eine Anmeldelogik ──');
{
  for (const g of GESCHUETZT) {
    const inhalt = await lies(g.datei);
    pruefe(inhalt.includes('customer-auth.js'), `${g.datei}: bindet customer-auth.js ein`);
    // Keine zweite Anmeldung: kein eigener Client, kein eigenes signIn.
    const ohneKommentar = inhalt.replace(/<!--[\s\S]*?-->/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ');
    pruefe(!/createClient\s*\(/.test(ohneKommentar), `${g.datei}: legt keinen eigenen Supabase-Client an`);
    pruefe(!/signInWithPassword/.test(ohneKommentar), `${g.datei}: meldet niemanden selbst an`);
  }

  const auth = await readFile(join(WURZEL, 'customer-auth.js'), 'utf8');
  const zugriffe = [...auth.matchAll(/localStorage\.(getItem|setItem|removeItem|clear|key)/g)];
  pruefe(zugriffe.length === 3, `customer-auth.js fasst localStorage an genau drei Stellen an (${zugriffe.length})`);
  const inTry = [...auth.matchAll(/try\s*\{\s*(?:return\s*)?localStorage\./g)];
  pruefe(inTry.length === 3, `und jede dieser drei Stellen steht in einem try-Block (${inTry.length})`);
  pruefe(/function speicherGesperrt\(\)/.test(auth), 'customer-auth.js meldet ueber speicherGesperrt(), wenn der Speicher geklemmt hat');
}

// ═══════════════════════════════════════════════════════════════════════════
// Der Browser
// ═══════════════════════════════════════════════════════════════════════════
const browser = await chromium.launch({ channel: 'chrome' });

/**
 * Eine Seite mit ABGESCHNITTENEM Netz nach aussen.
 *
 * Kein Byte verlaesst den Rechner. Damit kann dieser Lauf die produktive
 * Instanz weder lesen noch veraendern - unabhaengig davon, was in
 * admin/supabase-config.js steht.
 */
async function neueSeite(vp, opt = {}) {
  const ctx = await browser.newContext({ viewport: vp, ...(opt.ctx || {}) });
  await ctx.route('**://**', (route) => {
    const url = route.request().url();
    if (url.startsWith(ADRESSE)) return route.continue();
    return route.abort();
  });
  /*
    Wo die Attrappe gilt, wird das ECHTE customer-auth.js zurueckgehalten.

    Sonst laedt es vom Pruefserver, setzt `window.CustomerAuth` am Ende
    seiner Datei neu - und ueberschreibt die Attrappe. Genau das ist beim
    ersten Lauf passiert: Die Seiten zeigten ueberall Striche, weil die
    echte Anmeldung ohne Netz zu keiner Sitzung kam.

    Das echte customer-auth.js wird dafuer in Abschnitt 7 geprueft, wo es
    ohne Attrappe und mit werfendem Speicher laeuft.
  */
  if (opt.attrappe) {
    await ctx.route('**/customer-auth.js', (route) =>
      route.fulfill({ status: 200, contentType: 'text/javascript', body: '/* Attrappe aktiv */' }));
    await ctx.addInitScript(opt.attrappe[0], opt.attrappe[1]);
  }
  const page = await ctx.newPage();
  const fehler = [];
  page.on('pageerror', (e) => fehler.push(String(e && e.message ? e.message : e)));
  page.on('console', (m) => { if (m.type() === 'error') fehler.push('console: ' + m.text()); });
  page.fehler = fehler;
  page.ctx = ctx;
  return page;
}

/**
 * Die Attrappe von `window.CustomerAuth`.
 *
 * Sie wird VOR allen Seitenskripten gesetzt. `customer-auth.js` wird gar
 * nicht erst geladen - das Netz ist zu, und die Attrappe steht schon da.
 *
 * `lage` steuert, was sie liefert:
 *   'daten'    angemeldet, Rewards und Gutscheine vorhanden
 *   'leer'     angemeldet, aber nichts drin
 *   'fehler'   angemeldet, beide Abfragen scheitern
 *   'aus'      nicht angemeldet
 *   'speicher' angemeldet, aber der Browserspeicher hat geklemmt
 *
 * ALLE Werte darin sind erfunden. Es gibt keine Verbindung zu Supabase,
 * es wird nichts geschrieben und nichts verschickt.
 */
function attrappe(lage) {
  const angemeldet = lage !== 'aus';
  const nutzer = {
    id: 'test-nutzer',
    email: 'testkonto@example.invalid',
    created_at: '2024-05-06T00:00:00Z',
    user_metadata: { full_name: 'Test Kundin', phone: '0170 0000000' },
  };
  const rewards = { points_balance: 1234, level: 'gold', available_spins: 3, qualifying_rides: 17 };
  const gutscheine = [
    { code: 'TG-TEST-AAAA', value_cents: 2000, status: 'open', valid_until: '2099-12-31', redeemed_at: null, issued_at: '2026-01-02' },
    { code: 'TG-TEST-BBBB', value_cents: 1000, status: 'redeemed', valid_until: '2099-12-31', redeemed_at: '2026-02-03', issued_at: '2026-01-01' },
  ];

  /*
    Ein LEERES Konto antwortet mit Nullen, nicht mit null.

    Das ist der Unterschied, um den es geht: 'leer' heisst 0 Punkte,
    Stufe Bronze, keine Drehs - und eine leere Gutscheinliste. Ein
    'null' ohne Fehlermeldung waere dagegen eine kaputte Antwort, und
    die Seite behandelt sie zu Recht als Fehler.
  */
  const leeresKonto = { points_balance: 0, level: 'bronze', available_spins: 0, qualifying_rides: 0 };
  const antwort = (daten, leerWert) => {
    if (lage === 'fehler') return { data: null, error: { message: 'TESTFEHLER' } };
    if (lage === 'leer') return { data: leerWert, error: null };
    return { data: daten, error: null };
  };

  window.__tgAbgemeldet = false;
  window.CustomerAuth = {
    hydrateSession: async () => true,
    isLoggedIn: () => angemeldet,
    speicherGesperrt: () => lage === 'speicher',
    patchNav: () => {},
    getProfile: () => (angemeldet
      ? { fullName: 'Test Kundin', email: nutzer.email, phone: '0170 0000000', registeredAt: nutzer.created_at }
      : {}),
    getSessionSnapshot: () => (angemeldet
      ? { session: { access_token: 'test' }, user: nutzer, profile: null, customerId: 'kunde-test', linked: true }
      : null),
    getClient: async () => ({
      rpc: async () => antwort(rewards, leeresKonto),
      from: () => ({ select() { return this; }, order: async () => antwort(gutscheine, []) }),
      auth: { updateUser: async () => antwort({ user: nutzer }, null) },
    }),
    signOut: async () => {
      window.__tgAbgemeldet = true;
      // 'haengt': nie aufloesen. Dann bleibt die Seite stehen, und es
      // laesst sich messen, ob VOR dem Abmelden geleert wurde.
      if (lage === 'haengt') return new Promise(() => {});
      return true;
    },
    requireLogin: (o) => {
      if (angemeldet) return false;
      const ziel = document.querySelector(o.targetSelector);
      if (ziel) { ziel.classList.add('auth-gated-content'); ziel.setAttribute('aria-hidden', 'true'); }
      const gate = document.createElement('section');
      gate.id = 'customerAuthGate';
      gate.className = 'auth-gate';
      gate.innerHTML = '<article class="auth-gate-card" role="region" aria-label="Login erforderlich">'
        + '<h2>Bitte zuerst anmelden</h2><p>' + o.gateDescription + '</p>'
        + '<div class="auth-gate-actions">'
        + '<a class="auth-btn" href="anmelden.html">Zur Anmeldung</a>'
        + '<a class="auth-btn" href="registrieren.html">Jetzt registrieren</a>'
        + '<a class="auth-btn" href="index.html">Zur Startseite</a></div></article>';
      document.body.appendChild(gate);
      return true;
    },
  };
}

/** Seite mit Attrappe oeffnen und warten, bis das Geruest fertig ist. */
async function oeffne(datei, lage, vp = { width: 1440, height: 900 }) {
  const page = await neueSeite(vp, { attrappe: [attrappe, lage] });
  await page.goto(`${ADRESSE}/${datei}`, { waitUntil: 'load' });
  await page.waitForFunction(() => !document.getElementById('kontoVorhang'), null, { timeout: 8000 })
    .catch(() => {});
  await page.waitForTimeout(400);
  return page;
}

/** Was steht auf dem Bildschirm, und was ist wirklich zu sehen? */
const lage = (page, bereich) => page.evaluate((id) => {
  const b = document.getElementById(id);
  const cs = b ? getComputedStyle(b) : null;
  const sichtbar = (el) => {
    if (!el) return false;
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) return false;
    const k = el.getBoundingClientRect();
    return k.width > 0 && k.height > 0;
  };
  return {
    vorhang: !!document.getElementById('kontoVorhang'),
    gate: !!document.getElementById('customerAuthGate'),
    bereichDa: !!b,
    bereichSichtbar: sichtbar(b),
    anzeige: cs ? cs.display : null,
    filter: cs ? cs.filter : null,
    speicherhinweis: sichtbar(document.getElementById('kontoSpeicherhinweis')),
    text: (document.body.innerText || '').replace(/\s+/g, ' ').trim(),
  };
}, bereich);

// ═══════════════════════════════════════════════════════════════════════════
// 3. Abgemeldet: nichts ist zu sehen
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 3. Abgemeldet (simulierte Sitzung: keine) ──');
for (const g of GESCHUETZT) {
  const page = await oeffne(g.datei, 'aus');
  const z = await lage(page, g.bereich);

  pruefe(!z.vorhang, `${g.datei}: der Ladevorhang ist weg`);
  pruefe(z.gate, `${g.datei}: die Anmeldesperre steht`);
  pruefe(z.bereichDa && !z.bereichSichtbar,
    `${g.datei}: der geschuetzte Bereich ist NICHT sichtbar (display: ${z.anzeige})`);
  pruefe(z.anzeige === 'none',
    `${g.datei}: wirklich ausgeblendet, nicht nur verwischt (filter: ${z.filter})`);

  const sichtbarerText = await page.evaluate(() => {
    const gate = document.getElementById('customerAuthGate');
    const alles = document.body.innerText || '';
    const imGate = gate ? gate.innerText || '' : '';
    return alles.replace(imGate, '').replace(/\s+/g, ' ').trim();
  });
  pruefe(!/Mitglied seit|Gutschein|Fahrtstatus|Kontaktdaten|Passwort/i.test(sichtbarerText),
    `${g.datei}: kein geschuetzter Text steht sichtbar auf der Seite`);

  const knopf = page.locator('#customerAuthGate .auth-btn').first();
  pruefe(await knopf.isVisible(), `${g.datei}: der Weg zur Anmeldung ist sichtbar`);
  pruefe((await knopf.getAttribute('href')) === 'anmelden.html',
    `${g.datei}: er fuehrt auf anmelden.html`);

  pruefe(page.fehler.length === 0,
    `${g.datei}: keine Fehler in der Konsole${page.fehler.length ? ': ' + page.fehler[0] : ''}`);
  await page.ctx.close();
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. Angemeldet mit Daten (simulierte Antworten)
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 4. Angemeldet, Daten vorhanden (simulierte Antworten) ──');
{
  const page = await oeffne('meinkonto.html', 'daten');
  const z = await lage(page, 'customer-account');
  pruefe(!z.gate && z.bereichSichtbar, 'meinkonto.html: der Bereich ist sichtbar');

  const werte = await page.evaluate(() => {
    const w = {};
    document.querySelectorAll('[data-feld]').forEach((e) => { w[e.dataset.feld] = e.textContent.trim(); });
    document.querySelectorAll('[data-rewards-wert]').forEach((e) => { w['r_' + e.dataset.rewardsWert] = e.textContent.trim(); });
    return w;
  });
  hinweis('gemessen: ' + JSON.stringify(werte));
  pruefe(werte.name === 'Test Kundin', `Der Name aus der Sitzung steht da (${werte.name})`);
  pruefe(werte.email === 'testkonto@example.invalid', `Die E-Mail steht da (${werte.email})`);
  pruefe(werte.telefon === '0170 0000000', `Die Telefonnummer steht da (${werte.telefon})`);
  pruefe(werte.mitglied === 'Mitglied seit: 2024', `Das Beitrittsjahr steht da (${werte.mitglied})`);
  pruefe(werte.initialen === 'TK', `Die Initialen stimmen (${werte.initialen})`);
  pruefe(werte.r_punkte === '1.234', `Die Punkte sind deutsch formatiert (${werte.r_punkte})`);
  pruefe(werte.r_level === 'Gold', `Das Level ist uebersetzt (${werte.r_level})`);
  pruefe(werte.r_drehs === '3' && werte.r_drehs2 === '3', `Die Drehs stehen an beiden Stellen (${werte.r_drehs})`);
  pruefe(werte.r_fahrten === '17', `Die qualifizierenden Fahrten stehen da (${werte.r_fahrten})`);

  const fehlerkasten = await page.evaluate(() => !document.getElementById('rewardsFehler').hidden);
  pruefe(!fehlerkasten, 'Kein Fehlerhinweis, wenn die Daten da sind');
  pruefe(page.fehler.length === 0, `Keine Fehler in der Konsole${page.fehler.length ? ': ' + page.fehler[0] : ''}`);
  await page.ctx.close();
}
{
  const page = await oeffne('wallet-gutscheine.html', 'daten');
  const t = await page.evaluate(() => document.getElementById('gutscheinListe').innerText.replace(/\s+/g, ' '));
  pruefe(/Verfügbare Gutscheine/.test(t), 'wallet: der Abschnitt "Verfügbare Gutscheine" steht da');
  pruefe(/Verlauf/.test(t), 'wallet: der Abschnitt "Verlauf" steht da');
  pruefe(/20,00/.test(t), 'wallet: der Betrag ist deutsch formatiert (20,00 Euro)');
  pruefe(/TG-TEST-AAAA/.test(t), 'wallet: der Gutscheincode steht da');
  pruefe(/Eingelöst/.test(t), 'wallet: der eingeloeste Gutschein ist als solcher gekennzeichnet');
  pruefe(/03\.02\.2026/.test(t), 'wallet: das Einloesedatum ist deutsch formatiert');
  pruefe(await page.evaluate(() => document.getElementById('gutscheinListe').getAttribute('aria-busy')) === 'false',
    'wallet: aria-busy steht nach dem Laden auf false');
  pruefe(page.fehler.length === 0, `wallet: keine Fehler in der Konsole${page.fehler.length ? ': ' + page.fehler[0] : ''}`);
  await page.ctx.close();
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. Leeres Konto und Ladefehler muessen sich unterscheiden
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 5. Leer gegen Ladefehler (der Kernpunkt) ──');
{
  const leer = await oeffne('meinkonto.html', 'leer');
  const leerWerte = await leer.evaluate(() => ({
    punkte: document.querySelector('[data-rewards-wert="punkte"]').textContent.trim(),
    fehler: !document.getElementById('rewardsFehler').hidden,
    text: document.body.innerText.replace(/\s+/g, ' '),
  }));
  await leer.ctx.close();

  const kaputt = await oeffne('meinkonto.html', 'fehler');
  const fehlerWerte = await kaputt.evaluate(() => ({
    punkte: document.querySelector('[data-rewards-wert="punkte"]').textContent.trim(),
    fehler: !document.getElementById('rewardsFehler').hidden,
    text: document.body.innerText.replace(/\s+/g, ' '),
  }));

  pruefe(!leerWerte.fehler, 'meinkonto: bei leerem Konto erscheint KEIN Fehlerhinweis');
  pruefe(fehlerWerte.fehler, 'meinkonto: bei einem Ladefehler erscheint er sehr wohl');
  pruefe(leerWerte.text !== fehlerWerte.text,
    'meinkonto: leeres Konto und Ladefehler sehen unterschiedlich aus');
  pruefe(/nicht abrufbar/.test(fehlerWerte.text), 'meinkonto: der Hinweis benennt den Ladefehler');
  pruefe(/bedeutet nicht, dass Ihr Konto leer ist/.test(fehlerWerte.text),
    'meinkonto: und sagt ausdruecklich, dass das Konto nicht leer sein muss');
  hinweis(`leer zeigt "${leerWerte.punkte}", Fehler zeigt "${fehlerWerte.punkte}"`);

  const warSichtbar = await kaputt.evaluate(() => !document.getElementById('rewardsFehler').hidden);
  await kaputt.locator('#rewardsErneut').click();
  await kaputt.waitForTimeout(500);
  pruefe(warSichtbar, 'meinkonto: der Wiederholungsknopf ist da und laesst sich druecken');
  await kaputt.ctx.close();
}
{
  const leer = await oeffne('wallet-gutscheine.html', 'leer');
  const a = await leer.evaluate(() => document.getElementById('gutscheinListe').innerText.replace(/\s+/g, ' '));
  await leer.ctx.close();

  const kaputt = await oeffne('wallet-gutscheine.html', 'fehler');
  const b = await kaputt.evaluate(() => document.getElementById('gutscheinListe').innerText.replace(/\s+/g, ' '));

  pruefe(/Noch keine Gutscheine/.test(a), 'wallet: leer heisst "Noch keine Gutscheine"');
  pruefe(/Gutscheine nicht verfügbar/.test(b), 'wallet: ein Ladefehler heisst "Gutscheine nicht verfügbar"');
  pruefe(a !== b, 'wallet: die beiden Faelle sehen unterschiedlich aus');
  pruefe(/sagt nichts darüber aus, ob Sie Gutscheine haben/.test(b),
    'wallet: der Fehlertext sagt ausdruecklich, dass er nichts ueber den Bestand aussagt');

  await kaputt.locator('#gutscheinListe button').click();
  await kaputt.waitForTimeout(600);
  pruefe(/Gutscheine nicht verfügbar/.test(
    await kaputt.evaluate(() => document.getElementById('gutscheinListe').innerText)),
    'wallet: der Wiederholungsknopf laedt erneut (und scheitert in diesem Fall wieder)');
  await kaputt.ctx.close();
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. Keine erfundenen Daten
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 6. Keine Beispieldaten ──');
{
  const fahrten = await oeffne('meine-fahrten.html', 'daten');
  const tf = await fahrten.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
  pruefe(/Noch keine Fahrten verfügbar/.test(tf), 'meine-fahrten: sagt geradeheraus, dass nichts da ist');
  pruefe(!/\d{2}\.\d{2}\.\d{4}/.test(tf), 'meine-fahrten: kein Datum, das eine Fahrt vortaeuschen wuerde');
  pruefe(!/\d+[.,]\d{2}\s*€/.test(tf), 'meine-fahrten: kein Betrag');
  pruefe(/nicht um einen Ladefehler/.test(tf), 'meine-fahrten: unterscheidet ausdruecklich von einem Ladefehler');
  await fahrten.ctx.close();

  const live = await oeffne('live-fahrt.html', 'daten');
  const tl = await live.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
  pruefe(/werden deshalb nicht simuliert/.test(tl), 'live-fahrt: der Satz aus dem Bestand steht wortgleich da');
  pruefe(/Nicht zugewiesen/.test(tl), 'live-fahrt: Fahrer und Fahrzeug sind ausdruecklich nicht zugewiesen');
  pruefe(!/\d{1,2}:\d{2}\s*(Uhr|min)/.test(tl), 'live-fahrt: keine erfundene Ankunftszeit');
  pruefe(!/\b[A-Z]{2,3}-[A-Z]{1,2}\s?\d{1,4}\b/.test(tl), 'live-fahrt: kein erfundenes Kennzeichen');
  await live.ctx.close();
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. Gesperrter Browserspeicher
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 7. Gesperrter Browserspeicher ──');
{
  const page = await oeffne('meinkonto.html', 'speicher');
  const z = await lage(page, 'customer-account');
  pruefe(!z.vorhang, 'Der Ladevorhang geht auch bei gesperrtem Speicher weg');
  pruefe(z.bereichSichtbar, 'Die Seite ist bedienbar');
  pruefe(z.speicherhinweis, 'Ein verstaendlicher Hinweis auf den gesperrten Speicher erscheint');
  const text = await page.evaluate(() => document.getElementById('kontoSpeicherhinweis').innerText);
  pruefe(/nur für diesen Besuch/.test(text), 'Der Hinweis sagt, was die Folge ist');
  pruefe(/Cookies und Websitedaten/.test(text), 'Und was der Kunde tun kann');
  await page.locator('#kontoSpeicherhinweisZu').click();
  await page.waitForTimeout(200);
  pruefe(await page.evaluate(() => document.getElementById('kontoSpeicherhinweis').hidden),
    'Der Hinweis laesst sich wegklicken');
  await page.ctx.close();
}
{
  // Und jetzt ECHT: das richtige customer-auth.js, mit werfendem Speicher.
  // Kein Netz nach aussen - die Anmeldung kann also nicht gelingen. Es
  // geht hier allein darum, dass die Seite nicht haengen bleibt.
  for (const g of GESCHUETZT) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.route('**://**', (r) => (r.request().url().startsWith(ADRESSE) ? r.continue() : r.abort()));
    await ctx.addInitScript(() => {
      const werfen = () => { throw new DOMException('Zugriff verweigert', 'SecurityError'); };
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get: () => ({ getItem: werfen, setItem: werfen, removeItem: werfen, clear: werfen, key: werfen, length: 0 }),
      });
    });
    const page = await ctx.newPage();
    const fehler = [];
    page.on('pageerror', (e) => fehler.push(String(e && e.message ? e.message : e)));
    await page.goto(`${ADRESSE}/${g.datei}`, { waitUntil: 'load' });
    await page.waitForFunction(() => !document.getElementById('kontoVorhang'), null, { timeout: 9000 })
      .catch(() => {});
    await page.waitForTimeout(400);

    const haengt = await page.evaluate(() => !!document.getElementById('kontoVorhang'));
    pruefe(!haengt, `${g.datei}: bleibt bei gesperrtem Speicher NICHT auf "Konto wird geladen …" haengen`);
    const gate = await page.evaluate(() => !!document.getElementById('customerAuthGate'));
    pruefe(gate, `${g.datei}: ohne nachgewiesene Sitzung wird gesperrt - im Zweifel zu`);
    const speicherFehler = fehler.filter((f) => /SecurityError|Zugriff verweigert/.test(f));
    pruefe(speicherFehler.length === 0,
      `${g.datei}: kein unbehandelter Speicherfehler${speicherFehler.length ? ': ' + speicherFehler[0] : ''}`);
    await ctx.close();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 8. Abmelden
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 8. Abmelden ──');
for (const datei of ['meinkonto.html', 'kunden-einstellungen.html']) {
  const page = await oeffne(datei, 'daten');

  const vorher = await page.evaluate(() =>
    [...document.querySelectorAll('[data-konto-persoenlich]')].map((e) => e.textContent.trim()));
  pruefe(vorher.some((t) => t && t !== '—' && t !== '…'),
    `${datei}: vor dem Abmelden stehen persoenliche Angaben da (${vorher.filter((t) => t !== '—').length} Felder)`);

  await page.ctx.close();

  /*
    TEIL A: Wird VOR dem Abmelden geleert?

    `window.location` laesst sich nicht ueberschreiben - ein erster
    Versuch damit ist gescheitert, und die Seite navigierte einfach weg.
    Stattdessen laesst die Attrappe `signOut()` haengen. Dann bleibt die
    Seite stehen, und es ist messbar, ob die persoenlichen Angaben schon
    weg sind, BEVOR das Abmelden durch ist.

    Genau das ist der Punkt: Bleibt die Weiterleitung aus - kein Netz,
    ein Fehler -, darf nichts Persoenliches stehen bleiben.
  */
  const haengt = await oeffne(datei, 'haengt');
  await haengt.locator('#kontoAbmelden').click();
  await haengt.waitForTimeout(700);

  const nachher = await haengt.evaluate(() => ({
    felder: [...document.querySelectorAll('[data-konto-persoenlich]')].map((e) => e.textContent.trim()),
    abgemeldet: window.__tgAbgemeldet === true,
    text: document.body.innerText.replace(/\s+/g, ' '),
    knopf: document.getElementById('kontoAbmelden').textContent.trim(),
  }));

  pruefe(nachher.abgemeldet, `${datei}: signOut() wurde gerufen`);
  pruefe(nachher.felder.length > 0 && nachher.felder.every((t) => t === '—'),
    `${datei}: ALLE persoenlichen Anzeigen sind geleert, noch waehrend das Abmelden laeuft (${nachher.felder.length} Felder)`);
  pruefe(!/Test Kundin|testkonto@example|0170 0000000|1\.234/.test(nachher.text),
    `${datei}: keine persoenliche Angabe steht mehr auf der Seite`);
  pruefe(/Wird abgemeldet/.test(nachher.knopf),
    `${datei}: der Knopf sagt, dass etwas laeuft ("${nachher.knopf}")`);
  await haengt.ctx.close();

  /* TEIL B: Wohin geht es danach? */
  const echt = await oeffne(datei, 'daten');
  await Promise.all([
    echt.waitForURL(/anmelden\.html/, { timeout: 6000 }).catch(() => {}),
    echt.locator('#kontoAbmelden').click(),
  ]);
  await echt.waitForTimeout(300);
  pruefe(echt.url().endsWith('anmelden.html?loggedOut=1'),
    `${datei}: die Weiterleitung geht auf anmelden.html?loggedOut=1 (${echt.url().split('/').pop()})`);
  await echt.ctx.close();
}

// ═══════════════════════════════════════════════════════════════════════════
// 9. Passwort aendern
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 9. Passwort aendern (simulierte Antwort) ──');
{
  const page = await oeffne('kunden-einstellungen.html', 'daten');
  await page.locator('#passwortOeffnen').click();
  await page.waitForTimeout(300);
  pruefe(await page.evaluate(() => document.getElementById('passwortDialog').open),
    'Der Dialog oeffnet sich');
  pruefe(await page.evaluate(() => document.activeElement && document.activeElement.id === 'newPassword'),
    'Der Fokus steht im ersten Feld');

  await page.locator('#newPassword').fill('abc');
  await page.waitForTimeout(150);
  const schwach = await page.evaluate(() => document.getElementById('passwortStaerkeText').textContent);
  pruefe(schwach === 'Schwach', `Ein kurzes Passwort heisst "Schwach" (${schwach})`);

  await page.locator('#newPassword').fill('Geheim123');
  await page.waitForTimeout(150);
  const stark = await page.evaluate(() => ({
    text: document.getElementById('passwortStaerkeText').textContent,
    breite: document.getElementById('passwortStaerkeBalken').style.width,
    regeln: [...document.querySelectorAll('[data-passwort-regel]')].map((l) => l.className.includes('text-primary')),
  }));
  pruefe(stark.text === 'Stark', `Ein gutes Passwort heisst "Stark" (${stark.text})`);
  pruefe(stark.breite === '100%', `Der Balken ist voll (${stark.breite})`);
  pruefe(stark.regeln.every(Boolean), 'Alle drei Regeln sind abgehakt');

  await page.locator('#confirmPassword').fill('Anders123');
  await page.locator('#passwortForm button[type="submit"]').click();
  await page.waitForTimeout(300);
  pruefe(/stimmen nicht überein/.test(await page.evaluate(() => document.getElementById('passwortMeldung').textContent)),
    'Abweichende Bestaetigung wird benannt');

  await page.locator('#confirmPassword').fill('Geheim123');
  await page.locator('#passwortForm button[type="submit"]').click();
  await page.waitForTimeout(500);
  pruefe(/Passwort wurde geändert/.test(await page.evaluate(() => document.getElementById('passwortMeldung').textContent)),
    'Bei Erfolg steht "Passwort wurde geändert" (simulierte Antwort)');
  pruefe(await page.evaluate(() => document.getElementById('newPassword').value === ''),
    'Die Felder werden danach geleert');

  await page.locator('[data-passwort-zeigen="newPassword"]').click();
  pruefe(await page.evaluate(() => document.getElementById('newPassword').type) === 'text',
    'Der Anzeigen-Schalter macht das Passwort sichtbar');
  await page.locator('[data-passwort-zeigen="newPassword"]').click();
  pruefe(await page.evaluate(() => document.getElementById('newPassword').type) === 'password',
    'Und wieder unsichtbar');

  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  pruefe(!(await page.evaluate(() => document.getElementById('passwortDialog').open)),
    'Escape schliesst den Dialog');
  pruefe(await page.evaluate(() => document.activeElement && document.activeElement.id === 'passwortOeffnen'),
    'Der Fokus kehrt auf den oeffnenden Knopf zurueck');

  pruefe(page.fehler.length === 0, `Keine Fehler in der Konsole${page.fehler.length ? ': ' + page.fehler[0] : ''}`);
  await page.ctx.close();
}
{
  const page = await oeffne('kunden-einstellungen.html', 'fehler');
  await page.locator('#passwortOeffnen').click();
  await page.locator('#newPassword').fill('Geheim123');
  await page.locator('#confirmPassword').fill('Geheim123');
  await page.locator('#passwortForm button[type="submit"]').click();
  await page.waitForTimeout(500);
  const m = await page.evaluate(() => document.getElementById('passwortMeldung').textContent);
  pruefe(/konnte gerade nicht geändert werden/.test(m), `Ein Fehler wird als Fehler gezeigt ("${m.slice(0, 50)}…")`);
  pruefe(await page.evaluate(() => !document.querySelector('#passwortForm [type=submit]').disabled),
    'Der Knopf ist danach wieder bedienbar');
  await page.ctx.close();
}

// ═══════════════════════════════════════════════════════════════════════════
// 10. Weiterleitung kundenkonto.html
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 10. Die Weiterleitung ──');
{
  const page = await neueSeite({ width: 1440, height: 900 });
  await page.goto(`${ADRESSE}/kundenkonto.html`, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  pruefe(page.url().endsWith('/meinkonto.html'), `kundenkonto.html leitet auf meinkonto.html (${page.url()})`);
  await page.ctx.close();
}

// ═══════════════════════════════════════════════════════════════════════════
// 11. Tastatur und Handy
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 11. Tastatur und Handy ──');
{
  const page = await oeffne('meinkonto.html', 'daten');
  let gefunden = false;
  for (let i = 0; i < 60 && !gefunden; i++) {
    await page.keyboard.press('Tab');
    gefunden = await page.evaluate(() => document.activeElement && document.activeElement.id === 'kontoAbmelden');
  }
  pruefe(gefunden, 'Der Abmeldeknopf ist mit der Tabulatortaste erreichbar');
  await page.ctx.close();
}
for (const [name, vp] of [['Handy 390 x 844', { width: 390, height: 844 }], ['Klein 320 x 568', { width: 320, height: 568 }]]) {
  for (const g of GESCHUETZT) {
    const page = await oeffne(g.datei, 'daten', vp);
    const ueberlauf = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    pruefe(!ueberlauf, `${name} · ${g.datei}: kein waagerechter Ueberlauf`);
    await page.ctx.close();
  }
}
{
  const page = await oeffne('meinkonto.html', 'aus', { width: 390, height: 844 });
  const sichtbar = await page.evaluate(() => {
    const k = document.querySelector('.auth-gate-card');
    if (!k) return null;
    const b = k.getBoundingClientRect();
    return { oben: Math.round(b.top), unten: Math.round(b.bottom), hoehe: innerHeight };
  });
  pruefe(sichtbar && sichtbar.oben >= 0 && sichtbar.unten <= sichtbar.hoehe,
    `Handy: die Anmeldesperre passt vollstaendig ins Bild (${JSON.stringify(sichtbar)})`);
  await page.ctx.close();
}

await browser.close();
server.close();

console.log('\n═══════════════════════════════════════════════════════════');
console.log(`Kontoseiten: ${ok.length} bestanden, ${fehl.length} nicht bestanden`);
if (fehl.length) {
  console.log('\nNicht bestanden:');
  for (const f of fehl) console.log('  - ' + f);
}
console.log('\nAlle Sitzungen und Datenantworten in diesem Lauf sind SIMULIERT.');
console.log('Es gab keine Verbindung zu Supabase. Offen bleiben: echte Anmeldung,');
console.log('Rechte auf get_my_rewards_overview und auf rewards_vouchers.');
console.log('═══════════════════════════════════════════════════════════');
process.exit(fehl.length ? 1 : 0);
