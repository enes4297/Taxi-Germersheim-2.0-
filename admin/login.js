// Nur Demo-Rollen. Kein echter Zugriffsschutz ohne Backend.
(() => {
  const DEMO_AUTH_KEYS = [
    "demoAdminLoggedIn",
    "demoAdminUser",
    "demoAdminRole",
    "demo-auth-v2",
    "taxiAdminDemoSession",
    "demoAdminRememberLogin",
    "demoAdminPermissionNotice"
  ];

  function cleanupLegacyDemoAuthKeys() {
    DEMO_AUTH_KEYS.forEach((key) => localStorage.removeItem(key));
  }

  function isValidAdminProfile(profile) {
    return Boolean(profile && profile.active === true && ["admin", "dispatcher"].includes(profile.role));
  }

  async function ensureAuthBridge() {
    if (window.TaxiSupabaseAuth && typeof window.TaxiSupabaseAuth.signInWithPassword === "function") {
      return window.TaxiSupabaseAuth;
    }

    const existingScript = document.querySelector('script[src$="supabase-auth.js"]');
    if (existingScript) {
      await new Promise((resolve) => {
        existingScript.addEventListener("load", () => resolve(), { once: true });
      });
      return window.TaxiSupabaseAuth;
    }

    const script = document.createElement("script");
    script.src = "supabase-auth.js";
    script.async = false;
    script.onload = () => {};
    script.onerror = () => {};
    document.head.appendChild(script);

    await new Promise((resolve) => {
      script.addEventListener("load", () => resolve(), { once: true });
      script.addEventListener("error", () => resolve(), { once: true });
    });

    return window.TaxiSupabaseAuth;
  }

  async function loginWithSupabase(username, password) {
    cleanupLegacyDemoAuthKeys();
    const authBridge = await ensureAuthBridge();
    const supabaseConfigured = Boolean(window.TaxiSupabaseConfig?.isConfigured === true);

    if (!supabaseConfigured || !authBridge || typeof authBridge.signInWithPassword !== "function") {
      setError("Supabase Auth ist derzeit nicht verfügbar. Bitte Zugangsdaten prüfen oder später erneut versuchen.");
      return false;
    }

    try {
      const result = await authBridge.signInWithPassword({ email: username, password });
      const session = result?.session;
      const user = result?.user;
      const profile = result?.profile;

      if (!session || !user) {
        throw new Error("Keine gültige Supabase-Session nach der Anmeldung.");
      }

      if (!isValidAdminProfile(profile)) {
        throw new Error("Zugriff verweigert. Nur aktive Admins oder Dispatcher dürfen sich anmelden.");
      }

      window.location.replace("index.html");
      return true;
    } catch (error) {
      const message = (error && error.message) || "E-Mail oder Passwort ist nicht korrekt.";
      if (message.toLowerCase().includes("zugriff verweigert") || message.toLowerCase().includes("nur aktive admins") || message.toLowerCase().includes("nur berechtigte")) {
        setError("Zugriff verweigert. Nur aktive Admins oder Dispatcher dürfen sich anmelden.");
      } else {
        setError("E-Mail oder Passwort ist nicht korrekt.");
      }
      console.error("Supabase-Admin-Login fehlgeschlagen.", message);
      return false;
    }
  }

  function setError(message) {
    const errorNode = document.querySelector("[data-login-error]");
    if (!errorNode) return;

    errorNode.hidden = !message;
    errorNode.textContent = message;
  }

  function redirectToAdmin() {
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

  function parseRecoveryHash() {
    const raw = window.location.hash || "";
    if (!raw) return null;
    const hash = raw.startsWith("#") ? raw.slice(1) : raw;
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const type = params.get("type");
    if (type === "recovery" && accessToken && refreshToken) {
      return { accessToken, refreshToken };
    }
    return null;
  }

  function toggleRecoveryMode(isRecovery) {
    const form = document.querySelector("[data-login-form]");
    const card = document.querySelector(".admin-login-card");
    if (!card) return;

    const existingRecovery = card.querySelector("[data-recovery-password-form]");
    if (existingRecovery) {
      existingRecovery.hidden = !isRecovery;
    }

    if (form) {
      form.hidden = isRecovery;
    }

    const heading = card.querySelector(".admin-login-head h1");
    const sub = card.querySelector(".admin-login-head p");
    if (heading && isRecovery) {
      heading.textContent = "Neues Passwort festlegen";
    }
    if (sub && isRecovery) {
      sub.textContent = "Bitte legen Sie ein neues Admin-Passwort fest.";
    }

    if (!existingRecovery && isRecovery) {
      const recoveryTemplate = document.createElement("div");
      recoveryTemplate.setAttribute("data-recovery-password-form", "");
      recoveryTemplate.innerHTML = `
        <div class="admin-recovery-password-wrap" style="margin-top: 1.25rem;">
          <div class="admin-login-error" data-recovery-password-error hidden></div>
          <form class="admin-login-form" data-admin-password-reset-form novalidate>
            <label for="admin-new-password">Neues Passwort</label>
            <input id="admin-new-password" name="newPassword" type="password" autocomplete="new-password" required>

            <label for="admin-new-password-confirm">Passwort wiederholen</label>
            <input id="admin-new-password-confirm" name="confirmPassword" type="password" autocomplete="new-password" required>

            <button class="admin-btn" type="submit">Passwort speichern</button>
          </form>
        </div>
      `;
      card.appendChild(recoveryTemplate);

      const resetForm = recoveryTemplate.querySelector("[data-admin-password-reset-form]");
      if (resetForm) {
        resetForm.addEventListener("submit", async (event) => {
          event.preventDefault();
          const fd = new FormData(resetForm);
          const newPassword = String(fd.get("newPassword") || "").trim();
          const confirmPassword = String(fd.get("confirmPassword") || "").trim();
          const errorNode = recoveryTemplate.querySelector("[data-recovery-password-error]");

          if (!newPassword || !confirmPassword) {
            if (errorNode) {
              errorNode.hidden = false;
              errorNode.textContent = "Bitte beide Felder ausfüllen.";
            }
            return;
          }

          if (newPassword.length < 8) {
            if (errorNode) {
              errorNode.hidden = false;
              errorNode.textContent = "Das Passwort muss mindestens 8 Zeichen lang sein.";
            }
            return;
          }

          if (newPassword !== confirmPassword) {
            if (errorNode) {
              errorNode.hidden = false;
              errorNode.textContent = "Die Passwörter stimmen nicht überein.";
            }
            return;
          }

          try {
            const authBridge = await ensureAuthBridge();
            const client = authBridge && typeof authBridge.getClient === "function" ? await authBridge.getClient() : null;
            if (!client) {
              throw new Error("Supabase Auth ist nicht verfügbar.");
            }

            const { error } = await client.auth.updateUser({ password: newPassword });
            if (error) {
              console.error("Recovery-UpdateUser fehlgeschlagen.", error.message);
              if (errorNode) {
                errorNode.hidden = false;
                errorNode.textContent = "Der Link ist ungültig oder abgelaufen. Bitte fordere einen neuen Link an.";
              }
              return;
            }

            if (errorNode) {
              errorNode.hidden = false;
              errorNode.classList.add("is-success");
              errorNode.textContent = "✓ Passwort wurde erfolgreich geändert.";
            }

            setTimeout(() => {
              window.location.href = "login.html";
            }, 1200);
          } catch (error) {
            console.error("Recovery-UpdateUser fehlgeschlagen.", error?.message || error);
            if (errorNode) {
              errorNode.hidden = false;
              errorNode.textContent = "Der Link ist ungültig oder abgelaufen. Bitte fordere einen neuen Link an.";
            }
          }
        });
      }
    }
  }

  async function initRecoveryMode() {
    const authBridge = await ensureAuthBridge();
    const client = authBridge && typeof authBridge.getClient === "function" ? await authBridge.getClient() : null;
    if (!client) {
      return false;
    }

    const recoveryTokens = parseRecoveryHash();
    if (recoveryTokens) {
      try {
        const { data, error } = await client.auth.setSession({
          access_token: recoveryTokens.accessToken,
          refresh_token: recoveryTokens.refreshToken
        });

        if (!error && data?.session) {
          toggleRecoveryMode(true);
          return true;
        }
      } catch (error) {
        console.error("Recovery-Session konnte nicht gesetzt werden.", error?.message || error);
      }

      toggleRecoveryMode(true);
      return true;
    }

    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (!sessionError && sessionData?.session && window.location.hash.includes("type=recovery")) {
      toggleRecoveryMode(true);
      return true;
    }

    toggleRecoveryMode(false);
    return false;
  }

  function bindLogin() {
    const form = document.querySelector("[data-login-form]");
    if (!form) return;

    const toggleButton = document.querySelector("[data-login-toggle-password]");
    if (toggleButton) {
      toggleButton.addEventListener("click", togglePasswordVisibility);
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const formData = new FormData(form);
      const username = String(formData.get("username") || "").trim();
      const password = String(formData.get("password") || "");

      if (!username || !password) {
        setError("Bitte E-Mail und Passwort eingeben.");
        return;
      }

      setError("");
      await loginWithSupabase(username, password);
    });
  }

  async function initializeLoginPage() {
    cleanupLegacyDemoAuthKeys();

    const params = new URLSearchParams(window.location.search || "");
    const authReason = params.get("auth_reason");
    if (authReason) {
      console.log("admin auth_reason:", authReason);
    }

    const authBridge = await ensureAuthBridge();
    if (!authBridge || typeof authBridge.getClient !== "function") {
      if (window.AdminUiText) {
        window.AdminUiText.normalizeDocument(document);
        window.AdminUiText.observeDocument(document);
      }
      bindLogin();
      bindRecoveryLinks();
      initRecoveryMode();
      return;
    }

    const client = await authBridge.getClient();
    if (!client) {
      if (window.AdminUiText) {
        window.AdminUiText.normalizeDocument(document);
        window.AdminUiText.observeDocument(document);
      }
      bindLogin();
      bindRecoveryLinks();
      initRecoveryMode();
      return;
    }

    try {
      await client.auth.getSession();
    } catch (error) {
      console.warn("Echte Sessionprüfung auf Loginseite fehlgeschlagen.", error);
    }

    if (window.AdminUiText) {
      window.AdminUiText.normalizeDocument(document);
      window.AdminUiText.observeDocument(document);
    }
    bindLogin();
    bindRecoveryLinks();
    initRecoveryMode();
  }

  initializeLoginPage();
})();
