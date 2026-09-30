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
    { zeit: "gestern 17:42", wer: "Administration", betrifft: "Testwagen 04",
      was: "Zustand geändert", vorher: "Frei", nachher: "Werkstatt", grund: "Bremsen prüfen" },
    { zeit: "gestern 16:10", wer: "Disposition", betrifft: "Testfahrer 01",
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
    const fertig = Object.freeze({
      zeit: new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) + " Uhr",
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

  const ABWESENHEIT_NAMEN = {
    krank: "Krank",
    urlaub: "Urlaub"
  };

  const imZeitraum = (iso, von, bis) => iso >= von && iso <= bis;

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
    { id: "FA-0001", zustand: "eingang",      zeit: "10:40", kunde: "Testkunde 01", von: "Teststrasse 1, Germersheim", nach: "Testziel A", fahrerId: null,  fahrzeugId: null,  hinweis: "über Telefon aufgenommen" },
    { id: "FA-0002", zustand: "eingang",      zeit: "11:15", kunde: "Gastfahrt",    von: "Testplatz 2, Germersheim",   nach: "Testziel B", fahrerId: null,  fahrzeugId: null,  hinweis: "Rückfrage zur Uhrzeit offen" },
    { id: "FA-0003", zustand: "ungeplant",    zeit: "12:00", kunde: "Testkunde 02", von: "Testweg 3",                  nach: "Testziel C", fahrerId: null,  fahrzeugId: null,  hinweis: "" },
    { id: "FA-0004", zustand: "ungeplant",    zeit: "12:30", kunde: "Testkunde 03", von: "Testallee 4",                nach: "Testziel A", fahrerId: null,  fahrzeugId: null,  hinweis: "8 Plätze nötig" },
    { id: "FA-0005", zustand: "geplant",      zeit: "13:00", kunde: "Testkunde 01", von: "Teststrasse 1",              nach: "Testziel D", fahrerId: "M02", fahrzeugId: "F02", hinweis: "" },
    { id: "FA-0006", zustand: "geplant",      zeit: "13:20", kunde: "Testkunde 04", von: "Testring 5",                 nach: "Testziel B", fahrerId: "M03", fahrzeugId: "F03", hinweis: "" },
    { id: "FA-0007", zustand: "unterwegs",    zeit: "09:50", kunde: "Testkunde 02", von: "Testweg 3",                  nach: "Testziel C", fahrerId: "M01", fahrzeugId: "F01", hinweis: "" },
    { id: "FA-0008", zustand: "abgeschlossen",zeit: "08:10", kunde: "Testkunde 05", von: "Testplatz 2",                nach: "Testziel A", fahrerId: "M05", fahrzeugId: "F01", hinweis: "" },
    { id: "FA-0009", zustand: "storniert",    zeit: "08:40", kunde: "Testkunde 03", von: "Testallee 4",                nach: "Testziel D", fahrerId: null,  fahrzeugId: null,  hinweis: "Kunde hat abgesagt" },
    { id: "FA-0010", zustand: "klaerung",     zeit: "14:00", kunde: "Testkunde 06", von: "Testort 6",                  nach: "Testziel E", fahrerId: null,  fahrzeugId: null,  hinweis: "Adresse unvollständig" }
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
      eingang: "heute 07:48", dringlichkeit: "normal",
      zustaendig: "", zustand: "neu", gesehen: false, version: 1,
      sichtbar: ["operations.read", "personnel.read"],
      vertraulich: [],
      daten: { von: alsIso(tagAls(6)), bis: alsIso(tagAls(12)) },
      empfehlung: "", antwort: "", notizen: []
    },
    {
      id: "V0002", art: "aufgabe", thema: "krankheit",
      titel: "Krankmeldung eingegangen – Testfahrer 02",
      betrifft: { art: "mitarbeiter", id: "M02", name: "Testfahrer 02" },
      eingang: "heute 06:05", dringlichkeit: "hoch",
      zustaendig: "", zustand: "neu", gesehen: false, version: 1,
      sichtbar: ["operations.read", "personnel.read"],
      /* Die Bescheinigung sehen nur Personal und Administration. */
      vertraulich: ["personnel.read"],
      daten: {
        von: alsIso(heute), bis: alsIso(tagAls(2)),
        datei: "Testbescheinigung-M02-01.pdf",
        folge: []
      },
      empfehlung: "", antwort: "", notizen: []
    },
    {
      id: "V0003", art: "aufgabe", thema: "fahrt",
      titel: "Neue Fahrtanfrage von der Webseite",
      betrifft: { art: "fahrt", id: "FA-0001", name: "FA-0001" },
      eingang: "heute 10:40", dringlichkeit: "hoch",
      zustaendig: "", zustand: "neu", gesehen: false, version: 1,
      sichtbar: ["operations.read"], vertraulich: [],
      daten: { hinweis: "über das Formular aufgenommen" },
      empfehlung: "", antwort: "", notizen: []
    },
    {
      id: "V0004", art: "aufgabe", thema: "fahrt",
      titel: "Kunde bittet um Änderung der Abholzeit",
      betrifft: { art: "fahrt", id: "FA-0005", name: "FA-0005" },
      eingang: "heute 09:20", dringlichkeit: "normal",
      zustaendig: "Disposition", zustand: "bearbeitung", gesehen: true, version: 1,
      sichtbar: ["operations.read"], vertraulich: [],
      daten: { hinweis: "Rückruf vereinbart" },
      empfehlung: "", antwort: "", notizen: []
    },
    {
      id: "V0005", art: "nachricht", thema: "nachricht",
      titel: "Betriebsversammlung am Freitag",
      betrifft: { art: "alle", id: "", name: "alle Mitarbeiter" },
      eingang: "gestern 16:30", dringlichkeit: "niedrig",
      zustaendig: "Administration", zustand: "erledigt", gesehen: true, version: 1,
      sichtbar: ["self.read"], vertraulich: [],
      daten: { text: "Die Betriebsversammlung findet am Freitag um 14:00 Uhr statt." },
      empfehlung: "", antwort: "", notizen: []
    },
    {
      id: "V0006", art: "meldung", thema: "system",
      titel: "PAJ GPS ist nicht angebunden",
      betrifft: { art: "system", id: "", name: "Integration" },
      eingang: "dauerhaft", dringlichkeit: "niedrig",
      zustaendig: "", zustand: "neu", gesehen: true, version: 1,
      sichtbar: ["operations.read"], vertraulich: [],
      daten: { text: "Es werden keine Positionen angezeigt und keine erfunden." },
      empfehlung: "", antwort: "", notizen: []
    },
    {
      id: "V0007", art: "aufgabe", thema: "urlaub",
      titel: "Urlaubsantrag entschieden – Testfahrer 06",
      betrifft: { art: "mitarbeiter", id: "M06", name: "Testfahrer 06" },
      eingang: "vor 3 Tagen", dringlichkeit: "normal",
      zustaendig: "Personal", zustand: "erledigt", gesehen: true, version: 2,
      sichtbar: ["operations.read", "personnel.read"], vertraulich: [],
      daten: { von: alsIso(tagAls(-1)), bis: alsIso(tagAls(1)), entscheidung: "genehmigt" },
      empfehlung: "Aus Planungssicht möglich",
      antwort: "Ihr Urlaubsantrag wurde genehmigt.",
      notizen: [{ wer: "Personal", text: "Resturlaub reicht aus." }]
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
      sichtbar: ["operations.read"], vertraulich: [],
      daten: {}, empfehlung: "", antwort: "", notizen: [],
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
  const personal = mitarbeiter.map((m, i) => ({
    ...m,
    status: ["aktiv", "aktiv", "aktiv", "krank", "aktiv", "Urlaub"][i],
    eintritt: "01.01.2025",
    konto: i < 5 ? "verknüpft" : "nicht verknüpft",
    rollen: i === 0 ? ["employee"] : ["employee"],
    fristen: [
      { was: "Führerschein", bis: i === 1 ? "in 14 Tagen" : "gültig" },
      { was: "Personenbeförderungsschein", bis: i === 3 ? "abgelaufen" : "gültig" }
    ]
  }));

  /* ---- Lohnabrechnungen ---- */
  const lohn = [
    { id: "L01", mitarbeiterId: "M01", monat: "08", jahr: "2026", bereitgestellt: "02.09.2026", version: 1 },
    { id: "L02", mitarbeiterId: "M02", monat: "08", jahr: "2026", bereitgestellt: "02.09.2026", version: 1 },
    { id: "L03", mitarbeiterId: "M01", monat: "07", jahr: "2026", bereitgestellt: "03.08.2026", version: 2 }
  ];

  /* ---- Rewards ---- */
  const rewards = {
    regeln: [
      { name: "Punkte je qualifizierender Fahrt", wert: "10" },
      { name: "Stufe Silber ab", wert: "250 Punkte" },
      { name: "Stufe Gold ab", wert: "750 Punkte" },
      { name: "Gutschein gültig", wert: "90 Tage" }
    ],
    konten: [
      { kunde: "Testkunde 01", punkte: 340, stufe: "Silber", drehs: 1 },
      { kunde: "Testkunde 02", punkte: 120, stufe: "Basis",  drehs: 0 },
      { kunde: "Testkunde 03", punkte: 810, stufe: "Gold",   drehs: 2 }
    ],
    vorgaenge: [
      { zeit: "heute 09:14", was: "Dreh eingelöst", kunde: "Testkunde 03", ergebnis: "Gutschein 5 €", zustand: "gut" },
      { zeit: "heute 08:02", was: "Dreh abgebrochen", kunde: "Testkunde 01", ergebnis: "Anspruch erhalten", zustand: "ruhig" },
      { zeit: "gestern",     was: "Punkte gutgeschrieben", kunde: "Testkunde 02", ergebnis: "+10", zustand: "gut" }
    ]
  };

  /* ---- Kunden ----
     Die ersten sechs haben vollstaendige Stammdaten und eine
     Fahrtenhistorie. Danach werden viele weitere erzeugt, damit sich
     die Suche mit einem grossen Bestand pruefen laesst. Alle Namen sind
     durchnummerierte Testnamen - keine erfundenen Personen.
     Die Vorschlaege aus alten Fahrten nennen NIE einen Behandlungsgrund;
     ein Ziel heisst "Testklinik 01", nicht "Dialyse". */
  const tageZurueck = (n) => {
    const d = new Date(heute);
    d.setDate(d.getDate() - n);
    return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const kunden = [
    {
      id: "K0001", name: "Testkunde 01", art: "privat",
      vorname: "Test", nachname: "Kunde 01", firma: "",
      telefon: "Testnummer 0001", kundennummer: "KD-0001",
      strasse: "Teststrasse", hausnummer: "1", plz: "76726", ort: "Germersheim",
      konto: "verknüpft", fahrten: 12, hinweis: "",
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
      telefon: "Testnummer 0002", kundennummer: "KD-0002",
      strasse: "Testweg", hausnummer: "3", plz: "67360", ort: "Lingenfeld",
      konto: "nicht verknüpft", fahrten: 3, hinweis: "",
      letzteFahrten: [
        { datum: tageZurueck(5),  von: "Testweg 3, 67360 Lingenfeld", nach: "Testzentrum Karlsruhe" }
      ]
    },
    {
      id: "K0003", name: "Testkunde 03", art: "privat",
      vorname: "Test", nachname: "Kunde 03", firma: "",
      telefon: "Testnummer 0003", kundennummer: "KD-0003",
      strasse: "Testallee", hausnummer: "4a", plz: "76756", ort: "Bellheim",
      konto: "verknüpft", fahrten: 27, hinweis: "Rollstuhlfahrzeug erforderlich",
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
      telefon: "Testnummer 0004", kundennummer: "KD-0004",
      strasse: "Testring", hausnummer: "5", plz: "76726", ort: "Germersheim",
      konto: "nicht verknüpft", fahrten: 8, hinweis: "Rechnung monatlich",
      letzteFahrten: [
        { datum: tageZurueck(3), von: "Testring 5, 76726 Germersheim", nach: "Testflughafen" },
        { datum: tageZurueck(7), von: "Testring 5, 76726 Germersheim", nach: "Testbahnhof Germersheim" }
      ]
    },
    {
      id: "K0005", name: "Testkunde 05", art: "privat",
      vorname: "Test", nachname: "Kunde 05", firma: "",
      telefon: "Testnummer 0005", kundennummer: "KD-0005",
      strasse: "Testplatz", hausnummer: "2", plz: "76726", ort: "Germersheim",
      konto: "verknüpft", fahrten: 5, hinweis: "",
      letzteFahrten: [
        { datum: tageZurueck(6), von: "Testplatz 2, 76726 Germersheim", nach: "Testziel A" }
      ]
    },
    {
      id: "K0006", name: "Testkunde 06", art: "privat",
      vorname: "Test", nachname: "Kunde 06", firma: "",
      telefon: "Testnummer 0006", kundennummer: "KD-0006",
      strasse: "Testort", hausnummer: "6", plz: "76761", ort: "Rülzheim",
      konto: "nicht verknüpft", fahrten: 1, hinweis: "",
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
      telefon: `Testnummer ${nr}`, kundennummer: `KD-${nr}`,
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
  function kundenSuche(begriff, grenze = 8) {
    const b = String(begriff || "").trim().toLowerCase();
    if (b.length < 2) return { treffer: [], gesamt: 0, zuKurz: true };
    const alle = [];
    for (const k of kunden) {
      if (k.name.toLowerCase().includes(b)
        || k.telefon.toLowerCase().includes(b)
        || k.kundennummer.toLowerCase().includes(b)
        || (k.firma && k.firma.toLowerCase().includes(b))) {
        alle.push(k);
        if (alle.length > 500) break;
      }
    }
    return { treffer: alle.slice(0, grenze), gesamt: alle.length, zuKurz: false };
  }

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
  const rechnungen = [
    { nr: "RE-2026-0001", kunde: "Testkunde 01", zeitraum: "08/2026", betrag: "184,00 €", faellig: "15.09.2026", zustand: "bezahlt" },
    { nr: "RE-2026-0002", kunde: "Testkunde 03", zeitraum: "08/2026", betrag: "412,50 €", faellig: "15.09.2026", zustand: "offen" },
    { nr: "RE-2026-0003", kunde: "Testkunde 02", zeitraum: "07/2026", betrag: "96,00 €",  faellig: "15.08.2026", zustand: "überfällig" },
    { nr: "RE-2026-0004", kunde: "Testkunde 04", zeitraum: "09/2026", betrag: "—",        faellig: "—",          zustand: "Entwurf" }
  ];

  /* ---- Analyse. Ausdruecklich simulierte Werte. ---- */
  const analyse = {
    zeitraum: "letzte 7 Tage",
    kennzahlen: [
      { name: "Seitenaufrufe",   wert: "1 248", hinweis: "gezählt" },
      { name: "Besuche",         wert: "486",   hinweis: "gezählt" },
      { name: "Besucher",        wert: "~310",  hinweis: "Schätzung" },
      { name: "wiederkehrend",   wert: "~88",   hinweis: "Schätzung" }
    ],
    aktionen: [
      { name: "Klick auf Telefonnummer", wert: 64 },
      { name: "Klick auf WhatsApp",      wert: 41 },
      { name: "Registrierung begonnen",  wert: 18 },
      { name: "Registrierung abgeschlossen", wert: 11 },
      { name: "Anmeldung erfolgreich",   wert: 73 },
      { name: "Taxi Rush gestartet",     wert: 52 },
      { name: "Glücksradseite geöffnet", wert: 37 },
      { name: "Dreh angefordert",        wert: 21 }
    ],
    seiten: [
      { name: "Startseite",  wert: 512 },
      { name: "Flotte",      wert: 188 },
      { name: "Rewards",     wert: 141 },
      { name: "Hilfe & Kontakt", wert: 96 },
      { name: "Impressum",   wert: 44 }
    ]
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
    personal, lohn, rewards, kunden, rechnungen, analyse,
    standardadresse, letzteKunden, kundenSuche, haeufigeZiele,
    abwesenheiten, abwesenheitFuer, abwesenheitenAmTag, istWirksam,
    FAHRZEUG_ZUSTAENDE, istEinsatzbereit,
    fahrerDokumente, dokumentstand, DOKUMENT_LAGE, DOKUMENT_PFLICHT,
    protokoll, protokollieren, letzteAenderung, lohnProbe,
    vorgaenge, vorgangVon, vorgangAnlegen, warnungsHandhabung,
    VORGANG_ARTEN, VORGANG_ZUSTAENDE, VORGANG_THEMEN,
    zeitraumText, ABWESENHEIT_NAMEN,
    leistungsarten, rollstuhlWerte, gepaeckWerte,
    scheinWerte, zuzahlungWerte, genehmigungWerte
  };
})();
