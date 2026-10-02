/* ============================================================
   Prueflauf: eine Datenwahrheit, Sortierung, Erledigt-Liste
   ============================================================
   Gemessene Ausgangsfehler des manuellen Rundgangs:

   1. Am selben Tag standen drei Zahlen nebeneinander:
      Kalender 10, Fahrtenliste "Alle" 10, Uebersicht 9.
      Ursache: Die Uebersicht rechnete "storniert" heraus, die
      anderen nicht - drei Stellen, drei Rechnungen.

   2. "4 noch nicht zugewiesen" oeffnete den Filter "Ungeplant" mit
      2 Fahrten. Ursache: Die Karte rechnete eingang+ungeplant, das
      Ziel war aber der Zustandsfilter "ungeplant".

   3. "9 Warnungen" oeffnete Meldungen im Reiter "Erledigt (3)".
      Ursache: Der Sprung setzte keinen Reiter, und jeder Sprung mit
      Zusatz setzte pauschal den FAHRTfilter.

   4. Fahrten standen unsortiert. Eine Anfrage ohne geklaerte Zeit
      waere zwischen Uhrzeiten gelandet.

   5. Erledigte Vorgaenge blieben bis zur Archivfrist in der
      Arbeitsliste, ohne Weg sie auszublenden.

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
const PORT = 5379;
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

const kennzahl = async (page, text) => {
  const alle = await page.$$eval(".kennzahl",
    (n) => n.map((x) => ({ t: x.textContent.replace(/\s+/g, " ").trim(), ziel: x.dataset.ziel })));
  return alle.find((x) => x.t.includes(text)) || null;
};
const zahlVon = (k) => (k ? Number(String(k.t).match(/^\d+/)[0]) : NaN);
const zeilen = (page) => page.$$eval(".liste tbody tr", (n) => n.length);
const bereich = async (page, id) => {
  await page.evaluate((x) => window.ProbeRahmen.geheZu(x), id);
  await page.waitForTimeout(400);
};

/* ═══ 1. „Fahrten heute" ist überall dieselbe Zahl ══════════════ */
console.log("\n── 1. Eine Zahl, drei Ansichten ──");
{
  const { ctx, page, fehler } = await seite("admin");

  const kUebersicht = await kennzahl(page, "Fahrten heute");
  pruefe(Boolean(kUebersicht), "die Übersicht nennt „Fahrten heute“");
  const zahlUebersicht = zahlVon(kUebersicht);

  /* Dieselbe Definition, direkt aus den Daten. */
  const zahlQuelle = await page.evaluate(() => window.ProbeDaten.fahrtenHeute().length);
  pruefe(zahlUebersicht === zahlQuelle,
    `Übersicht und gemeinsame Definition stimmen (${zahlUebersicht} / ${zahlQuelle})`);

  /* Die Fahrtenliste „Alle". */
  await bereich(page, "fahrten");
  await page.click('[data-tun="fahrt-filter:alle"]');
  await page.waitForTimeout(400);
  const zahlListe = await zeilen(page);
  pruefe(zahlListe === zahlUebersicht,
    `die Fahrtenliste „Alle“ zeigt dieselbe Zahl (${zahlListe})`);
  const knopfAlle = await page.textContent('[data-tun="fahrt-filter:alle"]');
  pruefe(new RegExp(String(zahlUebersicht) + " Fahrten").test(knopfAlle),
    `und sagt sie auch am Filter (${knopfAlle.replace(/\s+/g, " ").trim()})`);

  /* Der Kalender. */
  await bereich(page, "kalender");
  await page.click('[data-tun="kal-sicht:tag"]');
  await page.waitForTimeout(400);
  const kalText = (await page.textContent(".flaeche")).replace(/\s+/g, " ");
  pruefe(new RegExp(String(zahlUebersicht) + " Fahrten").test(kalText),
    `der Kalender zeigt dieselbe Zahl (${(kalText.match(/\d+ Fahrten?/) || ["—"])[0]})`);

  /* Stornierte Fahrten sind ausdruecklich enthalten - das war die
     Ursache der Abweichung. */
  const storniert = await page.evaluate(() =>
    window.ProbeDaten.fahrten.filter((f) => f.zustand === "storniert").length);
  pruefe(storniert > 0, `es gibt stornierte Fahrten im Bestand (${storniert})`);
  pruefe(zahlQuelle === await page.evaluate(() => window.ProbeDaten.fahrten.length),
    "„Fahrten heute“ enthält sie — eine Definition, keine Ausnahme");

  pruefe(fehler.length === 0, `keine Skriptfehler${fehler.length ? " (" + fehler[0] + ")" : ""}`);
  await ctx.close();
}

/* ═══ 2. „Noch nicht zugewiesen" öffnet genau diese Menge ═══════ */
console.log("\n── 2. Die Karte sagt vier, die Liste zeigt vier ──");
{
  const { ctx, page } = await seite("admin");
  const k = await kennzahl(page, "noch nicht zugewiesen");
  pruefe(Boolean(k), "die Kennzahl ist da");
  const zahl = zahlVon(k);
  pruefe(zahl > 0, `sie nennt eine Zahl (${zahl})`);
  pruefe(k.ziel === "fahrten:offen", `und führt in die passende Liste (${k.ziel})`);

  const quelle = await page.evaluate(() => window.ProbeDaten.nichtZugewiesen().length);
  pruefe(zahl === quelle, `sie stimmt mit der Definition (${zahl} / ${quelle})`);

  await page.click('[data-ziel="fahrten:offen"]');
  await page.waitForTimeout(500);
  const gezeigt = await zeilen(page);
  pruefe(gezeigt === zahl, `die Zielliste zeigt genau diese Zahl (${gezeigt})`);

  /* Und sie enthaelt beide Zustaende. */
  const zustaende = await page.$$eval(".liste tbody tr td:nth-child(8)",
    (n) => n.map((x) => x.textContent.replace(/\s+/g, " ").trim()));
  pruefe(zustaende.some((x) => /Eingang/.test(x)), "sie enthält Fahrten im Eingang");
  pruefe(zustaende.some((x) => /Ungeplant/.test(x)), "und ungeplante Fahrten");

  /* Eine ungeplante Fahrt MIT Fahrer gehoert nicht dazu. */
  const mitFahrer = await page.evaluate(() => {
    const f = window.ProbeDaten.fahrten.find((x) => x.zustand === "ungeplant");
    if (!f) return null;
    f.fahrerId = "M01";
    return { id: f.id, zaehlt: window.ProbeDaten.nichtZugewiesen().some((x) => x.id === f.id) };
  });
  pruefe(mitFahrer && mitFahrer.zaehlt === false,
    "eine ungeplante Fahrt MIT Fahrer zählt nicht als „nicht zugewiesen“");
  await ctx.close();
}

/* ═══ 3. Chronologische Sortierung ══════════════════════════════ */
console.log("\n── 3. Die Liste ist chronologisch ──");
{
  const { ctx, page } = await seite("admin");
  await bereich(page, "fahrten");
  await page.click('[data-tun="fahrt-filter:alle"]');
  await page.waitForTimeout(400);

  const zeitSpalte = await page.$$eval(".liste tbody tr td:nth-child(2)",
    (n) => n.map((x) => x.textContent.trim()));
  const echteZeiten = zeitSpalte.filter((x) => /^\d{2}:\d{2}$/.test(x));
  const sortiert = echteZeiten.slice().sort();
  pruefe(echteZeiten.join(",") === sortiert.join(","),
    `aufsteigend nach Abholzeit (${echteZeiten.join(" ")})`);
  pruefe(echteZeiten.length >= 5, `genug Zeiten zum Vergleichen (${echteZeiten.length})`);

  /* Fahrten ohne Zeit stehen nicht dazwischen. */
  const ersteOhne = zeitSpalte.findIndex((x) => !/^\d{2}:\d{2}$/.test(x));
  pruefe(ersteOhne === -1 || ersteOhne === echteZeiten.length,
    `eine Fahrt ohne Zeit steht nicht zwischen Uhrzeiten (Position ${ersteOhne})`);
  pruefe(Boolean(await page.$(".abschnitt-offen")),
    "sie steht in einem eigenen, benannten Abschnitt");
  const abText = await page.textContent(".abschnitt-offen");
  pruefe(/Zeit noch nicht geklärt/.test(abText), `der Abschnitt ist benannt (${abText.replace(/\s+/g, " ").trim()})`);
  /* Es gibt mehrere .flaeche - textContent nimmt nur die erste.
     Gelesen wird deshalb der ganze Hauptbereich. */
  const hinweis = (await page.textContent(".haupt")).replace(/\s+/g, " ");
  pruefe(/Reihenfolge wäre erfunden/.test(hinweis),
    "und sagt, warum sie nicht einsortiert wird");

  /* Gleiche Uhrzeit: stabil nach Vorgangsnummer. */
  const stabil = await page.evaluate(() => {
    const a = { id: "FA-9002", zeit: "07:00", zustand: "geplant" };
    const b = { id: "FA-9001", zeit: "07:00", zustand: "geplant" };
    const s1 = window.ProbeDaten.nachZeit([a, b]).map((x) => x.id).join(",");
    const s2 = window.ProbeDaten.nachZeit([b, a]).map((x) => x.id).join(",");
    return { s1, s2 };
  });
  pruefe(stabil.s1 === stabil.s2 && stabil.s1 === "FA-9001,FA-9002",
    `bei gleicher Uhrzeit entscheidet die Nummer, stabil (${stabil.s1})`);

  /* Der Tagesverlauf der Uebersicht bleibt chronologisch. */
  await bereich(page, "uebersicht");
  const verlauf = await page.$$eval(".liste tbody tr td:nth-child(1)",
    (n) => n.map((x) => x.textContent.trim()));
  const vz = verlauf.filter((x) => /^\d{2}:\d{2}$/.test(x));
  pruefe(vz.join(",") === vz.slice().sort().join(","),
    `der Tagesverlauf bleibt chronologisch (${vz.join(" ")})`);
  await ctx.close();
}

/* ═══ 4. Warnungen öffnen genau die offenen Warnungen ═══════════ */
console.log("\n── 4. Neun Warnungen, neun Warnungen ──");
{
  const { ctx, page } = await seite("admin");
  const k = await kennzahl(page, "Warnungen");
  const zahl = zahlVon(k);
  pruefe(zahl > 0, `die Übersicht nennt Warnungen (${zahl})`);
  pruefe(k.ziel === "meldungen:warnungen", `und führt in die Warnungsliste (${k.ziel})`);

  await page.click('[data-ziel="meldungen:warnungen"]');
  await page.waitForTimeout(500);
  const gewaehlt = await page.$$eval(".filterzeile .filterchip",
    (n) => n.filter((x) => x.getAttribute("aria-pressed") === "true").map((x) => x.textContent.trim()));
  pruefe(gewaehlt.length === 1 && /Offene Warnungen/.test(gewaehlt[0]),
    `der Reiter „Offene Warnungen“ ist gewählt (${gewaehlt.join(",")})`);
  const gezeigt = (await page.$$(".vorgang")).length;
  pruefe(gezeigt === zahl, `er zeigt genau diese Zahl (${gezeigt} / ${zahl})`);

  /* Kein erledigter Vorgang ist darunter. */
  const staende = await page.$$eval(".vorgang", (n) => n.map((x) => x.textContent));
  pruefe(!staende.some((x) => /Gesamtstand\s*Erledigt/.test(x.replace(/\s+/g, " "))),
    "kein erledigter Vorgang ist darunter");

  /* Der Reiterzaehler stimmt mit der Kennzahl. */
  const chip = await page.textContent('[data-tun="vg-reiter:warnungen"]');
  pruefe(new RegExp("\\(" + zahl + "\\)").test(chip),
    `der Reiterzähler stimmt (${chip.replace(/\s+/g, " ").trim()})`);

  /* Jede Warnung nennt, worum es geht. */
  const erste = (await page.textContent(".vorgang")).replace(/\s+/g, " ");
  for (const feld of ["Betrifft", "Eingang", "Verantwortlich", "Gesamtstand"]) {
    pruefe(erste.includes(feld), `jede Warnung nennt ${feld}`);
  }
  pruefe(/Warnung|Aufgabe|Meldung/.test(erste), "und ihre Art");

  /* Ein voriger Reiter wird ueberschrieben - das war der Befund. */
  await page.click('[data-tun="vg-reiter:erledigt"]');
  await page.waitForTimeout(350);
  await bereich(page, "uebersicht");
  await page.click('[data-ziel="meldungen:warnungen"]');
  await page.waitForTimeout(500);
  const nochmal = await page.$$eval(".filterzeile .filterchip",
    (n) => n.filter((x) => x.getAttribute("aria-pressed") === "true").map((x) => x.textContent.trim()));
  pruefe(/Offene Warnungen/.test(nochmal.join(",")),
    "auch nach einem anderen Reiter führt der Sprung in die Warnungen");
  await ctx.close();
}

/* ═══ 5. Aus der Erledigt-Liste entfernen ist kein Löschen ══════ */
console.log("\n── 5. Entfernen ohne zu löschen ──");
{
  const { ctx, page } = await seite("personal");
  await bereich(page, "meldungen");
  await page.click('[data-tun="vg-reiter:erledigt"]');
  await page.waitForTimeout(400);

  const ids = await page.$$eval(".vorgang", (n) => n.map((x) => x.dataset.vorgang));
  pruefe(ids.length > 0, `es gibt erledigte Vorgänge (${ids.join(", ")})`);
  const id = ids[0];

  const knopf = await page.$(`.vorgang[data-vorgang="${id}"] [data-tun="vg-aus-liste:${id}"]`);
  pruefe(Boolean(knopf), "es gibt die Aktion „Aus Erledigt-Liste entfernen“");
  const text = await knopf.textContent();
  pruefe(/Aus Erledigt-Liste entfernen/.test(text), `sie ist verständlich benannt (${text.trim()})`);
  pruefe(!/löschen|Löschen/.test(text), "und heisst nirgends „löschen“");

  /* Vollstaendiger Datenstand vorher. */
  const vorher = await page.evaluate((x) => {
    const v = window.ProbeDaten.vorgangVon(x);
    return JSON.stringify({
      titel: v.titel, teile: v.teile, daten: v.daten, zustand: v.zustand,
      verantwortlich: v.verantwortlich, abgeschlossenAm: v.abgeschlossenAm,
      archivAb: v.archivAb, notizen: v.notizen
    });
  }, id);
  const protoVorher = await page.evaluate(() => window.ProbeDaten.protokoll.length);
  const anzahlVorher = await page.evaluate(() => window.ProbeDaten.vorgaenge.length);

  await knopf.click();
  await page.waitForTimeout(500);

  /* Nichts geloescht. */
  pruefe(await page.evaluate(() => window.ProbeDaten.vorgaenge.length) === anzahlVorher,
    "kein Vorgang ist verschwunden");
  const nachher = await page.evaluate((x) => {
    const v = window.ProbeDaten.vorgangVon(x);
    return JSON.stringify({
      titel: v.titel, teile: v.teile, daten: v.daten, zustand: v.zustand,
      verantwortlich: v.verantwortlich, abgeschlossenAm: v.abgeschlossenAm,
      archivAb: v.archivAb, notizen: v.notizen
    });
  }, id);
  pruefe(vorher === nachher,
    "Inhalt, Teilschritte, Verantwortliche, Abschlussdatum und Notizen sind unverändert");

  /* Aus der Arbeitsliste verschwunden. */
  const nochInErledigt = await page.$$eval(".vorgang", (n) => n.map((x) => x.dataset.vorgang));
  pruefe(!nochInErledigt.includes(id), "er steht nicht mehr in der Erledigt-Liste");

  /* Im Archiv auffindbar. */
  await page.click('[data-tun="vg-reiter:archiv"]');
  await page.waitForTimeout(400);
  const imArchiv = await page.$$eval(".vorgang", (n) => n.map((x) => x.dataset.vorgang));
  pruefe(imArchiv.includes(id), "im Archiv ist er auffindbar");
  const archivText = (await page.textContent(`.vorgang[data-vorgang="${id}"]`)).replace(/\s+/g, " ");
  pruefe(/aus der Arbeitsliste entfernt/.test(archivText),
    "und die Zeile sagt, warum er dort steht");

  /* Über die Suche auffindbar. */
  await page.click('[data-tun="vg-reiter:alle"]');
  await page.waitForTimeout(300);
  await page.fill("[data-vg-suche]", id);
  await page.waitForTimeout(450);
  pruefe(Boolean(await page.$(`.vorgang[data-vorgang="${id}"]`)),
    "und über die Suche ebenfalls");
  await page.fill("[data-vg-suche]", "");
  await page.waitForTimeout(350);

  /* Protokoll. */
  const p = await page.evaluate(() => window.ProbeDaten.protokoll.slice());
  pruefe(p.length === protoVorher + 1, "es entsteht genau ein Protokolleintrag");
  const e = p[0];
  pruefe(/Aus der Erledigt-Liste entfernt/.test(e.was), "er benennt die Aktion");
  pruefe(/Testpersonal 01/.test(e.wer), `wer (${e.wer})`);
  pruefe(Boolean(e.kennung) && Boolean(e.rolle), "mit Kennung und Rolle");
  pruefe(Boolean(e.datum) && Boolean(e.zeit), "wann");
  pruefe(new RegExp(id).test(e.betrifft), `betroffener Vorgang (${e.betrifft})`);
  pruefe(/in der Arbeitsliste/.test(e.vorher), `vorheriger Listenstatus (${e.vorher})`);
  pruefe(/aus der Arbeitsliste entfernt/.test(e.nachher), `nachheriger Listenstatus (${e.nachher})`);
  pruefe(/Archiv weiter auffindbar/.test(e.nachher), "und dass er auffindbar bleibt");
  pruefe(await page.evaluate(() => Object.isFrozen(window.ProbeDaten.protokoll[0])),
    "der Eintrag ist unveränderlich");

  /* Zurueck in die Liste. */
  await page.click('[data-tun="vg-reiter:archiv"]');
  await page.waitForTimeout(350);
  pruefe(Boolean(await page.$(`[data-tun="vg-in-liste:${id}"]`)),
    "es gibt den Weg zurück in die Arbeitsliste");

  /* Wiedereroeffnung hebt die Ausblendung auf. */
  pruefe(Boolean(await page.$(`[data-tun="vg-wiedereroeffnen:${id}"]`)),
    "die Wiedereröffnung bleibt möglich");
  await page.click(`.vorgang[data-vorgang="${id}"] [data-tun="vg-wiedereroeffnen:${id}"]`);
  await page.waitForTimeout(450);
  await page.fill("[data-wieder-grund]", "Testgrund: doch noch offen");
  await page.click('[data-tun="vg-wieder-ja"]');
  await page.waitForTimeout(500);
  const danach = await page.evaluate((x) => {
    const v = window.ProbeDaten.vorgangVon(x);
    return { ausListe: v.ausListe, zustand: v.zustand };
  }, id);
  pruefe(danach.ausListe === false,
    "eine Wiedereröffnung hebt die Ausblendung auf — sonst wäre er zu tun und unsichtbar");
  pruefe(danach.zustand === "bearbeitung", "und er ist wieder in Bearbeitung");
  await ctx.close();

  /* Die Disposition darf nicht wiedereroeffnen, aber ausblenden. */
  const d = await seite("dispatcher");
  await bereich(d.page, "meldungen");
  await d.page.click('[data-tun="vg-reiter:erledigt"]');
  await d.page.waitForTimeout(400);
  const dIds = await d.page.$$eval(".vorgang", (n) => n.map((x) => x.dataset.vorgang));
  if (dIds.length) {
    pruefe(Boolean(await d.page.$(`[data-tun="vg-aus-liste:${dIds[0]}"]`)),
      "die Disposition darf aus ihrer Liste entfernen");
    pruefe(!(await d.page.$(`[data-tun="vg-wiedereroeffnen:${dIds[0]}"]`)),
      "aber nicht wiedereröffnen — das bleibt rollenabhängig");
  } else {
    pruefe(false, "die Disposition sieht erledigte Vorgänge");
  }
  await d.ctx.close();
}

/* ═══ 6. Die vier Zustände sind klar getrennt ═══════════════════ */
console.log("\n── 6. Erledigt, ausgeblendet, archiviert, wiedereröffnet ──");
{
  const quelle = await readFile(join(PROBE, "probe-vorgaenge.js"), "utf8");
  pruefe(/fachlich erledigt/.test(quelle), "„fachlich erledigt“ ist benannt");
  pruefe(/ausgeblendet/.test(quelle), "„ausgeblendet“ ist benannt");
  pruefe(/archiviert/.test(quelle), "„archiviert“ ist benannt");
  pruefe(/wiedereroeffnet/.test(quelle), "„wiedereröffnet“ ist benannt");
  pruefe(/LISTENSTAENDE/.test(quelle), "und es gibt dafür einen eigenen Begriffssatz");

  const { ctx, page } = await seite("personal");
  await bereich(page, "meldungen");
  await page.click('[data-tun="vg-reiter:archiv"]');
  await page.waitForTimeout(400);
  const hinweis = (await page.textContent(".flaeche")).replace(/\s+/g, " ");
  pruefe(/90 Tagen nach dem Abschluss/.test(hinweis), "das Archiv nennt die Frist");
  pruefe(/aus der Erledigt-Liste entfernt hat/.test(hinweis),
    "und den zweiten Weg hinein");
  pruefe(/kein Löschen/.test(hinweis), "es sagt ausdrücklich, dass das kein Löschen ist");
  pruefe(/Gelöscht wird hier nichts/.test(hinweis), "und wiederholt es am Ende");
  await ctx.close();
}

/* ═══ 7. Darstellung und Netz ═══════════════════════════════════ */
console.log("\n── 7. Darstellung, Netz ──");
for (const [breite, hoehe] of [[320, 568], [390, 844], [430, 932], [1440, 900]]) {
  const { ctx, page } = await seite("admin", breite, hoehe);
  await bereich(page, "fahrten");
  await page.click('[data-tun="fahrt-filter:alle"]');
  await page.waitForTimeout(400);
  const ueber = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  pruefe(ueber <= 0, `bei ${breite}px kein waagerechter Überlauf (${ueber}px)`);
  await ctx.close();
}

pruefe(fremdeAnfragen.length === 0,
  `keine einzige Anfrage nach aussen im ganzen Lauf (${fremdeAnfragen.length})`);
{
  const bereicheJs = await readFile(join(PROBE, "probe-bereiche.js"), "utf8");
  const ohneKommentar = bereicheJs.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
  /* Keine zweite Rechnung mehr in der Uebersicht. */
  pruefe(!/function uebersicht[\s\S]{0,1200}storniert/.test(ohneKommentar),
    "die Uebersicht rechnet storniert nicht mehr selbst heraus");
  pruefe(!/fetch\s*\(|new XMLHttpRequest|createClient\s*\(/i.test(ohneKommentar),
    "kein Netzzugriff im Bereichsmodul");
}

await browser.close();
server.close();

console.log("\n" + "═".repeat(59));
console.log(`Eine Wahrheit: ${bestanden} bestanden, ${offen.length} nicht bestanden`);
if (offen.length) {
  console.log("\nNicht bestanden:");
  for (const n of offen) console.log("  - " + n);
}
console.log(`
ALLES SIMULIERT. Keine Datenquelle, kein Upload, kein Versand. Dieser
Lauf sagt nichts ueber die produktive Instanz.`);
console.log("═".repeat(59));
process.exit(offen.length ? 1 : 0);
