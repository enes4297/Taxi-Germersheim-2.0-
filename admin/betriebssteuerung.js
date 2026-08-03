(() => {
  const M = window.AdminManagementDemo;
  const state = { data: M.loadState() };

  const decisionTemplates = [
    "zusaetzlichen Fahrer aktivieren",
    "Fahrer frueher starten lassen",
    "Schicht verlaengern anfragen",
    "Pause verschieben",
    "Ersatzfahrzeug einsetzen",
    "Werkstattfahrzeug priorisieren",
    "Serienfahrt neu zuweisen",
    "Grossraumfahrzeug reservieren",
    "Rollstuhlfahrzeug reservieren",
    "Flughafenfahrten buendeln",
    "externe Kapazitaet vormerken als Demo",
    "Rueckrufteam aktivieren",
    "Telefonzentrale verstaerken"
  ];

  function pill(v) {
    const n = M.normalize(v);
    const c = n.includes("krit") || n.includes("engpass") ? "kritisch" : n.includes("beob") || n.includes("wichtig") ? "wichtig" : "normal";
    return `<span class="m-pill ${c}">${v}</span>`;
  }

  function renderDemand(source) {
    const node = document.querySelector("[data-bo-demand]");
    if (!node) return;
    const t = M.timelineForPeriod("today", state.data, source);
    node.innerHTML = `<div class="m-grid"><article class="m-card"><small>erwartete Fahrten</small><strong>${t.expected}</strong></article><article class="m-card"><small>bestaetigte Fahrten</small><strong>${t.confirmed}</strong></article><article class="m-card"><small>spontane Fahrten</small><strong>${t.spontaneous}</strong></article><article class="m-card"><small>offene Kapazitaetsluecke</small><strong>${t.gap}</strong></article></div>`;
  }

  function renderTimeline(source) {
    const node = document.querySelector("[data-bo-timeline]");
    if (!node) return;
    node.innerHTML = M.todayTimeline(state.data, source).map((x) => `<article class="m-item"><strong>${x.block}</strong><p>geplant ${x.planned} / extra ${x.expectedExtra}</p><p>Kapazitaet: Fahrer ${x.driversAvail}, Fahrzeuge ${x.vehiclesAvail}</p><p>${pill(x.status)} · Auslastung ${x.utilization}%</p></article>`).join("");
  }

  function renderAssets(source) {
    const node = document.querySelector("[data-bo-assets]");
    if (!node) return;
    const metrics = M.metricCards(state.data, source);
    const keys = ["freie Fahrzeuge", "Fahrzeuge unterwegs", "Fahrzeuge in Werkstatt", "Fahrer im Dienst", "offene Schichten"];
    node.innerHTML = `<div class="m-list">${metrics.filter((m) => keys.includes(m.label)).map((m) => `<article class="m-item"><strong>${m.label}</strong><p>${m.value}</p><p>${m.compare}</p><p>${pill(m.status)}</p></article>`).join("")}</div>`;
  }

  function ampelRows(source) {
    const core = M.metricCards(state.data, source);
    const byLabel = Object.fromEntries(core.map((x) => [x.label, x]));
    return [
      { area: "Disposition", status: byLabel["durchschnittliche Wartezeit"].status, cause: "Wartezeit und wartende Auftraege", records: "live-dispo", action: "Auftragsbuendelung", owner: "Disponent" },
      { area: "Fahrzeuge", status: byLabel["freie Fahrzeuge"].status, cause: "Verfuegbarkeit und Werkstatt", records: "fahrzeuge", action: "Reserve aktivieren", owner: "Werkstatt" },
      { area: "Fahrer", status: byLabel["Fahrer im Dienst"].status, cause: "Personalstatus", records: "personaluebersicht", action: "Schicht anpassen", owner: "Personal" },
      { area: "Krankenfahrten", status: byLabel["aktive Fahrten"].status, cause: "Gebundene Spezialkapazitaet", records: "live-dispo", action: "Priorisieren", owner: "Disposition" },
      { area: "Serienfahrten", status: byLabel["geplante Fahrten heute"].status, cause: "Zuweisungslage", records: "serienfahrten", action: "Neu zuweisen", owner: "Disposition" },
      { area: "Telefonzentrale", status: byLabel["durchschnittliche Wartezeit"].status, cause: "Rueckrufaufkommen", records: "telefonzentrale", action: "Rueckrufteam", owner: "Disponent" },
      { area: "Werkstatt", status: byLabel["Fahrzeuge in Werkstatt"].status, cause: "Mehrere offene Faelle", records: "werkstatt", action: "Priorisieren", owner: "Werkstatt" },
      { area: "Personal", status: byLabel["offene Schichten"].status, cause: "Abwesenheiten/Urlaub", records: "abwesenheiten", action: "Vertretung", owner: "Personal" },
      { area: "Qualitaet", status: byLabel["kritische Betriebsfaelle"].status, cause: "Beschwerden/Vorfaelle", records: "beschwerden", action: "Sofortcheck", owner: "Qualitaetsmanagement" },
      { area: "Abrechnung", status: byLabel["offene Forderungen"].status, cause: "Offene Forderungen", records: "abrechnungszentrale", action: "Pruefung priorisieren", owner: "Buchhaltung" },
      { area: "Kundendienst", status: byLabel["Kundenzufriedenheit Demo"].status, cause: "Wartezeit und Rueckfragen", records: "kunden", action: "Rueckruf", owner: "Disposition" }
    ];
  }

  function renderAmpel(source) {
    const node = document.querySelector("[data-bo-ampel]");
    if (!node) return;
    node.innerHTML = ampelRows(source).map((a, i) => `<article class="m-card"><small>${a.area}</small><strong>${pill(a.status)}</strong><div class="m-meta">${a.cause}</div><button class="admin-btn admin-btn-secondary" type="button" data-bo-ampel="${i}">Details</button></article>`).join("");
  }

  function renderActions() {
    const node = document.querySelector("[data-bo-actions]");
    if (!node) return;
    node.innerHTML = decisionTemplates.map((a) => `<button class="admin-btn" type="button" data-bo-decide="${a}">${a}</button>`).join("");
  }

  function renderReserve(source) {
    const node = document.querySelector("[data-bo-reserve]");
    if (!node) return;
    node.innerHTML = M.reserveOverview(state.data, source).map((r) => `<article class="m-item"><strong>${r.type}: ${r.name}</strong><p>Verfuegbar: ${r.availableAt}</p><p>Qualifikation: ${r.qualification}</p><p>Fahrzeugfreigabe: ${r.vehicleClearance}</p><p>Einschraenkung: ${r.restrictions || "-"}</p></article>`).join("");
  }

  function renderTasks() {
    const node = document.querySelector("[data-bo-tasks]");
    if (!node) return;
    const tasks = state.data.managementTasks || [];
    node.innerHTML = tasks.length ? tasks.map((t) => `<article class="m-item"><strong>${t.title}</strong><p>Bereich: ${t.area} · Prioritaet: ${t.priority}</p><p>Verantwortlich: ${t.owner} · Frist: ${t.dueDate}</p><p>Status: ${pill(t.status)}</p><p>Bezug: ${t.relation || "-"}</p></article>`).join("") : '<article class="m-item"><p>Keine Aufgaben.</p></article>';
  }

  function render() {
    const source = M.sourceSnapshot();
    renderDemand(source);
    renderTimeline(source);
    renderAssets(source);
    renderAmpel(source);
    renderActions();
    renderReserve(source);
    renderTasks();
  }

  function bind() {
    document.addEventListener("click", (event) => {
      const detail = event.target.closest("[data-bo-ampel]");
      if (detail) {
        const i = Number(detail.getAttribute("data-bo-ampel") || 0);
        const row = ampelRows(M.sourceSnapshot())[i];
        if (!row) return;
        window.alert(`${row.area}\nStatus: ${row.status}\nUrsache: ${row.cause}\nDatensaetze: ${row.records}\nEmpfohlene Handlung: ${row.action}\nZustaendig: ${row.owner}`);
        return;
      }

      const decide = event.target.closest("[data-bo-decide]");
      if (decide) {
        const title = decide.getAttribute("data-bo-decide") || "Operative Entscheidung";
        if (!window.confirm(`Entscheidung als Demo ausfuehren?\n${title}`)) return;
        M.addManagementTask(state.data, {
          title,
          area: "Betrieb",
          priority: "hoch",
          owner: "Disposition",
          dueDate: M.todayIso(),
          status: "offen",
          relation: "Betriebssteuerung",
          impact: "Engpassreduktion"
        });
        state.data = M.loadState();
        renderTasks();
        return;
      }

      if (event.target.closest("[data-bo-refresh]")) {
        M.refreshRecommendations(state.data);
        state.data = M.loadState();
        render();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    render();
    bind();
  });
})();
