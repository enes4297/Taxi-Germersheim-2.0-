(() => {
  const Q = window.AdminQualityDemo;
  const state = { data: Q.loadState() };

  function badge(priority) {
    const p = Q.normalize(priority || "normal");
    const cls = p.includes("krit") ? "kritisch" : p.includes("wichtig") ? "wichtig" : p.includes("info") ? "info" : "normal";
    return `<span class="q-badge ${cls}">${priority}</span>`;
  }

  function fillCategories() {
    const node = document.querySelector("[data-inc-cat-input]");
    if (!node) return;
    node.innerHTML = Q.INCIDENT_CATEGORIES.map((x) => `<option>${x}</option>`).join("");
  }

  function renderTable() {
    const body = document.querySelector("[data-inc-table]");
    if (!body) return;
    if (!state.data.incidents.length) {
      body.innerHTML = '<tr><td colspan="10">Keine Vorfaelle vorhanden.</td></tr>';
      return;
    }
    body.innerHTML = state.data.incidents.map((x) => `<tr><td>${x.id}</td><td>${x.date} ${x.time}</td><td>${x.category}</td><td>${badge(x.priority)}</td><td>${x.driver || "-"}</td><td>${x.vehicle || "-"}</td><td>${x.rideId || "-"}</td><td>${x.status}</td><td>${x.dueDate || "-"}</td><td><button class="admin-btn admin-btn-secondary" type="button" data-inc-next="${x.id}">Status weiter</button></td></tr>`).join("");
  }

  function bind() {
    const form = document.querySelector("[data-inc-form]");
    if (form) {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const fd = new FormData(form);
        const payload = Object.fromEntries(fd.entries());
        if (payload.category === "Beinaheunfall") {
          payload.nearMiss = {
            danger: String(fd.get("danger") || ""),
            possibleImpact: String(fd.get("possibleImpact") || ""),
            whyNoAccident: String(fd.get("whyNoAccident") || ""),
            weatherDemo: String(fd.get("weatherDemo") || ""),
            traffic: String(fd.get("traffic") || ""),
            prevention: String(fd.get("prevention") || "")
          };
        }
        if (payload.category === "medizinischer Zwischenfall") {
          payload.medical = {
            note: String(fd.get("medicalNote") || ""),
            warning: "Bei akuten medizinischen Notfaellen immer 112 anrufen."
          };
        }
        Q.addIncident(state.data, payload);
        state.data = Q.loadState();
        renderTable();
        form.reset();
      });
    }

    document.addEventListener("click", (event) => {
      const next = event.target.closest("[data-inc-next]");
      if (!next) return;
      const id = next.getAttribute("data-inc-next") || "";
      const row = state.data.incidents.find((x) => x.id === id);
      if (!row) return;
      const flow = Q.INCIDENT_STATUSES;
      const i = flow.indexOf(row.status);
      row.status = flow[(i + 1) % flow.length];
      Q.saveState(state.data);
      state.data = Q.loadState();
      renderTable();
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    fillCategories();
    renderTable();
    bind();
  });
})();
