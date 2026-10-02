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
  function tagesstatus(e, z) {
    const abw = abwesenheitVon(e, z.mitarbeiterId);
    if (abw.wirksam && !z.ausnahme) return abw.wirksam.art;   // "krank" | "urlaub"
    return z.imDienst ? "dienst" : "frei";
  }

  const STATUSNAMEN = { dienst: "Im Dienst", frei: "Frei", krank: "Krank", urlaub: "Urlaub" };

  /* Arbeitet die Person an diesem Tag tatsaechlich? Eine begruendete
     Ausnahme zaehlt als Dienst. */
  const arbeitetAmTag = (e, z) => tagesstatus(e, z) === "dienst";

  /* Deckt die Abwesenheit die Schicht nur teilweise ab? Das kann bei
     einer Nachtschicht vorkommen: Der Teil nach Mitternacht faellt auf
     den Folgetag, den die Abwesenheit nicht mehr umfasst. */
  function nurTeilweiseAbgedeckt(e, z, abw) {
    if (!abw || !abw.wirksam) return false;
    if (!z.von || !z.bis) return false;
    if (!window.ProbeZeit.ueberMitternacht(z.von, z.bis)) return false;
    const folgetag = D.alsIso(new Date(new Date(e.iso + "T00:00:00").getTime() + 86400000));
    return !(folgetag >= abw.wirksam.von && folgetag <= abw.wirksam.bis);
  }

  /* ---- Konflikte ----
     Getrennt nach zwei Arten, weil sie verschieden schwer wiegen:

     "technisch"  - die Daten sind nicht verwendbar. Veroeffentlichen
                    ist ausgeschlossen, nicht nur unerwuenscht.
     "betrieblich" - fachlich unguenstig, aber eine bewusste
                    Entscheidung ist moeglich.
  */
  function minuten(zeit) {
    if (!zeit || !/^\d{2}:\d{2}$/.test(zeit)) return null;
    const [s, m] = zeit.split(":").map(Number);
    return s * 60 + m;
  }

  /* Zwei Schichten am selben Fahrzeug ueberschneiden sich? Schichten
     ueber Mitternacht werden dabei in zwei Stuecke zerlegt. */
  function abschnitte(von, bis) {
    const a = minuten(von);
    const b = minuten(bis);
    if (a === null || b === null) return [];
    if (b > a) return [[a, b]];
    if (b === a) return [[a, a + 1]];
    return [[a, 1440], [0, b]];
  }
  const ueberschneidet = (x, y) =>
    abschnitte(x.von, x.bis).some(([a1, b1]) =>
      abschnitte(y.von, y.bis).some(([a2, b2]) => a1 < b2 && a2 < b1));

  function konflikteVon(entwurf) {
    const liste = [];
    /* Fuer die Fahrzeugpruefung zaehlt, wer an diesem Tag wirklich
       faehrt - wer krank oder im Urlaub ist, belegt kein Fahrzeug. */
    const imDienst = entwurf.zeilen.filter((z) => arbeitetAmTag(entwurf, z));
    const tagText = D.alsText(new Date(entwurf.iso + "T00:00:00"));

    for (const z of entwurf.zeilen) {
      const m = mitarbeiterVon(z.mitarbeiterId);
      const name = m ? m.name : z.mitarbeiterId;

      /* Technisch: der Mitarbeiter ist gar nicht bekannt. */
      if (!m) {
        liste.push({
          art: "technisch", kennung: z.mitarbeiterId, kurz: "Mitarbeiter unbekannt",
          text: `Zu der Kennung ${z.mitarbeiterId} gibt es keinen Mitarbeiterdatensatz.`
        });
        continue;
      }
      const abw = abwesenheitVon(entwurf, z.mitarbeiterId);

      /* Technisch: krank UND genehmigter Urlaub am selben Tag. Das ist
         ein Widerspruch in den Daten, keine Ermessensfrage. */
      if (abw.widerspruch) {
        liste.push({
          art: "technisch", kennung: z.mitarbeiterId, kurz: "Krank und Urlaub zugleich",
          text: `${name} ist am ${tagText} gleichzeitig krank gemeldet und im genehmigten Urlaub. Diese beiden Angaben widersprechen sich.`
        });
        continue;
      }

      /* Betrieblich: Abwesenheit und Schicht treffen aufeinander.
         Zwei verschiedene Lagen, die verschieden zu lesen sind:

         a) Der Dispatcher hat bewusst abgewichen - es gibt eine
            begruendete Ausnahme. Die Person arbeitet.
         b) Es steht noch eine Schicht im Plan, obwohl die Abwesenheit
            gilt. Die Schicht ist NICHT aktiv; der Plan ist nur noch
            nicht aufgeraeumt.

         Eine Abwesenheit ganz ohne Schicht ist dagegen kein Konflikt -
         das ist der Normalfall. */
      if (abw.wirksam) {
        const artName = abw.wirksam.art === "krank" ? "krank gemeldet" : "im genehmigten Urlaub";
        const schicht = z.von && z.bis ? `${z.von}–${z.bis}` : "ohne Zeit";
        const fz = z.fahrzeugId ? fahrzeugVon(z.fahrzeugId) : null;

        if (z.ausnahme) {
          liste.push({
            art: "betrieblich", kennung: z.mitarbeiterId,
            kurz: abw.wirksam.art === "krank" ? "Krank, trotzdem im Dienst" : "Urlaub, trotzdem im Dienst",
            text: `${name} ist am ${tagText} ${artName} (${D.zeitraumText(abw.wirksam)}), ist aber für ${schicht}${fz ? ` mit ${fz.kennzeichen}` : ""} eingeplant.`,
            ausnahme: z.ausnahme.grund
          });
        } else if (z.imDienst || z.von || z.bis || z.fahrzeugId) {
          liste.push({
            art: "betrieblich", kennung: z.mitarbeiterId,
            kurz: "Abwesend, Schicht noch im Plan",
            text: `${name} ist am ${tagText} ${artName} (${D.zeitraumText(abw.wirksam)}), im Plan steht aber noch ${schicht}${fz ? ` mit ${fz.kennzeichen}` : ""}. Diese Schicht ist nicht aktiv — bitte auf „${D.ABWESENHEIT_NAMEN[abw.wirksam.art]}“ setzen oder eine Ausnahme begründen.`
          });
        }
      }

      /* Betrieblich: die Abwesenheit deckt nur einen Teil der Schicht. */
      if (nurTeilweiseAbgedeckt(entwurf, z, abw)) {
        liste.push({
          art: "betrieblich", kennung: z.mitarbeiterId, kurz: "Abwesenheit deckt nur einen Teil",
          text: `${name}: Die Schicht ${z.von}–${z.bis} geht über Mitternacht hinaus, die eingetragene Abwesenheit endet aber am ${tagText}.`
        });
      }

      if (!arbeitetAmTag(entwurf, z)) continue;

      /* Technisch: die Uhrzeit ist unvollstaendig oder ungueltig. */
      if (entwurf.zeitfehler[z.mitarbeiterId]) {
        liste.push({
          art: "technisch", kennung: z.mitarbeiterId, kurz: "Uhrzeit ungültig",
          text: `${name}: ${entwurf.zeitfehler[z.mitarbeiterId]}`
        });
        continue;
      }
      if (!z.von || !z.bis || minuten(z.von) === null || minuten(z.bis) === null) {
        liste.push({
          art: "technisch", kennung: z.mitarbeiterId, kurz: "Uhrzeit unvollständig",
          text: `${name}: Die individuelle Uhrzeit ist unvollständig.`
        });
        continue;
      }

      /* Technisch: das Fahrzeug gibt es nicht. */
      if (z.fahrzeugId && !fahrzeugVon(z.fahrzeugId)) {
        liste.push({
          art: "technisch", kennung: z.mitarbeiterId, kurz: "Fahrzeug unbekannt",
          text: `${name}: Die Fahrzeugkennung ${z.fahrzeugId} gehört zu keinem Fahrzeug.`
        });
        continue;
      }

      /* Betrieblich: kein Fahrzeug zugewiesen. */
      if (!z.fahrzeugId) {
        liste.push({
          art: "betrieblich", kennung: z.mitarbeiterId, kurz: "kein Fahrzeug",
          text: `${name} ist im Dienst, aber es wurde kein Fahrzeug zugewiesen.`
        });
        continue;
      }

      /* Betrieblich: Fahrzeug steht in der Werkstatt. */
      const fz = fahrzeugVon(z.fahrzeugId);
      if (fz.zustand !== "verfuegbar") {
        liste.push({
          art: "betrieblich", kennung: z.mitarbeiterId, kurz: "Fahrzeug nicht verfügbar",
          text: `${name} soll ${fz.name} · ${fz.kennzeichen} fahren, das Fahrzeug steht aber in der Werkstatt.`
        });
      }
    }

    /* Betrieblich: dasselbe Fahrzeug zur selben Zeit. */
    for (let i = 0; i < imDienst.length; i += 1) {
      for (let j = i + 1; j < imDienst.length; j += 1) {
        const a = imDienst[i];
        const b = imDienst[j];
        if (!a.fahrzeugId || a.fahrzeugId !== b.fahrzeugId) continue;
        if (!ueberschneidet(a, b)) continue;
        const fz = fahrzeugVon(a.fahrzeugId);
        const na = mitarbeiterVon(a.mitarbeiterId);
        const nb = mitarbeiterVon(b.mitarbeiterId);
        if (!fz || !na || !nb) continue;
        liste.push({
          art: "betrieblich", kennung: a.mitarbeiterId, zweiteKennung: b.mitarbeiterId,
          kurz: "Fahrzeug doppelt",
          text: `${na.name} und ${nb.name} verwenden gleichzeitig ${fz.kennzeichen}.`
        });
      }
    }
    return liste;
  }

  /* Welche Mitarbeiter sind von mindestens einem Konflikt betroffen? */
  function betroffene(liste) {
    const menge = new Set();
    for (const k of liste) {
      menge.add(k.kennung);
      if (k.zweiteKennung) menge.add(k.zweiteKennung);
    }
    return menge;
  }

  const kurzHinweis = (liste, mitarbeiterId) => {
    const treffer = liste.find((k) => k.kennung === mitarbeiterId || k.zweiteKennung === mitarbeiterId);
    return treffer ? treffer.kurz : "";
  };

  /* ============================================================
     1. Übersicht
     ============================================================ */
  function uebersicht() {
    const iso = D.alsIso(D.heute);
    const plan = D.planung[iso];
    const imDienst = plan.zeilen.filter((z) => z.imDienst).length;
    const ohneFahrzeug = plan.zeilen.filter((z) => z.imDienst && !z.fahrzeugId).length;
    const frei = D.fahrzeuge.filter((f) => f.zustand === "verfuegbar").length;
    /*
      Keine eigene Rechnung mehr. Die Uebersicht zaehlte "Fahrten
      heute" ohne stornierte und zeigte damit 9, wo Kalender und
      Fahrtenliste 10 zeigten. Und sie rechnete "ungeplant + eingang"
      = 4, sprang aber in den Filter "ungeplant" mit 2.

      Jetzt kommt jede Zahl aus derselben Definition in probe-daten.js.
    */
    const alleHeute = D.fahrtenHeute();
    const heuteAlle = alleHeute.length;
    const offeneZuweisung = D.nichtZugewiesen().length;
    const eingang = alleHeute.filter((f) => f.zustand === "eingang").length;
    const unterwegs = alleHeute.filter((f) => f.zustand === "unterwegs").length;
    /* Aus demselben Bestand wie "Meldungen & Aufgaben" - nicht aus
       einer zweiten Liste. Sonst zeigten Uebersicht und Eingang
       verschiedene Zahlen. */
    const meldungen = window.ProbeVorgaenge.offeneFuerMich();
    /*
      Die Warnungen kommen aus demselben Modul, das sie auch anzeigt -
      sonst zaehlt die Uebersicht neun und der Reiter zeigt drei
      erledigte. Genau das ist im Rundgang passiert.
    */
    const warnungen = window.ProbeVorgaenge.offeneWarnungen().length;

    /* Derselbe Sortierer wie in der Fahrtenliste und im Kalender.
       Fahrten ohne geklaerte Zeit stehen hinten, nicht dazwischen. */
    const naechste = D.nachZeit(
      alleHeute.filter((f) => ["geplant", "unterwegs", "ungeplant"].includes(f.zustand))
    ).slice(0, 6);

    return `
      <div class="bereichskopf">
        <div>
          <h1>Übersicht</h1>
          <p class="wichtig">${h(D.alsText(D.heute))} · ${h(imDienst)} im Dienst · ${
            offeneZuweisung > 0
              ? `${offeneZuweisung} ${offeneZuweisung === 1 ? "Fahrt wartet" : "Fahrten warten"} auf eine Zuweisung`
              : "alle Fahrten sind zugewiesen"}</p>
        </div>
        <div class="hauptaktion">
          <button class="knopf haupt-knopf" type="button" data-tun="neue-fahrt">Neue Fahrt aufnehmen</button>
        </div>
      </div>

      <div class="flaeche">
        <h2>Jetzt wichtig <span class="offen">Zahlen sind anklickbar</span></h2>
        <div class="kennzahlen">
          ${R.kennzahl(heuteAlle, "Fahrten heute", "", "fahrten:alle")}
          ${R.kennzahl(offeneZuweisung, "noch nicht zugewiesen", offeneZuweisung ? "warnung" : "gut", "fahrten:offen")}
          ${R.kennzahl(unterwegs, "gerade unterwegs", "marke", "fahrten:unterwegs")}
          ${R.kennzahl(imDienst, "Fahrer im Dienst", "gut", "planung")}
          ${R.kennzahl(frei, "Fahrzeuge verfügbar", "gut", "team")}
          ${R.kennzahl(ohneFahrzeug, "im Dienst ohne Fahrzeug", ohneFahrzeug ? "warnung" : "gut", "planung")}
          ${R.kennzahl(warnungen, "Warnungen", warnungen ? "warnung" : "gut", "meldungen:warnungen")}
        </div>
      </div>

      <div class="flaeche">
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
      </div>

      <div class="flaeche">
        <h2>Schnellaktionen</h2>
        <div class="wahlraster">
          <button class="wahlkarte" type="button" data-tun="neue-fahrt"><strong>Neue Fahrt</strong><span>Fahrt aufnehmen</span></button>
          <button class="wahlkarte" type="button" data-ziel="planung"><strong>Schicht planen</strong><span>Heute oder morgen</span></button>
          <button class="wahlkarte" type="button" data-tun="wechsel-fahrer"><strong>Fahrer wechseln</strong><span>Bei einer Fahrt</span></button>
          <button class="wahlkarte" type="button" data-tun="wechsel-fahrzeug"><strong>Fahrzeug wechseln</strong><span>Bei einer Fahrt</span></button>
          <button class="wahlkarte" type="button" data-ziel="fahrten:eingang"><strong>Anfrage bearbeiten</strong><span>${h(eingang)} im Eingang</span></button>
          <button class="wahlkarte" type="button" data-ziel="meldungen"><strong>Meldungen</strong><span>${h(meldungen.length)} offen</span></button>
        </div>
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
      if (id === "konflikte") return konflikte.length;
      if (["dienst", "frei", "krank", "urlaub"].includes(id)) return zaehle(id);
      return null;
    };

    return `
      <div class="bereichskopf">
        <div>
          <h1>Planung</h1>
          <p class="wichtig">${h(imDienst)} im Dienst · ${h(zaehle("frei"))} frei · ${h(zaehle("krank"))} krank ·
            ${h(zaehle("urlaub"))} Urlaub · ${h(ohneFahrzeug)} ohne Fahrzeug · ${h(konflikte.length)} Konflikte</p>
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
              <input type="date" data-plan-datum value="${h(planTagIso())}"></label>
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
  function kunden() {
    /* Gezeigt werden hoechstens 25 Zeilen. Der Bestand hat ueber
       zweitausend Eintraege - die Oberflaeche zeichnet ihn nie ganz. */
    const gezeigt = D.kunden.slice(0, 25);
    return `
      <div class="bereichskopf"><div>
        <h1>Kunden</h1>
        <p class="wichtig">${h(D.kunden.length)} Testkunden im Bestand</p>
      </div></div>
      <div class="flaeche">
        <h2>Suche</h2>
        <label style="max-width:420px">Name, Telefonnummer oder Kundennummer
          <input type="search" placeholder="Testkunde …"></label>
      </div>
      <div class="flaeche">
        <h2>Liste <span class="offen">die ersten ${h(gezeigt.length)} von ${h(D.kunden.length)}</span></h2>
        <div class="tabelle-huelle"><table class="liste">
          <thead><tr><th>Name</th><th>Kontakt</th><th>Kundenkonto</th><th>Fahrten</th><th>Hinweis</th></tr></thead>
          <tbody>${gezeigt.map((k) => `<tr>
            <td><strong>${h(k.name)}</strong></td>
            <td>${h(k.telefon)}</td>
            <td>${k.konto === "verknüpft" ? R.marke("gut", "verknüpft") : R.marke("ruhig", "nicht verknüpft")}</td>
            <td>${h(k.fahrten)}</td>
            <td>${h(k.hinweis) || "—"}</td>
          </tr>`).join("")}</tbody></table></div>
        <p class="wichtig" style="font-size:14px;margin-top:10px;">
          Die Disposition hat keinen Zugriff auf diese Liste. Sie sieht Kontaktangaben nur an einer konkreten Fahrt.
        </p>
      </div>`;
  }

  /* ============================================================
     7. Personal
     ============================================================ */
  function personal() {
    return `
      <div class="bereichskopf"><div>
        <h1>Personal</h1>
        <p class="wichtig">${h(D.personal.length)} Mitarbeiter · 1 Krankmeldung offen · 1 Frist läuft ab</p>
      </div></div>
      <div class="flaeche">
        <h2>Mitarbeiter</h2>
        <div class="tabelle-huelle"><table class="liste">
          <thead><tr><th>Name</th><th>Status</th><th>Beschäftigung</th><th>Eintritt</th><th>Konto</th><th>Fristen</th></tr></thead>
          <tbody>${D.personal.map((p) => {
            const kritisch = p.fristen.find((f) => f.bis !== "gültig");
            return `<tr>
              <td><strong>${h(p.name)}</strong></td>
              <td>${p.status === "aktiv" ? R.marke("gut", "aktiv")
                  : p.status === "krank" ? R.marke("warnung", "krank")
                  : R.marke("ruhig", p.status)}</td>
              <td>${h(p.beschaeftigung)}</td>
              <td>${h(p.eintritt)}</td>
              <td>${p.konto === "verknüpft" ? R.marke("gut", "verknüpft") : R.marke("ruhig", "nicht verknüpft")}</td>
              <td>${kritisch ? R.marke("warnung", `${kritisch.was}: ${kritisch.bis}`) : R.marke("gut", "alle gültig")}</td>
            </tr>`;
          }).join("")}</tbody></table></div>
        <p class="wichtig" style="font-size:14px;margin-top:10px;">
          Persönliche Daten stehen nicht in der Übersicht, sondern erst in der einzelnen Akte.
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
  function finanzen() {
    const zahl = (z) => D.rechnungen.filter((r) => r.zustand === z).length;
    return `
      <div class="bereichskopf"><div>
        <h1>Finanzen</h1>
        <p class="wichtig">${h(zahl("offen"))} offen · ${h(zahl("überfällig"))} überfällig · ${h(zahl("Entwurf"))} Entwurf</p>
      </div></div>
      <div class="flaeche">
        <h2>Rechnungen</h2>
        <div class="tabelle-huelle"><table class="liste">
          <thead><tr><th>Nummer</th><th>Kunde</th><th>Zeitraum</th><th>Betrag</th><th>Fällig</th><th>Zustand</th></tr></thead>
          <tbody>${D.rechnungen.map((r) => `<tr>
            <td>${h(r.nr)}</td><td>${h(r.kunde)}</td><td>${h(r.zeitraum)}</td>
            <td><strong>${h(r.betrag)}</strong></td><td>${h(r.faellig)}</td>
            <td>${r.zustand === "bezahlt" ? R.marke("gut", "bezahlt")
                : r.zustand === "überfällig" ? R.marke("warnung", "überfällig")
                : R.marke("ruhig", r.zustand)}</td>
          </tr>`).join("")}</tbody></table></div>
      </div>
      <div class="flaeche">
        <h2>Versand und Buchhaltung</h2>
        ${R.zustandsKasten("vorbereitet", "Rechnungsversand — nicht eingerichtet",
          "Es ist kein geprüfter Mailversand angebunden. Deshalb wird hier kein Versand angeboten und keiner simuliert. Nötig sind: Absender, SMTP mit SPF/DKIM/DMARC und eine Protokollierung.")}
      </div>`;
  }

  /* ============================================================
     10. Rewards
     ============================================================ */
  function rewards() {
    const w = D.rewards;
    return `
      <div class="bereichskopf"><div>
        <h1>Rewards</h1>
        <p class="wichtig">Nur Administration. Die Disposition hat keinen Verwaltungszugriff.</p>
      </div></div>
      <div class="flaeche">
        <h2>Regeln</h2>
        <div class="kennzahlen">${w.regeln.map((r) =>
          `<div class="kennzahl" style="cursor:default"><span class="wert" style="font-size:20px">${h(r.wert)}</span>
           <span class="name">${h(r.name)}</span></div>`).join("")}</div>
      </div>
      <div class="flaeche">
        <h2>Konten</h2>
        <div class="tabelle-huelle"><table class="liste">
          <thead><tr><th>Kunde</th><th>Punkte</th><th>Stufe</th><th>Offene Drehs</th></tr></thead>
          <tbody>${w.konten.map((k) => `<tr>
            <td><strong>${h(k.kunde)}</strong></td><td>${h(k.punkte)}</td>
            <td>${R.marke("aktiv", k.stufe)}</td><td>${h(k.drehs)}</td></tr>`).join("")}</tbody>
        </table></div>
      </div>
      <div class="flaeche">
        <h2>Vorgänge</h2>
        <div class="tabelle-huelle"><table class="liste">
          <thead><tr><th>Wann</th><th>Was</th><th>Kunde</th><th>Ergebnis</th></tr></thead>
          <tbody>${w.vorgaenge.map((v) => `<tr>
            <td>${h(v.zeit)}</td><td>${h(v.was)}</td><td>${h(v.kunde)}</td>
            <td>${R.marke(v.zustand, v.ergebnis)}</td></tr>`).join("")}</tbody>
        </table></div>
        <p class="wichtig" style="font-size:14px;margin-top:10px;">
          Der Gewinn wird nie im Browser bestimmt — maßgeblich bleibt die Serverfunktion.
          Ein abgebrochener Dreh vernichtet keinen Anspruch. Yumaks Box bleibt bis zur fachlichen Freigabe gesperrt.
        </p>
      </div>`;
  }

  /* ============================================================
     11. Analyse
     ============================================================ */
  function analyse() {
    const a = D.analyse;
    const groesster = Math.max(...a.aktionen.map((x) => x.wert));
    return `
      <div class="bereichskopf"><div>
        <h1>Analyse</h1>
        <p class="wichtig">Zeitraum: ${h(a.zeitraum)}</p>
      </div></div>

      ${R.zustandsKasten("vorbereitet", "Alle Zahlen hier sind erfunden",
        "Es findet heute keinerlei Besuchermessung statt. Diese Ansicht zeigt nur, wie die Auswertung später aussehen würde. Im produktiven Portal bleibt der Bereich leer, bis eine datensparsame Ereigniserfassung eingerichtet und rechtlich geprüft ist.")}

      <div class="flaeche">
        <h2>Kennzahlen</h2>
        <div class="kennzahlen">${a.kennzahlen.map((k) =>
          `<div class="kennzahl" style="cursor:default">
             <span class="wert">${h(k.wert)}</span>
             <span class="name">${h(k.name)} · ${h(k.hinweis)}</span></div>`).join("")}</div>
        <p class="wichtig" style="font-size:14px;margin-top:10px;">
          <strong>Besucher</strong> ist immer eine Schätzung: ein Mensch mit Handy und Rechner zählt doppelt,
          wer Speicherfunktionen blockiert, gar nicht. <strong>Besuche</strong> und <strong>Seitenaufrufe</strong>
          werden dagegen gezählt. Mitarbeiter- und Adminnutzung wird nicht als Besuch gewertet.
        </p>
      </div>

      <div class="flaeche">
        <h2>Aktionen</h2>
        <div style="display:grid;gap:8px">${a.aktionen.map((x) => `
          <div style="display:grid;grid-template-columns:minmax(150px,1fr) 2fr auto;gap:10px;align-items:center;font-size:15px">
            <span>${h(x.name)}</span>
            <span style="height:8px;border-radius:2px;background:var(--flaeche-2)">
              <span style="display:block;height:100%;border-radius:2px;background:var(--gold);width:${Math.round(x.wert / groesster * 100)}%"></span>
            </span>
            <strong>${h(x.wert)}</strong>
          </div>`).join("")}</div>
      </div>

      <div class="flaeche">
        <h2>Beliebteste Seiten</h2>
        <div class="tabelle-huelle"><table class="liste">
          <thead><tr><th>Seite</th><th>Aufrufe</th></tr></thead>
          <tbody>${a.seiten.map((s) => `<tr><td>${h(s.name)}</td><td><strong>${h(s.wert)}</strong></td></tr>`).join("")}</tbody>
        </table></div>
      </div>`;
  }

  /* ============================================================
     Kleine Bestaetigungsfenster
     ============================================================ */
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

    switch (name) {
      case "neue-fahrt": window.ProbeFahrtassistent.starten(); return;

      case "fahrt-filter":  R.zustand.fahrtFilter = wert; R.zeichnen(); return;
      case "fahrt-zustand": R.zustand.fahrtenZustand = wert; R.zeichnen(); return;
      case "fahrt-oeffnen":
        R.dialogOeffnen(hinweisDialog(`Fahrt ${wert}`,
          "Hier stünden die Einzelheiten der Fahrt mit Fahrer- und Fahrzeugwechsel. Für die Designprobe genügt der Weg dorthin.", "leer"));
        return;
      case "neu-laden": R.zustand.fahrtenZustand = "geladen"; R.zeichnen(); return;

      case "wechsel-fahrer":
      case "wechsel-fahrzeug":
        R.dialogOeffnen(hinweisDialog(name === "wechsel-fahrer" ? "Fahrer wechseln" : "Fahrzeug wechseln",
          "Ein Fenster mit genau einer Auswahl: die verfügbaren Fahrer beziehungsweise Fahrzeuge als Karten, gold markiert. Kein zweites Fenster darüber.", "leer"));
        return;

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
    if (feld.matches("[data-plan-datum]")) {
      if (feld.value) { R.zustand.planDatum = feld.value; R.zustand.planEntwurf = null; }
      R.zeichnen();
      return true;
    }
    if (feld.matches("[data-plan-suche]")) {
      planEntwurf().suche = feld.value; R.zeichnen(); return true;
    }
    if (feld.matches("[data-lohn]")) { lohnStand[feld.dataset.lohn] = feld.value; R.dialogOeffnen(lohnDialog()); return true; }
    if (window.ProbeTeam.geaendert(feld)) return true;
    if (window.ProbeVorgaenge.geaendert(feld)) return true;
    if (window.ProbeKalender.geaendert(feld)) return true;
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

  const bereiche = { uebersicht, fahrten, planung, team, kalender, meldungen, kunden, personal, lohn, finanzen, rewards, analyse };

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
    },
    zeichne: (id) => (bereiche[id] ? bereiche[id]() : R.kastenLeer("Inhalte")),
    tun, geaendert,
    taste: (e) => window.ProbeFahrtassistent.taste(e),
    eingabe: (feld) => {
      /* Suchfelder filtern beim Tippen. Der Fokus bleibt, weil
         zeichnen() ihn samt Schreibzeiger wiederherstellt. */
      if (feld && feld.matches && feld.matches("[data-plan-suche], [data-team-fahrersuche], [data-team-fahrzeugsuche], [data-vg-suche], [data-zuordnung-suche]")) {
        return geaendert(feld);
      }
      return window.ProbeFahrtassistent.eingabe(feld);
    }
  };
})();
