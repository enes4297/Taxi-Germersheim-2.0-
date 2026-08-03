(() => {
  const M = window.AdminManagementDemo;
  const state = { data: M.loadState() };
  const flow = ["Entwurf", "Informationen fehlen", "in Pruefung", "Geschaeftsleitung prueft", "beschlossen", "abgelehnt", "zurueckgestellt", "umgesetzt", "Wirksamkeit pruefen"];

  function pill(v) {
    const n = M.normalize(v);
    const c = n.includes("abgelehnt") ? "kritisch" : n.includes("pruef") || n.includes("fehlen") ? "wichtig" : n.includes("beschlossen") || n.includes("umgesetzt") ? "success" : "normal";
    return `<span class="m-pill ${c}">${v}</span>`;
  }

  function render() {
    const node = document.querySelector("[data-dc-list]");
    if (!node) return;
    node.innerHTML = state.data.decisions.map((d) => {
      const opt = (d.options && d.options[0]) || {};
      return `<article class="m-item"><strong>${d.title}</strong><p>${pill(d.status)} · Frist: ${d.dueDate}</p><p>Ausgangslage: ${d.situation || "-"}</p><p>Ziel: ${d.target || "-"}</p><p>Option: ${opt.label || "-"}</p><p>Nutzen ${opt.benefit || 0} / Risiko ${opt.risk || 0} / Aufwand ${opt.effort || 0}</p><p>Umsetzung: ${opt.duration || "-"}, Kapazitaetsaenderung: ${opt.capacityDelta || 0}</p><p>Demo-Kosten: ${d.costDemo || 0} EUR · Demo-Ertrag: ${d.benefitDemo || 0} EUR</p><p>Empfehlung: ${d.recommendation || "-"}</p><div class="m-actions"><button class="admin-btn" type="button" data-dc-next="${d.id}">Status weiter</button><button class="admin-btn admin-btn-secondary" type="button" data-dc-log="${d.id}">Verlauf anzeigen</button></div></article>`;
    }).join("");
  }

  function bind() {
    const form = document.querySelector("[data-dc-form]");
    if (form) {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        M.addDecision(state.data, Object.fromEntries(new FormData(form).entries()));
        state.data = M.loadState();
        render();
        form.reset();
      });
    }

    document.addEventListener("click", (event) => {
      const next = event.target.closest("[data-dc-next]");
      if (next) {
        const id = next.getAttribute("data-dc-next") || "";
        const row = state.data.decisions.find((d) => d.id === id);
        if (!row) return;
        const i = flow.indexOf(row.status);
        const status = flow[(i + 1 + flow.length) % flow.length];
        M.setDecisionStatus(state.data, id, status, "Geschaeftsleitung", "Statuszyklus Demo");
        state.data = M.loadState();
        render();
        return;
      }

      const log = event.target.closest("[data-dc-log]");
      if (!log) return;
      const id = log.getAttribute("data-dc-log") || "";
      const row = state.data.decisions.find((d) => d.id === id);
      if (!row) return;
      const text = (row.history || []).map((h) => `${h.at} | ${h.by} | ${h.action} | ${h.reason}`).join("\n") || "kein Verlauf";
      window.alert(text);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    render();
    bind();
  });
})();
