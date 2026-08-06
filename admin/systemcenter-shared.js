(() => {
  const KEY = "adminV20SystemCenterState";
  const ACTIVITY_KEY = "adminV20ActivityLog";
  const STORE = {
    dispo: "adminLiveDispoV131",
    customers: "adminSharedCustomersV14",
    customerTasks: "adminSharedTasksV14",
    callbacks: "adminSharedCallbacksV14",
    series: "adminSharedSeriesV14",
    driverOps: "adminV15DriverOps",
    finance: "adminV16FinanceState",
    personnel: "adminV17PersonnelState",
    quality: "adminV18QualityState",
    management: "adminV19ManagementState"
  };

  const TASK_STATUSES = ["neu", "offen", "zugewiesen", "in Bearbeitung", "wartet auf Rueckmeldung", "blockiert", "erledigt", "storniert", "ueberfaellig"];
  const TASK_PRIORITIES = ["niedrig", "normal", "wichtig", "dringend", "kritisch"];
  const NOTICE_STATUSES = ["ungelesen", "gelesen", "bestaetigt", "erledigt", "archiviert"];
  const NOTICE_PRIORITIES = ["Information", "normal", "wichtig", "dringend", "kritisch"];

  const ROLE_MATRIX = {
    Bereiche: ["Dashboard", "Live-Dispo", "Fahrten", "Kunden", "Fahrer", "Fahrzeuge", "Schichten", "Personal", "Urlaub", "Dokumente", "Qualitaet", "Werkstatt", "Finanzen", "Berichte", "Einstellungen", "Benutzerverwaltung"],
    Rollen: ["Geschaeftsleitung", "Admin", "Disponent", "Telefonzentrale", "Personalverwaltung", "Abrechnung", "Qualitaetsmanagement", "Werkstatt", "Fahrer", "Mitarbeiter", "Nur Lesen"],
    Rechte: ["ansehen", "erstellen", "bearbeiten", "loeschen", "freigeben", "exportieren", "sensible Informationen ansehen", "Status aendern", "Aufgaben zuweisen"]
  };

  const PAGE_REGISTRY = [
    { title: "Dashboard", category: "Seiten", link: "index.html" },
    { title: "Geschaeftsfuehrer-Dashboard", category: "Seiten", link: "geschaeftsfuehrer-dashboard.html" },
    { title: "Termin-Cockpit", category: "Seiten", link: "termin-cockpit.html" },
    { title: "Termin schnell aufnehmen", category: "Seiten", link: "termin-schnellerfassung.html" },
    { title: "Tagesplanung", category: "Seiten", link: "tagesplanung.html" },
    { title: "Live-Dispo", category: "Seiten", link: "live-dispo.html" },
    { title: "Telefonzentrale", category: "Seiten", link: "telefonzentrale.html" },
    { title: "Kunden", category: "Seiten", link: "kunden.html" },
    { title: "Serienfahrten", category: "Seiten", link: "serienfahrten.html" },
    { title: "Fahrer", category: "Seiten", link: "fahrer.html" },
    { title: "Fahrzeuge", category: "Seiten", link: "fahrzeuge.html" },
    { title: "Schichtplanung", category: "Seiten", link: "schichtplanung.html" },
    { title: "Personaluebersicht", category: "Seiten", link: "personaluebersicht.html" },
    { title: "Urlaubsplanung", category: "Seiten", link: "urlaubsplanung.html" },
    { title: "Abwesenheiten", category: "Seiten", link: "abwesenheiten.html" },
    { title: "Dokumentfristen", category: "Seiten", link: "dokumentfristen.html" },
    { title: "Werkstatt", category: "Seiten", link: "werkstatt.html" },
    { title: "Beschwerden", category: "Seiten", link: "beschwerden.html" },
    { title: "Vorfaelle", category: "Seiten", link: "vorfaelle.html" },
    { title: "Unfaelle", category: "Seiten", link: "unfaelle.html" },
    { title: "Fundbuero", category: "Seiten", link: "fundbuero.html" },
    { title: "Pruefungen", category: "Seiten", link: "pruefungen.html" },
    { title: "Massnahmen", category: "Seiten", link: "massnahmen.html" },
    { title: "Abrechnungszentrale", category: "Seiten", link: "abrechnungszentrale.html" },
    { title: "Rechnungen", category: "Seiten", link: "rechnungen.html" },
    { title: "Controlling", category: "Seiten", link: "controlling.html" },
    { title: "Monatsabschluss", category: "Seiten", link: "monatsabschluss.html" },
    { title: "Aufgaben-Center", category: "Seiten", link: "aufgaben-center.html" },
    { title: "Benachrichtigungs-Center", category: "Seiten", link: "benachrichtigungen-center.html" },
    { title: "Rollen und Rechte", category: "Seiten", link: "rollen-rechte.html" },
    { title: "Mein Arbeitsplatz", category: "Seiten", link: "arbeitsplatz.html" },
    { title: "Einstellungen", category: "Seiten", link: "einstellungen.html" },
    { title: "Hilfe", category: "Seiten", link: "hilfe.html" },
    { title: "Verlauf", category: "Seiten", link: "verlauf.html" }
  ];

  function safeParse(raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function deepClone(v) {
    return JSON.parse(JSON.stringify(v));
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function todayIso() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function normalize(value) {
    return String(value || "").toLocaleLowerCase("de-DE").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function hasText(hay, term) {
    return normalize(hay).includes(normalize(term));
  }

  function readStore(key, fallback) {
    const parsed = safeParse(localStorage.getItem(key));
    return parsed && typeof parsed === "object" ? parsed : fallback;
  }

  function createDefaultState() {
    return {
      version: 1,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      searchHistory: [],
      recent: [],
      pinnedResults: [],
      favorites: [
        { id: "F-1", title: "Live-Dispo", category: "Seite", link: "live-dispo.html" },
        { id: "F-2", title: "Kritische Beschwerden", category: "Qualitaet", link: "beschwerden.html" }
      ],
      savedFilters: [
        { id: "SF-1", name: "kritische Beschwerden", area: "Qualitaet", filter: "priority:kritisch status:offen", privacy: "privat", roleShareDemo: false, standard: false },
        { id: "SF-2", name: "Rechnungen ueberfaellig", area: "Finanzen", filter: "status:ueberfaellig", privacy: "rolle", roleShareDemo: true, standard: false }
      ],
      tableViews: [],
      rolePreview: {
        active: false,
        role: "",
        updatedAt: ""
      },
      settings: {
        preferredStartPage: "geschaeftsfuehrer-dashboard.html",
        density: "komfort",
        dateFormat: "DD.MM.YYYY",
        timeFormat: "24h",
        tableRows: 20,
        standardFilter: "",
        shortcutsEnabled: true,
        reducedMotion: false,
        notifications: {
          criticalOnly: false,
          muted: false,
          dailySummaryDemo: true
        }
      },
      tasksManual: [
        {
          id: "TC-M-1",
          title: "Rueckruf fuer wartenden Kunden pruefen",
          description: "Kunde wartet auf Bestaetigung durch Telefonzentrale.",
          category: "Kunden",
          source: "Telefonzentrale",
          relation: "CB-1",
          owner: "Disposition",
          contributors: ["Telefonzentrale"],
          priority: "wichtig",
          status: "offen",
          startDate: todayIso(),
          dueDate: todayIso(),
          reminder: "heute 14:00",
          checklist: [
            { id: "CL-1", text: "Kunde kontaktieren", owner: "Telefonzentrale", status: "offen", dueDate: todayIso(), comment: "" },
            { id: "CL-2", text: "Status in Kundenakte aktualisieren", owner: "Disposition", status: "offen", dueDate: todayIso(), comment: "" }
          ],
          note: "Demo-Aufgabe",
          attachmentDemo: "",
          createdAt: nowIso(),
          updatedAt: nowIso(),
          entity: { customer: "K-1002", driver: "", vehicle: "" },
          communication: [],
          history: [{ at: nowIso(), by: "System", action: "erstellt", note: "Initial" }],
          links: [{ title: "Kunde", href: "kunden.html" }]
        }
      ],
      tasksOverrides: {},
      notificationsManual: [
        {
          id: "NC-M-1",
          icon: "!",
          title: "Schicht unbesetzt",
          message: "Spaetschicht 18:00-22:00 ist nicht besetzt.",
          category: "Personal",
          priority: "dringend",
          timestamp: nowIso(),
          status: "ungelesen",
          relation: "Schichtplanung",
          source: "Schichtplanung",
          link: "schichtplanung.html",
          assignedTo: "Disposition",
          groupKey: "schicht-offen"
        }
      ],
      notificationsOverrides: {},
      tour: {
        done: false,
        lastStep: 0
      }
    };
  }

  function ensureStateShape(state) {
    const base = createDefaultState();
    const next = { ...base, ...(state || {}) };
    next.searchHistory = Array.isArray(next.searchHistory) ? next.searchHistory : [];
    next.recent = Array.isArray(next.recent) ? next.recent : [];
    next.pinnedResults = Array.isArray(next.pinnedResults) ? next.pinnedResults : [];
    next.favorites = Array.isArray(next.favorites) ? next.favorites : base.favorites;
    next.savedFilters = Array.isArray(next.savedFilters) ? next.savedFilters : base.savedFilters;
    next.tableViews = Array.isArray(next.tableViews) ? next.tableViews : [];
    next.tasksManual = Array.isArray(next.tasksManual) ? next.tasksManual : [];
    next.tasksOverrides = next.tasksOverrides && typeof next.tasksOverrides === "object" ? next.tasksOverrides : {};
    next.notificationsManual = Array.isArray(next.notificationsManual) ? next.notificationsManual : [];
    next.notificationsOverrides = next.notificationsOverrides && typeof next.notificationsOverrides === "object" ? next.notificationsOverrides : {};
    next.rolePreview = { ...base.rolePreview, ...(next.rolePreview || {}) };
    next.settings = { ...base.settings, ...(next.settings || {}) };
    next.settings.notifications = { ...base.settings.notifications, ...((next.settings && next.settings.notifications) || {}) };
    next.tour = { ...base.tour, ...(next.tour || {}) };
    return next;
  }

  function saveState(state) {
    state.updatedAt = nowIso();
    localStorage.setItem(KEY, JSON.stringify(state));
    return state;
  }

  function loadState() {
    const parsed = safeParse(localStorage.getItem(KEY));
    if (!parsed) {
      const initial = createDefaultState();
      saveState(initial);
      return initial;
    }
    const normalized = ensureStateShape(parsed);
    if (JSON.stringify(parsed) !== JSON.stringify(normalized)) saveState(normalized);
    return normalized;
  }

  function resetState() {
    const state = createDefaultState();
    saveState(state);
    return state;
  }

  function loadSources() {
    const dispo = readStore(STORE.dispo, {});
    const customers = safeParse(localStorage.getItem(STORE.customers));
    const customerTasks = safeParse(localStorage.getItem(STORE.customerTasks));
    const callbacks = safeParse(localStorage.getItem(STORE.callbacks));
    const series = safeParse(localStorage.getItem(STORE.series));
    const driverOps = readStore(STORE.driverOps, {});
    const finance = readStore(STORE.finance, {});
    const personnel = readStore(STORE.personnel, {});
    const quality = readStore(STORE.quality, {});
    const management = readStore(STORE.management, {});

    return {
      orders: Array.isArray(dispo.orders) ? dispo.orders : [],
      dispoVehicles: Array.isArray(dispo.vehicles) ? dispo.vehicles : [],
      sharedCustomers: Array.isArray(customers) ? customers : [],
      customerTasks: Array.isArray(customerTasks) ? customerTasks : [],
      callbacks: Array.isArray(callbacks) ? callbacks : [],
      seriesList: Array.isArray(series) ? series : Array.isArray(series && series.series) ? series.series : [],
      driverOps,
      finance,
      personnel,
      quality,
      management
    };
  }

  function mapEntityId(type, rawId) {
    if (!rawId) return "";
    return `${type}:${rawId}`;
  }

  function mapBaseTasksFromSources(sources) {
    const tasks = [];

    sources.customerTasks.forEach((t) => {
      tasks.push({
        id: `TC-CU-${t.id}`,
        title: t.title || "Kundenaufgabe",
        description: t.note || "",
        category: "Kunden",
        source: "Kunden",
        relation: t.id,
        owner: t.owner || "Disposition",
        contributors: [],
        priority: normalize(t.priority).includes("hoch") ? "wichtig" : "normal",
        status: normalize(t.status).includes("bear") ? "in Bearbeitung" : normalize(t.status).includes("erled") ? "erledigt" : "offen",
        startDate: t.createdAt || todayIso(),
        dueDate: t.due || todayIso(),
        reminder: "",
        checklist: [],
        note: "Import aus Kundenmodul",
        attachmentDemo: "",
        createdAt: t.createdAt || nowIso(),
        updatedAt: nowIso(),
        entity: { customer: t.customerId || "", driver: "", vehicle: "" },
        communication: [],
        history: [{ at: nowIso(), by: "System", action: "importiert", note: "Kundenaufgabe" }],
        links: [{ title: "Kundenverwaltung", href: "kunden.html" }]
      });
    });

    sources.callbacks.forEach((c) => {
      tasks.push({
        id: `TC-CB-${c.id}`,
        title: "Rueckruf aus Telefonzentrale",
        description: c.note || "Rueckruf an Kunde",
        category: "Betrieb",
        source: "Telefonzentrale",
        relation: c.id,
        owner: "Telefonzentrale",
        contributors: ["Disposition"],
        priority: "wichtig",
        status: normalize(c.status).includes("offen") ? "offen" : "erledigt",
        startDate: todayIso(),
        dueDate: todayIso(),
        reminder: c.when || "",
        checklist: [],
        note: "Automatisch aus Rueckrufliste",
        attachmentDemo: "",
        createdAt: nowIso(),
        updatedAt: nowIso(),
        entity: { customer: c.customerId || "", driver: "", vehicle: "" },
        communication: [],
        history: [{ at: nowIso(), by: "System", action: "importiert", note: "Rueckruf" }],
        links: [{ title: "Telefonzentrale", href: "telefonzentrale.html" }]
      });
    });

    (Array.isArray(sources.quality.actions) ? sources.quality.actions : []).forEach((a) => {
      tasks.push({
        id: `TC-QA-${a.id}`,
        title: a.title || "Massnahme",
        description: a.description || a.note || "",
        category: "Qualitaet",
        source: "Massnahmen",
        relation: a.id,
        owner: a.owner || "Qualitaetsmanagement",
        contributors: [],
        priority: normalize(a.priority).includes("krit") ? "kritisch" : normalize(a.priority).includes("wichtig") ? "wichtig" : "normal",
        status: normalize(a.status).includes("bear") ? "in Bearbeitung" : normalize(a.status).includes("wirksam") || normalize(a.status).includes("abgeschlossen") ? "erledigt" : "offen",
        startDate: a.createdAt || todayIso(),
        dueDate: a.dueDate || todayIso(),
        reminder: "",
        checklist: [],
        note: "Import aus Qualitaetsmassnahmen",
        attachmentDemo: "",
        createdAt: a.createdAt || nowIso(),
        updatedAt: nowIso(),
        entity: { customer: a.customerId || "", driver: a.driverId || "", vehicle: a.vehicle || "" },
        communication: [],
        history: [{ at: nowIso(), by: "System", action: "importiert", note: "Qualitaet" }],
        links: [{ title: "Massnahmen", href: "massnahmen.html" }]
      });
    });

    (Array.isArray(sources.quality.inspections) ? sources.quality.inspections : []).forEach((i) => {
      tasks.push({
        id: `TC-PR-${i.id}`,
        title: `Pruefung: ${i.type || "Pruefpunkt"}`,
        description: i.area || "",
        category: "Qualitaet",
        source: "Pruefungen",
        relation: i.id,
        owner: i.owner || "Qualitaetsmanagement",
        contributors: [],
        priority: normalize(i.status).includes("faellig") ? "dringend" : "normal",
        status: ["durchgefuehrt", "abgeschlossen"].includes(normalize(i.status)) ? "erledigt" : "offen",
        startDate: i.lastCheck || todayIso(),
        dueDate: i.dueDate || i.nextCheck || todayIso(),
        reminder: "",
        checklist: Array.isArray(i.checklist) ? i.checklist.map((x, idx) => ({ id: `${i.id}-C-${idx}`, text: String(x), owner: i.owner || "Qualitaetsmanagement", status: "offen", dueDate: i.dueDate || todayIso(), comment: "" })) : [],
        note: "Import aus Pruefungen",
        attachmentDemo: "",
        createdAt: nowIso(),
        updatedAt: nowIso(),
        entity: { customer: "", driver: "", vehicle: i.target || "" },
        communication: [],
        history: [{ at: nowIso(), by: "System", action: "importiert", note: "Pruefung" }],
        links: [{ title: "Pruefungen", href: "pruefungen.html" }]
      });
    });

    (Array.isArray(sources.finance.invoices) ? sources.finance.invoices : []).forEach((inv) => {
      if (Number(inv.open || 0) <= 0) return;
      tasks.push({
        id: `TC-FI-${inv.id}`,
        title: `Offene Rechnung ${inv.id}`,
        description: `${inv.customer || "Kunde"} - offen ${inv.open || 0} EUR`,
        category: "Finanzen",
        source: "Rechnungen",
        relation: inv.id,
        owner: "Buchhaltung",
        contributors: [],
        priority: normalize(inv.status).includes("ueber") ? "dringend" : "normal",
        status: normalize(inv.status).includes("ueber") ? "wartet auf Rueckmeldung" : "offen",
        startDate: inv.issueDate || todayIso(),
        dueDate: inv.dueDate || todayIso(),
        reminder: "",
        checklist: [],
        note: "Import aus Finanzen",
        attachmentDemo: "",
        createdAt: nowIso(),
        updatedAt: nowIso(),
        entity: { customer: inv.customer || "", driver: "", vehicle: "" },
        communication: [],
        history: [{ at: nowIso(), by: "System", action: "importiert", note: "Rechnung" }],
        links: [{ title: "Rechnungen", href: "rechnungen.html" }]
      });
    });

    (Array.isArray(sources.personnel.documents) ? sources.personnel.documents : []).forEach((d) => {
      if (!["abgelaufen", "laeuft bald ab", "fehlt"].includes(normalize(d.status))) return;
      tasks.push({
        id: `TC-DO-${d.id}`,
        title: `Dokumentpruefung: ${d.type || "Dokument"}`,
        description: `${d.employeeId || "Mitarbeiter"} - Status ${d.status}`,
        category: "Dokumente",
        source: "Dokumentfristen",
        relation: d.id,
        owner: "Personalverwaltung",
        contributors: [],
        priority: normalize(d.status).includes("abgelaufen") ? "kritisch" : "wichtig",
        status: "offen",
        startDate: todayIso(),
        dueDate: d.validUntil || todayIso(),
        reminder: "",
        checklist: [],
        note: "Import aus Dokumentfristen",
        attachmentDemo: "",
        createdAt: nowIso(),
        updatedAt: nowIso(),
        entity: { customer: "", driver: d.employeeId || "", vehicle: "" },
        communication: [],
        history: [{ at: nowIso(), by: "System", action: "importiert", note: "Dokument" }],
        links: [{ title: "Dokumentfristen", href: "dokumentfristen.html" }]
      });
    });

    (Array.isArray(sources.management.managementTasks) ? sources.management.managementTasks : []).forEach((m) => {
      tasks.push({
        id: `TC-MG-${m.id}`,
        title: m.title || "Management-Aufgabe",
        description: m.impact || "",
        category: "Management",
        source: "Geschaeftsfuehrer-Dashboard",
        relation: m.id,
        owner: m.owner || "Geschaeftsleitung",
        contributors: [],
        priority: m.priority || "normal",
        status: m.status || "offen",
        startDate: m.createdAt || todayIso(),
        dueDate: m.dueDate || todayIso(),
        reminder: "",
        checklist: [],
        note: "Import aus Management",
        attachmentDemo: "",
        createdAt: m.createdAt || nowIso(),
        updatedAt: nowIso(),
        entity: { customer: "", driver: "", vehicle: "" },
        communication: [],
        history: [{ at: nowIso(), by: "System", action: "importiert", note: "Management" }],
        links: [{ title: "Geschaeftsfuehrer-Dashboard", href: "geschaeftsfuehrer-dashboard.html" }]
      });
    });

    return tasks;
  }

  function mapNotificationsFromSources(sources) {
    const out = [];

    const waitingOrders = sources.orders.filter((o) => ["Neu", "Wartet", "Problem"].includes(o.status));
    if (waitingOrders.length) {
      out.push({
        id: "NC-D-ORDERS",
        icon: "!",
        title: `${waitingOrders.length} offene Auftraege`,
        message: "Auftraege warten auf Disposition oder Rueckmeldung.",
        category: "Fahrten",
        priority: waitingOrders.length > 5 ? "dringend" : "wichtig",
        timestamp: nowIso(),
        status: "ungelesen",
        relation: "Live-Dispo",
        source: "Live-Dispo",
        link: "live-dispo.html",
        assignedTo: "Disposition",
        groupKey: "orders-open"
      });
    }

    const overdueInvoices = (Array.isArray(sources.finance.invoices) ? sources.finance.invoices : []).filter((i) => normalize(i.status).includes("ueber"));
    if (overdueInvoices.length) {
      out.push({
        id: "NC-F-OVERDUE",
        icon: "$",
        title: `${overdueInvoices.length} ueberfaellige Rechnungen`,
        message: "Bitte Mahnprozess und Rueckfragen pruefen.",
        category: "Finanzen",
        priority: "wichtig",
        timestamp: nowIso(),
        status: "ungelesen",
        relation: "Rechnungen",
        source: "Rechnungen",
        link: "rechnungen.html",
        assignedTo: "Buchhaltung",
        groupKey: "invoice-overdue"
      });
    }

    const criticalComplaints = (Array.isArray(sources.quality.complaints) ? sources.quality.complaints : []).filter((c) => normalize(c.priority).includes("krit") && !["abgeschlossen", "geklaert"].includes(normalize(c.status)));
    if (criticalComplaints.length) {
      out.push({
        id: "NC-Q-CRIT",
        icon: "!",
        title: `${criticalComplaints.length} kritische Beschwerden`,
        message: "Sofortige Qualitaetspruefung empfohlen.",
        category: "Qualitaet",
        priority: "kritisch",
        timestamp: nowIso(),
        status: "ungelesen",
        relation: "Beschwerden",
        source: "Qualitaet",
        link: "beschwerden.html",
        assignedTo: "Qualitaetsmanagement",
        groupKey: "complaints-critical"
      });
    }

    const docsExpiring = (Array.isArray(sources.personnel.documents) ? sources.personnel.documents : []).filter((d) => ["abgelaufen", "laeuft bald ab", "fehlt"].includes(normalize(d.status)));
    if (docsExpiring.length) {
      out.push({
        id: "NC-P-DOC",
        icon: "!",
        title: `${docsExpiring.length} Dokumente laufen bald ab`,
        message: "Dokumentfristen und Mitarbeiterzuordnung pruefen.",
        category: "Dokumente",
        priority: docsExpiring.length >= 3 ? "dringend" : "wichtig",
        timestamp: nowIso(),
        status: "ungelesen",
        relation: "Dokumentfristen",
        source: "Personal",
        link: "dokumentfristen.html",
        assignedTo: "Personalverwaltung",
        groupKey: "documents-expire"
      });
    }

    return out;
  }

  function mergeTaskOverrides(items, overrides) {
    return items.map((item) => {
      const ov = overrides[item.id];
      if (!ov) return item;
      return { ...item, ...ov };
    });
  }

  function mergeNoticeOverrides(items, overrides) {
    return items.map((item) => {
      const ov = overrides[item.id];
      if (!ov) return item;
      return { ...item, ...ov };
    });
  }

  function allTasks(state, sources) {
    const base = mapBaseTasksFromSources(sources);
    const manual = state.tasksManual || [];
    const merged = mergeTaskOverrides([...manual, ...base], state.tasksOverrides || {});
    return merged.sort((a, b) => String(a.dueDate || "").localeCompare(String(b.dueDate || "")));
  }

  function allNotifications(state, sources) {
    const base = mapNotificationsFromSources(sources);
    const manual = state.notificationsManual || [];
    const merged = mergeNoticeOverrides([...manual, ...base], state.notificationsOverrides || {});
    return merged.sort((a, b) => String(b.timestamp || "").localeCompare(String(a.timestamp || "")));
  }

  function taskStats(tasks, currentUser) {
    const today = todayIso();
    return {
      total: tasks.length,
      dueToday: tasks.filter((t) => String(t.dueDate || "") === today).length,
      overdue: tasks.filter((t) => String(t.dueDate || "") < today && !["erledigt", "storniert"].includes(normalize(t.status))).length,
      critical: tasks.filter((t) => normalize(t.priority).includes("krit")).length,
      mine: tasks.filter((t) => hasText(t.owner, currentUser || "")).length,
      unassigned: tasks.filter((t) => !String(t.owner || "").trim()).length,
      waiting: tasks.filter((t) => normalize(t.status).includes("wartet")).length,
      doneToday: tasks.filter((t) => normalize(t.status).includes("erled") && String(t.updatedAt || "").slice(0, 10) === today).length
    };
  }

  function addTask(state, payload, actor) {
    const now = nowIso();
    const task = {
      id: `TC-M-${Date.now()}`,
      title: String(payload.title || "Neue Aufgabe"),
      description: String(payload.description || ""),
      category: String(payload.category || "Allgemein"),
      source: String(payload.source || "Manuell"),
      relation: String(payload.relation || ""),
      owner: String(payload.owner || ""),
      contributors: String(payload.contributors || "").split(",").map((x) => x.trim()).filter(Boolean),
      priority: TASK_PRIORITIES.includes(String(payload.priority || "normal")) ? String(payload.priority) : "normal",
      status: TASK_STATUSES.includes(String(payload.status || "neu")) ? String(payload.status) : "neu",
      startDate: String(payload.startDate || todayIso()),
      dueDate: String(payload.dueDate || todayIso()),
      reminder: String(payload.reminder || ""),
      checklist: String(payload.checklist || "").split("\n").map((x, idx) => x.trim()).filter(Boolean).map((x, idx) => ({ id: `CL-${Date.now()}-${idx}`, text: x, owner: String(payload.owner || ""), status: "offen", dueDate: String(payload.dueDate || todayIso()), comment: "" })),
      note: String(payload.note || ""),
      attachmentDemo: String(payload.attachmentDemo || ""),
      createdAt: now,
      updatedAt: now,
      entity: {
        customer: String(payload.customer || ""),
        driver: String(payload.driver || ""),
        vehicle: String(payload.vehicle || "")
      },
      communication: [],
      history: [{ at: now, by: actor || "System", action: "erstellt", note: "manuell" }],
      links: String(payload.link || "").trim() ? [{ title: "Verknuepfung", href: String(payload.link).trim() }] : []
    };
    state.tasksManual.unshift(task);
    saveState(state);
    addActivity({ user: actor || "System", role: "Demo", action: "Datensatz erstellt", area: "Aufgaben", record: task.id, beforeStatus: "", nextStatus: task.status, note: task.title });
    return task;
  }

  function updateTask(state, id, patch, actor) {
    const now = nowIso();
    let found = state.tasksManual.find((t) => t.id === id);
    if (found) {
      const before = found.status;
      Object.assign(found, patch, { updatedAt: now });
      found.history = Array.isArray(found.history) ? found.history : [];
      found.history.unshift({ at: now, by: actor || "System", action: "bearbeitet", note: JSON.stringify(patch) });
      saveState(state);
      addActivity({ user: actor || "System", role: "Demo", action: "Datensatz bearbeitet", area: "Aufgaben", record: id, beforeStatus: before, nextStatus: found.status || before, note: "Task manuell" });
      return found;
    }

    const existing = state.tasksOverrides[id] || {};
    const beforeStatus = existing.status || "";
    state.tasksOverrides[id] = { ...existing, ...patch, updatedAt: now };
    saveState(state);
    addActivity({ user: actor || "System", role: "Demo", action: "Status geaendert", area: "Aufgaben", record: id, beforeStatus, nextStatus: state.tasksOverrides[id].status || beforeStatus, note: "Task importiert" });
    return state.tasksOverrides[id];
  }

  function duplicateTask(state, id, actor) {
    const sources = loadSources();
    const src = allTasks(state, sources).find((t) => t.id === id);
    if (!src) return null;
    return addTask(state, {
      ...src,
      title: `${src.title} (Kopie)`,
      checklist: (src.checklist || []).map((c) => c.text).join("\n")
    }, actor || "System");
  }

  function removeTask(state, id, actor) {
    const before = state.tasksManual.length;
    state.tasksManual = state.tasksManual.filter((t) => t.id !== id);
    delete state.tasksOverrides[id];
    saveState(state);
    if (before !== state.tasksManual.length) {
      addActivity({ user: actor || "System", role: "Demo", action: "Datensatz bearbeitet", area: "Aufgaben", record: id, beforeStatus: "offen", nextStatus: "geloescht", note: "Task geloescht" });
    }
  }

  function addNotification(state, payload, actor) {
    const row = {
      id: `NC-M-${Date.now()}`,
      icon: String(payload.icon || "i"),
      title: String(payload.title || "Neue Benachrichtigung"),
      message: String(payload.message || ""),
      category: String(payload.category || "System"),
      priority: NOTICE_PRIORITIES.includes(String(payload.priority || "normal")) ? String(payload.priority) : "normal",
      timestamp: nowIso(),
      status: NOTICE_STATUSES.includes(String(payload.status || "ungelesen")) ? String(payload.status) : "ungelesen",
      relation: String(payload.relation || ""),
      source: String(payload.source || "System"),
      link: String(payload.link || ""),
      assignedTo: String(payload.assignedTo || ""),
      groupKey: String(payload.groupKey || "")
    };
    state.notificationsManual.unshift(row);
    saveState(state);
    addActivity({ user: actor || "System", role: "Demo", action: "Datensatz erstellt", area: "Benachrichtigungen", record: row.id, beforeStatus: "", nextStatus: row.status, note: row.title });
    return row;
  }

  function updateNotification(state, id, patch, actor) {
    let found = state.notificationsManual.find((n) => n.id === id);
    if (found) {
      const before = found.status;
      Object.assign(found, patch);
      saveState(state);
      addActivity({ user: actor || "System", role: "Demo", action: "Status geaendert", area: "Benachrichtigungen", record: id, beforeStatus: before, nextStatus: found.status || before, note: found.title });
      return found;
    }
    const existing = state.notificationsOverrides[id] || {};
    const beforeStatus = existing.status || "";
    state.notificationsOverrides[id] = { ...existing, ...patch };
    saveState(state);
    addActivity({ user: actor || "System", role: "Demo", action: "Status geaendert", area: "Benachrichtigungen", record: id, beforeStatus, nextStatus: state.notificationsOverrides[id].status || beforeStatus, note: "importiert" });
    return state.notificationsOverrides[id];
  }

  function groupedNotifications(items) {
    const map = new Map();
    items.forEach((item) => {
      const key = item.groupKey || item.id;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    });
    return [...map.entries()].map(([key, rows]) => ({
      key,
      count: rows.length,
      title: rows.length > 1 ? `${rows.length} Meldungen: ${rows[0].title}` : rows[0].title,
      priority: rows.map((r) => r.priority).sort((a, b) => NOTICE_PRIORITIES.indexOf(b) - NOTICE_PRIORITIES.indexOf(a))[0] || "normal",
      items: rows
    }));
  }

  function addSearchHistory(state, term) {
    if (!String(term || "").trim()) return;
    const clean = String(term).trim();
    state.searchHistory = [clean, ...state.searchHistory.filter((x) => x !== clean)].slice(0, 15);
    saveState(state);
  }

  function clearSearchHistory(state) {
    state.searchHistory = [];
    saveState(state);
  }

  function addRecent(state, item) {
    const key = `${item.category}:${item.id || item.title}`;
    const row = {
      key,
      id: item.id || "",
      title: item.title || "",
      category: item.category || "Allgemein",
      info: item.info || "",
      link: item.link || "",
      at: nowIso()
    };
    state.recent = [row, ...state.recent.filter((x) => x.key !== key)].slice(0, 30);
    saveState(state);
  }

  function clearRecent(state) {
    state.recent = [];
    saveState(state);
  }

  function setFavorite(state, item, enabled) {
    const key = `${item.category}:${item.title}`;
    if (enabled) {
      const row = {
        id: `F-${Date.now()}`,
        title: item.title,
        category: item.category,
        link: item.link || "",
        key
      };
      state.favorites = [row, ...state.favorites.filter((f) => f.key !== key)].slice(0, 30);
    } else {
      state.favorites = state.favorites.filter((f) => f.key !== key);
    }
    saveState(state);
  }

  function pinResult(state, item, enabled) {
    const key = `${item.category}:${item.title}`;
    if (enabled) {
      state.pinnedResults = [
        {
          id: `P-${Date.now()}`,
          key,
          title: item.title,
          category: item.category,
          info: item.info || "",
          link: item.link || ""
        },
        ...state.pinnedResults.filter((p) => p.key !== key)
      ].slice(0, 20);
    } else {
      state.pinnedResults = state.pinnedResults.filter((p) => p.key !== key);
    }
    saveState(state);
  }

  function setRolePreview(state, role, active) {
    state.rolePreview = {
      active: Boolean(active),
      role: active ? String(role || "") : "",
      updatedAt: nowIso()
    };
    saveState(state);
    addActivity({ user: "Admin", role: "Demo", action: "Rolle geaendert", area: "Benutzer", record: role || "", beforeStatus: "", nextStatus: active ? "Vorschau aktiv" : "Vorschau aus", note: "Rollen-Vorschau" });
    return state.rolePreview;
  }

  function updateSettings(state, patch) {
    state.settings = { ...state.settings, ...patch };
    if (patch.notifications) {
      state.settings.notifications = { ...state.settings.notifications, ...patch.notifications };
    }
    saveState(state);
    return state.settings;
  }

  function saveFilter(state, payload) {
    const row = {
      id: `SF-${Date.now()}`,
      name: String(payload.name || "Neue Ansicht"),
      area: String(payload.area || "Allgemein"),
      filter: String(payload.filter || ""),
      privacy: String(payload.privacy || "privat"),
      roleShareDemo: Boolean(payload.roleShareDemo),
      standard: Boolean(payload.standard)
    };
    if (row.standard) {
      state.savedFilters = state.savedFilters.map((f) => ({ ...f, standard: false }));
    }
    state.savedFilters.unshift(row);
    saveState(state);
    return row;
  }

  function removeFilter(state, id) {
    state.savedFilters = state.savedFilters.filter((f) => f.id !== id);
    saveState(state);
  }

  function saveTableView(state, payload) {
    const row = {
      id: `TV-${Date.now()}`,
      name: String(payload.name || "Tabellenansicht"),
      area: String(payload.area || "Allgemein"),
      columns: Array.isArray(payload.columns) ? payload.columns : String(payload.columns || "").split(",").map((x) => x.trim()).filter(Boolean),
      order: Array.isArray(payload.order) ? payload.order : [],
      sort: String(payload.sort || ""),
      filter: String(payload.filter || ""),
      grouping: String(payload.grouping || ""),
      mode: String(payload.mode || "Liste")
    };
    state.tableViews.unshift(row);
    saveState(state);
    return row;
  }

  function removeTableView(state, id) {
    state.tableViews = state.tableViews.filter((v) => v.id !== id);
    saveState(state);
  }

  function getUsersForProfiles() {
    const users = [
      { name: "Enes", role: "Admin", status: "aktiv", lastActivity: "heute 09:10", startPage: "Dashboard", areas: "Alle" },
      { name: "Fatih", role: "Admin", status: "aktiv", lastActivity: "heute 08:44", startPage: "Live-Dispo", areas: "Betrieb" },
      { name: "Leitung", role: "Geschaeftsleitung", status: "aktiv", lastActivity: "heute 08:11", startPage: "Geschaeftsfuehrer-Dashboard", areas: "Management" },
      { name: "Dispo Team", role: "Disponent", status: "aktiv", lastActivity: "heute 09:02", startPage: "Live-Dispo", areas: "Betrieb/Telefon" },
      { name: "Abrechnung Team", role: "Abrechnung", status: "aktiv", lastActivity: "heute 08:58", startPage: "Abrechnungszentrale", areas: "Finanzen" },
      { name: "Personal", role: "Personalverwaltung", status: "aktiv", lastActivity: "heute 08:25", startPage: "Personaluebersicht", areas: "Personal" },
      { name: "Qualitaet", role: "Qualitaetsmanagement", status: "aktiv", lastActivity: "heute 08:17", startPage: "Qualitaetsuebersicht", areas: "Qualitaet" },
      { name: "Werkstatt", role: "Werkstatt", status: "aktiv", lastActivity: "heute 07:56", startPage: "Werkstatt", areas: "Flotte" },
      { name: "Mitarbeiter Demo", role: "Mitarbeiter", status: "eingeladen als Demo", lastActivity: "gestern 17:22", startPage: "Mitarbeiterportal", areas: "Mitarbeiterportal" },
      { name: "ReadOnly", role: "Nur Lesen", status: "inaktiv", lastActivity: "vor 3 Tagen", startPage: "Dashboard", areas: "Leserechte" }
    ];
    return users;
  }

  function formatDateTime(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso || "");
    return `${d.toLocaleDateString("de-DE")} ${d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}`;
  }

  function addActivity(entry) {
    const list = getActivityLog();
    list.unshift({
      id: `AL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      at: nowIso(),
      user: entry.user || "System",
      role: entry.role || "Demo",
      action: entry.action || "Aktion",
      area: entry.area || "System",
      record: entry.record || "",
      beforeStatus: entry.beforeStatus || "",
      nextStatus: entry.nextStatus || "",
      note: entry.note || ""
    });
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(list.slice(0, 400)));
  }

  function getActivityLog() {
    const parsed = safeParse(localStorage.getItem(ACTIVITY_KEY));
    return Array.isArray(parsed) ? parsed : [];
  }

  function resetActivityLog() {
    localStorage.removeItem(ACTIVITY_KEY);
  }

  function buildSearchItems(state, sources) {
    const items = [];

    PAGE_REGISTRY.forEach((p) => {
      items.push({ id: p.link, icon: "#", title: p.title, category: "Seiten", info: p.link, status: "", date: "", link: p.link, keywords: [p.title, p.category] });
    });

    sources.orders.forEach((o) => {
      items.push({
        id: mapEntityId("order", o.id),
        icon: "F",
        title: `Fahrt ${o.id}`,
        category: "Fahrten",
        info: `${o.customer || "-"} · ${o.pickup || "-"} -> ${o.destination || "-"}`,
        status: o.status || "",
        date: `${o.date || ""} ${o.time || ""}`.trim(),
        link: "live-dispo.html",
        keywords: [o.id, o.customer, o.pickup, o.destination, o.rideType, o.status]
      });
    });

    sources.sharedCustomers.forEach((c) => {
      items.push({
        id: mapEntityId("customer", c.id),
        icon: "K",
        title: c.displayName || c.name || c.id,
        category: "Kunden",
        info: `${c.phone || ""} · ${c.type || "Kunde"}`,
        status: c.status || "Aktiv",
        date: c.updatedAt || "",
        link: "kunden.html",
        keywords: [c.displayName, c.name, c.phone, c.type, c.customerNumber]
      });
    });

    (Array.isArray(sources.personnel.employees) ? sources.personnel.employees : []).forEach((e) => {
      const name = `${e.firstName || ""} ${e.lastName || ""}`.trim() || e.employeeId;
      items.push({
        id: mapEntityId("employee", e.id || e.employeeId),
        icon: "P",
        title: name,
        category: "Personal",
        info: `${e.role || ""} · ${e.employeeId || ""}`,
        status: e.status || "",
        date: e.lastActivity || "",
        link: "personaluebersicht.html",
        keywords: [name, e.employeeId, e.role, e.status, e.activeVehicle]
      });
    });

    const vehicleList = [...sources.dispoVehicles, ...(Array.isArray(sources.driverOps.vehicles) ? sources.driverOps.vehicles : [])];
    vehicleList.forEach((v) => {
      items.push({
        id: mapEntityId("vehicle", v.id || v.plate || v.vehicleId || Math.random()),
        icon: "V",
        title: v.plate || v.id || "Fahrzeug",
        category: "Fahrzeuge",
        info: `${v.name || v.type || ""} · Fahrer ${v.currentDriver || v.driver || "-"}`,
        status: v.status || v.state || "",
        date: "",
        link: "fahrzeuge.html",
        keywords: [v.plate, v.id, v.name, v.type, v.status, v.currentDriver]
      });
    });

    (Array.isArray(sources.finance.invoices) ? sources.finance.invoices : []).forEach((i) => {
      items.push({
        id: mapEntityId("invoice", i.id),
        icon: "R",
        title: i.id,
        category: "Finanzen",
        info: `${i.customer || ""} · ${i.gross || 0} EUR`,
        status: i.status || "",
        date: i.issueDate || "",
        link: "rechnungen.html",
        keywords: [i.id, i.customer, i.status, i.kind]
      });
    });

    (Array.isArray(sources.finance.payments) ? sources.finance.payments : []).forEach((p) => {
      items.push({
        id: mapEntityId("payment", p.id),
        icon: "$",
        title: p.id,
        category: "Finanzen",
        info: `${p.customer || ""} · ${p.amount || 0} EUR`,
        status: p.status || "",
        date: p.date || "",
        link: "zahlungen.html",
        keywords: [p.id, p.customer, p.status, p.paymentType]
      });
    });

    (Array.isArray(sources.finance.insurerCases) ? sources.finance.insurerCases : []).forEach((k) => {
      items.push({
        id: mapEntityId("insurer", k.id),
        icon: "I",
        title: k.id,
        category: "Finanzen",
        info: `${k.patient || ""} · ${k.insurer || ""}`,
        status: k.status || "",
        date: k.createdAt || "",
        link: "krankenkassen.html",
        keywords: [k.id, k.patient, k.insurer, k.status]
      });
    });

    (Array.isArray(sources.quality.complaints) ? sources.quality.complaints : []).forEach((q) => {
      items.push({
        id: mapEntityId("complaint", q.id),
        icon: "Q",
        title: q.id,
        category: "Qualitaet",
        info: `${q.customer || ""} · ${q.shortText || q.category || ""}`,
        status: q.status || "",
        date: q.inputDate || "",
        link: "beschwerden.html",
        keywords: [q.id, q.customer, q.driver, q.category, q.status]
      });
    });

    (Array.isArray(sources.quality.incidents) ? sources.quality.incidents : []).forEach((q) => {
      items.push({
        id: mapEntityId("incident", q.id),
        icon: "!",
        title: q.id,
        category: "Qualitaet",
        info: `${q.category || ""} · ${q.vehicle || ""}`,
        status: q.status || "",
        date: `${q.date || ""} ${q.time || ""}`.trim(),
        link: "vorfaelle.html",
        keywords: [q.id, q.category, q.vehicle, q.driver, q.status]
      });
    });

    (Array.isArray(sources.quality.accidents) ? sources.quality.accidents : []).forEach((q) => {
      items.push({
        id: mapEntityId("accident", q.id),
        icon: "U",
        title: q.id,
        category: "Qualitaet",
        info: `${q.accidentType || ""} · ${q.vehicle || ""}`,
        status: q.status || "",
        date: `${q.date || ""} ${q.time || ""}`.trim(),
        link: "unfaelle.html",
        keywords: [q.id, q.accidentType, q.vehicle, q.driver, q.status]
      });
    });

    (Array.isArray(sources.quality.foundItems) ? sources.quality.foundItems : []).forEach((f) => {
      items.push({
        id: mapEntityId("found", f.id),
        icon: "F",
        title: f.number || f.id,
        category: "Qualitaet",
        info: `${f.object || ""} · ${f.vehicle || ""}`,
        status: f.status || "",
        date: `${f.date || ""} ${f.time || ""}`.trim(),
        link: "fundbuero.html",
        keywords: [f.id, f.number, f.object, f.vehicle, f.status]
      });
    });

    allTasks(state, sources).forEach((t) => {
      items.push({
        id: mapEntityId("task", t.id),
        icon: "A",
        title: t.title,
        category: "Aufgaben",
        info: `${t.category} · ${t.source}`,
        status: t.status,
        date: t.dueDate || "",
        link: "aufgaben-center.html",
        keywords: [t.id, t.title, t.category, t.source, t.owner, t.priority, t.status]
      });
    });

    return items;
  }

  function applySearchFilter(item, filter) {
    const f = normalize(filter || "alle");
    if (f === "alle") return true;
    if (f === "seiten") return item.category === "Seiten";
    if (f === "aufgaben") return item.category === "Aufgaben";
    if (f === "kunden") return item.category === "Kunden";
    if (f === "fahrer" || f === "personal") return item.category === "Personal";
    if (f === "fahrten") return item.category === "Fahrten";
    if (f === "fahrzeuge") return item.category === "Fahrzeuge";
    if (f === "finanzen") return item.category === "Finanzen";
    if (f === "qualitat" || f === "qualitaet") return item.category === "Qualitaet";
    if (f === "dokumente") return item.category === "Dokumente" || hasText(item.info, "dokument");
    return true;
  }

  function applyExtraFlags(item, options) {
    if (options.openOnly && !["offen", "neu", "zugewiesen", "in bearbeitung", "wartet auf rueckmeldung", "ueberfaellig", "problem"].includes(normalize(item.status))) return false;
    if (options.criticalOnly && !["kritisch", "dringend", "problem"].some((k) => hasText(item.status, k) || hasText(item.info, k) || hasText(item.title, k))) return false;
    if (options.activeOnly && !["aktiv", "im dienst", "unterwegs", "frei", "bestaetigt", "zugewiesen"].some((k) => hasText(item.status, k))) return false;
    return true;
  }

  function search(state, sources, query, options = {}) {
    const term = String(query || "").trim();
    const all = buildSearchItems(state, sources);

    let rows = all.filter((item) => applySearchFilter(item, options.filter || "alle") && applyExtraFlags(item, options));

    if (term) {
      rows = rows.filter((item) => {
        const bag = `${item.title} ${item.category} ${item.info} ${item.status} ${(item.keywords || []).join(" ")}`;
        return hasText(bag, term);
      });
    }

    const recentMap = new Map((state.recent || []).map((r, i) => [`${r.category}:${r.title}`, i]));
    rows.sort((a, b) => {
      const aPinned = (state.pinnedResults || []).some((p) => p.key === `${a.category}:${a.title}`) ? 1 : 0;
      const bPinned = (state.pinnedResults || []).some((p) => p.key === `${b.category}:${b.title}`) ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned;
      const ar = recentMap.has(`${a.category}:${a.title}`) ? recentMap.get(`${a.category}:${a.title}`) : 9999;
      const br = recentMap.has(`${b.category}:${b.title}`) ? recentMap.get(`${b.category}:${b.title}`) : 9999;
      if (ar !== br) return ar - br;
      return String(a.title).localeCompare(String(b.title), "de");
    });

    return rows.slice(0, 120);
  }

  function groupedResults(items) {
    const groups = new Map();
    items.forEach((item) => {
      if (!groups.has(item.category)) groups.set(item.category, []);
      groups.get(item.category).push(item);
    });
    return [...groups.entries()].map(([category, rows]) => ({ category, rows }));
  }

  function toggleChecklistItem(state, taskId, checklistId, done, actor) {
    const task = state.tasksManual.find((t) => t.id === taskId);
    if (!task) return null;
    task.checklist = Array.isArray(task.checklist) ? task.checklist : [];
    const item = task.checklist.find((c) => c.id === checklistId);
    if (!item) return null;
    item.status = done ? "erledigt" : "offen";
    task.updatedAt = nowIso();
    task.history = Array.isArray(task.history) ? task.history : [];
    task.history.unshift({ at: nowIso(), by: actor || "System", action: "checkliste", note: `${item.text} -> ${item.status}` });
    saveState(state);
    return task;
  }

  function checklistProgress(task) {
    const list = Array.isArray(task.checklist) ? task.checklist : [];
    if (!list.length) return { done: 0, open: 0, percent: 0 };
    const done = list.filter((c) => normalize(c.status).includes("erledigt")).length;
    const open = list.length - done;
    const percent = Math.round((done / list.length) * 100);
    return { done, open, percent };
  }

  function applyRolePreview(role) {
    if (!role) return;
    localStorage.setItem("demoAdminRole", role);
  }

  window.AdminSystemCenter = {
    KEY,
    ACTIVITY_KEY,
    STORE,
    TASK_STATUSES,
    TASK_PRIORITIES,
    NOTICE_STATUSES,
    NOTICE_PRIORITIES,
    ROLE_MATRIX,
    PAGE_REGISTRY,
    normalize,
    todayIso,
    nowIso,
    formatDateTime,
    loadState,
    saveState,
    resetState,
    loadSources,
    allTasks,
    taskStats,
    addTask,
    updateTask,
    duplicateTask,
    removeTask,
    allNotifications,
    groupedNotifications,
    addNotification,
    updateNotification,
    buildSearchItems,
    search,
    groupedResults,
    addSearchHistory,
    clearSearchHistory,
    addRecent,
    clearRecent,
    setFavorite,
    pinResult,
    setRolePreview,
    applyRolePreview,
    updateSettings,
    saveFilter,
    removeFilter,
    saveTableView,
    removeTableView,
    toggleChecklistItem,
    checklistProgress,
    getUsersForProfiles,
    addActivity,
    getActivityLog,
    resetActivityLog
  };
})();
