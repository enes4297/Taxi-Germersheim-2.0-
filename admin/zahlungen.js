(() => {
  const F = window.AdminFinanceDemo;
  const state = { data: F.loadState() };

  function badge(text) {
    const t = F.normalize(text);
    const cls = t.includes("ungeklaert") || t.includes("fehl") || t.includes("zurueck") ? "crit" : t.includes("teil") || t.includes("erwartet") ? "warn" : "ok";
    return `<span class="finance-status ${cls}">${text}</span>`;
  }

  function renderKpis() {
    const p = state.data.payments;
    const today = F.todayIso();
    const day = p.filter((x) => x.date === today);
    const week = p.filter((x) => F.getRangeFilter(x.date, "diese Woche"));
    const month = p.filter((x) => F.getRangeFilter(x.date, "dieser Monat"));
    const kpis = [
      ["Einnahmen heute", F.formatEuro(day.reduce((s, x) => s + Number(x.amount || 0), 0))],
      ["Einnahmen diese Woche", F.formatEuro(week.reduce((s, x) => s + Number(x.amount || 0), 0))],
      ["Einnahmen diesen Monat", F.formatEuro(month.reduce((s, x) => s + Number(x.amount || 0), 0))],
      ["Barzahlungen", p.filter((x) => x.paymentType === "Bar").length],
      ["Kartenzahlungen", p.filter((x) => x.paymentType === "Karte").length],
      ["Rechnungszahlungen", p.filter((x) => x.paymentType === "Rechnung").length],
      ["Krankenkassenzahlungen", p.filter((x) => x.paymentType === "Krankenkasse").length],
      ["offene Zahlungen", p.filter((x) => x.status === "erwartet" || x.status === "ungeklaert").length],
      ["Rueckerstattungen", p.filter((x) => x.status === "erstattet").length],
      ["ungeklaerte Differenzen", p.filter((x) => x.status === "ungeklaert").length]
    ];
    const node = document.querySelector("[data-pay-kpis]");
    if (!node) return;
    node.innerHTML = kpis.map((k) => `<article class="finance-kpi"><small>${k[0]}</small><strong>${k[1]}</strong></article>`).join("");
  }

  function renderPayments() {
    const body = document.querySelector("[data-pay-table]");
    if (!body) return;
    body.innerHTML = state.data.payments.map((x) => `<tr><td>${x.id}</td><td>${x.date}</td><td>${x.time}</td><td>${F.formatEuro(x.amount)}</td><td>${x.paymentType}</td><td>${x.customer}</td><td>${x.orderNo}</td><td>${x.invoiceId || "-"}</td><td>${x.driver}</td><td>${x.vehicle}</td><td>${x.shift}</td><td>${x.receiptNo || "-"}</td><td>${badge(x.status)}</td><td>${x.note || "-"}</td><td><button class="admin-btn admin-btn-secondary" type="button" data-pay-action="open" data-pay-id="${x.id}">Pruefen</button></td></tr>`).join("");
  }

  function makeReconRows() {
    return state.data.rides.slice(0, 20).map((r) => {
      const pay = state.data.payments.find((p) => p.orderNo === r.orderNo);
      const inv = state.data.invoices.find((i) => i.orderNo === r.orderNo);
      const rideAmount = Number(r.meterAmount || 0) + Number(r.surcharge || 0);
      const driverAmount = Number(r.cashAmount || 0) + Number(r.cardAmount || 0) + Number(r.invoiceAmount || 0);
      const cash = Number(r.cashAmount || 0);
      const cardProof = pay && pay.receiptNo ? "vorhanden" : "fehlt";
      const invoiceAmount = inv ? Number(inv.gross || 0) : 0;
      const paymentIn = pay ? Number(pay.amount || 0) : 0;
      const insurerAmount = r.billingType === "Krankenkasse" ? Number(r.reimbursementAmount || 0) : 0;
      const diff = Number((rideAmount - paymentIn).toFixed(2));
      return { r, rideAmount, driverAmount, cash, cardProof, invoiceAmount, paymentIn, insurerAmount, diff };
    });
  }

  function renderRecon() {
    const body = document.querySelector("[data-pay-recon-table]");
    if (!body) return;
    body.innerHTML = makeReconRows().map((x) => `<tr><td>${F.formatEuro(x.rideAmount)}</td><td>${F.formatEuro(x.driverAmount)}</td><td>${F.formatEuro(x.cash)}</td><td>${x.cardProof}</td><td>${F.formatEuro(x.invoiceAmount)}</td><td>${F.formatEuro(x.paymentIn)}</td><td>${F.formatEuro(x.insurerAmount)}</td><td>${badge(x.diff === 0 ? "stimmt" : x.diff > 0 ? "Unterzahlung" : "Ueberzahlung")}</td><td><button class="admin-btn" type="button" data-recon-order="${x.r.orderNo}">Klaeren</button></td></tr>`).join("");
  }

  function openModal(title, body) {
    const modal = document.querySelector("[data-pay-modal]");
    const t = document.querySelector("[data-pay-modal-title]");
    const b = document.querySelector("[data-pay-modal-body]");
    if (!modal || !t || !b) return;
    t.textContent = title;
    b.innerHTML = body;
    modal.hidden = false;
  }

  function closeModal() {
    const modal = document.querySelector("[data-pay-modal]");
    if (modal) modal.hidden = true;
  }

  function bindActions() {
    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-pay-close]")) {
        closeModal();
        return;
      }

      const row = event.target.closest("[data-pay-action]");
      if (row) {
        const id = row.getAttribute("data-pay-id");
        const payment = state.data.payments.find((x) => x.id === id);
        if (!payment) return;
        payment.status = payment.status === "ungeklaert" ? "bestaetigt" : payment.status;
        payment.note = `${payment.note || ""} · geprueft ${F.todayIso()}`;
        F.saveState(state.data);
        renderPayments();
        renderKpis();
        openModal(`Zahlung ${payment.id}`, `<p>Aktionen: Zahlung zuordnen, Differenz bestaetigen, Korrektur buchen (Demo), Rueckfrage erstellen, als geklaert markieren.</p><p>Aktueller Status: ${payment.status}</p>`);
        return;
      }

      const recon = event.target.closest("[data-recon-order]");
      if (recon) {
        const order = recon.getAttribute("data-recon-order") || "";
        const ride = state.data.rides.find((r) => r.orderNo === order);
        if (!ride) return;
        ride.checkStatus = "Korrektur erforderlich";
        ride.timeline.unshift({ at: new Date().toISOString(), text: "Zahlungsdifferenz im Abgleich markiert" });
        F.saveState(state.data);
        openModal(`Abgleich ${order}`, `<p>Demo: Fall als Differenz markiert. Optionen: Zahlung zuordnen, Rueckfrage erstellen, als geklaert markieren.</p>`);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderKpis();
    renderPayments();
    renderRecon();
    bindActions();
  });
})();
