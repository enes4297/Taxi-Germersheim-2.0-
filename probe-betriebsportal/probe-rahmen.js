/* ============================================================
   Designprobe Betriebsportal - Rahmen
   ============================================================
   Navigation, Rollenfilter, Wegfuehrung, gemeinsame Bausteine.
   Die Bereiche selbst stehen in probe-bereiche.js.

   Die Rollenwahl hier ist ein Anschauungsmittel der Probe. Im echten
   Portal kommt die Rolle ausschliesslich aus der Datenbank
   (private.has_capability) und niemals aus einem Auswahlfeld.
   ============================================================ */
(() => {
  "use strict";

  /* ---- Rollen und Faehigkeiten, wie in BETRIEBSPORTAL-ROLLENMATRIX.md ---- */
  const FAEHIGKEITEN = {
    admin: ["operations.read", "operations.write", "fleet.read", "fleet.write",
            "personnel.read", "personnel.write", "payroll.read", "payroll.write",
            "customers.read", "customers.write", "finance.read", "finance.write",
            "rewards.read", "rewards.write", "analytics.read",
            "security.read", "security.write", "absence.decide", "self.read"],
    dispatcher: ["operations.read", "operations.write", "fleet.read", "self.read"],
    personal:   ["personnel.read", "personnel.write", "payroll.read", "payroll.write",
                 "absence.decide", "self.read"],
    accounting: ["customers.read", "customers.write", "finance.read", "finance.write",
                 "analytics.read", "self.read"],
    employee:   ["self.read"]
  };

  const ROLLENNAMEN = {
    admin: "Administration", dispatcher: "Disposition", personal: "Personal",
    accounting: "Buchhaltung", employee: "Mitarbeiter"
  };

  /* ---- Strichsymbole. Inline, currentColor, keine Emojis, kein CDN. ---- */
  const SYMBOLE = {
    uebersicht: "M3 10.5 12 4l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
    fahrten:    "M5 16V9l2-4h10l2 4v7M5 16h14M5 16v2.5M19 16v2.5M8 12.5h.01M16 12.5h.01",
    planung:    "M4 6h16M4 6v14h16V6M4 6V4m16 2V4M8 10h3m-3 4h8",
    team:       "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6m8 8v-1a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v1m16-9a3 3 0 1 0 0-6",
    meldungen:  "M12 3a6 6 0 0 0-6 6c0 5-2 6-2 6h16s-2-1-2-6a6 6 0 0 0-6-6M10.5 20a1.8 1.8 0 0 0 3 0",
    kunden:     "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8m8 8a8 8 0 1 0-16 0",
    personal:   "M8 3h8a1 1 0 0 1 1 1v16l-5-3-5 3V4a1 1 0 0 1 1-1M9 8h6M9 11h4",
    lohn:       "M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5",
    finanzen:   "M3 7h18v12H3zM3 11h18M7 15h3",
    rewards:    "M12 3l2.4 5 5.6.8-4 3.9 1 5.5-5-2.7-5 2.7 1-5.5-4-3.9 5.6-.8z",
    analyse:    "M4 20V10m5 10V4m5 16v-7m5 7V8",
    mehr:       "M5 12h.01M12 12h.01M19 12h.01"
  };

  const symbol = (name) =>
    `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
       <path d="${SYMBOLE[name] || SYMBOLE.mehr}"/></svg>`;

  /* ---- Die elf Bereiche ---- */
  const BEREICHE = [
    { id: "uebersicht", name: "Übersicht",          kurz: "Übersicht", symbol: "uebersicht", braucht: "self.read" },
    { id: "fahrten",    name: "Fahrten",            kurz: "Fahrten",   symbol: "fahrten",    braucht: "operations.read" },
    { id: "planung",    name: "Planung",            kurz: "Planung",   symbol: "planung",    braucht: "operations.read" },
    { id: "team",       name: "Fahrer & Fahrzeuge", kurz: "Team",      symbol: "team",       braucht: ["operations.read", "personnel.read", "fleet.read"] },
    { id: "meldungen",  name: "Meldungen",          kurz: "Meldungen", symbol: "meldungen",  braucht: "self.read" },
    { id: "kunden",     name: "Kunden",             kurz: "Kunden",    symbol: "kunden",     braucht: "customers.read" },
    { id: "personal",   name: "Personal",           kurz: "Personal",  symbol: "personal",   braucht: "personnel.read" },
    { id: "lohn",       name: "Lohn",               kurz: "Lohn",      symbol: "lohn",       braucht: "payroll.read" },
    { id: "finanzen",   name: "Finanzen",           kurz: "Finanzen",  symbol: "finanzen",   braucht: "finance.read" },
    { id: "rewards",    name: "Rewards",            kurz: "Rewards",   symbol: "rewards",    braucht: "rewards.read" },
    { id: "analyse",    name: "Analyse",            kurz: "Analyse",   symbol: "analyse",    braucht: "analytics.read" }
  ];

  /* ---- Zustand der Probe ---- */
  const zustand = {
    rolle: "dispatcher",
    /* Einzeln vergebene Faehigkeiten - zusaetzlich zur Rolle. So
       bekaeme eine Dispositionsperson die Urlaubsentscheidung, ohne
       dass die ganze Rolle erweitert wird. */
    zusatz: [],
    bereich: "uebersicht",
    fahrtFilter: "alle",
    planTag: 0,
    planEntwurf: null,
    klicks: 0
  };

  /* Eine Faehigkeit - oder eine Liste, von der eine genuegt. Der
     Bereich "Fahrer & Fahrzeuge" ist der erste, den mehrere Rollen
     aus verschiedenen Gruenden brauchen. */
  const darf = (faehigkeit) => {
    const meine = (FAEHIGKEITEN[zustand.rolle] || []).concat(zustand.zusatz);
    if (Array.isArray(faehigkeit)) return faehigkeit.some((f) => meine.includes(f));
    return meine.includes(faehigkeit);
  };
  const sichtbareBereiche = () => BEREICHE.filter((b) => darf(b.braucht));

  /* ---- Maskieren. Beim Einfuegen in HTML immer. ---- */
  const h = (wert) => String(wert == null ? "" : wert)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

  /* ============================================================
     Gemeinsame Bausteine
     ============================================================ */

  /* Die dreizehn Zustaende. Ein Ladefehler sieht nie aus wie leer. */
  function zustandsKasten(art, titel, text, aktion) {
    const knopf = aktion
      ? `<button class="knopf klein" type="button" data-tun="${h(aktion.tun)}">${h(aktion.name)}</button>`
      : "";
    const balken = art === "laedt" ? '<div class="laedt-balken"></div>' : "";
    return `<div class="zustand ${h(art)}">
      <h3>${h(titel)}</h3>
      <p>${h(text)}</p>
      ${balken}${knopf}
    </div>`;
  }

  const kastenLeer = (was) =>
    zustandsKasten("leer", `Keine ${was}`, `Für diesen Zeitraum ist nichts eingetragen. Das ist kein Fehler.`);

  const kastenFehler = (was) =>
    zustandsKasten("fehler", `${was} konnten nicht geladen werden`,
      "Die Verbindung zum Server ist fehlgeschlagen. Die Liste ist deshalb leer — das heißt nicht, dass es keine Einträge gibt.",
      { name: "Erneut versuchen", tun: "neu-laden" });

  const kastenKeinRecht = (was) =>
    zustandsKasten("keinrecht", "Keine Berechtigung",
      `Ihre Rolle (${ROLLENNAMEN[zustand.rolle]}) umfasst ${was} nicht. Wenden Sie sich an die Administration.`);

  const kastenVorbereitet = (was, fehlt) =>
    zustandsKasten("vorbereitet", `${was} — noch keine Datenquelle`,
      `Dieser Bereich ist vorbereitet, hat aber noch keine gemeinsame Datenhaltung. Dafür fehlt: ${fehlt}. Bis dahin werden hier bewusst keine Zahlen gezeigt.`);

  const marke = (art, text) => `<span class="marke-zustand ${h(art)}">${h(text)}</span>`;

  function kennzahl(wert, name, art, ziel) {
    return `<button class="kennzahl ${art ? "ist-" + h(art) : ""}" type="button" data-ziel="${h(ziel || "")}">
      <span class="wert">${h(wert)}</span>
      <span class="name">${h(name)}</span>
    </button>`;
  }

  /* ---- Dialog. Genau eine Ebene, mit Fokusfalle. ---- */
  let dialogAusloeser = null;

  /*
    Ein Fenster kann sich gegen versehentliches Schliessen wehren.
    Setzt ein Bereich eine Schutzfrage, wird sie vor jedem Schliessen
    gefragt - egal ob ueber Hintergrund, Abbrechen oder Escape. Gibt sie
    false zurueck, bleibt das Fenster offen und darf selbst eine
    Sicherheitsabfrage zeichnen. Verschachtelte Fenster gibt es nicht.
  */
  let dialogSchutz = null;
  const dialogSchutzSetzen = (fn) => { dialogSchutz = fn; };

  function dialogOeffnen(markup, ausloeser) {
    dialogAusloeser = ausloeser || document.activeElement;
    const ziel = document.querySelector("[data-dialog]");
    ziel.innerHTML = markup;
    ziel.hidden = false;
    document.body.style.overflow = "hidden";
    const erstes = ziel.querySelector("button, input, select, [tabindex]");
    if (erstes) erstes.focus();
  }

  function dialogSchliessen(erzwingen) {
    if (!erzwingen && dialogSchutz && dialogSchutz() === false) return;
    /*
      Zweiter Schutz, der fuer JEDES Fenster gilt: Steht in einem
      Pflichtfeld schon etwas, wird nicht kommentarlos geschlossen.
      Ein Klick daneben oder ein versehentliches Escape darf eine
      begonnene Begruendung nicht verschlucken.
    */
    const offen = (window.ProbeTeam && window.ProbeTeam.offeneEingabe && window.ProbeTeam.offeneEingabe())
      || (window.ProbeVorgaenge && window.ProbeVorgaenge.offeneEingabe && window.ProbeVorgaenge.offeneEingabe());
    if (!erzwingen && offen) {
      const kasten = document.querySelector(".dialog-kasten");
      if (kasten && !kasten.querySelector("[data-offen-warnung]")) {
        const warnung = document.createElement("div");
        warnung.className = "feldfehler";
        warnung.setAttribute("role", "alert");
        warnung.setAttribute("data-offen-warnung", "");
        warnung.textContent = "Ihre Eingabe geht sonst verloren. Zum Schließen noch einmal bestätigen.";
        const rumpf = kasten.querySelector(".dialog-rumpf");
        if (rumpf) rumpf.prepend(warnung);
        return;
      }
    }
    dialogSchutz = null;
    const ziel = document.querySelector("[data-dialog]");
    ziel.hidden = true;
    ziel.innerHTML = "";
    document.body.style.overflow = "";
    if (dialogAusloeser && document.body.contains(dialogAusloeser)) dialogAusloeser.focus();
    dialogAusloeser = null;
  }

  const dialogOffen = () => !document.querySelector("[data-dialog]").hidden;

  /* ============================================================
     Rahmen zeichnen
     ============================================================ */
  function navigationZeichnen() {
    const bereiche = sichtbareBereiche();
    /* Aus demselben Bestand wie der Eingang selbst - eine Wahrheit.
       Beim allerersten Zeichnen ist das Modul noch nicht geladen;
       dann bleibt der Zaehler leer statt zu scheitern. */
    const offeneMeldungen = window.ProbeVorgaenge
      ? window.ProbeVorgaenge.offeneFuerMich().length
      : 0;

    document.querySelector("[data-navigation]").innerHTML = bereiche.map((b) => {
      const zaehler = b.id === "meldungen" && offeneMeldungen
        ? `<span class="zaehler">${offeneMeldungen}</span>` : "";
      return `<button class="nav-knopf" type="button" data-bereich="${h(b.id)}"
        ${b.id === zustand.bereich ? 'aria-current="page"' : ""}>
        ${symbol(b.symbol)}<span>${h(b.name)}</span>${zaehler}</button>`;
    }).join("");

    /* Am Handy hoechstens fuenf Eintraege. Der Rest steht unter "Mehr". */
    const handy = bereiche.slice(0, 4);
    const rest = bereiche.slice(4);
    let leiste = handy.map((b) => `<button type="button" data-bereich="${h(b.id)}"
      ${b.id === zustand.bereich ? 'aria-current="page"' : ""}>
      ${symbol(b.symbol)}<span>${h(b.kurz)}</span></button>`).join("");
    if (rest.length) {
      const drin = rest.some((b) => b.id === zustand.bereich);
      leiste += `<button type="button" data-mehr ${drin ? 'aria-current="page"' : ""}>
        ${symbol("mehr")}<span>Mehr</span></button>`;
    }
    document.querySelector("[data-handyleiste]").innerHTML = leiste;

    document.querySelector("[data-rolle]").value = zustand.rolle;
    const name = document.querySelector("[data-rollenname]");
    if (name) name.textContent = ROLLENNAMEN[zustand.rolle];
  }

  function mehrDialog() {
    const rest = sichtbareBereiche().slice(4);
    dialogOeffnen(`
      <div class="dialog-hinter" data-dialog-zu></div>
      <div class="dialog-kasten" role="dialog" aria-modal="true" aria-label="Weitere Bereiche">
        <header class="dialog-kopf">
          <h2>Weitere Bereiche</h2>
          <button class="knopf klein" type="button" data-dialog-zu>Schließen</button>
        </header>
        <div class="dialog-rumpf">
          <div class="wahlraster">
            ${rest.map((b) => `<button class="wahlkarte" type="button" data-bereich="${h(b.id)}">
              <strong>${h(b.name)}</strong></button>`).join("")}
          </div>
        </div>
      </div>`);
  }

  /*
    Beim Neuzeichnen wird der Hauptbereich ersetzt. Stand der Fokus in
    einem Suchfeld, laege er danach beim Seitenkoerper - man koennte
    kein zweites Zeichen tippen. Deshalb wird gemerkt, WELCHES Feld
    den Fokus hatte und an welcher Stelle der Schreibzeiger stand.
  */
  function fokusMerken() {
    const el = document.activeElement;
    if (!el || !el.dataset || el === document.body) return null;
    const schluessel = Object.keys(el.dataset)[0];
    if (!schluessel) return null;
    const attribut = "data-" + schluessel.replace(/[A-Z]/g, (z) => "-" + z.toLowerCase());
    const wahl = el.dataset[schluessel]
      ? `[${attribut}="${el.dataset[schluessel]}"]`
      : `[${attribut}]`;
    let anfang = null;
    let ende = null;
    try { anfang = el.selectionStart; ende = el.selectionEnd; } catch { /* nicht jedes Feld kann das */ }
    return { wahl, anfang, ende };
  }

  function fokusWiederherstellen(merker) {
    if (!merker) return;
    const el = document.querySelector(merker.wahl);
    if (!el) return;
    el.focus();
    if (merker.anfang !== null) {
      try { el.setSelectionRange(merker.anfang, merker.ende); } catch { /* egal */ }
    }
  }

  /*
    Die Glocke zeigt NUR neue, noch nicht gesehene Ereignisse. Sie
    ist keine Aufgabenverwaltung: "gesehen" heisst nicht "erledigt",
    und nichts verschwindet dadurch aus der Arbeitsliste.
  */
  function portalkopf() {
    const offen = window.ProbeVorgaenge ? window.ProbeVorgaenge.ungesehen() : [];
    return `<div class="portal-kopf">
      <span class="pk-rolle">Angemeldet als <strong>${h(ROLLENNAMEN[zustand.rolle])}</strong></span>
      <button class="pk-glocke${offen.length ? " hat-neue" : ""}" type="button" data-glocke
        aria-label="Neue Ereignisse: ${offen.length}">
        ${symbol("meldungen")}
        <span class="pk-zahl">${offen.length}</span>
      </button>
    </div>`;
  }

  function zeichnen() {
    const merker = fokusMerken();
    navigationZeichnen();
    const bereich = BEREICHE.find((b) => b.id === zustand.bereich);
    const ziel = document.querySelector("[data-haupt]");
    if (!bereich || !darf(bereich.braucht)) {
      ziel.innerHTML = portalkopf() + `<div class="bereichskopf"><h1>Kein Zugriff</h1></div>
        ${kastenKeinRecht("diesen Bereich")}`;
      return;
    }
    ziel.innerHTML = portalkopf() + window.ProbeBereiche.zeichne(zustand.bereich);
    fokusWiederherstellen(merker);
    if (!merker) { ziel.scrollTop = 0; window.scrollTo(0, 0); }
  }

  function geheZu(bereichId) {
    if (!BEREICHE.some((b) => b.id === bereichId)) return;
    zustand.bereich = bereichId;
    if (dialogOffen()) dialogSchliessen();
    zeichnen();
  }

  /* ============================================================
     Bedienung
     ============================================================ */
  function bedienungBinden() {
    document.addEventListener("click", (e) => {
      const nav = e.target.closest("[data-bereich]");
      if (nav) { zustand.klicks += 1; geheZu(nav.dataset.bereich); return; }

      if (e.target.closest("[data-glocke]")) { window.ProbeVorgaenge.glocke(); return; }
      if (e.target.closest("[data-mehr]")) { mehrDialog(); return; }
      if (e.target.closest("[data-dialog-zu]")) { dialogSchliessen(); return; }

      const ziel = e.target.closest("[data-ziel]");
      if (ziel && ziel.dataset.ziel) {
        zustand.klicks += 1;
        const [bereichId, filter] = ziel.dataset.ziel.split(":");
        if (filter) zustand.fahrtFilter = filter;
        geheZu(bereichId);
        return;
      }

      const tun = e.target.closest("[data-tun]");
      if (tun) { zustand.klicks += 1; window.ProbeBereiche.tun(tun.dataset.tun, tun); }
    });

    document.addEventListener("change", (e) => {
      if (e.target.matches("[data-rolle]")) {
        zustand.rolle = e.target.value;
        zustand.zusatz = [];
        const erlaubt = sichtbareBereiche();
        if (!erlaubt.some((b) => b.id === zustand.bereich)) {
          zustand.bereich = erlaubt.length ? erlaubt[0].id : "uebersicht";
        }
        if (dialogOffen()) dialogSchliessen();
        zeichnen();
        return;
      }
      if (window.ProbeBereiche.geaendert(e.target)) return;
    });

    /* Tippen im Suchfeld: nur die Trefferliste wird neu gezeichnet,
       nie das ganze Fenster - sonst springt der Fokus aus dem Feld. */
    document.addEventListener("input", (e) => {
      if (window.ProbeBereiche.eingabe) window.ProbeBereiche.eingabe(e.target);
    });

    /* Tastatur: Escape schliesst, Tab bleibt im Dialog. */
    document.addEventListener("keydown", (e) => {
      if (!dialogOffen()) return;
      if (window.ProbeBereiche.taste && window.ProbeBereiche.taste(e) === true) return;
      if (e.key === "Escape") { e.preventDefault(); dialogSchliessen(); return; }
      if (e.key !== "Tab") return;
      const kasten = document.querySelector(".dialog-kasten");
      if (!kasten) return;
      const felder = [...kasten.querySelectorAll("button, input, select, textarea, [tabindex]")]
        .filter((el) => !el.disabled && el.offsetParent !== null);
      if (!felder.length) return;
      const erstes = felder[0];
      const letztes = felder[felder.length - 1];
      if (e.shiftKey && document.activeElement === erstes) { e.preventDefault(); letztes.focus(); }
      else if (!e.shiftKey && document.activeElement === letztes) { e.preventDefault(); erstes.focus(); }
    });
  }

  window.ProbeRahmen = {
    zustand, darf, h, symbol, marke, kennzahl,
    zustandsKasten, kastenLeer, kastenFehler, kastenKeinRecht, kastenVorbereitet,
    dialogOeffnen, dialogSchliessen, dialogOffen, dialogSchutzSetzen, zeichnen, geheZu,
    ROLLENNAMEN, BEREICHE
  };

  document.addEventListener("DOMContentLoaded", () => {
    bedienungBinden();
    zeichnen();
  });
})();
