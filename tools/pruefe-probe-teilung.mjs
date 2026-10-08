/* ============================================================
   Prueflauf: Teilschritte, Uebernahme, Archiv und Kalender
   ============================================================
   Prueft die sechs Befunde des manuellen Tests und die Ergaenzung
   zur Administration:

   1. Ein Krankheitsvorgang zerfaellt in Planung und Personalpruefung.
      Die Disposition schliesst NIE den ganzen Vorgang.
   2. Erledigte Vorgaenge bleiben auffindbar, wandern nach 90 Tagen ins
      Archiv und werden nie geloescht. Wiedereroeffnung braucht einen
      Grund.
   3. Es gibt keinen Selbstberechtigungsschalter.
   4. Die Planung erreicht jeden Tag, nicht nur heute und morgen.
   5. Der Kalender zeigt rollenabhaengig - und nie eine medizinische
      Angabe.
   6. Administration darf uebernehmen, aber nur als sie selbst, mit
      Grund und mit sichtbarer Vorgeschichte.

   ALLES SIMULIERT. Keine Datenquelle, kein Upload, kein Versand.
   Dieser Lauf sagt nichts ueber die produktive Instanz.
   ============================================================ */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";

const { chromium } = await import(
  "file:///" + join(process.cwd(), "fahrer/tests/node_modules/playwright/index.mjs").replace(/\\/g, "/")
);

const WURZEL = process.cwd();
const PROBE = join(WURZEL, "probe-betriebsportal");
/* Eigener Port. Drei Prueflaeufe teilten sich vorher einen und
   haben sich im Stapel gegenseitig die Navigation abgewuergt. */
const PORT = 5385;
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

/*
  Ein Datum setzen, wie ein Mensch es tut.

  Die nativen Datumsfelder sind portalweit ersetzt: Sie sprangen beim
  Tippen des Jahres zurueck zum Tag. page.fill() mit einem ISO-Datum
  geht am neuen Feld vorbei - es nimmt TT.MM.JJJJ.
*/
async function datumTippen(page, wahl, iso) {
  const [j, m, t] = String(iso).split("-");
  const text = t + "." + m + "." + j;
  await page.click(wahl);
  await page.waitForTimeout(80);
  await page.keyboard.press("Control+a");
  await page.keyboard.press("Delete");
  for (const z of text) {
    await page.keyboard.type(z);
    await page.waitForTimeout(40);
  }
  await page.keyboard.press("Tab");
  await page.waitForTimeout(450);
}

let bestanden = 0;
const offen = [];
function pruefe(bedingung, name) {
  if (bedingung) { bestanden += 1; console.log("OK   " + name); }
  else { offen.push(name); console.log("FEHL " + name); }
}

const browser = await chromium.launch({ channel: "chrome" });
const fremdeAnfragen = [];

async function seite(rolle = "dispatcher", bereich = "meldungen", breite = 1440, hoehe = 900) {
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
  await page.evaluate((b) => window.ProbeRahmen.geheZu(b), bereich);
  await page.waitForTimeout(400);
  return { ctx, page, fehler };
}

const vg = (id) => `.vorgang[data-vorgang="${id}"]`;
const alleZeigen = async (page) => {
  await page.click('[data-tun="vg-reiter:alle"]');
  await page.waitForTimeout(300);
};
const oeffnen = async (page, id) => {
  await alleZeigen(page);
  await page.click(`${vg(id)} [data-tun="vg-oeffnen:${id}"]`);
  await page.waitForTimeout(400);
};
const zu = async (page) => {
  await page.click("button[data-dialog-zu]");
  await page.waitForTimeout(300);
};
const protokoll = (page) => page.evaluate(() => window.ProbeDaten.protokoll.slice());

/*
  Einen Teilschritt uebernehmen. Seit dem 01.10.2026 ist das die
  erste der fuenf Voraussetzungen des Abschlusses: Wer abschliesst,
  traegt die Verantwortung und soll auch als Verantwortlicher
  dastehen.
*/
const uebernehmen = async (page, teil, id = "V0002") => {
  const knopf = await page.$(`.dialog-kasten [data-tun="vg-teil-uebernehmen:${id}|${teil}"]`);
  if (knopf) { await knopf.click(); await page.waitForTimeout(450); }
};

/*
  Die Personalpruefung laesst sich nur abschliessen, wenn die
  Bescheinigung angesehen und ein Ergebnis festgehalten wurde. Das
  ist der eigentliche Gegenstand von pruefe-probe-dokumentpruefung;
  hier wird es nur durchlaufen, damit der Teilschritt ueberhaupt
  abschliessbar wird.
*/
const dokumentPruefen = async (page) => {
  await page.click('[data-tun="vg-bescheinigung:V0002"]');
  await page.waitForTimeout(400);
  await page.click('[data-tun="vg-einsicht-ja:V0002"]');
  await page.waitForTimeout(400);
  await page.click('[data-tun="vg-ergebnis:V0002|ok"]');
  await page.waitForTimeout(400);
};

/* ═══ 1. Die Krankmeldung hat zwei Teilschritte ═════════════════ */
console.log("\n── 1. Ein Vorgang, zwei Verantwortungen ──");
{
  const { ctx, page, fehler } = await seite("dispatcher");
  await oeffnen(page, "V0002");
  const text = await page.textContent(".dialog-kasten");
  pruefe(/Teilschritte/.test(text), "der Vorgang nennt seine Teilschritte");
  pruefe(/Planung/.test(text), "die Planung ist einer davon");
  pruefe(/Personalprüfung/.test(text), "die Personalpruefung der andere");
  pruefe(/Ihr Teilschritt/.test(text), "der eigene Teilschritt ist ausgezeichnet");

  /* Die Hauptaktion heisst nach dem eigenen Schritt - nicht "Erledigt". */
  await uebernehmen(page, "planung");
  const knopf = await page.textContent('.dialog-kasten [data-tun="vg-teil-erledigen:V0002|planung"]');
  pruefe(/Planung bearbeitet/.test(knopf),
    `die Hauptaktion heisst nach dem eigenen Schritt (${knopf.trim()})`);
  pruefe(!/^\s*Erledigt\s*$/.test(knopf), "und niemals einfach „Erledigt“");

  /* Der fremde Teilschritt ist als Stand sichtbar, aber ohne Inhalt. */
  pruefe(/gehört einer anderen Rolle/.test(text),
    "der fremde Teilschritt zeigt Stand, nicht Inhalt");
  pruefe(!/Bescheinigung eingegangen/.test(text),
    "die Disposition sieht die Schritte der Personalpruefung nicht");
  pruefe(fehler.length === 0, `keine Skriptfehler${fehler.length ? " (" + fehler[0] + ")" : ""}`);
  await ctx.close();
}

/* ═══ 2. Disposition schliesst nur ihren Teil ═══════════════════ */
console.log("\n── 2. Niemand schliesst den Vorgang der anderen ──");
{
  const { ctx, page } = await seite("dispatcher");
  await oeffnen(page, "V0002");
  /* Seit dem 01.10.2026 schliesst nur der Verantwortliche ab. */
  pruefe(!(await page.$('.dialog-kasten [data-tun="vg-teil-erledigen:V0002|planung"]')),
    "ohne Übernahme ist auch die Planung gesperrt");
  await uebernehmen(page, "planung");
  await page.click('.dialog-kasten [data-tun="vg-teil-erledigen:V0002|planung"]');
  await page.waitForTimeout(450);

  const stand = await page.evaluate(() => {
    const v = window.ProbeDaten.vorgaenge.find((x) => x.id === "V0002");
    return {
      planung: v.teile.planung.zustand,
      personal: v.teile.personal.zustand,
      abgeschlossen: v.abgeschlossenAm || ""
    };
  });
  pruefe(stand.planung === "erledigt", "die Planung ist abgeschlossen");
  pruefe(stand.personal === "offen", "die Personalpruefung bleibt offen");
  pruefe(stand.abgeschlossen === "", "der Vorgang bekommt noch kein Abschlussdatum");

  const text = await page.textContent(".dialog-kasten");
  pruefe(/Gesamtstand/.test(text), "der Gesamtstand wird benannt");
  pruefe(/In Bearbeitung/.test(text), "und steht auf „In Bearbeitung“");

  /* Und die Personalseite sieht ihren Auftrag weiterhin. */
  await zu(page);
  await page.selectOption("[data-rolle]", "personal");
  await page.waitForTimeout(400);
  await oeffnen(page, "V0002");
  const perText = await page.textContent(".dialog-kasten");
  pruefe(/Bescheinigung eingegangen/.test(perText),
    "Personal sieht seinen offenen Dokumentpruefauftrag");
  /* Ohne Einsicht und Ergebnis ist der Abschluss gesperrt. */
  pruefe(!(await page.$('.dialog-kasten [data-tun="vg-teil-erledigen:V0002|personal"]')),
    "ohne Dokumentprüfung ist der Abschluss gesperrt");
  await uebernehmen(page, "personal");
  await dokumentPruefen(page);
  const perKnopf = await page.textContent('.dialog-kasten [data-tun="vg-teil-erledigen:V0002|personal"]');
  pruefe(/Dokumentprüfung abgeschlossen/.test(perKnopf),
    `und seine eigene Hauptaktion (${perKnopf.trim()})`);

  /* Jetzt schliesst Personal - erst damit ist der Vorgang fertig. */
  await page.click('.dialog-kasten [data-tun="vg-teil-erledigen:V0002|personal"]');
  await page.waitForTimeout(450);
  const danach = await page.evaluate(() => {
    const v = window.ProbeDaten.vorgaenge.find((x) => x.id === "V0002");
    return { ab: v.abgeschlossenAm || "", archiv: v.archivAb || "" };
  });
  pruefe(danach.ab !== "", `erst jetzt gibt es ein Abschlussdatum (${danach.ab})`);
  pruefe(danach.archiv !== "" && danach.archiv > danach.ab,
    `und ein spaeteres Archivdatum (${danach.archiv})`);
  const fertigText = await page.textContent(".dialog-kasten");
  pruefe(/Abgeschlossen/.test(fertigText) && /Archiv ab/.test(fertigText),
    "beide Daten stehen im Vorgang");
  await ctx.close();
}

/* ═══ 3. Wiedereroeffnung braucht einen Grund ═══════════════════ */
console.log("\n── 3. Erledigt wird nicht still zurueckgesetzt ──");
{
  const { ctx, page } = await seite("personal");
  /* V0005 ist im Bestand bereits erledigt. */
  await oeffnen(page, "V0005");
  pruefe(Boolean(await page.$('.dialog-kasten [data-tun="vg-wiedereroeffnen:V0005"]')),
    "ein erledigter Vorgang laesst sich wiedereroeffnen");
  await page.click('.dialog-kasten [data-tun="vg-wiedereroeffnen:V0005"]');
  await page.waitForTimeout(400);

  /* Ohne Grund geht nichts. */
  await page.click('[data-tun="vg-wieder-ja"]');
  await page.waitForTimeout(400);
  pruefe(Boolean(await page.$(".feldfehler")), "ohne Grund wird nichts geaendert");
  const nochErledigt = await page.evaluate(() =>
    window.ProbeDaten.vorgaenge.find((x) => x.id === "V0005").zustand);
  pruefe(nochErledigt === "erledigt", "der Vorgang bleibt erledigt");

  const vorher = (await protokoll(page)).length;
  await page.fill("[data-wieder-grund]", "Testgrund: versehentlich abgeschlossen");
  await page.click('[data-tun="vg-wieder-ja"]');
  await page.waitForTimeout(450);

  const jetzt = await page.evaluate(() => {
    const v = window.ProbeDaten.vorgaenge.find((x) => x.id === "V0005");
    return { zustand: v.zustand, ab: v.abgeschlossenAm || "" };
  });
  pruefe(jetzt.zustand === "bearbeitung", "mit Grund ist er wieder in Bearbeitung");
  pruefe(jetzt.ab === "", "das Abschlussdatum ist zurueckgenommen");

  const eintraege = await protokoll(page);
  pruefe(eintraege.length === vorher + 1, "es entsteht genau ein Protokolleintrag");
  const letzter = eintraege[0];
  pruefe(/wiedereröffnet/i.test(letzter.was), "er benennt die Wiedereroeffnung");
  pruefe(/Testgrund/.test(letzter.grund), "und traegt den Grund");
  await ctx.close();
}

/* ═══ 4. Erledigt, Archiv und Suche ═════════════════════════════ */
console.log("\n── 4. Nichts verschwindet ──");
{
  const { ctx, page } = await seite("personal");
  const reiter = await page.$$eval(".filterzeile .filterchip", (n) => n.map((x) => x.textContent.trim()));
  pruefe(reiter.some((r) => r.startsWith("Erledigt")), "es gibt einen Reiter „Erledigt“");
  pruefe(reiter.some((r) => r.startsWith("Archiv")), "und einen Reiter „Archiv“");

  await page.click('[data-tun="vg-reiter:archiv"]');
  await page.waitForTimeout(350);
  const hinweis = await page.textContent(".flaeche");
  pruefe(/90 Tagen/.test(hinweis), "das Archiv nennt seine Frist");
  pruefe(/Gelöscht\s+wird hier nichts|Gelöscht wird hier nichts/.test(hinweis.replace(/\s+/g, " ")),
    "und sagt ausdruecklich, dass nichts geloescht wird");

  /* Zeitraum, Thema und Suche stehen im Archiv bereit. */
  /*
    GEAENDERTE ERWARTUNG.

    Alt: Die Zeitraumfelder des Archivs heissen data-vg-von und
    data-vg-bis.

    Weshalb das nicht mehr gilt: Beide waren <input type="date"> und
    sprangen beim Tippen des Jahres zurueck zum Tag. Sie laufen jetzt
    ueber das gemeinsame Datumsmodul und tragen dessen Attribute.

    Neu und strenger: Geprueft wird, dass es die Felder gibt UND dass
    sie zum gemeinsamen Modul gehoeren - eine Eigenloesung an dieser
    Stelle wuerde jetzt auffallen.
  */
  const archivFelder = await page.$$eval('[data-datum-kennung="archiv"]',
    (ns) => ns.map((x) => x.type + "/" + x.dataset.datumTeil));
  pruefe(archivFelder.includes("text/von"),
    `ein Zeitraum laesst sich eingrenzen (${archivFelder.join(", ")})`);
  pruefe(archivFelder.includes("text/bis"), "von und bis");
  pruefe(!(await page.$('input[type="date"]')),
    "und zwar ohne natives Datumsfeld");
  pruefe(Boolean(await page.$("[data-vg-thema]")), "nach Thema laesst sich filtern");
  pruefe(Boolean(await page.$("[data-vg-suche]")), "und nach Vorgang oder Person suchen");

  /* Ein erledigter Vorgang bleibt ueber die Suche auffindbar. */
  await page.click('[data-tun="vg-reiter:alle"]');
  await page.waitForTimeout(300);
  await page.fill("[data-vg-suche]", "V0005");
  await page.waitForTimeout(400);
  pruefe(Boolean(await page.$(vg("V0005"))), "ein abgeschlossener Vorgang ist auffindbar");

  /* Der Zeitraumfilter aendert keine Daten. */
  const VG_VON = '[data-datum-kennung="archiv"][data-datum-teil="von"]';
  const VG_BIS = '[data-datum-kennung="archiv"][data-datum-teil="bis"]';
  const vorher = await page.evaluate(() => window.ProbeDaten.vorgaenge.length);
  await page.fill("[data-vg-suche]", "");
  await datumTippen(page, VG_VON, "2020-01-01");
  await datumTippen(page, VG_BIS, "2020-01-02");
  const nachher = await page.evaluate(() => window.ProbeDaten.vorgaenge.length);
  pruefe(vorher === nachher, "der Zeitraumfilter loescht nichts");
  pruefe(Boolean(await page.$('[data-tun="vg-zeitraum-weg"]')),
    "und laesst sich in einem Griff aufheben");
  await page.click('[data-tun="vg-zeitraum-weg"]');
  await page.waitForTimeout(350);
  pruefe((await page.$$(".vorgang")).length > 0, "danach ist der Bestand wieder da");
  await ctx.close();
}

/* ═══ 5. Administration uebernimmt - als sie selbst ═════════════ */
console.log("\n── 5. Uebernahme mit Namen, Grund und Vorgeschichte ──");
{
  const { ctx, page } = await seite("personal");
  /* Personal uebernimmt zuerst seinen Teilschritt. */
  await oeffnen(page, "V0002");
  await page.click('.dialog-kasten [data-tun="vg-teil-uebernehmen:V0002|personal"]');
  await page.waitForTimeout(450);
  const ersterHalter = await page.evaluate(() =>
    window.ProbeDaten.vorgaenge.find((x) => x.id === "V0002").teile.personal.verantwortlich);
  pruefe(Boolean(ersterHalter) && /Testpersonal/.test(ersterHalter.name),
    `Personal ist verantwortlich (${ersterHalter && ersterHalter.name})`);

  /* Jetzt greift die Administration zu - das braucht einen Grund. */
  await zu(page);
  await page.selectOption("[data-rolle]", "admin");
  await page.waitForTimeout(400);
  await oeffnen(page, "V0002");
  /* Die Administration darf beide Teilschritte - deshalb benennt sie,
     welchen sie meint. Eine mehrdeutige Hauptaktion gibt es nicht. */
  pruefe(!(await page.$(".dialog-fuss .haupt-knopf")),
    "wer mehrere Teilschritte darf, bekommt keine mehrdeutige Hauptaktion");
  /* Ein Knopf je Teilschritt. Die Personalpruefung ist dabei noch
     gesperrt - auch die Administration sieht die Bescheinigung erst
     an, bevor sie abschliesst. */
  const teilAktionen = await page.$$eval(".vg-teile .teil-aktionen button",
    (nodes) => nodes.map((x) => x.textContent.trim()));
  pruefe(teilAktionen.filter((x) => /Planung bearbeitet|Dokumentprüfung abgeschlossen/.test(x)).length === 2,
    `je ein Abschlussknopf pro Teilschritt (${teilAktionen.length} Knöpfe)`);
  pruefe(!(await page.$('.dialog-kasten [data-tun="vg-teil-erledigen:V0002|personal"]')),
    "die Personalprüfung bleibt auch für die Administration gesperrt");
  await page.click('.dialog-kasten [data-tun="vg-teil-uebernehmen:V0002|personal"]');
  await page.waitForTimeout(450);
  pruefe(Boolean(await page.$("[data-uebernahme-grund]")),
    "die Uebernahme einer begonnenen Aufgabe fragt nach dem Grund");
  const dText = await page.textContent(".dialog-kasten");
  pruefe(/Testpersonal/.test(dText), "der Dialog nennt, wer bisher verantwortlich war");
  pruefe(/niemals\s+unter fremdem Namen|nie\s+unter fremdem Namen/.test(dText.replace(/\s+/g, " ")),
    "und sagt, dass die Administration als sie selbst handelt");

  await page.click('[data-tun="vg-uebernahme-ja"]');
  await page.waitForTimeout(400);
  pruefe(Boolean(await page.$(".feldfehler")), "ohne Grund wird nicht uebernommen");

  const vorher = (await protokoll(page)).length;
  await page.fill("[data-uebernahme-grund]", "Testgrund: Personal heute nicht im Haus");
  await page.click('[data-tun="vg-uebernahme-ja"]');
  await page.waitForTimeout(500);

  const teil = await page.evaluate(() =>
    window.ProbeDaten.vorgaenge.find((x) => x.id === "V0002").teile.personal);
  const meinKonto = await page.evaluate(() => window.ProbeRahmen.benutzer());
  pruefe(teil.verantwortlich.name === meinKonto.name,
    `jetzt ist das angemeldete Konto verantwortlich (${teil.verantwortlich.name})`);
  pruefe(teil.verantwortlich.rolle === "Administration",
    `und zwar in der Rolle Administration (${teil.verantwortlich.rolle})`);
  pruefe(Boolean(teil.verantwortlich.kennung),
    `mit festgehaltener Kennung (${teil.verantwortlich.kennung})`);
  pruefe(Boolean(teil.letzter) && /Testpersonal/.test(teil.letzter.name),
    "die bisherige Bearbeitung bleibt als „zuletzt bearbeitet“ sichtbar");
  pruefe(teil.verantwortlich.kennung !== teil.letzter.kennung,
    "Verantwortlicher und letzter Bearbeiter sind getrennte Angaben");

  const eintraege = await protokoll(page);
  pruefe(eintraege.length === vorher + 1, "die Uebernahme erzeugt einen Protokolleintrag");
  const e = eintraege[0];
  pruefe(e.wer.includes(meinKonto.name),
    `er nennt die handelnde Person (${e.wer})`);
  pruefe(e.kennung === meinKonto.kennung,
    `und ihre Kennung (${e.kennung})`);
  pruefe(/Administration/.test(e.rolle), "mit ihrer Rolle");
  pruefe(Boolean(e.kennung), `und ihrer unveraenderlichen Kennung (${e.kennung})`);
  pruefe(Boolean(e.datum) && Boolean(e.zeit), "sowie Datum und Uhrzeit");
  pruefe(/Testgrund/.test(e.grund), "der Grund steht dabei");
  pruefe(!/^bearbeitet von Admin$/i.test(e.wer.trim()),
    "es steht nie nur „bearbeitet von Admin“");
  /* Object.isFrozen muss IN der Seite gefragt werden - ueber die
     Bruecke kommt nur eine Kopie an, und die ist nie eingefroren. */
  const eingefroren = await page.evaluate(() => Object.isFrozen(window.ProbeDaten.protokoll[0]));
  pruefe(eingefroren, "der Eintrag ist unveraenderlich");

  /* Und Personal sieht, wer uebernommen hat. */
  await page.selectOption("[data-rolle]", "personal");
  await page.waitForTimeout(400);
  await oeffnen(page, "V0002");
  const perText = await page.textContent(".dialog-kasten");
  pruefe(perText.includes(meinKonto.name), "Personal sieht, wer uebernommen hat");
  pruefe(/Testpersonal 01/.test(perText), "und die eigene Vorgeschichte steht weiter da");
  await ctx.close();
}

/* ═══ 6. Die Planung erreicht jeden Tag ═════════════════════════ */
console.log("\n── 6. Planung ohne Tagesgrenze ──");
{
  const { ctx, page } = await seite("dispatcher", "planung");
  for (const knopf of ["plan-zurueck", "plan-heute", "plan-morgen", "plan-vor"]) {
    pruefe(Boolean(await page.$(`[data-tun="${knopf}"]`)), `es gibt „${knopf}“`);
  }
  /* GEAENDERTE ERWARTUNG: Das Feld laeuft jetzt ueber das gemeinsame
     Datumsmodul - geprueft wird das ausdruecklich mit. */
  const PLAN = '[data-datum-kennung="plan"][data-datum-teil="tag"]';
  pruefe(Boolean(await page.$(PLAN)), "und ein freies Datumsfeld");
  pruefe(await page.getAttribute(PLAN, "type") === "text",
    "aus dem gemeinsamen Datumsmodul, nicht nativ");

  await datumTippen(page, PLAN, "2026-12-24");
  const gewaehlt = await page.evaluate(() => window.ProbeRahmen.zustand.planDatum);
  pruefe(gewaehlt === "2026-12-24", `ein weit entfernter Tag laesst sich waehlen (${gewaehlt})`);
  pruefe((await page.$$("[data-mitarbeiter]")).length > 0,
    "und bekommt einen leeren, bearbeitbaren Plan");

  await page.click('[data-tun="plan-heute"]');
  await page.waitForTimeout(450);
  const heute = await page.evaluate(() =>
    window.ProbeRahmen.zustand.planDatum === window.ProbeDaten.alsIso(window.ProbeDaten.heute));
  pruefe(heute, "„Heute“ fuehrt zuverlaessig zurueck");
  await ctx.close();
}

/* ═══ 7. Der Kalender ═══════════════════════════════════════════ */
console.log("\n── 7. Kalender: zeigen, nicht entscheiden ──");
{
  const { ctx, page, fehler } = await seite("dispatcher", "kalender");
  const kopf = await page.textContent(".bereichskopf");
  pruefe(/Kalender/.test(kopf), "der Bereich ist erreichbar");

  for (const s of ["tag", "woche", "monat"]) {
    pruefe(Boolean(await page.$(`[data-tun="kal-sicht:${s}"]`)), `es gibt die Sicht „${s}“`);
  }
  for (const k of ["kal-zurueck", "kal-heute", "kal-vor"]) {
    pruefe(Boolean(await page.$(`[data-tun="${k}"]`)), `und die Bedienung „${k}“`);
  }
  pruefe(Boolean(await page.$('[data-datum-kennung="kalender"]')),
    "sowie ein freies Datumsfeld aus dem gemeinsamen Modul");
  pruefe((await page.$$(".kal-monat .kal-tag")).length >= 28,
    "der Monat zeigt ein volles Raster");

  /* Ein Klick auf einen Tag oeffnet dessen Tagesansicht. */
  await page.click(".kal-monat .kal-tag.heute");
  await page.waitForTimeout(400);
  const sicht = await page.evaluate(() => window.ProbeKalender.stand.sicht);
  pruefe(sicht === "tag", "ein Klick auf einen Tag oeffnet die Tagesansicht");

  /* Die Filter aendern nur die Anzeige. */
  const vorher = await page.evaluate(() => JSON.stringify(window.ProbeDaten.planung));
  await page.click('[data-tun="kal-art:abwesenheit"]');
  await page.waitForTimeout(350);
  const nachher = await page.evaluate(() => JSON.stringify(window.ProbeDaten.planung));
  pruefe(vorher === nachher, "ein Filter veraendert keine Daten");
  const hinweis = await page.textContent(".flaeche");
  pruefe(/ändern nur die Anzeige/.test(hinweis), "und sagt das auch");
  await page.click('[data-tun="kal-art:abwesenheit"]');
  await page.waitForTimeout(300);

  /* Der Kalender fasst den Tagesentwurf der Planung nicht an. */
  const entwurfVorher = await page.evaluate(() =>
    window.ProbeRahmen.zustand.planEntwurf ? window.ProbeRahmen.zustand.planEntwurf.iso : null);
  await page.click('[data-tun="kal-vor"]');
  await page.waitForTimeout(350);
  const entwurfNachher = await page.evaluate(() =>
    window.ProbeRahmen.zustand.planEntwurf ? window.ProbeRahmen.zustand.planEntwurf.iso : null);
  pruefe(entwurfVorher === entwurfNachher,
    "Blaettern im Kalender schaltet den Tagesentwurf der Planung nicht um");

  pruefe(fehler.length === 0, `keine Skriptfehler${fehler.length ? " (" + fehler[0] + ")" : ""}`);
  await ctx.close();
}

/* ═══ 8. Der Kalender kennt keine Krankheitsgruende ═════════════ */
console.log("\n── 8. Kalender und Vertraulichkeit ──");
{
  const { ctx, page } = await seite("dispatcher", "kalender");
  await page.click('[data-tun="kal-sicht:tag"]');
  await page.waitForTimeout(400);
  const text = await page.textContent(".flaeche");
  pruefe(/Krank/.test(text), "die Disposition sieht, DASS jemand krank ist");
  for (const wort of ["Diagnose", "Bescheinigung", "Attest", "Befund", "Krankenkasse"]) {
    pruefe(!new RegExp(wort).test(text), `aber keine ${wort} im Kalender`);
  }

  /* Buchhaltung plant nicht - sie sieht die Abwesenheiten gar nicht. */
  await ctx.close();
  const b = await seite("accounting", "kalender");
  const sichtbar = await b.page.evaluate(() =>
    window.ProbeRahmen.BEREICHE.filter((x) => window.ProbeRahmen.darf(x.braucht)).map((x) => x.id));
  pruefe(!sichtbar.includes("kalender"),
    "die Buchhaltung bekommt den Kalender gar nicht erst angeboten");
  await b.ctx.close();
}

/* ═══ 9. Kein Netzwerkaufruf, keine erfundenen Personen ═════════ */
console.log("\n── 9. Nichts geht nach draussen ──");
pruefe(fremdeAnfragen.length === 0,
  `keine einzige Anfrage nach aussen im ganzen Lauf (${fremdeAnfragen.length})`);
{
  const quelle = await readFile(join(PROBE, "probe-kalender.js"), "utf8");
  const ohneKommentar = quelle.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
  pruefe(!/fetch\s*\(|new XMLHttpRequest|new WebSocket|createClient\s*\(|supabase\./i.test(ohneKommentar),
    "kein Netzzugriff im Kalendermodul");
  pruefe(!/Mustermann|Musterfrau|Herr Müller|Frau Schmidt/.test(quelle),
    "keine erfundenen Personennamen");
  pruefe(!/(diagnose|krankheitsgrund|befund)\s*[:=]/i.test(ohneKommentar),
    "und kein Feld, das eine Diagnose aufnehmen wuerde");

  const vorgaenge = await readFile(join(PROBE, "probe-vorgaenge.js"), "utf8");
  pruefe(!/vg-zusatz/.test(vorgaenge), "kein Selbstberechtigungsschalter im Quelltext");
}

/* ═══ 10. Vier Breiten ══════════════════════════════════════════ */
console.log("\n── 10. Darstellung ──");
for (const [breite, hoehe] of [[320, 568], [390, 844], [768, 1024], [1440, 900]]) {
  const { ctx, page } = await seite("dispatcher", "kalender", breite, hoehe);
  const ueber = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  pruefe(ueber <= 0, `bei ${breite}px laeuft der Kalender nicht ueber (${ueber}px)`);
  await ctx.close();
}

await browser.close();
server.close();

console.log("\n" + "═".repeat(59));
console.log(`Teilschritte, Archiv und Kalender: ${bestanden} bestanden, ${offen.length} nicht bestanden`);
if (offen.length) {
  console.log("\nNicht bestanden:");
  for (const n of offen) console.log("  - " + n);
}
console.log(`
ALLES SIMULIERT. Die Probe hat keine Datenquelle, keinen Upload und
keinen Versand. Dieser Lauf sagt nichts ueber die produktive Instanz.`);
console.log("═".repeat(59));
process.exit(offen.length ? 1 : 0);
