(() => {
  const KEY = "adminV18QualityState";
  const DISPO_KEY = "adminLiveDispoV131";
  const V15_KEY = "adminV15DriverOps";
  const CUSTOMER_KEY = "adminSharedCustomersV14";
  const CUSTOMER_TASKS_KEY = "adminSharedTasksV14";
  const V17_KEY = "adminV17PersonnelState";

  const PRIORITIES = ["Information", "normal", "wichtig", "kritisch"];
  const ESCALATIONS = ["Stufe 0 - normal", "Stufe 1 - Bearbeiter", "Stufe 2 - Bereichsverantwortlicher", "Stufe 3 - Geschaeftsleitung", "Stufe 4 - kritisch"];

  const COMPLAINT_CATEGORIES = [
    "Verspaetung", "Fahrer unfreundlich", "unsichere Fahrweise", "zu schnelles Fahren", "Fahrzeug unsauber", "Fahrzeug beschaedigt", "falscher Preis", "Abrechnung", "Fahrer nicht erschienen", "Kunde nicht abgeholt", "falsches Fahrzeug", "Rollstuhlproblem", "Krankenfahrtproblem", "Kommunikation", "Datenschutz", "Fundsache", "Verhalten", "Umweg", "Wartezeit", "Fahrzeugausstattung", "sonstige Beschwerde"
  ];

  const COMPLAINT_STATUSES = [
    "neu", "bestaetigt", "in Pruefung", "Rueckfrage Kunde", "Rueckfrage Fahrer", "Rueckfrage Disposition", "wartet auf Unterlagen", "Massnahme laeuft", "Loesung vorgeschlagen", "geklaert", "abgeschlossen", "abgelehnt", "unbegruendet", "eskaliert"
  ];

  const INCIDENT_CATEGORIES = [
    "Verspaetung", "Fahrt nicht durchgefuehrt", "Kunde nicht erreichbar", "Fahrer nicht erreichbar", "Fahrzeugproblem", "technische Stoerung", "Streit mit Fahrgast", "medizinischer Zwischenfall", "Zahlungsproblem", "Sachschaden", "Unfall", "Beinaheunfall", "Datenschutzvorfall", "Fundsache", "Schichtproblem", "Dokumentproblem", "Sicherheitsproblem", "sonstiger Vorfall"
  ];

  const INCIDENT_STATUSES = ["neu", "in Pruefung", "Rueckfrage", "Massnahme erforderlich", "Massnahme laeuft", "beobachtet", "geklaert", "abgeschlossen", "eskaliert"];

  const ACCIDENT_STATUSES = ["neu", "erste Pruefung", "Unterlagen fehlen", "Versicherung vorbereitet", "Werkstattpruefung", "Fahrzeug gesperrt", "in Reparatur", "Rueckfrage", "abgeschlossen", "archiviert"];

  const FOUND_STATUSES = ["neu", "in Zentrale", "Kunde gesucht", "Kunde kontaktiert", "Abholung vereinbart", "abgeholt", "nicht zugeordnet", "Aufbewahrungsfrist laeuft", "an Fundbuero uebergeben als Demo", "entsorgt als Demo", "archiviert"];

  const INSPECTION_RESULTS = ["bestanden", "bestanden mit Hinweis", "Mangel", "kritisch", "Nachpruefung erforderlich"];

  const ACTION_STATUSES = ["geplant", "freigegeben", "in Bearbeitung", "wartet", "umgesetzt", "Wirksamkeit pruefen", "wirksam", "nicht wirksam", "abgeschlossen", "abgebrochen"];

  const CAUSE_CATEGORIES = ["Mensch", "Fahrzeug", "Technik", "Kommunikation", "Planung", "Prozess", "Dokumentation", "Schulung", "externe Ursache", "Kunde", "Wetter", "Verkehr", "sonstige Ursache"];

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

  function todayIso() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function nowTime() {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }

  function nowStamp() {
    return `${todayIso()} ${nowTime()}`;
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

  function createDefaultState() {
    return {
      version: 1,
      createdAt: nowStamp(),
      updatedAt: nowStamp(),
      complaints: [
        {
          id: "QB-1001",
          inputDate: "2026-08-03",
          inputTime: "08:12",
          channel: "Telefon",
          customerId: "K-1002",
          customer: "Nora Winter",
          phone: "0172 901 2244",
          email: "n.winter@demo.de",
          rideId: "TG-1049",
          driverId: "MA-102",
          driver: "Emir Kaya",
          vehicle: "GER TX200",
          category: "Verspaetung",
          subCategory: "15 Minuten",
          shortText: "Verspaetete Abholung",
          description: "Kundin wartete etwa 15 Minuten laenger als angekuendigt.",
          desiredSolution: "Rueckruf und Erklaerung",
          priority: "normal",
          status: "in Pruefung",
          owner: "Disponent",
          dueDate: "2026-08-04",
          lastActivity: "2026-08-03 09:05",
          callbackOpen: true,
          actionOpen: true,
          recurring: false,
          escalation: "Stufe 1 - Bearbeiter",
          route: "Leimersheim - Onkologie",
          customerWish: "Puenktlichkeit",
          internalAssessment: "Disposition ueberlastet",
          risk: { customerImpact: 2, safetyRisk: 1, legalRisk: 1, reputationalRisk: 2, recurrenceRisk: 2, urgency: 2, level: "mittel" },
          communication: [
            { at: "2026-08-03 08:20", type: "Kunde angerufen", note: "Wartezeit bestaetigt.", by: "Disponent" },
            { at: "2026-08-03 09:05", type: "Rueckruf vereinbart", note: "Rückmeldung bis 11:00", by: "Disponent" }
          ],
          evidence: [{ at: "2026-08-03 08:22", item: "Anrufprotokoll (Demo)", by: "Disponent" }],
          statements: [{ id: "ST-1001", status: "angefordert", driver: "Emir Kaya", text: "", at: "2026-08-03 09:06" }],
          measures: ["Rueckruf", "interne Klaerung"],
          closure: ""
        },
        {
          id: "QB-1002",
          inputDate: "2026-08-03",
          inputTime: "09:14",
          channel: "Google-Bewertung als Demo",
          customerId: "K-3001",
          customer: "Mara Hoffmann",
          phone: "0171 770 1001",
          email: "m.hoffmann@demo.de",
          rideId: "TG-1050",
          driverId: "MA-101",
          driver: "Mila Becker",
          vehicle: "GER TX100",
          category: "unsichere Fahrweise",
          subCategory: "zu schnelles Anfahren",
          shortText: "Kritische Fahrweise",
          description: "Kundin beschreibt unsicheres Beschleunigen im Stadtverkehr.",
          desiredSolution: "Rueckruf und Sicherheitscheck",
          priority: "kritisch",
          status: "eskaliert",
          owner: "Qualitaetsmanagement",
          dueDate: "2026-08-03",
          lastActivity: "2026-08-03 10:02",
          callbackOpen: true,
          actionOpen: true,
          recurring: true,
          escalation: "Stufe 3 - Geschaeftsleitung",
          route: "Speyer Bahnhof - Germersheim",
          customerWish: "Sicheres Fahren",
          internalAssessment: "Fahrergespraech und Unterweisung notwendig",
          risk: { customerImpact: 4, safetyRisk: 4, legalRisk: 3, reputationalRisk: 3, recurrenceRisk: 3, urgency: 4, level: "kritisch" },
          communication: [
            { at: "2026-08-03 09:18", type: "Nachricht vorbereitet", note: "Antwortentwurf erstellt", by: "Qualitaetsmanagement" }
          ],
          evidence: [{ at: "2026-08-03 09:16", item: "Bewertungsscreenshot (Demo)", by: "Qualitaetsmanagement" }],
          statements: [{ id: "ST-1002", status: "angefordert", driver: "Mila Becker", text: "", at: "2026-08-03 09:20" }],
          measures: ["Fahrerhinweis", "Schulung"],
          closure: ""
        }
      ],
      positiveFeedback: [
        {
          id: "QF-1001",
          date: "2026-08-02",
          customer: "Helga Maurer",
          customerId: "K-1001",
          driverId: "MA-101",
          driver: "Mila Becker",
          vehicle: "GER TX100",
          rideId: "TG-3001",
          category: "Hilfsbereitschaft",
          message: "Sehr freundlich und hilfreich bis zur Wohnungstuere.",
          channel: "Telefon",
          internalRelease: true,
          informEmployee: true
        }
      ],
      incidents: [
        {
          id: "QV-1001",
          date: "2026-08-03",
          time: "07:55",
          reporter: "Disponent",
          category: "Beinaheunfall",
          priority: "wichtig",
          driverId: "MA-104",
          driver: "Jule Hoffmann",
          vehicle: "GER TX200",
          customer: "-",
          rideId: "TG-1052",
          location: "Germersheim Ostkreisel",
          description: "Beinaheunfall durch abruptes Bremsen, kein Kontakt.",
          immediateAction: "Fahrt unterbrochen und Ruecksprache mit Leitstelle",
          continueRide: "Ja",
          centerInformed: "Ja",
          policeInformedDemo: "Nein",
          medicInformedDemo: "Nein",
          attachment: "",
          dueDate: "2026-08-05",
          owner: "Qualitaetsmanagement",
          status: "in Pruefung",
          nearMiss: {
            danger: "Einfahrt eines Radfahrers im toten Winkel",
            possibleImpact: "Seitliche Kollision moeglich",
            whyNoAccident: "Sofortbremsung und Ausweichraum vorhanden",
            weatherDemo: "trocken",
            traffic: "dicht",
            prevention: "zus. Spiegel- und Schulterblickschulung"
          }
        }
      ],
      accidents: [
        {
          id: "QU-1001",
          date: "2026-08-03",
          time: "10:10",
          location: "Germersheim Nordring",
          driverId: "MA-102",
          driver: "Emir Kaya",
          vehicle: "GER TX200",
          rideId: "TG-1049",
          passengers: "Ja",
          accidentType: "Parkschaden",
          opponent: "Unbekannt",
          opponentPlate: "",
          opponentContact: "",
          opponentInsuranceDemo: "offen",
          witnesses: "2",
          policeDemo: "Nein",
          ownVehicleDamage: "Stoßstange hinten",
          thirdPartyDamage: "Pfostenkratzer",
          objectDamage: "Pfosten",
          injuriesDemo: "Nein",
          drivable: "Ja",
          policeCalled: "Nein",
          medicCalled: "Nein",
          towingCalled: "Nein",
          workshopInformed: "Ja",
          replacementVehicle: "Ja",
          passengersContinued: "Ja",
          description: "Rangierschaden beim Einparken.",
          sketchDemo: "vorhanden",
          photosDemo: "fehlt",
          driverStatement: "angefordert",
          witnessStatement: "offen",
          status: "Unterlagen fehlen",
          documents: {
            unfallmeldung: true,
            fahrerstellungnahme: false,
            fotos: false,
            polizeidaten: false,
            unfallgegner: false,
            zeugen: true,
            versicherungsdaten: false,
            werkstattbericht: false,
            kostenvoranschlagDemo: false,
            reparaturrechnungDemo: false,
            abschlussvermerk: false
          },
          qualityCaseCreated: true
        }
      ],
      foundItems: [
        {
          id: "QFUND-1001",
          number: "F-2026-001",
          object: "Handy",
          category: "Handy",
          description: "Schwarzes Smartphone mit Huelle",
          color: "schwarz",
          brand: "DemoPhone",
          date: "2026-08-03",
          time: "09:40",
          vehicle: "GER TX100",
          driver: "Mila Becker",
          rideId: "TG-1050",
          place: "Rueckbank rechts",
          customerAssigned: "K-3001",
          storage: "Zentrale Schrank A2",
          valueCategory: "hoch",
          photo: "",
          status: "Kunde kontaktiert",
          note: "Abholung fuer 04.08 vorgemerkt",
          handovers: []
        }
      ],
      inspections: [
        {
          id: "QPR-1001",
          type: "Fahrzeugkontrolle",
          area: "Fahrzeug",
          target: "GER TX200",
          owner: "Werkstatt",
          dueDate: "2026-08-04",
          interval: "woechentlich",
          lastCheck: "2026-07-28",
          nextCheck: "2026-08-04",
          status: "faellig",
          result: "",
          checklist: ["Beleuchtung", "Reifen", "Scheiben", "Spiegel", "Kennzeichen", "Sauberkeit", "Sicherheitsausruestung", "Taxameter", "Kartenlesegeraet", "Fahrzeugpapiere", "Warnleuchten", "Kilometerstand", "Tank oder Akku", "Rollstuhlausruestung"],
          findings: "",
          needsAction: false,
          reinspection: null
        },
        {
          id: "QPR-1002",
          type: "Datenschutz",
          area: "Zentrale",
          target: "Leitstelle",
          owner: "Qualitaetsmanagement",
          dueDate: "2026-08-06",
          interval: "monatlich",
          lastCheck: "2026-07-06",
          nextCheck: "2026-08-06",
          status: "geplant",
          result: "",
          checklist: ["Notfallnummern aktuell", "Fahrerlisten aktuell", "Fahrzeugstatus aktuell", "Datenschutzunterlagen", "Schichtuebergabe", "Kassenunterlagen", "Feuerloescher", "Fluchtwege", "Erste-Hilfe-Kasten", "technische Systeme"],
          findings: "",
          needsAction: false,
          reinspection: null
        }
      ],
      actions: [
        {
          id: "QM-1001",
          title: "Fahrerunterweisung sicheres Anfahren",
          description: "Kurzunterweisung und Begleitfahrt organisieren.",
          type: "Unterweisung",
          source: "Beschwerde",
          sourceId: "QB-1002",
          owner: "Qualitaetsmanagement",
          startDate: "2026-08-03",
          dueDate: "2026-08-05",
          priority: "wichtig",
          status: "in Bearbeitung",
          successCriteria: "Keine Wiederholung in 30 Tagen",
          proof: "offen",
          note: "Terminvorschlag 04.08 09:00",
          effectiveness: "",
          escalation: "Stufe 2 - Bereichsverantwortlicher"
        },
        {
          id: "QM-1002",
          title: "Fotos zum Parkschaden nachreichen",
          description: "Fehlende Unfalldokumente erfassen.",
          type: "Sofortmassnahme",
          source: "Unfall",
          sourceId: "QU-1001",
          owner: "Disponent",
          startDate: "2026-08-03",
          dueDate: "2026-08-03",
          priority: "kritisch",
          status: "wartet",
          successCriteria: "Unfallakte vollstaendig",
          proof: "fehlt",
          note: "Fahrerantwort offen",
          effectiveness: "",
          escalation: "Stufe 3 - Geschaeftsleitung"
        }
      ],
      rootCauses: [
        {
          id: "RC-1001",
          sourceType: "Beschwerde",
          sourceId: "QB-1002",
          problem: "Unsichere Fahrweise laut Kundenmeldung",
          why1: "Zeitdruck in Spitzenzeit",
          why2: "Auftragsstapel zu knapp getaktet",
          why3: "Pufferzeiten fehlen",
          why4: "Routenplanung ohne Stoerverkehrspuffer",
          why5: "Kein verbindlicher Spitzenzeit-Prozess",
          mainCause: "Planung",
          recommendedAction: "Pufferregeln fuer kritische Uhrzeiten festlegen",
          category: "Planung",
          linkedCases: ["QB-1002"]
        }
      ],
      notifications: [
        { id: "QN-1001", at: "2026-08-03 10:06", title: "Kritische Beschwerde", text: "QB-1002 erfordert Eskalation", priority: "kritisch", scope: "Qualitaet" },
        { id: "QN-1002", at: "2026-08-03 10:12", title: "Unfallakte unvollstaendig", text: "Fotos fehlen fuer QU-1001", priority: "wichtig", scope: "Qualitaet" }
      ],
      history: []
    };
  }

  function ensureArray(value, fallback) {
    return Array.isArray(value) ? value : fallback;
  }

  function ensureStateShape(raw) {
    const base = raw && typeof raw === "object" ? raw : createDefaultState();
    base.complaints = ensureArray(base.complaints, []);
    base.positiveFeedback = ensureArray(base.positiveFeedback, []);
    base.incidents = ensureArray(base.incidents, []);
    base.accidents = ensureArray(base.accidents, []);
    base.foundItems = ensureArray(base.foundItems, []);
    base.inspections = ensureArray(base.inspections, []);
    base.actions = ensureArray(base.actions, []);
    base.rootCauses = ensureArray(base.rootCauses, []);
    base.notifications = ensureArray(base.notifications, []);
    base.history = ensureArray(base.history, []);
    base.updatedAt = nowStamp();
    return base;
  }

  function loadState() {
    const parsed = safeParse(localStorage.getItem(KEY));
    if (!parsed) return ensureStateShape(createDefaultState());
    return ensureStateShape(parsed);
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

  function pushNote(state, title, text, priority = "normal") {
    state.notifications.unshift({ id: `QN-${Date.now()}-${Math.floor(Math.random() * 9)}`, at: nowStamp(), title, text, priority, scope: "Qualitaet" });
    if (state.notifications.length > 200) state.notifications.length = 200;
  }

  function pushHistory(state, action, note) {
    state.history.unshift({ id: `QH-${Date.now()}-${Math.floor(Math.random() * 9)}`, at: nowStamp(), action, note });
    if (state.history.length > 400) state.history.length = 400;
  }

  function riskLevel(score) {
    if (score >= 18) return "kritisch";
    if (score >= 12) return "hoch";
    if (score >= 7) return "mittel";
    return "niedrig";
  }

  function evaluateRiskValues(values) {
    const safe = {
      customerImpact: Number(values.customerImpact || 1),
      safetyRisk: Number(values.safetyRisk || 1),
      legalRisk: Number(values.legalRisk || 1),
      reputationalRisk: Number(values.reputationalRisk || 1),
      recurrenceRisk: Number(values.recurrenceRisk || 1),
      urgency: Number(values.urgency || 1)
    };
    const total = safe.customerImpact + safe.safetyRisk + safe.legalRisk + safe.reputationalRisk + safe.recurrenceRisk + safe.urgency;
    return { ...safe, level: riskLevel(total), total };
  }

  function findRecurringPattern(state, payload) {
    const start = new Date(`${todayIso()}T00:00:00`).getTime() - 60 * 86400000;
    const rows = state.complaints.filter((c) => {
      const t = new Date(`${c.inputDate}T00:00:00`).getTime();
      if (Number.isNaN(t) || t < start) return false;
      const sameDriver = payload.driver && normalize(c.driver) === normalize(payload.driver);
      const sameVehicle = payload.vehicle && normalize(c.vehicle) === normalize(payload.vehicle);
      const sameCategory = payload.category && normalize(c.category) === normalize(payload.category);
      const sameCustomer = payload.customer && normalize(c.customer) === normalize(payload.customer);
      const sameRide = payload.rideId && c.rideId === payload.rideId;
      return sameDriver || sameVehicle || sameCategory || sameCustomer || sameRide;
    });
    return { recurring: rows.length >= 2, count: rows.length };
  }

  function syncToCustomers(complaint) {
    const customers = safeParse(localStorage.getItem(CUSTOMER_KEY));
    if (!Array.isArray(customers)) return;
    const row = customers.find((c) => c.id === complaint.customerId || normalize(c.displayName) === normalize(complaint.customer));
    if (!row) return;
    row.communication = Array.isArray(row.communication) ? row.communication : [];
    row.notes = Array.isArray(row.notes) ? row.notes : [];
    row.communication.unshift({ at: nowStamp(), type: "Beschwerde", text: `${complaint.id}: ${complaint.shortText}` });
    row.notes.unshift({ id: `N-Q-${Date.now()}`, text: `Beschwerdefall ${complaint.id} (${complaint.category})`, type: "Qualitaet", pinned: false, at: nowStamp() });
    row.updatedAt = todayIso();
    localStorage.setItem(CUSTOMER_KEY, JSON.stringify(customers));
  }

  function syncTaskToCustomers(complaint) {
    const tasks = safeParse(localStorage.getItem(CUSTOMER_TASKS_KEY));
    if (!Array.isArray(tasks)) return;
    tasks.unshift({ id: `T-Q-${Date.now()}`, title: "Kunde zur Beschwerde rueckrufen", customerId: complaint.customerId || "", due: complaint.dueDate || todayIso(), priority: complaint.priority || "normal", status: "offen", note: `${complaint.id} - ${complaint.shortText}` });
    localStorage.setItem(CUSTOMER_TASKS_KEY, JSON.stringify(tasks));
  }

  function syncToPersonnelTask(actionTitle, employeeId, relationType, relationId, note) {
    const p = safeParse(localStorage.getItem(V17_KEY));
    if (!p || !Array.isArray(p.tasks)) return;
    p.tasks.unshift({ id: `PT-${Date.now()}`, title: actionTitle, employeeId: employeeId || "", category: actionTitle, owner: "Qualitaetsmanagement", dueDate: todayIso(), priority: "wichtig", status: "offen", note: note || "", relationType: relationType || "Qualitaet", relationId: relationId || "" });
    p.updatedAt = nowStamp();
    localStorage.setItem(V17_KEY, JSON.stringify(p));
  }

  function syncToDispo(title, text, priority) {
    const dispo = safeParse(localStorage.getItem(DISPO_KEY));
    if (!dispo || !Array.isArray(dispo.notifications) || !Array.isArray(dispo.events)) return;
    dispo.sequence = dispo.sequence || { event: 1, notification: 1, order: 1100 };
    dispo.sequence.notification = Number(dispo.sequence.notification || 0) + 1;
    dispo.sequence.event = Number(dispo.sequence.event || 0) + 1;
    dispo.notifications.unshift({ id: `NT-${dispo.sequence.notification}`, priority: priority === "kritisch" ? "Hoch" : "Mittel", title, text, refType: "system", refId: "", read: false, time: nowTime() });
    dispo.events.unshift({ id: `EV-${dispo.sequence.event}`, time: nowTime(), category: "Probleme", tone: "tone-problem", message: text, refType: "system", refId: "" });
    if (dispo.notifications.length > 70) dispo.notifications.length = 70;
    if (dispo.events.length > 90) dispo.events.length = 90;
    localStorage.setItem(DISPO_KEY, JSON.stringify(dispo));
  }

  function applyVehicleBlock(vehicleId, reason) {
    const v15 = safeParse(localStorage.getItem(V15_KEY));
    if (!v15 || !Array.isArray(v15.drivers)) return;
    const affectedDrivers = v15.drivers.filter((d) => d.currentVehicleId === vehicleId || d.defaultVehicleId === vehicleId);
    affectedDrivers.forEach((d) => {
      d.statusKey = "unavailable";
      d.warnings = Array.isArray(d.warnings) ? d.warnings : [];
      if (!d.warnings.includes(reason)) d.warnings.unshift(reason);
    });
    v15.pendingWorkshop = Array.isArray(v15.pendingWorkshop) ? v15.pendingWorkshop : [];
    v15.pendingWorkshop.unshift({ id: `WS-Q-${Date.now()}`, source: "quality", vehicleId, priority: "kritisch", description: reason, status: "neu" });
    localStorage.setItem(V15_KEY, JSON.stringify(v15));
  }

  function applyDispoVehicleState(vehiclePlate, blocked) {
    const dispo = safeParse(localStorage.getItem(DISPO_KEY));
    if (!dispo || !Array.isArray(dispo.vehicles)) return;
    const row = dispo.vehicles.find((v) => normalize(v.plate) === normalize(vehiclePlate) || normalize(v.id) === normalize(vehiclePlate));
    if (!row) return;
    row.status = blocked ? "Gesperrt" : row.status;
    row.markerType = blocked ? "Gesperrt" : row.markerType;
    if (Array.isArray(dispo.orders)) {
      dispo.orders.forEach((o) => {
        if (o.vehicleId === row.id && o.status !== "Abgeschlossen") o.status = "Problem";
      });
    }
    localStorage.setItem(DISPO_KEY, JSON.stringify(dispo));
  }

  function addComplaint(state, payload) {
    const recurringInfo = findRecurringPattern(state, payload);
    const risk = evaluateRiskValues(payload.risk || {});
    const row = {
      id: `QB-${Date.now()}`,
      inputDate: payload.inputDate || todayIso(),
      inputTime: payload.inputTime || nowTime(),
      channel: payload.channel || "Telefon",
      customerId: payload.customerId || "",
      customer: payload.customer || "Unbekannt",
      phone: payload.phone || "",
      email: payload.email || "",
      rideId: payload.rideId || "",
      driverId: payload.driverId || "",
      driver: payload.driver || "",
      vehicle: payload.vehicle || "",
      category: payload.category || "sonstige Beschwerde",
      subCategory: payload.subCategory || "",
      shortText: payload.shortText || "Beschwerde",
      description: payload.description || "",
      desiredSolution: payload.desiredSolution || "",
      priority: payload.priority || "normal",
      status: payload.status || "neu",
      owner: payload.owner || "Qualitaetsmanagement",
      dueDate: payload.dueDate || todayIso(),
      lastActivity: nowStamp(),
      callbackOpen: String(payload.callbackOpen || "false") === "true",
      actionOpen: true,
      recurring: recurringInfo.recurring,
      escalation: payload.escalation || "Stufe 1 - Bearbeiter",
      route: payload.route || "",
      customerWish: payload.customerWish || "",
      internalAssessment: payload.internalAssessment || "",
      risk,
      communication: [],
      evidence: payload.attachment ? [{ at: nowStamp(), item: payload.attachment, by: payload.owner || "Qualitaetsmanagement" }] : [],
      statements: [{ id: `ST-${Date.now()}`, status: "angefordert", driver: payload.driver || "", text: "", at: nowStamp() }],
      measures: [],
      closure: ""
    };

    state.complaints.unshift(row);
    syncToCustomers(row);
    syncTaskToCustomers(row);
    if (row.driverId) {
      syncToPersonnelTask("Stellungnahme angefordert", row.driverId, "Beschwerde", row.id, row.shortText);
    }
    pushNote(state, row.priority === "kritisch" ? "Kritische Beschwerde" : "Neue Beschwerde", `${row.id} - ${row.shortText}`, row.priority);
    syncToDispo("Neue Beschwerde", `${row.id}: ${row.shortText}`, row.priority);
    pushHistory(state, "Beschwerde angelegt", row.id);
    saveState(state);
    return row;
  }

  function setComplaintStatus(state, complaintId, status) {
    const row = state.complaints.find((c) => c.id === complaintId);
    if (!row) return null;
    row.status = status;
    row.lastActivity = nowStamp();
    if (["geklaert", "abgeschlossen", "unbegruendet", "abgelehnt"].includes(status)) {
      row.callbackOpen = false;
      row.actionOpen = false;
    }
    pushHistory(state, "Beschwerdestatus geaendert", `${complaintId} -> ${status}`);
    saveState(state);
    return row;
  }

  function addCommunication(state, complaintId, type, note, by) {
    const row = state.complaints.find((c) => c.id === complaintId);
    if (!row) return null;
    row.communication.unshift({ at: nowStamp(), type: type || "Notiz", note: note || "", by: by || "Admin" });
    row.lastActivity = nowStamp();
    pushHistory(state, "Kommunikation ergaenzt", complaintId);
    saveState(state);
    return row;
  }

  function addDriverStatement(state, complaintId, payload) {
    const row = state.complaints.find((c) => c.id === complaintId);
    if (!row) return null;
    row.statements = Array.isArray(row.statements) ? row.statements : [];
    row.statements.unshift({
      id: `ST-${Date.now()}`,
      status: payload.status || "eingegangen",
      driver: payload.driver || row.driver || "",
      text: payload.text || "",
      at: nowStamp(),
      circumstances: payload.circumstances || "",
      witnesses: payload.witnesses || "",
      technical: payload.technical || "",
      attachment: payload.attachment || ""
    });
    row.lastActivity = nowStamp();
    pushNote(state, "Fahrerstellungnahme eingegangen", `${complaintId} wurde aktualisiert`, "normal");
    pushHistory(state, "Fahrerstellungnahme", complaintId);
    saveState(state);
    return row;
  }

  function addPositiveFeedback(state, payload) {
    const row = {
      id: `QF-${Date.now()}`,
      date: payload.date || todayIso(),
      customer: payload.customer || "",
      customerId: payload.customerId || "",
      driverId: payload.driverId || "",
      driver: payload.driver || "",
      vehicle: payload.vehicle || "",
      rideId: payload.rideId || "",
      category: payload.category || "Kundenservice",
      message: payload.message || "",
      channel: payload.channel || "Telefon",
      internalRelease: String(payload.internalRelease || "true") === "true",
      informEmployee: String(payload.informEmployee || "true") === "true"
    };
    state.positiveFeedback.unshift(row);
    if (row.driverId) {
      syncToPersonnelTask("Positives Feedback", row.driverId, "Lob", row.id, row.message);
    }
    pushHistory(state, "Positives Feedback", row.id);
    saveState(state);
    return row;
  }

  function addIncident(state, payload) {
    const row = {
      id: `QV-${Date.now()}`,
      date: payload.date || todayIso(),
      time: payload.time || nowTime(),
      reporter: payload.reporter || "Disponent",
      category: payload.category || "sonstiger Vorfall",
      priority: payload.priority || "normal",
      driverId: payload.driverId || "",
      driver: payload.driver || "",
      vehicle: payload.vehicle || "",
      customer: payload.customer || "",
      rideId: payload.rideId || "",
      location: payload.location || "",
      description: payload.description || "",
      immediateAction: payload.immediateAction || "",
      continueRide: payload.continueRide || "Nein",
      centerInformed: payload.centerInformed || "Ja",
      policeInformedDemo: payload.policeInformedDemo || "Nein",
      medicInformedDemo: payload.medicInformedDemo || "Nein",
      attachment: payload.attachment || "",
      dueDate: payload.dueDate || todayIso(),
      owner: payload.owner || "Qualitaetsmanagement",
      status: payload.status || "neu",
      nearMiss: payload.nearMiss || null,
      medical: payload.medical || null
    };
    state.incidents.unshift(row);
    if (row.priority === "kritisch") {
      pushNote(state, "Kritischer Vorfall", `${row.category}: ${row.description}`, "kritisch");
      syncToDispo("Kritischer Vorfall", `${row.category}: ${row.description}`, "kritisch");
    }
    pushHistory(state, "Vorfall angelegt", row.id);
    saveState(state);
    return row;
  }

  function addAccident(state, payload) {
    const row = {
      id: `QU-${Date.now()}`,
      date: payload.date || todayIso(),
      time: payload.time || nowTime(),
      location: payload.location || "",
      driverId: payload.driverId || "",
      driver: payload.driver || "",
      vehicle: payload.vehicle || "",
      rideId: payload.rideId || "",
      passengers: payload.passengers || "Nein",
      accidentType: payload.accidentType || "sonstiger Unfall",
      opponent: payload.opponent || "",
      opponentPlate: payload.opponentPlate || "",
      opponentContact: payload.opponentContact || "",
      opponentInsuranceDemo: payload.opponentInsuranceDemo || "offen",
      witnesses: payload.witnesses || "",
      policeDemo: payload.policeDemo || "Nein",
      ownVehicleDamage: payload.ownVehicleDamage || "",
      thirdPartyDamage: payload.thirdPartyDamage || "",
      objectDamage: payload.objectDamage || "",
      injuriesDemo: payload.injuriesDemo || "Nein",
      drivable: payload.drivable || "Nein",
      policeCalled: payload.policeCalled || "Nein",
      medicCalled: payload.medicCalled || "Nein",
      towingCalled: payload.towingCalled || "Nein",
      workshopInformed: payload.workshopInformed || "Ja",
      replacementVehicle: payload.replacementVehicle || "Nein",
      passengersContinued: payload.passengersContinued || "Nein",
      description: payload.description || "",
      sketchDemo: payload.sketchDemo || "",
      photosDemo: payload.photosDemo || "",
      driverStatement: payload.driverStatement || "angefordert",
      witnessStatement: payload.witnessStatement || "offen",
      status: payload.status || "neu",
      documents: payload.documents || {
        unfallmeldung: true,
        fahrerstellungnahme: false,
        fotos: false,
        polizeidaten: false,
        unfallgegner: false,
        zeugen: false,
        versicherungsdaten: false,
        werkstattbericht: false,
        kostenvoranschlagDemo: false,
        reparaturrechnungDemo: false,
        abschlussvermerk: false
      },
      qualityCaseCreated: true
    };

    state.accidents.unshift(row);
    applyAccidentConsequences(state, row);
    pushNote(state, "Neuer Unfall", `${row.id}: ${row.accidentType}`, row.injuriesDemo === "Ja" ? "kritisch" : "wichtig");
    syncToDispo("Neuer Unfall", `${row.id}: ${row.accidentType}`, row.injuriesDemo === "Ja" ? "kritisch" : "wichtig");
    pushHistory(state, "Unfall angelegt", row.id);
    saveState(state);
    return row;
  }

  function applyAccidentConsequences(state, accident) {
    const vehicleReason = `${accident.id}: Unfallmeldung`;
    if (accident.drivable !== "Ja") {
      applyVehicleBlock(accident.vehicle, vehicleReason);
      applyDispoVehicleState(accident.vehicle, true);
      accident.status = "Fahrzeug gesperrt";
    }

    state.actions.unshift({
      id: `QM-${Date.now()}`,
      title: "Unfallfolge pruefen",
      description: `Folgen aus ${accident.id} bearbeiten`,
      type: "Sofortmassnahme",
      source: "Unfall",
      sourceId: accident.id,
      owner: "Disposition",
      startDate: todayIso(),
      dueDate: todayIso(),
      priority: "kritisch",
      status: "freigegeben",
      successCriteria: "Fahrzeugstatus, Dokumente und Auftraege geprueft",
      proof: "offen",
      note: "Automatisch aus Unfall erstellt",
      effectiveness: "",
      escalation: "Stufe 3 - Geschaeftsleitung"
    });

    state.incidents.unshift({
      id: `QV-${Date.now()}-${Math.floor(Math.random() * 9)}`,
      date: accident.date,
      time: accident.time,
      reporter: "System",
      category: "Unfall",
      priority: accident.injuriesDemo === "Ja" ? "kritisch" : "wichtig",
      driverId: accident.driverId,
      driver: accident.driver,
      vehicle: accident.vehicle,
      customer: "",
      rideId: accident.rideId,
      location: accident.location,
      description: `Folgefall aus ${accident.id}`,
      immediateAction: "Werkstatt und Disposition informiert",
      continueRide: accident.passengersContinued,
      centerInformed: "Ja",
      policeInformedDemo: accident.policeCalled,
      medicInformedDemo: accident.medicCalled,
      attachment: "",
      dueDate: todayIso(),
      owner: "Qualitaetsmanagement",
      status: "Massnahme erforderlich",
      nearMiss: null,
      medical: null
    });

    if (accident.driverId) {
      syncToPersonnelTask("Unfallunterlagen vervollstaendigen", accident.driverId, "Unfall", accident.id, "Bitte Fahrerstellungnahme und Unterlagen einreichen");
    }
  }

  function addFoundItem(state, payload) {
    const row = {
      id: `QFUND-${Date.now()}`,
      number: payload.number || `F-${new Date().getFullYear()}-${Math.floor(Math.random() * 900 + 100)}`,
      object: payload.object || "Gegenstand",
      category: payload.category || "sonstiger Gegenstand",
      description: payload.description || "",
      color: payload.color || "",
      brand: payload.brand || "",
      date: payload.date || todayIso(),
      time: payload.time || nowTime(),
      vehicle: payload.vehicle || "",
      driver: payload.driver || "",
      rideId: payload.rideId || "",
      place: payload.place || "",
      customerAssigned: payload.customerAssigned || "",
      storage: payload.storage || "Zentrale",
      valueCategory: payload.valueCategory || "normal",
      photo: payload.photo || "",
      status: payload.status || "neu",
      note: payload.note || "",
      handovers: []
    };
    state.foundItems.unshift(row);
    if (["hoch", "besonders sensibel"].includes(row.valueCategory)) {
      pushNote(state, "Wertige Fundsache", `${row.number} ${row.object}`, "wichtig");
      syncToDispo("Wertige Fundsache", `${row.number}: ${row.object}`, "wichtig");
    }
    pushHistory(state, "Fundsache erfasst", row.id);
    saveState(state);
    return row;
  }

  function updateFoundStatus(state, itemId, status) {
    const row = state.foundItems.find((f) => f.id === itemId);
    if (!row) return null;
    row.status = status;
    saveState(state);
    return row;
  }

  function handoverFoundItem(state, itemId, payload) {
    const row = state.foundItems.find((f) => f.id === itemId);
    if (!row) return null;
    row.handovers = Array.isArray(row.handovers) ? row.handovers : [];
    row.handovers.unshift({
      receiver: payload.receiver || "",
      date: payload.date || todayIso(),
      time: payload.time || nowTime(),
      identityCheckedDemo: payload.identityCheckedDemo || "Ja",
      objectConfirmed: payload.objectConfirmed || "Ja",
      signatureDemo: payload.signatureDemo || "Demo-Signatur",
      owner: payload.owner || "Admin",
      note: payload.note || ""
    });
    row.status = "abgeholt";
    pushHistory(state, "Fundsache uebergeben", row.id);
    saveState(state);
    return row;
  }

  function addInspection(state, payload) {
    const row = {
      id: `QPR-${Date.now()}`,
      type: payload.type || "Fahrzeugkontrolle",
      area: payload.area || "Fahrzeug",
      target: payload.target || "",
      owner: payload.owner || "Qualitaetsmanagement",
      dueDate: payload.dueDate || todayIso(),
      interval: payload.interval || "individuell",
      lastCheck: payload.lastCheck || "",
      nextCheck: payload.nextCheck || payload.dueDate || todayIso(),
      status: payload.status || "geplant",
      result: "",
      checklist: Array.isArray(payload.checklist) ? payload.checklist : [],
      findings: "",
      needsAction: false,
      reinspection: null
    };
    state.inspections.unshift(row);
    pushHistory(state, "Pruefung angelegt", row.id);
    saveState(state);
    return row;
  }

  function performInspection(state, inspectionId, payload) {
    const row = state.inspections.find((i) => i.id === inspectionId);
    if (!row) return null;
    row.lastCheck = payload.date || todayIso();
    row.nextCheck = payload.nextCheck || row.nextCheck;
    row.result = payload.result || "bestanden";
    row.findings = payload.findings || "";
    row.status = "durchgefuehrt";
    row.needsAction = ["Mangel", "kritisch", "Nachpruefung erforderlich"].includes(row.result);

    if (row.needsAction) {
      state.actions.unshift({
        id: `QM-${Date.now()}`,
        title: `Massnahme aus Pruefung ${row.type}`,
        description: row.findings || "Mangelbearbeitung",
        type: "Korrekturmassnahme",
        source: "Pruefung",
        sourceId: row.id,
        owner: payload.responsible || row.owner,
        startDate: todayIso(),
        dueDate: payload.dueDate || todayIso(),
        priority: row.result === "kritisch" ? "kritisch" : "wichtig",
        status: "freigegeben",
        successCriteria: "Nachpruefung bestanden",
        proof: "offen",
        note: "Automatisch erstellt",
        effectiveness: "",
        escalation: row.result === "kritisch" ? "Stufe 4 - kritisch" : "Stufe 2 - Bereichsverantwortlicher"
      });
      if (row.result === "kritisch") {
        pushNote(state, "Pruefung kritisch", `${row.type} bei ${row.target}`, "kritisch");
      }
    }

    pushHistory(state, "Pruefung durchgefuehrt", row.id);
    saveState(state);
    return row;
  }

  function scheduleReinspection(state, inspectionId, payload) {
    const row = state.inspections.find((i) => i.id === inspectionId);
    if (!row) return null;
    row.reinspection = {
      dueDate: payload.dueDate || todayIso(),
      owner: payload.owner || row.owner,
      note: payload.note || "",
      blockedAreaDemo: payload.blockedAreaDemo || "Nein",
      status: "offen"
    };
    row.status = "Nachpruefung geplant";
    pushHistory(state, "Nachpruefung angelegt", row.id);
    saveState(state);
    return row;
  }

  function addAction(state, payload) {
    const row = {
      id: `QM-${Date.now()}`,
      title: payload.title || "Massnahme",
      description: payload.description || "",
      type: payload.type || "sonstige Massnahme",
      source: payload.source || "allgemein",
      sourceId: payload.sourceId || "",
      owner: payload.owner || "Qualitaetsmanagement",
      startDate: payload.startDate || todayIso(),
      dueDate: payload.dueDate || todayIso(),
      priority: payload.priority || "normal",
      status: payload.status || "geplant",
      successCriteria: payload.successCriteria || "",
      proof: payload.proof || "offen",
      note: payload.note || "",
      effectiveness: "",
      escalation: payload.escalation || "Stufe 0 - normal"
    };
    state.actions.unshift(row);
    pushHistory(state, "Massnahme erstellt", row.id);
    saveState(state);
    return row;
  }

  function setActionStatus(state, actionId, status) {
    const row = state.actions.find((a) => a.id === actionId);
    if (!row) return null;
    row.status = status;
    if (status === "abgeschlossen") row.proof = row.proof || "vorhanden";
    pushHistory(state, "Massnahmenstatus", `${actionId} -> ${status}`);
    saveState(state);
    return row;
  }

  function evaluateEffectiveness(state, actionId, payload) {
    const row = state.actions.find((a) => a.id === actionId);
    if (!row) return null;
    row.effectiveness = payload.result || "weitere Beobachtung";
    row.note = `${row.note || ""}${row.note ? " | " : ""}Wirksamkeit: ${payload.note || ""}`;
    if (row.effectiveness === "wirksam") row.status = "wirksam";
    if (row.effectiveness === "nicht wirksam") row.status = "nicht wirksam";
    pushHistory(state, "Wirksamkeit geprueft", actionId);
    saveState(state);
    return row;
  }

  function addRootCause(state, payload) {
    const row = {
      id: `RC-${Date.now()}`,
      sourceType: payload.sourceType || "Vorfall",
      sourceId: payload.sourceId || "",
      problem: payload.problem || "",
      why1: payload.why1 || "",
      why2: payload.why2 || "",
      why3: payload.why3 || "",
      why4: payload.why4 || "",
      why5: payload.why5 || "",
      mainCause: payload.mainCause || "",
      recommendedAction: payload.recommendedAction || "",
      category: payload.category || "sonstige Ursache",
      linkedCases: Array.isArray(payload.linkedCases) ? payload.linkedCases : []
    };
    state.rootCauses.unshift(row);
    pushHistory(state, "Ursachenanalyse", row.id);
    saveState(state);
    return row;
  }

  function getOverviewStats(state) {
    const monthPrefix = todayIso().slice(0, 7);
    const openComplaints = state.complaints.filter((c) => !["abgeschlossen", "geklaert", "unbegruendet", "abgelehnt"].includes(c.status)).length;
    const criticalComplaints = state.complaints.filter((c) => c.priority === "kritisch").length;
    const newIncidents = state.incidents.filter((i) => i.date === todayIso()).length;
    const openAccidents = state.accidents.filter((a) => !["abgeschlossen", "archiviert"].includes(a.status)).length;
    const unresolvedFound = state.foundItems.filter((f) => !["abgeholt", "archiviert", "entsorgt als Demo"].includes(f.status)).length;
    const openInspections = state.inspections.filter((i) => !["durchgefuehrt", "abgeschlossen"].includes(i.status)).length;
    const overdueActions = state.actions.filter((a) => !["abgeschlossen", "wirksam", "abgebrochen"].includes(a.status) && daysUntil(a.dueDate) < 0).length;
    const qualityCasesMonth = state.complaints.filter((c) => String(c.inputDate || "").startsWith(monthPrefix)).length + state.incidents.filter((i) => String(i.date || "").startsWith(monthPrefix)).length + state.accidents.filter((a) => String(a.date || "").startsWith(monthPrefix)).length;
    const solvedCases = state.complaints.filter((c) => ["abgeschlossen", "geklaert", "unbegruendet"].includes(c.status)).length + state.incidents.filter((i) => ["geklaert", "abgeschlossen"].includes(i.status)).length + state.accidents.filter((a) => ["abgeschlossen", "archiviert"].includes(a.status)).length;

    const closedWithTime = state.complaints.filter((c) => ["abgeschlossen", "geklaert"].includes(c.status)).map((c) => {
      const start = new Date(`${c.inputDate}T${c.inputTime || "00:00"}:00`).getTime();
      const end = new Date((c.lastActivity || `${c.inputDate} 00:00`).replace(" ", "T") + ":00").getTime();
      if (Number.isNaN(start) || Number.isNaN(end)) return 0;
      return Math.max(0, Math.floor((end - start) / 3600000));
    });

    const avgHandle = closedWithTime.length ? (closedWithTime.reduce((s, n) => s + n, 0) / closedWithTime.length).toFixed(1) : "0.0";
    const positive = state.positiveFeedback.length;

    const patternMap = {};
    state.complaints.forEach((c) => {
      const key = `${c.category}|${c.driver}|${c.vehicle}`;
      patternMap[key] = Number(patternMap[key] || 0) + 1;
    });
    const recurring = Object.values(patternMap).filter((v) => v >= 2).length;

    return {
      openComplaints,
      criticalComplaints,
      newIncidents,
      openAccidents,
      unresolvedFound,
      openInspections,
      overdueActions,
      qualityCasesMonth,
      solvedCases,
      avgHandle,
      positive,
      recurring
    };
  }

  function getTodaySnapshot(state) {
    const today = todayIso();
    const newComplaintsToday = state.complaints.filter((c) => c.inputDate === today).length;
    const newDamages = state.incidents.filter((i) => i.date === today && ["Sachschaden", "Fahrzeugproblem"].includes(i.category)).length;
    const newFound = state.foundItems.filter((f) => f.date === today).length;
    const accidentReports = state.accidents.filter((a) => a.date === today).length;
    const criticalDriverHints = state.complaints.filter((c) => c.inputDate === today && c.priority === "kritisch" && c.driver).length;
    const vehicleInspectionsDue = state.inspections.filter((i) => i.area === "Fahrzeug" && daysUntil(i.nextCheck) <= 0).length;
    const openCallbacks = state.complaints.filter((c) => c.callbackOpen).length;
    const overdueActions = state.actions.filter((a) => !["abgeschlossen", "wirksam", "abgebrochen"].includes(a.status) && daysUntil(a.dueDate) < 0).length;
    const unresolved = state.complaints.filter((c) => !["abgeschlossen", "geklaert", "unbegruendet", "abgelehnt"].includes(c.status)).length + state.accidents.filter((a) => !["abgeschlossen", "archiviert"].includes(a.status)).length;
    const escalations = state.complaints.filter((c) => c.escalation === "Stufe 4 - kritisch" || c.status === "eskaliert").length + state.actions.filter((a) => a.escalation === "Stufe 4 - kritisch").length;

    return {
      newComplaintsToday,
      newDamages,
      newFound,
      accidentReports,
      criticalDriverHints,
      vehicleInspectionsDue,
      openCallbacks,
      overdueActions,
      unresolved,
      escalations
    };
  }

  function buildWarnings(state) {
    const warnings = [];
    state.complaints.forEach((c) => {
      if (c.priority === "kritisch") warnings.push({ priority: "kritisch", text: `kritische Kundenbeschwerde ${c.id}` });
      if (c.callbackOpen) warnings.push({ priority: "wichtig", text: `Kunde wartet auf Rueckmeldung (${c.id})` });
      if (c.statements && c.statements.some((s) => s.status === "angefordert")) warnings.push({ priority: "normal", text: `Fahrerantwort fehlt (${c.id})` });
      if (c.recurring) warnings.push({ priority: "wichtig", text: `wiederholte Beschwerde erkannt (${c.category})` });
      if (daysUntil(c.dueDate) <= 1) warnings.push({ priority: "normal", text: `Frist laeuft ab (${c.id})` });
    });

    state.accidents.forEach((a) => {
      if (a.injuriesDemo === "Ja") warnings.push({ priority: "kritisch", text: `Unfall mit Personenschaden als Demo (${a.id})` });
      if (a.drivable !== "Ja") warnings.push({ priority: "kritisch", text: `Fahrzeug nicht fahrbereit (${a.vehicle})` });
      if (a.documents && !a.documents.versicherungsdaten) warnings.push({ priority: "wichtig", text: `Versicherungsunterlage fehlt (${a.id})` });
      if (a.documents && !a.documents.fotos) warnings.push({ priority: "normal", text: `wichtiger Beleg fehlt (${a.id})` });
    });

    state.actions.forEach((a) => {
      if (![
        "abgeschlossen", "wirksam", "abgebrochen"
      ].includes(a.status) && daysUntil(a.dueDate) < 0) warnings.push({ priority: "kritisch", text: `Massnahme ueberfaellig (${a.id})` });
    });

    state.inspections.forEach((i) => {
      if (daysUntil(i.nextCheck) < 0 && !["durchgefuehrt", "abgeschlossen"].includes(i.status)) warnings.push({ priority: "wichtig", text: `Pruefung nicht durchgefuehrt (${i.type})` });
    });

    state.foundItems.forEach((f) => {
      if (["hoch", "besonders sensibel"].includes(f.valueCategory) && !["abgeholt", "archiviert"].includes(f.status)) warnings.push({ priority: "wichtig", text: `Fundgegenstand mit hohem Wert (${f.number})` });
    });

    return warnings.slice(0, 40);
  }

  function getRecurringSummary(state) {
    const bucket = {};
    state.complaints.forEach((c) => {
      const keys = [
        `Fahrer:${c.driver || "-"}`,
        `Fahrzeug:${c.vehicle || "-"}`,
        `Kategorie:${c.category || "-"}`,
        `Kunde:${c.customer || "-"}`,
        `Strecke:${c.route || "-"}`
      ];
      keys.forEach((k) => {
        bucket[k] = Number(bucket[k] || 0) + 1;
      });
    });
    return Object.entries(bucket)
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([pattern, count]) => ({ pattern, count, suggestion: "Muster pruefen und Praeventionsmassnahme planen" }));
  }

  function getReportData(state, filters) {
    const f = filters || {};
    const from = f.from || "";
    const to = f.to || "";

    function inRange(dateIso) {
      if (!dateIso) return true;
      if (from && dateIso < from) return false;
      if (to && dateIso > to) return false;
      return true;
    }

    const complaints = state.complaints.filter((c) => inRange(c.inputDate));
    const incidents = state.incidents.filter((i) => inRange(i.date));
    const accidents = state.accidents.filter((a) => inRange(a.date));
    const found = state.foundItems.filter((x) => inRange(x.date));
    const actions = state.actions.filter((a) => inRange(a.startDate));
    const checks = state.inspections.filter((i) => inRange(i.nextCheck || i.dueDate));
    const positive = state.positiveFeedback.filter((p) => inRange(p.date));

    const byCategory = {};
    complaints.forEach((c) => {
      byCategory[c.category] = Number(byCategory[c.category] || 0) + 1;
    });

    const byIncidentCause = {};
    incidents.forEach((i) => {
      const key = i.category || "sonstiges";
      byIncidentCause[key] = Number(byIncidentCause[key] || 0) + 1;
    });

    const byAccidentType = {};
    accidents.forEach((a) => {
      const key = a.accidentType || "sonstiger Unfall";
      byAccidentType[key] = Number(byAccidentType[key] || 0) + 1;
    });

    const actionStatus = {};
    actions.forEach((a) => {
      actionStatus[a.status] = Number(actionStatus[a.status] || 0) + 1;
    });

    const foundStatus = {};
    found.forEach((x) => {
      foundStatus[x.status] = Number(foundStatus[x.status] || 0) + 1;
    });

    const vehicleIssues = {};
    complaints.forEach((c) => {
      if (!c.vehicle) return;
      vehicleIssues[c.vehicle] = Number(vehicleIssues[c.vehicle] || 0) + 1;
    });
    accidents.forEach((a) => {
      if (!a.vehicle) return;
      vehicleIssues[a.vehicle] = Number(vehicleIssues[a.vehicle] || 0) + 1;
    });

    const passedChecks = checks.filter((i) => ["bestanden", "bestanden mit Hinweis"].includes(i.result)).length;
    const checkQuote = checks.length ? Math.round((passedChecks / checks.length) * 100) : 0;

    const ridesDemo = 240;
    const complaintsPer100 = ((complaints.length / ridesDemo) * 100).toFixed(1);

    return {
      metrics: {
        complaintsTotal: complaints.length,
        complaintsPer100,
        solvedComplaints: complaints.filter((c) => ["abgeschlossen", "geklaert", "unbegruendet"].includes(c.status)).length,
        criticalCases: complaints.filter((c) => c.priority === "kritisch").length,
        recurringCauses: getRecurringSummary({ ...state, complaints }).length,
        accidents: accidents.length,
        nearMisses: incidents.filter((i) => i.category === "Beinaheunfall").length,
        vehicleIssues: Object.values(vehicleIssues).reduce((s, n) => s + n, 0),
        foundItems: found.length,
        foundReturnRate: found.length ? Math.round((found.filter((x) => x.status === "abgeholt").length / found.length) * 100) : 0,
        checksPassedQuote: checkQuote,
        overdueActions: actions.filter((a) => !["abgeschlossen", "wirksam", "abgebrochen"].includes(a.status) && daysUntil(a.dueDate) < 0).length,
        positiveFeedback: positive.length,
        trainingsActions: actions.filter((a) => a.type === "Schulung" || a.type === "Unterweisung").length,
        openRisks: complaints.filter((c) => c.risk && ["hoch", "kritisch"].includes(c.risk.level) && !["abgeschlossen", "geklaert"].includes(c.status)).length
      },
      charts: {
        complaintsByCategory: byCategory,
        incidentsByCause: byIncidentCause,
        accidentsByType: byAccidentType,
        vehicleIssues,
        actionStatus,
        checkQuote,
        positiveByCategory: positive.reduce((acc, p) => { acc[p.category] = Number(acc[p.category] || 0) + 1; return acc; }, {}),
        foundStatus
      },
      monthlySummary: {
        topCases: complaints.slice(0, 5).map((c) => `${c.id} ${c.shortText}`),
        trends: [
          `Beschwerden: ${complaints.length}`,
          `Vorfaelle: ${incidents.length}`,
          `Unfaelle: ${accidents.length}`,
          `Massnahmen offen: ${actions.filter((a) => !["abgeschlossen", "wirksam", "abgebrochen"].includes(a.status)).length}`
        ],
        recurring: getRecurringSummary({ ...state, complaints }).slice(0, 5),
        criticalRisks: complaints.filter((c) => c.risk && c.risk.level === "kritisch").map((c) => c.id),
        completedActions: actions.filter((a) => ["abgeschlossen", "wirksam"].includes(a.status)).map((a) => a.id),
        openActions: actions.filter((a) => !["abgeschlossen", "wirksam", "abgebrochen"].includes(a.status)).map((a) => a.id),
        recommendations: [
          "Pufferzeiten in Spitzenzeiten pruefen",
          "Kritische Fahrerhinweise in Unterweisung uebernehmen",
          "Nachpruefungen eng terminieren"
        ]
      }
    };
  }

  function getPortalTasksForDriver(state, driverId) {
    return state.actions.filter((a) => {
      const key = normalize(`${a.title} ${a.description} ${a.note}`);
      return normalize(driverId) && key.includes(normalize(driverId));
    });
  }

  window.AdminQualityDemo = {
    KEY,
    DISPO_KEY,
    V15_KEY,
    CUSTOMER_KEY,
    CUSTOMER_TASKS_KEY,
    V17_KEY,
    PRIORITIES,
    ESCALATIONS,
    COMPLAINT_CATEGORIES,
    COMPLAINT_STATUSES,
    INCIDENT_CATEGORIES,
    INCIDENT_STATUSES,
    ACCIDENT_STATUSES,
    FOUND_STATUSES,
    INSPECTION_RESULTS,
    ACTION_STATUSES,
    CAUSE_CATEGORIES,
    normalize,
    todayIso,
    nowStamp,
    daysUntil,
    loadState,
    saveState,
    resetState,
    evaluateRiskValues,
    addComplaint,
    setComplaintStatus,
    addCommunication,
    addDriverStatement,
    addPositiveFeedback,
    addIncident,
    addAccident,
    applyAccidentConsequences,
    addFoundItem,
    updateFoundStatus,
    handoverFoundItem,
    addInspection,
    performInspection,
    scheduleReinspection,
    addAction,
    setActionStatus,
    evaluateEffectiveness,
    addRootCause,
    getOverviewStats,
    getTodaySnapshot,
    buildWarnings,
    getRecurringSummary,
    getReportData,
    getPortalTasksForDriver
  };
})();
