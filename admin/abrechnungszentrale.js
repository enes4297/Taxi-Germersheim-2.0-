(() => {
  const F = window.AdminFinanceDemo;
  const state = {
    data: F.loadState(),
    filters: {
      range: "alle",
      rideType: "",
      customer: "",
      driver: "",
      vehicle: "",
      paymentType: "alle",
      billingType: "alle",
      insurer: "",
      company: "",
      checkStatus: "alle",
      docMissing: "alle",
      invoiceOpen: "alle",
      hasDiff: "alle",
      sort: "neueste zuerst"
    }
  };

  function toneFor(text) {
    const n = F.normalize(text);
    if (n.includes("krit") || n.includes("abgelaufen") || n.includes("fehlt") || n.includes("storniert")) return "crit";
    if (n.includes("pruef") || n.includes("offen") || n.includes("rueckfrage") || n.includes("korrektur")) return "warn";
    if (n.includes("voll") || n.includes("bezahlt") || n.includes("freigegeben")) return "ok";
    return "info";
  }

  function iconFor(text) {
    const n = F.normalize(text);
    if (n.includes("krit") || n.includes("abgelaufen")) return "!";
    if (n.includes("fehlt")) return "-";
    if (n.includes("bezahlt") || n.includes("voll")) return "✓";
    return "i";
  }

  function isDocMissing(row) {
    return [row.receiptStatus, row.transportStatus, row.approvalStatus].some((v) => ["fehlt", "abgelaufen"].includes(F.normalize(v)));
  }

  function filterRows() {
    let rows = state.data.rides.filter((row) => {
      if (state.filters.range !== "alle" && !F.getRangeFilter(row.date, state.filters.range)) return false;
      if (state.filters.rideType && !F.normalize(row.rideType).includes(F.normalize(state.filters.rideType))) return false;
      if (state.filters.customer && !F.normalize(row.customer).includes(F.normalize(state.filters.customer))) return false;
      if (state.filters.driver && !F.normalize(row.driver).includes(F.normalize(state.filters.driver))) return false;
      if (state.filters.vehicle && !F.normalize(row.vehicle).includes(F.normalize(state.filters.vehicle))) return false;
      if (state.filters.paymentType !== "alle" && row.paymentType !== state.filters.paymentType) return false;
      if (state.filters.billingType !== "alle" && row.billingType !== state.filters.billingType) return false;
      if (state.filters.insurer && !F.normalize(row.insurer).includes(F.normalize(state.filters.insurer))) return false;
      if (state.filters.company && !F.normalize(row.company).includes(F.normalize(state.filters.company))) return false;
      if (state.filters.checkStatus !== "alle" && row.checkStatus !== state.filters.checkStatus) return false;
      if (state.filters.docMissing === "ja" && !isDocMissing(row)) return false;
      if (state.filters.invoiceOpen === "ja" && row.invoiceStatus !== "offen") return false;
      if (state.filters.hasDiff === "ja" && Number(row.openDiff || 0) <= 0) return false;
      return true;
    });

    const amount = (r) => Number(r.invoiceAmount || r.meterAmount || 0);
    const risk = (r) => F.evaluateRules(r, state.data.payments, state.data.invoices).length;

    if (state.filters.sort === "neueste zuerst") {
      rows = rows.sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
    } else if (state.filters.sort === "aelteste zuerst") {
      rows = rows.sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
    } else if (state.filters.sort === "hoechster Betrag") {
      rows = rows.sort((a, b) => amount(b) - amount(a));
    } else if (state.filters.sort === "niedrigster Betrag") {
      rows = rows.sort((a, b) => amount(a) - amount(b));
    } else if (state.filters.sort === "kritischste Faelle") {
      rows = rows.sort((a, b) => risk(b) - risk(a));
    } else if (state.filters.sort === "fehlende Unterlagen") {
      rows = rows.sort((a, b) => Number(isDocMissing(b)) - Number(isDocMissing(a)));
    }

    return rows;
  }

  function renderStats() {
    const rows = state.data.rides;
    const monthRows = rows.filter((r) => r.date.slice(0, 7) === F.todayIso().slice(0, 7));
    const dayRows = rows.filter((r) => r.date === F.todayIso());
    const prevMonthBase = 12000;
    const monthIncome = monthRows.reduce((s, r) => s + Number(r.cashAmount || 0) + Number(r.cardAmount || 0) + Number(r.invoiceAmount || 0), 0);

    const stats = [
      ["offene Abrechnungen", rows.filter((r) => r.checkStatus !== "vollstaendig").length, "+8,4 %"],
      ["heute abgeschlossene Fahrten", dayRows.length, "+2,1 %"],
      ["noch zu pruefende Fahrten", rows.filter((r) => r.checkStatus === "noch nicht geprueft").length, "-3,1 %"],
      ["fehlende Belege", rows.filter((r) => r.receiptStatus === "fehlt").length, "+1,0 %"],
      ["fehlende Transportscheine", rows.filter((r) => r.transportStatus === "fehlt").length, "+0,9 %"],
      ["fehlende Genehmigungen", rows.filter((r) => r.approvalStatus === "abgelaufen").length, "+0,3 %"],
      ["offene Rechnungen", state.data.invoices.filter((i) => i.open > 0).length, "-4,4 %"],
      ["ueberfaellige Rechnungen", state.data.invoices.filter((i) => i.status === "ueberfaellig").length, "+2,8 %"],
      ["Einnahmen heute", F.formatEuro(dayRows.reduce((s, r) => s + Number(r.cashAmount || 0) + Number(r.cardAmount || 0), 0)), "+7,0 %"],
      ["Einnahmen diesen Monat", F.formatEuro(monthIncome), `${F.getComparativePct(monthIncome, prevMonthBase)} %`],
      ["Krankenkassenvolumen", F.formatEuro(rows.filter((r) => r.billingType === "Krankenkasse").reduce((s, r) => s + Number(r.invoiceAmount || 0), 0)), "+5,2 %"],
      ["Firmenkundenvolumen", F.formatEuro(rows.filter((r) => r.billingType === "Sammelrechnung").reduce((s, r) => s + Number(r.invoiceAmount || 0), 0)), "+3,7 %"]
    ];

    const node = document.querySelector("[data-billing-stats]");
    if (!node) return;
    node.innerHTML = stats.map((s) => `<article class="finance-stat-card"><small>${s[0]}</small><strong>${s[1]}</strong><span class="trend">Vormonat: ${s[2]}</span></article>`).join("");
  }

  function renderTable() {
    const body = document.querySelector("[data-billing-table]");
    if (!body) return;
    const rows = filterRows();

    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="22">Keine Abrechnungsfaelle gefunden.</td></tr>';
      return;
    }

    body.innerHTML = rows.map((r) => {
      return `
        <tr>
          <td>${r.orderNo}</td><td>${r.rideId}</td><td>${r.date}</td><td>${r.time}</td><td>${r.customer}</td><td>${r.customerType}</td><td>${r.pickup}</td><td>${r.destination}</td><td>${r.rideType}</td><td>${r.driver}</td><td>${r.vehicle}</td>
          <td>${F.formatEuro(r.meterAmount)}</td><td>${F.formatEuro(r.fixedPrice)}</td><td>${r.paymentType}</td><td>${r.billingType}</td>
          <td><span class="finance-status ${toneFor(r.receiptStatus)}">${iconFor(r.receiptStatus)} ${r.receiptStatus}</span></td>
          <td><span class="finance-status ${toneFor(r.approvalStatus)}">${iconFor(r.approvalStatus)} ${r.approvalStatus}</span></td>
          <td><span class="finance-status ${toneFor(r.transportStatus)}">${iconFor(r.transportStatus)} ${r.transportStatus}</span></td>
          <td><span class="finance-status ${toneFor(r.invoiceStatus)}">${iconFor(r.invoiceStatus)} ${r.invoiceStatus}</span></td>
          <td><span class="finance-status ${toneFor(r.checkStatus)}">${iconFor(r.checkStatus)} ${r.checkStatus}</span></td>
          <td>${F.formatEuro(r.openDiff)}</td>
          <td><button class="admin-btn admin-btn-secondary" type="button" data-open-ride="${r.orderNo}">Details</button></td>
        </tr>
      `;
    }).join("");
  }

  function openModal(title, body, foot) {
    const modal = document.querySelector("[data-billing-center-modal]");
    const t = document.querySelector("[data-billing-center-title]");
    const b = document.querySelector("[data-billing-center-body]");
    const f = document.querySelector("[data-billing-center-foot]");
    if (!modal || !t || !b || !f) return;
    t.textContent = title;
    b.innerHTML = body;
    f.innerHTML = foot || '<button class="admin-btn admin-btn-secondary" type="button" data-billing-center-close>Schliessen</button>';
    modal.hidden = false;
  }

  function closeModal() {
    const modal = document.querySelector("[data-billing-center-modal]");
    if (modal) modal.hidden = true;
  }

  function buildWarnings(ride) {
    const rules = F.evaluateRules(ride, state.data.payments, state.data.invoices);
    if (!rules.length) return '<p>Keine Warnungen.</p>';
    return `<div class="finance-list">${rules.map((w) => `<article class="finance-item"><strong>${w.category}</strong><p>Ursache: ${w.cause}</p><p>Prioritaet: ${w.priority}</p><p>Wert: ${w.value}</p><p>Loesung: ${w.suggestion}</p></article>`).join("")}</div>`;
  }

  function renderDetail(orderNo) {
    const ride = F.findRide(state.data, orderNo);
    if (!ride) return;
    const invoice = state.data.invoices.find((i) => i.orderNo === ride.orderNo);
    const payment = state.data.payments.find((p) => p.orderNo === ride.orderNo);

    const body = `
      <section class="finance-detail-grid">
        <article class="finance-item"><strong>Fahrtuebersicht</strong><p>${ride.orderNo} · ${ride.rideId}</p><p>${ride.date} ${ride.time}</p><p>${ride.pickup} -> ${ride.destination}</p><p>${ride.rideType}</p></article>
        <article class="finance-item"><strong>Kunde</strong><p>${ride.customer}</p><p>Kundentyp: ${ride.customerType}</p><p>Krankenkasse: ${ride.insurer || "-"}</p><p>Firma: ${ride.company || "-"}</p></article>
        <article class="finance-item"><strong>Fahrer/Fahrzeug</strong><p>${ride.driver}</p><p>${ride.vehicle}</p><p>Wartezeit: ${ride.waitMin} Min</p><p>Kilometer: ${ride.actualKm} km</p></article>
        <article class="finance-item"><strong>Zeitdaten</strong><p>Geplant: ${ride.date} ${ride.time}</p><p>Beginn: ${ride.startedAt.replace("T", " ")}</p><p>Ende: ${ride.endedAt.replace("T", " ")}</p></article>
        <article class="finance-item"><strong>Preis</strong><p>Taxameter: ${F.formatEuro(ride.meterAmount)}</p><p>Festpreis: ${F.formatEuro(ride.fixedPrice)}</p><p>Zuschlaege: ${F.formatEuro(ride.surcharge)}</p><p>Trinkgeld: ${F.formatEuro(ride.tip)}</p><p>Gutschein: ${F.formatEuro(ride.voucher)}</p><p>Rechnungsbetrag: ${F.formatEuro(ride.invoiceAmount)}</p><p>Erstattung: ${F.formatEuro(ride.reimbursementAmount)}</p><p>Differenz: ${F.formatEuro(ride.openDiff)}</p></article>
        <article class="finance-item"><strong>Zahlungsart</strong><p>${ride.paymentType}</p><p>Bar: ${F.formatEuro(ride.cashAmount)}</p><p>Karte: ${F.formatEuro(ride.cardAmount)}</p><p>Payment-ID: ${payment ? payment.id : "-"}</p></article>
        <article class="finance-item"><strong>Dokumente/Genehmigung</strong><p>Belegstatus: ${ride.receiptStatus}</p><p>Genehmigung: ${ride.approvalStatus}</p><p>Transportschein: ${ride.transportStatus}</p><p>Permit: ${ride.permitNo || "-"}</p></article>
        <article class="finance-item"><strong>Rechnung</strong><p>${invoice ? invoice.id : "noch keine"}</p><p>Status: ${ride.invoiceStatus}</p><p>Offen: ${invoice ? F.formatEuro(invoice.open) : "-"}</p></article>
        <article class="finance-item"><strong>Pruefungen</strong>${buildWarnings(ride)}</article>
      </section>
      <section class="finance-item"><strong>Verlauf</strong>${(ride.timeline || []).map((t) => `<p>${String(t.at || "").slice(0, 16).replace("T", " ")} · ${t.text}</p>`).join("")}</section>
      <section class="finance-item"><strong>Interne Notiz</strong><p>${ride.internalNote || "-"}</p></section>
    `;

    const foot = `
      <div class="finance-compact-actions">
        <button class="admin-btn" type="button" data-ride-action="check" data-ride-order="${ride.orderNo}">Fahrt pruefen</button>
        <button class="admin-btn admin-btn-secondary" type="button" data-ride-action="correct" data-ride-order="${ride.orderNo}">Betrag korrigieren</button>
        <button class="admin-btn admin-btn-secondary" type="button" data-ride-action="doc" data-ride-order="${ride.orderNo}">Dokument anfordern</button>
        <button class="admin-btn admin-btn-secondary" type="button" data-ride-action="driver" data-ride-order="${ride.orderNo}">Fahrer kontaktieren</button>
        <button class="admin-btn admin-btn-secondary" type="button" data-ride-action="customer" data-ride-order="${ride.orderNo}">Kundenakte oeffnen</button>
        <button class="admin-btn" type="button" data-ride-action="invoice" data-ride-order="${ride.orderNo}">Rechnung erstellen</button>
        <button class="admin-btn admin-btn-secondary" type="button" data-ride-action="batch" data-ride-order="${ride.orderNo}">Zur Sammelabrechnung</button>
        <button class="admin-btn admin-btn-warning" type="button" data-ride-action="hold" data-ride-order="${ride.orderNo}">Zurueckstellen</button>
        <button class="admin-btn admin-btn-primary" type="button" data-ride-action="release" data-ride-order="${ride.orderNo}">Abrechnung freigeben</button>
      </div>
    `;

    openModal(`Fahrtabrechnung ${ride.orderNo}`, body, foot);
  }

  function bindFilters() {
    document.querySelectorAll("[data-fin-filter]").forEach((el) => {
      const key = el.getAttribute("data-fin-filter");
      if (!key) return;
      const handler = () => {
        state.filters[key] = el.value || "";
        renderTable();
      };
      el.addEventListener("input", handler);
      el.addEventListener("change", handler);
    });
  }

  function bindActions() {
    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-billing-center-close]")) {
        closeModal();
        return;
      }

      const detail = event.target.closest("[data-open-ride]");
      if (detail) {
        renderDetail(detail.getAttribute("data-open-ride") || "");
        return;
      }

      if (event.target.closest("[data-fin-reset-filter]")) {
        state.filters = {
          range: "alle", rideType: "", customer: "", driver: "", vehicle: "", paymentType: "alle", billingType: "alle", insurer: "", company: "", checkStatus: "alle", docMissing: "alle", invoiceOpen: "alle", hasDiff: "alle", sort: "neueste zuerst"
        };
        document.querySelectorAll("[data-fin-filter]").forEach((el) => {
          const key = el.getAttribute("data-fin-filter");
          el.value = state.filters[key] || "";
        });
        renderTable();
        return;
      }

      if (event.target.closest("[data-fin-reset-demo]")) {
        if (!window.confirm("Finanz-Demo wirklich zuruecksetzen?")) return;
        state.data = F.resetState();
        renderStats();
        renderTable();
        return;
      }

      const rideAction = event.target.closest("[data-ride-action]");
      if (!rideAction) return;
      const action = rideAction.getAttribute("data-ride-action") || "";
      const order = rideAction.getAttribute("data-ride-order") || "";
      const ride = F.findRide(state.data, order);
      if (!ride) return;

      if (action === "check") {
        ride.checkStatus = "vollstaendig";
      } else if (action === "correct") {
        ride.fixedPrice = Number((ride.fixedPrice + 2).toFixed(2));
        ride.checkStatus = "Korrektur erforderlich";
      } else if (action === "doc") {
        ride.receiptStatus = "angefordert";
      } else if (action === "invoice") {
        ride.invoiceStatus = "offen";
      } else if (action === "release") {
        ride.checkStatus = "freigegeben";
      } else if (action === "hold") {
        ride.checkStatus = "Rueckfrage Fahrer";
      }

      ride.timeline.unshift({ at: new Date().toISOString(), text: `Aktion: ${action}` });
      F.saveState(state.data);
      renderStats();
      renderTable();
      renderDetail(order);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderStats();
    renderTable();
    bindFilters();
    bindActions();
  });
})();
