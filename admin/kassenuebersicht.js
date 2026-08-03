(() => {
  const KEY = "adminV15DriverOps";
  const state = { range: "heute", driver: "", vehicle: "", diff: "alle" };

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

  function inThisWeek(dateIso) {
    const now = new Date();
    const date = new Date(dateIso);
    const diff = Math.floor((now.getTime() - date.getTime()) / 86400000);
    return diff >= 0 && diff < 7;
  }

  function render() {
    const data = load();
    const rows = data && Array.isArray(data.cashClosings) ? data.cashClosings : [];
    const drivers = data && Array.isArray(data.drivers) ? data.drivers : [];
    const handovers = data && Array.isArray(data.handovers) ? data.handovers : [];

    const filtered = rows.filter((row) => {
      const day = String(row.at || "").slice(0, 10);
      if (state.range === "heute" && day !== todayISO()) return false;
      if (state.range === "diese Woche" && !inThisWeek(day)) return false;

      const driver = drivers.find((d) => d.id === row.driverId);
      const driverName = driver ? driver.name : "";
      if (state.driver && !`${driverName} ${row.driverId}`.toLowerCase().includes(state.driver.toLowerCase())) return false;

      const handover = handovers.find((h) => h.fromDriverId === row.driverId);
      const vehicleName = handover ? handover.vehicleId : "";
      if (state.vehicle && !String(vehicleName || "").toLowerCase().includes(state.vehicle.toLowerCase())) return false;

      if (state.diff === "Differenz vorhanden" && Number(row.diff || 0) === 0) return false;
      if (state.diff === "noch nicht abgeschlossen" && row.status !== "Klärung erforderlich") return false;
      return true;
    });

    const body = document.querySelector("[data-cash-table]");
    if (!body) return;

    if (!filtered.length) {
      body.innerHTML = '<tr><td colspan="9">Keine Kassen-Datensätze gefunden.</td></tr>';
      return;
    }

    body.innerHTML = filtered.map((row) => {
      const driver = drivers.find((d) => d.id === row.driverId);
      return `
        <tr>
          <td>${driver ? driver.name : row.driverId}</td>
          <td>${new Date(row.at).toLocaleDateString("de-DE")}</td>
          <td>${Number(row.start || 0).toFixed(2)} EUR</td>
          <td>${Number(row.cashIn || 0).toFixed(2)} EUR</td>
          <td>${Number(row.expenses || 0).toFixed(2)} EUR</td>
          <td>${Number(row.expected || 0).toFixed(2)} EUR</td>
          <td>${Number(row.counted || 0).toFixed(2)} EUR</td>
          <td>${Number(row.diff || 0).toFixed(2)} EUR</td>
          <td>${row.status || "offen"}</td>
        </tr>
      `;
    }).join("");
  }

  function bindFilters() {
    document.querySelectorAll("[data-cash-filter]").forEach((el) => {
      el.addEventListener("input", () => {
        const key = el.getAttribute("data-cash-filter");
        if (!key) return;
        state[key] = el.value || "";
        render();
      });
      el.addEventListener("change", () => {
        const key = el.getAttribute("data-cash-filter");
        if (!key) return;
        state[key] = el.value || "";
        render();
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    bindFilters();
    render();
  });
})();
