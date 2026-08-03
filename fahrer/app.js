(() => {
  const STORAGE_KEY = "adminV15DriverOps";
  const DISPO_STORAGE_KEY = "adminLiveDispoV131";
  const Q = window.AdminQualityDemo || null;

  const DRIVER_BASE = [
    { id: "101", label: "Fahrer 101", name: "Michael Becker", adminDriverId: "DRV-201", defaultVehicleId: "VEH-201", employeeId: "MA-101", initials: "MB" },
    { id: "102", label: "Fahrer 102", name: "Sabine Hoffmann", adminDriverId: "DRV-202", defaultVehicleId: "VEH-202", employeeId: "MA-102", initials: "SH" },
    { id: "203", label: "Fahrer 203", name: "Daniel Kaya", adminDriverId: "DRV-203", defaultVehicleId: "VEH-203", employeeId: "MA-203", initials: "DK" },
    { id: "305", label: "Fahrer 305", name: "Mehmet Yildiz", adminDriverId: "DRV-205", defaultVehicleId: "VEH-205", employeeId: "MA-305", initials: "MY" }
  ];

  const DRIVER_STATUS = {
    off: "nicht im Dienst",
    ready: "einsatzbereit",
    offer: "Auftrag erhalten",
    toCustomer: "auf dem Weg zum Kunden",
    atCustomer: "beim Kunden",
    boarded: "Fahrgast eingestiegen",
    running: "Fahrt läuft",
    pause: "Pause",
    unavailable: "nicht verfügbar",
    finished: "Schicht beendet"
  };

  const ORDER_FLOW = [
    "Auftrag angenommen",
    "Fahrt zum Kunden gestartet",
    "Am Abholort angekommen",
    "Fahrgast eingestiegen",
    "Fahrt gestartet",
    "Zwischenhalt",
    "Ziel erreicht",
    "Zahlung erfassen",
    "Auftrag abschließen"
  ];

  const state = {
    data: loadData(),
    currentDriverId: "",
    activeTab: "start",
    waitTimer: null
  };

  function deepClone(v) {
    return JSON.parse(JSON.stringify(v));
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function nowTime() {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }

  function todayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function makeDefaultData() {
    return {
      selectedDriverId: "",
      drivers: DRIVER_BASE.map((d) => ({
        ...d,
        statusKey: "off",
        currentVehicleId: "",
        shiftStart: "",
        shiftEnd: "",
        shiftPlannedHours: 8,
        breakTotalMin: 0,
        currentBreakStart: "",
        ridesDone: 0,
        cancelled: 0,
        noShow: 0,
        kmToday: 0,
        readyAt: "",
        lastStatusAt: "",
        activeOrderId: "",
        nextOrderId: "",
        warnings: [],
        certifications: {
          licenseValid: true,
          permitValid: true,
          fitForWork: true
        }
      })),
      vehicleChecks: [],
      damages: [],
      handovers: [],
      fuelLogs: [],
      chargeLogs: [],
      cleaningLogs: [],
      payments: [],
      cashClosings: [],
      problems: [],
      incidents: [],
      events: [],
      notifications: [],
      orders: buildInitialOrders(),
      pendingWorkshop: []
    };
  }

  function buildInitialOrders() {
    return [
      {
        id: "TG-8101",
        driverId: "101",
        adminOrderId: "TG-1048",
        statusIndex: 0,
        statusText: ORDER_FLOW[0],
        customer: {
          name: "Mara Hoffmann",
          phone: "0171 770 1001",
          pickup: "Germersheim Zentrum 4",
          destination: "Frankfurt Flughafen Terminal 1",
          bell: "Hoffmann",
          entrance: "Eingang C",
          floor: "EG",
          contact: "Mara Hoffmann",
          notes: "10 Minuten vorher anrufen.",
          mobility: "selbstständig",
          wheelchair: "Nein",
          rollator: "Nein",
          companion: "Nein",
          luggage: "2 große Koffer",
          returnTrip: "Nein",
          internal: "Kunde steht am Taxistand Ost"
        },
        rideType: "Flughafenfahrt",
        pickupTime: "08:35",
        distanceDemo: "12 km",
        durationDemo: "18 Min",
        persons: 2,
        requirements: "Großer Kofferraum",
        billingType: "Karte",
        centralNotes: "Abholung 5 Minuten früher planen",
        accepted: true,
        declined: false,
        timeline: [{ status: ORDER_FLOW[0], time: nowTime() }]
      },
      {
        id: "TG-8102",
        driverId: "102",
        adminOrderId: "TG-1049",
        statusIndex: 0,
        statusText: ORDER_FLOW[0],
        customer: {
          name: "Nora Winter",
          phone: "0172 901 2244",
          pickup: "Leimersheim Hauptstraße 9",
          destination: "Onkologie Ludwigshafen",
          bell: "Winter",
          entrance: "Seiteneingang B",
          floor: "1",
          contact: "Nora Winter",
          notes: "Patient benötigt Hilfe bis zur Haustür.",
          mobility: "mit Hilfe",
          wheelchair: "Nein",
          rollator: "Ja",
          companion: "Ja",
          luggage: "1 medizinische Tasche",
          returnTrip: "Ja",
          internal: "Seiteneingang benutzen"
        },
        rideType: "Chemo",
        pickupTime: "09:20",
        distanceDemo: "9 km",
        durationDemo: "16 Min",
        persons: 1,
        requirements: "Begleitperson, rollatorfreundlich",
        billingType: "Krankenkasse",
        centralNotes: "Rückfahrtzeit später bestätigen",
        accepted: false,
        declined: false,
        timeline: []
      },
      {
        id: "TG-8103",
        driverId: "203",
        adminOrderId: "",
        statusIndex: 0,
        statusText: "Angebot",
        customer: {
          name: "RheinBahn Service GmbH",
          phone: "07274 901700",
          pickup: "RheinBahn Service, Germersheim Süd 7",
          destination: "Mannheim Hbf",
          bell: "Disposition",
          entrance: "Tor 2",
          floor: "1",
          contact: "Eva Kranz",
          notes: "Teamtransfer",
          mobility: "selbstständig",
          wheelchair: "Nein",
          rollator: "Nein",
          companion: "Nein",
          luggage: "2 Handtaschen",
          returnTrip: "Nein",
          internal: "Kostenstelle RB-41"
        },
        rideType: "Bahntransfer",
        pickupTime: "10:05",
        distanceDemo: "22 km",
        durationDemo: "31 Min",
        persons: 3,
        requirements: "Business-Fahrt",
        billingType: "Firmenkonto",
        centralNotes: "Pünktlich am Tor 2",
        accepted: false,
        declined: false,
        timeline: []
      }
    ];
  }

  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return makeDefaultData();
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.drivers)) return makeDefaultData();
      return parsed;
    } catch {
      return makeDefaultData();
    }
  }

  function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
  }

  function resetData() {
    if (!window.confirm("Fahrer-Demo wirklich zurücksetzen? Alle lokalen V15-Daten gehen verloren.")) return;
    state.data = makeDefaultData();
    state.currentDriverId = "";
    saveData();
    showScreen("login");
    renderAll();
  }

  function getCurrentDriver() {
    return state.data.drivers.find((d) => d.id === state.currentDriverId) || null;
  }

  function statusBadgeClass(statusKey) {
    if (statusKey === "ready" || statusKey === "running" || statusKey === "toCustomer" || statusKey === "atCustomer" || statusKey === "boarded") return "status-on";
    if (statusKey === "pause" || statusKey === "offer") return "status-warn";
    if (statusKey === "unavailable") return "status-danger";
    return "status-off";
  }

  function pushEvent(type, message, driverId = "", extras = {}) {
    state.data.events.unshift({ id: `EV-${Date.now()}-${Math.floor(Math.random() * 99)}`, type, message, driverId, at: nowIso(), ...extras });
    state.data.events = state.data.events.slice(0, 250);
    if (driverId) {
      state.data.notifications.unshift({ id: `NT-${Date.now()}-${Math.floor(Math.random() * 99)}`, driverId, title: type, text: message, at: nowTime(), read: false });
      state.data.notifications = state.data.notifications.slice(0, 120);
    }
  }

  function updateDriverStatus(driver, nextStatusKey) {
    driver.statusKey = nextStatusKey;
    driver.lastStatusAt = nowIso();
    if (nextStatusKey === "ready") driver.readyAt = nowIso();
    saveData();
    syncToLiveDispo({ kind: "driverStatus", driver });
  }

  function renderDriverSelector() {
    const wrap = document.querySelector("[data-driver-select-grid]");
    if (!wrap) return;
    wrap.innerHTML = state.data.drivers.map((driver) => `
      <article class="driver-select-card">
        <strong>${driver.label}</strong>
        <p>${driver.name} · ${driver.employeeId}</p>
        <p>Status: ${DRIVER_STATUS[driver.statusKey] || DRIVER_STATUS.off}</p>
        <button class="driver-btn primary" type="button" data-driver-select="${driver.id}">Dashboard öffnen</button>
      </article>
    `).join("");
  }

  function showScreen(screen) {
    document.querySelectorAll("[data-screen]").forEach((el) => {
      const key = el.getAttribute("data-screen");
      const active = key === screen;
      el.hidden = !active;
    });
  }

  function setActiveTab(tab) {
    state.activeTab = tab;
    document.querySelectorAll("[data-driver-tab]").forEach((btn) => {
      btn.classList.toggle("is-active", (btn.getAttribute("data-driver-tab") || "") === tab);
    });
    document.querySelectorAll("[data-driver-pane]").forEach((pane) => {
      pane.classList.toggle("is-visible", (pane.getAttribute("data-driver-pane") || "") === tab);
    });
  }

  function renderIdentity(driver) {
    const node = document.querySelector("[data-driver-identity]");
    if (!node || !driver) return;
    node.innerHTML = `
      <span class="driver-avatar">${driver.initials}</span>
      <div class="driver-identity-meta">
        <strong>${driver.name}</strong>
        <small>${driver.label} · ${driver.employeeId}</small>
        <small>Status: <span class="driver-status-pill ${statusBadgeClass(driver.statusKey)}">${DRIVER_STATUS[driver.statusKey] || DRIVER_STATUS.off}</span></small>
      </div>
    `;
  }

  function calcShiftDuration(driver) {
    if (!driver.shiftStart) return "00:00";
    const start = new Date(driver.shiftStart).getTime();
    const end = driver.shiftEnd ? new Date(driver.shiftEnd).getTime() : Date.now();
    const min = Math.max(0, Math.floor((end - start) / 60000));
    const hh = String(Math.floor(min / 60)).padStart(2, "0");
    const mm = String(min % 60).padStart(2, "0");
    return `${hh}:${mm}`;
  }

  function getDriverOrders(driverId) {
    return state.data.orders.filter((o) => o.driverId === driverId);
  }

  function getActiveOrder(driverId) {
    return getDriverOrders(driverId).find((o) => o.accepted && !o.declined && o.statusIndex < ORDER_FLOW.length - 1) || null;
  }

  function getNextOrder(driverId) {
    return getDriverOrders(driverId).find((o) => !o.accepted && !o.declined) || null;
  }

  function renderStatusCards(driver) {
    const node = document.querySelector("[data-driver-status-cards]");
    if (!node || !driver) return;
    const active = getActiveOrder(driver.id);
    const next = getNextOrder(driver.id);
    node.innerHTML = `
      <article class="driver-status-card"><small>Aktueller Status</small><strong>${DRIVER_STATUS[driver.statusKey] || DRIVER_STATUS.off}</strong></article>
      <article class="driver-status-card"><small>Aktuelles Fahrzeug</small><strong>${driver.currentVehicleId || "-"}</strong></article>
      <article class="driver-status-card"><small>Schichtbeginn</small><strong>${driver.shiftStart ? new Date(driver.shiftStart).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) : "-"}</strong></article>
      <article class="driver-status-card"><small>Schichtdauer</small><strong>${calcShiftDuration(driver)}</strong></article>
      <article class="driver-status-card"><small>Aktueller Auftrag</small><strong>${active ? active.id : "-"}</strong></article>
      <article class="driver-status-card"><small>Nächster Auftrag</small><strong>${next ? next.id : "-"}</strong></article>
      <article class="driver-status-card"><small>Pausenzeit</small><strong>${driver.breakTotalMin} Min</strong></article>
      <article class="driver-status-card"><small>Fahrten heute</small><strong>${driver.ridesDone}</strong></article>
    `;
  }

  function renderStartPane(driver) {
    const statusNode = document.querySelector("[data-driver-current-status]");
    const workNode = document.querySelector("[data-driver-worktime]");
    const notifyNode = document.querySelector("[data-driver-notifications]");
    if (!statusNode || !workNode || !notifyNode || !driver) return;

    const shiftDuration = calcShiftDuration(driver);
    const remaining = Math.max(0, Math.round(driver.shiftPlannedHours * 60 - ((driver.shiftStart ? (Date.now() - new Date(driver.shiftStart).getTime()) : 0) / 60000)));

    statusNode.innerHTML = `
      <p><span class="driver-status-pill ${statusBadgeClass(driver.statusKey)}">${DRIVER_STATUS[driver.statusKey] || DRIVER_STATUS.off}</span></p>
      <p>Schichtbeginn: ${driver.shiftStart ? new Date(driver.shiftStart).toLocaleString("de-DE") : "-"}</p>
      <p>Aktuelles Fahrzeug: ${driver.currentVehicleId || "nicht zugewiesen"}</p>
      <p>Letzte Statusmeldung: ${driver.lastStatusAt ? new Date(driver.lastStatusAt).toLocaleString("de-DE") : "-"}</p>
    `;

    workNode.innerHTML = `
      <div class="driver-list">
        <article class="driver-item"><strong>Schichtdauer</strong><p>${shiftDuration} h</p></article>
        <article class="driver-item"><strong>Gefahrene Zeit</strong><p>${Math.max(0, Number(driver.ridesDone) * 34)} Min (Demo)</p></article>
        <article class="driver-item"><strong>Pausenzeit</strong><p>${driver.breakTotalMin} Min</p></article>
        <article class="driver-item"><strong>Bereitschaftszeit</strong><p>${Math.max(0, Number(shiftDuration.split(":")[0]) * 60 + Number(shiftDuration.split(":")[1]) - driver.breakTotalMin - Number(driver.ridesDone) * 34)} Min (Demo)</p></article>
        <article class="driver-item"><strong>Kilometer</strong><p>${driver.kmToday} km</p></article>
        <article class="driver-item"><strong>Verbleibend geplant</strong><p>${Math.floor(remaining / 60)}h ${remaining % 60}m</p></article>
      </div>
      <p class="demo-note">Demo-Hinweis: Keine rechtssichere Zeiterfassung.</p>
    `;

    const notes = state.data.notifications.filter((n) => n.driverId === driver.id).slice(0, 8);
    notifyNode.innerHTML = notes.length ? `<div class="driver-list">${notes.map((n) => `<article class="driver-item"><strong>${n.title}</strong><p>${n.text}</p><small>${n.at}</small></article>`).join("")}</div>` : '<p class="demo-note">Keine neuen Benachrichtigungen.</p>';
  }

  function renderOrderInbox(driver) {
    const node = document.querySelector("[data-driver-order-inbox]");
    if (!node) return;
    const offers = getDriverOrders(driver.id).filter((o) => !o.accepted && !o.declined);
    node.innerHTML = offers.length ? `<div class="driver-list">${offers.map((o) => `
      <article class="driver-item">
        <strong>${o.id} · ${o.rideType}</strong>
        <p>${o.pickupTime} · ${o.customer.pickup} → ${o.customer.destination}</p>
        <p>Distanz: ${o.distanceDemo} · Fahrzeit: ${o.durationDemo} · Personen: ${o.persons}</p>
        <p>Anforderung: ${o.requirements} · Abrechnung: ${o.billingType}</p>
        <p>Zentrale: ${o.centralNotes}</p>
        <div class="driver-item-actions">
          <button class="driver-btn primary" type="button" data-order-action="accept" data-order-id="${o.id}">Annehmen</button>
          <button class="driver-btn warning" type="button" data-order-action="decline" data-order-id="${o.id}">Ablehnen</button>
          <button class="driver-btn" type="button" data-order-action="details" data-order-id="${o.id}">Details</button>
          <button class="driver-btn" type="button" data-order-action="contact" data-order-id="${o.id}">Zentrale kontaktieren</button>
        </div>
      </article>
    `).join("")}</div>` : '<p class="demo-note">Kein neuer Auftragseingang.</p>';
  }

  function renderActiveOrder(driver) {
    const node = document.querySelector("[data-driver-active-order]");
    if (!node) return;
    const order = getActiveOrder(driver.id);
    if (!order) {
      node.innerHTML = '<p class="demo-note">Kein aktiver Auftrag.</p>';
      return;
    }

    const timeline = order.timeline.slice(-6).map((step) => `<small>${step.time} · ${step.status}</small>`).join("<br>");

    node.innerHTML = `
      <div class="driver-list">
        <article class="driver-item">
          <strong>${order.id} · ${order.statusText}</strong>
          <p>${order.customer.name} · ${order.customer.phone}</p>
          <p>${order.customer.pickup} → ${order.customer.destination}</p>
          <p>Klingel: ${order.customer.bell} · Eingang: ${order.customer.entrance} · Etage: ${order.customer.floor}</p>
          <p>Hinweis: ${order.customer.notes}</p>
          <p>Mobilität: ${order.customer.mobility} · Rollstuhl: ${order.customer.wheelchair} · Rollator: ${order.customer.rollator}</p>
          <p>Begleitperson: ${order.customer.companion} · Gepäck: ${order.customer.luggage}</p>
          <p>Rückfahrt: ${order.customer.returnTrip} · Intern: ${order.customer.internal}</p>
          <div class="driver-item-actions">
            <button class="driver-btn primary" type="button" data-order-action="next" data-order-id="${order.id}">Nächster Status</button>
            <button class="driver-btn" type="button" data-order-action="wait" data-order-id="${order.id}">Wartezeit</button>
            <button class="driver-btn" type="button" data-order-action="nav" data-order-id="${order.id}">Navigation starten</button>
            <button class="driver-btn warning" type="button" data-order-action="noshow" data-order-id="${order.id}">Fehlfahrt</button>
            <button class="driver-btn" type="button" data-order-action="contactCustomer" data-order-id="${order.id}">Kunde anrufen</button>
          </div>
          <p><b>Statusverlauf</b><br>${timeline || "-"}</p>
        </article>
      </div>
    `;
  }

  function renderVehiclePane(driver) {
    const node = document.querySelector("[data-driver-vehicle-overview]");
    if (!node || !driver) return;

    const checks = state.data.vehicleChecks.filter((c) => c.driverId === driver.id).slice(0, 3);
    const damages = state.data.damages.filter((d) => d.driverId === driver.id).slice(0, 5);
    node.innerHTML = `
      <div class="driver-list">
        <article class="driver-item"><strong>Zugewiesenes Fahrzeug</strong><p>${driver.currentVehicleId || "Noch kein Fahrzeug übernommen"}</p></article>
        <article class="driver-item"><strong>Letzter Fahrzeugcheck</strong><p>${checks[0] ? `${new Date(checks[0].at).toLocaleString("de-DE")} · ${checks[0].overall}` : "Kein Check dokumentiert"}</p></article>
        <article class="driver-item"><strong>Schäden gesamt</strong><p>${damages.length}</p></article>
        ${damages.map((d) => `<article class="driver-item"><strong>${d.damageType} · ${d.priority}</strong><p>${d.zone} · ${d.description}</p><small>${new Date(d.at).toLocaleString("de-DE")}</small></article>`).join("")}
      </div>
    `;
  }

  function renderAlertsPane(driver) {
    const node = document.querySelector("[data-driver-problem-list]");
    if (!node || !driver) return;
    const issues = [...state.data.problems.filter((p) => p.driverId === driver.id), ...state.data.incidents.filter((p) => p.driverId === driver.id)]
      .sort((a, b) => (a.at < b.at ? 1 : -1))
      .slice(0, 10);
    node.innerHTML = issues.length ? `<div class="driver-list">${issues.map((it) => `<article class="driver-item"><strong>${it.category || "Meldung"} · ${it.priority || "Info"}</strong><p>${it.description}</p><small>${new Date(it.at).toLocaleString("de-DE")}</small></article>`).join("")}</div>` : '<p class="demo-note">Keine Problem- oder Notfallmeldungen.</p>';
  }

  function renderCashPane(driver) {
    const node = document.querySelector("[data-driver-cash-overview]");
    if (!node || !driver) return;

    const payments = state.data.payments.filter((p) => p.driverId === driver.id);
    const fuels = state.data.fuelLogs.filter((f) => f.driverId === driver.id);
    const startCash = 100;
    const cashIn = payments.filter((p) => p.paymentType === "Bar").reduce((s, p) => s + Number(p.fare || 0) + Number(p.tip || 0), 0);
    const tip = payments.reduce((s, p) => s + Number(p.tip || 0), 0);
    const expenses = fuels.filter((f) => f.paymentType === "Bar").reduce((s, f) => s + Number(f.total || 0), 0);
    const current = startCash + cashIn - expenses;

    node.innerHTML = `
      <div class="driver-list">
        <article class="driver-item"><strong>Startbestand</strong><p>${startCash.toFixed(2)} EUR</p></article>
        <article class="driver-item"><strong>Bareinnahmen</strong><p>${cashIn.toFixed(2)} EUR</p></article>
        <article class="driver-item"><strong>Trinkgeld</strong><p>${tip.toFixed(2)} EUR</p></article>
        <article class="driver-item"><strong>Ausgaben</strong><p>${expenses.toFixed(2)} EUR</p></article>
        <article class="driver-item"><strong>Barbestand aktuell</strong><p>${current.toFixed(2)} EUR</p></article>
      </div>
      <p class="demo-note">Demo-Hinweis: Keine echte Zahlungsabwicklung oder Buchhaltung.</p>
    `;
  }

  function renderAll() {
    renderDriverSelector();
    const driver = getCurrentDriver();
    if (!driver) return;
    renderIdentity(driver);
    renderStatusCards(driver);
    renderStartPane(driver);
    renderOrderInbox(driver);
    renderActiveOrder(driver);
    renderVehiclePane(driver);
    renderAlertsPane(driver);
    renderCashPane(driver);
  }

  function openModal(title, body, foot = "") {
    const modal = document.querySelector("[data-driver-modal]");
    const t = document.querySelector("[data-driver-modal-title]");
    const b = document.querySelector("[data-driver-modal-body]");
    const f = document.querySelector("[data-driver-modal-foot]");
    if (!modal || !t || !b || !f) return;
    t.textContent = title;
    b.innerHTML = body;
    f.innerHTML = foot || '<button class="driver-btn" type="button" data-driver-modal-close>Schließen</button>';
    modal.hidden = false;
  }

  function closeModal() {
    const modal = document.querySelector("[data-driver-modal]");
    if (modal) modal.hidden = true;
  }

  function getDispoData() {
    try {
      const raw = localStorage.getItem(DISPO_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.orders) || !Array.isArray(parsed.drivers)) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function saveDispoData(data) {
    localStorage.setItem(DISPO_STORAGE_KEY, JSON.stringify(data));
  }

  function addDispoEvent(data, category, message, refType = "system", refId = "") {
    if (!data.sequence) data.sequence = { order: 1100, event: 1, notification: 1 };
    data.sequence.event = Number(data.sequence.event || 0) + 1;
    data.events = Array.isArray(data.events) ? data.events : [];
    data.events.unshift({
      id: `EV-${data.sequence.event}`,
      time: nowTime(),
      category,
      tone: category === "Probleme" ? "tone-problem" : category === "Fahrer" ? "tone-driver" : category === "Fahrzeuge" ? "tone-vehicle" : "tone-order",
      message,
      refType,
      refId
    });
    data.events = data.events.slice(0, 90);
  }

  function addDispoNotification(data, priority, title, text, refType = "system", refId = "") {
    if (!data.sequence) data.sequence = { order: 1100, event: 1, notification: 1 };
    data.sequence.notification = Number(data.sequence.notification || 0) + 1;
    data.notifications = Array.isArray(data.notifications) ? data.notifications : [];
    data.notifications.unshift({ id: `NT-${data.sequence.notification}`, priority, title, text, refType, refId, read: false, time: nowTime() });
    data.notifications = data.notifications.slice(0, 70);
  }

  function syncToLiveDispo(payload) {
    const dispo = getDispoData();
    if (!dispo) return;

    if (payload.kind === "driverStatus") {
      const driver = payload.driver;
      const dispoDriver = dispo.drivers.find((d) => d.id === driver.adminDriverId);
      if (dispoDriver) {
        if (driver.statusKey === "pause") dispoDriver.status = "Pause";
        else if (driver.statusKey === "off" || driver.statusKey === "finished") dispoDriver.status = "Offline";
        else dispoDriver.status = "Aktiv";
        dispoDriver.onDuty = !["off", "finished"].includes(driver.statusKey);
      }

      const vehicle = dispo.vehicles.find((v) => v.id === driver.currentVehicleId);
      if (vehicle) {
        if (driver.statusKey === "pause") vehicle.status = "Pause";
        if (driver.statusKey === "ready") vehicle.status = "Frei";
      }

      addDispoEvent(dispo, "Fahrer", `Fahrer ${driver.adminDriverId} Status: ${DRIVER_STATUS[driver.statusKey]}.`, "driver", driver.adminDriverId);
    }

    if (payload.kind === "orderUpdate") {
      const order = payload.order;
      let dispoOrder = dispo.orders.find((o) => o.id === order.adminOrderId);
      if (!dispoOrder) {
        if (!dispo.sequence) dispo.sequence = { order: 1100, event: 1, notification: 1 };
        dispo.sequence.order = Number(dispo.sequence.order || 0) + 1;
        const newId = `TG-${dispo.sequence.order}`;
        dispoOrder = {
          id: newId,
          sourceExternalId: order.id,
          customer: order.customer.name,
          phone: order.customer.phone,
          pickup: order.customer.pickup,
          destination: order.customer.destination,
          date: todayISO(),
          time: order.pickupTime,
          rideType: order.rideType,
          persons: order.persons,
          luggage: order.customer.luggage,
          wheelchair: order.customer.wheelchair === "Ja",
          companion: order.customer.companion === "Ja",
          insurance: "-",
          transportVoucher: "-",
          approval: "Offen",
          returnTrip: order.customer.returnTrip === "Ja",
          returnTime: "",
          vehicleWish: "",
          priority: "Mittel",
          status: "Neu",
          driverId: "",
          vehicleId: "",
          notes: order.centralNotes || "",
          pricing: "Demo",
          billingType: order.billingType,
          createdAt: nowTime(),
          updatedAt: nowTime(),
          pickupCoord: { x: 45, y: 58 },
          destinationCoord: { x: 60, y: 30 },
          forcedRisk: false
        };
        dispo.orders.unshift(dispoOrder);
        order.adminOrderId = newId;
      }

      const driver = state.data.drivers.find((d) => d.id === order.driverId);
      if (driver) {
        dispoOrder.driverId = driver.adminDriverId;
        dispoOrder.vehicleId = driver.currentVehicleId || driver.defaultVehicleId || "";
      }

      const mapStatus = {
        "Auftrag angenommen": "Bestätigt",
        "Fahrt zum Kunden gestartet": "Fahrer unterwegs",
        "Am Abholort angekommen": "Fahrer angekommen",
        "Fahrgast eingestiegen": "Fahrgast eingestiegen",
        "Fahrt gestartet": "Fahrt läuft",
        Zwischenhalt: "Fahrt läuft",
        "Ziel erreicht": "Ziel erreicht",
        "Zahlung erfassen": "Ziel erreicht",
        "Auftrag abschließen": "Abgeschlossen"
      };
      dispoOrder.status = mapStatus[order.statusText] || dispoOrder.status || "Neu";
      dispoOrder.updatedAt = nowTime();

      addDispoEvent(dispo, "Aufträge", `${order.id}: ${order.statusText}`, "order", dispoOrder.id);
      addDispoNotification(dispo, "Mittel", "Fahrerstatus Auftrag", `${order.id} -> ${order.statusText}`, "order", dispoOrder.id);
    }

    if (payload.kind === "damage") {
      const damage = payload.damage;
      const vehicle = dispo.vehicles.find((v) => v.id === damage.vehicleId);
      if (vehicle && damage.priority === "kritisch") {
        vehicle.status = "Gesperrt";
        vehicle.markerType = "Gesperrt";
        addDispoEvent(dispo, "Probleme", `Kritischer Schaden an ${vehicle.plate}: Fahrzeug gesperrt.`, "vehicle", vehicle.id);
        addDispoNotification(dispo, "Hoch", "Kritischer Schaden", `${vehicle.plate} wurde gesperrt.`, "vehicle", vehicle.id);
      }
    }

    if (payload.kind === "problem") {
      const p = payload.problem;
      addDispoEvent(dispo, "Probleme", `${p.category}: ${p.description}`, "system", "");
      if (p.priority === "dringend" || p.priority === "Notfall") {
        addDispoNotification(dispo, "Hoch", "Fahrerproblem", `${p.category}: ${p.description}`, "system", "");
      }
    }

    saveDispoData(dispo);
    saveData();
  }

  function buildVehicleListFromDispo() {
    const dispo = getDispoData();
    if (!dispo) return [];
    return (dispo.vehicles || []).map((v) => ({
      id: v.id,
      name: v.name,
      plate: v.plate,
      type: v.type,
      km: v.km,
      fuel: v.fuel,
      battery: v.battery,
      status: v.status,
      lastDriver: (dispo.drivers || []).find((d) => d.id === v.driverId)?.name || "-",
      knownDamages: state.data.damages.filter((d) => d.vehicleId === v.id).length,
      cleanState: "ok"
    }));
  }

  function openShiftWizard() {
    const driver = getCurrentDriver();
    if (!driver) return;

    const vehicles = buildVehicleListFromDispo();

    openModal(
      "Schicht starten - geführter Ablauf",
      `
      <article class="driver-success-box">Schritt 1: Fahrer bestätigen</article>
      <form class="driver-form-grid" data-shift-start-form>
        <label><span>Name</span><input class="driver-input" name="name" value="${driver.name}" required></label>
        <label><span>Mitarbeiter-ID</span><input class="driver-input" name="employeeId" value="${driver.employeeId}" required></label>
        <label><span>Führerschein gültig</span><select class="driver-select" name="licenseValid"><option>Ja</option><option>Nein</option></select></label>
        <label><span>Personenbeförderungsschein gültig</span><select class="driver-select" name="permitValid"><option>Ja</option><option>Nein</option></select></label>
        <label class="full"><span>Arbeitsfähigkeit bestätigt</span><select class="driver-select" name="fitForWork"><option>Ja</option><option>Nein</option></select></label>
      </form>
      <article class="driver-success-box">Schritt 2: Fahrzeug auswählen</article>
      <div class="driver-list">
        ${vehicles.map((v) => `<article class="driver-item"><strong>${v.name} · ${v.plate}</strong><p>${v.type} · KM ${v.km} · Tank ${v.fuel}% / Akku ${v.battery}%</p><p>Status ${v.status} · Letzter Fahrer ${v.lastDriver} · Schäden ${v.knownDamages} · Sauberkeit ${v.cleanState}</p><button class="driver-btn" type="button" data-shift-vehicle-pick="${v.id}">Übernehmen</button></article>`).join("")}
      </div>
      <article class="driver-success-box">Schritt 3: Fahrzeugkontrolle durchführen</article>
      <button class="driver-btn" type="button" data-driver-action="vehicleCheck">Zur Checkliste</button>
      <article class="driver-success-box">Schritt 4: Schicht starten</article>
      <p class="demo-note">Nach Start: Status einsatzbereit, Fahrzeugzuweisung aktiv, Live-Dispo-Ereignis wird erzeugt.</p>
    `,
      '<button class="driver-btn primary" type="button" data-shift-start-confirm>Schicht jetzt starten</button><button class="driver-btn ghost" type="button" data-driver-modal-close>Abbrechen</button>'
    );
  }

  function openVehicleChecklist() {
    const driver = getCurrentDriver();
    if (!driver) return;

    const checks = [
      "Karosserie", "Scheiben", "Spiegel", "Beleuchtung", "Reifen", "Kennzeichen", "sichtbare Schäden", "Sauberkeit außen",
      "Sitze", "Gurte", "Fußraum", "Armaturen", "Taxameter", "Kartenlesegerät", "Tablet oder Smartphone", "Ladekabel",
      "Kindersitz", "Verbandskasten", "Warndreieck", "Warnwesten", "Rollstuhlrampe", "Befestigungssystem", "Sauberkeit innen",
      "Kilometerstand", "Tankstand", "Akkustand", "Reichweite", "Warnleuchten", "Reifendruckwarnung", "Motorkontrollleuchte", "Servicehinweis"
    ];

    openModal(
      "Fahrzeug-Checkliste",
      `
      <p class="demo-note">Bewertung je Punkt: in Ordnung, leichte Auffälligkeit, Mangel, nicht fahrbereit.</p>
      <div class="driver-check-grid">
        ${checks.map((item, idx) => `
          <article class="driver-check-item">
            <h4>${item}</h4>
            <select class="driver-select" data-check-item="${idx}">
              <option>in Ordnung</option>
              <option>leichte Auffälligkeit</option>
              <option>Mangel</option>
              <option>nicht fahrbereit</option>
            </select>
          </article>
        `).join("")}
      </div>
      <form class="driver-form-grid" data-check-extra-form>
        <label><span>Mangelbeschreibung</span><input class="driver-input" name="description"></label>
        <label><span>Kategorie</span><select class="driver-select" name="category"><option>Karosserie</option><option>Technik</option><option>Reifen</option><option>Innenraum</option></select></label>
        <label><span>Priorität</span><select class="driver-select" name="priority"><option>niedrig</option><option>mittel</option><option>hoch</option><option>kritisch</option></select></label>
        <label><span>Demo-Foto</span><input class="driver-input" type="file" name="photo"></label>
        <label class="full"><span>Fahrzeug weiterhin nutzbar</span><select class="driver-select" name="usable"><option>Ja</option><option>Nein</option></select></label>
      </form>
    `,
      '<button class="driver-btn primary" type="button" data-checklist-save>Checkliste speichern</button><button class="driver-btn ghost" type="button" data-driver-modal-close>Abbrechen</button>'
    );
  }

  function openDamageForm() {
    openModal(
      "Schadensdokumentation",
      `
      <p class="demo-note">Bereiche auswählen und Schaden dokumentieren.</p>
      <div class="driver-zone-grid">
        ${["vorne", "hinten", "linke Seite", "rechte Seite", "Innenraum", "Felgen", "Scheiben", "Beleuchtung"].map((z) => `<button class="driver-zone-btn" type="button" data-damage-zone="${z}">${z}</button>`).join("")}
      </div>
      <form class="driver-form-grid" data-damage-form>
        <label><span>Schadensart</span><select class="driver-select" name="damageType"><option>Kratzer</option><option>Delle</option><option>Riss</option><option>Bruch</option><option>Verschmutzung</option><option>technische Störung</option><option>Reifenproblem</option><option>Lichtproblem</option><option>Innenraumschaden</option><option>sonstiger Schaden</option></select></label>
        <label><span>Zeitpunkt festgestellt</span><input class="driver-input" name="foundAt" value="${todayISO()} ${nowTime()}"></label>
        <label><span>Bereits vorhanden</span><select class="driver-select" name="existing"><option>Nein</option><option>Ja</option></select></label>
        <label><span>Weiterfahrt möglich</span><select class="driver-select" name="drivable"><option>Ja</option><option>Nein</option></select></label>
        <label><span>Priorität</span><select class="driver-select" name="priority"><option>niedrig</option><option>mittel</option><option>hoch</option><option>kritisch</option></select></label>
        <label><span>Demo-Foto</span><input class="driver-input" type="file" name="photo"></label>
        <label class="full"><span>Beschreibung</span><textarea class="driver-textarea" name="description" required></textarea></label>
        <label class="full"><span>Fahrerkommentar</span><textarea class="driver-textarea" name="comment"></textarea></label>
      </form>
    `,
      '<button class="driver-btn warning" type="button" data-damage-save>Schaden speichern</button><button class="driver-btn ghost" type="button" data-driver-modal-close>Abbrechen</button>'
    );
  }

  function openPauseForm() {
    const driver = getCurrentDriver();
    if (!driver) return;
    const isInPause = Boolean(driver.currentBreakStart);
    openModal(
      isInPause ? "Pause beenden" : "Pause starten",
      `
      <form class="driver-form-grid" data-pause-form>
        <label><span>Pausenart</span><select class="driver-select" name="pauseType"><option>gesetzliche Pause</option><option>kurze Pause</option><option>Essen</option><option>Tanken</option><option>Laden</option><option>Fahrzeugreinigung</option><option>persönlicher Grund</option><option>technische Unterbrechung</option></select></label>
        <label><span>Kommentar</span><input class="driver-input" name="comment"></label>
      </form>
      <p class="demo-note">Während Pause werden neue Aufträge als Warnung angezeigt.</p>
    `,
      `<button class="driver-btn primary" type="button" data-pause-toggle="${isInPause ? "end" : "start"}">${isInPause ? "Pause beenden" : "Pause starten"}</button>`
    );
  }

  function openProblemForm(isAccident = false) {
    const title = isAccident ? "Unfallmeldung" : "Problem melden";
    const body = isAccident ? `
      <form class="driver-form-grid" data-accident-form>
        <label><span>Datum</span><input class="driver-input" name="date" value="${todayISO()}" required></label>
        <label><span>Uhrzeit</span><input class="driver-input" name="time" value="${nowTime()}" required></label>
        <label><span>Ort</span><input class="driver-input" name="location" required></label>
        <label><span>Fahrzeug</span><input class="driver-input" name="vehicle" required></label>
        <label><span>Fahrer</span><input class="driver-input" name="driver" required></label>
        <label><span>Auftrag</span><input class="driver-input" name="order"></label>
        <label><span>Fahrgast im Fahrzeug</span><select class="driver-select" name="passenger"><option>Nein</option><option>Ja</option></select></label>
        <label><span>Verletzte</span><select class="driver-select" name="injured"><option>Nein</option><option>Ja</option></select></label>
        <label><span>Polizei informiert</span><select class="driver-select" name="police"><option>Nein</option><option>Ja</option></select></label>
        <label><span>Rettungsdienst informiert</span><select class="driver-select" name="medic"><option>Nein</option><option>Ja</option></select></label>
        <label><span>Unfallgegner</span><input class="driver-input" name="opponent"></label>
        <label><span>Kennzeichen Unfallgegner</span><input class="driver-input" name="opponentPlate"></label>
        <label><span>Zeugen</span><input class="driver-input" name="witness"></label>
        <label><span>Fahrzeug fahrbereit</span><select class="driver-select" name="drivable"><option>Ja</option><option>Nein</option></select></label>
        <label><span>Foto-Demo</span><input class="driver-input" type="file" name="photo"></label>
        <label class="full"><span>Schadenbeschreibung</span><textarea class="driver-textarea" name="description" required></textarea></label>
        <label class="full"><span>Kommentar</span><textarea class="driver-textarea" name="comment"></textarea></label>
      </form>
      <p class="driver-warning-box">Hinweis: Im echten Notfall sofort 112 anrufen.</p>
    ` : `
      <form class="driver-form-grid" data-problem-form>
        <label><span>Kategorie</span><select class="driver-select" name="category"><option>Fahrzeugproblem</option><option>Unfall</option><option>Reifenpanne</option><option>Kunde nicht erreichbar</option><option>Konflikt mit Fahrgast</option><option>medizinischer Zwischenfall</option><option>Zahlung verweigert</option><option>Kartenlesegerät defekt</option><option>Navigation funktioniert nicht</option><option>Verspätung</option><option>sonstiges Problem</option></select></label>
        <label><span>Priorität</span><select class="driver-select" name="priority"><option>Information</option><option>normal</option><option>dringend</option><option>Notfall</option></select></label>
        <label><span>Standort (Demo)</span><input class="driver-input" name="location" value="Germersheim"></label>
        <label><span>Auftrag</span><input class="driver-input" name="order"></label>
        <label><span>Fahrzeug</span><input class="driver-input" name="vehicle"></label>
        <label><span>Kunde</span><input class="driver-input" name="customer"></label>
        <label><span>Foto-Demo</span><input class="driver-input" type="file" name="photo"></label>
        <label><span>Rückruf benötigt</span><select class="driver-select" name="callback"><option>Nein</option><option>Ja</option></select></label>
        <label class="full"><span>Beschreibung</span><textarea class="driver-textarea" name="description" required></textarea></label>
      </form>
      <p class="driver-warning-box">Hinweis: Keine echte Notruf-Funktion im Demo-Portal.</p>
    `;

    openModal(title, body, `<button class="driver-btn warning" type="button" data-problem-save="${isAccident ? "accident" : "problem"}">Meldung speichern</button><button class="driver-btn ghost" type="button" data-driver-modal-close>Abbrechen</button>`);
  }

  function openFoundItemForm() {
    const driver = getCurrentDriver();
    if (!driver) return;
    openModal(
      "Fundsache melden",
      `
      <form class="driver-form-grid" data-found-form>
        <label><span>Gegenstand</span><input class="driver-input" name="object" required></label>
        <label><span>Kategorie</span><select class="driver-select" name="category"><option>Handy</option><option>Geldboerse</option><option>Schluessel</option><option>Tasche</option><option>Kleidung</option><option>Dokumente</option><option>Bargeld</option><option>Schmuck</option><option>Brille</option><option>Kopfhoerer</option><option>Medikament</option><option>Gepaeck</option><option>Kindersache</option><option>sonstiger Gegenstand</option></select></label>
        <label><span>Farbe</span><input class="driver-input" name="color"></label>
        <label><span>Marke</span><input class="driver-input" name="brand"></label>
        <label><span>Fahrt-ID</span><input class="driver-input" name="rideId"></label>
        <label><span>Fundort im Fahrzeug</span><input class="driver-input" name="place"></label>
        <label><span>Wertkategorie</span><select class="driver-select" name="valueCategory"><option>gering</option><option>normal</option><option>hoch</option><option>besonders sensibel</option></select></label>
        <label class="full"><span>Beschreibung</span><textarea class="driver-textarea" name="description"></textarea></label>
      </form>
      <p class="demo-note">Demo-Fundmeldung ohne echte Behoerdenanbindung.</p>
    `,
      '<button class="driver-btn" type="button" data-driver-found-save>Meldung speichern</button><button class="driver-btn ghost" type="button" data-driver-modal-close>Abbrechen</button>'
    );
  }

  function openStatementForm() {
    const driver = getCurrentDriver();
    if (!driver || !Q) return;
    const qState = Q.loadState();
    const complaints = (qState.complaints || []).filter((c) => normalizeText(c.driver || "") === normalizeText(driver.name) || normalizeText(c.driverId || "") === normalizeText(driver.employeeId));
    openModal(
      "Stellungnahme abgeben",
      `
      <form class="driver-form-grid" data-driver-statement-form>
        <label><span>Beschwerdefall</span><select class="driver-select" name="complaintId">${complaints.map((c) => `<option value="${c.id}">${c.id} - ${c.shortText}</option>`).join("") || '<option value="">Kein Fall zugeordnet</option>'}</select></label>
        <label><span>Zeitpunkt</span><input class="driver-input" name="time" value="${todayISO()} ${nowTime()}"></label>
        <label class="full"><span>Darstellung des Fahrers</span><textarea class="driver-textarea" name="text" required></textarea></label>
        <label><span>besondere Umstaende</span><input class="driver-input" name="circumstances"></label>
        <label><span>Zeugen</span><input class="driver-input" name="witnesses"></label>
        <label><span>technische Probleme</span><input class="driver-input" name="technical"></label>
        <label class="full"><span>Kommentar</span><input class="driver-input" name="comment"></label>
        <label><span>Demo-Anhang</span><input class="driver-input" name="attachment"></label>
      </form>
    `,
      '<button class="driver-btn" type="button" data-driver-statement-save>Stellungnahme senden</button><button class="driver-btn ghost" type="button" data-driver-modal-close>Abbrechen</button>'
    );
  }

  function openQualityTasks() {
    const driver = getCurrentDriver();
    if (!driver || !Q) return;
    const qState = Q.loadState();
    const tasks = (qState.actions || []).filter((a) => {
      const txt = normalizeText(`${a.title} ${a.description} ${a.note || ""}`);
      return txt.includes(normalizeText(driver.name)) || txt.includes(normalizeText(driver.employeeId));
    });
    openModal("Offene Massnahmen", tasks.length ? `<div class="driver-list">${tasks.map((a) => `<article class="driver-item"><strong>${a.title}</strong><p>${a.type} · Status ${a.status}</p><p>Frist: ${a.dueDate || "-"}</p><p>${a.note || ""}</p></article>`).join("")}</div>` : '<p class="demo-note">Keine persoenlichen Qualitaetsmassnahmen offen.</p>');
  }

  function openInspectionConfirm() {
    if (!Q) return;
    const qState = Q.loadState();
    const checks = (qState.inspections || []).filter((i) => !["durchgefuehrt", "abgeschlossen"].includes(i.status));
    openModal(
      "Pruefung bestaetigen",
      `
      <form class="driver-form-grid" data-driver-inspection-form>
        <label><span>Pruefung</span><select class="driver-select" name="inspectionId">${checks.map((c) => `<option value="${c.id}">${c.type} - ${c.target || c.area}</option>`).join("") || '<option value="">Keine offene Pruefung</option>'}</select></label>
        <label><span>Ergebnis</span><select class="driver-select" name="result"><option>bestanden</option><option>bestanden mit Hinweis</option><option>Mangel</option><option>Nachpruefung erforderlich</option></select></label>
        <label><span>Hinweis</span><input class="driver-input" name="findings"></label>
      </form>
    `,
      '<button class="driver-btn" type="button" data-driver-inspection-save>Bestaetigen</button><button class="driver-btn ghost" type="button" data-driver-modal-close>Abbrechen</button>'
    );
  }

  function openQuestionAnswer() {
    const driver = getCurrentDriver();
    if (!driver || !Q) return;
    const qState = Q.loadState();
    const open = (qState.complaints || []).filter((c) => normalizeText(c.driver || "") === normalizeText(driver.name) && ["Rueckfrage Fahrer", "in Pruefung", "eskaliert"].includes(c.status));
    openModal(
      "Rueckfragen beantworten",
      `
      <form class="driver-form-grid" data-driver-answer-form>
        <label><span>Fall</span><select class="driver-select" name="complaintId">${open.map((c) => `<option value="${c.id}">${c.id} - ${c.shortText}</option>`).join("") || '<option value="">Keine offene Rueckfrage</option>'}</select></label>
        <label class="full"><span>Antwort</span><textarea class="driver-textarea" name="note"></textarea></label>
      </form>
    `,
      '<button class="driver-btn" type="button" data-driver-answer-save>Antwort speichern</button><button class="driver-btn ghost" type="button" data-driver-modal-close>Abbrechen</button>'
    );
  }

  function openQualityHints() {
    if (!Q) return;
    const qState = Q.loadState();
    const hints = Q.buildWarnings(qState).slice(0, 12);
    openModal("Wichtige Hinweise", hints.length ? `<div class="driver-list">${hints.map((h) => `<article class="driver-item"><strong>${h.priority}</strong><p>${h.text}</p></article>`).join("")}</div>` : "<p class='demo-note'>Keine Hinweise.</p>");
  }

  function openPaymentForm() {
    openModal(
      "Zahlung erfassen",
      `
      <form class="driver-form-grid" data-payment-form>
        <label><span>Fahrpreis</span><input class="driver-input" type="number" min="0" step="0.01" name="fare" required></label>
        <label><span>Trinkgeld</span><input class="driver-input" type="number" min="0" step="0.01" name="tip" value="0"></label>
        <label><span>Zahlungsart</span><select class="driver-select" name="paymentType"><option>Bar</option><option>Karte</option><option>PayPal POS</option><option>Rechnung</option><option>Krankenkasse</option><option>Gutschein</option><option>Firmenkonto</option><option>bereits bezahlt</option><option>keine Zahlung im Fahrzeug</option></select></label>
        <label><span>Belegnummer</span><input class="driver-input" name="receipt"></label>
        <label><span>Taxameterbetrag</span><input class="driver-input" type="number" min="0" step="0.01" name="meter"></label>
        <label><span>Festpreis</span><input class="driver-input" type="number" min="0" step="0.01" name="fixed"></label>
        <label><span>Gutscheinbetrag</span><input class="driver-input" type="number" min="0" step="0.01" name="voucher"></label>
        <label><span>Restbetrag</span><input class="driver-input" type="number" min="0" step="0.01" name="rest"></label>
        <label class="full"><span>Notiz</span><textarea class="driver-textarea" name="note"></textarea></label>
      </form>
    `,
      '<button class="driver-btn primary" type="button" data-payment-save>Zahlung speichern</button>'
    );
  }

  function openFuelForm(isCharge = false, isCleaning = false) {
    const driver = getCurrentDriver();
    if (!driver) return;

    if (isCleaning) {
      openModal(
        "Fahrzeugreinigung dokumentieren",
        `
        <form class="driver-form-grid" data-clean-form>
          <label><span>Innenreinigung</span><select class="driver-select" name="inside"><option>Ja</option><option>Nein</option></select></label>
          <label><span>Außenreinigung</span><select class="driver-select" name="outside"><option>Ja</option><option>Nein</option></select></label>
          <label><span>Desinfektion</span><select class="driver-select" name="disinfection"><option>Ja</option><option>Nein</option></select></label>
          <label><span>Scheiben gereinigt</span><select class="driver-select" name="windows"><option>Ja</option><option>Nein</option></select></label>
          <label><span>Fußmatten gereinigt</span><select class="driver-select" name="mats"><option>Ja</option><option>Nein</option></select></label>
          <label><span>Müll entfernt</span><select class="driver-select" name="trash"><option>Ja</option><option>Nein</option></select></label>
          <label><span>Fundsache gefunden</span><select class="driver-select" name="found"><option>Nein</option><option>Ja</option></select></label>
          <label><span>Gegenstand</span><input class="driver-input" name="object"></label>
          <label><span>Fundort</span><input class="driver-input" name="place"></label>
          <label><span>Zugehörige Fahrt</span><input class="driver-input" name="ride"></label>
          <label><span>Foto-Demo</span><input class="driver-input" type="file" name="photo"></label>
          <label class="full"><span>Kommentar</span><textarea class="driver-textarea" name="comment"></textarea></label>
        </form>
      `,
        '<button class="driver-btn primary" type="button" data-clean-save>Reinigung speichern</button>'
      );
      return;
    }

    if (isCharge) {
      openModal(
        "Ladevorgang",
        `
        <form class="driver-form-grid" data-charge-form>
          <label><span>Fahrzeug</span><input class="driver-input" name="vehicle" value="${driver.currentVehicleId || ""}" required></label>
          <label><span>Ladestation</span><input class="driver-input" name="station" required></label>
          <label><span>Startzeit</span><input class="driver-input" name="start" value="${todayISO()} ${nowTime()}"></label>
          <label><span>Endzeit</span><input class="driver-input" name="end"></label>
          <label><span>Akkustand vorher %</span><input class="driver-input" type="number" name="before" min="0" max="100"></label>
          <label><span>Akkustand nachher %</span><input class="driver-input" type="number" name="after" min="0" max="100"></label>
          <label><span>Geladene kWh</span><input class="driver-input" type="number" step="0.1" name="kwh"></label>
          <label><span>Kosten</span><input class="driver-input" type="number" step="0.01" name="cost"></label>
          <label><span>Reichweite danach</span><input class="driver-input" name="range"></label>
          <label><span>Beleg-Demo</span><input class="driver-input" type="file" name="receipt"></label>
          <label class="full"><span>Status</span><select class="driver-select" name="status"><option>lädt</option><option>Ladevorgang beendet</option><option>Ladeproblem</option></select></label>
        </form>
      `,
        '<button class="driver-btn primary" type="button" data-charge-save>Ladevorgang speichern</button>'
      );
      return;
    }

    openModal(
      "Tankvorgang",
      `
      <form class="driver-form-grid" data-fuel-form>
        <label><span>Fahrzeug</span><input class="driver-input" name="vehicle" value="${driver.currentVehicleId || ""}" required></label>
        <label><span>Datum</span><input class="driver-input" name="date" value="${todayISO()}" required></label>
        <label><span>Uhrzeit</span><input class="driver-input" name="time" value="${nowTime()}" required></label>
        <label><span>Kilometerstand</span><input class="driver-input" type="number" name="km" required></label>
        <label><span>Kraftstoffart</span><input class="driver-input" name="fuelType" required></label>
        <label><span>Liter</span><input class="driver-input" type="number" step="0.1" name="liters" required></label>
        <label><span>Preis pro Liter</span><input class="driver-input" type="number" step="0.01" name="pricePerLiter" required></label>
        <label><span>Gesamtbetrag</span><input class="driver-input" type="number" step="0.01" name="total" required></label>
        <label><span>Tankstelle</span><input class="driver-input" name="station" required></label>
        <label><span>Zahlungsart</span><select class="driver-select" name="paymentType"><option>Bar</option><option>Karte</option><option>Tankkarte</option></select></label>
        <label><span>Beleg-Demo</span><input class="driver-input" type="file" name="receipt"></label>
        <label class="full"><span>Vollgetankt</span><select class="driver-select" name="full"><option>Ja</option><option>Nein</option></select></label>
      </form>
    `,
      '<button class="driver-btn primary" type="button" data-fuel-save>Tankung speichern</button>'
    );
  }

  function openCashCloseForm() {
    const driver = getCurrentDriver();
    if (!driver) return;
    openModal(
      "Bargeldverwaltung / Schichtabschluss",
      `
      <form class="driver-form-grid" data-cash-close-form>
        <label><span>Startbestand</span><input class="driver-input" type="number" step="0.01" name="start" value="100"></label>
        <label><span>Bareinnahmen</span><input class="driver-input" type="number" step="0.01" name="cashIn" required></label>
        <label><span>Trinkgeld</span><input class="driver-input" type="number" step="0.01" name="tip" required></label>
        <label><span>Ausgaben</span><input class="driver-input" type="number" step="0.01" name="expenses" required></label>
        <label><span>Tankkosten</span><input class="driver-input" type="number" step="0.01" name="fuelCost" required></label>
        <label><span>Erwarteter Endbestand</span><input class="driver-input" type="number" step="0.01" name="expected" required></label>
        <label><span>Gezählter Barbestand</span><input class="driver-input" type="number" step="0.01" name="counted" required></label>
        <label><span>Differenz-Kommentar</span><input class="driver-input" name="comment"></label>
      </form>
    `,
      '<button class="driver-btn primary" type="button" data-cash-save>Barabschluss speichern</button>'
    );
  }

  function openShiftEndWizard() {
    const driver = getCurrentDriver();
    if (!driver) return;

    openModal(
      "Schicht beenden - Ablauf",
      `
      <div class="driver-list">
        <article class="driver-item"><strong>Schritt 1</strong><p>Offene Aufträge prüfen</p></article>
        <article class="driver-item"><strong>Schritt 2</strong><p>Kilometerstand eintragen</p></article>
        <article class="driver-item"><strong>Schritt 3</strong><p>Tank- oder Akkustand eintragen</p></article>
        <article class="driver-item"><strong>Schritt 4</strong><p>Fahrzeugzustand prüfen</p></article>
        <article class="driver-item"><strong>Schritt 5</strong><p>Neue Schäden melden</p></article>
        <article class="driver-item"><strong>Schritt 6</strong><p>Fundsachen melden</p></article>
        <article class="driver-item"><strong>Schritt 7</strong><p>Bargeld zählen</p></article>
        <article class="driver-item"><strong>Schritt 8</strong><p>Schichtzusammenfassung prüfen</p></article>
        <article class="driver-item"><strong>Schritt 9</strong><p>Fahrzeug abgeben</p></article>
        <article class="driver-item"><strong>Schritt 10</strong><p>Digitale Bestätigung</p></article>
      </div>
      <form class="driver-form-grid" data-shift-end-form>
        <label><span>Kilometerstand</span><input class="driver-input" name="km" type="number" required></label>
        <label><span>Tank/Akku %</span><input class="driver-input" name="fuel" type="number" required></label>
        <label><span>Fahrzeug sauber</span><select class="driver-select" name="clean"><option>Ja</option><option>Nein</option></select></label>
        <label><span>Tankstand ausreichend</span><select class="driver-select" name="fuelOk"><option>Ja</option><option>Nein</option></select></label>
        <label><span>Akkustand ausreichend</span><select class="driver-select" name="batteryOk"><option>Ja</option><option>Nein</option></select></label>
        <label><span>Keine neuen Schäden</span><select class="driver-select" name="noDamage"><option>Ja</option><option>Nein</option></select></label>
        <label><span>Technik vollständig</span><select class="driver-select" name="techOk"><option>Ja</option><option>Nein</option></select></label>
        <label><span>Kartenlesegerät vorhanden</span><select class="driver-select" name="cardReader"><option>Ja</option><option>Nein</option></select></label>
        <label><span>Tablet vorhanden</span><select class="driver-select" name="tablet"><option>Ja</option><option>Nein</option></select></label>
        <label><span>Schlüssel abgegeben</span><select class="driver-select" name="keys"><option>Ja</option><option>Nein</option></select></label>
        <label><span>Dokumente vorhanden</span><select class="driver-select" name="docs"><option>Ja</option><option>Nein</option></select></label>
        <label><span>Fundsachen abgegeben</span><select class="driver-select" name="lost"><option>Ja</option><option>Nein</option></select></label>
        <label><span>Tankkarte vorhanden</span><select class="driver-select" name="tankCard"><option>Ja</option><option>Nein</option></select></label>
        <label><span>Ladekabel vorhanden</span><select class="driver-select" name="cable"><option>Ja</option><option>Nein</option></select></label>
        <label><span>Rollstuhlausrüstung vollständig</span><select class="driver-select" name="wheelEq"><option>Ja</option><option>Nein</option></select></label>
        <label class="full"><span>Kommentar bei Abweichung</span><textarea class="driver-textarea" name="comment"></textarea></label>
        <label class="full"><span>Digitale Bestätigung (Name)</span><input class="driver-input" name="signature" required></label>
      </form>
    `,
      '<button class="driver-btn danger" type="button" data-shift-end-confirm>Schicht beenden</button>'
    );
  }

  function openHandoverForm() {
    const driver = getCurrentDriver();
    if (!driver) return;

    openModal(
      "Digitale Schichtübergabe",
      `
      <form class="driver-form-grid" data-handover-form>
        <label><span>Nächster Fahrer</span><select class="driver-select" name="nextDriver">${state.data.drivers.filter((d) => d.id !== driver.id).map((d) => `<option value="${d.id}">${d.name}</option>`).join("")}</select></label>
        <label><span>Fahrzeug</span><input class="driver-input" name="vehicle" value="${driver.currentVehicleId || ""}" required></label>
        <label><span>Hinweis</span><select class="driver-select" name="hint"><option>Tank fast leer</option><option>Fahrzeug muss geladen werden</option><option>Reinigung erforderlich</option><option>Warnleuchte aktiv</option><option>leichter Schaden vorhanden</option><option>Kartenlesegerät prüfen</option><option>Kindersitz fehlt</option><option>nächste Werkstattfahrt beachten</option></select></label>
        <label><span>Fahrzeugstatus</span><select class="driver-select" name="vehicleStatus"><option>Frei</option><option>Pause</option><option>Werkstatt</option><option>Gesperrt</option></select></label>
        <label class="full"><span>Offene Hinweise</span><textarea class="driver-textarea" name="openNotes"></textarea></label>
      </form>
    `,
      '<button class="driver-btn primary" type="button" data-handover-save>Übergabe speichern</button>'
    );
  }

  function openNoShowFlow(order) {
    openModal(
      `Fehlfahrt ${order.id}`,
      `
      <form class="driver-form-grid" data-noshow-form>
        <label><span>Grund</span><select class="driver-select" name="reason"><option>Kunde nicht erschienen</option><option>Kunde nicht erreichbar</option><option>falsche Adresse</option><option>Fahrt storniert</option><option>Patient nicht transportfähig</option><option>Einrichtung geschlossen</option><option>Fahrt bereits durchgeführt</option><option>sonstiger Grund</option></select></label>
        <label><span>Wartezeit</span><select class="driver-select" name="wait"><option>0-5 Minuten</option><option>5-10 Minuten</option><option>10-15 Minuten</option><option>über 15 Minuten</option></select></label>
        <label><span>Anrufversuche</span><input class="driver-input" name="calls" type="number" min="0" value="1"></label>
        <label><span>Demo-Nachweis</span><input class="driver-input" type="file" name="proof"></label>
        <label><span>Zentrale informiert</span><select class="driver-select" name="informed"><option>Ja</option><option>Nein</option></select></label>
        <label class="full"><span>Kommentar</span><textarea class="driver-textarea" name="comment"></textarea></label>
      </form>
    `,
      `<button class="driver-btn warning" type="button" data-noshow-save="${order.id}">Fehlfahrt speichern</button>`
    );
  }

  function openOrderDetails(order) {
    openModal(
      `Auftragsdetails ${order.id}`,
      `
      <div class="driver-list">
        <article class="driver-item"><strong>${order.customer.name}</strong><p>${order.customer.phone}</p><p>${order.customer.pickup} → ${order.customer.destination}</p></article>
        <article class="driver-item"><strong>Kundeninformationen</strong><p>Klingel ${order.customer.bell}, Eingang ${order.customer.entrance}, Etage ${order.customer.floor}</p><p>Ansprechpartner ${order.customer.contact}</p><p>Mobilität ${order.customer.mobility}, Rollstuhl ${order.customer.wheelchair}, Rollator ${order.customer.rollator}, Begleitperson ${order.customer.companion}</p><p>Wichtige Hinweise: ${order.customer.notes}</p><p>Interner Hinweis: ${order.customer.internal}</p></article>
      </div>
    `
    );
  }

  function handleOrderStatusStep(order) {
    if (order.statusIndex >= ORDER_FLOW.length - 1) return;
    order.statusIndex += 1;
    order.statusText = ORDER_FLOW[order.statusIndex];
    order.timeline.push({ status: order.statusText, time: nowTime() });

    const driver = getCurrentDriver();
    if (driver) {
      if (order.statusText === "Fahrt zum Kunden gestartet") updateDriverStatus(driver, "toCustomer");
      if (order.statusText === "Am Abholort angekommen") updateDriverStatus(driver, "atCustomer");
      if (order.statusText === "Fahrgast eingestiegen") updateDriverStatus(driver, "boarded");
      if (order.statusText === "Fahrt gestartet") updateDriverStatus(driver, "running");
      if (order.statusText === "Auftrag abschließen") {
        updateDriverStatus(driver, "ready");
        driver.ridesDone += 1;
        driver.activeOrderId = "";
      }
    }

    pushEvent("Auftragsstatus", `${order.id}: ${order.statusText}`, driver ? driver.id : "", { orderId: order.id });
    syncToLiveDispo({ kind: "orderUpdate", order });
    saveData();
    renderAll();
  }

  function assignVehicleToDriver(vehicleId) {
    const driver = getCurrentDriver();
    if (!driver) return;
    driver.currentVehicleId = vehicleId;
    pushEvent("Fahrzeug", `${driver.name} hat Fahrzeug ${vehicleId} übernommen.`, driver.id, { vehicleId });
    saveData();
    syncToLiveDispo({ kind: "driverStatus", driver });
    renderAll();
  }

  function bindUI() {
    document.addEventListener("click", (event) => {
      const select = event.target.closest("[data-driver-select]");
      if (select) {
        state.currentDriverId = select.getAttribute("data-driver-select") || "";
        state.data.selectedDriverId = state.currentDriverId;
        saveData();
        showScreen("dashboard");
        setActiveTab("start");
        renderAll();
        return;
      }

      if (event.target.closest("[data-driver-modal-close]")) {
        closeModal();
        return;
      }

      const tab = event.target.closest("[data-driver-tab]");
      if (tab) {
        setActiveTab(tab.getAttribute("data-driver-tab") || "start");
        return;
      }

      const action = event.target.closest("[data-driver-action]");
      if (action) {
        const name = action.getAttribute("data-driver-action");
        const driver = getCurrentDriver();
        if (!name) return;

        if (name === "switch") {
          showScreen("login");
          state.currentDriverId = "";
          return;
        }
        if (name === "reset") return resetData();
        if (!driver) return;

        if (name === "startShift") return openShiftWizard();
        if (name === "takeVehicle") {
          const id = driver.currentVehicleId || driver.defaultVehicleId;
          if (id) assignVehicleToDriver(id);
          return;
        }
        if (name === "vehicleCheck") return openVehicleChecklist();
        if (name === "damage") return openDamageForm();
        if (name === "pause") return openPauseForm();
        if (name === "problem") return openProblemForm(false);
        if (name === "accident") return openProblemForm(true);
        if (name === "fund") return openFoundItemForm();
        if (name === "statement") return openStatementForm();
        if (name === "qualityTasks") return openQualityTasks();
        if (name === "confirmInspection") return openInspectionConfirm();
        if (name === "answerQuestion") return openQuestionAnswer();
        if (name === "qualityHints") return openQualityHints();
        if (name === "payment") return openPaymentForm();
        if (name === "fuel") return openFuelForm(false, false);
        if (name === "charge") return openFuelForm(true, false);
        if (name === "cleaning") return openFuelForm(false, true);
        if (name === "cash") return openCashCloseForm();
        if (name === "endShift") return openShiftEndWizard();
        if (name === "handover") return openHandoverForm();
        if (name === "openOrder") {
          const order = getActiveOrder(driver.id) || getNextOrder(driver.id);
          if (order) openOrderDetails(order);
          return;
        }
        if (name === "contactCenter") {
          pushEvent("Kontakt", `${driver.name} bittet um Rückruf der Zentrale.`, driver.id);
          saveData();
          renderAll();
          return;
        }
      }

      const pickVehicle = event.target.closest("[data-shift-vehicle-pick]");
      if (pickVehicle) {
        assignVehicleToDriver(pickVehicle.getAttribute("data-shift-vehicle-pick") || "");
      }

      const startConfirm = event.target.closest("[data-shift-start-confirm]");
      if (startConfirm) {
        const driver = getCurrentDriver();
        const form = document.querySelector("[data-shift-start-form]");
        if (!driver || !form) return;
        const values = Object.fromEntries(new FormData(form).entries());
        if (values.licenseValid !== "Ja" || values.permitValid !== "Ja" || values.fitForWork !== "Ja") {
          openModal("Schichtstart blockiert", '<p class="driver-warning-box">Schicht kann nicht gestartet werden, bitte Nachweise prüfen.</p>');
          return;
        }
        driver.shiftStart = nowIso();
        driver.shiftEnd = "";
        updateDriverStatus(driver, "ready");
        pushEvent("Schicht", `${driver.name} hat die Schicht gestartet.`, driver.id);
        closeModal();
        saveData();
        renderAll();
      }

      const checklistSave = event.target.closest("[data-checklist-save]");
      if (checklistSave) {
        const driver = getCurrentDriver();
        if (!driver) return;
        const statuses = Array.from(document.querySelectorAll("[data-check-item]")).map((n) => n.value || "in Ordnung");
        const form = document.querySelector("[data-check-extra-form]");
        const extra = form ? Object.fromEntries(new FormData(form).entries()) : {};
        const hasCritical = statuses.some((s) => s === "nicht fahrbereit") || extra.priority === "kritisch";

        const row = {
          id: `CHK-${Date.now()}`,
          driverId: driver.id,
          vehicleId: driver.currentVehicleId || driver.defaultVehicleId,
          at: nowIso(),
          overall: hasCritical ? "nicht fahrbereit" : statuses.includes("Mangel") ? "Mangel" : statuses.includes("leichte Auffälligkeit") ? "leichte Auffälligkeit" : "in Ordnung",
          checklist: statuses,
          description: extra.description || "",
          category: extra.category || "",
          priority: extra.priority || "niedrig",
          usable: extra.usable || "Ja"
        };

        state.data.vehicleChecks.unshift(row);
        if (hasCritical) {
          state.data.pendingWorkshop.unshift({ id: `WS-${Date.now()}`, source: "check", ...row });
          pushEvent("Fahrzeugcheck", `Kritischer Mangel bei ${row.vehicleId}.`, driver.id, { vehicleId: row.vehicleId });
          updateDriverStatus(driver, "unavailable");
        } else {
          pushEvent("Fahrzeugcheck", `Checkliste für ${row.vehicleId} gespeichert.`, driver.id, { vehicleId: row.vehicleId });
        }
        saveData();
        syncToLiveDispo({ kind: "driverStatus", driver });
        closeModal();
        renderAll();
      }

      const zone = event.target.closest("[data-damage-zone]");
      if (zone) {
        document.querySelectorAll("[data-damage-zone]").forEach((z) => z.classList.remove("is-active"));
        zone.classList.add("is-active");
      }

      const damageSave = event.target.closest("[data-damage-save]");
      if (damageSave) {
        const driver = getCurrentDriver();
        const form = document.querySelector("[data-damage-form]");
        if (!driver || !form) return;
        const values = Object.fromEntries(new FormData(form).entries());
        const zoneBtn = document.querySelector("[data-damage-zone].is-active");
        const zone = zoneBtn ? zoneBtn.getAttribute("data-damage-zone") : "nicht angegeben";
        if (!values.description) return;

        const damage = {
          id: `DMG-${Date.now()}`,
          driverId: driver.id,
          vehicleId: driver.currentVehicleId || driver.defaultVehicleId,
          zone,
          damageType: values.damageType,
          description: values.description,
          at: nowIso(),
          existing: values.existing,
          drivable: values.drivable,
          priority: values.priority,
          comment: values.comment || "",
          status: "neu"
        };

        state.data.damages.unshift(damage);
        if (values.priority === "kritisch") {
          state.data.pendingWorkshop.unshift({ id: `WS-${Date.now()}-d`, source: "damage", ...damage, workshopRequired: true });
          pushEvent("Schaden", `Kritischer Schaden ${damage.damageType} an ${damage.vehicleId}.`, driver.id, { vehicleId: damage.vehicleId });
          syncToLiveDispo({ kind: "damage", damage });
        } else {
          pushEvent("Schaden", `Neuer Schaden an ${damage.vehicleId}: ${damage.damageType}.`, driver.id, { vehicleId: damage.vehicleId });
        }
        saveData();
        closeModal();
        renderAll();
        return;
      }

      const pauseToggle = event.target.closest("[data-pause-toggle]");
      if (pauseToggle) {
        const driver = getCurrentDriver();
        const mode = pauseToggle.getAttribute("data-pause-toggle");
        if (!driver) return;
        if (mode === "start") {
          driver.currentBreakStart = nowIso();
          updateDriverStatus(driver, "pause");
          pushEvent("Pause", `${driver.name} hat eine Pause gestartet.`, driver.id);
        } else {
          const start = driver.currentBreakStart ? new Date(driver.currentBreakStart).getTime() : Date.now();
          const diff = Math.max(0, Math.floor((Date.now() - start) / 60000));
          driver.breakTotalMin += diff;
          driver.currentBreakStart = "";
          updateDriverStatus(driver, "ready");
          pushEvent("Pause", `${driver.name} hat Pause beendet (${diff} Min).`, driver.id);
        }
        saveData();
        closeModal();
        renderAll();
        return;
      }

      const problemSave = event.target.closest("[data-problem-save]");
      if (problemSave) {
        const driver = getCurrentDriver();
        const mode = problemSave.getAttribute("data-problem-save");
        if (!driver) return;

        if (mode === "problem") {
          const form = document.querySelector("[data-problem-form]");
          if (!form) return;
          const v = Object.fromEntries(new FormData(form).entries());
          if (!v.description) return;
          const row = { id: `PR-${Date.now()}`, driverId: driver.id, category: v.category, priority: v.priority, description: v.description, location: v.location, order: v.order, vehicle: v.vehicle, customer: v.customer, callback: v.callback, at: nowIso() };
          state.data.problems.unshift(row);
          pushEvent("Problem", `${v.category}: ${v.description}`, driver.id);
          syncToLiveDispo({ kind: "problem", problem: row });
          if (Q) {
            Q.addIncident(Q.loadState(), {
              date: todayISO(),
              time: nowTime(),
              reporter: driver.name,
              category: v.category || "sonstiger Vorfall",
              priority: v.priority === "Notfall" ? "kritisch" : v.priority === "dringend" ? "wichtig" : "normal",
              driverId: driver.employeeId,
              driver: driver.name,
              vehicle: driver.currentVehicleId || driver.defaultVehicleId,
              customer: v.customer || "",
              rideId: v.order || "",
              location: v.location || "",
              description: v.description || "",
              immediateAction: "Meldung aus Fahrerportal",
              continueRide: "Ja",
              centerInformed: "Ja",
              policeInformedDemo: "Nein",
              medicInformedDemo: "Nein",
              dueDate: todayISO(),
              owner: "Qualitaetsmanagement",
              status: "neu"
            });
          }
          if (v.priority === "dringend" || v.priority === "Notfall") updateDriverStatus(driver, "unavailable");
        } else {
          const form = document.querySelector("[data-accident-form]");
          if (!form) return;
          const v = Object.fromEntries(new FormData(form).entries());
          if (!v.description || !v.location) return;
          const row = { id: `AC-${Date.now()}`, driverId: driver.id, category: "Unfall", priority: "Notfall", description: v.description, location: v.location, at: nowIso(), ...v };
          state.data.incidents.unshift(row);
          state.data.pendingWorkshop.unshift({ id: `WS-${Date.now()}-acc`, source: "accident", vehicleId: driver.currentVehicleId || driver.defaultVehicleId, priority: "kritisch", description: v.description, status: "neu" });
          updateDriverStatus(driver, "unavailable");
          syncToLiveDispo({ kind: "problem", problem: row });
          if (Q) {
            Q.addAccident(Q.loadState(), {
              date: v.date,
              time: v.time,
              location: v.location,
              driverId: driver.employeeId,
              driver: driver.name,
              vehicle: driver.currentVehicleId || driver.defaultVehicleId,
              rideId: v.order || "",
              passengers: v.passenger,
              accidentType: "sonstiger Unfall",
              opponent: v.opponent,
              opponentPlate: v.opponentPlate,
              witnesses: v.witness,
              policeDemo: v.police,
              ownVehicleDamage: v.description,
              injuriesDemo: v.injured,
              drivable: v.drivable,
              policeCalled: v.police,
              medicCalled: v.medic,
              workshopInformed: "Ja",
              replacementVehicle: "Ja",
              passengersContinued: "Nein",
              description: v.description,
              sketchDemo: "offen",
              photosDemo: "offen",
              driverStatement: "angefordert",
              witnessStatement: "offen",
              status: "neu"
            });
          }
        }

        saveData();
        closeModal();
        renderAll();
        return;
      }

      const paymentSave = event.target.closest("[data-payment-save]");
      if (paymentSave) {
        const driver = getCurrentDriver();
        const form = document.querySelector("[data-payment-form]");
        if (!driver || !form) return;
        const v = Object.fromEntries(new FormData(form).entries());
        if (!v.fare || !v.paymentType) return;
        state.data.payments.unshift({ id: `PAY-${Date.now()}`, driverId: driver.id, at: nowIso(), ...v });
        pushEvent("Zahlung", `${driver.name} hat Zahlung (${v.paymentType}) erfasst.`, driver.id);
        saveData();
        closeModal();
        renderAll();
        return;
      }

      const fuelSave = event.target.closest("[data-fuel-save]");
      if (fuelSave) {
        const driver = getCurrentDriver();
        const form = document.querySelector("[data-fuel-form]");
        if (!driver || !form) return;
        const v = Object.fromEntries(new FormData(form).entries());
        if (!v.vehicle || !v.total) return;
        state.data.fuelLogs.unshift({ id: `FUEL-${Date.now()}`, driverId: driver.id, at: nowIso(), ...v });
        pushEvent("Tankung", `${driver.name} hat Tankung ${v.total} EUR dokumentiert.`, driver.id, { vehicleId: v.vehicle });
        saveData();
        closeModal();
        renderAll();
        return;
      }

      const chargeSave = event.target.closest("[data-charge-save]");
      if (chargeSave) {
        const driver = getCurrentDriver();
        const form = document.querySelector("[data-charge-form]");
        if (!driver || !form) return;
        const v = Object.fromEntries(new FormData(form).entries());
        if (!v.vehicle || !v.station) return;
        state.data.chargeLogs.unshift({ id: `CH-${Date.now()}`, driverId: driver.id, at: nowIso(), ...v });
        pushEvent("Laden", `${driver.name} hat Ladevorgang (${v.status}) erfasst.`, driver.id, { vehicleId: v.vehicle });
        saveData();
        closeModal();
        renderAll();
        return;
      }

      const cleanSave = event.target.closest("[data-clean-save]");
      if (cleanSave) {
        const driver = getCurrentDriver();
        const form = document.querySelector("[data-clean-form]");
        if (!driver || !form) return;
        const v = Object.fromEntries(new FormData(form).entries());
        state.data.cleaningLogs.unshift({ id: `CL-${Date.now()}`, driverId: driver.id, at: nowIso(), ...v });
        pushEvent("Reinigung", `${driver.name} hat Fahrzeugreinigung dokumentiert.`, driver.id, { vehicleId: driver.currentVehicleId || driver.defaultVehicleId });
        if (Q && v.found === "Ja" && String(v.object || "").trim()) {
          Q.addFoundItem(Q.loadState(), {
            object: v.object,
            category: "sonstiger Gegenstand",
            description: v.comment || "Aus Reinigung gemeldet",
            color: "",
            brand: "",
            date: todayISO(),
            time: nowTime(),
            vehicle: driver.currentVehicleId || driver.defaultVehicleId,
            driver: driver.name,
            rideId: v.ride || "",
            place: v.place || "Innenraum",
            customerAssigned: "",
            storage: "Zentrale",
            valueCategory: "normal",
            status: "neu",
            note: "Meldung aus Fahrerportal"
          });
        }
        saveData();
        closeModal();
        renderAll();
        return;
      }

      if (event.target.closest("[data-driver-found-save]")) {
        const driver = getCurrentDriver();
        const form = document.querySelector("[data-found-form]");
        if (!driver || !form || !Q) return;
        const v = Object.fromEntries(new FormData(form).entries());
        if (!v.object) return;
        Q.addFoundItem(Q.loadState(), {
          number: "",
          object: v.object,
          category: v.category,
          description: v.description,
          color: v.color,
          brand: v.brand,
          date: todayISO(),
          time: nowTime(),
          vehicle: driver.currentVehicleId || driver.defaultVehicleId,
          driver: driver.name,
          rideId: v.rideId || "",
          place: v.place || "",
          customerAssigned: "",
          storage: "Zentrale",
          valueCategory: v.valueCategory || "normal",
          status: "in Zentrale",
          note: "Direktmeldung aus Fahrerportal"
        });
        pushEvent("Fund", `${driver.name} hat eine Fundsache gemeldet.`, driver.id);
        closeModal();
        return;
      }

      if (event.target.closest("[data-driver-statement-save]")) {
        const driver = getCurrentDriver();
        const form = document.querySelector("[data-driver-statement-form]");
        if (!driver || !form || !Q) return;
        const v = Object.fromEntries(new FormData(form).entries());
        if (!v.complaintId || !v.text) return;
        Q.addDriverStatement(Q.loadState(), v.complaintId, {
          status: "eingegangen",
          driver: driver.name,
          text: v.text,
          circumstances: v.circumstances,
          witnesses: v.witnesses,
          technical: v.technical,
          comment: v.comment,
          attachment: v.attachment
        });
        pushEvent("Stellungnahme", `${driver.name} hat eine Stellungnahme abgegeben.`, driver.id);
        closeModal();
        return;
      }

      if (event.target.closest("[data-driver-inspection-save]")) {
        const form = document.querySelector("[data-driver-inspection-form]");
        if (!form || !Q) return;
        const v = Object.fromEntries(new FormData(form).entries());
        if (!v.inspectionId) return;
        Q.performInspection(Q.loadState(), v.inspectionId, {
          date: todayISO(),
          result: v.result,
          findings: v.findings || "Bestaetigung aus Fahrerportal",
          dueDate: todayISO(),
          responsible: "Qualitaetsmanagement",
          nextCheck: todayISO()
        });
        closeModal();
        return;
      }

      if (event.target.closest("[data-driver-answer-save]")) {
        const driver = getCurrentDriver();
        const form = document.querySelector("[data-driver-answer-form]");
        if (!driver || !form || !Q) return;
        const v = Object.fromEntries(new FormData(form).entries());
        if (!v.complaintId) return;
        Q.addCommunication(Q.loadState(), v.complaintId, "Rueckfrage Fahrer", String(v.note || "Rueckfrage beantwortet"), driver.name);
        closeModal();
      }

      const cashSave = event.target.closest("[data-cash-save]");
      if (cashSave) {
        const driver = getCurrentDriver();
        const form = document.querySelector("[data-cash-close-form]");
        if (!driver || !form) return;
        const v = Object.fromEntries(new FormData(form).entries());
        const diff = Number(v.counted || 0) - Number(v.expected || 0);
        const status = diff === 0 ? "stimmt" : Math.abs(diff) <= 10 ? "kleine Differenz" : "Klärung erforderlich";
        state.data.cashClosings.unshift({ id: `CASH-${Date.now()}`, driverId: driver.id, at: nowIso(), ...v, diff, status });
        pushEvent("Kasse", `${driver.name} Barabschluss: ${status}.`, driver.id);
        saveData();
        closeModal();
        renderAll();
        return;
      }

      const handoverSave = event.target.closest("[data-handover-save]");
      if (handoverSave) {
        const driver = getCurrentDriver();
        const form = document.querySelector("[data-handover-form]");
        if (!driver || !form) return;
        const v = Object.fromEntries(new FormData(form).entries());
        const nextDriver = state.data.drivers.find((d) => d.id === v.nextDriver);
        state.data.handovers.unshift({ id: `HND-${Date.now()}`, fromDriverId: driver.id, toDriverId: v.nextDriver, fromDriver: driver.name, toDriver: nextDriver ? nextDriver.name : v.nextDriver, vehicleId: v.vehicle, hint: v.hint, openNotes: v.openNotes || "", vehicleStatus: v.vehicleStatus, at: nowIso() });
        pushEvent("Übergabe", `${driver.name} hat Fahrzeug ${v.vehicle} an ${nextDriver ? nextDriver.name : "nächsten Fahrer"} übergeben.`, driver.id, { vehicleId: v.vehicle });
        saveData();
        closeModal();
        renderAll();
        return;
      }

      const shiftEndConfirm = event.target.closest("[data-shift-end-confirm]");
      if (shiftEndConfirm) {
        const driver = getCurrentDriver();
        const form = document.querySelector("[data-shift-end-form]");
        if (!driver || !form) return;
        const v = Object.fromEntries(new FormData(form).entries());
        const needsComment = [v.clean, v.fuelOk, v.batteryOk, v.noDamage, v.techOk, v.cardReader, v.tablet, v.keys, v.docs, v.lost, v.tankCard, v.cable, v.wheelEq].some((x) => x === "Nein");
        if (needsComment && !String(v.comment || "").trim()) {
          openModal("Kommentar erforderlich", '<p class="driver-warning-box">Bei Abweichungen ist ein Kommentar verpflichtend.</p>');
          return;
        }

        driver.shiftEnd = nowIso();
        updateDriverStatus(driver, "finished");
        driver.currentVehicleId = "";
        pushEvent("Schicht", `${driver.name} hat die Schicht beendet.`, driver.id);
        saveData();
        closeModal();
        renderAll();
        return;
      }

      const noshowSave = event.target.closest("[data-noshow-save]");
      if (noshowSave) {
        const orderId = noshowSave.getAttribute("data-noshow-save");
        const form = document.querySelector("[data-noshow-form]");
        const driver = getCurrentDriver();
        if (!orderId || !form || !driver) return;
        const order = state.data.orders.find((o) => o.id === orderId);
        if (!order) return;
        const v = Object.fromEntries(new FormData(form).entries());
        order.statusText = "Fehlfahrt";
        order.statusIndex = ORDER_FLOW.length - 1;
        order.timeline.push({ status: "Fehlfahrt", time: nowTime() });
        driver.noShow += 1;
        driver.activeOrderId = "";
        updateDriverStatus(driver, "ready");
        pushEvent("Fehlfahrt", `${order.id}: ${v.reason}`, driver.id, { orderId: order.id });
        syncToLiveDispo({ kind: "orderUpdate", order });
        saveData();
        closeModal();
        renderAll();
      }

      const orderAction = event.target.closest("[data-order-action]");
      if (orderAction) {
        const id = orderAction.getAttribute("data-order-id") || "";
        const name = orderAction.getAttribute("data-order-action") || "";
        const driver = getCurrentDriver();
        if (!driver) return;
        const order = state.data.orders.find((o) => o.id === id && o.driverId === driver.id);
        if (!order) return;

        if (name === "accept") {
          order.accepted = true;
          order.statusText = ORDER_FLOW[0];
          order.statusIndex = 0;
          order.timeline.push({ status: ORDER_FLOW[0], time: nowTime() });
          driver.activeOrderId = order.id;
          updateDriverStatus(driver, "offer");
          pushEvent("Auftrag", `${driver.name} hat ${order.id} angenommen.`, driver.id, { orderId: order.id });
          syncToLiveDispo({ kind: "orderUpdate", order });
          saveData();
          renderAll();
          return;
        }

        if (name === "decline") {
          openModal(
            `Auftrag ${order.id} ablehnen`,
            `
            <form class="driver-form-grid" data-decline-form>
              <label><span>Grund</span><select class="driver-select" name="reason"><option>zu weit entfernt</option><option>Pause</option><option>Fahrzeug ungeeignet</option><option>Zeitüberschneidung</option><option>technisches Problem</option><option>Schichtende</option><option>sonstiger Grund</option></select></label>
            </form>
          `,
            `<button class="driver-btn warning" type="button" data-decline-save="${order.id}">Ablehnung speichern</button>`
          );
          return;
        }

        if (name === "details") return openOrderDetails(order);
        if (name === "contact") {
          pushEvent("Kontakt", `${driver.name} kontaktiert Zentrale zu ${order.id}.`, driver.id, { orderId: order.id });
          saveData();
          renderAll();
          return;
        }
        if (name === "next") return handleOrderStatusStep(order);
        if (name === "wait") {
          const waitLabel = ["0-5 Minuten", "5-10 Minuten", "10-15 Minuten", "über 15 Minuten"][Math.floor(Math.random() * 4)];
          openModal("Wartezeit", `<p>${waitLabel}</p><div class="driver-item-actions"><button class="driver-btn" type="button">weiter warten</button><button class="driver-btn" type="button">Kunde anrufen</button><button class="driver-btn" type="button">Zentrale kontaktieren</button><button class="driver-btn warning" type="button" data-order-action="noshow" data-order-id="${order.id}">Fehlfahrt melden</button></div>`);
          return;
        }
        if (name === "nav") {
          openModal("Navigation starten", '<p>Demo-Navigation gestartet: zum Kunden, zum Ziel, zur Zentrale, zur Tankstelle, zur Ladestation oder zur Werkstatt.</p>');
          return;
        }
        if (name === "noshow") return openNoShowFlow(order);
        if (name === "contactCustomer") {
          pushEvent("Kontakt", `${driver.name} ruft Kunde ${order.customer.name} an.`, driver.id, { orderId: order.id });
          saveData();
          renderAll();
        }
      }

      const declineSave = event.target.closest("[data-decline-save]");
      if (declineSave) {
        const orderId = declineSave.getAttribute("data-decline-save") || "";
        const form = document.querySelector("[data-decline-form]");
        const driver = getCurrentDriver();
        if (!orderId || !form || !driver) return;
        const order = state.data.orders.find((o) => o.id === orderId && o.driverId === driver.id);
        if (!order) return;
        const v = Object.fromEntries(new FormData(form).entries());
        order.declined = true;
        order.accepted = false;
        order.declineReason = v.reason;
        driver.cancelled += 1;
        pushEvent("Auftragsablehnung", `${driver.name} hat ${order.id} abgelehnt (${v.reason}).`, driver.id, { orderId: order.id });
        saveData();
        closeModal();
        renderAll();
        return;
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeModal();
      }
    });
  }

  function periodicSignals() {
    window.setInterval(() => {
      const driver = getCurrentDriver();
      if (!driver) return;
      renderStatusCards(driver);
      renderStartPane(driver);
    }, 30000);
  }

  function init() {
    bindUI();
    renderDriverSelector();

    if (state.data.selectedDriverId) {
      state.currentDriverId = state.data.selectedDriverId;
      showScreen("dashboard");
      setActiveTab("start");
      renderAll();
    } else {
      showScreen("login");
    }

    periodicSignals();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
