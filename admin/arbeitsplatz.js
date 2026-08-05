(() => {
  const S = window.AdminSystemCenter;
  if (!S) return;

  const state = { data: S.loadState() };
  const PAGE_LABELS = {
    "index.html": "Dashboard",
    "live-dispo.html": "Live-Dispo",
    "geschaeftsfuehrer-dashboard.html": "Geschäftsführer-Dashboard",
    "aufgaben-center.html": "Aufgaben-Center",
    "benachrichtigungen-center.html": "Benachrichtigungs-Center",
    "arbeitsplatz.html": "Mein Arbeitsplatz",
    "personaluebersicht.html": "Personalübersicht"
  };
  const DENSITY_LABELS = {
    kompakt: "Kompakt",
    komfort: "Komfortabel"
  };

  function uiText(value) {
    const raw = String(value || "").trim();
    if (!raw) return "-";

    if (PAGE_LABELS[raw]) return PAGE_LABELS[raw];
    if (raw.endsWith(".html")) {
      const file = raw.split(/[?#]/)[0];
      if (PAGE_LABELS[file]) return PAGE_LABELS[file];
    }
    if (DENSITY_LABELS[raw]) return DENSITY_LABELS[raw];

    if (raw.startsWith("status:")) {
      const status = raw.slice(7).trim();
      const head = status.charAt(0).toUpperCase() + status.slice(1);
      return `Status: ${head}`;
    }

    if (raw === "admin") return "Administrator";
    if (raw === "enes") return "Enes";

    if (window.AdminUiText) {
      return window.AdminUiText.replaceText(raw);
    }
    return raw;
  }

  function renderSettings() {
    state.data = S.loadState();
    const settingsForm = document.querySelector("[data-work-settings-form]");
    if (!settingsForm) return;

    const settings = state.data.settings || {};
    settingsForm.elements.preferredStartPage.value = settings.preferredStartPage || "index.html";
    settingsForm.elements.density.value = settings.density || "komfort";
    settingsForm.elements.dateFormat.value = settings.dateFormat || "DD.MM.YYYY";
    settingsForm.elements.timeFormat.value = settings.timeFormat || "24h";
    settingsForm.elements.tableRows.value = settings.tableRows || 20;
    settingsForm.elements.standardFilter.value = settings.standardFilter || "";

    const n = settings.notifications || {};
    let profile = "alle";
    if (n.muted) profile = "stumm";
    else if (n.criticalOnly) profile = "kritisch";
    settingsForm.elements.notificationProfile.value = profile;
  }

  function renderFavorites() {
    const node = document.querySelector("[data-work-favorites]");
    if (!node) return;

    const rows = state.data.favorites || [];
    if (!rows.length) {
      node.innerHTML = '<p class="m-note">Noch keine Favoriten gesetzt.</p>';
      return;
    }

    node.innerHTML = rows
      .map((row) => {
        const key = row.key || `${row.category}:${row.title}`;
        return `<article class="m-item"><div class="m-item-head"><div><strong>${uiText(row.title)}</strong><p>${uiText(row.category)}</p></div><details class="m-item-menu"><summary aria-label="Mehr Aktionen">⋯</summary><div class="m-item-menu-list"><button class="admin-btn admin-btn-secondary" type="button" data-work-unfav="${key}">Entfernen</button></div></details></div><div class="m-actions"><a class="admin-btn admin-btn-secondary" href="${row.link || '#'}">Öffnen</a></div></article>`;
      })
      .join("");
  }

  function renderRecents() {
    const node = document.querySelector("[data-work-recents]");
    if (!node) return;

    const rows = state.data.recent || [];
    if (!rows.length) {
      node.innerHTML = '<div class="m-note m-empty-inline"><span>Noch keine Einträge vorhanden.</span><a class="admin-btn admin-btn-secondary" href="index.html" data-work-open-areas>Bereiche öffnen</a></div>';
      return;
    }

    node.innerHTML = rows
      .slice(0, 20)
      .map((row) => `<article class="m-item"><strong>${uiText(row.title)}</strong><p>${uiText(row.category)}${row.info ? ` · ${uiText(row.info)}` : ""}</p><p>${S.formatDateTime(row.at)}</p><div class="m-actions"><a class="admin-btn admin-btn-secondary" href="${row.link || '#'}">Öffnen</a></div></article>`)
      .join("");
  }

  function renderFilters() {
    const node = document.querySelector("[data-work-filters]");
    if (!node) return;

    const rows = state.data.savedFilters || [];
    if (!rows.length) {
      node.innerHTML = '<p class="m-note">Keine gespeicherten Filter.</p>';
      return;
    }

    node.innerHTML = rows
      .map((row) => `<article class="m-item"><strong>${uiText(row.name)}</strong><p>${uiText(row.area)} · ${uiText(row.privacy)}</p><p>${uiText(row.filter)}</p><div class="m-actions"><button class="admin-btn admin-btn-secondary" type="button" data-work-remove-filter="${row.id}">Löschen</button></div></article>`)
      .join("");
  }

  function renderViews() {
    const node = document.querySelector("[data-work-views]");
    if (!node) return;

    const rows = state.data.tableViews || [];
    if (!rows.length) {
      node.innerHTML = '<p class="m-note">Keine gespeicherten Tabellenansichten.</p>';
      return;
    }

    node.innerHTML = rows
      .map((row) => `<article class="m-item"><strong>${uiText(row.name)}</strong><p>${uiText(row.area)}</p><p>Spalten: ${(row.columns || []).map((col) => uiText(col)).join(", ") || "-"}</p><p>Sortierung: ${uiText(row.sort || "-")}</p><div class="m-actions"><button class="admin-btn admin-btn-secondary" type="button" data-work-remove-view="${row.id}">Löschen</button></div></article>`)
      .join("");
  }

  function renderActivity() {
    const node = document.querySelector("[data-work-activity]");
    if (!node) return;

    const rows = S.getActivityLog().slice(0, 14);
    if (!rows.length) {
      node.innerHTML = '<p class="m-note">Aktuell keine Aktivitaeten.</p>';
      return;
    }

    node.innerHTML = rows
      .map((row) => `<article class="m-item"><strong>${row.action}</strong><p>${row.area} · ${row.record || "-"} · ${row.note || ""}</p><p>${S.formatDateTime(row.at)} · ${row.user}</p></article>`)
      .join("");
  }

  function render() {
    state.data = S.loadState();
    renderSettings();
    renderFavorites();
    renderRecents();
    renderFilters();
    renderViews();
    renderActivity();
  }

  function bindSettings() {
    const saveButton = document.querySelector("[data-work-save-settings]");
    if (!saveButton) return;

    saveButton.addEventListener("click", () => {
      const settingsForm = document.querySelector("[data-work-settings-form]");
      if (!settingsForm) return;

      const profile = String(settingsForm.elements.notificationProfile.value || "alle");

      const patch = {
        preferredStartPage: String(settingsForm.elements.preferredStartPage.value || "").trim() || "geschaeftsfuehrer-dashboard.html",
        density: String(settingsForm.elements.density.value || "komfort"),
        dateFormat: String(settingsForm.elements.dateFormat.value || "DD.MM.YYYY"),
        timeFormat: String(settingsForm.elements.timeFormat.value || "24h"),
        tableRows: Number(settingsForm.elements.tableRows.value || 20),
        standardFilter: String(settingsForm.elements.standardFilter.value || ""),
        notifications: {
          criticalOnly: profile === "kritisch",
          muted: profile === "stumm",
          dailySummaryDemo: profile !== "stumm"
        }
      };

      S.updateSettings(state.data, patch);
      S.addActivity({ user: localStorage.getItem("demoAdminUser") || "System", role: localStorage.getItem("demoAdminRole") || "Chef", action: "Datensatz bearbeitet", area: "System", record: "settings", beforeStatus: "", nextStatus: "gespeichert", note: "Arbeitsplatz-Einstellungen" });
      render();
    });
  }

  function bindForms() {
    const filterForm = document.querySelector("[data-work-filter-form]");
    if (filterForm) {
      filterForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const payload = Object.fromEntries(new FormData(filterForm).entries());
        S.saveFilter(state.data, payload);
        filterForm.reset();
        render();
      });
    }

    const viewForm = document.querySelector("[data-work-view-form]");
    if (viewForm) {
      viewForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const payload = Object.fromEntries(new FormData(viewForm).entries());
        S.saveTableView(state.data, payload);
        viewForm.reset();
        render();
      });
    }
  }

  function bindActions() {
    const clearRecents = document.querySelector("[data-work-clear-recents]");
    if (clearRecents) {
      clearRecents.addEventListener("click", () => {
        S.clearRecent(state.data);
        render();
      });
    }

    document.addEventListener("click", (event) => {
      const openAreas = event.target.closest("[data-work-open-areas]");
      if (openAreas) {
        window.location.href = "index.html";
        return;
      }

      const removeFilter = event.target.closest("[data-work-remove-filter]");
      if (removeFilter) {
        S.removeFilter(state.data, removeFilter.getAttribute("data-work-remove-filter") || "");
        render();
        return;
      }

      const removeView = event.target.closest("[data-work-remove-view]");
      if (removeView) {
        S.removeTableView(state.data, removeView.getAttribute("data-work-remove-view") || "");
        render();
        return;
      }

      const unfav = event.target.closest("[data-work-unfav]");
      if (!unfav) return;
      const key = unfav.getAttribute("data-work-unfav") || "";
      const item = (state.data.favorites || []).find((f) => (f.key || `${f.category}:${f.title}`) === key);
      if (!item) return;
      S.setFavorite(state.data, { title: item.title, category: item.category, link: item.link }, false);
      render();
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    bindSettings();
    bindForms();
    bindActions();
    render();
  });
})();
