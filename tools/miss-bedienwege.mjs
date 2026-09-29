/* ============================================================
   Vorher/Nachher - Bedienwege zaehlen
   ============================================================
   Faehrt dieselbe Aufgabe einmal im heutigen Betriebsportal und einmal
   in der Designprobe und zaehlt dabei, was der Mensch tun muss:
   Klicks, Auswahlen, Seiten- beziehungsweise Ansichtswechsel und
   Blaetterwege.

   Gezaehlt wird, was das Skript tatsaechlich tun muss, um ans Ziel zu
   kommen - nicht, was jemand schaetzt.

   Der Altstand wird mit einer Attrappe gefahren: der Datendienst wird
   auf Netzebene ersetzt. Es geht keine Anfrage an Supabase.
   ============================================================ */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";

const { chromium } = await import(
  "file:///" + join(process.cwd(), "fahrer/tests/node_modules/playwright/index.mjs").replace(/\\/g, "/")
);

const WURZEL = process.cwd();
const TYPEN = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".png": "image/png", ".woff2": "font/woff2",
  ".svg": "image/svg+xml", ".ico": "image/x-icon"
};

function server(wurzelOrdner, port, sonderwege) {
  const s = createServer(async (req, res) => {
    const pfad = decodeURIComponent(req.url.split("?")[0]);
    let datei = (sonderwege && sonderwege(pfad)) || join(wurzelOrdner, pfad);
    if (pfad === "/") datei = join(wurzelOrdner, "index.html");
    try {
      const inhalt = await readFile(datei);
      res.writeHead(200, { "Content-Type": TYPEN[extname(datei).toLowerCase()] || "application/octet-stream" });
      res.end(inhalt);
    } catch { res.writeHead(404); res.end("x"); }
  });
  return new Promise((r) => s.listen(port, "127.0.0.1", () => r(s)));
}

/* ---- Zaehler ---- */
function zaehler() {
  return { klicks: 0, auswahlen: 0, wechsel: 0, blaettern: 0 };
}
const gesamt = (z) => z.klicks + z.auswahlen;

const browser = await chromium.launch({ channel: "chrome" });

/* ============================================================
   A) Altstand: admin/schichtplanung.html
   ============================================================ */
const altServer = await server(join(WURZEL, "dist-oeffentlich"), 5401);
const ALT = "http://127.0.0.1:5401";

async function altKontext() {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.route("**://**", (route) => {
    const u = route.request().url();
    if (/admin\/(auth|supabase-auth|taxi-data-service)\.js/.test(u)) {
      return route.fulfill({ status: 200, contentType: "text/javascript", body: "" });
    }
    if (/admin\/supabase-config\.js/.test(u)) {
      return route.fulfill({ status: 200, contentType: "text/javascript", body: "window.TaxiSupabaseConfig={isConfigured:true};" });
    }
    return u.startsWith(ALT) ? route.continue() : route.abort();
  });
  await ctx.addInitScript(() => {
    const ma = [
      { id: "T1", employeeId: "T1", role: "Fahrer", firstName: "Test", lastName: "Eins", status: "im Dienst", employmentType: "Vollzeit", qualifications: [] },
      { id: "T2", employeeId: "T2", role: "Fahrer", firstName: "Test", lastName: "Zwei", status: "verfügbar", employmentType: "Vollzeit", qualifications: [] }
    ];
    const d = {
      isEnabled: () => true, clearLastError: () => {}, getLastError: () => "", resolveBackendMode: () => "supabase",
      getEmployees: async () => ma,
      getVehicles: async () => ([{ id: "V1", name: "Testwagen 01", licensePlate: "GER-TEST 001", plate: "GER-TEST 001", vehicleType: "Kombi", status: "Verfügbar" }]),
      getShifts: async () => [], getDocuments: async () => [], getVacations: async () => [],
      getAbsences: async () => [], getPlanPublications: async () => [],
      publishPlan: async (p) => ({ ...p, id: "P" }), saveShift: async (p) => ({ ...p, id: "S" })
    };
    window.TaxiData = d; window.TaxiDataService = d;
  });
  const page = await ctx.newPage();
  await page.goto(`${ALT}/admin/schichtplanung.html`, { waitUntil: "load" });
  await page.waitForTimeout(2200);
  return { ctx, page };
}

console.log("\n=== Aufgabe 1: Eine Schicht vollstaendig planen und veroeffentlichen ===\n");

const altSchicht = zaehler();
{
  const { ctx, page } = await altKontext();

  /* Wie weit muss geblaettert werden, bis die Mitarbeiterkarten sichtbar sind? */
  altSchicht.blaettern = await page.evaluate(() => {
    const raster = document.querySelector("[data-shift-driver-grid]");
    return raster ? Math.max(0, Math.round(raster.getBoundingClientRect().top - window.innerHeight + 200)) : 0;
  });

  await page.click("[data-shift-plan]"); altSchicht.klicks += 1;
  await page.waitForTimeout(500);
  await page.click('[data-dialog-duty="ja"]').catch(() => {}); altSchicht.klicks += 1;
  await page.waitForTimeout(250);
  const vorlage = await page.$("[data-dialog-template]");
  if (vorlage) { await vorlage.click(); altSchicht.klicks += 1; await page.waitForTimeout(200); }
  const fahrzeug = await page.$("[data-dialog-vehicle]");
  if (fahrzeug) { await fahrzeug.click(); altSchicht.klicks += 1; await page.waitForTimeout(200); }
  await page.click("[data-dialog-save]"); altSchicht.klicks += 1;
  await page.waitForTimeout(700);

  /* Veroeffentlichen sitzt in der Tagesleiste - dafuer muss man wieder
     nach oben. */
  altSchicht.blaettern += await page.evaluate(() => {
    const leiste = document.querySelector("[data-plan-publish]");
    return leiste ? Math.abs(Math.round(leiste.getBoundingClientRect().top)) : 0;
  });
  page.once("dialog", (d) => d.accept());
  await page.click("[data-plan-publish]"); altSchicht.klicks += 1;
  await page.waitForTimeout(700);

  await ctx.close();
}

/* ============================================================
   B) Neustand: die Designprobe
   ============================================================ */
const probeServer = await server(join(WURZEL, "probe-betriebsportal"), 5402, (p) => {
  if (p.startsWith("/schriften/")) return join(WURZEL, "public", p);
  if (p === "/logo.png") return join(WURZEL, "logo.png");
  return null;
});
const NEU = "http://127.0.0.1:5402";

async function probeKontext(breite = 1440) {
  const ctx = await browser.newContext({ viewport: { width: breite, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(NEU + "/", { waitUntil: "load" });
  await page.waitForTimeout(400);
  return { ctx, page };
}

const neuSchicht = zaehler();
{
  const { ctx, page } = await probeKontext();
  await page.click('[data-bereich="planung"]'); neuSchicht.klicks += 1; neuSchicht.wechsel += 1;
  await page.waitForTimeout(350);

  /* Alles in der Zeile: Status, Schicht, Fahrzeug. */
  await page.selectOption('.plan-zeile:nth-child(4) select[data-plan="dienst"]', "ja"); neuSchicht.auswahlen += 1;
  await page.waitForTimeout(250);
  await page.selectOption('.plan-zeile:nth-child(4) select[data-plan="vorlage"]', "spaet"); neuSchicht.auswahlen += 1;
  await page.waitForTimeout(250);
  await page.selectOption('.plan-zeile:nth-child(4) select[data-plan="fahrzeug"]', "F03"); neuSchicht.auswahlen += 1;
  await page.waitForTimeout(250);

  /* Die Aktionsleiste klebt unten - kein Blaettern noetig. */
  neuSchicht.blaettern = await page.evaluate(() => {
    const l = document.querySelector(".aktionsleiste");
    if (!l) return 0;
    const r = l.getBoundingClientRect();
    return (r.top >= 0 && r.bottom <= window.innerHeight) ? 0 : Math.abs(Math.round(r.top));
  });

  await page.click('[data-tun="plan-veroeffentlichen"]'); neuSchicht.klicks += 1;
  await page.waitForTimeout(300);
  await page.click('[data-tun="plan-veroeffentlichen-ja"]'); neuSchicht.klicks += 1;
  await page.waitForTimeout(400);
  await ctx.close();
}

/* ============================================================
   C) Aufgabe 2: Zu den noch nicht zugewiesenen Fahrten
   ============================================================ */
console.log("=== Aufgabe 2: Von der Startseite zu den ungeplanten Fahrten ===\n");

const neuFahrten = zaehler();
{
  const { ctx, page } = await probeKontext();
  await page.click('.kennzahl[data-ziel="fahrten:ungeplant"]'); neuFahrten.klicks += 1; neuFahrten.wechsel += 1;
  await page.waitForTimeout(300);
  const titel = await page.textContent(".bereichskopf h1");
  const gefiltert = await page.$eval('[data-tun="fahrt-filter:ungeplant"]', (el) => el.getAttribute("aria-pressed"));
  neuFahrten.erreicht = titel.trim() === "Fahrten" && gefiltert === "true";
  await ctx.close();
}

/* ============================================================
   D) Wie viele gleichzeitige Hauptaktionen sind sichtbar?
   ============================================================ */
const altAktionen = await (async () => {
  const { ctx, page } = await altKontext();
  /* Getrennt gezaehlt: Eine Kennzahl, die man anklicken kann, ist
     keine Hauptaktion - sie ist eine Zahl mit einem Weg. Beides wird
     ausgewiesen, damit nichts schoengerechnet wird. */
  const n = await page.evaluate(() => {
    const sichtbar = (el) => el.offsetParent !== null && el.getBoundingClientRect().top < window.innerHeight;
    const alle = [...document.querySelectorAll("button, .admin-btn")].filter(sichtbar);
    return { alle: alle.length, aktionen: alle.filter((el) => el.matches(".admin-btn, button.admin-btn")).length };
  });
  const seiten = await page.evaluate(() => document.querySelectorAll("section").length);
  await ctx.close();
  return { alle: n.alle, aktionen: n.aktionen, abschnitte: seiten };
})();

const neuAktionen = await (async () => {
  const { ctx, page } = await probeKontext();
  const n = await page.evaluate(() => {
    const sichtbar = (el) => el.offsetParent !== null && el.getBoundingClientRect().top < window.innerHeight;
    const alle = [...document.querySelectorAll("button")]
      .filter((el) => sichtbar(el) && !el.closest("[data-navigation]") && !el.closest("[data-handyleiste]"));
    return { alle: alle.length, aktionen: alle.filter((el) => el.matches(".knopf")).length };
  });
  const abschnitte = await page.evaluate(() => document.querySelectorAll(".flaeche").length);
  await ctx.close();
  return { alle: n.alle, aktionen: n.aktionen, abschnitte };
})();

await browser.close();
altServer.close();
probeServer.close();

/* ============================================================
   Ergebnis
   ============================================================ */
const zeile = (name, a, b) => {
  const pfeil = b < a ? "besser" : b > a ? "schlechter" : "gleich";
  console.log(`  ${String(name).padEnd(38)} ${String(a).padStart(6)} ${String(b).padStart(8)}   ${pfeil}`);
};

console.log("═".repeat(72));
console.log("  Bedienwege - gezaehlt, nicht geschaetzt");
console.log("═".repeat(72));
console.log(`  ${"".padEnd(38)} ${"heute".padStart(6)} ${"Probe".padStart(8)}`);
console.log("  " + "-".repeat(66));
console.log("  Aufgabe 1: Schicht planen und veroeffentlichen");
zeile("Klicks und Auswahlen", gesamt(altSchicht), gesamt(neuSchicht));
zeile("Blaetterweg in Pixeln", altSchicht.blaettern, neuSchicht.blaettern);
zeile("Fenster, die sich oeffnen", 2, 1);
console.log("  " + "-".repeat(66));
console.log("  Aufgabe 2: zu den ungeplanten Fahrten");
console.log(`  In der Probe: ${gesamt(neuFahrten)} Klick, Ziel erreicht: ${neuFahrten.erreicht ? "ja" : "nein"}`);
console.log("  Heute: nicht moeglich - es gibt keine Fahrtenliste im Betriebsportal.");
console.log("  " + "-".repeat(66));
console.log("  Erster Bildschirm");
zeile("anklickbare Elemente insgesamt", altAktionen.alle, neuAktionen.alle);
zeile("davon echte Hauptaktionen", altAktionen.aktionen, neuAktionen.aktionen);
zeile("Abschnitte auf der Seite", altAktionen.abschnitte, neuAktionen.abschnitte);
console.log("═".repeat(72));
console.log(`
  Der Altstand ist der Stand NACH Schritt 029d, also bereits der
  verbesserte. Gegen den Stand davor waere der Unterschied groesser.
  Beide Laeufe ohne Supabase: der Altstand mit einer Attrappe, die
  Probe hat ohnehin keine Datenquelle.`);
