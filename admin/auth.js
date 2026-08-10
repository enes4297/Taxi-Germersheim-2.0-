// Nur Demo-Rollen. Kein echter Zugriffsschutz ohne Backend.
(() => {
  const LEGACY_STORAGE_KEY = "taxiAdminDemoSession";
  const KEY_LOGGED_IN = "demoAdminLoggedIn";
  const KEY_USER = "demoAdminUser";
  const KEY_ROLE = "demoAdminRole";
  const KEY_NOTICE = "demoAdminPermissionNotice";
  const KEY_DEMO_NOTIFICATIONS = "adminDemoNotificationsReadState";
  const KEY_DEMO_NOTIFICATIONS_LEGACY = "demoAdminNotificationsState";
  const DEMO_NOTIFICATION_LIMIT = 3;
  const V20_SHORTCUT = "k";
  const V20_SEARCH_LIMIT = 8;
  const NOTIFICATION_OPEN_STATUS = "ungelesen";
  const NOTIFICATION_AUTO_HIDE_MS = 12000;
  const KEY_SIDEBAR_GROUP_STATE = "adminSidebarGroupStateV21";
  const SIDEBAR_SINGLE_OPEN = true;

  const DEMO_USERS = {
    admin: { role: "Chef" },
    enes: { role: "Chef" },
    fatih: { role: "Chef" },
    geschaeft: { role: "Geschaeftsleitung" },
    dispo: { role: "Disposition" },
    disponent: { role: "Disposition" },
    billing: { role: "Buchhaltung" },
    abrechnung: { role: "Buchhaltung" },
    fahrer: { role: "Fahrer" },
    werkstatt: { role: "Werkstatt" },
    personal: { role: "Personalverwaltung" },
    qualitaet: { role: "Qualitaetsmanagement" },
    mitarbeiter: { role: "Mitarbeiter" }
  };

  const ROLE_NAV_ACCESS = {
    Chef: ["Dashboard", "Fahrten", "Fahrer", "Fahrzeuge", "Live-Karte", "Live-Dispo", "Telefonzentrale", "Werkstatt", "Kunden", "Serienfahrten", "Fahrzeugübergaben", "Abrechnungszentrale", "Krankenkassen", "Rechnungen", "Zahlungen", "Mahnwesen", "Pruefen und Klaeren", "Monatsabschluss", "Controlling", "Personaluebersicht", "Mitarbeiter", "Urlaubsplanung", "Abwesenheiten", "Dokumentfristen", "Schulungen", "Mitteilungen", "Mitarbeiterportal", "Personalaufgaben", "Qualitaet & Sicherheit", "Qualitaetsuebersicht", "Beschwerden", "Vorfaelle", "Unfaelle", "Fundbuero", "Pruefungen", "Massnahmen", "Qualitaetsberichte", "Unternehmenssteuerung", "Geschaeftsfuehrer-Dashboard", "Betriebssteuerung", "Kapazitaetsplanung", "Nachfrageprognose", "Szenarien", "Ziele", "Entscheidungscenter", "Geschaeftsberichte", "Kassenübersicht", "Schichtplanung", "Dokumente", "Statistiken", "Einstellungen", "Benutzer", "Verlauf", "Export & Backup", "Hilfe"],
    Geschaeftsleitung: ["Dashboard", "Live-Dispo", "Telefonzentrale", "Werkstatt", "Kunden", "Serienfahrten", "Abrechnungszentrale", "Rechnungen", "Controlling", "Monatsabschluss", "Personaluebersicht", "Mitarbeiter", "Urlaubsplanung", "Abwesenheiten", "Dokumentfristen", "Qualitaet & Sicherheit", "Qualitaetsuebersicht", "Beschwerden", "Vorfaelle", "Unfaelle", "Pruefungen", "Massnahmen", "Qualitaetsberichte", "Unternehmenssteuerung", "Geschaeftsfuehrer-Dashboard", "Betriebssteuerung", "Kapazitaetsplanung", "Nachfrageprognose", "Szenarien", "Ziele", "Entscheidungscenter", "Geschaeftsberichte", "Schichtplanung", "Statistiken", "Hilfe"],
    Disposition: ["Dashboard", "Fahrten", "Fahrer", "Fahrzeuge", "Live-Karte", "Live-Dispo", "Telefonzentrale", "Werkstatt", "Kunden", "Serienfahrten", "Fahrzeugübergaben", "Abrechnungszentrale", "Pruefen und Klaeren", "Personaluebersicht", "Mitarbeiter", "Urlaubsplanung", "Abwesenheiten", "Mitteilungen", "Mitarbeiterportal", "Personalaufgaben", "Qualitaet & Sicherheit", "Qualitaetsuebersicht", "Beschwerden", "Vorfaelle", "Unfaelle", "Fundbuero", "Pruefungen", "Massnahmen", "Qualitaetsberichte", "Unternehmenssteuerung", "Geschaeftsfuehrer-Dashboard", "Betriebssteuerung", "Kapazitaetsplanung", "Nachfrageprognose", "Szenarien", "Geschaeftsberichte", "Schichtplanung", "Dokumente", "Statistiken", "Einstellungen", "Verlauf", "Export & Backup", "Hilfe"],
    Buchhaltung: ["Dashboard", "Fahrten", "Werkstatt", "Kunden", "Abrechnungszentrale", "Krankenkassen", "Rechnungen", "Zahlungen", "Mahnwesen", "Pruefen und Klaeren", "Monatsabschluss", "Controlling", "Personaluebersicht", "Dokumentfristen", "Mitteilungen", "Personalaufgaben", "Qualitaet & Sicherheit", "Qualitaetsuebersicht", "Beschwerden", "Pruefungen", "Massnahmen", "Qualitaetsberichte", "Unternehmenssteuerung", "Geschaeftsfuehrer-Dashboard", "Geschaeftsberichte", "Ziele", "Entscheidungscenter", "Kassenübersicht", "Dokumente", "Statistiken", "Einstellungen", "Verlauf", "Export & Backup", "Hilfe"],
    Fahrer: ["Dashboard", "Fahrten", "Fahrzeuge", "Live-Karte", "Werkstatt", "Dokumente", "Statistiken", "Einstellungen", "Verlauf", "Hilfe"],
    Werkstatt: ["Dashboard", "Fahrten", "Fahrer", "Fahrzeuge", "Live-Karte", "Werkstatt", "Kunden", "Schichtplanung", "Dokumente", "Statistiken", "Einstellungen"],
    Personalverwaltung: ["Dashboard", "Fahrten", "Fahrer", "Kunden", "Personaluebersicht", "Mitarbeiter", "Urlaubsplanung", "Abwesenheiten", "Dokumentfristen", "Schulungen", "Mitteilungen", "Mitarbeiterportal", "Personalaufgaben", "Qualitaet & Sicherheit", "Qualitaetsuebersicht", "Beschwerden", "Vorfaelle", "Fundbuero", "Massnahmen", "Qualitaetsberichte", "Unternehmenssteuerung", "Betriebssteuerung", "Kapazitaetsplanung", "Ziele", "Geschaeftsberichte", "Schichtplanung", "Dokumente", "Statistiken", "Einstellungen", "Verlauf", "Hilfe"],
    Qualitaetsmanagement: ["Dashboard", "Fahrten", "Fahrer", "Fahrzeuge", "Live-Dispo", "Werkstatt", "Kunden", "Dokumente", "Schichtplanung", "Mitarbeiter", "Mitteilungen", "Mitarbeiterportal", "Personalaufgaben", "Qualitaet & Sicherheit", "Qualitaetsuebersicht", "Beschwerden", "Vorfaelle", "Unfaelle", "Fundbuero", "Pruefungen", "Massnahmen", "Qualitaetsberichte", "Verlauf", "Hilfe"],
    Mitarbeiter: ["Mitteilungen", "Mitarbeiterportal", "Personalaufgaben", "Hilfe"]
  };

  const V20_NAV_BY_ROLE = {
    Chef: ["Aufgaben-Center", "Benachrichtigungs-Center", "Rollen und Rechte", "Mein Arbeitsplatz"],
    Geschaeftsleitung: ["Aufgaben-Center", "Benachrichtigungs-Center", "Mein Arbeitsplatz"],
    Disposition: ["Aufgaben-Center", "Benachrichtigungs-Center", "Mein Arbeitsplatz"],
    Buchhaltung: ["Aufgaben-Center", "Benachrichtigungs-Center", "Mein Arbeitsplatz"],
    Fahrer: ["Aufgaben-Center", "Benachrichtigungs-Center", "Mein Arbeitsplatz"],
    Werkstatt: ["Aufgaben-Center", "Benachrichtigungs-Center", "Mein Arbeitsplatz"],
    Personalverwaltung: ["Aufgaben-Center", "Benachrichtigungs-Center", "Mein Arbeitsplatz"],
    Qualitaetsmanagement: ["Aufgaben-Center", "Benachrichtigungs-Center", "Mein Arbeitsplatz"],
    Mitarbeiter: ["Aufgaben-Center", "Benachrichtigungs-Center", "Mein Arbeitsplatz"]
  };

  const ROLE_PAGE_ACCESS = {
    "index.html": ["Chef", "Geschaeftsleitung", "Disposition", "Buchhaltung", "Fahrer"],
    "fahrer.html": ["Chef", "Disposition"],
    "fahrzeuge.html": ["Chef", "Disposition", "Fahrer"],
    "live-karte.html": ["Chef", "Disposition", "Fahrer", "Werkstatt"],
    "live-dispo.html": ["Chef", "Geschaeftsleitung", "Disposition"],
    "telefonzentrale.html": ["Chef", "Geschaeftsleitung", "Disposition"],
    "werkstatt.html": ["Chef", "Geschaeftsleitung", "Disposition", "Buchhaltung", "Fahrer", "Werkstatt"],
    "kunden.html": ["Chef", "Geschaeftsleitung", "Disposition", "Buchhaltung"],
    "serienfahrten.html": ["Chef", "Geschaeftsleitung", "Disposition"],
    "fahrzeuguebergaben.html": ["Chef", "Disposition"],
    "abrechnungszentrale.html": ["Chef", "Geschaeftsleitung", "Disposition", "Buchhaltung"],
    "krankenkassen.html": ["Chef", "Buchhaltung"],
    "rechnungen.html": ["Chef", "Geschaeftsleitung", "Buchhaltung"],
    "zahlungen.html": ["Chef", "Buchhaltung"],
    "mahnwesen.html": ["Chef", "Buchhaltung"],
    "pruefcenter.html": ["Chef", "Disposition", "Buchhaltung"],
    "monatsabschluss.html": ["Chef", "Geschaeftsleitung", "Buchhaltung"],
    "controlling.html": ["Chef", "Geschaeftsleitung", "Buchhaltung"],
    "personaluebersicht.html": ["Chef", "Geschaeftsleitung", "Disposition", "Buchhaltung", "Personalverwaltung"],
    "mitarbeiter.html": ["Chef", "Geschaeftsleitung", "Disposition", "Personalverwaltung"],
    "urlaubsplanung.html": ["Chef", "Geschaeftsleitung", "Disposition", "Personalverwaltung"],
    "abwesenheiten.html": ["Chef", "Geschaeftsleitung", "Disposition", "Personalverwaltung"],
    "dokumentfristen.html": ["Chef", "Geschaeftsleitung", "Buchhaltung", "Personalverwaltung"],
    "schulungen.html": ["Chef", "Personalverwaltung"],
    "mitteilungen.html": ["Chef", "Disposition", "Buchhaltung", "Personalverwaltung", "Mitarbeiter"],
    "personalaufgaben.html": ["Chef", "Disposition", "Buchhaltung", "Personalverwaltung", "Mitarbeiter"],
    "qualitaetsuebersicht.html": ["Chef", "Disposition", "Buchhaltung", "Personalverwaltung", "Qualitaetsmanagement"],
    "beschwerden.html": ["Chef", "Disposition", "Buchhaltung", "Personalverwaltung", "Qualitaetsmanagement"],
    "vorfaelle.html": ["Chef", "Disposition", "Personalverwaltung", "Qualitaetsmanagement"],
    "unfaelle.html": ["Chef", "Disposition", "Qualitaetsmanagement"],
    "fundbuero.html": ["Chef", "Disposition", "Personalverwaltung", "Qualitaetsmanagement"],
    "pruefungen.html": ["Chef", "Disposition", "Buchhaltung", "Qualitaetsmanagement"],
    "massnahmen.html": ["Chef", "Disposition", "Buchhaltung", "Personalverwaltung", "Qualitaetsmanagement"],
    "qualitaetsberichte.html": ["Chef", "Disposition", "Buchhaltung", "Personalverwaltung", "Qualitaetsmanagement"],
    "geschaeftsfuehrer-dashboard.html": ["Chef", "Geschaeftsleitung", "Disposition", "Buchhaltung", "Personalverwaltung", "Qualitaetsmanagement"],
    "betriebssteuerung.html": ["Chef", "Geschaeftsleitung", "Disposition", "Personalverwaltung", "Qualitaetsmanagement"],
    "kapazitaetsplanung.html": ["Chef", "Geschaeftsleitung", "Disposition", "Personalverwaltung"],
    "nachfrageprognose.html": ["Chef", "Geschaeftsleitung", "Disposition", "Buchhaltung"],
    "szenarien.html": ["Chef", "Geschaeftsleitung", "Disposition"],
    "ziele.html": ["Chef", "Geschaeftsleitung", "Disposition", "Buchhaltung", "Personalverwaltung", "Qualitaetsmanagement"],
    "entscheidungscenter.html": ["Chef", "Geschaeftsleitung", "Disposition", "Buchhaltung"],
    "geschaeftsberichte.html": ["Chef", "Geschaeftsleitung", "Disposition", "Buchhaltung", "Personalverwaltung", "Qualitaetsmanagement"],
    "kassenuebersicht.html": ["Chef", "Buchhaltung"],
    "schichtplanung.html": ["Chef", "Geschaeftsleitung", "Disposition"],
    "dokumente.html": ["Chef", "Disposition", "Buchhaltung", "Fahrer"],
    "statistiken.html": ["Chef", "Geschaeftsleitung", "Disposition", "Buchhaltung", "Fahrer"],
    "einstellungen.html": ["Chef", "Disposition", "Buchhaltung", "Fahrer"],
    "benutzer.html": ["Chef"],
    "verlauf.html": ["Chef", "Disposition", "Buchhaltung", "Fahrer"],
    "export-backup.html": ["Chef", "Disposition", "Buchhaltung"],
    "hilfe.html": ["Chef", "Geschaeftsleitung", "Disposition", "Buchhaltung", "Fahrer"]
  };

  ROLE_PAGE_ACCESS["aufgaben-center.html"] = ["Chef", "Geschaeftsleitung", "Disposition", "Buchhaltung", "Fahrer", "Werkstatt", "Personalverwaltung", "Qualitaetsmanagement", "Mitarbeiter"];
  ROLE_PAGE_ACCESS["benachrichtigungen-center.html"] = ["Chef", "Geschaeftsleitung", "Disposition", "Buchhaltung", "Fahrer", "Werkstatt", "Personalverwaltung", "Qualitaetsmanagement", "Mitarbeiter"];
  ROLE_PAGE_ACCESS["rollen-rechte.html"] = ["Chef"];
  ROLE_PAGE_ACCESS["arbeitsplatz.html"] = ["Chef", "Geschaeftsleitung", "Disposition", "Buchhaltung", "Fahrer", "Werkstatt", "Personalverwaltung", "Qualitaetsmanagement", "Mitarbeiter"];
  ROLE_PAGE_ACCESS["termin-cockpit.html"] = ["Chef", "Geschaeftsleitung", "Disposition"];
  ROLE_PAGE_ACCESS["tagesplanung.html"] = ["Chef", "Geschaeftsleitung", "Disposition"];
  ROLE_PAGE_ACCESS["termin-schnellerfassung.html"] = ["Chef", "Geschaeftsleitung", "Disposition"];

  // Nur Demo-Benachrichtigungen ohne Backend.
  const DEMO_NOTIFICATIONS = [
    {
      id: "demo-tuev",
      title: "TÜV bald fällig",
      text: "Fahrzeug GER TG 404 muss in 12 Tagen zur TÜV-Prüfung.",
      time: "vor 8 Min",
      type: "Warnung",
      category: "Fahrzeuge",
      scope: "Fahrzeuge"
    },
    {
      id: "demo-service",
      title: "Service bald fällig",
      text: "Serviceintervall für GER TG 201 erreicht in 320 km.",
      time: "vor 17 Min",
      type: "Info",
      category: "Fahrzeuge",
      scope: "Fahrzeuge"
    },
    {
      id: "demo-pschein",
      title: "Fahrer-P-Schein läuft bald ab",
      text: "Michael Becker: Verlängerung in 9 Tagen notwendig.",
      time: "vor 26 Min",
      type: "Kritisch",
      category: "Fahrer",
      scope: "Fahrer"
    },
    {
      id: "demo-booking",
      title: "Neue Buchungsanfrage",
      text: "Neue Anfrage aus Bellheim für 14:40 Uhr eingegangen.",
      time: "vor 2 Min",
      type: "Info",
      category: "Fahrten",
      scopes: ["Fahrten", "Kunden"]
    },
    {
      id: "demo-billing-overdue",
      title: "Rechnung überfällig",
      text: "RG-2026-1002 ist seit 5 Tagen überfällig.",
      time: "vor 33 Min",
      type: "Kritisch",
      category: "Rechnungen",
      scope: "Rechnungen"
    },
    {
      id: "demo-insurer-return",
      title: "Krankenkassen-Rückfrage offen",
      text: "KK-CASE-103 wartet auf fehlenden Transportschein.",
      time: "vor 21 Min",
      type: "Warnung",
      category: "Krankenkasse",
      scopes: ["Rechnungen", "Kunden"]
    },
    {
      id: "demo-payment-gap",
      title: "Differenz im Zahlungsabgleich",
      text: "Fahrt V16-R-204: Karteneingang liegt 8,50 EUR unter Soll.",
      time: "vor 6 Min",
      type: "Kritisch",
      category: "Controlling",
      scopes: ["Rechnungen", "Fahrten"]
    },
    {
      id: "demo-vac-request",
      title: "Neuer Urlaubsantrag",
      text: "MA-104 hat einen neuen Urlaubsantrag eingereicht.",
      time: "vor 4 Min",
      type: "Info",
      category: "Personal",
      scope: "Personal"
    },
    {
      id: "demo-license-expire",
      title: "Führerschein läuft ab",
      text: "MA-102: Führerschein ist abgelaufen.",
      time: "vor 13 Min",
      type: "Kritisch",
      category: "Personal",
      scope: "Personal"
    },
    {
      id: "demo-quality-complaint",
      title: "Neue kritische Beschwerde",
      text: "QB-1002 wartet auf Eskalationsentscheidung.",
      time: "vor 3 Min",
      type: "Kritisch",
      category: "Qualitaet",
      scope: "Qualitaet"
    },
    {
      id: "demo-quality-inspection",
      title: "Pruefung heute faellig",
      text: "Fahrzeugkontrolle GER TX200 heute durchfuehren.",
      time: "vor 9 Min",
      type: "Warnung",
      category: "Qualitaet",
      scope: "Qualitaet"
    },
    {
      id: "demo-management-bottleneck",
      title: "Managementwarnung Engpass 06:00-09:00",
      text: "Fahrer- und Fahrzeugreserve fuer Peak pruefen.",
      time: "vor 5 Min",
      type: "Warnung",
      category: "Unternehmenssteuerung",
      scope: "Management"
    },
    {
      id: "demo-shift-open",
      title: "Schicht unbesetzt",
      text: "Spätschicht 18:00-22:00 hat aktuell keine Zuordnung.",
      time: "vor 11 Min",
      type: "Warnung",
      category: "Schichten",
      scope: "Schichten"
    },
    {
      id: "demo-workshop",
      title: "Fahrzeug in Werkstatt",
      text: "GER TG 512 wurde erfolgreich in die Werkstatt übergeben.",
      time: "vor 41 Min",
      type: "Erfolg",
      category: "Fahrzeuge",
      scope: "Fahrzeuge"
    }
  ];

  const ROLE_NOTIFICATION_SCOPES = {
    Chef: ["Fahrten", "Fahrzeuge", "Schichten", "Fahrer", "Rechnungen", "Kunden", "Personal", "Qualitaet", "Management"],
    Geschaeftsleitung: ["Management", "Fahrten", "Fahrzeuge", "Schichten", "Fahrer", "Rechnungen", "Kunden", "Personal", "Qualitaet"],
    Disposition: ["Fahrten", "Fahrzeuge", "Schichten", "Fahrer", "Personal", "Qualitaet", "Management"],
    Buchhaltung: ["Rechnungen", "Kunden", "Personal", "Qualitaet", "Management"],
    Fahrer: ["Fahrten", "Fahrzeuge", "Personal"],
    Personalverwaltung: ["Personal", "Schichten", "Fahrer", "Kunden", "Qualitaet", "Management"],
    Qualitaetsmanagement: ["Qualitaet", "Fahrzeuge", "Fahrten", "Fahrer", "Schichten", "Kunden"]
  };

  const SIDEBAR_ITEMS = [
    { key: "Dashboard", href: "index.html#dashboard", label: "Dashboard" },
    { key: "Fahrten", href: "index.html", label: "Fahrten" },
    { key: "Fahrer", href: "fahrer.html", label: "Fahrer" },
    { key: "Fahrzeuge", href: "fahrzeuge.html", label: "Fahrzeuge" },
    { key: "Live-Karte", href: "live-karte.html", label: "Live-Karte" },
    { key: "Live-Dispo", href: "live-dispo.html", label: "Live-Dispo" },
    { key: "Telefonzentrale", href: "telefonzentrale.html", label: "Telefonzentrale" },
    { key: "Werkstatt", href: "werkstatt.html", label: "Werkstatt" },
    { key: "Kunden", href: "kunden.html", label: "Kunden" },
    { key: "Serienfahrten", href: "serienfahrten.html", label: "Serienfahrten" },
    { key: "Fahrzeugübergaben", href: "fahrzeuguebergaben.html", label: "Fahrzeugübergaben" },
    { key: "Abrechnungszentrale", href: "abrechnungszentrale.html", label: "Abrechnungszentrale" },
    { key: "Krankenkassen", href: "krankenkassen.html", label: "Krankenkassen" },
    { key: "Rechnungen", href: "rechnungen.html", label: "Rechnungen" },
    { key: "Zahlungen", href: "zahlungen.html", label: "Zahlungen" },
    { key: "Mahnwesen", href: "mahnwesen.html", label: "Mahnwesen" },
    { key: "Pruefen und Klaeren", href: "pruefcenter.html", label: "Pruefen und Klaeren", displayLabel: "Prüfen und Klären" },
    { key: "Monatsabschluss", href: "monatsabschluss.html", label: "Monatsabschluss" },
    { key: "Controlling", href: "controlling.html", label: "Controlling" },
    { key: "Personaluebersicht", href: "personaluebersicht.html", label: "Personaluebersicht", displayLabel: "Personalübersicht" },
    { key: "Mitarbeiter", href: "mitarbeiter.html", label: "Mitarbeiter" },
    { key: "Urlaubsplanung", href: "urlaubsplanung.html", label: "Urlaubsplanung" },
    { key: "Abwesenheiten", href: "abwesenheiten.html", label: "Abwesenheiten" },
    { key: "Dokumentfristen", href: "dokumentfristen.html", label: "Dokumentfristen" },
    { key: "Schulungen", href: "schulungen.html", label: "Schulungen" },
    { key: "Mitteilungen", href: "mitteilungen.html", label: "Mitteilungen" },
    { key: "Mitarbeiterportal", href: "../fahrer/mitarbeiter.html", label: "Mitarbeiterportal" },
    { key: "Personalaufgaben", href: "personalaufgaben.html", label: "Personalaufgaben" },
    { key: "Qualitaet & Sicherheit", href: "qualitaetsuebersicht.html", label: "Qualitaet & Sicherheit" },
    { key: "Qualitaetsuebersicht", href: "qualitaetsuebersicht.html", label: "Qualitaetsuebersicht" },
    { key: "Beschwerden", href: "beschwerden.html", label: "Beschwerden" },
    { key: "Vorfaelle", href: "vorfaelle.html", label: "Vorfaelle" },
    { key: "Unfaelle", href: "unfaelle.html", label: "Unfaelle" },
    { key: "Fundbuero", href: "fundbuero.html", label: "Fundbuero" },
    { key: "Pruefungen", href: "pruefungen.html", label: "Pruefungen" },
    { key: "Massnahmen", href: "massnahmen.html", label: "Massnahmen" },
    { key: "Qualitaetsberichte", href: "qualitaetsberichte.html", label: "Qualitaetsberichte" },
    { key: "Unternehmenssteuerung", href: "geschaeftsfuehrer-dashboard.html", label: "Unternehmenssteuerung" },
    { key: "Geschaeftsfuehrer-Dashboard", href: "geschaeftsfuehrer-dashboard.html", label: "Geschaeftsfuehrer-Dashboard" },
    { key: "Betriebssteuerung", href: "betriebssteuerung.html", label: "Betriebssteuerung" },
    { key: "Kapazitaetsplanung", href: "kapazitaetsplanung.html", label: "Kapazitaetsplanung" },
    { key: "Nachfrageprognose", href: "nachfrageprognose.html", label: "Nachfrageprognose" },
    { key: "Szenarien", href: "szenarien.html", label: "Szenarien" },
    { key: "Ziele", href: "ziele.html", label: "Ziele" },
    { key: "Entscheidungscenter", href: "entscheidungscenter.html", label: "Entscheidungscenter" },
    { key: "Geschaeftsberichte", href: "geschaeftsberichte.html", label: "Geschaeftsberichte" },
    { key: "Kassenübersicht", href: "kassenuebersicht.html", label: "Kassenübersicht" },
    { key: "Schichtplanung", href: "schichtplanung.html", label: "Schichtplanung" },
    { key: "Dokumente", href: "dokumente.html", label: "Dokumente" },
    { key: "Statistiken", href: "statistiken.html", label: "Statistiken" },
    { key: "Einstellungen", href: "einstellungen.html", label: "Einstellungen" },
    { key: "Aufgaben-Center", href: "aufgaben-center.html", label: "Aufgaben-Center" },
    { key: "Benachrichtigungs-Center", href: "benachrichtigungen-center.html", label: "Benachrichtigungs-Center" },
    { key: "Rollen und Rechte", href: "rollen-rechte.html", label: "Rollen und Rechte" },
    { key: "Mein Arbeitsplatz", href: "arbeitsplatz.html", label: "Mein Arbeitsplatz" },
    { key: "Benutzer", href: "benutzer.html", label: "Benutzer" },
    { key: "Verlauf", href: "verlauf.html", label: "Verlauf" },
    { key: "Export & Backup", href: "export-backup.html", label: "Export & Backup" },
    { key: "Hilfe", href: "hilfe.html", label: "Hilfe" }
  ];

  const SIDEBAR_GROUPS = [
    { key: "betrieb", label: "Betrieb", items: ["Dashboard", "Telefonzentrale", "Tagesplanung", "Fahrten", "Termin-Cockpit", "Live-Dispo", "Live-Karte"] },
    { key: "kunden", label: "Kunden", items: ["Kunden", "Serienfahrten", "Krankenkassen"] },
    { key: "personal", label: "Personal", items: ["Mitarbeiter", "Fahrer", "Personaluebersicht", "Abwesenheiten", "Urlaubsplanung", "Dokumentfristen", "Schichtplanung"] },
    { key: "flotte", label: "Flotte", items: ["Fahrzeuge", "Werkstatt", "Fahrzeugübergaben"] },
    { key: "organisation", label: "Organisation", items: ["Aufgaben-Center", "Benachrichtigungs-Center", "Einstellungen", "Verlauf", "Dokumente", "Hilfe", "Mein Arbeitsplatz", "Benutzer", "Export & Backup"] }
  ];

  Object.entries(V20_NAV_BY_ROLE).forEach(([role, labels]) => {
    const base = ROLE_NAV_ACCESS[role];
    if (!Array.isArray(base)) return;
    labels.forEach((label) => {
      if (!base.includes(label)) base.push(label);
    });
  });

  const V22_NAV_BY_ROLE = {
    Chef: ["Termin-Cockpit", "Tagesplanung"],
    Geschaeftsleitung: ["Termin-Cockpit", "Tagesplanung"],
    Disposition: ["Termin-Cockpit", "Tagesplanung"]
  };

  Object.entries(V22_NAV_BY_ROLE).forEach(([role, labels]) => {
    const base = ROLE_NAV_ACCESS[role];
    if (!Array.isArray(base)) return;
    labels.forEach((label) => {
      if (!base.includes(label)) base.push(label);
    });
  });

  if (!SIDEBAR_ITEMS.some((item) => item.key === "Termin-Cockpit")) {
    SIDEBAR_ITEMS.splice(6, 0, { key: "Termin-Cockpit", href: "termin-cockpit.html", label: "Termin-Cockpit" });
  }

  if (!SIDEBAR_ITEMS.some((item) => item.key === "Tagesplanung")) {
    SIDEBAR_ITEMS.splice(7, 0, { key: "Tagesplanung", href: "tagesplanung.html", label: "Tagesplanung" });
  }

  const betriebGroup = SIDEBAR_GROUPS.find((group) => group.key === "betrieb");
  if (betriebGroup) {
    if (!betriebGroup.items.includes("Termin-Cockpit")) {
      betriebGroup.items.splice(1, 0, "Termin-Cockpit");
    }
    if (!betriebGroup.items.includes("Tagesplanung")) {
      betriebGroup.items.splice(2, 0, "Tagesplanung");
    }
  }

  function normalizePath(pathname) {
    const lower = String(pathname || "").toLowerCase();
    if (lower.endsWith("/")) return "index.html";
    const parts = lower.split("/");
    return parts[parts.length - 1] || "index.html";
  }

  function readLegacySession() {
    try {
      const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function ensureSupabaseBridge() {
    if (window.TaxiSupabaseAuth && typeof window.TaxiSupabaseAuth.readStoredSession === "function") {
      return window.TaxiSupabaseAuth;
    }

    return null;
  }

  function saveSession(user, role) {
    localStorage.setItem(KEY_LOGGED_IN, "true");
    localStorage.setItem(KEY_USER, user);
    localStorage.setItem(KEY_ROLE, role);
    localStorage.setItem(
      LEGACY_STORAGE_KEY,
      JSON.stringify({
        username: user,
        role,
        token: "demo-auth-v2",
        loginAt: new Date().toISOString()
      })
    );

    const bridge = ensureSupabaseBridge();
    if (bridge && typeof bridge.saveStoredSession === "function") {
      bridge.saveStoredSession(user, role);
    }
  }

  function clearSession() {
    localStorage.removeItem(KEY_LOGGED_IN);
    localStorage.removeItem(KEY_USER);
    localStorage.removeItem(KEY_ROLE);
    localStorage.removeItem(KEY_NOTICE);
    localStorage.removeItem(LEGACY_STORAGE_KEY);

    const bridge = ensureSupabaseBridge();
    if (bridge && typeof bridge.clearStoredSession === "function") {
      bridge.clearStoredSession();
    }
  }

  function readSession() {
    const bridge = ensureSupabaseBridge();
    if (bridge && typeof bridge.readStoredSession === "function") {
      const storedSession = bridge.readStoredSession();
      if (storedSession && storedSession.loggedIn === "true" && storedSession.user && storedSession.role) {
        return { loggedIn: storedSession.loggedIn, user: storedSession.user, role: storedSession.role };
      }
    }

    const loggedIn = localStorage.getItem(KEY_LOGGED_IN);
    const user = localStorage.getItem(KEY_USER);
    const role = localStorage.getItem(KEY_ROLE);

    if (loggedIn === "true" && user && role) {
      return { loggedIn, user, role };
    }

    const legacy = readLegacySession();
    if (legacy && legacy.username && DEMO_USERS[legacy.username]) {
      const legacyRole = DEMO_USERS[legacy.username].role;
      saveSession(legacy.username, legacyRole);
      return { loggedIn: "true", user: legacy.username, role: legacyRole };
    }

    return null;
  }

  function isValidSession(session) {
    if (!session || session.loggedIn !== "true") return false;
    const knownRoles = ["Chef", "Geschaeftsleitung", "Disposition", "Buchhaltung", "Fahrer", "Werkstatt", "Personalverwaltung", "Qualitaetsmanagement", "Mitarbeiter"];
    if (knownRoles.includes(session.role)) return true;
    const userMeta = DEMO_USERS[session.user];
    if (!userMeta) return false;
    return userMeta.role === session.role;
  }

  function redirectToLogin() {
    window.location.replace("login.html");
  }

  function redirectToDashboardWithNotice(fileName) {
    if (fileName === "benutzer.html") {
      localStorage.setItem(KEY_NOTICE, "Diese Seite ist nur für Chef-Administratoren freigegeben.");
      window.location.replace("index.html");
      return;
    }

    localStorage.setItem(KEY_NOTICE, "Demo-Berechtigung: Diese Seite ist für deine Rolle nicht freigegeben.");
    window.location.replace("index.html");
  }

  function canAccessPage(role, fileName) {
    const allowed = ROLE_PAGE_ACCESS[fileName];
    if (!allowed) return true;
    return allowed.includes(role);
  }

  function getActiveNavKey(fileName) {
    const hash = String(window.location.hash || "").toLowerCase();
    if (fileName === "index.html" && hash === "#dashboard") return "Dashboard";
    if (fileName === "index.html") return "Fahrten";
    if (fileName === "termin-cockpit.html") return "Termin-Cockpit";
    if (fileName === "tagesplanung.html") return "Tagesplanung";
    if (fileName === "fahrer.html") return "Fahrer";
    if (fileName === "fahrzeuge.html") return "Fahrzeuge";
    if (fileName === "live-karte.html") return "Live-Karte";
    if (fileName === "live-dispo.html") return "Live-Dispo";
    if (fileName === "telefonzentrale.html") return "Telefonzentrale";
    if (fileName === "werkstatt.html") return "Werkstatt";
    if (fileName === "kunden.html") return "Kunden";
    if (fileName === "serienfahrten.html") return "Serienfahrten";
    if (fileName === "fahrzeuguebergaben.html") return "Fahrzeugübergaben";
    if (fileName === "abrechnungszentrale.html") return "Abrechnungszentrale";
    if (fileName === "krankenkassen.html") return "Krankenkassen";
    if (fileName === "rechnungen.html") return "Rechnungen";
    if (fileName === "zahlungen.html") return "Zahlungen";
    if (fileName === "mahnwesen.html") return "Mahnwesen";
    if (fileName === "pruefcenter.html") return "Pruefen und Klaeren";
    if (fileName === "monatsabschluss.html") return "Monatsabschluss";
    if (fileName === "controlling.html") return "Controlling";
    if (fileName === "personaluebersicht.html") return "Personaluebersicht";
    if (fileName === "mitarbeiter.html") return "Mitarbeiter";
    if (fileName === "urlaubsplanung.html") return "Urlaubsplanung";
    if (fileName === "abwesenheiten.html") return "Abwesenheiten";
    if (fileName === "dokumentfristen.html") return "Dokumentfristen";
    if (fileName === "schulungen.html") return "Schulungen";
    if (fileName === "mitteilungen.html") return "Mitteilungen";
    if (fileName === "personalaufgaben.html") return "Personalaufgaben";
    if (fileName === "qualitaetsuebersicht.html") return "Qualitaetsuebersicht";
    if (fileName === "beschwerden.html") return "Beschwerden";
    if (fileName === "vorfaelle.html") return "Vorfaelle";
    if (fileName === "unfaelle.html") return "Unfaelle";
    if (fileName === "fundbuero.html") return "Fundbuero";
    if (fileName === "pruefungen.html") return "Pruefungen";
    if (fileName === "massnahmen.html") return "Massnahmen";
    if (fileName === "qualitaetsberichte.html") return "Qualitaetsberichte";
    if (fileName === "geschaeftsfuehrer-dashboard.html") return "Geschaeftsfuehrer-Dashboard";
    if (fileName === "betriebssteuerung.html") return "Betriebssteuerung";
    if (fileName === "kapazitaetsplanung.html") return "Kapazitaetsplanung";
    if (fileName === "nachfrageprognose.html") return "Nachfrageprognose";
    if (fileName === "szenarien.html") return "Szenarien";
    if (fileName === "ziele.html") return "Ziele";
    if (fileName === "entscheidungscenter.html") return "Entscheidungscenter";
    if (fileName === "geschaeftsberichte.html") return "Geschaeftsberichte";
    if (fileName === "kassenuebersicht.html") return "Kassenübersicht";
    if (fileName === "schichtplanung.html") return "Schichtplanung";
    if (fileName === "dokumente.html") return "Dokumente";
    if (fileName === "statistiken.html") return "Statistiken";
    if (fileName === "einstellungen.html") return "Einstellungen";
    if (fileName === "aufgaben-center.html") return "Aufgaben-Center";
    if (fileName === "benachrichtigungen-center.html") return "Benachrichtigungs-Center";
    if (fileName === "rollen-rechte.html") return "Rollen und Rechte";
    if (fileName === "arbeitsplatz.html") return "Mein Arbeitsplatz";
    if (fileName === "benutzer.html") return "Benutzer";
    if (fileName === "verlauf.html") return "Verlauf";
    if (fileName === "export-backup.html") return "Export & Backup";
    if (fileName === "hilfe.html") return "Hilfe";
    return "";
  }

  function renderUnifiedSidebar(role) {
    const nav = document.querySelector(".admin-nav");
    if (!nav) return;

    const allowedLabels = new Set(ROLE_NAV_ACCESS[role] || []);
    const fileName = normalizePath(window.location.pathname);
    const activeNavKey = getActiveNavKey(fileName);

    const byLabel = new Map(
      SIDEBAR_ITEMS
        .filter((item) => allowedLabels.has(item.label))
        .map((item) => [item.label, item])
    );

    let storedGroupState = {};
    try {
      storedGroupState = JSON.parse(localStorage.getItem(KEY_SIDEBAR_GROUP_STATE) || "{}") || {};
    } catch {
      storedGroupState = {};
    }

    const groupsHtml = SIDEBAR_GROUPS
      .map((group) => {
        const items = group.items.map((label) => byLabel.get(label)).filter(Boolean);
        if (!items.length) return "";

        const hasActive = items.some((item) => item.key === activeNavKey);
        const isOpen = storedGroupState[group.key] === undefined ? hasActive : Boolean(storedGroupState[group.key]);
        const groupClass = hasActive ? " is-active-group" : "";
        const collapsedClass = isOpen ? "" : " is-collapsed";

        const linksHtml = items
          .map((item) => {
            const isActive = item.key === activeNavKey;
            const activeClass = isActive ? " is-active" : "";
            const ariaCurrent = isActive ? ' aria-current="page"' : "";
            const text = item.displayLabel || item.label;
            return `<a class="admin-nav-item${activeClass}" href="${item.href}"${ariaCurrent} title="${text}">${text}</a>`;
          })
          .join("");

        return [
          `<section class="admin-nav-group${groupClass}${collapsedClass}" data-admin-nav-group="${group.key}">`,
          `<button class="admin-nav-group-toggle" type="button" data-admin-nav-group-toggle="${group.key}" aria-expanded="${isOpen ? "true" : "false"}">`,
          `<span>${group.label}</span>`,
          '<i aria-hidden="true">▾</i>',
          "</button>",
          `<div class="admin-nav-group-items" data-admin-nav-group-items="${group.key}" ${isOpen ? "" : "hidden"}>${linksHtml}</div>`,
          "</section>"
        ].join("");
      })
      .join("");

    nav.innerHTML = `${groupsHtml}<button class="admin-nav-item admin-logout-btn" type="button" data-admin-logout>Logout</button>`;
  }

  function persistSidebarGroupState() {
    const map = {};
    document.querySelectorAll("[data-admin-nav-group]").forEach((groupNode) => {
      const key = groupNode.getAttribute("data-admin-nav-group") || "";
      if (!key) return;
      map[key] = !groupNode.classList.contains("is-collapsed");
    });
    localStorage.setItem(KEY_SIDEBAR_GROUP_STATE, JSON.stringify(map));
  }

  function bindSidebarGroups() {
    if (window.__adminSidebarGroupClickHandler) {
      document.removeEventListener("click", window.__adminSidebarGroupClickHandler);
    }

    const clickHandler = (event) => {
      const toggle = event.target.closest("[data-admin-nav-group-toggle]");
      if (!toggle) return;

      event.preventDefault();
      const key = toggle.getAttribute("data-admin-nav-group-toggle") || "";
      const itemsNode = document.querySelector(`[data-admin-nav-group-items="${key}"]`);
      const groupNode = document.querySelector(`[data-admin-nav-group="${key}"]`);
      if (!itemsNode) return;

      const open = itemsNode.hidden;
      itemsNode.hidden = !open;
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      if (groupNode) {
        groupNode.classList.toggle("is-collapsed", !open);
      }

      if (open && SIDEBAR_SINGLE_OPEN) {
        document.querySelectorAll("[data-admin-nav-group]").forEach((node) => {
          const otherKey = node.getAttribute("data-admin-nav-group") || "";
          if (!otherKey || otherKey === key) return;
          const otherItems = node.querySelector("[data-admin-nav-group-items]");
          const otherToggle = node.querySelector("[data-admin-nav-group-toggle]");
          if (otherItems) otherItems.hidden = true;
          if (otherToggle) otherToggle.setAttribute("aria-expanded", "false");
          node.classList.add("is-collapsed");
        });
      }

      persistSidebarGroupState();
    };

    document.addEventListener("click", clickHandler);
    window.__adminSidebarGroupClickHandler = clickHandler;
  }

  function injectTopbarQuickCreateActions() {
    const pageName = normalizePath(window.location.pathname);
    if (pageName === "termin-cockpit.html") return;

    const topbarActions = document.querySelector(".admin-topbar-actions");
    if (!topbarActions || topbarActions.querySelector("[data-admin-quick-create-wrap]")) return;

    const wrap = document.createElement("div");
    wrap.className = "admin-quick-create-wrap";
    wrap.setAttribute("data-admin-quick-create-wrap", "");
    wrap.innerHTML = [
      '<button class="admin-btn admin-btn-primary admin-quick-create-main" type="button" aria-haspopup="true" aria-expanded="false" data-admin-quick-create-toggle>+ Neu</button>',
      '<div class="admin-quick-create-menu" data-admin-quick-create-menu hidden>',
      '<a class="admin-quick-create-item" href="termin-schnellerfassung.html" title="Neue Fahrt erfassen"><span aria-hidden="true">🚕</span><b>Neue Fahrt</b><small>Strg+Alt+F</small></a>',
      '<a class="admin-quick-create-item" href="kunden.html" title="Neuen Kunden erfassen"><span aria-hidden="true">👤</span><b>Neuer Kunde</b><small>Strg+Alt+K</small></a>',
      '<a class="admin-quick-create-item" href="mitarbeiter.html" title="Neuen Mitarbeiter anlegen"><span aria-hidden="true">🧑‍💼</span><b>Neuer Mitarbeiter</b><small>Strg+Alt+M</small></a>',
      '<a class="admin-quick-create-item" href="fahrzeuge.html" title="Neues Fahrzeug anlegen"><span aria-hidden="true">🚗</span><b>Neues Fahrzeug</b><small>Strg+Alt+V</small></a>',
      '<a class="admin-quick-create-item" href="aufgaben-center.html" title="Neue Aufgabe im Aufgaben-Center"><span aria-hidden="true">✅</span><b>Neue Aufgabe</b><small>Strg+Alt+A</small></a>',
      '<a class="admin-quick-create-item" href="abwesenheiten.html" title="Neue Abwesenheit erfassen"><span aria-hidden="true">📅</span><b>Abwesenheit</b><small>Strg+Alt+U</small></a>',
      "</div>"
    ].join("");

    topbarActions.prepend(wrap);

    if (!topbarActions.querySelector("[data-admin-mobile-quick-capture]")) {
      const mobileLink = document.createElement("a");
      mobileLink.className = "admin-btn admin-btn-primary admin-mobile-quick-capture";
      mobileLink.href = "termin-schnellerfassung.html";
      mobileLink.setAttribute("data-admin-mobile-quick-capture", "");
      mobileLink.textContent = "+ Termin";
      topbarActions.prepend(mobileLink);
    }

    const existingHandler = window.__adminQuickCreateHandler;
    if (existingHandler) {
      document.removeEventListener("click", existingHandler.click, true);
      document.removeEventListener("keydown", existingHandler.keydown, true);
    }

    const toggle = wrap.querySelector("[data-admin-quick-create-toggle]");
    const menu = wrap.querySelector("[data-admin-quick-create-menu]");
    if (!toggle || !menu) return;

    const setOpen = (open) => {
      menu.hidden = !open;
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      wrap.classList.toggle("is-open", open);
    };

    const onClick = (event) => {
      const clickedToggle = event.target.closest("[data-admin-quick-create-toggle]");
      if (clickedToggle) {
        event.preventDefault();
        event.stopPropagation();
        setOpen(menu.hidden);
        return;
      }

      if (event.target.closest(".admin-quick-create-item")) {
        setOpen(false);
        return;
      }

      if (!wrap.contains(event.target)) {
        setOpen(false);
      }
    };

    const onKeydown = (event) => {
      if (event.key !== "Escape" && event.key !== "Esc") return;
      if (menu.hidden) return;
      setOpen(false);
    };

    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKeydown, true);
    window.__adminQuickCreateHandler = { click: onClick, keydown: onKeydown };
  }

  function normalizeTopbarActions() {
    const topbarActions = document.querySelector(".admin-topbar-actions");
    if (!topbarActions) return;

    const normalizeHref = (value) => {
      const text = String(value || "");
      const split = text.split(/[?#]/)[0] || "";
      return split.split("/").pop() || split;
    };

    topbarActions.querySelectorAll(".admin-topbar-logo").forEach((logo) => logo.remove());

    const bellButtons = Array.from(topbarActions.querySelectorAll("button[aria-label='Benachrichtigungen']"));
    bellButtons.slice(1).forEach((button) => button.remove());

    const roleIndicators = Array.from(topbarActions.querySelectorAll("[data-admin-role-indicator]"));
    roleIndicators.forEach((node) => node.remove());

    const userButtons = Array.from(topbarActions.querySelectorAll(".admin-user"));
    userButtons.slice(1).forEach((button) => button.remove());

    const taskLinks = Array.from(topbarActions.querySelectorAll("a")).filter((link) => normalizeHref(link.getAttribute("href")) === "aufgaben-center.html");
    taskLinks.slice(1).forEach((node) => node.remove());

    const workspaceLinks = Array.from(topbarActions.querySelectorAll("a")).filter((link) => normalizeHref(link.getAttribute("href")) === "arbeitsplatz.html");
    workspaceLinks.slice(1).forEach((node) => node.remove());

    const noticeLinks = Array.from(topbarActions.querySelectorAll("a")).filter((link) => normalizeHref(link.getAttribute("href")) === "benachrichtigungen-center.html");
    noticeLinks.slice(1).forEach((node) => node.remove());

    const quickCreateWrap = topbarActions.querySelector("[data-admin-quick-create-wrap]");
    const links = Array.from(topbarActions.querySelectorAll("a"));
    const taskLink = links.find((link) => normalizeHref(link.getAttribute("href")) === "aufgaben-center.html") || null;
    const noticeLink = links.find((link) => normalizeHref(link.getAttribute("href")) === "benachrichtigungen-center.html") || null;
    const workspaceLink = links.find((link) => normalizeHref(link.getAttribute("href")) === "arbeitsplatz.html") || null;
    const profile = topbarActions.querySelector(".admin-user");

    [quickCreateWrap, taskLink, noticeLink, workspaceLink, profile].forEach((node) => {
      if (node && node.parentElement === topbarActions) {
        topbarActions.append(node);
      }
    });

    const hasNoticeLink = Boolean(noticeLink);
    if (hasNoticeLink) {
      topbarActions.querySelectorAll("button[aria-label='Benachrichtigungen']").forEach((button) => button.remove());
    }
  }

  function setupMobileNavigation() {
    if (window.__adminMobileNavigationBound) return;
    const shell = document.querySelector(".admin-shell");
    const sidebar = document.querySelector(".admin-sidebar");
    const topbarActions = document.querySelector(".admin-topbar-actions");
    if (!shell || !sidebar || !topbarActions) return;

    if (!document.querySelector("[data-admin-menu-toggle]")) {
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "admin-icon-btn admin-menu-toggle";
      toggle.setAttribute("data-admin-menu-toggle", "");
      toggle.setAttribute("aria-label", "Navigation öffnen");
      toggle.innerHTML = "☰";
      topbarActions.prepend(toggle);
    }

    let backdrop = document.querySelector("[data-admin-sidebar-backdrop]");
    if (!backdrop) {
      backdrop = document.createElement("div");
      backdrop.className = "admin-sidebar-backdrop";
      backdrop.setAttribute("data-admin-sidebar-backdrop", "");
      backdrop.hidden = true;
      document.body.append(backdrop);
    }

    function closeSidebar() {
      document.body.classList.remove("admin-sidebar-open");
      backdrop.hidden = true;
    }

    function openSidebar() {
      document.body.classList.add("admin-sidebar-open");
      backdrop.hidden = false;
    }

    document.addEventListener("click", (event) => {
      const toggle = event.target.closest("[data-admin-menu-toggle]");
      if (toggle) {
        event.preventDefault();
        if (document.body.classList.contains("admin-sidebar-open")) {
          closeSidebar();
        } else {
          openSidebar();
        }
        return;
      }

      if (event.target.closest("[data-admin-sidebar-backdrop]")) {
        closeSidebar();
        return;
      }

      const navItem = event.target.closest(".admin-nav-item");
      if (navItem && window.innerWidth <= 1200) {
        closeSidebar();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeSidebar();
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 1200) {
        closeSidebar();
      }
    });

    window.__adminMobileNavigationBound = true;
  }

  function applyDemoLoadingState() {
    const main = document.querySelector(".admin-main");
    if (!main) return;
    main.classList.add("admin-main-loading");
    requestAnimationFrame(() => {
      main.classList.remove("admin-main-loading");
    });
  }

  function ensureHeaderConsistency() {
    const titleWrap = document.querySelector(".admin-topbar-title");
    if (!titleWrap) return;
    if (!titleWrap.querySelector("p")) {
      const subtitle = document.createElement("p");
      subtitle.textContent = "Interner Admin-Bereich mit Demo-Daten";
      titleWrap.append(subtitle);
    }
  }

  function getNotificationsForRole(role) {
    const allowedScopes = new Set(ROLE_NOTIFICATION_SCOPES[role] || []);
    const demoRows = DEMO_NOTIFICATIONS.filter((item) => {
      const scopes = Array.isArray(item.scopes) ? item.scopes : [item.scope];
      return scopes.some((scope) => allowedScopes.has(scope));
    }).map((item) => ({
      ...item,
      sourceType: "demo",
      status: NOTIFICATION_OPEN_STATUS,
      read: false
    }));

    if (!window.AdminSystemCenter) return demoRows;
    try {
      const state = window.AdminSystemCenter.loadState();
      const sources = window.AdminSystemCenter.loadSources();
      const rows = window.AdminSystemCenter.allNotifications(state, sources)
        .filter((item) => {
          const assignee = String(item.assignedTo || "").toLowerCase();
          if (!assignee) return true;
          if (role === "Chef" || role === "Geschaeftsleitung") return true;
          if (role === "Disposition") return assignee.includes("dispo") || assignee.includes("telefon");
          if (role === "Buchhaltung") return assignee.includes("buch");
          if (role === "Personalverwaltung") return assignee.includes("personal");
          if (role === "Qualitaetsmanagement") return assignee.includes("qualitaet");
          if (role === "Werkstatt") return assignee.includes("werkstatt") || assignee.includes("flotte");
          if (role === "Fahrer") return assignee.includes("fahrer");
          if (role === "Mitarbeiter") return assignee.includes("mitarbeiter");
          return true;
        })
        .slice(0, 5)
        .map((item) => ({
          id: item.id,
          title: item.title,
          text: item.message,
          time: window.AdminSystemCenter.formatDateTime(item.timestamp),
          type: item.priority === "kritisch" ? "Kritisch" : item.priority === "dringend" || item.priority === "wichtig" ? "Warnung" : "Info",
          category: item.category || "System",
          scope: "Management",
          sourceType: "system",
          status: String(item.status || NOTIFICATION_OPEN_STATUS).toLowerCase(),
          read: ["gelesen", "bestaetigt", "erledigt", "archiviert"].includes(String(item.status || "").toLowerCase())
        }));
      return [...rows, ...demoRows];
    } catch {
      return demoRows;
    }
  }

  let systemCenterLoadPromise = null;
  let uiTextLoadPromise = null;

  function ensureUiTextReady() {
    if (window.AdminUiText) return Promise.resolve(window.AdminUiText);
    if (uiTextLoadPromise) return uiTextLoadPromise;

    uiTextLoadPromise = new Promise((resolve) => {
      const loadScript = (selector, src) => {
        return new Promise((done) => {
          const existing = document.querySelector(selector);
          if (existing) {
            if (src.endsWith("ui-visible-terms.js") && window.AdminUiVisibleTerms) {
              done();
              return;
            }
            if (src.endsWith("ui-text.js") && window.AdminUiText) {
              done();
              return;
            }
            existing.addEventListener("load", () => done(), { once: true });
            existing.addEventListener("error", () => done(), { once: true });
            return;
          }

          const script = document.createElement("script");
          script.src = src;
          script.defer = true;
          script.addEventListener("load", () => done(), { once: true });
          script.addEventListener("error", () => done(), { once: true });
          document.head.append(script);
        });
      };

      loadScript('script[src$="ui-visible-terms.js"]', "ui-visible-terms.js")
        .then(() => loadScript('script[src$="ui-text.js"]', "ui-text.js"))
        .then(() => resolve(window.AdminUiText || null));
    });

    return uiTextLoadPromise;
  }

  function ensureSystemCenterReady() {
    if (window.AdminSystemCenter) return Promise.resolve(window.AdminSystemCenter);
    if (systemCenterLoadPromise) return systemCenterLoadPromise;

    systemCenterLoadPromise = new Promise((resolve) => {
      const existing = document.querySelector('script[src$="systemcenter-shared.js"]');
      if (existing) {
        existing.addEventListener("load", () => resolve(window.AdminSystemCenter || null), { once: true });
        existing.addEventListener("error", () => resolve(null), { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = "systemcenter-shared.js";
      script.defer = true;
      script.addEventListener("load", () => resolve(window.AdminSystemCenter || null), { once: true });
      script.addEventListener("error", () => resolve(null), { once: true });
      document.head.append(script);
    });

    return systemCenterLoadPromise;
  }

  function isTypingField(target) {
    if (!(target instanceof Element)) return false;
    if (target.isContentEditable) return true;
    const tag = target.tagName;
    if (tag === "TEXTAREA" || tag === "SELECT") return true;
    if (tag === "INPUT") {
      const type = String(target.getAttribute("type") || "text").toLowerCase();
      return ["text", "search", "email", "number", "password", "tel", "url", "date", "datetime-local", "month", "time", "week"].includes(type);
    }
    return false;
  }

  function injectSystemEntryButtons(role, user) {
    const topbar = document.querySelector(".admin-topbar");
    if (!topbar) return;

    let actions = document.querySelector(".admin-topbar-actions");
    if (!actions) {
      actions = document.createElement("div");
      actions.className = "admin-topbar-actions";
      topbar.append(actions);
    }

    if (!actions || actions.querySelector("[data-v20-open-tasks]")) return;

    actions.querySelectorAll("button[aria-label='Benachrichtigungen']").forEach((node) => node.remove());

    const taskLink = document.createElement("a");
    taskLink.className = "admin-btn admin-btn-secondary admin-v20-quick-link";
    taskLink.href = "aufgaben-center.html";
    taskLink.setAttribute("data-v20-open-tasks", "");
    taskLink.innerHTML = '<span>Aufgaben</span><b data-v20-open-tasks-count hidden></b>';

    const noticeLink = document.createElement("a");
    noticeLink.className = "admin-btn admin-btn-secondary admin-v20-quick-link";
    noticeLink.href = "benachrichtigungen-center.html";
    noticeLink.setAttribute("data-v20-open-notices", "");
    noticeLink.innerHTML = '<span>Meldungen</span><b data-v20-open-notices-count hidden></b>';

    const workspaceLink = document.createElement("a");
    workspaceLink.className = "admin-btn admin-btn-secondary admin-v20-quick-link is-subtle";
    workspaceLink.href = "arbeitsplatz.html";
    workspaceLink.textContent = "Arbeitsplatz";

    actions.prepend(workspaceLink);
    actions.prepend(noticeLink);
    actions.prepend(taskLink);

    if (!actions.querySelector(".admin-user")) {
      const profile = document.createElement("button");
      profile.className = "admin-user admin-user-compact";
      profile.type = "button";
      profile.setAttribute("aria-label", "Benutzer");
      const displayRole = role === "Chef" ? "Geschaeftsleitung" : role || "Leitung";
      const rawUser = String(user || localStorage.getItem(KEY_USER) || "Enes");
      const normalizedUser = rawUser.toLowerCase() === "admin" ? "Enes" : rawUser;
      const displayUser = normalizedUser ? `${normalizedUser.charAt(0).toUpperCase()}${normalizedUser.slice(1)}` : "Enes";
      profile.innerHTML = `<strong>${displayUser}</strong><span>${displayRole}</span>`;
      actions.append(profile);
    }

    injectTopbarQuickCreateActions();
    normalizeTopbarActions();

    if (role !== "Chef" && role !== "Geschaeftsleitung") {
      const roleLink = document.querySelector('a[href="rollen-rechte.html"]');
      if (roleLink) roleLink.remove();
    }
  }

  function updateSystemEntryBadges(role, user) {
    if (!window.AdminSystemCenter) return;
    const taskCount = document.querySelector("[data-v20-open-tasks-count]");
    const noticeCount = document.querySelector("[data-v20-open-notices-count]");
    if (!taskCount && !noticeCount) return;

    const fallbackRole = localStorage.getItem(KEY_ROLE) || "Chef";
    const fallbackUser = localStorage.getItem(KEY_USER) || "admin";

    const state = window.AdminSystemCenter.loadState();
    const sources = window.AdminSystemCenter.loadSources();
    const tasks = window.AdminSystemCenter.allTasks(state, sources);
    const notices = window.AdminSystemCenter.allNotifications(state, sources);

    const roleNeedle = String(role || fallbackRole).toLowerCase();
    const userNeedle = String(user || fallbackUser).toLowerCase();

    const openTaskCount = tasks.filter((task) => {
      const status = String(task.status || "").toLowerCase();
      if (["erledigt", "storniert"].includes(status)) return false;
      const owner = String(task.owner || "").toLowerCase();
      if (!owner) return true;
      if (roleNeedle === "chef" || roleNeedle === "geschaeftsleitung") return true;
      return owner.includes(roleNeedle) || (userNeedle && owner.includes(userNeedle));
    }).length;

    const unreadNoticeCount = notices.filter((item) => {
      const status = String(item.status || "").toLowerCase();
      if (["gelesen", "bestaetigt", "erledigt", "archiviert"].includes(status)) return false;
      const assignee = String(item.assignedTo || "").toLowerCase();
      if (!assignee) return true;
      if (roleNeedle === "chef" || roleNeedle === "geschaeftsleitung") return true;
      return assignee.includes(roleNeedle) || (userNeedle && assignee.includes(userNeedle));
    }).length;

    const roleNotifications = getNotificationsForRole(role || fallbackRole)
      .map((item) => {
        const statusMap = getNotificationStatusMapForRole(role || fallbackRole);
        const status = String(statusMap[item.id] || item.status || NOTIFICATION_OPEN_STATUS).toLowerCase();
        return { ...item, status };
      })
      .filter((item) => !isClosedNotificationStatus(item.status));

    const unifiedOpenNoticeCount = Math.max(unreadNoticeCount, roleNotifications.length);

    if (taskCount) {
      taskCount.textContent = String(openTaskCount);
      taskCount.hidden = openTaskCount === 0;
    }

    if (noticeCount) {
      noticeCount.textContent = String(unifiedOpenNoticeCount);
      noticeCount.hidden = unifiedOpenNoticeCount === 0;
    }
  }

  function refreshV20Badges(roleArg, userArg) {
    const fallbackRole = localStorage.getItem(KEY_ROLE) || "Chef";
    const fallbackUser = localStorage.getItem(KEY_USER) || "admin";
    updateSystemEntryBadges(roleArg || fallbackRole, userArg || fallbackUser);
  }

  window.__adminV20RefreshBadges = refreshV20Badges;

  function renderGlobalSearchResults(state, sources, query, filter) {
    const container = document.querySelector("[data-v20-global-search-results]");
    if (!container || !window.AdminSystemCenter) return;

    const rows = window.AdminSystemCenter.search(state, sources, query, { filter }).slice(0, V20_SEARCH_LIMIT);
    if (!rows.length) {
      container.innerHTML = '<p class="admin-v20-search-empty">Keine Treffer</p>';
      return;
    }

    container.innerHTML = rows
      .map((item) => {
        return [
          `<a class="admin-v20-search-item" href="${item.link || '#'}" data-v20-search-link data-v20-title="${item.title}" data-v20-category="${item.category}">`,
          '<span class="admin-v20-search-icon" aria-hidden="true">',
          item.icon || "#",
          "</span>",
          '<span class="admin-v20-search-copy">',
          `<strong>${item.title}</strong>`,
          `<small>${item.category}${item.status ? ` · ${item.status}` : ""}</small>`,
          "</span>",
          "</a>"
        ].join("");
      })
      .join("");
  }

  function setupGlobalSystemSearch(role, user) {
    if (!window.AdminSystemCenter) return;

    const topbar = document.querySelector(".admin-topbar");
    const actions = document.querySelector(".admin-topbar-actions");
    if (!topbar || !actions || document.querySelector("[data-v20-global-search-wrap]")) return;

    const searchWrap = document.createElement("div");
    searchWrap.className = "admin-v20-search-wrap";
    searchWrap.setAttribute("data-v20-global-search-wrap", "");
    searchWrap.innerHTML = [
      '<input class="admin-v20-search-input" type="search" data-v20-global-search-input placeholder="Systemweit suchen (Ctrl/Cmd+K)" aria-label="Systemweite Suche">',
      '<button class="admin-v20-search-filter" type="button" data-v20-global-search-filter aria-label="Suchoptionen" title="Suchoptionen">Filter</button>'
    ].join("");

    topbar.insertBefore(searchWrap, actions);

    const input = searchWrap.querySelector("[data-v20-global-search-input]");
    const filter = searchWrap.querySelector("[data-v20-global-search-filter]");
    let panel = null;
    const state = window.AdminSystemCenter.loadState();
    const sources = window.AdminSystemCenter.loadSources();

    const ensurePanel = () => {
      if (panel && panel.isConnected) return panel;
      panel = document.createElement("section");
      panel.className = "admin-v20-search-results";
      panel.setAttribute("data-v20-global-search-results", "");
      panel.hidden = true;
      searchWrap.append(panel);
      return panel;
    };

    const hidePanel = () => {
      if (!panel) return;
      panel.hidden = true;
      panel.innerHTML = "";
      panel.remove();
      panel = null;
    };

    const refresh = () => {
      const query = String(input.value || "").trim();
      if (!query) {
        hidePanel();
        return;
      }
      const activePanel = ensurePanel();
      renderGlobalSearchResults(state, sources, query, "alle");
      activePanel.hidden = false;
    };

    input.addEventListener("input", refresh);
    if (filter) {
      filter.addEventListener("click", () => {
        if (typeof window.__adminV20OpenPalette === "function") {
          window.__adminV20OpenPalette(input.value || "");
        }
      });
    }

    searchWrap.addEventListener("click", (event) => {
      const link = event.target.closest("[data-v20-search-link]");
      if (!link) return;
      const title = link.getAttribute("data-v20-title") || "";
      const category = link.getAttribute("data-v20-category") || "Allgemein";
      window.AdminSystemCenter.addRecent(state, { title, category, link: link.getAttribute("href") || "" });
      window.AdminSystemCenter.addSearchHistory(state, input.value || "");
    });

    const previousSearchClick = window.__adminV20SearchOutsideHandler;
    if (previousSearchClick) {
      document.removeEventListener("pointerdown", previousSearchClick, true);
    }

    const clickOutside = (event) => {
      if (!(event.target instanceof Node)) return;
      if (searchWrap.contains(event.target)) return;
      if (panel) panel.hidden = true;
    };
    document.addEventListener("pointerdown", clickOutside, true);
    window.__adminV20SearchOutsideHandler = clickOutside;

    window.__adminV20FocusSearch = () => {
      input.focus();
      input.select();
      refresh();
    };

    injectSystemEntryButtons(role, user);
    updateSystemEntryBadges(role, user);
  }

  function setupCommandPalette(role, user) {
    if (!window.AdminSystemCenter || document.querySelector("[data-v20-command-palette]")) return;

    const palette = document.createElement("section");
    palette.className = "admin-v20-palette";
    palette.setAttribute("data-v20-command-palette", "");
    palette.hidden = true;
    palette.innerHTML = [
      '<div class="admin-v20-palette-backdrop" data-v20-palette-close></div>',
      '<div class="admin-v20-palette-dialog" role="dialog" aria-modal="true" aria-label="Command Palette">',
      '<header class="admin-v20-palette-head">',
      '<input type="search" class="admin-v20-palette-input" data-v20-palette-input placeholder="Befehl oder Datensatz suchen...">',
      '<div class="admin-v20-palette-hint">Esc schliesst · Enter oeffnet</div>',
      '</header>',
      '<div class="admin-v20-palette-list" data-v20-palette-list></div>',
      '</div>'
    ].join("");
    document.body.append(palette);

    const input = palette.querySelector("[data-v20-palette-input]");
    const list = palette.querySelector("[data-v20-palette-list]");

    function close() {
      palette.hidden = true;
      document.body.classList.remove("admin-v20-palette-open");
    }

    function open(prefill) {
      palette.hidden = false;
      document.body.classList.add("admin-v20-palette-open");
      input.value = prefill || "";
      input.focus();
      input.select();
      render(prefill || "");
    }

    function buildCommandRows(term) {
      const state = window.AdminSystemCenter.loadState();
      const sources = window.AdminSystemCenter.loadSources();
      const searchRows = window.AdminSystemCenter.search(state, sources, term, { filter: "alle" }).slice(0, 7);
      const commands = [
        { title: "Aufgaben-Center oeffnen", category: "Befehl", info: "Neue oder offene Aufgaben steuern", link: "aufgaben-center.html" },
        { title: "Benachrichtigungs-Center oeffnen", category: "Befehl", info: "Ungelesene Meldungen bearbeiten", link: "benachrichtigungen-center.html" },
        { title: "Arbeitsplatz oeffnen", category: "Befehl", info: "Persoenliche Ansicht und Favoriten", link: "arbeitsplatz.html" },
        { title: "Rollen und Rechte oeffnen", category: "Befehl", info: "Rollenmatrix und Rollenvorschau", link: "rollen-rechte.html" },
        { title: "Globales Suchfeld fokussieren", category: "Befehl", info: "Schnellsuche im Header", action: "focus-search" }
      ];
      const commandRows = commands.filter((row) => !term || `${row.title} ${row.info}`.toLowerCase().includes(term.toLowerCase()));
      return [...commandRows, ...searchRows];
    }

    function render(term) {
      const rows = buildCommandRows(term);
      if (!rows.length) {
        list.innerHTML = '<p class="admin-v20-search-empty">Keine Ergebnisse</p>';
        return;
      }
      list.innerHTML = rows
        .map((row, index) => {
          const href = row.link || "#";
          const action = row.action ? ` data-v20-palette-action="${row.action}"` : "";
          const activeClass = index === 0 ? " is-active" : "";
          return `<a class="admin-v20-palette-item${activeClass}" href="${href}"${action}><strong>${row.title}</strong><small>${row.category}${row.info ? ` · ${row.info}` : ""}</small></a>`;
        })
        .join("");
    }

    palette.addEventListener("click", (event) => {
      if (event.target.closest("[data-v20-palette-close]")) {
        close();
        return;
      }

      const item = event.target.closest(".admin-v20-palette-item");
      if (!item) return;

      const action = item.getAttribute("data-v20-palette-action");
      if (action === "focus-search") {
        event.preventDefault();
        close();
        if (typeof window.__adminV20FocusSearch === "function") {
          window.__adminV20FocusSearch();
        }
      }
    });

    input.addEventListener("input", () => render(String(input.value || "").trim()));
    input.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        close();
      }
    });

    const previousHotkeys = window.__adminV20HotkeysHandler;
    if (previousHotkeys) {
      document.removeEventListener("keydown", previousHotkeys, true);
    }

    const hotkeys = (event) => {
      const target = event.target;
      const typing = isTypingField(target instanceof Element ? target : null);
      const key = String(event.key || "").toLowerCase();

      if ((event.ctrlKey || event.metaKey) && key === V20_SHORTCUT) {
        event.preventDefault();
        open(typing ? "" : "");
        return;
      }

      if (key === "escape" && !palette.hidden) {
        event.preventDefault();
        close();
        return;
      }

      if (!typing && key === "/") {
        event.preventDefault();
        if (typeof window.__adminV20FocusSearch === "function") {
          window.__adminV20FocusSearch();
        }
      }
    };

    document.addEventListener("keydown", hotkeys, true);
    window.__adminV20HotkeysHandler = hotkeys;

    window.__adminV20OpenPalette = open;

    injectSystemEntryButtons(role, user);
  }

  function initV20Productivity(role, user) {
    ensureSystemCenterReady().then((system) => {
      if (!system) return;
      setupGlobalSystemSearch(role, user);
      setupCommandPalette(role, user);
      updateSystemEntryBadges(role, user);
    });
  }

  function readNotificationStateStore() {
    try {
      const raw = localStorage.getItem(KEY_DEMO_NOTIFICATIONS) || localStorage.getItem(KEY_DEMO_NOTIFICATIONS_LEGACY);
      if (!raw) return { byRole: {} };
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return { byRole: {} };

      if (!parsed.byRoleStatus || typeof parsed.byRoleStatus !== "object") {
        parsed.byRoleStatus = {};
      }

      if (parsed.byRole && typeof parsed.byRole === "object") {
        Object.entries(parsed.byRole).forEach(([role, ids]) => {
          if (!Array.isArray(ids)) return;
          if (!parsed.byRoleStatus[role] || typeof parsed.byRoleStatus[role] !== "object") {
            parsed.byRoleStatus[role] = {};
          }
          ids.forEach((id) => {
            const key = String(id || "").trim();
            if (!key) return;
            if (!parsed.byRoleStatus[role][key]) {
              parsed.byRoleStatus[role][key] = "gelesen";
            }
          });
        });
      }

      if (localStorage.getItem(KEY_DEMO_NOTIFICATIONS_LEGACY) && !localStorage.getItem(KEY_DEMO_NOTIFICATIONS)) {
        writeNotificationStateStore(parsed);
        localStorage.removeItem(KEY_DEMO_NOTIFICATIONS_LEGACY);
      }

      return parsed;
    } catch {
      return { byRole: {} };
    }
  }

  function writeNotificationStateStore(store) {
    try {
      localStorage.setItem(KEY_DEMO_NOTIFICATIONS, JSON.stringify(store));
    } catch {
      // Demo-only: ignore storage failures.
    }
  }

  function isClosedNotificationStatus(status) {
    const normalized = String(status || "").toLowerCase();
    return ["gelesen", "bestaetigt", "erledigt", "archiviert", "dismissed", "closed", "read", "confirmed", "done", "archived"].includes(normalized);
  }

  function mapActionToNotificationStatus(action) {
    if (action === "archive") return "archiviert";
    if (action === "confirm") return "bestaetigt";
    return "gelesen";
  }

  function getNotificationStatusMapForRole(role) {
    const store = readNotificationStateStore();
    const byRoleStatus = store && typeof store.byRoleStatus === "object" ? store.byRoleStatus : {};
    const roleMap = byRoleStatus[role];
    if (!roleMap || typeof roleMap !== "object") return {};
    return { ...roleMap };
  }

  function persistNotificationStatusMapForRole(role, notifications) {
    const store = readNotificationStateStore();
    if (!store.byRoleStatus || typeof store.byRoleStatus !== "object") {
      store.byRoleStatus = {};
    }

    const statusMap = {};
    notifications.forEach((item) => {
      if (!item || !item.id) return;
      const status = String(item.status || NOTIFICATION_OPEN_STATUS).toLowerCase();
      if (status === NOTIFICATION_OPEN_STATUS) return;
      statusMap[String(item.id)] = status;
    });

    store.byRoleStatus[role] = statusMap;
    if (!store.byRole || typeof store.byRole !== "object") {
      store.byRole = {};
    }

    store.byRole[role] = Object.keys(statusMap).filter((id) => statusMap[id] === "gelesen");

    store.updatedAt = new Date().toISOString();
    writeNotificationStateStore(store);
  }

  function typeClassName(type) {
    const normalized = String(type || "").toLowerCase();
    if (normalized === "warnung") return "is-warning";
    if (normalized === "kritisch") return "is-critical";
    if (normalized === "erfolg") return "is-success";
    return "is-info";
  }

  function scoreType(type) {
    const normalized = String(type || "").toLowerCase();
    if (normalized === "kritisch") return 4;
    if (normalized === "warnung") return 3;
    if (normalized === "info") return 2;
    if (normalized === "erfolg") return 1;
    return 0;
  }

  function renderDashboardHints(main, notifications) {
    if (!main || normalizePath(window.location.pathname) !== "index.html") return;

    let panel = main.querySelector("[data-admin-dashboard-hints]");
    if (!panel) {
      panel = document.createElement("section");
      panel.className = "admin-panel admin-hints-panel";
      panel.setAttribute("data-admin-dashboard-hints", "");
      panel.innerHTML = [
        '<div class="admin-panel-head">',
        '<h2>Aktuelle Hinweise</h2>',
        '<small class="admin-hints-subtitle">Top 3 offene Meldungen</small>',
        "</div>",
        '<div class="admin-hints-list" data-admin-hints-list></div>'
      ].join("");

      const firstPanel = main.querySelector(".admin-panel, .ride-grid, .billing-grid, .customer-grid, .driver-grid, .vehicle-grid, .shift-layout");
      if (firstPanel) {
        main.insertBefore(panel, firstPanel);
      } else {
        main.append(panel);
      }
    }

    const list = panel.querySelector("[data-admin-hints-list]");
    if (!list) return;

    const topOpen = notifications
      .filter((item) => !isClosedNotificationStatus(item.status))
      .sort((a, b) => scoreType(b.type) - scoreType(a.type))
      .slice(0, DEMO_NOTIFICATION_LIMIT);

    panel.hidden = topOpen.length === 0;

    if (!topOpen.length) {
      list.innerHTML = '<p class="admin-hints-empty">Keine offenen Hinweise.</p>';
      return;
    }

    list.innerHTML = topOpen
      .map((item) => {
        return [
          `<article class="admin-hint-item ${typeClassName(item.type)}">`,
          `<strong>${item.title}</strong>`,
          `<p>${item.text}</p>`,
          '<div class="admin-hint-meta">',
          `<span>${item.time}</span>`,
          `<span class="admin-hint-category">${item.category}</span>`,
          "</div>",
          '<div class="admin-notification-actions">',
          `<button class="admin-btn admin-btn-secondary admin-notification-read-btn" type="button" data-admin-hint-action="close" data-admin-hint-id="${item.id}">Schließen</button>`,
          `<button class="admin-btn admin-btn-secondary" type="button" data-admin-hint-action="confirm" data-admin-hint-id="${item.id}">Bestätigen</button>`,
          `<button class="admin-btn admin-btn-secondary" type="button" data-admin-hint-action="archive" data-admin-hint-id="${item.id}">Archivieren</button>`,
          "</div>",
          "</article>"
        ].join("");
      })
      .join("");
  }

  function setupNotificationCenter(role) {
    const topbar = document.querySelector(".admin-topbar");
    if (!topbar) return;

    let actions = document.querySelector(".admin-topbar-actions");
    if (!actions) {
      actions = document.createElement("div");
      actions.className = "admin-topbar-actions";
      topbar.append(actions);
    }

    if (document.querySelector("[data-dispo-notify-toggle]")) {
      return;
    }

    if (actions.querySelector('[data-v20-open-notices]')) {
      return;
    }

    if (!actions.querySelector("button[aria-label='Benachrichtigungen']")) {
      const bell = document.createElement("button");
      bell.className = "admin-icon-btn";
      bell.type = "button";
      bell.setAttribute("aria-label", "Benachrichtigungen");
      bell.innerHTML = '<span>🔔</span><b></b>';
      actions.append(bell);
    }

    const bellButton = actions.querySelector('button[aria-label="Benachrichtigungen"]');
    if (!bellButton) return;

    if (bellButton.dataset.notificationCenterInitialized === "true") return;
    bellButton.dataset.notificationCenterInitialized = "true";

    bellButton.classList.add("admin-notification-trigger");
    bellButton.setAttribute("aria-haspopup", "true");
    bellButton.setAttribute("aria-expanded", "false");

    const badge = bellButton.querySelector("b") || (() => {
      const node = document.createElement("b");
      bellButton.append(node);
      return node;
    })();

    const notifications = getNotificationsForRole(role);
    const statusMap = getNotificationStatusMapForRole(role);
    notifications.forEach((item) => {
      item.status = String(statusMap[item.id] || item.status || NOTIFICATION_OPEN_STATUS).toLowerCase();
      item.read = isClosedNotificationStatus(item.status);
    });

    const state = {
      role,
      notifications,
      openCount: 0,
      autoHideTimers: {}
    };

    let panel = topbar.querySelector("[data-admin-notification-panel]");
    if (!panel) {
      panel = document.createElement("section");
      panel.className = "admin-notification-panel";
      panel.setAttribute("data-admin-notification-panel", "");
      panel.hidden = true;
      panel.setAttribute("aria-hidden", "true");
      panel.innerHTML = [
        '<header class="admin-notification-head">',
        '<div class="admin-notification-head-copy">',
        "<strong>Notification Center</strong>",
        '<small data-admin-notification-open-count></small>',
        "</div>",
        '<button class="admin-btn admin-btn-secondary" type="button" data-admin-notification-read-all>Alle als gelesen</button>',
        "</header>",
        '<p class="admin-notification-empty admin-notification-empty-center" data-admin-notification-empty-all hidden>Keine Benachrichtigungen vorhanden</p>',
        '<p class="admin-notification-empty" data-admin-notification-unread-empty hidden>Keine ungelesenen Benachrichtigungen</p>',
        '<div class="admin-notification-list" data-admin-notification-list></div>',
        '<p class="admin-notification-footnote">Demo-Modus: nur lokal gespeichert</p>'
      ].join("");
      topbar.append(panel);
    }

    const countNode = panel.querySelector("[data-admin-notification-open-count]");
    const listNode = panel.querySelector("[data-admin-notification-list]");
    const readAllButton = panel.querySelector("[data-admin-notification-read-all]");
    const unreadEmptyNode = panel.querySelector("[data-admin-notification-unread-empty]");
    const emptyAllNode = panel.querySelector("[data-admin-notification-empty-all]");
    const main = document.querySelector(".admin-main");

    function renderNotificationCenter() {
      const openNotifications = state.notifications.filter((item) => !isClosedNotificationStatus(item.status));
      state.openCount = openNotifications.length;
      const hasNotifications = state.notifications.length > 0;

      badge.textContent = state.openCount > 0 ? String(state.openCount) : "";
      badge.hidden = state.openCount === 0;
      badge.setAttribute("aria-hidden", state.openCount === 0 ? "true" : "false");

      if (countNode) {
        countNode.textContent = `${state.openCount} offen`;
      }

      if (readAllButton) {
        const disableReadAll = !hasNotifications || state.openCount === 0;
        readAllButton.disabled = disableReadAll;
        readAllButton.hidden = disableReadAll;
      }

      if (unreadEmptyNode) {
        unreadEmptyNode.hidden = !(hasNotifications && state.openCount === 0);
      }

      if (emptyAllNode) {
        emptyAllNode.hidden = hasNotifications;
      }

      if (listNode) {
        if (!hasNotifications) {
          listNode.innerHTML = "";
        } else {
          listNode.innerHTML = openNotifications
            .map((item) => {
              const readClass = item.read ? "is-read" : "";
              return [
                `<article class="admin-notification-item ${typeClassName(item.type)} ${readClass}" data-admin-notification-id="${item.id}">`,
                '<div class="admin-notification-row">',
                '<div class="admin-notification-title-wrap">',
                '<span class="admin-notification-dot" aria-hidden="true"></span>',
                `<h3>${item.title}</h3>`,
                "</div>",
                `<span class="admin-notification-type">${item.type}</span>`,
                "</div>",
                `<p>${item.text}</p>`,
                '<div class="admin-notification-meta">',
                `<span class="admin-notification-time">${item.time}</span>`,
                `<span class="admin-notification-category">${item.category}</span>`,
                `<span class="admin-notification-read-state">${item.read ? "✓ Gelesen" : "Ungelesen"}</span>`,
                "</div>",
                '<div class="admin-notification-actions">',
                `<button class="admin-btn admin-btn-secondary admin-notification-read-btn" type="button" data-admin-notification-action="close" data-admin-notification-id="${item.id}">Schließen</button>`,
                `<button class="admin-btn admin-btn-secondary" type="button" data-admin-notification-action="confirm" data-admin-notification-id="${item.id}">Bestätigen</button>`,
                `<button class="admin-btn admin-btn-secondary" type="button" data-admin-notification-action="archive" data-admin-notification-id="${item.id}">Archivieren</button>`,
                `<button class="admin-btn admin-btn-secondary admin-notification-detail-btn" type="button" data-admin-notification-action="details" data-admin-notification-id="${item.id}">Details Demo</button>`,
                "</div>",
                "</article>"
              ].join("");
            })
            .join("");
        }
      }

      persistNotificationStatusMapForRole(state.role, state.notifications);

      if (typeof window.__adminV20RefreshBadges === "function") {
        window.__adminV20RefreshBadges(role, localStorage.getItem(KEY_USER) || "admin");
      }

      // Leitstellenmodus: kein separates Hinweisbanner in der Standardansicht.

      Object.keys(state.autoHideTimers).forEach((id) => {
        const isStillOpen = openNotifications.some((entry) => entry.id === id);
        if (isStillOpen) return;
        clearTimeout(state.autoHideTimers[id]);
        delete state.autoHideTimers[id];
      });

      openNotifications.forEach((item) => {
        if (typeClassName(item.type) === "is-critical") return;
        if (state.autoHideTimers[item.id]) return;
        state.autoHideTimers[item.id] = window.setTimeout(() => {
          const target = state.notifications.find((entry) => entry.id === item.id);
          if (!target || isClosedNotificationStatus(target.status)) return;
          target.status = "gelesen";
          target.read = true;
          if (target.sourceType === "system" && window.AdminSystemCenter) {
            const systemState = window.AdminSystemCenter.loadState();
            window.AdminSystemCenter.updateNotification(systemState, target.id, { status: "gelesen" }, "System");
          }
          renderNotificationCenter();
        }, NOTIFICATION_AUTO_HIDE_MS);
      });
    }

    function updateNotificationLifecycle(item, action) {
      const nextStatus = mapActionToNotificationStatus(action);
      item.status = nextStatus;
      item.read = isClosedNotificationStatus(nextStatus);
      if (item.sourceType === "system" && window.AdminSystemCenter) {
        const systemState = window.AdminSystemCenter.loadState();
        window.AdminSystemCenter.updateNotification(systemState, item.id, { status: nextStatus }, localStorage.getItem(KEY_USER) || "System");
      }
    }

    function isNotificationPanelOpen() {
      return !panel.hidden;
    }

    function openNotificationPanel() {
      panel.hidden = false;
      panel.setAttribute("aria-hidden", "false");
      bellButton.setAttribute("aria-expanded", "true");
    }

    function closeNotificationPanel() {
      panel.hidden = true;
      panel.setAttribute("aria-hidden", "true");
      bellButton.setAttribute("aria-expanded", "false");
    }

    function toggleNotificationPanel() {
      if (isNotificationPanelOpen()) {
        closeNotificationPanel();
        return;
      }
      openNotificationPanel();
    }

    const bellClickHandler = (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggleNotificationPanel();
    };

    bellButton.addEventListener("click", bellClickHandler);

    const panelClickHandler = (event) => {
      event.stopPropagation();
      const readAll = event.target.closest("[data-admin-notification-read-all]");
      if (readAll) {
        state.notifications.forEach((item) => {
          updateNotificationLifecycle(item, "close");
        });
        renderNotificationCenter();
        return;
      }

      const hintAction = event.target.closest("[data-admin-hint-action]");
      if (hintAction) {
        const id = hintAction.getAttribute("data-admin-hint-id");
        const action = hintAction.getAttribute("data-admin-hint-action") || "close";
        const item = state.notifications.find((entry) => entry.id === id);
        if (!item) return;
        updateNotificationLifecycle(item, action);
        renderNotificationCenter();
        return;
      }

      const actionBtn = event.target.closest("[data-admin-notification-action]");
      if (!actionBtn) return;

      const id = actionBtn.getAttribute("data-admin-notification-id");
      const action = actionBtn.getAttribute("data-admin-notification-action");
      const item = state.notifications.find((entry) => entry.id === id);
      if (!item) return;

      if (action === "read" || action === "close" || action === "confirm" || action === "archive") {
        if (isClosedNotificationStatus(item.status)) return;
        updateNotificationLifecycle(item, action);
        renderNotificationCenter();
        return;
      }

      if (action === "details") {
        updateNotificationLifecycle(item, "close");
        window.alert(`Demo-Details: ${item.title}\n${item.text}`);
        renderNotificationCenter();
      }
    };

    panel.addEventListener("click", panelClickHandler);

    const previousHintHandler = window.__adminHintActionHandler;
    if (previousHintHandler) {
      document.removeEventListener("click", previousHintHandler, true);
    }

    const hintHandler = (event) => {
      const actionBtn = event.target.closest("[data-admin-hint-action]");
      if (!actionBtn) return;
      event.preventDefault();
      const id = actionBtn.getAttribute("data-admin-hint-id");
      const action = actionBtn.getAttribute("data-admin-hint-action") || "close";
      const item = state.notifications.find((entry) => entry.id === id);
      if (!item) return;
      updateNotificationLifecycle(item, action);
      renderNotificationCenter();
    };

    document.addEventListener("click", hintHandler, true);
    window.__adminHintActionHandler = hintHandler;

    const previousGlobalHandlers = window.__adminNotificationGlobalHandlers;
    if (previousGlobalHandlers) {
      document.removeEventListener("pointerdown", previousGlobalHandlers.pointerDown, true);
      document.removeEventListener("keydown", previousGlobalHandlers.keyDown, true);
    }

    const pointerDownHandler = (event) => {
      if (!isNotificationPanelOpen()) return;
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (panel.contains(target)) return;
      if (bellButton.contains(target)) return;
      closeNotificationPanel();
    };

    const keyDownHandler = (event) => {
      if (event.key !== "Escape" && event.key !== "Esc") return;
      if (!isNotificationPanelOpen()) return;
      closeNotificationPanel();
    };

    document.addEventListener("pointerdown", pointerDownHandler, true);
    document.addEventListener("keydown", keyDownHandler, true);
    window.__adminNotificationGlobalHandlers = {
      pointerDown: pointerDownHandler,
      keyDown: keyDownHandler
    };

    panel.__adminNotificationHandlers = {
      bellClickHandler,
      panelClickHandler,
      isNotificationPanelOpen,
      openNotificationPanel,
      closeNotificationPanel,
      toggleNotificationPanel
    };

    renderNotificationCenter();
  }

  function renderRoleIndicator(role) {
    const topbarActions = document.querySelector(".admin-topbar-actions");
    if (!topbarActions) return;
    if (topbarActions.querySelector(".admin-user")) return;

    const rawUser = localStorage.getItem(KEY_USER) || "Enes";
    const normalizedUser = String(rawUser).toLowerCase() === "admin" ? "Enes" : String(rawUser);
    const userName = normalizedUser ? `${normalizedUser.charAt(0).toUpperCase()}${normalizedUser.slice(1)}` : "Enes";
    const displayRole = role === "Chef" ? "Geschaeftsleitung" : role || "Leitung";
    const profile = document.createElement("button");
    profile.className = "admin-user admin-user-compact";
    profile.type = "button";
    profile.setAttribute("aria-label", "Benutzer");
    profile.innerHTML = `<strong>${userName}</strong><span>${displayRole}</span>`;
    topbarActions.append(profile);
  }

  function renderPermissionNotice() {
    const notice = localStorage.getItem(KEY_NOTICE);
    if (!notice) return;

    const main = document.querySelector(".admin-main");
    if (!main) return;

    const noteNode = document.createElement("article");
    noteNode.className = "admin-permission-note";
    noteNode.textContent = notice;
    main.prepend(noteNode);
    localStorage.removeItem(KEY_NOTICE);
  }

  function logout() {
    const bridge = ensureSupabaseBridge();
    if (bridge && typeof bridge.signOut === "function") {
      bridge.signOut().catch(() => {});
    }

    clearSession();
    redirectToLogin();
  }

  function bindLogout() {
    document.addEventListener("click", (event) => {
      const trigger = event.target.closest("[data-admin-logout]");
      if (!trigger) return;
      event.preventDefault();
      logout();
    });
  }

  function protectCurrentPage() {
    const fileName = normalizePath(window.location.pathname);
    if (fileName === "login.html") return { role: null, user: null, protected: false };

    const session = readSession();
    if (!isValidSession(session)) {
      redirectToLogin();
      return { role: null, user: null, protected: true };
    }

    if (!canAccessPage(session.role, fileName)) {
      redirectToDashboardWithNotice(fileName);
      return { role: session.role, user: session.user, protected: true };
    }

    return { role: session.role, user: session.user, protected: true };
  }

  const protectionState = protectCurrentPage();

  document.addEventListener("DOMContentLoaded", () => {
    if (!protectionState.protected) return;

    ensureUiTextReady().then((uiText) => {
      if (!uiText) return;
      uiText.normalizeDocument(document);
      uiText.observeDocument(document);
    });

    applyDemoLoadingState();
    document.body.classList.add("admin-leitstelle-mode");
    ensureHeaderConsistency();
    bindLogout();
    if (protectionState.role) {
      renderUnifiedSidebar(protectionState.role);
      bindSidebarGroups();
      renderRoleIndicator(protectionState.role);
      injectTopbarQuickCreateActions();
      normalizeTopbarActions();
      setupMobileNavigation();
      ensureSystemCenterReady().finally(() => {
        setupNotificationCenter(protectionState.role);
        initV20Productivity(protectionState.role, protectionState.user);
        injectTopbarQuickCreateActions();
        normalizeTopbarActions();
      });
    }
    renderPermissionNotice();
  });

  window.AdminDemoAuth = {
    keys: {
      loggedIn: KEY_LOGGED_IN,
      user: KEY_USER,
      role: KEY_ROLE
    },
    users: DEMO_USERS,
    readSession,
    isValidSession,
    saveSession,
    logout
  };
})();
