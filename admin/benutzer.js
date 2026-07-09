(() => {
  // Reine Demo-Benutzerverwaltung ohne Backend oder Persistenz.
  const demoRoles = ["Chef", "Disposition", "Buchhaltung", "Fahrer", "Werkstatt", "Support"];

  const demoUsers = [
    {
      id: "USR-001",
      name: "Enes Carman",
      username: "admin",
      role: "Chef",
      status: "Aktiv",
      lastLogin: "heute, 08:12",
      twoFactor: "Aktiv",
      permissions: ["Alle Module", "Rollen verwalten", "Benutzer freigeben"]
    },
    {
      id: "USR-002",
      name: "Disposition",
      username: "dispo",
      role: "Disposition",
      status: "Aktiv",
      lastLogin: "heute, 07:48",
      twoFactor: "Aktiv",
      permissions: ["Fahrten disponieren", "Fahrer planen", "Live-Karte"]
    },
    {
      id: "USR-003",
      name: "Buchhaltung",
      username: "billing",
      role: "Buchhaltung",
      status: "Gesperrt",
      lastLogin: "gestern, 18:03",
      twoFactor: "Inaktiv",
      permissions: ["Rechnungen", "Kunden-Abrechnung", "Reportexport"]
    },
    {
      id: "USR-004",
      name: "Fahrer Demo",
      username: "fahrer",
      role: "Fahrer",
      status: "Aktiv",
      lastLogin: "heute, 06:55",
      twoFactor: "Aktiv",
      permissions: ["Eigene Fahrten", "Live-Karte (eigene Sicht)", "Dokumente"]
    }
  ];

  const statusClassMap = {
    Aktiv: "user-status-active",
    Gesperrt: "user-status-locked"
  };

  const twoFactorClassMap = {
    Aktiv: "user-2fa-active",
    Inaktiv: "user-2fa-off"
  };

  function renderStats() {
    const activeUsers = demoUsers.filter((item) => item.status === "Aktiv").length;
    const lockedUsers = demoUsers.filter((item) => item.status === "Gesperrt").length;

    const stats = {
      total: demoUsers.length,
      active: activeUsers,
      locked: lockedUsers,
      roles: demoRoles.length,
      lastLogin: demoUsers[0] ? demoUsers[0].lastLogin : "-"
    };

    Object.entries(stats).forEach(([key, value]) => {
      const node = document.querySelector(`[data-user-stat="${key}"]`);
      if (!node) return;
      node.textContent = String(value);
    });
  }

  function renderRoleTags() {
    const target = document.querySelector("[data-user-role-tags]");
    if (!target) return;

    target.innerHTML = demoRoles
      .map((role) => `<span class="user-role-tag">${role}</span>`)
      .join("");
  }

  function openModal(title, bodyHtml) {
    const modal = document.querySelector("[data-user-modal]");
    const modalTitle = document.querySelector("[data-user-modal-title]");
    const modalBody = document.querySelector("[data-user-modal-body]");
    if (!modal || !modalTitle || !modalBody) return;

    modalTitle.textContent = title;
    modalBody.innerHTML = bodyHtml;
    modal.hidden = false;
    document.body.classList.add("admin-modal-open");
  }

  function closeModal() {
    const modal = document.querySelector("[data-user-modal]");
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove("admin-modal-open");
  }

  function buildDetailModal(user) {
    return `
      <dl class="user-modal-list">
        <div><dt>Name</dt><dd>${user.name}</dd></div>
        <div><dt>Benutzername</dt><dd>${user.username}</dd></div>
        <div><dt>Rolle</dt><dd>${user.role}</dd></div>
        <div><dt>Status</dt><dd>${user.status}</dd></div>
        <div><dt>Letzter Login</dt><dd>${user.lastLogin}</dd></div>
        <div><dt>Berechtigungen</dt><dd>${user.permissions.join(", ")}</dd></div>
      </dl>
      <p class="user-modal-note">Interne Notiz: Demo-Benutzerverwaltung ohne Backend</p>
    `;
  }

  function buildActionModal(user, action) {
    const messages = {
      role: `Demo: Rolle für ${user.username} wird vorbereitet. Keine Änderung ohne Backend.`,
      lock: `Demo: Benutzer ${user.username} wird als gesperrt markiert. Keine Speicherung ohne Backend.`,
      reset: `Demo: Passwort-Reset für ${user.username} wurde ausgelöst.`,
      twofa: `Demo: Zwei-Faktor-Setup für ${user.username} wird vorbereitet.`
    };

    return `<p class="user-modal-note">${messages[action] || "Demo-Aktion"}</p>`;
  }

  function renderGrid() {
    const grid = document.querySelector("[data-user-grid]");
    if (!grid) return;

    if (!demoUsers.length) {
      grid.innerHTML = `
        <article class="admin-empty-state">
          <strong>👤 Keine Benutzer vorhanden</strong>
          <p>Keine Einträge gefunden.</p>
        </article>
      `;
      return;
    }

    grid.innerHTML = demoUsers
      .map((user) => {
        return `
          <article class="user-card">
            <header class="user-card-head">
              <div>
                <h2>${user.name}</h2>
                <p>@${user.username}</p>
              </div>
              <span class="status-pill ${statusClassMap[user.status] || "user-status-locked"}">${user.status}</span>
            </header>

            <dl class="user-meta-list">
              <div><dt>Rolle</dt><dd>${user.role}</dd></div>
              <div><dt>Letzter Login</dt><dd>${user.lastLogin}</dd></div>
              <div><dt>Zwei-Faktor Demo</dt><dd><span class="status-pill ${twoFactorClassMap[user.twoFactor] || "user-2fa-off"}">${user.twoFactor}</span></dd></div>
              <div><dt>Berechtigungen</dt><dd>${user.permissions.slice(0, 2).join(" • ")}</dd></div>
            </dl>

            <div class="user-actions">
              <button class="admin-btn admin-btn-secondary" type="button" data-user-action="details" data-user-id="${user.id}">Details</button>
              <button class="admin-btn" type="button" data-user-action="role" data-user-id="${user.id}">Rolle ändern Demo</button>
              <button class="admin-btn admin-btn-danger" type="button" data-user-action="lock" data-user-id="${user.id}">Benutzer sperren Demo</button>
              <button class="admin-btn admin-btn-warning" type="button" data-user-action="reset" data-user-id="${user.id}">Passwort zurücksetzen Demo</button>
              <button class="admin-btn admin-btn-secondary" type="button" data-user-action="twofa" data-user-id="${user.id}">Zwei-Faktor aktivieren Demo</button>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function bindActions() {
    document.addEventListener("click", (event) => {
      const button = event.target.closest("[data-user-action]");
      if (!button) return;

      const action = button.getAttribute("data-user-action");
      const id = button.getAttribute("data-user-id");
      const user = demoUsers.find((item) => item.id === id);
      if (!action || !user) return;

      if (action === "details") {
        openModal(`Benutzerdetails: ${user.username}`, buildDetailModal(user));
        return;
      }

      openModal(`Aktion: ${user.username}`, buildActionModal(user, action));
    });
  }

  function bindModalClose() {
    document.querySelectorAll("[data-user-modal-close]").forEach((button) => {
      button.addEventListener("click", closeModal);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      const modal = document.querySelector("[data-user-modal]");
      if (!modal || modal.hidden) return;
      closeModal();
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderStats();
    renderRoleTags();
    renderGrid();
    bindActions();
    bindModalClose();
  });
})();
