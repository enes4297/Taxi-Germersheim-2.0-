// ═══════════════════════════════════════════════════════════════════════════
// robots.txt und sitemap.xml erzeugen
// ═══════════════════════════════════════════════════════════════════════════
//
// Laeuft als Astro-Zusatz nach dem Build und schreibt beide Dateien in den
// Ausgabeordner. Sie werden nicht von Hand gepflegt, damit die Liste nicht
// auseinanderlaeuft.
//
// ───────────────────────────────────────────────────────────────────────────
// WARUM robots.txt NICHTS SPERRT
// ───────────────────────────────────────────────────────────────────────────
//
// robots.txt ist KEIN Zugriffsschutz. Sie ist eine Bitte an wohlgesonnene
// Suchmaschinen und fuer jeden lesbar - wer dort Pfade auflistet, veroeffentlicht
// genau die Liste, die er verstecken wollte.
//
// Schlimmer noch: `Disallow` und `noindex` arbeiten gegeneinander. Wer eine
// Seite sperrt, verhindert, dass die Suchmaschine sie abruft - und damit auch,
// dass sie das `noindex` darin ueberhaupt zu sehen bekommt. Eine bereits
// aufgenommene Adresse bliebe dann im Verzeichnis stehen.
//
// Deshalb:
//   - robots.txt erlaubt das Abrufen und nennt nur die sitemap.xml.
//   - Was nicht ins Verzeichnis gehoert, traegt `noindex` IM Seitenkopf.
//     Das ist der Weg, der tatsaechlich wirkt.
//   - Der echte Zugriffsschutz sitzt in der Anmeldung und in den
//     Datenbankregeln, nicht in einer Textdatei.
//
// Aufruf: laeuft mit `npm run build`.

import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Oeffentliche Seiten, die ins Verzeichnis der Suchmaschinen gehoeren.
 *
 * AUSDRUECKLICHE LISTE, kein Glob ueber den Ausgabeordner. Ein Glob wuerde
 * beim naechsten Zuwachs stillschweigend Kontoseiten mit aufnehmen.
 *
 * `prioritaet` ist eine Rangfolge unter unseren eigenen Seiten, keine Aussage
 * ueber Bedeutung im Netz. `aenderung` sagt, wie oft sich der Inhalt
 * erfahrungsgemaess aendert.
 */
export const OEFFENTLICHE_SEITEN = [
  { pfad: '', prioritaet: '1.0', aenderung: 'weekly', zweck: 'Startseite' },
  { pfad: 'rewards.html', prioritaet: '0.7', aenderung: 'monthly', zweck: 'Rewards-Programm' },
  { pfad: 'spiele.html', prioritaet: '0.6', aenderung: 'monthly', zweck: 'Spielewelt' },
  { pfad: 'flotte.html', prioritaet: '0.7', aenderung: 'monthly', zweck: 'Fahrzeugflotte' },
  { pfad: 'spezialfahrten.html', prioritaet: '0.7', aenderung: 'monthly', zweck: 'Spezialfahrten' },
  { pfad: 'spezial-anfrage.html', prioritaet: '0.5', aenderung: 'monthly', zweck: 'Spezialanfrage vorbereiten' },
  { pfad: 'hilfe-kontakt.html', prioritaet: '0.8', aenderung: 'monthly', zweck: 'Hilfe und Kontakt' },
  { pfad: 'impressum.html', prioritaet: '0.3', aenderung: 'yearly', zweck: 'Impressum' },
  { pfad: 'datenschutz.html', prioritaet: '0.3', aenderung: 'yearly', zweck: 'Datenschutz' },
];

/**
 * Seiten, die ausdruecklich NICHT ins Verzeichnis gehoeren.
 *
 * Sie bekommen `noindex` im Seitenkopf - siehe tools/kopfangaben-bestand.mjs.
 * Hier stehen sie nur, damit die Begruendung an einer Stelle nachlesbar ist
 * und ein Prueflauf beide Listen gegeneinander halten kann.
 */
export const NICHT_INS_VERZEICHNIS = [
  { pfad: 'anmelden.html', grund: 'Kontozugang' },
  { pfad: 'registrieren.html', grund: 'Kontozugang' },
  { pfad: 'passwort-vergessen.html', grund: 'Kontozugang' },
  { pfad: 'passwort-zuruecksetzen.html', grund: 'Kontozugang, nur ueber Mail-Link sinnvoll' },
  { pfad: 'meinkonto.html', grund: 'persoenlicher Bereich' },
  { pfad: 'kundenkonto.html', grund: 'Weiterleitung auf meinkonto.html' },
  { pfad: 'kunden-einstellungen.html', grund: 'persoenlicher Bereich' },
  { pfad: 'meine-fahrten.html', grund: 'persoenlicher Bereich' },
  { pfad: 'wallet-gutscheine.html', grund: 'persoenlicher Bereich' },
  { pfad: 'live-fahrt.html', grund: 'persoenlicher Bereich' },
  { pfad: '404.html', grund: 'Fehlerseite' },
];

function robotsTxt(wurzel) {
  return [
    '# robots.txt der Taxi Germersheim GmbH',
    '#',
    '# Diese Datei sperrt bewusst nichts.',
    '#',
    '# Sie ist kein Zugriffsschutz, sondern oeffentlich lesbar - eine Liste',
    '# gesperrter Pfade waere nur ein Wegweiser dorthin. Und eine gesperrte',
    '# Seite wird gar nicht erst abgerufen, also auch das "noindex" darin nicht',
    '# gelesen; eine bereits aufgenommene Adresse bliebe im Verzeichnis stehen.',
    '#',
    '# Was nicht ins Verzeichnis gehoert - Kontoseiten, Zentrale,',
    '# Mitarbeiterportal -, traegt "noindex" im Seitenkopf. Der tatsaechliche',
    '# Zugriffsschutz liegt in der Anmeldung und in den Datenbankregeln.',
    '',
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${wurzel}/sitemap.xml`,
    '',
  ].join('\n');
}

function sitemapXml(wurzel, stand) {
  const eintraege = OEFFENTLICHE_SEITEN.map(({ pfad, prioritaet, aenderung }) => {
    const adresse = `${wurzel}/${pfad}`;
    return [
      '  <url>',
      `    <loc>${adresse}</loc>`,
      `    <lastmod>${stand}</lastmod>`,
      `    <changefreq>${aenderung}</changefreq>`,
      `    <priority>${prioritaet}</priority>`,
      '  </url>',
    ].join('\n');
  }).join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!--',
    '  Ausschliesslich oeffentliche Seiten, die ins Verzeichnis gehoeren.',
    '  Kontoseiten, Zentrale, Mitarbeiterportal und die Fehlerseite stehen',
    '  hier bewusst NICHT - sie tragen "noindex" im Seitenkopf.',
    '  Erzeugt von tools/suchmaschinen-dateien.mjs, nicht von Hand pflegen.',
    '-->',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    eintraege,
    '</urlset>',
    '',
  ].join('\n');
}

export default function suchmaschinenDateien() {
  return {
    name: 'suchmaschinen-dateien',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const ziel = fileURLToPath(dir);
        const wurzel = 'https://taxigermersheim.de';
        const stand = new Date().toISOString().slice(0, 10);

        await writeFile(join(ziel, 'robots.txt'), robotsTxt(wurzel), 'utf8');
        await writeFile(join(ziel, 'sitemap.xml'), sitemapXml(wurzel, stand), 'utf8');

        logger.info(`robots.txt geschrieben - sperrt nichts, nennt die sitemap.xml`);
        logger.info(`sitemap.xml geschrieben - ${OEFFENTLICHE_SEITEN.length} oeffentliche Seiten, ${NICHT_INS_VERZEICHNIS.length} bewusst ausgelassen`);
      },
    },
  };
}
