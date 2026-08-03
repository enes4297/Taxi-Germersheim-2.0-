(() => {
  const Q = window.AdminQualityDemo;
  const state = { data: Q.loadState() };

  function badge(value) {
    const n = Q.normalize(value || "");
    const cls = n.includes("krit") || n.includes("nicht wirksam") || n.includes("abgebrochen") ? "kritisch" : n.includes("bearbeitung") || n.includes("wartet") || n.includes("wirksamkeit") ? "wichtig" : "info";
    return `<span class="q-badge ${cls}">${value}</span>`;
  }

  function renderActions() {
    const body = document.querySelector("[data-act-table]");
    if (!body) return;
    if (!state.data.actions.length) {
      body.innerHTML = '<tr><td colspan="10">Keine Massnahmen vorhanden.</td></tr>';
      return;
    }
    body.innerHTML = state.data.actions.map((x) => `<tr><td>${x.id}</td><td>${x.title}</td><td>${x.type}</td><td>${x.source} ${x.sourceId || ""}</td><td>${x.owner}</td><td>${x.dueDate || "-"}</td><td>${badge(x.priority)}</td><td>${badge(x.status)}</td><td>${x.escalation || "-"}</td><td><div class="q-actions"><button class="admin-btn" type="button" data-act-next="${x.id}">Status weiter</button><button class="admin-btn admin-btn-secondary" type="button" data-act-eff="${x.id}">Wirksamkeit</button></div></td></tr>`).join("");
  }

  function renderCauses() {
    const node = document.querySelector("[data-cause-list]");
    if (!node) return;
    if (!state.data.rootCauses.length) {
      node.innerHTML = '<article class="q-item">Keine Ursachenanalysen vorhanden.</article>';
      return;
    }
    node.innerHTML = state.data.rootCauses.map((r) => `<article class="q-item"><strong>${r.id} · ${r.sourceType} ${r.sourceId}</strong><p>Problem: ${r.problem}</p><p>Hauptursache: ${r.mainCause} (${r.category})</p><p>Empfohlene Massnahme: ${r.recommendedAction || "-"}</p><p>Warum-Kette: ${[r.why1, r.why2, r.why3, r.why4, r.why5].filter(Boolean).join(" -> ") || "-"}</p></article>`).join("");
  }

  function bind() {
    const form = document.querySelector("[data-act-form]");
    if (form) {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        Q.addAction(state.data, Object.fromEntries(new FormData(form).entries()));
        state.data = Q.loadState();
        renderActions();
        form.reset();
      });
    }

    const causeForm = document.querySelector("[data-cause-form]");
    if (causeForm) {
      causeForm.addEventListener("submit", (event) => {
        event.preventDefault();
        Q.addRootCause(state.data, Object.fromEntries(new FormData(causeForm).entries()));
        state.data = Q.loadState();
        renderCauses();
        causeForm.reset();
      });
    }

    document.addEventListener("click", (event) => {
      const next = event.target.closest("[data-act-next]");
      if (next) {
        const id = next.getAttribute("data-act-next") || "";
        const row = state.data.actions.find((x) => x.id === id);
        if (!row) return;
        const flow = Q.ACTION_STATUSES;
        const i = flow.indexOf(row.status);
        Q.setActionStatus(state.data, id, flow[(i + 1) % flow.length]);
        state.data = Q.loadState();
        renderActions();
        return;
      }

      const eff = event.target.closest("[data-act-eff]");
      if (!eff) return;
      const id = eff.getAttribute("data-act-eff") || "";
      const row = state.data.actions.find((x) => x.id === id);
      if (!row) return;
      const opts = ["wirksam", "teilweise wirksam", "nicht wirksam", "weitere Beobachtung"];
      const current = opts.indexOf(row.effectiveness);
      const nextResult = opts[(current + 1 + opts.length) % opts.length];
      Q.evaluateEffectiveness(state.data, id, { result: nextResult, note: `Automatische Demo-Bewertung: ${nextResult}` });
      state.data = Q.loadState();
      renderActions();
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderActions();
    renderCauses();
    bind();
  });
})();
