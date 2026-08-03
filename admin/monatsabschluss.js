(() => {
  const F = window.AdminFinanceDemo;
  const state = { data: F.loadState() };

  function statusBadge(text) {
    const n = F.normalize(text);
    const cls = n.includes("erledigt") || n.includes("geklaert") ? "ok" : n.includes("bearbeitung") ? "warn" : n.includes("block") || n.includes("offen") ? "crit" : "info";
    return `<span class="finance-status ${cls}">${text}</span>`;
  }

  function renderChecklist() {
    const body = document.querySelector("[data-month-check-table]");
    if (!body) return;
    body.innerHTML = state.data.monthlyChecklist.map((x) => `<tr><td>${x.label}</td><td>${statusBadge(x.status)}</td><td><button class="admin-btn admin-btn-secondary" type="button" data-month-task="${x.id}">Status wechseln</button></td></tr>`).join("");
  }

  function renderProblems() {
    const body = document.querySelector("[data-month-problem-table]");
    if (!body) return;
    body.innerHTML = state.data.monthBlocks.map((x) => `<tr><td>${x.kind}</td><td>${x.ref}</td><td>${x.owner}</td><td>${statusBadge(x.status)}</td><td><button class="admin-btn" type="button" data-month-problem="${x.id}">Als geklaert</button></td></tr>`).join("");
  }

  function renderReport() {
    const rides = state.data.rides;
    const invoices = state.data.invoices;
    const payments = state.data.payments;
    const costs = state.data.costs;
    const report = [
      ["Gesamtumsatz", F.formatEuro(rides.reduce((s, r) => s + Number(r.cashAmount || 0) + Number(r.cardAmount || 0) + Number(r.invoiceAmount || 0), 0))],
      ["Gesamtfahrten", rides.length],
      ["Umsatz nach Fahrtart", "in Tabelle Controlling ersichtlich"],
      ["Einnahmen nach Zahlungsart", "Bar/Karte/Rechnung/Krankenkasse"],
      ["offene Forderungen", F.formatEuro(invoices.reduce((s, i) => s + Number(i.open || 0), 0))],
      ["Krankenkassenabrechnungen", state.data.insurerBatches.length],
      ["Firmenrechnungen", invoices.filter((i) => i.kind === "Firmenkunde").length],
      ["Kosten", F.formatEuro(costs.reduce((s, c) => s + Number(c.amount || 0), 0))],
      ["Fahrzeugkennzahlen", "siehe Controlling Fahrzeugvergleich"],
      ["Fahrerkennzahlen", "siehe Kasse/Schicht/Controlling"],
      ["besondere Ereignisse", state.data.notifications.slice(0, 3).map((n) => n.title).join(", ")],
      ["offene Risiken", state.data.monthBlocks.filter((m) => m.status !== "geklaert").length],
      ["Vergleich zum Vormonat", `${F.getComparativePct(rides.length, 24)} % Fahrten`]
    ];
    const node = document.querySelector("[data-month-report]");
    if (!node) return;
    node.innerHTML = report.map((r) => `<article class="finance-item"><strong>${r[0]}</strong><p>${r[1]}</p></article>`).join("");
  }

  function openModal(title, body, foot) {
    const m = document.querySelector("[data-month-modal]");
    const t = document.querySelector("[data-month-modal-title]");
    const b = document.querySelector("[data-month-modal-body]");
    const f = document.querySelector("[data-month-modal-foot]");
    if (!m || !t || !b || !f) return;
    t.textContent = title;
    b.innerHTML = body;
    f.innerHTML = foot || '<button class="admin-btn admin-btn-secondary" type="button" data-month-close>Schliessen</button>';
    m.hidden = false;
  }

  function closeModal() {
    const m = document.querySelector("[data-month-modal]");
    if (m) m.hidden = true;
  }

  function bind() {
    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-month-close]")) {
        closeModal();
        return;
      }

      const task = event.target.closest("[data-month-task]");
      if (task) {
        const row = state.data.monthlyChecklist.find((x) => x.id === task.getAttribute("data-month-task"));
        if (!row) return;
        row.status = row.status === "offen" ? "in Bearbeitung" : row.status === "in Bearbeitung" ? "erledigt" : "offen";
        F.saveState(state.data);
        renderChecklist();
        return;
      }

      const p = event.target.closest("[data-month-problem]");
      if (p) {
        const row = state.data.monthBlocks.find((x) => x.id === p.getAttribute("data-month-problem"));
        if (!row) return;
        row.status = "geklaert";
        F.saveState(state.data);
        renderProblems();
        return;
      }

      if (event.target.closest("[data-close-month]")) {
        const openCritical = state.data.monthBlocks.filter((x) => x.status !== "geklaert").length;
        const openHints = state.data.monthlyChecklist.filter((x) => x.status !== "erledigt").length;
        openModal(
          "Monat abschliessen",
          `<p>Monat: ${F.todayIso().slice(0, 7)}</p><p>Offene Hinweise: ${openHints}</p><p>Kritische Fehler: ${openCritical}</p><p>Diese Aktion setzt nur einen Demo-Status.</p>`,
          '<button class="admin-btn admin-btn-danger" type="button" data-confirm-close-month>Bestaetigen</button><button class="admin-btn admin-btn-secondary" type="button" data-month-close>Abbrechen</button>'
        );
        return;
      }

      if (event.target.closest("[data-confirm-close-month]")) {
        state.data.ui.monthClosed = true;
        state.data.ui.monthClosedAt = new Date().toISOString();
        state.data.ui.closedMonthKey = F.todayIso().slice(0, 7);
        F.saveState(state.data);
        closeModal();
        openModal("Monat abgeschlossen", "<p>Demo-Monatsabschluss wurde gesetzt.</p>");
        return;
      }

      if (event.target.closest("[data-reopen-month]")) {
        openModal("Abschluss wieder oeffnen", "<p>Sicherheitsabfrage: Monat wieder oeffnen?</p>", '<button class="admin-btn admin-btn-warning" type="button" data-confirm-reopen-month>Bestaetigen</button><button class="admin-btn admin-btn-secondary" type="button" data-month-close>Abbrechen</button>');
        return;
      }

      if (event.target.closest("[data-confirm-reopen-month]")) {
        state.data.ui.monthClosed = false;
        state.data.ui.monthClosedAt = "";
        state.data.ui.closedMonthKey = "";
        F.saveState(state.data);
        closeModal();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderChecklist();
    renderProblems();
    renderReport();
    bind();
  });
})();
