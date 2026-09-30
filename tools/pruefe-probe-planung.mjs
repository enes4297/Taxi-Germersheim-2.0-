/* ============================================================
   Prueflauf: Planung in der Designprobe
   ============================================================
   Prueft die drei Befunde aus dem manuellen Test:
     1. Zeiteingabe HH:MM ohne Springen nach der ersten Ziffer
     2. unabhaengige Mitarbeiterzeilen, Konfliktfilter, richtige
        Leerzustaende, Filterwechsel ohne Datenverlust
     3. Veroeffentlichung erst nach Konfliktpruefung, mit
        Unterscheidung technisch / betrieblich

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
const PORT = 5395;
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

async function seite(breite = 1440, hoehe = 900) {
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
  /* Nicht ueber die Navigation klicken: Unter 900 px ist die
     Seitenleiste ausgeblendet, und der Handy-Eintrag steht an anderer
     Stelle. Der Weg ueber geheZu ist auf jeder Breite derselbe. */
  await page.evaluate(() => window.ProbeRahmen.geheZu("planung"));
  await page.waitForTimeout(350);
  return { ctx, page, fehler };
}

/* Hilfsmittel, die ueber die Mitarbeiterkennung gehen - nie ueber
   eine Zeilennummer. Genau das war der Fehler im Bestand. */
const zeit = (id, teil) => `[data-zeit-kennung="${id}"][data-zeit-teil="${teil}"]`;
const feld = (id, was) => `[data-plan="${was}"][data-mitarbeiter="${id}"]`;
const zeileText = (page, id) => page.textContent(`.plan-zeile[data-mitarbeiter="${id}"]`);

async function zeitTippen(page, id, teil, text) {
  const wahl = zeit(id, teil);
  await page.click(wahl);
  await page.fill(wahl, "");
  await page.type(wahl, text, { delay: 25 });
  return wahl;
}

/* ═══ 1. Zeiteingabe ═════════════════════════════════════════════ */
console.log("\n── 1. Zeiteingabe von links nach rechts ──");
{
  const { ctx, page, fehler } = await seite();

  const art = await page.getAttribute(zeit("M01", "von"), "type");
  pruefe(art === "text", `kein segmentiertes Zeitfeld mehr (type=${art})`);
  const platz = await page.getAttribute(zeit("M01", "von"), "placeholder");
  pruefe(platz === "HH:MM", `der Platzhalter sagt das Format (${platz})`);
  const tastatur = await page.getAttribute(zeit("M01", "von"), "inputmode");
  pruefe(tastatur === "numeric", "am Handy erscheint die Zifferntastatur");

  /* Der eigentliche Befund: "15:30" Ziffer fuer Ziffer tippen. */
  const wahl = await zeitTippen(page, "M01", "von", "15:30");
  const waehrend = await page.inputValue(wahl);
  pruefe(waehrend === "15:30", `"15:30" steht so da, wie es getippt wurde (${waehrend})`);
  await page.keyboard.press("Tab");
  await page.waitForTimeout(300);
  const danach = await page.inputValue(zeit("M01", "von"));
  pruefe(danach === "15:30", `und bleibt nach dem Verlassen stehen (${danach})`);

  /* "1530" ohne Doppelpunkt wird normalisiert. */
  await zeitTippen(page, "M01", "bis", "1530");
  await page.keyboard.press("Tab");
  await page.waitForTimeout(300);
  pruefe((await page.inputValue(zeit("M01", "bis"))) === "15:30",
    "„1530“ wird beim Verlassen zu „15:30“");

  /* Unvollstaendiges wird nicht uebernommen und erklaert sich. */
  await zeitTippen(page, "M02", "von", "15");
  await page.keyboard.press("Tab");
  await page.waitForTimeout(350);
  const zeileM02 = await zeileText(page, "M02");
  pruefe(/unvollständig/.test(zeileM02), "eine unvollstaendige Zeit wird als solche benannt");
  pruefe(await page.isVisible(`.plan-zeile[data-mitarbeiter="M02"] .zeitfehler`),
    "der Fehler steht direkt am Feld");

  /* Ungueltige Minute. */
  await zeitTippen(page, "M02", "von", "15:75");
  await page.keyboard.press("Tab");
  await page.waitForTimeout(350);
  pruefe(/Minute liegt zwischen/.test(await zeileText(page, "M02")),
    "eine unmoegliche Minute wird verstaendlich abgelehnt");

  /* Escape verwirft die laufende Eingabe. */
  await zeitTippen(page, "M03", "von", "07:45");
  await page.keyboard.press("Tab");
  await page.waitForTimeout(300);
  await page.click(zeit("M03", "von"));
  await page.fill(zeit("M03", "von"), "");
  await page.type(zeit("M03", "von"), "22:10", { delay: 20 });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(250);
  pruefe((await page.inputValue(zeit("M03", "von"))) === "07:45",
    "Escape stellt den zuletzt uebernommenen Wert wieder her");

  /* Einfuegen eines kopierten Wertes. */
  await page.click(zeit("M03", "bis"));
  await page.fill(zeit("M03", "bis"), "");
  await page.evaluate((w) => {
    const el = document.querySelector(w);
    el.value = "23:59";
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }, zeit("M03", "bis"));
  await page.keyboard.press("Tab");
  await page.waitForTimeout(300);
  pruefe((await page.inputValue(zeit("M03", "bis"))) === "23:59", "ein eingefuegter Wert wird uebernommen");

  pruefe(fehler.length === 0, `keine Skriptfehler${fehler.length ? " (" + fehler[0] + ")" : ""}`);
  await ctx.close();
}

/* ═══ 2. Nachtschicht und Enter ══════════════════════════════════ */
console.log("\n── 2. Nachtschicht und Eingabetaste ──");
{
  const { ctx, page } = await seite();
  await zeitTippen(page, "M01", "von", "22:00");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  await zeitTippen(page, "M01", "bis", "06:00");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(350);
  const zeile = await zeileText(page, "M01");
  pruefe(/über Mitternacht/.test(zeile), "die Nachtschicht wird als solche erkannt");
  pruefe(!/unvollständig|ungültig/.test(zeile), "und gilt nicht als Fehler");

  /* Enter uebernimmt nur Gueltiges. */
  await zeitTippen(page, "M02", "von", "9");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(350);
  pruefe(/unvollständig/.test(await zeileText(page, "M02")),
    "die Eingabetaste uebernimmt keine unvollstaendige Zeit");

  await page.fill(zeit("M02", "von"), "");
  await page.type(zeit("M02", "von"), "09:15", { delay: 20 });
  await page.keyboard.press("Enter");
  await page.waitForTimeout(350);
  pruefe(!/unvollständig/.test(await zeileText(page, "M02")),
    "mit vollstaendiger Zeit uebernimmt sie");
  await ctx.close();
}

/* ═══ 3. Zeilen sind voneinander unabhaengig ═════════════════════ */
console.log("\n── 3. Eine Aenderung erreicht nur den eigenen Mitarbeiter ──");
{
  const { ctx, page } = await seite();

  const vorher = {};
  for (const id of ["M01", "M02", "M03", "M05"]) {
    vorher[id] = await page.evaluate((i) =>
      window.ProbeRahmen.zustand.planEntwurf.zeilen.find((z) => z.mitarbeiterId === i), id);
  }

  /* Jede Zeile traegt ihre Kennung - keine Nummer. */
  const kennungen = await page.$$eval(".plan-zeile", (n) => n.map((x) => x.dataset.mitarbeiter));
  pruefe(kennungen.length === new Set(kennungen).size, "jede Zeile hat eine eindeutige Kennung");
  pruefe(kennungen.every(Boolean), "und keine ist leer");
  const alteNummern = await page.$$eval("[data-zeile]", (n) => n.length);
  pruefe(alteNummern === 0, `keine Adressierung ueber Zeilennummern mehr (${alteNummern})`);

  /* M01 aendern - M02, M03, M05 duerfen sich nicht bewegen. */
  await page.selectOption(feld("M01", "fahrzeug"), "F03");
  await page.waitForTimeout(350);
  for (const id of ["M02", "M03", "M05"]) {
    const jetzt = await page.evaluate((i) =>
      window.ProbeRahmen.zustand.planEntwurf.zeilen.find((z) => z.mitarbeiterId === i), id);
    pruefe(JSON.stringify(jetzt) === JSON.stringify(vorher[id]),
      `${id} ist durch die Aenderung an M01 unveraendert`);
  }
  const m01 = await page.evaluate(() =>
    window.ProbeRahmen.zustand.planEntwurf.zeilen.find((z) => z.mitarbeiterId === "M01"));
  pruefe(m01.fahrzeugId === "F03", "und M01 hat wirklich das neue Fahrzeug");

  /* Nur die geaenderte Zeile ist markiert. */
  const markiert = await page.$$eval(".plan-zeile.ist-geaendert", (n) => n.map((x) => x.dataset.mitarbeiter));
  pruefe(markiert.length === 1 && markiert[0] === "M01",
    `genau eine Zeile ist als geaendert markiert (${markiert.join(", ") || "keine"})`);
  await ctx.close();
}

/* ═══ 4. Gemeinsames Fahrzeug erzeugt Konflikt, ueberschreibt nichts ═══ */
console.log("\n── 4. Zwei Mitarbeiter, ein Fahrzeug ──");
{
  const { ctx, page } = await seite();

  /* M02 bekommt dasselbe Fahrzeug wie M01 - beide sind im Dienst und
     ihre Zeiten ueberschneiden sich. */
  await page.selectOption(feld("M01", "fahrzeug"), "F01");
  await page.waitForTimeout(300);
  await page.selectOption(feld("M02", "vorlage"), "frueh");
  await page.waitForTimeout(300);
  await page.selectOption(feld("M02", "fahrzeug"), "F01");
  await page.waitForTimeout(350);

  const beide = await page.evaluate(() => {
    const z = window.ProbeRahmen.zustand.planEntwurf.zeilen;
    return {
      a: z.find((x) => x.mitarbeiterId === "M01"),
      b: z.find((x) => x.mitarbeiterId === "M02")
    };
  });
  pruefe(beide.a.fahrzeugId === "F01" && beide.b.fahrzeugId === "F01",
    "beide behalten ihren eigenen Wert - nichts wurde ueberschrieben");
  pruefe(beide.a.von === "06:00" && beide.b.von === "06:00",
    "und ihre Zeiten stehen unabhaengig voneinander");

  const m01 = await zeileText(page, "M01");
  const m02 = await zeileText(page, "M02");
  pruefe(/Fahrzeug doppelt/.test(m01) && /Fahrzeug doppelt/.test(m02),
    "beide Zeilen zeigen den Konflikt");
  await ctx.close();
}

/* ═══ 5. Konfliktfilter und Leerzustand ══════════════════════════ */
console.log("\n── 5. Konfliktfilter: kein abrupter Leerlauf ──");
{
  const { ctx, page } = await seite();

  /* Der Tagesplan bringt schon zwei Konflikte mit: M03 ist im Dienst
     ohne Fahrzeug, und M05 teilt sich F01 mit M01 zur gleichen Zeit.
     Fuer den Leerzustand muessen ALLE geloest werden - sonst bleiben
     zu Recht Zeilen stehen. */
  const offeneKonflikte = () => page.evaluate(() => {
    const e = window.ProbeRahmen.zustand.planEntwurf;
    return document.querySelectorAll(".plan-zeile").length;
  });

  await page.click('[data-tun="plan-filter:konflikte"]');
  await page.waitForTimeout(350);
  const sichtbar = await page.$$eval(".plan-zeile", (n) => n.map((x) => x.dataset.mitarbeiter));
  pruefe(sichtbar.includes("M03"), "der Filter zeigt den Mitarbeiter ohne Fahrzeug");
  pruefe(sichtbar.includes("M01") && sichtbar.includes("M05"),
    "und beide, die sich ein Fahrzeug teilen");
  pruefe(!sichtbar.includes("M02"), "nicht aber die unbeteiligten");

  /* Ersten Konflikt loesen - die Ansicht darf NICHT leerlaufen. */
  await page.selectOption(feld("M03", "fahrzeug"), "F03");
  await page.waitForTimeout(400);
  const dazwischen = await page.$$eval(".plan-zeile", (n) => n.map((x) => x.dataset.mitarbeiter));
  pruefe(dazwischen.length > 0, "nach dem ersten geloesten Konflikt steht die Liste noch");
  pruefe(!dazwischen.includes("M03"), "der geloeste Fall ist verschwunden");
  pruefe(dazwischen.includes("M01") && dazwischen.includes("M05"), "der offene bleibt");

  /* Jetzt den letzten loesen. */
  await page.selectOption(feld("M05", "fahrzeug"), "F03");
  await page.waitForTimeout(450);
  const nachher = await page.textContent(".haupt");
  pruefe(/Alle Konflikte gelöst/.test(nachher), "geloest heisst: „Alle Konflikte gelöst.“");
  pruefe(!/Für diesen Zeitraum ist nichts eingetragen/.test(nachher),
    "der unpassende allgemeine Leertext erscheint nicht mehr");
  pruefe(!/Das ist kein Fehler/.test(nachher), "und auch nicht sein Nachsatz");
  pruefe(/Die Zeilen sind nicht verschwunden/.test(nachher),
    "es wird erklaert, warum hier nichts steht");
  pruefe(await page.isVisible('.zustand [data-tun="plan-filter:alle"]'),
    "„Alle Mitarbeiter anzeigen“ steht im Leerzustand");
  pruefe(await page.isVisible('.zustand [data-tun="plan-rueckgaengig"]'),
    "und „Letzte Änderung rückgängig“");

  /* Der Weg zurueck. */
  await page.click('.zustand [data-tun="plan-filter:alle"]');
  await page.waitForTimeout(350);
  pruefe((await page.$$(".plan-zeile")).length === 6, "„Alle Mitarbeiter anzeigen“ bringt alle zurueck");

  /* Und die Werte stehen alle noch. */
  const m05 = await page.evaluate(() =>
    window.ProbeRahmen.zustand.planEntwurf.zeilen.find((z) => z.mitarbeiterId === "M05"));
  pruefe(m05.fahrzeugId === "F03", "die Aenderung im Konfliktfilter ist erhalten");
  await ctx.close();
}

/* ═══ 6. Filterwechsel verliert nichts ═══════════════════════════ */
console.log("\n── 6. Filterwechsel und Rueckgaengig ──");
{
  const { ctx, page } = await seite();
  await page.selectOption(feld("M04", "dienst"), "ja");
  await page.waitForTimeout(250);
  await zeitTippen(page, "M04", "von", "05:30");
  await page.keyboard.press("Tab");
  await page.waitForTimeout(300);
  await page.selectOption(feld("M04", "fahrzeug"), "F03");
  await page.waitForTimeout(300);

  const merkwert = await page.evaluate(() =>
    window.ProbeRahmen.zustand.planEntwurf.zeilen.find((z) => z.mitarbeiterId === "M04"));

  for (const f of ["ungeplant", "konflikte", "alle"]) {
    await page.click(`[data-tun="plan-filter:${f}"]`);
    await page.waitForTimeout(300);
    const jetzt = await page.evaluate(() =>
      window.ProbeRahmen.zustand.planEntwurf.zeilen.find((z) => z.mitarbeiterId === "M04"));
    pruefe(JSON.stringify(jetzt) === JSON.stringify(merkwert),
      `Filter „${f}“ laesst die Eingaben unangetastet`);
  }

  await page.click('[data-tun="plan-rueckgaengig"]');
  await page.waitForTimeout(350);
  const nachRueck = await page.evaluate(() =>
    window.ProbeRahmen.zustand.planEntwurf.zeilen.find((z) => z.mitarbeiterId === "M04"));
  pruefe(nachRueck.fahrzeugId !== "F03", "Rueckgaengig nimmt die letzte Aenderung zurueck");
  pruefe(nachRueck.von === "05:30", "und laesst die vorherige Eingabe stehen");
  await ctx.close();
}

/* ═══ 7. Erster Klick veroeffentlicht nicht ══════════════════════ */
console.log("\n── 7. Der erste Klick prueft nur ──");
{
  const { ctx, page } = await seite();
  const vorher = await page.evaluate(() => {
    const iso = window.ProbeDaten.alsIso(window.ProbeDaten.heute);
    return window.ProbeDaten.planung[iso].veroeffentlichtUm;
  });
  await page.click('[data-tun="plan-veroeffentlichen"]');
  await page.waitForTimeout(400);
  pruefe(await page.isVisible(".dialog-kasten"), "es oeffnet sich die Pruefung");
  const titel = await page.textContent("#pruefTitel");
  pruefe(/Konfliktprüfung vor dem Veröffentlichen/.test(titel), "sie heisst auch so");
  const nachher = await page.evaluate(() => {
    const iso = window.ProbeDaten.alsIso(window.ProbeDaten.heute);
    return window.ProbeDaten.planung[iso].veroeffentlichtUm;
  });
  pruefe(vorher === nachher, "und es wurde nichts veroeffentlicht");

  const rumpf = await page.textContent(".dialog-rumpf");
  pruefe(/Tag/.test(rumpf) && /\d{2}\.\d{2}\.\d{4}/.test(rumpf), "Tag und vollstaendiges Datum stehen da");
  pruefe(/Eingeplant/.test(rumpf) && /Ohne Fahrzeug/.test(rumpf) && /Konflikte/.test(rumpf),
    "dazu Anzahl, Fahrzeuglage und Konflikte");
  await ctx.close();
}

/* ═══ 8. Technisch ungueltig - keine Veroeffentlichung ═══════════ */
console.log("\n── 8. Technisch ungueltig sperrt ──");
{
  const { ctx, page } = await seite();
  await zeitTippen(page, "M01", "von", "15");
  await page.keyboard.press("Tab");
  await page.waitForTimeout(350);

  await page.click('[data-tun="plan-veroeffentlichen"]');
  await page.waitForTimeout(400);
  const rumpf = await page.textContent(".dialog-rumpf");
  pruefe(/technisch ungültig/.test(rumpf), "die Pruefung nennt es technisch ungueltig");
  pruefe(/keine Ermessensfrage/.test(rumpf), "und macht klar, dass es keine Entscheidung ist");
  pruefe(/unvollständig/.test(rumpf), "der konkrete Grund steht dabei");

  const fuss = await page.textContent(".dialog-fuss");
  pruefe(/Zur Planung zurück/.test(fuss), "es gibt nur den Weg zurueck");
  pruefe(!/Trotzdem veröffentlichen/.test(fuss), "kein Ausweg ueber „Trotzdem veröffentlichen“");
  const knoepfe = await page.$$eval(".dialog-fuss button", (n) => n.length);
  pruefe(knoepfe === 1, `genau eine Schaltflaeche im Fuss (${knoepfe})`);

  await page.click('[data-tun="plan-zurueck-zur-planung"]');
  await page.waitForTimeout(350);
  pruefe(!(await page.isVisible(".dialog-kasten")), "„Zur Planung zurück“ schliesst die Pruefung");
  await ctx.close();
}

/* ═══ 9. Betrieblicher Konflikt - bewusste Entscheidung ══════════ */
console.log("\n── 9. Betrieblicher Konflikt ──");
{
  const { ctx, page } = await seite();
  await page.selectOption(feld("M01", "fahrzeug"), "F01");
  await page.waitForTimeout(250);
  await page.selectOption(feld("M02", "vorlage"), "frueh");
  await page.waitForTimeout(250);
  await page.selectOption(feld("M02", "fahrzeug"), "F01");
  await page.waitForTimeout(300);

  await page.click('[data-tun="plan-veroeffentlichen"]');
  await page.waitForTimeout(400);
  const rumpf = await page.textContent(".dialog-rumpf");
  pruefe(/betrieblicher Konflikt/.test(rumpf), "die Pruefung nennt ihn betrieblich");
  pruefe(/verwenden gleichzeitig GER-TEST 001/.test(rumpf),
    "und erklaert ihn im Klartext mit Namen und Kennzeichen");
  pruefe(/ist im Dienst, aber es wurde kein Fahrzeug zugewiesen/.test(rumpf),
    "auch „kein Fahrzeug“ wird als Satz erklaert");

  const primaer = await page.$eval('[data-tun="plan-zurueck-zur-planung"]', (el) => el.className);
  const sekundaer = await page.$eval('[data-tun="plan-trotzdem"]', (el) => el.className);
  pruefe(/haupt-knopf/.test(primaer), "„Zurück und korrigieren“ ist die hervorgehobene Aktion");
  pruefe(/leise/.test(sekundaer) && !/haupt-knopf/.test(sekundaer),
    "„Trotzdem veröffentlichen“ ist deutlich zurueckhaltender");

  /* Zweite Bestaetigung mit Pflichtgrund. */
  await page.click('[data-tun="plan-trotzdem"]');
  await page.waitForTimeout(350);
  const zweite = await page.textContent(".dialog-kasten");
  pruefe(/Trotz Konflikten veröffentlichen\?/.test(zweite), "es folgt eine zweite Bestaetigung");
  pruefe(/Pflichtfeld/.test(zweite), "mit Pflichtfeld für den Grund");
  pruefe(/\d{2}\.\d{2}\.\d{4}/.test(zweite), "sie nennt das Datum erneut");
  pruefe(/Offene Konflikte/.test(zweite), "und die Konfliktanzahl");
  pruefe(await page.isVisible("[data-grund]"), "das Grundfeld ist da");

  /* Ohne Grund geht nichts. */
  const vorher = await page.evaluate(() => {
    const iso = window.ProbeDaten.alsIso(window.ProbeDaten.heute);
    return window.ProbeDaten.planung[iso].veroeffentlichtUm;
  });
  await page.click('[data-tun="plan-trotzdem-ja"]');
  await page.waitForTimeout(400);
  pruefe(/Bitte einen Grund eintragen/.test(await page.textContent(".dialog-kasten")),
    "ohne Grund wird nicht veroeffentlicht");
  const zwischen = await page.evaluate(() => {
    const iso = window.ProbeDaten.alsIso(window.ProbeDaten.heute);
    return window.ProbeDaten.planung[iso].veroeffentlichtUm;
  });
  pruefe(vorher === zwischen, "und wirklich nichts geschrieben");

  /* Abbruch der zweiten Bestaetigung fuehrt zurueck zur Pruefung. */
  await page.click('[data-tun="plan-zurueck-zur-pruefung"]');
  await page.waitForTimeout(350);
  pruefe(/Konfliktprüfung vor dem Veröffentlichen/.test(await page.textContent(".dialog-kasten")),
    "Abbrechen fuehrt zurueck zur Konfliktpruefung");

  /* Mit Grund geht es. */
  await page.click('[data-tun="plan-trotzdem"]');
  await page.waitForTimeout(300);
  await page.fill("[data-grund]", "Fahrzeugwechsel ist mündlich geklärt.");
  await page.click('[data-tun="plan-trotzdem-ja"]');
  await page.waitForTimeout(450);
  const erfolg = await page.textContent(".dialog-kasten");
  pruefe(/Plan veröffentlicht/.test(erfolg), "mit Grund wird veroeffentlicht");
  pruefe(/Nur in dieser Designprobe/.test(erfolg), "die Meldung bleibt ehrlich");
  pruefe(/Was protokolliert würde/.test(erfolg), "und zeigt, was protokolliert wuerde");
  pruefe(/Fahrzeugwechsel ist mündlich geklärt/.test(erfolg), "einschliesslich des Grundes");
  pruefe(/keine Konfliktliste und keine Daten anderer Mitarbeiter/.test(erfolg),
    "und nennt, was Mitarbeiter spaeter sehen");
  await ctx.close();
}

/* ═══ 10. Ohne Konflikte ═════════════════════════════════════════ */
console.log("\n── 10. Plan ohne Konflikte ──");
{
  const { ctx, page } = await seite();
  /* Alle frei setzen - dann gibt es nichts zu beanstanden. */
  await page.click('[data-tun="plan-alle-frei"]');
  await page.waitForTimeout(350);
  await page.click('[data-tun="plan-veroeffentlichen"]');
  await page.waitForTimeout(400);
  const rumpf = await page.textContent(".dialog-rumpf");
  pruefe(/Keine Konflikte/.test(rumpf), "die Pruefung meldet keine Konflikte");
  pruefe(await page.isVisible('[data-tun="plan-veroeffentlichen-ja"]'),
    "und bietet das Veroeffentlichen unmittelbar an");
  await page.click('[data-tun="plan-veroeffentlichen-ja"]');
  await page.waitForTimeout(400);
  const erfolg = await page.textContent(".dialog-kasten");
  pruefe(/Plan veröffentlicht/.test(erfolg), "es wird veroeffentlicht");
  pruefe(!/Was protokolliert würde/.test(erfolg),
    "ohne Konflikte braucht es kein Konfliktprotokoll");
  await ctx.close();
}

/* ═══ 11. Mitarbeiter sehen keine Konfliktdaten ══════════════════ */
console.log("\n── 11. Mitarbeitersicht ──");
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.route("**://**", (route) => {
    const u = route.request().url();
    if (u.startsWith(ADRESSE)) return route.continue();
    fremdeAnfragen.push(u);
    return route.abort();
  });
  const page = await ctx.newPage();
  await page.goto(ADRESSE, { waitUntil: "load" });
  await page.waitForTimeout(350);
  await page.selectOption("[data-rolle]", "employee");
  await page.waitForTimeout(350);

  const nav = await page.$$eval("[data-navigation] .nav-knopf span:first-of-type",
    (n) => n.map((x) => x.textContent.trim()));
  pruefe(!nav.includes("Planung"), "ein Mitarbeiter sieht die Planung gar nicht");

  await page.evaluate(() => window.ProbeRahmen.geheZu("planung"));
  await page.waitForTimeout(350);
  const inhalt = await page.textContent(".haupt");
  pruefe(/Keine Berechtigung|Kein Zugriff/.test(inhalt),
    "auch der direkte Weg fuehrt nur zu „keine Berechtigung“");
  pruefe(!/Fahrzeug doppelt|verwenden gleichzeitig|Konflikt/.test(inhalt),
    "keine Konfliktdaten in der Mitarbeiteransicht");
  pruefe(!/Testfahrer 0[1-6]/.test(inhalt), "und keine Daten anderer Mitarbeiter");
  await ctx.close();
}

/* ═══ 12. Darstellung und Tastatur ═══════════════════════════════ */
console.log("\n── 12. Darstellung, Tastatur, Fokus ──");
for (const [name, breite, hoehe] of [["320 px", 320, 568], ["390 px", 390, 844], ["430 px", 430, 932], ["1440 px", 1440, 900]]) {
  const { ctx, page, fehler } = await seite(breite, hoehe);
  const messen = async () => page.evaluate(() => {
    const d = document.documentElement;
    return {
      ueber: d.scrollWidth - d.clientWidth,
      klein: [...document.querySelectorAll("input, select, textarea")]
        .filter((el) => el.offsetParent !== null && parseFloat(getComputedStyle(el).fontSize) < 16).length,
      flaechen: [...document.querySelectorAll("button")]
        .filter((el) => el.offsetParent !== null && el.getBoundingClientRect().height < 36).length
    };
  });

  let ueberlauf = 0;
  let kleineFelder = 0;
  let kleineFlaechen = 0;
  const sammeln = async () => {
    const m = await messen();
    if (m.ueber > 0) ueberlauf += 1;
    kleineFelder += m.klein;
    kleineFlaechen += m.flaechen;
  };

  await sammeln();
  await page.click('[data-tun="plan-filter:konflikte"]');
  await page.waitForTimeout(300); await sammeln();
  await page.click('[data-tun="plan-filter:alle"]');
  await page.waitForTimeout(300);
  await page.selectOption(feld("M01", "fahrzeug"), "F01");
  await page.waitForTimeout(250);
  await page.selectOption(feld("M02", "vorlage"), "frueh");
  await page.waitForTimeout(250);
  await page.selectOption(feld("M02", "fahrzeug"), "F01");
  await page.waitForTimeout(300); await sammeln();
  await page.click('[data-tun="plan-veroeffentlichen"]');
  await page.waitForTimeout(400); await sammeln();
  await page.click('[data-tun="plan-trotzdem"]');
  await page.waitForTimeout(400); await sammeln();

  pruefe(ueberlauf === 0, `${name}: kein waagerechter Ueberlauf (${ueberlauf} Ansichten)`);
  pruefe(kleineFelder === 0, `${name}: kein Eingabefeld unter 16 px (${kleineFelder})`);
  pruefe(kleineFlaechen === 0, `${name}: keine Bedienflaeche unter 36 px (${kleineFlaechen})`);
  pruefe(fehler.length === 0, `${name}: keine Skriptfehler${fehler.length ? " (" + fehler[0] + ")" : ""}`);
  await ctx.close();
}

{
  const { ctx, page } = await seite(390, 844);
  await page.click('[data-tun="plan-veroeffentlichen"]');
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
  pruefe(drin, "der Fokus bleibt in der Konfliktpruefung (16 Schritte)");
  pruefe(sichtbar, "und ist an jeder Stelle sichtbar");

  /* Die Zeitfelder sind mit der Tastatur erreichbar. */
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  await page.focus(zeit("M01", "von"));
  const markiert = await page.evaluate((w) => {
    const el = document.querySelector(w);
    return el.selectionStart === 0 && el.selectionEnd === el.value.length;
  }, zeit("M01", "von"));
  pruefe(markiert, "beim Hineinspringen ist der Wert markiert und leicht zu ersetzen");
  await ctx.close();
}

/* ═══ 13. Nichts geht nach draussen ══════════════════════════════ */
console.log("\n── 13. Kein Netzwerkaufruf ──");
pruefe(fremdeAnfragen.length === 0,
  `keine einzige Anfrage nach aussen im ganzen Lauf (${fremdeAnfragen.length})`);
{
  const quelle = await readFile(join(PROBE, "probe-zeitfeld.js"), "utf8");
  const ohneKommentar = quelle.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
  pruefe(!/fetch\s*\(|new XMLHttpRequest|new WebSocket|createClient\s*\(|supabase\./i.test(ohneKommentar),
    "kein Netzzugriff im Zeitfeld");
}

await browser.close();
server.close();

console.log("\n" + "═".repeat(59));
console.log(`Planung: ${bestanden} bestanden, ${offen.length} nicht bestanden`);
if (offen.length) {
  console.log("\nNicht bestanden:");
  for (const n of offen) console.log("  - " + n);
}
console.log(`
ALLES SIMULIERT. Die Probe hat keine Datenquelle, keinen Upload und
keinen Versand. Dieser Lauf sagt nichts ueber die produktive Instanz.`);
console.log("═".repeat(59));
process.exit(offen.length ? 1 : 0);
