(() => {
  const P = window.AdminPersonnelDemo;
  const state = { data: P.loadState() };

  function empName(id) {
    const e = P.getEmployee(state.data, id);
    return e ? `${e.firstName} ${e.lastName}` : id;
  }

  function statusBadge(text) {
    const t = P.normalize(text);
    const cls = t.includes("krank") || t.includes("fehlt") || t.includes("unvollstaendig") ? "crit" : t.includes("pruefung") || t.includes("angekuendigt") || t.includes("angefordert") ? "warn" : t.includes("bestaetigt") || t.includes("abgeschlossen") ? "ok" : "info";
    return `<span class="person-status ${cls}"><span class="dot"></span>${text}</span>`;
  }

  function fillEmployees() {
    const emp = document.querySelector("[data-abs-employee]");
    const rep = document.querySelector("[data-abs-replacement]");
    if (emp) emp.innerHTML = state.data.employees.map((e) => `<option value="${e.id}">${e.firstName} ${e.lastName}</option>`).join("");
    if (rep) rep.innerHTML = `<option value="">-</option>${state.data.employees.map((e) => `<option value="${e.id}">${e.firstName} ${e.lastName}</option>`).join("")}`;
  }

  function renderKpis() {
    const t = P.todayIso();
    const abs = state.data.absences.filter((a) => t >= a.start && t <= a.expectedEnd && a.status !== "abgeschlossen");
    const kpis = [
      ["heute abwesend", abs.length],
      ["krank", abs.filter((a) => a.kind === "Krank").length],
      ["Urlaub", state.data.vacations.filter((v) => ["genehmigt", "teilweise genehmigt"].includes(v.status) && t >= v.start && t <= v.end).length],
      ["Schulung", abs.filter((a) => a.kind === "Schulung" || a.kind === "Fortbildung").length],
      ["sonstige Abwesenheit", abs.filter((a) => !["Krank", "Schulung", "Fortbildung"].includes(a.kind)).length],
      ["offene Nachweise", abs.filter((a) => ["angefordert", "fehlt", "unvollstaendig", "angekuendigt"].includes(a.proofStatus)).length],
      ["Rueckkehr heute", state.data.absences.filter((a) => a.returnedAt === t).length],
      ["Vertretung erforderlich", abs.filter((a) => !a.replacementId).length]
    ];
    const node = document.querySelector("[data-abs-kpis]");
    if (!node) return;
    node.innerHTML = kpis.map((k) => `<article class="person-card"><small>${k[0]}</small><strong>${k[1]}</strong></article>`).join("");
  }

  function renderTable() {
    const body = document.querySelector("[data-abs-table]");
    if (!body) return;
    if (!state.data.absences.length) {
      body.innerHTML = '<tr><td colspan="9">Keine Abwesenheiten</td></tr>';
      return;
    }
    body.innerHTML = state.data.absences.map((a) => `<tr><td>${empName(a.employeeId)}</td><td>${a.kind}</td><td>${a.start} bis ${a.expectedEnd}</td><td>${statusBadge(a.status)}</td><td>${statusBadge(a.proofStatus)}</td><td>${a.replacementId ? empName(a.replacementId) : "-"}</td><td>${(a.affectedShifts || []).join(", ") || "-"}</td><td>${a.note || "-"}</td><td><button class="admin-btn admin-btn-secondary" type="button" data-abs-return="${a.id}">Rueckkehr</button></td></tr>`).join("");
  }

  function bind() {
    document.addEventListener("click", (event) => {
      const ret = event.target.closest("[data-abs-return]");
      if (!ret) return;
      const id = ret.getAttribute("data-abs-return") || "";
      P.markReturn(state.data, id, P.todayIso(), true);
      state.data = P.loadState();
      renderKpis();
      renderTable();
    });

    const form = document.querySelector("[data-abs-form]");
    if (form) {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const fd = new FormData(form);
        P.addAbsence(state.data, {
          employeeId: String(fd.get("employeeId") || ""),
          kind: String(fd.get("kind") || "Krank"),
          start: String(fd.get("start") || ""),
          expectedEnd: String(fd.get("expectedEnd") || ""),
          returnedAt: String(fd.get("returnedAt") || ""),
          receivedAt: String(fd.get("receivedAt") || P.todayIso()),
          via: String(fd.get("via") || "telefonisch"),
          proofStatus: String(fd.get("proofStatus") || "angekuendigt"),
          replacementId: String(fd.get("replacementId") || ""),
          note: String(fd.get("note") || ""),
          status: "gemeldet",
          affectedShifts: String(fd.get("affectedShifts") || "").split(";").map((x) => x.trim()).filter(Boolean)
        });
        state.data = P.loadState();
        renderKpis();
        renderTable();
        form.reset();
      });
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    fillEmployees();
    renderKpis();
    renderTable();
    bind();
  });
})();
