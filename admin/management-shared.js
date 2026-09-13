(() => {
  const KEY = "adminV19ManagementState";
  const KEYS = {
    dispo: "adminLiveDispoV131",
    driverOps: "adminV15DriverOps",
    personnel: "adminV17PersonnelState",
    finance: "adminV16FinanceState",
    quality: "adminV18QualityState",
    series: "adminSharedSeriesV14"
  };

  const PERIODS = ["3h", "today", "tomorrow", "7d", "30d"];
  const MANAGEMENT_STATUSES = ["Betrieb stabil", "erhöhte Auslastung", "Engpass möglich", "kritischer Engpass", "Betriebsstörung"];
  const RECOMMENDATION_STATUSES = ["neu", "geprueft", "angenommen", "teilweise umgesetzt", "abgelehnt", "erledigt"];

  const TIME_BLOCKS = [
    { key: "00-06", label: "00:00-06:00", from: 0, to: 6 },
    { key: "06-09", label: "06:00-09:00", from: 6, to: 9 },
    { key: "09-12", label: "09:00-12:00", from: 9, to: 12 },
    { key: "12-15", label: "12:00-15:00", from: 12, to: 15 },
    { key: "15-18", label: "15:00-18:00", from: 15, to: 18 },
    { key: "18-21", label: "18:00-21:00", from: 18, to: 21 },
    { key: "21-24", label: "21:00-24:00", from: 21, to: 24 }
  ];

  const RIDE_TYPES = [
    "Taxi", "Krankenfahrt", "Dialyse", "Chemo", "Strahlentherapie", "Rollstuhlfahrt", "Flughafenfahrt", "Schuelerfahrt", "Firmenfahrt", "Bahntransfer", "Kurier", "Fernfahrt"
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

  function normalize(v) {
    return String(v || "").toLocaleLowerCase("de-DE").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function todayIso() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function nowTime() {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }

  function hourOf(time) {
    const s = String(time || "").split(":")[0];
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }

  function weekdayIndex(dateIso) {
    const d = new Date(`${dateIso || todayIso()}T00:00:00`);
    const n = d.getDay();
    return Number.isFinite(n) ? n : 1;
  }

  function findBlockByHour(hour) {
    return TIME_BLOCKS.find((b) => hour >= b.from && hour < b.to) || TIME_BLOCKS[TIME_BLOCKS.length - 1];
  }

  function loadRaw(key, fallback) {
    const parsed = safeParse(localStorage.getItem(key));
    return parsed && typeof parsed === "object" ? parsed : fallback;
  }

  function createDefaultState() {
    return {
      version: 1,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      filters: {
        period: "today",
        weather: "trocken",
        confidence: "mittel",
        managementMode: "compact"
      },
      favorites: ["Live-Dispo", "Fahrzeugstatus", "Personalstatus", "offene Forderungen", "kritische Beschwerden", "Monatsziel", "heutige Auslastung", "offene Entscheidungen"],
      events: [
        { id: "ME-1", title: "Stadtfest", category: "Grossveranstaltung", date: todayIso(), timeFrom: "16:00", timeTo: "23:00", place: "Innenstadt", impact: "hohe Auswirkung", extraRides: 18, areas: "Zentrum", neededVehicles: 5, neededDrivers: 6, note: "Mehr Rueckfahrten", owner: "Disposition" },
        { id: "ME-2", title: "Flughafen-Hauptreisezeit", category: "Saison", date: todayIso(), timeFrom: "04:30", timeTo: "08:30", place: "Flughafen", impact: "mittlere Auswirkung", extraRides: 9, areas: "Fernfahrten", neededVehicles: 3, neededDrivers: 3, note: "Fruehe Abholungen", owner: "Disposition" }
      ],
      scenarios: [
        { id: "SC-1", name: "Normaler Betriebstag", date: todayIso(), period: "today", demandFactor: 1, availableDrivers: 12, availableVehicles: 10, failedVehicles: 0, failedDrivers: 0, specialTypes: "", reserve: 2, notes: "Basis", status: "empfohlen", result: {} },
        { id: "SC-2", name: "Hohe Nachfrage", date: todayIso(), period: "today", demandFactor: 1.3, availableDrivers: 11, availableVehicles: 9, failedVehicles: 1, failedDrivers: 1, specialTypes: "Flughafenfahrt,Dialyse", reserve: 1, notes: "Morgenspitze", status: "ausgewaehlt", result: {} }
      ],
      goals: [
        { id: "G-1", title: "Wartezeit unter 12 Minuten", category: "Betrieb", description: "Durchschnittliche Wartezeit senken", period: "Monat", target: 12, current: 14, unit: "Min", owner: "Disposition", status: "leicht gefaehrdet", priority: "hoch", measures: "Reserve in Peak", comment: "Morgens kritisch", updatedAt: nowIso() },
        { id: "G-2", title: "Fahrzeugverfuegbarkeit ueber 85%", category: "Fahrzeugverfuegbarkeit", description: "Werkstattabhaengigkeit senken", period: "Monat", target: 85, current: 81, unit: "%", owner: "Werkstatt", status: "leicht gefaehrdet", priority: "normal", measures: "Freigaben beschleunigen", comment: "2 Fahrzeuge gebunden", updatedAt: nowIso() }
      ],
      decisions: [
        { id: "D-1", title: "Ersatzfahrzeug aktivieren", situation: "Rollstuhlfahrten steigen", target: "Kapazitaetsluecke schliessen", options: [{ id: "O-1", label: "Sofort aktivieren", benefit: 8, risk: 3, effort: 4, duration: "1 Tag", staff: 1, vehicles: 1, capacityDelta: 4, costDemo: 380, revenueDemo: 680 }], pros: "Schnell wirksam", cons: "Mehr Kosten", risks: "Werkstattbindung", costDemo: 380, benefitDemo: 680, areas: "Disposition,Fahrzeuge", owner: "Geschaeftsleitung", dueDate: todayIso(), recommendation: "Sofort aktivieren", status: "in Pruefung", history: [] }
      ],
      recommendations: [
        { id: "R-1", title: "Reservefahrer aktivieren", reason: "Freie Fahrzeuge unter 20% und Wartezeit ueber 15 Min", basis: "Regel M1", status: "neu", owner: "Disposition", dueDate: todayIso(), link: "schichtplanung.html" }
      ],
      managementTasks: [
        { id: "MT-1", title: "Engpass morgen frueh pruefen", area: "Betrieb", priority: "hoch", owner: "Disposition", dueDate: todayIso(), status: "offen", relation: "06:00-09:00", impact: "Wartezeit senken", lastActivity: nowIso() }
      ],
      reportState: {
        lastType: "Managementbericht",
        lastPeriod: "today",
        approved: false,
        approvedBy: "",
        updatedAt: nowIso()
      }
    };
  }

  function saveState(state) {
    state.updatedAt = nowIso();
    localStorage.setItem(KEY, JSON.stringify(state));
    return state;
  }

  function ensureStateShape(state) {
    const base = createDefaultState();
    const next = { ...base, ...(state || {}) };
    next.filters = { ...base.filters, ...(next.filters || {}) };
    next.favorites = Array.isArray(next.favorites) ? next.favorites : base.favorites;
    next.events = Array.isArray(next.events) ? next.events : base.events;
    next.scenarios = Array.isArray(next.scenarios) ? next.scenarios : base.scenarios;
    next.goals = Array.isArray(next.goals) ? next.goals : base.goals;
    next.decisions = Array.isArray(next.decisions) ? next.decisions : base.decisions;
    next.recommendations = Array.isArray(next.recommendations) ? next.recommendations : base.recommendations;
    next.managementTasks = Array.isArray(next.managementTasks) ? next.managementTasks : base.managementTasks;
    next.reportState = { ...base.reportState, ...(next.reportState || {}) };
    return next;
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
    const s = createDefaultState();
    saveState(s);
    return s;
  }

  function sourceSnapshot() {
    const dispo = loadRaw(KEYS.dispo, {});
    const driverOps = loadRaw(KEYS.driverOps, {});
    const personnel = loadRaw(KEYS.personnel, {});
    const finance = loadRaw(KEYS.finance, {});
    const quality = loadRaw(KEYS.quality, {});
    const series = safeParse(localStorage.getItem(KEYS.series));

    const orders = Array.isArray(dispo.orders) ? dispo.orders : [];
    const vehiclesDispo = Array.isArray(dispo.vehicles) ? dispo.vehicles : [];
    const v15Vehicles = Array.isArray(driverOps.vehicles) ? driverOps.vehicles : [];
    const employees = Array.isArray(personnel.employees) ? personnel.employees : [];
    const vacations = Array.isArray(personnel.vacations) ? personnel.vacations : [];
    const absences = Array.isArray(personnel.absences) ? personnel.absences : [];
    const docs = Array.isArray(personnel.documents) ? personnel.documents : [];
    const invoices = Array.isArray(finance.invoices) ? finance.invoices : [];
    const ridesFinance = Array.isArray(finance.rides) ? finance.rides : [];
    const complaints = Array.isArray(quality.complaints) ? quality.complaints : [];
    const incidents = Array.isArray(quality.incidents) ? quality.incidents : [];
    const accidents = Array.isArray(quality.accidents) ? quality.accidents : [];
    const actions = Array.isArray(quality.actions) ? quality.actions : [];
    const seriesList = Array.isArray(series) ? series : Array.isArray(series && series.series) ? series.series : [];

    const allVehicles = [...vehiclesDispo, ...v15Vehicles];
    const uniqueVehicleIds = [...new Set(allVehicles.map((v) => String(v.id || v.vehicleId || v.plate || "")).filter(Boolean))];
    const uniqueVehicles = uniqueVehicleIds.map((id) => allVehicles.find((v) => String(v.id || v.vehicleId || v.plate || "") === id) || { id });

    return {
      orders,
      vehiclesDispo,
      vehicles: uniqueVehicles,
      employees,
      vacations,
      absences,
      docs,
      invoices,
      ridesFinance,
      financeUi: finance && finance.ui ? finance.ui : {},
      complaints,
      incidents,
      accidents,
      actions,
      seriesList
    };
  }

  function classifyVehicle(v) {
    const text = normalize(`${v.name || ""} ${v.type || ""} ${v.hint || ""} ${v.plate || ""}`);
    return {
      wheelchair: text.includes("rollstuhl"),
      van: text.includes("grossraum") || text.includes("v-klasse") || text.includes("touran") || text.includes("sprinter"),
      elektro: text.includes("tesla") || text.includes("elektro"),
      seats: Number(v.seats || 4)
    };
  }

  function vehicleStatus(v) {
    const status = normalize(v.status || v.state || "");
    if (status.includes("werkstatt")) return "werkstatt";
    if (status.includes("gesperrt")) return "gesperrt";
    if (status.includes("unterwegs") || status.includes("fahrt")) return "unterwegs";
    if (status.includes("pause")) return "pause";
    if (status.includes("verfugbar") || status.includes("frei") || status.includes("bereit")) return "frei";
    return "frei";
  }

  function employeeStatus(e) {
    const status = normalize(e.status || "");
    if (status.includes("krank")) return "krank";
    if (status.includes("urlaub")) return "urlaub";
    if (status.includes("dienst") || status.includes("aktiv")) return "dienst";
    if (status.includes("schulung")) return "schulung";
    if (status.includes("pause")) return "pause";
    return "frei";
  }

  function demandFactorByWeekday(day) {
    if (day === 1 || day === 3 || day === 5) return 1.14;
    if (day === 6) return 1.1;
    if (day === 0) return 0.9;
    return 1;
  }

  function weatherFactor(weather) {
    const n = normalize(weather);
    if (n.includes("regen")) return 1.08;
    if (n.includes("unwetter")) return 1.2;
    if (n.includes("schnee")) return 1.15;
    return 1;
  }

  function buildCoreMetrics(state, source) {
    const today = todayIso();
    const ordersToday = source.orders.filter((o) => String(o.date || today) === today);
    const activeOrders = ordersToday.filter((o) => ["Fahrer unterwegs", "Fahrer angekommen", "Fahrgast eingestiegen", "Fahrt laeuft", "Ziel erreicht"].includes(o.status));
    const plannedOrders = ordersToday.filter((o) => ["Neu", "Bestaetigt", "Zugewiesen", "Wartet"].includes(o.status)).length;

    const vehicles = source.vehicles;
    const vehicleStats = vehicles.reduce((acc, v) => {
      const s = vehicleStatus(v);
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});

    const employees = source.employees;
    const employeeStats = employees.reduce((acc, e) => {
      const s = employeeStatus(e);
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});

    const rideTotal = ordersToday.length || source.ridesFinance.length;
    const waitAvg = ordersToday.length
      ? Math.round(ordersToday.reduce((sum, o) => sum + Number(o.waitingMinutes || o.waitMin || (o.priority === "Hoch" ? 13 : 9)), 0) / ordersToday.length)
      : 12;

    const freeVehicles = Number(vehicleStats.frei || 0);
    const onRoadVehicles = Number(vehicleStats.unterwegs || 0);
    const workshopVehicles = Number(vehicleStats.werkstatt || 0);
    const driversOnDuty = Number(employeeStats.dienst || 0);
    const openShifts = Math.max(0, 3 - Number(employeeStats.dienst || 0));

    const expectedExtra = Math.round((plannedOrders + (source.seriesList.length || 4)) * demandFactorByWeekday(weekdayIndex(today)) * weatherFactor(state.filters.weather) * 0.22);
    const expectedToday = rideTotal + expectedExtra;

    const utilization = vehicles.length ? Math.round(((onRoadVehicles + workshopVehicles) / vehicles.length) * 100) : 0;

    const invoices = source.invoices;
    const openClaims = Math.round(invoices.reduce((s, i) => s + Number(i.open || 0), 0));
    const monthRevenue = Math.round(invoices.reduce((s, i) => s + Number(i.gross || 0), 0));
    const dayRevenue = Math.round(source.ridesFinance.filter((r) => String(r.date || "") === today).reduce((s, r) => s + Number(r.meterAmount || r.invoiceAmount || 0), 0));

    const criticalComplaints = source.complaints.filter((c) => normalize(c.priority).includes("krit") && !["abgeschlossen", "geklaert"].includes(normalize(c.status))).length;
    const unresolvedAccidents = source.accidents.filter((a) => !["abgeschlossen", "archiviert"].includes(normalize(a.status))).length;
    const criticalOps = criticalComplaints + unresolvedAccidents + source.incidents.filter((i) => normalize(i.priority).includes("krit") && !["abgeschlossen", "geklaert"].includes(normalize(i.status))).length;

    const satBase = Math.max(58, 92 - waitAvg - criticalComplaints * 3 - unresolvedAccidents * 2);

    return {
      rideTotal,
      activeRides: activeOrders.length,
      plannedRides: plannedOrders,
      expectedToday,
      expectedExtra,
      freeVehicles,
      onRoadVehicles,
      workshopVehicles,
      driversOnDuty,
      openShifts,
      utilization,
      waitAvg,
      dayRevenue,
      monthRevenue,
      openClaims,
      criticalOps,
      customerSatisfaction: Math.max(50, satBase),
      qualityOpen: source.complaints.filter((c) => !["abgeschlossen", "geklaert"].includes(normalize(c.status))).length,
      financeOpenCases: invoices.filter((i) => Number(i.open || 0) > 0).length,
      staffShortage: Number(employeeStats.krank || 0) + Number(employeeStats.urlaub || 0),
      vehicleFailures: unresolvedAccidents + Number(vehicleStats.gesperrt || 0)
    };
  }

  function metricCards(state, source) {
    const m = buildCoreMetrics(state, source);
    const monthTarget = 220000;
    const waitTarget = 12;

    function mk(label, value, compare, trend, status, info) {
      return { label, value, compare, trend, status, info };
    }

    return [
      mk("Fahrten heute", m.rideTotal, "Gestern: 94", m.rideTotal >= 90 ? "steigend" : "stabil", m.rideTotal >= 110 ? "wichtig" : "normal", "Basis aus Dispo-Aufträgen und Finanzfahrten."),
      mk("aktive Fahrten", m.activeRides, "Soll jetzt: 18", m.activeRides >= 18 ? "hoch" : "normal", m.activeRides > 24 ? "kritisch" : "normal", "Aktive Status aus Live-Dispo."),
      mk("geplante Fahrten heute", m.plannedRides, "Vormerkungen: 26", m.plannedRides > 20 ? "steigend" : "stabil", "normal", "Neu/Bestätigt/Zugewiesen/Wartet."),
      mk("erwartete Fahrten heute", m.expectedToday, `Prognose +${m.expectedExtra}`, m.expectedExtra > 12 ? "steigend" : "stabil", m.expectedExtra > 18 ? "wichtig" : "normal", "Regelbasiert aus Zeit, Wochentag, Serien und Wetter-Demo."),
      mk("freie Fahrzeuge", m.freeVehicles, "Mindestziel: 20%", m.freeVehicles < 3 ? "fallend" : "stabil", m.freeVehicles < 2 ? "kritisch" : m.freeVehicles < 4 ? "wichtig" : "normal", "Verfügbare Fahrzeugkapazität."),
      mk("Fahrzeuge unterwegs", m.onRoadVehicles, "Kapazität laufend", "stabil", "normal", "Aktuell gebundene Fahrzeuge."),
      mk("Fahrzeuge in Werkstatt", m.workshopVehicles, "Ziel <= 2", m.workshopVehicles > 2 ? "steigend" : "stabil", m.workshopVehicles >= 3 ? "wichtig" : "normal", "Werkstattstatus reduziert operative Kapazität."),
      mk("Fahrer im Dienst", m.driversOnDuty, "Soll: 12", m.driversOnDuty < 10 ? "fallend" : "stabil", m.driversOnDuty < 9 ? "kritisch" : m.driversOnDuty < 11 ? "wichtig" : "normal", "Aus Personalstatus im Dienst/aktiv."),
      mk("offene Schichten", m.openShifts, "Soll: 0", m.openShifts > 0 ? "steigend" : "stabil", m.openShifts > 2 ? "kritisch" : m.openShifts > 0 ? "wichtig" : "normal", "Abgleich Dienstbedarf gegen aktuelle Besetzung."),
      mk("heutige Auslastung", `${m.utilization}%`, "Zielbereich: 70-88%", m.utilization > 88 ? "hoch" : "stabil", m.utilization > 92 ? "kritisch" : m.utilization > 86 ? "wichtig" : "normal", "Aus Fahrzeuge unterwegs + Werkstatt / Gesamtfahrzeuge."),
      mk("durchschnittliche Wartezeit", `${m.waitAvg} Min`, `Ziel <= ${waitTarget} Min`, m.waitAvg > waitTarget ? "steigend" : "fallend", m.waitAvg > 16 ? "kritisch" : m.waitAvg > 13 ? "wichtig" : "normal", "Aus Dispo-Wartefeldern, sonst plausible Demo-Schätzung."),
      mk("heutiger Demo-Umsatz", `${m.dayRevenue} EUR`, "Tagesschnitt: 4.900 EUR", m.dayRevenue > 4900 ? "steigend" : "stabil", "normal", "Nicht steuerrelevant, reine Demo-Kalkulation."),
      mk("Monatsumsatz Demo", `${m.monthRevenue} EUR`, `Monatsziel: ${monthTarget} EUR`, m.monthRevenue >= monthTarget ? "im Plan" : "unter Plan", m.monthRevenue < monthTarget * 0.85 ? "wichtig" : "normal", "Aus Finanzrechnungen (brutto) aggregiert."),
      mk("offene Forderungen", `${m.openClaims} EUR`, "Soll: sinkend", m.openClaims > 20000 ? "steigend" : "stabil", m.openClaims > 28000 ? "kritisch" : m.openClaims > 18000 ? "wichtig" : "normal", "Offene Beträge aus Rechnungen."),
      mk("kritische Betriebsfälle", m.criticalOps, "Sicherheitsziel: 0", m.criticalOps > 0 ? "steigend" : "stabil", m.criticalOps >= 4 ? "kritisch" : m.criticalOps > 0 ? "wichtig" : "normal", "Beschwerden/Vorfälle/Unfälle mit hoher Priorität."),
      mk("Kundenzufriedenheit Demo", `${m.customerSatisfaction}%`, "Trendziel: >85%", m.customerSatisfaction < 82 ? "fallend" : "stabil", m.customerSatisfaction < 78 ? "kritisch" : m.customerSatisfaction < 85 ? "wichtig" : "normal", "Indikator aus Wartezeit, Beschwerden und Vorfällen.")
    ];
  }

  function managementStatus(state, source) {
    const m = buildCoreMetrics(state, source);
    const reasons = [];
    const areas = new Set();
    let score = 0;

    if (m.freeVehicles <= 2) {
      score += 2;
      reasons.push("zu wenige freie Fahrzeuge");
      areas.add("Fahrzeuge");
    }
    if (m.waitAvg > 15) {
      score += 2;
      reasons.push("ungewöhnlich hohe Wartezeit");
      areas.add("Disposition");
    }
    if (m.staffShortage >= 2) {
      score += 2;
      reasons.push("mehrere Ausfälle in Personalverfügbarkeit");
      areas.add("Personal");
    }
    if (m.vehicleFailures >= 1) {
      score += 2;
      reasons.push("Fahrzeugausfall/Unfallprüfung offen");
      areas.add("Werkstatt");
    }
    if (m.qualityOpen >= 6) {
      score += 1;
      reasons.push("hohe Zahl offener Qualitätsfälle");
      areas.add("Qualität");
    }
    if (m.financeOpenCases >= 12) {
      score += 1;
      reasons.push("Rückstand in Abrechnung");
      areas.add("Abrechnung");
    }

    let status = MANAGEMENT_STATUSES[0];
    if (score >= 8) status = MANAGEMENT_STATUSES[4];
    else if (score >= 6) status = MANAGEMENT_STATUSES[3];
    else if (score >= 4) status = MANAGEMENT_STATUSES[2];
    else if (score >= 2) status = MANAGEMENT_STATUSES[1];

    const actions = [];
    if (m.freeVehicles <= 2 || m.waitAvg > 15) actions.push("Reservefahrzeug und Reservefahrer prüfen");
    if (m.staffShortage >= 2) actions.push("Vertretung und Schichtanpassung vorbereiten");
    if (m.vehicleFailures >= 1) actions.push("Werkstattfreigabe priorisieren");
    if (m.financeOpenCases >= 12) actions.push("Abrechnungsrückstand im Prüfcenter priorisieren");
    if (!actions.length) actions.push("Betrieb fortlaufend beobachten");

    return {
      status,
      score,
      causes: reasons,
      areas: [...areas],
      actions
    };
  }

  function todayTimeline(state, source) {
    const metrics = buildCoreMetrics(state, source);
    const orders = source.orders.filter((o) => String(o.date || todayIso()) === todayIso());
    const employees = source.employees;
    const vehicles = source.vehicles;

    return TIME_BLOCKS.map((b, idx) => {
      const planned = orders.filter((o) => {
        const h = hourOf(o.time);
        return h >= b.from && h < b.to;
      });

      const special = {
        medical: planned.filter((o) => normalize(o.rideType).includes("krank") || normalize(o.rideType).includes("dialyse") || normalize(o.rideType).includes("chemo") || normalize(o.rideType).includes("strahlen")).length,
        series: planned.filter((o) => normalize(o.rideType).includes("serie")).length + Math.max(0, source.seriesList.length > 0 && idx % 2 === 0 ? 1 : 0),
        airport: planned.filter((o) => normalize(o.rideType).includes("flughafen")).length,
        school: planned.filter((o) => normalize(o.rideType).includes("schueler")).length
      };

      const expectedExtra = Math.max(0, Math.round((planned.length + idx + source.seriesList.length * 0.2) * demandFactorByWeekday(weekdayIndex(todayIso())) * weatherFactor(state.filters.weather) * (idx === 1 ? 0.6 : idx === 2 ? 0.42 : 0.28)));
      const driversAvail = Math.max(0, employees.filter((e) => ["dienst", "frei", "pause"].includes(employeeStatus(e))).length - Math.max(0, idx - 2));
      const vehiclesAvail = Math.max(0, vehicles.filter((v) => ["frei", "pause"].includes(vehicleStatus(v))).length - Math.max(0, idx - 1));
      const demand = planned.length + expectedExtra;
      const capacity = Math.max(1, Math.min(driversAvail, vehiclesAvail));
      const utilization = Math.round((demand / capacity) * 100);
      const gap = demand - capacity;

      let status = "stabil";
      if (gap > 4 || utilization > 160) status = "kritisch";
      else if (gap > 2 || utilization > 125) status = "Engpass";
      else if (gap > 0 || utilization > 100) status = "beobachten";

      return {
        block: b.label,
        planned: planned.length,
        expectedExtra,
        driversAvail,
        vehiclesAvail,
        medical: special.medical,
        series: special.series,
        airport: special.airport,
        school: special.school,
        utilization,
        status
      };
    });
  }

  function links() {
    return {
      liveDispo: "live-dispo.html",
      fahrten: "index.html",
      schichtplanung: "schichtplanung.html",
      fahrzeuge: "fahrzeuge.html",
      mitarbeiter: "personaluebersicht.html",
      kritik: "beschwerden.html",
      monat: "monatsabschluss.html",
      abrechnung: "abrechnungszentrale.html",
      werkstatt: "werkstatt.html",
      serie: "serienfahrten.html",
      unfaelle: "unfaelle.html",
      dokumente: "dokumentfristen.html",
      controlling: "controlling.html"
    };
  }

  function buildWarnings(state, source) {
    const m = buildCoreMetrics(state, source);
    const t = todayTimeline(state, source);
    const out = [];

    function add(priority, cause, impact, action, area, link) {
      out.push({
        id: `W-${out.length + 1}`,
        priority,
        cause,
        impact,
        action,
        area,
        link
      });
    }

    if (t.some((x) => x.block === "06:00-09:00" && (x.status === "Engpass" || x.status === "kritisch"))) {
      add("kritisch", "zu wenige Fahrer in Hauptzeit", "Längere Wartezeiten und offene Aufträge", "Frühstart oder Reserve aktivieren", "Disposition", links().schichtplanung);
    }
    if (m.freeVehicles <= 2) add("kritisch", "zu wenige freie Fahrzeuge", "Aufträge können nicht zeitnah disponiert werden", "Ersatzfahrzeug und Werkstattfreigabe prüfen", "Fahrzeuge", links().fahrzeuge);
    if (m.workshopVehicles >= 2) add("wichtig", "mehrere Fahrzeuge in Werkstatt", "Kapazität sinkt in Peak-Zeiten", "Werkstattpriorisierung und Umplanung", "Werkstatt", links().werkstatt);

    const hasWheelchairOrder = source.orders.some((o) => normalize(o.rideType).includes("rollstuhl") && !["Abgeschlossen", "Ziel erreicht"].includes(o.status));
    const wheelchairFree = source.vehicles.some((v) => classifyVehicle(v).wheelchair && vehicleStatus(v) === "frei");
    if (hasWheelchairOrder && !wheelchairFree) add("kritisch", "Rollstuhlfahrzeug nicht verfügbar", "Medizinische Fahrt gefährdet", "Rollstuhlfahrzeug reservieren oder Zeitfenster neu planen", "Disposition", links().liveDispo);

    const hasVanOrder = source.orders.some((o) => normalize(o.rideType).includes("grossraum") || Number(o.persons || 1) > 4);
    const vanFree = source.vehicles.some((v) => classifyVehicle(v).van && vehicleStatus(v) === "frei");
    if (hasVanOrder && !vanFree) add("wichtig", "Großraumfahrzeug nicht verfügbar", "Gruppenauftrag riskant", "Großraumfahrzeug reservieren", "Disposition", links().liveDispo);

    const seriesUnassigned = source.orders.filter((o) => normalize(o.rideType).includes("serie") && !o.driverId).length + Math.max(0, source.seriesList.length > 0 ? 1 : 0);
    if (seriesUnassigned > 0) add("wichtig", "Serienfahrten ohne Zuweisung", "Regelmäßige Kundenfahrten können ausfallen", "Serienfahrt neu zuweisen", "Serienfahrten", links().serie);

    const openMedical = source.orders.filter((o) => normalize(o.rideType).includes("krank") && !["Abgeschlossen", "Ziel erreicht"].includes(o.status)).length;
    if (openMedical >= 4) add("wichtig", "viele offene Krankenfahrten", "Versorgungs- und Terminrisiko", "Krankenfahrten priorisieren", "Disposition", links().liveDispo);

    if (m.waitAvg > 15) add("kritisch", "ungewöhnlich hohe Wartezeit", "Kundenzufriedenheit sinkt", "Rückrufteam aktivieren und Bündelung prüfen", "Telefonzentrale", "telefonzentrale.html");
    if (source.complaints.some((c) => normalize(c.priority).includes("krit") && !["abgeschlossen", "geklaert"].includes(normalize(c.status)))) add("kritisch", "kritische Beschwerde", "Reputations- und Sicherheitsrisiko", "Sofortige Fallprüfung", "Qualität", links().kritik);
    if (source.accidents.some((a) => !["abgeschlossen", "archiviert"].includes(normalize(a.status)))) add("kritisch", "Unfall mit Fahrzeugausfall", "Kapazitätsreduktion und Kostenrisiko", "Fahrzeugstatus und Ersatzplanung prüfen", "Unfälle", links().unfaelle);
    if (source.docs.filter((d) => ["abgelaufen", "fehlt"].includes(normalize(d.status))).length >= 2) add("wichtig", "Dokumente mehrerer Fahrer ungültig", "Einsatzfähigkeit eingeschränkt", "Dokumentenprüfung priorisieren", "Personal", links().dokumente);
    if (m.staffShortage >= 3) add("kritisch", "hoher Krankenstand", "Schichtabdeckung gefährdet", "Vertretungsvorschläge aktivieren", "Personal", links().schichtplanung);
    if (m.openShifts > 0) add("wichtig", "offene Schichten", "Kapazitätslücken in Spitzenzeiten", "Schichten neu besetzen", "Personal", links().schichtplanung);
    if (m.financeOpenCases >= 12) add("wichtig", "hoher Rückstand in Abrechnung", "Liquiditäts- und Abschlussrisiko", "Prüfcenter priorisieren", "Abrechnung", links().abrechnung);
    if (!source.financeUi || source.financeUi.monthClosed !== true) add("wichtig", "Monatsabschluss blockiert", "Managementbericht unvollständig", "Monatsabschluss-Checkliste durchgehen", "Buchhaltung", links().monat);

    const companyOpen = source.invoices.filter((i) => normalize(i.kind).includes("firma") && Number(i.open || 0) > 1000);
    if (companyOpen.length > 0) add("wichtig", "Firmenkunde mit hohem offenen Betrag", "Debitorenrisiko steigt", "Kundenkontakt und Zahlungsklärung", "Controlling", links().controlling);

    return out;
  }

  function recommendationRules(state, source) {
    const m = buildCoreMetrics(state, source);
    const recs = [];

    if ((m.freeVehicles / Math.max(1, source.vehicles.length)) < 0.2 && source.orders.filter((o) => o.status === "Wartet").length > 5 && m.waitAvg > 15) {
      recs.push({ title: "Zusaetzlichen Fahrer oder Reservefahrzeug aktivieren", basis: "R1: freie Fahrzeuge <20%, >5 wartende Auftraege, Wartezeit >15", link: "schichtplanung.html" });
    }

    const hasWheelchairPlanned = source.orders.some((o) => normalize(o.rideType).includes("rollstuhl") && ["Neu", "Bestaetigt", "Wartet"].includes(o.status));
    const hasFreeWheelchair = source.vehicles.some((v) => classifyVehicle(v).wheelchair && vehicleStatus(v) === "frei");
    if (hasWheelchairPlanned && !hasFreeWheelchair) {
      recs.push({ title: "Rollstuhlfahrzeug reservieren oder Zeitfenster neu planen", basis: "R2: Rollstuhlfahrt geplant, kein Rollstuhlfahrzeug frei", link: "live-dispo.html" });
    }

    const sickCount = source.employees.filter((e) => employeeStatus(e) === "krank").length;
    if (sickCount >= 2 && m.openShifts > 0) {
      recs.push({ title: "Vertretungsvorschlaege pruefen", basis: "R3: mehrere Krankmeldungen + offene Schichten", link: "abwesenheiten.html" });
    }

    return recs;
  }

  function timelineForPeriod(period, state, source) {
    const core = buildCoreMetrics(state, source);
    const periodFactor = period === "3h" ? 0.13 : period === "today" ? 1 : period === "tomorrow" ? 1.05 : period === "7d" ? 6.9 : 28.4;
    const weekdayFactor = demandFactorByWeekday(weekdayIndex(todayIso()));
    const weather = weatherFactor(state.filters.weather);
    const eventExtra = (state.events || []).reduce((s, e) => s + Number(e.extraRides || 0), 0) / (period === "today" ? 1 : period === "tomorrow" ? 1.2 : period === "7d" ? 6 : 20);

    const expected = Math.round((core.rideTotal + core.expectedExtra) * periodFactor * weekdayFactor * weather + eventExtra);
    const confirmed = Math.round(core.plannedRides * periodFactor + source.seriesList.length * 0.8);
    const spontaneous = Math.max(0, expected - confirmed);
    const drivers = Math.max(1, Math.round(core.driversOnDuty * (period === "3h" ? 0.9 : 1)));
    const vehicles = Math.max(1, Math.round(core.freeVehicles + core.onRoadVehicles * (period === "3h" ? 0.3 : 0.5)));
    const utilization = Math.round((expected / Math.max(1, Math.min(drivers, vehicles))) * 100);
    const gap = Math.max(0, expected - Math.min(drivers, vehicles));

    return {
      period,
      expected,
      confirmed,
      spontaneous,
      drivers,
      vehicles,
      utilization,
      gap,
      bottleneck: gap > 3 || utilization > 130 ? "kritisch" : gap > 0 || utilization > 105 ? "beobachten" : "stabil",
      reserveNeed: Math.max(0, gap)
    };
  }

  function forecastByType(period, state, source) {
    const summary = timelineForPeriod(period, state, source);
    const scale = summary.expected / Math.max(1, source.orders.length || 16);
    return RIDE_TYPES.map((type, idx) => {
      const base = source.orders.filter((o) => normalize(o.rideType).includes(normalize(type).slice(0, 6))).length || (idx % 4 === 0 ? 2 : 1);
      const expected = Math.max(0, Math.round(base * scale + (type === "Dialyse" && [1, 3, 5].includes(weekdayIndex(todayIso())) ? 2 : 0)));
      const booked = Math.max(0, Math.round(expected * (0.55 + (idx % 3) * 0.08)));
      const openCapacity = Math.max(0, summary.vehicles - expected);
      const neededVehicle = type === "Rollstuhlfahrt" ? "Rollstuhl" : type === "Flughafenfahrt" ? "Komfort" : type === "Schuelerfahrt" ? "Grossraum" : "Standard";
      const neededSkill = type === "Krankenfahrt" || type === "Dialyse" || type === "Chemo" || type === "Strahlentherapie" ? "Krankenfahrt" : type === "Rollstuhlfahrt" ? "Rollstuhlqualifikation" : "Standard";
      return { type, expected, booked, openCapacity, neededVehicle, neededSkill };
    });
  }

  function hourlyCurve(state, source) {
    const confirmedByHour = Array.from({ length: 24 }, () => 0);
    source.orders.forEach((o) => {
      const h = hourOf(o.time);
      confirmedByHour[h] += 1;
    });

    return Array.from({ length: 24 }, (_, h) => {
      const block = findBlockByHour(h);
      const blockIdx = TIME_BLOCKS.findIndex((b) => b.key === block.key);
      const expected = Math.round((confirmedByHour[h] + (blockIdx === 1 ? 3 : blockIdx === 2 ? 2 : 1)) * demandFactorByWeekday(weekdayIndex(todayIso())) * weatherFactor(state.filters.weather));
      const vehicles = Math.max(1, source.vehicles.filter((v) => ["frei", "unterwegs", "pause"].includes(vehicleStatus(v))).length - Math.max(0, blockIdx - 2));
      const drivers = Math.max(1, source.employees.filter((e) => ["dienst", "pause", "frei"].includes(employeeStatus(e))).length - Math.max(0, blockIdx - 2));
      const cap = Math.max(1, Math.min(vehicles, drivers));
      const critical = expected > cap;
      return {
        hour: `${String(h).padStart(2, "0")}:00`,
        expected,
        confirmed: confirmedByHour[h],
        vehicles,
        drivers,
        capacity: cap,
        critical,
        block: block.label,
        diff: expected - cap
      };
    });
  }

  function forecastQuality(state, source) {
    const now = timelineForPeriod(state.filters.period || "today", state, source);
    const actual = buildCoreMetrics(state, source).rideTotal;
    const deviation = now.expected - actual;
    const abs = Math.abs(deviation);
    const confidence = abs > actual * 0.35 ? "geringe Sicherheit" : abs > actual * 0.18 ? "mittlere Sicherheit" : "hohe Sicherheit";
    return {
      forecast: now.expected,
      actual,
      deviation,
      updatedAt: `${todayIso()} ${nowTime()}`,
      basis: "Wochentag, Uhrzeit, Serienfahrten, Krankentransporte, Ereignisse, Wetter-Demo, Werkstatt- und Personalstatus",
      confidence
    };
  }

  function capacityMatrix(state, source) {
    const timeline = todayTimeline(state, source);
    const wheelVehicles = source.vehicles.filter((v) => classifyVehicle(v).wheelchair && vehicleStatus(v) !== "werkstatt" && vehicleStatus(v) !== "gesperrt").length;
    const vanVehicles = source.vehicles.filter((v) => classifyVehicle(v).van && vehicleStatus(v) !== "werkstatt" && vehicleStatus(v) !== "gesperrt").length;
    const evVehicles = source.vehicles.filter((v) => classifyVehicle(v).elektro && vehicleStatus(v) !== "werkstatt" && vehicleStatus(v) !== "gesperrt").length;

    return timeline.map((t, i) => {
      const neededDrivers = t.planned + t.expectedExtra;
      const neededVehicles = Math.max(t.planned, Math.round((t.planned + t.expectedExtra) * 0.92));
      const availableDrivers = Math.max(0, t.driversAvail - (i > 3 ? 1 : 0));
      const availableVehicles = Math.max(0, t.vehiclesAvail - (i > 4 ? 1 : 0));
      const reserve = Math.max(0, Math.min(availableDrivers - neededDrivers, availableVehicles - neededVehicles));
      const gap = Math.max(0, neededDrivers - availableDrivers, neededVehicles - availableVehicles);
      return {
        block: t.block,
        neededDrivers,
        availableDrivers,
        neededVehicles,
        availableVehicles,
        wheelVehicles,
        vanVehicles,
        evVehicles,
        reserve,
        bottleneck: gap > 4 ? "kritisch" : gap > 1 ? "Engpass" : gap > 0 ? "beobachten" : "stabil",
        gap
      };
    });
  }

  function capacityGaps(state, source) {
    const matrix = capacityMatrix(state, source);
    return matrix
      .filter((m) => m.gap > 0)
      .map((m, idx) => ({
        id: `GAP-${idx + 1}`,
        period: m.block,
        missingDrivers: Math.max(0, m.neededDrivers - m.availableDrivers),
        missingVehicles: Math.max(0, m.neededVehicles - m.availableVehicles),
        neededType: m.wheelVehicles <= 0 ? "Rollstuhl" : m.vanVehicles <= 0 ? "Grossraum" : "Standard",
        affectedRides: Math.max(1, m.gap),
        priority: m.gap >= 4 ? "kritisch" : "wichtig",
        proposals: ["Schicht verschieben", "Reserve aktivieren", "Fahrzeugwechsel", "Fahrerwechsel", "Fahrt zeitlich verschieben", "Serienfahrt neu planen", "Pause verschieben", "Werkstattfreigabe pruefen", "Auftrag buendeln als Demo"]
      }));
  }

  function reserveOverview(state, source) {
    const freeDrivers = source.employees.filter((e) => employeeStatus(e) === "frei").map((e) => ({
      type: "freier Fahrer",
      name: `${e.firstName || ""} ${e.lastName || ""}`.trim() || e.employeeId,
      availableAt: "sofort",
      qualification: (e.qualifications || []).join(", ") || "Standard",
      vehicleClearance: e.preferredVehicleType || "Standard",
      restrictions: employeeStatus(e) === "krank" ? "nicht einsetzbar" : ""
    }));

    const lateDrivers = source.employees.filter((e) => normalize(e.todayShift || "").includes("13") || normalize(e.status).includes("frei")).slice(0, 5).map((e) => ({
      type: "spaeter Schichtbeginn",
      name: `${e.firstName || ""} ${e.lastName || ""}`.trim() || e.employeeId,
      availableAt: String(e.todayShift || "spaeter"),
      qualification: (e.qualifications || []).join(", ") || "Standard",
      vehicleClearance: e.preferredVehicleType || "Standard",
      restrictions: "vorher nicht verfuegbar"
    }));

    const reserveVehicles = source.vehicles.filter((v) => ["frei", "pause"].includes(vehicleStatus(v))).slice(0, 8).map((v) => ({
      type: "Reservefahrzeug",
      name: String(v.plate || v.id || "Fahrzeug"),
      availableAt: "sofort",
      qualification: classifyVehicle(v).wheelchair ? "Rollstuhl" : classifyVehicle(v).van ? "Grossraum" : "Standard",
      vehicleClearance: String(v.type || v.name || ""),
      restrictions: normalize(v.hint).includes("v18") ? "Qualitaetshinweis" : ""
    }));

    const demos = [
      { type: "Aushilfe", name: "Aushilfe Nord", availableAt: "in 45 Min", qualification: "Krankenfahrt", vehicleClearance: "Kombi", restrictions: "nur bis 18:00" },
      { type: "Springer", name: "Springer Team", availableAt: "in 30 Min", qualification: "Standard", vehicleClearance: "Flex", restrictions: "keine Nachtschicht" }
    ];

    return [...freeDrivers, ...lateDrivers, ...reserveVehicles, ...demos].slice(0, 20);
  }

  function addEvent(state, payload) {
    const row = {
      id: `ME-${Date.now()}`,
      title: String(payload.title || "Neues Ereignis"),
      category: String(payload.category || "Sonstiges"),
      date: String(payload.date || todayIso()),
      timeFrom: String(payload.timeFrom || "08:00"),
      timeTo: String(payload.timeTo || "10:00"),
      place: String(payload.place || "Germersheim"),
      impact: String(payload.impact || "mittlere Auswirkung"),
      extraRides: Number(payload.extraRides || 0),
      areas: String(payload.areas || ""),
      neededVehicles: Number(payload.neededVehicles || 0),
      neededDrivers: Number(payload.neededDrivers || 0),
      note: String(payload.note || ""),
      owner: String(payload.owner || "Disposition")
    };
    state.events.unshift(row);
    saveState(state);
    return row;
  }

  function addScenario(state, payload) {
    const row = {
      id: `SC-${Date.now()}`,
      name: String(payload.name || "Neues Szenario"),
      date: String(payload.date || todayIso()),
      period: String(payload.period || "today"),
      demandFactor: Number(payload.demandFactor || 1),
      availableDrivers: Number(payload.availableDrivers || 0),
      availableVehicles: Number(payload.availableVehicles || 0),
      failedVehicles: Number(payload.failedVehicles || 0),
      failedDrivers: Number(payload.failedDrivers || 0),
      specialTypes: String(payload.specialTypes || ""),
      reserve: Number(payload.reserve || 0),
      notes: String(payload.notes || ""),
      status: "empfohlen",
      result: {}
    };
    state.scenarios.unshift(row);
    saveState(state);
    return row;
  }

  function scenarioResult(state, source, scenario) {
    const base = timelineForPeriod(scenario.period || "today", state, source);
    const demand = Math.round(base.expected * Number(scenario.demandFactor || 1));
    const availableDrivers = Math.max(0, Number(scenario.availableDrivers || base.drivers) - Number(scenario.failedDrivers || 0));
    const availableVehicles = Math.max(0, Number(scenario.availableVehicles || base.vehicles) - Number(scenario.failedVehicles || 0));
    const capacity = Math.max(1, Math.min(availableDrivers, availableVehicles) + Number(scenario.reserve || 0));
    const gap = Math.max(0, demand - capacity);
    const wait = Math.max(6, Math.round(9 + gap * 1.5));
    const unserved = Math.max(0, Math.round(gap * 0.8));
    const addDrivers = Math.max(0, Math.ceil(gap));
    const addVehicles = Math.max(0, Math.ceil(gap * 0.8));
    const addSpecial = normalize(scenario.specialTypes).includes("rollstuhl") ? 1 : normalize(scenario.specialTypes).includes("grossraum") ? 1 : 0;
    const critical = TIME_BLOCKS.filter((b, idx) => idx >= 1 && idx <= 3).map((b) => b.label).slice(0, gap > 0 ? 2 : 1);

    const measures = [
      "Schichtanpassung vorbereiten",
      "Reserve aktivieren",
      "Serienfahrten in Peak neu zuweisen",
      "Telefonzentrale bei Bedarf verstaerken"
    ];

    return {
      expectedUtilization: Math.round((demand / Math.max(1, capacity)) * 100),
      capacityGap: gap,
      expectedWait: wait,
      unservedRides: unserved,
      neededExtraDrivers: addDrivers,
      neededExtraVehicles: addVehicles,
      neededSpecialVehicles: addSpecial,
      criticalWindows: critical,
      measures,
      demoRevenue: Math.round(demand * 42),
      demoCost: Math.round((capacity + addDrivers + addVehicles) * 27),
      risk: gap > 5 ? "hoch" : gap > 2 ? "mittel" : "niedrig"
    };
  }

  function evaluateScenarios(state) {
    const source = sourceSnapshot();
    state.scenarios = state.scenarios.map((s) => ({ ...s, result: scenarioResult(state, source, s) }));
    saveState(state);
    return state.scenarios;
  }

  function setScenarioStatus(state, id, status) {
    const row = state.scenarios.find((s) => s.id === id);
    if (!row) return null;
    row.status = status;
    saveState(state);
    return row;
  }

  function addGoal(state, payload) {
    const row = {
      id: `G-${Date.now()}`,
      title: String(payload.title || "Neues Ziel"),
      category: String(payload.category || "Betrieb"),
      description: String(payload.description || ""),
      period: String(payload.period || "Monat"),
      target: Number(payload.target || 0),
      current: Number(payload.current || 0),
      unit: String(payload.unit || ""),
      owner: String(payload.owner || "Geschaeftsleitung"),
      status: String(payload.status || "nicht gestartet"),
      priority: String(payload.priority || "normal"),
      measures: String(payload.measures || ""),
      comment: String(payload.comment || ""),
      updatedAt: nowIso()
    };
    state.goals.unshift(row);
    saveState(state);
    return row;
  }

  function goalProgress(goal) {
    const target = Number(goal.target || 0);
    const current = Number(goal.current || 0);
    if (!target) return 0;
    return Math.max(0, Math.min(200, Math.round((current / target) * 100)));
  }

  function addDecision(state, payload) {
    const row = {
      id: `D-${Date.now()}`,
      title: String(payload.title || "Neuer Entscheidungsfall"),
      situation: String(payload.situation || ""),
      target: String(payload.target || ""),
      options: [{
        id: `O-${Date.now()}`,
        label: String(payload.optionLabel || "Option A"),
        benefit: Number(payload.benefit || 5),
        risk: Number(payload.risk || 5),
        effort: Number(payload.effort || 5),
        duration: String(payload.duration || "2 Wochen"),
        staff: Number(payload.staff || 1),
        vehicles: Number(payload.vehicles || 0),
        capacityDelta: Number(payload.capacityDelta || 0),
        costDemo: Number(payload.costDemo || 0),
        revenueDemo: Number(payload.revenueDemo || 0)
      }],
      pros: String(payload.pros || ""),
      cons: String(payload.cons || ""),
      risks: String(payload.risks || ""),
      costDemo: Number(payload.costDemo || 0),
      benefitDemo: Number(payload.benefitDemo || 0),
      areas: String(payload.areas || "Betrieb"),
      owner: String(payload.owner || "Geschaeftsleitung"),
      dueDate: String(payload.dueDate || todayIso()),
      recommendation: String(payload.recommendation || "Weitere Pruefung"),
      status: String(payload.status || "Entwurf"),
      history: [{ at: nowIso(), by: "System", action: "erstellt", reason: "Demo-Eintrag" }]
    };
    state.decisions.unshift(row);
    saveState(state);
    return row;
  }

  function setDecisionStatus(state, id, status, by, reason) {
    const row = state.decisions.find((d) => d.id === id);
    if (!row) return null;
    row.status = status;
    row.history = Array.isArray(row.history) ? row.history : [];
    row.history.unshift({ at: nowIso(), by: by || "Admin", action: status, reason: reason || "Status geaendert" });
    saveState(state);
    return row;
  }

  function addManagementTask(state, payload) {
    const row = {
      id: `MT-${Date.now()}`,
      title: String(payload.title || "Neue Management-Aufgabe"),
      area: String(payload.area || "Betrieb"),
      priority: String(payload.priority || "normal"),
      owner: String(payload.owner || "Geschaeftsleitung"),
      dueDate: String(payload.dueDate || todayIso()),
      status: String(payload.status || "offen"),
      relation: String(payload.relation || ""),
      impact: String(payload.impact || ""),
      lastActivity: nowIso()
    };
    state.managementTasks.unshift(row);
    saveState(state);
    return row;
  }

  function setRecommendationStatus(state, id, status) {
    const row = state.recommendations.find((r) => r.id === id);
    if (!row) return null;
    row.status = status;
    saveState(state);
    return row;
  }

  function refreshRecommendations(state) {
    const source = sourceSnapshot();
    const generated = recommendationRules(state, source);
    const merged = generated.map((g, idx) => ({
      id: `R-${Date.now()}-${idx}`,
      title: g.title,
      reason: g.basis,
      basis: g.basis,
      status: "neu",
      owner: "Disposition",
      dueDate: todayIso(),
      link: g.link
    }));
    state.recommendations = [...merged, ...state.recommendations].slice(0, 24);
    saveState(state);
    return state.recommendations;
  }

  function setFavorite(state, name, enabled) {
    const set = new Set(state.favorites || []);
    if (enabled) set.add(name);
    else set.delete(name);
    state.favorites = [...set];
    saveState(state);
    return state.favorites;
  }

  function executiveReport(state, type, period) {
    const source = sourceSnapshot();
    const cards = metricCards(state, source);
    const status = managementStatus(state, source);
    const warnings = buildWarnings(state, source);
    const goals = state.goals.slice(0, 8).map((g) => ({
      title: g.title,
      status: g.status,
      progress: `${goalProgress(g)}%`
    }));
    const openDecisions = state.decisions.filter((d) => !["beschlossen", "abgelehnt", "umgesetzt"].includes(normalize(d.status))).length;

    return {
      title: type || "Managementbericht",
      period: period || state.filters.period,
      createdAt: `${todayIso()} ${nowTime()}`,
      createdBy: "Demo-System",
      summary: [
        `Gesamtstatus: ${status.status}`,
        `Offene Warnungen: ${warnings.length}`,
        `Offene Entscheidungen: ${openDecisions}`,
        `Top-Risiko: ${warnings[0] ? warnings[0].cause : "kein kritischer Hinweis"}`
      ],
      cards,
      risks: warnings.slice(0, 10),
      actions: status.actions,
      goals,
      approvals: {
        status: state.reportState.approved ? "freigegeben" : "Entwurf",
        by: state.reportState.approvedBy || "-"
      },
      notes: "Nur Demo-Bericht, nicht rechts- oder steuerrelevant."
    };
  }

  function approveReport(state, by) {
    state.reportState.approved = true;
    state.reportState.approvedBy = by || "Geschaeftsleitung";
    state.reportState.updatedAt = nowIso();
    saveState(state);
    return state.reportState;
  }

  window.AdminManagementDemo = {
    KEY,
    PERIODS,
    TIME_BLOCKS,
    RIDE_TYPES,
    MANAGEMENT_STATUSES,
    RECOMMENDATION_STATUSES,
    normalize,
    todayIso,
    nowTime,
    loadState,
    saveState,
    resetState,
    sourceSnapshot,
    metricCards,
    managementStatus,
    todayTimeline,
    buildWarnings,
    recommendationRules,
    timelineForPeriod,
    forecastByType,
    hourlyCurve,
    forecastQuality,
    capacityMatrix,
    capacityGaps,
    reserveOverview,
    addEvent,
    addScenario,
    scenarioResult,
    evaluateScenarios,
    setScenarioStatus,
    addGoal,
    goalProgress,
    addDecision,
    setDecisionStatus,
    addManagementTask,
    setRecommendationStatus,
    refreshRecommendations,
    setFavorite,
    executiveReport,
    approveReport
  };
})();
