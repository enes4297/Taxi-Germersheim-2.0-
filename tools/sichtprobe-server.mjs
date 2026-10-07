// ═══════════════════════════════════════════════════════════════════════════
// Oertlicher Server fuer die Sichtproben
// ═══════════════════════════════════════════════════════════════════════════
//
// Liefert zwei Ordner unter derselben Adresse aus:
//   sichtproben/  -> die Probeseiten selbst
//   public/       -> die Medien, unter genau dem Pfad, den sie spaeter haben
//
// Die Sichtproben liegen bewusst NICHT in src/pages/ und nicht in public/.
// Damit landen sie auch nicht im Build - geprueft von tools/ausgabe-pruefen.mjs.
//
// Aufruf:  node tools/sichtprobe-server.mjs [port]

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { networkInterfaces } from 'node:os';
import { fileURLToPath } from 'node:url';

const WURZEL = fileURLToPath(new URL('..', import.meta.url));
const ORDNER = [join(WURZEL, 'sichtproben'), join(WURZEL, 'public')];
const PORT = Number(process.argv[2] || 5203);

const TYPEN = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};

async function finde(pfad) {
  for (const o of ORDNER) {
    const p = join(o, pfad);
    const s = await stat(p).catch(() => null);
    if (s?.isDirectory()) {
      const i = join(p, 'index.html');
      if (await stat(i).catch(() => null)) return i;
      continue;
    }
    if (s) return p;
  }
  return null;
}

const server = createServer(async (req, res) => {
  let pfad = decodeURIComponent(req.url.split('?')[0]);
  if (pfad === '/') pfad = '/yumak.html';
  const datei = await finde(pfad);
  if (!datei) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('nicht gefunden: ' + pfad);
    return;
  }
  const inhalt = await readFile(datei);
  const typ = TYPEN[extname(datei).toLowerCase()] || 'application/octet-stream';

  // Bereichsanfragen: ohne sie spielt Chrome die Videos nicht ab.
  const bereich = req.headers.range?.match(/bytes=(\d+)-(\d*)/);
  if (bereich) {
    const von = Number(bereich[1]);
    const bis = bereich[2] ? Number(bereich[2]) : inhalt.length - 1;
    res.writeHead(206, {
      'content-type': typ,
      'content-range': `bytes ${von}-${bis}/${inhalt.length}`,
      'accept-ranges': 'bytes',
      'content-length': bis - von + 1,
      'cache-control': 'no-store',
    });
    res.end(inhalt.subarray(von, bis + 1));
    return;
  }
  res.writeHead(200, { 'content-type': typ, 'accept-ranges': 'bytes', 'cache-control': 'no-store' });
  res.end(inhalt);
});

server.listen(PORT, '0.0.0.0', () => {
  const adressen = Object.values(networkInterfaces())
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => i.address);
  console.log(`Sichtprobe laeuft.`);
  console.log(`  Am PC:     http://127.0.0.1:${PORT}/yumak.html`);
  for (const a of adressen) console.log(`  Im WLAN:   http://${a}:${PORT}/yumak.html`);
  console.log(`\nAusgeliefert werden nur sichtproben/ und public/. Beenden mit Strg+C.`);
});
