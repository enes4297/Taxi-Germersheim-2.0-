// ═══════════════════════════════════════════════════════════════════════════
// Die neue Rewards-Seite im Browser
// ═══════════════════════════════════════════════════════════════════════════
//
// ZWEI ARTEN VON PRUEFUNGEN, streng getrennt:
//
//   A) MIT DEN ECHTEN SKRIPTEN, OHNE ANMELDUNG
//      customer-auth.js und rewards-customer.js laufen unveraendert. Geprueft
//      wird der abgemeldete Fall: Es darf KEINE Kontozahl erscheinen. Dabei
//      wird nichts geschrieben und nichts angemeldet - die Sitzungspruefung
//      ergibt schlicht "keine Sitzung".
//
//   B) MIT ISOLIERTEN TESTDATEN
//      window.CustomerAuth und window.CustomerRewards werden VOR dem Laden
//      durch Attrappen ersetzt. Es geht dabei kein einziger Aufruf an
//      Supabase. Die Zahlen sind frei erfunden und dienen nur dazu, die
//      Darstellung zu pruefen - gefuelltes Konto, leeres Konto, Ladefehler.
//
// Was hier NICHT geprueft wird und auch nicht behauptet werden darf: ob die
// Anmeldung und die RPC gegen die produktive Instanz funktionieren. Dafuer
// muesste man sich anmelden; das ist hier bewusst nicht geschehen.

import { networkInterfaces } from 'node:os';

const { chromium } = await import(
  new URL('../fahrer/tests/node_modules/playwright/index.mjs', import.meta.url).href
);

const BASIS = process.env.REWARDS_BASIS || 'http://127.0.0.1:5200';
const ok = [], fehl = [];
const pruefe = (b, t) => { (b ? ok : fehl).push(t); console.log((b ? 'OK   ' : 'FEHL ') + t); };

/** Attrappe: liefert eine Uebersicht, ohne irgendetwas zu holen. */
/** Blockiert die beiden Bestandsskripte, damit die Attrappen stehen bleiben
 *  und kein einziger Aufruf an Supabase geht. */
async function ohneBestandsskripte(ctx) {
  await ctx.route('**/customer-auth.js', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '/* im Test ersetzt */' }));
  await ctx.route('**/rewards-customer.js', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '/* im Test ersetzt */' }));
}

const ATTRAPPE = (uebersicht, fehlerFall = false, verlauf = []) => `
  window.__testdaten = true;
  window.__abgemeldet = false;
  window.CustomerAuth = {
    hydrateSession: async () => {},
    isLoggedIn: () => !window.__abgemeldet,
    signOut: async () => { window.__abgemeldet = true; },
    getClient: async () => ({
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: async () => ({ data: ${JSON.stringify(verlauf)}, error: null }),
            }),
          }),
        }),
      }),
    }),
  };
  window.CustomerRewards = {
    load: async () => {
      const laedt = document.querySelector('[data-rewards-loading]');
      const inhalt = document.querySelector('[data-rewards-content]');
      const fehler = document.querySelector('[data-rewards-error]');
      if (laedt) laedt.hidden = true;
      if (${fehlerFall}) {
        if (inhalt) inhalt.hidden = true;
        if (fehler) fehler.hidden = false;
        document.dispatchEvent(new CustomEvent('tg:rewards-fehler'));
        return;
      }
      const d = ${JSON.stringify(uebersicht)};
      const setz = (s, w) => { const n = document.querySelector(s); if (n) n.textContent = w; };
      setz('[data-rewards-customer-name]', d.customer_name);
      setz('[data-rewards-points]', new Intl.NumberFormat('de-DE').format(d.points_balance));
      setz('[data-rewards-level]', d.level);
      setz('[data-rewards-rides]', String(d.qualifying_rides));
      setz('[data-rewards-spins]', String(d.available_spins));
      setz('[data-rewards-status]', 'Aktiv');
      if (inhalt) inhalt.hidden = false;
      document.dispatchEvent(new CustomEvent('tg:rewards-geladen', { detail: d }));
    },
  };
`;

/** Frei erfundene Testwerte. Sie stammen aus keiner Datenbank. */
const TESTKONTO = {
  customer_name: 'Testkonto Oberflaechenpruefung',
  status: 'active',
  points_balance: 1234,
  level: 'Gold',
  qualifying_rides: 13,
  available_spins: 2,
  rewards_account_id: 'test-konto-0000-0000-0000-000000000000',
};

/** Frei erfundener Gewinnverlauf. Aus keiner Datenbank. */
const TESTVERLAUF = [
  { id: 't1', prize_type: 'points_10', points_awarded: 10, created_at: '2026-09-18T10:00:00Z', fulfillment_status: 'fulfilled' },
  { id: 't2', prize_type: 'voucher_20', points_awarded: 0, created_at: '2026-09-10T10:00:00Z', fulfillment_status: 'fulfilled' },
  { id: 't3', prize_type: 'yumaks_box', points_awarded: 0, created_at: '2026-09-02T10:00:00Z', fulfillment_status: 'pending' },
];
const LEERES_TESTKONTO = {
  customer_name: 'Testkonto ohne Fahrten',
  status: 'active',
  points_balance: 0,
  level: 'Bronze',
  qualifying_rides: 0,
  available_spins: 0,
};

const browser = await chromium.launch({ channel: 'chrome' });

/** Welche Kontowerte stehen gerade sichtbar auf der Seite? */
const SICHTBAR = `() => {
  const lies = (s) => {
    const n = document.querySelector(s);
    if (!n) return null;
    // Sichtbar heisst: kein hidden-Vorfahr.
    for (let e = n; e && e !== document.body; e = e.parentElement) if (e.hidden) return null;
    return n.textContent.trim();
  };
  return {
    name: lies('[data-rewards-customer-name]'),
    punkte: lies('[data-rewards-points]'),
    stufe: lies('[data-rewards-level]'),
    fahrten: lies('[data-rewards-rides]'),
    drehs: lies('[data-rewards-spins]'),
    inhaltSichtbar: !document.querySelector('[data-rewards-content]').hidden,
    abgemeldetSichtbar: !document.querySelector('[data-rewards-abgemeldet]').hidden,
    fehlerSichtbar: !document.querySelector('[data-rewards-error]').hidden,
    laedtSichtbar: !document.querySelector('[data-rewards-loading]').hidden,
    leerSichtbar: !document.querySelector('[data-rewards-leer]').hidden,
    rest: document.querySelector('[data-rewards-rest]')?.textContent.trim(),
    bis: document.querySelector('[data-rewards-bis-dreh]')?.textContent.trim(),
    volleFelder: [...document.querySelectorAll('[data-rewards-balken] [data-feld]')].filter((f) => f.classList.contains('bg-primary')).length,
    stufeAktuell: [...document.querySelectorAll('[data-stufe]')].filter((k) => k.classList.contains('border-primary')).map((k) => k.dataset.stufe),
  };
}`;

for (const [name, vp, mobil] of [
  ['desktop', { width: 1280, height: 900 }, false],
  ['mobil', { width: 390, height: 844 }, true],
]) {
  console.log(`\n══ ${name} ═══════════════════════════════════════════`);

  // ── A) Echte Skripte, keine Anmeldung ──────────────────────────────────
  {
    const ctx = await browser.newContext({ viewport: vp, isMobile: mobil, hasTouch: mobil, deviceScaleFactor: 1 });
    const s = await ctx.newPage();
    const harte = [];
    s.on('pageerror', (e) => harte.push(e.message));

    const antwort = await s.goto(`${BASIS}/rewards.html`, { waitUntil: 'load' });
    pruefe(antwort?.status() === 200, `${name} · echt: rewards.html wird ausgeliefert (${antwort?.status()})`);
    await s.waitForTimeout(6000); // Supabase-Client laedt vom CDN

    const z = await s.evaluate(eval(`(${SICHTBAR})`));
    pruefe(z.abgemeldetSichtbar && !z.inhaltSichtbar,
      `${name} · echt, ohne Anmeldung: der abgemeldete Zustand steht (Inhalt verborgen)`);
    pruefe(z.punkte === '—' && z.stufe === '—',
      `${name} · echt, ohne Anmeldung: keine Kontozahlen, nur Gedankenstriche (Punkte ${z.punkte}, Stufe ${z.stufe})`);
    pruefe(z.name === 'Nicht angemeldet', `${name} · echt: die Karte sagt „Nicht angemeldet"`);
    pruefe(!z.laedtSichtbar, `${name} · echt: der Ladezustand ist wieder weg`);

    // Im KONTOBEREICH darf ohne Anmeldung keine Ziffer stehen.
    //
    // Erster Versuch durchsuchte die GANZE Seite und meldete 30, 50 und 33841
    // als verdaechtig - das sind aber die Gewinnliste und die Registernummer
    // in der Fusszeile, also erklaerte Angaben. Die Pruefung gehoert auf die
    // Stellen, an denen ein Kontostand stehen wuerde.
    const kontoZiffern = await s.evaluate(() => {
      const stellen = [
        '[data-rewards-customer-name]',
        '[data-rewards-points]',
        '[data-rewards-level]',
        '[data-rewards-status]',
        '[data-rewards-punkte-gross]',
        '[data-rewards-rides]',
        '[data-rewards-spins]',
      ];
      return stellen
        .map((s2) => [s2, document.querySelector(s2)?.textContent?.trim() ?? ''])
        .filter(([, t]) => /\d/.test(t))
        .map(([s2, t]) => `${s2} = "${t}"`);
    });
    pruefe(kontoZiffern.length === 0,
      `${name} · echt: im Kontobereich steht ohne Anmeldung keine einzige Ziffer${kontoZiffern.length ? ' (' + kontoZiffern[0] + ')' : ''}`);

    pruefe(harte.length === 0, `${name} · echt: keine Skriptfehler${harte.length ? ' (' + harte[0].slice(0, 90) + ')' : ''}`);

    // Yumak steht vorerst als Standbild - siehe den offenen Fehler.
    await s.locator('[data-yumak-buehne]').scrollIntoViewIfNeeded();
    await s.waitForTimeout(2500);
    const y = await s.evaluate(() => ({
      videos: document.querySelectorAll('[data-yumak-buehne] video').length,
      bilder: document.querySelectorAll('[data-yumak-buehne] img').length,
      quelle: document.querySelector('[data-yumak-buehne] img')?.getAttribute('src'),
      schalter: document.querySelector('[data-yumak-schalter]') !== null,
      blaseSichtbar: document.querySelector('[data-yumak-blase]')?.hidden === false,
      controller: typeof window.Yumak === 'object',
    }));
    pruefe(y.videos === 0 && y.bilder === 1,
      `${name} · Yumak: nur das Standbild, kein Video (${y.videos} Videos, ${y.bilder} Bilder)`);
    pruefe(y.quelle === '/assets/yumak/idle-grau-standbild.jpg',
      `${name} · Yumak: das freigegebene graue Standbild (${y.quelle?.split('/').pop()})`);
    pruefe(!y.schalter, `${name} · Yumak: keine Animationsbedienung in der Kundenansicht`);
    pruefe(!y.blaseSichtbar, `${name} · Yumak: keine selbsttaetige Sprechblase`);
    pruefe(y.controller, `${name} · Yumak: der Controller bleibt erhalten (window.Yumak)`);

    await s.screenshot({ path: `.belege-astro/rewards-${name}-abgemeldet.png`, fullPage: false });
    await ctx.close();
  }

  // ── B) Isolierte Testdaten: gefuelltes Konto ───────────────────────────
  {
    const ctx = await browser.newContext({ viewport: vp, isMobile: mobil, hasTouch: mobil, deviceScaleFactor: 1 });
    await ohneBestandsskripte(ctx);
    await ctx.addInitScript(ATTRAPPE(TESTKONTO, false, TESTVERLAUF));
    const s = await ctx.newPage();
    await s.goto(`${BASIS}/rewards.html`, { waitUntil: 'load' });
    await s.waitForTimeout(1500);

    const z = await s.evaluate(eval(`(${SICHTBAR})`));
    pruefe(z.inhaltSichtbar && !z.abgemeldetSichtbar, `${name} · Testdaten: die Kontoansicht steht`);
    pruefe(z.punkte === '1.234' && z.stufe === 'Gold' && z.fahrten === '13' && z.drehs === '2',
      `${name} · Testdaten: die Werte stehen richtig (${z.punkte} Punkte, ${z.stufe}, ${z.fahrten} Fahrten, ${z.drehs} Drehs)`);
    // 13 Fahrten bei 5 je Dreh: Rest 3, bis zum naechsten 2.
    pruefe(z.rest === '3' && z.bis === '2' && z.volleFelder === 3,
      `${name} · Testdaten: Fortschritt aus denselben Werten abgeleitet (${z.rest}/5, noch ${z.bis}, ${z.volleFelder} Felder)`);
    pruefe(z.stufeAktuell.length === 1 && z.stufeAktuell[0] === 'Gold',
      `${name} · Testdaten: die erreichte Stufe ist hervorgehoben (${z.stufeAktuell.join(', ')})`);
    pruefe(!z.leerSichtbar, `${name} · Testdaten: der Hinweis auf ein leeres Konto steht NICHT`);

    // Gewinnverlauf aus rewards_wheel_spins - hier aus der Attrappe.
    const v = await s.evaluate(() => {
      const li = [...document.querySelectorAll('[data-verlauf-liste] li')];
      return {
        sichtbar: !document.querySelector('[data-rewards-verlauf]').hidden,
        listeSichtbar: !document.querySelector('[data-verlauf-liste]').hidden,
        eintraege: li.map((x) => x.innerText.replace(/\s+/g, ' ').trim()),
      };
    });
    pruefe(v.sichtbar && v.listeSichtbar && v.eintraege.length === 3,
      `${name} · Testdaten: der Gewinnverlauf zeigt drei Eintraege (${v.eintraege.length})`);
    pruefe(v.eintraege[0]?.includes('10 Punkte') && v.eintraege[0]?.includes('18.09.2026'),
      `${name} · Testdaten: Gewinn und Datum stehen richtig ("${v.eintraege[0]}")`);
    pruefe(v.eintraege[1]?.includes('20,00 € Gutschein'),
      `${name} · Testdaten: der Gutschein heisst wie in der Spielewelt ("${v.eintraege[1]}")`);
    pruefe(v.eintraege[2]?.includes('Yumaks Box') && v.eintraege[2]?.includes('in Bearbeitung'),
      `${name} · Testdaten: die Box zeigt ihren Bearbeitungsstand ("${v.eintraege[2]}")`);

    // Vor dem Ganzseitenbild einmal durchscrollen: Die Enthuellung laeuft
    // sonst nie an, und das Bild zeigte leere Bloecke, wo Inhalt steht.
    // Beim ersten Lauf sah das wie ein Fehler aus, war aber die Aufnahme.
    await s.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 400) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 140));
      }
      window.scrollTo(0, document.body.scrollHeight);
      await new Promise((r) => setTimeout(r, 600));
      window.scrollTo(0, 0);
    });
    await s.waitForTimeout(1000);
    const versteckt = await s.evaluate(() =>
      [...document.querySelectorAll('[data-enthuellen-ziel]')].filter((e) => Number(getComputedStyle(e).opacity) < 0.9).length,
    );
    pruefe(versteckt === 0, `${name} · Testdaten: nach dem Durchlauf ist kein Block unsichtbar (${versteckt})`);

    if (name === 'desktop') await s.screenshot({ path: '.belege-astro/rewards-desktop-testdaten.png', fullPage: true });
    else await s.screenshot({ path: '.belege-astro/rewards-mobil-testdaten.png', fullPage: false });
    await ctx.close();
  }

  // ── E) Abmelden: persoenliche Angaben verschwinden ────────────────────
  {
    const ctx = await browser.newContext({ viewport: vp, isMobile: mobil, hasTouch: mobil });
    await ohneBestandsskripte(ctx);
    await ctx.addInitScript(ATTRAPPE(TESTKONTO, false, TESTVERLAUF));
    const s2 = await ctx.newPage();
    await s2.goto(`${BASIS}/rewards.html`, { waitUntil: 'load' });
    await s2.waitForTimeout(1500);

    const vorher = await s2.evaluate(eval(`(${SICHTBAR})`));
    pruefe(vorher.name === 'Testkonto Oberflaechenpruefung', `${name} · Abmelden: vorher steht der Name da`);

    await s2.locator('[data-rewards-abmelden]').click();
    await s2.waitForTimeout(1200);

    const nachher = await s2.evaluate(() => ({
      text: document.body.innerText,
      name: document.querySelector('[data-rewards-customer-name]')?.textContent?.trim(),
      punkte: document.querySelector('[data-rewards-points]')?.textContent?.trim(),
      verlaufEintraege: document.querySelectorAll('[data-verlauf-liste] li').length,
      abgemeldetSichtbar: !document.querySelector('[data-rewards-abgemeldet]').hidden,
      inhaltSichtbar: !document.querySelector('[data-rewards-content]').hidden,
      abgemeldetImAuth: window.__abgemeldet === true,
      hervorgehoben: document.querySelectorAll('[data-stufe].border-primary').length,
    }));
    pruefe(nachher.abgemeldetImAuth, `${name} · Abmelden: CustomerAuth.signOut wurde aufgerufen`);
    pruefe(nachher.abgemeldetSichtbar && !nachher.inhaltSichtbar, `${name} · Abmelden: der abgemeldete Zustand steht`);
    pruefe(nachher.name === 'Nicht angemeldet' && nachher.punkte === '—',
      `${name} · Abmelden: Name und Punkte sind weg (${nachher.name}, ${nachher.punkte})`);
    pruefe(nachher.verlaufEintraege === 0, `${name} · Abmelden: der Gewinnverlauf ist geleert (${nachher.verlaufEintraege})`);
    // „Gold" steht auch ohne Anmeldung als Stufenbeschriftung auf der Seite -
    // das ist kein Kontodatum. Geprueft wird der Name, der Punktestand, die
    // Fahrten und der Status; dazu, dass keine Stufe mehr hervorgehoben ist.
    pruefe(!nachher.text.includes('Testkonto') && !nachher.text.includes('1.234') && !nachher.text.includes('Aktiv'),
      `${name} · Abmelden: nichts Persoenliches steht mehr auf der Seite`);
    pruefe(nachher.hervorgehoben === 0,
      `${name} · Abmelden: keine Stufe ist mehr als erreicht markiert (${nachher.hervorgehoben})`);
    await ctx.close();
  }
}

// ── Navigation von der Startseite ──────────────────────────────────────────
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const s = await ctx.newPage();
  await s.goto(`${BASIS}/`, { waitUntil: 'load' });
  await s.waitForTimeout(2500);
  await s.locator('header a', { hasText: 'Rewards' }).first().click();
  await s.waitForLoadState('load');
  await s.waitForTimeout(1500);
  pruefe(s.url().endsWith('/rewards.html'), `Navigation: „Rewards" im Kopf der Startseite fuehrt nach rewards.html (${s.url().replace(BASIS, '')})`);
  pruefe((await s.title()) === 'Rewards | Taxi Germersheim GmbH', 'Navigation: die neue Seite ist angekommen');

  // Zurueck zur Startseite
  await s.locator('main a', { hasText: 'Startseite' }).first().click();
  await s.waitForLoadState('load');
  pruefe(s.url().endsWith('/index.html') || s.url().endsWith('/'), `Navigation: zurueck zur Startseite (${s.url().replace(BASIS, '')})`);
  await ctx.close();
}

// ── Anmeldung und Rueckkehr ───────────────────────────────────────────────
//
// SIMULIERT: signInWithPassword wird durch eine Attrappe ersetzt. Es wird
// KEIN Konto angemeldet, KEINE Zugangsdaten verwendet und nichts an die
// produktive Instanz geschickt. Geprueft wird ausschliesslich, wohin die
// Seite nach einer erfolgreichen Anmeldung weiterleitet.
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.route('**/customer-auth.js', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '/* im Test ersetzt */' }));
  await ctx.addInitScript(`
    window.CustomerAuth = {
      hydrateSession: async () => {},
      isLoggedIn: () => false,
      signInWithPassword: async () => ({ customer_id: 'test-ohne-anmeldung' }),
    };
  `);
  const s = await ctx.newPage();

  // Von der Rewards-Seite aus: der Anmeldelink traegt das Rueckkehrziel.
  await s.goto(`${BASIS}/rewards.html`, { waitUntil: 'load' });
  await s.waitForTimeout(1200);
  const link = await s.locator('[data-rewards-abgemeldet] a').first().getAttribute('href');
  pruefe(link === 'anmelden.html?weiter=rewards.html',
    `Anmeldung: der Link von Rewards traegt das Rueckkehrziel (${link})`);

  // Mit diesem Ziel anmelden - simuliert - und schauen, wo man landet.
  await s.goto(`${BASIS}/${link}`, { waitUntil: 'load' });
  await s.locator('#loginForm input[name="email"]').fill('test@example.invalid');
  await s.locator('#loginForm input[name="password"]').fill('nur-ein-testwert');
  await s.locator('#loginForm button[type="submit"]').first().click();
  await s.waitForTimeout(1500);
  pruefe(s.url().endsWith('/rewards.html'),
    `Anmeldung (simuliert): nach der Anmeldung geht es zurueck zu Rewards (${s.url().replace(BASIS, '')})`);

  // Ohne Parameter bleibt es beim bisherigen Ziel.
  await s.goto(`${BASIS}/anmelden.html`, { waitUntil: 'load' });
  await s.locator('#loginForm input[name="email"]').fill('test@example.invalid');
  await s.locator('#loginForm input[name="password"]').fill('nur-ein-testwert');
  await s.locator('#loginForm button[type="submit"]').first().click();
  await s.waitForTimeout(1500);
  pruefe(s.url().endsWith('/meinkonto.html'),
    `Anmeldung (simuliert): ohne Ziel bleibt es bei meinkonto.html (${s.url().replace(BASIS, '')})`);

  // Ein fremdes Ziel darf NICHT uebernommen werden.
  await s.goto(`${BASIS}/anmelden.html?weiter=https://example.com/`, { waitUntil: 'load' });
  await s.locator('#loginForm input[name="email"]').fill('test@example.invalid');
  await s.locator('#loginForm input[name="password"]').fill('nur-ein-testwert');
  await s.locator('#loginForm button[type="submit"]').first().click();
  await s.waitForTimeout(1500);
  pruefe(s.url().startsWith(BASIS) && s.url().endsWith('/meinkonto.html'),
    `Anmeldung (simuliert): ein fremdes Weiterleitungsziel wird abgewiesen (${s.url()})`);

  await ctx.close();
}

// ── Keine internen Entwicklungshinweise in der Kundenansicht ─────────────
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const s = await ctx.newPage();
  await s.goto(`${BASIS}/rewards.html`, { waitUntil: 'load' });
  await s.waitForTimeout(2500);
  const text = await s.evaluate(() => document.body.innerText);
  const verraeterisch = ['Migration', 'serverseitig', 'im Projekt hinterlegt', 'Produktivgang', 'RPC', 'Supabase', 'Backend', 'Designvorschau', 'rewards_wheel', 'get_my_rewards'];
  const gefunden = verraeterisch.filter((w) => text.includes(w));
  pruefe(gefunden.length === 0,
    `Kundenansicht: keine internen Entwicklungshinweise${gefunden.length ? ' (' + gefunden.join(', ') + ')' : ''}`);
  await ctx.close();
}

await browser.close();

const adressen = Object.values(networkInterfaces()).flat()
  .filter((i) => i && i.family === 'IPv4' && !i.internal).map((i) => i.address);
console.log(`\nbestanden: ${ok.length}   fehlgeschlagen: ${fehl.length}`);
if (adressen.length) console.log(`Im WLAN: http://${adressen[0]}:5200/rewards.html`);
if (fehl.length) { console.log('\n' + fehl.join('\n')); process.exitCode = 1; }
