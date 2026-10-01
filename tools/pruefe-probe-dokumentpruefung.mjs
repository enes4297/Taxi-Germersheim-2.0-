/* ============================================================
   Prueflauf: Dokumentpruefung der Krankmeldung
   ============================================================
   Der manuelle Test hat gezeigt: Personal konnte die
   Dokumentpruefung abschliessen, ohne die Bescheinigung je geoeffnet
   zu haben. Sichtbar waren nur "Dokumentpruefung abgeschlossen" und
   "Weitergeben" - der Bescheinigungsblock stand UNTER der
   Abschlussaktion.

   Geprueft wird jetzt:

   1. Die Reihenfolge im Dialog: erst Inhalt, dann Handlung.
   2. Der Dateiname ist anklickbar und oeffnet eine sichere Vorschau.
   3. Ohne Einsicht gibt es kein Pruefergebnis.
   4. Ohne Einsicht UND Ergebnis gibt es keinen Abschluss - an keiner
      der beiden Stellen, und auch nicht, wenn man die Aktion direkt
      aufruft.
   5. Einsicht und Ergebnis stehen im Protokoll, mit Person und Rolle.
   6. Protokolliert wird NIE ein Dokumentinhalt oder eine Diagnose.
   7. Die Disposition sieht weder Datei noch Dateiname.

   ALLES SIMULIERT. Keine Datenquelle, kein Upload, kein Versand.
   Es gibt in dieser Probe keine Datei und keine Storage-API. Ein
   bestandener Lauf sagt nichts ueber das Verhalten der echten
   Storage-API.
   ============================================================ */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";

const { chromium } = await import(
  "file:///" + join(process.cwd(), "fahrer/tests/node_modules/playwright/index.mjs").replace(/\\/g, "/")
);

const WURZEL = process.cwd();
const PROBE = join(WURZEL, "probe-betriebsportal");
const PORT = 5394;
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

const oeffnen = async (page) => {
  await page.click('.vorgang[data-vorgang="V0002"] [data-tun="vg-oeffnen:V0002"]');
  await page.waitForTimeout(450);
};
const knoepfe = (page) =>
  page.$$eval(".dialog-kasten [data-tun]", (n) => n.map((x) => x.dataset.tun));
const teilstand = (page) => page.evaluate(() =>
  window.ProbeDaten.vorgaenge.find((x) => x.id === "V0002").teile.personal.zustand);
const daten = (page) => page.evaluate(() =>
  window.ProbeDaten.vorgaenge.find((x) => x.id === "V0002").daten);
const protokoll = (page) => page.evaluate(() => window.ProbeDaten.protokoll.slice());
/* Seit der Geschaeftsregel vom 01.10.2026 gibt es eine Kette von
   Nachweisen. Geprueft wird immer der letzte. */
const aktuell = (d) => d.nachweise[d.nachweise.length - 1];

/* ═══ 1. Erst der Inhalt, dann die Handlung ═════════════════════ */
console.log("\n── 1. Die Reihenfolge im Dialog ──");
{
  const { ctx, page, fehler } = await seite("personal");
  await oeffnen(page);

  const abschnitte = await page.$$eval(".dialog-rumpf > .dialog-schritt",
    (n) => n.map((x) => (x.querySelector("h3") ? x.querySelector("h3").textContent.trim() : "")));
  const beleg = abschnitte.findIndex((x) => x.startsWith("Eingereichte Bescheinigung"));
  const teile = abschnitte.findIndex((x) => x.startsWith("Teilschritte"));
  pruefe(beleg >= 0, "der Bescheinigungsblock ist da");
  pruefe(teile >= 0, "der Teilschrittblock ist da");
  pruefe(beleg < teile,
    `die Bescheinigung steht VOR der Abschlussaktion (${beleg} < ${teile})`);

  const kette = await page.textContent(".pruefkette");
  pruefe(/1\. Bescheinigung ansehen/.test(kette), "Schritt 1: ansehen");
  pruefe(/2\. Prüfergebnis festhalten/.test(kette), "Schritt 2: bewerten");
  pruefe(/3\. Teilschritt abschließen/.test(kette), "Schritt 3: abschliessen");
  pruefe(fehler.length === 0, `keine Skriptfehler${fehler.length ? " (" + fehler[0] + ")" : ""}`);
  await ctx.close();
}

/* ═══ 2. Ohne Einsicht kein Abschluss ═══════════════════════════ */
console.log("\n── 2. Kein Abschluss ohne Einsicht ──");
{
  const { ctx, page } = await seite("personal");
  await oeffnen(page);

  const k = await knoepfe(page);
  pruefe(!k.some((x) => x.startsWith("vg-teil-erledigen")),
    "am Teilschritt gibt es keine Abschlussaktion");
  pruefe(!k.some((x) => x.startsWith("vg-erledigen")),
    "und in der Fußzeile auch nicht");

  const text = await page.textContent(".dialog-kasten");
  pruefe(/noch nicht geöffnet/i.test(text), "der Grund steht dabei");
  pruefe(/Erst ansehen, dann bewerten, dann abschließen/.test(text),
    "und die Reihenfolge ist ausgeschrieben");

  const gesperrt = await page.$$eval(".dialog-kasten button[disabled]",
    (n) => n.map((x) => x.textContent.trim()));
  pruefe(gesperrt.some((x) => /Dokumentprüfung abgeschlossen/.test(x)),
    "die Aktion ist sichtbar, aber gesperrt — nicht versteckt");

  /* Ein gesperrter Knopf ist Bequemlichkeit. Also direkt aufrufen. */
  await page.evaluate(() => window.ProbeVorgaenge.tun("vg-teil-erledigen", "V0002|personal"));
  await page.waitForTimeout(350);
  pruefe(await teilstand(page) === "offen",
    "auch der direkte Aufruf der Aktion schliesst nichts ab");
  await page.evaluate(() => window.ProbeVorgaenge.tun("vg-erledigen", "V0002"));
  await page.waitForTimeout(350);
  pruefe(await teilstand(page) === "offen", "und der zweite Weg ebenso wenig");

  /* Ein Ergebnis ohne Einsicht ist keine Pruefung. */
  await page.evaluate(() => window.ProbeVorgaenge.tun("vg-ergebnis", "V0002|ok"));
  await page.waitForTimeout(350);
  pruefe(aktuell(await daten(page)).ergebnis === "",
    "ein Prüfergebnis ohne Einsicht wird nicht angenommen");
  await ctx.close();
}

/* ═══ 3. Die Bescheinigung ansehen ══════════════════════════════ */
console.log("\n── 3. Der Dateiname öffnet die Vorschau ──");
{
  const { ctx, page } = await seite("personal");
  await oeffnen(page);

  const nameKnopf = await page.$('.alslink[data-tun="vg-bescheinigung:V0002"]');
  pruefe(Boolean(nameKnopf), "der Dateiname selbst ist anklickbar");
  pruefe(/Testbescheinigung-M02-01\.pdf/.test(await nameKnopf.textContent()),
    "und trägt den Dateinamen");

  await nameKnopf.click();
  await page.waitForTimeout(450);
  const text = await page.textContent(".dialog-kasten");
  pruefe(/Bescheinigung ansehen/.test(text), "die Vorschau öffnet sich");
  pruefe(/keine Datei/i.test(text), "sie sagt, dass in der Probe keine Datei vorliegt");
  pruefe(/Storage-API/.test(text), "und benennt die fehlende Storage-API");
  pruefe(/signierte Adresse/.test(text), "sie nennt die kurz gültige, signierte Adresse");
  pruefe(/kein Anhang per E-Mail/i.test(text), "kein Anhang per E-Mail");
  pruefe(/keine öffentliche\s+Adresse/.test(text.replace(/\s+/g, " ")), "keine öffentliche Adresse");
  pruefe(/Testbescheinigung-M02-01\.pdf/.test(text), "der Dateiname steht in der Vorschau");
  pruefe(/Testfahrer 02/.test(text), "und der betroffene Mitarbeiter");
  /*
    Nicht nach dem WORT suchen - der Satz, der eine Diagnose
    ausschliesst, enthaelt es selbst. Das war in dieser Sitzung
    bereits der vierte Fehlalarm derselben Art. Geprueft wird
    deshalb: Die Zusicherung MUSS dastehen, und es darf kein
    Beschriftungsfeld geben, das so etwas aufnehmen wuerde.
  */
  pruefe(/Keine Diagnose, kein\s+Krankheitsgrund, kein Dokumentinhalt/.test(text.replace(/\s+/g, " ")),
    "die Zusicherung steht ausdrücklich da");
  const felder = await page.$$eval(".dialog-kasten dt", (n) => n.map((x) => x.textContent.trim()));
  pruefe(!felder.some((x) => /Diagnose|Krankheitsgrund|Befund|Attest/i.test(x)),
    `kein Feld, das eine Diagnose aufnehmen würde (${felder.join(", ")})`);
  pruefe(Boolean(await page.$(".belegrahmen")), "es gibt einen erkennbaren Anzeigebereich");
  pruefe(/Platzhalter/.test(await page.textContent(".belegrahmen")),
    "der ausdrücklich als Platzhalter bezeichnet ist");

  /* Bis zur Bestaetigung ist nichts geschehen. */
  pruefe(aktuell(await daten(page)).einsicht === null,
    "das blosse Öffnen des Dialogs gilt noch nicht als Einsicht");

  await page.click('[data-tun="vg-einsicht-ja:V0002"]');
  await page.waitForTimeout(450);
  const d = aktuell(await daten(page));
  pruefe(d.einsicht !== null, "die bestätigte Einsicht wird festgehalten");
  pruefe(/Testpersonal 01/.test(d.einsicht.name), `mit dem Konto (${d.einsicht.name})`);
  pruefe(/Personal/.test(d.einsicht.rolle), "mit der Rolle");
  pruefe(Boolean(d.einsicht.kennung), `mit der Kennung (${d.einsicht.kennung})`);
  pruefe(Boolean(d.einsicht.datum) && Boolean(d.einsicht.zeit), "mit Datum und Uhrzeit");

  const kette = await page.textContent(".pruefkette");
  pruefe(/Geöffnet von Testpersonal 01/.test(kette), "der Schritt zeigt, wer geöffnet hat");
  await ctx.close();
}

/* ═══ 4. Prüfergebnis, dann Abschluss ═══════════════════════════ */
console.log("\n── 4. Erst bewerten, dann abschliessen ──");
{
  const { ctx, page } = await seite("personal");
  await oeffnen(page);
  await page.click('[data-tun="vg-bescheinigung:V0002"]');
  await page.waitForTimeout(400);
  await page.click('[data-tun="vg-einsicht-ja:V0002"]');
  await page.waitForTimeout(450);

  /* Nach der Einsicht allein immer noch kein Abschluss. */
  let k = await knoepfe(page);
  pruefe(!k.some((x) => x.startsWith("vg-teil-erledigen")),
    "nach der Einsicht allein gibt es noch keinen Abschluss");
  pruefe(/kein Prüfergebnis/i.test(await page.textContent(".dialog-kasten")),
    "der Grund ist jetzt das fehlende Ergebnis");

  const auswahl = await page.$$eval(".pruefkette .wahlkarte",
    (n) => n.map((x) => x.textContent.trim()));
  /* Vier seit dem 01.10.2026 - siehe pruefe-probe-zuordnung. */
  pruefe(auswahl.length === 4, `es gibt vier benannte Ergebnisse (${auswahl.length})`);
  pruefe(auswahl.some((x) => /Alles in Ordnung/.test(x)), "darunter „Alles in Ordnung“");
  pruefe(auswahl.some((x) => /Zeitraum weicht/.test(x)), "und „Zeitraum weicht ab“");
  pruefe(auswahl.some((x) => /Nicht lesbar/.test(x)), "und „nicht lesbar oder unvollständig“");
  pruefe(!(await page.$(".pruefkette textarea, .pruefkette input[type=text]")),
    "es gibt kein freies Textfeld, das eine Diagnose aufnehmen würde");

  await page.click('[data-tun="vg-ergebnis:V0002|ok"]');
  await page.waitForTimeout(450);
  pruefe(aktuell(await daten(page)).ergebnis === "ok", "das Ergebnis wird festgehalten");

  k = await knoepfe(page);
  pruefe(k.some((x) => x === "vg-teil-erledigen:V0002|personal"),
    "jetzt erst steht der Abschluss bereit");
  pruefe(!(await page.$(".dialog-kasten button[disabled]")),
    "und keine Aktion ist mehr gesperrt");

  await page.click('[data-tun="vg-teil-erledigen:V0002|personal"]');
  await page.waitForTimeout(450);
  pruefe(await teilstand(page) === "erledigt", "der Teilschritt ist abgeschlossen");

  /* Das Ergebnis laesst sich zuruecknehmen - und sperrt dann wieder. */
  await ctx.close();
}

/* ═══ 5. Ein festgehaltenes Ergebnis ist gesperrt ══════════════ */
/*
  Fruehere Fassung: "Ein Ergebnis ist nicht in Stein" - es liess
  sich zuruecknehmen. Die Geschaeftsregel vom 01.10.2026 kehrt das
  um: Ein festgehaltenes Ergebnis wird NICHT ueberschrieben, eine
  Korrektur laeuft als eigener Vorgang mit Pflichtgrund. Geprueft
  wird das ausfuehrlich in pruefe-probe-pruefregeln; hier bleibt
  die Gegenprobe, dass der alte Weg wirklich zu ist.
*/
console.log("\n── 5. Kein stilles Zurücknehmen mehr ──");
{
  const { ctx, page } = await seite("personal");
  await oeffnen(page);
  await page.click('[data-tun="vg-bescheinigung:V0002"]');
  await page.waitForTimeout(400);
  await page.click('[data-tun="vg-einsicht-ja:V0002"]');
  await page.waitForTimeout(400);
  await page.click('[data-tun="vg-ergebnis:V0002|zeitraum"]');
  await page.waitForTimeout(450);
  pruefe(/Zeitraum weicht/.test(await page.textContent(".pruefkette")),
    "das gewählte Ergebnis steht im Schritt");
  pruefe(!(await page.$('[data-tun="vg-ergebnis-neu:V0002"]')),
    "es gibt kein „Ergebnis ändern“ mehr");
  pruefe(aktuell(await daten(page)).gesperrt === true, "das Ergebnis ist gesperrt");
  await page.evaluate(() => window.ProbeVorgaenge.tun("vg-ergebnis-neu", "V0002"));
  await page.waitForTimeout(300);
  pruefe(aktuell(await daten(page)).ergebnis === "zeitraum",
    "auch der direkte Aufruf nimmt es nicht zurück");
  pruefe(Boolean(await page.$('[data-tun="vg-pruefkorrektur:V0002"]')),
    "stattdessen gibt es den Weg über einen Korrekturvorgang");
  await ctx.close();
}

/* ═══ 6. Das Protokoll ══════════════════════════════════════════ */
console.log("\n── 6. Was protokolliert wird – und was nicht ──");
{
  const { ctx, page } = await seite("personal");
  await oeffnen(page);
  const vorher = (await protokoll(page)).length;

  await page.click('[data-tun="vg-bescheinigung:V0002"]');
  await page.waitForTimeout(400);
  await page.click('[data-tun="vg-einsicht-ja:V0002"]');
  await page.waitForTimeout(400);
  await page.click('[data-tun="vg-ergebnis:V0002|ok"]');
  await page.waitForTimeout(400);
  await page.click('[data-tun="vg-teil-erledigen:V0002|personal"]');
  await page.waitForTimeout(450);

  const p = await protokoll(page);
  pruefe(p.length === vorher + 3, `drei Einträge: Einsicht, Ergebnis, Abschluss (${p.length - vorher})`);

  const einsicht = p.find((x) => /angesehen/i.test(x.was));
  pruefe(Boolean(einsicht), "die Einsicht ist protokolliert");
  pruefe(/Testpersonal 01/.test(einsicht.wer), `mit der Person (${einsicht.wer})`);
  pruefe(/Personal/.test(einsicht.rolle), "mit der Rolle");
  pruefe(Boolean(einsicht.kennung), "mit der unveränderlichen Kennung");
  pruefe(Boolean(einsicht.datum) && Boolean(einsicht.zeit), "mit Datum und Uhrzeit");

  const ergebnis = p.find((x) => /Prüfergebnis/i.test(x.was));
  pruefe(Boolean(ergebnis), "das Prüfergebnis ist protokolliert");
  pruefe(/Alles in Ordnung/.test(ergebnis.nachher), "mit dem benannten Ergebnis");

  const alles = JSON.stringify(p);
  for (const wort of ["Diagnose", "Krankheitsgrund", "Befund", "Attest"]) {
    pruefe(!new RegExp(wort).test(alles), `im Protokoll steht keine ${wort}`);
  }
  const eingefroren = await page.evaluate(() => Object.isFrozen(window.ProbeDaten.protokoll[0]));
  pruefe(eingefroren, "die Einträge sind unveränderlich");
  await ctx.close();
}

/* ═══ 7. Die Disposition sieht nichts davon ═════════════════════ */
console.log("\n── 7. Für die Disposition bleibt alles verschlossen ──");
{
  const { ctx, page } = await seite("dispatcher");
  await oeffnen(page);
  const text = await page.textContent(".dialog-kasten");

  pruefe(!/Testbescheinigung-M02-01\.pdf/.test(text), "sie sieht den Dateinamen nicht");
  pruefe(!/\.pdf/i.test(text), "überhaupt keinen Dateinamen");
  pruefe(!/belegrahmen/.test(await page.innerHTML(".dialog-kasten")),
    "und keinen Anzeigebereich");
  pruefe(!(await page.$(".pruefkette")), "die Prüfkette gehört nicht zu ihrer Rolle");
  pruefe(/gehört nicht zu Ihrer Rolle/.test(text),
    "stattdessen steht da, dass die Bescheinigung nicht zu ihrer Rolle gehört");
  pruefe(/nicht angezeigt und nicht ausgeliefert/.test(text),
    "und dass sie weder angezeigt noch ausgeliefert wird");

  const k = await knoepfe(page);
  pruefe(!k.some((x) => x.startsWith("vg-bescheinigung")), "kein Knopf zum Öffnen");
  pruefe(!k.some((x) => x.startsWith("vg-ergebnis")), "kein Knopf für ein Prüfergebnis");

  /* Auch der direkte Aufruf hilft nicht. */
  await page.evaluate(() => window.ProbeVorgaenge.tun("vg-bescheinigung", "V0002"));
  await page.waitForTimeout(350);
  pruefe(!/Bescheinigung ansehen/.test(await page.textContent(".dialog-kasten")),
    "auch der direkte Aufruf öffnet ihr die Vorschau nicht");
  await page.evaluate(() => window.ProbeVorgaenge.tun("vg-einsicht-ja", "V0002"));
  await page.waitForTimeout(350);
  pruefe(aktuell(await daten(page)).einsicht === null,
    "und sie kann keine Einsicht für sich eintragen");

  /* Ihr eigener Teilschritt bleibt davon unberuehrt. */
  pruefe(Boolean(await page.$('[data-tun="vg-teil-erledigen:V0002|planung"]')),
    "ihr eigener Teilschritt „Planung“ ist nicht gesperrt");
  await ctx.close();
}

/* ═══ 8. Administration ═════════════════════════════════════════ */
console.log("\n── 8. Auch die Administration prüft, bevor sie abschliesst ──");
{
  const { ctx, page } = await seite("admin");
  await oeffnen(page);
  pruefe(Boolean(await page.$(".pruefkette")), "sie sieht die Prüfkette");
  const k = await knoepfe(page);
  pruefe(!k.some((x) => x === "vg-teil-erledigen:V0002|personal"),
    "aber die Personalprüfung kann sie ohne Einsicht nicht abschliessen");
  pruefe(k.some((x) => x === "vg-teil-erledigen:V0002|planung"),
    "die Planung dagegen schon — dort gibt es nichts anzusehen");
  await ctx.close();
}

/* ═══ 9. Darstellung und Netz ═══════════════════════════════════ */
console.log("\n── 9. Darstellung, Tastatur, Netz ──");
for (const [breite, hoehe] of [[320, 568], [390, 844], [1440, 900]]) {
  const { ctx, page } = await seite("personal", breite, hoehe);
  await oeffnen(page);
  await page.click('[data-tun="vg-bescheinigung:V0002"]');
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
  await oeffnen(page);
  await page.click('[data-tun="vg-bescheinigung:V0002"]');
  await page.waitForTimeout(400);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(350);
  pruefe(!(await page.$(".belegrahmen")), "Escape schliesst die Vorschau");
  pruefe(aktuell(await daten(page)).einsicht === null,
    "ein abgebrochenes Ansehen gilt nicht als Einsicht");
  await ctx.close();
}

pruefe(fremdeAnfragen.length === 0,
  `keine einzige Anfrage nach aussen im ganzen Lauf (${fremdeAnfragen.length})`);
{
  const quelle = await readFile(join(PROBE, "probe-vorgaenge.js"), "utf8");
  const ohneKommentar = quelle.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
  pruefe(!/fetch\s*\(|new XMLHttpRequest|createClient\s*\(|supabase\./i.test(ohneKommentar),
    "kein Netzzugriff im Vorgangsmodul");
  pruefe(!/(diagnose|krankheitsgrund|befund)\s*[:=]/i.test(ohneKommentar),
    "kein Feld, das eine Diagnose aufnehmen wuerde");
  pruefe(!/<a[^>]+download/i.test(quelle), "kein Herunterladen auf Vorrat");
}

await browser.close();
server.close();

console.log("\n" + "═".repeat(59));
console.log(`Dokumentprüfung: ${bestanden} bestanden, ${offen.length} nicht bestanden`);
if (offen.length) {
  console.log("\nNicht bestanden:");
  for (const n of offen) console.log("  - " + n);
}
console.log(`
ALLES SIMULIERT. Es gibt in dieser Probe keine Datei und keine
Storage-API. Dieser Lauf belegt die Reihenfolge der Bedienung und die
Sperren in der Oberfläche — er sagt NICHTS darüber, ob die echte
Supabase-Storage-API eine Datei richtig schützt oder ausliefert.`);
console.log("═".repeat(59));
process.exit(offen.length ? 1 : 0);
