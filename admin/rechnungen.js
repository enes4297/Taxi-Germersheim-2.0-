(() => {
  const invoices = [
    {
      id: "RG-2026-1001",
      customer: "Mara Hoffmann (Demo)",
      accountType: "Privatkunde",
      date: "02.07.2026",
      dueDate: "12.07.2026",
      amount: 126.0,
      status: "Offen",
      paymentMethod: "Karte",
      rideType: "Flughafen",
      rideRef: "R-100",
      note: "Sammelbeleg mit Gepäckzuschlag"
    },
    {
      id: "RG-2026-1002",
      customer: "Kliniknetz Pfalz (Demo)",
      accountType: "Krankenkasse",
      date: "01.07.2026",
      dueDate: "08.07.2026",
      amount: 348.5,
      status: "Überfällig",
      paymentMethod: "Krankenkasse",
      rideType: "Krankenfahrt",
      rideRef: "R-101",
      note: "Monatsabrechnung Teil 1"
    },
    {
      id: "RG-2026-1003",
      customer: "LogiTrans Rhein (Demo)",
      accountType: "Firmenkunde",
      date: "03.07.2026",
      dueDate: "15.07.2026",
      amount: 289.0,
      status: "Bezahlt",
      paymentMethod: "Überweisung",
      rideType: "Kurier",
      rideRef: "R-105",
      note: "Pünktliche Zahlung im Rahmenvertrag"
    },
    {
      id: "RG-2026-1004",
      customer: "Pflegezentrum Südpfalz (Demo)",
      accountType: "Krankenkasse",
      date: "04.07.2026",
      dueDate: "10.07.2026",
      amount: 412.75,
      status: "In Prüfung",
      paymentMethod: "Krankenkasse",
      rideType: "Krankenfahrt",
      rideRef: "R-104",
      note: "Prüfung wegen zusätzlicher Begleitperson"
    },
    {
      id: "RG-2026-1005",
      customer: "Mecasoft GmbH (Demo)",
      accountType: "Firmenkunde",
      date: "02.07.2026",
      dueDate: "13.07.2026",
      amount: 198.4,
      status: "Offen",
      paymentMethod: "Rechnung",
      rideType: "Taxi",
      rideRef: "R-103",
      note: "Nachtzuschlag laut Firmenvereinbarung"
    },
    {
      id: "RG-2026-1006",
      customer: "Schulverwaltung Germersheim (Demo)",
      accountType: "Firmenkunde",
      date: "30.06.2026",
      dueDate: "07.07.2026",
      amount: 255.0,
      status: "Storniert",
      paymentMethod: "Rechnung",
      rideType: "Schülerfahrt",
      rideRef: "R-102",
      note: "Storno wegen doppelter Rechnungsstellung"
    },
    {
      id: "RG-2026-1007",
      customer: "Aylin Cakir (Demo)",
      accountType: "Privatkunde",
      date: "05.07.2026",
      dueDate: "11.07.2026",
      amount: 74.0,
      status: "Bezahlt",
      paymentMethod: "Bar",
      rideType: "Taxi",
      rideRef: "R-107",
      note: "Direktzahlung am Fahrtende"
    },
    {
      id: "RG-2026-1008",
      customer: "Flugdienst Rhein (Demo)",
      accountType: "Firmenkunde",
      date: "06.07.2026",
      dueDate: "09.07.2026",
      amount: 319.9,
      status: "Überfällig",
      paymentMethod: "Firmenkonto",
      rideType: "Flughafen",
      rideRef: "R-109",
      note: "Erinnerung bereits am 08.07 gesendet"
    },
    {
      id: "RG-2026-1009",
      customer: "Helga Maurer (Demo)",
      accountType: "Privatkunde",
      date: "07.07.2026",
      dueDate: "14.07.2026",
      amount: 58.2,
      status: "Offen",
      paymentMethod: "Karte",
      rideType: "Rollstuhlfahrt",
      rideRef: "R-108",
      note: "Hilfestellung beim Einsteigen dokumentiert"
    }
  ];

  const statusClassMap = {
    Offen: "billing-status-open",
    Bezahlt: "billing-status-paid",
    Überfällig: "billing-status-overdue",
    Storniert: "billing-status-cancelled",
    "In Prüfung": "billing-status-review"
  };

  const accountClassMap = {
    Privatkunde: "billing-account-private",
    Krankenkasse: "billing-account-medical",
    Firmenkunde: "billing-account-company"
  };

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

  function formatEuro(value) {
    return `${Number(value || 0).toFixed(2).replace(".", ",")} EUR`;
  }

  function resolveDueClass(invoice) {
    if (invoice.status === "Bezahlt") return "billing-due-paid";
    if (invoice.status === "Überfällig") return "billing-due-overdue";
    return "billing-due-soon";
  }

  function matchesFilter(invoice) {
    const filter = state.activeFilter;
    if (filter === "Alle") return true;
    if (["Offen", "Bezahlt", "Überfällig", "In Prüfung"].includes(filter)) {
      return invoice.status === filter;
    }
    if (filter === "Krankenkasse") return invoice.accountType === "Krankenkasse";
    if (filter === "Firmenkunden") return invoice.accountType === "Firmenkunde";
    return true;
  }

  function matchesSearch(invoice) {
    const query = normalizeText(state.searchTerm).trim();
    if (!query) return true;

    const amountAsText = Number(invoice.amount).toFixed(2).replace(".", ",");
    const haystack = normalizeText([
      invoice.id,
      invoice.customer,
      invoice.rideType,
      invoice.status,
      amountAsText
    ].join(" "));

    return haystack.includes(query);
  }

  function getVisibleInvoices() {
    return invoices.filter((invoice) => matchesFilter(invoice) && matchesSearch(invoice));
  }

  function renderStats() {
    const stats = {
      total: invoices.length,
      open: invoices.filter((item) => item.status === "Offen").length,
      paid: invoices.filter((item) => item.status === "Bezahlt").length,
      overdue: invoices.filter((item) => item.status === "Überfällig").length,
      medical: invoices.filter((item) => item.accountType === "Krankenkasse").length,
      company: invoices.filter((item) => item.accountType === "Firmenkunde").length
    };

    Object.entries(stats).forEach(([key, value]) => {
      const node = document.querySelector(`[data-billing-stat="${key}"]`);
      if (node) node.textContent = String(value);
    });
  }

  function openModal(title, bodyHtml) {
    const modal = document.querySelector("[data-billing-modal]");
    const modalTitle = document.querySelector("[data-billing-modal-title]");
    const modalBody = document.querySelector("[data-billing-modal-body]");
    if (!modal || !modalTitle || !modalBody) return;

    modalTitle.textContent = title;
    modalBody.innerHTML = bodyHtml;
    modal.hidden = false;
    document.body.classList.add("admin-modal-open");
  }

  function closeModal() {
    const modal = document.querySelector("[data-billing-modal]");
    if (!modal) return;

    modal.hidden = true;
    document.body.classList.remove("admin-modal-open");
  }

  function buildDetailsModal(invoice) {
    return `
      <dl class="billing-modal-list">
        <div><dt>Rechnungsnummer</dt><dd>${invoice.id}</dd></div>
        <div><dt>Kunde/Firma</dt><dd>${invoice.customer}</dd></div>
        <div><dt>Datum</dt><dd>${invoice.date}</dd></div>
        <div><dt>Fällig bis</dt><dd>${invoice.dueDate}</dd></div>
        <div><dt>Betrag</dt><dd>${formatEuro(invoice.amount)}</dd></div>
        <div><dt>Status</dt><dd>${invoice.status}</dd></div>
        <div><dt>Zahlungsart</dt><dd>${invoice.paymentMethod}</dd></div>
        <div><dt>Fahrttyp</dt><dd>${invoice.rideType}</dd></div>
        <div><dt>Zugehörige Fahrt</dt><dd>${invoice.rideRef}</dd></div>
        <div><dt>Hinweis</dt><dd>${invoice.note}</dd></div>
      </dl>
      <p class="billing-modal-note">Interne Notiz: Demo-Daten - später Backend-Anbindung möglich</p>
    `;
  }

  function buildActionModal(invoice, action) {
    const templates = {
      paid: `Demo: ${invoice.id} als bezahlt markieren ist vorbereitet. Keine Speicherung ohne Backend.`,
      remind: `Demo: Zahlungserinnerung an ${invoice.customer} wird vorbereitet. Keine echte Nachricht.`,
      pdf: `Demo: PDF-Ansicht für ${invoice.id} wird simuliert. Kein echter Export.`,
      cancel: `Demo: Storno für ${invoice.id} ist vorbereitet. Keine Speicherung ohne Backend.`
    };

    return `<p class="billing-modal-note">${templates[action] || "Demo-Aktion ohne Speicherung."}</p>`;
  }

  function buildInvoiceCard(invoice) {
    return `
      <article class="billing-card">
        <header class="billing-card-head">
          <div>
            <h2>${invoice.id}</h2>
            <span class="billing-account-badge ${accountClassMap[invoice.accountType] || "billing-account-private"}">${invoice.accountType}</span>
          </div>
          <span class="status-pill ${statusClassMap[invoice.status] || "billing-status-open"}">${invoice.status}</span>
        </header>

        <div class="billing-customer-row">
          <small>Kunde/Firma Demo</small>
          <strong>${invoice.customer}</strong>
        </div>

        <dl class="billing-meta-list">
          <div>
            <dt>Datum</dt>
            <dd>${invoice.date}</dd>
          </div>
          <div>
            <dt>Fällig bis</dt>
            <dd><span class="billing-due-pill ${resolveDueClass(invoice)}">${invoice.dueDate}</span></dd>
          </div>
          <div>
            <dt>Zahlungsart</dt>
            <dd>${invoice.paymentMethod}</dd>
          </div>
          <div>
            <dt>Fahrttyp</dt>
            <dd>${invoice.rideType}</dd>
          </div>
          <div>
            <dt>Zugehörige Fahrt</dt>
            <dd>${invoice.rideRef}</dd>
          </div>
          <div>
            <dt>Betrag</dt>
            <dd class="billing-amount">${formatEuro(invoice.amount)}</dd>
          </div>
        </dl>

        <p class="billing-note">Hinweis Demo: ${invoice.note}</p>

        <div class="billing-card-actions">
          <button class="admin-btn billing-btn-muted" type="button" data-billing-action="details" data-billing-id="${invoice.id}">Details</button>
          <button class="admin-btn" type="button" data-billing-action="paid" data-billing-id="${invoice.id}">Als bezahlt markieren</button>
          <button class="admin-btn" type="button" data-billing-action="remind" data-billing-id="${invoice.id}">Zahlung erinnern</button>
          <button class="admin-btn billing-btn-muted" type="button" data-billing-action="pdf" data-billing-id="${invoice.id}">PDF anzeigen Demo</button>
          <button class="admin-btn billing-btn-muted" type="button" data-billing-action="cancel" data-billing-id="${invoice.id}">Stornieren Demo</button>
        </div>
      </article>
    `;
  }

  function renderInvoices() {
    const grid = document.querySelector("[data-billing-grid]");
    if (!grid) return;

    const visibleInvoices = getVisibleInvoices();
    if (!visibleInvoices.length) {
      grid.innerHTML = `
        <article class="billing-empty">
          <strong>Keine Rechnungen gefunden.</strong>
          <p>Bitte Suche oder Filter anpassen.</p>
        </article>
      `;
      return;
    }

    grid.innerHTML = visibleInvoices.map((invoice) => buildInvoiceCard(invoice)).join("");
  }

  function bindSearch() {
    const input = document.querySelector("[data-billing-search]");
    if (!input) return;

    input.addEventListener("input", (event) => {
      state.searchTerm = String(event.target.value || "");
      renderInvoices();
    });
  }

  function bindFilters() {
    const buttons = document.querySelectorAll("[data-billing-filter]");
    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        state.activeFilter = button.getAttribute("data-billing-filter") || "Alle";
        buttons.forEach((item) => item.classList.remove("is-active"));
        button.classList.add("is-active");
        renderInvoices();
      });
    });
  }

  function bindActions() {
    const grid = document.querySelector("[data-billing-grid]");
    if (!grid) return;

    grid.addEventListener("click", (event) => {
      const button = event.target.closest("[data-billing-action]");
      if (!button) return;

      const action = button.getAttribute("data-billing-action");
      const invoiceId = button.getAttribute("data-billing-id");
      const invoice = invoices.find((item) => item.id === invoiceId);
      if (!action || !invoice) return;

      if (action === "details") {
        openModal(`Rechnungsdetails: ${invoice.id}`, buildDetailsModal(invoice));
        return;
      }

      openModal(`Aktion: ${invoice.id}`, buildActionModal(invoice, action));
    });
  }

  function bindModalClose() {
    const closeButtons = document.querySelectorAll("[data-billing-modal-close]");
    closeButtons.forEach((button) => {
      button.addEventListener("click", closeModal);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      const modal = document.querySelector("[data-billing-modal]");
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
  renderInvoices();
})();
