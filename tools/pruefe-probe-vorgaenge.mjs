/* ============================================================
   Prueflauf: Meldungen & Aufgaben in der Designprobe
   ============================================================
   Prueft die Trennung von Glocke und Arbeitsliste, den vollstaendigen
   Urlaubsablauf mit Faehigkeiten statt Rollennamen, Krankmeldung und
   Vertraulichkeit, Dokumentaufgaben, Zustaendigkeit und
   Paralleländerung, Filter ohne Datenverlust, die Auffindbarkeit
   erledigter Vorgaenge, das unveraenderliche Protokoll, vier Breiten,
   Tastatur und Fokus - und dass nichts nach aussen geht.

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
const PORT = 5391;
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
  await page.evaluate(() => window.ProbeRahmen.geheZu("meldungen"));
  await page.waitForTimeout(350);
  return { ctx, page, fehler };
}

const vg = (id) => `.vorgang[data-vorgang="${id}"]`;
const oeffnen = async (page, id) => {
  await page.click(`${vg(id)} [data-tun="vg-oeffnen:${id}"]`);
  await page.waitForTimeout(400);
};
const glockenzahl = (page) => page.$eval(".pk-zahl", (el) => Number(el.textContent.trim()));

/* ═══ 1. Ein Eingang, vier Arten ═════════════════════════════════ */
console.log("\n── 1. Der Eingang steht ──");
{
  const { ctx, page, fehler } = await seite();
  const kopf = await page.textContent(".bereichskopf");
  pruefe(/Meldungen & Aufgaben/.test(kopf), "er heisst Meldungen & Aufgaben");
  pruefe(/neu/.test(kopf) && /in Bearbeitung/.test(kopf), "und nennt die wichtigsten Zahlen");

  const arten = await page.$$eval(".vorgang", (n) => [...new Set(n.map((x) => x.dataset.art))]);
  pruefe(arten.includes("aufgabe"), "es gibt Aufgaben");
  pruefe(arten.includes("warnung"), "und Warnungen");
  const text = await page.textContent(".vorgangsliste");
  pruefe(/Aufgabe/.test(text) && /Warnung/.test(text),
    "jede Art ist im Klartext bezeichnet, nicht nur farblich");

  const erste = await page.textContent(".vorgang");
  for (const feld of ["Betrifft", "Eingang", "Verantwortlich", "Gesamtstand"]) {
    pruefe(erste.includes(feld), `jeder Eintrag nennt ${feld}`);
  }
  pruefe(Boolean(await page.$(".vorgang .haupt-knopf")), "und hat genau eine Hauptaktion");

  const reiter = await page.$$eval(".filterzeile .filterchip", (n) => n.map((x) => x.textContent.trim()));
  for (const name of ["Neu", "Mir zugewiesen", "In Bearbeitung", "Wartet auf Rückmeldung", "Erledigt", "Alle"]) {
    pruefe(reiter.some((r) => r.startsWith(name)), `der Reiter „${name}“ ist da`);
  }
  pruefe(fehler.length === 0, `keine Skriptfehler${fehler.length ? " (" + fehler[0] + ")" : ""}`);
  await ctx.close();
}

/* ═══ 2. Glocke und Arbeitsliste sind getrennt ═══════════════════ */
console.log("\n── 2. Gesehen ist nicht erledigt ──");
{
  const { ctx, page } = await seite();
  const vorher = await glockenzahl(page);
  pruefe(vorher > 0, `die Glocke zeigt neue Ereignisse (${vorher})`);

  await page.click("[data-glocke]");
  await page.waitForTimeout(400);
  const glocke = await page.textContent(".dialog-kasten");
  pruefe(/Neue Ereignisse/.test(glocke), "sie oeffnet eine eigene Liste");
  pruefe(/„Gesehen“ heißt nicht/.test(glocke), "und sagt, dass gesehen nicht erledigt ist");

  /* Aus der Glocke in den Vorgang. */
  await page.click('.dialog-kasten [data-tun="vg-oeffnen:V0001"]');
  await page.waitForTimeout(450);
  pruefe(/Neuer Urlaubsantrag/.test(await page.textContent(".dialog-kasten")),
    "ein Klick oeffnet den passenden Vorgang");
  await page.click("button[data-dialog-zu]");
  await page.waitForTimeout(350);

  const nachher = await glockenzahl(page);
  pruefe(nachher === vorher - 1, `die Glocke zaehlt herunter (${vorher} → ${nachher})`);

  /* Der Vorgang ist trotzdem noch in der Arbeitsliste und nicht erledigt. */
  const zustand = await page.$eval(vg("V0001"), (el) => el.dataset.zustand);
  pruefe(zustand === "neu", `der Vorgang bleibt „Neu“ (${zustand})`);
  await page.click('[data-tun="vg-reiter:neu"]');
  await page.waitForTimeout(300);
  pruefe(Boolean(await page.$(vg("V0001"))), "und steht weiter unter „Neu“");
  await ctx.close();
}

/* ═══ 3. Urlaub: Disposition darf nicht entscheiden ══════════════ */
console.log("\n── 3. Urlaub aus Sicht der Disposition ──");
{
  const { ctx, page } = await seite("dispatcher");
  await oeffnen(page, "V0001");
  const dialog = await page.textContent(".dialog-kasten");
  pruefe(/Zeitraum/.test(dialog) && /Arbeitstage/.test(dialog), "sie sieht Zeitraum und Arbeitstage");
  pruefe(/Auswirkung auf die Planung/.test(dialog), "und die Planungswirkung");
  pruefe(!(await page.$('[data-tun^="vg-entscheiden"]')), "sie kann nicht entscheiden");
  pruefe(Boolean(await page.$('[data-tun^="vg-empfehlung"]')), "aber eine Empfehlung abgeben");

  await page.click('[data-tun="vg-empfehlung:V0001|Ersatz erforderlich"]');
  await page.waitForTimeout(400);
  pruefe(/Ersatz erforderlich/.test(await page.textContent(".dialog-kasten")),
    "die Empfehlung steht im Vorgang");
  await page.click("button[data-dialog-zu]");
  await page.waitForTimeout(300);

  /*
    Es gibt KEINEN Schalter, mit dem sich die Disposition die
    Entscheidungsfaehigkeit selbst gibt. Niemand erweitert seine
    eigenen Rechte - das vergibt allein die Administration in der
    Benutzer- und Rechteverwaltung.
  */
  pruefe(!(await page.$('[data-tun="vg-zusatz"]')),
    "es gibt keinen Selbstberechtigungsschalter");
  const hinweis = await page.textContent(".flaeche");
  pruefe(/Administration/.test(hinweis) && /Rechteverwaltung/.test(hinweis),
    "stattdessen steht da, wer die Faehigkeit vergeben darf");
  const zusatzStand = await page.evaluate(() => window.ProbeRahmen.zustand.zusatz);
  pruefe(!zusatzStand.includes("absence.decide"),
    "die Disposition hat die Entscheidungsfaehigkeit nicht");
  await ctx.close();
}

/* ═══ 4. Urlaub genehmigen ═══════════════════════════════════════ */
console.log("\n── 4. Genehmigung durch Personal ──");
{
  const { ctx, page } = await seite("personal");
  await oeffnen(page, "V0001");
  pruefe(Boolean(await page.$('[data-tun="vg-entscheiden:V0001|genehmigen"]')),
    "Personal darf genehmigen");

  await page.click('[data-tun="vg-entscheiden:V0001|genehmigen"]');
  await page.waitForTimeout(400);
  pruefe(Boolean(await page.$('[data-tun="vg-entscheid-pruefen"]')),
    "der erste Klick fuehrt zur Pruefung");
  const vorherAbw = await page.evaluate(() => window.ProbeDaten.abwesenheiten.length);

  await page.click('[data-tun="vg-entscheid-pruefen"]');
  await page.waitForTimeout(400);
  const pruefung = await page.textContent(".dialog-kasten");
  pruefe(/Letzte Prüfung/.test(pruefung), "es folgt die letzte Pruefung");
  pruefe(/Noch ist nichts entschieden/.test(pruefung), "sie sagt, dass noch nichts geschehen ist");
  pruefe(/Entschieden von/.test(pruefung), "und wer entscheidet");
  pruefe((await page.evaluate(() => window.ProbeDaten.abwesenheiten.length)) === vorherAbw,
    "nach dem ersten Klick ist nichts gespeichert");

  await page.click('[data-tun="vg-entscheid-ja"]');
  await page.waitForTimeout(500);
  const quittung = await page.textContent(".dialog-kasten");
  pruefe(/Urlaub genehmigt/.test(quittung), "erst der zweite Klick entscheidet");
  pruefe(/Was protokolliert würde/.test(quittung), "mit Protokollvorschau");
  pruefe(/nichts/.test(quittung), "und dem ehrlichen Hinweis der Probe");

  /* Gemeinsamer Zustand: Der Urlaub steht in denselben Abwesenheiten. */
  const neu = await page.evaluate(() => window.ProbeDaten.abwesenheiten
    .filter((a) => a.mitarbeiterId === "M03" && a.art === "urlaub" && a.status === "genehmigt").length);
  pruefe(neu >= 1, "der genehmigte Urlaub steht in den gemeinsamen Abwesenheiten");
  await page.click("button[data-dialog-zu]");
  await page.waitForTimeout(300);

  /* Erledigt - aber auffindbar. */
  await page.click('[data-tun="vg-reiter:erledigt"]');
  await page.waitForTimeout(350);
  pruefe(Boolean(await page.$(vg("V0001"))), "der erledigte Vorgang bleibt auffindbar");
  await ctx.close();
}

/* ═══ 5. Genehmigter Urlaub wirkt auf Planung und Fahrerstatus ══ */
console.log("\n── 5. Wirkung auf Planung und Fahrer ──");
{
  const { ctx, page } = await seite("admin");
  /* Ein Urlaub, der HEUTE beginnt - damit die Wirkung sofort sichtbar ist. */
  await page.evaluate(() => {
    const v = window.ProbeDaten.vorgangVon("V0001");
    v.daten.von = window.ProbeDaten.alsIso(window.ProbeDaten.heute);
    v.daten.bis = window.ProbeDaten.alsIso(window.ProbeDaten.tagAls(3));
  });
  await page.evaluate(() => window.ProbeRahmen.zeichnen());
  await page.waitForTimeout(300);

  await oeffnen(page, "V0001");
  const wirkung = await page.textContent(".dialog-kasten");
  pruefe(/veröffentlichte Schicht/.test(wirkung), "die Planungswirkung wird benannt");

  await page.click('[data-tun="vg-entscheiden:V0001|genehmigen"]');
  await page.waitForTimeout(350);
  await page.click('[data-tun="vg-entscheid-pruefen"]');
  await page.waitForTimeout(350);
  pruefe(/wird dadurch zum Konflikt/.test(await page.textContent(".dialog-kasten")),
    "die Pruefung warnt vor dem entstehenden Konflikt");
  await page.click('[data-tun="vg-entscheid-ja"]');
  await page.waitForTimeout(450);
  await page.click("button[data-dialog-zu]");
  await page.waitForTimeout(300);

  /* Planung. */
  await page.evaluate(() => window.ProbeRahmen.geheZu("planung"));
  await page.waitForTimeout(450);
  const status = await page.$eval('.plan-zeile[data-mitarbeiter="M03"]', (el) => el.dataset.status);
  pruefe(status === "urlaub", `die Planung zeigt Urlaub (${status})`);
  pruefe(/genehmigten Urlaub/.test(await page.textContent('.plan-zeile[data-mitarbeiter="M03"]')),
    "mit Hinweis in der Zeile");

  /* Fahrer & Fahrzeuge. */
  await page.evaluate(() => window.ProbeRahmen.geheZu("team"));
  await page.waitForTimeout(450);
  const fahrer = await page.$eval('.fahrerkarte[data-mitarbeiter="M03"]', (el) => el.dataset.status);
  pruefe(fahrer === "urlaub", `der Fahrerstatus ist Urlaub (${fahrer})`);
  await ctx.close();
}

/* ═══ 6. Ablehnung verlangt einen Grund ═════════════════════════ */
console.log("\n── 6. Ablehnung ──");
{
  const { ctx, page } = await seite("admin");
  await oeffnen(page, "V0001");
  await page.click('[data-tun="vg-entscheiden:V0001|ablehnen"]');
  await page.waitForTimeout(400);
  pruefe(await page.isVisible("[data-vg-grund]"), "ein Grund wird verlangt");

  await page.click('[data-tun="vg-entscheid-pruefen"]');
  await page.waitForTimeout(400);
  pruefe(/Ablehnung braucht einen Grund/.test(await page.textContent(".dialog-kasten")),
    "ohne Grund geht es nicht weiter");

  await page.fill("[data-vg-grund]", "In diesem Zeitraum sind schon zwei Fahrer im Urlaub.");
  await page.click('[data-tun="vg-entscheid-pruefen"]');
  await page.waitForTimeout(400);
  pruefe(/zwei Fahrer im Urlaub/.test(await page.textContent(".dialog-kasten")),
    "der Grund steht in der Zusammenfassung");

  await page.click('[data-tun="vg-entscheid-zurueck"]');
  await page.waitForTimeout(400);
  pruefe((await page.inputValue("[data-vg-grund]")).includes("zwei Fahrer"),
    "„Zurück und ändern“ erhält den Grund");

  await page.click('[data-tun="vg-entscheid-pruefen"]');
  await page.waitForTimeout(350);
  await page.click('[data-tun="vg-entscheid-ja"]');
  await page.waitForTimeout(450);
  const q = await page.textContent(".dialog-kasten");
  pruefe(/Urlaub abgelehnt/.test(q), "die Ablehnung wird abgeschlossen");
  pruefe(/zwei Fahrer im Urlaub/.test(q), "mit der Begruendung im Protokoll");
  await page.click("button[data-dialog-zu]");
  await page.waitForTimeout(300);

  await page.click('[data-tun="vg-reiter:alle"]');
  await page.waitForTimeout(350);
  await oeffnen(page, "V0001");
  const sicht = await page.textContent(".dialog-kasten");
  pruefe(/Mitarbeiter-Vorschau/.test(sicht), "es gibt eine Mitarbeiter-Vorschau");
  pruefe(/wurde abgelehnt/.test(sicht), "sie nennt die Entscheidung");
  await ctx.close();
}

/* ═══ 7. Rückfrage ══════════════════════════════════════════════ */
console.log("\n── 7. Rückfrage ──");
{
  const { ctx, page } = await seite("admin");
  await oeffnen(page, "V0001");
  await page.click('[data-tun="vg-rueckfrage:V0001"]');
  await page.waitForTimeout(450);
  const zustand = await page.evaluate(() => window.ProbeDaten.vorgangVon("V0001").zustand);
  pruefe(zustand === "warten", `der Vorgang wartet auf Rückmeldung (${zustand})`);
  const dialog = await page.textContent(".dialog-kasten");
  pruefe(/Rückfrage/.test(dialog), "die Mitarbeiter-Vorschau nennt die Rückfrage");
  pruefe(/Interne Notizen und Empfehlungen erscheinen dort nicht/.test(dialog),
    "die Mitarbeiter-Vorschau sagt, dass interne Notizen dort nicht erscheinen");
  const notizenSichtbar = await page.$$eval(".dialog-schritt", (n) =>
    n.filter((x) => /Interne Notizen/.test(x.querySelector("h3") ? x.querySelector("h3").textContent : "")).length);
  pruefe(notizenSichtbar === 0, "und es gibt zu diesem Vorgang keine interne Notiz");
  await page.click("button[data-dialog-zu]");
  await page.waitForTimeout(300);
  await page.click('[data-tun="vg-reiter:warten"]');
  await page.waitForTimeout(350);
  pruefe(Boolean(await page.$(vg("V0001"))), "und steht unter „Wartet auf Rückmeldung“");
  await ctx.close();
}

/* ═══ 8. Krankmeldung ═══════════════════════════════════════════ */
console.log("\n── 8. Krankmeldung ──");
{
  /* Disposition: nur das Betriebliche. */
  const a = await seite("dispatcher");
  await oeffnen(a.page, "V0002");
  const dispo = await a.page.textContent(".dialog-kasten");
  pruefe(/Zeitraum/.test(dispo), "die Disposition sieht den Zeitraum");
  pruefe(/Planungswirkung/.test(dispo), "die Planungswirkung");
  pruefe(/Ersatz nötig/.test(dispo), "und ob Ersatz gebraucht wird");
  pruefe(!/Testbescheinigung/.test(dispo), "aber keine Bescheinigung");
  pruefe(/nicht zu Ihrer Rolle/.test(dispo), "und bekommt das gesagt");
  pruefe(!(await a.page.$('[data-tun^="vg-datei"]')), "kein Weg zur Datei");
  pruefe(/weder Diagnose noch\s+medizinische Angaben/.test(dispo.replace(/\s+/g, " ")),
    "es steht ausdruecklich da, dass keine medizinischen Angaben gefuehrt werden");
  pruefe(!/Diagnose:|Befund|Behandlung/.test(dispo),
    "und es gibt keine Angabe, die so etwas enthielte");
  await a.ctx.close();

  /* Die Planung kennt den Status sofort. */
  const b = await seite("dispatcher");
  await b.page.evaluate(() => window.ProbeRahmen.geheZu("planung"));
  await b.page.waitForTimeout(400);
  const status = await b.page.$eval('.plan-zeile[data-mitarbeiter="M02"]', (el) => el.dataset.status);
  pruefe(status === "krank", `die Planung zeigt sofort Krank (${status})`);
  await b.ctx.close();

  /* Personal: mit Bescheinigung. */
  const c = await seite("personal");
  await oeffnen(c.page, "V0002");
  /* Zeilenumbrueche glaetten: Der Hinweis zur signierten Adresse
     bricht im Quelltext um, und eine rohe Textsuche sieht das als
     fehlenden Satz. */
  const pers = (await c.page.textContent(".dialog-kasten")).replace(/\s+/g, " ");
  pruefe(/Testbescheinigung/.test(pers), "Personal sieht die Bescheinigung");
  pruefe(/nur Personal und Administration/.test(pers), "der Abschnitt ist als geschuetzt gekennzeichnet");
  pruefe(/signierte Adresse/.test(pers), "sie wird ueber eine signierte Adresse geoeffnet");

  /* Der Dateiname selbst oeffnet die Vorschau. "Datei sicher pruefen"
     gibt es nicht mehr - der Knopf erzeugte nur eine Quittung, ohne
     dass irgendetwas zu sehen gewesen waere. Siehe
     pruefe-probe-dokumentpruefung. */
  await c.page.click('[data-tun="vg-bescheinigung:V0002"]');
  await c.page.waitForTimeout(400);
  const datei = (await c.page.textContent(".dialog-kasten")).replace(/\s+/g, " ");
  pruefe(/keine öffentliche Adresse/.test(datei), "es gibt keine oeffentliche Adresse");
  pruefe(/kein Anhang per E-Mail/.test(datei), "und keinen Anhang per E-Mail");
  /* Die Vorschau hat seit dem 01.10.2026 zwei getrennte Wege hinaus
     und kein blosses "Schliessen" mehr. Hier geht es zurueck in die
     Krankmeldung - siehe pruefe-probe-karten, Block 6. */
  await c.page.click('[data-tun="vg-vorschau-zurueck:V0002"]');
  await c.page.waitForTimeout(400);
  pruefe(/Krankmeldung eingegangen/.test(await c.page.textContent(".dialog-kopf h2")),
    "„Zurück zur Krankmeldung“ bleibt im Vorgang");
  await c.page.click("button[data-dialog-zu]");
  await c.page.waitForTimeout(300);

  /* Folgebescheinigung gehoert zum bestehenden Vorgang. */
  await oeffnen(c.page, "V0002");
  const vorher = await c.page.evaluate(() => window.ProbeDaten.vorgaenge.length);
  await c.page.click('[data-tun="vg-folge:V0002"]');
  await c.page.waitForTimeout(450);
  /* Folgebescheinigungen stehen seit der Geschaeftsregel vom
     01.10.2026 in derselben Nachweiskette wie die Erstbescheinigung -
     eine zweite Liste waere eine zweite Wahrheit gewesen. */
  const folge = await c.page.evaluate(() => window.ProbeDaten.vorgangVon("V0002").daten.nachweise.length);
  const nachher = await c.page.evaluate(() => window.ProbeDaten.vorgaenge.length);
  pruefe(folge === 2, `die Folgebescheinigung haengt am bestehenden Vorgang (${folge} Nachweise)`);
  pruefe(nachher === vorher, "und erzeugt keinen zweiten Vorgang");

  /* Korrektur des Zeitraums erzeugt dagegen einen NEUEN Vorgang. */
  await c.page.click('[data-tun="vg-korrektur:V0002"]');
  await c.page.waitForTimeout(450);
  const korrektur = await c.page.textContent(".dialog-kasten");
  pruefe(/Korrektur als neuer Vorgang/.test(korrektur), "eine Zeitraumkorrektur ist ein neuer Vorgang");
  pruefe(/bleibt unverändert bestehen/.test(korrektur), "der alte bleibt bestehen");
  const danach = await c.page.evaluate(() => window.ProbeDaten.vorgaenge.length);
  pruefe(danach === vorher + 1, `genau ein Vorgang kam dazu (${vorher} → ${danach})`);
  const alt = await c.page.evaluate(() => window.ProbeDaten.vorgangVon("V0002").daten.bis);
  pruefe(Boolean(alt), "der urspruengliche Zeitraum wurde nicht ueberschrieben");
  await c.ctx.close();
}

/* ═══ 9. Dokumentaufgaben ═══════════════════════════════════════ */
console.log("\n── 9. Dokumente ──");
{
  const { ctx, page } = await seite("dispatcher");
  await page.selectOption("[data-vg-thema]", "dokument");
  await page.waitForTimeout(400);
  const liste = await page.textContent(".vorgangsliste");
  pruefe(/Dokument fehlt|abgelaufen|läuft bald ab/.test(liste),
    "fehlende und ablaufende Dokumente erzeugen Aufgaben");
  pruefe(/Testfahrer/.test(liste), "mit Mitarbeiter");

  const ids = await page.$$eval(".vorgang", (n) => n.map((x) => x.dataset.vorgang));
  await oeffnen(page, ids[0]);
  const dispo = await page.textContent(".dialog-kasten");
  pruefe(/Dokumentart/.test(dispo) && /Frist/.test(dispo) && /Status/.test(dispo),
    "die Aufgabe nennt Art, Frist und Status");
  pruefe(!(await page.$('[data-tun^="vg-datei"]')), "die Disposition kommt nicht an die Datei");
  pruefe(/Dateiinhalt bleibt Administration und Personal/.test(dispo),
    "und bekommt das gesagt");
  await ctx.close();

  const b = await seite("personal");
  await b.page.selectOption("[data-vg-thema]", "dokument");
  await b.page.waitForTimeout(400);
  const ids2 = await b.page.$$eval(".vorgang", (n) => n.map((x) => x.dataset.vorgang));
  await oeffnen(b.page, ids2[0]);
  pruefe(Boolean(await b.page.$('[data-tun^="vg-datei"]')), "Personal darf die Datei sicher pruefen");
  await b.ctx.close();
}

/* ═══ 10. Zuständigkeit ═════════════════════════════════════════ */
console.log("\n── 10. Übernehmen und weitergeben ──");
{
  const { ctx, page } = await seite("dispatcher");
  await page.click('.vorgang[data-vorgang="V0003"] [data-tun="vg-uebernehmen:V0003"]');
  await page.waitForTimeout(450);
  /* Der Vorgang steht jetzt unter "In Bearbeitung". */
  await page.click('[data-tun="vg-reiter:alle"]');
  await page.waitForTimeout(350);
  const zeile = await page.textContent(vg("V0003"));
  pruefe(/Disposition/.test(zeile), "die Uebernahme ist sichtbar");
  pruefe(/In Bearbeitung/.test(zeile), "und der Stand wechselt");

  const protokoll = await page.evaluate(() => window.ProbeDaten.protokoll[0]);
  pruefe(protokoll.was === "Aufgabe übernommen", "die Uebernahme ist protokolliert");
  pruefe(Boolean(protokoll.zeit) && Boolean(protokoll.wer), "mit wer und wann");

  await page.click('.vorgang[data-vorgang="V0003"] [data-tun="vg-weitergeben:V0003"]');
  await page.waitForTimeout(450);
  const danach = await page.evaluate(() => window.ProbeDaten.vorgangVon("V0003").zustaendig);
  pruefe(!danach, "nach dem Weitergeben ist niemand zustaendig");
  pruefe((await page.evaluate(() => window.ProbeDaten.protokoll[0].was)) === "Aufgabe weitergegeben",
    "auch das ist protokolliert");
  await ctx.close();
}

/* ═══ 11. Paralleländerung ══════════════════════════════════════ */
console.log("\n── 11. Zwei Personen am selben Vorgang ──");
{
  const { ctx, page } = await seite("admin");
  await oeffnen(page, "V0003");
  /* Jemand anderes aendert den Vorgang, waehrend er offen ist. */
  await page.evaluate(() => window.ProbeBereiche.tun("vg-fremd:V0003"));
  await page.waitForTimeout(450);
  const dialog = await page.textContent(".dialog-kasten");
  pruefe(/hat diesen Vorgang inzwischen geändert/.test(dialog), "die Aenderung wird erkannt");
  pruefe(/bevor Sie speichern/.test(dialog), "und vor dem Ueberschreiben gewarnt");
  pruefe(Boolean(await page.$('[data-tun="vg-neu-laden:V0003"]')), "der aktuelle Stand laesst sich laden");

  await page.click('[data-tun="vg-neu-laden:V0003"]');
  await page.waitForTimeout(400);
  pruefe(!/inzwischen geändert/.test(await page.textContent(".dialog-kasten")),
    "danach ist die Warnung weg");
  pruefe(/Administration/.test(await page.textContent(".dialog-kasten")),
    "und der Stand der anderen Person steht da");
  await ctx.close();
}

/* ═══ 12. Filter verlieren nichts ═══════════════════════════════ */
console.log("\n── 12. Filter und Suche ──");
{
  const { ctx, page } = await seite("dispatcher");
  await page.click('.vorgang[data-vorgang="V0003"] [data-tun="vg-uebernehmen:V0003"]');
  await page.waitForTimeout(400);
  await page.click('[data-tun="vg-reiter:alle"]');
  await page.waitForTimeout(300);
  const merk = await page.evaluate(() => ({ ...window.ProbeDaten.vorgangVon("V0003") }));

  for (const r of ["alle", "bearbeitung", "erledigt", "neu"]) {
    await page.click(`[data-tun="vg-reiter:${r}"]`);
    await page.waitForTimeout(300);
    const jetzt = await page.evaluate(() => ({ ...window.ProbeDaten.vorgangVon("V0003") }));
    pruefe(jetzt.zustaendig === merk.zustaendig && jetzt.zustand === merk.zustand,
      `Reiter „${r}“ laesst den Vorgang unangetastet`);
  }

  await page.click('[data-tun="vg-reiter:alle"]');
  await page.waitForTimeout(300);
  await page.fill("[data-vg-suche]", "Testfahrer 02");
  await page.waitForTimeout(400);
  const treffer = await page.$$eval(".vorgang", (n) => n.length);
  pruefe(treffer >= 1 && treffer < 11, `die Suche nach der Person filtert (${treffer})`);
  await page.fill("[data-vg-suche]", "V0003");
  await page.waitForTimeout(400);
  pruefe((await page.$$(".vorgang")).length === 1, "die Suche nach dem Vorgang findet genau einen");
  await page.fill("[data-vg-suche]", "gibtesnicht");
  await page.waitForTimeout(400);
  pruefe(/Nichts in dieser Ansicht/.test(await page.textContent(".haupt")),
    "ohne Treffer steht ein eigener Leerzustand da");
  pruefe(!/Für diesen Zeitraum ist nichts eingetragen/.test(await page.textContent(".haupt")),
    "und nicht der allgemeine Leertext");
  await ctx.close();
}

/* ═══ 13. Unveränderliches Protokoll ════════════════════════════ */
console.log("\n── 13. Protokoll ──");
{
  const { ctx, page } = await seite("admin");
  await page.click('.vorgang[data-vorgang="V0003"] [data-tun="vg-uebernehmen:V0003"]');
  await page.waitForTimeout(450);
  const versuch = await page.evaluate(() => {
    const e = window.ProbeDaten.protokoll[0];
    const vorher = { ...e };
    try { e.grund = "nachtraeglich"; } catch { /* eingefroren */ }
    try { e.nachher = "manipuliert"; } catch { /* eingefroren */ }
    return { eingefroren: Object.isFrozen(e), gleich: e.grund === vorher.grund && e.nachher === vorher.nachher };
  });
  pruefe(versuch.eingefroren, "der Protokolleintrag ist eingefroren");
  pruefe(versuch.gleich, "und laesst sich nachtraeglich nicht aendern");

  const text = await page.evaluate(() => JSON.stringify(window.ProbeDaten.protokoll));
  pruefe(!/passwort|token|diagnose/i.test(text), "keine Passwoerter, Tokens oder Diagnosen im Protokoll");
  pruefe(!/€|EUR/.test(text), "und keine Betraege");
  await ctx.close();
}

/* ═══ 14. Darstellung, Tastatur, Fokus ══════════════════════════ */
console.log("\n── 14. Darstellung, Tastatur, Fokus ──");
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
  await page.click("[data-glocke]");
  await page.waitForTimeout(350); await sammeln();
  await page.click("button[data-dialog-zu]");
  await page.waitForTimeout(250);
  await oeffnen(page, "V0002");
  await sammeln();
  await page.click("button[data-dialog-zu]");
  await page.waitForTimeout(250);
  await oeffnen(page, "V0001");
  await page.click('[data-tun="vg-entscheiden:V0001|ablehnen"]');
  await page.waitForTimeout(350); await sammeln();

  pruefe(ueberlauf === 0, `${name}: kein waagerechter Ueberlauf (${ueberlauf} Ansichten)`);
  pruefe(kleineFelder === 0, `${name}: kein Eingabefeld unter 16 px (${kleineFelder})`);
  pruefe(kleineFlaechen === 0, `${name}: keine Bedienflaeche unter 36 px (${kleineFlaechen})`);
  pruefe(fehler.length === 0, `${name}: keine Skriptfehler${fehler.length ? " (" + fehler[0] + ")" : ""}`);
  await ctx.close();
}

{
  const { ctx, page } = await seite("admin", 390, 844);
  await oeffnen(page, "V0001");
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
  pruefe(drin, "der Fokus bleibt im Vorgang (16 Schritte)");
  pruefe(sichtbar, "und ist an jeder Stelle sichtbar");

  /* Offene Eingabe: Klick daneben und Escape schliessen nicht sofort. */
  await page.click('[data-tun="vg-entscheiden:V0001|ablehnen"]');
  await page.waitForTimeout(350);
  await page.fill("[data-vg-grund]", "Begonnene Begründung");
  await page.click(".dialog-hinter", { position: { x: 5, y: 5 } });
  await page.waitForTimeout(350);
  pruefe(await page.isVisible(".dialog-kasten"), "ein Klick daneben schliesst nicht sofort");
  pruefe(/Eingabe geht sonst verloren/.test(await page.textContent(".dialog-kasten")),
    "es wird gewarnt");
  pruefe((await page.inputValue("[data-vg-grund]")) === "Begonnene Begründung",
    "die Eingabe steht noch");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(350);
  pruefe(!(await page.isVisible(".dialog-kasten")), "erst die zweite Bestaetigung schliesst");
  await ctx.close();
}

/* ═══ 15. Nichts geht nach draussen ═════════════════════════════ */
console.log("\n── 15. Kein Netzwerkaufruf ──");
pruefe(fremdeAnfragen.length === 0,
  `keine einzige Anfrage nach aussen im ganzen Lauf (${fremdeAnfragen.length})`);
{
  const quelle = await readFile(join(PROBE, "probe-vorgaenge.js"), "utf8");
  const ohneKommentar = quelle.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
  pruefe(!/fetch\s*\(|new XMLHttpRequest|new WebSocket|createClient\s*\(|supabase\./i.test(ohneKommentar),
    "kein Netzzugriff im Vorgangsmodul");
  pruefe(!/Mustermann|Musterfrau|Herr Müller|Frau Schmidt/.test(quelle), "keine erfundenen Personennamen");
  pruefe(!/Dialyse|Chemotherapie|Strahlentherapie/.test(ohneKommentar), "keine Behandlungsarten");
  pruefe(!/(diagnose|krankheitsgrund|befund)\s*[:=]/i.test(ohneKommentar),
    "und kein Feld, das so etwas aufnehmen wuerde");
}

await browser.close();
server.close();

console.log("\n" + "═".repeat(59));
console.log(`Meldungen & Aufgaben: ${bestanden} bestanden, ${offen.length} nicht bestanden`);
if (offen.length) {
  console.log("\nNicht bestanden:");
  for (const n of offen) console.log("  - " + n);
}
console.log(`
ALLES SIMULIERT. Die Probe hat keine Datenquelle, keinen Upload und
keinen Versand. Dieser Lauf sagt nichts ueber die produktive Instanz.`);
console.log("═".repeat(59));
process.exit(offen.length ? 1 : 0);
