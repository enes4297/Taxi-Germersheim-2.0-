(() => {
  const M = window.AdminManagementDemo;
  const state = { data: M.loadState() };

  function build() {
    const type = (document.querySelector("[data-rp-type]") || {}).value || "Managementbericht";
    const period = (document.querySelector("[data-rp-period]") || {}).value || "today";
    const author = (document.querySelector("[data-rp-author]") || {}).value || "Geschaeftsleitung";
    const report = M.executiveReport(state.data, type, period);
    const node = document.querySelector("[data-rp-preview]");
    if (!node) return;

    node.innerHTML = `
      <h2>Taxi Germersheim GmbH</h2>
      <p><strong>${report.title}</strong></p>
      <p>Zeitraum: ${report.period} | erstellt am: ${report.createdAt} | erstellt durch: ${author}</p>
      <h3>Zusammenfassung</h3>
      <p>${report.summary.join("<br>")}</p>
      <h3>Kennzahlen</h3>
      <ul>${report.cards.slice(0, 10).map((c) => `<li>${c.label}: ${c.value} (${c.compare})</li>`).join("")}</ul>
      <h3>Risiken</h3>
      <ul>${report.risks.slice(0, 8).map((r) => `<li>${r.priority}: ${r.cause} -> ${r.action}</li>`).join("")}</ul>
      <h3>Massnahmen</h3>
      <ul>${report.actions.map((a) => `<li>${a}</li>`).join("")}</ul>
      <h3>Zielerreichung</h3>
      <ul>${report.goals.map((g) => `<li>${g.title}: ${g.status} (${g.progress})</li>`).join("")}</ul>
      <p><strong>Freigabestatus:</strong> ${report.approvals.status} ${report.approvals.by !== "-" ? `(${report.approvals.by})` : ""}</p>
      <p>${report.notes}</p>
    `;
  }

  function bind() {
    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-rp-build]")) {
        build();
        return;
      }

      if (event.target.closest("[data-rp-approve]")) {
        const author = (document.querySelector("[data-rp-author]") || {}).value || "Geschaeftsleitung";
        M.approveReport(state.data, author);
        state.data = M.loadState();
        build();
        return;
      }

      if (event.target.closest("[data-rp-export-btn]")) {
        const format = (document.querySelector("[data-rp-export]") || {}).value || "PDF";
        window.alert(`Demo-Export vorbereitet: ${format}. Keine rechtliche oder steuerliche Verwendbarkeit.`);
      }
    });

    document.addEventListener("change", (event) => {
      if (!event.target.closest("[data-rp-type],[data-rp-period]")) return;
      build();
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    build();
    bind();
  });
})();
