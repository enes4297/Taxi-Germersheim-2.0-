(() => {
  const PERIODS = {
    Heute: {
      kpis: {
        ridesToday: 96,
        revenueToday: "2.486,00 EUR",
        utilization: "78 %",
        cancellations: 4,
        avgWait: "7 Min",
        topVehicle: "GER TX100"
      },
      ridesPerDay: [
        { label: "Mo", value: 82 },
        { label: "Di", value: 91 },
        { label: "Mi", value: 87 },
        { label: "Do", value: 93 },
        { label: "Fr", value: 96 }
      ],
      revenuePerWeek: [
        { label: "KW 23", value: 12480 },
        { label: "KW 24", value: 13220 },
        { label: "KW 25", value: 14110 },
        { label: "KW 26", value: 13870 },
        { label: "KW 27", value: 14620 }
      ]
    },
    "7 Tage": {
      kpis: {
        ridesToday: 622,
        revenueToday: "16.940,00 EUR",
        utilization: "81 %",
        cancellations: 21,
        avgWait: "8 Min",
        topVehicle: "GER TX200"
      },
      ridesPerDay: [
        { label: "Sa", value: 74 },
        { label: "So", value: 66 },
        { label: "Mo", value: 82 },
        { label: "Di", value: 91 },
        { label: "Mi", value: 87 },
        { label: "Do", value: 93 },
        { label: "Fr", value: 96 }
      ],
      revenuePerWeek: [
        { label: "KW 24", value: 13220 },
        { label: "KW 25", value: 14110 },
        { label: "KW 26", value: 13870 },
        { label: "KW 27", value: 14620 },
        { label: "KW 28", value: 16940 }
      ]
    },
    "30 Tage": {
      kpis: {
        ridesToday: 2520,
        revenueToday: "67.280,00 EUR",
        utilization: "76 %",
        cancellations: 96,
        avgWait: "9 Min",
        topVehicle: "GER TX500"
      },
      ridesPerDay: [
        { label: "W1", value: 590 },
        { label: "W2", value: 614 },
        { label: "W3", value: 642 },
        { label: "W4", value: 674 }
      ],
      revenuePerWeek: [
        { label: "KW 24", value: 15540 },
        { label: "KW 25", value: 16710 },
        { label: "KW 26", value: 17030 },
        { label: "KW 27", value: 18000 }
      ]
    },
    Monat: {
      kpis: {
        ridesToday: 2688,
        revenueToday: "71.430,00 EUR",
        utilization: "79 %",
        cancellations: 103,
        avgWait: "8 Min",
        topVehicle: "GER TX700"
      },
      ridesPerDay: [
        { label: "W1", value: 645 },
        { label: "W2", value: 658 },
        { label: "W3", value: 671 },
        { label: "W4", value: 714 }
      ],
      revenuePerWeek: [
        { label: "KW 24", value: 17120 },
        { label: "KW 25", value: 17640 },
        { label: "KW 26", value: 17890 },
        { label: "KW 27", value: 18780 }
      ]
    },
    Jahr: {
      kpis: {
        ridesToday: 30190,
        revenueToday: "822.400,00 EUR",
        utilization: "74 %",
        cancellations: 1220,
        avgWait: "10 Min",
        topVehicle: "GER TX300"
      },
      ridesPerDay: [
        { label: "Q1", value: 7260 },
        { label: "Q2", value: 7440 },
        { label: "Q3", value: 7620 },
        { label: "Q4", value: 7870 }
      ],
      revenuePerWeek: [
        { label: "Q1", value: 198400 },
        { label: "Q2", value: 201900 },
        { label: "Q3", value: 207300 },
        { label: "Q4", value: 214800 }
      ]
    }
  };

  const CHARTS = {
    rideTypes: [
      { label: "Taxi", value: 44 },
      { label: "Krankenfahrt", value: 24 },
      { label: "Flughafen", value: 14 },
      { label: "Rollstuhl", value: 10 },
      { label: "Kurier", value: 8 }
    ],
    vehicleLoad: [
      { label: "GER TX100", value: 93 },
      { label: "GER TX200", value: 89 },
      { label: "GER TX500", value: 84 },
      { label: "GER TX700", value: 81 },
      { label: "GER TX800", value: 76 }
    ],
    driverPerformance: [
      { label: "Sabine Hoffmann", value: 97 },
      { label: "Emre Kaya", value: 95 },
      { label: "Daniel Kaya", value: 92 },
      { label: "Fatma Aydin", value: 90 },
      { label: "Selin Kara", value: 88 }
    ]
  };

  const TABLES = {
    drivers: [
      ["Sabine Hoffmann", "128 Fahrten"],
      ["Emre Kaya", "121 Fahrten"],
      ["Daniel Kaya", "117 Fahrten"],
      ["Fatma Aydin", "115 Fahrten"],
      ["Selin Kara", "109 Fahrten"]
    ],
    vehicles: [
      ["GER TX100", "93 %"],
      ["GER TX200", "89 %"],
      ["GER TX500", "84 %"],
      ["GER TX700", "81 %"],
      ["GER TX800", "76 %"]
    ],
    customerTypes: [
      ["Privatkunden", "46 %"],
      ["Krankenkassen", "22 %"],
      ["Firmenkunden", "18 %"],
      ["VIP", "8 %"],
      ["Schülerfahrt", "6 %"]
    ],
    rideTypes: [
      ["Taxi", "44 %"],
      ["Krankenfahrt", "24 %"],
      ["Flughafen", "14 %"],
      ["Rollstuhl", "10 %"],
      ["Kurier", "8 %"]
    ],
    revenueSources: [
      ["Direktfahrt", "38 %"],
      ["Krankenkasse", "27 %"],
      ["Firmenkonto", "19 %"],
      ["Flughafentransfer", "11 %"],
      ["Sonstige", "5 %"]
    ]
  };

  const DRIVER_SELF = {
    rides: "12",
    rating: "4.8",
    utilization: "86 %",
    punctuality: "94 %"
  };

  const ROLE_SCOPES = {
    Chef: ["rides", "revenue", "utilization", "vehicles", "drivers", "customer-types", "driver-self"],
    Disposition: ["rides", "utilization", "drivers", "vehicles"],
    Buchhaltung: ["revenue", "customer-types"],
    Fahrer: ["driver-self"]
  };

  const state = {
    period: "Heute"
  };

  // Nur Demo-Auswertungen ohne Backend
  function readRole() {
    if (!window.AdminDemoAuth || typeof window.AdminDemoAuth.readSession !== "function") {
      return "Chef";
    }
    const session = window.AdminDemoAuth.readSession();
    return session && session.role ? session.role : "Chef";
  }

  function renderKpis(periodData) {
    Object.entries(periodData.kpis).forEach(([key, value]) => {
      const node = document.querySelector(`[data-analytics-kpi="${key}"]`);
      if (node) node.textContent = String(value);
    });
  }

  function toCurrency(value) {
    return `${new Intl.NumberFormat("de-DE").format(value)} EUR`;
  }

  function renderBarList(target, data, formatter = (value) => `${value}`) {
    const node = document.querySelector(`[data-analytics-chart="${target}"]`);
    if (!node) return;

    const max = Math.max(...data.map((entry) => entry.value), 1);
    node.innerHTML = data
      .map((entry) => {
        const width = Math.max(8, Math.round((entry.value / max) * 100));
        return `
          <article class="analytics-bar-item">
            <div class="analytics-bar-meta"><span>${entry.label}</span><strong>${formatter(entry.value)}</strong></div>
            <div class="analytics-bar-track"><span style="width:${width}%"></span></div>
          </article>
        `;
      })
      .join("");
  }

  function renderShareList() {
    const node = document.querySelector('[data-analytics-chart="rideTypes"]');
    if (!node) return;

    node.innerHTML = CHARTS.rideTypes
      .map((entry) => {
        return `
          <article class="analytics-share-item">
            <strong>${entry.label}</strong>
            <span>${entry.value} %</span>
          </article>
        `;
      })
      .join("");
  }

  function renderTables() {
    Object.entries(TABLES).forEach(([key, rows]) => {
      const table = document.querySelector(`[data-analytics-table="${key}"]`);
      if (!table) return;

      table.innerHTML = `
        <thead>
          <tr><th>Name</th><th>Wert</th></tr>
        </thead>
        <tbody>
          ${rows.map((row) => `<tr><td>${row[0]}</td><td>${row[1]}</td></tr>`).join("")}
        </tbody>
      `;
    });
  }

  function renderDriverSelf() {
    Object.entries(DRIVER_SELF).forEach(([key, value]) => {
      const node = document.querySelector(`[data-analytics-self="${key}"]`);
      if (node) node.textContent = value;
    });

    const kpiNode = document.querySelector('[data-analytics-self="rides-kpi"]');
    if (kpiNode) {
      kpiNode.textContent = `${DRIVER_SELF.rides} Fahrten`;
    }
  }

  function renderPeriod(period) {
    const periodData = PERIODS[period] || PERIODS.Heute;
    renderKpis(periodData);
    renderBarList("ridesPerDay", periodData.ridesPerDay);
    renderBarList("revenuePerWeek", periodData.revenuePerWeek, toCurrency);
    renderBarList("vehicleLoad", CHARTS.vehicleLoad, (value) => `${value} %`);
    renderBarList("driverPerformance", CHARTS.driverPerformance, (value) => `${value} %`);
    renderShareList();
    renderTables();
    renderDriverSelf();
  }

  function applyRoleScopes(role) {
    const allowed = new Set(ROLE_SCOPES[role] || []);
    document.querySelectorAll("[data-analytics-scope]").forEach((section) => {
      const scope = section.getAttribute("data-analytics-scope") || "";
      section.hidden = !allowed.has(scope);
    });
  }

  function bindPeriodFilters() {
    const buttons = document.querySelectorAll("[data-analytics-range]");
    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        state.period = button.getAttribute("data-analytics-range") || "Heute";
        buttons.forEach((item) => {
          item.classList.toggle("is-active", item === button);
        });
        renderPeriod(state.period);
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    const role = readRole();
    applyRoleScopes(role);
    bindPeriodFilters();
    renderPeriod(state.period);
  });
})();
