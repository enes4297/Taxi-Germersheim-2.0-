(() => {
  const M = window.AdminManagementDemo;
  const state = { data: M.loadState() };

  function pill(v) {
    const n = M.normalize(v);
    const c = n.includes("krit") || n.includes("verfehlt") ? "kritisch" : n.includes("gefaehr") || n.includes("paus") ? "wichtig" : n.includes("erreicht") || n.includes("plan") ? "success" : "normal";
    return `<span class="m-pill ${c}">${v}</span>`;
  }

  function renderGoals() {
    const body = document.querySelector("[data-goal-table]");
    if (!body) return;
    body.innerHTML = state.data.goals.map((g) => {
      const progress = M.goalProgress(g);
      const trend = progress >= 100 ? "positiv" : progress >= 80 ? "stabil" : "negativ";
      const diff = Number(g.target || 0) - Number(g.current || 0);
      const next = g.measures || "Massnahme definieren";
      return `<tr><td>${g.title}</td><td>${g.category}</td><td>${pill(g.status)}</td><td>${progress}%</td><td>${trend}</td><td>${diff}</td><td>${next}</td><td>Massnahmen/Aufgaben/Qualitaetsfaelle</td></tr>`;
    }).join("");
  }

  function bind() {
    const form = document.querySelector("[data-goal-form]");
    if (form) {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(form).entries());
        data.description = "";
        M.addGoal(state.data, data);
        state.data = M.loadState();
        renderGoals();
        form.reset();
      });
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderGoals();
    bind();
  });
})();
