(() => {
  const P = window.AdminPersonnelDemo;
  const state = { data: P.loadState() };

  function empName(id) {
    const e = P.getEmployee(state.data, id);
    return e ? `${e.firstName} ${e.lastName}` : id;
  }

  function badge(text) {
    const t = P.normalize(text);
    const cls = t.includes("krit") || t.includes("ueberfaellig") ? "crit" : t.includes("bearbeitung") || t.includes("wartet") || t.includes("wichtig") ? "warn" : t.includes("erledigt") ? "ok" : "info";
    return `<span class="person-status ${cls}"><span class="dot"></span>${text}</span>`;
  }

  function renderTasks() {
    const body = document.querySelector("[data-pt-table]");
    if (!body) return;
    if (!state.data.tasks.length) {
      body.innerHTML = '<tr><td colspan="10">Keine Aufgaben vorhanden</td></tr>';
      return;
    }
    body.innerHTML = state.data.tasks.map((t) => `<tr><td>${t.title}</td><td>${empName(t.employeeId)}</td><td>${t.category}</td><td>${t.owner}</td><td>${t.dueDate}</td><td>${badge(t.priority)}</td><td>${badge(t.status)}</td><td>${t.note || "-"}</td><td>${t.relationType} ${t.relationId || ""}</td><td><button class="admin-btn admin-btn-secondary" type="button" data-pt-status="${t.id}">Status wechseln</button></td></tr>`).join("");
  }

  function renderReminders() {
    const node = document.querySelector("[data-pt-reminders]");
    if (!node) return;
    const rows = [
      { label: "Dokumentablauf", count: state.data.documents.filter((d) => ["laeuft bald ab", "abgelaufen", "fehlt"].includes(d.status)).length },
      { label: "Probezeitende", count: state.data.employees.filter((e) => e.probation && P.daysUntil(e.probationUntil) <= 30).length },
      { label: "Vertragsende", count: state.data.employees.filter((e) => e.contractEnd && P.daysUntil(e.contractEnd) <= 45).length },
      { label: "Schulungswiederholung", count: state.data.trainings.filter((t) => t.repeat).length },
      { label: "Fuehrerscheinkontrolle", count: state.data.licenseChecks.filter((c) => P.daysUntil(c.nextCheck) <= 14).length },
      { label: "Rueckkehr nach Krankheit", count: state.data.absences.filter((a) => a.kind === "Krank" && a.status !== "abgeschlossen").length },
      { label: "Urlaubsentscheidung", count: state.data.vacations.filter((v) => ["beantragt", "in Pruefung"].includes(v.status)).length },
      { label: "Datenpruefung", count: state.data.employees.filter((e) => !e.onboardingDocsDone || !e.credentialsIssued).length }
    ];
    node.innerHTML = rows.map((r) => `<article class="person-item"><strong>${r.label}</strong><p>${r.count} offen</p></article>`).join("");
  }

  function suggestCandidates(cov) {
    const candidates = state.data.employees.filter((e) => {
      if (e.role !== cov.requiredRole) return false;
      if (P.isEmployeeAbsentToday(state.data, e.id)) return false;
      if (["gesperrt", "Dokument ungueltig", "krank", "Urlaub"].includes(e.status)) return false;
      if (cov.requiredQualification === "Rollstuhlfahrt" && !e.wheelchairSkill) return false;
      return true;
    });

    return candidates.map((c) => {
      const docs = P.listEmployeeDocs(state.data, c.id);
      const docsValid = !docs.some((d) => ["abgelaufen", "fehlt"].includes(d.status) && ["Fuehrerschein", "Personenbefoerderungsschein"].includes(d.type));
      const qual = cov.requiredQualification === "Rollstuhlfahrt" ? c.wheelchairSkill : true;
      const score = [docsValid, qual, !P.normalize(c.preferredHours).includes("nacht")].filter(Boolean).length;
      const conflict = [];
      if (!docsValid) conflict.push("Dokument gueltigkeit kritisch");
      if (!qual) conflict.push("Qualifikation fehlt");
      return {
        id: c.id,
        name: `${c.firstName} ${c.lastName}`,
        score,
        conflict,
        reason: `Verfuegbarkeit: ${c.status}, Schichtpraeferenz: ${c.preferredHours || "-"}`
      };
    }).sort((a, b) => b.score - a.score);
  }

  function renderCoverage() {
    const body = document.querySelector("[data-pt-cov-table]");
    if (!body) return;
    if (!state.data.coverage.length) {
      body.innerHTML = '<tr><td colspan="10">Keine offenen Vertretungen</td></tr>';
      return;
    }

    body.innerHTML = state.data.coverage.map((c) => {
      const recs = suggestCandidates(c);
      const recText = recs.slice(0, 3).map((r) => `${r.name} (${r.score}/3)`).join("; ") || "keine";
      const conflicts = [...c.conflicts, ...recs.flatMap((r) => r.conflict)].join("; ") || "keine";
      const missing = empName(c.missingEmployeeId);
      return `<tr><td>${c.date}</td><td>${c.shift}</td><td>${missing}</td><td>${c.reason}</td><td>${c.requiredRole}</td><td>${c.requiredQualification}</td><td>${c.vehicle}</td><td>${recText}</td><td>${conflicts}</td><td><div class="person-actions"><button class="admin-btn" type="button" data-cov-assign="${c.id}">direkt zuweisen</button><button class="admin-btn admin-btn-secondary" type="button" data-cov-request="${c.id}">Anfrage senden</button><button class="admin-btn admin-btn-secondary" type="button" data-cov-shift="${c.id}">Schichtplanung oeffnen</button></div></td></tr>`;
    }).join("");
  }

  function bind() {
    document.addEventListener("click", (event) => {
      const t = event.target.closest("[data-pt-status]");
      if (t) {
        const id = t.getAttribute("data-pt-status") || "";
        const row = state.data.tasks.find((x) => x.id === id);
        if (!row) return;
        const flow = ["offen", "in Bearbeitung", "wartet", "erledigt"];
        const idx = flow.indexOf(row.status);
        row.status = flow[(idx + 1) % flow.length];
        P.saveState(state.data);
        state.data = P.loadState();
        renderTasks();
        renderReminders();
        return;
      }

      const assign = event.target.closest("[data-cov-assign]");
      if (assign) {
        const id = assign.getAttribute("data-cov-assign") || "";
        const cov = state.data.coverage.find((x) => x.id === id);
        if (!cov) return;
        const pick = suggestCandidates(cov)[0];
        if (!pick) return;
        cov.candidates = [pick.id];
        cov.conflicts = pick.conflict;
        state.data.tasks.unshift({ id: `PT-${Date.now()}`, title: "Vertretung organisiert", employeeId: pick.id, category: "Vertretung organisieren", owner: "Disposition", dueDate: P.todayIso(), priority: "wichtig", status: "offen", note: `${pick.name} fuer ${cov.shift} vorgeschlagen`, relationType: "Vertretung", relationId: cov.id });
        P.saveState(state.data);
        state.data = P.loadState();
        renderCoverage();
        renderTasks();
        renderReminders();
        return;
      }

      const req = event.target.closest("[data-cov-request]");
      if (req) {
        const id = req.getAttribute("data-cov-request") || "";
        const cov = state.data.coverage.find((x) => x.id === id);
        if (!cov) return;
        state.data.tasks.unshift({ id: `PT-${Date.now()}`, title: "Vertretungsanfrage senden", employeeId: cov.missingEmployeeId, category: "Vertretung organisieren", owner: "Disposition", dueDate: P.todayIso(), priority: "normal", status: "offen", note: `Anfrage fuer ${cov.shift}`, relationType: "Vertretung", relationId: cov.id });
        P.saveState(state.data);
        state.data = P.loadState();
        renderTasks();
        renderReminders();
        return;
      }

      if (event.target.closest("[data-cov-shift]")) {
        window.location.href = "schichtplanung.html";
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderTasks();
    renderReminders();
    renderCoverage();
    bind();
  });
})();
