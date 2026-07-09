(() => {
  const shiftSlots = [
    {
      id: "early",
      label: "05:00–13:00",
      shift: "Früh",
      summary: "Morgenschicht mit Klinik- und Schulfahrten"
    },
    {
      id: "late",
      label: "13:00–21:00",
      shift: "Spät",
      summary: "Nachmittag bis Feierabendverkehr"
    },
    {
      id: "night",
      label: "21:00–05:00",
      shift: "Nacht",
      summary: "Nachtfahrten und Flughafenzubringer"
    }
  ];

  const assignments = [
    {
      id: "S-100",
      driver: "Emre Kaya",
      vehicle: "Mercedes E-Klasse",
      plate: "GER TX100",
      shift: "Früh",
      status: "Aktiv",
      breakMinutes: 30,
      start: "05:00",
      end: "13:00",
      workHoursDemo: 7.5,
      overtimeDemo: 0.5,
      notes: "Klinikfahrten priorisiert",
      warnings: []
    },
    {
      id: "S-101",
      driver: "Julia Schneider",
      vehicle: "-",
      plate: "-",
      shift: "Früh",
      status: "Bereitschaft",
      breakMinutes: 20,
      start: "05:30",
      end: "13:00",
      workHoursDemo: 7,
      overtimeDemo: 0,
      notes: "Wartet auf Fahrzeugfreigabe",
      warnings: ["Kein Fahrzeug", "Schicht endet bald"]
    },
    {
      id: "S-102",
      driver: "Sabine Hoffmann",
      vehicle: "VW Caddy Rollstuhl",
      plate: "GER TX200",
      shift: "Spät",
      status: "Aktiv",
      breakMinutes: 25,
      start: "13:00",
      end: "21:00",
      workHoursDemo: 7.6,
      overtimeDemo: 0.4,
      notes: "Rollstuhlfahrten Südpfalz",
      warnings: ["Überschneidung"]
    },
    {
      id: "S-103",
      driver: "Fatma Aydin",
      vehicle: "VW Caddy Rollstuhl",
      plate: "GER TX200",
      shift: "Spät",
      status: "Pause",
      breakMinutes: 35,
      start: "13:30",
      end: "21:00",
      workHoursDemo: 7.1,
      overtimeDemo: 0.2,
      notes: "Pausenblock in der Leitstelle geplant",
      warnings: ["Überschneidung"]
    },
    {
      id: "S-104",
      driver: "Daniel Kaya",
      vehicle: "Toyota Prius",
      plate: "GER TX300",
      shift: "Nacht",
      status: "Bereit",
      breakMinutes: 30,
      start: "21:00",
      end: "05:00",
      workHoursDemo: 7.3,
      overtimeDemo: 0.7,
      notes: "Flughafentransfers in der Nacht",
      warnings: ["Schicht endet bald"]
    },
    {
      id: "S-105",
      driver: "Mehmet Yildiz",
      vehicle: "-",
      plate: "-",
      shift: "Frei",
      status: "Frei",
      breakMinutes: 0,
      start: "-",
      end: "-",
      workHoursDemo: 0,
      overtimeDemo: 0,
      notes: "Regulärer freier Tag",
      warnings: []
    },
    {
      id: "S-106",
      driver: "Aylin Tunc",
      vehicle: "-",
      plate: "-",
      shift: "Urlaub",
      status: "Urlaub",
      breakMinutes: 0,
      start: "-",
      end: "-",
      workHoursDemo: 0,
      overtimeDemo: 0,
      notes: "Urlaub bis einschließlich 12.07",
      warnings: []
    },
    {
      id: "S-107",
      driver: "Michael Becker",
      vehicle: "-",
      plate: "-",
      shift: "Krank",
      status: "Krank",
      breakMinutes: 0,
      start: "-",
      end: "-",
      workHoursDemo: 0,
      overtimeDemo: 0,
      notes: "Krankmeldung liegt vor",
      warnings: []
    }
  ];

  const vehicleMapping = [
    { plate: "GER TX100", driver: "Emre Kaya", state: "ok" },
    { plate: "GER TX200", driver: "Sabine Hoffmann / Fatma Aydin", state: "conflict" },
    { plate: "GER TX300", driver: "Daniel Kaya", state: "ok" },
    { plate: "GER TX400", driver: "Kein Fahrer", state: "missing-driver" }
  ];

  const state = {
    activeFilter: "Alle",
    searchTerm: ""
  };

  function normalizeText(value) {
    return String(value || "")
      .toLocaleLowerCase("de-DE")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function formatHours(value) {
    return `${Number(value || 0).toFixed(1).replace(".", ",")} h`;
  }

  function getMissingAssignments() {
    const redWarnings = assignments.reduce((count, item) => {
      return count + item.warnings.filter((warning) => warning === "Kein Fahrzeug" || warning === "Kein Fahrer" || warning === "Überschneidung").length;
    }, 0);

    const mappingIssues = vehicleMapping.filter((item) => item.state !== "ok").length;
    return redWarnings + mappingIssues;
  }

  function renderStats() {
    const driversToday = assignments.filter((item) => ["Früh", "Spät", "Nacht"].includes(item.shift)).length;
    const vehiclesAvailable = vehicleMapping.filter((item) => item.state === "ok").length;

    const stats = {
      driversToday,
      vehiclesAvailable,
      early: assignments.filter((item) => item.shift === "Früh").length,
      late: assignments.filter((item) => item.shift === "Spät").length,
      night: assignments.filter((item) => item.shift === "Nacht").length,
      missingAssignments: getMissingAssignments()
    };

    Object.entries(stats).forEach(([key, value]) => {
      const node = document.querySelector(`[data-shift-stat="${key}"]`);
      if (node) node.textContent = String(value);
    });
  }

  function renderTimeline() {
    const timeline = document.querySelector("[data-shift-timeline]");
    if (!timeline) return;

    timeline.innerHTML = shiftSlots.map((slot) => {
      const drivers = assignments
        .filter((item) => item.shift === slot.shift)
        .map((item) => `${item.driver} (${item.plate})`);

      const listItems = drivers.length
        ? drivers.map((entry) => `<li>${entry}</li>`).join("")
        : "<li>Keine aktive Besetzung</li>";

      return `
        <article class="shift-timeline-slot">
          <h3>${slot.label}</h3>
          <p>${slot.summary}</p>
          <ul>${listItems}</ul>
        </article>
      `;
    }).join("");
  }

  function matchesFilter(item) {
    if (state.activeFilter === "Alle") return true;
    return item.shift === state.activeFilter;
  }

  function matchesSearch(item) {
    const query = normalizeText(state.searchTerm).trim();
    if (!query) return true;

    const haystack = normalizeText([
      item.driver,
      item.vehicle,
      item.plate
    ].join(" "));

    return haystack.includes(query);
  }

  function getVisibleAssignments() {
    return assignments.filter((item) => matchesFilter(item) && matchesSearch(item));
  }

  function warningClass(warning) {
    if (warning === "Schicht endet bald") return "shift-warning-yellow";
    return "shift-warning-red";
  }

  function buildDetailsModal(item) {
    return `
      <dl class="shift-modal-list">
        <div><dt>Fahrer</dt><dd>${item.driver}</dd></div>
        <div><dt>Fahrzeug</dt><dd>${item.plate} ${item.vehicle !== "-" ? `(${item.vehicle})` : ""}</dd></div>
        <div><dt>Beginn</dt><dd>${item.start}</dd></div>
        <div><dt>Ende</dt><dd>${item.end}</dd></div>
        <div><dt>Pause</dt><dd>${item.breakMinutes} Min</dd></div>
        <div><dt>Arbeitszeit</dt><dd>${formatHours(item.workHoursDemo)}</dd></div>
        <div><dt>Notizen</dt><dd>${item.notes}</dd></div>
      </dl>
      <p class="shift-modal-note">Demo-Daten - später Backend-Anbindung möglich</p>
    `;
  }

  function buildActionModal(item, action) {
    const messages = {
      assign: `Demo: Fahrerzuweisung für ${item.driver} wird vorbereitet. Keine Speicherung ohne Backend.`,
      vehicle: `Demo: Fahrzeugwechsel für ${item.driver} wird vorbereitet. Keine Speicherung ohne Backend.`,
      break: `Demo: Pauseneintrag für ${item.driver} wird vorbereitet. Keine Speicherung ohne Backend.`,
      shift: `Demo: Schichtänderung für ${item.driver} wird vorbereitet. Keine Speicherung ohne Backend.`
    };

    return `<p class="shift-modal-note">${messages[action] || "Demo-Aktion"}</p>`;
  }

  function openModal(title, bodyHtml) {
    const modal = document.querySelector("[data-shift-modal]");
    const titleNode = document.querySelector("[data-shift-modal-title]");
    const bodyNode = document.querySelector("[data-shift-modal-body]");
    if (!modal || !titleNode || !bodyNode) return;

    titleNode.textContent = title;
    bodyNode.innerHTML = bodyHtml;
    modal.hidden = false;
    document.body.classList.add("admin-modal-open");
  }

  function closeModal() {
    const modal = document.querySelector("[data-shift-modal]");
    if (!modal) return;

    modal.hidden = true;
    document.body.classList.remove("admin-modal-open");
  }

  function renderDrivers() {
    const grid = document.querySelector("[data-shift-driver-grid]");
    if (!grid) return;

    const visible = getVisibleAssignments();
    if (!visible.length) {
      grid.innerHTML = `
        <article class="shift-empty admin-empty-state">
          <strong>🕒 Keine Einträge gefunden</strong>
          <p>Keine Einträge gefunden.</p>
          <button class="admin-btn admin-btn-secondary admin-empty-reset" type="button" data-shift-reset>Filter zurücksetzen</button>
        </article>
      `;
      return;
    }

    grid.innerHTML = visible.map((item) => {
      const warningMarkup = item.warnings.length
        ? `<div class="shift-warning-chip-list">${item.warnings.map((warning) => `<span class="shift-warning-chip ${warningClass(warning)}">${warning}</span>`).join("")}</div>`
        : "";

      return `
        <article class="shift-driver-card">
          <header class="shift-driver-head">
            <div>
              <h2>${item.driver}</h2>
              <span class="shift-role">${item.shift}</span>
            </div>
            <span class="status-pill">${item.status}</span>
          </header>

          <dl class="shift-meta-list">
            <div>
              <dt>Fahrzeug</dt>
              <dd>${item.vehicle}</dd>
            </div>
            <div>
              <dt>Kennzeichen</dt>
              <dd>${item.plate}</dd>
            </div>
            <div>
              <dt>Pause</dt>
              <dd>${item.breakMinutes} Min</dd>
            </div>
            <div>
              <dt>Arbeitsstunden Demo</dt>
              <dd>${formatHours(item.workHoursDemo)}</dd>
            </div>
            <div>
              <dt>Überstunden Demo</dt>
              <dd>${formatHours(item.overtimeDemo)}</dd>
            </div>
            <div>
              <dt>Schichtzeit</dt>
              <dd>${item.start} - ${item.end}</dd>
            </div>
          </dl>

          ${warningMarkup}

          <div class="shift-actions">
            <button class="admin-btn" type="button" data-shift-action="details" data-shift-id="${item.id}">Details</button>
            <button class="admin-btn" type="button" data-shift-action="assign" data-shift-id="${item.id}">Fahrer zuweisen</button>
            <button class="admin-btn" type="button" data-shift-action="vehicle" data-shift-id="${item.id}">Fahrzeug wechseln</button>
            <button class="admin-btn" type="button" data-shift-action="break" data-shift-id="${item.id}">Pause eintragen</button>
            <button class="admin-btn" type="button" data-shift-action="shift" data-shift-id="${item.id}">Schicht ändern</button>
          </div>
        </article>
      `;
    }).join("");
  }

  function renderWarnings() {
    const warningList = document.querySelector("[data-shift-warning-list]");
    if (!warningList) return;

    const entries = [];

    assignments.forEach((item) => {
      item.warnings.forEach((warning) => {
        entries.push({
          text: `${item.driver}: ${warning}`,
          level: warning === "Schicht endet bald" ? "Gelb" : "Rot"
        });
      });
    });

    vehicleMapping
      .filter((item) => item.state !== "ok")
      .forEach((item) => {
        const text = item.state === "missing-driver"
          ? `${item.plate}: Kein Fahrer zugewiesen`
          : `${item.plate}: Überschneidung in der Zuordnung`;

        entries.push({ text, level: "Rot" });
      });

    warningList.innerHTML = entries.map((entry) => {
      const cls = entry.level === "Gelb" ? "shift-warning-yellow" : "shift-warning-red";
      return `
        <article class="shift-warning-item">
          <strong class="shift-warning-chip ${cls}">${entry.level}</strong>
          <p>${entry.text}</p>
        </article>
      `;
    }).join("");
  }

  function renderVehicleMapping() {
    const list = document.querySelector("[data-shift-mapping-list]");
    if (!list) return;

    list.innerHTML = vehicleMapping.map((entry) => {
      return `
        <article class="shift-mapping-item">
          <strong>${entry.plate}</strong>
          <p>→ ${entry.driver}</p>
        </article>
      `;
    }).join("");
  }

  function bindFilters() {
    const buttons = document.querySelectorAll("[data-shift-filter]");
    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        state.activeFilter = button.getAttribute("data-shift-filter") || "Alle";
        buttons.forEach((item) => item.classList.remove("is-active"));
        button.classList.add("is-active");
        renderDrivers();
      });
    });
  }

  function bindSearch() {
    const input = document.querySelector("[data-shift-search]");
    if (!input) return;

    input.addEventListener("input", (event) => {
      state.searchTerm = String(event.target.value || "");
      renderDrivers();
    });
  }

  function bindActions() {
    document.addEventListener("click", (event) => {
      const resetButton = event.target.closest("[data-shift-reset]");
      if (resetButton) {
        state.activeFilter = "Alle";
        state.searchTerm = "";
        const searchInput = document.querySelector("[data-shift-search]");
        if (searchInput) searchInput.value = "";
        document.querySelectorAll("[data-shift-filter]").forEach((item) => {
          item.classList.toggle("is-active", (item.getAttribute("data-shift-filter") || "") === "Alle");
        });
        renderDrivers();
        return;
      }

      const button = event.target.closest("[data-shift-action]");
      if (!button) return;

      const action = button.getAttribute("data-shift-action");
      const id = button.getAttribute("data-shift-id");
      const assignment = assignments.find((item) => item.id === id);
      if (!assignment || !action) return;

      if (action === "details") {
        openModal(`Schichtdetails: ${assignment.driver}`, buildDetailsModal(assignment));
        return;
      }

      openModal(`Aktion: ${assignment.driver}`, buildActionModal(assignment, action));
    });
  }

  function bindModalClose() {
    const closeButtons = document.querySelectorAll("[data-shift-modal-close]");
    closeButtons.forEach((button) => {
      button.addEventListener("click", closeModal);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      const modal = document.querySelector("[data-shift-modal]");
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
  renderTimeline();
  renderDrivers();
  renderWarnings();
  renderVehicleMapping();
  bindFilters();
  bindSearch();
  bindActions();
  bindModalClose();
  bindDisabledNavItems();
})();
