(() => {
  const Q = window.AdminQualityDemo;
  const state = { data: Q.loadState() };

  function badge(v) {
    const cls = ["hoch", "besonders sensibel", "kritisch"].some((x) => Q.normalize(v).includes(x)) ? "kritisch" : ["kunde gesucht", "aufbewahrungsfrist", "kontaktiert"].some((x) => Q.normalize(v).includes(x)) ? "wichtig" : "info";
    return `<span class="q-badge ${cls}">${v}</span>`;
  }

  function kpis() {
    const rows = state.data.foundItems;
    const map = [
      ["offene Fundsachen", rows.filter((x) => !["abgeholt", "archiviert", "entsorgt als Demo"].includes(x.status)).length],
      ["heute gefunden", rows.filter((x) => x.date === Q.todayIso()).length],
      ["Kunden zugeordnet", rows.filter((x) => Boolean(x.customerAssigned)).length],
      ["abgeholt", rows.filter((x) => x.status === "abgeholt").length],
      ["ungeklaert", rows.filter((x) => ["neu", "nicht zugeordnet", "Kunde gesucht"].includes(x.status)).length],
      ["wertvolle Gegenstaende", rows.filter((x) => ["hoch", "besonders sensibel"].includes(x.valueCategory)).length],
      ["Aufbewahrungsfrist laeuft ab", rows.filter((x) => x.status === "Aufbewahrungsfrist laeuft").length],
      ["an Behoerde uebergeben als Demo", rows.filter((x) => x.status === "an Fundbuero uebergeben als Demo").length]
    ];
    const node = document.querySelector("[data-found-kpis]");
    if (!node) return;
    node.innerHTML = map.map((x) => `<article class="q-card"><small>${x[0]}</small><strong>${x[1]}</strong></article>`).join("");
  }

  function renderTable() {
    const body = document.querySelector("[data-found-table]");
    if (!body) return;
    if (!state.data.foundItems.length) {
      body.innerHTML = '<tr><td colspan="9">Keine Fundsachen vorhanden.</td></tr>';
      return;
    }
    body.innerHTML = state.data.foundItems.map((x) => `<tr><td>${x.number}</td><td>${x.object}<br><small>${x.category}</small></td><td>${x.vehicle || "-"} / ${x.rideId || "-"}</td><td>${x.date} ${x.time}</td><td>${badge(x.valueCategory)}</td><td>${badge(x.status)}</td><td>${x.customerAssigned || "-"}</td><td>${x.storage || "-"}</td><td><div class="q-actions"><button class="admin-btn admin-btn-secondary" type="button" data-found-link="${x.id}">Zuordnen</button><button class="admin-btn" type="button" data-found-handover="${x.id}">Uebergabe</button></div></td></tr>`).join("");
  }

  function openModal(title, body, foot) {
    const m = document.querySelector("[data-found-modal]");
    const t = document.querySelector("[data-found-modal-title]");
    const b = document.querySelector("[data-found-modal-body]");
    const f = document.querySelector("[data-found-modal-foot]");
    if (!m || !t || !b || !f) return;
    t.textContent = title;
    b.innerHTML = body;
    f.innerHTML = foot || '<button class="admin-btn admin-btn-secondary" type="button" data-found-close>Schliessen</button>';
    m.hidden = false;
  }

  function closeModal() {
    const m = document.querySelector("[data-found-modal]");
    if (m) m.hidden = true;
  }

  function bind() {
    const form = document.querySelector("[data-found-form]");
    if (form) {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const payload = Object.fromEntries(new FormData(form).entries());
        Q.addFoundItem(state.data, payload);
        state.data = Q.loadState();
        kpis();
        renderTable();
        form.reset();
      });
    }

    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-found-close]")) {
        closeModal();
        return;
      }

      const link = event.target.closest("[data-found-link]");
      if (link) {
        const id = link.getAttribute("data-found-link") || "";
        const row = state.data.foundItems.find((x) => x.id === id);
        if (!row) return;
        openModal("Kundenzuordnung", `<form class="q-form-grid" data-found-link-form><input type="hidden" name="id" value="${id}"><label>Kunde-ID<input name="customerAssigned" value="${row.customerAssigned || ""}" placeholder="z. B. K-1001"></label><label>Status<select name="status"><option>Kunde gesucht</option><option>Kunde kontaktiert</option><option>Abholung vereinbart</option></select></label><label class="full">Notiz<input name="note" value="${row.note || ""}"></label></form><p class="q-note">Demo-Abgleich basiert auf Fahrt/Fahrzeug/Zeitraum und manueller Plausibilitaet.</p>`, `<button class="admin-btn" type="button" data-found-link-save>Speichern</button><button class="admin-btn admin-btn-secondary" type="button" data-found-close>Abbrechen</button>`);
        return;
      }

      const hand = event.target.closest("[data-found-handover]");
      if (hand) {
        const id = hand.getAttribute("data-found-handover") || "";
        const row = state.data.foundItems.find((x) => x.id === id);
        if (!row) return;
        openModal("Uebergabe Fundsache", `<form class="q-form-grid" data-found-hand-form><input type="hidden" name="id" value="${id}"><label>Empfaenger<input name="receiver" required></label><label>Datum<input type="date" name="date" value="${Q.todayIso()}"></label><label>Uhrzeit<input type="time" name="time"></label><label>Identitaet geprueft als Demo<select name="identityCheckedDemo"><option>Ja</option><option>Nein</option></select></label><label>Gegenstand bestaetigt<select name="objectConfirmed"><option>Ja</option><option>Nein</option></select></label><label>Unterschrift als Demo<input name="signatureDemo" value="Demo-Signatur"></label><label>Bearbeiter<input name="owner" value="Admin"></label><label class="full">Notiz<input name="note"></label></form>`, `<button class="admin-btn" type="button" data-found-hand-save>Uebergabe speichern</button><button class="admin-btn admin-btn-secondary" type="button" data-found-close>Abbrechen</button>`);
        return;
      }

      if (event.target.closest("[data-found-link-save]")) {
        const formEl = document.querySelector("[data-found-link-form]");
        if (!formEl) return;
        const fd = new FormData(formEl);
        const id = String(fd.get("id") || "");
        const row = state.data.foundItems.find((x) => x.id === id);
        if (!row) return;
        row.customerAssigned = String(fd.get("customerAssigned") || "");
        row.note = String(fd.get("note") || "");
        Q.updateFoundStatus(state.data, id, String(fd.get("status") || "Kunde gesucht"));
        state.data = Q.loadState();
        kpis();
        renderTable();
        closeModal();
        return;
      }

      if (event.target.closest("[data-found-hand-save]")) {
        const formEl = document.querySelector("[data-found-hand-form]");
        if (!formEl) return;
        const fd = new FormData(formEl);
        const id = String(fd.get("id") || "");
        Q.handoverFoundItem(state.data, id, Object.fromEntries(fd.entries()));
        state.data = Q.loadState();
        kpis();
        renderTable();
        closeModal();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    kpis();
    renderTable();
    bind();
  });
})();
