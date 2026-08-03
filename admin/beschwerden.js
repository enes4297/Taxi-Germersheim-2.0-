(() => {
  const Q = window.AdminQualityDemo;
  const state = { data: Q.loadState(), search: "", period: "alle", status: "alle", priority: "alle", category: "alle", view: "table", activeId: "" };

  const DETAIL_TABS = ["Uebersicht", "Kunde", "Fahrt", "Fahrer", "Fahrzeug", "Kommunikation", "Beweise", "Massnahmen", "Verlauf", "Abschluss"];
  let detailTab = "Uebersicht";

  function badge(priority) {
    const p = Q.normalize(priority || "normal");
    const cls = p.includes("krit") ? "kritisch" : p.includes("wichtig") ? "wichtig" : p.includes("info") ? "info" : "normal";
    return `<span class="q-badge ${cls}">${priority}</span>`;
  }

  function statusBadge(status) {
    const s = Q.normalize(status || "neu");
    if (["eskaliert"].includes(s)) return badge("kritisch");
    if (["neu", "bestaetigt", "in pruefung", "ruckfrage kunde", "ruckfrage fahrer", "ruckfrage disposition", "wartet auf unterlagen", "massnahme laeuft"].includes(s)) return badge("wichtig");
    return badge("Information");
  }

  function fillSelects() {
    const status = document.querySelector("[data-cmp-status]");
    const category = document.querySelector("[data-cmp-category]");
    const catInput = document.querySelector("[data-cmp-cat-input]");
    if (status) status.innerHTML = ["<option>alle</option>", ...Q.COMPLAINT_STATUSES.map((v) => `<option>${v}</option>`)].join("");
    const catOptions = ["<option>alle</option>", ...Q.COMPLAINT_CATEGORIES.map((v) => `<option>${v}</option>`)].join("");
    if (category) category.innerHTML = catOptions;
    if (catInput) catInput.innerHTML = Q.COMPLAINT_CATEGORIES.map((v) => `<option>${v}</option>`).join("");
  }

  function inPeriod(row) {
    if (state.period === "alle") return true;
    const d = row.inputDate || "";
    if (state.period === "heute") return d === Q.todayIso();
    const days = state.period === "7 Tage" ? 7 : 30;
    return Q.daysUntil(d) <= 0 && Q.daysUntil(d) >= -days;
  }

  function matches(row) {
    const q = Q.normalize(state.search).trim();
    if (q) {
      const blob = Q.normalize([row.id, row.customer, row.driver, row.vehicle, row.category, row.shortText, row.owner, row.rideId].join(" "));
      if (!blob.includes(q)) return false;
    }
    if (!inPeriod(row)) return false;
    if (state.status !== "alle" && row.status !== state.status) return false;
    if (state.priority !== "alle" && row.priority !== state.priority) return false;
    if (state.category !== "alle" && row.category !== state.category) return false;
    return true;
  }

  function rows() {
    return state.data.complaints.filter(matches).sort((a, b) => `${b.inputDate} ${b.inputTime}`.localeCompare(`${a.inputDate} ${a.inputTime}`));
  }

  function renderList() {
    const node = document.querySelector("[data-cmp-list]");
    if (!node) return;
    const r = rows();
    if (!r.length) {
      node.innerHTML = '<article class="admin-empty-state"><strong>Keine Beschwerden gefunden</strong></article>';
      return;
    }

    if (state.view === "cards") {
      node.innerHTML = `<div class="q-grid">${r.map((x) => `<article class="q-card"><small>${x.id} · ${x.inputDate} ${x.inputTime}</small><strong>${x.shortText}</strong><p>${x.customer} · ${x.channel}</p><p>Kategorie: ${x.category}</p><p>Fahrer: ${x.driver || "-"} · Fahrzeug: ${x.vehicle || "-"}</p><p>Prioritaet: ${badge(x.priority)} · Status: ${x.status}</p><p>Bearbeiter: ${x.owner} · Frist: ${x.dueDate || "-"}</p><div class="q-actions"><button class="admin-btn admin-btn-secondary" type="button" data-cmp-open="${x.id}">Details</button><button class="admin-btn" type="button" data-cmp-status="${x.id}" data-next="in Pruefung">in Pruefung</button><button class="admin-btn" type="button" data-cmp-status="${x.id}" data-next="geklaert">geklaert</button><button class="admin-btn admin-btn-warning" type="button" data-cmp-status="${x.id}" data-next="eskaliert">eskalieren</button></div></article>`).join("")}</div>`;
      return;
    }

    node.innerHTML = `<div class="q-table-wrap"><table class="admin-table q-table"><thead><tr><th>Fall</th><th>Eingang</th><th>Kunde</th><th>Kontaktweg</th><th>Kategorie</th><th>Kurzbeschreibung</th><th>Fahrer</th><th>Fahrzeug</th><th>Fahrt</th><th>Prioritaet</th><th>Status</th><th>Bearbeiter</th><th>Frist</th><th>letzte Aktivitaet</th><th>Aktion</th></tr></thead><tbody>${r.map((x) => `<tr><td>${x.id}</td><td>${x.inputDate} ${x.inputTime}</td><td>${x.customer}</td><td>${x.channel}</td><td>${x.category}</td><td>${x.shortText}</td><td>${x.driver || "-"}</td><td>${x.vehicle || "-"}</td><td>${x.rideId || "-"}</td><td>${badge(x.priority)}</td><td>${statusBadge(x.status)}</td><td>${x.owner}</td><td>${x.dueDate || "-"}</td><td>${x.lastActivity || "-"}</td><td><div class="q-actions"><button class="admin-btn admin-btn-secondary" type="button" data-cmp-open="${x.id}">Details</button><button class="admin-btn" type="button" data-cmp-status="${x.id}" data-next="in Pruefung">Pruefung</button><button class="admin-btn" type="button" data-cmp-status="${x.id}" data-next="geklaert">Klaeren</button></div></td></tr>`).join("")}</tbody></table></div>`;
  }

  function openModal(title, body, foot) {
    const m = document.querySelector("[data-cmp-modal]");
    const t = document.querySelector("[data-cmp-modal-title]");
    const b = document.querySelector("[data-cmp-modal-body]");
    const f = document.querySelector("[data-cmp-modal-foot]");
    if (!m || !t || !b || !f) return;
    t.textContent = title;
    b.innerHTML = body;
    f.innerHTML = foot || '<button class="admin-btn admin-btn-secondary" type="button" data-cmp-close>Schliessen</button>';
    m.hidden = false;
  }

  function closeModal() {
    const m = document.querySelector("[data-cmp-modal]");
    if (m) m.hidden = true;
  }

  function renderComplaintDetail(row) {
    const tabs = `<div class="q-tabs">${DETAIL_TABS.map((x) => `<button type="button" class="${detailTab === x ? "is-active" : ""}" data-cmp-tab="${x}">${x}</button>`).join("")}</div>`;
    const comm = (row.communication || []).map((c) => `<article class="q-item"><strong>${c.type}</strong><p>${c.note}</p><p>${c.at} · ${c.by}</p></article>`).join("") || '<article class="q-item">Keine Kommunikation.</article>';
    const evid = (row.evidence || []).map((e) => `<article class="q-item"><strong>${e.item}</strong><p>${e.at} · ${e.by}</p></article>`).join("") || '<article class="q-item">Keine Beweise.</article>';
    const stm = (row.statements || []).map((s) => `<article class="q-item"><strong>Stellungnahme ${s.status}</strong><p>${s.text || "noch offen"}</p><p>${s.at}</p></article>`).join("");

    let content = "";
    if (detailTab === "Uebersicht") content = `<article class="q-item"><p>Fallnummer: ${row.id}</p><p>Kategorie: ${row.category}</p><p>Prioritaet: ${badge(row.priority)}</p><p>Status: ${row.status}</p><p>Eskalation: ${row.escalation}</p><p>Risikobewertung: ${row.risk.level}</p><p>vollstaendiger Sachverhalt: ${row.description}</p></article>`;
    if (detailTab === "Kunde") content = `<article class="q-item"><p>Kunde: ${row.customer}</p><p>Telefon: ${row.phone || "-"}</p><p>E-Mail: ${row.email || "-"}</p><p>Kundenwunsch: ${row.customerWish || "-"}</p></article>`;
    if (detailTab === "Fahrt") content = `<article class="q-item"><p>Fahrt: ${row.rideId || "-"}</p><p>Route: ${row.route || "-"}</p><p>Zeitpunkt: ${row.inputDate} ${row.inputTime}</p></article>`;
    if (detailTab === "Fahrer") content = `<article class="q-item"><p>Fahrer: ${row.driver || "-"}</p><p>Fahrer-ID: ${row.driverId || "-"}</p><p>Stellungnahmen:</p>${stm || "<p>keine</p>"}</article>`;
    if (detailTab === "Fahrzeug") content = `<article class="q-item"><p>Fahrzeug: ${row.vehicle || "-"}</p><p>interne Einschaetzung: ${row.internalAssessment || "-"}</p></article>`;
    if (detailTab === "Kommunikation") content = `<div class="q-list">${comm}</div>`;
    if (detailTab === "Beweise") content = `<div class="q-list">${evid}</div>`;
    if (detailTab === "Massnahmen") content = `<article class="q-item"><p>${(row.measures || []).join(", ") || "Keine"}</p><div class="q-actions"><button class="admin-btn" type="button" data-cmp-add-comm="${row.id}" data-comm-type="Fahrer angehoert">Fahrer anhoeren</button><button class="admin-btn" type="button" data-cmp-add-comm="${row.id}" data-comm-type="Kunde angerufen">Rueckruf eintragen</button><button class="admin-btn" type="button" data-cmp-add-comm="${row.id}" data-comm-type="Dokument angefordert">Dokument anfordern</button></div></article>`;
    if (detailTab === "Verlauf") content = `<div class="q-list">${comm}${evid}</div>`;
    if (detailTab === "Abschluss") content = `<article class="q-item"><p>Loesung: ${row.desiredSolution || "-"}</p><p>Abschluss: ${row.closure || "offen"}</p><div class="q-actions"><button class="admin-btn" type="button" data-cmp-status="${row.id}" data-next="abgeschlossen">Fall abschliessen</button><button class="admin-btn admin-btn-warning" type="button" data-cmp-status="${row.id}" data-next="eskaliert">eskalieren</button></div></article>`;

    openModal(`Beschwerde ${row.id}`, `${tabs}${content}`, `<button class="admin-btn" type="button" data-cmp-add-msg="${row.id}">Gespraechsnotiz</button><button class="admin-btn" type="button" data-cmp-add-statement="${row.id}">Fahrerstellungnahme eintragen</button><button class="admin-btn admin-btn-secondary" type="button" data-cmp-close>Schliessen</button>`);
  }

  function bind() {
    document.addEventListener("input", (event) => {
      const s = event.target.closest("[data-cmp-search]");
      if (!s) return;
      state.search = String(s.value || "");
      renderList();
    });

    document.addEventListener("change", (event) => {
      const map = [
        ["[data-cmp-period]", "period"],
        ["[data-cmp-status]", "status"],
        ["[data-cmp-priority]", "priority"],
        ["[data-cmp-category]", "category"],
        ["[data-cmp-view]", "view"]
      ];
      map.forEach(([sel, key]) => {
        const el = event.target.closest(sel);
        if (!el) return;
        state[key] = String(el.value || "alle");
        renderList();
      });
    });

    const form = document.querySelector("[data-cmp-form]");
    if (form) {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const fd = new FormData(form);
        const payload = Object.fromEntries(fd.entries());
        payload.risk = {
          customerImpact: fd.get("customerImpact"),
          safetyRisk: fd.get("safetyRisk"),
          legalRisk: fd.get("legalRisk"),
          reputationalRisk: fd.get("reputationalRisk"),
          recurrenceRisk: fd.get("recurrenceRisk"),
          urgency: fd.get("urgency")
        };
        Q.addComplaint(state.data, payload);
        state.data = Q.loadState();
        renderList();
        form.reset();
      });
    }

    const pForm = document.querySelector("[data-praise-form]");
    if (pForm) {
      pForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const fd = new FormData(pForm);
        Q.addPositiveFeedback(state.data, Object.fromEntries(fd.entries()));
        state.data = Q.loadState();
        pForm.reset();
      });
    }

    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-cmp-close]")) {
        closeModal();
        return;
      }

      const tab = event.target.closest("[data-cmp-tab]");
      if (tab && state.activeId) {
        detailTab = tab.getAttribute("data-cmp-tab") || "Uebersicht";
        const row = state.data.complaints.find((x) => x.id === state.activeId);
        if (row) renderComplaintDetail(row);
        return;
      }

      const open = event.target.closest("[data-cmp-open]");
      if (open) {
        state.activeId = open.getAttribute("data-cmp-open") || "";
        detailTab = "Uebersicht";
        const row = state.data.complaints.find((x) => x.id === state.activeId);
        if (row) renderComplaintDetail(row);
        return;
      }

      const change = event.target.closest("[data-cmp-status]");
      if (change) {
        const id = change.getAttribute("data-cmp-status") || "";
        const next = change.getAttribute("data-next") || "in Pruefung";
        Q.setComplaintStatus(state.data, id, next);
        state.data = Q.loadState();
        renderList();
        if (state.activeId === id) {
          const row = state.data.complaints.find((x) => x.id === id);
          if (row) renderComplaintDetail(row);
        }
        return;
      }

      const addComm = event.target.closest("[data-cmp-add-comm]");
      if (addComm) {
        const id = addComm.getAttribute("data-cmp-add-comm") || "";
        const type = addComm.getAttribute("data-comm-type") || "Notiz";
        Q.addCommunication(state.data, id, type, `${type} dokumentiert.`, "Qualitaetsmanagement");
        state.data = Q.loadState();
        const row = state.data.complaints.find((x) => x.id === id);
        if (row) renderComplaintDetail(row);
        return;
      }

      const addMsg = event.target.closest("[data-cmp-add-msg]");
      if (addMsg) {
        const id = addMsg.getAttribute("data-cmp-add-msg") || "";
        Q.addCommunication(state.data, id, "Gespraechsnotiz", "Interne Notiz hinzugefuegt.", "Qualitaetsmanagement");
        state.data = Q.loadState();
        const row = state.data.complaints.find((x) => x.id === id);
        if (row) renderComplaintDetail(row);
        return;
      }

      const addStatement = event.target.closest("[data-cmp-add-statement]");
      if (addStatement) {
        const id = addStatement.getAttribute("data-cmp-add-statement") || "";
        const row = state.data.complaints.find((x) => x.id === id);
        if (!row) return;
        Q.addDriverStatement(state.data, id, {
          status: "eingegangen",
          driver: row.driver,
          text: "Demo-Stellungnahme: Situation wurde aus Fahrersicht erklaert.",
          circumstances: "Starker Verkehr",
          witnesses: "keine",
          technical: "keine",
          attachment: "demo-anhang"
        });
        state.data = Q.loadState();
        const next = state.data.complaints.find((x) => x.id === id);
        if (next) renderComplaintDetail(next);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    fillSelects();
    renderList();
    bind();
  });
})();
