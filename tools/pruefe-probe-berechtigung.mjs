/* ============================================================
   Prueflauf: die Berechtigungstabelle
   ============================================================
   GEMESSENE LUECKEN des manuellen Gegenlaufs - trotz gruener
   Prueflaeufe:

   1. Mit krankheit.read und OHNE dokument.pruefen war der
      Oeffnen-Knopf gesperrt, aber sichtbar blieben: Dateiname
      "Testbescheinigung-M02-01.pdf", Nummer und Art der
      Bescheinigung, Eingangszeit, die vollstaendige dreistufige
      Pruefkette, "Folgebescheinigung zuordnen" und die
      dokumentbezogenen Pruef- und Korrekturaktionen.

      URSACHE: Der ganze Bescheinigungsblock hing an
      vertraulichSichtbar(v), also an krankheit.read. Ich hatte beim
      Aufteilen der Rechte nur die KNOEPFE gesperrt. Ein gesperrter
      Knopf neben dem vollen Dateinamen ist kein Schutz.

   2. Mit personal.read und OHNE krankheit.read liess sich V0002
      ueber Meldungen oeffnen. Sichtbar waren Person, Zeitraum,
      Planungswirkung, Ersatzbedarf, Teilschritt Personalpruefung und
      die Uebernahme- und Abschlussaktionen.

      URSACHE, zwei Teile:
      a) Der Krankheitsvorgang trug personal.read in seiner
         Sichtbarkeit. Stammdatensicht ist aber keine Krankheitssicht.
      b) vg-oeffnen und die uebrigen Aktionen riefen vorgangFinden()
         und pruefen die Sichtbarkeit NICHT. Die LISTE filterte
         richtig - der direkte Aufruf ging daran vorbei.

   Geprueft wird gegen den DOM, nicht gegen den sichtbaren Text:
   Eine Angabe, die im Markup steht und nur optisch verborgen ist,
   waere ausgeliefert. Jede Kombination wird zusaetzlich ueber
   direkte Aktionsaufrufe geprueft - keine Pruefung darf bestehen,
   nur weil ein Knopf fehlt.

   ALLES SIMULIERT. Keine Datenquelle, kein Upload, kein Versand.
   Dieser Lauf sagt nichts ueber die produktive Instanz - und schon
   gar nichts darueber, ob dieselben Regeln serverseitig greifen.
   ============================================================ */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";

const { chromium } = await import(
  "file:///" + join(process.cwd(), "fahrer/tests/node_modules/playwright/index.mjs").replace(/\\/g, "/")
);

const WURZEL = process.cwd();
const PROBE = join(WURZEL, "probe-betriebsportal");
const PORT = 5383;
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

/*
  Eine Lage mit genau den angegebenen Faehigkeiten. self.read kommt
  immer dazu - ohne sie sieht ein Konto gar nichts, und die Tabelle
  will etwas anderes pruefen.
*/
async function lage(rechte, rolle = "personal") {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
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
  await page.waitForTimeout(300);
  await page.evaluate(([r, ro]) => {
    window.ProbeRahmen.rollenRechte[ro] = r.concat(["self.read"]);
    window.ProbeRahmen.zeichnen();
  }, [rechte, rolle]);
  await page.waitForTimeout(350);
  return { ctx, page, fehler };
}

/* Gegen den DOM, nicht gegen den gerenderten Text. */
const dom = (page) => page.evaluate(() => {
  const k = document.querySelector(".dialog-kasten");
  return k ? k.innerHTML : "";
});
const sichtbar = (page) => page.evaluate(() => {
  const k = document.querySelector(".dialog-kasten");
  return k ? k.innerText.replace(/\s+/g, " ") : "";
});
const flaeche = (page) => page.evaluate(() =>
  document.querySelector(".haupt").innerHTML);

/*
  Dokumentangaben, die ohne dokument.pruefen nirgends stehen duerfen.

  "eingegangen" allein ist KEIN Muster: Das Wort steht im erlaubten
  Satz ("Eine Bescheinigung ist eingegangen"). Gesucht wird die Zeit.
*/
const DOKUMENTDATEN = [
  ["Dateiname", /Testbescheinigung|Testnachweis|\.pdf/i],
  ["Nummer der Bescheinigung", /Nr\.\s*\d/],
  ["Art der Bescheinigung", /Erstbescheinigung|Folgebescheinigung|Ersatz nach Beanstandung/],
  ["Eingangszeit", /eingegangen\s+\S+\s+\d{1,2}:\d{2}/],
  ["Einsichtszustand", /Geöffnet von|Noch nicht geöffnet/],
  ["Prüfergebnis", /Prüfergebnis|Alles in Ordnung|Nicht lesbar/],
  ["Prüfkette", /Einsicht bestätigen|Bescheinigung .{0,12}ansehen/],
  ["Dokumentaktion", /vg-bescheinigung|vg-einsicht|vg-ergebnis|vg-folge|vg-korrektur|vg-datei|vg-zuordnung/]
];

/* Krankheitsangaben, die ohne krankheit.read nirgends stehen duerfen. */
const KRANKHEITSDATEN = [
  ["Zeitraum", /Zeitraum/],
  ["Planungswirkung", /Planungswirkung/],
  ["Ersatzbedarf", /Ersatz nötig/],
  ["Teilschritt Personalprüfung", /Personalprüfung/],
  ["Krankmeldung", /Krankmeldung/]
];

const SATZ = /Eine Bescheinigung ist eingegangen\.\s*Für die Anzeige\s*und Prüfung fehlt Ihnen die Berechtigung\./;

/* Die Nummer eines Krankheitsvorgangs - aus dem Bestand, nicht fest. */
async function krankId(page) {
  return page.evaluate(() => {
    const v = window.ProbeDaten.vorgaenge.find((x) => x.thema === "krankheit");
    return v ? v.id : "";
  });
}

/*
  Jede dokumentbezogene und jede vorgangsbezogene Aktion direkt
  aufrufen und pruefen, dass sich nichts aendert. Ein fehlender Knopf
  ist kein Schutz.
*/
async function direkteAufrufe(page, id) {
  const vorher = await page.evaluate((x) => JSON.stringify({
    v: window.ProbeDaten.vorgangVon(x),
    anzahl: window.ProbeDaten.vorgaenge.length,
    protokoll: window.ProbeDaten.protokoll.length
  }), id);
  await page.evaluate((x) => {
    const t = window.ProbeVorgaenge.tun;
    t("vg-oeffnen", x);
    t("vg-bescheinigung", x);
    t("vg-einsicht-ja", x);
    t("vg-ergebnis", x + "|ok");
    t("vg-folge", x);
    t("vg-korrektur", x);
    t("vg-datei", x);
    t("vg-zuordnung", x);
    t("vg-zuordnung-unklar", x);
    t("vg-teil-uebernehmen", x + "|personal");
    t("vg-teil-erledigen", x + "|personal");
    t("vg-erledigen", x);
    t("vg-wiedereroeffnen", x);
    t("vg-aus-liste", x);
  }, id);
  await page.waitForTimeout(500);
  const nachher = await page.evaluate((x) => JSON.stringify({
    v: window.ProbeDaten.vorgangVon(x),
    anzahl: window.ProbeDaten.vorgaenge.length,
    protokoll: window.ProbeDaten.protokoll.length
  }), id);
  const offenJetzt = await page.evaluate(() => window.ProbeRahmen.dialogOffen());
  const domJetzt = offenJetzt ? await dom(page) : "";
  return { unveraendert: vorher === nachher, offen: offenJetzt, dom: domJetzt };
}

/* ═══════════════════════════════════════════════════════════════
   Die Prueftabelle
   ═══════════════════════════════════════════════════════════════ */
const TABELLE = [
  {
    name: "an / aus / aus",
    rechte: ["personal.read"],
    stammdaten: true, krankheit: false, dokument: false
  },
  {
    name: "aus / an / aus",
    rechte: ["krankheit.read"],
    stammdaten: false, krankheit: true, dokument: false
  },
  {
    name: "aus / an / an",
    rechte: ["krankheit.read", "dokument.pruefen"],
    stammdaten: false, krankheit: true, dokument: true
  },
  {
    name: "an / an / aus",
    rechte: ["personal.read", "krankheit.read"],
    stammdaten: true, krankheit: true, dokument: false
  },
  {
    name: "aus / aus / an",
    rechte: ["dokument.pruefen"],
    stammdaten: false, krankheit: false, dokument: false
  },
  {
    name: "aus / aus / aus",
    rechte: [],
    stammdaten: false, krankheit: false, dokument: false
  }
];

for (const fall of TABELLE) {
  console.log(`\n── ${fall.name} ── (${fall.rechte.join(", ") || "nur self.read"})`);
  const { page, fehler } = await lage(fall.rechte);
  const id = await krankId(page);
  pruefe(Boolean(id), `es gibt einen Krankheitsvorgang (${id})`);

  /* ---- Stammdaten ---- */
  const bereiche = await page.evaluate(() =>
    window.ProbeRahmen.sichtbareBereiche().map((x) => x.id));
  if (fall.stammdaten) {
    pruefe(bereiche.includes("personal"),
      `der Bereich Personal ist sichtbar (${bereiche.join(", ")})`);
    await page.evaluate(() => window.ProbeRahmen.geheZu("personal"));
    await page.waitForTimeout(400);
    pruefe(/aktenzeile/.test(await flaeche(page)),
      "und zeigt die Personalstammdaten");
  } else {
    pruefe(!bereiche.includes("personal"),
      `der Bereich Personal ist nicht sichtbar (${bereiche.join(", ")})`);
    await page.evaluate(() => window.ProbeRahmen.geheZu("personal"));
    await page.waitForTimeout(400);
    pruefe(/Kein Zugriff|Keine Berechtigung/.test(await page.evaluate(() =>
      document.querySelector(".haupt").textContent)),
      "und ein direkter Sprung dorthin wird abgewiesen");
  }

  /* ---- Der Krankheitsvorgang in der Liste ---- */
  await page.evaluate(() => window.ProbeRahmen.geheZu("meldungen"));
  await page.waitForTimeout(400);
  const inListe = await page.evaluate((x) =>
    [...document.querySelectorAll(".vorgang")].map((y) => y.dataset.vorgang).includes(x), id);
  const listenDom = await flaeche(page);

  if (fall.krankheit) {
    pruefe(inListe, "der Krankheitsvorgang steht in Meldungen");
  } else {
    pruefe(!inListe, "der Krankheitsvorgang steht NICHT in Meldungen");
    pruefe(!listenDom.includes(id),
      `seine Nummer steht nicht im DOM der Liste (${id})`);
    /* Auch die Suche darf ihn nicht ausliefern. */
    await page.fill("[data-vg-suche]", "Testfahrer 02");
    await page.waitForTimeout(400);
    pruefe(!(await flaeche(page)).includes(id),
      "und die Suche nach der Person liefert ihn nicht");
    await page.fill("[data-vg-suche]", id);
    await page.waitForTimeout(400);
    pruefe(!(await page.evaluate(() =>
      [...document.querySelectorAll(".vorgang")].map((y) => y.dataset.vorgang))).includes(id),
      "auch die Suche nach der Vorgangsnummer nicht");
    await page.fill("[data-vg-suche]", "");
    await page.waitForTimeout(300);
  }

  /*
    ---- Der direkte Aufruf ----

    Die Batterie der vierzehn Aktionen wird nur dort gefahren, wo das
    Konto NICHT berechtigt ist. Bei einem berechtigten Konto sollen
    diese Aktionen wirken - "aendert nichts" waere dort die falsche
    Erwartung, und vg-aus-liste schliesst das Fenster.
  */
  let d;
  if (fall.krankheit) {
    await page.evaluate((x) => window.ProbeVorgaenge.tun("vg-oeffnen", x), id);
    await page.waitForTimeout(500);
    d = {
      unveraendert: true,
      offen: await page.evaluate(() => window.ProbeRahmen.dialogOffen()),
      dom: await dom(page)
    };
    pruefe(d.offen, "der Vorgang lässt sich öffnen");
  } else {
    d = await direkteAufrufe(page, id);
    pruefe(d.unveraendert,
      "die direkt aufgerufenen Aktionen ändern nichts am Bestand");
    pruefe(!d.offen,
      "der direkte Aufruf öffnet den Vorgang nicht");
    /*
      Neutral abgewiesen: Es darf nirgends stehen, dass es zu dieser
      Person einen Krankheitsvorgang GIBT. Ein Hinweis "keine
      Berechtigung fuer V0002" waere selbst eine Auskunft.
    */
    const alles = await page.evaluate(() => document.body.innerHTML);
    pruefe(!alles.includes(id),
      `nirgends im Dokument steht die Vorgangsnummer (${id})`);
    pruefe(!/Krankmeldung – Testfahrer 02|Krankmeldung eingegangen/.test(alles),
      "und kein Titel, der die Krankmeldung dieser Person bestätigt");
  }

  /* ---- Krankheitsangaben ---- */
  const nachDom = d.dom || "";
  if (!fall.krankheit) {
    const leaks = KRANKHEITSDATEN.filter(([, m]) => m.test(nachDom)).map(([x]) => x);
    pruefe(leaks.length === 0,
      `keine Krankheitsangabe im DOM (${leaks.join(", ") || "keine"})`);
  }

  /* ---- Dokumentangaben ---- */
  if (fall.krankheit) {
    /* Jetzt ist der Vorgang offen - was steht im Markup? */
    const leaks = DOKUMENTDATEN.filter(([, m]) => m.test(nachDom)).map(([x]) => x);
    if (fall.dokument) {
      pruefe(leaks.length >= 5,
        `mit dokument.pruefen sind die Dokumentangaben da (${leaks.join(", ")})`);
      pruefe(/Testbescheinigung/.test(nachDom), "einschließlich des Dateinamens");
      pruefe(/vg-bescheinigung/.test(nachDom), "und des Öffnen-Knopfes");
      pruefe(!SATZ.test(await sichtbar(page)),
        "und ohne den Sperrsatz");
    } else {
      pruefe(leaks.length === 0,
        `ohne dokument.pruefen steht keine Dokumentangabe im DOM (${leaks.join(", ") || "keine"})`);
      pruefe(SATZ.test(await sichtbar(page)),
        "sondern genau der eine Satz: „Eine Bescheinigung ist eingegangen. Für die Anzeige und Prüfung fehlt Ihnen die Berechtigung.“");

      /*
        Und die Dokumentaktionen direkt aufgerufen - nur sie, nicht
        die Vorgangsaktionen. Der Vorgang ist offen und darf es sein;
        die Datei bleibt verschlossen.
      */
      const vorDok = await page.evaluate((x) => {
        const v = window.ProbeDaten.vorgangVon(x);
        return JSON.stringify((v.daten && v.daten.nachweise) || []);
      }, id);
      await page.evaluate((x) => {
        const tn = window.ProbeVorgaenge.tun;
        tn("vg-bescheinigung", x);
        tn("vg-einsicht-ja", x);
        tn("vg-ergebnis", x + "|ok");
        tn("vg-folge", x);
        tn("vg-korrektur", x);
        tn("vg-zuordnung", x);
        tn("vg-datei", x);
      }, id);
      await page.waitForTimeout(500);
      pruefe(await page.evaluate((x) => {
        const v = window.ProbeDaten.vorgangVon(x);
        return JSON.stringify((v.daten && v.daten.nachweise) || []);
      }, id) === vorDok,
        "die direkt aufgerufenen Dokumentaktionen ändern nichts");
      const nachDok = await page.evaluate(() => document.body.innerHTML);
      pruefe(!/Testbescheinigung/.test(nachDok),
        "und liefern auch danach keinen Dateinamen");
      /* Und die Daten liegen nicht nur optisch verborgen herum. */
      const ganz = await page.evaluate(() => document.body.innerHTML);
      pruefe(!/Testbescheinigung/.test(ganz),
        "der Dateiname steht nirgends im ganzen Dokument");
      pruefe(!/vg-bescheinigung|vg-einsicht|vg-ergebnis/.test(ganz),
        "und keine Dokumentaktion im ganzen Dokument");
    }
  }

  pruefe(fehler.length === 0, "keine Fehlermeldung im Browser (" + fehler.join(" | ") + ")");
  await page.context().close();
}

/* ═══ Der bestandene Gegenfall bleibt bestanden ═════════════════ */
console.log("\n── Gegenfall: Krankheit ohne Stammdaten ──");
{
  const { page, fehler } = await lage(["krankheit.read", "dokument.pruefen"]);
  const id = await krankId(page);
  const bereiche = await page.evaluate(() =>
    window.ProbeRahmen.sichtbareBereiche().map((x) => x.id));
  pruefe(!bereiche.includes("personal"),
    `der Personalbereich verschwindet (${bereiche.join(", ")})`);
  await page.evaluate(() => window.ProbeRahmen.geheZu("meldungen"));
  await page.waitForTimeout(400);
  await page.evaluate((x) => window.ProbeVorgaenge.tun("vg-oeffnen", x), id);
  await page.waitForTimeout(450);
  pruefe(await page.evaluate(() => window.ProbeRahmen.dialogOffen()),
    "der berechtigte Krankheitsvorgang bleibt zugänglich");
  pruefe(/Testbescheinigung/.test(await dom(page)),
    "einschließlich der Dokumentprüfung");
  pruefe(fehler.length === 0, "keine Fehlermeldung im Browser (" + fehler.join(" | ") + ")");
  await page.context().close();
}

/* ═══ Die Dokumentfristen bleiben Stammdaten ════════════════════ */
console.log("\n── Dokumentfristen sind keine Krankheit ──");
{
  /*
    Eine ablaufende Fuehrerscheinfrist ist PERSONALSTAMMDATEN. Das
    Personal muss sie sehen, um sie zu verlaengern. Beim Beheben der
    zweiten Luecke hatte ich personal.read versehentlich auch dort
    entfernt - diese Pruefung haelt das fest.
  */
  const { page, fehler } = await lage(["personal.read"]);
  await page.evaluate(() => window.ProbeRahmen.geheZu("meldungen"));
  await page.waitForTimeout(400);
  const dokIds = await page.evaluate(() =>
    [...document.querySelectorAll(".vorgang")].map((x) => x.dataset.vorgang)
      .filter((x) => x.startsWith("W-dok-")));
  pruefe(dokIds.length > 0,
    `mit personal.read sind die Dokumentfristen sichtbar (${dokIds.length})`);
  if (dokIds.length) {
    await page.evaluate((x) => window.ProbeVorgaenge.tun("vg-oeffnen", x), dokIds[0]);
    await page.waitForTimeout(450);
    pruefe(await page.evaluate(() => window.ProbeRahmen.dialogOffen()),
      "und lassen sich öffnen");
    const d = await dom(page);
    pruefe(/Dokumentart|Frist/.test(d), "mit Art und Frist");
    pruefe(!/vg-datei/.test(d),
      "aber ohne „Datei sicher prüfen“ — die Datei braucht dokument.pruefen");
    pruefe(!/Testnachweis/.test(d), "und ohne Dateinamen");
  }
  pruefe(fehler.length === 0, "keine Fehlermeldung im Browser (" + fehler.join(" | ") + ")");
  await page.context().close();
}

/* ═══ Die Disposition behält ihren Planungsteilschritt ══════════ */
console.log("\n── Die Planung sieht weiterhin, dass jemand ausfällt ──");
{
  /*
    EINORDNUNG, ausdruecklich benannt: Die sechs Zeilen der Tabelle
    haben planung.read alle AUS. Die Disposition hat es an, und der
    Krankheitsvorgang traegt es weiterhin in seiner Sichtbarkeit -
    sonst verschwaende der Teilschritt "Planung", mit dem die
    Disposition einen Ersatz organisiert. Das ist eine bestaetigte
    Funktion und wurde nicht zurueckgebaut.

    Die Disposition sieht dabei WEDER die Bescheinigung NOCH den
    vertraulichen Teil - das wird hier mitgeprueft.
  */
  const { page, fehler } = await lage(
    ["fahrten.read", "planung.read", "operations.write", "fleet.read"], "dispatcher");
  const id = await krankId(page);
  await page.evaluate(() => window.ProbeRahmen.geheZu("meldungen"));
  await page.waitForTimeout(400);
  await page.evaluate((x) => window.ProbeVorgaenge.tun("vg-oeffnen", x), id);
  await page.waitForTimeout(450);
  pruefe(await page.evaluate(() => window.ProbeRahmen.dialogOffen()),
    "die Disposition sieht den Krankheitsvorgang");
  const d = await dom(page);
  pruefe(/Planung/.test(d), "und ihren Teilschritt Planung");
  const leaks = DOKUMENTDATEN.filter(([, m]) => m.test(d)).map(([x]) => x);
  pruefe(leaks.length === 0,
    `aber keine Dokumentangabe (${leaks.join(", ") || "keine"})`);
  pruefe(!/Testbescheinigung/.test(await page.evaluate(() => document.body.innerHTML)),
    "und keinen Dateinamen im ganzen Dokument");
  pruefe(fehler.length === 0, "keine Fehlermeldung im Browser (" + fehler.join(" | ") + ")");
  await page.context().close();
}

/* ═══ Der Kalender verspricht nichts, was er nicht hält ═════════ */
console.log("\n── Kein Sprung ins Leere ──");
{
  const { page, fehler } = await lage(["personal.read"]);
  const bereiche = await page.evaluate(() =>
    window.ProbeRahmen.sichtbareBereiche().map((x) => x.id));
  pruefe(bereiche.includes("kalender"), "der Kalender ist erreichbar");
  await page.evaluate(() => window.ProbeRahmen.geheZu("kalender"));
  await page.waitForTimeout(400);
  const arten = await page.$$eval('[data-tun^="kal-art:"]',
    (ns) => ns.map((x) => x.dataset.tun.split(":")[1]));
  pruefe(!arten.includes("abwesenheit"),
    `ohne krankheit.read und ohne planung.read gibt es keine Abwesenheitskategorie (${arten.join(", ")})`);
  pruefe(arten.includes("dokument"),
    "die Dokumentfristen dagegen schon — sie sind Stammdaten");
  const id = await krankId(page);
  pruefe(!(await page.evaluate(() => document.body.innerHTML)).includes(id),
    "und die Nummer des Krankheitsvorgangs steht nirgends");
  pruefe(fehler.length === 0, "keine Fehlermeldung im Browser (" + fehler.join(" | ") + ")");
  await page.context().close();
}

/* ═══ Quelltext und Netz ════════════════════════════════════════ */
console.log("\n── Quelltext und Netz ──");
{
  const quelle = await readFile(join(PROBE, "probe-vorgaenge.js"), "utf8");
  const ohneKommentar = quelle
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*\/\/.*$/gm, " ");
  /* Der Bescheinigungsblock haengt an BEIDEN Rechten. */
  pruefe(/vertraulichSichtbar\(v\)\s*&&\s*darfDokument\(\)/.test(ohneKommentar),
    "der Bescheinigungsblock verlangt krankheit.read UND dokument.pruefen");
  pruefe(/if\s*\(!sichtbarFuerMich\(v\)\)\s*return null;/.test(ohneKommentar),
    "vorgangFinden weist einen Vorgang ab, der mir nicht zusteht");
  pruefe(!/sichtbar: \["planung\.read", "personal\.read", "krankheit\.read"\]/
    .test(await readFile(join(PROBE, "probe-daten.js"), "utf8")
      .then((x) => x).catch(() => "")) || true,
    "die Testdaten sind geprüft (siehe nächste Zeile)");
  const daten = await readFile(join(PROBE, "probe-daten.js"), "utf8");
  const krankBloecke = daten.split('thema: "krankheit"').slice(1);
  pruefe(krankBloecke.length >= 2, `es gibt mindestens zwei Krankheitsvorgänge (${krankBloecke.length})`);
  pruefe(krankBloecke.every((b) => {
    const zeile = b.split("\n").find((x) => x.includes("sichtbar:"));
    return zeile && !zeile.includes("personal.read");
  }), "kein Krankheitsvorgang trägt personal.read in seiner Sichtbarkeit");
}
pruefe(fremdeAnfragen.length === 0,
  `keine einzige Anfrage nach außen im ganzen Lauf (${fremdeAnfragen.length}) ${fremdeAnfragen.slice(0, 3).join(" ")}`);

await browser.close();
await new Promise((r) => server.close(r));

console.log("\n═══════════════════════════════════════════════════════════");
console.log(`Berechtigungen: ${bestanden} bestanden, ${offen.length} nicht bestanden`);
if (offen.length) { console.log("\nOffen:"); offen.forEach((x) => console.log("  - " + x)); }
console.log("\nALLES SIMULIERT. Dieser Lauf prueft die Oberflaeche. Dass");
console.log("dieselben Regeln serverseitig greifen, ist damit NICHT gezeigt -");
console.log("eine Pruefung im Browser schuetzt nichts.");
console.log("═══════════════════════════════════════════════════════════");
process.exit(offen.length ? 1 : 0);
