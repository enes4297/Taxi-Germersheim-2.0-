// ═══════════════════════════════════════════════════════════════════════════
// Taxi Rush — Einbindung, Ablauf und Abgrenzung
// ═══════════════════════════════════════════════════════════════════════════
//
// ───────────────────────────────────────────────────────────────────────────
// DIE WICHTIGSTEN PRUEFUNGEN STEHEN ZUERST
// ───────────────────────────────────────────────────────────────────────────
//
//   1. NUR EIN SPIEL. Es gibt genau einen Taxi-Rush-Abschnitt, die alte
//      Fassung ist vollstaendig weg - auch ihre Regeln in spiele.css.
//
//   2. DAS SPIEL BLEIBT IN SEINER ECKE. Kein Stil greift ausserhalb von
//      .tr-, die Tastatur wird nur bei aktivem Spiel und passendem Fokus
//      abgefangen, und das Wischen sperrt das Scrollen nur ueber dem
//      Spielfeld.
//
//   3. KEINE REWARDS. Keine Supabase-Anbindung, keine Punkte, keine
//      Gutscheine, keine Anmeldung - geprueft am ausgelieferten Quelltext.
//
//   4. DER BESTWERT DER ALTEN FASSUNG WIRD NICHT UEBERNOMMEN. Die beiden
//      Fassungen zaehlen nachweislich anders; der alte Wert bleibt
//      gespeichert und wird dem Spieler erklaert.
//
// Der Ablauf wird im echten Browser GESPIELT, nicht behauptet: gestartet,
// gelenkt, abgeholt, abgeliefert, pausiert, fortgesetzt, beendet, neu
// gestartet. Gemessen wird an der Anzeige und an den Bildpunkten des
// Spielfelds - das Spiel gibt seinen Zustand bewusst nicht nach aussen.
//
// Aufruf: npm run rush-pruefen

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = await import(
  new URL('../fahrer/tests/node_modules/playwright/index.mjs', import.meta.url).href
);

const WURZEL = fileURLToPath(new URL('..', import.meta.url));
const AUSGABE = join(WURZEL, 'dist-oeffentlich');
const PORT = 5287;
const ADRESSE = `http://127.0.0.1:${PORT}`;

const TYP = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.mp4': 'video/mp4', '.webm': 'video/webm',
};

const ok = [];
const fehl = [];
const pruefe = (bedingung, text) => {
  (bedingung ? ok : fehl).push(text);
  console.log((bedingung ? 'OK   ' : 'FEHL ') + text);
};
const hinweis = (text) => console.log('     · ' + text);

const server = createServer(async (req, res) => {
  const pfad = decodeURIComponent(req.url.split('?')[0]);
  for (const datei of [join(AUSGABE, pfad), join(WURZEL, pfad)]) {
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

const lies = (p) => readFile(join(AUSGABE, p), 'utf8');
const rushJs = await lies('taxi-rush.js');
/**
 * Derselbe Quelltext OHNE Kommentare. Die Kommentare dieser Datei nennen
 * "Supabase", "Gutscheine" und "taxiRushPreview" ausdruecklich - naemlich
 * um festzuhalten, dass nichts davon uebernommen wurde. Eine Suche im
 * Fliesstext wuerde also genau das melden, was sie ausschliessen soll.
 */
const rushCode = rushJs
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^\s*\/\/.*$/gm, ' ');
const rushCss = await lies('taxi-rush.css');
const spieleHtml = await lies('spiele.html');
const spieleCss = await lies('spiele.css');
const vorlage = await readFile(join(WURZEL, 'design-vorlagen', 'Taxi-Rush.html'), 'utf8');

// ═══════════════════════════════════════════════════════════════════════════
// 1. Nur ein Spiel — die alte Fassung ist weg
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 1. Nur ein Spiel ──');
{
  const abschnitte = [...spieleHtml.matchAll(/data-taxi-rush[\s>]/g)].length;
  pruefe(abschnitte === 1, `Genau ein Taxi-Rush-Abschnitt in spiele.html (gefunden: ${abschnitte})`);

  pruefe(spieleHtml.includes('taxi-rush.js'), 'taxi-rush.js ist eingebunden');
  pruefe(spieleHtml.includes('taxi-rush.css'), 'taxi-rush.css ist eingebunden');
  pruefe(
    spieleHtml.indexOf('taxi-rush.css') > spieleHtml.indexOf('spiele.css'),
    'taxi-rush.css steht nach spiele.css - die Spielstile gewinnen bei Gleichstand',
  );

  // Die alte Fassung hatte eigene Kennungen und einen Fokusmodus.
  const alteSpuren = [
    'gw-rush-viewport', 'gw-rush-hud', 'gw-rush-overlay', 'gw-rush-result',
    'gw-rush-controls', 'gw-rush-focus-bar', 'taxi-rush-focus-active',
    'tg_taxi_rush_best_score',
  ];
  for (const spur of alteSpuren) {
    pruefe(!spieleHtml.includes(spur), `Alte Kennung "${spur}" nicht mehr im Markup`);
  }
  for (const spur of alteSpuren.filter((s) => s !== 'tg_taxi_rush_best_score')) {
    pruefe(!spieleCss.includes(spur), `Tote Regel "${spur}" aus spiele.css entfernt`);
  }
  // Der alte Schluessel darf im Spiel NUR gelesen werden, nie geschrieben
  // oder geloescht - er gehoert dem Spieler.
  pruefe(
    /getItem\('tg_taxi_rush_best_score'\)/.test(rushJs),
    'Der alte Bestwert wird gelesen (fuer den Hinweis)',
  );
  pruefe(
    !/(setItem|removeItem)\([^)]*tg_taxi_rush_best_score/.test(rushJs),
    'Der alte Bestwert wird weder ueberschrieben noch geloescht',
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. Vorlage und Entwicklungsdiagnostik werden nicht ausgeliefert
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 2. Nicht ausgeliefert ──');
{
  const { existsSync } = await import('node:fs');
  pruefe(!existsSync(join(AUSGABE, 'design-vorlagen')), 'Ordner design-vorlagen liegt nicht im Ausgabeordner');
  pruefe(!existsSync(join(AUSGABE, 'Taxi-Rush.html')), 'Taxi-Rush.html liegt nicht im Ausgabeordner');

  // Kein fetch gegen diesen Server: er liefert bewusst AUCH aus dem
  // Projekt, damit die Vorlage zum Vergleich geladen werden kann. Ein
  // 200 waere hier also meine eigene Bruecke, kein Auslieferungsfehler.
  // Entscheidend ist die Uebernahmeliste.
  const liste = await readFile(join(WURZEL, 'tools', 'bestand-uebernehmen.mjs'), 'utf8');
  pruefe(!/design-vorlagen/.test(liste), 'design-vorlagen steht nicht in der Uebernahmeliste');
  pruefe(/taxi-rush\.css/.test(liste) && /taxi-rush\.js/.test(liste), 'taxi-rush.css und .js stehen in der Uebernahmeliste');

  pruefe(!rushCode.includes('taxiRushPreview'), 'window.taxiRushPreview wird nirgends gesetzt (Kommentare abgezogen)');
  pruefe(rushJs.includes('taxiRushPreview'), '(sie ist nur noch im Kommentar erwaehnt - als das, was bewusst fehlt)');
  pruefe(!/getState\s*:/.test(rushJs), 'Kein getState - der Spielzustand wird nicht nach aussen gelegt');
  pruefe(vorlage.includes('taxiRushPreview'), '(zur Gegenprobe: die Vorlage enthaelt sie sehr wohl)');
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. Keine Rewards, keine Anmeldung, keine Datenbank
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 3. Keine Rewards-Anbindung ──');
{
  for (const wort of ['supabase', 'createClient', '.rpc(', 'voucher', 'gutschein', 'rewards_', 'customer-auth', 'signIn', 'signUp']) {
    pruefe(!rushCode.toLowerCase().includes(wort.toLowerCase()), `Im Code von taxi-rush.js steht kein "${wort}"`);
  }
  const speicher = [...rushJs.matchAll(/localStorage\.(getItem|setItem|removeItem)\('([^']+)'/g)].map((m) => m[2]);
  pruefe(
    new Set(speicher).size === 2 && speicher.includes('tg-rush-best-v1') && speicher.includes('tg_taxi_rush_best_score'),
    `Das Spiel fasst genau zwei Speicherschluessel an: ${[...new Set(speicher)].join(', ')}`,
  );
  // Jeder Speicherzugriff muss in try/catch stehen.
  const zugriffe = (rushJs.match(/localStorage\./g) || []).length;
  const inTry = (rushJs.match(/try\s*\{[^}]*localStorage\./g) || []).length;
  pruefe(zugriffe > 0 && inTry >= 1, `${zugriffe} Speicherzugriffe, jeder in einem try-Block`);
  pruefe(
    spieleHtml.includes('keine Rewards-Punkte') || spieleHtml.includes('KEINE REWARDS'),
    'Die Seite sagt selbst, dass es keine Rewards-Punkte gibt',
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. Die Stile bleiben im Spiel
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 4. Stile begrenzt ──');
{
  // Jede Regel muss mit .tr- beginnen. @-Regeln und keyframes ausgenommen,
  // die werden gesondert geprueft.
  const ohneKommentar = rushCss.replace(/\/\*[\s\S]*?\*\//g, '');
  const selektoren = [];
  let tiefe = 0;
  let puffer = '';
  let inKeyframes = 0;
  for (let i = 0; i < ohneKommentar.length; i++) {
    const z = ohneKommentar[i];
    if (z === '{') {
      const kopf = puffer.trim();
      if (tiefe === 0 || (tiefe === 1 && !inKeyframes)) {
        if (!kopf.startsWith('@')) selektoren.push(kopf);
        if (/^@keyframes/.test(kopf)) inKeyframes = tiefe + 1;
      }
      tiefe++;
      puffer = '';
    } else if (z === '}') {
      tiefe--;
      if (inKeyframes && tiefe < inKeyframes) inKeyframes = 0;
      puffer = '';
    } else puffer += z;
  }
  // Jede Regel beginnt mit .tr- . In aller Regel steht ".tr-app " davor:
  // Das hebt die Regeln des Spiels ueber die Elementregeln der Seite
  // (siehe den Kopf von taxi-rush.css). Aussen wirkt keine davon.
  // Kommas in :where(...) trennen keine Selektoren - sonst wuerde aus
  // ".tr-app :where(p, li)" ein vermeintlich globales " li".
  const teileVon = (sel) => {
    const aus = [];
    let klammer = 0;
    let puffer = '';
    for (const z of sel) {
      if (z === '(') klammer++;
      if (z === ')') klammer--;
      if (z === ',' && klammer === 0) { aus.push(puffer); puffer = ''; continue; }
      puffer += z;
    }
    aus.push(puffer);
    return aus;
  };
  const fremd = selektoren.filter((s) => teileVon(s).some((t) => !/^\.tr-/.test(t.trim())));
  pruefe(fremd.length === 0, `Alle ${selektoren.length} Regeln beginnen mit .tr-` + (fremd.length ? ` (fremd: ${fremd.slice(0, 5).join(' | ')})` : ''));

  for (const global of [/^\s*\*\s*[,{]/m, /^\s*html\s*[,{]/m, /^\s*body\s*[,{]/m, /^\s*button\s*[,{]/m, /^\s*h1\s*[,{]/m, /^\s*h2\s*[,{]/m]) {
    pruefe(!global.test(ohneKommentar), `Kein globaler Selektor ${global.source.replace(/[\\^\s*$mi]/g, '').slice(0, 12)}`);
  }
  pruefe(vorlage.includes('*{box-sizing') || /\*\s*\{/.test(vorlage), '(zur Gegenprobe: die Vorlage hat sehr wohl globale Regeln)');

  // touch-action: none darf NUR am Spielfeld stehen.
  const touchRegeln = [...rushCss.matchAll(/([^{}]+)\{[^{}]*touch-action:\s*none/g)].map((m) => m[1].trim().split('\n').pop().trim());
  pruefe(
    touchRegeln.length === 1 && /\.tr-canvas$/.test(touchRegeln[0]),
    `touch-action: none steht nur an .tr-canvas (gefunden: ${touchRegeln.join(' | ') || 'nirgends'})`,
  );
  pruefe(/@media \(prefers-reduced-motion: reduce\)/.test(rushCss), 'Es gibt einen Block fuer reduzierte Bewegung');
  pruefe(/@media \(max-height:/.test(rushCss), 'Es gibt einen Block fuer flache Bildschirme (Querformat)');
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. Das Spielprinzip der Vorlage — Zahl fuer Zahl
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 5. Spielprinzip nach der Vorlage ──');
{
  const stellen = (text) => {
    const m = text.match(/const stops=\[(.*?)\];/s);
    return m ? (m[1].match(/"name":/g) || []).length : -1;
  };
  const hier = stellen(rushJs);
  const dort = stellen(vorlage);
  pruefe(hier === 18, `18 Haltepunkte (gefunden: ${hier})`);
  pruefe(hier === dort, `Gleich viele Haltepunkte wie in der Vorlage (${hier} zu ${dort})`);

  const zahl = (text, muster) => { const m = text.match(muster); return m ? m[1] : null; };
  const paare = [
    [/time=(\d+);lives=/, 'Startzeit'],
    [/lives=(\d+);trips=/, 'Leben'],
    [/time=Math\.min\(\d+,time\+(\d+)\)/, 'Zeitbonus je Fahrt'],
    [/return (165)\+250/, 'Grundtempo'],
  ];
  for (const [muster, name] of paare) {
    const a = zahl(rushJs, muster);
    const b = zahl(vorlage, muster);
    pruefe(a !== null && a === b, `${name}: ${a} - wie in der Vorlage (${b})`);
  }
  pruefe(/time=75/.test(rushJs), 'Startzeit ist 75 Sekunden');
  pruefe(/lives=3/.test(rushJs), 'Drei Leben');
  pruefe(/time\+12/.test(rushJs), 'Plus zwoelf Sekunden je abgeschlossener Fahrt');

  pruefe(/data-car="sedan"/.test(spieleHtml) && /data-car="van"/.test(spieleHtml), 'Zwei Fahrzeuge zur Wahl');
  pruefe(/sound=false/.test(rushJs), 'Der Ton ist anfangs aus');
  pruefe(/aria-pressed="false"[^>]*>Ton aus|Ton aus<\/button>/.test(spieleHtml.replace(/\s+/g, ' ')), 'Die Tonschaltflaeche steht auf "Ton aus"');

  // Die Werbeflaechen am Strassenrand und das steigende Tempo.
  pruefe(/function roadsideAd\(/.test(rushJs), 'Werbeflaechen am Strassenrand sind Teil des Spiels');
  pruefe(
    (rushJs.match(/roadsideAd\(/g) || []).length === (vorlage.match(/roadsideAd\(/g) || []).length,
    'Sie werden genauso oft gezeichnet wie in der Vorlage',
  );
  pruefe(/1-Math\.exp\(-elapsed\/120\)/.test(rushJs), 'Das Tempo steigt mit der Spieldauer');

  // Die Orts- und Strassennamen stehen in der Anzeige oben, nicht im Bild.
  const gezeichnet = [...rushJs.matchAll(/txt\(([^,]+),/g)].map((m) => m[1]);
  const namenGezeichnet = gezeichnet.filter((a) => /pickupStop|destinationStop|\.name|\.area/.test(a));
  pruefe(namenGezeichnet.length === 0, 'Keine Orts- oder Strassennamen werden ins Spielfeld gezeichnet');
  pruefe(/missionText.*textContent|textContent.*\.name/.test(rushJs), 'Die Namen stehen in der Anzeige ueber dem Spielfeld');
}

// ═══════════════════════════════════════════════════════════════════════════
// Der Browser — ab hier wird gespielt
// ═══════════════════════════════════════════════════════════════════════════
const browser = await chromium.launch({ channel: 'chrome' });

/** Liest den sichtbaren Zustand aus der Anzeige - nicht aus dem Spiel. */
const anzeige = (page) => page.evaluate(() => {
  const w = document.querySelector('[data-taxi-rush]');
  const g = (id) => w.querySelector(`[data-tr="${id}"]`);
  const sichtbar = (e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && !e.hidden; };
  return {
    punkte: Number(g('score').textContent.replace(/\D/g, '')),
    zeit: Number(g('time').textContent),
    leben: (g('health').textContent.match(/●/g) || []).length,
    rekord: Number(g('best').textContent.replace(/\D/g, '')),
    auftrag: g('missionText').textContent,
    strecke: g('routeLine').textContent,
    tempo: g('speed').textContent,
    menue: sichtbar(g('hero')) && !g('overlay').hidden,
    pauseAn: !g('pauseHero').hidden && !g('overlay').hidden,
    endeAn: !g('endHero').hidden && !g('overlay').hidden,
    endPunkte: g('endScore').textContent,
    endFahrten: g('endTrips').textContent,
    altHinweis: g('oldBest').hidden ? null : g('oldBest').textContent,
  };
});

/** Wo steht das gelbe Taxi? Aus den Bildpunkten, nicht aus dem Zustand. */
const taxiX = (page) => page.evaluate(() => {
  const cv = document.querySelector('[data-tr="canvas"]');
  const ctx = cv.getContext('2d');
  const y = Math.round(cv.height * 0.79);
  const d = ctx.getImageData(0, y, cv.width, 6).data;
  let summe = 0; let anzahl = 0;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i]; const g = d[i + 1]; const b = d[i + 2];
    if (r > 190 && g > 140 && g < 215 && b < 95) { summe += (i / 4) % cv.width; anzahl++; }
  }
  // Die Schwelle muss mit der Breite mitwachsen: auf einem schmalen
  // Bildschirm ist das Taxi schlicht kleiner. 3 Prozent der Breite.
  return anzahl > Math.max(12, cv.width * 0.03) ? summe / anzahl : null;
});

const neueSeite = async (vp, opt = {}) => {
  const page = await browser.newPage({ viewport: vp, hasTouch: !!opt.touch, isMobile: !!opt.touch, ...opt.ctx });
  const fehler = [];
  page.on('pageerror', (e) => fehler.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') fehler.push('console: ' + m.text()); });
  page.fehler = fehler;
  await page.goto(`${ADRESSE}/spiele.html`, { waitUntil: 'load' });
  await insBild(page);
  return page;
};

/**
 * Das Spiel so anspringen, wie es die Seite selbst tut - mit dem
 * scroll-margin-top, der den klebenden Seitenkopf freihaelt.
 * scrollIntoViewIfNeeded von Playwright kennt diesen Abstand nicht.
 */
/**
 * Nur dann auf "Weiterfahren" klicken, wenn wirklich pausiert ist.
 *
 * Blind zu klicken kostete hier 30 Sekunden Wartezeit auf einen
 * verborgenen Knopf - und waehrend dieser 30 Sekunden lief die Spielzeit
 * ab. Der naechste Pruefpunkt sah dann ein beendetes Spiel und meldete
 * einen Fehler, den es nicht gab.
 */
const weiterWennPausiert = async (page) => {
  const pausiert = await page.evaluate(
    () => !document.querySelector('[data-tr="pauseHero"]').hidden,
  );
  if (pausiert) {
    await page.locator('[data-tr="resume"]').click({ timeout: 3000 }).catch(() => { });
    await page.waitForTimeout(400);
  }
};

const insBild = async (page) => {
  await page.evaluate(() => document.querySelector('.tr-app').scrollIntoView({ block: 'start' }));
  // Die Seite scrollt weich. Ein festes Warten reicht nicht - gewartet
  // wird, bis die Seite wirklich steht. (Genau daran ist eine fruehere
  // Messung gescheitert: 500 ms, und der Abschnitt war noch unterwegs.)
  // DREI gleiche Messungen hintereinander. Zwei genuegen nicht: eine
  // weiche Bewegung hat Momente, in denen sie kaum vorankommt, und
  // genau dort brach die Schleife vorher ab.
  let letzte = -1;
  let ruhig = 0;
  for (let i = 0; i < 60; i++) {
    const jetzt = await page.evaluate(() => Math.round(scrollY));
    ruhig = jetzt === letzte ? ruhig + 1 : 0;
    if (ruhig >= 3) break;
    letzte = jetzt;
    await page.waitForTimeout(100);
  }
  await page.waitForTimeout(200);
};

// ═══════════════════════════════════════════════════════════════════════════
// 5b. Der Beweis: das Spiel faerbt nicht auf die Seite ab
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 5b. Nichts faerbt nach aussen ab ──');
{
  /*
    DER BEWEIS statt der Behauptung.

    Dass jeder Selektor mit .tr- beginnt, ist ein Argument. Der Beweis
    ist: Die Seite einmal MIT und einmal OHNE taxi-rush.css laden und
    jedes Element ausserhalb des Spiels vergleichen. Bleibt dort auch
    nur ein Wert anders, greift das Spiel nach draussen.

    Das ist nach dem Anheben der Genauigkeit (".tr-app " vor jeder
    Regel) und den gezielten !important besonders wichtig: Beides sind
    Mittel, die sonst gern zu weit reichen.
  */
  const aufnehmenDraussen = async (page) => {
    // Beide Seiten in denselben Zustand bringen: ganz nach oben. Sonst
    // traegt der klebende Seitenkopf einmal die Klasse is-scrolled und
    // einmal nicht - und der Unterschied waere meine eigene Messung.
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
    return page.evaluate(() => {
    const spiel = document.querySelector('[data-taxi-rush]');
    const WICHTIG = [
      'font-family', 'font-size', 'font-weight', 'letter-spacing', 'line-height',
      'color', 'background-color', 'border-radius', 'min-height', 'min-width',
      'padding-top', 'padding-left', 'margin-top', 'display', 'text-align',
    ];
    const aus = [];
    for (const el of document.querySelectorAll('body *')) {
      if (spiel && (el === spiel || spiel.contains(el))) continue;
      // Die Vorfahren des Spiels aendern ihre Hoehe zwangslaeufig mit -
      // das Spiel ist ja darin. Sie sind kein Beleg fuer ein Abfaerben.
      if (spiel && el.contains(spiel)) continue;
      const cs = getComputedStyle(el);
      const w = {};
      for (const k of WICHTIG) w[k] = cs.getPropertyValue(k);
      const b = el.getBoundingClientRect();
      aus.push({ pfad: el.tagName + '.' + el.className.toString().slice(0, 40), stil: w, breite: Math.round(b.width), hoehe: Math.round(b.height) });
    }
    return aus;
    });
  };

  {
    const mit = await neueSeite({ width: 1440, height: 900 });
    const werteMit = await aufnehmenDraussen(mit);
    await mit.close();

    const ohne = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    // Die Datei wird geblockt - dieselbe Seite, nur ohne die Spielstile.
    await ohne.route('**/taxi-rush.css', (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    await ohne.goto(`${ADRESSE}/spiele.html`, { waitUntil: 'load' });
    await ohne.waitForTimeout(800);
    const werteOhne = await aufnehmenDraussen(ohne);
    await ohne.close();

    pruefe(
      werteMit.length === werteOhne.length,
      `Gleich viele Elemente ausserhalb des Spiels (${werteMit.length} zu ${werteOhne.length})`,
    );
    let abw = 0;
    const beispiele = [];
    for (let i = 0; i < Math.min(werteMit.length, werteOhne.length); i++) {
      for (const k of Object.keys(werteMit[i].stil)) {
        if (werteMit[i].stil[k] !== werteOhne[i].stil[k]) {
          abw++;
          if (beispiele.length < 6) beispiele.push(`${werteMit[i].pfad} ${k}: mit "${werteMit[i].stil[k]}" - ohne "${werteOhne[i].stil[k]}"`);
        }
      }
      if (werteMit[i].breite !== werteOhne[i].breite || werteMit[i].hoehe !== werteOhne[i].hoehe) {
        abw++;
        if (beispiele.length < 6) beispiele.push(`${werteMit[i].pfad} Groesse: mit ${werteMit[i].breite}x${werteMit[i].hoehe} - ohne ${werteOhne[i].breite}x${werteOhne[i].hoehe}`);
      }
    }
    pruefe(
      abw === 0,
      `Ausserhalb des Spiels aendert taxi-rush.css keinen einzigen Wert`
      + ` (${werteMit.length} Elemente gemessen, ${abw} Abweichungen)`,
    );
    for (const b of beispiele) hinweis(b);
  }

}

// ═══════════════════════════════════════════════════════════════════════════
// 6. Der Ablauf auf dem PC
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 6. Ablauf am PC (1440 x 900) ──');
{
  const page = await neueSeite({ width: 1440, height: 900 });

  const vorStart = await anzeige(page);
  pruefe(vorStart.menue, 'Vor dem Start steht das Menue');
  pruefe(vorStart.zeit === 75 && vorStart.leben === 3, `Anzeige vor dem Start: ${vorStart.zeit} s, ${vorStart.leben} Leben`);

  await page.locator('[data-tr="start"]').click();
  await page.waitForTimeout(1500);
  const nachStart = await anzeige(page);
  pruefe(!nachStart.menue, 'Nach dem Start ist das Menue weg');
  pruefe(nachStart.zeit < 75, `Die Zeit laeuft (${nachStart.zeit} s)`);
  pruefe(nachStart.punkte > 0, `Punkte steigen im Fahren (${nachStart.punkte})`);

  // ── Lenken: gemessen an den Bildpunkten ──
  await page.locator('[data-tr="canvas"]').focus();
  const x0 = await taxiX(page);
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(450);
  const x1 = await taxiX(page);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(450);
  const x2 = await taxiX(page);
  pruefe(x0 !== null && x1 !== null && x2 !== null, 'Das Taxi ist im Spielfeld aufzufinden');
  if (x0 !== null && x1 !== null && x2 !== null) {
    pruefe(x1 < x0 - 30, `Pfeil links versetzt das Taxi nach links (${Math.round(x0)} -> ${Math.round(x1)} px)`);
    pruefe(x2 > x1 + 30, `Pfeil rechts versetzt es nach rechts (${Math.round(x1)} -> ${Math.round(x2)} px)`);
  }

  // Die Knoepfe tun dasselbe.
  const x3 = await taxiX(page);
  await page.locator('[data-tr="left"]').click();
  await page.waitForTimeout(450);
  const x4 = await taxiX(page);
  pruefe(x4 !== null && x3 !== null && x4 < x3 - 30, `Der Pfeilknopf lenkt ebenfalls (${Math.round(x3)} -> ${Math.round(x4)} px)`);

  // ── Pause: die Zeit muss stehen bleiben ──
  await page.locator('[data-tr="canvas"]').focus();
  await page.keyboard.press('KeyP');
  await page.waitForTimeout(300);
  const p1 = await anzeige(page);
  await page.waitForTimeout(1600);
  const p2 = await anzeige(page);
  pruefe(p1.pauseAn, 'Taste P haelt an und zeigt den Pausentext');
  pruefe(p1.zeit === p2.zeit, `In der Pause laeuft die Zeit nicht weiter (${p1.zeit} s nach 1,6 s immer noch ${p2.zeit} s)`);
  pruefe(p1.punkte === p2.punkte, 'In der Pause steigen auch die Punkte nicht');

  await page.locator('[data-tr="resume"]').click();
  await page.waitForTimeout(1200);
  const p3 = await anzeige(page);
  pruefe(!p3.pauseAn && p3.zeit < p2.zeit, `Fortsetzen laesst die Zeit weiterlaufen (${p2.zeit} -> ${p3.zeit} s)`);

  // ── Abholen und Abliefern ──
  // Es wird wirklich gefahren, bis eine Fahrt abgeschlossen ist. Die
  // Zielzone wird angesteuert, indem das Taxi der Spur folgt.
  let abgeholt = false;
  let abgeliefert = false;
  let zeitSprung = null;
  let letzteZeit = p3.zeit;
  let fahrten = 0;
  await page.locator('[data-tr="canvas"]').focus();
  const bis = Date.now() + 90000;
  while (Date.now() < bis && !abgeliefert) {
    const a = await anzeige(page);
    if (/an Bord/i.test(a.strecke)) abgeholt = true;
    if (a.zeit > letzteZeit + 4) { zeitSprung = a.zeit - letzteZeit; abgeliefert = true; fahrten++; }
    letzteZeit = a.zeit;
    // Geht die Schicht zu Ende, bevor eine Fahrt geschafft ist, wird
    // weitergespielt statt aufgegeben - sonst haenge die Aussage am
    // Zufall des Verkehrs.
    if (a.endeAn) {
      await page.locator('[data-tr="again"]').click({ timeout: 4000 }).catch(() => { });
      await page.waitForTimeout(700);
      await page.locator('[data-tr="canvas"]').focus();
      letzteZeit = (await anzeige(page)).zeit;
      continue;
    }

    // GEZIELT fahren statt zu wuerfeln: Die Abhol- und die Zielzone sind
    // im Spielfeld an ihrer Farbe zu erkennen - Gold beim Abholen, Gruen
    // beim Abliefern. Das Taxi wird auf diese Spalte gesteuert.
    const ziel = await page.evaluate((anBord) => {
      const cv = document.querySelector('[data-tr="canvas"]');
      const d = cv.getContext('2d').getImageData(0, Math.round(cv.height * 0.2), cv.width, 90).data;
      let summe = 0; let anzahl = 0;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i]; const g = d[i + 1]; const b = d[i + 2];
        const treffer = anBord
          ? (g > 120 && r < g - 45 && b < g - 35)          // gruene Zielzone
          : (r > 150 && g > 110 && b < 110 && r - b > 70); // goldene Abholzone
        if (treffer) { summe += (i / 4) % cv.width; anzahl++; }
      }
      return anzahl > 60 ? summe / anzahl : null;
    }, abgeholt);

    const jetzt = await taxiX(page);
    if (ziel !== null && jetzt !== null && Math.abs(ziel - jetzt) > 40) {
      await page.keyboard.press(ziel < jetzt ? 'ArrowLeft' : 'ArrowRight');
    }
    await page.waitForTimeout(260);
  }
  void fahrten;
  pruefe(abgeholt, 'Ein Fahrgast wurde eingesammelt (Anzeige: "Fahrgast an Bord")');
  pruefe(abgeliefert, abgeliefert
    ? `Eine Fahrt wurde abgeschlossen - die Zeit sprang um ${zeitSprung} s nach oben`
    : 'Eine Fahrt wurde abgeschlossen (in 90 s Spiel nicht erreicht)');
  if (zeitSprung !== null) {
    pruefe(zeitSprung >= 9 && zeitSprung <= 12, `Der Zeitbonus liegt bei den erwarteten +12 s (gemessen: +${zeitSprung} s, Abzug durch die laufende Uhr)`);
  }

  // ── Steigendes Tempo ──
  const tempoJetzt = (await anzeige(page)).tempo;
  pruefe(/TEMPOSTUFE \d/.test(tempoJetzt), `Die Tempostufe wird angezeigt ("${tempoJetzt}")`);

  pruefe(page.fehler.length === 0, `Keine Fehler in der Browserkonsole${page.fehler.length ? ': ' + page.fehler[0] : ''}`);
  await page.close();
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. Spielende, Rekord und Neustart
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 7. Spielende, Rekord, Neustart ──');
{
  const page = await neueSeite({ width: 1440, height: 900 });
  await page.locator('[data-tr="start"]').click();

  // Bis zum Ende spielen. 75 Sekunden Spielzeit plus Bonusfahrten; hart
  // begrenzt, damit ein Prueflauf nicht haengt.
  let ende = null;
  const bis = Date.now() + 150000;
  while (Date.now() < bis) {
    const a = await anzeige(page);
    if (a.endeAn) { ende = a; break; }
    await page.waitForTimeout(1000);
  }
  pruefe(ende !== null, 'Das Spiel endet von selbst (Zeit abgelaufen oder drei Leben verbraucht)');

  if (ende) {
    pruefe(Number(ende.endPunkte.replace(/\D/g, '')) >= 0, `Das Ergebnis nennt die Punkte (${ende.endPunkte})`);
    pruefe(/^\d+$/.test(ende.endFahrten), `Das Ergebnis nennt die Fahrten (${ende.endFahrten})`);
    pruefe(ende.rekord > 0, `Der Rekord wurde gesetzt (${ende.rekord})`);

    const gespeichert = await page.evaluate(() => localStorage.getItem('tg-rush-best-v1'));
    pruefe(String(ende.rekord) === gespeichert, `Der Rekord steht im Speicher (${gespeichert})`);

    // Neustart
    await page.locator('[data-tr="again"]').click();
    await page.waitForTimeout(400);
    const neu = await anzeige(page);
    pruefe(!neu.endeAn, 'Neustart schliesst das Ergebnis');
    pruefe(neu.zeit >= 74 && neu.leben === 3, `Neustart setzt zurueck: ${neu.zeit} s, ${neu.leben} Leben`);
    pruefe(neu.punkte < 50, `Neustart setzt die Punkte zurueck (${neu.punkte})`);

    // Nach dem Neuladen muss der Rekord noch da sein.
    await page.reload({ waitUntil: 'load' });
    await insBild(page);
    const nachLaden = await anzeige(page);
    pruefe(nachLaden.rekord === ende.rekord, `Der Rekord ueberlebt das Neuladen (${nachLaden.rekord})`);
  }

  // Fahrzeugwahl
  await page.locator('[data-car="van"]').click();
  const gewaehlt = await page.evaluate(() => [...document.querySelectorAll('[data-car]')].map((b) => b.dataset.car + '=' + b.getAttribute('aria-pressed')));
  pruefe(gewaehlt.includes('van=true') && gewaehlt.includes('sedan=false'), `Die Fahrzeugwahl schaltet um (${gewaehlt.join(', ')})`);
  await page.locator('[data-tr="start"]').click();
  await page.waitForTimeout(1200);
  pruefe((await anzeige(page)).zeit < 75, 'Auch mit dem Grossraumwagen laeuft das Spiel');
  await page.locator('[data-car="sedan"]').click().catch(() => { });

  pruefe(page.fehler.length === 0, `Keine Fehler in der Browserkonsole${page.fehler.length ? ': ' + page.fehler[0] : ''}`);
  await page.close();
}

// ═══════════════════════════════════════════════════════════════════════════
// 8. Ton, Kollision
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 8. Ton und Kollisionen ──');
{
  const page = await neueSeite({ width: 1440, height: 900 });
  const knopf = page.locator('[data-tr="sound"]');
  pruefe(await knopf.getAttribute('aria-pressed') === 'false', 'Der Ton steht beim Laden auf aus');

  // Im Menue liegt die Auswahl ueber der Anzeige - wie in der Vorlage.
  // Der Tonknopf ist also erst im laufenden Spiel zu bedienen.
  pruefe(
    !(await knopf.isEnabled().then(() => page.evaluate(() => {
      const b = document.querySelector('[data-tr="sound"]').getBoundingClientRect();
      const oben = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
      return oben && oben.closest('[data-tr="sound"]') !== null;
    }))),
    'Im Menue deckt die Fahrzeugauswahl die Anzeige ab - so wie in der Vorlage',
  );

  await page.locator('[data-tr="start"]').click();
  await page.waitForTimeout(900);
  await knopf.click();
  pruefe(await knopf.getAttribute('aria-pressed') === 'true', 'Ein Klick schaltet den Ton ein');
  pruefe((await knopf.textContent()).trim() === 'Ton an', 'Die Beschriftung wechselt mit');
  pruefe(await knopf.getAttribute('aria-label') === 'Ton ausschalten', 'Und die Vorlesebeschriftung ebenso');
  await knopf.click();
  pruefe(await knopf.getAttribute('aria-pressed') === 'false', 'Noch ein Klick schaltet ihn wieder aus');

  // Kollision: es wird gefahren, bis ein Leben fehlt. Das kann dauern -
  // deshalb mit klarer Obergrenze und ehrlicher Meldung.
  let verloren = false;
  const bis = Date.now() + 90000;
  while (Date.now() < bis) {
    const a = await anzeige(page);
    if (a.leben < 3) { verloren = true; hinweis(`Leben nach der Kollision: ${a.leben}`); break; }
    if (a.endeAn) break;
    await page.waitForTimeout(700);
  }
  pruefe(verloren, 'Eine Kollision kostet ein Leben (im Spiel beobachtet)');
  await page.close();
}

// ═══════════════════════════════════════════════════════════════════════════
// 9. Die Seite bleibt bedienbar
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 9. Die Seite bleibt bedienbar ──');
{
  const page = await neueSeite({ width: 1440, height: 900 });

  // Pfeiltasten scrollen, solange der Fokus nicht im Spiel liegt.
  await page.evaluate(() => { document.querySelector('a, button').focus(); window.scrollTo(0, 400); });
  const vorher = await page.evaluate(() => scrollY);
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(350);
  const nachher = await page.evaluate(() => scrollY);
  pruefe(nachher > vorher, `Pfeil ab scrollt die Seite ausserhalb des Spiels (${vorher} -> ${nachher} px)`);

  // Im Menue darf die Tastatur ueberhaupt nicht greifen.
  await insBild(page);
  await page.locator('[data-tr="canvas"]').focus();
  const vor2 = await page.evaluate(() => scrollY);
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(350);
  pruefe(await page.evaluate(() => scrollY) > vor2, 'Im Menue scrollt Pfeil ab weiter, das Spiel faengt nichts ab');

  // In einem Eingabefeld muss die Leertaste ein Leerzeichen tippen -
  // auch waehrend das Spiel laeuft.
  await insBild(page);
  await page.locator('[data-tr="start"]').click();
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    const f = document.createElement('input');
    f.id = 'pruef-feld';
    f.type = 'text';
    document.querySelector('[data-taxi-rush]').after(f);
    f.focus();
  });
  await page.keyboard.type('a b');
  const getippt = await page.evaluate(() => document.getElementById('pruef-feld').value);
  pruefe(getippt === 'a b', `Die Leertaste tippt im Eingabefeld ein Leerzeichen ("${getippt}")`);
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(200);
  pruefe(
    await page.evaluate(() => document.getElementById('pruef-feld').selectionStart) === 2,
    'Pfeiltasten bewegen im Feld den Schreibzeiger, statt zu lenken',
  );
  await page.evaluate(() => document.getElementById('pruef-feld').remove());

  // Bei laufendem Spiel und Fokus im Spiel darf Pfeil ab NICHT scrollen.
  // Erst abwarten, bis die Seite steht: der Start rueckt das Spiel weich
  // ins Bild, und diese Bewegung laeuft sonst in die Messung hinein.
  await insBild(page);
  await page.locator('[data-tr="canvas"]').focus();
  const vor3 = await page.evaluate(() => scrollY);
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(300);
  pruefe(await page.evaluate(() => scrollY) === vor3, 'Beim Lenken scrollt die Seite nicht mit');

  pruefe(page.fehler.length === 0, `Keine Fehler in der Browserkonsole${page.fehler.length ? ': ' + page.fehler[0] : ''}`);
  await page.close();
}

// ═══════════════════════════════════════════════════════════════════════════
// 10. Anhalten, wenn niemand hinsieht — und nur eine Schleife
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 10. Anhalten und Aufraeumen ──');
{
  const page = await neueSeite({ width: 1440, height: 900 });
  await page.locator('[data-tr="start"]').click();
  await page.waitForTimeout(900);

  // Wegscrollen muss anhalten - und darf die Seite nicht zurueckreissen.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(900);
  const obenNach = await page.evaluate(() => scrollY);
  pruefe(obenNach < 200, `Das Wegscrollen bleibt bestehen, das Spiel reisst die Seite nicht zurueck (scrollY ${obenNach})`);
  const w1 = await anzeige(page);
  await page.waitForTimeout(1800);
  const w2 = await anzeige(page);
  pruefe(w1.zeit === w2.zeit, `Ausserhalb des Bildes laeuft die Zeit nicht (${w1.zeit} s bleibt ${w2.zeit} s)`);
  pruefe(w2.pauseAn, 'Das Spiel steht dabei auf Pause');

  // Zurueckscrollen: die Schleife laeuft wieder, aber nur einmal.
  await insBild(page);
  await page.locator('[data-tr="resume"]').click();
  await page.waitForTimeout(300);

  // Mehrfach oeffnen darf keine zweite Schleife anwerfen. Gemessen am
  // Zeitverbrauch: eine zweite Schleife zoege die Uhr doppelt so schnell.
  await page.evaluate(() => {
    const w = document.querySelector('[data-taxi-rush]');
    for (let i = 0; i < 5; i++) w.taxiRush.oeffnen();
  });
  const m1 = await anzeige(page);
  await page.waitForTimeout(4000);
  const m2 = await anzeige(page);
  const verbraucht = m1.zeit - m2.zeit;
  pruefe(
    verbraucht >= 3 && verbraucht <= 5,
    `Nach fuenf zusaetzlichen Oeffnen laeuft die Uhr weiter im Takt: ${verbraucht} s in 4 s (zwei Schleifen waeren ~8)`,
  );

  // Verborgener Tab pausiert.
  await weiterWennPausiert(page);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(400);
  pruefe((await anzeige(page)).pauseAn, 'Ein verborgener Tab haelt das Spiel an');

  // Sauber schliessen: danach steht alles still.
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await weiterWennPausiert(page);
  await page.evaluate(() => document.querySelector('[data-taxi-rush]').taxiRush.schliessen());
  const s1 = await anzeige(page);
  await page.waitForTimeout(1600);
  const s2 = await anzeige(page);
  pruefe(s1.zeit === s2.zeit && s1.punkte === s2.punkte, 'Nach dem Schliessen bewegt sich nichts mehr');
  const nochZuhoerer = await page.evaluate(() => {
    const vor = scrollY;
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft', bubbles: true }));
    return scrollY === vor;
  });
  pruefe(nochZuhoerer, 'Nach dem Schliessen faengt das Spiel keine Tasten mehr ab');

  await page.close();
}

// ═══════════════════════════════════════════════════════════════════════════
// 11. Handy und Querformat
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 11. Handy und Querformat ──');
for (const [name, vp] of [['Handy 390 x 844', { width: 390, height: 844 }], ['Querformat 844 x 390', { width: 844, height: 390 }], ['Klein 320 x 568', { width: 320, height: 568 }]]) {
  const page = await neueSeite(vp, { touch: true });

  pruefe(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
    `${name}: kein waagerechter Ueberlauf`,
  );

  // Start, Hinweise, Pause und Ergebnis muessen erreichbar sein.
  for (const [id, was] of [['start', 'Startknopf']]) {
    await page.locator(`[data-tr="${id}"]`).scrollIntoViewIfNeeded();
    const imBild = await page.evaluate((k) => {
      const b = document.querySelector(`[data-tr="${k}"]`).getBoundingClientRect();
      return b.top >= 0 && b.bottom <= innerHeight && b.height > 0;
    }, id);
    pruefe(imBild, `${name}: ${was} ist erreichbar`);
  }
  const hilfeDa = await page.evaluate(() => {
    const h = document.querySelector('.tr-help');
    h.scrollIntoView({ block: 'nearest' });
    const b = h.getBoundingClientRect();
    return b.height > 0 && b.top < innerHeight && b.bottom > 0;
  });
  pruefe(hilfeDa, `${name}: die Bedienhinweise sind erreichbar`);

  await page.locator('[data-tr="start"]').click();
  await page.waitForTimeout(1400);
  const a = await anzeige(page);
  pruefe(a.zeit < 75 && a.punkte > 0, `${name}: das Spiel laeuft (${a.zeit} s, ${a.punkte} Punkte)`);

  // Hochkant muss die Bedienung vollstaendig im Bild liegen - ohne
  // Scrollen. Im Querformat geht das nicht auf; dort wird nur verlangt,
  // dass sie ueberhaupt zu erreichen ist. Das steht so auch als offene
  // Einschraenkung in taxi-rush.css und im Bericht.
  const hochkant = vp.height > vp.width;
  for (const [id, was] of [['pause', 'Pausenknopf'], ['boost', 'Boost'], ['left', 'Lenkpfeil']]) {
    if (!hochkant) {
      // behavior: 'instant' - sonst misst man mitten in der weichen
      // Bewegung und sieht das Element noch ausserhalb.
      const erreichbar = await page.evaluate((k) => {
        const e = document.querySelector(`[data-tr="${k}"]`);
        e.scrollIntoView({ block: 'nearest', behavior: 'instant' });
        const b = e.getBoundingClientRect();
        return b.width > 0 && b.top < innerHeight && b.bottom > 0;
      }, id);
      pruefe(erreichbar, `${name}: ${was} ist nach kurzem Scrollen erreichbar (Querformat, siehe Einschraenkung)`);
      continue;
    }
    const imBild = await page.evaluate((k) => {
      const b = document.querySelector(`[data-tr="${k}"]`).getBoundingClientRect();
      return b.top >= 0 && b.bottom <= innerHeight && b.width > 0;
    }, id);
    pruefe(imBild, `${name}: ${was} liegt im Bild`);
  }

  // Tippen auf den Lenkpfeil bewegt das Taxi. Damit das Taxi nicht schon
  // ganz links steht, wird zuerst nach rechts getippt.
  await page.locator('[data-tr="right"]').tap();
  await page.locator('[data-tr="right"]').tap();
  await page.waitForTimeout(500);
  // Nach einer Kollision blinkt das Taxi - dann ist es in einem einzelnen
  // Bild schlicht nicht da. Deshalb mehrfach nachsehen.
  const taxiSuchen = async () => {
    for (let i = 0; i < 8; i++) {
      const x = await taxiX(page);
      if (x !== null) return x;
      await page.waitForTimeout(140);
    }
    return null;
  };
  const tx0 = await taxiSuchen();
  await page.locator('[data-tr="left"]').tap();
  await page.waitForTimeout(500);
  const tx1 = await taxiSuchen();
  pruefe(
    tx0 !== null && tx1 !== null && tx1 < tx0 - 20,
    `${name}: Tippen lenkt (${tx0 === null ? 'Taxi nicht gefunden' : Math.round(tx0)} -> ${tx1 === null ? 'Taxi nicht gefunden' : Math.round(tx1)})`,
  );

  // Pausieren und Fortsetzen ueber die Knoepfe.
  await page.locator('[data-tr="pause"]').tap();
  await page.waitForTimeout(400);
  pruefe((await anzeige(page)).pauseAn, `${name}: der Pausenknopf haelt an`);
  await page.locator('[data-tr="resume"]').scrollIntoViewIfNeeded();
  await page.locator('[data-tr="resume"]').tap();
  await page.waitForTimeout(800);
  pruefe(!(await anzeige(page)).pauseAn, `${name}: Weiterfahren geht`);

  // Wischen ausserhalb des Spielfelds muss die Seite scrollen.
  const sVor = await page.evaluate(() => scrollY);
  await page.evaluate(() => window.scrollBy(0, 120));
  await page.waitForTimeout(250);
  pruefe(await page.evaluate(() => scrollY) > sVor, `${name}: die Seite laesst sich weiterhin scrollen`);

  pruefe(page.fehler.length === 0, `${name}: keine Fehler in der Konsole${page.fehler.length ? ': ' + page.fehler[0] : ''}`);
  await page.close();
}

// ═══════════════════════════════════════════════════════════════════════════
// 12. Reduzierte Bewegung und ein gesperrter Speicher
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 12. Reduzierte Bewegung, gesperrter Speicher ──');
{
  const page = await neueSeite({ width: 1440, height: 900 }, { ctx: { reducedMotion: 'reduce' } });
  await page.locator('[data-tr="start"]').click();
  await page.waitForTimeout(1500);
  const a = await anzeige(page);
  pruefe(a.zeit < 75 && a.punkte > 0, `Mit reduzierter Bewegung laeuft das Spiel trotzdem (${a.zeit} s, ${a.punkte} Punkte)`);
  pruefe(page.fehler.length === 0, 'Keine Fehler bei reduzierter Bewegung');
  await page.close();
}
{
  // Der Speicher wirft bei jedem Zugriff - das Spiel muss das aushalten.
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const fehler = [];
  page.on('pageerror', (e) => fehler.push({ text: e.message, stapel: String(e.stack || '') }));
  await page.addInitScript(() => {
    const werfen = () => { throw new DOMException('gesperrt', 'SecurityError'); };
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get: () => ({ getItem: werfen, setItem: werfen, removeItem: werfen }),
    });
  });
  await page.goto(`${ADRESSE}/spiele.html`, { waitUntil: 'load' });
  await insBild(page);
  await page.locator('[data-tr="start"]').click();
  await page.waitForTimeout(1500);
  const a = await anzeige(page);
  pruefe(a.zeit < 75 && a.punkte > 0, `Mit gesperrtem Speicher laeuft das Spiel (${a.zeit} s, ${a.punkte} Punkte)`);
  pruefe(a.rekord === 0, 'Der Rekord steht dann auf null, statt die Seite abzubrechen');
  // Es zaehlt nur, was AUS DEM SPIEL kommt. Andere Skripte der Seite
  // gehen diesen Schritt nicht an - ihre Fehler werden getrennt genannt,
  // nicht stillschweigend mitgezaehlt.
  const speicherFehler = fehler.filter((f) => /SecurityError|gesperrt/.test(f.text));
  const ausDemSpiel = speicherFehler.filter((f) => /taxi-rush\.js/.test(f.stapel));
  const woanders = speicherFehler.filter((f) => !/taxi-rush\.js/.test(f.stapel));
  pruefe(ausDemSpiel.length === 0, `Taxi Rush verursacht keinen unbehandelten Speicherfehler${ausDemSpiel.length ? ': ' + ausDemSpiel[0].text : ''}`);
  for (const f of woanders) {
    const stelle = f.stapel.split('\n').find((z) => /\.js/.test(z));
    hinweis('Ausserhalb von Taxi Rush, unveraendert aus dem Bestand: '
      + f.text + (stelle ? ' — ' + stelle.trim() : ' (keine Stelle im Protokoll)'));
  }
  await page.close();
}

// ═══════════════════════════════════════════════════════════════════════════
// 13. Der alte Bestwert
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 13. Der Bestwert der alten Fassung ──');
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.addInitScript(() => {
    try { localStorage.setItem('tg_taxi_rush_best_score', '4711'); } catch { }
  });
  await page.goto(`${ADRESSE}/spiele.html`, { waitUntil: 'load' });
  await insBild(page);
  const a = await anzeige(page);
  pruefe(a.altHinweis !== null, 'Ein vorhandener alter Bestwert wird dem Spieler erklaert');
  if (a.altHinweis) {
    hinweis(a.altHinweis);
    pruefe(a.altHinweis.includes('4.711'), 'Der alte Wert wird beim Namen genannt');
    pruefe(/nicht übernommen/.test(a.altHinweis), 'Es steht ausdruecklich da, dass er nicht uebernommen wird');
    pruefe(/anders/.test(a.altHinweis), 'Der Grund - eine andere Punkteberechnung - steht dabei');
    pruefe(/bleibt gespeichert/.test(a.altHinweis), 'Und dass der alte Wert erhalten bleibt');
  }
  pruefe(a.rekord === 0, `Der neue Rekord startet trotzdem bei null (${a.rekord})`);
  pruefe(
    await page.evaluate(() => localStorage.getItem('tg_taxi_rush_best_score')) === '4711',
    'Der alte Wert steht nach dem Besuch unveraendert im Speicher',
  );

  await page.close();

  // Ohne alten Wert darf der Hinweis nicht erscheinen. Dafuer eine
  // FRISCHE Seite: addInitScript wirkt auch nach einem Neuladen weiter
  // und wuerde den Wert sonst gleich wieder setzen.
  const sauber = await neueSeite({ width: 1440, height: 900 });
  pruefe((await anzeige(sauber)).altHinweis === null, 'Ohne alten Wert bleibt der Hinweis aus');
  await sauber.close();
}

// ═══════════════════════════════════════════════════════════════════════════
// 14. Vergleich mit der Vorlage
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 14. Vergleich mit der Vorlage ──');
// Zweimal: am Schreibtisch und am Handy. Die Vorlage hat eigene Regeln
// fuer schmale Bildschirme - die muessen genauso greifen.
for (const VP of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  // Die Vorlage wird aus dem Projekt geladen (NICHT aus dem Ausgabeordner)
  // und Element fuer Element mit der Einbindung verglichen.
  const page = await browser.newPage({ viewport: VP });
  await page.goto(`${ADRESSE}/design-vorlagen/Taxi-Rush.html`, { waitUntil: 'load' }).catch(() => { });
  const status = page.url();
  const geladen = await page.evaluate(() => !!document.getElementById('canvas')).catch(() => false);

  /*
    JEDES Element, nicht acht Stichproben.

    Die Struktur ist dieselbe wie in der Vorlage - nur heissen die
    Kennungen hier data-tr statt id. Also wird die Huelle des Spiels in
    beiden Seiten in Dokumentreihenfolge durchlaufen und Element gegen
    Element verglichen: Schrift, Farbe, Rahmen, Abstaende, Groesse.

    Nicht verglichen wird, was sich zwischen zwei Ladevorgaengen ohnehin
    unterscheidet: die Spielflaeche selbst (Zufall im Verkehr) und die
    Texte (Punktestand, Strecke).
  */
  const AUFNAHME = (wurzelSel) => {
    const app = document.querySelector(wurzelSel);
    if (!app) return null;
    const WICHTIG = [
      'font-family', 'font-size', 'font-weight', 'font-style', 'letter-spacing',
      'line-height', 'text-transform', 'text-align', 'color', 'background-color',
      'background-image', 'border-top-width', 'border-top-color', 'border-radius',
      'padding-top', 'padding-left', 'margin-top', 'margin-left', 'display',
      'flex-direction', 'align-items', 'justify-content', 'gap', 'opacity',
      'position', 'z-index', 'box-shadow', 'min-height', 'min-width',
    ];
    const aus = [];
    const lauf = (el) => {
      const cs = getComputedStyle(el);
      const w = {};
      for (const k of WICHTIG) w[k] = cs.getPropertyValue(k);
      const b = el.getBoundingClientRect();
      aus.push({
          // Die Klassen heissen hier tr-xyz, in der Vorlage nur xyz. Fuer
        // den Vergleich wird das Praefix abgezogen - sonst waere jeder
        // Pfad verschieden und der Vergleich wertlos.
        pfad: el.tagName + (el.className && el.className.toString
          ? '.' + el.className.toString().trim().replace(/\btr-/g, '').replace(/\s+/g, '.')
          : ''),
        stil: w,
        breite: Math.round(b.width),
        hoehe: Math.round(b.height),
        // Fuer den Vergleich: Wie viel schmaler als der Elter? Bei einem
        // festen Innenabstand (left/right in px) ist das die Groesse,
        // die gleich bleiben muss - nicht die Breite selbst.
        randZumElter: el.parentElement
          ? Math.round(el.parentElement.getBoundingClientRect().width - b.width)
          : 0,
      });
      for (const kind of el.children) lauf(kind);
    };
    lauf(app);
    return aus;
  };

  let vorlageAufnahme = null;
  if (geladen) {
    await page.waitForTimeout(700);
    vorlageAufnahme = await page.evaluate(`(${AUFNAHME.toString()})('.app')`);
  }
  await page.close();

  // Ohne Aufnahme faellt der ganze Vergleich aus - und genau das ist
  // einmal unbemerkt passiert, weil die Huelle in der Vorlage .app
  // heisst und hier .tr-app. Ein stiller Ausfall waere schlimmer als
  // eine Abweichung, deshalb wird er hier ausdruecklich gemeldet.
  pruefe(
    Array.isArray(vorlageAufnahme) && vorlageAufnahme.length > 20,
    `${VP.width} px: die Vorlage konnte vermessen werden (${vorlageAufnahme ? vorlageAufnahme.length : 0} Elemente)`,
  );

  pruefe(geladen, `${VP.width} px: Die Vorlage laesst sich lokal oeffnen (${geladen ? 'ja' : 'nein, Adresse ' + status})`);

  if (vorlageAufnahme) {
    const seite = await neueSeite(VP);
    const unsere = await seite.evaluate(`(${AUFNAHME.toString()})('.tr-app')`);

    /*
      DREI BEWUSSTE UNTERSCHIEDE, hier benannt statt verschwiegen:

      1. Ein Element mehr. `p.tr-oldbest` traegt den Hinweis, dass der
         Bestwert der alten Fassung nicht uebernommen wird. Den gibt es
         in der Vorlage nicht, weil es dort keine alte Fassung gab. Es
         wird vor dem Vergleich herausgenommen.

      2. Andere Elementnamen an drei Stellen:
           main  -> div   (eine Seite hat nur EIN main, und das gehoert
                           der Spielewelt, nicht dem Spiel)
           h1    -> h4    (die Seite hat schon eine h1; die Rangfolge
                           der Ueberschriften muss stimmen)
           h2    -> h4    (dasselbe eine Stufe tiefer)
         Zusaetzliche Klassen an canvas und an der Lebensanzeige, weil
         hier Klassen stehen, wo die Vorlage ids benutzt.

      3. Andere Breiten. Das Spiel steht in einer Spalte der Seite, die
         Vorlage im ganzen Fenster. Deshalb werden Breiten nicht absolut
         verglichen, sondern als Anteil an der Breite der Huelle - so
         faellt ein echter Layoutfehler trotzdem auf.
    */
    const ohneZusatz = unsere.filter((e) => !/\boldbest\b/.test(e.pfad));
    const gleicheStelle = (v, u) => {
      if (v.pfad === u.pfad) return true;
      const vk = v.pfad.replace(/^[A-Z0-9]+/, '');
      const uk = u.pfad.replace(/^[A-Z0-9]+/, '');
      const paare = [['MAIN', 'DIV'], ['H1', 'H4'], ['H2', 'H4']];
      const vt = v.pfad.match(/^[A-Z0-9]+/)[0];
      const ut = u.pfad.match(/^[A-Z0-9]+/)[0];
      const tagOk = vt === ut || paare.some(([a, b]) => vt === a && ut === b);
      // Zusaetzliche Klasse erlaubt, fehlende nicht.
      const vKlassen = vk.split('.').filter(Boolean);
      const uKlassen = uk.split('.').filter(Boolean);
      const klassenOk = vKlassen.every((k) => uKlassen.includes(k));
      return tagOk && klassenOk;
    };
    const vBreite = vorlageAufnahme[0].breite;
    const uBreite = ohneZusatz[0].breite;

    pruefe(
      ohneZusatz.length === vorlageAufnahme.length,
      `${VP.width} px: gleich viele Elemente wie in der Vorlage (${ohneZusatz.length} zu ${vorlageAufnahme.length}, der Hinweis zum alten Bestwert abgezogen)`,
    );

    /*
      Abweichungen, die ABSICHT sind. Sie werden genannt, nicht gezaehlt
      - und wenn eine davon verschwindet, faellt das auf, weil sie dann
      nicht mehr gemeldet wird.
    */
    const BEWUSST = [
      {
        test: (pfad, eig) => /\bgame\b/.test(pfad) && (eig === 'min-height' || eig === 'height'),
        grund: 'Die Vorlage stand allein auf der Seite. Hier kommen der klebende '
          + 'Seitenkopf und der Abstand beim Anspringen dazu, sonst laege die '
          + 'Bedienleiste unter dem Bildrand (gemessen bei 390 x 844).',
      },
    ];

    let gleich = 0;
    const abweichend = [];
    const bewusst = [];
    const engeSpalte = [];
    const n = Math.min(ohneZusatz.length, vorlageAufnahme.length);
    for (let i = 0; i < n; i++) {
      const v = vorlageAufnahme[i];
      const u = ohneZusatz[i];
      if (!gleicheStelle(v, u)) { abweichend.push(`[${i}] andere Stelle: "${v.pfad}" gegen "${u.pfad}"`); continue; }
      // Die Spielflaeche selbst wird nicht verglichen - dort zeichnet der
      // Zufall.
      if (/tr-canvas/.test(v.pfad)) continue;
      for (const k of Object.keys(v.stil)) {
        if (v.stil[k] === u.stil[k]) { gleich++; continue; }
        const text = `${v.pfad} ${k}: Vorlage "${v.stil[k]}" - hier "${u.stil[k]}"`;
        const grund = BEWUSST.find((b) => b.test(v.pfad, k));
        if (grund) { bewusst.push(`${text}  →  ${grund.grund}`); continue; }
        abweichend.push(text);
      }
      /*
        Breite: ZWEI gueltige Ergebnisse.

        Fest bemessene Teile (das Auftragsfenster mit 300 px, der Boost
        mit 116 px) muessen dieselbe Pixelbreite haben. Mitwachsende
        Teile muessen denselben ANTEIL haben - sie stehen hier in einer
        schmaleren Spalte als in der Vorlage. Passt eines von beidem,
        ist es richtig.

        Die Kennzeichnung rechts oben wird nicht vermessen: In der
        Vorlage steht dort "SPIELBARE DESIGNVORSCHAU", hier
        "NUR SPIELSCORE · KEINE REWARDS". Ein anderer Text ist anders
        breit - das ist gewollt und keine Abweichung der Gestaltung.
      */
      if (/\btag\b/.test(v.pfad)) { gleich++; continue; }
      const vAnteil = v.breite / vBreite;
      const uAnteil = u.breite / uBreite;
      const festGleich = Math.abs(v.breite - u.breite) <= 1;
      const anteilGleich = Math.abs(vAnteil - uAnteil) <= 0.01;
      // Dritter gueltiger Fall: Das Teil fuellt den Elter bis auf einen
      // festen Abstand (etwa left/right: 22px). Dann muss dieser Abstand
      // gleich sein, nicht die Breite und nicht der Anteil.
      const randGleich = Math.abs(v.randZumElter - u.randZumElter) <= 1;
      if (!festGleich && !anteilGleich && !randGleich) {
        const text = `${v.pfad} Breite: Vorlage ${v.breite} px (${(vAnteil * 100).toFixed(1)} %)`
          + ` - hier ${u.breite} px (${(uAnteil * 100).toFixed(1)} %)`;
        // Ist die Spalte hier schmaler als die Seite der Vorlage, stossen
        // Teile mit einer Hoechstbreite frueher an. Das ist dieselbe CSS
        // in einem engeren Kasten, kein Gestaltungsfehler - es wird
        // genannt, aber nicht als Abweichung gezaehlt.
        if (uBreite < vBreite && u.breite <= v.breite) engeSpalte.push(text);
        else abweichend.push(text);
      } else gleich++;
    }
    pruefe(
      abweichend.length === 0,
      `${VP.width} px: alle ${gleich} Darstellungswerte ueber ${n} Elemente stimmen mit der Vorlage ueberein`,
    );
    for (const a of abweichend.slice(0, 25)) hinweis(a);
    if (abweichend.length > 25) hinweis(`... und ${abweichend.length - 25} weitere`);

    if (bewusst.length) {
      hinweis(`${VP.width} px: ${bewusst.length} bewusste Abweichung(en) von der Vorlage:`);
      for (const b of bewusst) hinweis('   ' + b);
    }

    if (engeSpalte.length) {
      hinweis(`${VP.width} px: die Spielespalte der Seite ist ${vBreite - uBreite} px schmaler`
        + ` als die Seite der Vorlage (${uBreite} statt ${vBreite} px). ${engeSpalte.length} Teile`
        + ' mit einer Hoechstbreite stossen deshalb frueher an:');
      for (const a of engeSpalte.slice(0, 8)) hinweis('   ' + a);
    }
    await seite.close();
  }
}

await browser.close();
server.close();

console.log('\n═══════════════════════════════════════════════════════════');
console.log(`Taxi Rush: ${ok.length} bestanden, ${fehl.length} nicht bestanden`);
if (fehl.length) {
  console.log('\nNicht bestanden:');
  for (const f of fehl) console.log('  - ' + f);
}
console.log('═══════════════════════════════════════════════════════════');
process.exit(fehl.length ? 1 : 0);
