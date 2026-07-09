(() => {
  // Demo-Funktionalitat ohne echte Dateierstellung oder Persistenz.
  const exportModules = [
    { id: "EXP-1", area: "Fahrten exportieren", key: "Fahrten", formats: ["CSV", "PDF", "Excel"], scopes: ["Chef", "Disposition"], status: "Bereit", note: "Demo-Export fur Fahrtenjournal." },
    { id: "EXP-2", area: "Kunden exportieren", key: "Kunden", formats: ["CSV", "PDF", "Excel", "DATEV Demo"], scopes: ["Chef", "Buchhaltung"], status: "Bereit", note: "Demo-Export fur Kundendaten ohne echte Datei." },
    { id: "EXP-3", area: "Rechnungen exportieren", key: "Rechnungen", formats: ["CSV", "PDF", "Excel", "DATEV Demo"], scopes: ["Chef", "Buchhaltung"], status: "Bereit", note: "DATEV Demo fur Buchhaltung vorbereitet." },
    { id: "EXP-4", area: "Fahrzeuge exportieren", key: "Fahrzeuge", formats: ["CSV", "PDF", "Excel"], scopes: ["Chef", "Disposition"], status: "Bereit", note: "Flottenubersicht als Demo-Export." },
    { id: "EXP-5", area: "Fahrer exportieren", key: "Fahrer", formats: ["CSV", "PDF", "Excel"], scopes: ["Chef", "Disposition"], status: "Bereit", note: "Fahrerliste als Demo-Export." },
    { id: "EXP-6", area: "Dokumente exportieren", key: "Dokumente", formats: ["CSV", "PDF", "Excel"], scopes: ["Chef"], status: "Bereit", note: "Dokumentenindex als Demo-Export." }
  ];

  const backupItems = [
    { id: "BKP-1", title: "Komplettes System sichern Demo", area: "System", format: "Backup-Paket Demo", status: "Bereit", scopes: ["Chef"], action: "backup" },
    { id: "BKP-2", title: "Nur Admin-Daten sichern Demo", area: "Admin", format: "Konfigurations-Export Demo", status: "Bereit", scopes: ["Chef"], action: "backup" },
    { id: "BKP-3", title: "Nur Rechnungen sichern Demo", area: "Rechnungen", format: "Backup Rechnungen Demo", status: "Bereit", scopes: ["Chef", "Buchhaltung"], action: "backup" },
    { id: "BKP-4", title: "Wiederherstellung Demo deaktiviert", area: "Recovery", format: "Nicht verfugbar", status: "Deaktiviert", scopes: ["Chef", "Buchhaltung", "Disposition"], action: "disabled" }
  ];

  const state = {
    selectedFormats: {}
  };

  function readSession() {
    if (!window.AdminDemoAuth || typeof window.AdminDemoAuth.readSession !== "function") {
      return { role: "Chef", user: "admin" };
    }

    const session = window.AdminDemoAuth.readSession();
    if (!session) return { role: "Chef", user: "admin" };
    return { role: session.role || "Chef", user: session.user || "admin" };
  }

  function getRoleExportModules() {
    const { role } = readSession();
    return exportModules.filter((item) => item.scopes.includes(role));
  }

  function getRoleBackupItems() {
    const { role } = readSession();
    return backupItems.filter((item) => item.scopes.includes(role));
  }

  function renderStats() {
    const modules = getRoleExportModules();
    const backups = getRoleBackupItems();

    const stats = {
      lastExport: modules[0] ? "heute, 09:42" : "-",
      lastBackup: backups.some((item) => item.action === "backup") ? "heute, 08:55" : "-",
      modules: modules.length,
      pendingBackup: backups.filter((item) => item.action === "backup").length,
      systemStatus: "Demo bereit"
    };

    Object.entries(stats).forEach(([key, value]) => {
      const node = document.querySelector(`[data-export-stat="${key}"]`);
      if (!node) return;
      node.textContent = String(value);
    });
  }

  function openModal(payload) {
    const modal = document.querySelector("[data-export-modal]");
    const title = document.querySelector("[data-export-modal-title]");
    const body = document.querySelector("[data-export-modal-body]");
    if (!modal || !title || !body) return;

    title.textContent = payload.title;
    body.innerHTML = `
      <dl class="export-modal-list">
        <div><dt>Titel</dt><dd>${payload.title}</dd></div>
        <div><dt>Bereich</dt><dd>${payload.area}</dd></div>
        <div><dt>Format</dt><dd>${payload.format}</dd></div>
        <div><dt>Status</dt><dd>${payload.status}</dd></div>
      </dl>
      <p class="export-modal-note">Hinweis: Demo-Funktion - spater mit Backend und echter Datei-Erstellung</p>
    `;

    modal.hidden = false;
    document.body.classList.add("admin-modal-open");
  }

  function closeModal() {
    const modal = document.querySelector("[data-export-modal]");
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove("admin-modal-open");
  }

  function renderExportGrid() {
    const grid = document.querySelector("[data-export-grid]");
    if (!grid) return;

    const modules = getRoleExportModules();
    if (!modules.length) {
      grid.innerHTML = `
        <article class="admin-empty-state">
          <strong>📦 Keine Exportmodule verfugbar</strong>
          <p>Fur deine Rolle sind keine Exportbereiche freigeschaltet.</p>
        </article>
      `;
      return;
    }

    grid.innerHTML = modules
      .map((item) => {
        const selected = state.selectedFormats[item.id] || item.formats[0];
        const formatOptions = item.formats
          .map((format) => `<option value="${format}"${format === selected ? " selected" : ""}>${format}</option>`)
          .join("");

        return `
          <article class="export-card">
            <header class="export-card-head">
              <h3>${item.area}</h3>
              <span class="status-pill export-status-ready">${item.status}</span>
            </header>
            <p class="export-card-note">${item.note}</p>
            <label class="driver-label" for="format-${item.id}">Export-Format Demo</label>
            <select id="format-${item.id}" class="driver-search-input export-format-select" data-export-format="${item.id}">
              ${formatOptions}
            </select>
            <div class="export-actions">
              <button class="admin-btn" type="button" data-export-action="start" data-export-id="${item.id}">Export starten Demo</button>
              <button class="admin-btn admin-btn-secondary" type="button" data-export-action="download" data-export-id="${item.id}">Download Demo</button>
              <button class="admin-btn admin-btn-warning" type="button" data-export-action="history" data-export-id="${item.id}">Verlauf anzeigen Demo</button>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function renderBackupGrid() {
    const grid = document.querySelector("[data-backup-grid]");
    if (!grid) return;

    const items = getRoleBackupItems();
    if (!items.length) {
      grid.innerHTML = `
        <article class="admin-empty-state">
          <strong>💾 Keine Backup-Bereiche verfugbar</strong>
          <p>Fur deine Rolle sind keine Sicherungsbereiche freigeschaltet.</p>
        </article>
      `;
      return;
    }

    grid.innerHTML = items
      .map((item) => {
        const disabled = item.action === "disabled";
        return `
          <article class="backup-card${disabled ? " is-disabled" : ""}">
            <header class="backup-card-head">
              <h3>${item.title}</h3>
              <span class="status-pill ${disabled ? "export-status-disabled" : "export-status-ready"}">${item.status}</span>
            </header>
            <p class="export-card-note">Bereich: ${item.area}</p>
            <div class="backup-actions">
              <button class="admin-btn" type="button" data-backup-action="create" data-backup-id="${item.id}"${disabled ? " disabled" : ""}>Backup erstellen Demo</button>
              <button class="admin-btn admin-btn-secondary" type="button" data-backup-action="history" data-backup-id="${item.id}">Verlauf anzeigen Demo</button>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function handleExportAction(action, item) {
    const selectedFormat = state.selectedFormats[item.id] || item.formats[0];

    if (action === "start") {
      openModal({
        title: "Export starten Demo",
        area: item.area,
        format: selectedFormat,
        status: "Ausgefuhrt (Demo)"
      });
      return;
    }

    if (action === "download") {
      openModal({
        title: "Download Demo",
        area: item.area,
        format: selectedFormat,
        status: "Keine echte Datei erstellt"
      });
      return;
    }

    openModal({
      title: "Verlauf anzeigen Demo",
      area: item.area,
      format: selectedFormat,
      status: "Nur UI-Demo"
    });
  }

  function handleBackupAction(action, item) {
    if (action === "create") {
      openModal({
        title: "Backup erstellen Demo",
        area: item.area,
        format: item.format,
        status: "Backup simuliert"
      });
      return;
    }

    openModal({
      title: "Verlauf anzeigen Demo",
      area: item.area,
      format: item.format,
      status: "Keine Speicherung"
    });
  }

  function bindFormatChanges() {
    document.addEventListener("change", (event) => {
      const select = event.target.closest("[data-export-format]");
      if (!select) return;

      const id = select.getAttribute("data-export-format");
      if (!id) return;
      state.selectedFormats[id] = select.value;
    });
  }

  function bindActions() {
    document.addEventListener("click", (event) => {
      const exportBtn = event.target.closest("[data-export-action]");
      if (exportBtn) {
        const action = exportBtn.getAttribute("data-export-action");
        const id = exportBtn.getAttribute("data-export-id");
        const item = getRoleExportModules().find((entry) => entry.id === id);
        if (!action || !item) return;
        handleExportAction(action, item);
        return;
      }

      const backupBtn = event.target.closest("[data-backup-action]");
      if (backupBtn) {
        const action = backupBtn.getAttribute("data-backup-action");
        const id = backupBtn.getAttribute("data-backup-id");
        const item = getRoleBackupItems().find((entry) => entry.id === id);
        if (!action || !item) return;
        if (item.action === "disabled" && action === "create") return;
        handleBackupAction(action, item);
      }
    });
  }

  function bindModalClose() {
    document.querySelectorAll("[data-export-modal-close]").forEach((button) => {
      button.addEventListener("click", closeModal);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      const modal = document.querySelector("[data-export-modal]");
      if (!modal || modal.hidden) return;
      closeModal();
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    bindFormatChanges();
    bindActions();
    bindModalClose();
    renderStats();
    renderExportGrid();
    renderBackupGrid();
  });
})();
