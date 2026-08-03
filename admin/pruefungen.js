(() => {
  const Q = window.AdminQualityDemo;
  const state = { data: Q.loadState() };

  function badge(value) {
    const n = Q.normalize(value || "");
    const cls = n.includes("krit") || n.includes("mangel") ? "kritisch" : n.includes("faellig") || n.includes("nachpr") ? "wichtig" : "info";
    return `<span class="q-badge ${cls}">${value || "-"}</span>`;
  }

  function renderTable() {
    const body = document.querySelector("[data-pr-table]");
    if (!body) return;
    if (!state.data.inspections.length) {
      body.innerHTML = '<tr><td colspan="11">Keine Pruefungen vorhanden.</td></tr>';
      return;
    }
    body.innerHTML = state.data.inspections.map((x) => `<tr><td>${x.type}</td><td>${x.area}</td><td>${x.target || "-"}</td><td>${x.owner}</td><td>${x.dueDate || "-"}</td><td>${x.interval}</td><td>${x.lastCheck || "-"}</td><td>${x.nextCheck || "-"}</td><td>${badge(x.status)}</td><td>${badge(x.result || "offen")}</td><td><div class="q-actions"><button class="admin-btn" type="button" data-pr-run="${x.id}">durchfuehren</button><button class="admin-btn admin-btn-secondary" type="button" data-pr-recheck="${x.id}">Nachpruefung</button></div></td></tr>`).join("");
  }

  function openModal(title, body, foot) {
    const m = document.querySelector("[data-pr-modal]");
    const t = document.querySelector("[data-pr-modal-title]");
    const b = document.querySelector("[data-pr-modal-body]");
    const f = document.querySelector("[data-pr-modal-foot]");
    if (!m || !t || !b || !f) return;
    t.textContent = title;
    b.innerHTML = body;
    f.innerHTML = foot || '<button class="admin-btn admin-btn-secondary" type="button" data-pr-close>Schliessen</button>';
    m.hidden = false;
  }

  function closeModal() {
    const m = document.querySelector("[data-pr-modal]");
    if (m) m.hidden = true;
  }

  function bind() {
    const planForm = document.querySelector("[data-pr-plan-form]");
    if (planForm) {
      planForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const fd = new FormData(planForm);
        const payload = Object.fromEntries(fd.entries());
        payload.checklist = String(fd.get("checklist") || "").split(",").map((x) => x.trim()).filter(Boolean);
        Q.addInspection(state.data, payload);
        state.data = Q.loadState();
        renderTable();
        planForm.reset();
      });
    }

    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-pr-close]")) {
        closeModal();
        return;
      }

      const run = event.target.closest("[data-pr-run]");
      if (run) {
        const id = run.getAttribute("data-pr-run") || "";
        const row = state.data.inspections.find((x) => x.id === id);
        if (!row) return;
        openModal("Pruefung durchfuehren", `<form class="q-form-grid" data-pr-run-form><input type="hidden" name="id" value="${id}"><label>Pruefart<input name="type" value="${row.type}" readonly></label><label>Pruefer<input name="inspector" value="${row.owner}"></label><label>Datum<input type="date" name="date" value="${Q.todayIso()}"></label><label>Uhrzeit<input type="time" name="time"></label><label>Pruefobjekt<input name="target" value="${row.target || ""}"></label><label>Ergebnis<select name="result"><option>bestanden</option><option>bestanden mit Hinweis</option><option>Mangel</option><option>kritisch</option><option>Nachpruefung erforderlich</option></select></label><label>Maengel<input name="findings"></label><label>Massnahme erforderlich<select name="needsAction"><option>Nein</option><option>Ja</option></select></label><label>Frist<input type="date" name="dueDate"></label><label>Verantwortlicher<input name="responsible" value="${row.owner}"></label><label>Demo-Anhang<input name="attachment"></label><label>Unterschrift als Demo<input name="signatureDemo" value="Demo-Signatur"></label><label>naechste Pruefung<input type="date" name="nextCheck" value="${row.nextCheck || ""}"></label></form>`, `<button class="admin-btn" type="button" data-pr-run-save>Speichern</button><button class="admin-btn admin-btn-secondary" type="button" data-pr-close>Abbrechen</button>`);
        return;
      }

      const recheck = event.target.closest("[data-pr-recheck]");
      if (recheck) {
        const id = recheck.getAttribute("data-pr-recheck") || "";
        openModal("Nachpruefung anlegen", `<form class="q-form-grid" data-pr-recheck-form><input type="hidden" name="id" value="${id}"><label>Frist<input type="date" name="dueDate" value="${Q.todayIso()}"></label><label>Verantwortlicher<input name="owner" value="Qualitaetsmanagement"></label><label>Bereich sperren als Demo<select name="blockedAreaDemo"><option>Nein</option><option>Ja</option></select></label><label class="full">Notiz<input name="note"></label></form>`, `<button class="admin-btn" type="button" data-pr-recheck-save>Nachpruefung speichern</button><button class="admin-btn admin-btn-secondary" type="button" data-pr-close>Abbrechen</button>`);
        return;
      }

      if (event.target.closest("[data-pr-run-save]")) {
        const form = document.querySelector("[data-pr-run-form]");
        if (!form) return;
        const fd = new FormData(form);
        const id = String(fd.get("id") || "");
        Q.performInspection(state.data, id, Object.fromEntries(fd.entries()));
        state.data = Q.loadState();
        renderTable();
        closeModal();
        return;
      }

      if (event.target.closest("[data-pr-recheck-save]")) {
        const form = document.querySelector("[data-pr-recheck-form]");
        if (!form) return;
        const fd = new FormData(form);
        const id = String(fd.get("id") || "");
        Q.scheduleReinspection(state.data, id, Object.fromEntries(fd.entries()));
        state.data = Q.loadState();
        renderTable();
        closeModal();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderTable();
    bind();
  });
})();
