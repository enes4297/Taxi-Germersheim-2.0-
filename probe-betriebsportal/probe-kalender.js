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
     ausgeblendeten Knopf. Wer "personal.read" nicht hat, bekommt die
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
    /* Fehlertext des Datumsfeldes. Er steht hier von Anfang an - ein
       Feld, das erst spaeter dazukommt, laesst zwei Zustaende
       unterschiedlich aussehen, die gleich sind. */
    datumFehler: "",
    arten: {                 /* reine Anzeigefilter */
      fahrt: true, schicht: true, konflikt: true, abwesenheit: true,
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
    fahrzeug: "Fahrzeug", dokument: "Dokument", konflikt: "Konflikt"
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
    if (R.darf("fahrten.read") && isoTag === heuteIso && D.fahrtenHeute().length) {
      /*
        Dieselbe Definition wie Uebersicht und Fahrtenliste. Vorher
        zaehlte jede Stelle selbst, und am selben Tag standen 10, 10
        und 9 nebeneinander.
      */
      const alle = D.fahrtenHeute();
      const offen = D.nichtZugewiesen().length;
      liste.push({
        art: "fahrt", marke: "aktiv",
        titel: alle.length + (alle.length === 1 ? " Fahrt" : " Fahrten"),
        zusatz: offen
          ? offen + (offen === 1 ? " noch nicht zugewiesen" : " noch nicht zugewiesen")
          : "alle zugewiesen",
        ziel: offen ? "fahrten:offen" : "fahrten:alle"
      });
    }

    /* --- Schichten, EINZELN.

           Gelesen wird der GESPEICHERTE Plan, nicht der Tagesentwurf
           der Planung. Der Kalender darf den Entwurf weder umschalten
           noch anlegen - sonst verlore die Planung beim blossen
           Blaettern ihre unbestaetigten Eingaben.

           Vorher stand hier nur "1 Schicht" oder "4 Schichten". Man
           sah nicht, wer gemeint war - und die Zahl zaehlte jede
           Zeile mit einer Zeit, auch wenn der Mitarbeiter krank war.
           An einem Tag mit sechs abwesenden Mitarbeitern stand
           deshalb "1 Schicht".

           Jetzt kommt jede Schicht einzeln, mit Namen, Zeit,
           Fahrzeug, Zustand und Planstatus. Ungueltige erscheinen
           als Konflikt - nicht als Schicht und nicht gar nicht. --- */
    /*
      Schichten und Konflikte - Planungssicht.

      GEMESSENER AUSGANGSFEHLER: Dieser Block leitete seine Konflikte
      aus schichtbefund() ab. Der sieht nur EINE Zeile fuer sich und
      kennt daher nur den Widerspruch Zeit-gegen-Abwesenheit. Am
      06.10.2026 nannte der Kalender deshalb genau einen Konflikt
      (Testfahrer 02), waehrend Planung und Uebersicht vier Zeilen
      zaehlten: Ein doppelt vergebenes Fahrzeug und ein Fahrer ohne
      Fahrzeug standen hier als gewoehnliche gruene Schichten.

      Jetzt fragt der Kalender denselben zentralen Konfliktbestand wie
      Planung, Uebersicht und Meldungen. Der Kalender bleibt dabei
      nur-lesend: Er zeigt und verlinkt, er aendert nichts.
    */
    if (R.darf("planung.read")) {
      const plan = D.planung[isoTag];
      const schichten = D.schichtenAmTag(isoTag);
      const planStatus = plan && plan.veroeffentlicht ? "veröffentlicht" : "Entwurf";
      const konflikte = D.konflikteFuer(isoTag);
      const betroffen = D.konfliktZeilen(konflikte);
      /* Alle Gruende zu einer Zeile - ein Eintrag kann zwei Fahrer
         nennen, dann gilt er fuer beide. */
      const gruendeVon = (id) => konflikte
        .filter((k) => k.kennung === id || k.zweiteKennung === id)
        .map((k) => k.kurz);

      for (const s of schichten) {
        const id = s.zeile.mitarbeiterId;
        const name = s.mitarbeiter ? s.mitarbeiter.name : id;
        /*
          GEMESSENER AUSGANGSFEHLER: Hier stand nur das Kennzeichen.
          Beim Konflikt des kranken Testfahrer 02 las sich der
          Eintrag deshalb als
            "... 09:00-17:00 · GER-TEST 002 · Krank ..."
          und wirkte wie eine aktive Fahrzeugzuweisung. Testwagen 02
          ist aber frei - das Kennzeichen stammt allein aus der
          ungueltigen Restplanung.

          Gefragt wird die zentrale Tageswahrheit, nicht eine zweite
          Rechnung: fahrzeugAktiv() ist null, wenn die Person an
          diesem Tag nicht faehrt. Zusammen mit dem Tagesstatus sagt
          das, ob eine ABWESENHEIT die alte Zuweisung ungueltig
          macht - nur dann wird "geplant:" vorangestellt. Eine
          gueltige Zuweisung bleibt unverandert benannt.

          Die Tageswahrheit selbst wird dabei nicht veraendert: Es
          wird nur gelesen.
        */
        const tagesstatus = D.tagesstatusAm(isoTag, s.zeile);
        const abwesend = tagesstatus === "krank" || tagesstatus === "urlaub";
        const nurGeplant = abwesend
          && Boolean(s.zeile.fahrzeugId)
          && !D.fahrzeugAktiv(isoTag, s.zeile);
        const wagen = s.fahrzeug
          ? (nurGeplant ? "geplant: " + s.fahrzeug.kennzeichen : s.fahrzeug.kennzeichen)
          : "kein Fahrzeug";
        const zeit = s.zeile.von + "–" + s.zeile.bis;
        const zustand = D.STATUS_IM_KALENDER[s.befund.status] || s.befund.status;
        /* Die Angaben der Schicht. Ein Konflikt kommt DAZU - er
           ersetzt sie nicht, sonst verliert der Eintrag Zeit,
           Fahrzeug, Zustand und Planstatus. */
        const fakten = zeit + " · " + wagen + " · " + zustand + " · " + planStatus
          + (s.befund.ausnahme ? " · bestätigte Ausnahme" : "");
        if (!betroffen.has(id)) {
          liste.push({
            art: "schicht",
            marke: plan && plan.veroeffentlicht ? "gut" : "ruhig",
            titel: name,
            zusatz: fakten,
            ziel: "planung", tag: isoTag
          });
        } else {
          liste.push({
            art: "konflikt", marke: "warnung", titel: name,
            zusatz: gruendeVon(id).join(" · ") + " · " + fakten,
            ziel: "planung", tag: isoTag
          });
        }
      }

      /* Konflikte an Zeilen ohne Uhrzeit. schichtenAmTag() laesst sie
         weg - eine Zeile ohne Zeit ist keine Schicht. Ein Konflikt ist
         sie trotzdem, und der Kalender darf nicht weniger zeigen als
         Planung und Uebersicht. */
      for (const id of betroffen) {
        if (schichten.some((s) => s.zeile.mitarbeiterId === id)) continue;
        const m = D.mitarbeiter.find((x) => x.id === id);
        liste.push({
          art: "konflikt", marke: "warnung", titel: m ? m.name : id,
          zusatz: gruendeVon(id).join(" · ") + " · ohne Uhrzeit",
          ziel: "planung", tag: isoTag
        });
      }
    }

    /* --- Abwesenheiten. Nur die Tatsache, nie der Grund. --- */
    /* --- Abwesenheiten. Nur die Tatsache, nie der Grund.

           Der Klick fuehrt zum KONKRETEN Vorgang, nicht in den
           Bereich "Fahrer & Fahrzeuge". Vorher oeffneten "Krank" und
           "Urlaub" beide dieselbe Seite - der Nutzer musste den
           Vorgang selbst suchen. --- */
    if (R.darf(["planung.read", "krankheit.read"])) {
      D.mitarbeiter.forEach((m) => {
        const a = D.abwesenheitFuer(m.id, isoTag);
        const eintrag = a.wirksam || a.beantragt;
        if (!eintrag) return;
        const art = a.wirksam ? a.wirksam.art : "urlaub";
        /* Nur die Vorgaenge, die ich auch oeffnen darf - sonst
           verspricht der Eintrag einen Sprung, den er nicht halten
           kann. */
        const alleTreffer = D.vorgaengeZuAbwesenheit(m.id, isoTag, art);
        const treffer = window.ProbeVorgaenge.sichtbareZuAbwesenheit(m.id, isoTag, art);
        liste.push({
          art: "abwesenheit",
          marke: art === "krank" ? "warnung" : "ruhig",
          titel: m.name,
          zusatz: a.wirksam
            ? D.ABWESENHEIT_NAMEN[art]
            : "Urlaub beantragt",
          /* Genau ein Vorgang: direkt oeffnen. Mehrere: Auswahl, nicht
             raten. Keiner: ehrlicher Hinweis statt Sprung auf eine
             beliebige Seite. */
          ziel: treffer.length === 1
            ? "meldungen:vorgang-" + treffer[0].id
            : treffer.length > 1
              ? "meldungen:auswahl-" + m.id + "-" + art + "-" + isoTag
              : "",
          /*
            Zwei verschiedene Gruende, zwei verschiedene Hinweise. Ein
            Vorgang, den es gibt und den ich nicht sehen darf, ist
            nicht dasselbe wie keiner - und "gibt es nicht" waere
            hier unwahr.
          */
          leerhinweis: treffer.length ? "" : (alleTreffer.length
            ? "Zu diesem Eintrag gibt es einen Vorgang, für den Ihnen die Berechtigung fehlt."
            : (art === "krank"
              ? "Zu dieser Krankmeldung gibt es in der Designprobe keinen Vorgang."
              : "Zu diesem Urlaub gibt es in der Designprobe keinen Vorgang."))
        });
      });
    }

    /* --- Fahrzeugtermine. --- */
    /* --- Fahrzeugtermine.

           Der Klick oeffnet die Akte DES Fahrzeugs, nicht die
           Gesamtuebersicht. Verknuepft wird ueber die stabile
           Fahrzeugkennung, nicht ueber das Kennzeichen - ein
           Kennzeichen kann wechseln. --- */
    if (R.darf("fleet.read")) {
      const TERMINE = [
        ["tuev", "TÜV fällig", "warnung"],
        ["service", "Service fällig", "ruhig"],
        ["versicherung", "Versicherung läuft ab", "ruhig"]
      ];
      D.fahrzeuge.forEach((f) => {
        for (const [feld, text, marke] of TERMINE) {
          if (f[feld] !== isoTag) continue;
          liste.push({
            art: "fahrzeug", marke,
            titel: f.name + " · " + f.kennzeichen,
            zusatz: text + " · " + D.FAHRZEUG_ZUSTAENDE[f.zustand]
              + (f.sperrgrund ? " · " + f.sperrgrund : ""),
            /*
              Stabile Kennung, nicht das Kennzeichen - und der
              KALENDERTAG dazu. Ohne ihn zeigte die Fahrzeugakte
              Angaben, die zu einem anderen Tag gehoerten, und
              widersprach sich selbst.
            */
            ziel: f.id ? "team:fahrzeug-" + f.id + "-" + feld + "-" + isoTag : "",
            leerhinweis: f.id ? "" : "Zu diesem Termin fehlt die Fahrzeugkennung."
          });
        }
      });
    }

    /* --- Dokumentfristen. Art und Frist, kein Aktenauszug. --- */
    /* Dokumentfristen - Personalstammdaten. */
    if (R.darf("personal.read")) {
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

  /*
    Jede Kategorie nennt die Faehigkeit, die sie WIRKLICH braucht.

    Vorher hingen Fahrten, Schichten und Konflikte alle an
    "operations.read" - wer die Planung sehen durfte, sah damit
    zwangslaeufig auch die Fahrten. Das war der Punkt, den der
    Geschaeftsfuehrer getrennt haben wollte.

    Schichten und Konflikte gehoeren zur PLANUNG: Ein Konflikt ist
    ein Widerspruch im Schichtplan, keine Eigenschaft einer Fahrt.

    "Abwesenheiten" braucht Planungssicht ODER Krankheitssicht: Die
    Planung muss wissen, dass jemand ausfaellt, um planen zu
    koennen; der GRUND ist die vertrauliche Angabe und haengt an
    krankheit.read - gepruefr wird er am Vorgang, nicht hier.

    "Dokumentfristen" sind Fuehrerschein und Personenbefoerderungs-
    schein, also Personalstammdaten - nicht Krankheit.
  */
  const ARTEN = [
    { id: "fahrt",       name: "Fahrten",         braucht: "fahrten.read" },
    { id: "schicht",     name: "Schichten",       braucht: "planung.read" },
    { id: "konflikt",    name: "Konflikte",       braucht: "planung.read" },
    { id: "abwesenheit", name: "Abwesenheiten",   braucht: ["planung.read", "krankheit.read"] },
    { id: "fahrzeug",    name: "Fahrzeuge",       braucht: "fleet.read" },
    { id: "dokument",    name: "Dokumentfristen", braucht: "personal.read" }
  ];

  /* Sind alle sichtbaren Kategorien eingeschaltet? */
  const alleAn = (sichtbar) => sichtbar.every((a) => Boolean(stand.arten[a.id]));

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
          ${window.ProbeDatum.markup({ kennung: "kalender", teil: "tag",
            wert: b, beschriftung: "Angezeigtes Datum",
            fehler: stand.datumFehler })}</label>
      </div>
      ${sichtbar.length ? `<div class="filterzeile" role="group" aria-label="Anzeige einschränken">
        ${sichtbar.map((a) => {
          const an = Boolean(stand.arten[a.id]);
          const allein = an && sichtbar.every((x) => Boolean(stand.arten[x.id]) === (x.id === a.id));
          return `<button class="filterchip" type="button"
            data-tun="kal-art:${h(a.id)}" aria-pressed="${an}"
            aria-label="${h(a.name)} — ${allein ? "zeigt gerade nur diese Kategorie, Klick zeigt wieder alle" : "Klick zeigt nur diese Kategorie"}">
            ${h(a.name)}</button>`;
        }).join("")}
      </div>` : ""}
      ${sichtbar.length ? `<p class="schritt-hinweis">${alleAn(sichtbar)
        ? "Alle Kategorien sind sichtbar. Ein Klick auf eine Kategorie zeigt nur diese."
        : `Eingeschränkt auf <strong>${h(sichtbar.filter((a) => stand.arten[a.id]).map((a) => a.name).join(", "))}</strong>.
           Noch ein Klick auf dieselbe Kategorie zeigt wieder alle.`}</p>` : ""}
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
            ${e.ziel
              ? `<button class="knopf klein" type="button"
                  data-tun="kal-ziel:${h(e.ziel)}|${h(e.tag || b)}">Öffnen</button>`
              /* Kein Ziel heisst: es gibt keinen Vorgang dazu. Dann
                 wird das gesagt und nicht auf eine beliebige Seite
                 gesprungen. */
              : `<span class="kal-kein-ziel">${h(e.leerhinweis || "Kein zugehöriger Vorgang.")}</span>`}
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
      case "kal-art": {
        /*
          Reiner Anzeigefilter - er veraendert keine Daten.

          GEMESSENER AUSGANGSFEHLER: Jeder Klick schaltete GENAU EINE
          Kategorie um. Wer nur die Abwesenheiten sehen wollte, musste
          fuenf andere Filter einzeln ausschalten - sechs Klicks fuer
          einen Wunsch.

          Jetzt: Ein Klick waehlt diese Kategorie ALLEIN aus. Ein
          zweiter Klick auf dieselbe Kategorie fuehrt zu "alle"
          zurueck. Damit sind beide haeufigen Absichten je ein Klick,
          und man kann sich nicht aus Versehen in einen Zustand
          klicken, in dem nichts mehr zu sehen ist.

          Geprueft wird gegen die SICHTBAREN Kategorien, nicht gegen
          alle: Wer die Dokumentfristen nicht sehen darf, soll mit
          einem zweiten Klick nicht in einen Zustand geraten, in dem
          eine unsichtbare Kategorie eingeschaltet ist.
        */
        if (!ARTEN.some((a) => a.id === wert)) return;
        const sichtbar = ARTEN.filter((a) => R.darf(a.braucht)).map((a) => a.id);
        if (!sichtbar.includes(wert)) return;
        const nurDieser = sichtbar.every((id) => stand.arten[id] === (id === wert));
        for (const id of sichtbar) stand.arten[id] = nurDieser ? true : id === wert;
        R.zeichnen();
        return;
      }
      case "kal-ziel": {
        const [ziel, tag] = wert.split("|");
        /* Das Ziel darf einen Zusatz tragen - "fahrten:offen" fuehrt
           in genau die Liste, deren Zahl im Kalender stand. */
        const [bereich, zusatz] = ziel.split(":");
        /* Die Planung uebernimmt den gewaehlten Tag, damit der Klick
           nicht in einer anderen Woche landet. */
        if (bereich === "planung" && tag) R.zustand.planDatum = tag;
        if (zusatz) {
          if (bereich === "fahrten") R.zustand.fahrtFilter = zusatz;
          else if (window.ProbeBereiche.sprungziel) {
            window.ProbeBereiche.sprungziel(bereich, zusatz);
          }
        }
        /*
          Die Herkunft festhalten, BEVOR der Bereich wechselt.

          Gemessener Fehler: Vorher stand hier nur R.geheZu(bereich).
          Der Vorgang war der richtige, aber beim Schliessen landete
          man in "Meldungen" beziehungsweise "Fahrer & Fahrzeuge".

          Festgehalten wird alles, was den Kalenderzustand ausmacht:
          Ansicht, Datum, Filter und Position. Die Filter werden
          KOPIERT - ein Verweis auf stand.arten wuerde spaetere
          Aenderungen mitnehmen und waere damit kein Zustand, sondern
          nur ein Zeiger.
        */
        const sicherung = {
          sicht: stand.sicht,
          datum: stand.datum,
          arten: Object.assign({}, stand.arten),
          datumFehler: stand.datumFehler || ""
        };
        const lage = R.scrollJetzt();
        R.geheZuMitHerkunft(bereich, {
          bereich: "kalender",
          name: "Kalender",
          scroll: lage.scroll,
          scrollHaupt: lage.scrollHaupt,
          wiederherstellen() {
            stand.sicht = sicherung.sicht;
            stand.datum = sicherung.datum;
            stand.arten = Object.assign({}, sicherung.arten);
            stand.datumFehler = sicherung.datumFehler;
          }
        });
        return;
      }
      default:
    }
  }

  function geaendert() {
    /* Dieses Modul hat nur ein Eingabefeld, und das ist das Datum.
       Es laeuft ueber das gemeinsame Datumsmodul - siehe datum(). */
    return false;
  }

  /*
    Das Datum des Kalenders aus dem gemeinsamen Datumsmodul.
    Gibt true zurueck, wenn die Kennung diesem Modul gehoert - sonst
    darf die naechste Stelle gefragt werden.
  */
  function datum(kennung, teil, ergebnis) {
    if (kennung !== "kalender") return false;
    stand.datumFehler = ergebnis.fehler;
    /* Ein leeres Feld bedeutet nicht "kein Kalender" - der Kalender
       braucht immer einen Tag. Das zuletzt gueltige Datum bleibt
       deshalb stehen. */
    if (ergebnis.gueltig) stand.datum = ergebnis.iso;
    R.zeichnen();
    return true;
  }

  window.ProbeKalender = { zeichne, tun, geaendert, datum, anmelden, stand };
})();
