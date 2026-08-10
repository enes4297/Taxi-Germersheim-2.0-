(() => {
  const AUTH_STORAGE_KEY = "demoAdminLoggedIn";
  const USER_STORAGE_KEY = "demoAdminUser";
  const ROLE_STORAGE_KEY = "demoAdminRole";
  const LEGACY_STORAGE_KEY = "taxiAdminDemoSession";
  const ALLOWED_PROFILE_ROLES = ["admin", "dispatcher"];

  let clientPromise = null;

  function readStoredSession() {
    const loggedIn = localStorage.getItem(AUTH_STORAGE_KEY);
    const user = localStorage.getItem(USER_STORAGE_KEY);
    const role = localStorage.getItem(ROLE_STORAGE_KEY);
    if (loggedIn === "true" && user && role) {
      return { loggedIn, user, role };
    }
    return null;
  }

  function saveStoredSession(user, role, meta = {}) {
    localStorage.setItem(AUTH_STORAGE_KEY, "true");
    localStorage.setItem(USER_STORAGE_KEY, user);
    localStorage.setItem(ROLE_STORAGE_KEY, role);

    const payload = {
      username: user,
      role,
      token: "supabase-auth-v1",
      loginAt: new Date().toISOString(),
      ...meta
    };

    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(payload));
    return payload;
  }

  function clearStoredSession() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(ROLE_STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  }

  function mapProfileRoleToAdminRole(role) {
    if (role === "admin") return "Chef";
    if (role === "dispatcher") return "Disposition";
    return role;
  }

  function normalizeConfigFromWindow() {
    if (window.TaxiSupabaseConfig) {
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

      const existingScript = document.querySelector('script[src="supabase-config.js"]');
      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(normalizeConfigFromWindow()), { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = "supabase-config.js";
      script.async = false;
      script.onload = () => resolve(normalizeConfigFromWindow());
      script.onerror = () => resolve(null);
      document.head.appendChild(script);
    });
  }

  function ensureSupabaseScript() {
    return new Promise((resolve) => {
      if (window.supabase && window.supabase.createClient) {
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
    if (clientPromise) {
      return clientPromise;
    }

    clientPromise = (async () => {
      const config = await ensureConfigScript();
      if (!config || !config.isConfigured) {
        return null;
      }

      const supabaseLib = await ensureSupabaseScript();
      if (!supabaseLib || !supabaseLib.createClient) {
        return null;
      }

      return supabaseLib.createClient(config.url, config.publishableKey);
    })();

    return clientPromise;
  }

  async function loadProfileForUser(client, userId) {
    if (!client || !userId) {
      return null;
    }

    const { data, error } = await client
      .from("profiles")
      .select("role, active")
      .eq("auth_user_id", userId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return data;
  }

  async function signInWithPassword(email, password) {
    const client = await getClient();
    if (!client) {
      throw new Error("Supabase ist noch nicht konfiguriert. Bitte URL und Publishable Key in admin/supabase-config.js eintragen.");
    }

    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
      throw new Error(error.message || "Anmeldung über Supabase ist fehlgeschlagen.");
    }

    const profile = await loadProfileForUser(client, data.user?.id);
    if (!profile || profile.active !== true || !ALLOWED_PROFILE_ROLES.includes(profile.role)) {
      await client.auth.signOut();
      clearStoredSession();
      throw new Error("Zugriff verweigert. Nur aktive Admins oder Dispatcher dürfen sich anmelden.");
    }

    const role = mapProfileRoleToAdminRole(profile.role);
    saveStoredSession(data.user?.email || data.user?.id || email, role, {
      authUserId: data.user?.id || null,
      profileRole: profile.role
    });

    return {
      session: data.session,
      user: data.user,
      profile,
      role
    };
  }

  async function restoreSupabaseSession() {
    const client = await getClient();
    if (!client) {
      return null;
    }

    const { data, error } = await client.auth.getSession();
    if (error || !data.session?.user) {
      clearStoredSession();
      return null;
    }

    const profile = await loadProfileForUser(client, data.session.user.id);
    if (!profile || profile.active !== true || !ALLOWED_PROFILE_ROLES.includes(profile.role)) {
      await client.auth.signOut();
      clearStoredSession();
      return null;
    }

    const role = mapProfileRoleToAdminRole(profile.role);
    saveStoredSession(data.session.user.email || data.session.user.id, role, {
      authUserId: data.session.user.id,
      profileRole: profile.role
    });

    return {
      user: data.session.user,
      profile,
      role
    };
  }

  async function signOut() {
    const client = await getClient();
    if (client && client.auth && typeof client.auth.signOut === "function") {
      try {
        await client.auth.signOut();
      } catch (error) {
        // ignore and continue with local cleanup
      }
    }

    clearStoredSession();
    return true;
  }

  window.TaxiSupabaseAuth = {
    readStoredSession,
    saveStoredSession,
    clearStoredSession,
    signInWithPassword,
    restoreSupabaseSession,
    signOut,
    mapProfileRoleToAdminRole
  };
})();
