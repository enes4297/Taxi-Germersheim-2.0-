(() => {
  const P = window.AdminPersonnelDemo;
  const S = window.AdminSystemCenter || {};
  const state = { data: P.loadState(), warningFilter: "alle", warningSearch: "" };

  function formatDate(value) {
    const text = String(value || "").trim();
    if (!text) return "-";
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(text)) return text;
    if (S.formatDate) return S.formatDate(text);
    const date = new Date(`${text}T00:00:00`);
    if (Number.isNaN(date.getTime())) return text;
    return `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}.${date.getFullYear()}`;
  }

  function formatLooseDateText(value) {
    return String(value || "").replace(/\b(\d{4}-\d{2}-\d{2})\b/g, (match) => formatDate(match));
  }

  function employeeName(id) {
    const e = P.getEmployee(state.data, id);
    return e ? `${e.firstName} ${e.lastName}` : id;
  }

  function statusBadge(text) {
    const t = P.normalize(text);
    const cls = t.includes("krank") || t.includes("ungueltig") || t.includes("gesperrt") ? "crit" : t.includes("urlaub") || t.includes("probe") || t.includes("schulung") ? "warn" : t.includes("dienst") || t.includes("aktiv") ? "ok" : "info";
    return `<span class="person-status ${cls}"><span class="dot"></span>${text}</span>`;
  }

  function warningLevelKey(level) {
    const n = P.normalize(level);
    if (n.includes("krit")) return "kritisch";
    if (n.includes("wichtig") || n.includes("warn")) return "wichtig";
    return "hinweis";
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
      ["ungültige Dokumente", s.invalidDocs],
      ["offene Schulungen", s.openTrainings],
      ["neue Mitarbeiter", s.newEmployees],
      ["Mitarbeiter in Probezeit", s.onProbation],
      ["heute verfügbare Fahrer", s.availableDriversToday]
    ];
    const node = document.querySelector("[data-person-kpis]");
    if (!node) return;
    node.innerHTML = rows.map((r) => `<article class="person-card"><small>${r[0]}</small><strong>${r[1]}</strong></article>`).join("");
  }

  function renderToday() {
    const body = document.querySelector("[data-person-today-table]");
    if (!body) return;
    body.innerHTML = state.data.employees.map((e) => `<tr><td>${e.firstName} ${e.lastName}</td><td>${e.role}</td><td>${e.todayShift || "-"}</td><td>${statusBadge(e.status)}</td><td>${e.activeVehicle || "-"}</td><td>${(e.todayShift || "-").split("-")[0] || "-"}</td><td>${e.phone || "-"}</td><td>${formatLooseDateText(e.profileNote || e.internalNotes || "-")}</td></tr>`).join("");
  }

  function renderWarningFilters() {
    const node = document.querySelector("[data-person-warning-filters]");
    if (!node) return;
    const rows = [
      { key: "alle", label: "Alle" },
      { key: "kritisch", label: "Kritisch" },
      { key: "wichtig", label: "Wichtig" },
      { key: "hinweis", label: "Hinweis" }
    ];
    node.innerHTML = rows.map((row) => `<button class="person-chip ${state.warningFilter === row.key ? "is-active" : ""}" type="button" data-person-warning-filter="${row.key}">${row.label}</button>`).join("");
  }

  function renderWarnings() {
    const list = document.querySelector("[data-person-warning-list]");
    if (!list) return;
    const warnings = P.buildPersonalWarnings(state.data).filter((warning) => {
      if (state.warningFilter !== "alle" && warningLevelKey(warning.level) !== state.warningFilter) return false;
      const query = P.normalize(state.warningSearch).trim();
      if (!query) return true;
      const text = P.normalize(`${employeeName(warning.employeeId)} ${warning.reason || ""} ${warning.detail || ""}`);
      return text.includes(query);
    });
    if (!warnings.length) {
      list.innerHTML = '<article class="person-item"><strong>Keine Warnungen</strong></article>';
      return;
    }
    list.innerHTML = warnings.slice(0, 24).map((w) => `<article class="person-item"><strong>${statusBadge(w.level)}</strong><p>${employeeName(w.employeeId)}: ${formatLooseDateText(w.reason || "")}</p><small>${formatLooseDateText(w.detail || "")}</small></article>`).join("");
  }

  function renderDocumentAmpel() {
    const node = document.querySelector("[data-person-doc-ampel]");
    if (!node) return;
    const counts = { gueltig: 0, bald: 0, kritisch: 0, ungeprueft: 0 };
    state.data.documents.forEach((doc) => {
      const s = P.normalize(doc.status);
      if (s.includes("abgelaufen") || s.includes("fehlt")) {
        counts.kritisch += 1;
        return;
      }
      if (s.includes("bald")) {
        counts.bald += 1;
        return;
      }
      if (s.includes("ungepr")) {
        counts.ungeprueft += 1;
        return;
      }
      counts.gueltig += 1;
    });
    node.innerHTML = [
      `<article class="person-card"><small>Grün · gültig</small><strong>${counts.gueltig}</strong></article>`,
      `<article class="person-card"><small>Gelb · läuft bald ab</small><strong>${counts.bald}</strong></article>`,
      `<article class="person-card"><small>Rot · kritisch</small><strong>${counts.kritisch}</strong></article>`,
      `<article class="person-card"><small>Blau · ungeprüft</small><strong>${counts.ungeprueft}</strong></article>`
    ].join("");
  }

  function renderStatusChips() {
    const node = document.querySelector("[data-person-status-chips]");
    if (!node) return;
    const statuses = ["eingeplant", "im Dienst", "verspätet", "Urlaub", "Krankheit", "frei", "Pause", "Schulung", "nicht verfügbar", "offene Schichten", "benötigte Vertretungen"];
    const count = {
      "im Dienst": state.data.employees.filter((e) => e.status === "im Dienst").length,
      "verspätet": state.data.employees.filter((e) => P.normalize(e.lastActivity || "").includes("verspaet")).length,
      Urlaub: state.data.employees.filter((e) => e.status === "Urlaub").length,
      Krankheit: state.data.employees.filter((e) => P.normalize(e.status).includes("krank")).length,
      frei: state.data.employees.filter((e) => e.status === "frei").length,
      Pause: state.data.employees.filter((e) => e.status === "Pause").length,
      Schulung: state.data.employees.filter((e) => e.status === "Schulung").length,
      "nicht verfügbar": state.data.employees.filter((e) => e.status === "nicht verfuegbar").length,
      "offene Schichten": state.data.coverage.length,
      "benötigte Vertretungen": state.data.coverage.filter((c) => c.candidates.length === 0 || c.conflicts.length > 0).length,
      eingeplant: state.data.employees.length
    };
    node.innerHTML = statuses.map((s) => `<span class="person-chip">${s}: ${count[s] || 0}</span>`).join("");
  }

  function bind() {
    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-person-reset-all]")) {
        if (!window.confirm("Personal-Demo wirklich zurücksetzen?")) return;
        state.data = P.resetState();
        renderKpis();
        renderToday();
        renderWarningFilters();
        renderWarnings();
        renderStatusChips();
        renderDocumentAmpel();
        return;
      }
      if (event.target.closest("[data-person-reset-year]")) {
        if (!window.confirm("Urlaubsjahr wirklich zurücksetzen?")) return;
        P.resetVacationYear(state.data);
        state.data = P.loadState();
        renderKpis();
        renderToday();
        renderWarningFilters();
        renderWarnings();
        renderStatusChips();
        renderDocumentAmpel();
        return;
      }
      const warningFilter = event.target.closest("[data-person-warning-filter]");
      if (warningFilter) {
        state.warningFilter = warningFilter.getAttribute("data-person-warning-filter") || "alle";
        renderWarningFilters();
        renderWarnings();
      }
    });

    document.addEventListener("input", (event) => {
      const search = event.target.closest("[data-person-warning-search]");
      if (!search) return;
      state.warningSearch = String(search.value || "");
      renderWarnings();
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderKpis();
    renderToday();
    renderWarningFilters();
    renderWarnings();
    renderStatusChips();
    renderDocumentAmpel();
    bind();
  });
})();
