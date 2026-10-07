/* ============================================================
   Designprobe Betriebsportal - die Bereiche
   ============================================================
   Jeder Bereich ist eine eigene Funktion und kennt nur seine Ansicht.
   Es gibt keinen Supabase-Zugriff, kein fetch, keinen Upload, keinen
   Versand und keine PAJ-Anfrage.
   ============================================================ */
(() => {
  "use strict";

  const R = window.ProbeRahmen;
  const D = window.ProbeDaten;
  const h = R.h;

  const mitarbeiterVon = (id) => D.mitarbeiter.find((m) => m.id === id);
  const fahrzeugVon = (id) => D.fahrzeuge.find((f) => f.id === id);
  const vorlageVon = (id) => D.vorlagen.find((v) => v.id === id);
  /* ============================================================
     Planung - Arbeitsstand
     ============================================================
     Wichtige Aenderung nach dem manuellen Test: Eine Planzeile wird
     ueber die MITARBEITERKENNUNG angesprochen, nicht mehr ueber ihre
     Stelle im Array. Vorher hiess es data-zeile="3" - wurde gefiltert
     oder umsortiert, konnte dieselbe Nummer auf eine andere Person
     zeigen. Jetzt traegt jedes Bedienelement die Kennung der Person,
     zu der es gehoert. Ein Klick bei Mitarbeiter A kann Mitarbeiter B
     nicht mehr erreichen.
     ============================================================ */
  /* Der gewaehlte Tag als ISO-Datum. Ohne Wahl ist es heute. */
  function planTagIso() {
    if (!R.zustand.planDatum) R.zustand.planDatum = D.alsIso(D.heute);
    return R.zustand.planDatum;
  }
  const planDatumObjekt = () => new Date(planTagIso() + "T00:00:00");
  const istHeute = () => planTagIso() === D.alsIso(D.heute);
  const istMorgen = () => planTagIso() === D.alsIso(D.tagAls(1));
  const tagWort = () => istHeute() ? "heute" : istMorgen() ? "morgen" : "diesen Tag";
  const tagWortGross = () => istHeute() ? "Heute" : istMorgen() ? "Morgen" : D.alsText(planDatumObjekt());
  /* Datum verschieben - in Tagen. */
  function planDatumVerschieben(tage) {
    const d = planDatumObjekt();
    d.setDate(d.getDate() + tage);
    R.zustand.planDatum = D.alsIso(d);
    R.zustand.planEntwurf = null;
  }

  function planEntwurf() {
    const iso = planTagIso();
    if (!R.zustand.planEntwurf || R.zustand.planEntwurf.iso !== iso) {
      /* Fuer Tage ohne gespeicherten Plan entsteht ein leerer - sonst
         liesse sich ein Urlaub in zwei Wochen gar nicht nachsehen. */
      if (!D.planung[iso]) {
        D.planung[iso] = {
          veroeffentlicht: false, veroeffentlichtUm: null, geaendertSeitdem: false,
          zeilen: D.mitarbeiter.map((m) => ({
            mitarbeiterId: m.id, imDienst: false, vorlage: null,
            von: "", bis: "", fahrzeugId: null
          }))
        };
      }
      const quelle = D.planung[iso];
      R.zustand.planEntwurf = {
        iso,
        zeilen: quelle.zeilen.map((z) => ({ ...z })),
        urzeilen: quelle.zeilen.map((z) => ({ ...z })),
        filter: "alle",
        suche: "",
        /* Fuer "Letzte Änderung rückgängig". Bewusst klein gehalten. */
        verlauf: [],
        zeitfehler: {}
      };
    }
    return R.zustand.planEntwurf;
  }

  /* Die eine Stelle, an der eine Zeile gefunden wird. */
  const zeileVon = (e, mitarbeiterId) =>
    e.zeilen.find((z) => z.mitarbeiterId === mitarbeiterId) || null;
  const urzeileVon = (e, mitarbeiterId) =>
    e.urzeilen.find((z) => z.mitarbeiterId === mitarbeiterId) || null;

  function zeileGeaendert(e, mitarbeiterId) {
    const jetzt = zeileVon(e, mitarbeiterId);
    const vorher = urzeileVon(e, mitarbeiterId);
    return JSON.stringify(jetzt) !== JSON.stringify(vorher);
  }

  const anzahlGeaendert = (e) =>
    e.zeilen.filter((z) => zeileGeaendert(e, z.mitarbeiterId)).length;

  /* Vor jeder Aenderung den Stand sichern - fuer Rueckgaengig. */
  function merken(e) {
    e.verlauf.push({
      zeilen: e.zeilen.map((z) => ({ ...z })),
      zeitfehler: { ...e.zeitfehler }
    });
    if (e.verlauf.length > 25) e.verlauf.shift();
  }

  /* ============================================================
     Abwesenheiten in der Planung
     ============================================================
     Die Planung LIEST Krankmeldungen und Urlaub. Sie schreibt dort
     nichts und loescht dort nichts. Weicht der Dispatcher bewusst ab,
     entsteht ausschliesslich eine begruendete Ausnahme FUER DIESEN TAG
     in der Planzeile - der Abwesenheitsdatensatz bleibt, wie er ist.
  */
  const abwesenheitVon = (e, mitarbeiterId) => D.abwesenheitFuer(mitarbeiterId, e.iso);

  /*
    Der Tagesstatus. Vier echte Zustaende, keine reine Optik:
    "krank" und "urlaub" schlagen auf Filter, Kennzahlen, Konflikte und
    die Veroeffentlichung durch.
  */
  /* Eine Weiterleitung an die zentrale Tageswahrheit in
     probe-daten.js. Die Planung arbeitet am Entwurf, der Rest am
     gespeicherten Plan - die Regel ist dieselbe. */
  const tagesstatus = (e, z) => D.tagesstatusAm(e.iso, z);

  const STATUSNAMEN = { dienst: "Im Dienst", frei: "Frei", krank: "Krank", urlaub: "Urlaub" };

  /* Arbeitet die Person an diesem Tag tatsaechlich? Eine begruendete
     Ausnahme zaehlt als Dienst. */
  const arbeitetAmTag = (e, z) => D.arbeitetAm(e.iso, z);

  /* Die Zeitrechnung fuer Schichten und die Pruefung auf teilweise
     abgedeckte Abwesenheit stehen jetzt in probe-daten.js, bei den
     uebrigen Konfliktregeln. Hier lagen sie doppelt - und nur die
     Planung kam daran.
  */

  /*
    Die Konflikte des Planungsentwurfs.

    GEMESSENE AUSGANGSFEHLER: Der Kalender leitete seine Konflikte
    aus schichtbefund() ab und sah deshalb nur, was eine EINZELNE
    Zeile verraet - ein doppelt vergebenes Fahrzeug und ein Fahrer
    ohne Fahrzeug fielen dort nicht auf. Die Regeln standen hier, in
    der Planung, und waren fuer andere Ansichten nicht erreichbar.

    Jetzt stehen sie in probe-daten.js. Diese Funktion gibt nur noch
    den Entwurf hinein - damit rechnen Planung, Kalender, Uebersicht
    und Meldungen nachweislich dasselbe.
  */
  const konflikteVon = (entwurf) =>
    D.konflikteFuer(entwurf.iso, entwurf.zeilen, entwurf.zeitfehler);
  /* Welche Mitarbeiter sind von mindestens einem Konflikt betroffen? */
  const betroffene = (liste) => D.konfliktZeilen(liste);

  const kurzHinweis = (liste, mitarbeiterId) => {
    const treffer = liste.find((k) => k.kennung === mitarbeiterId || k.zweiteKennung === mitarbeiterId);
    return treffer ? treffer.kurz : "";
  };

  /* ============================================================
     1. Übersicht
     ============================================================ */
  /*
    Die eingeschraenkte Uebersicht.

    GEMESSENER AUSGANGSFEHLER: Ein Mitarbeiter mit genau EINER
    Faehigkeit (self.read von 22) bekam dieselbe Uebersicht wie die
    Disposition: zehn Fahrten mit Kunden, Abholorten, Zielen, Fahrern
    und Fahrzeugen, dazu die betrieblichen Kennzahlen und alle
    Dispositionsaktionen.

    Hier wird nicht die Dispositionsuebersicht abgeschwaecht, sondern
    eine eigene gezeigt: was diese Person betrifft. Die Meldungen
    bleiben - und mit ihnen die Nachricht an alle Mitarbeiter, die
    ausdruecklich an alle gerichtet ist.
  */
  /*
    Der Hinweis, weshalb die betrieblichen Abschnitte fehlen.

    GEMESSENER AUSGANGSFEHLER: Der Satz war fest und nannte immer
    "Fahrten, Planung, Flotte und Kundendaten". Fuer die Buchhaltung
    war das falsch: Sie hat customers.read und sieht den Bereich
    Kunden in der Navigation. Der Hinweis hat ihr etwas abgesprochen,
    was sie tatsaechlich darf.

    Jetzt wird nur genannt, was an dieser Anmeldung wirklich fehlt.
    Es werden dabei KEINE Rechte veraendert und keine Bereiche
    freigegeben - der Satz liest die vorhandenen Faehigkeiten.
  */
  function fehlendeBereicheSatz() {
    const fehlt = [
      !R.darf("fahrten.read") ? "Fahrten" : "",
      !R.darf("planung.read") ? "Einsatzplanung" : "",
      !R.darf("fleet.read") ? "Flottendaten" : "",
      !R.darf("customers.read") ? "Kundendaten" : ""
    ].filter(Boolean);
    if (!fehlt.length) return "";
    /* "a, b und c" - mit "und" vor dem letzten. Dieser Hinweis
       erscheint nur, wenn fahrten.read, planung.read UND fleet.read
       alle fehlen - es sind also immer mindestens drei. Deshalb
       braucht es keine Einzahlform. */
    const aufzaehlung = fehlt.slice(0, -1).join(", ")
      + " und " + fehlt[fehlt.length - 1];
    return `<p class="schritt-hinweis">${h(aufzaehlung)} gehören zur
      Disposition beziehungsweise zur Verwaltung. Sie sind in Ihrer Übersicht
      nicht enthalten — das ist keine Störung.</p>`;
  }

  function eigeneUebersicht(meldungen, nachrichten) {
    return `
      <div class="bereichskopf">
        <div>
          <h1>Übersicht</h1>
          <p class="wichtig">${h(D.alsText(D.heute))} · ${h(R.aktuellesKonto().name)} · ${h(R.ROLLENNAMEN[R.zustand.rolle])}</p>
        </div>
      </div>

      <div class="flaeche">
        <h2>Für Sie</h2>
        <div class="kennzahlen">
          ${R.kennzahl(meldungen.length, "Meldungen für Sie", meldungen.length ? "warnung" : "gut", "meldungen")}
        </div>
        ${fehlendeBereicheSatz()}
      </div>

      <div class="flaeche">
        <h2>Nachrichten</h2>
        ${nachrichten.length
          ? `<ul class="konfliktliste">${nachrichten.map((v) => `<li>
              <strong>${h(v.titel)}</strong>
              ${v.daten && v.daten.text ? `<br>${h(v.daten.text)}` : ""}
              <br><span style="color:var(--gedaempft)">${h(v.betrifft.name)} · ${h(v.eingang)}</span>
            </li>`).join("")}</ul>`
          : R.kastenLeer("Nachrichten für Sie")}
      </div>

      <div class="flaeche">
        <h2>Schnellaktionen</h2>
        <div class="wahlraster">
          <button class="wahlkarte" type="button" data-ziel="meldungen"><strong>Meldungen</strong><span>${h(meldungen.length)} offen</span></button>
        </div>
      </div>`;
  }

  /* ============================================================
     1. Übersicht
     ============================================================

     GEMESSENER AUSGANGSFEHLER: Dieser Bereich war ueberhaupt nicht
     rechteabhaengig. Die Buchhaltung sah "Neue Fahrt", "Schicht
     planen", "Fahrer wechseln", "Fahrzeug wechseln" und "Anfrage
     bearbeiten", obwohl ihr operations.write, planung.read und
     fahrten.read fehlen - und "Neue Fahrt" ging auch auf.

     Jetzt entscheidet jede Faehigkeit ueber ihren Abschnitt. Nicht
     erlaubte Schnellaktionen werden WEGGELASSEN, nicht ausgegraut,
     und die Daten dahinter werden gar nicht erst abgefragt. Die
     Handler sperren zusaetzlich - siehe tun().
  */
  function uebersicht() {
    const iso = D.alsIso(D.heute);

    const darfFahrten = R.darf("fahrten.read");
    const darfPlanung = R.darf("planung.read");
    const darfFlotte  = R.darf("fleet.read");
    const darfTun     = R.darf("operations.write");
    /* Ohne jede betriebliche Faehigkeit ist das hier nicht die
       richtige Uebersicht. */
    const betrieblich = darfFahrten || darfPlanung || darfFlotte;

    /* Diese beiden Bestaende sind selbst schon sichtbarkeitsgefiltert. */
    const meldungen = window.ProbeVorgaenge.offeneFuerMich();
    const nachrichten = window.ProbeVorgaenge.nachrichtenFuerMich();
    const warnungen = window.ProbeVorgaenge.offeneWarnungen().length;

    if (!betrieblich) return eigeneUebersicht(meldungen, nachrichten);

    /*
      Fahrer im Dienst, Fahrzeug und Konflikt kommen aus derselben
      Tageswahrheit wie die Planung (probe-daten.js). Vorher stand
      hier plan.zeilen.filter((z) => z.imDienst) - das rohe
      Kennzeichen ohne Abwesenheit: Die Uebersicht zeigte vier Fahrer
      im Dienst, die Planung fuer denselben Tag drei, weil der kranke
      Testfahrer 02 noch eine alte Schicht im Plan hatte.

      Abgefragt wird nur, was gezeigt werden darf.
    */
    const fahrend = darfPlanung ? D.imDienstAm(iso) : [];
    const imDienst = fahrend.length;
    const ohneFahrzeug = fahrend.filter((z) => !D.fahrzeugAktiv(iso, z)).length;

    /* Keine eigene Rechnung mehr: Jede Fahrtenzahl kommt aus
       derselben Definition in probe-daten.js. */
    const alleHeute = darfFahrten ? D.fahrtenHeute() : [];
    const heuteAlle = alleHeute.length;
    const offeneZuweisung = darfFahrten ? D.nichtZugewiesen().length : 0;
    const eingang = alleHeute.filter((f) => f.zustand === "eingang").length;
    const unterwegs = alleHeute.filter((f) => f.zustand === "unterwegs").length;
    const frei = darfFlotte ? D.fahrzeuge.filter((f) => f.zustand === "verfuegbar").length : 0;

    /* Derselbe Sortierer wie in der Fahrtenliste und im Kalender.
       Fahrten ohne geklaerte Zeit stehen hinten, nicht dazwischen. */
    const naechste = darfFahrten
      ? D.nachZeit(alleHeute.filter((f) => ["geplant", "unterwegs", "ungeplant"].includes(f.zustand))).slice(0, 6)
      : [];

    /* Jede Karte einzeln an ihrer Faehigkeit. */
    const karten = [
      darfFahrten ? R.kennzahl(heuteAlle, "Fahrten heute", "", "fahrten:alle") : "",
      darfFahrten ? R.kennzahl(offeneZuweisung, "noch nicht zugewiesen", offeneZuweisung ? "warnung" : "gut", "fahrten:offen") : "",
      darfFahrten ? R.kennzahl(unterwegs, "gerade unterwegs", "marke", "fahrten:unterwegs") : "",
      darfPlanung ? R.kennzahl(imDienst, "Fahrer im Dienst", "gut", "planung") : "",
      darfFlotte  ? R.kennzahl(frei, "Fahrzeuge verfügbar", "gut", "team") : "",
      darfPlanung ? R.kennzahl(ohneFahrzeug, "im Dienst ohne Fahrzeug", ohneFahrzeug ? "warnung" : "gut", "planung") : "",
      R.kennzahl(warnungen, "Warnungen", warnungen ? "warnung" : "gut", "meldungen:warnungen")
    ].filter(Boolean).join("");

    /* Ebenso die Schnellaktionen. Weggelassen, nicht ausgegraut. */
    const schnell = [
      darfTun ? `<button class="wahlkarte" type="button" data-tun="neue-fahrt"><strong>Neue Fahrt</strong><span>Fahrt aufnehmen</span></button>` : "",
      darfPlanung ? `<button class="wahlkarte" type="button" data-ziel="planung"><strong>Schicht planen</strong><span>Heute oder morgen</span></button>` : "",
      darfTun && darfFahrten ? `<button class="wahlkarte" type="button" data-tun="wechsel-fahrer"><strong>Fahrer wechseln</strong><span>Bei einer Fahrt</span></button>` : "",
      darfTun && darfFahrten ? `<button class="wahlkarte" type="button" data-tun="wechsel-fahrzeug"><strong>Fahrzeug wechseln</strong><span>Bei einer Fahrt</span></button>` : "",
      darfFahrten ? `<button class="wahlkarte" type="button" data-ziel="fahrten:eingang"><strong>Anfrage bearbeiten</strong><span>${h(eingang)} im Eingang</span></button>` : "",
      `<button class="wahlkarte" type="button" data-ziel="meldungen"><strong>Meldungen</strong><span>${h(meldungen.length)} offen</span></button>`
    ].filter(Boolean).join("");

    return `
      <div class="bereichskopf">
        <div>
          <h1>Übersicht</h1>
          <p class="wichtig">${h(D.alsText(D.heute))}${darfPlanung ? ` · ${h(imDienst)} im Dienst` : ""}${
            darfFahrten
              ? ` · ${offeneZuweisung > 0
                  ? `${offeneZuweisung} ${offeneZuweisung === 1 ? "Fahrt wartet" : "Fahrten warten"} auf eine Zuweisung`
                  : "alle Fahrten sind zugewiesen"}`
              : ""}</p>
        </div>
        ${darfTun ? `<div class="hauptaktion">
          <button class="knopf haupt-knopf" type="button" data-tun="neue-fahrt">Neue Fahrt aufnehmen</button>
        </div>` : ""}
      </div>

      <div class="flaeche">
        <h2>Jetzt wichtig <span class="offen">Zahlen sind anklickbar</span></h2>
        <div class="kennzahlen">${karten}</div>
      </div>

      ${darfFahrten ? `<div class="flaeche">
        <h2>Tagesverlauf <span class="offen">nächste Fahrten</span></h2>
        <div class="tabelle-huelle">
          <table class="liste">
            <thead><tr>
              <th>Zeit</th><th>Kunde</th><th>Von</th><th>Nach</th>
              <th>Fahrer</th><th>Fahrzeug</th><th>Zustand</th>
            </tr></thead>
            <tbody>
              ${naechste.map((f) => {
                const fa = mitarbeiterVon(f.fahrerId);
                const fz = fahrzeugVon(f.fahrzeugId);
                return `<tr>
                  <td>${f.zeit ? `<strong>${h(f.zeit)}</strong>` : R.marke("warnung", "Zeit offen")}</td>
                  <td>${h(f.kunde)}</td>
                  <td>${h(f.von)}</td>
                  <td>${h(f.nach)}</td>
                  <td>${fa ? h(fa.name) : R.marke("warnung", "offen")}</td>
                  <td>${fz ? h(fz.kennzeichen) : R.marke("warnung", "offen")}</td>
                  <td>${zustandMarke(f.zustand)}</td>
                </tr>`;
              }).join("")}
            </tbody>
          </table>
        </div>
        <p class="wichtig" style="margin-top:10px;font-size:14px;">
          Entfernung und Fahrzeit werden nicht angezeigt — es ist keine Kartenquelle angebunden.
        </p>
      </div>` : ""}

      <div class="flaeche">
        <h2>Schnellaktionen</h2>
        <div class="wahlraster">${schnell}</div>
      </div>`;
  }

  function zustandMarke(id) {
    const tabelle = {
      eingang:       ["aktiv", "Eingang"],
      ungeplant:     ["warnung", "Ungeplant"],
      geplant:       ["ruhig", "Geplant"],
      unterwegs:     ["aktiv", "Unterwegs"],
      abgeschlossen: ["gut", "Abgeschlossen"],
      storniert:     ["ruhig", "Storniert"],
      klaerung:      ["warnung", "Klärungsbedarf"]
    };
    const [art, text] = tabelle[id] || ["ruhig", id];
    return R.marke(art, text);
  }

  /* ============================================================
     2. Fahrten
     ============================================================ */
  function fahrten() {
    const filter = R.zustand.fahrtFilter;
    const vorfuehrung = R.zustand.fahrtenZustand || "geladen";

    const alleHeute = D.fahrtenHeute();
    const zaehler = (id) => (id === "offen"
      ? D.nichtZugewiesen().length
      : alleHeute.filter((f) => f.zustand === id).length);
    /*
      "offen" ist der Filter hinter der Kennzahl "noch nicht
      zugewiesen". Er zeigt genau die Menge, deren Zahl auf der Karte
      steht - vorher sprang die Karte in "ungeplant" und zeigte
      weniger.
    */
    const roh = filter === "alle" ? alleHeute
      : filter === "offen" ? D.nichtZugewiesen()
      : alleHeute.filter((f) => f.zustand === filter);
    /* Chronologisch, mit getrenntem Abschnitt fuer offene Zeiten. */
    const mitZeit = D.mitZeit(roh);
    const ohneZeit = D.ohneZeit(roh);
    const liste = mitZeit.concat(ohneZeit);

    let rumpf;
    if (vorfuehrung === "laedt") {
      rumpf = R.zustandsKasten("laedt", "Fahrten werden geladen", "Einen Moment.");
    } else if (vorfuehrung === "fehler") {
      rumpf = R.kastenFehler("Fahrten");
    } else if (vorfuehrung === "leer" || !liste.length) {
      rumpf = R.kastenLeer("Fahrten in dieser Ansicht");
    } else {
      /*
        Zwei Abschnitte statt einer Liste. Fahrten ohne geklaerte
        Abholzeit werden nicht zwischen Uhrzeiten einsortiert - das
        waere eine behauptete Reihenfolge. Sie stehen in einem
        eigenen Abschnitt darunter.
      */
      const tabelle = (reihen) => `<div class="tabelle-huelle"><table class="liste">
        <thead><tr>
          <th>Nummer</th><th>Zeit</th><th>Kunde</th><th>Von</th><th>Nach</th>
          <th>Fahrer</th><th>Fahrzeug</th><th>Zustand</th><th></th>
        </tr></thead>
        <tbody>${reihen.map((f) => {
          const fa = mitarbeiterVon(f.fahrerId);
          const fz = fahrzeugVon(f.fahrzeugId);
          return `<tr>
            <td>${h(f.id)}</td>
            <td>${f.zeit ? `<strong>${h(f.zeit)}</strong>` : R.marke("warnung", "Zeit offen")}</td>
            <td>${h(f.kunde)}</td>
            <td>${h(f.von)}</td>
            <td>${h(f.nach)}</td>
            <td>${fa ? h(fa.name) : R.marke("warnung", "offen")}</td>
            <td>${fz ? h(fz.kennzeichen) : R.marke("warnung", "offen")}</td>
            <td>${zustandMarke(f.zustand)}
              ${f.nurProbe ? `<br>${R.marke("aktiv", "nur Designprobe – nicht gespeichert")}` : ""}
              ${f.hinweis ? `<br><span style="font-size:13px;color:var(--gedaempft)">${h(f.hinweis)}</span>` : ""}</td>
            <td><button class="knopf klein" type="button" data-tun="fahrt-oeffnen:${h(f.id)}">Öffnen</button></td>
          </tr>`;
        }).join("")}</tbody></table></div>`;

      rumpf = (mitZeit.length ? tabelle(mitZeit) : "")
        + (ohneZeit.length ? `<h3 class="abschnitt-offen">Zeit noch nicht geklärt
            <span class="band-warnung">${ohneZeit.length}</span></h3>
          <p class="schritt-hinweis">Diese Fahrten haben keine verbindliche Abholzeit. Sie
            stehen bewusst nicht zwischen den Uhrzeiten — die Reihenfolge wäre erfunden.</p>
          ${tabelle(ohneZeit)}` : "");
    }

    return `
      <div class="bereichskopf">
        <div>
          <h1>Fahrten</h1>
          <p class="wichtig">${h(zaehler("eingang"))} im Eingang, ${h(zaehler("ungeplant"))} ungeplant, ${h(zaehler("klaerung"))} in Klärung</p>
        </div>
        <div class="hauptaktion">
          <button class="knopf haupt-knopf" type="button" data-tun="neue-fahrt">Neue Fahrt aufnehmen</button>
        </div>
      </div>

      <div class="flaeche">
        <h2>Ansicht</h2>
        <div class="wahlraster">
          <button class="wahlkarte" type="button" data-tun="fahrt-filter:alle" aria-pressed="${filter === "alle"}">
            <strong>Alle</strong><span>${h(alleHeute.length)} Fahrten</span></button>
          <button class="wahlkarte" type="button" data-tun="fahrt-filter:offen" aria-pressed="${filter === "offen"}">
            <strong>Noch nicht zugewiesen</strong><span>${h(zaehler("offen"))} Fahrten</span></button>
          ${D.fahrtZustaende.map((z) => `
            <button class="wahlkarte" type="button" data-tun="fahrt-filter:${h(z.id)}" aria-pressed="${filter === z.id}">
              <strong>${h(z.name)}</strong><span>${h(zaehler(z.id))} Fahrten</span></button>`).join("")}
        </div>
      </div>

      <div class="flaeche">
        <h2>Liste</h2>
        ${rumpf}
      </div>

      <div class="flaeche">
        <h2>Zustände vorführen <span class="offen">gehört zur Designprobe</span></h2>
        <p class="wichtig" style="font-size:14px;margin:0 0 10px;">
          Damit lässt sich prüfen, dass ein Ladefehler nicht wie ein leerer Datenbestand aussieht.
        </p>
        <div class="wahlraster">
          <button class="wahlkarte" type="button" data-tun="fahrt-zustand:geladen" aria-pressed="${vorfuehrung === "geladen"}"><strong>Geladen</strong><span>Normalfall</span></button>
          <button class="wahlkarte" type="button" data-tun="fahrt-zustand:laedt" aria-pressed="${vorfuehrung === "laedt"}"><strong>Lädt</strong><span>noch unterwegs</span></button>
          <button class="wahlkarte" type="button" data-tun="fahrt-zustand:leer" aria-pressed="${vorfuehrung === "leer"}"><strong>Leer</strong><span>nichts eingetragen</span></button>
          <button class="wahlkarte" type="button" data-tun="fahrt-zustand:fehler" aria-pressed="${vorfuehrung === "fehler"}"><strong>Fehler</strong><span>Server nicht erreichbar</span></button>
        </div>
      </div>`;
  }
  /* ============================================================
     3. Planung
     ============================================================ */
  const FILTER = [
    { id: "alle",      name: "Alle" },
    { id: "dienst",    name: "Im Dienst" },
    { id: "frei",      name: "Frei" },
    { id: "krank",     name: "Krank" },
    { id: "urlaub",    name: "Urlaub" },
    { id: "ungeplant", name: "Nur ungeplant" },
    { id: "konflikte", name: "Nur Konflikte" }
  ];

  /* Der Fehlertext des Planungsdatums. Er steht hier und nicht im
     Entwurf, weil er die EINGABE betrifft, nicht die Planung. */
  let planDatumFehler = "";

  function planung() {
    const e = planEntwurf();
    const tag = planDatumObjekt();
    const quelle = D.planung[e.iso];
    const konflikte = konflikteVon(e);
    const betroffen = betroffene(konflikte);
    const geaendert = anzahlGeaendert(e);

    const zaehle = (art) => e.zeilen.filter((z) => tagesstatus(e, z) === art).length;
    const imDienst = zaehle("dienst");
    const ohneFahrzeug = e.zeilen.filter((z) => arbeitetAmTag(e, z) && !z.fahrzeugId).length;

    let stand;
    if (!quelle.veroeffentlicht) {
      stand = R.marke("ruhig", "Entwurf — Mitarbeiter sehen den Plan noch nicht");
    } else if (geaendert > 0) {
      stand = R.marke("warnung", "Änderung noch nicht erneut veröffentlicht");
    } else {
      stand = R.marke("gut", `Veröffentlicht um ${quelle.veroeffentlichtUm} Uhr — Mitarbeiter sehen den Plan`);
    }

    /* Gefiltert wird nur die ANZEIGE. Die Werte in e.zeilen bleiben
       unangetastet - ein Filterwechsel kann nichts loeschen. */
    let sichtbar = e.zeilen.slice();
    if (["dienst", "frei", "krank", "urlaub"].includes(e.filter)) {
      sichtbar = sichtbar.filter((z) => tagesstatus(e, z) === e.filter);
    }
    if (e.filter === "ungeplant") {
      sichtbar = sichtbar.filter((z) => arbeitetAmTag(e, z) && (!z.von || !z.bis || !z.fahrzeugId));
    }
    if (e.filter === "konflikte") {
      sichtbar = sichtbar.filter((z) => betroffen.has(z.mitarbeiterId));
    }
    if (e.suche) {
      const s = e.suche.toLowerCase();
      sichtbar = sichtbar.filter((z) => {
        const m = mitarbeiterVon(z.mitarbeiterId);
        return (m ? m.name : z.mitarbeiterId).toLowerCase().includes(s);
      });
    }

    const tabelle = sichtbar.length
      ? `<div class="tabelle-huelle">
          <table class="liste">
            <thead><tr>
              <th>Mitarbeiter</th><th>Status</th><th>Schicht</th><th>Zeit</th><th>Fahrzeug</th><th>Hinweis</th>
            </tr></thead>
            <tbody>${sichtbar.map((z) => planZeile(e, z, konflikte, zeileGeaendert(e, z.mitarbeiterId))).join("")}</tbody>
          </table>
        </div>`
      : leerZustand(e, konflikte);

    const zaehler = (id) => {
      /*
        GEMESSENER AUSGANGSFEHLER: Hier stand konflikte.length - die
        Anzahl der EINTRAEGE. Der Filter darunter zeigt aber ZEILEN,
        und ein doppelt vergebenes Fahrzeug nennt in einem Eintrag
        zwei Fahrer. Am 06.10.2026 standen deshalb "3" am Knopf und
        vier Zeilen in der Liste.

        Gezaehlt werden jetzt die betroffenen ZEILEN - genau die
        Menge, die der Filter zeigt. Beide kommen aus demselben
        Konfliktbestand.
      */
      if (id === "konflikte") {
        return e.zeilen.filter((z) => betroffen.has(z.mitarbeiterId)).length;
      }
      if (["dienst", "frei", "krank", "urlaub"].includes(id)) return zaehle(id);
      return null;
    };

    return `
      <div class="bereichskopf">
        <div>
          <h1>Planung</h1>
          <p class="wichtig">${h(imDienst)} im Dienst · ${h(zaehle("frei"))} frei · ${h(zaehle("krank"))} krank ·
            ${h(zaehle("urlaub"))} Urlaub · ${h(ohneFahrzeug)} ohne Fahrzeug ·
            ${h(e.zeilen.filter((z) => betroffen.has(z.mitarbeiterId)).length)} mit Konflikt</p>
        </div>
      </div>

      <div class="flaeche">
        <div class="tagleiste">
          <!-- Freie Datumswahl statt nur heute/morgen. Ein genehmigter
               Urlaub in zwei Wochen liess sich vorher gar nicht
               nachsehen - eine echte Bedienluecke aus dem manuellen
               Test. -->
          <div class="tageswahl">
            <button class="knopf klein" type="button" data-tun="plan-zurueck" aria-label="Ein Tag zurück">‹ Zurück</button>
            <button class="knopf klein" type="button" data-tun="plan-heute" aria-pressed="${istHeute()}">Heute</button>
            <button class="knopf klein" type="button" data-tun="plan-morgen" aria-pressed="${istMorgen()}">Morgen</button>
            <label class="tagfeld">Datum
              ${window.ProbeDatum.markup({ kennung: "plan", teil: "tag",
                wert: planTagIso(), beschriftung: "Tag der Planung",
                fehler: planDatumFehler })}</label>
            <button class="knopf klein" type="button" data-tun="plan-vor" aria-label="Ein Tag vor">Vor ›</button>
          </div>
          <span class="tagdatum">${h(D.alsText(tag))}</span>
          ${stand}
        </div>

        <div class="filterzeile" role="group" aria-label="Ansicht filtern">
          ${FILTER.map((f) => {
            const n = zaehler(f.id);
            return `<button class="filterchip" type="button" data-tun="plan-filter:${h(f.id)}"
              aria-pressed="${e.filter === f.id}">${h(f.name)}${n === null ? "" : ` (${h(n)})`}</button>`;
          }).join("")}
        </div>

        <div class="tagleiste">
          <label style="min-width:180px;">Suche
            <input type="search" data-plan-suche value="${h(e.suche)}" placeholder="Name suchen"></label>
          <button class="knopf klein" type="button" data-tun="plan-uebernehmen-gestern">Plan von gestern übernehmen</button>
          <button class="knopf klein" type="button" data-tun="plan-alle-frei">Alle als frei markieren</button>
        </div>

        ${tabelle}

        <!-- Gemessen bei 320 x 568: Vier gestapelte Schaltflaechen in
             einer klebenden Leiste nahmen fast den halben Bildschirm
             ein und verdeckten die Filter darueber - sie waren nicht
             mehr anklickbar. Deshalb kleben nur noch der Stand und die
             Hauptaktion. Die Nebenaktionen stehen im Fluss darueber. -->
        <div class="plan-nebenaktionen">
          <button class="knopf klein" type="button" data-tun="plan-rueckgaengig" ${e.verlauf.length ? "" : "disabled"}>Letzte Änderung rückgängig</button>
          <button class="knopf klein" type="button" data-tun="plan-verwerfen" ${geaendert ? "" : "disabled"}>Änderungen verwerfen</button>
          <button class="knopf klein" type="button" data-tun="plan-entwurf" ${geaendert ? "" : "disabled"}>Entwurf speichern</button>
        </div>

        <div class="aktionsleiste">
          <span class="stand">${geaendert
            ? `${geaendert} Änderung${geaendert === 1 ? "" : "en"} noch nicht gespeichert`
            : "Keine ungespeicherten Änderungen"}</span>
          <button class="knopf haupt-knopf" type="button" data-tun="plan-veroeffentlichen">
            Plan für ${tagWort()} veröffentlichen</button>
        </div>
      </div>`;
  }

  /*
    Der leere Zustand haengt davon ab, WARUM nichts da ist. Der
    allgemeine Satz "Für diesen Zeitraum ist nichts eingetragen" war im
    Konfliktfilter schlicht falsch - er stand da, obwohl gerade eben
    noch Zeilen sichtbar waren und der Plan voll ist.
  */
  function leerZustand(e, konflikte) {
    if (e.suche) {
      return R.zustandsKasten("leer", "Kein Treffer",
        `Zu „${e.suche}“ passt keine Zeile. Die Planung ist davon nicht betroffen.`,
        { name: "Suche zurücksetzen", tun: "plan-suche-leeren" });
    }
    if (e.filter === "konflikte") {
      if (!konflikte.length) {
        return `<div class="zustand gut-geloest">
          <h3>Alle Konflikte gelöst.</h3>
          <p>In diesem Tagesplan gibt es keinen offenen Konflikt mehr.
             Die Zeilen sind nicht verschwunden — dieser Filter zeigt nur
             die betroffenen, und das sind gerade keine.</p>
          <div class="knopfzeile">
            <button class="knopf haupt-knopf" type="button" data-tun="plan-filter:alle">Alle Mitarbeiter anzeigen</button>
            ${e.verlauf.length ? '<button class="knopf" type="button" data-tun="plan-rueckgaengig">Letzte Änderung rückgängig</button>' : ""}
          </div>
        </div>`;
      }
      return R.zustandsKasten("leer", "Keine passende Zeile",
        "Es gibt Konflikte, aber keiner davon betrifft eine sichtbare Zeile.",
        { name: "Alle Mitarbeiter anzeigen", tun: "plan-filter:alle" });
    }
    if (e.filter === "ungeplant") {
      return `<div class="zustand gut-geloest">
        <h3>Alles eingeplant.</h3>
        <p>Für jeden Mitarbeiter im Dienst sind Zeit und Fahrzeug eingetragen.</p>
        <div class="knopfzeile">
          <button class="knopf haupt-knopf" type="button" data-tun="plan-filter:alle">Alle Mitarbeiter anzeigen</button>
        </div>
      </div>`;
    }
    if (["dienst", "frei", "krank", "urlaub"].includes(e.filter)) {
      const name = { dienst: "im Dienst", frei: "frei", krank: "krank gemeldet", urlaub: "im Urlaub" }[e.filter];
      return R.zustandsKasten("leer", `Niemand ist ${name}`,
        `An diesem Tag trifft das auf keinen Mitarbeiter zu. Das ist kein Fehler — es ist der Stand.`,
        { name: "Alle Mitarbeiter anzeigen", tun: "plan-filter:alle" });
    }
    return R.zustandsKasten("leer", "Keine Mitarbeiter",
      "Für diesen Tag ist kein Mitarbeiter hinterlegt.");
  }

  function planZeile(e, z, konflikte, geaendert) {
    const m = mitarbeiterVon(z.mitarbeiterId);
    const id = z.mitarbeiterId;
    const abw = abwesenheitVon(e, id);
    const status = tagesstatus(e, z);
    const arbeitet = status === "dienst";
    const eigene = arbeitet && !z.vorlage;
    const hinweis = kurzHinweis(konflikte, id);
    const zeitfehler = e.zeitfehler[id] || "";

    /* Der Hinweis zur Abwesenheit steht IMMER in der Zeile - auch wenn
       eine Ausnahme erteilt wurde. Sonst waere nicht mehr erkennbar,
       dass hier bewusst abgewichen wird. */
    let abwesenheitsHinweis = "";
    if (abw.widerspruch) {
      abwesenheitsHinweis = `<div class="abw-hinweis ist-krank">
        <strong>Krank und Urlaub am selben Tag</strong>
        <span>Krank ${h(D.zeitraumText(abw.krank))} · Urlaub ${h(D.zeitraumText(abw.urlaub))}</span>
      </div>`;
    } else if (abw.krank) {
      abwesenheitsHinweis = `<div class="abw-hinweis ist-krank">
        <strong>Fahrer ist an diesem Tag krank</strong>
        <span>${h(D.zeitraumText(abw.krank))}</span>
      </div>`;
    } else if (abw.urlaub) {
      abwesenheitsHinweis = `<div class="abw-hinweis ist-urlaub">
        <strong>Fahrer hat an diesem Tag genehmigten Urlaub</strong>
        <span>${h(D.zeitraumText(abw.urlaub))}</span>
      </div>`;
    } else if (abw.beantragt) {
      abwesenheitsHinweis = `<div class="abw-hinweis ist-beantragt">
        <strong>Urlaub beantragt – noch nicht genehmigt</strong>
        <span>${h(D.zeitraumText(abw.beantragt))} · der Fahrer bleibt planbar</span>
      </div>`;
    }

    const ausnahmeMarke = z.ausnahme
      ? `<div class="abw-hinweis ist-ausnahme">
          <strong>Ausnahme: trotz Abwesenheit eingeplant</strong>
          <span>Grund: ${h(z.ausnahme.grund)}</span>
          <button class="knopf klein" type="button" data-tun="plan-ausnahme-zurueck:${h(id)}">Ausnahme aufheben</button>
        </div>`
      : "";

    const statusWahl = abw.wirksam
      ? `<select data-plan="dienst" data-mitarbeiter="${h(id)}" aria-label="Status von ${h(m ? m.name : id)}">
          <option value="abwesend" ${!z.ausnahme ? "selected" : ""}>${h(D.ABWESENHEIT_NAMEN[abw.wirksam.art])}</option>
          <option value="ja" ${z.ausnahme ? "selected" : ""}>Im Dienst (Ausnahme)</option>
          <option value="nein">Frei</option>
        </select>`
      : `<select data-plan="dienst" data-mitarbeiter="${h(id)}" aria-label="Status von ${h(m ? m.name : id)}">
          <option value="ja" ${z.imDienst ? "selected" : ""}>Im Dienst</option>
          <option value="nein" ${!z.imDienst ? "selected" : ""}>Frei</option>
        </select>`;

    return `<tr class="plan-zeile ${geaendert ? "ist-geaendert" : ""} ${abw.wirksam ? "ist-abwesend" : ""}"
        data-mitarbeiter="${h(id)}" data-status="${h(status)}">
      <td><strong>${h(m ? m.name : id)}</strong><br>
        <span style="font-size:13px;color:var(--gedaempft)">${h(m ? m.beschaeftigung : "unbekannte Kennung")}</span>
        ${abwesenheitsHinweis}${ausnahmeMarke}</td>
      <td>${statusWahl}</td>
      <td>${arbeitet ? `
        <select data-plan="vorlage" data-mitarbeiter="${h(id)}" aria-label="Schicht von ${h(m ? m.name : id)}">
          ${D.vorlagen.map((v) => `<option value="${h(v.id)}" ${z.vorlage === v.id || (eigene && v.id === "individuell") ? "selected" : ""}>
            ${h(v.name)}${v.von ? ` · ${h(v.von)}–${h(v.bis)}` : ""}</option>`).join("")}
        </select>` : `<span style="color:var(--gedaempft)">${h(STATUSNAMEN[status])}</span>`}</td>
      <td>${arbeitet ? `
        <span class="zeitpaar">
          ${window.ProbeZeit.markup({ kennung: id, teil: "von", wert: z.von, beschriftung: `Beginn von ${m ? m.name : id}`, fehler: zeitfehler })}
          ${window.ProbeZeit.markup({ kennung: id, teil: "bis", wert: z.bis, beschriftung: `Ende von ${m ? m.name : id}`, fehler: "" })}
        </span>
        ${window.ProbeZeit.ueberMitternacht(z.von, z.bis)
          ? '<br><span style="font-size:13px;color:var(--gedaempft)">über Mitternacht</span>' : ""}
        ` : '<span style="color:var(--gedaempft)">—</span>'}</td>
      <td>${arbeitet ? `
        <select data-plan="fahrzeug" data-mitarbeiter="${h(id)}" aria-label="Fahrzeug von ${h(m ? m.name : id)}">
          <option value="">Kein Fahrzeug</option>
          ${D.fahrzeuge.map((f) => `<option value="${h(f.id)}" ${z.fahrzeugId === f.id ? "selected" : ""}>
            ${h(f.name)} · ${h(f.kennzeichen)}${f.zustand === "werkstatt" ? " (Werkstatt)" : ""}</option>`).join("")}
        </select>` : '<span style="color:var(--gedaempft)">—</span>'}</td>
      <td>${hinweis
        ? R.marke("warnung", hinweis)
        : (arbeitet ? R.marke("gut", "vollständig") : R.marke("ruhig", STATUSNAMEN[status]))}</td>
    </tr>`;
  }

  /* ============================================================
     4. Fahrer & Fahrzeuge
     ============================================================ */
  /* Der Bereich steht in probe-team.js - er ist gross genug fuer ein
     eigenes Modul und braucht denselben Tagesentwurf wie die
     Planung. */
  function team() { return window.ProbeTeam.zeichne(); }

  /* ============================================================
     5. Meldungen
     ============================================================ */
  /* Der Eingang steht in probe-vorgaenge.js - vier Arten in einer
     Liste, mit demselben gemeinsamen Zustand wie Planung und
     "Fahrer & Fahrzeuge". */
  function meldungen() { return window.ProbeVorgaenge.zeichne(); }

  /* ============================================================
     5b. Kalender
     ============================================================ */
  /* Der Kalender steht in probe-kalender.js. Er liest denselben
     Tagesentwurf wie Planung und "Fahrer & Fahrzeuge" - deshalb
     bekommt er dieselben Helfer und baut keine eigene Wahrheit. */
  function kalender() { return window.ProbeKalender.zeichne(); }

  /* ============================================================
     6. Kunden
     ============================================================ */
  /*
    Der Kundenbereich war eine unbewegliche Anzeige: ein Suchfeld ohne
    Horcher, Zeilen ohne Aktion, kein Knopf zum Anlegen. Der manuelle
    Rundgang nennt ihn zu Recht "faktisch eine Anzeige".

    Jetzt: Suche beim Tippen, jede Zeile eine echte Schaltflaeche,
    Enter oeffnet bei genau einem Treffer, und ein Knopf legt an.
  */
  const kundenStand = { suche: "" };

  function kunden() {
    const suche = kundenStand.suche.trim();
    const ergebnis = suche ? D.kundenSuche(suche, 25) : null;
    /* Ohne Suche die ersten 25 - der Bestand hat ueber zweitausend
       Eintraege und wird nie ganz gezeichnet. */
    const liste = ergebnis ? ergebnis.treffer : D.kunden.slice(0, 25);
    const darfAnlegen = R.darf("customers.write");

    const zeile = (k) => {
      const ort = [k.plz, k.ort].filter(Boolean).join(" ");
      return window.ProbeAkten.aktenzeile(
        `ak-kunde:${k.id}`,
        /* Die Vorlesefassung nennt ebenfalls keine Nummer. */
        k.name + ", " + k.telefon
          + (ort ? ", " + ort : "") + ". Kundenakte öffnen.",
        [
          `<strong>${h(k.name)}</strong>${k.nurProbe ? " " + R.marke("aktiv", "neu in der Probe") : ""}`,
          k.art === "firma"
            ? (k.ansprechpartner ? h(k.ansprechpartner) : "<em>ohne Ansprechpartner</em>")
            : "—",
          h(k.telefon),
          h(ort) || "—",
          k.konto === "verknüpft" ? R.marke("gut", "verknüpft") : R.marke("ruhig", "nicht verknüpft"),
          h(k.fahrten) + " Fahrten",
          k.hinweis ? h(k.hinweis) : "—"
        ]
      );
    };

    let rumpf;
    if (ergebnis && ergebnis.zuKurz) {
      /* Dieselbe Schwelle wie im Fahrtassistenten - eine Suche,
         zwei Oberflaechen, eine Regel. */
      rumpf = R.zustandsKasten("leer", "Mindestens zwei Zeichen eingeben",
        `Der Bestand hat ${h(D.kunden.length)} Kunden — es werden nie alle gezeigt. Gesucht wird in Name, Telefonnummer, Firma, Ansprechpartner, Anschrift und E-Mail.`);
    } else if (ergebnis && !liste.length) {
      rumpf = R.zustandsKasten("leer", "Kein Kunde gefunden",
        `Zu „${h(suche)}“ passt kein Eintrag. Gesucht wird in Name, Telefonnummer, Firma, Ansprechpartner, Anschrift und E-Mail.`);
    } else {
      rumpf = `<div class="aktenliste" role="list">
        <div class="az-kopf" aria-hidden="true">
          <span>Name</span><span>Ansprechpartner</span><span>Telefon</span>
          <span>Ort</span><span>Kundenkonto</span><span>Fahrten</span><span>Hinweis</span>
        </div>
        ${liste.map(zeile).join("")}
      </div>`;
    }

    return `
      <div class="bereichskopf">
        <div>
          <h1>Kunden</h1>
          <p class="wichtig">${h(D.kunden.length)} Testkunden im Bestand · jede Zeile öffnet die Akte</p>
        </div>
        ${darfAnlegen ? `<div class="hauptaktion">
          <button class="knopf haupt-knopf" type="button" data-tun="ak-kunde-neu">
            Neuen Kunden anlegen</button>
        </div>` : ""}
      </div>
      <div class="flaeche">
        <h2>Suche</h2>
        <label style="max-width:460px">Name, Telefon, Firma, Anschrift oder E-Mail
          <input type="search" data-kundensuche value="${h(kundenStand.suche)}"
            placeholder="Testkunde 03, Testallee, Testfirma …"></label>
        <p class="schritt-hinweis">Es wird beim Tippen gefiltert. Bei genau einem Treffer
          öffnet Enter die Kundenakte.</p>
        ${ergebnis ? `<p class="wichtig" style="font-size:14px">
          ${h(ergebnis.gesamt)} ${ergebnis.gesamt === 1 ? "Treffer" : "Treffer"}${ergebnis.gesamt > liste.length
            ? `, gezeigt werden die ersten ${h(liste.length)}` : ""}</p>` : ""}
      </div>
      <div class="flaeche">
        <h2>${ergebnis ? "Treffer" : "Liste"}
          <span class="offen">${ergebnis ? h(liste.length) + " angezeigt"
            : `die ersten ${h(liste.length)} von ${h(D.kunden.length)}`}</span></h2>
        ${rumpf}
        <p class="wichtig" style="font-size:14px;margin-top:10px;">
          Die Disposition hat keinen Zugriff auf diese Liste. Sie sieht Kontaktangaben nur an einer konkreten Fahrt.
        </p>
      </div>`;
  }

  /* ============================================================
     7. Personal
     ============================================================ */
  /*
    Die Mitarbeiterzeilen leuchteten, liessen sich aber nicht
    anklicken - weder als Administration noch als Personal. Jetzt ist
    jede Zeile eine echte Schaltflaeche.
  */
  function personal() {
    /* Stammdaten, nicht Krankheit. Krankheitszeitraeume stehen am
       Vorgang und haengen an krankheit.read. */
    const darfSehen = R.darf("personal.read");
    if (!darfSehen) return R.kastenKeinRecht("Personal");

    const liste = D.mitarbeiter.map((m) => D.personalVon(m.id));
    const offeneKrank = D.abwesenheiten.filter((a) => a.art === "krank").length;
    /*
      GEMESSENER AUSGANGSFEHLER: Hier stand
        pz.dokumentstand.lage !== "gueltig"
      - aber dokumentstand() gibt { eintraege, warnung } zurueck und
      hat gar kein Feld "lage". Der Vergleich war damit fuer JEDEN
      Mitarbeiter wahr: Die Ueberschrift zeigte "6 Dokumentstaende zu
      pruefen", und jede Zeile trug "pruefen" - auch Testfahrer 01,
      dessen Dokumente bis 2027 gueltig sind.

      "warnung" ist null, wenn alle Pflichtdokumente gueltig sind.
      Genau das ist die Frage.
    */
    const fristKritisch = liste.filter((pz) => pz.dokumentstand.warnung).length;

    const zeile = (pz) => window.ProbeAkten.aktenzeile(
      `ak-person:${pz.id}`,
      pz.name + ", " + pz.id + ", " + pz.status + ", " + pz.beschaeftigung
        + ". Personalakte öffnen.",
      [
        `<strong>${h(pz.name)}</strong>`,
        h(pz.id),
        pz.status === "aktiv" ? R.marke("gut", "aktiv")
          : pz.status === "krank" ? R.marke("warnung", "krank")
          : R.marke("ruhig", pz.status),
        h(pz.beschaeftigung),
        h(pz.eintritt),
        pz.konto === "verknüpft" ? R.marke("gut", "verknüpft") : R.marke("ruhig", "nicht verknüpft"),
        pz.dokumentstand.warnung
          ? R.marke("warnung", D.DOKUMENT_LAGE[pz.dokumentstand.warnung.lage] || "prüfen")
          : R.marke("gut", "alle gültig")
      ]
    );

    return `
      <div class="bereichskopf"><div>
        <h1>Personal</h1>
        <p class="wichtig">${h(liste.length)} Mitarbeiter · ${h(offeneKrank)} Krankmeldung${offeneKrank === 1 ? "" : "en"}
          · ${h(fristKritisch)} Dokumentstand${fristKritisch === 1 ? "" : "e"} zu prüfen
          · jede Zeile öffnet die Akte</p>
      </div></div>
      <div class="flaeche">
        <h2>Mitarbeiter</h2>
        <div class="aktenliste" role="list">
          <div class="az-kopf" aria-hidden="true">
            <span>Name</span><span>Kennung</span><span>Status</span>
            <span>Beschäftigung</span><span>Eintritt</span><span>Konto</span><span>Dokumente</span>
          </div>
          ${liste.map(zeile).join("")}
        </div>
        <p class="wichtig" style="font-size:14px;margin-top:10px;">
          Persönliche Daten stehen nicht in der Übersicht, sondern erst in der einzelnen Akte.
          „Fahrer &amp; Fahrzeuge“ und „Personal“ zeigen denselben Datensatz — die Stammdaten
          liegen nur an einer Stelle.
        </p>
      </div>`;
  }

  /* ============================================================
     8. Lohn
     ============================================================ */
  const lohnStand = { mitarbeiterId: "", monat: "", jahr: "2026", datei: "" };

  function lohn() {
    return `
      <div class="bereichskopf">
        <div><h1>Lohn</h1>
          <p class="wichtig">Besonders geschützt. Nur Administration und Personal. Die Disposition hat keinen Zugriff.</p></div>
        <div class="hauptaktion">
          <button class="knopf haupt-knopf" type="button" data-tun="lohn-neu">Lohnabrechnung bereitstellen</button>
        </div>
      </div>
      <div class="flaeche">
        <h2>Bereitgestellt</h2>
        <div class="tabelle-huelle"><table class="liste">
          <thead><tr><th>Mitarbeiter</th><th>Monat</th><th>Bereitgestellt am</th><th>Version</th><th></th></tr></thead>
          <tbody>${D.lohn.map((l) => {
            const m = mitarbeiterVon(l.mitarbeiterId);
            return `<tr>
              <td><strong>${h(m ? m.name : l.mitarbeiterId)}</strong></td>
              <td>${h(l.monat)}/${h(l.jahr)}</td>
              <td>${h(l.bereitgestellt)}</td>
              <td>${l.version > 1 ? R.marke("aktiv", `Korrektur v${l.version}`) : R.marke("ruhig", "v1")}</td>
              <td><button class="knopf klein" type="button" data-tun="lohn-ansehen">Ansehen</button></td>
            </tr>`;
          }).join("")}</tbody></table></div>
      </div>
      <div class="flaeche">
        <h2>Wie die Dateien liegen</h2>
        <ul style="margin:0;padding-left:20px;color:var(--gedaempft);font-size:15px;line-height:1.7">
          <li>privater Bucket, keine öffentliche Adresse</li>
          <li>ausschließlich PDF, feste Größenbegrenzung</li>
          <li>neutrale interne Dateinamen — kein Name, kein Geburtsdatum, keine Steuerdaten im Pfad</li>
          <li>Ansicht nur über kurz gültige, signierte Adresse</li>
          <li>kein stilles Überschreiben — eine Korrektur ist eine neue Version</li>
          <li>protokolliert wird: wer, wann, für welchen Abrechnungszeitraum</li>
          <li>Mitarbeiter sehen ausschließlich ihre eigenen Abrechnungen</li>
        </ul>
        <p class="wichtig" style="font-size:14px;margin-top:10px;">
          In dieser Probe wird nichts hochgeladen und nichts versendet.
        </p>
      </div>`;
  }

  function lohnDialog() {
    const s = lohnStand;
    const m = mitarbeiterVon(s.mitarbeiterId);
    const fertig = s.mitarbeiterId && s.monat && s.datei;
    return `
      <div class="dialog-hinter" data-dialog-zu></div>
      <div class="dialog-kasten" role="dialog" aria-modal="true" aria-labelledby="lohnTitel">
        <header class="dialog-kopf">
          <h2 id="lohnTitel">Lohnabrechnung bereitstellen</h2>
          <button class="knopf klein" type="button" data-dialog-zu>Abbrechen</button>
        </header>
        <div class="dialog-rumpf">
          <div class="dialog-schritt"><h3>1. Für wen?</h3>
            <div class="wahlraster">${D.mitarbeiter.map((x) => `
              <button class="wahlkarte" type="button" data-tun="lohn-wer:${h(x.id)}" aria-pressed="${s.mitarbeiterId === x.id}">
                <strong>${h(x.name)}</strong><span>${h(x.beschaeftigung)}</span></button>`).join("")}</div>
          </div>
          <div class="dialog-schritt"><h3>2. Welcher Zeitraum?</h3>
            <div class="feldpaar">
              <label>Monat<select data-lohn="monat">
                <option value="">— wählen —</option>
                ${["01","02","03","04","05","06","07","08","09","10","11","12"]
                  .map((mo) => `<option value="${mo}" ${s.monat === mo ? "selected" : ""}>${mo}</option>`).join("")}
              </select></label>
              <label>Jahr<select data-lohn="jahr">
                <option value="2026" ${s.jahr === "2026" ? "selected" : ""}>2026</option>
                <option value="2025" ${s.jahr === "2025" ? "selected" : ""}>2025</option>
              </select></label>
            </div>
          </div>
          <div class="dialog-schritt"><h3>3. Welche Datei?</h3>
            <div class="wahlraster">
              <button class="wahlkarte" type="button" data-tun="lohn-datei:Testdatei-A.pdf" aria-pressed="${s.datei === "Testdatei-A.pdf"}">
                <strong>Testdatei-A.pdf</strong><span>142 kB · PDF</span></button>
              <button class="wahlkarte" type="button" data-tun="lohn-datei:Testdatei-B.pdf" aria-pressed="${s.datei === "Testdatei-B.pdf"}">
                <strong>Testdatei-B.pdf</strong><span>138 kB · PDF</span></button>
            </div>
            <p class="wichtig" style="font-size:14px;margin-top:8px;">
              In der Probe wird keine echte Datei gewählt und nichts hochgeladen.</p>
          </div>
          <div class="dialog-schritt"><h3>4. Bitte prüfen</h3>
            <dl class="zusammenfassung">
              <div><dt>Mitarbeiter</dt><dd>${h(m ? m.name : "— nicht gewählt")}</dd></div>
              <div><dt>Zeitraum</dt><dd>${s.monat ? `${h(s.monat)}/${h(s.jahr)}` : "— nicht gewählt"}</dd></div>
              <div><dt>Datei</dt><dd>${h(s.datei || "— nicht gewählt")}</dd></div>
              <div><dt>Sichtbar für</dt><dd>nur ${h(m ? m.name : "den gewählten Mitarbeiter")}</dd></div>
            </dl>
          </div>
        </div>
        <footer class="dialog-fuss">
          <button class="knopf" type="button" data-dialog-zu>Abbrechen</button>
          <button class="knopf haupt-knopf" type="button" data-tun="lohn-fertig" ${fertig ? "" : "disabled"}>
            Lohnabrechnung bereitstellen</button>
        </footer>
      </div>`;
  }

  /* ============================================================
     9. Finanzen
     ============================================================ */
  /*
    Die Rechnungszeilen leuchteten, oeffneten aber nichts - als
    Administration wie als Buchhaltung. Jetzt oeffnet jede Zeile die
    Rechnung.
  */
  function finanzen() {
    if (!R.darf("finance.read")) return R.kastenKeinRecht("Finanzen");

    const liste = D.rechnungen;
    const offen = liste.filter((r) => r.zustand === "offen").length;
    const faellig = liste.filter((r) => r.zustand === "überfällig").length;

    const zeile = (r) => window.ProbeAkten.aktenzeile(
      `ak-rechnung:${r.nr}`,
      r.nr + ", " + r.kunde + ", " + r.zeitraum + ", " + r.betrag + ", " + r.zustand
        + ". Rechnung öffnen.",
      [
        `<strong>${h(r.nr)}</strong>`,
        h(r.kunde),
        h(r.zeitraum),
        h(r.betrag),
        h(r.faellig),
        r.zustand === "bezahlt" ? R.marke("gut", "bezahlt")
          : r.zustand === "überfällig" ? R.marke("warnung", "überfällig")
          : r.zustand === "Entwurf" ? R.marke("ruhig", "Entwurf")
          : R.marke("aktiv", "offen"),
        h((r.zahlungen || []).length) + " Zahlung(en)"
      ]
    );

    return `
      <div class="bereichskopf"><div>
        <h1>Finanzen</h1>
        <p class="wichtig">${h(liste.length)} Rechnungen · ${h(offen)} offen · ${h(faellig)} überfällig
          · jede Zeile öffnet die Rechnung</p>
      </div></div>
      <div class="flaeche">
        <h2>Rechnungen</h2>
        <div class="aktenliste" role="list">
          <div class="az-kopf" aria-hidden="true">
            <span>Nummer</span><span>Kunde</span><span>Zeitraum</span>
            <span>Betrag</span><span>Fällig</span><span>Zustand</span><span>Zahlungen</span>
          </div>
          ${liste.map(zeile).join("")}
        </div>
      </div>
      <div class="flaeche">
        <h2>Was die Probe nicht hat</h2>
        <p class="wichtig" style="font-size:15px">
          Der Rechnungsversand ist <strong>nicht eingerichtet</strong>. Es wird keine Mail
          erzeugt und keine Datei hochgeladen. Eine Rechnungs-PDF liegt nicht vor; die Akte
          zeigt an ihrer Stelle einen Platzhalter, wie im Lohnbereich.</p>
      </div>`;
  }

  /* ============================================================
     10. Rewards
     ============================================================ */
  /*
    Die Kundenzeilen leuchteten, oeffneten aber kein Konto. Und das
    gezeigte Regelwerk war unvollstaendig: Es nannte vier Zeilen,
    waehrend fuenf Stufen, Ausschluesse und Geburtstagspunkte
    vereinbart sind.
  */
  function rewards() {
    if (!R.darf("rewards.read")) return R.kastenKeinRecht("Rewards");

    const zeile = (konto) => {
      const k = D.kunden.find((x) => x.id === konto.kundeId || x.name === konto.kunde);
      const stufe = D.REWARDS_STUFEN.find((s) => s.name === konto.stufe);
      return window.ProbeAkten.aktenzeile(
        `ak-rewards-konto:${konto.kundeId}`,
        konto.kunde + ", " + konto.punkte + " Punkte, Stufe " + konto.stufe
          + ". Rewards-Konto öffnen.",
        [
          `<strong>${h(konto.kunde)}</strong>`,
          k ? h([k.plz, k.ort].filter(Boolean).join(" ")) || "—" : "—",
          h(konto.punkte) + " Punkte",
          R.marke(stufe ? stufe.marke : "ruhig", konto.stufe),
          h(konto.qualifizierteFahrten !== undefined ? konto.qualifizierteFahrten : "—")
            + " qual. Fahrten",
          h(konto.drehs) + " offene Drehs",
          h((konto.verlauf || []).length) + " Einträge"
        ]
      );
    };

    return `
      <div class="bereichskopf"><div>
        <h1>Rewards</h1>
        <p class="wichtig">${h(D.rewards.konten.length)} Testkonten · jede Zeile öffnet das Konto</p>
      </div></div>

      <div class="flaeche">
        <h2>Stufen</h2>
        <div class="aktenliste" role="list">
          <div class="az-kopf" aria-hidden="true">
            <span>Stufe</span><span>Schwelle</span><span>Festgelegt?</span>
          </div>
          ${D.REWARDS_STUFEN.map((s) => `<div class="aktenzeile ist-anzeige" role="listitem">
            <span class="az-feld"><strong>${h(s.name)}</strong></span>
            <span class="az-feld">${h(s.schwelle)}</span>
            <span class="az-feld">${s.festgelegt
              ? R.marke("gut", "vereinbart")
              : R.marke("warnung", "offene Geschäftsentscheidung")}</span>
          </div>`).join("")}
        </div>
        <p class="schritt-hinweis">Was als „offene Geschäftsentscheidung“ steht, ist
          <strong>nicht</strong> mit einer Zahl gefüllt worden. Eine erfundene Schwelle wäre
          schlimmer als eine fehlende.</p>
      </div>

      <div class="flaeche">
        <h2>Regeln</h2>
        <ul style="margin:0;padding-left:20px;color:var(--gedaempft);font-size:15px;line-height:1.7">
          ${D.REWARDS_REGELN.map((r) => `<li>${h(r)}</li>`).join("")}
        </ul>
      </div>

      <div class="flaeche">
        <h2>Keine Punkte für</h2>
        <div class="wahlraster">
          ${D.REWARDS_AUSSCHLUSS.map((a) => `<div class="wahlkarte ist-anzeige">
            <strong>${h(a)}</strong></div>`).join("")}
        </div>
        <p class="schritt-hinweis">Diese Fahrtarten erzeugen keine Punkte. Das ist eine
          Vorgabe, keine Annahme der Probe.</p>
      </div>

      <div class="flaeche">
        <h2>Glücksrad</h2>
        <div class="aktenliste" role="list">
          ${D.REWARDS_GLUECKSRAD.map((g) => `<div class="aktenzeile ist-anzeige" role="listitem">
            <span class="az-feld"><strong>${h(g.gewinn)}</strong></span>
            <span class="az-feld">${g.gesperrt
              ? R.marke("warnung", "bis zur Freigabe gesperrt")
              : R.marke("gut", "freigegeben")}</span>
            <span class="az-feld">${h(g.hinweis)}</span>
          </div>`).join("")}
        </div>
        <p class="schritt-hinweis">Der Gewinn wird <strong>serverseitig</strong> bestimmt, nicht
          im Browser. Ein abgebrochener Dreh vernichtet keinen Anspruch. In dieser Probe
          wird nicht gedreht und nichts ausgespielt.</p>
      </div>

      <div class="flaeche">
        <h2>Konten</h2>
        <div class="aktenliste" role="list">
          <div class="az-kopf" aria-hidden="true">
            <span>Kunde</span><span>Ort</span><span>Punkte</span>
            <span>Stufe</span><span>Qual. Fahrten</span><span>Drehs</span><span>Verlauf</span>
          </div>
          ${D.rewards.konten.map(zeile).join("")}
        </div>
      </div>`;
  }

  /* ============================================================
     11. Analyse
     ============================================================ */
  /*
    Analyse mit echter Zeitraumauswahl.

    Gemessener Fehler: "Letzte 7 Tage" war ein fester Text - nicht
    anklickbar, kein Hover, keine andere Wahl. Ein Zeitraum, der nichts
    aendert, behauptet eine Auswertung, die es nicht gibt.

    Jede Kennzahl kommt jetzt aus D.analyseAuswertung() ueber denselben
    Tagesbereich. Sie koennen deshalb nicht auseinanderlaufen - es gibt
    nur eine Rechnung.
  */
  /*
    fehlerVon und fehlerBis stehen am jeweiligen FELD - eine
    Sammelmeldung allein laesst offen, welches der beiden Felder
    gemeint ist. "verdreht" ist der Fehler des Zeitraums als Ganzes.
  */
  const analyseStand = {
    zeitraum: "tage7", von: "", bis: "",
    fehlerVon: "", fehlerBis: "", verdreht: false
  };

  function analyse() {
    if (!R.darf("analytics.read")) return R.kastenKeinRecht("Analyse");

    const gewaehlt = D.ANALYSE_ZEITRAEUME.find((z) => z.id === analyseStand.zeitraum)
      || D.ANALYSE_ZEITRAEUME[2];
    const bereich = D.analyseBereich(gewaehlt.id, analyseStand.von, analyseStand.bis);
    const a = D.analyseAuswertung(bereich.von, bereich.bis);
    const alsTag = (iso) => (iso ? D.alsText(new Date(iso + "T00:00:00")) : "—");
    const groesster = Math.max(1, ...a.ereignisse.map((x) => x.wert));
    const groessteSeite = Math.max(1, ...a.seiten.map((x) => x.wert));

    /*
      Ohne vollstaendigen eigenen Zeitraum wird nichts behauptet.

      GEAENDERTES VERHALTEN: Ein verdrehter Zeitraum (Ende vor Beginn)
      wurde vorher stillschweigend gedreht. Der Geschaeftsfuehrer hat
      danach ausdruecklich einen FEHLER verlangt. Das ist auch das
      bessere Verhalten: Wer "01.10." bis "01.09." eintippt, hat sich
      vertippt und soll das sehen, statt stumm eine andere Auswertung
      zu bekommen, als er gemeint hat.
    */
    const unvollstaendig = gewaehlt.id === "eigen"
      && (!analyseStand.von || !analyseStand.bis
          || analyseStand.fehlerVon || analyseStand.fehlerBis);
    const verdreht = gewaehlt.id === "eigen" && analyseStand.verdreht;

    return `
      <div class="bereichskopf"><div>
        <h1>Analyse</h1>
        <p class="wichtig">Zeitraum: <strong>${h(gewaehlt.name)}</strong>${
          (unvollstaendig || verdreht) ? "" : ` · ${h(alsTag(bereich.von))} bis ${h(alsTag(bereich.bis))}
            · ${h(a.tage)} ${a.tage === 1 ? "Tag" : "Tage"}`}</p>
      </div></div>

      ${R.zustandsKasten("vorbereitet", "Alle Zahlen hier sind erfunden",
        "Es findet heute keinerlei Besuchermessung statt, und es ist kein Trackingdienst angebunden. Diese Ansicht zeigt nur, wie die Auswertung später aussehen würde. Im produktiven Portal bleibt der Bereich leer, bis eine datensparsame Ereigniserfassung eingerichtet und rechtlich geprüft ist.")}

      <div class="flaeche">
        <h2>Zeitraum</h2>
        <div class="filterzeile" role="group" aria-label="Zeitraum wählen">
          ${D.ANALYSE_ZEITRAEUME.map((z) => `<button class="filterchip" type="button"
            data-tun="an-zeitraum:${h(z.id)}" aria-pressed="${gewaehlt.id === z.id}">
            ${h(z.name)}</button>`).join("")}
        </div>
        ${gewaehlt.id === "eigen" ? `<div class="tageswahl">
          <label class="tagfeld">von ${window.ProbeDatum.markup({ kennung: "analyse",
            teil: "von", wert: analyseStand.von, beschriftung: "Zeitraum von",
            fehler: analyseStand.fehlerVon })}</label>
          <label class="tagfeld">bis ${window.ProbeDatum.markup({ kennung: "analyse",
            teil: "bis", wert: analyseStand.bis, beschriftung: "Zeitraum bis",
            fehler: analyseStand.fehlerBis })}</label>
        </div>` : ""}
        <p class="schritt-hinweis">Der gewählte Zeitraum gilt für <strong>alle</strong>
          Kennzahlen dieser Seite. Sie werden aus denselben Tageswerten summiert — zwei
          verschiedene Zeiträume auf einer Seite sind damit ausgeschlossen.</p>
      </div>

      ${verdreht
        ? R.zustandsKasten("fehler", "Das Ende liegt vor dem Beginn",
            "Ein Zeitraum läuft nicht rückwärts. Bitte die beiden Daten tauschen. Solange bleibt jede Kennzahl leer — eine Zahl zu einem unmöglichen Zeitraum wäre eine Behauptung.")
        : unvollstaendig
        ? R.zustandsKasten("leer", "Bitte beide Datumsfelder füllen",
            "Ohne vollständigen Zeitraum wird keine Zahl gezeigt — eine halbe Auswahl ergibt keine Auswertung. Es bleibt auch keine alte Zahl stehen.")
        : `
      <div class="flaeche">
        <h2>Reichweite</h2>
        <div class="kennzahlen">
          <div class="kennzahl ist-anzeige"><span class="wert">${h(a.ereignisse.find((x) => x.id === "aufrufe").wert.toLocaleString("de-DE"))}</span>
            <span class="name">Seitenaufrufe · gezählt</span></div>
          <div class="kennzahl ist-anzeige"><span class="wert">${h(a.ereignisse.find((x) => x.id === "besuche").wert.toLocaleString("de-DE"))}</span>
            <span class="name">Besuche · gezählt</span></div>
          <div class="kennzahl ist-anzeige"><span class="wert">~${h(a.besucherSchaetzung.toLocaleString("de-DE"))}</span>
            <span class="name">Besucher · Schätzung</span></div>
          <div class="kennzahl ist-anzeige"><span class="wert">~${h(a.wiederkehrendSchaetzung.toLocaleString("de-DE"))}</span>
            <span class="name">wiederkehrend · Schätzung</span></div>
        </div>
        <p class="wichtig" style="font-size:14px;margin-top:10px;">
          <strong>Besucher</strong> und <strong>wiederkehrend</strong> sind immer
          <strong>Schätzungen</strong>: Ein Mensch mit Handy und Rechner zählt doppelt, wer
          Speicherfunktionen blockiert, gar nicht. <strong>Besuche</strong> und
          <strong>Seitenaufrufe</strong> werden dagegen gezählt. Mitarbeiter- und
          Adminnutzung wird nicht als Besuch gewertet.
        </p>
      </div>

      <div class="flaeche">
        <h2>Ereignisse im Zeitraum</h2>
        <div class="balken">
          ${a.ereignisse.filter((x) => x.id !== "aufrufe" && x.id !== "besuche").map((x) => `
            <div class="balkenzeile">
              <span class="balkenname">${h(x.name)}</span>
              <span class="balkenstab"><i style="width:${Math.round((x.wert / groesster) * 100)}%"></i></span>
              <span class="balkenwert">${h(x.wert.toLocaleString("de-DE"))}</span>
            </div>`).join("")}
        </div>
        <p class="schritt-hinweis">Alle gezählt, keine Schätzung. Es wird kein einzelner
          Mensch verfolgt — es gibt keine Nutzerkennung in diesen Zahlen.</p>
      </div>

      <div class="flaeche">
        <h2>Konversionen</h2>
        <div class="kennzahlen">
          <div class="kennzahl ist-anzeige"><span class="wert">${h(a.anfragequote)} %</span>
            <span class="name">Besuch → Fahrtanfrage · gerechnet</span></div>
          <div class="kennzahl ist-anzeige"><span class="wert">${h(a.buchungsquote)} %</span>
            <span class="name">Anfrage → Buchung · gerechnet</span></div>
          <div class="kennzahl ist-anzeige"><span class="wert">${h(a.registrierquote)} %</span>
            <span class="name">Registrierung begonnen → fertig · gerechnet</span></div>
        </div>
        <p class="schritt-hinweis">Gerechnet aus den gezählten Werten desselben Zeitraums.</p>
      </div>

      <div class="flaeche">
        <h2>Beliebteste Seiten</h2>
        <div class="balken">
          ${a.seiten.map((s) => `<div class="balkenzeile">
            <span class="balkenname">${h(s.name)}</span>
            <span class="balkenstab"><i style="width:${Math.round((s.wert / groessteSeite) * 100)}%"></i></span>
            <span class="balkenwert">${h(s.wert.toLocaleString("de-DE"))}</span>
          </div>`).join("")}
        </div>
      </div>

      <div class="flaeche">
        <h2>Was hier nicht passiert</h2>
        <ul style="margin:0;padding-left:20px;color:var(--gedaempft);font-size:15px;line-height:1.7">
          <li>keine Einzelverfolgung von Personen</li>
          <li>keine Nutzerkennung, keine Gerätekennung, keine IP in den Zahlen</li>
          <li>kein fremder Trackingdienst, kein Aufruf nach außen</li>
          <li>Mitarbeiter- und Adminnutzung zählt nicht als Besuch</li>
          <li>Schätzungen sind als Schätzung gekennzeichnet und nie als gezählt</li>
        </ul>
      </div>`}`;
  }

  /* ============================================================
     Kleine Bestaetigungsfenster
     ============================================================ */
  /*
    Die Absage bei einem direkten Aufruf. Ein fehlender Knopf ist keine
    Sperre - wer eine Aktion von Hand aufruft, bekommt hier eine klare
    Antwort statt eines stillen Nichts.
  */
  function keinZugriffDialog(was) {
    return `
      <div class="dialog-hinter" data-dialog-zu></div>
      <div class="dialog-kasten" role="dialog" aria-modal="true" aria-label="Keine Berechtigung">
        <header class="dialog-kopf"><h2>Keine Berechtigung</h2>
          <button class="knopf klein" type="button" data-dialog-zu aria-label="Schließen">✕ Schließen</button></header>
        <div class="dialog-rumpf">${R.kastenKeinRecht(was)}</div>
        <footer class="dialog-fuss">
          <button class="knopf haupt-knopf" type="button" data-dialog-zu>Verstanden</button>
        </footer>
      </div>`;
  }

  /* ============================================================
     Die Fahrt im Einzelnen
     ============================================================

     GEMESSENER AUSGANGSFEHLER: Hinter "Öffnen" stand ein Platzhalter
     ("Hier stünden die Einzelheiten der Fahrt ..."). Fuer FA-0002 war
     damit nicht nachvollziehbar, dass die Abholzeit offen ist und eine
     Rueckfrage laeuft - genau die Angabe, um die es bei dieser Anfrage
     geht.

     Alles hier Gezeigte steht in den vorhandenen Testdaten. Was nicht
     erfasst ist, wird als nicht erfasst benannt - nicht ergaenzt.
  */
  const fahrtVon = (id) => D.fahrten.find((f) => f.id === id) || null;

  const leistungName = (id) => {
    const l = D.leistungsarten.find((x) => x.id === id);
    return l ? l.name : "";
  };

  /* Der laufende Wechselschritt: { fahrtId, art } oder null. Es bleibt
     bei einer Fensterebene - der Wechsel ERSETZT die Einzelansicht und
     traegt einen Rueckweg. */
  let wechselStand = null;

  const dlZeile = (was, wert) => `<dt>${h(was)}</dt><dd>${wert}</dd>`;
  const offen = (text) => R.marke("warnung", text);

  function fahrtDialog(fahrtId) {
    const f = fahrtVon(fahrtId);
    if (!f) return null;
    const fa = mitarbeiterVon(f.fahrerId);
    const fz = fahrzeugVon(f.fahrzeugId);
    /* Eine Gastfahrt hat keine Kundenakte - das ist eine bestehende
       fachliche Entscheidung und wird hier nur benannt. */
    const gastfahrt = !f.kundeId;
    const kunde = f.kundeId ? D.kundeVon(f.kundeId) : null;
    const darfWechseln = R.darf("operations.write");
    /* Der Sprung in die Kundenakte haengt an customers.read - die Akte
       selbst prueft das noch einmal. */
    const darfAkte = Boolean(kunde) && R.darf("customers.read");

    const hinweise = [];
    if (!f.zeit) {
      hinweise.push("Für diese Fahrt ist keine verbindliche Abholzeit erfasst. "
        + "Sie steht deshalb nicht zwischen den Uhrzeiten.");
    }
    if (f.hinweis) hinweise.push(f.hinweis);

    return `
      <div class="dialog-hinter" data-dialog-zu></div>
      <div class="dialog-kasten" role="dialog" aria-modal="true" aria-labelledby="fahrtTitel">
        <header class="dialog-kopf">
          <h2 id="fahrtTitel">Fahrt ${h(f.id)}</h2>
          ${zustandMarke(f.zustand)}
          <button class="knopf klein" type="button" data-dialog-zu aria-label="Schließen">✕ Schließen</button>
        </header>
        <div class="dialog-rumpf">
          ${f.nurProbe ? `<p class="schritt-hinweis">${R.marke("aktiv", "nur Designprobe – nicht gespeichert")}</p>` : ""}

          <h3>Auftrag</h3>
          <dl class="aktenliste">
            ${dlZeile("Nummer", h(f.id))}
            ${dlZeile("Zustand", zustandMarke(f.zustand))}
            ${dlZeile(gastfahrt ? "Fahrt für" : "Kunde",
              gastfahrt
                ? h("Gastfahrt – kein Kundenkonto")
                : (darfAkte
                  ? `<button class="knopf klein" type="button"
                      data-tun="ak-kunde:${h(f.kundeId)}">${h(f.kunde)}</button>`
                  : h(f.kunde)))}
            ${f.fahrgast ? dlZeile("Fahrgast", h(f.fahrgast)) : ""}
            ${dlZeile("Abholung", h(f.von))}
            ${dlZeile("Ziel", h(f.nach))}
            ${dlZeile("Datum", h(D.alsText(D.heute)) + " (Tagesliste)")}
            ${dlZeile("Abholzeit", f.zeit ? `<strong>${h(f.zeit)}</strong>` : offen("Zeit offen"))}
            ${dlZeile("Leistung", f.leistung ? h(leistungName(f.leistung)) : offen("nicht erfasst"))}
          </dl>

          <h3>Zuweisung</h3>
          <dl class="aktenliste">
            ${dlZeile("Fahrer", fa ? h(fa.name) : offen("nicht zugewiesen"))}
            ${dlZeile("Fahrzeug", fz ? h(fz.name + " · " + fz.kennzeichen) : offen("nicht zugewiesen"))}
          </dl>
          ${darfWechseln ? `
            <div class="dialog-schritt">
              <button class="knopf" type="button" data-tun="wechsel-fahrer:${h(f.id)}">Fahrer wechseln</button>
              <button class="knopf" type="button" data-tun="wechsel-fahrzeug:${h(f.id)}">Fahrzeug wechseln</button>
            </div>`
            : `<p class="schritt-hinweis">Fahrer und Fahrzeug zu ändern ist eine
                Dispositionsaufgabe. Dafür fehlt Ihnen die Berechtigung.</p>`}

          <h3>Hinweise</h3>
          ${hinweise.length
            ? `<ul class="konfliktliste">${hinweise.map((x) => `<li>${h(x)}</li>`).join("")}</ul>`
            : `<p class="schritt-hinweis">Keine Hinweise erfasst.</p>`}
        </div>
        <footer class="dialog-fuss">
          <button class="knopf haupt-knopf" type="button" data-dialog-zu>Schließen</button>
        </footer>
      </div>`;
  }

  /* ------------------------------------------------------------
     Fahrer- beziehungsweise Fahrzeugwechsel
     ------------------------------------------------------------
     Eine Auswahl, ein Fenster, ein Rueckweg. Die Berechtigung wird
     hier geprueft UND im Handler - ein fehlender Knopf ist keine
     Sperre.

     Angeboten werden nur Fahrer, die an diesem Tag nach der zentralen
     Tageswahrheit fahren, und nur Fahrzeuge, die verfuegbar sind. Ob
     ein Wechsel den Zustand der Fahrt veraendert, ist eine offene
     fachliche Frage - hier wird er NICHT veraendert.
  */
  function wechselDialog(fahrtId, art) {
    const f = fahrtVon(fahrtId);
    if (!f) return null;
    const iso = D.alsIso(D.heute);
    const fahrerArt = art === "fahrer";

    let karten;
    if (fahrerArt) {
      karten = D.imDienstAm(iso).map((z) => {
        const m = mitarbeiterVon(z.mitarbeiterId);
        const wagen = D.fahrzeugAktiv(iso, z);
        return {
          id: z.mitarbeiterId,
          name: m ? m.name : z.mitarbeiterId,
          zusatz: (z.von && z.bis ? z.von + "–" + z.bis : "ohne Zeit")
            + " · " + (wagen ? wagen.kennzeichen : "kein Fahrzeug"),
          gewaehlt: f.fahrerId === z.mitarbeiterId
        };
      });
    } else {
      karten = D.fahrzeuge
        .filter((x) => x.zustand === "verfuegbar")
        .map((x) => {
          const belegt = D.planzeilenAm(iso).find((z) => {
            const akt = D.fahrzeugAktiv(iso, z);
            return akt && akt.id === x.id;
          });
          const m = belegt ? mitarbeiterVon(belegt.mitarbeiterId) : null;
          return {
            id: x.id,
            name: x.name + " · " + x.kennzeichen,
            zusatz: m ? "heute " + m.name + " zugewiesen" : "heute keinem Fahrer zugewiesen",
            gewaehlt: f.fahrzeugId === x.id
          };
        });
    }

    return `
      <div class="dialog-hinter" data-dialog-zu></div>
      <div class="dialog-kasten" role="dialog" aria-modal="true" aria-labelledby="wechselTitel">
        <header class="dialog-kopf">
          <h2 id="wechselTitel">${fahrerArt ? "Fahrer" : "Fahrzeug"} wechseln</h2>
          <span class="band-gold">Fahrt ${h(f.id)}</span>
          <button class="knopf klein" type="button" data-tun="wechsel-zurueck:${h(f.id)}">Zurück zur Fahrt</button>
          <button class="knopf klein" type="button" data-dialog-zu aria-label="Schließen">✕ Schließen</button>
        </header>
        <div class="dialog-rumpf">
          ${karten.length ? `<div class="wahlraster">
            ${karten.map((k) => `
              <button class="wahlkarte" type="button"
                data-tun="wechsel-setzen:${h(f.id)}|${h(art)}|${h(k.id)}"
                aria-pressed="${k.gewaehlt}">
                <strong>${h(k.name)}</strong><span>${h(k.zusatz)}</span></button>`).join("")}
          </div>`
          : R.kastenLeer(fahrerArt ? "Fahrer im Dienst" : "verfügbaren Fahrzeuge")}
          ${(fahrerArt && f.fahrerId) || (!fahrerArt && f.fahrzeugId) ? `
            <div class="dialog-schritt">
              <button class="knopf" type="button"
                data-tun="wechsel-setzen:${h(f.id)}|${h(art)}|">Zuweisung aufheben</button>
            </div>` : ""}
        </div>
        <footer class="dialog-fuss">
          <button class="knopf" type="button" data-tun="wechsel-zurueck:${h(f.id)}">Zurück zur Fahrt</button>
        </footer>
      </div>`;
  }

  function hinweisDialog(titel, text, art) {
    return `
      <div class="dialog-hinter" data-dialog-zu></div>
      <div class="dialog-kasten" role="dialog" aria-modal="true" aria-label="${h(titel)}">
        <header class="dialog-kopf"><h2>${h(titel)}</h2>
          <button class="knopf klein" type="button" data-dialog-zu>Schließen</button></header>
        <div class="dialog-rumpf">${R.zustandsKasten(art || "leer", titel, text)}</div>
        <footer class="dialog-fuss">
          <button class="knopf haupt-knopf" type="button" data-dialog-zu>Verstanden</button>
        </footer>
      </div>`;
  }

  /* ============================================================
     Ausnahme: trotz Abwesenheit einplanen
     ============================================================
     Der Dispatcher soll abweichen duerfen - jemand kommt frueher
     zurueck oder arbeitet trotz eingetragenem Urlaub. Aber nicht
     nebenbei: Es braucht eine ausdrueckliche Entscheidung und einen
     Grund. Die Krankmeldung beziehungsweise der Urlaubsdatensatz
     wird dabei NICHT veraendert.
  */
  let ausnahmeStand = null;

  function ausnahmeDialog() {
    const e = planEntwurf();
    const s = ausnahmeStand;
    const m = mitarbeiterVon(s.mitarbeiterId);
    const abw = abwesenheitVon(e, s.mitarbeiterId);
    const art = abw.wirksam ? abw.wirksam.art : "krank";
    const satz = art === "krank"
      ? "Fahrer ist krank"
      : "Fahrer hat genehmigten Urlaub";
    const tagText = D.alsText(planDatumObjekt());

    const rumpf = s.stufe === "pruefung"
      ? `
        ${R.zustandsKasten("keinrecht", "Letzte Prüfung",
          "Noch ist nichts geändert. Erst „Verbindlich speichern“ setzt die Ausnahme und erzeugt den Protokolleintrag.")}
        <dl class="zusammenfassung">
          <div><dt>Fahrer</dt><dd>${h(m ? m.name : s.mitarbeiterId)}</dd></div>
          <div><dt>Tag</dt><dd>${h(tagText)}</dd></div>
          <div><dt>Abwesenheit</dt><dd>${h(art === "krank" ? "krank gemeldet" : "genehmigter Urlaub")} · ${h(D.zeitraumText(abw.wirksam))}</dd></div>
          <div><dt>Neuer Status</dt><dd>Im Dienst (Ausnahme)</dd></div>
          <div><dt>Grund</dt><dd>${h(s.grund)}</dd></div>
          <div><dt>Entschieden von</dt><dd>${h(R.benutzerText())}</dd></div>
        </dl>
        <p class="schritt-hinweis">Die eingetragene Abwesenheit bleibt unverändert bestehen.</p>`
      : s.grundSichtbar
      ? `
        ${R.zustandsKasten("fehler", satz,
          `${m ? m.name : s.mitarbeiterId} ist am ${tagText} als ${art === "krank" ? "krank gemeldet" : "im genehmigten Urlaub"} eingetragen (${D.zeitraumText(abw.wirksam)}). Eine Ausnahme wird festgehalten und bei der Veröffentlichung erneut angezeigt.`)}
        ${s.fehler ? `<div class="feldfehler" role="alert">${h(s.fehler)}</div>` : ""}
        <label>Grund für die Ausnahme <span class="band-warnung">Pflichtfeld</span>
          <textarea data-ausnahme-grund rows="3"
            placeholder="Zum Beispiel: Fahrer hat sich gesund gemeldet und möchte fahren.">${h(s.grund)}</textarea></label>
        <p class="schritt-hinweis">Die eingetragene Abwesenheit bleibt unverändert bestehen.
          Später wird protokolliert: wer, wann, welcher Fahrer, welche Abwesenheit,
          welcher neue Dienststatus und der Grund.
          <strong>In dieser Designprobe wird nichts gespeichert.</strong></p>`
      : `
        ${R.zustandsKasten("fehler", satz,
          `${m ? m.name : s.mitarbeiterId} ist am ${tagText} als ${art === "krank" ? "krank gemeldet" : "im genehmigten Urlaub"} eingetragen (${D.zeitraumText(abw.wirksam)}). Einplanen ist möglich, aber nur als ausdrückliche Ausnahme mit Grund.`)}`

    const fuss = s.stufe === "pruefung"
      ? `
        <button class="knopf haupt-knopf" type="button" data-tun="plan-ausnahme-zurueck-formular">Zurück und ändern</button>
        <button class="knopf leise" type="button" data-tun="plan-ausnahme-speichern">Verbindlich speichern</button>`
      : s.grundSichtbar
      ? `
        <button class="knopf haupt-knopf" type="button" data-tun="plan-ausnahme-abbrechen">Status beibehalten</button>
        <button class="knopf leise" type="button" data-tun="plan-ausnahme-pruefen">Änderung prüfen</button>`
      : `
        <button class="knopf leise" type="button" data-tun="plan-ausnahme-grund">Trotz Abwesenheit einplanen</button>
        <button class="knopf haupt-knopf" type="button" data-tun="plan-ausnahme-abbrechen">Status beibehalten</button>`

    return `
      <div class="dialog-hinter" data-dialog-zu></div>
      <div class="dialog-kasten" role="dialog" aria-modal="true" aria-labelledby="ausnTitel">
        <header class="dialog-kopf">
          <h2 id="ausnTitel">Abwesenheit eingetragen</h2>
          <button class="knopf klein" type="button" data-dialog-zu aria-label="Schließen">✕ Schließen</button>
        </header>
        <div class="dialog-rumpf">${rumpf}</div>
        <footer class="dialog-fuss">${fuss}</footer>
      </div>`;
  }

  /* ============================================================
     Veroeffentlichen - mit Konfliktpruefung
     ============================================================
     Der erste Klick veroeffentlicht NICHTS. Er oeffnet die Pruefung.
     Erst dort entscheidet sich, ob ueberhaupt veroeffentlicht werden
     kann - und wenn ja, ob ohne oder mit bewusster Entscheidung.
  */
  let veroeffentlichungsGrund = "";
  /* "grund" = Formular, "pruefung" = letzte Ansicht vor dem
     verbindlichen Veroeffentlichen. */
  let trotzdemStufe = "grund";

  function konfliktZeilen(liste, art) {
    const gefiltert = liste.filter((k) => k.art === art);
    if (!gefiltert.length) return "";
    return `<ul class="konfliktliste ${art}">
      ${gefiltert.map((k) => `<li${k.ausnahme ? " class=\"ist-ausnahme\"" : ""}>
        <strong>${h(k.kurz)}${k.ausnahme ? " · begründete Ausnahme" : ""}</strong>
        <span>${h(k.text)}</span>
      </li>`).join("")}
    </ul>`;
  }

  function pruefungsDialog() {
    const e = planEntwurf();
    const liste = konflikteVon(e);
    const technisch = liste.filter((k) => k.art === "technisch");
    const betrieblich = liste.filter((k) => k.art === "betrieblich");
    const tag = planDatumObjekt();
    const imDienst = e.zeilen.filter((z) => arbeitetAmTag(e, z)).length;
    const ohneFahrzeug = e.zeilen.filter((z) => arbeitetAmTag(e, z) && !z.fahrzeugId).length;
    const krank = e.zeilen.filter((z) => tagesstatus(e, z) === "krank").length;
    const urlaub = e.zeilen.filter((z) => tagesstatus(e, z) === "urlaub").length;

    const kopf = `<dl class="zusammenfassung">
      <div><dt>Tag</dt><dd>${tagWortGross()}</dd></div>
      <div><dt>Datum</dt><dd>${h(D.alsText(tag))}</dd></div>
      <div><dt>Eingeplant</dt><dd>${h(imDienst)} Mitarbeiter</dd></div>
      <div><dt>Ohne Fahrzeug</dt><dd>${h(ohneFahrzeug)}</dd></div>
      <div><dt>Krank</dt><dd>${h(krank)}</dd></div>
      <div><dt>Urlaub</dt><dd>${h(urlaub)}</dd></div>
      <div><dt>Konflikte</dt><dd>${h(liste.length)}</dd></div>
    </dl>`;

    let rumpf;
    let fuss;

    if (technisch.length) {
      /* Technisch ungueltig: kein Weg nach vorn. Es gibt bewusst
         keine Ausweichschaltflaeche. */
      rumpf = `${kopf}
        ${R.zustandsKasten("fehler", `${technisch.length} Eintrag technisch ungültig`,
          "Solange diese Angaben nicht stimmen, lässt sich der Plan nicht veröffentlichen. Das ist keine Ermessensfrage.")}
        ${konfliktZeilen(liste, "technisch")}
        ${betrieblich.length ? `<h4 class="unterueberschrift">Außerdem betrieblich auffällig</h4>${konfliktZeilen(liste, "betrieblich")}` : ""}`;
      fuss = `<button class="knopf haupt-knopf" type="button" data-tun="plan-zurueck-zur-planung">Zur Planung zurück</button>`;
    } else if (betrieblich.length) {
      rumpf = `${kopf}
        ${R.zustandsKasten("keinrecht", `${betrieblich.length} betrieblicher Konflikt`,
          "Der Plan ist technisch gültig. Die folgenden Punkte sind aber fachlich auffällig und sollten vor dem Veröffentlichen geklärt werden.")}
        ${konfliktZeilen(liste, "betrieblich")}`;
      fuss = `
        <button class="knopf leise" type="button" data-tun="plan-trotzdem">Trotzdem veröffentlichen</button>
        <button class="knopf haupt-knopf" type="button" data-tun="plan-zurueck-zur-planung">Zurück und korrigieren</button>`;
    } else {
      rumpf = `${kopf}
        ${R.zustandsKasten("leer", "Keine Konflikte",
          "Der Plan ist vollständig. Nach dem Veröffentlichen sehen die Mitarbeiter ihre eigene Schicht im Mitarbeiterportal.")}`;
      fuss = `
        <button class="knopf" type="button" data-tun="plan-zurueck-zur-planung">Abbrechen</button>
        <button class="knopf haupt-knopf" type="button" data-tun="plan-veroeffentlichen-ja">
          Ja, für ${tagWort()} veröffentlichen</button>`;
    }

    return `
      <div class="dialog-hinter" data-dialog-zu></div>
      <div class="dialog-kasten" role="dialog" aria-modal="true" aria-labelledby="pruefTitel">
        <header class="dialog-kopf">
          <h2 id="pruefTitel">Konfliktprüfung vor dem Veröffentlichen</h2>
          <button class="knopf klein" type="button" data-dialog-zu aria-label="Schließen">✕ Schließen</button>
        </header>
        <div class="dialog-rumpf">${rumpf}</div>
        <footer class="dialog-fuss">${fuss}</footer>
      </div>`;
  }

  /* Zweite, ausdrueckliche Bestaetigung mit Pflichtgrund. */
  function trotzdemDialog(fehler) {
    const e = planEntwurf();
    const liste = konflikteVon(e).filter((k) => k.art === "betrieblich");
    const tag = planDatumObjekt();
    return `
      <div class="dialog-hinter" data-dialog-zu></div>
      <div class="dialog-kasten" role="dialog" aria-modal="true" aria-labelledby="trotzTitel">
        <header class="dialog-kopf">
          <h2 id="trotzTitel">Trotz Konflikten veröffentlichen?</h2>
          <button class="knopf klein" type="button" data-dialog-zu aria-label="Schließen">✕ Schließen</button>
        </header>
        <div class="dialog-rumpf">
          <dl class="zusammenfassung">
            <div><dt>Tag</dt><dd>${tagWortGross()}</dd></div>
            <div><dt>Datum</dt><dd>${h(D.alsText(tag))}</dd></div>
            <div><dt>Offene Konflikte</dt><dd>${h(liste.length)}</dd></div>
          </dl>
          ${konfliktZeilen(liste, "betrieblich")}
          ${fehler ? `<div class="feldfehler" role="alert">${h(fehler)}</div>` : ""}
          ${trotzdemStufe === "pruefung"
            ? `${R.zustandsKasten("keinrecht", "Letzte Prüfung",
                 "Noch ist nichts veröffentlicht. Erst „Trotz Konflikten verbindlich veröffentlichen“ schließt den Vorgang ab.")}
               <dl class="zusammenfassung">
                 <div><dt>Grund</dt><dd>${h(veroeffentlichungsGrund)}</dd></div>
                 <div><dt>Veröffentlicht von</dt><dd>${h(R.benutzerText())}</dd></div>
               </dl>`
            : `<label>Grund für die Veröffentlichung <span class="band-warnung">Pflichtfeld</span>
              <textarea data-grund rows="3"
                placeholder="Zum Beispiel: Fahrzeugwechsel ist mündlich geklärt.">${h(veroeffentlichungsGrund)}</textarea></label>`}
          <p class="schritt-hinweis">In der späteren echten Umsetzung wird protokolliert: wer
            veröffentlicht hat, wann, für welchen Tag, welche Konflikte offen waren und der
            angegebene Grund. <strong>In dieser Designprobe wird nichts gespeichert.</strong></p>
        </div>
        <footer class="dialog-fuss">
          ${trotzdemStufe === "pruefung"
            ? `<button class="knopf haupt-knopf" type="button" data-tun="plan-trotzdem-zurueck">Zurück und ändern</button>
               <button class="knopf leise" type="button" data-tun="plan-trotzdem-ja">Trotz Konflikten verbindlich veröffentlichen</button>`
            : `<button class="knopf haupt-knopf" type="button" data-tun="plan-zurueck-zur-pruefung">Abbrechen</button>
               <button class="knopf leise" type="button" data-tun="plan-trotzdem-pruefen">Änderung prüfen</button>`}
        </footer>
      </div>`;
  }

  function planVeroeffentlichen(mitGrund) {
    const e = planEntwurf();
    const liste = konflikteVon(e);
    const quelle = D.planung[e.iso];
    quelle.zeilen = e.zeilen.map((z) => ({ ...z }));
    quelle.veroeffentlicht = true;
    quelle.veroeffentlichtUm = new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
    e.urzeilen = e.zeilen.map((z) => ({ ...z }));
    e.verlauf = [];

    const tag = planDatumObjekt();

    /* Die begruendeten Ausnahmen dieses Tages - sie gehoeren ins
       Protokoll und in die Mitarbeitervorschau. */
    const ausnahmen = e.zeilen
      .filter((z) => z.ausnahme)
      .map((z) => ({ zeile: z, mitarbeiter: mitarbeiterVon(z.mitarbeiterId) }));

    const ausnahmeProtokoll = ausnahmen.length
      ? `<h4 class="unterueberschrift">Ausnahmen trotz eingetragener Abwesenheit</h4>
         <ul class="konfliktliste betrieblich">
           ${ausnahmen.map(({ zeile, mitarbeiter }) => `<li class="ist-ausnahme">
             <strong>${h(mitarbeiter ? mitarbeiter.name : zeile.mitarbeiterId)} · ${h(zeile.ausnahme.art === "krank" ? "Krank" : "Urlaub")}</strong>
             <span>Abwesenheit ${h(zeile.ausnahme.zeitraum)} · eingeplant ${h(zeile.von)}–${h(zeile.bis)} · Grund: ${h(zeile.ausnahme.grund)}</span>
           </li>`).join("")}
         </ul>`
      : "";

    /*
      Was der Mitarbeiter spaeter sieht. Ausdruecklich OHNE die interne
      Begruendung und ohne jede Angabe zur Krankheit - im
      Mitarbeiterportal darf weder der Grund noch eine
      Gesundheitsangabe erscheinen. Und es darf dort nie kommentarlos
      "Krank" neben einer normalen Schicht stehen.
    */
    const mitarbeitersicht = ausnahmen.length
      ? `<h4 class="unterueberschrift">So sieht es der Mitarbeiter</h4>
         <ul class="konfliktliste">
           ${ausnahmen.map(({ zeile, mitarbeiter }) => `<li>
             <strong>${h(mitarbeiter ? mitarbeiter.name : zeile.mitarbeiterId)}</strong>
             <span>Schicht ${h(zeile.von)}–${h(zeile.bis)} · Trotz eingetragener Abwesenheit eingeplant – bitte mit der Zentrale klären.</span>
           </li>`).join("")}
         </ul>
         <p class="schritt-hinweis">Der interne Grund und die Art der Abwesenheit
           erscheinen dort nicht. Jeder Mitarbeiter sieht ausschließlich seine
           eigene Schicht.</p>`
      : "";

    const protokoll = mitGrund
      ? `<h4 class="unterueberschrift">Was protokolliert würde</h4>
         <dl class="zusammenfassung">
           <div><dt>Wer</dt><dd>${h(R.benutzerText())}</dd></div>
           <div><dt>Wann</dt><dd>${h(quelle.veroeffentlichtUm)} Uhr</dd></div>
           <div><dt>Tag</dt><dd>${h(D.alsText(tag))}</dd></div>
           <div><dt>Konflikte</dt><dd>${h(liste.length)}</dd></div>
           <div><dt>Grund</dt><dd>${h(veroeffentlichungsGrund)}</dd></div>
         </dl>${ausnahmeProtokoll}${mitarbeitersicht}`
      : ausnahmeProtokoll + mitarbeitersicht;

    veroeffentlichungsGrund = "";

    R.dialogOeffnen(`
      <div class="dialog-hinter" data-dialog-zu></div>
      <div class="dialog-kasten" role="dialog" aria-modal="true" aria-label="Plan veröffentlicht">
        <header class="dialog-kopf"><h2>Plan veröffentlicht</h2>
          <button class="knopf klein" type="button" data-dialog-zu>Schließen</button></header>
        <div class="dialog-rumpf">
          ${R.zustandsKasten("vorbereitet", "Nur in dieser Designprobe",
            `Der Plan für ${D.alsText(tag)} gilt in dieser Sitzung als veröffentlicht. Es wurde nichts gespeichert und nichts übertragen. Mitarbeiter sehen später ausschließlich ihre eigene Schicht — keine Konfliktliste und keine Daten anderer Mitarbeiter.`)}
          ${protokoll}
        </div>
        <footer class="dialog-fuss">
          <button class="knopf haupt-knopf" type="button" data-dialog-zu>Schließen</button>
        </footer>
      </div>`);
    R.zeichnen();
  }

  /* ============================================================
     Wegfuehrung der Aktionen
     ============================================================ */
  function tun(befehl) {
    /* Nur am ERSTEN Doppelpunkt trennen: ein Ziel wie
       "Testklinik 01, Speyer" darf nicht zerfallen. */
    const trenn = befehl.indexOf(":");
    const name = trenn < 0 ? befehl : befehl.slice(0, trenn);
    const wert = trenn < 0 ? undefined : befehl.slice(trenn + 1);
    const e = R.zustand.planEntwurf;

    /* Alles rund um die Fahrtaufnahme gehoert dem eigenen Modul. */
    if (name.startsWith("fa-")) { window.ProbeFahrtassistent.tun(name, wert); return; }
    /* Ebenso Fahrer & Fahrzeuge. */
    if (name.startsWith("team-")) { window.ProbeTeam.tun(name, wert); return; }
    /* Und alles rund um Meldungen und Aufgaben. */
    if (name.startsWith("vg-")) { window.ProbeVorgaenge.tun(name, wert); return; }
    if (name.startsWith("kal-")) { window.ProbeKalender.tun(name, wert); return; }
    if (name.startsWith("ak-")) { window.ProbeAkten.tun(name, wert); return; }
    if (name.startsWith("es-")) { window.ProbeEinstellungen.tun(name, wert); return; }

    /*
      EINE SPERRE FUER GANZE FAMILIEN.

      Der Gegenlauf hat verlangt, dass nicht erlaubte Aktionen am
      HANDLER scheitern, nicht nur am fehlenden Knopf. Eine Sperre je
      Fall waere 30 Sperren und eine Luecke beim naechsten neuen Fall.

      "plan-" veraendert oder blaettert den Planungsentwurf und
      verlangt planung.read; "fahrt-" und "wechsel-" gehoeren zur
      Fahrtenansicht und verlangen fahrten.read. Die einzelnen Faelle
      pruefen zusaetzlich das Schreibrecht, wo sie etwas aendern.
    */
    if (name.startsWith("plan-") && !R.darf("planung.read")) return;
    if ((name.startsWith("fahrt-") || name.startsWith("wechsel-"))
      && !R.darf("fahrten.read")) {
      R.dialogOeffnen(keinZugriffDialog("die Fahrtenansicht"));
      return;
    }

    switch (name) {
      /* Doppelt gesperrt: hier UND in starten(). Ein fehlender Knopf
         ist keine Sperre, und ein direkter Aufruf von tun() soll
         dieselbe Antwort bekommen wie der Knopf. */
      case "neue-fahrt":
        if (!R.darf("operations.write")) { R.dialogOeffnen(keinZugriffDialog("das Aufnehmen von Fahrten")); return; }
        window.ProbeFahrtassistent.starten();
        return;

      case "fahrt-filter":  R.zustand.fahrtFilter = wert; R.zeichnen(); return;
      case "an-zeitraum":
        if (!D.ANALYSE_ZEITRAEUME.some((z) => z.id === wert)) return;
        analyseStand.zeitraum = wert;
        analyseStand.fehler = "";
        R.zeichnen();
        return;
      case "fahrt-zustand": R.zustand.fahrtenZustand = wert; R.zeichnen(); return;
      /* Die Einzelansicht haengt an fahrten.read - derselben
         Faehigkeit wie die Liste, aus der sie aufgerufen wird. Der
         direkte Aufruf wird HIER geprueft, nicht am Knopf. */
      case "fahrt-oeffnen": {
        if (!R.darf("fahrten.read")) { R.dialogOeffnen(keinZugriffDialog("die Einzelheiten einer Fahrt")); return; }
        const markup = fahrtDialog(wert);
        if (!markup) return;
        wechselStand = null;
        R.dialogOeffnen(markup);
        return;
      }
      case "neu-laden": R.zustand.fahrtenZustand = "geladen"; R.zeichnen(); return;

      /*
        Fahrer- und Fahrzeugwechsel. Beides aendert die Disposition
        und braucht operations.write - geprueft an JEDEM Einstieg,
        nicht nur dort, wo der Knopf steht.
      */
      case "wechsel-fahrer":
      case "wechsel-fahrzeug": {
        if (!R.darf("operations.write") || !R.darf("fahrten.read")) {
          R.dialogOeffnen(keinZugriffDialog("den Fahrer- und Fahrzeugwechsel"));
          return;
        }
        const art = name === "wechsel-fahrer" ? "fahrer" : "fahrzeug";
        const fahrtId = wert || (wechselStand ? wechselStand.fahrtId : "");
        const markup = wechselDialog(fahrtId, art);
        if (!markup) {
          R.dialogOeffnen(hinweisDialog(art === "fahrer" ? "Fahrer wechseln" : "Fahrzeug wechseln",
            "Dieser Schritt beginnt an einer Fahrt. Öffnen Sie die Fahrt und wechseln Sie von dort.", "leer"));
          return;
        }
        wechselStand = { fahrtId, art };
        R.dialogOeffnen(markup);
        return;
      }

      /* Zurueck aus dem Wechsel in die Einzelansicht - eine Ebene,
         kein zweites Fenster darueber. */
      case "wechsel-zurueck": {
        if (!R.darf("fahrten.read")) return;
        const markup = fahrtDialog(wert);
        if (!markup) return;
        wechselStand = null;
        R.dialogOeffnen(markup);
        return;
      }

      /*
        Die Zuweisung setzen. Der Zustand der Fahrt bleibt
        unveraendert: Ob ein gesetzter Fahrer eine Fahrt automatisch
        von "ungeplant" auf "geplant" bringt, ist eine offene
        fachliche Frage und wird hier nicht entschieden.
      */
      case "wechsel-setzen": {
        if (!R.darf("operations.write")) {
          R.dialogOeffnen(keinZugriffDialog("den Fahrer- und Fahrzeugwechsel"));
          return;
        }
        const teile = String(wert).split("|");
        const f = fahrtVon(teile[0]);
        const art = teile[1];
        const ziel = teile[2] || "";
        if (!f || (art !== "fahrer" && art !== "fahrzeug")) return;
        if (art === "fahrer") {
          if (ziel && !mitarbeiterVon(ziel)) return;
          const vorher = mitarbeiterVon(f.fahrerId);
          f.fahrerId = ziel || null;
          const nachher = mitarbeiterVon(f.fahrerId);
          D.protokollieren({
            betrifft: "Fahrt " + f.id, was: "Fahrer gewechselt",
            vorher: vorher ? vorher.name : "nicht zugewiesen",
            nachher: nachher ? nachher.name : "nicht zugewiesen", grund: ""
          });
        } else {
          if (ziel && !fahrzeugVon(ziel)) return;
          const vorher = fahrzeugVon(f.fahrzeugId);
          f.fahrzeugId = ziel || null;
          const nachher = fahrzeugVon(f.fahrzeugId);
          D.protokollieren({
            betrifft: "Fahrt " + f.id, was: "Fahrzeug gewechselt",
            vorher: vorher ? vorher.kennzeichen : "nicht zugewiesen",
            nachher: nachher ? nachher.kennzeichen : "nicht zugewiesen", grund: ""
          });
        }
        wechselStand = null;
        R.dialogOeffnen(fahrtDialog(f.id));
        return;
      }

      case "plan-heute":
        R.zustand.planDatum = D.alsIso(D.heute); R.zustand.planEntwurf = null; R.zeichnen(); return;
      case "plan-morgen":
        R.zustand.planDatum = D.alsIso(D.tagAls(1)); R.zustand.planEntwurf = null; R.zeichnen(); return;
      case "plan-zurueck": planDatumVerschieben(-1); R.zeichnen(); return;
      case "plan-vor":     planDatumVerschieben(1);  R.zeichnen(); return;
      /* Aus dem Kalender heraus: einen bestimmten Tag oeffnen. */
      case "plan-datum":
        R.zustand.planDatum = wert; R.zustand.planEntwurf = null;
        R.geheZu("planung"); return;
      case "plan-filter":  e.filter = wert; R.zeichnen(); return;
      case "plan-suche-leeren": e.suche = ""; R.zeichnen(); return;
      case "plan-rueckgaengig": {
        const vorher = e.verlauf.pop();
        if (vorher) { e.zeilen = vorher.zeilen; e.zeitfehler = vorher.zeitfehler; }
        R.zeichnen(); return;
      }
      case "plan-verwerfen":
        merken(e);
        e.zeilen = e.urzeilen.map((z) => ({ ...z }));
        e.zeitfehler = {};
        R.zeichnen(); return;
      case "plan-alle-frei":
        merken(e);
        e.zeilen = e.zeilen.map((z) => ({ ...z, imDienst: false, vorlage: null, von: "", bis: "", fahrzeugId: null }));
        e.zeitfehler = {};
        R.zeichnen(); return;
      case "plan-uebernehmen-gestern": {
        /* Ueber die Mitarbeiterkennung zuordnen, nicht ueber die
           Stelle in der Liste - sonst bekaeme bei anderer Reihenfolge
           der Falsche die Schicht eines Anderen. */
        merken(e);
        const gestern = D.planung[D.alsIso(D.heute)].zeilen;
        e.zeilen = e.zeilen.map((z) => {
          const vorbild = gestern.find((g) => g.mitarbeiterId === z.mitarbeiterId);
          return vorbild ? { ...vorbild } : { ...z };
        });
        e.zeitfehler = {};
        R.zeichnen(); return;
      }
      case "plan-entwurf":
        e.urzeilen = e.zeilen.map((z) => ({ ...z }));
        D.planung[e.iso].zeilen = e.zeilen.map((z) => ({ ...z }));
        e.verlauf = [];
        R.zeichnen(); return;

      /* ---- Ausnahme bei eingetragener Abwesenheit ---- */
      case "plan-ausnahme-grund":
        ausnahmeStand.grundSichtbar = true;
        ausnahmeStand.stufe = "formular";
        R.dialogOeffnen(ausnahmeDialog());
        { const f = document.querySelector("[data-ausnahme-grund]"); if (f) f.focus(); }
        return;
      /* Erster Klick: nur pruefen. Hier wird nichts gesetzt. */
      case "plan-ausnahme-pruefen": {
        const f = document.querySelector("[data-ausnahme-grund]");
        ausnahmeStand.grund = f ? f.value.trim() : "";
        if (ausnahmeStand.grund.length < 3) {
          ausnahmeStand.fehler = "Bitte einen Grund eintragen. Ohne Grund bleibt der Status unverändert.";
          R.dialogOeffnen(ausnahmeDialog());
          const neu = document.querySelector("[data-ausnahme-grund]");
          if (neu) neu.focus();
          return;
        }
        ausnahmeStand.fehler = "";
        ausnahmeStand.stufe = "pruefung";
        R.dialogOeffnen(ausnahmeDialog());
        return;
      }
      case "plan-ausnahme-zurueck-formular":
        ausnahmeStand.stufe = "formular";
        R.dialogOeffnen(ausnahmeDialog());
        return;
      case "plan-ausnahme-abbrechen":
        ausnahmeStand = null;
        R.dialogSchliessen(true);
        R.zeichnen();
        return;
      case "plan-ausnahme-speichern": {
        const grund = ausnahmeStand.grund;
        if (grund.length < 3) {
          ausnahmeStand.fehler = "Bitte einen Grund eintragen. Ohne Grund bleibt der Status unverändert.";
          ausnahmeStand.stufe = "formular";
          R.dialogOeffnen(ausnahmeDialog());
          return;
        }
        const z = zeileVon(e, ausnahmeStand.mitarbeiterId);
        const abw = abwesenheitVon(e, ausnahmeStand.mitarbeiterId);
        if (z) {
          merken(e);
          /* Nur die Planzeile bekommt eine Ausnahme. Die Krankmeldung
             beziehungsweise der Urlaub bleibt unveraendert bestehen. */
          z.ausnahme = {
            grund,
            art: abw.wirksam ? abw.wirksam.art : "",
            zeitraum: D.zeitraumText(abw.wirksam)
          };
          z.imDienst = true;
          if (!z.von || !z.bis) { z.vorlage = "tag"; z.von = "09:00"; z.bis = "17:00"; }
        }
        ausnahmeStand = null;
        R.dialogSchliessen(true);
        R.zeichnen();
        return;
      }
      case "plan-ausnahme-zurueck": {
        const z = zeileVon(e, wert);
        if (z) {
          merken(e);
          z.ausnahme = null;
          z.imDienst = false;
          z.vorlage = null; z.von = ""; z.bis = ""; z.fahrzeugId = null;
          delete e.zeitfehler[wert];
        }
        R.zeichnen();
        return;
      }

      /* Der erste Klick veroeffentlicht nichts - er prueft. */
      case "plan-veroeffentlichen":
        R.dialogOeffnen(pruefungsDialog()); return;
      case "plan-zurueck-zur-planung":
        R.dialogSchliessen(); R.zeichnen(); return;
      case "plan-zurueck-zur-pruefung":
        R.dialogOeffnen(pruefungsDialog()); return;
      case "plan-trotzdem":
        trotzdemStufe = "grund";
        R.dialogOeffnen(trotzdemDialog("")); return;
      /* Erster Klick: nur pruefen. Hier wird nichts veroeffentlicht. */
      case "plan-trotzdem-pruefen": {
        const feld = document.querySelector("[data-grund]");
        veroeffentlichungsGrund = feld ? feld.value.trim() : "";
        if (veroeffentlichungsGrund.length < 3) {
          R.dialogOeffnen(trotzdemDialog("Bitte einen Grund eintragen. Ohne Grund wird nicht veröffentlicht."));
          const neu = document.querySelector("[data-grund]");
          if (neu) neu.focus();
          return;
        }
        trotzdemStufe = "pruefung";
        R.dialogOeffnen(trotzdemDialog(""));
        return;
      }
      case "plan-trotzdem-zurueck":
        trotzdemStufe = "grund";
        R.dialogOeffnen(trotzdemDialog(""));
        return;
      case "plan-trotzdem-ja": {
        if (veroeffentlichungsGrund.length < 3) {
          trotzdemStufe = "grund";
          R.dialogOeffnen(trotzdemDialog("Bitte einen Grund eintragen. Ohne Grund wird nicht veröffentlicht."));
          return;
        }
        trotzdemStufe = "grund";
        planVeroeffentlichen(true); return;
      }
      case "plan-veroeffentlichen-ja":
        planVeroeffentlichen(false); return;

      case "lohn-neu":
        Object.assign(lohnStand, { mitarbeiterId: "", monat: "", jahr: "2026", datei: "" });
        R.dialogOeffnen(lohnDialog()); return;
      case "lohn-wer":   lohnStand.mitarbeiterId = wert; R.dialogOeffnen(lohnDialog()); return;
      case "lohn-datei": lohnStand.datei = wert; R.dialogOeffnen(lohnDialog()); return;
      case "lohn-fertig":
        R.dialogOeffnen(hinweisDialog("In der Probe wird nichts bereitgestellt",
          "Im echten Portal käme die Datei jetzt in den privaten Bucket, der Mitarbeiter sähe sie in seinem Portal, und der Vorgang würde protokolliert. Diese Probe lädt nichts hoch.", "vorbereitet"));
        return;
      case "lohn-ansehen":
        R.dialogOeffnen(hinweisDialog("Ansehen",
          "Im echten Portal würde jetzt eine kurz gültige, signierte Adresse erzeugt. In der Probe gibt es keine Datei.", "vorbereitet"));
        return;
      default: return;
    }
  }
  function geaendert(feld) {
    if (feld.matches("[data-plan]")) {
      const e = planEntwurf();
      /* Ueber die Mitarbeiterkennung, nie ueber eine Zeilennummer. */
      const z = zeileVon(e, feld.dataset.mitarbeiter);
      if (!z) return true;
      merken(e);
      const was = feld.dataset.plan;
      if (was === "dienst") {
        const abw = abwesenheitVon(e, z.mitarbeiterId);

        /* Krank oder im genehmigten Urlaub und trotzdem "Im Dienst"?
           Das wird NICHT still uebernommen. Es gibt eine ausdrueckliche
           Nachfrage, und nur mit Grund entsteht eine Ausnahme. Der
           Abwesenheitsdatensatz bleibt dabei unberuehrt. */
        if (abw.wirksam && feld.value === "ja" && !z.ausnahme) {
          e.verlauf.pop();               // die Vormerkung wieder zuruecknehmen
          ausnahmeStand = { mitarbeiterId: z.mitarbeiterId, grundSichtbar: false, grund: "", fehler: "" };
          R.dialogOeffnen(ausnahmeDialog());
          R.zeichnen();                  // die Auswahl springt sichtbar zurueck
          return true;
        }

        if (feld.value === "abwesend") {
          /* Zurueck auf den Stand der Abwesenheit. Geloescht wird nur
             die Planung dieses Tages, nie die Abwesenheit selbst. */
          z.ausnahme = null;
          z.imDienst = false;
          z.vorlage = null; z.von = ""; z.bis = ""; z.fahrzeugId = null;
          delete e.zeitfehler[z.mitarbeiterId];
        } else {
          z.imDienst = feld.value === "ja";
          if (!z.imDienst) {
            z.ausnahme = null;
            z.vorlage = null; z.von = ""; z.bis = ""; z.fahrzeugId = null;
            delete e.zeitfehler[z.mitarbeiterId];
          } else if (!z.vorlage) {
            z.vorlage = "tag"; z.von = "09:00"; z.bis = "17:00";
          }
        }
      } else if (was === "vorlage") {
        const v = vorlageVon(feld.value);
        z.vorlage = feld.value === "individuell" ? null : feld.value;
        if (v && v.von) {
          z.von = v.von; z.bis = v.bis;
          delete e.zeitfehler[z.mitarbeiterId];
        }
      } else if (was === "fahrzeug") {
        z.fahrzeugId = feld.value || null;
      }
      R.zeichnen();
      return true;
    }
    /* Das Planungsdatum laeuft jetzt ueber ProbeDatum - siehe unten. */
    if (feld.matches("[data-plan-suche]")) {
      planEntwurf().suche = feld.value; R.zeichnen(); return true;
    }
    if (feld.matches("[data-lohn]")) { lohnStand[feld.dataset.lohn] = feld.value; R.dialogOeffnen(lohnDialog()); return true; }
    if (window.ProbeTeam.geaendert(feld)) return true;
    if (window.ProbeVorgaenge.geaendert(feld)) return true;
    if (window.ProbeKalender.geaendert(feld)) return true;
    if (window.ProbeAkten.geaendert(feld)) return true;
    if (window.ProbeEinstellungen.geaendert(feld)) return true;
    /* Der eigene Zeitraum der Analyse laeuft ueber ProbeDatum. */
    /* Kundensuche filtert beim Tippen. Der Schreibzeiger bleibt,
       weil zeichnen() ihn wiederherstellt. */
    if (feld.matches("[data-kundensuche]")) {
      if (kundenStand.suche === feld.value) return true;
      kundenStand.suche = feld.value;
      R.zeichnen();
      return true;
    }
    return false;
  }

  /* ============================================================
     Zeitfelder der Planung
     ============================================================
     Uebernommen wird erst beim Verlassen oder mit der Eingabetaste -
     nicht bei jedem Zeichen. Sonst wuerde die Zeile bei jedem Tastendruck
     neu gezeichnet und der Fokus spraenge aus dem Feld.
  */
  function zeitUebernehmen(kennung, teil, ergebnis) {
    const e = planEntwurf();
    const z = zeileVon(e, kennung);
    if (!z) return;

    if (!ergebnis.gueltig && !ergebnis.leer) {
      /* Ungueltiges bleibt im Feld stehen und wird NICHT in die Zeile
         uebernommen. Der Fehler steht direkt daneben. */
      e.zeitfehler[kennung] = ergebnis.fehler;
      R.zeichnen();
      return;
    }
    delete e.zeitfehler[kennung];
    const vorher = teil === "von" ? z.von : z.bis;
    if (vorher === ergebnis.wert) { R.zeichnen(); return; }
    merken(e);
    if (teil === "von") z.von = ergebnis.wert; else z.bis = ergebnis.wert;
    z.vorlage = null;
    R.zeichnen();
  }

  const bereiche = {
    uebersicht, fahrten, planung, team, kalender, meldungen,
    kunden, personal, lohn, finanzen, rewards, analyse,
    /* Der Bereich liegt in einem eigenen Modul - er ist gross genug
       und hat mit den uebrigen Flaechen nichts gemeinsam. */
    einstellungen: () => window.ProbeEinstellungen.zeichne()
  };

  /* ============================================================
     Zeitfelder anmelden
     ============================================================
     Ein Ort fuer alle Zeitfelder der Probe. Die Kennung sagt, wohin
     der Wert gehoert: "fahrt" ist der Fahrtassistent, alles andere ist
     eine Mitarbeiterkennung der Planung. */
  /* Fahrer & Fahrzeuge arbeitet auf DEMSELBEN Tagesentwurf wie die
     Planung. Deshalb bekommt das Modul die Helfer gereicht, statt
     eigene zu bauen - sonst gaebe es zwei Wahrheiten. */
  const planungsHelfer = {
    planEntwurf, tagesstatus, arbeitetAmTag, merken, zeileVon,
    konflikteVon, STATUSNAMEN
  };
  window.ProbeTeam.anmelden(planungsHelfer);
  window.ProbeVorgaenge.anmelden(planungsHelfer);
  window.ProbeKalender.anmelden(planungsHelfer);

  window.ProbeZeit.anmelden({
    uebernehmen(kennung, teil, ergebnis, feld) {
      if (kennung === "fahrt") { window.ProbeFahrtassistent.zeit(teil, ergebnis, feld); return; }
      zeitUebernehmen(kennung, teil, ergebnis);
    },
    weiter(kennung, teil, feld) {
      if (kennung === "fahrt") window.ProbeFahrtassistent.zeitWeiter(teil, feld);
    },
    verwerfen() { /* der Wert im Feld wurde schon zurueckgesetzt */ }
  });
  window.ProbeZeit.binden();

  /*
    Das gemeinsame Datumsmodul - eine Anmeldung fuer das ganze Portal.

    Gemessener Ausgangsfehler: Zehn <input type="date"> an fuenf
    Stellen. Jedes sprang beim Tippen des Jahres zurueck zum Tag.

    Jetzt gibt es ein Feld, eine Pruefung und eine Verteilung. Wer
    ein weiteres Datumsfeld braucht, nimmt dasselbe Modul; eine
    Eigenloesung daneben kann es nicht mehr geben, weil es kein
    natives Datumsfeld mehr gibt.
  */
  function datumUebernehmen(kennung, teil, ergebnis) {
    switch (kennung) {
      case "plan": {
        planDatumFehler = ergebnis.fehler;
        if (ergebnis.gueltig) {
          /* Ein neuer Tag heisst neuer Entwurf - der alte gehoerte
             zum alten Tag. */
          R.zustand.planDatum = ergebnis.iso;
          R.zustand.planEntwurf = null;
        }
        R.zeichnen();
        return;
      }
      case "analyse": {
        if (teil === "von") {
          analyseStand.fehlerVon = ergebnis.fehler;
          analyseStand.von = ergebnis.gueltig ? ergebnis.iso : "";
        } else {
          analyseStand.fehlerBis = ergebnis.fehler;
          analyseStand.bis = ergebnis.gueltig ? ergebnis.iso : "";
        }
        analyseStand.verdreht = window.ProbeDatum.verdreht(analyseStand.von, analyseStand.bis);
        R.zeichnen();
        return;
      }
      default:
        /* Die Fachmodule behandeln ihre eigenen Kennungen. */
        if (window.ProbeKalender.datum && window.ProbeKalender.datum(kennung, teil, ergebnis)) return;
        if (window.ProbeVorgaenge.datum && window.ProbeVorgaenge.datum(kennung, teil, ergebnis)) return;
        if (window.ProbeFahrtassistent.datum && window.ProbeFahrtassistent.datum(kennung, teil, ergebnis)) return;
    }
  }

  window.ProbeDatum.anmelden({
    uebernehmen: datumUebernehmen,
    weiter(kennung, teil, feld) {
      if (kennung === "fahrt" && window.ProbeFahrtassistent.datumWeiter) {
        window.ProbeFahrtassistent.datumWeiter(teil, feld);
      }
    },
    verwerfen(kennung, teil, feld) {
      /* Der Wert im Feld wurde schon zurueckgesetzt. Die Fehlermeldung
         muss aber mit verschwinden - sonst bliebe eine Warnung zu
         einer Eingabe stehen, die es nicht mehr gibt. */
      datumUebernehmen(kennung, teil, window.ProbeDatum.pruefen(feld.value));
    }
  });
  window.ProbeDatum.binden();

  window.ProbeBereiche = {
    /*
      Ein Sprung von einer Kennzahl mit Zusatz. Das Zielmodul stellt
      sich darauf ein, BEVOR gezeichnet wird - damit die Zielliste
      genau die Menge zeigt, deren Zahl auf der Karte stand.
    */
    sprungziel: (bereichId, zusatz) => {
      if (bereichId === "meldungen" && window.ProbeVorgaenge.sprungziel) {
        window.ProbeVorgaenge.sprungziel(zusatz);
      }
      if (bereichId === "team" && window.ProbeTeam.sprungziel) {
        window.ProbeTeam.sprungziel(zusatz);
      }
    },
    nachZeichnen: () => {
      if (window.ProbeVorgaenge.nachZeichnen) window.ProbeVorgaenge.nachZeichnen();
      if (window.ProbeTeam.nachZeichnen) window.ProbeTeam.nachZeichnen();
      if (window.ProbeAkten.nachZeichnen) window.ProbeAkten.nachZeichnen();
    },
    zeichne: (id) => (bereiche[id] ? bereiche[id]() : R.kastenLeer("Inhalte")),
    tun, geaendert,
    taste: (e) => {
      /*
        Enter in der Kundensuche oeffnet bei genau EINEM Treffer die
        Akte. Bei mehreren oder keinem passiert nichts - geraten wird
        nicht.
      */
      const ziel = e.target;
      if (e.key === "Enter" && ziel && ziel.matches && ziel.matches("[data-kundensuche]")) {
        e.preventDefault();
        const s = kundenStand.suche.trim();
        if (!s) return true;
        const erg = D.kundenSuche(s, 25);
        if (!erg.zuKurz && erg.gesamt === 1) window.ProbeAkten.tun("ak-kunde", erg.treffer[0].id);
        return true;
      }
      return window.ProbeFahrtassistent.taste(e);
    },
    eingabe: (feld) => {
      /* Suchfelder filtern beim Tippen. Der Fokus bleibt, weil
         zeichnen() ihn samt Schreibzeiger wiederherstellt. */
      if (feld && feld.matches && feld.matches("[data-plan-suche], [data-team-fahrersuche], [data-team-fahrzeugsuche], [data-vg-suche], [data-zuordnung-suche], [data-kundensuche], [data-es-grund]")) {
        return geaendert(feld);
      }
      return window.ProbeFahrtassistent.eingabe(feld);
    }
  };
})();
