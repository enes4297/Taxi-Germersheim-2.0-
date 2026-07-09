(() => {
  // Nur Demo-Werkstattdaten ohne FIN/VIN oder sensible Fahrzeugschein-Daten.
  const workshopCases = [
    {
      id: "W-100",
      vehicle: "Mercedes E-Klasse",
      plate: "GER TX100",
      topic: "Inspektion 120.000 km",
      category: "Service",
      priority: "Mittel",
      status: "Geplant",
      appointment: "14.07.2026 09:00",
      shop: "Autohaus Keller",
      costDemo: 480,
      note: "Öl, Filter und Bremsen prüfen.",
      scopes: ["Chef", "Disposition", "Werkstatt"]
    },
    {
      id: "W-101",
      vehicle: "VW Touran",
      plate: "GER TX200",
      topic: "HU/AU Hauptuntersuchung",
      category: "TÜV/HU",
      priority: "Hoch",
      status: "Offen",
      appointment: "12.07.2026 08:30",
      shop: "TÜV Süd Speyer",
      costDemo: 168,
      note: "Frist läuft in 3 Tagen ab.",
      scopes: ["Chef", "Disposition", "Werkstatt"]
    },
    {
      id: "W-102",
      vehicle: "VW Touran",
      plate: "GER TX300",
      topic: "Sommerreifen wechseln",
      category: "Reifen",
      priority: "Niedrig",
      status: "Geplant",
      appointment: "18.07.2026 11:00",
      shop: "Reifen Wagner",
      costDemo: 220,
      note: "Profiltiefe hinten beobachten.",
      scopes: ["Chef", "Disposition", "Werkstatt"]
    },
    {
      id: "W-103",
      vehicle: "Mercedes V-Klasse",
      plate: "GER TX800",
      topic: "Seitenschaden rechts",
      category: "Schaden",
      priority: "Kritisch",
      status: "Kritisch",
      appointment: "11.07.2026 10:00",
      shop: "Karosserie Seitz",
      costDemo: 1450,
      note: "Fahrzeug derzeit nicht disponierbar.",
      scopes: ["Chef", "Disposition", "Werkstatt"]
    },
    {
      id: "W-104",
      vehicle: "Tesla Model Y",
      plate: "GER TX700",
      topic: "Innenreinigung tief",
      category: "Reinigung",
      priority: "Niedrig",
      status: "Erledigt",
      appointment: "09.07.2026 07:00",
      shop: "CleanCar Germersheim",
      costDemo: 95,
      note: "Kunde VIP-Fahrten vorbereitet.",
      scopes: ["Chef", "Disposition", "Werkstatt"]
    },
    {
      id: "W-105",
      vehicle: "Mercedes B-Klasse",
      plate: "GER TX500",
      topic: "Bremsenkontrolle vorne",
      category: "Kontrolle",
      priority: "Hoch",
      status: "In Arbeit",
      appointment: "10.07.2026 13:30",
      shop: "Autohaus Keller",
      costDemo: 330,
      note: "Ersatzteile bestellt.",
      scopes: ["Chef", "Disposition", "Werkstatt"]
    },
    {
      id: "W-106",
      vehicle: "Skoda Superb",
      plate: "GER TX610",
      topic: "Unklare Fehlermeldung Motor",
      category: "Sonstiges",
      priority: "Mittel",
      status: "Verschoben",
      appointment: "16.07.2026 15:00",
      shop: "Diagnose Zentrum Süd",
      costDemo: 210,
      note: "Termin wegen Teileverzug verschoben.",
      scopes: ["Chef", "Disposition", "Werkstatt"]
    },
    {
      id: "W-107",
      vehicle: "Mercedes E-Klasse",
      plate: "GER TX100",
      topic: "Reifenwarnung Sensor",
      category: "Reifen",
      priority: "Mittel",
      status: "Offen",
      appointment: "13.07.2026 10:30",
      shop: "Reifen Wagner",
      costDemo: 145,
      note: "Sensor kalibrieren.",
      scopes: ["Chef", "Disposition", "Werkstatt"]
    },
    {
      id: "W-108",
      vehicle: "Fahrer-Demo Fahrzeug",
      plate: "GER FD001",
      topic: "Eigenes Fahrzeughinweis: Reifendruck",
      category: "Kontrolle",
      priority: "Mittel",
      status: "Offen",
      appointment: "12.07.2026 09:45",
      shop: "Werkstatt intern",
      costDemo: 35,
      note: "Nur eigene Demo-Sicht für Fahrerrolle.",
      ownOnly: true,
      scopes: ["Chef", "Fahrer", "Werkstatt"]
    },
    {
      id: "W-109",
      vehicle: "Rechnung Werkstatt Q3",
      plate: "-",
      topic: "Werkstattkosten Sammelrechnung",
      category: "Sonstiges",
      priority: "Mittel",
      status: "In Arbeit",
      appointment: "31.07.2026 17:00",
      shop: "Buchhaltung intern",
      costDemo: 3980,
      note: "Nur Kostenübersicht für Buchhaltung.",
      scopes: ["Chef", "Buchhaltung", "Werkstatt"],
      financeOnly: true
    }
  ];

  const statusClassMap = {
    Offen: "workshop-status-open",
    Geplant: "workshop-status-planned",
    "In Arbeit": "workshop-status-progress",
    Erledigt: "workshop-status-done",
    Verschoben: "workshop-status-postponed",
    Kritisch: "workshop-status-critical"
  };

  const priorityClassMap = {
    Niedrig: "workshop-priority-low",
    Mittel: "workshop-priority-medium",
    Hoch: "workshop-priority-high",
    Kritisch: "workshop-priority-critical"
  };

  const state = {
    filter: "Alle",
    searchTerm: ""
  };

  function normalizeText(value) {
    return String(value || "")
      .toLocaleLowerCase("de-DE")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function readRole() {
    if (!window.AdminDemoAuth || typeof window.AdminDemoAuth.readSession !== "function") {
      return "Chef";
    }
    const session = window.AdminDemoAuth.readSession();
    return session && session.role ? session.role : "Chef";
  }

  function getRoleCases() {
    const role = readRole();
    const base = workshopCases.filter((item) => item.scopes.includes(role));

    if (role === "Fahrer") {
      return base.filter((item) => item.ownOnly);
    }

    if (role === "Buchhaltung") {
      return base.filter((item) => item.financeOnly);
    }

    return base;
  }

  function matchesFilter(item) {
    if (state.filter === "Alle") return true;
    if (["Offen", "Geplant", "In Arbeit", "Kritisch"].includes(state.filter)) {
      return item.status === state.filter;
    }
    if (state.filter === "Reifen") return item.category === "Reifen";
    if (state.filter === "TÜV") return item.category === "TÜV/HU";
    if (state.filter === "Schäden") return item.category === "Schaden";
    return true;
  }

  function matchesSearch(item) {
    const query = normalizeText(state.searchTerm).trim();
    if (!query) return true;

    const haystack = normalizeText([
      item.vehicle,
      item.plate,
      item.topic,
      item.shop
    ].join(" "));

    return haystack.includes(query);
  }

  function formatEuro(value) {
    return `${Number(value || 0).toFixed(2).replace(".", ",")} EUR`;
  }

  function renderStats(roleCases) {
    const stats = {
      openMaintenance: roleCases.filter((item) => item.status === "Offen" || item.status === "In Arbeit").length,
      inWorkshop: roleCases.filter((item) => item.status === "In Arbeit" || item.status === "Kritisch").length,
      serviceSoon: roleCases.filter((item) => item.category === "Service" || item.category === "Kontrolle").length,
      tuvSoon: roleCases.filter((item) => item.category === "TÜV/HU").length,
      tireTopics: roleCases.filter((item) => item.category === "Reifen").length,
      damageOpen: roleCases.filter((item) => item.category === "Schaden" && item.status !== "Erledigt").length
    };

    Object.entries(stats).forEach(([key, value]) => {
      const node = document.querySelector(`[data-workshop-stat="${key}"]`);
      if (node) node.textContent = String(value);
    });
  }

  function openModal(title, bodyHtml) {
    const modal = document.querySelector("[data-workshop-modal]");
    const modalTitle = document.querySelector("[data-workshop-modal-title]");
    const modalBody = document.querySelector("[data-workshop-modal-body]");
    if (!modal || !modalTitle || !modalBody) return;

    modalTitle.textContent = title;
    modalBody.innerHTML = bodyHtml;
    modal.hidden = false;
    document.body.classList.add("admin-modal-open");
  }

  function closeModal() {
    const modal = document.querySelector("[data-workshop-modal]");
    if (!modal) return;

    modal.hidden = true;
    document.body.classList.remove("admin-modal-open");
  }

  function buildDetailsModal(item) {
    return `
      <dl class="workshop-modal-list">
        <div><dt>Fahrzeug</dt><dd>${item.vehicle}</dd></div>
        <div><dt>Kennzeichen</dt><dd>${item.plate}</dd></div>
        <div><dt>Thema</dt><dd>${item.topic}</dd></div>
        <div><dt>Kategorie</dt><dd>${item.category}</dd></div>
        <div><dt>Priorität</dt><dd>${item.priority}</dd></div>
        <div><dt>Status</dt><dd>${item.status}</dd></div>
        <div><dt>Termin</dt><dd>${item.appointment}</dd></div>
        <div><dt>Werkstatt</dt><dd>${item.shop}</dd></div>
        <div><dt>Kosten Demo</dt><dd>${formatEuro(item.costDemo)}</dd></div>
        <div><dt>Hinweis</dt><dd>${item.note}</dd></div>
      </dl>
      <p class="workshop-modal-note">Interne Notiz: Demo-Daten – später Backend-Anbindung möglich</p>
    `;
  }

  function buildActionModal(item, action) {
    const messages = {
      plan: `Demo: Terminplanung für ${item.vehicle} wird vorbereitet.`,
      done: `Demo: ${item.topic} als erledigt markieren ist vorbereitet.`,
      cost: `Demo: Kostenerfassung für ${item.vehicle} wird vorbereitet.`,
      remind: `Demo: Erinnerung für ${item.shop} wird vorbereitet.`
    };

    return `<p class="workshop-modal-note">${messages[action] || "Demo-Aktion"} Keine Speicherung ohne Backend.</p>`;
  }

  function renderCases() {
    const grid = document.querySelector("[data-workshop-grid]");
    if (!grid) return;

    const roleCases = getRoleCases();
    renderStats(roleCases);

    const visible = roleCases.filter((item) => matchesFilter(item) && matchesSearch(item));
    if (!visible.length) {
      grid.innerHTML = `
        <article class="workshop-empty admin-empty-state">
          <strong>🧰 Keine Einträge gefunden</strong>
          <p>Keine Einträge gefunden.</p>
          <button class="admin-btn admin-btn-secondary admin-empty-reset" type="button" data-workshop-reset>Filter zurücksetzen</button>
        </article>
      `;
      return;
    }

    grid.innerHTML = visible
      .map((item) => {
        return `
          <article class="workshop-card">
            <header class="workshop-card-head">
              <div>
                <h2>${item.vehicle}</h2>
                <span class="workshop-topic-badge">${item.topic}</span>
              </div>
              <span class="status-pill ${statusClassMap[item.status] || "workshop-status-open"}">${item.status}</span>
            </header>

            <dl class="workshop-meta-list">
              <div><dt>Kennzeichen</dt><dd>${item.plate}</dd></div>
              <div><dt>Kategorie</dt><dd>${item.category}</dd></div>
              <div><dt>Priorität</dt><dd><span class="workshop-priority ${priorityClassMap[item.priority] || "workshop-priority-medium"}">${item.priority}</span></dd></div>
              <div><dt>Termin</dt><dd>${item.appointment}</dd></div>
              <div><dt>Werkstatt</dt><dd>${item.shop}</dd></div>
              <div><dt>Kosten Demo</dt><dd>${formatEuro(item.costDemo)}</dd></div>
            </dl>

            <p class="workshop-note">Hinweis: ${item.note}</p>

            <div class="workshop-actions">
              <button class="admin-btn admin-btn-secondary" type="button" data-workshop-action="details" data-workshop-id="${item.id}">Details</button>
              <button class="admin-btn" type="button" data-workshop-action="plan" data-workshop-id="${item.id}">Termin planen Demo</button>
              <button class="admin-btn admin-btn-warning" type="button" data-workshop-action="done" data-workshop-id="${item.id}">Als erledigt markieren Demo</button>
              <button class="admin-btn admin-btn-secondary" type="button" data-workshop-action="cost" data-workshop-id="${item.id}">Kosten eintragen Demo</button>
              <button class="admin-btn admin-btn-danger" type="button" data-workshop-action="remind" data-workshop-id="${item.id}">Erinnerung Demo</button>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function bindSearch() {
    const input = document.querySelector("[data-workshop-search]");
    if (!input) return;

    input.addEventListener("input", (event) => {
      state.searchTerm = String(event.target.value || "");
      renderCases();
    });
  }

  function bindFilters() {
    const buttons = document.querySelectorAll("[data-workshop-filter]");
    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        state.filter = button.getAttribute("data-workshop-filter") || "Alle";
        buttons.forEach((item) => {
          item.classList.toggle("is-active", item === button);
        });
        renderCases();
      });
    });
  }

  function bindActions() {
    document.addEventListener("click", (event) => {
      const resetButton = event.target.closest("[data-workshop-reset]");
      if (resetButton) {
        state.filter = "Alle";
        state.searchTerm = "";
        const searchInput = document.querySelector("[data-workshop-search]");
        if (searchInput) searchInput.value = "";
        document.querySelectorAll("[data-workshop-filter]").forEach((item) => {
          item.classList.toggle("is-active", (item.getAttribute("data-workshop-filter") || "") === "Alle");
        });
        renderCases();
        return;
      }

      const button = event.target.closest("[data-workshop-action]");
      if (!button) return;

      const action = button.getAttribute("data-workshop-action");
      const id = button.getAttribute("data-workshop-id");
      const item = getRoleCases().find((entry) => entry.id === id);
      if (!item || !action) return;

      if (action === "details") {
        openModal(`Werkstattdetails: ${item.id}`, buildDetailsModal(item));
        return;
      }

      openModal(`Aktion: ${item.id}`, buildActionModal(item, action));
    });
  }

  function bindModalClose() {
    document.querySelectorAll("[data-workshop-modal-close]").forEach((button) => {
      button.addEventListener("click", closeModal);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      const modal = document.querySelector("[data-workshop-modal]");
      if (!modal || modal.hidden) return;
      closeModal();
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    bindSearch();
    bindFilters();
    bindActions();
    bindModalClose();
    renderCases();
  });
})();
