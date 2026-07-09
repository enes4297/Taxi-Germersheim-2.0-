(() => {
  const customers = [
    {
      id: "C-100",
      name: "Mara Hoffmann",
      type: "Stammkunde",
      phone: "0171 770 1001",
      lastRide: "08.07.2026 14:20",
      nextRide: "09.07.2026 16:45",
      favoriteDestination: "Klinikum Speyer",
      ridesCount: 48,
      revenueDemo: 1398,
      rewardsStatus: "Gold",
      note: "Bevorzugt Abholung am Hintereingang.",
      openQuestion: false
    },
    {
      id: "C-200",
      name: "Jonas Weber",
      type: "Privatkunde",
      phone: "0171 770 1002",
      lastRide: "07.07.2026 09:10",
      nextRide: "10.07.2026 07:30",
      favoriteDestination: "Bahnhof Germersheim",
      ridesCount: 9,
      revenueDemo: 218,
      rewardsStatus: "Silber",
      note: "Benötigt meist frühmorgens Fahrt.",
      openQuestion: true
    },
    {
      id: "C-300",
      name: "Pflegezentrum Südpfalz",
      type: "Krankenkasse",
      phone: "0171 770 1003",
      lastRide: "09.07.2026 10:00",
      nextRide: "09.07.2026 18:00",
      favoriteDestination: "Reha Landau",
      ridesCount: 73,
      revenueDemo: 2890,
      rewardsStatus: "Partner",
      note: "Sammelrechnung monatlich, Begleitperson oft dabei.",
      openQuestion: false
    },
    {
      id: "C-400",
      name: "LogiTrans Rhein",
      type: "Firmenkunde",
      phone: "0171 770 1004",
      lastRide: "08.07.2026 20:15",
      nextRide: "09.07.2026 21:30",
      favoriteDestination: "Industriegebiet Nord",
      ridesCount: 31,
      revenueDemo: 1675,
      rewardsStatus: "Business Plus",
      note: "Nachtschicht-Fahrten priorisieren.",
      openQuestion: true
    },
    {
      id: "C-500",
      name: "Aylin Cakir",
      type: "VIP",
      phone: "0171 770 1005",
      lastRide: "09.07.2026 11:25",
      nextRide: "09.07.2026 19:40",
      favoriteDestination: "Frankfurt Flughafen T1",
      ridesCount: 58,
      revenueDemo: 3240,
      rewardsStatus: "VIP Platin",
      note: "Wünscht ruhiges Fahrzeug und feste Fahrer.",
      openQuestion: false
    },
    {
      id: "C-600",
      name: "Schulverwaltung Germersheim",
      type: "Schülerfahrt",
      phone: "0171 770 1006",
      lastRide: "09.07.2026 07:05",
      nextRide: "10.07.2026 13:20",
      favoriteDestination: "Schulzentrum Süd",
      ridesCount: 112,
      revenueDemo: 4015,
      rewardsStatus: "Schulvertrag",
      note: "Kinderanschnallpflicht prüfen.",
      openQuestion: false
    },
    {
      id: "C-700",
      name: "Helga Maurer",
      type: "Stammkunde",
      phone: "0171 770 1007",
      lastRide: "06.07.2026 13:45",
      nextRide: "11.07.2026 09:15",
      favoriteDestination: "Innenstadt Speyer",
      ridesCount: 39,
      revenueDemo: 1186,
      rewardsStatus: "Gold",
      note: "Hilft beim Einsteigen, Rollator vorhanden.",
      openQuestion: true
    },
    {
      id: "C-800",
      name: "Kliniknetz Pfalz",
      type: "Krankenkasse",
      phone: "0171 770 1008",
      lastRide: "09.07.2026 08:50",
      nextRide: "09.07.2026 17:10",
      favoriteDestination: "Onkologie Ludwigshafen",
      ridesCount: 94,
      revenueDemo: 3562,
      rewardsStatus: "Partner",
      note: "Patientenlisten täglich 15:00 prüfen.",
      openQuestion: false
    },
    {
      id: "C-900",
      name: "Mecasoft GmbH",
      type: "Firmenkunde",
      phone: "0171 770 1009",
      lastRide: "08.07.2026 16:40",
      nextRide: "09.07.2026 22:10",
      favoriteDestination: "Mannheim Hbf",
      ridesCount: 26,
      revenueDemo: 1492,
      rewardsStatus: "Business",
      note: "Rechnung an zentrale Buchhaltung.",
      openQuestion: false
    },
    {
      id: "C-1000",
      name: "Levin Schulz",
      type: "Privatkunde",
      phone: "0171 770 1010",
      lastRide: "05.07.2026 23:30",
      nextRide: "09.07.2026 23:50",
      favoriteDestination: "Karlsruhe Hbf",
      ridesCount: 6,
      revenueDemo: 174,
      rewardsStatus: "Bronze",
      note: "Ruft oft kurzfristig an.",
      openQuestion: true
    }
  ];

  const typeMeta = {
    Privatkunde: "customer-type-private",
    Stammkunde: "customer-type-regular",
    Krankenkasse: "customer-type-medical",
    Firmenkunde: "customer-type-company",
    VIP: "customer-type-vip",
    Schülerfahrt: "customer-type-school"
  };

  const state = {
    searchTerm: "",
    activeFilter: "Alle"
  };

  function normalizeText(value) {
    return String(value || "")
      .toLocaleLowerCase("de-DE")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function formatEuro(value) {
    return `${Number(value || 0).toFixed(2).replace(".", ",")} EUR`;
  }

  function matchesFilter(customer) {
    if (state.activeFilter === "Alle") return true;
    if (state.activeFilter === "Stammkunden") return customer.type === "Stammkunde";
    if (state.activeFilter === "Krankenkasse") return customer.type === "Krankenkasse";
    if (state.activeFilter === "Firmenkunden") return customer.type === "Firmenkunde";
    if (state.activeFilter === "VIP") return customer.type === "VIP";
    if (state.activeFilter === "Rückfrage offen") return customer.openQuestion;
    return true;
  }

  function matchesSearch(customer) {
    const query = normalizeText(state.searchTerm).trim();
    if (!query) return true;

    const haystack = normalizeText([
      customer.name,
      customer.type,
      customer.phone,
      customer.favoriteDestination
    ].join(" "));

    return haystack.includes(query);
  }

  function getVisibleCustomers() {
    return customers.filter((customer) => matchesFilter(customer) && matchesSearch(customer));
  }

  function renderStats() {
    const stats = {
      total: customers.length,
      regular: customers.filter((customer) => customer.type === "Stammkunde").length,
      medical: customers.filter((customer) => customer.type === "Krankenkasse").length,
      company: customers.filter((customer) => customer.type === "Firmenkunde").length,
      openQuestions: customers.filter((customer) => customer.openQuestion).length,
      vipRewards: customers.filter((customer) => customer.type === "VIP" || /gold|vip|platin|silber/i.test(customer.rewardsStatus)).length
    };

    Object.entries(stats).forEach(([key, value]) => {
      const node = document.querySelector(`[data-customer-stat="${key}"]`);
      if (node) node.textContent = String(value);
    });
  }

  function openModal(title, bodyHtml) {
    const modal = document.querySelector("[data-customer-modal]");
    const modalTitle = document.querySelector("[data-customer-modal-title]");
    const modalBody = document.querySelector("[data-customer-modal-body]");
    if (!modal || !modalTitle || !modalBody) return;

    modalTitle.textContent = title;
    modalBody.innerHTML = bodyHtml;
    modal.hidden = false;
    document.body.classList.add("admin-modal-open");
  }

  function closeModal() {
    const modal = document.querySelector("[data-customer-modal]");
    if (!modal) return;

    modal.hidden = true;
    document.body.classList.remove("admin-modal-open");
  }

  function buildDetailsModal(customer) {
    return `
      <dl class="customer-modal-list">
        <div><dt>Name</dt><dd>${customer.name}</dd></div>
        <div><dt>Kundentyp</dt><dd>${customer.type}</dd></div>
        <div><dt>Telefonnummer Demo</dt><dd>${customer.phone}</dd></div>
        <div><dt>Letzte Fahrt</dt><dd>${customer.lastRide}</dd></div>
        <div><dt>Nächste Fahrt</dt><dd>${customer.nextRide}</dd></div>
        <div><dt>Lieblingsziel</dt><dd>${customer.favoriteDestination}</dd></div>
        <div><dt>Anzahl Fahrten</dt><dd>${customer.ridesCount}</dd></div>
        <div><dt>Umsatz Demo</dt><dd>${formatEuro(customer.revenueDemo)}</dd></div>
        <div><dt>Rewards-Status</dt><dd>${customer.rewardsStatus}</dd></div>
        <div><dt>Hinweise</dt><dd>${customer.note || "-"}</dd></div>
      </dl>
      <p class="customer-modal-note">Demo-Daten – später Backend-Anbindung möglich</p>
    `;
  }

  function buildActionModal(customer, action) {
    if (action === "ride") {
      return `<p class="customer-modal-note">Demo: Neue Fahrt für ${customer.name} wird vorbereitet. Keine Speicherung ohne Backend.</p>`;
    }
    if (action === "call") {
      return `<p class="customer-modal-note">Demo: Telefonat mit ${customer.phone} wird simuliert. Keine echte Verbindung.</p>`;
    }
    if (action === "whatsapp") {
      return `<p class="customer-modal-note">Demo: WhatsApp-Nachricht an ${customer.name} wird vorbereitet. Keine echte Nachricht wird gesendet.</p>`;
    }
    return `<p class="customer-modal-note">Demo: Hinweisbearbeitung für ${customer.name}. Änderungen werden nicht gespeichert.</p>`;
  }

  function renderCustomers() {
    const grid = document.querySelector("[data-customer-grid]");
    if (!grid) return;

    const visibleCustomers = getVisibleCustomers();
    grid.innerHTML = "";

    if (!visibleCustomers.length) {
      const empty = document.createElement("article");
      empty.className = "customer-empty";
      empty.innerHTML = "<strong>Keine Kunden gefunden.</strong><p>Bitte Suche oder Filter anpassen.</p>";
      grid.append(empty);
      return;
    }

    visibleCustomers.forEach((customer) => {
      const card = document.createElement("article");
      card.className = "customer-card";

      card.innerHTML = `
        <header class="customer-card-head">
          <div>
            <h2>${customer.name}</h2>
            <span class="customer-type-badge ${typeMeta[customer.type] || "customer-type-private"}">${customer.type}</span>
          </div>
          <span class="customer-rewards">${customer.rewardsStatus}</span>
        </header>

        <dl class="customer-meta-list">
          <div>
            <dt>Telefon Demo</dt>
            <dd>${customer.phone}</dd>
          </div>
          <div>
            <dt>Letzte Fahrt</dt>
            <dd>${customer.lastRide}</dd>
          </div>
          <div>
            <dt>Nächste Fahrt</dt>
            <dd class="customer-next-ride">${customer.nextRide}</dd>
          </div>
          <div>
            <dt>Lieblingsziel</dt>
            <dd>${customer.favoriteDestination}</dd>
          </div>
          <div>
            <dt>Anzahl Fahrten</dt>
            <dd>${customer.ridesCount}</dd>
          </div>
          <div>
            <dt>Umsatz Demo</dt>
            <dd>${formatEuro(customer.revenueDemo)}</dd>
          </div>
          <div>
            <dt>Rewards-Status</dt>
            <dd>${customer.rewardsStatus}</dd>
          </div>
          <div>
            <dt>Hinweis Demo</dt>
            <dd>${customer.note || "-"}</dd>
          </div>
        </dl>

        ${customer.openQuestion ? "<p class='customer-question'>Rückfrage offen</p>" : ""}

        <div class="customer-card-actions">
          <button class="admin-btn customer-btn-muted" type="button" data-customer-action="details" data-customer-id="${customer.id}">Details</button>
          <button class="admin-btn customer-btn-muted" type="button" data-customer-action="ride" data-customer-id="${customer.id}">Neue Fahrt</button>
          <button class="admin-btn customer-btn-muted" type="button" data-customer-action="call" data-customer-id="${customer.id}">Anrufen</button>
          <button class="admin-btn customer-btn-muted" type="button" data-customer-action="whatsapp" data-customer-id="${customer.id}">WhatsApp</button>
          <button class="admin-btn" type="button" data-customer-action="note" data-customer-id="${customer.id}">Hinweis bearbeiten</button>
        </div>
      `;

      grid.append(card);
    });
  }

  function bindSearch() {
    const input = document.querySelector("[data-customer-search]");
    if (!input) return;

    input.addEventListener("input", (event) => {
      state.searchTerm = String(event.target.value || "");
      renderCustomers();
    });
  }

  function bindFilters() {
    const buttons = document.querySelectorAll("[data-customer-filter]");
    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        state.activeFilter = button.getAttribute("data-customer-filter") || "Alle";
        buttons.forEach((item) => item.classList.remove("is-active"));
        button.classList.add("is-active");
        renderCustomers();
      });
    });
  }

  function bindActions() {
    const grid = document.querySelector("[data-customer-grid]");
    if (!grid) return;

    grid.addEventListener("click", (event) => {
      const button = event.target.closest("[data-customer-action]");
      if (!button) return;

      const action = button.getAttribute("data-customer-action");
      const customerId = button.getAttribute("data-customer-id");
      const customer = customers.find((item) => item.id === customerId);
      if (!action || !customer) return;

      if (action === "details") {
        openModal(`Kundendetails: ${customer.name}`, buildDetailsModal(customer));
        return;
      }

      openModal(`Aktion: ${customer.name}`, buildActionModal(customer, action));
    });
  }

  function bindModalClose() {
    const closeButtons = document.querySelectorAll("[data-customer-modal-close]");
    closeButtons.forEach((button) => {
      button.addEventListener("click", closeModal);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      const modal = document.querySelector("[data-customer-modal]");
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
  renderCustomers();
})();
