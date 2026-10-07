// ═══════════════════════════════════════════════════════════════════════════
// Die vier Anmeldeseiten im Browser — Desktop und Mobil
// ═══════════════════════════════════════════════════════════════════════════
//
// anmelden.html · registrieren.html · passwort-vergessen.html ·
// passwort-zuruecksetzen.html
//
// ───────────────────────────────────────────────────────────────────────────
// ZUR AUSSAGEKRAFT — BITTE NICHT UEBERLESEN
// ───────────────────────────────────────────────────────────────────────────
//
// ALLES HIER IST SIMULIERT. Die echte `customer-auth.js` wird abgefangen und
// durch eine Attrappe ersetzt, die vorgegebene Antworten liefert. Geprueft
// wird ausschliesslich, ob die SEITE sich bei diesen Antworten richtig
// verhaelt.
//
// Ein bestandener Lauf belegt NICHT:
//   - dass eine Anmeldung gegen Supabase funktioniert
//   - dass eine Registrierung ein Konto anlegt
//   - dass eine Bestaetigungs- oder Reset-Mail zugestellt wird
//   - dass ein Reset-Link traegt
//
// Es wird kein Konto angelegt, sich nirgends angemeldet, keine Mail
// ausgeloest und nichts an produktiven Daten veraendert. Die Anleitung fuer
// den echten Test steht in ANLEITUNG-ANMELDETEST.md.
//
// KEINE GEHEIMNISSE IN DIE AUSGABE: Dieses Skript gibt niemals ein Passwort,
// ein Zugangsmerkmal oder eine echte Adresse aus. Die Testwerte sind
// ausgedacht und enden auf .invalid - eine Endung, die es nicht gibt.
//
// Aufruf: npm run anmeldung-pruefen

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = await import(
  new URL('../fahrer/tests/node_modules/playwright/index.mjs', import.meta.url).href
);

const AUSGABE = fileURLToPath(new URL('../dist-oeffentlich', import.meta.url));
const PORT = 5289;
const ADRESSE = `http://127.0.0.1:${PORT}`;

/** Ausgedachte Werte. `.invalid` ist per Norm niemals eine echte Domain. */
const PROBE_MAIL = 'probe@example.invalid';
const PROBE_PASSWORT = 'PruefungIstGut1';

const TYP = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.xml': 'application/xml', '.txt': 'text/plain',
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

const SEITEN = ['anmelden.html', 'registrieren.html', 'passwort-vergessen.html', 'passwort-zuruecksetzen.html'];

const browser = await chromium.launch({ channel: 'chrome' });

/** Kontext ohne jede Aussenverbindung. */
async function kontext(breite, hoehe) {
  const ctx = await browser.newContext({ viewport: { width: breite, height: hoehe } });
  const draussen = [];
  await ctx.route('**://**', (r) => {
    const u = r.request().url();
    if (u.startsWith(ADRESSE)) return r.continue();
    draussen.push(u);
    return r.abort();
  });
  return { ctx, draussen };
}

/** Die echte Anmeldelogik durch eine Attrappe ersetzen. */
async function attrappe(seite, koerper) {
  await seite.route('**/customer-auth.js', (route) =>
    route.fulfill({ contentType: 'text/javascript', body: koerper }),
  );
}

// ── 1. Darstellung, Verweise, Tastatur ─────────────────────────────────────
for (const [name, breite, hoehe] of [['Desktop', 1440, 900], ['Mobil', 390, 844]]) {
  console.log(`\n── Darstellung · ${name} ──`);
  const { ctx, draussen } = await kontext(breite, hoehe);

  for (const seite of SEITEN) {
    const p = await ctx.newPage();
    const fehler = [];
    const fehlend = [];
    p.on('pageerror', (e) => fehler.push(String(e).slice(0, 90)));
    p.on('console', (m) => { if (m.type() === 'error') fehler.push(m.text().slice(0, 90)); });
    p.on('response', (r) => { if (r.status() === 404) fehlend.push(new URL(r.url()).pathname); });

    await p.goto(`${ADRESSE}/${seite}`, { waitUntil: 'load' });
    await p.waitForTimeout(1000);

    pruefe(fehler.length === 0, `${name} · ${seite}: keine Skriptfehler${fehler.length ? ' — ' + fehler[0] : ''}`);
    pruefe(fehlend.length === 0, `${name} · ${seite}: keine fehlende Datei${fehlend.length ? ' — ' + [...new Set(fehlend)].join(', ') : ''}`);

    const mess = await p.evaluate(() => ({
      quer: document.documentElement.scrollWidth > window.innerWidth + 2,
      h1: document.querySelectorAll('h1').length,
      main: !!document.querySelector('main#inhalt'),
      noindex: !!document.querySelector('meta[name="robots"][content*="noindex"]'),
      // Jedes Eingabefeld braucht eine sichtbare Beschriftung.
      ohneLabel: [...document.querySelectorAll('input:not([type="hidden"])')]
        .filter((i) => !document.querySelector(`label[for="${i.id}"]`) && !i.closest('label'))
        .map((i) => i.id || i.name),
      // Schriftgroesse der Felder: unter 16 px zoomt iOS beim Antippen.
      kleinsteFeldschrift: Math.min(
        ...[...document.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"])')].map((i) =>
          parseFloat(getComputedStyle(i).fontSize),
        ),
      ),
    }));

    pruefe(!mess.quer, `${name} · ${seite}: kein waagerechter Ueberlauf`);
    pruefe(mess.h1 === 1, `${name} · ${seite}: genau eine Hauptueberschrift (${mess.h1})`);
    pruefe(mess.main, `${name} · ${seite}: Hauptinhaltsbereich vorhanden`);
    pruefe(mess.noindex, `${name} · ${seite}: steht auf noindex - Kontoseiten gehoeren nicht ins Verzeichnis`);
    pruefe(mess.ohneLabel.length === 0, `${name} · ${seite}: jedes Feld hat eine Beschriftung${mess.ohneLabel.length ? ' — ohne: ' + mess.ohneLabel.join(', ') : ''}`);
    pruefe(
      mess.kleinsteFeldschrift >= 16,
      `${name} · ${seite}: Eingabefelder mindestens 16 px - sonst zoomt das Handy beim Antippen (${mess.kleinsteFeldschrift} px)`,
    );

    // Sprungmarke und sichtbarer Fokus
    await p.keyboard.press('Tab');
    const marke = await p.evaluate(() => {
      const el = document.activeElement;
      const r = el?.getBoundingClientRect();
      return { text: (el?.textContent || '').trim(), sichtbar: !!r && r.top >= -2 && r.width > 40 };
    });
    pruefe(marke.text === 'Zum Inhalt springen' && marke.sichtbar, `${name} · ${seite}: Sprungmarke sichtbar beim ersten Tabulatorsprung`);

    let ohneFokus = 0;
    for (let i = 0; i < 20; i += 1) {
      await p.keyboard.press('Tab');
      const fehltRing = await p.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return false;
        const s = getComputedStyle(el);
        const ow = parseFloat(s.outlineWidth) || 0;
        return !((ow > 0 && s.outlineStyle !== 'none') || (s.boxShadow && s.boxShadow !== 'none'));
      });
      if (fehltRing) ohneFokus += 1;
    }
    pruefe(ohneFokus === 0, `${name} · ${seite}: jedes bedienbare Element zeigt den Fokus (${ohneFokus} ohne)`);

    await p.close();
  }

  pruefe(draussen.length === 0, `${name}: kein Abruf nach draussen versucht${draussen.length ? ' — ' + [...new Set(draussen)].slice(0, 2).join(', ') : ''}`);
  await ctx.close();
}

// ── 2. Passwortmanager und automatisches Ausfuellen ────────────────────────
console.log('\n── Passwortmanager und Tastatur ──');
{
  const { ctx } = await kontext(1440, 900);
  const ERWARTET = {
    'anmelden.html': { loginEmail: ['email', 'email'], loginPassword: ['current-password', null] },
    'registrieren.html': {
      regFirstName: ['given-name', null], regLastName: ['family-name', null],
      regEmail: ['email', 'email'], regPhone: ['tel', 'tel'],
      regPassword: ['new-password', null], regPasswordConfirm: ['new-password', null],
    },
    'passwort-vergessen.html': { forgotEmail: ['email', 'email'] },
    'passwort-zuruecksetzen.html': { newPassword: ['new-password', null], confirmPassword: ['new-password', null] },
  };

  for (const [seite, felder] of Object.entries(ERWARTET)) {
    const p = await ctx.newPage();
    await p.goto(`${ADRESSE}/${seite}`, { waitUntil: 'load' });
    await p.waitForTimeout(500);
    const ist = await p.evaluate(() =>
      Object.fromEntries(
        [...document.querySelectorAll('input[id]')].map((i) => [
          i.id,
          { ac: i.getAttribute('autocomplete'), im: i.getAttribute('inputmode'), name: i.getAttribute('name'), typ: i.type, min: i.getAttribute('minlength') },
        ]),
      ),
    );
    const falsch = [];
    for (const [id, [ac, im]] of Object.entries(felder)) {
      if (!ist[id]) { falsch.push(`${id} fehlt`); continue; }
      if (ist[id].ac !== ac) falsch.push(`${id}: autocomplete ${ist[id].ac}`);
      if (im && ist[id].im !== im) falsch.push(`${id}: inputmode ${ist[id].im}`);
    }
    pruefe(falsch.length === 0, `${seite}: Passwortmanager und Tastatur richtig angekuendigt${falsch.length ? ' — ' + falsch.join(', ') : ''}`);

    // Der Anzeigen-Schalter darf das Formular nicht abschicken.
    const schalterTyp = await p.evaluate(() =>
      [...document.querySelectorAll('.auth-pass-toggle')].map((b) => b.getAttribute('type')),
    );
    pruefe(
      schalterTyp.every((t) => t === 'button'),
      `${seite}: der Anzeigen-Schalter ist type="button" und schickt nichts ab (${schalterTyp.join(', ') || 'keiner'})`,
    );
    await p.close();
  }

  // Anzeigen und Verbergen wirklich ausprobieren
  const p = await ctx.newPage();
  await p.goto(`${ADRESSE}/anmelden.html`, { waitUntil: 'load' });
  await p.waitForTimeout(400);
  await p.fill('#loginPassword', PROBE_PASSWORT);
  const vorher = await p.evaluate(() => document.getElementById('loginPassword').type);
  await p.click('.auth-pass-toggle');
  const nachher = await p.evaluate(() => ({
    typ: document.getElementById('loginPassword').type,
    text: document.querySelector('.auth-pass-toggle').textContent.trim(),
    gedrueckt: document.querySelector('.auth-pass-toggle').getAttribute('aria-pressed'),
  }));
  await p.click('.auth-pass-toggle');
  const wieder = await p.evaluate(() => document.getElementById('loginPassword').type);
  pruefe(
    vorher === 'password' && nachher.typ === 'text' && nachher.text === 'Verbergen' && nachher.gedrueckt === 'true' && wieder === 'password',
    'Passwort anzeigen und wieder verbergen wirkt, mit aria-pressed',
  );
  await p.close();
  await ctx.close();
}

// ── 3. Anmeldung (SIMULIERT) ───────────────────────────────────────────────
console.log('\n── Anmeldung (simuliert, Attrappe statt customer-auth.js) ──');
{
  const { ctx } = await kontext(1440, 900);

  // 3a Ungueltige Eingaben - ohne dass die Attrappe ueberhaupt gefragt wird
  {
    const p = await ctx.newPage();
    let gefragt = false;
    await attrappe(p, 'window.CustomerAuth = { signInWithPassword: async () => { window.__gefragt = true; return {}; } };');
    await p.goto(`${ADRESSE}/anmelden.html`, { waitUntil: 'load' });
    await p.waitForTimeout(400);

    await p.fill('#loginEmail', 'keine-mail');
    await p.fill('#loginPassword', PROBE_PASSWORT);
    await p.click('#loginForm [type="submit"]');
    await p.waitForTimeout(300);
    let stand = await p.evaluate(() => ({
      fehler: document.getElementById('loginError').textContent.trim(),
      fokus: document.activeElement?.id,
      gefragt: !!window.__gefragt,
    }));
    pruefe(stand.fehler === 'Bitte eine gültige E-Mail-Adresse eingeben.', `ungueltige E-Mail wird benannt ("${stand.fehler}")`);
    pruefe(stand.fokus === 'loginEmail', 'der Fokus springt auf das falsche Feld');
    pruefe(!stand.gefragt, 'bei ungueltiger Eingabe wird die Anmeldung gar nicht erst versucht');

    await p.fill('#loginEmail', PROBE_MAIL);
    await p.fill('#loginPassword', 'kurz');
    await p.click('#loginForm [type="submit"]');
    await p.waitForTimeout(300);
    stand = await p.evaluate(() => ({
      fehler: document.getElementById('loginError').textContent.trim(),
      fokus: document.activeElement?.id,
    }));
    pruefe(stand.fehler === 'Das Passwort muss mindestens 8 Zeichen haben.', `zu kurzes Passwort wird benannt ("${stand.fehler}")`);
    pruefe(stand.fokus === 'loginPassword', 'der Fokus springt auf das Passwortfeld');
    await p.close();
  }

  // 3b Falsche Zugangsdaten - Fehlerantwort des Dienstes
  {
    const p = await ctx.newPage();
    await attrappe(p, `window.CustomerAuth = {
      signInWithPassword: async () => { throw new Error('E-Mail oder Passwort ist falsch.'); }
    };`);
    await p.goto(`${ADRESSE}/anmelden.html`, { waitUntil: 'load' });
    await p.waitForTimeout(400);
    await p.fill('#loginEmail', PROBE_MAIL);
    await p.fill('#loginPassword', PROBE_PASSWORT);
    await p.click('#loginForm [type="submit"]');
    await p.waitForTimeout(500);
    const stand = await p.evaluate(() => ({
      fehler: document.getElementById('loginError').textContent.trim(),
      knopf: document.querySelector('#loginForm [type="submit"]').disabled,
      text: document.querySelector('[data-knopf-text]').textContent.trim(),
      adresse: location.pathname,
    }));
    pruefe(stand.fehler === 'E-Mail oder Passwort ist falsch.', `die Fehlerantwort steht sichtbar da ("${stand.fehler}")`);
    pruefe(!stand.knopf && stand.text === 'Anmelden', 'nach dem Fehler ist der Knopf wieder bedienbar');
    pruefe(stand.adresse.endsWith('anmelden.html'), 'die Seite bleibt stehen');
    await p.close();
  }

  // 3c Konto nicht verknuepft
  {
    const p = await ctx.newPage();
    await attrappe(p, `window.CustomerAuth = {
      signInWithPassword: async () => { throw new Error('CUSTOMER_NOT_FOUND'); }
    };`);
    await p.goto(`${ADRESSE}/anmelden.html`, { waitUntil: 'load' });
    await p.waitForTimeout(400);
    await p.fill('#loginEmail', PROBE_MAIL);
    await p.fill('#loginPassword', PROBE_PASSWORT);
    await p.click('#loginForm [type="submit"]');
    await p.waitForTimeout(500);
    const text = await p.evaluate(() => document.getElementById('loginError').textContent.trim());
    pruefe(
      text.startsWith('Ihr Kundenkonto konnte noch nicht mit Taxi Germersheim verknüpft werden'),
      'CUSTOMER_NOT_FOUND wird in einen verstaendlichen Satz uebersetzt',
    );
    pruefe(!text.includes('CUSTOMER_NOT_FOUND'), 'der technische Schluessel steht NICHT auf der Seite');
    await p.close();
  }

  // 3d Rueckkehrziele
  const ZIELE = [
    ['rewards.html', '/rewards.html', 'erlaubt'],
    ['meine-fahrten.html', '/meine-fahrten.html', 'erlaubt'],
    ['https://fremde-seite.invalid/', '/meinkonto.html', 'fremdes Ziel abgewiesen'],
    ['../admin/login.html', '/meinkonto.html', 'Pfadwechsel abgewiesen'],
    ['spiele.html?x=1', '/meinkonto.html', 'Ziel mit Anhang abgewiesen'],
    [null, '/meinkonto.html', 'ohne Angabe'],
  ];
  for (const [weiter, erwartet, was] of ZIELE) {
    const p = await ctx.newPage();
    await attrappe(p, `window.CustomerAuth = {
      signInWithPassword: async () => ({ customer_id: 'pruefung' })
    };`);
    const url = weiter === null
      ? `${ADRESSE}/anmelden.html`
      : `${ADRESSE}/anmelden.html?weiter=${encodeURIComponent(weiter)}`;
    await p.goto(url, { waitUntil: 'load' });
    await p.waitForTimeout(400);
    await p.fill('#loginEmail', PROBE_MAIL);
    await p.fill('#loginPassword', PROBE_PASSWORT);
    await p.click('#loginForm [type="submit"]');
    await p.waitForTimeout(700);
    const ziel = new URL(p.url()).pathname;
    pruefe(ziel === erwartet, `Rueckkehr (${was}): landet auf ${erwartet} (${ziel})`);
    await p.close();
  }

  // 3e Hinweise aus der Adresszeile
  for (const [param, erwartet] of [
    ['registered=1', 'Registrierung erfolgreich. Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse.'],
    ['loggedOut=1', 'Sie wurden abgemeldet.'],
  ]) {
    const p = await ctx.newPage();
    await p.goto(`${ADRESSE}/anmelden.html?${param}`, { waitUntil: 'load' });
    await p.waitForTimeout(400);
    const text = await p.evaluate(() => document.getElementById('authLoginNotice').textContent.trim());
    pruefe(text === erwartet, `?${param} zeigt den richtigen Hinweis`);
    await p.close();
  }

  await ctx.close();
}

// ── 4. Registrierung (SIMULIERT) ───────────────────────────────────────────
console.log('\n── Registrierung (simuliert, es wird KEIN Konto angelegt) ──');
{
  const { ctx } = await kontext(1440, 900);

  async function formularFuellen(p, abweichung = {}) {
    await p.fill('#regFirstName', abweichung.vorname ?? 'Probe');
    await p.fill('#regLastName', abweichung.nachname ?? 'Pruefung');
    await p.fill('#regEmail', abweichung.email ?? PROBE_MAIL);
    await p.fill('#regPhone', abweichung.telefon ?? '07274 3567');
    await p.fill('#regPassword', abweichung.passwort ?? PROBE_PASSWORT);
    await p.fill('#regPasswordConfirm', abweichung.zweites ?? PROBE_PASSWORT);
    if (abweichung.ohneHaken !== true) await p.check('#regTerms');
  }

  const ATTRAPPE_OHNE_SITZUNG = `window.CustomerAuth = {
    hydrateSession: async () => null,
    getSessionSnapshot: () => null,
    signUp: async () => { window.__angelegt = true; return { user: { id: 'pruefung' }, session: null }; }
  };`;

  // 4a Pflichtpruefungen
  const FAELLE = [
    [{ vorname: '' }, 'Bitte Vor- und Nachnamen angeben.', 'regFirstName'],
    [{ email: 'keine-mail' }, 'Bitte eine gültige E-Mail-Adresse eingeben.', 'regEmail'],
    [{ telefon: '12' }, 'Bitte eine gültige Telefonnummer eingeben.', 'regPhone'],
    [{ passwort: 'kurz', zweites: 'kurz' }, 'Das Passwort erfüllt noch nicht alle Regeln.', 'regPassword'],
    [{ zweites: 'AndersGanz1' }, 'Passwort und Bestätigung stimmen nicht überein.', 'regPasswordConfirm'],
    [{ ohneHaken: true }, 'Bitte die Nutzungsbedingungen akzeptieren.', 'regTerms'],
  ];
  for (const [abweichung, meldung, feld] of FAELLE) {
    const p = await ctx.newPage();
    await attrappe(p, ATTRAPPE_OHNE_SITZUNG);
    await p.goto(`${ADRESSE}/registrieren.html`, { waitUntil: 'load' });
    await p.waitForTimeout(400);
    await formularFuellen(p, abweichung);
    await p.click('#registerForm [type="submit"]');
    await p.waitForTimeout(400);
    const stand = await p.evaluate(() => ({
      fehler: document.getElementById('registerError').textContent.trim(),
      fokus: document.activeElement?.id,
      angelegt: !!window.__angelegt,
    }));
    pruefe(stand.fehler === meldung && stand.fokus === feld && !stand.angelegt,
      `${Object.keys(abweichung)[0]}: „${stand.fehler}", Fokus auf ${stand.fokus}, kein Konto angelegt`);
    await p.close();
  }

  // 4b Geglueckt, aber Bestaetigung steht aus
  {
    const p = await ctx.newPage();
    await attrappe(p, ATTRAPPE_OHNE_SITZUNG);
    await p.goto(`${ADRESSE}/registrieren.html`, { waitUntil: 'load' });
    await p.waitForTimeout(400);
    await formularFuellen(p);
    await p.click('#registerForm [type="submit"]');
    await p.waitForTimeout(700);
    const stand = await p.evaluate(() => {
      const f = document.getElementById('registerError');
      const h = document.getElementById('registerHinweis');
      const sicht = (el) => getComputedStyle(el).display !== 'none' && el.textContent.trim().length > 0;
      return {
        fehlerSichtbar: sicht(f), hinweis: h.textContent.trim(), hinweisSichtbar: sicht(h),
        knopf: document.querySelector('#registerForm [type="submit"]').disabled,
        adresse: location.pathname,
      };
    });
    pruefe(!stand.fehlerSichtbar, 'kein roter Fehlerkasten bei geglueckter Registrierung');
    pruefe(stand.hinweisSichtbar && /Konto wurde angelegt/.test(stand.hinweis), 'stattdessen ein Hinweis, was geschehen ist');
    pruefe(stand.hinweis.includes(PROBE_MAIL), 'der Hinweis nennt die Adresse, an die die Mail ging');
    pruefe(stand.knopf, 'der Knopf bleibt gesperrt - ein zweites Konto waere falsch');
    pruefe(stand.adresse.endsWith('registrieren.html'), 'die Seite bleibt stehen');
    await p.close();
  }

  // 4c Sitzung entsteht sofort (Bestaetigung abgeschaltet)
  {
    const p = await ctx.newPage();
    await attrappe(p, `window.CustomerAuth = {
      hydrateSession: async () => null,
      getSessionSnapshot: () => null,
      signUp: async () => ({ user: { id: 'pruefung' }, session: { access_token: 'x' } })
    };`);
    await p.goto(`${ADRESSE}/registrieren.html`, { waitUntil: 'load' });
    await p.waitForTimeout(400);
    await formularFuellen(p);
    await p.click('#registerForm [type="submit"]');
    await p.waitForTimeout(800);
    pruefe(p.url().includes('anmelden.html?registered=1'), `mit sofortiger Sitzung geht es zur Anmeldung (${new URL(p.url()).search})`);
    await p.close();
  }

  // 4d Fehlerantwort des Dienstes
  {
    const p = await ctx.newPage();
    await attrappe(p, `window.CustomerAuth = {
      hydrateSession: async () => null, getSessionSnapshot: () => null,
      signUp: async () => { throw new Error('User already registered'); }
    };`);
    await p.goto(`${ADRESSE}/registrieren.html`, { waitUntil: 'load' });
    await p.waitForTimeout(400);
    await formularFuellen(p);
    await p.click('#registerForm [type="submit"]');
    await p.waitForTimeout(600);
    const stand = await p.evaluate(() => ({
      fehler: document.getElementById('registerError').textContent.trim(),
      knopf: document.querySelector('#registerForm [type="submit"]').disabled,
    }));
    pruefe(stand.fehler === 'User already registered', 'die Fehlerantwort des Dienstes steht da');
    pruefe(!stand.knopf, 'nach dem Fehler ist der Knopf wieder bedienbar');
    await p.close();
  }

  // 4e Wer schon angemeldet ist, wird weitergeleitet
  {
    const p = await ctx.newPage();
    await attrappe(p, `window.CustomerAuth = {
      hydrateSession: async () => ({}),
      getSessionSnapshot: () => ({ session: { access_token: 'x' }, user: { id: 'u' }, customerId: 'c' }),
      signUp: async () => ({})
    };`);
    await p.goto(`${ADRESSE}/registrieren.html`, { waitUntil: 'load' });
    await p.waitForTimeout(900);
    pruefe(p.url().endsWith('meinkonto.html'), `eine bestehende Sitzung fuehrt weiter zu Mein Konto (${new URL(p.url()).pathname})`);
    await p.close();
  }

  // 4f Passwortstaerke
  {
    const p = await ctx.newPage();
    await attrappe(p, ATTRAPPE_OHNE_SITZUNG);
    await p.goto(`${ADRESSE}/registrieren.html`, { waitUntil: 'load' });
    await p.waitForTimeout(400);
    const stufen = [];
    for (const wert of ['abc', 'abcdefgh', 'Abcdefgh', 'Abcdefg1']) {
      await p.fill('#regPassword', wert);
      await p.waitForTimeout(150);
      stufen.push(await p.evaluate(() => ({
        text: document.getElementById('passwordStrengthText').textContent.trim(),
        erfuellt: document.querySelectorAll('#passwordRules li.is-ok').length,
      })));
    }
    pruefe(
      stufen[0].erfuellt === 0 && stufen[1].erfuellt === 1 && stufen[2].erfuellt === 2 && stufen[3].erfuellt === 3,
      `die drei Regeln haken sich der Reihe nach ab (${stufen.map((s) => s.erfuellt).join(' → ')})`,
    );
    pruefe(stufen[3].text === 'Stark', `die Staerke wird benannt (${stufen.map((s) => s.text).join(', ')})`);
    await p.close();
  }

  // 4g Der ungeloeste Verweis - als Hindernis festgehalten, nicht erfunden
  {
    const p = await ctx.newPage();
    await p.goto(`${ADRESSE}/registrieren.html`, { waitUntil: 'load' });
    await p.waitForTimeout(400);
    const ziel = await p.evaluate(() => {
      const a = [...document.querySelectorAll('label[for="regTerms"] a')];
      return a.map((x) => ({ text: x.textContent.trim(), href: x.getAttribute('href') }));
    });
    const bedingungen = ziel.find((z) => z.text === 'Nutzungsbedingungen');
    pruefe(!!bedingungen, 'das Haekchen verweist weiterhin auf Nutzungsbedingungen');
    pruefe(
      bedingungen?.href === 'datenschutz.html',
      `der Verweis zeigt unveraendert auf datenschutz.html - es wurde KEIN Text erfunden (${bedingungen?.href})`,
    );
    await p.close();
  }

  await ctx.close();
}

// ── 5. Passwort vergessen (SIMULIERT) ──────────────────────────────────────
console.log('\n── Passwort vergessen (simuliert, es wird KEINE Mail ausgeloest) ──');
{
  const { ctx } = await kontext(1440, 900);

  const MIT_CLIENT = (verhalten) => `window.CustomerAuth = {
    getClient: async () => ({ auth: { resetPasswordForEmail: async (mail, opt) => {
      window.__ziel = opt && opt.redirectTo;
      window.__gerufen = true;
      ${verhalten}
    } } })
  };`;

  // 5a Ungueltige Adresse
  {
    const p = await ctx.newPage();
    await attrappe(p, MIT_CLIENT('return {};'));
    await p.goto(`${ADRESSE}/passwort-vergessen.html`, { waitUntil: 'load' });
    await p.waitForTimeout(400);
    await p.fill('#forgotEmail', 'keine-mail');
    await p.click('#forgotForm [type="submit"]');
    await p.waitForTimeout(300);
    const stand = await p.evaluate(() => ({
      fehler: document.getElementById('forgotError').textContent.trim(),
      gerufen: !!window.__gerufen,
    }));
    pruefe(stand.fehler === 'Bitte eine gültige E-Mail-Adresse eingeben.', 'ungueltige Adresse wird benannt');
    pruefe(!stand.gerufen, 'und es wird gar nichts angefordert');
    await p.close();
  }

  // 5b Erfolg
  {
    const p = await ctx.newPage();
    await attrappe(p, MIT_CLIENT('return {};'));
    await p.goto(`${ADRESSE}/passwort-vergessen.html`, { waitUntil: 'load' });
    await p.waitForTimeout(400);
    await p.fill('#forgotEmail', PROBE_MAIL);
    await p.click('#forgotForm [type="submit"]');
    await p.waitForTimeout(600);
    const stand = await p.evaluate(() => ({
      erfolg: !document.getElementById('forgotSuccess').hidden,
      feld: document.getElementById('forgotEmail').value,
      ziel: window.__ziel,
      knopf: document.querySelector('#forgotForm [type="submit"]').textContent.trim(),
    }));
    pruefe(stand.erfolg, 'die Bestaetigung erscheint');
    pruefe(stand.feld === '', 'das Feld ist danach geleert');
    pruefe(String(stand.ziel).endsWith('/passwort-zuruecksetzen.html'), `das Rueckkehrziel zeigt auf die Reset-Seite (${stand.ziel})`);
    pruefe(stand.knopf === 'Reset-Link senden', 'der Knopf ist wieder beschriftet wie zuvor');
    await p.close();
  }

  // 5c Unbekannte Adresse - MUSS gleich aussehen wie Erfolg
  {
    const p = await ctx.newPage();
    await attrappe(p, MIT_CLIENT("const e = new Error('User not found'); e.code = 'user_not_found'; throw e;"));
    await p.goto(`${ADRESSE}/passwort-vergessen.html`, { waitUntil: 'load' });
    await p.waitForTimeout(400);
    await p.fill('#forgotEmail', PROBE_MAIL);
    await p.click('#forgotForm [type="submit"]');
    await p.waitForTimeout(600);
    const stand = await p.evaluate(() => ({
      erfolg: !document.getElementById('forgotSuccess').hidden,
      fehler: document.getElementById('forgotError').textContent.trim(),
      text: document.getElementById('forgotSuccess').innerText,
    }));
    pruefe(stand.erfolg && !stand.fehler, 'eine unbekannte Adresse sieht GENAUSO aus wie ein Treffer');
    pruefe(
      !/kein Konto|nicht gefunden|existiert nicht|unbekannt/i.test(stand.text),
      'die Seite verraet mit keinem Wort, ob es das Konto gibt',
    );
    await p.close();
  }

  // 5d Echter Fehler des Dienstes
  {
    const p = await ctx.newPage();
    await attrappe(p, MIT_CLIENT("throw new Error('service unavailable');"));
    await p.goto(`${ADRESSE}/passwort-vergessen.html`, { waitUntil: 'load' });
    await p.waitForTimeout(400);
    await p.fill('#forgotEmail', PROBE_MAIL);
    await p.click('#forgotForm [type="submit"]');
    await p.waitForTimeout(600);
    const stand = await p.evaluate(() => ({
      erfolg: !document.getElementById('forgotSuccess').hidden,
      fehler: document.getElementById('forgotError').textContent.trim(),
    }));
    pruefe(!stand.erfolg && stand.fehler.startsWith('Der Reset-Link konnte gerade nicht gesendet werden'),
      `ein echter Fehler wird als solcher gezeigt ("${stand.fehler}")`);
    await p.close();
  }

  await ctx.close();
}

// ── 6. Neues Passwort (SIMULIERT) ──────────────────────────────────────────
console.log('\n── Neues Passwort (simuliert) ──');
{
  const { ctx } = await kontext(1440, 900);

  const RESET = (sitzung, aendern = 'return {};') => `window.CustomerAuth = {
    signOut: async () => { window.__abgemeldet = true; },
    getClient: async () => ({ auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }),
      getSession: async () => (${sitzung}),
      updateUser: async () => { window.__geaendert = true; ${aendern} }
    } })
  };`;

  const GUELTIG = "{ data: { session: { access_token: 'x', user: { id: 'u' } } } }";
  const KEINE = '{ data: { session: null } }';

  // 6a Ohne Merkmal in der Adresse -> ungueltig
  {
    const p = await ctx.newPage();
    await attrappe(p, RESET(GUELTIG));
    await p.goto(`${ADRESSE}/passwort-zuruecksetzen.html`, { waitUntil: 'load' });
    await p.waitForTimeout(800);
    const stand = await p.evaluate(() => ({
      pruefen: !document.getElementById('recoveryChecking').hidden,
      ungueltig: !document.getElementById('recoveryInvalid').hidden,
      formular: !document.getElementById('resetPasswordForm').hidden,
    }));
    pruefe(!stand.pruefen && stand.ungueltig && !stand.formular,
      'ohne Zugangsmerkmal: „Link nicht mehr gültig", Formular bleibt verborgen');
    await p.close();
  }

  // 6b Merkmal da, aber keine Sitzung -> ungueltig
  {
    const p = await ctx.newPage();
    await attrappe(p, RESET(KEINE));
    await p.goto(`${ADRESSE}/passwort-zuruecksetzen.html#access_token=xyz&type=recovery`, { waitUntil: 'load' });
    await p.waitForTimeout(800);
    const stand = await p.evaluate(() => ({
      ungueltig: !document.getElementById('recoveryInvalid').hidden,
      adresse: location.href,
    }));
    pruefe(stand.ungueltig, 'Merkmal ohne gueltige Sitzung: ebenfalls ungueltig');
    pruefe(!stand.adresse.includes('access_token'), 'und das Zugangsmerkmal ist aus der Adresszeile verschwunden');
    await p.close();
  }

  // 6c Gueltig -> Formular, dann aendern
  {
    const p = await ctx.newPage();
    await attrappe(p, RESET(GUELTIG));
    await p.goto(`${ADRESSE}/passwort-zuruecksetzen.html#access_token=xyz&type=recovery`, { waitUntil: 'load' });
    await p.waitForTimeout(900);
    let stand = await p.evaluate(() => ({
      formular: !document.getElementById('resetPasswordForm').hidden,
      adresse: location.href,
      fokus: document.activeElement?.id,
    }));
    pruefe(stand.formular, 'mit gueltigem Link erscheint das Formular');
    pruefe(!stand.adresse.includes('access_token'), 'das Zugangsmerkmal steht nicht mehr in der Adresszeile');
    pruefe(stand.fokus === 'newPassword', 'der Fokus steht im ersten Feld');

    // Regeln nicht erfuellt
    await p.fill('#newPassword', 'kurz');
    await p.fill('#confirmPassword', 'kurz');
    await p.click('#resetPasswordForm [type="submit"]');
    await p.waitForTimeout(300);
    stand = await p.evaluate(() => ({
      fehler: document.getElementById('resetError').textContent.trim(),
      geaendert: !!window.__geaendert,
    }));
    pruefe(stand.fehler === 'Das Passwort erfüllt noch nicht alle Regeln.' && !stand.geaendert,
      'zu schwaches Passwort wird abgewiesen, ohne etwas zu aendern');

    // Wiederholung weicht ab
    await p.fill('#newPassword', PROBE_PASSWORT);
    await p.fill('#confirmPassword', 'AndersGanz1');
    await p.click('#resetPasswordForm [type="submit"]');
    await p.waitForTimeout(300);
    stand = await p.evaluate(() => ({
      fehler: document.getElementById('resetError').textContent.trim(),
      geaendert: !!window.__geaendert,
    }));
    pruefe(stand.fehler === 'Passwort und Bestätigung stimmen nicht überein.' && !stand.geaendert,
      'abweichende Wiederholung wird abgewiesen, ohne etwas zu aendern');

    // Jetzt richtig
    await p.fill('#confirmPassword', PROBE_PASSWORT);
    await p.click('#resetPasswordForm [type="submit"]');
    await p.waitForTimeout(700);
    stand = await p.evaluate(() => ({
      erfolg: !document.getElementById('recoverySuccess').hidden,
      formular: !document.getElementById('resetPasswordForm').hidden,
      geaendert: !!window.__geaendert,
      abgemeldet: !!window.__abgemeldet,
      feld: document.getElementById('newPassword').value,
    }));
    pruefe(stand.geaendert && stand.erfolg && !stand.formular, 'mit gueltigen Angaben erscheint die Erfolgsmeldung');
    pruefe(stand.abgemeldet, 'danach wird abgemeldet - die Sitzung des Reset-Links lebt nicht weiter');
    pruefe(stand.feld === '', 'die Passwortfelder sind geleert');
    await p.close();
  }

  // 6d Fehler beim Speichern
  {
    const p = await ctx.newPage();
    await attrappe(p, RESET(GUELTIG, "return { error: new Error('nope') };"));
    await p.goto(`${ADRESSE}/passwort-zuruecksetzen.html#access_token=xyz&type=recovery`, { waitUntil: 'load' });
    await p.waitForTimeout(900);
    await p.fill('#newPassword', PROBE_PASSWORT);
    await p.fill('#confirmPassword', PROBE_PASSWORT);
    await p.click('#resetPasswordForm [type="submit"]');
    await p.waitForTimeout(600);
    const stand = await p.evaluate(() => ({
      fehler: document.getElementById('resetError').textContent.trim(),
      knopf: document.querySelector('#resetPasswordForm [type="submit"]').disabled,
      erfolg: !document.getElementById('recoverySuccess').hidden,
    }));
    pruefe(stand.fehler.startsWith('Das Passwort konnte gerade nicht geändert werden'), 'ein Fehler beim Speichern wird benannt');
    pruefe(!stand.erfolg && !stand.knopf, 'keine Erfolgsmeldung, Knopf wieder bedienbar');
    await p.close();
  }

  await ctx.close();
}

// ── 7. Nichts Geheimes im Quelltext ────────────────────────────────────────
console.log('\n── Keine Geheimnisse in der Ausgabe ──');
for (const seite of SEITEN) {
  const text = await readFile(join(AUSGABE, seite), 'utf8');
  const treffer = [
    /eyJhbGciOi/,                       // ein JWT
    /access_token\s*[:=]\s*["'][^"']+/, // ein festes Merkmal
    /password\s*[:=]\s*["'][^"']{4,}/i, // ein festes Passwort
  ].filter((r) => r.test(text));
  pruefe(treffer.length === 0, `${seite}: kein Merkmal und kein Passwort im ausgelieferten Quelltext`);
}

await browser.close();
server.close();

console.log(`\nbestanden: ${ok.length}   fehlgeschlagen: ${fehl.length}`);
console.log('\nALLE Ablaufpruefungen sind SIMULIERT: customer-auth.js war durch eine');
console.log('Attrappe ersetzt. Sie belegen KEINE funktionierende Anmeldung, keine');
console.log('Registrierung und keine Mailzustellung gegen Supabase.');
console.log('Es wurde kein Konto angelegt und keine Mail ausgeloest.');
if (fehl.length) {
  console.log('\n' + fehl.join('\n'));
  process.exitCode = 1;
}
