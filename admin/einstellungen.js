(() => {
  function readRole() {
    if (!window.AdminDemoAuth || typeof window.AdminDemoAuth.readSession !== "function") {
      return null;
    }

    const session = window.AdminDemoAuth.readSession();
    return session && session.role ? session.role : null;
  }

  function applyRoleVisibility(role) {
    const sections = document.querySelectorAll("[data-settings-roles]");
    sections.forEach((section) => {
      const allowed = String(section.getAttribute("data-settings-roles") || "")
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);

      section.hidden = !allowed.includes(role);
    });
  }

  function bindContactForm() {
    const form = document.querySelector("[data-settings-contact-form]");
    const note = document.querySelector("[data-settings-save-note]");
    if (!form || !note) return;

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      note.textContent = `Demo - keine echten Änderungen gespeichert (${new Date().toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit"
      })})`;
    });
  }

  function bindNotificationToggles() {
    const wrap = document.querySelector("[data-settings-toggles]");
    const note = document.querySelector("[data-settings-toggle-note]");
    if (!wrap || !note) return;

    // Nur Demo-Benachrichtigungen ohne Backend
    wrap.addEventListener("change", (event) => {
      if (!event.target.matches("input[type='checkbox']")) return;
      note.textContent = "Demo - keine echten Änderungen gespeichert";
    });
  }

  function loadLiveVehicles() {
    const parsed = JSON.parse(localStorage.getItem("adminLiveDispoV131") || "{}") || {};
    return Array.isArray(parsed.vehicles) ? parsed.vehicles : [];
  }

  function renderPajPanel() {
    if (!window.AdminPlanningDemoV25) return;
    const vehicleSelect = document.querySelector("[data-paj-vehicle-select]");
    const list = document.querySelector("[data-paj-list]");
    const connectedCount = document.querySelector("[data-paj-connected-count]");
    const unassignedCount = document.querySelector("[data-paj-unassigned-count]");
    const lastUpdate = document.querySelector("[data-paj-last-update]");
    if (!vehicleSelect || !list || !connectedCount || !unassignedCount || !lastUpdate) return;

    const vehicles = loadLiveVehicles();
    const coreState = window.AdminPlanningDemoV25.loadState();
    const assignments = coreState.pajAssignments || {};

    vehicleSelect.innerHTML = vehicles.map((vehicle) => `<option value="${vehicle.id}">${vehicle.plate || vehicle.name || vehicle.id}</option>`).join("");

    const rows = vehicles.map((vehicle) => {
      const row = assignments[vehicle.id];
      return `
        <article class="settings-user-item">
          <strong>${vehicle.plate || vehicle.name || vehicle.id}</strong>
          <span>${row ? `${row.deviceId} · ${row.connected ? "verbunden" : "nicht verbunden"}` : "kein Tracker zugeordnet"}</span>
          <small>${row ? `Letzte Position: ${row.lastPositionLabel || "unbekannt"} · ${row.lastUpdated || "-"}` : "GPS offline"}</small>
        </article>
      `;
    }).join("");

    const connected = Object.values(assignments).filter((row) => row && row.connected).length;
    connectedCount.textContent = String(connected);
    unassignedCount.textContent = String(Math.max(0, 4 - Object.keys(assignments).length));
    lastUpdate.textContent = Object.values(assignments)[0] && Object.values(assignments)[0].lastUpdated ? Object.values(assignments)[0].lastUpdated : "-";
    list.innerHTML = rows || '<article class="settings-user-item"><strong>Keine Demo-Zuordnungen</strong></article>';
  }

  function bindPajPanel() {
    const form = document.querySelector("[data-paj-form]");
    if (!form || !window.AdminPlanningDemoV25) return;

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const coreState = window.AdminPlanningDemoV25.loadState();
      const vehicleId = String(form.elements.vehicleId.value || "");
      window.AdminPlanningDemoV25.assignPajTracker(coreState, vehicleId, {
        deviceId: String(form.elements.trackerId.value || "PAJ-101"),
        vehicleName: String(form.elements.vehicleName.value || "Demo-Fahrzeug"),
        connected: true,
        lastPositionLabel: "Germersheim",
        movementStatus: "steht",
        speed: "0 km/h"
      });
      renderPajPanel();
    });

    const testBtn = document.querySelector("[data-paj-test]");
    if (testBtn) {
      testBtn.addEventListener("click", () => {
        renderPajPanel();
      });
    }

    const refreshBtn = document.querySelector("[data-paj-refresh]");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => {
        const coreState = window.AdminPlanningDemoV25.loadState();
        Object.keys(coreState.pajAssignments || {}).forEach((vehicleId, index) => {
          window.AdminPlanningDemoV25.assignPajTracker(coreState, vehicleId, {
            ...coreState.pajAssignments[vehicleId],
            connected: index % 2 === 0,
            lastPositionLabel: index % 2 === 0 ? "Speyer" : "Germersheim",
            movementStatus: index % 2 === 0 ? "in Bewegung" : "steht",
            speed: index % 2 === 0 ? "22 km/h" : "0 km/h"
          });
        });
        renderPajPanel();
      });
    }

    const removeBtn = document.querySelector("[data-paj-remove]");
    if (removeBtn) {
      removeBtn.addEventListener("click", () => {
        const coreState = window.AdminPlanningDemoV25.loadState();
        const vehicleId = String(form.elements.vehicleId.value || "");
        if (coreState.pajAssignments && coreState.pajAssignments[vehicleId]) {
          delete coreState.pajAssignments[vehicleId];
          window.AdminPlanningDemoV25.saveState(coreState);
        }
        renderPajPanel();
      });
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const role = readRole();
    if (role) {
      applyRoleVisibility(role);
    }
    bindContactForm();
    bindNotificationToggles();
    bindPajPanel();
    renderPajPanel();
  });
})();
