// ═══════════════════════════════════════════════════════════════════════════
// Schichtplanung — Veröffentlichen für den AUSGEWÄHLTEN Tag
// ═══════════════════════════════════════════════════════════════════════════
//
// ───────────────────────────────────────────────────────────────────────────
// DER BEHOBENE FEHLER
// ───────────────────────────────────────────────────────────────────────────
//
//   "Plan veröffentlichen" war fest auf `state.dateTomorrow` verdrahtet und
//   lief ausschliesslich ueber die Liste `tomorrowPlan`. Fuer den heutigen
//   Tag gab es damit UEBERHAUPT KEINEN Weg, `plan_status` auf `published`
//   zu setzen - und das Mitarbeiterportal zeigt nach
//   `shifts_select_self_published` nur veroeffentlichte Schichten.
//
//   "Planung speichern" schreibt beide Tage bewusst als Entwurf. Das ist
//   richtig; Speichern ist nicht Veroeffentlichen.
//
//   Betriebliche Folge: Faellt jemand kurzfristig aus und wird ersetzt,
//   erfaehrt die Vertretung es im Portal nicht.
//
// ───────────────────────────────────────────────────────────────────────────
// WIE HIER GEPRUEFT WIRD
// ───────────────────────────────────────────────────────────────────────────
//
//   Der Datendienst (`window.TaxiDataService`) wird durch eine Attrappe
//   ersetzt, die jeden Schreibvorgang MITSCHREIBT statt ihn auszufuehren.
//   Damit laesst sich genau nachsehen, welches Datum und welcher
//   plan_status geschrieben wuerden.
//
//   Es geht KEINE Anfrage an Supabase, es wird KEIN Datensatz angelegt und
//   KEINE Anmeldung durchgefuehrt. Alle Namen und Kennungen sind erfunden.
//
// Aufruf: npm run schichten-pruefen

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
const PORT = 5503;
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

const ISO = (v) => {
  const d = new Date();
  d.setDate(d.getDate() + v);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const HEUTE = ISO(0);
const MORGEN = ISO(1);

/**
 * Seite mit ersetztem Datendienst oeffnen.
 *
 * Die Anmeldung der Verwaltung wird umgangen, indem `admin/auth.js` durch
 * eine leere Datei ersetzt wird - hier geht es um die Veroeffentlichung,
 * nicht um den Zugangsschutz (der hat seinen eigenen Prueflauf).
 */
async function seite(zustand = {}) {
  const l = {
    publishFehlt: false, saveFehltAb: -1, leer: false,
    verzoegerung: 0, heute: HEUTE, morgen: MORGEN, ...zustand,
  };
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.route('**://**', (r) => {
    const u = r.request().url();
    if (/admin\/(auth|supabase-auth)\.js/.test(u)) {
      return r.fulfill({ status: 200, contentType: 'text/javascript', body: '/* in der Pruefung ersetzt */' });
    }
    /*
      Der echte Datendienst wird ERSETZT, nicht nur überschrieben.

      schichtplanung.js bindet `window.TaxiData || window.TaxiDataService`
      beim Laden — und taxi-data-service.js setzt `window.TaxiData`. Eine
      Attrappe nur auf `TaxiDataService` war damit wirkungslos: Es lief
      der echte Dienst, dessen Anfragen hier abgeschnitten sind, und das
      Veröffentlichen blieb hängen. Gemessen: null Aufrufe, Schaltfläche
      dauerhaft gesperrt.
    */
    if (/admin\/taxi-data-service\.js/.test(u)) {
      return r.fulfill({ status: 200, contentType: 'text/javascript', body: '/* in der Pruefung ersetzt */' });
    }
    if (/admin\/supabase-config\.js/.test(u)) {
      return r.fulfill({
        status: 200, contentType: 'text/javascript',
        body: "window.TaxiSupabaseConfig={isConfigured:true,url:'https://test.invalid',publishableKey:'test'};",
      });
    }
    return u.startsWith(ADRESSE) ? r.continue() : r.abort();
  });

  await ctx.addInitScript((cfg) => {
    window.__geschrieben = { publications: [], shifts: [] };
    const warte = (w) => new Promise((f) => setTimeout(() => f(w), cfg.verzoegerung));
    const mitarbeiter = [
      /* role: "Fahrer" ist Pflicht - die Planung baut ihre Zeilen nur fuer
         Fahrer auf (ensureTodayAssignments filtert danach). Ohne dieses
         Feld blieben beide Listen leer, und jede Pruefung landete im
         Zweig "leerer Plan". */
      { id: 'TEST-1', employeeId: 'TEST-1', role: 'Fahrer', firstName: 'Testperson', lastName: 'Eins', status: 'im Dienst', employmentType: 'Vollzeit', qualifications: [] },
      { id: 'TEST-2', employeeId: 'TEST-2', role: 'Fahrer', firstName: 'Testperson', lastName: 'Zwei', status: 'verfügbar', employmentType: 'Teilzeit', qualifications: [] },
    ];
    const dienst = {
      isEnabled: () => true,
      clearLastError: () => { window.__letzterFehler = ''; },
      getLastError: () => window.__letzterFehler || '',
      listEmployees: async () => warte(cfg.leer ? [] : mitarbeiter),
      listVehicles: async () => warte([{ id: 'V-TEST', name: 'TESTWAGEN-029', plate: 'GER-TEST 999', status: 'Verfügbar' }]),
      listShifts: async () => warte([]),
      listDocuments: async () => warte([]),
      listVacations: async () => warte([]),
      listAbsences: async () => warte([]),
      getPlanPublications: async () => warte([]),
      publishPlan: async (payload) => {
        window.__geschrieben.publications.push(payload);
        if (cfg.publishFehlt) { window.__letzterFehler = 'Veroeffentlichung abgelehnt'; return warte(null); }
        return warte({ ...payload, id: 'PUB-TEST' });
      },
      saveShift: async (payload) => {
        window.__geschrieben.shifts.push(payload);
        const n = window.__geschrieben.shifts.length;
        if (cfg.saveFehltAb >= 0 && n > cfg.saveFehltAb) {
          window.__letzterFehler = 'Schicht abgelehnt';
          return warte(null);
        }
        return warte({ ...payload, id: `S-${n}` });
      },
      /* Diese Namen liest die Seite beim Nachladen nach dem Speichern. */
      getEmployees: async () => warte(cfg.leer ? [] : mitarbeiter),
      getVehicles: async () => warte([{ id: 'V-TEST', name: 'TESTWAGEN-029', plate: 'GER-TEST 999', status: 'Verfügbar' }]),
      /*
        Zwei Entwurfsschichten - eine fuer heute, eine fuer morgen.

        Daraus baut die Seite ihre beiden Listen auf. Ohne sie waeren
        beide leer, und jede Pruefung landete im Zweig "leerer Plan" -
        genau das ist beim ersten Anlauf passiert.
      */
      getShifts: async () => warte(cfg.leer ? [] : [
        { id: 'SH-HEUTE', employeeId: 'TEST-1', employee_id: 'TEST-1', date: cfg.heute, shift_date: cfg.heute, startTime: '06:00', start_time: '06:00', endTime: '14:00', end_time: '14:00', status: 'planned', vehicleId: 'V-TEST', vehicle_id: 'V-TEST', planStatus: 'draft', plan_status: 'draft' },
        { id: 'SH-MORGEN', employeeId: 'TEST-1', employee_id: 'TEST-1', date: cfg.morgen, shift_date: cfg.morgen, startTime: '14:00', start_time: '14:00', endTime: '22:00', end_time: '22:00', status: 'planned', vehicleId: null, vehicle_id: null, planStatus: 'draft', plan_status: 'draft' },
      ]),
      getDocuments: async () => warte([]),
      getVacations: async () => warte([]),
      getAbsences: async () => warte([]),
      resolveBackendMode: () => 'supabase',
    };
    /* Beide Namen - schichtplanung.js nimmt den erstbesten. */
    window.TaxiData = dienst;
    window.TaxiDataService = dienst;
  }, l);

  const page = await ctx.newPage();
  const fehler = [];
  page.on('pageerror', (e) => fehler.push(String(e).slice(0, 80)));
  page.on('dialog', (d) => d.accept());
  await page.goto(`${ADRESSE}/admin/schichtplanung.html`, { waitUntil: 'load' });
  await page.waitForTimeout(2200);
  return { ctx, page, fehler };
}

/** Den heutigen Zeilen eine Zeit geben, damit sie veroeffentlichbar sind. */
async function heuteVorbereiten(page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem('tgShiftPlanner');
    return Boolean(raw);
  });
}

// ═══ 1. Die Auswahl steht da und nennt echte Datumsangaben ════════════════
console.log('\n── 1. Der Tag ist vor dem Klick sichtbar ──');
{
  const { ctx, page, fehler } = await seite();
  const m = await page.evaluate(() => {
    const s = document.querySelector('[data-publish-day]');
    if (!s) return { fehlt: true };
    return {
      wert: s.value,
      optionen: [...s.options].map((o) => ({ wert: o.value, text: o.textContent.trim() })),
    };
  });
  pruefe(!m.fehlt, 'die Tagesauswahl ist vorhanden');
  pruefe(m.wert === 'tomorrow', `vorausgewaehlt ist "morgen" - der bisherige Ablauf bleibt (${m.wert})`);
  const heuteText = (m.optionen || []).find((o) => o.wert === 'today')?.text || '';
  const morgenText = (m.optionen || []).find((o) => o.wert === 'tomorrow')?.text || '';
  pruefe(/\d{2}\.\d{2}\.\d{4}/.test(heuteText) && /\d{2}\.\d{2}\.\d{4}/.test(morgenText),
    `beide Eintraege nennen ein Datum im Klartext ("${morgenText}", "${heuteText}")`);
  pruefe(fehler.length === 0, `keine Skriptfehler${fehler.length ? ' (' + fehler[0] + ')' : ''}`);
  await ctx.close();
}

// ═══ 2. Morgen veröffentlichen — unverändert ══════════════════════════════
console.log('\n── 2. Morgen veroeffentlichen (bisheriger Ablauf) ──');
{
  const { ctx, page } = await seite();
  await page.click('[data-plan-publish]');
  await page.waitForTimeout(1500);
  const g = await page.evaluate(() => window.__geschrieben);
  pruefe(g.publications.length === 1, `genau eine Veroeffentlichung geschrieben (${g.publications.length})`);
  pruefe(g.publications[0]?.date === MORGEN,
    `sie traegt das Datum von morgen (${g.publications[0]?.date} = ${MORGEN})`);
  pruefe(g.shifts.length > 0, `Schichten geschrieben (${g.shifts.length})`);
  pruefe(g.shifts.every((s) => s.date === MORGEN),
    'jede geschriebene Schicht traegt das Datum von morgen');
  pruefe(g.shifts.every((s) => s.planStatus === 'published'),
    'jede geschriebene Schicht ist als veroeffentlicht gekennzeichnet');
  await ctx.close();
}

// ═══ 3. Heute veröffentlichen — der behobene Fall ═════════════════════════
console.log('\n── 3. Heute veroeffentlichen (der behobene Fall) ──');
{
  const { ctx, page } = await seite();
  await page.selectOption('[data-publish-day]', 'today');
  await page.click('[data-plan-publish]');
  await page.waitForTimeout(1500);
  const g = await page.evaluate(() => window.__geschrieben);
  pruefe(g.publications.length === 1, `genau eine Veroeffentlichung geschrieben (${g.publications.length})`);
  pruefe(g.publications[0]?.date === HEUTE,
    `sie traegt das Datum von HEUTE (${g.publications[0]?.date} = ${HEUTE})`);
  pruefe(g.shifts.length > 0, `Schichten geschrieben (${g.shifts.length})`);
  pruefe(g.shifts.every((s) => s.date === HEUTE),
    'jede geschriebene Schicht traegt das Datum von heute');
  pruefe(g.shifts.every((s) => s.planStatus === 'published'),
    'jede geschriebene Schicht ist als veroeffentlicht gekennzeichnet');
  pruefe(!g.shifts.some((s) => s.date === MORGEN),
    'es wurde KEINE Schicht fuer morgen mitveroeffentlicht');
  const meldung = await page.evaluate(() =>
    (document.querySelector('[data-shift-feedback]')?.textContent || '').trim());
  pruefe(/veröffentlicht/i.test(meldung) && /\d{2}\.\d{2}\.\d{4}/.test(meldung),
    `die Erfolgsmeldung nennt das Datum ("${meldung.slice(0, 70)}…")`);
  await ctx.close();
}

// ═══ 4. Ausgewähltes Datum = geschriebenes Datum ══════════════════════════
console.log('\n── 4. Ausgewaehltes Datum entspricht geschriebenem Datum ──');
{
  for (const [wahl, erwartet] of [['today', HEUTE], ['tomorrow', MORGEN]]) {
    const { ctx, page } = await seite();
    await page.selectOption('[data-publish-day]', wahl);
    await page.click('[data-plan-publish]');
    await page.waitForTimeout(1500);
    const g = await page.evaluate(() => window.__geschrieben);
    const daten = [...new Set([...g.publications, ...g.shifts].map((x) => x.date))];
    pruefe(daten.length === 1 && daten[0] === erwartet,
      `Auswahl "${wahl}" schreibt ausschliesslich ${erwartet} (geschrieben: ${daten.join(', ')})`);
    await ctx.close();
  }
}

// ═══ 5. Speichern lässt den Entwurf einen Entwurf ═════════════════════════
console.log('\n── 5. "Planung speichern" veroeffentlicht nicht ──');
{
  const { ctx, page } = await seite();
  await page.click('[data-plan-save]');
  await page.waitForTimeout(1800);
  const g = await page.evaluate(() => window.__geschrieben);
  pruefe(g.publications.length === 0,
    `Speichern schreibt KEINE Veroeffentlichung (${g.publications.length})`);
  pruefe(g.shifts.length > 0, `aber es schreibt Schichten (${g.shifts.length})`);
  pruefe(g.shifts.every((s) => s.planStatus === 'draft'),
    'und zwar ausnahmslos als Entwurf');
  await ctx.close();
}

// ═══ 6. Doppelklick ═══════════════════════════════════════════════════════
console.log('\n── 6. Doppelklick ──');
{
  const { ctx, page } = await seite({ verzoegerung: 900 });
  await page.selectOption('[data-publish-day]', 'today');
  /* Zwei Klicks unmittelbar hintereinander - der zweite trifft eine
     gesperrte Schaltflaeche. */
  await page.click('[data-plan-publish]');
  const gesperrt = await page.evaluate(() =>
    document.querySelector('[data-plan-publish]').disabled);
  /*
    Der zweite Klick wird im Dokument ausgeloest, nicht ueber Playwright.

    `page.click` wartet darauf, dass die Schaltflaeche bedienbar ist - und
    genau das ist sie absichtlich nicht. Die Pruefung lief deshalb in eine
    Zeitueberschreitung und meldete einen Fehler, wo die Sperre gerade
    ihre Arbeit tat. Ein echter zweiter Klick trifft die gesperrte Flaeche
    ebenso folgenlos.
  */
  await page.evaluate(() => document.querySelector('[data-plan-publish]').click());
  /* 900 ms je Aufruf, eine Veroeffentlichung plus mehrere Schichten -
     darunter ist die Schaltflaeche noch zu Recht gesperrt. */
  await page.waitForTimeout(9000);
  const g = await page.evaluate(() => window.__geschrieben);
  pruefe(gesperrt, 'die Schaltflaeche ist waehrend des Schreibens gesperrt');
  pruefe(g.publications.length === 1,
    `trotz zweier Klicks genau EINE Veroeffentlichung (${g.publications.length})`);
  const frei = await page.evaluate(() =>
    document.querySelector('[data-plan-publish]').disabled === false);
  pruefe(frei, 'danach ist sie wieder bedienbar');
  await ctx.close();
}

// ═══ 7. Fehlerantwort ═════════════════════════════════════════════════════
console.log('\n── 7. Fehlerantwort: der Entwurf bleibt ein Entwurf ──');
{
  const { ctx, page } = await seite({ publishFehlt: true });
  await page.selectOption('[data-publish-day]', 'today');
  await page.click('[data-plan-publish]');
  await page.waitForTimeout(1500);
  const g = await page.evaluate(() => window.__geschrieben);
  const meldung = await page.evaluate(() =>
    (document.querySelector('[data-shift-feedback]')?.textContent || '').trim());
  pruefe(g.shifts.length === 0,
    `nach der abgelehnten Veroeffentlichung wurde KEINE Schicht geschrieben (${g.shifts.length})`);
  pruefe(/Entwurf/i.test(meldung),
    `die Meldung sagt, dass es ein Entwurf bleibt ("${meldung.slice(0, 70)}…")`);
  pruefe(!/veröffentlicht:/i.test(meldung), 'es wird kein Erfolg behauptet');
  await ctx.close();
}

// ═══ 8. Fehler mitten im Schreiben ════════════════════════════════════════
console.log('\n── 8. Abbruch mitten im Schreiben ──');
{
  const { ctx, page } = await seite({ saveFehltAb: 1 });
  await page.selectOption('[data-publish-day]', 'today');
  await page.click('[data-plan-publish]');
  await page.waitForTimeout(1500);
  const meldung = await page.evaluate(() =>
    (document.querySelector('[data-shift-feedback]')?.textContent || '').trim());
  pruefe(/teilweise/i.test(meldung),
    `der Teilabbruch wird benannt ("${meldung.slice(0, 70)}…")`);
  pruefe(!/veröffentlicht:/i.test(meldung),
    'es wird nicht behauptet, der Plan sei veroeffentlicht');
  await ctx.close();
}

// ═══ 9. Leerer Plan ═══════════════════════════════════════════════════════
console.log('\n── 9. Leerer Plan ──');
{
  const { ctx, page } = await seite({ leer: true });
  await page.selectOption('[data-publish-day]', 'today');
  await page.click('[data-plan-publish]');
  await page.waitForTimeout(1200);
  const g = await page.evaluate(() => window.__geschrieben);
  const meldung = await page.evaluate(() =>
    (document.querySelector('[data-shift-feedback]')?.textContent || '').trim());
  pruefe(g.publications.length === 0 && g.shifts.length === 0,
    `ein leerer Plan wird nicht veroeffentlicht (${g.publications.length} / ${g.shifts.length})`);
  pruefe(/keine Schicht/i.test(meldung) && /nichts veröffentlicht/i.test(meldung),
    `und es wird gesagt, warum ("${meldung.slice(0, 70)}…")`);
  await ctx.close();
}

// ═══ 10. Bestehende Veröffentlichung erneut ═══════════════════════════════
console.log('\n── 10. Erneutes Veroeffentlichen desselben Tages ──');
{
  const { ctx, page } = await seite();
  await page.selectOption('[data-publish-day]', 'today');
  await page.click('[data-plan-publish]');
  await page.waitForTimeout(1500);
  const ersteZahl = await page.evaluate(() => window.__geschrieben.shifts.length);
  await page.click('[data-plan-publish]');
  await page.waitForTimeout(1500);
  const g = await page.evaluate(() => window.__geschrieben);
  pruefe(g.publications.length === 2,
    `die zweite Veroeffentlichung wird ebenfalls geschrieben (${g.publications.length})`);
  pruefe(g.publications.every((p) => p.date === HEUTE),
    'beide Male fuer denselben Tag');
  pruefe(g.shifts.length === ersteZahl * 2,
    `es werden dieselben Schichten erneut geschrieben, nicht doppelt so viele verschiedene (${g.shifts.length})`);
  hinweis('Die Abgrenzung gegen Doppeleintraege leistet der Datendienst ueber die Schichtkennung, nicht diese Seite.');
  await ctx.close();
}

// ═══ 11. Keine Auswirkung auf Wochenplanung und Portal ════════════════════
console.log('\n── 11. Keine Auswirkung auf andere Bereiche (statisch) ──');
{
  const woche = await readFile(join(AUSGABE, 'admin', 'wochenplanung.js'), 'utf8');
  pruefe(/planStatus: "draft"/.test(woche),
    'die Wochenplanung speichert weiterhin ausschliesslich als Entwurf');
  pruefe(!/data-publish-day/.test(woche), 'sie kennt die neue Auswahl nicht');

  const portal = await readFile(join(AUSGABE, 'fahrer', 'mitarbeiter.js'), 'utf8');
  pruefe(!/data-publish-day|publishPlan/.test(portal),
    'das Mitarbeiterportal ist unberuehrt');

  const policies = await readFile(join(WURZEL, 'supabase', 'migrations', '002_rls_policies.sql'), 'utf8');
  pruefe(/shifts_select_self_published[\s\S]{0,400}plan_status = 'published'/.test(policies),
    'die Datenbankregel bleibt unveraendert: nur eigene, veroeffentlichte Schichten');
  pruefe(/shifts_admin_dispatcher_insert/.test(policies) && /shifts_admin_dispatcher_update/.test(policies),
    'Schreiben bleibt Admins und Dispatchern vorbehalten - keine Rechte geaendert');
  hinweis('Statisch gelesen. Ob die Regeln in der produktiven Instanz aktiv sind, ist damit nicht belegt.');
}

await browser.close();
server.close();

console.log('\n═══════════════════════════════════════════════════════════');
console.log(`Schichtveroeffentlichung: ${ok.length} bestanden, ${fehl.length} nicht bestanden`);
if (fehl.length) {
  console.log('\nNicht bestanden:');
  for (const f of fehl) console.log('  - ' + f);
}
console.log('\nALLES SIMULIERT. Der Datendienst ist eine Attrappe, die jeden');
console.log('Schreibvorgang nur mitschreibt. Keine Anfrage an Supabase, kein');
console.log('Datensatz, keine Anmeldung. Alle Namen und Kennungen erfunden.');
console.log('═══════════════════════════════════════════════════════════');
process.exit(fehl.length ? 1 : 0);
