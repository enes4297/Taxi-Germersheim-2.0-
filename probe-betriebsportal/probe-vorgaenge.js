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
    pruefkorrektur: null,
    zuordnung: null,
    /* Fuer die Vorfuehrung der Paralleländerung. */
    fremdstand: {}
  };

  const REITER = [
    { id: "neu",         name: "Neu" },
    { id: "zugewiesen",  name: "Mir zugewiesen" },
    { id: "bearbeitung", name: "In Bearbeitung" },
    { id: "warten",      name: "Wartet auf Rückmeldung" },
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
    if (stand.reiter === "neu") liste = liste.filter((v) => gesamtstand(v) === "neu");
    if (stand.reiter === "zugewiesen") liste = liste.filter(mirZugewiesen);
    if (stand.reiter === "bearbeitung") liste = liste.filter((v) => gesamtstand(v) === "bearbeitung");
    if (stand.reiter === "warten") liste = liste.filter((v) => gesamtstand(v) === "warten");
    /* Erledigt bleibt 90 Tage sichtbar, danach steht der Vorgang im
       Archiv. Geloescht wird nichts - weder hier noch dort. */
    if (stand.reiter === "erledigt") liste = liste.filter((v) => gesamtstand(v) === "erledigt" && !imArchiv(v));
    if (stand.reiter === "archiv") liste = liste.filter((v) => imArchiv(v));
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

  function hauptaktion(v) {
    if (gesamtstand(v) === "erledigt") return { name: "Ansehen", tun: `vg-oeffnen:${v.id}` };
    /* Bei geteilten Vorgaengen heisst die Hauptaktion nach dem
       eigenen Teilschritt - nicht "Erledigt". Niemand schliesst
       damit den ganzen Vorgang. */
    const teil = meinTeil(v);
    if (teil && teil.zustand === "offen") return { name: teil.aktion, tun: `vg-oeffnen:${v.id}` };
    if (v.thema === "urlaub" && v.art === "aufgabe") return { name: "Antrag öffnen", tun: `vg-oeffnen:${v.id}` };
    if (v.thema === "krankheit") return { name: "Krankmeldung öffnen", tun: `vg-oeffnen:${v.id}` };
    if (v.thema === "fahrt") return { name: "Zur Fahrt", tun: `vg-oeffnen:${v.id}` };
    if (v.thema === "dokument") return { name: "Dokument prüfen", tun: `vg-oeffnen:${v.id}` };
    return { name: "Öffnen", tun: `vg-oeffnen:${v.id}` };
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
      </dl>
      ${v.teile ? `<ul class="vg-teile">
        ${Object.values(v.teile).map((x) => `<li class="ist-${x.zustand}">
          <strong>${h(x.name)}</strong>
          <span>${x.zustand === "erledigt" ? "erledigt" : "offen"}${x.verantwortlich ? " · " + h(kontoText(x.verantwortlich)) : ""}</span>
        </li>`).join("")}
      </ul>` : ""}
      <div class="vg-aktionen">
        <button class="knopf klein haupt-knopf" type="button" data-tun="${h(aktion.tun)}">${h(aktion.name)}</button>
        ${gesamtstand(v) !== "erledigt"
          ? `<button class="knopf klein" type="button" data-tun="vg-uebernehmen:${h(v.id)}">Übernehmen</button>` : ""}
        ${(v.verantwortlich || (v.teile && meinTeil(v) && meinTeil(v).verantwortlich)) && gesamtstand(v) !== "erledigt"
          ? `<button class="knopf klein" type="button" data-tun="vg-weitergeben:${h(v.id)}">Weitergeben</button>` : ""}
      </div>
    </article>`;
  }

  function zeichne() {
    const alle = alleVorgaenge().filter(sichtbarFuerMich);
    const liste = gefiltert();
    const zaehler = (id) => {
      if (id === "alle") return alle.length;
      if (id === "zugewiesen") return alle.filter((v) => mirZugewiesen(v)).length;
      if (id === "erledigt") return alle.filter((v) => gesamtstand(v) === "erledigt" && !imArchiv(v)).length;
      if (id === "archiv") return alle.filter(imArchiv).length;
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
              <input type="date" data-vg-von value="${h(stand.vonDatum)}"></label>
            <label class="tagfeld">bis
              <input type="date" data-vg-bis value="${h(stand.bisDatum)}"></label>
            ${stand.vonDatum || stand.bisDatum
              ? `<button class="knopf klein" type="button" data-tun="vg-zeitraum-weg">Zeitraum aufheben</button>` : ""}` : ""}
        </div>
        ${stand.reiter === "archiv" ? `<p class="schritt-hinweis">Das Archiv enthält
          abgeschlossene Vorgänge ab 90 Tagen nach dem Abschluss. Sie bleiben vollständig
          durchsuchbar — nach Vorgangsnummer, Mitarbeiter, Thema und Zeitraum. Gelöscht
          wird hier nichts.</p>` : ""}
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
      ${(() => { const frei = pruefungOffen(v, "bescheinigung") === ""; return `
      <li class="${frei ? "dran" : "spaeter"}">
        <strong>${offen.length ? 4 : 3}. Teilschritt abschließen</strong>
        <span>${frei
          ? "Der Abschluss steht jetzt unten bei „Personalprüfung“ bereit."
          : h(pruefungOffen(v, "bescheinigung"))}</span>
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
              ${pruefungOffen(v, x.erfordert)
                ? `<button class="knopf klein" type="button" disabled
                    aria-disabled="true">${h(x.aktion)}</button>`
                : `<button class="knopf klein haupt-knopf" type="button"
                    data-tun="vg-teil-erledigen:${h(v.id)}|${h(schluessel)}">${h(x.aktion)}</button>`}
            </span>
            ${pruefungOffen(v, x.erfordert)
              ? `<span class="teil-sperre">${h(pruefungOffen(v, x.erfordert))}
                  Erst ansehen, dann bewerten, dann abschließen.</span>` : ""}` : ""}
          </li>`;
        }).join("")}
      </ul>
      <p class="schritt-hinweis">Der Gesamtvorgang ist erst erledigt, wenn jeder
        Teilschritt abgeschlossen ist. Niemand schließt mit seinem eigenen
        Schritt den Vorgang der anderen Rolle.</p>
    </div>`;
  }

  function vorgangDialog() {
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
            ? (pruefungOffen(v, teil.erfordert)
              /* Auch hier gesperrt. Ein zweiter, offener Knopf an anderer
                 Stelle haette die ganze Sperre wertlos gemacht. */
              ? `<button class="knopf" type="button" disabled aria-disabled="true"
                  title="${h(pruefungOffen(v, teil.erfordert))}">${h(teil.aktion)}</button>`
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
    Neuzuordnung eines Nachweises - drei Stufen.

      "wahl"     wen betrifft der Nachweis wirklich?
      "pruefen"  Zusammenfassung: bisherige Zuordnung, neue
                 Zuordnung, Pflichtgrund. Erst hier wird gespeichert.
      "unklar"   die Zuordnung laesst sich nicht feststellen; der
                 Nachweis bleibt gesperrt und der Vorgang offen.

    Die Trennung ist Absicht: Eine Neuzuordnung verschiebt ein
    Gesundheitsdokument von einer Person zu einer anderen. Das soll
    nicht in einem Klick passieren.
  */
  function zuordnungDialog() {
    const s = stand.zuordnung;
    const v = vorgangFinden(s.id);
    const nw = aktuellerNachweis(v);
    const ziel = s.ziel ? D.mitarbeiter.find((m) => m.id === s.ziel) : null;

    const kopf = (titel) => `
      <div class="dialog-hinter" data-dialog-zu></div>
      <div class="dialog-kasten" role="dialog" aria-modal="true" aria-labelledby="zoTitel">
        <header class="dialog-kopf">
          <h2 id="zoTitel">${h(titel)}</h2>
          <button class="knopf klein" type="button" data-dialog-zu aria-label="Schließen">✕ Schließen</button>
        </header>`;

    const fehler = s.fehler
      ? `<div class="feldfehler" role="alert">${h(s.fehler)}</div>`
      : "";

    /* ---- Die Zuordnung laesst sich nicht klaeren ---- */
    if (s.stufe === "unklar") {
      return kopf("Zuordnung lässt sich nicht klären") + `
        <div class="dialog-rumpf">
          ${fehler}
          ${R.zustandsKasten("keinrecht", "Der Nachweis bleibt gesperrt",
            "Es wird nichts gelöscht und nichts zugeordnet. Der Nachweis bleibt gesperrt und der Vorgang offen. Festgehalten wird, was geprüft wurde — damit später niemand raten muss, warum hier nichts weitergeht.")}
          <dl class="zusammenfassung">
            <div><dt>Vorgang</dt><dd>${h(v.id)} · ${h(v.titel)}</dd></div>
            <div><dt>Nachweis</dt><dd>Nr. ${nw ? nw.nr : "—"} · ${h(nw ? nw.datei : "—")}</dd></div>
            <div><dt>Bisherige Zuordnung</dt><dd>${h(v.betrifft.name)}</dd></div>
            <div><dt>Festgehalten von</dt><dd>${h(meinName())}</dd></div>
          </dl>
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

    /* ---- Stufe 2: Zusammenfassung und Pflichtgrund ---- */
    if (s.stufe === "pruefen") {
      return kopf("Neuzuordnung prüfen") + `
        <div class="dialog-rumpf">
          ${fehler}
          ${R.zustandsKasten("vorbereitet", "Letzte Prüfung vor dem Speichern",
            "Hier wird ein Gesundheitsdokument einer anderen Person zugeordnet. Prüfen Sie beide Seiten, bevor Sie verbindlich speichern.")}
          <dl class="zusammenfassung">
            <div><dt>Nachweis</dt><dd>Nr. ${nw ? nw.nr : "—"} · ${h(nw ? nw.datei : "—")}</dd></div>
            <div><dt>Eingegangen</dt><dd>${h(nw ? nw.eingang : "—")}</dd></div>
            <div><dt>Bisherige Zuordnung</dt><dd>${h(v.betrifft.name)} · Vorgang ${h(v.id)}</dd></div>
            <div><dt>Neue Zuordnung</dt><dd>${h(ziel ? ziel.name : "—")}</dd></div>
            <div><dt>Zugeordnet von</dt><dd>${h(meinName())}</dd></div>
          </dl>
          <label>Grund der Neuzuordnung <span class="band-warnung">Pflichtfeld</span>
            <textarea data-zuordnung-grund rows="2"
              placeholder="Zum Beispiel: Name auf der Bescheinigung gehört zu einer anderen Person.">${h(s.grund)}</textarea></label>
          <p class="schritt-hinweis">Die Datei wird nicht gelöscht. Der bisherige Eintrag
            bleibt als Spur stehen, der neue Vorgang vermerkt die Herkunft. Dort beginnt die
            Prüfung wieder bei Schritt 1: öffnen, Einsicht bestätigen, Ergebnis wählen.</p>
          <p class="schritt-hinweis">Protokolliert werden ursprüngliche Zuordnung, neue
            Zuordnung, handelnde Person, Rolle, Datum, Uhrzeit und dieser Grund. Keine
            Diagnose und keine medizinische Angabe.</p>
        </div>
        <footer class="dialog-fuss">
          <button class="knopf" type="button" data-tun="vg-zuordnung-zurueck">Zurück</button>
          <button class="knopf" type="button" data-tun="vg-zuordnung-ab">Abbrechen</button>
          <button class="knopf haupt-knopf" type="button" data-tun="vg-zuordnung-ja">
            Verbindlich speichern</button>
        </footer>
      </div>`;
    }

    /* ---- Stufe 1: Zu wem gehoert der Nachweis? ---- */
    const andere = D.mitarbeiter.filter((m) => m.id !== v.betrifft.id);
    return kopf("Nachweis neu zuordnen") + `
      <div class="dialog-rumpf">
        ${fehler}
        <dl class="zusammenfassung">
          <div><dt>Nachweis</dt><dd>Nr. ${nw ? nw.nr : "—"} · ${h(nw ? nw.datei : "—")}</dd></div>
          <div><dt>Bisherige Zuordnung</dt><dd>${h(v.betrifft.name)} · Vorgang ${h(v.id)}</dd></div>
        </dl>
        <h4 class="unterueberschrift">Zu wem gehört der Nachweis?</h4>
        <div class="wahlraster">
          ${andere.map((m) => `<button class="wahlkarte" type="button"
            data-tun="vg-zuordnung-ziel:${h(v.id)}|${h(m.id)}"
            aria-pressed="${s.ziel === m.id}">
            <strong>${h(m.name)}</strong><span>${h(m.id)}</span></button>`).join("")}
        </div>
        <p class="schritt-hinweis">Es wird nichts gelöscht und nichts von selbst zugeordnet.
          Im nächsten Schritt sehen Sie beide Zuordnungen und tragen den Grund ein.</p>
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

  function bescheinigungDialog() {
    const v = vorgangFinden(stand.einsicht);
    const nw = aktuellerNachweis(v);
    const e = nw ? nw.einsicht : null;
    return `
      <div class="dialog-hinter" data-dialog-zu></div>
      <div class="dialog-kasten" role="dialog" aria-modal="true" aria-labelledby="beTitel">
        <header class="dialog-kopf">
          <h2 id="beTitel">Bescheinigung ansehen</h2>
          <button class="knopf klein" type="button" data-dialog-zu aria-label="Schließen">✕ Schließen</button>
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
        </div>
        <footer class="dialog-fuss">
          <button class="knopf" type="button" data-dialog-zu>Schließen</button>
          <button class="knopf haupt-knopf" type="button" data-tun="vg-einsicht-ja:${h(v.id)}">
            Einsicht bestätigen und weiter zum Prüfergebnis</button>
        </footer>
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
      case "vg-uebernehmen": {
        const v = vorgangFinden(wert);
        if (!v) return;
        const teil = meinTeil(v);
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
        if (!v) return;
        const teil = meinTeil(v);
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
           noch einmal geprueft. */
        if (pruefungOffen(v, x.erfordert)) return;
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
          if (pruefungOffen(v, echt.erfordert)) return;
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
        stand.einsicht = wert;
        R.dialogOeffnen(bescheinigungDialog());
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
        stand.einsicht = null;
        stand.offen = v.id;
        R.dialogOeffnen(vorgangDialog());
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
        stand.zuordnung = { id: wert, ziel: "", grund: "", fehler: "", stufe: "wahl" };
        R.dialogOeffnen(zuordnungDialog());
        return;
      }
      case "vg-zuordnung-ziel": {
        const [id, ziel] = wert.split("|");
        if (!stand.zuordnung || stand.zuordnung.id !== id) return;
        stand.zuordnung.ziel = ziel;
        stand.zuordnung.fehler = "";
        R.dialogOeffnen(zuordnungDialog());
        return;
      }
      case "vg-zuordnung-weiter": {
        const s = stand.zuordnung;
        if (!s) return;
        if (!s.ziel) {
          s.fehler = "Bitte zuerst auswählen, zu wem der Nachweis gehört.";
          R.dialogOeffnen(zuordnungDialog());
          return;
        }
        s.stufe = "pruefen";
        s.fehler = "";
        R.dialogOeffnen(zuordnungDialog());
        return;
      }
      case "vg-zuordnung-zurueck":
        if (!stand.zuordnung) return;
        stand.zuordnung.stufe = "wahl";
        stand.zuordnung.fehler = "";
        R.dialogOeffnen(zuordnungDialog());
        return;
      case "vg-zuordnung-ab":
        stand.zuordnung = null;
        R.dialogSchliessen(true);
        return;
      case "vg-zuordnung-ja": {
        const s = stand.zuordnung;
        if (!s || !R.darf("personnel.read")) return;
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
        const ziel = D.mitarbeiter.find((m) => m.id === s.ziel);
        if (!nw || !ziel) return;

        /* Der Zielvorgang: ein offener Krankheitsvorgang dieser Person,
           sonst ein neuer, der auf den alten verweist. */
        let zielVorgang = D.vorgaenge.find((x) => x.thema === "krankheit"
          && x.betrifft.id === ziel.id && gesamtstand(x) !== "erledigt" && x.id !== alt.id);
        const neuAngelegt = !zielVorgang;
        if (!zielVorgang) {
          zielVorgang = D.vorgangAnlegen({
            art: "aufgabe", thema: "krankheit",
            titel: "Krankmeldung – Nachweis neu zugeordnet – " + ziel.name,
            betrifft: { art: "mitarbeiter", id: ziel.id, name: ziel.name },
            sichtbar: ["operations.read", "personnel.read"], vertraulich: ["personnel.read"],
            /* Mit Teilschritten, also auch mit der Pruefsperre: Beim
               neuen Vorgang beginnt die Dokumentpruefung wirklich von
               vorn und laesst sich nicht ueberspringen. */
            teile: D.krankheitsTeile(),
            daten: { von: alt.daten.von, bis: alt.daten.bis, bezugAuf: alt.id, nachweise: [], klaerungen: [] }
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
          nachher: ziel.name + " (Vorgang " + zielVorgang.id
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
    if (feld.matches("[data-vg-von]")) { stand.vonDatum = feld.value; R.zeichnen(); return true; }
    if (feld.matches("[data-vg-bis]")) { stand.bisDatum = feld.value; R.zeichnen(); return true; }
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

  window.ProbeVorgaenge = {
    anmelden, zeichne, tun, geaendert, glocke, ungesehen, offeneEingabe, offeneFuerMich
  };
})();
