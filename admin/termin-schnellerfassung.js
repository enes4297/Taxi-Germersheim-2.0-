(() => {
  const Q = window.AdminQuickIntakeDemo;
  const state = {
    data: Q.loadState(),
    mode: "speech",
    recorderState: "bereit",
    seconds: 0,
    timer: null,
    draftPreview: null
  };

  function formatTimer(total) {
    const min = Math.floor(total / 60);
    const sec = total % 60;
    return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }

  function setMode(mode) {
    state.mode = mode;
    state.data.ui.preferredMode = mode;
    Q.saveState(state.data);
    document.querySelectorAll("[data-intake-mode]").forEach((button) => {
      button.classList.toggle("is-active", (button.getAttribute("data-intake-mode") || "") === mode);
    });
    document.querySelectorAll("[data-intake-pane]").forEach((pane) => {
      pane.classList.toggle("is-visible", (pane.getAttribute("data-intake-pane") || "") === mode);
    });
  }

  function updateRecorderView() {
    const stateNode = document.querySelector("[data-recorder-state]");
    const timerNode = document.querySelector("[data-recorder-timer]");
    if (stateNode) stateNode.textContent = state.recorderState;
    if (timerNode) timerNode.textContent = formatTimer(state.seconds);
  }

  function startTimer() {
    if (state.timer) return;
    state.timer = setInterval(() => {
      state.seconds += 1;
      updateRecorderView();
    }, 1000);
  }

  function stopTimer(reset) {
    if (state.timer) clearInterval(state.timer);
    state.timer = null;
    if (reset) state.seconds = 0;
    updateRecorderView();
  }

  function renderSpeechPreview() {
    const node = document.querySelector("[data-speech-preview]");
    if (!node) return;
    if (!state.draftPreview) {
      node.innerHTML = '<p class="m-note">Automatisch erkannt – bitte kurz prüfen, bevor der Entwurf gespeichert wird.</p>';
      return;
    }
    const row = state.draftPreview;
    node.innerHTML = `
      <article class="ts-preview-card">
        <strong>Automatisch erkannt – bitte kurz prüfen.</strong>
        <p>Kunde: ${row.customer || "-"}</p>
        <p>Datum: ${row.dateLabel || row.date || "-"}</p>
        <p>Uhrzeit: ${row.timeLabel || row.time || (row.timeOpen ? "offen" : "-")}</p>
        <p>Abholung: ${row.pickup || "-"}</p>
        <p>Ziel: ${row.destination || "-"}</p>
        <p>Fahrtart: ${row.rideType || "Taxi"}</p>
        <p>Rückfahrt: ${row.returnTripStatus || "noch ungeklärt"}</p>
      </article>
    `;
  }

  function renderLastEntries() {
    const node = document.querySelector("[data-last-entries]");
    if (!node) return;
    const rows = state.data.entries.filter((entry) => !entry.deleted).slice(0, 5);
    node.innerHTML = rows.map((entry) => `
      <article class="ts-last-card">
        <strong>${entry.recognized.customer || entry.rawNote || "Notiz"}</strong>
        <p>${entry.status} · ${entry.completeness}</p>
        <p>${entry.recognized.dateLabel || entry.recognized.date || "ohne Datum"} · ${entry.recognized.timeLabel || entry.recognized.time || (entry.recognized.timeOpen ? "offen" : "ohne Uhrzeit")}</p>
        <p>${entry.recognized.pickup || "-"} → ${entry.recognized.destination || "-"}</p>
      </article>
    `).join("") || '<p class="m-note">Noch keine Einträge gespeichert.</p>';
  }

  function renderCustomerSuggestions(customers) {
    const node = document.querySelector("[data-form-customer-suggestions]");
    if (!node) return;
    if (!customers.length) {
      node.innerHTML = '<p class="m-note">Passende Stammkunden erscheinen hier als Demo-Vorschlag.</p>';
      return;
    }
    node.innerHTML = customers.map((customer) => `
      <article class="ts-customer-card">
        <strong>${customer.name}</strong>
        <p>${customer.phone || "-"}</p>
        <p>Hauptadresse: ${customer.mainAddress || "-"}</p>
        <p>Letzte Fahrt: ${customer.lastRide}</p>
        <p>Häufiges Ziel: ${customer.frequentDestination}</p>
        <div class="ts-big-actions">
          <button class="admin-btn admin-btn-secondary" type="button" data-customer-pick="${customer.id}">Auswählen</button>
          <button class="admin-btn admin-btn-secondary" type="button" data-customer-last-ride="${customer.id}">Letzte Fahrt übernehmen</button>
        </div>
      </article>
    `).join("");
  }

  function collectSpeechPayload(review) {
    const textArea = document.querySelector("[data-speech-text]");
    const rawText = String(textArea ? textArea.value || "" : "").trim();
    const parsed = Q.parseSpeechDemo(rawText || Q.DEMO_SPEECH_EXAMPLES[0]);
    state.draftPreview = parsed;
    renderSpeechPreview();
    return {
      mode: "speech",
      source: "Mobile Schnellaufnahme",
      rawNote: rawText || Q.DEMO_SPEECH_EXAMPLES[0],
      transcriptDemo: rawText || Q.DEMO_SPEECH_EXAMPLES[0],
      recognized: parsed,
      status: review ? Q.STATUS.review : Q.STATUS.quick,
      priority: parsed.priority || "mittel"
    };
  }

  function collectFormPayload(review) {
    const form = document.querySelector("[data-quick-form]");
    const fd = new FormData(form);
    return {
      mode: "form",
      source: "Mobile Schnellaufnahme",
      rawNote: String(fd.get("note") || "").trim(),
      recognized: {
        customer: String(fd.get("customer") || "").trim(),
        date: String(fd.get("date") || ""),
        dateLabel: String(fd.get("date") || ""),
        time: String(fd.get("time") || ""),
        timeLabel: String(fd.get("time") || ""),
        pickup: String(fd.get("pickup") || "").trim(),
        destination: String(fd.get("destination") || "").trim(),
        rideType: String(fd.get("rideType") || "Taxi"),
        returnTrip: Boolean(fd.get("returnTime")) || String(fd.get("note") || "").toLowerCase().includes("rückfahrt") || String(fd.get("note") || "").toLowerCase().includes("rueckfahrt"),
        returnTripStatus: fd.get("returnTime") ? "feste Uhrzeit" : (String(fd.get("note") || "").toLowerCase().includes("rückfahrt offen") ? "offene Rückfahrt" : "noch ungeklärt"),
        phone: String(fd.get("phone") || "").trim(),
        wheelchair: String(fd.get("wheelchair") || "Nein") === "Ja",
        persons: Number(fd.get("persons") || 1),
        note: String(fd.get("note") || "").trim(),
        insurance: String(fd.get("insurance") || "").trim(),
        priority: String(fd.get("priority") || "mittel")
      },
      status: review ? Q.STATUS.review : Q.STATUS.complete,
      priority: String(fd.get("priority") || "mittel")
    };
  }

  function collectNotePayload(review) {
    const form = document.querySelector("[data-note-form]");
    const fd = new FormData(form);
    return {
      mode: "note",
      source: "Mobile Schnellaufnahme",
      rawNote: String(fd.get("note") || "").trim(),
      recognized: Q.parseSpeechDemo(String(fd.get("note") || "").trim()),
      reminder: String(fd.get("reminder") || ""),
      status: review ? Q.STATUS.review : Q.STATUS.quick,
      priority: String(fd.get("priority") || "mittel")
    };
  }

  function saveCurrent(review) {
    let payload = null;
    if (state.mode === "speech") payload = collectSpeechPayload(review);
    if (state.mode === "form") {
      const form = document.querySelector("[data-quick-form]");
      if (!form.reportValidity()) return;
      payload = collectFormPayload(review);
    }
    if (state.mode === "note") {
      const form = document.querySelector("[data-note-form]");
      if (!form.reportValidity()) return;
      payload = collectNotePayload(review);
    }
    const row = Q.addEntry(state.data, payload);
    state.data = Q.loadState();
    const feedback = document.querySelector("[data-mobile-save-feedback]");
    if (feedback) feedback.textContent = review ? "Entwurf gespeichert und zur Prüfung vorgemerkt." : "Termin vorgemerkt. Lokal gespeichert.";
    if (state.mode === "speech") {
      state.recorderState = "Entwurf gespeichert";
      updateRecorderView();
      const textArea = document.querySelector("[data-speech-text]");
      if (textArea) textArea.value = "";
      state.draftPreview = null;
      renderSpeechPreview();
    }
    renderLastEntries();
    window.dispatchEvent(new CustomEvent("v24-quick-intake-updated", { detail: { id: row.id } }));
  }

  function bindModes() {
    document.querySelectorAll("[data-intake-mode]").forEach((button) => {
      button.addEventListener("click", () => setMode(button.getAttribute("data-intake-mode") || "speech"));
    });
  }

  function bindRecorder() {
    document.addEventListener("click", (event) => {
      const button = event.target.closest("[data-recorder-action]");
      if (!button) return;
      const action = button.getAttribute("data-recorder-action") || "";
      const textArea = document.querySelector("[data-speech-text]");

      if (action === "start") {
        state.recorderState = "Aufnahme läuft";
        state.seconds = 0;
        if (textArea && !String(textArea.value || "").trim()) {
          textArea.value = Q.DEMO_SPEECH_EXAMPLES[Math.floor(Math.random() * Q.DEMO_SPEECH_EXAMPLES.length)];
        }
        startTimer();
      }
      if (action === "pause") {
        state.recorderState = "pausiert";
        stopTimer(false);
      }
      if (action === "resume") {
        state.recorderState = "Aufnahme läuft";
        startTimer();
      }
      if (action === "stop") {
        state.recorderState = "Aufnahme beendet";
        stopTimer(false);
        collectSpeechPayload(true);
      }
      if (action === "cancel") {
        state.recorderState = "bereit";
        stopTimer(true);
        if (textArea) textArea.value = "";
        state.draftPreview = null;
        renderSpeechPreview();
      }
      updateRecorderView();
    });
  }

  function bindShortcuts() {
    document.addEventListener("click", (event) => {
      const dateBtn = event.target.closest("[data-shortcut-date]");
      if (dateBtn) {
        const form = document.querySelector("[data-quick-form]");
        if (!form) return;
        const key = dateBtn.getAttribute("data-shortcut-date") || "today";
        if (key === "today") form.elements.date.value = Q.todayIso();
        if (key === "tomorrow") form.elements.date.value = Q.addDaysIso(Q.todayIso(), 1);
        if (key === "dayAfter") form.elements.date.value = Q.addDaysIso(Q.todayIso(), 2);
        return;
      }

      const timeBtn = event.target.closest("[data-shortcut-time]");
      if (timeBtn) {
        const form = document.querySelector("[data-quick-form]");
        if (!form) return;
        const now = new Date();
        const baseMin = now.getHours() * 60 + now.getMinutes();
        const total = timeBtn.getAttribute("data-shortcut-time") === "plus30" ? baseMin + 30 : baseMin;
        const hh = Math.floor(total / 60) % 24;
        const mm = total % 60;
        form.elements.time.value = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
        return;
      }

      const returnBtn = event.target.closest("[data-shortcut-return]");
      if (returnBtn) {
        const form = document.querySelector("[data-quick-form]");
        if (!form) return;
        const key = returnBtn.getAttribute("data-shortcut-return") || "open";
        if (key === "open") {
          form.elements.note.value = `${form.elements.note.value ? `${form.elements.note.value} · ` : ""}Rückfahrt offen`;
        }
        if (key === "sameRoute") {
          form.elements.note.value = `${form.elements.note.value ? `${form.elements.note.value} · ` : ""}Gleiche Strecke zurück`;
        }
        return;
      }

      const pick = event.target.closest("[data-customer-pick]");
      if (pick) {
        const customers = Q.suggestCustomers(document.querySelector('[data-quick-form]')?.elements.customer.value || "", 6);
        const customer = customers.find((c) => c.id === (pick.getAttribute("data-customer-pick") || ""));
        const form = document.querySelector("[data-quick-form]");
        if (!customer || !form) return;
        form.elements.customer.value = customer.displayName || `${customer.firstName || ""} ${customer.lastName || ""}`.trim();
        form.elements.phone.value = customer.phone || "";
        if (customer.addresses && customer.addresses[0]) form.elements.pickup.value = customer.addresses[0].fullAddress || "";
        form.elements.destination.value = customer.favoriteDestination || form.elements.destination.value;
        renderCustomerSuggestions(customers.map(Q.mapCustomerCard));
        return;
      }

      const lastRide = event.target.closest("[data-customer-last-ride]");
      if (lastRide) {
        const customers = Q.suggestCustomers(document.querySelector('[data-quick-form]')?.elements.customer.value || "", 6);
        const customer = customers.find((c) => c.id === (lastRide.getAttribute("data-customer-last-ride") || ""));
        const form = document.querySelector("[data-quick-form]");
        const ride = customer && customer.rides && customer.rides[0] ? customer.rides[0] : null;
        if (!customer || !ride || !form) return;
        form.elements.customer.value = customer.displayName || `${customer.firstName || ""} ${customer.lastName || ""}`.trim();
        form.elements.phone.value = customer.phone || "";
        form.elements.pickup.value = ride.pickup || "";
        form.elements.destination.value = ride.destination || "";
        form.elements.rideType.value = ride.rideType || "Taxi";
      }
    });

    const form = document.querySelector("[data-quick-form]");
    if (form) {
      form.elements.date.value = Q.addDaysIso(Q.todayIso(), 1);
      form.elements.customer.addEventListener("input", () => {
        const rows = Q.suggestCustomers(form.elements.customer.value || "", 4).map(Q.mapCustomerCard);
        renderCustomerSuggestions(rows);
      });
    }
  }

  function bindBottomBar() {
    const primary = document.querySelector("[data-primary-save]");
    const secondary = document.querySelector("[data-secondary-save]");
    if (primary) primary.addEventListener("click", () => saveCurrent(false));
    if (secondary) secondary.addEventListener("click", () => saveCurrent(true));
  }

  document.addEventListener("DOMContentLoaded", () => {
    state.data = Q.loadState();
    setMode(state.data.ui.preferredMode || "speech");
    updateRecorderView();
    renderSpeechPreview();
    renderLastEntries();
    renderCustomerSuggestions([]);
    bindModes();
    bindRecorder();
    bindShortcuts();
    bindBottomBar();
  });
})();
