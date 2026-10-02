/* ============================================================
   Designprobe Betriebsportal - Meldungen & Aufgaben
   ============================================================
   Ein Eingang fuer alles, was bearbeitet werden muss. Vier Arten -
   Meldung, Aufgabe, Warnung, Nachricht - in einer Liste, aber jede
   deutlich bezeichnet.

   Grundsaetze wie in den freigegebenen Bereichen:
   - ein Weg je Aufgabe, eine Hauptaktion je Vorgang
   - nichts wird still uebernommen
   - begruendungspflichtige Entscheidungen zweistufig
   - ein geschriebener Protokolleintrag bleibt unveraenderlich

   Der Zustand ist derselbe wie in Planung und "Fahrer & Fahrzeuge".
   Ein genehmigter Urlaub schreibt in D.abwesenheiten - es gibt keine
   zweite Kopie.

   Kein Netzzugriff, kein Upload, kein Versand.
   ============================================================ */
(() => {
  "use strict";

  const R = window.ProbeRahmen;
  const D = window.ProbeDaten;
  const h = R.h;

  let P = null;
  const anmelden = (planung) => { P = planung; };

  /* ---- Faehigkeiten ---- */
  const darfEntscheiden = () => R.darf("absence.decide");
  const darfVertraulich = () => R.darf("personnel.read");
  const darfEmpfehlen = () => R.darf("operations.write");

  const stand = {
    reiter: "neu",
    thema: "alle",
    suche: "",
    vonDatum: "",
    bisDatum: "",
    offen: "",          // offener Vorgang
    entscheidung: null, // { id, art, grund, stufe, fehler }
    uebernahme: null,
    wiedereroeffnen: null,
    einsicht: null,
    /* Wo im Vorgang stand der Blick, bevor die Vorschau aufging? */
    rollstand: 0,
    verlassenGefragt: false,
    pruefkorrektur: null,
    zuordnung: null,
    auswahl: null,
    /* Kurze Rueckmeldung nach dem Entfernen aus der Erledigt-Liste,
       mit "Rueckgaengig". Siehe vg-aus-liste. */
    rueckmeldung: null,
    oeffneNachZeichnen: "",
    /* Fuer die Vorfuehrung der Paralleländerung. */
    fremdstand: {}
  };

  const REITER = [
    { id: "neu",         name: "Neu" },
    { id: "zugewiesen",  name: "Mir zugewiesen" },
    { id: "bearbeitung", name: "In Bearbeitung" },
    { id: "warten",      name: "Wartet auf Rückmeldung" },
    { id: "warnungen",   name: "Offene Warnungen" },
    { id: "erledigt",    name: "Erledigt" },
    { id: "archiv",      name: "Archiv" },
    { id: "alle",        name: "Alle" }
  ];

  const THEMEN = [
    { id: "alle",      name: "Alle Themen" },
    { id: "urlaub",    name: "Urlaub" },
    { id: "krankheit", name: "Krankheit" },
    { id: "dokument",  name: "Dokumente" },
    { id: "fahrt",     name: "Fahrten und Kundenanfragen" },
    { id: "fahrzeug",  name: "Fahrzeuge" },
    { id: "finanzen",  name: "Rechnungen und Zahlungen" },
    { id: "system",    name: "Systemwarnungen" },
    { id: "nachricht", name: "Betriebliche Nachrichten" }
  ];

  const meineRolle = () => R.ROLLENNAMEN[R.zustand.rolle];
  const meinKonto = () => R.benutzer();
  const meinName = () => R.benutzerText();
  const kontoText = (k) => (k ? k.name + " – " + k.rolle : "");

  /*
    Der Gesamtstand eines Vorgangs mit Teilschritten wird BERECHNET,
    nicht gespeichert. Erledigt ist er erst, wenn jeder Pflichtteil
    abgeschlossen ist. Damit kann niemand den ganzen Vorgang
    schliessen, indem er nur seinen eigenen Teil bearbeitet.
  */
  function gesamtstand(v) {
    if (!v.teile) return v.zustand;
    const teile = Object.values(v.teile);
    if (teile.every((x) => x.zustand === "erledigt")) return "erledigt";
    if (teile.some((x) => x.zustand === "erledigt" || x.verantwortlich)) return "bearbeitung";
    return "neu";
  }

  /*
    Darf dieser Teilschritt abgeschlossen werden?
    Leerer Rueckgabewert heisst ja. Sonst steht hier der Grund, der
    dem Bearbeiter auch angezeigt wird - eine gesperrte Aktion ohne
    Begruendung ist keine Hilfe.

    Es geht ausdruecklich NICHT darum, welches Ergebnis jemand
    eintraegt. Es geht darum, dass ueberhaupt eines vorliegt und dass
    die Datei vorher geoeffnet wurde. Was aus einem auffaelligen
    Ergebnis betrieblich folgt, ist eine Geschaeftsregel und steht
    hier bewusst nicht.
  */
  /* Der aktuelle Nachweis ist immer der letzte der Kette. */
  const nachweise = (v) => (v.daten && v.daten.nachweise) || [];
  const aktuellerNachweis = (v) => {
    const liste = nachweise(v);
    return liste.length ? liste[liste.length - 1] : null;
  };
  const ergebnisVon = (id) => D.PRUEFERGEBNISSE.find((x) => x.id === id) || null;
  const offeneKlaerungen = (v) =>
    ((v.daten && v.daten.klaerungen) || []).filter((k) => k.zustand === "offen");

  /*
    Darf dieser Teilschritt abgeschlossen werden?

    Leerer Rueckgabewert heisst ja. Sonst steht hier der Grund, der
    dem Bearbeiter auch angezeigt wird - eine gesperrte Aktion ohne
    Begruendung ist keine Hilfe.

    Die Reihenfolge der Pruefungen bildet die Vorgabe des
    Geschaeftsfuehrers vom 01.10.2026 ab:

      "Alles in Ordnung"   -> abschliessbar
      "Zeitraum weicht ab" -> offen, bis die Rueckfrage geklaert ist
      "Nicht lesbar"       -> offen, bis eine NEUE Datei eingegangen
                              UND ihrerseits geprueft ist

    Weil nach einer neuen Datei immer wieder der letzte Nachweis
    geprueft wird, ergibt sich der dritte Fall von selbst: Die neue
    Datei hat noch keine Einsicht, also greift gleich die erste
    Bedingung.
  */
  /*
    Darf dieser Nachweis ueberhaupt als Pruefgrundlage dienen?

    Nein, solange seine Zuordnung ungeklaert ist, und nein, wenn er
    inzwischen einem anderen Vorgang zugeordnet wurde. Beides heisst
    ausdruecklich NICHT, dass die Datei verschwindet - sie bleibt
    stehen, sie taugt hier nur nicht als Nachweis.
  */
  const verwendbar = (nw) =>
    Boolean(nw) && !nw.zuordnungUngeklaert && !nw.umgezogenNach;

  /*
    Was fehlt noch, bevor DIESER Teilschritt abgeschlossen werden
    darf? Leerer Rueckgabewert heisst: nichts.

    Die Uebernahme steht bewusst an erster Stelle. Wer einen
    Teilschritt abschliesst, uebernimmt damit die Verantwortung
    dafuer - dann soll er auch als Verantwortlicher dastehen und
    nicht als jemand, der im Vorbeigehen einen Haken gesetzt hat.
  */
  function teilOffen(v, teil) {
    if (!teil) return "";
    const meine = meinKonto().kennung;
    if (!teil.verantwortlich) {
      return "Der Teilschritt ist noch niemandem zugewiesen. Bitte zuerst übernehmen.";
    }
    if (teil.verantwortlich.kennung !== meine) {
      return "Verantwortlich ist " + kontoText(teil.verantwortlich)
        + ". Übernehmen Sie den Teilschritt, wenn Sie ihn abschließen wollen.";
    }
    return pruefungOffen(v, teil.erfordert);
  }

  function pruefungOffen(v, erfordert) {
    if (erfordert !== "bescheinigung") return "";
    const nw = aktuellerNachweis(v);
    if (!nw) return "Es liegt keine Bescheinigung vor.";
    if (nw.zuordnungUngeklaert) {
      return "Die Zuordnung dieses Nachweises ist ungeklärt. Er darf nicht als geprüft gelten.";
    }
    if (nw.umgezogenNach) {
      return "Dieser Nachweis gehört zu Vorgang " + nw.umgezogenNach
        + ". Für diesen Vorgang liegt keine verwendbare Bescheinigung vor.";
    }
    if (!nw.einsicht) {
      return nw.nr > 1
        ? "Die neue Bescheinigung wurde noch nicht geöffnet."
        : "Die Bescheinigung wurde noch nicht geöffnet.";
    }
    if (!nw.ergebnis) return "Es liegt noch kein Prüfergebnis vor.";
    const offen = offeneKlaerungen(v);
    if (offen.length) {
      return offen[0].art === "anforderung"
        ? "Es wurde eine neue Bescheinigung angefordert. Sie ist noch nicht eingegangen."
        : "Die Rückfrage zum Zeitraum ist noch nicht geklärt.";
    }
    const e = ergebnisVon(nw.ergebnis);
    if (!e) return "Das Prüfergebnis ist unbekannt.";
    if (e.folge === "abschliessbar") return "";
    /*
      Das Ergebnis verlangte eine Folge. Dann muss es dazu auch eine
      Klaerung geben, und die muss erledigt sein. Offene Klaerungen
      sind oben schon abgefangen; hier bleibt der Fall, dass gar
      keine angelegt wurde - der duerfte nicht vorkommen und wird
      deshalb als Sperre behandelt, nicht als Freigabe.
    */
    const dazu = ((v.daten && v.daten.klaerungen) || [])
      .filter((k) => k.nachweisNr === nw.nr);
    if (!dazu.length) return e.erklaerung;
    if (dazu.some((k) => k.zustand !== "geklaert")) return e.erklaerung;
    return "";
  }

  /* Alle Teilschritte, die diese Rolle bearbeiten darf. Die
     Administration hat mehrere - deshalb handelt sie ueber die
     Knoepfe am Teilschritt und nicht ueber eine mehrdeutige
     Hauptaktion. */
  function meineTeile(v) {
    if (!v.teile) return [];
    return Object.entries(v.teile)
      .filter(([, x]) => R.darf(x.braucht))
      .map(([schluessel, x]) => ({ schluessel, ...x }));
  }

  /* Der Teilschritt, den DIESE Rolle bearbeiten darf. */
  function meinTeil(v) {
    if (!v.teile) return null;
    const treffer = Object.entries(v.teile).find(([, x]) => R.darf(x.braucht));
    return treffer ? { schluessel: treffer[0], ...treffer[1] } : null;
  }

  /* Braucht die Uebernahme einen Grund? Ja, wenn schon jemand
     anderes daran arbeitet oder der Teil vertraulich ist. */
  function uebernahmeBrauchtGrund(v, teil) {
    const schon = teil ? teil.verantwortlich : v.verantwortlich;
    const vertraulich = teil ? teil.vertraulich : Boolean(v.vertraulich.length);
    if (schon && schon.kennung !== meinKonto().kennung) return true;
    return vertraulich && Boolean(schon);
  }
  const jetzt = () => new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) + " Uhr";
  const datumText = (iso) => iso
    ? new Date(iso + "T00:00:00").toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "—";

  /* Arbeitstage zwischen zwei Tagen - Samstag und Sonntag zaehlen
     nicht. Feiertage kennt die Probe nicht; das waere eine
     Geschaeftsregel und wird nicht erfunden. */
  function arbeitstage(von, bis) {
    if (!von || !bis) return 0;
    let tage = 0;
    const d = new Date(von + "T00:00:00");
    const ende = new Date(bis + "T00:00:00");
    while (d <= ende) {
      const w = d.getDay();
      if (w !== 0 && w !== 6) tage += 1;
      d.setDate(d.getDate() + 1);
    }
    return tage;
  }

  /* ============================================================
     Abgeleitete Warnungen
     ============================================================
     Sie werden jedes Mal neu aus dem Zustand gebildet. Gespeichert
     ist nur, wie jemand mit ihnen umgegangen ist.
  */
  function abgeleiteteWarnungen() {
    const liste = [];

    /* Dokumente. */
    for (const m of D.mitarbeiter) {
      const stand2 = D.dokumentstand(m.id);
      for (const e of stand2.eintraege) {
        if (e.lage === "gueltig") continue;
        const id = `W-dok-${m.id}-${e.art.slice(0, 6)}`;
        liste.push({
          id, art: "warnung", thema: "dokument", abgeleitet: true,
          titel: `${e.art}: ${D.DOKUMENT_LAGE[e.lage]} – ${m.name}`,
          betrifft: { art: "mitarbeiter", id: m.id, name: m.name },
          eingang: "laufend", eingangIso: D.alsIso(D.heute),
          dringlichkeit: e.lage === "fehlt" || e.lage === "abgelaufen" ? "hoch" : "normal",
          sichtbar: ["operations.read", "personnel.read"],
          /* Den Dateiinhalt sehen nur Personal und Administration. */
          vertraulich: ["personnel.read"],
          daten: { art: e.art, frist: e.bis, lage: e.lage, datei: `Testnachweis-${m.id}.pdf` },
          empfehlung: "", antwort: "", notizen: [], version: 1
        });
      }
    }

    /* Planungskonflikte des angezeigten Tages. */
    const e = P.planEntwurf();
    for (const k of P.konflikteVon(e)) {
      const id = `W-plan-${k.kennung}-${k.kurz.slice(0, 10)}`;
      liste.push({
        id, art: "warnung", thema: k.art === "technisch" ? "system" : "fahrzeug",
        abgeleitet: true,
        titel: `${k.kurz} – Planung`,
        betrifft: { art: "mitarbeiter", id: k.kennung, name: (D.mitarbeiter.find((m) => m.id === k.kennung) || {}).name || k.kennung },
        eingang: "laufend", eingangIso: D.alsIso(D.heute),
        dringlichkeit: k.art === "technisch" ? "hoch" : "normal",
        sichtbar: ["operations.read"], vertraulich: [],
        daten: { text: k.text },
        empfehlung: "", antwort: "", notizen: [], version: 1
      });
    }

    /* Die gespeicherte Handhabung daruebermischen. */
    return liste.map((w) => ({ ...w, ...(D.warnungsHandhabung[w.id] || { zustand: "neu", zustaendig: "", gesehen: false }) }));
  }

  const alleVorgaenge = () => D.vorgaenge.concat(abgeleiteteWarnungen());

  /* 90 Tage nach dem Abschluss wechselt ein Vorgang ins Archiv. Er
     bleibt dort vollstaendig auffindbar; geloescht wird in dieser
     Probe nichts. Eine spaetere echte Loeschung waere eine eigene
     Aufbewahrungsregel und nicht Sache dieser Ansicht. */
  /*
    VIER Zustaende, die oft verwechselt werden. Sie sind hier
    ausdruecklich getrennt benannt, weil der Rundgang gezeigt hat,
    dass "weg aus meiner Liste" und "geloescht" leicht dasselbe zu
    sein scheinen:

      fachlich erledigt  jeder Pflichtteil ist abgeschlossen.
                         Berechnet aus den Teilschritten.

      ausgeblendet       ein Mensch hat den Vorgang aus seiner
                         taeglichen Arbeitsliste genommen. Eine
                         Entscheidung ueber die ANSICHT, nicht ueber
                         die Daten. Nichts wird geloescht.

      archiviert         90 Tage nach dem Abschluss, automatisch.
                         Eine Entscheidung der Zeit, nicht eines
                         Menschen.

      wiedereroeffnet    der Abschluss ist zurueckgenommen. Dabei
                         wird auch eine Ausblendung aufgehoben -
                         sonst waere der Vorgang wieder zu tun und
                         trotzdem unsichtbar.

    Ausgeblendete und archivierte Vorgaenge stehen gemeinsam im
    Reiter "Archiv". Beide sind vollstaendig auffindbar; die Ansicht
    sagt jeweils, warum sie dort stehen.
  */
  const LISTENSTAENDE = {
    sichtbar:     "in der Arbeitsliste",
    ausgeblendet: "aus der Arbeitsliste entfernt"
  };
  const istAusgeblendet = (v) => Boolean(v.ausListe);

  const ARCHIV_NACH_TAGEN = 90;
  function imArchiv(v) {
    if (gesamtstand(v) !== "erledigt") return false;
    if (v.zustand === "archiviert") return true;
    if (!v.archivAb) return false;
    return D.alsIso(D.heute) >= v.archivAb;
  }
  function archivDatum(abschlussIso) {
    const d = new Date(abschlussIso + "T00:00:00");
    d.setDate(d.getDate() + ARCHIV_NACH_TAGEN);
    return D.alsIso(d);
  }

  const sichtbarFuerMich = (v) => R.darf(v.sichtbar);
  const vertraulichSichtbar = (v) => !v.vertraulich.length || R.darf(v.vertraulich);

  /*
    Die offenen Warnungen. EINE Definition fuer die Kennzahl der
    Uebersicht, den Reiter und den Navigationszaehler.

    Enthalten ist, was dringend ist oder als Warnung entstanden ist -
    und was noch nicht erledigt ist. Erledigte gehoeren nie dazu.
  */
  const offeneWarnungen = () => alleVorgaenge()
    .filter(sichtbarFuerMich)
    .filter((v) => gesamtstand(v) !== "erledigt")
    .filter((v) => v.art === "warnung" || v.dringlichkeit === "hoch");

  const ungesehen = () => alleVorgaenge().filter((v) => sichtbarFuerMich(v) && !v.gesehen);

  /* ============================================================
     Liste
     ============================================================ */
  /* Mir zugewiesen heisst: mein Konto ist verantwortlich - fuer den
     ganzen Vorgang oder fuer einen seiner Teilschritte. */
  function mirZugewiesen(v) {
    if (gesamtstand(v) === "erledigt") return false;
    const meine = meinKonto().kennung;
    if (v.verantwortlich && v.verantwortlich.kennung === meine) return true;
    if (v.teile) {
      return Object.values(v.teile).some((x) => x.verantwortlich && x.verantwortlich.kennung === meine);
    }
    return v.zustaendig === meinName();
  }

  /* Der Zeitraum hilft nur dort, wo viele abgeschlossene Vorgaenge
     liegen - in "Erledigt", "Archiv" und "Alle". */
  const zeitraumSichtbar = () =>
    stand.reiter === "archiv" || stand.reiter === "erledigt" || stand.reiter === "alle";

  function gefiltert() {
    let liste = alleVorgaenge().filter(sichtbarFuerMich);
    /*
      Die offenen Warnungen - genau die Menge, deren Zahl auf der
      Uebersicht steht. Vorher sprang die Kennzahl in den zuletzt
      gewaehlten Reiter; im Rundgang war das "Erledigt (3)".
    */
    if (stand.reiter === "warnungen") liste = offeneWarnungen();
    if (stand.reiter === "neu") liste = liste.filter((v) => gesamtstand(v) === "neu");
    if (stand.reiter === "zugewiesen") liste = liste.filter(mirZugewiesen);
    if (stand.reiter === "bearbeitung") liste = liste.filter((v) => gesamtstand(v) === "bearbeitung");
    if (stand.reiter === "warten") liste = liste.filter((v) => gesamtstand(v) === "warten");
    /* Erledigt bleibt 90 Tage sichtbar, danach steht der Vorgang im
       Archiv. Geloescht wird nichts - weder hier noch dort. */
    /* Erledigt zeigt die Arbeitsliste: fachlich fertig, noch nicht
       archiviert und nicht ausgeblendet. */
    if (stand.reiter === "erledigt") {
      liste = liste.filter((v) => gesamtstand(v) === "erledigt"
        && !imArchiv(v) && !istAusgeblendet(v));
    }
    /* Archiv zeigt beides: automatisch archiviert UND von Hand
       ausgeblendet. Nichts verschwindet. */
    if (stand.reiter === "archiv") liste = liste.filter((v) => imArchiv(v) || istAusgeblendet(v));
    if (stand.thema !== "alle") liste = liste.filter((v) => v.thema === stand.thema);
    /* Zeitraum. Gesucht wird nach dem Abschlussdatum, solange es eines
       gibt - sonst nach dem Eingang. Damit findet man im Archiv
       sowohl "wann kam das rein" als auch "wann war das erledigt". */
    if (stand.vonDatum || stand.bisDatum) {
      liste = liste.filter((v) => {
        const tag = v.abgeschlossenAm || v.eingangIso || "";
        if (!tag) return false;
        if (stand.vonDatum && tag < stand.vonDatum) return false;
        if (stand.bisDatum && tag > stand.bisDatum) return false;
        return true;
      });
    }
    if (stand.suche) {
      const s = stand.suche.toLowerCase();
      liste = liste.filter((v) =>
        v.titel.toLowerCase().includes(s)
        || (v.betrifft.name || "").toLowerCase().includes(s)
        || v.id.toLowerCase().includes(s));
    }
    return liste;
  }

  const ARTMARKE = {
    aufgabe:   ["aktiv", "Aufgabe"],
    meldung:   ["ruhig", "Meldung"],
    warnung:   ["warnung", "Warnung"],
    nachricht: ["gut", "Nachricht"]
  };

  /*
    Wonach richten sich die Aktionen auf der Listenkarte?

    Nach dem Teilschritt, der mir offensteht - und nur nach dem. Der
    manuelle Test hat gezeigt, warum: Nach dem Abschluss der eigenen
    Personalpruefung standen auf der Karte weiter "Uebernehmen" und
    "Weitergeben", obwohl der eigene Teil fertig war und nur noch der
    Teilschritt einer ANDEREN Rolle offen war. Beide Knoepfe haetten
    dort nichts bewirkt - oder Schlimmeres: den fremden Teil
    angefasst.

    Rueckgabe:
      schluessel  der eigene offene Teilschritt, sonst ""
      meins       ist er mir zugewiesen?
      fremdOffen  ist (nur) ein fremder Teilschritt offen?
  */
  function kartenlage(v) {
    const fertig = gesamtstand(v) === "erledigt";
    if (fertig) return { fertig, schluessel: "", meins: false, fremdOffen: false };

    if (!v.teile) {
      /* Vorgang ohne Teilschritte: der Vorgang selbst ist die Einheit. */
      const meine = meinKonto().kennung;
      const meins = Boolean(v.verantwortlich && v.verantwortlich.kennung === meine);
      return {
        fertig: false, schluessel: "", ohneTeile: true,
        meins, frei: !v.verantwortlich, fremdOffen: Boolean(v.verantwortlich) && !meins
      };
    }

    const meine = meinKonto().kennung;
    const offeneEigene = Object.entries(v.teile)
      .filter(([, x]) => R.darf(x.braucht) && x.zustand !== "erledigt");
    const offeneFremde = Object.entries(v.teile)
      .filter(([, x]) => !R.darf(x.braucht) && x.zustand !== "erledigt");

    if (!offeneEigene.length) {
      return {
        fertig: false, schluessel: "", meins: false, frei: false,
        fremdOffen: offeneFremde.length > 0
      };
    }
    const [schluessel, x] = offeneEigene[0];
    return {
      fertig: false, schluessel,
      meins: Boolean(x.verantwortlich && x.verantwortlich.kennung === meine),
      frei: !x.verantwortlich,
      fremdOffen: false
    };
  }

  /*
    Die Hauptaktion der LISTENKARTE.

    Sie oeffnet ausschliesslich den Vorgang und speichert nichts.
    Deshalb darf sie auch nur das versprechen.

    Hier stand frueher der Name des eigenen Teilschritts - also
    "Dokumentpruefung abgeschlossen", und zwar auf einem goldenen
    Hauptknopf, bei einem neuen Vorgang, ohne Verantwortlichen und
    ohne dass die Bescheinigung geoeffnet war. Der Klick hat zwar nur
    geoeffnet, aber die Beschriftung hat etwas anderes behauptet. Das
    ist genau die Sorte Knopf, die jemanden glauben laesst, er haette
    etwas abgeschlossen.

    Ein Abschluss wird ausschliesslich IM geoeffneten Vorgang
    angeboten, am jeweiligen Teilschritt, und auch dort nur, wenn
    alle Voraussetzungen erfuellt sind.
  */
  function hauptaktion(v) {
    const auf = `vg-oeffnen:${v.id}`;
    const lage = kartenlage(v);
    if (lage.fertig) return { name: "Ansehen", tun: auf };
    /*
      Steht mir hier nichts offen - weil mein Teilschritt fertig ist
      oder mir gar keiner gehoert -, dann heisst der Knopf "ansehen"
      und nicht "pruefen". Sonst verspricht er eine Arbeit, die es
      fuer mich nicht gibt.
    */
    const nurAnsehen = !lage.schluessel && !lage.ohneTeile;
    if (v.thema === "urlaub" && v.art === "aufgabe") {
      return { name: nurAnsehen ? "Antrag ansehen" : "Antrag öffnen", tun: auf };
    }
    if (v.thema === "krankheit") {
      return { name: nurAnsehen ? "Krankmeldung ansehen" : "Krankmeldung prüfen", tun: auf };
    }
    if (v.thema === "fahrt") return { name: "Zur Fahrt", tun: auf };
    if (v.thema === "dokument") {
      return { name: nurAnsehen ? "Dokument ansehen" : "Dokument öffnen", tun: auf };
    }
    return { name: nurAnsehen ? "Vorgang ansehen" : "Vorgang öffnen", tun: auf };
  }

  const verantwortlichText = (v) => {
    if (v.verantwortlich) return h(kontoText(v.verantwortlich));
    if (v.teile) {
      const mit = Object.values(v.teile).filter((x) => x.verantwortlich);
      if (mit.length) return mit.map((x) => h(kontoText(x.verantwortlich))).join(", ");
    }
    return v.zustaendig ? h(v.zustaendig) : "noch niemand";
  };

  function zeile(v) {
    const marke = ARTMARKE[v.art];
    const aktion = hauptaktion(v);
    return `<article class="vorgang ${v.gesehen ? "" : "ist-neu"}" data-vorgang="${h(v.id)}"
        data-art="${h(v.art)}" data-zustand="${h(v.zustand)}">
      <div class="vg-kopf">
        ${R.marke(marke[0], marke[1])}
        <span class="vg-thema">${h(D.VORGANG_THEMEN[v.thema] || v.thema)}</span>
        ${v.dringlichkeit === "hoch" ? R.marke("warnung", "dringend") : ""}
        ${v.gesehen ? "" : '<span class="vg-punkt" aria-label="noch nicht gesehen"></span>'}
      </div>
      <h3 class="vg-titel">${h(v.titel)}</h3>
      <dl class="vg-daten">
        <div><dt>Betrifft</dt><dd>${h(v.betrifft.name || "—")}</dd></div>
        <div><dt>Eingang</dt><dd>${h(v.eingang)}</dd></div>
        <div><dt>Verantwortlich</dt><dd>${verantwortlichText(v)}</dd></div>
        ${v.letzterBearbeiter ? `<div><dt>Zuletzt bearbeitet</dt><dd>${h(kontoText(v.letzterBearbeiter))} · ${h(v.letzterBearbeiter.zeit)}</dd></div>` : ""}
        <div><dt>Gesamtstand</dt><dd>${h(D.VORGANG_ZUSTAENDE[gesamtstand(v)])}</dd></div>
        ${v.abgeschlossenAm ? `<div><dt>Abgeschlossen</dt><dd>${h(datumText(v.abgeschlossenAm))}</dd></div>
          <div><dt>Archiv ab</dt><dd>${h(datumText(v.archivAb))}</dd></div>` : ""}
        ${istAusgeblendet(v) ? `<div><dt>Arbeitsliste</dt>
          <dd>${h(LISTENSTAENDE.ausgeblendet)} am ${h(v.ausListeAm)}
            ${v.ausListeVon ? " von " + h(kontoText(v.ausListeVon)) : ""}</dd></div>` : ""}
      </dl>
      ${v.teile ? `<ul class="vg-teile">
        ${Object.values(v.teile).map((x) => `<li class="ist-${x.zustand}">
          <strong>${h(x.name)}</strong>
          <span>${x.zustand === "erledigt" ? "erledigt" : "offen"}${x.verantwortlich ? " · " + h(kontoText(x.verantwortlich)) : ""}</span>
        </li>`).join("")}
      </ul>` : ""}
      <div class="vg-aktionen">
        <button class="knopf klein haupt-knopf" type="button" data-tun="${h(aktion.tun)}">${h(aktion.name)}</button>
        ${kartenaktionen(v)}
      </div>
    </article>`;
  }

  /*
    Die Nebenaktionen der Karte. Sie entstehen ausschliesslich aus
    einem Teilschritt, der mir offensteht:

      offen und unzugewiesen  -> "Uebernehmen"
      offen und meins         -> "Weitergeben"
      mein Teil erledigt      -> keine
      nur fremder Teil offen  -> keine
      ganzer Vorgang erledigt -> "Wiedereroeffnen", falls berechtigt

    Die Aktionen nennen den Teilschritt ausdruecklich. Damit kann die
    Karte nie den Teil einer anderen Rolle anfassen.
  */
  function kartenaktionen(v) {
    const lage = kartenlage(v);

    if (lage.fertig) {
      if (v.abgeleitet) return "";
      const wieder = R.darf("personnel.read")
        ? `<button class="knopf klein" type="button"
            data-tun="vg-wiedereroeffnen:${h(v.id)}">Wiedereröffnen</button>`
        : "";
      /*
        Aus der Arbeitsliste nehmen - KEIN Loeschen. Der Vorgang
        bleibt vollstaendig erhalten und steht danach im Archiv.
        Deshalb heisst der Knopf auch nicht "Entfernen", sondern
        sagt, woraus etwas entfernt wird.
      */
      const raus = istAusgeblendet(v)
        ? `<button class="knopf klein" type="button"
            data-tun="vg-in-liste:${h(v.id)}">Zurück in die Arbeitsliste</button>`
        : `<button class="knopf klein" type="button"
            data-tun="vg-aus-liste:${h(v.id)}">Aus Erledigt-Liste entfernen</button>`;
      return raus + wieder;
    }

    /* Vorgang ohne Teilschritte - er ist selbst die Einheit. */
    if (lage.ohneTeile) {
      if (lage.frei) {
        return `<button class="knopf klein" type="button"
          data-tun="vg-uebernehmen:${h(v.id)}">Übernehmen</button>`;
      }
      if (lage.meins) {
        return `<button class="knopf klein" type="button"
          data-tun="vg-weitergeben:${h(v.id)}">Weitergeben</button>`;
      }
      /* Jemand anderes hat ihn - uebernehmen geht, braucht aber einen
         Grund. Den fragt die Aktion selbst ab. */
      return `<button class="knopf klein" type="button"
        data-tun="vg-uebernehmen:${h(v.id)}">Übernehmen</button>`;
    }

    /* Mir steht kein Teilschritt offen. */
    if (!lage.schluessel) return "";

    if (lage.frei) {
      return `<button class="knopf klein" type="button"
        data-tun="vg-teil-uebernehmen:${h(v.id)}|${h(lage.schluessel)}">Übernehmen</button>`;
    }
    if (lage.meins) {
      return `<button class="knopf klein" type="button"
        data-tun="vg-teil-weitergeben:${h(v.id)}|${h(lage.schluessel)}">Weitergeben</button>`;
    }
    /* Jemand anderes bearbeitet meinen Teilschritt. Uebernehmen ist
       moeglich, die Aktion verlangt dann einen Grund. */
    return `<button class="knopf klein" type="button"
      data-tun="vg-teil-uebernehmen:${h(v.id)}|${h(lage.schluessel)}">Übernehmen</button>`;
  }

  /*
    Ein Sprung aus dem Kalender soll einen Dialog oeffnen. Das kann
    erst geschehen, wenn die Flaeche steht - deshalb wird der Wunsch
    gemerkt und hier eingeloest.
  */
  function nachZeichnen() {
    if (!stand.oeffneNachZeichnen) return;
    const wunsch = stand.oeffneNachZeichnen;
    stand.oeffneNachZeichnen = "";
    if (wunsch === "auswahl") {
      R.dialogOeffnen(auswahlDialog());
      return;
    }
    const v = vorgangFinden(wunsch);
    if (!v) return;
    handhabungSetzen(v, { gesehen: true });
    stand.offen = wunsch;
    R.dialogOeffnen(vorgangDialog());
  }

  /*
    Mehrere passende Vorgaenge - die Auswahl nennt Nummer, Zeitraum
    und Zustand. Geraten wird nicht.
  */
  function auswahlDialog() {
    const s = stand.auswahl;
    const m = D.mitarbeiter.find((x) => x.id === s.mitarbeiterId);
    const treffer = D.vorgaengeZuAbwesenheit(s.mitarbeiterId, s.iso, s.art)
      .filter(sichtbarFuerMich);
    return `
      <div class="dialog-hinter" data-dialog-zu></div>
      <div class="dialog-kasten" role="dialog" aria-modal="true" aria-labelledby="awTitel">
        <header class="dialog-kopf">
          <h2 id="awTitel">Mehrere Vorgänge passen</h2>
          <button class="knopf klein" type="button" data-dialog-zu aria-label="Schließen">✕ Schließen</button>
        </header>
        <div class="dialog-rumpf">
          ${R.zustandsKasten("vorbereitet", "Es wird nicht geraten",
            "Zu " + h(m ? m.name : s.mitarbeiterId) + " und diesem Tag gibt es mehrere Vorgänge. Wählen Sie, welchen Sie öffnen wollen.")}
          <div class="wahlraster">
            ${treffer.map((v) => `<button class="wahlkarte" type="button"
              data-tun="vg-oeffnen:${h(v.id)}">
              <strong>${h(v.id)} · ${h(v.titel)}</strong>
              <span>Gemeldet ${h(datumText(v.daten.von))} bis ${h(datumText(v.daten.bis))}</span>
              <span>Stand: ${h(D.VORGANG_ZUSTAENDE[gesamtstand(v)])}</span>
            </button>`).join("")}
          </div>
        </div>
        <footer class="dialog-fuss">
          <button class="knopf" type="button" data-dialog-zu>Abbrechen</button>
        </footer>
      </div>`;
  }

  /*
    Die Rueckmeldung nach dem Entfernen aus der Erledigt-Liste.

    Sie sagt ausdruecklich, dass NICHTS geloescht wurde, und bietet
    "Rueckgaengig" an. Nur noch anzeigen, solange der Vorgang
    tatsaechlich ausgeblendet ist - wurde er inzwischen
    zurueckgeholt, waere die Rueckmeldung eine Unwahrheit.
  */
  function rueckmeldungMarkup() {
    const rm = stand.rueckmeldung;
    if (!rm) return "";
    const v = vorgangFinden(rm.id);
    if (!v || !istAusgeblendet(v)) return "";
    return `<div class="rueckmeldung" role="status">
      <div>
        <strong>${h(v.titel)} ${h(rm.was)}.</strong>
        <span>Nichts gelöscht: Der Vorgang steht weiter unter „Alle“ und im Archiv.
          Festgehalten sind ${h(rm.zeit)} und das handelnde Konto.</span>
      </div>
      <div class="rueckmeldung-aktionen">
        <button class="knopf klein" type="button" data-tun="vg-in-liste:${h(v.id)}">
          Rückgängig</button>
        <button class="knopf klein leise" type="button" data-tun="vg-rueckmeldung-zu"
          aria-label="Diese Rückmeldung ausblenden">Verstanden</button>
      </div>
    </div>`;
  }

  function zeichne() {
    const alle = alleVorgaenge().filter(sichtbarFuerMich);
    const liste = gefiltert();
    const zaehler = (id) => {
      if (id === "alle") return alle.length;
      if (id === "zugewiesen") return alle.filter((v) => mirZugewiesen(v)).length;
      if (id === "erledigt") {
        return alle.filter((v) => gesamtstand(v) === "erledigt"
          && !imArchiv(v) && !istAusgeblendet(v)).length;
      }
      if (id === "archiv") return alle.filter((v) => imArchiv(v) || istAusgeblendet(v)).length;
      if (id === "warnungen") return offeneWarnungen().length;
      return alle.filter((v) => gesamtstand(v) === id).length;
    };

    const inhalt = liste.length
      ? `<div class="vorgangsliste">${liste.map(zeile).join("")}</div>`
      : R.zustandsKasten("leer", "Nichts in dieser Ansicht",
          stand.suche
            ? `Zu „${stand.suche}“ passt kein Vorgang.`
            : "Für diesen Reiter gibt es gerade nichts. Das ist kein Fehler — es ist der Stand.",
          { name: "Alle Vorgänge anzeigen", tun: "vg-reiter:alle" });

    return `
      <div class="bereichskopf">
        <div>
          <h1>Meldungen &amp; Aufgaben</h1>
          <p class="wichtig">${h(zaehler("neu"))} neu · ${h(zaehler("bearbeitung"))} in Bearbeitung ·
            ${h(zaehler("warten"))} warten auf Rückmeldung</p>
        </div>
      </div>

      ${rueckmeldungMarkup()}

      <div class="flaeche">
        <div class="filterzeile" role="group" aria-label="Bearbeitungsstand">
          ${REITER.map((x) => `<button class="filterchip" type="button"
            data-tun="vg-reiter:${h(x.id)}" aria-pressed="${stand.reiter === x.id}">
            ${h(x.name)} (${h(zaehler(x.id))})</button>`).join("")}
        </div>
        <div class="tagleiste">
          <label style="min-width:220px">Thema
            <select data-vg-thema>
              ${THEMEN.map((x) => `<option value="${h(x.id)}" ${stand.thema === x.id ? "selected" : ""}>${h(x.name)}</option>`).join("")}
            </select></label>
          <label style="min-width:220px">Suche nach Vorgang, Person oder Nummer
            <input type="search" data-vg-suche value="${h(stand.suche)}" placeholder="Testfahrer, V0001 …"></label>
          ${zeitraumSichtbar() ? `
            <label class="tagfeld">Zeitraum von
              ${window.ProbeDatum.markup({ kennung: "archiv", teil: "von",
                wert: stand.vonDatum, beschriftung: "Zeitraum von",
                fehler: stand.vonFehler })}</label>
            <label class="tagfeld">bis
              ${window.ProbeDatum.markup({ kennung: "archiv", teil: "bis",
                wert: stand.bisDatum, beschriftung: "Zeitraum bis",
                fehler: stand.bisFehler })}</label>
            ${window.ProbeDatum.verdreht(stand.vonDatum, stand.bisDatum)
              ? `<span class="datumsfehler" role="alert">Das Ende liegt vor dem Beginn — bitte tauschen.</span>`
              : ""}
            ${stand.vonDatum || stand.bisDatum
              ? `<button class="knopf klein" type="button" data-tun="vg-zeitraum-weg">Zeitraum aufheben</button>` : ""}` : ""}
        </div>
        ${stand.reiter === "archiv" ? `<p class="schritt-hinweis">Das Archiv enthält
          abgeschlossene Vorgänge ab 90 Tagen nach dem Abschluss — und solche, die
          jemand aus der Erledigt-Liste entfernt hat. Beides ist kein Löschen: Inhalt,
          Teilschritte, Verantwortliche, Abschlussdatum, Protokoll und Dokumentverweise
          bleiben vollständig erhalten und durchsuchbar — nach Vorgangsnummer,
          Mitarbeiter, Thema und Zeitraum. Gelöscht wird hier nichts.</p>` : ""}
        ${darfEntscheiden() || !R.darf("operations.write") ? "" : keinZugriffHinweis()}
        <div style="margin-top:14px">${inhalt}</div>
      </div>`;
  }

  /*
    Hier stand ein Schalter, mit dem sich die Disposition die
    Faehigkeit zur Urlaubsentscheidung selbst geben konnte. Das war
    fachlich und sicherheitstechnisch falsch und ist ersatzlos
    entfernt. Zusaetzliche Faehigkeiten vergibt ausschliesslich die
    Administration in der Benutzer- und Rechteverwaltung - niemand
    erweitert seine eigenen Rechte.
  */
  function keinZugriffHinweis() {
    return `<div class="zusatz-schalter">
      <div>
        <strong>Urlaubsentscheidung ist Ihrer Rolle nicht zugeordnet</strong>
        <span>Sie sehen den Antrag und seine Planungswirkung und können eine betriebliche
          Empfehlung hinterlassen. Entscheiden dürfen Administration und Personal.
          Eine zusätzliche Fähigkeit kann ausschließlich die Administration in der
          Benutzer- und Rechteverwaltung vergeben.</span>
      </div>
    </div>`;
  }

  /* ============================================================
     Vorgang öffnen
     ============================================================ */
  function vorgangFinden(id) {
    return D.vorgangVon(id) || abgeleiteteWarnungen().find((w) => w.id === id) || null;
  }

  function planungswirkung(v) {
    if (!v.daten.von || !v.daten.bis) return null;
    const e = P.planEntwurf();
    const zeileHeute = e.zeilen.find((z) => z.mitarbeiterId === v.betrifft.id);
    const betroffen = zeileHeute && e.iso >= v.daten.von && e.iso <= v.daten.bis
      && (zeileHeute.imDienst || zeileHeute.von);
    return {
      tage: arbeitstage(v.daten.von, v.daten.bis),
      betroffen: Boolean(betroffen),
      schicht: betroffen ? `${zeileHeute.von}–${zeileHeute.bis}` : "",
      ersatz: Boolean(betroffen)
    };
  }

  function detailUrlaub(v) {
    const w = planungswirkung(v);
    return `
      <div class="dialog-schritt">
        <h3>Antrag</h3>
        <dl class="zusammenfassung">
          <div><dt>Mitarbeiter</dt><dd>${h(v.betrifft.name)}</dd></div>
          <div><dt>Zeitraum</dt><dd>${h(datumText(v.daten.von))} bis ${h(datumText(v.daten.bis))}</dd></div>
          <div><dt>Arbeitstage</dt><dd>${h(w ? w.tage : "—")}</dd></div>
          <div><dt>Eingang</dt><dd>${h(v.eingang)}</dd></div>
          ${v.daten.entscheidung ? `<div><dt>Entscheidung</dt><dd>${h(v.daten.entscheidung)}</dd></div>` : ""}
        </dl>
      </div>
      <div class="dialog-schritt">
        <h3>Auswirkung auf die Planung</h3>
        ${w && w.betroffen
          ? R.zustandsKasten("keinrecht", "Eine veröffentlichte Schicht ist betroffen",
              `Am ${datumText(P.planEntwurf().iso)} ist ${v.betrifft.name} für ${w.schicht} eingeplant. Nach einer Genehmigung entsteht dort ein Konflikt, bis Ersatz gefunden ist.`)
          : R.zustandsKasten("leer", "Keine veröffentlichte Schicht betroffen",
              "Im angezeigten Tagesplan steht für diesen Zeitraum keine Schicht.")}
      </div>`;
  }

  /*
    Die drei Schritte der Dokumentpruefung, in dieser Reihenfolge und
    sichtbar als Reihenfolge. Schritt 2 erscheint erst, wenn Schritt 1
    geschehen ist - nicht weil er sonst gefaehrlich waere, sondern
    weil ein Ergebnis ohne Einsicht keine Aussage hat.
  */
  function pruefschritte(v) {
    const nw = aktuellerNachweis(v);
    if (!nw) return "";
    const e = nw.ergebnis ? ergebnisVon(nw.ergebnis) : null;
    const offen = offeneKlaerungen(v);
    return `<ol class="pruefkette">
      <li class="${nw.einsicht ? "erledigt" : "dran"}">
        <strong>1. Bescheinigung ${nw.nr > 1 ? "Nr. " + nw.nr + " " : ""}ansehen</strong>
        ${nw.einsicht
          ? `<span>Geöffnet von ${h(kontoText(nw.einsicht))} · ${h(nw.einsicht.datum)} ${h(nw.einsicht.zeit)}</span>`
          : `<span>Noch nicht geöffnet.</span>`}
        ${nw.umgezogenNach
          ? `<span class="teil-sperre">Dieser Nachweis gehört zu Vorgang
              ${h(nw.umgezogenNach)}. Die Prüfung läuft dort weiter.</span>`
          : `<button class="knopf klein" type="button" data-tun="vg-bescheinigung:${h(v.id)}">
              ${nw.einsicht ? "Erneut öffnen" : "Bescheinigung öffnen"}</button>`}
      </li>
      <li class="${e ? "erledigt" : (nw.einsicht ? "dran" : "spaeter")}">
        <strong>2. Prüfergebnis festhalten</strong>
        ${!nw.einsicht ? `<span>Erst nach der Einsicht. Ein Ergebnis ohne Einsicht wäre keine Prüfung.</span>` : ""}
        ${nw.einsicht && !e ? `<div class="wahlraster">
          ${D.PRUEFERGEBNISSE.map((x) => `<button class="wahlkarte" type="button"
            data-tun="vg-ergebnis:${h(v.id)}|${h(x.id)}" aria-pressed="false">
            <strong>${h(x.name)}</strong>
            <span>${h(x.erklaerung)}</span></button>`).join("")}
        </div>
        <p class="schritt-hinweis">Das Ergebnis lässt sich danach nicht mehr
          überschreiben. Eine spätere Korrektur läuft über einen eigenen
          Vorgang mit Pflichtgrund.</p>` : ""}
        ${e ? `<span>${R.marke(e.lage === "gut" ? "gut" : "warnung", e.name)}</span>
          <span>${h(e.erklaerung)}</span>
          <span class="teil-sperre">Festgehalten und gesperrt. Eine Korrektur ist nur
            als eigener Vorgang mit Begründung möglich.</span>
          <button class="knopf klein" type="button"
            data-tun="vg-pruefkorrektur:${h(v.id)}">Ergebnis korrigieren</button>` : ""}
      </li>
      ${offen.length ? `<li class="dran">
        <strong>${h(D.KLAERUNG_NAMEN[offen[0].art])}</strong>
        <span>${h(offen[0].text)}</span>
        <span>Offen seit ${h(offen[0].seit)} · angestoßen von ${h(kontoText(offen[0].wer))}</span>
        ${offen[0].art === "rueckfrage"
          ? `<button class="knopf klein" type="button"
              data-tun="vg-klaerung-ja:${h(v.id)}">Rückfrage als geklärt eintragen</button>`
          : offen[0].art === "anforderung"
          ? `<button class="knopf klein" type="button"
              data-tun="vg-neue-bescheinigung:${h(v.id)}">Neue Bescheinigung ist eingegangen</button>`
          /* Zuordnung: nur Personal und Administration duerfen hier
             handeln, und die Datei wird nicht geloescht. */
          : R.darf("personnel.read")
          ? `<span class="teil-aktionen">
              <button class="knopf klein" type="button"
                data-tun="vg-zuordnung:${h(v.id)}">Nachweis neu zuordnen</button>
              <button class="knopf klein" type="button"
                data-tun="vg-zuordnung-unklar:${h(v.id)}">Zuordnung lässt sich nicht klären</button>
            </span>
            <span class="teil-sperre">Die Datei wird nicht gelöscht und nicht von selbst
              einem anderen Mitarbeiter zugeordnet. Eine Neuzuordnung braucht eine
              Zusammenfassung und einen Grund.</span>`
          : `<span class="teil-sperre">Die Klärung der Zuordnung ist Personal und
              Administration vorbehalten.</span>`}
      </li>` : ""}
      ${(() => {
        const meins = meinTeil(v);
        const grund = meins ? teilOffen(v, meins) : pruefungOffen(v, "bescheinigung");
        const frei = grund === "";
        return `
      <li class="${frei ? "dran" : "spaeter"}">
        <strong>${offen.length ? 4 : 3}. Teilschritt abschließen</strong>
        <span>${frei
          ? "Der Abschluss steht jetzt unten bei „Personalprüfung“ bereit."
          : h(grund)}</span>
      </li>`; })()}
    </ol>`;
  }

  /* Die Kette der eingegangenen Nachweise. Nichts wird ueberschrieben:
     Jeder Eintrag behaelt Nummer, Eingangszeit, Art und sein
     Ergebnis, auch wenn er beanstandet wurde. */
  function nachweisliste(v) {
    const ART = { erst: "Erstbescheinigung", folge: "Folgebescheinigung", ersatz: "Ersatz nach Beanstandung" };
    const letzte = aktuellerNachweis(v);
    return `<ul class="konfliktliste">
      ${nachweise(v).map((nw) => {
        const e = nw.ergebnis ? ergebnisVon(nw.ergebnis) : null;
        const aktiv = letzte && nw.nr === letzte.nr;
        return `<li class="${nw.beanstandet ? "ist-ausnahme" : ""}">
          <strong>${aktiv && !nw.umgezogenNach
            ? `<button class="alslink" type="button" data-tun="vg-bescheinigung:${h(v.id)}">${h(nw.datei)}</button>`
            : h(nw.datei)}</strong>
          <span>Nr. ${nw.nr} · ${h(ART[nw.art] || nw.art)} · eingegangen ${h(nw.eingang)}
            ${e ? " · " + h(e.name) : " · noch nicht geprüft"}
            ${nw.beanstandet ? " · beanstandet, bleibt erhalten" : ""}</span>
          ${nw.zuordnungUngeklaert ? `<span class="band-warnung">Zuordnung ungeklärt —
            nicht als geprüft verwendbar</span>` : ""}
          ${nw.umgezogenNach ? `<span>Neu zugeordnet zu Vorgang ${h(nw.umgezogenNach)} ·
            bleibt hier als Spur erhalten</span>` : ""}
          ${nw.herkunft ? `<span>Aus Vorgang ${h(nw.herkunft)} neu zugeordnet</span>` : ""}
        </li>`;
      }).join("")}
    </ul>`;
  }

  function detailKrankheit(v) {
    const w = planungswirkung(v);
    return `
      <div class="dialog-schritt">
        <h3>Krankmeldung</h3>
        <dl class="zusammenfassung">
          <div><dt>Mitarbeiter</dt><dd>${h(v.betrifft.name)}</dd></div>
          <div><dt>Zeitraum</dt><dd>${h(datumText(v.daten.von))} bis ${h(datumText(v.daten.bis))}</dd></div>
          <div><dt>Planungswirkung</dt><dd>${w && w.betroffen ? "Schicht betroffen" : "keine Schicht betroffen"}</dd></div>
          <div><dt>Ersatz nötig</dt><dd>${w && w.ersatz ? "ja" : "nein"}</dd></div>
          ${v.daten.bezugAuf ? `<div><dt>Bezug auf</dt><dd>${h(v.daten.bezugAuf)}</dd></div>` : ""}
        </dl>
        <p class="schritt-hinweis">In dieser Übersicht stehen weder Diagnose noch
          medizinische Angaben — nur Zeitraum und Planungswirkung.</p>
      </div>
      ${vertraulichSichtbar(v)
        ? `<div class="dialog-schritt geschuetzt">
            <h3>Eingereichte Bescheinigung <span class="band-gold">nur Personal und Administration</span></h3>
            ${nachweisliste(v)}
            <p class="schritt-hinweis">Jede Datei wird über eine kurz gültige, signierte
              Adresse geöffnet. Eine beanstandete Datei wird nie überschrieben — sie bleibt
              mit Nummer, Eingangszeit und Ergebnis erhalten.</p>
            ${pruefschritte(v)}
            <div class="knopfzeile">
              <button class="knopf klein" type="button" data-tun="vg-folge:${h(v.id)}">Folgebescheinigung zuordnen</button>
              <button class="knopf klein" type="button" data-tun="vg-korrektur:${h(v.id)}">Zeitraum korrigieren</button>
            </div>
            <p class="schritt-hinweis">Eine Korrektur überschreibt nichts. Sie legt einen
              neuen, eigenen Vorgang an, der auf diesen hier verweist.</p>
          </div>`
        : `<div class="dialog-schritt">
            <p class="schritt-hinweis">Die eingereichte Bescheinigung gehört nicht zu Ihrer Rolle.
              Sie wird Ihnen nicht angezeigt und nicht ausgeliefert.</p>
          </div>`}`;
  }

  function detailDokument(v) {
    return `
      <div class="dialog-schritt">
        <h3>Dokument</h3>
        <dl class="zusammenfassung">
          <div><dt>Mitarbeiter</dt><dd>${h(v.betrifft.name)}</dd></div>
          <div><dt>Dokumentart</dt><dd>${h(v.daten.art)}</dd></div>
          <div><dt>Frist</dt><dd>${v.daten.frist ? h(datumText(v.daten.frist)) : "keine hinterlegt"}</dd></div>
          <div><dt>Status</dt><dd>${h(D.DOKUMENT_LAGE[v.daten.lage])}</dd></div>
          <div><dt>Zuständig</dt><dd>${v.zustaendig ? h(v.zustaendig) : "noch niemand"}</dd></div>
        </dl>
      </div>
      ${vertraulichSichtbar(v)
        ? `<div class="dialog-schritt geschuetzt">
            <h3>Dateiprüfung <span class="band-gold">nur Personal und Administration</span></h3>
            <button class="knopf klein" type="button" data-tun="vg-datei:${h(v.id)}">Datei sicher prüfen</button>
          </div>`
        : `<div class="dialog-schritt">
            <p class="schritt-hinweis">Sie sehen, dass ein betrieblich erforderliches Dokument
              fehlt oder abläuft. Der Dateiinhalt bleibt Administration und Personal vorbehalten.</p>
          </div>`}`;
  }

  function detailFahrt(v) {
    return `<div class="dialog-schritt">
      <h3>Anfrage</h3>
      <dl class="zusammenfassung">
        <div><dt>Fahrt</dt><dd>${h(v.betrifft.name)}</dd></div>
        <div><dt>Eingang</dt><dd>${h(v.eingang)}</dd></div>
        <div><dt>Hinweis</dt><dd>${h(v.daten.hinweis || "—")}</dd></div>
      </dl>
      <p class="schritt-hinweis">Die Fahrt selbst wird im Bereich „Fahrten" bearbeitet.
        Dieser Vorgang verweist nur darauf — es entsteht keine zweite Kopie der Fahrt.</p>
      <div class="knopfzeile">
        <button class="knopf" type="button" data-tun="vg-zur-fahrt:${h(v.betrifft.id)}">Zur Fahrt ${h(v.betrifft.name)}</button>
      </div>
    </div>`;
  }

  /*
    Teilschritte im Dialog. Jeder Teil zeigt seinen eigenen Stand und
    seinen eigenen Verantwortlichen. Wer einen Teil nicht bearbeiten
    darf, sieht ihn trotzdem als Stand - aber ohne Inhalt und ohne
    Knopf. So weiss die Disposition, dass die Personalpruefung noch
    offen ist, ohne die Bescheinigung zu sehen.
  */
  function teileBlock(v) {
    const meins = meinTeil(v);
    return `<div class="dialog-schritt">
      <h3>Teilschritte</h3>
      <ul class="vg-teile breit">
        ${Object.entries(v.teile).map(([schluessel, x]) => {
          const darf = R.darf(x.braucht);
          const meiner = meins && meins.schluessel === schluessel;
          return `<li class="ist-${x.zustand}${meiner ? " meiner" : ""}">
            <strong>${h(x.name)}${meiner ? ` <span class="band-gold">Ihr Teilschritt</span>` : ""}</strong>
            <span>${x.zustand === "erledigt" ? "erledigt" : "offen"}
              · ${x.verantwortlich ? h(kontoText(x.verantwortlich)) : "noch niemand verantwortlich"}</span>
            ${darf ? `<span class="teil-schritte">${h(x.schritte)}</span>` : ""}
            ${x.letzter ? `<span class="teil-letzter">Zuletzt bearbeitet: ${h(kontoText(x.letzter))} · ${h(x.letzter.zeit)}</span>` : ""}
            ${!darf ? `<span class="teil-schritte">Dieser Teilschritt gehört einer anderen Rolle. Sie sehen den Stand, nicht den Inhalt.</span>` : ""}
            ${darf && x.zustand !== "erledigt" ? `<span class="teil-aktionen">
              ${!x.verantwortlich || x.verantwortlich.kennung !== meinKonto().kennung
                ? `<button class="knopf klein" type="button"
                    data-tun="vg-teil-uebernehmen:${h(v.id)}|${h(schluessel)}">Übernehmen</button>` : ""}
              ${x.verantwortlich && x.verantwortlich.kennung === meinKonto().kennung
                ? `<button class="knopf klein" type="button"
                    data-tun="vg-teil-weitergeben:${h(v.id)}|${h(schluessel)}">Weitergeben</button>` : ""}
              ${teilOffen(v, { ...x, schluessel })
                ? `<button class="knopf klein" type="button" disabled
                    aria-disabled="true">${h(x.aktion)}</button>`
                : `<button class="knopf klein haupt-knopf" type="button"
                    data-tun="vg-teil-erledigen:${h(v.id)}|${h(schluessel)}">${h(x.aktion)}</button>`}
            </span>
            ${teilOffen(v, { ...x, schluessel })
              ? `<span class="teil-sperre">${h(teilOffen(v, { ...x, schluessel }))}
                  Erst übernehmen, dann ansehen, dann bewerten, dann abschließen.</span>` : ""}` : ""}
          </li>`;
        }).join("")}
      </ul>
      <p class="schritt-hinweis">Der Gesamtvorgang ist erst erledigt, wenn jeder
        Teilschritt abgeschlossen ist. Niemand schließt mit seinem eigenen
        Schritt den Vorgang der anderen Rolle.</p>
    </div>`;
  }

  function vorgangDialog() {
    /*
      Der Schutz gilt nur fuer die Dokumentvorschau. Wird die
      Krankmeldung gezeichnet - auf welchem Weg auch immer -, ist er
      weg. Sonst bliebe er haengen, und Escape im Vorgang wuerde den
      Vorgang nicht mehr schliessen, sondern nur neu zeichnen: eine
      Falle, aus der man nicht herauskaeme.
    */
    R.dialogSchutzSetzen(null);
    const v = vorgangFinden(stand.offen);
    if (!v) return "";
    if (!sichtbarFuerMich(v)) {
      return `
        <div class="dialog-hinter" data-dialog-zu></div>
        <div class="dialog-kasten" role="dialog" aria-modal="true" aria-label="Kein Zugriff">
          <header class="dialog-kopf"><h2>Kein Zugriff</h2>
            <button class="knopf klein" type="button" data-dialog-zu>Schließen</button></header>
          <div class="dialog-rumpf">${R.kastenKeinRecht("diesen Vorgang")}</div>
          <footer class="dialog-fuss">
            <button class="knopf haupt-knopf" type="button" data-dialog-zu>Schließen</button></footer>
        </div>`;
    }

    const detail = {
      urlaub: detailUrlaub, krankheit: detailKrankheit,
      dokument: detailDokument, fahrt: detailFahrt
    }[v.thema];

    const marke = ARTMARKE[v.art];
    /* Erledigt heisst: JEDER Pflichtteil ist fertig - nicht nur meiner. */
    const erledigt = gesamtstand(v) === "erledigt";
    const teil = meinTeil(v);
    const fremd = stand.fremdstand[v.id] && stand.fremdstand[v.id] !== v.version;

    return `
      <div class="dialog-hinter" data-dialog-zu></div>
      <div class="dialog-kasten" role="dialog" aria-modal="true" aria-labelledby="vgTitel">
        <header class="dialog-kopf">
          ${R.marke(marke[0], marke[1])}
          <h2 id="vgTitel">${h(v.titel)}</h2>
          <button class="knopf klein" type="button" data-dialog-zu aria-label="Schließen">✕ Schließen</button>
        </header>
        <div class="dialog-rumpf">
          ${fremd ? R.zustandsKasten("fehler", "Jemand anderes hat diesen Vorgang inzwischen geändert",
            "Ihre Ansicht ist nicht mehr aktuell. Laden Sie den Stand neu, bevor Sie speichern — sonst würden Sie die Änderung der anderen Person überschreiben.",
            { name: "Aktuellen Stand laden", tun: `vg-neu-laden:${v.id}` }) : ""}

          <dl class="zusammenfassung">
            <div><dt>Vorgang</dt><dd>${h(v.id)}</dd></div>
            <div><dt>Art</dt><dd>${h(D.VORGANG_ARTEN[v.art])}</dd></div>
            <div><dt>Thema</dt><dd>${h(D.VORGANG_THEMEN[v.thema] || v.thema)}</dd></div>
            <div><dt>Gesamtstand</dt><dd>${h(D.VORGANG_ZUSTAENDE[gesamtstand(v)])}</dd></div>
            <div><dt>Verantwortlich</dt><dd>${verantwortlichText(v)}</dd></div>
            ${v.letzterBearbeiter ? `<div><dt>Zuletzt bearbeitet</dt><dd>${h(kontoText(v.letzterBearbeiter))} · ${h(v.letzterBearbeiter.zeit)}</dd></div>` : ""}
            ${v.abgeschlossenAm ? `<div><dt>Abgeschlossen</dt><dd>${h(datumText(v.abgeschlossenAm))}</dd></div>
              <div><dt>Archiv ab</dt><dd>${h(datumText(v.archivAb))}</dd></div>` : ""}
          </dl>

          ${detail ? detail(v) : `<div class="dialog-schritt">
            <p>${h(v.daten.text || "")}</p></div>`}

          ${v.teile ? teileBlock(v) : ""}

          ${v.empfehlung ? `<div class="dialog-schritt">
            <h3>Betriebliche Empfehlung</h3>
            <p class="schritt-hinweis">${h(v.empfehlung)}</p></div>` : ""}

          ${v.thema === "urlaub" && !erledigt && darfEmpfehlen() && !darfEntscheiden() ? `
            <div class="dialog-schritt">
              <h3>Betriebliche Empfehlung abgeben</h3>
              <div class="wahlraster">
                <button class="wahlkarte" type="button" data-tun="vg-empfehlung:${h(v.id)}|Aus Planungssicht möglich"
                  aria-pressed="${v.empfehlung === "Aus Planungssicht möglich"}">
                  <strong>Aus Planungssicht möglich</strong></button>
                <button class="wahlkarte" type="button" data-tun="vg-empfehlung:${h(v.id)}|Ersatz erforderlich"
                  aria-pressed="${v.empfehlung === "Ersatz erforderlich"}">
                  <strong>Ersatz erforderlich</strong></button>
              </div>
              <p class="schritt-hinweis">Die Entscheidung selbst treffen Administration und Personal.</p>
            </div>` : ""}

          ${v.notizen.length && darfVertraulich() ? `
            <div class="dialog-schritt geschuetzt">
              <h3>Interne Notizen <span class="band-gold">bleiben intern</span></h3>
              <ul class="konfliktliste">
                ${v.notizen.map((x) => `<li><strong>${h(x.wer)}</strong><span>${h(x.text)}</span></li>`).join("")}
              </ul>
            </div>` : ""}

          ${v.antwort ? `<div class="dialog-schritt">
            <h3>Was der Mitarbeiter sieht</h3>
            <div class="vorschlag-kasten">
              <span class="vorschlag-band">Mitarbeiter-Vorschau</span>
              <strong>${h(v.antwort)}</strong>
              <span>Interne Notizen und Empfehlungen erscheinen dort nicht.</span>
            </div></div>` : ""}
        </div>
        <footer class="dialog-fuss">
          <button class="knopf" type="button" data-dialog-zu>Schließen</button>
          ${!erledigt && v.thema === "urlaub" && darfEntscheiden() ? `
            <button class="knopf" type="button" data-tun="vg-rueckfrage:${h(v.id)}">Rückfrage</button>
            <button class="knopf leise" type="button" data-tun="vg-entscheiden:${h(v.id)}|ablehnen">Ablehnen</button>
            <button class="knopf haupt-knopf" type="button" data-tun="vg-entscheiden:${h(v.id)}|genehmigen">Genehmigen</button>` : ""}
          ${erledigt && !v.abgeleitet
            ? `<button class="knopf" type="button" data-tun="vg-wiedereroeffnen:${h(v.id)}">Wiedereröffnen</button>` : ""}
          ${!erledigt && v.thema !== "urlaub" && teil && teil.zustand === "offen" && meineTeile(v).length === 1
            ? (teilOffen(v, teil)
              /* Auch hier gesperrt. Ein zweiter, offener Knopf an anderer
                 Stelle haette die ganze Sperre wertlos gemacht. */
              ? `<button class="knopf" type="button" disabled aria-disabled="true"
                  title="${h(teilOffen(v, teil))}">${h(teil.aktion)}</button>`
              : `<button class="knopf haupt-knopf" type="button" data-tun="vg-erledigen:${h(v.id)}">${h(teil.aktion)}</button>`)
            : ""}
          ${!erledigt && v.thema !== "urlaub" && !v.teile
            ? `<button class="knopf haupt-knopf" type="button" data-tun="vg-erledigen:${h(v.id)}">Erledigt</button>` : ""}
        </footer>
      </div>`;
  }

  /* ============================================================
     Entscheidung - zweistufig, mit Pflichtgrund bei Ablehnung
     ============================================================ */
  function entscheidungDialog() {
    const s = stand.entscheidung;
    const v = vorgangFinden(s.id);
    const w = planungswirkung(v);
    const ablehnen = s.art === "ablehnen";
    const pruefung = s.stufe === "pruefung";

    const zusammen = `<dl class="zusammenfassung">
      <div><dt>Mitarbeiter</dt><dd>${h(v.betrifft.name)}</dd></div>
      <div><dt>Zeitraum</dt><dd>${h(datumText(v.daten.von))} bis ${h(datumText(v.daten.bis))}</dd></div>
      <div><dt>Arbeitstage</dt><dd>${h(w ? w.tage : "—")}</dd></div>
      <div><dt>Entscheidung</dt><dd>${ablehnen ? "Ablehnen" : "Genehmigen"}</dd></div>
      <div><dt>Entschieden von</dt><dd>${h(R.benutzerText())}</dd></div>
      ${ablehnen ? `<div><dt>Grund</dt><dd>${h(s.grund || "— noch nicht eingetragen")}</dd></div>` : ""}
      ${v.empfehlung ? `<div><dt>Empfehlung</dt><dd>${h(v.empfehlung)}</dd></div>` : ""}
    </dl>`;

    const rumpf = pruefung
      ? `${R.zustandsKasten("keinrecht", "Letzte Prüfung",
            "Noch ist nichts entschieden. Erst „Verbindlich speichern“ schließt den Vorgang ab und erzeugt den Protokolleintrag.")}
         ${zusammen}
         ${!ablehnen && w && w.betroffen
           ? R.zustandsKasten("keinrecht", "Eine Schicht wird dadurch zum Konflikt",
               `${v.betrifft.name} ist im angezeigten Tagesplan für ${w.schicht} eingeplant. Nach der Genehmigung erscheint dort ein Konflikt, bis Ersatz gefunden ist.`)
           : ""}`
      : `${s.fehler ? `<div class="feldfehler" role="alert">${h(s.fehler)}</div>` : ""}
         ${zusammen}
         ${ablehnen ? `
           <label>Grund für die Ablehnung <span class="band-warnung">Pflichtfeld</span>
             <textarea data-vg-grund rows="3"
               placeholder="Zum Beispiel: In diesem Zeitraum sind schon zwei Fahrer im Urlaub.">${h(s.grund)}</textarea></label>
           <p class="schritt-hinweis">Der Mitarbeiter sieht den Grund. Interne Notizen bleiben intern.</p>`
           : `<p class="schritt-hinweis">Der Urlaub wird nach der Genehmigung sofort im
              Tagesplan und im Fahrerstatus wirksam.</p>`}`;

    const fuss = pruefung
      ? `<button class="knopf haupt-knopf" type="button" data-tun="vg-entscheid-zurueck">Zurück und ändern</button>
         <button class="knopf leise" type="button" data-tun="vg-entscheid-ja">Verbindlich speichern</button>`
      : `<button class="knopf" type="button" data-tun="vg-entscheid-ab">Abbrechen</button>
         <button class="knopf haupt-knopf" type="button" data-tun="vg-entscheid-pruefen">Änderung prüfen</button>`;

    return `
      <div class="dialog-hinter" data-dialog-zu></div>
      <div class="dialog-kasten" role="dialog" aria-modal="true" aria-labelledby="entTitel">
        <header class="dialog-kopf">
          <h2 id="entTitel">${ablehnen ? "Urlaub ablehnen" : "Urlaub genehmigen"}</h2>
          <button class="knopf klein" type="button" data-dialog-zu aria-label="Schließen">✕ Schließen</button>
        </header>
        <div class="dialog-rumpf">${rumpf}</div>
        <footer class="dialog-fuss">${fuss}</footer>
      </div>`;
  }

  /*
    Sichere Vorschau der Bescheinigung.

    In dieser Probe gibt es keine Datei und keine Storage-API - das
    steht auch so da. Gezeigt wird, WAS im echten Portal zu sehen
    waere und unter welchen Bedingungen: kurz gueltige, signierte
    Adresse, Anzeige im Portal, kein Herunterladen auf Vorrat, kein
    Anhang per E-Mail, keine oeffentliche Adresse.

    Der Inhalt der Bescheinigung wird NICHT abgetippt und nirgends
    gespeichert. Festgehalten wird nur, dass geoeffnet wurde.
  */
  /*
    Korrektur eines bereits festgehaltenen Pruefergebnisses.

    Das alte Ergebnis bleibt stehen. Es entsteht ein eigener Vorgang
    mit Pflichtgrund, der auf den urspruenglichen verweist, und die
    Pruefung beginnt dort von vorn. Stilles Ueberschreiben gibt es
    nicht.
  */
  /*
    Neuzuordnung eines Nachweises - vier Stufen.

      "person"   Zu wem gehoert der Nachweis? Mit Suche, und die
                 BISHERIGE Person steht ausdruecklich mit zur Wahl.
      "vorgang"  Zu welchem Krankheitsvorgang dieser Person? Mit
                 Nummer, Zeitraum, Zustand und vorhandenen
                 Nachweisen. Der aktuelle Vorgang ist ausgeschlossen.
      "neu"      Gibt es keinen passenden, wird einer angelegt -
                 aber erst nach Pruefung des Zeitraums.
      "pruefen"  Letzte Pruefung mit beiden Seiten und Pflichtgrund.

    Der manuelle Test hat gezeigt, warum die zweite Stufe fehlte: Der
    Fall heisst "falsche Person ODER falscher Vorgang". Wer nur die
    Person waehlen kann, kann eine Bescheinigung nicht an einen
    anderen Vorgang DERSELBEN Person haengen - und genau das kommt
    vor, wenn jemand zweimal krank war.

    Keine freie Texteingabe: weder fuer die Person noch fuer den
    Vorgang. Gewaehlt wird aus dem Bestand.
  */

  /* Moegliche Zielvorgaenge: Krankheitsvorgaenge dieser Person,
     ohne den aktuellen. */
  function zielVorgaenge(personId, ausserId) {
    return D.vorgaenge.filter((x) => x.thema === "krankheit"
      && x.betrifft.id === personId && x.id !== ausserId);
  }

  function zuordnungDialog() {
    const s = stand.zuordnung;
    const v = vorgangFinden(s.id);
    const nw = aktuellerNachweis(v);
    const person = s.person ? D.mitarbeiter.find((m) => m.id === s.person) : null;
    const ziel = s.vorgang ? vorgangFinden(s.vorgang) : null;

    const kopf = (titel, schritt) => `
      <div class="dialog-hinter" data-dialog-zu></div>
      <div class="dialog-kasten" role="dialog" aria-modal="true" aria-labelledby="zoTitel">
        <header class="dialog-kopf">
          <h2 id="zoTitel">${h(titel)}</h2>
          ${schritt ? `<span class="band-gold">${h(schritt)}</span>` : ""}
          <button class="knopf klein" type="button" data-dialog-zu aria-label="Schließen">✕ Schließen</button>
        </header>`;

    const fehler = s.fehler
      ? `<div class="feldfehler" role="alert">${h(s.fehler)}</div>`
      : "";

    /* Der Nachweis, um den es geht - in jeder Stufe gleich. */
    const nachweiszeile = `
      <dl class="zusammenfassung">
        <div><dt>Datei</dt><dd>${h(nw ? nw.datei : "—")}</dd></div>
        <div><dt>Eingegangen</dt><dd>${h(nw ? nw.eingang : "—")}</dd></div>
        <div><dt>Bisherige Person</dt><dd>${h(v.betrifft.name)}</dd></div>
        <div><dt>Bisheriger Vorgang</dt><dd>${h(v.id)}</dd></div>
      </dl>`;

    /* ---- Die Zuordnung laesst sich nicht klaeren ---- */
    if (s.stufe === "unklar") {
      return kopf("Zuordnung lässt sich nicht klären") + `
        <div class="dialog-rumpf">
          ${fehler}
          ${R.zustandsKasten("keinrecht", "Der Nachweis bleibt gesperrt",
            "Es wird nichts gelöscht und nichts zugeordnet. Der Nachweis bleibt gesperrt und der Vorgang offen. Festgehalten wird, was geprüft wurde — damit später niemand raten muss, warum hier nichts weitergeht.")}
          ${nachweiszeile}
          <label>Was wurde geprüft? <span class="band-warnung">Pflichtfeld</span>
            <textarea data-zuordnung-grund rows="2"
              placeholder="Zum Beispiel: Name auf der Bescheinigung nicht lesbar, Rückfrage läuft.">${h(s.grund)}</textarea></label>
          <p class="schritt-hinweis">Keine Diagnose und keine medizinische Angabe in diesem Feld.</p>
        </div>
        <footer class="dialog-fuss">
          <button class="knopf" type="button" data-tun="vg-zuordnung-ab">Abbrechen</button>
          <button class="knopf haupt-knopf" type="button" data-tun="vg-zuordnung-unklar-ja">
            Verbindlich festhalten</button>
        </footer>
      </div>`;
    }

    /* ---- Stufe 4: letzte Pruefung ---- */
    if (s.stufe === "pruefen") {
      const neuerVorgang = !s.vorgang;
      return kopf("Letzte Prüfung vor dem Speichern", "Schritt 4 von 4") + `
        <div class="dialog-rumpf">
          ${fehler}
          ${R.zustandsKasten("vorbereitet", "Ein Gesundheitsdokument wechselt den Vorgang",
            "Prüfen Sie beide Seiten. Erst „Verbindlich speichern“ führt die Neuzuordnung aus.")}
          <dl class="zusammenfassung">
            <div><dt>Datei</dt><dd>${h(nw ? nw.datei : "—")}</dd></div>
            <div><dt>Eingegangen</dt><dd>${h(nw ? nw.eingang : "—")}</dd></div>
            <div><dt>Bisherige Person</dt><dd>${h(v.betrifft.name)}</dd></div>
            <div><dt>Bisheriger Vorgang</dt><dd>${h(v.id)} · ${h(v.titel)}</dd></div>
            <div><dt>Neue Person</dt><dd>${h(person ? person.name : "—")}</dd></div>
            <div><dt>Neuer Zielvorgang</dt><dd>${neuerVorgang
              ? `neu anzulegen · ${h(datumText(s.neuVon))} bis ${h(datumText(s.neuBis))}`
              : `${h(ziel.id)} · ${h(ziel.titel)}`}</dd></div>
            <div><dt>Handelndes Konto</dt><dd>${h(meinKonto().name)} · ${h(meinKonto().kennung)}</dd></div>
            <div><dt>Rolle</dt><dd>${h(meinKonto().rolle)}</dd></div>
          </dl>
          ${person && person.id === v.betrifft.id
            ? `<p class="schritt-hinweis">Die Person bleibt dieselbe — der Nachweis wechselt
                nur den Vorgang.</p>` : ""}
          <label>Grund der Neuzuordnung <span class="band-warnung">Pflichtfeld</span>
            <textarea data-zuordnung-grund rows="2"
              placeholder="Zum Beispiel: Zeitraum gehört zur früheren Krankmeldung.">${h(s.grund)}</textarea></label>
          <p class="schritt-hinweis">Die Datei wird nicht gelöscht. Der bisherige Eintrag
            bleibt als unveränderliche Spur stehen; im Zielvorgang beginnt die Prüfung wieder
            bei Schritt 1. Frühere Einsicht und früheres Prüfergebnis gelten dort nicht.</p>
          <p class="schritt-hinweis">Protokolliert werden bisherige Person und bisheriger
            Vorgang, neue Person und neuer Vorgang, Konto, Kennung, Rolle, Datum, Uhrzeit und
            dieser Grund. Keine Diagnose und keine medizinische Angabe.</p>
        </div>
        <footer class="dialog-fuss">
          <button class="knopf" type="button" data-tun="vg-zuordnung-zurueck">Zurück und ändern</button>
          <button class="knopf" type="button" data-tun="vg-zuordnung-ab">Abbrechen</button>
          <button class="knopf haupt-knopf" type="button" data-tun="vg-zuordnung-ja">
            Verbindlich speichern</button>
        </footer>
      </div>`;
    }

    /* ---- Stufe 3: neuen Vorgang anlegen ---- */
    if (s.stufe === "neu") {
      return kopf("Neuen Krankheitsvorgang anlegen", "Schritt 3 von 4") + `
        <div class="dialog-rumpf">
          ${fehler}
          ${R.zustandsKasten("vorbereitet", "Nichts wird abgeleitet",
            "Der Zeitraum ist aus dem bisherigen Vorgang übernommen und muss geprüft werden. Aus dem Inhalt der Bescheinigung wird nichts gelesen und nichts erfunden.")}
          <dl class="zusammenfassung">
            <div><dt>Für</dt><dd>${h(person ? person.name : "—")}</dd></div>
            <div><dt>Datei</dt><dd>${h(nw ? nw.datei : "—")}</dd></div>
            <div><dt>Übernommen aus</dt><dd>Vorgang ${h(v.id)}</dd></div>
          </dl>
          <div class="tageswahl">
            <label class="tagfeld">Krank von
              ${window.ProbeDatum.markup({ kennung: "zuordnung", teil: "von",
                wert: s.neuVon, beschriftung: "Krank von", pflicht: true,
                fehler: s.vonFehler })}</label>
            <label class="tagfeld">bis
              ${window.ProbeDatum.markup({ kennung: "zuordnung", teil: "bis",
                wert: s.neuBis, beschriftung: "Krank bis", pflicht: true,
                fehler: s.bisFehler })}</label>
          </div>
          <p class="schritt-hinweis">Stimmt der Zeitraum nicht, tragen Sie ihn hier richtig
            ein. Er stammt aus dem bisherigen Vorgang, nicht aus dem Dokument.</p>
        </div>
        <footer class="dialog-fuss">
          <button class="knopf" type="button" data-tun="vg-zuordnung-zurueck">Zurück</button>
          <button class="knopf" type="button" data-tun="vg-zuordnung-ab">Abbrechen</button>
          <button class="knopf haupt-knopf" type="button" data-tun="vg-zuordnung-neu-weiter">Weiter</button>
        </footer>
      </div>`;
    }

    /* ---- Stufe 2: welcher Vorgang dieser Person? ---- */
    if (s.stufe === "vorgang") {
      const liste = zielVorgaenge(s.person, v.id);
      return kopf("Zu welchem Krankheitsvorgang?", "Schritt 2 von 4") + `
        <div class="dialog-rumpf">
          ${fehler}
          <dl class="zusammenfassung">
            <div><dt>Datei</dt><dd>${h(nw ? nw.datei : "—")}</dd></div>
            <div><dt>Person</dt><dd>${h(person ? person.name : "—")}</dd></div>
            <div><dt>Bisheriger Vorgang</dt><dd>${h(v.id)} · nicht wählbar</dd></div>
          </dl>
          ${liste.length ? `<div class="wahlraster">
            ${liste.map((z) => {
              const anz = ((z.daten && z.daten.nachweise) || []).length;
              return `<button class="wahlkarte" type="button"
                data-tun="vg-zuordnung-vorgang:${h(v.id)}|${h(z.id)}"
                aria-pressed="${s.vorgang === z.id}">
                <strong>${h(z.id)} · ${h(z.titel)}</strong>
                <span>Gemeldet ${h(datumText(z.daten.von))} bis ${h(datumText(z.daten.bis))}</span>
                <span>Stand: ${h(D.VORGANG_ZUSTAENDE[gesamtstand(z)])}</span>
                <span>${anz === 0 ? "noch kein Nachweis"
                  : anz === 1 ? "1 Nachweis vorhanden" : anz + " Nachweise vorhanden"}</span>
              </button>`;
            }).join("")}
          </div>`
          : R.zustandsKasten("leer", "Für diese Person gibt es keinen anderen Krankheitsvorgang",
              "Legen Sie einen neuen an — oder gehen Sie zurück und wählen eine andere Person.")}
          <div class="knopfzeile">
            <button class="knopf klein" type="button" data-tun="vg-zuordnung-neu:${h(v.id)}">
              Neuen Krankheitsvorgang anlegen</button>
          </div>
        </div>
        <footer class="dialog-fuss">
          <button class="knopf" type="button" data-tun="vg-zuordnung-zurueck">Zurück</button>
          <button class="knopf" type="button" data-tun="vg-zuordnung-ab">Abbrechen</button>
          <button class="knopf haupt-knopf" type="button" data-tun="vg-zuordnung-weiter2">Weiter</button>
        </footer>
      </div>`;
    }

    /* ---- Stufe 1: zu wem gehoert der Nachweis? ---- */
    const suche = (s.suche || "").toLowerCase();
    const treffer = D.mitarbeiter.filter((m) => !suche
      || m.name.toLowerCase().includes(suche) || m.id.toLowerCase().includes(suche));
    return kopf("Zu wem gehört der Nachweis?", "Schritt 1 von 4") + `
      <div class="dialog-rumpf">
        ${fehler}
        ${nachweiszeile}
        <label>Mitarbeiter suchen
          <input type="search" data-zuordnung-suche value="${h(s.suche || "")}"
            placeholder="Name oder Kennung"></label>
        ${treffer.length ? `<div class="wahlraster">
          ${treffer.map((m) => `<button class="wahlkarte" type="button"
            data-tun="vg-zuordnung-person:${h(v.id)}|${h(m.id)}"
            aria-pressed="${s.person === m.id}">
            <strong>${h(m.name)}</strong>
            <span>${h(m.id)}${m.id === v.betrifft.id ? " · bisherige Zuordnung" : ""}</span>
          </button>`).join("")}
        </div>`
        : R.zustandsKasten("leer", "Kein Mitarbeiter passt zur Suche",
            "Ändern Sie die Suche. Eine freie Eingabe ist nicht möglich — gewählt wird aus dem Bestand.")}
        <p class="schritt-hinweis">Die bisherige Person steht mit zur Wahl: Ein Nachweis kann
          zur richtigen Person gehören und trotzdem am falschen Vorgang hängen.</p>
        <p class="schritt-hinweis">Es wird nichts gelöscht und nichts von selbst zugeordnet.</p>
      </div>
      <footer class="dialog-fuss">
        <button class="knopf" type="button" data-tun="vg-zuordnung-ab">Abbrechen</button>
        <button class="knopf haupt-knopf" type="button" data-tun="vg-zuordnung-weiter">Weiter</button>
      </footer>
    </div>`;
  }

  function pruefkorrekturDialog() {
    const s = stand.pruefkorrektur;
    const v = vorgangFinden(s.id);
    const nw = aktuellerNachweis(v);
    const e = nw && nw.ergebnis ? ergebnisVon(nw.ergebnis) : null;
    return `
      <div class="dialog-hinter" data-dialog-zu></div>
      <div class="dialog-kasten" role="dialog" aria-modal="true" aria-labelledby="pkTitel">
        <header class="dialog-kopf">
          <h2 id="pkTitel">Prüfergebnis korrigieren</h2>
          <button class="knopf klein" type="button" data-dialog-zu aria-label="Schließen">✕ Schließen</button>
        </header>
        <div class="dialog-rumpf">
          ${s.fehler ? `<div class="feldfehler" role="alert">${h(s.fehler)}</div>` : ""}
          ${R.zustandsKasten("keinrecht", "Ein festgehaltenes Ergebnis wird nicht überschrieben",
            "Das bisherige Ergebnis bleibt mit Datum, Person und Rolle stehen. Es entsteht ein eigener Vorgang, der auf diesen hier verweist; dort beginnt die Prüfung von vorn.")}
          <dl class="zusammenfassung">
            <div><dt>Vorgang</dt><dd>${h(v.titel)}</dd></div>
            <div><dt>Nachweis</dt><dd>Nr. ${nw ? nw.nr : "—"} · ${h(nw ? nw.datei : "—")}</dd></div>
            <div><dt>Bisheriges Ergebnis</dt><dd>${h(e ? e.name : "—")}</dd></div>
            <div><dt>Festgehalten von</dt><dd>${h(nw && nw.einsicht ? kontoText(nw.einsicht) : "—")}</dd></div>
            <div><dt>Korrigiert von</dt><dd>${h(meinName())}</dd></div>
          </dl>
          <label>Grund der Korrektur <span class="band-warnung">Pflichtfeld</span>
            <textarea data-pruefkorrektur-grund rows="2"
              placeholder="Zum Beispiel: Zeitraum beim ersten Durchsehen falsch gelesen.">${h(s.grund)}</textarea></label>
          <p class="schritt-hinweis">Kein medizinischer Freitext. Protokolliert werden Konto,
            Kennung, Rolle, Datum, Uhrzeit, betroffener Vorgang, vorheriger und neuer Zustand
            sowie dieser Grund — nichts darüber hinaus.</p>
        </div>
        <footer class="dialog-fuss">
          <button class="knopf" type="button" data-tun="vg-pruefkorrektur-ab">Abbrechen</button>
          <button class="knopf haupt-knopf" type="button" data-tun="vg-pruefkorrektur-ja">
            Korrekturvorgang anlegen</button>
        </footer>
      </div>`;
  }

  /* Die Scrollposition des Dialogrumpfs lesen und setzen. */
  function rollstandLesen() {
    const rumpf = document.querySelector(".dialog-rumpf");
    return rumpf ? rumpf.scrollTop : 0;
  }
  function rollstandSetzen(wert) {
    const rumpf = document.querySelector(".dialog-rumpf");
    if (rumpf) rumpf.scrollTop = wert;
  }

  /*
    Von der Vorschau zurueck in die Krankmeldung. Der Vorgang bleibt
    geoeffnet; Uebernahme, Einsicht, Pruefergebnis und Scrollposition
    bleiben, wie sie waren. Es wird nichts gespeichert und nichts
    zurueckgenommen.
  */
  function zurueckZumVorgang(id) {
    stand.einsicht = null;
    stand.verlassenGefragt = false;
    stand.offen = id;
    R.dialogSchutzSetzen(null);
    R.dialogOeffnen(vorgangDialog());
    rollstandSetzen(stand.rollstand);
  }

  function bescheinigungDialog() {
    const v = vorgangFinden(stand.einsicht);
    const nw = aktuellerNachweis(v);
    const e = nw ? nw.einsicht : null;
    return `
      <div class="dialog-hinter" data-dialog-zu></div>
      <div class="dialog-kasten" role="dialog" aria-modal="true" aria-labelledby="beTitel">
        <header class="dialog-kopf">
          <h2 id="beTitel">Bescheinigung ansehen</h2>
          <button class="knopf klein" type="button" data-tun="vg-vorschau-zurueck:${h(v.id)}">
            ‹ Zurück zur Krankmeldung</button>
          <button class="knopf klein" type="button" data-tun="vg-vorschau-raus:${h(v.id)}"
            aria-label="Vorgang verlassen">✕ Vorgang verlassen</button>
        </header>
        <div class="dialog-rumpf">
          ${R.zustandsKasten("vorbereitet", "In dieser Designprobe gibt es keine Datei",
            "Die echte Supabase-Storage-API ist hier nicht verfügbar. Was Sie sehen, ist der Rahmen der Anzeige — nicht ein geprüftes Verhalten der Storage-API.")}
          <dl class="zusammenfassung">
            <div><dt>Datei</dt><dd>${h(nw.datei)}</dd></div>
            <div><dt>Nachweis</dt><dd>Nr. ${nw.nr} · eingegangen ${h(nw.eingang)}</dd></div>
            <div><dt>Mitarbeiter</dt><dd>${h(v.betrifft.name)}</dd></div>
            <div><dt>Gemeldeter Zeitraum</dt><dd>${h(datumText(v.daten.von))} bis ${h(datumText(v.daten.bis))}</dd></div>
            <div><dt>Vorgang</dt><dd>${h(v.id)}</dd></div>
            <div><dt>Angesehen von</dt><dd>${h(meinName())}</dd></div>
          </dl>
          <div class="belegrahmen" role="img"
            aria-label="Platzhalter für die Anzeige der Bescheinigung. In dieser Probe ist keine Datei hinterlegt.">
            <span class="beleg-band">Platzhalter — keine Datei hinterlegt</span>
            <p>Hier stünde im Portal die Bescheinigung selbst, angezeigt über eine
              kurz gültige, signierte Adresse.</p>
            <p>Kein Herunterladen auf Vorrat, kein Anhang per E-Mail, keine öffentliche
              Adresse.</p>
          </div>
          <p class="schritt-hinweis">Der Inhalt der Bescheinigung wird nicht abgetippt und
            nicht gespeichert. Protokolliert wird allein, <em>dass</em> Sie sie geöffnet
            haben — mit Konto, Rolle, Datum und Uhrzeit. Keine Diagnose, kein
            Krankheitsgrund, kein Dokumentinhalt.</p>
          ${e ? `<p class="schritt-hinweis">Bereits geöffnet von ${h(kontoText(e))} ·
            ${h(e.datum)} ${h(e.zeit)}. Jedes Öffnen wird einzeln protokolliert.</p>` : ""}
          <p class="schritt-hinweis">„Zurück zur Krankmeldung“ schließt nur diese Vorschau;
            der Vorgang bleibt offen und Ihr Stand erhalten. „Vorgang verlassen“ schließt
            alles. Escape wirkt wie „Zurück zur Krankmeldung“.</p>
        </div>
        <footer class="dialog-fuss">
          <button class="knopf" type="button" data-tun="vg-vorschau-zurueck:${h(v.id)}">
            Zurück zur Krankmeldung</button>
          <button class="knopf leise" type="button" data-tun="vg-vorschau-raus:${h(v.id)}">
            Vorgang verlassen</button>
          <button class="knopf haupt-knopf" type="button" data-tun="vg-einsicht-ja:${h(v.id)}">
            Einsicht bestätigen und weiter zum Prüfergebnis</button>
        </footer>
        ${stand.verlassenGefragt
          ? `<div class="feldfehler" role="alert" data-verlassen-warnung>
              Die Dokumentprüfung ist noch nicht abgeschlossen. „Vorgang verlassen“ noch
              einmal drücken, um den ganzen Vorgang zu schließen — oder „Zurück zur
              Krankmeldung“, um weiterzuarbeiten.</div>` : ""}
      </div>`;
  }

  function quittung(titel, eintrag, hinweis) {
    return `
      <div class="dialog-hinter" data-dialog-zu></div>
      <div class="dialog-kasten" role="dialog" aria-modal="true" aria-label="${h(titel)}">
        <header class="dialog-kopf"><h2>${h(titel)}</h2>
          <button class="knopf klein" type="button" data-dialog-zu aria-label="Schließen">✕ Schließen</button></header>
        <div class="dialog-rumpf">
          ${hinweis ? R.zustandsKasten("vorbereitet", "Nur in dieser Designprobe", hinweis) : ""}
          <h4 class="unterueberschrift">Was protokolliert würde</h4>
          <dl class="zusammenfassung">
            <div><dt>Wer</dt><dd>${h(eintrag.wer)}</dd></div>
            <div><dt>Wann</dt><dd>${h(eintrag.zeit)}</dd></div>
            <div><dt>Vorgang</dt><dd>${h(eintrag.betrifft)}</dd></div>
            <div><dt>Vorher</dt><dd>${h(eintrag.vorher)}</dd></div>
            <div><dt>Nachher</dt><dd>${h(eintrag.nachher)}</dd></div>
            ${eintrag.grund ? `<div><dt>Begründung</dt><dd>${h(eintrag.grund)}</dd></div>` : ""}
          </dl>
          <p class="schritt-hinweis">Weder Passwörter noch Zugangsschlüssel, keine Diagnose,
            kein vollständiges medizinisches Dokument und kein Lohnbetrag gehören in dieses
            Protokoll.</p>
        </div>
        <footer class="dialog-fuss">
          <button class="knopf haupt-knopf" type="button" data-dialog-zu>Schließen</button>
        </footer>
      </div>`;
  }

  /* ============================================================
     Bedienung
     ============================================================ */
  function handhabungSetzen(v, aenderung) {
    if (v.abgeleitet) {
      D.warnungsHandhabung[v.id] = {
        ...(D.warnungsHandhabung[v.id] || { zustand: "neu", zustaendig: "", gesehen: false }),
        ...aenderung
      };
    } else {
      Object.assign(v, aenderung);
    }
  }

  /* Uebernahme eines benannten Teilschritts. Der bisherige
     Verantwortliche rutscht nach "zuletzt bearbeitet" und
     verschwindet nicht. */
  function teilUebernehmen(v, schluessel, grund) {
    const x = v.teile[schluessel];
    const vorher = x.verantwortlich ? kontoText(x.verantwortlich) : "noch niemand";
    if (x.verantwortlich) x.letzter = { ...x.verantwortlich, zeit: jetzt() };
    x.verantwortlich = { ...meinKonto() };
    v.version += 1;
    D.protokollieren({
      betrifft: v.titel + " · " + x.name, was: "Aufgabe übernommen",
      vorher, nachher: meinName(), grund
    });
  }

  /* Uebernahme ausfuehren - mit Person, nicht mit Rollennamen. */
  function uebernehmen(v, grund) {
    const konto = meinKonto();
    const teil = meinTeil(v);
    const vorher = teil
      ? (teil.verantwortlich ? kontoText(teil.verantwortlich) : "noch niemand")
      : (v.verantwortlich ? kontoText(v.verantwortlich) : "noch niemand");

    if (teil) {
      const echt = v.teile[teil.schluessel];
      if (echt.verantwortlich) echt.letzter = { ...echt.verantwortlich, zeit: jetzt() };
      echt.verantwortlich = { ...konto };
    } else if (v.abgeleitet) {
      handhabungSetzen(v, { zustaendig: meinName(), zustand: "bearbeitung", gesehen: true });
    } else {
      if (v.verantwortlich) v.letzterBearbeiter = { ...v.verantwortlich, zeit: jetzt() };
      v.verantwortlich = { ...konto };
      v.zustaendig = meinName();
      if (v.zustand === "neu") v.zustand = "bearbeitung";
    }
    if (!v.abgeleitet) v.version += 1;

    D.protokollieren({
      betrifft: v.titel + (teil ? " · " + teil.name : ""),
      was: "Aufgabe übernommen",
      vorher, nachher: meinName(), grund
    });
  }

  function wiedereroeffnenDialog() {
    const s = stand.wiedereroeffnen;
    const v = vorgangFinden(s.id);
    return `
      <div class="dialog-hinter" data-dialog-zu></div>
      <div class="dialog-kasten" role="dialog" aria-modal="true" aria-labelledby="wiTitel">
        <header class="dialog-kopf">
          <h2 id="wiTitel">Vorgang wiedereröffnen</h2>
          <button class="knopf klein" type="button" data-dialog-zu aria-label="Schließen">✕ Schließen</button>
        </header>
        <div class="dialog-rumpf">
          ${s.fehler ? `<div class="feldfehler" role="alert">${h(s.fehler)}</div>` : ""}
          ${R.zustandsKasten("keinrecht", "Ein erledigter Vorgang wird nicht still zurückgesetzt",
            "Die Wiedereröffnung braucht einen Grund und erzeugt einen eigenen Protokolleintrag. Der bisherige Abschluss bleibt im Protokoll stehen.")}
          <dl class="zusammenfassung">
            <div><dt>Vorgang</dt><dd>${h(v.titel)}</dd></div>
            <div><dt>Abgeschlossen</dt><dd>${h(datumText(v.abgeschlossenAm))}</dd></div>
            <div><dt>Wiedereröffnet von</dt><dd>${h(meinName())}</dd></div>
          </dl>
          <label>Grund <span class="band-warnung">Pflichtfeld</span>
            <textarea data-wieder-grund rows="2"
              placeholder="Zum Beispiel: versehentlich abgeschlossen.">${h(s.grund)}</textarea></label>
        </div>
        <footer class="dialog-fuss">
          <button class="knopf" type="button" data-tun="vg-wieder-ab">Abbrechen</button>
          <button class="knopf haupt-knopf" type="button" data-tun="vg-wieder-ja">Verbindlich wiedereröffnen</button>
        </footer>
      </div>`;
  }

  function uebernahmeDialog() {
    const s = stand.uebernahme;
    const v = vorgangFinden(s.id);
    /* Ist ein Teil ausdruecklich benannt, gilt genau der. */
    const teil = s.teil && v.teile
      ? { schluessel: s.teil, ...v.teile[s.teil] }
      : meinTeil(v);
    const bisher = teil ? teil.verantwortlich : v.verantwortlich;
    return `
      <div class="dialog-hinter" data-dialog-zu></div>
      <div class="dialog-kasten" role="dialog" aria-modal="true" aria-labelledby="ubTitel">
        <header class="dialog-kopf">
          <h2 id="ubTitel">Aufgabe übernehmen</h2>
          <button class="knopf klein" type="button" data-dialog-zu aria-label="Schließen">✕ Schließen</button>
        </header>
        <div class="dialog-rumpf">
          ${s.fehler ? `<div class="feldfehler" role="alert">${h(s.fehler)}</div>` : ""}
          ${R.zustandsKasten("keinrecht", "An dieser Aufgabe wird bereits gearbeitet",
            `${bisher ? kontoText(bisher) : "Jemand"} ist derzeit verantwortlich${teil ? " für den Teilschritt " + teil.name : ""}. Eine Übernahme ist möglich, braucht aber einen Grund. Die bisherige Bearbeitung bleibt sichtbar.`)}
          <dl class="zusammenfassung">
            <div><dt>Vorgang</dt><dd>${h(v.titel)}</dd></div>
            ${teil ? `<div><dt>Teilschritt</dt><dd>${h(teil.name)}</dd></div>` : ""}
            <div><dt>Bisher verantwortlich</dt><dd>${h(bisher ? kontoText(bisher) : "noch niemand")}</dd></div>
            <div><dt>Übernimmt</dt><dd>${h(meinName())}</dd></div>
          </dl>
          <label>Grund für die Übernahme <span class="band-warnung">Pflichtfeld</span>
            <textarea data-uebernahme-grund rows="2"
              placeholder="Zum Beispiel: Personal ist heute nicht im Haus.">${h(s.grund)}</textarea></label>
          <p class="schritt-hinweis">Die Administration handelt dabei als sie selbst und nie
            unter fremdem Namen. Protokolliert werden Konto, Kennung, Rolle, Datum, Uhrzeit
            und der Grund.</p>
        </div>
        <footer class="dialog-fuss">
          <button class="knopf" type="button" data-tun="vg-uebernahme-ab">Abbrechen</button>
          <button class="knopf haupt-knopf" type="button" data-tun="vg-uebernahme-ja">Verbindlich übernehmen</button>
        </footer>
      </div>`;
  }

  function tun(name, wert) {
    switch (name) {
      case "vg-zeitraum-weg":
        stand.vonDatum = "";
        stand.bisDatum = "";
        R.zeichnen();
        return;
      case "vg-reiter": stand.reiter = wert; R.zeichnen(); return;

      case "vg-oeffnen": {
        const v = vorgangFinden(wert);
        if (!v) return;
        /* Oeffnen heisst gesehen - aber NICHT erledigt. */
        handhabungSetzen(v, { gesehen: true });
        stand.offen = wert;
        R.dialogOeffnen(vorgangDialog());
        R.zeichnen();
        return;
      }

      /*
        Uebernehmen. Ist schon jemand anderes verantwortlich oder
        ist der Teil vertraulich, braucht die Uebernahme einen Grund.
        Die bisherige Bearbeitung bleibt sichtbar - "letzter
        Bearbeiter" und "aktueller Verantwortlicher" sind getrennte
        Angaben.
      */
      /*
        Uebernahme des GANZEN Vorgangs. Nur fuer Vorgaenge ohne
        Teilschritte - wo es Teilschritte gibt, wird der Teil
        ausdruecklich benannt (vg-teil-uebernehmen). Sonst koennte
        eine Karte den Teil einer anderen Rolle anfassen.
      */
      case "vg-uebernehmen": {
        const v = vorgangFinden(wert);
        if (!v || v.teile) return;
        const teil = null;
        if (uebernahmeBrauchtGrund(v, teil)) {
          stand.uebernahme = { id: wert, grund: "", fehler: "" };
          R.dialogOeffnen(uebernahmeDialog());
          return;
        }
        uebernehmen(v, "");
        R.zeichnen();
        return;
      }
      case "vg-uebernahme-ab":
        stand.uebernahme = null;
        R.dialogSchliessen(true);
        return;
      case "vg-uebernahme-ja": {
        const s = stand.uebernahme;
        const feld = document.querySelector("[data-uebernahme-grund]");
        s.grund = feld ? feld.value.trim() : "";
        if (s.grund.length < 3) {
          s.fehler = "Bitte einen Grund eintragen. Die bisherige Bearbeitung bleibt sichtbar.";
          R.dialogOeffnen(uebernahmeDialog());
          const neuF = document.querySelector("[data-uebernahme-grund]");
          if (neuF) neuF.focus();
          return;
        }
        const v = vorgangFinden(s.id);
        if (s.teil) teilUebernehmen(v, s.teil, s.grund); else uebernehmen(v, s.grund);
        stand.uebernahme = null;
        R.dialogSchliessen(true);
        R.zeichnen();
        return;
      }

      /*
        Weitergeben legt die Aufgabe zurueck in den offenen Bestand.
        Die bisherige Bearbeitung verschwindet dabei nicht - sie
        rutscht in "zuletzt bearbeitet".
      */
      case "vg-weitergeben": {
        const v = vorgangFinden(wert);
        if (!v || v.teile) return;
        const teil = null;
        const vorher = teil
          ? (teil.verantwortlich ? kontoText(teil.verantwortlich) : "noch niemand")
          : (v.verantwortlich ? kontoText(v.verantwortlich) : "noch niemand");
        if (teil) {
          const echt = v.teile[teil.schluessel];
          if (echt.verantwortlich) echt.letzter = { ...echt.verantwortlich, zeit: jetzt() };
          echt.verantwortlich = null;
          v.version += 1;
        } else if (v.abgeleitet) {
          handhabungSetzen(v, { zustaendig: "", zustand: "neu" });
        } else {
          if (v.verantwortlich) v.letzterBearbeiter = { ...v.verantwortlich, zeit: jetzt() };
          v.verantwortlich = null;
          v.zustaendig = "";
          v.zustand = "neu";
          v.version += 1;
        }
        D.protokollieren({
          betrifft: v.titel + (teil ? " · " + teil.name : ""),
          was: "Aufgabe weitergegeben",
          vorher, nachher: "wieder offen", grund: ""
        });
        R.zeichnen();
        return;
      }

      /* ---- Aktionen an einem einzelnen Teilschritt ----
         Sie nennen den Teil ausdruecklich. Damit schliesst niemand
         versehentlich den Schritt einer anderen Rolle, und die
         Administration muss sagen, welchen Teil sie meint. */
      case "vg-teil-uebernehmen": {
        const [id, schluessel] = wert.split("|");
        const v = vorgangFinden(id);
        if (!v || !v.teile || !v.teile[schluessel]) return;
        const x = v.teile[schluessel];
        if (!R.darf(x.braucht)) return;
        /* Ein erledigter Teilschritt wird nicht uebernommen. */
        if (x.zustand === "erledigt") return;
        const fremd = x.verantwortlich && x.verantwortlich.kennung !== meinKonto().kennung;
        if (fremd || (x.vertraulich && x.verantwortlich)) {
          stand.uebernahme = { id, teil: schluessel, grund: "", fehler: "" };
          R.dialogOeffnen(uebernahmeDialog());
          return;
        }
        teilUebernehmen(v, schluessel, "");
        R.dialogOeffnen(vorgangDialog());
        R.zeichnen();
        return;
      }
      case "vg-teil-weitergeben": {
        const [id, schluessel] = wert.split("|");
        const v = vorgangFinden(id);
        if (!v || !v.teile || !v.teile[schluessel]) return;
        const x = v.teile[schluessel];
        if (!R.darf(x.braucht)) return;
        /* Ein erledigter Teilschritt wird nicht weitergegeben, und
           weitergeben darf nur, wer ihn auch hat. */
        if (x.zustand === "erledigt") return;
        if (!x.verantwortlich || x.verantwortlich.kennung !== meinKonto().kennung) return;
        const vorher = x.verantwortlich ? kontoText(x.verantwortlich) : "noch niemand";
        if (x.verantwortlich) x.letzter = { ...x.verantwortlich, zeit: jetzt() };
        x.verantwortlich = null;
        v.version += 1;
        D.protokollieren({
          betrifft: v.titel + " · " + x.name, was: "Aufgabe weitergegeben",
          vorher, nachher: "wieder offen", grund: ""
        });
        R.dialogOeffnen(vorgangDialog());
        R.zeichnen();
        return;
      }
      case "vg-teil-erledigen": {
        const [id, schluessel] = wert.split("|");
        const v = vorgangFinden(id);
        if (!v || !v.teile || !v.teile[schluessel]) return;
        const x = v.teile[schluessel];
        if (!R.darf(x.braucht) || x.zustand === "erledigt") return;
        /* Der gesperrte Knopf allein genuegt nicht - hier wird es
           noch einmal geprueft, Uebernahme eingeschlossen. */
        if (teilOffen(v, { ...x, schluessel })) return;
        x.zustand = "erledigt";
        x.letzter = { ...meinKonto(), zeit: jetzt() };
        if (!x.verantwortlich) x.verantwortlich = { ...meinKonto() };
        v.version += 1;
        D.protokollieren({
          betrifft: v.titel + " · " + x.name, was: "Teilschritt abgeschlossen",
          vorher: "offen", nachher: "erledigt", grund: ""
        });
        if (gesamtstand(v) === "erledigt" && !v.abgeschlossenAm) {
          v.abgeschlossenAm = D.alsIso(D.heute);
          v.archivAb = archivDatum(v.abgeschlossenAm);
        }
        stand.offen = v.id;
        R.dialogOeffnen(vorgangDialog());
        R.zeichnen();
        return;
      }

      case "vg-empfehlung": {
        const [id, text] = wert.split("|");
        const v = vorgangFinden(id);
        if (!v || !darfEmpfehlen()) return;
        v.empfehlung = text;
        v.version += 1;
        D.protokollieren({
          wer: R.benutzerText(), kennung: R.benutzer().kennung, rolle: R.benutzer().rolle, zeit: jetzt(), betrifft: v.titel,
          was: "Betriebliche Empfehlung", vorher: "keine", nachher: text, grund: ""
        });
        R.dialogOeffnen(vorgangDialog());
        return;
      }

      case "vg-entscheiden": {
        const [id, art] = wert.split("|");
        if (!darfEntscheiden()) return;
        stand.entscheidung = { id, art, grund: "", stufe: "formular", fehler: "" };
        R.dialogOeffnen(entscheidungDialog());
        return;
      }
      case "vg-entscheid-ab":
        stand.entscheidung = null;
        R.dialogOeffnen(vorgangDialog());
        return;
      case "vg-entscheid-zurueck":
        stand.entscheidung.stufe = "formular";
        R.dialogOeffnen(entscheidungDialog());
        return;
      case "vg-entscheid-pruefen": {
        const s = stand.entscheidung;
        const feld = document.querySelector("[data-vg-grund]");
        if (feld) s.grund = feld.value.trim();
        if (s.art === "ablehnen" && s.grund.length < 3) {
          s.fehler = "Eine Ablehnung braucht einen Grund. Der Mitarbeiter sieht ihn.";
          R.dialogOeffnen(entscheidungDialog());
          const neu = document.querySelector("[data-vg-grund]");
          if (neu) neu.focus();
          return;
        }
        s.fehler = "";
        s.stufe = "pruefung";
        R.dialogOeffnen(entscheidungDialog());
        return;
      }
      case "vg-entscheid-ja": {
        const s = stand.entscheidung;
        if (!darfEntscheiden()) return;
        const v = vorgangFinden(s.id);
        const genehmigt = s.art === "genehmigen";
        const vorher = D.VORGANG_ZUSTAENDE[v.zustand];

        if (genehmigt) {
          /* Gemeinsamer Zustand: Der Urlaub landet in denselben
             Abwesenheiten, aus denen Planung und Fahrerstatus lesen.
             Es entsteht keine zweite Kopie. */
          D.abwesenheiten.push({
            id: "AB-" + v.id, mitarbeiterId: v.betrifft.id,
            art: "urlaub", status: "genehmigt",
            von: v.daten.von, bis: v.daten.bis
          });
        }

        v.daten.entscheidung = genehmigt ? "genehmigt" : "abgelehnt";
        v.zustand = "erledigt";
        v.zustaendig = meineRolle();
        v.antwort = genehmigt
          ? "Ihr Urlaubsantrag wurde genehmigt."
          : `Ihr Urlaubsantrag wurde abgelehnt. Grund: ${s.grund}`;
        v.version += 1;

        const eintrag = {
          wer: R.benutzerText(), kennung: R.benutzer().kennung, rolle: R.benutzer().rolle, zeit: jetzt(), betrifft: v.titel,
          was: "Urlaub entschieden", vorher,
          nachher: genehmigt ? "genehmigt" : "abgelehnt",
          grund: s.grund
        };
        D.protokollieren(eintrag);
        stand.entscheidung = null;
        R.dialogOeffnen(quittung(
          genehmigt ? "Urlaub genehmigt" : "Urlaub abgelehnt",
          eintrag,
          genehmigt
            ? "Der Urlaub wirkt ab sofort im Tagesplan und im Fahrerstatus. Gespeichert wird nichts, versendet wird nichts — der Mitarbeiter bekäme später nur einen Hinweis, dass sein Antrag bearbeitet wurde."
            : "Der Mitarbeiter bekäme später nur einen Hinweis, dass sein Antrag bearbeitet wurde. Der Grund steht im Portal, nicht in der Nachricht."));
        R.zeichnen();
        return;
      }

      case "vg-rueckfrage": {
        const v = vorgangFinden(wert);
        if (!v) return;
        v.zustand = "warten";
        v.zustaendig = meineRolle();
        v.antwort = "Zu Ihrem Urlaubsantrag gibt es eine Rückfrage. Bitte melden Sie sich in der Zentrale.";
        v.version += 1;
        D.protokollieren({
          wer: R.benutzerText(), kennung: R.benutzer().kennung, rolle: R.benutzer().rolle, zeit: jetzt(), betrifft: v.titel,
          was: "Rückfrage gestellt", vorher: "Neu", nachher: "Wartet auf Rückmeldung", grund: ""
        });
        stand.offen = v.id;
        R.dialogOeffnen(vorgangDialog());
        R.zeichnen();
        return;
      }

      /*
        Abschliessen. Bei geteilten Vorgaengen schliesst das NUR den
        eigenen Teilschritt. Der Gesamtvorgang gilt erst als
        erledigt, wenn jeder Pflichtteil fertig ist - der manuelle
        Test hatte gezeigt, dass die Disposition sonst dem Personal
        den Zugriff auf die Bescheinigung nimmt.
      */
      case "vg-erledigen": {
        const v = vorgangFinden(wert);
        if (!v) return;
        const teil = meinTeil(v);
        const vorherGesamt = D.VORGANG_ZUSTAENDE[gesamtstand(v)];

        if (teil) {
          const echt = v.teile[teil.schluessel];
          if (echt.zustand === "erledigt") return;
          if (teilOffen(v, teil)) return;
          echt.zustand = "erledigt";
          echt.letzter = { ...meinKonto(), zeit: jetzt() };
          if (!echt.verantwortlich) echt.verantwortlich = { ...meinKonto() };
          v.version += 1;
          D.protokollieren({
            betrifft: v.titel + " · " + teil.name,
            was: "Teilschritt abgeschlossen",
            vorher: "offen", nachher: "erledigt", grund: ""
          });
        } else {
          handhabungSetzen(v, { zustand: "erledigt" });
          if (!v.abgeleitet) {
            v.letzterBearbeiter = { ...meinKonto(), zeit: jetzt() };
            if (!v.verantwortlich) v.verantwortlich = { ...meinKonto() };
          }
          D.protokollieren({
            betrifft: v.titel, was: "Vorgang erledigt",
            vorher: vorherGesamt, nachher: "Erledigt", grund: ""
          });
        }

        /* Abschluss- und Archivdatum erst, wenn wirklich alles fertig ist. */
        if (gesamtstand(v) === "erledigt" && !v.abgeleitet && !v.abgeschlossenAm) {
          v.abgeschlossenAm = D.alsIso(D.heute);
          v.archivAb = archivDatum(v.abgeschlossenAm);
        }

        stand.offen = v.id;
        R.dialogOeffnen(vorgangDialog());
        R.zeichnen();
        return;
      }

      /*
        Wiedereroeffnen. Ein versehentlich erledigter Vorgang wird
        nicht still zurueckgesetzt: Es braucht einen Grund, und es
        entsteht ein eigener Protokolleintrag.
      */
      /*
        Aus der Arbeitsliste nehmen.

        Das ist KEIN Loeschen: Inhalt, Teilschritte, Verantwortliche,
        Abschlussdatum, Protokoll und Dokumentverweise bleiben
        unberuehrt. Es aendert sich allein, in welcher Liste der
        Vorgang erscheint - und auch das wird protokolliert.
      */
      case "vg-aus-liste": {
        const v = vorgangFinden(wert);
        if (!v || v.abgeleitet) return;
        /* Nur ein fachlich erledigter Vorgang verlaesst die Liste. */
        if (gesamtstand(v) !== "erledigt") return;
        if (istAusgeblendet(v)) return;
        v.ausListe = true;
        v.ausListeAm = D.alsText(D.heute) + " " + jetzt();
        v.ausListeVon = { ...meinKonto() };
        v.version += 1;
        D.protokollieren({
          betrifft: v.titel + " (" + v.id + ")",
          was: "Aus der Erledigt-Liste entfernt",
          vorher: LISTENSTAENDE.sichtbar,
          nachher: LISTENSTAENDE.ausgeblendet + " · im Archiv weiter auffindbar",
          grund: ""
        });
        /*
          Eine kurze Rueckmeldung mit "Rueckgaengig".

          Der Vorgang ist nicht geloescht - er steht weiter unter "Alle"
          und im Archiv. Trotzdem verschwindet er aus der Liste, in der
          man gerade arbeitet, und das sieht fuer einen Moment nach
          Verlust aus. Die Rueckmeldung sagt, was wirklich passiert ist,
          und bietet den Weg zurueck an derselben Stelle an.

          Sie haengt am VORGANG, nicht an einer Zeitschaltung: Eine
          Rueckmeldung, die nach fuenf Sekunden verschwindet, ist fuer
          jemanden, der langsamer liest, keine Rueckmeldung.
        */
        stand.rueckmeldung = {
          id: v.id,
          titel: v.titel,
          was: "aus der Erledigt-Liste entfernt",
          zeit: v.ausListeAm
        };
        R.zeichnen();
        return;
      }
      /* Die Rueckmeldung wegklicken - sie aendert dabei nichts. */
      case "vg-rueckmeldung-zu":
        stand.rueckmeldung = null;
        R.zeichnen();
        return;
      case "vg-in-liste": {
        const v = vorgangFinden(wert);
        if (!v || v.abgeleitet || !istAusgeblendet(v)) return;
        v.ausListe = false;
        v.version += 1;
        /* Die Rueckmeldung hat ihren Zweck erfuellt. */
        if (stand.rueckmeldung && stand.rueckmeldung.id === v.id) stand.rueckmeldung = null;
        D.protokollieren({
          betrifft: v.titel + " (" + v.id + ")",
          was: "Zurück in die Arbeitsliste",
          vorher: LISTENSTAENDE.ausgeblendet,
          nachher: LISTENSTAENDE.sichtbar,
          grund: ""
        });
        R.zeichnen();
        return;
      }

      case "vg-wiedereroeffnen": {
        stand.wiedereroeffnen = { id: wert, grund: "", fehler: "" };
        R.dialogOeffnen(wiedereroeffnenDialog());
        return;
      }
      case "vg-wieder-ab":
        stand.wiedereroeffnen = null;
        R.dialogSchliessen(true);
        return;
      case "vg-wieder-ja": {
        const s = stand.wiedereroeffnen;
        const feld = document.querySelector("[data-wieder-grund]");
        s.grund = feld ? feld.value.trim() : "";
        if (s.grund.length < 3) {
          s.fehler = "Bitte einen Grund eintragen. Ohne Grund bleibt der Vorgang erledigt.";
          R.dialogOeffnen(wiedereroeffnenDialog());
          const neuF = document.querySelector("[data-wieder-grund]");
          if (neuF) neuF.focus();
          return;
        }
        const v = vorgangFinden(s.id);
        if (v.teile) {
          Object.values(v.teile).forEach((x) => { x.zustand = "offen"; });
        }
        handhabungSetzen(v, { zustand: "bearbeitung" });
        if (!v.abgeleitet) {
          v.abgeschlossenAm = "";
          v.archivAb = "";
          /*
            Eine Ausblendung wird dabei aufgehoben. Sonst waere der
            Vorgang wieder zu tun - und trotzdem aus der
            Arbeitsliste verschwunden.
          */
          if (istAusgeblendet(v)) {
            v.ausListe = false;
            D.protokollieren({
              betrifft: v.titel + " (" + v.id + ")",
              was: "Zurück in die Arbeitsliste (durch Wiedereröffnung)",
              vorher: LISTENSTAENDE.ausgeblendet,
              nachher: LISTENSTAENDE.sichtbar, grund: s.grund
            });
          }
          v.letzterBearbeiter = { ...meinKonto(), zeit: jetzt() };
          v.version += 1;
        }
        D.protokollieren({
          betrifft: v.titel, was: "Vorgang wiedereröffnet",
          vorher: "Erledigt", nachher: "In Bearbeitung", grund: s.grund
        });
        stand.wiedereroeffnen = null;
        R.dialogSchliessen(true);
        R.zeichnen();
        return;
      }

      /* ---- Einsicht in die Bescheinigung ---- */
      case "vg-bescheinigung": {
        const v = vorgangFinden(wert);
        if (!v || !vertraulichSichtbar(v) || !aktuellerNachweis(v)) return;
        /*
          Die Scrollposition des Vorgangs merken. Der manuelle Test hat
          gezeigt, warum: Nach dem Ansehen landete man oben im Dialog -
          oder gleich ganz draussen.
        */
        stand.rollstand = rollstandLesen();
        stand.einsicht = wert;
        stand.verlassenGefragt = false;
        R.dialogOeffnen(bescheinigungDialog());
        /*
          Escape und ein Klick neben das Fenster fuehren ZURUECK in die
          Krankmeldung, nicht aus dem Vorgang heraus. Ein
          versehentliches Escape soll nicht die halbe Arbeit kosten.
        */
        R.dialogSchutzSetzen(() => { zurueckZumVorgang(v.id); return false; });
        return;
      }

      /* Nur die Vorschau zu - der Vorgang bleibt offen. */
      case "vg-vorschau-zurueck":
        zurueckZumVorgang(wert);
        return;

      /*
        Den ganzen Vorgang verlassen. Ist die Dokumentpruefung noch
        nicht abgeschlossen, wird einmal nachgefragt - mit Begruendung,
        nicht mit einem nackten "Sind Sie sicher?".
      */
      case "vg-vorschau-raus": {
        const v = vorgangFinden(wert);
        if (!v) return;
        const teil = meinTeil(v);
        const unfertig = teil ? Boolean(teilOffen(v, teil)) : false;
        if (unfertig && !stand.verlassenGefragt) {
          stand.verlassenGefragt = true;
          R.dialogOeffnen(bescheinigungDialog());
          R.dialogSchutzSetzen(() => { zurueckZumVorgang(v.id); return false; });
          return;
        }
        stand.einsicht = null;
        stand.verlassenGefragt = false;
        stand.offen = null;
        R.dialogSchutzSetzen(null);
        R.dialogSchliessen(true);
        R.zeichnen();
        return;
      }
      case "vg-einsicht-ja": {
        const v = vorgangFinden(wert);
        if (!v || !vertraulichSichtbar(v)) return;
        const nw = aktuellerNachweis(v);
        if (!nw) return;
        const vorher = nw.einsicht ? "bereits geöffnet" : "nicht geöffnet";
        nw.einsicht = { ...meinKonto(), datum: D.alsText(D.heute), zeit: jetzt() };
        v.version += 1;
        D.protokollieren({
          betrifft: v.titel + " · Nachweis Nr. " + nw.nr + " · " + nw.datei,
          was: "Bescheinigung angesehen",
          vorher, nachher: "über signierte Adresse geöffnet", grund: ""
        });
        /* Zurueck in die Krankmeldung, nicht hinaus - mit der
           Scrollposition von vorher. */
        zurueckZumVorgang(v.id);
        R.zeichnen();
        return;
      }

      /*
        Das Pruefergebnis. Es ist eine einmalige Festlegung: Danach
        ist der Nachweis gesperrt, und jede Korrektur laeuft ueber
        einen eigenen Vorgang mit Pflichtgrund (Regel 5).

        Aus dem Ergebnis folgt unmittelbar die naechste Handlung -
        sie wird nicht dem Bearbeiter ueberlassen, sondern
        angelegt.
      */
      case "vg-ergebnis": {
        const [id, ergebnis] = wert.split("|");
        const v = vorgangFinden(id);
        if (!v || !vertraulichSichtbar(v)) return;
        const nw = aktuellerNachweis(v);
        /* Ein Ergebnis ohne Einsicht waere keine Pruefung. */
        if (!nw || !nw.einsicht) return;
        /* Ein festgehaltenes Ergebnis wird nicht ueberschrieben. */
        if (nw.gesperrt || nw.ergebnis) return;
        const e = ergebnisVon(ergebnis);
        if (!e) return;

        nw.ergebnis = ergebnis;
        nw.gesperrt = true;
        v.version += 1;
        D.protokollieren({
          betrifft: v.titel + " · Nachweis Nr. " + nw.nr + " · " + nw.datei,
          was: "Prüfergebnis festgehalten",
          vorher: "kein Ergebnis", nachher: e.name, grund: ""
        });

        /* Die festgelegte Folge. */
        if (e.folge === "rueckfrage") {
          v.daten.klaerungen.push({
            art: "rueckfrage", nachweisNr: nw.nr, zustand: "offen",
            text: "Der Zeitraum der Bescheinigung weicht von der Meldung ab ("
              + datumText(v.daten.von) + " bis " + datumText(v.daten.bis)
              + "). Bitte klären, welcher Zeitraum gilt.",
            wer: { ...meinKonto() }, seit: D.alsText(D.heute) + " " + jetzt(),
            geklaertAm: "", geklaertVon: null
          });
          D.protokollieren({
            betrifft: v.titel + " · Nachweis Nr. " + nw.nr,
            was: "Rückfrage zum Zeitraum erstellt",
            vorher: "keine Rückfrage", nachher: "Rückfrage offen", grund: ""
          });
        } else if (e.folge === "zuordnung") {
          /*
            Der Nachweis wird GESPERRT, nicht geloescht und nicht von
            selbst umgehaengt. Er darf ab hier nicht mehr als geprueft
            oder gueltig verwendet werden.
          */
          nw.zuordnungUngeklaert = true;
          v.daten.klaerungen.push({
            art: "zuordnung", nachweisNr: nw.nr, zustand: "offen",
            text: "Der Nachweis gehört möglicherweise nicht zu "
              + v.betrifft.name + " oder nicht zu diesem Vorgang."
              + " Die Zuordnung muss von Personal oder Administration geklärt werden.",
            wer: { ...meinKonto() }, seit: D.alsText(D.heute) + " " + jetzt(),
            geklaertAm: "", geklaertVon: null
          });
          D.protokollieren({
            betrifft: v.titel + " · Nachweis Nr. " + nw.nr + " · " + nw.datei,
            was: "Zuordnung als ungeklärt markiert",
            vorher: "zugeordnet zu " + v.betrifft.name,
            nachher: "Zuordnung ungeklärt, Nachweis gesperrt", grund: ""
          });
        } else if (e.folge === "anforderung") {
          nw.beanstandet = true;
          v.daten.klaerungen.push({
            art: "anforderung", nachweisNr: nw.nr, zustand: "offen",
            text: "Die eingereichte Bescheinigung ist nicht lesbar oder unvollständig."
              + " Beim Mitarbeiter wurde eine neue Bescheinigung angefordert.",
            wer: { ...meinKonto() }, seit: D.alsText(D.heute) + " " + jetzt(),
            geklaertAm: "", geklaertVon: null
          });
          D.protokollieren({
            betrifft: v.titel + " · Nachweis Nr. " + nw.nr,
            was: "Neue Bescheinigung angefordert",
            vorher: "keine Anforderung", nachher: "Anforderung offen", grund: ""
          });
        }

        R.dialogOeffnen(vorgangDialog());
        R.zeichnen();
        return;
      }

      /* Die Rueckfrage ist geklaert. Erst danach darf abgeschlossen
         werden - die Klaerung selbst wird protokolliert. */
      case "vg-klaerung-ja": {
        const v = vorgangFinden(wert);
        if (!v || !vertraulichSichtbar(v)) return;
        const k = offeneKlaerungen(v).find((x) => x.art === "rueckfrage");
        if (!k) return;
        k.zustand = "geklaert";
        k.geklaertAm = D.alsText(D.heute) + " " + jetzt();
        k.geklaertVon = { ...meinKonto() };
        v.version += 1;
        D.protokollieren({
          betrifft: v.titel + " · Rückfrage zum Zeitraum",
          was: "Rückfrage geklärt",
          vorher: "offen", nachher: "geklärt", grund: ""
        });
        R.dialogOeffnen(vorgangDialog());
        R.zeichnen();
        return;
      }

      /*
        Eine neue Bescheinigung ist eingegangen. In der Probe gibt es
        keinen Upload - der Eingang wird ausgeloest, nicht
        hochgeladen.

        Die alte Datei bleibt UNVERAENDERT stehen, mit ihrer Nummer,
        ihrer Eingangszeit, ihrem Ergebnis und dem Vermerk
        "beanstandet". Die neue haengt sich dahinter und beginnt bei
        Schritt 1.
      */
      case "vg-neue-bescheinigung": {
        const v = vorgangFinden(wert);
        if (!v || !vertraulichSichtbar(v)) return;
        const k = offeneKlaerungen(v).find((x) => x.art === "anforderung");
        if (!k) return;
        const liste = nachweise(v);
        const nr = liste.length + 1;
        liste.push({
          nr, art: "ersatz",
          datei: "Testbescheinigung-" + v.betrifft.id + "-0" + nr + ".pdf",
          eingang: D.alsText(D.heute) + " " + jetzt(),
          eingangIso: D.alsIso(D.heute),
          einsicht: null, ergebnis: "", gesperrt: false, beanstandet: false
        });
        k.zustand = "geklaert";
        k.geklaertAm = D.alsText(D.heute) + " " + jetzt();
        k.geklaertVon = { ...meinKonto() };
        v.version += 1;
        D.protokollieren({
          betrifft: v.titel + " · Nachweis Nr. " + nr,
          was: "Neue Bescheinigung eingegangen",
          vorher: "Anforderung offen",
          nachher: "Nachweis Nr. " + nr + " eingegangen, Prüfung beginnt neu", grund: ""
        });
        R.dialogOeffnen(vorgangDialog());
        R.zeichnen();
        return;
      }

      /*
        Neuzuordnung eines Nachweises.

        Zweistufig: erst die Ziel-Person waehlen, dann eine
        Zusammenfassung mit bisheriger Zuordnung, neuer Zuordnung und
        Pflichtgrund, und erst "Verbindlich speichern" fuehrt sie aus.

        Die Datei wird dabei NICHT geloescht: Der alte Eintrag bleibt
        als Spur mit dem Vermerk "neu zugeordnet zu ..." stehen, der
        Zielvorgang bekommt einen Eintrag mit "aus Vorgang ... neu
        zugeordnet". So ist der Weg von beiden Seiten lesbar.
      */
      case "vg-zuordnung": {
        const v = vorgangFinden(wert);
        if (!v || !vertraulichSichtbar(v) || !R.darf("personnel.read")) return;
        const nw = aktuellerNachweis(v);
        if (!nw || !nw.zuordnungUngeklaert) return;
        stand.zuordnung = {
          id: wert, person: "", vorgang: "", suche: "",
          neuVon: v.daten.von || "", neuBis: v.daten.bis || "",
          grund: "", fehler: "", stufe: "person"
        };
        R.dialogOeffnen(zuordnungDialog());
        return;
      }

      /* Stufe 1: Person. Die bisherige ist ausdruecklich erlaubt. */
      case "vg-zuordnung-person": {
        const [id, mid] = wert.split("|");
        if (!stand.zuordnung || stand.zuordnung.id !== id) return;
        if (!D.mitarbeiter.some((m) => m.id === mid)) return;
        stand.zuordnung.person = mid;
        /* Die Vorgangswahl haengt an der Person - sie faellt zurueck. */
        stand.zuordnung.vorgang = "";
        stand.zuordnung.fehler = "";
        R.dialogOeffnen(zuordnungDialog());
        return;
      }
      case "vg-zuordnung-weiter": {
        const s = stand.zuordnung;
        if (!s) return;
        if (!s.person) {
          s.fehler = "Bitte zuerst auswählen, zu wem der Nachweis gehört.";
          R.dialogOeffnen(zuordnungDialog());
          return;
        }
        s.stufe = "vorgang";
        s.fehler = "";
        R.dialogOeffnen(zuordnungDialog());
        return;
      }

      /* Stufe 2: Zielvorgang. Der aktuelle ist ausgeschlossen. */
      case "vg-zuordnung-vorgang": {
        const [id, zid] = wert.split("|");
        const s = stand.zuordnung;
        if (!s || s.id !== id) return;
        /* Der aktuelle Vorgang darf nie Ziel sein. */
        if (zid === id) return;
        if (!zielVorgaenge(s.person, id).some((x) => x.id === zid)) return;
        s.vorgang = zid;
        s.fehler = "";
        R.dialogOeffnen(zuordnungDialog());
        return;
      }
      case "vg-zuordnung-weiter2": {
        const s = stand.zuordnung;
        if (!s) return;
        if (!s.vorgang) {
          s.fehler = "Bitte einen Zielvorgang wählen — oder einen neuen anlegen.";
          R.dialogOeffnen(zuordnungDialog());
          return;
        }
        s.stufe = "pruefen";
        s.fehler = "";
        R.dialogOeffnen(zuordnungDialog());
        return;
      }

      /* Stufe 3: neuen Vorgang anlegen - erst nach Pruefung des
         Zeitraums. Abgeleitet wird nichts. */
      case "vg-zuordnung-neu": {
        const s = stand.zuordnung;
        if (!s || !s.person) return;
        s.vorgang = "";
        s.stufe = "neu";
        s.fehler = "";
        R.dialogOeffnen(zuordnungDialog());
        return;
      }
      case "vg-zuordnung-neu-weiter": {
        const s = stand.zuordnung;
        if (!s) return;
        if (!s.neuVon || !s.neuBis) {
          s.fehler = "Bitte den Zeitraum vollständig eintragen.";
          R.dialogOeffnen(zuordnungDialog());
          return;
        }
        if (s.neuBis < s.neuVon) {
          s.fehler = "Das Ende liegt vor dem Beginn.";
          R.dialogOeffnen(zuordnungDialog());
          return;
        }
        s.vorgang = "";
        s.stufe = "pruefen";
        s.fehler = "";
        R.dialogOeffnen(zuordnungDialog());
        return;
      }

      /* Eine Stufe zurueck - nicht ganz heraus. */
      case "vg-zuordnung-zurueck": {
        const s = stand.zuordnung;
        if (!s) return;
        if (s.stufe === "pruefen") s.stufe = s.vorgang ? "vorgang" : "neu";
        else if (s.stufe === "neu") s.stufe = "vorgang";
        else s.stufe = "person";
        s.fehler = "";
        R.dialogOeffnen(zuordnungDialog());
        return;
      }
      case "vg-zuordnung-ab":
        stand.zuordnung = null;
        R.dialogSchliessen(true);
        return;

      /* Stufe 4: speichern. */
      case "vg-zuordnung-ja": {
        const s = stand.zuordnung;
        if (!s || !R.darf("personnel.read")) return;
        if (s.stufe !== "pruefen") return;
        const feld = document.querySelector("[data-zuordnung-grund]");
        s.grund = feld ? feld.value.trim() : "";
        if (s.grund.length < 3) {
          s.fehler = "Bitte einen Grund eintragen. Ohne Grund bleibt die Zuordnung ungeklärt.";
          R.dialogOeffnen(zuordnungDialog());
          const neuF = document.querySelector("[data-zuordnung-grund]");
          if (neuF) neuF.focus();
          return;
        }
        const alt = vorgangFinden(s.id);
        const nw = aktuellerNachweis(alt);
        const person = D.mitarbeiter.find((m) => m.id === s.person);
        if (!nw || !person) return;

        let zielVorgang = s.vorgang ? vorgangFinden(s.vorgang) : null;
        /* Ein gewaehltes Ziel muss immer noch gueltig sein. */
        if (s.vorgang && (!zielVorgang || zielVorgang.id === alt.id
          || zielVorgang.betrifft.id !== person.id)) return;
        const neuAngelegt = !zielVorgang;
        if (!zielVorgang) {
          zielVorgang = D.vorgangAnlegen({
            art: "aufgabe", thema: "krankheit",
            titel: "Krankmeldung – Nachweis neu zugeordnet – " + person.name,
            betrifft: { art: "mitarbeiter", id: person.id, name: person.name },
            sichtbar: ["operations.read", "personnel.read"],
            vertraulich: ["personnel.read"],
            /* Mit Teilschritten, also auch mit der Pruefsperre: Beim
               neuen Vorgang beginnt die Dokumentpruefung wirklich von
               vorn und laesst sich nicht ueberspringen. */
            teile: D.krankheitsTeile(),
            daten: {
              von: s.neuVon, bis: s.neuBis, bezugAuf: alt.id,
              nachweise: [], klaerungen: []
            }
          });
        }
        if (!zielVorgang.daten.nachweise) zielVorgang.daten.nachweise = [];
        if (!zielVorgang.daten.klaerungen) zielVorgang.daten.klaerungen = [];

        /* Im Zielvorgang beginnt die Pruefung bei Schritt 1: keine
           Einsicht, kein Ergebnis. Die Einsicht aus dem falschen
           Vorgang zaehlt dort nicht. */
        const nr = zielVorgang.daten.nachweise.length + 1;
        zielVorgang.daten.nachweise.push({
          nr, art: nw.art, datei: nw.datei,
          eingang: nw.eingang, eingangIso: nw.eingangIso,
          einsicht: null, ergebnis: "", gesperrt: false, beanstandet: false,
          zuordnungUngeklaert: false, umgezogenNach: "", herkunft: alt.id
        });
        zielVorgang.version += 1;

        /* Der alte Eintrag bleibt stehen - als Spur, nicht als
           Nachweis. */
        nw.zuordnungUngeklaert = false;
        nw.umgezogenNach = zielVorgang.id;
        const k = offeneKlaerungen(alt).find((x) => x.art === "zuordnung");
        if (k) {
          k.zustand = "geklaert";
          k.geklaertAm = D.alsText(D.heute) + " " + jetzt();
          k.geklaertVon = { ...meinKonto() };
        }
        alt.version += 1;

        D.protokollieren({
          betrifft: alt.titel + " · Nachweis Nr. " + nw.nr + " · " + nw.datei,
          was: "Nachweis neu zugeordnet",
          vorher: alt.betrifft.name + " (Vorgang " + alt.id + ")",
          nachher: person.name + " (Vorgang " + zielVorgang.id
            + (neuAngelegt ? ", neu angelegt" : "") + "), Prüfung beginnt dort bei Schritt 1",
          grund: s.grund
        });

        stand.zuordnung = null;
        stand.offen = zielVorgang.id;
        R.dialogSchliessen(true);
        R.zeichnen();
        return;
      }

      /*
        Laesst sich die richtige Zuordnung nicht feststellen, bleibt
        der Nachweis gesperrt und der Vorgang offen. Festgehalten wird
        das trotzdem - damit niemand spaeter raten muss, warum hier
        nichts weitergeht.
      */
      case "vg-zuordnung-unklar": {
        const v = vorgangFinden(wert);
        if (!v || !vertraulichSichtbar(v) || !R.darf("personnel.read")) return;
        stand.zuordnung = { id: wert, ziel: "", grund: "", fehler: "", stufe: "unklar" };
        R.dialogOeffnen(zuordnungDialog());
        return;
      }
      case "vg-zuordnung-unklar-ja": {
        const s = stand.zuordnung;
        if (!s || !R.darf("personnel.read")) return;
        const feld = document.querySelector("[data-zuordnung-grund]");
        s.grund = feld ? feld.value.trim() : "";
        if (s.grund.length < 3) {
          s.fehler = "Bitte festhalten, was geprüft wurde und warum es nicht gereicht hat.";
          R.dialogOeffnen(zuordnungDialog());
          const neuF = document.querySelector("[data-zuordnung-grund]");
          if (neuF) neuF.focus();
          return;
        }
        const v = vorgangFinden(s.id);
        const nw = aktuellerNachweis(v);
        v.version += 1;
        D.protokollieren({
          betrifft: v.titel + " · Nachweis Nr. " + (nw ? nw.nr : "—"),
          was: "Zuordnung konnte nicht geklärt werden",
          vorher: "Zuordnung ungeklärt",
          nachher: "weiterhin ungeklärt, Nachweis bleibt gesperrt und der Vorgang offen",
          grund: s.grund
        });
        stand.zuordnung = null;
        stand.offen = v.id;
        R.dialogOeffnen(vorgangDialog());
        R.zeichnen();
        return;
      }

      /*
        Korrektur eines festgehaltenen Pruefergebnisses.

        Das alte Ergebnis wird NICHT ueberschrieben. Es entsteht ein
        eigener, protokollierter Vorgang mit Pflichtgrund, der auf
        den urspruenglichen verweist (Regel 5).
      */
      case "vg-pruefkorrektur": {
        const v = vorgangFinden(wert);
        if (!v || !vertraulichSichtbar(v)) return;
        stand.pruefkorrektur = { id: wert, grund: "", fehler: "" };
        R.dialogOeffnen(pruefkorrekturDialog());
        return;
      }
      case "vg-pruefkorrektur-ab":
        stand.pruefkorrektur = null;
        R.dialogSchliessen(true);
        return;
      case "vg-pruefkorrektur-ja": {
        const s = stand.pruefkorrektur;
        const feld = document.querySelector("[data-pruefkorrektur-grund], [data-zuordnung-grund]");
        s.grund = feld ? feld.value.trim() : "";
        if (s.grund.length < 3) {
          s.fehler = "Bitte einen Grund eintragen. Ohne Grund bleibt das Ergebnis stehen.";
          R.dialogOeffnen(pruefkorrekturDialog());
          const neuF = document.querySelector("[data-pruefkorrektur-grund]");
          if (neuF) neuF.focus();
          return;
        }
        const alt = vorgangFinden(s.id);
        const nw = aktuellerNachweis(alt);
        const e = ergebnisVon(nw.ergebnis);
        const neuerVorgang = D.vorgangAnlegen({
          art: "aufgabe", thema: "krankheit",
          titel: "Prüfergebnis korrigieren – " + alt.betrifft.name,
          betrifft: { ...alt.betrifft },
          sichtbar: ["operations.read", "personnel.read"], vertraulich: ["personnel.read"],
          teile: D.krankheitsTeile(),
          daten: {
            von: alt.daten.von, bis: alt.daten.bis, bezugAuf: alt.id,
            nachweise: [{
              nr: 1, art: "erst", datei: nw.datei, eingang: nw.eingang,
              eingangIso: nw.eingangIso,
              einsicht: null, ergebnis: "", gesperrt: false, beanstandet: false
            }],
            klaerungen: []
          }
        });
        D.protokollieren({
          betrifft: alt.titel + " · Nachweis Nr. " + nw.nr,
          was: "Korrektur des Prüfergebnisses angelegt",
          vorher: e ? e.name : "unbekannt",
          nachher: "neuer Vorgang " + neuerVorgang.id + ", Prüfung beginnt dort neu",
          grund: s.grund
        });
        stand.pruefkorrektur = null;
        stand.offen = neuerVorgang.id;
        R.dialogSchliessen(true);
        R.zeichnen();
        return;
      }

      case "vg-datei":
        R.dialogOeffnen(quittung("Datei sicher prüfen", {
          wer: R.benutzerText(), kennung: R.benutzer().kennung, rolle: R.benutzer().rolle, zeit: jetzt(), betrifft: wert,
          vorher: "nicht geöffnet", nachher: "über signierte Adresse geöffnet", grund: ""
        }, "Im echten Portal entstünde jetzt eine kurz gültige, signierte Adresse. Es gibt keine öffentliche Adresse und keinen Anhang per E-Mail. In dieser Probe gibt es keine Datei."));
        return;

      /*
        Folgebescheinigung bei laengerer Krankheit. Sie haengt am
        bestehenden Vorgang und erzeugt keinen zweiten - aber sie ist
        eine eigene Datei und braucht deshalb ihre eigene Pruefung.
      */
      case "vg-folge": {
        const v = vorgangFinden(wert);
        if (!v || !vertraulichSichtbar(v)) return;
        const liste = nachweise(v);
        const vorher = liste.length;
        const nr = vorher + 1;
        liste.push({
          nr, art: "folge",
          datei: "Testbescheinigung-" + v.betrifft.id + "-0" + nr + ".pdf",
          eingang: D.alsText(D.heute) + " " + jetzt(),
          eingangIso: D.alsIso(D.heute),
          einsicht: null, ergebnis: "", gesperrt: false, beanstandet: false
        });
        v.version += 1;
        D.protokollieren({
          betrifft: v.titel + " · Nachweis Nr. " + nr,
          was: "Folgebescheinigung zugeordnet",
          vorher: vorher + " Nachweis(e)",
          nachher: nr + " Nachweis(e), Prüfung beginnt neu", grund: ""
        });
        R.dialogOeffnen(vorgangDialog());
        R.zeichnen();
        return;
      }

      /*
        Korrektur eines falschen Zeitraums: Der alte Vorgang bleibt
        unangetastet stehen. Es entsteht ein NEUER Vorgang, der auf
        ihn verweist, und ein eigener Protokolleintrag. Stilles
        Ueberschreiben gibt es nicht.
      */
      case "vg-korrektur": {
        const alt = vorgangFinden(wert);
        if (!alt || !vertraulichSichtbar(alt)) return;
        const neuVon = alt.daten.von;
        const neuBis = D.alsIso(D.tagAls(4));
        const neu = D.vorgangAnlegen({
          art: "aufgabe", thema: "krankheit",
          titel: `Zeitraum korrigiert – ${alt.betrifft.name}`,
          betrifft: { ...alt.betrifft },
          dringlichkeit: "normal",
          sichtbar: [...alt.sichtbar], vertraulich: [...alt.vertraulich],
          teile: D.krankheitsTeile(),
          daten: {
            von: neuVon, bis: neuBis, bezugAuf: alt.id,
            /* Die Datei wird nicht kopiert, sondern als neuer,
               ungeprueefter Nachweis uebernommen: Der korrigierte
               Zeitraum will eigens geprueft werden. Der alte Vorgang
               behaelt seine Kette unveraendert. */
            nachweise: nachweise(alt).length ? [{
              nr: 1, art: "erst",
              datei: aktuellerNachweis(alt).datei,
              eingang: aktuellerNachweis(alt).eingang,
              eingangIso: aktuellerNachweis(alt).eingangIso,
              einsicht: null, ergebnis: "", gesperrt: false, beanstandet: false
            }] : [],
            klaerungen: []
          },
          zustaendig: meineRolle(), zustand: "bearbeitung"
        });
        const eintrag = {
          wer: R.benutzerText(), kennung: R.benutzer().kennung, rolle: R.benutzer().rolle, zeit: jetzt(), betrifft: alt.titel,
          was: "Zeitraum korrigiert",
          vorher: `${datumText(alt.daten.von)} bis ${datumText(alt.daten.bis)}`,
          nachher: `${datumText(neuVon)} bis ${datumText(neuBis)} (neuer Vorgang ${neu.id})`,
          grund: ""
        };
        D.protokollieren(eintrag);
        stand.offen = neu.id;
        R.dialogOeffnen(quittung("Korrektur als neuer Vorgang angelegt", eintrag,
          `Der ursprüngliche Vorgang ${alt.id} bleibt unverändert bestehen und ist weiter auffindbar. Der neue Vorgang ${neu.id} verweist auf ihn.`));
        R.zeichnen();
        return;
      }

      case "vg-zur-fahrt":
        R.dialogSchliessen(true);
        R.zustand.fahrtFilter = "alle";
        R.geheZu("fahrten");
        return;

      case "vg-neu-laden": {
        const v = vorgangFinden(wert);
        if (v) stand.fremdstand[wert] = v.version;
        R.dialogOeffnen(vorgangDialog());
        return;
      }

      /* Vorfuehrung: jemand anderes hat den Vorgang geaendert. */
      case "vg-fremd": {
        const v = vorgangFinden(wert);
        if (!v) return;
        stand.fremdstand[wert] = v.version;
        v.version += 1;
        v.zustaendig = "Administration";
        R.dialogOeffnen(vorgangDialog());
        return;
      }

      default: return;
    }
  }

  function glocke() {
    const neue = ungesehen();
    R.dialogOeffnen(`
      <div class="dialog-hinter" data-dialog-zu></div>
      <div class="dialog-kasten" role="dialog" aria-modal="true" aria-labelledby="glockeTitel">
        <header class="dialog-kopf">
          <h2 id="glockeTitel">Neue Ereignisse</h2>
          <button class="knopf klein" type="button" data-dialog-zu aria-label="Schließen">✕ Schließen</button>
        </header>
        <div class="dialog-rumpf">
          ${neue.length
            ? `<ul class="konfliktliste">${neue.map((v) => `<li>
                <strong>${h(D.VORGANG_ARTEN[v.art])} · ${h(v.eingang)}</strong>
                <span>${h(v.titel)}</span>
                <button class="knopf klein" type="button" data-tun="vg-oeffnen:${h(v.id)}"
                  style="margin-top:6px;align-self:flex-start">Vorgang öffnen</button>
              </li>`).join("")}</ul>`
            : R.zustandsKasten("leer", "Nichts Neues", "Es gibt keine ungesehenen Ereignisse.")}
          <p class="schritt-hinweis">Die Glocke zeigt nur Neues. <strong>„Gesehen“ heißt nicht
            „erledigt“</strong> — kein Vorgang verschwindet dadurch aus der Arbeitsliste.</p>
        </div>
        <footer class="dialog-fuss">
          <button class="knopf haupt-knopf" type="button" data-dialog-zu>Schließen</button>
        </footer>
      </div>`);
  }

  function geaendert(feld) {
    if (feld.matches("[data-vg-thema]")) { stand.thema = feld.value; R.zeichnen(); return true; }
    if (feld.matches("[data-vg-suche]")) { stand.suche = feld.value; R.zeichnen(); return true; }
    /* Die Felder der Neuzuordnung aendern nur den Dialogzustand -
       nichts davon wird gespeichert. */
    if (feld.matches("[data-zuordnung-suche]") && stand.zuordnung) {
      /*
        Nur zeichnen, wenn sich wirklich etwas geaendert hat.

        Beim Klick auf eine Auswahlkarte verlaesst der Zeiger zuerst
        das Suchfeld. Zeichnete das noch einmal neu, wuerde die Karte
        unter dem Mauszeiger ausgetauscht und der Klick ginge
        verloren - genau das ist im manuellen Test passiert.
      */
      if (stand.zuordnung.suche === feld.value) return true;
      const stelle = feld.selectionStart;
      stand.zuordnung.suche = feld.value;
      R.dialogOeffnen(zuordnungDialog());
      const neu = document.querySelector("[data-zuordnung-suche]");
      if (neu) {
        neu.focus();
        try { neu.setSelectionRange(stelle, stelle); } catch { /* manche Felder mögen das nicht */ }
      }
      return true;
    }
    /* Die vier Datumsfelder laufen ueber das gemeinsame
       Datumsmodul - siehe datum() direkt darunter. */
    return false;
  }

  /*
    Die Datumsfelder dieses Moduls: der Zeitraumfilter des Archivs
    und der Krankheitszeitraum der Neuzuordnung.

    Beide trugen vorher ein <input type="date"> mit eigener
    Behandlung. Jetzt pruefen beide dieselbe Pruefung, und der
    Fehlertext steht am Feld.
  */
  function datum(kennung, teil, ergebnis) {
    if (kennung === "archiv") {
      if (teil === "von") {
        stand.vonFehler = ergebnis.fehler;
        /* Leer heisst hier "kein Filter" - das ist erlaubt. */
        if (ergebnis.gueltig || ergebnis.leer) stand.vonDatum = ergebnis.iso;
      } else {
        stand.bisFehler = ergebnis.fehler;
        if (ergebnis.gueltig || ergebnis.leer) stand.bisDatum = ergebnis.iso;
      }
      R.zeichnen();
      return true;
    }
    if (kennung === "zuordnung") {
      if (!stand.zuordnung) return true;
      if (teil === "von") {
        stand.zuordnung.vonFehler = ergebnis.fehler;
        if (ergebnis.gueltig || ergebnis.leer) stand.zuordnung.neuVon = ergebnis.iso;
      } else {
        stand.zuordnung.bisFehler = ergebnis.fehler;
        if (ergebnis.gueltig || ergebnis.leer) stand.zuordnung.neuBis = ergebnis.iso;
      }
      /* Hier NICHT neu zeichnen: Der Dialog steht offen, und ein
         Neuzeichnen beim Verlassen des ersten Feldes wuerde den Weg
         zum zweiten Feld unterbrechen. Gezeichnet wird beim
         naechsten Schritt. */
      return true;
    }
    return false;
  }

  const offeneEingabe = () => {
    const g = document.querySelector("[data-vg-grund], [data-uebernahme-grund], [data-wieder-grund], [data-pruefkorrektur-grund]");
    return Boolean(g && g.value.trim().length > 0);
  };

  /* Was fuer die angemeldete Rolle offen ist - die Uebersicht zaehlt
     daraus, damit beide Ansichten dieselbe Zahl zeigen. */
  const offeneFuerMich = () => alleVorgaenge()
    .filter((x) => sichtbarFuerMich(x) && x.zustand !== "erledigt" && x.zustand !== "archiviert");

  /*
    Ein Sprung von einer Kennzahl. Der Reiter wird VOR dem Zeichnen
    gesetzt, damit die Zielliste genau die Menge zeigt, deren Zahl auf
    der Karte stand - und nicht den zuletzt gewaehlten Reiter.
  */
  function sprungziel(zusatz) {
    /*
      "vorgang-V0002" oeffnet genau diesen Vorgang. Der Kalender
      nutzt das: Ein Klick auf "Testfahrer 02 – Krank" soll die
      Krankmeldung oeffnen, nicht eine Liste.
    */
    if (String(zusatz).startsWith("vorgang-")) {
      const id = String(zusatz).slice("vorgang-".length);
      const v = vorgangFinden(id);
      if (!v || !sichtbarFuerMich(v)) return;
      stand.reiter = "alle";
      stand.suche = "";
      stand.thema = "alle";
      stand.vonDatum = "";
      stand.bisDatum = "";
      /* Nach dem Zeichnen oeffnen - der Dialog braucht die Flaeche. */
      stand.oeffneNachZeichnen = id;
      return;
    }
    /*
      "auswahl-M02-krank-2026-10-02": mehrere Vorgaenge passen. Dann
      wird nicht geraten, sondern gefragt - mit Nummer, Zeitraum und
      Zustand.
    */
    if (String(zusatz).startsWith("auswahl-")) {
      const teile = String(zusatz).slice("auswahl-".length).split("-");
      const mid = teile.shift();
      const art = teile.shift();
      const iso = teile.join("-");
      stand.auswahl = { mitarbeiterId: mid, art, iso };
      stand.reiter = "alle";
      stand.oeffneNachZeichnen = "auswahl";
      return;
    }
    if (REITER.some((x) => x.id === zusatz)) {
      stand.reiter = zusatz;
      stand.suche = "";
      stand.thema = "alle";
      stand.vonDatum = "";
      stand.bisDatum = "";
    }
  }

  window.ProbeVorgaenge = {
    offeneWarnungen, sprungziel, nachZeichnen,
    anmelden, zeichne, tun, geaendert, datum, glocke, ungesehen, offeneEingabe, offeneFuerMich
  };
})();
