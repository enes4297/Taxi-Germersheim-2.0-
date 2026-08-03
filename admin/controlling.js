(() => {
  const F = window.AdminFinanceDemo;
  const state = { data: F.loadState(), range: "heute" };

  function ridesInRange() {
    return state.data.rides.filter((r) => state.range === "alle" || F.getRangeFilter(r.date, state.range));
  }

  function renderKpis() {
    const rides = ridesInRange();
    const revenue = rides.reduce((s, r) => s + Number(r.cashAmount || 0) + Number(r.cardAmount || 0) + Number(r.invoiceAmount || 0), 0);
    const costs = state.data.costs.reduce((s, c) => s + Number(c.amount || 0), 0);
    const openClaims = state.data.invoices.reduce((s, i) => s + Number(i.open || 0), 0);
    const paidInvoices = state.data.invoices.filter((i) => i.open === 0).length;
    const vehicles = state.data.vehicleEconomy.length;
    const drivers = new Set(rides.map((r) => r.driver)).size;
    const avgRide = revenue / Math.max(1, rides.length);
    const kpis = [
      ["Umsatz heute", F.formatEuro(revenue)],
      ["Umsatz Woche", F.formatEuro(rides.filter((r) => F.getRangeFilter(r.date, "diese Woche")).reduce((s, r) => s + Number(r.cashAmount || 0) + Number(r.cardAmount || 0) + Number(r.invoiceAmount || 0), 0))],
      ["Umsatz Monat", F.formatEuro(rides.filter((r) => F.getRangeFilter(r.date, "dieser Monat")).reduce((s, r) => s + Number(r.cashAmount || 0) + Number(r.cardAmount || 0) + Number(r.invoiceAmount || 0), 0))],
      ["Hochrechnung Monat", F.formatEuro(revenue * 1.12)],
      ["Umsatz Vorjahr (Demo)", F.formatEuro(revenue * 0.92)],
      ["offene Forderungen", F.formatEuro(openClaims)],
      ["bezahlte Rechnungen", paidInvoices],
      ["Kosten Monat", F.formatEuro(costs)],
      ["Deckungsbeitrag", F.formatEuro(revenue - costs)],
      ["Fahrten", rides.length],
      ["Auslastung", `${Math.min(98, Math.round((rides.length / Math.max(1, vehicles * 12)) * 100))} %`],
      ["freie Fahrzeuge", Math.max(0, vehicles - 2)],
      ["aktive Fahrer", drivers],
      ["durchschnittlicher Fahrtwert", F.formatEuro(avgRide)],
      ["Umsatz pro Fahrzeug", F.formatEuro(revenue / Math.max(1, vehicles))],
      ["Umsatz pro Fahrer", F.formatEuro(revenue / Math.max(1, drivers))],
      ["Krankenfahrtenanteil", `${Math.round((rides.filter((r) => r.billingType === "Krankenkasse").length / Math.max(1, rides.length)) * 100)} %`],
      ["Firmenkundenanteil", `${Math.round((rides.filter((r) => r.billingType === "Sammelrechnung").length / Math.max(1, rides.length)) * 100)} %`]
    ];
    const node = document.querySelector("[data-ctrl-kpis]");
    if (!node) return;
    node.innerHTML = kpis.map((x) => `<article class="finance-kpi"><small>${x[0]}</small><strong>${x[1]}</strong></article>`).join("");
  }

  function renderVehicles() {
    const body = document.querySelector("[data-ctrl-vehicle-table]");
    if (!body) return;
    const sorted = [...state.data.vehicleEconomy].sort((a, b) => b.contribution - a.contribution);
    body.innerHTML = sorted.map((v, idx) => `<tr><td>${v.vehicle}</td><td>${F.formatEuro(v.revenue)}</td><td>${v.km}</td><td>${F.formatEuro(v.totalCost)}</td><td>${(v.totalCost / Math.max(1, v.km)).toFixed(2)}</td><td>${v.revPerKm.toFixed(2)}</td><td>${Math.round((v.assignments / 100) * 100)} %</td><td>${v.downtimeDays} Tage</td><td>${v.damages}</td><td>${v.assignments}</td><td>${idx + 1}</td></tr>`).join("");
  }

  function renderSegments() {
    const body = document.querySelector("[data-ctrl-segment-table]");
    if (!body) return;
    const rides = ridesInRange();
    const groups = {};
    rides.forEach((r) => {
      const key = r.rideType;
      if (!groups[key]) groups[key] = { name: key, count: 0, revenue: 0, km: 0, open: 0, cancel: 0, noshow: 0 };
      groups[key].count += 1;
      groups[key].revenue += Number(r.cashAmount || 0) + Number(r.cardAmount || 0) + Number(r.invoiceAmount || 0);
      groups[key].km += Number(r.actualKm || 0);
      groups[key].open += r.checkStatus !== "vollstaendig" ? 1 : 0;
      groups[key].cancel += r.checkStatus === "storniert" ? 1 : 0;
      groups[key].noshow += r.checkStatus === "abgelehnt" ? 1 : 0;
    });
    const totalRevenue = rides.reduce((s, r) => s + Number(r.cashAmount || 0) + Number(r.cardAmount || 0) + Number(r.invoiceAmount || 0), 0);
    body.innerHTML = Object.values(groups).map((g) => `<tr><td>${g.name}</td><td>${g.count}</td><td>${F.formatEuro(g.revenue)}</td><td>${F.formatEuro(g.revenue / Math.max(1, g.count))}</td><td>${g.km}</td><td>${(g.revenue / Math.max(1, g.km)).toFixed(2)}</td><td>${Math.round((g.revenue / Math.max(1, totalRevenue)) * 100)} %</td><td>${g.open}</td><td>${g.cancel}</td><td>${g.noshow}</td></tr>`).join("");
  }

  function renderGoals() {
    const goals = [
      ["Monatsumsatz", 75000, 68420],
      ["Anzahl Fahrten", 2800, 2520],
      ["Auslastung", 82, 76],
      ["offene Forderungen reduzieren", 12000, 14800],
      ["Dokumentenquote", 96, 91],
      ["Rechnungen schneller pruefen", 90, 78],
      ["Fahrzeugkosten senken", 21000, 23400]
    ];
    const node = document.querySelector("[data-ctrl-goals]");
    if (!node) return;
    node.innerHTML = goals.map((g) => {
      const progress = Math.max(0, Math.min(100, Math.round((g[2] / Math.max(1, g[1])) * 100)));
      const dev = ((g[2] - g[1]) / Math.max(1, g[1])) * 100;
      return `<article class="finance-item"><strong>${g[0]}</strong><p>Zielwert: ${g[1]}</p><p>Aktueller Wert: ${g[2]}</p><div class="finance-progress"><span style="width:${progress}%"></span></div><p>Fortschritt: ${progress}% · Abweichung: ${dev.toFixed(1)}% · Trend: ${dev <= 0 ? "stabil" : "steigend"}</p></article>`;
    }).join("");
  }

  function bindRange() {
    document.querySelectorAll("[data-ctrl-range]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.range = btn.getAttribute("data-ctrl-range") || "heute";
        document.querySelectorAll("[data-ctrl-range]").forEach((b) => b.classList.toggle("is-active", b === btn));
        renderKpis();
        renderSegments();
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderKpis();
    renderVehicles();
    renderSegments();
    renderGoals();
    bindRange();
  });
})();
