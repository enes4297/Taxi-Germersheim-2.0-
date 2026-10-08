// Kleiner Server nur fuer die Designproben in sichtproben/.
//
// Sie liegen ausserhalb der Produktionsausgabe und werden deshalb vom
// Vorschauserver (npm run preview) NICHT ausgeliefert - das ist Absicht.
// Zum Ansehen braucht es diesen eigenen Server.
//
// Aufruf: npm run probe
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const WURZEL = fileURLToPath(new URL('..', import.meta.url));
const PORT = 5210;

const TYP = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.woff2': 'font/woff2', '.json': 'application/json',
  '.ico': 'image/x-icon', '.txt': 'text/plain',
};

createServer(async (req, res) => {
  let pfad = decodeURIComponent(req.url.split('?')[0]);
  if (pfad === '/') pfad = '/sichtproben/';
  if (pfad.endsWith('/')) pfad += 'index.html';
  try {
    const daten = await readFile(join(WURZEL, pfad));
    res.writeHead(200, { 'Content-Type': TYP[extname(pfad).toLowerCase()] || 'application/octet-stream' });
    res.end(daten);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>Nicht gefunden</h1><p>Die Designproben liegen unter <a href="/sichtproben/gluecksrad.html">/sichtproben/gluecksrad.html</a>.</p>');
  }
}).listen(PORT, '0.0.0.0', () => {
  console.log(`Designproben: http://127.0.0.1:${PORT}/sichtproben/gluecksrad.html`);
  console.log(`Im WLAN:      http://192.168.178.141:${PORT}/sichtproben/gluecksrad.html`);
});
