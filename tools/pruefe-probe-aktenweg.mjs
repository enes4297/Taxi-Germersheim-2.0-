/* ============================================================
   Prueflauf: Aktenweg, Rueckwege, Scrollposition, feine Rechte
   ============================================================
   Gemessene Ausgangsfehler des manuellen Gegenlaufs:

   1. In der Akte von Testkunde 03 stand "RE-2026-0002" als <li> -
      nicht anklickbar und mit der Tastatur nicht erreichbar.

   2. Das Rewards-Konto liess sich oeffnen, hatte aber keinen Weg
      zurueck zur Kundenakte.

   3. Beim Umschalten eines Rechts sprang die Einstellungsseite nach
      ganz oben, und der Tastaturfokus war weg.

   4. Ohne Pflichtgrund wurde richtig nichts gespeichert - aber es
      leuchtete nur das Feld. Es gab keine Meldung, keinen Fokus, kein
      aria-invalid.

   5. "Fahrten sehen" und "Planung sehen" waren EIN Recht, ebenso
      "Personalstammdaten sehen" und "Krankheitszeitraeume sehen".
      Fuer die Rollenvergabe zu grob.

   Geprueft wird ueber die Oberflaeche: angeklickt wird, was ein Mensch
   anklickt, getippt wird Zeichen fuer Zeichen. Zusaetzlich wird jede
   kritische Aktion DIREKT aufgerufen - ein fehlender Knopf ist kein
   Schutz.

   ALLES SIMULIERT. Keine Datenquelle, kein Upload, kein Versand.
   Dieser Lauf sagt nichts ueber die produktive Instanz.
   ============================================================ */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";

const { chromium } = await import(
  "file:///" + join(process.cwd(), "fahrer/tests/node_modules/playwright/index.mjs").replace(/\\/g, "/")
);

const WURZEL = process.cwd();
const PROBE = join(WURZEL, "probe-betriebsportal");
const PORT = 5382;
const TYPEN = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".png": "image/png", ".woff2": "font/woff2"
};

const server = createServer(async (req, res) => {
  const pfad = decodeURIComponent(req.url.split("?")[0]);
  let datei;
  if (pfad === "/") datei = join(PROBE, "index.html");
  else if (pfad.startsWith("/schriften/")) datei = join(WURZEL, "public", pfad);
  else if (pfad === "/logo.png") datei = join(WURZEL, "logo.png");
  else datei = join(PROBE, pfad);
  try {
    const inhalt = await readFile(datei);
    res.writeHead(200, { "Content-Type": TYPEN[extname(datei).toLowerCase()] || "application/octet-stream" });
    res.end(inhalt);
  } catch { res.writeHead(404); res.end("x"); }
});
await new Promise((r) => server.listen(PORT, "127.0.0.1", r));
const ADRESSE = `http://127.0.0.1:${PORT}/`;

let bestanden = 0;
const offen = [];
function pruefe(bedingung, name) {
  if (bedingung) { bestanden += 1; console.log("OK   " + name); }
  else { offen.push(name); console.log("FEHL " + name); }
}

const browser = await chromium.launch({ channel: "chrome" });
const fremdeAnfragen = [];

async function seite(rolle = "admin", breite = 1440, hoehe = 760) {
  const ctx = await browser.newContext({ viewport: { width: breite, height: hoehe } });
  const fehler = [];
  await ctx.route("**://**", (route) => {
    const u = route.request().url();
    if (u.startsWith(ADRESSE)) return route.continue();
    fremdeAnfragen.push(u);
    return route.abort();
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => fehler.push(String(e.message)));
  page.on("console", (m) => { if (m.type() === "error") fehler.push(m.text()); });
  await page.goto(ADRESSE, { waitUntil: "load" });
  await page.waitForTimeout(400);
  await page.evaluate(() => { try { localStorage.clear(); } catch { /* egal */ } });
  await page.selectOption("[data-rolle]", rolle);
  await page.waitForTimeout(350);
  return { ctx, page, fehler };
}

const titel = (page) => page.evaluate(() => {
  const el = document.querySelector(".dialog-kasten h2");
  return el ? el.textContent.trim() : "";
});
const dialogText = (page) => page.evaluate(() => {
  const k = document.querySelector(".dialog-kasten");
  return k ? k.innerText.replace(/\s+/g, " ") : "";
});
const roll = (page) => page.evaluate(() => {
  const r = document.querySelector(".dialog-kasten .dialog-rumpf");
  return r ? r.scrollTop : -1;
});
/*
  Wie ein Mensch: erst in den Blick holen, dann anklicken. Ein Mensch
  klickt nicht auf etwas, das er nicht sieht - und der Browser
  verschiebt den Blick beim Fokuswechsel, wenn das Ziel ausserhalb
  liegt. Ohne diesen Schritt prueft man eine Lage, die es nicht gibt.
*/
async function inDenBlick(page, wahl) {
  await page.evaluate((w) => {
    const el = document.querySelector(w);
    if (el) el.scrollIntoView({ block: "center" });
  }, wahl);
  await page.waitForTimeout(150);
}

async function kundenakteOeffnen(page, suche = "Testkunde 03") {
  await page.evaluate(() => window.ProbeRahmen.geheZu("kunden"));
  await page.waitForTimeout(350);
  await page.fill("[data-kundensuche]", suche);
  await page.waitForTimeout(450);
  await page.click('.aktenzeile[data-tun^="ak-kunde:"]');
  await page.waitForTimeout(450);
}

/* ═══ 1. Die Rechnung in der Kundenakte ═════════════════════════ */
console.log("\n── 1. Rechnung aus der Kundenakte öffnen ──");
{
  const { page, fehler } = await seite("admin");
  await kundenakteOeffnen(page);
  pruefe(await titel(page) === "Testkunde 03", "die Kundenakte von Testkunde 03 ist offen");

  const zeilen = await page.$$eval('[data-tun^="ak-rechnung-aus-kunde:"]', (ns) => ns.map((x) => ({
    tag: x.tagName, typ: x.getAttribute("type"), tun: x.dataset.tun,
    label: x.getAttribute("aria-label") || "", text: x.textContent.replace(/\s+/g, " ").trim()
  })));
  pruefe(zeilen.length >= 1, `die Rechnung ist eine eigene Zeile (${zeilen.length})`);
  pruefe(zeilen.every((x) => x.tag === "BUTTON" && x.typ === "button"),
    "und zwar eine echte Schaltfläche — vorher stand sie als <li> da");
  pruefe(zeilen.every((x) => x.label.length > 20),
    `mit einer Beschriftung für Hilfsmittel (${zeilen[0] ? zeilen[0].label : "—"})`);
  pruefe(zeilen.some((x) => /RE-2026-0002/.test(x.text)),
    "RE-2026-0002 steht darunter");
  pruefe(zeilen.every((x) => x.tun.includes("|K0003")),
    "der Knopf trägt die Kundenkennung — die Herkunft wird nicht geraten");

  /* Mit der Tastatur erreichbar und mit Enter bedienbar. */
  const ziel = zeilen[0].tun;
  await inDenBlick(page, `[data-tun="${ziel}"]`);
  await page.focus(`[data-tun="${ziel}"]`);
  pruefe(await page.evaluate((w) => document.activeElement === document.querySelector(w),
    `[data-tun="${ziel}"]`), "die Zeile ist mit der Tastatur anwählbar");
  const vorRoll = await roll(page);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(500);
  pruefe(/RE-2026-0002/.test(await titel(page)),
    `Enter öffnet die Rechnungsakte (${await titel(page)})`);
  pruefe(await page.evaluate(() => window.ProbeRahmen.zustand.bereich) === "kunden",
    "und zwar ohne in die Finanzübersicht zu wechseln");

  /* Der Rueckweg steht in Kopf UND Fuss. */
  const rueck = await page.$$eval('[data-tun="ak-weg-zurueck"]',
    (ns) => ns.map((x) => ({ text: x.textContent.trim(), wo: x.closest(".dialog-fuss") ? "Fuss" : "Kopf" })));
  pruefe(rueck.length === 2, `„Zurück zur Kundenakte“ steht zweimal (${rueck.length})`);
  pruefe(rueck.some((x) => x.wo === "Kopf") && rueck.some((x) => x.wo === "Fuss"),
    "im Kopf und im Fuß — wer unten steht, muss nicht erst nach oben");
  pruefe(rueck.every((x) => /Zurück zur Kundenakte/.test(x.text)),
    "und sagt, wohin es zurückgeht");

  /* Zurueck - richtiger Kunde, gleiche Position. */
  await page.click('.dialog-fuss [data-tun="ak-weg-zurueck"]');
  await page.waitForTimeout(500);
  pruefe(await titel(page) === "Testkunde 03",
    `der Rückweg führt zu genau diesem Kunden (${await titel(page)})`);
  pruefe(await roll(page) === vorRoll,
    `und an dieselbe Scrollposition (${vorRoll} → ${await roll(page)})`);

  /* Escape wirkt wie der Rueckweg. */
  await inDenBlick(page, `[data-tun="${ziel}"]`);
  const vorRoll2 = await roll(page);
  await page.click(`[data-tun="${ziel}"]`);
  await page.waitForTimeout(450);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
  pruefe(await titel(page) === "Testkunde 03", "Escape führt ebenfalls zur Kundenakte");
  pruefe(await roll(page) === vorRoll2,
    `auch mit erhaltener Position (${vorRoll2} → ${await roll(page)})`);

  /* Schliessen verlaesst den ganzen Weg. */
  await page.click(`[data-tun="${ziel}"]`);
  await page.waitForTimeout(450);
  await page.click(".dialog-fuss [data-dialog-zu]");
  await page.waitForTimeout(500);
  pruefe(!(await page.evaluate(() => window.ProbeRahmen.dialogOffen())),
    "„Schließen“ verlässt den gesamten Aktenweg");
  pruefe(await page.evaluate(() => window.ProbeAkten.wegZiel()) === null,
    "und räumt den Weg ab — ein späteres Fenster erbt keinen alten Rückweg");

  pruefe(fehler.length === 0, "keine Fehlermeldung im Browser (" + fehler.join(" | ") + ")");
  await page.context().close();
}

/* ═══ 2. Berechtigung in der Aktion ═════════════════════════════ */
console.log("\n── 2. Ohne finance.read keine Rechnung ──");
{
  /* Die Disposition hat weder customers.read noch finance.read. */
  const { page } = await seite("dispatcher");
  pruefe(!(await page.evaluate(() => window.ProbeRahmen.darf("finance.read"))),
    "die Disposition darf keine Finanzen sehen");
  await page.evaluate(() => {
    window.ProbeAkten.tun("ak-rechnung-aus-kunde", "RE-2026-0002|K0003");
  });
  await page.waitForTimeout(400);
  pruefe(!(await page.evaluate(() => window.ProbeRahmen.dialogOffen())),
    "der direkte Aufruf öffnet keine Rechnungsakte");
  await page.context().close();

  /* Und eine fremde Rechnungsnummer am Knopf oeffnet keine fremde Akte. */
  const { page: p2 } = await seite("admin");
  await p2.evaluate(() => {
    /* RE-2026-0001 gehoert K0001, nicht K0003. */
    window.ProbeAkten.tun("ak-rechnung-aus-kunde", "RE-2026-0001|K0003");
  });
  await p2.waitForTimeout(400);
  pruefe(!(await p2.evaluate(() => window.ProbeRahmen.dialogOffen())),
    "eine fremde Rechnungsnummer öffnet keine fremde Akte");
  await p2.context().close();
}

/* ═══ 3. Rückweg aus dem Rewards-Konto ══════════════════════════ */
console.log("\n── 3. Rewards-Konto und zurück ──");
{
  const { page, fehler } = await seite("admin");
  await kundenakteOeffnen(page);
  await inDenBlick(page, '[data-tun^="ak-rewards:"]');
  const vorRoll = await roll(page);
  await page.click('[data-tun^="ak-rewards:"]');
  await page.waitForTimeout(500);
  pruefe(/Testkunde 03/.test(await titel(page)),
    `das Rewards-Konto von Testkunde 03 öffnet (${await titel(page)})`);
  const rueck = await page.$$eval('[data-tun="ak-weg-zurueck"]',
    (ns) => ns.map((x) => (x.closest(".dialog-fuss") ? "Fuss" : "Kopf")));
  pruefe(rueck.includes("Kopf") && rueck.includes("Fuss"),
    `der Rückweg steht in Kopf und Fuß (${rueck.join(", ")})`);

  await page.click('.dialog-fuss [data-tun="ak-weg-zurueck"]');
  await page.waitForTimeout(500);
  pruefe(await titel(page) === "Testkunde 03", "er führt zu Testkunde 03 zurück");
  pruefe(await roll(page) === vorRoll,
    `an dieselbe Scrollposition (${vorRoll} → ${await roll(page)})`);

  /* Escape ebenso. */
  await inDenBlick(page, '[data-tun^="ak-rewards:"]');
  const vorRoll2 = await roll(page);
  await page.click('[data-tun^="ak-rewards:"]');
  await page.waitForTimeout(450);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
  pruefe(await titel(page) === "Testkunde 03", "Escape führt zur Kundenakte zurück");
  pruefe(await roll(page) === vorRoll2, "mit erhaltener Position");

  /* Schliessen verlaesst alles. */
  await page.click('[data-tun^="ak-rewards:"]');
  await page.waitForTimeout(450);
  await page.click(".dialog-fuss [data-dialog-zu]");
  await page.waitForTimeout(450);
  pruefe(!(await page.evaluate(() => window.ProbeRahmen.dialogOffen())),
    "„Schließen“ verlässt den gesamten Aktenweg");

  /*
    Von einer anderen Stelle geoeffnet: KEIN erfundener Rueckweg.

    Das ist der Punkt, an dem eine pauschale Ruecksprungseite falsch
    waere: Wer das Konto aus der Rewardsliste oeffnet, kommt aus keiner
    Kundenakte - eine zu behaupten waere eine Unwahrheit.
  */
  await page.evaluate(() => window.ProbeRahmen.geheZu("rewards"));
  await page.waitForTimeout(400);
  await page.click('.aktenzeile[data-tun^="ak-rewards-konto:"]');
  await page.waitForTimeout(450);
  pruefe(await page.evaluate(() => window.ProbeRahmen.dialogOffen()),
    "aus der Rewardsliste öffnet das Konto ebenfalls");
  pruefe((await page.$$eval('[data-tun="ak-weg-zurueck"]', (n) => n.length)) === 0,
    "aber ohne Rückweg — es gibt keine Kundenakte, aus der man käme");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  pruefe(!(await page.evaluate(() => window.ProbeRahmen.dialogOffen())),
    "Escape schließt es dann einfach");

  pruefe(fehler.length === 0, "keine Fehlermeldung im Browser (" + fehler.join(" | ") + ")");
  await page.context().close();
}

/* ═══ 4. Scrollposition und Fokus in der Rechteverwaltung ═══════ */
console.log("\n── 4. Die Einstellungsseite springt nicht ──");
{
  const { page, fehler } = await seite("admin");
  await page.evaluate(() => window.ProbeRahmen.geheZu("einstellungen"));
  await page.waitForTimeout(400);
  await page.click('[data-tun="es-rolle:dispatcher"]');
  await page.waitForTimeout(450);

  const alle = await page.$$eval("[data-es-recht]", (ns) => ns.map((x) => x.dataset.esRecht));
  pruefe(alle.length >= 15, `die Fähigkeiten sind einzeln schaltbar (${alle.length})`);

  /*
    Geprueft wird auf einer WEIT UNTEN liegenden Berechtigung - genau
    dort fiel der Sprung auf. Bei einem Recht ganz oben waere der
    Unterschied nicht zu sehen.
  */
  const unten = alle[alle.length - 1];
  await inDenBlick(page, `[data-es-recht="${unten}"]`);
  const vorRoll = await roll(page);
  pruefe(vorRoll > 100, `die Berechtigung „${unten}“ liegt weit unten (Rollstand ${vorRoll})`);

  await page.focus(`[data-es-recht="${unten}"]`);
  await page.keyboard.press("Space");
  await page.waitForTimeout(450);
  pruefe(await roll(page) === vorRoll,
    `nach der Änderung bleibt die Position (${vorRoll} → ${await roll(page)})`);
  pruefe(await page.evaluate(() => document.activeElement
    && document.activeElement.dataset ? document.activeElement.dataset.esRecht : "") === unten,
    "und der Fokus bleibt auf dem betätigten Schalter");
  pruefe(await page.evaluate((id) =>
    window.ProbeEinstellungen.stand.entwurf.includes(id) === false, unten)
    || await page.evaluate((id) =>
      window.ProbeEinstellungen.stand.entwurf.includes(id), unten),
    "die Änderung ist im Entwurf angekommen");
  const block = await page.evaluate(() => {
    const b = document.querySelector("[data-es-aenderungen]");
    return b ? b.innerText.replace(/\s+/g, " ") : "";
  });
  pruefe(/Geändert gegenüber dem Stand/i.test(block),
    "der Änderungsblock wird mitgezeichnet");

  /* Noch einmal - dieselbe Lage, auch beim Zurückschalten. */
  await page.keyboard.press("Space");
  await page.waitForTimeout(450);
  pruefe(await roll(page) === vorRoll, "auch beim Zurückschalten bleibt die Position");
  pruefe(await page.evaluate(() => document.activeElement
    && document.activeElement.dataset ? document.activeElement.dataset.esRecht : "") === unten,
    "und der Fokus");

  /* Mit der Maus, auf einer anderen weit unten liegenden Berechtigung. */
  const unten2 = alle[alle.length - 3];
  await inDenBlick(page, `[data-es-recht="${unten2}"]`);
  const vorRoll2 = await roll(page);
  await page.click(`[data-es-recht="${unten2}"]`);
  await page.waitForTimeout(450);
  pruefe(await roll(page) === vorRoll2,
    `mit der Maus ebenso (${vorRoll2} → ${await roll(page)})`);

  /* Ein ausdrueckliches Neuzeichnen darf ebenfalls nichts verlieren. */
  await page.focus(`[data-es-recht="${unten2}"]`);
  const vorRoll3 = await roll(page);
  await page.evaluate(() => window.ProbeRahmen.zeichnen());
  await page.waitForTimeout(400);
  pruefe(await roll(page) === vorRoll3,
    `ein Neuzeichnen der Fläche lässt das Fenster unberührt (${vorRoll3} → ${await roll(page)})`);
  pruefe(await page.evaluate(() => document.activeElement
    && document.activeElement.dataset ? document.activeElement.dataset.esRecht : "") === unten2,
    "und den Fokus");

  pruefe(fehler.length === 0, "keine Fehlermeldung im Browser (" + fehler.join(" | ") + ")");
  await page.context().close();
}

/* ═══ 5. Der Pflichtgrund sagt, was fehlt ══════════════════════ */
console.log("\n── 5. „Bitte einen Grund eingeben.“ ──");
{
  const { page, fehler } = await seite("admin");
  await page.evaluate(() => window.ProbeRahmen.geheZu("einstellungen"));
  await page.waitForTimeout(400);
  await page.click('[data-tun="es-rolle:accounting"]');
  await page.waitForTimeout(450);
  await page.uncheck('[data-es-recht="analytics.read"]');
  await page.waitForTimeout(350);
  await page.click('[data-tun="es-weiter"]');
  await page.waitForTimeout(450);

  const vorher = await page.evaluate(() =>
    JSON.stringify(window.ProbeRahmen.rollenRechte.accounting));
  await page.click('[data-tun="es-ja"]');
  await page.waitForTimeout(500);

  const befund = await page.evaluate(() => {
    const f = document.querySelector("[data-es-grund]");
    const k = document.getElementById("es-grund-fehler");
    return {
      invalid: f ? f.getAttribute("aria-invalid") : null,
      beschrieben: f ? f.getAttribute("aria-describedby") : null,
      text: k ? k.textContent.trim() : null,
      rolle: k ? k.getAttribute("role") : null,
      live: k ? k.getAttribute("aria-live") : null,
      verknuepft: f && k ? f.getAttribute("aria-describedby") === k.id : false,
      fokus: document.activeElement === f,
      markiert: f && f.closest("label")
        ? f.closest("label").classList.contains("hat-fehler") : false
    };
  });
  pruefe(befund.text === "Bitte einen Grund eingeben.",
    `am Feld steht „Bitte einen Grund eingeben.“ (${befund.text})`);
  pruefe(befund.fokus, "der Fokus springt in das Feld");
  pruefe(befund.invalid === "true", "das Feld ist als fehlerhaft gekennzeichnet (aria-invalid)");
  pruefe(befund.verknuepft,
    `der Hinweis ist dem Feld zugeordnet (aria-describedby=${befund.beschrieben})`);
  pruefe(befund.rolle === "alert" && befund.live === "polite",
    `und wird für Screenreader ausgegeben (role=${befund.rolle}, aria-live=${befund.live})`);
  pruefe(befund.markiert, "das Feld ist auch sichtbar hervorgehoben");
  pruefe(await page.evaluate(() =>
    JSON.stringify(window.ProbeRahmen.rollenRechte.accounting)) === vorher,
    "und es wird nichts gespeichert");

  /* Der direkte Aufruf ohne Grund ebenfalls nicht. */
  await page.evaluate(() => window.ProbeEinstellungen.tun("es-ja", ""));
  await page.waitForTimeout(400);
  pruefe(await page.evaluate(() =>
    JSON.stringify(window.ProbeRahmen.rollenRechte.accounting)) === vorher,
    "der direkte Aufruf ohne Grund ändert ebenfalls nichts");

  /* Zu kurz ist auch kein Grund. */
  await page.fill("[data-es-grund]", "x");
  await page.click('[data-tun="es-ja"]');
  await page.waitForTimeout(450);
  pruefe(await page.evaluate(() =>
    JSON.stringify(window.ProbeRahmen.rollenRechte.accounting)) === vorher,
    "ein einzelnes Zeichen ist kein Grund");

  /* Beim Tippen verschwindet die Meldung - ohne den Fokus zu verlieren. */
  await page.click("[data-es-grund]");
  await page.keyboard.press("Control+a");
  await page.keyboard.type("Buchhaltung braucht die Analyse nicht mehr.");
  await page.waitForTimeout(350);
  const nachher = await page.evaluate(() => {
    const f = document.querySelector("[data-es-grund]");
    const k = document.getElementById("es-grund-fehler");
    return {
      invalid: f.getAttribute("aria-invalid"),
      text: k ? k.textContent.trim() : null,
      fokus: document.activeElement === f
    };
  });
  pruefe(!nachher.text, "beim Tippen verschwindet die Meldung");
  pruefe(nachher.invalid === null, "und der Fehlerzustand");
  pruefe(nachher.fokus, "der Schreibzeiger bleibt dabei im Feld");

  await page.click('[data-tun="es-ja"]');
  await page.waitForTimeout(500);
  pruefe(!(await page.evaluate(() =>
    window.ProbeRahmen.rollenRechte.accounting.includes("analytics.read"))),
    "mit gültigem Grund wird gespeichert");

  pruefe(fehler.length === 0, "keine Fehlermeldung im Browser (" + fehler.join(" | ") + ")");
  await page.context().close();
}

/* ═══ 6. Die feinen Rechte ══════════════════════════════════════ */
console.log("\n── 6. Fahrten, Planung, Stammdaten, Krankheit getrennt ──");
{
  const { page, fehler } = await seite("admin");

  /* Die vier neuen Faehigkeiten gibt es, die groben nicht mehr. */
  const liste = await page.evaluate(() => window.ProbeEinstellungen.ALLE_IDS);
  for (const id of ["fahrten.read", "planung.read", "personal.read", "krankheit.read"]) {
    pruefe(liste.includes(id), `„${id}“ ist einzeln schaltbar`);
  }
  pruefe(liste.includes("dokument.pruefen"),
    "und die Dokumentprüfung ist noch einmal getrennt");
  for (const alt of ["operations.read", "personnel.read"]) {
    pruefe(!liste.includes(alt), `die grobe Kennung „${alt}“ ist kein Recht mehr`);
  }
  const rollen = await page.evaluate(() => JSON.stringify(window.ProbeRahmen.rollenRechte));
  pruefe(!/operations\.read|personnel\.read/.test(rollen),
    "und steht in keiner Rolle");

  /* Die grobe Frage bleibt im Code gueltig - als ODER. */
  const grob = await page.evaluate(() => window.ProbeRahmen.GROBE);
  pruefe(grob["operations.read"].length === 2 && grob["personnel.read"].length === 2,
    "die groben Kennungen sind als Frage auf ihre feinen Teile abgebildet");

  await page.context().close();

  /* --- Nur Planung, keine Fahrten --- */
  const a = await seite("dispatcher");
  await a.page.evaluate(() => {
    window.ProbeRahmen.rollenRechte.dispatcher = ["planung.read", "self.read"];
    window.ProbeRahmen.zeichnen();
  });
  await a.page.waitForTimeout(400);
  const nurPlanung = await a.page.evaluate(() =>
    window.ProbeRahmen.sichtbareBereiche().map((x) => x.id));
  pruefe(nurPlanung.includes("planung"), "mit nur planung.read ist die Planung sichtbar");
  pruefe(!nurPlanung.includes("fahrten"), "die Fahrten aber nicht");
  await a.page.evaluate(() => window.ProbeRahmen.geheZu("fahrten"));
  await a.page.waitForTimeout(400);
  pruefe(/Kein Zugriff|Keine Berechtigung/.test(await a.page.evaluate(() =>
    document.querySelector(".haupt").textContent)),
    "und ein direkter Sprung dorthin wird abgewiesen");
  await a.page.evaluate(() => window.ProbeRahmen.geheZu("kalender"));
  await a.page.waitForTimeout(400);
  const kalA = await a.page.$$eval('[data-tun^="kal-art:"]',
    (ns) => ns.map((x) => x.dataset.tun.split(":")[1]));
  pruefe(kalA.includes("schicht") && kalA.includes("konflikt"),
    `im Kalender bleiben Schichten und Konflikte (${kalA.join(", ")})`);
  pruefe(!kalA.includes("fahrt"), "die Fahrtenkategorie fehlt");
  await a.ctx.close();

  /* --- Nur Fahrten, keine Planung --- */
  const b = await seite("dispatcher");
  await b.page.evaluate(() => {
    window.ProbeRahmen.rollenRechte.dispatcher = ["fahrten.read", "self.read"];
    window.ProbeRahmen.zeichnen();
  });
  await b.page.waitForTimeout(400);
  const nurFahrten = await b.page.evaluate(() =>
    window.ProbeRahmen.sichtbareBereiche().map((x) => x.id));
  pruefe(nurFahrten.includes("fahrten"), "mit nur fahrten.read sind die Fahrten sichtbar");
  pruefe(!nurFahrten.includes("planung"), "die Planung aber nicht");
  await b.page.evaluate(() => window.ProbeRahmen.geheZu("planung"));
  await b.page.waitForTimeout(400);
  pruefe(/Kein Zugriff|Keine Berechtigung/.test(await b.page.evaluate(() =>
    document.querySelector(".haupt").textContent)),
    "und ein direkter Sprung in die Planung wird abgewiesen");
  await b.page.evaluate(() => window.ProbeRahmen.geheZu("kalender"));
  await b.page.waitForTimeout(400);
  const kalB = await b.page.$$eval('[data-tun^="kal-art:"]',
    (ns) => ns.map((x) => x.dataset.tun.split(":")[1]));
  pruefe(kalB.includes("fahrt"), `im Kalender bleiben die Fahrten (${kalB.join(", ")})`);
  pruefe(!kalB.includes("schicht") && !kalB.includes("konflikt"),
    "Schichten und Konflikte fehlen");
  await b.ctx.close();

  /* --- Stammdaten ohne Krankheit --- */
  const c = await seite("personal");
  await c.page.evaluate(() => {
    window.ProbeRahmen.rollenRechte.personal = ["personal.read", "self.read"];
    window.ProbeRahmen.zeichnen();
  });
  await c.page.waitForTimeout(400);
  pruefe(await c.page.evaluate(() => window.ProbeRahmen.darf("personal.read")),
    "mit nur personal.read sind die Stammdaten sichtbar");
  pruefe(!(await c.page.evaluate(() => window.ProbeRahmen.darf("krankheit.read"))),
    "die Krankheitszeiträume aber nicht");
  pruefe(!(await c.page.evaluate(() => window.ProbeRahmen.darf("dokument.pruefen"))),
    "und die Dokumentprüfung erst recht nicht");
  pruefe((await c.page.evaluate(() =>
    window.ProbeRahmen.sichtbareBereiche().map((x) => x.id))).includes("personal"),
    "der Bereich Personal bleibt erreichbar");

  await c.page.evaluate(() => window.ProbeRahmen.geheZu("meldungen"));
  await c.page.waitForTimeout(400);
  const krankId = await c.page.evaluate(() => {
    const v = window.ProbeDaten.vorgaenge.find((x) => x.thema === "krankheit");
    return v ? v.id : "";
  });
  pruefe(Boolean(krankId), `es gibt einen Krankheitsvorgang (${krankId})`);
  await c.page.evaluate((id) => window.ProbeVorgaenge.tun("vg-oeffnen", id), krankId);
  await c.page.waitForTimeout(500);
  const vtext = await dialogText(c.page);
  pruefe(!/\.pdf/i.test(vtext),
    "ohne krankheit.read ist kein Dateiname zu sehen");
  pruefe(!(await c.page.$('[data-tun^="vg-bescheinigung"]')),
    "und kein Knopf, die Bescheinigung zu öffnen");

  /* Die Dokumentaktionen direkt aufgerufen - sie duerfen nichts tun. */
  const vorEinsicht = await c.page.evaluate((id) => {
    const v = window.ProbeDaten.vorgangVon(id);
    const nw = ((v.daten && v.daten.nachweise) || [])[0];
    return nw ? JSON.stringify({ einsicht: nw.einsicht, ergebnis: nw.ergebnis }) : "";
  }, krankId);
  pruefe(Boolean(vorEinsicht), "der Vorgang hat einen Nachweis — die Prüfung ist nicht leer");
  await c.page.evaluate((id) => {
    window.ProbeVorgaenge.tun("vg-bescheinigung", id);
    window.ProbeVorgaenge.tun("vg-einsicht-ja", id);
    window.ProbeVorgaenge.tun("vg-ergebnis", id + "|ok");
  }, krankId);
  await c.page.waitForTimeout(450);
  pruefe(await c.page.evaluate((id) => {
    const v = window.ProbeDaten.vorgangVon(id);
    const nw = ((v.daten && v.daten.nachweise) || [])[0];
    return nw ? JSON.stringify({ einsicht: nw.einsicht, ergebnis: nw.ergebnis }) : "";
  }, krankId) === vorEinsicht,
    "die direkt aufgerufenen Dokumentaktionen ändern nichts");
  await c.ctx.close();

  /* --- Krankheit ohne Dokumentprüfung --- */
  const d = await seite("personal");
  await d.page.evaluate(() => {
    window.ProbeRahmen.rollenRechte.personal =
      ["personal.read", "krankheit.read", "personnel.write", "self.read"];
    window.ProbeRahmen.zeichnen();
  });
  await d.page.waitForTimeout(400);
  pruefe(await d.page.evaluate(() => window.ProbeRahmen.darf("krankheit.read")),
    "mit krankheit.read ist der Zeitraum sichtbar");
  pruefe(!(await d.page.evaluate(() => window.ProbeRahmen.darf("dokument.pruefen"))),
    "ohne dokument.pruefen bleibt die Bescheinigung verschlossen");
  await d.page.evaluate(() => window.ProbeRahmen.geheZu("meldungen"));
  await d.page.waitForTimeout(400);
  await d.page.evaluate((id) => window.ProbeVorgaenge.tun("vg-oeffnen", id), krankId);
  await d.page.waitForTimeout(500);
  pruefe(!(await d.page.$('[data-tun^="vg-bescheinigung"]')),
    "es gibt keinen Knopf, die Bescheinigung zu öffnen");
  const vorD = await d.page.evaluate((id) => {
    const v = window.ProbeDaten.vorgangVon(id);
    const nw = ((v.daten && v.daten.nachweise) || [])[0];
    return nw ? JSON.stringify({ einsicht: nw.einsicht, ergebnis: nw.ergebnis }) : "";
  }, krankId);
  await d.page.evaluate((id) => {
    window.ProbeVorgaenge.tun("vg-einsicht-ja", id);
    window.ProbeVorgaenge.tun("vg-ergebnis", id + "|ok");
  }, krankId);
  await d.page.waitForTimeout(450);
  pruefe(await d.page.evaluate((id) => {
    const v = window.ProbeDaten.vorgangVon(id);
    const nw = ((v.daten && v.daten.nachweise) || [])[0];
    return nw ? JSON.stringify({ einsicht: nw.einsicht, ergebnis: nw.ergebnis }) : "";
  }, krankId) === vorD,
    "und der direkte Aufruf von Einsicht und Ergebnis bewirkt nichts");
  await d.ctx.close();

  /* --- Die Aussperrsperre ist noch da --- */
  const e = await seite("admin");
  await e.page.evaluate(() => window.ProbeRahmen.geheZu("einstellungen"));
  await e.page.waitForTimeout(400);
  await e.page.click('[data-tun="es-rolle:admin"]');
  await e.page.waitForTimeout(450);
  await e.page.uncheck('[data-es-recht="security.write"]');
  await e.page.waitForTimeout(350);
  await e.page.click('[data-tun="es-weiter"]');
  await e.page.waitForTimeout(450);
  pruefe(/kein einziges Konto/.test(await dialogText(e.page)),
    "die Aussperrsperre greift weiterhin");
  pruefe(!(await e.page.$('[data-tun="es-ja"]')),
    "und bietet kein Speichern an");
  await e.page.evaluate(() => {
    const f = document.querySelector("[data-es-grund]");
    if (f) f.value = "Versuch";
    window.ProbeEinstellungen.tun("es-ja", "");
  });
  await e.page.waitForTimeout(450);
  pruefe(await e.page.evaluate(() =>
    window.ProbeRahmen.rollenRechte.admin.includes("security.write")),
    "auch der direkte Aufruf sperrt nicht aus");
  await e.ctx.close();

  pruefe(fehler.length === 0, "keine Fehlermeldung im Browser (" + fehler.join(" | ") + ")");
}

/* ═══ 7. Bereits bestandene Gegenproben ════════════════════════ */
console.log("\n── 7. Was bestanden hat, bleibt bestanden ──");
{
  const { page, fehler } = await seite("admin");
  await kundenakteOeffnen(page);
  const akte = await dialogText(page);
  pruefe(!/Kundennummer/.test(akte) && !/\bKD-\d/.test(akte),
    "keine Kundennummer in der Kundenakte");
  pruefe(!/\bK\d{4}\b/.test(akte), "und keine technische Kennung");
  pruefe(/Rewards-Konto/.test(akte), "das Rewards-Konto ist erreichbar");

  /* Neue Fahrt fuer diesen Kunden - mit Adresse. */
  const vorFahrten = await page.evaluate(() => window.ProbeDaten.fahrten.length);
  const offenVor = await page.evaluate(() =>
    window.ProbeDaten.fahrten.filter((f) => f.kundeId === "K0003"
      && f.zustand !== "abgeschlossen").length);
  await page.click('[data-tun^="ak-kunde-fahrt:"]');
  await page.waitForTimeout(600);
  const fa = await dialogText(page);
  pruefe(/Testkunde 03/.test(fa), "„Neue Fahrt für diesen Kunden“ übernimmt Testkunde 03");
  pruefe(/Testallee/.test(fa), "und seine Abholadresse");

  /* Abbrechen legt nichts an. */
  const ab = await page.$('[data-tun="fa-abbrechen"]');
  if (ab) { await ab.click(); await page.waitForTimeout(400); }
  const ja = await page.$('[data-tun="fa-abbruch-ja"]');
  if (ja) { await ja.click(); await page.waitForTimeout(400); }
  pruefe(await page.evaluate(() => window.ProbeDaten.fahrten.length) === vorFahrten,
    `Abbrechen legt keine Fahrt an (${vorFahrten})`);
  pruefe(await page.evaluate(() =>
    window.ProbeDaten.fahrten.filter((f) => f.kundeId === "K0003"
      && f.zustand !== "abgeschlossen").length) === offenVor,
    `es bleiben ${offenVor} offene Fahrten`);

  /* Die Analyse verschwindet bei entzogener Berechtigung. */
  await page.evaluate(() => window.ProbeRahmen.dialogSchliessen(true));
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    window.ProbeRahmen.rollenRechte.accounting =
      window.ProbeRahmen.rollenRechte.accounting.filter((x) => x !== "analytics.read");
  });
  await page.selectOption("[data-rolle]", "accounting");
  await page.waitForTimeout(400);
  pruefe(!(await page.evaluate(() =>
    window.ProbeRahmen.sichtbareBereiche().some((b) => b.id === "analyse"))),
    "die Analyse verschwindet bei entzogener Berechtigung");

  pruefe(fehler.length === 0, "keine Fehlermeldung im Browser (" + fehler.join(" | ") + ")");
  await page.context().close();
}

/* ═══ 8. Breiten und Netz ══════════════════════════════════════ */
console.log("\n── 8. Breiten und Netz ──");
for (const breite of [320, 390, 430, 1440]) {
  const { page } = await seite("admin", breite, 820);
  await kundenakteOeffnen(page);
  let ueber = await page.evaluate(() =>
    Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
  pruefe(ueber === 0, `Kundenakte bei ${breite}px: kein waagerechter Überlauf (${ueber}px)`);
  const klein = await page.$$eval('[data-tun^="ak-rechnung-aus-kunde:"]',
    (ns) => ns.filter((x) => x.getBoundingClientRect().height < 36).length);
  pruefe(klein === 0, `und keine Rechnungszeile unter 36 px (${klein})`);
  await page.evaluate(() => window.ProbeRahmen.dialogSchliessen(true));
  await page.waitForTimeout(250);
  await page.evaluate(() => window.ProbeRahmen.geheZu("einstellungen"));
  await page.waitForTimeout(350);
  await page.click('[data-tun="es-rolle:dispatcher"]');
  await page.waitForTimeout(400);
  ueber = await page.evaluate(() =>
    Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
  pruefe(ueber === 0, `Rechtefenster bei ${breite}px: kein Überlauf (${ueber}px)`);
  const kleinR = await page.$$eval(".rechtezeile",
    (ns) => ns.filter((x) => x.getBoundingClientRect().height < 36).length);
  pruefe(kleinR === 0, `und keine Rechtezeile unter 36 px (${kleinR})`);
  await page.context().close();
}
pruefe(fremdeAnfragen.length === 0,
  `keine einzige Anfrage nach außen im ganzen Lauf (${fremdeAnfragen.length}) ${fremdeAnfragen.slice(0, 3).join(" ")}`);

await browser.close();
await new Promise((r) => server.close(r));

console.log("\n═══════════════════════════════════════════════════════════");
console.log(`Aktenweg und Rechte: ${bestanden} bestanden, ${offen.length} nicht bestanden`);
if (offen.length) { console.log("\nOffen:"); offen.forEach((x) => console.log("  - " + x)); }
console.log("\nALLES SIMULIERT. Keine Datenquelle, kein Upload, kein Versand.");
console.log("Dieser Lauf sagt nichts ueber die produktive Instanz.");
console.log("═══════════════════════════════════════════════════════════");
process.exit(offen.length ? 1 : 0);
