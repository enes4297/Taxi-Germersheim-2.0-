(() => {
  const S = window.AdminSystemCenter;
  if (!S) return;

  const state = { data: S.loadState(), query: "", status: "alle", priority: "alle", category: "alle", openOnly: "ja" };
  const session = {
    user: localStorage.getItem("demoAdminUser") || "System",
    role: localStorage.getItem("demoAdminRole") || "Chef"
  };

  function isOpen(status) {
    return !["gelesen", "bestaetigt", "erledigt", "archiviert"].includes(S.normalize(status));
  }

  function refreshBadges() {
    if (typeof window.__adminV20RefreshBadges === "function") {
      window.__adminV20RefreshBadges(session.role, session.user);
    }
  }

  function tone(priority) {
    const p = S.normalize(priority);
    if (p.includes("krit")) return "kritisch";
    if (p.includes("dring") || p.includes("wichtig")) return "wichtig";
    if (p.includes("info")) return "normal";
    return "normal";
  }

  function badge(text, custom) {
    return `<span class="m-pill ${custom || tone(text)}">${text}</span>`;
  }

  function getRows() {
    state.data = S.loadState();
    const items = S.allNotifications(state.data, S.loadSources());

    return items.filter((item) => {
      if (state.openOnly === "ja" && !isOpen(item.status)) return false;
      if (state.status !== "alle" && S.normalize(item.status) !== S.normalize(state.status)) return false;
      if (state.priority !== "alle" && S.normalize(item.priority) !== S.normalize(state.priority)) return false;
      if (state.category !== "alle" && S.normalize(item.category) !== S.normalize(state.category)) return false;
      if (state.query) {
        const bag = `${item.title} ${item.message} ${item.category} ${item.source} ${item.assignedTo || ""}`;
        if (!S.normalize(bag).includes(S.normalize(state.query))) return false;
      }
      return true;
    });
  }

  function renderKpis(items) {
    const node = document.querySelector("[data-notice-kpis]");
    if (!node) return;
    const unread = items.filter((x) => isOpen(x.status)).length;
    const critical = items.filter((x) => S.normalize(x.priority).includes("krit")).length;
    const grouped = S.groupedNotifications(items);
    const assigned = items.filter((x) => S.normalize(x.assignedTo).includes(S.normalize(session.role)) || S.normalize(x.assignedTo).includes(S.normalize(session.user))).length;

    node.innerHTML = [
      `<article class="m-kpi"><small>Gesamt</small><strong>${items.length}</strong><p>systemweite Meldungen</p></article>`,
      `<article class="m-kpi"><small>Offen</small><strong>${unread}</strong><p>noch nicht abgeschlossen</p></article>`,
      `<article class="m-kpi"><small>Kritisch</small><strong>${critical}</strong><p>sofortige Prioritaet</p></article>`,
      `<article class="m-kpi"><small>Gruppen</small><strong>${grouped.length}</strong><p>zusammengefasste Events</p></article>`,
      `<article class="m-kpi"><small>Meine Rolle</small><strong>${assigned}</strong><p>direkt zugewiesen</p></article>
      <article class="m-kpi"><small>Letzte Aktualisierung</small><strong>${S.formatDateTime(S.nowIso())}</strong><p>live aus lokalen Daten</p></article>`
    ].join("");
  }

  function renderFilters(items) {
    const form = document.querySelector("[data-notice-filter-form]");
    if (!form) return;

    const statusSelect = form.elements.status;
    const prioritySelect = form.elements.priority;
    const categorySelect = form.elements.category;

    if (statusSelect && statusSelect.options.length <= 1) {
      statusSelect.innerHTML = `<option value="alle">Alle</option>${S.NOTICE_STATUSES.map((x) => `<option value="${x}">${x}</option>`).join("")}`;
    }

    if (prioritySelect && prioritySelect.options.length <= 1) {
      prioritySelect.innerHTML = `<option value="alle">Alle</option>${S.NOTICE_PRIORITIES.map((x) => `<option value="${x}">${x}</option>`).join("")}`;
    }

    if (categorySelect && categorySelect.options.length <= 1) {
      const categories = [...new Set(items.map((x) => x.category).filter(Boolean))];
      categorySelect.innerHTML = `<option value="alle">Alle</option>${categories.map((x) => `<option value="${x}">${x}</option>`).join("")}`;
    }
  }

  function renderList(items) {
    const node = document.querySelector("[data-notice-list]");
    if (!node) return;

    const grouped = S.groupedNotifications(items);
    if (!grouped.length) {
      node.innerHTML = '<p class="m-note">Keine Meldungen im aktuellen Filter.</p>';
      return;
    }

    node.innerHTML = grouped.map((group) => {
      const first = group.items[0];
      const detailRows = group.items.map((item) => {
        return `<article class="m-item"><strong>${item.title}</strong><p>${item.message}</p><p>${badge(item.priority)} · ${badge(item.status, isOpen(item.status) ? "wichtig" : "success")}</p><p>${item.category || "-"} · ${item.source || "-"} · ${S.formatDateTime(item.timestamp)}</p><div class="m-actions"><button class="admin-btn admin-btn-secondary" type="button" data-notice-status="gelesen" data-notice-id="${item.id}">Schliessen</button><button class="admin-btn admin-btn-secondary" type="button" data-notice-status="bestaetigt" data-notice-id="${item.id}">Bestaetigen</button><button class="admin-btn admin-btn-secondary" type="button" data-notice-status="archiviert" data-notice-id="${item.id}">Archivieren</button><button class="admin-btn admin-btn-secondary" type="button" data-notice-status="erledigt" data-notice-id="${item.id}">Erledigt</button><button class="admin-btn" type="button" data-notice-task="${item.id}">Als Aufgabe</button></div></article>`;
      }).join("");

      return `<section class="admin-panel"><div class="admin-panel-head"><h3>${group.title}</h3><small>${group.count} Eintrag(e) · ${badge(first.priority)}</small></div>${detailRows}</section>`;
    }).join("");
  }

  function render() {
    const rows = getRows();
    renderFilters(rows);
    renderKpis(rows);
    renderList(rows);
  }

  function openModal(open) {
    const modal = document.querySelector("[data-notice-modal]");
    if (!modal) return;
    modal.hidden = !open;
  }

  function bindForm() {
    const form = document.querySelector("[data-notice-create-form]");
    const submit = document.querySelector("[data-notice-submit]");
    const openBtn = document.querySelector("[data-notice-open-create]");

    if (!form || !submit || !openBtn) return;

    form.elements.priority.innerHTML = S.NOTICE_PRIORITIES.map((x) => `<option value="${x}">${x}</option>`).join("");
    form.elements.status.innerHTML = S.NOTICE_STATUSES.map((x) => `<option value="${x}">${x}</option>`).join("");

    openBtn.addEventListener("click", () => openModal(true));
    submit.addEventListener("click", () => {
      if (!form.reportValidity()) return;
      const payload = Object.fromEntries(new FormData(form).entries());
      S.addNotification(state.data, payload, session.user);
      form.reset();
      openModal(false);
      refreshBadges();
      render();
    });

    if (!window.__adminNoticeModalCloseHandler) {
      window.__adminNoticeModalCloseHandler = (event) => {
        if (!event.target.closest("[data-notice-close-modal]")) return;
        openModal(false);
      };
      document.addEventListener("click", window.__adminNoticeModalCloseHandler);
    }

    if (!window.__adminNoticeModalEscapeHandler) {
      window.__adminNoticeModalEscapeHandler = (event) => {
        if (event.key !== "Escape" && event.key !== "Esc") return;
        const modal = document.querySelector("[data-notice-modal]");
        if (!modal || modal.hidden) return;
        openModal(false);
      };
      document.addEventListener("keydown", window.__adminNoticeModalEscapeHandler);
    }
  }

  function bindFilters() {
    const form = document.querySelector("[data-notice-filter-form]");
    if (!form) return;
    form.addEventListener("input", () => {
      state.query = String(form.elements.q.value || "").trim();
      state.status = String(form.elements.status.value || "alle");
      state.priority = String(form.elements.priority.value || "alle");
      state.category = String(form.elements.category.value || "alle");
      state.openOnly = String(form.elements.openOnly.value || "ja");
      render();
    });
  }

  function bindActions() {
    if (window.__adminNoticeActionsHandler) return;
    window.__adminNoticeActionsHandler = (event) => {
      const statusBtn = event.target.closest("[data-notice-status]");
      if (statusBtn) {
        const id = statusBtn.getAttribute("data-notice-id") || "";
        const next = statusBtn.getAttribute("data-notice-status") || "gelesen";
        S.updateNotification(state.data, id, { status: next }, session.user);
        refreshBadges();
        render();
        return;
      }

      const taskBtn = event.target.closest("[data-notice-task]");
      if (!taskBtn) return;
      const id = taskBtn.getAttribute("data-notice-task") || "";
      const row = getRows().find((x) => x.id === id);
      if (!row) return;
      S.addTask(state.data, {
        title: `Aus Meldung: ${row.title}`,
        description: row.message,
        category: row.category || "System",
        source: "Benachrichtigungen",
        owner: row.assignedTo || session.role,
        priority: S.normalize(row.priority).includes("krit") ? "kritisch" : S.normalize(row.priority).includes("dring") ? "dringend" : "normal",
        status: "offen",
        dueDate: S.todayIso(),
        link: row.link || "aufgaben-center.html"
      }, session.user);
      S.updateNotification(state.data, id, { status: "bestaetigt" }, session.user);
      refreshBadges();
      render();
    };

    document.addEventListener("click", window.__adminNoticeActionsHandler);

    const readAll = document.querySelector("[data-notice-read-all]");
    if (readAll) {
      readAll.addEventListener("click", () => {
        getRows().forEach((row) => {
          S.updateNotification(state.data, row.id, { status: "gelesen" }, session.user);
        });
        refreshBadges();
        render();
      });
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    bindFilters();
    bindForm();
    bindActions();
    render();
  });
})();
