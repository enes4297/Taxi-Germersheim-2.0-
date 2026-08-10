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
    const state = getState();
    return state.config || DEFAULT_CONFIG;
  }

  function isSupabaseConfigured() {
    const config = getBackendConfig();
    return Boolean(config.supabaseUrl && config.supabasePublishableKey);
  }

  function resolveBackendMode() {
    const config = getBackendConfig();
    if (config.backendType === "supabase" && isSupabaseConfigured()) return "supabase";
    if (config.backendMode === "supabase" && isSupabaseConfigured()) return "supabase";
    return "local";
  }

  function readState() {
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

  function getEmployees() {
    return getState().employees;
  }

  function getEmployee(employeeId) {
    return getEmployees().find((employee) => String(employee.id) === String(employeeId) || String(employee.employeeId) === String(employeeId)) || null;
  }

  function createEmployee(payload) {
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

  function updateEmployee(employeeId, updates) {
    const state = getState();
    const employee = state.employees.find((item) => String(item.id) === String(employeeId) || String(item.employeeId) === String(employeeId));
    if (!employee) return null;
    Object.assign(employee, normalizeEmployee({ ...employee, ...updates, id: employee.id, employeeId: employee.employeeId }));
    employee.updatedAt = nowIso();
    saveState(state);
    return employee;
  }

  function getVehicles() {
    const state = getState();
    if (state.vehicles && state.vehicles.length) return state.vehicles;
    state.vehicles = buildVehicleCatalog(state);
    saveState(state);
    return state.vehicles;
  }

  function getVehicle(vehicleId) {
    return getVehicles().find((vehicle) => String(vehicle.id) === String(vehicleId)) || null;
  }

  function saveShift(payload) {
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

  function publishPlan(payload) {
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
      getEmployees: () => [],
      getEmployee: () => null,
      createEmployee: () => null,
      updateEmployee: () => null,
      getVehicles: () => [],
      saveVehicle: () => null,
      getShifts: () => [],
      saveShift: () => null,
      createVacationRequest: () => null,
      approveVacationRequest: () => null,
      createSicknessReport: () => null,
      submitDocument: () => null,
      approveDocument: () => null,
      getNotifications: () => [],
      markNotificationRead: () => null,
      publishPlan: () => null
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
    getShifts: () => getState().shifts,
    saveShift,
    publishPlan,
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
    authSignIn,
    authSignOut,
    getCurrentUser
  };

  window.TaxiDataService = service;
  window.TaxiData = service;
})();
