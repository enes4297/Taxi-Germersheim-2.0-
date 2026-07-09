// Nur Demo-Rollen. Kein echter Zugriffsschutz ohne Backend.
(() => {
  const KEY_LOGGED_IN = "demoAdminLoggedIn";
  const KEY_USER = "demoAdminUser";
  const KEY_ROLE = "demoAdminRole";
  const LEGACY_STORAGE_KEY = "taxiAdminDemoSession";

  const DEMO_USERS = {
    admin: { password: "Taxi2026!", role: "Chef" },
    dispo: { password: "Dispo2026!", role: "Disposition" },
    billing: { password: "Rechnung2026!", role: "Buchhaltung" },
    fahrer: { password: "Fahrer2026!", role: "Fahrer" }
  };

  function readSession() {
    const loggedIn = localStorage.getItem(KEY_LOGGED_IN);
    const user = localStorage.getItem(KEY_USER);
    const role = localStorage.getItem(KEY_ROLE);
    if (loggedIn !== "true" || !user || !role) return null;
    return { loggedIn, user, role };
  }

  function isValidSession(session) {
    if (!session || session.loggedIn !== "true") return false;
    const user = DEMO_USERS[session.user];
    if (!user) return false;
    return user.role === session.role;
  }

  function setError(message) {
    const errorNode = document.querySelector("[data-login-error]");
    if (!errorNode) return;

    errorNode.hidden = !message;
    errorNode.textContent = message;
  }

  function createDemoSession(username, role) {
    localStorage.setItem(KEY_LOGGED_IN, "true");
    localStorage.setItem(KEY_USER, username);
    localStorage.setItem(KEY_ROLE, role);

    localStorage.setItem(
      LEGACY_STORAGE_KEY,
      JSON.stringify({
        username,
        role,
        token: "demo-auth-v2",
        loginAt: new Date().toISOString()
      })
    );
  }

  function redirectToAdmin() {
    window.location.replace("index.html");
  }

  function bindLogin() {
    const form = document.querySelector("[data-login-form]");
    if (!form) return;

    form.addEventListener("submit", (event) => {
      event.preventDefault();

      const formData = new FormData(form);
      const username = String(formData.get("username") || "").trim();
      const password = String(formData.get("password") || "");
      const user = DEMO_USERS[username];

      if (!user || user.password !== password) {
        setError("Login fehlgeschlagen. Bitte Demo-Zugang prüfen.");
        return;
      }

      setError("");
      createDemoSession(username, user.role);
      redirectToAdmin();
    });
  }

  if (isValidSession(readSession())) {
    redirectToAdmin();
  } else {
    bindLogin();
  }
})();
