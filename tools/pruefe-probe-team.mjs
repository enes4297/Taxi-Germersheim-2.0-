/* ============================================================
   Prueflauf: Fahrer & Fahrzeuge in der Designprobe
   ============================================================
   Prueft Rollen und gesperrte Bereiche, Suche und Filter, Fahrer- und
   Fahrzeugzustaende, Zuweisung und Loesen, gesperrte und
   Werkstattfahrzeuge, Doppelzuweisung, Rueckgaengig, offene Eingaben,
   den Lohnbereich, stabile Kennungen, den Abgleich mit der Planung,
   vier Breiten, Tastatur und Fokus - und dass nichts nach aussen geht.

   ALLES SIMULIERT. Keine Datenquelle, kein Upload, kein Versand.
   ============================================================ */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";

const { chromium } = await import(
  "file:///" + join(process.cwd(), "fahrer/tests/node_modules/playwright/index.mjs").replace(/\\/g, "/")
);

const WURZEL = process.cwd();
const PROBE = join(WURZEL, "probe-betriebsportal");
const PORT = 5393;
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

async function seite(rolle = "dispatcher", breite = 1440, hoehe = 900) {
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
  await page.waitForTimeout(350);
  await page.evaluate(() => { try { localStorage.clear(); } catch { /* egal */ } });
  await page.selectOption("[data-rolle]", rolle);
  await page.waitForTimeout(250);
  /* Nicht ueber die Navigation klicken - unter 900 px ist die
     Seitenleiste ausgeblendet. */
  await page.evaluate(() => window.ProbeRahmen.geheZu("team"));
  await page.waitForTimeout(350);
  return { ctx, page, fehler };
}

const karte = (id) => `.fahrerkarte[data-mitarbeiter="${id}"]`;
const wagen = (id) => `.fahrzeugkarte[data-fahrzeug="${id}"]`;
const zeileIn = (page, id) => page.textContent(karte(id));
const wagenText = (page, id) => page.textContent(wagen(id));

/* ═══ 1. Grundaufbau ═════════════════════════════════════════════ */
console.log("\n── 1. Der Bereich steht ──");
{
  const { ctx, page, fehler } = await seite();
  const kopf = await page.textContent(".bereichskopf");
  pruefe(/Fahrer & Fahrzeuge/.test(kopf), "er heisst Fahrer & Fahrzeuge");
  pruefe(/\d{2}\.\d{2}\.\d{4}/.test(kopf), "und nennt den Tag im Klartext");
  pruefe(/derselbe Tagesplan wie in der Planung/.test(kopf),
    "es steht da, dass es derselbe Tagesplan ist");

  const fahrer = await page.$$eval(".fahrerkarte", (n) => n.length);
  const fahrzeuge = await page.$$eval(".fahrzeugkarte", (n) => n.length);
  pruefe(fahrer === 6, `sechs Fahrerkarten (${fahrer})`);
  pruefe(fahrzeuge === 5, `fuenf Fahrzeugkarten (${fahrzeuge})`);

  /* Stabile Kennungen statt Array-Positionen. */
  const kennungen = await page.$$eval(".fahrerkarte", (n) => n.map((x) => x.dataset.mitarbeiter));
  const wagenIds = await page.$$eval(".fahrzeugkarte", (n) => n.map((x) => x.dataset.fahrzeug));
  pruefe(kennungen.every(Boolean) && kennungen.length === new Set(kennungen).size,
    "jede Fahrerkarte traegt eine eindeutige Kennung");
  pruefe(wagenIds.every(Boolean) && wagenIds.length === new Set(wagenIds).size,
    "jede Fahrzeugkarte ebenso");
  const nummern = await page.$$eval("[data-zeile], [data-index]", (n) => n.length);
  pruefe(nummern === 0, `keine Adressierung ueber Array-Positionen (${nummern})`);

  pruefe(fehler.length === 0, `keine Skriptfehler${fehler.length ? " (" + fehler[0] + ")" : ""}`);
  await ctx.close();
}

/* ═══ 2. Fahrerzustaende ═════════════════════════════════════════ */
console.log("\n── 2. Fahrerstatus auf einen Blick ──");
{
  const { ctx, page } = await seite();
  const stat = async (id) => page.$eval(karte(id), (el) => el.dataset.status);
  pruefe((await stat("M01")) === "dienst", "M01 ist im Dienst");
  pruefe((await stat("M02")) === "krank", "M02 ist krank");
  pruefe((await stat("M06")) === "urlaub", "M06 ist im Urlaub");
  pruefe((await stat("M04")) === "frei", "M04 ist frei");

  const m01 = await zeileIn(page, "M01");
  pruefe(/06:00–14:00/.test(m01), "die Schichtzeit steht auf der Karte");
  pruefe(/GER-TEST 001/.test(m01), "das Fahrzeug ebenso");
  pruefe(/Testnummer 01/.test(m01), "die Telefonnummer fuer die Disposition");
  pruefe(/T01/.test(m01), "und die Initialen");

  /* Dokumentwarnungen. */
  pruefe(/läuft bald ab|abgelaufen/.test(await zeileIn(page, "M02")),
    "der ablaufende Führerschein wird gemeldet");
  pruefe(/abgelaufen/.test(await zeileIn(page, "M03")),
    "der abgelaufene Schein ebenso");
  pruefe(/Dokument fehlt/.test(await zeileIn(page, "M06")),
    "und ein fehlendes Dokument");

  /* Protokollvorschau auf der Karte. */
  pruefe(/Zuletzt:/.test(await zeileIn(page, "M01")),
    "die letzte Aenderung steht als Vorschau auf der Karte");
  await ctx.close();
}

/* ═══ 3. Suche und Filter ════════════════════════════════════════ */
console.log("\n── 3. Suche und Filter ──");
{
  const { ctx, page } = await seite();
  for (const [id, erwartet] of [["dienst", 3], ["frei", 1], ["krank", 1], ["urlaub", 1]]) {
    await page.click(`[data-tun="team-fahrer-filter:${id}"]`);
    await page.waitForTimeout(250);
    const n = await page.$$eval(".fahrerkarte", (x) => x.length);
    pruefe(n === erwartet, `Filter „${id}“ zeigt ${erwartet} (${n})`);
  }
  await page.click('[data-tun="team-fahrer-filter:dokument"]');
  await page.waitForTimeout(250);
  const dok = await page.$$eval(".fahrerkarte", (n) => n.map((x) => x.dataset.mitarbeiter));
  pruefe(dok.includes("M06") && dok.includes("M03"), "der Dokumentfilter findet die Betroffenen");
  pruefe(!dok.includes("M01"), "und nicht die mit gueltigen Papieren");

  await page.click('[data-tun="team-fahrer-filter:alle"]');
  await page.waitForTimeout(250);
  await page.fill("[data-team-fahrersuche]", "Testfahrer 03");
  await page.waitForTimeout(300);
  pruefe((await page.$$(".fahrerkarte")).length === 1, "die Namenssuche findet genau einen");
  await page.fill("[data-team-fahrersuche]", "gibtesnicht");
  await page.waitForTimeout(300);
  pruefe(/Kein Fahrer in dieser Ansicht/.test(await page.textContent(".haupt")),
    "ohne Treffer steht ein eigener Leerzustand da");
  pruefe(!/Für diesen Zeitraum ist nichts eingetragen/.test(await page.textContent(".haupt")),
    "und nicht der allgemeine Leertext");

  /* Fahrzeugsuche. */
  await page.fill("[data-team-fahrersuche]", "");
  await page.waitForTimeout(250);
  await page.fill("[data-team-fahrzeugsuche]", "GER-TEST 003");
  await page.waitForTimeout(300);
  pruefe((await page.$$(".fahrzeugkarte")).length === 1, "die Kennzeichensuche findet genau einen");
  await page.fill("[data-team-fahrzeugsuche]", "Testwagen");
  await page.waitForTimeout(300);
  pruefe((await page.$$(".fahrzeugkarte")).length === 5, "die Namenssuche findet alle");
  await ctx.close();
}

/* ═══ 4. Fahrzeugzustaende ═══════════════════════════════════════ */
console.log("\n── 4. Fahrzeugstatus ──");
{
  const { ctx, page } = await seite();
  const lage = async (id) => page.$eval(wagen(id), (el) => el.dataset.lage);
  /* F01 faehrt M01 - und Fahrt FA-0007 ist damit unterwegs. */
  pruefe((await lage("F01")) === "unterwegs", `F01 ist unterwegs (${await lage("F01")})`);
  pruefe((await lage("F03")) === "verfuegbar", "F03 ist frei");
  /* F02 steht zwar im Plan bei M02 - die Person ist aber krank, also
     faehrt niemand. Das Fahrzeug gilt als frei. */
  pruefe((await lage("F02")) === "verfuegbar", `F02 ist frei, weil der Fahrer krank ist (${await lage("F02")})`);
  pruefe((await lage("F04")) === "werkstatt", "F04 ist in der Werkstatt");
  pruefe((await lage("F05")) === "gesperrt", "F05 ist gesperrt");

  const f05 = await wagenText(page, "F05");
  pruefe(/Gesperrt:/.test(f05) && /Unfallschaden/.test(f05),
    "der Sperrgrund steht als Text da, nicht nur als Farbe");
  const f04 = await wagenText(page, "F04");
  pruefe(/TÜV/.test(f04) && /abgelaufen am/.test(f04), "der abgelaufene TÜV wird benannt");
  const f02 = await wagenText(page, "F02");
  pruefe(/läuft ab am/.test(f02), "ein bald ablaufender Termin ebenso");
  pruefe(/Rollstuhl/.test(f02) && /geeignet/.test(f02), "die Rollstuhleignung steht dabei");
  pruefe(/km/.test(f02), "und der Kilometerstand");

  for (const [id, erwartet] of [["verfuegbar", 2], ["unterwegs", 1], ["werkstatt", 1], ["gesperrt", 1]]) {
    await page.click(`[data-tun="team-fahrzeug-filter:${id}"]`);
    await page.waitForTimeout(250);
    const n = await page.$$eval(".fahrzeugkarte", (x) => x.length);
    pruefe(n === erwartet, `Fahrzeugfilter „${id}“ zeigt ${erwartet} (${n})`);
  }
  await ctx.close();
}

/* ═══ 5. Zuweisen und Lösen ══════════════════════════════════════ */
console.log("\n── 5. Zuweisen, lösen, rückgängig ──");
{
  const { ctx, page } = await seite();

  /* F03 ist frei - M03 faehrt noch ohne Fahrzeug. */
  await page.click('[data-tun="team-zuweisen:F03"]');
  await page.waitForTimeout(350);
  const auswahl = await page.textContent(".dialog-kasten");
  pruefe(/Fahrer für Testwagen 03 wählen/.test(auswahl), "die Auswahl nennt das Fahrzeug");
  pruefe(/GER-TEST 003/.test(auswahl), "mit Kennzeichen");
  pruefe(/noch ohne Fahrzeug/.test(auswahl), "und zeigt, wer noch keines hat");

  await page.click('[data-tun="team-zuweisen-an:F03|M03"]');
  await page.waitForTimeout(350);
  const best = await page.textContent(".dialog-kasten");
  pruefe(/Zuweisung übernehmen\?/.test(best), "vor dem Übernehmen kommt eine Zusammenfassung");
  pruefe(/Bisher/.test(best) && /Neu/.test(best), "sie nennt vorher und nachher");

  await page.click('[data-tun="team-zuweisen-ja:F03|M03"]');
  await page.waitForTimeout(400);
  const quittung = await page.textContent(".dialog-kasten");
  pruefe(/Zuweisung übernommen/.test(quittung), "die Zuweisung wird bestaetigt");
  pruefe(/Was protokolliert würde/.test(quittung), "mit Protokollvorschau");
  pruefe(/kein Fahrzeug/.test(quittung) && /GER-TEST 003/.test(quittung),
    "vorher und nachher stehen im Protokoll");
  pruefe(/nichts gespeichert/.test(quittung), "und es wird nichts gespeichert");

  /* Rueckgaengig. */
  await page.click('[data-tun="team-rueckgaengig"]');
  await page.waitForTimeout(400);
  const zurueck = await page.evaluate(() =>
    window.ProbeRahmen.zustand.planEntwurf.zeilen.find((z) => z.mitarbeiterId === "M03").fahrzeugId);
  pruefe(!zurueck, "Rückgängig nimmt die Zuweisung zurueck");

  /* Noch einmal zuweisen und dann loesen. */
  await page.click('[data-tun="team-zuweisen:F03"]');
  await page.waitForTimeout(300);
  await page.click('[data-tun="team-zuweisen-an:F03|M03"]');
  await page.waitForTimeout(300);
  await page.click('[data-tun="team-zuweisen-ja:F03|M03"]');
  await page.waitForTimeout(350);
  await page.click("button[data-dialog-zu]");
  await page.waitForTimeout(300);
  pruefe((await page.$eval(wagen("F03"), (el) => el.dataset.lage)) === "zugewiesen",
    "das Fahrzeug gilt danach als zugewiesen");

  await page.click('[data-tun="team-loesen:F03"]');
  await page.waitForTimeout(400);
  pruefe(/Zuweisung gelöst/.test(await page.textContent(".dialog-kasten")), "Lösen wird bestaetigt");
  await page.click("button[data-dialog-zu]");
  await page.waitForTimeout(300);
  pruefe((await page.$eval(wagen("F03"), (el) => el.dataset.lage)) === "verfuegbar",
    "danach ist es wieder frei");
  await ctx.close();
}

/* ═══ 6. Gesperrt und Werkstatt ══════════════════════════════════ */
console.log("\n── 6. Nicht einsatzbereite Fahrzeuge ──");
{
  const { ctx, page } = await seite();

  /* Vom Fahrer aus: gesperrte Fahrzeuge stehen nicht zur Auswahl. */
  await page.click(karte("M03"));
  await page.waitForTimeout(350);
  pruefe(Boolean(await page.$('[data-tun="team-fahrzeug-fuer:M03"]')),
    "aus der Fahrerakte fuehrt ein Weg zur Fahrzeugzuweisung");
  await page.click('[data-tun="team-fahrzeug-fuer:M03"]');
  await page.waitForTimeout(400);
  const dialog = await page.textContent(".dialog-kasten");
  pruefe(/Einsatzbereite Fahrzeuge/.test(dialog), "die Auswahl trennt einsatzbereit von gesperrt");
  pruefe(/Nicht einsatzbereit/.test(dialog), "der gesperrte Teil ist eigens ueberschrieben");
  pruefe(/bewusst nicht zur Auswahl/.test(dialog), "und erklaert, warum");
  pruefe(/Unfallschaden/.test(dialog), "mit dem konkreten Grund");

  const waehlbar = await page.$$eval(".wahlraster .wahlkarte", (n) =>
    n.map((x) => x.dataset.tun).filter(Boolean));
  pruefe(!waehlbar.some((x) => x.includes("F05")), "das gesperrte Fahrzeug ist nicht waehlbar");
  pruefe(!waehlbar.some((x) => x.includes("F04")), "das Werkstattfahrzeug ebenso wenig");
  pruefe(waehlbar.some((x) => x.includes("F03")), "ein freies dagegen schon");

  /* Der Versuch ueber den direkten Weg wird erklaert abgelehnt. */
  /* Der direkte Versuch - so, wie ihn eine Bedienhilfe oder ein
     wiederhergestellter Verweis ausloesen koennte. */
  await page.evaluate(() => window.ProbeBereiche.tun("team-zuweisen-an:F05|M03"));
  await page.waitForTimeout(400);
  const abgelehnt = await page.textContent(".dialog-kasten");
  pruefe(/kann deshalb nicht zugewiesen werden/.test(abgelehnt),
    "ein gesperrtes Fahrzeug wird nicht zugewiesen");
  pruefe(/Erst den Zustand ändern/.test(abgelehnt), "und es wird gesagt, was zu tun ist");
  const m03 = await page.evaluate(() =>
    window.ProbeRahmen.zustand.planEntwurf.zeilen.find((z) => z.mitarbeiterId === "M03").fahrzeugId);
  pruefe(!m03, "es wurde nichts zugewiesen");
  await ctx.close();
}

/* ═══ 7. Doppelzuweisung ═════════════════════════════════════════ */
console.log("\n── 7. Doppelzuweisung ──");
{
  const { ctx, page } = await seite();
  /* M05 bekommt F02 - das ist frei, weil M02 krank ist. Danach
     bekommt M01 dasselbe Fahrzeug; beide fahren 06:00-14:00. */
  await page.click('[data-tun="team-zuweisen:F02"]');
  await page.waitForTimeout(300);
  await page.click('[data-tun="team-zuweisen-an:F02|M05"]');
  await page.waitForTimeout(300);
  await page.click('[data-tun="team-zuweisen-ja:F02|M05"]');
  await page.waitForTimeout(350);
  await page.click("button[data-dialog-zu]");
  await page.waitForTimeout(300);

  /* F02 ist jetzt belegt - seine Karte bietet nur noch "Zuweisung
     lösen" an. Der zweite Fahrer kommt deshalb ueber seine Akte. */
  await page.click(karte("M01"));
  await page.waitForTimeout(350);
  await page.click('[data-tun="team-fahrzeug-fuer:M01"]');
  await page.waitForTimeout(350);
  const belegtHinweis = await page.textContent(".dialog-kasten");
  pruefe(/belegt durch Testfahrer 05/.test(belegtHinweis),
    "ein bereits belegtes Fahrzeug ist in der Auswahl gekennzeichnet");
  await page.click('[data-tun="team-zuweisen-an:F02|M01"]');
  await page.waitForTimeout(350);
  const best = await page.textContent(".dialog-kasten");
  pruefe(/bereits vergeben/.test(best), "die Doppelbelegung wird vorher benannt");
  pruefe(/erzeugt aber einen Konflikt/.test(best), "mit dem Hinweis auf den Konfliktweg");
  const knopf = await page.$eval('[data-tun="team-zuweisen-ja:F02|M01"]', (el) => el.className);
  pruefe(/leise/.test(knopf) && !/haupt-knopf/.test(knopf),
    "„Trotzdem zuweisen“ ist zurueckhaltend gestaltet");

  await page.click('[data-tun="team-zuweisen-ja:F02|M01"]');
  await page.waitForTimeout(400);
  await page.click("button[data-dialog-zu]");
  await page.waitForTimeout(300);

  /* Derselbe Zustand in der Planung - eine Wahrheit, zwei Ansichten. */
  await page.evaluate(() => window.ProbeRahmen.geheZu("planung"));
  await page.waitForTimeout(400);
  const planung = await page.textContent(".haupt");
  pruefe(/Fahrzeug doppelt/.test(planung), "die Planung zeigt denselben Konflikt");
  const werte = await page.evaluate(() => {
    const z = window.ProbeRahmen.zustand.planEntwurf.zeilen;
    return {
      m01: z.find((x) => x.mitarbeiterId === "M01").fahrzeugId,
      m05: z.find((x) => x.mitarbeiterId === "M05").fahrzeugId
    };
  });
  pruefe(werte.m01 === "F02" && werte.m05 === "F02",
    `beide Zuweisungen stehen unabhaengig voneinander (${werte.m01} / ${werte.m05})`);
  await ctx.close();
}
/* ═══ 8. Fahrzeugzustand ändern ══════════════════════════════════ */
console.log("\n── 8. Werkstatt und Sperre setzen ──");
{
  const { ctx, page } = await seite("admin");

  await page.click('[data-tun="team-zustand:F03|werkstatt"]');
  await page.waitForTimeout(400);
  const dialog = await page.textContent(".dialog-kasten");
  pruefe(/Zustand ändern/.test(dialog), "der Dialog nennt sein Ziel");
  pruefe(/Bisher/.test(dialog) && /Neu/.test(dialog), "mit vorher und nachher");
  pruefe(await page.isVisible("[data-sperr-grund]"), "ein Grund wird verlangt");

  /* Ohne Grund kommt man nicht einmal in die Pruefung. */
  await page.click('[data-tun="team-zustand-pruefen"]');
  await page.waitForTimeout(400);
  pruefe(/Bitte einen Grund eintragen/.test(await page.textContent(".dialog-kasten")),
    "ohne Grund wird der Zustand nicht geaendert");
  const unveraendert = await page.evaluate(() =>
    window.ProbeDaten.fahrzeuge.find((f) => f.id === "F03").zustand);
  pruefe(unveraendert === "verfuegbar", "das Fahrzeug ist unveraendert");

  await page.fill("[data-sperr-grund]", "Bremsen prüfen.");
  await page.click('[data-tun="team-zustand-pruefen"]');
  await page.waitForTimeout(400);
  await page.click('[data-tun="team-zustand-ja"]');
  await page.waitForTimeout(450);
  const quittung = await page.textContent(".dialog-kasten");
  pruefe(/Zustand geändert/.test(quittung), "mit Grund wird geaendert");
  pruefe(/Bremsen prüfen/.test(quittung), "der Grund steht im Protokoll");
  await page.click("button[data-dialog-zu]");
  await page.waitForTimeout(350);
  pruefe((await page.$eval(wagen("F03"), (el) => el.dataset.lage)) === "werkstatt",
    "das Fahrzeug steht jetzt in der Werkstatt");

  /* Eine bestehende Zuweisung wird dabei geloest. */
  await page.click('[data-tun="team-zustand:F01|gesperrt"]');
  await page.waitForTimeout(400);
  pruefe(/heute zugewiesen/.test(await page.textContent(".dialog-kasten")),
    "es wird gewarnt, dass das Fahrzeug zugewiesen ist");
  await page.fill("[data-sperr-grund]", "Unfallschaden.");
  await page.click('[data-tun="team-zustand-pruefen"]');
  await page.waitForTimeout(400);
  pruefe(/wird gelöst/.test(await page.textContent(".dialog-kasten")),
    "die Pruefung sagt, dass die Zuweisung geloest wird");
  await page.click('[data-tun="team-zustand-ja"]');
  await page.waitForTimeout(450);
  await page.click("button[data-dialog-zu]");
  await page.waitForTimeout(350);
  const m01 = await page.evaluate(() =>
    window.ProbeRahmen.zustand.planEntwurf.zeilen.find((z) => z.mitarbeiterId === "M01").fahrzeugId);
  pruefe(!m01, "die Zuweisung wurde geloest");
  await ctx.close();
}

/* ═══ 9. Rollen und verbotene Bereiche ═══════════════════════════ */
console.log("\n── 9. Rollen ──");
{
  /* Disposition: keine Lohndaten. */
  const a = await seite("dispatcher");
  await a.page.click(karte("M01"));
  await a.page.waitForTimeout(400);
  const dispo = await a.page.textContent(".dialog-kasten");
  /* Seit der Vereinfachung fehlt der Lohnbereich fuer die Disposition
     ganz - nicht einmal als gesperrte Ueberschrift. Die Sperre haengt
     trotzdem an der Faehigkeit; das prueft Block 17 eigens ueber den
     direkten Aufruf. */
  pruefe(!/Lohnabrechnung/.test(dispo), "der Lohnbereich fehlt vollstaendig");
  pruefe(!/Testdatei-M01/.test(dispo), "keine einzige Abrechnung sichtbar");
  pruefe(/Bankdaten und Gehalt/.test(dispo), "Bankdaten und Gehalt sind ausdruecklich gesperrt");
  pruefe(/Testnummer 01/.test(dispo), "betriebliche Kontaktdaten sieht sie dagegen");
  pruefe(!(await a.page.$('[data-tun^="team-lohn-neu"]')), "kein Weg zum Hochladen");
  await a.ctx.close();

  /* Personal: Lohn ja, Fahrzeugsteuerung nein. */
  const b = await seite("personal");
  const personalSeite = await b.page.textContent(".haupt");
  pruefe(/Fahrer/.test(personalSeite), "Personal sieht die Fahrer");
  pruefe((await b.page.$$(".fahrzeugkarte")).length === 0, "aber keine Fahrzeugkarten");
  pruefe(/Keine Berechtigung/.test(personalSeite), "und bekommt das gesagt");
  await b.page.click(karte("M01"));
  await b.page.waitForTimeout(400);
  const pers = await b.page.textContent(".dialog-kasten");
  pruefe(/Testdatei-M01/.test(pers), "Personal sieht die Abrechnungen");
  pruefe(Boolean(await b.page.$('[data-tun^="team-lohn-neu"]')), "und darf bereitstellen");
  await b.ctx.close();

  /* Buchhaltung: kein Zugang zum Bereich. */
  const c = await seite("accounting");
  const buch = await c.page.textContent(".haupt");
  pruefe(/Kein Zugriff|Keine Berechtigung/.test(buch),
    "Buchhaltung kommt gar nicht in den Bereich");
  pruefe(!/Testdatei-M01/.test(buch), "und sieht keine Abrechnungen");
  await c.ctx.close();

  /* Administration: alles. */
  const d = await seite("admin");
  pruefe((await d.page.$$(".fahrzeugkarte")).length === 5, "Administration sieht alle Fahrzeuge");
  pruefe(Boolean(await d.page.$('[data-tun^="team-zustand"]')), "und darf den Zustand aendern");
  await d.ctx.close();
}

/* ═══ 10. Lohnabrechnung bereitstellen ═══════════════════════════ */
console.log("\n── 10. Lohnabrechnungen ──");
{
  const { ctx, page } = await seite("personal");
  await page.click(karte("M01"));
  await page.waitForTimeout(400);
  await page.click('[data-tun="team-lohn-neu:M01"]');
  await page.waitForTimeout(400);
  const dialog = await page.textContent(".dialog-kasten");
  pruefe(/Lohnabrechnung bereitstellen/.test(dialog), "das Fenster oeffnet sich");
  pruefe(/Testfahrer 01/.test(dialog), "der Mitarbeiter steht fest");
  pruefe(/nichts hochgeladen/.test(dialog), "und es wird nichts hochgeladen");

  /* Ohne Zeitraum und Datei kommt man nicht einmal in die Pruefung. */
  await page.click('[data-tun="team-lohn-pruefen"]');
  await page.waitForTimeout(350);
  pruefe(/Bitte Zeitraum und Datei wählen/.test(await page.textContent(".dialog-kasten")),
    "unvollstaendig wird abgelehnt");

  /* Ein bereits vorhandener Monat verlangt einen Grund. */
  await page.selectOption('[data-lohn-neu="monat"]', "08");
  await page.waitForTimeout(350);
  await page.click('[data-tun="team-lohn-datei:Testdatei-A.pdf"]');
  await page.waitForTimeout(350);
  const mitVersion = await page.textContent(".dialog-kasten");
  pruefe(/Die vorhandene Version bleibt erhalten/.test(mitVersion),
    "eine vorhandene Abrechnung wird nicht still ueberschrieben");
  pruefe(/Version 2/.test(mitVersion), "es entsteht eine neue Version");
  pruefe(await page.isVisible("[data-lohn-grund]"), "und der Grund ist Pflicht");
  pruefe(/Testdatei-M01-08-2026-v2\.pdf/.test(mitVersion), "die Bezeichnung ist eindeutig");

  await page.click('[data-tun="team-lohn-pruefen"]');
  await page.waitForTimeout(350);
  pruefe(/braucht es einen Grund/.test(await page.textContent(".dialog-kasten")),
    "ohne Grund wird nicht bereitgestellt");

  await page.fill("[data-lohn-grund]", "Korrektur der Stundenzahl.");
  await page.click('[data-tun="team-lohn-pruefen"]');
  await page.waitForTimeout(350);
  await page.click('[data-tun="team-lohn-fertig"]');
  await page.waitForTimeout(450);
  const quittung = await page.textContent(".dialog-kasten");
  pruefe(/In der Probe wird nichts hochgeladen/.test(quittung), "die Probe bleibt ehrlich");
  pruefe(/Korrektur der Stundenzahl/.test(quittung), "der Grund steht im Protokoll");
  pruefe(/Version 1/.test(quittung) && /Version 2/.test(quittung),
    "vorher und nachher stehen darin");
  pruefe(!/€|EUR|Betrag/.test(quittung), "kein Lohnbetrag im Protokoll");
  await ctx.close();
}

/* ═══ 11. Offene Eingaben gehen nicht verloren ═══════════════════ */
console.log("\n── 11. Offene Eingaben ──");
{
  const { ctx, page } = await seite("admin");
  await page.click('[data-tun="team-zustand:F03|werkstatt"]');
  await page.waitForTimeout(350);
  await page.fill("[data-sperr-grund]", "Bremsen");
  await page.waitForTimeout(200);

  /* Klick daneben darf die Eingabe nicht verschlucken. */
  await page.click(".dialog-hinter", { position: { x: 5, y: 5 } });
  await page.waitForTimeout(350);
  pruefe(await page.isVisible(".dialog-kasten"), "ein Klick daneben schliesst nicht sofort");
  pruefe(/Eingabe geht sonst verloren/.test(await page.textContent(".dialog-kasten")),
    "es wird gewarnt");
  pruefe((await page.inputValue("[data-sperr-grund]")) === "Bremsen", "die Eingabe steht noch");

  /* Escape ebenso. */
  await page.keyboard.press("Escape");
  await page.waitForTimeout(350);
  pruefe(!(await page.isVisible(".dialog-kasten")), "erst die zweite Bestaetigung schliesst");
  await ctx.close();
}

/* ═══ 12. Darstellung, Tastatur, Fokus ═══════════════════════════ */
console.log("\n── 12. Darstellung, Tastatur, Fokus ──");
for (const [name, breite, hoehe] of [["320 px", 320, 568], ["390 px", 390, 844], ["430 px", 430, 932], ["1440 px", 1440, 900]]) {
  const { ctx, page, fehler } = await seite("admin", breite, hoehe);
  let ueberlauf = 0;
  let kleineFelder = 0;
  let kleineFlaechen = 0;

  const sammeln = async () => {
    const m = await page.evaluate(() => {
      const d = document.documentElement;
      return {
        ueber: d.scrollWidth - d.clientWidth,
        klein: [...document.querySelectorAll("input, select, textarea")]
          .filter((el) => el.offsetParent !== null && parseFloat(getComputedStyle(el).fontSize) < 16).length,
        flaechen: [...document.querySelectorAll("button")]
          .filter((el) => el.offsetParent !== null && el.getBoundingClientRect().height < 36).length
      };
    });
    if (m.ueber > 0) ueberlauf += 1;
    kleineFelder += m.klein;
    kleineFlaechen += m.flaechen;
  };

  await sammeln();
  await page.click('[data-tun="team-fahrer-filter:krank"]');
  await page.waitForTimeout(250); await sammeln();
  await page.click('[data-tun="team-fahrer-filter:alle"]');
  await page.waitForTimeout(250);
  await page.click(karte("M01"));
  await page.waitForTimeout(350); await sammeln();
  await page.click("button[data-dialog-zu]");
  await page.waitForTimeout(250);
  await page.click('[data-tun="team-zuweisen:F03"]');
  await page.waitForTimeout(350); await sammeln();
  await page.click("button[data-dialog-zu]");
  await page.waitForTimeout(250);
  await page.click('[data-tun="team-zustand:F03|werkstatt"]');
  await page.waitForTimeout(350); await sammeln();

  pruefe(ueberlauf === 0, `${name}: kein waagerechter Ueberlauf (${ueberlauf} Ansichten)`);
  pruefe(kleineFelder === 0, `${name}: kein Eingabefeld unter 16 px (${kleineFelder})`);
  pruefe(kleineFlaechen === 0, `${name}: keine Bedienflaeche unter 36 px (${kleineFlaechen})`);
  pruefe(fehler.length === 0, `${name}: keine Skriptfehler${fehler.length ? " (" + fehler[0] + ")" : ""}`);
  await ctx.close();
}

{
  const { ctx, page } = await seite("admin", 390, 844);
  await page.click(karte("M01"));
  await page.waitForTimeout(400);
  let drin = true;
  let sichtbar = true;
  for (let i = 0; i < 16; i += 1) {
    await page.keyboard.press("Tab");
    const s = await page.evaluate(() => {
      const kasten = document.querySelector(".dialog-kasten");
      const el = document.activeElement;
      if (!kasten || !el || el === document.body) return { drin: false, umriss: true };
      const cs = getComputedStyle(el);
      const hatFokus = el.matches(":focus");
      return {
        drin: kasten.contains(el),
        umriss: !hatFokus || (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0)
      };
    });
    if (!s.drin) drin = false;
    if (!s.umriss) sichtbar = false;
  }
  pruefe(drin, "der Fokus bleibt in der Fahrerakte (16 Schritte)");
  pruefe(sichtbar, "und ist an jeder Stelle sichtbar");

  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  pruefe(!(await page.isVisible(".dialog-kasten")), "Escape schliesst, solange nichts offen ist");

  /* Die Karten sind mit der Tastatur erreichbar. */
  const erreichbar = await page.$eval(karte("M02"), (el) => el.tagName);
  pruefe(erreichbar === "BUTTON", "jede Fahrerkarte ist eine Schaltflaeche");
  await ctx.close();
}

/* ═══ 14. Letzte Prüfung vor dem Speichern ══════════════════════ */
console.log("\n── 14. Der erste Klick speichert noch nichts ──");
{
  const { ctx, page } = await seite("admin");

  await page.click('[data-tun="team-zustand:F03|werkstatt"]');
  await page.waitForTimeout(400);
  pruefe(Boolean(await page.$('[data-tun="team-zustand-pruefen"]')),
    "das Formular bietet „Änderung prüfen“ an");
  pruefe(!(await page.$('[data-tun="team-zustand-ja"]')),
    "und noch nicht „Verbindlich speichern“");

  await page.fill("[data-sperr-grund]", "Bremsen prüfen.");
  await page.click('[data-tun="team-zustand-pruefen"]');
  await page.waitForTimeout(400);

  const pruefung = await page.textContent(".dialog-kasten");
  pruefe(/Letzte Prüfung/.test(pruefung), "es folgt die letzte Prüfung");
  pruefe(/Noch ist nichts geändert/.test(pruefung), "sie sagt, dass noch nichts geschehen ist");
  pruefe(/Bremsen prüfen/.test(pruefung), "die Begründung steht in der Zusammenfassung");
  pruefe(/Geändert von/.test(pruefung), "und wer die Änderung vornimmt");
  const nochFrei = await page.evaluate(() =>
    window.ProbeDaten.fahrzeuge.find((f) => f.id === "F03").zustand);
  pruefe(nochFrei === "verfuegbar", `nach dem ersten Klick ist nichts gespeichert (${nochFrei})`);
  const protokollVorher = await page.evaluate(() => window.ProbeDaten.protokoll.length);

  /* Zurück und ändern - mit erhaltenen Eingaben. */
  const zurueck = await page.$eval('[data-tun="team-zustand-zurueck"]', (el) => el.className);
  pruefe(/haupt-knopf/.test(zurueck), "„Zurück und ändern“ ist die hervorgehobene Aktion");
  await page.click('[data-tun="team-zustand-zurueck"]');
  await page.waitForTimeout(400);
  pruefe((await page.inputValue("[data-sperr-grund]")) === "Bremsen prüfen.",
    "die Begründung ist vollständig erhalten");

  /* Geänderte Begründung erscheint in der zweiten Prüfung. */
  await page.fill("[data-sperr-grund]", "Bremsen und Reifen prüfen.");
  await page.click('[data-tun="team-zustand-pruefen"]');
  await page.waitForTimeout(400);
  const zweite = await page.textContent(".dialog-kasten");
  pruefe(/Bremsen und Reifen prüfen/.test(zweite), "die geänderte Begründung steht in der zweiten Prüfung");
  pruefe(!/Bremsen prüfen\./.test(zweite.replace("Bremsen und Reifen prüfen.", "")),
    "die alte Fassung nicht mehr");

  /* Erst jetzt verbindlich. */
  await page.click('[data-tun="team-zustand-ja"]');
  await page.waitForTimeout(450);
  const nachher = await page.evaluate(() =>
    window.ProbeDaten.fahrzeuge.find((f) => f.id === "F03").zustand);
  pruefe(nachher === "werkstatt", "„Verbindlich speichern“ schließt die Änderung ab");
  const quittung = await page.textContent(".dialog-kasten");
  pruefe(/Was protokolliert würde/.test(quittung), "und erzeugt die Protokollvorschau");
  pruefe(/Bremsen und Reifen prüfen/.test(quittung), "mit der endgültigen Begründung");
  const protokollNachher = await page.evaluate(() => window.ProbeDaten.protokoll.length);
  pruefe(protokollNachher === protokollVorher + 1,
    `genau ein Protokolleintrag kam dazu (${protokollVorher} → ${protokollNachher})`);
  await ctx.close();
}

/* ═══ 15. Protokolleintrag ist unveränderlich ════════════════════ */
console.log("\n── 15. Ein fertiger Eintrag bleibt, wie er ist ──");
{
  const { ctx, page } = await seite("admin");

  const vorgang = async (ziel, grund) => {
    await page.click(`[data-tun="team-zustand:F03|${ziel}"]`);
    await page.waitForTimeout(350);
    if (await page.$("[data-sperr-grund]")) await page.fill("[data-sperr-grund]", grund);
    await page.click('[data-tun="team-zustand-pruefen"]');
    await page.waitForTimeout(350);
    await page.click('[data-tun="team-zustand-ja"]');
    await page.waitForTimeout(400);
    await page.click("button[data-dialog-zu]");
    await page.waitForTimeout(300);
  };

  await vorgang("werkstatt", "Erster Vorgang.");
  const ersterEintrag = await page.evaluate(() => ({ ...window.ProbeDaten.protokoll[0] }));
  const anzahl1 = await page.evaluate(() => window.ProbeDaten.protokoll.length);

  /* Der Versuch, den Eintrag nachtraeglich zu aendern, laeuft ins
     Leere - er ist eingefroren. */
  const nachSchreibversuch = await page.evaluate(() => {
    const e = window.ProbeDaten.protokoll[0];
    try { e.grund = "nachtraeglich geaendert"; } catch { /* eingefroren */ }
    try { e.nachher = "manipuliert"; } catch { /* eingefroren */ }
    return { grund: e.grund, nachher: e.nachher, eingefroren: Object.isFrozen(e) };
  });
  pruefe(nachSchreibversuch.eingefroren, "der Protokolleintrag ist eingefroren");
  pruefe(nachSchreibversuch.grund === ersterEintrag.grund,
    "der Grund lässt sich nachträglich nicht ändern");
  pruefe(nachSchreibversuch.nachher === ersterEintrag.nachher,
    "und der Zustand ebenso wenig");

  /* Eine spaetere Korrektur ist ein NEUER Vorgang mit eigenem Grund. */
  await vorgang("gesperrt", "Korrektur: doch ein Unfallschaden.");
  const anzahl2 = await page.evaluate(() => window.ProbeDaten.protokoll.length);
  const neuerEintrag = await page.evaluate(() => ({ ...window.ProbeDaten.protokoll[0] }));
  const alterEintrag = await page.evaluate(() => ({ ...window.ProbeDaten.protokoll[1] }));
  pruefe(anzahl2 === anzahl1 + 1, `die Korrektur erzeugt einen eigenen Eintrag (${anzahl1} → ${anzahl2})`);
  pruefe(/Korrektur/.test(neuerEintrag.grund), "mit eigenem Grund");
  pruefe(alterEintrag.grund === ersterEintrag.grund, "der erste Eintrag steht unverändert daneben");
  await ctx.close();
}

/* ═══ 16. Lohnvorschau vollständig ═══════════════════════════════ */
console.log("\n── 16. Vorschau der Lohnabrechnung ──");
{
  const { ctx, page } = await seite("personal");
  await page.click(karte("M01"));
  await page.waitForTimeout(400);
  await page.click('[data-tun="team-lohn-neu:M01"]');
  await page.waitForTimeout(400);
  await page.selectOption('[data-lohn-neu="monat"]', "08");
  await page.waitForTimeout(350);
  await page.click('[data-tun="team-lohn-datei:Testdatei-A.pdf"]');
  await page.waitForTimeout(350);

  const formular = await page.textContent(".dialog-kasten");
  for (const [was, text] of [
    ["Mitarbeiter", "Testfahrer 01"], ["Abrechnungsmonat", "Abrechnungsmonat"],
    ["Abrechnungsjahr", "Abrechnungsjahr"], ["Dateiname", "Testdatei-M01-08-2026-v2.pdf"],
    ["neue Version", "Neue Version"], ["vorherige Version", "Vorherige Version"],
    ["bereitgestellt von", "Bereitgestellt von"], ["Datum und Uhrzeit", "Datum und Uhrzeit"]
  ]) {
    pruefe(formular.includes(text), `die Vorschau nennt ${was}`);
  }
  pruefe(/Die vorhandene Version bleibt erhalten/.test(formular),
    "und sagt ausdrücklich, dass die vorhandene Version bleibt");

  await page.fill("[data-lohn-grund]", "Korrektur der Stundenzahl.");
  await page.click('[data-tun="team-lohn-pruefen"]');
  await page.waitForTimeout(400);
  const pruefung = await page.textContent(".dialog-kasten");
  pruefe(/Letzte Prüfung/.test(pruefung), "danach kommt die letzte Prüfung");
  pruefe(/Noch ist nichts bereitgestellt/.test(pruefung), "sie sagt, dass noch nichts geschehen ist");
  pruefe(/Korrektur der Stundenzahl/.test(pruefung), "der Pflichtgrund steht darin");
  pruefe(/Testdatei-M01-08-2026-v2\.pdf/.test(pruefung), "der Dateiname ebenso");
  pruefe(!/€|EUR/.test(pruefung), "kein Betrag");

  const vorher = await page.evaluate(() => window.ProbeDaten.lohnProbe.length);
  await page.click('[data-tun="team-lohn-zurueck"]');
  await page.waitForTimeout(400);
  pruefe((await page.inputValue("[data-lohn-grund]")) === "Korrektur der Stundenzahl.",
    "„Zurück und ändern“ erhält den Grund");
  pruefe((await page.evaluate(() => window.ProbeDaten.lohnProbe.length)) === vorher,
    "und es wurde nichts bereitgestellt");

  await page.click('[data-tun="team-lohn-pruefen"]');
  await page.waitForTimeout(350);
  await page.click('[data-tun="team-lohn-fertig"]');
  await page.waitForTimeout(450);
  const quittung = await page.textContent(".dialog-kasten");
  pruefe(/Version 1/.test(quittung) && /Version 2/.test(quittung),
    "das Protokoll nennt vorherige und neue Version");
  pruefe(!/€|EUR/.test(quittung), "und keinen Betrag");

  /* Die alte Abrechnung ist noch da. */
  const beide = await page.evaluate(() => window.ProbeDaten.lohnProbe
    .filter((l) => l.mitarbeiterId === "M01" && l.monat === "08" && l.jahr === "2026")
    .map((l) => l.version).sort());
  pruefe(beide.length === 2 && beide[0] === 1 && beide[1] === 2,
    `beide Versionen liegen vor (${beide.join(", ")})`);
  await ctx.close();
}

/* ═══ 17. Lohnbereich für die Disposition ════════════════════════ */
console.log("\n── 17. Die Disposition sieht den Lohnbereich gar nicht ──");
{
  const { ctx, page } = await seite("dispatcher");
  await page.click(karte("M01"));
  await page.waitForTimeout(400);
  const akte = await page.textContent(".dialog-kasten");
  pruefe(!/Lohnabrechnung/.test(akte), "die Überschrift kommt nicht mehr vor");
  pruefe(!/Testdatei-M01/.test(akte), "kein Dateiname");
  pruefe(!/payroll/.test(akte), "und keine Spur der Fähigkeit");
  pruefe(/Bankdaten und Gehalt/.test(akte),
    "die Personalakte bleibt weiterhin ausdrücklich gesperrt");

  /* Der direkte Aufruf liefert trotzdem nichts. */
  const vorher = await page.evaluate(() => window.ProbeDaten.lohnProbe.length);
  await page.evaluate(() => window.ProbeBereiche.tun("team-lohn-neu:M01"));
  await page.waitForTimeout(400);
  const danach = await page.textContent(".dialog-kasten");
  pruefe(!/Lohnabrechnung bereitstellen/.test(danach),
    "ein direkter Aufruf öffnet nichts");
  pruefe((await page.evaluate(() => window.ProbeDaten.lohnProbe.length)) === vorher,
    "und stellt nichts bereit");

  await page.evaluate(() => window.ProbeBereiche.tun("team-lohn-fertig"));
  await page.waitForTimeout(400);
  pruefe((await page.evaluate(() => window.ProbeDaten.lohnProbe.length)) === vorher,
    "auch der direkte Abschluss bleibt wirkungslos");
  await ctx.close();
}

/* ═══ 18. Administration und Personal behalten ihren Zugriff ════ */
console.log("\n── 18. Der Zugriff der Berechtigten bleibt ──");
{
  for (const rolle of ["admin", "personal"]) {
    const { ctx, page } = await seite(rolle);
    await page.click(karte("M01"));
    await page.waitForTimeout(400);
    const akte = await page.textContent(".dialog-kasten");
    pruefe(/Lohnabrechnungen/.test(akte), `${rolle} sieht den Lohnbereich`);
    pruefe(/Testdatei-M01/.test(akte), `${rolle} sieht die vorhandenen Abrechnungen`);
    pruefe(Boolean(await page.$('[data-tun="team-lohn-neu:M01"]')),
      `${rolle} darf bereitstellen`);
    await ctx.close();
  }
}

/* ═══ 13. Nichts geht nach draussen ══════════════════════════════ */
console.log("\n── 13. Kein Netzwerkaufruf ──");
pruefe(fremdeAnfragen.length === 0,
  `keine einzige Anfrage nach aussen im ganzen Lauf (${fremdeAnfragen.length})`);
{
  const quelle = await readFile(join(PROBE, "probe-team.js"), "utf8");
  const ohneKommentar = quelle.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
  pruefe(!/fetch\s*\(|new XMLHttpRequest|new WebSocket|createClient\s*\(|supabase\./i.test(ohneKommentar),
    "kein Netzzugriff im Teammodul");
  pruefe(!/Mustermann|Musterfrau|Herr Müller|Frau Schmidt/.test(quelle), "keine erfundenen Personennamen");
  /* Die Probe SAGT im Text, dass sie keinen Krankheitsgrund fuehrt -
     dieser Satz darf die Pruefung nicht ausloesen. Gesucht wird
     deshalb nach einem Datenfeld, nicht nach dem Wort. */
  pruefe(!/Dialyse|Chemotherapie|Strahlentherapie/.test(ohneKommentar),
    "keine Behandlungsarten im Code");
  pruefe(!/(diagnose|krankheitsgrund|befund)s*[:=]/i.test(ohneKommentar),
    "und kein Feld, das so etwas aufnehmen wuerde");
  pruefe(/kein Krankheitsgrund und keine ärztliche Angabe/.test(quelle),
    "stattdessen steht ausdruecklich da, dass nichts davon gefuehrt wird");
}

await browser.close();
server.close();

console.log("\n" + "═".repeat(59));
console.log(`Fahrer & Fahrzeuge: ${bestanden} bestanden, ${offen.length} nicht bestanden`);
if (offen.length) {
  console.log("\nNicht bestanden:");
  for (const n of offen) console.log("  - " + n);
}
console.log(`
ALLES SIMULIERT. Die Probe hat keine Datenquelle, keinen Upload und
keinen Versand. Dieser Lauf sagt nichts ueber die produktive Instanz.`);
console.log("═".repeat(59));
process.exit(offen.length ? 1 : 0);
