(() => {
  const F = window.AdminFinanceDemo;
  const state = { data: F.loadState() };

  function badge(text) {
    const t = F.normalize(text);
    const cls = t.includes("abgelaufen") || t.includes("fehlt") || t.includes("abgelehnt") || t.includes("ueberschritten") ? "crit" : t.includes("warn") || t.includes("offen") || t.includes("rueck") || t.includes("unvoll") ? "warn" : "ok";
    return `<span class="finance-status ${cls}">${text}</span>`;
  }

  function renderStats() {
    const rides = state.data.rides.filter((r) => r.billingType === "Krankenkasse");
    const cases = state.data.insurerCases;
    const batches = state.data.insurerBatches;
    const questions = state.data.insurerQuestions;
    const items = [
      ["offene Krankenkassenfahrten", rides.filter((r) => r.invoiceStatus === "offen").length],
      ["vollstaendig abrechenbar", rides.filter((r) => r.transportStatus === "vorhanden" && r.approvalStatus !== "abgelaufen").length],
      ["fehlende Transportscheine", rides.filter((r) => r.transportStatus === "fehlt").length],
      ["fehlende Genehmigungen", rides.filter((r) => !r.permitNo).length],
      ["abgelaufene Genehmigungen", rides.filter((r) => r.approvalStatus === "abgelaufen").length],
      ["eingereichte Abrechnungen", batches.filter((b) => ["eingereicht", "teilweise bezahlt", "bezahlt"].includes(b.status)).length],
      ["Rueckfragen", questions.filter((q) => q.status !== "geklaert").length],
      ["abgelehnte Faelle", rides.filter((r) => r.checkStatus === "abgelehnt").length],
      ["offener Betrag", F.formatEuro(rides.reduce((s, r) => s + Number(r.invoiceAmount || 0), 0))],
      ["bezahlt diesen Monat", F.formatEuro(state.data.invoices.filter((i) => i.kind === "Krankenkasse").reduce((s, i) => s + Number(i.paid || 0), 0))]
    ];
    const node = document.querySelector("[data-kk-stats]");
    if (!node) return;
    node.innerHTML = items.map((x) => `<article class="finance-kpi"><small>${x[0]}</small><strong>${x[1]}</strong></article>`).join("");
  }

  function renderInsurers() {
    const body = document.querySelector("[data-kk-insurer-table]");
    if (!body) return;
    body.innerHTML = state.data.insurers.map((i) => `<tr><td>${i.name}</td><td>${i.ik}</td><td>${i.contact}</td><td>${i.phone}</td><td>${i.mail}</td><td>${i.channel}</td><td>${i.dueDays} Tage</td><td>${i.openCases}</td><td>${F.formatEuro(i.openAmount)}</td><td>${i.lastSubmit}</td><td>${i.lastPayment}</td><td>${i.questions}</td></tr>`).join("");
  }

  function permitWarnings(c) {
    const end = new Date(`${c.permitTo}T00:00:00`).getTime();
    const now = new Date(`${F.todayIso()}T00:00:00`).getTime();
    const left = Math.floor((end - now) / 86400000);
    if (left < 0) return "Genehmigung bereits abgelaufen";
    if (left < 14) return "Genehmigung laeuft in weniger als 14 Tagen ab";
    if (c.remaining < 0) return "Fahrtenlimit ueberschritten";
    if (c.remaining <= 2) return "Fahrtenlimit fast erreicht";
    return "ok";
  }

  function transportCheck(status) {
    const map = {
      vorhanden: "vorhanden",
      geprueft: "geprueft",
      unvollstaendig: "unvollstaendig",
      unleserlich: "unleserlich",
      fehlt: "fehlt",
      angefordert: "angefordert",
      ersetzt: "ersetzt",
      abgelehnt: "abgelehnt"
    };
    return map[status] || status;
  }

  function renderPatients() {
    const body = document.querySelector("[data-kk-patient-table]");
    if (!body) return;
    body.innerHTML = state.data.insurerCases.map((c) => {
      const warn = permitWarnings(c);
      return `<tr>
        <td>${c.patient}</td><td>${c.insuranceNo}</td><td>${c.insurer}</td><td>${c.permitNo}</td><td>${c.permitFrom} bis ${c.permitTo}</td><td>${c.approvedRideType}</td><td>${c.approvedCount}</td><td>${c.usedCount}</td><td>${c.remaining}</td><td>${c.returnTrip}</td><td>${F.formatEuro(c.coPay)}</td><td>${c.exemption}</td><td>${badge(transportCheck(c.transportStatus))}</td><td>${c.billingOpen}</td><td>${warn === "ok" ? badge("gueltig") : badge(warn)}</td><td><button class="admin-btn admin-btn-secondary" type="button" data-kk-patient="${c.id}">Details</button></td>
      </tr>`;
    }).join("");
  }

  function renderBatches() {
    const body = document.querySelector("[data-kk-batch-table]");
    if (!body) return;
    body.innerHTML = state.data.insurerBatches.map((b) => `<tr><td>${b.id}</td><td>${b.insurer}</td><td>${badge(b.status)}</td><td>${b.rideIds.length}</td><td>${F.formatEuro(b.total)}</td><td>${F.formatEuro(b.coPayTotal)}</td><td>${b.submittedAt || "-"}</td><td>${b.feedback || "-"}</td><td><button class="admin-btn" type="button" data-kk-batch="${b.id}">Bearbeiten</button></td></tr>`).join("");
  }

  function renderQuestions() {
    const body = document.querySelector("[data-kk-question-table]");
    if (!body) return;
    body.innerHTML = state.data.insurerQuestions.map((q) => `<tr><td>${q.insurer}</td><td>${q.patient}</td><td>${q.rideId}</td><td>${F.formatEuro(q.amount)}</td><td>${q.receivedAt}</td><td>${q.dueAt}</td><td>${q.owner}</td><td>${badge(q.status)}</td><td>${q.note}</td><td><button class="admin-btn admin-btn-secondary" type="button" data-kk-question="${q.id}">Als geklaert</button></td></tr>`).join("");
  }

  function openModal(title, html) {
    const modal = document.querySelector("[data-kk-modal]");
    const t = document.querySelector("[data-kk-modal-title]");
    const b = document.querySelector("[data-kk-modal-body]");
    if (!modal || !t || !b) return;
    t.textContent = title;
    b.innerHTML = html;
    modal.hidden = false;
  }

  function closeModal() {
    const modal = document.querySelector("[data-kk-modal]");
    if (modal) modal.hidden = true;
  }

  function bindActions() {
    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-kk-close]")) {
        closeModal();
        return;
      }

      const pt = event.target.closest("[data-kk-patient]");
      if (pt) {
        const row = state.data.insurerCases.find((x) => x.id === pt.getAttribute("data-kk-patient"));
        if (!row) return;
        openModal(`Patientenfall ${row.id}`, `<div class="finance-list"><article class="finance-item"><strong>Genehmigungspruefung</strong><p>gueltig am Fahrtag: ${row.permitTo >= F.todayIso() ? "Ja" : "Nein"}</p><p>richtige Fahrtart: Ja</p><p>richtige Strecke: pruefen</p><p>Hin-/Rueckfahrt erlaubt: ${row.returnTrip}</p><p>Anzahl nicht ueberschritten: ${row.remaining >= 0 ? "Ja" : "Nein"}</p><p>Patientendaten vollstaendig: Ja</p><p>Krankenkasse vorhanden: Ja</p><p>Vers.-Nr vorhanden: Ja</p><p>Genehmigungsnr vorhanden: Ja</p><p>Dokumentstatus: ${row.transportStatus}</p></article><article class="finance-item"><strong>Transportschein-Pruefung</strong><p>Patient: ${row.patient}</p><p>Arzt: Demo</p><p>Datum: ${F.todayIso()}</p><p>Behandlungsart: ${row.approvedRideType}</p><p>medizinische Notwendigkeit: Ja</p><p>Hin/Rueckfahrt: ${row.returnTrip}</p><p>Befoerderungsmittel: Taxi</p><p>Unterschrift: ${row.transportStatus === "fehlt" ? "Nein" : "Ja"}</p><p>Stempel: ${row.transportStatus === "unvollstaendig" ? "Nein" : "Ja"}</p><p>Genehmigungspflicht: Ja</p><p>Serienfahrt: ${row.approvedCount > 10 ? "Ja" : "Nein"}</p></article></div>`);
        return;
      }

      const b = event.target.closest("[data-kk-batch]");
      if (b) {
        const row = state.data.insurerBatches.find((x) => x.id === b.getAttribute("data-kk-batch"));
        if (!row) return;
        row.status = row.status === "Entwurf" ? "in Pruefung" : row.status === "in Pruefung" ? "eingereicht" : row.status;
        row.submittedAt = row.status === "eingereicht" ? F.todayIso() : row.submittedAt;
        F.saveState(state.data);
        renderBatches();
        openModal(`Sammelabrechnung ${row.id}`, `<p>Status aktualisiert auf: ${row.status}</p><p>Vollstaendigkeit geprueft, fehlende Unterlagen werden im Pruefcenter gezeigt.</p>`);
        return;
      }

      const q = event.target.closest("[data-kk-question]");
      if (q) {
        const row = state.data.insurerQuestions.find((x) => x.id === q.getAttribute("data-kk-question"));
        if (!row) return;
        row.status = "geklaert";
        row.note = `${row.note} · geklaert ${F.todayIso()}`;
        F.saveState(state.data);
        renderQuestions();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderStats();
    renderInsurers();
    renderPatients();
    renderBatches();
    renderQuestions();
    bindActions();
  });
})();
