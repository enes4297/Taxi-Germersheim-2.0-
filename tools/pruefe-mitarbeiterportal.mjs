// ═══════════════════════════════════════════════════════════════════════════
// Mitarbeiterportal — Gestaltung, Bedienung und Zugangsschutz
// ═══════════════════════════════════════════════════════════════════════════
//
// ───────────────────────────────────────────────────────────────────────────
// WAS HIER SIMULIERT IST — UND WAS DAS BEDEUTET
// ───────────────────────────────────────────────────────────────────────────
//
//   ALLES. Der Netzverkehr nach aussen ist abgeschnitten. Wo eine Sitzung
//   noetig ist, wird `employee-supabase.js` auf NETZEBENE durch eine
//   Attrappe ersetzt - eine Attrappe auf `window` allein wuerde vom echten
//   Skript ueberschrieben.
//
//   Alle Namen, Zeiten, Kennzeichen und Dateien sind erfunden. Es wird
//   KEINE Anmeldung durchgefuehrt, KEINE Datei hochgeladen, KEIN Datensatz
//   angelegt oder geaendert.
//
//   NICHT belegt und nur am echten System pruefbar:
//     - ob die Regeln der Datenbank (RLS) fremde Daten wirklich abweisen
//     - ob eine Mitarbeiterrolle wirklich keine Verwaltungsrechte hat
//     - ob eine Datei im Speicher ohne Signatur unerreichbar ist
//   Diese drei bleiben als offener manueller Test stehen.
//
// ───────────────────────────────────────────────────────────────────────────
// DIE BEHOBENEN SICHERHEITSBEFUNDE
// ───────────────────────────────────────────────────────────────────────────
//
//   1. Eine Marke im Browserspeicher genuegte, um das Portal zu oeffnen.
//   2. Fiel die Konfiguration aus, schaltete das Portal in einen Demo-Modus
//      mit ERFUNDENEN Personen - und die Anmeldeseite nannte Zugangsdaten.
//   3. Die Supabase-Bibliothek kam von einem fremden CDN, ohne feste
//      Version.
//
// Aufruf: npm run portal-pruefen   (Testserver auf Port 5502)

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = await import(
  new URL('../fahrer/tests/node_modules/playwright/index.mjs', import.meta.url).href
);

const WURZEL = fileURLToPath(new URL('..', import.meta.url));
const AUSGABE = join(WURZEL, 'dist-oeffentlich');
const PORT = 5502;
const ADRESSE = `http://127.0.0.1:${PORT}`;

const TYP = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json',
};

const ok = [];
const fehl = [];
const pruefe = (b, t) => { (b ? ok : fehl).push(t); console.log((b ? 'OK   ' : 'FEHL ') + t); };
const hinweis = (t) => console.log('     · ' + t);

if (!existsSync(AUSGABE)) {
  console.error('Der Ausgabeordner fehlt. Zuerst "npm run build" ausfuehren.');
  process.exit(1);
}

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

/** Erfundene Testdaten. Keine echte Person, kein echtes Fahrzeug. */
function attrappe(lage = {}) {
  const l = { sitzung: true, leer: false, langsam: 0, sendeDauer: 0, fehler: false, fahrzeug: true, ...lage };
  return `
    window.TaxiSupabaseConfig = { isConfigured: true, url: 'https://test.invalid', publishableKey: 'test' };
    (() => {
      const L = ${JSON.stringify(l)};
      const heute = new Date();
      const tag = (v) => { const d = new Date(heute); d.setDate(d.getDate() + v); return d.toISOString().slice(0, 10); };
      const warte = (w) => new Promise((f, r) => setTimeout(() => (L.fehler ? r(new Error('TEST')) : f(w)), L.langsam));
      window.EmployeeSupabase = {
        isConfigured: () => true,
        signIn: async () => ({ user: { id: 't' }, employeeId: 'TEST-1' }),
        checkSession: async () => warte(L.sitzung ? { user: { id: 't' }, employeeId: 'TEST-1' } : null),
        signOut: async () => { if (L.abmeldenScheitert) throw new Error('ABMELDUNG_NICHT_BESTAETIGT'); return true; },
        getMyEmployee: async () => warte({ id: 'TEST-1', first_name: 'Testperson', last_name: 'Beispiel', employment_type: 'Vollzeit', status: 'aktiv' }),
        getMyPublishedShifts: async () => warte(L.leer ? [] : [
          { id: 's1', shift_date: tag(0), start_time: '06:00', end_time: '14:00', vehicle_id: L.fahrzeug ? 'v1' : null, plan_status: 'veroeffentlicht' },
          { id: 's2', shift_date: tag(1), start_time: '14:00', end_time: '22:00', vehicle_id: null, plan_status: 'veroeffentlicht' }
        ]),
        getVehicle: async (id) => warte(id === 'v1' ? { id: 'v1', name: 'Testwagen', license_plate: 'GER-TX 100' } : null),
        getMyVacationRequests: async () => warte([]),
        createVacationRequest: async () => new Promise((f) => setTimeout(() => f({ ok: true, data: { id: 'neu' } }), L.sendeDauer || 0)),
        getDocumentTypes: async () => warte(L.leer ? [] : [{ id: 'd1', label: 'Führerschein' }]),
        getMyDocumentSubmissions: async () => warte([]),
        uploadDocumentSubmission: async () => ({ ok: true, data: { id: 'neu' } }),
        getMySicknessReports: async () => warte([]),
        createSicknessReport: async () => new Promise((f) => setTimeout(() => f({ ok: true, data: { id: 'neu' } }), L.sendeDauer || 0)),
        getSignedDocumentUrl: async () => ({ ok: true, url: 'about:blank' })
      };
    })();
  `;
}

/** Kontext mit abgeschnittenem Netz und ersetzter Portalanbindung. */
async function lage(vp, zustand = {}, optionen = {}) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: optionen.scale || 1 });
  await ctx.route('**://**', (r) => {
    const u = r.request().url();
    if (optionen.konfigFehlt && /admin\/supabase-config\.js/.test(u)) return r.fulfill({ status: 404, body: '' });
    if (!optionen.echteAnbindung && /fahrer\/employee-supabase\.js/.test(u)) {
      return r.fulfill({ status: 200, contentType: 'text/javascript', body: attrappe(zustand) });
    }
    return u.startsWith(ADRESSE) ? r.continue() : r.abort();
  });
  if (optionen.marke !== false) {
    await ctx.addInitScript(() => {
      try { localStorage.setItem('tgEmployeeDemoSession', JSON.stringify({ authenticated: true })); } catch (e) { /* gesperrt */ }
    });
  }
  if (optionen.speicherGesperrt) {
    await ctx.addInitScript(() => {
      const werfen = () => { throw new Error('Speicher gesperrt'); };
      try {
        Object.defineProperty(window, 'localStorage', { get: werfen, configurable: true });
      } catch (e) { /* nicht ersetzbar */ }
    });
  }
  return ctx;
}

// ═══ 1. Zugangsschutz ══════════════════════════════════════════════════════
console.log('\n── 1. Zugangsschutz ──');
{
  const FAELLE = [
    ['abgemeldet (keine Sitzung)', { sitzung: false }, {}, 'index.html'],
    ['gefaelschte Marke im Speicher, Konfiguration fehlt', {}, { konfigFehlt: true, echteAnbindung: true }, 'index.html'],
    ['Dienst antwortet nicht', { fehler: true }, {}, 'index.html'],
    ['angemeldet', {}, {}, 'mitarbeiter.html'],
  ];
  for (const [name, zustand, opt, erwartet] of FAELLE) {
    const ctx = await lage({ width: 390, height: 844 }, zustand, opt);
    const page = await ctx.newPage();
    await page.goto(`${ADRESSE}/fahrer/mitarbeiter.html`, { waitUntil: 'load' });
    await page.waitForTimeout(2200);
    const wo = await page.evaluate(() => window.location.pathname.split('/').pop());
    pruefe(wo === erwartet, `${name}: landet auf ${erwartet} (${wo})`);
    if (erwartet === 'index.html') {
      const m = await page.evaluate(() => ({
        portal: Boolean(document.querySelector('.portal-shell')),
        adresse: window.location.search,
      }));
      pruefe(!m.portal, `${name}: kein Portalinhalt im Dokument`);
      pruefe(!/grund=|abmeldung=/.test(m.adresse), `${name}: der Grund steht nicht mehr in der Adresszeile`);
    }
    await ctx.close();
  }

  // Der alte Waechter darf nicht zurueckkommen.
  const quelle = await readFile(join(AUSGABE, 'fahrer', 'mitarbeiter.js'), 'utf8');
  pruefe(!/function requireDemoSession/.test(quelle),
    'der Waechter "nur eine Marke im Browserspeicher" ist entfernt');
  const anmeldung = await readFile(join(AUSGABE, 'fahrer', 'mitarbeiter-login.js'), 'utf8');
  pruefe(!/identifier === "demo"/.test(anmeldung) && !/Demo-Zugang/.test(anmeldung),
    'der Demo-Zugang und sein Hinweis sind entfernt');
  const anmeldeseite = await readFile(join(AUSGABE, 'fahrer', 'index.html'), 'utf8');
  pruefe(!/Demo-Zugang/.test(anmeldeseite), 'die Anmeldeseite nennt keine Zugangsdaten mehr');
}

// ═══ 2. Keine fremden Aufrufe, keine erfundenen Personen ═══════════════════
console.log('\n── 2. Herkunft und Inhalte ──');
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const fremd = [];
  await ctx.route('**://**', (r) => {
    const u = r.request().url();
    if (!u.startsWith(ADRESSE)) { fremd.push(u.split('?')[0]); return r.abort(); }
    return r.continue();
  });
  const page = await ctx.newPage();
  await page.goto(`${ADRESSE}/fahrer/index.html`, { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  pruefe(!fremd.some((u) => /jsdelivr|unpkg|cdn\./.test(u)),
    `die Anmeldeseite laedt nichts von einem fremden CDN (${fremd.length ? fremd.join(', ') : 'keine Aufrufe nach aussen'})`);
  await ctx.close();

  const ctx2 = await lage({ width: 390, height: 844 });
  const page2 = await ctx2.newPage();
  await page2.goto(`${ADRESSE}/fahrer/mitarbeiter.html`, { waitUntil: 'load' });
  await page2.waitForTimeout(2500);
  const erfunden = await page2.evaluate(() =>
    (document.body.innerText.match(/Mila|Becker|Emir|Kaya|Neumann|Hoffmann|Demir|MA-10\d/g) || []));
  pruefe(erfunden.length === 0,
    `keine erfundenen Personen im Portal (${erfunden.length ? [...new Set(erfunden)].join(', ') : 'keine'})`);
  await ctx2.close();
}

// ═══ 3. Datenstaende ═══════════════════════════════════════════════════════
console.log('\n── 3. Lade-, Leer- und Fehlerzustaende ──');
{
  const FAELLE = [
    ['Schicht heute und morgen', {}, /06:00/, true],
    ['kein veroeffentlichter Plan', { leer: true }, null, true],
        /* 600 ms je Aufruf. Das Portal fragt nacheinander Sitzung, Person,
       Schichten, Fahrzeug, Urlaub, Dokumente und Krankmeldungen ab -
       bei 1200 ms summierte sich das ueber die Wartezeit der Pruefung
       hinaus, und der Fehlschlag lag an der Pruefung, nicht am Portal. */
    ['langsame Antwort', { langsam: 600 }, /06:00/, true],
  ];
  for (const [name, zustand, muster, sollPortal] of FAELLE) {
    const ctx = await lage({ width: 390, height: 844 }, zustand);
    const page = await ctx.newPage();
    const fehler = [];
    page.on('pageerror', (e) => fehler.push(String(e).slice(0, 70)));
    await page.goto(`${ADRESSE}/fahrer/mitarbeiter.html`, { waitUntil: 'load' });
    if (zustand.langsam) {
      const laedt = await page.evaluate(() => document.body.hasAttribute('data-portal-loading'));
      pruefe(laedt, `${name}: waehrend des Ladens ist der Inhalt verborgen`);
    }
    await page.waitForTimeout(zustand.langsam ? 6500 : 3200);
    const m = await page.evaluate(() => ({
      portal: Boolean(document.querySelector('.portal-shell')) && !document.body.hasAttribute('data-portal-loading'),
      text: document.body.innerText.replace(/\s+/g, ' '),
    }));
    pruefe(m.portal === sollPortal, `${name}: Portal sichtbar = ${sollPortal}`);
    if (muster) pruefe(muster.test(m.text), `${name}: die Schichtzeit steht da`);
    if (zustand.leer) {
      pruefe(!/06:00|14:00/.test(m.text), `${name}: es wird keine Schicht erfunden`);
      pruefe(/frei|kein|nicht/i.test(m.text), `${name}: der leere Stand wird benannt`);
    }
    pruefe(fehler.length === 0, `${name}: keine Skriptfehler${fehler.length ? ' (' + fehler[0] + ')' : ''}`);
    await ctx.close();
  }

  // Fahrzeug vorhanden und nicht vorhanden - in derselben Woche.
  const ctx = await lage({ width: 1440, height: 900 });
  const page = await ctx.newPage();
  await page.goto(`${ADRESSE}/fahrer/mitarbeiter.html`, { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const t = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
  pruefe(/GER-TX 100/.test(t), 'zugewiesenes Fahrzeug wird genannt');
  pruefe(/Fahrzeug offen|nicht zugewiesen/.test(t), 'ein fehlendes Fahrzeug wird als offen ausgewiesen, nicht erfunden');
  pruefe(/Heute/i.test(t) && /Morgen/i.test(t), '"Heute" und "Morgen" sind benannt');
  await ctx.close();
}

// ═══ 4. Abmelden ═══════════════════════════════════════════════════════════
console.log('\n── 4. Abmelden ──');
{
  for (const [name, zustand, erwartet] of [
    ['Dienst bestaetigt', {}, ''],
    ['Dienst bestaetigt NICHT', { abmeldenScheitert: true }, 'unbestaetigt'],
  ]) {
    /* Die Marke wird bewusst NICHT gesetzt: Sie traegt keine Entscheidung
       mehr, und bei jedem Seitenaufruf neu gesetzt wuerde sie nach der
       Rueckleitung sofort wieder dastehen - die Probe liefe ins Leere. */
    const ctx = await lage({ width: 1440, height: 900 }, zustand, { marke: false });
    const page = await ctx.newPage();
    await page.goto(`${ADRESSE}/fahrer/mitarbeiter.html`, { waitUntil: 'load' });
    await page.waitForTimeout(2200);
    await page.click('[data-portal-avatar]');
    await page.waitForTimeout(300);
    await page.click('[data-portal-logout]');
    await page.waitForTimeout(1800);
    const m = await page.evaluate(() => ({
      wo: window.location.pathname.split('/').pop(),
      marke: (() => { try { return localStorage.getItem('tgEmployeeDemoSession'); } catch { return null; } })(),
      meldung: (document.querySelector('[data-login-message]')?.textContent || '').replace(/\s+/g, ' ').trim(),
    }));
    pruefe(m.wo === 'index.html', `${name}: zurueck auf der Anmeldeseite (${m.wo})`);
    pruefe(m.marke === null, `${name}: die oertliche Marke ist entfernt`);
    if (erwartet === 'unbestaetigt') {
      pruefe(/nicht bestätigt/i.test(m.meldung),
        `${name}: es wird ehrlich gesagt, dass der Widerruf nicht bestaetigt wurde`);
      pruefe(!/ABMELDUNG_NICHT_BESTAETIGT|Error/.test(m.meldung),
        `${name}: kein technischer Wortlaut in der Meldung`);
    }
    await ctx.close();
  }
}

// ═══ 5. Dateiprüfung in der echten Anbindung ═══════════════════════════════
console.log('\n── 5. Dateityp und Dateigroesse (echte employee-supabase.js) ──');
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.route('**://**', (r) => (r.request().url().startsWith(ADRESSE) ? r.continue() : r.abort()));
  const page = await ctx.newPage();
  await page.goto(`${ADRESSE}/fahrer/index.html`, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  const m = await page.evaluate(async () => {
    const ES = window.EmployeeSupabase;
    const datei = (name, typ, groesse) => new File([new Uint8Array(groesse)], name, { type: typ });
    const zuGross = await ES.uploadDocumentSubmission({ file: datei('gross.pdf', 'application/pdf', 12 * 1024 * 1024), documentTypeId: 'd1' });
    const falscherTyp = await ES.uploadDocumentSubmission({ file: datei('skript.exe', 'application/x-msdownload', 10), documentTypeId: 'd1' });
    const ohneDatei = await ES.uploadDocumentSubmission({ file: null, documentTypeId: 'd1' });
    return { zuGross, falscherTyp, ohneDatei };
  });
  pruefe(m.zuGross.error === 'FILE_TOO_LARGE', `zu grosse Datei wird abgewiesen (${m.zuGross.error})`);
  pruefe(m.falscherTyp.error === 'FILE_TYPE_NOT_ALLOWED', `unzulaessiger Dateityp wird abgewiesen (${m.falscherTyp.error})`);
  pruefe(m.ohneDatei.error === 'NO_FILE', `ohne Datei wird nichts gesendet (${m.ohneDatei.error})`);
  hinweis('Geprueft wird hier VOR jedem Netzaufruf - es ging keine Datei hinaus.');
  await ctx.close();
}

// ═══ 6. Gesperrter Browserspeicher ═════════════════════════════════════════
console.log('\n── 6. Gesperrter Browserspeicher ──');
{
  const ctx = await lage({ width: 390, height: 844 }, {}, { speicherGesperrt: true, marke: false });
  const page = await ctx.newPage();
  const fehler = [];
  page.on('pageerror', (e) => fehler.push(String(e).slice(0, 70)));
  await page.goto(`${ADRESSE}/fahrer/mitarbeiter.html`, { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  pruefe(fehler.length === 0,
    `bei gesperrtem Speicher bricht nichts ab${fehler.length ? ' (' + fehler[0] + ')' : ''}`);
  await ctx.close();
}

// ═══ 7. Darstellung und Bedienbarkeit ══════════════════════════════════════
console.log('\n── 7. Darstellung ──');
{
  for (const [name, w] of [['320 px', 320], ['390 px', 390], ['430 px', 430], ['Desktop 1440 px', 1440]]) {
    const ctx = await lage({ width: w, height: w < 500 ? 844 : 900 });
    const page = await ctx.newPage();
    const fehler = [], fehlend = [];
    page.on('pageerror', (e) => fehler.push(String(e).slice(0, 70)));
    page.on('response', (r) => { if (r.status() >= 400 && r.url().startsWith(ADRESSE)) fehlend.push(r.url().replace(ADRESSE, '')); });
    await page.goto(`${ADRESSE}/fahrer/mitarbeiter.html`, { waitUntil: 'load' });
    await page.waitForTimeout(2500);
    const m = await page.evaluate(() => {
      const d = document.documentElement;
      const felder = [...document.querySelectorAll('input,select,textarea')]
        .filter((e) => e.offsetParent !== null && e.type !== 'hidden')
        .map((e) => parseFloat(getComputedStyle(e).fontSize)).filter((px) => px < 16);
      const klein = [...document.querySelectorAll('button,a')]
        .filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && (b.height < 44 || b.width < 44); }).length;
      return {
        ueberlauf: d.scrollWidth - d.clientWidth,
        kleineFelder: felder.length, kleineFlaechen: klein,
        schrift: getComputedStyle(document.body).fontFamily,
        untereLeiste: Boolean(document.querySelector('[class*="tabbar"], .bottom-nav')),
      };
    });
    pruefe(m.ueberlauf <= 0, `${name}: kein waagerechter Ueberlauf (${m.ueberlauf} px)`);
    pruefe(m.kleineFelder === 0, `${name}: kein Eingabefeld unter 16 px (${m.kleineFelder})`);
    pruefe(m.kleineFlaechen === 0, `${name}: keine Bedienflaeche unter 44 px (${m.kleineFlaechen})`);
    pruefe(/Outfit/.test(m.schrift), `${name}: die Marken-Schrift ist geladen`);
    pruefe(!m.untereLeiste, `${name}: keine untere Navigationsleiste`);
    pruefe(fehler.length === 0, `${name}: keine Skriptfehler${fehler.length ? ' (' + fehler[0] + ')' : ''}`);
    pruefe(fehlend.length === 0, `${name}: keine fehlende Datei${fehlend.length ? ' (' + [...new Set(fehlend)].join(', ') + ')' : ''}`);
    await ctx.close();
  }

  // Tastatur und sichtbarer Fokus.
  const ctx = await lage({ width: 1440, height: 900 });
  const page = await ctx.newPage();
  await page.goto(`${ADRESSE}/fahrer/mitarbeiter.html`, { waitUntil: 'load' });
  await page.waitForTimeout(2200);
  const fokus = [];
  for (let i = 0; i < 8; i += 1) {
    await page.keyboard.press('Tab');
    fokus.push(await page.evaluate(() => {
      const e = document.activeElement;
      if (!e || e === document.body) return null;
      const s = getComputedStyle(e);
      return { marke: e.tagName, umriss: s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0 };
    }));
  }
  const echte = fokus.filter(Boolean);
  pruefe(echte.length >= 5, `Tastaturbedienung: ${echte.length} Elemente in 8 Schritten erreicht`);
  pruefe(echte.every((f) => f.umriss), 'jedes davon zeigt einen sichtbaren Umriss');
  await ctx.close();
}

// ═══ 8. Schritt 029: Ablösung von admin/personal-shared.js ════════════════
console.log('\n── 8. Ablösung von admin/personal-shared.js ──');
{
  const portal = await readFile(join(AUSGABE, 'fahrer', 'mitarbeiter.js'), 'utf8');
  const seite = await readFile(join(AUSGABE, 'fahrer', 'mitarbeiter.html'), 'utf8');
  /*
    Geprueft wird der SKRIPT-VERWEIS, nicht das blosse Wort: Im Markup
    steht an der alten Stelle ein Kommentar, der erklaert, warum dort
    nichts mehr geladen wird. Der erste Anlauf dieser Pruefung traf genau
    diesen Kommentar und meldete einen Fehler, wo keiner war.
  */
  pruefe(!/<script[^>]*personal-shared/.test(seite),
    'mitarbeiter.html laedt admin/personal-shared.js nicht mehr');
  pruefe(!/\bP\.[a-zA-Z]/.test(portal), 'im Portalskript steht kein Aufruf in das Adminmodul mehr');
  /* Dasselbe hier: Der Modulname steht noch in der Begruendung, aber
     nirgends mehr als Zugriff. Die Kommentare werden vorher entfernt. */
  const ohneKommentare = portal.replace(/\/\*[\s\S]*?\*\//g, '');
  pruefe(!/AdminPersonnelDemo/.test(ohneKommentare),
    'auf window.AdminPersonnelDemo wird nicht mehr zugegriffen');

  /* Und der Beweis im Betrieb: Das Modul wird gar nicht erst geladen. */
  const ctx = await lage({ width: 1440, height: 900 });
  const page = await ctx.newPage();
  const geladen = [];
  page.on('request', (r) => { if (/personal-shared/.test(r.url())) geladen.push(r.url()); });
  await page.goto(`${ADRESSE}/fahrer/mitarbeiter.html`, { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const vorhanden = await page.evaluate(() => typeof window.AdminPersonnelDemo);
  pruefe(geladen.length === 0, `das Modul wird nicht angefordert (${geladen.length} Anfragen)`);
  pruefe(vorhanden === 'undefined', `window.AdminPersonnelDemo ist nicht vorhanden (${vorhanden})`);
  const text = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
  pruefe(!/Mila|Becker|Emir|Kaya|Neumann|Hoffmann|Demir|MA-10\d/.test(text),
    'keine erfundenen Personendaten im Portal');
  await ctx.close();
}

// ═══ 9. Späte Antwort nach dem Abmelden ═══════════════════════════════════
console.log('\n── 9. Späte Antwort nach dem Abmelden ──');
{
  /*
    Die Datenabfrage antwortet absichtlich erst nach drei Sekunden. In
    dieser Zeit wird abgemeldet. Die Antwort darf danach nichts mehr auf
    den Bildschirm zurueckschreiben.
  */
  const ctx = await lage({ width: 1440, height: 900 }, { langsam: 3000 }, { marke: false });
  const page = await ctx.newPage();
  await page.goto(`${ADRESSE}/fahrer/mitarbeiter.html`, { waitUntil: 'load' });
  await page.waitForTimeout(1000);
  const ausgeloest = await page.evaluate(() => {
    const knopf = document.querySelector('[data-portal-logout]');
    if (!knopf) return false;
    knopf.click();
    return true;
  });
  pruefe(ausgeloest, 'Abmelden waehrend der laufenden Abfrage ausgeloest');
  await page.waitForTimeout(400);
  const direkt = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
  pruefe(!/Testperson|Beispiel|GER-TX/.test(direkt),
    'unmittelbar nach dem Klick steht nichts Persoenliches mehr da');
  await page.waitForTimeout(5000);
  const spaet = await page.evaluate(() => ({
    wo: window.location.pathname.split('/').pop(),
    text: document.body.innerText.replace(/\s+/g, ' '),
  }));
  pruefe(!/Testperson|Beispiel|GER-TX/.test(spaet.text),
    `die verspaetete Antwort schreibt nichts zurueck (auf ${spaet.wo})`);
  await ctx.close();
}

// ═══ 10. Doppeltes Absenden ═══════════════════════════════════════════════
console.log('\n── 10. Doppeltes Absenden ──');
{
  for (const [name, formular, knopf, bereich] of [
    ['Urlaubsantrag', '[data-portal-vac-form]', '[data-portal-vac-form] button[type="submit"]', 'urlaub'],
    ['Krankmeldung', '[data-portal-absence-form]', '[data-portal-absence-form] button[type="submit"]', 'krank'],
  ]) {
    const ctx = await lage({ width: 1440, height: 900 }, { sendeDauer: 2000 });
    const page = await ctx.newPage();
    await page.goto(`${ADRESSE}/fahrer/mitarbeiter.html`, { waitUntil: 'load' });
    await page.waitForTimeout(2600);
    /* Die Schublade oeffnen - dort liegen die Formulare. */
    await page.evaluate((b) => {
      const k = document.querySelector(`[data-portal-quick-action="${b}"]`);
      if (k) k.click();
    }, bereich);
    await page.waitForTimeout(800);

    /*
      Das Absenden wird als Ereignis ausgeloest, nicht ueber einen Klick
      und nicht ueber requestSubmit.

      Zwei Anlaeufe scheiterten vorher an der Pruefung selbst, nicht am
      Portal: requestSubmit loeste eine Navigation aus ("Execution context
      was destroyed"), und ein Klick scheiterte daran, dass der Knopf in
      der Schublade als nicht sichtbar galt. Das Ereignis erreicht den
      Behandler unabhaengig davon - und genau der ist hier gemeint.
    */
    const m = await page.evaluate(async (auswahl) => {
      const f = document.querySelector(auswahl.formular);
      const b = document.querySelector(auswahl.knopf);
      if (!f || !b) return { fehlt: true };
      const heute = new Date().toISOString().slice(0, 10);
      for (const feld of f.querySelectorAll('input[type="date"]')) {
        feld.value = heute;
        feld.dispatchEvent(new Event('input', { bubbles: true }));
      }
      f.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      await new Promise((fertig) => setTimeout(fertig, 400));
      return { gesperrt: b.disabled, text: (b.textContent || '').trim() };
    }, { formular, knopf });
    pruefe(!m.fehlt && m.gesperrt === true,
      `${name}: der Knopf ist waehrend der Uebermittlung gesperrt (${m.fehlt ? 'Formular fehlt' : m.gesperrt})`);
    if (!m.fehlt) hinweis(`${name}: der Knopf sagt "${m.text}"`);
    await ctx.close();
  }
}

// ═══ 11. Fehlertexte verraten nichts ══════════════════════════════════════
console.log('\n── 11. Fehlertexte ──');
{
  const anbindung = await readFile(join(AUSGABE, 'fahrer', 'employee-supabase.js'), 'utf8');
  pruefe(!/\(error\.message \|\| "Anmeldung fehlgeschlagen/.test(anbindung),
    'die Anmeldung reicht den Wortlaut des Dienstes nicht mehr durch');
  pruefe(/E-Mail-Adresse oder Passwort ist falsch/.test(anbindung),
    'stattdessen steht dort eine feste, nichtssagende Auskunft');

  /* Der Nachweis im Betrieb: Der Dienst antwortet mit einer verraeterischen
     Meldung; auf dem Bildschirm darf sie nicht auftauchen. */
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.route('**://**', (r) => {
    const u = r.request().url();
    if (/\/auth\/v1\/token/.test(u)) {
      return r.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'email_not_confirmed', message: 'Email not confirmed for user 1234-abcd' }),
      });
    }
    return u.startsWith(ADRESSE) ? r.continue() : r.abort();
  });
  const page = await ctx.newPage();
  await page.goto(`${ADRESSE}/fahrer/index.html`, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  await page.fill('input[type=email]', 'pruefung-ohne-konto@example.invalid');
  await page.fill('input[type=password]', 'PruefungOhneKonto1');
  await page.click('button[type=submit]');
  await page.waitForTimeout(2800);
  const meldung = await page.evaluate(() =>
    (document.querySelector('[data-login-message]')?.textContent || '').replace(/\s+/g, ' ').trim());
  pruefe(!/Email not confirmed|1234-abcd|email_not_confirmed/.test(meldung),
    `die Meldung verraet den Kontozustand nicht ("${meldung.slice(0, 46)}…")`);
  pruefe(meldung.length > 0, 'es wird trotzdem etwas Verstaendliches gesagt');
  await ctx.close();
}

// ═══ 12. Dateien: öffentlich gegen signiert ═══════════════════════════════
console.log('\n── 12. Dateien: oeffentlich gegen signiert (statisch) ──');
{
  const migration = await readFile(join(WURZEL, 'supabase', 'migrations', '011_employee_documents_storage.sql'), 'utf8');
  pruefe(/false,\s*--\s*niemals oeffentlich/.test(migration),
    'der Bucket ist in der Migration als NICHT oeffentlich angelegt');
  pruefe(/allowed_mime_types/.test(migration) && /application\/pdf/.test(migration)
    && /image\/jpeg/.test(migration) && /image\/png/.test(migration),
    'die erlaubten Dateitypen sind serverseitig auf PDF, JPEG und PNG begrenzt');
  pruefe(/10485760/.test(migration), 'die Groessengrenze von 10 MB steht serverseitig im Bucket');
  pruefe(/revoke all on storage\.objects from anon/.test(migration),
    'anon hat keinerlei Recht auf storage.objects');
  pruefe(/\(storage\.foldername\(name\)\)\[1\] = \(select auth\.uid\(\)\)::text/.test(migration),
    'Lesen und Schreiben sind auf den eigenen Ordner begrenzt');
  pruefe(/revoke update on storage\.objects from authenticated/.test(migration),
    'Ueberschreiben einer vorhandenen Datei ist ausgeschlossen');

  const anbindung = await readFile(join(AUSGABE, 'fahrer', 'employee-supabase.js'), 'utf8');
  pruefe(/createSignedUrl/.test(anbindung), 'das Portal ruft Dateien ueber eine signierte Adresse ab');
  pruefe(!/getPublicUrl/.test(anbindung), 'es benutzt nirgends eine oeffentliche Adresse');
  hinweis('Statisch gegen Migration 011 geprueft. Ob die Regeln in der produktiven Instanz aktiv sind, ist damit NICHT belegt.');
}

// ═══ 13. Manipulierte Kennungen ═══════════════════════════════════════════
console.log('\n── 13. Manipulierte Kennungen (statisch) ──');
{
  /* Im Browser laesst sich nur pruefen, dass das Portal keine fremde
     Kennung SENDET. Ob die Datenbank eine fremde Kennung abweist, steht
     in den Policies - hier statisch gelesen. */
  const anbindung = await readFile(join(AUSGABE, 'fahrer', 'employee-supabase.js'), 'utf8');
  /*
    Nicht "kommt employee_id vor", sondern WOHER der Wert stammt.

    Der erste Anlauf verbot jede Verwendung und schlug deshalb bei der
    einen Stelle an, die es richtig macht: Sie nimmt die Kennung aus
    `session.employeeId`, also aus der geprueften Sitzung. Eine Kennung aus
    der Oberflaeche waere das Problem - eine aus der Sitzung ist die
    Loesung.
  */
  const kennungsstellen = [...anbindung.matchAll(/\.eq\("employee_id",\s*([^)]+)\)/g)]
    .map((m) => m[1].trim());
  const ausSitzung = kennungsstellen.every((q) => /session\.employeeId|profile\.employee_id/.test(q));
  pruefe(kennungsstellen.length === 0 || ausSitzung,
    `jede Mitarbeiterkennung stammt aus der geprueften Sitzung (${kennungsstellen.length} Stelle(n): ${kennungsstellen.join(', ') || 'keine'})`);
  /* Das eine querySelector sucht den Skript-Tag der Bibliothek - kein
     Datenweg. Geprueft wird deshalb alles ausser dieser Stelle. */
  const ohneBibliothek = anbindung.replace(/document\.querySelector\('script\[src[^)]*\)/g, '');
  pruefe(!/getElementById|querySelector|location\.search|\.dataset/.test(ohneBibliothek),
    'die Anbindung liest sonst nichts aus der Oberflaeche oder der Adresszeile');
  const policies = await readFile(join(WURZEL, 'supabase', 'migrations', '002_rls_policies.sql'), 'utf8');
  for (const [name, muster] of [
    ['Schichten', /shifts_select_self_published[\s\S]{0,400}current_user_employee_id\(\)/],
    ['Fahrzeuge', /vehicles_select_admin_dispatcher[\s\S]{0,600}s\.employee_id = private\.current_user_employee_id\(\)/],
    ['Urlaub', /vacation_requests_select_self/],
    ['Mitarbeiter', /employees_select_self/],
    ['Profil', /profiles_select_self/],
  ]) {
    pruefe(muster.test(policies), `${name}: die Regel begrenzt auf den eigenen Datensatz`);
  }
  hinweis('Statisch gegen Migration 002 geprueft - kein Lauf gegen eine Datenbank.');
}

await browser.close();
server.close();

console.log('\n═══════════════════════════════════════════════════════════');
console.log(`Mitarbeiterportal: ${ok.length} bestanden, ${fehl.length} nicht bestanden`);
if (fehl.length) {
  console.log('\nNicht bestanden:');
  for (const f of fehl) console.log('  - ' + f);
}
console.log('\nALLES SIMULIERT. Keine Anmeldung, kein Upload, kein Datensatz,');
console.log('kein Netzverkehr nach aussen. Erfundene Namen und Kennzeichen.');
console.log('OFFEN und nur am echten System pruefbar: die Regeln der Datenbank,');
console.log('die Trennung der Rollen und der Schutz der Dateien im Speicher.');
console.log('═══════════════════════════════════════════════════════════');
process.exit(fehl.length ? 1 : 0);
