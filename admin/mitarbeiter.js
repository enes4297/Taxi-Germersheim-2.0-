(() => {
  const P = window.AdminPersonnelDemo;
  const S = window.AdminSystemCenter || {};
  const D = window.TaxiData || window.TaxiDataService || null;
  const state = {
    data: P && typeof P.loadState === "function" ? P.loadState() : { employees: [], vacations: [], absences: [], documents: [], history: [], ui: {} },
    filter: "alle",
    search: "",
    sort: "name",
    view: "cards",
    selectedEmployeeId: "",
    profileTab: "Übersicht",
    pendingPayload: null,
    editEmployeeId: "",
    formVisible: false
  };

  const TABS = [
    "Übersicht",
    "Kontaktdaten",
    "Beschäftigung",
    "Schichten",
    "Abwesenheiten",
    "Urlaub",
    "Dokumente",
    "Schulungen",
    "Fahrzeuge",
    "Aufgaben",
    "Mitteilungen",
    "Verlauf",
    "Notizen"
  ];

  function fullName(emp) {
    return `${emp.firstName || ""} ${emp.lastName || ""}`.trim();
  }

  function normalize(value) {
    return P.normalize(value);
  }

  function formatDate(value) {
    const text = String(value || "").trim();
    if (!text) return "-";
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(text)) return text;
    if (S.formatDate) return S.formatDate(text);
    const date = new Date(`${text}T00:00:00`);
    if (Number.isNaN(date.getTime())) return text;
    return `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}.${date.getFullYear()}`;
  }

  function formatDateTime(value) {
    const text = String(value || "").trim();
    if (!text) return "-";
    if (S.formatDateTime) return S.formatDateTime(text);
    const match = text.match(/^(\d{4}-\d{2}-\d{2})[\sT](\d{2}:\d{2})/);
    if (!match) return formatDate(text);
    return `${formatDate(match[1])} · ${match[2]} Uhr`;
  }

  function formatDateRange(start, end) {
    if (S.formatDateRange) return S.formatDateRange(start, end);
    if (start && end) return `${formatDate(start)} bis ${formatDate(end)}`;
    return formatDate(start || end);
  }

  function displayDocType(type) {
    const n = normalize(type);
    if (n === "fuehrerschein" || n === "fuhrerschein") return "Führerschein";
    if (n === "personenbefoerderungsschein") return "Personenbeförderungsschein";
    return type;
  }

  function displayStatusText(text) {
    const n = normalize(text);
    if (n === "gueltig") return "gültig";
    if (n === "laeuft bald ab" || n === "lauft bald ab") return "läuft bald ab";
    if (n === "ungeprueft" || n === "ungepruft") return "ungeprüft";
    if (n === "abgelaufen") return "abgelaufen";
    if (n === "fehlt") return "fehlt";
    if (n === "gesperrt") return "gesperrt";
    return text;
  }

  function statusBadge(text) {
    const t = normalize(text);
    const cls = t.includes("krank") || t.includes("gesperrt") || t.includes("ungueltig")
      ? "crit"
      : t.includes("urlaub") || t.includes("schulung") || t.includes("probe")
        ? "warn"
        : t.includes("dienst") || t.includes("aktiv")
          ? "ok"
          : "info";
    return `<span class="person-status ${cls}"><span class="dot"></span>${text}</span>`;
  }

  function listText(value, fallback = "-") {
    if (!Array.isArray(value) || !value.length) return fallback;
    return value.join(", ");
  }

  function employeeLicenseStatus(emp) {
    if (!emp.licenseNo || !emp.licenseValidUntil) return "ungeprüft";
    const days = P.daysUntil(emp.licenseValidUntil);
    if (days < 0) return "abgelaufen";
    if (days <= 30) return "läuft bald ab";
    return "gültig";
  }

  function employeePermitStatus(emp) {
    if (String(emp.pPermit || "Nein") !== "Ja") return "fehlt";
    if (!emp.pPermitValidUntil) return "ungeprüft";
    const days = P.daysUntil(emp.pPermitValidUntil);
    if (days < 0) return "abgelaufen";
    if (days <= 30) return "läuft bald ab";
    return "gültig";
  }

  function docSummary(emp) {
    const docs = P.listEmployeeDocs(state.data, emp.id);
    const invalid = docs.filter((d) => d.status === "abgelaufen" || d.status === "fehlt").length;
    const soon = docs.filter((d) => d.status === "laeuft bald ab").length;
    if (invalid) return `${invalid} kritisch`;
    if (soon) return `${soon} bald fällig`;
    return "ok";
  }

  function vacationSummary(emp) {
    const t = P.todayIso();
    const active = state.data.vacations.find((v) => v.employeeId === emp.id && ["genehmigt", "teilweise genehmigt"].includes(v.status) && t >= v.start && t <= v.end);
    if (active) return `Urlaub ${formatDateRange(active.start, active.end)}`;
    const open = state.data.vacations.find((v) => v.employeeId === emp.id && ["beantragt", "in Pruefung"].includes(v.status));
    return open ? `Antrag ${open.status}` : "kein Urlaub";
  }

  function matches(emp) {
    const q = normalize(state.search).trim();
    if (q) {
      const blob = normalize([
        fullName(emp),
        emp.employeeId,
        emp.phone,
        emp.email,
        emp.role,
        emp.status,
        emp.licenseNo,
        emp.activeVehicle,
        emp.entryDate,
        listText(emp.qualifications)
      ].join(" "));
      if (!blob.includes(q)) return false;
    }

    const f = state.filter;
    if (f === "alle") return true;
    if (f === "aktiv") return ["aktiv", "im Dienst", "frei", "in Probezeit"].includes(emp.status);
    if (f === "inaktiv") return ["gesperrt", "ausgeschieden", "nicht verfuegbar", "Dokument ungueltig"].includes(emp.status);
    if (["Fahrer", "Disposition", "Verwaltung", "Admin"].includes(f)) return emp.role === f;
    if (["Vollzeit", "Teilzeit", "Minijob", "Aushilfe", "Springer"].includes(f)) return emp.employmentType === f;
    if (f === "Probezeit") return Boolean(emp.probation);
    if (f === "Urlaub") return normalize(emp.status).includes("urlaub");
    if (f === "krank") return normalize(emp.status).includes("krank");
    if (f === "Dokument laeuft ab") return P.listEmployeeDocs(state.data, emp.id).some((d) => d.status === "laeuft bald ab");
    if (f === "Schulung offen") return P.listEmployeeTrainings(state.data, emp.id).some((t) => ["eingeladen", "bestaetigt", "Nachweis fehlt"].includes(t.status));
    if (f === "Führerschein ungültig") return P.listEmployeeDocs(state.data, emp.id).some((d) => d.type === "Fuehrerschein" && d.status === "abgelaufen");
    if (f === "Taxischein ungültig") return P.listEmployeeDocs(state.data, emp.id).some((d) => d.type === "Personenbefoerderungsschein" && d.status === "abgelaufen");
    return true;
  }

  function sortedEmployees() {
    const rows = state.data.employees.filter(matches);
    rows.sort((a, b) => {
      if (state.sort === "status") return a.status.localeCompare(b.status, "de");
      if (state.sort === "entry") return String(a.entryDate || "").localeCompare(String(b.entryDate || ""));
      if (state.sort === "role") return a.role.localeCompare(b.role, "de");
      return fullName(a).localeCompare(fullName(b), "de");
    });
    return rows;
  }

  function renderCockpit() {
    const node = document.querySelector("[data-emp-cockpit]");
    if (!node) return;

    const stats = P.getDashboardStats(state.data);
    const pendingVacations = state.data.vacations.filter((v) => ["beantragt", "in Pruefung"].includes(v.status)).slice(0, 4);
    const pendingDocs = state.data.documents.filter((d) => d.status === "eingereicht").slice(0, 4);
    const pendingAbsences = state.data.absences.filter((a) => a.status !== "abgeschlossen").slice(0, 4);
    const employee = state.data.employees.find((e) => e.id === state.selectedEmployeeId) || state.data.employees[0] || null;

    node.innerHTML = `
      <div class="person-cockpit-grid">
        <section class="person-cockpit-card">
          <h3>Heute im Fokus</h3>
          <p class="person-meta">Kurzüberblick für Disposition und Personal.</p>
          <div class="person-cockpit-stats">
            <div class="person-cockpit-stat"><strong>${stats.totalEmployees}</strong><span>Mitarbeiter</span></div>
            <div class="person-cockpit-stat"><strong>${stats.driversOnDuty}</strong><span>Fahrer im Dienst</span></div>
            <div class="person-cockpit-stat"><strong>${stats.availableDriversToday}</strong><span>verfügbare Fahrer</span></div>
            <div class="person-cockpit-stat"><strong>${stats.openVacationRequests}</strong><span>offene Urlaubsanträge</span></div>
            <div class="person-cockpit-stat"><strong>${stats.openDocumentEntries}</strong><span>offene Dokumente</span></div>
            <div class="person-cockpit-stat"><strong>${stats.sickToday}</strong><span>krank gemeldet</span></div>
          </div>
          <div class="person-cockpit-actions">
            <button type="button" data-cockpit-select="${employee ? employee.id : ""}">Aktiver Mitarbeiter</button>
            <button type="button" data-cockpit-plan="publish">Plan veröffentlichen</button>
            <button type="button" data-cockpit-docs="review">Dokumente prüfen</button>
            <button type="button" data-cockpit-message="send">Mitteilung senden</button>
          </div>
          <div class="person-cockpit-form">
            <label>Kurznachricht für aktuelle Auswahl
              <textarea data-cockpit-message-text placeholder="z. B. Umplanung wegen Krankheit"></textarea>
            </label>
            <button type="button" data-cockpit-send-message>Mitteilung speichern</button>
          </div>
        </section>
        <section class="person-cockpit-card">
          <h3>Offene Punkte</h3>
          <div class="person-cockpit-list">
            ${pendingVacations.length ? pendingVacations.map((v) => {
              const emp = P.getEmployee(state.data, v.employeeId);
              return `<div class="person-cockpit-item"><strong>${emp ? fullName(emp) : v.employeeId}</strong><p>${formatDateRange(v.start, v.end)} · ${v.status}</p><div class="person-cockpit-actions"><button type="button" data-cockpit-vacation="approve" data-cockpit-id="${v.id}">Genehmigen</button><button type="button" data-cockpit-vacation="reject" data-cockpit-id="${v.id}">Ablehnen</button></div></div>`;
            }).join("") : `<div class="person-cockpit-item"><p>Keine offenen Urlaubsanträge.</p></div>`}
            ${pendingDocs.length ? pendingDocs.map((doc) => {
              const emp = P.getEmployee(state.data, doc.employeeId);
              return `<div class="person-cockpit-item"><strong>${emp ? fullName(emp) : doc.employeeId}</strong><p>${displayDocType(doc.type)} · ${displayStatusText(doc.status)}</p><div class="person-cockpit-actions"><button type="button" data-cockpit-doc="valid" data-cockpit-id="${doc.id}">Gültig</button><button type="button" data-cockpit-doc="missing" data-cockpit-id="${doc.id}">Fehlt</button></div></div>`;
            }).join("") : `<div class="person-cockpit-item"><p>Keine offenen Dokumente.</p></div>`}
            ${pendingAbsences.length ? pendingAbsences.map((a) => {
              const emp = P.getEmployee(state.data, a.employeeId);
              return `<div class="person-cockpit-item"><strong>${emp ? fullName(emp) : a.employeeId}</strong><p>${a.kind} · ${a.status}</p><div class="person-cockpit-actions"><button type="button" data-cockpit-absence="return" data-cockpit-id="${a.id}">Rückkehr</button></div></div>`;
            }).join("") : `<div class="person-cockpit-item"><p>Keine offenen Abwesenheiten.</p></div>`}
          </div>
        </section>
      </div>
    `;
  }

  async function syncStateFromService() {
    const fallbackState = P && typeof P.loadState === "function" ? P.loadState() : null;
    if (D && typeof D.getEmployees === "function") {
      const employees = await D.getEmployees();
      if (Array.isArray(employees)) {
        const nextState = {
          ...(fallbackState || {}),
          ...state.data,
          employees
        };
        state.data = nextState;
        return state.data;
      }
    }

    if (fallbackState) {
      state.data = fallbackState;
    }
    return state.data;
  }

  async function refreshEmployeesFromDataService() {
    const refreshedState = await syncStateFromService();
    state.data = { ...(refreshedState || {}), employees: Array.isArray(refreshedState?.employees) ? refreshedState.employees : [] };
    renderList();
    renderProfile();
  }

  function renderList() {
    const node = document.querySelector("[data-emp-list]");
    if (!node) return;

    const rows = sortedEmployees();
    if (!rows.length) {
      const errorText = D && typeof D.getLastError === "function" ? D.getLastError() : "";
      node.innerHTML = `<article class="admin-empty-state"><strong>${errorText || "Noch keine Mitarbeiter angelegt."}</strong></article>`;
      return;
    }

    if (state.view === "cards") {
      node.innerHTML = `<div class="person-grid">${rows.map((e) => `
        <article class="person-card">
          <small>${e.employeeId} · ${e.role}</small>
          <strong>${fullName(e)}</strong>
          <p>${statusBadge(e.status)}</p>
          <p>${e.employmentType} · ${e.phone || "-"}</p>
          <p>Fahrzeug: ${e.activeVehicle || "-"}</p>
          <p>Schicht: ${e.todayShift || "-"}</p>
          <p>Führerschein: ${employeeLicenseStatus(e)} · Taxischein: ${employeePermitStatus(e)}</p>
          <p>Dokumente: ${docSummary(e)} · Urlaub: ${vacationSummary(e)}</p>
          <p class="person-meta">Letzte Aktivität: ${e.lastActivity || "-"}</p>
          <div class="person-actions"><button class="admin-btn admin-btn-secondary" type="button" data-emp-open="${e.id}">Akte öffnen</button></div>
        </article>
      `).join("")}</div>`;
      return;
    }

    node.innerHTML = `
      <div class="person-table-wrap">
        <table class="admin-table person-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Mitarbeiter-ID</th>
              <th>Rolle</th>
              <th>Beschäftigung</th>
              <th>Status</th>
              <th>Telefon</th>
              <th>Fahrzeug</th>
              <th>heutige Schicht</th>
              <th>Führerschein</th>
              <th>Taxischein</th>
              <th>Dokumente</th>
              <th>Urlaubsstatus</th>
              <th>letzte Aktivität</th>
              <th>Aktion</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((e) => `
              <tr>
                <td>${fullName(e)}</td>
                <td>${e.employeeId}</td>
                <td>${e.role}</td>
                <td>${e.employmentType}</td>
                <td>${statusBadge(e.status)}</td>
                <td>${e.phone || "-"}</td>
                <td>${e.activeVehicle || "-"}</td>
                <td>${e.todayShift || "-"}</td>
                <td>${employeeLicenseStatus(e)}</td>
                <td>${employeePermitStatus(e)}</td>
                <td>${docSummary(e)}</td>
                <td>${vacationSummary(e)}</td>
                <td>${e.lastActivity || "-"}</td>
                <td><button class="admin-btn admin-btn-secondary" type="button" data-emp-open="${e.id}">Öffnen</button></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderProfile() {
    const panel = document.querySelector("[data-emp-profile]");
    if (!panel) return;

    const id = state.selectedEmployeeId || (state.data.employees[0] && state.data.employees[0].id);
    const emp = state.data.employees.find((e) => e.id === id);
    if (!emp) {
      panel.innerHTML = "<p>Keine Mitarbeiterakte verfügbar.</p>";
      return;
    }
    state.selectedEmployeeId = emp.id;
    renderCockpit();

    const docs = P.listEmployeeDocs(state.data, emp.id);
    const trainings = P.listEmployeeTrainings(state.data, emp.id);
    const tasks = P.listEmployeeTasks(state.data, emp.id);
    const msgs = P.listEmployeeMessages(state.data, emp.id);
    const abs = state.data.absences.filter((a) => a.employeeId === emp.id);
    const vacs = state.data.vacations.filter((v) => v.employeeId === emp.id);
    const history = state.data.history.filter((h) => h.employeeId === emp.id);
    const quota = P.getVacationQuota(state.data, emp.id);

    const tabButtons = TABS.map((t) => `<button type="button" class="${state.profileTab === t ? "is-active" : ""}" data-emp-tab="${t}">${t}</button>`).join("");

    let content = "";
    if (state.profileTab === "Übersicht") {
      content = `
        <div class="person-list">
          <article class="person-item">
            <strong>${fullName(emp)}</strong>
            <p>${emp.employeeId} · ${emp.role}</p>
            <p>${statusBadge(emp.status)}</p>
            <p>Eintritt: ${formatDate(emp.entryDate)} · ${emp.employmentType}</p>
            <p>heutige Schicht: ${emp.todayShift || "-"} · nächster Dienst: ${formatDateTime(emp.nextShift)}</p>
            <p>Führerscheinstatus: ${employeeLicenseStatus(emp)} · Taxischeinstatus: ${employeePermitStatus(emp)}</p>
            <p>bevorzugtes Fahrzeug: ${emp.preferredVehicle || "-"} · feste Zuordnung: ${emp.fixedVehicle || "-"}</p>
            <p>Ersatzfahrzeuge: ${listText(emp.replacementVehicles)}</p>
            <p>Urlaubstage (Demo): verbleibend ${quota.remaining} / Anspruch ${quota.yearly}</p>
            <p>offene Dokumente: ${docs.filter((d) => ["abgelaufen", "fehlt", "laeuft bald ab"].includes(d.status)).length}</p>
            <p>offene Schulungen: ${trainings.filter((t) => ["eingeladen", "bestaetigt", "Nachweis fehlt"].includes(t.status)).length}</p>
            <p>offene Aufgaben: ${tasks.filter((t) => t.status !== "erledigt").length}</p>
          </article>
        </div>
      `;
    } else if (state.profileTab === "Kontaktdaten") {
      content = `<div class="person-list"><article class="person-item"><p>Telefon: ${emp.phone || "-"}</p><p>Alternative Telefonnummer: ${emp.altPhone || "-"}</p><p>E-Mail: ${emp.email || "-"}</p><p>Adresse: ${emp.address || "-"}</p><p>Sprache: ${emp.language || "-"}</p></article></div>`;
    } else if (state.profileTab === "Beschäftigung") {
      content = `<div class="person-list"><article class="person-item"><p>Status: ${emp.status}</p><p>Rolle: ${emp.role}</p><p>Beschäftigungsart: ${emp.employmentType}</p><p>Eintrittsdatum: ${formatDate(emp.entryDate)}</p><p>Vertragsbeginn: ${formatDate(emp.contractStart)}</p><p>Vertragsende: ${formatDate(emp.contractEnd)}</p><p>Probezeit bis: ${formatDate(emp.probationUntil)}</p><p>Standort: ${emp.location || "-"}</p><p>Schichtmodell: ${emp.shiftModel || "-"}</p><p>bevorzugte Arbeitszeiten: ${emp.preferredHours || "-"}</p><p>bevorzugte Einsatzart: ${emp.preferredServiceType || "-"}</p></article></div>`;
    } else if (state.profileTab === "Schichten") {
      content = `<div class="person-list"><article class="person-item"><p>Heute: ${emp.todayShift || "-"}</p><p>Nächster Dienst: ${formatDateTime(emp.nextShift)}</p><p>Status: ${emp.status}</p></article></div>`;
    } else if (state.profileTab === "Abwesenheiten") {
      content = `<div class="person-list">${abs.map((a) => `<article class="person-item"><strong>${a.kind}</strong><p>${formatDateRange(a.start, a.expectedEnd)}</p><p>Status: ${a.status} · Nachweis: ${a.proofStatus}</p><p>${a.note || ""}</p></article>`).join("") || '<article class="person-item">Keine Einträge.</article>'}</div>`;
    } else if (state.profileTab === "Urlaub") {
      content = `<div class="person-list"><article class="person-item"><strong>Urlaubskonto (organisatorisch, Demo)</strong><p>Jahresanspruch: ${quota.yearly}</p><p>bereits genommen: ${quota.taken}</p><p>genehmigt: ${quota.approved}</p><p>beantragt: ${quota.requested}</p><p>verbleibend: ${quota.remaining}</p><p>Resturlaub Vorjahr: ${quota.carry}</p></article>${vacs.map((v) => `<article class="person-item"><strong>${v.type}</strong><p>${formatDateRange(v.start, v.end)}</p><p>Status: ${v.status}</p></article>`).join("")}</div>`;
    } else if (state.profileTab === "Dokumente") {
      content = `<div class="person-list">${docs.map((d) => `<article class="person-item"><strong>${displayDocType(d.type)}</strong><p>Nr: ${d.no || "-"}</p><p>gültig bis: ${formatDate(d.validUntil)}</p><p>Status: ${displayStatusText(d.status)}</p><p>geprüft am: ${formatDate(d.checkedAt)}</p><p>geprüft durch: ${d.checkedBy || "-"}</p><p>Notiz: ${d.note || "-"}</p></article>`).join("") || '<article class="person-item">Keine Dokumente.</article>'}</div>`;
    } else if (state.profileTab === "Schulungen") {
      content = `<div class="person-list">${trainings.map((t) => `<article class="person-item"><strong>${t.title}</strong><p>${formatDate(t.date)} ${t.time} · ${t.place}</p><p>Status: ${t.status} · Pflicht: ${t.mandatory ? "Ja" : "Nein"}</p></article>`).join("") || '<article class="person-item">Keine Schulungen.</article>'}</div>`;
    } else if (state.profileTab === "Fahrzeuge") {
      content = `<div class="person-list"><article class="person-item"><p>Aktuelles Fahrzeug: ${emp.activeVehicle || "-"}</p><p>bevorzugtes Fahrzeug: ${emp.preferredVehicle || "-"}</p><p>bevorzugter Fahrzeugtyp: ${emp.preferredVehicleType || "-"}</p><p>feste Fahrzeugzuordnung: ${emp.fixedVehicle || "-"}</p><p>erlaubte Fahrzeuge: ${listText(emp.allowedVehicles)}</p><p>nicht erlaubte Fahrzeuge: ${listText(emp.blockedVehicles)}</p><p>Ersatzfahrzeuge: ${listText(emp.replacementVehicles)}</p><p>Rollstuhlfahrten: ${emp.wheelchairSkill ? "Ja" : "Nein"}</p><p>Großraumfahrzeug: ${emp.largeVehicleSkill ? "Ja" : "Nein"}</p><p>Elektrofahrzeug-Einweisung: ${emp.evTraining ? "Ja" : "Nein"}</p><p>Qualifikationen: ${listText(emp.qualifications)}</p></article></div>`;
    } else if (state.profileTab === "Aufgaben") {
      content = `<div class="person-list">${tasks.map((t) => `<article class="person-item"><strong>${t.title}</strong><p>${t.category} · ${t.status}</p><p>Fällig: ${formatDate(t.dueDate)} · Verantwortlich: ${t.owner}</p><p>${t.note || ""}</p></article>`).join("") || '<article class="person-item">Keine Aufgaben.</article>'}</div>`;
    } else if (state.profileTab === "Mitteilungen") {
      content = `<div class="person-list">${msgs.map((m) => `<article class="person-item"><strong>${m.title}</strong><p>${m.category} · Priorität: ${m.priority}</p><p>Status Lesen: ${m.reads && m.reads[emp.id] ? "gelesen" : "ungelesen"}</p></article>`).join("") || '<article class="person-item">Keine Mitteilungen.</article>'}</div>`;
    } else if (state.profileTab === "Verlauf") {
      content = `<div class="person-list">${history.map((h) => `<article class="person-item"><strong>${h.event}</strong><p>${formatDateTime(h.at)} · ${h.by}</p><p>${h.note || ""}</p></article>`).join("") || '<article class="person-item">Kein Verlauf.</article>'}</div>`;
    } else {
      content = `<div class="person-list"><article class="person-item"><strong>Interne Notizen</strong><p>${emp.internalNotes || "Keine Notiz"}</p><p>${emp.profileNote || ""}</p></article></div>`;
    }

    panel.innerHTML = `<div class="person-profile-head"><span class="person-avatar">${(emp.firstName || "?").slice(0, 1)}${(emp.lastName || "").slice(0, 1)}</span><div><strong>${fullName(emp)}</strong><p>${emp.employeeId} · ${emp.role} · ${statusBadge(emp.status)}</p></div><div class="person-actions"><button class="admin-btn admin-btn-secondary" type="button" data-emp-edit="${emp.id}">Bearbeiten</button></div></div><div class="person-profile-tabs">${tabButtons}</div><div class="person-item">${content}</div>`;
  }

  function openModal(title, body, foot) {
    const m = document.querySelector("[data-emp-modal]");
    const t = document.querySelector("[data-emp-modal-title]");
    const b = document.querySelector("[data-emp-modal-body]");
    const f = document.querySelector("[data-emp-modal-foot]");
    if (!m || !t || !b || !f) return;
    t.textContent = title;
    b.innerHTML = body;
    f.innerHTML = foot || '<button class="admin-btn admin-btn-secondary" type="button" data-emp-close>Schließen</button>';
    m.hidden = false;
  }

  function normalizeEmploymentTypeForForm(value) {
    const text = String(value || "").trim();
    if (!text) return "Festangestellt";
    const normalized = text.toLowerCase();
    if (["full_time", "festangestellt", "vollzeit"].includes(normalized)) return "Festangestellt";
    if (["part_time", "teilzeit"].includes(normalized)) return "Teilzeit";
    if (["mini_job", "minijob"].includes(normalized)) return "Minijob";
    return "Sonstiges";
  }

  function setFormPanelVisible(visible) {
    const panel = document.querySelector("[data-emp-form-panel]");
    if (panel) {
      panel.hidden = !visible;
    }
    state.formVisible = Boolean(visible);
  }

  function setFormMode(mode) {
    const title = document.querySelector("[data-emp-form-title]");
    const submit = document.querySelector("[data-emp-form-submit]");
    if (title) {
      title.textContent = mode === "edit" ? "Mitarbeiter bearbeiten" : "Neuen Mitarbeiter anlegen";
    }
    if (submit) {
      submit.textContent = mode === "edit" ? "Änderungen speichern" : "Mitarbeiter anlegen";
    }
  }

  function setFormFeedback(message, type = "info") {
    const node = document.querySelector("[data-emp-feedback]");
    if (!node) return;
    node.textContent = message || "";
    node.dataset.state = type;
    node.style.color = type === "error" ? "#b91c1c" : type === "success" ? "#166534" : "";
  }

  function clearFormFeedback() {
    setFormFeedback("");
  }

  function fillFormFromEmployee(employee) {
    const form = document.querySelector("[data-emp-form]");
    if (!form || !employee) return;

    const values = {
      firstName: employee.firstName || employee.first_name || "",
      lastName: employee.lastName || employee.last_name || "",
      birthDate: employee.birthDate || employee.birth_date || "",
      birthPlace: employee.birthPlace || employee.birth_place || "",
      phone: employee.phone || "",
      altPhone: employee.altPhone || employee.alt_phone || "",
      email: employee.email || "",
      address: employee.address || "",
      language: employee.language || "",
      employeeId: employee.employeeId || employee.id || "",
      role: employee.role || "Fahrer",
      employmentType: normalizeEmploymentTypeForForm(employee.employmentType || employee.employment_type || ""),
      status: employee.status || "aktiv",
      entryDate: employee.entryDate || employee.entry_date || "",
      probationUntil: employee.probationUntil || employee.probation_until || "",
      contractStart: employee.contractStart || employee.contract_start || "",
      contractEnd: employee.contractEnd || employee.contract_end || "",
      location: employee.location || "",
      shiftModel: employee.shiftModel || employee.shift_model || "",
      preferredHours: employee.preferredHours || employee.preferred_hours || "",
      licenseClass: employee.licenseClass || employee.license_class || "",
      licenseNo: employee.licenseNo || employee.license_no || "",
      licenseValidUntil: employee.licenseValidUntil || employee.license_valid_until || "",
      licenseCheckedAt: employee.licenseCheckedAt || employee.license_checked_at || "",
      licenseCheckedBy: employee.licenseCheckedBy || employee.license_checked_by || "",
      pPermit: employee.pPermit || employee.p_permit || "Nein",
      pPermitValidUntil: employee.pPermitValidUntil || employee.p_permit_valid_until || "",
      pPermitCheckedAt: employee.pPermitCheckedAt || employee.p_permit_checked_at || "",
      pPermitCheckedBy: employee.pPermitCheckedBy || employee.p_permit_checked_by || "",
      documentStatus: employee.documentStatus || employee.document_status || "ungeprüft",
      preferredVehicle: employee.preferredVehicle || employee.preferred_vehicle || "",
      allowedVehicles: Array.isArray(employee.allowedVehicles) ? employee.allowedVehicles.join(",") : String(employee.allowedVehicles || ""),
      blockedVehicles: Array.isArray(employee.blockedVehicles) ? employee.blockedVehicles.join(",") : String(employee.blockedVehicles || ""),
      fixedVehicle: employee.fixedVehicle || employee.fixed_vehicle || "",
      replacementVehicles: Array.isArray(employee.replacementVehicles) ? employee.replacementVehicles.join(",") : String(employee.replacementVehicles || ""),
      preferredServiceType: employee.preferredServiceType || employee.preferred_service_type || "",
      wheelchairSkill: employee.wheelchairSkill ? "true" : "false",
      largeVehicleSkill: employee.largeVehicleSkill ? "true" : "false",
      evTraining: employee.evTraining ? "true" : "false",
      qualifications: Array.isArray(employee.qualifications) ? employee.qualifications.join(",") : String(employee.qualifications || ""),
      emName: employee.emergency && employee.emergency.name ? employee.emergency.name : "",
      emRelation: employee.emergency && employee.emergency.relation ? employee.emergency.relation : "",
      emPhone: employee.emergency && employee.emergency.phone ? employee.emergency.phone : "",
      emAltPhone: employee.emergency && employee.emergency.altPhone ? employee.emergency.altPhone : "",
      internalContact: employee.internalContact || employee.internal_contact || "",
      internalNotes: employee.internalNotes || employee.internal_notes || "",
      onboardingDocsDone: employee.onboardingDocsDone ? "true" : "false",
      clothingIssued: employee.clothingIssued ? "true" : "false",
      keysIssued: employee.keysIssued ? "true" : "false",
      tabletIssued: employee.tabletIssued ? "true" : "false",
      credentialsIssued: employee.credentialsIssued ? "true" : "false"
    };

    Object.entries(values).forEach(([name, value]) => {
      const field = form.querySelector(`[name="${name}"]`);
      if (field) {
        field.value = value;
      }
    });
  }

  function resetEditMode() {
    state.editEmployeeId = "";
    setFormMode("create");
    const form = document.querySelector("[data-emp-form]");
    if (form) {
      form.reset();
    }
  }

  function closeModal() {
    const m = document.querySelector("[data-emp-modal]");
    if (m) m.hidden = true;
  }

  function payloadFromForm(form) {
    const fd = new FormData(form);
    const toList = (value) => String(value || "").split(",").map((x) => x.trim()).filter(Boolean);

    return {
      firstName: String(fd.get("firstName") || "").trim(),
      lastName: String(fd.get("lastName") || "").trim(),
      birthDate: String(fd.get("birthDate") || ""),
      birthPlace: String(fd.get("birthPlace") || ""),
      phone: String(fd.get("phone") || "").trim(),
      altPhone: String(fd.get("altPhone") || "").trim(),
      email: String(fd.get("email") || "").trim(),
      address: String(fd.get("address") || "").trim(),
      language: String(fd.get("language") || "").trim(),
      image: "",
      employeeId: String(fd.get("employeeId") || "").trim(),
      role: String(fd.get("role") || "Fahrer"),
      employmentType: String(fd.get("employmentType") || "Vollzeit"),
      status: String(fd.get("status") || "aktiv"),
      entryDate: String(fd.get("entryDate") || ""),
      probationUntil: String(fd.get("probationUntil") || ""),
      contractStart: String(fd.get("contractStart") || ""),
      contractEnd: String(fd.get("contractEnd") || ""),
      location: String(fd.get("location") || ""),
      shiftModel: String(fd.get("shiftModel") || ""),
      preferredHours: String(fd.get("preferredHours") || ""),
      licenseClass: String(fd.get("licenseClass") || ""),
      licenseNo: String(fd.get("licenseNo") || ""),
      licenseValidUntil: String(fd.get("licenseValidUntil") || ""),
      licenseCheckedAt: String(fd.get("licenseCheckedAt") || ""),
      licenseCheckedBy: String(fd.get("licenseCheckedBy") || ""),
      pPermit: String(fd.get("pPermit") || "Nein"),
      pPermitValidUntil: String(fd.get("pPermitValidUntil") || ""),
      pPermitCheckedAt: String(fd.get("pPermitCheckedAt") || ""),
      pPermitCheckedBy: String(fd.get("pPermitCheckedBy") || ""),
      documentStatus: String(fd.get("documentStatus") || "ungeprüft"),
      driverCard: String(fd.get("driverCard") || ""),
      preferredVehicleType: String(fd.get("preferredVehicleType") || ""),
      preferredVehicle: String(fd.get("preferredVehicle") || ""),
      allowedVehicles: toList(fd.get("allowedVehicles")),
      blockedVehicles: toList(fd.get("blockedVehicles")),
      fixedVehicle: String(fd.get("fixedVehicle") || ""),
      replacementVehicles: toList(fd.get("replacementVehicles")),
      preferredServiceType: String(fd.get("preferredServiceType") || ""),
      wheelchairSkill: String(fd.get("wheelchairSkill") || "false") === "true",
      largeVehicleSkill: String(fd.get("largeVehicleSkill") || "false") === "true",
      evTraining: String(fd.get("evTraining") || "false") === "true",
      qualifications: toList(fd.get("qualifications")),
      emergency: {
        name: String(fd.get("emName") || ""),
        relation: String(fd.get("emRelation") || ""),
        phone: String(fd.get("emPhone") || ""),
        altPhone: String(fd.get("emAltPhone") || "")
      },
      internalContact: String(fd.get("internalContact") || ""),
      internalNotes: String(fd.get("internalNotes") || ""),
      onboardingDocsDone: String(fd.get("onboardingDocsDone") || "false") === "true",
      clothingIssued: String(fd.get("clothingIssued") || "false") === "true",
      keysIssued: String(fd.get("keysIssued") || "false") === "true",
      tabletIssued: String(fd.get("tabletIssued") || "false") === "true",
      credentialsIssued: String(fd.get("credentialsIssued") || "false") === "true",
      probation: Boolean(String(fd.get("probationUntil") || "")),
      activeVehicle: "-",
      todayShift: "offen",
      nextShift: "",
      lastActivity: "",
      profileNote: ""
    };
  }

  async function createEmployee(payload) {
    if (!D || typeof D.createEmployee !== "function") {
      setFormFeedback("Mitarbeiter konnte nicht gespeichert werden.", "error");
      return null;
    }

    const created = await D.createEmployee(payload);

    if (created && created.id) {
      state.selectedEmployeeId = created.id;
    }

    await syncStateFromService();
    await refreshEmployeesFromDataService();
    renderCockpit();
    renderList();
    renderProfile();
    return created;
  }

  async function saveEmployee(payload) {
    if (state.editEmployeeId) {
      if (!D || typeof D.updateEmployee !== "function") {
        setFormFeedback("Mitarbeiter konnte nicht gespeichert werden.", "error");
        return null;
      }

      const updated = await D.updateEmployee(state.editEmployeeId, payload);
      if (updated && updated.id) {
        state.selectedEmployeeId = updated.id;
      }
      state.editEmployeeId = "";
      await syncStateFromService();
      await refreshEmployeesFromDataService();
      renderCockpit();
      renderList();
      renderProfile();
      return updated;
    }

    return createEmployee(payload);
  }

  function bind() {
    document.addEventListener("click", async (event) => {
      const refresh = event.target.closest("[data-cockpit-refresh]");
      if (refresh) {
        await syncStateFromService();
        renderCockpit();
        renderList();
        renderProfile();
        return;
      }

      const select = event.target.closest("[data-cockpit-select]");
      if (select) {
        const id = select.getAttribute("data-cockpit-select") || "";
        state.selectedEmployeeId = id;
        renderCockpit();
        renderProfile();
        return;
      }

      const plan = event.target.closest("[data-cockpit-plan]");
      if (plan) {
        const employee = state.data.employees.find((e) => e.id === state.selectedEmployeeId) || state.data.employees[0] || null;
        if (employee) {
          P.publishEmployeePlanForDate(state.data, employee.id, P.todayIso(), { shiftStart: "08:00", shiftEnd: "16:00", vehicleLabel: employee.activeVehicle || employee.preferredVehicle || "", publishedBy: "Admin" });
          await syncStateFromService();
          renderCockpit();
          renderProfile();
        }
        return;
      }

      const docsReview = event.target.closest("[data-cockpit-docs]");
      if (docsReview) {
        const employee = state.data.employees.find((e) => e.id === state.selectedEmployeeId) || state.data.employees[0] || null;
        if (employee) {
          const docs = P.listEmployeeDocs(state.data, employee.id).filter((d) => d.status === "eingereicht");
          docs.forEach((doc) => P.reviewEmployeeDocument(state.data, doc.id, "gueltig", "Admin"));
          await syncStateFromService();
          renderCockpit();
          renderProfile();
        }
        return;
      }

      const sendMessage = event.target.closest("[data-cockpit-send-message]");
      if (sendMessage) {
        const employee = state.data.employees.find((e) => e.id === state.selectedEmployeeId) || state.data.employees[0] || null;
        const textarea = document.querySelector("[data-cockpit-message-text]");
        const text = textarea ? textarea.value.trim() : "";
        if (employee && text) {
          P.addEmployeeMessage(state.data, { employeeIds: [employee.id], title: "Admin-Hinweis", body: text, category: "Personal", priority: "normal", source: "Admin" });
          await syncStateFromService();
          renderCockpit();
          renderProfile();
          if (textarea) textarea.value = "";
        }
        return;
      }

      const vacationAction = event.target.closest("[data-cockpit-vacation]");
      if (vacationAction) {
        const id = vacationAction.getAttribute("data-cockpit-id") || "";
        const decision = vacationAction.getAttribute("data-cockpit-vacation") === "approve" ? "genehmigt" : "abgelehnt";
        P.decideVacationRequest(state.data, id, decision, "Admin", decision === "genehmigt" ? "Genehmigt aus der Zentrale" : "Abgelehnt aus der Zentrale");
        await syncStateFromService();
        renderCockpit();
        renderProfile();
        return;
      }

      const docAction = event.target.closest("[data-cockpit-doc]");
      if (docAction) {
        const id = docAction.getAttribute("data-cockpit-id") || "";
        const status = docAction.getAttribute("data-cockpit-doc") === "valid" ? "gueltig" : "fehlt";
        P.reviewEmployeeDocument(state.data, id, status, "Admin");
        await syncStateFromService();
        renderCockpit();
        renderProfile();
        return;
      }

      const absenceAction = event.target.closest("[data-cockpit-absence]");
      if (absenceAction) {
        const id = absenceAction.getAttribute("data-cockpit-id") || "";
        P.markReturn(state.data, id, P.todayIso(), true);
        await syncStateFromService();
        renderCockpit();
        renderProfile();
        return;
      }
    });

    document.addEventListener("input", (event) => {
      const search = event.target.closest("[data-emp-search]");
      if (!search) return;
      state.search = String(search.value || "");
      renderList();
    });

    document.addEventListener("change", (event) => {
      const filter = event.target.closest("[data-emp-filter]");
      if (filter) {
        state.filter = String(filter.value || "alle");
        renderList();
        return;
      }
      const sort = event.target.closest("[data-emp-sort]");
      if (sort) {
        state.sort = String(sort.value || "name");
        renderList();
      }
    });

    document.addEventListener("click", async (event) => {
      if (event.target.closest("[data-emp-close]")) {
        closeModal();
        return;
      }

      const addEmployee = event.target.closest("[data-emp-add]");
      if (addEmployee) {
        resetEditMode();
        clearFormFeedback();
        setFormPanelVisible(true);
        const form = document.querySelector("[data-emp-form]");
        if (form) {
          form.reset();
        }
        return;
      }

      const view = event.target.closest("[data-emp-view]");
      if (view) {
        state.view = view.getAttribute("data-emp-view") || "cards";
        renderList();
        return;
      }

      const open = event.target.closest("[data-emp-open]");
      if (open) {
        state.selectedEmployeeId = open.getAttribute("data-emp-open") || "";
        renderProfile();
        return;
      }

      const tab = event.target.closest("[data-emp-tab]");
      if (tab) {
        state.profileTab = tab.getAttribute("data-emp-tab") || "Übersicht";
        renderProfile();
        return;
      }

      const edit = event.target.closest("[data-emp-edit]");
      if (edit) {
        const id = edit.getAttribute("data-emp-edit") || "";
        const emp = state.data.employees.find((entry) => entry.id === id);
        if (emp) {
          state.editEmployeeId = id;
          state.selectedEmployeeId = id;
          clearFormFeedback();
          fillFormFromEmployee(emp);
          setFormMode("edit");
          setFormPanelVisible(true);
          renderProfile();
        }
        return;
      }

      const quick = event.target.closest("[data-emp-quick]");
      if (quick) {
        const kind = quick.getAttribute("data-emp-quick") || "";
        const id = quick.getAttribute("data-emp-id") || "";
        const emp = P.getEmployee(state.data, id);
        if (!emp) return;

        if (kind === "lock") {
          emp.status = "gesperrt";
          P.saveState(state.data);
          state.data = P.loadState();
          renderList();
          renderProfile();
          return;
        }
        if (kind === "unlock") {
          emp.status = "aktiv";
          P.saveState(state.data);
          state.data = P.loadState();
          renderList();
          renderProfile();
          return;
        }

        openModal(`Schnellaktion: ${fullName(emp)}`, "<p>Demo-Aktion ausgeführt. Keine externen Systeme, nur lokale UI-Logik.</p>");
      }

      const openDup = event.target.closest("[data-emp-dup-open]");
      if (openDup) {
        state.selectedEmployeeId = openDup.getAttribute("data-emp-dup-open") || "";
        closeModal();
        renderProfile();
        return;
      }

      if (event.target.closest("[data-emp-dup-create]") && state.pendingPayload) {
        createEmployee(state.pendingPayload);
        state.pendingPayload = null;
        closeModal();
        return;
      }

      if (event.target.closest("[data-emp-dup-cancel]")) {
        state.pendingPayload = null;
        closeModal();
      }
    });

    const form = document.querySelector("[data-emp-form]");
    if (form) {
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const payload = payloadFromForm(form);
        const dups = P && typeof P.checkDuplicate === "function" ? P.checkDuplicate(state.data, payload) : [];

        if (!dups.length) {
          const saved = await saveEmployee(payload);
          if (saved && saved.id) {
            setFormFeedback(state.editEmployeeId ? "Mitarbeiter wurde gespeichert." : "Mitarbeiter wurde angelegt.", "success");
            setFormPanelVisible(false);
            form.reset();
            resetEditMode();
            await refreshEmployeesFromDataService();
            return;
          }
          setFormFeedback("Mitarbeiter konnte nicht gespeichert werden.", "error");
          return;
        }

        state.pendingPayload = payload;
        const rows = dups.map((d) => `<li>${d.type}: ${d.employeeId}</li>`).join("");
        const first = dups[0].employeeId;
        openModal(
          "Mögliche Dublette erkannt",
          `<p>Folgende Übereinstimmungen wurden gefunden:</p><ul>${rows}</ul>`,
          `<button class="admin-btn" type="button" data-emp-dup-open="${first}">Bestehenden Mitarbeiter öffnen</button><button class="admin-btn admin-btn-warning" type="button" data-emp-dup-create>trotzdem neu anlegen</button><button class="admin-btn admin-btn-secondary" type="button" data-emp-dup-cancel>Vorgang abbrechen</button>`
        );
      });
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    if (window.AdminUiText) {
      window.AdminUiText.normalizeDocument(document);
      window.AdminUiText.observeDocument(document);
    }

    state.selectedEmployeeId = (state.data.ui && state.data.ui.selectedEmployeeId) || (state.data.employees[0] && state.data.employees[0].id) || "";
    setFormPanelVisible(false);
    setFormMode("create");
    clearFormFeedback();
    bind();

    await syncStateFromService();
    state.data = { ...(state.data || {}), employees: Array.isArray(state.data.employees) ? state.data.employees : [] };
    renderList();
    renderProfile();
  });
})();
