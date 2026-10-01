/* ============================================================
   Prueflauf: Geschaeftsregel zur Dokumentpruefung
   ============================================================
   Vorgabe des Geschaeftsfuehrers vom 01.10.2026, sieben Punkte.
   Dieser Lauf prueft jeden davon einzeln:

   1. "Alles in Ordnung"            -> abschliessbar
   2. "Zeitraum weicht ab"          -> offen, Rueckfrage entsteht,
                                       Abschluss erst nach Klaerung
   3. "Nicht lesbar"                -> offen, neue Bescheinigung wird
                                       angefordert, Abschluss erst nach
                                       Eingang UND Pruefung
   4. Neue Bescheinigung            -> Pruefung beginnt von vorn, die
                                       alte Datei bleibt unveraendert,
                                       Nummer, Eingangszeit und
                                       Zuordnung bleiben erhalten
   5. Korrekturen                   -> ein festgehaltenes Ergebnis wird
                                       nie ueberschrieben; Korrektur nur
                                       als eigener Vorgang mit
                                       Pflichtgrund; vollstaendiges
                                       Protokoll ohne medizinische
                                       Freitexte
   6. Rollen                        -> Disposition sieht nichts davon;
                                       Personal UND Administration
                                       muessen tatsaechlich pruefen
   7. Aufbewahrung                  -> technisch NICHT festgelegt, als
                                       offene rechtliche Frage benannt

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
const PORT = 5392;
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
  await page.click(`.vorgang[data-vorgang="${id}"] [data-tun="vg-oeffnen:${id}"]`);
  await page.waitForTimeout(450);
};
const knoepfe = (page) =>
  page.$$eval(".dialog-kasten [data-tun]", (n) => n.map((x) => x.dataset.tun));
const kannAbschliessen = async (page) =>
  (await knoepfe(page)).some((x) => x === "vg-teil-erledigen:V0002|personal");
const daten = (page, id = "V0002") =>
  page.evaluate((x) => JSON.parse(JSON.stringify(window.ProbeDaten.vorgangVon(x).daten)), id);
const teilstand = (page) => page.evaluate(() =>
  window.ProbeDaten.vorgangVon("V0002").teile.personal.zustand);
const protokoll = (page) => page.evaluate(() => window.ProbeDaten.protokoll.slice());

/* Einsicht bestaetigen - der gemeinsame erste Schritt. */
const ansehen = async (page) => {
  await page.click('[data-tun="vg-bescheinigung:V0002"]');
  await page.waitForTimeout(400);
  await page.click('[data-tun="vg-einsicht-ja:V0002"]');
  await page.waitForTimeout(450);
};
/*
  Einen Teilschritt uebernehmen. Seit dem 01.10.2026 ist das die
  erste der fuenf Voraussetzungen des Abschlusses: Wer abschliesst,
  traegt die Verantwortung und soll auch als Verantwortlicher
  dastehen.
*/
const uebernehmen = async (page, teil, id = "V0002") => {
  const knopf = await page.$(`[data-tun="vg-teil-uebernehmen:${id}|${teil}"]`);
  if (knopf) { await knopf.click(); await page.waitForTimeout(450); }
};

const ergebnisWaehlen = async (page, id) => {
  await page.click(`[data-tun="vg-ergebnis:V0002|${id}"]`);
  await page.waitForTimeout(450);
};

/* ═══ 0. Nur die drei vorgegebenen Ergebnisse ═══════════════════ */
console.log("\n── 0. Die Auswahl bildet genau die Vorgabe ab ──");
{
  const { ctx, page, fehler } = await seite("personal");
  await oeffnen(page);
  await ansehen(page);
  const auswahl = await page.$$eval(".pruefkette .wahlkarte strong",
    (n) => n.map((x) => x.textContent.trim()));
  /* Seit der Ergaenzung vom 01.10.2026 sind es vier: Der Fall
     "falsche Person oder falscher Vorgang" hat jetzt eine Regel und
     steht wieder zur Auswahl. Seine Folge prueft
     pruefe-probe-zuordnung im Einzelnen. */
  pruefe(auswahl.length === 4, `vier Ergebnisse, nicht mehr (${auswahl.length})`);
  pruefe(auswahl.includes("Alles in Ordnung"), "„Alles in Ordnung“");
  pruefe(auswahl.includes("Zeitraum weicht ab"), "„Zeitraum weicht ab“");
  pruefe(auswahl.includes("Nicht lesbar oder unvollständig"), "„Nicht lesbar oder unvollständig“");
  pruefe(auswahl.includes("Falsche Person oder falscher Vorgang"),
    "„Falsche Person oder falscher Vorgang“");

  /* Jede Karte sagt, was folgt - bevor man sie drueckt. */
  const erklaerungen = await page.$$eval(".pruefkette .wahlkarte span",
    (n) => n.map((x) => x.textContent.trim()));
  pruefe(erklaerungen.some((x) => /darf abgeschlossen werden/.test(x)),
    "die Folge steht auf der Karte, bevor man sie wählt");
  pruefe(erklaerungen.some((x) => /Rückfrage/.test(x)), "auch die Rückfrage");
  pruefe(erklaerungen.some((x) => /neue Bescheinigung angefordert/.test(x)),
    "auch die Anforderung");
  pruefe(erklaerungen.some((x) => /Zuordnung ungeklärt/.test(x)),
    "und die ungeklärte Zuordnung");
  pruefe(!(await page.$(".pruefkette textarea")),
    "es gibt kein Freitextfeld für ein Ergebnis");
  pruefe(fehler.length === 0, `keine Skriptfehler${fehler.length ? " (" + fehler[0] + ")" : ""}`);
  await ctx.close();
}

/* ═══ 1. „Alles in Ordnung" ═════════════════════════════════════ */
console.log("\n── 1. „Alles in Ordnung“ gibt den Abschluss frei ──");
{
  const { ctx, page } = await seite("personal");
  await oeffnen(page);
  pruefe(!(await kannAbschliessen(page)), "vorher ist der Abschluss gesperrt");
  await ansehen(page);
  pruefe(!(await kannAbschliessen(page)), "nach der Einsicht allein noch immer");
  await ergebnisWaehlen(page, "ok");
  await uebernehmen(page, "personal");

  pruefe(await kannAbschliessen(page), "mit „Alles in Ordnung“ steht er bereit");
  const d = await daten(page);
  pruefe(d.klaerungen.length === 0, "es entsteht keine Rückfrage und keine Anforderung");
  pruefe(d.nachweise.length === 1, "und kein weiterer Nachweis");

  await page.click('[data-tun="vg-teil-erledigen:V0002|personal"]');
  await page.waitForTimeout(450);
  pruefe(await teilstand(page) === "erledigt", "die Personalprüfung ist abgeschlossen");
  await ctx.close();
}

/* ═══ 2. „Zeitraum weicht ab" ═══════════════════════════════════ */
console.log("\n── 2. „Zeitraum weicht ab“ hält den Vorgang offen ──");
{
  const { ctx, page } = await seite("personal");
  await oeffnen(page);
  /* Erst uebernehmen, sonst lautet der Sperrgrund "noch niemandem
     zugewiesen" statt des fachlichen. */
  await uebernehmen(page, "personal");
  await ansehen(page);
  await ergebnisWaehlen(page, "zeitraum");

  pruefe(await teilstand(page) === "offen", "die Personalprüfung bleibt offen");
  pruefe(!(await kannAbschliessen(page)), "der Abschluss ist gesperrt");

  const d = await daten(page);
  pruefe(d.klaerungen.length === 1, "es entsteht genau eine Klärung");
  const k = d.klaerungen[0];
  pruefe(k.art === "rueckfrage", "und zwar eine Rückfrage");
  pruefe(k.zustand === "offen", "sie ist offen");
  pruefe(k.nachweisNr === 1, "sie ist dem geprüften Nachweis zugeordnet");
  pruefe(/Zeitraum/.test(k.text), "sie benennt den Zeitraum");
  pruefe(/01\.10\.2026|\d{2}\.\d{2}\.\d{4}/.test(k.text),
    `der abweichende Zeitraum steht drin (${k.text.slice(0, 60)}…)`);
  pruefe(Boolean(k.wer) && /Testpersonal 01/.test(k.wer.name),
    "und wer sie angestoßen hat");

  const text = await page.textContent(".dialog-kasten");
  pruefe(/Rückfrage zum Zeitraum/.test(text), "sie steht sichtbar im Vorgang");
  pruefe(/noch nicht geklärt/.test(text), "mit dem Grund der Sperre");

  /* Auch direkt aufgerufen schliesst nichts ab. */
  await page.evaluate(() => window.ProbeVorgaenge.tun("vg-teil-erledigen", "V0002|personal"));
  await page.waitForTimeout(350);
  pruefe(await teilstand(page) === "offen", "auch der direkte Aufruf schliesst nicht ab");

  /* Erst nach der Klaerung. */
  await page.click('[data-tun="vg-klaerung-ja:V0002"]');
  await page.waitForTimeout(450);
  const d2 = await daten(page);
  await uebernehmen(page, "personal");
  pruefe(d2.klaerungen[0].zustand === "geklaert", "die Rückfrage lässt sich klären");
  pruefe(Boolean(d2.klaerungen[0].geklaertAm), "mit Zeitpunkt");
  pruefe(/Testpersonal 01/.test(d2.klaerungen[0].geklaertVon.name), "und mit Person");
  pruefe(await kannAbschliessen(page), "erst danach steht der Abschluss bereit");

  const p = await protokoll(page);
  pruefe(p.some((x) => /Rückfrage zum Zeitraum erstellt/.test(x.was)),
    "die Rückfrage steht im Protokoll");
  pruefe(p.some((x) => /Rückfrage geklärt/.test(x.was)), "die Klärung ebenso");
  await ctx.close();
}

/* ═══ 3. „Nicht lesbar" ═════════════════════════════════════════ */
console.log("\n── 3. „Nicht lesbar“ fordert eine neue Bescheinigung ──");
{
  const { ctx, page } = await seite("personal");
  await oeffnen(page);
  await uebernehmen(page, "personal");
  await ansehen(page);
  await ergebnisWaehlen(page, "unleserlich");

  pruefe(await teilstand(page) === "offen", "die Personalprüfung bleibt offen");
  pruefe(!(await kannAbschliessen(page)), "der Abschluss ist gesperrt");

  const d = await daten(page);
  pruefe(d.klaerungen.length === 1 && d.klaerungen[0].art === "anforderung",
    "es entsteht eine Anforderung");
  pruefe(d.nachweise[0].beanstandet === true, "der Nachweis ist als beanstandet vermerkt");

  const text = await page.textContent(".dialog-kasten");
  pruefe(/Neue Bescheinigung angefordert/.test(text), "sie steht sichtbar im Vorgang");
  pruefe(/noch nicht eingegangen/.test(text), "mit dem Grund der Sperre");

  /* Die Anforderung allein reicht nicht - es braucht die Datei. */
  await page.evaluate(() => window.ProbeVorgaenge.tun("vg-teil-erledigen", "V0002|personal"));
  await page.waitForTimeout(350);
  pruefe(await teilstand(page) === "offen", "auch der direkte Aufruf schliesst nicht ab");

  const p = await protokoll(page);
  pruefe(p.some((x) => /Neue Bescheinigung angefordert/.test(x.was)),
    "die Anforderung steht im Protokoll");
  await ctx.close();
}

/* ═══ 4. Die neue Bescheinigung ═════════════════════════════════ */
console.log("\n── 4. Eine neue Datei beginnt die Prüfung von vorn ──");
{
  const { ctx, page } = await seite("personal");
  await oeffnen(page);
  await ansehen(page);
  await ergebnisWaehlen(page, "unleserlich");
  const vorher = await daten(page);

  await page.click('[data-tun="vg-neue-bescheinigung:V0002"]');
  await page.waitForTimeout(500);
  const d = await daten(page);

  pruefe(d.nachweise.length === 2, "es gibt jetzt zwei Nachweise");
  const alt = d.nachweise[0];
  const neu = d.nachweise[1];

  /* Die alte Datei bleibt unangetastet. */
  pruefe(alt.datei === vorher.nachweise[0].datei, "die alte Datei behält ihren Namen");
  pruefe(alt.nr === 1, "ihre Nummer");
  pruefe(alt.eingang === vorher.nachweise[0].eingang, "ihre Eingangszeit");
  pruefe(alt.ergebnis === "unleserlich", "ihr Prüfergebnis");
  pruefe(alt.beanstandet === true, "und den Vermerk „beanstandet“");
  pruefe(alt.einsicht !== null && /Testpersonal 01/.test(alt.einsicht.name),
    "auch wer sie angesehen hat");

  /* Die neue beginnt bei null. */
  pruefe(neu.nr === 2, "die neue hat eine eigene Nummer");
  pruefe(neu.datei !== alt.datei, `und einen eigenen Namen (${neu.datei})`);
  pruefe(Boolean(neu.eingang) && neu.eingang !== alt.eingang, "eine eigene Eingangszeit");
  pruefe(neu.art === "ersatz", "und ist als Ersatz gekennzeichnet");
  pruefe(neu.einsicht === null, "sie ist noch nicht angesehen");
  pruefe(neu.ergebnis === "", "und hat noch kein Ergebnis");

  /* Die Zuordnung zum urspruenglichen Vorgang bleibt. */
  pruefe(await page.evaluate(() => Boolean(window.ProbeDaten.vorgangVon("V0002"))),
    "beide hängen weiter am ursprünglichen Krankheitsvorgang");
  const liste = await page.textContent(".konfliktliste");
  pruefe(/Nr\. 1/.test(liste) && /Nr\. 2/.test(liste), "beide stehen in der Kette");
  pruefe(/beanstandet, bleibt erhalten/.test(liste),
    "und die alte ist als erhalten gekennzeichnet");

  /* Die Pruefung beginnt wirklich von vorn. */
  const kette = await page.textContent(".pruefkette");
  pruefe(/1\. Bescheinigung Nr\. 2 ansehen/.test(kette), "Schritt 1 gilt jetzt der neuen Datei");
  pruefe(/Noch nicht geöffnet/.test(kette), "sie ist noch nicht geöffnet");
  pruefe(!(await kannAbschliessen(page)), "und der Abschluss ist weiter gesperrt");
  pruefe(!(await page.$('[data-tun^="vg-ergebnis:"]')),
    "ohne Einsicht gibt es auch kein Ergebnis zu wählen");

  await ansehen(page);
  await ergebnisWaehlen(page, "ok");
  await uebernehmen(page, "personal");
  pruefe(await kannAbschliessen(page), "erst nach Einsicht UND Ergebnis der neuen Datei");

  const d2 = await daten(page);
  pruefe(d2.nachweise[0].ergebnis === "unleserlich",
    "das alte Ergebnis ist dabei unverändert geblieben");
  await ctx.close();
}

/* ═══ 5. Korrekturen und Protokoll ══════════════════════════════ */
console.log("\n── 5. Ein festgehaltenes Ergebnis wird nicht überschrieben ──");
{
  const { ctx, page } = await seite("personal");
  await oeffnen(page);
  await ansehen(page);
  await ergebnisWaehlen(page, "ok");

  pruefe((await daten(page)).nachweise[0].gesperrt === true, "das Ergebnis ist gesperrt");
  pruefe(!(await page.$('[data-tun="vg-ergebnis-neu:V0002"]')),
    "es gibt kein „Ergebnis ändern“ mehr");
  pruefe(!(await page.$('[data-tun^="vg-ergebnis:"]')),
    "und keine zweite Auswahl");

  /* Auch direkt aufgerufen nicht. */
  await page.evaluate(() => window.ProbeVorgaenge.tun("vg-ergebnis", "V0002|zeitraum"));
  await page.waitForTimeout(350);
  pruefe((await daten(page)).nachweise[0].ergebnis === "ok",
    "auch der direkte Aufruf überschreibt es nicht");

  /* Korrektur nur als eigener Vorgang mit Pflichtgrund. */
  pruefe(Boolean(await page.$('[data-tun="vg-pruefkorrektur:V0002"]')),
    "eine Korrektur ist möglich");
  await page.click('[data-tun="vg-pruefkorrektur:V0002"]');
  await page.waitForTimeout(450);
  const dText = await page.textContent(".dialog-kasten");
  pruefe(/nicht überschrieben/.test(dText), "der Dialog sagt, dass nichts überschrieben wird");
  pruefe(/Alles in Ordnung/.test(dText), "er nennt das bisherige Ergebnis");

  const vorherZahl = await page.evaluate(() => window.ProbeDaten.vorgaenge.length);
  await page.click('[data-tun="vg-pruefkorrektur-ja"]');
  await page.waitForTimeout(450);
  pruefe(Boolean(await page.$(".feldfehler")), "ohne Grund entsteht nichts");
  pruefe(await page.evaluate(() => window.ProbeDaten.vorgaenge.length) === vorherZahl,
    "und kein Vorgang");

  const vorherP = (await protokoll(page)).length;
  await page.fill("[data-pruefkorrektur-grund]", "Testgrund: Zeitraum falsch gelesen");
  await page.click('[data-tun="vg-pruefkorrektur-ja"]');
  await page.waitForTimeout(500);

  pruefe(await page.evaluate(() => window.ProbeDaten.vorgaenge.length) === vorherZahl + 1,
    "mit Grund entsteht ein eigener Vorgang");
  pruefe((await daten(page)).nachweise[0].ergebnis === "ok",
    "das alte Ergebnis steht unverändert weiter da");

  const neuer = await page.evaluate(() =>
    window.ProbeDaten.vorgaenge.find((x) => x.daten && x.daten.bezugAuf === "V0002"));
  pruefe(Boolean(neuer), "der neue Vorgang verweist auf den alten");
  pruefe(neuer.daten.nachweise.length === 1 && neuer.daten.nachweise[0].einsicht === null,
    "und beginnt dort mit einer ungeprüften Datei");

  /* Das Protokoll. */
  const p = await protokoll(page);
  pruefe(p.length === vorherP + 1, "es entsteht genau ein Protokolleintrag");
  const e = p[0];
  pruefe(/Korrektur des Prüfergebnisses/.test(e.was), "er benennt die Korrektur");
  pruefe(/Testpersonal 01/.test(e.wer), `wer (${e.wer})`);
  pruefe(Boolean(e.kennung), "mit unveränderlicher Kennung");
  pruefe(/Personal/.test(e.rolle), "und Rolle");
  pruefe(Boolean(e.datum) && Boolean(e.zeit), "wann");
  pruefe(/V0002/.test(e.betrifft) || /Krankmeldung/.test(e.betrifft),
    `betroffener Vorgang (${e.betrifft})`);
  pruefe(/Alles in Ordnung/.test(e.vorher), `vorheriger Zustand (${e.vorher})`);
  pruefe(/neuer Vorgang/.test(e.nachher), `neuer Zustand (${e.nachher})`);
  pruefe(/Testgrund/.test(e.grund), "und der Grund");
  pruefe(await page.evaluate(() => Object.isFrozen(window.ProbeDaten.protokoll[0])),
    "der Eintrag ist unveränderlich");

  const alles = JSON.stringify(p);
  for (const wort of ["Diagnose", "Krankheitsgrund", "Befund", "Attest", "Behandlung"]) {
    pruefe(!new RegExp(wort).test(alles), `kein „${wort}“ im Protokoll`);
  }
  await ctx.close();
}

/* ═══ 6. Rollen ═════════════════════════════════════════════════ */
console.log("\n── 6. Rollen und Datenschutz ──");
{
  /* Disposition. */
  const { ctx, page } = await seite("dispatcher");
  await oeffnen(page);
  const text = await page.textContent(".dialog-kasten");
  pruefe(!/\.pdf/i.test(text), "die Disposition sieht keinen Dateinamen");
  pruefe(!(await page.$(".pruefkette")), "keine Prüfkette");
  pruefe(!(await page.$(".konfliktliste")), "keine Nachweisliste");
  pruefe(!/Alles in Ordnung|Zeitraum weicht ab|Nicht lesbar/.test(text),
    "und kein Prüfergebnis");
  const k = await knoepfe(page);
  pruefe(!k.some((x) => x.startsWith("vg-bescheinigung")), "keinen Weg zur Vorschau");
  pruefe(!k.some((x) => x.startsWith("vg-ergebnis")), "keinen zu einem Ergebnis");
  pruefe(!k.some((x) => x.startsWith("vg-neue-bescheinigung")), "und keinen zur Anforderung");

  for (const [name, wert] of [["vg-bescheinigung", "V0002"], ["vg-einsicht-ja", "V0002"],
    ["vg-ergebnis", "V0002|ok"], ["vg-neue-bescheinigung", "V0002"],
    ["vg-klaerung-ja", "V0002"], ["vg-pruefkorrektur", "V0002"]]) {
    await page.evaluate(([a, b]) => window.ProbeVorgaenge.tun(a, b), [name, wert]);
    await page.waitForTimeout(150);
  }
  const d = await daten(page);
  pruefe(d.nachweise[0].einsicht === null && d.nachweise[0].ergebnis === "",
    "auch die direkten Aufrufe bewirken bei ihr nichts");
  pruefe(d.klaerungen.length === 0, "und erzeugen keine Klärung");
  await ctx.close();

  /* Administration darf nicht ueberspringen. */
  const a = await seite("admin");
  await oeffnen(a.page);
  pruefe(Boolean(await a.page.$(".pruefkette")), "die Administration sieht die Prüfkette");
  pruefe(!(await kannAbschliessen(a.page)),
    "aber sie kann die Personalprüfung nicht ohne Einsicht abschliessen");
  await a.page.evaluate(() => window.ProbeVorgaenge.tun("vg-ergebnis", "V0002|ok"));
  await a.page.waitForTimeout(300);
  pruefe((await daten(a.page)).nachweise[0].ergebnis === "",
    "ein Ergebnis ohne Einsicht nimmt sie auch nicht");
  await ansehen(a.page);
  await ergebnisWaehlen(a.page, "ok");
  await uebernehmen(a.page, "personal");
  pruefe(await kannAbschliessen(a.page), "mit Einsicht und Ergebnis darf sie");
  const pa = await protokoll(a.page);
  pruefe(/Testleitung 01/.test(pa.find((x) => /angesehen/.test(x.was)).wer),
    "sie handelt dabei unter eigenem Namen");
  await a.ctx.close();
}

/* ═══ 7. Aufbewahrung ═══════════════════════════════════════════ */
console.log("\n── 7. Keine technische Aufbewahrungsfrist ──");
{
  const quellen = await Promise.all([
    readFile(join(PROBE, "probe-vorgaenge.js"), "utf8"),
    readFile(join(PROBE, "probe-daten.js"), "utf8")
  ]);
  const code = quellen.join("\n").replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");

  /* Keine Loeschung von Nachweisen, keine Frist auf ihnen. */
  pruefe(!/nachweise\s*\.\s*(splice|shift|pop)\s*\(/.test(code),
    "kein Code entfernt einen Nachweis aus der Kette");
  pruefe(!/(aufbewahrung|loeschfrist|verfallsdatum|loeschenNach)/i.test(code),
    "es gibt keine technische Aufbewahrungs- oder Loeschfrist");

  const { ctx, page } = await seite("personal");
  await oeffnen(page);
  await ansehen(page);
  await ergebnisWaehlen(page, "unleserlich");
  await page.click('[data-tun="vg-neue-bescheinigung:V0002"]');
  await page.waitForTimeout(450);
  await ansehen(page);
  await ergebnisWaehlen(page, "ok");
  await uebernehmen(page, "personal");
  await page.click('[data-tun="vg-teil-erledigen:V0002|personal"]');
  await page.waitForTimeout(450);
  const d = await daten(page);
  pruefe(d.nachweise.length === 2,
    "auch nach dem Abschluss bleiben beide Nachweise erhalten");
  pruefe(d.nachweise[0].ergebnis === "unleserlich",
    "mit ihren Ergebnissen");
  await ctx.close();

  /* Und die offene Frage ist ausdruecklich dokumentiert. */
  const doku = await readFile(join(WURZEL, "BETRIEBSPORTAL-HALTEPUNKT.md"), "utf8");
  pruefe(/Aufbewahrung/i.test(doku), "die Aufbewahrung ist im Bericht benannt");
  pruefe(/offene\s+rechtliche|rechtliche\s+Entscheidung|rechtlich\s+zu\s+entscheiden/i.test(doku.replace(/\s+/g, " ")),
    "ausdrücklich als offene rechtliche Entscheidung");
}

/* ═══ 8. Darstellung und Netz ═══════════════════════════════════ */
console.log("\n── 8. Darstellung, Tastatur, Netz ──");
for (const [breite, hoehe] of [[320, 568], [390, 844], [1440, 900]]) {
  const { ctx, page } = await seite("personal", breite, hoehe);
  await oeffnen(page);
  await ansehen(page);
  await ergebnisWaehlen(page, "unleserlich");
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

pruefe(fremdeAnfragen.length === 0,
  `keine einzige Anfrage nach aussen im ganzen Lauf (${fremdeAnfragen.length})`);
{
  const quelle = await readFile(join(PROBE, "probe-vorgaenge.js"), "utf8");
  const ohneKommentar = quelle.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
  pruefe(!/fetch\s*\(|new XMLHttpRequest|createClient\s*\(|supabase\./i.test(ohneKommentar),
    "kein Netzzugriff im Vorgangsmodul");
  pruefe(!/(diagnose|krankheitsgrund|befund)\s*[:=]/i.test(ohneKommentar),
    "kein Feld, das eine Diagnose aufnehmen wuerde");
}

await browser.close();
server.close();

console.log("\n" + "═".repeat(59));
console.log(`Prüfregeln: ${bestanden} bestanden, ${offen.length} nicht bestanden`);
if (offen.length) {
  console.log("\nNicht bestanden:");
  for (const n of offen) console.log("  - " + n);
}
console.log(`
ALLES SIMULIERT. Es gibt in dieser Probe keine Datei und keine
Storage-API. Belegt ist, dass die Geschaeftsregel in der Oberflaeche
und in den Aktionen durchgesetzt wird — NICHT, dass eine echte
Bescheinigung geschuetzt oder ausgeliefert wuerde.`);
console.log("═".repeat(59));
process.exit(offen.length ? 1 : 0);
