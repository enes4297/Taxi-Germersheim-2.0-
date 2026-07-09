(() => {
  // Nur Demo-Karte ohne echtes GPS oder Backend.
  const fleetVehicles = [
    { plate: "GER TX100", vehicle: "Mercedes E-Klasse", driver: "Max Mustermann", status: "Frei", location: "Germersheim Bahnhof", updatedAt: "vor 1 Min", rideDemo: "Bereit für nächste Fahrt", x: 42, y: 48 },
    { plate: "GER TX200", vehicle: "VW Touran", driver: "Selin Kara", status: "Unterwegs", location: "Lingenfeld Ortsmitte", updatedAt: "vor 40 Sek", rideDemo: "Fahrt nach Speyer", x: 58, y: 38 },
    { plate: "GER TX300", vehicle: "VW Touran", driver: "Fahrer-Demo", status: "Frei", location: "Germersheim Süd", updatedAt: "vor 2 Min", rideDemo: "Eigene Demo-Fahrt", x: 36, y: 66, ownOnly: true },
    { plate: "GER TX400", vehicle: "VW Touran", driver: "Ali Demir", status: "Pause", location: "Sondernheim", updatedAt: "vor 5 Min", rideDemo: "Pause bis 14:00", x: 30, y: 54 },
    { plate: "GER TX500", vehicle: "Mercedes B-Klasse", driver: "Sabine Hoffmann", status: "Unterwegs", location: "Rülzheim", updatedAt: "vor 50 Sek", rideDemo: "Krankenfahrt Reha", x: 66, y: 62 },
    { plate: "GER TX600", vehicle: "Mercedes E-Klasse", driver: "Michael Braun", status: "Offline", location: "Fuhrpark Nord", updatedAt: "vor 13 Min", rideDemo: "Fahrzeug nicht aktiv", x: 22, y: 34 },
    { plate: "GER TX700", vehicle: "Tesla Model Y", driver: "Julia Schneider", status: "Frei", location: "Germersheim Innenstadt", updatedAt: "vor 2 Min", rideDemo: "Standby Innenstadt", x: 50, y: 52 },
    { plate: "GER TX800", vehicle: "Mercedes V-Klasse", driver: "Daniel Klein", status: "Werkstatt", location: "Werkstatt Seitz", updatedAt: "vor 9 Min", rideDemo: "Schadensaufnahme", x: 72, y: 30 }
  ];

  const statusClassMap = {
    Frei: "live-status-free",
    Unterwegs: "live-status-onroute",
    Pause: "live-status-pause",
    Werkstatt: "live-status-workshop",
    Offline: "live-status-offline"
  };

  const state = {
    filter: "Alle"
  };

  function readRole() {
    if (!window.AdminDemoAuth || typeof window.AdminDemoAuth.readSession !== "function") {
      return "Chef";
    }
    const session = window.AdminDemoAuth.readSession();
    return session && session.role ? session.role : "Chef";
  }

  function getRoleFleet() {
    const role = readRole();
    if (role === "Fahrer") {
      return fleetVehicles.filter((item) => item.ownOnly === true || item.driver === "Fahrer-Demo");
    }
    return fleetVehicles;
  }

  function matchesFilter(item) {
    if (state.filter === "Alle") return true;
    return item.status === state.filter;
  }

  function getVisibleFleet() {
    return getRoleFleet().filter((item) => matchesFilter(item));
  }

  function renderStats(roleFleet) {
    const stats = {
      online: roleFleet.filter((item) => item.status !== "Offline").length,
      onRoute: roleFleet.filter((item) => item.status === "Unterwegs").length,
      free: roleFleet.filter((item) => item.status === "Frei").length,
      pause: roleFleet.filter((item) => item.status === "Pause").length,
      workshop: roleFleet.filter((item) => item.status === "Werkstatt").length,
      lastUpdate: roleFleet[0] ? roleFleet[0].updatedAt : "-"
    };

    Object.entries(stats).forEach(([key, value]) => {
      const node = document.querySelector(`[data-live-stat="${key}"]`);
      if (!node) return;
      node.textContent = String(value);
    });
  }

  function openModal(title, bodyHtml) {
    const modal = document.querySelector("[data-live-modal]");
    const modalTitle = document.querySelector("[data-live-modal-title]");
    const modalBody = document.querySelector("[data-live-modal-body]");
    if (!modal || !modalTitle || !modalBody) return;

    modalTitle.textContent = title;
    modalBody.innerHTML = bodyHtml;
    modal.hidden = false;
    document.body.classList.add("admin-modal-open");
  }

  function closeModal() {
    const modal = document.querySelector("[data-live-modal]");
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove("admin-modal-open");
  }

  function buildDetailsModal(item) {
    return `
      <dl class="live-modal-list">
        <div><dt>Kennzeichen</dt><dd>${item.plate}</dd></div>
        <div><dt>Fahrzeug</dt><dd>${item.vehicle}</dd></div>
        <div><dt>Fahrer</dt><dd>${item.driver}</dd></div>
        <div><dt>Status</dt><dd>${item.status}</dd></div>
        <div><dt>Letzter Standort</dt><dd>${item.location}</dd></div>
        <div><dt>Letztes Update</dt><dd>${item.updatedAt}</dd></div>
        <div><dt>Aktuelle Fahrt Demo</dt><dd>${item.rideDemo}</dd></div>
      </dl>
      <p class="live-modal-note">Interne Notiz: Demo-Karte ohne echtes GPS oder Backend</p>
    `;
  }

  function buildActionModal(item, action) {
    const messages = {
      call: `Demo: Fahreranruf an ${item.driver} (${item.plate}) wird vorbereitet.`,
      route: `Demo: Routenansicht für ${item.plate} wird simuliert.`,
      center: `Demo: Karte wird auf ${item.location} zentriert.`
    };

    return `<p class="live-modal-note">${messages[action] || "Demo-Aktion"} Keine Speicherung ohne Backend.</p>`;
  }

  function renderMapAndList() {
    const mapSurface = document.querySelector("[data-live-map-surface]");
    const listWrap = document.querySelector("[data-live-list]");
    if (!mapSurface || !listWrap) return;

    const roleFleet = getRoleFleet();
    renderStats(roleFleet);

    const visible = roleFleet.filter((item) => matchesFilter(item));

    if (!visible.length) {
      mapSurface.innerHTML = `
        <article class="admin-empty-state">
          <strong>🗺️ Keine Einträge gefunden</strong>
          <p>Keine Einträge gefunden.</p>
          <button class="admin-btn admin-btn-secondary admin-empty-reset" type="button" data-live-reset>Filter zurücksetzen</button>
        </article>
      `;
      listWrap.innerHTML = "";
      return;
    }

    mapSurface.innerHTML = visible
      .map((item) => {
        return `
          <button
            class="live-marker ${statusClassMap[item.status] || "live-status-offline"}"
            type="button"
            style="left:${item.x}%;top:${item.y}%"
            data-live-action="details"
            data-live-plate="${item.plate}"
            aria-label="Marker ${item.plate}"
          >
            ${item.plate}
          </button>
        `;
      })
      .join("");

    listWrap.innerHTML = visible
      .map((item) => {
        return `
          <article class="live-list-item">
            <header class="live-list-head">
              <h3>${item.plate}</h3>
              <span class="status-pill ${statusClassMap[item.status] || "live-status-offline"}">${item.status}</span>
            </header>

            <dl class="live-meta-list">
              <div><dt>Fahrzeug</dt><dd>${item.vehicle}</dd></div>
              <div><dt>Fahrer</dt><dd>${item.driver}</dd></div>
              <div><dt>Letzter Standort Demo</dt><dd>${item.location}</dd></div>
              <div><dt>Letztes Update Demo</dt><dd>${item.updatedAt}</dd></div>
            </dl>

            <div class="live-actions">
              <button class="admin-btn admin-btn-secondary" type="button" data-live-action="details" data-live-plate="${item.plate}">Details</button>
              <button class="admin-btn" type="button" data-live-action="call" data-live-plate="${item.plate}">Fahrer anrufen Demo</button>
              <button class="admin-btn admin-btn-warning" type="button" data-live-action="route" data-live-plate="${item.plate}">Route anzeigen Demo</button>
              <button class="admin-btn admin-btn-secondary" type="button" data-live-action="center" data-live-plate="${item.plate}">Fahrzeug zentrieren Demo</button>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function bindFilterButtons() {
    const buttons = document.querySelectorAll("[data-live-filter]");
    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        state.filter = button.getAttribute("data-live-filter") || "Alle";
        buttons.forEach((item) => {
          item.classList.toggle("is-active", item === button);
        });
        renderMapAndList();
      });
    });
  }

  function bindActions() {
    document.addEventListener("click", (event) => {
      const resetButton = event.target.closest("[data-live-reset]");
      if (resetButton) {
        state.filter = "Alle";
        document.querySelectorAll("[data-live-filter]").forEach((item) => {
          item.classList.toggle("is-active", (item.getAttribute("data-live-filter") || "") === "Alle");
        });
        renderMapAndList();
        return;
      }

      const actionButton = event.target.closest("[data-live-action]");
      if (!actionButton) return;

      const action = actionButton.getAttribute("data-live-action");
      const plate = actionButton.getAttribute("data-live-plate");
      const item = getRoleFleet().find((entry) => entry.plate === plate);
      if (!item || !action) return;

      if (action === "details") {
        openModal(`Fahrzeugdetails: ${item.plate}`, buildDetailsModal(item));
        return;
      }

      openModal(`Aktion: ${item.plate}`, buildActionModal(item, action));
    });
  }

  function bindModalClose() {
    document.querySelectorAll("[data-live-modal-close]").forEach((button) => {
      button.addEventListener("click", closeModal);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      const modal = document.querySelector("[data-live-modal]");
      if (!modal || modal.hidden) return;
      closeModal();
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    bindFilterButtons();
    bindActions();
    bindModalClose();
    renderMapAndList();
  });
})();
