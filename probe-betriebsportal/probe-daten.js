/* ============================================================
   Designprobe Betriebsportal - Testdaten
   ============================================================
   ALLE Daten hier sind offensichtlich fiktiv und als solche benannt:
   "Testkunde 01", "Testfahrer 01", "GER-TEST 001". Es gibt keine
   erfundenen Personennamen, keine erfundenen Telefonnummern und keine
   Gesundheitsangaben - das war ein ausdruecklicher Befund am Bestand.

   Diese Datei spricht mit nichts. Kein Supabase, kein fetch, kein
   Upload, keine E-Mail, keine PAJ-Anfrage.
   ============================================================ */
(() => {
  "use strict";

  const heute = new Date();
  const tagAls = (versatz) => {
    const d = new Date(heute);
    d.setDate(d.getDate() + versatz);
    return d;
  };
  /*
    Datum als JJJJ-MM-TT - aus den OERTLICHEN Feldern, nicht ueber
    toISOString(). Letzteres rechnet nach UTC: In Mitteleuropa ist
    oertlich Mitternacht schon der Vortag in UTC, und ein aus
    "2026-09-30T00:00:00" gebautes Datum ergab dann "2026-09-29".
    Beim Rechnen mit Folgetagen hat genau das einen Konflikt
    verschluckt.
  */
  const alsIso = (d) => {
    const jahr = d.getFullYear();
    const monat = String(d.getMonth() + 1).padStart(2, "0");
    const tag = String(d.getDate()).padStart(2, "0");
    return `${jahr}-${monat}-${tag}`;
  };

  /* Ein Datum als Text, n Tage zurueck. Steht hier oben, weil die
     Testdaten es brauchen - weiter unten waere es eine Ladefalle:
     const faellt erst beim Laden auf, und dann laedt die ganze Datei
     nicht mehr. */
  const tageZurueck = (n) => {
    const d = new Date(heute);
    d.setDate(d.getDate() - n);
    return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  };
  const alsText = (d) => d.toLocaleDateString("de-DE", {
    weekday: "long", day: "2-digit", month: "2-digit", year: "numeric"
  });

  /* ---- Mitarbeiter ---- */
  const mitarbeiter = [
    { id: "M01", name: "Testfahrer 01", beschaeftigung: "Vollzeit",  telefon: "Testnummer 01" },
    { id: "M02", name: "Testfahrer 02", beschaeftigung: "Teilzeit",  telefon: "Testnummer 02" },
    { id: "M03", name: "Testfahrer 03", beschaeftigung: "Aushilfe",  telefon: "Testnummer 03" },
    { id: "M04", name: "Testfahrer 04", beschaeftigung: "Vollzeit",  telefon: "Testnummer 04" },
    { id: "M05", name: "Testfahrer 05", beschaeftigung: "Vollzeit",  telefon: "Testnummer 05" },
    { id: "M06", name: "Testfahrer 06", beschaeftigung: "Teilzeit",  telefon: "Testnummer 06" }
  ];

  /* ---- Fahrzeuge ----
     "zustand" ist der gepflegte Grundzustand des Fahrzeugs:
       verfuegbar - einsatzbereit
       werkstatt  - in Reparatur oder Wartung
       gesperrt   - darf nicht eingesetzt werden
     Ob ein Fahrzeug gerade ZUGEWIESEN oder UNTERWEGS ist, wird nicht
     hier gespeichert, sondern aus Tagesplan und Fahrten abgeleitet.
     Sonst haette man zwei Wahrheiten, die auseinanderlaufen. */
  const fahrzeuge = [
    { id: "F01", name: "Testwagen 01", kennzeichen: "GER-TEST 001", art: "Kombi",     plaetze: 4, rollstuhl: false, zustand: "verfuegbar",
      km: 128400, tuev: alsIso(tagAls(120)), versicherung: alsIso(tagAls(210)), service: alsIso(tagAls(18)), sperrgrund: "" },
    { id: "F02", name: "Testwagen 02", kennzeichen: "GER-TEST 002", art: "Van",       plaetze: 8, rollstuhl: true,  zustand: "verfuegbar",
      km: 96250,  tuev: alsIso(tagAls(21)),  versicherung: alsIso(tagAls(95)),  service: alsIso(tagAls(60)), sperrgrund: "" },
    { id: "F03", name: "Testwagen 03", kennzeichen: "GER-TEST 003", art: "Limousine", plaetze: 4, rollstuhl: false, zustand: "verfuegbar",
      km: 54800,  tuev: alsIso(tagAls(300)), versicherung: alsIso(tagAls(150)), service: alsIso(tagAls(120)), sperrgrund: "" },
    { id: "F04", name: "Testwagen 04", kennzeichen: "GER-TEST 004", art: "Kombi",     plaetze: 4, rollstuhl: false, zustand: "werkstatt",
      km: 201300, tuev: alsIso(tagAls(-9)),  versicherung: alsIso(tagAls(40)),  service: alsIso(tagAls(-30)), sperrgrund: "" },
    { id: "F05", name: "Testwagen 05", kennzeichen: "GER-TEST 005", art: "Van",       plaetze: 8, rollstuhl: true,  zustand: "gesperrt",
      km: 173900, tuev: alsIso(tagAls(75)),  versicherung: alsIso(tagAls(75)),  service: alsIso(tagAls(45)),
      sperrgrund: "Unfallschaden, Gutachten steht aus" }
  ];

  /*
    "Fahrten heute" - eine Definition fuer alle Ansichten.

    Enthalten sind ALLE Fahrten des Tages, auch stornierte. Eine
    stornierte Fahrt ist am Tag passiert und gehoert in die
    Tagesmenge; wer nur die aktiven sehen will, filtert. Vorher hat
    die Uebersicht sie herausgerechnet und damit 9 statt 10 gezeigt.

    In der Probe gibt es nur den laufenden Tag. Sobald Fahrten ein
    Datum tragen, kommt hier der Tagesvergleich hinein - an EINER
    Stelle.
  */
  const fahrtenHeute = () => fahrten.slice();

  /*
    "Noch nicht zugewiesen" - eine Definition.

    Eine Fahrt ist nicht zugewiesen, wenn sie im Eingang oder
    ungeplant ist UND kein Fahrer darauf steht. Der Zustand allein
    genuegt nicht: Eine ungeplante Fahrt mit Fahrer waere sonst
    mitgezaehlt.

    Vorher rechnete die Uebersicht "ungeplant + eingang" und sprang
    dann in den Filter "ungeplant" - die Karte sagte 4, die Liste
    zeigte 2.
  */
  const NICHT_ZUGEWIESEN_ZUSTAENDE = ["eingang", "ungeplant"];
  const istNichtZugewiesen = (f) =>
    NICHT_ZUGEWIESEN_ZUSTAENDE.includes(f.zustand) && !f.fahrerId;
  const nichtZugewiesen = () => fahrtenHeute().filter(istNichtZugewiesen);

  /*
    Chronologische Sortierung einer Fahrtenliste.

    Aufsteigend nach Abholzeit. Fahrten OHNE gueltige Zeit werden
    nicht zwischen Uhrzeiten eingeordnet, sondern hinten angestellt -
    die Ansicht zeigt sie in einem eigenen Abschnitt. Bei gleicher
    Uhrzeit entscheidet die Vorgangsnummer; damit ist die Reihenfolge
    stabil und nicht von der Eingabereihenfolge abhaengig.
  */
  const ZEITMUSTER = /^([01]\d|2[0-3]):[0-5]\d$/;
  const hatZeit = (f) => ZEITMUSTER.test(String(f.zeit || "").trim());
  const nachZeit = (liste) => liste.slice().sort((a, b) => {
    const az = hatZeit(a);
    const bz = hatZeit(b);
    if (az !== bz) return az ? -1 : 1;
    if (az && a.zeit !== b.zeit) return a.zeit < b.zeit ? -1 : 1;
    return String(a.id).localeCompare(String(b.id), "de");
  });
  /* Nur die mit Zeit, nur die ohne - fuer die getrennten Abschnitte. */
  const mitZeit = (liste) => nachZeit(liste.filter(hatZeit));
  const ohneZeit = (liste) => nachZeit(liste.filter((f) => !hatZeit(f)));

  const FAHRZEUG_ZUSTAENDE = {
    verfuegbar:  "Frei",
    zugewiesen:  "Zugewiesen",
    unterwegs:   "Unterwegs",
    werkstatt:   "Werkstatt",
    gesperrt:    "Gesperrt"
  };

  /* Nur "verfuegbar" darf eingeplant werden. Werkstatt und Sperre sind
     harte Gruende - sie werden nie stillschweigend uebergangen. */
  const istEinsatzbereit = (f) => Boolean(f) && f.zustand === "verfuegbar";

  /* ---- Fahrerdokumente ----
     Nur betrieblich notwendige Nachweise. Keine Gesundheitsangaben,
     keine Personalakteninhalte. */
  const fahrerDokumente = [
    { mitarbeiterId: "M01", art: "Führerschein",                  bis: alsIso(tagAls(400)) },
    { mitarbeiterId: "M01", art: "Personenbeförderungsschein",    bis: alsIso(tagAls(260)) },
    { mitarbeiterId: "M02", art: "Führerschein",                  bis: alsIso(tagAls(14)) },
    { mitarbeiterId: "M02", art: "Personenbeförderungsschein",    bis: alsIso(tagAls(180)) },
    { mitarbeiterId: "M03", art: "Führerschein",                  bis: alsIso(tagAls(520)) },
    { mitarbeiterId: "M03", art: "Personenbeförderungsschein",    bis: alsIso(tagAls(-5)) },
    { mitarbeiterId: "M04", art: "Führerschein",                  bis: alsIso(tagAls(700)) },
    { mitarbeiterId: "M04", art: "Personenbeförderungsschein",    bis: alsIso(tagAls(340)) },
    { mitarbeiterId: "M05", art: "Führerschein",                  bis: alsIso(tagAls(90)) },
    { mitarbeiterId: "M05", art: "Personenbeförderungsschein",    bis: alsIso(tagAls(25)) },
    { mitarbeiterId: "M06", art: "Führerschein",                  bis: alsIso(tagAls(610)) }
    /* M06 fehlt der Personenbefoerderungsschein - das ist der Fall
       "Dokument fehlt". */
  ];

  const DOKUMENT_PFLICHT = ["Führerschein", "Personenbeförderungsschein"];

  /*
    Dokumentstand eines Fahrers: fehlt / abgelaufen / laeuft bald ab /
    gueltig. "Bald" heisst hier 30 Tage - das ist eine Annahme der
    Designprobe und keine Geschaeftsregel.
  */
  function dokumentstand(mitarbeiterId) {
    const heuteIso = alsIso(heute);
    const grenze = alsIso(tagAls(30));
    const eigene = fahrerDokumente.filter((d) => d.mitarbeiterId === mitarbeiterId);
    const eintraege = DOKUMENT_PFLICHT.map((art) => {
      const d = eigene.find((x) => x.art === art);
      if (!d) return { art, bis: "", lage: "fehlt" };
      if (d.bis < heuteIso) return { art, bis: d.bis, lage: "abgelaufen" };
      if (d.bis <= grenze) return { art, bis: d.bis, lage: "laeuft-ab" };
      return { art, bis: d.bis, lage: "gueltig" };
    });
    const schlimmste = eintraege.find((x) => x.lage === "fehlt")
      || eintraege.find((x) => x.lage === "abgelaufen")
      || eintraege.find((x) => x.lage === "laeuft-ab")
      || null;
    return { eintraege, warnung: schlimmste };
  }

  const DOKUMENT_LAGE = {
    "fehlt": "Dokument fehlt",
    "abgelaufen": "abgelaufen",
    "laeuft-ab": "läuft bald ab",
    "gueltig": "gültig"
  };

  /* ---- Protokollvorschau ----
     Was spaeter mitgeschrieben wuerde. Bewusst OHNE Passwoerter,
     Tokens, medizinische Inhalte und Lohnbetraege. In der Designprobe
     lebt diese Liste nur in der laufenden Sitzung. */
  const protokoll = [
    { zeit: "gestern 17:42", datum: "gestern", wer: "Testleitung 01 – Administration",
      kennung: "U-ADM-01", rolle: "Administration", betrifft: "Testwagen 04",
      was: "Zustand geändert", vorher: "Frei", nachher: "Werkstatt", grund: "Bremsen prüfen" },
    { zeit: "gestern 16:10", datum: "gestern", wer: "Testdisposition 01 – Disposition",
      kennung: "U-DIS-01", rolle: "Disposition", betrifft: "Testfahrer 01",
      was: "Fahrzeug zugewiesen", vorher: "kein Fahrzeug", nachher: "GER-TEST 001", grund: "" }
  ].map((x) => Object.freeze(x));

  /*
    Ein geschriebener Protokolleintrag wird nicht mehr angefasst.
    Object.freeze macht das nicht nur zur Absprache, sondern zur
    Eigenschaft des Eintrags: Ein spaeterer Schreibversuch laeuft ins
    Leere. Eine Korrektur ist ein NEUER Vorgang mit eigenem Grund und
    eigenem Eintrag.
  */
  function protokollieren(eintrag) {
    /* Wer gehandelt hat, steht als Person MIT Kennung und Rolle im
       Eintrag - nie nur als Rollenname. Datum und Uhrzeit kommen
       immer dazu. */
    const konto = window.ProbeRahmen ? window.ProbeRahmen.benutzer() : null;
    const jetzt = new Date();
    const fertig = Object.freeze({
      wer: konto ? konto.name + " – " + konto.rolle : "unbekannt",
      kennung: konto ? konto.kennung : "",
      rolle: konto ? konto.rolle : "",
      datum: jetzt.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }),
      zeit: jetzt.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) + " Uhr",
      grund: "",
      ...eintrag
    });
    protokoll.unshift(fertig);
    if (protokoll.length > 40) protokoll.pop();
    return fertig;
  }

  const letzteAenderung = (betrifft) =>
    protokoll.find((p) => p.betrifft === betrifft) || null;

  /* ---- Lohnabrechnungen der Designprobe ----
     Keine echten Dateien, keine Betraege. Nur Monat, Jahr, Version und
     wer sie bereitgestellt hat. */
  const lohnProbe = [
    { id: "LP01", mitarbeiterId: "M01", monat: "08", jahr: "2026", version: 1,
      datei: "Testdatei-M01-08-2026.pdf", von: "Personal", am: "02.09.2026 09:14 Uhr", grund: "" },
    { id: "LP02", mitarbeiterId: "M01", monat: "07", jahr: "2026", version: 2,
      datei: "Testdatei-M01-07-2026-v2.pdf", von: "Personal", am: "05.08.2026 11:02 Uhr",
      grund: "Korrektur der Stundenzahl" },
    { id: "LP03", mitarbeiterId: "M02", monat: "08", jahr: "2026", version: 1,
      datei: "Testdatei-M02-08-2026.pdf", von: "Administration", am: "02.09.2026 09:20 Uhr", grund: "" }
  ];

  /* ---- Schichtvorlagen. Uhrzeit steht immer dabei. ---- */
  const vorlagen = [
    { id: "frueh",       name: "Frühschicht", von: "06:00", bis: "14:00" },
    { id: "tag",         name: "Tagschicht",  von: "09:00", bis: "17:00" },
    { id: "spaet",       name: "Spätschicht", von: "14:00", bis: "22:00" },
    { id: "nacht",       name: "Nachtschicht", von: "22:00", bis: "06:00" },
    { id: "individuell", name: "Individuell", von: "",      bis: "" }
  ];

  /* ---- Abwesenheiten ----
     Krankmeldungen und Urlaub. Sie werden NIE von der Planung
     veraendert - die Planung liest sie nur. Zugeordnet wird ueber
     Mitarbeiterkennung und Datum, nie ueber eine Listenstelle oder
     einen angezeigten Namen.

     Wirksam fuer die Planung sind:
       - jede Krankmeldung
       - Urlaub NUR im Zustand "genehmigt"
     Beantragter Urlaub ist ein Hinweis und sperrt nicht. Abgelehnter
     und stornierter Urlaub wirkt gar nicht.

     Hier werden bewusst KEINE Diagnosen oder Krankheitsgruende
     gefuehrt - die gehoeren nicht in die Planung. */
  const abwesenheiten = [
    /* Krank heute und die beiden Folgetage. */
    { id: "AB01", mitarbeiterId: "M02", art: "krank", status: "gemeldet",
      von: alsIso(heute), bis: alsIso(tagAls(2)) },

    /* Genehmigter Urlaub heute und morgen. */
    { id: "AB02", mitarbeiterId: "M06", art: "urlaub", status: "genehmigt",
      von: alsIso(tagAls(-1)), bis: alsIso(tagAls(1)) },

    /* Nur beantragt - der Fahrer bleibt planbar. */
    { id: "AB03", mitarbeiterId: "M04", art: "urlaub", status: "beantragt",
      von: alsIso(tagAls(1)), bis: alsIso(tagAls(3)) },

    /* Abgelehnt - ohne jede Wirkung. */
    { id: "AB04", mitarbeiterId: "M05", art: "urlaub", status: "abgelehnt",
      von: alsIso(heute), bis: alsIso(heute) },

    /* Storniert - ebenfalls ohne Wirkung. */
    { id: "AB05", mitarbeiterId: "M01", art: "urlaub", status: "storniert",
      von: alsIso(heute), bis: alsIso(heute) },

    /* Widerspruch fuer MORGEN: krank UND genehmigter Urlaub am selben
       Tag. Das ist ein Datenkonflikt und muss die Veroeffentlichung
       sperren. */
    { id: "AB06", mitarbeiterId: "M03", art: "krank", status: "gemeldet",
      von: alsIso(tagAls(1)), bis: alsIso(tagAls(1)) },
    { id: "AB07", mitarbeiterId: "M03", art: "urlaub", status: "genehmigt",
      von: alsIso(tagAls(1)), bis: alsIso(tagAls(2)) }
  ];

  /*
    Moegliche Ergebnisse einer Dokumentpruefung. Bewusst eine feste
    Liste statt eines freien Feldes: Ein freies Feld wuerde frueher
    oder spaeter eine Diagnose aufnehmen. Keines dieser Ergebnisse
    nennt einen medizinischen Grund.
  */
  /*
    Jedes Ergebnis hat eine festgelegte Folge. Diese vier und ihre
    Wirkung sind eine Vorgabe des Geschaeftsfuehrers vom 01.10.2026,
    keine Annahme der Designprobe.

    Der vierte Fall - "falsche Person oder falscher Vorgang" - war
    zwischenzeitlich entfernt, weil fuer ihn keine Regel vorlag.
    Inzwischen liegt sie vor, deshalb steht er wieder hier. Seine
    Folge ist die aufwendigste: Der Nachweis wird gesperrt, aber
    weder geloescht noch von selbst umgehaengt. Eine Neuzuordnung
    treffen ausschliesslich Personal oder Administration,
    zweistufig und mit Pflichtgrund.
  */
  const PRUEFERGEBNISSE = [
    {
      id: "ok", name: "Alles in Ordnung", lage: "gut",
      folge: "abschliessbar",
      erklaerung: "Die Personalprüfung darf abgeschlossen werden."
    },
    {
      id: "zeitraum", name: "Zeitraum weicht ab", lage: "warnung",
      folge: "rueckfrage",
      erklaerung: "Die Personalprüfung bleibt offen. Es entsteht eine Rückfrage zum abweichenden Zeitraum. Abgeschlossen werden darf erst nach der Klärung."
    },
    {
      id: "unleserlich", name: "Nicht lesbar oder unvollständig", lage: "warnung",
      folge: "anforderung",
      erklaerung: "Die Personalprüfung bleibt offen. Es wird eine neue Bescheinigung angefordert. Abgeschlossen werden darf erst nach Eingang und Prüfung der neuen Datei."
    },
    {
      id: "person", name: "Falsche Person oder falscher Vorgang", lage: "warnung",
      folge: "zuordnung",
      erklaerung: "Die Personalprüfung bleibt offen. Der Nachweis wird als „Zuordnung ungeklärt“ markiert und darf nicht als geprüft gelten. Es entsteht eine Klärungsaufgabe für Personal oder Administration."
    }
  ];

  /*
    Die Teilschritte eines Krankheitsvorgangs - als Fabrik, nicht als
    gemeinsames Objekt. Jeder Vorgang braucht seine EIGENEN Zustaende;
    ein geteiltes Objekt waere eine zweite Wahrheit.

    "erfordert: bescheinigung" ist die Pruefsperre: ohne Einsicht und
    Ergebnis kein Abschluss. Sie gehoert an jeden solchen Vorgang,
    auch an die nachtraeglich angelegten.
  */
  const krankheitsTeile = () => ({
    planung: {
      name: "Planung", zustand: "offen",
      braucht: ["operations.write"],
      aktion: "Planung bearbeitet",
      schritte: "Planung geprüft · Ersatz erforderlich · Ersatz organisiert",
      verantwortlich: null, letzter: null, vertraulich: false
    },
    personal: {
      name: "Personalprüfung", zustand: "offen",
      /* Die Personalpruefung IST die Dokumentpruefung - sie verlangt
         deshalb die engste Faehigkeit, nicht blosse Stammdatensicht. */
      braucht: ["dokument.pruefen"],
      aktion: "Dokumentprüfung abgeschlossen",
      erfordert: "bescheinigung",
      schritte: "Bescheinigung eingegangen · Dokument geprüft · Zeitraum geprüft",
      verantwortlich: null, letzter: null, vertraulich: true
    }
  });

  const KLAERUNG_NAMEN = {
    rueckfrage:  "Rückfrage zum Zeitraum",
    anforderung: "Neue Bescheinigung angefordert",
    zuordnung:   "Zuordnung ungeklärt"
  };

  const ABWESENHEIT_NAMEN = {
    krank: "Krank",
    urlaub: "Urlaub"
  };

  const imZeitraum = (iso, von, bis) => iso >= von && iso <= bis;

  /*
    Welche Vorgaenge gehoeren zu dieser Abwesenheit?

    Gesucht wird ueber die MITARBEITERKENNUNG und den Zeitraum, nicht
    ueber den Namen - ein Name ist keine Kennung. Ein Vorgang passt,
    wenn er dieselbe Person betrifft, zum Thema gehoert und sein
    gemeldeter Zeitraum den Tag umfasst.

    Erledigte Vorgaenge zaehlen mit: Wer im Kalender auf eine
    abgeschlossene Krankmeldung klickt, will sie ansehen.
  */
  function vorgaengeZuAbwesenheit(mitarbeiterId, iso, art) {
    const thema = art === "krank" ? "krankheit" : "urlaub";
    return vorgaenge.filter((v) => v.thema === thema
      && v.betrifft && v.betrifft.id === mitarbeiterId
      && v.daten && v.daten.von && v.daten.bis
      && imZeitraum(iso, v.daten.von, v.daten.bis));
  }

  /*
    Was gilt fuer EINE Schichtzeile an EINEM Tag?

    Rueckgabe:
      status    "dienst" | "frei" | "krank" | "urlaub"
      hatZeit   steht ueberhaupt eine Zeit drin?
      gueltig   zaehlt das als normale Schicht?
      konflikt  wenn nicht: was ist der Befund, im Klartext?
      ausnahme  bewusst trotz Abwesenheit eingeplant?

    Gueltig ist eine Schicht nur, wenn eine Zeit steht UND der
    Mitarbeiter wirksam im Dienst ist. Eine bestaetigte Ausnahme
    ("trotz Abwesenheit eingeplant") gilt als Dienst - sie ist eine
    Entscheidung, die jemand getroffen und begruendet hat.

    Eine Schicht, die nicht gueltig ist, verschwindet NICHT. Sie wird
    als Konflikt benannt. Stilles Weglassen waere genauso falsch wie
    stilles Mitzaehlen.
  */
  /* Dieselben Namen wie in der Planung - eine Benennung. */
  const STATUS_IM_KALENDER = {
    dienst: "Im Dienst", frei: "Frei", krank: "Krank", urlaub: "Urlaub"
  };

  function schichtbefund(zeile, iso) {
    const zeit = Boolean(zeile && zeile.von && zeile.bis);
    const abw = abwesenheitFuer(zeile.mitarbeiterId, iso);
    const ausnahme = Boolean(zeile.ausnahme);
    const status = abw.wirksam && !ausnahme
      ? abw.wirksam.art
      : (zeile.imDienst ? "dienst" : "frei");

    if (!zeit) {
      return { status, hatZeit: false, gueltig: false, ausnahme, konflikt: "" };
    }
    if (status === "dienst") {
      return {
        status, hatZeit: true, gueltig: true, ausnahme,
        konflikt: ausnahme
          ? "Trotz Abwesenheit eingeplant – bestätigte Ausnahme"
          : ""
      };
    }
    /* Zeit steht, Dienst nicht. Das ist ein Befund, keine Schicht. */
    const text = {
      krank:  "Ungültige Schicht – Mitarbeiter ist krank",
      urlaub: "Ungültige Schicht – Mitarbeiter hat genehmigten Urlaub",
      frei:   "Schicht vorhanden, Mitarbeiter steht auf Frei"
    };
    return {
      status, hatZeit: true, gueltig: false, ausnahme,
      konflikt: text[status] || "Ungültige Schicht"
    };
  }

  /*
    Die Schichten eines Tages, bewertet. Liest den GESPEICHERTEN Plan
    und fasst keinen Entwurf an - der Kalender darf die Planung nicht
    umschalten.
  */
  function schichtenAmTag(iso) {
    const plan = planung[iso];
    if (!plan) return [];
    return plan.zeilen
      .map((z) => {
        const m = mitarbeiter.find((x) => x.id === z.mitarbeiterId);
        const f = z.fahrzeugId ? fahrzeuge.find((x) => x.id === z.fahrzeugId) : null;
        return { zeile: z, mitarbeiter: m, fahrzeug: f, befund: schichtbefund(z, iso) };
      })
      /* Nur Zeilen, die ueberhaupt etwas zu sagen haben: eine Zeit
         oder einen Befund. Eine leere Zeile ist keine Schicht und
         kein Konflikt. */
      .filter((x) => x.befund.hatZeit)
      .sort((a, b) => String(a.zeile.von).localeCompare(String(b.zeile.von)));
  }

  /* ============================================================
     EINE TAGESWAHRHEIT
     ============================================================
     GEMESSENE AUSGANGSFEHLER des manuellen Rundgangs - alle vier aus
     derselben Wurzel:

     2. Die Uebersicht zeigte vier Fahrer im Dienst, die Planung drei.
        Sie zaehlte plan.zeilen.filter(z => z.imDienst) - also das rohe
        Kennzeichen aus dem gespeicherten Plan, ohne die Abwesenheit zu
        fragen. Der kranke Testfahrer 02 hatte noch eine alte Schicht
        im Plan und wurde mitgezaehlt.

     3. Der Konfliktzaehler der Planung zeigte drei, der Filter
        darunter vier Zeilen. Der Zaehler nahm die Anzahl der
        KONFLIKTEINTRAEGE, der Filter die Anzahl der BETROFFENEN
        ZEILEN - und ein doppelt vergebenes Fahrzeug nennt in EINEM
        Eintrag ZWEI Fahrer.

     4. Die Fahrerkarte zeigte fuer den kranken Testfahrer 02
        "Testwagen 02", die Planung "kein Fahrzeug", die Fahrzeugkarte
        "frei". Die Fahrerkarte las z.fahrzeugId direkt, ohne zu
        fragen, ob die Person an diesem Tag ueberhaupt faehrt.

     5. Der Kalender zeigte nur einen Konflikt. Er leitete sie aus
        schichtbefund() ab - und das bewertet eine EINZELNE Zeile. Ein
        doppelt vergebenes Fahrzeug und ein Fahrer ohne Fahrzeug sind
        aber Befunde, die mehrere Zeilen beziehungsweise den Tag als
        Ganzes betreffen. Sie konnten dort gar nicht auffallen.

     Deshalb steht die Tageswahrheit jetzt HIER, einmal:

       tagesstatusAm(iso, zeile)   Im Dienst, Frei, Krank, Urlaub
       arbeitetAm(iso, zeile)      faehrt die Person an diesem Tag?
       fahrzeugAktiv(iso, zeile)   das WIRKSAM zugewiesene Fahrzeug
       imDienstAm(iso)             die Zeilen, die wirklich fahren
       konflikteFuer(iso, zeilen)  die Konflikte des Tages
       konfliktZeilen(liste)       die betroffenen Kennungen

     Planung, Fahrerkarte, Fahrzeugkarte, Uebersicht, Kalender und
     Meldungen fragen alle diese Funktionen. Die Planung uebergibt
     dabei ihren ENTWURF, die uebrigen den gespeicherten Plan - die
     Regeln sind dieselben, nur die Zeilen verschieden.
  */

  /* Der Tagesstatus einer Planzeile. Eine begruendete Ausnahme zaehlt
     als Dienst - das ist eine bestehende fachliche Entscheidung. */
  function tagesstatusAm(iso, zeile) {
    const abw = abwesenheitFuer(zeile.mitarbeiterId, iso);
    if (abw.wirksam && !zeile.ausnahme) return abw.wirksam.art;
    return zeile.imDienst ? "dienst" : "frei";
  }

  const arbeitetAm = (iso, zeile) => tagesstatusAm(iso, zeile) === "dienst";

  /*
    Das WIRKSAM zugewiesene Fahrzeug einer Zeile.

    Wer an diesem Tag nicht faehrt, belegt kein Fahrzeug - auch wenn in
    der Zeile noch eine alte Kennung steht. Genau daraus entstand der
    Widerspruch "Fahrerkarte: Testwagen 02 / Fahrzeugkarte: frei".
  */
  function fahrzeugAktiv(iso, zeile) {
    if (!zeile || !zeile.fahrzeugId) return null;
    if (!arbeitetAm(iso, zeile)) return null;
    return fahrzeuge.find((f) => f.id === zeile.fahrzeugId) || null;
  }

  /* Die Zeilen eines Tages - aus dem gespeicherten Plan. */
  const planzeilenAm = (iso) => (planung[iso] ? planung[iso].zeilen : []);

  /* Wer faehrt an diesem Tag wirklich? */
  const imDienstAm = (iso, zeilen) =>
    (zeilen || planzeilenAm(iso)).filter((z) => arbeitetAm(iso, z));

  /* ---- Zeitrechnung fuer die Fahrzeugpruefung ---- */
  function minutenVon(zeit) {
    if (!zeit || !/^\d{2}:\d{2}$/.test(zeit)) return null;
    const [s, m] = zeit.split(":").map(Number);
    return s * 60 + m;
  }
  /* Eine Schicht ueber Mitternacht wird in zwei Stuecke zerlegt. */
  function abschnitteVon(von, bis) {
    const a = minutenVon(von);
    const b = minutenVon(bis);
    if (a === null || b === null) return [];
    if (b > a) return [[a, b]];
    /* Gleiche Anfangs- und Endzeit: ein Augenblick, aber ein belegtes
       Fahrzeug. Ohne diese Zeile wuerden zwei solche Schichten am
       selben Fahrzeug nicht als Konflikt auffallen. */
    if (b === a) return [[a, a + 1]];
    return [[a, 1440], [0, b]];
  }
  const ueberschneidetSich = (x, y) =>
    abschnitteVon(x.von, x.bis).some(([a1, b1]) =>
      abschnitteVon(y.von, y.bis).some(([a2, b2]) => a1 < b2 && a2 < b1));

  /* Deckt die Abwesenheit die Schicht nur teilweise ab? Bei einer
     Nachtschicht faellt der Teil nach Mitternacht auf den Folgetag. */
  function nurTeilweise(iso, zeile, abw) {
    if (!abw || !abw.wirksam) return false;
    if (!zeile.von || !zeile.bis) return false;
    if (!(minutenVon(zeile.bis) !== null && minutenVon(zeile.von) !== null
      && minutenVon(zeile.bis) < minutenVon(zeile.von))) return false;
    const folgetag = alsIso(new Date(new Date(iso + "T00:00:00").getTime() + 86400000));
    return !(folgetag >= abw.wirksam.von && folgetag <= abw.wirksam.bis);
  }

  /*
    DIE KONFLIKTE EINES TAGES.

    `zeilen` ist entweder der gespeicherte Plan oder ein Entwurf der
    Planung; `zeitfehler` sind die Eingabefehler des Entwurfs und
    bleiben beim gespeicherten Plan leer.

    Zwei Arten, weil sie verschieden schwer wiegen:
      "technisch"   - die Daten sind nicht verwendbar.
      "betrieblich" - fachlich unguenstig, aber entscheidbar.

    Jeder Eintrag nennt die betroffene Kennung, ein doppelt vergebenes
    Fahrzeug zwei. Wer ZEILEN zaehlen will, nimmt konfliktZeilen().
  */
  function konflikteFuer(iso, zeilen, zeitfehler) {
    const reihen = zeilen || planzeilenAm(iso);
    const fehler = zeitfehler || {};
    const liste = [];
    const tagText = alsText(new Date(iso + "T00:00:00"));
    const fahrend = reihen.filter((z) => arbeitetAm(iso, z));
    const mVon = (id) => mitarbeiter.find((x) => x.id === id) || null;
    const fVon = (id) => fahrzeuge.find((x) => x.id === id) || null;

    for (const z of reihen) {
      const m = mVon(z.mitarbeiterId);
      const name = m ? m.name : z.mitarbeiterId;

      if (!m) {
        liste.push({
          art: "technisch", kennung: z.mitarbeiterId, kurz: "Mitarbeiter unbekannt",
          text: `Zu der Kennung ${z.mitarbeiterId} gibt es keinen Mitarbeiterdatensatz.`
        });
        continue;
      }
      const abw = abwesenheitFuer(z.mitarbeiterId, iso);

      if (abw.widerspruch) {
        liste.push({
          art: "technisch", kennung: z.mitarbeiterId, kurz: "Krank und Urlaub zugleich",
          text: `${name} ist am ${tagText} gleichzeitig krank gemeldet und im genehmigten Urlaub. Diese beiden Angaben widersprechen sich.`
        });
        continue;
      }

      if (abw.wirksam) {
        const artName = abw.wirksam.art === "krank" ? "krank gemeldet" : "im genehmigten Urlaub";
        const schicht = z.von && z.bis ? `${z.von}–${z.bis}` : "ohne Zeit";
        const fz = z.fahrzeugId ? fVon(z.fahrzeugId) : null;
        if (z.ausnahme) {
          liste.push({
            art: "betrieblich", kennung: z.mitarbeiterId,
            kurz: abw.wirksam.art === "krank" ? "Krank, trotzdem im Dienst" : "Urlaub, trotzdem im Dienst",
            text: `${name} ist am ${tagText} ${artName} (${zeitraumText(abw.wirksam)}), ist aber für ${schicht}${fz ? ` mit ${fz.kennzeichen}` : ""} eingeplant.`,
            ausnahme: z.ausnahme.grund
          });
        } else if (z.imDienst || z.von || z.bis || z.fahrzeugId) {
          liste.push({
            art: "betrieblich", kennung: z.mitarbeiterId,
            kurz: "Abwesend, Schicht noch im Plan",
            text: `${name} ist am ${tagText} ${artName} (${zeitraumText(abw.wirksam)}), im Plan steht aber noch ${schicht}${fz ? ` mit ${fz.kennzeichen}` : ""}. Diese Schicht ist nicht aktiv — bitte auf „${ABWESENHEIT_NAMEN[abw.wirksam.art]}“ setzen oder eine Ausnahme begründen.`
          });
        }
      }

      if (nurTeilweise(iso, z, abw)) {
        liste.push({
          art: "betrieblich", kennung: z.mitarbeiterId, kurz: "Abwesenheit deckt nur einen Teil",
          text: `${name}: Die Schicht ${z.von}–${z.bis} geht über Mitternacht hinaus, die eingetragene Abwesenheit endet aber am ${tagText}.`
        });
      }

      /*
        Zeit steht, Dienst nicht - und keine Abwesenheit, die das
        erklaert. Das ist ein Befund, keine Schicht.

        Diese Regel stand vorher ausschliesslich in schichtbefund()
        und war damit nur im Kalender wirksam. Der bestehende Lauf
        probe-kalenderwege hat genau diese Luecke gefunden, als der
        Kalender auf den zentralen Bestand umgestellt wurde.
      */
      if (!abw.wirksam && !arbeitetAm(iso, z) && z.von && z.bis) {
        liste.push({
          art: "betrieblich", kennung: z.mitarbeiterId,
          kurz: "Schicht im Plan, Mitarbeiter steht auf Frei",
          text: `${name}: Für ${z.von}–${z.bis} steht eine Schicht im Plan, ${name} steht an diesem Tag aber auf Frei.`
        });
      }

      if (!arbeitetAm(iso, z)) continue;

      if (fehler[z.mitarbeiterId]) {
        liste.push({
          art: "technisch", kennung: z.mitarbeiterId, kurz: "Uhrzeit ungültig",
          text: `${name}: ${fehler[z.mitarbeiterId]}`
        });
        continue;
      }
      if (!z.von || !z.bis || minutenVon(z.von) === null || minutenVon(z.bis) === null) {
        liste.push({
          art: "technisch", kennung: z.mitarbeiterId, kurz: "Uhrzeit unvollständig",
          text: `${name}: Die individuelle Uhrzeit ist unvollständig.`
        });
        continue;
      }
      if (z.fahrzeugId && !fVon(z.fahrzeugId)) {
        liste.push({
          art: "technisch", kennung: z.mitarbeiterId, kurz: "Fahrzeug unbekannt",
          text: `${name}: Die Fahrzeugkennung ${z.fahrzeugId} gehört zu keinem Fahrzeug.`
        });
        continue;
      }
      if (!z.fahrzeugId) {
        liste.push({
          art: "betrieblich", kennung: z.mitarbeiterId, kurz: "kein Fahrzeug",
          text: `${name} ist im Dienst, aber es wurde kein Fahrzeug zugewiesen.`
        });
        continue;
      }
      const fz = fVon(z.fahrzeugId);
      if (fz.zustand !== "verfuegbar") {
        liste.push({
          art: "betrieblich", kennung: z.mitarbeiterId, kurz: "Fahrzeug nicht verfügbar",
          text: `${name} soll ${fz.name} · ${fz.kennzeichen} fahren, das Fahrzeug steht aber in der Werkstatt.`
        });
      }
    }

    /* Dasselbe Fahrzeug zur selben Zeit. Nur unter den Fahrenden -
       wer krank ist, belegt kein Fahrzeug. */
    for (let i = 0; i < fahrend.length; i += 1) {
      for (let j = i + 1; j < fahrend.length; j += 1) {
        const a = fahrend[i];
        const b = fahrend[j];
        if (!a.fahrzeugId || a.fahrzeugId !== b.fahrzeugId) continue;
        if (!ueberschneidetSich(a, b)) continue;
        const fz = fVon(a.fahrzeugId);
        const na = mVon(a.mitarbeiterId);
        const nb = mVon(b.mitarbeiterId);
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

  /*
    Die betroffenen Kennungen eines Konfliktbestandes.

    Gemessener Fehler: Der Zaehler "Nur Konflikte" nahm die Anzahl der
    EINTRAEGE, der Filter zeigte ZEILEN. Ein doppelt vergebenes
    Fahrzeug nennt in einem Eintrag zwei Fahrer - daher drei gegen
    vier. Wer Zeilen filtert, muss Zeilen zaehlen.
  */
  function konfliktZeilen(liste) {
    const menge = new Set();
    for (const k of liste) {
      menge.add(k.kennung);
      if (k.zweiteKennung) menge.add(k.zweiteKennung);
    }
    return menge;
  }

  /* Alle Eintraege eines Mitarbeiters an einem Tag. */
  const abwesenheitenAmTag = (mitarbeiterId, iso) =>
    abwesenheiten.filter((a) => a.mitarbeiterId === mitarbeiterId && imZeitraum(iso, a.von, a.bis));

  const istWirksam = (a) => a.art === "krank" || (a.art === "urlaub" && a.status === "genehmigt");

  /*
    Was gilt fuer diesen Mitarbeiter an diesem Tag?
    Krankheit hat Vorrang vor Urlaub. Liegt beides wirksam vor, wird
    das zusaetzlich als Widerspruch gemeldet.
  */
  function abwesenheitFuer(mitarbeiterId, iso) {
    const alle = abwesenheitenAmTag(mitarbeiterId, iso);
    const wirksame = alle.filter(istWirksam);
    const krank = wirksame.find((a) => a.art === "krank") || null;
    const urlaub = wirksame.find((a) => a.art === "urlaub") || null;
    const beantragt = alle.find((a) => a.art === "urlaub" && a.status === "beantragt") || null;

    return {
      /* Was den Tagesstatus bestimmt - Krankheit vor Urlaub. */
      wirksam: krank || urlaub || null,
      krank,
      urlaub,
      beantragt,
      widerspruch: Boolean(krank && urlaub),
      alle
    };
  }

  const zeitraumText = (a) => {
    if (!a) return "";
    const fmt = (iso) => new Date(iso + "T00:00:00").toLocaleDateString("de-DE",
      { day: "2-digit", month: "2-digit", year: "numeric" });
    return a.von === a.bis ? fmt(a.von) : `${fmt(a.von)} bis ${fmt(a.bis)}`;
  };

  /* ---- Planung. Heute teils geplant, morgen noch offen. ---- */
  const planung = {
    [alsIso(heute)]: {
      veroeffentlicht: true,
      veroeffentlichtUm: "07:12",
      geaendertSeitdem: false,
      zeilen: [
        { mitarbeiterId: "M01", imDienst: true,  vorlage: "frueh", von: "06:00", bis: "14:00", fahrzeugId: "F01" },
        { mitarbeiterId: "M02", imDienst: true,  vorlage: "tag",   von: "09:00", bis: "17:00", fahrzeugId: "F02" },
        { mitarbeiterId: "M03", imDienst: true,  vorlage: "spaet", von: "14:00", bis: "22:00", fahrzeugId: null },
        { mitarbeiterId: "M04", imDienst: false, vorlage: null,    von: "",      bis: "",      fahrzeugId: null },
        { mitarbeiterId: "M05", imDienst: true,  vorlage: "frueh", von: "06:00", bis: "14:00", fahrzeugId: "F01" },
        { mitarbeiterId: "M06", imDienst: false, vorlage: null,    von: "",      bis: "",      fahrzeugId: null }
      ]
    },
    [alsIso(tagAls(1))]: {
      veroeffentlicht: false,
      veroeffentlichtUm: null,
      geaendertSeitdem: false,
      zeilen: [
        { mitarbeiterId: "M01", imDienst: true,  vorlage: "tag",   von: "09:00", bis: "17:00", fahrzeugId: "F01" },
        { mitarbeiterId: "M02", imDienst: false, vorlage: null,    von: "",      bis: "",      fahrzeugId: null },
        { mitarbeiterId: "M03", imDienst: true,  vorlage: "nacht", von: "22:00", bis: "06:00", fahrzeugId: "F03" },
        { mitarbeiterId: "M04", imDienst: true,  vorlage: "frueh", von: "06:00", bis: "14:00", fahrzeugId: null },
        { mitarbeiterId: "M05", imDienst: false, vorlage: null,    von: "",      bis: "",      fahrzeugId: null },
        { mitarbeiterId: "M06", imDienst: false, vorlage: null,    von: "",      bis: "",      fahrzeugId: null }
      ]
    }
  };

  /* ---- Fahrten. Nur Testkunden, keine Gesundheitsangaben. ---- */
  const fahrten = [
    { id: "FA-0001", leistung: "normal", zustand: "eingang",      zeit: "10:40", kunde: "Testkunde 01", von: "Teststrasse 1, Germersheim", nach: "Testziel A", fahrerId: null,  fahrzeugId: null,  kundeId: "K0001", fahrgast: "", hinweis: "über Telefon aufgenommen" },
    /* Diese Anfrage hat KEINE geklaerte Abholzeit. Sie darf nicht
       zwischen Uhrzeiten einsortiert werden - sonst behauptet die
       Liste eine Reihenfolge, die es nicht gibt. */
    { id: "FA-0002", leistung: "", zustand: "eingang",      zeit: "",      kunde: "Gastfahrt",    von: "Testplatz 2, Germersheim",   nach: "Testziel B", fahrerId: null,  fahrzeugId: null,  kundeId: "", fahrgast: "", hinweis: "Rückfrage zur Uhrzeit offen" },
    { id: "FA-0003", leistung: "normal", zustand: "ungeplant",    zeit: "12:00", kunde: "Testkunde 02", von: "Testweg 3",                  nach: "Testziel C", fahrerId: null,  fahrzeugId: null,  kundeId: "K0002", fahrgast: "", hinweis: "" },
    { id: "FA-0004", leistung: "flughafen", zustand: "ungeplant",    zeit: "12:30", kunde: "Testkunde 03", von: "Testallee 4",                nach: "Testziel A", fahrerId: null,  fahrzeugId: null,  kundeId: "K0003", fahrgast: "", hinweis: "8 Plätze nötig" },
    { id: "FA-0005", leistung: "serie", zustand: "geplant",      zeit: "13:00", kunde: "Testkunde 01", von: "Teststrasse 1",              nach: "Testziel D", fahrerId: "M02", fahrzeugId: "F02", kundeId: "K0001", fahrgast: "", hinweis: "" },
    { id: "FA-0006", leistung: "normal", zustand: "geplant",      zeit: "13:20", kunde: "Testkunde 04", von: "Testring 5",                 nach: "Testziel B", fahrerId: "M03", fahrzeugId: "F03", kundeId: "K0004", fahrgast: "Testfahrgast Werk 2", hinweis: "" },
    { id: "FA-0007", leistung: "kranken", zustand: "unterwegs",    zeit: "09:50", kunde: "Testkunde 02", von: "Testweg 3",                  nach: "Testziel C", fahrerId: "M01", fahrzeugId: "F01", kundeId: "K0002", fahrgast: "", hinweis: "" },
    { id: "FA-0008", leistung: "normal", zustand: "abgeschlossen",zeit: "08:10", kunde: "Testkunde 05", von: "Testplatz 2",                nach: "Testziel A", fahrerId: "M05", fahrzeugId: "F01", kundeId: "K0005", fahrgast: "", hinweis: "" },
    { id: "FA-0009", leistung: "normal", zustand: "storniert",    zeit: "08:40", kunde: "Testkunde 03", von: "Testallee 4",                nach: "Testziel D", fahrerId: null,  fahrzeugId: null,  kundeId: "K0003", fahrgast: "", hinweis: "Kunde hat abgesagt" },
    { id: "FA-0010", leistung: "normal", zustand: "klaerung",     zeit: "14:00", kunde: "Testkunde 06", von: "Testort 6",                  nach: "Testziel E", fahrerId: null,  fahrzeugId: null,  kundeId: "K0006", fahrgast: "", hinweis: "Adresse unvollständig" }
  ];

  const fahrtZustaende = [
    { id: "eingang",       name: "Eingang" },
    { id: "ungeplant",     name: "Ungeplant" },
    { id: "geplant",       name: "Geplant" },
    { id: "unterwegs",     name: "Unterwegs" },
    { id: "abgeschlossen", name: "Abgeschlossen" },
    { id: "storniert",     name: "Storniert" },
    { id: "klaerung",      name: "Klärungsbedarf" }
  ];


  /* ============================================================
     Vorgaenge - Meldungen, Aufgaben, Warnungen, Nachrichten
     ============================================================
     Vier Arten in EINER Liste, aber deutlich bezeichnet:

       meldung   - reine Information, noch ohne Arbeitsauftrag
       aufgabe   - braucht eine Entscheidung oder Bearbeitung
       warnung   - entsteht automatisch aus einem kritischen Zustand
       nachricht - von Hand geschriebene betriebliche Mitteilung

     WICHTIG: Warnungen werden NICHT hier gespeichert. Sie entstehen
     aus dem vorhandenen Zustand - Dokumentfristen, Planungskonflikte.
     Sonst gaebe es zwei Wahrheiten. Gespeichert wird nur, wie mit
     ihnen umgegangen wurde (Zustand, Zustaendigkeit, gesehen).

     "sichtbar" sagt, wer den Vorgang ueberhaupt sieht.
     "vertraulich" sagt, wer zusaetzlich die geschuetzten Angaben sieht
     - etwa die eingereichte Bescheinigung. Fehlt die Faehigkeit, wird
     die Datei gar nicht erst in die Ansicht gegeben.
  */
  const VORGANG_ARTEN = {
    meldung:   "Meldung",
    aufgabe:   "Aufgabe",
    warnung:   "Warnung",
    nachricht: "Nachricht"
  };

  const VORGANG_ZUSTAENDE = {
    neu:         "Neu",
    bearbeitung: "In Bearbeitung",
    warten:      "Wartet auf Rückmeldung",
    erledigt:    "Erledigt",
    archiviert:  "Archiviert"
  };

  const VORGANG_THEMEN = {
    urlaub:    "Urlaub",
    krankheit: "Krankheit",
    dokument:  "Dokumente",
    fahrt:     "Fahrten und Kundenanfragen",
    fahrzeug:  "Fahrzeuge",
    finanzen:  "Rechnungen und Zahlungen",
    system:    "Systemwarnungen",
    nachricht: "Betriebliche Nachrichten"
  };

  const vorgaenge = [
    {
      id: "V0001", art: "aufgabe", thema: "urlaub",
      titel: "Neuer Urlaubsantrag – Testfahrer 03",
      betrifft: { art: "mitarbeiter", id: "M03", name: "Testfahrer 03" },
      eingang: "heute 07:48", eingangIso: alsIso(heute), dringlichkeit: "normal",
      zustaendig: "", zustand: "neu", gesehen: false, version: 1,
      ausListe: false, ausListeAm: "", ausListeVon: null,
      sichtbar: ["planung.read", "personal.read", "krankheit.read"],
      vertraulich: [],
      daten: { von: alsIso(tagAls(6)), bis: alsIso(tagAls(12)) },
      empfehlung: "", antwort: "", notizen: []
    },
    {
      id: "V0002", art: "aufgabe", thema: "krankheit",
      titel: "Krankmeldung eingegangen – Testfahrer 02",
      betrifft: { art: "mitarbeiter", id: "M02", name: "Testfahrer 02" },
      eingang: "heute 06:05", eingangIso: alsIso(heute), dringlichkeit: "hoch",
      zustaendig: "", zustand: "neu", gesehen: false, version: 1,
      ausListe: false, ausListeAm: "", ausListeVon: null,
      sichtbar: ["planung.read", "krankheit.read"],
      /* Die Bescheinigung sehen nur Personal und Administration. */
      vertraulich: ["krankheit.read"],
      daten: {
        von: alsIso(heute), bis: alsIso(tagAls(2)),
        /*
          Eine KETTE von Nachweisen, nicht eine Datei.

          Jede eingehende Datei bekommt ihre eigene Nummer, ihre
          eigene Eingangszeit und ihre eigene Pruefung. Eine
          beanstandete Datei wird nie ueberschrieben - sie bleibt
          mit ihrem Ergebnis stehen, und die neue haengt sich
          dahinter. Geprueft wird immer der letzte Eintrag.

          "art" unterscheidet die Erstbescheinigung von einer
          Folgebescheinigung (laengere Krankheit) und von einem
          Ersatz (die vorige wurde beanstandet).
        */
        nachweise: [
          {
            nr: 1, art: "erst", datei: "Testbescheinigung-M02-01.pdf",
            eingang: "heute 06:05", eingangIso: alsIso(heute),
            /* Wer hat sie wann geoeffnet, und mit welchem Ergebnis?
               Beides leer heisst: nicht geprueft. Gespeichert wird
               NUR, DASS geprueft wurde und wie das Ergebnis lautet -
               nie ein Dokumentinhalt und nie eine Diagnose. */
            einsicht: null, ergebnis: "",
            /* Steht das Ergebnis fest, ist es gesperrt. Eine
               Korrektur laeuft dann ueber einen eigenen Vorgang mit
               Pflichtgrund - siehe Regel 5. */
            gesperrt: false, beanstandet: false,
            /* "Zuordnung ungeklaert": Der Nachweis gehoert
               moeglicherweise zu einer anderen Person oder zu einem
               anderen Vorgang. Er darf dann NICHT als geprueft oder
               gueltig verwendet werden, wird aber auch nicht
               geloescht und nicht von selbst umgehaengt.

               "umgezogenNach" haelt fest, wohin eine Neuzuordnung
               gefuehrt hat; der Eintrag bleibt hier als Spur stehen.
               "herkunft" ist die Gegenrichtung im Zielvorgang. */
            zuordnungUngeklaert: false, umgezogenNach: "", herkunft: ""
          }
        ],
        /* Rueckfragen und Anforderungen, die aus einem Pruefergebnis
           entstehen. Sie halten den Teilschritt offen, bis sie
           geklaert sind. */
        klaerungen: []
      },
      /*
        Zwei getrennte Arbeitsschritte. Der manuelle Test hat gezeigt,
        warum: Die Disposition konnte den ganzen Vorgang auf
        "Erledigt" setzen, und danach kam das Personal nicht mehr an
        die Bescheinigung. Jeder Teil hat jetzt seinen eigenen
        Zustand, seinen eigenen Verantwortlichen und seine eigene
        Faehigkeit.
      */
      teile: krankheitsTeile(),
      empfehlung: "", antwort: "", notizen: []
    },
    {
      id: "V0003", art: "aufgabe", thema: "fahrt",
      titel: "Neue Fahrtanfrage von der Webseite",
      betrifft: { art: "fahrt", id: "FA-0001", name: "FA-0001" },
      eingang: "heute 10:40", eingangIso: alsIso(heute), dringlichkeit: "hoch",
      zustaendig: "", zustand: "neu", gesehen: false, version: 1,
      ausListe: false, ausListeAm: "", ausListeVon: null,
      sichtbar: ["fahrten.read", "planung.read"], vertraulich: [],
      daten: { hinweis: "über das Formular aufgenommen" },
      empfehlung: "", antwort: "", notizen: []
    },
    {
      id: "V0004", art: "aufgabe", thema: "fahrt",
      titel: "Kunde bittet um Änderung der Abholzeit",
      betrifft: { art: "fahrt", id: "FA-0005", name: "FA-0005" },
      eingang: "heute 09:20", eingangIso: alsIso(heute), dringlichkeit: "normal",
      zustaendig: "Testdisposition 01 – Disposition", zustand: "bearbeitung", gesehen: true, version: 1,
      ausListe: false, ausListeAm: "", ausListeVon: null,
      sichtbar: ["fahrten.read", "planung.read"], vertraulich: [],
      daten: { hinweis: "Rückruf vereinbart" },
      empfehlung: "", antwort: "", notizen: []
    },
    {
      id: "V0005", art: "nachricht", thema: "nachricht",
      titel: "Betriebsversammlung am Freitag",
      betrifft: { art: "alle", id: "", name: "alle Mitarbeiter" },
      eingang: "gestern 16:30", eingangIso: alsIso(tagAls(-1)), dringlichkeit: "niedrig",
      zustaendig: "Testleitung 01 – Administration", zustand: "erledigt", gesehen: true, version: 1,
      abgeschlossenAm: alsIso(tagAls(-1)), archivAb: alsIso(tagAls(89)),
      ausListe: false, ausListeAm: "", ausListeVon: null,
      sichtbar: ["self.read"], vertraulich: [],
      daten: { text: "Die Betriebsversammlung findet am Freitag um 14:00 Uhr statt." },
      empfehlung: "", antwort: "", notizen: []
    },
    {
      id: "V0006", art: "meldung", thema: "system",
      titel: "PAJ GPS ist nicht angebunden",
      betrifft: { art: "system", id: "", name: "Integration" },
      eingang: "dauerhaft", eingangIso: alsIso(heute), dringlichkeit: "niedrig",
      zustaendig: "", zustand: "neu", gesehen: true, version: 1,
      ausListe: false, ausListeAm: "", ausListeVon: null,
      sichtbar: ["fahrten.read", "planung.read"], vertraulich: [],
      daten: { text: "Es werden keine Positionen angezeigt und keine erfunden." },
      empfehlung: "", antwort: "", notizen: []
    },
    {
      id: "V0007", art: "aufgabe", thema: "urlaub",
      titel: "Urlaubsantrag entschieden – Testfahrer 06",
      betrifft: { art: "mitarbeiter", id: "M06", name: "Testfahrer 06" },
      eingang: "vor 3 Tagen", eingangIso: alsIso(tagAls(-3)), dringlichkeit: "normal",
      zustaendig: "Testpersonal 01 – Personal", zustand: "erledigt", gesehen: true, version: 2,
      abgeschlossenAm: alsIso(tagAls(-3)), archivAb: alsIso(tagAls(87)),
      ausListe: false, ausListeAm: "", ausListeVon: null,
      sichtbar: ["planung.read", "personal.read", "krankheit.read"], vertraulich: [],
      daten: { von: alsIso(tagAls(-1)), bis: alsIso(tagAls(1)), entscheidung: "genehmigt" },
      empfehlung: "Aus Planungssicht möglich",
      antwort: "Ihr Urlaubsantrag wurde genehmigt.",
      notizen: [{ wer: "Personal", text: "Resturlaub reicht aus." }]
    },
    {
      /*
        EIN ZWEITER Krankheitsvorgang DERSELBEN Person.

        Er ist nicht Zierde: Ohne ihn liesse sich der Fall "falsche
        Person ODER falscher Vorgang" nur zur Haelfte pruefen. Eine
        Bescheinigung kann auch zur richtigen Person gehoeren und
        trotzdem am falschen Vorgang haengen - etwa wenn jemand
        zweimal im Monat krank war.
      */
      id: "V0008", art: "aufgabe", thema: "krankheit",
      titel: "Frühere Krankmeldung – Testfahrer 02",
      betrifft: { art: "mitarbeiter", id: "M02", name: "Testfahrer 02" },
      eingang: "vor 10 Tagen", eingangIso: alsIso(tagAls(-10)), dringlichkeit: "normal",
      zustaendig: "", zustand: "bearbeitung", gesehen: true, version: 1,
      ausListe: false, ausListeAm: "", ausListeVon: null,
      sichtbar: ["planung.read", "krankheit.read"],
      vertraulich: ["krankheit.read"],
      daten: {
        von: alsIso(tagAls(-10)), bis: alsIso(tagAls(-8)),
        nachweise: [
          {
            nr: 1, art: "erst", datei: "Testbescheinigung-M02-fr-01.pdf",
            eingang: "vor 10 Tagen", eingangIso: alsIso(tagAls(-10)),
            einsicht: null, ergebnis: "",
            gesperrt: false, beanstandet: false,
            zuordnungUngeklaert: false, umgezogenNach: "", herkunft: ""
          }
        ],
        klaerungen: []
      },
      teile: krankheitsTeile(),
      empfehlung: "", antwort: "", notizen: []
    }
  ];

  /*
    Die Handhabung abgeleiteter Warnungen. Die Warnung selbst entsteht
    jedes Mal neu aus dem Zustand; hier steht nur, was jemand damit
    gemacht hat. So kann beides nicht auseinanderlaufen.
  */
  const warnungsHandhabung = {};

  function vorgangVon(id) {
    return vorgaenge.find((v) => v.id === id) || null;
  }

  let vorgangZaehler = 100;
  function vorgangAnlegen(neu) {
    vorgangZaehler += 1;
    const v = {
      id: "V0" + vorgangZaehler,
      art: "aufgabe", thema: "system", dringlichkeit: "normal",
      zustaendig: "", zustand: "neu", gesehen: false, version: 1,
      ausListe: false, ausListeAm: "", ausListeVon: null,
      sichtbar: ["fahrten.read", "planung.read"], vertraulich: [],
      daten: {}, empfehlung: "", antwort: "", notizen: [],
      teile: null, abgeschlossenAm: "", archivAb: "",
      nachweise: null, klaerungen: null,
      /* Aus der Arbeitsliste genommen? Eine Entscheidung ueber die
         ANSICHT, nicht ueber die Daten. Siehe LISTENSTAENDE in
         probe-vorgaenge.js. */
      ausListe: false, ausListeAm: "", ausListeVon: null,
      einsicht: null, ergebnis: "",
      verantwortlich: null, letzterBearbeiter: null,
      eingangIso: alsIso(heute),
      eingang: new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) + " Uhr",
      ...neu
    };
    vorgaenge.unshift(v);
    return v;
  }

  /* ---- Meldungen. Rollenabhaengig, ohne vertrauliche Inhalte. ---- */
  /* Die frueher hier gefuehrte Liste "meldungen" ist entfallen.
     Seit es "Meldungen & Aufgaben" gibt, waere sie eine zweite
     Wahrheit neben den Vorgaengen gewesen - Uebersicht und Eingang
     haetten verschiedene Zahlen gezeigt. Beide lesen jetzt
     denselben Bestand. */

  /* ---- Personal ---- */
  /*
    Die Personalzusaetze - verknuepft ueber die Mitarbeiterkennung.
    Stammdaten (Name, Beschaeftigung) stehen NICHT hier, sondern nur
    in mitarbeiter[]. Sonst gaebe es zwei Wahrheiten.

    Vertrag, Arbeitszeitmodell und Urlaubsanspruch sind Testwerte der
    Designprobe. Welche Modelle der Betrieb tatsaechlich fuehrt und
    wie viel Urlaub wem zusteht, ist NICHT festgelegt - das steht in
    der Akte auch so da.
  */
  const personalZusatz = {
    /* Das Modell passt zur Beschaeftigung aus mitarbeiter[]. Eine
       Teilzeitkraft mit "Vollzeit 40 Std." waere ein Widerspruch in
       den eigenen Testdaten. */
    M01: { status: "aktiv",  eintritt: "01.01.2025", konto: "verknüpft",
           vertrag: "unbefristet", modell: "Vollzeit · 40 Std./Woche",
           urlaubAnspruch: 28, urlaubGenommen: 9 },
    M02: { status: "krank",  eintritt: "01.03.2025", konto: "verknüpft",
           vertrag: "unbefristet", modell: "Teilzeit · 25 Std./Woche",
           urlaubAnspruch: 20, urlaubGenommen: 4 },
    M03: { status: "aktiv",  eintritt: "15.04.2025", konto: "verknüpft",
           vertrag: "befristet bis 31.12.2026", modell: "Aushilfe · auf Abruf",
           urlaubAnspruch: 10, urlaubGenommen: 6 },
    M04: { status: "aktiv",  eintritt: "01.06.2025", konto: "verknüpft",
           vertrag: "unbefristet", modell: "Vollzeit · 40 Std./Woche",
           urlaubAnspruch: 28, urlaubGenommen: 0 },
    M05: { status: "aktiv",  eintritt: "01.08.2025", konto: "verknüpft",
           vertrag: "unbefristet", modell: "Vollzeit · 40 Std./Woche",
           urlaubAnspruch: 28, urlaubGenommen: 2 },
    M06: { status: "Urlaub", eintritt: "01.10.2025", konto: "nicht verknüpft",
           vertrag: "unbefristet", modell: "Teilzeit · 30 Std./Woche",
           urlaubAnspruch: 22, urlaubGenommen: 15 }
  };

  /* Der Aenderungsverlauf je Mitarbeiter. */
  const personalVerlauf = {};

  /*
    EINE Sicht auf einen Mitarbeiter: Stammdaten aus mitarbeiter[],
    Zusaetze aus personalZusatz, Dokumente und Abwesenheiten aus den
    gemeinsamen Listen. "Fahrer & Fahrzeuge" und "Personal" zeigen
    damit denselben Datensatz.
  */
  function personalVon(id) {
    const m = mitarbeiter.find((x) => x.id === id);
    if (!m) return null;
    const z = personalZusatz[id] || {};
    return {
      ...m,
      status: z.status || "aktiv",
      eintritt: z.eintritt || "",
      konto: z.konto || "nicht verknüpft",
      vertrag: z.vertrag || "",
      modell: z.modell || "",
      urlaubAnspruch: z.urlaubAnspruch,
      urlaubGenommen: z.urlaubGenommen,
      dokumente: fahrerDokumente.filter((d) => d.mitarbeiterId === id),
      dokumentstand: dokumentstand(id),
      abwesenheiten: abwesenheiten.filter((a) => a.mitarbeiterId === id),
      verlauf: personalVerlauf[id] || []
    };
  }

  /* Die Liste - aus derselben Sicht, nicht aus einer zweiten Kopie. */
  const personal = mitarbeiter.map((m) => personalVon(m.id));

  /* ---- Lohnabrechnungen ---- */
  const lohn = [
    { id: "L01", mitarbeiterId: "M01", monat: "08", jahr: "2026", bereitgestellt: "02.09.2026", version: 1 },
    { id: "L02", mitarbeiterId: "M02", monat: "08", jahr: "2026", bereitgestellt: "02.09.2026", version: 1 },
    { id: "L03", mitarbeiterId: "M01", monat: "07", jahr: "2026", bereitgestellt: "03.08.2026", version: 2 }
  ];

  /* ---- Rewards ---- */
  /*
    Rewards.

    Die Stufen, das VIP-Ziel, die Geburtstagspunkte, die Ausschluesse
    und die Gewinne des Gluecksrads sind VORGABEN des
    Geschaeftsfuehrers. Was dort als "offene Geschaeftsentscheidung"
    steht, ist NICHT mit einer Zahl gefuellt - eine erfundene Schwelle
    waere schlimmer als eine fehlende.

    Die Schwellen fuer Silber und Gold standen schon vorher in der
    Probe und bleiben; Bronze ist der Einstieg. Platin ist offen, und
    VIP hat ein Ziel in FAHRTEN, nicht in Punkten.
  */
  const REWARDS_STUFEN = [
    { name: "Bronze", marke: "ruhig", schwelle: "Einstieg, ab 0 Punkten", festgelegt: true },
    { name: "Silber", marke: "ruhig", schwelle: "ab 250 Punkten", festgelegt: true },
    { name: "Gold", marke: "gut", schwelle: "ab 750 Punkten", festgelegt: true },
    { name: "Platin", marke: "aktiv", schwelle: "Schwelle noch nicht festgelegt", festgelegt: false },
    { name: "VIP", marke: "aktiv", schwelle: "100 qualifizierende Fahrten", festgelegt: true }
  ];

  const REWARDS_REGELN = [
    "Punkte je qualifizierender Fahrt: 10",
    "Geburtstag: 200 Bonuspunkte",
    "VIP-Ziel: 100 qualifizierende Fahrten",
    "Gutschein gültig: 90 Tage",
    "Der Gewinn des Glücksrads wird serverseitig bestimmt, nicht im Browser",
    "Ein abgebrochener Dreh vernichtet keinen Anspruch",
    "Eine manuelle Korrektur darf nur die Administration, mit Pflichtgrund"
  ];

  const REWARDS_AUSSCHLUSS = ["Krankenfahrten", "Dialyse", "Flughafenfahrten"];

  const REWARDS_GLUECKSRAD = [
    { gewinn: "5 bis 50 Punkte", gesperrt: false, hinweis: "Spanne vereinbart" },
    { gewinn: "20-Euro-Gutschein", gesperrt: false, hinweis: "90 Tage gültig" },
    { gewinn: "Yumaks Box", gesperrt: true, hinweis: "bis zur fachlichen Freigabe gesperrt" }
  ];

  const rewards = {
    konten: [
      {
        kundeId: "K0001", kunde: "Testkunde 01", punkte: 340, stufe: "Silber",
        drehs: 1, qualifizierteFahrten: 34, geburtstagGutgeschrieben: "2026",
        gutscheine: [
          { was: "20-Euro-Gutschein", bis: "30.12.2026", zustand: "offen" }
        ],
        verlauf: [
          { zeit: "heute 08:02", was: "Dreh abgebrochen", punkte: 0,
            grund: "Anspruch erhalten — ein abgebrochener Dreh vernichtet nichts" },
          { zeit: tageZurueck(3) + " · 10:15 Uhr", was: "Punkte gutgeschrieben", punkte: 10,
            grund: "qualifizierende Fahrt FA-T001" },
          { zeit: tageZurueck(40) + " · 07:00 Uhr", was: "Geburtstagsbonus", punkte: 200,
            grund: "Geburtstag 2026" }
        ]
      },
      {
        kundeId: "K0002", kunde: "Testkunde 02", punkte: 120, stufe: "Bronze",
        drehs: 0, qualifizierteFahrten: 12, geburtstagGutgeschrieben: "",
        gutscheine: [],
        verlauf: [
          { zeit: tageZurueck(1) + " · 16:40 Uhr", was: "Punkte gutgeschrieben", punkte: 10,
            grund: "qualifizierende Fahrt FA-T002" },
          { zeit: tageZurueck(6) + " · 09:05 Uhr", was: "Keine Punkte", punkte: 0,
            grund: "Krankenfahrt — ausgeschlossen" }
        ]
      },
      {
        kundeId: "K0003", kunde: "Testkunde 03", punkte: 810, stufe: "Gold",
        drehs: 2, qualifizierteFahrten: 81, geburtstagGutgeschrieben: "2026",
        gutscheine: [
          { was: "20-Euro-Gutschein", bis: tageZurueck(-20), zustand: "offen" },
          { was: "20-Euro-Gutschein", bis: tageZurueck(30), zustand: "eingelöst" }
        ],
        verlauf: [
          { zeit: "heute 09:14", was: "Dreh eingelöst", punkte: 0,
            grund: "Gewinn: 20-Euro-Gutschein" },
          { zeit: tageZurueck(2) + " · 11:30 Uhr", was: "Keine Punkte", punkte: 0,
            grund: "Fahrt einer ausgeschlossenen Kategorie" },
          { zeit: tageZurueck(9) + " · 08:20 Uhr", was: "Keine Punkte", punkte: 0,
            grund: "Fahrt einer ausgeschlossenen Kategorie" }
        ]
      }
    ],
    /* Die alte Regelliste bleibt als Verweis, damit nichts ins Leere
       zeigt - gezeigt wird REWARDS_REGELN. */
    regeln: REWARDS_REGELN.map((x) => ({ name: x, wert: "" })),
    vorgaenge: []
  };

  /* ---- Kunden ----
     Die ersten sechs haben vollstaendige Stammdaten und eine
     Fahrtenhistorie. Danach werden viele weitere erzeugt, damit sich
     die Suche mit einem grossen Bestand pruefen laesst. Alle Namen sind
     durchnummerierte Testnamen - keine erfundenen Personen.
     Die Vorschlaege aus alten Fahrten nennen NIE einen Behandlungsgrund;
     ein Ziel heisst "Testklinik 01", nicht "Dialyse". */

  const kunden = [
    {
      id: "K0001", name: "Testkunde 01", art: "privat",
      vorname: "Test", nachname: "Kunde 01", firma: "",
      telefon: "Testnummer 0001",
      strasse: "Teststrasse", hausnummer: "1", plz: "76726", ort: "Germersheim",
      email: "testkunde01@example.invalid",
      konto: "verknüpft", fahrten: 12, hinweis: "",
      /* Aenderungen am Kundendatensatz. In der Probe vorbelegt,
         damit die Akte etwas zu zeigen hat. */
      verlauf: [
        { zeit: tageZurueck(30) + " · 09:12 Uhr", wer: "Testleitung 01 – Administration",
          was: "Kunde angelegt", vorher: "—", nachher: "Testkunde 01", grund: "" }
      ],
      letzteFahrten: [
        { datum: tageZurueck(2),  von: "Teststrasse 1, 76726 Germersheim", nach: "Testklinik 01, Speyer" },
        { datum: tageZurueck(9),  von: "Teststrasse 1, 76726 Germersheim", nach: "Testklinik 01, Speyer" },
        { datum: tageZurueck(16), von: "Teststrasse 1, 76726 Germersheim", nach: "Testbahnhof Germersheim" },
        { datum: tageZurueck(23), von: "Teststrasse 1, 76726 Germersheim", nach: "Testklinik 01, Speyer" }
      ]
    },
    {
      id: "K0002", name: "Testkunde 02", art: "privat",
      vorname: "Test", nachname: "Kunde 02", firma: "",
      telefon: "Testnummer 0002",
      strasse: "Testweg", hausnummer: "3", plz: "67360", ort: "Lingenfeld",
      email: "", konto: "nicht verknüpft", fahrten: 3, hinweis: "", verlauf: [],
      letzteFahrten: [
        { datum: tageZurueck(5),  von: "Testweg 3, 67360 Lingenfeld", nach: "Testzentrum Karlsruhe" }
      ]
    },
    {
      id: "K0003", name: "Testkunde 03", art: "privat",
      vorname: "Test", nachname: "Kunde 03", firma: "",
      telefon: "Testnummer 0003",
      strasse: "Testallee", hausnummer: "4a", plz: "76756", ort: "Bellheim",
      email: "testkunde03@example.invalid",
      konto: "verknüpft", fahrten: 27, hinweis: "Rollstuhlfahrzeug erforderlich", verlauf: [],
      letzteFahrten: [
        { datum: tageZurueck(1),  von: "Testallee 4a, 76756 Bellheim", nach: "Testklinik 02, Landau" },
        { datum: tageZurueck(4),  von: "Testallee 4a, 76756 Bellheim", nach: "Testklinik 02, Landau" },
        { datum: tageZurueck(8),  von: "Testallee 4a, 76756 Bellheim", nach: "Testklinik 02, Landau" },
        { datum: tageZurueck(11), von: "Testallee 4a, 76756 Bellheim", nach: "Testhaus Rheinzabern" }
      ]
    },
    {
      id: "K0004", name: "Testfirma 04", art: "firma",
      vorname: "", nachname: "", firma: "Testfirma 04 GmbH",
      /* Zustaendige Person beim Auftraggeber - NICHT der Fahrgast.
         Wer befoerdert wird, steht an der einzelnen Fahrt. */
      ansprechpartner: "Testleitung Fuhrpark", abteilung: "Verwaltung",
      telefon: "Testnummer 0004",
      strasse: "Testring", hausnummer: "5", plz: "76726", ort: "Germersheim",
      email: "buchhaltung@testfirma04.invalid",
      konto: "nicht verknüpft", fahrten: 8, hinweis: "Rechnung monatlich", verlauf: [],
      letzteFahrten: [
        { datum: tageZurueck(3), von: "Testring 5, 76726 Germersheim", nach: "Testflughafen" },
        { datum: tageZurueck(7), von: "Testring 5, 76726 Germersheim", nach: "Testbahnhof Germersheim" }
      ]
    },
    {
      id: "K0005", name: "Testkunde 05", art: "privat",
      vorname: "Test", nachname: "Kunde 05", firma: "",
      telefon: "Testnummer 0005",
      strasse: "Testplatz", hausnummer: "2", plz: "76726", ort: "Germersheim",
      email: "", konto: "verknüpft", fahrten: 5, hinweis: "", verlauf: [],
      letzteFahrten: [
        { datum: tageZurueck(6), von: "Testplatz 2, 76726 Germersheim", nach: "Testziel A" }
      ]
    },
    {
      id: "K0006", name: "Testkunde 06", art: "privat",
      vorname: "Test", nachname: "Kunde 06", firma: "",
      telefon: "Testnummer 0006",
      strasse: "Testort", hausnummer: "6", plz: "76761", ort: "Rülzheim",
      email: "", konto: "nicht verknüpft", fahrten: 1, hinweis: "", verlauf: [],
      letzteFahrten: []
    }
  ];

  /* Viele weitere, damit die Suche mit grossem Bestand pruefbar ist.
     Sie werden NIE alle gezeichnet - die Suche begrenzt auf wenige
     Treffer. */
  const ORTE = [
    ["76726", "Germersheim"], ["67360", "Lingenfeld"], ["76756", "Bellheim"],
    ["76761", "Rülzheim"], ["76767", "Hagenbach"], ["76744", "Wörth am Rhein"]
  ];
  for (let i = 7; i <= 2400; i += 1) {
    const nr = String(i).padStart(4, "0");
    const [plz, ort] = ORTE[i % ORTE.length];
    kunden.push({
      id: `K${nr}`, name: `Testkunde ${nr}`, art: "privat",
      vorname: "Test", nachname: `Kunde ${nr}`, firma: "",
      telefon: `Testnummer ${nr}`,
      strasse: "Teststrasse", hausnummer: String((i % 90) + 1), plz, ort,
      konto: i % 3 === 0 ? "verknüpft" : "nicht verknüpft",
      fahrten: i % 11, hinweis: "", letzteFahrten: []
    });
  }

  const standardadresse = (k) =>
    k && k.strasse ? `${k.strasse} ${k.hausnummer}, ${k.plz} ${k.ort}` : "";

  /* Zuletzt verwendete Kunden - was die Zentrale am haeufigsten braucht. */
  const letzteKunden = ["K0001", "K0003", "K0004", "K0002"]
    .map((id) => kunden.find((k) => k.id === id))
    .filter(Boolean);

  /* Suche mit harter Begrenzung. Die Oberflaeche darf nie den ganzen
     Bestand zeichnen. */
  /*
    Kundensuche. Teiltreffer in Name, Telefonnummer, Firma,
    Ansprechpartner, Abteilung, Anschrift und E-Mail.

    Der manuelle Rundgang hat gezeigt, dass eine Suche nur ueber Name
    und Telefon zu wenig ist: Wer eine Strasse im Kopf hat, findet
    damit nichts.

    Eine KUNDENNUMMER wird nicht mehr gesucht - es gibt keine. Im
    Betrieb wird mit Namen, Telefonnummer und Anschrift gearbeitet.
    Die technische Kennung ist keine Nummer fuer Menschen und wird
    deshalb auch nicht durchsucht: Sonst waere sie ueber die Suche
    doch wieder eine betriebliche Nummer.
  */
  const kundenText = (k) => [
    k.name, k.telefon, k.firma || "",
    k.ansprechpartner || "", k.abteilung || "",
    k.strasse || "", k.hausnummer || "", k.plz || "", k.ort || "",
    k.email || ""
  ].join(" ").toLowerCase();

  /*
    Einen Kunden anlegen - der EINE Weg dafuer.

    Der Fahrtassistent und der Kundenbereich rufen dieselbe Funktion.
    Sonst gaebe es zwei Bestaende: einen im Assistenten angelegten,
    der in der Kundenliste fehlt. Der manuelle Rundgang hat eigens
    danach gefragt.

    "quelle" haelt fest, wo er entstanden ist - nicht als Zierde,
    sondern damit im Verlauf steht, auf welchem Weg.
  */
  /*
    Der Zaehler erzeugt die TECHNISCHE Kennung, nicht eine
    Kundennummer. Sie steht nirgends in der Oberflaeche: Eine Kennung,
    die man dem Kunden nennt, waere eine Kundennummer - und die gibt
    es im Betrieb nicht.
  */
  let kundenZaehler = 9000;
  function kundeAnlegen(neu) {
    kundenZaehler += 1;
    const name = String(neu.name || "").trim();
    const k = {
      id: "K" + kundenZaehler,
      name: name || ("Ohne Namen " + kundenZaehler),
      art: neu.art === "firma" ? "firma" : "privat",
      vorname: "", nachname: "",
      firma: neu.art === "firma" ? name : "",
      ansprechpartner: String(neu.ansprechpartner || "").trim(),
      abteilung: String(neu.abteilung || "").trim(),
      telefon: String(neu.telefon || "").trim(),
      email: String(neu.email || "").trim(),
      strasse: String(neu.strasse || "").trim(),
      hausnummer: String(neu.hausnummer || "").trim(),
      plz: String(neu.plz || "").trim(),
      ort: String(neu.ort || "").trim(),
      konto: "nicht verknüpft",
      fahrten: 0,
      hinweis: String(neu.hinweis || "").trim(),
      letzteFahrten: [],
      /* Nur in der Designprobe entstanden - das wird gezeigt und
         nicht verschwiegen. */
      nurProbe: true,
      quelle: neu.quelle || "",
      verlauf: []
    };
    /* Vorn einfuegen, damit ein neuer Kunde ohne Suche zu sehen ist. */
    kunden.unshift(k);
    return k;
  }

  function kundenSuche(begriff, grenze = 8) {
    /*
      Ab ZWEI Zeichen. Ich hatte diese Grenze beim Ausbau der Suche
      auf Anschrift und E-Mail gestrichen - ohne Grund. Block 8
      verlangte eine Suche beim Tippen und mehr Suchfelder, nicht
      eine niedrigere Schwelle. Bei einem Zeichen traefe die Suche
      einen grossen Teil von ueber zweitausend Eintraegen; das ist
      keine Suche, sondern eine Liste. Vom Prueflauf gefunden.
    */
    const b = String(begriff || "").trim().toLowerCase();
    if (b.length < 2) return { treffer: [], gesamt: 0, zuKurz: true };
    const alle = [];
    for (const k of kunden) {
      if (kundenText(k).includes(b)) {
        alle.push(k);
        if (alle.length > 500) break;
      }
    }
    return { treffer: alle.slice(0, grenze), gesamt: alle.length, zuKurz: false };
  }

  const kundeVon = (id) => kunden.find((k) => k.id === id) || null;

  /*
    Die Fahrten eines Kunden aus dem GEMEINSAMEN Fahrtenbestand -
    nicht aus einer zweiten Liste am Kunden. "letzteFahrten" sind
    Vergangenheitsdaten der Probe; offene Fahrten stehen in fahrten[].

    Verknuepft wird ueber die technische Kennung, NIE ueber den Namen.
    Zwei Kunden koennen gleich heissen; eine Kennung ist eindeutig.
  */
  const fahrtenVonKunde = (k) => k
    ? fahrten.filter((f) => f.kundeId === k.id)
    : [];


  /* Haeufigste Ziele eines Kunden - aus seinen letzten Fahrten gezaehlt. */
  function haeufigeZiele(kunde) {
    if (!kunde || !kunde.letzteFahrten.length) return [];
    const zaehler = new Map();
    for (const f of kunde.letzteFahrten) zaehler.set(f.nach, (zaehler.get(f.nach) || 0) + 1);
    return [...zaehler.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([ziel, anzahl]) => ({ ziel, anzahl }));
  }

  /* ---- Finanzen ---- */
  /*
    Rechnungen. Alle Betraege sind Testwerte der Designprobe.

    "kundeId" ist die belastbare Verknuepfung; der Name steht daneben,
    weil die Oberflaeche ihn zeigt. Welche Steuersaetze, Zahlungsziele
    und Mahnstufen der Betrieb tatsaechlich fuehrt, ist NICHT
    festgelegt - es wird hier auch nichts dazu erfunden.
  */
  const rechnungen = [
    {
      nr: "RE-2026-0001", kundeId: "K0001", kunde: "Testkunde 01",
      zeitraum: "08/2026", betrag: "184,00 €", faellig: "15.09.2026",
      zustand: "bezahlt", version: 1,
      fahrten: ["FA-T101", "FA-T102", "FA-T103"],
      posten: [
        { was: "Krankenfahrt Testklinik 01", menge: 4, einzel: "38,00 €", summe: "152,00 €" },
        { was: "Wartezeit", menge: 2, einzel: "16,00 €", summe: "32,00 €" }
      ],
      zahlungen: [
        { betrag: "184,00 €", datum: "12.09.2026", art: "Überweisung",
          wer: "Testbuchhaltung 01 – Buchhaltung" }
      ],
      verlauf: []
    },
    {
      nr: "RE-2026-0002", kundeId: "K0003", kunde: "Testkunde 03",
      zeitraum: "08/2026", betrag: "412,50 €", faellig: "15.09.2026",
      zustand: "offen", version: 1,
      fahrten: ["FA-T201", "FA-T202"],
      posten: [
        /* Neutrale Positionen. Die Behandlungsart eines Kunden gehoert
           nicht in erfundene Testdaten - auch nicht als Rechnungsposten. */
        { was: "Vertragsfahrt Testklinik 02", menge: 9, einzel: "41,00 €", summe: "369,00 €" },
        { was: "Wartezeitzuschlag", menge: 9, einzel: "4,83 €", summe: "43,50 €" }
      ],
      zahlungen: [],
      verlauf: []
    },
    {
      nr: "RE-2026-0003", kundeId: "K0002", kunde: "Testkunde 02",
      zeitraum: "07/2026", betrag: "96,00 €", faellig: "15.08.2026",
      zustand: "überfällig", version: 1,
      fahrten: ["FA-T301"],
      posten: [
        { was: "Fahrt Testzentrum Karlsruhe", menge: 2, einzel: "48,00 €", summe: "96,00 €" }
      ],
      zahlungen: [],
      verlauf: []
    },
    {
      nr: "RE-2026-0004", kundeId: "K0004", kunde: "Testfirma 04",
      zeitraum: "09/2026", betrag: "—", faellig: "—",
      zustand: "Entwurf", version: 1,
      fahrten: [], posten: [], zahlungen: [], verlauf: []
    }
  ];

  /*
    Rechnungen eines Kunden. Verknuepft wird ausschliesslich ueber die
    technische Kennung.

    Vorher gab es einen Rueckfall auf den Namen. Der ist jetzt weg:
    Ein Name ist keine Verknuepfung. Haengt ein Beleg an keiner
    Kennung, soll er NICHT bei einem gleichnamigen Kunden auftauchen -
    das waere eine erfundene Beziehung.
  */
  const rechnungenVonKunde = (k) => k
    ? rechnungen.filter((r) => r.kundeId === k.id)
    : [];

  /* Das Rewards-Konto eines Kunden, falls es eines gibt. Ebenfalls
     nur ueber die Kennung. */
  const rewardsVonKunde = (k) => k
    ? (rewards.konten.find((x) => x.kundeId === k.id) || null)
    : null;

  /* ---- Analyse. Ausdruecklich simulierte Werte. ---- */
  /*
    Analyse.

    Gemessener Fehler: "Letzte 7 Tage" war ein fester Text, und alle
    Zahlen standen fest daneben. Ein Zeitraum, der nichts aendert,
    behauptet eine Auswertung, die es nicht gibt.

    Jetzt liegen TAGESWERTE vor, und jede Kennzahl wird ueber den
    gewaehlten Bereich SUMMIERT. Damit reagieren alle gemeinsam - nicht
    weil es jemand so programmiert hat, sondern weil sie aus derselben
    Rechnung kommen. Abweichende Zeitraeume sind damit ausgeschlossen.

    Die Tageswerte selbst sind ausdruecklich erfundene Testwerte der
    Designprobe. Es findet keine Besuchermessung statt, es ist kein
    Trackingdienst angebunden, und es wird nichts nach aussen
    gesendet.

    Erzeugt werden sie aus dem Tagesabstand, nicht aus Zufall - sonst
    waere kein Prueflauf moeglich und jede Anzeige eine andere.
  */
  const ANALYSE_EREIGNISSE = [
    { id: "aufrufe",      name: "Seitenaufrufe",                art: "gezaehlt" },
    { id: "besuche",      name: "Besuche",                      art: "gezaehlt" },
    { id: "telefon",      name: "Klick auf Telefonnummer",      art: "gezaehlt" },
    { id: "whatsapp",     name: "Klick auf WhatsApp",           art: "gezaehlt" },
    { id: "regBegonnen",  name: "Registrierung begonnen",       art: "gezaehlt" },
    { id: "regFertig",    name: "Registrierung abgeschlossen",  art: "gezaehlt" },
    { id: "anmeldung",    name: "Anmeldung erfolgreich",        art: "gezaehlt" },
    { id: "rush",         name: "Taxi Rush gestartet",          art: "gezaehlt" },
    { id: "radOffen",     name: "Glücksradseite geöffnet",      art: "gezaehlt" },
    { id: "drehAngefragt", name: "Dreh angefordert",            art: "gezaehlt" },
    { id: "anfrage",      name: "Fahrtanfrage abgeschickt",     art: "gezaehlt" },
    { id: "buchung",      name: "Buchung abgeschlossen",        art: "gezaehlt" }
  ];

  const ANALYSE_SEITEN = ["Startseite", "Flotte", "Rewards", "Hilfe & Kontakt", "Impressum"];

  /* Ein gleichmaessiger, wiederholbarer Wert je Tag und Ereignis. */
  function analyseTagwert(abstand, grund, schwankung) {
    const wochentag = (abstand + 3) % 7;
    const wochenende = wochentag === 5 || wochentag === 6;
    const basis = grund * (wochenende ? 0.6 : 1);
    return Math.max(0, Math.round(basis + (abstand % 5) * schwankung));
  }

  /* 400 Tage Testwerte - genug fuer jeden waehlbaren Zeitraum. */
  const analyseTage = [];
  for (let abstand = 0; abstand < 400; abstand += 1) {
    const d = tagAls(-abstand);
    const tag = { iso: alsIso(d), seiten: {} };
    const grund = {
      aufrufe: 180, besuche: 70, telefon: 9, whatsapp: 6,
      regBegonnen: 3, regFertig: 2, anmeldung: 11, rush: 8,
      radOffen: 5, drehAngefragt: 3, anfrage: 4, buchung: 2
    };
    for (const e of ANALYSE_EREIGNISSE) {
      tag[e.id] = analyseTagwert(abstand, grund[e.id], grund[e.id] / 12);
    }
    ANALYSE_SEITEN.forEach((name, i) => {
      tag.seiten[name] = analyseTagwert(abstand, [74, 27, 20, 14, 6][i], 1);
    });
    analyseTage.push(tag);
  }

  /*
    Die waehlbaren Zeitraeume. "eigen" wird mit zwei Datumsfeldern
    gefuellt; alle anderen rechnen sich aus dem heutigen Tag.
  */
  const ANALYSE_ZEITRAEUME = [
    { id: "heute",        name: "Heute" },
    { id: "gestern",      name: "Gestern" },
    { id: "tage7",        name: "Letzte 7 Tage" },
    { id: "tage30",       name: "Letzte 30 Tage" },
    { id: "monat",        name: "Dieser Monat" },
    { id: "monatVorher",  name: "Letzter Monat" },
    { id: "eigen",        name: "Eigener Zeitraum" }
  ];

  /* Welcher Bereich gehoert zu einer Auswahl? Gibt von/bis als ISO. */
  function analyseBereich(id, eigenVon, eigenBis) {
    const heuteIso = alsIso(heute);
    if (id === "heute") return { von: heuteIso, bis: heuteIso };
    if (id === "gestern") {
      const g = alsIso(tagAls(-1));
      return { von: g, bis: g };
    }
    if (id === "tage7") return { von: alsIso(tagAls(-6)), bis: heuteIso };
    if (id === "tage30") return { von: alsIso(tagAls(-29)), bis: heuteIso };
    if (id === "monat") {
      const erster = new Date(heute.getFullYear(), heute.getMonth(), 1);
      return { von: alsIso(erster), bis: heuteIso };
    }
    if (id === "monatVorher") {
      const erster = new Date(heute.getFullYear(), heute.getMonth() - 1, 1);
      const letzter = new Date(heute.getFullYear(), heute.getMonth(), 0);
      return { von: alsIso(erster), bis: alsIso(letzter) };
    }
    /* eigen */
    if (eigenVon && eigenBis) {
      return eigenBis < eigenVon
        ? { von: eigenBis, bis: eigenVon }
        : { von: eigenVon, bis: eigenBis };
    }
    return { von: "", bis: "" };
  }

  /*
    Die Auswertung eines Bereichs. ALLE Kennzahlen entstehen hier, aus
    denselben Tagen - deshalb koennen sie nicht auseinanderlaufen.

    "besucher" und "wiederkehrend" sind SCHAETZUNGEN aus den Besuchen.
    Das ist keine Nachlaessigkeit: Ein Mensch mit Handy und Rechner
    zaehlt doppelt, wer Speicherfunktionen blockiert gar nicht. Sie
    werden deshalb als Schaetzung gekennzeichnet und nie als gezaehlt
    ausgegeben.
  */
  function analyseAuswertung(von, bis) {
    const tage = (!von || !bis) ? [] : analyseTage.filter((x) => x.iso >= von && x.iso <= bis);
    const summe = (feld) => tage.reduce((s, x) => s + (x[feld] || 0), 0);

    const besuche = summe("besuche");
    const seiten = ANALYSE_SEITEN.map((name) => ({
      name,
      wert: tage.reduce((s, x) => s + (x.seiten[name] || 0), 0)
    })).sort((a, b) => b.wert - a.wert);

    const ereignisse = ANALYSE_EREIGNISSE.map((e) => ({
      id: e.id, name: e.name, art: e.art, wert: summe(e.id)
    }));

    const anfragen = summe("anfrage");
    const buchungen = summe("buchung");

    return {
      tage: tage.length,
      von, bis,
      ereignisse,
      seiten,
      /* Schaetzungen - ausdruecklich als solche. */
      besucherSchaetzung: Math.round(besuche * 0.64),
      wiederkehrendSchaetzung: Math.round(besuche * 0.18),
      /* Konversionen, gerechnet aus gezaehlten Werten. */
      anfragequote: besuche ? Math.round((anfragen / besuche) * 1000) / 10 : 0,
      buchungsquote: anfragen ? Math.round((buchungen / anfragen) * 1000) / 10 : 0,
      registrierquote: summe("regBegonnen")
        ? Math.round((summe("regFertig") / summe("regBegonnen")) * 1000) / 10 : 0
    };
  }

  const analyse = {
    /* Bleibt fuer die alte Ansicht erhalten, wird aber nicht mehr
       gezeigt - die Zahlen kommen aus analyseAuswertung(). */
    zeitraum: "wird gewählt"
  };

  /* ---- Auswahlwerte des Fahrtassistenten ---- */
  const leistungsarten = [
    { id: "normal",    name: "Normalfahrt",   hinweis: "" },
    { id: "kranken",   name: "Krankenfahrt",  hinweis: "Transportschein und Zuzahlung nötig", medizinisch: true },
    { id: "serie",     name: "Serienfahrt",   hinweis: "wiederkehrend", medizinisch: true },
    { id: "flughafen", name: "Flughafen",     hinweis: "Gepäck beachten" }
  ];

  const rollstuhlWerte = [
    { id: "kein",     name: "Kein Rollstuhl",        hinweis: "jedes Fahrzeug möglich" },
    { id: "faltbar",  name: "Faltbarer Rollstuhl",   hinweis: "Fahrgast kann umgesetzt werden" },
    { id: "fahrzeug", name: "Bleibt im Rollstuhl",   hinweis: "Rollstuhlfahrzeug erforderlich" }
  ];

  const gepaeckWerte = [
    { id: "normal",   name: "Kein oder normales Gepäck", hinweis: "" },
    { id: "viel",     name: "Viel Gepäck",               hinweis: "mehrere Koffer" },
    { id: "sperrig",  name: "Sperriges Gepäck",          hinweis: "Rollator, Kinderwagen, Sportgerät" }
  ];

  const scheinWerte = [
    { id: "vorhanden",  name: "Vorhanden" },
    { id: "nachreichen", name: "Wird nachgereicht" },
    { id: "fehlt",      name: "Nicht vorhanden" },
    { id: "unklar",     name: "Noch ungeklärt" }
  ];

  const zuzahlungWerte = [
    { id: "befreit",     name: "Befreit" },
    { id: "nichtbefreit", name: "Nicht befreit" },
    { id: "unklar",      name: "Noch ungeklärt" }
  ];

  /* Die Ueberschrift heisst "Genehmigung der Krankenkasse" - deshalb
     steht das Wort "Genehmigung" hier bewusst in keiner der
     Auswahlmoeglichkeiten mehr. Die Reihenfolge ist vom
     Geschaeftsfuehrer vorgegeben. */
  const genehmigungWerte = [
    { id: "vorhanden",   name: "Vorhanden" },
    { id: "beantragt",   name: "Beantragt" },
    { id: "fehlt",       name: "Nicht vorhanden" },
    { id: "nichtnoetig", name: "Nicht erforderlich" },
    { id: "unklar",      name: "Noch ungeklärt" }
  ];

  window.ProbeDaten = {
    heute, tagAls, alsIso, alsText, tageZurueck,
    mitarbeiter, fahrzeuge, vorlagen, planung,
    fahrten, fahrtZustaende,
    fahrtenHeute, nichtZugewiesen, istNichtZugewiesen,
    NICHT_ZUGEWIESEN_ZUSTAENDE,
    nachZeit, mitZeit, ohneZeit, hatZeit,
    personal, personalVon, personalZusatz, personalVerlauf,
    ANALYSE_ZEITRAEUME, ANALYSE_EREIGNISSE, ANALYSE_SEITEN,
    analyseBereich, analyseAuswertung, analyseTage,
    REWARDS_STUFEN, REWARDS_REGELN, REWARDS_AUSSCHLUSS, REWARDS_GLUECKSRAD,
    lohn, rewards, kunden, rechnungen, analyse,
    standardadresse, letzteKunden, kundenSuche, haeufigeZiele,
    kundeVon, kundeAnlegen, fahrtenVonKunde, rechnungenVonKunde, rewardsVonKunde,
    abwesenheiten, abwesenheitFuer, abwesenheitenAmTag, istWirksam,
    schichtbefund, schichtenAmTag, STATUS_IM_KALENDER,
    /* Die eine Tageswahrheit - siehe Kommentar oben. */
    tagesstatusAm, arbeitetAm, fahrzeugAktiv, planzeilenAm, imDienstAm,
    konflikteFuer, konfliktZeilen, ueberschneidetSich, minutenVon,
    vorgaengeZuAbwesenheit,
    FAHRZEUG_ZUSTAENDE, istEinsatzbereit,
    fahrerDokumente, dokumentstand, DOKUMENT_LAGE, DOKUMENT_PFLICHT,
    protokoll, protokollieren, letzteAenderung, lohnProbe,
    vorgaenge, vorgangVon, vorgangAnlegen, warnungsHandhabung,
    VORGANG_ARTEN, VORGANG_ZUSTAENDE, VORGANG_THEMEN,
    zeitraumText, ABWESENHEIT_NAMEN, PRUEFERGEBNISSE, KLAERUNG_NAMEN,
    krankheitsTeile,
    leistungsarten, rollstuhlWerte, gepaeckWerte,
    scheinWerte, zuzahlungWerte, genehmigungWerte
  };
})();
