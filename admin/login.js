// Nur Demo-Rollen. Kein echter Zugriffsschutz ohne Backend.
(() => {
  const KEY_LOGGED_IN = "demoAdminLoggedIn";
  const KEY_USER = "demoAdminUser";
  const KEY_ROLE = "demoAdminRole";
  const LEGACY_STORAGE_KEY = "taxiAdminDemoSession";
  const KEY_LOGIN_REMEMBER = "demoAdminRememberLogin";

  const DEMO_USERS = {
    admin: { password: "Taxi2026!", role: "Chef" },
    enes: { password: "Enes2026!", role: "Chef" },
    fatih: { password: "Fatih2026!", role: "Chef" },
    geschaeft: { password: "Leitung2026!", role: "Geschaeftsleitung" },
    dispo: { password: "Dispo2026!", role: "Disposition" },
    disponent: { password: "Dispo2026!", role: "Disposition" },
    billing: { password: "Rechnung2026!", role: "Buchhaltung" },
    abrechnung: { password: "Rechnung2026!", role: "Buchhaltung" },
    fahrer: { password: "Fahrer2026!", role: "Fahrer" },
    personal: { password: "Personal2026!", role: "Personalverwaltung" },
    qualitaet: { password: "Quali2026!", role: "Qualitaetsmanagement" },
    mitarbeiter: { password: "Mitarbeiter2026!", role: "Mitarbeiter" }
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

  function redirectToAdmin(role) {
    const roleTarget = {
      Geschaeftsleitung: "geschaeftsfuehrer-dashboard.html",
      Disposition: "live-dispo.html",
      Personalverwaltung: "personaluebersicht.html",
      Buchhaltung: "abrechnungszentrale.html"
    };

    const target = roleTarget[role];
    if (target) {
      window.location.replace(target);
      return;
    }

    if (role === "Geschaeftsleitung") {
      window.location.replace("geschaeftsfuehrer-dashboard.html");
      return;
    }
    window.location.replace("index.html");
  }

  function togglePasswordVisibility() {
    const input = document.querySelector("#admin-password");
    const button = document.querySelector("[data-login-toggle-password]");
    if (!input || !button) return;

    const isVisible = input.type === "text";
    input.type = isVisible ? "password" : "text";
    button.textContent = isVisible ? "Anzeigen" : "Verbergen";
  }

  function isVeryWeakPin(pin) {
    return ["0000", "1111", "1234", "2222", "3333", "4444", "5555", "6666", "7777", "8888", "9999"].includes(pin);
  }

  function openRecoveryModal(flow = "password") {
    const modal = document.querySelector("[data-recovery-modal]");
    const title = document.querySelector("[data-recovery-title]");
    const body = document.querySelector("[data-recovery-body]");
    const foot = document.querySelector("[data-recovery-foot]");
    if (!modal || !title || !body || !foot) return;

    const state = {
      flow,
      step: 1,
      identifier: "",
      demoCodeEnabled: false
    };

    const focusFirstInput = () => {
      const firstInput = body.querySelector("input, select, button");
      if (firstInput) firstInput.focus();
    };

    const render = () => {
      if (state.step === 1) {
        title.textContent = "Zugang wiederherstellen";
        body.innerHTML = `
          <div class="admin-recovery-grid">
            <p>Wählen Sie den passenden Vorgang.</p>
            <label><input type="radio" name="recoverType" value="password" ${state.flow === "password" ? "checked" : ""}> Passwort/PIN vergessen</label>
            <label><input type="radio" name="recoverType" value="username" ${state.flow === "username" ? "checked" : ""}> Benutzername vergessen</label>
            <label><input type="radio" name="recoverType" value="access" ${state.flow === "access" ? "checked" : ""}> Zugang gesperrt</label>
            <label><input type="radio" name="recoverType" value="mail" ${state.flow === "mail" ? "checked" : ""}> Keine E-Mail erhalten</label>
            <p class="admin-login-hint">Aus Sicherheitsgründen wird niemals angezeigt, ob ein Konto existiert.</p>
          </div>
        `;
        foot.innerHTML = '<button class="admin-btn admin-btn-secondary" type="button" data-recovery-close>Abbrechen</button><button class="admin-btn" type="button" data-recovery-next>Weiter</button>';
        focusFirstInput();
        return;
      }

      if (state.step === 2) {
        title.textContent = "Identifikation";
        body.innerHTML = `
          <div class="admin-recovery-grid">
            <label>E-Mail-Adresse
              <input class="driver-search-input" type="email" data-recovery-email placeholder="name@firma.de">
            </label>
            <label>Benutzername
              <input class="driver-search-input" type="text" data-recovery-user placeholder="z. B. dispo">
            </label>
            <label>Mitarbeiter-ID
              <input class="driver-search-input" type="text" data-recovery-staff placeholder="z. B. MA-102">
            </label>
            <p class="admin-login-hint">Telefonnummer optional nur als Demo-Hinweis. Keine echte Zustellung.</p>
          </div>
        `;
        foot.innerHTML = '<button class="admin-btn admin-btn-secondary" type="button" data-recovery-prev>Zurück</button><button class="admin-btn" type="button" data-recovery-next>Weiter</button>';
        focusFirstInput();
        return;
      }

      if (state.step === 3) {
        title.textContent = "Bestätigung";
        body.innerHTML = `
          <div class="admin-recovery-grid">
            <p>Falls ein passendes Konto vorhanden ist, wurde eine Nachricht an die hinterlegte E-Mail-Adresse vorbereitet.</p>
            <p class="admin-login-hint">Demo-Funktion: Keine echte E-Mail wird gesendet.</p>
            ${state.flow === "password" ? '<label><input type="checkbox" data-recovery-demo-code> Demo-Code-Eingabe anzeigen</label>' : ""}
          </div>
        `;
        foot.innerHTML = `<button class="admin-btn admin-btn-secondary" type="button" data-recovery-prev>Zurück</button>${state.flow === "password" ? '<button class="admin-btn" type="button" data-recovery-next>PIN zurücksetzen</button>' : '<button class="admin-btn" type="button" data-recovery-close>Zur Anmeldung</button>'}`;
        focusFirstInput();
        return;
      }

      title.textContent = "PIN zurücksetzen (Demo)";
      body.innerHTML = `
        <div class="admin-recovery-grid">
          ${state.demoCodeEnabled ? '<label>Demo-Code<input class="driver-search-input" type="text" data-recovery-code placeholder="000000"></label>' : ""}
          <label>Neue PIN
            <input class="driver-search-input" type="password" data-recovery-pin placeholder="Mindestens 4 Zeichen">
          </label>
          <label>PIN bestätigen
            <input class="driver-search-input" type="password" data-recovery-pin-confirm placeholder="PIN wiederholen">
          </label>
          <p class="admin-login-hint">Demo-Funktion: Echte sichere Wiederherstellung folgt mit Backend, Benutzerverwaltung und E-Mail-Dienst.</p>
          <p class="admin-login-error" data-recovery-error hidden></p>
        </div>
      `;
      foot.innerHTML = '<button class="admin-btn admin-btn-secondary" type="button" data-recovery-prev>Zurück</button><button class="admin-btn" type="button" data-recovery-finish>Zurücksetzen abschließen</button>';
      focusFirstInput();
    };

    const close = () => {
      modal.hidden = true;
    };

    const onClick = (event) => {
      const closeBtn = event.target.closest("[data-recovery-close]");
      if (closeBtn) {
        close();
        return;
      }

      const prevBtn = event.target.closest("[data-recovery-prev]");
      if (prevBtn) {
        state.step = Math.max(1, state.step - 1);
        render();
        return;
      }

      const nextBtn = event.target.closest("[data-recovery-next]");
      if (nextBtn) {
        if (state.step === 1) {
          const selected = body.querySelector('input[name="recoverType"]:checked');
          state.flow = selected ? selected.value : "password";
        }
        if (state.step === 3 && state.flow === "password") {
          state.demoCodeEnabled = Boolean(body.querySelector("[data-recovery-demo-code]")?.checked);
        }
        state.step = Math.min(4, state.step + 1);
        render();
        return;
      }

      const finishBtn = event.target.closest("[data-recovery-finish]");
      if (!finishBtn) return;

      const pin = String(body.querySelector("[data-recovery-pin]")?.value || "").trim();
      const pinConfirm = String(body.querySelector("[data-recovery-pin-confirm]")?.value || "").trim();
      const err = body.querySelector("[data-recovery-error]");
      if (!err) return;

      if (pin.length < 4) {
        err.hidden = false;
        err.textContent = "PIN muss mindestens 4 Zeichen haben.";
        return;
      }
      if (pin !== pinConfirm) {
        err.hidden = false;
        err.textContent = "PIN und Bestätigung stimmen nicht überein.";
        return;
      }
      if (isVeryWeakPin(pin)) {
        err.hidden = false;
        err.textContent = "Bitte eine weniger einfache PIN verwenden.";
        return;
      }

      body.innerHTML = `
        <div class="admin-recovery-grid">
          <p>Die Demo-Wiederherstellung wurde abgeschlossen.</p>
          <p>Es wurde keine echte Passwort- oder PIN-Änderung durchgeführt.</p>
          <p class="admin-login-hint">Bitte melden Sie sich jetzt wieder an.</p>
        </div>
      `;
      foot.innerHTML = '<button class="admin-btn" type="button" data-recovery-close>Zur Anmeldung</button>';
    };

    modal.hidden = false;
    render();

    const onKeydown = (event) => {
      if (event.key !== "Escape") return;
      if (modal.hidden) return;
      close();
    };

    const cleanup = () => {
      modal.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKeydown);
    };

    modal.addEventListener("click", onClick);
    document.addEventListener("keydown", onKeydown);

    const observer = new MutationObserver(() => {
      if (!modal.hidden) return;
      cleanup();
      observer.disconnect();
    });
    observer.observe(modal, { attributes: true, attributeFilter: ["hidden"] });
  }

  function bindRecoveryLinks() {
    document.addEventListener("click", (event) => {
      const trigger = event.target.closest("[data-recovery-open]");
      if (!trigger) return;
      const flow = trigger.getAttribute("data-recovery-open") || "password";
      openRecoveryModal(flow);
    });
  }

  function bindLogin() {
    const form = document.querySelector("[data-login-form]");
    if (!form) return;

    const toggleButton = document.querySelector("[data-login-toggle-password]");
    if (toggleButton) {
      toggleButton.addEventListener("click", togglePasswordVisibility);
    }

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

      const remember = Boolean(form.querySelector("[data-login-remember]")?.checked);
      localStorage.setItem(KEY_LOGIN_REMEMBER, remember ? "true" : "false");

      setError("");
      createDemoSession(username, user.role);
      redirectToAdmin(user.role);
    });
  }

  if (isValidSession(readSession())) {
    redirectToAdmin((readSession() || {}).role || "");
  } else {
    if (window.AdminUiText) {
      window.AdminUiText.normalizeDocument(document);
      window.AdminUiText.observeDocument(document);
    }
    bindLogin();
    bindRecoveryLinks();
  }
})();
