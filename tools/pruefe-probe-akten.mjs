/* ============================================================
   Prueflauf: Kunden, Personal, Finanzen, Rewards - bedienbar
   ============================================================
   Gemessene Ausgangsfehler des manuellen Rundgangs:

   8.  Kundenbereich: Eingabe filterte nicht, kein Suchknopf, Enter ohne
       Wirkung, Zeilen leuchteten ohne anklickbar zu sein, kein Knopf
       "Neuer Kunde". Faktisch eine unbewegliche Anzeige.
   9.  Personal: Mitarbeiterzeilen nicht anklickbar, keine Akte.
   10. Finanzen: Rechnungszeilen oeffneten nichts, keine
       Buchhaltungsaktionen.
   12. Rewards: Kundenzeilen nicht anklickbar, Regelwerk unvollstaendig.
   16. Ueberall dasselbe: Hover-Optik ohne Bedienbarkeit.

   Die Pruefungen gehen den Weg ueber die OBERFLAECHE. Zusaetzlich
   werden kritische Aktionen direkt aufgerufen, um die
   Berechtigungspruefung in der Aktion nachzuweisen.

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
const PORT = 5373;
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

const geh = async (page, b) => {
  if (await page.evaluate(() => window.ProbeRahmen.dialogOffen())) {
    await page.evaluate(() => window.ProbeRahmen.dialogSchliessen(true));
    await page.waitForTimeout(250);
  }
  await page.evaluate((x) => window.ProbeRahmen.geheZu(x), b);
  await page.waitForTimeout(450);
};
const kurz = async (page, wahl) => (await page.textContent(wahl)).replace(/\s+/g, " ").trim();
const dialogOffen = (page) => page.evaluate(() => window.ProbeRahmen.dialogOffen());
const zeilen = (page) => page.$$eval(".aktenzeile[data-tun]", (n) => n.map((x) => x.dataset.tun));

/* ═══ 1. Die globale Interaktionsregel ══════════════════════════ */
console.log("\n── 1. Hover-Optik nur bei echter Bedienbarkeit ──");
{
  const { ctx, page, fehler } = await seite("admin");
  for (const b of ["kunden", "personal", "finanzen", "rewards"]) {
    await geh(page, b);
    /* Jede Zeile mit Klickoptik muss ein BUTTON sein. */
    const falsch = await page.$$eval(".aktenliste > *", (nodes) => nodes
      .filter((x) => !x.classList.contains("az-kopf"))
      .filter((x) => {
        const cs = getComputedStyle(x);
        const klickbar = cs.cursor === "pointer";
        const istKnopf = x.tagName === "BUTTON" || x.tagName === "A";
        /* Reine Anzeigezeilen duerfen weder Zeiger noch Aktion haben. */
        if (x.classList.contains("ist-anzeige")) return klickbar || x.dataset.tun;
        return klickbar && !istKnopf;
      }).length);
    pruefe(falsch === 0, `${b}: keine Zeile mit Klickoptik ohne Schaltfläche (${falsch})`);

    /* Und jede Schaltflaeche ist per Tastatur erreichbar und beschriftet. */
    const maengel = await page.$$eval(".aktenzeile[data-tun]", (nodes) => nodes.filter((x) =>
      x.tagName !== "BUTTON" || !x.getAttribute("aria-label")).length);
    pruefe(maengel === 0, `${b}: jede Zeile ist Schaltfläche mit Beschriftung (${maengel} Mängel)`);
  }
  pruefe(fehler.length === 0, `keine Skriptfehler${fehler.length ? " (" + fehler[0] + ")" : ""}`);
  await ctx.close();
}

/* ═══ 2. Kunden: Suche, Enter, Akte ═════════════════════════════ */
console.log("\n── 2. Der Kundenbereich ist bedienbar ──");
{
  const { ctx, page } = await seite("admin");
  await geh(page, "kunden");

  pruefe(Boolean(await page.$("[data-kundensuche]")), "es gibt ein Suchfeld");

  /* Die Zwei-Zeichen-Schwelle. Sie war nirgends gesichert und ist mir
     beim Ausbau der Suche verlorengegangen - deshalb steht sie jetzt
     hier. */
  await page.fill("[data-kundensuche]", "T");
  await page.waitForTimeout(300);
  {
    const txt = await page.evaluate(() => document.querySelector(".haupt").textContent);
    pruefe(/Mindestens zwei Zeichen/.test(txt),
      "ein Zeichen loest noch keine Suche aus");
    pruefe(!(await page.$(".haupt .aktenzeile")),
      "und es wird keine einzige Zeile gezeigt");
  }
  await page.fill("[data-kundensuche]", "");
  await page.waitForTimeout(250);
  pruefe(Boolean(await page.$('[data-tun="ak-kunde-neu"]')), "und einen Knopf „Neuen Kunden anlegen“");
  const vorher = (await zeilen(page)).length;
  pruefe(vorher > 0, `die Liste hat bedienbare Zeilen (${vorher})`);

  /* Filtern beim Tippen, ab zwei Zeichen - dieselbe Schwelle wie im
     Fahrtassistenten. Bei einem Zeichen traefe die Suche einen grossen
     Teil des Bestandes; das waere keine Suche. */
  await page.fill("[data-kundensuche]", "Testallee");
  await page.waitForTimeout(500);
  const nachOrt = await zeilen(page);
  pruefe(nachOrt.length < vorher && nachOrt.length > 0,
    `die Suche filtert nach der Anschrift (${nachOrt.length})`);
  await page.fill("[data-kundensuche]", "KD-0003");
  await page.waitForTimeout(500);
  pruefe((await zeilen(page)).length === 1, "und nach der Kundennummer");
  await page.fill("[data-kundensuche]", "Testnummer 0002");
  await page.waitForTimeout(500);
  pruefe((await zeilen(page)).length === 1, "und nach der Telefonnummer");
  await page.fill("[data-kundensuche]", "testkunde03@example.invalid");
  await page.waitForTimeout(500);
  pruefe((await zeilen(page)).length === 1, "und nach der E-Mail");

  /* Der Schreibzeiger bleibt im Feld. */
  const aktiv = await page.evaluate(() =>
    document.activeElement && document.activeElement.hasAttribute("data-kundensuche"));
  pruefe(aktiv, "der Schreibfokus bleibt im Suchfeld");

  /* Direkt nach dem Tippen anklicken - der Befund aus dem Rundgang. */
  await page.fill("[data-kundensuche]", "Testkunde 03");
  await page.waitForTimeout(450);
  await page.click(".aktenzeile[data-tun]");
  await page.waitForTimeout(600);
  pruefe(await dialogOffen(page), "ein Klick direkt nach dem Tippen öffnet die Akte");

  /* Enter bei genau einem Treffer. */
  await page.evaluate(() => window.ProbeRahmen.dialogSchliessen(true));
  await page.waitForTimeout(300);
  await page.fill("[data-kundensuche]", "KD-0002");
  await page.waitForTimeout(450);
  await page.focus("[data-kundensuche]");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(600);
  pruefe(await dialogOffen(page), "Enter öffnet bei genau einem Treffer");
  pruefe(/Testkunde 02/.test(await kurz(page, ".dialog-kopf h2")), "und zwar den richtigen");

  /* Bei mehreren Treffern tut Enter nichts. */
  await page.evaluate(() => window.ProbeRahmen.dialogSchliessen(true));
  await page.waitForTimeout(300);
  await page.fill("[data-kundensuche]", "Testkunde");
  await page.waitForTimeout(450);
  await page.focus("[data-kundensuche]");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(500);
  pruefe(!(await dialogOffen(page)), "bei mehreren Treffern öffnet Enter nichts — geraten wird nicht");

  /* Kein Treffer. */
  await page.fill("[data-kundensuche]", "zzz-gibtsnicht");
  await page.waitForTimeout(500);
  const leer = await kurz(page, ".haupt");
  pruefe(/Kein Kunde gefunden/.test(leer), "kein Treffer wird ehrlich gesagt");
  pruefe(/Name, Telefonnummer, Kundennummer, Firma, Anschrift und E-Mail/.test(leer),
    "und wo gesucht wurde");
  pruefe((await zeilen(page)).length === 0, "es wird keine Zeile gezeigt");

  /* Tastatur: die Zeile ist erreichbar. */
  await page.fill("[data-kundensuche]", "KD-0001");
  await page.waitForTimeout(450);
  await page.focus("[data-kundensuche]");
  await page.keyboard.press("Tab");
  const istZeile = await page.evaluate(() =>
    document.activeElement && document.activeElement.classList.contains("aktenzeile"));
  pruefe(istZeile, "mit Tab erreicht man die Zeile");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(600);
  pruefe(await dialogOffen(page), "Enter auf der Zeile öffnet die Akte");
  await ctx.close();
}

/* ═══ 3. Die Kundenakte ═════════════════════════════════════════ */
console.log("\n── 3. Was in der Kundenakte steht ──");
{
  const { ctx, page } = await seite("admin");
  await geh(page, "kunden");
  await page.click('.aktenzeile[data-tun="ak-kunde:K0003"]');
  await page.waitForTimeout(600);
  const a = await kurz(page, ".dialog-kasten");

  for (const [was, muster] of [
    ["Name", /Testkunde 03/], ["Kundennummer", /KD-0003/], ["Kennung", /K0003/],
    ["Telefon", /Testnummer 0003/], ["E-Mail", /testkunde03@example\.invalid/],
    ["Anschrift", /Testallee 4a, 76756 Bellheim/],
    ["Kundenkonto", /Kundenkonto/], ["Fahrten", /Fahrten insgesamt/],
    ["betrieblichen Hinweis", /Rollstuhlfahrzeug erforderlich/],
    ["offene Fahrten", /Offene Fahrten/], ["vergangene Fahrten", /Vergangene Fahrten/],
    ["häufige Ziele", /Häufige Ziele/], ["Änderungsverlauf", /Änderungsverlauf/]
  ]) {
    pruefe(muster.test(a), `die Akte nennt ${was}`);
  }
  pruefe(/Rechnungen/.test(a), "Rechnungen, weil die Rolle finance.read hat");
  pruefe(/Rewards-Konto/.test(a), "und das Rewards-Konto");
  pruefe(/keine Diagnose und kein medizinischer Freitext/.test(a),
    "und sagt, was dort nicht hineingehört");
  pruefe(/nicht vorhanden — es wird nichts erfunden/.test(a),
    "sowie was die Probe nicht hat");
  pruefe(Boolean(await page.$('[data-tun="ak-kunde-fahrt:K0003"]')),
    "es gibt „Neue Fahrt für diesen Kunden“");

  /* Die Fahrt uebernimmt die gespeicherte Abholadresse. */
  await page.click('[data-tun="ak-kunde-fahrt:K0003"]');
  await page.waitForTimeout(700);
  const fa = await kurz(page, ".dialog-kasten");
  pruefe(/Testkunde 03/.test(fa), "der Assistent kennt den Kunden schon");
  pruefe(/Testallee 4a/.test(fa), "und seine gespeicherte Abholadresse");
  await ctx.close();

  /* Ohne customers.read keine Akte - auch nicht direkt. */
  const d = await seite("dispatcher");
  const sichtbar = await d.page.evaluate(() =>
    window.ProbeRahmen.BEREICHE.filter((x) => window.ProbeRahmen.darf(x.braucht)).map((x) => x.id));
  pruefe(!sichtbar.includes("kunden"), "die Disposition sieht den Kundenbereich nicht");
  await d.page.evaluate(() => window.ProbeAkten.tun("ak-kunde", "K0003"));
  await d.page.waitForTimeout(400);
  pruefe(!(await dialogOffen(d.page)), "und der direkte Aufruf öffnet ihr keine Akte");
  await d.ctx.close();
}

/* ═══ 4. Neuanlage - ein Bestand ════════════════════════════════ */
console.log("\n── 4. Neuanlage und ein gemeinsamer Bestand ──");
{
  const { ctx, page } = await seite("admin");
  await geh(page, "kunden");
  const vorher = await page.evaluate(() => window.ProbeDaten.kunden.length);

  await page.click('[data-tun="ak-kunde-neu"]');
  await page.waitForTimeout(500);
  await page.click('[data-tun="ak-kunde-weiter"]');
  await page.waitForTimeout(400);
  pruefe(Boolean(await page.$(".feldfehler")), "ohne Pflichtfelder geht es nicht weiter");
  const f = await kurz(page, ".feldfehler");
  pruefe(/Name oder Firma/.test(f) && /Telefonnummer/.test(f),
    `die Pflichtfelder sind benannt (${f})`);
  pruefe(await page.evaluate(() => window.ProbeDaten.kunden.length) === vorher,
    "und es entsteht kein Kunde");

  await page.fill('[data-kn="name"]', "Testkunde 77");
  await page.fill('[data-kn="telefon"]', "Testnummer 0077");
  await page.fill('[data-kn="ort"]', "Germersheim");
  await page.click('[data-tun="ak-kunde-weiter"]');
  await page.waitForTimeout(500);
  const p2 = await kurz(page, ".dialog-kasten");
  pruefe(/Letzte Prüfung/.test(p2), "es gibt eine Zusammenfassung");
  pruefe(/Testkunde 77/.test(p2) && /Testnummer 0077/.test(p2), "mit den Angaben");
  pruefe(/Angelegt von/.test(p2), "und dem handelnden Konto");
  pruefe(Boolean(await page.$('[data-tun="ak-kunde-zurueck"]')), "„Zurück und ändern“ ist da");
  pruefe(await page.evaluate(() => window.ProbeDaten.kunden.length) === vorher,
    "bis hierhin ist noch nichts gespeichert");

  await page.click('[data-tun="ak-kunde-ja"]');
  await page.waitForTimeout(700);
  pruefe(await page.evaluate(() => window.ProbeDaten.kunden.length) === vorher + 1,
    "mit „Verbindlich anlegen“ entsteht genau einer");
  pruefe(/Testkunde 77/.test(await kurz(page, ".dialog-kopf h2")),
    "und die neue Akte öffnet sich direkt");
  const neu = await page.evaluate(() =>
    window.ProbeDaten.kunden.find((k) => k.name === "Testkunde 77"));
  pruefe(Boolean(neu.kundennummer), `er hat eine Kundennummer (${neu.kundennummer})`);
  pruefe(neu.quelle === "Kundenbereich", "die Herkunft ist festgehalten");
  pruefe(neu.verlauf.length === 1, "und ein Verlaufseintrag entsteht");
  pruefe(neu.nurProbe === true, "er ist als Probeeintrag gekennzeichnet");

  /* In der Liste auffindbar. */
  await page.evaluate(() => window.ProbeRahmen.dialogSchliessen(true));
  await page.waitForTimeout(300);
  await page.fill("[data-kundensuche]", "Testkunde 77");
  await page.waitForTimeout(500);
  pruefe((await zeilen(page)).length === 1, "er steht in der Liste");

  /* Ein Neukunde aus dem Fahrtassistenten ebenso. */
  const vorher2 = await page.evaluate(() => window.ProbeDaten.kunden.length);
  await page.evaluate(() => {
    const k = window.ProbeDaten.kundeAnlegen({
      art: "privat", name: "Testkunde 88", telefon: "Testnummer 0088",
      quelle: "Fahrtaufnahme"
    });
    return k.id;
  });
  await page.waitForTimeout(300);
  pruefe(await page.evaluate(() => window.ProbeDaten.kunden.length) === vorher2 + 1,
    "der Assistent legt über dieselbe Funktion an");
  await page.fill("[data-kundensuche]", "Testkunde 88");
  await page.waitForTimeout(500);
  pruefe((await zeilen(page)).length === 1,
    "und erscheint im selben Bestand — keine zwei Listen");
  await ctx.close();

  /*
    Ohne customers.write kein Anlegen.

    Die Buchhaltung HAT customers.write - sie war die falsche Rolle
    fuer diese Pruefung. Genommen wird die Disposition: Sie hat
    weder customers.read noch customers.write und sieht den Bereich
    gar nicht. Geprueft wird deshalb der direkte Aufruf.
  */
  const b = await seite("dispatcher");
  const darf = await b.page.evaluate(() => ({
    lesen: window.ProbeRahmen.darf("customers.read"),
    schreiben: window.ProbeRahmen.darf("customers.write")
  }));
  pruefe(!darf.lesen && !darf.schreiben,
    "die Disposition hat keine Kundenrechte");
  const vorher3 = await b.page.evaluate(() => window.ProbeDaten.kunden.length);
  await b.page.evaluate(() => {
    window.ProbeAkten.tun("ak-kunde-neu", "");
    window.ProbeAkten.tun("ak-kunde-weiter", "");
    window.ProbeAkten.tun("ak-kunde-ja", "");
  });
  await b.page.waitForTimeout(400);
  pruefe(await b.page.evaluate(() => window.ProbeDaten.kunden.length) === vorher3,
    "und der direkte Aufruf legt keinen Kunden an");
  pruefe(!(await dialogOffen(b.page)), "es öffnet sich auch kein Anlegefenster");
  await b.ctx.close();
}

/* ═══ 5. Personalakte ═══════════════════════════════════════════ */
console.log("\n── 5. Die Personalakte ──");
{
  for (const rolle of ["admin", "personal"]) {
    const { ctx, page } = await seite(rolle);
    await geh(page, "personal");
    const z = await zeilen(page);
    pruefe(z.length === 6, `${rolle}: alle Mitarbeiterzeilen sind bedienbar (${z.length})`);
    await page.click('.aktenzeile[data-tun="ak-person:M02"]');
    await page.waitForTimeout(600);
    pruefe(await dialogOffen(page), `${rolle}: die Akte öffnet sich`);
    const a = await kurz(page, ".dialog-kasten");
    for (const [was, muster] of [
      ["Stammdaten", /Testfahrer 02/], ["Kennung", /M02/],
      ["Beschäftigungsstatus", /Status.*krank/], ["Vertrag", /Vertrag/],
      ["Arbeitszeitmodell", /Arbeitszeitmodell/], ["Urlaub", /Urlaub/],
      ["Dokumente und Fristen", /Dokumente und Fristen/],
      ["Änderungsverlauf", /Änderungsverlauf/]
    ]) {
      pruefe(muster.test(a), `${rolle}: die Akte nennt ${was}`);
    }
    pruefe(/Krankheitsvorgänge/.test(a), `${rolle}: Krankheitsvorgänge sind da`);
    pruefe(/V0002/.test(a), `${rolle}: mit Vorgangsnummer`);
    pruefe(!/Invalid Date/.test(a), `${rolle}: und mit lesbarem Zeitraum`);
    pruefe(/Keine Diagnose, keine Bescheinigung/.test(a),
      `${rolle}: ohne Diagnose und Bescheinigung`);
    pruefe(/Lohnabrechnungen/.test(a), `${rolle}: Lohnabrechnungen, weil payroll.read`);
    pruefe(/nicht festgelegt/.test(a),
      `${rolle}: und was an Geschäftsregeln offen ist`);

    /* Die Beschaeftigung widerspricht dem Modell nicht. */
    const stimmt = await page.evaluate(() => {
      const pz = window.ProbeDaten.personalVon("M02");
      const teilzeit = /Teilzeit|Aushilfe|Abruf|Minijob/i.test(pz.modell);
      return pz.beschaeftigung === "Vollzeit" ? !teilzeit : true;
    });
    pruefe(stimmt, `${rolle}: Beschäftigung und Arbeitszeitmodell widersprechen sich nicht`);
    await ctx.close();
  }

  /* Eine Wahrheit: dieselbe Kennung, dieselben Stammdaten. */
  const { ctx, page } = await seite("admin");
  const eine = await page.evaluate(() => {
    const m = window.ProbeDaten.mitarbeiter.find((x) => x.id === "M03");
    const pz = window.ProbeDaten.personalVon("M03");
    return { gleich: m.name === pz.name && m.beschaeftigung === pz.beschaeftigung, id: pz.id };
  });
  pruefe(eine.gleich && eine.id === "M03",
    "„Fahrer & Fahrzeuge“ und „Personal“ zeigen denselben Datensatz");

  /* Ohne personnel.read nichts. */
  await ctx.close();
  const d = await seite("dispatcher");
  await d.page.evaluate(() => window.ProbeAkten.tun("ak-person", "M02"));
  await d.page.waitForTimeout(400);
  pruefe(!(await dialogOffen(d.page)), "ohne personnel.read öffnet sich keine Personalakte");
  await d.ctx.close();

  /* Die Buchhaltung sieht keine Lohnangaben in der Akte. */
  const b = await seite("accounting");
  await b.page.evaluate(() => window.ProbeAkten.tun("ak-person", "M02"));
  await b.page.waitForTimeout(400);
  pruefe(!(await dialogOffen(b.page)),
    "und die Buchhaltung ebenfalls nicht");
  await b.ctx.close();
}

/* ═══ 6. Rechnungen ═════════════════════════════════════════════ */
console.log("\n── 6. Rechnungen öffnen und buchen ──");
{
  for (const rolle of ["admin", "accounting"]) {
    const { ctx, page } = await seite(rolle);
    await geh(page, "finanzen");
    const z = await zeilen(page);
    pruefe(z.length >= 4, `${rolle}: die Rechnungszeilen sind bedienbar (${z.length})`);
    await page.click('.aktenzeile[data-tun="ak-rechnung:RE-2026-0003"]');
    await page.waitForTimeout(600);
    pruefe(await dialogOffen(page), `${rolle}: die Rechnung öffnet sich`);
    const a = await kurz(page, ".dialog-kasten");
    for (const [was, muster] of [
      ["Rechnungsnummer", /RE-2026-0003/], ["Kunde", /Testkunde 02/],
      ["Zeitraum", /07\/2026/], ["zugehörige Fahrten", /Zugehörige Fahrten/],
      ["Positionen", /Positionen/], ["Betrag", /96,00/],
      ["Fälligkeit", /Fällig/], ["Zahlungszustand", /Zahlungszustand/],
      ["bisherige Zahlungen", /Zahlungen/], ["Änderungsverlauf", /Änderungsverlauf/],
      ["PDF-Platzhalter", /keine PDF/]
    ]) {
      pruefe(muster.test(a), `${rolle}: die Akte nennt ${was}`);
    }
    pruefe(/signierte Adresse/.test(a), `${rolle}: der Platzhalter nennt den Weg im Portal`);
    for (const k of ["ak-zahlung", "ak-mahnung", "ak-rech-korrektur"]) {
      pruefe(Boolean(await page.$(`[data-tun="${k}:RE-2026-0003"]`)),
        `${rolle}: es gibt „${k}“`);
    }
    await ctx.close();
  }

  /* Zahlung erfassen - mit letzter Pruefung. */
  const { ctx, page } = await seite("accounting");
  await geh(page, "finanzen");
  await page.click('.aktenzeile[data-tun="ak-rechnung:RE-2026-0003"]');
  await page.waitForTimeout(500);
  await page.click('[data-tun="ak-zahlung:RE-2026-0003"]');
  await page.waitForTimeout(500);
  await page.click('[data-tun="ak-bk-weiter"]');
  await page.waitForTimeout(400);
  pruefe(Boolean(await page.$(".feldfehler")), "ohne Betrag geht es nicht weiter");
  await page.fill('[data-bk="wert"]', "96,00 €");
  await page.click('[data-tun="ak-bk-weiter"]');
  await page.waitForTimeout(500);
  const pr = await kurz(page, ".dialog-kasten");
  pruefe(/Letzte Prüfung/.test(pr), "es gibt eine letzte Prüfung");
  pruefe(/Vorher/.test(pr) && /Nachher/.test(pr), "mit vorher und nachher");
  pruefe(/Handelndes Konto/.test(pr) && /Rolle/.test(pr), "mit Konto und Rolle");
  pruefe(/Nichts wird überschrieben/.test(pr), "und der Zusicherung");

  const protoVorher = await page.evaluate(() => window.ProbeDaten.protokoll.length);
  await page.click('[data-tun="ak-bk-ja"]');
  await page.waitForTimeout(700);
  const r = await page.evaluate(() =>
    window.ProbeDaten.rechnungen.find((x) => x.nr === "RE-2026-0003"));
  pruefe(r.zahlungen.length === 1, "die Zahlung ist erfasst");
  pruefe(/Testbuchhaltung 01/.test(r.zahlungen[0].wer), "mit der handelnden Person");
  pruefe(r.verlauf.length === 1, "und im Änderungsverlauf der Rechnung");
  const p = await page.evaluate(() => window.ProbeDaten.protokoll.slice());
  pruefe(p.length === protoVorher + 1, "es entsteht genau ein Protokolleintrag");
  pruefe(/Zahlung erfasst/.test(p[0].was), "er benennt die Buchung");
  pruefe(/RE-2026-0003/.test(p[0].betrifft), "mit der Rechnung");
  pruefe(Boolean(p[0].vorher) && Boolean(p[0].nachher), "mit vorher und nachher");
  pruefe(await page.evaluate(() => Object.isFrozen(window.ProbeDaten.protokoll[0])),
    "der Eintrag ist unveränderlich");

  /* Korrektur: Pflichtgrund und neue Version. */
  await page.click('[data-tun="ak-rech-korrektur:RE-2026-0003"]');
  await page.waitForTimeout(500);
  await page.click('[data-tun="ak-bk-weiter"]');
  await page.waitForTimeout(450);
  await page.click('[data-tun="ak-bk-ja"]');
  await page.waitForTimeout(450);
  pruefe(Boolean(await page.$(".feldfehler")), "eine Korrektur ohne Grund wird abgewiesen");
  const anzVorher = await page.evaluate(() => window.ProbeDaten.rechnungen.length);
  await page.fill("[data-bk-grund]", "Testgrund: Position doppelt berechnet");
  await page.click('[data-tun="ak-bk-ja"]');
  await page.waitForTimeout(700);
  const nach = await page.evaluate(() => ({
    anzahl: window.ProbeDaten.rechnungen.length,
    alt: window.ProbeDaten.rechnungen.find((x) => x.nr === "RE-2026-0003"),
    neu: window.ProbeDaten.rechnungen.find((x) => x.bezugAuf === "RE-2026-0003")
  }));
  pruefe(nach.anzahl === anzVorher + 1, "es entsteht eine neue Version");
  pruefe(Boolean(nach.neu) && nach.neu.version === 2, `mit Version 2 (${nach.neu.nr})`);
  pruefe(nach.neu.bezugAuf === "RE-2026-0003", "die auf die alte verweist");
  pruefe(nach.alt.version === 1, "die alte bleibt Version 1");
  pruefe(nach.alt.zahlungen.length === 1, "ihre Zahlung bleibt erhalten");
  pruefe(nach.neu.zahlungen.length === 0, "die neue Version startet ohne Zahlung");
  const pk = await page.evaluate(() => window.ProbeDaten.protokoll[0]);
  pruefe(/Korrektur als neue Version/.test(pk.was), "die Korrektur ist protokolliert");
  pruefe(/Testgrund/.test(pk.grund), "mit dem Grund");
  pruefe(/bleibt unverändert/.test(pk.nachher), "und dem Hinweis, dass nichts überschrieben wurde");
  await ctx.close();

  /* Ohne finance.write keine Buchung - auch nicht direkt. */
  const d = await seite("dispatcher");
  const vorher = await d.page.evaluate(() =>
    window.ProbeDaten.rechnungen.find((x) => x.nr === "RE-2026-0001").zahlungen.length);
  for (const [a, w] of [["ak-rechnung", "RE-2026-0001"], ["ak-zahlung", "RE-2026-0001"],
    ["ak-bk-weiter", ""], ["ak-bk-ja", ""], ["ak-rech-korrektur", "RE-2026-0001"]]) {
    await d.page.evaluate(([x, y]) => window.ProbeAkten.tun(x, y), [a, w]);
    await d.page.waitForTimeout(120);
  }
  pruefe(await d.page.evaluate(() =>
    window.ProbeDaten.rechnungen.find((x) => x.nr === "RE-2026-0001").zahlungen.length) === vorher,
    "ohne finance.write bewirken die direkten Aufrufe nichts");
  pruefe(!(await dialogOffen(d.page)), "und es öffnet sich keine Rechnung");
  await d.ctx.close();
}

/* ═══ 7. Rewards ════════════════════════════════════════════════ */
console.log("\n── 7. Rewards vollständig und ehrlich ──");
{
  const { ctx, page } = await seite("admin");
  await geh(page, "rewards");
  const s = await kurz(page, ".haupt");

  for (const stufe of ["Bronze", "Silber", "Gold", "Platin", "VIP"]) {
    pruefe(new RegExp(stufe).test(s), `die Stufe ${stufe} ist genannt`);
  }
  pruefe(/100 qualifizierende Fahrten/.test(s), "das VIP-Ziel steht da");
  pruefe(/200 Bonuspunkte/.test(s), "die Geburtstagspunkte");
  for (const aus of ["Krankenfahrten", "Dialyse", "Flughafenfahrten"]) {
    pruefe(new RegExp(aus).test(s), `der Ausschluss „${aus}“`);
  }
  pruefe(/5 bis 50 Punkte/.test(s), "die Punktespanne des Glücksrads");
  pruefe(/20-Euro-Gutschein/.test(s), "der Gutschein");
  pruefe(/Yumaks Box/.test(s), "und Yumaks Box");
  pruefe(/bis zur fachlichen Freigabe gesperrt/.test(s), "die ausdrücklich gesperrt ist");
  pruefe(/serverseitig/.test(s), "der Gewinn wird serverseitig bestimmt");
  pruefe(/abgebrochener Dreh vernichtet keinen Anspruch/.test(s),
    "ein abgebrochener Dreh vernichtet nichts");

  /* Offene Schwellen werden nicht erfunden. */
  pruefe(/offene Geschäftsentscheidung/.test(s),
    "eine nicht festgelegte Schwelle ist als offen gekennzeichnet");
  pruefe(/Schwelle noch nicht festgelegt/.test(s), "und nicht mit einer Zahl gefüllt");
  const platin = await page.evaluate(() =>
    window.ProbeDaten.REWARDS_STUFEN.find((x) => x.name === "Platin"));
  pruefe(platin.festgelegt === false, "Platin ist im Datenmodell als offen markiert");
  pruefe(!/\d/.test(platin.schwelle), `und trägt keine Zahl (${platin.schwelle})`);

  /* Konto oeffnen. */
  await page.click('.aktenzeile[data-tun="ak-rewards-konto:Testkunde 03"]');
  await page.waitForTimeout(600);
  pruefe(await dialogOffen(page), "das Rewards-Konto öffnet sich");
  const k = await kurz(page, ".dialog-kasten");
  for (const [was, muster] of [
    ["Punktestand", /Punktestand/], ["Stufe", /Stufe/],
    ["Fortschritt", /Fortschritt/], ["qualifizierende Fahrten", /Qualifizierende Fahrten/],
    ["Punkteverlauf", /Punkteverlauf/], ["Gutscheine", /Gutscheine/],
    ["offene Drehs", /Offene Drehs/], ["Geburtstagsbonus", /Geburtstagsbonus/]
  ]) {
    pruefe(muster.test(k), `das Konto nennt ${was}`);
  }
  pruefe(/Begründung:/.test(k), "jede Buchung trägt eine Begründung");
  /*
    GEAENDERTE ERWARTUNG - und zwar strenger.

    Alt: Der Verlauf musste den Eintrag "Dialysefahrt —
    ausgeschlossen" enthalten.

    Weshalb das nicht mehr gilt: Dieser Eintrag haengte eine
    Behandlungsart an einen benannten Kunden. Das ist eine
    Gesundheitsangabe und in dieser Probe nicht erlaubt - auch nicht
    als Testwert. Meine eigene Erwartung hat hier eine
    Regelverletzung festgeschrieben.

    Neu: Es muss weiterhin eine Nullbuchung mit Begruendung geben -
    die Regel "ausgeschlossene Kategorien geben keine Punkte" soll am
    Konto sichtbar sein. Aber die Begruendung nennt die Kategorie,
    nicht die Behandlung. Zusaetzlich wird geprueft, dass im ganzen
    Konto keine Behandlungsart steht.
  */
  pruefe(/Keine Punkte/.test(k) && /ausgeschlossenen Kategorie/.test(k),
    "auch eine Nullbuchung mit Grund, ohne Behandlungsart");
  /*
    Zu weit gegriffen: Das Konto nennt die Ausschlusskategorien der
    Rewardsregeln ("Ausgeschlossen sind Krankenfahrten, Dialyse,
    Flughafenfahrten") - das ist die Regel selbst und soll dort
    stehen. Geprueft wird deshalb der PUNKTEVERLAUF, also die
    Eintraege, die an diesem einen Kunden haengen.
  */
  const verlaufstext = await page.evaluate(() => {
    const kopf = [...document.querySelectorAll(".dialog-kasten h3")]
      .find((x) => /Punkteverlauf/.test(x.textContent));
    const liste = kopf && kopf.parentElement.querySelector("ul.konfliktliste");
    return liste ? liste.textContent.replace(/\s+/g, " ") : "";
  });
  pruefe(verlaufstext.length > 20,
    `der Punkteverlauf ist lesbar (${verlaufstext.length} Zeichen)`);
  pruefe(!/Dialyse|Chemo|Strahlen|Diagnose/i.test(verlaufstext),
    "im Punkteverlauf des Kunden steht keine Behandlungsart");
  /* Gegenprobe: die Regelangabe steht sehr wohl da. */
  pruefe(/Ausgeschlossen sind/.test(k),
    "die Ausschlussregel selbst wird genannt");
  pruefe(/eingelöst/.test(k), "eingelöste Gutscheine sind erkennbar");

  /* Korrektur nur mit Grund. */
  pruefe(Boolean(await page.$('[data-tun="ak-rw-korrektur:Testkunde 03"]')),
    "die Administration darf korrigieren");
  await page.click('[data-tun="ak-rw-korrektur:Testkunde 03"]');
  await page.waitForTimeout(500);
  await page.fill('[data-bk="wert"]', "-50");
  await page.click('[data-tun="ak-bk-weiter"]');
  await page.waitForTimeout(450);
  const pr = await kurz(page, ".dialog-kasten");
  pruefe(/810 Punkte/.test(pr) && /760 Punkte/.test(pr), "die Prüfung zeigt vorher und nachher");
  await page.click('[data-tun="ak-bk-ja"]');
  await page.waitForTimeout(450);
  pruefe(Boolean(await page.$(".feldfehler")), "ohne Grund wird nicht korrigiert");
  await page.fill("[data-bk-grund]", "Testgrund: doppelte Gutschrift");
  await page.click('[data-tun="ak-bk-ja"]');
  await page.waitForTimeout(700);
  const konto = await page.evaluate(() =>
    window.ProbeDaten.rewards.konten.find((x) => x.kunde === "Testkunde 03"));
  pruefe(konto.punkte === 760, `die Punkte sind korrigiert (${konto.punkte})`);
  pruefe(/Manuelle Korrektur/.test(konto.verlauf[0].was), "mit eigenem Verlaufseintrag");
  pruefe(/Testgrund/.test(konto.verlauf[0].grund), "mit Grund");
  pruefe(/Testleitung 01/.test(konto.verlauf[0].wer), "und handelnder Person");
  pruefe(await page.evaluate(() =>
    Object.isFrozen(window.ProbeDaten.rewards.konten.find((x) => x.kunde === "Testkunde 03").verlauf[0])),
    "der Verlaufseintrag ist unveränderlich");
  await ctx.close();

  /* Die Disposition hat keinen Verwaltungszugriff. */
  const d = await seite("dispatcher");
  const sichtbar = await d.page.evaluate(() =>
    window.ProbeRahmen.BEREICHE.filter((x) => window.ProbeRahmen.darf(x.braucht)).map((x) => x.id));
  pruefe(!sichtbar.includes("rewards"), "die Disposition sieht Rewards nicht");
  const vorher = await d.page.evaluate(() =>
    window.ProbeDaten.rewards.konten.find((x) => x.kunde === "Testkunde 01").punkte);
  await d.page.evaluate(() => {
    window.ProbeAkten.tun("ak-rewards-konto", "Testkunde 01");
    window.ProbeAkten.tun("ak-rw-korrektur", "Testkunde 01");
  });
  await d.page.waitForTimeout(400);
  pruefe(!(await dialogOffen(d.page)), "und auch direkt kein Konto");
  pruefe(await d.page.evaluate(() =>
    window.ProbeDaten.rewards.konten.find((x) => x.kunde === "Testkunde 01").punkte) === vorher,
    "und keine Korrektur");
  await d.ctx.close();
}

/* ═══ 8. Lohn bleibt, wie er war (Regression) ═══════════════════ */
console.log("\n── 8. Der Lohnbereich ist unverändert ──");
{
  const { ctx, page } = await seite("personal");
  await geh(page, "lohn");
  const l = await kurz(page, ".haupt");
  pruefe(/Lohnabrechnung bereitstellen/.test(l), "„Lohnabrechnung bereitstellen“ ist da");
  pruefe(/privater Bucket/.test(l), "der private Bucket ist benannt");
  pruefe(/signierte Adresse/.test(l), "die kurz gültige, signierte Adresse");
  pruefe(/kein stilles Überschreiben/.test(l), "und dass nicht überschrieben wird");
  pruefe(Boolean(await page.$('[data-tun="lohn-ansehen"]')), "„Ansehen“ ist da");
  await ctx.close();

  const d = await seite("dispatcher");
  const sichtbar = await d.page.evaluate(() =>
    window.ProbeRahmen.BEREICHE.filter((x) => window.ProbeRahmen.darf(x.braucht)).map((x) => x.id));
  pruefe(!sichtbar.includes("lohn"), "die Disposition hat keinen Zugriff auf Lohn");
  await d.ctx.close();
}

/* ═══ 9. Darstellung, Tastatur, Netz ═══════════════════════════ */
console.log("\n── 9. Darstellung, Netz ──");
for (const [breite, hoehe] of [[320, 568], [390, 844], [430, 932], [1440, 900]]) {
  const { ctx, page } = await seite("admin", breite, hoehe);
  for (const b of ["kunden", "personal", "finanzen", "rewards"]) {
    await geh(page, b);
    const ueber = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    pruefe(ueber <= 0, `${b} bei ${breite}px kein waagerechter Überlauf (${ueber}px)`);
  }
  await ctx.close();
}
{
  const { ctx, page } = await seite("admin");
  await geh(page, "kunden");
  const klein = await page.$$eval(".aktenzeile", (n) => n.filter((x) => {
    const r = x.getBoundingClientRect();
    return r.height > 0 && r.height < 36;
  }).length);
  pruefe(klein === 0, `keine Zeile unter 36 px hoch (${klein})`);
  await ctx.close();
}

pruefe(fremdeAnfragen.length === 0,
  `keine einzige Anfrage nach aussen im ganzen Lauf (${fremdeAnfragen.length})`);
{
  const akten = await readFile(join(PROBE, "probe-akten.js"), "utf8");
  const ohneKommentar = akten.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
  pruefe(!/fetch\s*\(|new XMLHttpRequest|createClient\s*\(|supabase\./i.test(ohneKommentar),
    "kein Netzzugriff im Aktenmodul");
  pruefe(!/(diagnose|krankheitsgrund|befund)\s*[:=]/i.test(ohneKommentar),
    "kein Feld für eine Diagnose");
  pruefe(!/cdn\.|unpkg|jsdelivr|googleapis/.test(akten), "keine fremden Quellen");
  const html = await readFile(join(PROBE, "index.html"), "utf8");
  pruefe(!/https?:\/\//.test(html.replace(/<!--[\s\S]*?-->/g, "")),
    "kein fremder Verweis im HTML");
}

await browser.close();
server.close();

console.log("\n" + "═".repeat(59));
console.log(`Akten: ${bestanden} bestanden, ${offen.length} nicht bestanden`);
if (offen.length) {
  console.log("\nNicht bestanden:");
  for (const n of offen) console.log("  - " + n);
}
console.log(`
ALLES SIMULIERT. Keine Datenquelle, kein Upload, kein Versand, keine
PDF. Dieser Lauf sagt nichts ueber die produktive Instanz.`);
console.log("═".repeat(59));
process.exit(offen.length ? 1 : 0);
