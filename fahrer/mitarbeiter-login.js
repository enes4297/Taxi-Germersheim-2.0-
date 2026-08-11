(() => {
  "use strict";

  const DEMO_SESSION_KEY = "tgEmployeeDemoSession";
  const loginForm = document.querySelector("[data-employee-login-form]");
  const messageNode = document.querySelector("[data-login-message]");
  const demoHintNode = document.querySelector("[data-demo-hint]");

  /* ------------------------------------------------------------------ */
  /* UI-Hilfsfunktionen                                                  */
  /* ------------------------------------------------------------------ */

  function setMessage(text, kind = "info") {
    if (!messageNode) return;
    messageNode.textContent = text;
    messageNode.hidden = false;
    messageNode.className = "demo-note" + (kind === "error" ? " is-error" : "");
  }

  function clearMessage() {
    if (!messageNode) return;
    messageNode.hidden = true;
    messageNode.textContent = "";
  }

  function setLoading(loading) {
    const btn = loginForm?.querySelector('[type="submit"]');
    if (!btn) return;
    btn.disabled = loading;
    btn.textContent = loading ? "Anmeldung läuft …" : "Anmelden";
  }

  /* ------------------------------------------------------------------ */
  /* Demo-Fallback (nur wenn Supabase NICHT konfiguriert ist)           */
  /* ------------------------------------------------------------------ */

  function saveDemoSession() {
    localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify({
      authenticated: true,
      provider: "demo",
      employeeId: "MA-101"
    }));
  }

  function handleDemoLogin(identifier, password) {
    if (identifier === "demo" && password === "demo") {
      saveDemoSession();
      window.location.assign("mitarbeiter.html");
    } else {
      setMessage("Benutzername oder Passwort falsch.", "error");
    }
  }

  /* ------------------------------------------------------------------ */
  /* Supabase-Login                                                      */
  /* ------------------------------------------------------------------ */

  async function handleSupabaseLogin(email, password) {
    setLoading(true);
    clearMessage();
    try {
      await window.EmployeeSupabase.signIn(email, password);
      /* Supabase verwahrt die Session selbst (localStorage via GoTrueClient). */
      /* Nur ein minimaler Marker für den Reload-Schutz. */
      localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify({
        authenticated: true,
        provider: "supabase"
      }));
      window.location.assign("mitarbeiter.html");
    } catch (err) {
      setLoading(false);
      setMessage(err.message || "Anmeldung fehlgeschlagen.", "error");
    }
  }

  /* ------------------------------------------------------------------ */
  /* Formular-Listener                                                   */
  /* ------------------------------------------------------------------ */

  async function handleSubmit(event) {
    event.preventDefault();
    if (!loginForm) return;

    const formData = new FormData(loginForm);
    const emailOrUser = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "").trim();

    if (!emailOrUser || !password) {
      setMessage("Bitte E-Mail-Adresse und Passwort eingeben.", "error");
      return;
    }

    const ES = window.EmployeeSupabase;

    if (ES && ES.isConfigured()) {
      /* Supabase ist konfiguriert – echter Login, kein Demo-Fallback */
      await handleSupabaseLogin(emailOrUser, password);
    } else {
      /* Supabase nicht konfiguriert – Demo-Modus für lokale Entwicklung */
      handleDemoLogin(emailOrUser, password);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Init                                                                */
  /* ------------------------------------------------------------------ */

  document.addEventListener("DOMContentLoaded", () => {
    const ES = window.EmployeeSupabase;
    if (ES && ES.isConfigured()) {
      /* Demo-Hinweis ausblenden, wenn Supabase aktiv */
      if (demoHintNode) demoHintNode.hidden = true;

      /* E-Mail-Feld-Label anpassen */
      const emailInput = loginForm?.querySelector('[name="email"]');
      if (emailInput) emailInput.placeholder = "mitarbeiter@taxi-germersheim.de";
    } else {
      /* Demo-Modus: Hinweis zeigen */
      if (demoHintNode) demoHintNode.hidden = false;
    }

    if (loginForm) {
      loginForm.addEventListener("submit", handleSubmit);
    }
  });
})();
