(() => {
  const M = window.AdminManagementDemo;
  const state = { data: M.loadState(), compare: [] };

  function pill(v) {
    const n = M.normalize(v);
    const c = n.includes("archiv") || n.includes("verworfen") ? "wichtig" : n.includes("ausgewaehlt") || n.includes("empfohlen") ? "success" : "normal";
    return `<span class="m-pill ${c}">${v}</span>`;
  }

  function renderList() {
    const node = document.querySelector("[data-sc-list]");
    if (!node) return;
    M.evaluateScenarios(state.data);
    state.data = M.loadState();
    node.innerHTML = state.data.scenarios.map((s) => `<article class="m-item"><strong>${s.name}</strong><p>${pill(s.status)} · ${s.date} · ${s.period}</p><p>Auslastung erwartet: ${s.result.expectedUtilization || 0}%</p><p>Luecke: ${s.result.capacityGap || 0} · Wartezeit: ${s.result.expectedWait || 0} Min</p><p>Nicht bedienbar (Demo): ${s.result.unservedRides || 0}</p><p>Zusatzfahrer: ${s.result.neededExtraDrivers || 0} · Zusatzfahrzeuge: ${s.result.neededExtraVehicles || 0}</p><p>Spezialfahrzeuge: ${s.result.neededSpecialVehicles || 0} · Risiko: ${s.result.risk || "-"}</p><div class="m-actions"><button class="admin-btn admin-btn-secondary" type="button" data-sc-compare="${s.id}">vergleichen</button><button class="admin-btn" type="button" data-sc-status="${s.id}" data-sc-next="empfohlen">empfohlen</button><button class="admin-btn" type="button" data-sc-status="${s.id}" data-sc-next="ausgewaehlt">ausgewaehlt</button><button class="admin-btn" type="button" data-sc-status="${s.id}" data-sc-next="verworfen">verworfen</button><button class="admin-btn" type="button" data-sc-status="${s.id}" data-sc-next="archiviert">archiviert</button><button class="admin-btn admin-btn-warning" type="button" data-sc-apply="${s.id}">Vorschlaege uebernehmen</button></div></article>`).join("");
  }

  function renderCompare() {
    const node = document.querySelector("[data-sc-compare]");
    if (!node) return;
    const rows = state.data.scenarios.filter((s) => state.compare.includes(s.id)).slice(0, 3);
    node.innerHTML = rows.length ? rows.map((s) => `<article class="m-item"><strong>${s.name}</strong><p>Fahrten: ${s.result.expectedUtilization || 0}% Auslastung</p><p>Fahrer: ${s.availableDrivers}</p><p>Fahrzeuge: ${s.availableVehicles}</p><p>Wartezeit: ${s.result.expectedWait || 0} Min</p><p>Engpaesse: ${s.result.capacityGap || 0}</p><p>Reserve: ${s.reserve}</p><p>Demo-Umsatz: ${s.result.demoRevenue || 0} EUR</p><p>Demo-Kosten: ${s.result.demoCost || 0} EUR</p><p>Risiko: ${s.result.risk || "-"}</p></article>`).join("") : '<article class="m-item"><p>Keine Szenarien markiert.</p></article>';
  }

  function bind() {
    const form = document.querySelector("[data-sc-form]");
    if (form) {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        M.addScenario(state.data, Object.fromEntries(new FormData(form).entries()));
        state.data = M.loadState();
        renderList();
        renderCompare();
        form.reset();
      });
    }

    document.addEventListener("click", (event) => {
      const c = event.target.closest("[data-sc-compare]");
      if (c) {
        const id = c.getAttribute("data-sc-compare") || "";
        if (state.compare.includes(id)) state.compare = state.compare.filter((x) => x !== id);
        else state.compare = [...state.compare, id].slice(-3);
        renderCompare();
        return;
      }

      const st = event.target.closest("[data-sc-status]");
      if (st) {
        const id = st.getAttribute("data-sc-status") || "";
        const next = st.getAttribute("data-sc-next") || "empfohlen";
        M.setScenarioStatus(state.data, id, next);
        state.data = M.loadState();
        renderList();
        renderCompare();
        return;
      }

      const apply = event.target.closest("[data-sc-apply]");
      if (apply) {
        const id = apply.getAttribute("data-sc-apply") || "";
        const row = state.data.scenarios.find((s) => s.id === id);
        if (!row) return;
        if (!window.confirm("Szenario-Vorschlaege als Demo-Aufgaben anlegen? Es werden keine echten Plaene ueberschrieben.")) return;
        (row.result.measures || []).forEach((m) => {
          M.addManagementTask(state.data, {
            title: `Szenario ${row.name}: ${m}`,
            area: "Szenario",
            priority: "hoch",
            owner: "Geschaeftsleitung",
            dueDate: M.todayIso(),
            status: "offen",
            relation: row.id,
            impact: "Szenariovorschlag"
          });
        });
        state.data = M.loadState();
        renderList();
        renderCompare();
        return;
      }

      if (event.target.closest("[data-sc-reset]")) {
        if (!window.confirm("Szenarien wirklich zuruecksetzen?")) return;
        state.data.scenarios = M.resetState().scenarios;
        M.saveState(state.data);
        state.data = M.loadState();
        state.compare = [];
        renderList();
        renderCompare();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderList();
    renderCompare();
    bind();
  });
})();
