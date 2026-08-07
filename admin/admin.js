(() => {
  const P = window.AdminPersonnelDemo || null;
  const COCKPIT_KEY = "adminTerminCockpitV22Phase1";
  const LIVE_DISPO_KEY = "adminLiveDispoV131";
  const CUSTOMER_KEY = "adminSharedCustomersV14";
  const SERIES_KEY = "adminSharedSeriesV14";
  const fallbackRides = [
    {
      id: "R-100",
      time: "07:20",
      customer: "Mara Hoffmann",
      phone: "0171 770 1001",
      pickup: "Germersheim Zentrum 4",
      destination: "Frankfurt Flughafen Terminal 1",
      rideType: "Flughafen",
      status: "Bestätigt",
      driver: "Michael Becker",
      vehicle: "Mercedes E-Klasse - GER TG 201",
      priceDemo: 126.0,
      paymentDemo: "Karte",
      noteDemo: "2 große Koffer, Abholung 5 Minuten vor Zeit"
    },
    {
      id: "R-101",
      time: "07:45",
      customer: "Kliniknetz Pfalz",
      phone: "0171 770 1008",
      pickup: "Onkologie Ludwigshafen",
      destination: "Germersheim Reha Zentrum",
      rideType: "Krankenfahrt",
      status: "Fahrer zugewiesen",
      driver: "Sabine Hoffmann",
      vehicle: "VW Caddy Rollstuhl - GER TG 330",
      priceDemo: 84.5,
      paymentDemo: "Krankenkasse",
      noteDemo: "Rollstuhlrampe erforderlich"
    },
    {
      id: "R-102",
      time: "08:05",
      customer: "Tim Berger",
      phone: "0171 770 1020",
      pickup: "Bellheim Schulzentrum",
      destination: "Rülzheim Süd",
      rideType: "Schülerfahrt",
      status: "Offen",
      driver: "-",
      vehicle: "-",
      priceDemo: 22.0,
      paymentDemo: "Bar",
      noteDemo: "Bitte direkt am Haupteingang abholen"
    },
    {
      id: "R-103",
      time: "08:30",
      customer: "Selin Kara",
      phone: "0171 770 1002",
      pickup: "Speyer Bahnhof",
      destination: "Germersheim Nord 12",
      rideType: "Taxi",
      status: "Unterwegs",
      driver: "Daniel Kaya",
      vehicle: "Toyota Prius - GER TG 118",
      priceDemo: 42.0,
      paymentDemo: "Karte",
      noteDemo: "Kunde wartet am Taxistand Ost"
    },
    {
      id: "R-104",
      time: "08:55",
      customer: "Ali Demir",
      phone: "0171 770 1003",
      pickup: "Rülzheim Mitte",
      destination: "Klinikum Landau",
      rideType: "Krankenfahrt",
      status: "Angekommen",
      driver: "Julia Schneider",
      vehicle: "Mercedes V-Klasse - GER TG 214",
      priceDemo: 58.0,
      paymentDemo: "Krankenkasse",
      noteDemo: "Patientenaufnahme wurde informiert"
    },
    {
      id: "R-105",
      time: "09:10",
      customer: "Noah Wagner",
      phone: "0171 770 1021",
      pickup: "Germersheim Bahnhof",
      destination: "Karlsruhe Hbf",
      rideType: "Kurier",
      status: "Bestätigt",
      driver: "Aylin Tunc",
      vehicle: "Skoda Superb - GER TG 127",
      priceDemo: 67.0,
      paymentDemo: "Firmenkonto",
      noteDemo: "Dokumentenmappe bis 10:00 zustellen"
    },
    {
      id: "R-106",
      time: "09:25",
      customer: "Event Team Süd",
      phone: "0171 770 1022",
      pickup: "Messe Karlsruhe",
      destination: "Germersheim Rheinhotel",
      rideType: "Großraum",
      status: "Abgeschlossen",
      driver: "Mehmet Yildiz",
      vehicle: "Ford Tourneo - GER TG 340",
      priceDemo: 79.0,
      paymentDemo: "Rechnung",
      noteDemo: "6 Personen mit Gepäck"
    },
    {
      id: "R-107",
      time: "09:50",
      customer: "Lisa König",
      phone: "0171 770 1023",
      pickup: "Jockgrim Rathaus",
      destination: "Germersheim Schule",
      rideType: "Rollstuhlfahrt",
      status: "Fahrer zugewiesen",
      driver: "Fatma Aydin",
      vehicle: "VW Caddy Rollstuhl - GER TG 331",
      priceDemo: 31.5,
      paymentDemo: "Karte",
      noteDemo: "Begleitperson fährt mit"
    },
    {
      id: "R-108",
      time: "10:15",
      customer: "Nora Winter",
      phone: "0171 770 1006",
      pickup: "Leimersheim Hauptstraße",
      destination: "Karlsruhe Hbf",
      rideType: "Taxi",
      status: "Storniert",
      driver: "-",
      vehicle: "-",
      priceDemo: 0,
      paymentDemo: "-",
      noteDemo: "Kunde hat wegen Terminverschiebung storniert"
    },
    {
      id: "R-109",
      time: "10:40",
      customer: "Flugdienst Rhein",
      phone: "0171 770 1024",
      pickup: "Germersheim Süd 7",
      destination: "Baden-Airpark",
      rideType: "Flughafen",
      status: "Offen",
      driver: "-",
      vehicle: "-",
      priceDemo: 109.0,
      paymentDemo: "Firmenkonto",
      noteDemo: "Morgens wiederkehrende Tour, Priorität hoch"
    }
  ];

  let rides = [];

  const statusClassMap = {
    Offen: "ride-status-open",
    Bestätigt: "ride-status-confirmed",
    "Fahrer zugewiesen": "ride-status-assigned",
    Unterwegs: "ride-status-onroute",
    Angekommen: "ride-status-arrived",
    Abgeschlossen: "ride-status-completed",
    Storniert: "ride-status-cancelled"
  };

  const typeClassMap = {
    Taxi: "ride-type-taxi",
    Krankenfahrt: "ride-type-medical",
    Rollstuhlfahrt: "ride-type-wheelchair",
    Flughafen: "ride-type-airport",
    Großraum: "ride-type-van",
    Schülerfahrt: "ride-type-school",
    Kurier: "ride-type-courier"
  };

  const state = {
    activeFilter: "Heute",
    searchTerm: ""
  };

  function safeParse(raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function todayIso() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }

  function tomorrowIso() {
    const now = new Date();
    now.setDate(now.getDate() + 1);
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }

  function weekEndIso() {
    const now = new Date();
    const day = now.getDay() || 7;
    now.setDate(now.getDate() + (7 - day));
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }

  function nowMinutes() {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }

  function toMinutes(time) {
    const [h, m] = String(time || "00:00").split(":").map((v) => Number(v));
    return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
  }

  function normalizeStatus(raw) {
    const n = normalize(raw);
    if (n.includes("storniert")) return "Storniert";
    if (n.includes("abgeschlossen")) return "Abgeschlossen";
    if (n.includes("unterwegs")) return "Unterwegs";
    if (n.includes("zugewiesen")) return "Fahrer zugewiesen";
    if (n.includes("bestatigt")) return "Bestätigt";
    if (n.includes("konflikt")) return "Konflikt";
    return "Offen";
  }

  function normalizeRideType(raw) {
    const text = String(raw || "Taxi").trim();
    const n = normalize(text);
    if (n.includes("kranken")) return "Krankenfahrt";
    if (n.includes("rollstuhl")) return "Rollstuhlfahrt";
    if (n.includes("schuler")) return "Schülerfahrt";
    if (n.includes("grossraum") || n.includes("großraum")) return "Großraum";
    if (n.includes("kurier")) return "Kurier";
    if (n.includes("flughafen")) return "Flughafen";
    return text || "Taxi";
  }

  function formatDate(value) {
    const text = String(value || "").trim();
    if (!text) return "-";
    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return text;
    return `${match[3]}.${match[2]}.${match[1]}`;
  }

  function loadCustomers() {
    const customers = safeParse(localStorage.getItem(CUSTOMER_KEY));
    return Array.isArray(customers) ? customers : [];
  }

  function inferCustomerType(ride, customers) {
    const row = customers.find((customer) => normalize(customer.id) === normalize(ride.customerId || "") || normalize(customer.displayName || "") === normalize(ride.customer || ""));
    const typeText = normalize((row && row.type) || ride.customerType || "");
    if (typeText.includes("geschaft") || typeText.includes("geschaeft") || typeText.includes("firma") || typeText.includes("bahn") || typeText.includes("pflege") || typeText.includes("einrichtung")) return "Geschäftskunde";
    if (typeText.includes("krank") || typeText.includes("patient")) return "Krankenfahrt";
    return "Privatkunde";
  }

  function loadRides() {
    const payload = safeParse(localStorage.getItem(COCKPIT_KEY)) || {};
    const rows = Array.isArray(payload.appointments) ? payload.appointments : [];
    const customers = loadCustomers();
    const seriesRows = safeParse(localStorage.getItem(SERIES_KEY));
    const series = Array.isArray(seriesRows) ? seriesRows : [];
    const mapped = rows
      .map((row) => ({
        id: row.id || `R-${Math.floor(Math.random() * 10000)}`,
        time: row.time || "",
        customer: row.customer || row.name || "Unbekannt",
        phone: row.phone || "-",
        pickup: row.pickup || "-",
        destination: row.destination || "-",
        rideType: normalizeRideType(row.rideType || row.type || "Taxi"),
        status: normalizeStatus(row.status || row.planStatus || "Offen"),
        driver: row.driverName || row.driver || "-",
        vehicle: row.vehicleLabel || row.vehicle || "-",
        priceDemo: Number(row.price || row.amount || 0),
        paymentDemo: row.payment || row.billing || "-",
        noteDemo: row.note || row.special || "-",
        date: row.date || todayIso(),
        customerId: row.customerId || "",
        customerType: inferCustomerType({ ...row, customer: row.customer || row.name || "" }, customers),
        isSeries: Boolean(row.seriesId) || series.some((entry) => normalize(entry.customerLabel || "") === normalize(row.customer || row.name || "") && normalize(entry.pickup || "") === normalize(row.pickup || "") && normalize(entry.destination || "") === normalize(row.destination || ""))
      }));
    if (mapped.length) {
      rides = mapped.sort((a, b) => `${String(a.date || "")} ${String(a.time || "99:99")}`.localeCompare(`${String(b.date || "")} ${String(b.time || "99:99")}`, "de"));
      return;
    }
    const today = todayIso();
    const tomorrow = tomorrowIso();
    rides = fallbackRides.map((ride, index) => ({
      ...ride,
      date: index % 4 === 0 ? tomorrow : today,
      customerType: normalize(ride.paymentDemo).includes("firmen") ? "Geschäftskunde" : "Privatkunde",
      isSeries: normalize(ride.noteDemo).includes("wiederkehr")
    }));
  }

  function formatEuro(value) {
    return `${Number(value || 0).toFixed(2).replace('.', ',')} EUR`;
  }

  function getPrimaryAction(ride) {
    if (ride.status === "Offen") return { key: "assign", label: "Fahrer zuweisen" };
    if (ride.status === "Bestätigt" || ride.status === "Fahrer zugewiesen") return { key: "status", label: "Als unterwegs markieren" };
    if (ride.status === "Unterwegs") return { key: "status", label: "Status aktualisieren" };
    return { key: "details", label: "Details" };
  }

  function normalize(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function matchesFilter(ride) {
    const today = todayIso();
    const tomorrow = tomorrowIso();
    const weekEnd = weekEndIso();
    const filter = state.activeFilter;
    if (filter === "Heute") return ride.date === today;
    if (filter === "Morgen") return ride.date === tomorrow;
    if (filter === "Diese Woche") return ride.date >= today && ride.date <= weekEnd;
    if (filter === "Offen") return ["Offen", "Konflikt"].includes(ride.status);
    if (filter === "Krankenfahrt") return ride.rideType === "Krankenfahrt";
    if (filter === "Serienfahrt") return ride.isSeries;
    if (filter === "Geschäftskunde") return ride.customerType === "Geschäftskunde";
    return true;
  }

  function matchesSearch(ride) {
    if (!state.searchTerm) return true;

    const search = normalize(state.searchTerm);
    return [
      ride.id,
      ride.customer,
      ride.phone,
      ride.driver,
      ride.vehicle,
      ride.pickup,
      ride.destination,
      ride.rideType
    ].some((entry) => normalize(entry).includes(search));
  }

  function getVisibleRides() {
    return rides.filter((ride) => matchesFilter(ride) && matchesSearch(ride));
  }

  function renderStats() {
    const today = todayIso();
    const tomorrow = tomorrowIso();
    const stats = {
      today: rides.filter((ride) => ride.date === today).length,
      open: rides.filter((ride) => ride.status === "Offen").length,
      confirmed: rides.filter((ride) => ["Bestätigt", "Fahrer zugewiesen"].includes(ride.status)).length,
      onRoute: rides.filter((ride) => ride.date === tomorrow).length,
      completed: rides.filter((ride) => ride.status === "Abgeschlossen").length,
      cancelled: rides.filter((ride) => ride.status === "Storniert").length
    };

    Object.entries(stats).forEach(([key, value]) => {
      const node = document.querySelector(`[data-ride-stat="${key}"]`);
      if (node) {
        node.textContent = String(value);
      }
    });
  }

  function renderOperationalStats() {
    const personnel = P && typeof P.loadState === "function" ? P.loadState() : { employees: [], vacations: [], absences: [] };
    const dispo = safeParse(localStorage.getItem(LIVE_DISPO_KEY)) || { vehicles: [] };
    const vehicles = Array.isArray(dispo.vehicles) ? dispo.vehicles : [];
    const now = nowMinutes();

    const drivers = (personnel.employees || []).filter((emp) => emp.role === "Fahrer");
    const onDuty = drivers.filter((emp) => {
      const n = normalize(emp.status);
      return !n.includes("krank") && !n.includes("urlaub") && !n.includes("abwes") && !n.includes("gesperrt");
    });

    const availableDrivers = onDuty.filter((emp) => {
      const shift = String(emp.todayShift || "").match(/^(\d{2}:\d{2})-(\d{2}:\d{2})$/);
      if (!shift) return false;
      const start = toMinutes(shift[1]);
      const endRaw = toMinutes(shift[2]);
      const end = endRaw <= start ? endRaw + 1440 : endRaw;
      const current = now < start ? now + 1440 : now;
      const inShift = current >= start && current <= end;
      if (!inShift) return false;
      const hasRide = rides.some((ride) => {
        if (normalize(ride.driver) !== normalize(`${emp.firstName || ""} ${emp.lastName || ""}`.trim())) return false;
        const rideStart = toMinutes(ride.time);
        const rideEnd = rideStart + 45;
        return current >= rideStart && current <= rideEnd && ["Unterwegs", "Bestätigt", "Fahrer zugewiesen"].includes(ride.status);
      });
      return !hasRide;
    });

    const availableVehicles = vehicles.filter((vehicle) => {
      const text = normalize(`${vehicle.status || ""} ${vehicle.workshopStatus || ""}`);
      return !text.includes("werkstatt") && !text.includes("gesperrt") && !text.includes("unterwegs");
    }).length;

    const conflictCount = rides.filter((ride) => ride.status === "Konflikt" || (ride.status === "Offen" && toMinutes(ride.time) <= now)).length;

    const values = {
      today: rides.length,
      open: rides.filter((ride) => ["Offen", "Konflikt"].includes(ride.status)).length,
      onDuty: onDuty.length,
      availableDrivers: availableDrivers.length,
      availableVehicles,
      conflicts: conflictCount
    };
    Object.entries(values).forEach(([key, value]) => {
      const node = document.querySelector(`[data-ride-operational="${key}"]`);
      if (node) node.textContent = String(value);
    });
  }

  function renderNextRides() {
    const node = document.querySelector("[data-ride-next-list]");
    if (!node) return;
    const now = nowMinutes();
    const upcoming = rides
      .filter((ride) => toMinutes(ride.time) >= now && ["Offen", "Bestätigt", "Fahrer zugewiesen", "Unterwegs"].includes(ride.status))
      .sort((a, b) => toMinutes(a.time) - toMinutes(b.time))
      .slice(0, 4);
    if (!upcoming.length) {
      node.innerHTML = '<p class="m-note">Als Nächstes: aktuell keine offenen Termine.</p>';
      return;
    }
    node.innerHTML = `
      <h3>Als Nächstes</h3>
      ${upcoming.map((ride) => `<article class="ride-next-item"><strong>${formatDate(ride.date)} · ${ride.time} Uhr · ${ride.customer}</strong><p>${ride.pickup} → ${ride.destination}</p><small>${ride.rideType} · ${ride.driver}</small></article>`).join("")}
    `;
  }

  function renderManagementStats() {
    const personnel = P && typeof P.loadState === "function" ? P.loadState() : { vacations: [], documents: [] };
    const docs = Array.isArray(personnel.documents) ? personnel.documents : [];
    const vacations = Array.isArray(personnel.vacations) ? personnel.vacations : [];
    const tasks = safeParse(localStorage.getItem("adminSystemCenterV21")) || { tasksManual: [], tasksOverrides: {}, notificationsManual: [] };
    const now = nowMinutes();
    const tomorrow = tomorrowIso();

    const vehicleDeadlines = rides.filter((ride) => ride.status === "Konflikt").length + (safeParse(localStorage.getItem(LIVE_DISPO_KEY))?.vehicles || []).filter((vehicle) => {
      const status = normalize(`${vehicle.status || ""} ${vehicle.workshopStatus || ""}`);
      return status.includes("werkstatt") || status.includes("gesperrt");
    }).length;

    const staffDeadlines = docs.filter((doc) => {
      const date = String(doc.validUntil || "");
      if (!date) return false;
      const diff = Math.floor((new Date(`${date}T00:00:00`).getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000);
      return diff <= 30;
    }).length;

    const vacOpen = vacations.filter((row) => ["beantragt", "in Pruefung"].includes(String(row.status || ""))).length;
    const tasksOpen = (Array.isArray(tasks.tasksManual) ? tasks.tasksManual : []).filter((row) => !["erledigt", "storniert"].includes(normalize(row.status))).length;
    const approvalsOpen = (Array.isArray(tasks.notificationsManual) ? tasks.notificationsManual : []).filter((row) => !["gelesen", "erledigt", "archiviert"].includes(normalize(row.status))).length;
    const tomorrowRides = rides.filter((ride) => ride.date === tomorrow).length;
    const tomorrowDriversOpen = rides.filter((ride) => ride.date === tomorrow && (!ride.driver || ride.driver === "-" || ride.status === "Offen" || ride.status === "Konflikt")).length;
    const tomorrowConflicts = rides.filter((ride) => ride.date === tomorrow && ride.status === "Konflikt").length;

    const values = {
      staffDeadlines,
      vehicleDeadlines,
      vacOpen,
      tasksOpen,
      approvalsOpen,
      tomorrowRides,
      tomorrowDriversOpen,
      tomorrowConflicts
    };
    Object.entries(values).forEach(([key, value]) => {
      const node = document.querySelector(`[data-ride-mgmt="${key}"]`);
      if (node) node.textContent = String(value);
    });
  }

  function buildRideCard(ride) {
    const primary = getPrimaryAction(ride);
    return `
      <article class="ride-card">
        <header class="ride-card-head">
          <div>
            <h2>${formatDate(ride.date)} · ${ride.time} · ${ride.customer}</h2>
            <span class="ride-type-badge ${typeClassMap[ride.rideType] || "ride-type-taxi"}">${ride.rideType}</span>
          </div>
          <span class="status-pill ${statusClassMap[ride.status] || "ride-status-open"}">${ride.status}</span>
        </header>

        <div class="ride-route">
          <div class="ride-route-item ride-route-start">
            <small>Start</small>
            <strong>${ride.pickup}</strong>
          </div>
          <div class="ride-route-arrow" aria-hidden="true">→</div>
          <div class="ride-route-item ride-route-target">
            <small>Ziel</small>
            <strong>${ride.destination}</strong>
          </div>
        </div>

        <dl class="ride-meta-list">
          <div>
            <dt>Fahrer</dt>
            <dd>${ride.driver}</dd>
          </div>
          <div>
            <dt>Fahrzeug</dt>
            <dd>${ride.vehicle}</dd>
          </div>
          <div>
            <dt>Preis</dt>
            <dd>${formatEuro(ride.priceDemo)}</dd>
          </div>
          <div>
            <dt>Zahlung</dt>
            <dd>${ride.paymentDemo}</dd>
          </div>
        </dl>

        <p class="ride-note">${ride.noteDemo}</p>

        <div class="ride-card-actions">
          <button class="admin-btn" type="button" data-ride-action="${primary.key}" data-ride-id="${ride.id}">${primary.label}</button>
          <button class="admin-btn ride-btn-muted" type="button" data-ride-action="details" data-ride-id="${ride.id}">Details</button>
          <details class="ride-more-actions">
            <summary class="admin-btn ride-btn-muted" aria-label="Weitere Aktionen">Mehr</summary>
            <div class="ride-more-menu">
              <button class="admin-btn ride-btn-muted" type="button" data-ride-action="assign" data-ride-id="${ride.id}">Fahrer zuweisen</button>
              <button class="admin-btn ride-btn-muted" type="button" data-ride-action="status" data-ride-id="${ride.id}">Status ändern</button>
              <button class="admin-btn ride-btn-muted" type="button" data-ride-action="call" data-ride-id="${ride.id}">Kunde anrufen</button>
              <button class="admin-btn ride-btn-muted" type="button" data-ride-action="whatsapp" data-ride-id="${ride.id}">WhatsApp</button>
            </div>
          </details>
        </div>
      </article>
    `;
  }

  function renderRides() {
    const rideGrid = document.querySelector("[data-ride-grid]");
    if (!rideGrid) return;

    const visibleRides = getVisibleRides();
    if (!visibleRides.length) {
      rideGrid.innerHTML = `
        <article class="admin-empty-state ride-empty">
          <strong>🚕 Keine Einträge gefunden</strong>
          <p>Keine Einträge gefunden.</p>
          <button class="admin-btn admin-btn-secondary admin-empty-reset" type="button" data-ride-reset>Filter zurücksetzen</button>
        </article>
      `;
      return;
    }

    rideGrid.innerHTML = visibleRides.map((ride) => buildRideCard(ride)).join("");
  }

  function openModal(title, content) {
    const modal = document.querySelector("[data-ride-modal]");
    const titleNode = document.querySelector("[data-ride-modal-title]");
    const bodyNode = document.querySelector("[data-ride-modal-body]");
    if (!modal || !titleNode || !bodyNode) return;

    titleNode.textContent = title;
    bodyNode.innerHTML = content;
    modal.hidden = false;
    document.body.classList.add("admin-modal-open");
  }

  function closeModal() {
    const modal = document.querySelector("[data-ride-modal]");
    if (!modal) return;

    modal.hidden = true;
    document.body.classList.remove("admin-modal-open");
  }

  function buildDetailsModal(ride) {
    return `
      <div class="ride-modal-block">
        <strong>FAHRT</strong>
        <dl class="ride-modal-list">
          <div><dt>Datum</dt><dd>${formatDate(ride.date)}</dd></div>
          <div><dt>Uhrzeit</dt><dd>${ride.time}</dd></div>
          <div><dt>Abholung</dt><dd>${ride.pickup}</dd></div>
          <div><dt>Ziel</dt><dd>${ride.destination}</dd></div>
          <div><dt>Personen</dt><dd>${ride.persons || 1}</dd></div>
          <div><dt>Fahrtart</dt><dd>${ride.rideType}</dd></div>
        </dl>
      </div>
      <div class="ride-modal-block">
        <strong>KUNDE</strong>
        <dl class="ride-modal-list">
          <div><dt>Name</dt><dd>${ride.customer}</dd></div>
          <div><dt>Telefonnummer</dt><dd>${ride.phone}</dd></div>
          <div><dt>Relevanter Hinweis</dt><dd>${ride.noteDemo || "-"}</dd></div>
        </dl>
      </div>
      <div class="ride-modal-block">
        <strong>DISPOSITION</strong>
        <dl class="ride-modal-list">
          <div><dt>Fahrer</dt><dd>${ride.driver}</dd></div>
          <div><dt>Fahrzeug</dt><dd>${ride.vehicle}</dd></div>
          <div><dt>Status</dt><dd>${ride.status}</dd></div>
          <div><dt>Konfliktstatus</dt><dd>${ride.status === "Konflikt" ? "Konflikt" : "kein Konflikt"}</dd></div>
        </dl>
      </div>
      <div class="ride-modal-block">
        <strong>ABRECHNUNG</strong>
        <dl class="ride-modal-list">
          <div><dt>Art</dt><dd>${ride.paymentDemo}</dd></div>
          <div><dt>Betrag</dt><dd>${formatEuro(ride.priceDemo)}</dd></div>
          <div><dt>Status</dt><dd>${ride.status === "Abgeschlossen" ? "abgeschlossen" : "noch offen"}</dd></div>
        </dl>
      </div>
      <div class="ride-modal-block">
        <strong>NOTIZEN</strong>
        <p class="ride-modal-note">${ride.noteDemo || "Keine interne Dispositionsnotiz"}</p>
      </div>
    `;
  }

  function buildActionModal(ride, action) {
    const templates = {
      assign: `Demo: Fahrerzuweisung für ${ride.customer} ist vorbereitet. Keine Speicherung ohne Backend.`,
      status: `Demo: Statusänderung für ${ride.id} ist vorbereitet. Keine Speicherung ohne Backend.`,
      call: `Demo: Anruf an ${ride.customer} (${ride.phone}) wird vorbereitet.`,
      whatsapp: `Demo: WhatsApp-Nachricht an ${ride.customer} wird vorbereitet.`
    };

    return `<p>${templates[action] || "Demo-Aktion ohne Speicherung."}</p>`;
  }

  function bindSearch() {
    const searchInput = document.querySelector("[data-ride-search]");
    if (!searchInput) return;

    searchInput.addEventListener("input", (event) => {
      state.searchTerm = event.target.value || "";
      renderRides();
    });
  }

  function bindFilters() {
    const filterButtons = document.querySelectorAll("[data-ride-filter]");
    filterButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const nextFilter = button.getAttribute("data-ride-filter") || "Alle";
        state.activeFilter = nextFilter;

        filterButtons.forEach((item) => {
          item.classList.toggle("is-active", item === button);
        });

        renderRides();
      });
    });
  }

  function bindActions() {
    document.addEventListener("click", (event) => {
      const resetButton = event.target.closest("[data-ride-reset]");
      if (resetButton) {
        state.activeFilter = "Heute";
        state.searchTerm = "";
        const searchInput = document.querySelector("[data-ride-search]");
        if (searchInput) searchInput.value = "";
        document.querySelectorAll("[data-ride-filter]").forEach((item) => {
          item.classList.toggle("is-active", (item.getAttribute("data-ride-filter") || "") === "Heute");
        });
        renderRides();
        return;
      }

      const button = event.target.closest("[data-ride-action]");
      if (!button) return;

      const action = button.getAttribute("data-ride-action");
      const rideId = button.getAttribute("data-ride-id");
      const ride = rides.find((item) => item.id === rideId);
      if (!action || !ride) return;

      if (action === "details") {
        openModal(`Fahrtdetails: ${ride.id}`, buildDetailsModal(ride));
        return;
      }

      openModal(`Aktion: ${ride.id}`, buildActionModal(ride, action));
    });
  }

  function bindModalClose() {
    const closeButtons = document.querySelectorAll("[data-ride-modal-close]");
    closeButtons.forEach((button) => {
      button.addEventListener("click", closeModal);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      const modal = document.querySelector("[data-ride-modal]");
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

  loadRides();
  renderStats();
  renderOperationalStats();
  renderManagementStats();
  renderNextRides();
  bindSearch();
  bindFilters();
  bindActions();
  bindModalClose();
  bindDisabledNavItems();
  renderRides();
})();
