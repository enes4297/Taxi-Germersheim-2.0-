(() => {
  const M = window.AdminManagementDemo;
  const state = { data: M.loadState() };

  function cls(v) {
    const n = M.normalize(v);
    if (n.includes("krit")) return "kritisch";
    if (n.includes("engpass")) return "kritisch";
    if (n.includes("beob") || n.includes("wichtig") || n.includes("erhoeh")) return "wichtig";
    if (n.includes("erreicht") || n.includes("success")) return "success";
    return "normal";
  }

  function pill(value) {
    return `<span class="m-pill ${cls(value)}">${value}</span>`;
  }

  function renderStatus(source) {
    const node = document.querySelector("[data-gf-status]");
    if (!node) return;
    const s = M.managementStatus(state.data, source);
    node.innerHTML = `<p><strong>${pill(s.status)}</strong></p><p>Hauptursachen: ${s.causes.length ? s.causes.join(", ") : "keine kritischen Hinweise"}</p><p>Betroffene Bereiche: ${s.areas.length ? s.areas.join(", ") : "-"}</p><p>Empfohlene Aktionen: ${s.actions.join(" | ")}</p>`;
  }

  function renderKpis(source) {
    const node = document.querySelector("[data-gf-kpis]");
    if (!node) return;
    const cards = M.metricCards(state.data, source);
    node.innerHTML = cards.map((c) => `<article class="m-card"><small>${c.label}</small><strong>${c.value}</strong><div class="m-meta">Vergleich: ${c.compare}<br>Trend: ${c.trend}<br>Status: ${pill(c.status)}<br>${c.info}</div></article>`).join("");
  }

  function renderTimeline(source) {
    const body = document.querySelector("[data-gf-timeline]");
    if (!body) return;
    const rows = M.todayTimeline(state.data, source);
    body.innerHTML = rows.map((r) => `<tr><td>${r.block}</td><td>${r.planned}</td><td>${r.expectedExtra}</td><td>${r.driversAvail}</td><td>${r.vehiclesAvail}</td><td>${r.medical}</td><td>${r.series}</td><td>${r.airport}</td><td>${r.school}</td><td>${r.utilization}%</td><td>${pill(r.status)}</td></tr>`).join("");
  }

  function renderWarnings(source) {
    const node = document.querySelector("[data-gf-warnings]");
    if (!node) return;
    const rows = M.buildWarnings(state.data, source);
    node.innerHTML = rows.length ? rows.map((w) => `<article class="m-item"><p>${pill(w.priority)}</p><p><strong>${w.cause}</strong></p><p>Auswirkung: ${w.impact}</p><p>Maßnahme: ${w.action}</p><p>Zuständig: ${w.area}</p><p><a class="admin-btn admin-btn-secondary" href="${w.link}">Direkt öffnen</a></p></article>`).join("") : '<article class="m-item"><p>Keine Warnungen.</p></article>';
  }

  function renderFavorites() {
    const node = document.querySelector("[data-gf-favorites]");
    if (!node) return;
    const names = ["Live-Dispo", "Fahrzeugstatus", "Personalstatus", "offene Forderungen", "kritische Beschwerden", "Monatsziel", "heutige Auslastung", "offene Entscheidungen"];
    const set = new Set(state.data.favorites || []);
    node.innerHTML = names.map((n) => `<article class="m-card"><small>${n}</small><strong>${set.has(n) ? "angeheftet" : "nicht angeheftet"}</strong><button class="admin-btn" type="button" data-gf-fav="${n}">${set.has(n) ? "entfernen" : "anheften"}</button></article>`).join("");
  }

  function render() {
    const source = M.sourceSnapshot();
    renderStatus(source);
    renderKpis(source);
    renderTimeline(source);
    renderWarnings(source);
    renderFavorites();
  }

  function bind() {
    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-gf-reset]")) {
        if (!window.confirm("Management-Demo wirklich zurücksetzen?")) return;
        state.data = M.resetState();
        render();
        return;
      }

      if (event.target.closest("[data-gf-mode]")) {
        const main = document.querySelector("[data-gf-main]");
        if (!main) return;
        const btn = event.target.closest("[data-gf-mode]");
        const compact = main.classList.toggle("m-compact");
        if (btn) btn.textContent = compact ? "Details anzeigen" : "Geschäftsleitungsansicht";
        state.data.filters.managementMode = compact ? "compact" : "detail";
        M.saveState(state.data);
        return;
      }

      const fav = event.target.closest("[data-gf-fav]");
      if (fav) {
        const name = fav.getAttribute("data-gf-fav") || "";
        const set = new Set(state.data.favorites || []);
        M.setFavorite(state.data, name, !set.has(name));
        state.data = M.loadState();
        renderFavorites();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    const main = document.querySelector("[data-gf-main]");
    if (main && state.data.filters.managementMode !== "detail") main.classList.add("m-compact");
    else if (main) main.classList.remove("m-compact");
    render();
    bind();
  });
})();
