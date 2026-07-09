(() => {
  const rides = [
    {
      id: "R-100",
      time: "07:20",
      customer: "Mara Hoffmann",
      phone: "0171 770 1001",
      pickup: "Germersheim Zentrum 4",
      destination: "Frankfurt Flughafen Terminal 1",
      rideType: "Flughafen",
      status: "Bestätigt",
      driver: "Michael Becker",
      vehicle: "Mercedes E-Klasse - GER TG 201",
      priceDemo: 126.0,
      paymentDemo: "Karte",
      noteDemo: "2 große Koffer, Abholung 5 Minuten vor Zeit"
    },
    {
      id: "R-101",
      time: "07:45",
      customer: "Kliniknetz Pfalz",
      phone: "0171 770 1008",
      pickup: "Onkologie Ludwigshafen",
      destination: "Germersheim Reha Zentrum",
      rideType: "Krankenfahrt",
      status: "Fahrer zugewiesen",
      driver: "Sabine Hoffmann",
      vehicle: "VW Caddy Rollstuhl - GER TG 330",
      priceDemo: 84.5,
      paymentDemo: "Krankenkasse",
      noteDemo: "Rollstuhlrampe erforderlich"
    },
    {
      id: "R-102",
      time: "08:05",
      customer: "Tim Berger",
      phone: "0171 770 1020",
      pickup: "Bellheim Schulzentrum",
      destination: "Rülzheim Süd",
      rideType: "Schülerfahrt",
      status: "Offen",
      driver: "-",
      vehicle: "-",
      priceDemo: 22.0,
      paymentDemo: "Bar",
      noteDemo: "Bitte direkt am Haupteingang abholen"
    },
    {
      id: "R-103",
      time: "08:30",
      customer: "Selin Kara",
      phone: "0171 770 1002",
      pickup: "Speyer Bahnhof",
      destination: "Germersheim Nord 12",
      rideType: "Taxi",
      status: "Unterwegs",
      driver: "Daniel Kaya",
      vehicle: "Toyota Prius - GER TG 118",
      priceDemo: 42.0,
      paymentDemo: "Karte",
      noteDemo: "Kunde wartet am Taxistand Ost"
    },
    {
      id: "R-104",
      time: "08:55",
      customer: "Ali Demir",
      phone: "0171 770 1003",
      pickup: "Rülzheim Mitte",
      destination: "Klinikum Landau",
      rideType: "Krankenfahrt",
      status: "Angekommen",
      driver: "Julia Schneider",
      vehicle: "Mercedes V-Klasse - GER TG 214",
      priceDemo: 58.0,
      paymentDemo: "Krankenkasse",
      noteDemo: "Patientenaufnahme wurde informiert"
    },
    {
      id: "R-105",
      time: "09:10",
      customer: "Noah Wagner",
      phone: "0171 770 1021",
      pickup: "Germersheim Bahnhof",
      destination: "Karlsruhe Hbf",
      rideType: "Kurier",
      status: "Bestätigt",
      driver: "Aylin Tunc",
      vehicle: "Skoda Superb - GER TG 127",
      priceDemo: 67.0,
      paymentDemo: "Firmenkonto",
      noteDemo: "Dokumentenmappe bis 10:00 zustellen"
    },
    {
      id: "R-106",
      time: "09:25",
      customer: "Event Team Süd",
      phone: "0171 770 1022",
      pickup: "Messe Karlsruhe",
      destination: "Germersheim Rheinhotel",
      rideType: "Großraum",
      status: "Abgeschlossen",
      driver: "Mehmet Yildiz",
      vehicle: "Ford Tourneo - GER TG 340",
      priceDemo: 79.0,
      paymentDemo: "Rechnung",
      noteDemo: "6 Personen mit Gepäck"
    },
    {
      id: "R-107",
      time: "09:50",
      customer: "Lisa König",
      phone: "0171 770 1023",
      pickup: "Jockgrim Rathaus",
      destination: "Germersheim Schule",
      rideType: "Rollstuhlfahrt",
      status: "Fahrer zugewiesen",
      driver: "Fatma Aydin",
      vehicle: "VW Caddy Rollstuhl - GER TG 331",
      priceDemo: 31.5,
      paymentDemo: "Karte",
      noteDemo: "Begleitperson fährt mit"
    },
    {
      id: "R-108",
      time: "10:15",
      customer: "Nora Winter",
      phone: "0171 770 1006",
      pickup: "Leimersheim Hauptstraße",
      destination: "Karlsruhe Hbf",
      rideType: "Taxi",
      status: "Storniert",
      driver: "-",
      vehicle: "-",
      priceDemo: 0,
      paymentDemo: "-",
      noteDemo: "Kunde hat wegen Terminverschiebung storniert"
    },
    {
      id: "R-109",
      time: "10:40",
      customer: "Flugdienst Rhein",
      phone: "0171 770 1024",
      pickup: "Germersheim Süd 7",
      destination: "Baden-Airpark",
      rideType: "Flughafen",
      status: "Offen",
      driver: "-",
      vehicle: "-",
      priceDemo: 109.0,
      paymentDemo: "Firmenkonto",
      noteDemo: "Morgens wiederkehrende Tour, Priorität hoch"
    }
  ];

  const statusClassMap = {
    Offen: "ride-status-open",
    Bestätigt: "ride-status-confirmed",
    "Fahrer zugewiesen": "ride-status-assigned",
    Unterwegs: "ride-status-onroute",
    Angekommen: "ride-status-arrived",
    Abgeschlossen: "ride-status-completed",
    Storniert: "ride-status-cancelled"
  };

  const typeClassMap = {
    Taxi: "ride-type-taxi",
    Krankenfahrt: "ride-type-medical",
    Rollstuhlfahrt: "ride-type-wheelchair",
    Flughafen: "ride-type-airport",
    Großraum: "ride-type-van",
    Schülerfahrt: "ride-type-school",
    Kurier: "ride-type-courier"
  };

  const state = {
    activeFilter: "Alle",
    searchTerm: ""
  };

  function formatEuro(value) {
    return `${Number(value || 0).toFixed(2).replace('.', ',')} EUR`;
  }

  function normalize(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function matchesFilter(ride) {
    if (state.activeFilter === "Alle") return true;

    const filter = state.activeFilter;
    if (["Offen", "Bestätigt", "Unterwegs", "Abgeschlossen", "Storniert"].includes(filter)) {
      return ride.status === filter;
    }

    if (["Krankenfahrt", "Flughafen"].includes(filter)) {
      return ride.rideType === filter;
    }

    return true;
  }

  function matchesSearch(ride) {
    if (!state.searchTerm) return true;

    const search = normalize(state.searchTerm);
    return [
      ride.customer,
      ride.driver,
      ride.vehicle,
      ride.pickup,
      ride.destination,
      ride.rideType
    ].some((entry) => normalize(entry).includes(search));
  }

  function getVisibleRides() {
    return rides.filter((ride) => matchesFilter(ride) && matchesSearch(ride));
  }

  function renderStats() {
    const stats = {
      today: rides.length,
      open: rides.filter((ride) => ride.status === "Offen").length,
      confirmed: rides.filter((ride) => ride.status === "Bestätigt").length,
      onRoute: rides.filter((ride) => ride.status === "Unterwegs").length,
      completed: rides.filter((ride) => ride.status === "Abgeschlossen").length,
      cancelled: rides.filter((ride) => ride.status === "Storniert").length
    };

    Object.entries(stats).forEach(([key, value]) => {
      const node = document.querySelector(`[data-ride-stat="${key}"]`);
      if (node) {
        node.textContent = String(value);
      }
    });
  }

  function buildRideCard(ride) {
    return `
      <article class="ride-card">
        <header class="ride-card-head">
          <div>
            <h2>${ride.time} - ${ride.customer}</h2>
            <span class="ride-type-badge ${typeClassMap[ride.rideType] || "ride-type-taxi"}">${ride.rideType}</span>
          </div>
          <span class="status-pill ${statusClassMap[ride.status] || "ride-status-open"}">${ride.status}</span>
        </header>

        <div class="ride-route">
          <div class="ride-route-item ride-route-start">
            <small>Start</small>
            <strong>${ride.pickup}</strong>
          </div>
          <div class="ride-route-arrow" aria-hidden="true">→</div>
          <div class="ride-route-item ride-route-target">
            <small>Ziel</small>
            <strong>${ride.destination}</strong>
          </div>
        </div>

        <dl class="ride-meta-list">
          <div>
            <dt>Fahrer</dt>
            <dd>${ride.driver}</dd>
          </div>
          <div>
            <dt>Fahrzeug</dt>
            <dd>${ride.vehicle}</dd>
          </div>
          <div>
            <dt>Preis Demo</dt>
            <dd>${formatEuro(ride.priceDemo)}</dd>
          </div>
          <div>
            <dt>Zahlungsart Demo</dt>
            <dd>${ride.paymentDemo}</dd>
          </div>
        </dl>

        <p class="ride-note">Hinweis Demo: ${ride.noteDemo}</p>

        <div class="ride-card-actions">
          <button class="admin-btn ride-btn-muted" type="button" data-ride-action="details" data-ride-id="${ride.id}">Details</button>
          <button class="admin-btn" type="button" data-ride-action="assign" data-ride-id="${ride.id}">Fahrer zuweisen</button>
          <button class="admin-btn" type="button" data-ride-action="status" data-ride-id="${ride.id}">Status ändern</button>
          <button class="admin-btn ride-btn-muted" type="button" data-ride-action="call" data-ride-id="${ride.id}">Kunde anrufen</button>
          <button class="admin-btn ride-btn-muted" type="button" data-ride-action="whatsapp" data-ride-id="${ride.id}">WhatsApp</button>
        </div>
      </article>
    `;
  }

  function renderRides() {
    const rideGrid = document.querySelector("[data-ride-grid]");
    if (!rideGrid) return;

    const visibleRides = getVisibleRides();
    if (!visibleRides.length) {
      rideGrid.innerHTML = `
        <article class="ride-empty">
          <strong>Keine Fahrten gefunden.</strong>
          <p>Bitte Suche oder Filter anpassen.</p>
        </article>
      `;
      return;
    }

    rideGrid.innerHTML = visibleRides.map((ride) => buildRideCard(ride)).join("");
  }

  function openModal(title, content) {
    const modal = document.querySelector("[data-ride-modal]");
    const titleNode = document.querySelector("[data-ride-modal-title]");
    const bodyNode = document.querySelector("[data-ride-modal-body]");
    if (!modal || !titleNode || !bodyNode) return;

    titleNode.textContent = title;
    bodyNode.innerHTML = content;
    modal.hidden = false;
    document.body.classList.add("admin-modal-open");
  }

  function closeModal() {
    const modal = document.querySelector("[data-ride-modal]");
    if (!modal) return;

    modal.hidden = true;
    document.body.classList.remove("admin-modal-open");
  }

  function buildDetailsModal(ride) {
    return `
      <dl class="ride-modal-list">
        <div><dt>Fahrtzeit</dt><dd>${ride.time}</dd></div>
        <div><dt>Kunde</dt><dd>${ride.customer}</dd></div>
        <div><dt>Telefonnummer Demo</dt><dd>${ride.phone}</dd></div>
        <div><dt>Abholort</dt><dd>${ride.pickup}</dd></div>
        <div><dt>Ziel</dt><dd>${ride.destination}</dd></div>
        <div><dt>Fahrttyp</dt><dd>${ride.rideType}</dd></div>
        <div><dt>Status</dt><dd>${ride.status}</dd></div>
        <div><dt>Fahrer</dt><dd>${ride.driver}</dd></div>
        <div><dt>Fahrzeug</dt><dd>${ride.vehicle}</dd></div>
        <div><dt>Preis</dt><dd>${formatEuro(ride.priceDemo)}</dd></div>
        <div><dt>Zahlungsart</dt><dd>${ride.paymentDemo}</dd></div>
        <div><dt>Hinweis</dt><dd>${ride.noteDemo}</dd></div>
      </dl>
      <p class="ride-modal-note">Interne Notiz: Demo-Daten - später Backend-Anbindung möglich</p>
    `;
  }

  function buildActionModal(ride, action) {
    const templates = {
      assign: `Demo: Fahrerzuweisung für ${ride.customer} ist vorbereitet. Keine Speicherung ohne Backend.`,
      status: `Demo: Statusänderung für ${ride.id} ist vorbereitet. Keine Speicherung ohne Backend.`,
      call: `Demo: Anruf an ${ride.customer} (${ride.phone}) wird vorbereitet.`,
      whatsapp: `Demo: WhatsApp-Nachricht an ${ride.customer} wird vorbereitet.`
    };

    return `<p>${templates[action] || "Demo-Aktion ohne Speicherung."}</p>`;
  }

  function bindSearch() {
    const searchInput = document.querySelector("[data-ride-search]");
    if (!searchInput) return;

    searchInput.addEventListener("input", (event) => {
      state.searchTerm = event.target.value || "";
      renderRides();
    });
  }

  function bindFilters() {
    const filterButtons = document.querySelectorAll("[data-ride-filter]");
    filterButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const nextFilter = button.getAttribute("data-ride-filter") || "Alle";
        state.activeFilter = nextFilter;

        filterButtons.forEach((item) => {
          item.classList.toggle("is-active", item === button);
        });

        renderRides();
      });
    });
  }

  function bindActions() {
    document.addEventListener("click", (event) => {
      const button = event.target.closest("[data-ride-action]");
      if (!button) return;

      const action = button.getAttribute("data-ride-action");
      const rideId = button.getAttribute("data-ride-id");
      const ride = rides.find((item) => item.id === rideId);
      if (!action || !ride) return;

      if (action === "details") {
        openModal(`Fahrtdetails: ${ride.id}`, buildDetailsModal(ride));
        return;
      }

      openModal(`Aktion: ${ride.id}`, buildActionModal(ride, action));
    });
  }

  function bindModalClose() {
    const closeButtons = document.querySelectorAll("[data-ride-modal-close]");
    closeButtons.forEach((button) => {
      button.addEventListener("click", closeModal);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      const modal = document.querySelector("[data-ride-modal]");
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
  bindSearch();
  bindFilters();
  bindActions();
  bindModalClose();
  bindDisabledNavItems();
  renderRides();
})();
