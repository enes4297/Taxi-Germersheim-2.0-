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
  /*
    Die Faehigkeiten dieser Probe.

    FAEHIGKEITEN ist die AUSGANGSVERTEILUNG und wird nie veraendert -
    sie ist der Vergleichspunkt, an dem die Einstellungen zeigen
    koennen, was jemand geaendert hat. Gearbeitet wird mit
    rollenRechte, einer Kopie davon.

    AUFGETEILT auf Anweisung des Geschaeftsfuehrers: "Fahrten sehen"
    und "Planung sehen" waren ein Recht, ebenso "Personalstammdaten
    sehen" und "Krankheitszeitraeume sehen". Fuer die Rollenvergabe
    war das zu grob.

    Die Dokumentpruefung (dokument.pruefen) ist noch einmal getrennt
    und die engste Stufe - wer einen Krankheitszeitraum sehen darf,
    darf damit noch nicht die Bescheinigung oeffnen.
  */
  const FAEHIGKEITEN = {
    admin: ["fahrten.read", "planung.read", "operations.write",
            "fleet.read", "fleet.write",
            "personal.read", "krankheit.read", "dokument.pruefen", "personnel.write",
            "payroll.read", "payroll.write",
            "customers.read", "customers.write", "finance.read", "finance.write",
            "rewards.read", "rewards.write", "analytics.read",
            "security.read", "security.write", "absence.decide", "self.read"],
    dispatcher: ["fahrten.read", "planung.read", "operations.write",
                 "fleet.read", "self.read"],
    personal:   ["personal.read", "krankheit.read", "dokument.pruefen", "personnel.write",
                 "payroll.read", "payroll.write",
                 "absence.decide", "self.read"],
    accounting: ["customers.read", "customers.write", "finance.read", "finance.write",
                 "analytics.read", "self.read"],
    employee:   ["self.read"]
  };

  /*
    GROBE FAEHIGKEITEN - nur als FRAGE, nie als Besitz.

    Der Geschaeftsfuehrer hat verlangt, dass "Fahrten sehen" und
    "Planung sehen" unabhaengig schaltbar sind, ebenso
    "Personalstammdaten sehen" und "Krankheitszeitraeume sehen".
    Beide waren vorher je EIN Recht.

    Damit nicht an 27 Stellen geraten werden muss, bleibt die alte,
    grobe Kennung als FRAGE gueltig: darf("operations.read") heisst
    jetzt "hat Fahrten- ODER Planungssicht". Kein Konto BESITZT sie
    noch - sie steht in keiner Rolle und in keiner Freigabe.

    Das ist bewusst so gebaut: Eine Stelle, die wirklich nur die
    Planung meint, wird einzeln auf planung.read umgestellt. Eine
    Stelle, der beides genuegt, darf die grobe Frage behalten. Haette
    ich alle 27 Stellen blind ersetzt, waere bei jeder falschen
    Einordnung eine funktionierende Ansicht verschwunden, ohne dass
    es auffaellt.

    In den EINSTELLUNGEN tauchen die groben Kennungen nicht auf -
    schaltbar sind nur die feinen.
  */
  const GROBE = {
    "operations.read": ["fahrten.read", "planung.read"],
    "personnel.read": ["personal.read", "krankheit.read"]
  };

  /*
    Testkonten der Probe. Ausschliesslich Testpersonen - keine echten
    Namen. Die Kennung ist unveraenderlich und gehoert ins Protokoll,
    damit spaeter nachvollziehbar bleibt, WER gehandelt hat und nicht
    nur, welche Rolle.
  */
  const BENUTZER = {
    admin:      { kennung: "U-ADM-01", name: "Testleitung 01",      rolle: "Administration" },
    dispatcher: { kennung: "U-DIS-01", name: "Testdisposition 01",  rolle: "Disposition" },
    personal:   { kennung: "U-PER-01", name: "Testpersonal 01",     rolle: "Personal" },
    accounting: { kennung: "U-BUC-01", name: "Testbuchhaltung 01",  rolle: "Buchhaltung" },
    employee:   { kennung: "U-MIT-01", name: "Testmitarbeiter 01",  rolle: "Mitarbeiter" }
  };

  /*
    ZWEI GETRENNTE ADMINISTRATIONSKONTEN.

    Fuer den Start sind zwei Personen als Administration vorgesehen.
    Sie bekommen ausdruecklich KEIN gemeinsames Konto: Bei einem
    gemeinsamen Konto steht im Protokoll nur "Administration", und
    niemand kann sagen, wer gehandelt hat.

    Hier sind es TESTIDENTITAETEN der Designprobe. Es wird kein echtes
    Konto angelegt, kein Passwort hinterlegt und nichts in Supabase
    veraendert. Zugangsdaten stehen weder in den Testdaten noch im
    Protokoll - ein Protokoll ist kein Ort fuer Geheimnisse.
  */
  const KONTEN = [
    { kennung: "U-ADM-01", name: "Enes Carman",         rolle: "admin",      anzeige: "Administration" },
    { kennung: "U-ADM-02", name: "Fatih Duman",         rolle: "admin",      anzeige: "Administration" },
    { kennung: "U-DIS-01", name: "Testdisposition 01",  rolle: "dispatcher", anzeige: "Disposition" },
    { kennung: "U-PER-01", name: "Testpersonal 01",     rolle: "personal",   anzeige: "Personal" },
    { kennung: "U-BUC-01", name: "Testbuchhaltung 01",  rolle: "accounting", anzeige: "Buchhaltung" },
    { kennung: "U-MIT-01", name: "Testmitarbeiter 01",  rolle: "employee",   anzeige: "Mitarbeiter" }
  ];

  /* Die Rollenrechte, wie sie GERADE gelten. Aenderbar nur ueber die
     Einstellungen, und nur von einem Konto mit security.write. */
  const rollenRechte = {};
  for (const rolle of Object.keys(FAEHIGKEITEN)) {
    rollenRechte[rolle] = FAEHIGKEITEN[rolle].slice();
  }

  /* Zusaetzliche Freigaben JE KONTO - getrennt von der Rolle, damit
     erkennbar bleibt, was aus der Rolle kommt und was einzeln
     vergeben wurde. */
  const kontoRechte = {};
  for (const k of KONTEN) kontoRechte[k.kennung] = [];

  const kontoVon = (kennung) => KONTEN.find((k) => k.kennung === kennung) || null;

  /* Das angemeldete Konto. Es muss zur gewaehlten Rolle passen -
     sonst das erste Konto dieser Rolle. */
  function aktuellesKonto() {
    const gewaehlt = kontoVon(zustand.konto);
    if (gewaehlt && gewaehlt.rolle === zustand.rolle) return gewaehlt;
    return KONTEN.find((k) => k.rolle === zustand.rolle) || KONTEN[KONTEN.length - 1];
  }

  /* Die Faehigkeiten eines Kontos: Rolle plus einzelne Freigaben. */
  const rechteVon = (konto) => konto
    ? (rollenRechte[konto.rolle] || []).concat(kontoRechte[konto.kennung] || [])
    : [];

  /* Das handelnde Konto. Die Administration handelt als sie selbst -
     sie kann sich nicht als Personal ausgeben. */
  /*
    Das handelnde Konto. Es handelt als es selbst - eine Rolle ist
    kein Handelnder. Im Protokoll steht deshalb Name UND Kennung.
  */
  const benutzer = () => {
    const k = aktuellesKonto();
    return { kennung: k.kennung, name: k.name, rolle: k.anzeige };
  };
  const benutzerText = () => {
    const b = benutzer();
    return b.name + " – " + b.rolle;
  };

  const ROLLENNAMEN = {
    admin: "Administration", dispatcher: "Disposition", personal: "Personal",
    accounting: "Buchhaltung", employee: "Mitarbeiter"
  };

  /* ---- Strichsymbole. Inline, currentColor, keine Emojis, kein CDN. ---- */
  const SYMBOLE = {
    kalender: "M3 5h18v16H3zM3 9h18M8 3v4M16 3v4",
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
    mehr:       "M5 12h.01M12 12h.01M19 12h.01",
    einstellungen: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7.5 19.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3 14.6a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 7.5l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 10 3.1V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1"
  };

  const symbol = (name) =>
    `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
       <path d="${SYMBOLE[name] || SYMBOLE.mehr}"/></svg>`;

  /* ---- Die elf Bereiche ---- */
  const BEREICHE = [
    { id: "uebersicht", name: "Übersicht",          kurz: "Übersicht", symbol: "uebersicht", braucht: "self.read" },
    /*
      Jeder Bereich nennt die Faehigkeit, die er WIRKLICH braucht.
      "Fahrten" braucht Fahrtensicht, "Planung" Planungssicht - wer
      nur eines von beiden hat, sieht nur eines von beiden.
    */
    { id: "fahrten",    name: "Fahrten",            kurz: "Fahrten",   symbol: "fahrten",    braucht: "fahrten.read" },
    { id: "planung",    name: "Planung",            kurz: "Planung",   symbol: "planung",    braucht: "planung.read" },
    { id: "team",       name: "Fahrer & Fahrzeuge", kurz: "Team",      symbol: "team",       braucht: ["fahrten.read", "planung.read", "personal.read", "fleet.read"] },
    { id: "kalender",   name: "Kalender",           kurz: "Kalender",  symbol: "kalender",   braucht: ["fahrten.read", "planung.read", "personal.read", "krankheit.read", "fleet.read"] },
    { id: "meldungen",  name: "Meldungen",          kurz: "Meldungen", symbol: "meldungen",  braucht: "self.read" },
    { id: "kunden",     name: "Kunden",             kurz: "Kunden",    symbol: "kunden",     braucht: "customers.read" },
    { id: "personal",   name: "Personal",           kurz: "Personal",  symbol: "personal",   braucht: "personal.read" },
    { id: "lohn",       name: "Lohn",               kurz: "Lohn",      symbol: "lohn",       braucht: "payroll.read" },
    { id: "finanzen",   name: "Finanzen",           kurz: "Finanzen",  symbol: "finanzen",   braucht: "finance.read" },
    { id: "rewards",    name: "Rewards",            kurz: "Rewards",   symbol: "rewards",    braucht: "rewards.read" },
    { id: "analyse",    name: "Analyse",            kurz: "Analyse",   symbol: "analyse",    braucht: "analytics.read" },
    /* Nur fuer die Administration. "security.write" ist das Recht,
       Rechte zu vergeben - wer es nicht hat, sieht den Bereich nicht
       und kommt auch mit einem direkten Aufruf nicht hinein. */
    { id: "einstellungen", name: "Einstellungen",   kurz: "Rechte",    symbol: "einstellungen", braucht: "security.write" }
  ];

  /* ---- Zustand der Probe ---- */
  const zustand = {
    rolle: "dispatcher",
    /* Einzeln vergebene Faehigkeiten - zusaetzlich zur Rolle. So
       bekaeme eine Dispositionsperson die Urlaubsentscheidung, ohne
       dass die ganze Rolle erweitert wird. */
    zusatz: [],
    /* Welches KONTO angemeldet ist. Zwei Konten koennen dieselbe
       Rolle haben - dann entscheidet die Kennung, wer gehandelt hat. */
    konto: "U-DIS-01",
    bereich: "uebersicht",
    fahrtFilter: "alle",
    /* Der Tag der Planung als Datum - nicht mehr nur heute/morgen.
       Wird beim ersten Zeichnen auf den heutigen Tag gesetzt. */
    planDatum: "",
    planEntwurf: null,
    klicks: 0
  };

  /* Eine Faehigkeit - oder eine Liste, von der eine genuegt. Der
     Bereich "Fahrer & Fahrzeuge" ist der erste, den mehrere Rollen
     aus verschiedenen Gruenden brauchen. */
  const darf = (faehigkeit) => {
    /*
      Gefragt wird das angemeldete KONTO: seine Rolle plus seine
      einzelnen Freigaben. zustand.zusatz bleibt als dritter Weg
      bestehen - er wird in den Pruefläufen benutzt, um eine
      Faehigkeit vorzufuehren, ohne die Rolle zu aendern.
    */
    const konto = aktuellesKonto();
    const meine = rechteVon(konto).concat(zustand.zusatz);
    /* Eine grobe Kennung ist erfuellt, wenn EINE ihrer feinen
       Faehigkeiten vorliegt - siehe GROBE. */
    const hat = (f) => (GROBE[f]
      ? GROBE[f].some((x) => meine.includes(x))
      : meine.includes(f));
    if (Array.isArray(faehigkeit)) return faehigkeit.some(hat);
    return hat(faehigkeit);
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
  /* ============================================================
     Herkunft eines Fensters
     ============================================================
     GEMESSENER AUSGANGSFEHLER: Ein Klick im Kalender auf eine
     Krankmeldung oeffnete den richtigen Vorgang - wechselte aber im
     Hintergrund schon den Bereich. Beim Schliessen stand man deshalb
     in "Meldungen" statt wieder im Kalender. Beim Fahrzeugtermin
     dasselbe mit "Fahrer & Fahrzeuge".

     URSACHE: kal-ziel rief R.geheZu(bereich). Der Bereichswechsel war
     der Weg zum Datensatz, und danach gab es keinen Weg zurueck -
     die Herkunft war nirgends festgehalten.

     Jetzt wird sie festgehalten. Eine Herkunft besteht aus:
       bereich           wohin zurueck
       name              wie der Knopf heisst
       wiederherstellen  stellt den Zustand des Bereichs wieder her
       scroll / scrollHaupt  die Position

     Wer einen Datensatz direkt in seinem Fachbereich oeffnet, setzt
     keine Herkunft - dann fuehrt Schliessen wie bisher dorthin
     zurueck. Es gibt bewusst KEINE feste Ruecksprungseite.
  */
  let herkunft = null;
  const herkunftLesen = () => herkunft;
  const herkunftSetzen = (h) => { herkunft = h || null; };
  const herkunftLoeschen = () => { herkunft = null; };

  function zurueckZurHerkunft() {
    if (!herkunft) return false;
    const h = herkunft;
    /* Zuerst loeschen: Das Zeichnen darf nicht erneut zurueckspringen. */
    herkunft = null;
    if (typeof h.wiederherstellen === "function") h.wiederherstellen();
    zustand.bereich = h.bereich;
    zeichnen();
    /* Die Position erst nach dem Zeichnen - zeichnen() setzt sie auf 0. */
    window.requestAnimationFrame(() => {
      if (typeof h.scroll === "number") window.scrollTo(0, h.scroll);
      const haupt = document.querySelector("[data-haupt]");
      if (haupt && typeof h.scrollHaupt === "number") haupt.scrollTop = h.scrollHaupt;
    });
    return true;
  }

  /* Die aktuelle Position festhalten - gehoert in jede Herkunft. */
  const scrollJetzt = () => {
    const haupt = document.querySelector("[data-haupt]");
    return {
      scroll: window.scrollY || 0,
      scrollHaupt: haupt ? haupt.scrollTop : 0
    };
  };

  let dialogSchutz = null;
  const dialogSchutzSetzen = (fn) => { dialogSchutz = fn; };

  function dialogOeffnen(markup, ausloeser) {
    dialogAusloeser = ausloeser || document.activeElement;
    const ziel = document.querySelector("[data-dialog]");
    ziel.innerHTML = markup;
    ziel.hidden = false;
    document.body.style.overflow = "hidden";
    /*
      Kommt dieses Fenster aus einem anderen Bereich, braucht es einen
      benannten Weg zurueck. Er wird HIER eingesetzt, an einer Stelle
      fuer jedes Fenster - nicht in jedem Dialog einzeln. Sonst haette
      jeder neue Dialog die Chance, ihn zu vergessen.

      "Schliessen" und Escape fuehren ebenfalls dorthin zurueck (siehe
      dialogSchliessen). Der Knopf sagt es nur ausdruecklich.
    */
    if (herkunft && !ziel.querySelector("[data-herkunft-zurueck]")) {
      const fuss = ziel.querySelector(".dialog-fuss");
      const knopf = document.createElement("button");
      knopf.className = "knopf";
      knopf.type = "button";
      knopf.setAttribute("data-herkunft-zurueck", "");
      knopf.textContent = "Zurück zum " + (herkunft.name || "vorherigen Bereich");
      if (fuss) fuss.prepend(knopf);
      else {
        const kopf = ziel.querySelector(".dialog-kopf");
        if (kopf) kopf.appendChild(knopf);
      }
    }
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
      || (window.ProbeVorgaenge && window.ProbeVorgaenge.offeneEingabe && window.ProbeVorgaenge.offeneEingabe())
      || (window.ProbeAkten && window.ProbeAkten.offeneEingabe && window.ProbeAkten.offeneEingabe())
      || (window.ProbeEinstellungen && window.ProbeEinstellungen.offeneEingabe
          && window.ProbeEinstellungen.offeneEingabe());
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
    /* Den Modulen sagen, dass ihr Fenster endgueltig zu ist. Sie
       raeumen dann ihre eigenen Wege ab - der Rahmen kennt sie nicht. */
    if (window.ProbeAkten && window.ProbeAkten.geschlossen) window.ProbeAkten.geschlossen();
    /* Kam das Fenster aus einem anderen Bereich, geht es dorthin
       zurueck - mit Ansicht, Datum, Filtern und Position. */
    if (herkunft) zurueckZurHerkunft();
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

    /*
      Die Kontowahl erscheint nur, wenn es fuer diese Rolle mehr als
      ein Konto gibt. Ein Auswahlfeld mit einem einzigen Eintrag ist
      eine Bedienung, die nichts bedient.
    */
    const kontowahl = document.querySelector("[data-kontowahl]");
    if (kontowahl) {
      const eigene = KONTEN.filter((k) => k.rolle === zustand.rolle);
      kontowahl.hidden = eigene.length < 2;
      if (eigene.length > 1) {
        const jetzt = aktuellesKonto();
        kontowahl.innerHTML = "Konto"
          + '<select data-konto aria-label="Handelndes Konto wählen">'
          + eigene.map((k) => '<option value="' + h(k.kennung) + '"'
            + (k.kennung === jetzt.kennung ? " selected" : "")
            + ">" + h(k.name) + "</option>").join("")
          + "</select>";
      }
    }

    const name = document.querySelector("[data-rollenname]");
    if (name) {
      const k = aktuellesKonto();
      name.textContent = k.name + " · " + k.anzeige + " · " + k.kennung;
    }
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
    let anfangId = null;
    let endeId = null;
    try { anfangId = el.selectionStart; endeId = el.selectionEnd; } catch { /* nicht jedes Feld */ }
    /*
      Eine id ist eindeutig - der Datensatzschluessel ist es nicht.
      Bei zwei Datumsfeldern nebeneinander trug der bisherige Weg
      immer den Waehler "[data-datum]" und traf damit das erste Feld.
      Der Fokus sprang vom Bis-Feld ins Von-Feld.
    */
    if (el.id) {
      return { wahl: "#" + el.id, anfang: anfangId, ende: endeId };
    }
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
      <span class="pk-rolle">Angemeldet als <strong>${h(benutzerText())}</strong></span>
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
    /* Ein Sprung kann einen Dialog angefordert haben. Das geht erst
       jetzt, wo die Flaeche steht. */
    if (window.ProbeBereiche.nachZeichnen) window.ProbeBereiche.nachZeichnen();
    fokusWiederherstellen(merker);
    if (!merker) { ziel.scrollTop = 0; window.scrollTo(0, 0); }
  }

  function geheZu(bereichId) {
    if (!BEREICHE.some((b) => b.id === bereichId)) return;
    /* Wer selbst woandershin geht, gibt die Herkunft auf - sonst
       sprang das Schliessen eines spaeteren Fensters zurueck in einen
       Bereich, den der Mensch laengst verlassen hat. */
    herkunft = null;
    zustand.bereich = bereichId;
    if (dialogOffen()) dialogSchliessen(true);
    zeichnen();
  }

  /*
    Derselbe Wechsel, aber mit festgehaltener Herkunft. Der Kalender
    benutzt das: Er fuehrt zum Datensatz und bleibt als Rueckweg
    bestehen.
  */
  function geheZuMitHerkunft(bereichId, h) {
    if (!BEREICHE.some((b) => b.id === bereichId)) return;
    herkunft = null;
    if (dialogOffen()) dialogSchliessen(true);
    herkunft = h || null;
    zustand.bereich = bereichId;
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
      if (e.target.closest("[data-herkunft-zurueck]")) {
        /* Erzwingen: Der Weg zurueck in den Kalender ist kein Verlust
           von Eingaben - er behaelt den Vorgang offen im Bestand. Die
           Sicherheitsabfrage gehoert an das endgueltige Verlassen. */
        dialogSchliessen(true);
        return;
      }
      if (e.target.closest("[data-dialog-zu]")) { dialogSchliessen(); return; }

      const ziel = e.target.closest("[data-ziel]");
      if (ziel && ziel.dataset.ziel) {
        zustand.klicks += 1;
        const [bereichId, zusatz] = ziel.dataset.ziel.split(":");
        /*
          Der Zusatz gehoert dem Zielbereich, nicht pauschal den
          Fahrten. Das Zielmodul entscheidet, was damit zu tun ist -
          sonst setzt ein Sprung in die Meldungen den Fahrtfilter.
        */
        if (zusatz) {
          if (bereichId === "fahrten") zustand.fahrtFilter = zusatz;
          else if (window.ProbeBereiche && window.ProbeBereiche.sprungziel) {
            window.ProbeBereiche.sprungziel(bereichId, zusatz);
          }
        }
        geheZu(bereichId);
        return;
      }

      const tun = e.target.closest("[data-tun]");
      if (tun) { zustand.klicks += 1; window.ProbeBereiche.tun(tun.dataset.tun, tun); }
    });

    document.addEventListener("change", (e) => {
      if (e.target.matches("[data-konto]")) {
        /* Innerhalb derselben Rolle das Konto wechseln. */
        const k = kontoVon(e.target.value);
        if (k) { zustand.konto = k.kennung; zustand.rolle = k.rolle; }
        if (dialogOffen()) dialogSchliessen(true);
        zeichnen();
        return;
      }
      if (e.target.matches("[data-rolle]")) {
        zustand.rolle = e.target.value;
        zustand.zusatz = [];
        /* Das erste Konto dieser Rolle wird angemeldet. */
        const erstes = KONTEN.find((k) => k.rolle === zustand.rolle);
        zustand.konto = erstes ? erstes.kennung : "";
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
      /*
        Die Bereiche werden ZUERST gefragt, und zwar auch ohne offenen
        Dialog. Vorher lief dieser Handler nur bei offenem Fenster -
        damit kam Enter in einem Suchfeld der Flaeche nie an. Im
        manuellen Rundgang sah das aus wie "Enter bewirkt nichts".
      */
      if (window.ProbeBereiche.taste && window.ProbeBereiche.taste(e) === true) return;
      if (!dialogOffen()) return;
      if (e.key === "Escape") {
        e.preventDefault();
        /*
          Escape ist der sichere Rueckweg, nicht der Notausgang.

          Hat ein Fenster einen eigenen Rueckweg - etwa eine
          Finanzaktion zurueck in ihre Rechnung -, fuehrt Escape
          dorthin. Nur wenn es keinen gibt, schliesst es.
        */
        if (window.ProbeAkten && window.ProbeAkten.escape && window.ProbeAkten.escape() === true) return;
        dialogSchliessen();
        return;
      }
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
    herkunftLesen, herkunftSetzen, herkunftLoeschen, zurueckZurHerkunft,
    geheZuMitHerkunft, scrollJetzt,
    BENUTZER, benutzer, benutzerText,
    KONTEN, kontoVon, aktuellesKonto, rechteVon, rollenRechte, kontoRechte,
    FAEHIGKEITEN, GROBE, sichtbareBereiche,
    ROLLENNAMEN, BEREICHE
  };

  document.addEventListener("DOMContentLoaded", () => {
    bedienungBinden();
    zeichnen();
  });
})();
