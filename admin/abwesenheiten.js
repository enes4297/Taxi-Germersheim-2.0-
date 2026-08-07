(() => {
  const P = window.AdminPersonnelDemo;
  const S = window.AdminSystemCenter || {};
  const state = { data: P.loadState(), filter: "alle", selectedId: null };

  const PRIMARY_STATS = ["heute abwesend", "krank", "urlaub", "vertretung erforderlich"];
  const SECONDARY_STATS = ["schulung", "sonstige abwesenheit", "offene nachweise", "rückkehr heute"];
  const FILTERS = [
    { key: "alle", label: "Alle" },
    { key: "heute", label: "Heute" },
    { key: "krank", label: "Krank" },
    { key: "urlaub", label: "Urlaub" },
    { key: "schulung", label: "Schulung" },
    { key: "vertretung", label: "Vertretung nötig" },
    { key: "offen", label: "Offen" }
  ];

  function daysBetween(start, end) {
    const a = new Date(`${start}T00:00:00`).getTime();
    const b = new Date(`${end}T00:00:00`).getTime();
    if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
    return Math.max(1, Math.floor((b - a) / 86400000) + 1);
  }

  function empName(id) {
    const e = P.getEmployee(state.data, id);
    return e ? `${e.firstName} ${e.lastName}` : id || "-";
  }

  function currentDayIso() {
    return P.todayIso();
  }

  function toDateIso(value) {
    const text = String(value || "").trim();
    if (!text) return "";
    const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) return text;
    const deMatch = text.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (deMatch) return `${deMatch[3]}-${deMatch[2]}-${deMatch[1]}`;
    const date = new Date(text);
    if (Number.isNaN(date.getTime())) return "";
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function toDisplayDate(value) {
    if (!value) return "-";
    return S.formatDate ? S.formatDate(value) : value;
  }

  function toDisplayRange(start, end) {
    if (S.formatDateRange) return S.formatDateRange(start, end);
    if (start && end) return `${toDisplayDate(start)} bis ${toDisplayDate(end)}`;
    return toDisplayDate(start || end);
  }

  function normalize(value) {
    return String(value || "").toLocaleLowerCase("de-DE").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function absences() {
    const today = currentDayIso();
    return state.data.absences.slice().sort((a, b) => `${b.start || ""} ${b.receivedAt || ""}`.localeCompare(`${a.start || ""} ${a.receivedAt || ""}`, "de"));
  }

  function vacationsToday() {
    const today = currentDayIso();
    return state.data.vacations.filter((v) => ["genehmigt", "teilweise genehmigt"].includes(v.status) && today >= v.start && today <= v.end).length;
  }

  function computeCounts() {
    const today = currentDayIso();
    const list = absences();
    const active = list.filter((a) => today >= a.start && today <= (a.expectedEnd || a.start) && a.status !== "abgeschlossen");
    return {
      active,
      counts: {
        heute: active.length,
        krank: active.filter((a) => a.kind === "Krank").length,
        urlaub: vacationsToday(),
        vertretung: active.filter((a) => !a.replacementId).length,
        schulung: active.filter((a) => a.kind === "Schulung" || a.kind === "Fortbildung").length,
        sonstige: active.filter((a) => !["Krank", "Schulung", "Fortbildung"].includes(a.kind)).length,
        nachweise: active.filter((a) => ["angefordert", "fehlt", "unvollstaendig", "angekuendigt"].includes(normalize(a.proofStatus))).length,
        rueckkehrHeute: list.filter((a) => a.returnedAt === today).length
      }
    };
  }

  function matchesFilter(row, filter, activeRows) {
    const today = currentDayIso();
    const proof = normalize(row.proofStatus);
    const kind = normalize(row.kind);
    const open = normalize(row.status) !== "abgeschlossen";
    if (filter === "alle") return true;
    if (filter === "heute") return today >= row.start && today <= (row.expectedEnd || row.start) && open;
    if (filter === "krank") return kind === "krank";
    if (filter === "urlaub") return false;
    if (filter === "schulung") return kind === "schulung" || kind === "fortbildung";
    if (filter === "vertretung") return open && !row.replacementId;
    if (filter === "offen") return open && (["angefordert", "fehlt", "unvollstaendig", "angekuendigt"].includes(proof) || ["beantragt", "in pruefung"].includes(normalize(row.status)));
    return activeRows.includes(row);
  }

  function statusBadge(text) {
    const t = normalize(text);
    const cls = t.includes("krank") || t.includes("fehlt") || t.includes("unvollstaendig") ? "crit" : t.includes("pruef") || t.includes("angekuendigt") || t.includes("angefordert") ? "warn" : t.includes("bestaetigt") || t.includes("abgeschlossen") ? "ok" : "info";
    return `<span class="person-status ${cls}"><span class="dot"></span>${text || "-"}</span>`;
  }

  function filterActiveRows(activeRows) {
    if (state.filter === "urlaub") return state.data.vacations.filter((v) => ["genehmigt", "teilweise genehmigt"].includes(v.status) && currentDayIso() >= v.start && currentDayIso() <= v.end).map((v) => ({ vacation: v }));
    return activeRows.filter((row) => matchesFilter(row, state.filter, activeRows));
  }

  function renderFilters() {
    const node = document.querySelector("[data-abs-filters]");
    if (!node) return;
    node.innerHTML = FILTERS.map((item) => `<button class="person-chip ${state.filter === item.key ? "is-active" : ""}" type="button" data-abs-filter="${item.key}">${item.label}</button>`).join("");
  }

  function renderKpis() {
    const { counts } = computeCounts();
    const primaryNode = document.querySelector("[data-abs-kpis-primary]");
    const secondaryNode = document.querySelector("[data-abs-kpis-secondary]");
    if (primaryNode) {
      primaryNode.innerHTML = PRIMARY_STATS.map((label) => {
        const key = label === "heute abwesend" ? "heute" : label === "krank" ? "krank" : label === "urlaub" ? "urlaub" : "vertretung";
        return `<article class="person-card"><small>${label}</small><strong>${counts[key] ?? 0}</strong></article>`;
      }).join("");
    }
    if (secondaryNode) {
      secondaryNode.innerHTML = SECONDARY_STATS.map((label) => {
        const key = label === "schulung" ? "schulung" : label === "sonstige abwesenheit" ? "sonstige" : label === "offene nachweise" ? "nachweise" : "rueckkehrHeute";
        return `<span class="person-chip">${label}: ${counts[key] ?? 0}</span>`;
      }).join("");
    }
  }

  function renderTable() {
    const body = document.querySelector("[data-abs-table]");
    if (!body) return;
    const { active } = computeCounts();
    const rows = filterActiveRows(active);
    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="7">Keine Einträge vorhanden.</td></tr>';
      return;
    }

    body.innerHTML = rows.map((row) => {
      if (row.vacation) {
        const v = row.vacation;
        return `<tr><td>${empName(v.employeeId)}</td><td>Urlaub</td><td>${toDisplayRange(v.start, v.end)}</td><td>${statusBadge(v.status)}</td><td>${v.replacementId ? empName(v.replacementId) : "-"}</td><td>${v.comment || "-"}</td><td><button class="admin-btn admin-btn-secondary" type="button" data-abs-detail="${v.id}">Details</button></td></tr>`;
      }
      const period = toDisplayRange(row.start, row.expectedEnd || row.start);
      const open = normalize(row.status) !== "abgeschlossen";
      return `<tr><td>${empName(row.employeeId)}</td><td>${row.kind || "-"}</td><td>${period}</td><td>${statusBadge(row.status)}</td><td>${row.replacementId ? empName(row.replacementId) : "-"}</td><td>${(row.affectedShifts || []).join(", ") || "-"}</td><td><button class="admin-btn admin-btn-secondary" type="button" data-abs-detail="${row.id}">Details</button>${open ? `<button class="admin-btn admin-btn-primary" type="button" data-abs-decide="approve" data-abs-id="${row.id}">Genehmigen</button><button class="admin-btn admin-btn-secondary" type="button" data-abs-decide="reject" data-abs-id="${row.id}">Ablehnen</button>` : ""}${open ? `<button class="admin-btn admin-btn-secondary" type="button" data-abs-return="${row.id}">Rückkehr erfassen</button>` : ""}</td></tr>`;
    }).join("");
  }

  function fillEmployees() {
    const emp = document.querySelector("[data-abs-employee]");
    const rep = document.querySelector("[data-abs-replacement]");
    const options = state.data.employees.map((e) => `<option value="${e.id}">${e.firstName} ${e.lastName}</option>`).join("");
    if (emp) emp.innerHTML = options;
    if (rep) rep.innerHTML = `<option value="">-</option>${options}`;
  }

  function getAbsenceById(id) {
    return state.data.absences.find((a) => a.id === id) || state.data.vacations.find((v) => v.id === id) || null;
  }

  function renderDetails(row) {
    const dialog = document.querySelector("[data-abs-details-dialog]");
    const content = document.querySelector("[data-abs-detail-content]");
    const subtitle = document.querySelector("[data-abs-details-subtitle]");
    const returnButton = document.querySelector("[data-abs-detail-return]");
    if (!dialog || !content || !subtitle) return;

    if (!row) {
      content.innerHTML = '<div class="person-detail-card full"><small>Keine Details</small><strong>Eintrag nicht gefunden.</strong></div>';
      subtitle.textContent = "";
      if (returnButton) returnButton.hidden = true;
      return;
    }

    const isVacation = Boolean(row.type && row.start && row.end);
    const title = isVacation ? "Urlaubsantrag" : "Abwesenheit";
    subtitle.textContent = `${title} für ${empName(row.employeeId)}`;
    content.innerHTML = [
      { label: "Zeitraum", value: isVacation ? toDisplayRange(row.start, row.end) : toDisplayRange(row.start, row.expectedEnd || row.start) },
      { label: "Status", value: row.status || "-" },
      { label: "Meldung über", value: row.via || "-" },
      { label: "Nachweisstatus", value: row.proofStatus || "-" },
      { label: "Vertretung", value: row.replacementId ? empName(row.replacementId) : "-" },
      { label: "Betroffene Schichten", value: (row.affectedShifts || []).join(", ") || row.comment || "-" },
      { label: "Anzahl Tage", value: daysBetween(row.start, row.expectedEnd || row.start) },
      { label: "Notiz", value: row.note || row.internalNote || "-", full: true }
    ].map((item) => `<div class="person-detail-card${item.full ? " full" : ""}"><small>${item.label}</small><strong>${item.value}</strong></div>`).join("");
    if (returnButton) returnButton.hidden = isVacation || normalize(row.status) === "abgeschlossen";
    state.selectedId = row.id;
    if (typeof dialog.showModal === "function" && !dialog.open) dialog.showModal();
  }

  function openEntryDialog(prefill = {}) {
    const dialog = document.querySelector("[data-abs-dialog]");
    const form = document.querySelector("[data-abs-form]");
    if (!dialog || !form) return;
    form.reset();
    form.employeeId.value = prefill.employeeId || state.data.employees[0]?.id || "";
    form.kind.value = prefill.kind || "Krank";
    form.via.value = prefill.via || "telefonisch";
    form.proofStatus.value = prefill.proofStatus || "angekündigt";
    form.start.value = prefill.start || "";
    form.expectedEnd.value = prefill.expectedEnd || "";
    form.receivedAt.value = prefill.receivedAt || currentDayIso();
    form.replacementId.value = prefill.replacementId || "";
    form.note.value = prefill.note || "";
    form.affectedShifts.value = prefill.affectedShifts || "";
    if (typeof dialog.showModal === "function") dialog.showModal();
  }

  function closeDialog(selector) {
    const dialog = document.querySelector(selector);
    if (dialog && dialog.open) dialog.close();
  }

  function validateGermanDate(value, required) {
    if (!value && !required) return { ok: true, value: "" };
    const iso = toDateIso(value);
    if (!iso) return { ok: false, message: "Bitte geben Sie ein gültiges Datum im Format TT.MM.JJJJ ein." };
    return { ok: true, value: iso };
  }

  function bind() {
    document.addEventListener("click", (event) => {
      const filterButton = event.target.closest("[data-abs-filter]");
      if (filterButton) {
        state.filter = filterButton.getAttribute("data-abs-filter") || "alle";
        renderFilters();
        renderKpis();
        renderTable();
        return;
      }

      const openButton = event.target.closest("[data-abs-open]");
      if (openButton) {
        openEntryDialog();
        return;
      }

      const closeButton = event.target.closest("[data-abs-close]");
      if (closeButton) {
        closeDialog("[data-abs-dialog]");
        return;
      }

      const detailButton = event.target.closest("[data-abs-detail]");
      if (detailButton) {
        const row = getAbsenceById(detailButton.getAttribute("data-abs-detail") || "");
        renderDetails(row);
        return;
      }

      const detailClose = event.target.closest("[data-abs-details-close]");
      if (detailClose) {
        closeDialog("[data-abs-details-dialog]");
        return;
      }

      const returnButton = event.target.closest("[data-abs-return]");
      if (returnButton) {
        const id = returnButton.getAttribute("data-abs-return") || "";
        P.markReturn(state.data, id, currentDayIso(), true);
        state.data = P.loadState();
        renderKpis();
        renderFilters();
        renderTable();
        return;
      }

      const decision = event.target.closest("[data-abs-decide]");
      if (decision) {
        const id = decision.getAttribute("data-abs-id") || "";
        const action = decision.getAttribute("data-abs-decide") || "";
        const row = state.data.absences.find((entry) => entry.id === id);
        if (!row) return;
        row.status = action === "approve" ? "Genehmigt" : "Abgelehnt";
        if (action === "reject") {
          row.returnedAt = currentDayIso();
          row.expectedEnd = currentDayIso();
        }
        if (typeof P.saveState === "function") P.saveState(state.data);
        state.data = P.loadState();
        renderKpis();
        renderFilters();
        renderTable();
        return;
      }

      const detailReturn = event.target.closest("[data-abs-detail-return]");
      if (detailReturn && state.selectedId) {
        P.markReturn(state.data, state.selectedId, currentDayIso(), true);
        state.data = P.loadState();
        renderKpis();
        renderFilters();
        renderTable();
        closeDialog("[data-abs-details-dialog]");
      }
    });

    const form = document.querySelector("[data-abs-form]");
    if (form) {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const fd = new FormData(form);
        const start = validateGermanDate(fd.get("start"), true);
        const end = validateGermanDate(fd.get("expectedEnd"), false);
        const received = validateGermanDate(fd.get("receivedAt"), true);
        if (!start.ok) return window.alert(start.message);
        if (!end.ok) return window.alert(end.message);
        if (!received.ok) return window.alert(received.message);
        if (end.value && start.value && end.value < start.value) {
          return window.alert("Das Enddatum darf nicht vor dem Startdatum liegen.");
        }

        P.addAbsence(state.data, {
          employeeId: String(fd.get("employeeId") || ""),
          kind: String(fd.get("kind") || "Krank"),
          start: start.value,
          expectedEnd: end.value || start.value,
          returnedAt: "",
          receivedAt: received.value,
          via: String(fd.get("via") || "telefonisch"),
          proofStatus: String(fd.get("proofStatus") || "angekündigt"),
          replacementId: String(fd.get("replacementId") || ""),
          note: String(fd.get("note") || ""),
          status: "Beantragt",
          affectedShifts: String(fd.get("affectedShifts") || "").split(";").map((x) => x.trim()).filter(Boolean)
        });
        state.data = P.loadState();
        renderKpis();
        renderFilters();
        renderTable();
        closeDialog("[data-abs-dialog]");
      });
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    fillEmployees();
    renderFilters();
    renderKpis();
    renderTable();
    bind();
  });
})();
