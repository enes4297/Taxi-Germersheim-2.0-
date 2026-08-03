(() => {
  const P = window.AdminPersonnelDemo;
  const state = { data: P.loadState(), year: new Date().getFullYear(), role: "alle", status: "alle", view: "Jahr" };

  function name(id) {
    const e = P.getEmployee(state.data, id);
    return e ? `${e.firstName} ${e.lastName}` : id;
  }

  function statusBadge(text) {
    const t = P.normalize(text);
    const cls = t.includes("abgelehnt") || t.includes("storniert") ? "crit" : t.includes("beantragt") || t.includes("pruefung") || t.includes("teilweise") ? "warn" : t.includes("genehmigt") ? "ok" : "info";
    return `<span class="person-status ${cls}"><span class="dot"></span>${text}</span>`;
  }

  function fillYear() {
    const sel = document.querySelector("[data-vac-year]");
    if (!sel) return;
    const years = [state.year - 1, state.year, state.year + 1];
    sel.innerHTML = years.map((y) => `<option value="${y}"${y === state.year ? " selected" : ""}>${y}</option>`).join("");
  }

  function fillEmployees() {
    const emp = document.querySelector("[data-vac-employee]");
    const rep = document.querySelector("[data-vac-replacement]");
    if (emp) emp.innerHTML = state.data.employees.map((e) => `<option value="${e.id}">${e.firstName} ${e.lastName} (${e.role})</option>`).join("");
    if (rep) rep.innerHTML = `<option value="">-</option>${state.data.employees.map((e) => `<option value="${e.id}">${e.firstName} ${e.lastName}</option>`).join("")}`;
  }

  function toMonthGrid(month) {
    const days = new Date(state.year, month + 1, 0).getDate();
    const startWeekday = new Date(state.year, month, 1).getDay();
    const slots = [];
    for (let i = 0; i < (startWeekday === 0 ? 6 : startWeekday - 1); i += 1) slots.push("<span class='person-day'></span>");

    for (let d = 1; d <= days; d += 1) {
      const iso = `${state.year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const wd = new Date(state.year, month, d).getDay();
      const weekend = wd === 0 || wd === 6;
      const vac = state.data.vacations.some((v) => ["genehmigt", "teilweise genehmigt", "beantragt", "in Pruefung"].includes(v.status) && iso >= v.start && iso <= v.end);
      const sick = state.data.absences.some((a) => a.kind === "Krank" && iso >= a.start && iso <= a.expectedEnd);
      const tr = state.data.trainings.some((t) => t.date === iso);
      const cls = `${weekend ? " weekend" : ""}${vac ? " vac" : ""}${sick ? " sick" : ""}${tr ? " training" : ""}`;
      slots.push(`<span class="person-day${cls}">${d}</span>`);
    }

    return slots.join("");
  }

  function renderCalendar() {
    const node = document.querySelector("[data-vac-calendar]");
    if (!node) return;
    const months = ["Jan", "Feb", "Mrz", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
    node.innerHTML = months.map((m, idx) => `<article class="person-month"><strong>${m} ${state.year}</strong><div class="person-day-grid">${toMonthGrid(idx)}</div></article>`).join("");
  }

  function filteredRequests() {
    return state.data.vacations.filter((v) => {
      const emp = P.getEmployee(state.data, v.employeeId);
      if (!emp) return false;
      if (state.role !== "alle" && emp.role !== state.role) return false;
      if (state.status !== "alle" && v.status !== state.status) return false;
      return true;
    });
  }

  function renderTable() {
    const body = document.querySelector("[data-vac-table]");
    if (!body) return;
    const rows = filteredRequests();
    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="7">Keine Urlaubsantraege</td></tr>';
      return;
    }
    body.innerHTML = rows.map((r) => {
      const conf = P.evaluateVacationConflicts(state.data, r);
      return `<tr><td>${name(r.employeeId)}</td><td>${r.start} bis ${r.end}</td><td>${r.type}</td><td>${statusBadge(r.status)}</td><td>${r.replacementId ? name(r.replacementId) : "-"}</td><td>${conf.length ? `${conf.length} Konflikt(e)` : "keine"}</td><td><button class="admin-btn admin-btn-secondary" type="button" data-vac-open="${r.id}">Pruefen</button></td></tr>`;
    }).join("");
  }

  function printFormHtml(req) {
    return `<div class="person-print"><h2>Taxi Germersheim GmbH</h2><h3>Urlaubsantrag</h3><p>Mitarbeitername: ${name(req.employeeId)}</p><p>Zeitraum: ${req.start} bis ${req.end}</p><p>Anzahl Tage (Demo): ${req.workDaysDemo}</p><p>Urlaubsart: ${req.type}</p><p>Antrag gestellt am: ${req.createdAt}</p><p>Vertretung: ${req.replacementId ? name(req.replacementId) : "-"}</p><p>Mitarbeiterunterschrift: ____________________</p><p>Genehmigt durch: ${req.decisionBy || "-"}</p><p>Unterschrift Geschaeftsleitung: ____________________</p><p>Genehmigungsdatum: ${req.decisionAt || "-"}</p><p>Bemerkungen: ${req.decisionNote || req.comment || ""}</p></div>`;
  }

  function openModal(title, body, foot) {
    const modal = document.querySelector("[data-vac-modal]");
    const t = document.querySelector("[data-vac-title]");
    const b = document.querySelector("[data-vac-body]");
    const f = document.querySelector("[data-vac-foot]");
    if (!modal || !t || !b || !f) return;
    t.textContent = title;
    b.innerHTML = body;
    f.innerHTML = foot || '<button class="admin-btn admin-btn-secondary" type="button" data-vac-close>Schliessen</button>';
    modal.hidden = false;
  }

  function closeModal() {
    const modal = document.querySelector("[data-vac-modal]");
    if (modal) modal.hidden = true;
  }

  function bind() {
    document.addEventListener("change", (event) => {
      const year = event.target.closest("[data-vac-year]");
      if (year) {
        state.year = Number(year.value || state.year);
        renderCalendar();
        return;
      }
      const role = event.target.closest("[data-vac-role]");
      if (role) {
        state.role = String(role.value || "alle");
        renderTable();
        return;
      }
      const st = event.target.closest("[data-vac-status]");
      if (st) {
        state.status = String(st.value || "alle");
        renderTable();
        return;
      }
      const view = event.target.closest("[data-vac-view]");
      if (view) state.view = String(view.value || "Jahr");
    });

    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-vac-close]")) {
        closeModal();
        return;
      }

      const open = event.target.closest("[data-vac-open]");
      if (!open) return;
      const id = open.getAttribute("data-vac-open") || "";
      const req = state.data.vacations.find((v) => v.id === id);
      if (!req) return;
      const conflicts = P.evaluateVacationConflicts(state.data, req);
      const conflictHtml = conflicts.length
        ? `<div class="person-list">${conflicts.map((c) => `<article class="person-item"><strong>${c.cause}</strong><p>betroffene Tage: ${c.days}</p><p>betroffene Mitarbeiter: ${c.employees.join(", ")}</p><p>betroffene Schichten: ${c.shifts.join(", ")}</p><p>Loesungsvorschlag: ${c.suggestion}</p></article>`).join("")}</div>`
        : "<p>Keine Konflikte erkannt.</p>";

      openModal(
        `Antrag ${id}`,
        `<p>${name(req.employeeId)} · ${req.start} bis ${req.end} · ${req.type}</p>${conflictHtml}`,
        `<div class="person-actions"><button class="admin-btn" type="button" data-vac-action="genehmigt" data-vac-id="${id}">genehmigen</button><button class="admin-btn admin-btn-secondary" type="button" data-vac-action="teilweise genehmigt" data-vac-id="${id}">teilweise genehmigen</button><button class="admin-btn admin-btn-warning" type="button" data-vac-action="abgelehnt" data-vac-id="${id}">ablehnen</button><button class="admin-btn admin-btn-secondary" type="button" data-vac-action="in Pruefung" data-vac-id="${id}">Rueckfrage stellen</button><button class="admin-btn admin-btn-secondary" type="button" data-vac-action="print" data-vac-id="${id}">Druckansicht</button></div>`
      );
    });

    document.addEventListener("click", (event) => {
      const act = event.target.closest("[data-vac-action]");
      if (!act) return;
      const id = act.getAttribute("data-vac-id") || "";
      const action = act.getAttribute("data-vac-action") || "";
      const req = state.data.vacations.find((v) => v.id === id);
      if (!req) return;

      if (action === "print") {
        openModal(`Urlaubsformular ${id}`, printFormHtml(req));
        return;
      }

      P.decideVacationRequest(state.data, id, action, "Admin Enes", "Demo-Entscheidung");
      state.data = P.loadState();
      closeModal();
      renderTable();
      renderCalendar();
    });

    const form = document.querySelector("[data-vac-form]");
    if (form) {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const fd = new FormData(form);
        const payload = {
          employeeId: String(fd.get("employeeId") || ""),
          start: String(fd.get("start") || ""),
          end: String(fd.get("end") || ""),
          halfDay: String(fd.get("halfDay") || "false") === "true",
          workDaysDemo: Number(fd.get("workDaysDemo") || 1),
          type: String(fd.get("type") || "Erholungsurlaub"),
          replacementId: String(fd.get("replacementId") || ""),
          comment: String(fd.get("comment") || ""),
          internalNote: String(fd.get("internalNote") || ""),
          requester: String(fd.get("requester") || ""),
          createdAt: String(fd.get("createdAt") || P.todayIso()),
          status: "beantragt"
        };
        const result = P.addVacationRequest(state.data, payload);
        state.data = P.loadState();
        renderTable();
        renderCalendar();
        const conflictText = result.conflicts.length
          ? `<p>Konflikte erkannt: ${result.conflicts.length}</p><ul>${result.conflicts.map((c) => `<li>${c.cause} (${c.suggestion})</li>`).join("")}</ul>`
          : "<p>Kein Konflikt erkannt.</p>";
        openModal("Urlaubsantrag erstellt", conflictText);
        form.reset();
      });
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    fillYear();
    fillEmployees();
    renderCalendar();
    renderTable();
    bind();
  });
})();
