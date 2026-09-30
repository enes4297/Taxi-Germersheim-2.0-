/* ============================================================
   Designprobe Betriebsportal - Fahrer & Fahrzeuge
   ============================================================
   Eigenes Modul, weil der Bereich zwei Haelften hat und aus dem
   Bereichsmodul herauswachsen wuerde.

   Grundsatz wie in der freigegebenen Planung: Es gibt einen Weg je
   Aufgabe, jede Zeile gehoert sichtbar zu einer Kennung, und nichts
   wird still uebernommen.

   Der Zustand ist DERSELBE wie in der Planung - beide arbeiten auf
   demselben Tagesentwurf. Eine Zuweisung hier steht sofort auch dort.

   Kein Netzzugriff, kein Upload, kein Versand.
   ============================================================ */
(() => {
  "use strict";

  const R = window.ProbeRahmen;
  const D = window.ProbeDaten;
  const h = R.h;

  /* Vom Bereichsmodul gereicht, damit es nur eine Wahrheit gibt. */
  let P = null;
  const anmelden = (planung) => { P = planung; };

  /* ---- Fähigkeiten ---- */
  const darfFahrerSehen   = () => R.darf("operations.read") || R.darf("personnel.read");
  const darfFahrzeugeSehen = () => R.darf("fleet.read");
  const darfZuweisen      = () => R.darf("operations.write");
  const darfFahrzeugPflegen = () => R.darf("fleet.write");
  const darfTelefon       = () => R.darf("operations.read") || R.darf("personnel.read");
  const darfLohn          = () => R.darf("payroll.read");
  const darfLohnPflegen   = () => R.darf("payroll.write");
  const darfPersonalakte  = () => R.darf("personnel.read");

  /* ---- Ansichtszustand ---- */
  const stand = {
    fahrerFilter: "alle",
    fahrerSuche: "",
    fahrzeugFilter: "alle",
    fahrzeugSuche: "",
    offenerFahrer: "",
    zuweisung: null,     // { fahrzeugId } oder { mitarbeiterId }
    lohnNeu: null,       // { mitarbeiterId, monat, jahr, datei, grund, fehler }
    sperre: null         // { fahrzeugId, ziel, grund, fehler }
  };

  /*
    Initialen. Bei den Testnamen besteht der zweite Teil aus Ziffern
    ("Testfahrer 01") - daraus "T0" zu machen waere sinnlos. Deshalb:
    Anfangsbuchstabe plus Nummer, sonst die Anfangsbuchstaben.
  */
  const initialen = (name) => {
    const teile = String(name || "").split(/\s+/).filter(Boolean);
    if (!teile.length) return "?";
    const erster = teile[0][0].toUpperCase();
    const letzter = teile[teile.length - 1];
    if (teile.length > 1 && /^\d+$/.test(letzter)) return erster + letzter;
    if (teile.length > 1) return erster + letzter[0].toUpperCase();
    return erster;
  };

  const mitarbeiterVon = (id) => D.mitarbeiter.find((m) => m.id === id) || null;
  const fahrzeugVon = (id) => D.fahrzeuge.find((f) => f.id === id) || null;

  /* ============================================================
     Abgeleitete Zustaende
     ============================================================ */

  /* Wer faehrt dieses Fahrzeug am gewaehlten Tag? */
  function fahrerZuFahrzeug(e, fahrzeugId) {
    const zeile = e.zeilen.find((z) => z.fahrzeugId === fahrzeugId && P.arbeitetAmTag(e, z));
    return zeile ? { zeile, mitarbeiter: mitarbeiterVon(zeile.mitarbeiterId) } : null;
  }

  /* Der angezeigte Fahrzeugzustand. Grundzustand zuerst - Werkstatt
     und Sperre werden nie durch eine Zuweisung ueberdeckt. */
  function fahrzeugLage(e, f) {
    if (f.zustand === "gesperrt") return "gesperrt";
    if (f.zustand === "werkstatt") return "werkstatt";
    const belegt = fahrerZuFahrzeug(e, f.id);
    if (!belegt) return "verfuegbar";
    const unterwegs = D.fahrten.some(
      (x) => x.fahrzeugId === f.id && x.zustand === "unterwegs");
    return unterwegs ? "unterwegs" : "zugewiesen";
  }

  const LAGE_MARKE = {
    verfuegbar: ["gut", "Frei"],
    zugewiesen: ["aktiv", "Zugewiesen"],
    unterwegs:  ["aktiv", "Unterwegs"],
    werkstatt:  ["warnung", "Werkstatt"],
    gesperrt:   ["warnung", "Gesperrt"]
  };

  function terminLage(iso) {
    const heuteIso = D.alsIso(D.heute);
    const grenze = D.alsIso(D.tagAls(30));
    if (!iso) return { lage: "unbekannt", text: "nicht hinterlegt" };
    const datum = new Date(iso + "T00:00:00").toLocaleDateString("de-DE",
      { day: "2-digit", month: "2-digit", year: "numeric" });
    if (iso < heuteIso) return { lage: "abgelaufen", text: `abgelaufen am ${datum}` };
    if (iso <= grenze) return { lage: "laeuft-ab", text: `läuft ab am ${datum}` };
    return { lage: "gueltig", text: datum };
  }

  /* ============================================================
     Fahrerbereich
     ============================================================ */
  const FAHRER_FILTER = [
    { id: "alle",    name: "Alle" },
    { id: "dienst",  name: "Im Dienst" },
    { id: "frei",    name: "Frei" },
    { id: "urlaub",  name: "Urlaub" },
    { id: "krank",   name: "Krank" },
    { id: "dokument", name: "Dokument fehlt" }
  ];

  function fahrerkarte(e, z) {
    const m = mitarbeiterVon(z.mitarbeiterId);
    const name = m ? m.name : z.mitarbeiterId;
    const status = P.tagesstatus(e, z);
    const fz = z.fahrzeugId ? fahrzeugVon(z.fahrzeugId) : null;
    const dok = D.dokumentstand(z.mitarbeiterId);
    const aend = D.letzteAenderung(name);
    const arbeitet = status === "dienst";

    const statusMarke = {
      dienst: ["gut", "Im Dienst"],
      frei:   ["ruhig", "Frei"],
      krank:  ["warnung", "Krank"],
      urlaub: ["aktiv", "Urlaub"]
    }[status];

    return `<button class="fahrerkarte" type="button"
        data-tun="team-fahrer:${h(z.mitarbeiterId)}" data-mitarbeiter="${h(z.mitarbeiterId)}"
        data-status="${h(status)}">
      <span class="fk-kopf">
        <span class="fk-initialen" aria-hidden="true">${h(initialen(name))}</span>
        <span class="fk-name">
          <strong>${h(name)}</strong>
          <span>${h(m ? m.beschaeftigung : "unbekannte Kennung")}</span>
        </span>
        ${R.marke(statusMarke[0], statusMarke[1])}
      </span>
      <span class="fk-zeilen">
        <span><span class="fk-titel">Schicht</span>${arbeitet && z.von ? `${h(z.von)}–${h(z.bis)}` : "—"}</span>
        <span><span class="fk-titel">Fahrzeug</span>${fz ? `${h(fz.name)} · ${h(fz.kennzeichen)}` : "—"}</span>
        ${darfTelefon() ? `<span><span class="fk-titel">Telefon</span>${h(m ? m.telefon : "—")}</span>` : ""}
      </span>
      ${dok.warnung ? `<span class="fk-warnung ${dok.warnung.lage === "gueltig" ? "" : "ist-warnung"}">
        ${h(dok.warnung.art)}: ${h(D.DOKUMENT_LAGE[dok.warnung.lage])}</span>` : ""}
      ${aend ? `<span class="fk-protokoll">Zuletzt: ${h(aend.was)} · ${h(aend.wer)} · ${h(aend.zeit)}</span>` : ""}
    </button>`;
  }

  function fahrerbereich(e) {
    let liste = e.zeilen.slice();
    const f = stand.fahrerFilter;
    if (["dienst", "frei", "krank", "urlaub"].includes(f)) {
      liste = liste.filter((z) => P.tagesstatus(e, z) === f);
    }
    if (f === "dokument") {
      liste = liste.filter((z) => {
        const w = D.dokumentstand(z.mitarbeiterId).warnung;
        return w && w.lage !== "gueltig";
      });
    }
    if (stand.fahrerSuche) {
      const s = stand.fahrerSuche.toLowerCase();
      liste = liste.filter((z) => {
        const m = mitarbeiterVon(z.mitarbeiterId);
        return (m ? m.name : z.mitarbeiterId).toLowerCase().includes(s);
      });
    }

    const zaehler = (id) => {
      if (id === "alle") return e.zeilen.length;
      if (id === "dokument") {
        return e.zeilen.filter((z) => {
          const w = D.dokumentstand(z.mitarbeiterId).warnung;
          return w && w.lage !== "gueltig";
        }).length;
      }
      return e.zeilen.filter((z) => P.tagesstatus(e, z) === id).length;
    };

    const inhalt = liste.length
      ? `<div class="fahrerraster">${liste.map((z) => fahrerkarte(e, z)).join("")}</div>`
      : R.zustandsKasten("leer", "Kein Fahrer in dieser Ansicht",
          stand.fahrerSuche
            ? `Zu „${stand.fahrerSuche}“ passt niemand.`
            : "Für diesen Filter trifft an diesem Tag niemand zu. Das ist kein Fehler — es ist der Stand.",
          { name: "Alle Fahrer anzeigen", tun: "team-fahrer-filter:alle" });

    return `<div class="flaeche">
      <h2>Fahrer <span class="offen">${h(e.zeilen.length)} Mitarbeiter</span></h2>
      <div class="filterzeile" role="group" aria-label="Fahrer filtern">
        ${FAHRER_FILTER.map((x) => `<button class="filterchip" type="button"
          data-tun="team-fahrer-filter:${h(x.id)}" aria-pressed="${f === x.id}">
          ${h(x.name)} (${h(zaehler(x.id))})</button>`).join("")}
      </div>
      <label style="max-width:360px">Suche nach Name
        <input type="search" data-team-fahrersuche value="${h(stand.fahrerSuche)}"
          placeholder="Testfahrer …"></label>
      <div style="margin-top:14px">${inhalt}</div>
    </div>`;
  }

  /* ============================================================
     Fahrzeugbereich
     ============================================================ */
  const FAHRZEUG_FILTER = [
    { id: "alle",       name: "Alle" },
    { id: "verfuegbar", name: "Frei" },
    { id: "zugewiesen", name: "Zugewiesen" },
    { id: "unterwegs",  name: "Unterwegs" },
    { id: "werkstatt",  name: "Werkstatt" },
    { id: "gesperrt",   name: "Gesperrt" }
  ];

  function fahrzeugkarte(e, f) {
    const lage = fahrzeugLage(e, f);
    const marke = LAGE_MARKE[lage];
    const belegt = fahrerZuFahrzeug(e, f.id);
    const fahrt = D.fahrten.find((x) => x.fahrzeugId === f.id && x.zustand === "unterwegs");
    const termine = [
      ["TÜV", terminLage(f.tuev)],
      ["Versicherung", terminLage(f.versicherung)],
      ["Nächster Service", terminLage(f.service)]
    ];
    const warnungen = termine.filter(([, t]) => t.lage === "abgelaufen" || t.lage === "laeuft-ab");

    return `<article class="fahrzeugkarte" data-fahrzeug="${h(f.id)}" data-lage="${h(lage)}">
      <header class="fz-kopf">
        <div>
          <strong>${h(f.name)}</strong>
          <span class="fz-kennzeichen">${h(f.kennzeichen)}</span>
        </div>
        ${R.marke(marke[0], marke[1])}
      </header>
      <dl class="fz-daten">
        <div><dt>Art</dt><dd>${h(f.art)}</dd></div>
        <div><dt>Sitzplätze</dt><dd>${h(f.plaetze)}</dd></div>
        <div><dt>Rollstuhl</dt><dd>${f.rollstuhl ? "geeignet" : "nicht geeignet"}</dd></div>
        <div><dt>Kilometerstand</dt><dd>${h(f.km.toLocaleString("de-DE"))} km</dd></div>
        <div><dt>Aktueller Fahrer</dt><dd>${belegt && belegt.mitarbeiter ? h(belegt.mitarbeiter.name) : "—"}</dd></div>
        <div><dt>Heutiger Einsatz</dt><dd>${fahrt ? `${h(fahrt.id)} · ${h(fahrt.nach)}` : (belegt ? `${h(belegt.zeile.von)}–${h(belegt.zeile.bis)}` : "—")}</dd></div>
      </dl>
      <div class="fz-termine">
        ${termine.map(([name, t]) => `<span class="fz-termin ist-${h(t.lage)}">
          <span class="fk-titel">${h(name)}</span>${h(t.text)}</span>`).join("")}
      </div>
      ${f.zustand === "gesperrt" ? `<p class="fz-sperrgrund">
        <strong>Gesperrt:</strong> ${h(f.sperrgrund || "ohne Angabe")}</p>` : ""}
      ${warnungen.length ? `<p class="fz-sperrgrund ist-termin">
        <strong>Achtung:</strong> ${warnungen.map(([n, t]) => `${h(n)} ${h(t.text)}`).join(" · ")}</p>` : ""}
      <div class="fz-aktionen">
        ${darfZuweisen() ? (belegt
          ? `<button class="knopf klein" type="button" data-tun="team-loesen:${h(f.id)}">Zuweisung lösen</button>`
          : `<button class="knopf klein" type="button" data-tun="team-zuweisen:${h(f.id)}">Fahrer zuweisen</button>`) : ""}
        ${darfFahrzeugPflegen() ? `
          ${f.zustand !== "verfuegbar"
            ? `<button class="knopf klein" type="button" data-tun="team-zustand:${h(f.id)}|verfuegbar">Als frei markieren</button>`
            : ""}
          ${f.zustand !== "werkstatt"
            ? `<button class="knopf klein" type="button" data-tun="team-zustand:${h(f.id)}|werkstatt">Werkstatt</button>`
            : ""}
          ${f.zustand !== "gesperrt"
            ? `<button class="knopf klein" type="button" data-tun="team-zustand:${h(f.id)}|gesperrt">Sperren</button>`
            : ""}
          <button class="knopf klein" type="button" data-tun="team-stammdaten:${h(f.id)}">Stammdaten</button>`
          : `<span class="fz-hinweis">Zustand und Stammdaten ändert die Administration.</span>`}
      </div>
    </article>`;
  }

  function fahrzeugbereich(e) {
    let liste = D.fahrzeuge.slice();
    if (stand.fahrzeugFilter !== "alle") {
      liste = liste.filter((f) => fahrzeugLage(e, f) === stand.fahrzeugFilter);
    }
    if (stand.fahrzeugSuche) {
      const s = stand.fahrzeugSuche.toLowerCase();
      liste = liste.filter((f) =>
        f.name.toLowerCase().includes(s) || f.kennzeichen.toLowerCase().includes(s));
    }
    const zaehler = (id) => id === "alle"
      ? D.fahrzeuge.length
      : D.fahrzeuge.filter((f) => fahrzeugLage(e, f) === id).length;

    const inhalt = liste.length
      ? `<div class="fahrzeugraster">${liste.map((f) => fahrzeugkarte(e, f)).join("")}</div>`
      : R.zustandsKasten("leer", "Kein Fahrzeug in dieser Ansicht",
          stand.fahrzeugSuche
            ? `Zu „${stand.fahrzeugSuche}“ passt kein Fahrzeug.`
            : "Für diesen Filter trifft gerade kein Fahrzeug zu.",
          { name: "Alle Fahrzeuge anzeigen", tun: "team-fahrzeug-filter:alle" });

    return `<div class="flaeche">
      <h2>Fahrzeuge <span class="offen">${h(D.fahrzeuge.length)} im Bestand</span></h2>
      <div class="filterzeile" role="group" aria-label="Fahrzeuge filtern">
        ${FAHRZEUG_FILTER.map((x) => `<button class="filterchip" type="button"
          data-tun="team-fahrzeug-filter:${h(x.id)}" aria-pressed="${stand.fahrzeugFilter === x.id}">
          ${h(x.name)} (${h(zaehler(x.id))})</button>`).join("")}
      </div>
      <label style="max-width:360px">Suche nach Name oder Kennzeichen
        <input type="search" data-team-fahrzeugsuche value="${h(stand.fahrzeugSuche)}"
          placeholder="Testwagen oder GER-TEST …"></label>
      <div style="margin-top:14px">${inhalt}</div>
    </div>
    <div class="flaeche">
      <h2>PAJ GPS</h2>
      ${R.zustandsKasten("vorbereitet", "PAJ GPS — nicht angebunden",
        "Es besteht keine Verbindung zu PAJ. Es werden keine Positionen angezeigt und keine erfunden. Nötig sind: offizielle API, serverseitige Zugangsdaten, Zuordnung Gerät zu Fahrzeug sowie eine Rollen- und Datenschutzprüfung.")}
    </div>`;
  }

  /* ============================================================
     Der ganze Bereich
     ============================================================ */
  function zeichne() {
    const e = P.planEntwurf();
    const tag = D.tagAls(R.zustand.planTag);
    const kopf = `
      <div class="bereichskopf">
        <div>
          <h1>Fahrer &amp; Fahrzeuge</h1>
          <p class="wichtig">Stand für ${h(D.alsText(tag))} — derselbe Tagesplan wie in der Planung.
            Eine Zuweisung hier steht dort sofort genauso.</p>
        </div>
      </div>
      <div class="flaeche">
        <div class="tagleiste">
          <div class="tagumschalter" role="group" aria-label="Tag wählen">
            <button type="button" data-tun="plan-tag:0" aria-pressed="${R.zustand.planTag === 0}">Heute</button>
            <button type="button" data-tun="plan-tag:1" aria-pressed="${R.zustand.planTag === 1}">Morgen</button>
          </div>
          <span class="tagdatum">${h(D.alsText(tag))}</span>
        </div>
      </div>`;

    if (!darfFahrerSehen() && !darfFahrzeugeSehen()) {
      return kopf + R.kastenKeinRecht("Fahrer und Fahrzeuge");
    }

    let inhalt = "";
    if (darfFahrerSehen()) inhalt += fahrerbereich(e);
    if (darfFahrzeugeSehen()) inhalt += fahrzeugbereich(e);
    else if (darfFahrerSehen()) {
      inhalt += `<div class="flaeche"><h2>Fahrzeuge</h2>
        ${R.kastenKeinRecht("die Fahrzeugverwaltung")}</div>`;
    }
    return kopf + inhalt;
  }

  /* ============================================================
     Fahrer-Detailansicht
     ============================================================ */
  function fahrerDialog() {
    const e = P.planEntwurf();
    const id = stand.offenerFahrer;
    const m = mitarbeiterVon(id);
    const z = e.zeilen.find((x) => x.mitarbeiterId === id);
    if (!m || !z) return "";

    const status = P.tagesstatus(e, z);
    const abw = D.abwesenheitFuer(id, e.iso);
    const dok = D.dokumentstand(id);
    const fz = z.fahrzeugId ? fahrzeugVon(z.fahrzeugId) : null;
    const morgen = D.planung[D.alsIso(D.tagAls(1))];
    const morgenZeile = morgen ? morgen.zeilen.find((x) => x.mitarbeiterId === id) : null;

    /*
      Ohne payroll.read erscheint der Abschnitt GAR NICHT - nicht
      einmal als gesperrte Ueberschrift. Das haelt die Akte fuer die
      Disposition einfach. Die Sperre haengt trotzdem an der
      Faehigkeit und nicht an der Sichtbarkeit: lohnAbschnitt() wird
      ohne sie nie aufgerufen, und "team-lohn-neu" prueft sie noch
      einmal eigens.
    */
    const lohnBereich = darfLohn() ? lohnAbschnitt(id) : "";

    return `
      <div class="dialog-hinter" data-dialog-zu></div>
      <div class="dialog-kasten" role="dialog" aria-modal="true" aria-labelledby="fahrerTitel">
        <header class="dialog-kopf">
          <span class="fk-initialen" aria-hidden="true">${h(initialen(m.name))}</span>
          <h2 id="fahrerTitel">${h(m.name)}</h2>
          <button class="knopf klein" type="button" data-dialog-zu aria-label="Schließen">✕ Schließen</button>
        </header>
        <div class="dialog-rumpf">
          <div class="dialog-schritt">
            <h3>Heute</h3>
            <dl class="zusammenfassung">
              <div><dt>Status</dt><dd>${h(P.STATUSNAMEN[status])}</dd></div>
              <div><dt>Schicht</dt><dd>${status === "dienst" && z.von ? `${h(z.von)}–${h(z.bis)}` : "—"}</dd></div>
              <div><dt>Fahrzeug</dt><dd>${fz ? `${h(fz.name)} · ${h(fz.kennzeichen)}` : "—"}</dd></div>
              ${morgenZeile ? `<div><dt>Morgen</dt><dd>${morgenZeile.imDienst && morgenZeile.von ? `${h(morgenZeile.von)}–${h(morgenZeile.bis)}` : "keine Schicht"}</dd></div>` : ""}
            </dl>
          </div>

          <div class="dialog-schritt">
            <h3>Kontakt und Beschäftigung</h3>
            <dl class="zusammenfassung">
              ${darfTelefon() ? `<div><dt>Telefon</dt><dd>${h(m.telefon)}</dd></div>` : ""}
              <div><dt>Beschäftigung</dt><dd>${h(m.beschaeftigung)}</dd></div>
              <div><dt>Kennung</dt><dd>${h(m.id)}</dd></div>
            </dl>
            ${darfTelefon() ? "" : `<p class="schritt-hinweis">Kontaktdaten sind Ihrer Rolle nicht zugänglich.</p>`}
          </div>

          <div class="dialog-schritt">
            <h3>Fahrerdokumente</h3>
            <ul class="konfliktliste">
              ${dok.eintraege.map((x) => `<li class="${x.lage === "gueltig" ? "" : "ist-ausnahme"}">
                <strong>${h(x.art)}</strong>
                <span>${h(D.DOKUMENT_LAGE[x.lage])}${x.bis ? ` · ${h(new Date(x.bis + "T00:00:00").toLocaleDateString("de-DE"))}` : ""}</span>
              </li>`).join("")}
            </ul>
          </div>

          <div class="dialog-schritt">
            <h3>Urlaub und Krankheit</h3>
            ${abw.alle.length
              ? `<ul class="konfliktliste">${abw.alle.map((a) => `<li>
                  <strong>${h(D.ABWESENHEIT_NAMEN[a.art])}${a.art === "urlaub" ? ` · ${h(a.status)}` : ""}</strong>
                  <span>${h(D.zeitraumText(a))}</span>
                </li>`).join("")}</ul>
                <p class="schritt-hinweis">Es werden ausschließlich Zeitraum und Art geführt —
                  kein Krankheitsgrund und keine ärztliche Angabe.</p>`
              : `<p class="schritt-hinweis">Für diesen Tag ist keine Abwesenheit eingetragen.</p>`}
          </div>

          ${lohnBereich}

          ${darfPersonalakte() ? "" : `<div class="dialog-schritt">
            <h3>Personalakte</h3>
            ${R.kastenKeinRecht("private Personalunterlagen, Bankdaten und Gehalt")}
          </div>`}
        </div>
        <footer class="dialog-fuss">
          ${darfZuweisen() && status === "dienst"
            ? `<button class="knopf" type="button" data-tun="team-fahrzeug-fuer:${h(id)}">Fahrzeug zuweisen</button>`
            : ""}
          <button class="knopf haupt-knopf" type="button" data-dialog-zu>Schließen</button>
        </footer>
      </div>`;
  }

  /* ---- Lohnabrechnungen ---- */
  function lohnAbschnitt(mitarbeiterId) {
    const eigene = D.lohnProbe.filter((l) => l.mitarbeiterId === mitarbeiterId);
    return `<div class="dialog-schritt geschuetzt">
      <h3>Lohnabrechnungen <span class="band-gold">nur Administration und Personal</span></h3>
      ${eigene.length
        ? `<ul class="konfliktliste">${eigene.map((l) => `<li${l.version > 1 ? ' class="ist-ausnahme"' : ""}>
            <strong>${h(l.monat)}/${h(l.jahr)}${l.version > 1 ? ` · Version ${h(l.version)}` : ""}</strong>
            <span>${h(l.datei)} · hochgeladen von ${h(l.von)} am ${h(l.am)}${l.grund ? ` · Grund: ${h(l.grund)}` : ""}</span>
          </li>`).join("")}</ul>`
        : `<p class="schritt-hinweis">Für diesen Mitarbeiter liegt noch keine Abrechnung vor.</p>`}
      ${darfLohnPflegen()
        ? `<button class="knopf klein" type="button" data-tun="team-lohn-neu:${h(mitarbeiterId)}"
             style="margin-top:10px">Abrechnung bereitstellen</button>`
        : `<p class="schritt-hinweis">Ihre Rolle darf Abrechnungen ansehen, aber nicht bereitstellen.</p>`}
      <p class="schritt-hinweis">Die Datei liegt später in einem privaten Bereich mit kurz
        gültiger, signierter Adresse. Der Mitarbeiter bekommt nur einen Hinweis, dass eine
        neue Abrechnung bereitliegt — nie die Datei als E-Mail- oder Nachrichtenanhang.
        <strong>In dieser Designprobe wird nichts hochgeladen.</strong></p>
    </div>`;
  }

  /*
    Zwei Stufen, wie bei jeder begruendungspflichtigen Aenderung. Die
    Pruefung zeigt alles, was in den Vorgang eingeht - Mitarbeiter,
    Monat, Jahr, Dateiname, neue und vorherige Version, wer und wann,
    und den Grund. Betraege oder Inhalte der Datei kommen dort NICHT
    vor; sie gehoeren nicht ins allgemeine Pruefprotokoll.
  */
  function lohnAngaben(s) {
    const m = mitarbeiterVon(s.mitarbeiterId);
    const vorhanden = D.lohnProbe.find((l) =>
      l.mitarbeiterId === s.mitarbeiterId && l.monat === s.monat && l.jahr === s.jahr);
    const neueVersion = vorhanden ? vorhanden.version + 1 : 1;
    const bezeichnung = s.monat
      ? `Testdatei-${s.mitarbeiterId}-${s.monat}-${s.jahr}${vorhanden ? `-v${neueVersion}` : ""}.pdf`
      : "—";
    return { m, vorhanden, neueVersion, bezeichnung };
  }

  function lohnVorschau(s) {
    const { m, vorhanden, neueVersion, bezeichnung } = lohnAngaben(s);
    const jetzt = new Date().toLocaleString("de-DE",
      { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    return `<dl class="zusammenfassung">
      <div><dt>Mitarbeiter</dt><dd>${h(m ? m.name : s.mitarbeiterId)}</dd></div>
      <div><dt>Abrechnungsmonat</dt><dd>${h(s.monat || "— nicht gewählt")}</dd></div>
      <div><dt>Abrechnungsjahr</dt><dd>${h(s.jahr)}</dd></div>
      <div><dt>Dateiname</dt><dd>${h(bezeichnung)}</dd></div>
      <div><dt>Neue Version</dt><dd>${h(neueVersion)}</dd></div>
      <div><dt>Vorherige Version</dt><dd>${vorhanden ? h(vorhanden.version) : "keine"}</dd></div>
      <div><dt>Bereitgestellt von</dt><dd>${h(R.ROLLENNAMEN[R.zustand.rolle])}</dd></div>
      <div><dt>Datum und Uhrzeit</dt><dd>${h(jetzt)} Uhr</dd></div>
      ${vorhanden ? `<div><dt>Grund</dt><dd>${h(s.grund || "— noch nicht eingetragen")}</dd></div>` : ""}
      <div><dt>Sichtbar für</dt><dd>nur ${h(m ? m.name : "den Mitarbeiter")}</dd></div>
    </dl>
    ${vorhanden ? `<p class="schritt-hinweis"><strong>Die vorhandene Version bleibt erhalten.</strong>
      Version ${h(vorhanden.version)} vom ${h(vorhanden.am)} wird nicht überschrieben.</p>` : ""}`;
  }

  function lohnDialog() {
    const s = stand.lohnNeu;
    const { m, vorhanden, neueVersion } = lohnAngaben(s);
    const brauchtGrund = Boolean(vorhanden);
    const pruefung = s.stufe === "pruefung";

    if (pruefung) {
      return `
        <div class="dialog-hinter" data-dialog-zu></div>
        <div class="dialog-kasten" role="dialog" aria-modal="true" aria-labelledby="lohnNeuTitel">
          <header class="dialog-kopf">
            <h2 id="lohnNeuTitel">Letzte Prüfung</h2>
            <button class="knopf klein" type="button" data-dialog-zu aria-label="Schließen">✕ Schließen</button>
          </header>
          <div class="dialog-rumpf">
            ${R.zustandsKasten("keinrecht", "Noch ist nichts bereitgestellt",
              "Prüfen Sie die Angaben. Erst „Verbindlich speichern“ schließt den Vorgang ab und erzeugt den Protokolleintrag.")}
            ${lohnVorschau(s)}
            <p class="schritt-hinweis">Weder Beträge noch Inhalte der Datei gehen in das
              Prüfprotokoll ein. <strong>In dieser Designprobe wird nichts hochgeladen.</strong></p>
          </div>
          <footer class="dialog-fuss">
            <button class="knopf haupt-knopf" type="button" data-tun="team-lohn-zurueck">Zurück und ändern</button>
            <button class="knopf leise" type="button" data-tun="team-lohn-fertig">Verbindlich speichern</button>
          </footer>
        </div>`;
    }

    return `
      <div class="dialog-hinter" data-dialog-zu></div>
      <div class="dialog-kasten" role="dialog" aria-modal="true" aria-labelledby="lohnNeuTitel">
        <header class="dialog-kopf">
          <h2 id="lohnNeuTitel">Lohnabrechnung bereitstellen</h2>
          <button class="knopf klein" type="button" data-dialog-zu aria-label="Schließen">✕ Schließen</button>
        </header>
        <div class="dialog-rumpf">
          ${s.fehler ? `<div class="feldfehler" role="alert">${h(s.fehler)}</div>` : ""}
          <div class="dialog-schritt">
            <h3>1. Für wen?</h3>
            <div class="gewaehlt-kasten">
              <div><strong>${h(m ? m.name : s.mitarbeiterId)}</strong>
                <span>Kennung ${h(s.mitarbeiterId)}</span></div>
            </div>
          </div>
          <div class="dialog-schritt">
            <h3>2. Welcher Zeitraum?</h3>
            <div class="feldpaar">
              <label>Monat<select data-lohn-neu="monat">
                <option value="">— wählen —</option>
                ${["01","02","03","04","05","06","07","08","09","10","11","12"]
                  .map((mo) => `<option value="${mo}" ${s.monat === mo ? "selected" : ""}>${mo}</option>`).join("")}
              </select></label>
              <label>Jahr<select data-lohn-neu="jahr">
                <option value="2026" ${s.jahr === "2026" ? "selected" : ""}>2026</option>
                <option value="2025" ${s.jahr === "2025" ? "selected" : ""}>2025</option>
              </select></label>
            </div>
          </div>
          <div class="dialog-schritt">
            <h3>3. Welche Datei?</h3>
            <div class="wahlraster">
              <button class="wahlkarte" type="button" data-tun="team-lohn-datei:Testdatei-A.pdf"
                aria-pressed="${s.datei === "Testdatei-A.pdf"}">
                <strong>Testdatei-A.pdf</strong><span>142 kB · PDF</span></button>
              <button class="wahlkarte" type="button" data-tun="team-lohn-datei:Testdatei-B.pdf"
                aria-pressed="${s.datei === "Testdatei-B.pdf"}">
                <strong>Testdatei-B.pdf</strong><span>138 kB · PDF</span></button>
            </div>
            <p class="schritt-hinweis">In der Probe wird keine echte Datei gewählt und nichts hochgeladen.</p>
          </div>
          ${brauchtGrund ? `
            <div class="dialog-schritt">
              <h3>4. Es gibt schon eine Abrechnung für ${h(s.monat)}/${h(s.jahr)}</h3>
              ${R.zustandsKasten("keinrecht", "Die vorhandene Version bleibt erhalten",
                `Vorhanden ist Version ${vorhanden.version} vom ${vorhanden.am}. Es entsteht Version ${neueVersion}; die alte wird nicht überschrieben.`)}
              <label>Grund für die neue Version <span class="band-warnung">Pflichtfeld</span>
                <textarea data-lohn-grund rows="2"
                  placeholder="Zum Beispiel: Korrektur der Stundenzahl.">${h(s.grund)}</textarea></label>
            </div>` : ""}
          <div class="dialog-schritt">
            <h3>${brauchtGrund ? "5" : "4"}. Was bereitgestellt wird</h3>
            ${lohnVorschau(s)}
          </div>
        </div>
        <footer class="dialog-fuss">
          <button class="knopf" type="button" data-tun="team-lohn-ab">Abbrechen</button>
          <button class="knopf haupt-knopf" type="button" data-tun="team-lohn-pruefen">Änderung prüfen</button>
        </footer>
      </div>`;
  }

  /* ============================================================
     Zuweisung
     ============================================================ */
  function zuweisungDialog() {
    const e = P.planEntwurf();
    const s = stand.zuweisung;
    const fahrzeug = s.fahrzeugId ? fahrzeugVon(s.fahrzeugId) : null;

    /* Vom Fahrzeug aus: welche Fahrer kommen in Frage? */
    if (fahrzeug) {
      const kandidaten = e.zeilen.filter((z) => P.arbeitetAmTag(e, z));
      return `
        <div class="dialog-hinter" data-dialog-zu></div>
        <div class="dialog-kasten" role="dialog" aria-modal="true" aria-labelledby="zuwTitel">
          <header class="dialog-kopf">
            <h2 id="zuwTitel">Fahrer für ${h(fahrzeug.name)} wählen</h2>
            <button class="knopf klein" type="button" data-dialog-zu aria-label="Schließen">✕ Schließen</button>
          </header>
          <div class="dialog-rumpf">
            ${s.fehler ? `<div class="feldfehler" role="alert">${h(s.fehler)}</div>` : ""}
            <div class="vorschlag-kasten">
              <span class="vorschlag-band">Fahrzeug</span>
              <strong>${h(fahrzeug.name)} · ${h(fahrzeug.kennzeichen)}</strong>
              <span>${h(fahrzeug.art)} · ${h(fahrzeug.plaetze)} Plätze ·
                ${fahrzeug.rollstuhl ? "rollstuhlgeeignet" : "nicht rollstuhlgeeignet"}</span>
            </div>
            <div class="dialog-schritt">
              <h3>Wer fährt es?</h3>
              ${kandidaten.length
                ? `<div class="wahlraster">${kandidaten.map((z) => {
                    const m = mitarbeiterVon(z.mitarbeiterId);
                    const schon = z.fahrzeugId ? fahrzeugVon(z.fahrzeugId) : null;
                    return `<button class="wahlkarte" type="button"
                      data-tun="team-zuweisen-an:${h(fahrzeug.id)}|${h(z.mitarbeiterId)}"
                      aria-pressed="${z.fahrzeugId === fahrzeug.id}">
                      <strong>${h(m ? m.name : z.mitarbeiterId)}</strong>
                      <span>${h(z.von)}–${h(z.bis)}${schon ? ` · fährt bisher ${h(schon.kennzeichen)}` : " · noch ohne Fahrzeug"}</span>
                    </button>`;
                  }).join("")}</div>`
                : R.zustandsKasten("leer", "Niemand im Dienst",
                    "An diesem Tag ist kein Fahrer im Dienst, dem sich ein Fahrzeug zuweisen ließe.")}
            </div>
          </div>
          <footer class="dialog-fuss">
            <button class="knopf haupt-knopf" type="button" data-dialog-zu>Abbrechen</button>
          </footer>
        </div>`;
    }

    /* Vom Fahrer aus: welche Fahrzeuge kommen in Frage? */
    const z = e.zeilen.find((x) => x.mitarbeiterId === s.mitarbeiterId);
    const m = mitarbeiterVon(s.mitarbeiterId);
    const bereit = D.fahrzeuge.filter((f) => D.istEinsatzbereit(f));
    const gesperrt = D.fahrzeuge.filter((f) => !D.istEinsatzbereit(f));

    return `
      <div class="dialog-hinter" data-dialog-zu></div>
      <div class="dialog-kasten" role="dialog" aria-modal="true" aria-labelledby="zuwTitel">
        <header class="dialog-kopf">
          <h2 id="zuwTitel">Fahrzeug für ${h(m ? m.name : s.mitarbeiterId)} wählen</h2>
          <button class="knopf klein" type="button" data-dialog-zu aria-label="Schließen">✕ Schließen</button>
        </header>
        <div class="dialog-rumpf">
          ${s.fehler ? `<div class="feldfehler" role="alert">${h(s.fehler)}</div>` : ""}
          <div class="dialog-schritt">
            <h3>Einsatzbereite Fahrzeuge</h3>
            <div class="wahlraster">
              ${bereit.map((f) => {
                const belegt = fahrerZuFahrzeug(e, f.id);
                const fremd = belegt && belegt.zeile.mitarbeiterId !== s.mitarbeiterId;
                return `<button class="wahlkarte" type="button"
                  data-tun="team-zuweisen-an:${h(f.id)}|${h(s.mitarbeiterId)}"
                  aria-pressed="${z && z.fahrzeugId === f.id}">
                  <strong>${h(f.name)} · ${h(f.kennzeichen)}</strong>
                  <span>${h(f.art)} · ${h(f.plaetze)} Plätze${f.rollstuhl ? " · rollstuhlgeeignet" : ""}${fremd ? ` · belegt durch ${h(belegt.mitarbeiter.name)}` : ""}</span>
                </button>`;
              }).join("")}
              <button class="wahlkarte" type="button"
                data-tun="team-zuweisen-an:|${h(s.mitarbeiterId)}"
                aria-pressed="${z && !z.fahrzeugId}">
                <strong>Kein Fahrzeug</strong><span>wird später zugewiesen</span></button>
            </div>
          </div>
          ${gesperrt.length ? `
            <div class="dialog-schritt">
              <h3>Nicht einsatzbereit</h3>
              <ul class="konfliktliste betrieblich">
                ${gesperrt.map((f) => `<li>
                  <strong>${h(f.name)} · ${h(f.kennzeichen)}</strong>
                  <span>${h(D.FAHRZEUG_ZUSTAENDE[f.zustand])}${f.sperrgrund ? ` — ${h(f.sperrgrund)}` : ""}. Diese Fahrzeuge stehen hier bewusst nicht zur Auswahl.</span>
                </li>`).join("")}
              </ul>
            </div>` : ""}
        </div>
        <footer class="dialog-fuss">
          <button class="knopf haupt-knopf" type="button" data-dialog-zu>Abbrechen</button>
        </footer>
      </div>`;
  }

  /* Zusammenfassung vor dem Übernehmen. */
  function zuweisungBestaetigen(fahrzeugId, mitarbeiterId) {
    const e = P.planEntwurf();
    const z = e.zeilen.find((x) => x.mitarbeiterId === mitarbeiterId);
    const m = mitarbeiterVon(mitarbeiterId);
    const neu = fahrzeugId ? fahrzeugVon(fahrzeugId) : null;
    const alt = z && z.fahrzeugId ? fahrzeugVon(z.fahrzeugId) : null;
    const belegt = fahrzeugId ? fahrerZuFahrzeug(e, fahrzeugId) : null;
    const doppelt = belegt && belegt.zeile.mitarbeiterId !== mitarbeiterId;

    return `
      <div class="dialog-hinter" data-dialog-zu></div>
      <div class="dialog-kasten" role="dialog" aria-modal="true" aria-labelledby="bestTitel">
        <header class="dialog-kopf">
          <h2 id="bestTitel">Zuweisung übernehmen?</h2>
          <button class="knopf klein" type="button" data-dialog-zu aria-label="Schließen">✕ Schließen</button>
        </header>
        <div class="dialog-rumpf">
          <dl class="zusammenfassung">
            <div><dt>Fahrer</dt><dd>${h(m ? m.name : mitarbeiterId)}</dd></div>
            <div><dt>Bisher</dt><dd>${alt ? `${h(alt.name)} · ${h(alt.kennzeichen)}` : "kein Fahrzeug"}</dd></div>
            <div><dt>Neu</dt><dd>${neu ? `${h(neu.name)} · ${h(neu.kennzeichen)}` : "kein Fahrzeug"}</dd></div>
            <div><dt>Schicht</dt><dd>${z && z.von ? `${h(z.von)}–${h(z.bis)}` : "—"}</dd></div>
          </dl>
          ${doppelt
            ? R.zustandsKasten("keinrecht", "Das Fahrzeug ist bereits vergeben",
                `${belegt.mitarbeiter.name} fährt ${neu.kennzeichen} zur selben Zeit. Die Zuweisung ist möglich, erzeugt aber einen Konflikt, der vor dem Veröffentlichen erneut angezeigt wird.`)
            : ""}
        </div>
        <footer class="dialog-fuss">
          <button class="knopf" type="button" data-tun="team-zuweisen-ab">Abbrechen</button>
          <button class="knopf ${doppelt ? "leise" : "haupt-knopf"}" type="button"
            data-tun="team-zuweisen-ja:${h(fahrzeugId)}|${h(mitarbeiterId)}">
            ${doppelt ? "Trotzdem zuweisen" : "Zuweisung übernehmen"}</button>
        </footer>
      </div>`;
  }

  /* ============================================================
     Fahrzeugzustand ändern
     ============================================================ */
  /*
    Zwei Stufen: erst das Formular, dann die letzte Pruefung. Der erste
    Klick schliesst nichts ab - er zeigt, was gespeichert wuerde,
    einschliesslich der Begruendung. Zurueck fuehrt mit allen Eingaben
    ins Formular.
  */
  function sperreDialog() {
    const s = stand.sperre;
    const f = fahrzeugVon(s.fahrzeugId);
    const e = P.planEntwurf();
    const belegt = fahrerZuFahrzeug(e, s.fahrzeugId);
    const zielName = D.FAHRZEUG_ZUSTAENDE[s.ziel];
    const brauchtGrund = s.ziel === "gesperrt" || s.ziel === "werkstatt";
    const pruefung = s.stufe === "pruefung";

    const kopfDaten = `<dl class="zusammenfassung">
      <div><dt>Fahrzeug</dt><dd>${h(f.name)} · ${h(f.kennzeichen)}</dd></div>
      <div><dt>Bisher</dt><dd>${h(D.FAHRZEUG_ZUSTAENDE[f.zustand])}</dd></div>
      <div><dt>Neu</dt><dd>${h(zielName)}</dd></div>
      ${pruefung && brauchtGrund ? `<div><dt>Grund</dt><dd>${h(s.grund)}</dd></div>` : ""}
      ${pruefung ? `<div><dt>Geändert von</dt><dd>${h(R.ROLLENNAMEN[R.zustand.rolle])}</dd></div>` : ""}
      ${pruefung && belegt ? `<div><dt>Zuweisung</dt><dd>wird gelöst (${h(belegt.mitarbeiter.name)})</dd></div>` : ""}
    </dl>`;

    const rumpf = pruefung
      ? `${R.zustandsKasten("keinrecht", "Letzte Prüfung",
            "Noch ist nichts geändert. Prüfen Sie die Angaben — erst „Verbindlich speichern“ schließt den Vorgang ab und erzeugt den Protokolleintrag.")}
         ${kopfDaten}`
      : `${s.fehler ? `<div class="feldfehler" role="alert">${h(s.fehler)}</div>` : ""}
         ${kopfDaten}
         ${belegt && brauchtGrund
           ? R.zustandsKasten("keinrecht", "Das Fahrzeug ist heute zugewiesen",
               `${belegt.mitarbeiter.name} fährt es ${belegt.zeile.von}–${belegt.zeile.bis}. Mit dem neuen Zustand wird die Zuweisung gelöst.`)
           : ""}
         ${brauchtGrund ? `
           <label>Grund <span class="band-warnung">Pflichtfeld</span>
             <textarea data-sperr-grund rows="2"
               placeholder="${s.ziel === "gesperrt" ? "Zum Beispiel: Unfallschaden, Gutachten steht aus." : "Zum Beispiel: Bremsen prüfen."}">${h(s.grund)}</textarea></label>`
           : `<p class="schritt-hinweis">Das Fahrzeug wird wieder als einsatzbereit geführt.</p>`}`;

    const fuss = pruefung
      ? `<button class="knopf haupt-knopf" type="button" data-tun="team-zustand-zurueck">Zurück und ändern</button>
         <button class="knopf leise" type="button" data-tun="team-zustand-ja">Verbindlich speichern</button>`
      : `<button class="knopf" type="button" data-tun="team-zustand-ab">Abbrechen</button>
         <button class="knopf haupt-knopf" type="button" data-tun="team-zustand-pruefen">Änderung prüfen</button>`;

    return `
      <div class="dialog-hinter" data-dialog-zu></div>
      <div class="dialog-kasten" role="dialog" aria-modal="true" aria-labelledby="sperrTitel">
        <header class="dialog-kopf">
          <h2 id="sperrTitel">${h(f.name)}: Zustand ändern</h2>
          <button class="knopf klein" type="button" data-dialog-zu aria-label="Schließen">✕ Schließen</button>
        </header>
        <div class="dialog-rumpf">${rumpf}</div>
        <footer class="dialog-fuss">${fuss}</footer>
      </div>`;
  }

  /* ============================================================
     Rückmeldung mit Protokollvorschau
     ============================================================ */
  function protokollDialog(titel, eintrag, rueckgaengig) {
    return `
      <div class="dialog-hinter" data-dialog-zu></div>
      <div class="dialog-kasten" role="dialog" aria-modal="true" aria-label="${h(titel)}">
        <header class="dialog-kopf"><h2>${h(titel)}</h2>
          <button class="knopf klein" type="button" data-dialog-zu aria-label="Schließen">✕ Schließen</button>
        </header>
        <div class="dialog-rumpf">
          <h4 class="unterueberschrift">Was protokolliert würde</h4>
          <dl class="zusammenfassung">
            <div><dt>Wer</dt><dd>${h(eintrag.wer)}</dd></div>
            <div><dt>Wann</dt><dd>${h(eintrag.zeit)}</dd></div>
            <div><dt>Betrifft</dt><dd>${h(eintrag.betrifft)}</dd></div>
            <div><dt>Vorher</dt><dd>${h(eintrag.vorher)}</dd></div>
            <div><dt>Nachher</dt><dd>${h(eintrag.nachher)}</dd></div>
            ${eintrag.grund ? `<div><dt>Grund</dt><dd>${h(eintrag.grund)}</dd></div>` : ""}
          </dl>
          <p class="schritt-hinweis">Weder Passwörter noch Zugangsschlüssel, keine ärztlichen
            Inhalte und keine Lohnbeträge gehören in dieses Protokoll.
            <strong>In dieser Designprobe wird nichts gespeichert.</strong></p>
        </div>
        <footer class="dialog-fuss">
          ${rueckgaengig ? `<button class="knopf leise" type="button" data-tun="${h(rueckgaengig)}">Rückgängig</button>` : ""}
          <button class="knopf haupt-knopf" type="button" data-dialog-zu>Schließen</button>
        </footer>
      </div>`;
  }

  /* ============================================================
     Bedienung
     ============================================================ */
  function tun(name, wert) {
    const e = P.planEntwurf();

    switch (name) {
      case "team-fahrer-filter":   stand.fahrerFilter = wert; R.zeichnen(); return;
      case "team-fahrzeug-filter": stand.fahrzeugFilter = wert; R.zeichnen(); return;

      case "team-fahrer":
        stand.offenerFahrer = wert;
        R.dialogOeffnen(fahrerDialog());
        return;

      /* ---- Zuweisung ---- */
      case "team-zuweisen":
        if (!darfZuweisen()) return;
        stand.zuweisung = { fahrzeugId: wert, fehler: "" };
        R.dialogOeffnen(zuweisungDialog());
        return;
      case "team-fahrzeug-fuer":
        if (!darfZuweisen()) return;
        stand.zuweisung = { mitarbeiterId: wert, fehler: "" };
        R.dialogOeffnen(zuweisungDialog());
        return;
      case "team-zuweisen-an": {
        const [fahrzeugId, mitarbeiterId] = wert.split("|");
        const f = fahrzeugId ? fahrzeugVon(fahrzeugId) : null;
        /* Ein gesperrtes oder in der Werkstatt stehendes Fahrzeug wird
           nicht zugewiesen - und es wird erklaert, warum. */
        if (f && !D.istEinsatzbereit(f)) {
          stand.zuweisung.fehler =
            `${f.name} ist ${D.FAHRZEUG_ZUSTAENDE[f.zustand].toLowerCase()}`
            + (f.sperrgrund ? ` (${f.sperrgrund})` : "")
            + " und kann deshalb nicht zugewiesen werden. Erst den Zustand ändern.";
          R.dialogOeffnen(zuweisungDialog());
          return;
        }
        R.dialogOeffnen(zuweisungBestaetigen(fahrzeugId, mitarbeiterId));
        return;
      }
      case "team-zuweisen-ab":
        R.dialogOeffnen(zuweisungDialog());
        return;
      case "team-zuweisen-ja": {
        const [fahrzeugId, mitarbeiterId] = wert.split("|");
        const z = e.zeilen.find((x) => x.mitarbeiterId === mitarbeiterId);
        const m = mitarbeiterVon(mitarbeiterId);
        if (!z) return;
        P.merken(e);
        const vorher = z.fahrzeugId ? fahrzeugVon(z.fahrzeugId) : null;
        z.fahrzeugId = fahrzeugId || null;
        const nachher = z.fahrzeugId ? fahrzeugVon(z.fahrzeugId) : null;
        const eintrag = {
          wer: R.ROLLENNAMEN[R.zustand.rolle],
          zeit: new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) + " Uhr",
          betrifft: m ? m.name : mitarbeiterId,
          was: "Fahrzeug zugewiesen",
          vorher: vorher ? vorher.kennzeichen : "kein Fahrzeug",
          nachher: nachher ? nachher.kennzeichen : "kein Fahrzeug",
          grund: ""
        };
        D.protokollieren(eintrag);
        stand.zuweisung = null;
        R.dialogOeffnen(protokollDialog("Zuweisung übernommen", eintrag, "team-rueckgaengig"));
        R.zeichnen();
        return;
      }
      case "team-loesen": {
        if (!darfZuweisen()) return;
        const belegt = fahrerZuFahrzeug(e, wert);
        if (!belegt) return;
        P.merken(e);
        const f = fahrzeugVon(wert);
        belegt.zeile.fahrzeugId = null;
        const eintrag = {
          wer: R.ROLLENNAMEN[R.zustand.rolle],
          zeit: new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) + " Uhr",
          betrifft: belegt.mitarbeiter ? belegt.mitarbeiter.name : belegt.zeile.mitarbeiterId,
          was: "Zuweisung gelöst",
          vorher: f ? f.kennzeichen : "Fahrzeug",
          nachher: "kein Fahrzeug",
          grund: ""
        };
        D.protokollieren(eintrag);
        R.dialogOeffnen(protokollDialog("Zuweisung gelöst", eintrag, "team-rueckgaengig"));
        R.zeichnen();
        return;
      }
      case "team-rueckgaengig": {
        const vorher = e.verlauf.pop();
        if (vorher) { e.zeilen = vorher.zeilen; e.zeitfehler = vorher.zeitfehler; }
        R.dialogSchliessen(true);
        R.zeichnen();
        return;
      }

      /* ---- Fahrzeugzustand ---- */
      case "team-zustand": {
        if (!darfFahrzeugPflegen()) return;
        const [fahrzeugId, ziel] = wert.split("|");
        stand.sperre = { fahrzeugId, ziel, grund: "", fehler: "", stufe: "formular" };
        R.dialogOeffnen(sperreDialog());
        return;
      }
      case "team-zustand-ab":
        stand.sperre = null;
        R.dialogSchliessen(true);
        return;
      /* Erster Klick: nur pruefen. Hier wird noch nichts geaendert. */
      case "team-zustand-pruefen": {
        const s = stand.sperre;
        const feld = document.querySelector("[data-sperr-grund]");
        s.grund = feld ? feld.value.trim() : "";
        const brauchtGrund = s.ziel === "gesperrt" || s.ziel === "werkstatt";
        if (brauchtGrund && s.grund.length < 3) {
          s.fehler = "Bitte einen Grund eintragen. Ohne Grund wird der Zustand nicht geändert.";
          R.dialogOeffnen(sperreDialog());
          const neu = document.querySelector("[data-sperr-grund]");
          if (neu) neu.focus();
          return;
        }
        s.fehler = "";
        s.stufe = "pruefung";
        R.dialogOeffnen(sperreDialog());
        return;
      }
      /* Zurueck ins Formular - mit allen Eingaben. */
      case "team-zustand-zurueck":
        stand.sperre.stufe = "formular";
        R.dialogOeffnen(sperreDialog());
        return;
      case "team-zustand-ja": {
        const s = stand.sperre;
        const f = fahrzeugVon(s.fahrzeugId);
        const grund = s.grund;
        const brauchtGrund = s.ziel === "gesperrt" || s.ziel === "werkstatt";
        const vorher = D.FAHRZEUG_ZUSTAENDE[f.zustand];
        /* Beim Sperren oder in die Werkstatt: eine bestehende Zuweisung
           wird geloest, sonst stuende ein nicht einsatzbereites
           Fahrzeug im Tagesplan. */
        if (brauchtGrund) {
          P.merken(e);
          const belegt = fahrerZuFahrzeug(e, f.id);
          if (belegt) belegt.zeile.fahrzeugId = null;
        }
        f.zustand = s.ziel;
        f.sperrgrund = s.ziel === "gesperrt" ? grund : "";
        const eintrag = {
          wer: R.ROLLENNAMEN[R.zustand.rolle],
          zeit: new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) + " Uhr",
          betrifft: f.name,
          was: "Zustand geändert",
          vorher,
          nachher: D.FAHRZEUG_ZUSTAENDE[s.ziel],
          grund
        };
        D.protokollieren(eintrag);
        stand.sperre = null;
        R.dialogOeffnen(protokollDialog("Zustand geändert", eintrag, ""));
        R.zeichnen();
        return;
      }
      case "team-stammdaten":
        R.dialogOeffnen(protokollDialog("Stammdaten bearbeiten",
          {
            wer: R.ROLLENNAMEN[R.zustand.rolle],
            zeit: "beim Speichern",
            betrifft: (fahrzeugVon(wert) || {}).name || wert,
            vorher: "bisherige Stammdaten",
            nachher: "geänderte Stammdaten",
            grund: ""
          }, ""));
        return;

      /* ---- Lohn ---- */
      case "team-lohn-neu":
        /* Auch ein direkter Aufruf fuehrt ohne die Faehigkeit zu
           nichts - die Sperre haengt nicht an der Sichtbarkeit. */
        if (!darfLohnPflegen()) return;
        stand.lohnNeu = { mitarbeiterId: wert, monat: "", jahr: "2026", datei: "", grund: "", fehler: "", stufe: "formular" };
        R.dialogOeffnen(lohnDialog());
        return;
      case "team-lohn-datei":
        stand.lohnNeu.datei = wert;
        R.dialogOeffnen(lohnDialog());
        return;
      case "team-lohn-ab":
        stand.lohnNeu = null;
        R.dialogOeffnen(fahrerDialog());
        return;
      /* Erster Klick: nur pruefen. Hier wird nichts bereitgestellt. */
      case "team-lohn-pruefen": {
        const s = stand.lohnNeu;
        const grundFeld = document.querySelector("[data-lohn-grund]");
        if (grundFeld) s.grund = grundFeld.value.trim();
        const { vorhanden } = lohnAngaben(s);
        if (!s.monat || !s.datei) {
          s.fehler = "Bitte Zeitraum und Datei wählen.";
          R.dialogOeffnen(lohnDialog());
          return;
        }
        if (vorhanden && s.grund.length < 3) {
          s.fehler = "Für eine neue Version braucht es einen Grund. Die vorhandene Abrechnung wird nicht überschrieben.";
          R.dialogOeffnen(lohnDialog());
          const neu = document.querySelector("[data-lohn-grund]");
          if (neu) neu.focus();
          return;
        }
        s.fehler = "";
        s.stufe = "pruefung";
        R.dialogOeffnen(lohnDialog());
        return;
      }
      case "team-lohn-zurueck":
        stand.lohnNeu.stufe = "formular";
        R.dialogOeffnen(lohnDialog());
        return;
      case "team-lohn-fertig": {
        const s = stand.lohnNeu;
        if (!darfLohnPflegen()) return;
        const { m, vorhanden, neueVersion, bezeichnung } = lohnAngaben(s);
        const eintrag = {
          wer: R.ROLLENNAMEN[R.zustand.rolle],
          zeit: new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) + " Uhr",
          betrifft: m ? m.name : s.mitarbeiterId,
          was: "Lohnabrechnung bereitgestellt",
          vorher: vorhanden ? `Version ${vorhanden.version}` : "keine Abrechnung",
          nachher: `${s.monat}/${s.jahr} · Version ${neueVersion} · ${bezeichnung}`,
          grund: s.grund
        };
        /* Die vorhandene Abrechnung bleibt in der Liste stehen - die
           neue kommt als eigene Version dazu. */
        D.lohnProbe.unshift({
          id: "LP" + Date.now(),
          mitarbeiterId: s.mitarbeiterId,
          monat: s.monat, jahr: s.jahr,
          version: neueVersion,
          datei: bezeichnung,
          von: R.ROLLENNAMEN[R.zustand.rolle],
          am: new Date().toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) + " Uhr",
          grund: s.grund
        });
        D.protokollieren(eintrag);
        stand.lohnNeu = null;
        R.dialogOeffnen(protokollDialog("In der Probe wird nichts hochgeladen", eintrag, ""));
        return;
      }

      default: return;
    }
  }

  function geaendert(feld) {
    if (feld.matches("[data-team-fahrersuche]")) {
      stand.fahrerSuche = feld.value; R.zeichnen(); return true;
    }
    if (feld.matches("[data-team-fahrzeugsuche]")) {
      stand.fahrzeugSuche = feld.value; R.zeichnen(); return true;
    }
    if (feld.matches("[data-lohn-neu]")) {
      stand.lohnNeu[feld.dataset.lohnNeu] = feld.value;
      R.dialogOeffnen(lohnDialog());
      return true;
    }
    return false;
  }

  /* Offene Eingaben duerfen beim Schliessen nicht stillschweigend
     verlorengehen. Gefragt wird nur, wenn wirklich etwas dasteht. */
  function offeneEingabe() {
    const grund = document.querySelector("[data-sperr-grund], [data-lohn-grund]");
    return Boolean(grund && grund.value.trim().length > 0);
  }

  window.ProbeTeam = { anmelden, zeichne, tun, geaendert, offeneEingabe, fahrerDialog };
})();
