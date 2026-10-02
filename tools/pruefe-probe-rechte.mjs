/* ============================================================
   Prueflauf: Kundennummern, Firmenkunden, Finanzsperre, Rechte
   ============================================================
   Gemessene Ausgangsfehler des manuellen Rundgangs:

   5. In der Oberflaeche standen Kundennummern (KD-0003). Im Betrieb
      werden keine verwendet.

   6. Bei einem Firmenkunden fehlte jede Angabe zur tatsaechlich
      befoerderten oder zustaendigen Person.

   8. Bei der bezahlten Rechnung RE-2026-0001 waren "Zahlung erfassen"
      und "Mahnung vorbereiten" aktiv.

   9. Nach einem Klick auf eine Finanzaktion gab es nur "Schliessen" -
      keinen Weg zurueck zur Rechnung.

   10. Erledigte Vorgaenge verschwanden ohne Rueckmeldung aus der Liste.

   11. Es gab keine Rechteverwaltung.
   12. Es gab nur ein Administrationskonto.

   Geprueft wird ueber die Oberflaeche. Zusaetzlich wird jede kritische
   Aktion DIREKT aufgerufen - ein fehlender Knopf ist kein Schutz.

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
const PORT = 5381;
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

const sichtbarerText = (page) => page.evaluate(() =>
  document.body.innerText.replace(/\s+/g, " "));
const dialogText = (page) => page.evaluate(() => {
  const k = document.querySelector(".dialog-kasten");
  return k ? k.innerText.replace(/\s+/g, " ") : "";
});

/* ═══ 1. Keine betrieblichen Kundennummern ═══════════════════════ */
console.log("\n── 1. Keine Kundennummern in der Oberfläche ──");
{
  const { page, fehler } = await seite("admin");

  /* Erst im Datenmodell: Es gibt keine mehr. */
  const modell = await page.evaluate(() => {
    const k = window.ProbeDaten.kunden[2];
    return { felder: Object.keys(k), id: k.id };
  });
  pruefe(!modell.felder.includes("kundennummer"),
    `kein Feld „kundennummer“ mehr am Kunden (${modell.felder.join(", ")})`);
  pruefe(Boolean(modell.id), `aber eine technische Kennung (${modell.id})`);

  /* Dann in jeder Ansicht, die einen Kunden zeigt. */
  const stellen = [];
  for (const b of ["kunden", "finanzen", "rewards", "fahrten", "uebersicht"]) {
    await page.evaluate((x) => window.ProbeRahmen.geheZu(x), b);
    await page.waitForTimeout(350);
    stellen.push([b, await sichtbarerText(page)]);
  }
  /* Die Kundenakte und das Rewardskonto. */
  await page.evaluate(() => window.ProbeRahmen.geheZu("kunden"));
  await page.waitForTimeout(300);
  await page.click('.aktenzeile[data-tun^="ak-kunde:"]');
  await page.waitForTimeout(400);
  stellen.push(["Kundenakte", await dialogText(page)]);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);

  await page.evaluate(() => window.ProbeRahmen.geheZu("rewards"));
  await page.waitForTimeout(300);
  await page.click('.aktenzeile[data-tun^="ak-rewards-konto:"]');
  await page.waitForTimeout(400);
  stellen.push(["Rewardskonto", await dialogText(page)]);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);

  await page.evaluate(() => window.ProbeRahmen.geheZu("finanzen"));
  await page.waitForTimeout(300);
  await page.click('.aktenzeile[data-tun^="ak-rechnung:"]');
  await page.waitForTimeout(400);
  stellen.push(["Rechnungsakte", await dialogText(page)]);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);

  /* Die Fahrtaufnahme mit Trefferliste und Zusammenfassung. */
  await page.evaluate(() => window.ProbeRahmen.geheZu("fahrten"));
  await page.waitForTimeout(300);
  await page.click('[data-tun="neue-fahrt"]');
  await page.waitForTimeout(400);
  stellen.push(["Fahrtaufnahme Schritt 1", await dialogText(page)]);
  await page.fill("[data-suchfeld]", "Testkunde 03");
  await page.waitForTimeout(400);
  stellen.push(["Trefferliste", await dialogText(page)]);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  const noch = await page.$('[data-tun="fa-abbruch-ja"]');
  if (noch) { await noch.click(); await page.waitForTimeout(300); }

  for (const [wo, text] of stellen) {
    pruefe(!/\bKD-\d/.test(text), `${wo}: keine Kundennummer im Stil KD-0000`);
    pruefe(!/Kundennummer/.test(text), `${wo}: das Wort „Kundennummer“ kommt nicht vor`);
    pruefe(!/\bK\d{4}\b/.test(text), `${wo}: auch die technische Kennung steht nicht da`);
  }

  /* Gesucht wird weiterhin - nur nicht nach einer Nummer. */
  await page.evaluate(() => window.ProbeRahmen.geheZu("kunden"));
  await page.waitForTimeout(300);
  await page.fill("[data-kundensuche]", "Testallee");
  await page.waitForTimeout(400);
  const treffer = await page.$$eval(".aktenliste .aktenzeile strong", (n) => n.map((x) => x.textContent.trim()));
  pruefe(treffer.includes("Testkunde 03"),
    `die Adresssuche findet Testkunde 03 über „Testallee“ (${treffer.join(", ")})`);
  await page.fill("[data-kundensuche]", "K0003");
  await page.waitForTimeout(400);
  pruefe(await page.$$eval(".aktenliste .aktenzeile", (n) => n.length) === 0,
    "die technische Kennung ist kein Suchbegriff — sonst wäre sie doch eine Nummer");

  pruefe(fehler.length === 0, "keine Fehlermeldung im Browser (" + fehler.join(" | ") + ")");
  await page.context().close();
}

/* ═══ 2. Die technische Kennung bleibt stabil und verknüpft ══════ */
console.log("\n── 2. Verknüpfung über die Kennung, nie über den Namen ──");
{
  const { page, fehler } = await seite("admin");

  const befund = await page.evaluate(() => {
    const D = window.ProbeDaten;
    const k = D.kunden.find((x) => x.id === "K0003");
    return {
      fahrten: D.fahrtenVonKunde(k).map((f) => f.id),
      alleFahrtenHabenKennung: D.fahrten.every((f) => "kundeId" in f),
      gastOhneKennung: (D.fahrten.find((f) => f.kunde === "Gastfahrt") || {}).kundeId,
      rechnungenHabenKennung: D.rechnungen.every((r) => "kundeId" in r),
      kontenHabenKennung: D.rewards.konten.every((x) => "kundeId" in x)
    };
  });
  pruefe(befund.fahrten.length >= 2,
    `die Fahrten von K0003 kommen über die Kennung (${befund.fahrten.join(", ")})`);
  pruefe(befund.alleFahrtenHabenKennung, "jede Fahrt trägt ein Feld für die Kundenkennung");
  pruefe(befund.gastOhneKennung === "", "eine Gastfahrt trägt bewusst keine");
  pruefe(befund.rechnungenHabenKennung, "jede Rechnung trägt die Kundenkennung");
  pruefe(befund.kontenHabenKennung, "jedes Rewardskonto trägt die Kundenkennung");

  /* Ein gleichnamiger Kunde darf keine fremden Belege einsammeln. */
  const doppelt = await page.evaluate(() => {
    const D = window.ProbeDaten;
    const echt = D.kunden.find((x) => x.id === "K0003");
    const zwilling = Object.assign({}, echt, { id: "K9999", verlauf: [], letzteFahrten: [] });
    D.kunden.push(zwilling);
    return {
      echteFahrten: D.fahrtenVonKunde(echt).length,
      zwillingFahrten: D.fahrtenVonKunde(zwilling).length,
      zwillingRechnungen: D.rechnungenVonKunde(zwilling).length,
      zwillingRewards: D.rewardsVonKunde(zwilling) ? 1 : 0,
      gleicherName: echt.name === zwilling.name
    };
  });
  pruefe(doppelt.gleicherName, "ein zweiter Kunde mit demselben Namen wurde angelegt");
  pruefe(doppelt.zwillingFahrten === 0,
    `er bekommt keine fremden Fahrten (${doppelt.zwillingFahrten})`);
  pruefe(doppelt.zwillingRechnungen === 0, "keine fremden Rechnungen");
  pruefe(doppelt.zwillingRewards === 0, "und kein fremdes Rewardskonto");
  pruefe(doppelt.echteFahrten >= 2, "der echte Kunde behält seine Fahrten");

  /* Die Kennung bleibt beim Anlegen stabil und wird nicht gezeigt. */
  const neu = await page.evaluate(() => {
    const k = window.ProbeDaten.kundeAnlegen({
      art: "privat", name: "Testkunde 77", telefon: "Testnummer 0077", quelle: "Prueflauf"
    });
    return { id: k.id, felder: Object.keys(k) };
  });
  pruefe(/^K\d+$/.test(neu.id), `ein neuer Kunde bekommt eine technische Kennung (${neu.id})`);
  pruefe(!neu.felder.includes("kundennummer"), "aber keine Kundennummer");

  pruefe(fehler.length === 0, "keine Fehlermeldung im Browser (" + fehler.join(" | ") + ")");
  await page.context().close();
}

/* ═══ 3. Firmenkunde und Fahrgast getrennt ══════════════════════ */
console.log("\n── 3. Auftraggeber ist nicht der Fahrgast ──");
{
  const { page, fehler } = await seite("admin");

  /* Die Kundenakte eines Firmenkunden. */
  await page.evaluate(() => window.ProbeRahmen.geheZu("kunden"));
  await page.waitForTimeout(350);
  await page.fill("[data-kundensuche]", "Testfirma");
  await page.waitForTimeout(400);
  await page.click('.aktenzeile[data-tun^="ak-kunde:"]');
  await page.waitForTimeout(400);
  const akte = await dialogText(page);
  pruefe(/Firmenkunde/.test(akte), "die Akte nennt den Kunden als Firmenkunde");
  pruefe(/Ansprechpartner/.test(akte), "sie zeigt einen Ansprechpartner");
  pruefe(/Abteilung/.test(akte), "und eine Abteilung");
  pruefe(/Auftraggeber ist die Firma/.test(akte),
    "sie sagt ausdrücklich, dass die Firma der Auftraggeber ist");
  pruefe(/einzelnen Fahrt/.test(akte),
    "und dass der Fahrgast an der einzelnen Fahrt steht");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);

  /* Das Anlegen: Firmenfelder erscheinen nur bei einer Firma. */
  await page.click('[data-tun="ak-kunde-neu"]');
  await page.waitForTimeout(400);
  pruefe(!(await page.$('[data-kn="ansprechpartner"]')),
    "bei einem Privatkunden gibt es kein Feld für den Ansprechpartner");
  await page.click('[data-tun="ak-kunde-art:firma"]');
  await page.waitForTimeout(350);
  pruefe(Boolean(await page.$('[data-kn="ansprechpartner"]')),
    "bei einem Firmenkunden erscheint es");
  pruefe(Boolean(await page.$('[data-kn="abteilung"]')), "und eine Abteilung");
  pruefe(/Nicht der Fahrgast/i.test(await dialogText(page)),
    "mit dem Hinweis, dass es nicht der Fahrgast ist");

  /* Pflichtfelder: Fehler am Feld, Fokus auf das erste. */
  await page.click('[data-tun="ak-kunde-weiter"]');
  await page.waitForTimeout(400);
  pruefe(await page.getAttribute('[data-kn="name"]', "aria-invalid") === "true",
    "ein leeres Pflichtfeld ist am Feld als Fehler gekennzeichnet");
  pruefe(Boolean(await page.$('#kn-name-fehler')),
    "und der Fehlertext steht direkt daneben");
  pruefe(await page.evaluate(() => document.activeElement?.id) === "kn-name",
    "der Fokus steht im ersten ungültigen Feld");
  pruefe(/Bitte ausfüllen/.test(await dialogText(page)),
    "der zusammenfassende Hinweis bleibt zusätzlich");

  /* Abbrechen legt nichts an. */
  const vorher = await page.evaluate(() => window.ProbeDaten.kunden.length);
  await page.fill('[data-kn="name"]', "Testfirma 99 GmbH");
  await page.fill('[data-kn="telefon"]', "Testnummer 0099");
  await page.fill('[data-kn="ansprechpartner"]', "Testleitung Werkstatt");
  await page.click('[data-tun="ak-kunde-weiter"]');
  await page.waitForTimeout(400);
  pruefe(/Testleitung Werkstatt/.test(await dialogText(page)),
    "die Prüfung zeigt den Ansprechpartner");
  await page.click('[data-tun="ak-kunde-zurueck"]');
  await page.waitForTimeout(350);
  pruefe(await page.inputValue('[data-kn="ansprechpartner"]') === "Testleitung Werkstatt",
    "„Zurück und ändern“ erhält alle Eingaben");
  await page.click('[data-tun="ak-kunde-weiter"]');
  await page.waitForTimeout(350);
  const abbrechen = await page.$('.dialog-fuss [data-dialog-zu]');
  if (abbrechen) { await abbrechen.click(); await page.waitForTimeout(400); }
  const nochOffen = await page.$('[data-offen-warnung]');
  if (nochOffen) {
    const zweiter = await page.$('.dialog-fuss [data-dialog-zu]');
    if (zweiter) { await zweiter.click(); await page.waitForTimeout(400); }
  }
  pruefe(await page.evaluate(() => window.ProbeDaten.kunden.length) === vorher,
    `Abbrechen legt nichts an (${vorher})`);

  /* Jetzt wirklich anlegen - genau einer. */
  await page.click('[data-tun="ak-kunde-neu"]');
  await page.waitForTimeout(350);
  await page.click('[data-tun="ak-kunde-art:firma"]');
  await page.waitForTimeout(300);
  await page.fill('[data-kn="name"]', "Testfirma 98 GmbH");
  await page.fill('[data-kn="telefon"]', "Testnummer 0098");
  await page.fill('[data-kn="ansprechpartner"]', "Testleitung Einkauf");
  await page.fill('[data-kn="abteilung"]', "Einkauf");
  await page.click('[data-tun="ak-kunde-weiter"]');
  await page.waitForTimeout(350);
  await page.click('[data-tun="ak-kunde-ja"]');
  await page.waitForTimeout(500);
  pruefe(await page.evaluate(() => window.ProbeDaten.kunden.length) === vorher + 1,
    "„Verbindlich anlegen“ erzeugt genau einen Kunden");
  const angelegt = await page.evaluate(() =>
    window.ProbeDaten.kunden.find((k) => k.name === "Testfirma 98 GmbH"));
  pruefe(angelegt && angelegt.ansprechpartner === "Testleitung Einkauf",
    "mit dem Ansprechpartner");
  pruefe(angelegt && angelegt.abteilung === "Einkauf", "und der Abteilung");
  pruefe(angelegt && angelegt.art === "firma", "und als Firmenkunde");

  /* Er ist sofort in der Suche. */
  await page.fill("[data-kundensuche]", "Testfirma 98");
  await page.waitForTimeout(400);
  pruefe(await page.$$eval(".aktenliste .aktenzeile", (n) => n.length) === 1,
    "er ist sofort über die Suche zu finden");

  /* Und in der Fahrtaufnahme - mit eigenem Feld für den Fahrgast. */
  await page.evaluate(() => window.ProbeRahmen.geheZu("fahrten"));
  await page.waitForTimeout(300);
  await page.click('[data-tun="neue-fahrt"]');
  await page.waitForTimeout(400);
  await page.fill("[data-suchfeld]", "Testfirma 98");
  await page.waitForTimeout(450);
  const trefferKnopf = await page.$('[data-tun^="fa-kunde:"]');
  pruefe(Boolean(trefferKnopf), "der neue Firmenkunde ist in der Fahrtaufnahme wählbar");
  if (trefferKnopf) {
    await trefferKnopf.click();
    await page.waitForTimeout(400);
    pruefe(Boolean(await page.$('[data-feld="fahrgast"]')),
      "bei einem Firmenkunden gibt es ein Feld „Fahrgast / Ansprechpartner“");
    const t = await dialogText(page);
    pruefe(/Auftraggeber ist/.test(t), "mit dem Hinweis, wer Auftraggeber ist");
    pruefe(/Keine Angabe ist erlaubt/.test(t), "eine Angabe ist nicht Pflicht");
    pruefe(/Gesundheits/.test(t) || /Diagnose/.test(t),
      "und der ausdrückliche Hinweis, dass dort keine Gesundheitsangabe hingehört");

    await page.fill('[data-feld="fahrgast"]', "Testfahrgast Halle 3");
    await page.click('[data-tun="fa-weiter"]');
    await page.waitForTimeout(350);
    await page.fill('[data-feld="abholung"]', "Testring 5, Germersheim");
    await page.click('[data-tun="fa-weiter"]');
    await page.waitForTimeout(350);
    await page.fill('[data-feld="ziel"]', "Testziel B");
    await page.click('[data-tun="fa-weiter"]');
    await page.waitForTimeout(400);
    const zeitfeld = await page.$('[data-zeit-teil="zeit"]');
    if (zeitfeld) {
      await zeitfeld.click();
      await page.keyboard.type("1130");
      await page.keyboard.press("Tab");
      await page.waitForTimeout(400);
    }
    await page.click('[data-tun="fa-weiter"]');
    await page.waitForTimeout(350);
    const leistung = await page.$('[data-tun^="fa-leistung:"]');
    if (leistung) { await leistung.click(); await page.waitForTimeout(300); }
    await page.click('[data-tun="fa-weiter"]');
    await page.waitForTimeout(450);
    const pruefText = await dialogText(page);
    pruefe(/Auftraggeber \(Firma\)/.test(pruefText),
      "die Zusammenfassung nennt den Auftraggeber getrennt");
    pruefe(/Testfahrgast Halle 3/.test(pruefText),
      "und den Fahrgast getrennt davon");

    const vorFahrten = await page.evaluate(() => window.ProbeDaten.fahrten.length);
    await page.click('[data-tun="fa-speichern"]');
    await page.waitForTimeout(500);
    const fahrt = await page.evaluate(() => window.ProbeDaten.fahrten[0]);
    pruefe(await page.evaluate(() => window.ProbeDaten.fahrten.length) === vorFahrten + 1,
      "genau eine Fahrt kam dazu");
    pruefe(fahrt.fahrgast === "Testfahrgast Halle 3",
      `der Fahrgast steht an der Fahrt (${fahrt.fahrgast})`);
    pruefe(Boolean(fahrt.kundeId), `und die Fahrt bleibt am Firmenkunden (${fahrt.kundeId})`);
    pruefe(fahrt.kunde === "Testfirma 98 GmbH",
      "der Kunde der Fahrt ist die Firma, nicht der Fahrgast");
  }

  pruefe(fehler.length === 0, "keine Fehlermeldung im Browser (" + fehler.join(" | ") + ")");
  await page.context().close();
}

/* ═══ 4. Bezahlte Rechnung ══════════════════════════════════════ */
console.log("\n── 4. Eine bezahlte Rechnung ist abgeschlossen ──");
{
  const { page, fehler } = await seite("accounting");
  await page.evaluate(() => window.ProbeRahmen.geheZu("finanzen"));
  await page.waitForTimeout(400);

  const bezahlt = await page.evaluate(() =>
    (window.ProbeDaten.rechnungen.find((r) => r.zustand === "bezahlt") || {}).nr);
  pruefe(Boolean(bezahlt), `es gibt eine bezahlte Rechnung (${bezahlt})`);

  await page.evaluate((nr) => window.ProbeAkten.tun("ak-rechnung", nr), bezahlt);
  await page.waitForTimeout(450);
  const t = await dialogText(page);
  pruefe(/bezahlt/.test(t), "die Akte zeigt sie als bezahlt");
  pruefe(!(await page.$(`[data-tun="ak-zahlung:${bezahlt}"]`)),
    "es gibt keinen Knopf „Zahlung erfassen“");
  pruefe(!(await page.$(`[data-tun="ak-mahnung:${bezahlt}"]`)),
    "und keinen Knopf „Mahnung vorbereiten“");
  pruefe(Boolean(await page.$(`[data-tun="ak-rech-korrektur:${bezahlt}"]`)),
    "eine Korrektur als neue Version bleibt möglich");
  pruefe(/Was hier nicht mehr geht/.test(t),
    "die Akte sagt, warum die Knöpfe fehlen — eine stumme Sperre wäre keine Erklärung");
  pruefe(/vollständig bezahlt/.test(t), "mit der Begründung");
  pruefe(/Rückzahlung und Überzahlung sind noch nicht festgelegt/.test(t),
    "und benennt Rückzahlung und Überzahlung als offene Entscheidung");

  /* Der direkte Aufruf muss wirkungslos bleiben. */
  for (const art of ["ak-zahlung", "ak-mahnung"]) {
    await page.evaluate(() => window.ProbeRahmen.dialogSchliessen(true));
    await page.waitForTimeout(250);
    const vorher = await page.evaluate((nr) => {
      const r = window.ProbeDaten.rechnungen.find((x) => x.nr === nr);
      return JSON.stringify({ z: r.zahlungen.length, v: r.verlauf.length, zustand: r.zustand });
    }, bezahlt);
    await page.evaluate(([a, nr]) => window.ProbeAkten.tun(a, nr), [art, bezahlt]);
    await page.waitForTimeout(400);
    pruefe(!(await page.evaluate(() => window.ProbeRahmen.dialogOffen())),
      `der direkte Aufruf ${art} öffnet kein Fenster`);
    await page.evaluate(() => {
      window.ProbeAkten.tun("ak-bk-weiter", "");
      window.ProbeAkten.tun("ak-bk-ja", "");
    });
    await page.waitForTimeout(400);
    pruefe(await page.evaluate((nr) => {
      const r = window.ProbeDaten.rechnungen.find((x) => x.nr === nr);
      return JSON.stringify({ z: r.zahlungen.length, v: r.verlauf.length, zustand: r.zustand });
    }, bezahlt) === vorher, `und ${art} ändert nichts an der Rechnung`);
  }

  /* Bei einer offenen Rechnung geht beides. */
  const offenNr = await page.evaluate(() =>
    (window.ProbeDaten.rechnungen.find((r) => r.zustand === "offen") || {}).nr);
  await page.evaluate((nr) => window.ProbeAkten.tun("ak-rechnung", nr), offenNr);
  await page.waitForTimeout(400);
  pruefe(Boolean(await page.$(`[data-tun="ak-zahlung:${offenNr}"]`)),
    `bei der offenen Rechnung ${offenNr} gibt es „Zahlung erfassen“`);
  pruefe(Boolean(await page.$(`[data-tun="ak-mahnung:${offenNr}"]`)),
    "und „Mahnung vorbereiten“");

  pruefe(fehler.length === 0, "keine Fehlermeldung im Browser (" + fehler.join(" | ") + ")");
  await page.context().close();
}

/* ═══ 5. Rückweg in den Finanzaktionen ══════════════════════════ */
console.log("\n── 5. Zurück zur Rechnung ──");
{
  const { page, fehler } = await seite("accounting");
  await page.evaluate(() => window.ProbeRahmen.geheZu("finanzen"));
  await page.waitForTimeout(400);
  const nr = await page.evaluate(() =>
    (window.ProbeDaten.rechnungen.find((r) => r.zustand === "offen") || {}).nr);

  for (const [art, aktion] of [
    ["Zahlung", "ak-zahlung"], ["Mahnung", "ak-mahnung"], ["Korrektur", "ak-rech-korrektur"]
  ]) {
    await page.evaluate((x) => window.ProbeAkten.tun("ak-rechnung", x), nr);
    await page.waitForTimeout(350);
    await page.click(`[data-tun="${aktion}:${nr}"]`);
    await page.waitForTimeout(400);
    pruefe(Boolean(await page.$('[data-tun="ak-bk-zur-rechnung"]')),
      `${art}: es gibt „Zurück zur Rechnung“`);
    pruefe(Boolean(await page.$('.dialog-fuss [data-dialog-zu]')),
      `${art}: und „Abbrechen“ beziehungsweise Schließen`);

    /* Eingaben gehen beim Rueckweg nicht verloren. */
    const feld = await page.$("[data-bk='wert']");
    if (feld) await feld.fill("123,00 €");
    await page.click('[data-tun="ak-bk-zur-rechnung"]');
    await page.waitForTimeout(400);
    pruefe(/Rechnung/.test(await dialogText(page)),
      `${art}: der Rückweg führt in die Rechnungsakte`);
    const unveraendert = await page.evaluate((x) => {
      const r = window.ProbeDaten.rechnungen.find((y) => y.nr === x);
      return r.zahlungen.length === 0 && r.verlauf.length === 0;
    }, nr);
    pruefe(unveraendert, `${art}: auf dem Rückweg wird nichts gespeichert`);

    if (feld) {
      await page.click(`[data-tun="${aktion}:${nr}"]`);
      await page.waitForTimeout(400);
      const wieder = await page.$("[data-bk='wert']");
      if (wieder) {
        pruefe(await wieder.inputValue() === "123,00 €",
          `${art}: die begonnene Eingabe ist noch da`);
      } else {
        pruefe(true, `${art}: kein Betragsfeld in dieser Aktion`);
      }
    }

    /* Escape führt ebenfalls zurück zur Rechnung, nicht hinaus. */
    await page.keyboard.press("Escape");
    await page.waitForTimeout(450);
    pruefe(/Rechnung/.test(await dialogText(page)),
      `${art}: Escape führt zur Rechnung zurück, nicht hinaus`);
    pruefe(await page.evaluate(() => window.ProbeRahmen.dialogOffen()),
      `${art}: das Fenster bleibt dabei offen`);

    /* Mit begonnener Eingabe gibt es vor dem Verlassen eine Abfrage. */
    await page.click(`[data-tun="${aktion}:${nr}"]`);
    await page.waitForTimeout(400);
    const f2 = await page.$("[data-bk='wert'], [data-bk-grund]");
    if (f2) {
      await f2.fill("77");
      await page.waitForTimeout(200);
      const zu = await page.$('.dialog-fuss [data-dialog-zu]');
      if (zu) { await zu.click(); await page.waitForTimeout(350); }
      pruefe(Boolean(await page.$("[data-offen-warnung]")),
        `${art}: vor dem Verlassen kommt eine Sicherheitsabfrage`);
      const zu2 = await page.$('.dialog-fuss [data-dialog-zu]');
      if (zu2) { await zu2.click(); await page.waitForTimeout(350); }
    }
    await page.evaluate(() => window.ProbeRahmen.dialogSchliessen(true));
    await page.waitForTimeout(250);
  }

  pruefe(fehler.length === 0, "keine Fehlermeldung im Browser (" + fehler.join(" | ") + ")");
  await page.context().close();
}

/* ═══ 6. Erledigte Vorgänge ═════════════════════════════════════ */
console.log("\n── 6. Entfernen ist kein Löschen ──");
{
  const { page, fehler } = await seite("admin");
  await page.evaluate(() => window.ProbeRahmen.geheZu("meldungen"));
  await page.waitForTimeout(400);
  await page.click('[data-tun="vg-reiter:erledigt"]');
  await page.waitForTimeout(350);

  const karten = await page.$$eval(".vorgang", (n) => n.map((x) => x.dataset.vorgang));
  pruefe(karten.length > 0, `es gibt erledigte Vorgänge (${karten.join(", ")})`);
  const id = karten[0];
  const vorher = await page.evaluate(() => window.ProbeDaten.vorgaenge.length);

  await page.click(`.vorgang[data-vorgang="${id}"] [data-tun="vg-aus-liste:${id}"]`);
  await page.waitForTimeout(450);

  pruefe(await page.evaluate(() => window.ProbeDaten.vorgaenge.length) === vorher,
    `nichts gelöscht (${vorher} Vorgänge)`);
  pruefe(await page.evaluate((x) => Boolean(window.ProbeDaten.vorgangVon(x)), id),
    "der Vorgang ist weiter vorhanden");
  pruefe(Boolean(await page.$(".rueckmeldung")), "es erscheint eine Rückmeldung");
  const rm = await page.evaluate(() =>
    document.querySelector(".rueckmeldung").innerText.replace(/\s+/g, " "));
  pruefe(/Nichts gelöscht/.test(rm), `sie sagt, dass nichts gelöscht wurde: „${rm.slice(0, 80)}“`);
  pruefe(/Archiv/.test(rm), "und wo der Vorgang jetzt steht");
  pruefe(Boolean(await page.$('.rueckmeldung [data-tun^="vg-in-liste"]')),
    "mit einem Knopf „Rückgängig“");

  /* Unter "Alle" und im Archiv ist er sichtbar. */
  await page.click('[data-tun="vg-reiter:alle"]');
  await page.waitForTimeout(350);
  pruefe(await page.$$eval(".vorgang", (n, x) => n.some((y) => y.dataset.vorgang === x), id),
    "unter „Alle“ steht er weiterhin");
  await page.click('[data-tun="vg-reiter:archiv"]');
  await page.waitForTimeout(350);
  pruefe(await page.$$eval(".vorgang", (n, x) => n.some((y) => y.dataset.vorgang === x), id),
    "und im Archiv");

  /* Protokoll. */
  const prot = await page.evaluate((x) => window.ProbeDaten.protokoll
    .find((p) => p.was === "Aus der Erledigt-Liste entfernt" && p.betrifft.includes(x)), id);
  pruefe(Boolean(prot), "der Schritt steht im Protokoll");
  pruefe(Boolean(prot && prot.wer && prot.zeit),
    `mit handelnder Person und Zeit (${prot ? prot.wer + " · " + prot.zeit : "—"})`);
  pruefe(Boolean(prot && prot.vorher && prot.nachher),
    "und mit vorherigem und neuem Listenstand");

  /* Rückgängig. */
  await page.click('[data-tun="vg-reiter:erledigt"]');
  await page.waitForTimeout(350);
  const knopf = await page.$('.rueckmeldung [data-tun^="vg-in-liste"]');
  if (knopf) {
    await knopf.click();
    await page.waitForTimeout(450);
    pruefe(await page.$$eval(".vorgang", (n, x) => n.some((y) => y.dataset.vorgang === x), id),
      "„Rückgängig“ stellt ihn in der Erledigt-Liste wieder her");
    pruefe(!(await page.$(".rueckmeldung")),
      "und die Rückmeldung verschwindet, weil sie erledigt ist");
  } else {
    pruefe(false, "der Knopf „Rückgängig“ war noch da");
  }

  /* Wiedereroeffnen ist eine andere Aktion. */
  const nachher = await page.evaluate((x) => {
    const v = window.ProbeDaten.vorgangVon(x);
    return { ausListe: Boolean(v.ausListe), zustand: v.zustand };
  }, id);
  pruefe(nachher.ausListe === false, "er ist wieder in der Arbeitsliste");

  /* Keine Bearbeitungsaktion an einem abgeschlossenen Vorgang. */
  const knoepfe = await page.$$eval(`.vorgang[data-vorgang="${id}"] button`,
    (n) => n.map((x) => x.dataset.tun || ""));
  pruefe(!knoepfe.some((x) => /^vg-(teil-)?(uebernehmen|weitergeben|erledigen)/.test(x)),
    `keine Bearbeitungsaktion an einem erledigten Vorgang (${knoepfe.join(" ")})`);

  pruefe(fehler.length === 0, "keine Fehlermeldung im Browser (" + fehler.join(" | ") + ")");
  await page.context().close();
}

/* ═══ 7. Zwei Administrationskonten ═════════════════════════════ */
console.log("\n── 7. Kein gemeinsames Administrationskonto ──");
{
  const { page, fehler } = await seite("admin");

  const konten = await page.evaluate(() => window.ProbeRahmen.KONTEN);
  const admins = konten.filter((k) => k.rolle === "admin");
  pruefe(admins.length === 2, `es gibt zwei Administrationskonten (${admins.length})`);
  pruefe(new Set(admins.map((k) => k.kennung)).size === 2, "mit verschiedenen Kennungen");
  pruefe(new Set(admins.map((k) => k.name)).size === 2, "und verschiedenen Namen");
  pruefe(Boolean(await page.$("[data-konto]")), "die Kontowahl ist sichtbar");

  /* Keine Zugangsdaten in den Testdaten. */
  const geheim = await page.evaluate(() => JSON.stringify(window.ProbeRahmen.KONTEN));
  pruefe(!/passwort|password|kennwort|token|secret|schluessel/i.test(geheim),
    "kein Zugangsdatenfeld an einem Konto");

  /* Jede Aktion traegt das Konto. */
  const spuren = [];
  for (const kennung of admins.map((k) => k.kennung)) {
    await page.selectOption("[data-konto]", kennung);
    await page.waitForTimeout(350);
    const b = await page.evaluate(() => window.ProbeRahmen.benutzer());
    pruefe(b.kennung === kennung, `angemeldet als ${b.name} (${b.kennung})`);
    await page.evaluate(() => window.ProbeRahmen.geheZu("meldungen"));
    await page.waitForTimeout(300);
    await page.click('[data-tun="vg-reiter:erledigt"]');
    await page.waitForTimeout(300);
    const karte = await page.$('.vorgang [data-tun^="vg-aus-liste"]');
    if (karte) {
      await karte.click();
      await page.waitForTimeout(400);
      const prot = await page.evaluate(() => window.ProbeDaten.protokoll[0]);
      spuren.push(prot);
      const rueck = await page.$('.rueckmeldung [data-tun^="vg-in-liste"]');
      if (rueck) { await rueck.click(); await page.waitForTimeout(350); }
    }
    await page.selectOption("[data-rolle]", "admin");
    await page.waitForTimeout(300);
  }
  pruefe(spuren.length === 2, `zwei Protokolleinträge entstanden (${spuren.length})`);
  if (spuren.length === 2) {
    pruefe(spuren[0].kennung !== spuren[1].kennung,
      `die Einträge sind unterscheidbar (${spuren[0].kennung} / ${spuren[1].kennung})`);
    pruefe(spuren.every((x) => x.wer && x.kennung && x.rolle && x.datum && x.zeit),
      "jeder nennt Name, Kennung, Rolle, Datum und Uhrzeit");
    pruefe(!spuren.some((x) => /passwort|token/i.test(JSON.stringify(x))),
      "und kein Eintrag enthält Zugangsdaten");
  }

  pruefe(fehler.length === 0, "keine Fehlermeldung im Browser (" + fehler.join(" | ") + ")");
  await page.context().close();
}

/* ═══ 8. Rollen & Rechte ════════════════════════════════════════ */
console.log("\n── 8. Rechte verwalten ──");
{
  const { page, fehler } = await seite("admin");

  pruefe(await page.evaluate(() =>
    window.ProbeRahmen.sichtbareBereiche().some((b) => b.id === "einstellungen")),
    "die Administration sieht den Bereich Einstellungen");

  await page.evaluate(() => window.ProbeRahmen.geheZu("einstellungen"));
  await page.waitForTimeout(400);
  const t = await sichtbarerText(page);
  pruefe(/Rechte einer Rolle/.test(t), "es gibt die Rechte je Rolle");
  pruefe(/Einzelne Freigaben je Konto/.test(t), "und einzelne Freigaben je Konto");
  pruefe(/Offene Entscheidungen/.test(t), "offene Entscheidungen sind benannt");
  pruefe(/nicht festgelegt/.test(t),
    "die spätere Verteilung wird ausdrücklich als nicht festgelegt bezeichnet");
  pruefe(await page.$$eval('[data-tun^="es-rolle:"]', (n) => n.length) === 5,
    "fünf Rollen zur Auswahl");
  pruefe(await page.$$eval('[data-tun^="es-konto:"]', (n) => n.length) === 6,
    "sechs Konten zur Auswahl");

  /* Eine Faehigkeit entziehen - Navigation UND Aktion folgen. */
  await page.click('[data-tun="es-rolle:accounting"]');
  await page.waitForTimeout(400);
  const haken = await page.$$eval("[data-es-recht]", (n) => n.length);
  pruefe(haken >= 15, `die Fähigkeiten sind einzeln schaltbar (${haken})`);
  pruefe(/zurzeit EIN Recht/.test(await dialogText(page)),
    "wo zwei Wünsche auf ein Recht fallen, steht das ausdrücklich dabei");

  await page.uncheck('[data-es-recht="analytics.read"]');
  await page.waitForTimeout(350);
  await page.click('[data-tun="es-weiter"]');
  await page.waitForTimeout(400);
  const pruefText = await dialogText(page);
  pruefe(/Letzte Prüfung/.test(pruefText), "vor dem Speichern kommt eine letzte Prüfung");
  /*
    Eigener Fehler im ersten Versuch: Ich habe mit /wird entzogen/
    gesucht. innerText gibt den GERENDERTEN Text, und die
    Konfliktliste setzt ihre Ueberschriften per CSS in
    Grossbuchstaben - dort steht also "WIRD ENTZOGEN". Die
    Oberflaeche war richtig, meine Suche war es nicht.
  */
  pruefe(/wird entzogen/i.test(pruefText), "sie sagt, was entzogen wird");
  pruefe(/Testbuchhaltung 01/.test(pruefText), "und welches Konto betroffen ist");
  pruefe(/Wer danach Rechte verwalten kann/.test(pruefText),
    "und wer danach noch handlungsfähig ist");

  /* Ohne Grund wird nichts gespeichert. */
  await page.click('[data-tun="es-ja"]');
  await page.waitForTimeout(400);
  pruefe(await page.evaluate(() =>
    window.ProbeRahmen.rollenRechte.accounting.includes("analytics.read")),
    "ohne Grund wird nichts geändert");
  pruefe(/Grund eintragen/.test(await dialogText(page)), "und danach gefragt");

  await page.fill("[data-es-grund]", "Buchhaltung braucht die Analyse nicht mehr.");
  await page.click('[data-tun="es-ja"]');
  await page.waitForTimeout(500);
  pruefe(!(await page.evaluate(() =>
    window.ProbeRahmen.rollenRechte.accounting.includes("analytics.read"))),
    "mit Grund wird das Recht entzogen");

  const prot = await page.evaluate(() =>
    window.ProbeDaten.protokoll.find((x) => x.was === "Rechte geändert"));
  pruefe(Boolean(prot), "die Änderung steht im Protokoll");
  pruefe(Boolean(prot && prot.wer && prot.kennung && prot.datum && prot.zeit),
    "mit wer, Kennung, Datum und Uhrzeit");
  pruefe(Boolean(prot && /Rolle Buchhaltung/.test(prot.betrifft)),
    `mit dem betroffenen Ziel (${prot ? prot.betrifft : "—"})`);
  pruefe(Boolean(prot && prot.vorher && prot.nachher), "mit vorher und nachher");
  pruefe(Boolean(prot && prot.grund.length > 5), "und mit dem Grund");

  /* Navigation und Aktion folgen derselben Faehigkeit. */
  await page.selectOption("[data-rolle]", "accounting");
  await page.waitForTimeout(400);
  pruefe(!(await page.evaluate(() => window.ProbeRahmen.darf("analytics.read"))),
    "die Buchhaltung darf die Analyse nicht mehr");
  pruefe(!(await page.evaluate(() =>
    window.ProbeRahmen.sichtbareBereiche().some((b) => b.id === "analyse"))),
    "der Bereich ist nicht mehr in der Navigation");
  await page.evaluate(() => window.ProbeRahmen.geheZu("analyse"));
  await page.waitForTimeout(400);
  pruefe(/Kein Zugriff|Keine Berechtigung/.test(await sichtbarerText(page)),
    "und ein direkter Sprung dorthin wird abgewiesen — Verstecken allein wäre kein Schutz");

  /* Eine einzelne Freigabe. */
  await page.selectOption("[data-rolle]", "admin");
  await page.waitForTimeout(350);
  await page.evaluate(() => window.ProbeRahmen.geheZu("einstellungen"));
  await page.waitForTimeout(350);
  await page.click('[data-tun="es-konto:U-DIS-01"]');
  await page.waitForTimeout(400);
  pruefe(/zusätzliche/.test(await dialogText(page)),
    "die einzelnen Freigaben sind als zusätzlich zur Rolle benannt");
  const ausRolle = await page.$$eval(".rechtezeile.ist-aus-rolle", (n) => n.length);
  pruefe(ausRolle > 0, `Rechte aus der Rolle sind abgesetzt und gesperrt (${ausRolle})`);
  await page.check('[data-es-recht="absence.decide"]');
  await page.waitForTimeout(300);
  await page.click('[data-tun="es-weiter"]');
  await page.waitForTimeout(350);
  await page.fill("[data-es-grund]", "Vertretung im Urlaub der Personalleitung.");
  await page.click('[data-tun="es-ja"]');
  await page.waitForTimeout(500);
  pruefe(await page.evaluate(() =>
    (window.ProbeRahmen.kontoRechte["U-DIS-01"] || []).includes("absence.decide")),
    "die Freigabe steht am Konto");
  pruefe(!(await page.evaluate(() =>
    window.ProbeRahmen.rollenRechte.dispatcher.includes("absence.decide"))),
    "und NICHT an der Rolle — beides bleibt getrennt");
  await page.selectOption("[data-rolle]", "dispatcher");
  await page.waitForTimeout(350);
  pruefe(await page.evaluate(() => window.ProbeRahmen.darf("absence.decide")),
    "das Konto darf jetzt Urlaub entscheiden");

  pruefe(fehler.length === 0, "keine Fehlermeldung im Browser (" + fehler.join(" | ") + ")");
  await page.context().close();
}

/* ═══ 9. Keine Selbstaussperrung, keine Selbstberechtigung ══════ */
console.log("\n── 9. Die letzte Administration bleibt handlungsfähig ──");
{
  const { page, fehler } = await seite("admin");
  await page.evaluate(() => window.ProbeRahmen.geheZu("einstellungen"));
  await page.waitForTimeout(400);

  await page.click('[data-tun="es-rolle:admin"]');
  await page.waitForTimeout(400);
  await page.uncheck('[data-es-recht="security.write"]');
  await page.waitForTimeout(300);
  await page.click('[data-tun="es-weiter"]');
  await page.waitForTimeout(450);
  const t = await dialogText(page);
  pruefe(/kein einziges Konto/.test(t),
    "die Probe sagt, dass danach niemand mehr Rechte verwalten könnte");
  pruefe(!(await page.$('[data-tun="es-ja"]')),
    "und bietet kein „Verbindlich speichern“ an");

  /* Der direkte Aufruf muss ebenso scheitern. */
  await page.evaluate(() => {
    const f = document.querySelector("[data-es-grund]");
    if (f) f.value = "Versuch über den direkten Aufruf";
    window.ProbeEinstellungen.tun("es-ja", "");
  });
  await page.waitForTimeout(450);
  pruefe(await page.evaluate(() =>
    window.ProbeRahmen.rollenRechte.admin.includes("security.write")),
    "auch der direkte Aufruf sperrt die Administration nicht aus");

  /* Und das zweite Admin-Konto einzeln aussperren geht ebenfalls nicht,
     wenn es das letzte handlungsfaehige waere. */
  await page.evaluate(() => window.ProbeRahmen.dialogSchliessen(true));
  await page.waitForTimeout(300);
  const nurEiner = await page.evaluate(() => {
    /* self.read dem einen Admin nehmen - dann ist nur noch einer da. */
    window.ProbeRahmen.rollenRechte.admin =
      window.ProbeRahmen.rollenRechte.admin.filter((x) => x !== "security.write");
    window.ProbeRahmen.kontoRechte["U-ADM-01"] = ["security.write"];
    return {
      adm1: window.ProbeRahmen.rechteVon(window.ProbeRahmen.kontoVon("U-ADM-01")).includes("security.write"),
      adm2: window.ProbeRahmen.rechteVon(window.ProbeRahmen.kontoVon("U-ADM-02")).includes("security.write")
    };
  });
  pruefe(nurEiner.adm1 && !nurEiner.adm2,
    "jetzt kann nur noch ein Konto Rechte verwalten");
  await page.evaluate(() => window.ProbeRahmen.zeichnen());
  await page.waitForTimeout(350);
  await page.evaluate(() => {
    window.ProbeEinstellungen.tun("es-konto", "U-ADM-01");
    window.ProbeEinstellungen.stand.entwurf = [];
    window.ProbeEinstellungen.stand.stufe = "pruefen";
    window.ProbeEinstellungen.stand.grund = "Letztes Konto aussperren";
  });
  await page.evaluate(() => window.ProbeEinstellungen.tun("es-ja", ""));
  await page.waitForTimeout(400);
  pruefe(await page.evaluate(() =>
    (window.ProbeRahmen.kontoRechte["U-ADM-01"] || []).includes("security.write")),
    "dem letzten handlungsfähigen Konto kann das Recht nicht entzogen werden");

  pruefe(fehler.length === 0, "keine Fehlermeldung im Browser (" + fehler.join(" | ") + ")");
  await page.context().close();
}

console.log("\n── 10. Ohne das Recht geht nichts ──");
{
  for (const rolle of ["dispatcher", "personal", "accounting", "employee"]) {
    const { page } = await seite(rolle);
    pruefe(!(await page.evaluate(() => window.ProbeRahmen.darf("security.write"))),
      `${rolle} hat nicht das Recht, Rechte zu verwalten`);
    pruefe(!(await page.evaluate(() =>
      window.ProbeRahmen.sichtbareBereiche().some((b) => b.id === "einstellungen"))),
      `${rolle} sieht den Bereich nicht`);

    const vorher = await page.evaluate(() => JSON.stringify({
      rollen: window.ProbeRahmen.rollenRechte, konten: window.ProbeRahmen.kontoRechte
    }));
    await page.evaluate(() => {
      window.ProbeEinstellungen.tun("es-rolle", "dispatcher");
      window.ProbeEinstellungen.tun("es-konto", "U-DIS-01");
      window.ProbeEinstellungen.tun("es-weiter", "");
      window.ProbeEinstellungen.tun("es-ja", "");
    });
    await page.waitForTimeout(400);
    pruefe(await page.evaluate(() => JSON.stringify({
      rollen: window.ProbeRahmen.rollenRechte, konten: window.ProbeRahmen.kontoRechte
    })) === vorher, `${rolle}: der direkte Aufruf ändert kein Recht`);
    pruefe(!(await page.evaluate(() => window.ProbeRahmen.dialogOffen())),
      `${rolle}: und öffnet kein Fenster`);
    await page.context().close();
  }
}

/* ═══ 11. Breiten und Netz ══════════════════════════════════════ */
console.log("\n── 11. Breiten, Diagnose, Netz ──");
for (const breite of [320, 390, 430, 1440]) {
  const { page } = await seite("admin", breite, 880);
  for (const b of ["kunden", "finanzen", "einstellungen", "meldungen"]) {
    await page.evaluate((x) => window.ProbeRahmen.geheZu(x), b);
    await page.waitForTimeout(300);
    const ueber = await page.evaluate(() =>
      Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
    pruefe(ueber === 0, `${b} bei ${breite}px: kein waagerechter Überlauf (${ueber}px)`);
  }
  await page.context().close();
}
{
  const { page } = await seite("admin");
  /* Keine Diagnose und kein medizinischer Freitext in den neuen Feldern. */
  const felder = await page.evaluate(() => {
    const D = window.ProbeDaten;
    return JSON.stringify({
      kunden: D.kunden.slice(0, 8),
      fahrten: D.fahrten.slice(0, 10)
    });
  });
  pruefe(!/Diagnose|Dialyse|Chemo|Strahlen|Befund/i.test(felder),
    "keine Behandlungsart in Kunden- und Fahrtdaten");
  const quelle = await readFile(join(PROBE, "probe-einstellungen.js"), "utf8");
  pruefe(!/fetch\s*\(|XMLHttpRequest|sendBeacon|new WebSocket/.test(
    quelle.replace(/\/\*[\s\S]*?\*\//g, " ")),
    "kein Netzzugriff im Einstellungsmodul");
  pruefe(!/passwort|password|kennwort/i.test(quelle),
    "und kein Zugangsdatenfeld");
  await page.context().close();
}
pruefe(fremdeAnfragen.length === 0,
  `keine einzige Anfrage nach außen im ganzen Lauf (${fremdeAnfragen.length}) ${fremdeAnfragen.slice(0, 3).join(" ")}`);

await browser.close();
await new Promise((r) => server.close(r));

console.log("\n═══════════════════════════════════════════════════════════");
console.log(`Rechte und Akten: ${bestanden} bestanden, ${offen.length} nicht bestanden`);
if (offen.length) { console.log("\nOffen:"); offen.forEach((n) => console.log("  - " + n)); }
console.log("\nALLES SIMULIERT. Keine Datenquelle, kein Upload, kein Versand.");
console.log("Dieser Lauf sagt nichts ueber die produktive Instanz.");
console.log("═══════════════════════════════════════════════════════════");
process.exit(offen.length ? 1 : 0);
