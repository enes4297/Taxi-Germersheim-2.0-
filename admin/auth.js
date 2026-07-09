// Nur Demo-Rollen. Kein echter Zugriffsschutz ohne Backend.
(() => {
  const LEGACY_STORAGE_KEY = "taxiAdminDemoSession";
  const KEY_LOGGED_IN = "demoAdminLoggedIn";
  const KEY_USER = "demoAdminUser";
  const KEY_ROLE = "demoAdminRole";
  const KEY_NOTICE = "demoAdminPermissionNotice";
  const DEMO_NOTIFICATION_LIMIT = 3;

  const DEMO_USERS = {
    admin: { role: "Chef" },
    dispo: { role: "Disposition" },
    billing: { role: "Buchhaltung" },
    fahrer: { role: "Fahrer" },
    werkstatt: { role: "Werkstatt" }
  };

  const ROLE_NAV_ACCESS = {
    Chef: ["Dashboard", "Fahrten", "Fahrer", "Fahrzeuge", "Live-Karte", "Werkstatt", "Kunden", "Rechnungen", "Schichtplanung", "Dokumente", "Statistiken", "Einstellungen", "Benutzer", "Verlauf", "Export & Backup", "Hilfe"],
    Disposition: ["Dashboard", "Fahrten", "Fahrer", "Fahrzeuge", "Live-Karte", "Werkstatt", "Kunden", "Schichtplanung", "Dokumente", "Statistiken", "Einstellungen", "Verlauf", "Export & Backup", "Hilfe"],
    Buchhaltung: ["Dashboard", "Fahrten", "Werkstatt", "Kunden", "Rechnungen", "Dokumente", "Statistiken", "Einstellungen", "Verlauf", "Export & Backup", "Hilfe"],
    Fahrer: ["Dashboard", "Fahrten", "Fahrzeuge", "Live-Karte", "Werkstatt", "Dokumente", "Statistiken", "Einstellungen", "Verlauf", "Hilfe"],
    Werkstatt: ["Dashboard", "Fahrten", "Fahrer", "Fahrzeuge", "Live-Karte", "Werkstatt", "Kunden", "Schichtplanung", "Dokumente", "Statistiken", "Einstellungen"]
  };

  const ROLE_PAGE_ACCESS = {
    "index.html": ["Chef", "Disposition", "Buchhaltung", "Fahrer"],
    "fahrer.html": ["Chef", "Disposition"],
    "fahrzeuge.html": ["Chef", "Disposition", "Fahrer"],
    "live-karte.html": ["Chef", "Disposition", "Fahrer", "Werkstatt"],
    "werkstatt.html": ["Chef", "Disposition", "Buchhaltung", "Fahrer", "Werkstatt"],
    "kunden.html": ["Chef", "Disposition", "Buchhaltung"],
    "rechnungen.html": ["Chef", "Buchhaltung"],
    "schichtplanung.html": ["Chef", "Disposition"],
    "dokumente.html": ["Chef", "Disposition", "Buchhaltung", "Fahrer"],
    "statistiken.html": ["Chef", "Disposition", "Buchhaltung", "Fahrer"],
    "einstellungen.html": ["Chef", "Disposition", "Buchhaltung", "Fahrer"],
    "benutzer.html": ["Chef"],
    "verlauf.html": ["Chef", "Disposition", "Buchhaltung", "Fahrer"],
    "export-backup.html": ["Chef", "Disposition", "Buchhaltung"],
    "hilfe.html": ["Chef", "Disposition", "Buchhaltung", "Fahrer"]
  };

  // Nur Demo-Benachrichtigungen ohne Backend.
  const DEMO_NOTIFICATIONS = [
    {
      id: "demo-tuev",
      title: "TÜV bald fällig",
      text: "Fahrzeug GER TG 404 muss in 12 Tagen zur TÜV-Prüfung.",
      time: "vor 8 Min",
      type: "Warnung",
      category: "Fahrzeuge",
      scope: "Fahrzeuge"
    },
    {
      id: "demo-service",
      title: "Service bald fällig",
      text: "Serviceintervall für GER TG 201 erreicht in 320 km.",
      time: "vor 17 Min",
      type: "Info",
      category: "Fahrzeuge",
      scope: "Fahrzeuge"
    },
    {
      id: "demo-pschein",
      title: "Fahrer-P-Schein läuft bald ab",
      text: "Michael Becker: Verlängerung in 9 Tagen notwendig.",
      time: "vor 26 Min",
      type: "Kritisch",
      category: "Fahrer",
      scope: "Fahrer"
    },
    {
      id: "demo-booking",
      title: "Neue Buchungsanfrage",
      text: "Neue Anfrage aus Bellheim für 14:40 Uhr eingegangen.",
      time: "vor 2 Min",
      type: "Info",
      category: "Fahrten",
      scopes: ["Fahrten", "Kunden"]
    },
    {
      id: "demo-billing-overdue",
      title: "Rechnung überfällig",
      text: "RG-2026-1002 ist seit 5 Tagen überfällig.",
      time: "vor 33 Min",
      type: "Kritisch",
      category: "Rechnungen",
      scope: "Rechnungen"
    },
    {
      id: "demo-shift-open",
      title: "Schicht unbesetzt",
      text: "Spätschicht 18:00-22:00 hat aktuell keine Zuordnung.",
      time: "vor 11 Min",
      type: "Warnung",
      category: "Schichten",
      scope: "Schichten"
    },
    {
      id: "demo-workshop",
      title: "Fahrzeug in Werkstatt",
      text: "GER TG 512 wurde erfolgreich in die Werkstatt übergeben.",
      time: "vor 41 Min",
      type: "Erfolg",
      category: "Fahrzeuge",
      scope: "Fahrzeuge"
    }
  ];

  const ROLE_NOTIFICATION_SCOPES = {
    Chef: ["Fahrten", "Fahrzeuge", "Schichten", "Fahrer", "Rechnungen", "Kunden"],
    Disposition: ["Fahrten", "Fahrzeuge", "Schichten", "Fahrer"],
    Buchhaltung: ["Rechnungen", "Kunden"],
    Fahrer: ["Fahrten", "Fahrzeuge"]
  };

  const SIDEBAR_ITEMS = [
    { key: "Dashboard", href: "index.html#dashboard", label: "Dashboard" },
    { key: "Fahrten", href: "index.html", label: "Fahrten" },
    { key: "Fahrer", href: "fahrer.html", label: "Fahrer" },
    { key: "Fahrzeuge", href: "fahrzeuge.html", label: "Fahrzeuge" },
    { key: "Live-Karte", href: "live-karte.html", label: "Live-Karte" },
    { key: "Werkstatt", href: "werkstatt.html", label: "Werkstatt" },
    { key: "Kunden", href: "kunden.html", label: "Kunden" },
    { key: "Rechnungen", href: "rechnungen.html", label: "Rechnungen" },
    { key: "Schichtplanung", href: "schichtplanung.html", label: "Schichtplanung" },
    { key: "Dokumente", href: "dokumente.html", label: "Dokumente" },
    { key: "Statistiken", href: "statistiken.html", label: "Statistiken" },
    { key: "Einstellungen", href: "einstellungen.html", label: "Einstellungen" },
    { key: "Benutzer", href: "benutzer.html", label: "Benutzer" },
    { key: "Verlauf", href: "verlauf.html", label: "Verlauf" },
    { key: "Export & Backup", href: "export-backup.html", label: "Export & Backup" },
    { key: "Hilfe", href: "hilfe.html", label: "Hilfe" }
  ];

  function normalizePath(pathname) {
    const lower = String(pathname || "").toLowerCase();
    if (lower.endsWith("/")) return "index.html";
    const parts = lower.split("/");
    return parts[parts.length - 1] || "index.html";
  }

  function readLegacySession() {
    try {
      const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function saveSession(user, role) {
    localStorage.setItem(KEY_LOGGED_IN, "true");
    localStorage.setItem(KEY_USER, user);
    localStorage.setItem(KEY_ROLE, role);
    localStorage.setItem(
      LEGACY_STORAGE_KEY,
      JSON.stringify({
        username: user,
        role,
        token: "demo-auth-v2",
        loginAt: new Date().toISOString()
      })
    );
  }

  function clearSession() {
    localStorage.removeItem(KEY_LOGGED_IN);
    localStorage.removeItem(KEY_USER);
    localStorage.removeItem(KEY_ROLE);
    localStorage.removeItem(KEY_NOTICE);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  }

  function readSession() {
    const loggedIn = localStorage.getItem(KEY_LOGGED_IN);
    const user = localStorage.getItem(KEY_USER);
    const role = localStorage.getItem(KEY_ROLE);

    if (loggedIn === "true" && user && role) {
      return { loggedIn, user, role };
    }

    const legacy = readLegacySession();
    if (legacy && legacy.username && DEMO_USERS[legacy.username]) {
      const legacyRole = DEMO_USERS[legacy.username].role;
      saveSession(legacy.username, legacyRole);
      return { loggedIn: "true", user: legacy.username, role: legacyRole };
    }

    return null;
  }

  function isValidSession(session) {
    if (!session || session.loggedIn !== "true") return false;
    const userMeta = DEMO_USERS[session.user];
    if (!userMeta) return false;
    return userMeta.role === session.role;
  }

  function redirectToLogin() {
    window.location.replace("login.html");
  }

  function redirectToDashboardWithNotice(fileName) {
    if (fileName === "benutzer.html") {
      localStorage.setItem(KEY_NOTICE, "Diese Seite ist nur für Chef-Administratoren freigegeben.");
      window.location.replace("index.html");
      return;
    }

    localStorage.setItem(KEY_NOTICE, "Demo-Berechtigung: Diese Seite ist für deine Rolle nicht freigegeben.");
    window.location.replace("index.html");
  }

  function canAccessPage(role, fileName) {
    const allowed = ROLE_PAGE_ACCESS[fileName];
    if (!allowed) return true;
    return allowed.includes(role);
  }

  function getActiveNavKey(fileName) {
    const hash = String(window.location.hash || "").toLowerCase();
    if (fileName === "index.html" && hash === "#dashboard") return "Dashboard";
    if (fileName === "index.html") return "Fahrten";
    if (fileName === "fahrer.html") return "Fahrer";
    if (fileName === "fahrzeuge.html") return "Fahrzeuge";
    if (fileName === "live-karte.html") return "Live-Karte";
    if (fileName === "werkstatt.html") return "Werkstatt";
    if (fileName === "kunden.html") return "Kunden";
    if (fileName === "rechnungen.html") return "Rechnungen";
    if (fileName === "schichtplanung.html") return "Schichtplanung";
    if (fileName === "dokumente.html") return "Dokumente";
    if (fileName === "statistiken.html") return "Statistiken";
    if (fileName === "einstellungen.html") return "Einstellungen";
    if (fileName === "benutzer.html") return "Benutzer";
    if (fileName === "verlauf.html") return "Verlauf";
    if (fileName === "export-backup.html") return "Export & Backup";
    if (fileName === "hilfe.html") return "Hilfe";
    return "";
  }

  function renderUnifiedSidebar(role) {
    const nav = document.querySelector(".admin-nav");
    if (!nav) return;

    const allowedLabels = new Set(ROLE_NAV_ACCESS[role] || []);
    const fileName = normalizePath(window.location.pathname);
    const activeNavKey = getActiveNavKey(fileName);

    const linksHtml = SIDEBAR_ITEMS
      .filter((item) => allowedLabels.has(item.label))
      .map((item) => {
        const isActive = item.key === activeNavKey;
        const activeClass = isActive ? " is-active" : "";
        const ariaCurrent = isActive ? ' aria-current="page"' : "";
        return `<a class="admin-nav-item${activeClass}" href="${item.href}"${ariaCurrent}>${item.label}</a>`;
      })
      .join("");

    nav.innerHTML = `${linksHtml}<button class="admin-nav-item admin-logout-btn" type="button" data-admin-logout>Logout</button>`;
  }

  function setupMobileNavigation() {
    const shell = document.querySelector(".admin-shell");
    const sidebar = document.querySelector(".admin-sidebar");
    const topbarActions = document.querySelector(".admin-topbar-actions");
    if (!shell || !sidebar || !topbarActions) return;

    if (!document.querySelector("[data-admin-menu-toggle]")) {
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "admin-icon-btn admin-menu-toggle";
      toggle.setAttribute("data-admin-menu-toggle", "");
      toggle.setAttribute("aria-label", "Navigation öffnen");
      toggle.innerHTML = "☰";
      topbarActions.prepend(toggle);
    }

    let backdrop = document.querySelector("[data-admin-sidebar-backdrop]");
    if (!backdrop) {
      backdrop = document.createElement("div");
      backdrop.className = "admin-sidebar-backdrop";
      backdrop.setAttribute("data-admin-sidebar-backdrop", "");
      backdrop.hidden = true;
      document.body.append(backdrop);
    }

    function closeSidebar() {
      document.body.classList.remove("admin-sidebar-open");
      backdrop.hidden = true;
    }

    function openSidebar() {
      document.body.classList.add("admin-sidebar-open");
      backdrop.hidden = false;
    }

    document.addEventListener("click", (event) => {
      const toggle = event.target.closest("[data-admin-menu-toggle]");
      if (toggle) {
        event.preventDefault();
        if (document.body.classList.contains("admin-sidebar-open")) {
          closeSidebar();
        } else {
          openSidebar();
        }
        return;
      }

      if (event.target.closest("[data-admin-sidebar-backdrop]")) {
        closeSidebar();
        return;
      }

      const navItem = event.target.closest(".admin-nav-item");
      if (navItem && window.innerWidth <= 1200) {
        closeSidebar();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeSidebar();
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 1200) {
        closeSidebar();
      }
    });
  }

  function applyDemoLoadingState() {
    const main = document.querySelector(".admin-main");
    if (!main) return;
    main.classList.add("admin-main-loading");
    requestAnimationFrame(() => {
      main.classList.remove("admin-main-loading");
    });
  }

  function ensureHeaderConsistency() {
    const titleWrap = document.querySelector(".admin-topbar-title");
    if (!titleWrap) return;
    if (!titleWrap.querySelector("p")) {
      const subtitle = document.createElement("p");
      subtitle.textContent = "Interner Admin-Bereich mit Demo-Daten";
      titleWrap.append(subtitle);
    }
  }

  function getNotificationsForRole(role) {
    const allowedScopes = new Set(ROLE_NOTIFICATION_SCOPES[role] || []);
    return DEMO_NOTIFICATIONS.filter((item) => {
      const scopes = Array.isArray(item.scopes) ? item.scopes : [item.scope];
      return scopes.some((scope) => allowedScopes.has(scope));
    }).map((item) => ({
      ...item,
      read: false
    }));
  }

  function typeClassName(type) {
    const normalized = String(type || "").toLowerCase();
    if (normalized === "warnung") return "is-warning";
    if (normalized === "kritisch") return "is-critical";
    if (normalized === "erfolg") return "is-success";
    return "is-info";
  }

  function scoreType(type) {
    const normalized = String(type || "").toLowerCase();
    if (normalized === "kritisch") return 4;
    if (normalized === "warnung") return 3;
    if (normalized === "info") return 2;
    if (normalized === "erfolg") return 1;
    return 0;
  }

  function renderDashboardHints(main, notifications) {
    if (!main || normalizePath(window.location.pathname) !== "index.html") return;

    let panel = main.querySelector("[data-admin-dashboard-hints]");
    if (!panel) {
      panel = document.createElement("section");
      panel.className = "admin-panel admin-hints-panel";
      panel.setAttribute("data-admin-dashboard-hints", "");
      panel.innerHTML = [
        '<div class="admin-panel-head">',
        '<h2>Aktuelle Hinweise</h2>',
        '<small class="admin-hints-subtitle">Top 3 offene Meldungen</small>',
        "</div>",
        '<div class="admin-hints-list" data-admin-hints-list></div>'
      ].join("");

      const firstPanel = main.querySelector(".admin-panel, .ride-grid, .billing-grid, .customer-grid, .driver-grid, .vehicle-grid, .shift-layout");
      if (firstPanel) {
        main.insertBefore(panel, firstPanel);
      } else {
        main.append(panel);
      }
    }

    const list = panel.querySelector("[data-admin-hints-list]");
    if (!list) return;

    const topOpen = notifications
      .filter((item) => !item.read)
      .sort((a, b) => scoreType(b.type) - scoreType(a.type))
      .slice(0, DEMO_NOTIFICATION_LIMIT);

    if (!topOpen.length) {
      list.innerHTML = '<p class="admin-hints-empty">Keine offenen Hinweise.</p>';
      return;
    }

    list.innerHTML = topOpen
      .map((item) => {
        return [
          `<article class="admin-hint-item ${typeClassName(item.type)}">`,
          `<strong>${item.title}</strong>`,
          `<p>${item.text}</p>`,
          '<div class="admin-hint-meta">',
          `<span>${item.time}</span>`,
          `<span class="admin-hint-category">${item.category}</span>`,
          "</div>",
          "</article>"
        ].join("");
      })
      .join("");
  }

  function setupNotificationCenter(role) {
    const topbar = document.querySelector(".admin-topbar");
    const actions = document.querySelector(".admin-topbar-actions");
    if (!topbar || !actions) return;

    const bellButton = actions.querySelector('button[aria-label="Benachrichtigungen"]');
    if (!bellButton) return;

    bellButton.classList.add("admin-notification-trigger");
    bellButton.setAttribute("aria-haspopup", "true");
    bellButton.setAttribute("aria-expanded", "false");

    const badge = bellButton.querySelector("b") || (() => {
      const node = document.createElement("b");
      bellButton.append(node);
      return node;
    })();

    const notifications = getNotificationsForRole(role);

    let panel = topbar.querySelector("[data-admin-notification-panel]");
    if (!panel) {
      panel = document.createElement("section");
      panel.className = "admin-notification-panel";
      panel.setAttribute("data-admin-notification-panel", "");
      panel.hidden = true;
      panel.innerHTML = [
        '<header class="admin-notification-head">',
        '<div class="admin-notification-head-copy">',
        "<strong>Notification Center</strong>",
        '<small data-admin-notification-open-count></small>',
        "</div>",
        '<button class="admin-btn admin-btn-secondary" type="button" data-admin-notification-read-all>Alle als gelesen</button>',
        "</header>",
        '<div class="admin-notification-list" data-admin-notification-list></div>',
        '<p class="admin-notification-footnote">Demo-Modus: keine Persistenz</p>'
      ].join("");
      topbar.append(panel);
    }

    const countNode = panel.querySelector("[data-admin-notification-open-count]");
    const listNode = panel.querySelector("[data-admin-notification-list]");
    const main = document.querySelector(".admin-main");

    function renderNotificationCenter() {
      const openCount = notifications.filter((item) => !item.read).length;
      badge.textContent = String(openCount);
      badge.hidden = openCount === 0;

      if (countNode) {
        countNode.textContent = `${openCount} offen`;
      }

      if (listNode) {
        if (!notifications.length) {
          listNode.innerHTML = '<p class="admin-notification-empty">Keine Meldungen für diese Rolle.</p>';
        } else {
          listNode.innerHTML = notifications
            .map((item) => {
              const readClass = item.read ? "is-read" : "";
              return [
                `<article class="admin-notification-item ${typeClassName(item.type)} ${readClass}" data-admin-notification-id="${item.id}">`,
                '<div class="admin-notification-row">',
                `<h3>${item.title}</h3>`,
                `<span class="admin-notification-type">${item.type}</span>`,
                "</div>",
                `<p>${item.text}</p>`,
                '<div class="admin-notification-meta">',
                `<span>${item.time}</span>`,
                `<span class="admin-notification-category">${item.category}</span>`,
                "</div>",
                '<div class="admin-notification-actions">',
                `<button class="admin-btn admin-btn-secondary" type="button" data-admin-notification-action="read" data-admin-notification-id="${item.id}">Als gelesen markieren</button>`,
                `<button class="admin-btn admin-btn-secondary" type="button" data-admin-notification-action="details" data-admin-notification-id="${item.id}">Details öffnen Demo</button>`,
                "</div>",
                "</article>"
              ].join("");
            })
            .join("");
        }
      }

      renderDashboardHints(main, notifications);
    }

    function closePanel() {
      panel.hidden = true;
      bellButton.setAttribute("aria-expanded", "false");
    }

    function togglePanel() {
      const open = panel.hidden;
      panel.hidden = !open;
      bellButton.setAttribute("aria-expanded", String(open));
    }

    bellButton.addEventListener("click", (event) => {
      event.preventDefault();
      togglePanel();
    });

    panel.addEventListener("click", (event) => {
      const readAll = event.target.closest("[data-admin-notification-read-all]");
      if (readAll) {
        notifications.forEach((item) => {
          item.read = true;
        });
        renderNotificationCenter();
        return;
      }

      const actionBtn = event.target.closest("[data-admin-notification-action]");
      if (!actionBtn) return;

      const id = actionBtn.getAttribute("data-admin-notification-id");
      const action = actionBtn.getAttribute("data-admin-notification-action");
      const item = notifications.find((entry) => entry.id === id);
      if (!item) return;

      if (action === "read") {
        item.read = true;
        renderNotificationCenter();
        return;
      }

      if (action === "details") {
        item.read = true;
        window.alert(`Demo-Details: ${item.title}\n${item.text}`);
        renderNotificationCenter();
      }
    });

    document.addEventListener("click", (event) => {
      if (panel.hidden) return;
      if (event.target.closest("[data-admin-notification-panel]")) return;
      if (event.target.closest(".admin-notification-trigger")) return;
      closePanel();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closePanel();
      }
    });

    renderNotificationCenter();
  }

  function renderRoleIndicator(role) {
    const topbarActions = document.querySelector(".admin-topbar-actions");
    if (!topbarActions || topbarActions.querySelector("[data-admin-role-indicator]")) return;

    const badge = document.createElement("div");
    badge.className = "admin-role-indicator";
    badge.setAttribute("data-admin-role-indicator", "");
    badge.textContent = `Angemeldet als: ${role}`;
    topbarActions.prepend(badge);
  }

  function renderPermissionNotice() {
    const notice = localStorage.getItem(KEY_NOTICE);
    if (!notice) return;

    const main = document.querySelector(".admin-main");
    if (!main) return;

    const noteNode = document.createElement("article");
    noteNode.className = "admin-permission-note";
    noteNode.textContent = notice;
    main.prepend(noteNode);
    localStorage.removeItem(KEY_NOTICE);
  }

  function logout() {
    clearSession();
    redirectToLogin();
  }

  function bindLogout() {
    document.addEventListener("click", (event) => {
      const trigger = event.target.closest("[data-admin-logout]");
      if (!trigger) return;
      event.preventDefault();
      logout();
    });
  }

  function protectCurrentPage() {
    const fileName = normalizePath(window.location.pathname);
    if (fileName === "login.html") return { role: null, user: null, protected: false };

    const session = readSession();
    if (!isValidSession(session)) {
      redirectToLogin();
      return { role: null, user: null, protected: true };
    }

    if (!canAccessPage(session.role, fileName)) {
      redirectToDashboardWithNotice(fileName);
      return { role: session.role, user: session.user, protected: true };
    }

    return { role: session.role, user: session.user, protected: true };
  }

  const protectionState = protectCurrentPage();

  document.addEventListener("DOMContentLoaded", () => {
    if (!protectionState.protected) return;

    applyDemoLoadingState();
    ensureHeaderConsistency();
    bindLogout();
    if (protectionState.role) {
      renderUnifiedSidebar(protectionState.role);
      renderRoleIndicator(protectionState.role);
      setupNotificationCenter(protectionState.role);
      setupMobileNavigation();
    }
    renderPermissionNotice();
  });

  window.AdminDemoAuth = {
    keys: {
      loggedIn: KEY_LOGGED_IN,
      user: KEY_USER,
      role: KEY_ROLE
    },
    users: DEMO_USERS,
    readSession,
    isValidSession,
    saveSession,
    logout
  };
})();
