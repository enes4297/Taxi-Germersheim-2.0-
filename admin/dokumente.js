(() => {
  // Nur Demo-Dokumente ohne echte Fahrzeugschein-Details (keine FIN/VIN).
  const documents = [
    {
      id: "DOC-100",
      name: "Fahrzeugschein GER TX100 (Demo)",
      type: "Fahrzeugschein",
      category: "Fahrzeuge",
      ownership: "Fahrzeug",
      owner: "GER TX100",
      validUntil: "31.12.2027",
      status: "Gültig",
      note: "Nur Platzhalterdaten, keine privaten Fahrzeugschein-Daten.",
      scopes: ["Chef", "Disposition"]
    },
    {
      id: "DOC-101",
      name: "Versicherung GER TX200",
      type: "Versicherung",
      category: "Fahrzeuge",
      ownership: "Fahrzeug",
      owner: "GER TX200",
      validUntil: "15.08.2026",
      status: "Bald fällig",
      note: "Verlängerung vorbereitet.",
      scopes: ["Chef", "Disposition"]
    },
    {
      id: "DOC-102",
      name: "TÜV/HU GER TX500",
      type: "TÜV/HU",
      category: "Fahrzeuge",
      ownership: "Fahrzeug",
      owner: "GER TX500",
      validUntil: "28.06.2026",
      status: "Überfällig",
      note: "Termin mit Werkstatt abstimmen.",
      scopes: ["Chef", "Disposition"]
    },
    {
      id: "DOC-103",
      name: "Konzession Fuhrpark 2026",
      type: "Konzession",
      category: "Unternehmen",
      ownership: "Firma",
      owner: "Taxi Germersheim GmbH",
      validUntil: "31.12.2026",
      status: "In Prüfung",
      note: "Unterlagen beim Amt eingereicht.",
      scopes: ["Chef", "Buchhaltung"]
    },
    {
      id: "DOC-104",
      name: "P-Schein Max Mustermann",
      type: "P-Schein",
      category: "Fahrer",
      ownership: "Fahrer",
      owner: "Max Mustermann",
      validUntil: "11.09.2026",
      status: "Bald fällig",
      note: "Erinnerung 4 Wochen vorher senden.",
      scopes: ["Chef", "Disposition"]
    },
    {
      id: "DOC-105",
      name: "Führerschein Selin Kara",
      type: "Führerschein",
      category: "Fahrer",
      ownership: "Fahrer",
      owner: "Selin Kara",
      validUntil: "03.05.2028",
      status: "Gültig",
      note: "Dokument geprüft.",
      scopes: ["Chef", "Disposition"]
    },
    {
      id: "DOC-106",
      name: "Arbeitsvertrag Fahrer-Demo",
      type: "Arbeitsvertrag",
      category: "Fahrer",
      ownership: "Fahrer",
      owner: "Fahrer-Demo",
      validUntil: "31.12.2026",
      status: "Gültig",
      note: "Nur Demo-Vertrag zur Ansicht.",
      scopes: ["Chef", "Disposition", "Fahrer"],
      ownOnly: true
    },
    {
      id: "DOC-107",
      name: "Rechnung RG-2026-1002",
      type: "Rechnung",
      category: "Unternehmen",
      ownership: "Firma",
      owner: "Kliniknetz Pfalz",
      validUntil: "08.07.2026",
      status: "Überfällig",
      note: "Mahnlauf vorgemerkt.",
      scopes: ["Chef", "Buchhaltung"]
    },
    {
      id: "DOC-108",
      name: "Datenschutz-Nachweis Leitstelle",
      type: "Sonstiges",
      category: "Unternehmen",
      ownership: "Firma",
      owner: "Taxi Germersheim GmbH",
      validUntil: "30.11.2026",
      status: "Gültig",
      note: "Interne Compliance-Checkliste aktuell.",
      scopes: ["Chef", "Buchhaltung"]
    },
    {
      id: "DOC-109",
      name: "P-Schein Fahrer-Demo",
      type: "P-Schein",
      category: "Fahrer",
      ownership: "Fahrer",
      owner: "Fahrer-Demo",
      validUntil: "20.10.2026",
      status: "Gültig",
      note: "Nur eigene Demo-Sicht für Fahrerrolle.",
      scopes: ["Chef", "Disposition", "Fahrer"],
      ownOnly: true
    },
    {
      id: "DOC-110",
      name: "Führerschein Fahrer-Demo",
      type: "Führerschein",
      category: "Fahrer",
      ownership: "Fahrer",
      owner: "Fahrer-Demo",
      validUntil: "14.07.2026",
      status: "Bald fällig",
      note: "Ablauf innerhalb der nächsten Woche.",
      scopes: ["Chef", "Disposition", "Fahrer"],
      ownOnly: true
    },
    {
      id: "DOC-111",
      name: "Versicherung GER TX800",
      type: "Versicherung",
      category: "Fahrzeuge",
      ownership: "Fahrzeug",
      owner: "GER TX800",
      validUntil: "-",
      status: "Fehlt",
      note: "Nachweis in Sammlung noch nicht hochgeladen.",
      scopes: ["Chef", "Disposition"]
    }
  ];

  const statusClassMap = {
    "Gültig": "doc-status-valid",
    "Bald fällig": "doc-status-due-soon",
    "Überfällig": "doc-status-overdue",
    "In Prüfung": "doc-status-review",
    Fehlt: "doc-status-missing"
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

  function getRoleDocuments() {
    const role = readRole();
    return documents.filter((item) => {
      if (!item.scopes.includes(role)) return false;
      if (role === "Fahrer") {
        return item.ownOnly === true;
      }
      return true;
    });
  }

  function matchesFilter(item) {
    if (state.filter === "Alle") return true;
    if (["Fahrzeuge", "Fahrer", "Unternehmen"].includes(state.filter)) {
      return item.category === state.filter;
    }
    if (["Bald fällig", "Überfällig", "Fehlt"].includes(state.filter)) {
      return item.status === state.filter;
    }
    return true;
  }

  function matchesSearch(item) {
    const query = normalizeText(state.searchTerm).trim();
    if (!query) return true;

    const haystack = normalizeText([
      item.name,
      item.type,
      item.category,
      item.owner,
      item.note
    ].join(" "));

    return haystack.includes(query);
  }

  function getVisibleDocuments() {
    return getRoleDocuments().filter((item) => matchesFilter(item) && matchesSearch(item));
  }

  function renderStats(roleDocuments) {
    const stats = {
      total: roleDocuments.length,
      dueSoon: roleDocuments.filter((item) => item.status === "Bald fällig").length,
      overdue: roleDocuments.filter((item) => item.status === "Überfällig").length,
      vehicles: roleDocuments.filter((item) => item.category === "Fahrzeuge").length,
      drivers: roleDocuments.filter((item) => item.category === "Fahrer").length,
      company: roleDocuments.filter((item) => item.category === "Unternehmen").length
    };

    Object.entries(stats).forEach(([key, value]) => {
      const node = document.querySelector(`[data-doc-stat="${key}"]`);
      if (node) node.textContent = String(value);
    });
  }

  function buildDetailsModal(item) {
    return `
      <dl class="docs-modal-list">
        <div><dt>Dokumentname</dt><dd>${item.name}</dd></div>
        <div><dt>Kategorie</dt><dd>${item.type} (${item.category})</dd></div>
        <div><dt>Zugehörigkeit</dt><dd>${item.ownership}</dd></div>
        <div><dt>Fahrzeug/Fahrer/Firma</dt><dd>${item.owner}</dd></div>
        <div><dt>Gültig bis</dt><dd>${item.validUntil}</dd></div>
        <div><dt>Status</dt><dd>${item.status}</dd></div>
        <div><dt>Hinweis</dt><dd>${item.note}</dd></div>
      </dl>
      <p class="docs-modal-note">Interne Notiz: Demo-Daten – später Backend-Anbindung möglich</p>
    `;
  }

  function buildActionModal(item, action) {
    const actionMap = {
      upload: `Demo: Upload für ${item.name} wird vorbereitet.`,
      replace: `Demo: Ersetzen von ${item.name} wird vorbereitet.`,
      verify: `Demo: Prüfung von ${item.name} wird vorbereitet.`,
      remind: `Demo: Erinnerung für ${item.owner} wird vorbereitet.`
    };

    return `<p class="docs-modal-note">${actionMap[action] || "Demo-Aktion"} Keine Speicherung ohne Backend.</p>`;
  }

  function openModal(title, body) {
    const modal = document.querySelector("[data-doc-modal]");
    const modalTitle = document.querySelector("[data-doc-modal-title]");
    const modalBody = document.querySelector("[data-doc-modal-body]");
    if (!modal || !modalTitle || !modalBody) return;

    modalTitle.textContent = title;
    modalBody.innerHTML = body;
    modal.hidden = false;
    document.body.classList.add("admin-modal-open");
  }

  function closeModal() {
    const modal = document.querySelector("[data-doc-modal]");
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove("admin-modal-open");
  }

  function renderDocuments() {
    const grid = document.querySelector("[data-doc-grid]");
    if (!grid) return;

    const roleDocuments = getRoleDocuments();
    renderStats(roleDocuments);

    const visible = roleDocuments.filter((item) => matchesFilter(item) && matchesSearch(item));
    if (!visible.length) {
      grid.innerHTML = `
        <article class="docs-empty admin-empty-state">
          <strong>📁 Keine Einträge gefunden</strong>
          <p>Keine Einträge gefunden.</p>
          <button class="admin-btn admin-btn-secondary admin-empty-reset" type="button" data-doc-reset>Filter zurücksetzen</button>
        </article>
      `;
      return;
    }

    grid.innerHTML = visible
      .map((item) => {
        return `
          <article class="docs-card">
            <header class="docs-card-head">
              <div>
                <h2>${item.name}</h2>
                <span class="docs-type-badge">${item.type}</span>
              </div>
              <span class="status-pill ${statusClassMap[item.status] || "doc-status-valid"}">${item.status}</span>
            </header>

            <dl class="docs-meta-list">
              <div><dt>Kategorie</dt><dd>${item.category}</dd></div>
              <div><dt>Zugehörigkeit</dt><dd>${item.ownership}</dd></div>
              <div><dt>Fahrzeug/Fahrer/Firma</dt><dd>${item.owner}</dd></div>
              <div><dt>Gültig bis</dt><dd>${item.validUntil}</dd></div>
            </dl>

            <p class="docs-note">Hinweis: ${item.note}</p>

            <div class="docs-actions">
              <button class="admin-btn admin-btn-secondary" type="button" data-doc-action="details" data-doc-id="${item.id}">Details</button>
              <button class="admin-btn" type="button" data-doc-action="upload" data-doc-id="${item.id}">Hochladen Demo</button>
              <button class="admin-btn admin-btn-secondary" type="button" data-doc-action="replace" data-doc-id="${item.id}">Ersetzen Demo</button>
              <button class="admin-btn admin-btn-warning" type="button" data-doc-action="verify" data-doc-id="${item.id}">Prüfen Demo</button>
              <button class="admin-btn admin-btn-danger" type="button" data-doc-action="remind" data-doc-id="${item.id}">Erinnern Demo</button>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function bindSearch() {
    const input = document.querySelector("[data-doc-search]");
    if (!input) return;

    input.addEventListener("input", (event) => {
      state.searchTerm = String(event.target.value || "");
      renderDocuments();
    });
  }

  function bindFilters() {
    const buttons = document.querySelectorAll("[data-doc-filter]");
    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        state.filter = button.getAttribute("data-doc-filter") || "Alle";
        buttons.forEach((item) => {
          item.classList.toggle("is-active", item === button);
        });
        renderDocuments();
      });
    });
  }

  function bindActions() {
    document.addEventListener("click", (event) => {
      const resetButton = event.target.closest("[data-doc-reset]");
      if (resetButton) {
        state.filter = "Alle";
        state.searchTerm = "";
        const searchInput = document.querySelector("[data-doc-search]");
        if (searchInput) searchInput.value = "";
        document.querySelectorAll("[data-doc-filter]").forEach((item) => {
          item.classList.toggle("is-active", (item.getAttribute("data-doc-filter") || "") === "Alle");
        });
        renderDocuments();
        return;
      }

      const button = event.target.closest("[data-doc-action]");
      if (!button) return;

      const action = button.getAttribute("data-doc-action");
      const id = button.getAttribute("data-doc-id");
      const item = getRoleDocuments().find((entry) => entry.id === id);
      if (!item || !action) return;

      if (action === "details") {
        openModal(`Dokumentdetails: ${item.id}`, buildDetailsModal(item));
        return;
      }

      openModal(`Aktion: ${item.id}`, buildActionModal(item, action));
    });
  }

  function bindModalClose() {
    document.querySelectorAll("[data-doc-modal-close]").forEach((button) => {
      button.addEventListener("click", closeModal);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      const modal = document.querySelector("[data-doc-modal]");
      if (!modal || modal.hidden) return;
      closeModal();
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    bindSearch();
    bindFilters();
    bindActions();
    bindModalClose();
    renderDocuments();
  });
})();
