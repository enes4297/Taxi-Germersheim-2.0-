(() => {
  const STORAGE_KEY = "adminLiveDispoV131";
  const SHARED_RIDE_INBOX_KEY = "adminSharedRideInboxV14";
  const MAX_EVENTS = 80;
  const MAX_NOTIFICATIONS = 48;
  const DEMO_DAY = "2026-08-03";

  const STATUS_LIST = [
    "Neu",
    "Bestätigt",
    "Zugewiesen",
    "Fahrer unterwegs",
    "Fahrer angekommen",
    "Fahrgast eingestiegen",
    "Fahrt läuft",
    "Ziel erreicht",
    "Abgeschlossen",
    "Wartet",
    "Problem",
    "Storniert"
  ];

  const TAB_STATUSES = {
    Neu: ["Neu"],
    Bestätigt: ["Bestätigt", "Zugewiesen"],
    Unterwegs: ["Fahrer unterwegs", "Fahrer angekommen", "Fahrgast eingestiegen", "Fahrt läuft", "Ziel erreicht"],
    Warten: ["Wartet"],
    Problem: ["Problem", "Storniert"]
  };

  const STATUS_CLASS_MAP = {
    Neu: "dispo-status-new",
    Bestätigt: "dispo-status-confirmed",
    Zugewiesen: "dispo-status-confirmed",
    "Fahrer unterwegs": "dispo-status-onroute",
    "Fahrer angekommen": "dispo-status-onroute",
    "Fahrgast eingestiegen": "dispo-status-onroute",
    "Fahrt läuft": "dispo-status-onroute",
    "Ziel erreicht": "dispo-status-onroute",
    Abgeschlossen: "dispo-status-complete",
    Wartet: "dispo-status-waiting",
    Problem: "dispo-status-problem",
    Storniert: "dispo-status-problem"
  };

  const EVENT_TONE_MAP = {
    System: "tone-system",
    Aufträge: "tone-order",
    Fahrer: "tone-driver",
    Fahrzeuge: "tone-vehicle",
    Probleme: "tone-problem"
  };

  const defaultData = {
    orders: [
      {
        id: "TG-1048",
        customer: "Mara Hoffmann",
        phone: "0171 770 1001",
        pickup: "Germersheim Zentrum 4",
        destination: "Frankfurt Flughafen Terminal 1",
        date: DEMO_DAY,
        time: "08:35",
        rideType: "Flughafenfahrt",
        persons: 2,
        luggage: "2 große Koffer",
        wheelchair: false,
        companion: false,
        insurance: "-",
        transportVoucher: "Nicht erforderlich",
        approval: "Nicht erforderlich",
        returnTrip: false,
        returnTime: "",
        vehicleWish: "Limousine",
        priority: "Hoch",
        status: "Bestätigt",
        driverId: "DRV-201",
        vehicleId: "VEH-201",
        notes: "Kunde steht vor Eingang C.",
        pricing: "Festpreis 126,00 EUR",
        billingType: "Karte",
        createdAt: "07:10",
        updatedAt: "08:10",
        pickupCoord: { x: 34, y: 58 },
        destinationCoord: { x: 72, y: 22 },
        forcedRisk: false
      },
      {
        id: "TG-1049",
        customer: "Klinikverbund Pfalz",
        phone: "0171 770 1008",
        pickup: "Klinikum Landau",
        destination: "Reha Germersheim",
        date: DEMO_DAY,
        time: "08:25",
        rideType: "Krankenfahrt",
        persons: 1,
        luggage: "Medizinische Tasche",
        wheelchair: true,
        companion: true,
        insurance: "AOK",
        transportVoucher: "Vorhanden",
        approval: "Genehmigt",
        returnTrip: true,
        returnTime: "13:40",
        vehicleWish: "Rollstuhl",
        priority: "Hoch",
        status: "Fahrer unterwegs",
        driverId: "DRV-202",
        vehicleId: "VEH-202",
        notes: "Patient 10 Minuten vor Termin anmelden.",
        pricing: "Abrechnung Krankenkasse",
        billingType: "Krankenkasse",
        createdAt: "06:55",
        updatedAt: "08:16",
        pickupCoord: { x: 61, y: 44 },
        destinationCoord: { x: 43, y: 63 },
        forcedRisk: false
      },
      {
        id: "TG-1050",
        customer: "Selin Kara",
        phone: "0171 770 1002",
        pickup: "Speyer Bahnhof",
        destination: "Germersheim Nord 12",
        date: DEMO_DAY,
        time: "08:40",
        rideType: "Taxi",
        persons: 3,
        luggage: "1 Handgepäck",
        wheelchair: false,
        companion: false,
        insurance: "-",
        transportVoucher: "-",
        approval: "-",
        returnTrip: false,
        returnTime: "",
        vehicleWish: "Kombi",
        priority: "Mittel",
        status: "Neu",
        driverId: "",
        vehicleId: "",
        notes: "Abholung Ostseite Taxistand.",
        pricing: "Taxameter",
        billingType: "Bar",
        createdAt: "08:12",
        updatedAt: "08:12",
        pickupCoord: { x: 48, y: 31 },
        destinationCoord: { x: 39, y: 58 },
        forcedRisk: false
      },
      {
        id: "TG-1051",
        customer: "Ali Demir",
        phone: "0171 770 1003",
        pickup: "Rülzheim Mitte",
        destination: "Klinikum Karlsruhe",
        date: DEMO_DAY,
        time: "08:28",
        rideType: "Dialyse",
        persons: 1,
        luggage: "Keine",
        wheelchair: false,
        companion: false,
        insurance: "TK",
        transportVoucher: "Digital",
        approval: "Freigegeben",
        returnTrip: true,
        returnTime: "12:10",
        vehicleWish: "Limousine",
        priority: "Hoch",
        status: "Wartet",
        driverId: "DRV-204",
        vehicleId: "VEH-204",
        notes: "Patient ist bereits im Eingangsbereich.",
        pricing: "Abrechnung Krankenkasse",
        billingType: "Krankenkasse",
        createdAt: "07:44",
        updatedAt: "08:05",
        pickupCoord: { x: 28, y: 68 },
        destinationCoord: { x: 77, y: 36 },
        forcedRisk: true
      },
      {
        id: "TG-1052",
        customer: "Lisa König",
        phone: "0171 770 1023",
        pickup: "Jockgrim Rathaus",
        destination: "Germersheim Schule",
        date: DEMO_DAY,
        time: "09:00",
        rideType: "Rollstuhlfahrt",
        persons: 2,
        luggage: "Rollstuhl + Tasche",
        wheelchair: true,
        companion: true,
        insurance: "DAK",
        transportVoucher: "Vorhanden",
        approval: "In Prüfung",
        returnTrip: false,
        returnTime: "",
        vehicleWish: "Rollstuhl",
        priority: "Mittel",
        status: "Problem",
        driverId: "",
        vehicleId: "",
        notes: "Aktuell kein passendes Fahrzeug bestätigt.",
        pricing: "Abrechnung Krankenkasse",
        billingType: "Krankenkasse",
        createdAt: "08:00",
        updatedAt: "08:18",
        pickupCoord: { x: 56, y: 72 },
        destinationCoord: { x: 42, y: 47 },
        forcedRisk: false
      },
      {
        id: "TG-1053",
        customer: "Flugdienst Rhein",
        phone: "0171 770 1024",
        pickup: "Sondernheim Süd 8",
        destination: "Baden-Airpark",
        date: DEMO_DAY,
        time: "09:20",
        rideType: "Flughafenfahrt",
        persons: 1,
        luggage: "1 Trolley",
        wheelchair: false,
        companion: false,
        insurance: "-",
        transportVoucher: "-",
        approval: "-",
        returnTrip: false,
        returnTime: "",
        vehicleWish: "Business",
        priority: "Hoch",
        status: "Neu",
        driverId: "",
        vehicleId: "",
        notes: "Wiederkehrende Firmenfahrt.",
        pricing: "Firmenkonto",
        billingType: "Rechnung",
        createdAt: "08:19",
        updatedAt: "08:19",
        pickupCoord: { x: 67, y: 52 },
        destinationCoord: { x: 82, y: 19 },
        forcedRisk: false
      }
    ],
    drivers: [
      { id: "DRV-201", name: "Michael Becker", phone: "0172 901 2201", status: "Aktiv", onDuty: true },
      { id: "DRV-202", name: "Sabine Hoffmann", phone: "0172 901 2202", status: "Unterwegs", onDuty: true },
      { id: "DRV-203", name: "Daniel Kaya", phone: "0172 901 2203", status: "Pause", onDuty: true },
      { id: "DRV-204", name: "Julia Schneider", phone: "0172 901 2204", status: "Aktiv", onDuty: true },
      { id: "DRV-205", name: "Mehmet Yildiz", phone: "0172 901 2205", status: "Aktiv", onDuty: true },
      { id: "DRV-206", name: "Fatma Aydin", phone: "0172 901 2206", status: "Unterwegs", onDuty: true }
    ],
    vehicles: [
      {
        id: "VEH-201",
        name: "Mercedes E-Klasse",
        plate: "GER-TK 203",
        type: "Limousine",
        seats: 4,
        wheelchair: false,
        driverId: "DRV-201",
        status: "Frei",
        currentOrderId: "",
        nextOrderId: "TG-1048",
        location: "Germersheim Zentrum",
        speed: 0,
        km: 182440,
        fuel: 74,
        battery: 0,
        range: "510 km",
        nextService: "In 1.300 km",
        tuv: "03/2027",
        tires: "Gut",
        lastUpdate: "08:21",
        utilization: 42,
        nextFreeTime: "08:30",
        x: 36,
        y: 52,
        markerType: "Frei"
      },
      {
        id: "VEH-202",
        name: "VW Caddy Rollstuhl",
        plate: "GER-TK 230",
        type: "Rollstuhl",
        seats: 5,
        wheelchair: true,
        driverId: "DRV-202",
        status: "Unterwegs",
        currentOrderId: "TG-1049",
        nextOrderId: "",
        location: "Lingenfeld Ortsmitte",
        speed: 38,
        km: 214990,
        fuel: 68,
        battery: 0,
        range: "420 km",
        nextService: "In 780 km",
        tuv: "11/2026",
        tires: "Mittel",
        lastUpdate: "08:22",
        utilization: 82,
        nextFreeTime: "09:10",
        x: 58,
        y: 44,
        markerType: "Unterwegs"
      },
      {
        id: "VEH-203",
        name: "Toyota Prius",
        plate: "GER-TK 118",
        type: "Hybrid",
        seats: 4,
        wheelchair: false,
        driverId: "DRV-203",
        status: "Pause",
        currentOrderId: "",
        nextOrderId: "",
        location: "Germersheim Süd",
        speed: 0,
        km: 167340,
        fuel: 46,
        battery: 62,
        range: "410 km",
        nextService: "In 1.900 km",
        tuv: "08/2027",
        tires: "Gut",
        lastUpdate: "08:20",
        utilization: 33,
        nextFreeTime: "08:50",
        x: 44,
        y: 66,
        markerType: "Pause"
      },
      {
        id: "VEH-204",
        name: "Mercedes V-Klasse",
        plate: "GER-TK 214",
        type: "Van",
        seats: 7,
        wheelchair: false,
        driverId: "DRV-204",
        status: "Am Kunden",
        currentOrderId: "TG-1051",
        nextOrderId: "",
        location: "Rülzheim Mitte",
        speed: 8,
        km: 199340,
        fuel: 38,
        battery: 0,
        range: "260 km",
        nextService: "In 220 km",
        tuv: "01/2027",
        tires: "Mittel",
        lastUpdate: "08:22",
        utilization: 89,
        nextFreeTime: "09:05",
        x: 26,
        y: 70,
        markerType: "Am Kunden"
      },
      {
        id: "VEH-205",
        name: "Ford Tourneo",
        plate: "GER-TK 340",
        type: "Großraum",
        seats: 8,
        wheelchair: true,
        driverId: "DRV-205",
        status: "Werkstatt",
        currentOrderId: "",
        nextOrderId: "TG-1053",
        location: "Werkstatt Seitz",
        speed: 0,
        km: 241110,
        fuel: 29,
        battery: 0,
        range: "190 km",
        nextService: "Heute",
        tuv: "12/2026",
        tires: "Prüfen",
        lastUpdate: "08:12",
        utilization: 57,
        nextFreeTime: "11:30",
        x: 73,
        y: 34,
        markerType: "Werkstatt"
      },
      {
        id: "VEH-206",
        name: "VW Caddy Rollstuhl",
        plate: "GER-TK 331",
        type: "Rollstuhl",
        seats: 5,
        wheelchair: true,
        driverId: "DRV-206",
        status: "Unterwegs",
        currentOrderId: "",
        nextOrderId: "",
        location: "Jockgrim",
        speed: 42,
        km: 223410,
        fuel: 63,
        battery: 0,
        range: "410 km",
        nextService: "In 1.020 km",
        tuv: "09/2027",
        tires: "Gut",
        lastUpdate: "08:23",
        utilization: 67,
        nextFreeTime: "09:22",
        x: 66,
        y: 70,
        markerType: "Unterwegs"
      }
    ],
    events: [
      { id: "EV-1", time: "07:50", category: "Aufträge", tone: "tone-order", message: "Neue Krankenfahrt TG-1049 erstellt.", refType: "order", refId: "TG-1049" },
      { id: "EV-2", time: "08:00", category: "Fahrer", tone: "tone-driver", message: "Fahrer DRV-203 hat Pause gemeldet.", refType: "driver", refId: "DRV-203" },
      { id: "EV-3", time: "08:11", category: "Fahrzeuge", tone: "tone-vehicle", message: "GER-TK 214 am Kunden eingetroffen.", refType: "vehicle", refId: "VEH-204" },
      { id: "EV-4", time: "08:18", category: "Probleme", tone: "tone-problem", message: "Rollstuhlfahrt TG-1052 noch ohne Zuweisung.", refType: "order", refId: "TG-1052" },
      { id: "EV-5", time: "08:20", category: "System", tone: "tone-system", message: "Live-Dispo Demo-Zustand synchronisiert.", refType: "system", refId: "" }
    ],
    notifications: [
      { id: "NT-1", priority: "Hoch", title: "Neuer Auftrag", text: "TG-1053 wartet auf Zuweisung.", refType: "order", refId: "TG-1053", read: false, time: "08:19" },
      { id: "NT-2", priority: "Hoch", title: "Rollstuhlfahrzeug benötigt", text: "TG-1052 benötigt geeignetes Fahrzeug.", refType: "order", refId: "TG-1052", read: false, time: "08:18" },
      { id: "NT-3", priority: "Mittel", title: "Kunde wartet", text: "TG-1051 meldet Wartezeit am Abholort.", refType: "order", refId: "TG-1051", read: false, time: "08:14" },
      { id: "NT-4", priority: "Niedrig", title: "Fahrt abgeschlossen", text: "TG-1039 wurde erfolgreich beendet.", refType: "system", refId: "", read: true, time: "08:08" }
    ],
    sequence: {
      order: 1053,
      event: 5,
      notification: 4
    }
  };

  const state = {
    data: loadData(),
    ui: {
      activeTab: "Neu",
      searchTerm: "",
      priorityFilter: "Alle",
      rideTypeFilter: "Alle",
      sortKey: "timeAsc",
      eventFilter: "Alle",
      notifyFilter: "Alle",
      selectedOrderId: "",
      selectedVehicleId: "",
      dragOrderId: "",
      mobileTab: "orders",
      tabletPanel: "",
      mapFocus: "vehicle"
    }
  };

  let simulationTimer = null;

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return deepClone(defaultData);
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.orders) || !Array.isArray(parsed.vehicles)) {
        return deepClone(defaultData);
      }
      return parsed;
    } catch {
      return deepClone(defaultData);
    }
  }

  function saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
    } catch {
      // Demo-only: silent fail, no backend fallback.
    }
  }

  function hashCoord(seed, min, span) {
    let hash = 0;
    const text = String(seed || "TG");
    for (let i = 0; i < text.length; i += 1) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
    }
    const normalized = Math.abs(hash % span);
    return min + normalized;
  }

  function nextOrderId() {
    state.data.sequence.order += 1;
    return `TG-${state.data.sequence.order}`;
  }

  function importSharedInboxOrders() {
    let inbox = [];
    try {
      const raw = localStorage.getItem(SHARED_RIDE_INBOX_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || !parsed.length) return;
      inbox = parsed;
    } catch {
      return;
    }

    const remaining = [];
    let importedCount = 0;

    inbox.forEach((entry) => {
      if (!entry || typeof entry !== "object") return;

      const sourceId = String(entry.id || "").trim();
      if (!sourceId) return;

      const alreadyImported = state.data.orders.some((order) => order.sourceExternalId === sourceId || order.id === sourceId);
      const completedOrCanceled = ["Abgeschlossen", "Storniert"].includes(String(entry.status || ""));

      if (alreadyImported || completedOrCanceled) {
        remaining.push(entry);
        return;
      }

      const preferredIdAvailable = !state.data.orders.some((order) => order.id === sourceId) && /^TG-\d+$/i.test(sourceId);
      const id = preferredIdAvailable ? sourceId : nextOrderId();

      if (preferredIdAvailable) {
        const numeric = Number(sourceId.replace(/\D/g, ""));
        if (Number.isFinite(numeric) && numeric > state.data.sequence.order) {
          state.data.sequence.order = numeric;
        }
      }

      const order = {
        id,
        sourceExternalId: sourceId,
        customer: entry.customer || "Unbekannter Kunde",
        phone: entry.phone || "",
        pickup: entry.pickup || "Germersheim",
        destination: entry.destination || "Germersheim",
        date: entry.date || DEMO_DAY,
        time: entry.time || nowTime(),
        rideType: entry.rideType || "Taxi",
        persons: Number(entry.persons || 1),
        luggage: entry.luggage || "",
        wheelchair: entry.wheelchair === true || entry.wheelchair === "Ja",
        companion: entry.companion === true || entry.companion === "Ja",
        insurance: entry.insurance || "-",
        transportVoucher: entry.transportVoucher || "-",
        approval: entry.approval || "Offen",
        returnTrip: entry.returnTrip === true || entry.returnTrip === "Ja",
        returnTime: entry.returnTime || "",
        vehicleWish: entry.vehicleType || entry.vehicleWish || "",
        priority: entry.priority || "Mittel",
        status: ["Zugewiesen", "Bestätigt", "Neu"].includes(String(entry.status || "")) ? String(entry.status) : "Neu",
        driverId: "",
        vehicleId: "",
        notes: entry.notes || "",
        pricing: "Demo-Abrechnung offen",
        billingType: entry.billing || entry.billingType || "Offen",
        createdAt: nowTime(),
        updatedAt: nowTime(),
        pickupCoord: { x: hashCoord(`${id}-p-x`, 28, 44), y: hashCoord(`${id}-p-y`, 26, 48) },
        destinationCoord: { x: hashCoord(`${id}-d-x`, 30, 46), y: hashCoord(`${id}-d-y`, 18, 50) },
        forcedRisk: false
      };

      state.data.orders.unshift(order);
      importedCount += 1;
    });

    if (importedCount > 0) {
      addEvent("System", `${importedCount} Fahrt(en) aus Telefonzentrale/Kunden übernommen.`, "system", "");
      addNotification("Mittel", "Neue Übergaben", `${importedCount} Fahrt(en) wurden in die Live-Dispo importiert.`, "system", "");
      localStorage.setItem(SHARED_RIDE_INBOX_KEY, JSON.stringify(remaining));
      saveData();
    }
  }

  function nowTime() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }

  function normalize(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function toMinutes(timeValue) {
    const [hours, minutes] = String(timeValue || "00:00").split(":").map((entry) => Number(entry) || 0);
    return hours * 60 + minutes;
  }

  function parseOrderDateTime(order) {
    return new Date(`${order.date}T${order.time}:00`);
  }

  function getOrderById(orderId) {
    return state.data.orders.find((order) => order.id === orderId) || null;
  }

  function getVehicleById(vehicleId) {
    return state.data.vehicles.find((vehicle) => vehicle.id === vehicleId) || null;
  }

  function getDriverById(driverId) {
    return state.data.drivers.find((driver) => driver.id === driverId) || null;
  }

  function formatBoolean(value) {
    return value ? "Ja" : "Nein";
  }

  function statusBelongsToTab(status, tab) {
    const statuses = TAB_STATUSES[tab] || [];
    return statuses.includes(status);
  }

  function getPriorityRank(priority) {
    if (priority === "Hoch") return 3;
    if (priority === "Mittel") return 2;
    return 1;
  }

  function isOrderActive(status) {
    return [
      "Bestätigt",
      "Zugewiesen",
      "Fahrer unterwegs",
      "Fahrer angekommen",
      "Fahrgast eingestiegen",
      "Fahrt läuft",
      "Ziel erreicht",
      "Wartet",
      "Problem"
    ].includes(status);
  }

  function isOrderCompleted(status) {
    return ["Abgeschlossen", "Storniert"].includes(status);
  }

  function getAvailableVehicles() {
    return state.data.vehicles.filter((vehicle) => !["Werkstatt", "Gesperrt"].includes(vehicle.status));
  }

  function evaluateOrderRisk(order) {
    if (isOrderCompleted(order.status)) {
      return { level: "green", reasons: ["Auftrag ist abgeschlossen oder storniert."], delay: 0 };
    }

    const reasons = [];
    const now = new Date();
    const orderDate = parseOrderDateTime(order);
    const diffMinutes = Math.round((orderDate.getTime() - now.getTime()) / 60000);

    if (!order.driverId || !order.vehicleId) {
      reasons.push("Kein Fahrer zugewiesen");
    }

    if (diffMinutes < 0) {
      reasons.push(`Voraussichtliche Verspätung: ${Math.abs(diffMinutes)} Minuten`);
    }

    if (diffMinutes >= 0 && diffMinutes < 15 && !["Fahrer unterwegs", "Fahrer angekommen", "Fahrgast eingestiegen", "Fahrt läuft", "Ziel erreicht"].includes(order.status)) {
      reasons.push("Abholung in weniger als 15 Minuten, Fahrer noch nicht gestartet");
    }

    if (order.wheelchair) {
      const suitable = getAvailableVehicles().some((vehicle) => vehicle.wheelchair);
      if (!suitable) {
        reasons.push("Kein passendes Rollstuhlfahrzeug verfügbar");
      }
    }

    const vehicle = order.vehicleId ? getVehicleById(order.vehicleId) : null;
    if (vehicle && ["Unterwegs", "Werkstatt", "Gesperrt", "Problem"].includes(vehicle.status)) {
      reasons.push("Zugewiesenes Fahrzeug ist gebunden oder eingeschränkt");
    }

    if (order.forcedRisk) {
      reasons.push("Überschneidung mit Folgeauftrag");
    }

    let level = "green";
    if (reasons.some((reason) => reason.includes("Verspätung") || reason.includes("Kein Fahrer") || reason.includes("Rollstuhlfahrzeug"))) {
      level = "red";
    } else if (reasons.some((reason) => reason.includes("gebunden") || reason.includes("Überschneidung"))) {
      level = "orange";
    } else if (reasons.length > 0) {
      level = "yellow";
    }

    return {
      level,
      reasons: reasons.length ? reasons : ["Alles im Zeitplan"],
      delay: diffMinutes < 0 ? Math.abs(diffMinutes) : 0
    };
  }

  function getVisibleOrders() {
    return state.data.orders
      .filter((order) => statusBelongsToTab(order.status, state.ui.activeTab))
      .filter((order) => {
        if (state.ui.priorityFilter === "Alle") return true;
        return order.priority === state.ui.priorityFilter;
      })
      .filter((order) => {
        if (state.ui.rideTypeFilter === "Alle") return true;
        return order.rideType === state.ui.rideTypeFilter;
      })
      .filter((order) => {
        if (!state.ui.searchTerm) return true;
        const search = normalize(state.ui.searchTerm);
        return [
          order.id,
          order.customer,
          order.phone,
          order.pickup,
          order.destination,
          order.rideType,
          order.priority,
          order.status,
          order.notes
        ].some((entry) => normalize(entry).includes(search));
      })
      .sort((a, b) => {
        if (state.ui.sortKey === "timeDesc") {
          return toMinutes(b.time) - toMinutes(a.time);
        }

        if (state.ui.sortKey === "priority") {
          const diff = getPriorityRank(b.priority) - getPriorityRank(a.priority);
          if (diff !== 0) return diff;
        }

        return toMinutes(a.time) - toMinutes(b.time);
      });
  }

  function getDerivedStats() {
    const orders = state.data.orders;
    const vehicles = state.data.vehicles;
    const drivers = state.data.drivers;

    const activeRides = orders.filter((order) => ["Fahrer unterwegs", "Fahrer angekommen", "Fahrgast eingestiegen", "Fahrt läuft"].includes(order.status)).length;
    const waitingOrders = orders.filter((order) => ["Neu", "Bestätigt", "Zugewiesen", "Wartet"].includes(order.status)).length;
    const freeVehicles = vehicles.filter((vehicle) => vehicle.status === "Frei").length;
    const driversOnDuty = drivers.filter((driver) => driver.onDuty && driver.status !== "Pause").length;
    const emergencies = orders.filter((order) => {
      const risk = evaluateOrderRisk(order);
      return risk.level === "red" || order.status === "Problem";
    }).length;
    const completedToday = orders.filter((order) => order.status === "Abgeschlossen").length;

    const avgWaitMinutes = orders
      .filter((order) => ["Neu", "Bestätigt", "Zugewiesen", "Wartet"].includes(order.status))
      .map((order) => {
        const created = toMinutes(order.createdAt || "08:00");
        const now = toMinutes(nowTime());
        return Math.max(0, now - created);
      });

    const avgWait = avgWaitMinutes.length
      ? Math.round(avgWaitMinutes.reduce((sum, value) => sum + value, 0) / avgWaitMinutes.length)
      : 0;

    const utilization = Math.round((vehicles.filter((vehicle) => ["Unterwegs", "Am Kunden", "Problem"].includes(vehicle.status)).length / Math.max(vehicles.length, 1)) * 100);

    return {
      activeRides,
      waitingOrders,
      freeVehicles,
      driversOnDuty,
      emergencies,
      avgWait,
      utilization,
      completedToday
    };
  }

  function buildKpiTrend(stats) {
    return {
      activeRides: { value: stats.activeRides > 3 ? "+4%" : "+1%", direction: "up" },
      waitingOrders: { value: stats.waitingOrders > 2 ? "+2%" : "-1%", direction: stats.waitingOrders > 2 ? "up" : "down" },
      freeVehicles: { value: stats.freeVehicles > 1 ? "+3%" : "-2%", direction: stats.freeVehicles > 1 ? "up" : "down" },
      driversOnDuty: { value: "+1%", direction: "up" },
      emergencies: { value: stats.emergencies > 1 ? "+1" : "-1", direction: stats.emergencies > 1 ? "up" : "down" },
      avgWait: { value: stats.avgWait > 15 ? "+1:20" : "-0:35", direction: stats.avgWait > 15 ? "up" : "down" },
      utilization: { value: `${stats.utilization}%`, direction: stats.utilization > 70 ? "up" : "down" },
      completedToday: { value: `+${stats.completedToday}`, direction: "up" }
    };
  }

  function renderKpis() {
    const wrap = document.querySelector("[data-dispo-kpi-grid]");
    if (!wrap) return;

    const stats = getDerivedStats();
    const trends = buildKpiTrend(stats);

    const rows = [
      { key: "activeRides", label: "Aktive Fahrten", value: stats.activeRides, tone: "blue" },
      { key: "waitingOrders", label: "Wartende Aufträge", value: stats.waitingOrders, tone: "yellow" },
      { key: "freeVehicles", label: "Freie Fahrzeuge", value: stats.freeVehicles, tone: "green" },
      { key: "driversOnDuty", label: "Fahrer im Dienst", value: stats.driversOnDuty, tone: "gold" },
      { key: "emergencies", label: "Notfälle", value: stats.emergencies, tone: "red" },
      { key: "avgWait", label: "Durchschnittliche Wartezeit", value: `${stats.avgWait} Min`, tone: "orange" },
      { key: "utilization", label: "Auslastung %", value: `${stats.utilization}%`, tone: "blue" },
      { key: "completedToday", label: "Heute abgeschlossene Fahrten", value: stats.completedToday, tone: "green" }
    ];

    wrap.innerHTML = rows
      .map((item) => {
        const trend = trends[item.key] || { value: "+0", direction: "up" };
        const trendArrow = trend.direction === "down" ? "↘" : "↗";
        const trendClass = trend.direction === "down" ? "is-down" : "is-up";
        return `
          <article class="dispo-kpi-card tone-${item.tone}">
            <small>${item.label}</small>
            <strong>${item.value}</strong>
            <span class="dispo-trend ${trendClass}">${trendArrow} ${trend.value}</span>
          </article>
        `;
      })
      .join("");
  }

  function getRiskBadge(order) {
    const risk = evaluateOrderRisk(order);
    return {
      className: `risk-${risk.level}`,
      label: risk.level === "green" ? "Grün" : risk.level === "yellow" ? "Gelb" : risk.level === "orange" ? "Orange" : "Rot",
      reason: risk.reasons[0]
    };
  }

  function getStatusClass(status) {
    return STATUS_CLASS_MAP[status] || "dispo-status-new";
  }

  function renderOrders() {
    const list = document.querySelector("[data-dispo-orders-list]");
    const count = document.querySelector("[data-dispo-order-count]");
    if (!list || !count) return;

    const visible = getVisibleOrders();
    count.textContent = `${visible.length} Aufträge`;

    if (!visible.length) {
      list.innerHTML = `
        <article class="admin-empty-state">
          <strong>Keine Aufträge im Filter</strong>
          <p>Bitte Filter oder Status-Tab anpassen.</p>
        </article>
      `;
      return;
    }

    list.innerHTML = visible
      .map((order) => {
        const driver = getDriverById(order.driverId);
        const vehicle = getVehicleById(order.vehicleId);
        const risk = getRiskBadge(order);

        return `
          <article class="dispo-order-card" data-dispo-order-id="${order.id}" draggable="true" title="Auftrag öffnen oder auf Fahrzeug ziehen">
            <header class="dispo-order-head">
              <div>
                <h3>${order.customer}</h3>
                <p>${order.id} · ${order.rideType} · ${order.time}</p>
              </div>
              <span class="status-pill ${getStatusClass(order.status)}">${order.status}</span>
            </header>

            <div class="dispo-order-risk ${risk.className}">
              <strong>Ampel: ${risk.label}</strong>
              <span>${risk.reason}</span>
            </div>

            <dl class="dispo-order-meta">
              <div><dt>Abholadresse</dt><dd>${order.pickup}</dd></div>
              <div><dt>Ziel</dt><dd>${order.destination}</dd></div>
              <div><dt>Priorität</dt><dd>${order.priority}</dd></div>
              <div><dt>Fahrer</dt><dd>${driver ? driver.name : "Nicht zugewiesen"}</dd></div>
              <div><dt>Fahrzeug</dt><dd>${vehicle ? vehicle.plate : "Nicht zugewiesen"}</dd></div>
              <div><dt>Status</dt><dd>${order.status}</dd></div>
            </dl>

            <div class="dispo-order-actions">
              <button class="admin-btn admin-btn-secondary" type="button" title="Detailansicht öffnen" data-dispo-order-action="details" data-dispo-order-id="${order.id}">Details</button>
              <button class="admin-btn" type="button" title="Fahrer- und Fahrzeugzuweisung öffnen" data-dispo-order-action="assign" data-dispo-order-id="${order.id}">Fahrer zuweisen</button>
              <button class="admin-btn admin-btn-secondary" type="button" title="Statusauswahl öffnen" data-dispo-order-action="status" data-dispo-order-id="${order.id}">Status ändern</button>
              <button class="admin-btn admin-btn-secondary" type="button" title="Kontaktfenster für Kunden und Fahrer" data-dispo-order-action="contact" data-dispo-order-id="${order.id}">Kontakt</button>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function getVehicleStatusClass(vehicle) {
    if (["Werkstatt", "Gesperrt"].includes(vehicle.status)) return "dispo-fleet-red";
    if (["Problem", "Am Kunden"].includes(vehicle.status)) return "dispo-fleet-orange";
    if (vehicle.status === "Pause") return "dispo-fleet-yellow";
    if (vehicle.status === "Unterwegs") return "dispo-fleet-blue";
    return "dispo-fleet-green";
  }

  function getVehicleMarkerClass(vehicle) {
    if (vehicle.status === "Frei") return "marker-free";
    if (vehicle.status === "Unterwegs") return "marker-onroute";
    if (vehicle.status === "Am Kunden") return "marker-customer";
    if (vehicle.status === "Pause") return "marker-pause";
    if (vehicle.status === "Problem") return "marker-problem";
    if (vehicle.status === "Werkstatt") return "marker-workshop";
    if (vehicle.status === "Gesperrt") return "marker-locked";
    return "marker-free";
  }

  function renderFleet() {
    const list = document.querySelector("[data-dispo-fleet-list]");
    if (!list) return;

    list.innerHTML = state.data.vehicles
      .map((vehicle) => {
        const driver = getDriverById(vehicle.driverId);
        const currentOrder = getOrderById(vehicle.currentOrderId);
        const nextOrder = getOrderById(vehicle.nextOrderId);
        const statusClass = getVehicleStatusClass(vehicle);
        const selectedClass = state.ui.selectedVehicleId === vehicle.id ? "is-selected" : "";

        return `
          <article class="dispo-fleet-card ${statusClass} ${selectedClass}" data-dispo-vehicle-id="${vehicle.id}" title="Fahrzeugdetails öffnen oder Auftrag hier ablegen">
            <header class="dispo-fleet-head">
              <div>
                <h3>${vehicle.name}</h3>
                <p>${vehicle.plate}</p>
              </div>
              <span class="status-pill ${statusClass}">${vehicle.status}</span>
            </header>

            <dl class="dispo-fleet-meta">
              <div><dt>Aktueller Fahrer</dt><dd>${driver ? driver.name : "-"}</dd></div>
              <div><dt>Aktuelle Fahrt</dt><dd>${currentOrder ? currentOrder.id : "-"}</dd></div>
              <div><dt>Nächster Auftrag</dt><dd>${nextOrder ? nextOrder.id : "-"}</dd></div>
              <div><dt>Verfügbarkeit</dt><dd>${vehicle.status === "Frei" ? "Verfügbar" : "Gebunden"}</dd></div>
            </dl>

            <div class="dispo-meter-grid">
              <div><span>Tank</span><b>${vehicle.fuel}%</b></div>
              <div><span>Batterie</span><b>${vehicle.battery}%</b></div>
              <div><span>Geschwindigkeit</span><b>${vehicle.speed} km/h</b></div>
            </div>

            <div class="dispo-fleet-actions">
              <button class="admin-btn admin-btn-secondary" type="button" title="Fahrzeugdetails anzeigen" data-dispo-vehicle-action="details" data-dispo-vehicle-id="${vehicle.id}">Details</button>
              <button class="admin-btn admin-btn-secondary" type="button" title="Neuen Auftrag diesem Fahrzeug zuweisen" data-dispo-vehicle-action="assign" data-dispo-vehicle-id="${vehicle.id}">Auftrag zuweisen</button>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function renderMap() {
    const surface = document.querySelector("[data-dispo-map-surface]");
    if (!surface) return;

    const selectedOrder = getOrderById(state.ui.selectedOrderId);
    const selectedVehicle = getVehicleById(state.ui.selectedVehicleId) || (selectedOrder ? getVehicleById(selectedOrder.vehicleId) : null);

    const vehicleMarkers = state.data.vehicles
      .map((vehicle) => {
        const selectedClass = selectedVehicle && selectedVehicle.id === vehicle.id ? "is-selected" : "";
        return `
          <button
            class="dispo-map-marker ${getVehicleMarkerClass(vehicle)} ${selectedClass}"
            type="button"
            style="left:${vehicle.x}%;top:${vehicle.y}%;"
            data-dispo-map-vehicle="${vehicle.id}"
            title="Fahrzeug ${vehicle.plate} öffnen"
          >
            <span>🚖</span>
            <strong>${vehicle.plate}</strong>
          </button>
        `;
      })
      .join("");

    const pickupPoint = selectedOrder
      ? `<span class="dispo-map-point customer-point" style="left:${selectedOrder.pickupCoord.x}%;top:${selectedOrder.pickupCoord.y}%;" title="Abholadresse ${selectedOrder.pickup}">Abholung</span>`
      : "";

    const destinationPoint = selectedOrder
      ? `<span class="dispo-map-point destination-point" style="left:${selectedOrder.destinationCoord.x}%;top:${selectedOrder.destinationCoord.y}%;" title="Zieladresse ${selectedOrder.destination}">Ziel</span>`
      : "";

    const relation = selectedOrder && selectedVehicle
      ? `<div class="dispo-map-relation" style="--from-x:${selectedVehicle.x}%;--from-y:${selectedVehicle.y}%;--to-x:${selectedOrder.pickupCoord.x}%;--to-y:${selectedOrder.pickupCoord.y}%;"></div>`
      : "";

    const route = selectedOrder
      ? `<div class="dispo-map-route is-active" style="--pickup-x:${selectedOrder.pickupCoord.x}%;--pickup-y:${selectedOrder.pickupCoord.y}%;--target-x:${selectedOrder.destinationCoord.x}%;--target-y:${selectedOrder.destinationCoord.y}%;" aria-hidden="true"></div>`
      : "<div class=\"dispo-map-route\" aria-hidden=\"true\"></div>";

    surface.innerHTML = `${vehicleMarkers}${pickupPoint}${destinationPoint}${relation}${route}`;
  }

  function renderEvents() {
    const timeline = document.querySelector("[data-dispo-events-timeline]");
    if (!timeline) return;

    const visibleEvents = state.data.events.filter((entry) => {
      if (state.ui.eventFilter === "Alle") return true;
      return entry.category === state.ui.eventFilter;
    });

    if (!visibleEvents.length) {
      timeline.innerHTML = `
        <article class="admin-empty-state">
          <strong>Keine Ereignisse im Filter</strong>
          <p>Bitte einen anderen Filter wählen.</p>
        </article>
      `;
      return;
    }

    timeline.innerHTML = visibleEvents
      .slice(0, 40)
      .map((entry) => {
        const toneClass = entry.tone || EVENT_TONE_MAP[entry.category] || "tone-system";
        const ref = entry.refId ? `<small>${entry.refId}</small>` : "";
        return `
          <article class="dispo-event-item ${toneClass}">
            <time>${entry.time}</time>
            <strong>${entry.category}</strong>
            <p>${entry.message}</p>
            ${ref}
          </article>
        `;
      })
      .join("");
  }

  function renderNotifications() {
    const badge = document.querySelector("[data-dispo-alert-count]");
    const list = document.querySelector("[data-dispo-notify-list]");
    if (!badge || !list) return;

    const unread = state.data.notifications.filter((item) => !item.read).length;
    badge.textContent = String(unread);
    badge.hidden = unread <= 0;

    const visible = state.data.notifications.filter((item) => {
      if (state.ui.notifyFilter === "Alle") return true;
      return item.priority === state.ui.notifyFilter;
    });

    if (!visible.length) {
      list.innerHTML = `
        <p class="dispo-empty-line">Keine Benachrichtigungen für diesen Filter.</p>
      `;
      return;
    }

    list.innerHTML = visible
      .map((item) => {
        const readClass = item.read ? "is-read" : "";
        return `
          <article class="dispo-notify-item ${readClass}">
            <header>
              <strong>${item.title}</strong>
              <span class="dispo-prio-badge prio-${normalize(item.priority)}">${item.priority}</span>
            </header>
            <p>${item.text}</p>
            <small>${item.time}</small>
            <div class="dispo-notify-actions">
              <button class="admin-btn admin-btn-secondary" type="button" data-dispo-notify-action="open" data-dispo-notify-id="${item.id}">Öffnen</button>
              ${item.read ? "<span class=\"dispo-read-chip\">Gelesen</span>" : `<button class="admin-btn admin-btn-secondary" type="button" data-dispo-notify-action="read" data-dispo-notify-id="${item.id}">Als gelesen</button>`}
            </div>
          </article>
        `;
      })
      .join("");
  }

  function setFeedback(text, tone = "info") {
    const feedback = document.querySelector("[data-dispo-feedback]");
    if (!feedback) return;

    feedback.textContent = text;
    feedback.classList.add("is-highlight");
    feedback.classList.toggle("is-error", tone === "error");
    feedback.classList.toggle("is-success", tone === "success");

    window.setTimeout(() => {
      feedback.classList.remove("is-highlight", "is-error", "is-success");
    }, 1000);
  }

  function addEvent(category, message, refType = "system", refId = "") {
    state.data.sequence.event += 1;
    const event = {
      id: `EV-${state.data.sequence.event}`,
      time: nowTime(),
      category,
      tone: EVENT_TONE_MAP[category] || "tone-system",
      message,
      refType,
      refId
    };

    state.data.events.unshift(event);
    if (state.data.events.length > MAX_EVENTS) {
      state.data.events.length = MAX_EVENTS;
    }
  }

  function addNotification(priority, title, text, refType = "system", refId = "") {
    state.data.sequence.notification += 1;
    const item = {
      id: `NT-${state.data.sequence.notification}`,
      priority,
      title,
      text,
      refType,
      refId,
      read: false,
      time: nowTime()
    };

    state.data.notifications.unshift(item);
    if (state.data.notifications.length > MAX_NOTIFICATIONS) {
      state.data.notifications.length = MAX_NOTIFICATIONS;
    }
  }

  function updateVehicleLinks() {
    state.data.vehicles.forEach((vehicle) => {
      const related = state.data.orders
        .filter((order) => order.vehicleId === vehicle.id && !isOrderCompleted(order.status))
        .sort((a, b) => toMinutes(a.time) - toMinutes(b.time));

      vehicle.currentOrderId = related[0] ? related[0].id : "";
      vehicle.nextOrderId = related[1] ? related[1].id : "";

      if (vehicle.status === "Gesperrt" || vehicle.status === "Werkstatt") {
        vehicle.markerType = vehicle.status;
        return;
      }

      if (vehicle.currentOrderId) {
        const currentOrder = getOrderById(vehicle.currentOrderId);
        if (currentOrder && ["Fahrer angekommen", "Fahrgast eingestiegen", "Wartet"].includes(currentOrder.status)) {
          vehicle.status = "Am Kunden";
          vehicle.markerType = "Am Kunden";
        } else {
          vehicle.status = "Unterwegs";
          vehicle.markerType = "Unterwegs";
        }
      } else if (getDriverById(vehicle.driverId)?.status === "Pause") {
        vehicle.status = "Pause";
        vehicle.markerType = "Pause";
      } else {
        vehicle.status = "Frei";
        vehicle.markerType = "Frei";
      }
    });
  }

  function detectConflicts(order, vehicle) {
    const conflicts = [];
    const driver = getDriverById(vehicle.driverId);

    if (vehicle.status === "Unterwegs" || vehicle.currentOrderId) {
      conflicts.push("Fahrzeug ist bereits unterwegs oder hat eine aktive Fahrt.");
    }

    if (vehicle.status === "Gesperrt") {
      conflicts.push("Fahrzeug ist gesperrt.");
    }

    if (vehicle.status === "Werkstatt") {
      conflicts.push("Fahrzeug ist in der Werkstatt.");
    }

    if (vehicle.seats < Number(order.persons || 1)) {
      conflicts.push("Fahrzeug hat zu wenige Sitzplätze.");
    }

    if (order.wheelchair && !vehicle.wheelchair) {
      conflicts.push("Rollstuhlfahrt ohne geeignetes Fahrzeug.");
    }

    if (driver && driver.status === "Pause") {
      conflicts.push("Fahrer befindet sich in Pause.");
    }

    const overlap = state.data.orders.find((entry) => {
      if (entry.id === order.id) return false;
      if (entry.driverId !== vehicle.driverId) return false;
      if (isOrderCompleted(entry.status)) return false;
      return Math.abs(toMinutes(entry.time) - toMinutes(order.time)) < 25;
    });

    if (overlap) {
      conflicts.push(`Fahrer hat bereits einen Auftrag zur ähnlichen Zeit (${overlap.id}).`);
    }

    const minutesToOrder = toMinutes(order.time) - toMinutes(nowTime());
    const nextFreeMinutes = toMinutes(vehicle.nextFreeTime || "09:00") - toMinutes(nowTime());
    if (minutesToOrder < nextFreeMinutes) {
      conflicts.push("Zu wenig Zeit bis zum nächsten freien Zeitpunkt.");
    }

    return conflicts;
  }

  function recommendVehicles(order) {
    return state.data.vehicles
      .map((vehicle) => {
        const driver = getDriverById(vehicle.driverId);
        const distance = Math.max(3, Math.round(Math.abs(vehicle.x - order.pickupCoord.x) * 0.7 + Math.abs(vehicle.y - order.pickupCoord.y) * 0.4));
        const conflicts = detectConflicts(order, vehicle);

        let score = 100;
        if (["Werkstatt", "Gesperrt"].includes(vehicle.status)) score -= 60;
        if (vehicle.status === "Unterwegs") score -= 35;
        if (vehicle.status === "Pause") score -= 20;
        if (order.wheelchair && !vehicle.wheelchair) score -= 40;
        if (vehicle.seats < Number(order.persons || 1)) score -= 30;
        score -= Math.min(35, distance);
        score -= Math.min(20, Math.round((vehicle.utilization || 0) / 5));
        if (driver && driver.status === "Aktiv") score += 10;
        if (!vehicle.nextOrderId) score += 8;
        score -= conflicts.length * 10;

        let reason = `Nur ${distance} Minuten entfernt.`;
        if (!vehicle.nextOrderId) {
          reason = `Nur ${distance} Minuten entfernt und anschließend kein Termin.`;
        } else if (order.wheelchair && vehicle.wheelchair) {
          reason = `Rollstuhl geeignet und ${distance} Minuten entfernt.`;
        }

        return {
          vehicle,
          driver,
          distance,
          score,
          reason,
          conflicts
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  function openModal(title, bodyHtml, footHtml) {
    const modal = document.querySelector("[data-dispo-modal]");
    const titleNode = document.querySelector("[data-dispo-modal-title]");
    const bodyNode = document.querySelector("[data-dispo-modal-body]");
    const footNode = document.querySelector("[data-dispo-modal-foot]");
    if (!modal || !titleNode || !bodyNode || !footNode) return;

    titleNode.textContent = title;
    bodyNode.innerHTML = bodyHtml;
    footNode.innerHTML = footHtml || '<button class="admin-btn admin-btn-secondary" type="button" data-dispo-modal-close>Schließen</button>';

    modal.hidden = false;
    document.body.classList.add("admin-modal-open");
  }

  function closeModal() {
    const modal = document.querySelector("[data-dispo-modal]");
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove("admin-modal-open");
  }

  function assignOrder(orderId, vehicleId, options = {}) {
    const order = getOrderById(orderId);
    const vehicle = getVehicleById(vehicleId);
    if (!order || !vehicle) return;

    const driver = getDriverById(vehicle.driverId);
    if (!driver) return;

    order.driverId = driver.id;
    order.vehicleId = vehicle.id;
    order.status = "Zugewiesen";
    order.updatedAt = nowTime();
    order.forcedRisk = Boolean(options.forcedRisk);

    updateVehicleLinks();

    addEvent("Aufträge", `Auftrag ${order.id} wurde ${vehicle.plate} zugewiesen.`, "order", order.id);
    addNotification("Mittel", "Auftrag zugewiesen", `Auftrag ${order.id} wurde ${vehicle.plate} zugewiesen.`, "order", order.id);

    setFeedback(`Auftrag ${order.id} wurde ${vehicle.plate} zugewiesen.`, "success");

    state.ui.selectedOrderId = order.id;
    state.ui.selectedVehicleId = vehicle.id;

    saveData();
    rerender();
  }

  function openConflictModal(orderId, vehicleId, conflicts, previousModal = "") {
    const order = getOrderById(orderId);
    const vehicle = getVehicleById(vehicleId);
    if (!order || !vehicle) return;

    const body = `
      <section class="dispo-conflict-box">
        <p>Vor der Zuweisung wurden folgende Konflikte erkannt:</p>
        <ul>
          ${conflicts.map((conflict) => `<li>${conflict}</li>`).join("")}
        </ul>
        <p>Auftrag: <strong>${order.id}</strong> · Fahrzeug: <strong>${vehicle.plate}</strong></p>
      </section>
    `;

    const foot = `
      <button class="admin-btn admin-btn-secondary" type="button" data-dispo-modal-action="cancel">Zuweisung abbrechen</button>
      <button class="admin-btn admin-btn-secondary" type="button" data-dispo-modal-action="otherVehicle" data-dispo-order-id="${order.id}">Anderes Fahrzeug wählen</button>
      <button class="admin-btn admin-btn-warning" type="button" data-dispo-modal-action="forceAssign" data-dispo-order-id="${order.id}" data-dispo-vehicle-id="${vehicle.id}">Trotzdem zuweisen</button>
    `;

    openModal("Konfliktprüfung", body, foot);

    if (previousModal === "assign") {
      setFeedback("Konflikte erkannt. Bitte Entscheidung treffen.", "error");
    }
  }

  function openAssignModal(orderId, preferredVehicleId = "") {
    const order = getOrderById(orderId);
    if (!order) return;

    const recommendations = recommendVehicles(order);
    const best = recommendations[0];

    const body = `
      <section class="dispo-assign-wrap">
        <p>Auftrag <strong>${order.id}</strong> für <strong>${order.customer}</strong>. Wähle ein Fahrzeug oder nutze Drag & Drop.</p>
        ${best ? `
          <article class="dispo-best-choice">
            <strong>Beste Wahl: ${best.vehicle.plate}</strong>
            <p>${best.reason}</p>
          </article>
        ` : ""}
        <div class="dispo-assign-list">
          ${recommendations
            .map((entry) => {
              const vehicle = entry.vehicle;
              const driver = entry.driver;
              const recommended = best && best.vehicle.id === vehicle.id ? "is-recommended" : "";
              const selected = preferredVehicleId && preferredVehicleId === vehicle.id ? "is-selected" : "";

              return `
                <article class="dispo-assign-card ${recommended} ${selected}">
                  <header>
                    <h4>${vehicle.plate}</h4>
                    <span>${vehicle.name}</span>
                  </header>
                  <dl>
                    <div><dt>Fahrer</dt><dd>${driver ? driver.name : "-"}</dd></div>
                    <div><dt>Fahrzeugtyp</dt><dd>${vehicle.type}</dd></div>
                    <div><dt>Sitzplätze</dt><dd>${vehicle.seats}</dd></div>
                    <div><dt>Rollstuhl geeignet</dt><dd>${formatBoolean(vehicle.wheelchair)}</dd></div>
                    <div><dt>Entfernung Demo</dt><dd>${entry.distance} Minuten</dd></div>
                    <div><dt>Auslastung</dt><dd>${vehicle.utilization}%</dd></div>
                    <div><dt>Nächster freier Zeitpunkt</dt><dd>${vehicle.nextFreeTime}</dd></div>
                    <div><dt>Status</dt><dd>${vehicle.status}</dd></div>
                  </dl>
                  ${entry.conflicts.length ? `<p class="dispo-inline-warning">Konflikte: ${entry.conflicts.length}</p>` : ""}
                  <button class="admin-btn" type="button" data-dispo-modal-action="assignVehicle" data-dispo-order-id="${order.id}" data-dispo-vehicle-id="${vehicle.id}">Zuordnen</button>
                </article>
              `;
            })
            .join("")}
        </div>
      </section>
    `;

    const foot = `
      <button class="admin-btn admin-btn-secondary" type="button" data-dispo-modal-close>Schließen</button>
    `;

    openModal("Fahrer zuweisen", body, foot);
  }

  function openStatusModal(orderId) {
    const order = getOrderById(orderId);
    if (!order) return;

    const body = `
      <section class="dispo-status-form">
        <p>Auftrag <strong>${order.id}</strong> · ${order.customer}</p>
        <label>
          <span>Status</span>
          <select class="dispo-select" data-dispo-status-select>
            ${STATUS_LIST.map((status) => `<option value="${status}" ${status === order.status ? "selected" : ""}>${status}</option>`).join("")}
          </select>
        </label>
      </section>
    `;

    const foot = `
      <button class="admin-btn admin-btn-secondary" type="button" data-dispo-modal-close>Abbrechen</button>
      <button class="admin-btn" type="button" data-dispo-modal-action="saveStatus" data-dispo-order-id="${order.id}">Status speichern</button>
    `;

    openModal("Status ändern", body, foot);
  }

  function changeOrderStatus(orderId, nextStatus) {
    const order = getOrderById(orderId);
    if (!order) return;

    const previousStatus = order.status;
    order.status = nextStatus;
    order.updatedAt = nowTime();

    if (nextStatus === "Storniert") {
      order.driverId = "";
      order.vehicleId = "";
    }

    if (nextStatus === "Abgeschlossen") {
      order.forcedRisk = false;
    }

    updateVehicleLinks();

    addEvent("Aufträge", `Statuswechsel ${order.id}: ${previousStatus} → ${nextStatus}.`, "order", order.id);
    addNotification("Mittel", "Auftragsstatus geändert", `${order.id} ist jetzt ${nextStatus}.`, "order", order.id);

    setFeedback(`Status von ${order.id} wurde auf ${nextStatus} gesetzt.`, "success");

    saveData();
    rerender();
  }

  function openOrderDetails(orderId) {
    const order = getOrderById(orderId);
    if (!order) return;

    const driver = getDriverById(order.driverId);
    const vehicle = getVehicleById(order.vehicleId);
    const risk = evaluateOrderRisk(order);

    const body = `
      <section class="dispo-detail-layout">
        <article>
          <h4>Auftragsdaten</h4>
          <dl class="dispo-detail-list">
            <div><dt>Auftragsnummer</dt><dd>${order.id}</dd></div>
            <div><dt>Kunde</dt><dd>${order.customer}</dd></div>
            <div><dt>Telefonnummer</dt><dd>${order.phone}</dd></div>
            <div><dt>Abholadresse</dt><dd>${order.pickup}</dd></div>
            <div><dt>Zieladresse</dt><dd>${order.destination}</dd></div>
            <div><dt>Datum</dt><dd>${order.date}</dd></div>
            <div><dt>Uhrzeit</dt><dd>${order.time}</dd></div>
            <div><dt>Fahrtart</dt><dd>${order.rideType}</dd></div>
            <div><dt>Personenanzahl</dt><dd>${order.persons}</dd></div>
            <div><dt>Gepäck</dt><dd>${order.luggage}</dd></div>
            <div><dt>Rollstuhl</dt><dd>${formatBoolean(order.wheelchair)}</dd></div>
            <div><dt>Begleitperson</dt><dd>${formatBoolean(order.companion)}</dd></div>
            <div><dt>Krankenkasse</dt><dd>${order.insurance || "-"}</dd></div>
            <div><dt>Genehmigungsstatus</dt><dd>${order.approval}</dd></div>
            <div><dt>Hin- und Rückfahrt</dt><dd>${order.returnTrip ? `Ja, Rückfahrt ${order.returnTime || "offen"}` : "Nein"}</dd></div>
            <div><dt>Fahrer</dt><dd>${driver ? driver.name : "Nicht zugewiesen"}</dd></div>
            <div><dt>Fahrzeug</dt><dd>${vehicle ? `${vehicle.plate} (${vehicle.name})` : "Nicht zugewiesen"}</dd></div>
            <div><dt>Notizen</dt><dd>${order.notes || "-"}</dd></div>
            <div><dt>Preis / Abrechnung</dt><dd>${order.pricing} · ${order.billingType}</dd></div>
            <div><dt>Erstellt</dt><dd>${order.createdAt}</dd></div>
            <div><dt>Letzte Änderung</dt><dd>${order.updatedAt}</dd></div>
          </dl>
        </article>
        <article class="dispo-detail-risk risk-${risk.level}">
          <h4>Ampelsystem</h4>
          <p>${risk.reasons.join("<br>")}</p>
        </article>
      </section>
    `;

    const foot = `
      <button class="admin-btn admin-btn-secondary" type="button" data-dispo-modal-action="editOrder" data-dispo-order-id="${order.id}">Auftrag bearbeiten</button>
      <button class="admin-btn" type="button" data-dispo-modal-action="assignOrder" data-dispo-order-id="${order.id}">Fahrer zuweisen</button>
      <button class="admin-btn admin-btn-secondary" type="button" data-dispo-modal-action="changeStatus" data-dispo-order-id="${order.id}">Status ändern</button>
      <button class="admin-btn admin-btn-secondary" type="button" data-dispo-modal-action="callCustomer" data-dispo-order-id="${order.id}">Kunde anrufen</button>
      <button class="admin-btn admin-btn-secondary" type="button" data-dispo-modal-action="contactDriver" data-dispo-order-id="${order.id}">Fahrer kontaktieren</button>
      <button class="admin-btn admin-btn-secondary" type="button" data-dispo-modal-action="duplicateOrder" data-dispo-order-id="${order.id}">Auftrag duplizieren</button>
      <button class="admin-btn admin-btn-danger" type="button" data-dispo-modal-action="cancelOrder" data-dispo-order-id="${order.id}">Auftrag stornieren</button>
    `;

    openModal(`Auftragsdetails ${order.id}`, body, foot);
  }

  function openVehicleDetails(vehicleId) {
    const vehicle = getVehicleById(vehicleId);
    if (!vehicle) return;
    const driver = getDriverById(vehicle.driverId);
    const currentOrder = getOrderById(vehicle.currentOrderId);
    const nextOrder = getOrderById(vehicle.nextOrderId);

    const body = `
      <section class="dispo-detail-layout">
        <article>
          <h4>Fahrzeugdetails</h4>
          <dl class="dispo-detail-list">
            <div><dt>Fahrzeugname</dt><dd>${vehicle.name}</dd></div>
            <div><dt>Kennzeichen</dt><dd>${vehicle.plate}</dd></div>
            <div><dt>Fahrzeugtyp</dt><dd>${vehicle.type}</dd></div>
            <div><dt>Sitzplätze</dt><dd>${vehicle.seats}</dd></div>
            <div><dt>Rollstuhl geeignet</dt><dd>${formatBoolean(vehicle.wheelchair)}</dd></div>
            <div><dt>Aktueller Fahrer</dt><dd>${driver ? driver.name : "-"}</dd></div>
            <div><dt>Fahrer-Telefon</dt><dd>${driver ? driver.phone : "-"}</dd></div>
            <div><dt>Aktueller Status</dt><dd>${vehicle.status}</dd></div>
            <div><dt>Aktueller Auftrag</dt><dd>${currentOrder ? currentOrder.id : "-"}</dd></div>
            <div><dt>Nächster Auftrag</dt><dd>${nextOrder ? nextOrder.id : "-"}</dd></div>
            <div><dt>Demo-Standort</dt><dd>${vehicle.location}</dd></div>
            <div><dt>Geschwindigkeit</dt><dd>${vehicle.speed} km/h</dd></div>
            <div><dt>Kilometerstand</dt><dd>${vehicle.km.toLocaleString("de-DE")} km</dd></div>
            <div><dt>Tank / Akku</dt><dd>${vehicle.fuel}% / ${vehicle.battery}%</dd></div>
            <div><dt>Reichweite</dt><dd>${vehicle.range}</dd></div>
            <div><dt>Nächster Service</dt><dd>${vehicle.nextService}</dd></div>
            <div><dt>TÜV</dt><dd>${vehicle.tuv}</dd></div>
            <div><dt>Reifenstatus</dt><dd>${vehicle.tires}</dd></div>
            <div><dt>Letztes Update</dt><dd>${vehicle.lastUpdate}</dd></div>
          </dl>
        </article>
      </section>
    `;

    const foot = `
      <button class="admin-btn admin-btn-secondary" type="button" data-dispo-modal-action="contactDriverByVehicle" data-dispo-vehicle-id="${vehicle.id}">Fahrer kontaktieren</button>
      <button class="admin-btn" type="button" data-dispo-modal-action="assignFromVehicle" data-dispo-vehicle-id="${vehicle.id}">Auftrag zuweisen</button>
      <button class="admin-btn admin-btn-warning" type="button" data-dispo-modal-action="lockVehicle" data-dispo-vehicle-id="${vehicle.id}">Fahrzeug sperren</button>
      <button class="admin-btn admin-btn-secondary" type="button" data-dispo-modal-action="unlockVehicle" data-dispo-vehicle-id="${vehicle.id}">Fahrzeug freigeben</button>
      <button class="admin-btn admin-btn-secondary" type="button" data-dispo-modal-action="pauseVehicle" data-dispo-vehicle-id="${vehicle.id}">Pause setzen</button>
      <button class="admin-btn admin-btn-warning" type="button" data-dispo-modal-action="workshopVehicle" data-dispo-vehicle-id="${vehicle.id}">Zur Werkstatt melden</button>
      <button class="admin-btn admin-btn-secondary" type="button" data-dispo-modal-action="focusVehicle" data-dispo-vehicle-id="${vehicle.id}">Auf Karte fokussieren</button>
    `;

    openModal(`Fahrzeug ${vehicle.plate}`, body, foot);
  }

  function openDriverContactModal(driverId = "", orderId = "") {
    const driver = getDriverById(driverId) || state.data.drivers[0];
    if (!driver) return;

    const vehicle = state.data.vehicles.find((entry) => entry.driverId === driver.id);

    const body = `
      <section class="dispo-contact-wrap">
        <dl class="dispo-detail-list">
          <div><dt>Fahrername</dt><dd>${driver.name}</dd></div>
          <div><dt>Telefonnummer</dt><dd>${driver.phone}</dd></div>
          <div><dt>Aktuelles Fahrzeug</dt><dd>${vehicle ? vehicle.plate : "-"}</dd></div>
          <div><dt>Aktueller Status</dt><dd>${driver.status}</dd></div>
        </dl>
        <label>
          <span>Demo-Nachricht</span>
          <select class="dispo-select" data-dispo-contact-template>
            <option value="Bitte Auftrag prüfen.">Bitte Auftrag prüfen.</option>
            <option value="Bitte Standort aktualisieren.">Bitte Standort aktualisieren.</option>
            <option value="Kunde wartet bereits.">Kunde wartet bereits.</option>
            <option value="Bitte Zentrale anrufen.">Bitte Zentrale anrufen.</option>
            <option value="Folgeauftrag beachten.">Folgeauftrag beachten.</option>
            <option value="Bitte Pause beenden.">Bitte Pause beenden.</option>
          </select>
        </label>
      </section>
    `;

    const foot = `
      <button class="admin-btn admin-btn-secondary" type="button" data-dispo-modal-action="callDriver" data-dispo-driver-id="${driver.id}">Anrufen</button>
      <button class="admin-btn" type="button" data-dispo-modal-action="sendDriverMessage" data-dispo-driver-id="${driver.id}" data-dispo-order-id="${orderId}">Nachricht senden</button>
      <button class="admin-btn admin-btn-secondary" type="button" data-dispo-modal-action="requestCallback" data-dispo-driver-id="${driver.id}">Rückruf anfordern</button>
    `;

    openModal("Fahrer kontaktieren", body, foot);
  }

  function openNewRideModal(prefill = null, editOrderId = "") {
    const row = prefill || {
      customer: "",
      phone: "",
      pickup: "",
      destination: "",
      date: DEMO_DAY,
      time: "09:45",
      rideType: "Taxi",
      persons: 1,
      vehicleWish: "",
      wheelchair: false,
      companion: false,
      luggage: "",
      returnTrip: false,
      returnTime: "",
      insurance: "",
      transportVoucher: "",
      approval: "",
      notes: "",
      priority: "Mittel"
    };

    const body = `
      <form class="dispo-newride-form" data-dispo-newride-form>
        <input type="hidden" name="editOrderId" value="${editOrderId}">
        <label><span>Kunde</span><input class="driver-search-input" name="customer" value="${row.customer}" required></label>
        <label><span>Telefonnummer</span><input class="driver-search-input" name="phone" value="${row.phone}" required></label>
        <label><span>Abholadresse</span><input class="driver-search-input" name="pickup" value="${row.pickup}" required></label>
        <label><span>Zieladresse</span><input class="driver-search-input" name="destination" value="${row.destination}" required></label>
        <label><span>Datum</span><input class="driver-search-input" type="date" name="date" value="${row.date}" required></label>
        <label><span>Uhrzeit</span><input class="driver-search-input" type="time" name="time" value="${row.time}" required></label>
        <label>
          <span>Fahrtart</span>
          <select class="dispo-select" name="rideType">
            ${["Taxi", "Krankenfahrt", "Dialyse", "Chemo", "Strahlentherapie", "Rollstuhlfahrt", "Flughafenfahrt", "Schülerfahrt", "Kurierfahrt", "Fernfahrt"].map((type) => `<option value="${type}" ${type === row.rideType ? "selected" : ""}>${type}</option>`).join("")}
          </select>
        </label>
        <label><span>Personenanzahl</span><input class="driver-search-input" type="number" min="1" max="8" name="persons" value="${row.persons}" required></label>
        <label><span>Fahrzeugwunsch</span><input class="driver-search-input" name="vehicleWish" value="${row.vehicleWish}"></label>
        <label><span>Rollstuhl</span><select class="dispo-select" name="wheelchair"><option value="Nein">Nein</option><option value="Ja" ${row.wheelchair ? "selected" : ""}>Ja</option></select></label>
        <label><span>Begleitperson</span><select class="dispo-select" name="companion"><option value="Nein">Nein</option><option value="Ja" ${row.companion ? "selected" : ""}>Ja</option></select></label>
        <label><span>Gepäck</span><input class="driver-search-input" name="luggage" value="${row.luggage}"></label>
        <label><span>Hin- und Rückfahrt</span><select class="dispo-select" name="returnTrip"><option value="Nein">Nein</option><option value="Ja" ${row.returnTrip ? "selected" : ""}>Ja</option></select></label>
        <label><span>Rückfahrtzeit</span><input class="driver-search-input" type="time" name="returnTime" value="${row.returnTime}"></label>
        <label><span>Krankenkasse</span><input class="driver-search-input" name="insurance" value="${row.insurance}"></label>
        <label><span>Transportschein</span><input class="driver-search-input" name="transportVoucher" value="${row.transportVoucher}"></label>
        <label><span>Genehmigung</span><input class="driver-search-input" name="approval" value="${row.approval}"></label>
        <label class="full"><span>Notizen</span><textarea class="driver-search-input" name="notes">${row.notes}</textarea></label>
        <label>
          <span>Priorität</span>
          <select class="dispo-select" name="priority">
            <option value="Hoch" ${row.priority === "Hoch" ? "selected" : ""}>Hoch</option>
            <option value="Mittel" ${row.priority === "Mittel" ? "selected" : ""}>Mittel</option>
            <option value="Niedrig" ${row.priority === "Niedrig" ? "selected" : ""}>Niedrig</option>
          </select>
        </label>
      </form>
    `;

    const foot = `
      <button class="admin-btn admin-btn-secondary" type="button" data-dispo-modal-close>Abbrechen</button>
      <button class="admin-btn" type="button" data-dispo-modal-action="saveNewRide">Speichern</button>
    `;

    openModal(prefill ? "Auftrag bearbeiten" : "Neue Fahrt erstellen", body, foot);
  }

  function saveNewRideFromModal() {
    const form = document.querySelector("[data-dispo-newride-form]");
    if (!form) return;

    const payload = Object.fromEntries(new FormData(form).entries());
    if (!payload.customer || !payload.phone || !payload.pickup || !payload.destination || !payload.date || !payload.time) {
      setFeedback("Bitte alle Pflichtfelder ausfüllen.", "error");
      return;
    }

    const editOrderId = String(payload.editOrderId || "").trim();
    const editingOrder = editOrderId ? getOrderById(editOrderId) : null;

    const order = {
      id: editingOrder ? editingOrder.id : "",
      customer: payload.customer,
      phone: payload.phone,
      pickup: payload.pickup,
      destination: payload.destination,
      date: payload.date,
      time: payload.time,
      rideType: payload.rideType || "Taxi",
      persons: Number(payload.persons || 1),
      luggage: payload.luggage || "",
      wheelchair: payload.wheelchair === "Ja",
      companion: payload.companion === "Ja",
      insurance: payload.insurance || "-",
      transportVoucher: payload.transportVoucher || "-",
      approval: payload.approval || "Offen",
      returnTrip: payload.returnTrip === "Ja",
      returnTime: payload.returnTime || "",
      vehicleWish: payload.vehicleWish || "",
      priority: payload.priority || "Mittel",
      status: "Neu",
      driverId: "",
      vehicleId: "",
      notes: payload.notes || "",
      pricing: "Demo-Abrechnung offen",
      billingType: "Offen",
      createdAt: editingOrder ? editingOrder.createdAt : nowTime(),
      updatedAt: nowTime(),
      pickupCoord: editingOrder ? editingOrder.pickupCoord : { x: 32 + Math.round(Math.random() * 35), y: 35 + Math.round(Math.random() * 35) },
      destinationCoord: editingOrder ? editingOrder.destinationCoord : { x: 36 + Math.round(Math.random() * 42), y: 20 + Math.round(Math.random() * 42) },
      forcedRisk: false
    };

    if (editingOrder) {
      Object.assign(editingOrder, order, {
        status: editingOrder.status,
        driverId: editingOrder.driverId,
        vehicleId: editingOrder.vehicleId,
        forcedRisk: editingOrder.forcedRisk
      });

      addEvent("Aufträge", `Auftrag ${editingOrder.id} wurde bearbeitet.`, "order", editingOrder.id);
      addNotification("Niedrig", "Auftrag aktualisiert", `${editingOrder.id} wurde geändert.`, "order", editingOrder.id);
      setFeedback(`Auftrag ${editingOrder.id} wurde aktualisiert.`, "success");
    } else {
      state.data.sequence.order += 1;
      order.id = `TG-${state.data.sequence.order}`;
      state.data.orders.unshift(order);
      addEvent("Aufträge", `Neue Demo-Fahrt ${order.id} erstellt.`, "order", order.id);
      addNotification("Hoch", "Neuer Auftrag", `${order.id} wartet auf Zuweisung.`, "order", order.id);
      setFeedback(`Neue Fahrt ${order.id} wurde erstellt.`, "success");
    }

    saveData();
    rerender();
    closeModal();
  }

  function duplicateOrder(orderId) {
    const source = getOrderById(orderId);
    if (!source) return;

    state.data.sequence.order += 1;
    const copy = deepClone(source);
    copy.id = `TG-${state.data.sequence.order}`;
    copy.status = "Neu";
    copy.driverId = "";
    copy.vehicleId = "";
    copy.createdAt = nowTime();
    copy.updatedAt = nowTime();
    copy.forcedRisk = false;

    state.data.orders.unshift(copy);
    addEvent("Aufträge", `Auftrag ${orderId} wurde als ${copy.id} dupliziert.`, "order", copy.id);
    addNotification("Mittel", "Auftrag dupliziert", `${copy.id} wurde aus ${orderId} erstellt.`, "order", copy.id);

    saveData();
    rerender();
    closeModal();
    setFeedback(`Auftrag ${copy.id} wurde dupliziert.`, "success");
  }

  function cancelOrder(orderId) {
    if (!window.confirm("Auftrag wirklich stornieren?")) return;
    changeOrderStatus(orderId, "Storniert");
    closeModal();
  }

  function vehicleStatusAction(vehicleId, action) {
    const vehicle = getVehicleById(vehicleId);
    if (!vehicle) return;

    const actions = {
      lockVehicle: { status: "Gesperrt", message: `${vehicle.plate} wurde gesperrt.` },
      unlockVehicle: { status: "Frei", message: `${vehicle.plate} wurde freigegeben.` },
      pauseVehicle: { status: "Pause", message: `${vehicle.plate} wurde auf Pause gesetzt.` },
      workshopVehicle: { status: "Werkstatt", message: `${vehicle.plate} wurde zur Werkstatt gemeldet.` }
    };

    const next = actions[action];
    if (!next) return;

    if (action === "lockVehicle" && !window.confirm(`Fahrzeug ${vehicle.plate} wirklich sperren?`)) return;

    vehicle.status = next.status;
    vehicle.markerType = next.status;
    vehicle.lastUpdate = nowTime();

    addEvent("Fahrzeuge", next.message, "vehicle", vehicle.id);
    addNotification("Mittel", "Fahrzeugstatus geändert", next.message, "vehicle", vehicle.id);

    saveData();
    rerender();
    setFeedback(next.message, "success");
  }

  function focusMapOnSelection(target) {
    state.ui.mapFocus = target;
    const order = getOrderById(state.ui.selectedOrderId);
    const vehicle = getVehicleById(state.ui.selectedVehicleId) || (order ? getVehicleById(order.vehicleId) : null);

    if (target === "vehicle" && vehicle) {
      setFeedback(`Karte fokussiert auf ${vehicle.plate}.`, "success");
      return;
    }

    if (target === "pickup" && order) {
      setFeedback(`Karte fokussiert auf Abholung ${order.pickup}.`, "success");
      return;
    }

    if (target === "destination" && order) {
      setFeedback(`Karte fokussiert auf Ziel ${order.destination}.`, "success");
      return;
    }

    setFeedback("Bitte zuerst Auftrag oder Fahrzeug auswählen.", "error");
  }

  function handleOrderAssign(orderId, vehicleId, source = "modal") {
    const order = getOrderById(orderId);
    const vehicle = getVehicleById(vehicleId);
    if (!order || !vehicle) return;

    const conflicts = detectConflicts(order, vehicle);
    if (conflicts.length) {
      openConflictModal(order.id, vehicle.id, conflicts, source === "modal" ? "assign" : "drag");
      return;
    }

    assignOrder(order.id, vehicle.id, { forcedRisk: false });
    closeModal();
  }

  function markNotificationRead(id) {
    const item = state.data.notifications.find((entry) => entry.id === id);
    if (!item) return;
    item.read = true;
    saveData();
    renderNotifications();
  }

  function openNotification(id) {
    const item = state.data.notifications.find((entry) => entry.id === id);
    if (!item) return;

    item.read = true;

    if (item.refType === "order" && item.refId) {
      state.ui.selectedOrderId = item.refId;
      openOrderDetails(item.refId);
    } else if (item.refType === "vehicle" && item.refId) {
      state.ui.selectedVehicleId = item.refId;
      openVehicleDetails(item.refId);
    } else {
      setFeedback(item.text, "success");
    }

    saveData();
    renderNotifications();
  }

  function toggleNotificationPanel(forceOpen) {
    const panel = document.querySelector("[data-dispo-notify-panel]");
    const trigger = document.querySelector("[data-dispo-notify-toggle]");
    if (!panel || !trigger) return;

    const open = typeof forceOpen === "boolean" ? forceOpen : panel.hidden;
    panel.hidden = !open;
    trigger.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function setTabletPanel(panelName) {
    state.ui.tabletPanel = state.ui.tabletPanel === panelName ? "" : panelName;
    document.body.classList.toggle("dispo-tablet-orders-open", state.ui.tabletPanel === "orders");
    document.body.classList.toggle("dispo-tablet-fleet-open", state.ui.tabletPanel === "fleet");
  }

  function setMobileTab(tabName) {
    state.ui.mobileTab = tabName;

    document.querySelectorAll("[data-dispo-mobile-tab]").forEach((button) => {
      const current = button.getAttribute("data-dispo-mobile-tab") || "orders";
      button.classList.toggle("is-active", current === tabName);
    });

    document.querySelectorAll("[data-dispo-pane]").forEach((pane) => {
      const key = pane.getAttribute("data-dispo-pane") || "orders";
      pane.classList.toggle("is-mobile-visible", key === tabName);
    });
  }

  function rerender() {
    renderKpis();
    renderOrders();
    renderFleet();
    renderMap();
    renderEvents();
    renderNotifications();
    saveData();
  }

  function bindFilterControls() {
    document.querySelectorAll("[data-dispo-tab]").forEach((button) => {
      button.addEventListener("click", () => {
        state.ui.activeTab = button.getAttribute("data-dispo-tab") || "Neu";
        document.querySelectorAll("[data-dispo-tab]").forEach((tab) => {
          const active = tab === button;
          tab.classList.toggle("is-active", active);
          tab.setAttribute("aria-selected", active ? "true" : "false");
        });
        renderOrders();
      });
    });

    const searchInput = document.querySelector("[data-dispo-search]");
    const priorityFilter = document.querySelector('[data-dispo-filter="priority"]');
    const rideTypeFilter = document.querySelector('[data-dispo-filter="rideType"]');
    const sortFilter = document.querySelector("[data-dispo-sort]");

    if (searchInput) {
      searchInput.addEventListener("input", () => {
        state.ui.searchTerm = searchInput.value || "";
        renderOrders();
      });
    }

    if (priorityFilter) {
      priorityFilter.addEventListener("change", () => {
        state.ui.priorityFilter = priorityFilter.value || "Alle";
        renderOrders();
      });
    }

    if (rideTypeFilter) {
      rideTypeFilter.addEventListener("change", () => {
        state.ui.rideTypeFilter = rideTypeFilter.value || "Alle";
        renderOrders();
      });
    }

    if (sortFilter) {
      sortFilter.addEventListener("change", () => {
        state.ui.sortKey = sortFilter.value || "timeAsc";
        renderOrders();
      });
    }
  }

  function bindOrderInteractions() {
    document.addEventListener("dragstart", (event) => {
      const card = event.target.closest("[data-dispo-order-id]");
      if (!card || !event.dataTransfer) return;

      const orderId = card.getAttribute("data-dispo-order-id") || "";
      state.ui.dragOrderId = orderId;
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", orderId);
      card.classList.add("is-dragging");
    });

    document.addEventListener("dragend", (event) => {
      const card = event.target.closest("[data-dispo-order-id]");
      if (card) card.classList.remove("is-dragging");
      state.ui.dragOrderId = "";
    });

    document.addEventListener("dragover", (event) => {
      const target = event.target.closest("[data-dispo-vehicle-id]");
      if (!target) return;
      event.preventDefault();
      target.classList.add("is-drop-target");
    });

    document.addEventListener("dragleave", (event) => {
      const target = event.target.closest("[data-dispo-vehicle-id]");
      if (!target) return;
      target.classList.remove("is-drop-target");
    });

    document.addEventListener("drop", (event) => {
      const target = event.target.closest("[data-dispo-vehicle-id]");
      if (!target) return;

      event.preventDefault();
      target.classList.remove("is-drop-target");

      const vehicleId = target.getAttribute("data-dispo-vehicle-id") || "";
      const orderId = state.ui.dragOrderId || (event.dataTransfer ? event.dataTransfer.getData("text/plain") : "");
      if (!orderId || !vehicleId) return;

      handleOrderAssign(orderId, vehicleId, "drag");
    });

    document.addEventListener("click", (event) => {
      const orderAction = event.target.closest("[data-dispo-order-action]");
      if (orderAction) {
        const action = orderAction.getAttribute("data-dispo-order-action") || "";
        const orderId = orderAction.getAttribute("data-dispo-order-id") || "";

        if (action === "details") {
          state.ui.selectedOrderId = orderId;
          openOrderDetails(orderId);
          rerender();
          return;
        }

        if (action === "assign") {
          openAssignModal(orderId);
          return;
        }

        if (action === "status") {
          openStatusModal(orderId);
          return;
        }

        if (action === "contact") {
          const order = getOrderById(orderId);
          if (order) {
            openDriverContactModal(order.driverId, order.id);
          }
          return;
        }
      }

      const orderCard = event.target.closest("[data-dispo-order-id]");
      if (orderCard && !event.target.closest("button")) {
        const orderId = orderCard.getAttribute("data-dispo-order-id") || "";
        state.ui.selectedOrderId = orderId;
        openOrderDetails(orderId);
        rerender();
      }
    });
  }

  function bindFleetAndMapInteractions() {
    document.addEventListener("click", (event) => {
      const vehicleAction = event.target.closest("[data-dispo-vehicle-action]");
      if (vehicleAction) {
        const action = vehicleAction.getAttribute("data-dispo-vehicle-action") || "";
        const vehicleId = vehicleAction.getAttribute("data-dispo-vehicle-id") || "";

        if (action === "details") {
          state.ui.selectedVehicleId = vehicleId;
          openVehicleDetails(vehicleId);
          rerender();
          return;
        }

        if (action === "assign") {
          const firstOpenOrder = state.data.orders.find((entry) => ["Neu", "Bestätigt", "Wartet", "Problem"].includes(entry.status));
          if (!firstOpenOrder) {
            setFeedback("Kein passender Auftrag für Zuweisung gefunden.", "error");
            return;
          }
          openAssignModal(firstOpenOrder.id, vehicleId);
          return;
        }
      }

      const fleetCard = event.target.closest("[data-dispo-vehicle-id]");
      if (fleetCard && !event.target.closest("button")) {
        const vehicleId = fleetCard.getAttribute("data-dispo-vehicle-id") || "";
        state.ui.selectedVehicleId = vehicleId;
        openVehicleDetails(vehicleId);
        rerender();
      }

      const mapMarker = event.target.closest("[data-dispo-map-vehicle]");
      if (mapMarker) {
        const vehicleId = mapMarker.getAttribute("data-dispo-map-vehicle") || "";
        state.ui.selectedVehicleId = vehicleId;
        openVehicleDetails(vehicleId);
        rerender();
      }

      const mapFocus = event.target.closest("[data-dispo-map-focus]");
      if (mapFocus) {
        const target = mapFocus.getAttribute("data-dispo-map-focus") || "vehicle";
        focusMapOnSelection(target);
      }
    });
  }

  function bindModalActions() {
    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-dispo-modal-close]")) {
        closeModal();
        return;
      }

      const action = event.target.closest("[data-dispo-modal-action]");
      if (!action) return;

      const name = action.getAttribute("data-dispo-modal-action") || "";
      const orderId = action.getAttribute("data-dispo-order-id") || "";
      const vehicleId = action.getAttribute("data-dispo-vehicle-id") || "";
      const driverId = action.getAttribute("data-dispo-driver-id") || "";

      if (name === "assignVehicle") {
        handleOrderAssign(orderId, vehicleId, "modal");
        return;
      }

      if (name === "forceAssign") {
        assignOrder(orderId, vehicleId, { forcedRisk: true });
        closeModal();
        return;
      }

      if (name === "otherVehicle") {
        openAssignModal(orderId);
        return;
      }

      if (name === "saveStatus") {
        const select = document.querySelector("[data-dispo-status-select]");
        if (!select) return;
        changeOrderStatus(orderId, select.value || "Neu");
        closeModal();
        return;
      }

      if (name === "editOrder") {
        const order = getOrderById(orderId);
        if (!order) return;
        openNewRideModal(order, order.id);
        return;
      }

      if (name === "saveNewRide") {
        saveNewRideFromModal();
        return;
      }

      if (name === "cancel") {
        closeModal();
        return;
      }

      if (name === "assignOrder") {
        openAssignModal(orderId);
        return;
      }

      if (name === "changeStatus") {
        openStatusModal(orderId);
        return;
      }

      if (name === "callCustomer") {
        const order = getOrderById(orderId);
        if (!order) return;
        addEvent("Aufträge", `Demo-Anruf an Kunde ${order.customer} (${order.phone}).`, "order", order.id);
        setFeedback(`Kundenkontakt für ${order.id} gestartet (Demo).`, "success");
        rerender();
        closeModal();
        return;
      }

      if (name === "contactDriver") {
        const order = getOrderById(orderId);
        if (!order) return;
        openDriverContactModal(order.driverId, order.id);
        return;
      }

      if (name === "duplicateOrder") {
        duplicateOrder(orderId);
        return;
      }

      if (name === "cancelOrder") {
        cancelOrder(orderId);
        return;
      }

      if (name === "contactDriverByVehicle") {
        const vehicle = getVehicleById(vehicleId);
        if (!vehicle) return;
        openDriverContactModal(vehicle.driverId, vehicle.currentOrderId);
        return;
      }

      if (name === "assignFromVehicle") {
        const firstOpenOrder = state.data.orders.find((entry) => ["Neu", "Bestätigt", "Wartet", "Problem"].includes(entry.status));
        if (!firstOpenOrder) {
          setFeedback("Kein offener Auftrag für Zuweisung vorhanden.", "error");
          return;
        }
        openAssignModal(firstOpenOrder.id, vehicleId);
        return;
      }

      if (["lockVehicle", "unlockVehicle", "pauseVehicle", "workshopVehicle"].includes(name)) {
        vehicleStatusAction(vehicleId, name);
        closeModal();
        return;
      }

      if (name === "focusVehicle") {
        state.ui.selectedVehicleId = vehicleId;
        focusMapOnSelection("vehicle");
        closeModal();
        rerender();
        return;
      }

      if (name === "callDriver") {
        const driver = getDriverById(driverId);
        if (!driver) return;
        addEvent("Fahrer", `Demo-Anruf an ${driver.name}.`, "driver", driver.id);
        setFeedback(`Anruf an ${driver.name} gestartet (Demo).`, "success");
        closeModal();
        rerender();
        return;
      }

      if (name === "sendDriverMessage") {
        const driver = getDriverById(driverId);
        const template = document.querySelector("[data-dispo-contact-template]");
        if (!driver || !template) return;
        addEvent("Fahrer", `Nachricht an ${driver.name}: "${template.value}"`, "driver", driver.id);
        addNotification("Niedrig", "Nachricht gesendet", `${driver.name}: ${template.value}`, "driver", driver.id);
        setFeedback(`Nachricht an ${driver.name} gesendet.`, "success");
        closeModal();
        rerender();
        return;
      }

      if (name === "requestCallback") {
        const driver = getDriverById(driverId);
        if (!driver) return;
        addEvent("Fahrer", `Rückruf bei ${driver.name} angefordert.`, "driver", driver.id);
        setFeedback(`Rückruf bei ${driver.name} angefordert.`, "success");
        closeModal();
        rerender();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      const modal = document.querySelector("[data-dispo-modal]");
      if (!modal || modal.hidden) return;
      closeModal();
    });
  }

  function bindTopbarActions() {
    document.addEventListener("click", (event) => {
      const quickAction = event.target.closest("[data-dispo-quick-action]");
      if (quickAction) {
        const action = quickAction.getAttribute("data-dispo-quick-action") || "";

        if (action === "newRide") {
          openNewRideModal();
          return;
        }

        if (action === "contactDriver") {
          openDriverContactModal();
          return;
        }

        if (action === "lockVehicle") {
          if (!state.ui.selectedVehicleId) {
            setFeedback("Bitte zuerst ein Fahrzeug auswählen.", "error");
            return;
          }
          vehicleStatusAction(state.ui.selectedVehicleId, "lockVehicle");
          return;
        }

        if (action === "unlockVehicle") {
          if (!state.ui.selectedVehicleId) {
            setFeedback("Bitte zuerst ein Fahrzeug auswählen.", "error");
            return;
          }
          vehicleStatusAction(state.ui.selectedVehicleId, "unlockVehicle");
          return;
        }

        if (action === "openPlan") {
          addEvent("System", "Einsatzplan als Demo geöffnet.", "system", "");
          setFeedback("Einsatzplan geöffnet (Demo).", "success");
          rerender();
          return;
        }
      }

      const resetDemo = event.target.closest("[data-dispo-reset-demo]");
      if (resetDemo) {
        if (!window.confirm("Demo-Zustand wirklich zurücksetzen? Alle interaktiven Änderungen gehen verloren.")) {
          return;
        }

        state.data = deepClone(defaultData);
        state.ui.selectedOrderId = "";
        state.ui.selectedVehicleId = "";
        saveData();
        rerender();
        setFeedback("Demo-Zustand wurde zurückgesetzt.", "success");
      }
    });
  }

  function bindNotificationCenter() {
    document.addEventListener("click", (event) => {
      const toggle = event.target.closest("[data-dispo-notify-toggle]");
      if (toggle) {
        const panel = document.querySelector("[data-dispo-notify-panel]");
        if (!panel) return;
        toggleNotificationPanel(panel.hidden);
        return;
      }

      const filter = event.target.closest("[data-dispo-notify-filter]");
      if (filter) {
        state.ui.notifyFilter = filter.getAttribute("data-dispo-notify-filter") || "Alle";
        document.querySelectorAll("[data-dispo-notify-filter]").forEach((entry) => {
          entry.classList.toggle("is-active", entry === filter);
        });
        renderNotifications();
        return;
      }

      const readAll = event.target.closest("[data-dispo-notify-read-all]");
      if (readAll) {
        state.data.notifications.forEach((item) => {
          item.read = true;
        });
        saveData();
        renderNotifications();
        setFeedback("Alle Benachrichtigungen als gelesen markiert.", "success");
        return;
      }

      const action = event.target.closest("[data-dispo-notify-action]");
      if (action) {
        const name = action.getAttribute("data-dispo-notify-action") || "";
        const id = action.getAttribute("data-dispo-notify-id") || "";

        if (name === "read") {
          markNotificationRead(id);
          return;
        }

        if (name === "open") {
          openNotification(id);
          return;
        }
      }

      const panel = document.querySelector("[data-dispo-notify-panel]");
      if (!panel || panel.hidden) return;

      const inPanel = event.target.closest("[data-dispo-notify-panel]");
      const inTrigger = event.target.closest("[data-dispo-notify-toggle]");
      if (!inPanel && !inTrigger) {
        toggleNotificationPanel(false);
      }
    });
  }

  function bindEventFilters() {
    document.querySelectorAll("[data-dispo-event-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        state.ui.eventFilter = button.getAttribute("data-dispo-event-filter") || "Alle";
        document.querySelectorAll("[data-dispo-event-filter]").forEach((entry) => {
          entry.classList.toggle("is-active", entry === button);
        });
        renderEvents();
      });
    });
  }

  function bindResponsiveControls() {
    document.querySelectorAll("[data-dispo-mobile-tab]").forEach((button) => {
      button.addEventListener("click", () => {
        const tab = button.getAttribute("data-dispo-mobile-tab") || "orders";
        setMobileTab(tab);
      });
    });

    document.querySelectorAll("[data-dispo-tablet-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        const panel = button.getAttribute("data-dispo-tablet-toggle") || "";
        if (panel) setTabletPanel(panel);
      });
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 1200) {
        state.ui.tabletPanel = "";
        document.body.classList.remove("dispo-tablet-orders-open", "dispo-tablet-fleet-open");
      }
    });
  }

  function runSimulation() {
    if (simulationTimer) {
      window.clearInterval(simulationTimer);
    }

    simulationTimer = window.setInterval(() => {
      const openOrders = state.data.orders.filter((order) => !isOrderCompleted(order.status));
      if (!openOrders.length) return;

      const randomOrder = openOrders[Math.floor(Math.random() * openOrders.length)];

      if (randomOrder.status === "Neu") {
        randomOrder.status = "Bestätigt";
        randomOrder.updatedAt = nowTime();
        addEvent("System", `${randomOrder.id} wurde automatisch bestätigt (Demo-Simulation).`, "order", randomOrder.id);
      } else if (randomOrder.status === "Bestätigt" && randomOrder.vehicleId) {
        randomOrder.status = "Fahrer unterwegs";
        randomOrder.updatedAt = nowTime();
        addEvent("Aufträge", `${randomOrder.id} ist jetzt unterwegs.`, "order", randomOrder.id);
      } else if (randomOrder.status === "Fahrt läuft") {
        randomOrder.status = "Ziel erreicht";
        randomOrder.updatedAt = nowTime();
        addEvent("Aufträge", `${randomOrder.id} hat Ziel erreicht.`, "order", randomOrder.id);
      }

      updateVehicleLinks();
      rerender();
    }, 18000);
  }

  function initialize() {
    importSharedInboxOrders();
    updateVehicleLinks();
    bindFilterControls();
    bindOrderInteractions();
    bindFleetAndMapInteractions();
    bindModalActions();
    bindTopbarActions();
    bindNotificationCenter();
    bindEventFilters();
    bindResponsiveControls();

    rerender();
    setMobileTab("orders");
    runSimulation();
  }

  document.addEventListener("DOMContentLoaded", initialize);
})();
