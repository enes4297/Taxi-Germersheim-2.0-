// ═══════════════════════════════════════════════════════════════════════════
// Kopfangaben der Bestandsseiten im Ausgabeordner ergaenzen
// ═══════════════════════════════════════════════════════════════════════════
//
// Die 18 uebernommenen Bestandsseiten sollen dieselben Grundlagen tragen wie
// die beiden Astro-Seiten: Seitensymbol, eine vollstaendige canonical-Adresse
// und - bei Kontoseiten - ein wirksames `noindex`.
//
// ───────────────────────────────────────────────────────────────────────────
// WARUM IM AUSGABEORDNER UND NICHT IN DEN QUELLDATEIEN
// ───────────────────────────────────────────────────────────────────────────
//
// Die Bestandsdateien werden Byte fuer Byte uebernommen; `ausgabe-pruefen`
// vergleicht sie gegen das Repository. Wer 18 HTML-Dateien von Hand anfasst,
// erzeugt 18 Gelegenheiten fuer einen Tippfehler in Markup, das niemand mehr
// im Kopf hat - und die Seiten sollen in Schritt 018 ohnehin nach Astro
// wandern.
//
// Stattdessen: EIN klar abgegrenzter Block, eingesetzt unmittelbar vor
// </head>, zwischen zwei Markierungen. Der Block ist rueckstandsfrei
// entfernbar. `ausgabe-pruefen` nutzt genau das: Es schneidet den Block wieder
// heraus und vergleicht den Rest byteweise gegen das Repository. Damit bleibt
// die Zusicherung "der Bestand wird unveraendert ausgeliefert" pruefbar - es
// gibt genau eine benannte Ausnahme, und die ist maschinell nachrechenbar.
//
// AENDERT NICHT: admin/, fahrer/, dashboard/. Die bleiben unangetastet; sie
// tragen ihr `noindex` ohnehin schon selbst, alle 64 Seiten.

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { OEFFENTLICHE_SEITEN, NICHT_INS_VERZEICHNIS } from './suchmaschinen-dateien.mjs';

export const ANFANG = '<!-- tg:kopfangaben Anfang - eingesetzt von tools/kopfangaben-bestand.mjs -->';
export const ENDE = '<!-- tg:kopfangaben Ende -->';

/**
 * Seiten, die Astro selbst baut. Sie bringen ihre Kopfangaben im Bauteil
 * `Grundlage.astro` mit und duerfen hier NICHT angefasst werden - sonst
 * stuende alles doppelt im Seitenkopf.
 *
 * Waechst mit jeder uebernommenen Seite. Stand Schritt 020: dreizehn.
 */
export const AUS_ASTRO = [
  'index.html',
  'rewards.html',
  'impressum.html',
  'datenschutz.html',
  'hilfe-kontakt.html',
  '404.html',
  'flotte.html',
  'spezialfahrten.html',
  'spezial-anfrage.html',
  'anmelden.html',
  'registrieren.html',
  'passwort-vergessen.html',
  'passwort-zuruecksetzen.html',
];

/** Die Seiten, die dieser Zusatz anfasst. Ausdrueckliche Liste, kein Glob. */
export const BETROFFENE_SEITEN = [
  ...OEFFENTLICHE_SEITEN.map((s) => s.pfad),
  ...NICHT_INS_VERZEICHNIS.map((s) => s.pfad),
]
  .filter((p) => p && !AUS_ASTRO.includes(p))
  .sort();

const WURZEL = 'https://taxigermersheim.de';

/**
 * Den einzusetzenden Block bauen.
 *
 * Bewusst SPARSAM: Symbole, canonical, robots. Keine Open-Graph-Angaben, wo
 * die Seite schon welche hat, und keine Beschreibung - die Bestandsseiten
 * bringen ihre eigene mit, und eine zweite waere schlechter als keine.
 */
function block(datei, schonCanonical, schonRobots, indexieren) {
  const zeilen = [
    ANFANG,
    '<link rel="icon" href="/favicon.ico" sizes="32x32">',
    '<link rel="icon" href="/favicon-192.png" type="image/png" sizes="192x192">',
    '<link rel="apple-touch-icon" href="/apple-touch-icon.png">',
  ];

  // Vorhandene canonical-Angaben im Bestand sind relativ ("flotte.html").
  // Suchmaschinen erwarten dort eine vollstaendige Adresse. Die relative
  // Angabe bleibt stehen - ein zweites, vollstaendiges Element davor waere
  // widerspruechlich. Deshalb nur ergaenzen, wo noch keines steht.
  if (!schonCanonical) {
    zeilen.push(`<link rel="canonical" href="${WURZEL}/${datei}">`);
  }

  // Nur dort, wo die Seite noch nichts dazu sagt. Eine vorhandene
  // robots-Angabe wird NIE ueberschrieben - dieser Zusatz fuegt an, er
  // schreibt nicht um. Widerspruechliche Faelle brechen den Build ab, siehe
  // unten.
  if (!schonRobots) {
    // Auch die oeffentlichen Seiten bekommen eine ausdrueckliche Angabe.
    // Nachgesehen: hilfe-kontakt.html, spezial-anfrage.html und
    // spezialfahrten.html trugen gar keine - dann entscheidet die
    // Suchmaschine allein. Lieber sagen, was gelten soll.
    zeilen.push(`<meta name="robots" content="${indexieren ? 'index,follow' : 'noindex,follow'}">`);
  }

  zeilen.push(ENDE);
  return zeilen.join('\n  ') + '\n  ';
}

export default function kopfangabenBestand() {
  return {
    name: 'kopfangaben-bestand',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const ziel = fileURLToPath(dir);
        const indexierbar = new Set(OEFFENTLICHE_SEITEN.map((s) => s.pfad));

        let bearbeitet = 0;


        for (const datei of BETROFFENE_SEITEN) {
          const pfad = join(ziel, datei);
          let html;
          try {
            html = await readFile(pfad, 'utf8');
          } catch {
            throw new Error(
              `kopfangaben-bestand: ${datei} liegt nicht im Ausgabeordner. ` +
                `Entweder fehlt sie in der Uebernahmeliste, oder die Liste in ` +
                `suchmaschinen-dateien.mjs nennt eine Seite, die es nicht gibt.`,
            );
          }

          if (html.includes(ANFANG)) continue; // schon bearbeitet

          const schonCanonical = /<link[^>]+rel=["']canonical["']/i.test(html);
          const schonRobots = /<meta[^>]+name=["']robots["']/i.test(html);
          const indexieren = indexierbar.has(datei);

          // Die Seite gehoert NICHT ins Verzeichnis, sagt aber ausdruecklich
          // "index"? Dann ist das ein Fehler in der QUELLDATEI und wird auch
          // dort behoben, nicht hier.
          //
          // Warum nicht hier: Dieser Zusatz darf nur ANFUEGEN, niemals
          // vorhandenes Markup umschreiben. Sonst waere der Bestand im
          // Ausgabeordner nicht mehr das, was im Repository steht, und
          // `ausgabe-pruefen` koennte das nicht mehr nachrechnen. Genau
          // dieser Fall ist am 23.09.2026 aufgetreten: meinkonto.html und
          // kundenkonto.html standen auf "index,follow". Die Pruefung hat
          // die Umschreibung sofort als Abweichung gemeldet - richtig so.
          // Behoben wurden die beiden Quelldateien.
          if (!indexieren && /name=["']robots["'][^>]*content=["']index/i.test(html)) {
            throw new Error(
              `kopfangaben-bestand: ${datei} gehoert nicht ins Verzeichnis, ` +
                `traegt aber "index" im Seitenkopf. Bitte in der QUELLDATEI ` +
                `auf "noindex,follow" aendern - hier wird nichts umgeschrieben.`,
            );
          }

          let neu = html;
          const einsatz = block(datei, schonCanonical, schonRobots, indexieren);
          const stelle = neu.search(/<\/head>/i);
          if (stelle < 0) throw new Error(`kopfangaben-bestand: ${datei} hat kein </head>.`);
          neu = neu.slice(0, stelle) + einsatz + neu.slice(stelle);

          await writeFile(pfad, neu, 'utf8');
          bearbeitet += 1;
        }

        logger.info(`Kopfangaben ergaenzt: ${bearbeitet} Bestandsseiten (Symbol, canonical, robots)`);
      },
    },
  };
}
