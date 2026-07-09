(() => {
  const referenceDate = new Date("2026-07-09T00:00:00");

  // Spater kann hier ein API-Array direkt gemappt werden.
  const vehicleSource = [
    {
      id: "V-101",
      name: "Mercedes V-Klasse",
      plate: "GER TG 101",
      type: "Grossraumtaxi",
      seats: 7,
      status: "Verfügbar",
      currentDriver: "Max Mustermann",
      odometerKm: 182450,
      nextService: "2026-07-18",
      tuvDate: "2026-08-03",
      insuranceUntil: "2027-01-31",
      tireStatus: "Gut"
    },
    {
      id: "V-204",
      name: "VW Caddy",
      plate: "GER TG 204",
      type: "Krankenfahrt",
      seats: 5,
      status: "Unterwegs",
      currentDriver: "Selin Kara",
      odometerKm: 129330,
      nextService: "2026-08-22",
      tuvDate: "2027-03-10",
      insuranceUntil: "2026-12-31",
      tireStatus: "Mittel"
    },
    {
      id: "V-307",
      name: "Mercedes E-Klasse",
      plate: "GER TG 307",
      type: "Business",
      seats: 4,
      status: "Pause",
      currentDriver: "Ali Demir",
      odometerKm: 246120,
      nextService: "2026-07-26",
      tuvDate: "2026-10-21",
      insuranceUntil: "2027-02-14",
      tireStatus: "Gut"
    },
    {
      id: "V-415",
      name: "Mercedes Sprinter",
      plate: "GER TG 415",
      type: "Rollstuhltaxi",
      seats: 6,
      status: "Werkstatt",
      currentDriver: "-",
      odometerKm: 301780,
      nextService: "2026-07-14",
      tuvDate: "2026-07-28",
      insuranceUntil: "2026-11-30",
      tireStatus: "Wechsel noetig"
    },
    {
      id: "V-519",
      name: "Skoda Octavia",
      plate: "GER TG 519",
      type: "Kombi",
      seats: 4,
      status: "Verfügbar",
      currentDriver: "Nora Winter",
      odometerKm: 98700,
      nextService: "2026-09-05",
      tuvDate: "2026-11-19",
      insuranceUntil: "2027-04-08",
      tireStatus: "Gut"
    },
    {
      id: "V-630",
      name: "Ford Transit",
      plate: "GER TG 630",
      type: "Flughafentransfer",
      seats: 8,
      status: "Unterwegs",
      currentDriver: "Michael Braun",
      odometerKm: 212050,
      nextService: "2026-07-20",
      tuvDate: "2026-09-01",
      insuranceUntil: "2027-01-10",
      tireStatus: "Mittel"
    },
    {
      id: "V-744",
      name: "Opel Zafira",
      plate: "GER TG 744",
      type: "Familienfahrt",
      seats: 6,
      status: "Gesperrt",
      currentDriver: "-",
      odometerKm: 278420,
      nextService: "2026-07-30",
      tuvDate: "2026-08-12",
      insuranceUntil: "2026-10-15",
      tireStatus: "Pruefung offen"
    },
    {
      id: "V-808",
      name: "Toyota Prius+",
      plate: "GER TG 808",
      type: "Hybrid",
      seats: 5,
      status: "Verfügbar",
      currentDriver: "Julia Schneider",
      odometerKm: 165090,
      nextService: "2026-07-16",
      tuvDate: "2026-12-09",
      insuranceUntil: "2027-05-31",
      tireStatus: "Gut"
    },
    {
      id: "V-912",
      name: "VW Touran",
      plate: "GER TG 912",
      type: "Schuelerfahrt",
      seats: 5,
      status: "Werkstatt",
      currentDriver: "-",
      odometerKm: 233640,
      nextService: "2026-07-11",
      tuvDate: "2026-07-25",
      insuranceUntil: "2026-12-04",
      tireStatus: "Wechsel noetig"
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
    filter: "Alle"
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
      nextServiceInDays,
      tuvInDays,
      isServiceDueSoon: nextServiceInDays >= 0 && nextServiceInDays <= 30,
      isTuvDueSoon: tuvInDays >= 0 && tuvInDays <= 45
    };
  }

  const vehicles = vehicleSource.map(normalizeVehicle);

  function formatDate(value) {
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat("de-DE").format(date);
  }

  function formatKm(value) {
    return `${new Intl.NumberFormat("de-DE").format(Number(value || 0))} km`;
  }

  function getFilteredVehicles() {
    switch (state.filter) {
      case "Verfügbar":
      case "Unterwegs":
      case "Werkstatt":
        return vehicles.filter((vehicle) => vehicle.status === state.filter);
      case "Service fällig":
        return vehicles.filter((vehicle) => vehicle.isServiceDueSoon);
      case "TÜV fällig":
        return vehicles.filter((vehicle) => vehicle.isTuvDueSoon);
      default:
        return vehicles;
    }
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

  function createDueBadge(label, isDueSoon) {
    const badge = document.createElement("span");
    badge.className = `vehicle-due-badge ${isDueSoon ? "is-due" : "is-ok"}`;
    badge.textContent = label;
    return badge;
  }

  function renderCards() {
    const grid = document.querySelector("[data-vehicle-grid]");
    if (!grid) return;

    const filtered = getFilteredVehicles();
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
          <div>
            <h2>${vehicle.name}</h2>
            <small>${vehicle.type} • ${vehicle.seats} Sitzplätze</small>
          </div>
        </header>

        <dl class="vehicle-meta-list">
          <div><dt>Kennzeichen</dt><dd>${vehicle.plate}</dd></div>
          <div><dt>Status</dt><dd class="vehicle-status-slot"></dd></div>
          <div><dt>Aktueller Fahrer</dt><dd>${vehicle.currentDriver}</dd></div>
          <div><dt>Kilometerstand</dt><dd>${formatKm(vehicle.odometerKm)}</dd></div>
          <div><dt>Nächster Service</dt><dd>${formatDate(vehicle.nextService)}</dd></div>
          <div><dt>TÜV</dt><dd>${formatDate(vehicle.tuvDate)}</dd></div>
          <div><dt>Versicherung</dt><dd>${formatDate(vehicle.insuranceUntil)}</dd></div>
          <div><dt>Reifenstatus</dt><dd>${vehicle.tireStatus}</dd></div>
        </dl>

        <div class="vehicle-due-row"></div>

        <div class="vehicle-card-actions">
          <button class="admin-btn vehicle-btn-muted" type="button">Details</button>
          <button class="admin-btn vehicle-btn-muted" type="button">Fahrer zuweisen</button>
          <button class="admin-btn vehicle-btn-muted" type="button">Service eintragen</button>
          <button class="admin-btn" type="button">Status ändern</button>
        </div>
      `;

      const statusSlot = card.querySelector(".vehicle-status-slot");
      if (statusSlot) statusSlot.append(createStatusPill(vehicle.status));

      const dueRow = card.querySelector(".vehicle-due-row");
      if (dueRow) {
        dueRow.append(createDueBadge("Service", vehicle.isServiceDueSoon));
        dueRow.append(createDueBadge("TÜV", vehicle.isTuvDueSoon));
      }

      grid.append(card);
    });
  }

  function renderTable() {
    const table = document.querySelector("[data-vehicle-table]");
    if (!table) return;

    const filtered = getFilteredVehicles();
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

  function bindFilters() {
    const filters = document.querySelectorAll("[data-vehicle-filter]");
    filters.forEach((filterButton) => {
      filterButton.addEventListener("click", () => {
        state.filter = filterButton.getAttribute("data-vehicle-filter") || "Alle";
        filters.forEach((button) => button.classList.remove("is-active"));
        filterButton.classList.add("is-active");
        updateVehicleViews();
      });
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
  bindFilters();
  bindDisabledNavItems();
  updateVehicleViews();
})();
