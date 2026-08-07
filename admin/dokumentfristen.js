(() => {
  const P = window.AdminPersonnelDemo;
  const state = { data: P.loadState() };

  function empName(id) {
    const e = P.getEmployee(state.data, id);
    return e ? `${e.firstName} ${e.lastName}` : id;
  }

  function badge(text) {
    const t = P.normalize(text);
    const cls = t.includes("abgelaufen") || t.includes("fehlt") || t.includes("ungueltig") || t.includes("abgelehnt") ? "crit" : t.includes("bald") || t.includes("ungeprueft") || t.includes("angefordert") || t.includes("unvollstaendig") ? "warn" : t.includes("gueltig") || t.includes("ersetzt") || t.includes("eingereicht") ? "ok" : "info";
    return `<span class="person-status ${cls}"><span class="dot"></span>${text}</span>`;
  }

  function formatDate(value) {
    const text = String(value || "").trim();
    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return text || "-";
    return `${match[3]}.${match[2]}.${match[1]}`;
  }

  function expiryInfo(validUntil) {
    if (!validUntil) return "Kein Datum";
    const days = P.daysUntil(validUntil);
    if (days < 0) return `Abgelaufen seit ${Math.abs(days)} Tagen`;
    if (days === 0) return "Läuft heute ab";
    return `Läuft in ${days} Tagen ab`;
  }

  function statusByDate(validUntil, fallback) {
    const days = P.daysUntil(validUntil);
    if (!validUntil) return fallback || "ungeprüft";
    if (days < 0) return "abgelaufen";
    if (days <= 30) return "läuft bald ab";
    return fallback || "gültig";
  }

  function fillForm() {
    const emp = document.querySelector("[data-docfr-employee]");
    const type = document.querySelector("[data-docfr-type]");
    if (emp) emp.innerHTML = state.data.employees.map((e) => `<option value="${e.id}">${e.firstName} ${e.lastName}</option>`).join("");
    if (type) type.innerHTML = P.DOC_TYPES.map((d) => `<option>${d}</option>`).join("");
  }

  function renderKpis() {
    const docs = state.data.documents;
    const exp30 = docs.filter((d) => {
      const days = P.daysUntil(d.validUntil);
      return days >= 0 && days <= 30;
    }).length;
    const exp60 = docs.filter((d) => {
      const days = P.daysUntil(d.validUntil);
      return days > 30 && days <= 60;
    }).length;
    const kpis = [
      ["Dokumente gesamt", docs.length],
      ["vollstaendig", docs.filter((d) => d.status === "gueltig").length],
      ["laufen in 30 Tagen ab", exp30],
      ["laufen in 60 Tagen ab", exp60],
      ["abgelaufen", docs.filter((d) => d.status === "abgelaufen").length],
      ["fehlen", docs.filter((d) => d.status === "fehlt").length],
      ["ungeprueft", docs.filter((d) => d.status === "ungeprueft").length],
      ["kritisch", docs.filter((d) => ["abgelaufen", "fehlt", "abgelehnt"].includes(d.status)).length]
    ];
    const node = document.querySelector("[data-doc-kpis]");
    if (!node) return;
    node.innerHTML = kpis.map((k) => `<article class="person-card"><small>${k[0]}</small><strong>${k[1]}</strong></article>`).join("");
  }

  function renderTable() {
    const body = document.querySelector("[data-docfr-table]");
    if (!body) return;
    if (!state.data.documents.length) {
      body.innerHTML = '<tr><td colspan="11">Keine Dokumente</td></tr>';
      return;
    }
    body.innerHTML = state.data.documents.map((d) => {
      const datedStatus = statusByDate(d.validUntil, d.status);
      return `<tr><td>${empName(d.employeeId)}</td><td>${d.type}</td><td>${d.no || "-"}</td><td>${formatDate(d.issuedAt)}</td><td>${formatDate(d.validUntil)}</td><td>${badge(datedStatus)}</td><td>${formatDate(d.checkedAt)}</td><td>${d.checkedBy || "-"}</td><td>${d.reminderActive ? d.reminder : "aus"}</td><td>${expiryInfo(d.validUntil)}</td><td><button class="admin-btn admin-btn-secondary" type="button" data-docfr-act="${d.id}">Prüfen</button></td></tr>`;
    }).join("");
  }

  function renderChecks() {
    const body = document.querySelector("[data-docfr-check-table]");
    if (!body) return;
    if (!state.data.licenseChecks.length) {
      body.innerHTML = '<tr><td colspan="12">Keine Kontrollen</td></tr>';
      return;
    }
    body.innerHTML = state.data.licenseChecks.map((c) => {
      const st = c.validityConfirmed === "Ja" ? "gueltig" : c.shown === "Nein" ? "nicht vorgelegt" : c.issue ? "Rueckfrage" : "Kontrolle ueberfaellig";
      return `<tr><td>${empName(c.employeeId)}</td><td>${formatDate(c.date)}</td><td>${c.time}</td><td>${c.checkedBy}</td><td>${c.shown}</td><td>${c.validityConfirmed}</td><td>${c.classesConfirmed}</td><td>${c.issue || "-"}</td><td>${formatDate(c.nextCheck)}</td><td>${c.note || "-"}</td><td>${c.signature || "-"}</td><td>${badge(st)}</td></tr>`;
    }).join("");
  }

  function bind() {
    const form = document.querySelector("[data-docfr-form]");
    if (form) {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const fd = new FormData(form);
        state.data.documents.unshift({
          id: `PDOC-${Date.now()}`,
          employeeId: String(fd.get("employeeId") || ""),
          type: String(fd.get("type") || "sonstiges Dokument"),
          no: String(fd.get("no") || ""),
          issuedAt: String(fd.get("issuedAt") || ""),
          validUntil: String(fd.get("validUntil") || ""),
          issuer: String(fd.get("issuer") || ""),
          status: String(fd.get("status") || "ungeprueft"),
          note: String(fd.get("note") || ""),
          demoFile: String(fd.get("demoFile") || ""),
          reminderActive: String(fd.get("reminderActive") || "true") === "true",
          reminder: String(fd.get("reminder") || "30 Tage"),
          checkedAt: "",
          checkedBy: ""
        });
        P.applyDocumentLockSync(state.data);
        P.saveState(state.data);
        state.data = P.loadState();
        renderKpis();
        renderTable();
        renderChecks();
        form.reset();
      });
    }

    document.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-docfr-act]");
      if (!btn) return;
      const id = btn.getAttribute("data-docfr-act") || "";
      const doc = state.data.documents.find((d) => d.id === id);
      if (!doc) return;
      doc.checkedAt = P.todayIso();
      doc.checkedBy = "Admin Enes";
      if (doc.status === "ungeprueft" || doc.status === "eingereicht") doc.status = "gueltig";
      P.applyDocumentLockSync(state.data);
      P.saveState(state.data);
      state.data = P.loadState();
      renderKpis();
      renderTable();
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    fillForm();
    renderKpis();
    renderTable();
    renderChecks();
    bind();
  });
})();
