/* ============================================================
   Vorschauweg fuer die Designprobe des Betriebsportals
   ============================================================
   Eigener Weg, getrennt von der Produktionsausgabe. Die Probe liegt
   NICHT in dist-oeffentlich und wird von tools/bestand-uebernehmen.mjs
   nicht uebernommen - diese Liste ist ausdruecklich und kennt den
   Ordner nicht.

   Aufruf:  npm run probe-portal
   Der Server bindet an 0.0.0.0, damit PC und Handy im selben WLAN
   darauf zugreifen koennen. Rein lokal, keine Aussenanbindung.
   ============================================================ */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname, normalize } from "node:path";
import { networkInterfaces } from "node:os";

const WURZEL = process.cwd();
const PROBE = join(WURZEL, "probe-betriebsportal");
const PORT = Number(process.env.PROBE_PORT || 5300);

const TYPEN = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon"
};

/* Was ausgeliefert werden darf - ausdrueckliche Liste, kein Durchreichen
   des ganzen Repositorys. */
async function dateiFuer(pfad) {
  const sauber = normalize(pfad).replace(/^(\.\.[/\\])+/, "");
  if (sauber === "/" || sauber === "\\") return join(PROBE, "index.html");
  if (sauber.startsWith("/schriften/") || sauber.startsWith("\\schriften\\")) {
    return join(WURZEL, "public", sauber);
  }
  if (sauber === "/logo.png" || sauber === "\\logo.png") return join(WURZEL, "logo.png");
  return join(PROBE, sauber);
}

const server = createServer(async (req, res) => {
  const pfad = decodeURIComponent(req.url.split("?")[0]);
  try {
    const datei = await dateiFuer(pfad);
    const inhalt = await readFile(datei);
    res.writeHead(200, {
      "Content-Type": TYPEN[extname(datei).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow"
    });
    res.end(inhalt);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Nicht gefunden");
  }
});

server.listen(PORT, "0.0.0.0", () => {
  const adressen = Object.values(networkInterfaces())
    .flat()
    .filter((n) => n && n.family === "IPv4" && !n.internal)
    .map((n) => n.address);

  console.log("");
  console.log("  Designprobe Betriebsportal - keine echten Daten");
  console.log("  " + "-".repeat(48));
  console.log(`  Am Rechner:  http://localhost:${PORT}/`);
  for (const a of adressen) console.log(`  Im WLAN:     http://${a}:${PORT}/`);
  console.log("");
  console.log("  Keine Verbindung zu Supabase, kein Upload, kein Versand.");
  console.log("  Beenden mit Strg+C.");
  console.log("");
});
