(() => {
  const S = window.AdminSystemCenter;
  if (!S) return;

  const state = { data: S.loadState(), query: "", status: "alle", priority: "alle", category: "alle", mine: "nein" };
  const session = {
    user: localStorage.getItem("demoAdminUser") || "System",
    role: localStorage.getItem("demoAdminRole") || "Chef"
  };

  const boardColumns = ["neu", "offen", "zugewiesen", "in Bearbeitung", "wartet auf Rueckmeldung", "blockiert", "erledigt"];

  function refreshBadges() {
    if (typeof window.__adminV20RefreshBadges === "function") {
      window.__adminV20RefreshBadges(session.role, session.user);
    }
  }

  function badge(value, tone) {
    const cls = tone || (S.normalize(value).includes("krit") ? "kritisch" : S.normalize(value).includes("dring") || S.normalize(value).includes("wichtig") ? "wichtig" : S.normalize(value).includes("erled") ? "success" : "normal");
    return `<span class="m-pill ${cls}">${value}</span>`;
  }

  function matchesFilters(task) {
    if (state.status !== "alle" && S.normalize(task.status) !== S.normalize(state.status)) return false;
    if (state.priority !== "alle" && S.normalize(task.priority) !== S.normalize(state.priority)) return false;
    if (state.category !== "alle" && S.normalize(task.category) !== S.normalize(state.category)) return false;

    if (state.mine === "ja") {
      const owner = `${task.owner || ""}`.toLowerCase();
      const user = session.user.toLowerCase();
      const role = session.role.toLowerCase();
      if (owner && !owner.includes(user) && !owner.includes(role)) return false;
    }

    if (state.query) {
      const bag = `${task.id} ${task.title} ${task.description || ""} ${task.category || ""} ${task.source || ""} ${task.owner || ""} ${task.priority || ""} ${task.status || ""}`;
      if (!S.normalize(bag).includes(S.normalize(state.query))) return false;
    }

    return true;
  }

  function getTasks() {
    state.data = S.loadState();
    return S.allTasks(state.data, S.loadSources()).filter(matchesFilters);
  }

  function nextStatus(current) {
    const flow = ["neu", "offen", "zugewiesen", "in Bearbeitung", "wartet auf Rueckmeldung", "blockiert", "erledigt"];
    const idx = flow.findIndex((x) => S.normalize(x) === S.normalize(current));
    if (idx === -1) return "offen";
    return flow[(idx + 1) % flow.length];
  }

  function renderKpis(tasks) {
    const node = document.querySelector("[data-task-kpis]");
    if (!node) return;
    const stats = S.taskStats(tasks, session.user);
    node.innerHTML = [
      `<article class="m-kpi"><small>Gesamt</small><strong>${stats.total}</strong><p>alle sichtbaren Aufgaben</p></article>`,
      `<article class="m-kpi"><small>Heute faellig</small><strong>${stats.dueToday}</strong><p>inklusive rueckfuehrender Tasks</p></article>`,
      `<article class="m-kpi"><small>Ueberfaellig</small><strong>${stats.overdue}</strong><p>mit Eskalationsbedarf</p></article>`,
      `<article class="m-kpi"><small>Kritisch</small><strong>${stats.critical}</strong><p>Prioritaet kritisch</p></article>`,
      `<article class="m-kpi"><small>Wartet</small><strong>${stats.waiting}</strong><p>wartet auf Rueckmeldung</p></article>`,
      `<article class="m-kpi"><small>Heute erledigt</small><strong>${stats.doneToday}</strong><p>seit Tagesbeginn</p></article>`
    ].join("");
  }

  function renderBoard(tasks) {
    const node = document.querySelector("[data-task-board]");
    if (!node) return;

    node.innerHTML = boardColumns.map((status) => {
      const rows = tasks.filter((t) => S.normalize(t.status) === S.normalize(status)).slice(0, 5);
      const cards = rows.length
        ? rows
            .map((row) => {
              const progress = S.checklistProgress(row);
              return `<article class="m-item"><strong>${row.title}</strong><p>${badge(row.priority)} · ${badge(row.status)}</p><p>${row.owner || "ohne Zuweisung"} · faellig ${row.dueDate || "-"}</p><p>Checkliste: ${progress.done}/${progress.done + progress.open}</p></article>`;
            })
            .join("")
        : '<p class="m-note">Keine Eintraege</p>';
      return `<section class="admin-panel"><div class="admin-panel-head"><h3>${status}</h3><small>${rows.length}</small></div>${cards}</section>`;
    }).join("");
  }

  function renderTable(tasks) {
    const tbody = document.querySelector("[data-task-table]");
    if (!tbody) return;

    const sorted = [...tasks].sort((a, b) => String(a.dueDate || "").localeCompare(String(b.dueDate || ""))).slice(0, 120);
    if (!sorted.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="admin-table-empty">Keine Aufgaben im aktuellen Filter</td></tr>';
      return;
    }

    tbody.innerHTML = sorted.map((task) => {
      return `<tr>
        <td>${task.id}</td>
        <td>${task.title}</td>
        <td>${badge(task.status)}</td>
        <td>${badge(task.priority)}</td>
        <td>${task.owner || "-"}</td>
        <td>${task.dueDate || "-"}</td>
        <td>
          <div class="m-actions">
            <button class="admin-btn admin-btn-secondary" type="button" data-task-next="${task.id}">Weiter</button>
            <button class="admin-btn admin-btn-secondary" type="button" data-task-done="${task.id}">Erledigt</button>
            <button class="admin-btn admin-btn-secondary" type="button" data-task-copy="${task.id}">Kopie</button>
          </div>
        </td>
      </tr>`;
    }).join("");
  }

  function renderActivity() {
    const node = document.querySelector("[data-task-activity]");
    if (!node) return;
    const rows = S.getActivityLog().filter((x) => x.area === "Aufgaben").slice(0, 10);
    if (!rows.length) {
      node.innerHTML = '<p class="m-note">Noch keine Task-Aktivitaeten vorhanden.</p>';
      return;
    }
    node.innerHTML = rows.map((row) => `<article class="m-item"><strong>${row.action}</strong><p>${row.record || "-"} · ${row.note || ""}</p><p>${S.formatDateTime(row.at)} · ${row.user}</p></article>`).join("");
  }

  function renderFilters(tasks) {
    const form = document.querySelector("[data-task-filter-form]");
    if (!form) return;

    const statusSelect = form.elements.status;
    const prioritySelect = form.elements.priority;
    const categorySelect = form.elements.category;

    if (statusSelect && statusSelect.options.length <= 1) {
      statusSelect.innerHTML = `<option value="alle">Alle</option>${S.TASK_STATUSES.map((x) => `<option value="${x}">${x}</option>`).join("")}`;
    }

    if (prioritySelect && prioritySelect.options.length <= 1) {
      prioritySelect.innerHTML = `<option value="alle">Alle</option>${S.TASK_PRIORITIES.map((x) => `<option value="${x}">${x}</option>`).join("")}`;
    }

    if (categorySelect && categorySelect.options.length <= 1) {
      const categories = [...new Set(tasks.map((t) => t.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, "de"));
      categorySelect.innerHTML = `<option value="alle">Alle</option>${categories.map((x) => `<option value="${x}">${x}</option>`).join("")}`;
    }
  }

  function render() {
    const tasks = getTasks();
    renderFilters(tasks);
    renderKpis(tasks);
    renderBoard(tasks);
    renderTable(tasks);
    renderActivity();
  }

  function openModal(open) {
    const modal = document.querySelector("[data-task-modal]");
    if (!modal) return;
    modal.hidden = !open;
  }

  function bindFilters() {
    const form = document.querySelector("[data-task-filter-form]");
    if (!form) return;

    form.addEventListener("input", () => {
      state.query = String(form.elements.q.value || "").trim();
      state.status = String(form.elements.status.value || "alle");
      state.priority = String(form.elements.priority.value || "alle");
      state.category = String(form.elements.category.value || "alle");
      state.mine = String(form.elements.mine.value || "nein");
      render();
    });
  }

  function bindCreateForm() {
    const form = document.querySelector("[data-task-create-form]");
    const submit = document.querySelector("[data-task-submit]");
    const openBtn = document.querySelector("[data-task-open-create]");

    if (!form || !submit || !openBtn) return;

    const prioritySelect = form.elements.priority;
    const statusSelect = form.elements.status;
    prioritySelect.innerHTML = S.TASK_PRIORITIES.map((x) => `<option value="${x}">${x}</option>`).join("");
    statusSelect.innerHTML = S.TASK_STATUSES.map((x) => `<option value="${x}">${x}</option>`).join("");

    form.elements.dueDate.value = S.todayIso();

    openBtn.addEventListener("click", () => openModal(true));

    submit.addEventListener("click", () => {
      if (!form.reportValidity()) return;
      const payload = Object.fromEntries(new FormData(form).entries());
      S.addTask(state.data, payload, session.user);
      form.reset();
      form.elements.dueDate.value = S.todayIso();
      openModal(false);
      refreshBadges();
      render();
    });

    if (!window.__adminTaskModalCloseHandler) {
      window.__adminTaskModalCloseHandler = (event) => {
        if (!event.target.closest("[data-task-close-modal]")) return;
        openModal(false);
      };
      document.addEventListener("click", window.__adminTaskModalCloseHandler);
    }

    if (!window.__adminTaskModalEscapeHandler) {
      window.__adminTaskModalEscapeHandler = (event) => {
        if (event.key !== "Escape" && event.key !== "Esc") return;
        const modal = document.querySelector("[data-task-modal]");
        if (!modal || modal.hidden) return;
        openModal(false);
      };
      document.addEventListener("keydown", window.__adminTaskModalEscapeHandler);
    }
  }

  function bindTableActions() {
    if (window.__adminTaskTableActionsHandler) return;
    window.__adminTaskTableActionsHandler = (event) => {
      const nextBtn = event.target.closest("[data-task-next]");
      if (nextBtn) {
        const id = nextBtn.getAttribute("data-task-next") || "";
        const task = getTasks().find((row) => row.id === id);
        if (!task) return;
        S.updateTask(state.data, id, { status: nextStatus(task.status) }, session.user);
        refreshBadges();
        render();
        return;
      }

      const doneBtn = event.target.closest("[data-task-done]");
      if (doneBtn) {
        const id = doneBtn.getAttribute("data-task-done") || "";
        S.updateTask(state.data, id, { status: "erledigt" }, session.user);
        refreshBadges();
        render();
        return;
      }

      const copyBtn = event.target.closest("[data-task-copy]");
      if (copyBtn) {
        const id = copyBtn.getAttribute("data-task-copy") || "";
        S.duplicateTask(state.data, id, session.user);
        refreshBadges();
        render();
      }
    };

    document.addEventListener("click", window.__adminTaskTableActionsHandler);
  }

  function bindReset() {
    const btn = document.querySelector("[data-task-reset-filter]");
    if (!btn) return;
    btn.addEventListener("click", () => {
      state.query = "";
      state.status = "alle";
      state.priority = "alle";
      state.category = "alle";
      state.mine = "nein";
      const form = document.querySelector("[data-task-filter-form]");
      if (form) form.reset();
      render();
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    bindFilters();
    bindCreateForm();
    bindTableActions();
    bindReset();
    render();
  });
})();
