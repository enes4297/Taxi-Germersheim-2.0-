(() => {
  const P = window.AdminPersonnelDemo;
  const state = { data: P.loadState(), employeeId: "MA-101", tab: "start" };

  function n(value) {
    return String(value || "").trim().toLowerCase();
  }

  function formatDate(value) {
    const text = String(value || "").trim();
    if (!text) return "-";
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(text)) return text;
    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return text;
    return `${match[3]}.${match[2]}.${match[1]}`;
  }

  function formatDateTime(value) {
    const text = String(value || "").trim();
    if (!text) return "-";
    const match = text.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})$/);
    if (!match) return formatDate(text);
    return `${formatDate(match[1])} · ${match[2]} Uhr`;
  }

  function formatPeriod(start, end) {
    return `${formatDate(start)} bis ${formatDate(end)}`;
  }

  function vacationQuota(employeeId) {
    return P.getVacationQuota(state.data, employeeId);
  }

  function emp() {
    return P.getEmployee(state.data, state.employeeId);
  }

  function openModal(title, body) {
    const m = document.querySelector("[data-portal-modal]");
    const t = document.querySelector("[data-portal-modal-title]");
    const b = document.querySelector("[data-portal-modal-body]");
    if (!m || !t || !b) return;
    t.textContent = title;
    b.innerHTML = body;
    m.hidden = false;
  }

  function closeModal() {
    const m = document.querySelector("[data-portal-modal]");
    if (m) m.hidden = true;
  }

  function renderIdentity() {
    const e = emp();
    if (!e) return;
    const nameNode = document.querySelector("[data-portal-name]");
    const roleNode = document.querySelector("[data-portal-role]");
    const statusNode = document.querySelector("[data-portal-status]");
    if (nameNode) nameNode.textContent = `${e.firstName} ${e.lastName}`;
    if (roleNode) roleNode.textContent = `${e.role} · ${e.employeeId}`;
    if (statusNode) statusNode.textContent = `Status: ${e.status}`;
  }

  function renderKpis() {
    const e = emp();
    if (!e) return;
    const snap = P.getPortalSnapshot(state.data, e.id);
    const node = document.querySelector("[data-portal-kpis]");
    if (!node || !snap) return;
    const rows = [
      ["Heute", e.todayShift || "kein Dienst hinterlegt"],
      ["Morgen", e.nextShift || "offen"],
      ["Status", e.status],
      ["Urlaubsanträge", snap.vacations.filter((v) => ["beantragt", "in Pruefung"].includes(v.status)).length],
      ["Krankmeldungen", snap.absences.filter((a) => a.kind === "Krank" && a.status !== "abgeschlossen").length],
      ["Mitteilungen", snap.messages.filter((m) => !m.reads[e.id]).length],
      ["Dokumente offen", snap.docs.filter((d) => ["eingereicht", "angefordert", "ungeprueft", "fehlt", "abgelaufen", "laeuft bald ab"].includes(d.status)).length]
    ];
    node.innerHTML = `<div class="driver-summary-grid">${rows.map((r) => `<article class="driver-item"><strong>${r[0]}</strong><p>${r[1]}</p></article>`).join("")}</div>`;

    const summary = document.querySelector("[data-portal-summary]");
    if (summary) {
      summary.innerHTML = `<div class="driver-list"><article class="driver-item"><strong>Hallo ${e.firstName}</strong><p>Heute: ${e.todayShift || "kein Dienst"}</p><p>Morgen: ${e.nextShift || "offen"}</p></article><article class="driver-item"><strong>Wichtige Hinweise</strong><p>Urlaub, Krankmeldung, Dokumente und Mitteilungen laufen in einem vereinfachten Mitarbeiterportal.</p></article></div>`;
    }
  }

  function renderVacations() {
    const e = emp();
    if (!e) return;
    const list = document.querySelector("[data-portal-vac-list]");
    const summary = document.querySelector("[data-portal-vac-summary]");
    if (!list) return;
    const vacs = state.data.vacations.filter((v) => v.employeeId === e.id);
    if (summary) {
      const quota = vacationQuota(e.id);
      summary.innerHTML = `<article class="driver-item"><strong>Resturlaub</strong><p>${quota.remaining} Tage verfügbar</p></article><article class="driver-item"><strong>Beantragt</strong><p>${quota.requested} Tage in Prüfung</p></article><article class="driver-item"><strong>Genehmigt</strong><p>${quota.approved} Tage</p></article>`;
    }
    list.innerHTML = vacs.length ? `<div class="driver-list">${vacs.map((v) => `<article class="driver-item"><strong>${v.type}</strong><p>${formatPeriod(v.start, v.end)}</p><p>Status: ${v.status}</p><div class="driver-item-actions"><button class="driver-btn" type="button" data-portal-vac-open="${v.id}">Details</button>${["beantragt", "in Pruefung"].includes(v.status) ? `<button class="driver-btn warning" type="button" data-portal-vac-withdraw="${v.id}">Antrag zurückziehen</button>` : ""}</div></article>`).join("")}</div>` : '<p class="demo-note">Keine Urlaubsanträge.</p>';
  }

  function renderShiftArea() {
    const e = emp();
    if (!e) return;
    const node = document.querySelector("[data-portal-shift-list]");
    if (!node) return;
    const today = e.todayShift || "kein Dienst hinterlegt";
    const next = e.nextShift || "offen";
    const absentToday = P.isEmployeeAbsentToday(state.data, e.id);
    node.innerHTML = `<div class="driver-list"><article class="driver-item"><strong>Heutiger Dienst</strong><p>${today}</p><p>Status: ${absentToday ? "nicht im Einsatz" : e.status}</p></article><article class="driver-item"><strong>Nächster Dienst</strong><p>${formatDateTime(next)}</p><p>Letzte Aktivität: ${e.lastActivity || "-"}</p></article></div>`;
  }

  function renderDocs() {
    const e = emp();
    if (!e) return;
    const node = document.querySelector("[data-portal-doc-list]");
    if (!node) return;
    const docs = state.data.documents.filter((d) => d.employeeId === e.id);
    node.innerHTML = docs.length ? `<div class="driver-list">${docs.map((d) => `<article class="driver-item"><strong>${d.type}</strong><p>Status: ${d.status}</p><p>Ablaufdatum: ${formatDate(d.validUntil || "")}</p><p>Eingereicht: ${d.submittedAt ? formatDate(d.submittedAt) : "-"}</p><p>${d.demoFileName ? `Datei: ${d.demoFileName}` : ""}</p><p>Handlungsbedarf: ${["abgelaufen", "fehlt", "laeuft bald ab", "eingereicht", "angefordert", "ungeprueft"].includes(d.status) ? "ja" : "nein"}</p></article>`).join("")}</div>` : '<p class="demo-note">Keine Dokumente.</p>';
  }

  function renderAbsences() {
    const e = emp();
    if (!e) return;
    const node = document.querySelector("[data-portal-absence-list]");
    const summary = document.querySelector("[data-portal-absence-summary]");
    if (!node) return;
    const absences = state.data.absences.filter((a) => a.employeeId === e.id);
    if (summary) {
      const open = absences.filter((a) => a.kind === "Krank" && a.status !== "abgeschlossen").length;
      summary.innerHTML = `<article class="driver-item"><strong>Offene Meldungen</strong><p>${open}</p></article><article class="driver-item"><strong>Letzter Stand</strong><p>${absences[0] ? `${formatPeriod(absences[0].start, absences[0].expectedEnd)} · ${absences[0].status}` : "keine Meldung"}</p></article>`;
    }
    node.innerHTML = absences.length ? `<div class="driver-list">${absences.map((a) => `<article class="driver-item"><strong>${a.kind}</strong><p>${formatPeriod(a.start, a.expectedEnd)}</p><p>Status: ${a.status}</p><p>${a.note || ""}</p></article>`).join("")}</div>` : '<p class="demo-note">Keine Krankmeldungen oder sonstigen Abwesenheiten.</p>';
  }

  function renderMessages() {
    const e = emp();
    if (!e) return;
    const node = document.querySelector("[data-portal-msg-list]");
    if (!node) return;
    const msgs = state.data.messages.filter((m) => (m.employeeIds || []).includes(e.id));
    node.innerHTML = msgs.length ? `<div class="driver-list">${msgs.map((m) => `<article class="driver-item"><strong>${m.title}</strong><p>${m.text}</p><p>Priorität: ${m.priority}</p><p>Gelesen: ${m.reads[e.id] ? "ja" : "nein"}${m.confirmRequired ? ` · Bestätigt: ${m.confirmations[e.id] ? "ja" : "nein"}` : ""}</p><div class="driver-item-actions"><button class="driver-btn" type="button" data-portal-msg-read="${m.id}">Gelesen markieren</button>${m.confirmRequired ? `<button class="driver-btn" type="button" data-portal-msg-confirm="${m.id}">Bestätigen</button>` : ""}<button class="driver-btn" type="button" data-portal-msg-question="${m.id}">Rückfrage senden</button></div></article>`).join("")}</div>` : '<p class="demo-note">Keine Mitteilungen.</p>';
  }

  function render() {
    renderIdentity();
    renderKpis();
    renderVacations();
    renderShiftArea();
    renderDocs();
    renderMessages();
    renderAbsences();
  }

  function setTab(tab) {
    state.tab = tab;
    document.querySelectorAll("[data-portal-tab]").forEach((b) => b.classList.toggle("is-active", (b.getAttribute("data-portal-tab") || "") === tab));
    document.querySelectorAll("[data-portal-pane]").forEach((p) => p.classList.toggle("is-visible", (p.getAttribute("data-portal-pane") || "") === tab));
  }

  function bind() {
    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-portal-close]")) {
        closeModal();
        return;
      }

      const tab = event.target.closest("[data-portal-tab]");
      if (tab) {
        setTab(tab.getAttribute("data-portal-tab") || "start");
        return;
      }

      if (event.target.closest("[data-portal-switch]")) {
        const ids = state.data.employees.map((e) => e.id);
        const i = ids.indexOf(state.employeeId);
        state.employeeId = ids[(i + 1) % ids.length] || state.employeeId;
        render();
        return;
      }

      const quick = event.target.closest("[data-portal-action]");
      if (quick) {
        const action = quick.getAttribute("data-portal-action") || "";
        if (action === "urlaub") setTab("urlaub");
        if (action === "dienstplan") setTab("dienstplan");
        if (action === "krank") setTab("krank");
        if (action === "doku") setTab("dokumente");
        if (action === "msg") setTab("mitteilungen");
        return;
      }

      const open = event.target.closest("[data-portal-vac-open]");
      if (open) {
        const row = state.data.vacations.find((v) => v.id === open.getAttribute("data-portal-vac-open"));
        if (!row) return;
        openModal(`Antrag ${row.id}`, `<p>Status: ${row.status}</p><p>Zeitraum: ${row.start} bis ${row.end}</p><p>Rueckfragen/Notiz: ${row.decisionNote || row.internalNote || "-"}</p>`);
        return;
      }

      const withdraw = event.target.closest("[data-portal-vac-withdraw]");
      if (withdraw) {
        const row = state.data.vacations.find((v) => v.id === withdraw.getAttribute("data-portal-vac-withdraw"));
        if (!row) return;
        row.status = "zurueckgezogen";
        P.saveState(state.data);
        state.data = P.loadState();
        renderVacations();
        return;
      }

      const read = event.target.closest("[data-portal-msg-read]");
      if (read) {
        const id = read.getAttribute("data-portal-msg-read") || "";
        P.pushMessageRead(state.data, id, state.employeeId, "read");
        state.data = P.loadState();
        renderMessages();
        renderKpis();
        return;
      }

      const conf = event.target.closest("[data-portal-msg-confirm]");
      if (conf) {
        const id = conf.getAttribute("data-portal-msg-confirm") || "";
        P.pushMessageRead(state.data, id, state.employeeId, "confirm");
        P.pushMessageRead(state.data, id, state.employeeId, "read");
        state.data = P.loadState();
        renderMessages();
        renderKpis();
        return;
      }

      const question = event.target.closest("[data-portal-msg-question]");
      if (question) {
        openModal("Rückfrage", "<p>Rückfrage an die Personalverwaltung wurde als Demo vorgemerkt.</p>");
        return;
      }
    });

    const vacForm = document.querySelector("[data-portal-vac-form]");
    if (vacForm) {
      vacForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const fd = new FormData(vacForm);
        P.addVacationRequest(state.data, {
          employeeId: state.employeeId,
          start: String(fd.get("start") || ""),
          end: String(fd.get("end") || ""),
          halfDay: false,
          workDaysDemo: 1,
          type: String(fd.get("type") || "Erholungsurlaub"),
          replacementId: "",
          comment: String(fd.get("comment") || ""),
          internalNote: "Portal-Antrag",
          requester: state.employeeId,
          createdAt: P.todayIso(),
          status: "beantragt"
        });
        state.data = P.loadState();
        renderVacations();
        renderKpis();
        vacForm.reset();
      });
    }

    const absenceForm = document.querySelector("[data-portal-absence-form]");
    if (absenceForm) {
      absenceForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const fd = new FormData(absenceForm);
        P.addAbsence(state.data, {
          employeeId: state.employeeId,
          kind: "Krank",
          start: String(fd.get("start") || P.todayIso()),
          expectedEnd: String(fd.get("expectedEnd") || P.todayIso()),
          receivedAt: P.todayIso(),
          via: String(fd.get("via") || "Mitarbeiterportal"),
          proofStatus: "angefordert",
          note: String(fd.get("note") || ""),
          status: "gemeldet",
          affectedShifts: []
        });
        state.data = P.loadState();
        renderAbsences();
        renderKpis();
        absenceForm.reset();
        openModal("Krankmeldung eingereicht", "<p>Die Krankmeldung wurde an die Personalverwaltung übergeben.</p><p>Bitte das ärztliche Attest nachreichen, sobald es vorliegt.</p>");
      });
    }

    const docForm = document.querySelector("[data-portal-doc-form]");
    if (docForm) {
      docForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const fd = new FormData(docForm);
        const fileInput = docForm.querySelector('input[type="file"]');
        const file = fileInput && fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
        P.submitEmployeeDocument(state.data, {
          employeeId: state.employeeId,
          type: String(fd.get("type") || "Sonstiges Dokument"),
          note: String(fd.get("note") || ""),
          demoFile: file ? file.name : "",
          demoFileName: file ? file.name : "",
          demoFileType: file ? file.type : ""
        });
        state.data = P.loadState();
        openModal("Dokument eingereicht", `<p>${file ? file.name : "Das Dokument"} wurde an die Verwaltung übergeben.</p><p>Status: neu eingereicht.</p>`);
        docForm.reset();
        renderDocs();
        renderKpis();
      });
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (window.AdminUiText) {
      window.AdminUiText.normalizeDocument(document);
      window.AdminUiText.observeDocument(document);
    }

    render();
    bind();
    setTab("start");
  });
})();
