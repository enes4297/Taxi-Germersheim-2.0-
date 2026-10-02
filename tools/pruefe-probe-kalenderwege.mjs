/* ============================================================
   Prueflauf: Kalender - praezise Ziele, echte Schichten
   ============================================================
   Gemessene Ausgangsfehler des manuellen Rundgangs:

   3. "Testfahrer 02 - Krank" und "Testfahrer 06 - Urlaub" oeffneten
      beide nur den Bereich "Fahrer & Fahrzeuge".
      Ursache: Beide Eintraege hatten ziel: "team", ohne Bezug zum
      konkreten Vorgang.

   4. Ein Fahrzeugtermin oeffnete die Gesamtuebersicht.
      Ursache: ziel: "team", und als Titel stand nur das Kennzeichen -
      keine stabile Kennung.

   5. Die Tagesansicht zeigte "1 Schicht" oder "4 Schichten". Man sah
      nicht, welche Fahrer gemeint waren.
      Ursache: Der Kalender zaehlte Zeilen mit von/bis und schrieb die
      Zahl hin.

   6. An einem Tag standen alle sechs Mitarbeiter auf Frei, Krank oder
      Urlaub - und der Kalender zeigte "1 Schicht".
      Ursache: Die Zaehlung fragte die Abwesenheit nicht. Eine alte
      Schichtzeit blieb stehen und galt als Schicht.

   7. Die Filter und der Schutz offener Planungseingaben waren
      manuell bestanden - sie werden hier als Regression gesichert.

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
const PORT = 5376;
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

const tagesansicht = async (page, iso) => {
  await page.evaluate(() => window.ProbeRahmen.geheZu("kalender"));
  await page.waitForTimeout(400);
  if (iso) {
    await page.fill("[data-kal-datum]", iso);
    await page.waitForTimeout(500);
  }
  await page.click('[data-tun="kal-sicht:tag"]');
  await page.waitForTimeout(450);
};
const eintraege = (page) => page.$$eval(".kal-tagesliste li", (n) => n.map((x) => {
  const k = x.querySelector("[data-tun]");
  const leer = x.querySelector(".kal-kein-ziel");
  return {
    text: x.textContent.replace(/\s+/g, " ").trim(),
    tun: k ? k.dataset.tun : "",
    leer: leer ? leer.textContent.replace(/\s+/g, " ").trim() : ""
  };
}));
const heute = (page) => page.evaluate(() => window.ProbeDaten.alsIso(window.ProbeDaten.heute));

/* ═══ 1. Schichten einzeln und ehrlich ══════════════════════════ */
console.log("\n── 1. Jede Schicht einzeln ──");
{
  const { ctx, page, fehler } = await seite("admin");
  await tagesansicht(page);
  const liste = await eintraege(page);
  const schichten = liste.filter((x) => /^Schicht/.test(x.text));
  pruefe(schichten.length > 0, `es gibt einzelne Schichteinträge (${schichten.length})`);
  pruefe(!liste.some((x) => /^Schicht \d+ Schicht/.test(x.text)),
    "keine Sammelangabe „4 Schichten“ mehr");

  const erste = schichten[0].text;
  pruefe(/Testfahrer \d\d/.test(erste), `mit Mitarbeiternamen (${erste.slice(0, 60)})`);
  pruefe(/\d\d:\d\d–\d\d:\d\d/.test(erste), "mit Zeit von/bis");
  pruefe(/GER-TEST|kein Fahrzeug/.test(erste), "mit Fahrzeug oder „kein Fahrzeug“");
  pruefe(/Im Dienst|Frei|Krank|Urlaub/.test(erste), "mit Zustand des Mitarbeiters");
  pruefe(/Entwurf|veröffentlicht/.test(erste), "und mit dem Planstatus");

  pruefe(schichten.some((x) => /kein Fahrzeug/.test(x.text)),
    "ein Eintrag ohne Fahrzeug sagt das ausdrücklich");
  pruefe(fehler.length === 0, `keine Skriptfehler${fehler.length ? " (" + fehler[0] + ")" : ""}`);
  await ctx.close();
}

/* ═══ 2. Ungültige Schichten zählen nicht als Schicht ═══════════ */
console.log("\n── 2. Null gültige Schichten bei lauter Abwesenheit ──");
{
  const { ctx, page } = await seite("admin");

  /* Ein Tag, an dem niemand im Dienst ist - aber eine Restschicht
     stehen geblieben ist. Genau der gemessene Fall. */
  const tag = await page.evaluate(() => {
    const iso = window.ProbeDaten.alsIso(window.ProbeDaten.tagAls(5));
    window.ProbeDaten.planung[iso] = {
      veroeffentlicht: false, veroeffentlichtUm: null, geaendertSeitdem: false,
      zeilen: window.ProbeDaten.mitarbeiter.map((m, i) => ({
        mitarbeiterId: m.id, imDienst: false, vorlage: null,
        von: i === 0 ? "08:00" : "", bis: i === 0 ? "16:00" : "", fahrzeugId: null
      }))
    };
    return iso;
  });
  await tagesansicht(page, tag);
  const liste = await eintraege(page);

  const gueltige = liste.filter((x) => /^Schicht/.test(x.text));
  pruefe(gueltige.length === 0,
    `keine gültige Schicht, obwohl eine Schichtzeit steht (${gueltige.length})`);
  const konflikte = liste.filter((x) => /^Konflikt/.test(x.text));
  pruefe(konflikte.length === 1, `die Restschicht erscheint als Konflikt (${konflikte.length})`);
  pruefe(/steht auf Frei/.test(konflikte[0].text),
    `mit Begründung (${konflikte[0].text.slice(0, 70)})`);
  pruefe(/08:00–16:00/.test(konflikte[0].text), "und mit der Zeit, die dort steht");

  /* Krank und Urlaub ebenso. */
  const tag2 = await page.evaluate(() => {
    const iso = window.ProbeDaten.alsIso(window.ProbeDaten.heute);
    return iso;
  });
  await tagesansicht(page, tag2);
  const heuteListe = await eintraege(page);
  const krankKonflikt = heuteListe.find((x) => /ist krank/.test(x.text));
  pruefe(Boolean(krankKonflikt), "eine Schicht bei Krankheit erscheint als Konflikt");
  pruefe(/^Konflikt/.test(krankKonflikt.text), "und nicht als Schicht");

  /* Die Bewertung ist dieselbe wie in der Planung. */
  const gleich = await page.evaluate(() => {
    const iso = window.ProbeDaten.alsIso(window.ProbeDaten.heute);
    const plan = window.ProbeDaten.planung[iso];
    const kalender = window.ProbeDaten.schichtenAmTag(iso);
    /* Zeilen mit Zeit, die die Planung als Dienst sieht. */
    const ausPlanung = plan.zeilen.filter((z) => {
      if (!z.von || !z.bis) return false;
      const a = window.ProbeDaten.abwesenheitFuer(z.mitarbeiterId, iso);
      const st = a.wirksam && !z.ausnahme ? a.wirksam.art : (z.imDienst ? "dienst" : "frei");
      return st === "dienst";
    }).length;
    const ausKalender = kalender.filter((s) => s.befund.gueltig).length;
    return { ausPlanung, ausKalender };
  });
  pruefe(gleich.ausPlanung === gleich.ausKalender,
    `Kalender und Planung bewerten gleich (${gleich.ausKalender} / ${gleich.ausPlanung})`);

  /* Eine bestaetigte Ausnahme bleibt erlaubt und wird benannt. */
  const mitAusnahme = await page.evaluate(() => {
    const iso = window.ProbeDaten.alsIso(window.ProbeDaten.heute);
    const z = window.ProbeDaten.planung[iso].zeilen.find((x) => x.mitarbeiterId === "M02");
    z.ausnahme = { grund: "Testgrund: ausdrücklich gewünscht" };
    z.imDienst = true;
    const s = window.ProbeDaten.schichtenAmTag(iso).find((x) => x.zeile.mitarbeiterId === "M02");
    return { gueltig: s.befund.gueltig, konflikt: s.befund.konflikt, ausnahme: s.befund.ausnahme };
  });
  pruefe(mitAusnahme.gueltig === true, "eine bestätigte Ausnahme gilt als Schicht");
  pruefe(mitAusnahme.ausnahme === true, "und ist als Ausnahme gekennzeichnet");
  pruefe(/bestätigte Ausnahme/.test(mitAusnahme.konflikt),
    `sie wird ausdrücklich benannt (${mitAusnahme.konflikt})`);

  /* Die Abwesenheit selbst bleibt unangetastet. */
  const abw = await page.evaluate(() => {
    const iso = window.ProbeDaten.alsIso(window.ProbeDaten.heute);
    return window.ProbeDaten.abwesenheitFuer("M02", iso).wirksam.art;
  });
  pruefe(abw === "krank", "die Abwesenheit selbst ist unverändert");
  await ctx.close();
}

/* ═══ 3. Krankheit und Urlaub öffnen den konkreten Vorgang ══════ */
console.log("\n── 3. Der Klick führt zum Vorgang, nicht in einen Bereich ──");
{
  const { ctx, page } = await seite("admin");
  await tagesansicht(page);
  const liste = await eintraege(page);

  const krank = liste.find((x) => /Krank/.test(x.text) && /^Abwesenheit/.test(x.text));
  pruefe(Boolean(krank), "es gibt einen Krankheitseintrag");
  pruefe(/^kal-ziel:meldungen:vorgang-/.test(krank.tun),
    `er führt zu einem konkreten Vorgang (${krank.tun})`);
  pruefe(!/kal-ziel:team/.test(krank.tun), "und nicht mehr nach „Fahrer & Fahrzeuge“");

  const urlaub = liste.find((x) => /Urlaub/.test(x.text) && /^Abwesenheit/.test(x.text));
  pruefe(Boolean(urlaub), "es gibt einen Urlaubseintrag");
  pruefe(/^kal-ziel:meldungen:vorgang-/.test(urlaub.tun),
    `er führt ebenfalls zum Vorgang (${urlaub.tun})`);

  /* Und der Vorgang geht wirklich auf. */
  await page.click(`[data-tun="${krank.tun}"]`);
  await page.waitForTimeout(700);
  pruefe(await page.evaluate(() => window.ProbeRahmen.zustand.bereich) === "meldungen",
    "der Klick wechselt in die Meldungen");
  pruefe(await page.evaluate(() => window.ProbeRahmen.dialogOffen()),
    "und öffnet einen Dialog");
  const titel = (await page.textContent(".dialog-kopf h2")).trim();
  pruefe(/Krankmeldung/.test(titel), `genau den Krankheitsvorgang (${titel})`);
  await ctx.close();
}

/* ═══ 4. Rollenrechte bleiben beim Sprung erhalten ══════════════ */
console.log("\n── 4. Der Sprung öffnet keine Tür ──");
{
  const { ctx, page } = await seite("dispatcher");
  await tagesansicht(page);
  const liste = await eintraege(page);
  const krank = liste.find((x) => /Krank/.test(x.text) && /^Abwesenheit/.test(x.text));
  pruefe(Boolean(krank), "die Disposition sieht den Krankheitseintrag");
  await page.click(`[data-tun="${krank.tun}"]`);
  await page.waitForTimeout(700);

  const inhalt = (await page.textContent(".dialog-kasten")).replace(/\s+/g, " ");
  pruefe(/Zeitraum/.test(inhalt), "sie sieht den Zeitraum");
  pruefe(/Planungswirkung/.test(inhalt), "und die Planungswirkung");
  pruefe(!/\.pdf/i.test(inhalt), "aber keinen Dateinamen");
  pruefe(!/Prüfergebnis festhalten/.test(inhalt), "kein Prüfergebnis");
  pruefe(!/Alles in Ordnung|Zeitraum weicht ab|Nicht lesbar/.test(inhalt),
    "und kein Ergebniswert");
  pruefe(/gehört nicht zu Ihrer Rolle/.test(inhalt), "sie bekommt das gesagt");
  await ctx.close();

  /* Die Buchhaltung bekommt den Kalender gar nicht. */
  const b = await seite("accounting");
  const sichtbar = await b.page.evaluate(() =>
    window.ProbeRahmen.BEREICHE.filter((x) => window.ProbeRahmen.darf(x.braucht)).map((x) => x.id));
  pruefe(!sichtbar.includes("kalender"), "die Buchhaltung sieht den Kalender nicht");
  await b.ctx.close();
}

/* ═══ 5. Mehrere Vorgänge: Auswahl statt Raten ══════════════════ */
console.log("\n── 5. Bei mehreren Vorgängen wird gefragt ──");
{
  const { ctx, page } = await seite("personal");

  /* Einen zweiten Krankheitsvorgang fuer M02 im selben Zeitraum. */
  const zahl = await page.evaluate(() => {
    const iso = window.ProbeDaten.alsIso(window.ProbeDaten.heute);
    const v = window.ProbeDaten.vorgangVon("V0008");
    v.daten.von = iso;
    v.daten.bis = iso;
    return window.ProbeDaten.vorgaengeZuAbwesenheit("M02", iso, "krank").length;
  });
  pruefe(zahl === 2, `es gibt jetzt zwei passende Vorgänge (${zahl})`);

  await tagesansicht(page);
  const liste = await eintraege(page);
  const krank = liste.find((x) => /Krank/.test(x.text) && /^Abwesenheit/.test(x.text));
  pruefe(/kal-ziel:meldungen:auswahl-/.test(krank.tun),
    `der Eintrag führt in eine Auswahl (${krank.tun})`);

  await page.click(`[data-tun="${krank.tun}"]`);
  await page.waitForTimeout(700);
  const inhalt = (await page.textContent(".dialog-kasten")).replace(/\s+/g, " ");
  pruefe(/Mehrere Vorgänge passen/.test(inhalt), "es erscheint eine Auswahl");
  pruefe(/Es wird nicht geraten/.test(inhalt), "sie sagt, dass nicht geraten wird");
  const karten = await page.$$eval(".wahlkarte", (n) => n.map((x) => x.textContent.replace(/\s+/g, " ").trim()));
  pruefe(karten.length === 2, `beide Vorgänge stehen zur Wahl (${karten.length})`);
  pruefe(karten.every((x) => /V\d{4}/.test(x)), "jeder mit Vorgangsnummer");
  pruefe(karten.every((x) => /Gemeldet \d{2}\.\d{2}\.\d{4} bis/.test(x)), "mit Zeitraum");
  pruefe(karten.every((x) => /Stand:/.test(x)), "und mit Zustand");

  await page.click(".wahlkarte");
  await page.waitForTimeout(600);
  pruefe(/Krankmeldung|Frühere Krankmeldung/.test(await page.textContent(".dialog-kopf h2")),
    "die Wahl öffnet den gewählten Vorgang");
  await ctx.close();
}

/* ═══ 6. Kein Vorgang: ehrlicher Hinweis ═══════════════════════ */
console.log("\n── 6. Kein Vorgang, kein Sprung ──");
{
  const { ctx, page } = await seite("personal");

  /* Eine Abwesenheit ohne Vorgang. */
  const tag = await page.evaluate(() => {
    const iso = window.ProbeDaten.alsIso(window.ProbeDaten.tagAls(9));
    window.ProbeDaten.abwesenheiten.push({
      id: "AB99", mitarbeiterId: "M04", art: "krank", status: "gemeldet",
      von: iso, bis: iso
    });
    return iso;
  });
  await tagesansicht(page, tag);
  const liste = await eintraege(page);
  const krank = liste.find((x) => /Krank/.test(x.text) && /^Abwesenheit/.test(x.text));
  pruefe(Boolean(krank), "der Eintrag ist da");
  pruefe(krank.tun === "", "es gibt keinen Öffnen-Knopf");
  pruefe(/keinen Vorgang/.test(krank.leer),
    `stattdessen ein ehrlicher Hinweis (${krank.leer})`);
  await ctx.close();
}

/* ═══ 7. Fahrzeugtermine öffnen die Fahrzeugakte ════════════════ */
console.log("\n── 7. Der Termin öffnet das Fahrzeug ──");
{
  const { ctx, page } = await seite("admin");
  const tuev = await page.evaluate(() =>
    window.ProbeDaten.fahrzeuge.find((x) => x.id === "F02").tuev);
  await tagesansicht(page, tuev);
  const liste = await eintraege(page);
  const termin = liste.find((x) => /^Fahrzeug/.test(x.text));
  pruefe(Boolean(termin), "der Fahrzeugtermin steht da");
  pruefe(/Testwagen 02/.test(termin.text), "mit dem Fahrzeugnamen");
  pruefe(/GER-TEST 002/.test(termin.text), "mit dem Kennzeichen");
  pruefe(/TÜV fällig/.test(termin.text), "mit der Art des Termins");
  pruefe(/kal-ziel:team:fahrzeug-F02-tuev/.test(termin.tun),
    `er führt über die stabile Kennung (${termin.tun})`);
  pruefe(!/GER-TEST/.test(termin.tun), "nicht über das Kennzeichen");

  await page.click(`[data-tun="${termin.tun}"]`);
  await page.waitForTimeout(700);
  pruefe(await page.evaluate(() => window.ProbeRahmen.dialogOffen()),
    "es öffnet sich die Fahrzeugakte");
  const akte = (await page.textContent(".dialog-kasten")).replace(/\s+/g, " ");
  pruefe(/Testwagen 02/.test(akte), "sie nennt den Fahrzeugnamen");
  pruefe(/GER-TEST 002/.test(akte), "das Kennzeichen");
  pruefe(/KennungF02/.test(akte.replace(/\s/g, "")), "die stabile Kennung");
  pruefe(/TÜV steht an/.test(akte), "die Art des angefragten Termins");
  pruefe(/aus dem Kalender/.test(akte), "und dass er hervorgehoben ist");
  pruefe(/23\.10\.2026|\d{2}\.\d{2}\.\d{4}/.test(akte), "die Frist mit Datum");
  pruefe(/Aktueller Zustand/.test(akte), "den aktuellen Fahrzeugzustand");
  pruefe(/nicht hinterlegt/.test(akte), "und was die Probe nicht hat");

  /* Ein gesperrtes Fahrzeug nennt seinen Grund. */
  await page.evaluate(() => window.ProbeRahmen.dialogSchliessen(true));
  await page.waitForTimeout(300);
  const gesperrt = await page.evaluate(() => {
    const f = window.ProbeDaten.fahrzeuge.find((x) => x.zustand === "gesperrt");
    return f ? { id: f.id, grund: f.sperrgrund } : null;
  });
  pruefe(Boolean(gesperrt), "es gibt ein gesperrtes Fahrzeug");
  await page.evaluate((id) => {
    window.ProbeTeam.sprungziel("fahrzeug-" + id + "-tuev");
    window.ProbeRahmen.geheZu("team");
  }, gesperrt.id);
  await page.waitForTimeout(700);
  const akte2 = (await page.textContent(".dialog-kasten")).replace(/\s+/g, " ");
  pruefe(/Sperre/.test(akte2), "die Akte nennt die Sperre");
  pruefe(new RegExp(gesperrt.grund.slice(0, 20)).test(akte2),
    `mit ihrem Grund (${gesperrt.grund})`);

  /* Fehlt die Kennung, wird nicht geraten. */
  const ohne = await page.evaluate(() => {
    window.ProbeTeam.sprungziel("fahrzeug-F999-tuev");
    return true;
  });
  pruefe(ohne, "ein Sprung auf eine unbekannte Kennung wird abgewiesen");
  await ctx.close();

  /* Ohne fleet.read kein Fahrzeug. */
  const b = await seite("personal");
  await b.page.evaluate(() => {
    window.ProbeTeam.sprungziel("fahrzeug-F02-tuev");
    window.ProbeRahmen.geheZu("team");
  });
  await b.page.waitForTimeout(600);
  const offenB = await b.page.evaluate(() => window.ProbeRahmen.dialogOffen());
  pruefe(!offenB, "ohne fleet.read öffnet sich keine Fahrzeugakte");
  await b.ctx.close();
}

/* ═══ 8. Filter und offene Planungseingaben (Regression) ════════ */
console.log("\n── 8. Was bestanden hat, bleibt bestanden ──");
{
  const { ctx, page } = await seite("admin");
  await tagesansicht(page);
  const vorher = await eintraege(page);

  /* Fahrzeuge aus - nur Fahrzeugtermine verschwinden. */
  await page.click('[data-tun="kal-art:fahrzeug"]');
  await page.waitForTimeout(400);
  const ohneFz = await eintraege(page);
  pruefe(!ohneFz.some((x) => /^Fahrzeug/.test(x.text)), "„Fahrzeuge“ aus entfernt Fahrzeugtermine");
  pruefe(ohneFz.filter((x) => /^Abwesenheit/.test(x.text)).length
    === vorher.filter((x) => /^Abwesenheit/.test(x.text)).length,
    "die Abwesenheiten bleiben");
  pruefe(ohneFz.filter((x) => /^Schicht/.test(x.text)).length
    === vorher.filter((x) => /^Schicht/.test(x.text)).length,
    "die Schichten bleiben");
  await page.click('[data-tun="kal-art:fahrzeug"]');
  await page.waitForTimeout(350);

  /* Fahrten aus - nur Fahrten verschwinden. */
  await page.click('[data-tun="kal-art:fahrt"]');
  await page.waitForTimeout(400);
  const ohneFahrt = await eintraege(page);
  pruefe(!ohneFahrt.some((x) => /^Fahrten/.test(x.text)), "„Fahrten“ aus entfernt Fahrten");
  pruefe(ohneFahrt.some((x) => /^Schicht/.test(x.text)), "die Schichten bleiben");
  await page.click('[data-tun="kal-art:fahrt"]');
  await page.waitForTimeout(350);

  /* Konflikte lassen sich eigens ausblenden. */
  pruefe(Boolean(await page.$('[data-tun="kal-art:konflikt"]')),
    "es gibt einen Filter für Konflikte");
  await page.click('[data-tun="kal-art:konflikt"]');
  await page.waitForTimeout(400);
  pruefe(!(await eintraege(page)).some((x) => /^Konflikt/.test(x.text)),
    "er entfernt nur die Konflikte");
  await page.click('[data-tun="kal-art:konflikt"]');
  await page.waitForTimeout(350);

  /* Kein Filter aendert Daten. */
  const planVorher = await page.evaluate(() => JSON.stringify(window.ProbeDaten.planung));
  await page.click('[data-tun="kal-art:schicht"]');
  await page.waitForTimeout(350);
  await page.click('[data-tun="kal-art:schicht"]');
  await page.waitForTimeout(350);
  pruefe(planVorher === await page.evaluate(() => JSON.stringify(window.ProbeDaten.planung)),
    "kein Filter verändert den Plan");

  /* Eine ungespeicherte Planungseingabe uebersteht den Kalender. */
  await page.evaluate(() => window.ProbeRahmen.geheZu("planung"));
  await page.waitForTimeout(500);
  const feld = await page.$('[data-zeit][data-kennung="M01"][data-teil="von"]')
    || await page.$("[data-zeit]");
  pruefe(Boolean(feld), "die Planung hat Zeitfelder");
  await feld.click();
  await page.evaluate(() => new Promise((f) => requestAnimationFrame(() => requestAnimationFrame(f))));
  await page.fill("[data-zeit]", "");
  await page.evaluate(() => new Promise((f) => requestAnimationFrame(() => requestAnimationFrame(f))));
  await page.type("[data-zeit]", "05:45", { delay: 40 });
  const getippt = await page.inputValue("[data-zeit]");
  pruefe(getippt === "05:45", `die Eingabe steht im Feld (${getippt})`);

  await page.evaluate(() => window.ProbeRahmen.geheZu("kalender"));
  await page.waitForTimeout(400);
  await page.click('[data-tun="kal-vor"]');
  await page.waitForTimeout(350);
  await page.click('[data-tun="kal-zurueck"]');
  await page.waitForTimeout(350);
  await page.evaluate(() => window.ProbeRahmen.geheZu("planung"));
  await page.waitForTimeout(500);
  const danach = await page.inputValue("[data-zeit]");
  pruefe(danach === "05:45",
    `die ungespeicherte Eingabe übersteht Kalender und Blättern (${danach})`);

  /* Und der Kalender hat den Tagesentwurf nicht umgeschaltet. */
  const iso = await page.evaluate(() =>
    window.ProbeRahmen.zustand.planEntwurf ? window.ProbeRahmen.zustand.planEntwurf.iso : "");
  pruefe(iso === await heute(page), `der Tagesentwurf steht weiter auf heute (${iso})`);
  await ctx.close();
}

/* ═══ 9. Darstellung und Netz ═══════════════════════════════════ */
console.log("\n── 9. Darstellung, Netz ──");
for (const [breite, hoehe] of [[320, 568], [390, 844], [430, 932], [1440, 900]]) {
  const { ctx, page } = await seite("admin", breite, hoehe);
  await tagesansicht(page);
  const ueber = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  pruefe(ueber <= 0, `bei ${breite}px kein waagerechter Überlauf (${ueber}px)`);
  await ctx.close();
}

pruefe(fremdeAnfragen.length === 0,
  `keine einzige Anfrage nach aussen im ganzen Lauf (${fremdeAnfragen.length})`);
{
  const kal = await readFile(join(PROBE, "probe-kalender.js"), "utf8");
  const ohneKommentar = kal.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
  pruefe(!/fetch\s*\(|new XMLHttpRequest|createClient\s*\(/i.test(ohneKommentar),
    "kein Netzzugriff im Kalendermodul");
  /* Der Kalender fasst den Tagesentwurf nicht an. */
  pruefe(!/planEntwurf\s*\(/.test(ohneKommentar),
    "der Kalender ruft planEntwurf() nicht auf");
  /* Keine Verknuepfung ueber Kennzeichen. */
  pruefe(!/fahrzeug-\$\{[^}]*kennzeichen/.test(ohneKommentar),
    "kein Sprungziel über das Kennzeichen");
}

await browser.close();
server.close();

console.log("\n" + "═".repeat(59));
console.log(`Kalenderwege: ${bestanden} bestanden, ${offen.length} nicht bestanden`);
if (offen.length) {
  console.log("\nNicht bestanden:");
  for (const n of offen) console.log("  - " + n);
}
console.log(`
ALLES SIMULIERT. Keine Datenquelle, kein Upload, kein Versand. Dieser
Lauf sagt nichts ueber die produktive Instanz.`);
console.log("═".repeat(59));
process.exit(offen.length ? 1 : 0);
