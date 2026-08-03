(() => {
  const P = window.AdminPersonnelDemo;
  const state = { data: P.loadState() };

  function empName(id) {
    const e = P.getEmployee(state.data, id);
    return e ? `${e.firstName} ${e.lastName}` : id;
  }

  function badge(text) {
    const t = P.normalize(text);
    const cls = t.includes("nicht") || t.includes("fehlt") ? "crit" : t.includes("eingeladen") || t.includes("bestaetigt") || t.includes("geplant") ? "warn" : t.includes("abgeschlossen") || t.includes("bestanden") || t.includes("teilgenommen") ? "ok" : "info";
    return `<span class="person-status ${cls}"><span class="dot"></span>${text}</span>`;
  }

  function fillForm() {
    const e = document.querySelector("[data-tr-employee]");
    const t = document.querySelector("[data-tr-title]");
    if (e) e.innerHTML = state.data.employees.map((x) => `<option value="${x.id}">${x.firstName} ${x.lastName}</option>`).join("");
    if (t) t.innerHTML = P.TRAINING_TYPES.map((x) => `<option>${x}</option>`).join("");
  }

  function renderKpis() {
    const trs = state.data.trainings;
    const weekStart = new Date(`${P.todayIso()}T00:00:00`).getTime();
    const weekEnd = weekStart + 7 * 86400000;
    const inWeek = trs.filter((x) => {
      const d = new Date(`${x.date}T00:00:00`).getTime();
      return d >= weekStart && d < weekEnd;
    }).length;
    const kpis = [
      ["Schulungen gesamt", trs.length],
      ["heute geplant", trs.filter((x) => x.date === P.todayIso()).length],
      ["diese Woche", inWeek],
      ["offen", trs.filter((x) => ["eingeladen", "bestaetigt", "geplant"].includes(x.status)).length],
      ["ueberfaellig", trs.filter((x) => x.status === "Nachweis fehlt" || x.status === "nicht teilgenommen").length],
      ["abgeschlossen", trs.filter((x) => x.status === "abgeschlossen").length],
      ["Teilnehmer fehlen", trs.filter((x) => (x.participants || []).length === 0).length],
      ["Nachweis fehlt", trs.filter((x) => x.evidence === "fehlt" || x.status === "Nachweis fehlt").length]
    ];
    const node = document.querySelector("[data-tr-kpis]");
    if (!node) return;
    node.innerHTML = kpis.map((k) => `<article class="person-card"><small>${k[0]}</small><strong>${k[1]}</strong></article>`).join("");
  }

  function renderTable() {
    const body = document.querySelector("[data-tr-table]");
    if (!body) return;
    if (!state.data.trainings.length) {
      body.innerHTML = '<tr><td colspan="11">Keine Schulungen</td></tr>';
      return;
    }
    body.innerHTML = state.data.trainings.map((tr) => `<tr><td>${tr.title}</td><td>${tr.category}</td><td>${tr.date}</td><td>${tr.time}</td><td>${tr.place}</td><td>${tr.trainer}</td><td>${(tr.participants || []).map(empName).join(", ") || "-"}</td><td>${badge(tr.status)}</td><td>${tr.mandatory ? "Ja" : "Nein"}</td><td>${tr.repeat || "-"}</td><td><button class="admin-btn admin-btn-secondary" type="button" data-tr-proof="${tr.id}">Nachweis</button></td></tr>`).join("");
  }

  function matrixStatus(emp, key) {
    if (key === "Rollstuhlfahrt") return emp.wheelchairSkill ? "gueltig" : "fehlt";
    if (key === "Grossraumfahrzeug") return emp.largeVehicleSkill ? "gueltig" : "fehlt";
    if (key === "Elektrofahrzeug") return emp.evTraining ? "gueltig" : "fehlt";
    if (key === "Krankenfahrt") return emp.qualifications.includes("Krankenfahrt") ? "gueltig" : "geplant";
    if (key === "Erste Hilfe") return P.listEmployeeTrainings(state.data, emp.id).some((t) => P.normalize(t.title).includes("erste hilfe") && ["abgeschlossen", "bestanden"].includes(t.status)) ? "gueltig" : "fehlt";
    if (key === "Datenschutz") return P.listEmployeeTrainings(state.data, emp.id).some((t) => P.normalize(t.title).includes("datenschutz") && ["abgeschlossen", "bestanden"].includes(t.status)) ? "gueltig" : "laeuft bald ab";
    if (key === "Fahrzeuguebergabe") return emp.onboardingDocsDone ? "gueltig" : "geplant";
    if (key === "Fahrer-App") return emp.qualifications.includes("Fahrer-App") ? "gueltig" : "geplant";
    return emp.qualifications.includes("Unfallverhalten") ? "gueltig" : "fehlt";
  }

  function renderMatrix() {
    const body = document.querySelector("[data-tr-matrix]");
    if (!body) return;
    const cols = ["Rollstuhlfahrt", "Grossraumfahrzeug", "Elektrofahrzeug", "Krankenfahrt", "Erste Hilfe", "Datenschutz", "Fahrzeuguebergabe", "Fahrer-App", "Unfallverhalten"];
    body.innerHTML = state.data.employees.map((emp) => `<tr><td>${emp.firstName} ${emp.lastName}</td>${cols.map((c) => `<td>${badge(matrixStatus(emp, c))}</td>`).join("")}</tr>`).join("");
  }

  function openModal(html) {
    const m = document.querySelector("[data-tr-modal]");
    const b = document.querySelector("[data-tr-body]");
    if (!m || !b) return;
    b.innerHTML = html;
    m.hidden = false;
  }

  function closeModal() {
    const m = document.querySelector("[data-tr-modal]");
    if (m) m.hidden = true;
  }

  function bind() {
    const form = document.querySelector("[data-tr-form]");
    if (form) {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const fd = new FormData(form);
        state.data.trainings.unshift({
          id: `TR-${Date.now()}`,
          title: String(fd.get("title") || "Schulung"),
          category: String(fd.get("title") || "Schulung"),
          date: String(fd.get("date") || P.todayIso()),
          time: "09:00",
          place: "Schulungsraum",
          trainer: String(fd.get("owner") || "Admin Enes"),
          participants: [String(fd.get("employeeId") || "")],
          status: String(fd.get("status") || "geplant"),
          mandatory: String(fd.get("mandatory") || "true") === "true",
          repeat: String(fd.get("repeat") || ""),
          evidence: "offen",
          note: String(fd.get("note") || ""),
          dueDate: String(fd.get("dueDate") || "")
        });
        P.saveState(state.data);
        state.data = P.loadState();
        renderKpis();
        renderTable();
        renderMatrix();
        form.reset();
      });
    }

    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-tr-close]")) {
        closeModal();
        return;
      }
      const btn = event.target.closest("[data-tr-proof]");
      if (!btn) return;
      const id = btn.getAttribute("data-tr-proof") || "";
      const tr = state.data.trainings.find((x) => x.id === id);
      if (!tr) return;
      const p = (tr.participants || [])[0] || "";
      openModal(`<div class="person-print"><h2>Teilnahmenachweis</h2><p>Mitarbeiter: ${empName(p)}</p><p>Schulung: ${tr.title}</p><p>Datum: ${tr.date}</p><p>Trainer: ${tr.trainer}</p><p>Ergebnis: ${tr.status}</p><p>Bemerkung: ${tr.note || "-"}</p><p>Unterschrift Mitarbeiter: ____________________</p><p>Unterschrift Trainer: ____________________</p><p>naechster Termin: ${tr.repeat || "nach Bedarf"}</p></div>`);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    fillForm();
    renderKpis();
    renderTable();
    renderMatrix();
    bind();
  });
})();
