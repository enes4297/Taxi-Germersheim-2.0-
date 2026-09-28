// ═══════════════════════════════════════════════════════════════════════════
// Schritt 025 — Kopfzeile der Spielewelt und die Vorschauen der Startseite
// ═══════════════════════════════════════════════════════════════════════════
//
// Zwei sichtbare Gestaltungsfehler wurden behoben. Dieser Lauf haelt beide
// fest, damit sie nicht zurueckkommen.
//
// ───────────────────────────────────────────────────────────────────────────
// 1. DIE KOPFZEILE AUF spiele.html
// ───────────────────────────────────────────────────────────────────────────
//
//   Die Spielewelt ist uebernommener Bestand und wird nicht gebaut. Sie
//   trug deshalb noch die alte, selbst zusammengesetzte Kopfzeile mit
//   einem deutlich groesseren Logo.
//
//   tools/kopfzeile-bestand.mjs setzt beim Bauen die echte Kopfzeile aus
//   dem Astro-Ergebnis ein. Geprueft wird nicht "sieht aehnlich aus",
//   sondern Element fuer Element gegen rewards.html - dieselbe Kopfzeile,
//   dieselben Masse.
//
//   WARUM DAS NOETIG WAR: style.css liegt ausserhalb jeder Kaskadenschicht.
//   Unbeschichtetes CSS schlaegt beschichtetes IMMER, unabhaengig von
//   Spezifitaet und Reihenfolge. Die Tailwind-Klassen der freigegebenen
//   Kopfzeile liegen in @layer utilities und verloren deshalb jede
//   Auseinandersetzung mit dem Bestand.
//
// ───────────────────────────────────────────────────────────────────────────
// 2. DIE VORSCHAUEN IM REWARDS-ABSCHNITT DER STARTSEITE
// ───────────────────────────────────────────────────────────────────────────
//
//   Dort standen nachgezeichnete Motive: ein Rad mit einem "Y" in der Nabe
//   und ein Rechteck auf ein paar Balken. Beide Spiele sehen seit den
//   Schritten 022 und 023 anders aus.
//
//   Jetzt stehen dort Aufnahmen AUS den gebauten Spielen
//   (tools/spielbilder.mjs). Geprueft wird:
//     - dass die Bilder da sind und in ihre Flaeche passen (beide
//       Ausschnitte waren zweimal zu gross und oben/unten angeschnitten),
//     - dass in den Karten NICHTS dauerhaft laeuft,
//     - dass beim Rad keine Teilnahme versprochen wird,
//     - dass Yumaks Box nicht als fertige Funktion auftritt,
//     - dass Taxi Rush auf das Spiel zeigt.
//
// Aufruf: npm run kopf-teaser-pruefen

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = await import(
  new URL('../fahrer/tests/node_modules/playwright/index.mjs', import.meta.url).href
);

const WURZEL = fileURLToPath(new URL('..', import.meta.url));
const AUSGABE = join(WURZEL, 'dist-oeffentlich');
const PORT = 5291;
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

/*
  Ein zweiter Browser OHNE klassische Bildlaufleiste - fuer den
  Vergleich der beiden Kopfzeilen.

  spiele.html setzt fuer das Dokument overflow-y:auto und zeigt am
  Schreibtisch eine Bildlaufleiste; die Astro-Seiten blenden ihre aus.
  Das verschiebt rechtsbuendige Teile um 15 Pixel - eine Eigenschaft
  der Seite, nicht der Kopfzeile, und auf dem Handy gar nicht
  vorhanden, weil iOS die Leiste ueberlagert statt Platz zu nehmen.

  Verglichen wird deshalb so, wie es das Handy zeigt. Der
  Breitenunterschied am PC wird weiter unten eigens gemessen und
  benannt, damit er nicht unter den Tisch faellt.
*/
const browserOhneLeiste = await chromium.launch({ channel: 'chrome', args: ['--hide-scrollbars'] });

/** Kein Netz nach aussen. Keine Abfrage, keine Nachricht, keine Sitzung. */
const dicht = async (page) => {
  await page.route('**://**', (r) => (r.request().url().startsWith(ADRESSE) ? r.continue() : r.abort()));
};

/**
 * Die Kopfzeile als Liste von Messwerten - Element fuer Element in
 * Dokumentreihenfolge. Verglichen wird nicht das Aussehen, sondern die
 * Zahl daneben.
 */
const kopfAufnehmen = () => {
  const kopf = document.querySelector('header[data-kopf]');
  if (!kopf) return null;
  /*
    Bezugspunkt ist der innere Kasten der Kopfzeile, nicht der
    Fensterrand: Er traegt die Innenabstaende und ordnet alles an.
  */
  const bezug = kopf.firstElementChild || kopf;
  const k = bezug.getBoundingClientRect();
  /*
    Gemessen wird RELATIV zur Kopfzeile, nicht zum Fensterrand.

    Grund: spiele.html setzt fuer das Dokument overflow-y:auto und
    zeigt darum am Schreibtisch eine klassische Bildlaufleiste; die
    Astro-Seiten blenden ihre aus. Das verschiebt am PC alles um genau
    15 Pixel - eine Eigenschaft der Seite, nicht der Kopfzeile, und am
    Handy gar nicht vorhanden. Ein absoluter Vergleich wuerde diese 15
    Pixel als Kopfzeilenfehler melden und den Blick auf echte
    Abweichungen verstellen. Die Breite der Kopfzeile selbst wird
    darum unten eigens ausgewiesen.
  */
  const r = (e) => {
    const b = e.getBoundingClientRect();
    const c = getComputedStyle(e);
    return {
      marke: `${e.tagName}.${e.className}`,
      b: (e === kopf || e === bezug) ? 'volle Breite' : Math.round(b.width), h: Math.round(b.height),
      x: Math.round(b.x - k.x), y: Math.round(b.y - k.y),
      schrift: `${c.fontSize}/${c.fontWeight}/${c.letterSpacing}`,
      farbe: c.color,
      innen: c.padding,
      anzeige: c.display,
    };
  };
  return [r(kopf), ...[...kopf.querySelectorAll('*')].map(r)];
};

// ═══ 1. Die Kopfzeile ══════════════════════════════════════════════════════
for (const [name, vp] of [['PC (1440)', { width: 1440, height: 900 }], ['Handy (390)', { width: 390, height: 844 }]]) {
  const aufnahmen = {};
  for (const seite of ['rewards.html', 'spiele.html']) {
    const page = await browserOhneLeiste.newPage({ viewport: vp });
    await dicht(page);
    await page.goto(`${ADRESSE}/${seite}`, { waitUntil: 'load' });
    /*
      Die klassische Bildlaufleiste fuer den Vergleich abschalten - auf
      BEIDEN Seiten gleich. Sie nimmt am Schreibtisch 15 Pixel Platz
      und verschiebt alles Rechtsbuendige; auf dem Handy ueberlagert
      iOS sie und nimmt keinen Platz. Verglichen wird also so, wie es
      das Handy zeigt. Der Unterschied am PC wird unten eigens
      gemessen und benannt - er verschwindet hier nicht stillschweigend.
    */
    await page.addStyleTag({ content: '::-webkit-scrollbar{width:0!important;height:0!important}' });
    await page.waitForTimeout(900);
    aufnahmen[seite] = await page.evaluate(kopfAufnehmen);
    await page.close();
  }

  // Ein stiller Ausfall waere schlimmer als eine Abweichung: Wenn die
  // Aufnahme leer ist, ist die Kopfzeile gar nicht da - und ein Vergleich
  // von nichts mit nichts wuerde als "stimmt ueberein" durchgehen.
  const a = aufnahmen['rewards.html'];
  const b = aufnahmen['spiele.html'];
  pruefe(Array.isArray(a) && a.length > 10, `${name}: die freigegebene Kopfzeile auf rewards.html ist messbar (${a ? a.length : 0} Elemente)`);
  pruefe(Array.isArray(b) && b.length > 10, `${name}: spiele.html traegt eine Kopfzeile mit data-kopf (${b ? b.length : 0} Elemente)`);
  if (!a || !b) continue;

  pruefe(a.length === b.length, `${name}: gleich viele Elemente in beiden Kopfzeilen (${a.length} / ${b.length})`);

  const abweichend = [];
  for (let i = 0; i < Math.min(a.length, b.length); i += 1) {
    const unterschiede = Object.keys(a[i]).filter((k) => a[i][k] !== b[i][k]);
    if (unterschiede.length) abweichend.push(`${a[i].marke}: ${unterschiede.map((k) => `${k} ${a[i][k]} ≠ ${b[i][k]}`).join(', ')}`);
  }
  pruefe(abweichend.length === 0, `${name}: kein Element weicht ab (${Math.min(a.length, b.length)} verglichen)`);
  for (const z of abweichend.slice(0, 8)) hinweis(z);

  /*
    Die eine bekannte, benannte Abweichung: die Bildlaufleiste.

    spiele.html setzt fuer das Dokument overflow-y:auto und zeigt am
    Schreibtisch eine klassische Bildlaufleiste. Die Astro-Seiten
    blenden ihre aus. Der nutzbare Streifen ist dadurch am PC um die
    Breite der Leiste schmaler - am Handy gar nicht, dort gibt es
    keine. Das ist eine Eigenschaft der Seite, nicht der Kopfzeile;
    die Spielewelt ist uebernommener Bestand und behaelt ihre
    Bildlaufleiste.
  */
  const breiten = {};
  for (const seite of ['rewards.html', 'spiele.html']) {
    const page = await browser.newPage({ viewport: vp });
    await dicht(page);
    await page.goto(`${ADRESSE}/${seite}`, { waitUntil: 'load' });
    await page.waitForTimeout(700);
    breiten[seite] = await page.evaluate(() => Math.round(document.querySelector('header[data-kopf]').getBoundingClientRect().width));
    await page.close();
  }
  const leiste = breiten['rewards.html'] - breiten['spiele.html'];
  pruefe(leiste === 0 || (leiste > 0 && leiste <= 17),
    `${name}: der Breitenunterschied erklaert sich allein aus der Bildlaufleiste der Spielewelt (${leiste} px)`);

  // Das Logo eigens - es war der gemeldete Fehler.
  const logoA = a.find((e) => e.marke.startsWith('IMG'));
  const logoB = b.find((e) => e.marke.startsWith('IMG'));
  pruefe(Boolean(logoA && logoB) && logoA.b === logoB.b && logoA.h === logoB.h,
    `${name}: das Logo ist gleich gross (${logoA ? `${logoA.b}×${logoA.h}` : '?'} / ${logoB ? `${logoB.b}×${logoB.h}` : '?'})`);
}

// Das Mobilmenue muss sich auf beiden Seiten gleich verhalten.
{
  const zustaende = {};
  for (const seite of ['rewards.html', 'spiele.html']) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await dicht(page);
    await page.goto(`${ADRESSE}/${seite}`, { waitUntil: 'load' });
    await page.waitForTimeout(900);
    const knopf = page.locator('header[data-kopf] button[aria-expanded]').first();
    const vorher = await knopf.getAttribute('aria-expanded');
    await knopf.click();
    await page.waitForTimeout(450);
    zustaende[seite] = await page.evaluate((v) => {
      const offen = document.querySelector('header[data-kopf] [id], header[data-kopf] nav');
      const menue = [...document.querySelectorAll('header[data-kopf] a')].filter((x) => x.getBoundingClientRect().width > 0);
      return {
        vorher: v,
        nachher: document.querySelector('header[data-kopf] button[aria-expanded]').getAttribute('aria-expanded'),
        links: menue.map((x) => `${x.textContent.replace(/\s+/g, ' ').trim()}→${x.getAttribute('href')}`),
        hoehe: offen ? Math.round(offen.getBoundingClientRect().height) : 0,
      };
    }, vorher);
    await page.close();
  }
  const r = zustaende['rewards.html'];
  const s = zustaende['spiele.html'];
  pruefe(r.vorher === 'false' && r.nachher === 'true', `Mobilmenue rewards.html: aria-expanded schaltet ${r.vorher} → ${r.nachher}`);
  pruefe(s.vorher === 'false' && s.nachher === 'true', `Mobilmenue spiele.html: aria-expanded schaltet ${s.vorher} → ${s.nachher}`);
  pruefe(r.links.length > 4 && JSON.stringify(r.links) === JSON.stringify(s.links),
    `Mobilmenue: dieselben ${r.links.length} Eintraege auf beiden Seiten`);
  if (JSON.stringify(r.links) !== JSON.stringify(s.links)) {
    hinweis(`rewards: ${r.links.join(' | ')}`);
    hinweis(`spiele:  ${s.links.join(' | ')}`);
  }
  const konto = r.links.find((l) => /anmelden\.html|meinkonto\.html/.test(l));
  pruefe(Boolean(konto), `Mobilmenue: der Konto-Einstieg ist dabei (${konto || 'fehlt'})`);
}

// Die alte Kopfzeile darf nicht zurueckkommen - weder im Bestand noch
// nachtraeglich per Skript.
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await dicht(page);
  await page.goto(`${ADRESSE}/spiele.html`, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  const m = await page.evaluate(() => ({
    alte: document.querySelectorAll('.tg-public-header').length,
    /*
      Nur die Kopfzeilen der SEITE zaehlen - also die unmittelbar unter
      <body>. Die Spielewelt hat daneben vier eigene Abschnittskoepfe
      (gw-section-head, gw-rush-header, tr-top); die gehoeren zum Inhalt
      und sind hier nicht gemeint.
    */
    sichtbareKoepfe: [...document.querySelectorAll('body > header')].filter((h) => h.getBoundingClientRect().height > 0).length,
    abschnittskoepfe: document.querySelectorAll('main header, section header').length,
    schild: (() => {
      const s = getComputedStyle(document.body, '::after');
      return `${s.display}/${s.zIndex}`;
    })(),
  }));
  pruefe(m.alte === 0, `spiele.html: keine alte Kopfzeile mehr im Dokument (${m.alte} gefunden)`);
  pruefe(m.sichtbareKoepfe === 1, `spiele.html: genau eine sichtbare Seitenkopfzeile (${m.sichtbareKoepfe}); die alte header.topbar ist abgeschaltet`);
  hinweis(`daneben ${m.abschnittskoepfe} Abschnittskoepfe im Inhalt - die gehoeren zur Spielewelt und bleiben`);
  hinweis(`body::after der Spielewelt: ${m.schild} — die Abdeckung lag mit z-index 99 ueber der Kopfzeile und ist abgeschaltet`);
  await page.close();
}

// ═══ 2. Die Vorschauen im Teaser ═══════════════════════════════════════════
const BILDER = [
  ['gluecksrad-vorschau.webp', 200],
  ['taxi-rush-vorschau.webp', 200],
];
for (const [datei, grenze] of BILDER) {
  const pfad = join(AUSGABE, 'assets', 'spielewelt', datei);
  const da = existsSync(pfad);
  pruefe(da, `Vorschaubild ausgeliefert: assets/spielewelt/${datei}`);
  if (da) {
    const kb = Math.round(statSync(pfad).size / 1024);
    pruefe(kb <= grenze, `${datei} bleibt unter ${grenze} KB (${kb} KB)`);
  }
}
// Die PNG-Zwischenstaende gehoeren nicht in die Ausgabe.
for (const datei of ['gluecksrad-vorschau.png', 'taxi-rush-vorschau.png']) {
  pruefe(!existsSync(join(AUSGABE, 'assets', 'spielewelt', datei)),
    `kein PNG-Zwischenstand ausgeliefert: ${datei}`);
}

for (const [name, vp] of [['PC (1440)', { width: 1440, height: 900 }], ['Handy (390)', { width: 390, height: 844 }]]) {
  const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 2 });
  await dicht(page);
  await page.goto(`${ADRESSE}/index.html`, { waitUntil: 'load' });
  await page.waitForTimeout(1300);
  await page.evaluate(() => document.querySelector('#rewards ul').scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(1400);

  const karten = await page.evaluate(() => [...document.querySelectorAll('#rewards [data-station]')].map((a) => {
    const flaeche = a.firstElementChild.getBoundingClientRect();
    const bild = a.querySelector('img');
    const bb = bild && bild.getBoundingClientRect();
    const laufend = [...a.querySelectorAll('*')].filter((e) => {
      const c = getComputedStyle(e);
      return c.animationName !== 'none' && c.animationIterationCount === 'infinite';
    }).length;
    return {
      id: a.dataset.station,
      ziel: a.getAttribute('href'),
      klickziel: { b: Math.round(a.getBoundingClientRect().width), h: Math.round(a.getBoundingClientRect().height) },
      flaeche: { b: Math.round(flaeche.width), h: Math.round(flaeche.height) },
      bild: bild ? { quelle: bild.getAttribute('src'), b: Math.round(bb.width), h: Math.round(bb.height), alt: (bild.getAttribute('alt') || '').length } : null,
      laufend,
      bewegt: a.querySelectorAll('video, canvas, iframe').length,
      text: a.textContent.replace(/\s+/g, ' ').trim(),
    };
  }));

  pruefe(karten.length === 3, `${name}: drei Karten im Rewards-Teaser (${karten.length})`);

  const rad = karten.find((k) => k.id === 'gluecksrad');
  const box = karten.find((k) => k.id === 'box');
  const rush = karten.find((k) => k.id === 'rush');

  // Rad
  pruefe(Boolean(rad && rad.bild && rad.bild.quelle.endsWith('gluecksrad-vorschau.webp')),
    `${name}: das Rad zeigt die Aufnahme aus der Spielewelt`);
  if (rad && rad.bild) {
    pruefe(rad.bild.b <= rad.flaeche.b + 1 && rad.bild.h <= rad.flaeche.h + 1,
      `${name}: das Rad passt in seine Flaeche, nichts ist angeschnitten (Bild ${rad.bild.b}×${rad.bild.h} in ${rad.flaeche.b}×${rad.flaeche.h})`);
    pruefe(rad.bild.alt > 30, `${name}: das Rad hat einen beschreibenden Alternativtext (${rad.bild.alt} Zeichen)`);
  }
  pruefe(Boolean(rad) && /Noch gesperrt/.test(rad.text) && /gesperrt/.test(rad.text) && !/spielen|drehen|mitmachen|gewinnen/i.test(rad.text),
    `${name}: die Radkarte verspricht keine Teilnahme (Text: "${rad ? rad.text.slice(0, 70) : ''}…")`);
  pruefe(Boolean(rad) && rad.ziel === 'spiele.html#wheelTitle', `${name}: die Radkarte fuehrt in die Spielewelt (${rad ? rad.ziel : '?'})`);

  // Box
  pruefe(Boolean(box) && /Noch gesperrt/.test(box.text) && /erscheint nur nach einem bestätigten Gewinn/.test(box.text),
    `${name}: Yumaks Box ist ausdruecklich als gesperrt und bedingt ausgewiesen`);
  pruefe(Boolean(box) && !/neu|jetzt verfügbar|ab sofort|fertig/i.test(box.text),
    `${name}: Yumaks Box tritt nicht als fertige oder neue Funktion auf`);

  // Taxi Rush
  pruefe(Boolean(rush && rush.bild && rush.bild.quelle.endsWith('taxi-rush-vorschau.webp')),
    `${name}: Taxi Rush zeigt eine Aufnahme aus dem Spiel`);
  if (rush && rush.bild) {
    pruefe(rush.bild.b <= rush.flaeche.b + 1 && rush.bild.h <= rush.flaeche.h + 1,
      `${name}: die Spielszene passt in ihre Flaeche (Bild ${rush.bild.b}×${rush.bild.h} in ${rush.flaeche.b}×${rush.flaeche.h})`);
  }
  pruefe(Boolean(rush) && rush.ziel === 'spiele.html#taxiRushTitle' && /Jetzt spielen/.test(rush.text),
    `${name}: Taxi Rush ist als spielbar ausgewiesen und zeigt auf das Spiel (${rush ? rush.ziel : '?'})`);

  // Nichts laeuft dauerhaft, nichts ist ein Spiel oder Video in der Karte.
  const laufend = karten.reduce((s, k) => s + k.laufend, 0);
  const bewegt = karten.reduce((s, k) => s + k.bewegt, 0);
  pruefe(laufend === 0, `${name}: in keiner Karte laeuft eine Dauer-Animation (${laufend})`);
  pruefe(bewegt === 0, `${name}: kein Video, kein Spielfeld, kein eingebetteter Rahmen in den Karten (${bewegt})`);

  // Klickziele - auf dem Handy muss die Kachel gross genug bleiben.
  const zuKlein = karten.filter((k) => k.klickziel.b < 44 || k.klickziel.h < 44);
  pruefe(zuKlein.length === 0, `${name}: alle Klickziele sind mindestens 44×44 (kleinstes ${Math.min(...karten.map((k) => k.klickziel.h))} hoch)`);

  // Motivgroesse: auf dem Handy muss das Motiv erkennbar bleiben.
  const kleinsteFlaeche = Math.min(...karten.map((k) => k.flaeche.h));
  pruefe(kleinsteFlaeche >= 180, `${name}: die Motivflaeche bleibt mindestens 180 Pixel hoch (${kleinsteFlaeche})`);

  await page.close();
}

// Der Teaser darf die Startseite nicht schwerer machen als noetig.
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await dicht(page);
  const groessen = new Map();
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  cdp.on('Network.loadingFinished', (e) => groessen.set(e.requestId, e.encodedDataLength));
  const spuren = new Map();
  cdp.on('Network.responseReceived', (e) => spuren.set(e.requestId, e.response.url));
  await page.goto(`${ADRESSE}/index.html`, { waitUntil: 'load' });
  await page.evaluate(() => document.querySelector('#rewards ul').scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(2000);
  let summe = 0;
  for (const [id, url] of spuren) {
    if (/spielewelt\//.test(url)) summe += groessen.get(id) || 0;
  }
  pruefe(summe > 0 && summe < 250 * 1024,
    `Beide Vorschaubilder zusammen unter 250 KB uebertragen (${Math.round(summe / 1024)} KB, gemessen im Browser)`);
  await page.close();
}

await browser.close();
await browserOhneLeiste.close();
server.close();

console.log('\n═══════════════════════════════════════════════════════════');
console.log(`Kopfzeile und Teaser: ${ok.length} bestanden, ${fehl.length} nicht bestanden`);
if (fehl.length) {
  console.log('\nNicht bestanden:');
  for (const f of fehl) console.log('  - ' + f);
}
console.log('\nDer Netzverkehr nach aussen ist abgeschnitten. Keine Sitzung,');
console.log('keine Abfrage an Supabase, kein Dreh am Rad.');
console.log('═══════════════════════════════════════════════════════════');
process.exit(fehl.length ? 1 : 0);
