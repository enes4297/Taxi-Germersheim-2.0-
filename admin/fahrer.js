(() => {
  const drivers = [
    {
      name: "Max Mustermann",
      status: "Online",
      vehicle: "Mercedes V-Klasse",
      plate: "GER TG 101",
      phone: "0171 555 0101",
      currentRide: "Krankenhaus Speyer"
    },
    {
      name: "Selin Kara",
      status: "Unterwegs",
      vehicle: "VW Caddy",
      plate: "GER TG 204",
      phone: "0171 555 0204",
      currentRide: "Bahnhof Germersheim"
    },
    {
      name: "Ali Demir",
      status: "Pause",
      vehicle: "Mercedes E-Klasse",
      plate: "GER TG 307",
      phone: "0171 555 0307",
      currentRide: "Pause bis 10:30"
    },
    {
      name: "Julia Schneider",
      status: "Offline",
      vehicle: "Toyota Prius+",
      plate: "GER TG 112",
      phone: "0171 555 0112",
      currentRide: "Keine aktive Fahrt"
    },
    {
      name: "Daniel Klein",
      status: "Unterwegs",
      vehicle: "Mercedes Sprinter",
      plate: "GER TG 415",
      phone: "0171 555 0415",
      currentRide: "Klinikum Landau"
    },
    {
      name: "Sabine Hoffmann",
      status: "Online",
      vehicle: "VW Touran",
      plate: "GER TG 223",
      phone: "0171 555 0223",
      currentRide: "Bereit im Zentrum"
    },
    {
      name: "Nora Winter",
      status: "Pause",
      vehicle: "Skoda Octavia",
      plate: "GER TG 519",
      phone: "0171 555 0519",
      currentRide: "Pause an Raststätte"
    },
    {
      name: "Michael Braun",
      status: "Online",
      vehicle: "Ford Transit",
      plate: "GER TG 630",
      phone: "0171 555 0630",
      currentRide: "Flughafen-Transfer vorbereitet"
    },
    {
      name: "Mia Koch",
      status: "Offline",
      vehicle: "Opel Zafira",
      plate: "GER TG 744",
      phone: "0171 555 0744",
      currentRide: "Schicht beendet"
    }
  ];

  const statusMeta = {
    Online: { emoji: "🟢", className: "driver-status-online" },
    Unterwegs: { emoji: "🔵", className: "driver-status-unterwegs" },
    Pause: { emoji: "🟡", className: "driver-status-pause" },
    Offline: { emoji: "⚫", className: "driver-status-offline" }
  };

  const state = {
    searchTerm: "",
    activeFilter: "Alle"
  };

  function matchesDriver(driver) {
    const normalizedQuery = state.searchTerm.trim().toLowerCase();
    const passStatus = state.activeFilter === "Alle" || driver.status === state.activeFilter;

    if (!passStatus) return false;
    if (!normalizedQuery) return true;

    const haystack = [
      driver.name,
      driver.vehicle,
      driver.plate,
      driver.currentRide,
      driver.phone
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedQuery);
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
      const meta = statusMeta[driver.status] || statusMeta.Online;
      const card = document.createElement("article");
      card.className = "driver-card";

      card.innerHTML = `
        <header class="driver-card-head">
          <h2>👤 ${driver.name}</h2>
          <span class="driver-status ${meta.className}">${meta.emoji} ${driver.status}</span>
        </header>

        <dl class="driver-meta-list">
          <div>
            <dt>Fahrzeug</dt>
            <dd>${driver.vehicle}</dd>
          </div>
          <div>
            <dt>Kennzeichen</dt>
            <dd>${driver.plate}</dd>
          </div>
          <div>
            <dt>Telefon</dt>
            <dd>${driver.phone}</dd>
          </div>
          <div>
            <dt>Aktuelle Fahrt</dt>
            <dd>${driver.currentRide}</dd>
          </div>
        </dl>

        <div class="driver-card-actions">
          <button class="admin-btn driver-btn-muted" type="button">Details</button>
          <button class="admin-btn" type="button">Fahrt zuweisen</button>
        </div>
      `;

      grid.append(card);
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
  bindDisabledNavItems();
  renderDrivers();
})();
