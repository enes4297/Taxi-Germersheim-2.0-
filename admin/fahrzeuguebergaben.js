(() => {
  const KEY = "adminV15DriverOps";

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function todayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function render() {
    const data = load();
    const handovers = data && Array.isArray(data.handovers) ? data.handovers : [];
    const checks = data && Array.isArray(data.vehicleChecks) ? data.vehicleChecks : [];
    const damages = data && Array.isArray(data.damages) ? data.damages : [];
    const cash = data && Array.isArray(data.cashClosings) ? data.cashClosings : [];

    const stats = {
      today: handovers.filter((h) => String(h.at || "").startsWith(todayISO())).length,
      openChecks: checks.filter((c) => c.overall !== "in Ordnung").length,
      newDamages: damages.filter((d) => String(d.at || "").startsWith(todayISO())).length,
      critical: damages.filter((d) => d.priority === "kritisch").length,
      cashDiff: cash.filter((c) => c.status === "Klärung erforderlich").length,
      notDrivable: checks.filter((c) => c.overall === "nicht fahrbereit").length
    };

    Object.entries(stats).forEach(([k, v]) => {
      const n = document.querySelector(`[data-handover-stat="${k}"]`);
      if (n) n.textContent = String(v);
    });

    const body = document.querySelector("[data-handover-table]");
    if (!body) return;

    if (!handovers.length) {
      body.innerHTML = '<tr><td colspan="9">Keine Übergaben aus dem Fahrer-Portal vorhanden.</td></tr>';
      return;
    }

    body.innerHTML = handovers.slice(0, 60).map((row) => {
      const check = checks.find((c) => c.driverId === row.fromDriverId && c.vehicleId === row.vehicleId) || null;
      const dmgCount = damages.filter((d) => d.vehicleId === row.vehicleId).length;
      const cashRow = cash.find((c) => c.driverId === row.fromDriverId) || null;
      const clean = check ? check.overall : "offen";
      const tone = clean === "in Ordnung" ? "ok" : clean === "nicht fahrbereit" ? "crit" : "warn";
      const status = row.vehicleStatus || "Frei";
      return `
        <tr>
          <td>${row.vehicleId || "-"}</td>
          <td>${row.fromDriver || "-"}</td>
          <td>${row.toDriver || "-"}</td>
          <td>${new Date(row.at).toLocaleString("de-DE")}</td>
          <td>${check ? check.km || "-" : "-"}</td>
          <td>${check ? check.fuel || "-" : "-"}</td>
          <td>${dmgCount}</td>
          <td><span class="handover-state ${tone}">${clean}</span></td>
          <td>${status}${cashRow && cashRow.status !== "stimmt" ? ` · ${cashRow.status}` : ""}</td>
        </tr>
      `;
    }).join("");
  }

  document.addEventListener("DOMContentLoaded", render);
})();
