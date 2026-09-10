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
  window.__TG_CALLS = { createVacationRequest: [], createSicknessReport: [] };

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

  window.EmployeeSupabase = {
    isConfigured: () => Boolean((window.__TG_TEST || {}).configured),
    getMySicknessReports: async () => ((window.__TG_TEST || {}).sicknessReports || []).slice(),
    createSicknessReport,
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
async function openPortal(page, { configured = true, vacationMode = "success", sicknessMode = "success" } = {}) {
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
      sicknessMode
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

  /* Hinweis zum fehlenden Nachweis ist bereits vor dem Absenden sichtbar */
  const notice = page.locator("[data-portal-absence-notice]");
  await expect(notice).toBeVisible();
  await expect(notice).toContainText("Nachweis kann noch nicht mitgesendet werden");

  await fillSickness(page);
  await page.click('[data-portal-absence-form] button[type="submit"]');

  const fb = page.locator("[data-portal-absence-feedback]");
  await expect(fb).toBeVisible();
  await expect(fb).toContainText("Krankmeldung wurde übermittelt und liegt der Zentrale vor");
  await expect(fb).toContainText("Nachweis wurde dabei nicht mitgesendet");
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

test("T6e Krankmeldung: Dateianhang ist deaktiviert und deutlich beschriftet", async ({ page }) => {
  await openPortal(page, { configured: true });
  await openSection(page, "krank");

  const fileInput = page.locator('[data-portal-absence-form] input[type="file"]');
  await expect(fileInput).toBeDisabled();
  const trigger = page.locator("[data-portal-absence-upload] .upload-trigger");
  await expect(trigger).toBeDisabled();
  await expect(trigger).toContainText("Dateianhang noch nicht verfügbar");
  await expect(page.locator("[data-portal-absence-upload-hint]")).toContainText(
    "Dateianhang noch nicht verfügbar"
  );
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
test("T7 Dokument meldet nie gesendet", async ({ page }) => {
  await openPortal(page, { configured: true });
  await openSection(page, "dokumente");

  const notice = page.locator("[data-portal-doc-notice]");
  await expect(notice).toBeVisible();
  await expect(notice).toContainText("nicht automatisch übermittelt");

  await page.click('[data-portal-doc-form] button[type="submit"]');

  const fb = page.locator("[data-portal-doc-feedback]");
  await expect(fb).toBeVisible();
  await expect(fb).toHaveText(NOT_TRANSMITTED);
  await expect(fb).toHaveClass(/is-warning/);
  await expect(fb).not.toContainText("gesendet");

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
