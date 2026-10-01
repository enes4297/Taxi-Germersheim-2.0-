/* ============================================================
   Prueflauf: vierter Prueffall "Falsche Person oder falscher Vorgang"
   ============================================================
   Vorgabe des Geschaeftsfuehrers vom 01.10.2026. Geprueft wird jeder
   Punkt der Regel einzeln:

   - Die Personalpruefung bleibt offen.
   - Der Nachweis wird als "Zuordnung ungeklaert" markiert.
   - Er darf nicht als geprueft oder gueltig verwendet werden.
   - Es entsteht automatisch eine Klaerungsaufgabe fuer Personal oder
     Administration.
   - Die Datei wird nicht geloescht und nicht von selbst einem anderen
     Mitarbeiter zugeordnet.
   - Eine Neuzuordnung ist nur durch Personal oder Administration
     moeglich.
   - Vor der Neuzuordnung erscheint eine Zusammenfassung: bisherige
     Zuordnung, neue Zuordnung, Pflichtgrund.
   - Erst "Verbindlich speichern" fuehrt sie aus.
   - Protokolliert werden urspruengliche Zuordnung, neue Zuordnung,
     handelnde Person, Rolle, Datum, Uhrzeit und Grund.
   - Die Disposition sieht weder Dateiname noch Datei noch
     Zuordnungsdetails.
   - Nach der Neuzuordnung beginnt die Pruefung beim richtigen Vorgang
     wieder bei Schritt 1.
   - Laesst sich keine richtige Zuordnung feststellen, bleibt der
     Nachweis gesperrt und der Vorgang offen.

   ALLES SIMULIERT. Keine Datenquelle, kein Upload, kein Versand. Es
   gibt in dieser Probe keine Datei und keine Storage-API.
   ============================================================ */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";

const { chromium } = await import(
  "file:///" + join(process.cwd(), "fahrer/tests/node_modules/playwright/index.mjs").replace(/\\/g, "/")
);

const WURZEL = process.cwd();
const PROBE = join(WURZEL, "probe-betriebsportal");
const PORT = 5390;
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

async function seite(rolle = "personal", breite = 1440, hoehe = 900) {
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
  await page.evaluate(() => window.ProbeRahmen.geheZu("meldungen"));
  await page.waitForTimeout(400);
  await page.click('[data-tun="vg-reiter:alle"]');
  await page.waitForTimeout(300);
  return { ctx, page, fehler };
}

const oeffnen = async (page, id = "V0002") => {
  await page.click('[data-tun="vg-reiter:alle"]');
  await page.waitForTimeout(300);
  await page.click(`.vorgang[data-vorgang="${id}"] [data-tun="vg-oeffnen:${id}"]`);
  await page.waitForTimeout(450);
};
const knoepfe = (page) =>
  page.$$eval(".dialog-kasten [data-tun]", (n) => n.map((x) => x.dataset.tun));
const daten = (page, id = "V0002") =>
  page.evaluate((x) => JSON.parse(JSON.stringify(window.ProbeDaten.vorgangVon(x).daten)), id);
const teilstand = (page, id = "V0002") => page.evaluate((x) =>
  window.ProbeDaten.vorgangVon(x).teile.personal.zustand, id);
const protokoll = (page) => page.evaluate(() => window.ProbeDaten.protokoll.slice());
const zielId = (page) => page.evaluate(() => {
  const z = window.ProbeDaten.vorgaenge.find((x) => x.daten && x.daten.herkunftVorgang === "V0002")
    || window.ProbeDaten.vorgaenge.find((x) => x.daten && x.daten.bezugAuf === "V0002");
  return z ? z.id : "";
});

/* Bis zum Ergebnis "falsche Person" fuehren. */
const bisFalschePerson = async (page) => {
  await oeffnen(page);
  await page.click('[data-tun="vg-bescheinigung:V0002"]');
  await page.waitForTimeout(400);
  await page.click('[data-tun="vg-einsicht-ja:V0002"]');
  await page.waitForTimeout(400);
  await page.click('[data-tun="vg-ergebnis:V0002|person"]');
  await page.waitForTimeout(500);
};

/* ═══ 1. Der vierte Fall steht zur Auswahl ══════════════════════ */
console.log("\n── 1. Der vierte Fall ist wieder da ──");
{
  const { ctx, page, fehler } = await seite("personal");
  await oeffnen(page);
  await page.click('[data-tun="vg-bescheinigung:V0002"]');
  await page.waitForTimeout(400);
  await page.click('[data-tun="vg-einsicht-ja:V0002"]');
  await page.waitForTimeout(450);

  const auswahl = await page.$$eval(".pruefkette .wahlkarte strong",
    (n) => n.map((x) => x.textContent.trim()));
  pruefe(auswahl.length === 4, `vier Ergebnisse (${auswahl.length})`);
  pruefe(auswahl.includes("Falsche Person oder falscher Vorgang"),
    "„Falsche Person oder falscher Vorgang“ ist dabei");
  const karte = await page.textContent('[data-tun="vg-ergebnis:V0002|person"]');
  pruefe(/bleibt offen/.test(karte), "die Karte nennt die Folge vorab");
  pruefe(/Zuordnung ungeklärt/.test(karte), "und die Markierung");
  pruefe(fehler.length === 0, `keine Skriptfehler${fehler.length ? " (" + fehler[0] + ")" : ""}`);
  await ctx.close();
}

/* ═══ 2. Die Folge: gesperrt, offen, Klärungsaufgabe ════════════ */
console.log("\n── 2. Der Nachweis wird gesperrt, nicht gelöscht ──");
{
  const { ctx, page } = await seite("personal");
  await bisFalschePerson(page);

  pruefe(await teilstand(page) === "offen", "die Personalprüfung bleibt offen");
  const d = await daten(page);
  pruefe(d.nachweise.length === 1, "die Datei ist nicht gelöscht");
  pruefe(d.nachweise[0].zuordnungUngeklaert === true,
    "der Nachweis ist als „Zuordnung ungeklärt“ markiert");
  pruefe(d.nachweise[0].gesperrt === true, "und gesperrt");
  pruefe(d.nachweise[0].umgezogenNach === "",
    "er ist niemandem von selbst zugeordnet worden");

  pruefe(d.klaerungen.length === 1 && d.klaerungen[0].art === "zuordnung",
    "es entsteht eine Klärungsaufgabe");
  pruefe(d.klaerungen[0].zustand === "offen", "sie ist offen");
  pruefe(/Personal oder Administration/.test(d.klaerungen[0].text),
    "sie nennt, wer sie klären darf");
  pruefe(/Testpersonal 01/.test(d.klaerungen[0].wer.name), "und wer sie angestoßen hat");

  const text = await page.textContent(".dialog-kasten");
  pruefe(/Zuordnung ungeklärt/.test(text), "die Markierung ist sichtbar");
  pruefe(/nicht als geprüft verwendbar/.test(text),
    "und sagt, dass der Nachweis nicht als geprüft gilt");

  /* Nicht abschliessbar - auch nicht direkt. */
  const k = await knoepfe(page);
  pruefe(!k.some((x) => x.startsWith("vg-teil-erledigen")),
    "der Abschluss ist gesperrt");
  await page.evaluate(() => window.ProbeVorgaenge.tun("vg-teil-erledigen", "V0002|personal"));
  await page.waitForTimeout(350);
  pruefe(await teilstand(page) === "offen", "auch der direkte Aufruf schliesst nicht ab");
  await page.evaluate(() => window.ProbeVorgaenge.tun("vg-erledigen", "V0002"));
  await page.waitForTimeout(350);
  pruefe(await teilstand(page) === "offen", "und der zweite Weg ebenso wenig");

  const p = await protokoll(page);
  pruefe(p.some((x) => /Zuordnung als ungeklärt markiert/.test(x.was)),
    "die Markierung steht im Protokoll");
  await ctx.close();
}

/* ═══ 3. Nur Personal und Administration dürfen klären ══════════ */
console.log("\n── 3. Die Klärung ist Personal und Administration vorbehalten ──");
{
  /* Zuerst von Personal in den Zustand bringen. */
  const { ctx, page } = await seite("personal");
  await bisFalschePerson(page);
  pruefe(Boolean(await page.$('[data-tun="vg-zuordnung:V0002"]')),
    "Personal darf neu zuordnen");
  pruefe(Boolean(await page.$('[data-tun="vg-zuordnung-unklar:V0002"]')),
    "und festhalten, dass es nicht geht");

  /* Dieselbe Seite als Disposition. */
  await page.evaluate(() => window.ProbeRahmen.dialogSchliessen(true));
  await page.waitForTimeout(250);
  await page.selectOption("[data-rolle]", "dispatcher");
  await page.waitForTimeout(400);
  await oeffnen(page);
  const dText = await page.textContent(".dialog-kasten");
  pruefe(!/\.pdf/i.test(dText), "die Disposition sieht keinen Dateinamen");
  pruefe(!(await page.$(".konfliktliste")), "keine Nachweisliste");
  pruefe(!(await page.$(".pruefkette")), "keine Prüfkette");
  pruefe(!/Zuordnung ungeklärt/.test(dText), "und keine Zuordnungsdetails");
  const dk = await knoepfe(page);
  pruefe(!dk.some((x) => x.startsWith("vg-zuordnung")),
    "keinen Weg zur Neuzuordnung");

  for (const [name, wert] of [["vg-zuordnung", "V0002"],
    ["vg-zuordnung-ziel", "V0002|M03"], ["vg-zuordnung-weiter", ""],
    ["vg-zuordnung-ja", ""], ["vg-zuordnung-unklar", "V0002"]]) {
    await page.evaluate(([a, b]) => window.ProbeVorgaenge.tun(a, b), [name, wert]);
    await page.waitForTimeout(120);
  }
  const d = await daten(page);
  pruefe(d.nachweise[0].umgezogenNach === "" && d.nachweise[0].zuordnungUngeklaert === true,
    "auch die direkten Aufrufe ändern bei ihr nichts");
  pruefe(d.nachweise.length === 1, "und löschen nichts");
  await ctx.close();

  /* Administration darf. */
  const a = await seite("admin");
  await bisFalschePerson(a.page);
  pruefe(Boolean(await a.page.$('[data-tun="vg-zuordnung:V0002"]')),
    "die Administration darf ebenfalls neu zuordnen");
  await a.ctx.close();
}

/* ═══ 4. Zwei Stufen, Zusammenfassung, Pflichtgrund ════════════ */
console.log("\n── 4. Erst prüfen, dann verbindlich speichern ──");
{
  const { ctx, page } = await seite("personal");
  await bisFalschePerson(page);
  await page.click('[data-tun="vg-zuordnung:V0002"]');
  await page.waitForTimeout(450);

  /* Stufe 1: Wahl. */
  const s1 = await page.textContent(".dialog-kasten");
  pruefe(/Nachweis neu zuordnen/.test(s1), "Stufe 1 fragt nach der Person");
  pruefe(/Testbescheinigung-M02-01\.pdf/.test(s1), "sie nennt den Nachweis");
  pruefe(/Testfahrer 02/.test(s1), "und die bisherige Zuordnung");
  const ziele = await page.$$eval('[data-tun^="vg-zuordnung-ziel"]',
    (n) => n.map((x) => x.textContent.trim()));
  pruefe(ziele.length > 0, `es gibt Ziele zur Auswahl (${ziele.length})`);
  pruefe(!ziele.some((x) => /Testfahrer 02/.test(x)),
    "die bisherige Person ist nicht darunter");
  pruefe(/nichts gelöscht/.test(s1), "es steht da, dass nichts gelöscht wird");
  pruefe(!(await page.$('[data-tun="vg-zuordnung-ja"]')),
    "auf Stufe 1 gibt es noch kein „Verbindlich speichern“");

  /* Ohne Auswahl nicht weiter. */
  await page.click('[data-tun="vg-zuordnung-weiter"]');
  await page.waitForTimeout(400);
  pruefe(Boolean(await page.$(".feldfehler")), "ohne Auswahl geht es nicht weiter");

  await page.click('[data-tun="vg-zuordnung-ziel:V0002|M03"]');
  await page.waitForTimeout(350);
  await page.click('[data-tun="vg-zuordnung-weiter"]');
  await page.waitForTimeout(450);

  /* Stufe 2: Zusammenfassung. */
  const s2 = (await page.textContent(".dialog-kasten")).replace(/\s+/g, " ");
  pruefe(/Neuzuordnung prüfen/.test(s2), "Stufe 2 ist die Zusammenfassung");
  pruefe(/Bisherige Zuordnung.*Testfahrer 02/.test(s2), "sie nennt die bisherige Zuordnung");
  pruefe(/Neue Zuordnung.*Testfahrer 03/.test(s2), "die neue Zuordnung");
  pruefe(/Zugeordnet von.*Testpersonal 01/.test(s2), "und die handelnde Person");
  pruefe(Boolean(await page.$("[data-zuordnung-grund]")), "es gibt ein Grundfeld");
  pruefe(/Pflichtfeld/.test(s2), "als Pflichtfeld gekennzeichnet");
  pruefe(/beginnt die Prüfung wieder bei Schritt 1/.test(s2),
    "und der Hinweis, dass die Prüfung neu beginnt");
  pruefe(Boolean(await page.$('[data-tun="vg-zuordnung-zurueck"]')),
    "zurück ist möglich");
  const knopf = await page.textContent('[data-tun="vg-zuordnung-ja"]');
  pruefe(/Verbindlich speichern/.test(knopf), `die Aktion heisst „Verbindlich speichern“`);

  /* Ohne Grund nichts. */
  const vorherZahl = await page.evaluate(() => window.ProbeDaten.vorgaenge.length);
  await page.click('[data-tun="vg-zuordnung-ja"]');
  await page.waitForTimeout(450);
  pruefe(Boolean(await page.$(".feldfehler")), "ohne Grund wird nicht gespeichert");
  pruefe((await daten(page)).nachweise[0].umgezogenNach === "",
    "und nichts zugeordnet");
  pruefe(await page.evaluate(() => window.ProbeDaten.vorgaenge.length) === vorherZahl,
    "und kein Vorgang angelegt");
  await ctx.close();
}

/* ═══ 5. Die Neuzuordnung selbst ════════════════════════════════ */
console.log("\n── 5. Nach der Neuzuordnung beginnt die Prüfung von vorn ──");
{
  const { ctx, page } = await seite("personal");
  await bisFalschePerson(page);
  await page.click('[data-tun="vg-zuordnung:V0002"]');
  await page.waitForTimeout(400);
  await page.click('[data-tun="vg-zuordnung-ziel:V0002|M03"]');
  await page.waitForTimeout(300);
  await page.click('[data-tun="vg-zuordnung-weiter"]');
  await page.waitForTimeout(400);
  const vorherP = (await protokoll(page)).length;
  await page.fill("[data-zuordnung-grund]", "Testgrund: Name gehört zu Testfahrer 03");
  await page.click('[data-tun="vg-zuordnung-ja"]');
  await page.waitForTimeout(600);

  /* Der alte Vorgang. */
  const alt = await daten(page);
  pruefe(alt.nachweise.length === 1, "die alte Datei ist nicht gelöscht");
  pruefe(alt.nachweise[0].ergebnis === "person", "ihr Ergebnis bleibt stehen");
  pruefe(alt.nachweise[0].zuordnungUngeklaert === false, "sie ist nicht mehr ungeklärt");
  pruefe(Boolean(alt.nachweise[0].umgezogenNach),
    `sondern verweist auf den Zielvorgang (${alt.nachweise[0].umgezogenNach})`);
  pruefe(alt.klaerungen[0].zustand === "geklaert", "die Klärungsaufgabe ist erledigt");
  pruefe(/Testpersonal 01/.test(alt.klaerungen[0].geklaertVon.name), "mit Person");
  pruefe(await teilstand(page) === "offen", "der alte Vorgang bleibt offen");

  /* Der Zielvorgang. */
  const ziel = await zielId(page);
  pruefe(Boolean(ziel), `es gibt einen Zielvorgang (${ziel})`);
  const zd = await daten(page, ziel);
  pruefe(zd.nachweise.length === 1, "er trägt den Nachweis");
  pruefe(zd.nachweise[0].datei === alt.nachweise[0].datei, "dieselbe Datei");
  pruefe(zd.nachweise[0].eingang === alt.nachweise[0].eingang,
    "mit unveränderter Eingangszeit");
  pruefe(zd.nachweise[0].herkunft === "V0002", "und dem Vermerk der Herkunft");
  pruefe(zd.nachweise[0].einsicht === null, "er ist dort noch nicht angesehen");
  pruefe(zd.nachweise[0].ergebnis === "", "und hat kein Ergebnis");
  pruefe(zd.nachweise[0].gesperrt === false, "und ist nicht gesperrt");

  const zielTeile = await page.evaluate((x) => {
    const z = window.ProbeDaten.vorgangVon(x);
    return { teile: Boolean(z.teile), erfordert: z.teile ? z.teile.personal.erfordert : "" };
  }, ziel);
  pruefe(zielTeile.teile, "der Zielvorgang hat Teilschritte");
  pruefe(zielTeile.erfordert === "bescheinigung",
    "und die Prüfsperre — sonst wäre er ohne Prüfung abschliessbar");

  /* Dort beginnt die Pruefung bei Schritt 1. */
  await oeffnen(page, ziel);
  const zt = await page.textContent(".dialog-kasten");
  pruefe(/Aus Vorgang V0002 neu zugeordnet/.test(zt), "die Herkunft ist sichtbar");
  pruefe(/1\. Bescheinigung ansehen/.test(zt), "Schritt 1 steht an");
  pruefe(/Noch nicht geöffnet/.test(zt), "die Datei ist dort nicht angesehen");
  const zk = await knoepfe(page);
  pruefe(!zk.some((x) => x.startsWith("vg-teil-erledigen")),
    "der Abschluss ist dort gesperrt");
  pruefe(!zk.some((x) => x.startsWith("vg-ergebnis:")),
    "und ohne Einsicht gibt es kein Ergebnis");
  await page.evaluate((x) => window.ProbeVorgaenge.tun("vg-teil-erledigen", x + "|personal"), ziel);
  await page.waitForTimeout(350);
  pruefe(await teilstand(page, ziel) === "offen",
    "auch der direkte Aufruf schliesst dort nichts ab");

  /* Vollstaendig durchlaufen. */
  await page.click(`[data-tun="vg-bescheinigung:${ziel}"]`);
  await page.waitForTimeout(400);
  await page.click(`[data-tun="vg-einsicht-ja:${ziel}"]`);
  await page.waitForTimeout(400);
  await page.click(`[data-tun="vg-ergebnis:${ziel}|ok"]`);
  await page.waitForTimeout(450);
  pruefe((await knoepfe(page)).some((x) => x === `vg-teil-erledigen:${ziel}|personal`),
    "nach Einsicht und Ergebnis steht der Abschluss dort bereit");

  /* Das Protokoll der Neuzuordnung. */
  const p = await protokoll(page);
  const e = p.find((x) => /Nachweis neu zugeordnet/.test(x.was));
  pruefe(Boolean(e), "die Neuzuordnung steht im Protokoll");
  pruefe(/Testfahrer 02/.test(e.vorher), `ursprüngliche Zuordnung (${e.vorher})`);
  pruefe(/V0002/.test(e.vorher), "mit dem alten Vorgang");
  pruefe(/Testfahrer 03/.test(e.nachher), `neue Zuordnung (${e.nachher})`);
  pruefe(new RegExp(ziel).test(e.nachher), "mit dem neuen Vorgang");
  pruefe(/Testpersonal 01/.test(e.wer), `handelnde Person (${e.wer})`);
  pruefe(/Personal/.test(e.rolle), "Rolle");
  pruefe(Boolean(e.kennung), "unveränderliche Kennung");
  pruefe(Boolean(e.datum) && Boolean(e.zeit), "Datum und Uhrzeit");
  pruefe(/Testgrund/.test(e.grund), "und der Grund");
  pruefe(await page.evaluate(() => Object.isFrozen(window.ProbeDaten.protokoll[0])),
    "der Eintrag ist unveränderlich");
  pruefe(p.length > vorherP, "es ist tatsächlich etwas dazugekommen");

  const alles = JSON.stringify(p);
  for (const wort of ["Diagnose", "Krankheitsgrund", "Befund", "Attest"]) {
    pruefe(!new RegExp(wort).test(alles), `kein „${wort}“ im Protokoll`);
  }
  await ctx.close();
}

/* ═══ 6. Wenn sich die Zuordnung nicht klären lässt ═════════════ */
console.log("\n── 6. Ungeklärt bleibt gesperrt ──");
{
  const { ctx, page } = await seite("personal");
  await bisFalschePerson(page);
  await page.click('[data-tun="vg-zuordnung-unklar:V0002"]');
  await page.waitForTimeout(450);
  const text = await page.textContent(".dialog-kasten");
  pruefe(/bleibt gesperrt/.test(text), "der Dialog sagt, dass der Nachweis gesperrt bleibt");
  pruefe(/nichts gelöscht/.test(text), "und dass nichts gelöscht wird");

  await page.click('[data-tun="vg-zuordnung-unklar-ja"]');
  await page.waitForTimeout(400);
  pruefe(Boolean(await page.$(".feldfehler")), "ohne Grund wird nichts festgehalten");

  const vorherZahl = await page.evaluate(() => window.ProbeDaten.vorgaenge.length);
  await page.fill("[data-zuordnung-grund]", "Testgrund: Name auf der Datei nicht lesbar");
  await page.click('[data-tun="vg-zuordnung-unklar-ja"]');
  await page.waitForTimeout(500);

  const d = await daten(page);
  pruefe(d.nachweise[0].zuordnungUngeklaert === true, "der Nachweis bleibt ungeklärt");
  pruefe(d.nachweise[0].gesperrt === true, "und gesperrt");
  pruefe(d.nachweise[0].umgezogenNach === "", "nichts wurde zugeordnet");
  pruefe(d.nachweise.length === 1, "nichts gelöscht");
  pruefe(d.klaerungen[0].zustand === "offen", "die Klärungsaufgabe bleibt offen");
  pruefe(await teilstand(page) === "offen", "der Vorgang bleibt offen");
  pruefe(await page.evaluate(() => window.ProbeDaten.vorgaenge.length) === vorherZahl,
    "und es entsteht kein neuer Vorgang");
  pruefe(!(await knoepfe(page)).some((x) => x.startsWith("vg-teil-erledigen")),
    "der Abschluss bleibt gesperrt");

  const p = await protokoll(page);
  const e = p.find((x) => /nicht geklärt/.test(x.was));
  pruefe(Boolean(e), "es ist trotzdem protokolliert");
  pruefe(/Testgrund/.test(e.grund), "mit dem Grund");
  pruefe(/gesperrt/.test(e.nachher), "und dem Ergebnis");
  await ctx.close();
}

/* ═══ 7. Darstellung und Netz ═══════════════════════════════════ */
console.log("\n── 7. Darstellung, Tastatur, Netz ──");
for (const [breite, hoehe] of [[320, 568], [390, 844], [1440, 900]]) {
  const { ctx, page } = await seite("personal", breite, hoehe);
  await bisFalschePerson(page);
  await page.click('[data-tun="vg-zuordnung:V0002"]');
  await page.waitForTimeout(400);
  await page.click('[data-tun="vg-zuordnung-ziel:V0002|M03"]');
  await page.waitForTimeout(300);
  await page.click('[data-tun="vg-zuordnung-weiter"]');
  await page.waitForTimeout(400);
  const ueber = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  pruefe(ueber <= 0, `bei ${breite}px kein waagerechter Überlauf (${ueber}px)`);
  const klein = await page.$$eval(".dialog-kasten button", (n) => n.filter((x) => {
    const r = x.getBoundingClientRect();
    return r.height > 0 && r.height < 36;
  }).length);
  pruefe(klein === 0, `bei ${breite}px keine Bedienfläche unter 36 px (${klein})`);
  await ctx.close();
}
{
  const { ctx, page } = await seite("personal");
  await bisFalschePerson(page);
  await page.click('[data-tun="vg-zuordnung:V0002"]');
  await page.waitForTimeout(400);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  pruefe((await daten(page)).nachweise[0].umgezogenNach === "",
    "Escape bricht die Neuzuordnung ohne Wirkung ab");
  await ctx.close();
}

pruefe(fremdeAnfragen.length === 0,
  `keine einzige Anfrage nach aussen im ganzen Lauf (${fremdeAnfragen.length})`);
{
  const quelle = await readFile(join(PROBE, "probe-vorgaenge.js"), "utf8");
  const ohneKommentar = quelle.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
  pruefe(!/fetch\s*\(|new XMLHttpRequest|createClient\s*\(|supabase\./i.test(ohneKommentar),
    "kein Netzzugriff im Vorgangsmodul");
  /* Kein Code entfernt einen Nachweis. */
  pruefe(!/nachweise\s*\.\s*(splice|shift|pop)\s*\(/.test(ohneKommentar),
    "kein Code loescht einen Nachweis");
  pruefe(!/(diagnose|krankheitsgrund|befund)\s*[:=]/i.test(ohneKommentar),
    "kein Feld, das eine Diagnose aufnehmen wuerde");
}

await browser.close();
server.close();

console.log("\n" + "═".repeat(59));
console.log(`Zuordnung: ${bestanden} bestanden, ${offen.length} nicht bestanden`);
if (offen.length) {
  console.log("\nNicht bestanden:");
  for (const n of offen) console.log("  - " + n);
}
console.log(`
ALLES SIMULIERT. Es gibt in dieser Probe keine Datei und keine
Storage-API. Belegt ist, dass die Regel in Oberflaeche UND Aktionen
durchgesetzt wird — NICHT, dass eine echte Bescheinigung beim
Umhaengen geschuetzt bliebe.`);
console.log("═".repeat(59));
process.exit(offen.length ? 1 : 0);
