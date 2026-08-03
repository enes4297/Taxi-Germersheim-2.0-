(() => {
  const Q = window.AdminQualityDemo;
  const state = { data: Q.loadState() };

  function badge(priority) {
    const key = Q.normalize(priority || "normal").includes("krit") ? "kritisch" : Q.normalize(priority || "normal").includes("wichtig") ? "wichtig" : Q.normalize(priority || "normal").includes("info") ? "info" : "normal";
    return `<span class="q-badge ${key}">${priority}</span>`;
  }

  function renderKpis() {
    const s = Q.getOverviewStats(state.data);
    const rows = [
      ["offene Beschwerden", s.openComplaints],
      ["kritische Beschwerden", s.criticalComplaints],
      ["neue Vorfaelle", s.newIncidents],
      ["offene Unfaelle", s.openAccidents],
      ["ungeklaerte Fundsachen", s.unresolvedFound],
      ["offene Pruefungen", s.openInspections],
      ["ueberfaellige Massnahmen", s.overdueActions],
      ["Qualitaetsfaelle diesen Monat", s.qualityCasesMonth],
      ["geloeste Faelle", s.solvedCases],
      ["durchschnittliche Bearbeitungszeit (h)", s.avgHandle],
      ["positives Feedback", s.positive],
      ["wiederkehrende Probleme", s.recurring]
    ];
    const node = document.querySelector("[data-q-kpis]");
    if (!node) return;
    node.innerHTML = rows.map((r) => `<article class="q-card"><small>${r[0]}</small><strong>${r[1]}</strong></article>`).join("");
  }

  function renderToday() {
    const t = Q.getTodaySnapshot(state.data);
    const rows = [
      ["neue Beschwerden heute", t.newComplaintsToday],
      ["neue Schaeden", t.newDamages],
      ["neue Fundmeldungen", t.newFound],
      ["Unfallmeldungen", t.accidentReports],
      ["kritische Fahrerhinweise", t.criticalDriverHints],
      ["Fahrzeugpruefungen faellig", t.vehicleInspectionsDue],
      ["offene Rueckrufe", t.openCallbacks],
      ["ueberfaellige Massnahmen", t.overdueActions],
      ["ungeklaerte Faelle", t.unresolved],
      ["wichtige Eskalationen", t.escalations]
    ];
    const body = document.querySelector("[data-q-today]");
    if (!body) return;
    body.innerHTML = rows.map((r) => {
      const p = Number(r[1]);
      const label = p >= 3 ? "wichtig" : p > 0 ? "normal" : "Information";
      return `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${badge(label)}</td></tr>`;
    }).join("");
  }

  function renderWarnings() {
    const node = document.querySelector("[data-q-warnings]");
    if (!node) return;
    const warnings = Q.buildWarnings(state.data);
    node.innerHTML = warnings.length
      ? warnings.map((w) => `<article class="q-item"><strong>${badge(w.priority)}</strong><p>${w.text}</p></article>`).join("")
      : '<article class="q-item"><strong>Keine offenen Warnungen</strong><p>Aktuell keine kritischen oder wichtigen Hinweise.</p></article>';
  }

  function bind() {
    document.addEventListener("click", (event) => {
      if (!event.target.closest("[data-q-reset]")) return;
      if (!window.confirm("Qualitaets-Demo wirklich zuruecksetzen?")) return;
      state.data = Q.resetState();
      renderKpis();
      renderToday();
      renderWarnings();
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderKpis();
    renderToday();
    renderWarnings();
    bind();
  });
})();
