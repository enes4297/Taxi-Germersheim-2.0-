(() => {
  // Demo-Verlauf ohne echte Speicherung. Struktur ist backendfreundlich gehalten.
  const demoEvents = [
    {
      id: "EV-001",
      time: "09:14",
      user: "admin",
      role: "Chef",
      action: "Login erfolgreich",
      area: "Login",
      object: "Session admin",
      status: "Erfolg",
      hint: "Chef-Login über Demo-Authentifizierung.",
      type: "Login",
      ownDemo: false
    },
    {
      id: "EV-002",
      time: "09:21",
      user: "dispo",
      role: "Disposition",
      action: "Fahrt bestätigt",
      area: "Fahrten",
      object: "FRT-2048",
      status: "Info",
      hint: "Abholung in Germersheim bestätigt.",
      type: "Fahrten",
      ownDemo: false
    },
    {
      id: "EV-003",
      time: "09:26",
      user: "dispo",
      role: "Disposition",
      action: "Fahrer zugewiesen",
      area: "Fahrer",
      object: "GER TX200 -> Selin Kara",
      status: "Info",
      hint: "Schichtübergabe erfolgreich zugeordnet.",
      type: "Fahrer",
      ownDemo: false
    },
    {
      id: "EV-004",
      time: "09:33",
      user: "werkstatt",
      role: "Werkstatt",
      action: "Fahrzeugstatus geändert",
      area: "Fahrzeuge",
      object: "GER TX800",
      status: "Warnung",
      hint: "Status auf Werkstatt gesetzt.",
      type: "Fahrzeuge",
      ownDemo: false
    },
    {
      id: "EV-005",
      time: "09:41",
      user: "billing",
      role: "Buchhaltung",
      action: "Rechnung als bezahlt markiert",
      area: "Rechnungen",
      object: "RG-2026-1044",
      status: "Erfolg",
      hint: "Zahlungseingang demo-seitig verbucht.",
      type: "Rechnungen",
      ownDemo: false
    },
    {
      id: "EV-006",
      time: "09:48",
      user: "admin",
      role: "Chef",
      action: "Dokument geprüft",
      area: "Dokumente",
      object: "FAHRER-PSCHEIN-021",
      status: "Info",
      hint: "Compliance-Prüfung durchgeführt.",
      type: "Dokumente",
      ownDemo: false
    },
    {
      id: "EV-007",
      time: "09:54",
      user: "admin",
      role: "Chef",
      action: "Benutzerrolle geändert Demo",
      area: "Benutzer",
      object: "dispo -> Support",
      status: "Kritisch",
      hint: "Rollenwechsel erfordert spätere Backend-Freigabe.",
      type: "Kritisch",
      ownDemo: false
    },
    {
      id: "EV-008",
      time: "10:02",
      user: "fahrer",
      role: "Fahrer",
      action: "Logout",
      area: "Login",
      object: "Session fahrer",
      status: "Info",
      hint: "Eigene Demo-Aktivität erfolgreich beendet.",
      type: "Login",
      ownDemo: true
    }
  ];

  const statusClassMap = {
    Erfolg: "audit-status-success",
    Info: "audit-status-info",
    Warnung: "audit-status-warning",
    Kritisch: "audit-status-critical"
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

  function readSession() {
    if (!window.AdminDemoAuth || typeof window.AdminDemoAuth.readSession !== "function") {
      return { role: "Chef", user: "admin" };
    }

    const session = window.AdminDemoAuth.readSession();
    if (!session) {
      return { role: "Chef", user: "admin" };
    }

    return {
      role: session.role || "Chef",
      user: session.user || "admin"
    };
  }

  function getRoleEvents() {
    const session = readSession();
    const role = session.role;

    if (role === "Chef") {
      return demoEvents;
    }

    if (role === "Disposition") {
      return demoEvents.filter((item) => ["Fahrten", "Fahrzeuge", "Fahrer"].includes(item.area));
    }

    if (role === "Buchhaltung") {
      return demoEvents.filter((item) => item.area === "Rechnungen");
    }

    if (role === "Fahrer") {
      return demoEvents.filter((item) => item.user === session.user || item.ownDemo === true);
    }

    return [];
  }

  function matchesFilter(item) {
    if (state.filter === "Alle") return true;
    if (state.filter === "Kritisch") return item.status === "Kritisch";
    return item.type === state.filter || item.area === state.filter;
  }

  function matchesSearch(item) {
    const query = normalizeText(state.searchTerm).trim();
    if (!query) return true;

    const haystack = normalizeText([
      item.user,
      item.action,
      item.area,
      item.object,
      item.hint
    ].join(" "));

    return haystack.includes(query);
  }

  function renderStats(roleEvents) {
    const stats = {
      eventsToday: roleEvents.length,
      critical: roleEvents.filter((item) => item.status === "Kritisch").length,
      login: roleEvents.filter((item) => item.type === "Login").length,
      changes: roleEvents.filter((item) => ["Fahrten", "Fahrer", "Fahrzeuge", "Rechnungen", "Dokumente", "Benutzer"].includes(item.area)).length,
      systemNotes: roleEvents.filter((item) => item.status === "Warnung" || item.status === "Info").length
    };

    Object.entries(stats).forEach(([key, value]) => {
      const node = document.querySelector(`[data-audit-stat="${key}"]`);
      if (!node) return;
      node.textContent = String(value);
    });
  }

  function openModal(title, bodyHtml) {
    const modal = document.querySelector("[data-audit-modal]");
    const modalTitle = document.querySelector("[data-audit-modal-title]");
    const modalBody = document.querySelector("[data-audit-modal-body]");
    if (!modal || !modalTitle || !modalBody) return;

    modalTitle.textContent = title;
    modalBody.innerHTML = bodyHtml;
    modal.hidden = false;
    document.body.classList.add("admin-modal-open");
  }

  function closeModal() {
    const modal = document.querySelector("[data-audit-modal]");
    if (!modal) return;

    modal.hidden = true;
    document.body.classList.remove("admin-modal-open");
  }

  function buildDetailModal(item) {
    return `
      <dl class="audit-modal-list">
        <div><dt>Zeit</dt><dd>${item.time}</dd></div>
        <div><dt>Benutzer</dt><dd>${item.user}</dd></div>
        <div><dt>Rolle</dt><dd>${item.role}</dd></div>
        <div><dt>Aktion</dt><dd>${item.action}</dd></div>
        <div><dt>Bereich</dt><dd>${item.area}</dd></div>
        <div><dt>Objekt</dt><dd>${item.object}</dd></div>
        <div><dt>Status</dt><dd>${item.status}</dd></div>
        <div><dt>Hinweis</dt><dd>${item.hint}</dd></div>
      </dl>
      <p class="audit-modal-note">Interne Notiz: Demo-Verlauf ohne echte Speicherung</p>
    `;
  }

  function renderEvents() {
    const grid = document.querySelector("[data-audit-grid]");
    if (!grid) return;

    const roleEvents = getRoleEvents();
    renderStats(roleEvents);

    const visible = roleEvents.filter((item) => matchesFilter(item) && matchesSearch(item));

    if (!visible.length) {
      grid.innerHTML = `
        <article class="audit-empty admin-empty-state">
          <strong>📚 Keine Ereignisse gefunden</strong>
          <p>Keine Einträge gefunden.</p>
          <button class="admin-btn admin-btn-secondary admin-empty-reset" type="button" data-audit-reset>Filter zurücksetzen</button>
        </article>
      `;
      return;
    }

    grid.innerHTML = visible
      .map((item) => {
        return `
          <article class="audit-card">
            <header class="audit-card-head">
              <div>
                <h2>${item.action}</h2>
                <p>${item.time} • ${item.user} (${item.role})</p>
              </div>
              <span class="status-pill ${statusClassMap[item.status] || "audit-status-info"}">${item.status}</span>
            </header>

            <dl class="audit-meta-list">
              <div><dt>Zeit</dt><dd>${item.time}</dd></div>
              <div><dt>Benutzer</dt><dd>${item.user}</dd></div>
              <div><dt>Rolle</dt><dd>${item.role}</dd></div>
              <div><dt>Bereich</dt><dd>${item.area}</dd></div>
              <div><dt>Objekt</dt><dd>${item.object}</dd></div>
              <div><dt>Hinweis</dt><dd>${item.hint}</dd></div>
            </dl>

            <div class="audit-actions">
              <button class="admin-btn admin-btn-secondary" type="button" data-audit-details="${item.id}">Details</button>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function bindFilterButtons() {
    const buttons = document.querySelectorAll("[data-audit-filter]");
    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        state.filter = button.getAttribute("data-audit-filter") || "Alle";
        buttons.forEach((entry) => {
          entry.classList.toggle("is-active", entry === button);
        });
        renderEvents();
      });
    });
  }

  function bindSearch() {
    const input = document.querySelector("[data-audit-search]");
    if (!input) return;

    input.addEventListener("input", () => {
      state.searchTerm = input.value || "";
      renderEvents();
    });
  }

  function bindActions() {
    document.addEventListener("click", (event) => {
      const resetButton = event.target.closest("[data-audit-reset]");
      if (resetButton) {
        state.filter = "Alle";
        state.searchTerm = "";
        const searchInput = document.querySelector("[data-audit-search]");
        if (searchInput) searchInput.value = "";

        document.querySelectorAll("[data-audit-filter]").forEach((entry) => {
          entry.classList.toggle("is-active", (entry.getAttribute("data-audit-filter") || "") === "Alle");
        });

        renderEvents();
        return;
      }

      const detailButton = event.target.closest("[data-audit-details]");
      if (!detailButton) return;

      const id = detailButton.getAttribute("data-audit-details");
      const item = getRoleEvents().find((entry) => entry.id === id);
      if (!item) return;

      openModal(`Audit-Detail: ${item.id}`, buildDetailModal(item));
    });
  }

  function bindModalClose() {
    document.querySelectorAll("[data-audit-modal-close]").forEach((button) => {
      button.addEventListener("click", closeModal);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      const modal = document.querySelector("[data-audit-modal]");
      if (!modal || modal.hidden) return;
      closeModal();
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    bindFilterButtons();
    bindSearch();
    bindActions();
    bindModalClose();
    renderEvents();
  });
})();
