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
   * Eigene Urlaubsanträge laden.
   * RLS erlaubt nur die Einträge des aktuell angemeldeten Mitarbeiters.
   */
  async function getMyVacationRequests() {
    const cl = await client();
    if (!cl) return [];
    const { data, error } = await cl
      .from("vacation_requests")
      .select("id, employee_id, start_date, end_date, note, status, submitted_at, processed_at, processed_by, created_at, updated_at")
      .order("start_date", { ascending: true });
    if (error) {
      console.error("Urlaubsanträge konnten nicht geladen werden.", error.code);
      return [];
    }
    return data || [];
  }

  /**
   * Neuer Urlaubsantrag für den aktuell angemeldeten Mitarbeiter.
   * employee_id wird aus dem Profil des eingeloggten Benutzers abgeleitet.
   */
  async function createVacationRequest({ startDate, endDate, note }) {
    const cl = await client();
    if (!cl) {
      return { ok: false, error: "SUPABASE_NOT_CONFIGURED" };
    }

    const session = await checkSession();
    if (!session?.employeeId) {
      return { ok: false, error: "NO_EMPLOYEE_PROFILE" };
    }

    const payload = {
      employee_id: session.employeeId,
      start_date: startDate,
      end_date: endDate,
      note: note ? String(note).trim() : null,
      status: "requested"
    };

    const { data, error } = await cl
      .from("vacation_requests")
      .insert(payload)
      .select("id, employee_id, start_date, end_date, note, status")
      .single();

    if (error) {
      console.error("Urlaubsantrag konnte nicht gespeichert werden.", error.message || error.code);
      return { ok: false, error: error.message || "INSERT_FAILED" };
    }

    return { ok: true, data };
  }

  const DOC_BUCKET = "employee-documents";
  const DOC_MAX_BYTES = 10 * 1024 * 1024;
  const DOC_MIME = ["application/pdf", "image/jpeg", "image/png"];

  /**
   * Dokumenttypen aus der Datenbank.
   */
  async function getDocumentTypes() {
    const cl = await client();
    if (!cl) return [];
    const { data, error } = await cl
      .from("document_types")
      .select("id, key, label")
      .order("label", { ascending: true });
    if (error) {
      console.error("Dokumenttypen konnten nicht geladen werden.", error.code);
      return [];
    }
    return data || [];
  }

  /**
   * Eigene Einreichungen laden.
   * RLS (document_submissions_select_self) beschraenkt auf den eigenen
   * Mitarbeiter.
   */
  async function getMyDocumentSubmissions() {
    const cl = await client();
    if (!cl) return [];
    const { data, error } = await cl
      .from("document_submissions")
      .select("id, employee_id, document_type_id, file_path, file_name, mime_type, status, note, submitted_at, document_types(label)")
      .order("submitted_at", { ascending: false });
    if (error) {
      console.error("Einreichungen konnten nicht geladen werden.", error.code);
      return [];
    }
    return data || [];
  }

  /**
   * Datei hochladen UND den zugehoerigen Datensatz anlegen.
   *
   * Ablauf und Fehlerbehandlung
   *   1. Datei in den privaten Bucket, Pfad <auth.uid()>/<jahr>/<uuid>.<ext>.
   *      Die Policy erzwingt serverseitig, dass der erste Ordner die eigene
   *      auth.uid() ist - ein fremder Pfad ist nicht moeglich.
   *   2. Datensatz in document_submissions mit genau diesem Pfad.
   *   3. Scheitert Schritt 2, wird die soeben hochgeladene Datei wieder
   *      entfernt, damit keine verwaiste Datei zurueckbleibt. Die Loeschung
   *      ist durch die Policy auf den eigenen Ordner begrenzt.
   *
   * Rueckgabe { ok, data } nur, wenn BEIDES gespeichert ist.
   */
  async function uploadDocumentSubmission({ file, documentTypeId, note }) {
    if (!file) return { ok: false, error: "NO_FILE" };
    if (file.size > DOC_MAX_BYTES) return { ok: false, error: "FILE_TOO_LARGE" };
    if (!DOC_MIME.includes(file.type)) return { ok: false, error: "FILE_TYPE_NOT_ALLOWED" };

    const cl = await client();
    if (!cl) return { ok: false, error: "SUPABASE_NOT_CONFIGURED" };

    const session = await checkSession();
    if (!session?.employeeId || !session?.user?.id) {
      return { ok: false, error: "NO_EMPLOYEE_PROFILE" };
    }

    const ext = ({
      "application/pdf": "pdf",
      "image/jpeg": "jpg",
      "image/png": "png"
    })[file.type] || "bin";

    /* Eindeutiger Name: kein Ueberschreiben, auch nicht eigener Dateien. */
    const unique = (crypto?.randomUUID && crypto.randomUUID()) ||
      `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const path = `${session.user.id}/${new Date().getFullYear()}/${unique}.${ext}`;

    const uploaded = await cl.storage.from(DOC_BUCKET).upload(path, file, {
      contentType: file.type,
      upsert: false
    });
    if (uploaded.error) {
      console.error("Datei konnte nicht hochgeladen werden.", uploaded.error.message);
      return { ok: false, error: uploaded.error.message || "UPLOAD_FAILED", stage: "upload" };
    }

    const { data, error } = await cl
      .from("document_submissions")
      .insert({
        employee_id: session.employeeId,
        document_type_id: documentTypeId || null,
        file_path: path,
        file_name: file.name,
        mime_type: file.type,
        status: "submitted",
        note: note ? String(note).trim() : null
      })
      .select("id, employee_id, document_type_id, file_path, file_name, mime_type, status, note, submitted_at")
      .single();

    if (error || !data?.id) {
      /* Begrenzte Bereinigung: eigene, gerade hochgeladene Datei entfernen. */
      const cleanup = await cl.storage.from(DOC_BUCKET).remove([path]);
      if (cleanup.error) {
        console.error("Verwaiste Datei konnte nicht entfernt werden.", cleanup.error.message);
      }
      console.error("Einreichung konnte nicht gespeichert werden.", error?.message);
      return {
        ok: false,
        error: error?.message || "INSERT_FAILED",
        stage: "record",
        cleaned: !cleanup.error
      };
    }

    return { ok: true, data };
  }

  /**
   * Kurz gueltige signierte URL fuer eine eigene Datei.
   * Der Bucket ist privat; es gibt keine oeffentlichen URLs.
   */
  async function getSignedDocumentUrl(filePath, expiresInSeconds = 60) {
    if (!filePath) return null;
    const cl = await client();
    if (!cl) return null;
    const { data, error } = await cl.storage
      .from(DOC_BUCKET)
      .createSignedUrl(filePath, expiresInSeconds);
    if (error) {
      console.error("Signierte URL konnte nicht erzeugt werden.", error.message);
      return null;
    }
    return data?.signedUrl || null;
  }

  /**
   * Eigene Krankmeldungen laden.
   * RLS (sickness_reports_select_self) beschränkt auf den eigenen Mitarbeiter.
   * Es werden bewusst keine medizinischen Angaben geführt - die Tabelle
   * enthält nur Zeitraum, Notiz, Quelle und Status.
   */
  async function getMySicknessReports() {
    const cl = await client();
    if (!cl) return [];
    const { data, error } = await cl
      .from("sickness_reports")
      .select("id, employee_id, start_date, expected_end_date, note, submission_source, status, created_at, document_submission_id")
      .order("start_date", { ascending: false });
    if (error) {
      console.error("Krankmeldungen konnten nicht geladen werden.", error.code);
      return [];
    }
    return data || [];
  }

  /**
   * Neue Krankmeldung für den aktuell angemeldeten Mitarbeiter.
   * employee_id wird aus dem Profil des eingeloggten Benutzers abgeleitet,
   * nicht aus dem Formular - die Policy sickness_reports_employee_insert
   * verlangt genau das und zusätzlich status = 'submitted'.
   *
   * Dateianhänge werden bewusst NICHT übertragen: document_submission_id
   * bleibt null, solange es keinen Upload-Weg gibt.
   */
  async function createSicknessReport({ startDate, expectedEndDate, note, documentSubmissionId }) {
    const cl = await client();
    if (!cl) {
      return { ok: false, error: "SUPABASE_NOT_CONFIGURED" };
    }

    const session = await checkSession();
    if (!session?.employeeId) {
      return { ok: false, error: "NO_EMPLOYEE_PROFILE" };
    }

    const payload = {
      employee_id: session.employeeId,
      start_date: startDate,
      expected_end_date: expectedEndDate || null,
      note: note ? String(note).trim() : null,
      submission_source: "Mitarbeiterportal",
      /* Falls ein Nachweis eingereicht wurde, wird er hier verknuepft.
         Die Policy prueft serverseitig, dass die Einreichung dem eigenen
         Mitarbeiter gehoert - fremde IDs werden abgelehnt. */
      document_submission_id: documentSubmissionId || null,
      status: "submitted"
    };

    const { data, error } = await cl
      .from("sickness_reports")
      .insert(payload)
      .select("id, employee_id, start_date, expected_end_date, note, submission_source, status, created_at, document_submission_id")
      .single();

    if (error) {
      console.error("Krankmeldung konnte nicht gespeichert werden.", error.message || error.code);
      return { ok: false, error: error.message || "INSERT_FAILED" };
    }

    return { ok: true, data };
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
    getMyVacationRequests,
    createVacationRequest,
    getMySicknessReports,
    createSicknessReport,
    getDocumentTypes,
    getMyDocumentSubmissions,
    uploadDocumentSubmission,
    getSignedDocumentUrl,
    getVehicle,
    isPlanPublished
  };
})();
