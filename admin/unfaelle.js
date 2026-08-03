(() => {
  const Q = window.AdminQualityDemo;
  const state = { data: Q.loadState() };

  function badge(v) {
    const p = Q.normalize(v || "normal");
    const cls = p.includes("krit") || p.includes("gesperrt") ? "kritisch" : p.includes("fehlt") || p.includes("pruefung") ? "wichtig" : "info";
    return `<span class="q-badge ${cls}">${v}</span>`;
  }

  function docsState(a) {
    const d = a.documents || {};
    const missing = Object.values(d).filter((v) => v === false).length;
    return missing ? `${missing} fehlt` : "vollstaendig";
  }

  function renderKpis() {
    const rows = state.data.accidents;
    const kpis = [
      ["offene Unfaelle", rows.filter((x) => !["abgeschlossen", "archiviert"].includes(x.status)).length],
      ["Fahrzeuge nicht fahrbereit", rows.filter((x) => x.drivable !== "Ja").length],
      ["Unfaelle diesen Monat", rows.filter((x) => String(x.date || "").startsWith(Q.todayIso().slice(0, 7))).length],
      ["offene Versicherungsfaelle als Demo", rows.filter((x) => x.opponentInsuranceDemo === "offen").length],
      ["fehlende Unterlagen", rows.filter((x) => docsState(x) !== "vollstaendig").length],
      ["Personenschaeden als Demo", rows.filter((x) => x.injuriesDemo === "Ja").length],
      ["Sachschaeden", rows.filter((x) => Boolean(x.ownVehicleDamage || x.thirdPartyDamage || x.objectDamage)).length],
      ["abgeschlossene Faelle", rows.filter((x) => ["abgeschlossen", "archiviert"].includes(x.status)).length]
    ];
    const node = document.querySelector("[data-acc-kpis]");
    if (!node) return;
    node.innerHTML = kpis.map((x) => `<article class="q-card"><small>${x[0]}</small><strong>${x[1]}</strong></article>`).join("");
  }

  function renderTable() {
    const body = document.querySelector("[data-acc-table]");
    if (!body) return;
    if (!state.data.accidents.length) {
      body.innerHTML = '<tr><td colspan="10">Keine Unfaelle vorhanden.</td></tr>';
      return;
    }
    body.innerHTML = state.data.accidents.map((a) => `<tr><td>${a.id}</td><td>${a.date} ${a.time}</td><td>${a.location}</td><td>${a.driver || "-"}</td><td>${a.vehicle || "-"}</td><td>${a.accidentType}</td><td>${a.drivable}</td><td>${badge(a.status)}</td><td>${docsState(a)}</td><td><button class="admin-btn admin-btn-secondary" type="button" data-acc-next="${a.id}">Status weiter</button></td></tr>`).join("");
  }

  function bind() {
    const form = document.querySelector("[data-acc-form]");
    if (form) {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const fd = new FormData(form);
        const payload = Object.fromEntries(fd.entries());
        Q.addAccident(state.data, payload);
        state.data = Q.loadState();
        renderKpis();
        renderTable();
        form.reset();
      });
    }

    document.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-acc-next]");
      if (!btn) return;
      const id = btn.getAttribute("data-acc-next") || "";
      const row = state.data.accidents.find((x) => x.id === id);
      if (!row) return;
      const flow = Q.ACCIDENT_STATUSES;
      const i = flow.indexOf(row.status);
      row.status = flow[(i + 1) % flow.length];
      Q.saveState(state.data);
      state.data = Q.loadState();
      renderKpis();
      renderTable();
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderKpis();
    renderTable();
    bind();
  });
})();
