(() => {
  const referenceDate = new Date("2026-07-09T00:00:00");

  const drivers = [
    {
      id: "D-100",
      name: "Max Mustermann",
      role: "Senior Fahrer",
      status: "Aktiv",
      vehicle: "GER TX 100 - Mercedes-Benz E 220 d",
      phone: "0171 555 0101",
      shift: "06:00 - 14:00",
      ridesToday: 7,
      revenueToday: 286,
      rating: 4.9,
      licenseValidUntil: "2027-02-28",
      permitValidUntil: "2026-08-03"
    },
    {
      id: "D-200",
      name: "Selin Kara",
      role: "Fahrerin",
      status: "Unterwegs",
      vehicle: "GER TX 200 - VW Touran",
      phone: "0171 555 0204",
      shift: "07:00 - 15:00",
      ridesToday: 5,
      revenueToday: 214,
      rating: 4.7,
      licenseValidUntil: "2026-11-17",
      permitValidUntil: "2026-07-26"
    },
    {
      id: "D-300",
      name: "Ali Demir",
      role: "Fahrer",
      status: "Pause",
      vehicle: "GER TX 400 - VW Touran",
      phone: "0171 555 0307",
      shift: "08:00 - 16:00",
      ridesToday: 3,
      revenueToday: 119,
      rating: 4.6,
      licenseValidUntil: "2026-10-02",
      permitValidUntil: "2026-09-11"
    },
    {
      id: "D-400",
      name: "Julia Schneider",
      role: "Fahrerin",
      status: "Offline",
      vehicle: "GER TX 700 - Tesla Model Y",
      phone: "0171 555 0112",
      shift: "Spätschicht 16:00 - 00:00",
      ridesToday: 0,
      revenueToday: 0,
      rating: 4.8,
      licenseValidUntil: "2028-01-30",
      permitValidUntil: "2027-02-15"
    },
    {
      id: "D-500",
      name: "Daniel Klein",
      role: "Großraum Spezialist",
      status: "Unterwegs",
      vehicle: "GER TX 800 - Mercedes-Benz V-Klasse",
      phone: "0171 555 0415",
      shift: "09:00 - 17:00",
      ridesToday: 6,
      revenueToday: 301,
      rating: 4.9,
      licenseValidUntil: "2027-04-12",
      permitValidUntil: "2026-08-18"
    },
    {
      id: "D-600",
      name: "Sabine Hoffmann",
      role: "Leitstelle Backup",
      status: "Aktiv",
      vehicle: "GER TX 500 - Mercedes-Benz B-Klasse",
      phone: "0171 555 0223",
      shift: "06:30 - 14:30",
      ridesToday: 8,
      revenueToday: 334,
      rating: 4.8,
      licenseValidUntil: "2027-06-01",
      permitValidUntil: "2026-12-30"
    },
    {
      id: "D-700",
      name: "Nora Winter",
      role: "Fahrerin",
      status: "Krank",
      vehicle: "-",
      phone: "0171 555 0519",
      shift: "Heute abwesend",
      ridesToday: 0,
      revenueToday: 0,
      rating: 4.5,
      licenseValidUntil: "2026-08-01",
      permitValidUntil: "2026-07-16"
    },
    {
      id: "D-800",
      name: "Michael Braun",
      role: "Fahrer",
      status: "Aktiv",
      vehicle: "GER TX 600 - Mercedes-Benz E-Klasse",
      phone: "0171 555 0630",
      shift: "10:00 - 18:00",
      ridesToday: 4,
      revenueToday: 162,
      rating: 4.6,
      licenseValidUntil: "2027-01-12",
      permitValidUntil: "2026-08-24"
    },
    {
      id: "D-900",
      name: "Mia Koch",
      role: "Junior Fahrerin",
      status: "Urlaub",
      vehicle: "-",
      phone: "0171 555 0744",
      shift: "Urlaub bis 20.07",
      ridesToday: 0,
      revenueToday: 0,
      rating: 4.4,
      licenseValidUntil: "2026-09-10",
      permitValidUntil: "2026-08-02"
    },
    {
      id: "D-1000",
      name: "Yasin Kaya",
      role: "Aushilfe",
      status: "Aktiv",
      vehicle: "GER TX 300 - VW Touran",
      phone: "0171 555 0833",
      shift: "12:00 - 20:00",
      ridesToday: 2,
      revenueToday: 87,
      rating: 4.3,
      licenseValidUntil: "2026-07-20",
      permitValidUntil: "2026-07-14"
    }
  ];

  const statusMeta = {
    Aktiv: { emoji: "🟢", className: "driver-status-active" },
    Unterwegs: { emoji: "🔵", className: "driver-status-unterwegs" },
    Pause: { emoji: "🟡", className: "driver-status-pause" },
    Krank: { emoji: "🟠", className: "driver-status-sick" },
    Urlaub: { emoji: "🟠", className: "driver-status-vacation" },
    Offline: { emoji: "⚫", className: "driver-status-offline" }
  };

  const state = {
    searchTerm: "",
    activeFilter: "Alle"
  };

  function daysUntil(dateValue) {
    const date = new Date(`${dateValue}T00:00:00`);
    const diffMs = date.getTime() - referenceDate.getTime();
    return Math.ceil(diffMs / 86400000);
  }

  function formatEuro(value) {
    return `${Number(value || 0).toFixed(2).replace(".", ",")} EUR`;
  }

  function formatDate(value) {
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("de-DE").format(date);
  }

  function normalizeText(value) {
    return String(value || "")
      .toLocaleLowerCase("de-DE")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function getDriverWarnings(driver) {
    const warnings = [];
    const licenseDays = daysUntil(driver.licenseValidUntil);
    const permitDays = daysUntil(driver.permitValidUntil);

    if (licenseDays <= 30) {
      warnings.push({
        type: licenseDays < 7 ? "critical" : "warning",
        text: licenseDays < 0
          ? `Führerschein überfällig seit ${Math.abs(licenseDays)} Tagen`
          : `Führerschein läuft in ${licenseDays} Tagen ab`
      });
    }

    if (permitDays <= 30) {
      warnings.push({
        type: permitDays < 7 ? "critical" : "warning",
        text: permitDays < 0
          ? `P-Schein überfällig seit ${Math.abs(permitDays)} Tagen`
          : `P-Schein läuft in ${permitDays} Tagen ab`
      });
    }

    return warnings;
  }

  function getStatusDotClass(status) {
    if (status === "Aktiv") return "is-active";
    if (status === "Unterwegs") return "is-onroute";
    if (status === "Pause") return "is-pause";
    if (status === "Krank" || status === "Urlaub") return "is-sick";
    return "is-offline";
  }

  function renderDriverStats() {
    const stats = {
      total: drivers.length,
      active: drivers.filter((driver) => driver.status === "Aktiv").length,
      onRoute: drivers.filter((driver) => driver.status === "Unterwegs").length,
      pause: drivers.filter((driver) => driver.status === "Pause").length,
      sickVacation: drivers.filter((driver) => driver.status === "Krank" || driver.status === "Urlaub").length,
      withoutVehicle: drivers.filter((driver) => !driver.vehicle || driver.vehicle === "-").length
    };

    Object.entries(stats).forEach(([key, value]) => {
      const node = document.querySelector(`[data-driver-stat="${key}"]`);
      if (node) node.textContent = String(value);
    });
  }

  function renderRatingStars(value) {
    const rounded = Math.round(Number(value || 0));
    const full = "★".repeat(Math.max(0, Math.min(5, rounded)));
    const empty = "☆".repeat(Math.max(0, 5 - rounded));
    return `${full}${empty}`;
  }

  function matchesDriver(driver) {
    const normalizedQuery = normalizeText(state.searchTerm).trim();

    let passStatus = state.activeFilter === "Alle" || driver.status === state.activeFilter;
    if (state.activeFilter === "Krank/Urlaub") {
      passStatus = driver.status === "Krank" || driver.status === "Urlaub";
    }
    if (state.activeFilter === "Ohne Fahrzeug") {
      passStatus = !driver.vehicle || driver.vehicle === "-";
    }

    if (!passStatus) return false;
    if (!normalizedQuery) return true;

    const haystack = normalizeText([
      driver.name,
      driver.role,
      driver.vehicle,
      driver.phone
    ]
      .join(" "));

    return haystack.includes(normalizedQuery);
  }

  function openModal(title, bodyHtml) {
    const modal = document.querySelector("[data-driver-modal]");
    const modalTitle = document.querySelector("[data-driver-modal-title]");
    const modalBody = document.querySelector("[data-driver-modal-body]");
    if (!modal || !modalTitle || !modalBody) return;

    modalTitle.textContent = title;
    modalBody.innerHTML = bodyHtml;
    modal.hidden = false;
    document.body.classList.add("admin-modal-open");
  }

  function closeModal() {
    const modal = document.querySelector("[data-driver-modal]");
    if (!modal) return;

    modal.hidden = true;
    document.body.classList.remove("admin-modal-open");
  }

  function buildDetailsModal(driver) {
    return `
      <dl class="driver-modal-list">
        <div><dt>Fahrername</dt><dd>${driver.name}</dd></div>
        <div><dt>Rolle</dt><dd>${driver.role}</dd></div>
        <div><dt>Status</dt><dd>${driver.status}</dd></div>
        <div><dt>Aktuelles Fahrzeug</dt><dd>${driver.vehicle}</dd></div>
        <div><dt>Schicht</dt><dd>${driver.shift}</dd></div>
        <div><dt>Fahrten heute</dt><dd>${driver.ridesToday}</dd></div>
        <div><dt>Umsatz heute</dt><dd>${formatEuro(driver.revenueToday)}</dd></div>
        <div><dt>Bewertung</dt><dd>${driver.rating.toFixed(1)} (${renderRatingStars(driver.rating)})</dd></div>
        <div><dt>Führerschein gültig bis</dt><dd>${formatDate(driver.licenseValidUntil)}</dd></div>
        <div><dt>P-Schein gültig bis</dt><dd>${formatDate(driver.permitValidUntil)}</dd></div>
      </dl>
      <p class="driver-modal-note">Demo-Daten – später Backend-Anbindung möglich</p>
    `;
  }

  function buildActionModal(driver, action) {
    if (action === "assign") {
      return `
        <p class="driver-modal-note">Demo: Fahrzeugzuweisung für ${driver.name}. Es werden keine Daten gespeichert.</p>
      `;
    }

    if (action === "shift") {
      return `
        <p class="driver-modal-note">Demo: Schichtplanung für ${driver.name}. Planung wird aktuell nicht gespeichert.</p>
      `;
    }

    return `
      <p class="driver-modal-note">Demo: Dokumentprüfung für ${driver.name}. Führerschein/P-Schein-Prüfung ohne Backend.</p>
    `;
  }

  function renderDrivers() {
    const grid = document.querySelector("[data-driver-grid]");
    if (!grid) return;

    const visibleDrivers = drivers.filter(matchesDriver);
    grid.innerHTML = "";

    if (!visibleDrivers.length) {
      const empty = document.createElement("article");
      empty.className = "driver-empty";
      empty.innerHTML = "<strong>Keine Fahrer gefunden.</strong><p>Bitte Suche oder Filter anpassen.</p>";
      grid.append(empty);
      return;
    }

    visibleDrivers.forEach((driver) => {
      const meta = statusMeta[driver.status] || statusMeta.Offline;
      const warnings = getDriverWarnings(driver);
      const card = document.createElement("article");
      card.className = "driver-card";

      card.innerHTML = `
        <header class="driver-card-head">
          <div>
            <h2>👤 ${driver.name}</h2>
            <small class="driver-role">${driver.role}</small>
          </div>
          <span class="driver-status ${meta.className}">${meta.emoji} ${driver.status}</span>
        </header>

        <dl class="driver-meta-list">
          <div>
            <dt>Aktuelles Fahrzeug</dt>
            <dd class="driver-vehicle-chip">${driver.vehicle}</dd>
          </div>
          <div>
            <dt>Telefon Demo</dt>
            <dd>${driver.phone}</dd>
          </div>
          <div>
            <dt>Schicht heute</dt>
            <dd>${driver.shift}</dd>
          </div>
          <div>
            <dt>Fahrten heute</dt>
            <dd>${driver.ridesToday}</dd>
          </div>
          <div>
            <dt>Umsatz heute Demo</dt>
            <dd>${formatEuro(driver.revenueToday)}</dd>
          </div>
          <div>
            <dt>Bewertung Demo</dt>
            <dd class="driver-rating"><span>${renderRatingStars(driver.rating)}</span><b>${driver.rating.toFixed(1)}</b></dd>
          </div>
          <div>
            <dt>Führerschein gültig bis</dt>
            <dd>${formatDate(driver.licenseValidUntil)}</dd>
          </div>
          <div>
            <dt>P-Schein gültig bis</dt>
            <dd>${formatDate(driver.permitValidUntil)}</dd>
          </div>
        </dl>

        <div class="driver-warning-list" data-driver-warning-list></div>

        <div class="driver-card-actions">
          <button class="admin-btn driver-btn-muted" type="button" data-driver-action="details" data-driver-id="${driver.id}">Details</button>
          <button class="admin-btn driver-btn-muted" type="button" data-driver-action="assign" data-driver-id="${driver.id}">Fahrzeug zuweisen</button>
          <button class="admin-btn driver-btn-muted" type="button" data-driver-action="shift" data-driver-id="${driver.id}">Schicht planen</button>
          <button class="admin-btn" type="button" data-driver-action="docs" data-driver-id="${driver.id}">Dokument prüfen</button>
        </div>
      `;

      const warningList = card.querySelector("[data-driver-warning-list]");
      if (warningList && warnings.length) {
        warnings.forEach((warning) => {
          const warningNode = document.createElement("p");
          warningNode.className = `driver-warning ${warning.type === "critical" ? "is-critical" : "is-warning"}`;
          warningNode.textContent = warning.text;
          warningList.append(warningNode);
        });
      }

      grid.append(card);
    });
  }

  function bindCardActions() {
    const grid = document.querySelector("[data-driver-grid]");
    if (!grid) return;

    grid.addEventListener("click", (event) => {
      const button = event.target.closest("[data-driver-action]");
      if (!button) return;

      const action = button.getAttribute("data-driver-action");
      const driverId = button.getAttribute("data-driver-id");
      const driver = drivers.find((item) => item.id === driverId);
      if (!action || !driver) return;

      if (action === "details") {
        openModal(`Fahrerdetails: ${driver.name}`, buildDetailsModal(driver));
        return;
      }

      if (action === "assign") {
        openModal(`Fahrzeug zuweisen: ${driver.name}`, buildActionModal(driver, "assign"));
        return;
      }

      if (action === "shift") {
        openModal(`Schicht planen: ${driver.name}`, buildActionModal(driver, "shift"));
        return;
      }

      openModal(`Dokument prüfen: ${driver.name}`, buildActionModal(driver, "docs"));
    });
  }

  function bindModalClose() {
    const closeButtons = document.querySelectorAll("[data-driver-modal-close]");
    closeButtons.forEach((button) => {
      button.addEventListener("click", closeModal);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      const modal = document.querySelector("[data-driver-modal]");
      if (!modal || modal.hidden) return;
      closeModal();
    });
  }

  function bindSearch() {
    const search = document.querySelector("[data-driver-search]");
    if (!search) return;

    search.addEventListener("input", (event) => {
      state.searchTerm = String(event.target.value || "");
      renderDrivers();
    });
  }

  function bindFilters() {
    const filterButtons = document.querySelectorAll("[data-driver-filter]");
    filterButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const nextFilter = button.getAttribute("data-driver-filter") || "Alle";
        state.activeFilter = nextFilter;

        filterButtons.forEach((btn) => btn.classList.remove("is-active"));
        button.classList.add("is-active");

        renderDrivers();
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

  bindSearch();
  bindFilters();
  bindCardActions();
  bindModalClose();
  bindDisabledNavItems();
  renderDriverStats();
  renderDrivers();
})();
