(function () {
  const KEYS = {
    loggedIn: "taxiCustomerDemoLoggedIn",
    profile: "taxiCustomerDemoProfile",
    preferences: "taxiCustomerDemoPreferences"
  };

  function safeParse(value, fallback) {
    try {
      return JSON.parse(value);
    } catch (_error) {
      return fallback;
    }
  }

  function isLoggedIn() {
    return localStorage.getItem(KEYS.loggedIn) === "1";
  }

  function getProfile() {
    return safeParse(localStorage.getItem(KEYS.profile) || "{}", {});
  }

  function getPreferences() {
    return safeParse(localStorage.getItem(KEYS.preferences) || "{}", {});
  }

  function setLoginState(profile, preferences) {
    const currentPrefs = getPreferences();
    const nextPrefs = Object.assign({}, currentPrefs, preferences || {}, {
      lastLoginAt: Date.now()
    });

    localStorage.setItem(KEYS.loggedIn, "1");
    localStorage.setItem(KEYS.profile, JSON.stringify(profile || {}));
    localStorage.setItem(KEYS.preferences, JSON.stringify(nextPrefs));
    window.dispatchEvent(new CustomEvent("tg-customer-auth-changed", {
      detail: { loggedIn: true }
    }));
  }

  function logout() {
    localStorage.removeItem(KEYS.loggedIn);
    localStorage.removeItem(KEYS.profile);
    localStorage.removeItem(KEYS.preferences);
    window.dispatchEvent(new CustomEvent("tg-customer-auth-changed", {
      detail: { loggedIn: false }
    }));
  }

  function setProfile(profile) {
    localStorage.setItem(KEYS.profile, JSON.stringify(profile || {}));
  }

  function setPreferences(preferences) {
    const merged = Object.assign({}, getPreferences(), preferences || {});
    localStorage.setItem(KEYS.preferences, JSON.stringify(merged));
  }

  function patchNav() {
    const loggedIn = isLoggedIn();

    document.querySelectorAll("a[href='kundenkonto.html']").forEach(function (anchor) {
      anchor.setAttribute("href", "meinkonto.html");
      if (anchor.textContent && anchor.textContent.trim() === "Kundenkonto") {
        anchor.textContent = "Mein Konto";
      }
    });

    document.querySelectorAll("a[href='meinkonto.html'], a[href='anmelden.html'], a[href='kundenkonto.html']").forEach(function (anchor) {
      const href = (anchor.getAttribute("href") || "").trim();
      if (!href) return;

      const accountLink = href === "meinkonto.html" || href === "anmelden.html" || href === "kundenkonto.html";
      if (!accountLink) return;

      if (!loggedIn) {
        anchor.setAttribute("href", "anmelden.html");
        if (anchor.textContent && /konto|anmelden/i.test(anchor.textContent)) {
          anchor.textContent = "Anmelden";
        }
        const indicator = anchor.querySelector(".auth-nav-indicator");
        if (indicator) indicator.remove();
      } else {
        anchor.setAttribute("href", "meinkonto.html");
        if (anchor.textContent && /anmelden|konto/i.test(anchor.textContent)) {
          anchor.textContent = "Mein Konto";
        }
        if ((anchor.closest(".site-nav") || anchor.closest(".nav-links")) && !anchor.querySelector(".auth-nav-indicator")) {
          const indicator = document.createElement("span");
          indicator.className = "auth-nav-indicator";
          indicator.setAttribute("aria-hidden", "true");
          indicator.textContent = "Demo";
          anchor.appendChild(indicator);
        }
      }
    });
  }

  function mountGate(options) {
    const targetSelector = options && options.targetSelector ? options.targetSelector : "main";
    const pageTitle = options && options.pageTitle ? options.pageTitle : "Kundenbereich";

    const existing = document.getElementById("customerAuthGate");
    if (existing) return;

    const target = document.querySelector(targetSelector);
    if (target) {
      target.classList.add("auth-gated-content");
      target.setAttribute("aria-hidden", "true");
    }

    document.body.classList.add("auth-gated");

    const gate = document.createElement("section");
    gate.id = "customerAuthGate";
    gate.className = "auth-gate";
    gate.innerHTML =
      '<article class="auth-gate-card" role="region" aria-label="Login erforderlich">' +
        '<img src="assets/icons/Profile.svg" alt="" width="28" height="28" />' +
        '<h2>Bitte zuerst anmelden</h2>' +
        '<p>Der Bereich "' + pageTitle + '" ist als Demo nur nach Anmeldung sichtbar. Es gibt noch keine echte Sicherheit oder Backend-Pruefung.</p>' +
        '<div class="auth-gate-actions">' +
          '<a class="auth-btn" href="anmelden.html">Zur Anmeldung</a>' +
          '<a class="auth-btn" href="registrieren.html">Jetzt registrieren</a>' +
          '<a class="auth-btn" href="index.html">Zur Startseite</a>' +
        '</div>' +
      '</article>';

    document.body.appendChild(gate);
  }

  function requireLogin(options) {
    patchNav();
    if (isLoggedIn()) return false;
    mountGate(options || {});
    return true;
  }

  document.addEventListener("click", function (event) {
    const button = event.target.closest("[data-demo-logout]");
    if (!button) return;
    event.preventDefault();
    logout();
    window.location.href = "anmelden.html?loggedOut=1";
  });

  function init() {
    patchNav();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  window.CustomerAuthDemo = {
    keys: KEYS,
    isLoggedIn: isLoggedIn,
    getProfile: getProfile,
    getPreferences: getPreferences,
    setLoginState: setLoginState,
    setProfile: setProfile,
    setPreferences: setPreferences,
    logout: logout,
    patchNav: patchNav,
    requireLogin: requireLogin
  };
})();
