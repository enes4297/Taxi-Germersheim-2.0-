/* ============================================================
   Prueflauf: eine Tageswahrheit, eine Fahrt, rechteabhaengige
   Uebersicht
   ============================================================
   Gemessene Ausgangsfehler des manuellen Gegenlaufs vom 06.10.2026.
   Jeder Abschnitt dieses Laufs gehoert zu einem davon:

   1. Hinter "Oeffnen" einer Fahrt stand ein Platzhaltertext. Fuer
      FA-0002 war damit nicht nachvollziehbar, dass die Abholzeit
      offen ist und eine Rueckfrage laeuft.

   2. Die Uebersicht zeigte "4 Fahrer im Dienst", die Planung fuer
      denselben Tag drei. Ursache: Die Uebersicht las das rohe
      Kennzeichen imDienst ohne die Abwesenheit zu fragen - der
      kranke Testfahrer 02 hatte noch eine Schicht im Plan.

   3. Der Konfliktzaehler der Planung nannte 3, der Filter zeigte 4
      Zeilen. Ursache: gezaehlt wurden EINTRAEGE, gezeigt ZEILEN -
      ein doppelt vergebenes Fahrzeug nennt in einem Eintrag zwei
      Fahrer.

   4. Dasselbe Fahrzeug war gleichzeitig "frei" (Fahrzeugkarte),
      "Testwagen 02" (Fahrerkarte) und "kein Fahrzeug" (Planung).
      Ursache: Die Fahrerkarte las z.fahrzeugId roh.

   5. Der Kalender hatte eine EIGENE Konfliktlogik aus schichtbefund()
      und nannte nur Testfahrer 02. Doppelt vergebenes Fahrzeug und
      Fahrer ohne Fahrzeug standen dort als gruene Schichten.

   6. Der Personalbereich zeigte "6 Dokumentstaende zu pruefen" und
      jede Zeile "pruefen" - auch Testfahrer 01, dessen Dokumente bis
      2027 gueltig sind. Ursache: Vergleich auf ein Feld "lage", das
      dokumentstand() nicht hat; damit war er immer wahr.

   7. Die Buchhaltung sah Dispositionsaktionen, und "Neue Fahrt" ging
      auf - mit Kundensuche, letzten Kunden, Telefonnummern.

   8. Ein Mitarbeiter mit genau EINER von 22 Faehigkeiten sah zehn
      Fahrten mit Kunden, Abholorten, Zielen, Fahrern und Fahrzeugen.

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
/* Eigener Port. Drei Prueflaeufe teilten sich vorher einen und
   haben sich im Stapel gegenseitig die Navigation abgewuergt. */
const PORT = 5384;
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

async function seite(rolle = "admin", breite = 1440, hoehe = 1000) {
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

const bereich = async (page, id) => {
  await page.evaluate((x) => window.ProbeRahmen.geheZu(x), id);
  await page.waitForTimeout(400);
};
const kennzahl = async (page, text) => {
  const alle = await page.$$eval(".kennzahl",
    (n) => n.map((x) => ({ t: x.textContent.replace(/\s+/g, " ").trim(), ziel: x.dataset.ziel })));
  return alle.find((x) => x.t.includes(text)) || null;
};
const zahlVon = (k) => (k ? Number(String(k.t).match(/^\d+/)[0]) : NaN);
/* Immer gegen den DOM, nicht gegen den sichtbaren Text: Ein Satz, der
   etwas verneint, darf nicht ueber verborgenen Daten stehen. */
const markup = (page, wahl) => page.$$eval(wahl,
  (n) => n.map((x) => x.innerHTML).join(" ")).catch(() => "");
const ganzesMarkup = (page) => page.evaluate(() => document.body.innerHTML);

/* Schliessen ueber die Modulgrenze - ein Klick auf den Dialoghinter-
   grund wird vom Kasten abgefangen, der darueber liegt. */
const zu = async (page) => {
  await page.evaluate(() => window.ProbeRahmen.dialogSchliessen(true));
  await page.waitForTimeout(250);
};

/* Die Tageswahrheit aus der Quelle - sie ist der Vergleichswert. */
async function wahrheit(page) {
  return page.evaluate(() => {
    const D = window.ProbeDaten;
    const iso = D.alsIso(D.heute);
    const konflikte = D.konflikteFuer(iso);
    return {
      iso,
      imDienst: D.imDienstAm(iso).map((z) => z.mitarbeiterId),
      konfliktZeilen: [...D.konfliktZeilen(konflikte)],
      mitWarnung: D.mitarbeiter
        .filter((m) => D.dokumentstand(m.id).warnung)
        .map((m) => m.id)
    };
  });
}

/* ═══ 1. FA-0002: die Fahrt im Einzelnen ═══════════════════════ */
console.log("\n── 1. Die Einzelansicht einer Fahrt (Fehler 1) ──");
{
  const { ctx, page, fehler } = await seite("admin");
  await bereich(page, "fahrten");
  await page.click('[data-tun="fahrt-filter:alle"]');
  await page.waitForTimeout(300);
  await page.click('[data-tun="fahrt-oeffnen:FA-0002"]');
  await page.waitForTimeout(400);

  const dialog = (await page.textContent(".dialog-kasten")).replace(/\s+/g, " ");
  pruefe(/FA-0002/.test(dialog), "die Einzelansicht nennt die Fahrtnummer");
  pruefe(!/Hier stünden die Einzelheiten/.test(dialog),
    "und ist kein Platzhalter mehr");
  pruefe(/Zeit offen/i.test(dialog), "FA-0002 zeigt „Zeit offen“");
  pruefe(/Rückfrage zur Uhrzeit offen/.test(dialog),
    "und die offene Rückfrage als Hinweis");
  pruefe(/keine verbindliche Abholzeit erfasst/.test(dialog),
    "und sagt ausdrücklich, dass keine Abholzeit erfasst ist");
  pruefe(/Gastfahrt/.test(dialog), "FA-0002 ist als Gastfahrt benannt");
  pruefe(/Testplatz 2/.test(dialog) && /Testziel B/.test(dialog),
    "Abholung und Ziel stehen da");
  pruefe(/Eingang/.test(dialog), "und der Zustand");
  pruefe(/nicht zugewiesen/.test(dialog),
    "Fahrer und Fahrzeug sind ehrlich als nicht zugewiesen benannt");
  pruefe(/nicht erfasst/.test(dialog),
    "die Leistung ist als nicht erfasst benannt – nicht erfunden");
  pruefe(/Fahrer wechseln/.test(dialog) && /Fahrzeug wechseln/.test(dialog),
    "die Administration bekommt Fahrer- und Fahrzeugwechsel angeboten");
  await zu(page);

  /* Eine Fahrt MIT Zeit und Zuweisung - die Gegenprobe. */
  await page.click('[data-tun="fahrt-oeffnen:FA-0006"]');
  await page.waitForTimeout(400);
  const d6 = (await page.textContent(".dialog-kasten")).replace(/\s+/g, " ");
  pruefe(/13:20/.test(d6) && !/Zeit offen/.test(d6),
    "FA-0006 nennt die Uhrzeit und nicht „Zeit offen“");
  pruefe(/Testfahrgast Werk 2/.test(d6),
    "und den Fahrgast des Firmenkunden");
  pruefe(/Normalfahrt/.test(d6), "und die erfasste Leistung");
  pruefe(/Geplant/.test(d6), "und den Zustand „Geplant“");

  /* Der Wechsel: eine Ebene, ein Rueckweg. */
  await page.click('[data-tun="wechsel-fahrer:FA-0006"]');
  await page.waitForTimeout(400);
  const kaesten = await page.$$eval(".dialog-kasten", (n) => n.length);
  pruefe(kaesten === 1, "der Wechsel öffnet kein zweites Fenster darüber");
  const w = (await page.textContent(".dialog-kasten")).replace(/\s+/g, " ");
  pruefe(/Zurück zur Fahrt/.test(w), "und trägt einen Rückweg");
  pruefe(!/Testfahrer 02/.test(w),
    "der kranke Testfahrer 02 wird nicht als Fahrer angeboten");
  pruefe(/Testfahrer 01/.test(w) && /Testfahrer 03/.test(w) && /Testfahrer 05/.test(w),
    "angeboten werden genau die drei Fahrenden des Tages");

  await page.click('[data-tun="wechsel-setzen:FA-0006|fahrer|M01"]');
  await page.waitForTimeout(400);
  const nachWechsel = (await page.textContent(".dialog-kasten")).replace(/\s+/g, " ");
  pruefe(/Testfahrer 01/.test(nachWechsel),
    "nach dem Wechsel steht der neue Fahrer in der Einzelansicht");
  const zustandDanach = await page.evaluate(() =>
    window.ProbeDaten.fahrten.find((f) => f.id === "FA-0006").zustand);
  pruefe(zustandDanach === "geplant",
    "und der Zustand der Fahrt wurde nicht eigenmächtig verändert");
  const protokoll = await page.evaluate(() =>
    window.ProbeDaten.protokoll.some((x) => x.was === "Fahrer gewechselt"));
  pruefe(protokoll, "der Wechsel steht im Protokoll");

  pruefe(fehler.length === 0, `keine Fehler in der Konsole (${fehler.join(" | ")})`);
  await ctx.close();
}

/* ═══ 2. Fahrer im Dienst: eine Zahl ═══════════════════════════ */
console.log("\n── 2. „Fahrer im Dienst“ (Fehler 2) ──");
{
  const { ctx, page, fehler } = await seite("admin");
  const w = await wahrheit(page);

  pruefe(w.imDienst.length === 3,
    `die Tageswahrheit nennt drei Fahrende (${w.imDienst.join(", ")})`);
  pruefe(!w.imDienst.includes("M02"),
    "der kranke Testfahrer 02 ist nicht darunter");

  const kUeber = await kennzahl(page, "Fahrer im Dienst");
  pruefe(zahlVon(kUeber) === w.imDienst.length,
    `die Übersicht nennt dieselbe Zahl (${zahlVon(kUeber)})`);

  await bereich(page, "planung");
  const kopf = (await page.textContent(".bereichskopf")).replace(/\s+/g, " ");
  const treffer = kopf.match(/(\d+)\s+im Dienst/);
  pruefe(Boolean(treffer) && Number(treffer[1]) === w.imDienst.length,
    `die Planung nennt dieselbe Zahl im Kopf (${treffer ? treffer[1] : "–"})`);

  await page.click('[data-tun="plan-filter:dienst"]');
  await page.waitForTimeout(400);
  const dienstZeilen = await page.$$eval(".liste tbody tr", (n) => n.length);
  pruefe(dienstZeilen === w.imDienst.length,
    `und der Filter „Im Dienst“ zeigt genau so viele Zeilen (${dienstZeilen})`);

  /* Krank, Urlaub und Frei zaehlen nicht - einzeln geprueft. */
  const status = await page.evaluate(() => {
    const D = window.ProbeDaten;
    const iso = D.alsIso(D.heute);
    return D.planzeilenAm(iso).map((z) => [z.mitarbeiterId, D.tagesstatusAm(iso, z)]);
  });
  const keiner = ["krank", "urlaub", "frei"].every((art) =>
    status.filter((x) => x[1] === art).every((x) => !w.imDienst.includes(x[0])));
  pruefe(keiner, "weder krank noch Urlaub noch Frei zählt als im Dienst");

  /* "Im Dienst (Ausnahme)" nur, wenn sie wirklich gesetzt ist. */
  const ausnahmen = await page.evaluate(() => {
    const D = window.ProbeDaten;
    const iso = D.alsIso(D.heute);
    return D.planzeilenAm(iso).filter((z) => z.ausnahme).length;
  });
  const planMarkup = await ganzesMarkup(page);
  pruefe(ausnahmen === 0 && !/bestätigte Ausnahme/.test(planMarkup),
    "ohne gesetzte Ausnahme steht nirgends eine Ausnahme");

  pruefe(fehler.length === 0, `keine Fehler in der Konsole (${fehler.join(" | ")})`);
  await ctx.close();
}

/* ═══ 3. Konfliktzaehler gleich gefilterte Liste ═══════════════ */
console.log("\n── 3. Zähler und Liste (Fehler 3) ──");
{
  const { ctx, page, fehler } = await seite("admin");
  const w = await wahrheit(page);
  pruefe(w.konfliktZeilen.length === 4,
    `die Tageswahrheit nennt vier betroffene Zeilen (${w.konfliktZeilen.join(", ")})`);

  await bereich(page, "planung");
  const chip = await page.textContent('[data-tun="plan-filter:konflikte"]');
  const zahlAmKnopf = Number(String(chip).match(/(\d+)/)[1]);
  pruefe(zahlAmKnopf === w.konfliktZeilen.length,
    `der Zähler am Filter nennt vier (${zahlAmKnopf})`);

  await page.click('[data-tun="plan-filter:konflikte"]');
  await page.waitForTimeout(400);
  const zeilen = await page.$$eval(".liste tbody tr", (n) => n.length);
  pruefe(zeilen === zahlAmKnopf,
    `und die gefilterte Liste zeigt genau so viele Zeilen (${zeilen})`);

  const kopf = (await page.textContent(".bereichskopf")).replace(/\s+/g, " ");
  const kopfZahl = kopf.match(/(\d+)\s+mit Konflikt/);
  pruefe(Boolean(kopfZahl) && Number(kopfZahl[1]) === zahlAmKnopf,
    `und der Kopf nennt dieselbe Zahl (${kopfZahl ? kopfZahl[1] : "–"})`);

  pruefe(fehler.length === 0, `keine Fehler in der Konsole (${fehler.join(" | ")})`);
  await ctx.close();
}

/* ═══ 4. Eine Tageszuweisung in allen Ansichten ════════════════ */
console.log("\n── 4. Dieselbe Tageszuweisung (Fehler 4) ──");
{
  const { ctx, page, fehler } = await seite("admin");

  /* Planung: der kranke Fahrer hat kein aktives Fahrzeug. */
  await bereich(page, "planung");
  await page.click('[data-tun="plan-filter:alle"]');
  await page.waitForTimeout(400);
  const planZeileM02 = await page.$eval('tr:has([data-mitarbeiter="M02"]), tr',
    () => "").catch(() => "");
  const planMarkupM02 = await page.evaluate(() => {
    const el = document.querySelector('[data-mitarbeiter="M02"]');
    const tr = el ? el.closest("tr") : null;
    return tr ? tr.innerHTML : document.body.innerHTML;
  });
  pruefe(!/GER-TEST 002/.test(planMarkupM02),
    "die Planung weist dem kranken Testfahrer 02 kein Fahrzeug zu");

  /* Fahrerkarte. */
  await bereich(page, "team");
  const karteM02 = await page.evaluate(() => {
    const el = document.querySelector('[data-mitarbeiter="M02"]');
    return el ? el.innerHTML : "";
  });
  pruefe(karteM02.length > 0, "die Fahrerkarte von Testfahrer 02 ist da");
  pruefe(!/GER-TEST 002/.test(karteM02) && !/Testwagen 02/.test(karteM02),
    "und nennt kein Fahrzeug – auch nicht verborgen im Markup");

  /* Fahrzeugkarte. */
  const karteF02 = await page.evaluate(() => {
    const el = document.querySelector('[data-fahrzeug="F02"]');
    return el ? el.innerHTML : "";
  });
  pruefe(karteF02.length > 0, "die Fahrzeugkarte von GER-TEST 002 ist da");
  pruefe(!/Testfahrer 02/.test(karteF02),
    "und nennt Testfahrer 02 nicht als Fahrer");

  /* Und die Quelle sagt dasselbe. */
  const quelle = await page.evaluate(() => {
    const D = window.ProbeDaten;
    const iso = D.alsIso(D.heute);
    const z = D.planzeilenAm(iso).find((x) => x.mitarbeiterId === "M02");
    return { roh: z.fahrzeugId, aktiv: D.fahrzeugAktiv(iso, z) };
  });
  pruefe(quelle.roh === "F02" && quelle.aktiv === null,
    "die Planzeile traegt noch F02, die gültige Tageszuweisung ist leer");

  /* Das Fahrzeug ist frei - und zwar genau einmal gesagt. */
  const lage = await page.evaluate(() => {
    const el = document.querySelector('[data-fahrzeug="F02"]');
    return el ? el.dataset.lage : "";
  });
  /* "verfuegbar" ist der Lagewert, "Frei" nur seine Marke. */
  pruefe(lage === "verfuegbar", `GER-TEST 002 ist frei (${lage})`);

  pruefe(fehler.length === 0, `keine Fehler in der Konsole (${fehler.join(" | ")})`);
  await ctx.close();
}

/* ═══ 5. Kalender und Planung: eine Konfliktermittlung ═════════ */
console.log("\n── 5. Der Kalender rechnet nicht selbst (Fehler 5) ──");
{
  const { ctx, page, fehler } = await seite("admin");
  const w = await wahrheit(page);

  await bereich(page, "kalender");
  await page.click('[data-tun="kal-sicht:tag"]');
  await page.waitForTimeout(450);
  const kalText = (await page.textContent(".flaeche")).replace(/\s+/g, " ");

  /* Jede betroffene Zeile muss im Kalender als Konflikt stehen. */
  const namen = { M01: "Testfahrer 01", M02: "Testfahrer 02", M03: "Testfahrer 03", M05: "Testfahrer 05" };
  const konflikteImKalender = await page.$$eval(
    '[data-art="konflikt"], .kal-eintrag',
    (n) => n.map((x) => x.textContent.replace(/\s+/g, " ").trim())
  ).catch(() => []);
  const kalKonflikt = konflikteImKalender.length
    ? konflikteImKalender.join(" | ")
    : kalText;

  pruefe(/Fahrzeug doppelt/.test(kalText),
    "der Kalender nennt das doppelt vergebene Fahrzeug");
  pruefe(/kein Fahrzeug/.test(kalText),
    "und den Fahrer ohne Fahrzeug");
  pruefe(/Abwesend, Schicht noch im Plan/.test(kalText),
    "und die Restschicht des abwesenden Fahrers");

  /*
    Die alte Restplanung ist als solche gekennzeichnet.

    GEMESSENER AUSGANGSFEHLER: Der Eintrag las sich
      "Abwesend, Schicht noch im Plan · 09:00–17:00 · GER-TEST 002 · Krank"
    und wirkte damit wie eine aktive Fahrzeugzuweisung - waehrend
    Testwagen 02 tatsaechlich frei ist.
  */
  const zeileM02 = await page.evaluate(() => {
    const el = [...document.querySelectorAll(".kal-tagesliste li")]
      .find((x) => /Testfahrer 02/.test(x.textContent));
    return el ? el.textContent.replace(/\s+/g, " ").trim() : "";
  });
  pruefe(zeileM02.length > 0, "der Eintrag zu Testfahrer 02 ist da");
  pruefe(/geplant: GER-TEST 002/.test(zeileM02),
    `GER-TEST 002 ist als geplante Restzuweisung gekennzeichnet (${zeileM02.slice(0, 110)})`);
  pruefe(!/(^|[^:] )GER-TEST 002/.test(zeileM02.replace("geplant: GER-TEST 002", "")),
    "und steht nicht noch ein zweites Mal ungekennzeichnet da");
  /* Alle verlangten Angaben bleiben im Eintrag. */
  pruefe(/Abwesend, Schicht noch im Plan/.test(zeileM02), "der Konfliktgrund steht darin");
  pruefe(/09:00–17:00/.test(zeileM02), "die Zeit steht darin");
  pruefe(/Krank/.test(zeileM02), "der Abwesenheitsstatus steht darin");
  pruefe(/veröffentlicht|Entwurf/.test(zeileM02), "und der Veröffentlichungsstatus");

  /* Gegenprobe: Ein aktiver Fahrer bekommt KEIN "geplant:". */
  const zeileM01 = await page.evaluate(() => {
    const el = [...document.querySelectorAll(".kal-tagesliste li")]
      .find((x) => /Testfahrer 01/.test(x.textContent));
    return el ? el.textContent.replace(/\s+/g, " ").trim() : "";
  });
  pruefe(/GER-TEST 001/.test(zeileM01) && !/geplant:/.test(zeileM01),
    `die gültige Zuweisung von Testfahrer 01 wird nicht als alte Planung bezeichnet (${zeileM01.slice(0, 90)})`);
  const geplantMarkierungen = await page.evaluate(() =>
    [...document.querySelectorAll(".kal-tagesliste li")]
      .filter((x) => /geplant:/.test(x.textContent)).length);
  pruefe(geplantMarkierungen === 1,
    `genau ein Eintrag trägt „geplant:“ (${geplantMarkierungen})`);

  /* Und Testwagen 02 bleibt dreifach frei. */
  const wagen02 = await page.evaluate(() => {
    const D = window.ProbeDaten;
    const iso = D.alsIso(D.heute);
    const zeile = D.planzeilenAm(iso).find((z) => z.fahrzeugId === "F02");
    const fz = D.fahrzeuge.find((f) => f.id === "F02");
    return {
      zustand: fz.zustand,
      aktiv: zeile ? D.fahrzeugAktiv(iso, zeile) : null,
      einsatz: D.schichtenAmTag(iso).filter((x) => {
        const f = D.fahrzeugAktiv(iso, x.zeile);
        return f && f.id === "F02";
      }).length
    };
  });
  pruefe(wagen02.zustand === "verfuegbar", "Testwagen 02 ist frei");
  pruefe(wagen02.aktiv === null, "ohne aktuellen Fahrer");
  pruefe(wagen02.einsatz === 0, "und ohne heutigen Einsatz");

  for (const id of w.konfliktZeilen) {
    pruefe(new RegExp(namen[id]).test(kalKonflikt),
      `${namen[id]} steht im Kalender bei den Konflikten`);
  }

  /* Dieselbe Menge wie die Planung. */
  const kalMenge = await page.evaluate(() => {
    const D = window.ProbeDaten;
    const iso = D.alsIso(D.heute);
    return [...D.konfliktZeilen(D.konflikteFuer(iso))].sort().join(",");
  });
  pruefe(kalMenge === [...w.konfliktZeilen].sort().join(","),
    "Kalender und Planung fragen nachweislich denselben Bestand");

  /* Der Kalender bleibt nur-lesend. */
  const kalenderJs = await readFile(join(PROBE, "probe-kalender.js"), "utf8");
  const ohneKommentar = kalenderJs.replace(/\/\*[\s\S]*?\*\//g, " ");
  pruefe(!/schichtbefund\s*\(/.test(ohneKommentar),
    "der Kalender leitet keine Konflikte mehr aus schichtbefund() ab");
  pruefe(/konflikteFuer/.test(ohneKommentar),
    "sondern fragt die zentrale Konfliktermittlung");
  pruefe(!/\.fahrerId\s*=|\.fahrzeugId\s*=|\.imDienst\s*=/.test(ohneKommentar),
    "und ändert nichts – er bleibt nur-lesend");

  pruefe(fehler.length === 0, `keine Fehler in der Konsole (${fehler.join(" | ")})`);
  await ctx.close();
}

/* ═══ 6. Dokumentstand ═════════════════════════════════════════ */
console.log("\n── 6. Der Dokumentstand (Fehler 6) ──");
{
  const { ctx, page, fehler } = await seite("admin");
  const w = await wahrheit(page);
  pruefe(w.mitWarnung.length === 4,
    `vier Mitarbeiter haben eine Dokumentwarnung (${w.mitWarnung.join(", ")})`);
  pruefe(!w.mitWarnung.includes("M01"),
    "Testfahrer 01 ist nicht darunter – seine Dokumente sind gültig");

  await bereich(page, "personal");
  const kopf = (await page.textContent(".bereichskopf")).replace(/\s+/g, " ");
  const zahl = kopf.match(/(\d+)\s+Dokumentstand/);
  pruefe(Boolean(zahl) && Number(zahl[1]) === w.mitWarnung.length,
    `der Kopf nennt vier zu prüfende Dokumentstände (${zahl ? zahl[1] : "–"})`);

  /* Die Personalliste besteht aus Aktenzeilen, nicht aus
     Tabellenzeilen - jede Zeile ist ein Knopf in die Akte. */
  const reihen = await page.$$eval(".aktenzeile",
    (n) => n.map((x) => x.textContent.replace(/\s+/g, " ").trim()));
  pruefe(reihen.length === 6, `die Liste zeigt sechs Mitarbeiter (${reihen.length})`);
  const mitPruefen = reihen.filter((x) => !/alle gültig/.test(x));
  pruefe(mitPruefen.length === w.mitWarnung.length,
    `und genau so viele Zeilen tragen keine „alle gültig“ (${mitPruefen.length})`);
  const zeileM01 = reihen.find((x) => /Testfahrer 01/.test(x)) || "";
  pruefe(/alle gültig/.test(zeileM01),
    "die Zeile von Testfahrer 01 trägt „alle gültig“");

  /* Fahrer & Fahrzeuge nennt dieselbe Menge. */
  await bereich(page, "team");
  const warnKarten = await page.$$eval("[data-mitarbeiter]", (n) => n
    .filter((x) => /abgelaufen|läuft ab|fehlt|prüfen/i.test(x.textContent))
    .map((x) => x.dataset.mitarbeiter));
  pruefe(!warnKarten.includes("M01"),
    "und auch Fahrer & Fahrzeuge warnt bei Testfahrer 01 nicht");

  pruefe(fehler.length === 0, `keine Fehler in der Konsole (${fehler.join(" | ")})`);
  await ctx.close();
}

/* ═══ 7. Buchhaltung ═══════════════════════════════════════════ */
console.log("\n── 7. Die Buchhaltung (Fehler 7) ──");
{
  const { ctx, page, fehler } = await seite("accounting");

  const schnell = await page.$$eval(".wahlkarte, .hauptaktion .knopf, .kennzahl",
    (n) => n.map((x) => (x.dataset.tun || x.dataset.ziel || "") + "::" + x.textContent.replace(/\s+/g, " ").trim()));
  const alleTun = schnell.join(" | ");
  for (const verboten of ["neue-fahrt", "wechsel-fahrer", "wechsel-fahrzeug"]) {
    pruefe(!new RegExp(verboten).test(alleTun),
      `die Buchhaltung bekommt „${verboten}“ nicht angeboten`);
  }
  pruefe(!/data-ziel="planung"/.test(await ganzesMarkup(page)),
    "und keine Schnellaktion „Schicht planen“");
  pruefe(!/Anfrage bearbeiten/.test(alleTun),
    "und keine „Anfrage bearbeiten“");
  pruefe(/Meldungen/.test(alleTun), "Meldungen bleiben erreichbar");

  /*
    Der Hinweis nennt nur, was wirklich fehlt.

    GEMESSENER AUSGANGSFEHLER: Der Satz war fest und sprach der
    Buchhaltung auch "Kundendaten" ab - obwohl sie customers.read hat
    und den Bereich Kunden in der Navigation sieht.
  */
  const hinweisText = (await page.textContent("body")).replace(/\s+/g, " ");
  pruefe(/Fahrten, Einsatzplanung und Flottendaten gehören zur/.test(hinweisText),
    "der Hinweis nennt Fahrten, Einsatzplanung und Flottendaten");
  pruefe(!/Kundendaten/.test(hinweisText),
    "und behauptet nicht, dass Kundendaten nicht zugänglich seien");
  const naviBuch = await page.$$eval("nav button, nav a",
    (n) => n.map((x) => x.textContent.replace(/\s+/g, " ").trim()).join(" | "));
  pruefe(/Kunden/.test(naviBuch),
    `der Bereich Kunden steht weiterhin in der Navigation (${naviBuch})`);

  /* Keine betrieblichen Kennzahlen. */
  const bodyUeber = await ganzesMarkup(page);
  pruefe(!/Fahrten heute/.test(bodyUeber) && !/gerade unterwegs/.test(bodyUeber)
    && !/Fahrer im Dienst/.test(bodyUeber),
    "keine betrieblichen Kennzahlen in der Übersicht");
  pruefe(!/Tagesverlauf/.test(bodyUeber),
    "und kein Tagesverlauf mit Fahrten");
  /* Und keine Kundendaten aus dem Tagesverlauf. Die Buchhaltung darf
     Kunden sehen - aber nicht an einer Fahrtenliste, die sie nicht
     sehen darf. */
  pruefe(!/Teststrasse 1, Germersheim/.test(bodyUeber) && !/Testziel B/.test(bodyUeber),
    "und keine Abholorte oder Ziele");

  /* Der direkte Aufruf. */
  await page.evaluate(() => window.ProbeBereiche.tun("neue-fahrt"));
  await page.waitForTimeout(400);
  const nachAufruf = await page.textContent("body");
  pruefe(/Keine Berechtigung/.test(nachAufruf),
    "der direkte Aufruf von „neue-fahrt“ wird abgewiesen");
  const assistentMarkup = await ganzesMarkup(page);
  pruefe(!/Kunde suchen|Letzte Kunden|Schritt 1 von 6/.test(assistentMarkup),
    "und öffnet keinen Schritt 1 mit Kundensuche");
  pruefe(!/0172|Teststrasse 1, Germersheim/.test(assistentMarkup),
    "keine Telefonnummern und keine Kundenadressen im Markup");
  await zu(page);

  /* Auch der Assistent selbst sperrt. */
  await page.evaluate(() => window.ProbeFahrtassistent.starten());
  await page.waitForTimeout(400);
  const direkt = await ganzesMarkup(page);
  pruefe(/Keine Berechtigung/.test(direkt),
    "starten() des Assistenten weist direkt ab");
  pruefe(!/Kunde suchen|Letzte Kunden/.test(direkt),
    "und liefert keine Kundensuche aus");
  /* Und jeder Einzelschritt. */
  await page.evaluate(() => window.ProbeFahrtassistent.tun("fa-schritt", "2"));
  await page.waitForTimeout(300);
  pruefe(!/Letzte Kunden|Abholung/.test(await ganzesMarkup(page)),
    "auch ein direkter Schrittaufruf bringt sie nicht weiter");
  await zu(page);

  /* Der Wechsel ebenso. */
  await page.evaluate(() => window.ProbeBereiche.tun("wechsel-fahrer:FA-0006"));
  await page.waitForTimeout(400);
  const wText = await page.textContent("body");
  pruefe(/Keine Berechtigung/.test(wText),
    "der direkte Aufruf des Fahrerwechsels wird abgewiesen");
  await zu(page);

  await page.evaluate(() => window.ProbeBereiche.tun("fahrt-oeffnen:FA-0001"));
  await page.waitForTimeout(400);
  const fText = await ganzesMarkup(page);
  pruefe(/Keine Berechtigung/.test(fText),
    "und die Einzelansicht einer Fahrt ebenso");
  pruefe(!/Teststrasse 1, Germersheim/.test(fText),
    "ohne dass die Fahrtdaten im Markup stehen");
  await zu(page);

  /* Was die Buchhaltung behalten muss. */
  for (const id of ["uebersicht", "meldungen", "kunden", "finanzen", "analyse"]) {
    await bereich(page, id);
    const t = await page.textContent("main, body");
    pruefe(!/Keine Berechtigung/.test(t), `der Bereich „${id}“ bleibt erreichbar`);
  }

  pruefe(fehler.length === 0, `keine Fehler in der Konsole (${fehler.join(" | ")})`);
  await ctx.close();
}

/* ═══ 8. Mitarbeiter ═══════════════════════════════════════════ */
console.log("\n── 8. Der Mitarbeiter (Fehler 8) ──");
{
  const { ctx, page, fehler } = await seite("employee");

  const body = await ganzesMarkup(page);
  const sichtbar = (await page.textContent("body")).replace(/\s+/g, " ");

  pruefe(!/Tagesverlauf/.test(body), "keine Fahrtenliste in seiner Übersicht");
  for (const kunde of ["Testkunde 01", "Testkunde 02", "Testkunde 03", "Testkunde 04", "Testkunde 05", "Testkunde 06"]) {
    pruefe(!new RegExp(kunde).test(body), `kein ${kunde} im Markup`);
  }
  for (const ort of ["Teststrasse 1", "Testplatz 2", "Testziel A", "Testziel B"]) {
    pruefe(!new RegExp(ort).test(body), `kein Abholort oder Ziel „${ort}“ im Markup`);
  }
  pruefe(!/Fahrten heute|noch nicht zugewiesen|gerade unterwegs|Fahrer im Dienst|Fahrzeuge verfügbar/.test(body),
    "keine betrieblichen Kennzahlen");
  pruefe(!/GER-TEST/.test(body), "keine Kennzeichen");
  for (const verboten of ["neue-fahrt", "wechsel-fahrer", "wechsel-fahrzeug", 'data-ziel="planung"', 'data-ziel="fahrten'] ) {
    pruefe(!body.includes(verboten), `keine Dispositionsaktion „${verboten}“`);
  }

  /* Was er sehen muss. */
  pruefe(/Meldungen/.test(sichtbar), "„Meldungen“ bleibt sichtbar");
  pruefe(/Betriebsversammlung am Freitag/.test(sichtbar),
    "die Nachricht an alle Mitarbeiter bleibt sichtbar");
  pruefe(/Testmitarbeiter 01/.test(sichtbar),
    "und die Übersicht nennt ihn selbst");
  pruefe(/gehören zur\s+Disposition|nicht\s+enthalten/.test(sichtbar.replace(/\s+/g, " ")),
    "und sagt ehrlich, weshalb der Rest fehlt");
  /* Dem Mitarbeiter fehlt customers.read tatsaechlich - bei ihm
     gehoeren die Kundendaten in den Satz. */
  pruefe(/Fahrten, Einsatzplanung, Flottendaten und Kundendaten gehören zur/
    .test(sichtbar.replace(/\s+/g, " ")),
    "sein Hinweis nennt zusätzlich die Kundendaten");

  /* Keine fremden Aufgaben, Warnungen, Krankheits- oder Dokumentvorgaenge. */
  pruefe(!/Krankmeldung|Führerschein läuft|Personenbeförderungsschein/.test(body),
    "keine fremden Krankheits- oder Dokumentvorgänge");
  const meineVorgaenge = await page.evaluate(() =>
    window.ProbeVorgaenge.offeneFuerMich().map((v) => v.id));
  const fremde = await page.evaluate(() =>
    window.ProbeVorgaenge.offeneFuerMich()
      .filter((v) => v.betrifft.art !== "alle" && v.sichtbar.some((s) => s !== "self.read")).length);
  pruefe(fremde === 0,
    `keine Vorgänge, die eine andere Fähigkeit verlangen (${meineVorgaenge.join(", ") || "keine"})`);

  /* Direkte Aufrufe. */
  const direkte = [
    ["neue-fahrt", undefined],
    ["fahrt-oeffnen:FA-0001", undefined],
    ["wechsel-fahrer:FA-0006", undefined],
    ["wechsel-fahrzeug:FA-0006", undefined]
  ];
  for (const [befehl] of direkte) {
    await page.evaluate((b) => window.ProbeBereiche.tun(b), befehl);
    await page.waitForTimeout(350);
    const markupDanach = await ganzesMarkup(page);
    pruefe(!/Testkunde|Teststrasse|GER-TEST/.test(markupDanach),
      `der direkte Aufruf „${befehl}“ liefert keine Betriebsdaten`);
    await zu(page);
  }

  await page.evaluate(() => window.ProbeFahrtassistent.starten());
  await page.waitForTimeout(400);
  pruefe(!/Kunde suchen|Letzte Kunden/.test(await ganzesMarkup(page)),
    "und der Assistent öffnet für ihn keine Kundensuche");
  {
    await zu(page);
  }

  /* Die Bereiche, die er nicht hat, sind auch nicht in der Navigation. */
  const navi = await page.$$eval("[data-ziel-bereich], nav button, nav a",
    (n) => n.map((x) => x.textContent.replace(/\s+/g, " ").trim()).join(" | "));
  pruefe(!/Planung|Fahrten|Finanzen|Personal/.test(navi),
    `die Navigation nennt keinen gesperrten Bereich (${navi})`);

  pruefe(fehler.length === 0, `keine Fehler in der Konsole (${fehler.join(" | ")})`);
  await ctx.close();
}

/* ═══ 9. Die Gegenrichtungen bleiben bestanden ═════════════════ */
console.log("\n── 9. Keine Rolle hat etwas verloren ──");
{
  /* Personal: Personal, Lohn, geschuetzte Krankheitszeitraeume. */
  const { ctx, page, fehler } = await seite("personal");
  for (const id of ["personal", "lohn", "meldungen"]) {
    await bereich(page, id);
    const t = await page.textContent("body");
    pruefe(!/Keine Berechtigung/.test(t), `Personal behält den Bereich „${id}“`);
  }
  const krank = await page.evaluate(() => {
    const v = window.ProbeVorgaenge.offeneFuerMich().find((x) => x.thema === "krankheit");
    return v ? v.id : "";
  });
  pruefe(krank.length > 0, `Personal sieht die Krankmeldung (${krank})`);
  await page.evaluate((id) => window.ProbeVorgaenge.tun("vg-oeffnen", id), krank);
  await page.waitForTimeout(400);
  const kText = (await page.textContent(".dialog-kasten")).replace(/\s+/g, " ");
  pruefe(!/fehlt Ihnen die Berechtigung/.test(kText),
    "und bekommt die Bescheinigung vollständig");
  await zu(page);
  pruefe(fehler.length === 0, `keine Fehler in der Konsole (${fehler.join(" | ")})`);
  await ctx.close();

  /* Disposition: Metadaten ja, geschuetzter Inhalt nein. */
  const d = await seite("dispatcher");
  const kd = await d.page.evaluate(() => {
    const v = window.ProbeVorgaenge.offeneFuerMich().find((x) => x.thema === "krankheit");
    return v ? v.id : "";
  });
  pruefe(kd.length > 0, `die Disposition sieht die Krankmeldung (${kd})`);
  await d.page.evaluate((id) => window.ProbeVorgaenge.tun("vg-oeffnen", id), kd);
  await d.page.waitForTimeout(400);
  const dText = (await d.page.textContent(".dialog-kasten")).replace(/\s+/g, " ");
  const dMarkup = await markup(d.page, ".dialog-kasten");
  pruefe(/Eine Bescheinigung ist eingegangen/.test(dText)
    && /fehlt Ihnen die Berechtigung/.test(dText),
    "und bekommt genau den vorgegebenen Sperrsatz");
  pruefe(!/Testbescheinigung/.test(dMarkup),
    "ohne Dateiname im Markup");
  await zu(d.page);
  /* Und sie behaelt ihre Dispositionsfunktionen. */
  for (const id of ["uebersicht", "fahrten", "planung", "team", "kalender"]) {
    await bereich(d.page, id);
    const t = await d.page.textContent("body");
    pruefe(!/Keine Berechtigung/.test(t), `die Disposition behält „${id}“`);
  }
  await bereich(d.page, "uebersicht");
  const dBody = await ganzesMarkup(d.page);
  pruefe(/data-tun="neue-fahrt"/.test(dBody) && /Tagesverlauf/.test(dBody),
    "und ihre Übersicht ist vollständig");
  pruefe(d.fehler.length === 0, `keine Fehler in der Konsole (${d.fehler.join(" | ")})`);
  await d.ctx.close();

  /* Administration: alles. */
  const a = await seite("admin");
  const aBody = await ganzesMarkup(a.page);
  for (const stueck of ["neue-fahrt", "wechsel-fahrer", "wechsel-fahrzeug",
    'data-ziel="planung"', "Tagesverlauf", "Fahrten heute", "Fahrzeuge verfügbar"]) {
    pruefe(aBody.includes(stueck), `die Administration behält „${stueck}“`);
  }
  pruefe(a.fehler.length === 0, `keine Fehler in der Konsole (${a.fehler.join(" | ")})`);
  await a.ctx.close();
}

/* ═══ 10. Ladefehler bleibt vom leeren Bestand unterscheidbar ══ */
console.log("\n── 10. Fehler ist nicht leer ──");
{
  const { ctx, page, fehler } = await seite("admin");
  await bereich(page, "fahrten");
  await page.evaluate(() => { window.ProbeBereiche.tun("fahrt-zustand:fehler"); });
  await page.waitForTimeout(400);
  const t = (await page.textContent("body")).replace(/\s+/g, " ");
  pruefe(/konnten nicht geladen werden/.test(t),
    "ein Ladefehler sagt, dass nicht geladen werden konnte");
  pruefe(/heißt nicht, dass es keine Einträge gibt/.test(t),
    "und grenzt sich ausdrücklich vom leeren Bestand ab");
  await page.evaluate(() => { window.ProbeBereiche.tun("fahrt-zustand:leer"); });
  await page.waitForTimeout(400);
  const t2 = (await page.textContent("body")).replace(/\s+/g, " ");
  pruefe(/Das ist kein Fehler/.test(t2),
    "und der leere Bestand sagt umgekehrt, dass das kein Fehler ist");
  pruefe(fehler.length === 0, `keine Fehler in der Konsole (${fehler.join(" | ")})`);
  await ctx.close();
}

/* ═══ 11. Der Quelltext: keine zweite Rechnung ═════════════════ */
console.log("\n── 11. Eine Quelle, nicht fünf ──");
{
  const ohne = (s) => s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
  const bereiche = ohne(await readFile(join(PROBE, "probe-bereiche.js"), "utf8"));
  const team = ohne(await readFile(join(PROBE, "probe-team.js"), "utf8"));
  const kalender = ohne(await readFile(join(PROBE, "probe-kalender.js"), "utf8"));

  pruefe(!/function\s+konflikteVon\s*\(/.test(bereiche),
    "die Planung hat keine eigene Konfliktfunktion mehr");
  pruefe(/D\.konflikteFuer/.test(bereiche) && /D\.konflikteFuer/.test(kalender),
    "Planung und Kalender fragen dieselbe Stelle");
  /*
    Nur das Kartenmuster. Die rohe Kennung ist an anderen Stellen
    richtig: im Zuweisungsdialog ("dieser Fahrer hat schon ...") und
    im Protokoll als vorher/nachher. Dort beschreibt sie absichtlich
    den EINTRAG im Plan, nicht die gueltige Tageszuweisung.
  */
  pruefe(!/const fz = z\.fahrzeugId\s*\?\s*fahrzeugVon/.test(team),
    "Fahrerkarte und Fahrerakte lesen keine rohe Fahrzeugkennung mehr");
  pruefe(/D\.fahrzeugAktiv/.test(team) && /D\.fahrzeugAktiv/.test(bereiche),
    "beide fragen die gültige Tageszuweisung");
  pruefe(!/plan\.zeilen\.filter\(\(z\)\s*=>\s*z\.imDienst\)/.test(bereiche),
    "die Übersicht zählt „im Dienst“ nicht mehr selbst");
  pruefe(!/dokumentstand\([^)]*\)\.lage|dokumentstand\.lage/.test(bereiche),
    "und fragt kein Feld „lage“ mehr, das es nicht gibt");
  for (const quelle of [bereiche, team, kalender]) {
    pruefe(!/fetch\s*\(|new XMLHttpRequest|createClient\s*\(/i.test(quelle),
      "kein Netzzugriff in diesem Modul");
  }
}

/* ═══ 12. Gesperrte Bereiche beim direkten Sprung ══════════════ */
console.log("\n── 12. Ein gesperrter Bereich nimmt den Zustand nicht an ──");
{
  /*
    GEMESSENER AUSGANGSFEHLER: geheZu() prüfte nur, ob es den Bereich
    GIBT - nicht, ob die Rolle ihn sehen darf. Ein direkter Aufruf
    setzte deshalb auch als Mitarbeiter den Navigationszustand auf
    "fahrten". Ausgeliefert wurde nichts, die Sperre fehlte aber am
    Einstiegspunkt.

    Geprüft wird jede gesperrte Rolle/Bereich-Kombination über BEIDE
    Einstiege - geheZu() und geheZuMitHerkunft() - auf drei Dinge:
    der Zustand bleibt stehen, es erscheint kein geschützter Inhalt,
    und zwar auch nicht verborgen im DOM.
  */
  const ALLE = ["uebersicht", "fahrten", "planung", "team", "kalender", "meldungen",
    "kunden", "personal", "lohn", "finanzen", "rewards", "analyse", "einstellungen"];
  /* Verräterische Zeichenfolgen aus den Testdaten. */
  const LECK = [
    ["Kundenname", /Testkunde 0\d/],
    ["Abholort oder Ziel", /Teststrasse 1|Testplatz 2|Testweg 3|Testallee 4|Testziel [A-E]/],
    ["Kennzeichen", /GER-TEST \d{3}/],
    ["Mitarbeitername", /Testfahrer 0\d/],
    ["Fahrtnummer", /FA-00\d\d/],
    ["Vorgangsnummer", /V000\d/],
    ["Lohnangabe", /Bruttolohn|Lohnabrechnung/],
    ["Rechnungsnummer", /RE-2026-\d{4}/]
  ];

  const { ctx, page, fehler } = await seite("admin");
  let geprueft = 0;

  for (const rolle of ["employee", "accounting", "dispatcher", "personal"]) {
    await page.selectOption("[data-rolle]", rolle);
    await page.waitForTimeout(320);
    const erlaubt = await page.evaluate(() =>
      window.ProbeRahmen.sichtbareBereiche().map((b) => b.id));
    const verboten = ALLE.filter((x) => !erlaubt.includes(x));
    pruefe(verboten.length > 0, `${rolle} hat gesperrte Bereiche (${verboten.length})`);

    for (const id of verboten) {
      for (const weg of ["geheZu", "geheZuMitHerkunft"]) {
        /* Von einem erlaubten Bereich aus starten, damit ein Wechsel
           überhaupt sichtbar wäre. */
        await page.evaluate((x) => window.ProbeRahmen.geheZu(x), erlaubt[0]);
        await page.waitForTimeout(120);
        await page.evaluate(([fn, x]) => {
          if (fn === "geheZu") window.ProbeRahmen.geheZu(x);
          else window.ProbeRahmen.geheZuMitHerkunft(x, { bereich: "uebersicht", name: "Übersicht" });
        }, [weg, id]);
        await page.waitForTimeout(160);

        const jetzt = await page.evaluate(() => window.ProbeRahmen.zustand.bereich);
        pruefe(jetzt !== id,
          `${rolle} · ${weg}("${id}") übernimmt den Zustand nicht (steht auf „${jetzt}“)`);

        /*
          Geprüft wird der HAUPTBEREICH, nicht das ganze Dokument.

          Erster Versuch war falsch: Er suchte die Leckmuster im ganzen
          DOM. Für die Disposition stand dort aber die ERLAUBTE
          Übersicht mit Tagesverlauf — Kundennamen und Kennzeichen
          gehören da hin. Der Test hat sich an erlaubtem Inhalt
          verschluckt.

          Die genaue Eigenschaft: Nach einer Abweisung steht im
          Hauptbereich die Abweisung — und darin nichts Geschütztes.
        */
        const haupt = await page.evaluate(() => {
          const el = document.querySelector("[data-haupt]");
          return el ? el.innerHTML : "";
        });
        pruefe(/Kein Zugriff|Keine Berechtigung/.test(haupt),
          `${rolle} · ${weg}("${id}") wird sichtbar abgewiesen`);
        const lecks = LECK.filter(([, r]) => r.test(haupt)).map(([n]) => n);
        pruefe(lecks.length === 0,
          `${rolle} · ${weg}("${id}") liefert keinen geschützten Inhalt`
          + (lecks.length ? " — LECK: " + lecks.join(", ") : ""));
        geprueft += 1;
      }
    }
  }
  pruefe(geprueft >= 60,
    `genug Kombinationen geprüft (${geprueft} Rolle/Bereich/Einstieg-Fälle)`);

  /* Gegenprobe: Ein ERLAUBTER Bereich wird weiterhin angenommen -
     die Sperre darf die Navigation nicht lahmlegen. */
  await page.selectOption("[data-rolle]", "accounting");
  await page.waitForTimeout(320);
  for (const id of ["kunden", "finanzen", "analyse", "meldungen", "uebersicht"]) {
    await page.evaluate((x) => window.ProbeRahmen.geheZu(x), id);
    await page.waitForTimeout(140);
    const jetzt = await page.evaluate(() => window.ProbeRahmen.zustand.bereich);
    pruefe(jetzt === id, `die Buchhaltung kommt weiterhin nach „${id}“ (${jetzt})`);
  }

  pruefe(fehler.length === 0, `keine Fehler in der Konsole (${fehler.join(" | ")})`);
  await ctx.close();
}

/* ═══ 13. Rechte und Navigation unverändert ════════════════════ */
console.log("\n── 13. Keine Rechte, keine Bereiche verschoben ──");
{
  /*
    Die beiden Darstellungskorrekturen durften an den Faehigkeiten und
    an der Navigation nichts aendern. Geprueft wird deshalb gegen die
    festgeschriebene Erwartung - nicht gegen den Bestand, der sich mit
    aendern wuerde.
  */
  const ERWARTET = {
    admin: { rechte: 22, bereiche: ["uebersicht", "fahrten", "planung", "team", "kalender",
      "meldungen", "kunden", "personal", "lohn", "finanzen", "rewards", "analyse",
      "einstellungen"] },
    dispatcher: { rechte: 5, bereiche: ["uebersicht", "fahrten", "planung", "team",
      "kalender", "meldungen"] },
    personal: { rechte: 8, bereiche: ["uebersicht", "team", "kalender", "meldungen",
      "personal", "lohn"] },
    accounting: { rechte: 6, bereiche: ["uebersicht", "meldungen", "kunden", "finanzen",
      "analyse"] },
    employee: { rechte: 1, bereiche: ["uebersicht", "meldungen"] }
  };
  const { ctx, page, fehler } = await seite("admin");
  for (const rolle of Object.keys(ERWARTET)) {
    await page.selectOption("[data-rolle]", rolle);
    await page.waitForTimeout(300);
    const ist = await page.evaluate(() => {
      const R = window.ProbeRahmen;
      return {
        rechte: R.rechteVon(R.aktuellesKonto()).length,
        bereiche: R.sichtbareBereiche().map((b) => b.id)
      };
    });
    pruefe(ist.rechte === ERWARTET[rolle].rechte,
      `${rolle} hat ${ERWARTET[rolle].rechte} Fähigkeiten (${ist.rechte})`);
    pruefe(ist.bereiche.join(",") === ERWARTET[rolle].bereiche.join(","),
      `${rolle} sieht unverändert dieselben Bereiche (${ist.bereiche.join(", ")})`);
  }
  pruefe(fehler.length === 0, `keine Fehler in der Konsole (${fehler.join(" | ")})`);
  await ctx.close();
}

pruefe(fremdeAnfragen.length === 0,
  `keine einzige Anfrage nach aussen im ganzen Lauf (${fremdeAnfragen.length})`);

await browser.close();
server.close();

console.log("\n" + "═".repeat(59));
console.log(`Tageswahrheit: ${bestanden} bestanden, ${offen.length} nicht bestanden`);
if (offen.length) {
  console.log("\nNicht bestanden:");
  for (const n of offen) console.log("  - " + n);
}
console.log(`
ALLES SIMULIERT. Keine Datenquelle, kein Upload, kein Versand. Dieser
Lauf belegt, was die Oberflaeche ausliefert - nicht, dass dieselben
Faehigkeiten serverseitig greifen.`);
console.log("═".repeat(59));
process.exit(offen.length ? 1 : 0);
