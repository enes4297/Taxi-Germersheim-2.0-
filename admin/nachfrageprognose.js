(() => {
  const M = window.AdminManagementDemo;
  const state = { data: M.loadState() };

  function badge(v) {
    const n = M.normalize(v);
    const c = n.includes("gering") ? "kritisch" : n.includes("mittel") ? "wichtig" : "success";
    return `<span class="m-pill ${c}">${v}</span>`;
  }

  function collect() {
    const period = (document.querySelector("[data-nf-period]") || {}).value || "today";
    const weather = (document.querySelector("[data-nf-weather]") || {}).value || "trocken";
    const confidence = (document.querySelector("[data-nf-confidence]") || {}).value || "mittlere Sicherheit";
    const event = (document.querySelector("[data-nf-event]") || {}).value || "normal";
    const ferie = (document.querySelector("[data-nf-holiday]") || {}).value || "nein";
    const pub = (document.querySelector("[data-nf-public]") || {}).value || "nein";

    state.data.filters.period = period;
    state.data.filters.weather = weather;
    state.data.filters.confidence = confidence;

    if (event === "hoch") {
      state.data.events = [...state.data.events.filter((e) => e.id !== "ME-AUTO"), {
        id: "ME-AUTO",
        title: "Eventeinfluss hoch",
        category: "Demo",
        date: M.todayIso(),
        timeFrom: "16:00",
        timeTo: "22:00",
        place: "Innenstadt",
        impact: "hohe Auswirkung",
        extraRides: ferie === "ja" || pub === "ja" ? 16 : 10,
        areas: "Innenstadt",
        neededVehicles: 3,
        neededDrivers: 4,
        note: "Automatisch gesetzt",
        owner: "Disposition"
      }];
    }

    M.saveState(state.data);
  }

  function render() {
    collect();
    const source = M.sourceSnapshot();
    const period = state.data.filters.period || "today";
    const summary = M.timelineForPeriod(period, state.data, source);
    const summaryNode = document.querySelector("[data-nf-summary]");
    if (summaryNode) {
      summaryNode.innerHTML = [
        ["erwartete Fahrten", summary.expected],
        ["bestaetigte Fahrten", summary.confirmed],
        ["spontane Fahrten", summary.spontaneous],
        ["verfuegbare Fahrer", summary.drivers],
        ["verfuegbare Fahrzeuge", summary.vehicles],
        ["Auslastung", `${summary.utilization}%`],
        ["voraussichtlicher Engpass", summary.bottleneck],
        ["notwendige Reserve", summary.reserveNeed]
      ].map((r) => `<article class="m-card"><small>${r[0]}</small><strong>${r[1]}</strong></article>`).join("");
    }

    const typesNode = document.querySelector("[data-nf-types]");
    if (typesNode) {
      typesNode.innerHTML = M.forecastByType(period, state.data, source).map((t) => `<tr><td>${t.type}</td><td>${t.expected}</td><td>${t.booked}</td><td>${t.openCapacity}</td><td>${t.neededVehicle}</td><td>${t.neededSkill}</td></tr>`).join("");
    }

    const qNode = document.querySelector("[data-nf-quality]");
    if (qNode) {
      const q = M.forecastQuality(state.data, source);
      qNode.innerHTML = `<article class="m-item"><p>${badge(q.confidence)}</p><p>Prognose: ${q.forecast}</p><p>tatsaechliche Demo-Nachfrage: ${q.actual}</p><p>Abweichung: ${q.deviation}</p><p>Letzte Aktualisierung: ${q.updatedAt}</p><p>Datenbasis: ${q.basis}</p></article>`;
    }

    const hNode = document.querySelector("[data-nf-hours]");
    if (hNode) {
      hNode.innerHTML = M.hourlyCurve(state.data, source).map((h, i) => `<article class="m-item"><div class="m-bar"><strong>${h.hour}</strong><div class="m-track"><div class="m-fill" style="width:${Math.max(5, Math.min(100, h.expected * 8))}%"></div></div><button class="admin-btn admin-btn-secondary" type="button" data-nf-hour="${i}">Details</button></div><p>erwartet ${h.expected}, bestaetigt ${h.confirmed}, Kapazitaet ${h.capacity}${h.critical ? ` · ${badge("kritisches Zeitfenster")}` : ""}</p></article>`).join("");
    }
  }

  function bind() {
    document.addEventListener("change", (event) => {
      if (!event.target.closest("[data-nf-period],[data-nf-weather],[data-nf-confidence],[data-nf-event],[data-nf-holiday],[data-nf-public]")) return;
      render();
    });

    document.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-nf-hour]");
      if (!btn) return;
      const idx = Number(btn.getAttribute("data-nf-hour") || 0);
      const h = M.hourlyCurve(state.data, M.sourceSnapshot())[idx];
      if (!h) return;
      window.alert(`${h.hour} (${h.block})\nErwartet: ${h.expected}\nBestaetigt: ${h.confirmed}\nBenoetigte Kapazitaet: ${h.expected}\nAktuelle Kapazitaet: ${h.capacity}\nDifferenz: ${h.diff}\nLoesung: Reserve, Schichttausch, Auftrag buendeln`);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    render();
    bind();
  });
})();
