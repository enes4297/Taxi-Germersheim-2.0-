/* ============================================================
   Designprobe Betriebsportal - Fahrtassistent
   ============================================================
   Eigenes Modul, weil der Ablauf der laengste im Portal ist und aus
   dem Bereichsmodul herauswachsen wuerde.

   Nach dem echten Bedienversuch geaendert:
   - Bestandskunde und neuer Kunde werden getrennt behandelt.
   - Suche statt Kundenkarten - der Bestand wird nie vollstaendig
     gezeichnet.
   - Die Eingabetaste geht weiter, aber nur bei gueltigem Schritt.
   - Rollstuhl, Gepaeck und die Angaben zur Krankenfahrt sind da.
   - Das Fenster schliesst nicht mehr durch einen Klick daneben.
   - Ein Entwurf ueberlebt ein versehentliches Neuladen.

   Kein Netzzugriff, kein Upload, kein Versand.
   ============================================================ */
(() => {
  "use strict";

  const R = window.ProbeRahmen;
  const D = window.ProbeDaten;
  const h = R.h;

  const ENTWURF_SCHLUESSEL = "probeFahrtEntwurf";

  const leererStand = () => ({
    schritt: 1,
    kundenModus: "suche",     // "suche" | "neu"
    suche: "",
    markiert: 0,
    kundeId: "",
    gast: false,
    neuerKunde: { art: "privat", vorname: "", nachname: "", firma: "", telefon: "", strasse: "", hausnummer: "", plz: "", ort: "" },
    abholung: "",
    abholungEigen: false,
    ziel: "",
    datum: "",
    zeit: "",
    leistung: "",
    rollstuhl: "kein",
    begleitung: false,
    weitereFahrgaeste: "0",
    platzbedarf: "",
    gepaeck: "normal",
    schein: "",
    zuzahlung: "",
    genehmigung: "",
    hinweis: "",
    fehler: "",
    abbruchfrage: false,
    /* Wurde aus der Zusammenfassung heraus ein Schritt zum Bearbeiten
       angesprungen? Dann fuehrt ein Knopf in einem Zug zurueck -
       sonst muesste man sich durch alle Schritte klicken. */
    ausPruefung: false,
    beruehrt: false
  });

  let stand = leererStand();

  const kundeVon = (id) => D.kunden.find((k) => k.id === id) || null;
  const aktuellerKunde = () => kundeVon(stand.kundeId);

  /* Die Angaben zur Krankenfahrt sind sensibler. Sie gehoeren zum
     Aufnehmen der Fahrt, also zu operations.write - und zur
     Abrechnung, also zu finance.read. Andere Rollen sehen sie nicht,
     und sie erscheinen weder in Meldungen noch in der Auswertung. */
  const darfMedizinisches = () => R.darf("operations.write") || R.darf("finance.read");

  const istMedizinisch = () => {
    const art = D.leistungsarten.find((l) => l.id === stand.leistung);
    return Boolean(art && art.medizinisch);
  };

  /* ============================================================
     Entwurf - nur fuer diesen Benutzer, nur bis zum Speichern
     ============================================================ */
  const entwurfSchluessel = () => `${ENTWURF_SCHLUESSEL}:${R.zustand.rolle}`;

  function entwurfSichern() {
    if (!stand.beruehrt) return;
    try {
      const { abbruchfrage, fehler, markiert, ...rest } = stand;
      localStorage.setItem(entwurfSchluessel(), JSON.stringify({ zeit: Date.now(), stand: rest }));
    } catch { /* gesperrter Speicher darf den Ablauf nicht stoeren */ }
  }

  function entwurfLesen() {
    try {
      const roh = localStorage.getItem(entwurfSchluessel());
      if (!roh) return null;
      const daten = JSON.parse(roh);
      if (!daten || !daten.stand) return null;
      return daten;
    } catch { return null; }
  }

  function entwurfLoeschen() {
    try { localStorage.removeItem(entwurfSchluessel()); } catch { /* egal */ }
  }

  /* ============================================================
     Pruefung je Schritt
     ============================================================ */
  function schrittFehler(nr) {
    if (nr === 1) {
      if (stand.kundenModus === "neu") {
        const n = stand.neuerKunde;
        if (n.art === "firma" && !n.firma.trim()) return "Bitte den Firmennamen eintragen.";
        if (n.art === "privat" && (!n.vorname.trim() || !n.nachname.trim())) return "Bitte Vorname und Nachname eintragen.";
        if (!n.telefon.trim()) return "Bitte eine Telefonnummer eintragen — die Zentrale braucht sie für Rückfragen.";
        if (!n.strasse.trim() || !n.hausnummer.trim()) return "Bitte Straße und Hausnummer eintragen.";
        if (!n.plz.trim() || !n.ort.trim()) return "Bitte Postleitzahl und Ort eintragen.";
        return "";
      }
      if (!stand.kundeId && !stand.gast) return "Bitte einen Kunden auswählen, eine Gastfahrt wählen oder einen neuen Kunden anlegen.";
      return "";
    }
    if (nr === 2) return stand.abholung.trim() ? "" : "Bitte eine Abholadresse eintragen.";
    if (nr === 3) return stand.ziel.trim() ? "" : "Bitte ein Ziel eintragen.";
    if (nr === 4) {
      if (!stand.datum) return "Bitte ein Datum wählen.";
      if (!stand.zeit) return "Bitte eine Uhrzeit wählen.";
      return "";
    }
    if (nr === 5) {
      if (!stand.leistung) return "Bitte eine Leistungsart wählen.";
      if (istMedizinisch() && darfMedizinisches()) {
        if (!stand.schein) return "Bitte den Stand des Transportscheins angeben — „noch ungeklärt“ ist eine gültige Antwort.";
        if (!stand.zuzahlung) return "Bitte die Zuzahlungsbefreiung angeben — „noch ungeklärt“ ist eine gültige Antwort.";
      }
      return "";
    }
    return "";
  }

  /* ============================================================
     Werte aus den sichtbaren Feldern uebernehmen
     ============================================================ */
  function werteLesen() {
    const kasten = document.querySelector(".dialog-kasten");
    if (!kasten) return;
    kasten.querySelectorAll("[data-feld]").forEach((el) => {
      const weg = el.dataset.feld;
      const wert = el.type === "checkbox" ? el.checked : el.value;
      if (weg.startsWith("neu.")) stand.neuerKunde[weg.slice(4)] = wert;
      else stand[weg] = wert;
    });
  }

  /* ============================================================
     Zeichnen
     ============================================================ */
  const SCHRITTE = ["Kunde", "Abholung", "Ziel", "Zeit", "Leistung", "Prüfen"];

  function schrittleiste() {
    return `<ul class="schrittleiste">${SCHRITTE.map((name, i) => {
      const nr = i + 1;
      const art = nr === stand.schritt ? "ist-jetzt" : nr < stand.schritt ? "ist-fertig" : "";
      return `<li class="${art}">${nr}. ${h(name)}</li>`;
    }).join("")}</ul>`;
  }

  const fehlerKasten = () => stand.fehler
    ? `<div class="feldfehler" role="alert">${h(stand.fehler)}</div>` : "";

  /* ---- Schritt 1: Kunde ---- */
  function kundenTreffer() {
    const ergebnis = D.kundenSuche(stand.suche, 8);
    if (ergebnis.zuKurz) {
      return `<p class="suchhinweis">Mindestens zwei Zeichen eingeben. Der Bestand hat
        ${h(D.kunden.length)} Kunden — es werden nie alle gezeigt.</p>`;
    }
    if (!ergebnis.treffer.length) {
      return `<p class="suchhinweis">Kein Treffer für „${h(stand.suche)}“.
        Sie können eine Gastfahrt wählen oder den Kunden neu anlegen.</p>`;
    }
    const mehr = ergebnis.gesamt > ergebnis.treffer.length
      ? `<p class="suchhinweis">${h(ergebnis.gesamt > 500 ? "über 500" : ergebnis.gesamt)} Treffer —
         gezeigt werden die ersten ${h(ergebnis.treffer.length)}. Bitte genauer suchen.</p>`
      : "";
    return `<div class="trefferliste" role="listbox" aria-label="Suchergebnisse">
      ${ergebnis.treffer.map((k, i) => `
        <button class="treffer ${i === stand.markiert ? "ist-markiert" : ""}" type="button"
          role="option" aria-selected="${i === stand.markiert}" data-tun="fa-kunde:${h(k.id)}">
          <strong>${h(k.name)}</strong>
          <span>${h(k.kundennummer)} · ${h(k.telefon)} · ${h(D.standardadresse(k))}</span>
        </button>`).join("")}
    </div>${mehr}`;
  }

  /* Ein Ort fuer alle drei Faelle - vorher entschieden zwei Stellen
     unterschiedlich, und der Hinweis bei einem Zeichen war nie zu
     sehen. Vom Prueflauf gefunden. */
  function trefferbereich() {
    if (stand.suche.trim().length === 0) {
      return `<p class="suchhinweis">Zuletzt verwendet:</p>
        <div class="trefferliste">
          ${D.letzteKunden.map((k) => `
            <button class="treffer" type="button" data-tun="fa-kunde:${h(k.id)}">
              <strong>${h(k.name)}</strong>
              <span>${h(k.kundennummer)} · ${h(k.telefon)}</span>
            </button>`).join("")}
        </div>`;
    }
    return kundenTreffer();
  }

  function schrittKunde() {
    if (stand.kundenModus === "neu") {
      const n = stand.neuerKunde;
      return `<div class="dialog-schritt">
        <h3>Neuen Kunden anlegen</h3>
        <p class="schritt-hinweis">Diese Angaben werden einmal erfasst und stehen bei jeder
          weiteren Fahrt bereit.</p>
        <div class="wahlraster" style="margin-bottom:12px">
          <button class="wahlkarte" type="button" data-tun="fa-neuart:privat" aria-pressed="${n.art === "privat"}">
            <strong>Privatperson</strong></button>
          <button class="wahlkarte" type="button" data-tun="fa-neuart:firma" aria-pressed="${n.art === "firma"}">
            <strong>Firma</strong></button>
        </div>
        ${n.art === "firma"
          ? `<label>Firmenname<input type="text" data-feld="neu.firma" value="${h(n.firma)}" data-weiter autocomplete="off"></label>`
          : `<div class="feldpaar">
              <label>Vorname<input type="text" data-feld="neu.vorname" value="${h(n.vorname)}" data-weiter autocomplete="off"></label>
              <label>Nachname<input type="text" data-feld="neu.nachname" value="${h(n.nachname)}" data-weiter autocomplete="off"></label>
            </div>`}
        <div class="feldpaar">
          <label>Telefonnummer<input type="tel" data-feld="neu.telefon" value="${h(n.telefon)}" data-weiter autocomplete="off"></label>
        </div>
        <div class="feldpaar">
          <label>Straße<input type="text" data-feld="neu.strasse" value="${h(n.strasse)}" data-weiter autocomplete="off"></label>
          <label>Hausnummer<input type="text" data-feld="neu.hausnummer" value="${h(n.hausnummer)}" data-weiter autocomplete="off"></label>
        </div>
        <div class="feldpaar">
          <label>Postleitzahl<input type="text" data-feld="neu.plz" value="${h(n.plz)}" data-weiter autocomplete="off" inputmode="numeric"></label>
          <label>Ort<input type="text" data-feld="neu.ort" value="${h(n.ort)}" data-weiter autocomplete="off"></label>
        </div>
        <p class="schritt-hinweis">In der späteren echten Umsetzung wird beim Speichern geprüft,
          ob Telefonnummer oder Adresse schon zu einem Kunden gehören — damit kein Doppelter entsteht.</p>
        <button class="knopf klein" type="button" data-tun="fa-kundenmodus:suche" style="margin-top:10px">
          Zurück zur Suche</button>
      </div>`;
    }

    const gewaehlt = aktuellerKunde();
    const gewaehltMarkup = gewaehlt
      ? `<div class="gewaehlt-kasten">
          <div>
            <strong>${h(gewaehlt.name)}</strong>
            <span>${h(gewaehlt.kundennummer)} · ${h(gewaehlt.telefon)}</span>
            <span>${h(D.standardadresse(gewaehlt))}</span>
          </div>
          <button class="knopf klein" type="button" data-tun="fa-kunde-loesen">Anderen wählen</button>
        </div>`
      : stand.gast
        ? `<div class="gewaehlt-kasten">
            <div><strong>Gastfahrt</strong><span>ohne Kundenkonto — Adresse wird gleich eingetragen</span></div>
            <button class="knopf klein" type="button" data-tun="fa-kunde-loesen">Doch ein Kunde</button>
          </div>`
        : "";

    if (gewaehltMarkup) {
      return `<div class="dialog-schritt">
        <h3>Für wen ist die Fahrt?</h3>
        ${gewaehltMarkup}
      </div>`;
    }

    return `<div class="dialog-schritt">
      <h3>Für wen ist die Fahrt?</h3>
      <label>Suche
        <input type="search" data-feld="suche" data-suchfeld value="${h(stand.suche)}"
          placeholder="Name, Telefonnummer oder Kundennummer suchen" autocomplete="off">
      </label>
      <div data-trefferbereich>${trefferbereich()}</div>
      <div class="wahlraster" style="margin-top:14px">
        <button class="wahlkarte" type="button" data-tun="fa-gast">
          <strong>Gastfahrt</strong><span>ohne Kundenkonto</span></button>
        <button class="wahlkarte" type="button" data-tun="fa-kundenmodus:neu">
          <strong>Neuen Kunden anlegen</strong><span>Stammdaten einmal erfassen</span></button>
      </div>
    </div>`;
  }

  /* ---- Schritt 2: Abholung ---- */
  function schrittAbholung() {
    const k = aktuellerKunde();
    const standard = k ? D.standardadresse(k) : "";
    if (k && standard && !stand.abholungEigen) {
      return `<div class="dialog-schritt">
        <h3>Wo wird abgeholt?</h3>
        <div class="vorschlag-kasten">
          <span class="vorschlag-band">Gespeicherte Adresse</span>
          <strong>${h(standard)}</strong>
          <span>Telefon: ${h(k.telefon)}</span>
        </div>
        <div class="knopfzeile">
          <button class="knopf haupt-knopf" type="button" data-tun="fa-abholung-uebernehmen">
            Diese Adresse übernehmen</button>
          <button class="knopf" type="button" data-tun="fa-abholung-eigen">Andere Abholadresse</button>
        </div>
      </div>`;
    }
    return `<div class="dialog-schritt">
      <h3>Wo wird abgeholt?</h3>
      <label>Abholadresse
        <input type="text" data-feld="abholung" value="${h(stand.abholung)}" data-weiter
          placeholder="Straße, Hausnummer, Ort" autocomplete="off"></label>
      ${k && standard ? `<button class="knopf klein" type="button" data-tun="fa-abholung-zurueck"
        style="margin-top:10px">Doch die gespeicherte Adresse</button>` : ""}
    </div>`;
  }

  /* ---- Schritt 3: Ziel ---- */
  function schrittZiel() {
    const k = aktuellerKunde();
    let vorschlaege = "";
    if (k && k.letzteFahrten.length) {
      const letzte = k.letzteFahrten[0];
      const haeufig = D.haeufigeZiele(k).filter((z) => z.anzahl > 1);
      vorschlaege = `
        <p class="suchhinweis">Aus den letzten Fahrten:</p>
        <div class="trefferliste">
          <button class="treffer" type="button" data-tun="fa-ziel:${h(letzte.nach)}">
            <strong>${h(letzte.nach)}</strong>
            <span>letzte Fahrt am ${h(letzte.datum)}</span></button>
          ${haeufig.map((z) => `
            <button class="treffer" type="button" data-tun="fa-ziel:${h(z.ziel)}">
              <strong>${h(z.ziel)}</strong>
              <span>${h(z.anzahl)}-mal in den letzten Fahrten</span></button>`).join("")}
        </div>
        <button class="knopf klein" type="button" data-tun="fa-strecke-uebernehmen" style="margin-top:8px">
          Ganze Strecke vom ${h(letzte.datum)} übernehmen</button>`;
    }
    return `<div class="dialog-schritt">
      <h3>Wohin geht es?</h3>
      <label>Zieladresse
        <input type="text" data-feld="ziel" value="${h(stand.ziel)}" data-weiter
          placeholder="Straße, Hausnummer, Ort" autocomplete="off"></label>
      ${vorschlaege}
      <p class="schritt-hinweis">Entfernung und Fahrzeit werden nicht berechnet —
        es ist keine Kartenquelle angebunden.</p>
    </div>`;
  }

  /* ---- Schritt 4: Zeit ---- */
  function schrittZeit() {
    return `<div class="dialog-schritt">
      <h3>Wann?</h3>
      <div class="feldpaar">
        <label>Datum<input type="date" data-feld="datum" data-weiter
          value="${h(stand.datum || D.alsIso(D.heute))}"></label>
        <label>Uhrzeit<input type="time" data-feld="zeit" data-weiter value="${h(stand.zeit)}"></label>
      </div>
    </div>`;
  }

  /* ---- Schritt 5: Leistung ---- */
  function schrittLeistung() {
    const medizinisch = istMedizinisch();
    const rollstuhlfahrzeug = stand.rollstuhl === "fahrzeug";
    const flughafen = stand.leistung === "flughafen";

    return `
      <div class="dialog-schritt">
        <h3>Welche Leistung?</h3>
        <div class="wahlraster">
          ${D.leistungsarten.map((l) => `
            <button class="wahlkarte" type="button" data-tun="fa-leistung:${h(l.id)}"
              aria-pressed="${stand.leistung === l.id}">
              <strong>${h(l.name)}</strong>${l.hinweis ? `<span>${h(l.hinweis)}</span>` : ""}</button>`).join("")}
        </div>
      </div>

      <div class="dialog-schritt">
        <h3>Rollstuhl</h3>
        <div class="wahlraster">
          ${D.rollstuhlWerte.map((w) => `
            <button class="wahlkarte" type="button" data-tun="fa-rollstuhl:${h(w.id)}"
              aria-pressed="${stand.rollstuhl === w.id}">
              <strong>${h(w.name)}</strong><span>${h(w.hinweis)}</span></button>`).join("")}
        </div>
        ${rollstuhlfahrzeug ? `
          <div class="unterfeld">
            <p class="schritt-hinweis"><strong>Ein Rollstuhlfahrzeug wird benötigt.</strong>
              Bei der Zuweisung wird ein ungeeignetes Fahrzeug nicht stillschweigend vergeben,
              sondern als Konflikt gemeldet.</p>
            <div class="feldpaar">
              <label class="kaestchen">
                <input type="checkbox" data-feld="begleitung" ${stand.begleitung ? "checked" : ""}>
                Begleitperson fährt mit</label>
              <label>Weitere Fahrgäste
                <input type="number" min="0" max="7" data-feld="weitereFahrgaeste" value="${h(stand.weitereFahrgaeste)}"></label>
            </div>
            <label>Besonderer Platzbedarf
              <input type="text" data-feld="platzbedarf" value="${h(stand.platzbedarf)}"
                placeholder="zum Beispiel Sauerstoffgerät oder Rollator" autocomplete="off"></label>
          </div>` : ""}
      </div>

      <div class="dialog-schritt">
        <h3>Gepäck${flughafen ? ' <span class="band-warnung">bei Flughafenfahrt wichtig</span>' : ""}</h3>
        <div class="wahlraster">
          ${D.gepaeckWerte.map((w) => `
            <button class="wahlkarte" type="button" data-tun="fa-gepaeck:${h(w.id)}"
              aria-pressed="${stand.gepaeck === w.id}">
              <strong>${h(w.name)}</strong>${w.hinweis ? `<span>${h(w.hinweis)}</span>` : ""}</button>`).join("")}
        </div>
      </div>

      ${medizinisch && darfMedizinisches() ? `
        <div class="dialog-schritt geschuetzt">
          <h3>Für die Abrechnung <span class="band-gold">nur für berechtigte Rollen</span></h3>
          <p class="schritt-hinweis">Es wird kein Behandlungsgrund und keine Diagnose erfasst —
            nur, was für Fahrt und Abrechnung gebraucht wird. Diese Angaben erscheinen
            weder in Meldungen noch in der Auswertung.</p>

          <h4 class="unterueberschrift">Transportschein</h4>
          <div class="wahlraster">
            ${D.scheinWerte.map((w) => `
              <button class="wahlkarte" type="button" data-tun="fa-schein:${h(w.id)}"
                aria-pressed="${stand.schein === w.id}"><strong>${h(w.name)}</strong></button>`).join("")}
          </div>

          <h4 class="unterueberschrift">Zuzahlungsbefreiung</h4>
          <div class="wahlraster">
            ${D.zuzahlungWerte.map((w) => `
              <button class="wahlkarte" type="button" data-tun="fa-zuzahlung:${h(w.id)}"
                aria-pressed="${stand.zuzahlung === w.id}"><strong>${h(w.name)}</strong></button>`).join("")}
          </div>

          <h4 class="unterueberschrift">Genehmigung der Krankenkasse</h4>
          <div class="wahlraster">
            ${D.genehmigungWerte.map((w) => `
              <button class="wahlkarte" type="button" data-tun="fa-genehmigung:${h(w.id)}"
                aria-pressed="${stand.genehmigung === w.id}"><strong>${h(w.name)}</strong></button>`).join("")}
          </div>
        </div>` : ""}
      ${medizinisch && !darfMedizinisches() ? `
        <div class="dialog-schritt">
          ${R.zustandsKasten("keinrecht", "Angaben zur Abrechnung",
            "Transportschein, Zuzahlungsbefreiung und die Genehmigung der Krankenkasse gehören nicht zu Ihrer Rolle. Die Fahrt lässt sich trotzdem aufnehmen; die Abrechnung ergänzt die Angaben.")}
        </div>` : ""}

      <div class="dialog-schritt">
        <h3>Hinweis für die Disposition</h3>
        <label>Freitext, mehrzeilig
          <textarea data-feld="hinweis" rows="3"
            placeholder="Betriebliche Hinweise. Keine Gesundheitsangaben.">${h(stand.hinweis)}</textarea></label>
        <p class="schritt-hinweis">In diesem Feld erzeugt die Eingabetaste einen Zeilenumbruch
          und geht nicht weiter.</p>
      </div>`;
  }

  /* ---- Schritt 6: Zusammenfassung ---- */
  function abschnitt(titel, zuSchritt, zeilen) {
    const sichtbar = zeilen.filter(([, wert]) => wert !== null && wert !== undefined && wert !== "");
    if (!sichtbar.length) return "";
    return `<div class="pruef-block">
      <div class="pruef-kopf">
        <h4>${h(titel)}</h4>
        <button class="knopf klein" type="button" data-tun="fa-zu:${zuSchritt}">Bearbeiten</button>
      </div>
      <dl class="zusammenfassung">
        ${sichtbar.map(([k, w]) => `<div><dt>${h(k)}</dt><dd>${h(w)}</dd></div>`).join("")}
      </dl>
    </div>`;
  }

  function nameVon(liste, id) {
    const t = liste.find((x) => x.id === id);
    return t ? t.name : "";
  }

  function schrittPruefen() {
    const k = aktuellerKunde();
    const n = stand.neuerKunde;
    const kundeName = k ? k.name
      : stand.gast ? "Gastfahrt"
      : n.art === "firma" ? n.firma
      : `${n.vorname} ${n.nachname}`.trim();
    const telefon = k ? k.telefon : (stand.gast ? "" : n.telefon);

    const medizinisch = istMedizinisch() && darfMedizinisches();

    return `<div class="dialog-schritt">
      <h3>Bitte prüfen</h3>
      ${abschnitt("Kunde", 1, [
        ["Name", kundeName],
        ["Telefon", telefon],
        ["Kundennummer", k ? k.kundennummer : ""],
        ["Hinweis zum Kunden", k ? k.hinweis : ""]
      ])}
      ${abschnitt("Abholung", 2, [["Adresse", stand.abholung]])}
      ${abschnitt("Ziel", 3, [["Adresse", stand.ziel]])}
      ${abschnitt("Zeit", 4, [
        ["Datum", stand.datum ? new Date(stand.datum + "T00:00:00").toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" }) : ""],
        ["Uhrzeit", stand.zeit ? stand.zeit + " Uhr" : ""]
      ])}
      ${abschnitt("Leistung", 5, [
        ["Art", nameVon(D.leistungsarten, stand.leistung)],
        ["Rollstuhl", nameVon(D.rollstuhlWerte, stand.rollstuhl)],
        ["Begleitperson", stand.rollstuhl === "fahrzeug" ? (stand.begleitung ? "ja" : "nein") : ""],
        ["Weitere Fahrgäste", stand.rollstuhl === "fahrzeug" ? stand.weitereFahrgaeste : ""],
        ["Platzbedarf", stand.rollstuhl === "fahrzeug" ? stand.platzbedarf : ""],
        ["Gepäck", nameVon(D.gepaeckWerte, stand.gepaeck)]
      ])}
      ${medizinisch ? abschnitt("Für die Abrechnung", 5, [
        ["Transportschein", nameVon(D.scheinWerte, stand.schein)],
        ["Zuzahlung", nameVon(D.zuzahlungWerte, stand.zuzahlung)],
        ["Genehmigung der Krankenkasse", nameVon(D.genehmigungWerte, stand.genehmigung)]
      ]) : ""}
      ${abschnitt("Hinweise", 5, [["Text", stand.hinweis]])}
      ${abschnitt("Zuteilung", 6, [["Fahrer und Fahrzeug", "wird später zugewiesen"]])}
    </div>`;
  }

  /* ---- Abbruchfrage - im selben Fenster, nie verschachtelt ---- */
  function abbruchMarkup() {
    return `
      <div class="dialog-hinter"></div>
      <div class="dialog-kasten" role="dialog" aria-modal="true" aria-labelledby="faAbbruch">
        <header class="dialog-kopf"><h2 id="faAbbruch">Fahrtaufnahme abbrechen?</h2></header>
        <div class="dialog-rumpf">
          ${R.zustandsKasten("fehler", "Fahrtaufnahme wirklich abbrechen?",
            "Ihre bisherigen Eingaben gehen verloren.")}
        </div>
        <footer class="dialog-fuss">
          <button class="knopf" type="button" data-tun="fa-verwerfen">Eingaben verwerfen</button>
          <button class="knopf haupt-knopf" type="button" data-tun="fa-weiterbearbeiten">Weiter bearbeiten</button>
        </footer>
      </div>`;
  }

  /* ---- Das ganze Fenster ---- */
  function markup() {
    if (stand.abbruchfrage) return abbruchMarkup();

    const inhalt = [schrittKunde, schrittAbholung, schrittZiel, schrittZeit, schrittLeistung, schrittPruefen][stand.schritt - 1]();
    const letzter = stand.schritt === 6;

    return `
      <!-- Kein data-dialog-zu am Hintergrund: ein Klick daneben darf den
           Assistenten nicht schliessen. -->
      <div class="dialog-hinter"></div>
      <div class="dialog-kasten" role="dialog" aria-modal="true" aria-labelledby="faTitel">
        <header class="dialog-kopf">
          <h2 id="faTitel">Neue Fahrt aufnehmen</h2>
          <button class="knopf klein knopf-schliessen" type="button" data-tun="fa-abbrechen"
            aria-label="Fahrtaufnahme schließen">✕ Schließen</button>
        </header>
        <div class="dialog-rumpf">
          ${schrittleiste()}
          ${fehlerKasten()}
          ${inhalt}
        </div>
        <footer class="dialog-fuss">
          <button class="knopf still" type="button" data-tun="fa-abbrechen">Abbrechen</button>
          ${stand.schritt > 1 ? '<button class="knopf" type="button" data-tun="fa-zurueck">Zurück</button>' : ""}
          ${stand.ausPruefung && !letzter ? '<button class="knopf" type="button" data-tun="fa-zur-pruefung">Zurück zur Prüfung</button>' : ""}
          ${letzter
            ? '<button class="knopf haupt-knopf" type="button" data-tun="fa-speichern">Fahrt speichern</button>'
            : '<button class="knopf haupt-knopf" type="button" data-tun="fa-weiter">Weiter</button>'}
        </footer>
      </div>`;
  }

  /* Fokus nach jedem Schritt sinnvoll setzen. */
  function fokusSetzen() {
    const kasten = document.querySelector(".dialog-kasten");
    if (!kasten) return;
    const erstes = kasten.querySelector("[data-suchfeld], [data-weiter], .wahlkarte, .treffer, .knopf.haupt-knopf");
    if (erstes) erstes.focus();
  }

  /*
    Beim Neuzeichnen wird der Fensterinhalt ersetzt. Ohne Zutun landet
    der Fokus dann beim Seitenkoerper - die Tastaturbedienung waere
    unterbrochen und die Fokusfalle wirkungslos. Deshalb wird gemerkt,
    WAS gerade den Fokus hatte, und dasselbe Element danach wieder
    angesprungen. Ebenso die Blaetterstellung im Fenster.
  */
  function zeichnen(fokus) {
    const vorher = document.activeElement;
    const merkmal = vorher && vorher.dataset
      ? (vorher.dataset.tun ? `[data-tun="${vorher.dataset.tun}"]`
        : vorher.dataset.feld ? `[data-feld="${vorher.dataset.feld}"]` : "")
      : "";
    const rumpfVorher = document.querySelector(".dialog-rumpf");
    const stelle = rumpfVorher ? rumpfVorher.scrollTop : 0;

    R.dialogOeffnen(markup());

    if (fokus === false) {
      const kasten = document.querySelector(".dialog-kasten");
      const wieder = merkmal && kasten ? kasten.querySelector(merkmal) : null;
      if (wieder) wieder.focus();
      else fokusSetzen();
      const rumpf = document.querySelector(".dialog-rumpf");
      if (rumpf) rumpf.scrollTop = stelle;
      return;
    }
    fokusSetzen();
  }

  /* ============================================================
     Bedienung
     ============================================================ */
  function weiter() {
    werteLesen();
    const fehler = schrittFehler(stand.schritt);
    if (fehler) { stand.fehler = fehler; zeichnen(false); return false; }
    stand.fehler = "";
    stand.beruehrt = true;

    /* Beim Sprung von Schritt 1 auf 2: gespeicherte Adresse vorbelegen. */
    if (stand.schritt === 1) {
      if (stand.kundenModus === "neu") {
        const n = stand.neuerKunde;
        stand.abholung = `${n.strasse} ${n.hausnummer}, ${n.plz} ${n.ort}`.trim();
        stand.abholungEigen = true;
      } else {
        const k = aktuellerKunde();
        if (k && !stand.abholung) stand.abholung = D.standardadresse(k);
      }
    }
    stand.schritt = Math.min(6, stand.schritt + 1);
    if (stand.schritt === 6) stand.ausPruefung = false;
    /* Erst JETZT sichern - vorher stuende im Entwurf noch der alte
       Schritt, und das Fortsetzen landete einen Schritt zu frueh.
       Genau das hat der Prueflauf gefunden. */
    entwurfSichern();
    zeichnen();
    return true;
  }

  function zurueck() {
    werteLesen();
    stand.fehler = "";
    stand.schritt = Math.max(1, stand.schritt - 1);
    zeichnen();
  }

  function abbrechenVersuch() {
    werteLesen();
    if (!stand.beruehrt && !stand.suche && !stand.kundeId && !stand.gast) {
      entwurfLoeschen();
      R.dialogSchliessen(true);
      return;
    }
    stand.abbruchfrage = true;
    zeichnen();
  }

  function speichern() {
    werteLesen();
    const fehler = schrittFehler(5);
    if (fehler) { stand.schritt = 5; stand.fehler = fehler; zeichnen(false); return; }

    const k = aktuellerKunde();
    const n = stand.neuerKunde;
    const kundeName = k ? k.name
      : stand.gast ? "Gastfahrt"
      : n.art === "firma" ? n.firma
      : `${n.vorname} ${n.nachname}`.trim();

    const nummer = "FA-P" + String(Date.now()).slice(-4);
    D.fahrten.unshift({
      id: nummer,
      zustand: "ungeplant",
      zeit: stand.zeit,
      kunde: kundeName,
      von: stand.abholung,
      nach: stand.ziel,
      fahrerId: null,
      fahrzeugId: null,
      hinweis: stand.hinweis || "",
      nurProbe: true,
      rollstuhl: stand.rollstuhl,
      gepaeck: stand.gepaeck
    });

    entwurfLoeschen();
    /* Der Assistent ist fertig - ab jetzt darf das Erfolgsfenster ganz
       normal geschlossen werden. Ohne diese Zeile wuerde die
       Sicherheitsabfrage des Assistenten dort weiterwirken. */
    R.dialogSchutzSetzen(null);
    const gespeichert = { nummer, kundeName };
    stand = leererStand();

    R.dialogOeffnen(`
      <div class="dialog-hinter" data-dialog-zu></div>
      <div class="dialog-kasten" role="dialog" aria-modal="true" aria-label="Fahrt aufgenommen">
        <header class="dialog-kopf"><h2>Fahrt ${h(gespeichert.nummer)} aufgenommen</h2>
          <button class="knopf klein" type="button" data-dialog-zu>Schließen</button></header>
        <div class="dialog-rumpf">
          ${R.zustandsKasten("vorbereitet", "Nur in dieser Designprobe",
            `Die Fahrt für ${gespeichert.kundeName} steht jetzt in der Liste der ungeplanten Fahrten — aber nur in dieser Sitzung. Es wurde nichts zentral gespeichert und nichts übertragen. Nach dem Neuladen ist sie wieder weg.`)}
        </div>
        <footer class="dialog-fuss">
          <button class="knopf" type="button" data-dialog-zu>Schließen</button>
          <button class="knopf haupt-knopf" type="button" data-tun="fa-zur-liste">Zur Fahrtenliste</button>
        </footer>
      </div>`);
  }

  /* ---- Nur die Trefferliste neu zeichnen, damit der Fokus bleibt ---- */
  function trefferAktualisieren() {
    const bereich = document.querySelector("[data-trefferbereich]");
    if (!bereich) return;
    bereich.innerHTML = trefferbereich();
  }

  function kundeWaehlen(id) {
    stand.kundeId = id;
    stand.gast = false;
    stand.beruehrt = true;
    stand.fehler = "";
    const k = aktuellerKunde();
    if (k) { stand.abholung = D.standardadresse(k); stand.abholungEigen = false; }
    entwurfSichern();
    zeichnen();
  }

  /* ============================================================
     Aussenschnittstelle
     ============================================================ */
  function starten() {
    const entwurf = entwurfLesen();
    if (entwurf) {
      const alter = Math.round((Date.now() - entwurf.zeit) / 60000);
      R.dialogOeffnen(`
        <div class="dialog-hinter"></div>
        <div class="dialog-kasten" role="dialog" aria-modal="true" aria-label="Entwurf gefunden">
          <header class="dialog-kopf"><h2>Angefangene Fahrt gefunden</h2></header>
          <div class="dialog-rumpf">
            ${R.zustandsKasten("vorbereitet", "Es liegt ein Entwurf von diesem Gerät",
              `Vor ${alter < 1 ? "weniger als einer Minute" : alter + " Minuten"} wurde eine Fahrtaufnahme begonnen und nicht abgeschlossen. Der Entwurf liegt nur in diesem Browser und gehört zu dieser Anmeldung — andere Benutzer sehen ihn nicht.`)}
          </div>
          <footer class="dialog-fuss">
            <button class="knopf" type="button" data-tun="fa-entwurf-verwerfen">Neu beginnen</button>
            <button class="knopf haupt-knopf" type="button" data-tun="fa-entwurf-weiter">Entwurf fortsetzen</button>
          </footer>
        </div>`);
      return;
    }
    stand = leererStand();
    R.dialogSchutzSetzen(() => { abbrechenVersuch(); return false; });
    zeichnen();
  }

  function tun(name, wert) {
    switch (name) {
      case "fa-weiter":   weiter(); return true;
      case "fa-zurueck":  zurueck(); return true;
      case "fa-abbrechen": abbrechenVersuch(); return true;
      case "fa-weiterbearbeiten": stand.abbruchfrage = false; zeichnen(); return true;
      case "fa-verwerfen":
        entwurfLoeschen();
        stand = leererStand();
        R.dialogSchliessen(true);
        return true;
      case "fa-speichern": speichern(); return true;
      case "fa-zur-liste":
        R.dialogSchliessen(true);
        R.zustand.fahrtFilter = "ungeplant";
        R.geheZu("fahrten");
        return true;

      case "fa-kunde": kundeWaehlen(wert); return true;
      case "fa-kunde-loesen":
        stand.kundeId = ""; stand.gast = false; stand.suche = ""; stand.markiert = 0;
        zeichnen(); return true;
      case "fa-gast":
        stand.gast = true; stand.kundeId = ""; stand.beruehrt = true;
        stand.abholung = ""; stand.abholungEigen = true;
        zeichnen(); return true;
      case "fa-kundenmodus":
        werteLesen();
        stand.kundenModus = wert; stand.fehler = "";
        zeichnen(); return true;
      case "fa-neuart":
        werteLesen();
        stand.neuerKunde.art = wert; stand.beruehrt = true;
        zeichnen(); return true;

      case "fa-abholung-uebernehmen": {
        const k = aktuellerKunde();
        stand.abholung = k ? D.standardadresse(k) : stand.abholung;
        return weiter();
      }
      case "fa-abholung-eigen":
        stand.abholungEigen = true; stand.abholung = ""; zeichnen(); return true;
      case "fa-abholung-zurueck": {
        const k = aktuellerKunde();
        stand.abholungEigen = false;
        stand.abholung = k ? D.standardadresse(k) : "";
        zeichnen(); return true;
      }

      case "fa-ziel":
        werteLesen();
        stand.ziel = wert; stand.beruehrt = true; stand.fehler = "";
        zeichnen(); return true;
      case "fa-strecke-uebernehmen": {
        const k = aktuellerKunde();
        if (k && k.letzteFahrten.length) {
          stand.abholung = k.letzteFahrten[0].von;
          stand.ziel = k.letzteFahrten[0].nach;
          stand.beruehrt = true;
        }
        zeichnen(); return true;
      }

      case "fa-leistung":
        werteLesen(); stand.leistung = wert; stand.beruehrt = true; stand.fehler = "";
        zeichnen(false); return true;
      case "fa-rollstuhl":
        werteLesen(); stand.rollstuhl = wert; stand.beruehrt = true;
        zeichnen(false); return true;
      case "fa-gepaeck":
        werteLesen(); stand.gepaeck = wert; stand.beruehrt = true;
        zeichnen(false); return true;
      case "fa-schein":
        werteLesen(); stand.schein = wert; stand.fehler = ""; zeichnen(false); return true;
      case "fa-zuzahlung":
        werteLesen(); stand.zuzahlung = wert; stand.fehler = ""; zeichnen(false); return true;
      case "fa-genehmigung":
        werteLesen(); stand.genehmigung = wert; zeichnen(false); return true;

      case "fa-zu":
        werteLesen();
        stand.ausPruefung = stand.schritt === 6;
        stand.schritt = Number(wert); stand.fehler = "";
        zeichnen(); return true;
      case "fa-zur-pruefung": {
        werteLesen();
        const fehler = schrittFehler(stand.schritt);
        if (fehler) { stand.fehler = fehler; zeichnen(false); return true; }
        stand.fehler = ""; stand.ausPruefung = false; stand.schritt = 6;
        zeichnen(); return true;
      }

      case "fa-entwurf-weiter": {
        const entwurf = entwurfLesen();
        stand = { ...leererStand(), ...(entwurf ? entwurf.stand : {}), abbruchfrage: false, fehler: "", markiert: 0 };
        R.dialogSchutzSetzen(() => { abbrechenVersuch(); return false; });
        zeichnen(); return true;
      }
      case "fa-entwurf-verwerfen":
        entwurfLoeschen();
        stand = leererStand();
        R.dialogSchutzSetzen(() => { abbrechenVersuch(); return false; });
        zeichnen(); return true;

      default: return false;
    }
  }

  /* ---- Tastatur ---- */
  function taste(e) {
    const kasten = document.querySelector(".dialog-kasten");
    if (!kasten || !kasten.querySelector("#faTitel, #faAbbruch")) return false;
    const ziel = e.target;

    /* Im mehrzeiligen Feld bleibt die Eingabetaste ein Zeilenumbruch. */
    if (e.key === "Enter" && ziel && ziel.tagName === "TEXTAREA") return true;

    /* In der Trefferliste: Pfeile bewegen die Markierung. */
    if (ziel && ziel.matches("[data-suchfeld]") && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      const anzahl = kasten.querySelectorAll(".treffer").length;
      if (!anzahl) return true;
      stand.markiert = e.key === "ArrowDown"
        ? Math.min(anzahl - 1, stand.markiert + 1)
        : Math.max(0, stand.markiert - 1);
      trefferAktualisieren();
      return true;
    }

    if (e.key === "Enter") {
      /* Im Suchfeld waehlt die Eingabetaste den markierten Treffer -
         nie einen anderen und nie unbemerkt den ersten Besten. */
      if (ziel && ziel.matches("[data-suchfeld]")) {
        e.preventDefault();
        const treffer = kasten.querySelectorAll(".treffer");
        if (!treffer.length) return true;
        const gewaehlt = treffer[Math.min(stand.markiert, treffer.length - 1)];
        if (gewaehlt) gewaehlt.click();
        return true;
      }
      /* Auf dem letzten Schritt niemals unbemerkt absenden. */
      if (stand.schritt === 6) { e.preventDefault(); return true; }
      if (stand.abbruchfrage) { e.preventDefault(); return true; }
      /* Sonst: weiter - aber nur, wenn der Schritt gueltig ist. */
      if (ziel && (ziel.matches("input") || ziel.matches("select"))) {
        e.preventDefault();
        weiter();
        return true;
      }
    }
    return false;
  }

  function eingabe(feld) {
    if (!feld || !feld.matches("[data-suchfeld]")) return false;
    stand.suche = feld.value;
    stand.markiert = 0;
    trefferAktualisieren();
    return true;
  }

  window.ProbeFahrtassistent = { starten, tun, taste, eingabe };
})();
