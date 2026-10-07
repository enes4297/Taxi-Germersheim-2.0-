// ═══════════════════════════════════════════════════════════════════════════
// Das Glücksrad — Darstellung, Abbildung und Stopp
// ═══════════════════════════════════════════════════════════════════════════
//
// ───────────────────────────────────────────────────────────────────────────
// DIE WICHTIGSTE PRUEFUNG STEHT ZUERST
// ───────────────────────────────────────────────────────────────────────────
//
//   1. DIE ABBILDUNG. Fuer jeden der SIEBEN Gewinntypen aus Migration 007
//      wird das Rad gedreht und danach GEMESSEN, welches Feld tatsaechlich
//      unter dem Zeiger steht. Gerechnet wird nicht mit der Zahl, die das
//      Rad selbst zurueckgibt, sondern mit der tatsaechlichen Drehung und
//      der Geometrie der Felder. Sonst pruefte die Rechnung sich selbst.
//
//   2. DER BROWSER BESTIMMT NICHTS. Im Kundenbetrieb darf es keine
//      Zufallsauswahl, keine Auswahlliste und keinen Aufruf von
//      spin_rewards_wheel geben. Geprueft am ausgelieferten Quelltext.
//
//   3. DAS RAD BLEIBT GESPERRT. Die Schaltflaeche ist in jedem Zustand
//      `disabled`. Dieser Schritt aendert daran nichts.
//
// ALLES HIER IST ISOLIERT: keine Anmeldung, keine Datenbank, kein echter
// Dreh, keine Punkte, keine Gutscheine. Die Gewinntypen sind die
// Schluesselwoerter der Migration, keine Kontodaten.
//
// Aufruf: npm run gluecksrad-pruefen

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const { chromium } = await import(
  new URL('../fahrer/tests/node_modules/playwright/index.mjs', import.meta.url).href
);

const WURZEL = fileURLToPath(new URL('..', import.meta.url));
const AUSGABE = join(WURZEL, 'dist-oeffentlich');
const PORT = 5286;
const ADRESSE = `http://127.0.0.1:${PORT}`;

const TYP = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2', '.ico': 'image/x-icon',
};

const ok = [];
const fehl = [];
const pruefe = (bedingung, text) => {
  (bedingung ? ok : fehl).push(text);
  console.log((bedingung ? 'OK   ' : 'FEHL ') + text);
};

// Der Server liefert aus dem AUSGABEORDNER und - fuer die Designprobe -
// aus dem Projekt selbst. Die Probe liegt ausdruecklich NICHT im
// Ausgabeordner; das ist der Punkt.
const server = createServer(async (req, res) => {
  const pfad = decodeURIComponent(req.url.split('?')[0]);
  const kandidaten = pfad.startsWith('/probe/')
    ? [join(WURZEL, pfad.replace('/probe/', 'sichtproben/')), join(WURZEL, pfad.replace('/probe/', ''))]
    : [join(AUSGABE, pfad), join(WURZEL, pfad)];
  for (const datei of kandidaten) {
    try {
      const daten = await readFile(datei);
      res.writeHead(200, { 'Content-Type': TYP[extname(pfad).toLowerCase()] || 'application/octet-stream' });
      return res.end(daten);
    } catch { /* naechster Kandidat */ }
  }
  res.writeHead(404);
  res.end('nicht gefunden');
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

/** Die sieben Gewinntypen, aus der Migration gelesen statt abgeschrieben. */
const migration = await readFile(join(WURZEL, 'supabase', 'migrations', '007_rewards_wheel.sql'), 'utf8');
const PRIZES = [...new Set([...migration.matchAll(/prize_type := '(\w+)'/g)].map((m) => m[1]))];
const WAHRSCHEINLICHKEIT = Object.fromEntries(
  [...migration.matchAll(/'(\w+)', (0\.\d+)/g)].map((m) => [m[1], Number(m[2])]),
);

console.log(`\nGewinntypen laut Migration 007: ${PRIZES.join(', ')}`);
console.log(`Wahrscheinlichkeiten: ${Object.entries(WAHRSCHEINLICHKEIT).map(([k, v]) => `${k} ${(v * 100).toFixed(0)}%`).join(' · ')}`);

const browser = await chromium.launch({ channel: 'chrome' });

// ── 1. Der Stand der Anbindung — unveraendert ──────────────────────────────
console.log('\n── Stand der Anbindung ──');
{
  const spieleJs = await readFile(join(AUSGABE, 'spiele.js'), 'utf8');
  const radJs = await readFile(join(AUSGABE, 'gluecksrad.js'), 'utf8');
  const spieleHtml = await readFile(join(AUSGABE, 'spiele.html'), 'utf8');

  pruefe(
    // Gesucht wird der AUFRUF, nicht das Wort. Der erste Anlauf schlug an,
    // weil gluecksrad.js im Kopfkommentar festhaelt, dass die Funktion hier
    // gerade NICHT aufgerufen wird - ein Satz ueber das Nichtvorhandensein
    // ist kein Vorhandensein.
    !/rpc\(\s*['"]spin_rewards_wheel/.test(spieleJs) && !/rpc\(\s*['"]spin_rewards_wheel/.test(radJs),
    'spin_rewards_wheel wird im Kundenbereich NICHT aufgerufen',
  );
  pruefe(
    !/Math\.random|crypto\.getRandomValues/.test(radJs),
    'die Radlogik enthaelt keine Zufallsauswahl - der Browser bestimmt nichts',
  );
  pruefe(
    !/<select/i.test(spieleHtml),
    'in der Spielewelt gibt es keine Auswahlliste fuer ein Testergebnis',
  );
  pruefe(
    /wheelAction\.disabled = true/.test(spieleJs),
    'die Schaltflaeche am Rad bleibt gesperrt',
  );
  const zustaende = [...spieleJs.matchAll(/wheelAction\.textContent = '([^']+)'/g)].map((m) => m[1]);
  pruefe(
    zustaende.length > 0 && zustaende.every((t) => /Bald verfügbar|Nicht verfügbar|Kein Dreh verfügbar/.test(t)),
    `in jedem Zustand eine Sperrbeschriftung (${zustaende.join(' · ')})`,
  );
}

// ── 2. Beschriftungen gegen die Regeln ─────────────────────────────────────
console.log('\n── Beschriftungen gegen Migration 007 ──');
{
  const radJs = await readFile(join(AUSGABE, 'gluecksrad.js'), 'utf8');
  const imRad = [...radJs.matchAll(/prize: '(\w+)'/g)].map((m) => m[1]);

  pruefe(imRad.length === 7, `sieben Felder (${imRad.length})`);
  pruefe(
    PRIZES.every((p) => imRad.includes(p)) && imRad.every((p) => PRIZES.includes(p)),
    `jeder Gewinntyp der Migration hat genau ein Feld${imRad.filter((p) => !PRIZES.includes(p)).length ? ' — unbekannt: ' + imRad.filter((p) => !PRIZES.includes(p)).join(', ') : ''}`,
  );
  pruefe(
    JSON.stringify(imRad) === JSON.stringify(PRIZES),
    `die Reihenfolge stimmt mit der Migration ueberein (${imRad.join(', ')})`,
  );
}

// ── 3. Die Abbildung: jedes Ergebnis landet auf seinem Feld ────────────────
for (const [name, breite, hoehe] of [['Desktop', 1440, 900], ['Mobil', 390, 844]]) {
  console.log(`\n── Abbildung und Stopp · ${name} ──`);
  const ctx = await browser.newContext({ viewport: { width: breite, height: hoehe } });
  const draussen = [];
  await ctx.route('**://**', (r) => {
    const u = r.request().url();
    if (u.startsWith(ADRESSE)) return r.continue();
    draussen.push(u);
    return r.abort();
  });

  const p = await ctx.newPage();
  const fehler = [];
  p.on('pageerror', (e) => fehler.push(String(e).slice(0, 100)));
  p.on('console', (m) => { if (m.type() === 'error') fehler.push(m.text().slice(0, 100)); });

  await p.goto(`${ADRESSE}/probe/gluecksrad.html`, { waitUntil: 'load' });
  await p.waitForTimeout(700);

  pruefe(fehler.length === 0, `${name}: keine Skriptfehler${fehler.length ? ' — ' + fehler[0] : ''}`);

  const aufbau = await p.evaluate(() => {
    const svg = document.querySelector('[data-gw-wheel-svg]');
    return {
      felder: svg ? svg.querySelectorAll('.gw-wheel-segment').length : 0,
      beschriftungen: svg ? svg.querySelectorAll('.gw-wheel-label').length : 0,
      ring: !!document.querySelector('.gw-wheel-rim'),
      zeiger: !!document.querySelector('.gw-wheel-pointer'),
      nabenbild: document.querySelector('.gw-wheel-hub img')?.getAttribute('src') || null,
      warnung: (document.querySelector('.probe-warnung')?.textContent || '').includes('Demo – keine echten Gewinne'),
    };
  });

  pruefe(aufbau.felder === 7, `${name}: sieben Felder gezeichnet (${aufbau.felder})`);
  pruefe(aufbau.beschriftungen === 7, `${name}: sieben Beschriftungen (${aufbau.beschriftungen})`);
  pruefe(aufbau.ring, `${name}: der Goldring ist da`);
  pruefe(aufbau.zeiger, `${name}: der Zeiger ist da`);
  pruefe(!!aufbau.nabenbild, `${name}: die Nabe traegt das Bildzeichen (${aufbau.nabenbild})`);
  pruefe(aufbau.warnung, `${name}: die Designprobe sagt „Demo – keine echten Gewinne"`);

  // Das Bildzeichen muss wirklich laden und darf keine Schrift enthalten.
  const zeichen = await p.evaluate(async () => {
    const img = document.querySelector('.gw-wheel-hub img');
    if (!img) return null;
    const antwort = await fetch(img.src);
    const text = await antwort.text();
    return {
      geladen: img.complete && img.naturalWidth > 0,
      hatSchrift: /<text|TAXI|GERMERSHEIM/i.test(text),
      groesse: text.length,
    };
  });
  pruefe(zeichen?.geladen === true, `${name}: das Bildzeichen laedt`);
  pruefe(zeichen?.hatSchrift === false, `${name}: das Bildzeichen enthaelt KEINE Schrift (Logo ohne Schriftzug)`);

  // ── Der eigentliche Punkt: Stoppt das Rad auf dem richtigen Feld? ──
  //
  // Gemessen wird die TATSAECHLICHE Drehung des SVG und daraus gerechnet,
  // welches Feld unter dem Zeiger (0 Grad, oben) liegt.
  for (const prize of PRIZES) {
    const ergebnis = await p.evaluate(async (wunsch) => {
      const rad = window.TaxiGluecksrad;
      const svg = document.querySelector('[data-gw-wheel-svg]');
      const feld = await rad.stoppeAuf(wunsch);
      if (!feld) return { feld: null };

      const treffer = (svg.style.transform || '').match(/rotate\(([-\d.]+)deg\)/);
      const drehung = treffer ? Number(treffer[1]) : null;
      const step = 360 / rad.segmente.length;

      // Welches Feld steht bei dieser Drehung oben? Das Rad ist um
      // `drehung` gedreht; Feld i sass urspruenglich mittig bei i*step.
      // Oben (0 Grad) steht also das Feld, fuer das
      // (i*step + drehung) mod 360 rund 0 ist.
      let gemessen = null;
      let abweichung = 999;
      rad.segmente.forEach((s, i) => {
        let winkel = ((i * step + drehung) % 360 + 360) % 360;
        if (winkel > 180) winkel -= 360;
        if (Math.abs(winkel) < Math.abs(abweichung)) { abweichung = winkel; gemessen = s.prize; }
      });

      return {
        feld: feld.prize,
        titel: feld.title,
        drehung: Math.round(drehung),
        gemessen,
        abweichung: Number(abweichung.toFixed(3)),
        umdrehungen: Math.floor(drehung / 360),
      };
    }, prize);

    pruefe(
      ergebnis.feld === prize && ergebnis.gemessen === prize && Math.abs(ergebnis.abweichung) < 0.01,
      `${name}: „${prize}" → Rad steht auf „${ergebnis.gemessen}", Abweichung ${ergebnis.abweichung}° (Drehung ${ergebnis.drehung}°)`,
    );
  }

  // Der abgelegte Winkel muss KLEIN bleiben.
  //
  // Nicht Kosmetik: Der Browser legt `style.transform` mit sechs geltenden
  // Ziffern ab. Bei 10902,857 wird daraus 10902,9 - schon 0,043 Grad
  // daneben, und das waechst mit jeder Drehung. Bleibt der Winkel unter
  // 360, liegt die Rundung bei Bruchteilen von Tausendstelgrad, egal wie
  // oft gedreht wurde. Genau so ist es gebaut, und hier wird es nachgesehen.
  const winkelstand = await p.evaluate(() => {
    const svg = document.querySelector('[data-gw-wheel-svg]');
    const t = (svg.style.transform || '').match(/rotate\(([-\d.]+)deg\)/);
    return t ? Number(t[1]) : null;
  });
  pruefe(
    winkelstand !== null && winkelstand >= 0 && winkelstand < 360,
    `${name}: der abgelegte Winkel bleibt unter 360° (${winkelstand}°) - die Rundung des Browsers waechst nicht mit`,
  );

  // Unbekanntes Ergebnis: das Rad darf sich NICHT drehen.
  const unbekannt = await p.evaluate(async () => {
    const rad = window.TaxiGluecksrad;
    const svg = document.querySelector('[data-gw-wheel-svg]');
    const vorher = svg.style.transform;
    const feld = await rad.stoppeAuf('gibt_es_nicht');
    return { feld, unveraendert: svg.style.transform === vorher };
  });
  pruefe(
    unbekannt.feld === null && unbekannt.unveraendert,
    `${name}: bei unbekanntem Ergebnis dreht sich nichts - kein Gewinn wird behauptet`,
  );

  pruefe(draussen.length === 0, `${name}: kein Abruf nach draussen`);
  await p.close();
  await ctx.close();
}

// ── 4. Wiederholte Klicks ──────────────────────────────────────────────────
console.log('\n── Wiederholte Klicks ──');
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.route('**://**', (r) => (r.request().url().startsWith(ADRESSE) ? r.continue() : r.abort()));
  const p = await ctx.newPage();
  await p.goto(`${ADRESSE}/probe/gluecksrad.html`, { waitUntil: 'load' });
  await p.waitForTimeout(600);

  const stand = await p.evaluate(async () => {
    const rad = window.TaxiGluecksrad;
    // Fuenf Aufrufe auf einmal - nur der erste darf zaehlen.
    const alle = await Promise.all([
      rad.stoppeAuf('points_5'),
      rad.stoppeAuf('points_50'),
      rad.stoppeAuf('yumaks_box'),
      rad.stoppeAuf('voucher_20'),
      rad.stoppeAuf('points_10'),
    ]);
    return {
      angenommen: alle.filter(Boolean).map((f) => f.prize),
      abgewiesen: alle.filter((f) => f === null).length,
    };
  });
  pruefe(
    stand.angenommen.length === 1 && stand.angenommen[0] === 'points_5' && stand.abgewiesen === 4,
    `von fuenf gleichzeitigen Anfragen wird genau eine angenommen (${stand.angenommen.join(', ') || 'keine'}), ${stand.abgewiesen} abgewiesen`,
  );

  // Mehrfach auf die Schaltflaeche klicken
  await p.click('#probe-start');
  await p.click('#probe-start').catch(() => {});
  await p.click('#probe-start').catch(() => {});
  await p.waitForTimeout(6000);
  const nachher = await p.evaluate(() => ({
    knopf: document.getElementById('probe-start').disabled,
    text: document.getElementById('probe-stand').textContent.trim(),
  }));
  pruefe(!nachher.knopf, 'nach dem Dreh ist die Schaltflaeche wieder bedienbar');
  pruefe(/Testergebnis:/.test(nachher.text) && /Demo/.test(nachher.text), `der Stand nennt das Ergebnis und die Demo (${nachher.text.slice(0, 70)}…)`);

  await p.close();
  await ctx.close();
}

// ── 5. Reduzierte Bewegung ─────────────────────────────────────────────────
console.log('\n── Reduzierte Bewegung ──');
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  await ctx.route('**://**', (r) => (r.request().url().startsWith(ADRESSE) ? r.continue() : r.abort()));
  const p = await ctx.newPage();
  await p.goto(`${ADRESSE}/probe/gluecksrad.html`, { waitUntil: 'load' });
  await p.waitForTimeout(600);

  const stand = await p.evaluate(async () => {
    const start = performance.now();
    const feld = await window.TaxiGluecksrad.stoppeAuf('points_30');
    const dauer = performance.now() - start;
    const svg = document.querySelector('[data-gw-wheel-svg]');
    const treffer = (svg.style.transform || '').match(/rotate\(([-\d.]+)deg\)/);
    return { feld: feld?.prize, dauer: Math.round(dauer), drehung: treffer ? Math.round(Number(treffer[1])) : null };
  });

  pruefe(stand.dauer < 400, `bei reduzierter Bewegung steht das Ergebnis sofort (${stand.dauer} ms statt 4800 ms)`);
  pruefe(stand.feld === 'points_30', `und es ist das richtige Feld (${stand.feld})`);
  pruefe(stand.drehung !== null, `das Rad steht trotzdem auf dem Feld, nicht auf null (${stand.drehung}°)`);

  await p.close();
  await ctx.close();
}

// ── 6. Die integrierte Spielewelt ──────────────────────────────────────────
for (const [name, breite, hoehe] of [['Desktop', 1440, 900], ['Mobil', 390, 844]]) {
  console.log(`\n── Spielewelt · ${name} ──`);
  const ctx = await browser.newContext({ viewport: { width: breite, height: hoehe } });
  await ctx.route('**://**', (r) => (r.request().url().startsWith(ADRESSE) ? r.continue() : r.abort()));
  const p = await ctx.newPage();
  const fehler = [];
  const fehlend = [];
  p.on('pageerror', (e) => fehler.push(String(e).slice(0, 100)));
  p.on('response', (r) => { if (r.status() === 404) fehlend.push(new URL(r.url()).pathname); });

  await p.goto(`${ADRESSE}/spiele.html`, { waitUntil: 'load' });
  await p.waitForTimeout(1400);

  pruefe(fehler.length === 0, `${name}: keine Skriptfehler${fehler.length ? ' — ' + fehler[0] : ''}`);
  pruefe(fehlend.length === 0, `${name}: keine fehlende Datei${fehlend.length ? ' — ' + [...new Set(fehlend)].join(', ') : ''}`);

  const szene = await p.evaluate(() => {
    const shell = document.querySelector('.gw-wheel-shell');
    const rad = shell?.getBoundingClientRect();
    const zeiger = document.querySelector('.gw-wheel-pointer')?.getBoundingClientRect();
    const knopf = document.querySelector('[data-gw-wheel-action]');
    const beschriftung = document.querySelector('.gw-wheel-label');
    return {
      felder: document.querySelectorAll('.gw-wheel-segment').length,
      radBreite: rad ? Math.round(rad.width) : 0,
      // Der Zeiger muss waagerecht mittig ueber dem Rad stehen.
      zeigerVersatz: rad && zeiger
        ? Math.round((zeiger.left + zeiger.width / 2) - (rad.left + rad.width / 2))
        : null,
      zeigerUeberRand: rad && zeiger ? Math.round(rad.top - zeiger.top) : null,
      knopfGesperrt: knopf ? knopf.disabled : null,
      schriftgroesse: beschriftung ? Math.round(beschriftung.getBoundingClientRect().height) : 0,
      hinweis: (document.querySelector('.gw-wheel-oddsnote')?.textContent || '').trim(),
      quer: document.documentElement.scrollWidth > window.innerWidth + 2,
    };
  });

  pruefe(szene.felder === 7, `${name}: sieben Felder in der Spielewelt (${szene.felder})`);
  pruefe(szene.radBreite > (breite < 500 ? 250 : 400), `${name}: das Rad ist gross genug (${szene.radBreite} px)`);
  pruefe(Math.abs(szene.zeigerVersatz) <= 1, `${name}: der Zeiger steht mittig (${szene.zeigerVersatz} px Versatz)`);
  pruefe(szene.zeigerUeberRand > 0, `${name}: der Zeiger steht ueber dem Radrand (${szene.zeigerUeberRand} px)`);
  pruefe(szene.knopfGesperrt === true, `${name}: die Schaltflaeche am Rad ist gesperrt`);
  pruefe(szene.schriftgroesse >= 11, `${name}: die Beschriftung ist lesbar gross (${szene.schriftgroesse} px hoch)`);
  pruefe(!szene.quer, `${name}: kein waagerechter Ueberlauf`);
  pruefe(
    /gleich groß/.test(szene.hinweis) && /Gewinnchance/.test(szene.hinweis),
    `${name}: der Hinweis sagt, dass die Feldgroesse nichts ueber die Chance sagt`,
  );

  await p.close();
  await ctx.close();
}

// ── 7. Die Vorlage und die Probe bleiben draussen ──────────────────────────
console.log('\n── Nicht ausgeliefert ──');
pruefe(!existsSync(join(AUSGABE, 'design-vorlagen')), 'der Ordner design-vorlagen liegt NICHT im Ausgabeordner');
pruefe(
  !existsSync(join(AUSGABE, 'Taxi-Germersheim-Gluecksrad.html')),
  'die Designvorlage ist keine zusaetzliche oeffentliche Seite',
);
pruefe(!existsSync(join(AUSGABE, 'sichtproben')), 'der Ordner sichtproben liegt NICHT im Ausgabeordner');
pruefe(!existsSync(join(AUSGABE, 'gluecksrad.html')), 'die Designprobe ist nicht ausgeliefert');
pruefe(existsSync(join(AUSGABE, 'gluecksrad.js')), 'die Radlogik selbst ist ausgeliefert - sie gehoert zur Spielewelt');

await browser.close();
server.close();

console.log(`\nbestanden: ${ok.length}   fehlgeschlagen: ${fehl.length}`);
console.log('\nAlles mit isolierten Testwerten: die sieben Gewinntypen der Migration.');
console.log('Kein echter Dreh, keine Anmeldung, keine Punkte, keine Gutscheine.');
console.log('Das Rad bleibt fuer Kunden gesperrt - daran aendert dieser Schritt nichts.');
if (fehl.length) {
  console.log('\n' + fehl.join('\n'));
  process.exitCode = 1;
}
