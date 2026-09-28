// ═══════════════════════════════════════════════════════════════════════════
// Die drei vom Handy gemeldeten Fehler - damit sie nicht zurueckkommen
// ═══════════════════════════════════════════════════════════════════════════
//
// Gemeldet wurden sie mit zwei Bildschirmaufnahmen von einem echten iPhone.
// Alle drei sind Darstellungsfehler; an Kontodaten, Gewinnregeln und
// Spiellogik wurde nichts geaendert.
//
// ───────────────────────────────────────────────────────────────────────────
// 1. DIE MITGLIEDSKARTE SCHNITT PUNKTE UND STATUS AB
// ───────────────────────────────────────────────────────────────────────────
//
//   Die Karte hatte `aspect-ratio: 1.586 / 1` - das Mass einer Scheckkarte -
//   und `overflow-hidden`. Das war ein Deckel: Passte der Inhalt nicht,
//   wurde er abgeschnitten. Nachgestellt mit auf 140 Prozent vergroesserter
//   Schrift: 248 Pixel Inhalt in 209 Pixel Karte, "Punkte" und "Status"
//   unten weg. Ein langer Name wurde zusaetzlich mit `truncate` gekuerzt.
//
//   Jetzt ist die Kartenform eine Mindesthoehe, und der Name bricht um.
//
// ───────────────────────────────────────────────────────────────────────────
// 2. DIE KOPFZEILE UEBERDECKTE "IHRE SPIELE"
// ───────────────────────────────────────────────────────────────────────────
//
//   spiele.html rechnet mit `scroll-padding-top: 84px` - gemessen fuer die
//   alte, 88 Pixel hohe Kopfzeile. Mit der freigegebenen (81 bzw. 65 Pixel)
//   landete "Gluecksrad" nach dem Sprung 59 Pixel unter dem oberen Rand und
//   damit hinter der Kopfzeile.
//
//   Geprueft wird jedes Sprungziel der Spielewelt, und zwar erst, wenn das
//   weiche Scrollen zur Ruhe gekommen ist - ein Messwert mitten in der
//   Bewegung sagt nichts.
//
// ───────────────────────────────────────────────────────────────────────────
// 3. DAS GLUECKSRAD WAR OVAL
// ───────────────────────────────────────────────────────────────────────────
//
//   Der Goldring war ein Gitterelement mit `width: 100%; aspect-ratio: 1`.
//   Damit haengen zwei Groessen voneinander ab: Die Zeilenhoehe des Gitters
//   richtet sich nach dem Element, die Hoehe des Elements nach dem Gitter.
//   Wie ein Browser das aufloest, ist nicht ueberall gleich.
//
//   OFFEN UND EHRLICH: In Chrome war das Rad bei jeder gemessenen Breite
//   exakt rund - der gemeldete Fehler liess sich hier NICHT nachstellen.
//   Geaendert wurde trotzdem, weil die Ursache benennbar ist: Der Ring liegt
//   jetzt absolut auf der quadratischen Buehne und hat keine eigene
//   Hoehenrechnung mehr. Ob das auf dem iPhone genuegt, kann nur ein Blick
//   auf dem Geraet zeigen.
//
// Aufruf: npm run handy-pruefen

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
const PORT = 5293;
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

// ═══ 1. Die Mitgliedskarte ═════════════════════════════════════════════════
console.log('\n── 1. Die Mitgliedskarte waechst mit ihrem Inhalt ──');
{
  /*
    Die Bestandsskripte der Seite laufen hier nicht durch; geprueft wird die
    DARSTELLUNG. Die vier Felder werden deshalb unmittelbar gesetzt -
    erfundene Anzeigewerte fuer den Messzweck, KEINE echten Kontodaten und
    keine Verbindung nach aussen.
  */
  const FAELLE = [
    ['gewoehnlich', 'Rewards Testkunde', 1],
    ['langer Name', 'Maximiliane Charlotte von Hohenberg-Lichtenstein', 1],
    ['grosse Schrift', 'Rewards Testkunde', 1.4],
  ];
  for (const [fall, name, schrift] of FAELLE) {
    for (const [geraet, vp] of [['Handy', { width: 390, height: 844 }], ['PC', { width: 1440, height: 900 }]]) {
      const ctx = await browser.newContext({ viewport: vp });
      await dicht(ctx);
      if (schrift !== 1) {
        await ctx.addInitScript(`document.addEventListener('DOMContentLoaded',()=>{document.documentElement.style.fontSize=${16 * schrift}+'px';});`);
      }
      const page = await ctx.newPage();
      await page.goto(`${ADRESSE}/rewards.html`, { waitUntil: 'load' });
      await page.waitForTimeout(900);
      const m = await page.evaluate((wer) => {
        const s = (sel, wert) => { const e = document.querySelector(sel); if (e) e.textContent = wert; };
        s('[data-rewards-customer-name]', wer);
        s('[data-rewards-points]', '290');
        s('[data-rewards-status]', 'Bronze');
        s('[data-rewards-level]', 'Bronze');
        const karte = document.querySelector('.tg-mitgliedskarte');
        if (!karte) return { fehlt: true };
        const kb = karte.getBoundingClientRect();
        const drin = (sel) => {
          const e = document.querySelector(sel);
          if (!e) return false;
          const b = e.getBoundingClientRect();
          return b.top >= kb.top - 0.5 && b.bottom <= kb.bottom + 0.5;
        };
        const nm = document.querySelector('[data-rewards-customer-name]');
        return {
          breite: Math.round(kb.width), hoehe: Math.round(kb.height),
          ueberlauf: karte.scrollHeight - karte.clientHeight,
          punkte: drin('[data-rewards-points]'), status: drin('[data-rewards-status]'),
          name: drin('[data-rewards-customer-name]'),
          gekuerzt: nm.scrollWidth > nm.clientWidth + 1,
        };
      }, name);
      pruefe(!m.fehlt && m.ueberlauf <= 0 && m.punkte && m.status && m.name && !m.gekuerzt,
        `${geraet}, ${fall}: Name, Punkte und Status stehen vollstaendig in der Karte (${m.breite}×${m.hoehe}, Ueberlauf ${m.ueberlauf} px)`);
      await ctx.close();
    }
  }

  const html = await readFile(join(AUSGABE, 'rewards.html'), 'utf8');
  pruefe(!/aspect-ratio:\s*1\.586/.test(html), 'kein festes Seitenverhaeltnis mehr auf der Mitgliedskarte');
  pruefe(/min-h-\[210px\]/.test(html) && /lg:min-h-\[322px\]/.test(html),
    'die Kartenform bleibt als Mindesthoehe erhalten (210 / 260 / 322 px)');
  pruefe(!/truncate[^"]*" data-rewards-customer-name/.test(html), 'der Name wird nicht mehr abgeschnitten');
}

// ═══ 2. Sprungziele bleiben unter der Kopfzeile sichtbar ═══════════════════
console.log('\n── 2. Angesprungene Ueberschriften bleiben sichtbar ──');
{
  const ANKER = ['gameworldTitle', 'gamesTitle', 'wheelTitle', 'boxTitle', 'taxiRushTitle', 'historyTitle'];
  for (const [geraet, vp] of [['PC', { width: 1440, height: 900 }], ['Handy', { width: 390, height: 844 }]]) {
    const verdeckt = [];
    for (const id of ANKER) {
      const page = await browser.newPage({ viewport: vp });
      await dicht(page);
      await page.goto(`${ADRESSE}/spiele.html#${id}`, { waitUntil: 'load' });
      /*
        Erst messen, wenn das weiche Scrollen wirklich steht.

        Wichtig ist das "wirklich": Die Seite scrollt weich, und der
        Sprung beginnt erst kurz nach dem Laden. Eine Ruhepruefung, die
        sofort losmisst, sieht die Seite noch ganz oben stehen, haelt
        das fuer Ruhe und meldet eine verdeckte Ueberschrift, wo gar
        keine ist - genau das ist hier passiert (gemessen 55 statt 105
        Pixel, in vier Wiederholungen nie reproduzierbar).

        Deshalb wird gewartet, bis die Seite sich ueberhaupt bewegt hat,
        UND danach eine Weile ruhig bleibt.
      */
      const anfang = await page.evaluate(() => Math.round(scrollY));
      let bewegt = false;
      let letzte = -1;
      let ruhig = 0;
      for (let i = 0; i < 60; i += 1) {
        const jetzt = await page.evaluate(() => Math.round(scrollY));
        if (jetzt !== anfang) bewegt = true;
        ruhig = jetzt === letzte ? ruhig + 1 : 0;
        if (bewegt && ruhig >= 5) break;
        letzte = jetzt;
        await page.waitForTimeout(150);
      }
      await page.waitForTimeout(500);
      const m = await page.evaluate((kennung) => {
        const e = document.getElementById(kennung);
        const k = document.querySelector('header[data-kopf]');
        if (!e || !k) return { fehlt: true };
        const b = e.getBoundingClientRect();
        const kb = k.getBoundingClientRect();
        // Nicht nur rechnen: den Punkt oben links im Text wirklich abfragen.
        const x = Math.round(b.left + Math.min(20, b.width / 2));
        const y = Math.round(b.top + 4);
        const oben = (y >= 0 && y < innerHeight) ? document.elementFromPoint(x, y) : null;
        return {
          oben: Math.round(b.top), kopfUnten: Math.round(kb.bottom),
          imKopf: Boolean(oben && k.contains(oben)),
        };
      }, id);
      if (m.fehlt || m.oben < m.kopfUnten || m.imKopf) {
        verdeckt.push(`${id} (oben ${m.oben}, Kopf bis ${m.kopfUnten})`);
      }
      await page.close();
    }
    pruefe(verdeckt.length === 0,
      `${geraet}: alle ${ANKER.length} Sprungziele der Spielewelt stehen frei unter der Kopfzeile`);
    for (const v of verdeckt) hinweis(v);
  }
}

// ═══ 3. Das Rad ist exakt rund ═════════════════════════════════════════════
console.log('\n── 3. Das Gluecksrad ist rund, nicht oval ──');
{
  const BREITEN = [320, 360, 375, 390, 414, 430, 768, 1024, 1440];
  const schief = [];
  for (const w of BREITEN) {
    const page = await browser.newPage({ viewport: { width: w, height: 844 } });
    await dicht(page);
    await page.goto(`${ADRESSE}/spiele.html`, { waitUntil: 'load' });
    await page.waitForTimeout(1100);
    const m = await page.evaluate(() => {
      const z = (sel) => {
        const e = document.querySelector(sel);
        if (!e) return null;
        const b = e.getBoundingClientRect();
        return { b: +b.width.toFixed(2), h: +b.height.toFixed(2) };
      };
      const svg = document.querySelector('.gw-wheel-svg');
      return {
        buehne: z('.gw-wheel-shell'), ring: z('.gw-wheel-rim'),
        scheibe: z('.gw-wheel-svg'), nabe: z('.gw-wheel-hub'),
        ansicht: svg ? svg.getAttribute('viewBox') : null,
        erhalt: svg ? (svg.getAttribute('preserveAspectRatio') || 'xMidYMid meet (Vorgabe)') : null,
      };
    });
    for (const [was, x] of [['Buehne', m.buehne], ['Goldring', m.ring], ['Scheibe', m.scheibe], ['Nabe', m.nabe]]) {
      if (!x) { schief.push(`${w} px: ${was} nicht gefunden`); continue; }
      if (Math.abs(x.b - x.h) > 0.6) schief.push(`${w} px: ${was} ${x.b}×${x.h}`);
    }
    if (w === 390) {
      hinweis(`Bei 390 px: Goldring ${m.ring.b}×${m.ring.h}, Scheibe ${m.scheibe.b}×${m.scheibe.h}, Nabe ${m.nabe.b}×${m.nabe.h}`);
      hinweis(`Die Scheibe ist ein SVG mit viewBox "${m.ansicht}" und preserveAspectRatio "${m.erhalt}" - sie kann nicht gestreckt werden`);
    }
    await page.close();
  }
  pruefe(schief.length === 0,
    `Bei allen ${BREITEN.length} gemessenen Breiten sind Buehne, Goldring, Scheibe und Nabe exakt quadratisch`);
  for (const s of schief) hinweis(s);

  const css = await readFile(join(AUSGABE, 'spiele.css'), 'utf8');
  const regel = (css.match(/\.gw-wheel-rim \{[^}]*\}/) || [''])[0];
  pruefe(/position: absolute/.test(regel) && !/aspect-ratio/.test(regel),
    'der Goldring uebernimmt den Kasten der Buehne, statt seine Hoehe selbst zu rechnen');
}

await browser.close();
server.close();

console.log('\n═══════════════════════════════════════════════════════════');
console.log(`Handy-Fehler: ${ok.length} bestanden, ${fehl.length} nicht bestanden`);
if (fehl.length) {
  console.log('\nNicht bestanden:');
  for (const f of fehl) console.log('  - ' + f);
}
console.log('\nDie Anzeigewerte der Mitgliedskarte sind fuer die Messung gesetzt');
console.log('worden - erfundene Zahlen, KEINE echten Kontodaten. Der Netzverkehr');
console.log('nach aussen ist abgeschnitten.');
console.log('═══════════════════════════════════════════════════════════');
process.exit(fehl.length ? 1 : 0);
