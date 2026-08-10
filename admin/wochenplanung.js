(() => {
  const P = window.AdminPersonnelDemo;
  const S = window.AdminSystemCenter || {};
  const D = window.TaxiData || window.TaxiDataService || null;
  const WeeklyLogic = window.AdminWeeklyPlanningLogic || {};
  const STORAGE_KEY = "adminV23DayPlanning";

  const state = {
    personnel: P.loadState(),
    weekStart: null,
    selectedEmployeeId: "",
    selectedDate: "",
    selectedCell: null,
    modalOpen: false
  };

  const SHIFT_TEMPLATES = [
    { id: "early", name: "Früh", start: "06:00", end: "14:00" },
    { id: "late", name: "Spät", start: "14:00", end: "22:00" },
    { id: "night", name: "Nacht", start: "22:00", end: "06:00" },
    { id: "custom", name: "Benutzerdefiniert", start: "08:00", end: "16:00" }
  ];

  function safeParse(raw) {
    try { return JSON.parse(raw); } catch { return null; }
  }

  function loadStore() {
    const parsed = safeParse(localStorage.getItem(STORAGE_KEY)) || {};
    parsed.days = parsed.days && typeof parsed.days === "object" ? parsed.days : {};
    return parsed;
  }

  function saveStore(store) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }

  function todayIso() {
    return P.todayIso();
  }

  function addDays(baseIso, count) {
    const d = new Date(`${baseIso}T00:00:00`);
    d.setDate(d.getDate() + count);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function formatDate(iso) {
    if (S.formatDate) return S.formatDate(iso);
    const d = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(d.getTime())) return iso;
    return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
  }

  function startOfWeek(baseIso) {
    const d = new Date(`${baseIso}T00:00:00`);
    const day = d.getDay();
    const diff = (day + 6) % 7;
    d.setDate(d.getDate() - diff);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function dateRangeLabel(startIso) {
    const endIso = addDays(startIso, 6);
    return `${formatDate(startIso)} – ${formatDate(endIso)}`;
  }

  function weekdayLabel(iso) {
    const names = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
    const d = new Date(`${iso}T00:00:00`);
    return names[d.getDay() === 0 ? 6 : d.getDay() - 1];
  }

  function getDayState(dateIso) {
    const store = loadStore();
    const day = store.days[dateIso] || {};
    return {
      publishedPlan: day.publishedPlan || null,
      draftPlan: day.draftPlan || null,
      locks: day.locks || {},
      manualBlocks: Array.isArray(day.manualBlocks) ? day.manualBlocks : []
    };
  }

  function getWeekDays() {
    const days = [];
    for (let i = 0; i < 7; i += 1) days.push(addDays(state.weekStart, i));
    return days;
  }

  function employmentLabel(type) {
    return ["Minijob", "Aushilfe", "Springer"].includes(type) ? "Minijob" : "Fest";
  }

  function employeeName(emp) {
    return `${emp.firstName || ""} ${emp.lastName || ""}`.trim();
  }

  function isEmployeeAbsentForDate(employeeId, dateIso) {
    const personnel = state.personnel;
    const vacations = personnel.vacations || [];
    const absences = personnel.absences || [];
    const activeVacation = vacations.some((v) => v.employeeId === employeeId && ["genehmigt", "teilweise genehmigt"].includes(v.status) && dateIso >= v.start && dateIso <= v.end);
    const activeAbsence = absences.some((a) => a.employeeId === employeeId && a.status !== "abgeschlossen" && dateIso >= a.start && dateIso <= a.expectedEnd);
    return activeVacation || activeAbsence;
  }

  function getEmployeeCellState(employeeId, dateIso) {
    const personnel = state.personnel;
    const emp = personnel.employees.find((entry) => entry.id === employeeId);
    const dayState = getDayState(dateIso);
    const published = dayState.publishedPlan && Array.isArray(dayState.publishedPlan.driverRows) ? dayState.publishedPlan.driverRows.find((row) => row.employeeId === employeeId) : null;
    const draft = dayState.draftPlan && Array.isArray(dayState.draftPlan.driverRows) ? dayState.draftPlan.driverRows.find((row) => row.employeeId === employeeId) : null;
    const vehicleConflicts = getVehicleConflicts(dateIso);
    const blocked = emp && ["gesperrt", "Dokument ungueltig", "nicht verfuegbar"].includes(emp.status);
    const permitExpired = Boolean(emp && emp.pPermitValidUntil && P.daysUntil(emp.pPermitValidUntil) < 0);
    const terrain = WeeklyLogic.deriveWeeklyCellState ? WeeklyLogic.deriveWeeklyCellState({
      employee: emp,
      employeeId,
      personnel,
      dateIso,
      publishedRow: published,
      draftRow: draft,
      vehicleConflicts,
      daysUntil: P.daysUntil,
      blocked,
      permitExpired
    }) : null;

    if (terrain) {
      return { ...terrain, row: terrain.row || draft || published || null, published: Boolean(published), draft: Boolean(draft), blocked, permitExpired };
    }

    return { status: "offen", label: "Noch offen", vehicle: "", tone: "is-gold", note: "", row: draft || published || null, published: Boolean(published), draft: Boolean(draft), blocked, permitExpired, sick: false, vacation: false };
  }

  function getVehicleConflicts(dateIso) {
    const store = loadStore();
    const day = store.days[dateIso] || {};
    const rows = Array.isArray(day.draftPlan && day.draftPlan.driverRows) ? day.draftPlan.driverRows : [];
    const byVehicle = {};
    const conflicts = [];

    rows.forEach((row) => {
      if (!row.vehicleLabel || !row.shiftStart || !row.shiftEnd || row.status === "Frei" || row.status === "Urlaub" || row.status === "Krank") return;
      const key = row.vehicleLabel;
      if (!byVehicle[key]) byVehicle[key] = [];
      byVehicle[key].push(row);
    });

    Object.entries(byVehicle).forEach(([vehicle, entries]) => {
      if (entries.length > 1) conflicts.push({ vehicle, entries });
    });

    return conflicts;
  }

  function renderSummary() {
    const node = document.querySelector("[data-wp-summary]");
    if (!node) return;
    const days = getWeekDays();
    const summaries = days.map((dayIso) => {
      const cells = state.personnel.employees.map((emp) => getEmployeeCellState(emp.id, dayIso));
      const inService = cells.filter((cell) => cell.status === "dienst").length;
      const vehicles = new Set(cells.filter((cell) => cell.vehicle).map((cell) => cell.vehicle)).size;
      const open = cells.filter((cell) => cell.tone === "is-gold" || cell.status === "offen").length;
      const conflicts = getVehicleConflicts(dayIso).length;
      return `<span class="wp-badge">${formatDate(dayIso)} · Im Dienst: ${inService} · Fahrzeuge: ${vehicles} · Offen: ${open} · Konflikte: ${conflicts}</span>`;
    });
    node.innerHTML = summaries.join("");
  }

  function renderTable() {
    const body = document.querySelector("[data-wp-body]");
    if (!body) return;
    const weekdays = getWeekDays();
    const rowsHtml = state.personnel.employees.map((emp) => {
      const cells = weekdays.map((dateIso) => {
        const cell = getEmployeeCellState(emp.id, dateIso);
        const label = cell.label || "Noch offen";
        const vehicle = cell.vehicle ? `<small>${cell.vehicle}</small>` : "";
        const note = cell.note ? `<small>${cell.note}</small>` : "";
        const publishedState = cell.published ? "<small>veröffentlicht</small>" : "<small>Entwurf</small>";
        return `<td><button class="wp-cell ${cell.tone}" type="button" data-wp-edit="${emp.id}|${dateIso}"><div class="wp-cell-head"><span>${formatDate(dateIso)}</span><span>${cell.published ? "✓" : "•"}</span></div><strong>${label}</strong>${vehicle}${note}${publishedState}</button></td>`;
      }).join("");
      return `<tr><td class="wp-name-col"><strong>${employeeName(emp)}</strong><br><span class="person-meta">${employmentLabel(emp.employmentType)} · ${emp.role}</span></td>${cells}</tr>`;
    }).join("");
    body.innerHTML = rowsHtml;
    document.querySelectorAll("[data-wp-day-head]").forEach((node) => {
      const idx = node.getAttribute("data-wp-day-head");
      const dateIso = weekdays[Number(idx)] || weekdays[0];
      node.textContent = `${weekdayLabel(dateIso)}\n${formatDate(dateIso)}`;
    });
    document.querySelector("[data-wp-range]").textContent = `Wochenplan ${dateRangeLabel(state.weekStart)}`;
  }

  function openModal(title, body) {
    const m = document.querySelector("[data-wp-modal]");
    const t = document.querySelector("[data-wp-modal-title]");
    const b = document.querySelector("[data-wp-modal-body]");
    if (!m || !t || !b) return;
    t.textContent = title;
    b.innerHTML = body;
    m.hidden = false;
  }

  function closeModal() {
    const m = document.querySelector("[data-wp-modal]");
    if (m) m.hidden = true;
  }

  function getEmployeeVehicles(emp) {
    const available = [emp.preferredVehicle, ...emp.allowedVehicles || [], emp.activeVehicle, emp.fixedVehicle].filter(Boolean);
    const unique = [...new Set(available.filter(Boolean))];
    return unique.length ? unique : ["GER-TK 203", "GER-TK 214", "GER-TK 303", "GER-TK 306"];
  }

  function getEditModalBody(employeeId, dateIso) {
    const emp = state.personnel.employees.find((entry) => entry.id === employeeId);
    const cell = getEmployeeCellState(employeeId, dateIso);
    const row = cell.row || {};
    const dayState = getDayState(dateIso);
    const current = row || {};
    const vehicleOptions = getEmployeeVehicles(emp).map((vehicle) => `<option value="${vehicle}" ${current.vehicleLabel === vehicle ? "selected" : ""}>${vehicle}</option>`).join("");
    const shiftTemplates = SHIFT_TEMPLATES.map((tpl) => `<button class="admin-btn admin-btn-secondary" type="button" data-wp-template="${tpl.id}" data-wp-employee="${employeeId}" data-wp-date="${dateIso}">${tpl.name} ${tpl.start}–${tpl.end}</button>`).join("");
    const conflicts = getVehicleConflicts(dateIso).map((conflict) => `<p class="person-meta">Konflikt: ${conflict.vehicle} · ${conflict.entries.length} Zuordnungen</p>`).join("");
    return `
      <div class="wp-inline-form">
        <label>Datum<input value="${formatDate(dateIso)}" disabled></label>
        <label>Mitarbeiter<input value="${employeeName(emp)}" disabled></label>
        <label>Arbeitsstatus<select data-wp-status><option value="Im Dienst" ${row.status === "Im Dienst" ? "selected" : ""}>Im Dienst</option><option value="Frei" ${row.status === "Frei" ? "selected" : ""}>Frei</option><option value="Urlaub" ${row.status === "Urlaub" ? "selected" : ""}>Urlaub</option><option value="Krank" ${row.status === "Krank" ? "selected" : ""}>Krank</option><option value="Sonstige Abwesenheit" ${row.status === "Sonstige Abwesenheit" ? "selected" : ""}>Sonstige Abwesenheit</option></select></label>
        <label>Von<input data-wp-start value="${row.shiftStart || ""}"></label>
        <label>Bis<input data-wp-end value="${row.shiftEnd || ""}"></label>
        <label>Fahrzeug<select data-wp-vehicle>${vehicleOptions}<option value="">keine Zuordnung</option></select></label>
        <label>Notiz<textarea data-wp-note>${row.note || ""}</textarea></label>
        <div class="person-actions">${shiftTemplates}</div>
        ${conflicts ? `<div class="person-item"><strong>Fahrzeugkonflikte</strong>${conflicts}</div>` : ""}
        ${cell.note ? `<div class="person-item"><strong>Hinweis</strong><p>${cell.note}</p></div>` : ""}
        <div class="person-actions"><button class="admin-btn" type="button" data-wp-save="${employeeId}|${dateIso}">Speichern</button><button class="admin-btn admin-btn-secondary" type="button" data-wp-copy="${employeeId}|${dateIso}">Auf weitere Tage kopieren</button></div>
      </div>
    `;
  }

  function persistCell(employeeId, dateIso, payload) {
    if (D && typeof D.saveShift === "function") {
      D.saveShift({ employeeId, date: dateIso, startTime: payload.shiftStart || "", endTime: payload.shiftEnd || "", status: payload.status || "draft", vehicleId: payload.vehicleLabel || "", note: payload.note || "", planStatus: "draft" });
    }

    const store = loadStore();
    const day = store.days[dateIso] || {};
    const existingRows = Array.isArray(day.draftPlan && day.draftPlan.driverRows) ? day.draftPlan.driverRows : [];
    const row = {
      employeeId,
      status: payload.status || "Im Dienst",
      shiftStart: payload.shiftStart || "",
      shiftEnd: payload.shiftEnd || "",
      vehicleLabel: payload.vehicleLabel || "",
      vehicle: payload.vehicleLabel || "",
      note: payload.note || "",
      published: false
    };
    const nextRows = existingRows.filter((entry) => entry.employeeId !== employeeId).concat(row);
    day.draftPlan = day.draftPlan || { driverRows: [] };
    day.draftPlan.driverRows = nextRows;
    store.days[dateIso] = day;
    saveStore(store);
    P.saveState(state.personnel);
    state.personnel = P.loadState();
    renderSummary();
    renderTable();
  }

  function applyTemplate(employeeId, dateIso, templateId) {
    const template = SHIFT_TEMPLATES.find((entry) => entry.id === templateId);
    if (!template) return;
    persistCell(employeeId, dateIso, { status: "Im Dienst", shiftStart: template.start, shiftEnd: template.end, vehicleLabel: "" });
  }

  function copyToDays(employeeId, dateIso, targetDays) {
    const current = getEmployeeCellState(employeeId, dateIso).row || {};
    targetDays.forEach((dayIso) => {
      const cell = getEmployeeCellState(employeeId, dayIso);
      if (cell.sick || cell.vacation) return;
      persistCell(employeeId, dayIso, { status: current.status || "Im Dienst", shiftStart: current.shiftStart || "", shiftEnd: current.shiftEnd || "", vehicleLabel: current.vehicleLabel || "", note: current.note || "" });
    });
  }

  function copyPreviousWeek() {
    const store = loadStore();
    const previousStart = addDays(state.weekStart, -7);
    const previousDays = getWeekDays().map((dayIso, idx) => ({ date: dayIso, previousDate: addDays(previousStart, idx) }));
    previousDays.forEach(({ date, previousDate }) => {
      const previousDay = store.days[previousDate] || {};
      const rows = Array.isArray(previousDay.draftPlan && previousDay.draftPlan.driverRows) ? previousDay.draftPlan.driverRows : [];
      if (!rows.length) return;
      const nextDay = store.days[date] || {};
      nextDay.draftPlan = { driverRows: rows.map((row) => ({ ...row, employeeId: row.employeeId, published: false })) };
      store.days[date] = nextDay;
    });
    saveStore(store);
    renderSummary();
    renderTable();
  }

  function publishWeek() {
    if (D && typeof D.publishPlan === "function") {
      D.publishPlan({ date: state.weekStart, rows: [] });
    }

    const store = loadStore();
    const days = getWeekDays();
    days.forEach((dayIso) => {
      const day = store.days[dayIso] || {};
      const rows = Array.isArray(day.draftPlan && day.draftPlan.driverRows) ? day.draftPlan.driverRows : [];
      if (!rows.length) return;
      const publishedRows = rows.map((row) => ({ ...row, published: true, status: row.status || "Im Dienst" }));
      day.publishedPlan = { publishedAt: P.nowStamp(), publishedBy: "Admin", changed: false, driverRows: publishedRows };
      day.draftPlan = { driverRows: publishedRows.map((row) => ({ ...row, published: false })) };
      store.days[dayIso] = day;
      rows.forEach((row) => {
        if (P.addEmployeeMessage) {
          P.addEmployeeMessage(state.personnel, {
            employeeId: row.employeeId,
            title: `Dein Plan für ${formatDate(dayIso)} ist da.`,
            text: `${formatDate(dayIso)}\nArbeitszeit: ${row.shiftStart || "-"} – ${row.shiftEnd || "-"} Uhr\nFahrzeug: ${row.vehicleLabel || "-"}`,
            category: "Planveroeffentlichung",
            priority: "normal",
            createdBy: "Admin"
          });
        }
      });
    });
    saveStore(store);
    state.personnel = P.loadState();
    renderSummary();
    renderTable();
  }

  function handleClick(event) {
    const edit = event.target.closest("[data-wp-edit]");
    if (edit) {
      const [employeeId, dateIso] = String(edit.getAttribute("data-wp-edit") || "").split("|");
      state.selectedEmployeeId = employeeId;
      state.selectedDate = dateIso;
      openModal(`Plan bearbeiten · ${formatDate(dateIso)}`, getEditModalBody(employeeId, dateIso));
      return;
    }

    const dayHead = event.target.closest("[data-wp-day-head]");
    if (dayHead) {
      const idx = Number(dayHead.getAttribute("data-wp-day-head") || 0);
      const dateIso = getWeekDays()[idx];
      if (window.open) {
        const url = `tagesplanung.html?date=${dateIso}`;
        window.location.href = url;
      }
      return;
    }

    const templateBtn = event.target.closest("[data-wp-template]");
    if (templateBtn) {
      const employeeId = templateBtn.getAttribute("data-wp-employee") || "";
      const dateIso = templateBtn.getAttribute("data-wp-date") || "";
      const templateId = templateBtn.getAttribute("data-wp-template") || "";
      applyTemplate(employeeId, dateIso, templateId);
      closeModal();
      return;
    }

    const saveBtn = event.target.closest("[data-wp-save]");
    if (saveBtn) {
      const [employeeId, dateIso] = String(saveBtn.getAttribute("data-wp-save") || "").split("|");
      const form = document.querySelector("[data-wp-modal-body]");
      const status = form.querySelector("[data-wp-status]")?.value || "Im Dienst";
      const shiftStart = form.querySelector("[data-wp-start]")?.value || "";
      const shiftEnd = form.querySelector("[data-wp-end]")?.value || "";
      const vehicleLabel = form.querySelector("[data-wp-vehicle]")?.value || "";
      const note = form.querySelector("[data-wp-note]")?.value || "";
      persistCell(employeeId, dateIso, { status, shiftStart, shiftEnd, vehicleLabel, note });
      closeModal();
      return;
    }

    const copyBtn = event.target.closest("[data-wp-copy]");
    if (copyBtn) {
      const [employeeId, dateIso] = String(copyBtn.getAttribute("data-wp-copy") || "").split("|");
      const days = getWeekDays().filter((dayIso) => dayIso !== dateIso);
      const selected = window.prompt("Tage auswählen (z.B. 1,2,3,4)", "1,2,3,4");
      if (!selected) return;
      const indexes = selected.split(",").map((part) => Number(part.trim())).filter((value) => !Number.isNaN(value));
      const targetDays = indexes.map((idx) => days[idx - 1]).filter(Boolean);
      if (targetDays.length) {
        copyToDays(employeeId, dateIso, targetDays);
        closeModal();
      }
      return;
    }
  }

  function bind() {
    document.addEventListener("click", handleClick);
    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-wp-modal-close]")) {
        closeModal();
      }
      if (event.target.closest("[data-wp-prev]")) {
        state.weekStart = addDays(state.weekStart, -7);
        renderSummary();
        renderTable();
      }
      if (event.target.closest("[data-wp-next]")) {
        state.weekStart = addDays(state.weekStart, 7);
        renderSummary();
        renderTable();
      }
      if (event.target.closest("[data-wp-current]")) {
        state.weekStart = startOfWeek(todayIso());
        renderSummary();
        renderTable();
      }
      if (event.target.closest("[data-wp-prepare]")) {
        openModal("Woche vorbereiten", "<p>Die Wochenplanung nutzt die bestehenden Tagesplan-Daten. Neue Einträge werden im Entwurfsstatus gehalten.</p>");
      }
      if (event.target.closest("[data-wp-publish]")) {
        publishWeek();
      }
      if (event.target.closest("[data-wp-copy-prev]")) {
        copyPreviousWeek();
      }
      if (event.target.closest("[data-wp-vehicle-check]")) {
        const conflicts = getVehicleConflicts(getWeekDays()[0]).length;
        openModal("Fahrzeuge prüfen", `<p>${conflicts} Fahrzeugkonflikte gefunden.</p>`);
      }
    });
  }

  function init() {
    state.weekStart = startOfWeek(todayIso());
    state.personnel = P.loadState();
    renderSummary();
    renderTable();
    bind();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
