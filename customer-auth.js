(function () {
  const STORE_KEYS = {
    profile: "tg_customer_profile",
    preferences: "tg_customer_preferences"
  };

  let clientPromise = null;
  let cachedUser = null;
  let cachedProfile = null;

  function safeParse(value, fallback) {
    try {
      return JSON.parse(value);
    } catch (_error) {
      return fallback;
    }
  }

  function normalizeConfigFromWindow() {
    if (window.TaxiSupabaseConfig && typeof window.TaxiSupabaseConfig === "object") {
      return window.TaxiSupabaseConfig;
    }
    return null;
  }

  function ensureConfigScript() {
    return new Promise((resolve) => {
      const existingConfig = normalizeConfigFromWindow();
      if (existingConfig) {
        resolve(existingConfig);
        return;
      }

      const configScript = document.querySelector('script[src="admin/supabase-config.js"]');
      if (configScript) {
        configScript.addEventListener("load", () => resolve(normalizeConfigFromWindow()), { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = "admin/supabase-config.js";
      script.async = false;
      script.onload = () => resolve(normalizeConfigFromWindow());
      script.onerror = () => resolve(null);
      document.head.appendChild(script);
    });
  }

  function ensureSupabaseScript() {
    return new Promise((resolve) => {
      if (window.supabase && typeof window.supabase.createClient === "function") {
        resolve(window.supabase);
        return;
      }

      const existingScript = document.querySelector('script[src*="@supabase/supabase-js"]');
      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(window.supabase), { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
      script.async = false;
      script.onload = () => resolve(window.supabase);
      script.onerror = () => resolve(null);
      document.head.appendChild(script);
    });
  }

  async function getClient() {
    if (window.TaxiCustomerSupabaseClient) {
      return window.TaxiCustomerSupabaseClient;
    }

    if (clientPromise) {
      return clientPromise;
    }

    clientPromise = (async () => {
      const config = await ensureConfigScript();
      if (!config || !config.isConfigured) {
        return null;
      }

      const supabaseLib = await ensureSupabaseScript();
      if (!supabaseLib || typeof supabaseLib.createClient !== "function") {
        return null;
      }

      const client = supabaseLib.createClient(config.url, config.publishableKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });

      window.TaxiCustomerSupabaseClient = client;
      return client;
    })();

    return clientPromise;
  }

  function persistProfile(profile) {
    cachedProfile = profile || null;
    if (profile) {
      localStorage.setItem(STORE_KEYS.profile, JSON.stringify(profile));
    } else {
      localStorage.removeItem(STORE_KEYS.profile);
    }
  }

  function readStoredProfile() {
    if (cachedProfile) {
      return cachedProfile;
    }
    const stored = localStorage.getItem(STORE_KEYS.profile);
    const parsed = safeParse(stored, null);
    cachedProfile = parsed || null;
    return cachedProfile;
  }

  function persistPreferences(preferences) {
    const previous = safeParse(localStorage.getItem(STORE_KEYS.preferences) || "{}", {});
    const merged = Object.assign({}, previous, preferences || {});
    localStorage.setItem(STORE_KEYS.preferences, JSON.stringify(merged));
  }

  function readStoredPreferences() {
    return safeParse(localStorage.getItem(STORE_KEYS.preferences) || "{}", {});
  }

  function getSessionSnapshot() {
    const session = window.__tgCustomerSession || null;
    return session ? {
      session: session.session || null,
      user: session.user || null,
      profile: session.profile || null,
      customerId: session.customerId || null,
      linked: Boolean(session.linked)
    } : null;
  }

  function hasRealCustomerSession() {
    const snapshot = getSessionSnapshot();
    if (!snapshot || !snapshot.session || !snapshot.user || !snapshot.user.id) {
      return false;
    }
    if (snapshot.user.is_anonymous === true) {
      return false;
    }
    if (snapshot.linked === true || Boolean(snapshot.customerId)) {
      return true;
    }
    return false;
  }

  function syncSessionState(sessionData) {
    const safeSession = sessionData || null;
    window.__tgCustomerSession = safeSession;
    if (safeSession && safeSession.user) {
      persistProfile({
        fullName: safeSession.profile?.fullName || safeSession.user.user_metadata?.full_name || safeSession.user.email || "Kunde",
        firstName: safeSession.profile?.firstName || safeSession.user.user_metadata?.first_name || "",
        lastName: safeSession.profile?.lastName || safeSession.user.user_metadata?.last_name || "",
        email: safeSession.user.email || "",
        phone: safeSession.profile?.phone || safeSession.user.user_metadata?.phone || "",
        customerId: safeSession.customerId || null,
        linked: Boolean(safeSession.linked),
        registeredAt: safeSession.user.created_at || Date.now()
      });
    } else {
      persistProfile(null);
      localStorage.removeItem(STORE_KEYS.preferences);
    }
  }

  async function hydrateSession() {
    const client = await getClient();
    if (!client) {
      syncSessionState(null);
      return null;
    }

    const { data, error } = await client.auth.getSession();
    if (error || !data.session?.user) {
      syncSessionState(null);
      return null;
    }

    const sessionUser = data.session.user;
    const customerId = sessionUser?.user_metadata?.customer_id || null;

    const sessionState = {
      session: data.session,
      user: sessionUser,
      customerId,
      linked: Boolean(customerId),
      profile: {
        fullName: sessionUser.user_metadata?.full_name || sessionUser.email || "Kunde",
        firstName: sessionUser.user_metadata?.first_name || "",
        lastName: sessionUser.user_metadata?.last_name || "",
        email: sessionUser.email || "",
        phone: sessionUser.user_metadata?.phone || "",
        registeredAt: sessionUser.created_at || Date.now()
      }
    };

    syncSessionState(sessionState);

    try {
      if (sessionUser && sessionUser.is_anonymous !== true && !sessionState.linked) {
        const claimResult = await claimCustomerAccount();
        if (claimResult && claimResult.customer_id) {
          const updated = getSessionSnapshot();
          if (updated && updated.user) {
            syncSessionState({
              ...updated,
              linked: true,
              customerId: claimResult.customer_id,
              profile: {
                ...((updated.profile && typeof updated.profile === "object") ? updated.profile : {}),
                customerId: claimResult.customer_id,
                fullName: updated.profile?.fullName || updated.user.email || "Kunde",
                email: updated.user.email || "",
                phone: updated.profile?.phone || ""
              }
            });
          }
        }
      }
    } catch (_claimError) {
      // keep existing Supabase session; do not auto-redirect or sign out on failed claim
    }

    return data.session;
  }

  async function claimCustomerAccount() {
    const client = await getClient();
    if (!client) {
      throw new Error("Supabase ist noch nicht konfiguriert.");
    }

    const { data, error } = await client.rpc("claim_customer_account");
    if (error) {
      if (error.message === "CUSTOMER_EMAIL_NOT_VERIFIED") {
        throw new Error("Bitte bestätige zuerst deine E-Mail-Adresse.");
      }
      if (error.message === "CUSTOMER_NOT_FOUND") {
        throw new Error("Dein Kundenkonto konnte noch nicht mit Taxi Germersheim verknüpft werden. Bitte kontaktiere uns.");
      }
      if (error.message === "CUSTOMER_EMAIL_AMBIGUOUS") {
        throw new Error("Dein Kundenkonto konnte nicht automatisch zugeordnet werden. Bitte kontaktiere uns.");
      }
      if (error.message === "CUSTOMER_ALREADY_LINKED" || error.message === "AUTH_USER_ALREADY_LINKED") {
        throw new Error("Dein Kundenkonto konnte nicht automatisch zugeordnet werden. Bitte kontaktiere uns.");
      }
      throw new Error("E-Mail oder Passwort ist falsch.");
    }

    const linkedCustomerId = data?.customer_id || null;
    const session = window.__tgCustomerSession || null;
    if (session && session.user) {
      syncSessionState({
        ...session,
        linked: Boolean(linkedCustomerId),
        customerId: linkedCustomerId,
        profile: {
          ...((session.profile && typeof session.profile === "object") ? session.profile : {}),
          customerId: linkedCustomerId,
          fullName: (session.profile && session.profile.fullName) || session.user.email || "Kunde",
          email: session.user.email || "",
          firstName: (session.profile && session.profile.firstName) || "",
          lastName: (session.profile && session.profile.lastName) || ""
        }
      });
    }

    return data || { linked: true };
  }

  async function signInWithPassword(email, password) {
    const client = await getClient();
    if (!client) {
      throw new Error("Supabase ist noch nicht konfiguriert.");
    }

    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
      throw new Error("E-Mail oder Passwort ist falsch.");
    }

    const session = data.session;
    const user = data.user;

    syncSessionState({
      session,
      user,
      linked: false,
      customerId: null,
      profile: {
        fullName: user.user_metadata?.full_name || user.email || "Kunde",
        firstName: user.user_metadata?.first_name || "",
        lastName: user.user_metadata?.last_name || "",
        email: user.email || "",
        phone: user.user_metadata?.phone || "",
        registeredAt: user.created_at || Date.now()
      }
    });

    try {
      const claimResult = await claimCustomerAccount();
      if (claimResult?.customer_id) {
        const state = getSessionSnapshot();
        if (state && state.user) {
          syncSessionState({
            ...state,
            linked: true,
            customerId: claimResult.customer_id,
            profile: {
              ...((state.profile && typeof state.profile === "object") ? state.profile : {}),
              customerId: claimResult.customer_id,
              fullName: state.profile?.fullName || state.user.email || "Kunde",
              email: state.user.email || "",
              phone: state.profile?.phone || ""
            }
          });
        }
      }
      return claimResult;
    } catch (claimError) {
      if (claimError && claimError.message) {
        throw claimError;
      }
      throw new Error("Dein Kundenkonto konnte noch nicht mit Taxi Germersheim verknüpft werden. Bitte kontaktiere uns.");
    }
  }

  async function signUp(email, password, metadata = {}) {
    const client = await getClient();
    if (!client) {
      throw new Error("Supabase ist noch nicht konfiguriert.");
    }

    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: metadata.firstName || "",
          last_name: metadata.lastName || "",
          full_name: metadata.fullName || "",
          phone: metadata.phone || ""
        }
      }
    });

    if (error) {
      throw new Error(error.message || "Registrierung fehlgeschlagen.");
    }

    if (data?.user && !data.session) {
      throw new Error("Bitte bestätige zuerst deine E-Mail-Adresse.");
    }

    return data;
  }

  async function signOut() {
    const client = await getClient();
    if (client && client.auth && typeof client.auth.signOut === "function") {
      try {
        await client.auth.signOut();
      } catch (_error) {
        // ignore and continue with local cleanup
      }
    }

    syncSessionState(null);
    return true;
  }

  function normalizeText(value) {
    return (value || "").toString().trim();
  }

  function patchNav() {
    const session = getSessionSnapshot();
    const loggedIn = Boolean(session && session.session && session.user);

    document.querySelectorAll("a[href='kundenkonto.html']").forEach((anchor) => {
      anchor.setAttribute("href", "meinkonto.html");
      if (anchor.textContent && anchor.textContent.trim() === "Kundenkonto") {
        anchor.textContent = "Mein Konto";
      }
    });

    document.querySelectorAll("a[href='meinkonto.html'], a[href='anmelden.html'], a[href='kundenkonto.html']").forEach((anchor) => {
      const href = (anchor.getAttribute("href") || "").trim();
      if (!href) return;
      const accountLink = href === "meinkonto.html" || href === "anmelden.html" || href === "kundenkonto.html";
      if (!accountLink) return;

      if (!loggedIn) {
        anchor.setAttribute("href", "anmelden.html");
        if (anchor.textContent && /konto|anmelden/i.test(anchor.textContent)) {
          anchor.textContent = "Anmelden";
        }
      } else {
        anchor.setAttribute("href", "meinkonto.html");
        if (anchor.textContent && /anmelden|konto/i.test(anchor.textContent)) {
          anchor.textContent = "Mein Konto";
        }
      }
    });
  }

  function isLoggedIn() {
    return hasRealCustomerSession();
  }

  function getProfile() {
    const session = getSessionSnapshot();
    if (session && session.profile) {
      return session.profile;
    }
    return readStoredProfile() || {};
  }

  function setProfile(profile) {
    const nextProfile = profile || {};
    const session = getSessionSnapshot();
    if (session && session.user) {
      syncSessionState({
        ...session,
        profile: nextProfile
      });
      return;
    }
    persistProfile(nextProfile);
  }

  function setPreferences(preferences) {
    persistPreferences(preferences || {});
  }

  function getPreferences() {
    return readStoredPreferences();
  }

  function requireLogin(options) {
    const loggedIn = isLoggedIn();
    patchNav();

    if (loggedIn) {
      return false;
    }

    const targetSelector = options && options.targetSelector ? options.targetSelector : "main";
    const pageTitle = options && options.pageTitle ? options.pageTitle : "Kundenbereich";
    const gateTitle = options && options.gateTitle ? options.gateTitle : "Bitte zuerst anmelden";
    const gateDescription = options && options.gateDescription
      ? options.gateDescription
      : 'Der Bereich "' + pageTitle + '" ist nur nach erfolgreicher Anmeldung sichtbar.';
    const defaultButtons = [
      { label: "Zur Anmeldung", href: "anmelden.html" },
      { label: "Jetzt registrieren", href: "registrieren.html" },
      { label: "Zur Startseite", href: "index.html" }
    ];
    const gateButtons = Array.isArray(options && options.gateButtons) && options.gateButtons.length
      ? options.gateButtons
      : defaultButtons;
    const existing = document.getElementById("customerAuthGate");
    if (existing) return true;

    const target = document.querySelector(targetSelector);
    if (target) {
      target.classList.add("auth-gated-content");
      target.setAttribute("aria-hidden", "true");
    }

    document.body.classList.add("auth-gated");

    const buttonsHtml = gateButtons.map(function (button) {
      const label = button && button.label ? button.label : "Weiter";
      const href = button && button.href ? button.href : "anmelden.html";
      return '<a class="auth-btn" href="' + href + '">' + label + '</a>';
    }).join("");

    const gate = document.createElement("section");
    gate.id = "customerAuthGate";
    gate.className = "auth-gate";
    gate.innerHTML = (
      '<article class="auth-gate-card" role="region" aria-label="Login erforderlich">' +
      '<img src="assets/icons/Profile.svg" alt="" width="28" height="28" />' +
      '<h2>' + gateTitle + '</h2>' +
      '<p>' + gateDescription + '</p>' +
      '<div class="auth-gate-actions">' + buttonsHtml + '</div>' +
      '</article>'
    );

    document.body.appendChild(gate);
    return true;
  }

  async function requireLoginAsync(options) {
    try {
      await hydrateSession();
    } catch (_error) {
      // keep the page available until the real auth state is known
    }
    return requireLogin(options);
  }

  async function bootstrap() {
    await hydrateSession();
    patchNav();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      bootstrap();
    }, { once: true });
  } else {
    bootstrap();
  }

  window.CustomerAuth = {
    hydrateSession,
    getClient,
    signInWithPassword,
    signUp,
    signOut,
    claimCustomerAccount,
    getSessionSnapshot,
    readStoredProfile,
    getProfile,
    isLoggedIn,
    requireLogin,
    requireLoginAsync,
    patchNav,
    getPreferences,
    setPreferences,
    setProfile,
    logout: signOut,
    normalizeText,
    persistProfile,
    persistPreferences
  };

  window.CustomerAuthDemo = window.CustomerAuth;
  window.CustomerAuthV2 = window.CustomerAuth;
})();
