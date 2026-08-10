(() => {
  const KEY = "adminV17PersonnelState";
  const V15_KEY = "adminV15DriverOps";
  const DISPO_KEY = "adminLiveDispoV131";
  const PLAN_KEY = "adminV23DayPlanning";

  const STATUS = {
    employee: ["aktiv", "im Dienst", "frei", "Urlaub", "krank", "Pause", "Schulung", "gesperrt", "ausgeschieden", "nicht verfuegbar", "in Probezeit", "Dokument ungueltig"],
    vacation: ["Entwurf", "beantragt", "in Pruefung", "genehmigt", "teilweise genehmigt", "abgelehnt", "zurueckgezogen", "storniert"],
    absence: ["gemeldet", "in Pruefung", "bestaetigt", "Rueckkehr geplant", "abgeschlossen"],
    proof: ["nicht erforderlich", "angekuendigt", "angefordert", "eingegangen", "geprueft", "fehlt", "unvollstaendig"],
    document: ["gueltig", "laeuft bald ab", "abgelaufen", "fehlt", "angefordert", "eingereicht", "ungeprueft", "unvollstaendig", "abgelehnt", "ersetzt"],
    training: ["geplant", "eingeladen", "bestaetigt", "teilgenommen", "nicht teilgenommen", "bestanden", "nicht bestanden", "Nachweis fehlt", "abgeschlossen"],
    task: ["offen", "in Bearbeitung", "wartet", "erledigt", "ueberfaellig", "storniert"],
    message: ["aktiv", "archiviert"],
    availability: ["verfuegbar", "nicht verfuegbar", "bevorzugt verfuegbar", "nur Fruehschicht", "nur Spaetschicht", "nur Nachtschicht", "keine Wochenenden", "nur kurzfristig", "Urlaub geplant"],
    shiftWish: ["eingereicht", "geprueft", "beruecksichtigt", "teilweise beruecksichtigt", "nicht moeglich", "erledigt"],
    swap: ["angefragt", "zustimmung Partner offen", "zustimmung Partner erteilt", "admin freigabe offen", "genehmigt", "abgelehnt", "storniert"]
  };

  const DOC_TYPES = [
    "Fuehrerschein", "Personenbefoerderungsschein", "Personalausweis", "Aufenthaltsdokument", "Arbeitserlaubnis", "Arbeitsvertrag", "Zusatzvereinbarung", "Datenschutzunterweisung", "Fuehrerscheinkontrolle", "Erste-Hilfe-Nachweis", "Rollstuhl-Unterweisung", "Fahrzeugunterweisung", "Sicherheitsunterweisung", "sonstiges Dokument"
  ];

  const TRAINING_TYPES = [
    "Einfuehrung neuer Mitarbeiter", "Datenschutz", "Arbeitssicherheit", "Erste Hilfe", "Verhalten im Notfall", "Rollstuhlbefoerderung", "Rollstuhlsicherung", "Krankenfahrten", "Umgang mit Patienten", "Fahrzeuguebergabe", "Unfallverhalten", "Taxameter", "Kartenlesegeraet", "Fahrer-App", "Kundenservice", "Beschwerdemanagement", "Elektrofahrzeug", "Brandschutz", "interne Prozessschulung"
  ];

  const ASSIGNEES = ["Admin Enes", "Admin Fatih", "Disponent", "Personalverwaltung"];

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function safeParse(raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function todayIso() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }

  function nowStamp() {
    const now = new Date();
    return `${todayIso()} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  }

  function normalize(value) {
    return String(value || "").toLocaleLowerCase("de-DE").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function daysUntil(dateIso) {
    if (!dateIso) return 99999;
    const today = new Date(`${todayIso()}T00:00:00`).getTime();
    const target = new Date(`${dateIso}T00:00:00`).getTime();
    if (Number.isNaN(target)) return 99999;
    return Math.floor((target - today) / 86400000);
  }

  function overlaps(aStart, aEnd, bStart, bEnd) {
    return aStart <= bEnd && bStart <= aEnd;
  }

  function ensureArray(value, fallback = []) {
    return Array.isArray(value) ? value : fallback;
  }

  function getPlanningStore() {
    const parsed = safeParse(localStorage.getItem(PLAN_KEY)) || {};
    parsed.days = parsed.days && typeof parsed.days === "object" ? parsed.days : {};
    return parsed;
  }

  function getPlanningDayState(dateIso) {
    const store = getPlanningStore();
    const day = store.days[dateIso] || {};
    return {
      variant: day.variant || "balanced",
      appointmentFilter: day.appointmentFilter || "alle",
      locks: day.locks || {},
      selectedDriverIds: Array.isArray(day.selectedDriverIds) ? day.selectedDriverIds : [],
      manualBlocks: Array.isArray(day.manualBlocks) ? day.manualBlocks : [],
      avisierung: day.avisierung || {},
      routeMapOpen: Boolean(day.routeMapOpen),
      confirmed: Boolean(day.confirmed),
      needsReview: Boolean(day.needsReview),
      history: Array.isArray(day.history) ? day.history : [],
      publishedPlan: day.publishedPlan || null,
      draftPlan: day.draftPlan || null
    };
  }

  function buildPlanEmployeeLookup(publishedPlan) {
    const map = {};
    if (!publishedPlan || !Array.isArray(publishedPlan.driverRows)) return map;
    publishedPlan.driverRows.forEach((row) => {
      map[row.employeeId] = row;
    });
    return map;
  }

  function planDisplayStatus(row, employee) {
    const status = normalize((row && row.status) || (employee && employee.status) || "");
    if (status.includes("urlaub")) return "Urlaub";
    if (status.includes("krank")) return "Krank";
    if (status.includes("frei") || status.includes("feierabend")) return "Frei";
    if (status.includes("schulung")) return "Schulung";
    if (row && row.published && row.shiftStart && row.shiftEnd) return "Im Dienst";
    return row && row.published ? "Im Dienst" : "Plan noch nicht veröffentlicht";
  }

  function formatPlanTimeRange(row) {
    if (!row || (!row.shiftStart && !row.shiftEnd)) return "-";
    if (row.shiftStart && row.shiftEnd) return `${row.shiftStart} – ${row.shiftEnd} Uhr`;
    return row.shiftStart || row.shiftEnd || "-";
  }

  function displayDocType(type) {
    if (normalize(type) === normalize("Fuehrerschein")) return "Führerschein";
    if (normalize(type) === normalize("Personenbefoerderungsschein")) return "Personenbeförderungsschein";
    return String(type || "Dokument");
  }

  function getEmployeeDayPlan(state, employeeId, dateIso) {
    const employee = getEmployee(state, employeeId);
    const dayState = getPlanningDayState(dateIso);
    const published = dayState.publishedPlan;
    const lookup = buildPlanEmployeeLookup(published);
    const row = lookup[employeeId] || null;

    const fallbackShift = dateIso === todayIso() ? (employee ? employee.todayShift || "" : "") : (employee ? employee.nextShift || "" : "");
    const fallbackVehicle = employee ? employee.activeVehicle || "" : "";
    const fallbackStatus = employee ? employee.status || "" : "";

    if (!published) {
      return {
        employeeId,
        date: dateIso,
        published: false,
        publishedAt: "",
        publishedBy: "",
        changed: false,
        status: dateIso === todayIso() ? fallbackStatus : "Plan noch nicht veröffentlicht",
        shiftText: dateIso === todayIso() ? fallbackShift || "-" : "Plan noch nicht veröffentlicht",
        vehicleText: dateIso === todayIso() ? fallbackVehicle || "" : "",
        vehicleLabel: dateIso === todayIso() ? fallbackVehicle || "" : "",
        planMessage: dateIso === todayIso() ? fallbackStatus : "Plan noch nicht veröffentlicht"
      };
    }

    if (!row) {
      return {
        employeeId,
        date: dateIso,
        published: true,
        publishedAt: published.publishedAt || "",
        publishedBy: published.publishedBy || "",
        changed: Boolean(published.changed),
        status: employee ? employee.status || "Plan veröffentlicht" : "Plan veröffentlicht",
        shiftText: dateIso === todayIso() ? fallbackShift || "-" : fallbackShift || "-",
        vehicleText: dateIso === todayIso() ? fallbackVehicle || "" : fallbackVehicle || "",
        vehicleLabel: dateIso === todayIso() ? fallbackVehicle || "" : fallbackVehicle || "",
        planMessage: published.changed ? "Plan wurde nach Veröffentlichung geändert" : "Plan veröffentlicht",
        note: ""
      };
    }

    const vehicleText = String(row.vehicleLabel || row.vehicle || row.vehicleId || "").trim();
    const statusText = planDisplayStatus(row, employee);
    return {
      employeeId,
      date: dateIso,
      published: true,
      publishedAt: published.publishedAt || "",
      publishedBy: published.publishedBy || "",
      changed: Boolean(published.changed),
      status: statusText,
      shiftText: formatPlanTimeRange(row),
      vehicleText,
      vehicleLabel: vehicleText,
      planMessage: published.changed ? "Plan wurde nach Veröffentlichung geändert" : "Plan veröffentlicht",
      note: row.note || ""
    };
  }

  function getEmployeeDocumentAlerts(state, employeeId) {
    const docs = listEmployeeDocs(state, employeeId);
    const alerts = [];
    const criticalTypes = ["Fuehrerschein", "Personenbefoerderungsschein"];
    criticalTypes.forEach((type) => {
      const docsOfType = docs.filter((doc) => normalize(doc.type) === normalize(type));
      if (!docsOfType.length) {
        const label = displayDocType(type);
        alerts.push({ level: "kritisch", type, title: `${label} fehlt`, text: `Bitte reiche deinen ${label} ein.`, action: "Dokument senden" });
        return;
      }
      const doc = docsOfType[0];
      const days = daysUntil(doc.validUntil);
      if (doc.status === "abgelaufen") {
        const label = displayDocType(type);
        alerts.push({ level: "kritisch", type, title: `${label} abgelaufen`, text: `Dein ${label} ist abgelaufen.`, action: "Neues Dokument senden" });
      } else if (doc.status === "fehlt" || doc.status === "angefordert") {
        alerts.push({ level: "wichtig", type, title: `${displayDocType(type)} benötigt`, text: `Taxi Germersheim benötigt eine aktuelle Version.`, action: "Jetzt einreichen" });
      } else if (days >= 0 && days <= 30) {
        const label = displayDocType(type);
        alerts.push({ level: "wichtig", type, title: `${label} läuft bald ab`, text: `Dein ${label} läuft am ${doc.validUntil ? `${doc.validUntil.split("-").reverse().join(".")}` : "bald"} ab.`, action: "Neues Dokument senden" });
      }
    });

    docs.forEach((doc) => {
      const days = daysUntil(doc.validUntil);
      if (doc.status === "eingereicht") {
        alerts.push({ level: "normal", type: doc.type, title: `${displayDocType(doc.type)} eingereicht`, text: `Dein Dokument wurde an die Verwaltung übergeben.`, action: "Verstanden" });
      } else if (doc.status === "geprueft") {
        alerts.push({ level: "normal", type: doc.type, title: `${displayDocType(doc.type)} geprüft`, text: `Dein Dokument wurde geprüft.`, action: "Verstanden" });
      } else if (days >= 0 && days <= 7 && !criticalTypes.some((type) => normalize(type) === normalize(doc.type))) {
        alerts.push({ level: "wichtig", type: doc.type, title: `${displayDocType(doc.type)} läuft bald ab`, text: `Dein ${displayDocType(doc.type)} läuft am ${doc.validUntil ? `${doc.validUntil.split("-").reverse().join(".")}` : "bald"} ab.`, action: "Neues Dokument senden" });
      }
    });

    return alerts.sort((a, b) => {
      const rank = { kritisch: 0, wichtig: 1, normal: 2 };
      return (rank[a.level] || 9) - (rank[b.level] || 9);
    }).slice(0, 4);
  }

  function getEmployeePortalSnapshot(state, employeeId) {
    const employee = getEmployee(state, employeeId);
    if (!employee) return null;
    const todayPlan = getEmployeeDayPlan(state, employeeId, todayIso());
    const tomorrow = new Date(`${todayIso()}T00:00:00`);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowIsoValue = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
    const tomorrowPlan = getEmployeeDayPlan(state, employeeId, tomorrowIsoValue);
    const docs = listEmployeeDocs(state, employeeId);
    const messages = listEmployeeMessages(state, employeeId).sort((a, b) => {
      const pa = a.priority === "wichtig" ? 2 : 1;
      const pb = b.priority === "wichtig" ? 2 : 1;
      return pb - pa;
    });

    return {
      employee,
      todayPlan,
      tomorrowPlan,
      docs,
      messages,
      alerts: getEmployeeDocumentAlerts(state, employeeId),
      unreadMessages: messages.filter((msg) => !(msg.reads || {})[employeeId]).length,
      vacationQuota: getVacationQuota(state, employeeId),
      tomorrowPublished: tomorrowPlan.published,
      tomorrowChanged: tomorrowPlan.changed,
      tomorrowPublishedAt: tomorrowPlan.publishedAt,
      tomorrowPublishedBy: tomorrowPlan.publishedBy
    };
  }

  function addEmployeeMessage(state, payload) {
    const employeeIds = ensureArray(payload.employeeIds, payload.employeeId ? [payload.employeeId] : []);
    const reads = {};
    const confirmations = {};
    employeeIds.forEach((employeeId) => {
      reads[employeeId] = false;
      confirmations[employeeId] = false;
    });
    const row = {
      id: `MSG-${Date.now()}-${Math.floor(Math.random() * 9)}`,
      title: payload.title || "Mitteilung",
      text: payload.text || "",
      category: payload.category || "allgemeine Information",
      priority: payload.priority || "normal",
      recipients: payload.recipients || (employeeIds.length === 1 ? "einzelne Mitarbeiter" : "mehrere Mitarbeiter"),
      roles: ensureArray(payload.roles, []),
      employeeIds,
      from: payload.from || todayIso(),
      to: payload.to || "",
      confirmRequired: Boolean(payload.confirmRequired),
      attachment: payload.attachment || "",
      createdBy: payload.createdBy || "System",
      status: "aktiv",
      reads,
      confirmations,
      lastReminder: "",
      eventType: payload.eventType || "system",
      source: payload.source || "in-app"
    };
    state.messages.unshift(row);
    state.notifications.unshift({ id: `PN-${Date.now()}`, at: nowStamp(), title: row.title, priority: row.priority, ref: row.id, eventType: row.eventType });
    saveState(state);
    return row;
  }

  function ensureEmployeeShape(emp) {
    const next = { ...emp };
    next.employmentType = next.employmentType || "Vollzeit";
    if (!["Vollzeit", "Teilzeit", "Minijob", "Aushilfe", "Springer"].includes(next.employmentType)) {
      next.employmentType = "Springer";
    }
    next.licenseCheckedAt = next.licenseCheckedAt || "";
    next.licenseCheckedBy = next.licenseCheckedBy || "";
    next.pPermitCheckedAt = next.pPermitCheckedAt || "";
    next.pPermitCheckedBy = next.pPermitCheckedBy || "";
    next.documentStatus = next.documentStatus || "ungeprueft";
    next.preferredVehicle = next.preferredVehicle || "";
    next.allowedVehicles = ensureArray(next.allowedVehicles, []);
    next.blockedVehicles = ensureArray(next.blockedVehicles, []);
    next.fixedVehicle = next.fixedVehicle || "";
    next.replacementVehicles = ensureArray(next.replacementVehicles, []);
    next.preferredServiceType = next.preferredServiceType || "";
    return next;
  }

  function buildEmployees() {
    return [
      {
        id: "MA-101",
        firstName: "Mila",
        lastName: "Becker",
        birthDate: "1991-04-12",
        birthPlace: "Speyer",
        phone: "0172 8100101",
        altPhone: "0176 1100101",
        email: "mila.becker.demo@taxi-g.de",
        address: "Germersheim, Rheinstrasse 12",
        language: "Deutsch",
        image: "",
        role: "Fahrer",
        employmentType: "Vollzeit",
        status: "im Dienst",
        employeeId: "MA-101",
        entryDate: "2025-03-01",
        probationUntil: "2026-09-15",
        contractStart: "2025-03-01",
        contractEnd: "",
        location: "Germersheim",
        shiftModel: "Frueh/Spaet",
        preferredHours: "Fruehschicht",
        licenseClass: "B, D1",
        licenseNo: "FS-DEM-1011",
        licenseValidUntil: "2027-06-30",
        pPermit: "Ja",
        pPermitValidUntil: "2026-08-19",
        driverCard: "aktiv",
        preferredVehicleType: "Limousine",
        wheelchairSkill: true,
        largeVehicleSkill: false,
        evTraining: true,
        qualifications: ["Krankenfahrt", "Rollstuhlfahrt", "Fahrer-App"],
        emergency: { name: "Jonas Becker", relation: "Partner", phone: "0176 5500110", altPhone: "" },
        internalContact: "Admin Enes",
        internalNotes: "P-Schein rechtzeitig nachreichen.",
        onboardingDocsDone: true,
        clothingIssued: true,
        keysIssued: true,
        tabletIssued: true,
        credentialsIssued: true,
        probation: true,
        activeVehicle: "GER TX100",
        todayShift: "05:00-13:00",
        nextShift: "2026-08-04 05:00",
        lastActivity: "Statusupdate 08:12",
        profileNote: "Neue Mitarbeiterin mit guter Klinik-Erfahrung",
        offboarding: null
      },
      {
        id: "MA-102",
        firstName: "Emir",
        lastName: "Kaya",
        birthDate: "1987-11-05",
        birthPlace: "Karlsruhe",
        phone: "0172 8100102",
        altPhone: "",
        email: "emir.kaya.demo@taxi-g.de",
        address: "Lingenfeld, Waldweg 3",
        language: "Deutsch/Tuerkisch",
        image: "",
        role: "Fahrer",
        employmentType: "Teilzeit",
        status: "Urlaub",
        employeeId: "MA-102",
        entryDate: "2021-06-10",
        probationUntil: "",
        contractStart: "2021-06-10",
        contractEnd: "",
        location: "Germersheim",
        shiftModel: "Flex",
        preferredHours: "Spaetschicht",
        licenseClass: "B",
        licenseNo: "FS-DEM-1022",
        licenseValidUntil: "2026-07-20",
        pPermit: "Ja",
        pPermitValidUntil: "2026-10-05",
        driverCard: "aktiv",
        preferredVehicleType: "Kombi",
        wheelchairSkill: false,
        largeVehicleSkill: true,
        evTraining: false,
        qualifications: ["Grossraumfahrzeug", "Kundenservice"],
        emergency: { name: "Elif Kaya", relation: "Schwester", phone: "0178 3322211", altPhone: "" },
        internalContact: "Admin Fatih",
        internalNotes: "Fuehrerschein erneuern.",
        onboardingDocsDone: true,
        clothingIssued: true,
        keysIssued: true,
        tabletIssued: false,
        credentialsIssued: true,
        probation: false,
        activeVehicle: "-",
        todayShift: "Urlaub",
        nextShift: "2026-08-10 13:00",
        lastActivity: "Urlaub beantragt 2026-07-30",
        profileNote: "Lange Betriebszugehoerigkeit",
        offboarding: null
      },
      {
        id: "MA-103",
        firstName: "Sara",
        lastName: "Neumann",
        birthDate: "1995-09-08",
        birthPlace: "Landau",
        phone: "0172 8100103",
        altPhone: "",
        email: "sara.neumann.demo@taxi-g.de",
        address: "Germersheim, Innenstadt 6",
        language: "Deutsch",
        image: "",
        role: "Disposition",
        employmentType: "Vollzeit",
        status: "im Dienst",
        employeeId: "MA-103",
        entryDate: "2020-02-15",
        probationUntil: "",
        contractStart: "2020-02-15",
        contractEnd: "",
        location: "Leitstelle",
        shiftModel: "Tagdienst",
        preferredHours: "08:00-16:00",
        licenseClass: "-",
        licenseNo: "",
        licenseValidUntil: "",
        pPermit: "Nein",
        pPermitValidUntil: "",
        driverCard: "-",
        preferredVehicleType: "-",
        wheelchairSkill: false,
        largeVehicleSkill: false,
        evTraining: true,
        qualifications: ["Fahrer-App", "Beschwerdemanagement"],
        emergency: { name: "Tobias Neumann", relation: "Ehemann", phone: "0177 1199880", altPhone: "" },
        internalContact: "Admin Enes",
        internalNotes: "Schichttauschfreigabe moeglich",
        onboardingDocsDone: true,
        clothingIssued: true,
        keysIssued: true,
        tabletIssued: true,
        credentialsIssued: true,
        probation: false,
        activeVehicle: "-",
        todayShift: "08:00-16:00",
        nextShift: "2026-08-04 08:00",
        lastActivity: "Vertretungsanfrage geprueft",
        profileNote: "Leitstellenkoordination",
        offboarding: null
      },
      {
        id: "MA-104",
        firstName: "Jule",
        lastName: "Hoffmann",
        birthDate: "1999-12-21",
        birthPlace: "Germersheim",
        phone: "0172 8100104",
        altPhone: "",
        email: "jule.hoffmann.demo@taxi-g.de",
        address: "Germersheim, Nordring 8",
        language: "Deutsch",
        image: "",
        role: "Fahrer",
        employmentType: "Aushilfe",
        status: "krank",
        employeeId: "MA-104",
        entryDate: "2026-05-20",
        probationUntil: "2026-11-20",
        contractStart: "2026-05-20",
        contractEnd: "2027-05-19",
        location: "Germersheim",
        shiftModel: "Bedarf",
        preferredHours: "nur Spaetschicht",
        licenseClass: "B",
        licenseNo: "FS-DEM-1044",
        licenseValidUntil: "2028-01-01",
        pPermit: "Ja",
        pPermitValidUntil: "2026-07-30",
        driverCard: "aktiv",
        preferredVehicleType: "Grossraum",
        wheelchairSkill: true,
        largeVehicleSkill: true,
        evTraining: false,
        qualifications: ["Grossraumfahrzeug"],
        emergency: { name: "Nina Hoffmann", relation: "Mutter", phone: "", altPhone: "" },
        internalContact: "Personalverwaltung",
        internalNotes: "Nachweis fuer Krankmeldung fehlt noch",
        onboardingDocsDone: false,
        clothingIssued: true,
        keysIssued: false,
        tabletIssued: false,
        credentialsIssued: true,
        probation: true,
        activeVehicle: "-",
        todayShift: "Krank",
        nextShift: "offen",
        lastActivity: "Krankmeldung ueber Portal",
        profileNote: "Neuzugang in Probezeit",
        offboarding: null
      },
      {
        id: "MA-105",
        firstName: "Fatih",
        lastName: "Demir",
        birthDate: "1988-03-18",
        birthPlace: "Mannheim",
        phone: "0172 8100105",
        altPhone: "",
        email: "fatih.demir.demo@taxi-g.de",
        address: "Speyer, Hauptstrasse 44",
        language: "Deutsch",
        image: "",
        role: "Admin",
        employmentType: "Vollzeit",
        status: "aktiv",
        employeeId: "MA-105",
        entryDate: "2019-08-01",
        probationUntil: "",
        contractStart: "2019-08-01",
        contractEnd: "",
        location: "Verwaltung",
        shiftModel: "Tagdienst",
        preferredHours: "08:00-17:00",
        licenseClass: "B",
        licenseNo: "FS-DEM-1055",
        licenseValidUntil: "2027-12-01",
        pPermit: "Nein",
        pPermitValidUntil: "",
        driverCard: "-",
        preferredVehicleType: "-",
        wheelchairSkill: false,
        largeVehicleSkill: false,
        evTraining: true,
        qualifications: ["Datenschutz", "Prozessschulung"],
        emergency: { name: "Selma Demir", relation: "Ehepartner", phone: "0173 010101", altPhone: "" },
        internalContact: "Geschaeftsleitung",
        internalNotes: "Admin-Rolle erweitert",
        onboardingDocsDone: true,
        clothingIssued: false,
        keysIssued: true,
        tabletIssued: true,
        credentialsIssued: true,
        probation: false,
        activeVehicle: "-",
        todayShift: "08:00-17:00",
        nextShift: "2026-08-04 08:00",
        lastActivity: "Benutzerverwaltung aktualisiert",
        profileNote: "Admin Fatih",
        offboarding: null
      },
      {
        id: "MA-106",
        firstName: "Nora",
        lastName: "Yildiz",
        birthDate: "1992-06-11",
        birthPlace: "Landau",
        phone: "0172 8100106",
        altPhone: "",
        email: "nora.yildiz.demo@taxi-g.de",
        address: "Bellheim, Gartenweg 9",
        language: "Deutsch",
        image: "",
        role: "Verwaltung",
        employmentType: "Teilzeit",
        status: "Schulung",
        employeeId: "MA-106",
        entryDate: "2024-01-03",
        probationUntil: "",
        contractStart: "2024-01-03",
        contractEnd: "",
        location: "Verwaltung",
        shiftModel: "Tagdienst",
        preferredHours: "09:00-15:00",
        licenseClass: "-",
        licenseNo: "",
        licenseValidUntil: "",
        pPermit: "Nein",
        pPermitValidUntil: "",
        driverCard: "-",
        preferredVehicleType: "-",
        wheelchairSkill: false,
        largeVehicleSkill: false,
        evTraining: false,
        qualifications: ["Dokumentenverwaltung"],
        emergency: { name: "Kaan Yildiz", relation: "Bruder", phone: "0177 000111", altPhone: "" },
        internalContact: "Admin Enes",
        internalNotes: "Datenschutzschulung offen",
        onboardingDocsDone: true,
        clothingIssued: false,
        keysIssued: true,
        tabletIssued: false,
        credentialsIssued: true,
        probation: false,
        activeVehicle: "-",
        todayShift: "Schulung",
        nextShift: "2026-08-04 09:00",
        lastActivity: "Schulungstermin bestaetigt",
        profileNote: "Personalakte in Bearbeitung",
        offboarding: null
      }
    ];
  }

  function buildVacations() {
    return [
      { id: "VAC-1", employeeId: "MA-102", start: "2026-08-03", end: "2026-08-09", halfDay: false, workDaysDemo: 5, type: "Erholungsurlaub", replacementId: "MA-101", comment: "Familienurlaub", internalNote: "Abgedeckt", requester: "MA-102", createdAt: "2026-07-30", status: "genehmigt", decisionBy: "Admin Enes", decisionAt: "2026-07-31", decisionNote: "ok" },
      { id: "VAC-2", employeeId: "MA-104", start: "2026-08-18", end: "2026-08-22", halfDay: false, workDaysDemo: 5, type: "Resturlaub", replacementId: "MA-101", comment: "", internalNote: "Konflikt mit Schulung", requester: "MA-104", createdAt: "2026-08-02", status: "beantragt", decisionBy: "", decisionAt: "", decisionNote: "" },
      { id: "VAC-3", employeeId: "MA-101", start: "2026-09-02", end: "2026-09-03", halfDay: true, workDaysDemo: 1, type: "halber Urlaubstag", replacementId: "MA-103", comment: "Familientermin", internalNote: "", requester: "MA-101", createdAt: "2026-08-01", status: "in Pruefung", decisionBy: "", decisionAt: "", decisionNote: "" }
    ];
  }

  function buildAbsences() {
    return [
      { id: "ABS-1", employeeId: "MA-104", kind: "Krank", start: "2026-08-03", expectedEnd: "2026-08-05", returnedAt: "", receivedAt: "2026-08-03", via: "Mitarbeiterportal", proofStatus: "angefordert", replacementId: "MA-101", note: "Rueckruf gewuenscht", status: "gemeldet", affectedShifts: ["Spaetschicht 03.08", "Spaetschicht 04.08"] },
      { id: "ABS-2", employeeId: "MA-106", kind: "Schulung", start: "2026-08-03", expectedEnd: "2026-08-03", returnedAt: "", receivedAt: "2026-07-28", via: "persoenlich", proofStatus: "nicht erforderlich", replacementId: "", note: "Datenschutz", status: "bestaetigt", affectedShifts: ["Tagdienst 03.08"] }
    ];
  }

  function buildDocuments() {
    return [
      { id: "PDOC-1", employeeId: "MA-101", type: "Fuehrerschein", no: "FS-DEM-1011", issuedAt: "2021-06-01", validUntil: "2027-06-30", issuer: "Stadt Speyer", status: "gueltig", checkedAt: "2026-07-20", checkedBy: "Admin Fatih", reminder: "30 Tage", note: "", reminderActive: true },
      { id: "PDOC-2", employeeId: "MA-101", type: "Personenbefoerderungsschein", no: "PS-DEM-7781", issuedAt: "2023-08-19", validUntil: "2026-08-19", issuer: "Landratsamt", status: "laeuft bald ab", checkedAt: "2026-07-20", checkedBy: "Admin Enes", reminder: "14 Tage", note: "", reminderActive: true },
      { id: "PDOC-3", employeeId: "MA-102", type: "Fuehrerschein", no: "FS-DEM-1022", issuedAt: "2016-07-20", validUntil: "2026-07-20", issuer: "Stadt Karlsruhe", status: "abgelaufen", checkedAt: "2026-07-21", checkedBy: "Admin Fatih", reminder: "am Ablaufdatum", note: "Sperrhinweis", reminderActive: true },
      { id: "PDOC-4", employeeId: "MA-104", type: "Personenbefoerderungsschein", no: "PS-DEM-3320", issuedAt: "2023-07-30", validUntil: "2026-07-30", issuer: "Stadt Germersheim", status: "abgelaufen", checkedAt: "2026-08-01", checkedBy: "Admin Enes", reminder: "nach Ablauf", note: "Nachreichen", reminderActive: true },
      { id: "PDOC-5", employeeId: "MA-104", type: "Datenschutzunterweisung", no: "DS-104", issuedAt: "", validUntil: "", issuer: "", status: "fehlt", checkedAt: "", checkedBy: "", reminder: "30 Tage", note: "Unterweisung fehlt", reminderActive: true }
    ];
  }

  function buildLicenseChecks() {
    return [
      { id: "LC-1", employeeId: "MA-101", date: "2026-07-20", time: "08:10", checkedBy: "Admin Fatih", shown: "Ja", validityConfirmed: "Ja", classesConfirmed: "B, D1", issue: "", nextCheck: "2026-10-20", note: "ok", signature: "MB" },
      { id: "LC-2", employeeId: "MA-102", date: "2026-07-21", time: "09:30", checkedBy: "Admin Enes", shown: "Ja", validityConfirmed: "Nein", classesConfirmed: "B", issue: "Ablauf erreicht", nextCheck: "2026-08-05", note: "Rueckfrage", signature: "EK" }
    ];
  }

  function buildTrainings() {
    return [
      { id: "TR-1", title: "Datenschutz", category: "Datenschutz", date: "2026-08-07", time: "10:00", place: "Schulungsraum 1", trainer: "Nina Schulz", participants: ["MA-106", "MA-101"], status: "eingeladen", mandatory: true, repeat: "jaehrlich", evidence: "offen" },
      { id: "TR-2", title: "Rollstuhlsicherung", category: "Rollstuhlsicherung", date: "2026-08-04", time: "14:00", place: "Hof", trainer: "Kai Mertens", participants: ["MA-104"], status: "Nachweis fehlt", mandatory: true, repeat: "alle 2 Jahre", evidence: "fehlt" },
      { id: "TR-3", title: "Fahrer-App Update", category: "Fahrer-App", date: "2026-08-03", time: "09:00", place: "Leitstelle", trainer: "Sara Neumann", participants: ["MA-101", "MA-102"], status: "abgeschlossen", mandatory: false, repeat: "bei Update", evidence: "vorhanden" }
    ];
  }

  function buildMessages() {
    return [
      { id: "MSG-1", title: "Wichtige Dokumentenfrist", text: "Bitte P-Schein bis 19.08 vorlegen.", category: "Dokumentenfrist", priority: "wichtig", recipients: "alle Fahrer", roles: ["Fahrer"], employeeIds: ["MA-101", "MA-102", "MA-104"], from: "2026-08-01", to: "2026-08-20", confirmRequired: true, attachment: "", createdBy: "Admin Enes", status: "aktiv", reads: { "MA-101": true, "MA-102": false, "MA-104": false }, confirmations: { "MA-101": true, "MA-102": false, "MA-104": false }, lastReminder: "2026-08-02" },
      { id: "MSG-2", title: "Dienstplanaenderung Spaet", text: "Spaetschicht 04.08 um 30 Min vorgezogen.", category: "Dienstplanaenderung", priority: "normal", recipients: "bestimmte Schicht", roles: ["Fahrer"], employeeIds: ["MA-101", "MA-104"], from: "2026-08-03", to: "2026-08-05", confirmRequired: false, attachment: "", createdBy: "Disponent", status: "aktiv", reads: { "MA-101": false, "MA-104": false }, confirmations: {}, lastReminder: "" }
    ];
  }

  function buildTasks() {
    return [
      { id: "PT-1", title: "Fuehrerschein kontrollieren", employeeId: "MA-102", category: "Fuehrerschein kontrollieren", owner: "Admin Enes", dueDate: "2026-08-05", priority: "kritisch", status: "offen", note: "Ablauf pruefen", relationType: "Dokument", relationId: "PDOC-3" },
      { id: "PT-2", title: "Urlaubsantrag pruefen", employeeId: "MA-104", category: "Urlaubsantrag pruefen", owner: "Personalverwaltung", dueDate: "2026-08-04", priority: "wichtig", status: "in Bearbeitung", note: "Konflikt mit Schulung", relationType: "Urlaub", relationId: "VAC-2" },
      { id: "PT-3", title: "Rueckkehr nach Krankheit", employeeId: "MA-104", category: "Rueckkehr nach Krankheit", owner: "Disponent", dueDate: "2026-08-06", priority: "normal", status: "wartet", note: "Nachweis nachreichen", relationType: "Abwesenheit", relationId: "ABS-1" }
    ];
  }

  function buildAvailabilities() {
    return [
      { id: "AVL-1", employeeId: "MA-101", mode: "bevorzugt verfuegbar", shiftPref: "nur Fruehschicht", days: ["Mo", "Di", "Mi", "Do"], start: "2026-08-04", end: "2026-09-30", recurring: true, comment: "Kinderbetreuung" },
      { id: "AVL-2", employeeId: "MA-102", mode: "Urlaub geplant", shiftPref: "", days: [], start: "2026-08-03", end: "2026-08-09", recurring: false, comment: "Urlaub" },
      { id: "AVL-3", employeeId: "MA-104", mode: "nicht verfuegbar", shiftPref: "", days: ["Mo", "Di", "Mi"], start: "2026-08-03", end: "2026-08-05", recurring: false, comment: "krank" }
    ];
  }

  function buildShiftWishes() {
    return [
      { id: "SW-1", employeeId: "MA-101", wishType: "gewuenschte Schicht", wishValue: "Frueh", vehiclePref: "GER TX100", areaPref: "Klinik", swapWith: "", comment: "Mo-Do Frueh", status: "geprueft" },
      { id: "SW-2", employeeId: "MA-104", wishType: "gewuenschter freier Tag", wishValue: "2026-08-22", vehiclePref: "", areaPref: "", swapWith: "", comment: "Familientermin", status: "eingereicht" }
    ];
  }

  function buildShiftSwaps() {
    return [
      { id: "SS-1", employeeId: "MA-101", ownShift: "2026-08-06 Frueh", partnerId: "MA-102", desiredShift: "2026-08-06 Spaet", reason: "Arzttermin", partnerConsent: false, adminApproval: false, checks: { qualification: true, docsValid: true, vehicleReady: true, overlap: false, absent: false, demoMaxHours: true }, status: "zustimmung Partner offen" }
    ];
  }

  function buildCoverage() {
    return [
      { id: "COV-1", date: "2026-08-03", shift: "Frueh", missingEmployeeId: "MA-104", reason: "Krank", requiredRole: "Fahrer", requiredQualification: "Rollstuhlfahrt", vehicle: "GER TX200", candidates: ["MA-101"], conflicts: ["MA-101 bereits geplant 05:00-13:00"] }
    ];
  }

  function buildOnboarding() {
    return [
      { id: "ONB-1", employeeId: "MA-104", items: [
        { label: "Stammdaten vollstaendig", status: "in Bearbeitung" },
        { label: "Vertrag vorhanden", status: "erledigt" },
        { label: "Fuehrerschein geprueft", status: "erledigt" },
        { label: "P-Schein geprueft", status: "offen" },
        { label: "Datenschutzunterweisung", status: "offen" },
        { label: "Arbeitssicherheitsunterweisung", status: "offen" },
        { label: "Fahrer-App erklaert", status: "erledigt" },
        { label: "Fahrzeuguebergabe erklaert", status: "erledigt" },
        { label: "Kartenlesegeraet erklaert", status: "in Bearbeitung" },
        { label: "Taxameter erklaert", status: "offen" },
        { label: "Arbeitskleidung ausgegeben", status: "erledigt" },
        { label: "Schluessel ausgegeben", status: "offen" },
        { label: "Tablet ausgegeben", status: "offen" },
        { label: "Zugang erstellt", status: "erledigt" },
        { label: "Notfallkontakt hinterlegt", status: "blockiert" },
        { label: "erste Schicht geplant", status: "in Bearbeitung" }
      ] }
    ];
  }

  function buildOffboarding() {
    return [
      { id: "OFF-1", employeeId: "MA-199", exitDate: "2026-09-30", lastShift: "2026-09-29 Spaet", items: [
        { label: "Fahrzeug zurueckgegeben", status: "offen" },
        { label: "Schluessel zurueckgegeben", status: "offen" },
        { label: "Tablet zurueckgegeben", status: "offen" },
        { label: "Kartenlesegeraet zurueckgegeben", status: "offen" },
        { label: "Arbeitskleidung zurueckgegeben", status: "offen" },
        { label: "Zugaenge gesperrt", status: "offen" },
        { label: "offene Aufgaben geprueft", status: "offen" },
        { label: "Dokumente archiviert", status: "offen" },
        { label: "interne Uebergabe abgeschlossen", status: "offen" }
      ] }
    ];
  }

  function buildHistory() {
    return [
      { id: "EH-1", at: "2026-05-20 08:00", employeeId: "MA-104", event: "Eintritt", by: "Admin Enes", note: "Aushilfe gestartet" },
      { id: "EH-2", at: "2026-07-01 09:00", employeeId: "MA-101", event: "Schulung abgeschlossen", by: "Admin Fatih", note: "Rollstuhlsicherung" },
      { id: "EH-3", at: "2026-08-03 07:15", employeeId: "MA-104", event: "Krankmeldung", by: "Portal", note: "ohne Diagnose" }
    ];
  }

  function createDefaultState() {
    return {
      version: 1,
      createdAt: nowStamp(),
      updatedAt: nowStamp(),
      year: new Date().getFullYear(),
      employees: buildEmployees(),
      vacations: buildVacations(),
      absences: buildAbsences(),
      availabilities: buildAvailabilities(),
      shiftWishes: buildShiftWishes(),
      shiftSwaps: buildShiftSwaps(),
      documents: buildDocuments(),
      licenseChecks: buildLicenseChecks(),
      trainings: buildTrainings(),
      messages: buildMessages(),
      tasks: buildTasks(),
      coverage: buildCoverage(),
      onboarding: buildOnboarding(),
      offboarding: buildOffboarding(),
      history: buildHistory(),
      notifications: [],
      ui: {
        selectedEmployeeId: "MA-101"
      }
    };
  }

  function enrichDocumentStatuses(state) {
    state.documents.forEach((doc) => {
      if (doc.status === "abgelaufen" || doc.status === "fehlt") return;
      if (!doc.validUntil) return;
      const days = daysUntil(doc.validUntil);
      if (days < 0) {
        doc.status = "abgelaufen";
      } else if (days <= 30 && doc.status === "gueltig") {
        doc.status = "laeuft bald ab";
      }
    });
  }

  function applyDocumentBlocks(state) {
    const byEmployee = {};
    state.documents.forEach((doc) => {
      byEmployee[doc.employeeId] = byEmployee[doc.employeeId] || [];
      byEmployee[doc.employeeId].push(doc);
    });

    state.employees.forEach((emp) => {
      const docs = byEmployee[emp.id] || [];
      const critical = docs.some((d) => (d.type === "Fuehrerschein" || d.type === "Personenbefoerderungsschein") && d.status === "abgelaufen");
      if (critical) {
        emp.status = "Dokument ungueltig";
      }
    });
  }

  function ensureShape(data) {
    const d = data && typeof data === "object" ? data : createDefaultState();
    d.employees = ensureArray(d.employees, buildEmployees()).map(ensureEmployeeShape);
    d.vacations = ensureArray(d.vacations, buildVacations());
    d.absences = ensureArray(d.absences, buildAbsences());
    d.availabilities = ensureArray(d.availabilities, buildAvailabilities());
    d.shiftWishes = ensureArray(d.shiftWishes, buildShiftWishes());
    d.shiftSwaps = ensureArray(d.shiftSwaps, buildShiftSwaps());
    d.documents = ensureArray(d.documents, buildDocuments());
    d.licenseChecks = ensureArray(d.licenseChecks, buildLicenseChecks());
    d.trainings = ensureArray(d.trainings, buildTrainings());
    d.messages = ensureArray(d.messages, buildMessages());
    d.tasks = ensureArray(d.tasks, buildTasks());
    d.coverage = ensureArray(d.coverage, buildCoverage());
    d.onboarding = ensureArray(d.onboarding, buildOnboarding());
    d.offboarding = ensureArray(d.offboarding, buildOffboarding());
    d.history = ensureArray(d.history, buildHistory());
    d.notifications = ensureArray(d.notifications, []);
    d.ui = d.ui && typeof d.ui === "object" ? d.ui : { selectedEmployeeId: "" };
    d.updatedAt = d.updatedAt || nowStamp();
    enrichDocumentStatuses(d);
    applyDocumentBlocks(d);
    return d;
  }

  function loadState() {
    const parsed = safeParse(localStorage.getItem(KEY));
    if (!parsed) return ensureShape(createDefaultState());
    return ensureShape(parsed);
  }

  function saveState(state) {
    state.updatedAt = nowStamp();
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  function resetState() {
    const fresh = createDefaultState();
    saveState(fresh);
    return fresh;
  }

  function resetVacationYear(state) {
    state.vacations = buildVacations();
    state.absences = buildAbsences();
    state.coverage = buildCoverage();
    state.notifications.unshift({ id: `PN-${Date.now()}`, at: nowStamp(), title: "Urlaubsjahr zurueckgesetzt", priority: "normal" });
    saveState(state);
    return state;
  }

  function getEmployee(state, employeeId) {
    return state.employees.find((emp) => emp.id === employeeId) || null;
  }

  function listEmployeeDocs(state, employeeId) {
    return state.documents.filter((doc) => doc.employeeId === employeeId);
  }

  function listEmployeeTrainings(state, employeeId) {
    return state.trainings.filter((tr) => (tr.participants || []).includes(employeeId));
  }

  function listEmployeeTasks(state, employeeId) {
    return state.tasks.filter((task) => task.employeeId === employeeId);
  }

  function listEmployeeMessages(state, employeeId) {
    return state.messages.filter((msg) => (msg.employeeIds || []).includes(employeeId));
  }

  function isEmployeeAbsentToday(state, employeeId) {
    const t = todayIso();
    return state.vacations.some((v) => v.employeeId === employeeId && ["genehmigt", "teilweise genehmigt"].includes(v.status) && t >= v.start && t <= v.end)
      || state.absences.some((a) => a.employeeId === employeeId && t >= a.start && t <= a.expectedEnd && a.status !== "abgeschlossen");
  }

  function getVacationQuota(state, employeeId) {
    const taken = state.vacations
      .filter((v) => v.employeeId === employeeId && ["genehmigt", "teilweise genehmigt"].includes(v.status))
      .reduce((sum, v) => sum + Number(v.workDaysDemo || 0), 0);
    const approved = state.vacations
      .filter((v) => v.employeeId === employeeId && v.status === "genehmigt")
      .reduce((sum, v) => sum + Number(v.workDaysDemo || 0), 0);
    const requested = state.vacations
      .filter((v) => v.employeeId === employeeId && ["beantragt", "in Pruefung"].includes(v.status))
      .reduce((sum, v) => sum + Number(v.workDaysDemo || 0), 0);

    const yearly = 30;
    const carry = 3;
    return {
      yearly,
      taken,
      approved,
      requested,
      carry,
      special: state.vacations.filter((v) => v.employeeId === employeeId && v.type === "Sonderurlaub").reduce((s, v) => s + Number(v.workDaysDemo || 0), 0),
      remaining: Math.max(0, yearly + carry - taken - requested)
    };
  }

  function evaluateVacationConflicts(state, request) {
    const issues = [];
    const employee = getEmployee(state, request.employeeId);
    const start = request.start;
    const end = request.end;
    const isDriver = employee && employee.role === "Fahrer";

    const overlappingVacations = state.vacations.filter((v) => v.id !== request.id && ["genehmigt", "teilweise genehmigt", "beantragt", "in Pruefung"].includes(v.status) && overlaps(start, end, v.start, v.end));
    if (overlappingVacations.some((v) => v.employeeId === request.employeeId)) {
      issues.push({ cause: "bereits genehmigte Abwesenheit", days: `${start} bis ${end}`, employees: [request.employeeId], shifts: [""], suggestion: "Zeitraum aendern" });
    }

    const absentDrivers = overlappingVacations.filter((v) => {
      const e = getEmployee(state, v.employeeId);
      return e && e.role === "Fahrer";
    }).length + (isDriver ? 1 : 0);
    if (absentDrivers >= 3) {
      issues.push({ cause: "zu viele Fahrer gleichzeitig abwesend", days: `${start} bis ${end}`, employees: [request.employeeId], shifts: ["Frueh", "Spaet"], suggestion: "Vertretung waehlen" });
    }

    const coverageConflict = state.coverage.find((c) => c.date >= start && c.date <= end);
    if (coverageConflict) {
      issues.push({ cause: "Mindestbesetzung unterschritten", days: coverageConflict.date, employees: [coverageConflict.missingEmployeeId], shifts: [coverageConflict.shift], suggestion: "Schichtplanung oeffnen" });
    }

    const trainingConflict = state.trainings.find((tr) => (tr.participants || []).includes(request.employeeId) && tr.date >= start && tr.date <= end && tr.status !== "abgeschlossen");
    if (trainingConflict) {
      issues.push({ cause: "Pflichtschulung im Zeitraum", days: trainingConflict.date, employees: [request.employeeId], shifts: ["Schulung"], suggestion: "Zeitraum aendern" });
    }

    const docDueConflict = state.documents.find((doc) => doc.employeeId === request.employeeId && doc.validUntil && doc.validUntil >= start && doc.validUntil <= end && doc.status !== "gueltig");
    if (docDueConflict) {
      issues.push({ cause: "Dokumenttermin im Zeitraum", days: docDueConflict.validUntil, employees: [request.employeeId], shifts: [""], suggestion: "Dokumenttermin abstimmen" });
    }

    if (request.replacementId) {
      const replacementAbsent = state.vacations.some((v) => v.employeeId === request.replacementId && ["genehmigt", "teilweise genehmigt", "beantragt"].includes(v.status) && overlaps(start, end, v.start, v.end));
      if (replacementAbsent) {
        issues.push({ cause: "Vertretung ebenfalls abwesend", days: `${start} bis ${end}`, employees: [request.replacementId], shifts: [""], suggestion: "anderen Mitarbeiter waehlen" });
      }
    }

    if (isDriver) {
      const wheelchairAvailable = state.employees.some((e) => e.id !== request.employeeId && e.role === "Fahrer" && e.wheelchairSkill && !isEmployeeAbsentToday(state, e.id));
      if (!wheelchairAvailable) {
        issues.push({ cause: "Rollstuhlfahrer fehlt", days: `${start} bis ${end}`, employees: [request.employeeId], shifts: [""], suggestion: "Vertretung waehlen" });
      }

      const largeAvailable = state.employees.some((e) => e.id !== request.employeeId && e.role === "Fahrer" && e.largeVehicleSkill && !isEmployeeAbsentToday(state, e.id));
      if (!largeAvailable) {
        issues.push({ cause: "Grossraumfahrer fehlt", days: `${start} bis ${end}`, employees: [request.employeeId], shifts: [""], suggestion: "Zeitraum aendern" });
      }
    }

    return issues;
  }

  function syncToLiveDispo(title, text) {
    const dispo = safeParse(localStorage.getItem(DISPO_KEY));
    if (!dispo || !Array.isArray(dispo.notifications) || !Array.isArray(dispo.events) || !dispo.sequence) return;
    dispo.sequence.notification = Number(dispo.sequence.notification || 0) + 1;
    dispo.sequence.event = Number(dispo.sequence.event || 0) + 1;
    dispo.notifications.unshift({
      id: `NT-${dispo.sequence.notification}`,
      priority: "Hoch",
      title,
      text,
      refType: "system",
      refId: "",
      read: false,
      time: nowStamp().split(" ")[1]
    });
    dispo.events.unshift({
      id: `EV-${dispo.sequence.event}`,
      time: nowStamp().split(" ")[1],
      category: "System",
      tone: "tone-system",
      message: text,
      refType: "system",
      refId: ""
    });
    if (dispo.notifications.length > 48) dispo.notifications.length = 48;
    if (dispo.events.length > 80) dispo.events.length = 80;
    localStorage.setItem(DISPO_KEY, JSON.stringify(dispo));
  }

  function syncDriverLockToV15(employee, reasonText) {
    const v15 = safeParse(localStorage.getItem(V15_KEY));
    if (!v15 || !Array.isArray(v15.drivers)) return;
    const mapByName = `${employee.firstName} ${employee.lastName}`.trim();
    const row = v15.drivers.find((d) => normalize(d.name) === normalize(mapByName));
    if (!row) return;
    row.statusKey = "unavailable";
    row.lastStatusAt = new Date().toISOString();
    row.warnings = Array.isArray(row.warnings) ? row.warnings : [];
    if (!row.warnings.includes(reasonText)) row.warnings.unshift(reasonText);
    localStorage.setItem(V15_KEY, JSON.stringify(v15));
  }

  function applyDocumentLockSync(state) {
    state.employees.forEach((emp) => {
      const docs = listEmployeeDocs(state, emp.id);
      const lock = docs.some((d) => (d.type === "Fuehrerschein" || d.type === "Personenbefoerderungsschein") && d.status === "abgelaufen");
      if (lock) {
        emp.status = "Dokument ungueltig";
        syncDriverLockToV15(emp, "Dokument ungueltig");
        syncToLiveDispo("Dokumentwarnung", `${emp.firstName} ${emp.lastName}: kritisches Dokument abgelaufen.`);
      }
    });
  }

  function addEmployee(state, payload) {
    const next = { ...payload };
    next.id = next.employeeId || `MA-${Math.floor(100 + Math.random() * 900)}`;
    next.lastActivity = "Mitarbeiter angelegt";
    next.profileNote = next.profileNote || "";
    state.employees.unshift(next);
    state.history.unshift({ id: `EH-${Date.now()}`, at: nowStamp(), employeeId: next.id, event: "Eintritt", by: "Admin", note: "Neu angelegt" });
    state.notifications.unshift({ id: `PN-${Date.now()}`, at: nowStamp(), title: "Neuer Mitarbeiter", priority: "normal" });
    saveState(state);
    return next;
  }

  function checkDuplicate(state, payload) {
    const dups = [];
    const nameBirth = `${normalize(payload.firstName)}|${normalize(payload.lastName)}|${payload.birthDate || ""}`;
    state.employees.forEach((emp) => {
      const current = `${normalize(emp.firstName)}|${normalize(emp.lastName)}|${emp.birthDate || ""}`;
      if (nameBirth === current) dups.push({ type: "Name + Geburtsdatum", employeeId: emp.id });
      if (payload.phone && normalize(payload.phone) === normalize(emp.phone || "")) dups.push({ type: "Telefon", employeeId: emp.id });
      if (payload.email && normalize(payload.email) === normalize(emp.email || "")) dups.push({ type: "E-Mail", employeeId: emp.id });
      if (payload.employeeId && normalize(payload.employeeId) === normalize(emp.employeeId || "")) dups.push({ type: "Mitarbeiter-ID", employeeId: emp.id });
      if (payload.licenseNo && normalize(payload.licenseNo) === normalize(emp.licenseNo || "")) dups.push({ type: "Fuehrerscheinnummer", employeeId: emp.id });
    });
    return dups;
  }

  function addVacationRequest(state, payload) {
    const row = {
      id: `VAC-${Date.now()}`,
      employeeId: payload.employeeId,
      start: payload.start,
      end: payload.end,
      halfDay: Boolean(payload.halfDay),
      workDaysDemo: Number(payload.workDaysDemo || 1),
      type: payload.type,
      replacementId: payload.replacementId || "",
      comment: payload.comment || "",
      internalNote: payload.internalNote || "",
      requester: payload.requester || payload.employeeId,
      createdAt: todayIso(),
      status: payload.status || "beantragt",
      decisionBy: "",
      decisionAt: "",
      decisionNote: ""
    };
    state.vacations.unshift(row);
    const conflicts = evaluateVacationConflicts(state, row);
    if (conflicts.length) {
      state.notifications.unshift({ id: `PN-${Date.now()}-${Math.floor(Math.random() * 9)}`, at: nowStamp(), title: "Urlaubskonflikt erkannt", priority: "wichtig", ref: row.id });
    }
    syncToLiveDispo("Neuer Urlaubsantrag", `Urlaubsantrag von ${row.employeeId} (${row.start} bis ${row.end}).`);
    saveState(state);
    return { row, conflicts };
  }

  function decideVacationRequest(state, requestId, decision, by, note) {
    const row = state.vacations.find((v) => v.id === requestId);
    if (!row) return null;
    row.status = decision;
    row.decisionBy = by || "Admin";
    row.decisionAt = todayIso();
    row.decisionNote = note || "";

    const emp = getEmployee(state, row.employeeId);
    if (emp && ["genehmigt", "teilweise genehmigt"].includes(decision)) {
      emp.status = "Urlaub";
      emp.lastActivity = `Urlaub ${row.start}-${row.end} genehmigt`;
      syncToLiveDispo("Urlaub genehmigt", `${emp.firstName} ${emp.lastName}: Urlaub ${row.start} bis ${row.end}.`);
    }

    state.history.unshift({ id: `EH-${Date.now()}`, at: nowStamp(), employeeId: row.employeeId, event: `Urlaub ${decision}`, by: by || "Admin", note: note || "" });
    saveState(state);
    return row;
  }

  function addAbsence(state, payload) {
    const row = {
      id: `ABS-${Date.now()}`,
      employeeId: payload.employeeId,
      kind: payload.kind,
      start: payload.start,
      expectedEnd: payload.expectedEnd,
      returnedAt: payload.returnedAt || "",
      receivedAt: payload.receivedAt || todayIso(),
      via: payload.via || "telefonisch",
      proofStatus: payload.proofStatus || "angekuendigt",
      replacementId: payload.replacementId || "",
      note: payload.note || "",
      status: payload.status || "gemeldet",
      affectedShifts: ensureArray(payload.affectedShifts, [])
    };
    state.absences.unshift(row);
    const emp = getEmployee(state, row.employeeId);
    if (emp) {
      emp.status = row.kind === "Krank" ? "krank" : "nicht verfuegbar";
      emp.lastActivity = `${row.kind} gemeldet`;
    }
    if (row.kind === "Krank") {
      syncToLiveDispo("Krankmeldung", `${row.employeeId} ist krank gemeldet bis ${row.expectedEnd}.`);
    }
    saveState(state);
    return row;
  }

  function submitEmployeeDocument(state, payload) {
    const row = {
      id: `PDOC-${Date.now()}`,
      employeeId: payload.employeeId,
      type: payload.type || "Sonstiges Dokument",
      no: payload.no || "",
      issuedAt: payload.issuedAt || "",
      validUntil: payload.validUntil || "",
      issuer: payload.issuer || "",
      status: "eingereicht",
      note: payload.note || "",
      demoFile: payload.demoFile || "",
      demoFileName: payload.demoFileName || "",
      demoFileType: payload.demoFileType || "",
      submittedAt: todayIso(),
      source: "Mitarbeiterportal",
      reminderActive: false,
      reminder: "",
      checkedAt: "",
      checkedBy: ""
    };
    state.documents.unshift(row);
    state.notifications.unshift({ id: `PN-${Date.now()}`, at: nowStamp(), title: "Neues Dokument eingereicht", priority: "wichtig", ref: row.id });
    applyDocumentLockSync(state);
    saveState(state);
    return row;
  }

  function reviewEmployeeDocument(state, documentId, status, by) {
    const row = state.documents.find((doc) => doc.id === documentId);
    if (!row) return null;
    row.status = status;
    row.checkedAt = todayIso();
    row.checkedBy = by || "Admin";
    if (status === "gueltig") {
      row.reminderActive = false;
    }
    state.notifications.unshift({ id: `PN-${Date.now()}`, at: nowStamp(), title: "Dokument geprüft", priority: "normal", ref: row.id });
    applyDocumentLockSync(state);
    saveState(state);
    return row;
  }

  function publishEmployeePlanForDate(state, employeeId, dateIso, payload = {}) {
    const employee = getEmployee(state, employeeId);
    if (!employee) return null;
    const store = getPlanningStore();
    const day = store.days[dateIso] || {};
    const existingRows = Array.isArray(day.publishedPlan && day.publishedPlan.driverRows) ? day.publishedPlan.driverRows : [];
    const nextRow = {
      employeeId,
      status: payload.status || employee.status || "im Dienst",
      shiftStart: payload.shiftStart || employee.todayShift || "08:00",
      shiftEnd: payload.shiftEnd || "16:00",
      vehicleLabel: payload.vehicleLabel || employee.activeVehicle || employee.preferredVehicle || "",
      vehicle: payload.vehicle || employee.activeVehicle || employee.preferredVehicle || "",
      note: payload.note || "",
      published: true
    };
    day.publishedPlan = {
      publishedAt: payload.publishedAt || nowStamp(),
      publishedBy: payload.publishedBy || "Admin",
      changed: Boolean(payload.changed),
      driverRows: existingRows.filter((row) => row.employeeId !== employeeId).concat(nextRow)
    };
    day.draftPlan = day.draftPlan || { driverRows: [] };
    day.draftPlan.driverRows = Array.isArray(day.draftPlan.driverRows)
      ? day.draftPlan.driverRows.filter((row) => row.employeeId !== employeeId).concat({ ...nextRow, published: false })
      : [{ ...nextRow, published: false }];
    store.days[dateIso] = day;
    localStorage.setItem(PLAN_KEY, JSON.stringify(store));
    state.notifications.unshift({ id: `PN-${Date.now()}`, at: nowStamp(), title: "Plan veröffentlicht", priority: "normal", ref: employeeId });
    saveState(state);
    return day.publishedPlan;
  }

  function markReturn(state, absenceId, returnedAt, ready) {
    const row = state.absences.find((a) => a.id === absenceId);
    if (!row) return null;
    row.returnedAt = returnedAt || todayIso();
    row.status = "abgeschlossen";
    const emp = getEmployee(state, row.employeeId);
    if (emp) {
      emp.status = ready ? "aktiv" : "frei";
      emp.lastActivity = `Rueckkehr am ${row.returnedAt}`;
    }
    state.tasks.unshift({ id: `PT-${Date.now()}`, title: "Rueckkehrpruefung", employeeId: row.employeeId, category: "Rueckkehr nach Krankheit", owner: "Disponent", dueDate: todayIso(), priority: "normal", status: "offen", note: "Fahrzeugzuweisung pruefen", relationType: "Abwesenheit", relationId: row.id });
    saveState(state);
    return row;
  }

  function getDashboardStats(state) {
    const today = todayIso();
    const inService = state.employees.filter((e) => ["im Dienst", "aktiv", "Pause"].includes(e.status)).length;
    const absent = state.employees.filter((e) => isEmployeeAbsentToday(state, e.id)).length;
    const onVacation = state.vacations.filter((v) => ["genehmigt", "teilweise genehmigt"].includes(v.status) && today >= v.start && today <= v.end).length;
    const sick = state.absences.filter((a) => a.kind === "Krank" && today >= a.start && today <= a.expectedEnd && a.status !== "abgeschlossen").length;

    const docsExp30 = state.documents.filter((d) => {
      const day = daysUntil(d.validUntil);
      return day >= 0 && day <= 30;
    }).length;
    const docsInvalid = state.documents.filter((d) => d.status === "abgelaufen" || d.status === "fehlt").length;

    return {
      totalEmployees: state.employees.length,
      driversOnDuty: state.employees.filter((e) => e.role === "Fahrer" && e.status === "im Dienst").length,
      absentToday: absent,
      vacationToday: onVacation,
      sickToday: sick,
      openVacationRequests: state.vacations.filter((v) => ["beantragt", "in Pruefung"].includes(v.status)).length,
      openDocumentEntries: state.documents.filter((d) => d.status === "eingereicht").length,
      expiringDocs: docsExp30,
      invalidDocs: docsInvalid,
      openTrainings: state.trainings.filter((t) => ["eingeladen", "bestaetigt", "Nachweis fehlt", "nicht teilgenommen"].includes(t.status)).length,
      newEmployees: state.employees.filter((e) => daysUntil(e.entryDate) >= -45).length,
      onProbation: state.employees.filter((e) => e.probation).length,
      availableDriversToday: state.employees.filter((e) => e.role === "Fahrer" && !isEmployeeAbsentToday(state, e.id) && !["gesperrt", "Dokument ungueltig"].includes(e.status)).length,
      inService
    };
  }

  function buildPersonalWarnings(state) {
    const warnings = [];
    state.employees.forEach((emp) => {
      const licenseDays = daysUntil(emp.licenseValidUntil);
      if (emp.licenseValidUntil && licenseDays <= 30 && licenseDays >= 0) {
        warnings.push({ employeeId: emp.id, level: licenseDays <= 7 ? "kritisch" : "wichtig", reason: "Fuehrerschein laeuft bald ab", detail: `${licenseDays} Tage` });
      }
      if (emp.pPermitValidUntil) {
        const pDays = daysUntil(emp.pPermitValidUntil);
        if (pDays <= 30 && pDays >= 0) warnings.push({ employeeId: emp.id, level: pDays <= 7 ? "kritisch" : "wichtig", reason: "P-Schein laeuft bald ab", detail: `${pDays} Tage` });
        if (pDays < 0) warnings.push({ employeeId: emp.id, level: "kritisch", reason: "P-Schein ungueltig", detail: `${Math.abs(pDays)} Tage ueberfaellig` });
      }
      if (emp.role === "Fahrer" && !emp.licenseNo) warnings.push({ employeeId: emp.id, level: "wichtig", reason: "Fuehrerscheinpruefung fehlt", detail: "Nummer fehlt" });
      if (!emp.emergency || !emp.emergency.phone) warnings.push({ employeeId: emp.id, level: "normal", reason: "Notfallkontakt fehlt", detail: "Kontakt unvollstaendig" });
      if (!emp.onboardingDocsDone || !emp.keysIssued || !emp.credentialsIssued) warnings.push({ employeeId: emp.id, level: "normal", reason: "Mitarbeiterdaten unvollstaendig", detail: "Onboarding offen" });
      if (emp.probation && daysUntil(emp.probationUntil) <= 30 && daysUntil(emp.probationUntil) >= 0) warnings.push({ employeeId: emp.id, level: "Hinweis", reason: "Probezeit endet bald", detail: emp.probationUntil });
      if (emp.contractEnd && daysUntil(emp.contractEnd) <= 45 && daysUntil(emp.contractEnd) >= 0) warnings.push({ employeeId: emp.id, level: "normal", reason: "Vertrag endet bald", detail: emp.contractEnd });
    });

    state.documents.forEach((doc) => {
      if (doc.status === "abgelaufen") warnings.push({ employeeId: doc.employeeId, level: "kritisch", reason: "Dokument ungueltig", detail: doc.type });
    });

    state.trainings.forEach((tr) => {
      if (tr.status === "Nachweis fehlt" || tr.status === "nicht teilgenommen") {
        (tr.participants || []).forEach((employeeId) => warnings.push({ employeeId, level: "wichtig", reason: "Pflichtschulung offen", detail: tr.title }));
      }
    });

    const openCoverage = state.coverage.filter((c) => c.candidates.length === 0 || c.conflicts.length > 0);
    openCoverage.forEach((c) => warnings.push({ employeeId: c.missingEmployeeId, level: "kritisch", reason: "offene Schicht ohne Besetzung", detail: `${c.date} ${c.shift}` }));

    state.absences.filter((a) => a.kind === "Krank" && ["fehlt", "unvollstaendig", "angefordert"].includes(a.proofStatus)).forEach((a) => warnings.push({ employeeId: a.employeeId, level: "normal", reason: "Krankmeldung ohne Nachweisstatus", detail: a.proofStatus }));

    return warnings;
  }

  function pushMessageRead(state, messageId, employeeId, kind) {
    const msg = state.messages.find((m) => m.id === messageId);
    if (!msg) return false;
    if (kind === "read") msg.reads[employeeId] = true;
    if (kind === "confirm") msg.confirmations[employeeId] = true;
    saveState(state);
    return true;
  }

  function getPortalSnapshot(state, employeeId) {
    const employee = getEmployee(state, employeeId);
    if (!employee) return null;
    const docs = listEmployeeDocs(state, employeeId);
    const trainings = listEmployeeTrainings(state, employeeId);
    const vacations = state.vacations.filter((v) => v.employeeId === employeeId);
    const absences = state.absences.filter((a) => a.employeeId === employeeId);
    const tasks = listEmployeeTasks(state, employeeId);
    const messages = listEmployeeMessages(state, employeeId).sort((a, b) => {
      const pa = a.priority === "wichtig" ? 2 : 1;
      const pb = b.priority === "wichtig" ? 2 : 1;
      return pb - pa;
    });

    return {
      employee,
      docs,
      trainings,
      vacations,
      absences,
      tasks,
      messages,
      vacationQuota: getVacationQuota(state, employeeId)
    };
  }

  window.AdminPersonnelDemo = {
    KEY,
    V15_KEY,
    DISPO_KEY,
    STATUS,
    DOC_TYPES,
    TRAINING_TYPES,
    ASSIGNEES,
    normalize,
    todayIso,
    nowStamp,
    daysUntil,
    loadState,
    saveState,
    resetState,
    resetVacationYear,
    getEmployee,
    listEmployeeDocs,
    listEmployeeTrainings,
    listEmployeeTasks,
    listEmployeeMessages,
    getPlanningStore,
    getPlanningDayState,
    isEmployeeAbsentToday,
    getVacationQuota,
    evaluateVacationConflicts,
    addEmployee,
    addEmployeeMessage,
    checkDuplicate,
    addVacationRequest,
    decideVacationRequest,
    addAbsence,
    submitEmployeeDocument,
    reviewEmployeeDocument,
    publishEmployeePlanForDate,
    markReturn,
    getDashboardStats,
    buildPersonalWarnings,
    applyDocumentLockSync,
    pushMessageRead,
    getPortalSnapshot,
    getEmployeeDayPlan,
    getEmployeeDocumentAlerts,
    getEmployeePortalSnapshot
  };
})();
