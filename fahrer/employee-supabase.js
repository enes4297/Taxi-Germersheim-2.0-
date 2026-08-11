(() => {
  "use strict";

  const SUPABASE_CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";

  let _client = null;
  let _clientReady = false;

  /* ------------------------------------------------------------------ */
  /* Interne Hilfsfunktionen                                             */
  /* ------------------------------------------------------------------ */

  function getConfig() {
    return window.TaxiSupabaseConfig || null;
  }

  function isConfigured() {
    return getConfig()?.isConfigured === true;
  }

  function loadLib() {
    if (window.supabase?.createClient) return Promise.resolve(window.supabase);
    return new Promise((resolve) => {
      const existing = document.querySelector('script[src*="supabase-js"]');
      if (existing) {
        existing.addEventListener("load", () => resolve(window.supabase), { once: true });
        existing.addEventListener("error", () => resolve(null), { once: true });
        return;
      }
      const s = document.createElement("script");
      s.src = SUPABASE_CDN;
      s.async = false;
      s.onload = () => resolve(window.supabase);
      s.onerror = () => resolve(null);
      document.head.appendChild(s);
    });
  }

  async function client() {
    if (_client) return _client;
    const cfg = getConfig();
    if (!cfg?.isConfigured) return null;
    const lib = await loadLib();
    if (!lib?.createClient) return null;
    _client = lib.createClient(cfg.url, cfg.publishableKey);
    _clientReady = true;
    return _client;
  }

  async function loadProfile(cl, authUserId) {
    if (!cl || !authUserId) return null;
    const { data, error } = await cl
      .from("profiles")
      .select("employee_id, active, role")
      .eq("auth_user_id", authUserId)
      .maybeSingle();
    if (error) {
      console.error("Profil konnte nicht geladen werden.", error.code);
      return null;
    }
    return data || null;
  }

  /* ------------------------------------------------------------------ */
  /* Öffentliche API                                                     */
  /* ------------------------------------------------------------------ */

  /**
   * Supabase konfiguriert?
   */
  function publicIsConfigured() {
    return isConfigured();
  }

  /**
   * Mitarbeiter-Login per E-Mail + Passwort.
   * Wirft einen Fehler, wenn Supabase nicht konfiguriert ist oder
   * kein gültiger Mitarbeiterzugang gefunden wird.
   * Niemals Demo-Fallback, wenn Supabase konfiguriert ist.
   */
  async function signIn(email, password) {
    if (!isConfigured()) {
      throw new Error("NOT_CONFIGURED");
    }

    const cl = await client();
    if (!cl) throw new Error("Anmeldung nicht möglich – bitte Seite neu laden.");

    const { data, error } = await cl.auth.signInWithPassword({ email, password });
    if (error) {
      throw new Error(
        error.message === "Invalid login credentials"
          ? "E-Mail-Adresse oder Passwort ist falsch."
          : (error.message || "Anmeldung fehlgeschlagen.")
      );
    }

    const profile = await loadProfile(cl, data.user?.id);
    if (!profile || profile.active !== true || !profile.employee_id) {
      await cl.auth.signOut();
      throw new Error("Für dieses Konto ist kein aktiver Mitarbeiterzugang hinterlegt.");
    }

    return { user: data.user, employeeId: profile.employee_id };
  }

  /**
   * Bestehende Session prüfen und wiederherstellen.
   * Gibt { user, employeeId } zurück oder null.
   */
  async function checkSession() {
    if (!isConfigured()) return null;
    const cl = await client();
    if (!cl) return null;

    const { data, error } = await cl.auth.getSession();
    if (error || !data.session?.user) return null;

    const profile = await loadProfile(cl, data.session.user.id);
    if (!profile || profile.active !== true || !profile.employee_id) {
      await cl.auth.signOut();
      return null;
    }

    return { user: data.session.user, employeeId: profile.employee_id };
  }

  /**
   * Abmelden.
   */
  async function signOut() {
    const cl = await client();
    if (cl) await cl.auth.signOut();
  }

  /**
   * Eigene Mitarbeiterstammdaten laden (nur id, Vor-/Nachname, Beschäftigungsart, Status).
   * RLS filtert automatisch auf den aktuell eingeloggten Mitarbeiter.
   */
  async function getMyEmployee() {
    const cl = await client();
    if (!cl) return null;
    const { data, error } = await cl
      .from("employees")
      .select("id, first_name, last_name, employment_type, status")
      .maybeSingle();
    if (error) {
      console.error("Mitarbeiterdaten konnten nicht geladen werden.", error.code);
      return null;
    }
    return data || null;
  }

  /**
   * Eigene veröffentlichte Schichten laden.
   * RLS stellt sicher, dass nur eigene Schichten mit plan_status='published' sichtbar sind.
   */
  async function getMyPublishedShifts() {
    const cl = await client();
    if (!cl) return [];
    const { data, error } = await cl
      .from("shifts")
      .select("id, shift_date, start_time, end_time, status, vehicle_id, plan_status")
      .eq("plan_status", "published")
      .order("shift_date", { ascending: true });
    if (error) {
      console.error("Schichten konnten nicht geladen werden.", error.code);
      return [];
    }
    return data || [];
  }

  /**
   * Fahrzeug für eine Schicht laden (nur name, Kennzeichen, Fahrzeugtyp).
   * RLS erlaubt nur Fahrzeuge, die dem eigenen Mitarbeiter in einer veröffentlichten Schicht zugewiesen sind.
   */
  async function getVehicle(vehicleId) {
    if (!vehicleId) return null;
    const cl = await client();
    if (!cl) return null;
    const { data, error } = await cl
      .from("vehicles")
      .select("id, name, license_plate, vehicle_type")
      .eq("id", vehicleId)
      .maybeSingle();
    if (error) {
      console.error("Fahrzeug konnte nicht geladen werden.", error.code);
      return null;
    }
    return data || null;
  }

  /**
   * Prüfen, ob ein Plan für ein bestimmtes Datum veröffentlicht wurde.
   */
  async function isPlanPublished(dateIso) {
    const cl = await client();
    if (!cl) return false;
    const { data, error } = await cl
      .from("plan_publications")
      .select("id, status")
      .eq("plan_date", dateIso)
      .eq("status", "published")
      .maybeSingle();
    if (error) return false;
    return data !== null;
  }

  /* Modul nach außen freigeben */
  window.EmployeeSupabase = {
    isConfigured: publicIsConfigured,
    signIn,
    checkSession,
    signOut,
    getMyEmployee,
    getMyPublishedShifts,
    getVehicle,
    isPlanPublished
  };
})();
