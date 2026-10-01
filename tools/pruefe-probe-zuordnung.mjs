/* ============================================================
   Prueflauf: vierter Prueffall "Falsche Person oder falscher Vorgang"
   ============================================================
   Vorgabe des Geschaeftsfuehrers vom 01.10.2026, ergaenzt am selben
   Tag um die Ausrichtung auf den ZIELVORGANG.

   Der Fall heisst "falsche Person ODER falscher Vorgang". Die erste
   Fassung liess nur eine andere Person waehlen und schloss die
   bisherige aus - damit war Fall B gar nicht abbildbar. Dieser Lauf
   prueft beide getrennt:

     A) andere Person, anderer Vorgang
     B) DIESELBE Person, aber anderer Krankheitsvorgang

   Dazu: die vier Stufen, der Ausschluss des aktuellen Vorgangs, das
   Anlegen eines neuen Vorgangs ohne Ableitung aus dem Dokument, die
   letzte Pruefung, das Protokoll, die Rollen und die direkten
   Aktionsaufrufe.

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
const titelJetzt = async (page) => (await page.textContent(".dialog-kopf h2")).trim();

/* Bis zum geoeffneten Zuordnungsdialog fuehren. */
const bisZuordnung = async (page) => {
  await oeffnen(page);
  await page.click('[data-tun="vg-bescheinigung:V0002"]');
  await page.waitForTimeout(400);
  await page.click('[data-tun="vg-einsicht-ja:V0002"]');
  await page.waitForTimeout(400);
  await page.click('[data-tun="vg-ergebnis:V0002|person"]');
  await page.waitForTimeout(500);
  await page.click('[data-tun="vg-zuordnung:V0002"]');
  await page.waitForTimeout(450);
};

/* ═══ 1. Der Nachweis wird gesperrt, nicht gelöscht ═════════════ */
console.log("\n── 1. Sperren statt löschen ──");
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

  await page.click('[data-tun="vg-ergebnis:V0002|person"]');
  await page.waitForTimeout(500);

  pruefe(await teilstand(page) === "offen", "die Personalprüfung bleibt offen");
  const d = await daten(page);
  pruefe(d.nachweise.length === 1, "die Datei ist nicht gelöscht");
  pruefe(d.nachweise[0].zuordnungUngeklaert === true, "„Zuordnung ungeklärt“ ist gesetzt");
  pruefe(d.nachweise[0].gesperrt === true, "der Nachweis ist gesperrt");
  pruefe(d.nachweise[0].umgezogenNach === "", "nichts ist von selbst zugeordnet");
  pruefe(d.klaerungen.length === 1 && d.klaerungen[0].art === "zuordnung",
    "es entsteht eine Klärungsaufgabe");
  pruefe(!(await knoepfe(page)).some((x) => x.startsWith("vg-teil-erledigen")),
    "der Abschluss ist gesperrt");
  await page.evaluate(() => window.ProbeVorgaenge.tun("vg-teil-erledigen", "V0002|personal"));
  await page.waitForTimeout(300);
  pruefe(await teilstand(page) === "offen", "auch der direkte Aufruf schliesst nicht ab");
  pruefe(fehler.length === 0, `keine Skriptfehler${fehler.length ? " (" + fehler[0] + ")" : ""}`);
  await ctx.close();
}

/* ═══ 2. Stufe 1: Person, mit Suche, bisherige inbegriffen ═════ */
console.log("\n── 2. Stufe 1: die bisherige Person steht mit zur Wahl ──");
{
  const { ctx, page } = await seite("personal");
  await bisZuordnung(page);

  pruefe(/Zu wem gehört der Nachweis/.test(await titelJetzt(page)), "Stufe 1 fragt nach der Person");
  const schritt = await page.textContent(".dialog-kopf .band-gold");
  pruefe(/Schritt 1 von 4/.test(schritt), `der Schritt ist benannt (${schritt.trim()})`);

  const ziele = await page.$$eval('[data-tun^="vg-zuordnung-person"]',
    (n) => n.map((x) => x.dataset.tun));
  pruefe(ziele.includes("vg-zuordnung-person:V0002|M02"),
    "die BISHERIGE Person ist auswählbar — das war der Befund");
  pruefe(ziele.length > 1, `andere Personen ebenfalls (${ziele.length} insgesamt)`);
  const text = await page.textContent(".dialog-rumpf");
  pruefe(/bisherige Zuordnung/.test(text), "die bisherige ist als solche gekennzeichnet");
  pruefe(/trotzdem am falschen Vorgang hängen/.test(text),
    "und es steht da, warum sie zur Wahl steht");

  /* Suche statt freier Eingabe. */
  pruefe(Boolean(await page.$("[data-zuordnung-suche]")), "es gibt eine Suche");
  pruefe(!(await page.$(".dialog-rumpf textarea")),
    "aber kein Freitextfeld für die Person");
  await page.fill("[data-zuordnung-suche]", "Testfahrer 03");
  await page.waitForTimeout(450);
  const gefiltert = await page.$$eval('[data-tun^="vg-zuordnung-person"]',
    (n) => n.map((x) => x.dataset.tun));
  pruefe(gefiltert.length === 1 && gefiltert[0].endsWith("M03"),
    `die Suche filtert (${gefiltert.length} Treffer)`);

  /* Der Klick auf eine Karte darf nicht vom Neuzeichnen verschluckt
     werden - genau das ist im manuellen Test passiert. */
  await page.click('[data-tun="vg-zuordnung-person:V0002|M03"]');
  await page.waitForTimeout(400);
  await page.click('[data-tun="vg-zuordnung-weiter"]');
  await page.waitForTimeout(450);
  pruefe(/Zu welchem Krankheitsvorgang/.test(await titelJetzt(page)),
    "ein Klick direkt nach dem Tippen wird nicht verschluckt");
  await ctx.close();
}

/* ═══ 3. Stufe 2: der Zielvorgang ══════════════════════════════ */
console.log("\n── 3. Stufe 2: welcher Vorgang dieser Person? ──");
{
  const { ctx, page } = await seite("personal");
  await bisZuordnung(page);
  await page.click('[data-tun="vg-zuordnung-person:V0002|M02"]');
  await page.waitForTimeout(350);
  await page.click('[data-tun="vg-zuordnung-weiter"]');
  await page.waitForTimeout(450);

  const schritt = await page.textContent(".dialog-kopf .band-gold");
  pruefe(/Schritt 2 von 4/.test(schritt), `der Schritt ist benannt (${schritt.trim()})`);
  const text = (await page.textContent(".dialog-rumpf")).replace(/\s+/g, " ");

  pruefe(/V0008/.test(text), "ein anderer Krankheitsvorgang derselben Person wird angeboten");
  pruefe(/Gemeldet \d{2}\.\d{2}\.\d{4} bis \d{2}\.\d{2}\.\d{4}/.test(text),
    "mit gemeldetem Zeitraum");
  pruefe(/Stand:/.test(text), "mit Zustand");
  pruefe(/Nachweis vorhanden|Nachweise vorhanden|noch kein Nachweis/.test(text),
    "und mit den vorhandenen Nachweisen");
  pruefe(/V0002 · nicht wählbar/.test(text), "der aktuelle Vorgang ist ausgeschlossen");

  const auswahl = await page.$$eval('[data-tun^="vg-zuordnung-vorgang"]',
    (n) => n.map((x) => x.dataset.tun));
  pruefe(!auswahl.some((x) => x.endsWith("|V0002")),
    "er steht auch nicht als Knopf zur Verfügung");
  pruefe(auswahl.some((x) => x.endsWith("|V0008")), "V0008 dagegen schon");
  pruefe(Boolean(await page.$('[data-tun="vg-zuordnung-neu:V0002"]')),
    "„Neuen Krankheitsvorgang anlegen“ wird ausdrücklich angeboten");

  /* Ohne Auswahl nicht weiter. */
  await page.click('[data-tun="vg-zuordnung-weiter2"]');
  await page.waitForTimeout(400);
  pruefe(Boolean(await page.$(".feldfehler")), "ohne Zielvorgang geht es nicht weiter");

  /* Der aktuelle Vorgang auch nicht per direktem Aufruf. */
  await page.evaluate(() => window.ProbeVorgaenge.tun("vg-zuordnung-vorgang", "V0002|V0002"));
  await page.waitForTimeout(300);
  await page.evaluate(() => window.ProbeVorgaenge.tun("vg-zuordnung-weiter2", ""));
  await page.waitForTimeout(350);
  pruefe(/Zu welchem Krankheitsvorgang/.test(await titelJetzt(page)),
    "auch der direkte Aufruf nimmt den aktuellen Vorgang nicht an");
  await ctx.close();
}

/* ═══ 4. FALL B: dieselbe Person, anderer Vorgang ══════════════ */
console.log("\n── 4. Fall B: dieselbe Person, anderer Krankheitsvorgang ──");
{
  const { ctx, page } = await seite("personal");
  await bisZuordnung(page);
  await page.click('[data-tun="vg-zuordnung-person:V0002|M02"]');
  await page.waitForTimeout(350);
  await page.click('[data-tun="vg-zuordnung-weiter"]');
  await page.waitForTimeout(400);
  await page.click('[data-tun="vg-zuordnung-vorgang:V0002|V0008"]');
  await page.waitForTimeout(350);
  await page.click('[data-tun="vg-zuordnung-weiter2"]');
  await page.waitForTimeout(450);

  const text = (await page.textContent(".dialog-rumpf")).replace(/\s+/g, " ");
  pruefe(/Schritt 4 von 4/.test(await page.textContent(".dialog-kopf .band-gold")),
    "die letzte Prüfung ist Schritt 4");
  pruefe(/Bisherige Person.*Testfahrer 02/.test(text), "bisherige Person");
  pruefe(/Bisheriger Vorgang.*V0002/.test(text), "bisheriger Vorgang");
  pruefe(/Neue Person.*Testfahrer 02/.test(text), "neue Person — dieselbe");
  pruefe(/Neuer Zielvorgang.*V0008/.test(text), "neuer Zielvorgang");
  pruefe(/Datei.*Testbescheinigung-M02-01\.pdf/.test(text), "Dateiname");
  pruefe(/Eingegangen.*heute 06:05/.test(text), "Eingangszeit");
  pruefe(/Handelndes Konto.*Testpersonal 01.*U-PER-01/.test(text), "Konto mit Kennung");
  pruefe(/Rolle.*Personal/.test(text), "Rolle");
  pruefe(/Die Person bleibt dieselbe/.test(text),
    "und der Hinweis, dass nur der Vorgang wechselt");
  pruefe(Boolean(await page.$('[data-tun="vg-zuordnung-zurueck"]')), "„Zurück und ändern“");
  pruefe(/Zurück und ändern/.test(await page.textContent('[data-tun="vg-zuordnung-zurueck"]')),
    "heisst auch so");

  /* Ohne Grund nichts. */
  const vorherZahl = await page.evaluate(() => window.ProbeDaten.vorgaenge.length);
  await page.click('[data-tun="vg-zuordnung-ja"]');
  await page.waitForTimeout(450);
  pruefe(Boolean(await page.$(".feldfehler")), "ohne Grund wird nicht gespeichert");
  pruefe((await daten(page)).nachweise[0].umgezogenNach === "", "und nichts zugeordnet");

  const vorherP = (await protokoll(page)).length;
  await page.fill("[data-zuordnung-grund]", "Testgrund: Zeitraum gehört zur früheren Krankmeldung");
  await page.click('[data-tun="vg-zuordnung-ja"]');
  await page.waitForTimeout(600);

  /* Kein neuer Vorgang - der vorhandene wurde genommen. */
  pruefe(await page.evaluate(() => window.ProbeDaten.vorgaenge.length) === vorherZahl,
    "es entsteht KEIN neuer Vorgang — der vorhandene wird genommen");

  const alt = await daten(page);
  pruefe(alt.nachweise.length === 1, "die alte Datei ist nicht gelöscht");
  pruefe(alt.nachweise[0].ergebnis === "person", "ihr Ergebnis bleibt als Spur stehen");
  pruefe(alt.nachweise[0].umgezogenNach === "V0008", "mit Verweis auf den Zielvorgang");
  pruefe(alt.klaerungen[0].zustand === "geklaert", "die Klärungsaufgabe ist erledigt");
  pruefe(await teilstand(page) === "offen", "der alte Vorgang bleibt offen");

  const zd = await daten(page, "V0008");
  pruefe(zd.nachweise.length === 2, "der Zielvorgang hat jetzt zwei Nachweise");
  const neu = zd.nachweise[1];
  pruefe(neu.datei === "Testbescheinigung-M02-01.pdf", "der umgehängte ist dabei");
  pruefe(neu.herkunft === "V0002", "mit dem Vermerk der Herkunft");
  pruefe(neu.einsicht === null, "frühere Einsicht gilt dort nicht");
  pruefe(neu.ergebnis === "", "früheres Prüfergebnis ebenso wenig");
  pruefe(zd.nachweise[0].datei === "Testbescheinigung-M02-fr-01.pdf",
    "der dort vorhandene Nachweis bleibt unberührt");

  await oeffnen(page, "V0008");
  const zt = await page.textContent(".dialog-kasten");
  pruefe(/Aus Vorgang V0002 neu zugeordnet/.test(zt), "die Herkunft ist sichtbar");
  pruefe(/1\. Bescheinigung Nr\. 2 ansehen/.test(zt), "die Prüfung beginnt dort bei Schritt 1");
  pruefe(!(await knoepfe(page)).some((x) => x.startsWith("vg-teil-erledigen")),
    "und der Abschluss ist dort gesperrt");

  const p = await protokoll(page);
  pruefe(p.length > vorherP, "es ist etwas protokolliert");
  const e = p.find((x) => /Nachweis neu zugeordnet/.test(x.was));
  pruefe(Boolean(e), "die Neuzuordnung steht im Protokoll");
  pruefe(/Testfahrer 02/.test(e.vorher) && /V0002/.test(e.vorher),
    `bisherige Person und Vorgang (${e.vorher})`);
  pruefe(/Testfahrer 02/.test(e.nachher) && /V0008/.test(e.nachher),
    `neue Person und Vorgang (${e.nachher})`);
  pruefe(!/neu angelegt/.test(e.nachher), "und es steht nicht fälschlich „neu angelegt“ da");
  pruefe(/Testgrund/.test(e.grund), "mit Grund");
  await ctx.close();
}

/* ═══ 5. FALL A: andere Person, neuer Vorgang ══════════════════ */
console.log("\n── 5. Fall A: andere Person, neuer Vorgang ──");
{
  const { ctx, page } = await seite("personal");
  await bisZuordnung(page);
  await page.click('[data-tun="vg-zuordnung-person:V0002|M05"]');
  await page.waitForTimeout(350);
  await page.click('[data-tun="vg-zuordnung-weiter"]');
  await page.waitForTimeout(450);

  const s2 = await page.textContent(".dialog-rumpf");
  pruefe(/keinen anderen Krankheitsvorgang/.test(s2),
    "für diese Person gibt es keinen passenden Vorgang");
  pruefe(Boolean(await page.$('[data-tun="vg-zuordnung-neu:V0002"]')),
    "das Anlegen wird ausdrücklich angeboten");

  await page.click('[data-tun="vg-zuordnung-neu:V0002"]');
  await page.waitForTimeout(450);
  pruefe(/Neuen Krankheitsvorgang anlegen/.test(await titelJetzt(page)), "Stufe 3 legt an");
  pruefe(/Schritt 3 von 4/.test(await page.textContent(".dialog-kopf .band-gold")),
    "als Schritt 3");
  const s3 = (await page.textContent(".dialog-rumpf")).replace(/\s+/g, " ");
  pruefe(/Nichts wird abgeleitet/.test(s3), "es steht da, dass nichts abgeleitet wird");
  pruefe(/Aus dem Inhalt der Bescheinigung wird nichts gelesen/.test(s3),
    "insbesondere nichts aus dem Dokument");
  /* textContent setzt zwischen <dt> und <dd> KEIN Leerzeichen -
     "Übernommen aus" und "Vorgang V0002" stehen direkt aneinander. */
  pruefe(/Übernommen ausVorgang V0002/.test(s3), "die Herkunft des Zeitraums ist benannt");
  pruefe(Boolean(await page.$("[data-zuordnung-von]")), "der Zeitraum ist prüfbar");
  pruefe(Boolean(await page.$("[data-zuordnung-bis]")), "von und bis");

  /* Zeitraum wird geprueft. */
  await page.fill("[data-zuordnung-bis]", "2020-01-01");
  await page.click('[data-tun="vg-zuordnung-neu-weiter"]');
  await page.waitForTimeout(450);
  pruefe(Boolean(await page.$(".feldfehler")), "ein Ende vor dem Beginn wird abgewiesen");

  await page.fill("[data-zuordnung-bis]", "2026-10-03");
  await page.click('[data-tun="vg-zuordnung-neu-weiter"]');
  await page.waitForTimeout(450);
  const s4 = (await page.textContent(".dialog-rumpf")).replace(/\s+/g, " ");
  pruefe(/Bisherige Person.*Testfahrer 02/.test(s4), "bisherige Person");
  pruefe(/Neue Person.*Testfahrer 05/.test(s4), "neue Person");
  pruefe(/Neuer Zielvorgang.*neu anzulegen/.test(s4), "der Zielvorgang ist als neu benannt");
  pruefe(/03\.10\.2026/.test(s4), "mit dem geprüften Zeitraum");

  /* Zurueck und aendern. */
  await page.click('[data-tun="vg-zuordnung-zurueck"]');
  await page.waitForTimeout(450);
  pruefe(/Neuen Krankheitsvorgang anlegen/.test(await titelJetzt(page)),
    "„Zurück und ändern“ führt eine Stufe zurück, nicht heraus");
  await page.click('[data-tun="vg-zuordnung-neu-weiter"]');
  await page.waitForTimeout(450);

  const vorherZahl = await page.evaluate(() => window.ProbeDaten.vorgaenge.length);
  await page.fill("[data-zuordnung-grund]", "Testgrund: Name gehört zu Testfahrer 05");
  await page.click('[data-tun="vg-zuordnung-ja"]');
  await page.waitForTimeout(600);

  pruefe(await page.evaluate(() => window.ProbeDaten.vorgaenge.length) === vorherZahl + 1,
    "es entsteht genau ein neuer Vorgang");
  const ziel = await page.evaluate(() => {
    const z = window.ProbeDaten.vorgaenge.find((x) => Number(x.id.slice(1)) > 100);
    return z ? {
      id: z.id, person: z.betrifft.id, von: z.daten.von, bis: z.daten.bis,
      bezug: z.daten.bezugAuf, teile: Boolean(z.teile),
      erfordert: z.teile ? z.teile.personal.erfordert : "",
      nachweise: z.daten.nachweise
    } : null;
  });
  pruefe(Boolean(ziel), `der Zielvorgang ist da (${ziel && ziel.id})`);
  pruefe(ziel.person === "M05", "er gehört der neuen Person");
  pruefe(ziel.bis === "2026-10-03", `mit dem geprüften Zeitraum (${ziel.von} bis ${ziel.bis})`);
  pruefe(ziel.bezug === "V0002", "und verweist auf den alten Vorgang");
  pruefe(ziel.teile && ziel.erfordert === "bescheinigung",
    "er trägt die Prüfsperre — sonst wäre er ohne Prüfung abschliessbar");
  pruefe(ziel.nachweise.length === 1, "er trägt den Nachweis");
  pruefe(ziel.nachweise[0].einsicht === null && ziel.nachweise[0].ergebnis === "",
    "ungeprüft, die Prüfung beginnt dort von vorn");
  pruefe(ziel.nachweise[0].herkunft === "V0002", "mit dem Vermerk der Herkunft");

  const alt = await daten(page);
  pruefe(alt.nachweise.length === 1 && alt.nachweise[0].umgezogenNach === ziel.id,
    "der alte Vorgang behält die Spur");
  pruefe(await teilstand(page) === "offen", "und bleibt offen");

  const e = (await protokoll(page)).find((x) => /Nachweis neu zugeordnet/.test(x.was));
  pruefe(/Testfahrer 02/.test(e.vorher) && /V0002/.test(e.vorher), "Protokoll: bisherige Seite");
  pruefe(/Testfahrer 05/.test(e.nachher) && /neu angelegt/.test(e.nachher),
    `Protokoll: neue Seite mit Hinweis auf das Anlegen (${e.nachher})`);
  await ctx.close();
}

/* ═══ 6. Rollen und direkte Aufrufe ════════════════════════════ */
console.log("\n── 6. Rollen und direkte Aufrufe ──");
{
  const { ctx, page } = await seite("personal");
  await bisZuordnung(page);
  await page.evaluate(() => window.ProbeRahmen.dialogSchliessen(true));
  await page.waitForTimeout(250);
  await page.selectOption("[data-rolle]", "dispatcher");
  await page.waitForTimeout(400);
  await oeffnen(page);

  const text = await page.textContent(".dialog-kasten");
  pruefe(!/\.pdf/i.test(text), "die Disposition sieht keinen Dateinamen");
  pruefe(!(await page.$(".konfliktliste")), "keine Nachweisliste");
  pruefe(!(await page.$(".pruefkette")), "keine Prüfkette");
  pruefe(!/Zuordnung ungeklärt/.test(text), "keine Zuordnungsangaben");
  pruefe(!(await knoepfe(page)).some((x) => x.startsWith("vg-zuordnung")),
    "und keinen Knopf dafür");

  for (const [name, wert] of [
    ["vg-zuordnung", "V0002"], ["vg-zuordnung-person", "V0002|M05"],
    ["vg-zuordnung-weiter", ""], ["vg-zuordnung-vorgang", "V0002|V0008"],
    ["vg-zuordnung-weiter2", ""], ["vg-zuordnung-neu", "V0002"],
    ["vg-zuordnung-neu-weiter", ""], ["vg-zuordnung-ja", ""],
    ["vg-zuordnung-unklar", "V0002"]]) {
    await page.evaluate(([a, b]) => window.ProbeVorgaenge.tun(a, b), [name, wert]);
    await page.waitForTimeout(120);
  }
  const d = await daten(page);
  pruefe(d.nachweise[0].umgezogenNach === "" && d.nachweise[0].zuordnungUngeklaert === true,
    "keiner der neun direkten Aufrufe ändert bei ihr etwas");
  pruefe(d.nachweise.length === 1, "und keiner löscht etwas");
  pruefe((await daten(page, "V0008")).nachweise.length === 1,
    "auch im anderen Vorgang nicht");
  await ctx.close();

  /* Administration darf - aber auch sie muss durch die Stufen. */
  const a = await seite("admin");
  await bisZuordnung(a.page);
  pruefe(/Zu wem gehört der Nachweis/.test(await titelJetzt(a.page)),
    "die Administration darf ebenfalls neu zuordnen");
  await a.page.evaluate(() => window.ProbeVorgaenge.tun("vg-zuordnung-ja", ""));
  await a.page.waitForTimeout(350);
  pruefe((await daten(a.page)).nachweise[0].umgezogenNach === "",
    "aber auch sie kann die Stufen nicht überspringen");
  await a.ctx.close();
}

/* ═══ 7. Wenn sich die Zuordnung nicht klären lässt ════════════ */
console.log("\n── 7. Ungeklärt bleibt gesperrt ──");
{
  const { ctx, page } = await seite("personal");
  await oeffnen(page);
  await page.click('[data-tun="vg-bescheinigung:V0002"]');
  await page.waitForTimeout(400);
  await page.click('[data-tun="vg-einsicht-ja:V0002"]');
  await page.waitForTimeout(400);
  await page.click('[data-tun="vg-ergebnis:V0002|person"]');
  await page.waitForTimeout(500);
  await page.click('[data-tun="vg-zuordnung-unklar:V0002"]');
  await page.waitForTimeout(450);

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
    "kein neuer Vorgang");
  const e = (await protokoll(page)).find((x) => /nicht geklärt/.test(x.was));
  pruefe(Boolean(e) && /Testgrund/.test(e.grund), "es ist trotzdem protokolliert");
  await ctx.close();
}

/* ═══ 8. Darstellung, Tastatur, Netz ═══════════════════════════ */
console.log("\n── 8. Darstellung, Tastatur, Netz ──");
for (const [breite, hoehe] of [[320, 568], [390, 844], [1440, 900]]) {
  const { ctx, page } = await seite("personal", breite, hoehe);
  await bisZuordnung(page);
  await page.click('[data-tun="vg-zuordnung-person:V0002|M02"]');
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
  await bisZuordnung(page);
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
