(() => {
  const STORAGE_KEY = "tgEmployeeDemoSession";
  const loginForm = document.querySelector("[data-employee-login-form]");
  const messageNode = document.querySelector("[data-login-message]");

  function saveSession(username, remember) {
    const session = {
      authenticated: true,
      employeeId: "MA-101",
      username: username || "demo",
      provider: "demo",
      remember: Boolean(remember)
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }

  function setMessage(text, kind = "info") {
    if (!messageNode) return;
    messageNode.textContent = text;
    messageNode.hidden = false;
    messageNode.className = `driver-login-message ${kind === "error" ? "is-error" : "is-info"}`;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!loginForm) return;

    const formData = new FormData(loginForm);
    const username = String(formData.get("username") || "").trim();
    const password = String(formData.get("password") || "").trim();
    const remember = Boolean(formData.get("remember"));

    if (!username || !password) {
      setMessage("Bitte Benutzername und Passwort eingeben.", "error");
      return;
    }

    if (username === "demo" && password === "demo") {
      saveSession(username, remember);
      window.location.assign("mitarbeiter.html");
      return;
    }

    saveSession(username, remember);
    window.location.assign("mitarbeiter.html");
  }

  if (loginForm) {
    loginForm.addEventListener("submit", handleSubmit);
  }
})();
