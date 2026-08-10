(() => {
  const P = window.AdminPersonnelDemo;
  const STORAGE_KEY = "tgEmployeeDemoSession";
  const state = { data: P.loadState(), employeeId: "MA-101", activeSection: "dienstplan" };

  function requireSession() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        window.location.replace("index.html");
        return false;
      }
      const session = JSON.parse(raw);
      if (!session || !session.authenticated) {
        window.location.replace("index.html");
        return false;
      }
      return true;
    } catch (error) {
      window.location.replace("index.html");
      return false;
    }
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    window.location.replace("index.html");
  }

  function formatDate(value) {
    const text = String(value || "").trim();
    if (!text) return "-";
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(text)) return text;
    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return text;
    return `${match[3]}.${match[2]}.${match[1]}`;
  }

  function formatPeriod(start, end) {
    return `${formatDate(start)} bis ${formatDate(end)}`;
  }

  function weekdayDateLabel(value) {
    const text = String(value || "").trim();
    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return formatDate(text);
    const date = new Date(`${text}T00:00:00`);
    const weekday = new Intl.DateTimeFormat("de-DE", { weekday: "long" }).format(date);
    return `${weekday}, ${formatDate(text)}`;
  }

  function tomorrowIso() {
    const now = new Date();
    now.setDate(now.getDate() + 1);
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }

  function portalSnapshot(employeeId) {
    return P.getEmployeePortalSnapshot ? P.getEmployeePortalSnapshot(state.data, employeeId) : P.getPortalSnapshot(state.data, employeeId);
  }

  function vacationQuota(employeeId) {
    return P.getVacationQuota(state.data, employeeId);
  }

  function emp() {
    return P.getEmployee(state.data, state.employeeId);
  }

  function displayTypeLabel(type) {
    return String(type || "")
      .replace(/Personenbefoerderungsschein/g, "Personenbeförderungsschein")
      .replace(/Personenbefoerderungsschein/g, "Personenbeförderungsschein")
      .replace(/Krankenschein \/ AU/g, "Krankenschein / AU")
      .replace(/Fuehrerschein/g, "Führerschein");
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
    const snap = portalSnapshot(e.id);
    const avatarNode = document.querySelector("[data-portal-avatar]");
    const greetingNode = document.querySelector("[data-portal-greeting]");
    const dateNode = document.querySelector("[data-portal-date]");
    const messageBadge = document.querySelector("[data-portal-message-badge]");

    const now = new Date();
    const hour = now.getHours();
    const greeting = hour < 12 ? "Guten Morgen" : hour < 18 ? "Guten Tag" : "Guten Abend";
    const weekday = new Intl.DateTimeFormat("de-DE", { weekday: "long" }).format(now);
    const dateLabel = `${weekday}, ${now.toLocaleDateString("de-DE")}`;

    if (nameNode) nameNode.textContent = `${e.firstName} ${e.lastName}`;
    if (roleNode) roleNode.textContent = `${e.role} · ${e.employeeId}`;
    if (statusNode) statusNode.textContent = `Status: ${e.status}${snap && snap.unreadMessages ? ` · ${snap.unreadMessages} neue Mitteilungen` : ""}`;
    if (avatarNode) avatarNode.textContent = `${e.firstName.charAt(0)}${e.lastName.charAt(0)}`.toUpperCase();
    if (greetingNode) greetingNode.textContent = greeting;
    if (dateNode) dateNode.textContent = dateLabel;
    if (messageBadge) messageBadge.textContent = snap && snap.unreadMessages ? String(snap.unreadMessages) : "0";
  }

  function getPriorityAlert(snap) {
    const docs = (state.data.documents || []).filter((d) => d.employeeId === state.employeeId);
    const issues = [];
    const critical = docs.find((d) => d.type === "Führerschein" && d.status === "abgelaufen");
    if (critical) {
      issues.push({ level: "KRITISCH", title: "Führerschein abgelaufen", text: "Bitte reiche einen aktuellen Führerschein ein.", action: "Jetzt einreichen", kind: "danger" });
    }
    const missingPbs = docs.find((d) => d.type === "Personenbeförderungsschein" && ["fehlt", "abgelaufen", "laeuft bald ab"].includes(d.status));
    if (missingPbs) {
      issues.push({ level: "WICHTIG", title: "Personenbeförderungsschein", text: missingPbs.status === "abgelaufen" ? "Das Dokument ist abgelaufen." : missingPbs.status === "fehlt" ? "Bitte reiche das Dokument ein." : "Läuft bald ab.", action: "Jetzt einreichen", kind: missingPbs.status === "abgelaufen" ? "danger" : "warn" });
    }
    if (!critical && !missingPbs && snap && snap.alerts && snap.alerts[0]) {
      issues.push({ level: "INFO", title: snap.alerts[0].title, text: snap.alerts[0].text, action: "Mehr ansehen", kind: "info" });
    }
    return issues[0] || null;
  }

  function renderHome() {
    const e = emp();
    if (!e) return;
    const snap = portalSnapshot(e.id);
    const hero = document.querySelector("[data-portal-hero]");
    const tomorrowNode = document.querySelector("[data-portal-tomorrow]");
    const priorityNode = document.querySelector("[data-portal-priority]");
    if (!hero || !tomorrowNode || !priorityNode) return;

    const todayPlan = snap.todayPlan || {};
    const tomorrowPlan = snap.tomorrowPlan || {};
    const todayVehicle = todayPlan.vehicleText || e.activeVehicle || "-";
    const todayShift = todayPlan.shiftText || e.todayShift || "kein Dienst hinterlegt";
    const tomorrowVehicle = tomorrowPlan.published && tomorrowPlan.vehicleText ? tomorrowPlan.vehicleText : "";
    const tomorrowShift = tomorrowPlan.published ? (tomorrowPlan.shiftText || "Plan wird noch erstellt.") : "Plan wird noch erstellt.";
    const priority = getPriorityAlert(snap);

    hero.innerHTML = `
      <div class="panel-head">
        <div>
          <p class="panel-kicker">Heute</p>
          <h2>${weekdayDateLabel(P.todayIso())}</h2>
        </div>
        <span class="status-pill active">● Im Dienst</span>
      </div>
      <p class="hero-title">Heute</p>
      <p class="hero-time">${todayShift}</p>
      <div class="hero-vehicle">
        <div class="hero-meta-row"><span>Mein Fahrzeug</span><strong>${todayVehicle}</strong></div>
        <div class="hero-meta-row"><span>Fahrzeugtyp</span><strong>${todayPlan.vehicleModel || "Mercedes V-Klasse"}</strong></div>
      </div>
    `;

    tomorrowNode.innerHTML = `
      <div class="panel-head">
        <div>
          <p class="panel-kicker">Morgen</p>
          <h2>${weekdayDateLabel(tomorrowIso())}</h2>
        </div>
        <span class="status-pill ${tomorrowPlan.published ? "info" : "neutral"}">${tomorrowPlan.published ? "● veröffentlicht" : "● offen"}</span>
      </div>
      <p class="hero-title">Nächster Einsatz</p>
      <p class="hero-time">${tomorrowShift}</p>
      ${tomorrowVehicle ? `<div class="hero-vehicle"><div class="hero-meta-row"><span>Fahrzeug</span><strong>${tomorrowVehicle}</strong></div></div>` : ""}
    `;

    if (priority) {
      priorityNode.innerHTML = `
        <div class="panel-head">
          <div>
            <p class="panel-kicker">Wichtiger Hinweis</p>
            <h2>${priority.level}</h2>
          </div>
          <span class="status-pill ${priority.kind}">${priority.level}</span>
        </div>
        <p class="hero-title">${priority.title}</p>
        <p class="hero-time">${priority.text}</p>
        <button class="btn btn-primary" type="button" data-portal-priority-action>${priority.action}</button>
      `;
    } else {
      priorityNode.innerHTML = `
        <div class="panel-head">
          <div>
            <p class="panel-kicker">Wichtiger Hinweis</p>
            <h2>Alles aktuell</h2>
          </div>
          <span class="status-pill info">INFO</span>
        </div>
        <p class="hero-title">Keine dringenden Hinweise.</p>
        <p class="hero-time">Alles ist aktuell.</p>
      `;
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
      summary.innerHTML = `<div class="summary-row"><article class="summary-chip"><strong>Resturlaub</strong><p>${quota.remaining} Tage verfügbar</p></article><article class="summary-chip"><strong>Beantragt</strong><p>${quota.requested} Tage in Prüfung</p></article></div>`;
    }
    list.innerHTML = vacs.length ? `<div class="driver-list">${vacs.map((v) => `<article class="driver-item"><strong>${v.type}</strong><p>${formatPeriod(v.start, v.end)}</p><p>Status: ${v.status}</p><div class="driver-item-actions"><button class="driver-btn" type="button" data-portal-vac-open="${v.id}">Details</button>${["beantragt", "in Pruefung"].includes(v.status) ? `<button class="driver-btn warning" type="button" data-portal-vac-withdraw="${v.id}">Antrag zurückziehen</button>` : ""}</div></article>`).join("")}</div>` : '<p class="demo-note">Keine Urlaubsanträge.</p>';
  }

  function renderShiftArea() {
    const e = emp();
    if (!e) return;
    const node = document.querySelector("[data-portal-shift-list]");
    if (!node) return;
    const snap = portalSnapshot(e.id);
    const todayPlan = snap.todayPlan || {};
    const tomorrowPlan = snap.tomorrowPlan || {};
    node.innerHTML = `
      <div class="driver-list">
        <article class="driver-item">
          <strong>Heute · ${weekdayDateLabel(P.todayIso())}</strong>
          <p>${todayPlan.shiftText || e.todayShift || "kein Dienst hinterlegt"}</p>
          ${todayPlan.vehicleText ? `<p>Fahrzeug: ${todayPlan.vehicleText}</p>` : ""}
          <span class="status-pill active">Im Dienst</span>
        </article>
        <article class="driver-item">
          <strong>Morgen · ${weekdayDateLabel(tomorrowIso())}</strong>
          <p>${tomorrowPlan.published ? (tomorrowPlan.shiftText || "Plan wird noch erstellt.") : "Plan wird noch erstellt."}</p>
          ${tomorrowPlan.published && tomorrowPlan.vehicleText ? `<p>Fahrzeug: ${tomorrowPlan.vehicleText}</p>` : ""}
          <span class="status-pill ${tomorrowPlan.published ? "info" : "neutral"}">${tomorrowPlan.published ? "veröffentlicht" : "noch nicht veröffentlicht"}</span>
        </article>
      </div>`;
  }

  function renderDocs() {
    const e = emp();
    if (!e) return;
    const node = document.querySelector("[data-portal-doc-list]");
    if (!node) return;
    const docs = state.data.documents.filter((d) => d.employeeId === e.id);
    node.innerHTML = docs.length ? `<div class="driver-list">${docs.map((d) => {
      const statusText = d.status === "abgelaufen" ? "Abgelaufen" : d.status === "fehlt" ? "Fehlt" : d.status === "laeuft bald ab" ? "Läuft bald ab" : "Gültig";
      const chipClass = d.status === "abgelaufen" || d.status === "fehlt" ? "danger" : d.status === "laeuft bald ab" ? "warn" : "info";
      return `<article class="doc-card"><div class="doc-card-head"><div><strong>${displayTypeLabel(d.type)}</strong><p>${d.validUntil ? `Bis ${formatDate(d.validUntil)}` : "Bitte aktualisieren"}</p></div><span class="status-pill ${chipClass}">${statusText}</span></div><button class="btn btn-primary" type="button">Neu einreichen</button></article>`;
    }).join("")}</div>` : '<p class="demo-note">Noch keine Dokumente eingereicht.</p>';
  }

  function renderAbsences() {
    const e = emp();
    if (!e) return;
    const node = document.querySelector("[data-portal-absence-list]");
    if (!node) return;
    const absences = state.data.absences.filter((a) => a.employeeId === e.id);
    node.innerHTML = absences.length ? `<div class="driver-list">${absences.map((a) => `<article class="driver-item"><strong>${a.kind}</strong><p>${formatPeriod(a.start, a.expectedEnd)}</p><p>Status: ${a.status}</p><p>${a.note || ""}</p></article>`).join("")}</div>` : '<p class="demo-note">Keine Krankmeldungen oder sonstigen Abwesenheiten.</p>';
  }

  function renderMessages() {
    const e = emp();
    if (!e) return;
    const node = document.querySelector("[data-portal-msg-list]");
    if (!node) return;
    const msgs = state.data.messages.filter((m) => (m.employeeIds || []).includes(e.id));
    node.innerHTML = msgs.length ? `<div class="driver-list">${msgs.map((m) => `<article class="driver-item"><strong>${m.title}</strong><p>${m.text}</p><p>Priorität: ${m.priority}</p><div class="driver-item-actions"><button class="driver-btn" type="button" data-portal-msg-read="${m.id}">Gelesen markieren</button>${m.confirmRequired ? `<button class="driver-btn" type="button" data-portal-msg-confirm="${m.id}">Bestätigen</button>` : ""}</div></article>`).join("")}</div>` : '<p class="demo-note">Keine Mitteilungen.</p>';
  }

  function render() {
    renderIdentity();
    renderHome();
    renderVacations();
    renderShiftArea();
    renderDocs();
    renderMessages();
    renderAbsences();
  }

  function selectDocumentType(type) {
    const hidden = document.querySelector("[data-portal-doc-type-hidden]");
    document.querySelectorAll("[data-doc-type]").forEach((card) => {
      const isSelected = card.getAttribute("data-doc-type") === type;
      card.classList.toggle("is-selected", isSelected);
      card.setAttribute("aria-pressed", isSelected ? "true" : "false");
    });
    if (hidden) hidden.value = type;
  }

  function setActiveSection(section, options = {}) {
    const allowed = ["dienstplan", "urlaub", "krank", "dokumente", "mitteilungen", "profil"];
    const safeSection = allowed.includes(section) ? section : "dienstplan";
    state.activeSection = safeSection;

    document.querySelectorAll("[data-portal-section]").forEach((panel) => {
      const isActive = (panel.getAttribute("data-portal-section") || "") === safeSection;
      panel.classList.toggle("is-open", isActive);
      panel.setAttribute("aria-expanded", isActive ? "true" : "false");
      const body = panel.querySelector(".section-body");
      if (body) body.hidden = !isActive;
    });

    if (options.scroll !== false) {
      const target = document.querySelector(`[data-portal-section="${safeSection}"]`);
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function bindDateHints() {
    document.querySelectorAll("[data-date-input]").forEach((input) => {
      const output = document.querySelector(`[data-date-output="${input.getAttribute("data-date-input")}"]`);
      if (!output) return;
      const update = () => {
        const value = input.value;
        output.textContent = value ? new Date(`${value}T00:00:00`).toLocaleDateString("de-DE") : "TT.MM.JJJJ";
      };
      input.addEventListener("change", update);
      input.addEventListener("input", update);
      update();
    });
  }

  function bindUploadUI() {
    document.querySelectorAll("[data-portal-doc-input]").forEach((input) => {
      const trigger = input.parentElement?.querySelector("[data-portal-upload-trigger]");
      const preview = input.parentElement?.querySelector("[data-portal-upload-preview]");
      const filename = input.parentElement?.querySelector("[data-portal-upload-filename]");
      const remove = input.parentElement?.querySelector("[data-portal-upload-remove]");
      if (!trigger || !preview || !filename) return;

      const update = () => {
        const file = input.files && input.files[0] ? input.files[0] : null;
        if (!file) {
          preview.hidden = true;
          preview.innerHTML = "";
          filename.textContent = "Keine Datei ausgewählt";
          return;
        }
        filename.textContent = file.name;
        if (file.type.startsWith("image/")) {
          const url = URL.createObjectURL(file);
          preview.innerHTML = `<img src="${url}" alt="Vorschau" />`;
          preview.hidden = false;
        } else {
          preview.innerHTML = `<div class="upload-file-pill">${file.name}</div>`;
          preview.hidden = false;
        }
      };

      trigger.addEventListener("click", () => input.click());
      input.addEventListener("change", update);
      if (remove) {
        remove.addEventListener("click", () => {
          input.value = "";
          update();
        });
      }
      update();
    });
  }

  function bind() {
    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-portal-close]")) {
        closeModal();
        return;
      }

      const sectionToggle = event.target.closest("[data-portal-section-toggle]");
      if (sectionToggle) {
        setActiveSection(sectionToggle.getAttribute("data-portal-section-toggle") || "dienstplan");
        return;
      }

      const quick = event.target.closest("[data-portal-quick-action]");
      if (quick) {
        const target = quick.getAttribute("data-portal-quick-action") || "dienstplan";
        setActiveSection(target);
        if (target === "dokumente") selectDocumentType("Führerschein");
        return;
      }

      const typeCard = event.target.closest("[data-doc-type]");
      if (typeCard) {
        const type = typeCard.getAttribute("data-doc-type") || "Führerschein";
        selectDocumentType(type);
        return;
      }

      if (event.target.closest("[data-portal-open-messages]")) {
        setActiveSection("mitteilungen");
        return;
      }

      if (event.target.closest("[data-portal-priority-action]")) {
        setActiveSection("dokumente");
        selectDocumentType("Führerschein");
        return;
      }

      if (event.target.closest("[data-portal-logout]")) {
        logout();
        return;
      }

      const open = event.target.closest("[data-portal-vac-open]");
      if (open) {
        const row = state.data.vacations.find((v) => v.id === open.getAttribute("data-portal-vac-open"));
        if (!row) return;
        openModal(`Antrag ${row.id}`, `<p>Status: ${row.status}</p><p>Zeitraum: ${row.start} bis ${row.end}</p><p>Notiz: ${row.decisionNote || row.internalNote || "-"}</p>`);
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
        return;
      }

      const conf = event.target.closest("[data-portal-msg-confirm]");
      if (conf) {
        const id = conf.getAttribute("data-portal-msg-confirm") || "";
        P.pushMessageRead(state.data, id, state.employeeId, "confirm");
        P.pushMessageRead(state.data, id, state.employeeId, "read");
        state.data = P.loadState();
        renderMessages();
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
          type: "Erholungsurlaub",
          replacementId: "",
          comment: String(fd.get("comment") || ""),
          internalNote: "Portal-Antrag",
          requester: state.employeeId,
          createdAt: P.todayIso(),
          status: "beantragt"
        });
        state.data = P.loadState();
        renderVacations();
        renderHome();
        vacForm.reset();
        const feedback = document.querySelector("[data-portal-vac-feedback]");
        if (feedback) {
          feedback.hidden = false;
          feedback.textContent = "Urlaubsantrag wurde eingereicht.";
        }
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
          via: "Mitarbeiterportal",
          proofStatus: "angefordert",
          note: String(fd.get("note") || ""),
          status: "gemeldet",
          affectedShifts: []
        });
        state.data = P.loadState();
        renderAbsences();
        renderHome();
        absenceForm.reset();
        const feedback = document.querySelector("[data-portal-absence-feedback]");
        if (feedback) {
          feedback.hidden = false;
          feedback.textContent = "Krankmeldung wurde gesendet.";
        }
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
          type: String(fd.get("type") || "Sonstiges"),
          note: String(fd.get("note") || ""),
          demoFile: file ? file.name : "",
          demoFileName: file ? file.name : "",
          demoFileType: file ? file.type : ""
        });
        state.data = P.loadState();
        openModal("Dokument eingereicht", `<p>${file ? file.name : "Das Dokument"} wurde an die Verwaltung übergeben.</p><p>Status: neu eingereicht.</p>`);
        docForm.reset();
        renderDocs();
        renderHome();
        selectDocumentType("Führerschein");
      });
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (!requireSession()) return;

    if (window.AdminUiText) {
      window.AdminUiText.normalizeDocument(document);
      window.AdminUiText.observeDocument(document);
    }

    render();
    bind();
    bindDateHints();
    bindUploadUI();
    selectDocumentType("Führerschein");
    setActiveSection("dienstplan", { scroll: false });
  });
})();
