(() => {
  const STORAGE_KEYS = {
    customers: "adminSharedCustomersV14",
    series: "adminSharedSeriesV14",
    rideInbox: "adminSharedRideInboxV14"
  };

  const RIDE_TYPES = [
    "Taxi", "Krankenfahrt", "Dialyse", "Chemo", "Strahlentherapie", "Rollstuhlfahrt", "Flughafenfahrt", "Schülerfahrt", "Firmenfahrt", "Bahntransfer"
  ];

  const DAY_MAP = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

  const DEFAULT_SERIES = [
    {
      id: "SR-901",
      customerId: "K-1001",
      customerLabel: "Helga Maurer",
      rideType: "Dialyse",
      pickup: "Germersheim Nord 12",
      destination: "Dialysezentrum Südpfalz",
      startDate: "2026-08-01",
      endDate: "",
      pickupTime: "07:40",
      returnTime: "11:45",
      days: ["Mo", "Mi", "Fr"],
      priority: "Hoch",
      wheelchair: true,
      companion: false,
      exceptions: ["2026-08-15"],
      pauses: ["2026-09-10 bis 2026-09-24"],
      notes: "Dialyse-Routine",
      status: "aktiv"
    },
    {
      id: "SR-902",
      customerId: "K-1002",
      customerLabel: "Nora Winter",
      rideType: "Chemo",
      pickup: "Leimersheim Hauptstraße 9",
      destination: "Onkologie Ludwigshafen",
      startDate: "2026-08-01",
      endDate: "",
      pickupTime: "09:20",
      returnTime: "14:30",
      days: ["Di", "Do"],
      priority: "Mittel",
      wheelchair: false,
      companion: true,
      exceptions: [],
      pauses: [],
      notes: "Seiteneingang B",
      status: "aktiv"
    }
  ];

  const state = {
    customers: loadArray(STORAGE_KEYS.customers, []),
    series: loadArray(STORAGE_KEYS.series, DEFAULT_SERIES),
    modalOpen: false
  };

  function formatDate(value) {
    const text = String(value || "").trim();
    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return text || "-";
    return `${match[3]}.${match[2]}.${match[1]}`;
  }

  function toIsoDate(value) {
    const text = String(value || "").trim();
    const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) return text;
    const de = text.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (de) return `${de[3]}-${de[2]}-${de[1]}`;
    return text;
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function loadArray(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return deepClone(fallback);
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : deepClone(fallback);
    } catch {
      return deepClone(fallback);
    }
  }

  function saveSeries() {
    localStorage.setItem(STORAGE_KEYS.series, JSON.stringify(state.series));
  }

  function todayISO() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }

  function customerLabel(customer) {
    if (!customer) return "Unbekannter Kunde";
    return customer.displayName || `${customer.firstName || ""} ${customer.lastName || ""}`.trim() || customer.company || "Unbekannter Kunde";
  }

  function fillFormSelects() {
    const customerSelect = document.querySelector("[data-series-customer-select]");
    const typeSelect = document.querySelector("[data-series-ride-type]");

    if (customerSelect) {
      customerSelect.innerHTML = state.customers.length
        ? state.customers.map((customer) => `<option value="${customer.id}">${customerLabel(customer)} (${customer.type || "Kunde"})</option>`).join("")
        : '<option value="">Keine Kunden vorhanden</option>';
    }

    if (typeSelect) {
      typeSelect.innerHTML = RIDE_TYPES.map((type) => `<option value="${type}">${type}</option>`).join("");
    }

    const form = document.querySelector("[data-series-form]");
    if (form) {
      form.startDate.value = todayISO();
      form.pickupTime.value = "08:00";
      form.returnTime.value = "";
    }

    hydrateFieldsByCustomer();
  }

  function hydrateFieldsByCustomer() {
    const form = document.querySelector("[data-series-form]");
    if (!form) return;
    const customerId = form.customerId.value;
    const customer = state.customers.find((item) => item.id === customerId);
    if (!customer) return;

    const address = (customer.addresses || []).find((entry) => entry.isDefault) || (customer.addresses || [])[0];
    if (address && !form.pickup.value) form.pickup.value = address.fullAddress || "";
    if (customer.favoriteDestination && !form.destination.value) form.destination.value = customer.favoriteDestination;

    if ((customer.type || "") === "Patient") {
      form.rideType.value = "Dialyse";
      form.priority.value = "Hoch";
      form.wheelchair.value = customer.wheelchair ? "Ja" : "Nein";
      form.companion.value = customer.companion ? "Ja" : "Nein";
    }
  }

  function collectOccurrences(series, days = 14) {
    const entries = [];
    const start = new Date(`${todayISO()}T00:00:00`);

    for (let i = 0; i < days; i += 1) {
      const date = new Date(start.getTime() + i * 86400000);
      const dayKey = DAY_MAP[date.getDay()];
      const dateIso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

      if (series.status !== "aktiv") continue;
      if (!series.days.includes(dayKey)) continue;
      if (series.startDate && dateIso < series.startDate) continue;
      if (series.endDate && dateIso > series.endDate) continue;
      if ((series.exceptions || []).includes(dateIso)) continue;

      entries.push({
        seriesId: series.id,
        customerId: series.customerId,
        customerLabel: series.customerLabel,
        date: dateIso,
        dayKey,
        pickupTime: series.pickupTime,
        returnTime: series.returnTime,
        pickup: series.pickup,
        destination: series.destination,
        rideType: series.rideType,
        priority: series.priority,
        wheelchair: series.wheelchair,
        companion: series.companion,
        override: (series.dateOverrides && series.dateOverrides[dateIso]) || null
      });
    }

    return entries.map((entry) => {
      if (!entry.override) return entry;
      return {
        ...entry,
        pickupTime: entry.override.pickupTime || entry.pickupTime,
        returnTime: entry.override.returnTime || entry.returnTime,
        pickup: entry.override.pickup || entry.pickup,
        destination: entry.override.destination || entry.destination,
        note: entry.override.note || ""
      };
    });
  }

  function detectConflicts(occurrences) {
    const conflicts = [];
    const bySlot = new Map();

    occurrences.forEach((entry) => {
      const key = `${entry.date}|${entry.pickupTime}|${entry.customerId}`;
      const list = bySlot.get(key) || [];
      list.push(entry);
      bySlot.set(key, list);
    });

    bySlot.forEach((list, key) => {
      if (list.length > 1) {
        conflicts.push({ type: "Doppelbuchung", key, items: list });
      }
    });

    occurrences.forEach((entry) => {
      if (entry.returnTime && entry.returnTime < entry.pickupTime) {
        conflicts.push({ type: "Rückfahrt vor Hinfahrt", key: entry.seriesId, items: [entry] });
      }
    });

    return conflicts;
  }

  function renderStats() {
    const occurrences = state.series.flatMap((item) => collectOccurrences(item, 14));
    const conflicts = detectConflicts(occurrences);
    const today = todayISO();

    const stats = {
      active: state.series.filter((item) => item.status === "aktiv").length,
      paused: state.series.filter((item) => item.status === "pausiert").length,
      today: occurrences.filter((item) => item.date === today).length,
      conflicts: conflicts.length,
      return: state.series.filter((item) => !!item.returnTime).length,
      next7: occurrences.filter((item) => {
        const target = new Date(`${item.date}T00:00:00`).getTime();
        const now = new Date(`${today}T00:00:00`).getTime();
        return target - now <= 6 * 86400000;
      }).length
    };

    Object.entries(stats).forEach(([key, value]) => {
      const node = document.querySelector(`[data-series-stat="${key}"]`);
      if (node) node.textContent = String(value);
    });
  }

  function renderSeriesList() {
    const wrap = document.querySelector("[data-series-list]");
    if (!wrap) return;

    if (!state.series.length) {
      wrap.innerHTML = '<div class="series-empty">Keine Serienfahrten vorhanden.</div>';
      return;
    }

    wrap.innerHTML = state.series.map((item) => `
      <article class="series-item">
        <strong>${item.id} · ${item.customerLabel}</strong>
        <p>${item.rideType} · ${item.pickupTime}${item.returnTime ? ` / Rück ${item.returnTime}` : ""}</p>
        <p>${item.pickup} → ${item.destination}</p>
        <div class="series-chip-row">
          <span class="series-chip">Tage: ${item.days.join("/")}</span>
          <span class="series-chip">Priorität: ${item.priority}</span>
          <span class="series-chip">Status: ${item.status}</span>
        </div>
        <div class="series-actions">
          <button type="button" data-series-item-action="details" data-series-id="${item.id}">Details</button>
          <button type="button" data-series-item-action="pause" data-series-id="${item.id}">${item.status === "aktiv" ? "Pausieren" : "Aktivieren"}</button>
          <button type="button" data-series-item-action="edit" data-series-id="${item.id}">Bearbeiten</button>
          <button type="button" data-series-item-action="single" data-series-id="${item.id}">Einzelne Fahrt ändern</button>
          <button type="button" data-series-item-action="delete" data-series-id="${item.id}">Löschen</button>
        </div>
      </article>
    `).join("");
  }

  function renderCalendar() {
    const wrap = document.querySelector("[data-series-calendar]");
    if (!wrap) return;

    const occurrences = state.series.flatMap((item) => collectOccurrences(item, 14)).sort((a, b) => {
      const aKey = `${a.date} ${a.pickupTime}`;
      const bKey = `${b.date} ${b.pickupTime}`;
      return aKey.localeCompare(bKey);
    });

    if (!occurrences.length) {
      wrap.innerHTML = '<div class="series-empty">Keine Termine in den nächsten 14 Tagen.</div>';
      return;
    }

    wrap.innerHTML = occurrences.map((entry) => `
      <article class="series-calendar-item">
        <strong>${formatDate(entry.date)} · ${entry.dayKey} · ${entry.pickupTime}</strong>
        <p>${entry.customerLabel} · ${entry.rideType}</p>
        <p>${entry.pickup} → ${entry.destination}</p>
        <div class="series-actions">
          <button type="button" data-series-occ-action="edit" data-series-id="${entry.seriesId}" data-series-date="${entry.date}">Einzeländerung</button>
        </div>
      </article>
    `).join("");
  }

  function renderConflicts() {
    const wrap = document.querySelector("[data-series-conflicts]");
    if (!wrap) return;

    const occurrences = state.series.flatMap((item) => collectOccurrences(item, 14));
    const conflicts = detectConflicts(occurrences);

    if (!conflicts.length) {
      wrap.innerHTML = '<div class="series-empty">Keine Konflikte gefunden.</div>';
      return;
    }

    wrap.innerHTML = conflicts.map((entry) => {
      const sample = entry.items[0];
      return `
        <article class="series-conflict-item">
          <strong>${entry.type}</strong>
          <p>${formatDate(sample.date || "-")} · ${sample.customerLabel || "-"}</p>
          <p>${sample.pickupTime || "-"} · ${sample.rideType || "-"}</p>
        </article>
      `;
    }).join("");
  }

  function openModal(title, body) {
    const modal = document.querySelector("[data-series-modal]");
    const titleNode = document.querySelector("[data-series-modal-title]");
    const bodyNode = document.querySelector("[data-series-modal-body]");
    if (!modal || !titleNode || !bodyNode) return;
    titleNode.textContent = title;
    bodyNode.innerHTML = body;
    modal.hidden = false;
    document.body.classList.add("admin-modal-open");
  }

  function closeModal() {
    const modal = document.querySelector("[data-series-modal]");
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove("admin-modal-open");
  }

  function pushRideToInbox(series, date) {
    const customer = state.customers.find((entry) => entry.id === series.customerId);
    const payload = {
      id: `TG-${Math.floor(2000 + Math.random() * 7000)}`,
      customer: series.customerLabel,
      phone: customer ? customer.phone : "",
      pickup: series.pickup,
      destination: series.destination,
      date,
      time: series.pickupTime,
      rideType: series.rideType,
      persons: 1,
      wheelchair: series.wheelchair ? "Ja" : "Nein",
      companion: series.companion ? "Ja" : "Nein",
      priority: series.priority,
      billing: customer ? customer.billingType || "Privat" : "Privat",
      notes: `Automatisch aus Serienfahrt ${series.id}`,
      status: "Neu",
      createdAt: `${date} ${series.pickupTime}`
    };

    const inbox = loadArray(STORAGE_KEYS.rideInbox, []);
    inbox.unshift(payload);
    localStorage.setItem(STORAGE_KEYS.rideInbox, JSON.stringify(inbox.slice(0, 120)));

    if (customer) {
      customer.rides = Array.isArray(customer.rides) ? customer.rides : [];
      customer.rides.unshift({
        id: payload.id,
        date: payload.date,
        time: payload.time,
        pickup: payload.pickup,
        destination: payload.destination,
        rideType: payload.rideType,
        status: "Neu"
      });
      customer.openRide = payload.id;
      customer.ridesCount = Number(customer.ridesCount || 0) + 1;
      customer.updatedAt = todayISO();
      localStorage.setItem(STORAGE_KEYS.customers, JSON.stringify(state.customers));
    }
  }

  function saveSeriesFromForm() {
    const form = document.querySelector("[data-series-form]");
    if (!form) return;

    const values = Object.fromEntries(new FormData(form).entries());
    const days = Array.from(form.querySelectorAll('input[name="days"]:checked')).map((node) => node.value);

    if (!values.customerId || !values.pickup || !values.destination || !values.startDate || !values.pickupTime || !days.length) {
      openModal("Fehlende Daten", "<p>Bitte alle Pflichtfelder und mindestens einen Wochentag ausfüllen.</p>");
      return;
    }

    const customer = state.customers.find((entry) => entry.id === values.customerId);
    const row = {
      id: `SR-${Math.floor(900 + Math.random() * 9000)}`,
      customerId: values.customerId,
      customerLabel: customer ? customerLabel(customer) : "Unbekannter Kunde",
      rideType: values.rideType,
      pickup: values.pickup,
      destination: values.destination,
      startDate: values.startDate,
      endDate: values.endDate || "",
      pickupTime: values.pickupTime,
      returnTime: values.returnTime || "",
      days,
      priority: values.priority,
      wheelchair: values.wheelchair === "Ja",
      companion: values.companion === "Ja",
      exceptions: String(values.exceptions || "").split(";").map((entry) => toIsoDate(entry.trim())).filter(Boolean),
      pauses: String(values.pauses || "").split(";").map((entry) => entry.trim()).filter(Boolean),
      notes: values.notes || "",
      dateOverrides: {},
      status: "aktiv"
    };

    state.series.unshift(row);
    saveSeries();

    const firstDate = collectOccurrences(row, 20)[0];
    if (firstDate) {
      pushRideToInbox(row, firstDate.date);
    }

    renderAll();
    openModal("Serienfahrt gespeichert", `<p>${row.id} für ${row.customerLabel} wurde gespeichert. Erste Fahrt wurde in die Live-Dispo Inbox übergeben.</p>`);
  }

  function renderAll() {
    renderStats();
    renderSeriesList();
    renderCalendar();
    renderConflicts();
  }

  function openSingleRideEditor(series, dateIso) {
    const override = (series.dateOverrides && series.dateOverrides[dateIso]) || {};
    openModal(
      `Einzelfahrt ändern · ${series.id} · ${formatDate(dateIso)}`,
      `
        <form class="series-form" data-series-single-form>
          <input type="hidden" name="seriesId" value="${series.id}">
          <input type="hidden" name="date" value="${dateIso}">
          <label><span>Abholzeit</span><input class="driver-search-input" type="time" name="pickupTime" value="${override.pickupTime || series.pickupTime || ""}"></label>
          <label><span>Rückfahrtzeit</span><input class="driver-search-input" type="time" name="returnTime" value="${override.returnTime || series.returnTime || ""}"></label>
          <label class="full"><span>Abholung</span><input class="driver-search-input" name="pickup" value="${override.pickup || series.pickup || ""}"></label>
          <label class="full"><span>Ziel</span><input class="driver-search-input" name="destination" value="${override.destination || series.destination || ""}"></label>
          <label class="full"><span>Notiz</span><textarea class="driver-search-input" name="note">${override.note || ""}</textarea></label>
          <div class="series-form-actions full">
            <button class="admin-btn" type="submit">Einzelfahrt speichern</button>
          </div>
        </form>
      `
    );
  }

  function bindEvents() {
    const form = document.querySelector("[data-series-form]");
    if (form) {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        saveSeriesFromForm();
      });

      form.customerId.addEventListener("change", () => {
        hydrateFieldsByCustomer();
      });
    }

    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-series-modal-close]")) {
        closeModal();
        return;
      }

      const action = event.target.closest("[data-series-action]");
      if (action) {
        const name = action.getAttribute("data-series-action");
        if (name === "resetForm") {
          if (form) {
            form.reset();
            fillFormSelects();
          }
          return;
        }

        if (name === "openDispo") {
          window.location.href = "live-dispo.html";
        }
        return;
      }

      const itemAction = event.target.closest("[data-series-item-action]");
      if (!itemAction) return;
      const name = itemAction.getAttribute("data-series-item-action");
      const seriesId = itemAction.getAttribute("data-series-id") || "";
      const series = state.series.find((entry) => entry.id === seriesId);
      if (!series) return;

      if (name === "pause") {
        series.status = series.status === "aktiv" ? "pausiert" : "aktiv";
        saveSeries();
        renderAll();
        return;
      }

      if (name === "details") {
        openModal(
          `Details ${series.id}`,
          `<p><strong>Kunde:</strong> ${series.customerLabel}</p><p><strong>Strecke:</strong> ${series.pickup} → ${series.destination}</p><p><strong>Wochentage:</strong> ${series.days.join("/")}</p><p><strong>Uhrzeit:</strong> ${series.pickupTime}${series.returnTime ? ` / Rück ${series.returnTime}` : ""}</p><p><strong>Beginn/Ende:</strong> ${formatDate(series.startDate)} ${series.endDate ? `bis ${formatDate(series.endDate)}` : "ohne Enddatum"}</p><p><strong>Fahrerwunsch:</strong> ${series.driverWish || "-"}</p><p><strong>Status:</strong> ${series.status}</p><p><strong>Ausnahmen:</strong> ${(series.exceptions || []).join(", ") || "-"}</p><p><strong>Pausen:</strong> ${(series.pauses || []).join(", ") || "-"}</p><p><strong>Notizen:</strong> ${series.notes || "-"}</p>`
        );
        return;
      }

      if (name === "edit") {
        openModal(
          `Serie bearbeiten · ${series.id}`,
          `
            <form class="series-form" data-series-edit-form>
              <input type="hidden" name="seriesId" value="${series.id}">
              <label><span>Status</span><select class="series-select" name="status"><option${series.status === "aktiv" ? " selected" : ""}>aktiv</option><option${series.status === "pausiert" ? " selected" : ""}>pausiert</option></select></label>
              <label><span>Fahrerwunsch</span><input class="driver-search-input" name="driverWish" value="${series.driverWish || ""}"></label>
              <label class="full"><span>Notizen</span><textarea class="driver-search-input" name="notes">${series.notes || ""}</textarea></label>
              <div class="series-form-actions full"><button class="admin-btn" type="submit">Serie speichern</button></div>
            </form>
          `
        );
        return;
      }

      if (name === "single") {
        const first = collectOccurrences(series, 20)[0];
        if (!first) {
          openModal("Keine Einzeltermine", "<p>Für diese Serie wurden derzeit keine konkreten Termine gefunden.</p>");
          return;
        }
        openSingleRideEditor(series, first.date);
        return;
      }

      if (name === "delete") {
        if (!window.confirm(`Serienfahrt ${series.id} wirklich löschen?`)) return;
        state.series = state.series.filter((entry) => entry.id !== seriesId);
        saveSeries();
        renderAll();
      }

      const occurrenceAction = event.target.closest("[data-series-occ-action]");
      if (occurrenceAction) {
        const seriesId = occurrenceAction.getAttribute("data-series-id") || "";
        const dateIso = occurrenceAction.getAttribute("data-series-date") || "";
        const series = state.series.find((entry) => entry.id === seriesId);
        if (!series || !dateIso) return;
        openSingleRideEditor(series, dateIso);
        return;
      }

      const singleForm = event.target.closest("[data-series-single-form]");
      if (singleForm) return;
    });

    document.addEventListener("submit", (event) => {
      const singleForm = event.target.closest("[data-series-single-form]");
      if (singleForm) {
        event.preventDefault();
        const payload = Object.fromEntries(new FormData(singleForm).entries());
        const series = state.series.find((entry) => entry.id === payload.seriesId);
        if (!series || !payload.date) return;
        series.dateOverrides = series.dateOverrides && typeof series.dateOverrides === "object" ? series.dateOverrides : {};
        series.dateOverrides[payload.date] = {
          pickupTime: payload.pickupTime || series.pickupTime,
          returnTime: payload.returnTime || series.returnTime,
          pickup: payload.pickup || series.pickup,
          destination: payload.destination || series.destination,
          note: payload.note || ""
        };
        saveSeries();
        renderAll();
        closeModal();
        return;
      }

      const editForm = event.target.closest("[data-series-edit-form]");
      if (!editForm) return;
      event.preventDefault();
      const payload = Object.fromEntries(new FormData(editForm).entries());
      const series = state.series.find((entry) => entry.id === payload.seriesId);
      if (!series) return;
      series.status = payload.status || series.status;
      series.driverWish = payload.driverWish || "";
      series.notes = payload.notes || "";
      saveSeries();
      renderAll();
      closeModal();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      const modal = document.querySelector("[data-series-modal]");
      if (!modal || modal.hidden) return;
      closeModal();
    });
  }

  function init() {
    fillFormSelects();
    renderAll();
    bindEvents();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
