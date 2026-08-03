(() => {
  const P = window.AdminPersonnelDemo;
  const state = { data: P.loadState() };

  function employeeName(id) {
    const e = P.getEmployee(state.data, id);
    return e ? `${e.firstName} ${e.lastName}` : id;
  }

  function statusBadge(text) {
    const t = P.normalize(text);
    const cls = t.includes("krank") || t.includes("ungueltig") || t.includes("gesperrt") ? "crit" : t.includes("urlaub") || t.includes("probe") || t.includes("schulung") ? "warn" : t.includes("dienst") || t.includes("aktiv") ? "ok" : "info";
    return `<span class="person-status ${cls}"><span class="dot"></span>${text}</span>`;
  }

  function renderKpis() {
    const s = P.getDashboardStats(state.data);
    const rows = [
      ["Mitarbeiter gesamt", s.totalEmployees],
      ["Fahrer im Dienst", s.driversOnDuty],
      ["heute abwesend", s.absentToday],
      ["Urlaub heute", s.vacationToday],
      ["krank heute", s.sickToday],
      ["offene Urlaubsantraege", s.openVacationRequests],
      ["bald ablaufende Dokumente", s.expiringDocs],
      ["ungueltige Dokumente", s.invalidDocs],
      ["offene Schulungen", s.openTrainings],
      ["neue Mitarbeiter", s.newEmployees],
      ["Mitarbeiter in Probezeit", s.onProbation],
      ["heute verfuegbare Fahrer", s.availableDriversToday]
    ];
    const node = document.querySelector("[data-person-kpis]");
    if (!node) return;
    node.innerHTML = rows.map((r) => `<article class="person-card"><small>${r[0]}</small><strong>${r[1]}</strong></article>`).join("");
  }

  function renderToday() {
    const body = document.querySelector("[data-person-today-table]");
    if (!body) return;
    body.innerHTML = state.data.employees.map((e) => `<tr><td>${e.firstName} ${e.lastName}</td><td>${e.role}</td><td>${e.todayShift || "-"}</td><td>${statusBadge(e.status)}</td><td>${e.activeVehicle || "-"}</td><td>${(e.todayShift || "-").split("-")[0] || "-"}</td><td>${e.phone || "-"}</td><td>${e.profileNote || e.internalNotes || "-"}</td></tr>`).join("");
  }

  function renderWarnings() {
    const list = document.querySelector("[data-person-warning-list]");
    if (!list) return;
    const warnings = P.buildPersonalWarnings(state.data);
    if (!warnings.length) {
      list.innerHTML = '<article class="person-item"><strong>Keine Warnungen</strong></article>';
      return;
    }
    list.innerHTML = warnings.slice(0, 24).map((w) => `<article class="person-item"><strong>${statusBadge(w.level)}</strong><p>${employeeName(w.employeeId)}: ${w.reason}</p><small>${w.detail || ""}</small></article>`).join("");
  }

  function renderStatusChips() {
    const node = document.querySelector("[data-person-status-chips]");
    if (!node) return;
    const statuses = ["eingeplant", "im Dienst", "verspaetet", "Urlaub", "Krankheit", "frei", "Pause", "Schulung", "nicht verfuegbar", "offene Schichten", "benoetigte Vertretungen"];
    const count = {
      "im Dienst": state.data.employees.filter((e) => e.status === "im Dienst").length,
      verspaetet: 1,
      Urlaub: state.data.employees.filter((e) => e.status === "Urlaub").length,
      Krankheit: state.data.employees.filter((e) => P.normalize(e.status).includes("krank")).length,
      frei: state.data.employees.filter((e) => e.status === "frei").length,
      Pause: state.data.employees.filter((e) => e.status === "Pause").length,
      Schulung: state.data.employees.filter((e) => e.status === "Schulung").length,
      "nicht verfuegbar": state.data.employees.filter((e) => e.status === "nicht verfuegbar").length,
      "offene Schichten": state.data.coverage.length,
      "benoetigte Vertretungen": state.data.coverage.filter((c) => c.candidates.length === 0 || c.conflicts.length > 0).length,
      eingeplant: state.data.employees.length
    };
    node.innerHTML = statuses.map((s) => `<span class="person-chip">${s}: ${count[s] || 0}</span>`).join("");
  }

  function bind() {
    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-person-reset-all]")) {
        if (!window.confirm("Personal-Demo wirklich zuruecksetzen?")) return;
        state.data = P.resetState();
        renderKpis();
        renderToday();
        renderWarnings();
        renderStatusChips();
        return;
      }
      if (event.target.closest("[data-person-reset-year]")) {
        if (!window.confirm("Urlaubsjahr wirklich zuruecksetzen?")) return;
        P.resetVacationYear(state.data);
        state.data = P.loadState();
        renderKpis();
        renderToday();
        renderWarnings();
        renderStatusChips();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderKpis();
    renderToday();
    renderWarnings();
    renderStatusChips();
    bind();
  });
})();
