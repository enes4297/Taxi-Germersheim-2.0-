(() => {
  const F = window.AdminFinanceDemo;
  const state = { data: F.loadState() };

  function badge(text) {
    const t = F.normalize(text);
    const c = t.includes("krit") ? "crit" : t.includes("wichtig") || t.includes("bearbeitung") || t.includes("zugewiesen") ? "warn" : t.includes("geklaert") || t.includes("geschlossen") ? "ok" : "info";
    return `<span class="finance-status ${c}">${text}</span>`;
  }

  function renderCategories() {
    const counts = {};
    state.data.checkCases.forEach((c) => {
      counts[c.category] = (counts[c.category] || 0) + 1;
    });
    const node = document.querySelector("[data-case-cats]");
    if (!node) return;
    node.innerHTML = Object.entries(counts).map(([k, v]) => `<span class="finance-chip">${k}: ${v}</span>`).join("");
  }

  function renderTable() {
    const body = document.querySelector("[data-case-table]");
    if (!body) return;
    if (!state.data.checkCases.length) {
      body.innerHTML = '<tr><td colspan="14">Keine Faelle vorhanden.</td></tr>';
      return;
    }
    body.innerHTML = state.data.checkCases.map((c) => `<tr><td>${c.id}</td><td>${c.category}</td><td>${badge(c.priority)}</td><td>${c.customer}</td><td>${c.driver}</td><td>${c.vehicle}</td><td>${c.ride}</td><td>${c.invoice || "-"}</td><td>${F.formatEuro(c.amount)}</td><td>${c.createdAt}</td><td>${c.owner}</td><td>${c.dueAt}</td><td>${badge(c.status)}</td><td><button class="admin-btn admin-btn-secondary" type="button" data-case-open="${c.id}">Bearbeiten</button></td></tr>`).join("");
  }

  function openModal(title, body, foot) {
    const m = document.querySelector("[data-case-modal]");
    const t = document.querySelector("[data-case-title]");
    const b = document.querySelector("[data-case-body]");
    const f = document.querySelector("[data-case-foot]");
    if (!m || !t || !b || !f) return;
    t.textContent = title;
    b.innerHTML = body;
    f.innerHTML = foot || '<button class="admin-btn admin-btn-secondary" type="button" data-case-close>Schliessen</button>';
    m.hidden = false;
  }

  function closeModal() {
    const m = document.querySelector("[data-case-modal]");
    if (m) m.hidden = true;
  }

  function bind() {
    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-case-close]")) {
        closeModal();
        return;
      }

      const open = event.target.closest("[data-case-open]");
      if (!open) return;
      const row = state.data.checkCases.find((x) => x.id === open.getAttribute("data-case-open"));
      if (!row) return;

      openModal(
        `Fall ${row.id}`,
        `<div class="finance-list"><article class="finance-item"><strong>${row.category}</strong><p>Prioritaet: ${row.priority}</p><p>Ursache: ${row.cause}</p><p>Wert: ${row.value}</p><p>Notiz: ${row.note}</p><p>Verlauf: ${(row.timeline || []).join("<br>")}</p></article><article class="finance-item"><strong>Aufgabenzuweisung</strong><p>Aktuell: ${row.owner}</p><p>Verfuegbar: ${F.ASSIGNEES.join(", ")}</p></article></div>`,
        `<div class="finance-compact-actions"><button class="admin-btn" type="button" data-case-action="assign" data-case-id="${row.id}">Neu zuweisen</button><button class="admin-btn admin-btn-secondary" type="button" data-case-action="work" data-case-id="${row.id}">In Bearbeitung</button><button class="admin-btn admin-btn-secondary" type="button" data-case-action="wait" data-case-id="${row.id}">Wartet auf Rueckmeldung</button><button class="admin-btn admin-btn-primary" type="button" data-case-action="clear" data-case-id="${row.id}">Als geklaert</button><button class="admin-btn admin-btn-warning" type="button" data-case-action="close" data-case-id="${row.id}">Schliessen</button></div>`
      );
    });

    document.addEventListener("click", (event) => {
      const action = event.target.closest("[data-case-action]");
      if (!action) return;
      const id = action.getAttribute("data-case-id") || "";
      const kind = action.getAttribute("data-case-action") || "";
      const row = state.data.checkCases.find((x) => x.id === id);
      if (!row) return;

      if (kind === "assign") {
        const index = (F.ASSIGNEES.indexOf(row.owner) + 1) % F.ASSIGNEES.length;
        row.owner = F.ASSIGNEES[index];
        row.status = "zugewiesen";
      } else if (kind === "work") {
        row.status = "in Bearbeitung";
      } else if (kind === "wait") {
        row.status = "wartet auf Rueckmeldung";
      } else if (kind === "clear") {
        row.status = "geklaert";
      } else if (kind === "close") {
        row.status = "geschlossen";
      }

      F.addCaseNote(state.data, row.id, `Status geaendert: ${row.status}`);
      F.saveState(state.data);
      renderCategories();
      renderTable();
      closeModal();
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderCategories();
    renderTable();
    bind();
  });
})();
