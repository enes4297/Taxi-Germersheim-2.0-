(() => {
  const ITEMS = [
    { key: "Dashboard", href: "geschaeftsfuehrer-dashboard.html" },
    { key: "Fahrten", href: "index.html" },
    { key: "Fahrer", href: "fahrer.html" },
    { key: "Kunden", href: "kunden.html" },
    { key: "Rewards", href: "rewards.html" },
    { key: "Rechnungen", href: "rechnungen.html" },
    { key: "Schichtplanung", href: "schichtplanung.html" },
    { key: "Fahrzeuge", href: "fahrzeuge.html" },
    { key: "Statistiken", href: "statistiken.html" },
    { key: "Einstellungen", href: "einstellungen.html" },
    { key: "Termin-Cockpit", href: "termin-cockpit.html" }
  ];

  const ACTIVE_KEY_BY_FILE = {
    "geschaeftsfuehrer-dashboard.html": "Dashboard",
    "index.html": "Fahrten",
    "fahrer.html": "Fahrer",
    "kunden.html": "Kunden",
    "rewards.html": "Rewards",
    "rechnungen.html": "Rechnungen",
    "schichtplanung.html": "Schichtplanung",
    "fahrzeuge.html": "Fahrzeuge",
    "statistiken.html": "Statistiken",
    "einstellungen.html": "Einstellungen",
    "termin-cockpit.html": "Termin-Cockpit"
  };

  let sidebarObserver = null;

  function currentFileName() {
    const path = String(window.location.pathname || "").replace(/\\/g, "/");
    return path.split("/").pop().toLowerCase() || "index.html";
  }

  function sidebarHtml() {
    const activeKey = ACTIVE_KEY_BY_FILE[currentFileName()] || "";
    const links = ITEMS.map((item) => {
      const isActive = item.key === activeKey;
      return `<a class="admin-nav-item${isActive ? " is-active" : ""}" href="${item.href}"${isActive ? ' aria-current="page"' : ""}>${item.key}</a>`;
    }).join("");

    return `${links}<button class="admin-nav-item admin-logout-btn" type="button" data-admin-logout>Logout</button>`;
  }

  function renderSidebar() {
    const nav = document.querySelector("[data-admin-sidebar]");
    if (!nav) return;

    const html = sidebarHtml();
    if (nav.innerHTML !== html) nav.innerHTML = html;
  }

  function observeSidebar() {
    const nav = document.querySelector("[data-admin-sidebar]");
    if (!nav || sidebarObserver) return;

    sidebarObserver = new MutationObserver(() => {
      if (nav.querySelector("[data-admin-nav-group]") || nav.querySelectorAll(":scope > .admin-nav-item").length !== ITEMS.length + 1) {
        renderSidebar();
      }
    });
    sidebarObserver.observe(nav, { childList: true, subtree: true });
  }

  function initializeSidebar() {
    renderSidebar();
    observeSidebar();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeSidebar, { once: true });
  } else {
    initializeSidebar();
  }

  window.addEventListener("pageshow", renderSidebar);
})();
