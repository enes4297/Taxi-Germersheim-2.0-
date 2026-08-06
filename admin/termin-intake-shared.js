(() => {
  const KEY = "adminV24QuickIntake";
  const CUSTOMER_KEY = "adminSharedCustomersV14";
  const COCKPIT_KEY = "adminTerminCockpitV22Phase1";
  const LIVE_DISPO_KEY = "adminLiveDispoV131";

  const STATUS = {
    quick: "schnell notiert",
    draft: "unvollständiger Entwurf",
    review: "muss geprüft werden",
    complete: "vollständig",
    released: "für Planung freigegeben",
    planned: "bereits eingeplant"
  };

  const COMPLETENESS = {
    sufficient: "ausreichend",
    partial: "teilweise vollständig",
    missing: "wichtige Angabe fehlt",
    notPlanable: "nicht planbar"
  };

  const DEMO_SPEECH_EXAMPLES = [
    "Herr Kühne morgen um 12:30 Uhr in Sondernheim abholen und nach Schwetzingen zum Arzt fahren. Rückfahrt nach Termin.",
    "Frau Demir übermorgen halb neun von Germersheim zum Dialysezentrum Südpfalz. Rückfahrt offen.",
    "Müller heute gegen 14 Uhr Flughafen Frankfurt, wieder abholen wenn gelandet."
  ];

  function safeParse(raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalize(value) {
    return String(value || "")
      .toLocaleLowerCase("de-DE")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function todayIso() {
    return new Date().toISOString().slice(0, 10);
  }

  function addDaysIso(baseIso, plus) {
    const d = new Date(`${baseIso}T00:00:00`);
    d.setDate(d.getDate() + plus);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function nowStamp() {
    const d = new Date();
    return `${todayIso()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }

  function uid(prefix) {
    return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
  }

  function loadCustomers() {
    const parsed = safeParse(localStorage.getItem(CUSTOMER_KEY));
    return Array.isArray(parsed) ? parsed : [];
  }

  function createDefaultState() {
    const demoNote = parseSpeechDemo(DEMO_SPEECH_EXAMPLES[0]);
    const demoEntry = buildEntry({
      mode: "speech",
      source: "Demo",
      rawNote: DEMO_SPEECH_EXAMPLES[0],
      recognized: demoNote,
      status: STATUS.review,
      reminder: "heute",
      priority: "hoch"
    });
    return {
      version: 1,
      updatedAt: nowStamp(),
      entries: [demoEntry],
      ui: {
        selectedEntryId: demoEntry.id,
        preferredMode: "speech"
      }
    };
  }

  function ensureShape(state) {
    const next = state && typeof state === "object" ? state : createDefaultState();
    next.entries = Array.isArray(next.entries) ? next.entries.map(normalizeEntryShape) : [];
    next.ui = next.ui && typeof next.ui === "object" ? next.ui : { selectedEntryId: "", preferredMode: "speech" };
    next.updatedAt = next.updatedAt || nowStamp();
    return next;
  }

  function loadState() {
    const parsed = safeParse(localStorage.getItem(KEY));
    if (!parsed) {
      const fresh = createDefaultState();
      saveState(fresh);
      return fresh;
    }
    return ensureShape(parsed);
  }

  function saveState(state) {
    state.updatedAt = nowStamp();
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  function buildEntry(payload) {
    const recognized = payload.recognized || {};
    const entry = {
      id: uid("QI"),
      mode: payload.mode || "note",
      source: payload.source || "Unbekannt",
      createdAt: nowStamp(),
      updatedAt: nowStamp(),
      rawNote: payload.rawNote || "",
      transcriptDemo: payload.transcriptDemo || "",
      audioMeta: payload.audioMeta || null,
      recognized: {
        customer: recognized.customer || "",
        date: recognized.date || "",
        dateLabel: recognized.dateLabel || "",
        time: recognized.time || "",
        timeLabel: recognized.timeLabel || "",
        timeOpen: Boolean(recognized.timeOpen),
        timeUnclear: Boolean(recognized.timeUnclear),
        pickup: recognized.pickup || "",
        destination: recognized.destination || "",
        rideType: recognized.rideType || "Taxi",
        returnTrip: Boolean(recognized.returnTrip),
        returnTripStatus: recognized.returnTripStatus || "noch ungeklärt",
        phone: recognized.phone || "",
        wheelchair: Boolean(recognized.wheelchair),
        persons: Number(recognized.persons || 1),
        note: recognized.note || payload.rawNote || "",
        insurance: recognized.insurance || "",
        priority: recognized.priority || payload.priority || "mittel"
      },
      reminder: payload.reminder || "",
      linkedCustomerId: payload.linkedCustomerId || "",
      linkedAppointmentId: payload.linkedAppointmentId || "",
      savedAsTask: false,
      urgent: false,
      status: payload.status || STATUS.draft,
      completeness: COMPLETENESS.partial,
      missing: [],
      hints: [],
      reviewNote: payload.reviewNote || "",
      deleted: false,
      dataOrigin: payload.dataOrigin || "lokale Demo",
      aiPrepared: {
        speechToText: true,
        entityExtraction: true,
        duplicateCheck: true,
        returnTripDetection: true,
        customerMatching: true,
        plausibilityCheck: true
      }
    };
    return normalizeEntryShape(entry);
  }

  function parseWeekday(text) {
    const weekdays = {
      montag: 1,
      dienstag: 2,
      mittwoch: 3,
      donnerstag: 4,
      freitag: 5,
      samstag: 6,
      sonntag: 0
    };
    const norm = normalize(text);
    const found = Object.keys(weekdays).find((key) => norm.includes(key));
    if (!found) return { date: "", label: "" };
    const targetDay = weekdays[found];
    const today = new Date(`${todayIso()}T00:00:00`);
    const current = today.getDay();
    let diff = targetDay - current;
    if (diff <= 0) diff += 7;
    const next = addDaysIso(todayIso(), diff);
    return { date: next, label: `nächsten ${found.charAt(0).toUpperCase()}${found.slice(1)}` };
  }

  function parseDatePhrase(text) {
    const norm = normalize(text);
    if (norm.includes("ubermorgen") || norm.includes("übermorgen")) return { date: addDaysIso(todayIso(), 2), label: "übermorgen" };
    if (norm.includes("morgen")) return { date: addDaysIso(todayIso(), 1), label: "morgen" };
    if (norm.includes("heute")) return { date: todayIso(), label: "heute" };
    return parseWeekday(text);
  }

  function parseTimePhrase(text) {
    const raw = String(text || "");
    const exact = raw.match(/(\d{1,2})[:.](\d{2})/);
    if (exact) {
      return {
        time: `${String(Number(exact[1])).padStart(2, "0")}:${String(Number(exact[2])).padStart(2, "0")}`,
        label: `${exact[1]}:${exact[2]} Uhr`,
        open: false,
        unclear: false
      };
    }
    const hour = raw.match(/um\s+(\d{1,2})\s*uhr/i);
    if (hour) {
      return {
        time: `${String(Number(hour[1])).padStart(2, "0")}:00`,
        label: `${hour[1]} Uhr`,
        open: false,
        unclear: false
      };
    }
    const approx = raw.match(/gegen\s+(\d{1,2})\s*uhr/i);
    if (approx) {
      return {
        time: `${String(Number(approx[1])).padStart(2, "0")}:00`,
        label: `gegen ${approx[1]} Uhr`,
        open: false,
        unclear: true
      };
    }
    const half = raw.match(/halb\s+([a-zäöüß]+)/i);
    if (half) {
      const wordMap = {
        eins: 1, zwei: 2, drei: 3, vier: 4, fünf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10, elf: 11, zwölf: 12
      };
      const nextHour = wordMap[normalize(half[1])];
      if (nextHour) {
        const hourValue = nextHour - 1;
        return {
          time: `${String(hourValue).padStart(2, "0")}:30`,
          label: `halb ${half[1]}`,
          open: false,
          unclear: false
        };
      }
    }
    if (normalize(raw).includes("nach dem termin")) {
      return { time: "", label: "nach dem Termin", open: true, unclear: true };
    }
    if (normalize(raw).includes("mittag")) {
      return { time: "12:00", label: "gegen Mittag", open: false, unclear: true };
    }
    return { time: "", label: "", open: false, unclear: false };
  }

  function parseLocations(text) {
    const raw = String(text || "");
    const matchA = raw.match(/in\s+(.+?)\s+abholen\s+und\s+nach\s+(.+?)(?:\s+zum|\.|$)/i);
    if (matchA) {
      return { pickup: matchA[1].trim(), destination: matchA[2].trim() };
    }
    const matchB = raw.match(/von\s+(.+?)\s+nach\s+(.+?)(?:\.|$)/i);
    if (matchB) {
      return { pickup: matchB[1].trim(), destination: matchB[2].trim() };
    }
    const pickup = raw.match(/abholen\s+in\s+(.+?)(?:\.|$)/i);
    const destination = raw.match(/nach\s+(.+?)(?:\.|$)/i);
    return {
      pickup: pickup ? pickup[1].trim() : "",
      destination: destination ? destination[1].trim() : ""
    };
  }

  function detectRideType(text) {
    const norm = normalize(text);
    if (norm.includes("dialyse") || norm.includes("arzt") || norm.includes("chemo") || norm.includes("strahlen") || norm.includes("krankenhaus") || norm.includes("klinik")) return "Krankenfahrt";
    if (norm.includes("flughafen")) return "Flughafenfahrt";
    if (norm.includes("bahnhof") || norm.includes("bahn")) return "Bahntransfer";
    if (norm.includes("firma") || norm.includes("kostenstelle")) return "Firmenfahrt";
    return "Taxi";
  }

  function detectReturnTrip(text) {
    const norm = normalize(text);
    if (norm.includes("ruckfahrt offen") || norm.includes("rueckfahrt offen")) return { flag: true, status: "offene Rückfahrt" };
    if (norm.includes("wieder abholen")) return { flag: true, status: "Rückruf erforderlich" };
    if (norm.includes("nach dem termin") || norm.includes("ruckfahrt") || norm.includes("rueckfahrt")) return { flag: true, status: "offene Rückfahrt" };
    return { flag: false, status: "noch ungeklärt" };
  }

  function parseCustomerName(text) {
    const raw = String(text || "");
    const honorific = raw.match(/(Herr|Frau)\s+([A-ZÄÖÜ][a-zäöüßA-ZÄÖÜ-]+)/i);
    if (honorific) return `${honorific[1]} ${honorific[2]}`.trim();
    const firstWord = raw.match(/^([A-ZÄÖÜ][a-zäöüßA-ZÄÖÜ-]+)/);
    return firstWord ? firstWord[1] : "";
  }

  function parseSpeechDemo(text) {
    const date = parseDatePhrase(text);
    const time = parseTimePhrase(text);
    const loc = parseLocations(text);
    const ret = detectReturnTrip(text);
    return {
      customer: parseCustomerName(text),
      date: date.date,
      dateLabel: date.label,
      time: time.time,
      timeLabel: time.label,
      timeOpen: time.open,
      timeUnclear: time.unclear,
      pickup: loc.pickup,
      destination: loc.destination,
      rideType: detectRideType(text),
      returnTrip: ret.flag,
      returnTripStatus: ret.status,
      wheelchair: normalize(text).includes("rollstuhl"),
      persons: 1,
      note: "Automatisch erkannt – bitte kurz prüfen.",
      priority: date.date === todayIso() ? "dringend" : "mittel"
    };
  }

  function suggestCustomers(query, limit = 5) {
    const q = normalize(query).trim();
    if (!q) return [];
    return loadCustomers()
      .map((customer) => {
        const label = customer.displayName || `${customer.firstName || ""} ${customer.lastName || ""}`.trim();
        const haystack = normalize([label, customer.phone, customer.favoriteDestination, ...((customer.addresses || []).map((a) => a.fullAddress || ""))].join(" "));
        return { customer, label, score: haystack.includes(q) ? 10 : 0 };
      })
      .filter((row) => row.score > 0)
      .slice(0, limit)
      .map((row) => row.customer);
  }

  function mapCustomerCard(customer) {
    const label = customer.displayName || `${customer.firstName || ""} ${customer.lastName || ""}`.trim();
    const lastRide = customer.rides && customer.rides[0] ? customer.rides[0] : null;
    const address = customer.addresses && customer.addresses[0] ? customer.addresses[0].fullAddress : "";
    return {
      id: customer.id,
      name: label,
      phone: customer.phone || "",
      mainAddress: address || "",
      lastRide: lastRide ? `${lastRide.date} ${lastRide.time} · ${lastRide.pickup} → ${lastRide.destination}` : "-",
      frequentDestination: customer.favoriteDestination || "-",
      hint: customer.importantHint || ""
    };
  }

  function findMissing(recognized) {
    const missing = [];
    if (!recognized.customer) missing.push("Kunde nicht eindeutig erkannt");
    if (!recognized.date) missing.push("Datum fehlt");
    if (!recognized.time && !recognized.timeOpen) missing.push("Uhrzeit fehlt");
    if (recognized.timeUnclear) missing.push("Uhrzeit unklar");
    if (!recognized.pickup) missing.push("Abholort fehlt");
    if (!recognized.destination) missing.push("Ziel fehlt");
    return missing;
  }

  function deriveCompleteness(entry) {
    const missing = findMissing(entry.recognized);
    let completeness = COMPLETENESS.sufficient;
    let status = entry.status || STATUS.complete;

    if (!entry.recognized.customer && !entry.rawNote) {
      completeness = COMPLETENESS.notPlanable;
      status = STATUS.quick;
    } else if (missing.length >= 3) {
      completeness = COMPLETENESS.notPlanable;
      status = STATUS.review;
    } else if (missing.length >= 1) {
      completeness = missing.some((m) => m.includes("Ziel") || m.includes("Abholort") || m.includes("Uhrzeit")) ? COMPLETENESS.missing : COMPLETENESS.partial;
      if (!entry.linkedAppointmentId) status = STATUS.draft;
    } else {
      completeness = COMPLETENESS.sufficient;
      if (![STATUS.released, STATUS.planned].includes(status)) status = STATUS.complete;
    }

    if (entry.recognized.timeOpen && !entry.recognized.time) {
      completeness = COMPLETENESS.partial;
      if (![STATUS.released, STATUS.planned].includes(status)) status = STATUS.review;
    }

    return { missing, completeness, status };
  }

  function detectUrgent(entry) {
    const date = entry.recognized.date;
    const time = entry.recognized.time;
    if (!date) return false;
    if (date === todayIso()) return true;
    if (date === addDaysIso(todayIso(), 1) && time && Number(time.split(":")[0]) <= 9) return true;
    return normalize(entry.recognized.priority).includes("dringend");
  }

  function duplicateHints(entry, entries) {
    return entries.filter((other) => other.id !== entry.id && !other.deleted)
      .filter((other) => {
        const sameName = normalize(other.recognized.customer) && normalize(other.recognized.customer) === normalize(entry.recognized.customer);
        const sameDate = other.recognized.date && other.recognized.date === entry.recognized.date;
        const sameTime = other.recognized.time && other.recognized.time === entry.recognized.time;
        return sameName && sameDate && sameTime;
      })
      .map((other) => `Mögliche Dublette mit ${other.recognized.customer || other.rawNote}`);
  }

  function normalizeEntryShape(entry, allEntries) {
    const next = deepClone(entry);
    const derived = deriveCompleteness(next);
    next.missing = derived.missing;
    next.completeness = derived.completeness;
    next.status = [STATUS.released, STATUS.planned].includes(next.status) ? next.status : derived.status;
    next.urgent = detectUrgent(next);
    const customers = suggestCustomers(next.recognized.customer || next.rawNote || "", 4).map(mapCustomerCard);
    next.customerSuggestions = customers;
    next.hints = [
      ...(next.recognized.timeUnclear ? ["Uhrzeit muss geprüft werden"] : []),
      ...(next.recognized.returnTrip && next.recognized.returnTripStatus === "offene Rückfahrt" ? ["Rückfahrt offen"] : []),
      ...duplicateHints(next, allEntries || [])
    ];
    return next;
  }

  function normalizeAllEntries(entries) {
    const base = entries.map((entry) => deepClone(entry));
    return base.map((entry) => normalizeEntryShape(entry, base)).sort((a, b) => {
      if (a.deleted !== b.deleted) return a.deleted ? 1 : -1;
      if (a.urgent !== b.urgent) return a.urgent ? -1 : 1;
      return String(b.createdAt || "").localeCompare(String(a.createdAt || ""), "de");
    });
  }

  function addEntry(state, payload) {
    const row = buildEntry(payload);
    state.entries = normalizeAllEntries([row, ...state.entries]);
    state.ui.selectedEntryId = row.id;
    saveState(state);
    return row;
  }

  function updateEntry(state, entryId, patch) {
    state.entries = normalizeAllEntries(state.entries.map((entry) => entry.id === entryId ? { ...entry, ...patch, recognized: { ...entry.recognized, ...(patch.recognized || {}) }, updatedAt: nowStamp() } : entry));
    saveState(state);
    return state.entries.find((entry) => entry.id === entryId) || null;
  }

  function deleteEntry(state, entryId) {
    return updateEntry(state, entryId, { deleted: true, reviewNote: "Gelöscht" });
  }

  function postponeEntry(state, entryId, reminder) {
    return updateEntry(state, entryId, { reminder, status: STATUS.review });
  }

  function linkCustomer(state, entryId, customerId, useLastRide) {
    const customer = loadCustomers().find((row) => row.id === customerId);
    if (!customer) return null;
    const lastRide = useLastRide && customer.rides && customer.rides[0] ? customer.rides[0] : null;
    return updateEntry(state, entryId, {
      linkedCustomerId: customerId,
      recognized: {
        customer: customer.displayName || `${customer.firstName || ""} ${customer.lastName || ""}`.trim(),
        phone: customer.phone || "",
        pickup: lastRide ? lastRide.pickup : (customer.addresses && customer.addresses[0] ? customer.addresses[0].fullAddress : ""),
        destination: lastRide ? lastRide.destination : (customer.favoriteDestination || ""),
        rideType: lastRide ? lastRide.rideType : undefined
      }
    });
  }

  function saveAsTask(state, entryId) {
    return updateEntry(state, entryId, { savedAsTask: true, reviewNote: "Als Aufgabe gespeichert" });
  }

  function canRelease(entry) {
    const r = entry.recognized;
    return Boolean(r.date && (r.time || r.timeOpen) && r.pickup && r.destination);
  }

  function loadCockpit() {
    const parsed = safeParse(localStorage.getItem(COCKPIT_KEY)) || {};
    parsed.appointments = Array.isArray(parsed.appointments) ? parsed.appointments : [];
    parsed.suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
    parsed.dayPlan = Array.isArray(parsed.dayPlan) ? parsed.dayPlan : [];
    return parsed;
  }

  function releaseToPlanning(state, entryId) {
    const entry = state.entries.find((row) => row.id === entryId);
    if (!entry || !canRelease(entry)) return { ok: false, reason: "Eintrag ist noch nicht vollständig genug" };

    const cockpit = loadCockpit();
    let appointmentId = entry.linkedAppointmentId;
    const existing = appointmentId ? cockpit.appointments.find((row) => row.id === appointmentId) : null;
    const row = existing || {
      id: appointmentId || uid("AP"),
      createdAt: new Date().toISOString()
    };

    row.name = entry.recognized.customer || "Unbekannter Termin";
    row.pickup = entry.recognized.pickup;
    row.destination = entry.recognized.destination;
    row.date = entry.recognized.date;
    row.time = entry.recognized.time || "offen";
    row.phone = entry.recognized.phone || "";
    row.medical = normalize(entry.recognized.rideType).includes("kranken") || normalize(entry.recognized.rideType).includes("dialyse");
    row.wheelchair = Boolean(entry.recognized.wheelchair);
    row.note = [entry.recognized.note, entry.rawNote, entry.recognized.returnTrip ? `Rückfahrt: ${entry.recognized.returnTripStatus}` : ""].filter(Boolean).join(" | ");
    row.status = "Noch ungeplant";
    row.rideType = entry.recognized.rideType || "Taxi";
    row.returnTrip = Boolean(entry.recognized.returnTrip);
    row.returnTripStatus = entry.recognized.returnTripStatus || "noch ungeklärt";
    row.persons = Number(entry.recognized.persons || 1);
    row.priority = entry.urgent ? "Hoch" : "Mittel";
    row.openTime = Boolean(entry.recognized.timeOpen || entry.recognized.timeUnclear || !entry.recognized.time);
    row.sourceDraftId = entry.id;

    if (!existing) cockpit.appointments.push(row);
    localStorage.setItem(COCKPIT_KEY, JSON.stringify(cockpit));

    const live = safeParse(localStorage.getItem(LIVE_DISPO_KEY)) || {};
    live.events = Array.isArray(live.events) ? live.events : [];
    live.notifications = Array.isArray(live.notifications) ? live.notifications : [];
    live.sequence = live.sequence && typeof live.sequence === "object" ? live.sequence : {};

    if (entry.urgent) {
      live.sequence.notification = Number(live.sequence.notification || 0) + 1;
      live.notifications.unshift({
        id: `NT-${live.sequence.notification}`,
        priority: "Hoch",
        title: "Dringender mobiler Termin",
        text: `${row.name} ${row.time} ${row.pickup} → ${row.destination}`,
        refType: "appointment",
        refId: row.id,
        read: false,
        time: nowStamp().split(" ")[1]
      });
      localStorage.setItem(LIVE_DISPO_KEY, JSON.stringify(live));
    }

    updateEntry(state, entryId, { linkedAppointmentId: row.id, status: STATUS.released, reviewNote: "Für Planung freigegeben" });
    return { ok: true, appointmentId: row.id };
  }

  function markPlanned(state, entryId) {
    return updateEntry(state, entryId, { status: STATUS.planned, reviewNote: "Bereits eingeplant" });
  }

  function getStats(entries) {
    const rows = entries.filter((entry) => !entry.deleted && [STATUS.quick, STATUS.draft, STATUS.review, STATUS.complete].includes(entry.status));
    return {
      total: rows.length,
      today: rows.filter((entry) => String(entry.createdAt || "").startsWith(todayIso())).length,
      urgent: rows.filter((entry) => entry.urgent).length,
      completeEnough: rows.filter((entry) => canRelease(entry)).length,
      missing: rows.filter((entry) => entry.missing.length > 0).length
    };
  }

  window.AdminQuickIntakeDemo = {
    KEY,
    STATUS,
    COMPLETENESS,
    DEMO_SPEECH_EXAMPLES,
    normalize,
    todayIso,
    addDaysIso,
    nowStamp,
    loadState,
    saveState,
    suggestCustomers,
    mapCustomerCard,
    parseSpeechDemo,
    buildEntry,
    addEntry,
    updateEntry,
    deleteEntry,
    postponeEntry,
    linkCustomer,
    saveAsTask,
    canRelease,
    releaseToPlanning,
    markPlanned,
    getStats,
    normalizeAllEntries
  };
})();
