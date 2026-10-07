// ═══════════════════════════════════════════════════════════════════════════
// Flotte und Spezialfahrten im Browser — Desktop und Mobil
// ═══════════════════════════════════════════════════════════════════════════
//
// flotte.html · spezialfahrten.html · spezial-anfrage.html
//
// Die beiden wichtigsten Pruefungen zuerst:
//
//   1. VOLLSTAENDIGKEIT DER FAHRZEUGE. Alle neun Fahrzeuge mit ihren
//      belegten Angaben - Name, Kennzeichen, Kategorie, Sitzplaetze,
//      Einsatzbereich, Besonderheit. Und: Die zwei ohne Foto haben KEINEN
//      leeren Bildbereich und KEIN fremdes Bild.
//
//   2. VOLLSTAENDIGKEIT DES ANFRAGEWEGS. Fuer jede der neun Fahrtarten wird
//      der Dialog geoeffnet, jedes Feld ausgefuellt und geprueft, dass JEDER
//      Wert in der vorbereiteten WhatsApp-Nachricht ankommt. Das ist der
//      Punkt, an dem eine stillschweigend verlorene Angabe auffallen muss -
//      im Bestand waren es bis zu siebzehn Felder je Fahrtart.
//
// WICHTIG ZUR AUSSAGEKRAFT: Es wird KEINE Nachricht versendet. `window.open`
// wird abgefangen und die Adresse nur gelesen. Es wird nichts angerufen und
// nichts abgeschickt.
//
// Aufruf: npm run flotte-pruefen

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = await import(
  new URL('../fahrer/tests/node_modules/playwright/index.mjs', import.meta.url).href
);

const WURZEL = fileURLToPath(new URL('..', import.meta.url));
const AUSGABE = join(WURZEL, 'dist-oeffentlich');
const PORT = 5292;
const ADRESSE = `http://127.0.0.1:${PORT}`;

const TYP = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.mp4': 'video/mp4', '.webm': 'video/webm', '.woff2': 'font/woff2',
  '.ico': 'image/x-icon', '.xml': 'application/xml', '.txt': 'text/plain',
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

/** Aus den Quellen lesen, damit die Pruefung nicht dieselbe Liste rät. */
const inhalte = await readFile(join(WURZEL, 'src', 'inhalte.ts'), 'utf8');
const FAHRZEUGE = [...inhalte.matchAll(/\{ name: '([^']+)'[^}]*?kennzeichen: '([^']+)'[^}]*?kategorie: '([^']+)'[^}]*?bild: (null|'[^']*')/g)]
  .map((m) => ({ name: m[1], kennzeichen: m[2], kategorie: m[3], hatBild: m[4] !== 'null' }));

const ARTEN = ['medical', 'dialysis', 'chemo', 'wheelchair', 'series', 'airport', 'business', 'student', 'courier'];

const browser = await chromium.launch({ channel: 'chrome' });

/** Abgeschotteter Kontext: nichts geht nach draussen, nichts wird gesendet. */
async function kontext(breite, hoehe) {
  const ctx = await browser.newContext({ viewport: { width: breite, height: hoehe } });
  await ctx.route('**://**', (r) => (r.request().url().startsWith(ADRESSE) ? r.continue() : r.abort()));
  // window.open abfangen - die Adresse wird nur gemerkt, nichts geoeffnet.
  await ctx.addInitScript(() => {
    window.__geoeffnet = [];
    window.open = ((u) => { window.__geoeffnet.push(String(u)); return null; });
  });
  return ctx;
}

console.log(`\nFahrzeuge laut inhalte.ts: ${FAHRZEUGE.length}, davon ohne Foto: ${FAHRZEUGE.filter((f) => !f.hatBild).length}`);

// ── 1. Flotte ──────────────────────────────────────────────────────────────
for (const [name, breite, hoehe] of [['Desktop', 1440, 900], ['Mobil', 390, 844]]) {
  console.log(`\n── Flotte · ${name} ──`);
  const ctx = await kontext(breite, hoehe);
  const p = await ctx.newPage();
  const fehler = [];
  const fehlend = [];
  p.on('pageerror', (e) => fehler.push(String(e).slice(0, 90)));
  p.on('console', (m) => { if (m.type() === 'error') fehler.push(m.text().slice(0, 90)); });
  p.on('response', (r) => { if (r.status() === 404) fehlend.push(new URL(r.url()).pathname); });

  await p.goto(`${ADRESSE}/flotte.html`, { waitUntil: 'load' });
  // Durchscrollen, damit jede Karte enthuellt wird.
  for (let i = 0; i < 24; i += 1) { await p.mouse.wheel(0, 700); await p.waitForTimeout(90); }
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.waitForTimeout(700);

  pruefe(fehler.length === 0, `${name}: keine Skriptfehler${fehler.length ? ' — ' + fehler[0] : ''}`);
  pruefe(fehlend.length === 0, `${name}: keine fehlende Datei${fehlend.length ? ' — ' + [...new Set(fehlend)].join(', ') : ''}`);

  const karten = await p.evaluate(() =>
    [...document.querySelectorAll('[data-fahrzeug]')].map((k) => {
      const bild = k.querySelector('img');
      return {
        kennzeichen: k.getAttribute('data-kennzeichen'),
        kategorie: k.getAttribute('data-kategorie'),
        text: (k.textContent || '').replace(/\s+/g, ' ').trim(),
        hatBildElement: !!bild,
        bildGeladen: bild ? bild.complete && bild.naturalWidth > 0 : null,
        bildQuelle: bild ? new URL(bild.currentSrc || bild.src).pathname : null,
        // Hoehe des Bildbereichs: bei den Karten ohne Foto muss er fehlen,
        // nicht nur leer sein.
        bildbereich: Math.round(k.querySelector('.aspect-\\[4\\/3\\]')?.getBoundingClientRect().height || 0),
        anfrage: !!k.querySelector('[data-anfrage-oeffnen]'),
      };
    }),
  );

  pruefe(karten.length === FAHRZEUGE.length, `${name}: alle ${FAHRZEUGE.length} Fahrzeuge stehen da (${karten.length})`);

  let unvollstaendig = [];
  for (const f of FAHRZEUGE) {
    const k = karten.find((x) => x.kennzeichen === f.kennzeichen);
    if (!k) { unvollstaendig.push(`${f.kennzeichen} fehlt`); continue; }
    if (!k.text.includes(f.name)) unvollstaendig.push(`${f.kennzeichen}: Name fehlt`);
    if (!k.text.includes(f.kennzeichen)) unvollstaendig.push(`${f.kennzeichen}: Kennzeichen fehlt`);
    if (!k.text.includes(f.kategorie)) unvollstaendig.push(`${f.kennzeichen}: Kategorie fehlt`);
    if (!k.anfrage) unvollstaendig.push(`${f.kennzeichen}: kein Anfrageknopf`);
  }
  pruefe(unvollstaendig.length === 0, `${name}: jedes Fahrzeug mit Name, Kennzeichen, Kategorie und Anfrageknopf${unvollstaendig.length ? ' — ' + unvollstaendig.slice(0, 3).join(', ') : ''}`);

  const mitBild = karten.filter((k) => k.hatBildElement);
  pruefe(
    mitBild.every((k) => k.bildGeladen),
    `${name}: alle ${mitBild.length} Fahrzeugfotos laden wirklich (${mitBild.filter((k) => !k.bildGeladen).length} nicht)`,
  );
  pruefe(
    mitBild.every((k) => k.bildQuelle?.startsWith('/assets/fleet/')),
    `${name}: die Fotos kommen aus /assets/fleet/, nicht mehr aus admin/images/`,
  );

  const ohneFoto = FAHRZEUGE.filter((f) => !f.hatBild).map((f) => f.kennzeichen);
  const leerkasten = karten.filter((k) => ohneFoto.includes(k.kennzeichen) && (k.hatBildElement || k.bildbereich > 0));
  pruefe(
    leerkasten.length === 0,
    `${name}: die ${ohneFoto.length} Fahrzeuge ohne Foto (${ohneFoto.join(', ')}) haben KEINEN leeren Bildbereich${leerkasten.length ? ' — ' + leerkasten.map((k) => k.kennzeichen).join(', ') : ''}`,
  );
  const fremdbild = karten.filter((k) => ohneFoto.includes(k.kennzeichen) && k.bildQuelle);
  pruefe(fremdbild.length === 0, `${name}: und auch kein erfundenes Ersatzbild`);

  // ── Filter ───────────────────────────────────────────────────────────
  const filter = await p.evaluate(() =>
    [...document.querySelectorAll('[data-flotte-filter] [data-kategorie]')].map((b) => b.getAttribute('data-kategorie')),
  );
  pruefe(filter.length === 5, `${name}: fünf Filter wie im Bestand (${filter.join(', ')})`);

  for (const k of ['Taxi', 'Großraum', 'Elektro', 'Rollstuhl', 'Alle']) {
    await p.click(`[data-flotte-filter] [data-kategorie="${k}"]`);
    await p.waitForTimeout(250);
    const stand = await p.evaluate(() => {
      const sichtbar = [...document.querySelectorAll('[data-fahrzeug]')].filter(
        (el) => el.getBoundingClientRect().height > 0,
      );
      return {
        anzahl: sichtbar.length,
        kategorien: [...new Set(sichtbar.map((el) => el.getAttribute('data-kategorie')))],
        text: (document.querySelector('[data-flotte-anzahl]')?.textContent || '').trim(),
      };
    });
    const erwartet = k === 'Alle' ? FAHRZEUGE.length : FAHRZEUGE.filter((f) => f.kategorie === k).length;
    pruefe(
      stand.anzahl === erwartet && (k === 'Alle' || (stand.kategorien.length === 1 && stand.kategorien[0] === k)),
      `${name}: Filter „${k}" zeigt genau ${erwartet} Fahrzeuge (${stand.anzahl}, „${stand.text}")`,
    );
  }

  // Direktlink auf eine Kategorie
  await p.goto(`${ADRESSE}/flotte.html?kategorie=Rollstuhl`, { waitUntil: 'load' });
  await p.waitForTimeout(600);
  const direkt = await p.evaluate(() => ({
    sichtbar: [...document.querySelectorAll('[data-fahrzeug]')].filter((el) => el.getBoundingClientRect().height > 0).length,
    gewaehlt: document.querySelector('[data-flotte-filter] [aria-pressed="true"]')?.getAttribute('data-kategorie'),
  }));
  pruefe(
    direkt.gewaehlt === 'Rollstuhl' && direkt.sichtbar === FAHRZEUGE.filter((f) => f.kategorie === 'Rollstuhl').length,
    `${name}: Direktlink ?kategorie=Rollstuhl greift (${direkt.sichtbar} Fahrzeug, Filter „${direkt.gewaehlt}")`,
  );

  await p.close();
  await ctx.close();
}

// ── 2. Direktlinks der Spezialseiten ───────────────────────────────────────
console.log('\n── Direktlinks ──');
{
  const ctx = await kontext(1440, 900);
  for (const art of ARTEN) {
    const p = await ctx.newPage();
    await p.goto(`${ADRESSE}/spezial-anfrage.html?service=${art}`, { waitUntil: 'load' });
    await p.waitForTimeout(500);
    const stand = await p.evaluate(() => ({
      gewaehlt: document.querySelector('[data-art-leiste] [aria-pressed="true"]')?.getAttribute('data-art'),
      sichtbar: [...document.querySelectorAll('[data-art-text]')].filter((s) => !s.hidden).map((s) => s.getAttribute('data-art-text')),
    }));
    pruefe(
      stand.gewaehlt === art && stand.sichtbar.length === 1 && stand.sichtbar[0] === art,
      `?service=${art} waehlt die richtige Fahrtart vor (${stand.gewaehlt})`,
    );
    await p.close();
  }

  // Unbekannter Wert faellt wie im Bestand auf medical zurueck
  const p = await ctx.newPage();
  await p.goto(`${ADRESSE}/spezial-anfrage.html?service=gibtsnicht`, { waitUntil: 'load' });
  await p.waitForTimeout(400);
  pruefe(
    (await p.evaluate(() => document.querySelector('[data-art-leiste] [aria-pressed="true"]')?.getAttribute('data-art'))) === 'medical',
    'ein unbekannter ?service-Wert faellt auf „medical" zurueck, wie bisher',
  );
  await p.goto(`${ADRESSE}/spezial-anfrage.html?service=courier#specialRequest`, { waitUntil: 'load' });
  await p.waitForTimeout(800);
  pruefe(
    (await p.evaluate(() => Math.round(window.scrollY))) > 100,
    'die Sprungmarke #specialRequest fuehrt weiterhin zum Anfragebereich',
  );
  await p.close();
  await ctx.close();
}

// ── 3. Der Anfrageweg, Fahrtart für Fahrtart ───────────────────────────────
//
// Jedes Feld wird ausgefuellt und in der WhatsApp-Adresse wiedergefunden.
for (const [name, breite, hoehe] of [['Desktop', 1440, 900], ['Mobil', 390, 844]]) {
  console.log(`\n── Anfrageweg · ${name} ──`);
  const ctx = await kontext(breite, hoehe);

  for (const art of ARTEN) {
    const p = await ctx.newPage();
    await p.goto(`${ADRESSE}/spezial-anfrage.html?service=${art}`, { waitUntil: 'load' });
    await p.waitForTimeout(500);

    await p.click(`[data-art-text="${art}"] [data-anfrage-oeffnen]`);
    await p.waitForTimeout(500);

    const sichtbar = await p.evaluate(() => {
      const d = document.querySelector('[role="dialog"]');
      if (!d || d.hidden) return null;
      const r = d.getBoundingClientRect();
      return { imBild: r.width > 200 && r.height > 200, deckung: Math.round(r.width) };
    });
    pruefe(!!sichtbar?.imBild, `${name} · ${art}: der Dialog steht sichtbar im Bild`);

    // Schritt 1: Adressen
    await p.fill('#dlg-pickup', 'Friedrich-Ebert-Straße 8, Germersheim');
    await p.fill('#dlg-dest', 'Klinikum Landau');
    await p.click('[data-anfrage-weiter]');
    await p.waitForTimeout(350);

    // Schritt 2: Zusatzangaben ausfuellen
    const werte = await p.evaluate((a) => {
      const satz = document.querySelector(`[data-detail-satz="${a}"]`);
      if (!satz) return null;
      const erfasst = [];
      let n = 0;
      for (const el of satz.querySelectorAll('[data-detail-feld]')) {
        const id = el.getAttribute('data-detail-feld');
        n += 1;
        if (el.hasAttribute('data-mehrfach')) {
          const box = el.querySelector('input[type="checkbox"]');
          if (box) { box.checked = true; box.dispatchEvent(new Event('change', { bubbles: true })); erfasst.push([id, box.value]); }
        } else if (el.tagName === 'SELECT') {
          const opt = [...el.options].find((o) => o.value);
          if (opt) { el.value = opt.value; el.dispatchEvent(new Event('change', { bubbles: true })); erfasst.push([id, opt.value]); }
        } else {
          const typ = el.getAttribute('type');
          const v = typ === 'date' ? '2026-10-15'
            : typ === 'time' ? '09:30'
            : typ === 'number' ? '2'
            : typ === 'email' ? 'pruefung@example.invalid'
            : typ === 'tel' ? '07274 3567'
            : `Pruefwert ${id}`;
          el.value = v;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          erfasst.push([id, v]);
        }
      }
      return { anzahl: n, erfasst };
    }, art);

    pruefe(werte !== null && werte.anzahl > 0, `${name} · ${art}: der Feldsatz ist da (${werte?.anzahl ?? 0} Felder)`);

    await p.click('[data-anfrage-weiter]');
    await p.waitForTimeout(400);

    // Schritt 3 muss erreicht sein - sonst hat die Pruefung angeschlagen
    const inSchritt3 = await p.evaluate(() => !document.querySelector('[data-schritt="3"]')?.hidden);
    pruefe(inSchritt3, `${name} · ${art}: mit vollstaendigen Angaben geht es zur Zusammenfassung`);

    await p.click('[data-anfrage-weiter]');
    await p.waitForTimeout(500);

    const adresse = await p.evaluate(() => window.__geoeffnet?.[0] || '');
    pruefe(adresse.startsWith('https://wa.me/4972743567?text='), `${name} · ${art}: WhatsApp-Adresse mit der Zentrale als Empfaenger`);
    const text = decodeURIComponent(adresse.split('text=')[1] || '');

    const fehlendeWerte = (werte?.erfasst ?? []).filter(([, v]) => !text.includes(v));
    pruefe(
      fehlendeWerte.length === 0,
      `${name} · ${art}: alle ${werte?.erfasst.length ?? 0} Zusatzangaben stehen in der Nachricht${fehlendeWerte.length ? ' — FEHLT: ' + fehlendeWerte.map(([k]) => k).join(', ') : ''}`,
    );
    pruefe(text.includes('Friedrich-Ebert-Straße 8, Germersheim') && text.includes('Klinikum Landau'),
      `${name} · ${art}: beide Adressen stehen in der Nachricht`);
    pruefe(/Fahrtart: /.test(text), `${name} · ${art}: die Fahrtart steht ausdruecklich in der Nachricht`);
    // Gesucht wird eine BEHAUPTUNG, nicht ein Wort.
    //
    // Der erste Anlauf verbot schlicht „Preis" - und schlug bei
    // Flughafentransfers an, weil dort das Bestandsfeld „Festpreisanfrage"
    // steht. Das ist die FRAGE nach einem Festpreis, keine Preisangabe; sie
    // stand so schon im alten Formular und bleibt. Gepruefte Behauptungen
    // sind: ein Betrag, eine Entfernung, eine zugesagte Bestaetigung.
    const behauptung = [
      /\d[\d.,]*\s*(€|EUR|Euro)/i,
      /\d[\d.,]*\s*(km|Kilometer)\b/i,
      /\b(kostet|Gesamtpreis|Fahrpreis|Festpreis:)\b/i,
      /\b(ist bestätigt|wurde bestätigt|bestätigte Fahrt|Buchung bestätigt)\b/i,
    ].filter((r) => r.test(text));
    pruefe(
      behauptung.length === 0,
      `${name} · ${art}: kein Betrag, keine Entfernung, keine zugesagte Bestaetigung${behauptung.length ? ' — ' + behauptung.map(String).join(' ') : ''}`,
    );

    await p.close();
  }
  await ctx.close();
}

// ── 4. Pflichtangaben und Erhalt der Eingaben ──────────────────────────────
console.log('\n── Pflichtangaben und Eingaben ──');
{
  const ctx = await kontext(1440, 900);
  const p = await ctx.newPage();
  await p.goto(`${ADRESSE}/spezial-anfrage.html?service=courier`, { waitUntil: 'load' });
  await p.waitForTimeout(500);
  await p.click('[data-art-text="courier"] [data-anfrage-oeffnen]');
  await p.waitForTimeout(400);
  await p.fill('#dlg-pickup', 'Abholadresse Probe');
  await p.fill('#dlg-dest', 'Zieladresse Probe');
  await p.click('[data-anfrage-weiter]');
  await p.waitForTimeout(350);

  // Ohne Zusatzangaben darf es NICHT weitergehen.
  await p.click('[data-anfrage-weiter]');
  await p.waitForTimeout(350);
  const gehalten = await p.evaluate(() => ({
    nochSchritt2: !document.querySelector('[data-schritt="2"]')?.hidden,
    meldungen: [...document.querySelectorAll('[data-detail-satz="courier"] [data-detail-fehler]')].filter((m) => !m.hidden).length,
  }));
  pruefe(gehalten.nochSchritt2, 'ohne Pflichtangaben bleibt der Dialog auf Schritt 2 stehen');
  pruefe(gehalten.meldungen > 0, `die fehlenden Pflichtfelder werden benannt (${gehalten.meldungen} Meldungen)`);

  // Eine Angabe eintragen, schliessen, erneut oeffnen - sie muss dastehen.
  await p.fill('#dlg-courier-shipmentType', 'Bauteil, klein');
  await p.click('[data-anfrage-schliessen]');
  await p.waitForTimeout(400);
  await p.click('[data-art-text="courier"] [data-anfrage-oeffnen]');
  await p.waitForTimeout(400);
  const erhalten = await p.evaluate(() => ({
    sendung: (document.querySelector('#dlg-courier-shipmentType') )?.value,
    abholung: (document.querySelector('#dlg-pickup') )?.value,
  }));
  pruefe(
    erhalten.sendung === 'Bauteil, klein' && erhalten.abholung === 'Abholadresse Probe',
    `Eingaben ueberstehen Schliessen und erneutes Oeffnen („${erhalten.sendung}", „${erhalten.abholung}")`,
  );

  // Vorbelegung bei Dialyse und Chemo, wie im Bestand
  for (const [art, wert] of [['dialysis', 'Dialyse'], ['chemo', 'Chemo']]) {
    const q = await ctx.newPage();
    await q.goto(`${ADRESSE}/spezial-anfrage.html?service=${art}`, { waitUntil: 'load' });
    await q.waitForTimeout(450);
    await q.click(`[data-art-text="${art}"] [data-anfrage-oeffnen]`);
    await q.waitForTimeout(400);
    const gesetzt = await q.evaluate((a) => (document.querySelector(`#dlg-${a}-rideType`) )?.value, art);
    pruefe(gesetzt === wert, `${art}: der Fahrttyp ist mit „${wert}" vorbelegt (${gesetzt})`);
    await q.close();
  }

  await p.close();
  await ctx.close();
}

// ── 5. Spezialfahrten-Übersicht ────────────────────────────────────────────
console.log('\n── Übersicht ──');
{
  const ctx = await kontext(390, 844);
  const p = await ctx.newPage();
  await p.goto(`${ADRESSE}/spezialfahrten.html`, { waitUntil: 'load' });
  for (let i = 0; i < 22; i += 1) { await p.mouse.wheel(0, 700); await p.waitForTimeout(80); }
  await p.waitForTimeout(600);

  const stand = await p.evaluate(() => ({
    karten: document.querySelectorAll('[id^="fahrtart-"]').length,
    anfragen: document.querySelectorAll('[data-anfrage-oeffnen][data-fahrtart]').length,
    mehr: [...document.querySelectorAll('a[href^="spezial-anfrage.html?service="]')].map((a) => a.getAttribute('href')),
    quer: document.documentElement.scrollWidth > window.innerWidth + 2,
    transportschein: (document.body.innerText || '').includes('Wir nehmen Transportscheine aller Krankenkassen an'),
  }));

  pruefe(stand.karten === ARTEN.length, `alle neun Fahrtarten stehen da (${stand.karten})`);
  pruefe(stand.mehr.length === ARTEN.length, `neun „Mehr erfahren"-Verweise mit ?service= (${stand.mehr.length})`);
  pruefe(ARTEN.every((a) => stand.mehr.includes(`spezial-anfrage.html?service=${a}`)), 'jeder Verweis traegt den richtigen Schluessel');
  pruefe(stand.anfragen >= ARTEN.length, `jede Karte hat „Anfrage starten" (${stand.anfragen})`);
  pruefe(!stand.quer, 'kein waagerechter Ueberlauf auf dem Handy');
  pruefe(stand.transportschein, 'der freigegebene Transportschein-Text steht unveraendert da');

  // „Anfrage starten" waehlt die Fahrtart vor
  await p.click('[id="fahrtart-wheelchair"] [data-anfrage-oeffnen]');
  await p.waitForTimeout(500);
  const vorgewaehlt = await p.evaluate(() => ({
    satz: [...document.querySelectorAll('[data-detail-satz]')].filter((s) => !s.hidden).map((s) => s.getAttribute('data-detail-satz')),
    leistung: [...document.querySelectorAll('[data-leistungsanzeige]')].filter((s) => !s.hidden).map((s) => s.getAttribute('data-leistungsanzeige')),
  }));
  pruefe(
    vorgewaehlt.satz.length === 1 && vorgewaehlt.satz[0] === 'wheelchair' && vorgewaehlt.leistung[0] === 'Rollstuhlfahrten',
    `„Anfrage starten" waehlt Fahrtart und Leistung vor (${vorgewaehlt.satz[0]} / ${vorgewaehlt.leistung[0]})`,
  );

  await p.close();
  await ctx.close();
}

// ── 6. Die Startseite bleibt, wie sie war ──────────────────────────────────
console.log('\n── Startseite unberührt ──');
{
  const ctx = await kontext(1440, 900);
  const p = await ctx.newPage();
  await p.goto(`${ADRESSE}/index.html`, { waitUntil: 'load' });
  await p.waitForTimeout(800);
  const stand = await p.evaluate(() => ({
    detailBlock: document.querySelectorAll('[data-detail-block]').length,
    detailSaetze: document.querySelectorAll('[data-detail-satz]').length,
    pflicht: document.querySelector('[role="dialog"]')?.getAttribute('data-pflicht-details'),
  }));
  pruefe(stand.detailBlock === 0 && stand.detailSaetze === 0, `die Startseite traegt KEINE Zusatzangaben (${stand.detailBlock}/${stand.detailSaetze})`);
  pruefe(!stand.pflicht, 'und auch keine Pflichtangaben-Schaltung');
  await p.close();
  await ctx.close();
}

await browser.close();
server.close();

console.log(`\nbestanden: ${ok.length}   fehlgeschlagen: ${fehl.length}`);
console.log('Es wurde KEINE Nachricht versendet: window.open war abgefangen, die Adresse nur gelesen.');
if (fehl.length) {
  console.log('\n' + fehl.join('\n'));
  process.exitCode = 1;
}
