(() => {
  const STORAGE_KEY = "adminTerminCockpitV22Phase1";
  const LIVE_DISPO_KEY = "adminLiveDispoV131";
  const DISPATCH_BRIDGE_KEY = "adminV22DispatchBridge";
  const STATUS_FLOW = ["Noch ungeplant", "Neu", "Geplant", "Bestaetigt", "Unterwegs", "Erledigt", "Abgerechnet"];
  const AI_STEPS = [
    "Fahrer analysieren",
    "Fahrzeuge analysieren",
    "Schichten pruefen",
    "Zeitabstaende pruefen",
    "Fahrzeugtypen pruefen",
    "Rollstuhl pruefen",
    "Auslastung berechnen"
  ];

  const FAVORITE_DESTINATIONS = ["Dialyse", "Strahlentherapie", "Krankenhaus", "Flughafen", "Zuhause"];

  const CUSTOMER_PROFILES = [
    {
      name: "Herr Mueller",
      phone: "0171 221100",
      lastPickup: "Germersheim Sued 12",
      lastDestination: "Dialyse Speyer",
      lastTime: "08:00",
      frequentRides: ["Dialyse", "Krankenhaus", "Zuhause"]
    },
    {
      name: "Frau Schmidt",
      phone: "0171 441200",
      lastPickup: "Lingenfeld Hauptstrasse 4",
      lastDestination: "Karlsruhe Klinikum",
      lastTime: "08:30",
      frequentRides: ["Krankenhaus", "Strahlentherapie", "Zuhause"]
    },
    {
      name: "Herr Cakir",
      phone: "0171 775510",
      lastPickup: "Bellheim Mitte 1",
      lastDestination: "Flughafen Frankfurt",
      lastTime: "09:10",
      frequentRides: ["Flughafen", "Zuhause"]
    }
  ];

  const state = {
    data: null,
    aiTimer: null,
    captureStartMs: 0
  };

  function nowIso() {
    return new Date().toISOString();
  }

  function todayIso() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function addDaysIso(baseIso, plus) {
    const d = new Date(`${baseIso}T00:00:00`);
    d.setDate(d.getDate() + plus);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function uid(prefix) {
    return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
  }

  function safeParse(raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function normalize(value) {
    return String(value || "")
      .toLocaleLowerCase("de-DE")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function loadLiveResources() {
    const parsed = safeParse(localStorage.getItem(LIVE_DISPO_KEY)) || {};
    const drivers = Array.isArray(parsed.drivers) ? parsed.drivers : [];
    const vehicles = Array.isArray(parsed.vehicles) ? parsed.vehicles : [];

    const fallbackDrivers = [
      { id: "DRV-D1", name: "Mehmet", status: "Aktiv" },
      { id: "DRV-D2", name: "Hasan", status: "Aktiv" },
      { id: "DRV-D3", name: "Aylin", status: "Aktiv" }
    ];

    const fallbackVehicles = [
      { id: "VEH-D1", plate: "GER TX100", name: "GER TX100", wheelchair: false, driverId: "DRV-D1" },
      { id: "VEH-D2", plate: "GER TX200", name: "GER TX200", wheelchair: false, driverId: "DRV-D2" },
      { id: "VEH-D3", plate: "GER TX300", name: "GER TX300", wheelchair: true, driverId: "DRV-D3" }
    ];

    return {
      drivers: drivers.length ? drivers : fallbackDrivers,
      vehicles: vehicles.length
        ? vehicles.map((v) => ({
            id: v.id,
            plate: v.plate || v.name || v.id,
            name: v.name || v.plate || v.id,
            wheelchair: Boolean(v.wheelchair),
            driverId: v.driverId || ""
          }))
        : fallbackVehicles
    };
  }

  function loadDispatchBridge() {
    const parsed = safeParse(localStorage.getItem(DISPATCH_BRIDGE_KEY)) || {};
    return {
      plannedDrivers: Array.isArray(parsed.plannedDrivers) ? parsed.plannedDrivers : [],
      confirmedPlan: Array.isArray(parsed.confirmedPlan) ? parsed.confirmedPlan : []
    };
  }

  function toMinutes(text) {
    const [h, m] = String(text || "00:00").split(":").map((v) => Number(v));
    return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
  }

  function isInsideShift(timeText, startText, endText) {
    const t = toMinutes(timeText);
    const s = toMinutes(startText);
    const eRaw = toMinutes(endText);
    const e = eRaw <= s ? eRaw + 1440 : eRaw;
    const tNorm = t < s ? t + 1440 : t;
    return tNorm >= s && tNorm <= e;
  }

  function isDriverRegularlyPlanable(driver, appointment) {
    const status = normalize(driver.status);
    if (!(status.includes("aktiv") || status.includes("dienst") || status.includes("frei") || status.includes("probe"))) return { ok: false, reason: "Mitarbeiter nicht aktiv" };
    if (normalize(driver.dayAvailability).includes("nicht")) return { ok: false, reason: "nicht verfügbar" };
    if (["abgelaufen", "fehlt", "gesperrt"].includes(normalize(driver.licenseStatus))) return { ok: false, reason: "Führerschein nicht gültig" };
    if (["abgelaufen", "fehlt", "gesperrt"].includes(normalize(driver.permitStatus))) return { ok: false, reason: "Taxischein nicht gültig" };
    if (!isInsideShift(appointment.time, driver.shiftStart, driver.shiftEnd)) return { ok: false, reason: "außerhalb Schicht" };

    const quals = Array.isArray(driver.qualifications) ? driver.qualifications.map((q) => normalize(q)) : [];
    const dest = normalize(appointment.destination || "");
    if (appointment.wheelchair && !(normalize(driver.vehicle).includes("200") || quals.some((q) => q.includes("rollstuhl")))) {
      return { ok: false, reason: "Rollstuhlqualifikation fehlt" };
    }
    if (dest.includes("dialyse") && !quals.some((q) => q.includes("dialyse") || q.includes("kranken"))) {
      return { ok: false, reason: "Dialysequalifikation fehlt" };
    }

    return { ok: true, reason: "einplanbar" };
  }

  function defaultAppointments() {
    const base = todayIso();
    return [
      {
        id: uid("AP"),
        name: "Herr Mueller",
        pickup: "Germersheim Sued 12",
        destination: "Dialyse Speyer",
        date: base,
        time: "08:00",
        phone: "0171 221100",
        medical: true,
        wheelchair: false,
        note: "Stammkunde",
        status: "Noch ungeplant",
        createdAt: nowIso()
      },
      {
        id: uid("AP"),
        name: "Frau Schmidt",
        pickup: "Lingenfeld Hauptstrasse 4",
        destination: "Karlsruhe Klinikum",
        date: base,
        time: "08:30",
        phone: "0171 441200",
        medical: true,
        wheelchair: false,
        note: "Anmeldung 10 Minuten vorher",
        status: "Noch ungeplant",
        createdAt: nowIso()
      },
      {
        id: uid("AP"),
        name: "Herr Cakir",
        pickup: "Bellheim Mitte 1",
        destination: "Flughafen Frankfurt",
        date: addDaysIso(base, 1),
        time: "09:10",
        phone: "0171 775510",
        medical: false,
        wheelchair: false,
        note: "1 Koffer",
        status: "Noch ungeplant",
        createdAt: nowIso()
      }
    ];
  }

  function createDefaultData() {
    return {
      version: 1,
      updatedAt: nowIso(),
      lastCaptureSeconds: 0,
      appointments: defaultAppointments(),
      suggestions: [],
      dayPlan: [],
      ai: {
        running: false,
        lastRunAt: "",
        stepsDone: []
      }
    };
  }

  function ensureShape(raw) {
    const base = createDefaultData();
    const next = { ...base, ...(raw || {}) };
    next.appointments = Array.isArray(next.appointments) ? next.appointments : [];
    next.suggestions = Array.isArray(next.suggestions) ? next.suggestions : [];
    next.dayPlan = Array.isArray(next.dayPlan) ? next.dayPlan : [];
    next.ai = { ...base.ai, ...(next.ai || {}) };
    next.ai.stepsDone = Array.isArray(next.ai.stepsDone) ? next.ai.stepsDone : [];
    return next;
  }

  function loadData() {
    const parsed = safeParse(localStorage.getItem(STORAGE_KEY));
    state.data = ensureShape(parsed);
    if (!parsed) saveData();
  }

  function saveData() {
    state.data.updatedAt = nowIso();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
  }

  function parseTimeMinutes(timeText) {
    const [h, m] = String(timeText || "00:00").split(":").map((v) => Number(v));
    return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
  }

  function addMinutesToTime(timeText, plus) {
    const total = parseTimeMinutes(timeText) + plus;
    const normalized = ((total % 1440) + 1440) % 1440;
    const h = Math.floor(normalized / 60);
    const m = normalized % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  function formatDate(iso) {
    const d = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(d.getTime())) return iso;
    return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
  }

  function compareAppointments(a, b) {
    const da = `${a.date || ""} ${a.time || ""}`;
    const db = `${b.date || ""} ${b.time || ""}`;
    return da.localeCompare(db, "de");
  }

  function groupLabel(isoDate) {
    const today = new Date(`${todayIso()}T00:00:00`);
    const date = new Date(`${isoDate}T00:00:00`);
    if (Number.isNaN(date.getTime())) return "Diese Woche";

    const diffDays = Math.round((date.getTime() - today.getTime()) / 86400000);
    if (diffDays <= 0) return "Heute";
    if (diffDays === 1) return "Morgen";
    if (diffDays === 2) return "Uebermorgen";

    const currentWeekStart = new Date(today);
    currentWeekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    const nextWeekStart = new Date(currentWeekStart);
    nextWeekStart.setDate(currentWeekStart.getDate() + 7);
    const followingWeekStart = new Date(currentWeekStart);
    followingWeekStart.setDate(currentWeekStart.getDate() + 14);

    if (date >= nextWeekStart && date < followingWeekStart) return "Naechste Woche";
    return "Diese Woche";
  }

  function collectTimelineGroups() {
    const groups = {
      Heute: [],
      Morgen: [],
      Uebermorgen: [],
      "Diese Woche": [],
      "Naechste Woche": []
    };

    state.data.appointments.forEach((item) => {
      const key = groupLabel(item.date);
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });

    Object.keys(groups).forEach((key) => groups[key].sort(compareAppointments));
    return groups;
  }

  function statusTone(status) {
    const normalized = String(status || "").toLowerCase();
    if (normalized.includes("abgerechnet") || normalized.includes("erledigt")) return "success";
    if (normalized.includes("unterwegs")) return "wichtig";
    if (normalized.includes("bestaetigt") || normalized.includes("geplant")) return "normal";
    if (normalized.includes("ungeplant") || normalized.includes("neu")) return "warnung";
    return "normal";
  }

  function renderFavorites() {
    const node = document.querySelector("[data-favorite-targets]");
    if (!node) return;
    node.innerHTML = FAVORITE_DESTINATIONS.map((target) => `<button type="button" data-fav-target="${target}">${target}</button>`).join("");
  }

  function renderCaptureInfo() {
    const node = document.querySelector("[data-capture-info]");
    if (!node) return;
    const sec = Number(state.data.lastCaptureSeconds || 0);
    if (!sec) {
      node.textContent = "Bereit fuer schnelle Aufnahme.";
      return;
    }
    const goalOk = sec <= 20;
    node.textContent = `Letzte Aufnahme: ${sec.toFixed(1)} Sekunden (${goalOk ? "unter 20 Sekunden" : "ueber 20 Sekunden"}).`;
  }

  function renderCustomerSuggestions() {
    const node = document.querySelector("[data-customer-suggest]");
    if (!node) return;
    node.innerHTML = [
      '<small class="m-note">Stammkunden:</small>',
      ...CUSTOMER_PROFILES.map((profile) => `<button type="button" data-customer-preset="${profile.name}">${profile.name}</button>`)
    ].join("");
  }

  function renderCustomerInsightByName(name) {
    const insightNode = document.querySelector("[data-customer-insight]");
    if (!insightNode) return;

    const needle = String(name || "").trim().toLowerCase();
    if (!needle) {
      insightNode.innerHTML = "<small>Tippe einen Namen, um letzte Fahrten zu sehen.</small>";
      return;
    }

    const matches = CUSTOMER_PROFILES.filter((item) => item.name.toLowerCase().includes(needle));
    if (!matches.length) {
      insightNode.innerHTML = "<small>Kein Stammkundenprofil gefunden. Termin kann trotzdem direkt gespeichert werden.</small>";
      return;
    }

    const selected = matches[0];
    insightNode.innerHTML = [
      `<small>${selected.name}</small>`,
      `<strong>Letzte Adresse: ${selected.lastPickup}</strong>`,
      `<p class="m-meta">Letztes Ziel: ${selected.lastDestination} · Letzte Uhrzeit: ${selected.lastTime}</p>`,
      `<p class="m-meta">Haeufige Fahrten: ${selected.frequentRides.join(", ")}</p>`
    ].join("");
  }

  function renderAiSteps() {
    const node = document.querySelector("[data-ai-steps]");
    if (!node) return;
    const stepsDone = state.data.ai.stepsDone || [];
    node.innerHTML = AI_STEPS.map((step) => {
      const done = stepsDone.includes(step);
      return `<li class="${done ? "done" : ""}">${done ? "✓" : "•"} ${step}</li>`;
    }).join("");
  }

  function renderTimeline() {
    const node = document.querySelector("[data-timeline]");
    if (!node) return;

    const groups = collectTimelineGroups();
    node.innerHTML = Object.entries(groups).map(([groupName, items]) => {
      const body = items.length
        ? `<div class="tc-time-list">${items.map((item) => {
            return [
              '<article class="tc-time-item">',
              '<div class="tc-time-main">',
              `<div class="tc-time">${item.time || "--:--"}</div>`,
              `<div><strong>${item.name}</strong><p>${item.destination}</p><p>${item.pickup}</p></div>`,
              `<span class="m-pill ${statusTone(item.status)}">${item.status}</span>`,
              "</div>",
              '<div class="tc-actions">',
              `<button type="button" data-call-driver="${item.id}">Fahrer telefonisch informiert</button>`,
              `<button type="button" data-create-return="${item.id}">Rueckfahrt erzeugen</button>`,
              `<select data-status-select="${item.id}">${STATUS_FLOW.map((status) => `<option value="${status}"${status === item.status ? " selected" : ""}>${status}</option>`).join("")}</select>`,
              "</div>",
              "</article>"
            ].join("");
          }).join("")}</div>`
        : '<p class="m-note">Keine Termine in diesem Zeitraum.</p>';

      return [
        '<section class="tc-time-group">',
        `<div class="tc-time-group-head"><h3>${groupName}</h3><small>${items.length} Termin(e)</small></div>`,
        body,
        "</section>"
      ].join("");
    }).join("");
  }

  function renderSuggestions() {
    const node = document.querySelector("[data-suggestions]");
    if (!node) return;

    const active = state.data.suggestions.filter((s) => s.status !== "abgelehnt");
    if (!active.length) {
      node.innerHTML = '<p class="m-note">Noch keine Vorschlaege vorhanden. Starte die KI-Planung fuer Demo-Vorschlaege.</p>';
      return;
    }

    node.innerHTML = active.map((suggestion) => {
      const route = (suggestion.route || []).map((step, index) => {
        const sep = index > 0 ? '<div class="tc-sep">↓</div>' : "";
        return `${sep}<div><span>${step.time}</span><b>${step.label}</b></div>`;
      }).join("");

      return [
        '<article class="tc-suggestion-card">',
        `<h3>${suggestion.vehicleLabel}</h3>`,
        `<p>${suggestion.driverName}</p>`,
        `<p class="m-meta">${suggestion.explain || "Demo-Vorschlag"}</p>`,
        `<div class="tc-route">${route}</div>`,
        '<div class="tc-metrics">',
        `<span>Geschaetzte Auslastung: ${suggestion.utilization}%</span>`,
        `<span>Geschaetzte Leerfahrt: ${suggestion.emptyKm} km</span>`,
        `<span>Geschaetzte Fahrzeit: ${suggestion.driveMin} min</span>`,
        "</div>",
        '<div class="tc-actions">',
        `<button type="button" data-suggest-accept="${suggestion.id}">Uebernehmen</button>`,
        `<button type="button" data-suggest-change-driver="${suggestion.id}">Anderen Fahrer waehlen</button>`,
        `<button type="button" data-suggest-manual="${suggestion.id}">Manuell planen</button>`,
        `<button type="button" data-suggest-reject="${suggestion.id}">Ablehnen</button>`,
        "</div>",
        "</article>"
      ].join("");
    }).join("");
  }

  function render() {
    renderFavorites();
    renderCaptureInfo();
    renderCustomerSuggestions();
    renderAiSteps();
    renderTimeline();
    renderSuggestions();
  }

  function appendDayPlanFromSuggestion(suggestion, manual) {
    const appointment = state.data.appointments.find((a) => a.id === suggestion.appointmentId);
    if (!appointment) return;

    const exists = state.data.dayPlan.some((entry) => entry.appointmentId === appointment.id);
    if (exists) return;

    state.data.dayPlan.push({
      id: uid("PLAN"),
      appointmentId: appointment.id,
      date: appointment.date,
      time: appointment.time,
      customer: appointment.name,
      destination: appointment.destination,
      pickup: appointment.pickup,
      vehicleLabel: manual ? "Manuelle Planung" : suggestion.vehicleLabel,
      driverName: manual ? "Disponent waehlt manuell" : suggestion.driverName,
      route: suggestion.route,
      utilization: suggestion.utilization,
      emptyKm: suggestion.emptyKm,
      driveMin: suggestion.driveMin,
      createdAt: nowIso()
    });
  }

  function buildDemoRoute(appointment) {
    const first = appointment.destination || "Ziel";
    const category = appointment.medical ? "Krankenfahrt" : first.toLowerCase().includes("flughafen") ? "Flughafen" : "Termin";
    return [
      { time: appointment.time, label: category },
      { time: addMinutesToTime(appointment.time, 70), label: first },
      { time: addMinutesToTime(appointment.time, 140), label: "Rueckfahrt" }
    ];
  }

  function nextVehicleChoice(currentVehicleId, wheelchairRequired) {
    const resources = loadLiveResources();
    const all = resources.vehicles.length ? resources.vehicles : [];
    if (!all.length) return { vehicle: null, driver: null };

    const filtered = wheelchairRequired ? all.filter((v) => v.wheelchair) : all;
    const list = filtered.length ? filtered : all;
    const currentIndex = list.findIndex((v) => v.id === currentVehicleId);
    const next = list[(currentIndex + 1 + list.length) % list.length];
    const driver = resources.drivers.find((d) => d.id === next.driverId) || resources.drivers[(currentIndex + 1 + resources.drivers.length) % resources.drivers.length] || { name: "Unbekannt" };
    return { vehicle: next, driver };
  }

  function generateSuggestions() {
    const resources = loadLiveResources();
    const bridge = loadDispatchBridge();
    const candidates = state.data.appointments
      .filter((a) => ["Noch ungeplant", "Neu"].includes(a.status))
      .sort(compareAppointments)
      .slice(0, 8);

    const fresh = candidates.map((appointment, index) => {
      const plannedForDate = bridge.plannedDrivers.filter((d) => d && d.shiftStart && d.shiftEnd);
      const regular = plannedForDate
        .filter((d) => !d.reserve)
        .map((d) => ({ data: d, check: isDriverRegularlyPlanable(d, appointment) }))
        .filter((d) => d.check.ok);
      const reserve = plannedForDate
        .filter((d) => d.reserve)
        .map((d) => ({ data: d, check: isDriverRegularlyPlanable(d, appointment) }))
        .filter((d) => d.check.ok);

      const picked = regular[0] || reserve[0] || null;
      const baseVehicle = picked
        ? { id: picked.data.employeeId, plate: picked.data.vehicle || `GER TX${100 + index}`, name: picked.data.vehicle || `GER TX${100 + index}`, driverId: picked.data.employeeId }
        : (resources.vehicles[index % Math.max(resources.vehicles.length, 1)] || { id: `VEH-${index}`, plate: `GER TX${100 + index}`, name: `GER TX${100 + index}`, driverId: "" });

      const driver = picked
        ? { name: picked.data.name || `Fahrer ${index + 1}` }
        : (resources.drivers.find((d) => d.id === baseVehicle.driverId) || resources.drivers[index % Math.max(resources.drivers.length, 1)] || { name: `Fahrer ${index + 1}` });

      const reasonText = picked
        ? (picked.data.reserve
          ? "Reservefahrer aus Plan für morgen"
          : "Eingeplanter Fahrer aus Plan für morgen")
        : "Kein eingeplanter Fahrer gefunden, Fallback aus Live-Demo";

      return {
        id: uid("SUG"),
        appointmentId: appointment.id,
        vehicleId: baseVehicle.id,
        vehicleLabel: baseVehicle.plate || baseVehicle.name || `GER TX${100 + index}`,
        driverName: driver.name,
        route: buildDemoRoute(appointment),
        utilization: Math.min(98, 82 + (index % 5) * 3),
        emptyKm: 2 + (index % 4),
        driveMin: 35 + (index % 4) * 12,
        explain: reasonText,
        status: "offen",
        createdAt: nowIso()
      };
    });

    const existingByAppointment = new Map(state.data.suggestions.map((s) => [s.appointmentId, s]));
    fresh.forEach((entry) => existingByAppointment.set(entry.appointmentId, entry));
    state.data.suggestions = [...existingByAppointment.values()];
  }

  function runAiSimulation() {
    if (state.data.ai.running) return;

    state.data.ai.running = true;
    state.data.ai.stepsDone = [];
    renderAiSteps();

    const steps = [...AI_STEPS];
    let index = 0;

    if (state.aiTimer) clearInterval(state.aiTimer);

    state.aiTimer = setInterval(() => {
      if (index < steps.length) {
        state.data.ai.stepsDone.push(steps[index]);
        index += 1;
        renderAiSteps();
        return;
      }

      clearInterval(state.aiTimer);
      state.aiTimer = null;
      state.data.ai.running = false;
      state.data.ai.lastRunAt = nowIso();
      generateSuggestions();
      saveData();
      render();
    }, 420);
  }

  function createReturnTrip(appointmentId) {
    const source = state.data.appointments.find((item) => item.id === appointmentId);
    if (!source) return;

    const returnEntry = {
      ...source,
      id: uid("AP"),
      pickup: source.destination,
      destination: source.pickup,
      time: addMinutesToTime(source.time, 120),
      status: "Noch ungeplant",
      note: source.note ? `${source.note} | Rueckfahrt` : "Rueckfahrt",
      createdAt: nowIso()
    };

    state.data.appointments.push(returnEntry);
    saveData();
    render();
  }

  function markPhoneConfirmed(appointmentId) {
    const appointment = state.data.appointments.find((item) => item.id === appointmentId);
    if (!appointment) return;
    appointment.status = "Bestaetigt";
    saveData();
    render();
  }

  function updateAppointmentStatus(appointmentId, status) {
    const appointment = state.data.appointments.find((item) => item.id === appointmentId);
    if (!appointment) return;
    appointment.status = status;
    saveData();
    render();
  }

  function addAppointmentFromForm(form) {
    const payload = Object.fromEntries(new FormData(form).entries());
    const required = [payload.name, payload.pickup, payload.destination, payload.date, payload.time].every((v) => String(v || "").trim());
    if (!required) return false;

    state.data.appointments.push({
      id: uid("AP"),
      name: String(payload.name || "").trim(),
      pickup: String(payload.pickup || "").trim(),
      destination: String(payload.destination || "").trim(),
      date: String(payload.date || "").trim(),
      time: String(payload.time || "").trim(),
      phone: String(payload.phone || "").trim(),
      medical: form.elements.medical.checked,
      wheelchair: form.elements.wheelchair.checked,
      note: String(payload.note || "").trim(),
      status: "Noch ungeplant",
      createdAt: nowIso()
    });

    const sec = (performance.now() - state.captureStartMs) / 1000;
    state.data.lastCaptureSeconds = sec;
    saveData();
    return true;
  }

  function bindForm() {
    const form = document.querySelector("[data-appointment-form]");
    if (!form) return;

    form.elements.date.value = todayIso();

    const startCapture = () => {
      if (!state.captureStartMs) state.captureStartMs = performance.now();
    };

    form.addEventListener("focusin", startCapture);

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      if (!addAppointmentFromForm(form)) return;
      form.reset();
      form.elements.date.value = todayIso();
      state.captureStartMs = 0;
      render();
    });

    form.elements.name.addEventListener("input", () => {
      renderCustomerInsightByName(form.elements.name.value);
    });
  }

  function bindClickActions() {
    document.addEventListener("click", (event) => {
      const aiButton = event.target.closest("[data-start-ai]");
      if (aiButton) {
        runAiSimulation();
        return;
      }

      const favoriteButton = event.target.closest("[data-fav-target]");
      if (favoriteButton) {
        const form = document.querySelector("[data-appointment-form]");
        if (!form) return;
        form.elements.destination.value = favoriteButton.getAttribute("data-fav-target") || "";
        return;
      }

      const customerPreset = event.target.closest("[data-customer-preset]");
      if (customerPreset) {
        const targetName = customerPreset.getAttribute("data-customer-preset") || "";
        const profile = CUSTOMER_PROFILES.find((item) => item.name === targetName);
        const form = document.querySelector("[data-appointment-form]");
        if (!profile || !form) return;
        form.elements.name.value = profile.name;
        form.elements.phone.value = profile.phone;
        form.elements.pickup.value = profile.lastPickup;
        form.elements.destination.value = profile.lastDestination;
        form.elements.time.value = profile.lastTime;
        renderCustomerInsightByName(profile.name);
        return;
      }

      const callBtn = event.target.closest("[data-call-driver]");
      if (callBtn) {
        markPhoneConfirmed(callBtn.getAttribute("data-call-driver") || "");
        return;
      }

      const returnBtn = event.target.closest("[data-create-return]");
      if (returnBtn) {
        createReturnTrip(returnBtn.getAttribute("data-create-return") || "");
        return;
      }

      const acceptBtn = event.target.closest("[data-suggest-accept]");
      if (acceptBtn) {
        const id = acceptBtn.getAttribute("data-suggest-accept") || "";
        const suggestion = state.data.suggestions.find((item) => item.id === id);
        if (!suggestion) return;
        appendDayPlanFromSuggestion(suggestion, false);
        const appointment = state.data.appointments.find((a) => a.id === suggestion.appointmentId);
        if (appointment) appointment.status = "Geplant";
        suggestion.status = "uebernommen";
        saveData();
        render();
        return;
      }

      const changeBtn = event.target.closest("[data-suggest-change-driver]");
      if (changeBtn) {
        const id = changeBtn.getAttribute("data-suggest-change-driver") || "";
        const suggestion = state.data.suggestions.find((item) => item.id === id);
        if (!suggestion) return;
        const appointment = state.data.appointments.find((a) => a.id === suggestion.appointmentId);
        const rotated = nextVehicleChoice(suggestion.vehicleId, Boolean(appointment && appointment.wheelchair));
        if (!rotated.vehicle) return;
        suggestion.vehicleId = rotated.vehicle.id;
        suggestion.vehicleLabel = rotated.vehicle.plate || rotated.vehicle.name;
        suggestion.driverName = rotated.driver && rotated.driver.name ? rotated.driver.name : suggestion.driverName;
        saveData();
        render();
        return;
      }

      const manualBtn = event.target.closest("[data-suggest-manual]");
      if (manualBtn) {
        const id = manualBtn.getAttribute("data-suggest-manual") || "";
        const suggestion = state.data.suggestions.find((item) => item.id === id);
        if (!suggestion) return;
        appendDayPlanFromSuggestion(suggestion, true);
        const appointment = state.data.appointments.find((a) => a.id === suggestion.appointmentId);
        if (appointment) appointment.status = "Geplant";
        suggestion.status = "manuell";
        saveData();
        render();
        return;
      }

      const rejectBtn = event.target.closest("[data-suggest-reject]");
      if (rejectBtn) {
        const id = rejectBtn.getAttribute("data-suggest-reject") || "";
        const suggestion = state.data.suggestions.find((item) => item.id === id);
        if (!suggestion) return;
        suggestion.status = "abgelehnt";
        saveData();
        render();
      }
    });

    document.addEventListener("change", (event) => {
      const select = event.target.closest("[data-status-select]");
      if (!select) return;
      updateAppointmentStatus(select.getAttribute("data-status-select") || "", String(select.value || "Noch ungeplant"));
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    loadData();
    bindForm();
    bindClickActions();
    renderCustomerInsightByName("");
    render();
  });
})();
