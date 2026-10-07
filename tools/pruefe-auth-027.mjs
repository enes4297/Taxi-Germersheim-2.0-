// ═══════════════════════════════════════════════════════════════════════════
// Schritt 027 — die beiden belegten Auth-Punkte, damit sie nicht wiederkommen
// ═══════════════════════════════════════════════════════════════════════════
//
// ───────────────────────────────────────────────────────────────────────────
// WAS HIER SIMULIERT IST — UND WAS NICHT
// ───────────────────────────────────────────────────────────────────────────
//
//   ALLES. Der Netzverkehr nach aussen ist abgeschnitten, `CustomerAuth`
//   bekommt an den entscheidenden Stellen Attrappen. Es wird KEINE E-Mail
//   ausgeloest, KEIN Konto angelegt und KEINE Anmeldung durchgefuehrt.
//
//   Dieser Lauf belegt also: Die Seite sendet das richtige mit und reagiert
//   richtig. Er belegt NICHT, dass Supabase die Bestaetigungsmail auch
//   zustellt oder das Ziel befolgt - dafuer muss die Adresse in der
//   Erlaubnisliste des Projekts stehen, und das ist eine Projekteinstellung.
//
// ───────────────────────────────────────────────────────────────────────────
// DIE BEIDEN BEFUNDE
// ───────────────────────────────────────────────────────────────────────────
//
//   1. REGISTRIERUNG OHNE EIGENES ZIEL
//      `signUp` uebergab kein `emailRedirectTo`. Die Bestaetigungsmail hing
//      damit an der projektweiten Site URL - und die zeigte gemessen auf die
//      Anmeldeseite der Verwaltung. Jetzt gibt die Registrierung ihr Ziel
//      selbst mit, und `anmelden.html` verarbeitet beide Rueckkehrformen.
//
//   2. ABMELDEN VERSCHLUCKTE FEHLER
//      `signOut()` fing jeden Fehler ab und meldete anschliessend Erfolg.
//      Die Oberflaeche sagte "abgemeldet", auch wenn der Dienst gar nichts
//      widerrufen hatte. Jetzt werden BEIDE Wege geprueft: eine geworfene
//      Ausnahme UND ein zurueckgegebenes { error }.
//
// Aufruf: npm run auth-027-pruefen

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
const PORT = 5295;
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
const dicht = async (ziel) => {
  await ziel.route('**://**', (r) => (r.request().url().startsWith(ADRESSE) ? r.continue() : r.abort()));
};

// ═══ 1. emailRedirectTo ════════════════════════════════════════════════════
console.log('\n── 1. Die Registrierung gibt ihr Ziel selbst mit ──');
{
  /*
    Gemessen wird auf NETZEBENE, nicht per Attrappe.

    Grund: customer-auth.js holt ihren Client ueber eine Funktion im
    Modulabschluss. Wer `window.CustomerAuth.getClient` ersetzt, ersetzt
    nichts, was signUp benutzt - der erste Anlauf dieser Pruefung tat genau
    das und meldete faelschlich einen fehlenden Wert.

    Stattdessen wird die Anfrage an /auth/v1/signup abgefangen, ihr
    `redirect_to` gelesen und die Anfrage dann ABGEBROCHEN. Es geht nichts
    an Supabase, es wird kein Konto angelegt und keine Mail ausgeloest.
  */
  for (const [name, herkunft] of [['PC', ADRESSE]]) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const gesehen = [];
    await ctx.route('**://**', (r) => {
      const url = r.request().url();
      if (url.startsWith(herkunft)) return r.continue();
      if (/\/auth\/v1\/signup/.test(url)) {
        try { gesehen.push(new URL(url).searchParams.get('redirect_to')); } catch { gesehen.push(null); }
        return r.abort();   // nichts verlaesst das Geraet
      }
      return r.abort();
    });
    const page = await ctx.newPage();
    await page.goto(`${herkunft}/registrieren.html`, { waitUntil: 'load' });
    await page.waitForTimeout(1200);

    /*
      Alle sieben Felder sind Pflicht. Ein ungefuelltes haelt das Formular
      auf, und signUp wuerde nie aufgerufen. Erfundene Angaben,
      .invalid-Adresse.
    */
    await page.fill('#regFirstName', 'Pruefung');
    await page.fill('#regLastName', 'Ohnekonto');
    await page.fill('#regEmail', 'pruefung-ohne-konto@example.invalid');
    await page.fill('#regPhone', '0000000000');
    await page.fill('#regPassword', 'PruefungOhneKonto1');
    await page.fill('#regPasswordConfirm', 'PruefungOhneKonto1');
    await page.check('#regTerms');
    await page.waitForTimeout(300);
    await page.click('#registerForm button[type="submit"]');
    await page.waitForTimeout(2500);

    const ziel = gesehen[0] || null;
    pruefe(gesehen.length > 0, `${name}: die Registrierung hat /auth/v1/signup aufgerufen`);
    pruefe(ziel === `${herkunft}/anmelden.html?bestaetigt=1`,
      `${name}: emailRedirectTo zeigt auf die Kundenseite (${ziel || 'FEHLT'})`);
    pruefe(!/admin|8000/.test(String(ziel)),
      `${name}: das Ziel fuehrt NICHT in den Verwaltungsbereich`);
    hinweis('Ob Supabase dieses Ziel auch BEFOLGT, haengt an der Erlaubnisliste des Projekts und ist hier nicht belegt.');
    await ctx.close();
  }
}

// ═══ 2. anmelden.html verarbeitet beide Rueckkehrformen ════════════════════
console.log('\n── 2. Die Anmeldeseite nimmt die Bestaetigung entgegen ──');
{
  const FAELLE = [
    ['implicit (Raute)', '/anmelden.html?bestaetigt=1#access_token=XXX&type=signup', true],
    ['PKCE (code)', '/anmelden.html?bestaetigt=1&code=XXX', true],
    ['nur bestaetigt=1', '/anmelden.html?bestaetigt=1', true],
    ['Fehler aus der Mail', '/anmelden.html?error=access_denied&error_code=otp_expired', false],
  ];

  for (const [name, pfad, sollAnmelden] of FAELLE) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await dicht(ctx);
    // Attrappe: tut so, als waere die Sitzung aus der Adresse entstanden.
    await ctx.addInitScript((anmelden) => {
      const warten = setInterval(() => {
        const auth = window.CustomerAuth;
        if (!auth) return;
        clearInterval(warten);
        auth.hydrateSession = async () => true;
        auth.isLoggedIn = () => anmelden;
      }, 20);
    }, sollAnmelden);
    const page = await ctx.newPage();
    await page.goto(`${ADRESSE}${pfad}`, { waitUntil: 'load' });
    await page.waitForTimeout(2200);

    const m = await page.evaluate(() => ({
      adresse: window.location.pathname,
      raute: window.location.hash,
      suche: window.location.search,
      hinweis: (document.querySelector('#authLoginNotice')?.textContent || '').replace(/\s+/g, ' ').trim(),
    }));

    if (sollAnmelden && /access_token|code=/.test(pfad)) {
      pruefe(m.adresse.endsWith('meinkonto.html'),
        `${name}: nach der Bestaetigung geht es ins Konto (${m.adresse})`);
    }
    pruefe(!/access_token|code=/.test(m.raute + m.suche),
      `${name}: das Zugangsmerkmal steht nicht mehr in der Adresszeile`);
    if (!sollAnmelden) {
      pruefe(/otp_expired|nicht eingelöst/i.test(m.hinweis),
        `${name}: der Fehler wird benannt ("${m.hinweis.slice(0, 60)}…")`);
      pruefe(!/error_description|@/.test(m.hinweis),
        `${name}: die Meldung enthaelt keine Beschreibung und keine Adresse`);
    }
    await ctx.close();
  }
}

// ═══ 3. Fremde Rueckkehrziele werden abgewiesen ════════════════════════════
console.log('\n── 3. Fremde Rueckkehrziele ──');
{
  const ZIELE = [
    ['fremde Domain', 'https://example.com/', 'meinkonto.html'],
    ['Protokollwechsel', 'javascript:alert(1)', 'meinkonto.html'],
    ['Pfadwechsel', '../admin/login.html', 'meinkonto.html'],
    ['erlaubtes Ziel', 'rewards.html', 'rewards.html'],
  ];
  for (const [name, weiter, erwartet] of ZIELE) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await dicht(ctx);
    /*
      Der Anmeldeaufruf wird auf window.CustomerAuth ersetzt - die Seite
      greift dort zu. Die Attrappe meldet Erfolg, ohne dass irgendetwas
      hinausgeht.
    */
    await ctx.addInitScript(() => {
      const setzen = () => {
        const auth = window.CustomerAuth;
        if (!auth) return false;
        /* Die Seite bricht ohne customer_id ab - siehe anmelden.astro:309.
           Ohne dieses Feld navigiert sie nie, und die Pruefung des
           Rueckkehrziels liefe ins Leere. */
        auth.signInWithPassword = async () => ({ customer_id: "attrappe-kunde", session: { access_token: "t" }, user: { id: "x" } });
        auth.claimCustomerAccount = async () => true;
        auth.isLoggedIn = () => true;
        auth.hydrateSession = async () => true;
        auth.patchNav = () => {};
        return true;
      };
      if (!setzen()) {
        const warten = setInterval(() => { if (setzen()) clearInterval(warten); }, 20);
      }
    });
    const page = await ctx.newPage();
    await page.goto(`${ADRESSE}/anmelden.html?weiter=${encodeURIComponent(weiter)}`, { waitUntil: 'load' });
    await page.waitForTimeout(1200);
    await page.fill('#loginEmail', 'pruefung-ohne-konto@example.invalid');
    await page.fill('#loginPassword', 'PruefungOhneKonto1');
    await page.click('#loginForm button[type="submit"]');
    await page.waitForTimeout(1800);
    const wo = await page.evaluate(() => window.location.pathname + window.location.host);
    pruefe(wo.includes(erwartet) && wo.includes(`127.0.0.1:${PORT}`),
      `${name}: landet auf ${erwartet} und bleibt auf der eigenen Seite (${wo})`);
    await ctx.close();
  }
}

// ═══ 4. Abmelden: Erfolg und Fehlschlag ════════════════════════════════════
console.log('\n── 4. Abmelden meldet, was wirklich passiert ist ──');
{
  /*
    Geprueft wird gegen die ECHTE customer-auth.js - auf Netzebene.

    Warum nicht per Attrappe auf window.CustomerAuth: Die Datei holt ihren
    Client ueber eine interne Funktion im Modulabschluss. Wer nur
    `window.CustomerAuth.getClient` ersetzt, ersetzt nichts, was signOut
    benutzt. Der erste Anlauf dieser Pruefung tat genau das und meldete
    faelschlich Erfolg.

    Stattdessen: eine Sitzung in den Browserspeicher legen, damit der
    Client ueberhaupt etwas zu widerrufen hat, und die Antwort des
    Abmelde-Endpunkts bestimmen. Es geht dabei nichts an Supabase - die
    Anfrage wird abgefangen und selbst beantwortet.
  */
  const konfig = await readFile(join(AUSGABE, 'admin', 'supabase-config.js'), 'utf8');
  const kennung = (konfig.match(/https:\/\/([a-z0-9]+)\.supabase\.co/) || [])[1];
  pruefe(Boolean(kennung), `die Projektkennung liess sich aus der Konfiguration lesen (${kennung ? kennung.slice(0, 4) + '…' : 'FEHLT'})`);

  const sitzungLegen = (ref) => {
    const morgen = Math.floor(Date.now() / 1000) + 3600;
    localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify({
      access_token: 'ATTRAPPE.ATTRAPPE.ATTRAPPE',
      refresh_token: 'attrappe',
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: morgen,
      user: { id: '00000000-0000-0000-0000-000000000000', email: 'pruefung-ohne-konto@example.invalid', aud: 'authenticated', role: 'authenticated' },
    }));
  };

  const FAELLE = [
    ['Dienst bestaetigt (204)', 204, true],
    ['Dienst antwortet 500', 500, false],
    ['Verbindung bricht ab', 'abbruch', false],
    ['Dienst antwortet 403', 403, true],
  ];

  for (const [name, antwort, sollErfolg] of FAELLE) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    // Eigene Streckenfuehrung: alles Fremde weg, NUR der Abmelderuf wird
    // selbst beantwortet.
    await ctx.route('**://**', (r) => {
      const url = r.request().url();
      if (url.startsWith(ADRESSE)) return r.continue();
      if (/\/auth\/v1\/logout/.test(url)) {
        if (antwort === 'abbruch') return r.abort();
        return r.fulfill({ status: antwort, contentType: 'application/json', body: '{}' });
      }
      return r.abort();
    });
    await ctx.addInitScript(sitzungLegen, kennung);
    const page = await ctx.newPage();
    await page.goto(`${ADRESSE}/anmelden.html`, { waitUntil: 'load' });
    await page.waitForTimeout(1500);

    const vorher = await page.evaluate(() => Boolean(window.CustomerAuth?.isLoggedIn?.()));
    const ergebnis = await page.evaluate(async () => {
      try {
        const wert = await window.CustomerAuth.signOut();
        return { erfolg: true, wert: Boolean(wert), meldung: '' };
      } catch (e) {
        return { erfolg: false, wert: false, meldung: String((e && e.message) || '') };
      }
    });
    const nachher = await page.evaluate(() => ({
      angemeldet: Boolean(window.CustomerAuth?.isLoggedIn?.()),
      schnappschuss: Boolean(window.CustomerAuth?.getSessionSnapshot?.()?.session),
    }));

    hinweis(`${name}: vor dem Abmelden angemeldet = ${vorher}`);
    pruefe(ergebnis.erfolg === sollErfolg,
      `${name}: signOut meldet ${sollErfolg ? 'Erfolg' : 'einen Fehler'} (gemeldet: ${ergebnis.erfolg ? 'Erfolg' : 'Fehler'})`);
    if (!sollErfolg) {
      pruefe(/nicht bestaetigt|nicht bestätigt/i.test(ergebnis.meldung),
        `${name}: die Meldung sagt, dass der Widerruf NICHT bestaetigt wurde`);
      pruefe(!/500|403|logout|Netzwerk|fetch/i.test(ergebnis.meldung),
        `${name}: der Wortlaut des Dienstes steht nicht in der Oberflaechenmeldung`);
    }
    pruefe(nachher.angemeldet === false && nachher.schnappschuss === false,
      `${name}: die Sitzung ist oertlich in jedem Fall beendet`);
    await ctx.close();
  }

  hinweis('403 gilt bewusst als Erfolg: Der Client wertet 401/403/404 als "Sitzung ohnehin fort" und raeumt auf.');
  hinweis('Dass der Abmelde-Endpunkt wirklich gerufen wurde, zeigen die unterschiedlichen Ergebnisse je Antwort:');
  hinweis('Ohne Sitzung waere jeder Fall gleich ausgegangen. 500 und Abbruch ergaben aber einen Fehler, 204 und 403 nicht.');
}

// ═══ 5. Der Geltungsbereich bleibt global ══════════════════════════════════
console.log('\n── 5. Geltungsbereich ──');
{
  const bundle = await readFile(join(WURZEL, 'vendor', 'supabase-js-2.117.0.js'), 'utf8');
  pruefe(/signOut\(e=\{scope:`global`\}\)/.test(bundle) || /_signOut\(\{scope:e\}=\{scope:`global`\}\)/.test(bundle),
    'der mitgelieferte Client nimmt ohne Angabe den Geltungsbereich "global"');
  const quelle = await readFile(join(WURZEL, 'customer-auth.js'), 'utf8');
  pruefe(/client\.auth\.signOut\(\)/.test(quelle),
    'customer-auth.js ruft signOut OHNE Argument auf - also global');
  hinweis('Ein bereits ausgestellter Access-Token bleibt bis zum Ablauf gueltig; der Widerruf trifft die Refresh-Tokens.');
}

// ═══ 6. Die uebernommenen feature/011-Korrekturen ══════════════════════════
console.log('\n── 6. Uebernommen aus feature/011 ──');
{
  const mitarbeiter = await readFile(join(WURZEL, 'fahrer', 'mitarbeiter.js'), 'utf8');
  pruefe(/r\.document_submission_id/.test(mitarbeiter),
    'Anhang-Badge wertet document_submission_id aus, statt immer "Ohne Anhang" zu zeigen');
  const laden = await readFile(join(WURZEL, 'fahrer', 'employee-supabase.js'), 'utf8');
  pruefe(/select\([^)]*document_submission_id/.test(laden),
    'und das Feld wird auch geladen - sonst zeigte das Badge stets "Ohne Anhang"');

  const eingang = await readFile(join(WURZEL, 'admin', 'dokumenteingang-supabase.js'), 'utf8');
  pruefe(/from\("profiles"\)/.test(eingang) && /profileRow\.role !== "admin"/.test(eingang),
    'Rollenpruefung liest aus profiles, nicht aus der Menuebeschriftung');
  pruefe(/auth\.getSession\(\)/.test(eingang),
    'und zwar mit derselben Sitzung, die auch die Abfrage benutzt');

  const sidebar = await readFile(join(WURZEL, 'admin', 'sidebar.js'), 'utf8');
  pruefe((sidebar.match(/dokumentfristen\.html/g) || []).length >= 2,
    'Navigationseintrag "Dokumentfristen" ist vorhanden (Menue und Titelzuordnung)');

  const fristen = await readFile(join(WURZEL, 'admin', 'dokumentfristen.html'), 'utf8');
  pruefe(!/sichtbar\.<\/p><\/div><\/div><div data-dokumenteingang/.test(fristen),
    'das verwaiste schliessende </div> ist entfernt');
  const auf = (fristen.match(/<div/g) || []).length;
  const zu = (fristen.match(/<\/div>/g) || []).length;
  pruefe(auf === zu, `oeffnende und schliessende <div> sind ausgeglichen (${auf} zu ${zu})`);
}

await browser.close();
server.close();

console.log('\n═══════════════════════════════════════════════════════════');
console.log(`Auth 027: ${ok.length} bestanden, ${fehl.length} nicht bestanden`);
if (fehl.length) {
  console.log('\nNicht bestanden:');
  for (const f of fehl) console.log('  - ' + f);
}
console.log('\nALLES SIMULIERT. Keine E-Mail ausgeloest, kein Konto angelegt,');
console.log('keine Anmeldung durchgefuehrt, kein Netzverkehr nach aussen.');
console.log('Dass Supabase das Ziel auch BEFOLGT, haengt an der Erlaubnisliste');
console.log('des Projekts und ist hier NICHT belegt.');
console.log('═══════════════════════════════════════════════════════════');
process.exit(fehl.length ? 1 : 0);
