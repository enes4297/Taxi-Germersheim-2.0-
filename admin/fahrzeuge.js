(() => {
  const referenceDate = new Date("2026-07-09T00:00:00");

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
    searchTerm: ""
  };

  function daysUntil(dateValue) {
    const date = new Date(`${dateValue}T00:00:00`);
    const diffMs = date.getTime() - referenceDate.getTime();
    return Math.ceil(diffMs / 86400000);
  }

  function normalizeVehicle(rawVehicle) {
    const nextServiceInDays = daysUntil(rawVehicle.nextService);
    const tuvInDays = daysUntil(rawVehicle.tuvDate);

    return {
      ...rawVehicle,
      category: resolveVehicleCategory(rawVehicle),
      nextServiceInDays,
      tuvInDays,
      isServiceDueSoon: nextServiceInDays >= 0 && nextServiceInDays <= 30,
      isTuvDueSoon: tuvInDays >= 0 && tuvInDays <= 45
    };
  }

  function resolveVehicleCategory(vehicle) {
    const typeText = normalizeText(vehicle.type);
    const hintText = normalizeText(vehicle.hint);

    if (hintText.includes("ersetzt") || hintText.includes("ersatz")) return "Ersatz bald";
    if (typeText.includes("rollstuhl")) return "Rollstuhl";
    if (typeText.includes("grossraum") || typeText.includes("großraum")) return "Großraum";
    if (typeText.includes("elektro")) return "Elektro";
    return "Taxi";
  }

  const vehicles = vehicleSource.map(normalizeVehicle);

  function normalizeText(value) {
    return String(value || "")
      .toLocaleLowerCase("de-DE")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
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
      case "Werkstatt":
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

  function renderStats() {
    const stats = {
      total: vehicles.length,
      available: vehicles.filter((vehicle) => vehicle.status === "Verfügbar").length,
      onRoute: vehicles.filter((vehicle) => vehicle.status === "Unterwegs").length,
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
    driverNode.className = `vehicle-driver-chip ${hasDriver ? "is-active" : "is-idle"}`;
    driverNode.innerHTML = `<span class="vehicle-driver-dot" aria-hidden="true"></span><span>${vehicle.currentDriver}</span>`;
    return driverNode;
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
    tire.className = `vehicle-tire-status ${meta.className}`;
    tire.innerHTML = `<span class="vehicle-tire-dot" aria-hidden="true"></span><span>${meta.label}</span>`;
    return tire;
  }

  function renderCards() {
    const grid = document.querySelector("[data-vehicle-grid]");
    if (!grid) return;

    const filtered = getVisibleVehicles();
    grid.innerHTML = "";

    if (!filtered.length) {
      const empty = document.createElement("article");
      empty.className = "vehicle-empty";
      empty.innerHTML = "<strong>Keine Fahrzeuge im aktuellen Filter.</strong><p>Bitte Filter anpassen.</p>";
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
            <small>${vehicle.type}</small>
            <div class="vehicle-type-slot"></div>
            ${vehicle.hint ? `<p class="vehicle-note">${vehicle.hint}</p>` : ""}
          </div>
          <div class="vehicle-head-status-slot"></div>
        </header>

        <dl class="vehicle-meta-list">
          <div><dt>Kennzeichen</dt><dd>${vehicle.plate}</dd></div>
          <div><dt>Kategorie</dt><dd>${vehicle.category}</dd></div>
          <div><dt>Sitzplätze</dt><dd>${vehicle.seats}</dd></div>
          <div><dt>Aktueller Fahrer</dt><dd class="vehicle-driver-slot"></dd></div>
          <div><dt>Kilometerstand</dt><dd>${formatKm(vehicle.odometerKm)}</dd></div>
          <div><dt>Nächster Service</dt><dd class="vehicle-service-slot">${formatDate(vehicle.nextService)}</dd></div>
          <div><dt>TÜV</dt><dd class="vehicle-tuv-slot">${formatDate(vehicle.tuvDate)}</dd></div>
          <div><dt>Versicherung</dt><dd>${formatDate(vehicle.insuranceUntil)}</dd></div>
          <div><dt>Reifenstatus</dt><dd class="vehicle-tire-slot"></dd></div>
        </dl>

        <div class="vehicle-card-actions">
          <button class="admin-btn vehicle-btn-muted" type="button" data-vehicle-action="details" data-vehicle-id="${vehicle.id}">Details</button>
          <button class="admin-btn vehicle-btn-muted" type="button" data-vehicle-action="assign" data-vehicle-id="${vehicle.id}">Fahrer zuweisen</button>
          <button class="admin-btn vehicle-btn-muted" type="button" data-vehicle-action="service" data-vehicle-id="${vehicle.id}">Service eintragen</button>
          <button class="admin-btn" type="button" data-vehicle-action="status" data-vehicle-id="${vehicle.id}">Status ändern</button>
        </div>
      `;

      const statusSlot = card.querySelector(".vehicle-head-status-slot");
      if (statusSlot) statusSlot.append(createStatusPill(vehicle.status));

      const categorySlot = card.querySelector(".vehicle-type-slot");
      if (categorySlot) categorySlot.append(createCategoryBadge(vehicle.category));

      const driverSlot = card.querySelector(".vehicle-driver-slot");
      if (driverSlot) driverSlot.append(createDriverNode(vehicle));

      const tireSlot = card.querySelector(".vehicle-tire-slot");
      if (tireSlot) tireSlot.append(createTireNode(vehicle.tireStatus));

      const serviceSlot = card.querySelector(".vehicle-service-slot");
      if (serviceSlot) {
        serviceSlot.append(document.createTextNode(" "));
        serviceSlot.append(createCountdownNode("Service", vehicle.nextServiceInDays));
      }

      const tuvSlot = card.querySelector(".vehicle-tuv-slot");
      if (tuvSlot) {
        tuvSlot.append(document.createTextNode(" "));
        tuvSlot.append(createCountdownNode("TÜV", vehicle.tuvInDays));
      }

      grid.append(card);
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
        <td>${vehicle.type}</td>
        <td class="vehicle-table-status"></td>
        <td>${vehicle.currentDriver}</td>
        <td>${formatDate(vehicle.nextService)}</td>
        <td>${formatDate(vehicle.tuvDate)}</td>
        <td>${formatKm(vehicle.odometerKm)}</td>
      `;

      const statusCell = row.querySelector(".vehicle-table-status");
      if (statusCell) statusCell.append(createStatusPill(vehicle.status));
      table.append(row);
    });
  }

  function updateVehicleViews() {
    renderCards();
    renderTable();
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

  function buildDetailsModal(vehicle) {
    const serviceMeta = getCountdownMeta(vehicle.nextServiceInDays);
    const tuvMeta = getCountdownMeta(vehicle.tuvInDays);

    return `
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
        <select id="vehicle-status-select">
          <option>Verfügbar</option>
          <option>Unterwegs</option>
          <option>Pause</option>
          <option>Werkstatt</option>
          <option>Gesperrt</option>
        </select>
      </div>
      <p class="vehicle-modal-note">Demo-Modus: Auswahl wird nicht gespeichert.</p>
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

  function bindCardActions() {
    const grid = document.querySelector("[data-vehicle-grid]");
    if (!grid) return;

    grid.addEventListener("click", (event) => {
      const button = event.target.closest("[data-vehicle-action]");
      if (!button) return;

      const action = button.getAttribute("data-vehicle-action");
      const vehicleId = button.getAttribute("data-vehicle-id");
      const vehicle = getVehicleById(vehicleId);
      if (!vehicle || !action) return;

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

      openModal(`Status ändern: ${vehicle.name}`, buildActionModal(vehicle, "status"));
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

  renderStats();
  syncFilterUi();
  bindFilters();
  bindStatCards();
  bindSearch();
  bindCardActions();
  bindModalClose();
  bindDisabledNavItems();
  updateVehicleViews();
})();
