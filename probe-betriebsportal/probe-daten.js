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
  const alsIso = (d) => d.toISOString().slice(0, 10);
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

  /* ---- Fahrzeuge ---- */
  const fahrzeuge = [
    { id: "F01", name: "Testwagen 01", kennzeichen: "GER-TEST 001", art: "Kombi",    plaetze: 4, rollstuhl: false, zustand: "verfuegbar" },
    { id: "F02", name: "Testwagen 02", kennzeichen: "GER-TEST 002", art: "Van",      plaetze: 8, rollstuhl: true,  zustand: "verfuegbar" },
    { id: "F03", name: "Testwagen 03", kennzeichen: "GER-TEST 003", art: "Limousine",plaetze: 4, rollstuhl: false, zustand: "verfuegbar" },
    { id: "F04", name: "Testwagen 04", kennzeichen: "GER-TEST 004", art: "Kombi",    plaetze: 4, rollstuhl: false, zustand: "werkstatt" }
  ];

  /* ---- Schichtvorlagen. Uhrzeit steht immer dabei. ---- */
  const vorlagen = [
    { id: "frueh",       name: "Frühschicht", von: "06:00", bis: "14:00" },
    { id: "tag",         name: "Tagschicht",  von: "09:00", bis: "17:00" },
    { id: "spaet",       name: "Spätschicht", von: "14:00", bis: "22:00" },
    { id: "nacht",       name: "Nachtschicht", von: "22:00", bis: "06:00" },
    { id: "individuell", name: "Individuell", von: "",      bis: "" }
  ];

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

  /* ---- Meldungen. Rollenabhaengig, ohne vertrauliche Inhalte. ---- */
  const meldungen = [
    { id: "ME01", art: "ungeplant",  stufe: "warnung", faehigkeit: "operations.read", text: "2 Fahrten für heute sind noch niemandem zugewiesen.", zeit: "vor 10 Min" },
    { id: "ME02", art: "fahrzeug",   stufe: "warnung", faehigkeit: "operations.read", text: "Testfahrer 03 ist im Dienst, hat aber kein Fahrzeug.", zeit: "vor 25 Min" },
    { id: "ME03", art: "konflikt",   stufe: "warnung", faehigkeit: "operations.read", text: "Testwagen 01 ist heute zweimal gleichzeitig verplant.", zeit: "vor 31 Min" },
    { id: "ME04", art: "krank",      stufe: "ruhig",   faehigkeit: "operations.read", text: "Neue Krankmeldung eingegangen – im geschützten Personalbereich prüfen.", zeit: "vor 1 Std" },
    { id: "ME05", art: "krank-voll", stufe: "ruhig",   faehigkeit: "personnel.read",  text: "Krankmeldung von Testfahrer 04, eingegangen heute, Nachweis noch offen.", zeit: "vor 1 Std" },
    { id: "ME06", art: "frist",      stufe: "warnung", faehigkeit: "personnel.read",  text: "Führerschein von Testfahrer 02 läuft in 14 Tagen ab.", zeit: "vor 3 Std" },
    { id: "ME07", art: "urlaub",     stufe: "ruhig",   faehigkeit: "personnel.read",  text: "Urlaubsantrag von Testfahrer 06 wartet auf Entscheidung.", zeit: "gestern" },
    { id: "ME08", art: "integration",stufe: "ruhig",   faehigkeit: "operations.read", text: "PAJ GPS ist nicht angebunden – Positionen stehen nicht zur Verfügung.", zeit: "dauerhaft" }
  ];

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
    fahrten, fahrtZustaende, meldungen,
    personal, lohn, rewards, kunden, rechnungen, analyse,
    standardadresse, letzteKunden, kundenSuche, haeufigeZiele,
    leistungsarten, rollstuhlWerte, gepaeckWerte,
    scheinWerte, zuzahlungWerte, genehmigungWerte
  };
})();
