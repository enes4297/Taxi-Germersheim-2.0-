// portal-versandbestaetigungen.spec.mjs
//
// Browsertests fuer die Rueckmeldungen im Mitarbeiterportal.
//
// Grundregel, die hier geprueft wird:
//   Eine Speicherung im Browser ist KEINE Uebermittlung. Erfolg wird nur
//   gemeldet, wenn das Backend einen gespeicherten Datensatz mit id bestaetigt.
//
// Isolation
//   Es wird nie eine echte Supabase-Verbindung aufgebaut. Die Skripte
//   supabase-config.js und employee-supabase.js werden durch Stubs ersetzt,
//   deren Verhalten pro Test ueber window.__TG_TEST gesteuert wird. Es
//   entstehen keine produktiven Antraege und keine hochgeladenen Dateien.

import { test, expect } from "@playwright/test";

const PORTAL = "/fahrer/mitarbeiter.html";

const NOT_TRANSMITTED = "Noch nicht übermittelt. Bitte melde dich direkt bei der Zentrale.";
const VAC_ERROR =
  "Urlaubsantrag konnte nicht übermittelt werden. Bitte versuche es noch einmal oder melde dich direkt bei der Zentrale.";
const VAC_SUCCESS = "✓ Urlaubsantrag wurde übermittelt und liegt der Zentrale vor.";

/* Stub fuer ../admin/supabase-config.js */
function configStub(configured) {
  return `window.TaxiSupabaseConfig = {
    url: "http://127.0.0.1/not-used",
    publishableKey: "test-only",
    isConfigured: ${configured ? "true" : "false"},
    client: null
  };`;
}

/* Stub fuer employee-supabase.js. Verhalten kommt aus window.__TG_TEST. */
const ES_STUB = `
(() => {
  const T = window.__TG_TEST || {};
  window.__TG_CALLS = { createVacationRequest: [], createSicknessReport: [], uploadDocumentSubmission: [] };

  async function createVacationRequest(payload) {
    window.__TG_CALLS.createVacationRequest.push(payload);
    const mode = (window.__TG_TEST || {}).vacationMode || "success";
    if (mode === "throw") throw new Error("Netzwerk nicht erreichbar");
    if (mode === "backend-error") return { ok: false, error: "INSERT_FAILED" };
    if (mode === "ok-without-row") return { ok: true, data: {} };
    if (mode === "ok-null-data") return { ok: true, data: null };
    const row = {
      id: "11111111-2222-4333-8444-555555555555",
      employee_id: T.employeeId,
      start_date: payload.startDate,
      end_date: payload.endDate,
      note: payload.note || null,
      status: "requested"
    };
    (window.__TG_TEST.vacationRequests = window.__TG_TEST.vacationRequests || []).push(row);
    return { ok: true, data: row };
  }

  async function createSicknessReport(payload) {
    window.__TG_CALLS.createSicknessReport.push(payload);
    const mode = (window.__TG_TEST || {}).sicknessMode || "success";
    if (mode === "throw") throw new Error("Netzwerk nicht erreichbar");
    if (mode === "backend-error") return { ok: false, error: "INSERT_FAILED" };
    if (mode === "ok-without-row") return { ok: true, data: {} };
    /* Verlorene Antwort: Der Server hatte beim ersten Mal bereits
       gespeichert. Die echte Implementierung erkennt das an SQLSTATE 23505
       und gibt den vorhandenen Datensatz zurueck, statt einen zweiten
       anzulegen. */
    if (mode === "duplicate") {
      const vorhanden = (window.__TG_TEST.sicknessReports || [])
        .find((r) => r.start_date === payload.startDate) || {
          id: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
          start_date: payload.startDate, status: "submitted"
        };
      return { ok: true, data: vorhanden, deduplicated: true };
    }
    const row = {
      id: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
      employee_id: T.employeeId,
      start_date: payload.startDate,
      expected_end_date: payload.expectedEndDate || null,
      note: payload.note || null,
      submission_source: "Mitarbeiterportal",
      status: "submitted",
      created_at: new Date().toISOString()
    };
    (window.__TG_TEST.sicknessReports = window.__TG_TEST.sicknessReports || []).push(row);
    return { ok: true, data: row };
  }

  async function uploadDocumentSubmission(payload) {
    const T2 = window.__TG_TEST || {};
    window.__TG_CALLS.uploadDocumentSubmission.push({
      name: payload.file?.name, size: payload.file?.size, type: payload.file?.type,
      documentTypeId: payload.documentTypeId, note: payload.note
    });
    const mode = T2.uploadMode || "success";
    /* Die Groessen- und Typpruefung sitzt in der echten Implementierung vor
       dem Netzaufruf - hier gleich nachgebildet. */
    if (!payload.file) return { ok: false, error: "NO_FILE" };
    if (payload.file.size > 10 * 1024 * 1024) return { ok: false, error: "FILE_TOO_LARGE" };
    if (!["application/pdf", "image/jpeg", "image/png"].includes(payload.file.type)) {
      return { ok: false, error: "FILE_TYPE_NOT_ALLOWED" };
    }
    if (mode === "throw") throw new Error("Netzwerk nicht erreichbar");
    if (mode === "upload-error") return { ok: false, error: "UPLOAD_FAILED", stage: "upload" };
    if (mode === "record-error") return { ok: false, error: "INSERT_FAILED", stage: "record", cleaned: true };
    if (mode === "record-error-dirty") return { ok: false, error: "INSERT_FAILED", stage: "record", cleaned: false };

    const row = {
      id: "dddddddd-eeee-4fff-8aaa-" + String(window.__TG_CALLS.uploadDocumentSubmission.length).padStart(12, "0"),
      employee_id: T2.employeeId,
      document_type_id: payload.documentTypeId,
      file_path: T2.authUserId + "/2099/" + payload.file.name,
      file_name: payload.file.name,
      mime_type: payload.file.type,
      status: "submitted",
      note: payload.note || null,
      submitted_at: new Date().toISOString(),
      document_types: { label: "Krankenschein / AU" }
    };
    (window.__TG_TEST.documentSubmissions = window.__TG_TEST.documentSubmissions || []).push(row);
    return { ok: true, data: row };
  }

  window.EmployeeSupabase = {
    isConfigured: () => Boolean((window.__TG_TEST || {}).configured),
    getMySicknessReports: async () => ((window.__TG_TEST || {}).sicknessReports || []).slice(),
    createSicknessReport,
    getDocumentTypes: async () => ((window.__TG_TEST || {}).documentTypes || []).slice(),
    getMyDocumentSubmissions: async () => ((window.__TG_TEST || {}).documentSubmissions || []).slice(),
    uploadDocumentSubmission,
    getSignedDocumentUrl: async (path) =>
      (window.__TG_TEST || {}).signedUrlFails ? null : "/fahrer/manifest.webmanifest?signed=" + encodeURIComponent(path || ""),
    signIn: async () => ({ user: { id: T.authUserId }, employeeId: T.employeeId }),
    checkSession: async () =>
      (window.__TG_TEST || {}).configured
        ? { user: { id: T.authUserId }, employeeId: T.employeeId }
        : null,
    signOut: async () => {},
    getMyEmployee: async () => ({
      id: T.employeeId,
      first_name: "Test",
      last_name: "Mitarbeiter",
      employment_type: "vollzeit",
      status: "active"
    }),
    getMyPublishedShifts: async () => [],
    getMyVacationRequests: async () => ((window.__TG_TEST || {}).vacationRequests || []).slice(),
    createVacationRequest,
    getVehicle: async () => null,
    isPlanPublished: async () => false
  };
})();
`;

/**
 * Baut eine isolierte Portalseite auf.
 * configured=true  -> Supabase-Modus mit Stub-Backend
 * configured=false -> lokaler Modus ohne Backend
 */
async function openPortal(page, { configured = true, vacationMode = "success", sicknessMode = "success", uploadMode = "success" } = {}) {
  await page.route("**/admin/supabase-config.js", (route) =>
    route.fulfill({ status: 200, contentType: "text/javascript", body: configStub(configured) })
  );
  await page.route("**/fahrer/employee-supabase.js", (route) =>
    route.fulfill({ status: 200, contentType: "text/javascript", body: ES_STUB })
  );

  await page.addInitScript(
    (cfg) => {
      window.__TG_TEST = cfg;
      /* Marker fuer den lokalen Modus, sonst leitet requireDemoSession um. */
      try {
        localStorage.setItem(
          "tgEmployeeDemoSession",
          JSON.stringify({ authenticated: true, provider: cfg.configured ? "supabase" : "demo" })
        );
      } catch {}
    },
    {
      configured,
      vacationMode,
      authUserId: "33333333-3333-4333-8333-333333333333",
      employeeId: configured ? "e0000000-0000-4000-8000-0000000000e1" : "MA-101",
      vacationRequests: [],
      sicknessReports: [],
      sicknessMode,
      uploadMode,
      documentSubmissions: [],
      documentTypes: [
        { id: "t-fuehrerschein", key: "fuehrerschein", label: "Führerschein" },
        { id: "t-pbschein", key: "personenbefoerderungsschein", label: "Personenbeförderungsschein" },
        { id: "t-krankenschein", key: "krankenschein_au", label: "Krankenschein / AU" },
        { id: "t-sonstiges", key: "sonstiges", label: "Sonstiges" }
      ]
    }
  );

  await page.goto(PORTAL);
  await expect(page.locator("body")).not.toHaveAttribute("data-portal-loading", /.*/);
}

/* Ein offener Drawer legt ein Overlay ueber die Kacheln. Vor dem Wechsel in
   einen anderen Bereich muss er geschlossen werden - so wie es auch eine
   Person tun wuerde. */
async function closeDrawerIfOpen(page) {
  const overlay = page.locator("[data-portal-overlay]");
  if (!(await overlay.isVisible().catch(() => false))) return;
  /* Ueber den sichtbaren Schliessen-Button des offenen Bereichs. Der
     Backdrop liegt hinter dem Drawer und ist nicht anklickbar. */
  await page
    .locator('[data-portal-section]:not([hidden]) button[data-portal-close-drawer]')
    .first()
    .click();
  await expect(overlay).toBeHidden();
}

async function openSection(page, name) {
  await closeDrawerIfOpen(page);
  await page.click(`[data-portal-quick-action="${name}"]`);
  await expect(page.locator(`[data-portal-section="${name}"]`)).toBeVisible();
}

async function fillVacation(page, start = "2099-03-01", end = "2099-03-05") {
  await page.fill('[data-portal-vac-form] input[name="start"]', start);
  await page.fill('[data-portal-vac-form] input[name="end"]', end);
}

/* --------------------------------------------------------------------- */
/* 1. Erfolgreicher Urlaubsantrag                                        */
/* --------------------------------------------------------------------- */
test("T1 Urlaubsantrag mit bestaetigtem Datensatz meldet Erfolg", async ({ page }) => {
  await openPortal(page, { configured: true, vacationMode: "success" });
  await openSection(page, "urlaub");
  await fillVacation(page);
  await page.click('[data-portal-vac-form] button[type="submit"]');

  const fb = page.locator("[data-portal-vac-feedback]");
  await expect(fb).toBeVisible();
  await expect(fb).toHaveText(VAC_SUCCESS);
  await expect(fb).not.toHaveClass(/is-error/);
  await expect(fb).not.toHaveClass(/is-warning/);

  /* Modal bestaetigt die Uebermittlung */
  await expect(page.locator("[data-portal-modal-title]")).toHaveText("Urlaubsantrag übermittelt");

  /* Der uebermittelte Antrag darf NICHT als "Nicht uebermittelt" erscheinen */
  await expect(page.locator("[data-portal-vac-list]")).not.toContainText("Nicht übermittelt");
  await expect(page.locator("[data-portal-vac-list]")).toContainText("01.03.2099");
});

/* --------------------------------------------------------------------- */
/* 2. Backend meldet Fehler                                              */
/* --------------------------------------------------------------------- */
test("T2 Backend-Fehler meldet Fehler und keinen Erfolg", async ({ page }) => {
  await openPortal(page, { configured: true, vacationMode: "backend-error" });
  await openSection(page, "urlaub");
  await fillVacation(page);
  await page.click('[data-portal-vac-form] button[type="submit"]');

  const fb = page.locator("[data-portal-vac-feedback]");
  await expect(fb).toBeVisible();
  await expect(fb).toHaveText(VAC_ERROR);
  await expect(fb).toHaveClass(/is-error/);
  await expect(fb).not.toContainText("✓");

  /* Kein Erfolgs-Modal */
  await expect(page.locator("[data-portal-modal]")).toBeHidden();
});

/* --------------------------------------------------------------------- */
/* 3. ok ohne gespeicherten Datensatz  (Regression zur alten Fassung)    */
/* --------------------------------------------------------------------- */
test("T3 ok ohne Datensatz gilt als Fehler, nicht als Erfolg", async ({ page }) => {
  await openPortal(page, { configured: true, vacationMode: "ok-without-row" });
  await openSection(page, "urlaub");
  await fillVacation(page);
  await page.click('[data-portal-vac-form] button[type="submit"]');

  const fb = page.locator("[data-portal-vac-feedback]");
  await expect(fb).toHaveText(VAC_ERROR);
  await expect(fb).toHaveClass(/is-error/);
  await expect(page.locator("[data-portal-modal]")).toBeHidden();
});

test("T3b ok mit data null gilt ebenfalls als Fehler", async ({ page }) => {
  await openPortal(page, { configured: true, vacationMode: "ok-null-data" });
  await openSection(page, "urlaub");
  await fillVacation(page);
  await page.click('[data-portal-vac-form] button[type="submit"]');

  await expect(page.locator("[data-portal-vac-feedback]")).toHaveText(VAC_ERROR);
  await expect(page.locator("[data-portal-modal]")).toBeHidden();
});

/* --------------------------------------------------------------------- */
/* 4. Fehlende Verbindung                                                */
/* --------------------------------------------------------------------- */
test("T4 Netzwerkfehler meldet Fehler und stuerzt nicht ab", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));

  await openPortal(page, { configured: true, vacationMode: "throw" });
  await openSection(page, "urlaub");
  await fillVacation(page);
  await page.click('[data-portal-vac-form] button[type="submit"]');

  await expect(page.locator("[data-portal-vac-feedback]")).toHaveText(VAC_ERROR);
  await expect(page.locator("[data-portal-modal]")).toBeHidden();
  expect(pageErrors, "keine unbehandelten Seitenfehler").toEqual([]);

  /* Formularwerte bleiben erhalten, damit nichts verloren geht */
  await expect(page.locator('[data-portal-vac-form] input[name="start"]')).toHaveValue("2099-03-01");
});

/* --------------------------------------------------------------------- */
/* 5. Ungueltiger Zeitraum                                               */
/* --------------------------------------------------------------------- */
test("T5 ungueltiger Zeitraum wird abgelehnt und nichts gesendet", async ({ page }) => {
  await openPortal(page, { configured: true, vacationMode: "success" });
  await openSection(page, "urlaub");
  await fillVacation(page, "2099-03-10", "2099-03-01");
  await page.click('[data-portal-vac-form] button[type="submit"]');

  const fb = page.locator("[data-portal-vac-feedback]");
  await expect(fb).toHaveText("Bitte wähle einen gültigen Zeitraum.");
  await expect(fb).toHaveClass(/is-error/);

  const calls = await page.evaluate(() => window.__TG_CALLS.createVacationRequest.length);
  expect(calls, "Backend darf gar nicht erst aufgerufen werden").toBe(0);
});

/* --------------------------------------------------------------------- */
/* 6. Krankmeldung ohne Uebertragung                                     */
/* --------------------------------------------------------------------- */
async function fillSickness(page, start = "2099-04-01", end = "2099-04-03", note = "") {
  await page.fill('[data-portal-absence-form] input[name="start"]', start);
  await page.fill('[data-portal-absence-form] input[name="expectedEnd"]', end);
  if (note) await page.fill('[data-portal-absence-form] input[name="note"]', note);
}

test("T6 Krankmeldung wird uebermittelt und meldet Erfolg mit ID", async ({ page }) => {
  await openPortal(page, { configured: true, sicknessMode: "success" });
  await openSection(page, "krank");

  /* Hinweis zu Anhang und Grenzen ist bereits vor dem Absenden sichtbar */
  const notice = page.locator("[data-portal-absence-notice]");
  await expect(notice).toBeVisible();
  await expect(notice).toContainText("höchstens 10 MB");

  await fillSickness(page);
  await page.click('[data-portal-absence-form] button[type="submit"]');

  const fb = page.locator("[data-portal-absence-feedback]");
  await expect(fb).toBeVisible();
  await expect(fb).toContainText("Krankmeldung wurde übermittelt und liegt der Zentrale vor");
  await expect(fb).toContainText("Es wurde kein Nachweis angehängt");
  await expect(fb).not.toHaveClass(/is-error/);
  await expect(fb).not.toHaveClass(/is-warning/);
  await expect(page.locator("[data-portal-modal-title]")).toHaveText("Krankmeldung übermittelt");

  /* employee_id kommt NICHT aus dem Formular */
  const payload = await page.evaluate(() => window.__TG_CALLS.createSicknessReport[0]);
  expect(payload).toMatchObject({ startDate: "2099-04-01", expectedEndDate: "2099-04-03" });
  expect(Object.keys(payload)).not.toContain("employeeId");

  /* Liste zeigt den Eintrag als uebermittelt und ohne Anhang */
  const list = page.locator("[data-portal-absence-list]");
  await expect(list).toContainText("Übermittelt");
  await expect(list).toContainText("Ohne Anhang");
  await expect(list).not.toContainText("Nicht übermittelt");
});

test("T6b Krankmeldung: Backend-Fehler meldet keinen Erfolg, Eingaben bleiben", async ({ page }) => {
  await openPortal(page, { configured: true, sicknessMode: "backend-error" });
  await openSection(page, "krank");
  await fillSickness(page);
  await page.click('[data-portal-absence-form] button[type="submit"]');

  const fb = page.locator("[data-portal-absence-feedback]");
  await expect(fb).toContainText("Krankmeldung konnte nicht übermittelt werden");
  await expect(fb).toHaveClass(/is-error/);
  await expect(fb).not.toContainText("✓");
  await expect(page.locator("[data-portal-modal]")).toBeHidden();

  /* Eingaben erhalten */
  await expect(page.locator('[data-portal-absence-form] input[name="start"]')).toHaveValue("2099-04-01");
  await expect(page.locator('[data-portal-absence-form] input[name="expectedEnd"]')).toHaveValue("2099-04-03");
});

test("T6c Krankmeldung: ok ohne Datensatz gilt als Fehler", async ({ page }) => {
  await openPortal(page, { configured: true, sicknessMode: "ok-without-row" });
  await openSection(page, "krank");
  await fillSickness(page);
  await page.click('[data-portal-absence-form] button[type="submit"]');

  await expect(page.locator("[data-portal-absence-feedback]")).toContainText(
    "Krankmeldung konnte nicht übermittelt werden"
  );
  await expect(page.locator("[data-portal-modal]")).toBeHidden();
});

test("T6d Krankmeldung: Netzwerkfehler meldet Fehler und stuerzt nicht ab", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));

  await openPortal(page, { configured: true, sicknessMode: "throw" });
  await openSection(page, "krank");
  await fillSickness(page);
  await page.click('[data-portal-absence-form] button[type="submit"]');

  await expect(page.locator("[data-portal-absence-feedback]")).toContainText(
    "Krankmeldung konnte nicht übermittelt werden"
  );
  expect(pageErrors, "keine unbehandelten Seitenfehler").toEqual([]);
  /* Absenden ist nach dem Fehler wieder moeglich */
  await expect(page.locator('[data-portal-absence-form] button[type="submit"]')).toBeEnabled();
});

test("T6e Krankmeldung: Dateianhang ist verfuegbar und mit Grenzen beschriftet", async ({ page }) => {
  await openPortal(page, { configured: true });
  await openSection(page, "krank");

  const fileInput = page.locator('[data-portal-absence-form] input[type="file"]');
  await expect(fileInput).toBeEnabled();
  await expect(fileInput).toHaveAttribute("accept", /application\/pdf/);
  await expect(page.locator("[data-portal-absence-upload-hint]")).toContainText("höchstens 10 MB");
  await expect(page.locator("[data-portal-absence-upload-hint]")).toContainText("PDF, JPEG oder PNG");
});

test("T6f Krankmeldung erscheint nach dem Neuladen weiterhin", async ({ page }) => {
  await openPortal(page, { configured: true, sicknessMode: "success" });
  await openSection(page, "krank");
  await fillSickness(page, "2099-07-01", "2099-07-05");
  await page.click('[data-portal-absence-form] button[type="submit"]');
  await expect(page.locator("[data-portal-absence-list]")).toContainText("Übermittelt");

  /* Der Stub haelt die Meldung in window.__TG_TEST; nach dem Reload wird sie
     ueber getMySicknessReports erneut geladen. */
  const stored = await page.evaluate(() => window.__TG_TEST.sicknessReports);
  await page.addInitScript((rows) => {
    const wait = setInterval(() => {
      if (window.__TG_TEST) {
        window.__TG_TEST.sicknessReports = rows;
        clearInterval(wait);
      }
    }, 0);
  }, stored);

  await page.reload();
  await expect(page.locator("body")).not.toHaveAttribute("data-portal-loading", /.*/);
  await openSection(page, "krank");

  const list = page.locator("[data-portal-absence-list]");
  await expect(list).toContainText("01.07.2099");
  await expect(list).toContainText("Übermittelt");
});

test("T6g Krankmeldung ohne Backend meldet nicht uebermittelt", async ({ page }) => {
  await openPortal(page, { configured: false });
  await openSection(page, "krank");
  await fillSickness(page);
  await page.click('[data-portal-absence-form] button[type="submit"]');

  const fb = page.locator("[data-portal-absence-feedback]");
  await expect(fb).toHaveText(NOT_TRANSMITTED);
  await expect(fb).toHaveClass(/is-warning/);
  await expect(page.locator("[data-portal-absence-list]")).toContainText("Nicht übermittelt");
});

/* --------------------------------------------------------------------- */
/* 7. Dokument ohne Uebertragung                                         */
/* --------------------------------------------------------------------- */
test("T7 Dokument ohne Backend meldet nicht uebermittelt", async ({ page }) => {
  await openPortal(page, { configured: false });
  await openSection(page, "dokumente");

  await page.click('[data-portal-doc-form] button[type="submit"]');

  const fb = page.locator("[data-portal-doc-feedback]");
  await expect(fb).toBeVisible();
  await expect(fb).toHaveText(NOT_TRANSMITTED);
  await expect(fb).toHaveClass(/is-warning/);
  await expect(page.locator("[data-portal-modal-title]")).toHaveText("Noch nicht übermittelt");
});

/* --------------------------------------------------------------------- */
/* 8. Warnung wird nicht durch spaeteren Erfolg ueberschrieben           */
/* --------------------------------------------------------------------- */
test("T8 Fehlermeldung der Krankmeldung bleibt trotz spaeterem Urlaubserfolg stehen", async ({ page }) => {
  await openPortal(page, { configured: true, vacationMode: "success", sicknessMode: "backend-error" });

  /* Erst Krankmeldung -> Fehler */
  await openSection(page, "krank");
  await fillSickness(page);
  await page.click('[data-portal-absence-form] button[type="submit"]');
  await expect(page.locator("[data-portal-absence-feedback]")).toContainText(
    "Krankmeldung konnte nicht übermittelt werden"
  );

  /* Danach erfolgreicher Urlaubsantrag */
  await openSection(page, "urlaub");
  await fillVacation(page);
  await page.click('[data-portal-vac-form] button[type="submit"]');
  await expect(page.locator("[data-portal-vac-feedback]")).toHaveText(VAC_SUCCESS);

  /* Zurueck in die Krankmeldung: Die Fehlermeldung muss unveraendert dastehen
     und darf nicht durch die Erfolgsmeldung des Urlaubs ersetzt worden sein. */
  await page.click("[data-portal-close]");
  await openSection(page, "krank");

  const absFb = page.locator("[data-portal-absence-feedback]");
  await expect(absFb).toBeVisible();
  await expect(absFb).toContainText("Krankmeldung konnte nicht übermittelt werden");
  await expect(absFb).toHaveClass(/is-error/);
  await expect(absFb).not.toContainText("✓");
  await expect(page.locator("[data-portal-absence-notice]")).toBeVisible();
});

/* --------------------------------------------------------------------- */
/* 9. Fehler wird durch erneuten Erfolg im selben Formular ersetzt       */
/*    (und umgekehrt bleibt kein Erfolgsrest stehen)                     */
/* --------------------------------------------------------------------- */
test("T9 Fehlerklasse verschwindet bei erfolgreichem zweiten Versuch", async ({ page }) => {
  await openPortal(page, { configured: true, vacationMode: "backend-error" });
  await openSection(page, "urlaub");
  await fillVacation(page);
  await page.click('[data-portal-vac-form] button[type="submit"]');
  const fb = page.locator("[data-portal-vac-feedback]");
  await expect(fb).toHaveClass(/is-error/);

  /* Backend erholt sich, zweiter Versuch */
  await page.evaluate(() => { window.__TG_TEST.vacationMode = "success"; });
  await fillVacation(page);
  await page.click('[data-portal-vac-form] button[type="submit"]');

  await expect(fb).toHaveText(VAC_SUCCESS);
  await expect(fb).not.toHaveClass(/is-error/);
  await expect(fb).not.toHaveClass(/is-warning/);
});

/* --------------------------------------------------------------------- */
/* 10. Lokaler Modus: Urlaub ohne Backend meldet nicht gesendet          */
/* --------------------------------------------------------------------- */
test("T10 Urlaubsantrag ohne Backend meldet nicht uebermittelt", async ({ page }) => {
  await openPortal(page, { configured: false });
  await openSection(page, "urlaub");
  await fillVacation(page);
  await page.click('[data-portal-vac-form] button[type="submit"]');

  const fb = page.locator("[data-portal-vac-feedback]");
  await expect(fb).toHaveText(NOT_TRANSMITTED);
  await expect(fb).toHaveClass(/is-warning/);
  await expect(page.locator("[data-portal-modal-title]")).toHaveText("Noch nicht übermittelt");
  await expect(page.locator("[data-portal-vac-list]")).toContainText("Nicht übermittelt");
});

/* --------------------------------------------------------------------- */
/* 11. Bestehende lokale Eintraege bleiben erhalten und gekennzeichnet   */
/* --------------------------------------------------------------------- */
test("T11 lokale Eintraege ueberleben den Reload und bleiben gekennzeichnet", async ({ page }) => {
  await openPortal(page, { configured: false });

  await openSection(page, "krank");
  await page.fill('[data-portal-absence-form] input[name="start"]', "2099-05-01");
  await page.fill('[data-portal-absence-form] input[name="expectedEnd"]', "2099-05-04");
  await page.click('[data-portal-absence-form] button[type="submit"]');
  await expect(page.locator("[data-portal-absence-list]")).toContainText("Nicht übermittelt");
  await page.click("[data-portal-close]");

  /* Neu laden: Eintrag muss weiterhin vorhanden und gekennzeichnet sein */
  await page.reload();
  await expect(page.locator("body")).not.toHaveAttribute("data-portal-loading", /.*/);
  await openSection(page, "krank");

  const list = page.locator("[data-portal-absence-list]");
  await expect(list).toContainText("01.05.2099");
  await expect(list).toContainText("Nicht übermittelt");
  await expect(list).not.toContainText("gesendet");
});

/* --------------------------------------------------------------------- */
/* 12. Urlaub zurueckziehen bestaetigt keine Serveraenderung             */
/* --------------------------------------------------------------------- */
test("T12 Zuruecknahme im lokalen Modus meldet keinen Servererfolg", async ({ page }) => {
  await openPortal(page, { configured: false });
  await openSection(page, "urlaub");
  await fillVacation(page);
  await page.click('[data-portal-vac-form] button[type="submit"]');
  await page.click("[data-portal-close]");

  const withdraw = page.locator("[data-portal-vac-withdraw]").first();
  await expect(withdraw).toBeVisible();
  await withdraw.click();

  /* Kein Erfolgs-Modal, keine Erfolgsmeldung */
  await expect(page.locator("[data-portal-modal]")).toBeHidden();
  const fb = page.locator("[data-portal-vac-feedback]");
  await expect(fb).not.toContainText("übermittelt und liegt der Zentrale vor");
  await expect(fb).not.toContainText("✓ Urlaubsantrag");

  /* Der Eintrag bleibt sichtbar als nicht uebermittelt gekennzeichnet */
  await expect(page.locator("[data-portal-vac-list]")).toContainText("Nicht übermittelt");
});

/* --------------------------------------------------------------------- */
/* 13. Nirgends im Portal steht faelschlich "gesendet"                   */
/* --------------------------------------------------------------------- */
/* --------------------------------------------------------------------- */
/* U. Dokumentenupload                                                    */
/* --------------------------------------------------------------------- */
const PDF = { name: "nachweis.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 test") };
const ZU_GROSS = { name: "gross.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(11 * 1024 * 1024, 0x20) };
const FALSCHER_TYP = { name: "liste.txt", mimeType: "text/plain", buffer: Buffer.from("kein erlaubter Typ") };

async function setzeDatei(page, formSelector, datei) {
  await page.setInputFiles(`${formSelector} input[type="file"]`, datei);
}

test("U1 Dokumenttypen kommen aus der Datenbank", async ({ page }) => {
  await openPortal(page, { configured: true });
  await openSection(page, "dokumente");

  const karten = page.locator(".doc-type-grid [data-doc-type]");
  await expect(karten).toHaveCount(4);
  await expect(karten.nth(0)).toContainText("Führerschein");
  await expect(karten.nth(2)).toContainText("Krankenschein / AU");

  /* Das versteckte Feld traegt die ID, nicht die Beschriftung. */
  await expect(page.locator("[data-portal-doc-type-hidden]")).toHaveValue("t-fuehrerschein");
});

test("U2 Dokument wird hochgeladen und erst danach als uebermittelt gemeldet", async ({ page }) => {
  await openPortal(page, { configured: true, uploadMode: "success" });
  await openSection(page, "dokumente");
  await setzeDatei(page, "[data-portal-doc-form]", PDF);
  await page.click('[data-portal-doc-form] button[type="submit"]');

  const fb = page.locator("[data-portal-doc-feedback]");
  await expect(fb).toContainText("Dokument wurde übermittelt und liegt der Zentrale vor");
  await expect(fb).not.toHaveClass(/is-error/);
  await expect(page.locator("[data-portal-modal-title]")).toHaveText("Dokument übermittelt");

  const call = await page.evaluate(() => window.__TG_CALLS.uploadDocumentSubmission[0]);
  expect(call).toMatchObject({ name: "nachweis.pdf", type: "application/pdf", documentTypeId: "t-fuehrerschein" });

  const liste = page.locator("[data-portal-doc-list]");
  await expect(liste).toContainText("Übermittelt");
  await expect(liste).toContainText("nachweis.pdf");
  await expect(liste).not.toContainText("Nicht übermittelt");
});

test("U3 zu grosse Datei wird abgelehnt", async ({ page }) => {
  await openPortal(page, { configured: true });
  await openSection(page, "dokumente");
  await setzeDatei(page, "[data-portal-doc-form]", ZU_GROSS);
  await page.click('[data-portal-doc-form] button[type="submit"]');

  const fb = page.locator("[data-portal-doc-feedback]");
  await expect(fb).toContainText("größer als 10 MB");
  await expect(fb).toHaveClass(/is-error/);
  await expect(page.locator("[data-portal-modal]")).toBeHidden();
});

test("U4 unerlaubter Dateityp wird abgelehnt", async ({ page }) => {
  await openPortal(page, { configured: true });
  await openSection(page, "dokumente");
  await setzeDatei(page, "[data-portal-doc-form]", FALSCHER_TYP);
  await page.click('[data-portal-doc-form] button[type="submit"]');

  await expect(page.locator("[data-portal-doc-feedback]")).toContainText("Nur PDF, JPEG und PNG");
  await expect(page.locator("[data-portal-modal]")).toBeHidden();
});

test("U5 Teilfehler: Datei uebertragen, Datensatz gescheitert - kein Erfolg", async ({ page }) => {
  await openPortal(page, { configured: true, uploadMode: "record-error" });
  await openSection(page, "dokumente");
  await setzeDatei(page, "[data-portal-doc-form]", PDF);
  await page.click('[data-portal-doc-form] button[type="submit"]');

  const fb = page.locator("[data-portal-doc-feedback]");
  await expect(fb).toContainText("konnte aber nicht zugeordnet werden");
  await expect(fb).toContainText("Die hochgeladene Datei wurde wieder entfernt");
  await expect(fb).toHaveClass(/is-error/);
  await expect(page.locator("[data-portal-modal]")).toBeHidden();
  await expect(page.locator("[data-portal-doc-list]")).not.toContainText("Übermittelt");
});

test("U6 Teilfehler ohne Bereinigung verweist an die Zentrale", async ({ page }) => {
  await openPortal(page, { configured: true, uploadMode: "record-error-dirty" });
  await openSection(page, "dokumente");
  await setzeDatei(page, "[data-portal-doc-form]", PDF);
  await page.click('[data-portal-doc-form] button[type="submit"]');

  await expect(page.locator("[data-portal-doc-feedback]")).toContainText("Bitte melde dich bei der Zentrale");
});

test("U7 ohne Datei wird nichts hochgeladen", async ({ page }) => {
  await openPortal(page, { configured: true });
  await openSection(page, "dokumente");
  await page.click('[data-portal-doc-form] button[type="submit"]');

  await expect(page.locator("[data-portal-doc-feedback]")).toContainText("Bitte wähle zuerst eine Datei aus");
  const calls = await page.evaluate(() => window.__TG_CALLS.uploadDocumentSubmission.length);
  expect(calls).toBe(0);
});

test("U8 eigene Einreichung wird ueber eine signierte URL geoeffnet", async ({ page }) => {
  await openPortal(page, { configured: true });
  await openSection(page, "dokumente");
  await setzeDatei(page, "[data-portal-doc-form]", PDF);
  await page.click('[data-portal-doc-form] button[type="submit"]');
  await page.click("[data-portal-close]");

  const [popup] = await Promise.all([
    page.waitForEvent("popup"),
    page.click("[data-portal-doc-open]")
  ]);
  /* Das Fenster wird synchron im Klick geoeffnet (Popup-Blocker) und danach
     auf die signierte Adresse umgeleitet. Keine oeffentliche URL. */
  await popup.waitForURL(/signed=/, { timeout: 7000 });
  expect(popup.url()).toContain("signed=");
  await popup.close();
});

test("U9 Einreichungen erscheinen nach dem Neuladen weiterhin", async ({ page }) => {
  await openPortal(page, { configured: true });
  await openSection(page, "dokumente");
  await setzeDatei(page, "[data-portal-doc-form]", PDF);
  await page.click('[data-portal-doc-form] button[type="submit"]');
  await expect(page.locator("[data-portal-doc-list]")).toContainText("nachweis.pdf");

  const stored = await page.evaluate(() => window.__TG_TEST.documentSubmissions);
  await page.addInitScript((rows) => {
    const w = setInterval(() => {
      if (window.__TG_TEST) { window.__TG_TEST.documentSubmissions = rows; clearInterval(w); }
    }, 0);
  }, stored);

  await page.reload();
  await expect(page.locator("body")).not.toHaveAttribute("data-portal-loading", /.*/);
  await openSection(page, "dokumente");
  await expect(page.locator("[data-portal-doc-list]")).toContainText("nachweis.pdf");
  await expect(page.locator("[data-portal-doc-list]")).toContainText("Übermittelt");
});

/* --------------------------------------------------------------------- */
/* K. Krankmeldung mit Anhang                                             */
/* --------------------------------------------------------------------- */
test("K1 Krankmeldung mit Krankenschein verknuepft den Anhang", async ({ page }) => {
  await openPortal(page, { configured: true, sicknessMode: "success", uploadMode: "success" });
  await openSection(page, "krank");
  await fillSickness(page);
  await setzeDatei(page, "[data-portal-absence-form]", PDF);
  await page.click('[data-portal-absence-form] button[type="submit"]');

  const fb = page.locator("[data-portal-absence-feedback]");
  await expect(fb).toContainText("mit Krankenschein übermittelt");

  /* Der Anhang wird als Krankenschein-Typ hochgeladen und verknuepft. */
  const up = await page.evaluate(() => window.__TG_CALLS.uploadDocumentSubmission[0]);
  expect(up.documentTypeId).toBe("t-krankenschein");
  const sick = await page.evaluate(() => window.__TG_CALLS.createSicknessReport[0]);
  expect(sick.documentSubmissionId).toBeTruthy();
});

test("K2 ohne Anhang wird das ausdruecklich gesagt", async ({ page }) => {
  await openPortal(page, { configured: true, sicknessMode: "success" });
  await openSection(page, "krank");
  await fillSickness(page);
  await page.click('[data-portal-absence-form] button[type="submit"]');

  await expect(page.locator("[data-portal-absence-feedback]")).toContainText("Es wurde kein Nachweis angehängt");
  const sick = await page.evaluate(() => window.__TG_CALLS.createSicknessReport[0]);
  expect(sick.documentSubmissionId).toBeFalsy();
});

test("K3 Teilfehler beim Anhang: KEINE Krankmeldung wird angelegt", async ({ page }) => {
  await openPortal(page, { configured: true, sicknessMode: "success", uploadMode: "upload-error" });
  await openSection(page, "krank");
  await fillSickness(page);
  await setzeDatei(page, "[data-portal-absence-form]", PDF);
  await page.click('[data-portal-absence-form] button[type="submit"]');

  const fb = page.locator("[data-portal-absence-feedback]");
  await expect(fb).toContainText("Datei konnte nicht übertragen werden");
  await expect(fb).toContainText("Krankmeldung wurde deshalb noch nicht gesendet");
  await expect(fb).toHaveClass(/is-error/);

  /* Entscheidend: keine halbe Krankmeldung in der Datenbank. */
  const sickCalls = await page.evaluate(() => window.__TG_CALLS.createSicknessReport.length);
  expect(sickCalls, "es darf keine Krankmeldung angelegt werden").toBe(0);

  /* Eingaben bleiben erhalten */
  await expect(page.locator('[data-portal-absence-form] input[name="start"]')).toHaveValue("2099-04-01");
});

test("K4 Wiederholung erzeugt weder doppelte Anhaenge noch doppelte Krankmeldungen", async ({ page }) => {
  await openPortal(page, { configured: true, sicknessMode: "backend-error", uploadMode: "success" });
  await openSection(page, "krank");
  await fillSickness(page);
  await setzeDatei(page, "[data-portal-absence-form]", PDF);

  /* Erster Versuch: Anhang klappt, Krankmeldung scheitert. */
  await page.click('[data-portal-absence-form] button[type="submit"]');
  await expect(page.locator("[data-portal-absence-feedback]")).toContainText(
    "Krankmeldung konnte nicht übermittelt werden"
  );

  /* Zweiter Versuch nach Erholung des Backends. */
  await page.evaluate(() => { window.__TG_TEST.sicknessMode = "success"; });
  await page.click('[data-portal-absence-form] button[type="submit"]');
  await expect(page.locator("[data-portal-absence-feedback]")).toContainText("mit Krankenschein übermittelt");

  const uploads = await page.evaluate(() => window.__TG_CALLS.uploadDocumentSubmission.length);
  const sicks = await page.evaluate(() => window.__TG_CALLS.createSicknessReport);
  expect(uploads, "Anhang darf nur einmal hochgeladen werden").toBe(1);
  expect(sicks, "genau ein erfolgreicher Krankmeldungsversuch je Anlauf").toHaveLength(2);

  /* In der Datenbank liegt genau EINE Krankmeldung. */
  const gespeichert = await page.evaluate(() => window.__TG_TEST.sicknessReports.length);
  expect(gespeichert, "nur eine gespeicherte Krankmeldung").toBe(1);
});

test("K5 verlorene Antwort erzeugt keine zweite Krankmeldung", async ({ page }) => {
  /* Der Server hat bereits gespeichert, die Antwort ging verloren. Der
     erneute Versuch laeuft in die Eindeutigkeit auf (employee_id, start_date)
     und liefert den vorhandenen Datensatz zurueck.
     ACHTUNG: Das hier ist nur die Oberflaeche. Den eigentlichen Nachweis
     liefert der SQL-Test 39/40 gegen PostgreSQL. */
  await openPortal(page, { configured: true, sicknessMode: "duplicate" });
  await openSection(page, "krank");
  await fillSickness(page);
  await page.click('[data-portal-absence-form] button[type="submit"]');

  const fb = page.locator("[data-portal-absence-feedback]");
  await expect(fb).toContainText("Krankmeldung wurde übermittelt und liegt der Zentrale vor");
  await expect(fb).not.toHaveClass(/is-error/);

  const gespeichert = await page.evaluate(() => window.__TG_TEST.sicknessReports.length);
  expect(gespeichert, "kein zweiter Datensatz").toBe(0);
});

test("T13 Dokumentbereich verspricht keinen Versand", async ({ page }) => {
  await openPortal(page, { configured: true });
  await openSection(page, "dokumente");
  await expect(page.locator('[data-portal-section="dokumente"]')).not.toContainText("gesendet");
});

/* --------------------------------------------------------------------- */
/* 14. Uebermittelte und rein lokale Krankmeldungen sind unterscheidbar   */
/* --------------------------------------------------------------------- */
test("T14 lokale Altbestaende werden nicht als uebermittelt ausgegeben", async ({ page }) => {
  /* Zuerst ohne Backend einen lokalen Eintrag erzeugen. */
  await openPortal(page, { configured: false });
  await openSection(page, "krank");
  await fillSickness(page, "2099-08-01", "2099-08-02");
  await page.click('[data-portal-absence-form] button[type="submit"]');
  await expect(page.locator("[data-portal-absence-list]")).toContainText("Nicht übermittelt");
  await page.click("[data-portal-close]");

  /* Danach dieselbe Sitzung mit Backend: Der Altbestand bleibt sichtbar,
     wird aber weiterhin als nicht uebermittelt gekennzeichnet und NICHT
     automatisch nachtraeglich uebertragen. */
  await openPortal(page, { configured: true, sicknessMode: "success" });
  await openSection(page, "krank");
  await fillSickness(page, "2099-09-01", "2099-09-03");
  await page.click('[data-portal-absence-form] button[type="submit"]');

  const list = page.locator("[data-portal-absence-list]");
  await expect(list).toContainText("Übermittelt");
  await expect(list).toContainText("01.09.2099");

  /* Der Altbestand wird im Supabase-Modus nicht inhaltlich angezeigt - eine
     sichere Zuordnung zum angemeldeten Konto ist nicht moeglich. Er darf aber
     auch nicht stillschweigend verschwinden. */
  const hinweis = page.locator("[data-portal-absence-legacy-hint]");
  await expect(hinweis).toBeVisible();
  await expect(hinweis).toContainText("nicht übermittelte Einträge");
  await expect(hinweis).toContainText("nicht nachträglich übertragen");
  await expect(list).not.toContainText("01.08.2099");

  /* Es wurde genau EIN Datensatz uebertragen - der neue, nicht der Altbestand. */
  const calls = await page.evaluate(() => window.__TG_CALLS.createSicknessReport);
  expect(calls).toHaveLength(1);
  expect(calls[0].startDate).toBe("2099-09-01");

  /* Und der Altbestand liegt unveraendert weiter im Browserspeicher. */
  const stillStored = await page.evaluate(() => {
    const P = window.AdminPersonnelDemo;
    return P ? P.loadState().absences.filter((a) => a.start === "2099-08-01").length : -1;
  });
  expect(stillStored, "lokaler Eintrag bleibt erhalten").toBe(1);
});
