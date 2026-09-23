// ═══════════════════════════════════════════════════════════════════════════
// Die Grundlagen aus Schritt 017 pruefen
// ═══════════════════════════════════════════════════════════════════════════
//
// Geprueft wird am GEBAUTEN Ordner, nicht am Quelltext:
//   - Suchmaschinen und Teilen: robots.txt, sitemap.xml, Symbole, canonical,
//     Vorschaukarte, strukturierte Daten
//   - dass Konto- und Fehlerseiten wirklich auf noindex stehen
//   - dass keine oeffentliche Seite mehr eine Bibliothek von einem fremden
//     CDN holt und die mitgelieferte bytegleich mit node_modules ist
//   - dass die drei Demo-Dateien draussen sind und niemand mehr auf sie zeigt
//   - dass kein Kundentext mehr duzt
//   - dass die beiden Astro-Seiten Sprungmarke und Hauptinhaltsbereich haben
//
// Das ist eine Pruefung von Dateien. Ob die Anmeldung gegen die produktive
// Instanz funktioniert, sagt dieses Skript NICHT - dafuer braucht es eine
// echte Anmeldung, und die hat hier niemand vorgenommen.
//
// Aufruf: npm run grundlagen-pruefen

import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { OEFFENTLICHE_SEITEN, NICHT_INS_VERZEICHNIS } from './suchmaschinen-dateien.mjs';

const WURZEL = fileURLToPath(new URL('..', import.meta.url));
const AUSGABE = join(WURZEL, 'dist-oeffentlich');

const ok = [];
const fehl = [];
const pruefe = (bedingung, text) => {
  (bedingung ? ok : fehl).push(text);
  console.log((bedingung ? 'OK   ' : 'FEHL ') + text);
};

const lies = (d) => readFile(join(AUSGABE, d), 'utf8');

const wurzelDateien = (await readdir(AUSGABE, { withFileTypes: true }))
  .filter((e) => e.isFile())
  .map((e) => e.name);
const htmlSeiten = wurzelDateien.filter((d) => d.endsWith('.html'));
const jsDateien = wurzelDateien.filter((d) => d.endsWith('.js'));

// ── 1. Dateien fuer Suchmaschinen und Teilen ───────────────────────────────
console.log('\n── Suchmaschinen und Teilen ──');

for (const d of ['robots.txt', 'sitemap.xml', 'favicon.ico', 'favicon-32.png',
                 'favicon-192.png', 'favicon-512.png', 'apple-touch-icon.png',
                 'teilen-vorschau.jpg']) {
  pruefe(existsSync(join(AUSGABE, d)), `${d} liegt im Ausgabeordner`);
}

const robots = await lies('robots.txt');
pruefe(
  !/^\s*Disallow:\s*\S/m.test(robots),
  'robots.txt sperrt nichts - der Ausschluss laeuft ueber noindex, nicht ueber eine oeffentlich lesbare Pfadliste',
);
pruefe(
  robots.includes('Sitemap: https://taxigermersheim.de/sitemap.xml'),
  'robots.txt nennt die sitemap.xml mit vollstaendiger Adresse',
);

const sitemap = await lies('sitemap.xml');
const inSitemap = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
pruefe(
  inSitemap.length === OEFFENTLICHE_SEITEN.length,
  `sitemap.xml fuehrt genau die ${OEFFENTLICHE_SEITEN.length} oeffentlichen Seiten (${inSitemap.length})`,
);
pruefe(
  inSitemap.every((a) => a.startsWith('https://taxigermersheim.de/')),
  'jede Adresse in der sitemap.xml ist vollstaendig',
);
for (const { pfad } of OEFFENTLICHE_SEITEN) {
  const datei = pfad || 'index.html';
  pruefe(existsSync(join(AUSGABE, datei)), `in der sitemap.xml genannte Seite ${datei} liegt auch im Ausgabeordner`);
}
const versehentlich = NICHT_INS_VERZEICHNIS.filter(({ pfad }) => inSitemap.some((a) => a.endsWith('/' + pfad)));
pruefe(
  versehentlich.length === 0,
  `keine Konto- oder Fehlerseite steht in der sitemap.xml${versehentlich.length ? ': ' + versehentlich.map((v) => v.pfad).join(', ') : ''}`,
);

// ── 2. Jeder Seitenkopf vollstaendig ───────────────────────────────────────
console.log('\n── Seitenkoepfe ──');

const ohneSymbol = [];
const ohneRobots = [];
const ohneCanonical = [];
for (const d of htmlSeiten) {
  const t = await lies(d);
  if (!/rel=["']icon["']/.test(t)) ohneSymbol.push(d);
  if (!/name=["']robots["']/.test(t)) ohneRobots.push(d);
  if (!/rel=["']canonical["']/.test(t)) ohneCanonical.push(d);
}
pruefe(ohneSymbol.length === 0, `alle ${htmlSeiten.length} oeffentlichen Seiten tragen ein Seitensymbol${ohneSymbol.length ? ': ' + ohneSymbol.join(', ') : ''}`);
pruefe(ohneRobots.length === 0, `alle sagen, ob sie ins Verzeichnis gehoeren${ohneRobots.length ? ': ' + ohneRobots.join(', ') : ''}`);
pruefe(ohneCanonical.length === 0, `alle nennen ihre eigene Adresse${ohneCanonical.length ? ': ' + ohneCanonical.join(', ') : ''}`);

const falschIndexiert = [];
for (const { pfad } of NICHT_INS_VERZEICHNIS) {
  if (!existsSync(join(AUSGABE, pfad))) continue;
  const t = await lies(pfad);
  if (!/name=["']robots["'][^>]*content=["']noindex/i.test(t)) falschIndexiert.push(pfad);
}
pruefe(
  falschIndexiert.length === 0,
  `Konto- und Fehlerseiten stehen auf noindex${falschIndexiert.length ? ': ' + falschIndexiert.join(', ') : ''}`,
);

for (const d of ['index.html', 'rewards.html']) {
  const t = await lies(d);
  pruefe(/property=["']og:image["']/.test(t) && /property=["']og:title["']/.test(t), `${d} traegt eine Vorschaukarte fuers Teilen`);
  pruefe(/rel=["']canonical["'][^>]*https:\/\/taxigermersheim\.de/.test(t), `${d} nennt eine vollstaendige canonical-Adresse`);
}

const start = await lies('index.html');
pruefe(/application\/ld\+json/.test(start), 'die Startseite traegt strukturierte Unternehmensdaten');
pruefe(
  !/aggregateRating/.test(start),
  'die strukturierten Daten zeichnen KEINE Bewertung aus - die Zahl stammt von einer fremden Plattform und ist nicht nachgeprueft',
);
const ld = start.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
if (ld) {
  let daten = null;
  try { daten = JSON.parse(ld[1]); } catch { /* faellt unten durch */ }
  pruefe(daten !== null, 'die strukturierten Daten sind gueltiges JSON');
  if (daten) {
    pruefe(daten.address?.streetAddress === 'Friedrich-Ebert-Straße 8', 'die ausgezeichnete Anschrift stimmt mit dem Impressum ueberein');
    pruefe(daten.telephone === '+4972743567', 'die ausgezeichnete Rufnummer stimmt');
    pruefe(!('priceRange' in daten) && !('vatID' in daten) && !('geo' in daten), 'keine erfundenen Angaben: kein Preisrahmen, keine USt-IdNr., keine geratene Koordinate');
    pruefe(daten.hasOfferCatalog?.itemListElement?.length === 7, 'genau die sieben Leistungen sind ausgezeichnet');
  }
}

// ── 3. Keine fremde Bibliothek mehr ────────────────────────────────────────
console.log('\n── Fremde Bibliotheken ──');

const mitCdn = [];
for (const d of [...htmlSeiten, ...jsDateien]) {
  const t = await lies(d);
  if (/cdn\.jsdelivr\.net|unpkg\.com|esm\.sh/.test(t)) mitCdn.push(d);
}
pruefe(mitCdn.length === 0, `keine oeffentliche Seite holt eine Bibliothek von einem fremden CDN${mitCdn.length ? ': ' + mitCdn.join(', ') : ''}`);

const bibliothekPfad = join(AUSGABE, 'vendor', 'supabase-js-2.117.0.js');
pruefe(existsSync(bibliothekPfad), 'die Supabase-Bibliothek wird selbst mitgeliefert, mit fester Version');
if (existsSync(bibliothekPfad)) {
  const ausPaket = join(WURZEL, 'node_modules', '@supabase', 'supabase-js', 'dist', 'umd', 'supabase.js');
  if (existsSync(ausPaket)) {
    const a = createHash('sha256').update(await readFile(bibliothekPfad)).digest('hex');
    const b = createHash('sha256').update(await readFile(ausPaket)).digest('hex');
    pruefe(a === b, 'die mitgelieferte Bibliothek ist bytegleich mit der aus node_modules');
  } else {
    console.log('HINW  node_modules fehlt - Abgleich der Bibliothek uebersprungen');
  }
}
pruefe(!existsSync(join(AUSGABE, 'vendor', 'HERKUNFT.md')), 'die interne Herkunftsnotiz ist nicht ausgeliefert');

const auth = await lies('customer-auth.js');
pruefe(auth.includes('vendor/supabase-js-2.117.0.js'), 'customer-auth.js laedt die mitgelieferte Bibliothek');
pruefe(auth.includes('signInWithPassword') && auth.includes('signUp') && auth.includes('signOut'),
  'die Anmeldefunktionen sind unveraendert vorhanden');

// ── 4. Demo-Dateien sind draussen ──────────────────────────────────────────
console.log('\n── Demo-Dateien ──');

for (const d of ['konto-einrichtung.html', 'customer-auth-demo.js', 'customer-journey-demo.js']) {
  pruefe(!existsSync(join(AUSGABE, d)), `${d} ist nicht ausgeliefert`);
}
const mitDemoVerweis = [];
for (const d of [...htmlSeiten, ...jsDateien]) {
  const t = await lies(d);
  if (/konto-einrichtung\.html|customer-auth-demo\.js|customer-journey-demo\.js/.test(t)) mitDemoVerweis.push(d);
}
pruefe(mitDemoVerweis.length === 0, `keine ausgelieferte Datei verweist auf eine entfernte Demo-Datei${mitDemoVerweis.length ? ': ' + mitDemoVerweis.join(', ') : ''}`);
pruefe(existsSync(join(AUSGABE, 'auth-demo.css')), 'auth-demo.css ist weiterhin dabei - trotz des Namens eine echte Stilvorlage von elf Kontoseiten');

// ── 5. Anrede ──────────────────────────────────────────────────────────────
console.log('\n── Anrede ──');

// "dir" steht bewusst NICHT in der Liste: es ist in script.js ein
// Variablenname (const dir = ...), und die zwei echten Kundentexte mit
// "dir" sind in Schritt 017 umgestellt worden. Ein Muster, das beides
// nicht auseinanderhalten kann, meldet nur Fehlalarme.
const DU = /(^|[^a-zA-ZäöüÄÖÜß])(dein|deine|deinem|deinen|deiner|deines|dich)([^a-zA-ZäöüÄÖÜß]|$)/i;
const mitDu = [];
for (const d of [...htmlSeiten, ...jsDateien]) {
  // Sprungmarken wie #deine-spiele sind Adressen, keine Kundentexte.
  const t = (await lies(d)).replace(/#?deine-spiele/g, '').replace(/\bdir\b(?=\s*=)/g, '');
  if (DU.test(t)) mitDu.push(d);
}
pruefe(mitDu.length === 0, `kein Kundentext duzt noch${mitDu.length ? ': ' + mitDu.join(', ') : ''}`);

// ── 6. Bedienung mit der Tastatur ──────────────────────────────────────────
console.log('\n── Tastatur ──');

for (const d of ['index.html', 'rewards.html']) {
  const t = await lies(d);
  pruefe(t.includes('Zum Inhalt springen'), `${d} hat eine Sprungmarke zum Inhalt`);
  pruefe(/<main[\s>]/.test(t) && /id=["']inhalt["']/.test(t), `${d} hat einen ausgezeichneten Hauptinhaltsbereich`);
}
const spezial = await lies('special-services.js');
pruefe(/input\.tabIndex = -1/.test(spezial) && /select\.tabIndex = -1/.test(spezial),
  'die unsichtbaren Stellvertreterfelder der Spezialanfrage sind aus der Tabulatorfolge genommen');

// ── 7. Konto-Einstieg ──────────────────────────────────────────────────────
console.log('\n── Konto-Einstieg ──');

for (const d of ['index.html', 'rewards.html']) {
  const t = await lies(d);
  pruefe(/data-konto-verweis/.test(t), `${d} bietet einen Konto-Einstieg`);
  pruefe(!/>\s*Mein Konto\s*</.test(t.split('data-konto-text')[1]?.slice(0, 200) ?? ''),
    `${d} zeigt im Auslieferstand "Anmelden", nicht "Mein Konto" - umgestellt wird erst nach festgestellter Sitzung`);
}

// ── 8. Alte Einstiege ──────────────────────────────────────────────────────
console.log('\n── Alte ?page=-Einstiege ──');

const genutzt = new Set();
for (const d of htmlSeiten) {
  for (const m of (await lies(d)).matchAll(/index\.html\?page=([a-z-]+)/g)) genutzt.add(m[1]);
}
const astroSkripte = (await readdir(join(AUSGABE, '_astro'))).filter((d) => d.endsWith('.js'));
let behandelt = '';
for (const d of astroSkripte) behandelt += await readFile(join(AUSGABE, '_astro', d), 'utf8');
for (const wert of [...genutzt].sort()) {
  // Der Verkleinerer schreibt einfache Schluessel ohne Anfuehrungszeichen
  // (why:"#region"), zusammengesetzte mit ("help-public":"#kontakt").
  const erkannt =
    new RegExp(`[{,]\s*\\"?${wert}\\"?\s*:`).test(behandelt) ||
    new RegExp(`[{,]\s*'${wert}'\s*:`).test(behandelt) ||
    wert === 'booking';
  pruefe(erkannt,
    `?page=${wert} wird von der Startseite behandelt`);
}

console.log(`\nbestanden: ${ok.length}   fehlgeschlagen: ${fehl.length}`);
if (fehl.length) {
  console.log('\n' + fehl.join('\n'));
  process.exitCode = 1;
}
