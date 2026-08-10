(() => {
  const referenceDate = new Date("2026-07-09T00:00:00");
  const mercedesVKlasseImagePath = "images/mercedes-v-klasse.jpg";
  const QUALITY_STORAGE_KEY = "adminV18QualityState";
  const VIEW_STORAGE_KEY = "adminVehicleViewV211";
  const LIVE_DISPO_KEY = "adminLiveDispoV131";

  // Spater kann hier ein API-Array direkt gemappt werden.
  const vehicleSource = [
    {
      id: "V-100",
      name: "Mercedes-Benz E 220 d T-Modell",
      plate: "GER TX 100",
      type: "Taxi / Kombi",
      seats: 4,
      status: "Verfügbar",
      currentDriver: "Max Mustermann",
      odometerKm: 198420,
      nextService: "2026-08-02",
      tuvDate: "2026-09-11",
      insuranceUntil: "2027-02-28",
      tireStatus: "Gut"
    },
    {
      id: "V-200",
      name: "VW Touran",
      plate: "GER TX 200",
      type: "Taxi / Mehrzweckfahrzeug",
      seats: 7,
      status: "Unterwegs",
      hint: "Taxi mit Dachschild",
      currentDriver: "Selin Kara",
      odometerKm: 167310,
      nextService: "2026-07-24",
      tuvDate: "2026-08-15",
      insuranceUntil: "2026-12-31",
      tireStatus: "Mittel"
    },
    {
      id: "V-300",
      name: "VW Touran",
      plate: "GER TX 300",
      type: "Taxi / Mehrzweckfahrzeug",
      seats: 7,
      status: "Verfügbar",
      hint: "Taxi mit Dachschild",
      currentDriver: "Nora Winter",
      odometerKm: 141060,
      nextService: "2026-07-19",
      tuvDate: "2026-08-04",
      insuranceUntil: "2027-01-20",
      tireStatus: "Gut"
    },
    {
      id: "V-400",
      name: "VW Touran",
      plate: "GER TX 400",
      type: "Taxi / Mehrzweckfahrzeug",
      seats: 7,
      status: "Pause",
      hint: "Taxi mit Dachschild",
      currentDriver: "Ali Demir",
      odometerKm: 176880,
      nextService: "2026-08-09",
      tuvDate: "2026-09-30",
      insuranceUntil: "2027-03-31",
      tireStatus: "Mittel"
    },
    {
      id: "V-500",
      name: "Mercedes-Benz B-Klasse",
      plate: "GER TX 500",
      type: "Taxi / Kompakt",
      seats: 4,
      status: "Verfügbar",
      currentDriver: "Sabine Hoffmann",
      odometerKm: 154730,
      nextService: "2026-07-16",
      tuvDate: "2026-08-01",
      insuranceUntil: "2027-04-15",
      tireStatus: "Gut"
    },
    {
      id: "V-600",
      name: "Mercedes-Benz E-Klasse gelb, Baujahr 2020",
      plate: "GER TX 600",
      type: "Taxi / Limousine",
      seats: 4,
      status: "Unterwegs",
      currentDriver: "Michael Braun",
      odometerKm: 221990,
      nextService: "2026-07-21",
      tuvDate: "2026-08-13",
      insuranceUntil: "2026-12-10",
      tireStatus: "Mittel"
    },
    {
      id: "V-700",
      name: "Tesla Model Y",
      plate: "GER TX 700",
      type: "Elektro / Firmenfahrzeug",
      seats: 5,
      status: "Verfügbar",
      currentDriver: "Julia Schneider",
      odometerKm: 90680,
      nextService: "2026-08-28",
      tuvDate: "2027-02-11",
      insuranceUntil: "2027-05-31",
      tireStatus: "Gut"
    },
    {
      id: "V-800",
      name: "Mercedes-Benz V-Klasse",
      plate: "GER TX 800",
      type: "Großraumtaxi",
      seats: 7,
      status: "Verfügbar",
      currentDriver: "Daniel Klein",
      odometerKm: 186540,
      nextService: "2026-07-29",
      tuvDate: "2026-08-26",
      insuranceUntil: "2027-03-01",
      tireStatus: "Gut"
    },
    {
      id: "V-900",
      name: "Mercedes Sprinter",
      plate: "Rollstuhl-Fahrzeug / Sprinter",
      type: "Rollstuhltaxi",
      seats: 6,
      status: "Werkstatt",
      hint: "Fahrzeug wird bald ersetzt",
      currentDriver: "-",
      odometerKm: 312460,
      nextService: "2026-07-12",
      tuvDate: "2026-07-27",
      insuranceUntil: "2026-11-30",
      tireStatus: "Wechsel nötig"
    }
  ];

  const statusClassMap = {
    "Verfügbar": "vehicle-status-available",
    Unterwegs: "vehicle-status-onroute",
    Pause: "vehicle-status-pause",
    Werkstatt: "vehicle-status-workshop",
    Gesperrt: "vehicle-status-locked"
  };

  const state = {
    filter: "Alle",
    searchTerm: "",
    view: "compact"
  };

  let vehicles = [];

  function daysUntil(dateValue) {
    if (!dateValue) return 9999;

    const date = new Date(`${dateValue}T00:00:00`);
    const diffMs = date.getTime() - referenceDate.getTime();
    return Math.ceil(diffMs / 86400000);
  }

  function shiftDate(dateValue, daysShift) {
    const date = new Date(`${dateValue}T00:00:00`);
    if (Number.isNaN(date.getTime())) return dateValue;
    date.setDate(date.getDate() + daysShift);
    return date.toISOString().slice(0, 10);
  }

  function normalizeVehicle(rawVehicle) {
    const nextServiceInDays = daysUntil(rawVehicle.nextService);
    const tuvInDays = daysUntil(rawVehicle.tuvDate);

    return {
      ...rawVehicle,
      category: resolveVehicleCategory(rawVehicle),
      wheelchairSuitable: normalizeText(rawVehicle.type).includes("rollstuhl") || normalizeText(rawVehicle.plate).includes("rollstuhl"),
      imagePath: resolveVehicleImagePath(rawVehicle),
      nextServiceInDays,
      tuvInDays,
      insuranceInDays: daysUntil(rawVehicle.insuranceUntil),
      history: {
        lastService: shiftDate(rawVehicle.nextService, -95),
        lastHu: shiftDate(rawVehicle.tuvDate, -180),
        lastDriverChange: shiftDate(rawVehicle.nextService, -24)
      },
      isServiceDueSoon: nextServiceInDays >= 0 && nextServiceInDays <= 30,
      isTuvDueSoon: tuvInDays >= 0 && tuvInDays <= 45
    };
  }

  function resolveVehicleCategory(vehicle) {
    const typeText = normalizeText(vehicle.type);
    if (typeText.includes("kompakt")) return "Kompakt";
    if (typeText.includes("rollstuhl")) return "Rollstuhl";
    if (typeText.includes("grossraum") || typeText.includes("großraum")) return "Großraum";
    if (typeText.includes("elektro")) return "Elektro";
    return "Taxi";
  }

  function isMercedesVKlasse(vehicle) {
    return vehicle.id === "V-800";
  }

  function resolveVehicleImagePath(vehicle) {
    if (isMercedesVKlasse(vehicle)) return mercedesVKlasseImagePath;
    return "";
  }

  function getVehicleDataService() {
    const service = window.TaxiDataService || window.TaxiData || null;
    return service && typeof service === "object" ? service : null;
  }

  function applyOperationalOverlay() {
    const dispo = (() => {
      try {
        return JSON.parse(localStorage.getItem(LIVE_DISPO_KEY) || "{}");
      } catch {
        return {};
      }
    })();
    const rows = Array.isArray(dispo.vehicles) ? dispo.vehicles : [];
    vehicles.forEach((vehicle) => {
      const live = rows.find((row) => normalizePlate(row.plate || row.name || "") === normalizePlate(vehicle.plate));
      if (!live) return;
      if (live.driverName) vehicle.currentDriver = live.driverName;
      if (live.status && ["Verfügbar", "Unterwegs", "Pause", "Werkstatt", "Gesperrt"].includes(live.status)) {
        vehicle.status = live.status;
      }
    });
  }

  function normalizePlate(value) {
    return normalizeText(String(value || "").replace(/\s+/g, ""));
  }

  function loadQualityState() {
    try {
      const raw = localStorage.getItem(QUALITY_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  }

  function applyQualityOverlays() {
    const quality = loadQualityState();
    if (!quality) return;

    const blockedPlates = new Set();
    const criticalIssuePlates = new Set();

    (Array.isArray(quality.accidents) ? quality.accidents : []).forEach((row) => {
      const p = normalizePlate(row.vehicle || row.plate || "");
      if (!p) return;
      if (!["abgeschlossen", "archiviert"].includes(normalizeText(row.status))) blockedPlates.add(p);
    });

    (Array.isArray(quality.incidents) ? quality.incidents : []).forEach((row) => {
      const p = normalizePlate(row.vehicle || row.plate || "");
      if (!p) return;
      const cat = normalizeText(row.category || "");
      const isVehicleIssue = cat.includes("fahrzeug") || cat.includes("technik") || cat.includes("defekt") || normalizeText(row.description || "").includes("fahrzeug");
      if (isVehicleIssue && !["abgeschlossen", "archiviert"].includes(normalizeText(row.status))) criticalIssuePlates.add(p);
    });

    vehicles.forEach((vehicle) => {
      const plate = normalizePlate(vehicle.plate);
      if (blockedPlates.has(plate)) {
        vehicle.status = "Gesperrt";
        vehicle.hint = vehicle.hint ? `${vehicle.hint} · V18 Unfallpruefung offen` : "V18 Unfallpruefung offen";
      }
      if (criticalIssuePlates.has(plate)) {
        vehicle.tireStatus = "Pruefung offen";
        vehicle.hint = vehicle.hint ? `${vehicle.hint} · V18 Sicherheitsmangel` : "V18 Sicherheitsmangel";
      }
    });
  }

  function normalizeText(value) {
    return String(value || "")
      .toLocaleLowerCase("de-DE")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function seedFallbackVehicles() {
    vehicles = vehicleSource.map(normalizeVehicle);
    applyQualityOverlays();
    applyOperationalOverlay();
    updateVehicleViews();
  }

  async function loadVehiclesFromService() {
    const service = getVehicleDataService();
    const fallback = vehicleSource.map(normalizeVehicle);

    if (!service || typeof service.getVehicles !== "function") {
      vehicles = fallback;
      applyQualityOverlays();
      applyOperationalOverlay();
      updateVehicleViews();
      return;
    }

    const backendMode = typeof service.resolveBackendMode === "function" ? service.resolveBackendMode() : "local";
    if (backendMode !== "supabase") {
      vehicles = fallback;
      applyQualityOverlays();
      applyOperationalOverlay();
      updateVehicleViews();
      return;
    }

    const data = await service.getVehicles();
    const nextVehicles = Array.isArray(data) ? data.map(normalizeVehicle) : fallback;
    vehicles = nextVehicles;
    applyQualityOverlays();
    applyOperationalOverlay();
    updateVehicleViews();
  }

  function formatDate(value) {
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat("de-DE").format(date);
  }

  function formatKm(value) {
    return `${new Intl.NumberFormat("de-DE").format(Number(value || 0))} km`;
  }

  function matchesFilter(vehicle) {
    switch (state.filter) {
      case "Verfügbar":
      case "Unterwegs":
      case "Pause":
      case "Werkstatt":
      case "Gesperrt":
        return vehicle.status === state.filter;
      case "Service fällig":
        return vehicle.isServiceDueSoon;
      case "TÜV fällig":
        return vehicle.isTuvDueSoon;
      default:
        return true;
    }
  }

  function matchesSearch(vehicle) {
    const query = normalizeText(state.searchTerm).trim();
    if (!query) return true;

    const haystack = normalizeText([
      vehicle.name,
      vehicle.plate,
      vehicle.type,
      vehicle.currentDriver,
      vehicle.hint
    ].join(" "));

    return haystack.includes(query);
  }

  function getVisibleVehicles() {
    return vehicles.filter((vehicle) => matchesFilter(vehicle) && matchesSearch(vehicle));
  }

  function syncFilterUi() {
    const filterButtons = document.querySelectorAll("[data-vehicle-filter]");
    filterButtons.forEach((button) => {
      const filterValue = button.getAttribute("data-vehicle-filter") || "Alle";
      button.classList.toggle("is-active", filterValue === state.filter);
    });

    const statCards = document.querySelectorAll("[data-vehicle-stat-filter]");
    statCards.forEach((card) => {
      const filterValue = card.getAttribute("data-vehicle-stat-filter") || "Alle";
      const isActive = filterValue === state.filter;
      card.classList.toggle("is-active", isActive);
      card.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  }

  function setFilter(nextFilter) {
    state.filter = nextFilter || "Alle";
    syncFilterUi();
    updateVehicleViews();
  }

  function loadSavedView() {
    try {
      const raw = localStorage.getItem(VIEW_STORAGE_KEY);
      if (raw === "compact" || raw === "cards" || raw === "table") {
        state.view = raw;
      }
    } catch {
      state.view = "compact";
    }
  }

  function saveView() {
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, state.view);
    } catch {
      // Demo-only: local persistence fallback.
    }
  }

  function syncViewUi() {
    document.querySelectorAll("[data-vehicle-view]").forEach((button) => {
      const view = button.getAttribute("data-vehicle-view") || "compact";
      const isActive = view === state.view;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", isActive ? "true" : "false");
    });
  }

  function applyViewVisibility() {
    const compactList = document.querySelector("[data-vehicle-compact-list]");
    const grid = document.querySelector("[data-vehicle-grid]");
    const tablePanel = document.querySelector("[data-vehicle-table-panel]");

    if (compactList) compactList.hidden = state.view !== "compact";
    if (grid) grid.hidden = state.view !== "cards";
    if (tablePanel) tablePanel.hidden = state.view !== "table";
  }

  function setView(nextView) {
    if (!["compact", "cards", "table"].includes(nextView)) return;
    state.view = nextView;
    saveView();
    syncViewUi();
    applyViewVisibility();
  }

  function getCountdownMeta(days) {
    if (days < 0) {
      return {
        label: `Überfällig seit ${Math.abs(days)} Tagen`,
        className: "is-critical"
      };
    }

    if (days < 7) {
      return {
        label: `Noch ${days} Tage`,
        className: "is-critical"
      };
    }

    if (days < 30) {
      return {
        label: `Noch ${days} Tage`,
        className: "is-warning"
      };
    }

    return {
      label: `Noch ${days} Tage`,
      className: "is-ok"
    };
  }

  function getTireMeta(tireStatus) {
    const normalized = normalizeText(tireStatus);
    if (normalized.includes("gut")) return { className: "is-good", label: tireStatus };
    if (normalized.includes("wechsel")) return { className: "is-critical", label: tireStatus };
    if (normalized.includes("mittel")) return { className: "is-medium", label: tireStatus };
    return { className: "is-medium", label: tireStatus };
  }

  function getVehicleWarnings(vehicle) {
    const warnings = [];
    const tuv = getCountdownMeta(vehicle.tuvInDays);
    const service = getCountdownMeta(vehicle.nextServiceInDays);
    const insurance = getCountdownMeta(vehicle.insuranceInDays);
    if (vehicle.tuvInDays <= 30) warnings.push(`TÜV fällig am ${formatDate(vehicle.tuvDate)}`);
    if (vehicle.nextServiceInDays <= 30) warnings.push(`Service fällig am ${formatDate(vehicle.nextService)}`);
    if (vehicle.insuranceInDays <= 45) warnings.push(`Versicherung prüfen bis ${formatDate(vehicle.insuranceUntil)}`);
    if (normalizeText(vehicle.tireStatus).includes("wechsel") || normalizeText(vehicle.tireStatus).includes("pruf") || normalizeText(vehicle.tireStatus).includes("prüf")) {
      warnings.push("Reifen prüfen");
    }
    if (!warnings.length && (tuv.className === "is-critical" || service.className === "is-critical" || insurance.className === "is-critical")) {
      warnings.push("Frist prüfen");
    }
    return warnings;
  }

  function renderStats() {
    const stats = {
      total: vehicles.length,
      available: vehicles.filter((vehicle) => vehicle.status === "Verfügbar").length,
      onRoute: vehicles.filter((vehicle) => vehicle.status === "Unterwegs").length,
      pause: vehicles.filter((vehicle) => vehicle.status === "Pause").length,
      workshop: vehicles.filter((vehicle) => vehicle.status === "Werkstatt").length,
      tuvDue: vehicles.filter((vehicle) => vehicle.isTuvDueSoon).length,
      serviceDue: vehicles.filter((vehicle) => vehicle.isServiceDueSoon).length
    };

    Object.entries(stats).forEach(([key, value]) => {
      const node = document.querySelector(`[data-vehicle-stat="${key}"]`);
      if (node) node.textContent = String(value);
    });
  }

  function createStatusPill(status) {
    const statusNode = document.createElement("span");
    statusNode.className = `status-pill ${statusClassMap[status] || "vehicle-status-available"}`;
    statusNode.textContent = status;
    return statusNode;
  }

  function createCategoryBadge(category) {
    const badge = document.createElement("span");
    badge.className = "vehicle-type-badge";
    badge.textContent = category;
    return badge;
  }

  function createDriverNode(vehicle) {
    const driverNode = document.createElement("span");
    const hasDriver = vehicle.currentDriver && vehicle.currentDriver !== "-";
    const statusClassMap = {
      "Verfügbar": "is-available",
      Unterwegs: "is-onroute",
      Pause: "is-pause",
      Werkstatt: "is-workshop"
    };
    const statusClass = hasDriver ? statusClassMap[vehicle.status] || "is-idle" : "is-idle";
    driverNode.className = `vehicle-driver-chip ${statusClass}`;
    driverNode.innerHTML = `<span class="vehicle-driver-dot" aria-hidden="true"></span><span>${vehicle.currentDriver}</span>`;
    return driverNode;
  }

  function createMaintenanceNode(vehicle) {
    const box = document.createElement("div");
    box.className = "vehicle-maintenance-box";

    const serviceMeta = getCountdownMeta(vehicle.nextServiceInDays);
    const serviceItem = document.createElement("div");
    serviceItem.className = "vehicle-maintenance-item";
    serviceItem.innerHTML = `
      <span class="vehicle-maintenance-label">✓ Service</span>
      <span class="vehicle-maintenance-date">${formatDate(vehicle.nextService)}</span>
      <span class="vehicle-countdown ${serviceMeta.className}">${serviceMeta.label}</span>
    `;

    const tuvMeta = getCountdownMeta(vehicle.tuvInDays);
    const tuvItem = document.createElement("div");
    tuvItem.className = "vehicle-maintenance-item";
    tuvItem.innerHTML = `
      <span class="vehicle-maintenance-label">✓ TÜV</span>
      <span class="vehicle-maintenance-date">${formatDate(vehicle.tuvDate)}</span>
      <span class="vehicle-countdown ${tuvMeta.className}">${tuvMeta.label}</span>
    `;

    box.append(serviceItem, tuvItem);
    return box;
  }

  function createCountdownNode(prefix, days) {
    const countdown = document.createElement("span");
    const meta = getCountdownMeta(days);
    countdown.className = `vehicle-countdown ${meta.className}`;
    countdown.textContent = `${prefix}: ${meta.label}`;
    return countdown;
  }

  function createTireNode(tireStatus) {
    const tire = document.createElement("span");
    const meta = getTireMeta(tireStatus);
    const emoji = meta.className === "is-good" ? "🟢" : meta.className === "is-medium" ? "🟡" : "🔴";
    tire.className = `vehicle-tire-status ${meta.className}`;
    tire.innerHTML = `<span class="vehicle-tire-dot" aria-hidden="true"></span><span>${emoji} ${meta.label}</span>`;
    return tire;
  }

  function renderCards() {
    const grid = document.querySelector("[data-vehicle-grid]");
    if (!grid) return;

    const filtered = getVisibleVehicles();
    grid.innerHTML = "";

    if (!filtered.length) {
      const empty = document.createElement("article");
      empty.className = "vehicle-empty admin-empty-state";
      empty.innerHTML = "<strong>🚗 Keine Einträge gefunden</strong><p>Keine Einträge gefunden.</p><button class='admin-btn admin-btn-secondary admin-empty-reset' type='button' data-vehicle-reset>Filter zurücksetzen</button>";
      grid.append(empty);
      return;
    }

    filtered.forEach((vehicle) => {
      const card = document.createElement("article");
      card.className = "vehicle-card";

      card.innerHTML = `
        <header class="vehicle-card-head">
          <div class="vehicle-card-head-main">
            <h2>${vehicle.name}</h2>
            <strong class="vehicle-card-plate">${vehicle.plate}</strong>
            <small>${vehicle.type} · ${vehicle.seats} Sitzplätze</small>
            <div class="vehicle-type-slot"></div>
          </div>
          <div class="vehicle-head-status-slot"></div>
        </header>

        <dl class="vehicle-meta-list">
          <div><dt>Aktueller Fahrer</dt><dd class="vehicle-driver-slot"></dd></div>
          <div><dt>Rollstuhlgeeignet</dt><dd>${vehicle.wheelchairSuitable ? "Ja" : "Nein"}</dd></div>
          <div><dt>Kilometerstand</dt><dd>${formatKm(vehicle.odometerKm)}</dd></div>
          <div><dt>Nächster Service</dt><dd>${formatDate(vehicle.nextService)}</dd></div>
          <div><dt>TÜV</dt><dd>${formatDate(vehicle.tuvDate)}</dd></div>
          <div><dt>Versicherung</dt><dd>${formatDate(vehicle.insuranceUntil)}</dd></div>
          <div><dt>Reifenstatus</dt><dd>${vehicle.tireStatus}</dd></div>
        </dl>

        <p class="vehicle-note">${getVehicleWarnings(vehicle).join(" · ") || "Keine aktuellen Warnhinweise"}</p>

        <div class="vehicle-card-actions">
          <button class="admin-btn vehicle-btn-muted" type="button" data-vehicle-action="details" data-vehicle-id="${vehicle.id}">Details</button>
          <button class="admin-btn vehicle-btn-muted" type="button" data-vehicle-action="assign" data-vehicle-id="${vehicle.id}">Fahrer zuweisen</button>
          <button class="admin-btn vehicle-btn-muted" type="button" data-vehicle-action="status" data-vehicle-id="${vehicle.id}">Status ändern</button>
          <button class="admin-btn vehicle-btn-muted" type="button" data-vehicle-action="workshop" data-vehicle-id="${vehicle.id}">Werkstatt</button>
          <button class="admin-btn" type="button" data-vehicle-action="lock" data-vehicle-id="${vehicle.id}">Sperren</button>
        </div>
      `;

      const statusSlot = card.querySelector(".vehicle-head-status-slot");
      if (statusSlot) statusSlot.append(createStatusPill(vehicle.status));

      const categorySlot = card.querySelector(".vehicle-type-slot");
      if (categorySlot) categorySlot.append(createCategoryBadge(vehicle.category));

      const driverSlot = card.querySelector(".vehicle-driver-slot");
      if (driverSlot) driverSlot.append(createDriverNode(vehicle));

      grid.append(card);
    });
  }

  function renderCompact() {
    const list = document.querySelector("[data-vehicle-compact-list]");
    if (!list) return;

    const filtered = getVisibleVehicles();
    list.innerHTML = "";

    if (!filtered.length) {
      list.innerHTML = "<article class='vehicle-empty admin-empty-state'><strong>🚗 Keine Einträge gefunden</strong><p>Bitte Filter oder Suche anpassen.</p><button class='admin-btn admin-btn-secondary admin-empty-reset' type='button' data-vehicle-reset>Filter zurücksetzen</button></article>";
      return;
    }

    const header = document.createElement("article");
    header.className = "vehicle-compact-row vehicle-compact-head";
    header.innerHTML = "<b>Kennzeichen</b><b>Fahrzeug</b><b>Status</b><b>Fahrer</b><b>KM</b><b>Service</b><b>TÜV</b><b>Aktion</b>";
    list.append(header);

    filtered.forEach((vehicle) => {
      const row = document.createElement("article");
      row.className = "vehicle-compact-row";
      row.innerHTML = `
        <span>${vehicle.plate}</span>
        <span>${vehicle.name}</span>
        <span class="vehicle-compact-status"></span>
        <span>${vehicle.currentDriver}</span>
        <span>${formatKm(vehicle.odometerKm)}</span>
        <span>${formatDate(vehicle.nextService)}</span>
        <span>${formatDate(vehicle.tuvDate)}</span>
        <span><button class="admin-btn vehicle-btn-muted vehicle-row-action" type="button" data-vehicle-action="details" data-vehicle-id="${vehicle.id}">Details</button><small class="vehicle-compact-hint">${getVehicleWarnings(vehicle)[0] || ""}</small></span>
      `;

      const statusSlot = row.querySelector(".vehicle-compact-status");
      if (statusSlot) statusSlot.append(createStatusPill(vehicle.status));
      list.append(row);
    });
  }

  function renderTable() {
    const table = document.querySelector("[data-vehicle-table]");
    if (!table) return;

    const filtered = getVisibleVehicles();
    table.innerHTML = "";

    filtered.forEach((vehicle) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${vehicle.name}</td>
        <td>${vehicle.plate}</td>
        <td>${vehicle.type} · ${vehicle.seats} Sitze · ${vehicle.wheelchairSuitable ? "Rollstuhl" : "Standard"}</td>
        <td class="vehicle-table-status"></td>
        <td>${vehicle.currentDriver}</td>
        <td>${formatDate(vehicle.nextService)}</td>
        <td>${formatDate(vehicle.tuvDate)}</td>
        <td>${formatKm(vehicle.odometerKm)}</td>
        <td><button class="admin-btn vehicle-btn-muted vehicle-row-action" type="button" data-vehicle-action="details" data-vehicle-id="${vehicle.id}">Details</button></td>
      `;

      const statusCell = row.querySelector(".vehicle-table-status");
      if (statusCell) statusCell.append(createStatusPill(vehicle.status));
      table.append(row);
    });
  }

  function updateVehicleViews() {
    renderStats();
    renderCompact();
    renderCards();
    renderTable();
    applyViewVisibility();
  }

  function getVehicleById(vehicleId) {
    return vehicles.find((vehicle) => vehicle.id === vehicleId) || null;
  }

  function openModal(title, bodyHtml) {
    const modal = document.querySelector("[data-vehicle-modal]");
    const modalTitle = document.querySelector("[data-vehicle-modal-title]");
    const modalBody = document.querySelector("[data-vehicle-modal-body]");
    if (!modal || !modalTitle || !modalBody) return;

    modalTitle.textContent = title;
    modalBody.innerHTML = bodyHtml;
    modal.hidden = false;
    document.body.classList.add("admin-modal-open");
  }

  function closeModal() {
    const modal = document.querySelector("[data-vehicle-modal]");
    if (!modal) return;

    modal.hidden = true;
    document.body.classList.remove("admin-modal-open");
  }

  function buildVehicleFormHtml(vehicle = null) {
    const isEdit = Boolean(vehicle);
    const nameValue = vehicle?.name || "";
    const plateValue = vehicle?.plate || "";
    const typeValue = vehicle?.type || "";
    const seatsValue = vehicle?.seats || 4;
    const statusValue = vehicle?.status || "Verfügbar";
    const mileageValue = vehicle?.odometerKm || 0;
    const nextServiceValue = vehicle?.nextService || "";
    const tuvValue = vehicle?.tuvDate || "";
    const insuranceValue = vehicle?.insuranceUntil || "";
    const tireValue = vehicle?.tireStatus || "Gut";
    const wheelchairValue = vehicle?.wheelchairSuitable ? "true" : "false";

    return `
      <form class="vehicle-form" data-vehicle-form>
        <input type="hidden" name="vehicleId" value="${vehicle?.id || ""}">
        <label>
          Fahrzeugname
          <input name="name" required value="${nameValue}">
        </label>
        <label>
          Kennzeichen
          <input name="plate" value="${plateValue}">
        </label>
        <label>
          Typ
          <input name="type" value="${typeValue}">
        </label>
        <label>
          Sitzplätze
          <input name="seats" type="number" min="1" value="${seatsValue}">
        </label>
        <label>
          Status
          <select name="status">
            <option ${statusValue === "Verfügbar" ? "selected" : ""}>Verfügbar</option>
            <option ${statusValue === "Unterwegs" ? "selected" : ""}>Unterwegs</option>
            <option ${statusValue === "Pause" ? "selected" : ""}>Pause</option>
            <option ${statusValue === "Werkstatt" ? "selected" : ""}>Werkstatt</option>
            <option ${statusValue === "Gesperrt" ? "selected" : ""}>Gesperrt</option>
          </select>
        </label>
        <label>
          Kilometerstand
          <input name="mileage" type="number" min="0" value="${mileageValue}">
        </label>
        <label>
          Nächster Service
          <input name="nextService" type="date" value="${nextServiceValue}">
        </label>
        <label>
          TÜV bis
          <input name="tuvDate" type="date" value="${tuvValue}">
        </label>
        <label>
          Versicherung bis
          <input name="insuranceUntil" type="date" value="${insuranceValue}">
        </label>
        <label>
          Reifenstatus
          <input name="tireStatus" value="${tireValue}">
        </label>
        <label>
          Rollstuhlgeeignet
          <select name="wheelchairAccessible">
            <option value="true" ${wheelchairValue === "true" ? "selected" : ""}>Ja</option>
            <option value="false" ${wheelchairValue === "false" ? "selected" : ""}>Nein</option>
          </select>
        </label>
        <div class="vehicle-form-actions">
          <button class="admin-btn" type="submit">${isEdit ? "Änderungen speichern" : "Fahrzeug anlegen"}</button>
        </div>
      </form>
    `;
  }

  function buildDetailsModal(vehicle) {
    const serviceMeta = getCountdownMeta(vehicle.nextServiceInDays);
    const tuvMeta = getCountdownMeta(vehicle.tuvInDays);
    const vehicleImageHtml = vehicle.imagePath
      ? `<figure class="vehicle-modal-image-wrap"><img class="vehicle-modal-image" src="${vehicle.imagePath}" alt="${vehicle.name}"></figure>`
      : "";

    return `
      ${vehicleImageHtml}
      <dl class="vehicle-modal-list">
        <div><dt>Fahrzeugname</dt><dd>${vehicle.name}</dd></div>
        <div><dt>Kennzeichen</dt><dd>${vehicle.plate}</dd></div>
        <div><dt>Typ</dt><dd>${vehicle.type}</dd></div>
        <div><dt>Kategorie</dt><dd>${vehicle.category}</dd></div>
        <div><dt>Sitzplätze</dt><dd>${vehicle.seats}</dd></div>
        <div><dt>Status</dt><dd>${vehicle.status}</dd></div>
        <div><dt>Aktueller Fahrer</dt><dd>${vehicle.currentDriver}</dd></div>
        <div><dt>Kilometerstand</dt><dd>${formatKm(vehicle.odometerKm)}</dd></div>
        <div><dt>Nächster Service</dt><dd>${formatDate(vehicle.nextService)} (${serviceMeta.label})</dd></div>
        <div><dt>TÜV</dt><dd>${formatDate(vehicle.tuvDate)} (${tuvMeta.label})</dd></div>
        <div><dt>Versicherung</dt><dd>${formatDate(vehicle.insuranceUntil)}</dd></div>
        <div><dt>Reifenstatus</dt><dd>${vehicle.tireStatus}</dd></div>
        <div><dt>Hinweis</dt><dd>${vehicle.hint || "-"}</dd></div>
      </dl>
      <div class="vehicle-modal-history">
        <strong>Fahrzeughistorie (Demo)</strong>
        <ul>
          <li>Letzter Service: ${formatDate(vehicle.history.lastService)}</li>
          <li>Letzte HU: ${formatDate(vehicle.history.lastHu)}</li>
          <li>Letzter Fahrerwechsel: ${formatDate(vehicle.history.lastDriverChange)}</li>
        </ul>
      </div>
      <div class="vehicle-modal-actions">
        <button class="admin-btn" type="button" data-vehicle-edit-open="${vehicle.id}">Fahrzeug bearbeiten</button>
      </div>
      <p class="vehicle-modal-note">Demo-Daten – später Backend-Anbindung möglich</p>
    `;
  }

  function buildActionModal(vehicle, action) {
    if (action === "assign") {
      return `
        <p class="vehicle-modal-note">Demo: Fahrerzuweisung für ${vehicle.name}. Hier wird später ein Fahrer aus dem Backend ausgewählt.</p>
        <p class="vehicle-modal-note">Demo-Modul ohne Backend.</p>
      `;
    }

    if (action === "service") {
      return `
        <p class="vehicle-modal-note">Demo: Serviceeintrag für ${vehicle.name}. Eingaben werden aktuell nicht gespeichert.</p>
        <p class="vehicle-modal-note">Demo-Modul ohne Backend.</p>
      `;
    }

    return `
      <div class="vehicle-modal-status-box">
        <label for="vehicle-status-select">Neuen Status wählen (Demo)</label>
        <select id="vehicle-status-select" data-vehicle-status-select>
          <option ${vehicle.status === "Verfügbar" ? "selected" : ""}>Verfügbar</option>
          <option ${vehicle.status === "Unterwegs" ? "selected" : ""}>Unterwegs</option>
          <option ${vehicle.status === "Pause" ? "selected" : ""}>Pause</option>
          <option ${vehicle.status === "Werkstatt" ? "selected" : ""}>Werkstatt</option>
          <option ${vehicle.status === "Gesperrt" ? "selected" : ""}>Gesperrt</option>
        </select>
        <button class="admin-btn" type="button" data-vehicle-status-save="${vehicle.id}">Status übernehmen</button>
      </div>
      <p class="vehicle-modal-note">Demo-Modus: Auswahl wird lokal gesetzt.</p>
      <p class="vehicle-modal-note">Demo-Modul ohne Backend.</p>
    `;
  }

  function bindFilters() {
    const filters = document.querySelectorAll("[data-vehicle-filter]");
    filters.forEach((filterButton) => {
      filterButton.addEventListener("click", () => {
        const nextFilter = filterButton.getAttribute("data-vehicle-filter") || "Alle";
        setFilter(nextFilter);
      });
    });
  }

  function bindStatCards() {
    const cards = document.querySelectorAll("[data-vehicle-stat-filter]");
    cards.forEach((card) => {
      const applyCardFilter = () => {
        const nextFilter = card.getAttribute("data-vehicle-stat-filter") || "Alle";
        setFilter(nextFilter);
      };

      card.addEventListener("click", applyCardFilter);
      card.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        applyCardFilter();
      });
    });
  }

  function bindSearch() {
    const searchInput = document.querySelector("[data-vehicle-search]");
    if (!searchInput) return;

    searchInput.addEventListener("input", (event) => {
      state.searchTerm = String(event.target.value || "");
      updateVehicleViews();
    });
  }

  function applyVehicleAction(action, vehicle) {
    if (action === "details") {
      openModal(`Details: ${vehicle.name}`, buildDetailsModal(vehicle));
      return;
    }

    if (action === "assign") {
      openModal(`Fahrer zuweisen: ${vehicle.name}`, buildActionModal(vehicle, "assign"));
      return;
    }

    if (action === "service") {
      openModal(`Service eintragen: ${vehicle.name}`, buildActionModal(vehicle, "service"));
      return;
    }

    if (action === "workshop") {
      vehicle.status = "Werkstatt";
      vehicle.hint = vehicle.hint || "Manuell zur Werkstatt gesetzt.";
      updateVehicleViews();
      return;
    }

    if (action === "lock") {
      vehicle.status = "Gesperrt";
      vehicle.hint = vehicle.hint || "Manuell gesperrt.";
      updateVehicleViews();
      return;
    }

    openModal(`Status ändern: ${vehicle.name}`, buildActionModal(vehicle, "status"));
  }

  async function persistVehicleStatus(vehicleId, nextStatus, hint) {
    const service = getVehicleDataService();
    if (service && typeof service.updateVehicle === "function") {
      const updated = await service.updateVehicle(vehicleId, { status: nextStatus, hint });
      if (updated) {
        const existing = vehicles.find((vehicle) => String(vehicle.id) === String(vehicleId));
        if (existing) {
          Object.assign(existing, normalizeVehicle({ ...existing, ...updated, id: updated.id }));
        } else {
          vehicles.unshift(normalizeVehicle(updated));
        }
        applyQualityOverlays();
        applyOperationalOverlay();
        updateVehicleViews();
        return;
      }
    }

    const vehicle = getVehicleById(vehicleId);
    if (!vehicle) return;
    vehicle.status = nextStatus;
    if (hint) vehicle.hint = hint;
    updateVehicleViews();
  }

  async function submitVehicleForm(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const vehicleId = String(formData.get("vehicleId") || "").trim();
    const payload = {
      name: String(formData.get("name") || "").trim(),
      plate: String(formData.get("plate") || "").trim(),
      type: String(formData.get("type") || "").trim(),
      seats: Number(formData.get("seats") || 0),
      status: String(formData.get("status") || "Verfügbar").trim(),
      odometerKm: Number(formData.get("mileage") || 0),
      nextService: String(formData.get("nextService") || "").trim(),
      tuvDate: String(formData.get("tuvDate") || "").trim(),
      insuranceUntil: String(formData.get("insuranceUntil") || "").trim(),
      tireStatus: String(formData.get("tireStatus") || "Gut").trim(),
      wheelchairAccessible: String(formData.get("wheelchairAccessible") || "false") === "true"
    };

    if (!payload.name) return;

    const service = getVehicleDataService();
    if (service && typeof service.createVehicle === "function") {
      if (vehicleId) {
        if (typeof service.updateVehicle === "function") {
          await service.updateVehicle(vehicleId, payload);
        }
      } else {
        await service.createVehicle(payload);
      }
    }

    closeModal();
    await loadVehiclesFromService();
  }

  function bindVehicleActions() {
    document.addEventListener("click", (event) => {
      const addButton = event.target.closest("[data-vehicle-add]");
      if (addButton) {
        openModal("Fahrzeug hinzufügen", buildVehicleFormHtml());
        const form = document.querySelector("[data-vehicle-form]");
        if (form) {
          form.addEventListener("submit", submitVehicleForm, { once: true });
        }
        return;
      }

      const editOpenButton = event.target.closest("[data-vehicle-edit-open]");
      if (editOpenButton) {
        const vehicleId = editOpenButton.getAttribute("data-vehicle-edit-open") || "";
        const vehicle = getVehicleById(vehicleId);
        if (vehicle) {
          openModal("Fahrzeug bearbeiten", buildVehicleFormHtml(vehicle));
          const form = document.querySelector("[data-vehicle-form]");
          if (form) {
            form.addEventListener("submit", submitVehicleForm, { once: true });
          }
        }
        return;
      }

      const statusSave = event.target.closest("[data-vehicle-status-save]");
      if (statusSave) {
        const vehicleId = statusSave.getAttribute("data-vehicle-status-save") || "";
        const vehicle = getVehicleById(vehicleId);
        const select = document.querySelector("[data-vehicle-status-select]");
        if (!vehicle || !select) return;
        void persistVehicleStatus(vehicleId, String(select.value || "Verfügbar"), vehicle.hint || "");
        closeModal();
        return;
      }

      const resetButton = event.target.closest("[data-vehicle-reset]");
      if (resetButton) {
        state.filter = "Alle";
        state.searchTerm = "";
        const searchInput = document.querySelector("[data-vehicle-search]");
        if (searchInput) searchInput.value = "";
        syncFilterUi();
        updateVehicleViews();
        return;
      }

      const button = event.target.closest("[data-vehicle-action]");
      if (!button) return;
      const action = button.getAttribute("data-vehicle-action") || "";
      const vehicleId = button.getAttribute("data-vehicle-id") || "";
      const vehicle = getVehicleById(vehicleId);
      if (!vehicle || !action) return;
      applyVehicleAction(action, vehicle);
    });
  }

  function bindViewSwitch() {
    document.querySelectorAll("[data-vehicle-view]").forEach((button) => {
      button.addEventListener("click", () => {
        const view = button.getAttribute("data-vehicle-view") || "compact";
        setView(view);
      });
    });
  }

  function bindModalClose() {
    const closeButtons = document.querySelectorAll("[data-vehicle-modal-close]");
    closeButtons.forEach((button) => {
      button.addEventListener("click", closeModal);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      const modal = document.querySelector("[data-vehicle-modal]");
      if (!modal || modal.hidden) return;
      closeModal();
    });
  }

  function bindDisabledNavItems() {
    const disabledItems = document.querySelectorAll(".admin-nav-item[aria-disabled='true']");
    disabledItems.forEach((item) => {
      item.addEventListener("click", (event) => {
        event.preventDefault();
      });
    });
  }

  seedFallbackVehicles();
  loadSavedView();
  syncViewUi();
  syncFilterUi();
  bindFilters();
  bindStatCards();
  bindSearch();
  bindViewSwitch();
  bindVehicleActions();
  bindModalClose();
  bindDisabledNavItems();
  void loadVehiclesFromService();
})();
