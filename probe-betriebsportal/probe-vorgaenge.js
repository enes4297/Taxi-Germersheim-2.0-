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
    offen: "",          // offener Vorgang
    entscheidung: null, // { id, art, grund, stufe, fehler }
    uebernahme: null,
    /* Fuer die Vorfuehrung der Paralleländerung. */
    fremdstand: {}
  };

  const REITER = [
    { id: "neu",         name: "Neu" },
    { id: "zugewiesen",  name: "Mir zugewiesen" },
    { id: "bearbeitung", name: "In Bearbeitung" },
    { id: "warten",      name: "Wartet auf Rückmeldung" },
    { id: "erledigt",    name: "Erledigt" },
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
          eingang: "laufend",
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
        eingang: "laufend",
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

  const sichtbarFuerMich = (v) => R.darf(v.sichtbar);
  const vertraulichSichtbar = (v) => !v.vertraulich.length || R.darf(v.vertraulich);

  const ungesehen = () => alleVorgaenge().filter((v) => sichtbarFuerMich(v) && !v.gesehen);

  /* ============================================================
     Liste
     ============================================================ */
  function gefiltert() {
    let liste = alleVorgaenge().filter(sichtbarFuerMich);
    if (stand.reiter === "neu") liste = liste.filter((v) => v.zustand === "neu");
    if (stand.reiter === "zugewiesen") liste = liste.filter((v) => v.zustaendig === meineRolle() && v.zustand !== "erledigt");
    if (stand.reiter === "bearbeitung") liste = liste.filter((v) => v.zustand === "bearbeitung");
    if (stand.reiter === "warten") liste = liste.filter((v) => v.zustand === "warten");
    if (stand.reiter === "erledigt") liste = liste.filter((v) => v.zustand === "erledigt" || v.zustand === "archiviert");
    if (stand.thema !== "alle") liste = liste.filter((v) => v.thema === stand.thema);
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
    if (v.zustand === "erledigt" || v.zustand === "archiviert") return { name: "Ansehen", tun: `vg-oeffnen:${v.id}` };
    if (v.thema === "urlaub" && v.art === "aufgabe") return { name: "Antrag öffnen", tun: `vg-oeffnen:${v.id}` };
    if (v.thema === "krankheit") return { name: "Krankmeldung öffnen", tun: `vg-oeffnen:${v.id}` };
    if (v.thema === "fahrt") return { name: "Zur Fahrt", tun: `vg-oeffnen:${v.id}` };
    if (v.thema === "dokument") return { name: "Dokument prüfen", tun: `vg-oeffnen:${v.id}` };
    return { name: "Öffnen", tun: `vg-oeffnen:${v.id}` };
  }

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
        <div><dt>Zuständig</dt><dd>${v.zustaendig ? h(v.zustaendig) : "noch niemand"}</dd></div>
        <div><dt>Stand</dt><dd>${h(D.VORGANG_ZUSTAENDE[v.zustand])}</dd></div>
      </dl>
      <div class="vg-aktionen">
        <button class="knopf klein haupt-knopf" type="button" data-tun="${h(aktion.tun)}">${h(aktion.name)}</button>
        ${!v.zustaendig && v.zustand !== "erledigt"
          ? `<button class="knopf klein" type="button" data-tun="vg-uebernehmen:${h(v.id)}">Übernehmen</button>` : ""}
        ${v.zustaendig && v.zustand !== "erledigt"
          ? `<button class="knopf klein" type="button" data-tun="vg-weitergeben:${h(v.id)}">Weitergeben</button>` : ""}
      </div>
    </article>`;
  }

  function zeichne() {
    const alle = alleVorgaenge().filter(sichtbarFuerMich);
    const liste = gefiltert();
    const zaehler = (id) => {
      if (id === "alle") return alle.length;
      if (id === "zugewiesen") return alle.filter((v) => v.zustaendig === meineRolle() && v.zustand !== "erledigt").length;
      if (id === "erledigt") return alle.filter((v) => v.zustand === "erledigt" || v.zustand === "archiviert").length;
      return alle.filter((v) => v.zustand === id).length;
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
          <label style="min-width:220px">Suche nach Vorgang oder Person
            <input type="search" data-vg-suche value="${h(stand.suche)}" placeholder="Testfahrer, V0001 …"></label>
        </div>
        ${darfEntscheiden() || !R.darf("operations.write") ? "" : zusatzSchalter()}
        <div style="margin-top:14px">${inhalt}</div>
      </div>`;
  }

  /*
    Vorfuehrung: So bekaeme eine Dispositionsperson die Fähigkeit zur
    Urlaubsentscheidung einzeln - ohne dass die ganze Rolle erweitert
    wird. Im echten Portal kaeme das aus der Rollenverwaltung.
  */
  function zusatzSchalter() {
    return `<div class="zusatz-schalter">
      <div>
        <strong>Urlaubsentscheidung ist Ihrer Rolle nicht zugeordnet</strong>
        <span>Sie sehen den Antrag und seine Planungswirkung und können eine betriebliche
          Empfehlung hinterlassen — entscheiden dürfen Administration und Personal.</span>
      </div>
      <button class="knopf klein" type="button" data-tun="vg-zusatz">
        Vorführen: Fähigkeit „absence.decide“ einzeln vergeben</button>
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
            <ul class="konfliktliste">
              <li><strong>${h(v.daten.datei)}</strong>
                <span>eingereicht ${h(v.eingang)} · wird über eine kurz gültige, signierte Adresse geöffnet</span></li>
              ${(v.daten.folge || []).map((f) => `<li class="ist-ausnahme">
                <strong>${h(f.datei)}</strong><span>Folgebescheinigung · ${h(f.zeit)}</span></li>`).join("")}
            </ul>
            <div class="knopfzeile">
              <button class="knopf klein" type="button" data-tun="vg-datei:${h(v.id)}">Datei sicher prüfen</button>
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
    const erledigt = v.zustand === "erledigt" || v.zustand === "archiviert";
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
            <div><dt>Stand</dt><dd>${h(D.VORGANG_ZUSTAENDE[v.zustand])}</dd></div>
            <div><dt>Zuständig</dt><dd>${v.zustaendig ? h(v.zustaendig) : "noch niemand"}</dd></div>
          </dl>

          ${detail ? detail(v) : `<div class="dialog-schritt">
            <p>${h(v.daten.text || "")}</p></div>`}

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
          ${!erledigt && v.thema !== "urlaub"
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
      <div><dt>Entschieden von</dt><dd>${h(meineRolle())}</dd></div>
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

  function tun(name, wert) {
    switch (name) {
      case "vg-reiter": stand.reiter = wert; R.zeichnen(); return;
      case "vg-zusatz":
        /* Vorfuehrung: die Faehigkeit einzeln vergeben. */
        if (!R.zustand.zusatz.includes("absence.decide")) R.zustand.zusatz.push("absence.decide");
        R.zeichnen();
        return;

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

      case "vg-uebernehmen": {
        const v = vorgangFinden(wert);
        if (!v) return;
        handhabungSetzen(v, {
          zustaendig: meineRolle(),
          zustand: v.zustand === "neu" ? "bearbeitung" : v.zustand,
          gesehen: true
        });
        if (!v.abgeleitet) v.version += 1;
        D.protokollieren({
          wer: meineRolle(), zeit: jetzt(), betrifft: v.titel,
          was: "Aufgabe übernommen", vorher: "noch niemand", nachher: meineRolle(), grund: ""
        });
        R.zeichnen();
        return;
      }

      case "vg-weitergeben": {
        const v = vorgangFinden(wert);
        if (!v) return;
        const vorher = v.zustaendig || "noch niemand";
        handhabungSetzen(v, { zustaendig: "", zustand: "neu" });
        if (!v.abgeleitet) v.version += 1;
        D.protokollieren({
          wer: meineRolle(), zeit: jetzt(), betrifft: v.titel,
          was: "Aufgabe weitergegeben", vorher, nachher: "wieder offen", grund: ""
        });
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
          wer: meineRolle(), zeit: jetzt(), betrifft: v.titel,
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
          wer: meineRolle(), zeit: jetzt(), betrifft: v.titel,
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
          wer: meineRolle(), zeit: jetzt(), betrifft: v.titel,
          was: "Rückfrage gestellt", vorher: "Neu", nachher: "Wartet auf Rückmeldung", grund: ""
        });
        stand.offen = v.id;
        R.dialogOeffnen(vorgangDialog());
        R.zeichnen();
        return;
      }

      case "vg-erledigen": {
        const v = vorgangFinden(wert);
        if (!v) return;
        const vorher = D.VORGANG_ZUSTAENDE[v.zustand];
        handhabungSetzen(v, { zustand: "erledigt", zustaendig: v.zustaendig || meineRolle() });
        D.protokollieren({
          wer: meineRolle(), zeit: jetzt(), betrifft: v.titel,
          was: "Vorgang erledigt", vorher, nachher: "Erledigt", grund: ""
        });
        R.dialogSchliessen(true);
        R.zeichnen();
        return;
      }

      case "vg-datei":
        R.dialogOeffnen(quittung("Datei sicher prüfen", {
          wer: meineRolle(), zeit: jetzt(), betrifft: wert,
          vorher: "nicht geöffnet", nachher: "über signierte Adresse geöffnet", grund: ""
        }, "Im echten Portal entstünde jetzt eine kurz gültige, signierte Adresse. Es gibt keine öffentliche Adresse und keinen Anhang per E-Mail. In dieser Probe gibt es keine Datei."));
        return;

      case "vg-folge": {
        const v = vorgangFinden(wert);
        if (!v || !vertraulichSichtbar(v)) return;
        v.daten.folge = v.daten.folge || [];
        v.daten.folge.push({ datei: `Testbescheinigung-${v.betrifft.id}-0${v.daten.folge.length + 2}.pdf`, zeit: jetzt() });
        v.version += 1;
        D.protokollieren({
          wer: meineRolle(), zeit: jetzt(), betrifft: v.titel,
          was: "Folgebescheinigung zugeordnet", vorher: `${v.daten.folge.length} Nachweis(e)`,
          nachher: `${v.daten.folge.length + 1} Nachweis(e)`, grund: ""
        });
        R.dialogOeffnen(vorgangDialog());
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
          daten: { von: neuVon, bis: neuBis, datei: alt.daten.datei, folge: [], bezugAuf: alt.id },
          zustaendig: meineRolle(), zustand: "bearbeitung"
        });
        const eintrag = {
          wer: meineRolle(), zeit: jetzt(), betrifft: alt.titel,
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
    return false;
  }

  const offeneEingabe = () => {
    const g = document.querySelector("[data-vg-grund]");
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
