/* ============================================================
   Prueflauf: Beschriftung der Vorgangskarten und die fuenf
   Voraussetzungen eines Teilabschlusses
   ============================================================
   Befund aus dem manuellen Test vom 01.10.2026: Auf der Listenkarte
   stand ein goldener Hauptknopf "Dokumentpruefung abgeschlossen" -
   bei einem neuen Vorgang, beide Teilschritte offen, niemand
   verantwortlich, Bescheinigung nicht geoeffnet. Der Klick hat zwar
   nur geoeffnet, aber die Beschriftung hat etwas anderes behauptet.

   Geprueft wird:

   1. KEINE Listenkarte traegt eine Abschlussbeschriftung - in keiner
      Rolle, in keinem Reiter.
   2. Der Hauptknopf oeffnet nur und speichert nichts.
   3. "Dokumentpruefung abgeschlossen" erscheint ausschliesslich IM
      geoeffneten Vorgang.
   4. Dort bleibt die Aktion gesperrt, bis der Reihe nach:
        a) der Teilschritt uebernommen ist,
        b) die Bescheinigung geoeffnet wurde,
        c) die Einsicht bestaetigt wurde,
        d) ein gueltiges Pruefergebnis gewaehlt wurde,
        e) alle daraus entstehenden Folgeaufgaben geklaert sind.
   5. Jede dieser Sperren greift auch beim direkten Aufruf.
   6. Ein fremder Verantwortlicher sperrt ebenfalls - auch fuer die
      Administration.

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
const PORT = 5389;
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

async function seite(rolle = "personal") {
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
  await page.waitForTimeout(350);
  await page.evaluate(() => { try { localStorage.clear(); } catch { /* egal */ } });
  await page.selectOption("[data-rolle]", rolle);
  await page.waitForTimeout(250);
  await page.evaluate(() => window.ProbeRahmen.geheZu("meldungen"));
  await page.waitForTimeout(400);
  return { ctx, page, fehler };
}

const oeffnen = async (page, id = "V0002") => {
  /* Ein offener Dialog deckt die Reiterleiste ab - erst wegraeumen,
     sonst laeuft der Klick in eine Zeitueberschreitung. */
  if (await page.evaluate(() => window.ProbeRahmen.dialogOffen())) {
    await page.evaluate(() => window.ProbeRahmen.dialogSchliessen(true));
    await page.waitForTimeout(300);
  }
  await page.click('[data-tun="vg-reiter:alle"]');
  await page.waitForTimeout(300);
  await page.click(`.vorgang[data-vorgang="${id}"] [data-tun="vg-oeffnen:${id}"]`);
  await page.waitForTimeout(450);
};
const knoepfe = (page) =>
  page.$$eval(".dialog-kasten [data-tun]", (n) => n.map((x) => x.dataset.tun));
const kannAbschliessen = async (page, teil = "personal", id = "V0002") =>
  (await knoepfe(page)).some((x) => x === `vg-teil-erledigen:${id}|${teil}`);
const teilstand = (page, teil = "personal", id = "V0002") => page.evaluate(
  ([a, b]) => window.ProbeDaten.vorgangVon(a).teile[b].zustand, [id, teil]);
/* Die Knoepfe EINER Listenkarte - Text und Aktion. */
const kartenknoepfe = (page, id = "V0002") =>
  page.$$eval(`.vorgang[data-vorgang="${id}"] button`,
    (nodes) => nodes.map((x) => ({ text: x.textContent.trim(), tun: x.dataset.tun || "" })));
const kartenNamen = async (page, id = "V0002") =>
  (await kartenknoepfe(page, id)).map((x) => x.text);

/* Den eigenen Teilschritt uebernehmen - im geoeffneten Vorgang. */
const uebernehmen = async (page, teil, id = "V0002") => {
  const knopf = await page.$(`.dialog-kasten [data-tun="vg-teil-uebernehmen:${id}|${teil}"]`);
  if (knopf) { await knopf.click(); await page.waitForTimeout(450); }
};
const zu = async (page) => {
  await page.evaluate(() => window.ProbeRahmen.dialogSchliessen(true));
  await page.waitForTimeout(300);
};

const sperrgrund = async (page) =>
  (await page.$$eval(".teil-sperre", (n) => n.map((x) => x.textContent.replace(/\s+/g, " ").trim()))).join(" || ");

/*
  Woran erkennt man eine Abschlussbeschriftung?

  Nicht an einem einzelnen Wort - "Dokument prüfen" enthaelt "prüfen"
  und ist voellig in Ordnung. Gesucht wird nach Beschriftungen, die
  behaupten, etwas sei fertig: abgeschlossen, erledigt, bearbeitet,
  gespeichert, bestaetigt, genehmigt.
*/
const ABSCHLUSSWORT = /abgeschlossen|erledigt|bearbeitet|gespeichert|bestätigt|genehmigt|verbindlich/i;

/* ═══ 1. Keine Karte verspricht einen Abschluss ═════════════════ */
console.log("\n── 1. Listenkarten in allen Rollen und Reitern ──");
{
  let gepruefteKarten = 0;
  const verdaechtig = [];
  for (const rolle of ["admin", "dispatcher", "personal", "accounting", "employee"]) {
    const { ctx, page, fehler } = await seite(rolle);
    const reiter = await page.$$eval(".filterzeile .filterchip", (n) => n.map((x) => x.dataset.tun));
    for (const r of reiter) {
      await page.click(`[data-tun="${r}"]`);
      await page.waitForTimeout(250);
      const karten = await page.$$eval(".vorgang", (n) => n.map((x) => ({
        id: x.dataset.vorgang,
        knoepfe: [...x.querySelectorAll("button")].map((b) => b.textContent.trim())
      })));
      for (const k of karten) {
        gepruefteKarten += k.knoepfe.length;
        for (const b of k.knoepfe) {
          if (ABSCHLUSSWORT.test(b)) verdaechtig.push(`${rolle}/${r}/${k.id}: „${b}“`);
        }
      }
    }
    pruefe(fehler.length === 0, `${rolle}: keine Skriptfehler${fehler.length ? " (" + fehler[0] + ")" : ""}`);
    await ctx.close();
  }
  pruefe(gepruefteKarten > 50, `es wurden genug Kartenknöpfe geprüft (${gepruefteKarten})`);
  pruefe(verdaechtig.length === 0,
    `keine einzige Listenkarte verspricht einen Abschluss${verdaechtig.length ? " (" + verdaechtig[0] + ")" : ""}`);
  if (verdaechtig.length) for (const x of verdaechtig) console.log("     " + x);
}

/* ═══ 2. Die Karte der Krankmeldung heisst richtig ══════════════ */
console.log("\n── 2. Die Karte sagt, was sie tut ──");
{
  const { ctx, page } = await seite("personal");
  await page.click('[data-tun="vg-reiter:alle"]');
  await page.waitForTimeout(300);

  const haupt = await page.$eval('.vorgang[data-vorgang="V0002"] .haupt-knopf',
    (el) => ({ text: el.textContent.trim(), tun: el.dataset.tun }));
  pruefe(haupt.text === "Krankmeldung prüfen" || haupt.text === "Vorgang öffnen",
    `der Hauptknopf heisst „${haupt.text}“`);
  pruefe(!/abgeschlossen/i.test(haupt.text), "und niemals „Dokumentprüfung abgeschlossen“");
  pruefe(haupt.tun === "vg-oeffnen:V0002", `er öffnet nur (${haupt.tun})`);

  /*
    Er speichert nichts.

    "Nichts" heisst hier: keinen Fachzustand und keinen
    Protokolleintrag. Dass der Vorgang als GESEHEN vermerkt wird, ist
    gewollt und steht seit Abschnitt 20.3 so da - gesehen ist nicht
    erledigt. Deshalb wird genau das ausgenommen und alles andere
    verglichen.
  */
  const fachstand = () => page.evaluate(() => {
    const v = window.ProbeDaten.vorgangVon("V0002");
    return JSON.stringify({
      zustand: v.zustand, teile: v.teile, daten: v.daten,
      verantwortlich: v.verantwortlich, letzterBearbeiter: v.letzterBearbeiter,
      zustaendig: v.zustaendig, abgeschlossenAm: v.abgeschlossenAm,
      protokoll: window.ProbeDaten.protokoll.length
    });
  });
  const vorher = await fachstand();
  const gesehenVorher = await page.evaluate(() => window.ProbeDaten.vorgangVon("V0002").gesehen);
  await page.click('.vorgang[data-vorgang="V0002"] .haupt-knopf');
  await page.waitForTimeout(450);
  pruefe(vorher === await fachstand(),
    "ein Klick darauf ändert keinen Fachzustand und schreibt kein Protokoll");
  const gesehenNachher = await page.evaluate(() => window.ProbeDaten.vorgangVon("V0002").gesehen);
  pruefe(gesehenNachher === true && gesehenVorher !== gesehenNachher,
    "er vermerkt den Vorgang nur als gesehen — gesehen ist nicht erledigt");
  pruefe(Boolean(await page.$(".dialog-kasten")), "er öffnet den Vorgang");

  /* Erst DORT gibt es die Abschlussbeschriftung. */
  const drin = await page.textContent(".dialog-kasten");
  pruefe(/Dokumentprüfung abgeschlossen/.test(drin),
    "„Dokumentprüfung abgeschlossen“ steht nur im geöffneten Vorgang");
  await ctx.close();
}

/* ═══ 3. Die fünf Voraussetzungen, der Reihe nach ═══════════════ */
console.log("\n── 3. Fünf Voraussetzungen, eine nach der anderen ──");
{
  const { ctx, page } = await seite("personal");
  await oeffnen(page);

  /* (a) Übernahme. */
  pruefe(!(await kannAbschliessen(page)), "ohne Übernahme kein Abschluss");
  pruefe(/noch niemandem zugewiesen/.test(await sperrgrund(page)),
    "und der Grund steht da");
  const gesperrt = await page.$$eval(".dialog-kasten button[disabled]",
    (n) => n.map((x) => x.textContent.trim()));
  pruefe(gesperrt.some((x) => /Dokumentprüfung abgeschlossen/.test(x)),
    "die Aktion ist sichtbar, aber gesperrt");
  await page.evaluate(() => window.ProbeVorgaenge.tun("vg-teil-erledigen", "V0002|personal"));
  await page.waitForTimeout(300);
  pruefe(await teilstand(page) === "offen", "auch der direkte Aufruf schliesst nichts ab");

  await page.click('.dialog-kasten [data-tun="vg-teil-uebernehmen:V0002|personal"]');
  await page.waitForTimeout(450);
  const v1 = await page.evaluate(() =>
    window.ProbeDaten.vorgangVon("V0002").teile.personal.verantwortlich);
  pruefe(Boolean(v1) && /Testpersonal 01/.test(v1.name), "die Übernahme greift");

  /* (b) und (c) Bescheinigung öffnen und Einsicht bestätigen. */
  pruefe(!(await kannAbschliessen(page)), "nach der Übernahme allein noch kein Abschluss");
  pruefe(/noch nicht geöffnet/.test(await sperrgrund(page)),
    "jetzt fehlt die geöffnete Bescheinigung");
  await page.click('[data-tun="vg-bescheinigung:V0002"]');
  await page.waitForTimeout(400);
  pruefe(!(await page.$('.dialog-kasten [data-tun^="vg-teil-erledigen"]')),
    "das blosse Öffnen der Vorschau reicht nicht");
  await page.click('[data-tun="vg-einsicht-ja:V0002"]');
  await page.waitForTimeout(450);

  /* (d) Prüfergebnis. */
  pruefe(!(await kannAbschliessen(page)), "nach der Einsicht noch kein Abschluss");
  pruefe(/kein Prüfergebnis/.test(await sperrgrund(page)), "jetzt fehlt das Ergebnis");
  await page.evaluate(() => window.ProbeVorgaenge.tun("vg-teil-erledigen", "V0002|personal"));
  await page.waitForTimeout(300);
  pruefe(await teilstand(page) === "offen", "der direkte Aufruf hilft auch hier nicht");

  /* (e) Folgeaufgabe. */
  await page.click('[data-tun="vg-ergebnis:V0002|zeitraum"]');
  await page.waitForTimeout(450);
  pruefe(!(await kannAbschliessen(page)),
    "mit einem Ergebnis, das eine Folgeaufgabe erzeugt, noch kein Abschluss");
  pruefe(/Rückfrage zum Zeitraum ist noch nicht geklärt/.test(await sperrgrund(page)),
    "die offene Folgeaufgabe ist der Grund");
  await page.evaluate(() => window.ProbeVorgaenge.tun("vg-teil-erledigen", "V0002|personal"));
  await page.waitForTimeout(300);
  pruefe(await teilstand(page) === "offen", "und der direkte Aufruf ebenso wenig");

  await page.click('[data-tun="vg-klaerung-ja:V0002"]');
  await page.waitForTimeout(450);
  pruefe(await kannAbschliessen(page), "erst mit allen fünf steht der Abschluss bereit");
  pruefe(!(await page.$(".dialog-kasten button[disabled]")), "und nichts ist mehr gesperrt");

  await page.click('.dialog-kasten [data-tun="vg-teil-erledigen:V0002|personal"]');
  await page.waitForTimeout(450);
  pruefe(await teilstand(page) === "erledigt", "der Teilschritt ist abgeschlossen");
  await ctx.close();
}

/* ═══ 4. Ein fremder Verantwortlicher sperrt ════════════════════ */
console.log("\n── 4. Fremde Verantwortung sperrt — auch die Administration ──");
{
  const { ctx, page } = await seite("personal");
  await oeffnen(page);
  await page.click('.dialog-kasten [data-tun="vg-teil-uebernehmen:V0002|personal"]');
  await page.waitForTimeout(450);
  await page.click('[data-tun="vg-bescheinigung:V0002"]');
  await page.waitForTimeout(400);
  await page.click('[data-tun="vg-einsicht-ja:V0002"]');
  await page.waitForTimeout(400);
  await page.click('[data-tun="vg-ergebnis:V0002|ok"]');
  await page.waitForTimeout(450);
  pruefe(await kannAbschliessen(page), "Personal selbst könnte jetzt abschliessen");

  await page.evaluate(() => window.ProbeRahmen.dialogSchliessen(true));
  await page.waitForTimeout(250);
  await page.selectOption("[data-rolle]", "admin");
  await page.waitForTimeout(400);
  await oeffnen(page);

  pruefe(!(await kannAbschliessen(page)),
    "die Administration kann den fremden Teilschritt nicht abschliessen");
  pruefe(/Verantwortlich ist Testpersonal 01/.test(await sperrgrund(page)),
    "der Grund nennt den Verantwortlichen");
  await page.evaluate(() => window.ProbeVorgaenge.tun("vg-teil-erledigen", "V0002|personal"));
  await page.waitForTimeout(300);
  pruefe(await teilstand(page) === "offen", "auch der direkte Aufruf nicht");
  pruefe(Boolean(await page.$('.dialog-kasten [data-tun="vg-teil-uebernehmen:V0002|personal"]')),
    "sie kann ihn aber übernehmen — mit Grund");

  /* Ihr eigener Teilschritt ist davon unberuehrt, braucht aber auch
     die Uebernahme. */
  pruefe(!(await kannAbschliessen(page, "planung")),
    "auch ihr eigener Teilschritt braucht erst die Übernahme");
  await page.click('.dialog-kasten [data-tun="vg-teil-uebernehmen:V0002|planung"]');
  await page.waitForTimeout(450);
  pruefe(await kannAbschliessen(page, "planung"),
    "danach darf sie die Planung abschliessen");
  await ctx.close();
}

/* ═══ 5. Die Übersicht verspricht ebenfalls nichts ══════════════ */
console.log("\n── 5. Auch die Übersicht ──");
{
  const { ctx, page } = await seite("personal");
  await page.evaluate(() => window.ProbeRahmen.geheZu("uebersicht"));
  await page.waitForTimeout(450);
  const knoepfeUe = await page.$$eval(".flaeche button", (n) => n.map((x) => x.textContent.trim()));
  const schlimm = knoepfeUe.filter((x) => ABSCHLUSSWORT.test(x));
  pruefe(schlimm.length === 0,
    `kein Knopf der Übersicht verspricht einen Abschluss${schlimm.length ? " (" + schlimm[0] + ")" : ""}`);

  /* Und die Glocke. */
  await page.evaluate(() => window.ProbeRahmen.geheZu("meldungen"));
  await page.waitForTimeout(350);
  await page.click("[data-glocke]");
  await page.waitForTimeout(400);
  const glocke = await page.$$eval(".dialog-kasten button", (n) => n.map((x) => x.textContent.trim()));
  const schlimm2 = glocke.filter((x) => ABSCHLUSSWORT.test(x));
  pruefe(schlimm2.length === 0,
    `auch die Glocke nicht${schlimm2.length ? " (" + schlimm2[0] + ")" : ""}`);
  await ctx.close();
}

/* ═══ 6. Die Dokumentvorschau hat zwei getrennte Wege ══════════ */
console.log("\n── 6. Zurück zur Krankmeldung oder ganz hinaus ──");
{
  const { ctx, page } = await seite("personal");
  await oeffnen(page);
  await uebernehmen(page, "personal");

  /* Eine Scrollposition setzen, damit die Rueckkehr etwas zu
     erhalten hat. */
  await page.evaluate(() => { document.querySelector(".dialog-rumpf").scrollTop = 220; });
  await page.waitForTimeout(200);
  const rollVor = await page.evaluate(() => document.querySelector(".dialog-rumpf").scrollTop);
  pruefe(rollVor > 0, `der Vorgang ist gescrollt (${rollVor}px)`);

  await page.click('.dialog-kasten [data-tun="vg-bescheinigung:V0002"]');
  await page.waitForTimeout(450);
  const knoepfeV = await page.$$eval(".dialog-kasten button",
    (nodes) => nodes.map((x) => x.textContent.trim()));
  pruefe(knoepfeV.some((x) => /Zurück zur Krankmeldung/.test(x)),
    "es gibt „Zurück zur Krankmeldung“");
  pruefe(knoepfeV.some((x) => /Vorgang verlassen/.test(x)),
    "und getrennt davon „Vorgang verlassen“");
  pruefe(!knoepfeV.some((x) => x === "Schließen" || x === "✕ Schließen"),
    "ein blosses „Schließen“ gibt es dort nicht mehr");
  const hinweis = (await page.textContent(".dialog-rumpf")).replace(/\s+/g, " ");
  pruefe(/schließt nur diese Vorschau/.test(hinweis), "der Unterschied steht dabei");
  pruefe(/Escape wirkt wie „Zurück zur Krankmeldung“/.test(hinweis),
    "und was Escape tut");

  /* Escape fuehrt zurueck, nicht hinaus. */
  await page.keyboard.press("Escape");
  await page.waitForTimeout(450);
  pruefe(await page.evaluate(() => window.ProbeRahmen.dialogOffen()),
    "Escape schliesst nicht den ganzen Vorgang");
  pruefe(/Krankmeldung eingegangen/.test(await page.textContent(".dialog-kopf h2")),
    "sondern führt in die Krankmeldung zurück");
  pruefe(await page.evaluate(() => document.querySelector(".dialog-rumpf").scrollTop) === rollVor,
    "die Scrollposition bleibt erhalten");
  const v1 = await page.evaluate(() =>
    window.ProbeDaten.vorgangVon("V0002").teile.personal.verantwortlich);
  pruefe(Boolean(v1) && /Testpersonal 01/.test(v1.name), "die Übernahme bleibt erhalten");

  /* Der Knopf tut dasselbe. */
  await page.click('.dialog-kasten [data-tun="vg-bescheinigung:V0002"]');
  await page.waitForTimeout(400);
  await page.click('[data-tun="vg-vorschau-zurueck:V0002"]');
  await page.waitForTimeout(450);
  pruefe(/Krankmeldung eingegangen/.test(await page.textContent(".dialog-kopf h2")),
    "„Zurück zur Krankmeldung“ führt in den Vorgang zurück");

  /* Einsicht bestaetigen fuehrt ebenfalls zurueck, nicht hinaus. */
  await page.click('.dialog-kasten [data-tun="vg-bescheinigung:V0002"]');
  await page.waitForTimeout(400);
  await page.click('[data-tun="vg-einsicht-ja:V0002"]');
  await page.waitForTimeout(500);
  pruefe(await page.evaluate(() => window.ProbeRahmen.dialogOffen())
    && /Krankmeldung eingegangen/.test(await page.textContent(".dialog-kopf h2")),
    "auch „Einsicht bestätigen“ bleibt im Vorgang");

  /* Vorgang verlassen: Sicherheitsabfrage, solange unfertig. */
  await page.click('.dialog-kasten [data-tun="vg-bescheinigung:V0002"]');
  await page.waitForTimeout(400);
  await page.click('[data-tun="vg-vorschau-raus:V0002"]');
  await page.waitForTimeout(450);
  pruefe(await page.evaluate(() => window.ProbeRahmen.dialogOffen()),
    "„Vorgang verlassen“ fragt erst nach");
  pruefe(Boolean(await page.$("[data-verlassen-warnung]")), "es gibt eine Sicherheitsabfrage");
  const warn = (await page.textContent("[data-verlassen-warnung]")).replace(/\s+/g, " ");
  pruefe(/noch nicht abgeschlossen/.test(warn), "sie sagt, was unfertig ist");
  pruefe(/noch einmal drücken/.test(warn), "und was zu tun ist");
  pruefe(/weiterzuarbeiten/.test(warn), "und wie man zurückkommt");

  await page.click('[data-tun="vg-vorschau-raus:V0002"]');
  await page.waitForTimeout(450);
  pruefe(!(await page.evaluate(() => window.ProbeRahmen.dialogOffen())),
    "beim zweiten Mal wird der Vorgang verlassen");

  /* Und Escape im Vorgang selbst schliesst weiterhin. */
  await oeffnen(page);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  pruefe(!(await page.evaluate(() => window.ProbeRahmen.dialogOffen())),
    "Escape im Vorgang schliesst ihn weiterhin — der Schutz bleibt nicht hängen");
  await ctx.close();
}

/* ═══ 7. Kartenaktionen folgen dem eigenen Teilschritt ═════════ */
console.log("\n── 7. Übernehmen und Weitergeben nur, wo es etwas zu tun gibt ──");
{
  const { ctx, page } = await seite("personal");
  await page.click('[data-tun="vg-reiter:alle"]');
  await page.waitForTimeout(300);

  /* (a) eigener Teilschritt offen und unzugewiesen. */
  let k = await kartenknoepfe(page);
  pruefe(k.some((x) => x.text === "Übernehmen"), "unzugewiesen: „Übernehmen“ ist da");
  pruefe(!k.some((x) => x.text === "Weitergeben"), "und „Weitergeben“ nicht");
  pruefe(k.some((x) => x.tun === "vg-teil-uebernehmen:V0002|personal"),
    "die Aktion nennt den eigenen Teilschritt ausdrücklich");

  /* (b) eigener Teilschritt offen und selbst übernommen. */
  await page.click('.vorgang[data-vorgang="V0002"] [data-tun="vg-teil-uebernehmen:V0002|personal"]');
  await page.waitForTimeout(500);
  k = await kartenknoepfe(page);
  pruefe(k.some((x) => x.text === "Weitergeben"), "selbst übernommen: „Weitergeben“ ist da");
  pruefe(!k.some((x) => x.text === "Übernehmen"), "und „Übernehmen“ nicht mehr");
  pruefe(k.some((x) => x.tun === "vg-teil-weitergeben:V0002|personal"),
    "auch sie nennt den Teilschritt");

  /* (c) eigener Teilschritt erledigt, fremder offen. */
  await oeffnen(page);
  await page.click('.dialog-kasten [data-tun="vg-bescheinigung:V0002"]');
  await page.waitForTimeout(400);
  await page.click('[data-tun="vg-einsicht-ja:V0002"]');
  await page.waitForTimeout(400);
  await page.click('.dialog-kasten [data-tun="vg-ergebnis:V0002|ok"]');
  await page.waitForTimeout(450);
  await page.click('.dialog-kasten [data-tun="vg-teil-erledigen:V0002|personal"]');
  await page.waitForTimeout(450);
  await zu(page);

  const namen = await kartenNamen(page);
  pruefe(!namen.includes("Übernehmen"),
    "eigener Teil erledigt: kein „Übernehmen“ — das war der Befund");
  pruefe(!namen.includes("Weitergeben"), "und kein „Weitergeben“");
  pruefe(namen.length === 1 && /Krankmeldung ansehen/.test(namen[0]),
    `nur noch „Krankmeldung ansehen“ (${namen.join(" | ")})`);

  /* Die direkten Aufrufe setzen dieselbe Regel durch. */
  await page.evaluate(() => window.ProbeVorgaenge.tun("vg-teil-weitergeben", "V0002|personal"));
  await page.waitForTimeout(300);
  const nachWeiter = await page.evaluate(() => {
    const x = window.ProbeDaten.vorgangVon("V0002").teile.personal;
    return { zustand: x.zustand, wer: x.verantwortlich ? x.verantwortlich.name : "" };
  });
  pruefe(nachWeiter.zustand === "erledigt" && /Testpersonal 01/.test(nachWeiter.wer),
    "ein erledigter Teilschritt wird auch direkt nicht weitergegeben");
  await page.evaluate(() => window.ProbeVorgaenge.tun("vg-teil-uebernehmen", "V0002|personal"));
  await page.waitForTimeout(300);
  pruefe(await page.evaluate(() =>
    window.ProbeDaten.vorgangVon("V0002").teile.personal.zustand) === "erledigt",
    "und auch nicht erneut übernommen");
  await page.evaluate(() => window.ProbeVorgaenge.tun("vg-teil-uebernehmen", "V0002|planung"));
  await page.waitForTimeout(300);
  pruefe(await page.evaluate(() =>
    window.ProbeDaten.vorgangVon("V0002").teile.planung.verantwortlich) === null,
    "den fremden Teilschritt kann Personal auch direkt nicht übernehmen");

  /* Die alten Gesamtaktionen greifen bei Teilvorgaengen nicht mehr. */
  await page.evaluate(() => window.ProbeVorgaenge.tun("vg-uebernehmen", "V0002"));
  await page.waitForTimeout(300);
  await page.evaluate(() => window.ProbeVorgaenge.tun("vg-weitergeben", "V0002"));
  await page.waitForTimeout(300);
  pruefe(await page.evaluate(() =>
    window.ProbeDaten.vorgangVon("V0002").teile.personal.zustand) === "erledigt",
    "die Gesamtaktionen fassen einen Vorgang mit Teilschritten nicht an");

  /* (d) ganzer Vorgang erledigt. */
  await page.selectOption("[data-rolle]", "dispatcher");
  await page.waitForTimeout(400);
  await oeffnen(page);
  await uebernehmen(page, "planung");
  await page.click('.dialog-kasten [data-tun="vg-teil-erledigen:V0002|planung"]');
  await page.waitForTimeout(450);
  await zu(page);
  const dNamen = await kartenNamen(page);
  pruefe(dNamen.length === 1 && dNamen[0] === "Ansehen",
    `erledigt, ohne Recht zur Wiedereröffnung: nur „Ansehen“ (${dNamen.join(" | ")})`);

  await page.selectOption("[data-rolle]", "personal");
  await page.waitForTimeout(400);
  await page.click('[data-tun="vg-reiter:alle"]');
  await page.waitForTimeout(300);
  const pNamen = await kartenNamen(page);
  pruefe(pNamen.includes("Ansehen"), "erledigt: „Ansehen“");
  pruefe(pNamen.includes("Wiedereröffnen"), "und — weil berechtigt — „Wiedereröffnen“");
  pruefe(pNamen.length === 2, `und sonst nichts (${pNamen.join(" | ")})`);
  await ctx.close();
}

/* ═══ 8. Netz und Quelltext ═════════════════════════════════════ */
console.log("\n── 8. Nichts geht nach draussen ──");
pruefe(fremdeAnfragen.length === 0,
  `keine einzige Anfrage nach aussen im ganzen Lauf (${fremdeAnfragen.length})`);
{
  const quelle = await readFile(join(PROBE, "probe-vorgaenge.js"), "utf8");
  const ohneKommentar = quelle.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
  pruefe(!/fetch\s*\(|new XMLHttpRequest|createClient\s*\(|supabase\./i.test(ohneKommentar),
    "kein Netzzugriff im Vorgangsmodul");
  /* Die Listenkarte darf den Namen der Teilaktion nicht mehr tragen. */
  pruefe(!/function hauptaktion[\s\S]{0,900}teil\.aktion/.test(ohneKommentar),
    "hauptaktion() verwendet den Namen des Teilschritts nicht mehr");
}

await browser.close();
server.close();

console.log("\n" + "═".repeat(59));
console.log(`Kartenbeschriftung: ${bestanden} bestanden, ${offen.length} nicht bestanden`);
if (offen.length) {
  console.log("\nNicht bestanden:");
  for (const n of offen) console.log("  - " + n);
}
console.log(`
ALLES SIMULIERT. Keine Datenquelle, kein Upload, kein Versand. Dieser
Lauf sagt nichts ueber die produktive Instanz.`);
console.log("═".repeat(59));
process.exit(offen.length ? 1 : 0);
