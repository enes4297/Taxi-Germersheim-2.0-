/* ============================================================
   Prueflauf: Analyse - echte Zeitraumauswahl
   ============================================================
   Gemessener Ausgangsfehler des manuellen Rundgangs (Block 13):

   "Zeitraum: Letzte 7 Tage" stand als fester Text im Kopf. Kein
   Knopf, kein Hover, keine andere Wahl. Daneben standen feste
   Zahlen, die zu keinem Zeitraum gehoerten.

   Ursache im Code: probe-daten.js hielt ein Objekt
     const analyse = { zeitraum: "letzte 7 Tage", kennzahlen: [...], ... }
   mit fest hingeschriebenen Werten, und probe-bereiche.js gab
   a.zeitraum als Text aus. Es gab nichts zu waehlen, weil es keine
   Tageswerte gab, ueber die man haette rechnen koennen.

   Geprueft wird deshalb:
   - alle sieben Zeitraeume sind waehlbar und als gewaehlt erkennbar
   - der gewaehlte Zeitraum bleibt sichtbar, mit Von/Bis und Tageszahl
   - ALLE Kennzahlen aendern sich gemeinsam, keine bleibt stehen
   - zwei verschiedene Zeitraeume auf einer Seite sind ausgeschlossen:
     geprueft wird gegen die Summe derselben Tageswerte
   - Heute = 1 Tag, Gestern = 1 Tag, 7 Tage = 7, 30 Tage = 30
   - eigener Zeitraum mit zwei Feldern des gemeinsamen Datumsmoduls;
     halbe Eingabe behauptet nichts, Ende vor Beginn ist ein Fehler
   - Schaetzungen sind als Schaetzung gekennzeichnet, gezaehlte Werte
     als gezaehlt
   - keine Kachel sieht bedienbar aus, ohne es zu sein
   - null Netzaufrufe nach aussen im ganzen Lauf

   ALLES SIMULIERT. Es gibt keine Besuchermessung, keinen
   Trackingdienst und keine Datenquelle. Dieser Lauf sagt nichts
   ueber die produktive Instanz.
   ============================================================ */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";

const { chromium } = await import(
  "file:///" + join(process.cwd(), "fahrer/tests/node_modules/playwright/index.mjs").replace(/\\/g, "/")
);

const WURZEL = process.cwd();
const PROBE = join(WURZEL, "probe-betriebsportal");
const PORT = 5379;
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

/* Der Weg ueber die Oberflaeche: Bereich anklicken, nicht springen. */
async function inAnalyse(page) {
  /* Auf schmalen Breiten liegt die Bereichsleiste hinter dem Menue.
     Dann wird gesprungen - der Weg ueber die Oberflaeche wird in den
     Abschnitten A bis F auf 1440px genommen. */
  const knopf = await page.$('[data-bereich="analyse"]');
  if (knopf && await knopf.isVisible()) { await knopf.click(); }
  else { await page.evaluate(() => window.ProbeRahmen.geheZu("analyse")); }
  await page.waitForTimeout(400);
}

/* Liest alle Zahlen der Seite als eine Zeichenkette, zum Vergleich. */
const zahlenBild = (page) => page.evaluate(() => {
  const w = [...document.querySelectorAll(".haupt .kennzahl .wert")].map((x) => x.textContent.trim());
  const b = [...document.querySelectorAll(".haupt .balkenwert")].map((x) => x.textContent.trim());
  return w.join("|") + " // " + b.join("|");
});

const kopfText = (page) => page.evaluate(() =>
  document.querySelector(".haupt .bereichskopf").textContent.replace(/\s+/g, " ").trim());

console.log("\n--- A. Die Auswahl ist vorhanden und bedienbar ---\n");
{
  const { page, fehler } = await seite("admin");
  await inAnalyse(page);

  const chips = await page.$$eval('[data-tun^="an-zeitraum:"]', (ns) =>
    ns.map((n) => ({
      id: n.dataset.tun.split(":")[1],
      text: n.textContent.trim(),
      gedrueckt: n.getAttribute("aria-pressed"),
      tag: n.tagName,
      typ: n.getAttribute("type")
    })));

  const erwartet = ["heute", "gestern", "tage7", "tage30", "monat", "monatVorher", "eigen"];
  pruefe(chips.length === 7, `sieben Zeitraeume zur Wahl (${chips.length})`);
  for (const id of erwartet) {
    pruefe(chips.some((c) => c.id === id), `Zeitraum "${id}" ist waehlbar`);
  }
  pruefe(chips.every((c) => c.tag === "BUTTON" && c.typ === "button"),
    "jeder Zeitraum ist eine echte Schaltflaeche");
  pruefe(chips.every((c) => c.text.length > 2),
    "jede Schaltflaeche hat eine lesbare Beschriftung");
  pruefe(chips.filter((c) => c.gedrueckt === "true").length === 1,
    "genau einer ist als gewaehlt gekennzeichnet (aria-pressed)");

  /* Der Ausgangsfehler: fester Text ohne Wahl. */
  const kopf = await kopfText(page);
  pruefe(/Letzte 7 Tage/.test(kopf), "der gewaehlte Zeitraum steht im Kopf");
  pruefe(/\bbis\b/.test(kopf) && /Tage?$|Tage? /.test(kopf + " "),
    "und zwar mit Von/Bis und Tageszahl, nicht als nackter Text");

  pruefe(fehler.length === 0, "keine Fehlermeldung im Browser (" + fehler.join(" | ") + ")");
  await page.context().close();
}

console.log("\n--- B. Jede Wahl aendert jede Zahl, und zwar gemeinsam ---\n");
{
  const { page, fehler } = await seite("admin");
  await inAnalyse(page);

  const bilder = {};
  const koepfe = {};
  for (const id of ["heute", "gestern", "tage7", "tage30", "monat", "monatVorher"]) {
    await page.click(`[data-tun="an-zeitraum:${id}"]`);
    await page.waitForTimeout(250);
    bilder[id] = await zahlenBild(page);
    koepfe[id] = await kopfText(page);
    const gedrueckt = await page.$eval(`[data-tun="an-zeitraum:${id}"]`,
      (n) => n.getAttribute("aria-pressed"));
    pruefe(gedrueckt === "true", `nach dem Klick ist "${id}" als gewaehlt markiert`);
    pruefe(koepfe[id].includes("Zeitraum"), `und der Kopf nennt den Zeitraum (${id})`);
  }

  /* Kein Zeitraum darf dasselbe Zahlenbild liefern wie ein anderer -
     sonst haette die Wahl keine Wirkung. */
  const paare = Object.keys(bilder);
  let gleich = [];
  for (let i = 0; i < paare.length; i += 1) {
    for (let j = i + 1; j < paare.length; j += 1) {
      if (bilder[paare[i]] === bilder[paare[j]]) gleich.push(paare[i] + "=" + paare[j]);
    }
  }
  pruefe(gleich.length === 0,
    "kein Zeitraum zeigt dieselben Zahlen wie ein anderer (" + gleich.join(", ") + ")");

  /* Und zwar ALLE Kennzahlen, nicht nur eine. */
  const heute = bilder.heute.split(" // ")[0].split("|");
  const dreissig = bilder.tage30.split(" // ")[0].split("|");
  pruefe(heute.length === dreissig.length && heute.length >= 7,
    `beide Ansichten zeigen gleich viele Kennzahlen (${heute.length})`);
  const unveraendert = heute.filter((w, i) => w === dreissig[i]);
  pruefe(unveraendert.length === 0,
    "von Heute auf 30 Tage aendert sich JEDE Kennzahl (" + unveraendert.join(", ") + ")");

  const hBalken = bilder.heute.split(" // ")[1].split("|");
  const dBalken = bilder.tage30.split(" // ")[1].split("|");
  pruefe(hBalken.length === dBalken.length && hBalken.length >= 10,
    `beide zeigen gleich viele Ereignisse (${hBalken.length})`);
  pruefe(hBalken.every((w, i) => w !== dBalken[i]),
    "und jeder Ereigniswert aendert sich mit");

  pruefe(fehler.length === 0, "keine Fehlermeldung im Browser (" + fehler.join(" | ") + ")");
  await page.context().close();
}

console.log("\n--- C. Eine Rechnung, nicht mehrere ---\n");
{
  /*
    Die strenge Pruefung gegen den Ausgangsfehler "zufaellig
    voneinander abweichende Zeitraeume": Jede angezeigte Zahl muss
    die Summe derselben Tageswerte sein.
  */
  const { page, fehler } = await seite("admin");
  await inAnalyse(page);

  for (const id of ["heute", "gestern", "tage7", "tage30", "monat", "monatVorher"]) {
    await page.click(`[data-tun="an-zeitraum:${id}"]`);
    await page.waitForTimeout(250);

    const befund = await page.evaluate((zid) => {
      const D = window.ProbeDaten;
      const b = D.analyseBereich(zid, "", "");
      const a = D.analyseAuswertung(b.von, b.bis);
      /* Von Hand ueber die Tageswerte summieren - unabhaengig von
         analyseAuswertung, damit die Pruefung nicht zirkulaer ist. */
      const tage = D.analyseTage.filter((t) => t.iso >= b.von && t.iso <= b.bis);
      const handAufrufe = tage.reduce((s, t) => s + t.aufrufe, 0);
      const handBesuche = tage.reduce((s, t) => s + t.besuche, 0);
      const handAnfrage = tage.reduce((s, t) => s + t.anfrage, 0);
      const sichtbar = [...document.querySelectorAll(".haupt .kennzahl .wert")]
        .map((x) => x.textContent.trim());
      return {
        tage: tage.length,
        gemeldeteTage: a.tage,
        handAufrufe, handBesuche,
        aufrufe: a.ereignisse.find((e) => e.id === "aufrufe").wert,
        besuche: a.ereignisse.find((e) => e.id === "besuche").wert,
        quoteSoll: handBesuche ? Math.round((handAnfrage / handBesuche) * 1000) / 10 : 0,
        quoteIst: a.anfragequote,
        sichtbarErste: sichtbar[0],
        sichtbarZweite: sichtbar[1],
        von: b.von, bis: b.bis
      };
    }, id);

    pruefe(befund.tage === befund.gemeldeteTage,
      `${id}: die gemeldete Tageszahl stimmt mit dem Bereich (${befund.tage})`);
    pruefe(befund.handAufrufe === befund.aufrufe && befund.handBesuche === befund.besuche,
      `${id}: Aufrufe und Besuche sind die Summe genau dieser Tage`);
    pruefe(befund.quoteSoll === befund.quoteIst,
      `${id}: die Anfragequote kommt aus denselben Tagen (${befund.quoteIst})`);
    pruefe(befund.sichtbarErste === befund.handAufrufe.toLocaleString("de-DE"),
      `${id}: die angezeigte Kachel zeigt genau diese Summe (${befund.sichtbarErste})`);
    pruefe(befund.sichtbarZweite === befund.handBesuche.toLocaleString("de-DE"),
      `${id}: auch die zweite Kachel, aus demselben Zeitraum`);
  }

  /* Die Laengen muessen stimmen, sonst waere "7 Tage" ein Etikett. */
  const laengen = await page.evaluate(() => {
    const D = window.ProbeDaten;
    const l = (id) => D.analyseAuswertung(
      D.analyseBereich(id, "", "").von, D.analyseBereich(id, "", "").bis).tage;
    return { heute: l("heute"), gestern: l("gestern"), t7: l("tage7"), t30: l("tage30") };
  });
  pruefe(laengen.heute === 1, "Heute umfasst genau einen Tag");
  pruefe(laengen.gestern === 1, "Gestern umfasst genau einen Tag");
  pruefe(laengen.t7 === 7, "Letzte 7 Tage umfassen genau sieben Tage");
  pruefe(laengen.t30 === 30, "Letzte 30 Tage umfassen genau dreissig Tage");

  const monate = await page.evaluate(() => {
    const D = window.ProbeDaten;
    const m = D.analyseBereich("monat", "", "");
    const v = D.analyseBereich("monatVorher", "", "");
    return { m, v };
  });
  pruefe(monate.m.von.endsWith("-01"), "Dieser Monat beginnt am Monatsersten");
  pruefe(monate.v.von.endsWith("-01"), "Letzter Monat beginnt am Monatsersten");
  pruefe(monate.v.bis < monate.m.von, "Letzter Monat endet vor diesem Monat");

  pruefe(fehler.length === 0, "keine Fehlermeldung im Browser (" + fehler.join(" | ") + ")");
  await page.context().close();
}

console.log("\n--- D. Eigener Zeitraum ---\n");
{
  const { page, fehler } = await seite("admin");
  await inAnalyse(page);

  const VON = '[data-datum-kennung="analyse"][data-datum-teil="von"]';
  const BIS = '[data-datum-kennung="analyse"][data-datum-teil="bis"]';

  /*
    Ein Datum setzen, wie ein Mensch es tut: tippen und mit Tabulator
    verlassen.

    Vorher stand hier page.fill() mit einem ISO-Datum. Das ging am
    Feld vorbei: Es nimmt TT.MM.JJJJ, und der Weg soll derselbe sein
    wie in der Hand.
  */
  async function datumSetzen(teil, text) {
    const w = teil === "von" ? VON : BIS;
    await page.click(w);
    await page.waitForTimeout(80);
    await page.keyboard.press("Control+a");
    await page.keyboard.press("Delete");
    for (const z of text) {
      await page.keyboard.type(z);
      await page.waitForTimeout(40);
    }
    await page.keyboard.press("Tab");
    await page.waitForTimeout(450);
  }

  pruefe(!(await page.$(VON)),
    "ohne die Wahl \"Eigener Zeitraum\" gibt es keine Datumsfelder");

  await page.click('[data-tun="an-zeitraum:eigen"]');
  await page.waitForTimeout(300);
  pruefe(Boolean(await page.$(VON)) && Boolean(await page.$(BIS)),
    "nach der Wahl stehen zwei Datumsfelder bereit");

  /*
    GEAENDERTE ERWARTUNG.

    Alt: Beide Felder sind <input type="date">.

    Weshalb das nicht mehr gilt: Der manuelle Rundgang hat gemessen,
    dass das eingebaute Datumsfeld beim Tippen des Jahres zurueck zum
    Tag springt. Es ist portalweit durch ein eigenes Modul ersetzt -
    wie das Zeitfeld vorher schon, aus demselben Grund.

    Neu und strenger: Geprueft wird nicht nur, dass es Textfelder
    sind, sondern dass sie zum GEMEINSAMEN Modul gehoeren. Sonst waere
    an dieser Stelle auch eine Eigenloesung erlaubt.
  */
  const felder = await page.$$eval('[data-datum-kennung="analyse"]',
    (ns) => ns.map((x) => x.type + "/" + x.dataset.datumTeil));
  pruefe(felder.length === 2, `zwei Felder (${felder.join(", ")})`);
  pruefe(felder.every((x) => x.startsWith("text/")),
    "beide sind Textfelder des gemeinsamen Datumsmoduls");
  pruefe(!(await page.$('input[type="date"]')),
    "und es gibt kein natives Datumsfeld mehr");
  pruefe(await page.evaluate((w) =>
    parseFloat(getComputedStyle(document.querySelector(w)).fontSize) >= 16, VON),
    "Schriftgröße mindestens 16 px — darunter zoomt iOS hinein");

  const leer = await page.evaluate(() =>
    document.querySelector(".haupt").textContent.replace(/\s+/g, " "));
  pruefe(/beide Datumsfelder füllen/.test(leer),
    "mit halber Eingabe wird keine Zahl behauptet, sondern um die Eingabe gebeten");
  pruefe(!(await page.$(".haupt .kennzahl")),
    "und es steht keine einzige Kennzahl da");

  /* Nur das Startdatum - weiterhin keine Behauptung. */
  await datumSetzen("von", "01.09.2026");
  pruefe(!(await page.$(".haupt .kennzahl")),
    "nur mit einem Startdatum keine Kennzahl");

  /* Nur das Enddatum. */
  await datumSetzen("von", "");
  await datumSetzen("bis", "30.09.2026");
  pruefe(!(await page.$(".haupt .kennzahl")),
    "nur mit einem Enddatum ebenfalls keine Kennzahl");

  /* Beide. */
  await datumSetzen("von", "01.09.2026");
  const kopf = await kopfText(page);
  pruefe(/Eigener Zeitraum/.test(kopf), "der eigene Zeitraum steht im Kopf");
  pruefe(/01\.09\.2026/.test(kopf) && /30\.09\.2026/.test(kopf),
    "mit Von und Bis");
  pruefe(/30 Tage/.test(kopf), "und der richtigen Tageszahl (30)");
  const bildA = await zahlenBild(page);
  pruefe(bildA.split("|").length > 5, "und alle Kennzahlen sind da");

  /*
    GEAENDERTE ERWARTUNG.

    Alt: Ein verdrehter Zeitraum (Ende vor Beginn) wird gedreht und
    liefert dieselben Zahlen wie die richtige Reihenfolge.

    Weshalb das fachlich nicht mehr gilt: Der Geschaeftsfuehrer hat
    danach ausdruecklich einen FEHLER verlangt. Das ist auch das
    bessere Verhalten - wer "01.10." bis "01.09." eintippt, hat sich
    vertippt und soll das sehen, statt stumm eine andere Auswertung zu
    bekommen, als er gemeint hat. Eine Eingabe stillschweigend
    zurechtzubiegen ist eine Annahme ueber die Absicht.

    Neu: Fehlermeldung, KEINE Kennzahl - auch keine alte
    stehengebliebene - und keine behauptete Tageszahl.
  */
  await datumSetzen("bis", "01.08.2026");
  pruefe(!(await page.$(".haupt .kennzahl")),
    "ein verdrehter Zeitraum zeigt keine Kennzahl, auch keine alte");
  const verdreht = await page.evaluate(() =>
    document.querySelector(".haupt").textContent.replace(/\s+/g, " "));
  pruefe(/Ende liegt vor dem Beginn/.test(verdreht),
    "sondern eine verständliche Fehlermeldung");
  pruefe(!/\d+ Tage?\b/.test(await kopfText(page)),
    "und der Kopf behauptet keine Tageszahl");

  /* In der richtigen Reihenfolge stehen dieselben Zahlen wieder da. */
  await datumSetzen("bis", "30.09.2026");
  pruefe(await zahlenBild(page) === bildA,
    "in der richtigen Reihenfolge stimmen die Zahlen wieder");

  /* Ein unmoegliches Datum. */
  await datumSetzen("bis", "31.02.2026");
  pruefe(!(await page.$(".haupt .kennzahl")),
    "ein unmögliches Datum ergibt keine Kennzahl");
  pruefe(Boolean(await page.$(".datumsfehler")),
    "und der Fehler steht am Feld");

  /* Ein einziger Tag. */
  await datumSetzen("von", "15.09.2026");
  await datumSetzen("bis", "15.09.2026");
  pruefe(/\b1 Tag\b/.test(await kopfText(page)),
    "ein einzelner Tag wird als \"1 Tag\" benannt, nicht als \"1 Tage\"");

  /* Zurueck auf einen festen Zeitraum - die Felder verschwinden. */
  await page.click('[data-tun="an-zeitraum:tage7"]');
  await page.waitForTimeout(300);
  pruefe(!(await page.$(VON)),
    "nach dem Wechsel auf einen festen Zeitraum sind die Felder weg");

  pruefe(fehler.length === 0, "keine Fehlermeldung im Browser (" + fehler.join(" | ") + ")");
  await page.context().close();
}

console.log("\n--- E. Schaetzung heisst Schaetzung ---\n");
{
  const { page, fehler } = await seite("admin");
  await inAnalyse(page);

  const kacheln = await page.$$eval(".haupt .kennzahl", (ns) => ns.map((n) => ({
    wert: n.querySelector(".wert").textContent.trim(),
    name: n.querySelector(".name").textContent.trim()
  })));

  const schaetzungen = kacheln.filter((k) => /Schätzung/.test(k.name));
  const gezaehlt = kacheln.filter((k) => /gezählt/.test(k.name));
  const gerechnet = kacheln.filter((k) => /gerechnet/.test(k.name));

  pruefe(schaetzungen.length === 2, `zwei Kacheln sind als Schätzung benannt (${schaetzungen.length})`);
  pruefe(schaetzungen.every((k) => k.wert.startsWith("~")),
    "und ihre Zahl steht mit Tilde, nicht als genauer Wert");
  pruefe(gezaehlt.length === 2, `zwei Kacheln sind als gezählt benannt (${gezaehlt.length})`);
  pruefe(gerechnet.length === 3, `drei Quoten sind als gerechnet benannt (${gerechnet.length})`);
  pruefe(kacheln.every((k) => /Schätzung|gezählt|gerechnet/.test(k.name)),
    "jede Kachel sagt, woher ihre Zahl kommt");
  pruefe(!gezaehlt.some((k) => k.wert.startsWith("~")),
    "keine gezählte Zahl gibt sich als Schätzung aus");
  pruefe(!schaetzungen.some((k) => /gezählt/.test(k.name)),
    "und keine Schätzung gibt sich als gezählt aus");

  const text = await page.evaluate(() =>
    document.querySelector(".haupt").textContent.replace(/\s+/g, " "));
  pruefe(/Alle Zahlen hier sind erfunden/.test(text),
    "die Testwerte sind als erfunden gekennzeichnet");
  pruefe(/kein Trackingdienst angebunden/.test(text),
    "es steht ausdruecklich da, dass kein Trackingdienst angebunden ist");
  pruefe(/keine Einzelverfolgung/.test(text),
    "und dass keine Einzelverfolgung stattfindet");
  pruefe(/keine Nutzerkennung/.test(text),
    "keine Nutzerkennung in den Zahlen");

  pruefe(fehler.length === 0, "keine Fehlermeldung im Browser (" + fehler.join(" | ") + ")");
  await page.context().close();
}

console.log("\n--- F. Bedienoptik nur bei echter Bedienbarkeit ---\n");
{
  const { page } = await seite("admin");
  await inAnalyse(page);

  const verdaechtig = await page.$$eval(".haupt .kennzahl", (ns) => ns
    .filter((n) => !n.closest("button") && n.tagName !== "BUTTON"
      && getComputedStyle(n).cursor === "pointer")
    .map((n) => n.textContent.replace(/\s+/g, " ").trim().slice(0, 40)));
  pruefe(verdaechtig.length === 0,
    "keine Kachel zeigt Klickoptik, ohne bedienbar zu sein (" + verdaechtig.join(" / ") + ")");

  /* Tastatur: die Zeitraeume sind mit Tab erreichbar und mit Enter bedienbar. */
  const vorher = await kopfText(page);
  await page.focus('[data-tun="an-zeitraum:gestern"]');
  const hatFokus = await page.evaluate(() =>
    document.activeElement?.dataset?.tun === "an-zeitraum:gestern");
  pruefe(hatFokus, "ein Zeitraum laesst sich mit der Tastatur anwaehlen");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  const nachher = await kopfText(page);
  pruefe(vorher !== nachher && /Gestern/.test(nachher),
    "und mit der Eingabetaste bedienen");

  const sichtbar = await page.$eval(".filterzeile", (n) => ({
    rolle: n.getAttribute("role"), label: n.getAttribute("aria-label")
  }));
  pruefe(sichtbar.rolle === "group" && !!sichtbar.label,
    "die Auswahl ist als Gruppe benannt (" + sichtbar.label + ")");

  /* Ein unbekannter Zeitraum per direktem Aufruf aendert nichts. */
  const vorBild = await zahlenBild(page);
  await page.evaluate(() => window.ProbeBereiche.tun("an-zeitraum:erfunden", null));
  await page.waitForTimeout(300);
  pruefe(await zahlenBild(page) === vorBild,
    "ein erfundener Zeitraum per direktem Aufruf wird nicht uebernommen");

  await page.context().close();
}

console.log("\n--- G. Rollen und Breiten ---\n");
{
  /* Nur wer analytics.read hat, sieht Zahlen. */
  for (const rolle of ["dispatcher", "personal", "employee"]) {
    const { page } = await seite(rolle);
    const darf = await page.evaluate(() => window.ProbeRahmen.darf("analytics.read"));
    if (darf) { pruefe(true, `${rolle} hat analytics.read - kein Ausschluss zu pruefen`); }
    else {
      await page.evaluate(() => window.ProbeRahmen.geheZu("analyse"));
      await page.waitForTimeout(350);
      const hat = await page.$(".haupt .kennzahl");
      pruefe(!hat, `${rolle} sieht ohne analytics.read keine Kennzahl`);
    }
    await page.context().close();
  }

  for (const breite of [320, 390, 1440]) {
    const { page } = await seite("admin", breite, 860);
    await inAnalyse(page);
    await page.click('[data-tun="an-zeitraum:eigen"]');
    await page.waitForTimeout(300);
    const ueber = await page.evaluate(() =>
      Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
    pruefe(ueber === 0, `bei ${breite}px kein waagerechter Überlauf (${ueber}px)`);
    const klein = await page.$$eval("[data-datum], [data-tun^='an-zeitraum']",
      (ns) => ns.filter((n) => n.getBoundingClientRect().height < 36).length);
    pruefe(klein === 0, `bei ${breite}px ist kein Bedienfeld unter 36 px hoch (${klein})`);
    await page.context().close();
  }
}

console.log("\n--- H. Null Netzaufrufe ---\n");
pruefe(fremdeAnfragen.length === 0,
  `keine einzige Anfrage nach aussen im ganzen Lauf (${fremdeAnfragen.length}) ${fremdeAnfragen.slice(0, 3).join(" ")}`);

{
  /* Und im Quelltext der Analyse steht kein Netzaufruf. */
  const quelle = await readFile(join(PROBE, "probe-bereiche.js"), "utf8");
  const von = quelle.indexOf("function analyse()");
  const bis = quelle.indexOf("function hinweisDialog", von);
  const stueck = quelle.slice(von, bis > von ? bis : von + 12000);
  pruefe(!/fetch\s*\(|XMLHttpRequest|navigator\.sendBeacon|new WebSocket/.test(stueck),
    "kein Netzaufruf im Quelltext des Analysebereichs");
  const daten = await readFile(join(PROBE, "probe-daten.js"), "utf8");
  const dvon = daten.indexOf("const ANALYSE_EREIGNISSE");
  const dbis = daten.indexOf("const analyse = {", dvon);
  pruefe(!/fetch\s*\(|XMLHttpRequest|navigator\.sendBeacon|gtag|dataLayer/
    .test(daten.slice(dvon, dbis > dvon ? dbis : dvon + 12000)),
    "und kein Trackingdienst in den Analysedaten");
  pruefe(!/Math\.random/.test(stueck), "keine Zufallszahl in der Anzeige");
}

await browser.close();
await new Promise((r) => server.close(r));

console.log("\n═══════════════════════════════════════════════════════════");
console.log(`Analyse: ${bestanden} bestanden, ${offen.length} nicht bestanden`);
if (offen.length) { console.log("\nOffen:"); offen.forEach((n) => console.log("  - " + n)); }
console.log("\nALLES SIMULIERT. Es gibt keine Besuchermessung, keinen");
console.log("Trackingdienst und keine Datenquelle. Dieser Lauf sagt nichts");
console.log("ueber die produktive Instanz.");
console.log("═══════════════════════════════════════════════════════════");
process.exit(offen.length ? 1 : 0);
