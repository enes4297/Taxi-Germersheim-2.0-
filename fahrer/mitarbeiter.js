(() => {
  const P = window.AdminPersonnelDemo;
  const ES = window.EmployeeSupabase || null;
  const STORAGE_KEY = "tgEmployeeDemoSession";
  const state = {
    data: P ? P.loadState() : { employees: [], documents: [], vacations: [], absences: [], messages: [] },
    employeeId: "MA-101",
    activeSection: "dienstplan",
    supabaseEmployee: null, /* { id, first_name, last_name, ... } */
    supabaseShifts: [],     /* veröffentlichte Schichten aus Supabase */
    supabaseVehicles: {}    /* { vehicleId: vehicleObjekt } */
  };

  function requireDemoSession() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) { window.location.replace("index.html"); return false; }
      const session = JSON.parse(raw);
      if (!session || !session.authenticated) { window.location.replace("index.html"); return false; }
      return true;
    } catch {
      window.location.replace("index.html");
      return false;
    }
  }

  function logout() {
    if (ES && ES.isConfigured()) {
      ES.signOut().finally(() => {
        localStorage.removeItem(STORAGE_KEY);
        window.location.replace("index.html");
      });
    } else {
      localStorage.removeItem(STORAGE_KEY);
      window.location.replace("index.html");
    }
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

  function formatShiftLabel(value) {
    const text = String(value || "").trim();
    if (!text) return "-";
    const compact = text
      .replace(/\s*[–-]\s*/g, " – ")
      .replace(/\s+uhr$/i, "")
      .trim();
    if (/^\d{2}:\d{2}\s–\s\d{2}:\d{2}$/.test(compact)) return `${compact} Uhr`;
    return compact;
  }

  function weekdayDateLabel(value) {
    const text = String(value || "").trim();
    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return formatDate(text);
    const date = new Date(`${text}T00:00:00`);
    const weekday = new Intl.DateTimeFormat("de-DE", { weekday: "long" }).format(date);
    return `${weekday}, ${formatDate(text)}`;
  }

  function weekdayShortLabel(value) {
    const text = String(value || "").trim();
    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return formatDate(text);
    const date = new Date(`${text}T00:00:00`);
    const weekday = new Intl.DateTimeFormat("de-DE", { weekday: "long" }).format(date);
    return `${weekday}, ${match[3]}.${match[2]}.`;
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

  function visibleLabel(value) {
    return String(value || "")
      .replace(/ae/g, "ä")
      .replace(/oe/g, "ö")
      .replace(/ue/g, "ü")
      .replace(/Ae/g, "Ä")
      .replace(/Oe/g, "Ö")
      .replace(/Ue/g, "Ü")
      .replace(/AE/g, "Ä")
      .replace(/OE/g, "Ö")
      .replace(/UE/g, "Ü");
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
    /* Supabase-Nutzer: eigene Funktion verwenden */
    if (state.supabaseEmployee) { renderIdentitySupabase(); return; }

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
    const greetingBase = hour < 12 ? "Guten Morgen" : hour < 18 ? "Guten Tag" : "Guten Abend";
    const fullName = `${e.firstName} ${e.lastName}`;
    const weekday = new Intl.DateTimeFormat("de-DE", { weekday: "long" }).format(now);
    const dateLabel = `${weekday}, ${new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }).format(now)}`;

    if (nameNode) nameNode.textContent = fullName;
    document.querySelectorAll("[data-portal-name]").forEach((el) => { el.textContent = fullName; });
    if (roleNode) roleNode.textContent = `${e.role} · ${e.employeeId}`;
    if (statusNode) statusNode.textContent = `Status: ${e.status}${snap && snap.unreadMessages ? ` · ${snap.unreadMessages} neue Mitteilungen` : ""}`;
    if (avatarNode) avatarNode.textContent = `${e.firstName.charAt(0)}${e.lastName.charAt(0)}`.toUpperCase();
    if (greetingNode) greetingNode.textContent = `${greetingBase}, ${fullName}`;
    if (dateNode) dateNode.textContent = dateLabel;
    if (messageBadge) messageBadge.textContent = snap && snap.unreadMessages ? String(snap.unreadMessages) : "0";
  }

  function renderHome() {
    /* Supabase-Nutzer: eigene Funktion verwenden */
    if (ES && ES.isConfigured()) { renderHomeSupabase(); return; }

    const e = emp();
    if (!e) return;
    const snap = portalSnapshot(e.id);
    const hero = document.querySelector("[data-portal-hero]");
    const tomorrowNode = document.querySelector("[data-portal-tomorrow]");
    if (!hero || !tomorrowNode) return;

    const todayPlan = snap.todayPlan || {};
    const tomorrowPlan = snap.tomorrowPlan || {};
    const todayVehicle = todayPlan.vehicleText || e.activeVehicle || "-";
    const todayShift = formatShiftLabel(todayPlan.shiftText || e.todayShift || "kein Dienst hinterlegt");
    const tomorrowVehicle = tomorrowPlan.published && tomorrowPlan.vehicleText ? tomorrowPlan.vehicleText : "";
    const tomorrowShift = tomorrowPlan.published ? formatShiftLabel(tomorrowPlan.shiftText || "Plan noch nicht veröffentlicht") : "Plan noch nicht veröffentlicht";
    const todayStatus = todayPlan.status || "Im Dienst";
    const isFreeToday = /frei|urlaub|krank|kein dienst/i.test(`${todayShift} ${todayStatus}`);

    hero.innerHTML = `
      <div class="panel-head">
        <div>
          <p class="panel-kicker">Heute</p>
          <h2>${weekdayDateLabel(P.todayIso())}</h2>
        </div>
        <span class="status-pill ${isFreeToday ? "neutral" : "active"}">${isFreeToday ? "Heute frei" : "Heute geplant"}</span>
      </div>
      <p class="hero-title">${isFreeToday ? "Heute frei" : "Arbeitszeit"}</p>
      <p class="hero-time">${isFreeToday ? "Heute frei" : todayShift}</p>
      <div class="hero-vehicle">
        <div class="hero-meta-row"><span>Fahrzeug</span><strong>${isFreeToday ? "Kein Fahrzeug" : todayVehicle}</strong></div>
        ${!isFreeToday && todayPlan.vehicleModel ? `<div class="hero-meta-row"><span>Typ</span><strong>${todayPlan.vehicleModel}</strong></div>` : ""}
      </div>
    `;

    tomorrowNode.innerHTML = `
      <div class="panel-head">
        <div>
          <p class="panel-kicker">Morgen</p>
          <h2>${weekdayDateLabel(tomorrowIso())}</h2>
        </div>
        <span class="status-pill ${tomorrowPlan.published ? "info" : "neutral"}">${tomorrowPlan.published ? "Veröffentlicht" : "Noch nicht veröffentlicht"}</span>
      </div>
      <p class="hero-title">${tomorrowPlan.published ? "Arbeitszeit" : "Morgen"}</p>
      <p class="hero-time">${tomorrowShift}</p>
      <div class="hero-vehicle"><div class="hero-meta-row"><span>Fahrzeug</span><strong>${tomorrowVehicle || (tomorrowPlan.published ? "Noch offen" : "Plan noch nicht veröffentlicht")}</strong></div></div>
    `;
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
    list.innerHTML = vacs.length ? `<div class="driver-list">${vacs.map((v) => `<article class="driver-item compact-item"><strong>${formatPeriod(v.start, v.end)}</strong><p>${visibleLabel(v.status)}</p><div class="driver-item-actions"><button class="driver-btn" type="button" data-portal-vac-open="${v.id}">Ansehen</button>${["beantragt", "in Pruefung"].includes(v.status) ? `<button class="driver-btn warning" type="button" data-portal-vac-withdraw="${v.id}">Zurückziehen</button>` : ""}</div></article>`).join("")}</div>` : '<p class="demo-note">Noch kein Urlaubsantrag vorhanden.</p>';
  }

  function renderShiftArea() {
    /* Supabase-Nutzer: eigene Funktion verwenden */
    if (ES && ES.isConfigured()) { renderShiftAreaSupabase(); return; }

    const e = emp();
    if (!e) return;
    const node = document.querySelector("[data-portal-shift-list]");
    if (!node) return;
    const today = P.todayIso();
    const todayDate = new Date(`${today}T00:00:00`);
    const dowToday = todayDate.getDay();
    const diffToMonday = (dowToday === 0 ? -6 : 1 - dowToday);
    const monday = new Date(`${today}T00:00:00`);
    monday.setDate(monday.getDate() + diffToMonday);
    const days = Array.from({ length: 7 }, (_, index) => {
      const current = new Date(monday);
      current.setDate(monday.getDate() + index);
      return `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`;
    });

    node.innerHTML = `<div class="week-list">${days.map((day) => {
      const plan = P.getEmployeeDayPlan ? P.getEmployeeDayPlan(state.data, e.id, day) : null;
      const shiftText = formatShiftLabel(plan?.shiftText || "Frei");
      const vehicleText = plan?.vehicleText || "";
      const isWorking = !/frei|urlaub|krank|kein dienst|nicht veröffentlicht/i.test(`${plan?.status || ""} ${shiftText}`) && shiftText !== "-";
      const isToday = day === today;
      return `<article class="week-row${isWorking ? " is-working" : ""}${isToday ? " is-today" : ""}">
        <div class="week-row-main">
          <strong>${weekdayShortLabel(day)}</strong>
          <p>${isWorking ? shiftText : "Frei"}</p>
        </div>
        <div class="week-row-side">
          ${isWorking ? `<span>${vehicleText || "Fahrzeug offen"}</span>` : `<span>Frei</span>`}
          <small>${isToday ? "Heute" : (plan?.published === false ? "Nicht veröffentlicht" : "")}</small>
        </div>
      </article>`;
    }).join("")}</div>`;
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
      return `<article class="doc-card"><div class="doc-card-head"><div><strong>${displayTypeLabel(d.type)}</strong><p>${d.validUntil ? `Gültig bis ${formatDate(d.validUntil)}` : "Bitte bei Bedarf neu senden"}</p></div><span class="status-pill ${chipClass}">${statusText}</span></div></article>`;
    }).join("")}</div>` : '<p class="demo-note">Noch kein Dokument gesendet.</p>';
  }

  function renderAbsences() {
    const e = emp();
    if (!e) return;
    const node = document.querySelector("[data-portal-absence-list]");
    if (!node) return;
    const absences = state.data.absences.filter((a) => a.employeeId === e.id);
    node.innerHTML = absences.length ? `<div class="driver-list">${absences.map((a) => `<article class="driver-item compact-item"><strong>${formatPeriod(a.start, a.expectedEnd)}</strong><p>${visibleLabel(a.kind)} · ${visibleLabel(a.status)}</p>${a.note ? `<p>${visibleLabel(a.note)}</p>` : ""}</article>`).join("")}</div>` : '<p class="demo-note">Noch keine Krankmeldung gesendet.</p>';
  }

  function renderMessages() {
    const e = emp();
    if (!e) return;
    const node = document.querySelector("[data-portal-msg-list]");
    if (!node) return;
    const msgs = state.data.messages.filter((m) => (m.employeeIds || []).includes(e.id));
    node.innerHTML = msgs.length ? `<div class="driver-list">${msgs.map((m) => `<article class="driver-item compact-item"><strong>${visibleLabel(m.title)}</strong><p>${visibleLabel(m.text)}</p><div class="driver-item-actions"><button class="driver-btn" type="button" data-portal-msg-read="${m.id}">Gelesen</button>${m.confirmRequired ? `<button class="driver-btn" type="button" data-portal-msg-confirm="${m.id}">Bestätigen</button>` : ""}</div></article>`).join("")}</div>` : '<p class="demo-note">Keine neuen Mitteilungen.</p>';
  }

  function renderMessageSummary() {
    const node = document.querySelector("[data-portal-message-summary]");
    const badge = document.querySelector("[data-portal-message-badge]");
    if (!node) return;

    if (state.supabaseEmployee) {
      if (badge) badge.textContent = "0";
      node.innerHTML = '<div class="message-summary-card"><strong>Keine neuen Mitteilungen</strong><p>Zurzeit liegt nichts Neues für dich vor.</p></div>';
      return;
    }

    const e = emp();
    if (!e) return;
    const msgs = state.data.messages.filter((m) => (m.employeeIds || []).includes(e.id));
    const unread = msgs.filter((m) => !(m.reads || {})[e.id]);
    if (badge) badge.textContent = String(unread.length);

    if (!unread.length) {
      node.innerHTML = '<div class="message-summary-card"><strong>Keine neuen Mitteilungen</strong><p>Alles Wichtige ist bereits gelesen.</p></div>';
      return;
    }

    const newest = unread[0];
    node.innerHTML = `
      <div class="message-summary-card is-new">
        <strong>${unread.length} neue Mitteilung${unread.length > 1 ? "en" : ""}</strong>
        <p>${visibleLabel(newest.title)}</p>
        <small>${visibleLabel(newest.text)}</small>
      </div>`;
  }

  /* ------------------------------------------------------------------ */
  /* Supabase-Hilfsfunktionen                                           */
  /* ------------------------------------------------------------------ */

  function todayIso() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function addDays(baseIso, n) {
    const d = new Date(`${baseIso}T00:00:00`);
    d.setDate(d.getDate() + n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function formatDateDE(isoDate) {
    const m = String(isoDate || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return isoDate || "-";
    return `${m[3]}.${m[2]}.${m[1]}`;
  }

  function formatTime(timeStr) {
    /* "06:00:00" → "06:00" */
    return String(timeStr || "").slice(0, 5) || "-";
  }

  function formatShiftTime(start, end) {
    const s = formatTime(start);
    const e = formatTime(end);
    if (s === "-" && e === "-") return "kein Dienst";
    return `${s} – ${e} Uhr`;
  }

  function weekdayName(isoDate) {
    const d = new Date(`${isoDate}T00:00:00`);
    return new Intl.DateTimeFormat("de-DE", { weekday: "long" }).format(d);
  }

  function vehicleLabel(v) {
    if (!v) return "nicht zugewiesen";
    const parts = [];
    if (v.name) parts.push(v.name);
    if (v.license_plate) parts.push(v.license_plate);
    return parts.join(" · ") || "-";
  }

  function shiftForDate(isoDate) {
    return state.supabaseShifts.find((s) => s.shift_date === isoDate) || null;
  }

  function vehicleForShift(shift) {
    if (!shift?.vehicle_id) return null;
    return state.supabaseVehicles[shift.vehicle_id] || null;
  }

  /**
   * Alle benötigten Supabase-Daten laden.
   */
  async function loadSupabaseData() {
    if (!ES || !ES.isConfigured()) return;
    try {
      const [employee, shifts] = await Promise.all([
        ES.getMyEmployee(),
        ES.getMyPublishedShifts()
      ]);
      state.supabaseEmployee = employee;
      state.supabaseShifts = Array.isArray(shifts) ? shifts : [];

      /* Fahrzeuge für alle Schichten parallel laden */
      const vehicleIds = [...new Set(
        state.supabaseShifts.map((s) => s.vehicle_id).filter(Boolean)
      )];
      const vehicleResults = await Promise.all(vehicleIds.map((id) => ES.getVehicle(id)));
      vehicleIds.forEach((id, i) => {
        if (vehicleResults[i]) state.supabaseVehicles[id] = vehicleResults[i];
      });
    } catch (err) {
      console.error("Dienstplandaten konnten nicht geladen werden.", err?.message);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Überschriebene Render-Funktionen mit Supabase-Daten                */
  /* ------------------------------------------------------------------ */

  function renderIdentitySupabase() {
    const se = state.supabaseEmployee;
    if (!se) return;
    const nameNode = document.querySelector("[data-portal-name]");
    const roleNode = document.querySelector("[data-portal-role]");
    const avatarNode = document.querySelector("[data-portal-avatar]");
    const greetingNode = document.querySelector("[data-portal-greeting]");
    const dateNode = document.querySelector("[data-portal-date]");
    const messageBadge = document.querySelector("[data-portal-message-badge]");

    const now = new Date();
    const h = now.getHours();
    const greeting = h < 12 ? "Guten Morgen" : h < 18 ? "Guten Tag" : "Guten Abend";
    const weekday = new Intl.DateTimeFormat("de-DE", { weekday: "long" }).format(now);
    const dateLabel = `${weekday}, ${new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }).format(now)}`;
    const fullName = `${se.first_name || ""} ${se.last_name || ""}`.trim() || "Mitarbeiter";
    const initials = `${(se.first_name || "M").charAt(0)}${(se.last_name || "A").charAt(0)}`.toUpperCase();

    if (nameNode) nameNode.textContent = fullName;
    document.querySelectorAll("[data-portal-name]").forEach(el => { el.textContent = fullName; });
    if (roleNode) roleNode.textContent = se.employment_type || "Mitarbeiter";
    const statusNode = document.querySelector("[data-portal-status]");
    if (statusNode) statusNode.textContent = "Angemeldet";
    if (avatarNode) avatarNode.textContent = initials;
    if (greetingNode) greetingNode.textContent = `${greeting}, ${fullName}`;
    if (dateNode) dateNode.textContent = dateLabel;
    if (messageBadge) messageBadge.textContent = "0";
  }

  function renderHomeSupabase() {
    const hero = document.querySelector("[data-portal-hero]");
    const tomorrowNode = document.querySelector("[data-portal-tomorrow]");
    if (!hero || !tomorrowNode) return;

    const today = todayIso();
    const tomorrow = addDays(today, 1);
    const todayShift = shiftForDate(today);
    const tomorrowShift = shiftForDate(tomorrow);
    const todayVehicle = vehicleForShift(todayShift);
    const tomorrowVehicle = vehicleForShift(tomorrowShift);

    /* Heute */
    if (todayShift) {
      hero.innerHTML = `
        <div class="panel-head">
          <div>
            <p class="panel-kicker">Heute</p>
            <h2>${weekdayName(today)}, ${formatDateDE(today)}</h2>
          </div>
            <span class="status-pill active">Heute geplant</span>
        </div>
          <p class="hero-title">Arbeitszeit</p>
        <p class="hero-time">${formatShiftTime(todayShift.start_time, todayShift.end_time)}</p>
        <div class="hero-vehicle">
          <div class="hero-meta-row"><span>Fahrzeug</span><strong>${vehicleLabel(todayVehicle)}</strong></div>
            ${todayVehicle?.vehicle_type ? `<div class="hero-meta-row"><span>Typ</span><strong>${todayVehicle.vehicle_type}</strong></div>` : ""}
        </div>`;
    } else {
      hero.innerHTML = `
        <div class="panel-head">
          <div>
            <p class="panel-kicker">Heute</p>
            <h2>${weekdayName(today)}, ${formatDateDE(today)}</h2>
          </div>
            <span class="status-pill neutral">Heute frei</span>
        </div>
          <p class="hero-title">Heute frei</p>
          <p class="hero-time">Heute frei</p>
          <div class="hero-vehicle"><div class="hero-meta-row"><span>Fahrzeug</span><strong>Kein Fahrzeug</strong></div></div>`;
    }

    /* Morgen */
    if (tomorrowShift) {
      tomorrowNode.innerHTML = `
        <div class="panel-head">
          <div>
            <p class="panel-kicker">Morgen</p>
            <h2>${weekdayName(tomorrow)}, ${formatDateDE(tomorrow)}</h2>
          </div>
            <span class="status-pill info">Veröffentlicht</span>
        </div>
          <p class="hero-title">Arbeitszeit</p>
        <p class="hero-time">${formatShiftTime(tomorrowShift.start_time, tomorrowShift.end_time)}</p>
        ${tomorrowVehicle ? `<div class="hero-vehicle"><div class="hero-meta-row"><span>Fahrzeug</span><strong>${vehicleLabel(tomorrowVehicle)}</strong></div></div>` : ""}`;
    } else {
      tomorrowNode.innerHTML = `
        <div class="panel-head">
          <div>
            <p class="panel-kicker">Morgen</p>
            <h2>${weekdayName(tomorrow)}, ${formatDateDE(tomorrow)}</h2>
          </div>
            <span class="status-pill neutral">Noch nicht veröffentlicht</span>
        </div>
        <p class="hero-title">Plan nicht veröffentlicht</p>
          <p class="hero-time">Plan noch nicht veröffentlicht</p>
          <div class="hero-vehicle"><div class="hero-meta-row"><span>Fahrzeug</span><strong>Noch offen</strong></div></div>`;
    }
  }

  function renderShiftAreaSupabase() {
    const node = document.querySelector("[data-portal-shift-list]");
    if (!node) return;

    /* Aktuelle Kalenderwoche: Montag bis Sonntag */
    const today = todayIso();
    const todayDate = new Date(`${today}T00:00:00`);
    const dowToday = todayDate.getDay(); /* 0=So, 1=Mo … 6=Sa */
    const diffToMonday = (dowToday === 0 ? -6 : 1 - dowToday); /* Montag dieser Woche */
    const monday = addDays(today, diffToMonday);
    const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i)); /* Mo–So */

    const items = days.map((day) => {
      const shift = shiftForDate(day);
      const vehicle = vehicleForShift(shift);
      const dayLabel = weekdayShortLabel(day);
      const isToday = day === today;

      if (shift) {
        return `<article class="week-row is-working${isToday ? " is-today" : ""}">
          <div class="week-row-main">
            <strong>${dayLabel}</strong>
            <p>${formatShiftTime(shift.start_time, shift.end_time)}</p>
          </div>
          <div class="week-row-side">
            <span>${vehicle ? vehicleLabel(vehicle) : "Fahrzeug offen"}</span>
            <small>${isToday ? "Heute" : "Veröffentlicht"}</small>
          </div>
        </article>`;
      } else {
        return `<article class="week-row${isToday ? " is-today" : ""}">
          <div class="week-row-main">
            <strong>${dayLabel}</strong>
            <p>Frei</p>
          </div>
          <div class="week-row-side">
            <span>Frei</span>
            <small>${isToday ? "Heute" : ""}</small>
          </div>
        </article>`;
      }
    }).join("");

    node.innerHTML = `<div class="week-list">${items}</div>`;
  }

  function render() {
    renderIdentity();
    renderHome();
    renderVacations();
    renderShiftArea();
    renderDocs();
    renderMessages();
    renderMessageSummary();
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
    const overlay = document.querySelector("[data-portal-overlay]");
    const isDrawer = safeSection !== "dienstplan";

    document.querySelectorAll("[data-portal-section]").forEach((panel) => {
      const isActive = (panel.getAttribute("data-portal-section") || "") === safeSection && isDrawer;
      panel.classList.toggle("is-open", isActive);
      panel.setAttribute("aria-expanded", isActive ? "true" : "false");
      panel.hidden = !isActive;
    });

    if (overlay) {
      overlay.hidden = !isDrawer;
      document.body.classList.toggle("portal-overlay-open", isDrawer);
    }

    if (isDrawer) return;
    if (options.scroll !== false) {
      document.querySelector("[data-portal-week-panel]")?.scrollIntoView({ behavior: "smooth", block: "start" });
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

      if (event.target.closest("[data-portal-close-drawer]")) {
        setActiveSection("dienstplan", { scroll: false });
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

      if (event.target.closest("[data-portal-open-profile]")) {
        setActiveSection("profil");
        return;
      }

      if (event.target.closest("[data-portal-logout]")) {
        logout();
        return;
      }

      /* Avatar → Benutzermenü öffnen/schließen */
      if (event.target.closest("[data-portal-avatar]")) {
        const menu = document.querySelector("[data-portal-user-menu]");
        const btn = document.querySelector("[data-portal-avatar]");
        if (!menu) return;
        const willOpen = menu.hidden;
        menu.hidden = !willOpen;
        btn.setAttribute("aria-expanded", willOpen ? "true" : "false");
        return;
      }

      /* Außerhalb des Avatar-Wrappers klicken → Menü schließen */
      if (!event.target.closest("[data-portal-avatar-wrap]")) {
        const menu = document.querySelector("[data-portal-user-menu]");
        if (menu && !menu.hidden) {
          menu.hidden = true;
          document.querySelector("[data-portal-avatar]")?.setAttribute("aria-expanded", "false");
        }
      }

      const open = event.target.closest("[data-portal-vac-open]");
      if (open) {
        const row = state.data.vacations.find((v) => v.id === open.getAttribute("data-portal-vac-open"));
        if (!row) return;
        openModal(`Antrag ${row.id}`, `<p>Status: ${visibleLabel(row.status)}</p><p>Zeitraum: ${formatDate(row.start)} bis ${formatDate(row.end)}</p><p>Notiz: ${visibleLabel(row.decisionNote || row.internalNote || "-")}</p>`);
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

    /* ESC schließt das Benutzermenü */
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        const overlay = document.querySelector("[data-portal-overlay]");
        if (overlay && !overlay.hidden) {
          setActiveSection("dienstplan", { scroll: false });
        }
        const menu = document.querySelector("[data-portal-user-menu]");
        if (menu && !menu.hidden) {
          menu.hidden = true;
          document.querySelector("[data-portal-avatar]")?.setAttribute("aria-expanded", "false");
        }
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
        renderMessageSummary();
        vacForm.reset();
        const feedback = document.querySelector("[data-portal-vac-feedback]");
        if (feedback) {
          feedback.hidden = false;
          feedback.textContent = "✓ Urlaubsantrag wurde gesendet.";
        }
        openModal("Urlaub gesendet", "<p>✓ Urlaubsantrag wurde gesendet.</p>");
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
        renderMessageSummary();
        absenceForm.reset();
        const feedback = document.querySelector("[data-portal-absence-feedback]");
        if (feedback) {
          feedback.hidden = false;
          feedback.textContent = "✓ Krankmeldung wurde gesendet.";
        }
        openModal("Krankmeldung gesendet", "<p>✓ Krankmeldung wurde gesendet.</p>");
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
        docForm.reset();
        renderDocs();
        renderHome();
        renderMessageSummary();
        selectDocumentType("Führerschein");
        const feedback = document.querySelector("[data-portal-doc-feedback]");
        if (feedback) {
          feedback.hidden = false;
          feedback.textContent = "✓ Dokument wurde gesendet.";
        }
        openModal("Dokument gesendet", "<p>✓ Dokument wurde gesendet.</p>");
      });
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    /* Seite ist zunächst ausgeblendet (data-portal-loading am body). */
    /* Nach Auth-Prüfung wird das Attribut entfernt. */

    const isSupabase = ES && ES.isConfigured();

    if (isSupabase) {
      /* ---- Supabase-Session prüfen ---- */
      const sessionResult = await ES.checkSession();
      if (!sessionResult) {
        localStorage.removeItem("tgEmployeeDemoSession");
        window.location.replace("index.html");
        return;
      }
      state.employeeId = sessionResult.employeeId;

      /* Schichten und Mitarbeiterdaten laden */
      await loadSupabaseData();
    } else {
      /* ---- Demo-Modus ---- */
      if (!requireDemoSession()) return;
    }

    /* Ladestate aufheben */
    document.body.removeAttribute("data-portal-loading");

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

    /* Auto-Logout nur für Supabase-Nutzer starten */
    if (isSupabase) initIdleTimer();
  });

  /* ------------------------------------------------------------------ */
  /* Automatischer Logout nach 30 Minuten Inaktivität                  */
  /* ------------------------------------------------------------------ */

  function initIdleTimer() {
    const TIMEOUT_MS  = 30 * 60 * 1000; /* 30 Minuten */
    const WARN_MS     = 28 * 60 * 1000; /* Warnung ab 28 Minuten */
    const TICK_MS     = 10 * 1000;      /* Prüfintervall: 10 Sekunden */
    const STAMP_KEY   = "tgEmpLastActivity";

    let warnShown  = false;
    let tickHandle = null;

    /* --- Zeitstempel setzen / Warnung ggf. wegblenden --- */
    function touch() {
      localStorage.setItem(STAMP_KEY, String(Date.now()));
      if (warnShown) {
        warnShown = false;
        const banner = document.querySelector("[data-portal-idle-warning]");
        if (banner) banner.hidden = true;
      }
    }

    /* --- Warnung einblenden --- */
    function showWarn() {
      if (warnShown) return;
      warnShown = true;
      const banner = document.querySelector("[data-portal-idle-warning]");
      if (banner) banner.hidden = false;
    }

    /* --- Prüfen ob Timeout abgelaufen --- */
    async function check() {
      const raw = localStorage.getItem(STAMP_KEY);
      if (!raw) return; /* Noch nicht initialisiert */
      const elapsed = Date.now() - Number(raw);

      if (elapsed >= TIMEOUT_MS) {
        clearInterval(tickHandle);
        const banner = document.querySelector("[data-portal-idle-warning]");
        if (banner) banner.hidden = true;
        localStorage.removeItem(STAMP_KEY);
        await ES.signOut();
        window.location.replace("index.html");
        return;
      }

      if (elapsed >= WARN_MS) {
        showWarn();
      }
    }

    /* --- Nur echte Nutzeraktionen erfassen (KEIN scroll/mousemove) --- */
    /* scroll wird bewusst NICHT verwendet: scrollIntoView() bei          */
    /* setActiveSection() würde den Timer sofort zurücksetzen.           */
    ["click", "keydown", "touchstart", "pointerdown"].forEach((evt) => {
      document.addEventListener(evt, touch, { passive: true, capture: true });
    });

    /* --- Rückkehr aus Hintergrund/Standby sofort prüfen --- */
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) check();
    });

    /* --- Initialen Zeitstempel setzen und Timer starten.             */
    /* WICHTIG: touch() erst NACH vollständiger Initialisierung aufrufen */
    /* damit keine Init-Events den Startpunkt verfälschen.              */
    setTimeout(() => {
      touch();
      tickHandle = setInterval(check, TICK_MS);
    }, 500); /* 500 ms Verzögerung: Init-Scrolls/Klicks ignorieren */
  }
})();
