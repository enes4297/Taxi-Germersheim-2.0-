(() => {
  const Q = window.AdminQualityDemo;
  const state = { data: Q.loadState(), filters: {} };

  function renderKpis(report) {
    const m = report.metrics;
    const rows = [
      ["Beschwerden gesamt", m.complaintsTotal],
      ["Beschwerden pro 100 Fahrten (Demo)", m.complaintsPer100],
      ["geloeste Beschwerden", m.solvedComplaints],
      ["kritische Faelle", m.criticalCases],
      ["wiederkehrende Ursachen", m.recurringCauses],
      ["Unfaelle", m.accidents],
      ["Beinaheunfaelle", m.nearMisses],
      ["Fahrzeugmaengel", m.vehicleIssues],
      ["Fundsachen", m.foundItems],
      ["Rueckgabequote Fundsachen", `${m.foundReturnRate}%`],
      ["Pruefungen bestanden", `${m.checksPassedQuote}%`],
      ["ueberfaellige Massnahmen", m.overdueActions],
      ["positives Feedback", m.positiveFeedback],
      ["Schulungsmassnahmen", m.trainingsActions],
      ["offene Risiken", m.openRisks]
    ];
    const node = document.querySelector("[data-rep-kpis]");
    if (!node) return;
    node.innerHTML = rows.map((r) => `<article class="q-card"><small>${r[0]}</small><strong>${r[1]}</strong></article>`).join("");
  }

  function listBlock(title, obj) {
    const entries = Object.entries(obj || {}).sort((a, b) => Number(b[1]) - Number(a[1]));
    const items = entries.length ? entries.map((e) => `<li>${e[0]}: ${e[1]}</li>`).join("") : "<li>Keine Daten</li>";
    return `<article class="q-chart"><strong>${title}</strong><ul>${items}</ul></article>`;
  }

  function renderCharts(report) {
    const c = report.charts;
    const node = document.querySelector("[data-rep-charts]");
    if (!node) return;
    node.innerHTML = [
      listBlock("Beschwerden nach Kategorie", c.complaintsByCategory),
      listBlock("Vorfaelle nach Ursache", c.incidentsByCause),
      listBlock("Unfaelle nach Art", c.accidentsByType),
      listBlock("Fahrzeugmaengel nach Fahrzeug", c.vehicleIssues),
      listBlock("Massnahmenstatus", c.actionStatus),
      `<article class="q-chart"><strong>Pruefungsquote</strong><p>${c.checkQuote}% bestanden</p></article>`,
      listBlock("Positives Feedback", c.positiveByCategory),
      listBlock("Fundsachenstatus", c.foundStatus)
    ].join("");
  }

  function renderMonthly(report) {
    const m = report.monthlySummary;
    const node = document.querySelector("[data-rep-monthly]");
    if (!node) return;
    node.innerHTML = `
      <h3>Wichtigste Faelle</h3>
      <p>${m.topCases.join("<br>") || "Keine"}</p>
      <h3>Trends</h3>
      <p>${m.trends.join("<br>") || "Keine"}</p>
      <h3>Wiederkehrende Ursachen</h3>
      <p>${m.recurring.map((x) => `${x.pattern} (${x.count})`).join("<br>") || "Keine"}</p>
      <h3>Kritische Risiken</h3>
      <p>${m.criticalRisks.join(", ") || "Keine"}</p>
      <h3>Abgeschlossene Massnahmen</h3>
      <p>${m.completedActions.join(", ") || "Keine"}</p>
      <h3>Offene Massnahmen</h3>
      <p>${m.openActions.join(", ") || "Keine"}</p>
      <h3>Empfehlungen fuer naechsten Monat</h3>
      <p>${m.recommendations.join("<br>")}</p>
    `;
  }

  function collectFilters() {
    const from = document.querySelector("[data-rep-from]");
    const to = document.querySelector("[data-rep-to]");
    state.filters = {
      from: from ? String(from.value || "") : "",
      to: to ? String(to.value || "") : ""
    };
  }

  function render() {
    const report = Q.getReportData(state.data, state.filters);
    renderKpis(report);
    renderCharts(report);
    renderMonthly(report);
  }

  function bind() {
    document.addEventListener("change", (event) => {
      if (!event.target.closest("[data-rep-from],[data-rep-to],[data-rep-driver],[data-rep-vehicle],[data-rep-category],[data-rep-status]")) return;
      collectFilters();
      render();
    });
    document.addEventListener("input", (event) => {
      if (!event.target.closest("[data-rep-driver],[data-rep-vehicle],[data-rep-category],[data-rep-status]")) return;
      collectFilters();
      render();
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    collectFilters();
    render();
    bind();
  });
})();
