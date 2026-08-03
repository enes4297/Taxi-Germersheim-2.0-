(() => {
  const M = window.AdminManagementDemo;
  const state = { data: M.loadState(), drag: null, placement: [] };

  function pill(v) {
    const n = M.normalize(v);
    const c = n.includes("krit") || n.includes("engpass") ? "kritisch" : n.includes("beob") ? "wichtig" : "normal";
    return `<span class="m-pill ${c}">${v}</span>`;
  }

  function renderMatrix(source) {
    const body = document.querySelector("[data-kp-matrix]");
    if (!body) return;
    body.innerHTML = M.capacityMatrix(state.data, source).map((r) => `<tr><td>${r.block}</td><td>${r.neededDrivers}</td><td>${r.availableDrivers}</td><td>${r.neededVehicles}</td><td>${r.availableVehicles}</td><td>${r.wheelVehicles}</td><td>${r.vanVehicles}</td><td>${r.evVehicles}</td><td>${r.reserve}</td><td>${pill(r.bottleneck)}</td></tr>`).join("");
  }

  function renderSpecial(source) {
    const node = document.querySelector("[data-kp-special]");
    if (!node) return;
    const matrix = M.capacityMatrix(state.data, source);
    const wheel = Math.min(...matrix.map((m) => m.wheelVehicles));
    const van = Math.min(...matrix.map((m) => m.vanVehicles));
    const warnings = [];
    if (wheel <= 0) warnings.push("keine passende Kombination aus Fahrer und Fahrzeug fuer Rollstuhl");
    if (van <= 0) warnings.push("Fahrzeug verfuegbar, aber kein qualifizierter Fahrer fuer Grossraum");
    if (matrix.some((m) => m.gap > 0)) warnings.push("Folgeauftrag gefaehrdet");
    if (matrix.every((m) => m.reserve <= 0)) warnings.push("Reserve fehlt");

    node.innerHTML = `<article class="m-item"><strong>Rollstuhlfahrzeuge</strong><p>minimum verfuegbar: ${wheel}</p></article><article class="m-item"><strong>Grossraumfahrzeuge</strong><p>minimum verfuegbar: ${van}</p></article><article class="m-item"><strong>Warnungen</strong><p>${warnings.length ? warnings.join("<br>") : "keine"}</p></article>`;
  }

  function renderGaps(source) {
    const node = document.querySelector("[data-kp-gaps]");
    if (!node) return;
    const gaps = M.capacityGaps(state.data, source);
    node.innerHTML = gaps.length ? gaps.map((g) => `<article class="m-item"><strong>${g.period}</strong><p>fehlende Fahrer: ${g.missingDrivers}</p><p>fehlende Fahrzeuge: ${g.missingVehicles}</p><p>Fahrzeugart: ${g.neededType}</p><p>betroffene Fahrten: ${g.affectedRides}</p><p>${pill(g.priority)}</p><p>${g.proposals.join(" | ")}</p></article>`).join("") : '<article class="m-item"><p>Keine Kapazitaetsluecken.</p></article>';
  }

  function renderPool(source) {
    const node = document.querySelector("[data-kp-pool]");
    if (!node) return;
    const reserve = M.reserveOverview(state.data, source).slice(0, 8);
    node.innerHTML = reserve.map((r, i) => `<div class="m-draggable" draggable="true" data-kp-draggable="${i}">${r.name} (${r.type})</div>`).join("");
    state.placement = reserve;
  }

  function bindDnd() {
    document.addEventListener("dragstart", (event) => {
      const item = event.target.closest("[data-kp-draggable]");
      if (!item) return;
      state.drag = Number(item.getAttribute("data-kp-draggable") || -1);
    });

    document.addEventListener("dragover", (event) => {
      if (!event.target.closest("[data-kp-zone]")) return;
      event.preventDefault();
    });

    document.addEventListener("drop", (event) => {
      const zone = event.target.closest("[data-kp-zone]");
      if (!zone) return;
      event.preventDefault();
      if (state.drag == null || state.drag < 0) return;
      const row = state.placement[state.drag];
      if (!row) return;
      const div = document.createElement("div");
      div.className = "m-draggable";
      div.textContent = `${row.name} (${row.type})`;
      zone.append(div);
      M.addManagementTask(state.data, {
        title: `Reserve zugewiesen: ${row.name}`,
        area: "Kapazitaetsplanung",
        priority: "normal",
        owner: "Disposition",
        dueDate: M.todayIso(),
        status: "in Bearbeitung",
        relation: zone.getAttribute("data-kp-zone") || "",
        impact: "Kapazitaet kurzfristig erhoeht"
      });
      state.data = M.loadState();
      state.drag = null;
    });
  }

  function bindButtons() {
    document.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-kp-assign]");
      if (!btn) return;
      const zone = btn.getAttribute("data-kp-assign") || "";
      const first = state.placement[0];
      if (!first) return;
      const target = document.querySelector(`[data-kp-zone="${zone}"]`);
      if (!target) return;
      const div = document.createElement("div");
      div.className = "m-draggable";
      div.textContent = `${first.name} (${first.type})`;
      target.append(div);
      M.addManagementTask(state.data, {
        title: `Button-Zuweisung: ${first.name}`,
        area: "Kapazitaetsplanung",
        priority: "normal",
        owner: "Disposition",
        dueDate: M.todayIso(),
        status: "offen",
        relation: zone,
        impact: "Zuweisung ueber barrierefreie Alternative"
      });
      state.data = M.loadState();
    });
  }

  function render() {
    const source = M.sourceSnapshot();
    renderMatrix(source);
    renderSpecial(source);
    renderGaps(source);
    renderPool(source);
  }

  document.addEventListener("DOMContentLoaded", () => {
    render();
    bindDnd();
    bindButtons();
  });
})();
