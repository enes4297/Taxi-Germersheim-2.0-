(() => {
  const S = window.AdminSystemCenter || {};
  const STORAGE_KEYS = {
    customers: "adminSharedCustomersV14",
    tasks: "adminSharedTasksV14",
    callbacks: "adminSharedCallbacksV14",
    rideInbox: "adminSharedRideInboxV14"
  };

  const DEFAULT_CUSTOMERS = [
    {
      id: "K-1001",
      customerNumber: "TG-K-1001",
      firstName: "Helga",
      lastName: "Maurer",
      displayName: "Helga Maurer",
      type: "Patient",
      status: "Aktiv",
      locked: false,
      phone: "0172 901 2288",
      altPhone: "0176 771 0011",
      email: "helga.maurer@demo.de",
      birthDate: "1958-02-11",
      insurance: "AOK",
      insuranceNumber: "AOK-5588-201",
      permitStatus: "Genehmigung vorhanden",
      transportFormStatus: "vorhanden",
      billingType: "Krankenkasse",
      openQuestion: false,
      favoriteDestination: "Dialysezentrum Südpfalz",
      rewardsStatus: "Gold",
      ridesCount: 52,
      revenueDemo: 1820,
      notes: [{ id: "N-100", text: "Bitte 10 Minuten vor Ankunft anrufen.", type: "Wichtig", pinned: true, at: "2026-08-02 09:10" }],
      communication: [{ at: "2026-08-03 07:20", type: "eingehender Anruf", text: "Rückfahrt 11:45 bestätigt" }],
      addresses: [
        { id: "A-1001-1", label: "Zuhause", type: "Zuhause", fullAddress: "Germersheim Nord 12", isDefault: true },
        { id: "A-1001-2", label: "Dialyse", type: "Dialyse", fullAddress: "Dialysezentrum Südpfalz, Speyerer Str. 18", isDefault: false }
      ],
      rides: [{ id: "TG-3001", date: "2026-08-01", time: "07:40", pickup: "Germersheim Nord 12", destination: "Dialysezentrum Südpfalz", rideType: "Dialyse", status: "Abgeschlossen" }],
      importantHint: "Patient benötigt Hilfe bis zur Wohnungstür",
      createdAt: "2026-02-05",
      updatedAt: "2026-08-03"
    },
    {
      id: "K-1002",
      customerNumber: "TG-K-1002",
      firstName: "Nora",
      lastName: "Winter",
      displayName: "Nora Winter",
      type: "Patient",
      status: "Aktiv",
      locked: false,
      phone: "0172 901 2244",
      altPhone: "",
      email: "n.winter@demo.de",
      birthDate: "1970-09-02",
      insurance: "TK",
      insuranceNumber: "TK-7731-90",
      permitStatus: "Rückfrage erforderlich",
      transportFormStatus: "angefordert",
      billingType: "Krankenkasse",
      openQuestion: true,
      favoriteDestination: "Onkologie Ludwigshafen",
      rewardsStatus: "Silber",
      ridesCount: 35,
      revenueDemo: 1462,
      notes: [{ id: "N-110", text: "Seiteneingang der Klinik verwenden.", type: "Dispositionshinweis", pinned: true, at: "2026-08-02 13:45" }],
      communication: [{ at: "2026-08-03 08:32", type: "Rückruf", text: "Rückfahrtzeit offen" }],
      addresses: [
        { id: "A-1002-1", label: "Zuhause", type: "Zuhause", fullAddress: "Leimersheim Hauptstraße 9", isDefault: true },
        { id: "A-1002-2", label: "Onkologie", type: "Onkologie", fullAddress: "Onkologie Ludwigshafen", isDefault: false }
      ],
      rides: [{ id: "TG-3010", date: "2026-08-02", time: "09:20", pickup: "Leimersheim Hauptstraße 9", destination: "Onkologie Ludwigshafen", rideType: "Chemo", status: "Abgeschlossen" }],
      importantHint: "Bitte 10 Minuten vor Ankunft anrufen",
      createdAt: "2026-03-10",
      updatedAt: "2026-08-03"
    },
    {
      id: "K-2001",
      customerNumber: "TG-K-2001",
      firstName: "",
      lastName: "",
      displayName: "RheinBahn Service GmbH",
      type: "Firmenkunde",
      status: "Aktiv",
      locked: false,
      phone: "07274 901700",
      altPhone: "",
      email: "dispatch@rheinbahn-demo.de",
      birthDate: "",
      insurance: "",
      insuranceNumber: "",
      permitStatus: "keine Genehmigung erforderlich",
      transportFormStatus: "vorhanden",
      billingType: "Monatsrechnung",
      openQuestion: true,
      favoriteDestination: "Mannheim Hbf",
      rewardsStatus: "Business Plus",
      ridesCount: 63,
      revenueDemo: 4288,
      notes: [{ id: "N-200", text: "Kostenstelle RB-41 in jeder Fahrt angeben.", type: "Abrechnung", pinned: true, at: "2026-08-01 11:00" }],
      communication: [{ at: "2026-08-03 06:40", type: "eingehender Anruf", text: "Bahntransfer Teamleitung" }],
      addresses: [{ id: "A-2001-1", label: "Hauptstandort", type: "Arbeit", fullAddress: "RheinBahn Service, Germersheim Süd 7", isDefault: true }],
      rides: [{ id: "TG-5001", date: "2026-08-01", time: "06:30", pickup: "RheinBahn Service, Germersheim Süd 7", destination: "Mannheim Hbf", rideType: "Bahntransfer", status: "Abgeschlossen" }],
      importantHint: "Teamtransporte benötigen 10 Minuten Vorlauf",
      createdAt: "2026-01-14",
      updatedAt: "2026-08-03"
    },
    {
      id: "K-3001",
      customerNumber: "TG-K-3001",
      firstName: "Mara",
      lastName: "Hoffmann",
      displayName: "Mara Hoffmann",
      type: "Stammkunde",
      status: "Aktiv",
      locked: false,
      phone: "0171 770 1001",
      altPhone: "",
      email: "m.hoffmann@demo.de",
      birthDate: "1988-01-23",
      insurance: "",
      insuranceNumber: "",
      permitStatus: "nicht erforderlich",
      transportFormStatus: "vorhanden",
      billingType: "Privat",
      openQuestion: false,
      favoriteDestination: "Klinikum Speyer",
      rewardsStatus: "VIP Platin",
      ridesCount: 48,
      revenueDemo: 3240,
      notes: [],
      communication: [{ at: "2026-08-02 19:08", type: "Fahrt erstellt", text: "Flughafenfahrt für morgen" }],
      addresses: [{ id: "A-3001-1", label: "Zuhause", type: "Zuhause", fullAddress: "Germersheim Süd 2", isDefault: true }],
      rides: [{ id: "TG-7003", date: "2026-08-02", time: "18:45", pickup: "Germersheim Süd 2", destination: "Frankfurt Flughafen T1", rideType: "Flughafenfahrt", status: "Abgeschlossen" }],
      importantHint: "Wünscht ruhiges Fahrzeug und feste Fahrer",
      createdAt: "2026-02-17",
      updatedAt: "2026-08-03"
    }
  ];

  const DEFAULT_TASKS = [
    { id: "T-1", title: "Kunde zurückrufen", customerId: "K-1002", due: "2026-08-03", priority: "Hoch", status: "offen", note: "Rückfahrtzeit bestätigen" },
    { id: "T-2", title: "Genehmigung prüfen", customerId: "K-1002", due: "2026-08-04", priority: "Mittel", status: "in Bearbeitung", note: "Neue Verordnung angefragt" },
    { id: "T-3", title: "Kostenstelle abstimmen", customerId: "K-2001", due: "2026-08-05", priority: "Mittel", status: "offen", note: "RB-41 prüfen" }
  ];

  const DEFAULT_CALLBACKS = [
    { id: "CB-1", customerId: "K-1002", when: "heute", status: "offen", note: "Rückfahrt nach Chemo klären" },
    { id: "CB-2", customerId: "K-2001", when: "später", status: "offen", note: "Nächste Schichttransfer-Zeit" }
  ];

  const typeMeta = {
    Privatkunde: "customer-type-private",
    Stammkunde: "customer-type-regular",
    Krankenkasse: "customer-type-medical",
    Firmenkunde: "customer-type-company",
    Firmenkunden: "customer-type-company",
    VIP: "customer-type-vip",
    Schülerfahrt: "customer-type-school",
    Patient: "customer-type-medical"
  };

  const state = {
    customers: loadArray(STORAGE_KEYS.customers, DEFAULT_CUSTOMERS),
    tasks: loadArray(STORAGE_KEYS.tasks, DEFAULT_TASKS),
    callbacks: loadArray(STORAGE_KEYS.callbacks, DEFAULT_CALLBACKS),
    searchTerm: "",
    activeFilter: "Alle",
    selectedCustomerId: "",
    profileTab: "basis",
    modalContext: null
  };

  function loadArray(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return deepClone(fallback);
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(normalizeCustomerShape) : deepClone(fallback);
    } catch {
      return deepClone(fallback);
    }
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeCustomerShape(entry) {
    if (!entry || typeof entry !== "object") return null;

    if (entry.customerNumber || entry.displayName) {
      const displayName = entry.displayName || `${entry.firstName || ""} ${entry.lastName || ""}`.trim() || entry.company || "Unbekannter Kunde";
      return {
        ...entry,
        displayName,
        type: entry.type || "Privatkunde",
        notes: Array.isArray(entry.notes) ? entry.notes : [],
        communication: Array.isArray(entry.communication) ? entry.communication : [],
        addresses: Array.isArray(entry.addresses) ? entry.addresses : [],
        rides: Array.isArray(entry.rides) ? entry.rides : []
      };
    }

    const displayName = entry.name || "Unbekannter Kunde";
    return {
      id: entry.id || `K-${Math.floor(Math.random() * 9000)}`,
      customerNumber: `TG-K-${Math.floor(Math.random() * 9000)}`,
      firstName: "",
      lastName: "",
      displayName,
      type: entry.type || "Privatkunde",
      status: "Aktiv",
      locked: false,
      phone: entry.phone || "",
      altPhone: "",
      email: "",
      birthDate: "",
      insurance: "",
      insuranceNumber: "",
      permitStatus: "offen",
      transportFormStatus: "offen",
      billingType: "Privat",
      openQuestion: Boolean(entry.openQuestion),
      favoriteDestination: entry.favoriteDestination || "",
      rewardsStatus: entry.rewardsStatus || "",
      ridesCount: Number(entry.ridesCount || 0),
      revenueDemo: Number(entry.revenueDemo || 0),
      notes: entry.note ? [{ id: `N-${Date.now()}`, text: entry.note, type: "Hinweis", pinned: false, at: nowStamp() }] : [],
      communication: [],
      addresses: [],
      rides: [],
      importantHint: entry.note || "",
      createdAt: todayISO(),
      updatedAt: todayISO()
    };
  }

  state.customers = state.customers.filter(Boolean);

  if (!state.selectedCustomerId && state.customers.length) {
    state.selectedCustomerId = state.customers[0].id;
  }

  function saveShared() {
    localStorage.setItem(STORAGE_KEYS.customers, JSON.stringify(state.customers));
    localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(state.tasks));
    localStorage.setItem(STORAGE_KEYS.callbacks, JSON.stringify(state.callbacks));
  }

  function todayISO() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }

  function nowTime() {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  }

  function nowStamp() {
    return `${todayISO()} ${nowTime()}`;
  }

  function normalizeText(value) {
    return String(value || "")
      .toLocaleLowerCase("de-DE")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function formatEuro(value) {
    return `${Number(value || 0).toFixed(2).replace(".", ",")} EUR`;
  }

  function formatDateDisplay(value) {
    if (S.formatDate) return S.formatDate(value);
    if (!value) return "-";
    const d = new Date(`${value}T00:00:00`);
    if (Number.isNaN(d.getTime())) return value;
    return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
  }

  function formatDateTimeDisplay(value) {
    if (S.formatDateTime) return S.formatDateTime(value);
    return String(value || "-");
  }

  function getCustomerLabel(customer) {
    return customer.displayName || `${customer.firstName || ""} ${customer.lastName || ""}`.trim() || "Unbekannt";
  }

  function getSelectedCustomer() {
    return state.customers.find((item) => item.id === state.selectedCustomerId) || null;
  }

  function matchesFilter(customer) {
    if (state.activeFilter === "Alle") return true;
    if (state.activeFilter === "Stammkunden") return customer.type === "Stammkunde";
    if (state.activeFilter === "Krankenkasse") return customer.type === "Krankenkasse" || customer.type === "Patient";
    if (state.activeFilter === "Firmenkunden") return customer.type === "Firmenkunde";
    if (state.activeFilter === "Patient") return customer.type === "Patient";
    if (state.activeFilter === "VIP") return customer.type === "VIP" || /vip|gold|platin/i.test(customer.rewardsStatus || "");
    if (state.activeFilter === "Rückfrage offen") return Boolean(customer.openQuestion);
    return true;
  }

  function matchesSearch(customer) {
    const query = normalizeText(state.searchTerm).trim();
    if (!query) return true;

    const haystack = normalizeText([
      getCustomerLabel(customer),
      customer.customerNumber,
      customer.type,
      customer.phone,
      customer.altPhone,
      customer.email,
      customer.birthDate,
      customer.insurance,
      customer.insuranceNumber,
      customer.favoriteDestination,
      customer.billingType,
      customer.addresses.map((item) => item.fullAddress).join(" ")
    ].join(" "));

    return haystack.includes(query);
  }

  function getVisibleCustomers() {
    return state.customers.filter((customer) => matchesFilter(customer) && matchesSearch(customer));
  }

  function renderStats() {
    const stats = {
      total: state.customers.length,
      regular: state.customers.filter((customer) => customer.type === "Stammkunde").length,
      medical: state.customers.filter((customer) => customer.type === "Krankenkasse" || customer.type === "Patient").length,
      company: state.customers.filter((customer) => customer.type === "Firmenkunde").length,
      openQuestions: state.customers.filter((customer) => customer.openQuestion).length,
      vipRewards: state.customers.filter((customer) => customer.type === "VIP" || /gold|vip|platin|silber/i.test(customer.rewardsStatus || "")).length
    };

    Object.entries(stats).forEach(([key, value]) => {
      const node = document.querySelector(`[data-customer-stat="${key}"]`);
      if (node) node.textContent = String(value);
    });

    const alert = document.querySelector("[data-customer-alert-count]");
    if (alert) {
      const openTasks = state.tasks.filter((item) => item.status !== "erledigt").length;
      alert.textContent = String(openTasks);
    }
  }

  function renderCustomers() {
    const grid = document.querySelector("[data-customer-grid]");
    if (!grid) return;

    const visibleCustomers = getVisibleCustomers();
    grid.innerHTML = "";

    if (!visibleCustomers.length) {
      const empty = document.createElement("article");
      empty.className = "customer-empty admin-empty-state";
      empty.innerHTML = "<strong>Keine Einträge gefunden</strong><p>Keine Kunden passend zu Filter und Suche gefunden.</p><button class='admin-btn admin-btn-secondary admin-empty-reset' type='button' data-customer-reset>Filter zurücksetzen</button>";
      grid.append(empty);
      return;
    }

    visibleCustomers.forEach((customer) => {
      const card = document.createElement("article");
      card.className = "customer-card";
      if (customer.id === state.selectedCustomerId) {
        card.style.borderColor = "rgba(255,217,106,0.5)";
      }

      const lastRide = customer.rides && customer.rides.length ? `${formatDateDisplay(customer.rides[0].date)} ${customer.rides[0].time || ""}` : "-";
      const nextRide = customer.openRide || "-";

      card.innerHTML = `
        <header class="customer-card-head">
          <div>
            <h2>${getCustomerLabel(customer)}</h2>
            <span class="customer-type-badge ${typeMeta[customer.type] || "customer-type-private"}">${customer.type}</span>
          </div>
          <span class="customer-rewards">${customer.rewardsStatus || "Basis"}</span>
        </header>

        <dl class="customer-meta-list">
          <div><dt>Telefon</dt><dd>${customer.phone || "-"}</dd></div>
          <div><dt>Letzte Fahrt</dt><dd>${lastRide}</dd></div>
          <div><dt>Lieblingsziel</dt><dd>${customer.favoriteDestination || "-"}</dd></div>
          <div><dt>Offene Fahrt</dt><dd class="customer-next-ride">${nextRide}</dd></div>
        </dl>

        ${customer.openQuestion ? "<p class='customer-question'>Rückfrage offen</p>" : ""}

        <div class="customer-card-actions">
          <button class="admin-btn" type="button" data-customer-action="select" data-customer-id="${customer.id}">Öffnen</button>
          <button class="admin-btn customer-btn-muted" type="button" data-customer-action="ride" data-customer-id="${customer.id}">Neue Fahrt</button>
        </div>
      `;

      grid.append(card);
    });
  }

  function setProfileTab(nextTab) {
    state.profileTab = nextTab;
    document.querySelectorAll("[data-customer-profile-tab]").forEach((button) => {
      const key = button.getAttribute("data-customer-profile-tab");
      button.classList.toggle("is-active", key === nextTab);
    });
    document.querySelectorAll("[data-customer-profile-pane]").forEach((pane) => {
      const key = pane.getAttribute("data-customer-profile-pane");
      pane.classList.toggle("is-visible", key === nextTab);
    });
  }

  function renderProfile() {
    const customer = getSelectedCustomer();
    const profileId = document.querySelector("[data-customer-profile-id]");
    const top = document.querySelector("[data-customer-profile-top]");

    const basisPane = document.querySelector('[data-customer-profile-pane="basis"]');
    const dokuPane = document.querySelector('[data-customer-profile-pane="doku"]');
    const fahrtenPane = document.querySelector('[data-customer-profile-pane="fahrten"]');
    const aufgabenPane = document.querySelector('[data-customer-profile-pane="aufgaben"]');

    if (!customer || !profileId || !top || !basisPane || !dokuPane || !fahrtenPane || !aufgabenPane) return;

    profileId.textContent = customer.customerNumber || customer.id;

    top.innerHTML = `
      <strong>${getCustomerLabel(customer)}</strong>
      <p>${customer.type} · ${customer.status}${customer.locked ? " · gesperrt" : ""}</p>
      <p>Telefon: ${customer.phone || "-"}${customer.altPhone ? ` · Alt: ${customer.altPhone}` : ""}</p>
      <p>E-Mail: ${customer.email || "-"}</p>
      ${customer.importantHint ? `<p class="customer-profile-alert">${customer.importantHint}</p>` : ""}
      <div class="customer-extra-tags">
        <span class="customer-extra-tag">Abrechnung: ${customer.billingType || "-"}</span>
        <span class="customer-extra-tag">Genehmigung: ${customer.permitStatus || "-"}</span>
        <span class="customer-extra-tag">Transportschein: ${customer.transportFormStatus || "-"}</span>
      </div>
      <div class="customer-profile-actions">
        <button class="admin-btn admin-btn-secondary" type="button" data-customer-profile-action="phone">Telefonzentrale</button>
        <button class="admin-btn admin-btn-secondary" type="button" data-customer-profile-action="dispo">Live-Dispo</button>
        <button class="admin-btn" type="button" data-customer-profile-action="newRide">Neue Fahrt</button>
      </div>
    `;

    const defaultAddress = customer.addresses.find((item) => item.isDefault) || customer.addresses[0];

    basisPane.innerHTML = `
      <dl class="customer-profile-list">
        <div><dt>Hauptadresse</dt><dd>${defaultAddress ? defaultAddress.fullAddress : "-"}</dd></div>
        <div><dt>Geburtsdatum</dt><dd>${customer.birthDate || "-"}</dd></div>
        <div><dt>Versicherungsnummer</dt><dd>${customer.insuranceNumber || "-"}</dd></div>
        <div><dt>Lieblingsziel</dt><dd>${customer.favoriteDestination || "-"}</dd></div>
        <div><dt>Erstellt</dt><dd>${formatDateDisplay(customer.createdAt)}</dd></div>
        <div><dt>Aktualisiert</dt><dd>${formatDateDisplay(customer.updatedAt)}</dd></div>
      </dl>
      <div class="customer-profile-note-list">
        ${(customer.notes || []).slice(0, 6).map((note) => `
          <article class="customer-mini-item">
            <strong>${note.type || "Notiz"}${note.pinned ? " · Angeheftet" : ""}</strong>
            <p>${note.text || "-"}</p>
            <small>${formatDateTimeDisplay(note.at)}</small>
          </article>
        `).join("") || '<div class="customer-profile-empty">Keine Notizen vorhanden.</div>'}
      </div>
    `;

    dokuPane.innerHTML = `
      <dl class="customer-profile-list">
        <div><dt>Genehmigungsstatus</dt><dd>${customer.permitStatus || "-"}</dd></div>
        <div><dt>Transportschein</dt><dd>${customer.transportFormStatus || "-"}</dd></div>
        <div><dt>Versicherung</dt><dd>${customer.insurance || "-"}</dd></div>
        <div><dt>Abrechnungsart</dt><dd>${customer.billingType || "-"}</dd></div>
      </dl>
      <div class="customer-profile-history">
        ${(customer.communication || []).slice(0, 8).map((entry) => `
          <article class="customer-mini-item">
            <strong>${entry.type || "Eintrag"}</strong>
            <p>${entry.text || "-"}</p>
            <small>${formatDateTimeDisplay(entry.at)}</small>
          </article>
        `).join("") || '<div class="customer-profile-empty">Kein Kommunikationsverlauf vorhanden.</div>'}
      </div>
    `;

    fahrtenPane.innerHTML = `
      <div class="customer-profile-history">
        ${(customer.rides || []).slice(0, 10).map((ride) => `
          <article class="customer-mini-item">
            <strong>${ride.id || "-"} · ${formatDateDisplay(ride.date)} ${ride.time || "-"}</strong>
            <p>${ride.pickup || "-"} → ${ride.destination || "-"}</p>
            <p>${ride.rideType || "Taxi"} · Status: ${ride.status || "Neu"}</p>
            <div class="customer-mini-actions">
              <button type="button" data-customer-ride-action="repeat" data-customer-ride-id="${ride.id || ""}">Erneut buchen</button>
              <button type="button" data-customer-ride-action="return" data-customer-ride-id="${ride.id || ""}">Rückfahrt</button>
            </div>
          </article>
        `).join("") || '<div class="customer-profile-empty">Noch keine Fahrten gespeichert.</div>'}
      </div>
    `;

    const customerTasks = state.tasks.filter((item) => item.customerId === customer.id);
    const customerCallbacks = state.callbacks.filter((item) => item.customerId === customer.id);

    aufgabenPane.innerHTML = `
      <div class="customer-profile-task-list">
        ${customerTasks.map((task) => `
          <article class="customer-mini-item">
            <strong>${task.title}</strong>
            <p>Fällig: ${formatDateDisplay(task.due)} · Priorität: ${task.priority} · Status: ${task.status}</p>
            <p>${task.note || ""}</p>
            <div class="customer-mini-actions">
              <button type="button" data-customer-task-action="done" data-customer-task-id="${task.id}">Erledigt</button>
              <button type="button" data-customer-task-action="progress" data-customer-task-id="${task.id}">In Bearbeitung</button>
            </div>
          </article>
        `).join("") || '<div class="customer-profile-empty">Keine Aufgaben vorhanden.</div>'}

        ${customerCallbacks.map((item) => `
          <article class="customer-mini-item">
            <strong>Rückruf: ${item.when}</strong>
            <p>Status: ${item.status}</p>
            <p>${item.note || ""}</p>
          </article>
        `).join("") || '<div class="customer-profile-empty">Keine Rückrufe vorhanden.</div>'}
      </div>
    `;

    setProfileTab(state.profileTab);
  }

  function openModal(title, bodyHtml, context = null, saveLabel = "Speichern") {
    const modal = document.querySelector("[data-customer-modal]");
    const modalTitle = document.querySelector("[data-customer-modal-title]");
    const modalBody = document.querySelector("[data-customer-modal-body]");
    const saveButton = document.querySelector('[data-customer-modal-action="save"]');
    if (!modal || !modalTitle || !modalBody || !saveButton) return;

    state.modalContext = context;
    modalTitle.textContent = title;
    modalBody.innerHTML = bodyHtml;
    saveButton.textContent = saveLabel;
    saveButton.hidden = !context;
    modal.hidden = false;
    document.body.classList.add("admin-modal-open");
  }

  function closeModal() {
    const modal = document.querySelector("[data-customer-modal]");
    if (!modal) return;
    state.modalContext = null;
    modal.hidden = true;
    document.body.classList.remove("admin-modal-open");
  }

  function resetFilters() {
    state.activeFilter = "Alle";
    state.searchTerm = "";
    const searchInput = document.querySelector("[data-customer-search]");
    if (searchInput) searchInput.value = "";
    document.querySelectorAll("[data-customer-filter]").forEach((item) => {
      item.classList.toggle("is-active", (item.getAttribute("data-customer-filter") || "") === "Alle");
    });
    renderCustomers();
  }

  function checkDuplicate(payload) {
    const phone = normalizeText(payload.phone || "");
    const name = normalizeText(payload.displayName || "");
    const email = normalizeText(payload.email || "");
    const dob = payload.birthDate || "";
    const insuranceNo = normalizeText(payload.insuranceNumber || "");

    return state.customers.find((customer) => {
      const condPhone = phone && normalizeText(customer.phone) === phone;
      const condNameDob = name && dob && normalizeText(getCustomerLabel(customer)) === name && String(customer.birthDate || "") === dob;
      const condMail = email && normalizeText(customer.email) === email;
      const condIns = insuranceNo && normalizeText(customer.insuranceNumber) === insuranceNo;
      return condPhone || condNameDob || condMail || condIns;
    }) || null;
  }

  function openNewCustomerModal() {
    openModal(
      "Neuen Kunden anlegen",
      `
        <form class="customer-modal-grid" data-customer-new-form>
          <label><span>Name / Firma</span><input class="driver-search-input" name="displayName" required></label>
          <label><span>Kundentyp</span><select class="driver-search-input" name="type"><option>Privatkunde</option><option>Stammkunde</option><option>Patient</option><option>Firmenkunde</option><option>VIP</option></select></label>
          <label><span>Telefon</span><input class="driver-search-input" name="phone" required></label>
          <label><span>E-Mail</span><input class="driver-search-input" name="email"></label>
          <label><span>Geburtsdatum</span><input class="driver-search-input" type="date" name="birthDate"></label>
          <label><span>Versicherungsnummer</span><input class="driver-search-input" name="insuranceNumber"></label>
          <label><span>Versicherung</span><input class="driver-search-input" name="insurance"></label>
          <label><span>Abrechnung</span><select class="driver-search-input" name="billingType"><option>Privat</option><option>Krankenkasse</option><option>Monatsrechnung</option><option>Firmenkonto</option></select></label>
          <label class="full"><span>Hauptadresse</span><input class="driver-search-input" name="address" required></label>
          <label class="full"><span>Wichtiger Hinweis</span><textarea class="driver-search-input" name="importantHint"></textarea></label>
        </form>
        <p class="customer-modal-warning">Beim Speichern wird automatisch eine Dublettenprüfung durchgeführt.</p>
      `,
      { type: "createCustomer" },
      "Kunde speichern"
    );
  }

  function saveNewCustomerFromModal() {
    const form = document.querySelector("[data-customer-new-form]");
    if (!form) return;

    const payload = Object.fromEntries(new FormData(form).entries());
    if (!payload.displayName || !payload.phone || !payload.address) return;

    const duplicate = checkDuplicate(payload);
    if (duplicate) {
      openModal(
        "Dublettenprüfung",
        `<p class="customer-modal-warning">Mögliche Dublette erkannt: <strong>${getCustomerLabel(duplicate)}</strong> (${duplicate.phone}).</p><p>Bitte bestehenden Eintrag nutzen oder Name/Telefon prüfen.</p>`,
        null
      );
      return;
    }

    const id = `K-${Math.floor(1000 + Math.random() * 8000)}`;
    const customer = {
      id,
      customerNumber: `TG-K-${Math.floor(1000 + Math.random() * 9000)}`,
      firstName: "",
      lastName: "",
      displayName: payload.displayName,
      type: payload.type || "Privatkunde",
      status: "Aktiv",
      locked: false,
      phone: payload.phone,
      altPhone: "",
      email: payload.email || "",
      birthDate: payload.birthDate || "",
      insurance: payload.insurance || "",
      insuranceNumber: payload.insuranceNumber || "",
      permitStatus: payload.type === "Patient" ? "angefragt" : "nicht erforderlich",
      transportFormStatus: payload.type === "Patient" ? "offen" : "vorhanden",
      billingType: payload.billingType || "Privat",
      openQuestion: false,
      favoriteDestination: "",
      rewardsStatus: "Basis",
      ridesCount: 0,
      revenueDemo: 0,
      notes: [],
      communication: [{ at: nowStamp(), type: "Kunde angelegt", text: "Anlage über Kundenverwaltung" }],
      addresses: [{ id: `${id}-A1`, label: "Hauptadresse", type: "Zuhause", fullAddress: payload.address, isDefault: true }],
      rides: [],
      importantHint: payload.importantHint || "",
      createdAt: todayISO(),
      updatedAt: todayISO(),
      openRide: ""
    };

    state.customers.unshift(customer);
    state.selectedCustomerId = customer.id;
    saveShared();
    closeModal();
    renderAll();
  }

  function openNoteModal(customerId) {
    const customer = state.customers.find((item) => item.id === customerId);
    if (!customer) return;
    openModal(
      `Notiz für ${getCustomerLabel(customer)}`,
      `
        <form class="customer-modal-grid" data-customer-note-form>
          <label><span>Notiztyp</span><select class="driver-search-input" name="type"><option>Wichtig</option><option>Dispositionshinweis</option><option>Abrechnung</option><option>Fahrerhinweis</option></select></label>
          <label><span>Anheften</span><select class="driver-search-input" name="pinned"><option>Nein</option><option>Ja</option></select></label>
          <label class="full"><span>Notiz</span><textarea class="driver-search-input" name="text" required></textarea></label>
        </form>
      `,
      { type: "saveNote", customerId },
      "Notiz speichern"
    );
  }

  function saveNoteFromModal(customerId) {
    const form = document.querySelector("[data-customer-note-form]");
    const customer = state.customers.find((item) => item.id === customerId);
    if (!form || !customer) return;

    const payload = Object.fromEntries(new FormData(form).entries());
    if (!payload.text) return;

    customer.notes.unshift({
      id: `N-${Date.now()}`,
      text: payload.text,
      type: payload.type,
      pinned: payload.pinned === "Ja",
      at: nowStamp()
    });
    customer.updatedAt = todayISO();

    saveShared();
    closeModal();
    renderAll();
  }

  function createRideForCustomer(customer, sourceRide = null, asReturn = false) {
    const defaultAddress = customer.addresses.find((item) => item.isDefault) || customer.addresses[0];
    const destination = sourceRide ? sourceRide.destination : customer.favoriteDestination || "Bahnhof Germersheim";
    let pickup = sourceRide ? sourceRide.pickup : defaultAddress ? defaultAddress.fullAddress : "Germersheim";
    let target = destination;

    if (asReturn) {
      pickup = destination || pickup;
      target = sourceRide ? sourceRide.pickup : (defaultAddress ? defaultAddress.fullAddress : "Germersheim");
    }

    const rideId = `TG-${Math.floor(2000 + Math.random() * 7000)}`;
    const payload = {
      id: rideId,
      customer: getCustomerLabel(customer),
      phone: customer.phone,
      pickup,
      destination: target,
      date: todayISO(),
      time: nowTime(),
      rideType: asReturn ? "Rückfahrt" : (sourceRide ? sourceRide.rideType : "Taxi"),
      persons: 1,
      luggage: "",
      wheelchair: customer.type === "Patient" ? "Ja" : "Nein",
      companion: "Nein",
      billing: customer.billingType || "Privat",
      priority: customer.openQuestion ? "Hoch" : "Mittel",
      notes: customer.importantHint || "",
      status: "Neu",
      createdAt: nowStamp()
    };

    const inbox = loadRideInbox();
    inbox.unshift(payload);
    localStorage.setItem(STORAGE_KEYS.rideInbox, JSON.stringify(inbox.slice(0, 120)));

    customer.rides.unshift({
      id: payload.id,
      date: payload.date,
      time: payload.time,
      pickup: payload.pickup,
      destination: payload.destination,
      rideType: payload.rideType,
      status: "Neu"
    });
    customer.ridesCount = Number(customer.ridesCount || 0) + 1;
    customer.openRide = payload.id;
    customer.communication.unshift({ at: nowStamp(), type: "Fahrt erstellt", text: `${payload.id} ${payload.pickup} → ${payload.destination}` });
    customer.updatedAt = todayISO();

    saveShared();
    renderAll();
  }

  function loadRideInbox() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.rideInbox);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function createTaskForCustomer(customerId, title = "Kunde zurückrufen") {
    state.tasks.unshift({
      id: `T-${Date.now()}`,
      title,
      customerId,
      due: todayISO(),
      priority: "Mittel",
      status: "offen",
      note: "Erstellt aus Kundenverwaltung"
    });
    saveShared();
    renderAll();
  }

  function openDuplicateReport() {
    const duplicates = [];
    const byPhone = new Map();

    state.customers.forEach((customer) => {
      const phone = normalizeText(customer.phone || "");
      if (!phone) return;
      const list = byPhone.get(phone) || [];
      list.push(customer);
      byPhone.set(phone, list);
    });

    byPhone.forEach((list) => {
      if (list.length > 1) duplicates.push(list);
    });

    if (!duplicates.length) {
      openModal("Dublettenprüfung", "<p class='customer-modal-note'>Keine Dubletten nach Telefonnummer erkannt.</p>", null);
      return;
    }

    openModal(
      "Dublettenprüfung",
      duplicates.map((group) => {
        return `<div class="customer-modal-warning"><strong>${group[0].phone}</strong><br>${group.map((item) => `${getCustomerLabel(item)} (${item.customerNumber || item.id})`).join("<br>")}</div>`;
      }).join(""),
      null
    );
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

  function bindProfileTabs() {
    document.querySelectorAll("[data-customer-profile-tab]").forEach((button) => {
      button.addEventListener("click", () => {
        setProfileTab(button.getAttribute("data-customer-profile-tab") || "basis");
      });
    });
  }

  function bindActions() {
    document.addEventListener("click", (event) => {
      const topAction = event.target.closest("[data-customer-top-action]");
      if (topAction) {
        const action = topAction.getAttribute("data-customer-top-action");
        if (action === "new") openNewCustomerModal();
        if (action === "duplicate") openDuplicateReport();
        if (action === "reset") resetFilters();
        if (action === "phone") window.location.href = "telefonzentrale.html";
        return;
      }

      const profileAction = event.target.closest("[data-customer-profile-action]");
      if (profileAction) {
        const action = profileAction.getAttribute("data-customer-profile-action");
        const customer = getSelectedCustomer();
        if (!customer) return;
        if (action === "phone") window.location.href = "telefonzentrale.html";
        if (action === "dispo") window.location.href = "live-dispo.html";
        if (action === "newRide") createRideForCustomer(customer);
        return;
      }

      const resetButton = event.target.closest("[data-customer-reset]");
      if (resetButton) {
        resetFilters();
        return;
      }

      const actionButton = event.target.closest("[data-customer-action]");
      if (actionButton) {
        const action = actionButton.getAttribute("data-customer-action");
        const customerId = actionButton.getAttribute("data-customer-id") || "";
        const customer = state.customers.find((item) => item.id === customerId);
        if (!customer) return;

        state.selectedCustomerId = customer.id;

        if (action === "select") {
          renderAll();
          return;
        }

        if (action === "ride") {
          createRideForCustomer(customer);
          return;
        }

        if (action === "call") {
          state.callbacks.unshift({
            id: `CB-${Date.now()}`,
            customerId: customer.id,
            when: "heute",
            status: "offen",
            note: "Anruf aus Kundenverwaltung"
          });
          customer.communication.unshift({ at: nowStamp(), type: "Anruf simuliert", text: `Anruf an ${customer.phone}` });
          saveShared();
          renderAll();
          return;
        }

        if (action === "note") {
          openNoteModal(customer.id);
          return;
        }

        if (action === "task") {
          createTaskForCustomer(customer.id, "Kundenanliegen prüfen");
          return;
        }

        if (action === "lock") {
          customer.locked = !customer.locked;
          customer.status = customer.locked ? "Gesperrt" : "Aktiv";
          customer.updatedAt = todayISO();
          saveShared();
          renderAll();
        }
      }

      const rideAction = event.target.closest("[data-customer-ride-action]");
      if (rideAction) {
        const action = rideAction.getAttribute("data-customer-ride-action");
        const rideId = rideAction.getAttribute("data-customer-ride-id") || "";
        const customer = getSelectedCustomer();
        if (!customer) return;
        const sourceRide = (customer.rides || []).find((item) => item.id === rideId) || null;
        if (!sourceRide) return;
        createRideForCustomer(customer, sourceRide, action === "return");
        return;
      }

      const taskAction = event.target.closest("[data-customer-task-action]");
      if (taskAction) {
        const action = taskAction.getAttribute("data-customer-task-action");
        const taskId = taskAction.getAttribute("data-customer-task-id") || "";
        const task = state.tasks.find((item) => item.id === taskId);
        if (!task) return;
        if (action === "done") task.status = "erledigt";
        if (action === "progress") task.status = "in Bearbeitung";
        saveShared();
        renderProfile();
      }

      if (event.target.closest("[data-customer-modal-close]")) {
        closeModal();
      }

      const saveModal = event.target.closest('[data-customer-modal-action="save"]');
      if (saveModal && state.modalContext) {
        if (state.modalContext.type === "createCustomer") {
          saveNewCustomerFromModal();
        }
        if (state.modalContext.type === "saveNote") {
          saveNoteFromModal(state.modalContext.customerId);
        }
      }
    });
  }

  function bindModalClose() {
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

  function renderAll() {
    renderStats();
    renderCustomers();
    renderProfile();
  }

  function init() {
    renderAll();
    bindSearch();
    bindFilters();
    bindProfileTabs();
    bindActions();
    bindModalClose();
    bindDisabledNavItems();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
