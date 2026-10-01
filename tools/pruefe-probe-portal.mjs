/* ============================================================
   Prueflauf fuer die Designprobe des Betriebsportals
   ============================================================
   Prueft die Probe im echten Browser: Rollenfilter, Bedienwege,
   Darstellung bei 320/390/430/1440 px, Tastatur, Fokus, Ueberlauf,
   Bedienflaechen und Schriftgroessen.

   ALLES SIMULIERT. Die Probe spricht mit nichts. Dieser Lauf beweist
   nichts ueber die produktive Instanz.
   ============================================================ */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname, normalize } from "node:path";

const { chromium } = await import(
  "file:///" + join(process.cwd(), "fahrer/tests/node_modules/playwright/index.mjs").replace(/\\/g, "/")
);

const WURZEL = process.cwd();
const PROBE = join(WURZEL, "probe-betriebsportal");
const PORT = 5399;
const TYPEN = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".png": "image/png", ".woff2": "font/woff2"
};

const server = createServer(async (req, res) => {
  const pfad = decodeURIComponent(req.url.split("?")[0]);
  const sauber = normalize(pfad).replace(/^(\.\.[/\\])+/, "");
  let datei;
  if (sauber === "/" || sauber === "\\") datei = join(PROBE, "index.html");
  else if (/^[/\\]schriften[/\\]/.test(sauber)) datei = join(WURZEL, "public", sauber);
  else if (/^[/\\]logo\.png$/.test(sauber)) datei = join(WURZEL, "logo.png");
  else datei = join(PROBE, sauber);
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

async function seite(breite = 1440, hoehe = 900) {
  const ctx = await browser.newContext({ viewport: { width: breite, height: hoehe } });
  const fehler = [];
  /* Das Netz wird dichtgemacht: nur die eigene Adresse darf durch.
     Damit ist belegt, dass die Probe nach aussen nichts braucht. */
  const fremd = [];
  await ctx.route("**://**", (route) => {
    const u = route.request().url();
    if (u.startsWith(ADRESSE)) return route.continue();
    fremd.push(u);
    return route.abort();
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => fehler.push(String(e.message)));
  page.on("console", (m) => { if (m.type() === "error") fehler.push(m.text()); });
  await page.goto(ADRESSE, { waitUntil: "load" });
  await page.waitForTimeout(400);
  return { ctx, page, fehler, fremd };
}

const rolleSetzen = async (page, rolle) => {
  await page.selectOption("[data-rolle]", rolle);
  await page.waitForTimeout(200);
};
const navTexte = (page) =>
  page.$$eval("[data-navigation] .nav-knopf span:first-of-type", (n) => n.map((x) => x.textContent.trim()));

/* ═══ 1. Grundlage ═══════════════════════════════════════════════ */
console.log("\n── 1. Die Probe laedt und nennt sich Probe ──");
{
  const { ctx, page, fehler, fremd } = await seite();
  pruefe(fehler.length === 0, `keine Skriptfehler${fehler.length ? " (" + fehler[0] + ")" : ""}`);
  const banner = await page.textContent(".probe-banner");
  pruefe(/Designprobe – keine echten Daten/.test(banner), "das Banner steht da und nennt die Probe beim Namen");
  pruefe(/kein Upload/.test(banner) && /kein Versand/.test(banner), "es nennt auch, was die Probe nicht tut");
  const klebt = await page.$eval(".probe-banner", (el) => getComputedStyle(el).position);
  pruefe(klebt === "sticky", "das Banner bleibt beim Blaettern sichtbar");
  const wegklickbar = await page.$$(".probe-banner button, .probe-banner [data-zu]");
  pruefe(wegklickbar.length === 0, "das Banner laesst sich nicht wegklicken");
  pruefe(fremd.length === 0, `keine einzige Anfrage nach aussen (${fremd.length})`);
  await ctx.close();
}

/* ═══ 2. Keine echten Daten, keine erfundenen Personen ═══════════ */
console.log("\n── 2. Nur offensichtlich fiktive Daten ──");
{
  const quellen = await Promise.all(
    ["probe-daten.js", "probe-bereiche.js", "probe-rahmen.js", "probe-fahrtassistent.js"]
      .map((f) => readFile(join(PROBE, f), "utf8"))
  );
  const text = quellen.join("\n");
  /* Fuer die inhaltlichen Pruefungen ohne Kommentare: In probe-daten.js
     steht ausdruecklich, dass ein Ziel "Testklinik 01" heisst und NICHT
     "Dialyse". Dieser Hinweis ist richtig und darf nicht ausloesen. */
  const textOhneKommentar = text
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*\/\/.*$/gm, " ");
  pruefe(!/Mustermann|Musterfrau|Herr Müller|Frau Schmidt|Herr Cakir/.test(text),
    "keine erfundenen Personennamen aus dem Bestand");
  pruefe(!/\b01[5-7][0-9]\s?\d{6,}/.test(text), "keine erfundenen Telefonnummern");
  pruefe(!/Dialyse|Strahlentherapie|Chemotherapie/.test(textOhneKommentar), "keine Gesundheitsangaben");
  pruefe(/Testkunde 01/.test(text) && /Testfahrer 01/.test(text) && /GER-TEST 001/.test(text),
    "stattdessen ausdruecklich benannte Testdaten");
  /* Kommentare erst entfernen: Die Probe SPRICHT ueber Supabase
     ("keine Verbindung zu Supabase") - das ist genau richtig und darf
     die Pruefung nicht ausloesen. Gesucht wird echter Code. */
  const ohneKommentar = text
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*\/\/.*$/gm, " ");
  pruefe(!/fetch\s*\(|new XMLHttpRequest|new WebSocket|createClient\s*\(|supabase\./i.test(ohneKommentar),
    "kein Netzzugriff und kein Supabase-Aufruf im Probencode");
}

/* ═══ 3. Rollenfilter ════════════════════════════════════════════ */
console.log("\n── 3. Die Navigation richtet sich nach der Rolle ──");
{
  const { ctx, page } = await seite();

  await rolleSetzen(page, "dispatcher");
  let nav = await navTexte(page);
  pruefe(nav.length === 6, `Disposition sieht sechs Bereiche (${nav.length})`);
  pruefe(!nav.includes("Lohn") && !nav.includes("Personal"),
    "Disposition sieht weder Lohn noch Personal");
  pruefe(!nav.includes("Finanzen") && !nav.includes("Rewards"),
    "Disposition sieht weder Finanzen noch Rewards");

  await rolleSetzen(page, "admin");
  nav = await navTexte(page);
  pruefe(nav.length === 12, `Administration sieht alle zwoelf Bereiche (${nav.length})`);

  await rolleSetzen(page, "personal");
  nav = await navTexte(page);
  pruefe(nav.includes("Personal") && nav.includes("Lohn"), "Personal sieht Personal und Lohn");
  pruefe(!nav.includes("Fahrten") && !nav.includes("Finanzen"),
    "Personal sieht weder Fahrten noch Finanzen");

  await rolleSetzen(page, "accounting");
  nav = await navTexte(page);
  pruefe(nav.includes("Finanzen") && nav.includes("Kunden"), "Buchhaltung sieht Finanzen und Kunden");
  pruefe(!nav.includes("Lohn") && !nav.includes("Personal"),
    "Buchhaltung sieht weder Lohn noch Personal");

  await rolleSetzen(page, "employee");
  nav = await navTexte(page);
  pruefe(nav.length <= 2, `Mitarbeiter sieht fast nichts (${nav.length})`);

  await ctx.close();
}

/* ═══ 4. Dispatcher-Uebersicht ═══════════════════════════════════ */
console.log("\n── 4. Die Uebersicht zeigt das Wichtige zuerst ──");
{
  const { ctx, page } = await seite();
  const kopf = await page.textContent(".bereichskopf");
  pruefe(/Übersicht/.test(kopf), "sie heisst Uebersicht");
  pruefe(/\d{2}\.\d{2}\.\d{4}/.test(kopf), "das vollstaendige Datum steht da");
  const haupt = await page.textContent(".bereichskopf .hauptaktion");
  pruefe(/Neue Fahrt aufnehmen/.test(haupt), "die Hauptaktion steht oben");

  const zahlen = await page.$$eval(".kennzahl", (n) => n.length);
  pruefe(zahlen >= 6, `mehrere Kennzahlen (${zahlen})`);
  const anklickbar = await page.$$eval(".kennzahl[data-ziel]", (n) => n.filter((x) => x.dataset.ziel).length);
  pruefe(anklickbar >= 5, `Kennzahlen fuehren zur Liste (${anklickbar})`);

  /* Eine Kennzahl anklicken fuehrt wirklich in die gefilterte Liste. */
  await page.click('.kennzahl[data-ziel="fahrten:ungeplant"]');
  await page.waitForTimeout(250);
  const titel = await page.textContent(".bereichskopf h1");
  pruefe(titel.trim() === "Fahrten", "ein Klick auf die Kennzahl landet bei den Fahrten");
  const gewaehlt = await page.$eval('[data-tun="fahrt-filter:ungeplant"]', (el) => el.getAttribute("aria-pressed"));
  pruefe(gewaehlt === "true", "und zwar im richtigen Filter");

  const seitentext = await page.textContent(".haupt");
  pruefe(!/km\b|Minuten Fahrzeit|Entfernung: \d/.test(seitentext),
    "keine erfundenen Entfernungen oder Fahrzeiten");
  await ctx.close();
}

/* ═══ 5. Neue Fahrt ══════════════════════════════════════════════ */
console.log("\n── 5. Neue Fahrt: ein gefuehrter Ablauf ──");
{
  const { ctx, page } = await seite();
  await page.click('[data-tun="neue-fahrt"]');
  await page.waitForTimeout(250);
  pruefe(await page.isVisible(".dialog-kasten"), "das Fenster oeffnet sich");
  const schritte = await page.$$eval(".schrittleiste li", (n) => n.length);
  pruefe(schritte === 6, `sechs Schritte sind sichtbar (${schritte})`);

  /* Der Ablauf selbst wird seit dem echten Bedienversuch in einem
     eigenen Lauf geprueft: tools/pruefe-probe-fahrtaufnahme.mjs.
     Hier bleibt nur, dass der Weg dorthin da ist und sich das Fenster
     richtig verhaelt. */
  const rumpf = await page.textContent(".dialog-rumpf");
  pruefe(/Für wen ist die Fahrt\?/.test(rumpf), "er beginnt bei der Kundenauswahl");
  pruefe(await page.isVisible("[data-suchfeld]"), "mit einem Suchfeld statt Kundenkarten");

  await page.click(".dialog-hinter", { position: { x: 5, y: 5 } });
  await page.waitForTimeout(250);
  pruefe(await page.isVisible(".dialog-kasten"), "ein Klick daneben schliesst ihn nicht");

  const verschachtelt = await page.$$eval(".dialog-kasten", (n) => n.length);
  pruefe(verschachtelt === 1, `nie zwei Fenster uebereinander (${verschachtelt})`);
  await ctx.close();
}

/* ═══ 6. Planung ═════════════════════════════════════════════════ */
console.log("\n── 6. Planung: alles in der Zeile ──");
{
  const { ctx, page } = await seite();
  await page.click('[data-bereich="planung"]');
  await page.waitForTimeout(300);

  const leiste = await page.textContent(".tagleiste");
  pruefe(/Heute/.test(leiste) && /Morgen/.test(leiste), "Heute und Morgen stehen als Umschalter da");
  pruefe(/\d{2}\.\d{2}\.\d{4}/.test(leiste), "das vollstaendige Datum steht daneben");
  pruefe(/Veröffentlicht|Entwurf|Änderung/.test(leiste), "der Stand steht in verstaendlichem Deutsch");
  pruefe(!/\bdraft\b|\bpublished\b/.test(await page.textContent(".haupt")),
    "keine Fachbegriffe wie draft oder published");

  const zeilen = await page.$$eval(".plan-zeile", (n) => n.length);
  pruefe(zeilen === 6, `eine Zeile je Mitarbeiter (${zeilen})`);
  const inZeile = await page.$$eval('.plan-zeile:first-child select', (n) => n.length);
  pruefe(inZeile === 3, `Status, Schicht und Fahrzeug direkt in der Zeile (${inZeile})`);

  const schicht = await page.$eval('.plan-zeile select[data-plan="vorlage"]',
    (el) => [...el.options].map((o) => o.textContent.trim()));
  pruefe(schicht.some((t) => /Frühschicht · 06:00–14:00/.test(t)),
    "unter der Bezeichnung steht immer die Uhrzeit");
  pruefe(schicht.some((t) => /Individuell/.test(t)), "Individuell ist waehlbar");

  /* Eine Aenderung wird markiert und laesst sich zuruecknehmen. */
  await page.selectOption('.plan-zeile:nth-child(4) select[data-plan="dienst"]', "ja");
  await page.waitForTimeout(250);
  const markiert = await page.$$eval(".plan-zeile.ist-geaendert", (n) => n.length);
  pruefe(markiert >= 1, `geaenderte Zeilen sind markiert (${markiert})`);
  const stand = await page.textContent(".aktionsleiste .stand");
  pruefe(/nicht gespeichert/.test(stand), "die Leiste sagt, dass etwas offen ist");

  await page.click('[data-tun="plan-verwerfen"]');
  await page.waitForTimeout(250);
  const danach = await page.$$eval(".plan-zeile.ist-geaendert", (n) => n.length);
  pruefe(danach === 0, "Verwerfen nimmt die Aenderung zurueck");

  const klebt = await page.$eval(".aktionsleiste", (el) => getComputedStyle(el).position);
  pruefe(klebt === "sticky", "die Aktionsleiste bleibt sichtbar");
  /* Seit der Messung bei 320 x 568 kleben nur noch Stand und
     Hauptaktion - die Nebenaktionen verdeckten dort die Filter und
     stehen jetzt im Fluss darueber. */
  const knoepfe = await page.textContent(".aktionsleiste");
  pruefe(/veröffentlichen/i.test(knoepfe), "sie traegt die Hauptaktion");
  const neben = await page.textContent(".plan-nebenaktionen");
  pruefe(/verwerfen/i.test(neben) && /Entwurf speichern/.test(neben) && /rückgängig/i.test(neben),
    "die Nebenaktionen stehen vollstaendig darueber");
  pruefe(/für heute veröffentlichen/i.test(knoepfe), "und nennt den Tag im Text");

  /* Konflikte werden erkannt und benannt. */
  const hinweise = await page.textContent("tbody");
  pruefe(/kein Fahrzeug|doppelt verplant|Werkstatt/.test(hinweise),
    "Konflikte stehen als Klartext in der Zeile");

  await ctx.close();
}

/* ═══ 7. Veroeffentlichen nennt den Tag ══════════════════════════ */
console.log("\n── 7. Kein Tag wird versehentlich veroeffentlicht ──");
{
  const { ctx, page } = await seite();
  await page.click('[data-bereich="planung"]');
  await page.waitForTimeout(250);
  await page.click('[data-tun="plan-morgen"]');
  await page.waitForTimeout(250);
  await page.click('[data-tun="plan-veroeffentlichen"]');
  await page.waitForTimeout(250);
  const rumpf = await page.textContent(".dialog-kasten");
  pruefe(/Morgen/.test(rumpf), "die Rueckfrage nennt den Tag");
  pruefe(/\d{2}\.\d{2}\.\d{4}/.test(rumpf), "und das vollstaendige Datum");
  pruefe(/Eingeplant/.test(rumpf) && /Ohne Fahrzeug/.test(rumpf) && /Konflikte/.test(rumpf),
    "sie nennt Anzahl, Fahrzeuglage und Konflikte");
  /* Der erste Klick veroeffentlicht seit dem manuellen Test nichts mehr,
     sondern oeffnet die Konfliktpruefung. Der Ablauf dahinter wird in
     tools/pruefe-probe-planung.mjs in voller Tiefe geprueft. */
  pruefe(/Konfliktprüfung vor dem Veröffentlichen/.test(rumpf),
    "der erste Klick oeffnet die Pruefung statt zu veroeffentlichen");
  /* Fuer MORGEN liegt in den Testdaten ein Widerspruch vor: ein
     Mitarbeiter ist gleichzeitig krank gemeldet und im genehmigten
     Urlaub. Das ist technisch ungueltig, deshalb gibt es genau einen
     Weg - zurueck. Die Abwesenheitsfaelle selbst prueft
     tools/pruefe-probe-planung.mjs. */
  const fuss = await page.textContent(".dialog-fuss");
  pruefe(/Zur Planung zurück/.test(fuss), "bei technisch ungueltigen Daten fuehrt der Fuss nur zurueck");
  pruefe(!/Trotzdem veröffentlichen/.test(fuss), "und bietet keinen Ausweg an");
  await ctx.close();
}

/* ═══ 8. Zustaende ═══════════════════════════════════════════════ */
console.log("\n── 8. Ein Ladefehler sieht nicht aus wie leer ──");
{
  const { ctx, page } = await seite();
  await page.click('[data-bereich="fahrten"]');
  await page.waitForTimeout(250);

  await page.click('[data-tun="fahrt-zustand:leer"]');
  await page.waitForTimeout(200);
  const leer = await page.$eval(".zustand", (el) => ({
    klasse: el.className, text: el.textContent, rand: getComputedStyle(el).borderLeftColor
  }));
  pruefe(/leer/.test(leer.klasse), "der leere Zustand ist ein eigener Kasten");

  await page.click('[data-tun="fahrt-zustand:fehler"]');
  await page.waitForTimeout(200);
  const fehler = await page.$eval(".zustand", (el) => ({
    klasse: el.className, text: el.textContent, rand: getComputedStyle(el).borderLeftColor
  }));
  pruefe(/fehler/.test(fehler.klasse), "der Fehlerzustand ist ein anderer Kasten");
  pruefe(fehler.rand !== leer.rand, "die beiden sehen unterschiedlich aus");
  pruefe(/nicht.*dass es keine Eintr/.test(fehler.text.replace(/\s+/g, " ")),
    "der Fehler sagt ausdruecklich, dass die Liste nicht leer sein muss");
  pruefe(/Erneut versuchen/.test(fehler.text), "und bietet einen naechsten Schritt");

  await page.click('[data-tun="fahrt-zustand:laedt"]');
  await page.waitForTimeout(200);
  pruefe(await page.isVisible(".laedt-balken"), "der Ladezustand ist erkennbar");

  await page.click('[data-tun="fahrt-zustand:geladen"]');
  await page.waitForTimeout(200);
  pruefe((await page.$$(".liste tbody tr")).length > 0, "danach steht die Liste wieder da");
  await ctx.close();
}

/* ═══ 9. Ehrliche Leerzustaende ══════════════════════════════════ */
console.log("\n── 9. Was keine Datenquelle hat, sagt es ──");
{
  const { ctx, page } = await seite();
  await rolleSetzen(page, "admin");

  await page.click('[data-bereich="team"]');
  await page.waitForTimeout(250);
  const team = await page.textContent(".haupt");
  pruefe(/PAJ GPS — nicht angebunden/.test(team), "PAJ GPS wird als nicht angebunden benannt");
  pruefe(/keine Positionen.*und keine erfunden/.test(team.replace(/\s+/g, " ")),
    "und ausdruecklich nichts vorgetaeuscht");

  await page.click('[data-bereich="analyse"]');
  await page.waitForTimeout(250);
  const analyse = await page.textContent(".haupt");
  pruefe(/Alle Zahlen hier sind erfunden/.test(analyse), "die Analyse nennt ihre Zahlen erfunden");
  pruefe(/Schätzung/.test(analyse), "sie trennt Gezaehltes von Geschaetztem");
  pruefe(/bleibt der Bereich leer/.test(analyse), "und sagt, was produktiv gilt");

  await page.click('[data-bereich="finanzen"]');
  await page.waitForTimeout(250);
  const finanzen = await page.textContent(".haupt");
  pruefe(/nicht eingerichtet/.test(finanzen), "der Rechnungsversand wird nicht vorgetaeuscht");

  await page.click('[data-bereich="lohn"]');
  await page.waitForTimeout(250);
  const lohn = await page.textContent(".haupt");
  pruefe(/privater Bucket/.test(lohn) && /signiert/.test(lohn),
    "der Lohnbereich benennt seinen Schutz");
  pruefe(/Disposition hat keinen Zugriff/.test(lohn), "und wer keinen Zugriff hat");
  await ctx.close();
}

/* ═══ 10. Meldungen sind rollenabhaengig ═════════════════════════ */
console.log("\n── 10. Die Disposition sieht keine Krankmeldungsinhalte ──");
{
  const { ctx, page } = await seite();
  await rolleSetzen(page, "dispatcher");
  await page.click('[data-bereich="meldungen"]');
  await page.waitForTimeout(250);
  const dispo = await page.textContent(".haupt");
  pruefe(/Krankmeldung eingegangen/.test(dispo), "sie sieht, DASS eine Krankmeldung da ist");
  pruefe(!/Testbescheinigung/.test(dispo), "aber nicht die eingereichte Bescheinigung");
  pruefe(!/Diagnose:|Befund/.test(dispo), "und keine medizinische Angabe");

  await rolleSetzen(page, "personal");
  await page.evaluate(() => window.ProbeRahmen.geheZu("meldungen"));
  await page.waitForTimeout(300);
  const pers = await page.textContent(".haupt");
  pruefe(/Krankmeldung eingegangen/.test(pers), "Personal sieht den Vorgang ebenfalls");
  /* Den geschuetzten Teil prueft der eigene Lauf fuer Meldungen und
     Aufgaben - dort wird der Vorgang geoeffnet. */
  await ctx.close();
}

/* ═══ 11. Darstellung und Tastatur ═══════════════════════════════ */
console.log("\n── 11. Darstellung, Tastatur, Fokus ──");
for (const [name, breite, hoehe] of [["320 px", 320, 568], ["390 px", 390, 844], ["430 px", 430, 932], ["1366 px", 1366, 768], ["1440 px", 1440, 900]]) {
  const { ctx, page, fehler } = await seite(breite, hoehe);
  const bereiche = ["uebersicht", "fahrten", "planung", "team", "meldungen"];
  let ueberlauf = 0;
  let kleineFelder = 0;
  let kleineFlaechen = 0;
  await rolleSetzen(page, "admin");
  for (const b of bereiche) {
    await page.click(`[data-navigation] [data-bereich="${b}"], [data-handyleiste] [data-bereich="${b}"]`)
      .catch(async () => { await page.evaluate((x) => window.ProbeRahmen.geheZu(x), b); });
    await page.waitForTimeout(250);
    const m = await page.evaluate(() => {
      const d = document.documentElement;
      const klein = [...document.querySelectorAll("input, select, textarea")]
        .filter((el) => el.offsetParent !== null && parseFloat(getComputedStyle(el).fontSize) < 16).length;
      /* Der erste Versuch hatte hier einen unsinnigen Ausdruck und
         meldete 25 bis 55 zu kleine Flaechen, die es nicht gab.
         Jetzt schlicht: jede sichtbare Schaltflaeche, gemessen. */
      const flaechen = [...document.querySelectorAll("button")]
        .filter((el) => el.offsetParent !== null && el.getBoundingClientRect().height < 36).length;
      return { ueber: d.scrollWidth - d.clientWidth, klein, flaechen };
    });
    if (m.ueber > 0) ueberlauf += 1;
    kleineFelder += m.klein;
    kleineFlaechen += m.flaechen;
  }
  pruefe(ueberlauf === 0, `${name}: kein waagerechter Ueberlauf (${ueberlauf} Bereiche)`);
  pruefe(kleineFelder === 0, `${name}: kein Eingabefeld unter 16 px (${kleineFelder})`);
  pruefe(kleineFlaechen === 0, `${name}: keine Bedienflaeche unter 36 px (${kleineFlaechen})`);
  pruefe(fehler.length === 0, `${name}: keine Skriptfehler`);

  if (breite <= 430) {
    const eintraege = await page.$$eval("[data-handyleiste] button", (n) => n.length);
    pruefe(eintraege <= 5, `${name}: hoechstens fuenf Eintraege in der Handyleiste (${eintraege})`);
  }
  await ctx.close();
}

{
  const { ctx, page } = await seite(390, 844);
  await page.click('[data-tun="neue-fahrt"]');
  await page.waitForTimeout(300);
  let drin = true;
  let sichtbar = true;
  for (let i = 0; i < 20; i += 1) {
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
  pruefe(drin, "der Fokus bleibt im Fenster (20 Schritte)");
  pruefe(sichtbar, "und ist an jeder Stelle sichtbar");

  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  pruefe(!(await page.isVisible(".dialog-kasten")), "Escape schliesst das Fenster");
  await ctx.close();
}

/* ═══ 12. Keine Emojis als Bedienungssymbole ═════════════════════ */
console.log("\n── 12. Symbole und Schriften ──");
{
  const { ctx, page } = await seite();
  await rolleSetzen(page, "admin");
  const navText = await page.textContent("[data-navigation]");
  pruefe(!/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(navText),
    "keine Emojis in der Navigation");
  const symbole = await page.$$eval("[data-navigation] svg", (n) => n.length);
  pruefe(symbole >= 5, `stattdessen Strichsymbole (${symbole})`);
  const css = await readFile(join(PROBE, "probe.css"), "utf8");
  pruefe(!/fonts\.googleapis|fonts\.gstatic|cdn\./.test(css), "keine fremden Schrift- oder Symbolquellen");
  pruefe(/\/schriften\//.test(css), "die Schriften kommen aus dem eigenen Bestand");
  await ctx.close();
}

/* ═══ 13. Die Probe ist nicht in der Produktionsausgabe ══════════ */
console.log("\n── 13. Getrennt von der Produktionsausgabe ──");
{
  const uebernahme = await readFile(join(WURZEL, "tools/bestand-uebernehmen.mjs"), "utf8");
  pruefe(!/probe-betriebsportal/.test(uebernahme),
    "die Uebernahmeliste kennt den Probenordner nicht");
  let inAusgabe = true;
  try { await readFile(join(WURZEL, "dist-oeffentlich/probe-betriebsportal/index.html")); }
  catch { inAusgabe = false; }
  pruefe(!inAusgabe, "die Probe liegt nicht in dist-oeffentlich");
}

await browser.close();
server.close();

console.log("\n" + "═".repeat(59));
console.log(`Designprobe Betriebsportal: ${bestanden} bestanden, ${offen.length} nicht bestanden`);
if (offen.length) {
  console.log("\nNicht bestanden:");
  for (const n of offen) console.log("  - " + n);
}
console.log(`
ALLES SIMULIERT. Die Probe hat keine Datenquelle, keinen Upload, keinen
Versand und keine PAJ-Anfrage. Dieser Lauf sagt nichts ueber die
produktive Instanz aus.`);
console.log("═".repeat(59));
process.exit(offen.length ? 1 : 0);
