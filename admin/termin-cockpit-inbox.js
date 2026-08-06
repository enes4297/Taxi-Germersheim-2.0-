(() => {
  const Q = window.AdminQuickIntakeDemo;
  const S = window.AdminSystemCenter || {};
  if (!Q) return;

  const state = {
    data: null,
    selectedEntryId: ""
  };

  function load() {
    state.data = Q.loadState();
    state.selectedEntryId = state.data.ui.selectedEntryId || (state.data.entries[0] && state.data.entries[0].id) || "";
  }

  function visibleEntries() {
    return state.data.entries.filter((entry) => !entry.deleted && [Q.STATUS.quick, Q.STATUS.draft, Q.STATUS.review, Q.STATUS.complete].includes(entry.status));
  }

  function selectedEntry() {
    return visibleEntries().find((entry) => entry.id === state.selectedEntryId) || visibleEntries()[0] || null;
  }

  function formatDateTime(value) {
    if (S.formatDateTime) return S.formatDateTime(value);
    return String(value || "");
  }

  function renderStats() {
    const node = document.querySelector("[data-quick-inbox-stats]");
    if (!node) return;
    const stats = Q.getStats(visibleEntries());
    node.innerHTML = `
      <span>Offen ${stats.total}</span>
      <span>Dringend ${stats.urgent}</span>
      <span>Unvollständig ${stats.missing}</span>
    `;
  }

  function renderList() {
    const node = document.querySelector("[data-quick-inbox-list]");
    if (!node) return;
    const rows = visibleEntries();
    if (!rows.length) {
      node.innerHTML = '<article class="tc-inbox-panel"><strong>Inbox leer</strong><p>Keine offenen Prüffälle vorhanden.</p></article>';
      return;
    }
    node.innerHTML = rows.map((entry) => `
      <article class="tc-inbox-item${entry.id === state.selectedEntryId ? " is-active" : ""}">
        <button type="button" class="tc-inbox-open" data-inbox-open="${entry.id}">
          <strong>${formatDateTime(entry.createdAt)}</strong>
          <p>${entry.rawNote || entry.recognized.customer || "Notiz"}</p>
          <p>${entry.recognized.customer || "Kunde offen"} · ${entry.recognized.dateLabel || entry.recognized.date || "Datum offen"} · ${entry.recognized.timeLabel || entry.recognized.time || (entry.recognized.timeOpen ? "offen" : "Uhrzeit offen")}</p>
          <p>${entry.recognized.pickup || "Abholung offen"} → ${entry.recognized.destination || "Ziel offen"}</p>
        </button>
        <div class="tc-actions">
          <button type="button" data-inbox-open="${entry.id}">Öffnen</button>
          <button type="button" data-inbox-release="${entry.id}">Freigeben</button>
        </div>
      </article>
    `).join("");
  }

  function renderDetail() {
    const node = document.querySelector("[data-quick-inbox-detail]");
    if (!node) return;
    const entry = selectedEntry();
    if (!entry) {
      node.innerHTML = '<p class="m-note">Kein Eintrag ausgewählt.</p>';
      return;
    }

    node.innerHTML = `
      <article class="tc-inbox-panel">
        <h3>Schnelle Prüfung</h3>
        <p class="m-note">${entry.rawNote || entry.transcriptDemo || "Keine Ursprungsnotiz"}</p>
        <p>Erkannter Kunde: ${entry.recognized.customer || "-"}</p>
        <p>Erkanntes Datum: ${entry.recognized.dateLabel || entry.recognized.date || "-"}</p>
        <p>Erkannte Uhrzeit: ${entry.recognized.timeLabel || entry.recognized.time || (entry.recognized.timeOpen ? "offen" : "-")}</p>
        <p>Abholung: ${entry.recognized.pickup || "-"}</p>
        <p>Ziel: ${entry.recognized.destination || "-"}</p>
        <p>Fehlende Angaben: ${entry.missing.length ? entry.missing.join(" · ") : "keine"}</p>
        <div class="tc-inbox-edit-grid">
          <label>Kunde<input type="text" value="${entry.recognized.customer || ""}" data-inbox-field="customer"></label>
          <label>Datum<input type="date" value="${entry.recognized.date || ""}" data-inbox-field="date"></label>
          <label>Uhrzeit<input type="time" value="${entry.recognized.time || ""}" data-inbox-field="time"></label>
          <label>Abholort<input type="text" value="${entry.recognized.pickup || ""}" data-inbox-field="pickup"></label>
          <label>Ziel<input type="text" value="${entry.recognized.destination || ""}" data-inbox-field="destination"></label>
          <label>Fahrtart<input type="text" value="${entry.recognized.rideType || "Taxi"}" data-inbox-field="rideType"></label>
        </div>
        <div class="tc-actions">
          <button type="button" data-inbox-release="${entry.id}">Für Planung freigeben</button>
          <button type="button" data-inbox-save-entry="${entry.id}">Angaben ergänzen</button>
          <button type="button" data-inbox-save-draft="${entry.id}">Als Entwurf speichern</button>
          <button type="button" data-inbox-delete="${entry.id}">Verwerfen</button>
          ${entry.urgent ? `<button type="button" data-inbox-live="${entry.id}">Direkt in Live-Dispo</button>` : ""}
        </div>
      </article>
    `;
  }

  function renderSide() {
    const node = document.querySelector("[data-quick-inbox-side]");
    if (!node) return;
    const entry = selectedEntry();
    if (!entry) {
      node.innerHTML = '<p class="m-note">Keine Vorschläge verfügbar.</p>';
      return;
    }
    const customers = entry.customerSuggestions || [];
    node.innerHTML = `
      <article class="tc-inbox-panel">
        <h3>Stammkundenvorschläge</h3>
        ${customers.length ? customers.map((customer) => `
          <div class="tc-inbox-customer">
            <strong>${customer.name}</strong>
            <p>${customer.phone || "-"}</p>
            <p>Hauptadresse: ${customer.mainAddress || "-"}</p>
            <p>Letzte Fahrt: ${customer.lastRide}</p>
            <p>Häufiges Ziel: ${customer.frequentDestination}</p>
            ${customer.hint ? `<p>${customer.hint}</p>` : ""}
            <div class="tc-actions">
              <button type="button" data-inbox-link-customer="${customer.id}">auswählen</button>
              <button type="button" data-inbox-link-last-ride="${customer.id}">letzte Fahrt übernehmen</button>
              <button type="button" data-inbox-new-customer>neue Person anlegen</button>
              <button type="button" data-inbox-continue>ohne Kundenprofil fortfahren</button>
            </div>
          </div>
        `).join("") : '<p class="m-note">Kein passender Stammkunde erkannt.</p>'}
        <article class="tc-inbox-side-box">
          <strong>Vollständigkeit</strong>
          <p>${entry.completeness}</p>
          <p>${entry.hints.length ? entry.hints.join(" · ") : "Für Planung ausreichend"}</p>
        </article>
      </article>
    `;
  }

  function rerender() {
    load();
    renderStats();
    renderList();
    renderDetail();
    renderSide();
  }

  function persistFields(entryId) {
    const entry = selectedEntry();
    if (!entry || entry.id !== entryId) return;
    const patch = { recognized: {} };
    document.querySelectorAll("[data-inbox-field]").forEach((field) => {
      const key = field.getAttribute("data-inbox-field") || "";
      patch.recognized[key] = String(field.value || "").trim();
    });
    Q.updateEntry(state.data, entryId, patch);
    state.data = Q.loadState();
  }

  function pushUrgentToLiveDispo(entry) {
    const live = JSON.parse(localStorage.getItem('adminLiveDispoV131') || '{}');
    live.orders = Array.isArray(live.orders) ? live.orders : [];
    live.sequence = live.sequence && typeof live.sequence === 'object' ? live.sequence : {};
    live.sequence.order = Number(live.sequence.order || live.orders.length || 0) + 1;
    live.orders.unshift({
      id: `ORD-${live.sequence.order}`,
      customer: entry.recognized.customer || 'Dringender Termin',
      pickup: entry.recognized.pickup || 'offen',
      destination: entry.recognized.destination || 'offen',
      pickupTime: entry.recognized.time || 'offen',
      rideType: entry.recognized.rideType || 'Taxi',
      wheelchair: Boolean(entry.recognized.wheelchair),
      persons: Number(entry.recognized.persons || 1),
      note: entry.rawNote || entry.recognized.note || '',
      status: 'Neu',
      priority: 'Hoch',
      date: entry.recognized.date || Q.todayIso(),
      returnTripExpected: Boolean(entry.recognized.returnTrip)
    });
    localStorage.setItem('adminLiveDispoV131', JSON.stringify(live));
  }

  function bind() {
    document.addEventListener('click', (event) => {
      const open = event.target.closest('[data-inbox-open]');
      if (open) {
        state.data.ui.selectedEntryId = open.getAttribute('data-inbox-open') || '';
        Q.saveState(state.data);
        rerender();
        return;
      }

      const edit = event.target.closest('[data-inbox-edit]');
      if (edit) {
        state.data.ui.selectedEntryId = edit.getAttribute('data-inbox-edit') || '';
        Q.saveState(state.data);
        rerender();
        return;
      }

      const saveDraft = event.target.closest('[data-inbox-save-draft]');
      if (saveDraft) {
        const id = saveDraft.getAttribute('data-inbox-save-draft') || '';
        persistFields(id);
        Q.updateEntry(state.data, id, { status: Q.STATUS.draft, reviewNote: 'Als Entwurf gespeichert' });
        rerender();
        return;
      }

      const saveEntry = event.target.closest('[data-inbox-save-entry]');
      if (saveEntry) {
        const id = saveEntry.getAttribute('data-inbox-save-entry') || '';
        persistFields(id);
        rerender();
        return;
      }

      const release = event.target.closest('[data-inbox-release]');
      if (release) {
        const id = release.getAttribute('data-inbox-release') || '';
        persistFields(id);
        Q.releaseToPlanning(state.data, id);
        window.dispatchEvent(new CustomEvent('v24-intake-approved', { detail: { entryId: id } }));
        rerender();
        return;
      }

      const remove = event.target.closest('[data-inbox-delete]');
      if (remove) {
        const id = remove.getAttribute('data-inbox-delete') || '';
        Q.deleteEntry(state.data, id);
        rerender();
        return;
      }

      const task = event.target.closest('[data-inbox-task]');
      if (task) {
        const id = task.getAttribute('data-inbox-task') || '';
        Q.saveAsTask(state.data, id);
        rerender();
        return;
      }

      const remind = event.target.closest('[data-inbox-remind]');
      if (remind) {
        const id = remind.getAttribute('data-inbox-remind') || '';
        Q.postponeEntry(state.data, id, 'später');
        rerender();
        return;
      }

      const linkCustomer = event.target.closest('[data-inbox-link-customer]');
      if (linkCustomer) {
        const id = linkCustomer.getAttribute('data-inbox-link-customer') || '';
        const entry = selectedEntry();
        if (!entry) return;
        Q.linkCustomer(state.data, entry.id, id, false);
        rerender();
        return;
      }

      const linkLast = event.target.closest('[data-inbox-link-last-ride]');
      if (linkLast) {
        const id = linkLast.getAttribute('data-inbox-link-last-ride') || '';
        const entry = selectedEntry();
        if (!entry) return;
        Q.linkCustomer(state.data, entry.id, id, true);
        rerender();
        return;
      }

      const later = event.target.closest('[data-inbox-continue]');
      if (later) {
        const entry = selectedEntry();
        if (!entry) return;
        Q.postponeEntry(state.data, entry.id, 'später');
        rerender();
        return;
      }

      const live = event.target.closest('[data-inbox-live]');
      if (live) {
        const entry = selectedEntry();
        if (!entry) return;
        pushUrgentToLiveDispo(entry);
        Q.updateEntry(state.data, entry.id, { reviewNote: 'Direkt in Live-Dispo vorgemerkt' });
        rerender();
      }
    });

    window.addEventListener('v24-quick-intake-updated', rerender);
    window.addEventListener('storage', (event) => {
      if (!event.key || ![Q.KEY, 'adminTerminCockpitV22Phase1'].includes(event.key)) return;
      rerender();
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!document.querySelector('[data-quick-inbox-list]')) return;
    rerender();
    bind();
  });
})();
