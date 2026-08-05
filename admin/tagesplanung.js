(() => {
  const STORAGE_KEY = "adminTerminCockpitV22Phase1";

  function safeParse(raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function formatDate(iso) {
    const d = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(d.getTime())) return iso;
    return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
  }

  function comparePlan(a, b) {
    return `${a.date || ""} ${a.time || ""}`.localeCompare(`${b.date || ""} ${b.time || ""}`, "de");
  }

  function loadData() {
    const parsed = safeParse(localStorage.getItem(STORAGE_KEY)) || {};
    return {
      appointments: Array.isArray(parsed.appointments) ? parsed.appointments : [],
      dayPlan: Array.isArray(parsed.dayPlan) ? parsed.dayPlan : []
    };
  }

  function renderKpis(data) {
    const node = document.querySelector("[data-plan-kpis]");
    if (!node) return;

    const planned = data.dayPlan.length;
    const open = data.appointments.filter((a) => ["Noch ungeplant", "Neu"].includes(a.status)).length;
    const confirmed = data.appointments.filter((a) => a.status === "Bestaetigt").length;
    const completed = data.appointments.filter((a) => ["Erledigt", "Abgerechnet"].includes(a.status)).length;

    node.innerHTML = [
      `<article class="m-kpi"><small>Geplante Termine</small><strong>${planned}</strong><p>aus KI-Demo oder manuell uebernommen</p></article>`,
      `<article class="m-kpi"><small>Noch ungeplant</small><strong>${open}</strong><p>fuer naechste KI-Planung</p></article>`,
      `<article class="m-kpi"><small>Bestaetigt</small><strong>${confirmed}</strong><p>telefonisch informiert</p></article>`,
      `<article class="m-kpi"><small>Abgeschlossen</small><strong>${completed}</strong><p>erledigt oder abgerechnet</p></article>`
    ].join("");
  }

  function renderPlanList(data) {
    const node = document.querySelector("[data-plan-list]");
    if (!node) return;

    if (!data.dayPlan.length) {
      node.innerHTML = '<p class="m-note">Noch keine Tagesplanung vorhanden. Uebernimm zuerst Vorschlaege im Termin-Cockpit.</p>';
      return;
    }

    const grouped = new Map();
    [...data.dayPlan].sort(comparePlan).forEach((entry) => {
      const key = `${entry.vehicleLabel}||${entry.driverName}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(entry);
    });

    node.innerHTML = [...grouped.entries()].map(([key, entries]) => {
      const [vehicle, driver] = key.split("||");
      const rows = entries.map((entry) => {
        const routeRows = Array.isArray(entry.route)
          ? entry.route.map((r) => `<div>${r.time} ${r.label}</div>`).join("")
          : "";
        return [
          "<li>",
          `<strong>${entry.time} ${entry.customer}</strong>`,
          `<p>${entry.pickup} -> ${entry.destination}</p>`,
          `<p>${formatDate(entry.date)} · Auslastung ${entry.utilization || "-"}% · Leerfahrt ${entry.emptyKm || "-"} km</p>`,
          routeRows ? `<p>${routeRows}</p>` : "",
          "</li>"
        ].join("");
      }).join("");

      return [
        '<article class="tc-vehicle-plan">',
        `<h3>${vehicle}</h3>`,
        `<p>${driver}</p>`,
        `<ul>${rows}</ul>`,
        "</article>"
      ].join("");
    }).join("");
  }

  document.addEventListener("DOMContentLoaded", () => {
    const data = loadData();
    renderKpis(data);
    renderPlanList(data);
  });
})();
