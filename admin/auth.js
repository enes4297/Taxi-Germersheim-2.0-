// Nur Demo-Login. Kein echter Zugriffsschutz ohne Backend.
(() => {
  const STORAGE_KEY = "taxiAdminDemoSession";
  const SESSION_TOKEN = "demo-auth-v1";

  function readSession() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function isValidSession(session) {
    return Boolean(
      session
      && session.username === "admin"
      && session.token === SESSION_TOKEN
    );
  }

  function redirectToLogin() {
    window.location.replace("login.html");
  }

  function protectCurrentPage() {
    const path = window.location.pathname.toLowerCase();
    const isLoginPage = path.endsWith("/login.html") || path.endsWith("login.html");
    if (isLoginPage) return;

    const session = readSession();
    if (!isValidSession(session)) {
      redirectToLogin();
    }
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    redirectToLogin();
  }

  function ensureLogoutButton() {
    const nav = document.querySelector(".admin-nav");
    if (!nav) return;
    if (nav.querySelector("[data-admin-logout]")) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "admin-nav-item admin-logout-btn";
    button.setAttribute("data-admin-logout", "");
    button.textContent = "Logout";
    nav.append(button);
  }

  function bindLogout() {
    document.addEventListener("click", (event) => {
      const trigger = event.target.closest("[data-admin-logout]");
      if (!trigger) return;
      event.preventDefault();
      logout();
    });
  }

  protectCurrentPage();

  document.addEventListener("DOMContentLoaded", () => {
    ensureLogoutButton();
    bindLogout();
  });

  window.AdminDemoAuth = {
    storageKey: STORAGE_KEY,
    sessionToken: SESSION_TOKEN,
    readSession,
    isValidSession,
    logout
  };
})();
