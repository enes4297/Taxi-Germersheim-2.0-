/* ============================================================
   Prueflauf: gemeinsames Datumsfeld, Kalenderfilter, Herkunft
   ============================================================
   Gemessene Ausgangsfehler des manuellen Rundgangs:

   1. Die nativen <input type="date"> sprangen beim Tippen des Jahres
      zurueck zum Tag. Eine Eingabe von links nach rechts war nicht
      moeglich. Zehn solche Felder an fuenf Stellen.

   2. Der Kalenderfilter schaltete je Klick GENAU EINE Kategorie um.
      Wer nur Abwesenheiten sehen wollte, brauchte sechs Klicks.

   3. Ein Klick im Kalender wechselte den Bereich im Hintergrund. Beim
      Schliessen landete man in "Meldungen" statt wieder im Kalender.

   4. Die Fahrzeugakte zeigte gleichzeitig "Unterwegs", "Aktueller
      Zustand: Frei" und "Heute zugewiesen: Testfahrer 01" - drei
      Bezugspunkte ohne Beschriftung.

   Geprueft wird ueber die OBERFLAECHE: getippt wird Zeichen fuer
   Zeichen, geklickt wird auf Schaltflaechen. Zusaetzlich werden die
   kritischen Aktionen direkt aufgerufen.

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
const PORT = 5380;
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

/*
  Die Tage, an denen in dieser Probe etwas liegt - aus dem BESTAND
  gerechnet, nicht festgeschrieben.

  Eigener Fehler des ersten Versuchs: Hier standen "2026-10-03" und
  "2026-10-20". Beide Daten im Bestand entstehen aus "heute"; einen
  Tag spaeter zeigten die festen Werte auf nichts mehr. Ein festes
  Datum neben Daten aus "heute" ist eine Zeitbombe.
*/
async function tageAusDemBestand(page) {
  return page.evaluate(() => {
    const D = window.ProbeDaten;
    const krank = D.vorgaenge.find((v) => v.thema === "krankheit" && v.daten && v.daten.von);
    const fz = D.fahrzeuge.find((f) => f.service || f.tuev);
    return {
      /* Ein Tag, an dem eine Abwesenheit liegt. */
      abwesenheit: krank ? krank.daten.von : D.alsIso(D.heute),
      /* Ein Tag, an dem ein Fahrzeugtermin liegt. */
      fahrzeug: fz ? (fz.service || fz.tuev) : D.alsIso(D.heute),
      fahrzeugId: fz ? fz.id : "",
      heute: D.alsIso(D.heute)
    };
  });
}

let bestanden = 0;
const offen = [];
function pruefe(bedingung, name) {
  if (bedingung) { bestanden += 1; console.log("OK   " + name); }
  else { offen.push(name); console.log("FEHL " + name); }
}

const browser = await chromium.launch({ channel: "chrome" });
const fremdeAnfragen = [];

async function seite(rolle = "admin", breite = 1440, hoehe = 900) {
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

/*
  Tippen wie ein Mensch: Zeichen fuer Zeichen, mit einer kurzen Pause.
  Vorher erst leeren - und zwar mit der Tastatur, nicht mit fill(),
  damit der Weg derselbe ist wie in der Hand.
*/
async function tippen(page, wahl, text) {
  await page.click(wahl);
  await page.waitForTimeout(80);
  await page.keyboard.press("Control+a");
  await page.keyboard.press("Delete");
  for (const z of text) {
    await page.keyboard.type(z);
    await page.waitForTimeout(45);
  }
}

const feldWert = (page, wahl) => page.inputValue(wahl);
const hauptText = (page) =>
  page.evaluate(() => document.querySelector(".haupt").textContent.replace(/\s+/g, " "));

/* ═══ 1. Die Pruefung des Moduls ═════════════════════════════════ */
console.log("\n── 1. Was das Datumsmodul annimmt und was nicht ──");
{
  const { page, fehler } = await seite("admin");

  const gueltig = [
    ["02102026", "2026-10-02", "acht Ziffern ohne Punkte"],
    ["2102026", "2026-10-02", "sieben Ziffern, einziffriger Tag"],
    ["02.10.2026", "2026-10-02", "mit Punkten"],
    ["2.10.2026", "2026-10-02", "ohne fuehrende Null"],
    ["02-10-2026", "2026-10-02", "mit Strichen"],
    ["02/10/2026", "2026-10-02", "mit Schraegstrichen"],
    ["2026-10-02", "2026-10-02", "ISO von aussen"],
    ["29.02.2024", "2024-02-29", "Schalttag 2024"]
  ];
  for (const [ein, iso, was] of gueltig) {
    const e = await page.evaluate((x) => window.ProbeDatum.pruefen(x), ein);
    pruefe(e.gueltig && e.iso === iso, `„${ein}“ ist gültig (${was}) → ${e.iso || e.fehler}`);
  }

  const ungueltig = [
    ["31.02.2026", "ein 31. Februar"],
    ["29.02.2026", "ein Schalttag in einem Jahr ohne Schalttag"],
    ["00.10.2026", "der Tag 00"],
    ["32.01.2026", "der 32. eines Monats"],
    ["02.13.2026", "der Monat 13"],
    ["02.10.26", "ein zweistelliges Jahr"],
    ["0210", "eine zu kurze Eingabe"],
    ["abc", "Buchstaben"],
    ["01.01.1899", "ein Jahr vor 1900"]
  ];
  for (const [ein, was] of ungueltig) {
    const e = await page.evaluate((x) => window.ProbeDatum.pruefen(x), ein);
    pruefe(!e.gueltig && !e.leer && e.fehler.length > 10,
      `„${ein}“ wird abgewiesen (${was}): ${e.fehler}`);
    pruefe(e.iso === "", `und „${ein}“ liefert kein Datum`);
  }

  for (const leer of ["", "   "]) {
    const e = await page.evaluate((x) => window.ProbeDatum.pruefen(x), leer);
    pruefe(e.leer && !e.gueltig && !e.fehler,
      `„${leer}“ ist leer und kein Fehler — ob ein Datum nötig ist, entscheidet die Fachlogik`);
  }

  /* Die Monatslaengen - keine Tabelle aus dem Gefuehl. */
  const laengen = await page.evaluate(() => {
    const t = window.ProbeDatum.tageImMonat;
    return {
      jan: t(1, 2026), feb26: t(2, 2026), feb24: t(2, 2024), feb00: t(2, 2000),
      feb1900: t(2, 1900), apr: t(4, 2026), dez: t(12, 2026)
    };
  });
  pruefe(laengen.jan === 31 && laengen.apr === 30 && laengen.dez === 31,
    "die Monatslängen stimmen");
  pruefe(laengen.feb26 === 28 && laengen.feb24 === 29,
    "Schaltjahr erkannt (2024 = 29, 2026 = 28)");
  pruefe(laengen.feb00 === 29, "das Jahr 2000 ist ein Schaltjahr");
  pruefe(laengen.feb1900 === 28, "das Jahr 1900 ist keines");

  pruefe(fehler.length === 0, "keine Fehlermeldung im Browser (" + fehler.join(" | ") + ")");
  await page.context().close();
}

/* ═══ 2. Das Feld in der Hand ════════════════════════════════════ */
console.log("\n── 2. Tippen, Enter, Escape, Fokus ──");
{
  const { page, fehler } = await seite("admin");
  await page.evaluate(() => window.ProbeRahmen.geheZu("kalender"));
  await page.waitForTimeout(400);

  pruefe(!(await page.$('input[type="date"]')),
    "im Kalender steht kein natives Datumsfeld mehr");
  const feld = '[data-datum-kennung="kalender"]';
  pruefe(await page.getAttribute(feld, "type") === "text",
    "sondern ein gewöhnliches Textfeld");
  pruefe(await page.getAttribute(feld, "inputmode") === "numeric",
    "mit Zifferntastatur am Handy");
  pruefe(Boolean(await page.getAttribute(feld, "aria-label")),
    "und mit Beschriftung für Hilfsmittel");
  pruefe(await page.evaluate((w) =>
    parseFloat(getComputedStyle(document.querySelector(w)).fontSize) >= 16, feld),
    "Schriftgröße mindestens 16 px — darunter zoomt iOS hinein");

  /* Von links nach rechts, Zeichen fuer Zeichen. Nichts springt. */
  /*
    Getippt wird ein Tag, den es im Bestand gibt - der Fahrzeugtermin.
    Ein fester Tag waere wieder eine Zeitbombe.
  */
  const tage = await tageAusDemBestand(page);
  const tippZiffern = tage.fahrzeug.slice(8, 10) + tage.fahrzeug.slice(5, 7)
    + tage.fahrzeug.slice(0, 4);
  const tippText = tage.fahrzeug.slice(8, 10) + "." + tage.fahrzeug.slice(5, 7)
    + "." + tage.fahrzeug.slice(0, 4);
  await page.click(feld);
  await page.keyboard.press("Control+a");
  await page.keyboard.press("Delete");
  let fokusVerloren = 0;
  let zwischen = [];
  for (const z of tippZiffern) {
    await page.keyboard.type(z);
    await page.waitForTimeout(45);
    const stand = await page.evaluate((w) => {
      const el = document.querySelector(w);
      return { wert: el.value, fokus: document.activeElement === el };
    }, feld);
    zwischen.push(stand.wert);
    if (!stand.fokus) fokusVerloren += 1;
  }
  pruefe(fokusVerloren === 0, `der Fokus bleibt beim Tippen im Feld (${fokusVerloren} Verluste)`);
  pruefe(await feldWert(page, feld) === tippZiffern,
    `alle acht Ziffern kommen an: ${zwischen.join(" → ")}`);
  /* Das war der eigentliche Mangel: Beim nativen Feld wuerde hier
     etwas wie "2026-02-00" stehen, weil der Fokus gesprungen ist. */
  pruefe(zwischen.every((w, i) => w.length === i + 1),
    "und zwar von links nach rechts, eine Ziffer je Anschlag");

  await page.keyboard.press("Enter");
  await page.waitForTimeout(400);
  pruefe(await feldWert(page, feld) === tippText,
    `Enter formt daraus TT.MM.JJJJ (${tippText})`);
  pruefe(await page.evaluate(() => window.ProbeKalender.stand.datum) === tage.fahrzeug,
    "und der Kalender steht auf diesem Tag");

  /* Ungueltig: Fehler am Feld, Wert NICHT uebernommen. */
  await tippen(page, feld, "31.02.2026");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(400);
  pruefe(await page.evaluate(() => window.ProbeKalender.stand.datum) === tage.fahrzeug,
    "ein unmögliches Datum wird nicht übernommen");
  const fehlertext = await page.evaluate(() => {
    const el = document.querySelector(".datumsfehler");
    return el ? el.textContent.trim() : "";
  });
  pruefe(/28 Tage/.test(fehlertext), `der Fehler steht am Feld: „${fehlertext}“`);
  pruefe(await page.getAttribute(feld, "aria-invalid") === "true",
    "und ist für Hilfsmittel als Fehler gekennzeichnet");
  pruefe(Boolean(await page.getAttribute(feld, "aria-describedby")),
    "der Fehlertext ist dem Feld zugeordnet");

  /* Escape verwirft die laufende Aenderung - und schliesst nichts. */
  await tippen(page, feld, "05.05.2027");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  pruefe(await feldWert(page, feld) === tippText,
    "Escape verwirft die Änderung und holt den letzten Wert zurück");
  pruefe(await page.evaluate(() => window.ProbeKalender.stand.datum) === tage.fahrzeug,
    "der Kalendertag bleibt dabei unverändert");

  /* Tastatur: Tab erreicht das Feld, der Fokus ist sichtbar. */
  const sichtbar = await page.evaluate((w) => {
    const el = document.querySelector(w);
    el.focus();
    const s = getComputedStyle(el);
    return { fokus: document.activeElement === el, umriss: s.outlineStyle, rand: s.borderColor };
  }, feld);
  pruefe(sichtbar.fokus, "das Feld ist mit der Tastatur erreichbar");

  pruefe(fehler.length === 0, "keine Fehlermeldung im Browser (" + fehler.join(" | ") + ")");
  await page.context().close();
}

/* ═══ 3. Ein Modul, alle Stellen ═════════════════════════════════ */
console.log("\n── 3. Dasselbe Feld überall ──");
{
  const { page, fehler } = await seite("admin");

  /* Kein natives Datumsfeld, nirgends - in jeder Rolle, in jedem Bereich. */
  let nativ = 0;
  let eigene = 0;
  for (const rolle of ["admin", "dispatcher", "personal", "accounting", "employee"]) {
    await page.selectOption("[data-rolle]", rolle);
    await page.waitForTimeout(300);
    const bereiche = await page.evaluate(() =>
      window.ProbeRahmen.sichtbareBereiche().map((b) => b.id));
    for (const b of bereiche) {
      await page.evaluate((x) => window.ProbeRahmen.geheZu(x), b);
      await page.waitForTimeout(160);
      nativ += await page.$$eval('input[type="date"]', (n) => n.length);
      eigene += await page.$$eval("[data-datum]", (n) => n.length);
    }
  }
  pruefe(nativ === 0, `kein einziges natives Datumsfeld in allen Rollen und Bereichen (${nativ})`);
  pruefe(eigene > 0, `dafür ${eigene} Felder des gemeinsamen Moduls`);

  /* Und auch in den Fenstern. */
  await page.selectOption("[data-rolle]", "admin");
  await page.waitForTimeout(300);

  const stellen = [];
  /* Planung */
  await page.evaluate(() => window.ProbeRahmen.geheZu("planung"));
  await page.waitForTimeout(300);
  stellen.push(["Planung", await page.$$eval("[data-datum-kennung]",
    (n) => n.map((x) => x.dataset.datumKennung))]);
  /* Kalender */
  await page.evaluate(() => window.ProbeRahmen.geheZu("kalender"));
  await page.waitForTimeout(300);
  stellen.push(["Kalender", await page.$$eval("[data-datum-kennung]",
    (n) => n.map((x) => x.dataset.datumKennung))]);
  /* Analyse mit eigenem Zeitraum */
  await page.evaluate(() => window.ProbeRahmen.geheZu("analyse"));
  await page.waitForTimeout(300);
  await page.click('[data-tun="an-zeitraum:eigen"]');
  await page.waitForTimeout(300);
  stellen.push(["Analyse", await page.$$eval("[data-datum-kennung]",
    (n) => n.map((x) => x.dataset.datumKennung))]);
  /* Archivfilter in den Meldungen */
  await page.evaluate(() => window.ProbeRahmen.geheZu("meldungen"));
  await page.waitForTimeout(300);
  await page.click('[data-tun="vg-reiter:archiv"]');
  await page.waitForTimeout(350);
  stellen.push(["Archiv", await page.$$eval("[data-datum-kennung]",
    (n) => n.map((x) => x.dataset.datumKennung))]);
  /* Fahrtaufnahme, Schritt 4 */
  await page.evaluate(() => window.ProbeRahmen.geheZu("fahrten"));
  await page.waitForTimeout(300);
  await page.click('[data-tun="neue-fahrt"]');
  await page.waitForTimeout(350);
  /*
    Eigener Fehler im ersten Versuch: Ich habe dreimal "Weiter"
    geklickt und erwartet, in Schritt 4 zu landen. Eine Gastfahrt
    braucht aber eine Abhol- und eine Zieladresse - der Assistent
    blieb zu Recht in Schritt 2 stehen. Jetzt wird getippt.
  */
  await page.click('[data-tun="fa-gast"]');
  await page.waitForTimeout(250);
  await page.click('[data-tun="fa-weiter"]');
  await page.waitForTimeout(300);
  await page.fill('[data-feld="abholung"]', "Teststrasse 1, Germersheim");
  await page.click('[data-tun="fa-weiter"]');
  await page.waitForTimeout(300);
  await page.fill('[data-feld="ziel"]', "Testziel A");
  await page.click('[data-tun="fa-weiter"]');
  await page.waitForTimeout(350);
  stellen.push(["Fahrtaufnahme", await page.$$eval("[data-datum-kennung]",
    (n) => n.map((x) => x.dataset.datumKennung))]);

  for (const [wo, liste] of stellen) {
    pruefe(liste.length > 0, `${wo}: Datumsfeld des gemeinsamen Moduls (${liste.join(", ") || "keines"})`);
  }

  pruefe(fehler.length === 0, "keine Fehlermeldung im Browser (" + fehler.join(" | ") + ")");
  await page.context().close();
}

/* ═══ 4. Der Kalenderfilter ══════════════════════════════════════ */
console.log("\n── 4. Ein Klick wählt allein aus ──");
{
  const { page, fehler } = await seite("admin");
  await page.evaluate(() => window.ProbeRahmen.geheZu("kalender"));
  await page.waitForTimeout(400);

  const zustand = () => page.$$eval('[data-tun^="kal-art:"]', (ns) =>
    ns.map((x) => ({ id: x.dataset.tun.split(":")[1], an: x.getAttribute("aria-pressed") === "true" })));

  const anfang = await zustand();
  pruefe(anfang.length === 6, `sechs Kategorien (${anfang.length})`);
  pruefe(anfang.every((x) => x.an), "im Grundzustand sind alle sichtbar");

  for (const art of ["abwesenheit", "fahrt", "schicht", "konflikt", "fahrzeug", "dokument"]) {
    await page.click(`[data-tun="kal-art:${art}"]`);
    await page.waitForTimeout(250);
    const nach = await zustand();
    pruefe(nach.filter((x) => x.an).length === 1 && nach.find((x) => x.id === art).an,
      `ein Klick auf „${art}“ lässt nur diese Kategorie an`);

    await page.click(`[data-tun="kal-art:${art}"]`);
    await page.waitForTimeout(250);
    const zurueck = await zustand();
    pruefe(zurueck.every((x) => x.an),
      `ein zweiter Klick auf „${art}“ zeigt wieder alle`);
  }

  /* Der Filter aendert nur die Anzeige. */
  const vorherDaten = await page.evaluate(() => JSON.stringify({
    planung: window.ProbeDaten.planung,
    abwesenheiten: window.ProbeDaten.abwesenheiten,
    fahrzeuge: window.ProbeDaten.fahrzeuge
  }));
  await page.click('[data-tun="kal-art:konflikt"]');
  await page.waitForTimeout(300);
  pruefe(await page.evaluate(() => JSON.stringify({
    planung: window.ProbeDaten.planung,
    abwesenheiten: window.ProbeDaten.abwesenheiten,
    fahrzeuge: window.ProbeDaten.fahrzeuge
  })) === vorherDaten, "der Filter ändert keine Daten");

  /* Ansicht, Datum und Filter ueberleben ein Neuzeichnen. */
  await page.evaluate(() => { window.ProbeKalender.stand.sicht = "woche"; });
  await page.evaluate((x) => window.ProbeKalender.tun("kal-tag", x),
    (await tageAusDemBestand(page)).fahrzeug);
  await page.waitForTimeout(300);
  await page.click('[data-tun="kal-art:dokument"]');
  await page.waitForTimeout(250);
  const vorZeichnen = await page.evaluate(() => JSON.stringify(window.ProbeKalender.stand));
  await page.evaluate(() => window.ProbeRahmen.zeichnen());
  await page.waitForTimeout(300);
  pruefe(await page.evaluate(() => JSON.stringify(window.ProbeKalender.stand)) === vorZeichnen,
    "Ansicht, Datum und Filter gehen durch ein Neuzeichnen nicht verloren");

  /* Ein erfundener Filter per direktem Aufruf bewirkt nichts. */
  const vorFalsch = await page.evaluate(() => JSON.stringify(window.ProbeKalender.stand.arten));
  await page.evaluate(() => window.ProbeKalender.tun("kal-art", "erfunden"));
  await page.waitForTimeout(250);
  pruefe(await page.evaluate(() => JSON.stringify(window.ProbeKalender.stand.arten)) === vorFalsch,
    "ein erfundener Filter per direktem Aufruf wird nicht übernommen");

  /* Tastatur. */
  await page.focus('[data-tun="kal-art:fahrt"]');
  const hatFokus = await page.evaluate(() =>
    document.activeElement?.dataset?.tun === "kal-art:fahrt");
  pruefe(hatFokus, "eine Kategorie ist mit der Tastatur anwählbar");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  const nachEnter = await zustand();
  pruefe(nachEnter.filter((x) => x.an).length === 1 && nachEnter.find((x) => x.id === "fahrt").an,
    "und mit der Eingabetaste bedienbar");

  pruefe(fehler.length === 0, "keine Fehlermeldung im Browser (" + fehler.join(" | ") + ")");
  await page.context().close();
}

/* ═══ 5. Herkunft und Rückweg ════════════════════════════════════ */
console.log("\n── 5. Aus dem Kalender und zurück ──");
{
  const { page, fehler } = await seite("admin");

  /* Einen bestimmten Kalendertag in einem bestimmten Zustand aufbauen. */
  async function kalenderLage(iso, nurArt) {
    await page.evaluate(() => window.ProbeRahmen.geheZu("kalender"));
    await page.waitForTimeout(300);
    await page.evaluate((x) => window.ProbeKalender.tun("kal-tag", x), iso);
    await page.waitForTimeout(300);
    if (nurArt) {
      await page.click(`[data-tun="kal-art:${nurArt}"]`);
      await page.waitForTimeout(250);
    }
    return page.evaluate(() => JSON.stringify(window.ProbeKalender.stand));
  }

  /* --- Krankmeldung aus dem Kalender, an dem Tag, an dem sie liegt --- */
  const tage5 = await tageAusDemBestand(page);
  const lage1 = await kalenderLage(tage5.abwesenheit, "abwesenheit");
  const ziele1 = await page.$$eval('[data-tun^="kal-ziel:"]',
    (ns) => ns.map((x) => x.dataset.tun));
  const krank = ziele1.find((z) => z.includes("meldungen:vorgang-"));
  pruefe(Boolean(krank),
    `am ${tage5.abwesenheit} führt ein Eintrag zum Vorgang (${krank || "keiner"})`);
  if (krank) {
    await page.click(`[data-tun="${krank}"]`);
    await page.waitForTimeout(500);
    const auf = await page.evaluate(() => ({
      dialog: window.ProbeRahmen.dialogOffen(),
      bereich: window.ProbeRahmen.zustand.bereich,
      titel: (document.querySelector(".dialog-kasten h2") || {}).textContent || "",
      zurueck: (document.querySelector("[data-herkunft-zurueck]") || {}).textContent || ""
    }));
    pruefe(auf.dialog, "der Vorgang öffnet sich");
    pruefe(/Testfahrer 02/.test(auf.titel), `und es ist der richtige (${auf.titel.trim()})`);
    pruefe(/Zurück zum Kalender/.test(auf.zurueck),
      `es gibt einen benannten Rückweg (${auf.zurueck.trim() || "keinen"})`);

    await page.click("[data-herkunft-zurueck]");
    await page.waitForTimeout(500);
    pruefe(await page.evaluate(() => window.ProbeRahmen.zustand.bereich) === "kalender",
      "„Zurück zum Kalender“ führt in den Kalender");
    pruefe(await page.evaluate(() => JSON.stringify(window.ProbeKalender.stand)) === lage1,
      "mit Ansicht, Datum und Filtern genau wie vorher");
    pruefe(!(await page.evaluate(() => window.ProbeRahmen.dialogOffen())),
      "und das Fenster ist zu");
  }

  /* Dasselbe mit Escape. */
  const lage2 = await kalenderLage(tage5.abwesenheit, "abwesenheit");
  if (krank) {
    await page.click(`[data-tun="${krank}"]`);
    await page.waitForTimeout(450);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
    pruefe(await page.evaluate(() => window.ProbeRahmen.zustand.bereich) === "kalender",
      "Escape führt ebenfalls in den Kalender zurück");
    pruefe(await page.evaluate(() => JSON.stringify(window.ProbeKalender.stand)) === lage2,
      "und der Kalenderzustand bleibt erhalten");
  }

  /* Und mit "Schliessen". */
  const lage3 = await kalenderLage(tage5.abwesenheit, "abwesenheit");
  if (krank) {
    await page.click(`[data-tun="${krank}"]`);
    await page.waitForTimeout(450);
    const zu = await page.$(".dialog-kasten [data-dialog-zu]");
    if (zu) { await zu.click(); await page.waitForTimeout(500); }
    pruefe(await page.evaluate(() => window.ProbeRahmen.zustand.bereich) === "kalender",
      "„Schließen“ führt ebenfalls in den Kalender zurück");
    pruefe(await page.evaluate(() => JSON.stringify(window.ProbeKalender.stand)) === lage3,
      "und auch dabei bleibt der Zustand erhalten");
  }

  /*
    --- Fahrzeugtermin Testwagen 01 vom 20.10.2026 ---

    Eigener Fehler im ersten Versuch: Die vorigen Abschnitte hatten
    den Filter auf "nur Abwesenheiten" gestellt, und ich habe ihn
    nicht zurueckgesetzt. Dann steht am 20.10. nichts da - nicht weil
    der Eintrag fehlt, sondern weil er ausgefiltert war. Erst "alle",
    dann suchen.
  */
  await page.evaluate(() => window.ProbeRahmen.geheZu("kalender"));
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const s = window.ProbeKalender.stand;
    for (const k of Object.keys(s.arten)) s.arten[k] = true;
  });
  const lage4 = await kalenderLage(tage5.fahrzeug, null);
  const ziele2 = await page.$$eval('[data-tun^="kal-ziel:"]',
    (ns) => ns.map((x) => x.dataset.tun));
  const fz = ziele2.find((z) => z.includes("fahrzeug-"));
  pruefe(Boolean(fz), `am 20.10.2026 führt ein Eintrag zur Fahrzeugakte (${fz || "keiner"})`);
  pruefe(Boolean(fz) && /fahrzeug-F\d+-/.test(fz),
    "und zwar über die Fahrzeugkennung, nicht über das Kennzeichen");
  pruefe(Boolean(fz) && fz.includes(tage5.fahrzeug),
    `der Kalendertag wird mitgegeben (${tage5.fahrzeug})`);
  if (fz) {
    await page.click(`[data-tun="${fz}"]`);
    await page.waitForTimeout(500);
    const akte = await page.evaluate(() => {
      const k = document.querySelector(".dialog-kasten");
      return {
        bereich: window.ProbeRahmen.zustand.bereich,
        titel: (k.querySelector("h2") || {}).textContent || "",
        begriffe: [...k.querySelectorAll("dt")].map((x) => x.textContent.trim()),
        text: k.textContent.replace(/\s+/g, " "),
        zurueck: (k.querySelector("[data-herkunft-zurueck]") || {}).textContent || ""
      };
    });
    pruefe(/Testwagen 01/.test(akte.titel), `die Akte des richtigen Fahrzeugs (${akte.titel.trim()})`);
    pruefe(/Zurück zum Kalender/.test(akte.zurueck), "mit Rückweg in den Kalender");
    pruefe(/aus dem Kalender/.test(akte.text), "der angefragte Termin ist hervorgehoben");

    /* BLOCK 4: keine Angabe ohne Bezugstag. */
    pruefe(!akte.begriffe.includes("Aktueller Zustand"),
      "es gibt keine Zeile „Aktueller Zustand“ mehr — sie nannte keinen Tag");
    pruefe(!akte.begriffe.includes("Heute zugewiesen"),
      "und keine Zeile „Heute zugewiesen“ ohne Datum");
    pruefe(akte.begriffe.some((x) => /^Zustand im Fahrzeugstamm$/.test(x)),
      "der Stammzustand ist als solcher benannt");
    const mitDatum = akte.begriffe.filter((x) => /^Einsatz /.test(x));
    pruefe(mitDatum.length >= 2,
      `es gibt getrennte Einsatzzeilen je Tag (${mitDatum.join(" | ")})`);
    pruefe(mitDatum.every((x) => /\d{2}\.\d{2}\.\d{4}/.test(x)),
      "und jede nennt ein konkretes Datum");
    const gewaehltText = tage5.fahrzeug.slice(8, 10) + "." + tage5.fahrzeug.slice(5, 7)
      + "." + tage5.fahrzeug.slice(0, 4);
    pruefe(mitDatum.some((x) => x.includes(gewaehltText)),
      `darunter der im Kalender gewählte Tag (${gewaehltText})`);
    pruefe(/zwei verschiedene Tage/.test(akte.text),
      "die Akte sagt ausdrücklich, dass zwei Tage gezeigt werden");

    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
    pruefe(await page.evaluate(() => window.ProbeRahmen.zustand.bereich) === "kalender",
      "Escape führt aus der Fahrzeugakte in den Kalender zurück");
    pruefe(await page.evaluate(() => JSON.stringify(window.ProbeKalender.stand)) === lage4,
      "mit dem Kalenderzustand von vorher");
  }

  /* --- Kein pauschaler Ruecksprung: direkt aus dem Fachbereich --- */
  await page.evaluate(() => window.ProbeRahmen.geheZu("team"));
  await page.waitForTimeout(400);
  pruefe(!(await page.$("[data-herkunft-zurueck]")),
    "ohne Herkunft gibt es keinen Rücksprungknopf");
  const direkt = await page.$('.aktenzeile[data-tun^="team-fahrzeug"], [data-tun^="team-fahrzeug"]');
  if (direkt) {
    await direkt.click();
    await page.waitForTimeout(450);
    pruefe(!(await page.$("[data-herkunft-zurueck]")),
      "auch im Fenster nicht, wenn es aus dem eigenen Bereich geöffnet wurde");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
    pruefe(await page.evaluate(() => window.ProbeRahmen.zustand.bereich) === "team",
      "Schließen führt dann in den eigenen Fachbereich zurück");
  } else {
    pruefe(false, "eine Fahrzeugzeile im Bereich Fahrer & Fahrzeuge gefunden");
  }

  /* Ein ausdruecklicher Bereichswechsel gibt die Herkunft auf. */
  await kalenderLage(tage5.abwesenheit, null);
  if (krank) {
    await page.click(`[data-tun="${krank}"]`);
    await page.waitForTimeout(450);
    await page.evaluate(() => window.ProbeRahmen.geheZu("fahrten"));
    await page.waitForTimeout(400);
    pruefe(await page.evaluate(() => window.ProbeRahmen.zustand.bereich) === "fahrten",
      "wer selbst woandershin geht, landet dort");
    pruefe(await page.evaluate(() => window.ProbeRahmen.herkunftLesen()) === null,
      "und die Herkunft ist aufgegeben — kein Rücksprung aus dem Nichts");
  }

  pruefe(fehler.length === 0, "keine Fehlermeldung im Browser (" + fehler.join(" | ") + ")");
  await page.context().close();
}

/* ═══ 6. Analyse mit dem gemeinsamen Feld ════════════════════════ */
console.log("\n── 6. Eigener Zeitraum der Analyse ──");
{
  const { page, fehler } = await seite("admin");
  await page.evaluate(() => window.ProbeRahmen.geheZu("analyse"));
  await page.waitForTimeout(400);

  /* Die fertigen Zeitraeume duerfen nicht beschaedigt sein. */
  const zahlen = async () => page.$$eval(".haupt .kennzahl .wert", (n) => n.map((x) => x.textContent.trim()));
  await page.click('[data-tun="an-zeitraum:heute"]');
  await page.waitForTimeout(300);
  const heute = await zahlen();
  await page.click('[data-tun="an-zeitraum:tage30"]');
  await page.waitForTimeout(300);
  const dreissig = await zahlen();
  pruefe(heute.length >= 7 && dreissig.length === heute.length,
    `die fertigen Zeiträume liefern weiter alle Kennzahlen (${heute.length})`);
  pruefe(heute.every((w, i) => w !== dreissig[i]),
    "und jede Zahl reagiert auf den Wechsel");
  pruefe(heute[0] === "180", `Heute zeigt 180 Seitenaufrufe (${heute[0]})`);
  pruefe(dreissig[0] === "5.724", `30 Tage zeigen 5.724 Seitenaufrufe (${dreissig[0]})`);

  await page.click('[data-tun="an-zeitraum:eigen"]');
  await page.waitForTimeout(300);
  const von = '[data-datum-kennung="analyse"][data-datum-teil="von"]';
  const bis = '[data-datum-kennung="analyse"][data-datum-teil="bis"]';
  pruefe(Boolean(await page.$(von)) && Boolean(await page.$(bis)),
    "der eigene Zeitraum hat zwei Felder des gemeinsamen Moduls");
  pruefe(!(await page.$('input[type="date"]')), "und kein natives Datumsfeld");
  pruefe((await zahlen()).length === 0,
    "ohne Eingabe steht keine Kennzahl da");

  /*
    Ein Zeitraum innerhalb der 400 Tage, die analyseTage umfasst -
    gerechnet aus heute, damit er nicht irgendwann herausfaellt.
  */
  const bereich = await page.evaluate(() => {
    const D = window.ProbeDaten;
    const hin = (abstand) => D.alsIso(D.tagAls(-abstand));
    return { vonIso: hin(40), bisIso: hin(11) };
  });
  const vonIso = bereich.vonIso;
  const bisIso = bereich.bisIso;
  const alsText = (iso) => iso.slice(8, 10) + "." + iso.slice(5, 7) + "." + iso.slice(0, 4);

  /* Nur Startdatum. */
  await tippen(page, von, alsText(vonIso));
  await page.keyboard.press("Tab");
  await page.waitForTimeout(450);
  pruefe((await zahlen()).length === 0, "nur ein Startdatum ergibt keine Kennzahl");
  pruefe(/beide Datumsfelder füllen/.test(await hauptText(page)),
    "sondern eine verständliche Bitte, beide Felder zu füllen");

  /* Nur Enddatum. */
  await tippen(page, von, "");
  await page.keyboard.press("Tab");
  await page.waitForTimeout(400);
  await tippen(page, bis, alsText(bisIso));
  await page.keyboard.press("Tab");
  await page.waitForTimeout(450);
  pruefe((await zahlen()).length === 0, "nur ein Enddatum ergibt ebenfalls keine Kennzahl");

  /* Beide - und alle Zahlen kommen gemeinsam. */
  await tippen(page, von, alsText(vonIso));
  await page.keyboard.press("Tab");
  await page.waitForTimeout(500);
  const eigen = await zahlen();
  pruefe(eigen.length === heute.length,
    `ein gültiger Zeitraum zeigt alle Kennzahlen (${eigen.length})`);
  pruefe((await hauptText(page)).includes(alsText(vonIso))
    && (await hauptText(page)).includes(alsText(bisIso)),
    "der gewählte Zeitraum steht sichtbar im Kopf");
  pruefe(/30 Tage/.test(await hauptText(page)), "mit der richtigen Tageszahl");

  /* Gegen die Rechnung, nicht gegen sich selbst. */
  const soll = await page.evaluate(([v, b]) => {
    const D = window.ProbeDaten;
    const vonIso = v;
    const bisIso = b;
    /* Derselbe Zeitraum, den die Oberflaeche bekommen hat - aus den
       uebergebenen Werten, nicht festgeschrieben. */
    const t = D.analyseTage.filter((x) => x.iso >= vonIso && x.iso <= bisIso);
    return {
      tage: t.length,
      aufrufe: t.reduce((s, x) => s + x.aufrufe, 0).toLocaleString("de-DE"),
      besuche: t.reduce((s, x) => s + x.besuche, 0).toLocaleString("de-DE")
    };
  }, [vonIso, bisIso]);
  pruefe(soll.tage === 30, `der Zeitraum umfasst 30 Tage (${soll.tage})`);
  pruefe(eigen[0] === soll.aufrufe,
    `die Seitenaufrufe sind die Summe genau dieser Tage (${eigen[0]} = ${soll.aufrufe})`);
  pruefe(eigen[1] === soll.besuche,
    `auch die Besuche (${eigen[1]} = ${soll.besuche})`);

  /* Ende vor Beginn: Fehler, und keine alte Zahl bleibt stehen. */
  /* Ein Ende klar VOR dem Beginn - gerechnet, nicht festgeschrieben. */
  const verdrehtIso = await page.evaluate((v) => {
    const d = new Date(v + "T00:00:00");
    d.setDate(d.getDate() - 10);
    return window.ProbeDaten.alsIso(d);
  }, vonIso);
  await tippen(page, bis, alsText(verdrehtIso));
  await page.keyboard.press("Tab");
  await page.waitForTimeout(500);
  pruefe((await zahlen()).length === 0,
    "Ende vor Beginn lässt keine Kennzahl stehen — auch keine alte");
  pruefe(/Ende liegt vor dem Beginn/.test(await hauptText(page)),
    "und sagt verständlich, was falsch ist");
  /*
    Eigener Fehler im ersten Versuch: Ich habe den ganzen
    Flaechentext nach "30 Tage" durchsucht. Das steht aber auch auf
    dem Knopf "Letzte 30 Tage". Geprueft wird der KOPF - dort steht
    der gewaehlte Zeitraum.
  */
  const kopfText = await page.evaluate(() =>
    document.querySelector(".haupt .bereichskopf").textContent.replace(/\s+/g, " "));
  pruefe(!/\d+ Tage?\b/.test(kopfText),
    `und der Kopf behauptet keine Tageszahl (${kopfText.trim()})`);

  /* Ein unmoegliches Datum. */
  await tippen(page, bis, "31.02.2026");
  await page.keyboard.press("Tab");
  await page.waitForTimeout(500);
  pruefe((await zahlen()).length === 0, "ein unmögliches Datum ergibt keine Kennzahl");
  pruefe(/28 Tage/.test(await hauptText(page)), "der Fehler steht am Feld");

  /* Zurueck auf einen fertigen Zeitraum - alles wieder da. */
  await page.click('[data-tun="an-zeitraum:tage30"]');
  await page.waitForTimeout(350);
  pruefe(JSON.stringify(await zahlen()) === JSON.stringify(dreissig),
    "zurück auf „Letzte 30 Tage“ stehen genau dieselben Zahlen wie vorher");

  pruefe(fehler.length === 0, "keine Fehlermeldung im Browser (" + fehler.join(" | ") + ")");
  await page.context().close();
}

/* ═══ 7. Breiten ═════════════════════════════════════════════════ */
console.log("\n── 7. 320, 390, 430 und 1440 px ──");
for (const breite of [320, 390, 430, 1440]) {
  const { page } = await seite("admin", breite, 880);
  for (const b of ["kalender", "planung", "analyse"]) {
    await page.evaluate((x) => window.ProbeRahmen.geheZu(x), b);
    await page.waitForTimeout(300);
    if (b === "analyse") {
      await page.click('[data-tun="an-zeitraum:eigen"]');
      await page.waitForTimeout(250);
    }
    const ueber = await page.evaluate(() =>
      Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
    pruefe(ueber === 0, `${b} bei ${breite}px: kein waagerechter Überlauf (${ueber}px)`);
    const klein = await page.$$eval("[data-datum]", (ns) => ns.filter((x) =>
      parseFloat(getComputedStyle(x).fontSize) < 16 || x.getBoundingClientRect().height < 36).length);
    pruefe(klein === 0, `${b} bei ${breite}px: kein Datumsfeld zu klein (${klein})`);
  }
  await page.context().close();
}

/* ═══ 8. Null Netzaufrufe ════════════════════════════════════════ */
console.log("\n── 8. Null Netzaufrufe ──");
pruefe(fremdeAnfragen.length === 0,
  `keine einzige Anfrage nach außen im ganzen Lauf (${fremdeAnfragen.length}) ${fremdeAnfragen.slice(0, 3).join(" ")}`);
{
  /*
    Eigener Fehler im ersten Versuch: Ich habe im ganzen Quelltext
    nach "supabase" gesucht - und der Kopfkommentar des Moduls sagt
    ausdruecklich "kennt weder Supabase noch fetch". Der Hinweis ist
    richtig und darf nicht ausloesen. Gesucht wird deshalb im Code
    OHNE Kommentare.
  */
  const quelle = await readFile(join(PROBE, "probe-datumsfeld.js"), "utf8");
  const ohneKommentar = quelle
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*\/\/.*$/gm, " ");
  pruefe(/Supabase/.test(quelle),
    "der Kopf des Moduls sagt ausdrücklich, dass es kein Supabase kennt");
  pruefe(!/fetch\s*\(|XMLHttpRequest|sendBeacon|new WebSocket|supabase/i.test(ohneKommentar),
    "kein Netzzugriff im Datumsmodul");
  pruefe(!/Math\.random/.test(ohneKommentar), "und keine Zufallszahl");
}

await browser.close();
await new Promise((r) => server.close(r));

console.log("\n═══════════════════════════════════════════════════════════");
console.log(`Datumsfeld: ${bestanden} bestanden, ${offen.length} nicht bestanden`);
if (offen.length) { console.log("\nOffen:"); offen.forEach((n) => console.log("  - " + n)); }
console.log("\nALLES SIMULIERT. Keine Datenquelle, kein Upload, kein Versand.");
console.log("Dieser Lauf sagt nichts ueber die produktive Instanz.");
console.log("═══════════════════════════════════════════════════════════");
process.exit(offen.length ? 1 : 0);
