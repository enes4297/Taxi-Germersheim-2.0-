(() => {
  const P = window.AdminPersonnelDemo;
  const S = window.AdminSystemCenter || {};
  const V25 = window.AdminPlanningDemoV25;
  const STORAGE_KEY = "adminV23DayPlanning";
  const COCKPIT_KEY = "adminTerminCockpitV22Phase1";
  const LIVE_DISPO_KEY = "adminLiveDispoV131";

  const SHIFT_TEMPLATES = [
    { id: "early", name: "Frühschicht", start: "06:00", end: "14:00" },
    { id: "day", name: "Tagschicht", start: "08:00", end: "16:00" },
    { id: "late", name: "Spätschicht", start: "14:00", end: "22:00" },
    { id: "night", name: "Nachtschicht", start: "22:00", end: "06:00" },
    { id: "split", name: "Geteilte Schicht", start: "06:00", end: "11:00" },
    { id: "flex", name: "Flexibel", start: "09:00", end: "17:00" },
    { id: "custom", name: "Individuell", start: "08:00", end: "16:00" }
  ];

  const state = {
    personnel: null,
    selectedDate: "",
    selectedShortcut: "tomorrow",
    selectedVariant: "balanced",
    appointmentFilter: "alle",
    selectedDrivers: new Set(),
    mobileTab: "appointments",
    planning: null,
    mapOpen: false,
    coreState: null,
    uiMode: "day",
    previousDate: "",
    tomorrowFilter: "alle",
    tomorrowAssignOpenId: "",
    tomorrowPrepared: [],
    tomorrowMessages: {}
  };

  function safeParse(raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function loadUiState() {
    const parsed = safeParse(localStorage.getItem(STORAGE_KEY)) || {};
    parsed.days = parsed.days && typeof parsed.days === "object" ? parsed.days : {};
    return parsed;
  }

  function saveUiState(store) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }

  function getDayState(dateIso) {
    const store = loadUiState();
    const existing = store.days[dateIso] || {};
    return {
      variant: existing.variant || "balanced",
      appointmentFilter: existing.appointmentFilter || "alle",
      locks: existing.locks || {},
      selectedDriverIds: Array.isArray(existing.selectedDriverIds) ? existing.selectedDriverIds : [],
      manualBlocks: Array.isArray(existing.manualBlocks) ? existing.manualBlocks : [],
      avisierung: existing.avisierung || {},
      routeMapOpen: Boolean(existing.routeMapOpen),
      confirmed: Boolean(existing.confirmed),
      needsReview: Boolean(existing.needsReview),
      history: Array.isArray(existing.history) ? existing.history : []
    };
  }

  function persistDayState(dateIso, patch) {
    const store = loadUiState();
    const current = getDayState(dateIso);
    store.days[dateIso] = { ...current, ...patch };
    saveUiState(store);
  }

  function labelText(key) {
    if (key === "empty") return "Wenig Leerfahrt";
    if (key === "punctual") return "Maximale Pünktlichkeit";
    if (key === "fewChanges") return "Wenig Fahrzeugwechsel";
    return "Ausgeglichen";
  }

  function todayIso() {
    return V25.todayIso();
  }

  function addDaysIso(baseIso, plus) {
    const d = new Date(`${baseIso}T00:00:00`);
    d.setDate(d.getDate() + plus);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function tomorrowIso() {
    return addDaysIso(todayIso(), 1);
  }

  function formatDate(iso) {
    if (S.formatDate) return S.formatDate(iso);
    const d = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(d.getTime())) return iso;
    return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
  }

  function nowTime() {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  }

  function minutes(text) {
    return V25.toMinutes(String(text || "00:00"));
  }

  function employmentLabel(type) {
    if (["Minijob", "Aushilfe", "Springer"].includes(type)) return "Minijob";
    return "Festangestellt";
  }

  function shiftRange(row, emp) {
    const fromEmployee = String(emp.todayShift || "").match(/^(\d{2}:\d{2})-(\d{2}:\d{2})$/);
    if (fromEmployee) return { start: fromEmployee[1], end: fromEmployee[2] };
    const byDriver = row && row.shiftStart && row.shiftEnd ? { start: row.shiftStart, end: row.shiftEnd } : null;
    if (byDriver) return byDriver;
    return { start: "", end: "" };
  }

  function isWithinShift(time, start, end) {
    if (!time || !start || !end) return false;
    const t = minutes(time);
    const s = minutes(start);
    const eRaw = minutes(end);
    const e = eRaw <= s ? eRaw + 1440 : eRaw;
    const tNorm = t < s ? t + 1440 : t;
    return tNorm >= s && tNorm <= e;
  }

  function shiftHasEnded(current, start, end) {
    if (!start || !end) return true;
    const c = minutes(current);
    const s = minutes(start);
    const eRaw = minutes(end);
    if (eRaw <= s) {
      return c > eRaw && c < s;
    }
    return c > eRaw;
  }

  function shiftHasStarted(current, start) {
    if (!start) return false;
    return minutes(current) >= minutes(start);
  }

  function getTodayRidesByEmployee() {
    const map = {};
    const today = todayIso();
    const payload = safeParse(localStorage.getItem(COCKPIT_KEY)) || {};
    const appointments = Array.isArray(payload.appointments) ? payload.appointments : [];
    const byName = {};
    (state.personnel.employees || []).forEach((emp) => {
      byName[V25.normalize(`${emp.firstName || ""} ${emp.lastName || ""}`.trim())] = emp.id;
    });
    appointments
      .filter((row) => row.date === today && row.driverName)
      .forEach((row) => {
        const employeeId = row.driverId || byName[V25.normalize(row.driverName)] || "";
        if (!employeeId) return;
        map[employeeId] = map[employeeId] || [];
        const end = row.endTime || V25.addMinutes(row.time || "00:00", 45);
        map[employeeId].push({
          id: row.id,
          time: row.time || "",
          end,
          label: `${row.time || "--:--"} ${row.name || row.customer || "Fahrt"}`
        });
      });

    Object.values(map).forEach((rides) => rides.sort((a, b) => String(a.time || "").localeCompare(String(b.time || ""), "de")));
    return map;
  }

  function serviceStatusClass(label) {
    if (label === "Verfügbar") return "is-green";
    if (label === "Pause" || label === "Beginnt später") return "is-yellow";
    if (label === "Auf Fahrt") return "is-blue";
    if (["Krank", "Abwesend", "Gesperrt"].includes(label)) return "is-red";
    return "is-gray";
  }

  function buildServiceRows() {
    const current = nowTime();
    const today = todayIso();
    const ridesByEmployee = getTodayRidesByEmployee();

    return (state.personnel.employees || [])
      .filter((emp) => emp.role === "Fahrer")
      .map((emp) => {
        const driver = state.planning.drivers.find((row) => row.employeeId === emp.id) || null;
        const shift = shiftRange(driver, emp);
        const hasShift = Boolean(shift.start && shift.end);
        const started = hasShift && shiftHasStarted(current, shift.start);
        const ended = hasShift && shiftHasEnded(current, shift.start, shift.end);

        const normalizedStatus = V25.normalize(emp.status);
        const isSick = normalizedStatus.includes("krank");
        const isVacation = normalizedStatus.includes("urlaub")
          || state.personnel.vacations.some((v) => v.employeeId === emp.id && ["genehmigt", "teilweise genehmigt"].includes(v.status) && today >= v.start && today <= v.end);
        const hasAbsence = state.personnel.absences.some((a) => a.employeeId === emp.id && !["abgeschlossen", "Abgelehnt"].includes(a.status) && today >= a.start && today <= a.expectedEnd);
        const isBlocked = normalizedStatus.includes("gesperrt") || normalizedStatus.includes("dokument ungueltig") || normalizedStatus.includes("dokument ungultig") || normalizedStatus.includes("nicht verfuegbar") || normalizedStatus.includes("nicht verfugbar");
        const isManualOffDuty = normalizedStatus === "frei";
        const onPause = V25.normalize(emp.status).includes("pause") || V25.normalize(driver && driver.status).includes("pause");

        const rides = ridesByEmployee[emp.id] || [];
        const currentRide = rides.find((ride) => isWithinShift(current, ride.time, ride.end)) || null;
        const nextRide = rides.find((ride) => minutes(ride.time) > minutes(current)) || null;
        const lastRide = rides.filter((ride) => minutes(ride.end) <= minutes(current)).slice(-1)[0] || null;

        const availableForDispatch = hasShift && started && !ended && !isSick && !isVacation && !hasAbsence && !isBlocked && !currentRide && !isManualOffDuty;

        let status = "Feierabend";
        if (isSick) status = "Krank";
        else if (isVacation) status = "Urlaub";
        else if (isManualOffDuty) status = "Feierabend";
        else if (isBlocked) status = "Gesperrt";
        else if (hasAbsence) status = "Abwesend";
        else if (!hasShift || ended) status = "Feierabend";
        else if (!started) status = "Beginnt später";
        else if (currentRide) status = "Auf Fahrt";
        else if (onPause) status = "Pause";
        else status = "Verfügbar";

        let availabilityHint = "";
        if (status === "Verfügbar") {
          availabilityHint = `Verfügbar seit ${lastRide ? lastRide.end : shift.start} Uhr`;
        } else if (status === "Auf Fahrt") {
          availabilityHint = `Voraussichtlich frei ab ${currentRide ? currentRide.end : "offen"} Uhr`;
        } else if (status === "Beginnt später") {
          availabilityHint = `Dienstbeginn ${shift.start} Uhr`;
        }

        const warnings = [];
        const permitDays = emp.pPermitValidUntil ? P.daysUntil(emp.pPermitValidUntil) : 9999;
        if (permitDays >= 0 && permitDays <= 30) warnings.push("Personenbeförderungsschein läuft bald ab");
        if (permitDays < 0) warnings.push("Personenbeförderungsschein abgelaufen");
        if (!emp.activeVehicle || emp.activeVehicle === "-") warnings.push("Kein Fahrzeug zugewiesen");
        if (status === "Beginnt später" || status === "Feierabend") warnings.push("Fahrer außerhalb seiner Schicht");
        if (hasAbsence && hasShift) warnings.push("Abwesenheitskonflikt");
        const sortedRides = [...rides].sort((a, b) => minutes(a.time) - minutes(b.time));
        const hasRideOverlap = sortedRides.some((ride, index) => {
          if (index === 0) return false;
          const prev = sortedRides[index - 1];
          return minutes(ride.time) < minutes(prev.end);
        });
        if (hasRideOverlap) warnings.push("Schichtkonflikt");

        return {
          employeeId: emp.id,
          name: `${emp.firstName} ${emp.lastName}`,
          employment: employmentLabel(emp.employmentType),
          shift,
          status,
          statusClass: serviceStatusClass(status),
          vehicle: emp.activeVehicle || "-",
          currentRide: currentRide ? currentRide.label : "-",
          nextRide: nextRide ? nextRide.label : "-",
          qualifications: Array.isArray(emp.qualifications) && emp.qualifications.length ? emp.qualifications : ["-"] ,
          availabilityHint,
          availableForDispatch,
          warnings
        };
      });
  }

  function renderServiceArea() {
    const kpiNode = document.querySelector("[data-tp-service-kpis]");
    const listNode = document.querySelector("[data-tp-service-list]");
    if (!kpiNode || !listNode) return;

    const rows = buildServiceRows();
    const kpis = {
      "Im Dienst": rows.filter((row) => ["Verfügbar", "Auf Fahrt", "Pause"].includes(row.status)).length,
      "Verfügbar": rows.filter((row) => row.status === "Verfügbar").length,
      "Auf Fahrt": rows.filter((row) => row.status === "Auf Fahrt").length,
      "Pause": rows.filter((row) => row.status === "Pause").length,
      "Beginnt später": rows.filter((row) => row.status === "Beginnt später").length,
      "Abwesend": rows.filter((row) => ["Abwesend", "Krank", "Urlaub", "Gesperrt"].includes(row.status)).length
    };

    kpiNode.innerHTML = Object.entries(kpis).map(([label, value]) => `<article class="tp-service-kpi"><small>${label}</small><strong>${value}</strong></article>`).join("");

    if (!rows.length) {
      listNode.innerHTML = '<p class="m-note">Keine Fahrer im Personalbestand vorhanden.</p>';
      return;
    }

    listNode.innerHTML = rows.map((row) => {
      const warningText = row.warnings.slice(0, 3).map((warning) => `<span class="tp-service-chip">${warning}</span>`).join("");
      const qualificationText = row.qualifications.join(", ");
      return `
        <article class="tp-service-row">
          <div class="tp-service-head">
            <strong>${row.name}</strong>
            <span class="tp-service-chip">${row.employment}</span>
            <span class="tp-service-chip">${row.shift.start && row.shift.end ? `${row.shift.start}–${row.shift.end} Uhr` : "Keine Schicht"}</span>
            <span class="tp-service-status ${row.statusClass}">${row.status}</span>
          </div>
          <div class="tp-service-meta">
            <span>Fahrzeug: ${row.vehicle}</span>
            <span>Aktuelle Fahrt: ${row.currentRide}</span>
            <span>Nächste Fahrt: ${row.nextRide}</span>
            <span>Qualifikationen: ${qualificationText}</span>
            <span>${row.availabilityHint || ""}</span>
          </div>
          <div class="tp-service-actions">
            <button type="button" data-tp-service-action="vehicle" data-employee-id="${row.employeeId}">🚕 Fahrzeug</button>
            <button type="button" data-tp-service-action="shift" data-employee-id="${row.employeeId}">🕒 Schicht</button>
            <button type="button" data-tp-service-action="pause" data-employee-id="${row.employeeId}">☕ Pause</button>
            <button type="button" data-tp-service-action="available" data-employee-id="${row.employeeId}">✅ Verfügbar</button>
            <button type="button" data-tp-service-action="finish" data-employee-id="${row.employeeId}">🌙 Feierabend</button>
            <button type="button" data-tp-service-action="details" data-employee-id="${row.employeeId}">ℹ Details</button>
          </div>
          ${warningText ? `<div class="tp-service-warnings">${warningText}</div>` : ""}
        </article>
      `;
    }).join("");
  }

  function requiredQualificationsForAppointment(appointment) {
    const required = [];
    const type = V25.normalize(appointment.rideType || "");
    if (appointment.wheelchair) required.push("Rollstuhl");
    if (type.includes("kranken") || type.includes("dialyse") || type.includes("chemo")) required.push("Krankenfahrt");
    if (type.includes("schuler") || type.includes("schüler")) required.push("Schülerbeförderung");
    if (Number(appointment.persons || 1) >= 5) required.push("Großraum");
    required.push("Personenbeförderungsschein");
    return [...new Set(required)];
  }

  function employeeHasQualification(emp, qualification) {
    const target = V25.normalize(qualification || "");
    const list = Array.isArray(emp.qualifications) ? emp.qualifications.map((entry) => V25.normalize(entry)) : [];
    if (target.includes("personenbeforderung")) return String(emp.pPermit || "Nein") === "Ja";
    if (target.includes("rollstuhl")) return Boolean(emp.wheelchairSkill) || list.some((entry) => entry.includes("rollstuhl"));
    if (target.includes("kranken")) return list.some((entry) => entry.includes("kranken") || entry.includes("dialyse") || entry.includes("chemo"));
    if (target.includes("grossraum") || target.includes("großraum")) return Boolean(emp.largeVehicleSkill) || list.some((entry) => entry.includes("grossraum") || entry.includes("großraum"));
    if (target.includes("schuler") || target.includes("schüler")) return list.some((entry) => entry.includes("schuler") || entry.includes("schüler"));
    return true;
  }

  function appointmentDurationMinutes(appointment) {
    const quality = appointment && appointment.quality;
    const byQuality = quality && quality.estimatedDurationMin ? Number(quality.estimatedDurationMin) : 0;
    if (Number.isFinite(byQuality) && byQuality > 0) return byQuality;
    return 45;
  }

  function appointmentEndTime(appointment) {
    if (!appointment || !appointment.time || !V25.hasClockTime(appointment.time)) return "";
    return V25.addMinutes(appointment.time, appointmentDurationMinutes(appointment));
  }

  function overlaps(startA, endA, startB, endB) {
    const aStart = minutes(startA);
    const aEnd = minutes(endA);
    const bStart = minutes(startB);
    const bEnd = minutes(endB);
    return aStart < bEnd && bStart < aEnd;
  }

  function appointmentNeedsLargeVehicle(appointment) {
    const type = V25.normalize(appointment.rideType || "");
    return Number(appointment.persons || 1) >= 5 || type.includes("grossraum") || type.includes("großraum");
  }

  function appointmentNeedsMedicalSkill(appointment) {
    const type = V25.normalize(appointment.rideType || "");
    return type.includes("kranken") || type.includes("dialyse") || type.includes("chemo");
  }

  function findVehicleByCandidate(candidate) {
    if (!candidate) return null;
    const pool = getTomorrowVehiclePool();
    return pool.find((vehicle) => vehicle.id === candidate.vehicleId)
      || pool.find((vehicle) => vehicle.plate === candidate.vehicleLabel)
      || null;
  }

  function getTomorrowDriverPool() {
    const byPlanning = Array.isArray(state.planning.drivers) ? state.planning.drivers : [];
    if (byPlanning.length) return byPlanning;
    return (state.personnel.employees || [])
      .filter((emp) => emp.role === "Fahrer")
      .map((emp) => {
        const shift = shiftRange(null, emp);
        return {
          employeeId: emp.id,
          name: `${emp.firstName || ""} ${emp.lastName || ""}`.trim(),
          shiftStart: shift.start,
          shiftEnd: shift.end,
          dayActive: true,
          status: emp.status || "im Dienst",
          vehicle: emp.activeVehicle || "",
          pauseStart: "",
          pauseEnd: ""
        };
      });
  }

  function getTomorrowVehiclePool() {
    const byPlanning = Array.isArray(state.planning.vehicles) ? state.planning.vehicles : [];
    if (byPlanning.length) return byPlanning;
    const coreVehicles = state.coreState && Array.isArray(state.coreState.vehicles) ? state.coreState.vehicles : [];
    return coreVehicles.map((vehicle) => ({
      id: vehicle.id || vehicle.plate,
      name: vehicle.name || vehicle.plate || "Fahrzeug",
      plate: vehicle.plate || vehicle.name || "-",
      seats: Number(vehicle.seats || 4),
      wheelchair: Boolean(vehicle.wheelchair),
      workshopStatus: vehicle.workshopStatus || "Verfügbar",
      status: vehicle.status || "verfügbar"
    }));
  }

  function findDriverContext(driverId) {
    const driver = getTomorrowDriverPool().find((row) => row.employeeId === driverId) || null;
    const emp = state.personnel.employees.find((row) => row.id === driverId) || null;
    return { driver, emp };
  }

  function vehicleCompatibilityWarnings(vehicle, appointment, vehicleLabel) {
    const warnings = [];
    if (!vehicle) {
      if (!vehicleLabel || vehicleLabel === "noch offen" || vehicleLabel === "-") warnings.push("Kein Fahrzeug zugeordnet");
      return warnings;
    }
    if (["Werkstatt", "Gesperrt"].includes(vehicle.workshopStatus)) warnings.push("Fahrzeug nicht verfügbar");
    if (vehicle.status && V25.normalize(vehicle.status).includes("gesperrt")) warnings.push("Fahrzeug gesperrt");
    if (Number(vehicle.seats || 0) < Number(appointment.persons || 1)) warnings.push(`Zu wenig Sitzplätze (${vehicle.seats || 0})`);
    if (appointment.wheelchair && !vehicle.wheelchair) warnings.push("Fahrzeug nicht rollstuhltauglich");
    if (appointmentNeedsLargeVehicle(appointment) && Number(vehicle.seats || 0) < 5) warnings.push("Kein Großraumfahrzeug");
    return warnings;
  }

  function findAdjacentDriverRides(appointmentId, driverId) {
    const rows = state.planning.appointments
      .filter((entry) => entry.id !== appointmentId && entry.assignment && entry.assignment.driverId === driverId && V25.hasClockTime(entry.time) && entry.planStatus !== "Konflikt")
      .map((entry) => ({ ...entry, endTime: appointmentEndTime(entry) }))
      .sort((a, b) => String(a.time).localeCompare(String(b.time), "de"));
    return rows;
  }

  function findAdjacentVehicleRides(appointmentId, vehicleId) {
    return state.planning.appointments
      .filter((entry) => entry.id !== appointmentId && entry.assignment && entry.assignment.vehicleId === vehicleId && V25.hasClockTime(entry.time) && entry.planStatus !== "Konflikt")
      .map((entry) => ({ ...entry, endTime: appointmentEndTime(entry) }))
      .sort((a, b) => String(a.time).localeCompare(String(b.time), "de"));
  }

  function evaluateTomorrowCandidate(appointment, candidate) {
    const conflicts = [];
    const notes = [];
    const context = findDriverContext(candidate.driverId);
    const driver = context.driver;
    const emp = context.emp;
    const vehicle = findVehicleByCandidate(candidate);
    const start = appointment.time;
    const end = appointmentEndTime(appointment);

    if (!driver || !emp) {
      conflicts.push("Fahrerprofil fehlt in der Tagesplanung");
      return { conflicts, notes, status: "Konflikt", goodConnection: false };
    }
    if (!V25.hasClockTime(start)) {
      conflicts.push("Uhrzeit fehlt, keine sichere Zuweisung möglich");
      return { conflicts, notes, status: "Konflikt", goodConnection: false };
    }

    const shift = shiftRange(driver, emp);
    if (!isWithinShift(start, shift.start, shift.end)) {
      conflicts.push(`Fahrt liegt außerhalb der Schicht ${shift.start || "-"}–${shift.end || "-"} Uhr`);
    }

    const normalizedStatus = V25.normalize(emp.status || "");
    const isVacation = normalizedStatus.includes("urlaub") || state.personnel.vacations.some((v) => v.employeeId === emp.id && ["genehmigt", "teilweise genehmigt"].includes(v.status) && state.selectedDate >= v.start && state.selectedDate <= v.end);
    const hasAbsence = state.personnel.absences.some((a) => a.employeeId === emp.id && !["abgeschlossen", "Abgelehnt"].includes(a.status) && state.selectedDate >= a.start && state.selectedDate <= a.expectedEnd);
    if (normalizedStatus.includes("krank")) conflicts.push("Fahrer ist krank gemeldet");
    if (isVacation) conflicts.push("Fahrer ist im Urlaub");
    if (hasAbsence) conflicts.push("Fahrer ist abwesend");
    if (normalizedStatus.includes("pause") || (driver.pauseStart && driver.pauseEnd && isWithinShift(start, driver.pauseStart, driver.pauseEnd))) {
      conflicts.push(`Fahrer befindet sich in Pause${driver.pauseStart && driver.pauseEnd ? ` (${driver.pauseStart}–${driver.pauseEnd} Uhr)` : ""}`);
    }

    const required = requiredQualificationsForAppointment(appointment);
    required.forEach((qualification) => {
      if (!employeeHasQualification(emp, qualification)) {
        conflicts.push(`Fahrer besitzt keine ${qualification}-Qualifikation`);
      }
    });

    const vehicleWarnings = vehicleCompatibilityWarnings(vehicle, appointment, candidate.vehicleLabel);
    conflicts.push(...vehicleWarnings);

    const driverRides = findAdjacentDriverRides(appointment.id, candidate.driverId);
    const overlappingDriverRide = driverRides.find((ride) => overlaps(start, end, ride.time, ride.endTime));
    if (overlappingDriverRide) {
      conflicts.push(`Zeitkonflikt - vorherige Fahrt endet voraussichtlich um ${overlappingDriverRide.endTime} Uhr.`);
    }

    const vehicleId = candidate.vehicleId || (vehicle ? vehicle.id : "");
    if (vehicleId) {
      const vehicleRides = findAdjacentVehicleRides(appointment.id, vehicleId);
      const overlappingVehicleRide = vehicleRides.find((ride) => overlaps(start, end, ride.time, ride.endTime));
      if (overlappingVehicleRide) {
        conflicts.push(`Fahrzeug ist zeitgleich belegt bis ${overlappingVehicleRide.endTime} Uhr.`);
      }
    }

    const previousRide = driverRides.filter((ride) => minutes(ride.endTime) <= minutes(start)).slice(-1)[0] || null;
    const nextRide = driverRides.find((ride) => minutes(ride.time) >= minutes(end)) || null;
    if (previousRide) {
      const previousGap = minutes(start) - minutes(previousRide.endTime);
      if (previousGap < 10) conflicts.push(`Zu wenig Zeit zwischen Fahrten - es fehlen ${10 - previousGap} Minuten Puffer.`);
      const sameLocation = V25.normalize(previousRide.destination || "") === V25.normalize(appointment.pickup || "");
      if (sameLocation && previousGap >= 10 && previousGap <= 90) notes.push("Gute Anschlussfahrt");
    }
    if (nextRide) {
      const nextGap = minutes(nextRide.time) - minutes(end);
      if (nextGap < 10) conflicts.push(`Nächste Fahrt startet zu früh um ${nextRide.time} Uhr.`);
      const sameLocation = V25.normalize(appointment.destination || "") === V25.normalize(nextRide.pickup || "");
      if (sameLocation && nextGap >= 10 && nextGap <= 90) notes.push("Sinnvolle Kombination");
    }

    const status = conflicts.length ? "Konflikt" : notes.length ? "Hinweis" : "Geplant";
    return { conflicts, notes, status, goodConnection: notes.length > 0 };
  }

  function buildTomorrowCandidateOptions(appointment) {
    const suggestionGroup = state.planning.suggestions.find((entry) => entry.appointmentId === appointment.id);
    const fromSuggestions = suggestionGroup && suggestionGroup.items.length
      ? suggestionGroup.items.slice(0, 3).map((item) => {
        const evaluation = evaluateTomorrowCandidate(appointment, item);
        const context = findDriverContext(item.driverId);
        const driver = context.driver;
        const emp = context.emp;
        const shift = shiftRange(driver, emp || {});
        const vehicle = findVehicleByCandidate(item);
        return {
          rank: 0,
          driverId: item.driverId,
          driverName: item.driverName,
          shift,
          vehicleId: item.vehicleId,
          vehicleLabel: item.vehicleLabel || (driver && driver.vehicle) || (emp && emp.activeVehicle) || "noch offen",
          hasOwnVehicle: Boolean(emp && emp.activeVehicle && emp.activeVehicle !== "-"),
          availability: evaluation.conflicts.length ? (evaluation.conflicts.find((entry) => entry.includes("Pause")) ? "In Pause" : "Mit Konflikt") : "Verfügbar",
          evaluation,
          reasons: summarizeSuitability(item).slice(0, 2)
        };
      })
      : [];

    if (fromSuggestions.length) {
      return fromSuggestions.map((entry, index) => ({ ...entry, rank: index + 1 }));
    }

    const fallback = getTomorrowDriverPool()
      .filter((driver) => driver.dayActive !== false)
      .slice(0, 3)
      .map((driver, index) => {
        const emp = state.personnel.employees.find((row) => row.id === driver.employeeId) || {};
        const shift = shiftRange(driver, emp);
        const vehiclePool = getTomorrowVehiclePool();
        const preferred = vehiclePool.find((vehicle) => vehicle.plate === driver.vehicle)
          || vehiclePool.find((vehicle) => !["Werkstatt", "Gesperrt"].includes(vehicle.workshopStatus));
        const candidate = {
          driverId: driver.employeeId,
          driverName: driver.name,
          vehicleId: preferred ? preferred.id : "",
          vehicleLabel: preferred ? preferred.plate : (driver.vehicle || emp.activeVehicle || "noch offen")
        };
        const evaluation = evaluateTomorrowCandidate(appointment, candidate);
        return {
          rank: index + 1,
          driverId: candidate.driverId,
          driverName: candidate.driverName,
          shift,
          vehicleId: candidate.vehicleId,
          vehicleLabel: candidate.vehicleLabel,
          hasOwnVehicle: Boolean(emp.activeVehicle && emp.activeVehicle !== "-"),
          availability: evaluation.conflicts.length ? "Mit Konflikt" : "Verfügbar",
          evaluation,
          reasons: ["Aus aktiver Tagesplanung übernommen"]
        };
      });
    return fallback;
  }

  function seriesNextDates(appointment) {
    const type = V25.normalize(appointment.rideType || "");
    if (!type.includes("serien")) return [];
    const base = appointment.date || state.selectedDate;
    return [1, 2, 3].map((week) => formatDate(addDaysIso(base, week * 7)));
  }

  function tomorrowStatusTone(kind) {
    if (kind === "Konflikt") return "is-red";
    if (kind === "Fahrer offen") return "is-gold";
    if (kind === "Geplant") return "is-green";
    return "is-blue";
  }

  function passesTomorrowFilter(row) {
    const f = state.tomorrowFilter;
    if (f === "alle") return true;
    if (f === "offen") return row.kind === "Fahrer offen";
    if (f === "zugewiesen") return row.kind === "Geplant" || row.kind === "Hinweis";
    if (f === "konflikte") return row.kind === "Konflikt";
    if (f === "kranken") return appointmentNeedsMedicalSkill(row.appointment);
    if (f === "serien") return V25.normalize(row.appointment.rideType || "").includes("serien");
    return true;
  }

  function buildTomorrowRows() {
    const appointments = [...state.planning.appointments].sort((a, b) => String(a.time || "99:99").localeCompare(String(b.time || "99:99"), "de"));
    return appointments.map((appointment) => {
      const required = requiredQualificationsForAppointment(appointment);
      const assigned = appointment.assignment || null;
      const candidate = assigned ? {
        driverId: assigned.driverId,
        driverName: assigned.driverName,
        vehicleId: assigned.vehicleId,
        vehicleLabel: assigned.vehicleLabel
      } : null;
      const evaluation = candidate ? evaluateTomorrowCandidate(appointment, candidate) : { conflicts: [], notes: [], status: "Fahrer offen", goodConnection: false };
      const hasConflicts = evaluation.conflicts.length > 0;
      const kind = hasConflicts ? "Konflikt" : !assigned ? "Fahrer offen" : evaluation.notes.length ? "Hinweis" : "Geplant";
      return {
        appointment,
        required,
        assigned,
        evaluation,
        kind,
        tone: tomorrowStatusTone(kind),
        seriesDates: seriesNextDates(appointment)
      };
    });
  }

  function buildTomorrowTimeline(rows) {
    const byDriver = {};
    rows.filter((row) => row.assigned && V25.hasClockTime(row.appointment.time)).forEach((row) => {
      const key = row.assigned.driverId || row.assigned.driverName;
      byDriver[key] = byDriver[key] || { name: row.assigned.driverName || "Unbekannt", items: [] };
      byDriver[key].items.push({
        start: row.appointment.time,
        end: appointmentEndTime(row.appointment),
        customer: row.appointment.customer || "Fahrt",
        conflict: row.kind === "Konflikt"
      });
    });
    return Object.values(byDriver).map((driver) => ({
      ...driver,
      items: driver.items.sort((a, b) => String(a.start).localeCompare(String(b.start), "de"))
    })).sort((a, b) => a.name.localeCompare(b.name, "de"));
  }

  function loadPersonnel() {
    return P && typeof P.loadState === "function" ? P.loadState() : { employees: [], documents: [], vacations: [], absences: [] };
  }

  function groupBuckets() {
    return [
      { id: "early", label: "Früh", from: 0, to: 7 * 60 + 59 },
      { id: "morning", label: "Vormittag", from: 8 * 60, to: 10 * 60 + 59 },
      { id: "midday", label: "Mittag", from: 11 * 60, to: 13 * 60 + 59 },
      { id: "afternoon", label: "Nachmittag", from: 14 * 60, to: 17 * 60 + 59 },
      { id: "evening", label: "Abend", from: 18 * 60, to: 21 * 60 + 59 },
      { id: "night", label: "Nacht", from: 22 * 60, to: 23 * 60 + 59 },
      { id: "open", label: "Offen", from: -1, to: -1 }
    ];
  }

  function buildAppointmentFromCockpitRow(row, dateIso) {
    const returnTrip = row.returnTrip === true || String(row.returnTrip || "").toLowerCase() === "ja";
    const wheelchair = row.wheelchair === true || String(row.wheelchair || "").toLowerCase() === "ja";
    const persons = Number(row.persons || row.passengers || 1);
    const assignment = row.driverId || row.vehicleId || row.driver || row.vehicle
      ? {
        driverId: row.driverId || "",
        driverName: row.driverName || row.driver || "",
        vehicleId: row.vehicleId || "",
        vehicleLabel: row.vehicleLabel || row.vehicle || ""
      }
      : null;
    const appointment = {
      id: row.id || `CK-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      customer: row.customer || row.name || "Unbekannt",
      date: row.date || dateIso,
      time: row.time || "",
      pickup: row.pickup || "",
      destination: row.destination || "",
      rideType: row.rideType || row.type || "Taxi",
      returnTrip,
      returnStatus: returnTrip ? "offene Rückfahrt" : "keine Rückfahrt",
      wheelchair,
      persons: Number.isFinite(persons) && persons > 0 ? persons : 1,
      note: row.note || row.special || "",
      status: row.status || "Noch ungeplant",
      sourceDraftId: row.sourceDraftId || "",
      vehicleRequirement: wheelchair ? "Rollstuhlfahrzeug" : (Number.isFinite(persons) && persons >= 5) ? "Großraum" : "Standard",
      openTime: !V25.hasClockTime(row.time || ""),
      assignment,
      locked: false
    };
    appointment.quality = V25.buildAppointmentQuality(appointment);
    return appointment;
  }

  function cockpitAppointmentsForDate(dateIso) {
    const payload = safeParse(localStorage.getItem(COCKPIT_KEY)) || {};
    const rows = Array.isArray(payload.appointments) ? payload.appointments : [];
    return rows
      .filter((row) => String(row.date || "") === dateIso)
      .map((row) => buildAppointmentFromCockpitRow(row, dateIso));
  }

  function syncOperationalState() {
    const bridge = safeParse(localStorage.getItem("adminV22DispatchBridge")) || { plannedDrivers: [], confirmedPlan: [] };
    const dispo = safeParse(localStorage.getItem(LIVE_DISPO_KEY)) || { drivers: [], vehicles: [], orders: [] };
    bridge.plannedDrivers = Array.isArray(bridge.plannedDrivers) ? bridge.plannedDrivers : [];
    dispo.drivers = Array.isArray(dispo.drivers) ? dispo.drivers : [];
    dispo.vehicles = Array.isArray(dispo.vehicles) ? dispo.vehicles : [];

    const ensureBridge = (emp, driver) => {
      const existing = bridge.plannedDrivers.find((row) => row.employeeId === emp.id);
      const shift = shiftRange(driver || null, emp);
      const payload = {
        employeeId: emp.id,
        name: `${emp.firstName || ""} ${emp.lastName || ""}`.trim(),
        shiftStart: shift.start,
        shiftEnd: shift.end,
        vehicle: emp.activeVehicle || (driver && driver.vehicle) || "",
        status: emp.status || ""
      };
      if (existing) Object.assign(existing, payload);
      else bridge.plannedDrivers.push(payload);
    };

    (state.personnel.employees || []).filter((emp) => emp.role === "Fahrer").forEach((emp) => {
      const driver = state.planning.drivers.find((row) => row.employeeId === emp.id) || null;
      ensureBridge(emp, driver);

      const liveDriver = dispo.drivers.find((row) => row.id === emp.id)
        || dispo.drivers.find((row) => V25.normalize(row.name || "") === V25.normalize(`${emp.firstName || ""} ${emp.lastName || ""}`));
      const normalized = V25.normalize(emp.status || "");
      const liveStatus = normalized.includes("krank") ? "Krank"
        : normalized.includes("urlaub") ? "Urlaub"
          : normalized.includes("pause") ? "Pause"
            : normalized.includes("gesperrt") ? "Gesperrt"
              : "Verfügbar";
      if (liveDriver) {
        liveDriver.id = emp.id;
        liveDriver.name = liveDriver.name || `${emp.firstName || ""} ${emp.lastName || ""}`.trim();
        liveDriver.status = liveStatus;
        liveDriver.vehicle = emp.activeVehicle || liveDriver.vehicle || "";
      } else {
        dispo.drivers.push({
          id: emp.id,
          name: `${emp.firstName || ""} ${emp.lastName || ""}`.trim(),
          status: liveStatus,
          vehicle: emp.activeVehicle || ""
        });
      }

      if (emp.activeVehicle && emp.activeVehicle !== "-") {
        const liveVehicle = dispo.vehicles.find((row) => row.plate === emp.activeVehicle || row.name === emp.activeVehicle);
        if (liveVehicle) {
          liveVehicle.driverId = emp.id;
          liveVehicle.driverName = `${emp.firstName || ""} ${emp.lastName || ""}`.trim();
        }
      }
    });

    localStorage.setItem("adminV22DispatchBridge", JSON.stringify(bridge));
    localStorage.setItem(LIVE_DISPO_KEY, JSON.stringify(dispo));
  }

  function buildPlanning() {
    state.coreState = V25.loadState();
    state.personnel = loadPersonnel();
    const architecture = V25.loadArchitecture(state.selectedDate, state.coreState);
    const dayState = getDayState(state.selectedDate);

    architecture.drivers = architecture.drivers.map((driver) => {
      const selected = dayState.selectedDriverIds.includes(driver.employeeId);
      const template = SHIFT_TEMPLATES.find((tpl) => tpl.start === driver.shiftStart && tpl.end === driver.shiftEnd) || SHIFT_TEMPLATES[1];
      return {
        ...driver,
        shiftTemplateId: template.id,
        selected,
        fixedAppointments: [],
        phone: (state.personnel.employees.find((row) => row.id === driver.employeeId) || {}).phone || "",
        availableTime: driver.dayActive ? "vollständig verfügbar" : "nicht verfügbar"
      };
    });

    architecture.vehicles = architecture.vehicles.map((vehicle) => ({
      ...vehicle,
      status: vehicle.status === "Frei" ? "verfügbar" : vehicle.status,
      plannedAvailability: vehicle.pajConnected ? `GPS ${vehicle.pajSpeed}` : vehicle.workshopStatus === "Werkstatt" ? "Werkstatt" : "einsatzbereit"
    }));

    architecture.appointments = architecture.appointments.map((appointment) => ({
      ...appointment,
      assignment: null,
      locked: Boolean(dayState.locks[appointment.id]),
      openTime: !V25.hasClockTime(appointment.time),
      vehicleRequirement: appointment.wheelchair ? "Rollstuhlfahrzeug" : appointment.persons > 4 ? "Großraum" : "Standard"
    }));

    const cockpitRows = cockpitAppointmentsForDate(state.selectedDate);
    const appointmentMap = new Map();
    architecture.appointments.forEach((entry) => appointmentMap.set(entry.id, entry));
    cockpitRows.forEach((entry) => {
      if (!appointmentMap.has(entry.id)) appointmentMap.set(entry.id, entry);
    });
    architecture.appointments = [...appointmentMap.values()];

    return {
      selectedDate: state.selectedDate,
      variant: dayState.variant,
      appointmentFilter: dayState.appointmentFilter,
      appointments: architecture.appointments,
      drivers: architecture.drivers,
      vehicles: architecture.vehicles,
      suggestions: [],
      conflicts: [],
      chains: [],
      locks: dayState.locks,
      confirmed: dayState.confirmed,
      needsReview: dayState.needsReview,
      avisierung: dayState.avisierung,
      routeMapOpen: dayState.routeMapOpen,
      history: dayState.history,
      manualBlocks: dayState.manualBlocks,
      core: architecture
    };
  }

  function appointmentPassesFilter(appointment) {
    const filter = state.appointmentFilter;
    if (filter === "alle") return true;
    if (filter === "ungeplant") return !appointment.assignment && appointment.planStatus !== "Konflikt";
    if (filter === "Krankenfahrten") return V25.normalize(appointment.rideType).includes("kranken");
    if (filter === "Rollstuhl") return appointment.wheelchair;
    if (filter === "Rückfahrten") return appointment.returnTrip;
    if (filter === "Flughafen") return V25.normalize(appointment.rideType).includes("flughafen") || V25.normalize(appointment.destination).includes("flughafen");
    if (filter === "Konflikte") return appointment.planStatus === "Konflikt";
    return true;
  }

  function driverChainEntries(driverId, assignments) {
    return assignments.filter((entry) => entry.driverId === driverId).sort((a, b) => `${a.time}`.localeCompare(`${b.time}`, "de"));
  }

  function buildCandidateList(appointment, assignments) {
    const candidates = [];
    state.planning.drivers.forEach((driver) => {
      const chain = driverChainEntries(driver.employeeId, assignments);
      const driverAssessment = V25.evaluateDriver(driver, appointment, state.planning.core.context, state.coreState, chain);
      state.planning.vehicles.forEach((vehicle) => {
        const vehicleAssessment = V25.evaluateVehicle(vehicle, appointment, state.coreState);
        const combo = V25.evaluateCombination(driver, vehicle, appointment, driverAssessment, vehicleAssessment, chain, state.selectedVariant);
        const activeBlock = state.planning.manualBlocks.find((block) => {
          const driverMatch = block.driver && V25.normalize(block.driver) === V25.normalize(driver.name);
          const vehicleMatch = block.vehicle && V25.normalize(block.vehicle) === V25.normalize(vehicle.plate);
          const untilMatch = block.until && appointment.time && V25.hasClockTime(appointment.time) && V25.toMinutes(appointment.time) <= V25.toMinutes(block.until);
          return untilMatch && (driverMatch || vehicleMatch);
        });
        if (activeBlock) {
          combo.score -= 50;
          combo.reasons.unshift(`Spontane Barfahrt blockiert bis ${activeBlock.until}.`);
        }
        const unsuitable = [driverAssessment.tier, vehicleAssessment.tier].includes("ungeeignet") || combo.score < -40;
        candidates.push({
          appointmentId: appointment.id,
          driverId: driver.employeeId,
          driverName: driver.name,
          vehicleId: vehicle.id,
          vehicleLabel: vehicle.plate,
          driverAssessment,
          vehicleAssessment,
          combo,
          risk: unsuitable ? "ungeeignet" : combo.suitability,
          unsuitable
        });
      });
    });
    return candidates.sort((a, b) => b.combo.score - a.combo.score);
  }

  function summarizeSuitability(candidate) {
    const reasons = [];
    reasons.push(...candidate.driverAssessment.reasons.slice(0, 2));
    reasons.push(...candidate.vehicleAssessment.reasons.slice(0, 2));
    reasons.push(...candidate.combo.reasons.slice(0, 3));
    return reasons.filter(Boolean);
  }

  function createConflict(priority, cause, appointment, candidate) {
    return {
      id: `CON-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      appointmentId: appointment.id,
      appointmentLabel: `${appointment.time || "offen"} ${appointment.customer}`,
      driver: candidate ? candidate.driverName : "-",
      vehicle: candidate ? candidate.vehicleLabel : "-",
      cause,
      priority,
      suggestion: candidate ? "Alternative Vorschläge prüfen oder manuell eingreifen" : "Fahrer, Fahrzeug oder Terminangaben prüfen"
    };
  }

  function generatePlan() {
    const assignments = [];
    const suggestionMap = {};
    const conflicts = [];

    const appointments = [...state.planning.appointments].sort((a, b) => `${a.time || "99:99"}`.localeCompare(`${b.time || "99:99"}`, "de"));
    appointments.forEach((appointment) => {
      if (appointment.locked && state.planning.locks[appointment.id]) {
        const lock = state.planning.locks[appointment.id];
        const lockedCandidate = {
          appointmentId: appointment.id,
          driverId: lock.driverId,
          driverName: lock.driverName || "Fest zugewiesen",
          vehicleId: lock.vehicleId,
          vehicleLabel: lock.vehicleLabel || lock.vehicleId,
          combo: {
            suitability: "Beste Wahl",
            estimatedArrival: appointment.time,
            tripArrival: appointment.time ? V25.addMinutes(appointment.time, 30) : "",
            routeToPickup: { durationMin: 0, distanceKm: 0 },
            tripRoute: { durationMin: 25, distanceKm: 12 },
            deadheadMin: 0,
            deadheadKm: 0,
            arrivalGap: 15,
            pickupBuffer: 5,
            previousTrip: "gesperrte Zuweisung",
            nextTripHint: "gesperrt",
            reasons: ["Diese Zuweisung nicht mehr automatisch ändern"]
          },
          driverAssessment: { tier: "geeignet", location: V25.createLocation("Betriebshof", "Betriebshof", { displayLabel: "Betriebshof" }), reasons: ["Fester Fahrer"] },
          vehicleAssessment: { tier: "bevorzugt", location: V25.createLocation("Betriebshof", "Betriebshof", { displayLabel: "Betriebshof" }), reasons: ["Festes Fahrzeug"] },
          risk: "Beste Wahl",
          unsuitable: false
        };
        assignments.push({ ...lockedCandidate, appointment, fixed: true });
        suggestionMap[appointment.id] = [lockedCandidate];
        return;
      }

      const quality = appointment.quality;
      if (quality.status === "nicht planbar" || quality.status === "wichtige Angabe fehlt") {
        conflicts.push(createConflict("kritisch", quality.missing[0] || quality.status, appointment, null));
        suggestionMap[appointment.id] = [];
        return;
      }

      const candidates = buildCandidateList(appointment, assignments);
      const top = candidates.filter((item, index, arr) => !item.unsuitable && arr.findIndex((row) => row.driverId === item.driverId && row.vehicleId === item.vehicleId) === index).slice(0, 3);
      suggestionMap[appointment.id] = top;

      if (!top.length) {
        conflicts.push(createConflict("kritisch", "keine Fahrer verfügbar", appointment, null));
        return;
      }

      const winner = top[0];
      assignments.push({ ...winner, appointment, fixed: false });

      if (winner.combo.arrivalGap < 6) conflicts.push(createConflict("hoch", "zu wenig Zeit", appointment, winner));
      if (winner.combo.affectsOpenReturn) conflicts.push(createConflict("mittel", "Rückfahrt offen", appointment, winner));
      if (winner.driverAssessment.location.validForPlanning === false || winner.vehicleAssessment.location.validForPlanning === false) conflicts.push(createConflict("mittel", "Standort unbekannt", appointment, winner));
      if (winner.combo.tripArrival && winner.appointment.time && winner.driverAssessment.tier !== "ungeeignet" && winner.combo.suitability === "Mit Risiko") conflicts.push(createConflict("mittel", "mögliche Doppelbelegung oder Anschlussrisiko", appointment, winner));
    });

    state.planning.suggestions = Object.entries(suggestionMap).map(([appointmentId, list]) => ({ appointmentId, items: list }));
    state.planning.conflicts = conflicts;

    state.planning.appointments = state.planning.appointments.map((appointment) => {
      const chosen = assignments.find((item) => item.appointmentId === appointment.id);
      if (!chosen) {
        return { ...appointment, assignment: null, planStatus: conflicts.some((c) => c.appointmentId === appointment.id) ? "Konflikt" : "ungeplant" };
      }
      return {
        ...appointment,
        assignment: {
          driverId: chosen.driverId,
          driverName: chosen.driverName,
          vehicleId: chosen.vehicleId,
          vehicleLabel: chosen.vehicleLabel,
          estimatedArrival: chosen.combo.estimatedArrival
        },
        planStatus: chosen.fixed ? "zugewiesen" : "Vorschlag vorhanden"
      };
    });

    state.planning.chains = state.planning.drivers
      .filter((driver) => driver.dayActive || driverChainEntries(driver.employeeId, assignments).length)
      .map((driver) => {
        const chainItems = driverChainEntries(driver.employeeId, assignments);
        const rideCount = chainItems.length;
        const occupiedMinutes = chainItems.reduce((sum, item) => sum + item.combo.tripRoute.durationMin + item.combo.pickupBuffer, 0);
        const emptyMinutes = chainItems.reduce((sum, item) => sum + item.combo.deadheadMin, 0);
        const bufferMinutes = chainItems.reduce((sum, item) => sum + item.combo.arrivalGap, 0);
        const shiftWindow = Math.max(1, V25.toMinutes(driver.shiftEnd) - V25.toMinutes(driver.shiftStart));
        const transitions = chainItems.map((item, index) => {
          const previous = index === 0 ? null : chainItems[index - 1];
          return {
            startLabel: index === 0 ? (item.driverAssessment.location.displayLabel || item.driverAssessment.location.label) : previous.appointment.destination,
            ride: item.appointment,
            emptyMinutes: item.combo.deadheadMin,
            bufferMinutes: item.combo.arrivalGap,
            routeMinutes: item.combo.tripRoute.durationMin,
            arrivalTime: item.combo.tripArrival,
            transitionStatus: item.combo.arrivalGap >= 18 ? "gut" : item.combo.arrivalGap >= 6 ? "knapp" : item.driverAssessment.location.validForPlanning ? "konflikt" : "unbekannt",
            previousTrip: item.combo.previousTrip,
            reasons: summarizeSuitability(item)
          };
        });
        return {
          driverId: driver.employeeId,
          driverName: driver.name,
          vehicleLabel: chainItems[0] ? chainItems[0].vehicleLabel : (driver.vehicle || driver.fixedVehicle || "-"),
          shiftStart: driver.shiftStart,
          shiftEnd: driver.shiftEnd,
          rideCount,
          occupiedMinutes,
          emptyMinutes,
          bufferMinutes,
          utilization: Math.min(100, Math.round((occupiedMinutes / shiftWindow) * 100)),
          conflicts: transitions.filter((entry) => entry.transitionStatus === "konflikt").length,
          lastRide: transitions[transitions.length - 1] ? `${transitions[transitions.length - 1].ride.time} ${transitions[transitions.length - 1].ride.customer}` : "-",
          transitions,
          locationDisplay: chainItems[0] ? chainItems[0].driverAssessment.location.displayLabel : "Betriebshof"
        };
      });

    const coreHistory = state.coreState.history || [];
    state.planning.history = [...coreHistory, ...state.planning.history].slice(0, 40);
  }

  function renderToolbar() {
    const dateInput = document.querySelector("[data-selected-date]");
    if (dateInput) dateInput.value = state.selectedDate;
    const info = document.querySelector("[data-plan-state]");
    if (info) info.textContent = `${formatDate(state.selectedDate)} · Variante ${labelText(state.selectedVariant)}${state.planning.needsReview ? " · Planung seit letzter Änderung nicht mehr vollständig geprüft" : ""}`;
    document.querySelectorAll("[data-plan-variant]").forEach((button) => {
      button.classList.toggle("is-active", (button.getAttribute("data-plan-variant") || "") === state.selectedVariant);
    });
    document.querySelectorAll("[data-day-shortcut]").forEach((button) => {
      const key = button.getAttribute("data-day-shortcut") || "";
      button.classList.toggle("admin-btn-secondary", key !== state.selectedShortcut);
    });
  }

  function renderAppointments() {
    const node = document.querySelector("[data-appointment-groups]");
    if (!node) return;
    const groups = groupBuckets().map((bucket) => ({ ...bucket, rows: [] }));
    state.planning.appointments.filter(appointmentPassesFilter).forEach((appointment) => {
      if (!V25.hasClockTime(appointment.time)) {
        groups.find((row) => row.id === "open").rows.push(appointment);
        return;
      }
      const minutes = V25.toMinutes(appointment.time);
      const bucket = groups.find((row) => row.id !== "open" && minutes >= row.from && minutes <= row.to) || groups.find((row) => row.id === "open");
      bucket.rows.push(appointment);
    });

    node.innerHTML = groups.map((group) => {
      const body = group.rows.length ? group.rows.map((appointment) => {
        const assign = appointment.assignment ? `${appointment.assignment.driverName} · ${appointment.assignment.vehicleLabel}` : "noch offen";
        return `
          <article class="tp-appointment-card${appointment.planStatus === "Konflikt" ? " is-conflict" : ""}">
            <header>
              <strong>${appointment.time || "offen"} ${appointment.customer}</strong>
              <span class="m-pill ${appointment.planStatus === "Konflikt" ? "warnung" : appointment.planStatus === "Vorschlag vorhanden" ? "normal" : "success"}">${appointment.planStatus || "ungeplant"}</span>
            </header>
            <p>${appointment.pickup || "Abholort offen"} → ${appointment.destination || "Ziel offen"}</p>
            <p>Fahrtart: ${appointment.rideType} · Rückfahrt: ${appointment.returnStatus} · Fahrzeuganforderung: ${appointment.vehicleRequirement}</p>
            <p>Planbarkeit: ${appointment.quality.status}${appointment.quality.assumptions.length ? ` · Annahmen: ${appointment.quality.assumptions.join(", ")}` : ""}</p>
            <p>Bisherige Zuweisung: ${assign}</p>
            <div class="tp-card-actions">
              <button class="admin-btn admin-btn-secondary" type="button" data-appointment-lock="${appointment.id}">${appointment.locked ? "Sperre lösen" : "Termin sperren"}</button>
              <button class="admin-btn admin-btn-secondary" type="button" data-appointment-driver="${appointment.id}">Fahrer ändern</button>
              <button class="admin-btn admin-btn-secondary" type="button" data-appointment-vehicle="${appointment.id}">Fahrzeug ändern</button>
              <button class="admin-btn admin-btn-secondary" type="button" data-appointment-unplan="${appointment.id}">Ungeplant lassen</button>
            </div>
          </article>
        `;
      }).join("") : '<p class="m-note">Keine Einträge.</p>';
      return `<section class="tp-group"><div class="tp-group-head"><h3>${group.label}</h3><small>${group.rows.length} Termine</small></div>${body}</section>`;
    }).join("");
  }

  function renderDrivers() {
    const node = document.querySelector("[data-driver-list]");
    if (!node) return;
    const bulk = document.querySelector("[data-driver-bulk-template]");
    if (bulk) bulk.innerHTML = SHIFT_TEMPLATES.map((tpl) => `<option value="${tpl.id}">${tpl.name}</option>`).join("");

    node.innerHTML = state.planning.drivers.map((driver) => {
      const checked = state.selectedDrivers.has(driver.employeeId) ? "checked" : "";
      const location = state.planning.core.providers.location.getDriverLocation(driver, state.planning.core.context, state.coreState);
      return `
        <article class="tp-driver-card${driver.dayActive ? " is-active" : ""}">
          <label class="tp-select-row"><input type="checkbox" data-driver-select="${driver.employeeId}" ${checked}> Auswahl</label>
          <strong>${driver.name}</strong>
          <p>${driver.employmentType} · ${driver.shiftStart}–${driver.shiftEnd}</p>
          <p>Status: ${driver.status} · Taxischein: ${driver.taxischeinStatus} · Führerschein: ${driver.fuehrerscheinStatus}</p>
          <p>Qualifikationen: ${driver.qualifications.length ? driver.qualifications.join(", ") : "-"}</p>
          <p>Bevorzugtes Fahrzeug: ${driver.preferredVehicle || "-"} · verfügbare Zeit: ${driver.availableTime}</p>
          <p>Standort: ${location.displayLabel || location.label} · Quelle: ${location.source}</p>
          <div class="tp-driver-controls">
            <button class="admin-btn admin-btn-secondary" type="button" data-driver-activate="${driver.employeeId}">${driver.dayActive ? "Entfernen" : "Für den Tag aktivieren"}</button>
            <select data-driver-template="${driver.employeeId}">${SHIFT_TEMPLATES.map((tpl) => `<option value="${tpl.id}"${tpl.id === driver.shiftTemplateId ? " selected" : ""}>${tpl.name}</option>`).join("")}</select>
            <input type="time" value="${driver.shiftStart}" data-driver-start="${driver.employeeId}">
            <input type="time" value="${driver.shiftEnd}" data-driver-end="${driver.employeeId}">
            <button class="admin-btn admin-btn-secondary" type="button" data-driver-reserve="${driver.employeeId}">${driver.reserve ? "Reserve lösen" : "Als Reserve markieren"}</button>
            <input type="text" value="${driver.vehicle || ""}" placeholder="Fahrzeug zuweisen" data-driver-vehicle="${driver.employeeId}">
            <select data-driver-location="${driver.employeeId}"><option>Betriebshof</option><option>Letzte Fahrt</option><option>Standort unbekannt</option><option>Speyer</option><option>Karlsruhe</option></select>
            <button class="admin-btn admin-btn-secondary" type="button" data-driver-location-set="${driver.employeeId}">Standort setzen</button>
          </div>
        </article>
      `;
    }).join("");
  }

  function renderPlanSummary() {
    const node = document.querySelector("[data-plan-summary]");
    if (!node) return;
    const planned = state.planning.appointments.filter((entry) => entry.assignment).length;
    const open = state.planning.appointments.filter((entry) => !entry.assignment).length;
    const conflictCount = state.planning.conflicts.length;
    const returnOpen = state.planning.appointments.filter((entry) => entry.returnStatus === "offene Rückfahrt" || entry.returnStatus === "Rückruf erforderlich").length;
    node.innerHTML = `
      <article class="tp-plan-kpi"><small>Geplante Termine</small><strong>${planned}</strong></article>
      <article class="tp-plan-kpi"><small>Konflikte</small><strong>${conflictCount}</strong></article>
      <article class="tp-plan-kpi"><small>Offene Rückfahrten</small><strong>${returnOpen}</strong></article>
      <article class="tp-plan-kpi"><small>Variante</small><strong>${labelText(state.selectedVariant)}</strong></article>
      <article class="tp-plan-kpi"><small>Provider</small><strong>${state.planning.core.providers.route.label}</strong></article>
    `;
  }

  function transitionChip(status) {
    if (status === "gut") return '<span class="tp-route-state is-good">gut</span>';
    if (status === "knapp") return '<span class="tp-route-state is-tight">knapp</span>';
    if (status === "konflikt") return '<span class="tp-route-state is-conflict">konflikt</span>';
    return '<span class="tp-route-state is-unknown">unbekannt</span>';
  }

  function renderChains() {
    const node = document.querySelector("[data-driver-plans]");
    if (!node) return;
    if (!state.planning.chains.length) {
      node.innerHTML = '<p class="m-note">Noch keine Fahrtenketten vorhanden.</p>';
      return;
    }
    node.innerHTML = state.planning.chains.map((chain) => `
      <article class="tc-vehicle-plan">
        <h3>${chain.driverName}</h3>
        <p>${chain.vehicleLabel} · Schicht ${chain.shiftStart}–${chain.shiftEnd} · Standort ${chain.locationDisplay}</p>
        <p>Anzahl Fahrten: ${chain.rideCount} · geschätzte Besetztzeit: ${chain.occupiedMinutes} Minuten · geschätzte Leerfahrt: ${chain.emptyMinutes} Minuten · Pufferzeit: ${chain.bufferMinutes} Minuten · Auslastung: ${chain.utilization}% · Konflikte: ${chain.conflicts}</p>
        <ul>${chain.transitions.map((entry) => `
          <li>
            <p><strong>${entry.startLabel}</strong></p>
            <p>↓ ${entry.emptyMinutes} Minuten Leerfahrt</p>
            <strong>${entry.ride.time || "offen"} ${entry.ride.customer}</strong>
            <p>${entry.ride.pickup || "offen"} → ${entry.ride.destination || "offen"}</p>
            <p>geschätzte Fahrtdauer ${entry.routeMinutes} Minuten · Puffer ${entry.bufferMinutes} Minuten · Rückfahrt ${entry.ride.returnStatus}</p>
            <p>${transitionChip(entry.transitionStatus)}</p>
            <p>${entry.reasons.join(" · ")}</p>
            <div class="tp-card-actions">
              <button class="admin-btn admin-btn-secondary" type="button" data-manual-move="${entry.ride.id}">Zu anderem Fahrer verschieben</button>
              <button class="admin-btn admin-btn-secondary" type="button" data-manual-order="${entry.ride.id}">Reihenfolge ändern</button>
              <button class="admin-btn admin-btn-secondary" type="button" data-manual-pause="${entry.ride.id}">Pause einfügen</button>
            </div>
          </li>
        `).join("")}</ul>
      </article>
    `).join("");
  }

  function renderSuggestions() {
    const node = document.querySelector("[data-suggestion-list]");
    if (!node) return;
    if (!state.planning.suggestions.length) {
      node.innerHTML = '<p class="m-note">Noch keine Vorschläge vorhanden.</p>';
      return;
    }
    node.innerHTML = state.planning.suggestions.map((row) => {
      const appointment = state.planning.appointments.find((item) => item.id === row.appointmentId);
      const items = row.items.length ? row.items.map((item, index) => `
        <article class="tp-suggestion-card ${index === 0 ? "is-best" : ""}">
          <strong>${index === 0 ? "Beste Wahl" : index === 1 ? "Gute Alternative" : "Mit Risiko"}</strong>
          <p>${item.driverName} · ${item.vehicleLabel}</p>
          <p>Anfahrt zum Kunden: ${item.combo.routeToPickup.durationMin + item.combo.routeToPickup.trafficDelayMin} Minuten · geschätzte Ankunft: ${item.combo.estimatedArrival || "offen"}</p>
          <p>Fahrt davor: ${item.combo.previousTrip} · Fahrt danach: ${item.combo.nextTripHint}</p>
          <p>Leerfahrt: ${item.combo.deadheadMin} Minuten · Puffer: ${item.combo.arrivalGap} Minuten</p>
          <p>Schichtstatus: ${item.driverAssessment.tier} · Fahrzeugstatus: ${item.vehicleAssessment.tier} · Kombination: ${item.combo.suitability}</p>
          <p>${summarizeSuitability(item).join(" · ")}</p>
        </article>
      `).join("") : '<p class="m-note">Kein geeigneter Vorschlag.</p>';
      return `
        <section class="tp-suggestion-group">
          <div class="tp-group-head"><h3>${appointment ? `${appointment.time || "offen"} ${appointment.customer}` : row.appointmentId}</h3><small>${row.items.length} Vorschläge</small></div>
          ${items}
        </section>
      `;
    }).join("");
  }

  function renderVehicles() {
    const node = document.querySelector("[data-vehicle-list]");
    if (!node) return;
    node.innerHTML = state.planning.vehicles.map((vehicle) => {
      const location = state.planning.core.providers.vehicleLocation.getVehicleLocation(vehicle, state.planning.core.context, state.coreState);
      return `
        <article class="tp-vehicle-card${["Werkstatt", "Gesperrt"].includes(vehicle.workshopStatus) ? " is-unavailable" : ""}">
          <strong>${vehicle.name}</strong>
          <p>${vehicle.plate} · ${vehicle.type} · ${vehicle.seats} Sitzplätze</p>
          <p>Rollstuhl geeignet: ${vehicle.wheelchair ? "Ja" : "Nein"}</p>
          <p>Status: ${vehicle.status} · Werkstattstatus: ${vehicle.workshopStatus}</p>
          <p>Servicehinweis: ${vehicle.nextWorkshop} · TÜV: ${vehicle.tuvHint}</p>
          <p>Standort: ${location.displayLabel || location.label} · Quelle: ${location.source}</p>
          <p>PAJ: ${vehicle.pajDeviceId} · ${vehicle.pajConnected ? "GPS online" : "GPS offline"} · ${vehicle.pajMovementStatus}</p>
          <div class="tp-card-actions">
            <select data-vehicle-location="${vehicle.id}"><option>Betriebshof</option><option>Letzte Fahrt</option><option>Standort unbekannt</option><option>Speyer</option><option>Karlsruhe</option></select>
            <button class="admin-btn admin-btn-secondary" type="button" data-vehicle-location-set="${vehicle.id}">Standort setzen</button>
          </div>
        </article>
      `;
    }).join("");
  }

  function renderConflicts() {
    const node = document.querySelector("[data-conflict-list]");
    if (!node) return;
    if (!state.planning.conflicts.length) {
      node.innerHTML = '<p class="m-note">Keine kritischen Konflikte erkannt.</p>';
      return;
    }
    node.innerHTML = state.planning.conflicts.map((conflict) => `
      <article class="tp-conflict-card">
        <strong>${conflict.appointmentLabel}</strong>
        <p>Fahrer: ${conflict.driver || "-"} · Fahrzeug: ${conflict.vehicle || "-"}</p>
        <p>Ursache: ${conflict.cause}</p>
        <p>Priorität: ${conflict.priority}</p>
        <p>Lösungsvorschlag: ${conflict.suggestion}</p>
      </article>
    `).join("");
  }

  function renderAvisierung() {
    const node = document.querySelector("[data-avisierung-list]");
    if (!node) return;
    if (!state.planning.confirmed) {
      node.innerHTML = '<p class="m-note">Avisierung wird nach der Planbestätigung geöffnet.</p>';
      return;
    }
    node.innerHTML = state.planning.chains.map((chain) => {
      const driver = state.planning.drivers.find((entry) => entry.employeeId === chain.driverId);
      const status = state.planning.avisierung[chain.driverId] || "noch nicht angerufen";
      return `
        <article class="tp-avisierung-card">
          <strong>${chain.driverName}</strong>
          <p>Telefon: ${driver ? driver.phone || "-" : "-"}</p>
          <p>Fahrzeug: ${chain.vehicleLabel}</p>
          <p>Schicht: ${chain.shiftStart}–${chain.shiftEnd} · erste Abholung: ${chain.transitions[0] ? `${chain.transitions[0].ride.time} ${chain.transitions[0].ride.customer}` : "-"}</p>
          <p>Avisierungsstatus: ${status}</p>
          <div class="tp-card-actions">
            <button class="admin-btn admin-btn-secondary" type="button" data-avisierung-phone="${chain.driverId}">Telefonnummer öffnen</button>
            <button class="admin-btn admin-btn-secondary" type="button" data-avisierung-set="${chain.driverId}" data-avisierung-value="informiert">Als informiert markieren</button>
            <button class="admin-btn admin-btn-secondary" type="button" data-avisierung-set="${chain.driverId}" data-avisierung-value="bestätigt">Bestätigt markieren</button>
            <button class="admin-btn admin-btn-secondary" type="button" data-avisierung-set="${chain.driverId}" data-avisierung-value="nicht erreicht">Nicht erreicht</button>
            <button class="admin-btn admin-btn-secondary" type="button" data-avisierung-set="${chain.driverId}" data-avisierung-value="Rückruf erforderlich">Rückruf eintragen</button>
          </div>
        </article>
      `;
    }).join("");
  }

  function renderPrint() {
    const node = document.querySelector("[data-print-list]");
    if (!node) return;
    node.innerHTML = state.planning.chains.map((chain) => `
      <article class="tp-print-card">
        <strong>${chain.driverName}</strong>
        <p>${chain.vehicleLabel} · Schicht ${chain.shiftStart}–${chain.shiftEnd}</p>
        <ul>${chain.transitions.map((entry) => `<li>${entry.ride.time || "offen"} · ${entry.ride.customer} · ${entry.ride.pickup || "offen"} → ${entry.ride.destination || "offen"}</li>`).join("")}</ul>
      </article>
    `).join("");
  }

  function renderMap() {
    const panel = document.querySelector("[data-route-map-panel]");
    const node = document.querySelector("[data-route-map]");
    if (!panel || !node) return;
    panel.hidden = !state.mapOpen;
    if (!state.mapOpen) return;

    const appointmentNodes = state.planning.appointments.map((entry) => `<div class="tp-map-item"><strong>${entry.customer}</strong><p>${entry.pickup || "offen"} → ${entry.destination || "offen"}</p></div>`).join("");
    const driverNodes = state.planning.chains.map((entry) => `<div class="tp-map-item"><strong>${entry.driverName}</strong><p>${entry.locationDisplay}</p></div>`).join("");
    const vehicleNodes = state.planning.vehicles.slice(0, 6).map((entry) => `<div class="tp-map-item"><strong>${entry.plate}</strong><p>${entry.pajLastPosition}</p></div>`).join("");

    node.innerHTML = `
      <div class="tp-map-grid">
        <section><h3>Fahrerstartorte</h3>${driverNodes || '<p class="m-note">Keine Fahrer.</p>'}</section>
        <section><h3>Fahrzeugstandorte</h3>${vehicleNodes || '<p class="m-note">Keine Fahrzeuge.</p>'}</section>
        <section><h3>Abholorte und Ziele</h3>${appointmentNodes || '<p class="m-note">Keine Termine.</p>'}</section>
      </div>
      <p class="m-note">Demo-Routenlinien werden nur textlich vorbereitet. Bestehende Google-Maps-Komponenten bleiben unverändert.</p>
    `;
  }

  function renderTomorrowPreparation() {
    const panel = document.querySelector("[data-tp-tomorrow-panel]");
    if (!panel) return;

    const visible = state.uiMode === "tomorrowPrep";
    panel.hidden = !visible;
    document.querySelectorAll("[data-tp-day-workspace]").forEach((node) => {
      node.hidden = visible;
    });
    const mobileTabs = document.querySelector(".tp-mobile-tabs");
    if (mobileTabs) mobileTabs.hidden = visible;

    const toggleButton = document.querySelector("[data-tp-mode-toggle]");
    if (toggleButton) {
      toggleButton.textContent = visible ? "Tagesmodus" : "Morgen vorbereiten";
      toggleButton.classList.toggle("admin-btn-secondary", !visible);
    }
    if (!visible) return;

    const tomorrowDateNode = document.querySelector("[data-tp-tomorrow-date]");
    if (tomorrowDateNode) tomorrowDateNode.textContent = `Datum: ${formatDate(state.selectedDate)}`;

    const rows = buildTomorrowRows();
    const filtered = rows.filter(passesTomorrowFilter);
    const openCount = rows.filter((row) => row.kind === "Fahrer offen").length;
    const conflictCount = rows.filter((row) => row.kind === "Konflikt").length;
    const fullPlanned = rows.filter((row) => row.kind === "Geplant" || row.kind === "Hinweis").length;
    const driversOnDuty = getTomorrowDriverPool().filter((driver) => {
      const emp = state.personnel.employees.find((row) => row.id === driver.employeeId);
      const normalizedStatus = V25.normalize((emp && emp.status) || "");
      const hasShift = Boolean(driver.shiftStart && driver.shiftEnd) || Boolean(String((emp && emp.todayShift) || "").match(/^(\d{2}:\d{2})-(\d{2}:\d{2})$/));
      return hasShift && !normalizedStatus.includes("krank") && !normalizedStatus.includes("urlaub") && !normalizedStatus.includes("gesperrt");
    }).length;
    const vehiclesAvailable = getTomorrowVehiclePool().filter((vehicle) => !["Werkstatt", "Gesperrt"].includes(vehicle.workshopStatus)).length;

    const statusNode = document.querySelector("[data-tp-tomorrow-status]");
    if (statusNode) {
      const summaryTone = openCount === 0 && conflictCount === 0 ? "is-green" : "is-blue";
      const summaryText = openCount === 0 && conflictCount === 0
        ? "Morgen vollständig geplant"
        : `Morgen: ${rows.length} Fahrten · ${fullPlanned} vollständig geplant · ${openCount} Fahrer offen`;
      const bulkText = state.tomorrowMessages.bulk ? `<span class="tp-tomorrow-summary is-blue">${state.tomorrowMessages.bulk}</span>` : "";
      statusNode.innerHTML = `<span class="tp-tomorrow-summary ${summaryTone}">${summaryText}</span>${bulkText}`;
    }

    const kpiNode = document.querySelector("[data-tp-tomorrow-kpis]");
    if (kpiNode) {
      const cards = {
        "Fahrten morgen": rows.length,
        "Noch ohne Fahrer": openCount,
        "Bereits zugewiesen": fullPlanned,
        "Konflikte": conflictCount,
        "Fahrer im Dienst": driversOnDuty,
        "Fahrzeuge verfügbar": vehiclesAvailable
      };
      kpiNode.innerHTML = Object.entries(cards).map(([label, value]) => `<article class="tp-service-kpi"><small>${label}</small><strong>${value}</strong></article>`).join("");
    }

    const preparedNode = document.querySelector("[data-tp-tomorrow-prepared]");
    if (preparedNode) {
      if (!state.tomorrowPrepared.length) {
        preparedNode.innerHTML = '<p class="m-note">Noch keine vorbereiteten Vorschläge. Mit „Vorschläge erstellen“ werden nur Empfehlungen erzeugt, nichts wird automatisch zugewiesen.</p>';
      } else {
        preparedNode.innerHTML = state.tomorrowPrepared.map((entry) => `
          <article class="tp-tomorrow-item">
            <div class="tp-tomorrow-item-head">
              <strong>${entry.time} Uhr · ${entry.customer}</strong>
              <span class="tp-tomorrow-status-pill is-blue">Vorschlag</span>
            </div>
            <p class="tp-tomorrow-note">Empfehlung: ${entry.driver} · ${entry.vehicle}</p>
            <div class="tp-tomorrow-item-actions">
              <button class="admin-btn admin-btn-secondary" type="button" data-tp-open-assign="${entry.appointmentId}">Einzeln bestätigen</button>
            </div>
          </article>
        `).join("");
      }
    }

    const listNode = document.querySelector("[data-tp-tomorrow-list]");
    if (listNode) {
      if (!filtered.length) {
        listNode.innerHTML = '<p class="m-note">Keine Fahrten für den gewählten Filter.</p>';
      } else {
        listNode.innerHTML = filtered.map((row) => {
          const appointment = row.appointment;
          const assignedDriver = row.assigned ? row.assigned.driverName : "noch offen";
          const assignedVehicle = row.assigned ? row.assigned.vehicleLabel : "noch offen";
          const openAssign = state.tomorrowAssignOpenId === appointment.id;
          const options = openAssign ? buildTomorrowCandidateOptions(appointment) : [];
          const message = state.tomorrowMessages[appointment.id] || "";
          const seriesLabel = row.seriesDates.length ? `<span class="tp-service-chip">Serienfahrt</span>` : "";

          const assignPanel = openAssign ? `
            <div class="tp-tomorrow-assign">
              <strong>EMPFOHLEN</strong>
              ${options.length ? options.map((option, index) => {
                const conflicts = option.evaluation.conflicts;
                const notes = option.evaluation.notes;
                const availability = conflicts.length ? (conflicts[0] || "Mit Konflikt") : (notes[0] || option.availability);
                return `
                  <article class="tp-tomorrow-option">
                    <strong>${index + 1}. ${option.driverName}</strong>
                    <p>${availability}</p>
                    <p>Schicht ${option.shift.start || "-"}–${option.shift.end || "-"} Uhr · Fahrzeug ${option.vehicleLabel || "noch offen"}</p>
                    <p>${option.reasons.length ? option.reasons.join(" · ") : "Passende Qualifikation"}</p>
                    ${!option.hasOwnVehicle ? "<p class=\"tp-tomorrow-note\">Fahrzeug wird direkt mit zugewiesen.</p>" : ""}
                    <div class="tp-tomorrow-inline">
                      <button class="admin-btn" type="button" data-tp-assign-choice="${appointment.id}" data-driver-id="${option.driverId}" data-vehicle-id="${option.vehicleId || ""}" data-vehicle-label="${option.vehicleLabel || ""}">Zuweisen</button>
                    </div>
                  </article>
                `;
              }).join("") : '<p class="m-note">Keine kompakten Vorschläge verfügbar.</p>'}
            </div>
          ` : "";

          const conflictText = row.evaluation.conflicts.slice(0, 2).join(" · ");
          const noteText = row.evaluation.notes.slice(0, 2).join(" · ");
          const seriesDates = row.seriesDates.length ? `<p class="tp-tomorrow-note">Nächste Termine: ${row.seriesDates.join(" · ")}</p>` : "";

          return `
            <article class="tp-tomorrow-item">
              <div class="tp-tomorrow-item-head">
                <strong>${appointment.time || "offen"} Uhr · ${appointment.customer || "Unbekannt"}</strong>
                <span class="tp-tomorrow-status-pill ${row.tone}">${row.kind}</span>
              </div>
              <div class="tp-tomorrow-item-meta">
                <span>${appointment.pickup || "Abholung offen"} → ${appointment.destination || "Ziel offen"}</span>
                <span>Fahrtart: ${appointment.rideType || "Taxi"}</span>
                <span>Personen: ${appointment.persons || 1}</span>
                <span>Besonderheiten: ${appointment.note || "-"}</span>
                <span>Benötigte Qualifikation: ${row.required.join(", ")}</span>
                <span>Fahrer: ${assignedDriver}</span>
                <span>Fahrzeug: ${assignedVehicle}</span>
                ${seriesLabel}
              </div>
              ${seriesDates}
              ${conflictText ? `<p class="tp-tomorrow-warning">${conflictText}</p>` : ""}
              ${noteText ? `<p class="tp-tomorrow-note">${noteText}</p>` : ""}
              ${message ? `<p class="tp-tomorrow-note">${message}</p>` : ""}
              <div class="tp-tomorrow-item-actions">
                <button class="admin-btn admin-btn-secondary" type="button" data-tp-open-assign="${appointment.id}">Fahrer zuweisen</button>
              </div>
              ${assignPanel}
            </article>
          `;
        }).join("");
      }
    }

    const timelineNode = document.querySelector("[data-tp-timeline]");
    if (timelineNode) {
      const timelineRows = buildTomorrowTimeline(rows);
      const scale = "06:00 · 06:30 · 07:00 · 07:30 · 08:00 · 08:30 · 09:00 · 09:30 · 10:00";
      if (!timelineRows.length) {
        timelineNode.innerHTML = `<p class="m-note">Zeitleiste: ${scale}</p><p class="m-note">Noch keine zugewiesenen Fahrten.</p>`;
      } else {
        timelineNode.innerHTML = `
          <p class="m-note">Zeitleiste: ${scale}</p>
          ${timelineRows.map((driver) => `
            <article class="tp-timeline-row">
              <strong>${driver.name}</strong>
              <div class="tp-timeline-track">
                ${driver.items.map((item) => `<span class="tp-timeline-segment">${item.start} <b>━━━━━</b> ${item.end} · ${item.customer}${item.conflict ? " · Konflikt" : ""}</span>`).join("")}
              </div>
            </article>
          `).join("")}
        `;
      }
    }
  }

  function renderBlocks() {
    const node = document.querySelector("[data-block-list]");
    if (!node) return;
    if (!state.planning.manualBlocks.length) {
      node.innerHTML = '<p class="m-note">Keine freiwilligen Zeitblöcke erfasst.</p>';
      return;
    }
    node.innerHTML = state.planning.manualBlocks.map((block) => `
      <article class="tp-block-item">
        <strong>${block.driver || "ohne Fahrer"} · ${block.vehicle || "ohne Fahrzeug"}</strong>
        <p>Blockiert bis ${block.until || "offen"}</p>
        <p>Standort: ${block.location || "unbekannt"}</p>
      </article>
    `).join("");
  }

  function renderMobileTabs() {
    document.querySelectorAll("[data-mobile-tab]").forEach((button) => {
      button.classList.toggle("is-active", (button.getAttribute("data-mobile-tab") || "") === state.mobileTab);
    });
    const left = document.querySelector(".tp-column-left");
    const center = document.querySelector(".tp-column-center");
    const right = document.querySelector(".tp-column-right");
    [left, center, right].forEach((node) => node && node.classList.remove("is-mobile-visible"));
    if (state.mobileTab === "appointments" || state.mobileTab === "drivers") left && left.classList.add("is-mobile-visible");
    if (state.mobileTab === "plan" || state.mobileTab === "map") center && center.classList.add("is-mobile-visible");
    if (state.mobileTab === "suggestions" || state.mobileTab === "conflicts") right && right.classList.add("is-mobile-visible");
  }

  function savePlanningStatus() {
    persistDayState(state.selectedDate, {
      variant: state.selectedVariant,
      appointmentFilter: state.appointmentFilter,
      locks: state.planning.locks,
      selectedDriverIds: [...state.selectedDrivers],
      manualBlocks: state.planning.manualBlocks,
      avisierung: state.planning.avisierung,
      routeMapOpen: state.mapOpen,
      confirmed: state.planning.confirmed,
      needsReview: state.planning.needsReview,
      history: state.planning.history
    });
  }

  function syncAppointmentsToCockpit() {
    const cockpit = safeParse(localStorage.getItem(COCKPIT_KEY)) || { appointments: [] };
    cockpit.appointments = Array.isArray(cockpit.appointments) ? cockpit.appointments : [];
    state.planning.appointments.forEach((appointment) => {
      const row = cockpit.appointments.find((entry) => entry.id === appointment.id);
      if (!row) return;
      row.status = state.planning.confirmed ? "Bestätigt" : appointment.planStatus || "Noch ungeplant";
      if (appointment.assignment) {
        row.driverId = appointment.assignment.driverId;
        row.driverName = appointment.assignment.driverName;
        row.vehicleId = appointment.assignment.vehicleId;
        row.vehicleLabel = appointment.assignment.vehicleLabel;
      }
    });
    localStorage.setItem(COCKPIT_KEY, JSON.stringify(cockpit));

    const live = safeParse(localStorage.getItem(LIVE_DISPO_KEY)) || {};
    live.orders = Array.isArray(live.orders) ? live.orders : [];
    state.planning.appointments.forEach((appointment) => {
      const row = live.orders.find((entry) => entry.id === appointment.id);
      if (!row || !appointment.assignment) return;
      row.driverId = appointment.assignment.driverId;
      row.driver = appointment.assignment.driverName;
      row.vehicleId = appointment.assignment.vehicleId;
      row.vehicle = appointment.assignment.vehicleLabel;
      row.status = state.planning.confirmed ? "Bestätigt" : "Neu";
    });
    localStorage.setItem(LIVE_DISPO_KEY, JSON.stringify(live));
    syncOperationalState();
  }

  function rebuild(reason, markDirty) {
    generatePlan();
    if (markDirty) {
      state.planning.needsReview = true;
      state.planning.history.unshift(V25.createHistoryEntry("Planung", reason));
    }
    savePlanningStatus();
    renderAll();
  }

  function renderAll() {
    renderToolbar();
    renderServiceArea();
    renderTomorrowPreparation();
    renderAppointments();
    renderDrivers();
    renderPlanSummary();
    renderChains();
    renderSuggestions();
    renderVehicles();
    renderConflicts();
    renderAvisierung();
    renderBlocks();
    renderPrint();
    renderMap();
    renderMobileTabs();
  }

  function switchToTomorrowMode(enabled) {
    if (enabled) {
      if (state.selectedDate !== tomorrowIso()) {
        state.previousDate = state.selectedDate;
        state.selectedDate = tomorrowIso();
        state.selectedShortcut = "tomorrow";
        const dayState = getDayState(state.selectedDate);
        state.selectedVariant = dayState.variant;
        state.appointmentFilter = dayState.appointmentFilter;
        state.selectedDrivers = new Set(dayState.selectedDriverIds);
        state.mapOpen = dayState.routeMapOpen;
        state.planning = buildPlanning();
        rebuild("Morgen-Ansicht geladen", false);
      }
      state.uiMode = "tomorrowPrep";
      renderAll();
      return;
    }

    state.uiMode = "day";
    if (state.previousDate) {
      state.selectedDate = state.previousDate;
      state.previousDate = "";
      state.selectedShortcut = "custom";
      const dayState = getDayState(state.selectedDate);
      state.selectedVariant = dayState.variant;
      state.appointmentFilter = dayState.appointmentFilter;
      state.selectedDrivers = new Set(dayState.selectedDriverIds);
      state.mapOpen = dayState.routeMapOpen;
      state.planning = buildPlanning();
      rebuild("Zur Tagesplanung zurück", false);
      return;
    }
    renderAll();
  }

  function bindTomorrowMode() {
    document.addEventListener("click", (event) => {
      const toggle = event.target.closest("[data-tp-mode-toggle]");
      if (toggle) {
        switchToTomorrowMode(state.uiMode !== "tomorrowPrep");
        return;
      }

      const close = event.target.closest("[data-tp-mode-close]");
      if (close) {
        switchToTomorrowMode(false);
        return;
      }

      const createSuggestions = event.target.closest("[data-tp-suggest-open]");
      if (createSuggestions) {
        const rows = buildTomorrowRows().filter((row) => !row.assigned);
        state.tomorrowPrepared = rows.map((row) => {
          const options = buildTomorrowCandidateOptions(row.appointment);
          const lead = options[0];
          return {
            appointmentId: row.appointment.id,
            customer: row.appointment.customer || "Unbekannt",
            time: row.appointment.time || "offen",
            driver: lead ? lead.driverName : "kein Vorschlag",
            vehicle: lead ? (lead.vehicleLabel || "noch offen") : "noch offen"
          };
        });
        renderTomorrowPreparation();
        return;
      }

      const applyConflictFree = event.target.closest("[data-tp-apply-conflictfree]");
      if (applyConflictFree) {
        const candidates = buildTomorrowRows().filter((row) => !row.assigned).map((row) => {
          const option = buildTomorrowCandidateOptions(row.appointment)[0] || null;
          if (!option || option.evaluation.conflicts.length) return null;
          return { row, option };
        }).filter(Boolean);
        if (!candidates.length) {
          state.tomorrowMessages.bulk = "Keine konfliktfreien Vorschläge verfügbar.";
          renderTomorrowPreparation();
          return;
        }
        if (!window.confirm(`${candidates.length} konfliktfreie Vorschläge übernehmen?`)) return;
        candidates.forEach(({ row, option }) => {
          row.appointment.assignment = {
            driverId: option.driverId,
            driverName: option.driverName,
            vehicleId: option.vehicleId || "",
            vehicleLabel: option.vehicleLabel || "noch offen"
          };
          row.appointment.locked = true;
          row.appointment.planStatus = "zugewiesen";
          state.planning.locks[row.appointment.id] = {
            driverId: option.driverId,
            driverName: option.driverName,
            vehicleId: option.vehicleId || "",
            vehicleLabel: option.vehicleLabel || "noch offen",
            time: row.appointment.time
          };
        });
        state.tomorrowMessages.bulk = `${candidates.length} konfliktfreie Vorschläge übernommen.`;
        rebuild("Konfliktfreie Vorschläge übernommen", true);
        syncOperationalState();
        return;
      }

      const openAssign = event.target.closest("[data-tp-open-assign]");
      if (openAssign) {
        const appointmentId = openAssign.getAttribute("data-tp-open-assign") || "";
        state.tomorrowAssignOpenId = state.tomorrowAssignOpenId === appointmentId ? "" : appointmentId;
        renderTomorrowPreparation();
        return;
      }

      const assign = event.target.closest("[data-tp-assign-choice]");
      if (assign) {
        const appointmentId = assign.getAttribute("data-tp-assign-choice") || "";
        const driverId = assign.getAttribute("data-driver-id") || "";
        const vehicleId = assign.getAttribute("data-vehicle-id") || "";
        const vehicleLabel = assign.getAttribute("data-vehicle-label") || "";
        const appointment = state.planning.appointments.find((entry) => entry.id === appointmentId);
        const driver = getTomorrowDriverPool().find((entry) => entry.employeeId === driverId);
        const employee = state.personnel.employees.find((entry) => entry.id === driverId);
        const vehicle = getTomorrowVehiclePool().find((entry) => entry.id === vehicleId) || getTomorrowVehiclePool().find((entry) => entry.plate === vehicleId);
        if (!appointment || !driver) return;

        const candidate = {
          driverId,
          driverName: driver.name,
          vehicleId: vehicle ? vehicle.id : vehicleId,
          vehicleLabel: vehicle ? vehicle.plate : (vehicleLabel || (driver.vehicle || (employee && employee.activeVehicle) || (appointment.assignment ? appointment.assignment.vehicleLabel : "noch offen")))
        };
        const evaluation = evaluateTomorrowCandidate(appointment, candidate);
        state.tomorrowMessages[appointmentId] = evaluation.conflicts.length
          ? `Zuweisung mit Hinweis: ${evaluation.conflicts.slice(0, 2).join(" · ")}`
          : "Zuweisung bestätigt.";

        appointment.assignment = {
          driverId: candidate.driverId,
          driverName: candidate.driverName,
          vehicleId: candidate.vehicleId,
          vehicleLabel: candidate.vehicleLabel
        };
        appointment.locked = true;
        appointment.planStatus = evaluation.conflicts.length ? "Konflikt" : "zugewiesen";

        state.planning.locks[appointmentId] = {
          driverId: candidate.driverId,
          driverName: candidate.driverName,
          vehicleId: candidate.vehicleId,
          vehicleLabel: candidate.vehicleLabel,
          time: appointment.time
        };

        state.tomorrowAssignOpenId = "";
        rebuild("Morgen-Zuweisung bestätigt", true);
        syncOperationalState();
        return;
      }

      const filter = event.target.closest("[data-tp-tomorrow-filter]");
      if (!filter) return;
      state.tomorrowFilter = filter.getAttribute("data-tp-tomorrow-filter") || "alle";
      document.querySelectorAll("[data-tp-tomorrow-filter]").forEach((button) => {
        button.classList.toggle("is-active", button === filter);
      });
      renderTomorrowPreparation();
    });
  }

  function persistPersonnelChanges() {
    if (!P || typeof P.saveState !== "function") return;
    P.saveState(state.personnel);
    state.personnel = P.loadState();
  }

  function rotateShiftForEmployee(employeeId) {
    const emp = state.personnel.employees.find((row) => row.id === employeeId);
    const driver = state.planning.drivers.find((row) => row.employeeId === employeeId);
    if (!emp) return;
    const current = String(emp.todayShift || "").match(/^(\d{2}:\d{2})-(\d{2}:\d{2})$/);
    const currentStart = current ? current[1] : (driver ? driver.shiftStart : "08:00");
    const currentEnd = current ? current[2] : (driver ? driver.shiftEnd : "16:00");
    const currentIndex = SHIFT_TEMPLATES.findIndex((tpl) => tpl.start === currentStart && tpl.end === currentEnd);
    const next = SHIFT_TEMPLATES[(currentIndex + 1 + SHIFT_TEMPLATES.length) % SHIFT_TEMPLATES.length] || SHIFT_TEMPLATES[1];
    if (driver) {
      driver.shiftTemplateId = next.id;
      driver.shiftStart = next.start;
      driver.shiftEnd = next.end;
      driver.dayActive = true;
    }
    emp.todayShift = `${next.start}-${next.end}`;
  }

  function assignNextVehicle(employeeId) {
    const emp = state.personnel.employees.find((row) => row.id === employeeId);
    const driver = state.planning.drivers.find((row) => row.employeeId === employeeId);
    if (!emp || !driver) return;
    const available = state.planning.vehicles
      .filter((vehicle) => !["Werkstatt", "Gesperrt"].includes(vehicle.workshopStatus))
      .map((vehicle) => vehicle.plate);
    if (!available.length) return;
    const current = emp.activeVehicle || driver.vehicle || "";
    const currentIndex = available.findIndex((plate) => plate === current);
    const next = available[(currentIndex + 1 + available.length) % available.length];
    emp.activeVehicle = next;
    driver.vehicle = next;
  }

  function bindServiceActions() {
    document.addEventListener("click", (event) => {
      const actionButton = event.target.closest("[data-tp-service-action]");
      if (!actionButton) return;
      const action = actionButton.getAttribute("data-tp-service-action") || "";
      const employeeId = actionButton.getAttribute("data-employee-id") || "";
      const emp = state.personnel.employees.find((row) => row.id === employeeId);
      const driver = state.planning.drivers.find((row) => row.employeeId === employeeId);
      if (!emp || !driver) return;

      if (action === "vehicle") assignNextVehicle(employeeId);
      if (action === "shift") rotateShiftForEmployee(employeeId);
      if (action === "pause") {
        emp.status = "Pause";
        driver.status = "Pause";
      }
      if (action === "available") {
        emp.status = "im Dienst";
        driver.status = "Aktiv";
        driver.dayActive = true;
      }
      if (action === "finish") {
        emp.status = "frei";
        driver.dayActive = false;
      }
      if (action === "details") {
        const shift = shiftRange(driver, emp);
        const msg = `${emp.firstName} ${emp.lastName} · ${employmentLabel(emp.employmentType)} · Schicht ${shift.start || "-"}–${shift.end || "-"} Uhr · Status ${emp.status}`;
        const info = document.querySelector("[data-plan-state]");
        if (info) info.textContent = msg;
        return;
      }

      persistPersonnelChanges();
      state.planning = buildPlanning();
      rebuild("Heute-im-Dienst geändert", true);
      syncOperationalState();
    });
  }

  function pickNextDriver(appointmentId) {
    const appointment = state.planning.appointments.find((entry) => entry.id === appointmentId);
    if (!appointment) return;
    const group = state.planning.suggestions.find((entry) => entry.appointmentId === appointmentId);
    if (!group || !group.items.length) return;
    const current = appointment.assignment ? `${appointment.assignment.driverId}:${appointment.assignment.vehicleId}` : "";
    const idx = group.items.findIndex((item) => `${item.driverId}:${item.vehicleId}` === current);
    const next = group.items[(idx + 1 + group.items.length) % group.items.length];
    appointment.assignment = { driverId: next.driverId, driverName: next.driverName, vehicleId: next.vehicleId, vehicleLabel: next.vehicleLabel };
    appointment.planStatus = "zugewiesen";
    rebuild("Fahrer geändert", true);
  }

  function pickNextVehicle(appointmentId) {
    const appointment = state.planning.appointments.find((entry) => entry.id === appointmentId);
    if (!appointment) return;
    const group = state.planning.suggestions.find((entry) => entry.appointmentId === appointmentId);
    if (!group || !group.items.length) return;
    const currentVehicle = appointment.assignment ? appointment.assignment.vehicleId : "";
    const idx = group.items.findIndex((item) => item.vehicleId === currentVehicle);
    const next = group.items[(idx + 1 + group.items.length) % group.items.length];
    appointment.assignment = { driverId: next.driverId, driverName: next.driverName, vehicleId: next.vehicleId, vehicleLabel: next.vehicleLabel };
    appointment.planStatus = "zugewiesen";
    rebuild("Fahrzeug geändert", true);
  }

  function bindToolbar() {
    document.querySelectorAll("[data-day-shortcut]").forEach((button) => {
      button.addEventListener("click", () => {
        const key = button.getAttribute("data-day-shortcut") || "tomorrow";
        if (state.uiMode === "tomorrowPrep" && key !== "tomorrow") state.uiMode = "day";
        state.selectedShortcut = key;
        if (key === "today") state.selectedDate = todayIso();
        if (key === "tomorrow") state.selectedDate = addDaysIso(todayIso(), 1);
        if (key === "dayAfter") state.selectedDate = addDaysIso(todayIso(), 2);
        const dayState = getDayState(state.selectedDate);
        state.selectedVariant = dayState.variant;
        state.appointmentFilter = dayState.appointmentFilter;
        state.selectedDrivers = new Set(dayState.selectedDriverIds);
        state.mapOpen = dayState.routeMapOpen;
        state.planning = buildPlanning();
        rebuild("Planung neu geladen", false);
      });
    });

    const dateInput = document.querySelector("[data-selected-date]");
    if (dateInput) {
      dateInput.addEventListener("change", () => {
        state.selectedDate = String(dateInput.value || addDaysIso(todayIso(), 1));
        if (state.uiMode === "tomorrowPrep" && state.selectedDate !== tomorrowIso()) state.uiMode = "day";
        state.selectedShortcut = "custom";
        const dayState = getDayState(state.selectedDate);
        state.selectedVariant = dayState.variant;
        state.appointmentFilter = dayState.appointmentFilter;
        state.selectedDrivers = new Set(dayState.selectedDriverIds);
        state.mapOpen = dayState.routeMapOpen;
        state.planning = buildPlanning();
        rebuild("Planung neu geladen", false);
      });
    }

    const recalc = document.querySelector("[data-plan-recalculate]");
    if (recalc) recalc.addEventListener("click", () => rebuild("Planung neu berechnet", true));

    const saveBtn = document.querySelector("[data-plan-save]");
    if (saveBtn) saveBtn.addEventListener("click", () => { savePlanningStatus(); syncAppointmentsToCockpit(); renderAll(); });

    const confirmBtn = document.querySelector("[data-plan-confirm]");
    if (confirmBtn) confirmBtn.addEventListener("click", () => {
      const criticals = state.planning.conflicts.filter((entry) => entry.priority === "kritisch");
      const noVehicle = state.planning.drivers.filter((entry) => entry.dayActive && !entry.vehicle).length;
      const openReturns = state.planning.appointments.filter((entry) => entry.returnStatus === "offene Rückfahrt" && !entry.assignment).length;
      if (criticals.length || noVehicle || openReturns) {
        state.planning.history.unshift(V25.createHistoryEntry("Konflikt", "Planbestätigung blockiert"));
        renderConflicts();
        return;
      }
      state.planning.confirmed = true;
      state.planning.needsReview = false;
      state.planning.history.unshift(V25.createHistoryEntry("Freigabe", "Plan freigegeben"));
      savePlanningStatus();
      syncAppointmentsToCockpit();
      renderAll();
    });

    const resetBtn = document.querySelector("[data-plan-reset]");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        if (!window.confirm("Tagesplanung für den gewählten Tag wirklich zurücksetzen?")) return;
        const store = loadUiState();
        delete store.days[state.selectedDate];
        saveUiState(store);
        state.planning = buildPlanning();
        rebuild("Planung zurückgesetzt", false);
      });
    }

    const routeReset = document.querySelector("[data-route-reset]");
    if (routeReset) {
      routeReset.addEventListener("click", () => {
        if (!window.confirm("Routen- und Standort-Demo wirklich zurücksetzen?")) return;
        state.coreState = V25.resetState();
        state.planning = buildPlanning();
        rebuild("Routen- und Standort-Demo zurückgesetzt", false);
      });
    }

    const toggleMap = document.querySelector("[data-plan-toggle-map]");
    if (toggleMap) toggleMap.addEventListener("click", () => {
      state.mapOpen = !state.mapOpen;
      savePlanningStatus();
      renderMap();
    });

    const closeMap = document.querySelector("[data-plan-close-map]");
    if (closeMap) closeMap.addEventListener("click", () => {
      state.mapOpen = false;
      savePlanningStatus();
      renderMap();
    });
  }

  function bindFilters() {
    document.querySelectorAll("[data-appointment-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        state.appointmentFilter = button.getAttribute("data-appointment-filter") || "alle";
        document.querySelectorAll("[data-appointment-filter]").forEach((row) => row.classList.toggle("is-active", row === button));
        savePlanningStatus();
        renderAppointments();
      });
    });

    document.querySelectorAll("[data-plan-variant]").forEach((button) => {
      button.addEventListener("click", () => {
        state.selectedVariant = button.getAttribute("data-plan-variant") || "balanced";
        state.planning.variant = state.selectedVariant;
        rebuild("Variante gewechselt", true);
      });
    });
  }

  function bindDriverActions() {
    document.addEventListener("click", (event) => {
      const activate = event.target.closest("[data-driver-activate]");
      if (activate) {
        const id = activate.getAttribute("data-driver-activate") || "";
        const row = state.planning.drivers.find((entry) => entry.employeeId === id);
        if (!row) return;
        row.dayActive = !row.dayActive;
        rebuild("Fahrer geändert", true);
        return;
      }
      const reserve = event.target.closest("[data-driver-reserve]");
      if (reserve) {
        const id = reserve.getAttribute("data-driver-reserve") || "";
        const row = state.planning.drivers.find((entry) => entry.employeeId === id);
        if (!row) return;
        row.reserve = !row.reserve;
        row.dayActive = true;
        rebuild("Reserve geändert", true);
        return;
      }
      const setLocation = event.target.closest("[data-driver-location-set]");
      if (setLocation) {
        const id = setLocation.getAttribute("data-driver-location-set") || "";
        const select = document.querySelector(`[data-driver-location="${id}"]`);
        const value = select ? String(select.value || "Betriebshof") : "Betriebshof";
        V25.setManualLocation(state.coreState, `driver:${id}`, { label: value, accuracy: "Manuell gesetzt", validForPlanning: value !== "Standort unbekannt" });
        state.coreState = V25.loadState();
        state.planning = buildPlanning();
        rebuild("Standort manuell geändert", true);
        return;
      }
      const bulkShift = event.target.closest("[data-driver-bulk-shift]");
      if (bulkShift) {
        const select = document.querySelector("[data-driver-bulk-template]");
        const tpl = SHIFT_TEMPLATES.find((entry) => entry.id === (select ? select.value : "day")) || SHIFT_TEMPLATES[1];
        state.selectedDrivers.forEach((id) => {
          const row = state.planning.drivers.find((entry) => entry.employeeId === id);
          if (!row) return;
          row.shiftTemplateId = tpl.id;
          row.shiftStart = tpl.start;
          row.shiftEnd = tpl.end;
          row.dayActive = true;
        });
        rebuild("Schichtvorlage auf mehrere Fahrer angewendet", true);
        return;
      }
      const bulkReserve = event.target.closest("[data-driver-bulk-reserve]");
      if (bulkReserve) {
        state.selectedDrivers.forEach((id) => {
          const row = state.planning.drivers.find((entry) => entry.employeeId === id);
          if (!row) return;
          row.reserve = true;
          row.dayActive = true;
        });
        rebuild("Mehrere Fahrer als Reserve markiert", true);
      }
    });

    document.addEventListener("change", (event) => {
      const selectDriver = event.target.closest("[data-driver-select]");
      if (selectDriver) {
        const id = selectDriver.getAttribute("data-driver-select") || "";
        if (selectDriver.checked) state.selectedDrivers.add(id);
        else state.selectedDrivers.delete(id);
        savePlanningStatus();
        return;
      }
      const template = event.target.closest("[data-driver-template]");
      if (template) {
        const id = template.getAttribute("data-driver-template") || "";
        const row = state.planning.drivers.find((entry) => entry.employeeId === id);
        const tpl = SHIFT_TEMPLATES.find((entry) => entry.id === template.value) || SHIFT_TEMPLATES[1];
        if (!row) return;
        row.shiftTemplateId = tpl.id;
        row.shiftStart = tpl.start;
        row.shiftEnd = tpl.end;
        row.dayActive = true;
        rebuild("Schicht geändert", true);
      }
    });

    document.addEventListener("input", (event) => {
      const start = event.target.closest("[data-driver-start]");
      if (start) {
        const id = start.getAttribute("data-driver-start") || "";
        const row = state.planning.drivers.find((entry) => entry.employeeId === id);
        if (!row) return;
        row.shiftStart = String(start.value || row.shiftStart);
        row.dayActive = true;
        rebuild("Schichtbeginn geändert", true);
        return;
      }
      const end = event.target.closest("[data-driver-end]");
      if (end) {
        const id = end.getAttribute("data-driver-end") || "";
        const row = state.planning.drivers.find((entry) => entry.employeeId === id);
        if (!row) return;
        row.shiftEnd = String(end.value || row.shiftEnd);
        row.dayActive = true;
        rebuild("Schichtende geändert", true);
        return;
      }
      const vehicle = event.target.closest("[data-driver-vehicle]");
      if (vehicle) {
        const id = vehicle.getAttribute("data-driver-vehicle") || "";
        const row = state.planning.drivers.find((entry) => entry.employeeId === id);
        if (!row) return;
        row.vehicle = String(vehicle.value || "").trim();
        row.dayActive = true;
        rebuild("Fahrzeug geändert", true);
      }
    });
  }

  function bindAppointmentActions() {
    document.addEventListener("click", (event) => {
      const lock = event.target.closest("[data-appointment-lock]");
      if (lock) {
        const id = lock.getAttribute("data-appointment-lock") || "";
        const appointment = state.planning.appointments.find((entry) => entry.id === id);
        if (!appointment) return;
        if (state.planning.locks[id]) {
          delete state.planning.locks[id];
        } else if (appointment.assignment) {
          state.planning.locks[id] = {
            driverId: appointment.assignment.driverId,
            driverName: appointment.assignment.driverName,
            vehicleId: appointment.assignment.vehicleId,
            vehicleLabel: appointment.assignment.vehicleLabel,
            time: appointment.time
          };
        }
        rebuild("Fahrt gesperrt", true);
        return;
      }
      const driver = event.target.closest("[data-appointment-driver]" );
      if (driver) {
        pickNextDriver(driver.getAttribute("data-appointment-driver") || "");
        return;
      }
      const vehicle = event.target.closest("[data-appointment-vehicle]");
      if (vehicle) {
        pickNextVehicle(vehicle.getAttribute("data-appointment-vehicle") || "");
        return;
      }
      const unplan = event.target.closest("[data-appointment-unplan]");
      if (unplan) {
        const id = unplan.getAttribute("data-appointment-unplan") || "";
        const appointment = state.planning.appointments.find((entry) => entry.id === id);
        if (!appointment) return;
        appointment.assignment = null;
        appointment.planStatus = "ungeplant";
        rebuild("Termin ungeplant gelassen", true);
        return;
      }
      const move = event.target.closest("[data-manual-move]");
      if (move) {
        pickNextDriver(move.getAttribute("data-manual-move") || "");
        return;
      }
      const order = event.target.closest("[data-manual-order]");
      if (order) {
        const id = order.getAttribute("data-manual-order") || "";
        const appointment = state.planning.appointments.find((entry) => entry.id === id);
        if (!appointment || !appointment.time) return;
        appointment.time = V25.addMinutes(appointment.time, 10);
        appointment.quality = V25.buildAppointmentQuality(appointment);
        rebuild("Reihenfolge geändert", true);
        return;
      }
      const pause = event.target.closest("[data-manual-pause]");
      if (pause) {
        const id = pause.getAttribute("data-manual-pause") || "";
        const appointment = state.planning.appointments.find((entry) => entry.id === id);
        if (!appointment || !appointment.assignment || !appointment.time) return;
        const driver = state.planning.drivers.find((entry) => entry.employeeId === appointment.assignment.driverId);
        if (!driver) return;
        driver.pauseStart = V25.addMinutes(appointment.time, 15);
        driver.pauseEnd = V25.addMinutes(appointment.time, 35);
        rebuild("Pause eingefügt", true);
      }
    });
  }

  function bindVehicleActions() {
    document.addEventListener("click", (event) => {
      const set = event.target.closest("[data-vehicle-location-set]");
      if (!set) return;
      const id = set.getAttribute("data-vehicle-location-set") || "";
      const select = document.querySelector(`[data-vehicle-location="${id}"]`);
      const value = select ? String(select.value || "Betriebshof") : "Betriebshof";
      V25.setManualLocation(state.coreState, `vehicle:${id}`, { label: value, accuracy: "Manuell gesetzt", validForPlanning: value !== "Standort unbekannt" });
      state.coreState = V25.loadState();
      state.planning = buildPlanning();
      rebuild("Standort manuell geändert", true);
    });
  }

  function bindAvisierung() {
    document.addEventListener("click", (event) => {
      const phone = event.target.closest("[data-avisierung-phone]");
      if (phone) {
        const driverId = phone.getAttribute("data-avisierung-phone") || "";
        state.planning.avisierung[driverId] = "angerufen";
        savePlanningStatus();
        renderAvisierung();
        return;
      }
      const set = event.target.closest("[data-avisierung-set]");
      if (set) {
        const driverId = set.getAttribute("data-avisierung-set") || "";
        const value = set.getAttribute("data-avisierung-value") || "informiert";
        state.planning.avisierung[driverId] = value;
        savePlanningStatus();
        renderAvisierung();
      }
    });
  }

  function bindMobileTabs() {
    document.querySelectorAll("[data-mobile-tab]").forEach((button) => {
      button.addEventListener("click", () => {
        state.mobileTab = button.getAttribute("data-mobile-tab") || "appointments";
        renderMobileTabs();
      });
    });
  }

  function bindQuickForm() {
    const form = document.querySelector("[data-quick-appointment-form]");
    if (!form) return;
    form.elements.date.value = state.selectedDate;
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const payload = Object.fromEntries(new FormData(form).entries());
      const appointment = {
        id: `V25-${Date.now()}`,
        customer: String(payload.name || "").trim(),
        date: String(payload.date || state.selectedDate),
        time: String(payload.time || "").trim(),
        pickup: String(payload.pickup || "").trim(),
        destination: String(payload.destination || "").trim(),
        rideType: String(payload.rideType || "Taxi"),
        returnTrip: String(payload.returnTrip || "Nein") === "Ja",
        returnStatus: String(payload.returnTrip || "Nein") === "Ja" ? "offene Rückfahrt" : "keine Rückfahrt",
        wheelchair: String(payload.wheelchair || "Nein") === "Ja",
        persons: Number(payload.persons || 1),
        note: String(payload.note || "").trim(),
        status: "Noch ungeplant",
        sourceDraftId: "",
        vehicleRequirement: String(payload.wheelchair || "Nein") === "Ja" ? "Rollstuhlfahrzeug" : Number(payload.persons || 1) > 4 ? "Großraum" : "Standard"
      };
      appointment.quality = V25.buildAppointmentQuality(appointment);
      state.planning.appointments.push(appointment);
      state.planning.needsReview = true;
      rebuild("Neuer Termin hinzugefügt", true);
      form.reset();
      form.elements.date.value = state.selectedDate;
      const feedback = document.querySelector("[data-intake-feedback]");
      if (feedback) feedback.textContent = "Termin wurde direkt in die Tagesliste übernommen.";
    });

    const spontaneous = document.querySelector("[data-spontaneous-ride]");
    if (spontaneous) {
      spontaneous.addEventListener("click", () => {
        document.querySelector("[data-block-form] input[name='until']")?.focus();
      });
    }
  }

  function bindBlockForm() {
    const form = document.querySelector("[data-block-form]");
    if (!form) return;
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const payload = Object.fromEntries(new FormData(form).entries());
      state.planning.manualBlocks.unshift({
        id: `BAR-${Date.now()}`,
        driver: String(payload.driver || "").trim(),
        vehicle: String(payload.vehicle || "").trim(),
        until: String(payload.until || "").trim(),
        location: String(payload.location || "").trim()
      });
      rebuild("Spontane Barfahrt als Zeitblock eingetragen", true);
      form.reset();
    });
  }

  function init() {
    state.selectedDate = addDaysIso(todayIso(), 1);
    const dayState = getDayState(state.selectedDate);
    state.selectedVariant = dayState.variant;
    state.appointmentFilter = dayState.appointmentFilter;
    state.selectedDrivers = new Set(dayState.selectedDriverIds);
    state.mapOpen = dayState.routeMapOpen;
    state.planning = buildPlanning();
    syncOperationalState();

    bindToolbar();
    bindTomorrowMode();
    bindFilters();
    bindServiceActions();
    bindDriverActions();
    bindAppointmentActions();
    bindVehicleActions();
    bindAvisierung();
    bindMobileTabs();
    bindQuickForm();
    bindBlockForm();

    window.addEventListener("storage", (event) => {
      if (!event.key || ![COCKPIT_KEY, LIVE_DISPO_KEY, V25.STORAGE_KEY].includes(event.key)) return;
      state.planning = buildPlanning();
      rebuild("Externe Änderung erkannt", false);
    });
    window.addEventListener("v24-intake-approved", () => {
      state.planning = buildPlanning();
      rebuild("Termin aus Inbox freigegeben", true);
    });

    rebuild("Planung erstellt", false);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
