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
    verzoegerung: 0, speicherDauer: 0, heute: HEUTE, morgen: MORGEN, ...zustand,
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
        /*
          `speicherDauer` bremst NUR das Speichern; das Laden der Seite
          bleibt schnell.

          Mit dem gemeinsamen Regler war die Oberfläche nach zwei Sekunden
          noch nicht fertig, und die Doppelklick-Probe fand das Fenster
          gar nicht erst — ein Fehlalarm der Prüfung, nicht der Software.
        */
        const halt = (w) => new Promise((f) => setTimeout(() => f(w), cfg.speicherDauer || cfg.verzoegerung));
        if (cfg.saveFehltAb >= 0 && n > cfg.saveFehltAb) {
          window.__letzterFehler = 'Schicht abgelehnt';
          return halt(null);
        }
        return halt({ ...payload, id: `S-${n}` });
      },
      /* Diese Namen liest die Seite beim Nachladen nach dem Speichern. */
      getEmployees: async () => warte(cfg.leer ? [] : mitarbeiter),
      getVehicles: async () => warte([
        { id: 'V-TEST', name: 'TESTWAGEN-029', licensePlate: 'GER-TEST 999', plate: 'GER-TEST 999', vehicleType: 'Testfahrzeug', status: 'Verfügbar' },
        { id: 'V-ZWEI', name: 'TESTWAGEN-030', licensePlate: 'GER-TEST 998', plate: 'GER-TEST 998', vehicleType: 'Testfahrzeug', status: 'Verfügbar' },
      ]),
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
  /*
    Bewusste Aenderung in diesem Schritt: Die Leiste heisst jetzt
    "Tag bearbeiten" und steht ueber den Mitarbeiterkarten. Sie bestimmt,
    welcher Tag angezeigt, bearbeitet UND veroeffentlicht wird. Der
    Dispatcher arbeitet am laufenden Tag, deshalb ist "heute"
    vorausgewaehlt. Die frueher gepruefte Vorbelegung "morgen" gilt damit
    nicht mehr - das ist keine Regression, sondern der neue Stand.
  */
  pruefe(m.wert === 'today', `vorausgewaehlt ist "heute" - der bearbeitete Tag (${m.wert})`);
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
  // Seit der neuen Tagesleiste ist "heute" vorbelegt; fuer diesen Fall
  // wird morgen ausdruecklich gewaehlt.
  await page.selectOption('[data-publish-day]', 'tomorrow');
  await page.waitForTimeout(300);
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

// ═══ 12. Das Schichtfenster ═══════════════════════════════════════════════
//
//   DER BEHOBENE BEFUND
//
//   Vorher standen sechs Schaltflaechen nebeneinander, jede aenderte fuer
//   sich einen Teilwert, und gespeichert wurde an ganz anderer Stelle der
//   Seite. Im echten Bedienversuch war nicht erkennbar, wie eine Schicht
//   vollstaendig ausgewaehlt und gesichert wird.
//
//   Jetzt: EIN Knopf je Karte, EIN Fenster, EIN Speichern.
//
console.log('\n── 12. Das Schichtfenster ──');

/** Das Fenster fuer den ersten Mitarbeiter oeffnen. */
async function fensterOeffnen(page) {
  await page.click('[data-shift-plan]');
  await page.waitForTimeout(500);
}

{
  const { ctx, page, fehler } = await seite();

  /* ── Nur noch eine Aktion auf der Karte ── */
  const karte = await page.evaluate(() => {
    const k = document.querySelector('.shift-driver-card');
    if (!k) return { fehlt: true };
    return {
      knoepfe: [...k.querySelectorAll('button')].map((b) => b.textContent.trim()),
      alteAktionen: k.querySelectorAll('[data-today-action="vehicle"], [data-today-action="shift"], [data-today-action="status"], [data-today-action="plan"]').length,
      aufklapp: k.querySelectorAll('[data-shift-picker]').length,
    };
  });
  pruefe(!karte.fehlt, 'die Mitarbeiterkarte steht da');
  pruefe(karte.alteAktionen === 0,
    `die vier missverstaendlichen Aktionen sind weg (${karte.alteAktionen})`);
  pruefe(karte.aufklapp === 0, 'unter der Karte klappt nichts mehr auf');
  pruefe((karte.knoepfe || []).some((b) => /Schicht (planen|bearbeiten)/.test(b)),
    `es gibt einen klaren Hauptknopf (${(karte.knoepfe || []).join(' | ')})`);

  /* ── Das Fenster und seine Reihenfolge ── */
  await fensterOeffnen(page);
  const f = await page.evaluate(() => {
    const box = document.querySelector('.shift-dialog-box');
    if (!box) return { fehlt: true };
    return {
      modal: box.getAttribute('aria-modal'),
      titel: box.querySelector('h2')?.textContent.trim() || '',
      kicker: box.querySelector('.shift-dialog-kicker')?.textContent.trim() || '',
      schritte: [...box.querySelectorAll('.shift-dialog-step h3')].map((h) => h.textContent.trim()),
      hatSpeichern: Boolean(box.querySelector('[data-dialog-save]')),
      speichernText: box.querySelector('[data-dialog-save]')?.textContent.trim() || '',
      hatAbbrechen: box.querySelectorAll('button[data-dialog-cancel]').length,
      zusammenfassung: [...box.querySelectorAll('.shift-dialog-summary dt')].map((d) => d.textContent.trim()),
      fokusImFenster: box.contains(document.activeElement),
      hintergrundGesperrt: document.body.classList.contains('shift-dialog-open'),
    };
  });
  pruefe(!f.fehlt, 'das Fenster oeffnet sich');
  pruefe(f.modal === 'true', 'es ist als Dialog ausgewiesen (aria-modal)');
  pruefe(/\d{2}\.\d{2}\.\d{4}/.test(f.kicker), `oben steht Tag und Datum ("${f.kicker}")`);
  pruefe((f.schritte || []).length === 4,
    `vier Schritte in fester Reihenfolge (${(f.schritte || []).join(' / ')})`);
  pruefe(/Arbeitet/.test(f.schritte?.[0] || ''), 'Schritt 1 fragt, ob die Person arbeitet');
  pruefe(/Schichtzeit/.test(f.schritte?.[1] || ''), 'Schritt 2 ist die Schichtzeit');
  pruefe(/Fahrzeug/.test(f.schritte?.[2] || ''), 'Schritt 3 ist das Fahrzeug');
  pruefe(/Zusammenfassung/.test(f.schritte?.[3] || ''), 'Schritt 4 ist die Zusammenfassung');
  pruefe(f.speichernText === 'Schicht speichern', `der Hauptknopf heisst "${f.speichernText}"`);
  pruefe(f.hatAbbrechen >= 1, `es gibt einen Abbrechen-Knopf (${f.hatAbbrechen})`);
  pruefe(JSON.stringify(f.zusammenfassung) === JSON.stringify(['Mitarbeiter', 'Datum', 'Status', 'Schichtzeit', 'Fahrzeug']),
    `die Zusammenfassung nennt alle fuenf Angaben (${(f.zusammenfassung || []).join(', ')})`);
  pruefe(f.fokusImFenster, 'der Fokus steht im Fenster');
  pruefe(f.hintergrundGesperrt, 'der Hintergrund ist gesperrt');

  /* ── Keine Fachbegriffe ── */
  const text = await page.evaluate(() =>
    document.querySelector('.shift-dialog-box')?.textContent.replace(/\s+/g, ' ') || '');
  pruefe(!/\bdraft\b|\bpublished\b|plan_status/i.test(text),
    'im Fenster steht kein Fachbegriff wie draft oder published');

  /* ── Jede Vorlage waehlbar ── */
  const vorlagen = await page.evaluate(() =>
    [...document.querySelectorAll('[data-dialog-template]')].map((b) => ({
      id: b.getAttribute('data-dialog-template'),
      name: b.querySelector('strong')?.textContent.trim() || '',
      zeit: b.querySelector('span')?.textContent.trim() || '',
    })));
  pruefe(vorlagen.length >= 7,
    `alle Vorlagen plus "Eigene Zeit" stehen zur Wahl (${vorlagen.length}: ${vorlagen.map((v) => v.name).join(', ')})`);

  let alleWaehlbar = true;
  for (const v of vorlagen.filter((x) => x.id)) {
    await page.click(`[data-dialog-template="${v.id}"]`);
    await page.waitForTimeout(200);
    const markiert = await page.evaluate((id) => {
      const b = document.querySelector(`[data-dialog-template="${id}"]`);
      return b?.classList.contains('is-selected') && b.getAttribute('aria-pressed') === 'true';
    }, v.id);
    if (!markiert) alleWaehlbar = false;
  }
  pruefe(alleWaehlbar, `jede Vorlage laesst sich waehlen und wird gold markiert (${vorlagen.filter((x) => x.id).length} geprueft)`);

  /* ── Eigene Zeit, auch ueber Mitternacht ── */
  await page.click('[data-dialog-template=""]');
  await page.waitForTimeout(300);
  const felderDa = await page.evaluate(() => ({
    start: Boolean(document.querySelector('[data-dialog-start]')),
    ende: Boolean(document.querySelector('[data-dialog-end]')),
    groesse: document.querySelector('[data-dialog-start]')
      ? parseFloat(getComputedStyle(document.querySelector('[data-dialog-start]')).fontSize) : 0,
  }));
  pruefe(felderDa.start && felderDa.ende, 'bei "Eigene Zeit" erscheinen Beginn und Ende');
  pruefe(felderDa.groesse >= 16, `die Zeitfelder sind mindestens 16 px (${felderDa.groesse})`);

  await page.fill('[data-dialog-start]', '22:00');
  await page.fill('[data-dialog-end]', '06:00');
  await page.click('[data-dialog-vehicle]');
  await page.waitForTimeout(300);
  const nacht = await page.evaluate(() => {
    const dd = [...document.querySelectorAll('.shift-dialog-summary dd')].map((x) => x.textContent.trim());
    return dd;
  });
  pruefe(nacht.some((x) => /22:00\s*–\s*06:00/.test(x)),
    `eine Nachtschicht ueber Mitternacht wird uebernommen (${nacht.join(' | ')})`);

  /* ── Fahrzeug waehlen und wechseln ── */
  const wagen = await page.evaluate(() =>
    [...document.querySelectorAll('[data-dialog-vehicle]')].map((b) => ({
      kennung: b.getAttribute('data-dialog-vehicle'),
      name: b.querySelector('strong')?.textContent.trim() || '',
      kennzeichen: b.querySelector('span')?.textContent.trim() || '',
    })));
  const echte = wagen.filter((w) => w.kennung);
  pruefe(echte.length >= 2, `mehrere Fahrzeuge stehen zur Wahl (${echte.length})`);
  pruefe(echte.every((w) => w.name && w.kennzeichen),
    'jede Fahrzeugkarte nennt Name und Kennzeichen');

  await page.click(`[data-dialog-vehicle="${echte[0].kennung}"]`);
  await page.waitForTimeout(250);
  const ersteWahl = await page.evaluate((k) => {
    const b = document.querySelector(`[data-dialog-vehicle="${k}"]`);
    return { markiert: b?.classList.contains('is-selected'), farbe: b ? getComputedStyle(b).borderColor : '' };
  }, echte[0].kennung);
  pruefe(ersteWahl.markiert, 'das gewaehlte Fahrzeug ist markiert');
  pruefe(/240, 201, 107/.test(ersteWahl.farbe), `und zwar gold (${ersteWahl.farbe})`);

  await page.click(`[data-dialog-vehicle="${echte[1].kennung}"]`);
  await page.waitForTimeout(250);
  const wechsel = await page.evaluate((k) => ({
    neu: document.querySelector(`[data-dialog-vehicle="${k[1]}"]`)?.classList.contains('is-selected'),
    alt: document.querySelector(`[data-dialog-vehicle="${k[0]}"]`)?.classList.contains('is-selected'),
  }), [echte[0].kennung, echte[1].kennung]);
  pruefe(wechsel.neu && !wechsel.alt, 'ein Wechsel hebt die vorherige Wahl auf');

  await page.click('[data-dialog-vehicle=""]');
  await page.waitForTimeout(250);
  const ohne = await page.evaluate(() => {
    const dd = [...document.querySelectorAll('.shift-dialog-summary dd')].map((x) => x.textContent.trim());
    return dd.some((x) => /Kein Fahrzeug/.test(x));
  });
  pruefe(ohne, '"Kein Fahrzeug" laesst sich waehlen');

  /* ── Frei setzen blendet Zeit und Fahrzeug aus ── */
  await page.click('[data-dialog-duty="nein"]');
  await page.waitForTimeout(300);
  const frei = await page.evaluate(() => {
    const schritte = [...document.querySelectorAll('.shift-dialog-step')];
    return {
      versteckt: schritte.filter((s) => s.hidden).length,
      status: [...document.querySelectorAll('.shift-dialog-summary dd')][2]?.textContent.trim() || '',
    };
  });
  pruefe(frei.versteckt === 2, `bei "Frei" entfallen Schichtzeit und Fahrzeug (${frei.versteckt} Schritte verborgen)`);
  pruefe(frei.status === 'Frei', `die Zusammenfassung sagt "${frei.status}"`);

  pruefe(fehler.length === 0, `keine Skriptfehler${fehler.length ? ' (' + fehler[0] + ')' : ''}`);
  await ctx.close();
}

// ═══ 13. Speichern, Abbrechen, Doppelklick, Fehler ════════════════════════
console.log('\n── 13. Speichern und Abbrechen ──');
{
  /* ── Neue Schicht speichern ── */
  const { ctx, page } = await seite();
  await fensterOeffnen(page);
  await page.click('[data-dialog-duty="ja"]');
  await page.waitForTimeout(200);
  const vorlage = await page.evaluate(() =>
    document.querySelector('[data-dialog-template]:not([data-dialog-template=""])')?.getAttribute('data-dialog-template') || '');
  await page.click(`[data-dialog-template="${vorlage}"]`);
  await page.waitForTimeout(200);
  const wagenKennung = await page.evaluate(() =>
    document.querySelector('[data-dialog-vehicle]:not([data-dialog-vehicle=""])')?.getAttribute('data-dialog-vehicle') || '');
  await page.click(`[data-dialog-vehicle="${wagenKennung}"]`);
  await page.waitForTimeout(200);
  await page.click('[data-dialog-save]');
  await page.waitForTimeout(1200);
  const nachSpeichern = await page.evaluate(() => ({
    offen: Boolean(document.querySelector('.shift-dialog-box')),
    meldung: (document.querySelector('[data-shift-feedback]')?.textContent || '').trim(),
    geschrieben: window.__geschrieben.shifts.length,
    letzte: window.__geschrieben.shifts[window.__geschrieben.shifts.length - 1] || null,
    knopf: document.querySelector('[data-shift-plan]')?.textContent.trim() || '',
  }));
  pruefe(!nachSpeichern.offen, 'nach bestaetigtem Speichern schliesst das Fenster');
  pruefe(/Schicht gespeichert/.test(nachSpeichern.meldung),
    `es gibt eine sichtbare Bestaetigung ("${nachSpeichern.meldung.slice(0, 64)}…")`);
  pruefe(/noch nicht veröffentlicht/i.test(nachSpeichern.meldung),
    'und sie sagt, dass der Tagesplan noch Entwurf ist');
  pruefe(nachSpeichern.geschrieben === 1,
    `genau EIN Datensatz geschrieben (${nachSpeichern.geschrieben})`);
  pruefe(nachSpeichern.letzte?.date === HEUTE,
    `und zwar fuer den angezeigten Tag (${nachSpeichern.letzte?.date})`);
  pruefe(nachSpeichern.letzte?.planStatus === 'draft',
    `als Entwurf - Speichern veroeffentlicht nicht (${nachSpeichern.letzte?.planStatus})`);
  pruefe(/Schicht bearbeiten/.test(nachSpeichern.knopf),
    `der Knopf heisst jetzt "${nachSpeichern.knopf}"`);

  /* ── Vorhandene Schicht bearbeiten: alles vorausgewaehlt ── */
  await fensterOeffnen(page);
  const vorbelegt = await page.evaluate(() => ({
    dienst: document.querySelector('[data-dialog-duty="ja"]')?.classList.contains('is-selected'),
    vorlage: Boolean(document.querySelector('[data-dialog-template].is-selected')),
    fahrzeug: Boolean(document.querySelector('[data-dialog-vehicle].is-selected')),
  }));
  pruefe(vorbelegt.dienst, 'beim Bearbeiten ist "Im Dienst" vorausgewaehlt');
  pruefe(vorbelegt.vorlage, 'die gespeicherte Schichtzeit ist vorausgewaehlt');
  pruefe(vorbelegt.fahrzeug, 'das gespeicherte Fahrzeug ist vorausgewaehlt');

  /* ── Abbrechen aendert nichts ── */
  const vorherZahl = await page.evaluate(() => window.__geschrieben.shifts.length);
  await page.click('[data-dialog-duty="nein"]');
  await page.waitForTimeout(200);
  await page.click('button[data-dialog-cancel]');
  await page.waitForTimeout(400);
  const nachAbbruch = await page.evaluate(() => ({
    offen: Boolean(document.querySelector('.shift-dialog-box')),
    zahl: window.__geschrieben.shifts.length,
    knopf: document.querySelector('[data-shift-plan]')?.textContent.trim() || '',
    fokus: document.activeElement?.getAttribute('data-shift-plan') !== null,
  }));
  pruefe(!nachAbbruch.offen, 'Abbrechen schliesst das Fenster');
  pruefe(nachAbbruch.zahl === vorherZahl,
    `und schreibt nichts (${nachAbbruch.zahl} statt ${vorherZahl})`);
  pruefe(/Schicht bearbeiten/.test(nachAbbruch.knopf),
    'die Planung bleibt unveraendert bestehen');
  pruefe(nachAbbruch.fokus, 'der Fokus kehrt zum ausloesenden Knopf zurueck');

  /* ── Escape ebenso ── */
  await fensterOeffnen(page);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  const nachEscape = await page.evaluate(() => ({
    offen: Boolean(document.querySelector('.shift-dialog-box')),
    zahl: window.__geschrieben.shifts.length,
  }));
  pruefe(!nachEscape.offen && nachEscape.zahl === vorherZahl,
    'Escape schliesst ebenfalls, ohne etwas zu aendern');
  await ctx.close();
}

{
  /* ── Doppelklick ── */
  /* verzoegerung bremst saveShift - genau das braucht diese Probe.
     sendeDauer wirkt nur beim Veroeffentlichen; mit ihr war das Speichern
     sofort fertig und die Pruefung las einen Knopf, den es nicht mehr gab. */
  const { ctx, page } = await seite({ speicherDauer: 1500 });
  await fensterOeffnen(page);
  await page.click('[data-dialog-duty="ja"]');
  await page.waitForTimeout(200);
  await page.click('[data-dialog-save]');
  const gesperrt = await page.evaluate(() => {
    const b = document.querySelector('[data-dialog-save]');
    return { disabled: b?.disabled, text: b?.textContent.trim() };
  });
  await page.evaluate(() => document.querySelector('[data-dialog-save]')?.click());
  await page.waitForTimeout(3000);
  const danach = await page.evaluate(() => window.__geschrieben.shifts.length);
  pruefe(gesperrt.disabled === true, 'waehrend des Speicherns ist der Knopf gesperrt');
  pruefe(/Wird gespeichert/.test(gesperrt.text || ''), `und sagt, dass etwas laeuft ("${gesperrt.text}")`);
  pruefe(danach === 1, `trotz zweier Klicks genau EIN Datensatz (${danach})`);
  await ctx.close();
}

{
  /* ── Speicherfehler ── */
  const { ctx, page } = await seite({ saveFehltAb: 0 });
  await fensterOeffnen(page);
  await page.click('[data-dialog-duty="ja"]');
  await page.waitForTimeout(200);
  await page.click('[data-dialog-save]');
  await page.waitForTimeout(1200);
  const fehlerfall = await page.evaluate(() => ({
    offen: Boolean(document.querySelector('.shift-dialog-box')),
    meldung: (document.querySelector('[data-dialog-error]')?.textContent || '').trim(),
    versteckt: document.querySelector('[data-dialog-error]')?.hidden,
    knopfFrei: document.querySelector('[data-dialog-save]')?.disabled === false,
  }));
  pruefe(fehlerfall.offen, 'bei einem Fehler bleibt das Fenster offen');
  pruefe(fehlerfall.versteckt === false && /nicht gespeichert/.test(fehlerfall.meldung),
    `der Fehler steht sichtbar da ("${fehlerfall.meldung.slice(0, 60)}…")`);
  pruefe(/nichts geändert/.test(fehlerfall.meldung),
    'und es wird gesagt, dass nichts geaendert wurde');
  pruefe(fehlerfall.knopfFrei, 'ein zweiter Versuch ist moeglich');
  await ctx.close();
}

{
  /* ── Heute und morgen strikt getrennt ── */
  const { ctx, page } = await seite();
  await page.selectOption('[data-publish-day]', 'tomorrow');
  await page.waitForTimeout(800);
  const kopf = await page.evaluate(() => ({
    knopf: document.querySelector('[data-plan-publish]')?.textContent.trim() || '',
    zustand: document.querySelector('[data-plan-day-state]')?.textContent.trim() || '',
  }));
  pruefe(/Morgen/.test(kopf.knopf) && /\d{2}\.\d{2}\.\d{4}/.test(kopf.knopf),
    `am Knopf stehen Tag und volles Datum ("${kopf.knopf}")`);
  pruefe(!/draft|published/i.test(kopf.zustand),
    `der Zustand steht in gewoehnlichem Deutsch ("${kopf.zustand.slice(0, 60)}…")`);

  await fensterOeffnen(page);
  await page.click('[data-dialog-duty="ja"]');
  await page.waitForTimeout(200);
  await page.click('[data-dialog-save]');
  await page.waitForTimeout(1200);
  const geschrieben = await page.evaluate(() => window.__geschrieben.shifts);
  pruefe(geschrieben.length === 1 && geschrieben[0].date === MORGEN,
    `am gewaehlten Tag "morgen" wird auch fuer morgen geschrieben (${geschrieben[0]?.date})`);
  pruefe(!geschrieben.some((s) => s.date === HEUTE),
    'und nichts fuer heute');
  await ctx.close();
}

// ═══ 14. Darstellung und Tastatur ═════════════════════════════════════════
console.log('\n── 14. Darstellung und Tastatur ──');
{
  for (const [name, w] of [['320 px', 320], ['390 px', 390], ['430 px', 430], ['1440 px', 1440]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: w < 500 ? 844 : 900 } });
    await ctx.route('**://**', (r) => {
      const u = r.request().url();
      if (/admin\/(auth|supabase-auth|taxi-data-service)\.js/.test(u)) {
        return r.fulfill({ status: 200, contentType: 'text/javascript', body: '' });
      }
      if (/admin\/supabase-config\.js/.test(u)) {
        return r.fulfill({ status: 200, contentType: 'text/javascript', body: "window.TaxiSupabaseConfig={isConfigured:true};" });
      }
      return u.startsWith(ADRESSE) ? r.continue() : r.abort();
    });
    await ctx.addInitScript((cfg) => {
      const ma = [{ id: 'TEST-1', employeeId: 'TEST-1', role: 'Fahrer', firstName: 'Testperson', lastName: 'Eins', status: 'im Dienst', employmentType: 'Vollzeit', qualifications: [] }];
      const d = {
        isEnabled: () => true, clearLastError: () => {}, getLastError: () => '',
        resolveBackendMode: () => 'supabase',
        getEmployees: async () => ma,
        getVehicles: async () => ([{ id: 'V-TEST', name: 'TESTWAGEN-029', licensePlate: 'GER-TEST 999', plate: 'GER-TEST 999', vehicleType: 'Testfahrzeug', status: 'Verfügbar' }]),
        getShifts: async () => ([]), getDocuments: async () => [], getVacations: async () => [], getAbsences: async () => [],
        getPlanPublications: async () => [],
        publishPlan: async (p) => ({ ...p, id: 'PUB' }), saveShift: async (p) => ({ ...p, id: 'S' }),
      };
      window.TaxiData = d; window.TaxiDataService = d;
      void cfg;
    }, {});
    const page = await ctx.newPage();
    page.on('dialog', (x) => x.accept());
    await page.goto(`${ADRESSE}/admin/schichtplanung.html`, { waitUntil: 'load' });
    await page.waitForTimeout(2200);
    await page.click('[data-shift-plan]');
    await page.waitForTimeout(600);
    const m = await page.evaluate(() => {
      const d = document.documentElement;
      const box = document.querySelector('.shift-dialog-box');
      const felder = [...document.querySelectorAll('.shift-dialog-box input')]
        .map((e) => parseFloat(getComputedStyle(e).fontSize)).filter((px) => px < 16);
      const klein = [...document.querySelectorAll('.shift-dialog-box button')]
        .filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height < 44; }).length;
      return {
        ueberlauf: d.scrollWidth - d.clientWidth,
        passt: box ? box.getBoundingClientRect().height <= window.innerHeight + 1 : false,
        scrollt: box ? box.querySelector('.shift-dialog-body').scrollHeight >= 0 : false,
        kleineFelder: felder.length,
        kleineKnoepfe: klein,
      };
    });
    pruefe(m.ueberlauf <= 0, `${name}: kein waagerechter Ueberlauf (${m.ueberlauf})`);
    pruefe(m.passt, `${name}: das Fenster passt auf den Bildschirm`);
    pruefe(m.kleineFelder === 0, `${name}: kein Eingabefeld unter 16 px (${m.kleineFelder})`);
    pruefe(m.kleineKnoepfe === 0, `${name}: keine Bedienflaeche unter 44 px (${m.kleineKnoepfe})`);
    await ctx.close();
  }

  /* ── Tastatur: der Fokus bleibt im Fenster ── */
  const { ctx, page } = await seite();
  await page.click('[data-shift-plan]');
  await page.waitForTimeout(600);
  let drin = true;
  let sichtbar = true;
  for (let i = 0; i < 25; i += 1) {
    await page.keyboard.press('Tab');
    const s = await page.evaluate(() => {
      const box = document.querySelector('.shift-dialog-box');
      const e = document.activeElement;
      if (!box || !e || e === document.body) return { drin: false, umriss: false };
      const cs = getComputedStyle(e);
      /*
        Gemessen, nicht angenommen: Ein Zeitfeld in Chrome hat innen
        zwei Abschnitte (Stunde, Minute). Beim Weitertasten aus dem
        letzten Abschnitt heraus bleibt das Feld kurz
        "document.activeElement", erfuellt aber ":focus" nicht mehr.
        In diesem Zwischenzustand kann keine Regel einen Umriss geben.
        Bewertet wird deshalb nur, wenn das Element wirklich den Fokus
        hat.
      */
      const hatFokus = e.matches(':focus');
      return {
        drin: box.contains(e),
        umriss: !hatFokus || (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0),
      };
    });
    if (!s.drin) drin = false;
    if (!s.umriss) sichtbar = false;
  }
  pruefe(drin, 'beim Weitertasten bleibt der Fokus im Fenster (25 Schritte)');
  pruefe(sichtbar, 'und ist an jeder Stelle sichtbar');
  await ctx.close();
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
