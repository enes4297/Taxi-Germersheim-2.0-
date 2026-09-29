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

  /* ---- Kunden ---- */
  const kunden = [
    { id: "K01", name: "Testkunde 01", kontakt: "Testnummer K01", konto: "verknüpft",       fahrten: 12, hinweis: "" },
    { id: "K02", name: "Testkunde 02", kontakt: "Testnummer K02", konto: "nicht verknüpft", fahrten: 3,  hinweis: "" },
    { id: "K03", name: "Testkunde 03", kontakt: "Testnummer K03", konto: "verknüpft",       fahrten: 27, hinweis: "Rollstuhl erforderlich" },
    { id: "K04", name: "Testkunde 04", kontakt: "Testnummer K04", konto: "nicht verknüpft", fahrten: 1,  hinweis: "" }
  ];

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

  window.ProbeDaten = {
    heute, tagAls, alsIso, alsText,
    mitarbeiter, fahrzeuge, vorlagen, planung,
    fahrten, fahrtZustaende, meldungen,
    personal, lohn, rewards, kunden, rechnungen, analyse
  };
})();
