(() => {
  const LEGACY_STATE_KEY = "adminV17PersonnelState";
  const DEFAULT_CONFIG = {
    mode: "local",
    storage: "local",
    schemaVersion: 2,
    backendReady: false,
    backendType: "local",
    supabaseUrl: "",
    supabasePublishableKey: "",
    authMode: "demo"
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function safeParse(raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function nowIso() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }

  function nowStamp() {
    const now = new Date();
    return `${nowIso()} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  }

  function createId(prefix) {
    const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    return `${prefix}_${stamp.slice(-6)}`;
  }

  function ensureArray(value, fallback = []) {
    return Array.isArray(value) ? value : fallback;
  }

  function normalizeEmployee(payload = {}) {
    const firstName = String(payload.firstName || payload.vorname || "").trim();
    const lastName = String(payload.lastName || payload.nachname || "").trim();
    const id = String(payload.id || payload.employeeId || "").trim() || createId("emp");
    return {
      id,
      employeeId: payload.employeeId || id,
      firstName,
      lastName,
      name: `${firstName} ${lastName}`.trim(),
      phone: String(payload.phone || "").trim(),
      email: String(payload.email || "").trim(),
      role: String(payload.role || "Fahrer"),
      employmentType: String(payload.employmentType || "Vollzeit"),
      status: String(payload.status || "aktiv"),
      active: String(payload.active || payload.status || "aktiv") !== "gesperrt",
      qualifications: ensureArray(payload.qualifications, []),
      portalActive: payload.portalActive !== false,
      createdAt: payload.createdAt || nowIso(),
      updatedAt: payload.updatedAt || nowIso(),
      ...payload
    };
  }

  function buildVehicleCatalog(state) {
    const fallback = [];
    const byId = new Map();
    (state.employees || []).forEach((emp, index) => {
      const vehicleName = emp.activeVehicle || emp.preferredVehicle || emp.fixedVehicle || "";
      if (!vehicleName) return;
      const id = `veh_${String(index + 1).padStart(3, "0")}`;
      if (!byId.has(vehicleName)) {
        byId.set(vehicleName, {
          id,
          name: vehicleName,
          kennzeichen: "",
          fahrzeugtyp: "",
          sitzplaetze: 4,
          rollstuhlgeeignet: Boolean(emp.wheelchairSkill),
          status: "aktiv",
          kilometerstand: 0,
          tuv: "",
          service: "",
          versicherung: "",
          reifenstatus: "",
          aktiv: true,
          employeeId: emp.id
        });
      }
    });
    return Array.from(byId.values()).concat(fallback);
  }

  function ensureStateShape(state) {
    const next = state && typeof state === "object" ? clone(state) : {};
    next.employees = ensureArray(next.employees, []).map((employee) => normalizeEmployee(employee));
    next.vacations = ensureArray(next.vacations, []);
    next.absences = ensureArray(next.absences, []);
    next.documents = ensureArray(next.documents, []);
    next.messages = ensureArray(next.messages, []);
    next.notifications = ensureArray(next.notifications, []);
    next.vehicles = ensureArray(next.vehicles, buildVehicleCatalog(next));
    next.shifts = ensureArray(next.shifts, []);
    next.plans = ensureArray(next.plans, []);
    next.documentSubmissions = ensureArray(next.documentSubmissions, []);
    next.auditTrail = ensureArray(next.auditTrail, []);
    next.config = next.config && typeof next.config === "object" ? { ...DEFAULT_CONFIG, ...next.config } : { ...DEFAULT_CONFIG };
    next.schemaVersion = next.schemaVersion || next.config.schemaVersion || DEFAULT_CONFIG.schemaVersion;
    next.updatedAt = next.updatedAt || nowStamp();
    return next;
  }

  function getBackendConfig() {
    if (runtimeState && runtimeState.config && typeof runtimeState.config === "object") {
      return { ...DEFAULT_CONFIG, ...runtimeState.config };
    }

    const persistedState = safeParse(localStorage.getItem(LEGACY_STATE_KEY));
    const persistedConfig = persistedState && typeof persistedState === "object" && persistedState.config && typeof persistedState.config === "object"
      ? persistedState.config
      : null;

    return { ...DEFAULT_CONFIG, ...(persistedConfig || {}) };
  }

  function getSupabaseConfig() {
    const globalConfig = window.TaxiSupabaseConfig && typeof window.TaxiSupabaseConfig === "object" ? window.TaxiSupabaseConfig : null;
    const stateConfig = getBackendConfig();
    const url = String(globalConfig?.url || stateConfig.supabaseUrl || "").trim();
    const publishableKey = String(globalConfig?.publishableKey || stateConfig.supabasePublishableKey || "").trim();
    const isConfigured = Boolean(url && publishableKey && !url.includes("HIER_EINTRAGEN") && !publishableKey.includes("HIER_EINTRAGEN"));
    return { url, publishableKey, isConfigured };
  }

  function isSupabaseConfigured() {
    return getSupabaseConfig().isConfigured;
  }

  function resolveBackendMode() {
    const config = getBackendConfig();
    const explicit = String(config.backendType || config.backendMode || "").toLowerCase();
    if ((explicit === "supabase" || explicit === "backend") && isSupabaseConfigured()) return "supabase";
    return isSupabaseConfigured() ? "supabase" : "local";
  }

  function readState() {
    const mode = resolveBackendMode();
    if (mode === "supabase") {
      if (!runtimeState) {
        runtimeState = ensureStateShape({});
      }
      return runtimeState;
    }

    const fromPersonnel = window.AdminPersonnelDemo && typeof window.AdminPersonnelDemo.loadState === "function"
      ? window.AdminPersonnelDemo.loadState()
      : null;
    if (fromPersonnel) return ensureStateShape(fromPersonnel);

    const raw = localStorage.getItem(LEGACY_STATE_KEY);
    if (!raw) {
      return ensureStateShape({});
    }
    return ensureStateShape(safeParse(raw) || {});
  }

  function writeState(state) {
    const next = ensureStateShape(state);
    next.updatedAt = nowStamp();

    if (resolveBackendMode() === "supabase") {
      runtimeState = next;
      return next;
    }

    if (window.AdminPersonnelDemo && typeof window.AdminPersonnelDemo.saveState === "function") {
      window.AdminPersonnelDemo.saveState(next);
      return next;
    }
    localStorage.setItem(LEGACY_STATE_KEY, JSON.stringify(next));
    return next;
  }

  function getState() {
    return readState();
  }

  function saveState(state) {
    return writeState(state);
  }

  let supabaseClientPromise = null;
  let lastEmployeeError = null;
  let runtimeState = null;

  async function ensureSupabaseAuthBridge() {
    if (window.TaxiSupabaseAuth && typeof window.TaxiSupabaseAuth.getClient === "function") {
      return window.TaxiSupabaseAuth;
    }

    const existingScript = document.querySelector('script[src$="supabase-auth.js"]');
    if (existingScript) {
      await new Promise((resolve) => {
        if (window.TaxiSupabaseAuth && typeof window.TaxiSupabaseAuth.getClient === "function") {
          resolve();
          return;
        }
        existingScript.addEventListener("load", () => resolve(), { once: true });
        existingScript.addEventListener("error", () => resolve(), { once: true });
      });
      return window.TaxiSupabaseAuth || null;
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

    return window.TaxiSupabaseAuth || null;
  }

  function setEmployeeError(message) {
    lastEmployeeError = message;
    return message;
  }

  function clearEmployeeError() {
    lastEmployeeError = null;
  }

  function getEmployeeError() {
    return lastEmployeeError;
  }

  function mapEmploymentTypeToDb(value) {
    const normalized = String(value || "").trim().toLowerCase();
    if (normalized === "full_time" || normalized === "festangestellt" || normalized === "vollzeit") return "full_time";
    if (normalized === "part_time" || normalized === "teilzeit") return "part_time";
    if (normalized === "mini_job" || normalized === "minijob") return "mini_job";
    return "other";
  }

  function mapEmploymentTypeToUi(value) {
    const normalized = String(value || "").trim().toLowerCase();
    if (normalized === "full_time" || normalized === "festangestellt" || normalized === "vollzeit") return "Festangestellt";
    if (normalized === "part_time" || normalized === "teilzeit") return "Teilzeit";
    if (normalized === "mini_job" || normalized === "minijob") return "Minijob";
    if (normalized === "springer" || normalized === "aushilfe") return "Sonstiges";
    if (normalized === "other" || normalized === "sonstiges") return "Sonstiges";
    return String(value || "Festangestellt");
  }

  function mapEmployeeToSupabase(payload = {}) {
    const statusValue = String(payload.status || "aktiv").trim();
    const active = payload.active !== undefined ? Boolean(payload.active) : !["gesperrt", "inactive", "inaktiv", "deaktiviert"].includes(statusValue.toLowerCase());
    return {
      first_name: String(payload.firstName || payload.vorname || "").trim(),
      last_name: String(payload.lastName || payload.nachname || "").trim(),
      phone: String(payload.phone || "").trim() || null,
      email: String(payload.email || "").trim() || null,
      employment_type: mapEmploymentTypeToDb(payload.employmentType || payload.employment_type || "Vollzeit"),
      status: statusValue || (active ? "active" : "inactive"),
      active,
      portal_active: payload.portalActive !== false && payload.portal_active !== false
    };
  }

  function mapEmployeeFromSupabase(row = {}) {
    const active = row.active !== undefined ? Boolean(row.active) : true;
    return normalizeEmployee({
      ...row,
      id: row.id,
      employeeId: row.id,
      firstName: row.first_name || row.firstName || "",
      lastName: row.last_name || row.lastName || "",
      phone: row.phone || "",
      email: row.email || "",
      employmentType: mapEmploymentTypeToUi(row.employment_type || row.employmentType || "Vollzeit"),
      status: row.status || (active ? "aktiv" : "gesperrt"),
      active,
      portalActive: row.portal_active !== false,
      createdAt: row.created_at || row.createdAt || nowIso(),
      updatedAt: row.updated_at || row.updatedAt || nowIso()
    });
  }

  function mapVehicleStatusToDb(value) {
    const normalized = String(value || "").trim().toLowerCase();
    if (normalized.includes("unterwegs") || normalized.includes("onroute") || normalized.includes("in service") || normalized.includes("in_service")) return "in_service";
    if (normalized.includes("pause")) return "pause";
    if (normalized.includes("werkstatt") || normalized.includes("workshop") || normalized.includes("wartung") || normalized.includes("service")) return "workshop";
    if (normalized.includes("gesperrt") || normalized.includes("blocked") || normalized.includes("inactive") || normalized.includes("deaktiv")) return "blocked";
    return "available";
  }

  function mapVehicleStatusToUi(value, active = true) {
    const normalized = String(value || "").trim().toLowerCase();
    if (normalized.includes("in_service") || normalized.includes("unterwegs") || normalized.includes("onroute") || normalized.includes("busy")) return "Unterwegs";
    if (normalized.includes("pause")) return "Pause";
    if (normalized.includes("werkstatt") || normalized.includes("workshop") || normalized.includes("wartung") || normalized.includes("service")) return "Werkstatt";
    if (normalized.includes("blocked") || normalized.includes("gesperrt") || normalized.includes("inactive") || normalized.includes("deaktiv") || !active) return "Gesperrt";
    return "Verfügbar";
  }

  function mapVehicleToSupabase(payload = {}) {
    const active = payload.active !== undefined ? Boolean(payload.active) : true;
    const statusValue = String(payload.status || (active ? "Verfügbar" : "Gesperrt")).trim();
    return {
      name: String(payload.name || "").trim(),
      license_plate: String(payload.plate || payload.licensePlate || payload.license_plate || "").trim() || null,
      vehicle_type: String(payload.type || payload.vehicleType || payload.vehicle_type || "").trim() || null,
      seats: Number(payload.seats) || null,
      wheelchair_accessible: payload.wheelchairAccessible !== undefined ? Boolean(payload.wheelchairAccessible) : Boolean(payload.wheelchairSuitable),
      status: mapVehicleStatusToDb(statusValue),
      mileage: Number(payload.odometerKm || payload.mileage || 0) || 0,
      tuv_due_date: payload.tuvDueDate || payload.tuvDate || payload.tuv_due_date || null,
      service_due_date: payload.serviceDueDate || payload.nextService || payload.service_due_date || null,
      insurance_due_date: payload.insuranceDueDate || payload.insuranceUntil || payload.insurance_due_date || null,
      tire_status: String(payload.tireStatus || "").trim() || null,
      active
    };
  }

  function mapVehicleFromSupabase(row = {}) {
    const active = row.active !== undefined ? Boolean(row.active) : true;
    return {
      id: row.id,
      name: String(row.name || "").trim(),
      plate: row.license_plate || row.plate || "",
      type: row.vehicle_type || row.type || "",
      seats: Number(row.seats) || 0,
      status: mapVehicleStatusToUi(row.status, active),
      currentDriver: row.currentDriver || "",
      odometerKm: Number(row.mileage || row.odometerKm || 0) || 0,
      nextService: row.service_due_date || row.nextService || "",
      tuvDate: row.tuv_due_date || row.tuvDate || "",
      insuranceUntil: row.insurance_due_date || row.insuranceUntil || "",
      tireStatus: row.tire_status || row.tireStatus || "Gut",
      wheelchairSuitable: Boolean(row.wheelchair_accessible ?? row.wheelchairSuitable),
      active,
      createdAt: row.created_at || row.createdAt || null,
      updatedAt: row.updated_at || row.updatedAt || null,
      hint: row.hint || ""
    };
  }

  async function ensureSupabaseClient() {
    if (supabaseClientPromise) {
      return supabaseClientPromise;
    }

    supabaseClientPromise = (async () => {
      const config = getSupabaseConfig();
      if (!config.isConfigured) {
        return null;
      }

      const authBridge = await ensureSupabaseAuthBridge();
      if (authBridge && typeof authBridge.getClient === "function") {
        try {
          if (typeof authBridge.restoreSupabaseSession === "function") {
            await authBridge.restoreSupabaseSession();
          }
          const sharedClient = await authBridge.getClient();
          if (!sharedClient) {
            return null;
          }

          if (sharedClient.auth && typeof sharedClient.auth.getSession === "function") {
            const { data, error } = await sharedClient.auth.getSession();
            if (error || !data?.session?.user) {
              setEmployeeError("Bitte melden Sie sich mit einem aktiven Supabase-Account an.");
              return null;
            }
          }

          return sharedClient;
        } catch (error) {
          setEmployeeError("Supabase-Session konnte nicht wiederhergestellt werden.");
          return null;
        }
      }

      if (window.supabase && typeof window.supabase.createClient === "function") {
        return window.supabase.createClient(config.url, config.publishableKey);
      }

      const loadScript = (src) => new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing) {
          if (existing.dataset.loaded === "true") {
            resolve();
            return;
          }
          existing.addEventListener("load", () => resolve(), { once: true });
          existing.addEventListener("error", () => reject(new Error(`Script konnte nicht geladen werden: ${src}`)), { once: true });
          return;
        }

        const script = document.createElement("script");
        script.src = src;
        script.async = true;
        script.onload = () => {
          script.dataset.loaded = "true";
          resolve();
        };
        script.onerror = () => reject(new Error(`Script konnte nicht geladen werden: ${src}`));
        document.head.appendChild(script);
      });

      try {
        await loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js");
      } catch (error) {
        setEmployeeError("Mitarbeiter konnten nicht geladen werden.");
        return null;
      }

      if (!window.supabase || typeof window.supabase.createClient !== "function") {
        setEmployeeError("Mitarbeiter konnten nicht geladen werden.");
        return null;
      }

      return window.supabase.createClient(config.url, config.publishableKey);
    })();

    return supabaseClientPromise;
  }

  function syncLocalEmployeeCache(employees) {
    const state = getState();
    state.employees = ensureArray(employees, []).map((employee) => normalizeEmployee(employee));
    saveState(state);
    return state.employees;
  }

  async function refreshEmployeeCacheFromSupabase() {
    const mode = resolveBackendMode();
    if (mode !== "supabase") {
      clearEmployeeError();
      return getState().employees;
    }

    await ensureSupabaseAuthBridge();
    const client = await ensureSupabaseClient();
    if (!client) {
      clearEmployeeError();
      return getState().employees;
    }

    const { data, error } = await client
      .from("employees")
      .select("id, first_name, last_name, phone, email, employment_type, status, active, portal_active, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (error) {
      clearEmployeeError();
      return getState().employees;
    }

    clearEmployeeError();
    return syncLocalEmployeeCache((data || []).map(mapEmployeeFromSupabase));
  }

  async function getEmployees() {
    const mode = resolveBackendMode();
    if (mode === "supabase") {
      return refreshEmployeeCacheFromSupabase();
    }

    clearEmployeeError();
    return getState().employees;
  }

  function syncLocalVehicleCache(vehicles) {
    const state = getState();
    state.vehicles = ensureArray(vehicles, []).map((vehicle) => ({ ...vehicle }));
    saveState(state);
    return state.vehicles;
  }

  async function refreshVehicleCacheFromSupabase() {
    const mode = resolveBackendMode();
    if (mode !== "supabase") {
      clearEmployeeError();
      return getState().vehicles;
    }

    await ensureSupabaseAuthBridge();
    const client = await ensureSupabaseClient();
    if (!client) {
      setEmployeeError("Fahrzeuge konnten nicht geladen werden.");
      return getState().vehicles;
    }

    const { data, error } = await client
      .from("vehicles")
      .select("id, name, license_plate, vehicle_type, seats, wheelchair_accessible, status, mileage, tuv_due_date, service_due_date, insurance_due_date, tire_status, active, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (error) {
      setEmployeeError("Fahrzeuge konnten nicht geladen werden.");
      return getState().vehicles;
    }

    clearEmployeeError();
    return syncLocalVehicleCache((data || []).map(mapVehicleFromSupabase));
  }

  async function getVehicle(vehicleId) {
    const mode = resolveBackendMode();
    if (mode === "supabase") {
      const client = await ensureSupabaseClient();
      if (!client) {
        setEmployeeError("Fahrzeug konnte nicht geladen werden.");
        return null;
      }

      const { data, error } = await client
        .from("vehicles")
        .select("id, name, license_plate, vehicle_type, seats, wheelchair_accessible, status, mileage, tuv_due_date, service_due_date, insurance_due_date, tire_status, active, created_at, updated_at")
        .eq("id", String(vehicleId))
        .maybeSingle();

      if (error) {
        setEmployeeError("Fahrzeug konnte nicht geladen werden.");
        return null;
      }

      if (!data) {
        clearEmployeeError();
        return null;
      }

      clearEmployeeError();
      return mapVehicleFromSupabase(data);
    }

    const vehicles = getState().vehicles;
    return vehicles.find((vehicle) => String(vehicle.id) === String(vehicleId)) || null;
  }

  async function getVehicles() {
    const mode = resolveBackendMode();
    if (mode === "supabase") {
      return refreshVehicleCacheFromSupabase();
    }

    clearEmployeeError();
    return getState().vehicles;
  }

  async function createVehicle(payload) {
    const mode = resolveBackendMode();
    if (mode === "supabase") {
      const client = await ensureSupabaseClient();
      if (!client) {
        setEmployeeError("Fahrzeug konnte nicht angelegt werden.");
        return null;
      }

      const prepared = mapVehicleToSupabase(payload);
      const { data, error } = await client
        .from("vehicles")
        .insert(prepared)
        .select("id, name, license_plate, vehicle_type, seats, wheelchair_accessible, status, mileage, tuv_due_date, service_due_date, insurance_due_date, tire_status, active, created_at, updated_at")
        .single();

      if (error) {
        setEmployeeError("Fahrzeug konnte nicht angelegt werden.");
        return null;
      }

      const created = mapVehicleFromSupabase(data);
      await refreshVehicleCacheFromSupabase();
      clearEmployeeError();
      return created;
    }

    const state = getState();
    const vehicle = {
      id: payload.id || createId("veh"),
      name: String(payload.name || "").trim(),
      plate: String(payload.plate || payload.licensePlate || "").trim(),
      type: String(payload.type || payload.vehicleType || "").trim(),
      seats: Number(payload.seats) || 0,
      status: payload.status || "Verfügbar",
      currentDriver: payload.currentDriver || "",
      odometerKm: Number(payload.odometerKm || payload.mileage || 0) || 0,
      nextService: payload.nextService || "",
      tuvDate: payload.tuvDate || "",
      insuranceUntil: payload.insuranceUntil || "",
      tireStatus: payload.tireStatus || "Gut",
      wheelchairSuitable: Boolean(payload.wheelchairAccessible ?? payload.wheelchairSuitable),
      active: payload.active !== undefined ? Boolean(payload.active) : true,
      hint: payload.hint || ""
    };
    state.vehicles.unshift(vehicle);
    saveState(state);
    return vehicle;
  }

  async function updateVehicle(vehicleId, updates) {
    const mode = resolveBackendMode();
    if (mode === "supabase") {
      const client = await ensureSupabaseClient();
      if (!client) {
        setEmployeeError("Fahrzeug konnte nicht aktualisiert werden.");
        return null;
      }

      const prepared = mapVehicleToSupabase({ ...updates, id: vehicleId });
      const { data, error } = await client
        .from("vehicles")
        .update(prepared)
        .eq("id", String(vehicleId))
        .select("id, name, license_plate, vehicle_type, seats, wheelchair_accessible, status, mileage, tuv_due_date, service_due_date, insurance_due_date, tire_status, active, created_at, updated_at")
        .maybeSingle();

      if (error) {
        setEmployeeError("Fahrzeug konnte nicht aktualisiert werden.");
        return null;
      }

      const updated = data ? mapVehicleFromSupabase(data) : null;
      await refreshVehicleCacheFromSupabase();
      clearEmployeeError();
      return updated;
    }

    const state = getState();
    const vehicle = state.vehicles.find((item) => String(item.id) === String(vehicleId));
    if (!vehicle) return null;
    Object.assign(vehicle, {
      ...vehicle,
      ...updates,
      id: vehicle.id,
      status: updates.status || vehicle.status,
      plate: updates.plate || updates.licensePlate || vehicle.plate,
      type: updates.type || updates.vehicleType || vehicle.type,
      seats: updates.seats || vehicle.seats,
      odometerKm: updates.odometerKm || updates.mileage || vehicle.odometerKm,
      nextService: updates.nextService || updates.serviceDueDate || vehicle.nextService,
      tuvDate: updates.tuvDate || updates.tuvDueDate || vehicle.tuvDate,
      insuranceUntil: updates.insuranceUntil || updates.insuranceDueDate || vehicle.insuranceUntil,
      tireStatus: updates.tireStatus || vehicle.tireStatus,
      wheelchairSuitable: updates.wheelchairAccessible !== undefined ? Boolean(updates.wheelchairAccessible) : Boolean(updates.wheelchairSuitable ?? vehicle.wheelchairSuitable),
      active: updates.active !== undefined ? Boolean(updates.active) : vehicle.active,
      hint: updates.hint || vehicle.hint
    });
    saveState(state);
    return vehicle;
  }

  async function getEmployee(employeeId) {
    const mode = resolveBackendMode();
    if (mode === "supabase") {
      const client = await ensureSupabaseClient();
      if (!client) {
        setEmployeeError("Mitarbeiter konnten nicht geladen werden.");
        return null;
      }

      const { data, error } = await client
        .from("employees")
        .select("id, first_name, last_name, phone, email, employment_type, status, active, portal_active, created_at, updated_at")
        .eq("id", String(employeeId))
        .maybeSingle();

      if (error) {
        setEmployeeError("Mitarbeiter konnten nicht geladen werden.");
        return null;
      }

      if (!data) {
        clearEmployeeError();
        return null;
      }

      clearEmployeeError();
      return mapEmployeeFromSupabase(data);
    }

    const employees = getState().employees;
    return employees.find((employee) => String(employee.id) === String(employeeId) || String(employee.employeeId) === String(employeeId)) || null;
  }

  async function createEmployee(payload) {
    const mode = resolveBackendMode();
    if (mode === "supabase") {
      const client = await ensureSupabaseClient();
      if (!client) {
        setEmployeeError("Mitarbeiter konnten nicht angelegt werden.");
        return null;
      }

      const prepared = mapEmployeeToSupabase(payload);
      const { data, error } = await client
        .from("employees")
        .insert(prepared)
        .select("id, first_name, last_name, phone, email, employment_type, status, active, portal_active, created_at, updated_at")
        .single();

      if (error) {
        setEmployeeError("Mitarbeiter konnten nicht angelegt werden.");
        return null;
      }

      const created = mapEmployeeFromSupabase(data);
      await refreshEmployeeCacheFromSupabase();
      clearEmployeeError();
      return created;
    }

    const state = getState();
    const employee = normalizeEmployee({
      ...payload,
      id: payload.id || createId("emp"),
      employeeId: payload.employeeId || payload.id || createId("emp")
    });
    state.employees.unshift(employee);
    state.notifications.unshift({
      id: createId("notification"),
      employeeId: employee.id,
      type: "ADMIN_MESSAGE",
      title: "Mitarbeiter angelegt",
      message: `${employee.name || employee.firstName} wurde im Demo-System angelegt.`,
      priority: "normal",
      read: false,
      createdAt: nowStamp(),
      relatedEntityType: "employee",
      relatedEntityId: employee.id
    });
    saveState(state);
    return employee;
  }

  async function updateEmployee(employeeId, updates) {
    const mode = resolveBackendMode();
    if (mode === "supabase") {
      const client = await ensureSupabaseClient();
      if (!client) {
        setEmployeeError("Mitarbeiter konnten nicht aktualisiert werden.");
        return null;
      }

      const prepared = mapEmployeeToSupabase(updates);
      const { data, error } = await client
        .from("employees")
        .update(prepared)
        .eq("id", String(employeeId))
        .select("id, first_name, last_name, phone, email, employment_type, status, active, portal_active, created_at, updated_at")
        .maybeSingle();

      if (error) {
        setEmployeeError("Mitarbeiter konnten nicht aktualisiert werden.");
        return null;
      }

      const updated = data ? mapEmployeeFromSupabase(data) : null;
      await refreshEmployeeCacheFromSupabase();
      clearEmployeeError();
      return updated;
    }

    const state = getState();
    const employee = state.employees.find((item) => String(item.id) === String(employeeId) || String(item.employeeId) === String(employeeId));
    if (!employee) return null;
    Object.assign(employee, normalizeEmployee({ ...employee, ...updates, id: employee.id, employeeId: employee.employeeId }));
    employee.updatedAt = nowIso();
    saveState(state);
    return employee;
  }

  function getVehiclesFromLocalState() {
    const state = getState();
    if (state.vehicles && state.vehicles.length) return state.vehicles;
    state.vehicles = buildVehicleCatalog(state);
    saveState(state);
    return state.vehicles;
  }

  function getVehicleFromLocalState(vehicleId) {
    return getVehiclesFromLocalState().find((vehicle) => String(vehicle.id) === String(vehicleId)) || null;
  }

  function mapShiftToSupabase(payload = {}) {
    const state = getState();
    const vehicleCandidate = String(payload.vehicleId || payload.vehicle || "").trim();
    let vehicleId = null;
    if (vehicleCandidate) {
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(vehicleCandidate)) {
        vehicleId = vehicleCandidate;
      } else {
        const match = (state.vehicles || []).find((vehicle) => {
          const plate = String(vehicle.plate || vehicle.licensePlate || "").trim().toLowerCase();
          const name = String(vehicle.name || "").trim().toLowerCase();
          return (plate && plate === vehicleCandidate.toLowerCase()) || (name && name === vehicleCandidate.toLowerCase());
        });
        vehicleId = match ? match.id : null;
      }
    }

    return {
      employee_id: payload.employeeId || payload.employee_id || null,
      shift_date: payload.date || payload.shift_date || null,
      start_time: payload.startTime || payload.start_time || payload.start || null,
      end_time: payload.endTime || payload.end_time || payload.end || null,
      status: payload.status || "draft",
      vehicle_id: vehicleId,
      note: payload.note || payload.notiz || null,
      plan_status: payload.planStatus || payload.plan_status || "draft",
      created_by: payload.createdBy || payload.created_by || null,
      updated_by: payload.updatedBy || payload.updated_by || null
    };
  }

  function mapShiftFromSupabase(row = {}) {
    return {
      id: row.id,
      employeeId: row.employee_id || row.employeeId || null,
      date: row.shift_date || row.date || null,
      startTime: row.start_time || row.start || "",
      endTime: row.end_time || row.end || "",
      start: row.start_time || row.start || "",
      end: row.end_time || row.end || "",
      status: row.status || "draft",
      vehicleId: row.vehicle_id || row.vehicleId || null,
      vehicle: row.vehicle_id || row.vehicleId || "",
      note: row.note || "",
      planStatus: row.plan_status || row.planStatus || "draft"
    };
  }

  function mapPlanPublicationToSupabase(payload = {}) {
    return {
      plan_date: payload.date || payload.plan_date || nowIso(),
      status: payload.status || "draft",
      version: Number(payload.version || 1),
      published_at: payload.publishedAt || payload.published_at || null,
      published_by: payload.publishedBy || payload.published_by || null
    };
  }

  function mapPlanPublicationFromSupabase(row = {}) {
    return {
      id: row.id,
      date: row.plan_date || row.date || null,
      status: row.status || "draft",
      version: Number(row.version || 1),
      publishedAt: row.published_at || row.publishedAt || null,
      publishedBy: row.published_by || row.publishedBy || null,
      createdAt: row.created_at || row.createdAt || null,
      updatedAt: row.updated_at || row.updatedAt || null
    };
  }

  async function getShifts() {
    const mode = resolveBackendMode();
    if (mode === "supabase") {
      await ensureSupabaseAuthBridge();
      const client = await ensureSupabaseClient();
      if (!client) {
        setEmployeeError("Planung konnte nicht geladen werden.");
        return [];
      }

      const sessionCheck = client.auth && typeof client.auth.getSession === "function"
        ? await client.auth.getSession()
        : null;
      if (!sessionCheck?.data?.session?.user) {
        setEmployeeError("Bitte melden Sie sich mit einem aktiven Supabase-Account an.");
        return [];
      }

      const { data, error } = await client
        .from("shifts")
        .select("id, employee_id, shift_date, start_time, end_time, status, vehicle_id, note, plan_status, created_by, updated_by, created_at, updated_at")
        .order("shift_date", { ascending: true });

      if (error) {
        setEmployeeError("Planung konnte nicht geladen werden.");
        return [];
      }

      clearEmployeeError();
      const next = ensureArray((data || []).map(mapShiftFromSupabase), []);
      const state = getState();
      state.shifts = next;
      saveState(state);
      return next;
    }

    clearEmployeeError();
    return getState().shifts;
  }

  async function saveShift(payload) {
    const mode = resolveBackendMode();
    if (mode === "supabase") {
      await ensureSupabaseAuthBridge();
      const client = await ensureSupabaseClient();
      if (!client) {
        setEmployeeError("Schicht konnte nicht gespeichert werden.");
        return null;
      }

      const prepared = mapShiftToSupabase(payload);
      const shiftId = payload && String(payload.id || payload.sourceId || payload.backendId || payload.supabaseId || "").trim();
      let query;
      let targetId = null;

      try {
        if (shiftId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(shiftId)) {
          targetId = shiftId;
          query = client.from("shifts").update(prepared).eq("id", targetId);
        } else if (prepared.employee_id && prepared.shift_date) {
          const { data: existingRow, error: existingError } = await client
            .from("shifts")
            .select("id")
            .eq("employee_id", prepared.employee_id)
            .eq("shift_date", prepared.shift_date)
            .maybeSingle();

          if (existingError) {
            throw existingError;
          }

          if (existingRow?.id) {
            targetId = existingRow.id;
            query = client.from("shifts").update(prepared).eq("id", targetId);
          } else {
            query = client.from("shifts").insert(prepared);
          }
        } else {
          query = client.from("shifts").insert(prepared);
        }

        const { data, error } = await query.select("id, employee_id, shift_date, start_time, end_time, status, vehicle_id, note, plan_status, created_by, updated_by, created_at, updated_at").maybeSingle();

        if (error) {
          throw error;
        }

        const saved = mapShiftFromSupabase(data || { ...prepared, id: shiftId || null });
        const state = getState();
        const existingIndex = state.shifts.findIndex((item) => String(item.id || "") === String(shiftId || ""));
        if (existingIndex >= 0) {
          state.shifts[existingIndex] = { ...state.shifts[existingIndex], ...saved };
        } else {
          state.shifts.push(saved);
        }
        saveState(state);
        clearEmployeeError();
        return saved;
      } catch (error) {
        console.error("saveShift Supabase error:", JSON.stringify({ code: error?.code, message: error?.message, details: error?.details, hint: error?.hint, status: error?.status }));
        const detail = error?.message ? ` (${error.message})` : (error?.code ? ` (Code: ${error.code})` : "");
        setEmployeeError(`Schicht konnte nicht gespeichert werden.${detail}`);
        return null;
      }
    }

    const state = getState();
    const shift = {
      id: payload.id || createId("shift"),
      employeeId: payload.employeeId,
      date: payload.date,
      startTime: payload.startTime || payload.shiftStart || "",
      endTime: payload.endTime || payload.shiftEnd || "",
      status: payload.status || "draft",
      vehicleId: payload.vehicleId || payload.vehicle || "",
      notiz: payload.note || "",
      planStatus: payload.planStatus || "draft",
      createdAt: payload.createdAt || nowStamp(),
      updatedAt: nowStamp()
    };
    const existingIndex = state.shifts.findIndex((item) => item.id === shift.id);
    if (existingIndex >= 0) {
      state.shifts[existingIndex] = shift;
    } else {
      state.shifts.push(shift);
    }
    state.notifications.unshift({
      id: createId("notification"),
      employeeId: payload.employeeId,
      type: "SHIFT_CHANGED",
      title: "Schicht gespeichert",
      message: payload.date ? `Schicht für ${payload.date} gespeichert.` : "Schicht gespeichert.",
      priority: "normal",
      read: false,
      createdAt: nowStamp(),
      relatedEntityType: "shift",
      relatedEntityId: shift.id
    });
    saveState(state);
    return shift;
  }

  async function getPlanPublications(date) {
    const mode = resolveBackendMode();
    if (mode === "supabase") {
      await ensureSupabaseAuthBridge();
      const client = await ensureSupabaseClient();
      if (!client) {
        clearEmployeeError();
        return [];
      }

      const sessionCheck = client.auth && typeof client.auth.getSession === "function"
        ? await client.auth.getSession()
        : null;
      if (!sessionCheck?.data?.session?.user) {
        setEmployeeError("Bitte melden Sie sich mit einem aktiven Supabase-Account an.");
        return [];
      }

      let query = client.from("plan_publications").select("id, plan_date, status, version, published_at, published_by, created_at, updated_at").order("created_at", { ascending: false });
      if (date) {
        query = query.eq("plan_date", String(date));
      }

      const { data, error } = await query;
      if (error) {
        setEmployeeError("Planung konnte nicht geladen werden.");
        return [];
      }

      clearEmployeeError();
      return (data || []).map(mapPlanPublicationFromSupabase);
    }

    clearEmployeeError();
    return getState().plans || [];
  }

  async function publishPlan(payload) {
    const mode = resolveBackendMode();
    if (mode === "supabase") {
      await ensureSupabaseAuthBridge();
      const client = await ensureSupabaseClient();
      if (!client) {
        setEmployeeError("Plan konnte nicht veröffentlicht werden.");
        return null;
      }

      const sessionCheck = client.auth && typeof client.auth.getSession === "function"
        ? await client.auth.getSession()
        : null;
      if (!sessionCheck?.data?.session?.user) {
        setEmployeeError("Bitte melden Sie sich mit einem aktiven Supabase-Account an.");
        return null;
      }

      const prepared = mapPlanPublicationToSupabase(payload);
      const existing = await client.from("plan_publications").select("id").eq("plan_date", prepared.plan_date).maybeSingle();
      if (existing.error) {
        setEmployeeError("Plan konnte nicht veröffentlicht werden.");
        return null;
      }

      try {
        const { data, error } = existing.data
          ? await client.from("plan_publications").update(prepared).eq("plan_date", prepared.plan_date).select("id, plan_date, status, version, published_at, published_by, created_at, updated_at").maybeSingle()
          : await client.from("plan_publications").insert(prepared).select("id, plan_date, status, version, published_at, published_by, created_at, updated_at").maybeSingle();

        if (error) {
          throw error;
        }

        const state = getState();
        const plan = mapPlanPublicationFromSupabase(data || prepared);
        state.plans = ensureArray(state.plans, []);
        const existingIndex = state.plans.findIndex((item) => String(item.date || "") === String(plan.date || ""));
        if (existingIndex >= 0) {
          state.plans[existingIndex] = { ...state.plans[existingIndex], ...plan };
        } else {
          state.plans.unshift(plan);
        }
        saveState(state);
        clearEmployeeError();
        return plan;
      } catch (error) {
        setEmployeeError("Schicht konnte nicht gespeichert werden.");
        return null;
      }
    }

    const state = getState();
    const planVersion = Number(state.planVersion || 0) + 1;
    const plan = {
      id: payload.id || createId("plan"),
      date: payload.date || nowIso(),
      status: "published",
      publishedAt: payload.publishedAt || nowStamp(),
      publishedBy: payload.publishedBy || "Admin",
      version: planVersion,
      rows: ensureArray(payload.rows, [])
    };
    state.plans.unshift(plan);
    state.planVersion = planVersion;
    state.notifications.unshift({
      id: createId("notification"),
      type: "PLAN_PUBLISHED",
      title: "Plan veröffentlicht",
      message: `Plan für ${plan.date} wurde veröffentlicht.`,
      priority: "normal",
      read: false,
      createdAt: nowStamp(),
      relatedEntityType: "plan",
      relatedEntityId: plan.id
    });
    saveState(state);
    return plan;
  }

  function getNotifications() {
    return getState().notifications;
  }

  function markNotificationRead(notificationId) {
    const state = getState();
    const item = state.notifications.find((entry) => entry.id === notificationId);
    if (!item) return null;
    item.read = true;
    saveState(state);
    return item;
  }

  function getConfig() {
    return getState().config;
  }

  function setConfig(partial) {
    const state = getState();
    state.config = { ...state.config, ...partial };
    if (state.config.backendType === "supabase" && !state.config.supabaseUrl && !state.config.supabasePublishableKey) {
      state.config.backendType = "local";
      state.config.backendMode = "local";
    }
    saveState(state);
    return state.config;
  }

  function formatDateDE(iso) {
    if (!iso) return "-";
    const parts = String(iso).split("-");
    if (parts.length !== 3) return iso;
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  }

  function formatTimeRange(start, end) {
    if (!start && !end) return "-";
    return `${start || "00:00"} – ${end || "00:00"} Uhr`;
  }

  function createSupabaseAdapter() {
    return {
      name: "supabase",
      configured: isSupabaseConfigured(),
      getEmployees,
      getEmployee,
      createEmployee,
      updateEmployee,
      getVehicles,
      getVehicle,
      createVehicle,
      updateVehicle,
      getShifts,
      saveShift,
      createVacationRequest: () => null,
      approveVacationRequest: () => null,
      createSicknessReport: () => null,
      submitDocument: () => null,
      approveDocument: () => null,
      getNotifications: () => [],
      markNotificationRead: () => null,
      publishPlan,
      getPlanPublications
    };
  }

  function getActiveAdapter() {
    const mode = resolveBackendMode();
    if (mode === "supabase") return createSupabaseAdapter();
    return null;
  }

  function authSignIn(email, password) {
    const config = getBackendConfig();
    if (resolveBackendMode() !== "supabase") {
      return { success: true, mode: "demo", user: { email: email || "demo@local", role: config.role || "admin" } };
    }
    return { success: false, mode: "supabase", message: "Supabase-Konfiguration fehlt. Bitte lokale Demo-Login-Variante nutzen." };
  }

  function authSignOut() {
    return { success: true, mode: resolveBackendMode() };
  }

  function getCurrentUser() {
    return { id: "local-demo-user", role: getBackendConfig().role || "admin", mode: resolveBackendMode() };
  }

  const service = {
    getState,
    saveState,
    getEmployees,
    getEmployee,
    createEmployee,
    updateEmployee,
    getVehicles,
    getVehicle,
    createVehicle,
    updateVehicle,
    getShifts,
    saveShift,
    publishPlan,
    getPlanPublications,
    getNotifications,
    markNotificationRead,
    getConfig,
    setConfig,
    formatDateDE,
    formatTimeRange,
    createId,
    getBackendConfig,
    setConfig,
    resolveBackendMode,
    isSupabaseConfigured,
    getActiveAdapter,
    createSupabaseAdapter,
    ensureSupabaseAuthBridge,
    ensureSupabaseClient,
    getLastError: () => getEmployeeError(),
    clearLastError: () => clearEmployeeError(),
    authSignIn,
    authSignOut,
    getCurrentUser
  };

  window.TaxiDataService = service;
  window.TaxiData = service;
})();
