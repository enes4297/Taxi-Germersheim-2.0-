(() => {
  const P = window.AdminPersonnelDemo;
  const state = { data: P.loadState() };

  function recipientsFor(msg) {
    return msg.recipients || "-";
  }

  function badge(text) {
    const t = P.normalize(text);
    const cls = t.includes("wichtig") || t.includes("notfall") ? "crit" : t.includes("aktiv") || t.includes("normal") ? "ok" : "info";
    return `<span class="person-status ${cls}"><span class="dot"></span>${text}</span>`;
  }

  function renderTable() {
    const body = document.querySelector("[data-msg-table]");
    if (!body) return;
    if (!state.data.messages.length) {
      body.innerHTML = '<tr><td colspan="10">Keine Mitteilungen</td></tr>';
      return;
    }
    body.innerHTML = state.data.messages.map((m) => {
      const total = (m.employeeIds || []).length;
      const read = Object.values(m.reads || {}).filter(Boolean).length;
      const conf = Object.values(m.confirmations || {}).filter(Boolean).length;
      return `<tr><td>${m.title}</td><td>${m.category}</td><td>${badge(m.priority)}</td><td>${recipientsFor(m)}</td><td>${m.from || "-"} bis ${m.to || "-"}</td><td>${read}/${total}</td><td>${m.confirmRequired ? `${conf}/${total}` : "n. e."}</td><td>${m.lastReminder || "-"}</td><td>${badge(m.status)}</td><td><div class="person-actions"><button class="admin-btn admin-btn-secondary" type="button" data-msg-action="remind" data-msg-id="${m.id}">Erinnerung</button><button class="admin-btn admin-btn-secondary" type="button" data-msg-action="extend" data-msg-id="${m.id}">Frist verlaengern</button><button class="admin-btn admin-btn-warning" type="button" data-msg-action="archive" data-msg-id="${m.id}">Archivieren</button></div></td></tr>`;
    }).join("");
  }

  function mapRecipients(rec, explicitIds) {
    if (explicitIds.length) return explicitIds;
    if (rec === "alle Mitarbeiter") return state.data.employees.map((e) => e.id);
    if (rec === "alle Fahrer") return state.data.employees.filter((e) => e.role === "Fahrer").map((e) => e.id);
    if (rec === "Disposition") return state.data.employees.filter((e) => e.role === "Disposition").map((e) => e.id);
    if (rec === "Verwaltung") return state.data.employees.filter((e) => e.role === "Verwaltung" || e.role === "Admin").map((e) => e.id);
    return [];
  }

  function bind() {
    const form = document.querySelector("[data-msg-form]");
    if (form) {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const fd = new FormData(form);
        const explicitIds = String(fd.get("employeeIds") || "").split(",").map((x) => x.trim()).filter(Boolean);
        const recipients = String(fd.get("recipients") || "alle Mitarbeiter");
        const ids = mapRecipients(recipients, explicitIds);
        const readState = {};
        const confirmState = {};
        ids.forEach((id) => {
          readState[id] = false;
          confirmState[id] = false;
        });

        state.data.messages.unshift({
          id: `MSG-${Date.now()}`,
          title: String(fd.get("title") || "Mitteilung"),
          text: String(fd.get("text") || ""),
          category: String(fd.get("category") || "allgemeine Information"),
          priority: String(fd.get("priority") || "normal"),
          recipients,
          roles: String(fd.get("roles") || "").split(",").map((x) => x.trim()).filter(Boolean),
          employeeIds: ids,
          from: String(fd.get("from") || P.todayIso()),
          to: String(fd.get("to") || ""),
          confirmRequired: String(fd.get("confirmRequired") || "true") === "true",
          attachment: String(fd.get("attachment") || ""),
          createdBy: String(fd.get("createdBy") || "Admin Enes"),
          status: "aktiv",
          reads: readState,
          confirmations: confirmState,
          lastReminder: ""
        });

        P.saveState(state.data);
        state.data = P.loadState();
        renderTable();
        form.reset();
      });
    }

    document.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-msg-action]");
      if (!btn) return;
      const id = btn.getAttribute("data-msg-id") || "";
      const action = btn.getAttribute("data-msg-action") || "";
      const row = state.data.messages.find((m) => m.id === id);
      if (!row) return;
      if (action === "remind") row.lastReminder = P.todayIso();
      if (action === "extend") row.to = row.to || P.todayIso();
      if (action === "archive") row.status = "archiviert";
      P.saveState(state.data);
      state.data = P.loadState();
      renderTable();
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderTable();
    bind();
  });
})();
