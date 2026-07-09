(() => {
  const rides = [
    {
      time: "08:15",
      customer: "Max Mustermann",
      start: "Germersheim Zentrum",
      target: "Frankfurt Flughafen T1",
      status: "Neu",
      driver: "-",
      rewards: 22,
      fare: 126.5
    },
    {
      time: "08:40",
      customer: "Selin Kara",
      start: "Speyer Bahnhof",
      target: "Germersheim Nord",
      status: "Unterwegs",
      driver: "Michael B.",
      rewards: 16,
      fare: 42
    },
    {
      time: "09:05",
      customer: "Ali Demir",
      start: "Rülzheim",
      target: "Klinikum Landau",
      status: "Angekommen",
      driver: "Sabine H.",
      rewards: 18,
      fare: 58
    },
    {
      time: "09:20",
      customer: "Mia König",
      start: "Jockgrim",
      target: "Germersheim Schule",
      status: "Abgeschlossen",
      driver: "Julia S.",
      rewards: 10,
      fare: 24.5
    },
    {
      time: "09:35",
      customer: "Enes Y.",
      start: "Germersheim Süd",
      target: "Speyer Zentrum",
      status: "Unterwegs",
      driver: "Daniel K.",
      rewards: 14,
      fare: 34
    },
    {
      time: "10:00",
      customer: "Nora Winter",
      start: "Leimersheim",
      target: "Karlsruhe Hbf",
      status: "Abgeschlossen",
      driver: "Ali D.",
      rewards: 21,
      fare: 72
    }
  ];

  const statusClassMap = {
    Neu: "status-neu",
    Unterwegs: "status-unterwegs",
    Angekommen: "status-angekommen",
    Abgeschlossen: "status-abgeschlossen"
  };

  function formatEuro(value) {
    return `${Number(value || 0).toFixed(2).replace('.', ',')} EUR`;
  }

  function renderStats() {
    const openRides = rides.filter((r) => r.status !== "Abgeschlossen").length;
    const driversOnRoute = new Set(
      rides
        .filter((r) => r.status === "Unterwegs" || r.status === "Angekommen")
        .map((r) => r.driver)
        .filter((driver) => driver && driver !== "-")
    ).size;
    const completedRides = rides.filter((r) => r.status === "Abgeschlossen").length;
    const newRequests = rides.filter((r) => r.status === "Neu").length;
    const todayRewards = rides.reduce((sum, r) => sum + Number(r.rewards || 0), 0);
    const todayRevenue = rides.reduce((sum, r) => sum + Number(r.fare || 0), 0);

    const statValues = {
      openRides,
      driversOnRoute,
      completedRides,
      newRequests,
      todayRewards,
      todayRevenue: formatEuro(todayRevenue)
    };

    Object.entries(statValues).forEach(([key, value]) => {
      const node = document.querySelector(`[data-stat="${key}"]`);
      if (node) node.textContent = String(value);
    });
  }

  function renderTable() {
    const tbody = document.querySelector("[data-admin-rides]");
    if (!tbody) return;

    tbody.innerHTML = "";
    rides.forEach((ride) => {
      const tr = document.createElement("tr");

      const status = document.createElement("span");
      status.className = `status-pill ${statusClassMap[ride.status] || "status-neu"}`;
      status.textContent = ride.status;

      tr.innerHTML = `
        <td>${ride.time}</td>
        <td>${ride.customer}</td>
        <td>${ride.start}</td>
        <td>${ride.target}</td>
        <td></td>
        <td>${ride.driver}</td>
      `;
      const statusCell = tr.children[4];
      statusCell.append(status);

      tbody.append(tr);
    });
  }

  function bindUi() {
    const buttons = document.querySelectorAll(".admin-nav-item");
    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        buttons.forEach((b) => b.classList.remove("is-active"));
        button.classList.add("is-active");
      });
    });
  }

  renderStats();
  renderTable();
  bindUi();
})();
