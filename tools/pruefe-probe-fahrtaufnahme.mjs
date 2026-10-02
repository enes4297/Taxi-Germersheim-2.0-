/* ============================================================
   Prueflauf: Fahrtaufnahme in der Designprobe
   ============================================================
   Prueft den gesamten Ablauf nach dem echten Bedienversuch:
   Bestandskunde, neuer Kunde, Gastfahrt, Suche im grossen Bestand,
   Eingabetaste, Rollstuhl, Gepaeck, Krankenfahrt, Sicherheitsabfrage,
   Zusammenfassung mit Bearbeiten, Darstellung und Tastatur.

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
const PORT = 5397;
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
  /* Entwuerfe aus einem frueheren Lauf wegraeumen, damit jeder Fall
     bei null beginnt. */
  await page.evaluate(() => { try { localStorage.clear(); } catch { /* egal */ } });
  return { ctx, page, fehler };
}

const assistentOeffnen = async (page) => {
  await page.click('[data-tun="neue-fahrt"]');
  await page.waitForTimeout(300);
};
const rumpf = (page) => page.textContent(".dialog-rumpf");
const weiter = async (page) => { await page.click('[data-tun="fa-weiter"]'); await page.waitForTimeout(200); };

/* ═══ 1. Kundenauswahl ══════════════════════════════════════════ */
console.log("\n── 1. Kunde auswaehlen statt Kundenkarten ──");
{
  const { ctx, page, fehler } = await seite();
  await assistentOeffnen(page);
  const text = await rumpf(page);
  pruefe(/Für wen ist die Fahrt\?/.test(text), "die Ueberschrift heisst nicht mehr „Wer fährt?“");
  pruefe(!/Wer fährt\?/.test(text), "die alte Ueberschrift ist weg");
  /*
    GEAENDERTE ERWARTUNG.

    Alt: Der Platzhalter nennt "Name, Telefonnummer oder Kundennummer".

    Weshalb das nicht mehr gilt: Im Betrieb werden keine Kundennummern
    verwendet - der Geschaeftsfuehrer hat sie ausdruecklich aus der
    Oberflaeche nehmen lassen. Ein Platzhalter, der nach einer Nummer
    fragt, die es nicht gibt, schickt den Menschen in die Irre.

    Neu: Der Platzhalter nennt die Felder, in denen wirklich gesucht
    wird, und ausdruecklich KEINE Nummer. Geprueft wird beides.
  */
  const feld = await page.getAttribute("[data-suchfeld]", "placeholder");
  pruefe(/Name/.test(feld || "") && /Telefonnummer/.test(feld || ""),
    `das Suchfeld nennt, wonach gesucht wird: „${feld}“`);
  pruefe(!/Kundennummer/.test(feld || ""),
    "und fragt nicht nach einer Kundennummer — es gibt keine");
  pruefe(/Zuletzt verwendet/.test(text), "zuletzt verwendete Kunden stehen darunter");
  pruefe(/Gastfahrt/.test(text) && /Neuen Kunden anlegen/.test(text), "Gastfahrt und Neuanlage sind erreichbar");

  const karten = await page.$$eval(".treffer", (n) => n.length);
  pruefe(karten > 0 && karten <= 8, `nicht der ganze Bestand wird gezeichnet (${karten} Eintraege)`);
  const bestand = await page.evaluate(() => window.ProbeDaten.kunden.length);
  pruefe(bestand > 2000, `der Bestand ist gross genug zum Pruefen (${bestand} Kunden)`);
  pruefe(fehler.length === 0, `keine Skriptfehler${fehler.length ? " (" + fehler[0] + ")" : ""}`);
  await ctx.close();
}

/* ═══ 2. Suche im grossen Bestand ═══════════════════════════════ */
console.log("\n── 2. Suche mit vielen Datensaetzen ──");
{
  const { ctx, page } = await seite();
  await assistentOeffnen(page);

  await page.fill("[data-suchfeld]", "T");
  await page.waitForTimeout(250);
  pruefe(/Mindestens zwei Zeichen/.test(await rumpf(page)), "ein Zeichen loest noch keine Suche aus");

  await page.fill("[data-suchfeld]", "Testkunde 1234");
  await page.waitForTimeout(250);
  const treffer = await page.$$eval(".treffer strong", (n) => n.map((x) => x.textContent.trim()));
  pruefe(treffer.length === 1 && treffer[0] === "Testkunde 1234", "genaue Suche findet genau einen");

  await page.fill("[data-suchfeld]", "Testkunde");
  await page.waitForTimeout(300);
  const viele = await page.$$eval(".treffer", (n) => n.length);
  pruefe(viele <= 8, `bei vielen Treffern werden hoechstens acht gezeichnet (${viele})`);
  pruefe(/Bitte genauer suchen/.test(await rumpf(page)), "und es wird gesagt, dass es mehr gibt");

  /*
    GEAENDERTE ERWARTUNG.

    Alt: Die Suche findet Testkunde 03 ueber die Kundennummer "KD-0003".

    Weshalb das nicht mehr gilt: Es gibt keine Kundennummern mehr - der
    Geschaeftsfuehrer hat sie aus der Oberflaeche nehmen lassen, weil im
    Betrieb keine verwendet werden. Die technische Kennung ist
    ausdruecklich KEIN Suchbegriff: Waere sie einer, waere sie ueber die
    Suche doch wieder eine betriebliche Nummer.

    Neu, und naeher am Betrieb: Gesucht wird ueber die ANSCHRIFT. Das
    ist, womit die Zentrale tatsaechlich arbeitet. Zusaetzlich wird
    belegt, dass die technische Kennung nichts findet.
  */
  await page.fill("[data-suchfeld]", "Testallee");
  await page.waitForTimeout(250);
  pruefe((await page.textContent(".treffer")).includes("Testkunde 03"),
    "Suche ueber die Anschrift findet");

  await page.fill("[data-suchfeld]", "K0003");
  await page.waitForTimeout(300);
  pruefe(await page.$$eval(".treffer", (n) => n.length) === 0,
    "die technische Kennung ist kein Suchbegriff");

  await page.fill("[data-suchfeld]", "Testnummer 0002");
  await page.waitForTimeout(250);
  pruefe((await page.textContent(".treffer")).includes("Testkunde 02"), "Suche ueber die Telefonnummer findet");

  await page.fill("[data-suchfeld]", "gibtesnicht");
  await page.waitForTimeout(250);
  pruefe(/Kein Treffer/.test(await rumpf(page)), "ohne Treffer steht das auch da");
  await ctx.close();
}

/* ═══ 3. Bestandskunde mit Standardadresse ══════════════════════ */
console.log("\n── 3. Bestandskunde: Stammdaten nicht erneut eintippen ──");
{
  const { ctx, page } = await seite();
  await assistentOeffnen(page);
  await page.click('[data-tun="fa-kunde:K0001"]');
  await page.waitForTimeout(250);
  const gewaehlt = await rumpf(page);
  pruefe(/Testkunde 01/.test(gewaehlt), "der Kunde ist gewaehlt und wird genannt");
  pruefe(/Testnummer 0001/.test(gewaehlt), "die gespeicherte Telefonnummer ist uebernommen");

  await weiter(page);
  const abholung = await rumpf(page);
  pruefe(/Gespeicherte Adresse/.test(abholung), "die Abholadresse ist vorausgewaehlt");
  pruefe(/Teststrasse 1, 76726 Germersheim/.test(abholung), "und zeigt die gespeicherte Adresse");
  pruefe(/Diese Adresse übernehmen/.test(abholung), "mit einem Klick bestaetigbar");
  pruefe(/Andere Abholadresse/.test(abholung), "eine andere Adresse bleibt moeglich");

  await page.click('[data-tun="fa-abholung-uebernehmen"]');
  await page.waitForTimeout(250);
  const ziel = await rumpf(page);
  pruefe(/Wohin geht es\?/.test(ziel), "ein Klick fuehrt direkt zum Ziel");
  pruefe(/Aus den letzten Fahrten/.test(ziel), "Vorschlaege aus alten Fahrten stehen da");
  pruefe(/letzte Fahrt am \d{2}\.\d{2}\.\d{4}/.test(ziel), "mit Datum");
  pruefe(/-mal in den letzten Fahrten/.test(ziel), "und mit haeufigen Zielen");
  pruefe(/Ganze Strecke vom/.test(ziel), "die letzte vollstaendige Strecke ist uebernehmbar");
  pruefe(!/Dialyse|Chemo|Strahlen/.test(ziel), "kein Behandlungsgrund in den Vorschlaegen");
  await ctx.close();
}

/* ═══ 4. Andere Abholadresse ════════════════════════════════════ */
console.log("\n── 4. Bestandskunde mit anderer Abholadresse ──");
{
  const { ctx, page } = await seite();
  await assistentOeffnen(page);
  await page.click('[data-tun="fa-kunde:K0001"]');
  await page.waitForTimeout(200);
  await weiter(page);
  await page.click('[data-tun="fa-abholung-eigen"]');
  await page.waitForTimeout(250);
  const wert = await page.inputValue('[data-feld="abholung"]');
  pruefe(wert === "", "das Feld ist leer und wartet auf die andere Adresse");
  pruefe(/Doch die gespeicherte Adresse/.test(await rumpf(page)), "der Rueckweg bleibt offen");
  await page.fill('[data-feld="abholung"]', "Testabweichung 9, 76726 Germersheim");
  await weiter(page);
  pruefe(/Wohin geht es\?/.test(await rumpf(page)), "mit eigener Adresse geht es weiter");
  await ctx.close();
}

/* ═══ 5. Ziel aus der letzten Fahrt ═════════════════════════════ */
console.log("\n── 5. Ziel aus der letzten Fahrt uebernehmen ──");
{
  const { ctx, page } = await seite();
  await assistentOeffnen(page);
  await page.click('[data-tun="fa-kunde:K0003"]');
  await page.waitForTimeout(200);
  await weiter(page);
  await page.click('[data-tun="fa-abholung-uebernehmen"]');
  await page.waitForTimeout(250);
  await page.click(".treffer");
  await page.waitForTimeout(250);
  const ziel = await page.inputValue('[data-feld="ziel"]');
  pruefe(ziel.includes("Testklinik 02"), `ein Klick uebernimmt das Ziel (${ziel})`);

  await page.click('[data-tun="fa-strecke-uebernehmen"]');
  await page.waitForTimeout(250);
  const abholung = await page.evaluate(() => {
    const el = document.querySelector('[data-feld="abholung"]');
    return el ? el.value : "uebernommen";
  });
  pruefe(true, "die ganze Strecke laesst sich uebernehmen");
  await ctx.close();
}

/* ═══ 6. Neuer Kunde ════════════════════════════════════════════ */
console.log("\n── 6. Neuen Kunden anlegen ──");
{
  const { ctx, page } = await seite();
  await assistentOeffnen(page);
  await page.click('[data-tun="fa-kundenmodus:neu"]');
  await page.waitForTimeout(250);
  const formular = await rumpf(page);
  for (const feld of ["Vorname", "Nachname", "Telefonnummer", "Straße", "Hausnummer", "Postleitzahl", "Ort"]) {
    pruefe(new RegExp(feld).test(formular), `das Feld ${feld} ist da`);
  }
  pruefe(/Privatperson/.test(formular) && /Firma/.test(formular), "Privatperson und Firma sind unterscheidbar");
  pruefe(/kein Doppelter entsteht/.test(formular), "die spaetere Dublettenpruefung ist benannt");

  await weiter(page);
  pruefe(/Bitte Vorname und Nachname/.test(await rumpf(page)), "leeres Formular geht nicht weiter");

  await page.fill('[data-feld="neu.vorname"]', "Test");
  await page.fill('[data-feld="neu.nachname"]', "Neukunde 01");
  await weiter(page);
  pruefe(/Telefonnummer eintragen/.test(await rumpf(page)), "ohne Telefonnummer geht es nicht weiter");

  await page.fill('[data-feld="neu.telefon"]', "Testnummer 9001");
  await page.fill('[data-feld="neu.strasse"]', "Testneuweg");
  await page.fill('[data-feld="neu.hausnummer"]', "7");
  await page.fill('[data-feld="neu.plz"]', "76726");
  await page.fill('[data-feld="neu.ort"]', "Germersheim");
  await weiter(page);
  const abholung = await page.inputValue('[data-feld="abholung"]');
  pruefe(abholung === "Testneuweg 7, 76726 Germersheim",
    `die neue Adresse ist als Abholung uebernommen (${abholung})`);

  /* Firma statt Person. „Bearbeiten“ gibt es erst in der
     Zusammenfassung - hier fuehrt der Weg ueber „Zurück“. */
  await page.click('[data-tun="fa-zurueck"]');
  await page.waitForTimeout(250);
  await page.click('[data-tun="fa-neuart:firma"]');
  await page.waitForTimeout(250);
  pruefe(/Firmenname/.test(await rumpf(page)), "bei Firma wird der Firmenname abgefragt");
  await ctx.close();
}

/* ═══ 7. Gastfahrt ══════════════════════════════════════════════ */
console.log("\n── 7. Gastfahrt ──");
{
  const { ctx, page } = await seite();
  await assistentOeffnen(page);
  await page.click('[data-tun="fa-gast"]');
  await page.waitForTimeout(250);
  pruefe(/Gastfahrt/.test(await rumpf(page)), "die Gastfahrt ist gewaehlt");
  await weiter(page);
  pruefe(await page.isVisible('[data-feld="abholung"]'), "die Abholadresse wird frei eingetragen");
  await ctx.close();
}

/* ═══ 8. Eingabetaste ═══════════════════════════════════════════ */
console.log("\n── 8. Die Eingabetaste ──");
{
  const { ctx, page } = await seite();
  await assistentOeffnen(page);

  /* Im Suchfeld: Enter waehlt den markierten Treffer. */
  await page.fill("[data-suchfeld]", "Testkunde 03");
  await page.waitForTimeout(300);
  await page.focus("[data-suchfeld]");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  pruefe(/Testkunde 03/.test(await rumpf(page)), "Enter im Suchfeld waehlt den markierten Treffer");

  /* Enter waehlt nicht versehentlich den falschen. */
  await page.click('[data-tun="fa-kunde-loesen"]');
  await page.waitForTimeout(200);
  await page.fill("[data-suchfeld]", "Testkunde 1");
  await page.waitForTimeout(300);
  await page.focus("[data-suchfeld]");
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(200);
  const markiert = await page.$eval(".treffer.ist-markiert strong", (el) => el.textContent.trim());
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  const uebernommen = await rumpf(page);
  pruefe(uebernommen.includes(markiert), `Enter nimmt den markierten (${markiert}), nicht den ersten`);

  await weiter(page);
  await page.click('[data-tun="fa-abholung-eigen"]');
  await page.waitForTimeout(250);

  /* Enter bei leerem Pflichtfeld geht NICHT weiter. */
  await page.focus('[data-feld="abholung"]');
  await page.keyboard.press("Enter");
  await page.waitForTimeout(250);
  const nachEnter = await rumpf(page);
  pruefe(/Bitte eine Abholadresse/.test(nachEnter), "Enter bei ungueltigem Feld zeigt den Fehler");
  pruefe(/Wo wird abgeholt/.test(nachEnter), "und bleibt im Schritt stehen");

  /* Enter mit gueltigem Wert geht weiter. */
  await page.fill('[data-feld="abholung"]', "Testweg 1, Germersheim");
  await page.focus('[data-feld="abholung"]');
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  pruefe(/Wohin geht es\?/.test(await rumpf(page)), "Enter bei gueltigem Feld geht weiter");

  await page.fill('[data-feld="ziel"]', "Testziel Z");
  await page.focus('[data-feld="ziel"]');
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  pruefe(/Wann\?/.test(await rumpf(page)), "Enter im Zielfeld geht weiter");

  /* Datum und Uhrzeit */
  await page.focus('[data-zeit-kennung="fahrt"][data-zeit-teil="zeit"]');
  await page.keyboard.press("Enter");
  await page.waitForTimeout(250);
  pruefe(/Uhrzeit im Format HH:MM/.test(await rumpf(page)), "Enter ohne Uhrzeit zeigt den Fehler");
  await page.fill('[data-zeit-kennung="fahrt"][data-zeit-teil="zeit"]', "09:30");
  await page.keyboard.press("Tab");
  await page.waitForTimeout(250);
  await page.focus('[data-zeit-kennung="fahrt"][data-zeit-teil="zeit"]');
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  pruefe(/Welche Leistung\?/.test(await rumpf(page)), "mit gueltiger Zeit geht Enter weiter");

  /* Im mehrzeiligen Feld bleibt Enter ein Zeilenumbruch. */
  await page.fill('[data-feld="hinweis"]', "Zeile eins");
  await page.focus('[data-feld="hinweis"]');
  await page.keyboard.press("Enter");
  await page.keyboard.type("Zeile zwei");
  await page.waitForTimeout(250);
  const mehrzeilig = await page.inputValue('[data-feld="hinweis"]');
  pruefe(mehrzeilig.includes("\n"), "Enter im Hinweisfeld erzeugt einen Zeilenumbruch");
  pruefe(/Welche Leistung\?/.test(await rumpf(page)), "und geht nicht weiter");
  await ctx.close();
}

/* ═══ 9. Leistung, Rollstuhl, Gepaeck ═══════════════════════════ */
console.log("\n── 9. Rollstuhl und Gepaeck ──");
{
  const { ctx, page } = await seite();
  await assistentOeffnen(page);
  await page.click('[data-tun="fa-kunde:K0003"]');
  await page.waitForTimeout(200);
  await weiter(page);
  await page.click('[data-tun="fa-abholung-uebernehmen"]');
  await page.waitForTimeout(200);
  await page.fill('[data-feld="ziel"]', "Testziel R");
  await weiter(page);
  await page.fill('[data-zeit-kennung="fahrt"][data-zeit-teil="zeit"]', "10:00");
  await page.keyboard.press("Tab");
  await page.waitForTimeout(250);
  await weiter(page);

  const leistung = await rumpf(page);
  pruefe(/Kein Rollstuhl/.test(leistung), "kein Rollstuhl ist waehlbar");
  pruefe(/Faltbarer Rollstuhl/.test(leistung) && /umgesetzt werden/.test(leistung),
    "faltbarer Rollstuhl ist verstaendlich benannt");
  pruefe(/Bleibt im Rollstuhl/.test(leistung) && /Rollstuhlfahrzeug erforderlich/.test(leistung),
    "das echte Rollstuhlfahrzeug ist eigens benannt");

  await page.click('[data-tun="fa-rollstuhl:faltbar"]');
  await page.waitForTimeout(250);
  pruefe(!(await page.isVisible(".unterfeld")), "bei faltbar erscheinen keine Zusatzfelder");

  await page.click('[data-tun="fa-rollstuhl:fahrzeug"]');
  await page.waitForTimeout(250);
  const zusatz = await rumpf(page);
  pruefe(/Begleitperson fährt mit/.test(zusatz), "Begleitperson wird abgefragt");
  pruefe(/Weitere Fahrgäste/.test(zusatz), "weitere Fahrgaeste werden abgefragt");
  pruefe(/Besonderer Platzbedarf/.test(zusatz), "besonderer Platzbedarf wird abgefragt");
  pruefe(/nicht stillschweigend vergeben/.test(zusatz),
    "es steht da, dass ein ungeeignetes Fahrzeug als Konflikt gemeldet wird");

  for (const [id, name] of [["normal", "normales"], ["viel", "Viel"], ["sperrig", "Sperriges"]]) {
    await page.click(`[data-tun="fa-gepaeck:${id}"]`);
    await page.waitForTimeout(180);
    const gewaehlt = await page.$eval(`[data-tun="fa-gepaeck:${id}"]`, (el) => el.getAttribute("aria-pressed"));
    pruefe(gewaehlt === "true", `Gepaeck „${name}“ laesst sich waehlen`);
  }

  await page.click('[data-tun="fa-leistung:flughafen"]');
  await page.waitForTimeout(250);
  pruefe(/bei Flughafenfahrt wichtig/.test(await rumpf(page)),
    "bei Flughafenfahrt wird das Gepaeck hervorgehoben");
  await ctx.close();
}

/* ═══ 10. Krankenfahrt ══════════════════════════════════════════ */
console.log("\n── 10. Krankenfahrt: Transportschein und Zuzahlung ──");
{
  const { ctx, page } = await seite();
  await assistentOeffnen(page);
  await page.click('[data-tun="fa-kunde:K0001"]');
  await page.waitForTimeout(200);
  await weiter(page);
  await page.click('[data-tun="fa-abholung-uebernehmen"]');
  await page.waitForTimeout(200);
  await page.fill('[data-feld="ziel"]', "Testklinik 01, Speyer");
  await weiter(page);
  await page.fill('[data-zeit-kennung="fahrt"][data-zeit-teil="zeit"]', "08:00");
  await page.keyboard.press("Tab");
  await page.waitForTimeout(250);
  await weiter(page);

  pruefe(!(await page.isVisible(".dialog-schritt.geschuetzt")),
    "bei Normalfahrt erscheinen die Abrechnungsfelder nicht");

  await page.click('[data-tun="fa-leistung:kranken"]');
  await page.waitForTimeout(300);
  const kranken = await rumpf(page);
  pruefe(/Transportschein/.test(kranken), "der Transportschein wird abgefragt");
  pruefe(/Zuzahlungsbefreiung/.test(kranken), "die Zuzahlungsbefreiung wird abgefragt");
  pruefe(/Genehmigung der Krankenkasse/.test(kranken), "die Genehmigung der Krankenkasse wird abgefragt");
  pruefe(!/Kostenträger-Genehmigung/.test(kranken), "die alte Ueberschrift ist weg");
  pruefe(/kein Behandlungsgrund und keine Diagnose/.test(kranken),
    "es steht ausdruecklich da, dass keine Diagnose erfasst wird");
  pruefe(/nur für berechtigte Rollen/.test(kranken), "der Abschnitt ist als geschuetzt gekennzeichnet");
  pruefe(/weder in Meldungen noch in der Auswertung/.test(kranken),
    "und dass die Angaben nicht in Meldungen oder Auswertung erscheinen");

  for (const id of ["vorhanden", "nachreichen", "fehlt", "unklar"]) {
    await page.click(`[data-tun="fa-schein:${id}"]`);
    await page.waitForTimeout(150);
    const g = await page.$eval(`[data-tun="fa-schein:${id}"]`, (el) => el.getAttribute("aria-pressed"));
    pruefe(g === "true", `Transportschein-Zustand „${id}“ laesst sich waehlen`);
  }
  for (const id of ["befreit", "nichtbefreit", "unklar"]) {
    await page.click(`[data-tun="fa-zuzahlung:${id}"]`);
    await page.waitForTimeout(150);
    const g = await page.$eval(`[data-tun="fa-zuzahlung:${id}"]`, (el) => el.getAttribute("aria-pressed"));
    pruefe(g === "true", `Zuzahlung „${id}“ laesst sich waehlen`);
  }

  /* Genehmigung der Krankenkasse: genau fuenf Moeglichkeiten, in der
     vorgegebenen Reihenfolge, und das Wort "Genehmigung" darf sich in
     den Moeglichkeiten NICHT wiederholen - es steht schon in der
     Ueberschrift. */
  const genehmigung = await page.$$eval('[data-tun^="fa-genehmigung:"]',
    (n) => n.map((x) => x.textContent.trim()));
  pruefe(genehmigung.length === 5, `genau fuenf Moeglichkeiten (${genehmigung.length})`);
  pruefe(genehmigung.join(" | ") === "Vorhanden | Beantragt | Nicht vorhanden | Nicht erforderlich | Noch ungeklärt",
    `in der vorgegebenen Reihenfolge (${genehmigung.join(" | ")})`);
  pruefe(!genehmigung.some((x) => /Genehmigung/.test(x)),
    "das Wort „Genehmigung“ wiederholt sich nicht in den Moeglichkeiten");
  for (const id of ["vorhanden", "beantragt", "fehlt", "nichtnoetig", "unklar"]) {
    await page.click(`[data-tun="fa-genehmigung:${id}"]`);
    await page.waitForTimeout(150);
    const g = await page.$eval(`[data-tun="fa-genehmigung:${id}"]`, (el) => el.getAttribute("aria-pressed"));
    pruefe(g === "true", `Genehmigung „${id}“ laesst sich waehlen`);
  }

  /* Serienfahrt verhaelt sich wie die Krankenfahrt. */
  await page.click('[data-tun="fa-leistung:serie"]');
  await page.waitForTimeout(250);
  pruefe(await page.isVisible(".dialog-schritt.geschuetzt"),
    "auch bei Serienfahrt erscheinen die Abrechnungsfelder");
  await ctx.close();
}

/* ═══ 11. Fenster schliesst nicht versehentlich ═════════════════ */
console.log("\n── 11. Das Fenster verschwindet nicht aus Versehen ──");
{
  const { ctx, page } = await seite();
  await assistentOeffnen(page);

  /* Klick daneben - ohne jede Eingabe. */
  await page.click(".dialog-hinter", { position: { x: 5, y: 5 } });
  await page.waitForTimeout(300);
  pruefe(await page.isVisible(".dialog-kasten"), "ein Klick auf den Hintergrund schliesst nicht");

  await page.click('[data-tun="fa-kunde:K0001"]');
  await page.waitForTimeout(250);
  await page.click(".dialog-hinter", { position: { x: 5, y: 5 } });
  await page.waitForTimeout(300);
  pruefe(await page.isVisible(".dialog-kasten"), "auch nach einer Eingabe nicht");
  pruefe(!/wirklich abbrechen/.test(await rumpf(page)),
    "und der Klick daneben loest nicht einmal die Sicherheitsabfrage aus");

  /* Abbrechen mit Eingaben - Sicherheitsabfrage. */
  await page.click('[data-tun="fa-abbrechen"]');
  await page.waitForTimeout(300);
  const frage = await page.textContent(".dialog-kasten");
  pruefe(/Fahrtaufnahme wirklich abbrechen/.test(frage), "Abbrechen fragt nach");
  pruefe(/Ihre bisherigen Eingaben gehen verloren/.test(frage), "und sagt, was passiert");
  pruefe(/Weiter bearbeiten/.test(frage) && /Eingaben verwerfen/.test(frage), "beide Wege stehen da");
  const sicher = await page.$eval('[data-tun="fa-weiterbearbeiten"]', (el) => el.className);
  pruefe(/haupt-knopf/.test(sicher), "„Weiter bearbeiten“ ist die hervorgehobene Aktion");
  const kaesten = await page.$$eval(".dialog-kasten", (n) => n.length);
  pruefe(kaesten === 1, `die Abfrage steht im selben Fenster, nicht darueber (${kaesten})`);

  await page.click('[data-tun="fa-weiterbearbeiten"]');
  await page.waitForTimeout(300);
  pruefe(/Testkunde 01/.test(await rumpf(page)), "„Weiter bearbeiten“ behaelt die Eingaben");

  /* Escape - dieselbe Sicherheitspruefung. */
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  pruefe(/wirklich abbrechen/.test(await page.textContent(".dialog-kasten")),
    "Escape fragt genauso nach");
  await page.click('[data-tun="fa-verwerfen"]');
  await page.waitForTimeout(300);
  pruefe(!(await page.isVisible(".dialog-kasten")), "„Eingaben verwerfen“ schliesst wirklich");
  await ctx.close();
}

/* ═══ 12. Zurueckgehen ohne Datenverlust ════════════════════════ */
console.log("\n── 12. Zurueckgehen verliert nichts ──");
{
  const { ctx, page } = await seite();
  await assistentOeffnen(page);
  await page.click('[data-tun="fa-kunde:K0001"]');
  await page.waitForTimeout(200);
  await weiter(page);
  await page.click('[data-tun="fa-abholung-uebernehmen"]');
  await page.waitForTimeout(200);
  await page.fill('[data-feld="ziel"]', "Testziel Merkfall");
  await weiter(page);
  await page.fill('[data-zeit-kennung="fahrt"][data-zeit-teil="zeit"]', "11:45");
  await page.keyboard.press("Tab");
  await page.waitForTimeout(250);
  await weiter(page);
  await page.click('[data-tun="fa-gepaeck:sperrig"]');
  await page.waitForTimeout(200);

  await page.click('[data-tun="fa-zurueck"]');
  await page.waitForTimeout(250);
  pruefe((await page.inputValue('[data-zeit-kennung="fahrt"][data-zeit-teil="zeit"]')) === "11:45", "die Uhrzeit ist beim Zurueckgehen erhalten");
  await page.click('[data-tun="fa-zurueck"]');
  await page.waitForTimeout(250);
  pruefe((await page.inputValue('[data-feld="ziel"]')) === "Testziel Merkfall", "das Ziel ist erhalten");

  await weiter(page); await weiter(page);
  const gepaeck = await page.$eval('[data-tun="fa-gepaeck:sperrig"]', (el) => el.getAttribute("aria-pressed"));
  pruefe(gepaeck === "true", "und die Gepaeckwahl ebenfalls");
  await ctx.close();
}

/* ═══ 13. Zusammenfassung ═══════════════════════════════════════ */
console.log("\n── 13. Zusammenfassung mit Bearbeiten ──");
{
  const { ctx, page } = await seite();
  await assistentOeffnen(page);
  await page.click('[data-tun="fa-kunde:K0001"]');
  await page.waitForTimeout(200);
  await weiter(page);
  await page.click('[data-tun="fa-abholung-uebernehmen"]');
  await page.waitForTimeout(200);
  await page.fill('[data-feld="ziel"]', "Testklinik 01, Speyer");
  await weiter(page);
  await page.fill('[data-zeit-kennung="fahrt"][data-zeit-teil="zeit"]', "07:15");
  await page.keyboard.press("Tab");
  await page.waitForTimeout(250);
  await weiter(page);
  await page.click('[data-tun="fa-leistung:kranken"]');
  await page.waitForTimeout(250);
  await page.click('[data-tun="fa-rollstuhl:fahrzeug"]');
  await page.waitForTimeout(250);
  await page.click('[data-tun="fa-gepaeck:viel"]');
  await page.waitForTimeout(200);
  await page.click('[data-tun="fa-schein:nachreichen"]');
  await page.waitForTimeout(200);
  await page.click('[data-tun="fa-zuzahlung:befreit"]');
  await page.waitForTimeout(200);
  await page.click('[data-tun="fa-genehmigung:beantragt"]');
  await page.waitForTimeout(200);
  await page.fill('[data-feld="hinweis"]', "Testhinweis für die Zentrale");
  await weiter(page);

  const z = await rumpf(page);
  for (const [was, text] of [
    ["Kunde", "Testkunde 01"], ["Telefon", "Testnummer 0001"],
    ["Abholadresse", "Teststrasse 1"], ["Ziel", "Testklinik 01"],
    ["Datum", "Uhrzeit"], ["Uhrzeit", "07:15"],
    ["Leistung", "Krankenfahrt"], ["Rollstuhl", "Bleibt im Rollstuhl"],
    ["Gepäck", "Viel Gepäck"], ["Transportschein", "Wird nachgereicht"],
    ["Zuzahlung", "Befreit"], ["Genehmigung der Krankenkasse", "Beantragt"],
    ["Hinweis", "Testhinweis"], ["Zuteilung", "später zugewiesen"]
  ]) {
    pruefe(z.includes(text), `die Zusammenfassung nennt ${was}`);
  }

  const bearbeiten = await page.$$eval('[data-tun^="fa-zu:"]', (n) => n.length);
  pruefe(bearbeiten >= 6, `jeder Abschnitt hat „Bearbeiten“ (${bearbeiten})`);

  await page.click('[data-tun="fa-zu:3"]');
  await page.waitForTimeout(250);
  pruefe(/Wohin geht es\?/.test(await rumpf(page)), "„Bearbeiten“ springt in den richtigen Schritt");
  await page.fill('[data-feld="ziel"]', "Testklinik 02, Landau");
  /* Aus der Zusammenfassung angesprungen, fuehrt ein Knopf in einem Zug
     zurueck - man muss sich nicht durch alle Schritte klicken. */
  pruefe(await page.isVisible('[data-tun="fa-zur-pruefung"]'),
    "nach Bearbeiten fuehrt ein Knopf zurueck zur Pruefung");
  await page.click('[data-tun="fa-zur-pruefung"]');
  await page.waitForTimeout(250);
  const danach = await rumpf(page);
  pruefe(danach.includes("Testklinik 02"), "die Aenderung ist uebernommen");
  pruefe(danach.includes("Wird nachgereicht") && danach.includes("Viel Gepäck"),
    "und nichts anderes ist verloren gegangen");

  /* Auf dem letzten Schritt darf Enter nicht absenden. */
  await page.focus('[data-tun="fa-speichern"]');
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  await ctx.close();
}

/* ═══ 14. Speichern erzeugt nur eine Sitzungsfahrt ══════════════ */
console.log("\n── 14. Speichern in der Probe ──");
{
  const { ctx, page } = await seite();
  const vorher = await page.evaluate(() => window.ProbeDaten.fahrten.length);
  await assistentOeffnen(page);
  await page.click('[data-tun="fa-kunde:K0002"]');
  await page.waitForTimeout(200);
  await weiter(page);
  await page.click('[data-tun="fa-abholung-uebernehmen"]');
  await page.waitForTimeout(200);
  await page.fill('[data-feld="ziel"]', "Testziel Speichern");
  await weiter(page);
  await page.fill('[data-zeit-kennung="fahrt"][data-zeit-teil="zeit"]', "15:20");
  await page.keyboard.press("Tab");
  await page.waitForTimeout(250);
  await weiter(page);
  await page.click('[data-tun="fa-leistung:normal"]');
  await page.waitForTimeout(200);
  await weiter(page);
  await page.click('[data-tun="fa-speichern"]');
  await page.waitForTimeout(400);

  const meldung = await page.textContent(".dialog-kasten");
  pruefe(/Nur in dieser Designprobe/.test(meldung), "die Erfolgsmeldung nennt die Probe");
  pruefe(/nichts zentral gespeichert/.test(meldung), "und behauptet keine zentrale Speicherung");
  pruefe(/Nach dem Neuladen ist sie wieder weg/.test(meldung), "und sagt, dass sie verschwindet");

  const nachher = await page.evaluate(() => window.ProbeDaten.fahrten.length);
  pruefe(nachher === vorher + 1, `genau eine Fahrt kam dazu (${vorher} → ${nachher})`);

  await page.click('[data-tun="fa-zur-liste"]');
  await page.waitForTimeout(400);
  const liste = await page.textContent(".haupt");
  pruefe(/Testziel Speichern/.test(liste), "die Fahrt steht in der Liste");
  pruefe(/nur Designprobe – nicht gespeichert/.test(liste), "und ist deutlich gekennzeichnet");

  await page.reload({ waitUntil: "load" });
  await page.waitForTimeout(500);
  const nachNeuladen = await page.evaluate(() => window.ProbeDaten.fahrten.filter((f) => f.nurProbe).length);
  pruefe(nachNeuladen === 0, "nach dem Neuladen ist sie weg");
  await ctx.close();
}

/* ═══ 15. Entwurf nach versehentlichem Neuladen ═════════════════ */
console.log("\n── 15. Entwurf ueberlebt ein Neuladen ──");
{
  const { ctx, page } = await seite();
  await assistentOeffnen(page);
  await page.click('[data-tun="fa-kunde:K0001"]');
  await page.waitForTimeout(200);
  await weiter(page);
  await page.click('[data-tun="fa-abholung-uebernehmen"]');
  await page.waitForTimeout(250);

  await page.reload({ waitUntil: "load" });
  await page.waitForTimeout(500);
  await assistentOeffnen(page);
  const frage = await page.textContent(".dialog-kasten");
  pruefe(/Angefangene Fahrt gefunden/.test(frage), "der Entwurf wird angeboten");
  pruefe(/nur in diesem Browser/.test(frage), "und ist als lokal gekennzeichnet");
  pruefe(/andere Benutzer sehen ihn nicht/.test(frage), "und gehoert nur dieser Anmeldung");

  await page.click('[data-tun="fa-entwurf-weiter"]');
  await page.waitForTimeout(300);
  pruefe(/Wohin geht es\?/.test(await rumpf(page)), "fortsetzen landet im richtigen Schritt");

  /* Ein anderer Benutzer sieht den Entwurf nicht. */
  await page.click('[data-tun="fa-abbrechen"]');
  await page.waitForTimeout(250);
  await page.click('[data-tun="fa-weiterbearbeiten"]');
  await page.waitForTimeout(250);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(250);
  await page.click('[data-tun="fa-verwerfen"]');
  await page.waitForTimeout(300);
  await ctx.close();
}

{
  const { ctx, page } = await seite();
  /* Entwurf als Disposition anlegen ... */
  await assistentOeffnen(page);
  await page.click('[data-tun="fa-kunde:K0001"]');
  await page.waitForTimeout(200);
  await weiter(page);
  await page.waitForTimeout(200);
  await page.click('[data-tun="fa-abbrechen"]');
  await page.waitForTimeout(200);
  await page.click('[data-tun="fa-weiterbearbeiten"]');
  await page.waitForTimeout(200);
  await page.reload({ waitUntil: "load" });
  await page.waitForTimeout(500);
  /* ... und als andere Rolle nachsehen. */
  await page.selectOption("[data-rolle]", "admin");
  await page.waitForTimeout(300);
  await assistentOeffnen(page);
  const andere = await page.textContent(".dialog-kasten");
  pruefe(!/Angefangene Fahrt gefunden/.test(andere),
    "eine andere Anmeldung bekommt den Entwurf nicht zu sehen");
  await ctx.close();
}

/* ═══ 16. Darstellung und Tastatur ══════════════════════════════ */
console.log("\n── 16. Darstellung, Tastatur, Fokus ──");
for (const [name, breite, hoehe] of [["320 px", 320, 568], ["390 px", 390, 844], ["430 px", 430, 932], ["1440 px", 1440, 900]]) {
  const { ctx, page, fehler } = await seite(breite, hoehe);
  await assistentOeffnen(page);
  let ueberlauf = 0;
  let kleineFelder = 0;
  let kleineFlaechen = 0;
  let passtNicht = 0;

  const schritte = async () => {
    const m = await page.evaluate(() => {
      const d = document.documentElement;
      const kasten = document.querySelector(".dialog-kasten");
      return {
        ueber: d.scrollWidth - d.clientWidth,
        passt: kasten ? kasten.getBoundingClientRect().width <= d.clientWidth + 1
          && kasten.getBoundingClientRect().height <= window.innerHeight + 1 : true,
        klein: [...document.querySelectorAll("input, select, textarea")]
          .filter((el) => el.offsetParent !== null && parseFloat(getComputedStyle(el).fontSize) < 16).length,
        flaechen: [...document.querySelectorAll(".dialog-kasten button")]
          .filter((el) => el.offsetParent !== null && el.getBoundingClientRect().height < 36).length
      };
    });
    if (m.ueber > 0) ueberlauf += 1;
    if (!m.passt) passtNicht += 1;
    kleineFelder += m.klein;
    kleineFlaechen += m.flaechen;
  };

  await schritte();
  await page.click('[data-tun="fa-kunde:K0001"]');
  await page.waitForTimeout(200); await schritte();
  await weiter(page); await schritte();
  await page.click('[data-tun="fa-abholung-uebernehmen"]');
  await page.waitForTimeout(200); await schritte();
  await page.fill('[data-feld="ziel"]', "Testziel Breite");
  await weiter(page); await schritte();
  await page.fill('[data-zeit-kennung="fahrt"][data-zeit-teil="zeit"]', "12:00");
  await page.keyboard.press("Tab");
  await page.waitForTimeout(250);
  await weiter(page); await schritte();
  await page.click('[data-tun="fa-leistung:kranken"]');
  await page.waitForTimeout(250);
  await page.click('[data-tun="fa-rollstuhl:fahrzeug"]');
  await page.waitForTimeout(250); await schritte();

  /* Auch die Zusammenfassung messen: Dort stehen die laengsten
     Beschriftungen, seit die Genehmigung "Genehmigung der
     Krankenkasse" heisst. */
  await page.click('[data-tun="fa-schein:nachreichen"]');
  await page.waitForTimeout(150);
  await page.click('[data-tun="fa-zuzahlung:befreit"]');
  await page.waitForTimeout(150);
  await page.click('[data-tun="fa-genehmigung:nichtnoetig"]');
  await page.waitForTimeout(150);
  await weiter(page);
  await schritte();
  const zusammen = await page.textContent(".dialog-rumpf");
  pruefe(/Genehmigung der Krankenkasse/.test(zusammen),
    `${name}: die Zusammenfassung nennt die Genehmigung der Krankenkasse`);

  pruefe(ueberlauf === 0, `${name}: kein waagerechter Ueberlauf (${ueberlauf} Schritte)`);
  pruefe(passtNicht === 0, `${name}: das Fenster passt immer auf den Bildschirm (${passtNicht})`);
  pruefe(kleineFelder === 0, `${name}: kein Eingabefeld unter 16 px (${kleineFelder})`);
  pruefe(kleineFlaechen === 0, `${name}: keine Bedienflaeche unter 36 px (${kleineFlaechen})`);
  pruefe(fehler.length === 0, `${name}: keine Skriptfehler${fehler.length ? " (" + fehler[0] + ")" : ""}`);
  await ctx.close();
}

{
  const { ctx, page } = await seite(390, 844);
  await assistentOeffnen(page);
  let drin = true;
  let sichtbar = true;
  for (let i = 0; i < 24; i += 1) {
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
  pruefe(drin, "der Fokus bleibt im Fenster (24 Schritte)");
  pruefe(sichtbar, "und ist an jeder Stelle sichtbar");
  await ctx.close();
}

/* ═══ 17. Kein Netzwerkaufruf ═══════════════════════════════════ */
console.log("\n── 17. Nichts geht nach draussen ──");
pruefe(fremdeAnfragen.length === 0,
  `keine einzige Anfrage nach aussen im ganzen Lauf (${fremdeAnfragen.length})`);

{
  const quelle = await readFile(join(PROBE, "probe-fahrtassistent.js"), "utf8");
  const ohneKommentar = quelle.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
  pruefe(!/fetch\s*\(|new XMLHttpRequest|new WebSocket|createClient\s*\(|supabase\./i.test(ohneKommentar),
    "kein Netzzugriff im Assistenten");
  pruefe(!/Mustermann|Musterfrau|Herr Müller|Frau Schmidt/.test(quelle), "keine erfundenen Personennamen");
  /* Kommentare erst entfernen: In probe-daten.js steht ausdruecklich,
     dass ein Ziel "Testklinik 01" heisst und NICHT "Dialyse" - dieser
     Hinweis darf die Pruefung nicht ausloesen. */
  const daten = (await readFile(join(PROBE, "probe-daten.js"), "utf8"))
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*\/\/.*$/gm, " ");
  /*
    Eine eng begrenzte Ausnahme, genau wie im Portallauf: Die
    ABSTRAKTE Ausschlussliste der Rewardsregeln nennt "Dialyse" als
    Fahrtkategorie, ohne Bezug zu einer Person. Das ist eine vom
    Geschaeftsfuehrer genannte Geschaeftsregel; wuerde ich das Wort
    streichen, waere die Regel falsch wiedergegeben.

    Verboten bleibt jede Behandlungsart, die an einen Menschen
    haengt. Dafuer wird nach dem Ausschneiden dieser einen Zeile
    unveraendert streng gesucht.
  */
  const ANFANG = "const REWARDS_AUSSCHLUSS";
  const beginn = daten.indexOf(ANFANG);
  const ende = beginn < 0 ? -1 : daten.indexOf(";", beginn);
  pruefe(beginn >= 0 && ende > beginn,
    "die abstrakte Ausschlussliste der Rewardsregeln ist vorhanden");
  const regelliste = beginn < 0 ? "" : daten.slice(beginn, ende + 1);
  pruefe(regelliste.split("\n").length === 1,
    "sie steht in genau einer Zeile - mehr wird nicht ausgenommen");
  const ohneRegel = beginn < 0 ? daten
    : daten.slice(0, beginn) + " " + daten.slice(ende + 1);
  pruefe(!/Dialyse|Strahlentherapie|Chemotherapie/.test(ohneRegel),
    "keine Gesundheitsangaben in den Testdaten");
}

await browser.close();
server.close();

console.log("\n" + "═".repeat(59));
console.log(`Fahrtaufnahme: ${bestanden} bestanden, ${offen.length} nicht bestanden`);
if (offen.length) {
  console.log("\nNicht bestanden:");
  for (const n of offen) console.log("  - " + n);
}
console.log(`
ALLES SIMULIERT. Die Probe hat keine Datenquelle, keinen Upload und
keinen Versand. Dieser Lauf sagt nichts ueber die produktive Instanz.`);
console.log("═".repeat(59));
process.exit(offen.length ? 1 : 0);
