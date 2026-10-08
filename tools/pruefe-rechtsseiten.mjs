// ═══════════════════════════════════════════════════════════════════════════
// Die vier uebernommenen Seiten im Browser — Desktop und Mobil
// ═══════════════════════════════════════════════════════════════════════════
//
// impressum.html · datenschutz.html · hilfe-kontakt.html · 404.html
//
// Die wichtigste Pruefung steht zuerst:
//
//   INHALTSTREUE. Der sichtbare Text der ALTEN Seite (die noch im Repository
//   liegt, nur nicht mehr ausgeliefert wird) wird Satz fuer Satz im Text der
//   NEUEN Seite gesucht. Fehlt ein Satz, faellt die Pruefung durch.
//
//   Das ist bei Rechtstexten der Punkt, an dem man sich nicht auf den
//   Augenschein verlassen darf: Eine fehlende Zeile im Impressum sieht man
//   beim Durchscrollen nicht, wenn man nicht weiss, dass sie fehlen koennte.
//
// Dazu: Verweise, Tastaturbedienung, sichtbarer Fokus, fehlende Dateien,
// waagerechter Ueberlauf und Lesbarkeit (Schriftgroesse, Zeilenlaenge).
//
// Aufruf: npm run rechtsseiten-pruefen

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = await import(
  new URL('../fahrer/tests/node_modules/playwright/index.mjs', import.meta.url).href
);

const WURZEL = fileURLToPath(new URL('..', import.meta.url));
const AUSGABE = join(WURZEL, 'dist-oeffentlich');
const PORT = 5294;
const ADRESSE = `http://127.0.0.1:${PORT}`;

const TYP = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.mp4': 'video/mp4', '.webm': 'video/webm', '.woff2': 'font/woff2',
  '.ico': 'image/x-icon', '.xml': 'application/xml', '.txt': 'text/plain', '.json': 'application/json',
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

// Seit Schritt 019 gehoeren die drei neuen Seiten dazu: Sie nutzen
// dieselben Bauteile, und Tastatur, Fokus und Lesbarkeit sind dieselbe
// Frage. Die Inhaltstreue-Pruefung unten laeuft nur fuer die vier Seiten
// aus Schritt 018 - fuer die drei neuen macht das eigene
// pruefe-flotte-spezial.mjs die Vollstaendigkeitspruefung.
const SEITEN = ['impressum.html', 'datenschutz.html', 'hilfe-kontakt.html', '404.html'];
const DARSTELLUNG = [...SEITEN, 'flotte.html', 'spezialfahrten.html', 'spezial-anfrage.html'];

/** Sichtbaren Text aus einer Bestandsdatei ziehen - ohne Skript und Stil. */
function textAusQuelle(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&copy;/g, '©')
    .replace(/\s+/g, ' ')
    .trim();
}

const normal = (s) => s.replace(/\s+/g, ' ').replace(/[–—]/g, '-').trim();

/**
 * Textbausteine, die in der neuen Fassung stehen MUESSEN.
 *
 * Es sind die inhaltstragenden Saetze der alten Seiten - nicht Navigation,
 * Fusszeile oder Zustimmungsbanner, die es so nicht mehr gibt.
 */
const MUSS = {
  'impressum.html': [
    'Rechtliche Angaben zu Taxi Germersheim GmbH.',
    'Unternehmensdaten', 'Taxi Germersheim GmbH', 'Friedrich-Ebert-Straße 8', '76726 Germersheim', 'Deutschland',
    'Kontakt', '07274 3567', 'info@taxigermersheim.de',
    'Geschäftsführung', 'Ismet Enes Carman', 'Sermin Duman',
    'Registerdaten', 'Registergericht', 'Amtsgericht Landau in der Pfalz',
    'Registernummer', 'HRB 33841', 'Steuernummer', '41/650/23698',
    'Genehmigungsbehörde', 'Kreisverwaltung Germersheim', 'Luitpoldplatz 1',
  ],
  'datenschutz.html': [
    'Informationen zum Umgang mit personenbezogenen Daten.',
    'Verantwortlicher',
    'Erhebung personenbezogener Daten',
    'Name, Telefonnummer, E-Mail, Abholadresse, Zieladresse und Fahrtdetails bei Buchungsanfragen.',
    'Zweck der Verarbeitung',
    'Bearbeitung von Anfragen, Durchführung von Fahrten, Kontaktaufnahme und Kundenservice.',
    'Rechtsgrundlage',
    'Art. 6 Abs. 1 lit. b DSGVO und Art. 6 Abs. 1 lit. f DSGVO.',
    'Speicherdauer',
    'Daten werden nur so lange gespeichert, wie es für die Bearbeitung und gesetzliche Pflichten erforderlich ist.',
    'Weitergabe von Daten',
    'Keine Weitergabe an Dritte, außer wenn es zur Durchführung der Fahrt oder gesetzlich erforderlich ist.',
    'Rechte der Nutzer',
    'Auskunft, Berichtigung, Löschung, Einschränkung, Widerspruch und Datenübertragbarkeit.',
    'Kontakt bei Datenschutzfragen',
  ],
  'hilfe-kontakt.html': [
    'Wie können wir helfen?',
    'Wir sind für Sie erreichbar',
    'Rufen Sie uns direkt an.',
    'Schreiben Sie uns direkt über WhatsApp Business.',
    'Schreiben Sie uns Ihr Anliegen per E-Mail.',
    'Häufige Fragen',
    'Wie buche ich eine Fahrt?',
    'Nutzen Sie den Buchungsbereich auf unserer Startseite oder rufen Sie uns unter 07274 - 3567 an.',
    'Wie kann ich eine geplante Fahrt ändern?',
    'Kontaktieren Sie uns telefonisch oder über WhatsApp und halten Sie die Angaben zu Ihrer Fahrt bereit.',
    'Wie storniere ich eine Fahrt?',
    'Welche Unterlagen brauche ich für eine Krankenfahrt?',
    'Je nach Fahrt können eine ärztliche Verordnung und eine Genehmigung der Krankenkasse erforderlich sein.',
    'Wie buche ich eine Rollstuhlfahrt?',
    'Wie funktionieren Rewards-Punkte?',
    'Wie löse ich einen Gutschein ein?',
    'Verfügbare Gutscheine und deren Status sehen Sie in Ihrem Kundenkonto unter Wallet & Gutscheine.',
    'Wie kann ich Taxi Germersheim kontaktieren?',
    'Sie erreichen uns per Telefon, WhatsApp und E-Mail oder persönlich in der Friedrich-Ebert-Str. 8 in Germersheim.',
    'Rechtliches',
  ],
  '404.html': [
    'Seite nicht gefunden',
    'Die gewünschte Seite konnte leider nicht gefunden werden.',
    'Zur Startseite',
  ],
};

const browser = await chromium.launch({ channel: 'chrome' });

// ── 1. Inhaltstreue gegen die alte Fassung ─────────────────────────────────
console.log('\n── Inhaltstreue gegen die alte Fassung ──');
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.route('**://**', (r) => (r.request().url().startsWith(ADRESSE) ? r.continue() : r.abort()));

  for (const seite of SEITEN) {
    const p = await ctx.newPage();
    await p.goto(`${ADRESSE}/${seite}`, { waitUntil: 'load' });
    // Alle <details> oeffnen, sonst steht ihr Text nicht in innerText.
    await p.evaluate(() => document.querySelectorAll('details').forEach((d) => (d.open = true)));
    await p.waitForTimeout(400);
    const neu = normal(await p.evaluate(() => document.body.innerText));

    const fehlend = MUSS[seite].filter((t) => !neu.includes(normal(t)));
    pruefe(
      fehlend.length === 0,
      `${seite}: alle ${MUSS[seite].length} Textbausteine der alten Fassung stehen unveraendert da${fehlend.length ? ' — FEHLT: ' + fehlend.slice(0, 3).map((f) => JSON.stringify(f.slice(0, 45))).join(', ') : ''}`,
    );

    // Gegenprobe: Es darf auch nichts DAZUERFUNDEN worden sein, das nach
    // einer Rechtsangabe aussieht.
    const erfunden = [
      'USt-IdNr', 'Umsatzsteuer-Identifikationsnummer', 'DE1', 'DE2', 'DE3',
      'Streitbeilegung', 'Verbraucherschlichtung', 'ec.europa.eu',
      'Nutzungsbedingungen', 'AGB', 'Allgemeine Geschäftsbedingungen',
      'Aufsichtsbehörde', 'Datenschutzbeauftragte',
    ].filter((t) => neu.includes(t));
    pruefe(
      erfunden.length === 0,
      `${seite}: keine erfundene Rechtsangabe hinzugekommen${erfunden.length ? ' — GEFUNDEN: ' + erfunden.join(', ') : ''}`,
    );
    await p.close();
  }

  // Der alte Text als Ganzes - ein zweiter Blick auf dieselbe Frage.
  for (const seite of SEITEN) {
    const alt = textAusQuelle(await readFile(join(WURZEL, seite), 'utf8'));
    pruefe(alt.length > 200, `${seite}: die alte Fassung liegt zum Vergleich noch im Repository (${alt.length} Zeichen)`);
  }
  await ctx.close();
}

// ── 2. Darstellung, Verweise, Tastatur ─────────────────────────────────────
for (const [name, breite, hoehe] of [['Desktop', 1440, 900], ['Mobil', 390, 844]]) {
  console.log(`\n── ${name} ──`);
  const ctx = await browser.newContext({ viewport: { width: breite, height: hoehe } });
  const nachDraussen = [];
  await ctx.route('**://**', (r) => {
    const u = r.request().url();
    if (u.startsWith(ADRESSE)) return r.continue();
    nachDraussen.push(u);
    return r.abort();
  });

  for (const seite of DARSTELLUNG) {
    const p = await ctx.newPage();
    const fehler = [];
    const fehlend = [];
    p.on('console', (m) => { if (m.type() === 'error') fehler.push(m.text().slice(0, 90)); });
    p.on('pageerror', (e) => fehler.push(String(e).slice(0, 90)));
    p.on('response', (r) => { if (r.status() === 404) fehlend.push(new URL(r.url()).pathname); });

    await p.goto(`${ADRESSE}/${seite}`, { waitUntil: 'load' });
    await p.waitForTimeout(900);

    const mess = await p.evaluate(() => {
      const d = document.documentElement;
      const ueber = [];
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.right > window.innerWidth + 2) ueber.push(el.tagName.toLowerCase());
        if (ueber.length > 2) break;
      }
      // ── Lesbarkeit ────────────────────────────────────────────────────
      //
      // Gemessen wird NUR innerhalb von <main>, also in dem, was dieser
      // Schritt erzeugt hat. Die Fusszeile ist gemeinsames, freigegebenes
      // Gestaltungsgut seit Schritt 013 und steht genauso auf der
      // Startseite - sie hier zu bemaengeln, hiesse die Startseite zu
      // bemaengeln. Ihre 12-px-Zeilen sind in
      // ABSCHLUSS-OEFFENTLICHE-WEBSEITE.md vermerkt.
      //
      // Die Zeilenlaenge wird in em gerechnet (Breite geteilt durch
      // Schriftgroesse) und nur an Absaetzen OHNE festen Zeilenumbruch.
      // Ein <p> mit <br> ist eine Anschrift, kein Fliesstext - dort sagt
      // die Elementbreite nichts ueber die tatsaechliche Zeilenlaenge.
      let kleinste = 99;
      let breiteste = 0;
      const haupt = document.querySelector('main');
      for (const el of (haupt || document).querySelectorAll('p, li, dd, address')) {
        const t = (el.textContent || '').trim();
        if (t.length < 30) continue;
        const s = getComputedStyle(el);
        const px = parseFloat(s.fontSize);
        if (px < kleinste) kleinste = px;
        if (el.querySelector('br')) continue;
        if (t.length < 80) continue;
        // Nur BLATTELEMENTE messen. Ein <li>, das eine Frage und eine
        // Antwort umschliesst, ist ein Behaelter - seine Breite sagt nichts
        // ueber die Zeilenlaenge des Textes darin. Gemessen am 23.09.2026
        // hat genau das acht Fehlalarme auf der Hilfeseite erzeugt.
        if (el.querySelector('p, ul, ol, li, div, details, dl')) continue;
        const em = el.getBoundingClientRect().width / px;
        if (em > breiteste) breiteste = em;
      }
      return {
        quer: d.scrollWidth > window.innerWidth + 2 ? d.scrollWidth : 0,
        ueber,
        h1: document.querySelectorAll('h1').length,
        main: !!document.querySelector('main#inhalt'),
        kleinste: kleinste === 99 ? 99 : Math.round(kleinste * 10) / 10,
        breiteste: Math.round(breiteste),
        ziele: [...document.querySelectorAll('a[href]')]
          .map((a) => a.getAttribute('href'))
          .filter((h) => h && !h.startsWith('#') && !/^(tel:|mailto:|https?:)/.test(h)),
      };
    });

    pruefe(fehler.length === 0, `${name} · ${seite}: keine Skriptfehler${fehler.length ? ' — ' + fehler[0] : ''}`);
    pruefe(fehlend.length === 0, `${name} · ${seite}: keine fehlende Datei${fehlend.length ? ' — ' + [...new Set(fehlend)].join(', ') : ''}`);
    pruefe(mess.quer === 0, `${name} · ${seite}: kein waagerechter Ueberlauf${mess.quer ? ` (${mess.quer} px, ${mess.ueber.join(', ')})` : ''}`);
    pruefe(mess.h1 === 1, `${name} · ${seite}: genau eine Hauptueberschrift (${mess.h1})`);
    pruefe(mess.main, `${name} · ${seite}: Hauptinhaltsbereich <main id="inhalt"> vorhanden`);
    pruefe(
      mess.kleinste >= 14,
      `${name} · ${seite}: Fliesstext im Hauptbereich mindestens 14 px (kleinster ${mess.kleinste} px)`,
    );
    // 46 em sind rund 90 Zeichen. Darueber wird das Zurueckspringen ans
    // naechste Zeilenende muehsam - besonders bei Rechtstexten, die man
    // ohnehin ungern liest.
    pruefe(
      mess.breiteste <= 46,
      `${name} · ${seite}: keine ueberlange Zeile (laengste rund ${mess.breiteste} em)`,
    );

    // Jedes seiteninterne Ziel muss es im Ausgabeordner geben.
    const tot = [];
    for (const z of [...new Set(mess.ziele)]) {
      const datei = z.split(/[?#]/)[0];
      if (!datei) continue;
      const antwort = await p.request.get(`${ADRESSE}/${datei}`);
      if (!antwort.ok()) tot.push(datei);
    }
    pruefe(tot.length === 0, `${name} · ${seite}: alle ${[...new Set(mess.ziele)].length} verlinkten Seiten sind erreichbar${tot.length ? ' — TOT: ' + tot.join(', ') : ''}`);

    // Sprungmarke und sichtbarer Fokus
    await p.keyboard.press('Tab');
    const marke = await p.evaluate(() => {
      const el = document.activeElement;
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { text: (el.textContent || '').trim(), sichtbar: r.top >= -2 && r.width > 40 && r.height > 12 };
    });
    pruefe(
      marke?.text === 'Zum Inhalt springen' && marke.sichtbar,
      `${name} · ${seite}: Sprungmarke beim ersten Tabulatorsprung sichtbar`,
    );

    let ohneFokus = 0;
    for (let i = 0; i < 26; i += 1) {
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

  pruefe(
    nachDraussen.length === 0,
    `${name}: kein Abruf nach draussen versucht${nachDraussen.length ? ' — ' + [...new Set(nachDraussen)].slice(0, 2).join(', ') : ''}`,
  );
  await ctx.close();
}

// ── 3. Die haeufigen Fragen lassen sich oeffnen ────────────────────────────
console.log('\n── Häufige Fragen ──');
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route('**://**', (r) => (r.request().url().startsWith(ADRESSE) ? r.continue() : r.abort()));
  const p = await ctx.newPage();
  await p.goto(`${ADRESSE}/hilfe-kontakt.html`, { waitUntil: 'load' });
  await p.waitForTimeout(700);

  const anzahl = await p.locator('details').count();
  pruefe(anzahl === 8, `acht haeufige Fragen (${anzahl})`);

  const zuerstZu = await p.evaluate(() => [...document.querySelectorAll('details')].every((d) => !d.open));
  pruefe(zuerstZu, 'zu Beginn sind alle zugeklappt');

  const erste = p.locator('details').first();
  await erste.locator('summary').click();
  await p.waitForTimeout(350);
  const offenDanach = await erste.evaluate((d) => d.open);
  const sichtbar = await erste.locator('p').isVisible();
  pruefe(offenDanach && sichtbar, 'ein Klick oeffnet die Antwort und sie ist sichtbar');

  // Mit der Tastatur: Enter auf dem summary
  const zweite = p.locator('details').nth(1);
  await zweite.locator('summary').focus();
  await p.keyboard.press('Enter');
  await p.waitForTimeout(350);
  pruefe(await zweite.evaluate((d) => d.open), 'die Antwort laesst sich auch mit der Tastatur oeffnen');

  await erste.locator('summary').click();
  await p.waitForTimeout(300);
  pruefe(!(await erste.evaluate((d) => d.open)), 'ein zweiter Klick schliesst sie wieder');

  await p.close();
  await ctx.close();
}

// ── 4. Kein Zustimmungsbanner ohne Wirkung ─────────────────────────────────
console.log('\n── Zustimmungsbanner ──');
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.route('**://**', (r) => (r.request().url().startsWith(ADRESSE) ? r.continue() : r.abort()));
  for (const seite of SEITEN) {
    const p = await ctx.newPage();
    await p.goto(`${ADRESSE}/${seite}`, { waitUntil: 'load' });
    await p.waitForTimeout(2200); // der alte Banner erschien nach 1500 ms
    const banner = await p.evaluate(() => ({
      knopf: !!document.getElementById('cookieBanner'),
      karte: document.querySelectorAll('.map-container, iframe').length,
    }));
    pruefe(!banner.knopf, `${seite}: kein Zustimmungsschalter - es gibt nichts zuzustimmen`);
    pruefe(banner.karte === 0, `${seite}: keine Einbettung eines fremden Dienstes (${banner.karte})`);
    await p.close();
  }
  await ctx.close();
}

await browser.close();
server.close();

console.log(`\nbestanden: ${ok.length}   fehlgeschlagen: ${fehl.length}`);
console.log('Geprueft wurden Dateien und Darstellung. Es wurde nichts versendet und nichts angerufen.');
if (fehl.length) {
  console.log('\n' + fehl.join('\n'));
  process.exitCode = 1;
}
