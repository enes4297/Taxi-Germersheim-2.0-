(() => {
  const F = window.AdminFinanceDemo;
  const state = { data: F.loadState() };

  function badge(level) {
    const n = F.normalize(level);
    const c = n.includes("letzte") || n.includes("inkasso") ? "crit" : n.includes("zweite") || n.includes("erste") ? "warn" : "info";
    return `<span class="finance-status ${c}">${level}</span>`;
  }

  function renderKpis() {
    const list = state.data.reminders;
    const kpis = [
      ["offene Rechnungen", list.length],
      ["faellig in 7 Tagen", list.filter((x) => x.overdueDays === 0).length],
      ["ueberfaellig", list.filter((x) => x.overdueDays > 0).length],
      ["erste Mahnung", list.filter((x) => x.stage === "erste Mahnung").length],
      ["zweite Mahnung", list.filter((x) => x.stage === "zweite Mahnung").length],
      ["letzte Mahnung", list.filter((x) => x.stage === "letzte Mahnung").length],
      ["strittige Rechnungen", list.filter((x) => x.stage === "Inkasso pruefen").length],
      ["Gesamtbetrag ueberfaellig", F.formatEuro(list.reduce((s, x) => s + (x.overdueDays > 0 ? Number(x.open || 0) : 0), 0))]
    ];
    const node = document.querySelector("[data-rem-kpis]");
    if (!node) return;
    node.innerHTML = kpis.map((k) => `<article class="finance-kpi"><small>${k[0]}</small><strong>${k[1]}</strong></article>`).join("");
  }

  function renderTable() {
    const body = document.querySelector("[data-rem-table]");
    if (!body) return;
    body.innerHTML = state.data.reminders.map((r) => `<tr><td>${r.invoiceId}</td><td>${r.customer}</td><td>${r.invoiceDate}</td><td>${r.dueDate}</td><td>${F.formatEuro(r.amount)}</td><td>${F.formatEuro(r.paid)}</td><td>${F.formatEuro(r.open)}</td><td>${r.overdueDays}</td><td>${badge(r.stage)}</td><td>${r.lastContact}</td><td>${r.owner}</td><td><button class="admin-btn" type="button" data-rem-open="${r.id}">Mahnung erstellen</button></td></tr>`).join("");
  }

  function openModal(title, body) {
    const m = document.querySelector("[data-rem-modal]");
    const t = document.querySelector("[data-rem-title]");
    const b = document.querySelector("[data-rem-body]");
    if (!m || !t || !b) return;
    t.textContent = title;
    b.innerHTML = body;
    m.hidden = false;
  }

  function closeModal() {
    const m = document.querySelector("[data-rem-modal]");
    if (m) m.hidden = true;
  }

  function bind() {
    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-rem-close]")) {
        closeModal();
        return;
      }
      const btn = event.target.closest("[data-rem-open]");
      if (!btn) return;
      const row = state.data.reminders.find((x) => x.id === btn.getAttribute("data-rem-open"));
      if (!row) return;
      row.stage = row.stage === "Erinnerung" ? "erste Mahnung" : row.stage === "erste Mahnung" ? "zweite Mahnung" : row.stage;
      F.saveState(state.data);
      renderKpis();
      renderTable();
      openModal(`Mahnung ${row.invoiceId}`, `<div class="finance-list"><article class="finance-item"><strong>Mahnung erstellen (Demo)</strong><p>Mahnstufe: ${row.stage}</p><p>Mahngebuehr: ${F.formatEuro(row.stage === "Erinnerung" ? 0 : row.stage === "erste Mahnung" ? 5 : 10)}</p><p>Neue Zahlungsfrist: +7 Tage</p><p>Interner Kommentar: automatisch erstellt</p><p>Aktionen: Vorschau, als versendet markieren, Wiedervorlage erstellen.</p></article><article class="finance-item"><strong>Zahlungsvereinbarung</strong><p>Gesamtbetrag: ${F.formatEuro(row.open)}</p><p>Anzahlung: ${F.formatEuro(row.open * 0.3)}</p><p>Ratenhoehe: ${F.formatEuro(row.open * 0.2)}</p><p>Intervall: monatlich</p><p>Status: vorgeschlagen</p></article></div>`);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderKpis();
    renderTable();
    bind();
  });
})();
