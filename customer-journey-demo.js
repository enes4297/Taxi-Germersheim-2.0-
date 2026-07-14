(function () {
  const rideStatusOrder = [
    "Bestaetigt",
    "Fahrer zugewiesen",
    "Unterwegs",
    "Angekommen",
    "Abgeschlossen",
    "Storniert"
  ];

  const rides = [
    {
      id: "TG-260710-001",
      section: "kommend",
      date: "2026-07-14",
      time: "08:30",
      pickup: "Friedrich-Ebert-Strasse 8, Germersheim",
      destination: "Bahnhof Germersheim",
      type: "Taxi",
      status: "Bestaetigt",
      driver: "M. Becker",
      vehicle: "Mercedes-Benz E 220 d T-Modell",
      plate: "GER TX 100",
      price: "18,40 EUR",
      payment: "Karte",
      demoServiceTag: "Serienfahrt",
      note: "Abholung vorne am Haupteingang.",
      statusTimeline: ["Bestaetigt"]
    },
    {
      id: "TG-260710-002",
      section: "kommend",
      date: "2026-07-15",
      time: "12:10",
      pickup: "Industriestrasse 12, Germersheim",
      destination: "Flughafen Frankfurt Terminal 1",
      type: "Flughafenfahrt",
      status: "Fahrer zugewiesen",
      driver: "S. Keller",
      vehicle: "Mercedes-Benz V-Klasse",
      plate: "GER TX 800",
      price: "132,00 EUR",
      payment: "Rechnung",
      demoServiceTag: "Flughafen",
      note: "Bitte 10 Min. vor Abfahrt bereit sein.",
      statusTimeline: ["Bestaetigt", "Fahrer zugewiesen"]
    },
    {
      id: "TG-260710-003",
      section: "kommend",
      date: "2026-07-16",
      time: "09:45",
      pickup: "Asklepios Südpfalzklinik",
      destination: "Dialysezentrum Speyer",
      type: "Krankenfahrt",
      status: "Unterwegs",
      driver: "T. Wagner",
      vehicle: "VW Touran",
      plate: "GER TX 200",
      price: "74,50 EUR",
      payment: "Krankenkasse",
      demoServiceTag: "Krankenfahrt",
      note: "Verordnung liegt als Demo vor.",
      statusTimeline: ["Bestaetigt", "Fahrer zugewiesen", "Unterwegs"]
    },
    {
      id: "TG-260710-004",
      section: "kommend",
      date: "2026-07-17",
      time: "17:20",
      pickup: "Luitpoldplatz 3, Germersheim",
      destination: "Innenstadt Landau",
      type: "Grossraumtaxi",
      status: "Angekommen",
      driver: "A. Ritter",
      vehicle: "VW Touran",
      plate: "GER TX 300",
      price: "49,90 EUR",
      payment: "Bar",
      note: "6 Personen, wenig Gepaeck.",
      statusTimeline: ["Bestaetigt", "Fahrer zugewiesen", "Unterwegs", "Angekommen"]
    },
    {
      id: "TG-260710-005",
      section: "kommend",
      date: "2026-07-18",
      time: "10:00",
      pickup: "Rheinallee 2, Germersheim",
      destination: "Klinikum Karlsruhe",
      type: "Rollstuhlfahrt",
      status: "Bestaetigt",
      driver: "J. Neumann",
      vehicle: "Mercedes-Benz V-Klasse",
      plate: "GER TX 800",
      price: "96,00 EUR",
      payment: "Krankenkasse",
      demoServiceTag: "Rollstuhlfahrt",
      note: "Rampe und Sicherung vorbereitet.",
      statusTimeline: ["Bestaetigt"]
    },
    {
      id: "TG-260710-006",
      section: "vergangen",
      date: "2026-07-08",
      time: "07:50",
      pickup: "Sondernheim Bahnhof",
      destination: "Mannheim Hauptbahnhof",
      type: "Taxi",
      status: "Abgeschlossen",
      driver: "L. Hartmann",
      vehicle: "Mercedes-Benz E-Klasse",
      plate: "GER TX 600",
      price: "86,30 EUR",
      payment: "Karte",
      voucherStatus: "Gutschein verwendet",
      voucherCode: "TG5-SOMMER",
      note: "Fahrt puenktlich abgeschlossen.",
      statusTimeline: ["Bestaetigt", "Fahrer zugewiesen", "Unterwegs", "Angekommen", "Abgeschlossen"]
    },
    {
      id: "TG-260710-007",
      section: "vergangen",
      date: "2026-07-06",
      time: "14:30",
      pickup: "Heidelberg Altstadt",
      destination: "Germersheim Zentrum",
      type: "Grossraumtaxi",
      status: "Abgeschlossen",
      driver: "P. Braun",
      vehicle: "VW Touran",
      plate: "GER TX 400",
      price: "119,00 EUR",
      payment: "Rechnung",
      demoServiceTag: "Firmenfahrt",
      voucherStatus: "Kein Gutschein",
      voucherCode: "-",
      note: "Rueckfahrt aus Gruppenfahrt.",
      statusTimeline: ["Bestaetigt", "Fahrer zugewiesen", "Unterwegs", "Angekommen", "Abgeschlossen"]
    },
    {
      id: "TG-260710-008",
      section: "vergangen",
      date: "2026-07-03",
      time: "11:15",
      pickup: "Asklepios Südpfalzklinik",
      destination: "Reha-Zentrum Speyer",
      type: "Krankenfahrt",
      status: "Abgeschlossen",
      driver: "R. Schuster",
      vehicle: "Mercedes-Benz B-Klasse",
      plate: "GER TX 500",
      price: "58,20 EUR",
      payment: "Krankenkasse",
      voucherStatus: "Nicht berechtigt",
      voucherCode: "-",
      note: "Begleitperson war dabei.",
      statusTimeline: ["Bestaetigt", "Fahrer zugewiesen", "Unterwegs", "Angekommen", "Abgeschlossen"]
    },
    {
      id: "TG-260710-009",
      section: "vergangen",
      date: "2026-07-01",
      time: "05:40",
      pickup: "Germersheim Innenstadt",
      destination: "Flughafen Karlsruhe/Baden-Baden",
      type: "Flughafenfahrt",
      status: "Abgeschlossen",
      driver: "D. Vogel",
      vehicle: "Tesla Model Y",
      plate: "GER TX 700",
      price: "98,90 EUR",
      payment: "Karte",
      voucherStatus: "Gutschein verwendet",
      voucherCode: "TG10-FLY",
      note: "Fruehe Abfahrt, keine Wartezeit.",
      statusTimeline: ["Bestaetigt", "Fahrer zugewiesen", "Unterwegs", "Angekommen", "Abgeschlossen"]
    },
    {
      id: "TG-260710-010",
      section: "storniert",
      date: "2026-06-29",
      time: "16:10",
      pickup: "Lingenfeld Ortsmitte",
      destination: "Landau Zentrum",
      type: "Taxi",
      status: "Storniert",
      driver: "Nicht zugewiesen",
      vehicle: "Nicht zugewiesen",
      plate: "-",
      price: "0,00 EUR",
      payment: "-",
      note: "Vom Kunden im Demo storniert.",
      statusTimeline: ["Bestaetigt", "Storniert"]
    },
    {
      id: "TG-260710-011",
      section: "storniert",
      date: "2026-06-28",
      time: "09:00",
      pickup: "Germersheim Rathaus",
      destination: "Speyer Innenstadt",
      type: "Rollstuhlfahrt",
      status: "Storniert",
      driver: "Nicht zugewiesen",
      vehicle: "Nicht zugewiesen",
      plate: "-",
      price: "0,00 EUR",
      payment: "-",
      note: "Termin wurde verschoben.",
      statusTimeline: ["Bestaetigt", "Storniert"]
    },
    {
      id: "TG-260710-012",
      section: "storniert",
      date: "2026-06-27",
      time: "13:35",
      pickup: "Bellheim Zentrum",
      destination: "Flughafen Frankfurt Terminal 2",
      type: "Flughafenfahrt",
      status: "Storniert",
      driver: "Nicht zugewiesen",
      vehicle: "Nicht zugewiesen",
      plate: "-",
      price: "0,00 EUR",
      payment: "-",
      note: "Daten als Demo erhalten.",
      statusTimeline: ["Bestaetigt", "Storniert"]
    }
  ];

  const customerNotifications = [
    { id: "cn-1", title: "Buchung bestaetigt", text: "Ihre Fahrt TG-260710-001 wurde bestaetigt.", type: "check", time: "vor 1 Std." },
    { id: "cn-2", title: "Fahrer wurde zugewiesen", text: "Fuer TG-260710-002 wurde S. Keller zugewiesen.", type: "profile", time: "vor 55 Min." },
    { id: "cn-3", title: "Fahrer ist unterwegs", text: "TG-260710-003: Fahrer ist auf dem Weg zu Ihnen.", type: "route", time: "vor 31 Min." },
    { id: "cn-4", title: "Fahrzeug ist angekommen", text: "TG-260710-004 wartet am Abholpunkt.", type: "location", time: "vor 12 Min." },
    { id: "cn-5", title: "Fahrt abgeschlossen", text: "TG-260710-006 wurde erfolgreich abgeschlossen.", type: "check", time: "gestern" },
    { id: "cn-6", title: "Rewards-Punkte erhalten", text: "+25 Punkte wurden auf Ihr Konto gebucht.", type: "rewards", time: "gestern" },
    { id: "cn-7", title: "Gutschein verfuegbar", text: "Ein 5 EUR Gutschein ist als Demo verfuegbar.", type: "voucher", time: "vor 2 Tagen" }
  ];

  const liveRideStorageKey = "taxiCustomerDemoLiveRideState";

  const liveRideStatusFlow = [
    { key: "booking_confirmed", title: "Buchung bestaetigt", icon: "assets/icons/Check%20Mark.svg", time: "10:18" },
    { key: "driver_search", title: "Fahrer wird gesucht", icon: "assets/icons/Clock.svg", time: "10:19" },
    { key: "driver_assigned", title: "Fahrer zugewiesen", icon: "assets/icons/Profile.svg", time: "10:21" },
    { key: "driver_on_the_way", title: "Fahrer ist unterwegs", icon: "assets/icons/Route.svg", time: "10:24" },
    { key: "vehicle_arrived", title: "Fahrzeug angekommen", icon: "assets/icons/Location.svg", time: "10:32" },
    { key: "ride_started", title: "Fahrt laeuft", icon: "assets/icons/Taxi.svg", time: "10:36" },
    { key: "ride_completed", title: "Fahrt abgeschlossen", icon: "assets/icons/Check%20Mark.svg", time: "10:58" }
  ];

  const liveRideVehicles = [
    { id: "veh-100", plate: "GER TX 100", model: "Mercedes-Benz E 220 d T-Modell", type: "Taxi", seats: 4, color: "Obsidianschwarz", category: "Taxi", icon: "assets/icons/Taxi.svg" },
    { id: "veh-200", plate: "GER TX 200", model: "VW Touran", type: "Kompaktvan", seats: 5, color: "Silber", category: "Taxi", icon: "assets/icons/Van.svg" },
    { id: "veh-300", plate: "GER TX 300", model: "VW Touran", type: "Kompaktvan", seats: 7, color: "Dunkelblau", category: "Grossraum", icon: "assets/icons/Van.svg" },
    { id: "veh-400", plate: "GER TX 400", model: "VW Touran", type: "Kompaktvan", seats: 5, color: "Perlmuttweiss", category: "Taxi", icon: "assets/icons/Van.svg" },
    { id: "veh-500", plate: "GER TX 500", model: "Mercedes-Benz B-Klasse", type: "Kompaktklasse", seats: 4, color: "Graphitgrau", category: "Taxi", icon: "assets/icons/Taxi.svg" },
    { id: "veh-600", plate: "GER TX 600", model: "Mercedes-Benz E-Klasse", type: "Business Limousine", seats: 4, color: "Mitternachtsblau", category: "Taxi", icon: "assets/icons/Taxi.svg" },
    { id: "veh-700", plate: "GER TX 700", model: "Tesla Model Y", type: "Elektro SUV", seats: 5, color: "Pearl White", category: "Elektro", icon: "assets/icons/Taxi.svg" },
    { id: "veh-800", plate: "GER TX 800", model: "Mercedes-Benz V-Klasse", type: "Premium Van", seats: 7, color: "Selenitgrau", category: "Grossraum", icon: "assets/icons/Van.svg" }
  ];

  const demoDriver = {
    name: "Murat Demir",
    image: "assets/icons/Profile.svg",
    rating: 4.9,
    rides: 1842,
    languages: ["Deutsch", "Englisch", "Tuerkisch"],
    note: "Ihr Fahrer von Taxi Germersheim"
  };

  const typeIconPath = {
    Taxi: "assets/icons/Taxi.svg",
    Grossraumtaxi: "assets/icons/Van.svg",
    Rollstuhlfahrt: "assets/icons/Wheelchair%20Vehicle.svg",
    Krankenfahrt: "assets/icons/Route.svg",
    Flughafenfahrt: "assets/icons/Route.svg"
  };

  const notificationIconPath = {
    check: "assets/icons/Check%20Mark.svg",
    profile: "assets/icons/Profile.svg",
    route: "assets/icons/Route.svg",
    location: "assets/icons/Location.svg",
    rewards: "assets/icons/Rewards.svg",
    voucher: "assets/icons/Gift%20Voucher.svg"
  };

  const walletSummary = {
    balance: "42,50 EUR",
    lastTopup: "10,00 EUR am 08.07.2026",
    lastUse: "5,00 EUR fuer TG-260710-006",
    info: "Demo-Guthaben - keine echte Zahlung oder Speicherung"
  };

  const coupons = [
    {
      id: "cp-1",
      title: "5 EUR Rabatt",
      value: "5 EUR",
      validUntil: "31.07.2026",
      status: "Aktiv",
      conditions: "Gueltig ab 25 EUR Fahrtwert."
    },
    {
      id: "cp-2",
      title: "10 EUR Rabatt",
      value: "10 EUR",
      validUntil: "18.07.2026",
      status: "Bald ablaufend",
      conditions: "Nur fuer Flughafenfahrten, einmalig einloesbar."
    },
    {
      id: "cp-3",
      title: "20 EUR Gutschein",
      value: "20 EUR",
      validUntil: "05.07.2026",
      status: "Abgelaufen",
      conditions: "Nicht mit anderen Aktionen kombinierbar."
    },
    {
      id: "cp-4",
      title: "Geburtstagsbonus",
      value: "15 EUR",
      validUntil: "30.07.2026",
      status: "Aktiv",
      conditions: "Einmal im Geburtstagsmonat nutzbar."
    },
    {
      id: "cp-5",
      title: "Yumaks Ueberraschungsbox",
      value: "Mystery Reward",
      validUntil: "22.07.2026",
      status: "Eingeloest",
      conditions: "Demo-Special fuer App-Aktivitaet."
    }
  ];

  const paymentMethods = [
    {
      id: "pm-1",
      name: "Barzahlung",
      type: "Vor Ort",
      isDefault: true,
      note: "Direkt im Fahrzeug zahlbar."
    },
    {
      id: "pm-2",
      name: "EC-Karte im Fahrzeug",
      type: "Vor Ort",
      isDefault: false,
      note: "Kontaktlose Zahlung im Taxi als Demo."
    },
    {
      id: "pm-3",
      name: "Kreditkarte Demo",
      type: "Online Demo",
      isDefault: false,
      note: "Keine Kartendaten, keine echte Abwicklung."
    },
    {
      id: "pm-4",
      name: "PayPal Demo",
      type: "Online Demo",
      isDefault: false,
      note: "Nur UI-Demo, keine echte Transaktion."
    },
    {
      id: "pm-5",
      name: "Rechnung fuer Firmen/Krankenkasse Demo",
      type: "Abrechnung Demo",
      isDefault: false,
      note: "Fuer spaetere API-Anbindung vorbereitet."
    }
  ];

  const rewardsPreview = {
    level: "Gold",
    points: 2340,
    nextLevel: "Platinum",
    pointsToNext: 1160,
    lastEarned: "+25 Punkte fuer TG-260710-006",
    hint: "Nicht jede Fahrt erhaelt Rewards-Punkte."
  };

  function getLiveState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(liveRideStorageKey) || "{}");
      const statusIndex = Number(parsed.statusIndex);
      return {
        statusIndex: Number.isFinite(statusIndex) ? Math.max(0, Math.min(liveRideStatusFlow.length - 1, statusIndex)) : 2,
        updatedAt: parsed.updatedAt || Date.now()
      };
    } catch (_error) {
      return {
        statusIndex: 2,
        updatedAt: Date.now()
      };
    }
  }

  function setLiveState(statusIndex) {
    const nextIndex = Math.max(0, Math.min(liveRideStatusFlow.length - 1, Number(statusIndex) || 0));
    const payload = {
      statusIndex: nextIndex,
      updatedAt: Date.now()
    };
    localStorage.setItem(liveRideStorageKey, JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent("tg-customer-live-ride-updated", {
      detail: payload
    }));
    return payload;
  }

  function getLiveRideVehicleForRide(rideId) {
    if (rideId === "TG-260710-005") return liveRideVehicles[7];
    if (rideId === "TG-260710-002") return liveRideVehicles[7];
    if (rideId === "TG-260710-003") return liveRideVehicles[1];
    return liveRideVehicles[0];
  }

  function statusLabelForCards(statusIndex) {
    if (statusIndex <= 1) return "Bestaetigt";
    if (statusIndex === 2) return "Fahrer zugewiesen";
    if (statusIndex === 3) return "Unterwegs";
    if (statusIndex === 4) return "Angekommen";
    if (statusIndex === 5) return "Unterwegs";
    return "Abgeschlossen";
  }

  function statusTimelineForCards(statusIndex) {
    if (statusIndex <= 1) return ["Bestaetigt"];
    if (statusIndex === 2) return ["Bestaetigt", "Fahrer zugewiesen"];
    if (statusIndex === 3) return ["Bestaetigt", "Fahrer zugewiesen", "Unterwegs"];
    if (statusIndex === 4) return ["Bestaetigt", "Fahrer zugewiesen", "Unterwegs", "Angekommen"];
    return ["Bestaetigt", "Fahrer zugewiesen", "Unterwegs", "Angekommen", "Abgeschlossen"];
  }

  function getActiveRide() {
    const state = getLiveState();
    const baseRide = rides.find(function (item) {
      return item.id === "TG-260710-001";
    }) || rides[0];

    const vehicle = getLiveRideVehicleForRide(baseRide.id);
    const isCompleted = state.statusIndex >= liveRideStatusFlow.length - 1;

    return Object.assign({}, baseRide, {
      section: isCompleted ? "vergangen" : "kommend",
      status: statusLabelForCards(state.statusIndex),
      statusTimeline: statusTimelineForCards(state.statusIndex),
      estimatedArrival: state.statusIndex >= 4 ? "Jetzt" : "10:40",
      vehicle: vehicle.model,
      plate: vehicle.plate,
      vehicleCategory: vehicle.category,
      driver: demoDriver.name,
      price: "Festpreis 18,40 EUR",
      note: "Bitte am Haupteingang warten. Demo-Live-Daten ohne GPS.",
      liveState: state
    });
  }

  function getCustomerNotifications() {
    const state = getLiveState();
    const status = liveRideStatusFlow[state.statusIndex] || liveRideStatusFlow[0];
    const liveMap = {
      driver_assigned: { id: "cn-live-assigned", title: "Fahrer zugewiesen", text: "Fuer TG-260710-001 wurde " + demoDriver.name + " zugewiesen.", type: "profile", time: "vor 2 Min." },
      driver_on_the_way: { id: "cn-live-way", title: "Fahrer ist unterwegs", text: "TG-260710-001: Ihr Fahrer ist auf dem Weg zur Abholung.", type: "route", time: "gerade eben" },
      vehicle_arrived: { id: "cn-live-arrived", title: "Fahrzeug ist angekommen", text: "TG-260710-001: Ihr Fahrzeug wartet am Abholpunkt.", type: "location", time: "gerade eben" },
      ride_completed: { id: "cn-live-completed", title: "Fahrt abgeschlossen", text: "TG-260710-001 wurde erfolgreich abgeschlossen.", type: "check", time: "gerade eben" }
    };

    const next = customerNotifications.slice();
    if (liveMap[status.key]) {
      next.unshift(liveMap[status.key]);
    }
    return next;
  }

  window.CustomerJourneyDemo = {
    rideStatusOrder,
    rides,
    customerNotifications,
    liveRideStatusFlow,
    liveRideVehicles,
    demoDriver,
    typeIconPath,
    notificationIconPath,
    walletSummary,
    coupons,
    paymentMethods,
    rewardsPreview,
    getLiveState,
    setLiveState,
    getActiveRide,
    getCustomerNotifications
  };
})();
