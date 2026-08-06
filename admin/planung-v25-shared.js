(() => {
  const STORAGE_KEY = "adminV25PlanningCore";
  const CONTEXT_KEYS = {
    cockpit: "adminTerminCockpitV22Phase1",
    liveDispo: "adminLiveDispoV131",
    personnel: "adminV17PersonnelState",
    dispatch: "adminV22DispatchPlanner",
    bridge: "adminV22DispatchBridge"
  };

  const REGION_POINTS = {
    Betriebshof: { label: "Betriebshof", address: "Taxi Germersheim Betriebshof", lat: 49.2206, lng: 8.3664, region: "Germersheim" },
    Germersheim: { label: "Germersheim", address: "Germersheim", lat: 49.2236, lng: 8.3639, region: "Germersheim" },
    Sondernheim: { label: "Sondernheim", address: "Germersheim-Sondernheim", lat: 49.1972, lng: 8.3384, region: "Sondernheim" },
    Bellheim: { label: "Bellheim", address: "Bellheim", lat: 49.1984, lng: 8.2798, region: "Bellheim" },
    Lingenfeld: { label: "Lingenfeld", address: "Lingenfeld", lat: 49.251, lng: 8.3452, region: "Lingenfeld" },
    Speyer: { label: "Speyer", address: "Speyer", lat: 49.3173, lng: 8.4312, region: "Speyer" },
    Landau: { label: "Landau", address: "Landau in der Pfalz", lat: 49.198, lng: 8.116, region: "Landau" },
    Wörth: { label: "Wörth", address: "Wörth am Rhein", lat: 49.0486, lng: 8.2594, region: "Wörth" },
    Karlsruhe: { label: "Karlsruhe", address: "Karlsruhe", lat: 49.0069, lng: 8.4037, region: "Karlsruhe" },
    Schwetzingen: { label: "Schwetzingen", address: "Schwetzingen", lat: 49.3842, lng: 8.573, region: "Schwetzingen" },
    Mannheim: { label: "Mannheim", address: "Mannheim", lat: 49.4875, lng: 8.466, region: "Mannheim" },
    Ludwigshafen: { label: "Ludwigshafen", address: "Ludwigshafen am Rhein", lat: 49.4774, lng: 8.4452, region: "Ludwigshafen" },
    Heidelberg: { label: "Heidelberg", address: "Heidelberg", lat: 49.3988, lng: 8.6724, region: "Heidelberg" },
    "Frankfurt Flughafen": { label: "Frankfurt Flughafen", address: "Frankfurt Flughafen", lat: 50.0379, lng: 8.5622, region: "Frankfurt Flughafen" },
    "Karlsruhe/Baden-Baden Flughafen": { label: "Karlsruhe/Baden-Baden Flughafen", address: "Baden-Airpark", lat: 48.7794, lng: 8.0805, region: "Karlsruhe/Baden-Baden Flughafen" },
    "Stuttgart Flughafen": { label: "Stuttgart Flughafen", address: "Stuttgart Flughafen", lat: 48.6899, lng: 9.2219, region: "Stuttgart Flughafen" },
    "Klinikum Speyer": { label: "Klinikum Speyer", address: "Klinikum Speyer", lat: 49.3131, lng: 8.4377, region: "Speyer" },
    "Dialyse Speyer": { label: "Dialyse Speyer", address: "Dialysezentrum Südpfalz Speyer", lat: 49.3201, lng: 8.429, region: "Speyer" },
    "Onkologie Ludwigshafen": { label: "Onkologie Ludwigshafen", address: "Onkologie Ludwigshafen", lat: 49.4814, lng: 8.4413, region: "Ludwigshafen" },
    "Mannheim Hbf": { label: "Mannheim Hbf", address: "Mannheim Hauptbahnhof", lat: 49.4794, lng: 8.4696, region: "Mannheim" },
    "Schwetzingen Arztzentrum": { label: "Schwetzingen Arztzentrum", address: "Schwetzingen Arztzentrum", lat: 49.3838, lng: 8.5756, region: "Schwetzingen" }
  };

  const DRIVE_TIMES = {
    "Germersheim|Germersheim": { durationMin: 8, distanceKm: 4, safetyMin: 4, traffic: "leicht" },
    "Germersheim|Sondernheim": { durationMin: 10, distanceKm: 5, safetyMin: 4, traffic: "leicht" },
    "Germersheim|Bellheim": { durationMin: 16, distanceKm: 11, safetyMin: 5, traffic: "normal" },
    "Germersheim|Lingenfeld": { durationMin: 12, distanceKm: 7, safetyMin: 4, traffic: "leicht" },
    "Germersheim|Speyer": { durationMin: 28, distanceKm: 23, safetyMin: 7, traffic: "normal" },
    "Germersheim|Landau": { durationMin: 31, distanceKm: 28, safetyMin: 7, traffic: "normal" },
    "Germersheim|Wörth": { durationMin: 29, distanceKm: 24, safetyMin: 7, traffic: "normal" },
    "Germersheim|Karlsruhe": { durationMin: 42, distanceKm: 39, safetyMin: 9, traffic: "erhöht" },
    "Germersheim|Schwetzingen": { durationMin: 38, distanceKm: 34, safetyMin: 9, traffic: "erhöht" },
    "Germersheim|Mannheim": { durationMin: 43, distanceKm: 41, safetyMin: 10, traffic: "erhöht" },
    "Germersheim|Ludwigshafen": { durationMin: 47, distanceKm: 44, safetyMin: 10, traffic: "erhöht" },
    "Germersheim|Heidelberg": { durationMin: 52, distanceKm: 51, safetyMin: 10, traffic: "erhöht" },
    "Germersheim|Frankfurt Flughafen": { durationMin: 78, distanceKm: 118, safetyMin: 15, traffic: "fern" },
    "Germersheim|Karlsruhe/Baden-Baden Flughafen": { durationMin: 58, distanceKm: 64, safetyMin: 12, traffic: "fern" },
    "Germersheim|Stuttgart Flughafen": { durationMin: 103, distanceKm: 131, safetyMin: 18, traffic: "fern" },
    "Speyer|Karlsruhe": { durationMin: 36, distanceKm: 34, safetyMin: 8, traffic: "normal" },
    "Speyer|Mannheim": { durationMin: 26, distanceKm: 21, safetyMin: 7, traffic: "normal" },
    "Speyer|Ludwigshafen": { durationMin: 31, distanceKm: 26, safetyMin: 7, traffic: "normal" },
    "Speyer|Schwetzingen": { durationMin: 25, distanceKm: 18, safetyMin: 6, traffic: "normal" },
    "Karlsruhe|Frankfurt Flughafen": { durationMin: 96, distanceKm: 139, safetyMin: 18, traffic: "fern" },
    "Mannheim|Heidelberg": { durationMin: 21, distanceKm: 19, safetyMin: 6, traffic: "normal" }
  };

  const BUFFER_RULES = {
    defaultPickupMin: 5,
    medicalExtraMin: 10,
    wheelchairExtraMin: 15,
    airportExtraMin: 15,
    vanExtraMin: 10,
    unknownAddressExtraMin: 8,
    luggageExtraMin: 6,
    parkingExtraMin: 5,
    returnOpenExtraMin: 12,
    handoffMin: 5
  };

  const SCORE_WEIGHTS = {
    knownLocation: 10,
    shortApproach: 12,
    shortDeadhead: 12,
    enoughBuffer: 14,
    matchingQualification: 16,
    matchingVehicle: 16,
    inShift: 18,
    goodConnection: 12,
    fixedAssignment: 10,
    fewVehicleChanges: 10,
    longDeadhead: -12,
    tightBuffer: -14,
    afterShift: -22,
    openReturn: -12,
    pauseAffected: -14,
    unknownLocation: -10,
    secondVehicle: -7,
    possibleOverlap: -18,
    incompleteTerm: -24
  };

  function safeParse(raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalize(value) {
    return String(value || "")
      .toLocaleLowerCase("de-DE")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function todayIso() {
    return new Date().toISOString().slice(0, 10);
  }

  function nowStamp() {
    const d = new Date();
    return `${todayIso()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }

  function addMinutes(text, plus) {
    const base = toMinutes(text);
    const total = base + plus;
    const normalized = ((total % 1440) + 1440) % 1440;
    return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`;
  }

  function hasClockTime(value) {
    return /^\d{2}:\d{2}$/.test(String(value || ""));
  }

  function toMinutes(text) {
    if (!hasClockTime(text)) return 0;
    const [h, m] = String(text).split(":").map((value) => Number(value));
    return h * 60 + m;
  }

  function overlaps(aStart, aEnd, bStart, bEnd) {
    const a1 = toMinutes(aStart);
    const a2Base = toMinutes(aEnd);
    const b1Base = toMinutes(bStart);
    const b2Base = toMinutes(bEnd);
    const a2 = a2Base <= a1 ? a2Base + 1440 : a2Base;
    const b1 = b1Base < a1 ? b1Base + 1440 : b1Base;
    const b2 = b2Base <= b1Base ? b2Base + 1440 : b2Base;
    return a1 < b2 && b1 < a2;
  }

  function readContext() {
    return {
      cockpit: safeParse(localStorage.getItem(CONTEXT_KEYS.cockpit)) || {},
      liveDispo: safeParse(localStorage.getItem(CONTEXT_KEYS.liveDispo)) || {},
      personnel: safeParse(localStorage.getItem(CONTEXT_KEYS.personnel)) || {},
      dispatch: safeParse(localStorage.getItem(CONTEXT_KEYS.dispatch)) || {},
      bridge: safeParse(localStorage.getItem(CONTEXT_KEYS.bridge)) || {}
    };
  }

  function loadState() {
    const parsed = safeParse(localStorage.getItem(STORAGE_KEY)) || {};
    parsed.manualLocations = parsed.manualLocations && typeof parsed.manualLocations === "object" ? parsed.manualLocations : {};
    parsed.pajAssignments = parsed.pajAssignments && typeof parsed.pajAssignments === "object" ? parsed.pajAssignments : {};
    parsed.mapState = parsed.mapState && typeof parsed.mapState === "object" ? parsed.mapState : { open: false };
    parsed.history = Array.isArray(parsed.history) ? parsed.history : [];
    return parsed;
  }

  function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function resetState() {
    const fresh = { manualLocations: {}, pajAssignments: {}, mapState: { open: false }, history: [] };
    saveState(fresh);
    return fresh;
  }

  function identifyRegion(text) {
    const value = normalize(text).replace(/strasse|straße/g, "");
    const found = Object.keys(REGION_POINTS).find((key) => value.includes(normalize(key)) || normalize(REGION_POINTS[key].address).includes(value));
    return found || "Germersheim";
  }

  function createLocation(label, source, meta = {}) {
    const point = REGION_POINTS[label] || REGION_POINTS[identifyRegion(label)] || REGION_POINTS.Germersheim;
    return {
      label: meta.displayLabel || point.label,
      address: meta.address || point.address,
      lat: meta.lat || point.lat,
      lng: meta.lng || point.lng,
      source,
      timestamp: meta.timestamp || nowStamp(),
      accuracy: meta.accuracy || "Demo genau",
      updatedAt: meta.updatedAt || nowStamp(),
      validForPlanning: meta.validForPlanning !== false,
      region: point.region || label,
      metaLabel: meta.metaLabel || ""
    };
  }

  const DemoLocationProvider = {
    key: "demo",
    label: "DemoLocationProvider",
    getDriverLocation(driver, context, coreState) {
      const manual = coreState.manualLocations[`driver:${driver.employeeId}`];
      if (manual) return createLocation(manual.label, "manuell", { ...manual, displayLabel: `Manuell gesetzt: ${manual.label}` });
      if (driver.lastKnownStop) return createLocation(driver.lastKnownStop, "letzte Fahrt", { displayLabel: `Letzte Fahrt: ${driver.lastKnownStop}` });
      if (driver.plannedStart) return createLocation(driver.plannedStart, "geplanter Start", { displayLabel: `Geplanter Start: ${driver.plannedStart}` });
      return createLocation("Betriebshof", "Betriebshof", { displayLabel: "Betriebshof" });
    },
    getVehicleLocation(vehicle, context, coreState) {
      const manual = coreState.manualLocations[`vehicle:${vehicle.id}`];
      if (manual) return createLocation(manual.label, "manuell", { ...manual, displayLabel: `Manuell gesetzt: ${manual.label}` });
      if (vehicle.lastKnownStop) return createLocation(vehicle.lastKnownStop, "letzte Fahrt", { displayLabel: `Letzte Fahrt: ${vehicle.lastKnownStop}` });
      if (vehicle.demoGps && vehicle.demoGps.label) return createLocation(vehicle.demoGps.label, "aktuelle Demo-Position", { displayLabel: `GPS-Position vor 2 Minuten`, accuracy: vehicle.demoGps.accuracy || "Demo", updatedAt: vehicle.demoGps.updatedAt || nowStamp() });
      return createLocation("Betriebshof", "Betriebshof", { displayLabel: "Betriebshof" });
    }
  };

  const ManualLocationProvider = {
    key: "manual",
    label: "ManualLocationProvider",
    getDriverLocation(driver, context, coreState) {
      const manual = coreState.manualLocations[`driver:${driver.employeeId}`];
      return manual ? createLocation(manual.label, "manuell", { ...manual, displayLabel: `Manuell gesetzt: ${manual.label}` }) : DemoLocationProvider.getDriverLocation(driver, context, coreState);
    },
    getVehicleLocation(vehicle, context, coreState) {
      const manual = coreState.manualLocations[`vehicle:${vehicle.id}`];
      return manual ? createLocation(manual.label, "manuell", { ...manual, displayLabel: `Manuell gesetzt: ${manual.label}` }) : DemoLocationProvider.getVehicleLocation(vehicle, context, coreState);
    }
  };

  const PajLocationProvider = {
    key: "paj",
    label: "PajLocationProvider",
    getVehicleLocation(vehicle, context, coreState) {
      const assignment = coreState.pajAssignments[vehicle.id] || {};
      if (!assignment.connected || !assignment.lastPositionLabel) {
        return createLocation("Betriebshof", "unbekannt", { displayLabel: "Standort unbekannt", validForPlanning: false, accuracy: "Demo unklar" });
      }
      return createLocation(assignment.lastPositionLabel, "PAJ GPS später", {
        displayLabel: `GPS-Position vor 2 Minuten`,
        accuracy: assignment.accuracy || "Demo genau",
        updatedAt: assignment.lastUpdated || nowStamp(),
        timestamp: assignment.lastUpdated || nowStamp(),
        validForPlanning: true
      });
    }
  };

  const DemoRouteProvider = {
    key: "demo",
    label: "DemoRouteProvider",
    getRoute(startLocation, endLocation, meta = {}) {
      const startRegion = startLocation.region || identifyRegion(startLocation.address || startLocation.label || "Germersheim");
      const endRegion = endLocation.region || identifyRegion(endLocation.address || endLocation.label || "Germersheim");
      const directKey = `${startRegion}|${endRegion}`;
      const reverseKey = `${endRegion}|${startRegion}`;
      const rule = DRIVE_TIMES[directKey] || DRIVE_TIMES[reverseKey];
      const base = rule || { durationMin: 26, distanceKm: 18, safetyMin: 8, traffic: "standard", unknown: true };
      return {
        start: startLocation.label,
        target: endLocation.label,
        distanceKm: base.distanceKm,
        durationMin: base.durationMin,
        trafficDelayMin: base.safetyMin,
        estimatedArrival: meta.departureTime ? addMinutes(meta.departureTime, base.durationMin + base.safetyMin) : "",
        routeAvailable: true,
        routeUnclear: Boolean(base.unknown),
        calculatedAt: nowStamp(),
        estimated: true,
        traffic: base.traffic
      };
    }
  };

  const GoogleMapsRouteProvider = {
    key: "google-maps",
    label: "GoogleMapsRouteProvider",
    getRoute(startLocation, endLocation, meta = {}) {
      return {
        start: startLocation.label,
        target: endLocation.label,
        distanceKm: 0,
        durationMin: 0,
        trafficDelayMin: 0,
        estimatedArrival: meta.departureTime || "",
        routeAvailable: false,
        routeUnclear: true,
        calculatedAt: nowStamp(),
        estimated: false,
        providerNote: "Echte Google-Maps-Berechnung benötigt spätere API-Anbindung."
      };
    }
  };

  function getActiveProviders(coreState) {
    return {
      location: coreState.activeLocationProvider === "manual" ? ManualLocationProvider : DemoLocationProvider,
      vehicleLocation: coreState.activeLocationProvider === "paj" ? PajLocationProvider : coreState.activeLocationProvider === "manual" ? ManualLocationProvider : DemoLocationProvider,
      route: coreState.activeRouteProvider === "google-maps" ? GoogleMapsRouteProvider : DemoRouteProvider
    };
  }

  function buildAppointmentQuality(appointment) {
    const missing = [];
    const assumptions = [];
    if (!appointment.date) missing.push("Datum fehlt");
    if (!appointment.time || !hasClockTime(appointment.time)) {
      if (appointment.timeOpen) {
        assumptions.push("Uhrzeit offen");
      } else {
        missing.push("Uhrzeit unklar");
      }
    }
    if (!appointment.pickup) missing.push("Abholort fehlt");
    if (!appointment.destination) missing.push("Ziel fehlt");
    if (!appointment.vehicleRequirement) assumptions.push("Fahrzeuganforderung unklar");
    const status = missing.includes("Ziel fehlt") || missing.includes("Abholort fehlt")
      ? "nicht planbar"
      : missing.length
        ? "wichtige Angabe fehlt"
        : assumptions.length
          ? appointment.returnStatus === "offene Rückfahrt" ? "Rückfahrt offen" : "planbar mit Annahmen"
          : "vollständig planbar";
    return {
      status,
      known: [appointment.date ? "Datum" : "", appointment.time ? "Uhrzeit" : "", appointment.pickup ? "Abholort" : "", appointment.destination ? "Ziel" : ""].filter(Boolean),
      assumptions,
      missing
    };
  }

  function derivePickupBuffer(appointment, vehicle) {
    let buffer = BUFFER_RULES.defaultPickupMin;
    if (normalize(appointment.rideType).includes("kranken")) buffer += BUFFER_RULES.medicalExtraMin;
    if (appointment.wheelchair) buffer += BUFFER_RULES.wheelchairExtraMin;
    if (normalize(appointment.rideType).includes("flughafen")) buffer += BUFFER_RULES.airportExtraMin;
    if (vehicle && vehicle.seats >= 7) buffer += BUFFER_RULES.vanExtraMin;
    if (!appointment.pickup || normalize(appointment.pickup).includes("unbekannt")) buffer += BUFFER_RULES.unknownAddressExtraMin;
    if (appointment.persons > 2) buffer += BUFFER_RULES.luggageExtraMin;
    if (appointment.returnStatus === "offene Rückfahrt") buffer += BUFFER_RULES.returnOpenExtraMin;
    return buffer;
  }

  function getReturnStatus(appointment) {
    if (appointment.returnTime && hasClockTime(appointment.returnTime)) return "feste Rückfahrtzeit";
    if (appointment.returnTrip && appointment.returnStatus) return appointment.returnStatus;
    if (appointment.returnTrip) return "offene Rückfahrt";
    return "keine Rückfahrt";
  }

  function evaluateDriver(driver, appointment, context, coreState, chain = []) {
    const providers = getActiveProviders(coreState);
    const location = providers.location.getDriverLocation(driver, context, coreState);
    const appointmentLoc = createLocation(identifyRegion(appointment.pickup || "Germersheim"), "Termin", { address: appointment.pickup || "" });
    const quality = buildAppointmentQuality(appointment);
    const approach = providers.route.getRoute(location, appointmentLoc, { departureTime: driver.availableFrom || driver.shiftStart || "08:00" });
    const reasons = [];
    let tier = "geeignet";

    if (!driver.dayActive) {
      tier = "ungeeignet";
      reasons.push("Fahrer arbeitet am ausgewählten Tag nicht.");
    }
    if (driver.statusBlocked) {
      tier = "ungeeignet";
      reasons.push(driver.statusBlocked);
    }
    if (normalize(driver.fuehrerscheinStatus).includes("ung") || normalize(driver.fuehrerscheinStatus).includes("fehlt")) {
      tier = "ungeeignet";
      reasons.push("Führerschein ungültig.");
    }
    if (normalize(driver.taxischeinStatus).includes("ung") || normalize(driver.taxischeinStatus).includes("fehlt")) {
      tier = "ungeeignet";
      reasons.push("Taxischein ungültig.");
    }
    if (appointment.wheelchair && !driver.qualificationsNormalized.some((q) => q.includes("rollstuhl"))) {
      tier = tier === "ungeeignet" ? tier : "eingeschränkt geeignet";
      reasons.push("Keine Rollstuhlqualifikation.");
    }
    if (normalize(appointment.rideType).includes("kranken") && !driver.qualificationsNormalized.some((q) => q.includes("kranken") || q.includes("dialyse") || q.includes("chemo") || q.includes("strahlen"))) {
      tier = tier === "ungeeignet" ? tier : "eingeschränkt geeignet";
      reasons.push("Spezielle Krankenfahrt-Qualifikation fehlt.");
    }
    if (!location.validForPlanning) {
      tier = tier === "ungeeignet" ? tier : "eingeschränkt geeignet";
      reasons.push("Standort unbekannt.");
    } else {
      reasons.push(location.displayLabel || location.label || "Standort bekannt.");
    }
    if (approach.routeAvailable) {
      reasons.push(`Geschätzte Anfahrt ${approach.durationMin + approach.trafficDelayMin} Minuten.`);
    }
    if (quality.status === "nicht planbar") {
      tier = "ungeeignet";
      reasons.push("Termin ist nicht vollständig planbar.");
    } else if (quality.status !== "vollständig planbar") {
      tier = tier === "ungeeignet" ? tier : "eingeschränkt geeignet";
      reasons.push(`Terminstatus: ${quality.status}.`);
    }
    if (driver.nextFixedTime && appointment.time && hasClockTime(appointment.time) && toMinutes(driver.nextFixedTime) - toMinutes(appointment.time) < 40) {
      tier = tier === "ungeeignet" ? tier : "eingeschränkt geeignet";
      reasons.push("Folgefahrt kollidiert.");
    }
    if (appointment.time && hasClockTime(appointment.time) && driver.shiftStart && toMinutes(appointment.time) < toMinutes(driver.shiftStart)) {
      tier = "ungeeignet";
      reasons.push(`Schicht beginnt erst um ${driver.shiftStart} Uhr.`);
    }
    if (chain.length && chain[chain.length - 1].destinationLabel) {
      reasons.push(`Vorherige Fahrt endet in ${chain[chain.length - 1].destinationLabel}.`);
    }

    const labelMap = {
      "ungeeignet": "ungeeignet",
      "eingeschränkt geeignet": "eingeschränkt geeignet",
      "geeignet": location.validForPlanning && approach.durationMin <= 18 ? "sehr gut geeignet" : "geeignet"
    };

    return {
      tier: labelMap[tier] || tier,
      location,
      approach,
      reasons
    };
  }

  function evaluateVehicle(vehicle, appointment, coreState) {
    const providers = getActiveProviders(coreState);
    const location = providers.vehicleLocation.getVehicleLocation(vehicle, readContext(), coreState);
    const reasons = [];
    let tier = "geeignet";

    if (["Werkstatt", "Gesperrt"].includes(vehicle.status) || normalize(vehicle.workshopStatus).includes("werkstatt")) {
      tier = "ungeeignet";
      reasons.push("Fahrzeug ist in Werkstatt oder gesperrt.");
    }
    if (appointment.wheelchair && !vehicle.wheelchair) {
      tier = "ungeeignet";
      reasons.push("Rollstuhlfahrzeug erforderlich.");
    }
    if (appointment.persons > vehicle.seats) {
      tier = "ungeeignet";
      reasons.push("Zu wenige Sitzplätze.");
    }
    if (vehicle.status === "reserviert" || vehicle.status === "Pause") {
      tier = tier === "ungeeignet" ? tier : "eingeschränkt";
      reasons.push(`Fahrzeugstatus: ${vehicle.status}.`);
    }
    if (vehicle.serviceDueSoon) {
      tier = tier === "ungeeignet" ? tier : "eingeschränkt";
      reasons.push("Service bald fällig.");
    }
    if (vehicle.tuvDueSoon) {
      tier = tier === "ungeeignet" ? tier : "eingeschränkt";
      reasons.push("TÜV bald fällig.");
    }
    if (!location.validForPlanning) {
      tier = tier === "ungeeignet" ? tier : "eingeschränkt";
      reasons.push("Standort unbekannt.");
    } else {
      reasons.push(location.displayLabel || location.label || "Standort bekannt.");
    }

    const positive = vehicle.fixedDriver ? "bevorzugt" : tier === "geeignet" ? "geeignet" : tier;
    return { tier: positive, location, reasons };
  }

  function evaluateCombination(driver, vehicle, appointment, driverAssessment, vehicleAssessment, chain = [], variant = "balanced") {
    const reasons = [];
    let suitability = "Gute Alternative";
    let score = 0;

    if (driver.allowedVehicles.length && !driver.allowedVehicles.some((allowed) => normalize(vehicle.plate).includes(normalize(allowed)))) {
      reasons.push("Fahrer darf dieses Fahrzeug nicht fahren.");
      score -= 40;
    }
    if (driver.blockedVehicles.some((blocked) => normalize(vehicle.plate).includes(normalize(blocked)))) {
      reasons.push("Fahrzeug ist für diesen Fahrer gesperrt.");
      score -= 40;
    }
    if (driver.vehicle && normalize(driver.vehicle) !== normalize(vehicle.plate)) {
      reasons.push("Fahrer und Fahrzeug starten nicht gemeinsam.");
      score -= 14;
    }
    if (driver.fixedVehicle && normalize(driver.fixedVehicle) === normalize(vehicle.plate)) {
      reasons.push("Feste Fahrzeugzuweisung berücksichtigt.");
      score += SCORE_WEIGHTS.fixedAssignment;
    }
    if (driverAssessment.location.validForPlanning && vehicleAssessment.location.validForPlanning && normalize(driverAssessment.location.region) === normalize(vehicleAssessment.location.region)) {
      reasons.push("Fahrer und Fahrzeug befinden sich am gleichen Ausgangspunkt.");
      score += SCORE_WEIGHTS.knownLocation;
    }
    if (appointment.wheelchair && vehicle.wheelchair) {
      reasons.push("Passendes Rollstuhlfahrzeug.");
      score += SCORE_WEIGHTS.matchingVehicle;
    }
    if (driverAssessment.tier === "sehr gut geeignet") score += 18;
    if (driverAssessment.tier === "geeignet") score += 10;
    if (driverAssessment.tier === "eingeschränkt geeignet") score -= 4;
    if (driverAssessment.tier === "ungeeignet") score -= 60;
    if (vehicleAssessment.tier === "bevorzugt") score += 12;
    if (vehicleAssessment.tier === "geeignet") score += 8;
    if (vehicleAssessment.tier === "eingeschränkt") score -= 4;
    if (vehicleAssessment.tier === "ungeeignet") score -= 60;

    const previous = chain[chain.length - 1] || null;
    const previousLocation = previous ? previous.destinationLocation : vehicleAssessment.location;
    const routeToPickup = DemoRouteProvider.getRoute(previousLocation, createLocation(identifyRegion(appointment.pickup || "Germersheim"), "Termin", { address: appointment.pickup || "" }), { departureTime: previous ? previous.arrivalTime : driver.shiftStart });
    const tripRoute = DemoRouteProvider.getRoute(createLocation(identifyRegion(appointment.pickup || "Germersheim"), "Termin", { address: appointment.pickup || "" }), createLocation(identifyRegion(appointment.destination || "Germersheim"), "Termin", { address: appointment.destination || "" }), { departureTime: appointment.time });
    const pickupBuffer = derivePickupBuffer(appointment, vehicle);
    const availableFrom = previous ? addMinutes(previous.arrivalTime, previous.bufferMin) : (driver.shiftStart || appointment.time || "08:00");
    const estimatedArrival = addMinutes(availableFrom, routeToPickup.durationMin + routeToPickup.trafficDelayMin);
    const arrivalGap = hasClockTime(appointment.time) ? Math.max(0, toMinutes(appointment.time) - toMinutes(estimatedArrival)) : 0;
    const tripArrival = appointment.time && hasClockTime(appointment.time) ? addMinutes(appointment.time, tripRoute.durationMin + pickupBuffer) : "";

    if (arrivalGap >= 18) {
      reasons.push("Ausreichender Puffer.");
      score += SCORE_WEIGHTS.enoughBuffer;
    } else if (arrivalGap >= 6) {
      reasons.push("Ankunft knapp, aber realistisch.");
      score += 2;
      score += SCORE_WEIGHTS.tightBuffer / 3;
    } else {
      reasons.push("Knapper Puffer.");
      score += SCORE_WEIGHTS.tightBuffer;
    }

    if (routeToPickup.durationMin <= 10) {
      reasons.push("Kurze Anfahrt.");
      score += SCORE_WEIGHTS.shortApproach;
    } else if (routeToPickup.durationMin >= 30) {
      reasons.push("Lange Leerfahrt.");
      score += SCORE_WEIGHTS.longDeadhead;
    }

    if (previous) {
      if (routeToPickup.durationMin <= 12) {
        reasons.push(`Sehr guter Anschluss: Ziel ${previous.destinationLabel}, nächste Abholung ebenfalls nahebei, ${arrivalGap} Minuten Puffer.`);
        score += SCORE_WEIGHTS.goodConnection;
      } else {
        reasons.push(`Mögliche nächste Fahrt mit ${routeToPickup.durationMin} Minuten Leerfahrt.`);
      }
    }

    const returnStatus = getReturnStatus(appointment);
    if (returnStatus === "offene Rückfahrt" || returnStatus === "Rückruf erforderlich") {
      reasons.push("Offene Rückfahrt kann Anschlussfahrt gefährden.");
      score += SCORE_WEIGHTS.openReturn;
    }

    if (driver.pauseStart && overlaps(driver.pauseStart, driver.pauseEnd || driver.pauseStart, appointment.time || "00:00", tripArrival || appointment.time || "00:00")) {
      reasons.push("Pause betroffen.");
      score += SCORE_WEIGHTS.pauseAffected;
    }

    if (tripArrival && driver.shiftEnd && overlaps(driver.shiftEnd, addMinutes(driver.shiftEnd, 1), tripArrival, addMinutes(tripArrival, 1))) {
      reasons.push("Fahrt endet nach Schichtende.");
      score += SCORE_WEIGHTS.afterShift;
    }

    if (!appointment.quality || appointment.quality.status !== "vollständig planbar") {
      score += SCORE_WEIGHTS.incompleteTerm;
      reasons.push(`Terminstatus: ${appointment.quality ? appointment.quality.status : "planbar mit Annahmen"}.`);
    }

    if (variant === "empty") score += driver.vehicle && normalize(driver.vehicle) === normalize(vehicle.plate) ? 4 : -2;
    if (variant === "punctual") score += arrivalGap >= 20 ? 8 : -3;
    if (variant === "fewChanges") score += driver.fixedVehicle && normalize(driver.fixedVehicle) === normalize(vehicle.plate) ? SCORE_WEIGHTS.fewVehicleChanges : -5;

    if (score >= 45) suitability = "Beste Wahl";
    else if (score >= 20) suitability = "Gute Alternative";
    else suitability = "Mit Risiko";

    return {
      score,
      suitability,
      reasons,
      routeToPickup,
      tripRoute,
      estimatedArrival,
      tripArrival,
      pickupBuffer,
      arrivalGap,
      previousTrip: previous ? previous.label : "keine vorherige Fahrt",
      nextTripHint: "nach Folgetermin prüfen",
      deadheadMin: routeToPickup.durationMin,
      deadheadKm: routeToPickup.distanceKm,
      affectsOpenReturn: returnStatus === "offene Rückfahrt" || returnStatus === "Rückruf erforderlich"
    };
  }

  function loadArchitecture(dateIso, external = {}) {
    const context = readContext();
    const coreState = { ...loadState(), ...external };
    const cockpit = context.cockpit || {};
    const personnel = context.personnel || {};
    const liveDispo = context.liveDispo || {};
    const dispatch = context.dispatch || {};
    const bridge = context.bridge || {};

    const appointments = (Array.isArray(cockpit.appointments) ? cockpit.appointments : [])
      .filter((entry) => (entry.date || dateIso) === dateIso)
      .map((entry) => ({
        id: entry.id,
        customer: entry.name || entry.customer || "Termin",
        date: entry.date || dateIso,
        time: entry.time || "",
        pickup: entry.pickup || "",
        destination: entry.destination || "",
        rideType: entry.rideType || (entry.medical ? "Krankenfahrt" : "Taxi"),
        returnTrip: Boolean(entry.returnTrip),
        returnTime: entry.returnTime || "",
        returnStatus: entry.returnTripStatus || (entry.returnTrip ? "offene Rückfahrt" : "keine Rückfahrt"),
        wheelchair: Boolean(entry.wheelchair),
        persons: Number(entry.persons || 1),
        phone: entry.phone || "",
        note: entry.note || "",
        sourceDraftId: entry.sourceDraftId || "",
        status: entry.status || "Noch ungeplant",
        quality: null,
        vehicleRequirement: entry.wheelchair ? "Rollstuhl" : Number(entry.persons || 1) > 4 ? "Großraum" : "Standard"
      }))
      .map((entry) => ({ ...entry, quality: buildAppointmentQuality(entry) }));

    const dispatchMap = new Map((Array.isArray(dispatch.tomorrowPlan) ? dispatch.tomorrowPlan : []).map((row) => [row.employeeId, row]));
    const bridgeMap = new Map((Array.isArray(bridge.plannedDrivers) ? bridge.plannedDrivers : []).map((row) => [row.employeeId, row]));

    const drivers = (Array.isArray(personnel.employees) ? personnel.employees : [])
      .filter((entry) => entry.role === "Fahrer")
      .map((entry) => {
        const dispatchRow = dispatchMap.get(entry.id);
        const bridgeRow = bridgeMap.get(entry.id);
        const lastKnownStop = (entry.profileNote || "").includes("Klinik") ? "Klinikum Speyer" : entry.activeVehicle && entry.activeVehicle !== "-" ? "Betriebshof" : "Betriebshof";
        return {
          employeeId: entry.id,
          name: `${entry.firstName || ""} ${entry.lastName || ""}`.trim(),
          employmentType: entry.employmentType || "Vollzeit",
          dayActive: Boolean(dispatchRow ? dispatchRow.active : bridgeRow ? true : !["Urlaub", "krank", "gesperrt", "Dokument ungueltig"].includes(entry.status)),
          shiftStart: dispatchRow && dispatchRow.start ? dispatchRow.start : bridgeRow && bridgeRow.shiftStart ? bridgeRow.shiftStart : "08:00",
          shiftEnd: dispatchRow && dispatchRow.end ? dispatchRow.end : bridgeRow && bridgeRow.shiftEnd ? bridgeRow.shiftEnd : "16:00",
          pauseStart: dispatchRow && dispatchRow.pauseStart ? dispatchRow.pauseStart : "",
          pauseEnd: dispatchRow && dispatchRow.pauseEnd ? dispatchRow.pauseEnd : "",
          status: entry.status,
          statusBlocked: ["Urlaub", "krank", "gesperrt", "Dokument ungueltig"].includes(entry.status) ? `Fahrer ist ${entry.status}.` : "",
          fuehrerscheinStatus: entry.licenseValidUntil ? (new Date(entry.licenseValidUntil) < new Date(todayIso()) ? "ungültig" : "gültig") : "fehlt",
          taxischeinStatus: entry.pPermit === "Ja" ? (entry.pPermitValidUntil && new Date(entry.pPermitValidUntil) < new Date(todayIso()) ? "ungültig" : "gültig") : "fehlt",
          qualifications: Array.isArray(entry.qualifications) ? entry.qualifications : [],
          qualificationsNormalized: Array.isArray(entry.qualifications) ? entry.qualifications.map((item) => normalize(item)) : [],
          fixedVehicle: entry.fixedVehicle || "",
          preferredVehicle: entry.preferredVehicle || entry.preferredVehicleType || "",
          vehicle: dispatchRow && dispatchRow.vehicle ? dispatchRow.vehicle : bridgeRow && bridgeRow.vehicle ? bridgeRow.vehicle : entry.activeVehicle || "",
          allowedVehicles: Array.isArray(entry.allowedVehicles) ? entry.allowedVehicles : [],
          blockedVehicles: Array.isArray(entry.blockedVehicles) ? entry.blockedVehicles : [],
          lastKnownStop,
          plannedStart: entry.location || "Betriebshof",
          nextFixedTime: dispatchRow && dispatchRow.start ? dispatchRow.start : "",
          workloadCount: 0
        };
      });

    const pajAssignments = coreState.pajAssignments || {};
    const vehicles = (Array.isArray(liveDispo.vehicles) ? liveDispo.vehicles : []).map((entry, index) => {
      const paj = pajAssignments[entry.id] || {};
      const status = entry.status || "Frei";
      return {
        id: entry.id || `VEH-${index}`,
        name: entry.name || entry.plate || `Fahrzeug ${index + 1}`,
        plate: entry.plate || entry.name || `GER TX ${100 + index}`,
        status,
        workshopStatus: normalize(status).includes("werkstatt") ? "Werkstatt" : normalize(status).includes("gesperrt") ? "Gesperrt" : normalize(status).includes("pause") ? "Pause" : normalize(status).includes("unterwegs") ? "unterwegs" : "verfügbar",
        seats: Number(entry.seats || 4),
        wheelchair: Boolean(entry.wheelchair),
        reachDemo: entry.wheelchair ? "hoch" : "mittel",
        batteryDemo: `${75 - index * 6}%`,
        fuelDemo: `${82 - index * 5}%`,
        currentDriverId: entry.driverId || "",
        fixedDriver: entry.driverId || "",
        nextWorkshop: entry.nextService || "keine Angabe",
        tuvHint: entry.tuv || "keine Angabe",
        serviceDueSoon: String(entry.nextService || "").toLowerCase().includes("heute"),
        tuvDueSoon: false,
        lastKnownStop: entry.currentOrderId ? "Letzte Fahrt" : "Betriebshof",
        demoGps: { label: entry.currentOrderId ? "Speyer" : "Germersheim", accuracy: "Demo genau", updatedAt: nowStamp() },
        pajDeviceId: paj.deviceId || `PAJ-${index + 101}`,
        pajVehicleName: paj.vehicleName || entry.plate || entry.name,
        pajConnected: Boolean(paj.connected),
        pajLastPosition: paj.lastPositionLabel || (entry.currentOrderId ? "GPS-Position vor 2 Minuten" : "Standort unbekannt"),
        pajLastUpdated: paj.lastUpdated || nowStamp(),
        pajSpeed: paj.speed || `${10 + index * 5} km/h`,
        pajMovementStatus: paj.movementStatus || (normalize(status).includes("unterwegs") ? "in Bewegung" : "steht"),
        pajGpsOnline: Boolean(paj.connected),
        ignitionLater: paj.ignitionLater || "später optional",
        signalLater: paj.signalLater || "später optional"
      };
    });

    return {
      context,
      coreState,
      providers: getActiveProviders(coreState),
      appointments,
      drivers,
      vehicles,
      locks: external.locks || {},
      conflicts: [],
      suggestions: [],
      plans: []
    };
  }

  function createHistoryEntry(type, text) {
    return { id: `HIS-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, at: nowStamp(), type, text };
  }

  function setManualLocation(state, targetKey, payload) {
    state.manualLocations[targetKey] = { ...payload, updatedAt: nowStamp(), timestamp: nowStamp() };
    state.history.unshift(createHistoryEntry("Standort", `${targetKey} manuell auf ${payload.label} gesetzt`));
    saveState(state);
  }

  function assignPajTracker(state, vehicleId, payload) {
    state.pajAssignments[vehicleId] = {
      deviceId: payload.deviceId,
      vehicleName: payload.vehicleName,
      connected: Boolean(payload.connected),
      lastPositionLabel: payload.lastPositionLabel,
      lastUpdated: nowStamp(),
      speed: payload.speed || "0 km/h",
      movementStatus: payload.movementStatus || "steht",
      accuracy: payload.accuracy || "Demo genau",
      ignitionLater: payload.ignitionLater || "später optional",
      signalLater: payload.signalLater || "später optional"
    };
    state.history.unshift(createHistoryEntry("PAJ", `Tracker ${payload.deviceId} zugeordnet`));
    saveState(state);
  }

  window.AdminPlanningDemoV25 = {
    STORAGE_KEY,
    CONTEXT_KEYS,
    REGION_POINTS,
    DRIVE_TIMES,
    BUFFER_RULES,
    SCORE_WEIGHTS,
    DemoLocationProvider,
    ManualLocationProvider,
    PajLocationProvider,
    DemoRouteProvider,
    GoogleMapsRouteProvider,
    normalize,
    todayIso,
    nowStamp,
    addMinutes,
    hasClockTime,
    toMinutes,
    overlaps,
    readContext,
    loadState,
    saveState,
    resetState,
    createLocation,
    identifyRegion,
    buildAppointmentQuality,
    derivePickupBuffer,
    getReturnStatus,
    evaluateDriver,
    evaluateVehicle,
    evaluateCombination,
    loadArchitecture,
    createHistoryEntry,
    setManualLocation,
    assignPajTracker
  };
})();
