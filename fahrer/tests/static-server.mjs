// static-server.mjs
//
// Minimaler statischer Webserver fuer die Browsertests des Mitarbeiterportals.
// Nur Node-Bordmittel, keine Abhaengigkeiten. Bindet ausschliesslich an
// 127.0.0.1 und legt keinen Windows-Dienst an.
//
// Start:  node fahrer/tests/static-server.mjs [port]

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = normalize(join(here, "..", ".."));
const port = Number(process.argv[2] || 8787);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webmanifest": "application/manifest+json"
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    let rel = decodeURIComponent(url.pathname);
    if (rel.endsWith("/")) rel += "index.html";

    const target = normalize(join(repoRoot, rel));
    // Kein Ausbrechen aus dem Projektordner.
    if (!target.startsWith(repoRoot + sep) && target !== repoRoot) {
      res.writeHead(403).end("Forbidden");
      return;
    }

    const info = await stat(target);
    if (!info.isFile()) {
      res.writeHead(404).end("Not found");
      return;
    }

    const body = await readFile(target);
    res.writeHead(200, {
      "Content-Type": TYPES[extname(target).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    res.end(body);
  } catch {
    res.writeHead(404).end("Not found");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`static-server: http://127.0.0.1:${port}/ -> ${repoRoot}`);
});
