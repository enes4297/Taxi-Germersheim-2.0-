(() => {
  const F = window.AdminFinanceDemo;
  const state = {
    data: F.loadState(),
    filter: "alle"
  };

  function badge(text) {
    const normalized = F.normalize(text);
    const cls = normalized.includes("abgelaufen") || normalized.includes("fehlt") || normalized.includes("abgelehnt") || normalized.includes("ueberschritten")
      ? "crit"
      : normalized.includes("warn") || normalized.includes("offen") || normalized.includes("rueck") || normalized.includes("unvoll")
        ? "warn"
        : "ok";
    return `<span class="finance-status ${cls}" title="${text}">${text}</span>`;
  }

  function openModal(title, html) {
    const modal = document.querySelector("[data-kk-modal]");
    const titleNode = document.querySelector("[data-kk-modal-title]");
    const bodyNode = document.querySelector("[data-kk-modal-body]");
    if (!modal || !titleNode || !bodyNode) return;

    titleNode.textContent = title;
    bodyNode.innerHTML = html;
    modal.hidden = false;
  }

  function closeModal() {
    const modal = document.querySelector("[data-kk-modal]");
    if (modal) modal.hidden = true;
  }

  function permitWarning(caseRow) {
    const end = new Date(`${caseRow.permitTo}T00:00:00`).getTime();
    const now = new Date(`${F.todayIso()}T00:00:00`).getTime();
    const daysLeft = Math.floor((end - now) / 86400000);

    if (daysLeft < 0) return "Genehmigung abgelaufen";
    if (daysLeft < 14) return "Genehmigung läuft bald ab";
    if (caseRow.remaining < 0) return "Fahrtenlimit überschritten";
    if (caseRow.remaining <= 2) return "Fahrtenlimit fast erreicht";
    return "Gültig";
  }

  function matchGlobalFilter(kind, row) {
    if (state.filter === "alle") return true;

    if (state.filter === "kritisch") {
      const text = F.normalize(JSON.stringify(row));
      return text.includes("fehlt") || text.includes("abgelaufen") || text.includes("abgelehnt") || text.includes("ueberschritten");
    }

    if (state.filter === "offen") {
      const text = F.normalize(JSON.stringify(row));
      return text.includes("offen") || text.includes("in pruefung") || text.includes("entwurf");
    }

    if (state.filter === "rueckfrage") {
      if (kind === "questions") return F.normalize(row.status) !== "geklaert";
      const text = F.normalize(JSON.stringify(row));
      return text.includes("rueck");
    }

    if (state.filter === "abrechenbar") {
      if (kind !== "cases") return true;
      return row.transportStatus === "vorhanden" && row.approvalStatus !== "abgelaufen";
    }

    return true;
  }

  function renderStats() {
    const rides = state.data.rides.filter((entry) => entry.billingType === "Krankenkasse");
    const questions = state.data.insurerQuestions;
    const batches = state.data.insurerBatches;

    const primary = [
      ["Offene Fahrten", rides.filter((entry) => entry.invoiceStatus === "offen").length],
      ["Vollständig abrechenbar", rides.filter((entry) => entry.transportStatus === "vorhanden" && entry.approvalStatus !== "abgelaufen").length],
      ["Fehlende Transportscheine", rides.filter((entry) => entry.transportStatus === "fehlt").length],
      ["Fehlende Genehmigungen", rides.filter((entry) => !entry.permitNo).length],
      ["Offene Summe", F.formatEuro(rides.reduce((sum, entry) => sum + Number(entry.invoiceAmount || 0), 0))],
      ["Eingereichte Abrechnungen", batches.filter((entry) => ["eingereicht", "teilweise bezahlt", "bezahlt"].includes(entry.status)).length]
    ];

    const secondary = [
      ["Abgelaufene Genehmigungen", rides.filter((entry) => entry.approvalStatus === "abgelaufen").length],
      ["Rückfragen", questions.filter((entry) => F.normalize(entry.status) !== "geklaert").length],
      ["Abgelehnte Fälle", rides.filter((entry) => entry.checkStatus === "abgelehnt").length],
      ["Bezahlt diesen Monat", F.formatEuro(state.data.invoices.filter((entry) => entry.kind === "Krankenkasse").reduce((sum, entry) => sum + Number(entry.paid || 0), 0))]
    ];

    const primaryNode = document.querySelector("[data-kk-stats-primary]");
    const secondaryNode = document.querySelector("[data-kk-stats-secondary]");

    if (primaryNode) {
      primaryNode.innerHTML = primary.map((item) => `<article class="finance-kpi"><small>${item[0]}</small><strong>${item[1]}</strong></article>`).join("");
    }

    if (secondaryNode) {
      secondaryNode.innerHTML = secondary.map((item) => `<article class="finance-kpi"><small>${item[0]}</small><strong>${item[1]}</strong></article>`).join("");
    }
  }

  function renderInsurers() {
    const body = document.querySelector("[data-kk-insurer-table]");
    if (!body) return;

    const rows = state.data.insurers.filter((entry) => matchGlobalFilter("insurers", entry));
    body.innerHTML = rows.map((entry) => {
      const statusText = entry.questions > 0 ? "Rückfrage offen" : entry.openCases > 0 ? "In Arbeit" : "Stabil";
      return `
        <tr>
          <td title="${entry.name}">${entry.name}</td>
          <td title="${entry.contact}">${entry.contact}</td>
          <td>${entry.openCases}</td>
          <td>${F.formatEuro(entry.openAmount)}</td>
          <td>${entry.lastSubmit}</td>
          <td>${badge(statusText)}</td>
          <td><button class="admin-btn admin-btn-secondary" type="button" data-kk-insurer="${entry.id}">Details</button></td>
        </tr>
      `;
    }).join("");
  }

  function renderPatients() {
    const body = document.querySelector("[data-kk-patient-table]");
    if (!body) return;

    const rows = state.data.insurerCases.filter((entry) => matchGlobalFilter("cases", entry));
    body.innerHTML = rows.map((entry) => {
      const warning = permitWarning(entry);
      return `
        <tr>
          <td title="${entry.patient}">${entry.patient}</td>
          <td title="${entry.insurer}">${entry.insurer}</td>
          <td>${entry.approvedRideType}</td>
          <td>${badge(entry.transportStatus)}</td>
          <td>${entry.billingOpen}</td>
          <td>${badge(warning)}</td>
          <td><button class="admin-btn admin-btn-secondary" type="button" data-kk-patient="${entry.id}">Details</button></td>
        </tr>
      `;
    }).join("");
  }

  function renderBatches() {
    const body = document.querySelector("[data-kk-batch-table]");
    if (!body) return;

    const rows = state.data.insurerBatches.filter((entry) => matchGlobalFilter("batches", entry));
    body.innerHTML = rows.map((entry) => `
      <tr>
        <td>${entry.id}</td>
        <td title="${entry.insurer}">${entry.insurer}</td>
        <td>${badge(entry.status)}</td>
        <td>${entry.rideIds.length}</td>
        <td>${F.formatEuro(entry.total)}</td>
        <td title="${entry.feedback || "-"}">${entry.feedback || "-"}</td>
        <td><button class="admin-btn" type="button" data-kk-batch="${entry.id}">Bearbeiten</button></td>
      </tr>
    `).join("");
  }

  function renderQuestions() {
    const body = document.querySelector("[data-kk-question-table]");
    if (!body) return;

    const rows = state.data.insurerQuestions.filter((entry) => matchGlobalFilter("questions", entry));
    body.innerHTML = rows.map((entry) => `
      <tr>
        <td title="${entry.insurer}">${entry.insurer}</td>
        <td title="${entry.patient}">${entry.patient}</td>
        <td>${F.formatEuro(entry.amount)}</td>
        <td>${entry.dueAt}</td>
        <td>${badge(entry.status)}</td>
        <td><button class="admin-btn admin-btn-secondary" type="button" data-kk-question="${entry.id}">Details</button></td>
      </tr>
    `).join("");
  }

  function openInsurerDetails(row) {
    openModal(`Kasse ${row.name}`, `
      <div class="finance-list">
        <article class="finance-item"><strong>Kontakt</strong><p>Ansprechpartner: ${row.contact}</p><p>Telefon: ${row.phone}</p><p>E-Mail: ${row.mail}</p></article>
        <article class="finance-item"><strong>Abrechnung</strong><p>IK: ${row.ik}</p><p>Abrechnungsweg: ${row.channel}</p><p>Zahlungsziel: ${row.dueDays} Tage</p></article>
        <article class="finance-item"><strong>Status</strong><p>Offene Fälle: ${row.openCases}</p><p>Offene Summe: ${F.formatEuro(row.openAmount)}</p><p>Rückfragen: ${row.questions}</p></article>
      </div>
    `);
  }

  function openPatientDetails(row) {
    const warning = permitWarning(row);
    openModal(`Patientenfall ${row.id}`, `
      <div class="finance-list">
        <article class="finance-item"><strong>Patient</strong><p>${row.patient}</p><p>Vers.-Nr: ${row.insuranceNo}</p><p>Kasse: ${row.insurer}</p></article>
        <article class="finance-item"><strong>Genehmigung</strong><p>Nummer: ${row.permitNo}</p><p>Gültig: ${row.permitFrom} bis ${row.permitTo}</p><p>Status: ${warning}</p></article>
        <article class="finance-item"><strong>Abrechnung</strong><p>Fahrtart: ${row.approvedRideType}</p><p>Verbraucht: ${row.usedCount} von ${row.approvedCount}</p><p>Offene Abrechnung: ${row.billingOpen}</p><p>Transportschein: ${row.transportStatus}</p></article>
      </div>
    `);
  }

  function openQuestionDetails(row) {
    openModal(`Rückfrage ${row.id}`, `
      <div class="finance-list">
        <article class="finance-item"><strong>Kerninfo</strong><p>Kasse: ${row.insurer}</p><p>Patient: ${row.patient}</p><p>Fahrt: ${row.rideId}</p></article>
        <article class="finance-item"><strong>Bearbeitung</strong><p>Betrag: ${F.formatEuro(row.amount)}</p><p>Eingang: ${row.receivedAt}</p><p>Frist: ${row.dueAt}</p><p>Status: ${row.status}</p><p>Bearbeiter: ${row.owner}</p></article>
        <article class="finance-item"><strong>Notiz</strong><p>${row.note}</p></article>
      </div>
    `);
  }

  function rerenderAll() {
    renderStats();
    renderInsurers();
    renderPatients();
    renderBatches();
    renderQuestions();
  }

  function bindFilters() {
    document.querySelectorAll("[data-kk-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        const next = button.getAttribute("data-kk-filter") || "alle";
        state.filter = next;
        document.querySelectorAll("[data-kk-filter]").forEach((entry) => {
          entry.classList.toggle("is-active", entry === button);
        });
        rerenderAll();
      });
    });
  }

  function bindActions() {
    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-kk-close]")) {
        closeModal();
        return;
      }

      const insurerBtn = event.target.closest("[data-kk-insurer]");
      if (insurerBtn) {
        const row = state.data.insurers.find((entry) => entry.id === insurerBtn.getAttribute("data-kk-insurer"));
        if (!row) return;
        openInsurerDetails(row);
        return;
      }

      const patientBtn = event.target.closest("[data-kk-patient]");
      if (patientBtn) {
        const row = state.data.insurerCases.find((entry) => entry.id === patientBtn.getAttribute("data-kk-patient"));
        if (!row) return;
        openPatientDetails(row);
        return;
      }

      const batchBtn = event.target.closest("[data-kk-batch]");
      if (batchBtn) {
        const row = state.data.insurerBatches.find((entry) => entry.id === batchBtn.getAttribute("data-kk-batch"));
        if (!row) return;
        row.status = row.status === "Entwurf" ? "in Prüfung" : row.status === "in Prüfung" ? "eingereicht" : row.status;
        row.submittedAt = row.status === "eingereicht" ? F.todayIso() : row.submittedAt;
        F.saveState(state.data);
        rerenderAll();
        openModal(`Sammelabrechnung ${row.id}`, `<p>Status aktualisiert auf: ${row.status}</p><p>Fehlende Unterlagen werden im Prüfcenter angezeigt.</p>`);
        return;
      }

      const questionBtn = event.target.closest("[data-kk-question]");
      if (!questionBtn) return;
      const row = state.data.insurerQuestions.find((entry) => entry.id === questionBtn.getAttribute("data-kk-question"));
      if (!row) return;
      openQuestionDetails(row);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      const modal = document.querySelector("[data-kk-modal]");
      if (!modal || modal.hidden) return;
      closeModal();
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    rerenderAll();
    bindFilters();
    bindActions();

    if (window.AdminUiText) {
      window.AdminUiText.normalizeDocument(document);
      window.AdminUiText.observeDocument(document);
    }
  });
})();