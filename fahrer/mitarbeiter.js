(() => {
  const P = window.AdminPersonnelDemo;
  const Q = window.AdminQualityDemo || null;
  const state = { data: P.loadState(), employeeId: "MA-101", tab: "start" };

  function n(value) {
    return String(value || "").trim().toLowerCase();
  }

  function nowTime() {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
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
      ["Begruessung", `Hallo ${e.firstName}`],
      ["aktueller Status", e.status],
      ["heutige Schicht", e.todayShift || "-"],
      ["naechster Dienst", e.nextShift || "-"],
      ["aktuelles Fahrzeug", e.activeVehicle || "-"],
      ["offene Mitteilungen", snap.messages.filter((m) => !m.reads[e.id]).length],
      ["Dokumente laufen ab", snap.docs.filter((d) => d.status === "laeuft bald ab").length],
      ["offene Schulungen", snap.trainings.filter((t) => ["eingeladen", "bestaetigt", "Nachweis fehlt"].includes(t.status)).length],
      ["Urlaubsstatus", snap.vacations.find((v) => ["genehmigt", "teilweise genehmigt"].includes(v.status)) ? "Urlaub vorhanden" : "kein Urlaub"],
      ["offene Antraege", snap.vacations.filter((v) => ["beantragt", "in Pruefung"].includes(v.status)).length],
      ["persoenliche Aufgaben", snap.tasks.filter((t) => t.status !== "erledigt").length]
    ];
    node.innerHTML = `<div class="driver-list">${rows.map((r) => `<article class="driver-item"><strong>${r[0]}</strong><p>${r[1]}</p></article>`).join("")}</div>`;
  }

  function renderVacations() {
    const e = emp();
    if (!e) return;
    const list = document.querySelector("[data-portal-vac-list]");
    if (!list) return;
    const vacs = state.data.vacations.filter((v) => v.employeeId === e.id);
    list.innerHTML = vacs.length ? `<div class="driver-list">${vacs.map((v) => `<article class="driver-item"><strong>${v.type}</strong><p>${v.start} bis ${v.end}</p><p>Status: ${v.status}</p><div class="driver-item-actions"><button class="driver-btn" type="button" data-portal-vac-open="${v.id}">Status verfolgen</button>${["beantragt", "in Pruefung"].includes(v.status) ? `<button class="driver-btn warning" type="button" data-portal-vac-withdraw="${v.id}">Antrag zurueckziehen</button>` : ""}</div></article>`).join("")}</div>` : '<p class="demo-note">Keine Urlaubsantraege.</p>';
  }

  function renderShiftArea() {
    const e = emp();
    if (!e) return;
    const node = document.querySelector("[data-portal-shift-list]");
    if (!node) return;
    const av = state.data.availabilities.filter((a) => a.employeeId === e.id);
    const sw = state.data.shiftWishes.filter((s) => s.employeeId === e.id);
    node.innerHTML = `<div class="driver-list"><article class="driver-item"><strong>Verfuegbarkeiten</strong><p>${av.map((x) => `${x.mode} (${x.start} bis ${x.end})`).join("<br>") || "keine"}</p></article><article class="driver-item"><strong>Schichtwuensche</strong><p>${sw.map((x) => `${x.wishType}: ${x.wishValue || "-"} (${x.status})`).join("<br>") || "keine"}</p></article></div>`;
  }

  function renderDocs() {
    const e = emp();
    if (!e) return;
    const node = document.querySelector("[data-portal-doc-list]");
    if (!node) return;
    const docs = state.data.documents.filter((d) => d.employeeId === e.id);
    node.innerHTML = docs.length ? `<div class="driver-list">${docs.map((d) => `<article class="driver-item"><strong>${d.type}</strong><p>Status: ${d.status}</p><p>Ablaufdatum: ${d.validUntil || "-"}</p><p>Erinnerung: ${d.reminderActive ? d.reminder : "aus"}</p><p>Handlungsbedarf: ${["abgelaufen", "fehlt", "laeuft bald ab"].includes(d.status) ? "ja" : "nein"}</p></article>`).join("")}</div>` : '<p class="demo-note">Keine Dokumente.</p>';
  }

  function renderMessages() {
    const e = emp();
    if (!e) return;
    const node = document.querySelector("[data-portal-msg-list]");
    if (!node) return;
    const msgs = state.data.messages.filter((m) => (m.employeeIds || []).includes(e.id));
    node.innerHTML = msgs.length ? `<div class="driver-list">${msgs.map((m) => `<article class="driver-item"><strong>${m.title}</strong><p>${m.text}</p><p>Prioritaet: ${m.priority}</p><p>Gelesen: ${m.reads[e.id] ? "ja" : "nein"}${m.confirmRequired ? ` · Bestaetigt: ${m.confirmations[e.id] ? "ja" : "nein"}` : ""}</p><div class="driver-item-actions"><button class="driver-btn" type="button" data-portal-msg-read="${m.id}">gelesen markieren</button>${m.confirmRequired ? `<button class="driver-btn" type="button" data-portal-msg-confirm="${m.id}">bestaetigen</button>` : ""}<button class="driver-btn" type="button" data-portal-msg-question="${m.id}">Rueckfrage senden</button></div></article>`).join("")}</div>` : '<p class="demo-note">Keine Mitteilungen.</p>';
  }

  function renderProfile() {
    const e = emp();
    if (!e) return;
    const node = document.querySelector("[data-portal-profile]");
    if (!node) return;
    node.innerHTML = `<div class="driver-list"><article class="driver-item"><strong>Kontaktdaten</strong><p>Telefon: ${e.phone || "-"}</p><p>E-Mail: ${e.email || "-"}</p><p>Adresse: ${e.address || "-"}</p><p>Sprache: ${e.language || "-"}</p></article><article class="driver-item"><strong>Notfallkontakt</strong><p>${(e.emergency && e.emergency.name) || "-"}</p><p>${(e.emergency && e.emergency.phone) || "-"}</p></article><article class="driver-item"><strong>Hinweis</strong><p>Stammdaten werden nicht direkt geaendert. Aenderungswuensche gehen als Demo an den Admin.</p></article></div>`;
  }

  function renderQuality() {
    const node = document.querySelector("[data-portal-quality-list]");
    if (!node) return;
    const e = emp();
    if (!e || !Q) {
      node.innerHTML = '<p class="demo-note">Qualitaetsmodul nicht verfuegbar.</p>';
      return;
    }
    const q = Q.loadState();
    const fullName = n(`${e.firstName} ${e.lastName}`);
    const empId = n(e.employeeId);

    const myComplaints = (q.complaints || []).filter((c) => n(c.driver) === fullName || n(c.driverId) === empId);
    const myActions = (q.actions || []).filter((a) => {
      const txt = n(`${a.title} ${a.description} ${a.note || ""} ${a.owner || ""}`);
      return txt.includes(fullName) || txt.includes(empId);
    });
    const myTrainings = myActions.filter((a) => n(a.type).includes("schulung") || n(a.type).includes("unterweisung"));
    const myInspections = (q.inspections || []).filter((i) => {
      const txt = n(`${i.target || ""} ${i.area || ""} ${i.owner || ""}`);
      return txt.includes(fullName) || txt.includes(empId) || n(i.status).includes("faellig");
    });

    node.innerHTML = `
      <div class="driver-list">
        <article class="driver-item"><strong>Offene Stellungnahmen</strong><p>${myComplaints.filter((c) => ["neu", "in Pruefung", "Rueckfrage Fahrer"].includes(c.status)).length}</p><p>Gesamtfaelle: ${myComplaints.length}</p></article>
        <article class="driver-item"><strong>Persoenliche Massnahmen</strong><p>${myActions.filter((a) => a.status !== "abgeschlossen").length} offen</p><p>Gesamt: ${myActions.length}</p></article>
        <article class="driver-item"><strong>Unterweisungen/Schulung</strong><p>${myTrainings.length}</p></article>
        <article class="driver-item"><strong>Pruefungsbestaetigungen</strong><p>${myInspections.length}</p></article>
      </div>
    `;
  }

  function qualityContext() {
    const e = emp();
    if (!e || !Q) return null;
    const fullName = `${e.firstName} ${e.lastName}`;
    return { e, fullName, q: Q.loadState() };
  }

  function openQualityTasks() {
    const ctx = qualityContext();
    if (!ctx) return;
    const items = (ctx.q.actions || []).filter((a) => {
      const txt = n(`${a.title} ${a.description} ${a.note || ""} ${a.owner || ""}`);
      return txt.includes(n(ctx.fullName)) || txt.includes(n(ctx.e.employeeId));
    });
    openModal("Persoenliche Qualitaetsaufgaben", items.length ? `<div class="driver-list">${items.map((a) => `<article class="driver-item"><strong>${a.title}</strong><p>${a.type} · ${a.status}</p><p>Frist: ${a.dueDate || "-"}</p><p>${a.note || ""}</p></article>`).join("")}</div>` : '<p class="demo-note">Keine offenen Aufgaben.</p>');
  }

  function openStatementDialog() {
    const ctx = qualityContext();
    if (!ctx) return;
    const cases = (ctx.q.complaints || []).filter((c) => n(c.driver) === n(ctx.fullName) || n(c.driverId) === n(ctx.e.employeeId));
    openModal(
      "Stellungnahme zu Beschwerde",
      `
      <form class="driver-form-grid" data-portal-qa-statement>
        <label><span>Fall</span><select class="driver-select" name="complaintId">${cases.map((c) => `<option value="${c.id}">${c.id} - ${c.shortText}</option>`).join("") || '<option value="">Kein Fall verfuegbar</option>'}</select></label>
        <label><span>Zeitpunkt</span><input class="driver-input" name="time" value="${P.todayIso()} ${nowTime()}"></label>
        <label class="full"><span>Stellungnahme</span><textarea class="driver-textarea" name="text" required></textarea></label>
        <label><span>Zeugen</span><input class="driver-input" name="witnesses"></label>
        <label><span>Technikhinweis</span><input class="driver-input" name="technical"></label>
      </form>
      <div class="driver-item-actions"><button class="driver-btn" type="button" data-portal-qa-statement-save>Senden</button></div>
    `
    );
  }

  function openQuestionDialog() {
    const ctx = qualityContext();
    if (!ctx) return;
    const openCases = (ctx.q.complaints || []).filter((c) => n(c.driver) === n(ctx.fullName) && ["Rueckfrage Fahrer", "in Pruefung", "eskaliert"].includes(c.status));
    openModal(
      "Rueckfrage beantworten",
      `
      <form class="driver-form-grid" data-portal-qa-answer>
        <label><span>Fall</span><select class="driver-select" name="complaintId">${openCases.map((c) => `<option value="${c.id}">${c.id} - ${c.shortText}</option>`).join("") || '<option value="">Keine offene Rueckfrage</option>'}</select></label>
        <label class="full"><span>Antwort</span><textarea class="driver-textarea" name="note"></textarea></label>
      </form>
      <div class="driver-item-actions"><button class="driver-btn" type="button" data-portal-qa-answer-save>Antwort senden</button></div>
    `
    );
  }

  function openInspectionDialog() {
    const ctx = qualityContext();
    if (!ctx) return;
    const checks = (ctx.q.inspections || []).filter((i) => !["durchgefuehrt", "abgeschlossen"].includes(i.status));
    openModal(
      "Pruefung bestaetigen",
      `
      <form class="driver-form-grid" data-portal-qa-check>
        <label><span>Pruefung</span><select class="driver-select" name="inspectionId">${checks.map((c) => `<option value="${c.id}">${c.type} - ${c.target || c.area}</option>`).join("") || '<option value="">Keine offene Pruefung</option>'}</select></label>
        <label><span>Ergebnis</span><select class="driver-select" name="result"><option>bestanden</option><option>bestanden mit Hinweis</option><option>Mangel</option><option>Nachpruefung erforderlich</option></select></label>
        <label class="full"><span>Hinweis</span><input class="driver-input" name="findings"></label>
      </form>
      <div class="driver-item-actions"><button class="driver-btn" type="button" data-portal-qa-check-save>Bestaetigen</button></div>
    `
    );
  }

  function openQualityHints() {
    if (!Q) return;
    const hints = Q.buildWarnings(Q.loadState()).slice(0, 10);
    openModal("Wichtige Hinweise", hints.length ? `<div class="driver-list">${hints.map((h) => `<article class="driver-item"><strong>${h.priority}</strong><p>${h.text}</p></article>`).join("")}</div>` : '<p class="demo-note">Keine Hinweise vorhanden.</p>');
  }

  function render() {
    renderIdentity();
    renderKpis();
    renderVacations();
    renderShiftArea();
    renderDocs();
    renderMessages();
    renderQuality();
    renderProfile();
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
        if (action === "krank") {
          setTab("schicht");
          openModal("Krankmeldung", "<p>Bei akuten medizinischen Problemen wenden Sie sich an einen Arzt oder den Notruf.</p><p>Fuer die Demo bitte das Formular im Bereich Schicht/Verfuegbarkeit nutzen.</p>");
          return;
        }
        if (action === "urlaub") setTab("urlaub");
        if (action === "verfuegbar" || action === "wunsch") setTab("schicht");
        if (action === "doku") setTab("dokumente");
        if (action === "training") setTab("start");
        if (action === "msg") setTab("mitteilungen");
        if (action === "call") openModal("Zentrale kontaktieren", "<p>Demo: Rueckruf durch Zentrale wurde vorgemerkt.</p>");
        if (action === "qaTasks") {
          setTab("qualitaet");
          openQualityTasks();
        }
        if (action === "qaStatement") {
          setTab("qualitaet");
          openStatementDialog();
        }
        if (action === "qaQuestion") {
          setTab("qualitaet");
          openQuestionDialog();
        }
        if (action === "qaConfirm") {
          setTab("qualitaet");
          openInspectionDialog();
        }
        if (action === "qaHints") {
          setTab("qualitaet");
          openQualityHints();
        }
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
        openModal("Rueckfrage", "<p>Rueckfrage an Personalverwaltung wurde als Demo vorgemerkt.</p>");
        return;
      }

      if (event.target.closest("[data-portal-qa-statement-save]")) {
        const ctx = qualityContext();
        const form = document.querySelector("[data-portal-qa-statement]");
        if (!ctx || !form) return;
        const v = Object.fromEntries(new FormData(form).entries());
        if (!v.complaintId || !v.text) return;
        Q.addDriverStatement(Q.loadState(), String(v.complaintId), {
          status: "eingegangen",
          driver: ctx.fullName,
          text: String(v.text || ""),
          circumstances: "Mitarbeiterportal",
          witnesses: String(v.witnesses || ""),
          technical: String(v.technical || ""),
          comment: "Eingereicht im Mitarbeiterportal",
          attachment: ""
        });
        closeModal();
        renderQuality();
        return;
      }

      if (event.target.closest("[data-portal-qa-answer-save]")) {
        const ctx = qualityContext();
        const form = document.querySelector("[data-portal-qa-answer]");
        if (!ctx || !form) return;
        const v = Object.fromEntries(new FormData(form).entries());
        if (!v.complaintId) return;
        Q.addCommunication(Q.loadState(), String(v.complaintId), "Rueckfrage Fahrer", String(v.note || "Rueckfrage beantwortet"), ctx.fullName);
        closeModal();
        renderQuality();
        return;
      }

      if (event.target.closest("[data-portal-qa-check-save]")) {
        const form = document.querySelector("[data-portal-qa-check]");
        if (!form || !Q) return;
        const v = Object.fromEntries(new FormData(form).entries());
        if (!v.inspectionId) return;
        Q.performInspection(Q.loadState(), String(v.inspectionId), {
          date: P.todayIso(),
          result: String(v.result || "bestanden"),
          findings: String(v.findings || "Bestaetigt im Mitarbeiterportal"),
          dueDate: P.todayIso(),
          responsible: "Qualitaetsmanagement",
          nextCheck: P.todayIso()
        });
        closeModal();
        renderQuality();
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

    const avForm = document.querySelector("[data-portal-av-form]");
    if (avForm) {
      avForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const fd = new FormData(avForm);
        state.data.availabilities.unshift({
          id: `AVL-${Date.now()}`,
          employeeId: state.employeeId,
          mode: String(fd.get("mode") || "verfuegbar"),
          shiftPref: String(fd.get("mode") || ""),
          days: [],
          start: String(fd.get("start") || P.todayIso()),
          end: String(fd.get("end") || P.todayIso()),
          recurring: false,
          comment: String(fd.get("comment") || "")
        });
        state.data.shiftWishes.unshift({
          id: `SW-${Date.now()}`,
          employeeId: state.employeeId,
          wishType: String(fd.get("wishType") || "gewuenschte Schicht"),
          wishValue: String(fd.get("mode") || ""),
          vehiclePref: "",
          areaPref: "",
          swapWith: "",
          comment: String(fd.get("comment") || ""),
          status: "eingereicht"
        });
        P.saveState(state.data);
        state.data = P.loadState();
        renderShiftArea();
        avForm.reset();
      });
    }

    const docForm = document.querySelector("[data-portal-doc-form]");
    if (docForm) {
      docForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const fd = new FormData(docForm);
        state.data.tasks.unshift({
          id: `PT-${Date.now()}`,
          title: "Dokumentaktualisierung gemeldet",
          employeeId: state.employeeId,
          category: "Dokument pruefen",
          owner: "Personalverwaltung",
          dueDate: P.todayIso(),
          priority: "normal",
          status: "offen",
          note: `${String(fd.get("note") || "")} · Datei: ${String(fd.get("demoFile") || "-")}`,
          relationType: "Dokument",
          relationId: ""
        });
        P.saveState(state.data);
        state.data = P.loadState();
        openModal("Dokumentmeldung", "<p>Aktualisierung und Terminanfrage wurden als Demo uebermittelt.</p><p>Keine sichere Dateiuebertragung.</p>");
        docForm.reset();
      });
    }

    const profileReq = document.querySelector("[data-portal-profile-request]");
    if (profileReq) {
      profileReq.addEventListener("submit", (event) => {
        event.preventDefault();
        const fd = new FormData(profileReq);
        state.data.tasks.unshift({
          id: `PT-${Date.now()}`,
          title: "Aenderungswunsch Stammdaten",
          employeeId: state.employeeId,
          category: "Daten vervollstaendigen",
          owner: "Personalverwaltung",
          dueDate: P.todayIso(),
          priority: "normal",
          status: "offen",
          note: String(fd.get("request") || ""),
          relationType: "Profil",
          relationId: ""
        });
        P.saveState(state.data);
        state.data = P.loadState();
        openModal("Aenderungswunsch", "<p>Wunsch wurde eingereicht. Kritische Stammdaten bleiben bis Admin-Freigabe unveraendert.</p>");
        profileReq.reset();
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
