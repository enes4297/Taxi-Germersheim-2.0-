(() => {
  const S = window.AdminSystemCenter || {};
  const STORAGE_KEYS = {
    customers: "adminSharedCustomersV14",
    tasks: "adminSharedTasksV14",
    callbacks: "adminSharedCallbacksV14",
    series: "adminSharedSeriesV14",
    rideInbox: "adminSharedRideInboxV14"
  };

  const RIDE_TYPES = [
    "Taxi", "Krankenfahrt", "Dialyse", "Chemo", "Strahlentherapie", "Rollstuhlfahrt", "Flughafenfahrt",
    "Schülerfahrt", "Firmenfahrt", "Bahntransfer", "Kurierfahrt", "Fernfahrt", "Abholung", "Rückfahrt"
  ];

  const KNOWN_CUSTOMERS = [
    {
      id: "K-1001",
      customerNumber: "TG-K-1001",
      type: "Patient",
      firstName: "Helga",
      lastName: "Maurer",
      phone: "0172 901 2288",
      altPhone: "0176 771 0011",
      email: "helga.maurer@demo.de",
      birthDate: "1958-02-11",
      insuranceNumber: "AOK-5588-201",
      insurance: "AOK",
      company: "",
      facility: "Dialysezentrum Südpfalz",
      language: "Deutsch",
      preferredContact: "Telefon",
      status: "Aktiv",
      locked: false,
      createdAt: "2026-02-05",
      updatedAt: "2026-07-30",
      mobility: "Rollator",
      wheelchair: false,
      rollator: true,
      stairChair: false,
      companion: false,
      oxygen: false,
      support: "Hilfe bis Wohnungstür",
      doctor: "Praxis Dr. Klein",
      contactPerson: "Tochter Frau Maurer",
      billingType: "Krankenkasse",
      permitStatus: "Genehmigung vorhanden",
      transportFormStatus: "vorhanden",
      permit: {
        number: "GEN-2026-554",
        validFrom: "2026-01-01",
        validTo: "2026-12-31",
        approvedRides: 156,
        remainingRides: 48,
        returnApproved: true,
        document: true,
        note: "Quartalsprüfung im Oktober"
      },
      checklist: {
        transportschein: "vorhanden",
        genehmigung: "vorhanden",
        versicherungsdaten: "geprüft",
        kostenuebernahme: "vorhanden",
        befreiungskarte: "vorhanden",
        serienbestaetigung: "vorhanden",
        sonstige: "offen"
      },
      notes: [
        { id: "N-1", type: "Wichtig", pinned: true, at: "2026-07-29 10:22", staff: "Enes", text: "Bitte 10 Minuten vor Ankunft anrufen." },
        { id: "N-2", type: "Fahrerhinweis", pinned: false, at: "2026-07-25 08:10", staff: "Dispo Team", text: "Rollator muss im Kofferraum gesichert werden." }
      ],
      communication: [
        { at: "2026-08-02 08:11", type: "eingehender Anruf", text: "Rückfahrt 14:30 bestätigt" },
        { at: "2026-08-01 15:40", type: "Fahrt erstellt", text: "Dialysefahrt Montag/Mittwoch/Freitag" }
      ],
      addresses: [
        {
          id: "A-1001-1",
          label: "Zuhause",
          type: "Zuhause",
          fullAddress: "Germersheim Nord 12",
          contact: "Helga Maurer",
          phone: "0172 901 2288",
          entrance: "Hauseingang links",
          floor: "2",
          bell: "Maurer",
          pickupHint: "Bitte Aufzug nutzen",
          preferredVehicle: "Kombi",
          isDefault: true
        },
        {
          id: "A-1001-2",
          label: "Dialyse",
          type: "Dialyse",
          fullAddress: "Dialysezentrum Südpfalz, Speyerer Str. 18",
          contact: "Empfang Dialyse",
          phone: "06232 999123",
          entrance: "Seiteneingang",
          floor: "EG",
          bell: "Dialyse",
          pickupHint: "Patientenabholung hinten",
          preferredVehicle: "Rollator-freundlich",
          isDefault: false
        }
      ],
      rides: [
        { id: "TG-3001", date: "2026-08-01", time: "07:40", pickup: "Germersheim Nord 12", destination: "Dialysezentrum Südpfalz", rideType: "Dialyse", driver: "Sabine Hoffmann", vehicle: "GER-TK 230", price: "Krankenkasse", status: "Abgeschlossen" },
        { id: "TG-3002", date: "2026-08-02", time: "07:45", pickup: "Germersheim Nord 12", destination: "Dialysezentrum Südpfalz", rideType: "Dialyse", driver: "Julia Schneider", vehicle: "GER-TK 214", price: "Krankenkasse", status: "Abgeschlossen" }
      ],
      seriesRides: [
        { id: "SR-901", type: "Dialyse", days: "Mo/Mi/Fr", pickupTime: "07:40", returnTime: "11:45", active: true }
      ],
      openRide: "TG-3110",
      importantHint: "Patient benötigt Hilfe bis zur Wohnungstür"
    },
    {
      id: "K-1002",
      customerNumber: "TG-K-1002",
      type: "Patient",
      firstName: "Nora",
      lastName: "Winter",
      phone: "0172 901 2244",
      altPhone: "",
      email: "n.winter@demo.de",
      birthDate: "1970-09-02",
      insuranceNumber: "TK-7731-90",
      insurance: "TK",
      company: "",
      facility: "Onkologie Ludwigshafen",
      language: "Deutsch",
      preferredContact: "Telefon",
      status: "Aktiv",
      locked: false,
      createdAt: "2026-03-10",
      updatedAt: "2026-08-01",
      mobility: "mit Hilfe",
      wheelchair: false,
      rollator: false,
      stairChair: false,
      companion: true,
      oxygen: false,
      support: "Seiteneingang Klinik verwenden",
      doctor: "Dr. Schulz",
      contactPerson: "Sohn Tim Winter",
      billingType: "Krankenkasse",
      permitStatus: "Rückfrage erforderlich",
      transportFormStatus: "angefordert",
      permit: {
        number: "GEN-2026-110",
        validFrom: "2026-05-01",
        validTo: "2026-09-30",
        approvedRides: 40,
        remainingRides: 6,
        returnApproved: true,
        document: true,
        note: "Neue Verordnung anfordern"
      },
      checklist: {
        transportschein: "angefordert",
        genehmigung: "vorhanden",
        versicherungsdaten: "geprüft",
        kostenuebernahme: "offen",
        befreiungskarte: "vorhanden",
        serienbestaetigung: "offen",
        sonstige: "offen"
      },
      notes: [
        { id: "N-10", type: "Dispositionshinweis", pinned: true, at: "2026-07-31 09:00", staff: "Enes", text: "Seiteneingang der Klinik verwenden." }
      ],
      communication: [
        { at: "2026-08-02 16:03", type: "Rückruf", text: "Rückfahrt offen, Klärung um 18:00" }
      ],
      addresses: [
        {
          id: "A-1002-1",
          label: "Zuhause",
          type: "Zuhause",
          fullAddress: "Leimersheim Hauptstraße 9",
          contact: "Nora Winter",
          phone: "0172 901 2244",
          entrance: "Vorne",
          floor: "1",
          bell: "Winter",
          pickupHint: "2 Stufen vor der Tür",
          preferredVehicle: "Limousine",
          isDefault: true
        },
        {
          id: "A-1002-2",
          label: "Onkologie",
          type: "Onkologie",
          fullAddress: "Onkologie Ludwigshafen",
          contact: "Empfang Onkologie",
          phone: "0621 880022",
          entrance: "Seiteneingang B",
          floor: "EG",
          bell: "Onkologie",
          pickupHint: "Abholung an Tür B3",
          preferredVehicle: "Van",
          isDefault: false
        }
      ],
      rides: [
        { id: "TG-3010", date: "2026-08-02", time: "09:20", pickup: "Leimersheim Hauptstraße 9", destination: "Onkologie Ludwigshafen", rideType: "Chemo", driver: "Mehmet Yildiz", vehicle: "GER-TK 340", price: "Krankenkasse", status: "Abgeschlossen" }
      ],
      seriesRides: [
        { id: "SR-902", type: "Chemo", days: "Di/Do", pickupTime: "09:20", returnTime: "14:30", active: true }
      ],
      openRide: "",
      importantHint: "Bitte 10 Minuten vor Ankunft anrufen"
    },
    {
      id: "K-2001",
      customerNumber: "TG-K-2001",
      type: "Firmenkunde",
      firstName: "",
      lastName: "",
      phone: "07274 901700",
      altPhone: "",
      email: "dispatch@rheinbahn-demo.de",
      birthDate: "",
      insuranceNumber: "",
      insurance: "",
      company: "RheinBahn Service GmbH",
      facility: "Bahnunternehmen",
      language: "Deutsch",
      preferredContact: "E-Mail",
      status: "Aktiv",
      locked: false,
      createdAt: "2026-01-14",
      updatedAt: "2026-07-20",
      department: "Disposition",
      contactName: "Eva Kranz",
      costCenter: "RB-41",
      paymentTerm: "14 Tage",
      contractPrice: "89 EUR Strecke",
      frameworkContract: "Ja",
      billingType: "Monatsrechnung",
      notes: [
        { id: "N-20", type: "Abrechnung", pinned: true, at: "2026-07-28 15:15", staff: "Buchhaltung", text: "Kostenstelle RB-41 verpflichtend in jeder Fahrt." }
      ],
      communication: [
        { at: "2026-08-01 11:40", type: "eingehender Anruf", text: "Bahntransfer für Teamleiter" }
      ],
      addresses: [
        {
          id: "A-2001-1",
          label: "Hauptstandort",
          type: "Arbeit",
          fullAddress: "RheinBahn Service, Germersheim Süd 7",
          contact: "Eva Kranz",
          phone: "07274 901700",
          entrance: "Tor 2",
          floor: "1",
          bell: "Disposition",
          pickupHint: "Sammelpunkt Verwaltung",
          preferredVehicle: "Business",
          isDefault: true
        }
      ],
      rides: [
        { id: "TG-5001", date: "2026-08-01", time: "06:30", pickup: "RheinBahn Service, Germersheim Süd 7", destination: "Mannheim Hbf", rideType: "Bahntransfer", driver: "Michael Becker", vehicle: "GER-TK 203", price: "Rahmenvertrag", status: "Abgeschlossen" }
      ],
      seriesRides: [
        { id: "SR-940", type: "Bahntransfer", days: "Mo-Fr", pickupTime: "06:30", returnTime: "17:20", active: true }
      ],
      openRide: "TG-5020",
      importantHint: "Teamtransporte benötigen 10 Minuten Vorlauf"
    }
  ];

  const DEFAULT_TASKS = [
    { id: "T-1", title: "Kunde zurückrufen", customerId: "K-1002", owner: "Enes", due: "2026-08-03", priority: "Hoch", status: "offen", note: "Rückfahrtzeit bestätigen" },
    { id: "T-2", title: "Genehmigung prüfen", customerId: "K-1002", owner: "Enes", due: "2026-08-04", priority: "Mittel", status: "in Bearbeitung", note: "Neue Verordnung angefragt" },
    { id: "T-3", title: "Adresse bestätigen", customerId: "K-2001", owner: "Sara", due: "2026-08-05", priority: "Niedrig", status: "wartet auf Rückmeldung", note: "Tor 2 oder Tor 3" }
  ];

  const DEFAULT_CALLBACKS = [
    { id: "CB-1", customerId: "K-1002", when: "heute", status: "offen", note: "Rückfahrt nach Chemo klären" },
    { id: "CB-2", customerId: "K-1001", when: "später", status: "später", note: "Neue Termine bestätigen" },
    { id: "CB-3", customerId: "K-2001", when: "überfällig", status: "überfällig", note: "Kostenstelle prüfen" }
  ];

  const DEFAULT_SERIES = [
    { id: "SR-901", customerId: "K-1001", type: "Dialyse", nextDate: "2026-08-04", days: "Mo/Mi/Fr", status: "aktiv" },
    { id: "SR-902", customerId: "K-1002", type: "Chemo", nextDate: "2026-08-05", days: "Di/Do", status: "aktiv" },
    { id: "SR-940", customerId: "K-2001", type: "Bahntransfer", nextDate: "2026-08-04", days: "Mo-Fr", status: "aktiv" }
  ];

  const DEMO_DRIVERS = ["Michael Becker", "Sabine Hoffmann", "Julia Schneider", "Mehmet Yildiz", "Fatma Aydin"];
  const DEMO_VEHICLES = [
    { plate: "GER-TK 203", type: "Limousine", wheelchair: false },
    { plate: "GER-TK 230", type: "Rollstuhl", wheelchair: true },
    { plate: "GER-TK 214", type: "Van", wheelchair: false },
    { plate: "GER-TK 340", type: "Großraum", wheelchair: true }
  ];

  const state = {
    customers: loadWithFallback(STORAGE_KEYS.customers, KNOWN_CUSTOMERS),
    tasks: loadWithFallback(STORAGE_KEYS.tasks, DEFAULT_TASKS),
    callbacks: loadWithFallback(STORAGE_KEYS.callbacks, DEFAULT_CALLBACKS),
    series: loadWithFallback(STORAGE_KEYS.series, DEFAULT_SERIES),
    selectedCustomerId: "K-1001",
    currentCall: {
      status: "Klingelt",
      number: "+49 172 901 2288",
      startedAt: Date.now(),
      connectedAt: null
    },
    searchTerm: "",
    recentCallers: ["+49 172 901 2288", "+49 172 901 2244", "+49 7274 901700", "+49 172 901 9988"],
    durationTimer: null,
    mobileTab: "anruf",
    rightTab: "last"
  };

  function loadWithFallback(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return JSON.parse(JSON.stringify(fallback));
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : JSON.parse(JSON.stringify(fallback));
    } catch {
      return JSON.parse(JSON.stringify(fallback));
    }
  }

  function saveShared() {
    localStorage.setItem(STORAGE_KEYS.customers, JSON.stringify(state.customers));
    localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(state.tasks));
    localStorage.setItem(STORAGE_KEYS.callbacks, JSON.stringify(state.callbacks));
    localStorage.setItem(STORAGE_KEYS.series, JSON.stringify(state.series));
  }

  function normalize(v) {
    return String(v || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function formatDate(value) {
    if (S.formatDate) return S.formatDate(value);
    return String(value || "-");
  }

  function getCustomerLabel(customer) {
    if (!customer) return "Unbekannter Anrufer";
    if (customer.type === "Firmenkunde") return customer.company || customer.facility || "Firmenkunde";
    return `${customer.firstName} ${customer.lastName}`.trim();
  }

  function getSelectedCustomer() {
    return state.customers.find((item) => item.id === state.selectedCustomerId) || null;
  }

  function detectByPhone(number) {
    const normalized = normalize(number).replace(/[^\d+]/g, "");
    return state.customers.find((customer) => {
      const phone = normalize(customer.phone).replace(/[^\d+]/g, "");
      const alt = normalize(customer.altPhone).replace(/[^\d+]/g, "");
      return phone === normalized || (alt && alt === normalized);
    }) || null;
  }

  function updateCallPanel() {
    const customer = detectByPhone(state.currentCall.number);
    const statusPill = document.querySelector("[data-call-status-pill]");
    const numberNode = document.querySelector("[data-call-number]");
    const customerNode = document.querySelector("[data-call-detected-customer]");
    const typeNode = document.querySelector("[data-call-customer-type]");
    const openCount = document.querySelector("[data-call-open-count]");

    if (statusPill) {
      statusPill.textContent = state.currentCall.status;
      statusPill.classList.remove("status-ringing", "status-connected", "status-hold", "status-ended");
      if (state.currentCall.status === "Klingelt") statusPill.classList.add("status-ringing");
      if (state.currentCall.status === "Verbunden") statusPill.classList.add("status-connected");
      if (state.currentCall.status === "Gehalten") statusPill.classList.add("status-hold");
      if (state.currentCall.status === "Beendet") statusPill.classList.add("status-ended");
    }

    if (numberNode) numberNode.textContent = state.currentCall.number;
    if (customerNode) customerNode.textContent = customer ? getCustomerLabel(customer) : "Unbekannter Anrufer";
    if (typeNode) typeNode.textContent = `Kundentyp: ${customer ? customer.type : "-"}`;

    if (customer) {
      state.selectedCustomerId = customer.id;
      fillFormFromCustomer(customer);
      renderSelectedCustomer();
      renderAddresses();
      renderRightColumn();
    }

    if (openCount) {
      const count = state.tasks.filter((item) => item.status !== "erledigt").length;
      openCount.textContent = String(count);
    }
  }

  function setFeedback(text, tone = "") {
    const node = document.querySelector("[data-call-feedback]");
    if (!node) return;
    node.textContent = text;
    node.classList.remove("is-ok", "is-error");
    if (tone === "ok") node.classList.add("is-ok");
    if (tone === "error") node.classList.add("is-error");
  }

  function formatDuration() {
    const node = document.querySelector("[data-call-duration]");
    if (!node) return;
    const base = state.currentCall.connectedAt || state.currentCall.startedAt;
    const sec = Math.max(0, Math.floor((Date.now() - base) / 1000));
    const mm = String(Math.floor(sec / 60)).padStart(2, "0");
    const ss = String(sec % 60).padStart(2, "0");
    node.textContent = `${mm}:${ss}`;
  }

  function renderRecentCallers() {
    const wrap = document.querySelector("[data-call-last-list]");
    if (!wrap) return;
    wrap.innerHTML = state.recentCallers
      .map((number) => {
        const customer = detectByPhone(number);
        return `
          <article class="call-last-entry">
            <strong>${number}</strong>
            <small>${customer ? getCustomerLabel(customer) : "Unbekannter Anrufer"}</small>
          </article>
        `;
      })
      .join("");
  }

  function runSearch() {
    const wrap = document.querySelector("[data-call-search-results]");
    if (!wrap) return;

    const term = normalize(state.searchTerm).trim();
    const matches = state.customers.filter((customer) => {
      if (!term) return true;
      const fullName = getCustomerLabel(customer);
      const haystack = normalize([
        fullName,
        customer.phone,
        customer.customerNumber,
        customer.birthDate,
        customer.insuranceNumber,
        customer.company,
        customer.facility,
        customer.addresses.map((addr) => addr.fullAddress).join(" ")
      ].join(" "));
      return haystack.includes(term);
    }).slice(0, 5);

    wrap.innerHTML = matches.length
      ? matches.map((customer) => {
        const lastRide = customer.rides[0] ? `${formatDate(customer.rides[0].date)} ${customer.rides[0].time}` : "-";
        return `
          <article class="call-search-item" data-call-customer-select="${customer.id}">
            <strong>${getCustomerLabel(customer)}</strong>
            <p>${customer.phone} · ${customer.type}</p>
            <div class="call-search-tags">
              <span class="call-tag">Letzte Fahrt: ${lastRide}</span>
              <span class="call-tag">Offene Fahrt: ${customer.openRide || "-"}</span>
            </div>
          </article>
        `;
      }).join("")
      : '<article class="admin-empty-state"><strong>Keine Treffer</strong><p>Keine Kunden zur Suche gefunden.</p></article>';
  }

  function renderSelectedCustomer() {
    const node = document.querySelector("[data-call-selected-customer]");
    const customer = getSelectedCustomer();
    if (!node) return;
    if (!customer) {
      node.innerHTML = '<article class="admin-empty-state"><strong>Kein Kunde ausgewählt</strong><p>Bitte Kunde auswählen oder anlegen.</p></article>';
      return;
    }

    const pinnedNotes = customer.notes.filter((n) => n.pinned);

    node.innerHTML = `
      <article class="call-selected-box">
        <strong>${getCustomerLabel(customer)}</strong>
        <p>${customer.customerNumber} · ${customer.type}</p>
        <p>Telefon: ${customer.phone} · Sprache: ${customer.language || "Deutsch"}</p>
        <p>Status: ${customer.status}${customer.locked ? " (gesperrt)" : ""}</p>
        <p><b>Wichtiger Hinweis:</b> ${customer.importantHint || "-"}</p>
        ${pinnedNotes.length ? `<p><b>Angeheftete Notiz:</b> ${pinnedNotes[0].text}</p>` : ""}
      </article>
    `;
  }

  function renderAddresses() {
    const wrap = document.querySelector("[data-call-address-list]");
    const customer = getSelectedCustomer();
    if (!wrap) return;

    if (!customer || !customer.addresses.length) {
      wrap.innerHTML = '<article class="admin-empty-state"><strong>Keine Adresse</strong><p>Bitte neue Adresse anlegen.</p></article>';
      return;
    }

    wrap.innerHTML = customer.addresses.map((address) => {
      return `
        <article class="call-address-item">
          <h4>${address.label} ${address.isDefault ? "· Standard" : ""}</h4>
          <p>${address.fullAddress}</p>
          <p>${address.contact} · ${address.phone}</p>
          <p>Eingang: ${address.entrance}, Etage: ${address.floor}, Klingel: ${address.bell}</p>
          <p>Hinweis: ${address.pickupHint}</p>
          <div class="call-address-actions-mini">
            <button type="button" data-call-address-use="pickup" data-call-address-id="${address.id}">Als Abholadresse</button>
            <button type="button" data-call-address-use="destination" data-call-address-id="${address.id}">Als Zieladresse</button>
          </div>
        </article>
      `;
    }).join("");
  }

  function fillFormFromCustomer(customer) {
    const form = document.querySelector("[data-call-ride-form]");
    if (!form || !customer) return;
    form.customer.value = getCustomerLabel(customer);
    form.phone.value = customer.phone;

    const defaultAddress = customer.addresses.find((address) => address.isDefault) || customer.addresses[0];
    if (defaultAddress) {
      form.pickup.value = defaultAddress.fullAddress;
    }

    const medicalAddress = customer.addresses.find((address) => ["Dialyse", "Onkologie", "Krankenhaus", "Hausarzt", "Pflegeheim"].includes(address.type));
    if (medicalAddress) {
      form.destination.value = medicalAddress.fullAddress;
    }

    if (customer.type === "Patient") {
      form.billing.value = "Krankenkasse";
      form.payment.value = "Krankenkasse";
      form.wheelchair.value = customer.wheelchair ? "Ja" : "Nein";
      form.rollator.value = customer.rollator ? "Ja" : "Nein";
      form.companion.value = customer.companion ? "Ja" : "Nein";
      form.notes.value = customer.importantHint || "";
    }
  }

  function fillRideTypeSelect() {
    const select = document.querySelector("[data-call-ride-type]");
    if (!select) return;
    select.innerHTML = RIDE_TYPES.map((type) => `<option value="${type}">${type}</option>`).join("");
  }

  function defaultDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function defaultTime(offset = 0) {
    const now = new Date(Date.now() + offset * 60000);
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }

  function setupDefaultForm() {
    const form = document.querySelector("[data-call-ride-form]");
    if (!form) return;
    form.date.value = defaultDate();
    form.time.value = defaultTime(15);
  }

  function buildRecommendation(ride) {
    const alternatives = DEMO_VEHICLES.map((vehicle, idx) => {
      const distance = 4 + idx * 3;
      const driver = DEMO_DRIVERS[idx % DEMO_DRIVERS.length];
      const conflicts = [];
      if (ride.wheelchair === "Ja" && !vehicle.wheelchair) {
        conflicts.push("Rollstuhlanforderung passt nicht");
      }
      if (ride.persons > (vehicle.type === "Großraum" ? 8 : vehicle.type === "Van" ? 7 : 4)) {
        conflicts.push("Sitzplätze knapp");
      }
      return {
        plate: vehicle.plate,
        type: vehicle.type,
        driver,
        distance,
        eta: `${distance + 4} Min`,
        conflicts
      };
    }).sort((a, b) => a.distance - b.distance);

    const recommended = alternatives.find((alt) => alt.conflicts.length === 0) || alternatives[0];
    return { recommended, alternatives };
  }

  function renderRecommendationBlock(payload, ride, recommendation) {
    const node = document.querySelector("[data-call-recommendation]");
    if (!node) return;

    node.innerHTML = `
      <h3>Dispositions-Empfehlung</h3>
      <article class="call-reco-card">
        <p><b>Empfohlenes Fahrzeug:</b> ${recommendation.recommended.plate} (${recommendation.recommended.type})</p>
        <p><b>Empfohlener Fahrer:</b> ${recommendation.recommended.driver}</p>
        <p><b>Entfernung Demo:</b> ${recommendation.recommended.distance} Minuten · <b>Voraussichtliche Ankunft:</b> ${recommendation.recommended.eta}</p>
        <p><b>Konflikte:</b> ${recommendation.recommended.conflicts.length ? recommendation.recommended.conflicts.join(", ") : "Keine"}</p>
      </article>
      <div class="call-reco-actions">
        <button class="admin-btn" type="button" data-call-reco-action="assignNow" data-call-ride-id="${payload.id}" data-call-plate="${recommendation.recommended.plate}" data-call-driver="${recommendation.recommended.driver}">Direkt zuweisen</button>
        <button class="admin-btn admin-btn-secondary" type="button" data-call-reco-action="later" data-call-ride-id="${payload.id}">Später zuweisen</button>
        <button class="admin-btn admin-btn-secondary" type="button" data-call-reco-action="openDispo" data-call-ride-id="${payload.id}">In Live-Dispo öffnen</button>
      </div>
      <p><b>Alternative Fahrzeuge:</b> ${recommendation.alternatives.slice(1, 4).map((alt) => `${alt.plate} (${alt.distance} Min)`).join(" · ")}</p>
    `;
  }

  function addRideToInbox(ride) {
    const current = loadWithFallback(STORAGE_KEYS.rideInbox, []);
    current.unshift(ride);
    localStorage.setItem(STORAGE_KEYS.rideInbox, JSON.stringify(current.slice(0, 120)));
  }

  function updateCustomerAfterRide(customer, payload) {
    if (!customer) return;
    customer.updatedAt = defaultDate();
    customer.rides.unshift({
      id: payload.id,
      date: payload.date,
      time: payload.time,
      pickup: payload.pickup,
      destination: payload.destination,
      rideType: payload.rideType,
      driver: payload.driver || "-",
      vehicle: payload.vehicle || "-",
      price: payload.billing,
      status: payload.status || "Neu"
    });
    customer.openRide = payload.id;
    customer.communication.unshift({
      at: `${payload.date} ${payload.time}`,
      type: "Fahrt erstellt",
      text: `${payload.id} ${payload.pickup} → ${payload.destination}`
    });
  }

  function createRideFromForm() {
    const form = document.querySelector("[data-call-ride-form]");
    if (!form) return null;

    const values = Object.fromEntries(new FormData(form).entries());
    const required = ["customer", "phone", "pickup", "destination", "date", "time", "rideType"];
    const missing = required.find((key) => !String(values[key] || "").trim());
    if (missing) {
      setFeedback("Bitte alle Pflichtfelder ausfüllen.", "error");
      return null;
    }

    const id = `TG-${2000 + Math.floor(Math.random() * 7000)}`;
    return {
      id,
      customer: values.customer,
      phone: values.phone,
      pickup: values.pickup,
      destination: values.destination,
      date: values.date,
      time: values.time,
      rideType: values.rideType,
      persons: Number(values.persons || 1),
      vehicleType: values.vehicleType || "",
      wheelchair: values.wheelchair,
      rollator: values.rollator,
      companion: values.companion,
      luggage: values.luggage || "",
      returnTrip: values.returnTrip,
      returnTime: values.returnTime || "",
      notes: values.notes || "",
      priority: values.priority,
      payment: values.payment,
      billing: values.billing,
      status: "Neu",
      createdAt: `${values.date} ${values.time}`
    };
  }

  function appendOpenRide(ride) {
    const target = document.querySelector("[data-call-open-rides]");
    if (!target) return;
    const current = target.innerHTML;
    target.innerHTML = `
      <article class="call-open-item">
        <strong>${ride.id}</strong>
        <p>${ride.customer} · ${ride.time} · ${ride.pickup} → ${ride.destination}</p>
        <div class="call-item-actions">
          <button type="button" data-call-open-action="openDispo" data-call-ride-id="${ride.id}">In Live-Dispo</button>
          <button type="button" data-call-open-action="task" data-call-ride-id="${ride.id}">Aufgabe erstellen</button>
        </div>
      </article>
    ` + current;
  }

  function renderRightColumn() {
    const customer = getSelectedCustomer();
    const wrap = document.querySelector("[data-call-right-content]");
    if (!wrap) return;

    const activeTabs = document.querySelectorAll("[data-call-right-tab]");
    activeTabs.forEach((button) => {
      const key = button.getAttribute("data-call-right-tab");
      button.classList.toggle("is-active", key === state.rightTab);
    });

    if (state.rightTab === "last") {
      const rides = customer ? customer.rides.slice(0, 8) : [];
      wrap.innerHTML = `
        <h3>Letzte Fahrten</h3>
        <div class="call-history-list" data-call-last-rides>
          ${rides.length ? rides.map((ride) => `
        <article class="call-history-item">
          <strong>${ride.id} · ${formatDate(ride.date)} ${ride.time}</strong>
          <p>${ride.pickup} → ${ride.destination}</p>
          <p>${ride.rideType} · ${ride.driver} · ${ride.vehicle} · ${ride.status}</p>
          <div class="call-item-actions">
            <button type="button" data-call-history-action="repeat" data-call-ride-id="${ride.id}">Erneut buchen</button>
            <button type="button" data-call-history-action="return" data-call-ride-id="${ride.id}">Rückfahrt erstellen</button>
            <button type="button" data-call-history-action="series" data-call-ride-id="${ride.id}">Als Serienfahrt</button>
          </div>
        </article>
      `).join("") : '<article class="admin-empty-state"><strong>Keine Fahrten</strong><p>Für diesen Kunden gibt es noch keine Fahrten.</p></article>'}
        </div>
      `;
      return;
    }

    if (state.rightTab === "open") {
      const openRides = customer ? customer.rides.filter((ride) => ["Neu", "Wartet", "Bestätigt", "Zugewiesen"].includes(ride.status)).slice(0, 6) : [];
      wrap.innerHTML = `
        <h3>Offene Fahrten</h3>
        <div class="call-open-rides" data-call-open-rides>
          ${openRides.length ? openRides.map((ride) => `
        <article class="call-open-item">
          <strong>${ride.id}</strong>
          <p>${formatDate(ride.date)} ${ride.time} · ${ride.pickup} → ${ride.destination}</p>
          <p>Status: ${ride.status}</p>
        </article>
      `).join("") : '<article class="admin-empty-state"><strong>Keine offenen Fahrten</strong><p>Aktuell kein offener Auftrag.</p></article>'}
        </div>
      `;
      return;
    }

    if (state.rightTab === "series") {
      const seriesItems = customer ? state.series.filter((item) => item.customerId === customer.id) : [];
      wrap.innerHTML = `
        <h3>Serienfahrten</h3>
        <div class="call-series-list">
          ${seriesItems.length ? seriesItems.map((item) => `
        <article class="call-series-item">
          <strong>${item.id} · ${item.type}</strong>
          <p>Nächster Termin: ${formatDate(item.nextDate)} · Tage: ${item.days}</p>
        </article>
      `).join("") : '<article class="admin-empty-state"><strong>Keine Serienfahrt</strong><p>Noch keine Serienfahrt vorhanden.</p></article>'}
        </div>
      `;
      return;
    }

    if (state.rightTab === "tasks") {
      const tasks = state.tasks.filter((task) => !customer || task.customerId === customer.id).slice(0, 10);
      wrap.innerHTML = `
        <h3>Offene Aufgaben</h3>
        <div class="call-task-list">
          ${tasks.length ? tasks.map((task) => `
        <article class="call-task-item">
          <strong>${task.title}</strong>
          <p>Fällig: ${formatDate(task.due)} · Priorität: ${task.priority} · Status: ${task.status}</p>
          <p>${task.note}</p>
          <div class="call-item-actions">
            <button type="button" data-call-task-action="done" data-call-task-id="${task.id}">Erledigt</button>
            <button type="button" data-call-task-action="progress" data-call-task-id="${task.id}">In Bearbeitung</button>
          </div>
        </article>
      `).join("") : '<article class="admin-empty-state"><strong>Keine Aufgaben</strong><p>Aktuell keine offenen Aufgaben.</p></article>'}
        </div>
      `;
      return;
    }

    const callbacks = state.callbacks.slice(0, 10);
    wrap.innerHTML = `
      <h3>Rückruf-Liste</h3>
      <div class="call-callback-list">
        ${callbacks.length ? callbacks.map((cb) => {
        const linkedCustomer = state.customers.find((c) => c.id === cb.customerId);
        return `
          <article class="call-callback-item">
            <strong>${linkedCustomer ? getCustomerLabel(linkedCustomer) : "Unbekannt"}</strong>
            <p>Typ: ${cb.when} · Status: ${cb.status}</p>
            <p>${cb.note}</p>
            <div class="call-item-actions">
              <button type="button" data-call-callback-action="start" data-call-callback-id="${cb.id}">Anruf starten</button>
              <button type="button" data-call-callback-action="openCustomer" data-call-callback-id="${cb.id}">Kunde öffnen</button>
              <button type="button" data-call-callback-action="done" data-call-callback-id="${cb.id}">Erledigt</button>
            </div>
          </article>
        `;
      }).join("") : '<article class="admin-empty-state"><strong>Keine Rückrufe</strong><p>Rückrufliste ist leer.</p></article>'}
      </div>
    `;
  }

  function openModal(title, body, foot) {
    const modal = document.querySelector("[data-call-modal]");
    const titleNode = document.querySelector("[data-call-modal-title]");
    const bodyNode = document.querySelector("[data-call-modal-body]");
    const footNode = document.querySelector("[data-call-modal-foot]");
    if (!modal || !titleNode || !bodyNode || !footNode) return;
    titleNode.textContent = title;
    bodyNode.innerHTML = body;
    footNode.innerHTML = foot || '<button class="admin-btn admin-btn-secondary" type="button" data-call-modal-close>Schließen</button>';
    modal.hidden = false;
    document.body.classList.add("admin-modal-open");
  }

  function closeModal() {
    const modal = document.querySelector("[data-call-modal]");
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove("admin-modal-open");
  }

  function createCustomerDraft(fromCall = false) {
    const body = `
      <form class="call-modal-grid" data-call-new-customer-form>
        <label><span>Vorname</span><input class="driver-search-input" name="firstName" required></label>
        <label><span>Nachname / Firma</span><input class="driver-search-input" name="lastName" required></label>
        <label><span>Telefon</span><input class="driver-search-input" name="phone" value="${fromCall ? state.currentCall.number : ""}" required></label>
        <label><span>E-Mail</span><input class="driver-search-input" name="email"></label>
        <label><span>Geburtsdatum</span><input class="driver-search-input" type="date" name="birthDate"></label>
        <label><span>Versicherungsnummer</span><input class="driver-search-input" name="insuranceNumber"></label>
        <label><span>Kundentyp</span><select class="call-select" name="type"><option>Privatkunde</option><option>Patient</option><option>Firmenkunde</option><option>Pflegeheim</option><option>Arztpraxis</option><option>Klinik</option><option>Schule</option><option>Bahnunternehmen</option><option>Stammkunde</option></select></label>
        <label><span>Hauptadresse</span><input class="driver-search-input" name="address" required></label>
      </form>
      <p class="call-warning">Dublettensuche wird beim Speichern automatisch durchgeführt.</p>
    `;

    const foot = `
      <button class="admin-btn admin-btn-secondary" type="button" data-call-modal-close>Abbrechen</button>
      <button class="admin-btn" type="button" data-call-modal-action="saveCustomer">Kunde speichern</button>
    `;

    openModal("Neuen Kunden anlegen", body, foot);
  }

  function checkDuplicate(payload) {
    const phone = normalize(payload.phone);
    const name = normalize(`${payload.firstName} ${payload.lastName}`);
    const email = normalize(payload.email);
    const insurance = normalize(payload.insuranceNumber);
    const address = normalize(payload.address);

    return state.customers.find((customer) => {
      const customerName = normalize(getCustomerLabel(customer));
      const condPhone = phone && normalize(customer.phone) === phone;
      const condNameDob = name && customer.birthDate && payload.birthDate && customerName === name && customer.birthDate === payload.birthDate;
      const condEmail = email && normalize(customer.email) === email;
      const condInsurance = insurance && normalize(customer.insuranceNumber) === insurance;
      const condAddress = address && customer.addresses.some((addr) => normalize(addr.fullAddress) === address);
      return condPhone || condNameDob || condEmail || condInsurance || condAddress;
    }) || null;
  }

  function saveNewCustomerFromModal() {
    const form = document.querySelector("[data-call-new-customer-form]");
    if (!form) return;
    const payload = Object.fromEntries(new FormData(form).entries());

    if (!payload.firstName || !payload.lastName || !payload.phone || !payload.address) {
      setFeedback("Pflichtfelder für Kundenanlage fehlen.", "error");
      return;
    }

    const duplicate = checkDuplicate(payload);
    if (duplicate) {
      const body = `
        <p class="call-warning">Mögliche Dublette erkannt: <b>${getCustomerLabel(duplicate)}</b> (${duplicate.phone}).</p>
        <p>Optionen:</p>
        <div class="call-item-actions">
          <button type="button" data-call-duplicate-action="open" data-call-customer-id="${duplicate.id}">Bestehenden Kunden öffnen</button>
          <button type="button" data-call-duplicate-action="merge" data-call-customer-id="${duplicate.id}">Daten zusammenführen (Demo)</button>
          <button type="button" data-call-duplicate-action="forceSave">Trotzdem neu anlegen</button>
        </div>
      `;
      openModal("Dublettenprüfung", body, '<button class="admin-btn admin-btn-secondary" type="button" data-call-modal-close>Schließen</button>');
      state.pendingCustomerPayload = payload;
      return;
    }

    createCustomerFromPayload(payload);
  }

  function createCustomerFromPayload(payload) {
    const newId = `K-${1000 + Math.floor(Math.random() * 7000)}`;
    const customer = {
      id: newId,
      customerNumber: `TG-K-${Math.floor(Math.random() * 9000)}`,
      type: payload.type,
      firstName: payload.firstName,
      lastName: payload.lastName,
      phone: payload.phone,
      altPhone: "",
      email: payload.email || "",
      birthDate: payload.birthDate || "",
      insuranceNumber: payload.insuranceNumber || "",
      insurance: payload.type === "Patient" ? "AOK" : "",
      company: payload.type === "Firmenkunde" ? payload.lastName : "",
      facility: payload.type,
      language: "Deutsch",
      preferredContact: "Telefon",
      status: "Aktiv",
      locked: false,
      createdAt: defaultDate(),
      updatedAt: defaultDate(),
      mobility: payload.type === "Patient" ? "mit Hilfe" : "selbstständig",
      wheelchair: false,
      rollator: false,
      stairChair: false,
      companion: false,
      oxygen: false,
      support: "",
      doctor: "",
      contactPerson: "",
      billingType: payload.type === "Patient" ? "Krankenkasse" : "Privat",
      permitStatus: payload.type === "Patient" ? "Genehmigung angefragt" : "keine Genehmigung erforderlich",
      transportFormStatus: payload.type === "Patient" ? "angefordert" : "vorhanden",
      permit: {
        number: "",
        validFrom: "",
        validTo: "",
        approvedRides: 0,
        remainingRides: 0,
        returnApproved: false,
        document: false,
        note: ""
      },
      checklist: {
        transportschein: "offen",
        genehmigung: "offen",
        versicherungsdaten: "offen",
        kostenuebernahme: "offen",
        befreiungskarte: "offen",
        serienbestaetigung: "offen",
        sonstige: "offen"
      },
      notes: [],
      communication: [{ at: `${defaultDate()} ${defaultTime(0)}`, type: "Kunde angelegt", text: "Neuanlage über Telefonzentrale" }],
      addresses: [{
        id: `${newId}-A1`, label: "Hauptadresse", type: "Zuhause", fullAddress: payload.address,
        contact: `${payload.firstName} ${payload.lastName}`, phone: payload.phone, entrance: "", floor: "", bell: payload.lastName,
        pickupHint: "", preferredVehicle: "", isDefault: true
      }],
      rides: [],
      seriesRides: [],
      openRide: "",
      importantHint: ""
    };

    state.customers.unshift(customer);
    state.selectedCustomerId = customer.id;
    saveShared();
    closeModal();
    setFeedback(`Neuer Kunde ${getCustomerLabel(customer)} angelegt.`, "ok");
    renderAll();
    fillFormFromCustomer(customer);
  }

  function applyFastAction(action) {
    const form = document.querySelector("[data-call-ride-form]");
    if (!form) return;

    if (action === "now") form.time.value = defaultTime(0);
    if (action === "15") form.time.value = defaultTime(15);
    if (action === "30") form.time.value = defaultTime(30);
    if (action === "60") form.time.value = defaultTime(60);
    if (action === "today") form.date.value = defaultDate();
    if (action === "tomorrow") {
      const next = new Date(Date.now() + 86400000);
      form.date.value = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
    }
    if (action === "returnOpen") {
      form.returnTrip.value = "Ja";
      form.returnTime.value = "";
      form.notes.value = `${form.notes.value ? `${form.notes.value} · ` : ""}Rückfahrtzeit offen`;
    }
    if (action === "sameBack") {
      const pickup = form.pickup.value;
      const destination = form.destination.value;
      form.pickup.value = destination;
      form.destination.value = pickup;
      form.rideType.value = "Rückfahrt";
    }
  }

  function handleCallAction(action) {
    const customer = detectByPhone(state.currentCall.number);

    if (action === "accept") {
      state.currentCall.status = "Verbunden";
      state.currentCall.connectedAt = Date.now();
      setFeedback("Anruf verbunden (Demo).", "ok");
    }
    if (action === "hold") {
      state.currentCall.status = "Gehalten";
      setFeedback("Anruf gehalten (Demo).", "ok");
    }
    if (action === "resume") {
      state.currentCall.status = "Verbunden";
      setFeedback("Anruf fortgesetzt (Demo).", "ok");
    }
    if (action === "end") {
      state.currentCall.status = "Beendet";
      setFeedback("Anruf beendet (Demo).", "ok");
    }
    if (action === "callback") {
      if (!customer) {
        setFeedback("Für unbekannten Anrufer bitte zuerst Kunden anlegen.", "error");
      } else {
        state.callbacks.unshift({ id: `CB-${Date.now()}`, customerId: customer.id, when: "heute", status: "offen", note: "Rückruf aus Telefonzentrale" });
        saveShared();
        renderRightColumn();
        setFeedback(`Rückruf für ${getCustomerLabel(customer)} eingetragen.`, "ok");
      }
    }
    if (action === "newCustomer") {
      createCustomerDraft(true);
    }

    updateCallPanel();
  }

  function openInDispo() {
    window.location.href = "live-dispo.html";
  }

  function setMobileTab(tab) {
    state.mobileTab = tab;
    document.querySelectorAll("[data-call-mobile-tab]").forEach((button) => {
      const key = button.getAttribute("data-call-mobile-tab");
      button.classList.toggle("is-active", key === tab);
    });
    document.querySelectorAll("[data-call-pane]").forEach((pane) => {
      const key = pane.getAttribute("data-call-pane");
      pane.classList.toggle("is-mobile-visible", key === tab);
    });
  }

  function renderAll() {
    runSearch();
    renderSelectedCustomer();
    renderAddresses();
    renderRecentCallers();
    renderRightColumn();
    updateCallPanel();
  }

  function bindEvents() {
    document.addEventListener("click", (event) => {
      const callAction = event.target.closest("[data-call-action]");
      if (callAction) {
        const action = callAction.getAttribute("data-call-action");
        if (action === "openDispo") {
          openInDispo();
          return;
        }
        handleCallAction(action);
        return;
      }

      const customerPick = event.target.closest("[data-call-customer-select]");
      if (customerPick) {
        state.selectedCustomerId = customerPick.getAttribute("data-call-customer-select") || "";
        const selected = getSelectedCustomer();
        fillFormFromCustomer(selected);
        renderSelectedCustomer();
        renderAddresses();
        renderRightColumn();
        return;
      }

      const rightTab = event.target.closest("[data-call-right-tab]");
      if (rightTab) {
        state.rightTab = rightTab.getAttribute("data-call-right-tab") || "last";
        renderRightColumn();
        return;
      }

      const fast = event.target.closest("[data-call-fast]");
      if (fast) {
        applyFastAction(fast.getAttribute("data-call-fast") || "");
        return;
      }

      const addressUse = event.target.closest("[data-call-address-use]");
      if (addressUse) {
        const form = document.querySelector("[data-call-ride-form]");
        const customer = getSelectedCustomer();
        const addressId = addressUse.getAttribute("data-call-address-id");
        if (!form || !customer || !addressId) return;
        const address = customer.addresses.find((item) => item.id === addressId);
        if (!address) return;
        const mode = addressUse.getAttribute("data-call-address-use");
        if (mode === "pickup") form.pickup.value = address.fullAddress;
        if (mode === "destination") form.destination.value = address.fullAddress;
        setFeedback(`Adresse ${address.label} übernommen.`, "ok");
        return;
      }

      const addressAction = event.target.closest("[data-call-address-action]");
      if (addressAction) {
        const action = addressAction.getAttribute("data-call-address-action");
        const customer = getSelectedCustomer();
        if (!customer) {
          setFeedback("Bitte zuerst Kunden auswählen.", "error");
          return;
        }

        if (action === "add") {
          openModal(
            "Neue Stammadresse",
            `
              <form class="call-modal-grid" data-call-address-form>
                <label><span>Bezeichnung</span><input class="driver-search-input" name="label" required></label>
                <label><span>Adressart</span><input class="driver-search-input" name="type" required></label>
                <label class="full"><span>Vollständige Adresse</span><input class="driver-search-input" name="fullAddress" required></label>
                <label><span>Ansprechpartner</span><input class="driver-search-input" name="contact"></label>
                <label><span>Telefon</span><input class="driver-search-input" name="phone"></label>
                <label><span>Eingang</span><input class="driver-search-input" name="entrance"></label>
                <label><span>Etage</span><input class="driver-search-input" name="floor"></label>
                <label><span>Klingel</span><input class="driver-search-input" name="bell"></label>
                <label class="full"><span>Abholhinweis</span><input class="driver-search-input" name="pickupHint"></label>
                <label><span>Bevorzugte Fahrzeugart</span><input class="driver-search-input" name="preferredVehicle"></label>
              </form>
            `,
            '<button class="admin-btn admin-btn-secondary" type="button" data-call-modal-close>Abbrechen</button><button class="admin-btn" type="button" data-call-modal-action="saveAddress">Adresse speichern</button>'
          );
          return;
        }

        if (action === "edit") {
          const address = customer.addresses[0];
          if (!address) {
            setFeedback("Keine Adresse zum Bearbeiten vorhanden.", "error");
            return;
          }
          address.pickupHint = `${address.pickupHint || ""} · aktualisiert`;
          saveShared();
          renderAddresses();
          setFeedback("Adresse (Demo) aktualisiert.", "ok");
          return;
        }

        if (action === "default") {
          customer.addresses.forEach((item, idx) => {
            item.isDefault = idx === 0;
          });
          saveShared();
          renderAddresses();
          setFeedback("Standardadresse gesetzt (Demo).", "ok");
        }
        return;
      }

      const modalClose = event.target.closest("[data-call-modal-close]");
      if (modalClose) {
        closeModal();
        return;
      }

      const modalAction = event.target.closest("[data-call-modal-action]");
      if (modalAction) {
        const action = modalAction.getAttribute("data-call-modal-action");
        if (action === "saveCustomer") {
          saveNewCustomerFromModal();
          return;
        }

        if (action === "saveAddress") {
          const customer = getSelectedCustomer();
          const form = document.querySelector("[data-call-address-form]");
          if (!customer || !form) return;
          const payload = Object.fromEntries(new FormData(form).entries());
          if (!payload.label || !payload.type || !payload.fullAddress) {
            setFeedback("Bitte Adresse vollständig ausfüllen.", "error");
            return;
          }
          customer.addresses.push({
            id: `${customer.id}-A${customer.addresses.length + 1}`,
            label: payload.label,
            type: payload.type,
            fullAddress: payload.fullAddress,
            contact: payload.contact || "",
            phone: payload.phone || "",
            entrance: payload.entrance || "",
            floor: payload.floor || "",
            bell: payload.bell || "",
            pickupHint: payload.pickupHint || "",
            preferredVehicle: payload.preferredVehicle || "",
            isDefault: false
          });
          saveShared();
          closeModal();
          renderAddresses();
          setFeedback("Neue Adresse angelegt.", "ok");
          return;
        }
      }

      const duplicateAction = event.target.closest("[data-call-duplicate-action]");
      if (duplicateAction) {
        const action = duplicateAction.getAttribute("data-call-duplicate-action");
        const customerId = duplicateAction.getAttribute("data-call-customer-id") || "";

        if (action === "open") {
          state.selectedCustomerId = customerId;
          closeModal();
          renderAll();
          setFeedback("Bestehenden Kunden geöffnet.", "ok");
          return;
        }

        if (action === "merge") {
          closeModal();
          setFeedback("Zusammenführung als Demo markiert. Keine echten Datenänderungen.", "ok");
          return;
        }

        if (action === "forceSave") {
          const payload = state.pendingCustomerPayload;
          if (!payload) return;
          createCustomerFromPayload(payload);
          state.pendingCustomerPayload = null;
        }
        return;
      }

      const historyAction = event.target.closest("[data-call-history-action]");
      if (historyAction) {
        const action = historyAction.getAttribute("data-call-history-action");
        const rideId = historyAction.getAttribute("data-call-ride-id");
        const customer = getSelectedCustomer();
        if (!rideId || !customer) return;
        const ride = customer.rides.find((item) => item.id === rideId);
        if (!ride) return;
        const form = document.querySelector("[data-call-ride-form]");
        if (!form) return;

        form.customer.value = getCustomerLabel(customer);
        form.phone.value = customer.phone;
        form.pickup.value = ride.pickup;
        form.destination.value = ride.destination;
        form.rideType.value = ride.rideType;
        form.date.value = defaultDate();
        form.time.value = defaultTime(30);

        if (action === "return") {
          const tmp = form.pickup.value;
          form.pickup.value = form.destination.value;
          form.destination.value = tmp;
          form.rideType.value = "Rückfahrt";
        }

        if (action === "series") {
          state.series.unshift({ id: `SR-${Date.now()}`, customerId: customer.id, type: ride.rideType, nextDate: defaultDate(), days: "Mo-Fr", status: "aktiv" });
          saveShared();
          renderRightColumn();
          setFeedback("Fahrt als Serienfahrt angelegt (Demo).", "ok");
          return;
        }

        setFeedback("Fahrtfelder aus Historie übernommen.", "ok");
        return;
      }

      const taskAction = event.target.closest("[data-call-task-action]");
      if (taskAction) {
        const action = taskAction.getAttribute("data-call-task-action");
        const taskId = taskAction.getAttribute("data-call-task-id") || "";
        const task = state.tasks.find((item) => item.id === taskId);
        if (!task) return;
        if (action === "done") task.status = "erledigt";
        if (action === "progress") task.status = "in Bearbeitung";
        saveShared();
        renderRightColumn();
        setFeedback("Aufgabe aktualisiert.", "ok");
        return;
      }

      const cbAction = event.target.closest("[data-call-callback-action]");
      if (cbAction) {
        const action = cbAction.getAttribute("data-call-callback-action");
        const id = cbAction.getAttribute("data-call-callback-id") || "";
        const entry = state.callbacks.find((item) => item.id === id);
        if (!entry) return;
        if (action === "start") {
          const customer = state.customers.find((c) => c.id === entry.customerId);
          if (customer) {
            state.currentCall.number = customer.phone;
            state.currentCall.status = "Verbunden";
            state.currentCall.connectedAt = Date.now();
            updateCallPanel();
            setFeedback("Rückruf gestartet (Demo).", "ok");
          }
        }
        if (action === "openCustomer") {
          state.selectedCustomerId = entry.customerId;
          renderAll();
          setFeedback("Kunde aus Rückruf geöffnet.", "ok");
        }
        if (action === "done") {
          entry.status = "erledigt";
          saveShared();
          renderRightColumn();
          setFeedback("Rückruf als erledigt markiert.", "ok");
        }
      }

      const recoAction = event.target.closest("[data-call-reco-action]");
      if (recoAction) {
        const action = recoAction.getAttribute("data-call-reco-action");
        if (action === "assignNow") {
          const rideId = recoAction.getAttribute("data-call-ride-id");
          const plate = recoAction.getAttribute("data-call-plate");
          const driver = recoAction.getAttribute("data-call-driver");

          const inbox = loadWithFallback(STORAGE_KEYS.rideInbox, []);
          const ride = inbox.find((item) => item.id === rideId);
          if (ride) {
            ride.status = "Zugewiesen";
            ride.vehicle = plate;
            ride.driver = driver;
            localStorage.setItem(STORAGE_KEYS.rideInbox, JSON.stringify(inbox));
            setFeedback(`Fahrt ${rideId} direkt ${plate} zugewiesen.`, "ok");
          }
          return;
        }

        if (action === "later") {
          setFeedback("Fahrt bleibt zur späteren Zuweisung offen.", "ok");
          return;
        }

        if (action === "openDispo") {
          openInDispo();
        }
      }

      const openAction = event.target.closest("[data-call-open-action]");
      if (openAction) {
        const action = openAction.getAttribute("data-call-open-action");
        const rideId = openAction.getAttribute("data-call-ride-id") || "";
        if (action === "openDispo") {
          openInDispo();
          return;
        }
        if (action === "task") {
          const customer = getSelectedCustomer();
          if (!customer) return;
          state.tasks.unshift({
            id: `T-${Date.now()}`,
            title: "Fahrer informieren",
            customerId: customer.id,
            owner: "Enes",
            due: defaultDate(),
            priority: "Mittel",
            status: "offen",
            note: `Auftrag ${rideId} kurz vor Abholung`
          });
          saveShared();
          renderRightColumn();
          setFeedback("Aufgabe aus offener Fahrt erstellt.", "ok");
        }
      }
    });

    const search = document.querySelector("[data-call-search]");
    if (search) {
      search.addEventListener("input", (event) => {
        state.searchTerm = String(event.target.value || "");
        runSearch();
      });
    }

    const form = document.querySelector("[data-call-ride-form]");
    if (form) {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const payload = createRideFromForm();
        if (!payload) return;

        const customer = getSelectedCustomer();
        addRideToInbox(payload);
        updateCustomerAfterRide(customer, payload);
        appendOpenRide(payload);

        const recommendation = buildRecommendation({ ...payload, persons: Number(payload.persons || 1) });
        renderRecommendationBlock(payload, payload, recommendation);

        state.tasks.unshift({
          id: `T-${Date.now()}`,
          title: "Fahrt in Live-Dispo prüfen",
          customerId: customer ? customer.id : "",
          owner: "Enes",
          due: payload.date,
          priority: payload.priority,
          status: "offen",
          note: `${payload.id} · ${payload.pickup} → ${payload.destination}`
        });

        saveShared();
        renderRightColumn();
        setFeedback(`Fahrt ${payload.id} gespeichert und an Live-Dispo übergeben.`, "ok");
      });
    }

    const mobileTabs = document.querySelectorAll("[data-call-mobile-tab]");
    mobileTabs.forEach((button) => {
      button.addEventListener("click", () => {
        setMobileTab(button.getAttribute("data-call-mobile-tab") || "anruf");
      });
    });

    const resetForm = document.querySelector("[data-call-reset-form]");
    if (resetForm) {
      resetForm.addEventListener("click", () => {
        const form = document.querySelector("[data-call-ride-form]");
        if (!form) return;
        form.reset();
        fillRideTypeSelect();
        setupDefaultForm();
        const customer = getSelectedCustomer();
        if (customer) fillFormFromCustomer(customer);
        setFeedback("Formular zurückgesetzt.", "ok");
      });
    }

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      const modal = document.querySelector("[data-call-modal]");
      if (!modal || modal.hidden) return;
      closeModal();
    });
  }

  function initCallTimer() {
    if (state.durationTimer) clearInterval(state.durationTimer);
    state.durationTimer = setInterval(formatDuration, 1000);
    formatDuration();
  }

  function init() {
    fillRideTypeSelect();
    setupDefaultForm();
    updateCallPanel();
    renderAll();
    bindEvents();
    initCallTimer();

    const selected = getSelectedCustomer();
    if (selected) {
      fillFormFromCustomer(selected);
    }

    if (window.innerWidth <= 820) {
      setMobileTab("anruf");
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
