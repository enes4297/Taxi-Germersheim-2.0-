// ═══════════════════════════════════════════════════════════════════════════
// Schritt 017 im Browser — Desktop und Mobil
// ═══════════════════════════════════════════════════════════════════════════
//
// Was hier geprueft wird, laesst sich an Dateien nicht feststellen:
//
//   1. OHNE JEDES FREMDE NETZ: Alle oeffentlichen Seiten werden mit hart
//      gesperrter Aussenverbindung geladen. Vor Schritt 017 meldeten dabei
//      19 von 20 Seiten Skriptfehler. Das ist der eigentliche Nachweis, dass
//      die mitgelieferte Bibliothek greift.
//   2. Konto-Einstieg: ohne Sitzung "Anmelden", mit vorgetaeuschter Sitzung
//      "Mein Konto" - und NICHT umgekehrt.
//   3. Die alten Einstiege ?page=why, ?page=medical und ?page=faq landen
//      tatsaechlich am gemeinten Abschnitt.
//   4. Die Sprungmarke wird beim ersten Tabulatorsprung sichtbar.
//   5. Eine Registrierung mit ausstehender Bestaetigung erscheint als
//      Hinweis, nicht als Fehler.
//
// ───────────────────────────────────────────────────────────────────────────
// ZUR AUSSAGEKRAFT - bitte nicht ueberlesen
// ───────────────────────────────────────────────────────────────────────────
//
// Punkt 2 und 5 arbeiten mit VORGETAEUSCHTEN Antworten im Browser. Es wird
// KEIN Konto angelegt, sich NIRGENDS angemeldet, KEINE Nachricht versendet
// und nichts an der Datenbank veraendert. Ein bestandener Lauf sagt, dass die
// Seite sich bei dieser Antwort richtig verhaelt - er sagt NICHT, dass die
// Anmeldung gegen die produktive Instanz funktioniert.
//
// Aufruf: npm run grundlagen-browser-pruefen

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = await import(
  new URL('../fahrer/tests/node_modules/playwright/index.mjs', import.meta.url).href
);

const AUSGABE = fileURLToPath(new URL('../dist-oeffentlich', import.meta.url));
const PORT = 5297;
const WURZEL = `http://127.0.0.1:${PORT}`;

const TYP = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.mp4': 'video/mp4', '.webm': 'video/webm', '.woff2': 'font/woff2',
  '.json': 'application/json', '.ico': 'image/x-icon', '.xml': 'application/xml', '.txt': 'text/plain',
};

const ok = [];
const fehl = [];
const pruefe = (bedingung, text) => {
  (bedingung ? ok : fehl).push(text);
  console.log((bedingung ? 'OK   ' : 'FEHL ') + text);
};

const server = createServer(async (req, res) => {
  const pfad = decodeURIComponent(req.url.split('?')[0]);
  try {
    const daten = await readFile(join(AUSGABE, pfad));
    res.writeHead(200, { 'Content-Type': TYP[extname(pfad).toLowerCase()] || 'application/octet-stream' });
    res.end(daten);
  } catch {
    res.writeHead(404);
    res.end('nicht gefunden');
  }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

const browser = await chromium.launch({ channel: 'chrome' });

/** Alles ausser dem eigenen Server wird abgewiesen - hart, nicht hoeflich. */
async function abgeschottet(breite, hoehe) {
  const ctx = await browser.newContext({ viewport: { width: breite, height: hoehe } });
  const nachDraussen = [];
  await ctx.route('**://**', (route) => {
    const u = route.request().url();
    if (u.startsWith(WURZEL)) return route.continue();
    nachDraussen.push(u);
    return route.abort();
  });
  return { ctx, nachDraussen };
}

const SEITEN = [
  'index.html', 'rewards.html', 'anmelden.html', 'registrieren.html',
  'passwort-vergessen.html', 'passwort-zuruecksetzen.html', 'meinkonto.html',
  'kunden-einstellungen.html', 'meine-fahrten.html', 'wallet-gutscheine.html',
  'live-fahrt.html', 'spezial-anfrage.html', 'spezialfahrten.html', 'flotte.html',
  'hilfe-kontakt.html', 'impressum.html', 'datenschutz.html', 'spiele.html', '404.html',
];

for (const [name, breite, hoehe] of [['Desktop', 1440, 900], ['Mobil', 390, 844]]) {
  console.log(`\n── ${name} ──`);
  const { ctx, nachDraussen } = await abgeschottet(breite, hoehe);

  // ── 1. Ohne jedes fremde Netz ────────────────────────────────────────────
  let mitFehler = [];
  let mit404 = [];
  for (const seite of SEITEN) {
    const p = await ctx.newPage();
    const fehler = [];
    const vierNullVier = [];
    p.on('console', (m) => { if (m.type() === 'error') fehler.push(`${seite}: ${m.text().slice(0, 90)}`); });
    p.on('pageerror', (e) => fehler.push(`${seite}: ${String(e).slice(0, 90)}`));
    p.on('response', (r) => { if (r.status() === 404) vierNullVier.push(`${seite}: ${new URL(r.url()).pathname}`); });
    await p.goto(`${WURZEL}/${seite}`, { waitUntil: 'load', timeout: 20000 });
    await p.waitForTimeout(1100);
    if (fehler.length) mitFehler.push(...fehler);
    if (vierNullVier.length) mit404.push(...vierNullVier);
    await p.close();
  }
  pruefe(
    mitFehler.length === 0,
    `${name}: alle ${SEITEN.length} Seiten laden OHNE Aussenverbindung fehlerfrei${mitFehler.length ? ' — ' + mitFehler.slice(0, 2).join(' | ') : ''}`,
  );
  pruefe(
    mit404.length === 0,
    `${name}: keine fehlende Datei${mit404.length ? ' — ' + [...new Set(mit404)].slice(0, 3).join(', ') : ''}`,
  );
  pruefe(
    nachDraussen.length === 0,
    `${name}: kein einziger Abruf nach draussen versucht${nachDraussen.length ? ' — ' + [...new Set(nachDraussen)].slice(0, 3).join(', ') : ''}`,
  );

  // ── 2. Konto-Einstieg ────────────────────────────────────────────────────
  {
    const p = await ctx.newPage();
    await p.goto(`${WURZEL}/index.html`, { waitUntil: 'load' });
    await p.waitForTimeout(900);
    const ohne = await p.evaluate(() =>
      [...document.querySelectorAll('[data-konto-verweis]')].map((a) => ({
        text: (a.textContent || '').trim(),
        ziel: a.getAttribute('href'),
      })),
    );
    pruefe(ohne.length >= 2, `${name}: Konto-Einstieg steht im Kopf UND in der Fusszeile (${ohne.length})`);
    pruefe(
      ohne.every((v) => v.text === 'Anmelden' && v.ziel === 'anmelden.html'),
      `${name}: ohne Sitzung steht ueberall „Anmelden" (${ohne.map((v) => v.text).join(', ')})`,
    );
    await p.close();
  }

  {
    // VORGETAEUSCHTE Sitzung. Es wird sich nirgends angemeldet: Die echte
    // customer-auth.js wird abgefangen und durch eine Attrappe ersetzt, die
    // „angemeldet" meldet. Geprueft wird allein, ob die Seite darauf richtig
    // reagiert.
    const p = await ctx.newPage();
    await p.route('**/customer-auth.js', (route) =>
      route.fulfill({
        contentType: 'text/javascript',
        body: 'window.CustomerAuth = { hydrateSession: async () => ({}), isLoggedIn: () => true };',
      }),
    );
    await p.addInitScript(() => {
      try { localStorage.setItem('sb-testprojekt-auth-token', '{"pruefung":true}'); } catch { /* egal */ }
    });
    await p.goto(`${WURZEL}/index.html`, { waitUntil: 'load' });
    await p.waitForTimeout(1400);
    const mit = await p.evaluate(() =>
      [...document.querySelectorAll('[data-konto-verweis]')].map((a) => ({
        text: (a.textContent || '').trim(),
        ziel: a.getAttribute('href'),
      })),
    );
    pruefe(
      mit.length > 0 && mit.every((v) => v.text === 'Mein Konto' && v.ziel === 'meinkonto.html'),
      `${name}: mit festgestellter Sitzung (vorgetaeuscht) steht ueberall „Mein Konto" (${mit.map((v) => v.text).join(', ')})`,
    );
    await p.close();
  }

  // ── 3. Die alten Einstiege ───────────────────────────────────────────────
  for (const [wert, marke] of [['why', 'region'], ['medical', 'leistung-krankenfahrten'], ['faq', 'kontakt']]) {
    const p = await ctx.newPage();
    await p.goto(`${WURZEL}/index.html?page=${wert}`, { waitUntil: 'load' });
    await p.waitForTimeout(1500);
    const lage = await p.evaluate((m) => {
      const el = document.getElementById(m);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { oben: Math.round(r.top), scroll: Math.round(window.scrollY) };
    }, marke);
    pruefe(
      lage !== null && lage.scroll > 100 && Math.abs(lage.oben) < 220,
      `${name}: ?page=${wert} landet am Abschnitt #${marke}${lage ? ` (gescrollt ${lage.scroll} px, Abschnitt bei ${lage.oben} px)` : ' — Abschnitt fehlt'}`,
    );
    await p.close();
  }

  // ── 4. Sprungmarke sichtbar beim ersten Tabulatorsprung ──────────────────
  for (const seite of ['index.html', 'rewards.html']) {
    const p = await ctx.newPage();
    await p.goto(`${WURZEL}/${seite}`, { waitUntil: 'load' });
    await p.waitForTimeout(700);
    await p.keyboard.press('Tab');
    const marke = await p.evaluate(() => {
      const el = document.activeElement;
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        text: (el.textContent || '').trim(),
        ziel: el.getAttribute('href'),
        breit: Math.round(r.width),
        hoch: Math.round(r.height),
        imBild: r.top >= -2 && r.left >= -2 && r.width > 40 && r.height > 12,
      };
    });
    pruefe(
      marke !== null && marke.text === 'Zum Inhalt springen' && marke.ziel === '#inhalt' && marke.imBild,
      `${name}: ${seite} zeigt die Sprungmarke beim ersten Tabulatorsprung sichtbar (${marke ? `"${marke.text}", ${marke.breit}x${marke.hoch} px` : 'kein Fokus'})`,
    );
    await p.close();
  }

  await ctx.close();
}

// ── 5. Registrierung mit ausstehender Bestaetigung ─────────────────────────
//
// Wieder eine ATTRAPPE: signUp liefert einen Benutzer ohne Sitzung zurueck,
// genau wie es das echte Supabase bei aktivierter Mail-Bestaetigung taete.
// Es wird KEIN Konto angelegt - die echte customer-auth.js wird gar nicht
// erst geladen.
console.log('\n── Registrierung (vorgetaeuschte Antwort, kein Konto wird angelegt) ──');
{
  const { ctx } = await abgeschottet(1440, 900);
  const p = await ctx.newPage();
  let echterAufruf = false;
  await p.route('**/customer-auth.js', (route) => {
    echterAufruf = true;
    return route.fulfill({
      contentType: 'text/javascript',
      body: `window.CustomerAuth = {
        hydrateSession: async () => null,
        isLoggedIn: () => false,
        getSessionSnapshot: () => null,
        patchNav: () => {},
        requireLogin: () => false,
        signUp: async () => ({ user: { id: 'pruefung' }, session: null })
      };`,
    });
  });
  await p.goto(`${WURZEL}/registrieren.html`, { waitUntil: 'load' });
  await p.waitForTimeout(800);

  await p.fill('#regFirstName', 'Probe');
  await p.fill('#regLastName', 'Pruefung');
  await p.fill('#regEmail', 'probe@example.invalid');
  await p.fill('#regPhone', '07274 3567');
  await p.fill('#regPassword', 'PruefungIstGut1!');
  await p.fill('#regPasswordConfirm', 'PruefungIstGut1!');
  await p.check('#regTerms');
  await p.click('#registerForm [type="submit"]');
  await p.waitForTimeout(900);

  const stand = await p.evaluate(() => {
    const f = document.getElementById('registerError');
    const h = document.getElementById('registerHinweis');
    const sicht = (el) => !!el && getComputedStyle(el).display !== 'none' && (el.textContent || '').trim().length > 0;
    return {
      fehlerText: (f?.textContent || '').trim(),
      fehlerSichtbar: sicht(f),
      hinweisText: (h?.textContent || '').trim(),
      hinweisSichtbar: sicht(h),
      adresse: location.pathname,
    };
  });

  pruefe(echterAufruf, 'die Attrappe hat die echte customer-auth.js ersetzt - es wurde kein Konto angelegt');
  pruefe(!stand.fehlerSichtbar, `kein roter Fehlerkasten bei geglueckter Registrierung (Text: "${stand.fehlerText}")`);
  pruefe(stand.hinweisSichtbar, 'stattdessen steht ein Hinweis da');
  pruefe(
    /Konto wurde angelegt/.test(stand.hinweisText) && /bestätigen Sie/.test(stand.hinweisText),
    `der Hinweis sagt, was geschehen ist und was noch zu tun ist: "${stand.hinweisText.slice(0, 110)}…"`,
  );
  pruefe(
    stand.hinweisText.includes('probe@example.invalid'),
    'der Hinweis nennt die Adresse, an die die Mail ging',
  );
  pruefe(stand.adresse.endsWith('registrieren.html'), 'die Seite bleibt stehen, statt weiterzuspringen');
  await ctx.close();
}

await browser.close();
server.close();

console.log(`\nbestanden: ${ok.length}   fehlgeschlagen: ${fehl.length}`);
console.log('Vorgetaeuscht (nicht echt geprueft): Anmeldestatus und Registrierungsantwort.');
console.log('Es wurde kein Konto angelegt, sich nirgends angemeldet und nichts versendet.');
if (fehl.length) {
  console.log('\n' + fehl.join('\n'));
  process.exitCode = 1;
}
