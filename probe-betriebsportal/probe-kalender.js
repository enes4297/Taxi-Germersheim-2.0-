/*
  Kalender der Designprobe.

  Warum es ihn gibt: Die Planung konnte nur "heute" und "morgen". Der
  manuelle Test hat gezeigt, dass damit weder ein Urlaub in drei Wochen
  noch ein TUEV-Termin im naechsten Monat auffindbar ist.

  Drei Grundsaetze:

  1. Der Kalender AENDERT NICHTS. Er zeigt, was anderswo entschieden
     wurde, und fuehrt in die zustaendige Ansicht. Die Filter
     veraendern ausschliesslich die Anzeige.
  2. Der Inhalt haengt an den Faehigkeiten der Rolle, nicht an einem
     ausgeblendeten Knopf. Wer "personnel.read" nicht hat, bekommt die
     Dokumentfristen gar nicht erst geliefert.
  3. Im Kalender steht NIE eine Diagnose, eine Bescheinigung oder eine
     sonstige medizinische Angabe. Nur "Krank" als Tatsache der
     Einsatzplanung - und das auch nur fuer Rollen, die den Einsatz
     planen.

  Alle Daten sind Testdaten.
*/
(function () {
  "use strict";

  const R = window.ProbeRahmen;
  const D = window.ProbeDaten;
  const h = (s) => R.h(s);

  /* Der Kalender braucht bewusst KEINE Planungshelfer: er liest nur
     den gespeicherten Bestand und aendert nie einen Entwurf. Die
     Anmeldung bleibt, damit das Modul sich wie die uebrigen verhaelt. */
  function anmelden() { /* keine Abhaengigkeit noetig */ }

  const stand = {
    sicht: "monat",          /* tag | woche | monat */
    datum: "",               /* ISO des Bezugstages */
    arten: {                 /* reine Anzeigefilter */
      fahrt: true, schicht: true, abwesenheit: true,
      fahrzeug: true, dokument: true
    }
  };

  /* ---- Datumsrechnen. Immer lokal, nie ueber toISOString. ---- */
  const iso = (d) => D.alsIso(d);
  const alsDatum = (s) => new Date(s + "T00:00:00");
  const bezug = () => {
    if (!stand.datum) stand.datum = iso(D.heute);
    return stand.datum;
  };
  const verschieben = (d, tage) => {
    const x = new Date(d.getTime());
    x.setDate(x.getDate() + tage);
    return x;
  };

  const WOCHENTAGE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni",
    "Juli", "August", "September", "Oktober", "November", "Dezember"];

  /* Montag als Wochenbeginn - so plant der Betrieb. */
  function wochenanfang(d) {
    const tag = (d.getDay() + 6) % 7;
    return verschieben(d, -tag);
  }

  const langDatum = (isoTag) => {
    const d = alsDatum(isoTag);
    return WOCHENTAGE[(d.getDay() + 6) % 7] + ", " + d.getDate() + ". "
      + MONATE[d.getMonth()] + " " + d.getFullYear();
  };

  const ART_NAMEN = {
    fahrt: "Fahrten", schicht: "Schicht", abwesenheit: "Abwesenheit",
    fahrzeug: "Fahrzeug", dokument: "Dokument"
  };

  /* ============================================================
     Was an einem Tag steht - streng nach Faehigkeit
     ============================================================
     Jeder Eintrag nennt seine Art, damit der Anzeigefilter greifen
     kann, und sein Ziel, damit der Klick in die richtige Ansicht
     fuehrt.
  */
  function eintraege(isoTag) {
    const liste = [];
    const heuteIso = iso(D.heute);

    /* --- Fahrten. Nur der laufende Tag hat in dieser Probe Fahrten;
           fuer andere Tage wird nichts behauptet. --- */
    if (R.darf("operations.read") && isoTag === heuteIso && D.fahrten.length) {
      const offen = D.fahrten.filter((f) => f.zustand === "eingang").length;
      liste.push({
        art: "fahrt", marke: "aktiv",
        titel: D.fahrten.length + " Fahrten",
        zusatz: offen ? offen + " noch nicht zugeteilt" : "alle zugeteilt",
        ziel: "fahrten"
      });
    }

    /* --- Schichten. Gelesen wird der GESPEICHERTE Plan, nicht der
           Tagesentwurf der Planung. Der Kalender darf den Entwurf
           weder umschalten noch anlegen - sonst verlore die Planung
           beim blossen Blaettern ihre unbestaetigten Eingaben. --- */
    if (R.darf("operations.read")) {
      const plan = D.planung[isoTag];
      if (plan) {
        const besetzt = plan.zeilen.filter((z) => z.von && z.bis).length;
        if (besetzt) {
          liste.push({
            art: "schicht", marke: plan.veroeffentlicht ? "gut" : "ruhig",
            titel: besetzt + (besetzt === 1 ? " Schicht" : " Schichten"),
            zusatz: plan.veroeffentlicht ? "veröffentlicht" : "Entwurf",
            ziel: "planung", tag: isoTag
          });
        }
      }
    }

    /* --- Abwesenheiten. Nur die Tatsache, nie der Grund. --- */
    if (R.darf(["operations.read", "personnel.read"])) {
      D.mitarbeiter.forEach((m) => {
        const a = D.abwesenheitFuer(m.id, isoTag);
        if (a.wirksam) {
          liste.push({
            art: "abwesenheit",
            marke: a.wirksam.art === "krank" ? "warnung" : "ruhig",
            titel: m.name,
            zusatz: D.ABWESENHEIT_NAMEN[a.wirksam.art],
            ziel: "team"
          });
        } else if (a.beantragt) {
          liste.push({
            art: "abwesenheit", marke: "ruhig", titel: m.name,
            zusatz: "Urlaub beantragt", ziel: "meldungen"
          });
        }
      });
    }

    /* --- Fahrzeugtermine. --- */
    if (R.darf("fleet.read")) {
      D.fahrzeuge.forEach((f) => {
        if (f.tuev === isoTag) {
          liste.push({ art: "fahrzeug", marke: "warnung", titel: f.kennzeichen,
            zusatz: "TÜV fällig", ziel: "team" });
        }
        if (f.service === isoTag) {
          liste.push({ art: "fahrzeug", marke: "ruhig", titel: f.kennzeichen,
            zusatz: "Service fällig", ziel: "team" });
        }
        if (f.versicherung === isoTag) {
          liste.push({ art: "fahrzeug", marke: "ruhig", titel: f.kennzeichen,
            zusatz: "Versicherung läuft ab", ziel: "team" });
        }
      });
    }

    /* --- Dokumentfristen. Art und Frist, kein Aktenauszug. --- */
    if (R.darf("personnel.read")) {
      D.fahrerDokumente.forEach((dok) => {
        if (dok.bis !== isoTag) return;
        const m = D.mitarbeiter.find((x) => x.id === dok.mitarbeiterId);
        liste.push({
          art: "dokument", marke: "warnung",
          titel: m ? m.name : dok.mitarbeiterId,
          zusatz: dok.art + " läuft ab", ziel: "team"
        });
      });
    }

    return liste.filter((e) => stand.arten[e.art]);
  }

  /* ============================================================
     Bedienleiste
     ============================================================ */
  const SICHTEN = [
    { id: "tag", name: "Tag" },
    { id: "woche", name: "Woche" },
    { id: "monat", name: "Monat" }
  ];

  const ARTEN = [
    { id: "fahrt",       name: "Fahrten",         braucht: "operations.read" },
    { id: "schicht",     name: "Schichten",       braucht: "operations.read" },
    { id: "abwesenheit", name: "Abwesenheiten",   braucht: ["operations.read", "personnel.read"] },
    { id: "fahrzeug",    name: "Fahrzeuge",       braucht: "fleet.read" },
    { id: "dokument",    name: "Dokumentfristen", braucht: "personnel.read" }
  ];

  function leiste() {
    const b = bezug();
    const sichtbar = ARTEN.filter((a) => R.darf(a.braucht));
    return `
      <div class="tageswahl">
        <div class="tagumschalter" role="group" aria-label="Zeitraum">
          ${SICHTEN.map((s) => `<button type="button" data-tun="kal-sicht:${h(s.id)}"
            aria-pressed="${stand.sicht === s.id}">${h(s.name)}</button>`).join("")}
        </div>
        <button class="knopf klein" type="button" data-tun="kal-zurueck"
          aria-label="Vorheriger Zeitraum">‹ Zurück</button>
        <button class="knopf klein" type="button" data-tun="kal-heute"
          aria-pressed="${b === iso(D.heute)}">Heute</button>
        <button class="knopf klein" type="button" data-tun="kal-vor"
          aria-label="Nächster Zeitraum">Vor ›</button>
        <label class="tagfeld">Datum
          <input type="date" data-kal-datum value="${h(b)}"></label>
      </div>
      ${sichtbar.length ? `<div class="filterzeile" role="group" aria-label="Anzeige einschränken">
        ${sichtbar.map((a) => `<button class="filterchip" type="button"
          data-tun="kal-art:${h(a.id)}" aria-pressed="${stand.arten[a.id]}">
          ${h(a.name)}</button>`).join("")}
      </div>` : ""}
      <p class="schritt-hinweis">Diese Filter ändern nur die Anzeige. Es wird nichts
        gespeichert und nichts entschieden. Was Sie hier sehen, hängt an Ihrer Rolle.</p>`;
  }

  /* ============================================================
     Die drei Sichten
     ============================================================ */
  function tagSicht() {
    const b = bezug();
    const liste = eintraege(b);
    return `
      <div class="karte">
        <h3>${h(langDatum(b))}</h3>
        ${liste.length ? `<ul class="kal-tagesliste">
          ${liste.map((e) => `<li>
            ${R.marke(e.marke, ART_NAMEN[e.art])}
            <strong>${h(e.titel)}</strong>
            <span>${h(e.zusatz)}</span>
            <button class="knopf klein" type="button"
              data-tun="kal-ziel:${h(e.ziel)}|${h(e.tag || b)}">Öffnen</button>
          </li>`).join("")}
        </ul>` : R.zustandsKasten("leer", "Für diesen Tag liegt nichts vor",
          "Das heißt nicht, dass nichts geplant ist — es heißt, dass zu diesem Tag in der Designprobe keine Testdaten hinterlegt sind.")}
      </div>`;
  }

  function wocheSicht() {
    const start = wochenanfang(alsDatum(bezug()));
    const tage = [];
    for (let i = 0; i < 7; i += 1) tage.push(iso(verschieben(start, i)));
    return `
      <div class="kal-kopfzeile fuer-woche" aria-hidden="true">
        ${WOCHENTAGE.map((t) => `<span>${h(t)}</span>`).join("")}
      </div>
      <div class="kal-woche">${tage.map((t) => tagKachel(t, false)).join("")}</div>`;
  }

  function monatSicht() {
    const b = alsDatum(bezug());
    const erster = new Date(b.getFullYear(), b.getMonth(), 1);
    const letzter = new Date(b.getFullYear(), b.getMonth() + 1, 0);
    const start = wochenanfang(erster);
    const tage = [];
    let d = start;
    /* Bis zum Ende der Woche, in die der Monatsletzte faellt. */
    while (d <= letzter || ((d.getDay() + 6) % 7) !== 0) {
      tage.push({ isoTag: iso(d), fremd: d.getMonth() !== b.getMonth() });
      d = verschieben(d, 1);
      if (tage.length >= 42) break;
    }
    return `
      <div class="kal-kopfzeile" aria-hidden="true">
        ${WOCHENTAGE.map((t) => `<span>${h(t)}</span>`).join("")}
      </div>
      <div class="kal-monat">
        ${tage.map((t) => tagKachel(t.isoTag, t.fremd)).join("")}
      </div>`;
  }

  function tagKachel(isoTag, fremd) {
    const liste = eintraege(isoTag);
    const d = alsDatum(isoTag);
    const klassen = ["kal-tag"];
    if (fremd) klassen.push("fremd");
    if (isoTag === iso(D.heute)) klassen.push("heute");
    if (isoTag === bezug()) klassen.push("gewaehlt");
    return `
      <button class="${klassen.join(" ")}" type="button" data-tun="kal-tag:${h(isoTag)}"
        aria-label="${h(langDatum(isoTag))}, ${liste.length} Einträge">
        <span class="kal-zahl">${d.getDate()}</span>
        ${liste.length ? `<span class="kal-punkte">
          ${liste.slice(0, 4).map((e) => `<i class="art-${h(e.art)}"></i>`).join("")}
          ${liste.length > 4 ? `<em>+${liste.length - 4}</em>` : ""}
        </span>
        <span class="kal-erst">${h(liste[0].titel)}</span>` : ""}
      </button>`;
  }

  /* ============================================================
     Zeichnen
     ============================================================ */
  function zeichne() {
    const b = bezug();
    const d = alsDatum(b);
    const titel = stand.sicht === "monat"
      ? MONATE[d.getMonth()] + " " + d.getFullYear()
      : (stand.sicht === "woche"
        ? "Woche ab " + langDatum(iso(wochenanfang(d)))
        : langDatum(b));

    const sicht = { tag: tagSicht, woche: wocheSicht, monat: monatSicht }[stand.sicht]();

    return `
      <div class="bereichskopf">
        <div>
          <h1>Kalender</h1>
          <p class="wichtig">${h(titel)} — eine reine Ansicht. Der Kalender zeigt,
            was anderswo entschieden wurde, und entscheidet selbst nichts.</p>
        </div>
      </div>
      <div class="flaeche">
        ${leiste()}
        ${sicht}
        ${stand.sicht !== "tag" ? `<p class="schritt-hinweis">Ein Klick auf einen Tag
          öffnet dessen Tagesansicht. Von dort führt jeder Eintrag in den Bereich,
          der ihn verantwortet — der Kalender selbst entscheidet nichts.</p>` : ""}
      </div>`;
  }

  /* ============================================================
     Bedienung
     ============================================================ */
  function tun(name, wert) {
    switch (name) {
      case "kal-sicht":
        stand.sicht = wert;
        R.zeichnen();
        return;
      case "kal-heute":
        stand.datum = iso(D.heute);
        R.zeichnen();
        return;
      case "kal-zurueck":
      case "kal-vor": {
        const richtung = name === "kal-vor" ? 1 : -1;
        const d = alsDatum(bezug());
        if (stand.sicht === "tag") stand.datum = iso(verschieben(d, richtung));
        else if (stand.sicht === "woche") stand.datum = iso(verschieben(d, richtung * 7));
        else stand.datum = iso(new Date(d.getFullYear(), d.getMonth() + richtung, 1));
        R.zeichnen();
        return;
      }
      case "kal-tag":
        stand.datum = wert;
        stand.sicht = "tag";
        R.zeichnen();
        return;
      case "kal-art":
        /* Reiner Anzeigefilter - er veraendert keine Daten. */
        stand.arten[wert] = !stand.arten[wert];
        R.zeichnen();
        return;
      case "kal-ziel": {
        const [ziel, tag] = wert.split("|");
        /* Die Planung uebernimmt den gewaehlten Tag, damit der Klick
           nicht in einer anderen Woche landet. */
        if (ziel === "planung" && tag) R.zustand.planDatum = tag;
        R.geheZu(ziel);
        return;
      }
      default:
    }
  }

  function geaendert(feld) {
    if (feld.matches("[data-kal-datum]") && feld.value) {
      stand.datum = feld.value;
      R.zeichnen();
      return true;
    }
    return false;
  }

  window.ProbeKalender = { zeichne, tun, geaendert, anmelden, stand };
})();
