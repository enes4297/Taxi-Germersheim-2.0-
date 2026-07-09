// Nur Demo-Login. Kein echter Zugriffsschutz ohne Backend.
(() => {
  const STORAGE_KEY = "taxiAdminDemoSession";
  const SESSION_TOKEN = "demo-auth-v1";
  const DEMO_USERNAME = "admin";
  const DEMO_PASSWORD = "Taxi2026!";

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
      && session.username === DEMO_USERNAME
      && session.token === SESSION_TOKEN
    );
  }

  function setError(message) {
    const errorNode = document.querySelector("[data-login-error]");
    if (!errorNode) return;

    errorNode.hidden = !message;
    errorNode.textContent = message;
  }

  function createDemoSession(username) {
    const payload = {
      username,
      token: SESSION_TOKEN,
      loginAt: new Date().toISOString()
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
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

      if (username !== DEMO_USERNAME || password !== DEMO_PASSWORD) {
        setError("Login fehlgeschlagen. Bitte Demo-Zugang prüfen.");
        return;
      }

      setError("");
      createDemoSession(username);
      redirectToAdmin();
    });
  }

  if (isValidSession(readSession())) {
    redirectToAdmin();
  } else {
    bindLogin();
  }
})();
