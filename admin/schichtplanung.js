(() => {
  const P = window.AdminPersonnelDemo;
  const S = window.AdminSystemCenter || {};
  const COCKPIT_KEY = "adminTerminCockpitV22Phase1";
  const LIVE_DISPO_KEY = "adminLiveDispoV131";
  const STORE_KEY = "adminV22DispatchPlanner";

  const SHIFT_TEMPLATES_DEFAULT = [
    { id: "early", name: "Frühschicht", start: "06:00", end: "14:00" },
    { id: "day", name: "Tagschicht", start: "08:00", end: "16:00" },
    { id: "late", name: "Spätschicht", start: "14:00", end: "22:00" },
    { id: "night", name: "Nachtschicht", start: "22:00", end: "06:00" },
    { id: "split", name: "Geteilte Schicht", start: "06:00", end: "11:00" },
    { id: "flex", name: "Flexibel", start: "09:00", end: "17:00" },
    { id: "custom", name: "Individuell", start: "08:00", end: "16:00" }
  ];

  const DAY_AVAILABILITY = [
    "vollständig verfügbar",
    "teilweise verfügbar",
    "erst ab bestimmter Uhrzeit",
    "nur bis bestimmter Uhrzeit",
    "Pause geplant",
    "nicht verfügbar",
    "Bereitschaft",
    "Reservefahrer"
  ];

  const EMPLOYMENT_TYPES = ["Vollzeit", "Teilzeit", "Minijob", "Aushilfe", "Springer"];

  const VEHICLE_FALLBACK = [
    { plate: "GER TX 100", status: "Verfügbar", type: "Normales Taxi" },
    { plate: "GER TX 200", status: "Verfügbar", type: "Rollstuhlfahrzeug" },
    { plate: "GER TX 300", status: "Verfügbar", type: "Großraumfahrzeug" },
    { plate: "GER TX 700", status: "Werkstatt", type: "Elektrofahrzeug" },
    { plate: "GER TX 800", status: "Gesperrt", type: "Mercedes V-Klasse" }
  ];

  const state = {
    personnel: null,
    planner: null,
    activeFilter: "Alle",
    searchTerm: "",
    selectedTomorrow: new Set(),
    selectedSuggestion: "",
    dateToday: "",
    dateTomorrow: ""
  };

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

  function formatDate(value) {
    const text = String(value || "").trim();
    if (!text) return "-";
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(text)) return text;
    if (S.formatDate) return S.formatDate(text);
    const date = new Date(`${text}T00:00:00`);
    if (Number.isNaN(date.getTime())) return text;
    return `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}.${date.getFullYear()}`;
  }

  function formatDateTime(value) {
    const text = String(value || "").trim();
    if (!text) return "-";
    if (S.formatDateTime) return S.formatDateTime(text);
    const match = text.match(/^(\d{4}-\d{2}-\d{2})[\sT](\d{2}:\d{2})/);
    if (!match) return formatDate(text);
    return `${formatDate(match[1])} · ${match[2]} Uhr`;
  }

  function todayIso() {
    return P && typeof P.todayIso === "function"
      ? P.todayIso()
      : new Date().toISOString().slice(0, 10);
  }

  function addDaysIso(baseIso, plus) {
    const d = new Date(`${baseIso}T00:00:00`);
    d.setDate(d.getDate() + plus);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function nowStamp() {
    const d = new Date();
    return `${todayIso()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }

  function uid(prefix) {
    return `${prefix}-${Math.random().toString(36).slice(2, 7)}-${Date.now().toString(36)}`;
  }

  function parseTime(timeText) {
    const [h, m] = String(timeText || "00:00").split(":").map((v) => Number(v));
    return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
  }

  function overlaps(startA, endA, startB, endB) {
    const a1 = parseTime(startA);
    const a2 = parseTime(endA);
    const b1 = parseTime(startB);
    const b2 = parseTime(endB);
    const aEnd = a2 <= a1 ? a2 + 1440 : a2;
    const bEnd = b2 <= b1 ? b2 + 1440 : b2;
    return a1 < bEnd && b1 < aEnd;
  }

  function minutesToDuration(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  function ensurePlannerShape(raw) {
    const base = {
      version: 1,
      updatedAt: nowStamp(),
      templates: SHIFT_TEMPLATES_DEFAULT,
      todayAssignments: [],
      tomorrowPlan: [],
      suggestions: [],
      confirmedPlan: [],
      phoneStatusByDriver: {}
    };
    const next = { ...base, ...(raw || {}) };
    next.templates = Array.isArray(next.templates) && next.templates.length ? next.templates : SHIFT_TEMPLATES_DEFAULT;
    next.todayAssignments = Array.isArray(next.todayAssignments) ? next.todayAssignments : [];
    next.tomorrowPlan = Array.isArray(next.tomorrowPlan) ? next.tomorrowPlan : [];
    next.suggestions = Array.isArray(next.suggestions) ? next.suggestions : [];
    next.confirmedPlan = Array.isArray(next.confirmedPlan) ? next.confirmedPlan : [];
    next.phoneStatusByDriver = next.phoneStatusByDriver && typeof next.phoneStatusByDriver === "object" ? next.phoneStatusByDriver : {};
    return next;
  }

  function loadPlanner() {
    const parsed = safeParse(localStorage.getItem(STORE_KEY));
    return ensurePlannerShape(parsed);
  }

  function savePlanner() {
    state.planner.updatedAt = nowStamp();
    localStorage.setItem(STORE_KEY, JSON.stringify(state.planner));
  }

  function loadPersonnel() {
    if (!P || typeof P.loadState !== "function") return { employees: [], documents: [], vacations: [], absences: [], availabilities: [] };
    return P.loadState();
  }

  function loadCockpitAppointments() {
    const parsed = safeParse(localStorage.getItem(COCKPIT_KEY)) || {};
    return Array.isArray(parsed.appointments) ? parsed.appointments : [];
  }

  function loadVehicles() {
    const live = safeParse(localStorage.getItem(LIVE_DISPO_KEY)) || {};
    if (Array.isArray(live.vehicles) && live.vehicles.length) {
      return live.vehicles.map((v) => ({
        plate: String(v.plate || v.name || v.id || "-").trim(),
        status: v.locked ? "Gesperrt" : (v.status || "Verfügbar"),
        type: v.wheelchair ? "Rollstuhlfahrzeug" : "Normales Taxi"
      }));
    }
    return VEHICLE_FALLBACK;
  }

  function employeeName(emp) {
    return `${emp.firstName || ""} ${emp.lastName || ""}`.trim();
  }

  function getDocStatus(employeeId, type) {
    const docs = state.personnel.documents.filter((d) => d.employeeId === employeeId && d.type === type);
    if (!docs.length) return "fehlt";
    const critical = docs.find((d) => normalize(d.status) === "abgelaufen" || normalize(d.status) === "fehlt");
    if (critical) return "abgelaufen";
    const soon = docs.find((d) => normalize(d.status).includes("bald"));
    if (soon) return "läuft bald ab";
    const untested = docs.find((d) => normalize(d.status).includes("ungepruft") || normalize(d.status).includes("ungeprueft"));
    if (untested) return "ungeprüft";
    return "gültig";
  }

  function defaultDayAvailability(emp) {
    if (normalize(emp.status).includes("krank")) return "nicht verfügbar";
    if (normalize(emp.status).includes("urlaub")) return "nicht verfügbar";
    if (normalize(emp.status).includes("gesperrt")) return "nicht verfügbar";
    return "vollständig verfügbar";
  }

  function employeeAvailabilityOnDate(emp, dateIso) {
    const hasVacation = state.personnel.vacations.some((v) => v.employeeId === emp.id && ["genehmigt", "teilweise genehmigt"].includes(v.status) && dateIso >= v.start && dateIso <= v.end);
    if (hasVacation) return "nicht verfügbar";
    const hasAbsence = state.personnel.absences.some((a) => a.employeeId === emp.id && a.status !== "abgeschlossen" && dateIso >= a.start && dateIso <= a.expectedEnd);
    if (hasAbsence) return "nicht verfügbar";

    const manual = state.personnel.availabilities.find((a) => a.employeeId === emp.id && dateIso >= a.start && dateIso <= a.end);
    if (manual && manual.mode) {
      const m = normalize(manual.mode);
      if (m.includes("nicht")) return "nicht verfügbar";
      if (m.includes("bevorzugt")) return "vollständig verfügbar";
      if (m.includes("fruh") || m.includes("frueh") || m.includes("spat") || m.includes("spaet") || m.includes("nacht")) return "teilweise verfügbar";
      return "teilweise verfügbar";
    }

    return defaultDayAvailability(emp);
  }

  function findTemplateById(id) {
    return state.planner.templates.find((t) => t.id === id) || state.planner.templates[0];
  }

  function shiftLabel(start, end, templateName) {
    const label = templateName || "Schicht";
    return `${label} ${start}-${end}`;
  }

  function pickDefaultVehicle(emp) {
    if (emp.fixedVehicle) return emp.fixedVehicle;
    if (emp.activeVehicle && emp.activeVehicle !== "-") return emp.activeVehicle;
    if (emp.preferredVehicle) return emp.preferredVehicle;
    return "";
  }

  function ensureTodayAssignments() {
    const today = state.dateToday;
    const existing = new Map(state.planner.todayAssignments.map((a) => [a.employeeId, a]));

    state.personnel.employees
      .filter((e) => e.role === "Fahrer")
      .forEach((emp) => {
        if (existing.has(emp.id)) return;
        const template = findTemplateById("day");
        state.planner.todayAssignments.push({
          id: uid("TOD"),
          date: today,
          employeeId: emp.id,
          employmentType: emp.employmentType || "Vollzeit",
          start: template.start,
          end: template.end,
          shiftTemplateId: template.id,
          status: normalize(emp.status).includes("dienst") ? "im Dienst" : "verfügbar",
          vehicle: pickDefaultVehicle(emp),
          licenseStatus: getDocStatus(emp.id, "Fuehrerschein"),
          permitStatus: getDocStatus(emp.id, "Personenbefoerderungsschein"),
          qualifications: Array.isArray(emp.qualifications) ? emp.qualifications : [],
          dayAvailability: employeeAvailabilityOnDate(emp, today),
          availabilityFrom: "",
          availabilityTo: "",
          currentRide: "",
          nextRide: "",
          reserve: false,
          exceptionNote: ""
        });
      });
  }

  function ensureTomorrowPlan() {
    const tomorrow = state.dateTomorrow;
    const existing = new Map(state.planner.tomorrowPlan.map((a) => [a.employeeId, a]));

    state.personnel.employees
      .filter((e) => e.role === "Fahrer")
      .forEach((emp) => {
        if (existing.has(emp.id)) return;
        const template = findTemplateById("day");
        state.planner.tomorrowPlan.push({
          id: uid("TOM"),
          date: tomorrow,
          employeeId: emp.id,
          active: false,
          reserve: false,
          shiftTemplateId: template.id,
          start: template.start,
          end: template.end,
          vehicle: "",
          preferredServiceType: "",
          note: "",
          dayAvailability: employeeAvailabilityOnDate(emp, tomorrow),
          exceptionNote: ""
        });
      });
  }

  function getEmployee(employeeId) {
    return state.personnel.employees.find((e) => e.id === employeeId) || null;
  }

  function statusBadge(text) {
    const n = normalize(text);
    const cls = n.includes("gesperrt") || n.includes("krank") || n.includes("abgelaufen") || n.includes("nicht")
      ? "shift-warning-red"
      : n.includes("urlaub") || n.includes("bald") || n.includes("teil") || n.includes("pause")
        ? "shift-warning-yellow"
        : "shift-role";
    return `<span class="shift-warning-chip ${cls}">${text}</span>`;
  }

  function isVehicleAvailable(plate) {
    if (!plate) return true;
    const row = loadVehicles().find((v) => normalize(v.plate) === normalize(plate));
    if (!row) return true;
    const s = normalize(row.status);
    return !(s.includes("werkstatt") || s.includes("gesperrt"));
  }

  function hasQualification(emp, appointment) {
    const quals = Array.isArray(emp.qualifications) ? emp.qualifications.map((q) => normalize(q)) : [];
    const dest = normalize(appointment.destination || "");

    if (appointment.wheelchair && !emp.wheelchairSkill) return false;
    if (dest.includes("dialyse") && !quals.some((q) => q.includes("dialyse") || q.includes("kranken"))) return false;
    if ((dest.includes("chemo") || dest.includes("strahlen")) && !quals.some((q) => q.includes("chemo") || q.includes("strahlen") || q.includes("kranken"))) return false;
    if (dest.includes("schul") && !quals.some((q) => q.includes("schuler") || q.includes("schüler"))) return false;
    if (dest.includes("bahn") && !quals.some((q) => q.includes("bahn"))) return false;
    if (dest.includes("flughafen") && !quals.some((q) => q.includes("flughafen"))) return false;
    return true;
  }

  function checkPlanable(entry, dateIso) {
    const emp = getEmployee(entry.employeeId);
    if (!emp) return { ok: false, reason: "Mitarbeiter nicht gefunden" };

    const nStatus = normalize(emp.status);
    if (!(nStatus.includes("aktiv") || nStatus.includes("dienst") || nStatus.includes("frei") || nStatus.includes("probe"))) {
      return { ok: false, reason: "Mitarbeiter nicht aktiv" };
    }
    if (employeeAvailabilityOnDate(emp, dateIso) === "nicht verfügbar") {
      return { ok: false, reason: "Mitarbeiter ist krank, im Urlaub oder nicht verfügbar" };
    }
    if (["abgelaufen", "fehlt", "gesperrt"].includes(normalize(getDocStatus(emp.id, "Fuehrerschein")))) {
      return { ok: false, reason: "Führerschein nicht gültig" };
    }
    if (["abgelaufen", "fehlt", "gesperrt"].includes(normalize(getDocStatus(emp.id, "Personenbefoerderungsschein")))) {
      return { ok: false, reason: "Taxischein nicht gültig" };
    }
    if (entry.vehicle && !isVehicleAvailable(entry.vehicle)) {
      return { ok: false, reason: "Fahrzeug ist in Werkstatt oder gesperrt" };
    }

    return { ok: true, reason: "einplanbar" };
  }

  function appointmentDuration(appointment) {
    const base = normalize(appointment.destination || "").includes("flughafen") ? 90 : 45;
    const addWheel = appointment.wheelchair ? 20 : 0;
    const addMedical = appointment.medical ? 10 : 0;
    return base + addWheel + addMedical;
  }

  function prepareDemoSuggestions() {
    const tomorrowAppointments = loadCockpitAppointments()
      .filter((a) => a.date === state.dateTomorrow)
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`, "de"));

    const planned = state.planner.tomorrowPlan.filter((row) => row.active);
    const regularPool = planned.filter((row) => !row.reserve);
    const reservePool = planned.filter((row) => row.reserve);

    const result = [];
    const assignmentsPerDriver = {};

    tomorrowAppointments.forEach((appointment) => {
      const candidates = [];
      const allPools = [...regularPool, ...reservePool];

      allPools.forEach((row) => {
        const emp = getEmployee(row.employeeId);
        if (!emp) return;

        const check = checkPlanable(row, state.dateTomorrow);
        if (!check.ok) {
          candidates.push({
            employeeId: emp.id,
            employeeName: employeeName(emp),
            score: -999,
            allowed: false,
            reserve: Boolean(row.reserve),
            vehicle: row.vehicle || pickDefaultVehicle(emp) || "flexibles Fahrzeug",
            reasons: [check.reason]
          });
          return;
        }

        if (!hasQualification(emp, appointment)) {
          candidates.push({
            employeeId: emp.id,
            employeeName: employeeName(emp),
            score: -200,
            allowed: false,
            reserve: Boolean(row.reserve),
            vehicle: row.vehicle || pickDefaultVehicle(emp) || "flexibles Fahrzeug",
            reasons: ["Notwendige Qualifikation fehlt"]
          });
          return;
        }

        if (appointment.wheelchair && !(emp.wheelchairSkill || normalize(row.vehicle).includes("200"))) {
          candidates.push({
            employeeId: emp.id,
            employeeName: employeeName(emp),
            score: -180,
            allowed: false,
            reserve: Boolean(row.reserve),
            vehicle: row.vehicle || pickDefaultVehicle(emp) || "flexibles Fahrzeug",
            reasons: ["Rollstuhlfahrzeug erforderlich"]
          });
          return;
        }

        const slotStart = appointment.time;
        const slotEndMinutes = parseTime(appointment.time) + appointmentDuration(appointment);
        const slotEnd = minutesToDuration(slotEndMinutes);

        if (!overlaps(row.start, row.end, slotStart, slotEnd)) {
          candidates.push({
            employeeId: emp.id,
            employeeName: employeeName(emp),
            score: -120,
            allowed: false,
            reserve: Boolean(row.reserve),
            vehicle: row.vehicle || pickDefaultVehicle(emp) || "flexibles Fahrzeug",
            reasons: ["Termin liegt außerhalb der Schicht"]
          });
          return;
        }

        const existing = assignmentsPerDriver[emp.id] || [];
        const overlapExisting = existing.find((item) => overlaps(item.start, item.end, slotStart, slotEnd));
        if (overlapExisting) {
          candidates.push({
            employeeId: emp.id,
            employeeName: employeeName(emp),
            score: -110,
            allowed: false,
            reserve: Boolean(row.reserve),
            vehicle: row.vehicle || pickDefaultVehicle(emp) || "flexibles Fahrzeug",
            reasons: [`Konflikt mit Rückfahrt um ${overlapExisting.start} Uhr.`]
          });
          return;
        }

        let score = 100;
        const reasons = [];

        if (row.vehicle) {
          score += 8;
          reasons.push("Feste Fahrzeugzuweisung berücksichtigt.");
        }

        if (appointment.medical) {
          score += 5;
          reasons.push("Medizinische Fahrt passt zur Qualifikation.");
        }

        if (appointment.wheelchair) {
          score += 6;
          reasons.push("Rollstuhlfahrzeug erforderlich.");
        }

        if (existing.length) {
          const last = existing[existing.length - 1];
          const gap = parseTime(slotStart) - parseTime(last.end);
          if (gap >= 0 && gap <= 40) {
            score += 9;
            reasons.push("Passt direkt nach der Dialyserückfahrt.");
          } else if (gap >= 0 && gap <= 75) {
            score += 6;
            reasons.push("Nur kurze Leerfahrt.");
          } else {
            score -= 3;
            reasons.push("Längere Leerfahrt möglich.");
          }
        } else {
          reasons.push("Startet innerhalb geplanter Schicht.");
        }

        if (row.reserve) {
          score -= 12;
          reasons.push("Reservefahrer separat priorisiert.");
        }

        candidates.push({
          employeeId: emp.id,
          employeeName: employeeName(emp),
          score,
          allowed: true,
          reserve: Boolean(row.reserve),
          vehicle: row.vehicle || pickDefaultVehicle(emp) || "flexibles Fahrzeug",
          reasons
        });
      });

      const allowed = candidates.filter((c) => c.allowed && !c.reserve).sort((a, b) => b.score - a.score);
      const reserve = candidates.filter((c) => c.allowed && c.reserve).sort((a, b) => b.score - a.score);
      const blocked = candidates.filter((c) => !c.allowed);

      const pick = allowed[0] || reserve[0] || null;

      const duration = appointmentDuration(appointment);
      const estimatedEnd = minutesToDuration(parseTime(appointment.time) + duration);
      if (pick) {
        assignmentsPerDriver[pick.employeeId] = assignmentsPerDriver[pick.employeeId] || [];
        assignmentsPerDriver[pick.employeeId].push({ start: appointment.time, end: estimatedEnd });
      }

      result.push({
        id: uid("SUG"),
        appointmentId: appointment.id,
        customer: appointment.name,
        pickup: appointment.pickup,
        destination: appointment.destination,
        time: appointment.time,
        estimatedEnd,
        driverId: pick ? pick.employeeId : "",
        driverName: pick ? pick.employeeName : "Kein regulärer Vorschlag",
        vehicle: pick ? pick.vehicle : "Kein geeignetes Fahrzeug",
        reserveSuggestion: Boolean(pick && pick.reserve),
        reasons: pick ? pick.reasons : ["Keine einplanbare Besetzung gefunden"],
        blockedReasons: blocked.slice(0, 3).map((b) => `${b.employeeName}: ${b.reasons.join(" ")}`),
        status: "offen",
        manualOverrideNote: ""
      });
    });

    state.planner.suggestions = result;
    savePlanner();
  }

  function getTodayVisibleRows() {
    const rows = state.planner.todayAssignments.map((row) => {
      const emp = getEmployee(row.employeeId);
      if (!emp) return null;
      return { row, emp };
    }).filter(Boolean);

    return rows.filter(({ row, emp }) => {
      if (state.activeFilter !== "Alle" && row.status !== state.activeFilter) return false;
      const q = normalize(state.searchTerm).trim();
      if (!q) return true;
      const blob = normalize([
        employeeName(emp),
        emp.employeeId,
        row.vehicle,
        row.start,
        row.end,
        row.status,
        row.dayAvailability,
        row.currentRide,
        row.nextRide
      ].join(" "));
      return blob.includes(q);
    });
  }

  function renderStats() {
    const stats = {
      driversToday: state.planner.todayAssignments.filter((r) => normalize(r.status).includes("dienst") || normalize(r.status).includes("verf")).length,
      vehiclesAvailable: loadVehicles().filter((v) => isVehicleAvailable(v.plate)).length,
      early: state.planner.todayAssignments.filter((r) => parseTime(r.start) < 8 * 60).length,
      late: state.planner.todayAssignments.filter((r) => parseTime(r.start) >= 13 * 60 && parseTime(r.start) < 20 * 60).length,
      night: state.planner.todayAssignments.filter((r) => parseTime(r.start) >= 20 * 60 || parseTime(r.start) < 5 * 60).length,
      missingAssignments: state.planner.todayAssignments.filter((r) => !r.vehicle || normalize(r.dayAvailability).includes("nicht") || normalize(r.licenseStatus).includes("abgelaufen") || normalize(r.permitStatus).includes("abgelaufen")).length
    };

    Object.entries(stats).forEach(([k, v]) => {
      const node = document.querySelector(`[data-shift-stat="${k}"]`);
      if (node) node.textContent = String(v);
    });
  }

  function renderTimeline() {
    const node = document.querySelector("[data-shift-timeline]");
    if (!node) return;

    const buckets = [
      { id: "frueh", label: "Frühschicht", start: "06:00", end: "14:00" },
      { id: "tag", label: "Tagschicht", start: "08:00", end: "16:00" },
      { id: "spaet", label: "Spätschicht", start: "14:00", end: "22:00" },
      { id: "nacht", label: "Nachtschicht", start: "22:00", end: "06:00" }
    ];

    node.innerHTML = buckets.map((bucket) => {
      const list = state.planner.todayAssignments
        .filter((r) => {
          const t = parseTime(r.start);
          if (bucket.id === "frueh") return t >= 5 * 60 && t < 8 * 60;
          if (bucket.id === "tag") return t >= 8 * 60 && t < 13 * 60;
          if (bucket.id === "spaet") return t >= 13 * 60 && t < 20 * 60;
          return t >= 20 * 60 || t < 5 * 60;
        })
        .map((r) => {
          const emp = getEmployee(r.employeeId);
          return `${employeeName(emp)} (${r.vehicle || "kein Fahrzeug"})`;
        });

      return `
        <article class="shift-timeline-slot">
          <h3>${bucket.label} ${bucket.start}–${bucket.end}</h3>
          <p>${list.length} Mitarbeitende eingeplant</p>
          <ul>${list.length ? list.map((x) => `<li>${x}</li>`).join("") : "<li>Keine Besetzung</li>"}</ul>
        </article>
      `;
    }).join("");
  }

  function renderTodayList() {
    const node = document.querySelector("[data-shift-driver-grid]");
    if (!node) return;

    const rows = getTodayVisibleRows();
    if (!rows.length) {
      node.innerHTML = '<article class="shift-empty admin-empty-state"><strong>Keine Einträge</strong><p>Filter zurücksetzen oder Suche anpassen.</p><button class="admin-btn admin-btn-secondary" type="button" data-shift-reset>Filter zurücksetzen</button></article>';
      return;
    }

    node.innerHTML = rows.map(({ row, emp }) => {
      const availabilityParts = [row.dayAvailability];
      if (row.availabilityFrom) availabilityParts.push(`ab ${row.availabilityFrom}`);
      if (row.availabilityTo) availabilityParts.push(`bis ${row.availabilityTo}`);
      return `
        <article class="shift-driver-card">
          <header class="shift-driver-head">
            <div>
              <h2>${employeeName(emp)}</h2>
              <span class="shift-role">${emp.employmentType || "-"}</span>
            </div>
            ${statusBadge(row.status)}
          </header>

          <dl class="shift-meta-list">
            <div><dt>Schichtbeginn</dt><dd>${row.start}</dd></div>
            <div><dt>Schichtende</dt><dd>${row.end}</dd></div>
            <div><dt>Zugewiesenes Fahrzeug</dt><dd>${row.vehicle || "-"}</dd></div>
            <div><dt>Führerscheinstatus</dt><dd>${row.licenseStatus}</dd></div>
            <div><dt>Taxischein/Personenbeförderungsscheinstatus</dt><dd>${row.permitStatus}</dd></div>
            <div><dt>Qualifikationen</dt><dd>${Array.isArray(row.qualifications) && row.qualifications.length ? row.qualifications.join(", ") : "-"}</dd></div>
            <div><dt>Verfügbare Zeit</dt><dd>${availabilityParts.join(" · ")}</dd></div>
            <div><dt>Aktuelle Fahrt</dt><dd>${row.currentRide || "-"}</dd></div>
            <div><dt>Nächste Fahrt</dt><dd>${row.nextRide || "-"}</dd></div>
          </dl>

          <div class="shift-actions">
            <button class="admin-btn" type="button" data-today-action="plan" data-employee-id="${emp.id}">Mitarbeiter für heute einplanen</button>
            <button class="admin-btn" type="button" data-today-action="vehicle" data-employee-id="${emp.id}">Fahrzeug zuweisen</button>
            <button class="admin-btn" type="button" data-today-action="shift" data-employee-id="${emp.id}">Schicht ändern</button>
            <button class="admin-btn" type="button" data-today-action="status" data-employee-id="${emp.id}">Status ändern</button>
            <button class="admin-btn admin-btn-warning" type="button" data-today-action="logout" data-employee-id="${emp.id}">Mitarbeiter abmelden</button>
            <button class="admin-btn admin-btn-secondary" type="button" data-today-action="replace" data-employee-id="${emp.id}">Ersatzfahrer wählen</button>
          </div>
        </article>
      `;
    }).join("");
  }

  function renderWarnings() {
    const node = document.querySelector("[data-shift-warning-list]");
    if (!node) return;

    const warnings = [];
    state.planner.todayAssignments.forEach((row) => {
      const emp = getEmployee(row.employeeId);
      if (!emp) return;
      const label = employeeName(emp);

      if (normalize(row.licenseStatus).includes("abgelaufen")) warnings.push({ level: "Rot", text: `${label}: Führerschein abgelaufen` });
      if (normalize(row.permitStatus).includes("abgelaufen")) warnings.push({ level: "Rot", text: `${label}: Taxischein abgelaufen` });
      if (normalize(row.licenseStatus).includes("bald")) warnings.push({ level: "Gelb", text: `${label}: Führerschein ist bald fällig` });
      if (normalize(row.permitStatus).includes("bald")) warnings.push({ level: "Gelb", text: `${label}: Taxischein ist bald fällig` });
      if (normalize(row.dayAvailability).includes("nicht")) warnings.push({ level: "Rot", text: `${label}: Fahrer ist nicht verfügbar` });
      if (normalize(row.status).includes("krank")) warnings.push({ level: "Rot", text: `${label}: Fahrer ist krank` });
      if (normalize(row.status).includes("urlaub")) warnings.push({ level: "Rot", text: `${label}: Fahrer ist im Urlaub` });
      if (normalize(row.status).includes("gesperrt")) warnings.push({ level: "Rot", text: `${label}: Fahrer ist gesperrt` });

      if (row.vehicle && !isVehicleAvailable(row.vehicle)) warnings.push({ level: "Rot", text: `${label}: Fahrzeug in Werkstatt oder gesperrt` });

      if (overlaps(row.start, row.end, row.end, row.start)) {
        warnings.push({ level: "Gelb", text: `${label}: Schicht ist ungewöhnlich konfiguriert` });
      }
    });

    const output = warnings.length ? warnings : [{ level: "Grün", text: "Keine kritischen Warnungen" }];

    node.innerHTML = output.map((w) => {
      const cls = w.level === "Rot" ? "shift-warning-red" : w.level === "Gelb" ? "shift-warning-yellow" : "shift-role";
      return `<article class="shift-warning-item"><strong class="shift-warning-chip ${cls}">${w.level}</strong><p>${w.text}</p></article>`;
    }).join("");
  }

  function renderVehicleMapping() {
    const node = document.querySelector("[data-shift-mapping-list]");
    if (!node) return;

    const rows = state.planner.todayAssignments
      .map((r) => {
        const emp = getEmployee(r.employeeId);
        return { plate: r.vehicle || "Kein Fahrzeug", driver: emp ? employeeName(emp) : "-" };
      })
      .sort((a, b) => a.plate.localeCompare(b.plate, "de"));

    node.innerHTML = rows.map((r) => `<article class="shift-mapping-item"><strong>${r.plate}</strong><p>→ ${r.driver}</p></article>`).join("");
  }

  function renderTomorrowPlanner() {
    const node = document.querySelector("[data-tomorrow-list]");
    if (!node) return;

    const rows = state.planner.tomorrowPlan
      .map((row) => ({ row, emp: getEmployee(row.employeeId) }))
      .filter((x) => x.emp)
      .sort((a, b) => employeeName(a.emp).localeCompare(employeeName(b.emp), "de"));

    node.innerHTML = rows.map(({ row, emp }) => {
      const checked = row.active ? "checked" : "";
      const selected = state.selectedTomorrow.has(row.employeeId) ? "checked" : "";
      const planability = checkPlanable(row, state.dateTomorrow);
      return `
        <article class="shift-plan-row">
          <label class="shift-plan-toggle"><input type="checkbox" data-plan-active="${row.employeeId}" ${checked}> Morgen aktiv</label>
          <label class="shift-plan-toggle"><input type="checkbox" data-plan-selected="${row.employeeId}" ${selected}> Auswahl</label>
          <strong>${employeeName(emp)}</strong>
          <span>${emp.employmentType || "-"}</span>
          <select data-plan-template="${row.employeeId}">
            ${state.planner.templates.map((t) => `<option value="${t.id}"${t.id === row.shiftTemplateId ? " selected" : ""}>${t.name}</option>`).join("")}
          </select>
          <input type="time" value="${row.start}" data-plan-start="${row.employeeId}">
          <input type="time" value="${row.end}" data-plan-end="${row.employeeId}">
          <input type="text" placeholder="Optionales Fahrzeug" value="${row.vehicle || ""}" data-plan-vehicle="${row.employeeId}">
          <input type="text" placeholder="Bevorzugte Einsatzart" value="${row.preferredServiceType || ""}" data-plan-service="${row.employeeId}">
          <input type="text" placeholder="Bemerkung" value="${row.note || ""}" data-plan-note="${row.employeeId}">
          <select data-plan-availability="${row.employeeId}">
            ${DAY_AVAILABILITY.map((x) => `<option value="${x}"${x === row.dayAvailability ? " selected" : ""}>${x}</option>`).join("")}
          </select>
          <label class="shift-plan-toggle"><input type="checkbox" data-plan-reserve="${row.employeeId}" ${row.reserve ? "checked" : ""}> Reservefahrer</label>
          <small>${planability.ok ? "Einplanbar" : `Nicht regulär einplanbar: ${planability.reason}`}</small>
        </article>
      `;
    }).join("");
  }

  function renderTemplates() {
    const node = document.querySelector("[data-template-list]");
    if (!node) return;

    node.innerHTML = state.planner.templates.map((t) => {
      return `
        <article class="shift-template-row">
          <strong>${t.name}</strong>
          <label>Beginn <input type="time" value="${t.start}" data-template-start="${t.id}"></label>
          <label>Ende <input type="time" value="${t.end}" data-template-end="${t.id}"></label>
        </article>
      `;
    }).join("");
  }

  function renderSuggestions() {
    const node = document.querySelector("[data-suggestion-list]");
    if (!node) return;

    if (!state.planner.suggestions.length) {
      node.innerHTML = '<p class="shift-modal-note">Noch keine Vorschläge. Klicke auf „Planung für morgen erstellen“.</p>';
      return;
    }

    node.innerHTML = state.planner.suggestions.map((s) => {
      const selectedCls = state.selectedSuggestion === s.id ? " is-selected" : "";
      const reasonText = s.reasons.map((r) => `<li>${r}</li>`).join("");
      const blocked = s.blockedReasons.length ? `<p class="person-meta">Nicht reguläre Optionen: ${s.blockedReasons.join(" | ")}</p>` : "";
      return `
        <article class="shift-suggestion-card${selectedCls}">
          <header>
            <strong>${s.time} ${s.customer}</strong>
            <span>${s.driverName}</span>
          </header>
          <p>${s.pickup} → ${s.destination}</p>
          <p>Fahrzeug: ${s.vehicle} · Ende ca. ${s.estimatedEnd}</p>
          ${s.reserveSuggestion ? '<p class="person-meta">Reservefahrer vorgeschlagen</p>' : ""}
          <ul>${reasonText}</ul>
          ${blocked}
          <div class="shift-actions">
            <button class="admin-btn" type="button" data-suggest-select="${s.id}">Auswählen</button>
            <button class="admin-btn" type="button" data-suggest-accept="${s.id}">Einzelne Zuordnung übernehmen</button>
            <button class="admin-btn" type="button" data-suggest-change-driver="${s.id}">Fahrer austauschen</button>
            <button class="admin-btn" type="button" data-suggest-change-vehicle="${s.id}">Fahrzeug austauschen</button>
            <button class="admin-btn" type="button" data-suggest-shift="${s.id}">Fahrt verschieben</button>
            <button class="admin-btn admin-btn-warning" type="button" data-suggest-unplanned="${s.id}">Ungeplant lassen</button>
            <button class="admin-btn admin-btn-secondary" type="button" data-suggest-manual="${s.id}">Manuell zuweisen</button>
          </div>
        </article>
      `;
    }).join("");
  }

  function renderDriverDayPlans() {
    const node = document.querySelector("[data-driver-dayplans]");
    if (!node) return;

    if (!state.planner.confirmedPlan.length) {
      node.innerHTML = '<p class="shift-modal-note">Noch keine bestätigten Fahrer-Tagespläne.</p>';
      return;
    }

    const grouped = {};
    state.planner.confirmedPlan.forEach((row) => {
      grouped[row.driverId] = grouped[row.driverId] || [];
      grouped[row.driverId].push(row);
    });

    node.innerHTML = Object.entries(grouped).map(([driverId, rides]) => {
      const emp = getEmployee(driverId);
      const first = rides[0];
      const shift = state.planner.tomorrowPlan.find((x) => x.employeeId === driverId);
      const vehicle = shift && shift.vehicle ? shift.vehicle : (first.vehicle || "flexibles Fahrzeug");

      const body = rides
        .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`, "de"))
        .map((r) => `<li><strong>${r.time} ${r.customer}</strong><p>${r.pickup} → ${r.destination}</p><p>Anschlussfahrt: ${r.followUp || "offen"} · Leerfahrt: ${r.emptyKm} km · mögliche Verspätung: ${r.delayHint || "keine"} · Pause: ${r.pauseHint || "nicht geplant"} · Konflikte: ${r.conflictHint || "keine"}</p></li>`)
        .join("");

      return `
        <article class="tc-vehicle-plan">
          <h3>${emp ? employeeName(emp) : driverId} · ${vehicle}</h3>
          <p>Schicht: ${shift ? `${formatDate(state.dateTomorrow)} · ${shift.start}–${shift.end}` : "offen"}</p>
          <ul>${body}</ul>
          <div class="shift-avisierung">
            <span>Telefonische Avisierung:</span>
            <select data-phone-status="${driverId}">
              ${["Noch nicht informiert", "Telefonisch informiert", "Bestätigt", "Nicht erreicht", "Rückruf erforderlich"].map((x) => `<option value="${x}"${(state.planner.phoneStatusByDriver[driverId] || "Noch nicht informiert") === x ? " selected" : ""}>${x}</option>`).join("")}
            </select>
            <button class="admin-btn" type="button" data-phone-action="call" data-driver-id="${driverId}">Fahrer anrufen</button>
            <button class="admin-btn" type="button" data-phone-action="informed" data-driver-id="${driverId}">Als informiert markieren</button>
            <button class="admin-btn" type="button" data-phone-action="confirmed" data-driver-id="${driverId}">Bestätigt markieren</button>
            <button class="admin-btn" type="button" data-phone-action="callback" data-driver-id="${driverId}">Rückruf eintragen</button>
          </div>
        </article>
      `;
    }).join("");
  }

  function renderQuickInfo() {
    const node = document.querySelector("[data-shift-feedback]");
    if (!node) return;
    const activeTomorrow = state.planner.tomorrowPlan.filter((x) => x.active).length;
    const reserveTomorrow = state.planner.tomorrowPlan.filter((x) => x.active && x.reserve).length;
    node.textContent = `Plan für morgen: ${activeTomorrow} aktiv, davon ${reserveTomorrow} Reserve. Letzte Aktualisierung ${formatDateTime(state.planner.updatedAt)}.`;
  }

  function persistToCockpitBridge() {
    const bridge = {
      version: 1,
      updatedAt: nowStamp(),
      plannedDrivers: state.planner.tomorrowPlan
        .filter((x) => x.active)
        .map((x) => {
          const emp = getEmployee(x.employeeId);
          return {
            employeeId: x.employeeId,
            name: emp ? employeeName(emp) : x.employeeId,
            shiftStart: x.start,
            shiftEnd: x.end,
            vehicle: x.vehicle || "",
            reserve: Boolean(x.reserve),
            dayAvailability: x.dayAvailability,
            licenseStatus: getDocStatus(x.employeeId, "Fuehrerschein"),
            permitStatus: getDocStatus(x.employeeId, "Personenbefoerderungsschein"),
            qualifications: emp && Array.isArray(emp.qualifications) ? emp.qualifications : [],
            status: emp ? emp.status : "aktiv"
          };
        }),
      confirmedPlan: state.planner.confirmedPlan
    };

    localStorage.setItem("adminV22DispatchBridge", JSON.stringify(bridge));
  }

  function syncBackToPersonnel() {
    if (!P || typeof P.saveState !== "function") return;

    state.planner.todayAssignments.forEach((row) => {
      const emp = getEmployee(row.employeeId);
      if (!emp) return;
      emp.todayShift = `${row.start}-${row.end}`;
      emp.activeVehicle = row.vehicle || emp.activeVehicle || "-";
      if (normalize(row.status).includes("abgemeldet")) emp.status = "frei";
      if (normalize(row.status).includes("krank")) emp.status = "krank";
      if (normalize(row.status).includes("gesperrt")) emp.status = "gesperrt";
    });

    state.planner.tomorrowPlan.forEach((row) => {
      const emp = getEmployee(row.employeeId);
      if (!emp) return;
      if (row.active) emp.nextShift = `${state.dateTomorrow} ${row.start}`;
      if (row.vehicle) emp.preferredVehicle = row.vehicle;
      if (row.reserve) emp.profileNote = "Als Reservefahrer für morgen markiert";
    });

    P.saveState(state.personnel);
    state.personnel = P.loadState();
  }

  function pickReplacement(employeeId) {
    const current = state.planner.todayAssignments.find((x) => x.employeeId === employeeId);
    if (!current) return;

    const replacement = state.planner.todayAssignments
      .filter((x) => x.employeeId !== employeeId)
      .map((x) => ({ row: x, emp: getEmployee(x.employeeId) }))
      .find((x) => x.emp && checkPlanable(x.row, state.dateToday).ok && normalize(x.row.status).includes("verf"));

    if (!replacement) {
      current.exceptionNote = "Kein Ersatzfahrer gefunden";
      return;
    }

    current.exceptionNote = `Ersatzfahrer: ${employeeName(replacement.emp)}`;
    replacement.row.status = "im Dienst";
  }

  function applyTemplateToSelected(templateId) {
    const tpl = findTemplateById(templateId);
    state.selectedTomorrow.forEach((employeeId) => {
      const row = state.planner.tomorrowPlan.find((x) => x.employeeId === employeeId);
      if (!row) return;
      row.shiftTemplateId = tpl.id;
      row.start = tpl.start;
      row.end = tpl.end;
      row.active = true;
    });
  }

  function acceptSuggestion(suggestion, mode) {
    const row = {
      id: uid("DAY"),
      suggestionId: suggestion.id,
      appointmentId: suggestion.appointmentId,
      date: state.dateTomorrow,
      time: suggestion.time,
      customer: suggestion.customer,
      pickup: suggestion.pickup,
      destination: suggestion.destination,
      driverId: suggestion.driverId,
      driverName: suggestion.driverName,
      vehicle: suggestion.vehicle,
      emptyKm: 3,
      delayHint: suggestion.reserveSuggestion ? "Reserveeinsatz kann 5-10 Min dauern" : "keine",
      pauseHint: "nach 2 Fahrten prüfen",
      conflictHint: suggestion.blockedReasons[0] || "keine",
      followUp: "wird geprüft",
      mode
    };

    const idx = state.planner.confirmedPlan.findIndex((x) => x.appointmentId === row.appointmentId);
    if (idx >= 0) state.planner.confirmedPlan[idx] = row;
    else state.planner.confirmedPlan.push(row);

    suggestion.status = "übernommen";
  }

  function acceptAllSuggestions() {
    state.planner.suggestions.forEach((s) => {
      if (!s.driverId) return;
      acceptSuggestion(s, "auto");
    });
  }

  function rotateDriver(suggestionId) {
    const s = state.planner.suggestions.find((x) => x.id === suggestionId);
    if (!s) return;

    const candidates = state.planner.tomorrowPlan
      .filter((row) => row.active)
      .map((row) => ({ row, emp: getEmployee(row.employeeId) }))
      .filter((x) => x.emp && checkPlanable(x.row, state.dateTomorrow).ok);

    if (!candidates.length) return;

    const idx = candidates.findIndex((x) => x.row.employeeId === s.driverId);
    const next = candidates[(idx + 1 + candidates.length) % candidates.length];
    s.driverId = next.row.employeeId;
    s.driverName = employeeName(next.emp);
    s.vehicle = next.row.vehicle || pickDefaultVehicle(next.emp) || "flexibles Fahrzeug";
    s.reasons.unshift("Fahrer wurde manuell ausgetauscht.");
  }

  function rotateVehicle(suggestionId) {
    const s = state.planner.suggestions.find((x) => x.id === suggestionId);
    if (!s) return;
    const vehicles = loadVehicles().filter((v) => isVehicleAvailable(v.plate));
    if (!vehicles.length) return;
    const idx = vehicles.findIndex((v) => normalize(v.plate) === normalize(s.vehicle));
    const next = vehicles[(idx + 1 + vehicles.length) % vehicles.length];
    s.vehicle = next.plate;
    s.reasons.unshift("Fahrzeug wurde manuell getauscht.");
  }

  function shiftRideTime(suggestionId) {
    const s = state.planner.suggestions.find((x) => x.id === suggestionId);
    if (!s) return;
    const minutes = parseTime(s.time) + 15;
    s.time = minutesToDuration(minutes);
    s.estimatedEnd = minutesToDuration(parseTime(s.estimatedEnd) + 15);
    s.reasons.unshift("Fahrt um 15 Minuten verschoben.");
  }

  function unplanSuggestion(suggestionId) {
    const s = state.planner.suggestions.find((x) => x.id === suggestionId);
    if (!s) return;
    s.status = "ungeplant";
    s.driverId = "";
    s.driverName = "Ungeplant";
    s.vehicle = "Noch offen";
    s.reasons.unshift("Fahrt bleibt ungeplant und muss manuell zugewiesen werden.");
  }

  function manualSuggestion(suggestionId) {
    const s = state.planner.suggestions.find((x) => x.id === suggestionId);
    if (!s) return;
    s.manualOverrideNote = "Manuelle Zuweisung durch Disposition";
    if (!s.driverId) {
      const fallback = state.planner.tomorrowPlan.find((x) => x.active && checkPlanable(x, state.dateTomorrow).ok);
      const emp = fallback ? getEmployee(fallback.employeeId) : null;
      if (fallback && emp) {
        s.driverId = fallback.employeeId;
        s.driverName = employeeName(emp);
        s.vehicle = fallback.vehicle || pickDefaultVehicle(emp) || "flexibles Fahrzeug";
      }
    }
    acceptSuggestion(s, "manuell");
  }

  function changePhoneStatus(driverId, status) {
    state.planner.phoneStatusByDriver[driverId] = status;
  }

  function renderAll() {
    renderStats();
    renderTimeline();
    renderTodayList();
    renderWarnings();
    renderVehicleMapping();
    renderTomorrowPlanner();
    renderTemplates();
    renderSuggestions();
    renderDriverDayPlans();
    renderQuickInfo();
  }

  function bindFilters() {
    document.querySelectorAll("[data-shift-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        state.activeFilter = button.getAttribute("data-shift-filter") || "Alle";
        document.querySelectorAll("[data-shift-filter]").forEach((x) => x.classList.toggle("is-active", x === button));
        renderTodayList();
      });
    });

    const input = document.querySelector("[data-shift-search]");
    if (input) {
      input.addEventListener("input", (event) => {
        state.searchTerm = String(event.target.value || "");
        renderTodayList();
      });
    }
  }

  function bindToolbar() {
    const planBtn = document.querySelector("[data-plan-generate]");
    if (planBtn) {
      planBtn.addEventListener("click", () => {
        prepareDemoSuggestions();
        persistToCockpitBridge();
        renderSuggestions();
        renderQuickInfo();
      });
    }

    const acceptAllBtn = document.querySelector("[data-plan-accept-all]");
    if (acceptAllBtn) {
      acceptAllBtn.addEventListener("click", () => {
        acceptAllSuggestions();
        persistToCockpitBridge();
        savePlanner();
        renderDriverDayPlans();
        renderSuggestions();
      });
    }

    const applyTemplateBtn = document.querySelector("[data-apply-template-selected]");
    const applyTemplateSelect = document.querySelector("[data-template-bulk]");
    if (applyTemplateBtn && applyTemplateSelect) {
      applyTemplateBtn.addEventListener("click", () => {
        applyTemplateToSelected(applyTemplateSelect.value || "day");
        savePlanner();
        persistToCockpitBridge();
        renderTomorrowPlanner();
        renderQuickInfo();
      });
    }

    const saveBtn = document.querySelector("[data-plan-save]");
    if (saveBtn) {
      saveBtn.addEventListener("click", () => {
        syncBackToPersonnel();
        savePlanner();
        persistToCockpitBridge();
        renderAll();
      });
    }
  }

  function bindActions() {
    document.addEventListener("click", (event) => {
      const resetBtn = event.target.closest("[data-shift-reset]");
      if (resetBtn) {
        state.activeFilter = "Alle";
        state.searchTerm = "";
        const input = document.querySelector("[data-shift-search]");
        if (input) input.value = "";
        document.querySelectorAll("[data-shift-filter]").forEach((x) => x.classList.toggle("is-active", (x.getAttribute("data-shift-filter") || "") === "Alle"));
        renderTodayList();
        return;
      }

      const todayAction = event.target.closest("[data-today-action]");
      if (todayAction) {
        const action = todayAction.getAttribute("data-today-action") || "";
        const employeeId = todayAction.getAttribute("data-employee-id") || "";
        const row = state.planner.todayAssignments.find((x) => x.employeeId === employeeId);
        const emp = getEmployee(employeeId);
        if (!row || !emp) return;

        if (action === "plan") row.status = "im Dienst";
        if (action === "vehicle") {
          const next = loadVehicles().find((v) => isVehicleAvailable(v.plate) && (!row.vehicle || normalize(v.plate) !== normalize(row.vehicle)));
          row.vehicle = next ? next.plate : row.vehicle;
        }
        if (action === "shift") {
          const tpl = findTemplateById("late");
          row.shiftTemplateId = tpl.id;
          row.start = tpl.start;
          row.end = tpl.end;
        }
        if (action === "status") row.status = normalize(row.status).includes("dienst") ? "Pause" : "im Dienst";
        if (action === "logout") row.status = "abgemeldet";
        if (action === "replace") pickReplacement(employeeId);

        savePlanner();
        syncBackToPersonnel();
        persistToCockpitBridge();
        renderAll();
        return;
      }

      const selectSuggestion = event.target.closest("[data-suggest-select]");
      if (selectSuggestion) {
        state.selectedSuggestion = selectSuggestion.getAttribute("data-suggest-select") || "";
        renderSuggestions();
        return;
      }

      const acceptOne = event.target.closest("[data-suggest-accept]");
      if (acceptOne) {
        const id = acceptOne.getAttribute("data-suggest-accept") || "";
        const suggestion = state.planner.suggestions.find((x) => x.id === id);
        if (!suggestion || !suggestion.driverId) return;
        acceptSuggestion(suggestion, "einzeln");
        savePlanner();
        persistToCockpitBridge();
        renderSuggestions();
        renderDriverDayPlans();
        return;
      }

      const changeDriver = event.target.closest("[data-suggest-change-driver]");
      if (changeDriver) {
        rotateDriver(changeDriver.getAttribute("data-suggest-change-driver") || "");
        savePlanner();
        persistToCockpitBridge();
        renderSuggestions();
        return;
      }

      const changeVehicle = event.target.closest("[data-suggest-change-vehicle]");
      if (changeVehicle) {
        rotateVehicle(changeVehicle.getAttribute("data-suggest-change-vehicle") || "");
        savePlanner();
        persistToCockpitBridge();
        renderSuggestions();
        return;
      }

      const shiftBtn = event.target.closest("[data-suggest-shift]");
      if (shiftBtn) {
        shiftRideTime(shiftBtn.getAttribute("data-suggest-shift") || "");
        savePlanner();
        persistToCockpitBridge();
        renderSuggestions();
        return;
      }

      const unplannedBtn = event.target.closest("[data-suggest-unplanned]");
      if (unplannedBtn) {
        unplanSuggestion(unplannedBtn.getAttribute("data-suggest-unplanned") || "");
        savePlanner();
        persistToCockpitBridge();
        renderSuggestions();
        return;
      }

      const manualBtn = event.target.closest("[data-suggest-manual]");
      if (manualBtn) {
        manualSuggestion(manualBtn.getAttribute("data-suggest-manual") || "");
        savePlanner();
        persistToCockpitBridge();
        renderSuggestions();
        renderDriverDayPlans();
        return;
      }

      const phoneAction = event.target.closest("[data-phone-action]");
      if (phoneAction) {
        const driverId = phoneAction.getAttribute("data-driver-id") || "";
        const kind = phoneAction.getAttribute("data-phone-action") || "";
        if (kind === "call") changePhoneStatus(driverId, "Telefonisch informiert");
        if (kind === "informed") changePhoneStatus(driverId, "Telefonisch informiert");
        if (kind === "confirmed") changePhoneStatus(driverId, "Bestätigt");
        if (kind === "callback") changePhoneStatus(driverId, "Rückruf erforderlich");
        savePlanner();
        renderDriverDayPlans();
      }
    });

    document.addEventListener("change", (event) => {
      const activeInput = event.target.closest("[data-plan-active]");
      if (activeInput) {
        const employeeId = activeInput.getAttribute("data-plan-active") || "";
        const row = state.planner.tomorrowPlan.find((x) => x.employeeId === employeeId);
        if (!row) return;
        row.active = Boolean(activeInput.checked);
        savePlanner();
        persistToCockpitBridge();
        renderTomorrowPlanner();
        renderQuickInfo();
        return;
      }

      const selectedInput = event.target.closest("[data-plan-selected]");
      if (selectedInput) {
        const employeeId = selectedInput.getAttribute("data-plan-selected") || "";
        if (selectedInput.checked) state.selectedTomorrow.add(employeeId);
        else state.selectedTomorrow.delete(employeeId);
        return;
      }

      const templateSelect = event.target.closest("[data-plan-template]");
      if (templateSelect) {
        const employeeId = templateSelect.getAttribute("data-plan-template") || "";
        const row = state.planner.tomorrowPlan.find((x) => x.employeeId === employeeId);
        if (!row) return;
        const tpl = findTemplateById(templateSelect.value || "day");
        row.shiftTemplateId = tpl.id;
        row.start = tpl.start;
        row.end = tpl.end;
        savePlanner();
        persistToCockpitBridge();
        renderTomorrowPlanner();
        return;
      }

      const reserveInput = event.target.closest("[data-plan-reserve]");
      if (reserveInput) {
        const employeeId = reserveInput.getAttribute("data-plan-reserve") || "";
        const row = state.planner.tomorrowPlan.find((x) => x.employeeId === employeeId);
        if (!row) return;
        row.reserve = Boolean(reserveInput.checked);
        if (row.reserve) row.active = true;
        savePlanner();
        persistToCockpitBridge();
        renderTomorrowPlanner();
        renderQuickInfo();
        return;
      }

      const availabilitySelect = event.target.closest("[data-plan-availability]");
      if (availabilitySelect) {
        const employeeId = availabilitySelect.getAttribute("data-plan-availability") || "";
        const row = state.planner.tomorrowPlan.find((x) => x.employeeId === employeeId);
        if (!row) return;
        row.dayAvailability = String(availabilitySelect.value || row.dayAvailability);
        savePlanner();
        persistToCockpitBridge();
        renderTomorrowPlanner();
        return;
      }

      const phoneSelect = event.target.closest("[data-phone-status]");
      if (phoneSelect) {
        const driverId = phoneSelect.getAttribute("data-phone-status") || "";
        changePhoneStatus(driverId, String(phoneSelect.value || "Noch nicht informiert"));
        savePlanner();
        renderDriverDayPlans();
        return;
      }

      const templateStart = event.target.closest("[data-template-start]");
      if (templateStart) {
        const templateId = templateStart.getAttribute("data-template-start") || "";
        const row = state.planner.templates.find((x) => x.id === templateId);
        if (!row) return;
        row.start = String(templateStart.value || row.start);
        savePlanner();
        renderTemplates();
        return;
      }

      const templateEnd = event.target.closest("[data-template-end]");
      if (templateEnd) {
        const templateId = templateEnd.getAttribute("data-template-end") || "";
        const row = state.planner.templates.find((x) => x.id === templateId);
        if (!row) return;
        row.end = String(templateEnd.value || row.end);
        savePlanner();
        renderTemplates();
      }
    });

    document.addEventListener("input", (event) => {
      const startInput = event.target.closest("[data-plan-start]");
      if (startInput) {
        const employeeId = startInput.getAttribute("data-plan-start") || "";
        const row = state.planner.tomorrowPlan.find((x) => x.employeeId === employeeId);
        if (!row) return;
        row.start = String(startInput.value || row.start);
        savePlanner();
        persistToCockpitBridge();
        return;
      }

      const endInput = event.target.closest("[data-plan-end]");
      if (endInput) {
        const employeeId = endInput.getAttribute("data-plan-end") || "";
        const row = state.planner.tomorrowPlan.find((x) => x.employeeId === employeeId);
        if (!row) return;
        row.end = String(endInput.value || row.end);
        savePlanner();
        persistToCockpitBridge();
        return;
      }

      const vehicleInput = event.target.closest("[data-plan-vehicle]");
      if (vehicleInput) {
        const employeeId = vehicleInput.getAttribute("data-plan-vehicle") || "";
        const row = state.planner.tomorrowPlan.find((x) => x.employeeId === employeeId);
        if (!row) return;
        row.vehicle = String(vehicleInput.value || "").trim();
        savePlanner();
        persistToCockpitBridge();
        return;
      }

      const serviceInput = event.target.closest("[data-plan-service]");
      if (serviceInput) {
        const employeeId = serviceInput.getAttribute("data-plan-service") || "";
        const row = state.planner.tomorrowPlan.find((x) => x.employeeId === employeeId);
        if (!row) return;
        row.preferredServiceType = String(serviceInput.value || "").trim();
        savePlanner();
        persistToCockpitBridge();
        return;
      }

      const noteInput = event.target.closest("[data-plan-note]");
      if (noteInput) {
        const employeeId = noteInput.getAttribute("data-plan-note") || "";
        const row = state.planner.tomorrowPlan.find((x) => x.employeeId === employeeId);
        if (!row) return;
        row.note = String(noteInput.value || "").trim();
        savePlanner();
        persistToCockpitBridge();
      }
    });
  }

  function initBulkTemplateSelect() {
    const node = document.querySelector("[data-template-bulk]");
    if (!node) return;
    node.innerHTML = state.planner.templates.map((t) => `<option value="${t.id}">${t.name}</option>`).join("");
  }

  function init() {
    state.dateToday = todayIso();
    state.dateTomorrow = addDaysIso(state.dateToday, 1);

    state.personnel = loadPersonnel();
    state.planner = loadPlanner();

    ensureTodayAssignments();
    ensureTomorrowPlan();

    initBulkTemplateSelect();
    bindFilters();
    bindToolbar();
    bindActions();

    savePlanner();
    persistToCockpitBridge();
    renderAll();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
