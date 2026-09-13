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
  const ALLOWED_PROFILE_ROLES = ["admin", "dispatcher"];

  let clientPromise = null;

  function cleanupLegacyDemoAuthKeys() {
    DEMO_AUTH_KEYS.forEach((key) => {
      if (key) {
        localStorage.removeItem(key);
      }
    });
  }

  function readStoredSession() {
    return window.TaxiSupabaseSession || null;
  }

  function saveStoredSession(user, role, meta = {}) {
    cleanupLegacyDemoAuthKeys();
    const payload = {
      username: user,
      role,
      token: "supabase-auth-v1",
      loginAt: new Date().toISOString(),
      ...meta
    };

    window.TaxiSupabaseSession = payload;
    return payload;
  }

  function clearStoredSession() {
    cleanupLegacyDemoAuthKeys();
    window.TaxiSupabaseSession = null;
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
    if (window.TaxiSupabaseClient) {
      return window.TaxiSupabaseClient;
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
      if (!supabaseLib || !supabaseLib.createClient) {
        return null;
      }

      const client = supabaseLib.createClient(config.url, config.publishableKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });

      window.TaxiSupabaseClient = client;
      return client;
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

  async function signInWithPassword(emailOrData, password) {
    const payload = typeof emailOrData === "object" && emailOrData !== null
      ? emailOrData
      : { email: emailOrData, password };

    const { email, password: passwordValue } = payload;
    if (!email || !passwordValue) {
      throw new Error("E-Mail und Passwort sind erforderlich.");
    }

    const client = await getClient();
    if (!client) {
      throw new Error("Supabase ist noch nicht konfiguriert. Bitte URL und Publishable Key in admin/supabase-config.js eintragen.");
    }

    const { data, error } = await client.auth.signInWithPassword({ email, password: passwordValue });
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
    const sessionPayload = {
      authUserId: data.user?.id || null,
      profileRole: profile.role,
      email: data.user?.email || email,
      role
    };

    saveStoredSession(data.user?.email || data.user?.id || email, role, sessionPayload);
    window.TaxiSupabaseSession = {
      session: data.session,
      user: data.user,
      profile,
      role,
      ...sessionPayload
    };

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
      window.TaxiSupabaseSession = null;
      return null;
    }

    const profile = await loadProfileForUser(client, data.session.user.id);
    if (!profile || profile.active !== true || !ALLOWED_PROFILE_ROLES.includes(profile.role)) {
      await client.auth.signOut();
      clearStoredSession();
      window.TaxiSupabaseSession = null;
      return null;
    }

    const role = mapProfileRoleToAdminRole(profile.role);
    const sessionPayload = {
      authUserId: data.session.user.id,
      profileRole: profile.role,
      email: data.session.user.email || data.session.user.id,
      role
    };

    saveStoredSession(data.session.user.email || data.session.user.id, role, sessionPayload);
    window.TaxiSupabaseSession = {
      session: data.session,
      user: data.session.user,
      profile,
      role,
      ...sessionPayload
    };

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
    getClient,
    getSharedClient: () => window.TaxiSupabaseClient || null,
    signInWithPassword,
    restoreSupabaseSession,
    signOut,
    mapProfileRoleToAdminRole
  };
})();
