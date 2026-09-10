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
  window.__TG_CALLS = { createVacationRequest: [] };

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

  window.EmployeeSupabase = {
    isConfigured: () => Boolean((window.__TG_TEST || {}).configured),
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
async function openPortal(page, { configured = true, vacationMode = "success" } = {}) {
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
      vacationRequests: []
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
test("T6 Krankmeldung meldet nie gesendet", async ({ page }) => {
  await openPortal(page, { configured: true });
  await openSection(page, "krank");

  /* Dauerhinweis ist bereits VOR dem Absenden sichtbar */
  const notice = page.locator("[data-portal-absence-notice]");
  await expect(notice).toBeVisible();
  await expect(notice).toContainText("nicht automatisch übermittelt");

  await page.fill('[data-portal-absence-form] input[name="start"]', "2099-04-01");
  await page.fill('[data-portal-absence-form] input[name="expectedEnd"]', "2099-04-03");
  await page.click('[data-portal-absence-form] button[type="submit"]');

  const fb = page.locator("[data-portal-absence-feedback]");
  await expect(fb).toBeVisible();
  await expect(fb).toHaveText(NOT_TRANSMITTED);
  await expect(fb).toHaveClass(/is-warning/);
  await expect(fb).not.toContainText("✓");
  await expect(fb).not.toContainText("gesendet");

  await expect(page.locator("[data-portal-modal-title]")).toHaveText("Noch nicht übermittelt");
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
test("T8 Warnung der Krankmeldung bleibt trotz spaeterem Urlaubserfolg stehen", async ({ page }) => {
  await openPortal(page, { configured: true, vacationMode: "success" });

  /* Erst Krankmeldung -> Warnung */
  await openSection(page, "krank");
  await page.fill('[data-portal-absence-form] input[name="start"]', "2099-04-01");
  await page.fill('[data-portal-absence-form] input[name="expectedEnd"]', "2099-04-03");
  await page.click('[data-portal-absence-form] button[type="submit"]');
  await expect(page.locator("[data-portal-absence-feedback]")).toHaveText(NOT_TRANSMITTED);
  await page.click("[data-portal-close]");

  /* Danach erfolgreicher Urlaubsantrag */
  await openSection(page, "urlaub");
  await fillVacation(page);
  await page.click('[data-portal-vac-form] button[type="submit"]');
  await expect(page.locator("[data-portal-vac-feedback]")).toHaveText(VAC_SUCCESS);

  /* Zurueck in die Krankmeldung: Die Warnung muss unveraendert dastehen und
     darf nicht durch die Erfolgsmeldung des Urlaubs ersetzt worden sein. */
  await page.click("[data-portal-close]");
  await openSection(page, "krank");

  const absFb = page.locator("[data-portal-absence-feedback]");
  await expect(absFb).toBeVisible();
  await expect(absFb).toHaveText(NOT_TRANSMITTED);
  await expect(absFb).toHaveClass(/is-warning/);
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
test("T13 kein Erfolgstext gesendet an Krankmeldung oder Dokument", async ({ page }) => {
  await openPortal(page, { configured: true });

  await openSection(page, "krank");
  await expect(page.locator('[data-portal-section="krank"]')).not.toContainText("gesendet");

  await openSection(page, "dokumente");
  await expect(page.locator('[data-portal-section="dokumente"]')).not.toContainText("gesendet");
});
