// admin-dokumenteingang.spec.mjs
//
// Browsertests fuer den Dokumenteingang im Adminbereich
// (admin/dokumentfristen.html, Modul admin/dokumenteingang-supabase.js).
//
// Isolation: supabase-config.js und supabase-auth.js werden ersetzt. Es wird
// nie eine echte Supabase-Verbindung aufgebaut und nichts geschrieben.

import { test, expect } from "@playwright/test";

const SEITE = "/admin/dokumentfristen.html";

const CONFIG_STUB = `window.TaxiSupabaseConfig = {
  url: "http://127.0.0.1/not-used", publishableKey: "test-only",
  isConfigured: true, client: null
};`;

const AUTH_STUB = `
(() => {
  function builder(table) {
    const T = window.__TG_ADMIN || {};
    const api = {
      select: () => api, eq: () => api, order: () => api, limit: () => api,
      maybeSingle: async () => (table === "profiles" ? { data: T.profile || null, error: null } : { data: null, error: null }),
      then: (resolve) => {
        if (table === "document_submissions") {
          if (T.dbError) return resolve({ data: null, error: { code: "42501", message: "permission denied" } });
          return resolve({ data: T.rows || [], error: null });
        }
        return resolve({ data: [], error: null });
      }
    };
    return api;
  }

  const fakeClient = {
    auth: {
      getSession: async () => ({ data: { session: { user: { id: "44444444-4444-4444-8444-444444444444" } } }, error: null }),
      signOut: async () => ({ error: null })
    },
    from: (table) => builder(table),
    storage: {
      from: () => ({
        createSignedUrl: async (path) => {
          const T = window.__TG_ADMIN || {};
          if (T.signedUrlFails) return { data: null, error: { message: "not allowed" } };
          window.__TG_SIGNED = (window.__TG_SIGNED || []).concat([path]);
          return { data: { signedUrl: "/fahrer/manifest.webmanifest?signed=" + encodeURIComponent(path) }, error: null };
        }
      })
    }
  };

  window.TaxiSupabaseClient = fakeClient;
  window.TaxiSupabaseAuth = {
    readStoredSession: () => null, saveStoredSession: () => ({}), clearStoredSession: () => {},
    getClient: async () => fakeClient, getSharedClient: () => fakeClient,
    signInWithPassword: async () => ({}), restoreSupabaseSession: async () => ({}),
    signOut: async () => true, mapProfileRoleToAdminRole: (r) => r
  };
})();
`;

const BEISPIEL = [{
  id: "dddddddd-eeee-4fff-8aaa-000000000001",
  employee_id: "e0000000-0000-4000-8000-0000000000e1",
  document_type_id: "t-krankenschein",
  file_path: "33333333-3333-4333-8333-333333333333/2099/nachweis.pdf",
  file_name: "nachweis.pdf",
  mime_type: "application/pdf",
  status: "submitted",
  note: "Krankenschein zur Krankmeldung",
  submitted_at: "2099-06-01T09:00:00Z",
  employees: { first_name: "Test", last_name: "Mitarbeiter" },
  document_types: { label: "Krankenschein / AU" }
}];

async function openAdmin(page, { rows = [], dbError = false, signedUrlFails = false } = {}) {
  await page.route("**/admin/supabase-config.js", (r) =>
    r.fulfill({ status: 200, contentType: "text/javascript", body: CONFIG_STUB }));
  await page.route("**/admin/supabase-auth.js", (r) =>
    r.fulfill({ status: 200, contentType: "text/javascript", body: AUTH_STUB }));
  await page.addInitScript((cfg) => { window.__TG_ADMIN = cfg; }, {
    rows, dbError, signedUrlFails,
    profile: { role: "admin", active: true, display_name: "TESTDATA Admin" }
  });
  await page.goto(SEITE);
}

test("D1 Admin sieht die eingereichten Nachweise mit allen Feldern", async ({ page }) => {
  await openAdmin(page, { rows: BEISPIEL });

  const panel = page.locator("[data-dokumenteingang-supabase]");
  await expect(panel).toContainText("Test Mitarbeiter");
  await expect(panel).toContainText("Krankenschein / AU");
  await expect(panel).toContainText("nachweis.pdf");
  await expect(panel).toContainText("01.06.2099");
  await expect(panel).toContainText("Neu eingereicht");
  await expect(panel).toContainText("privaten Speicher");
});

test("D2 Datei wird ueber eine kurz gueltige signierte URL geoeffnet", async ({ page }) => {
  await openAdmin(page, { rows: BEISPIEL });

  const [popup] = await Promise.all([
    page.waitForEvent("popup"),
    page.click("[data-dokument-oeffnen]")
  ]);
  await popup.waitForURL(/signed=/, { timeout: 7000 });
  expect(popup.url()).toContain("signed=");
  await popup.close();

  /* Es wurde der Pfad der Einreichung signiert, nicht irgendeiner. */
  const signiert = await page.evaluate(() => window.__TG_SIGNED);
  expect(signiert).toEqual(["33333333-3333-4333-8333-333333333333/2099/nachweis.pdf"]);
});

test("D3 Ohne Berechtigung fuer die Datei bleibt es bei einem Hinweis", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));

  await openAdmin(page, { rows: BEISPIEL, signedUrlFails: true });
  await page.click("[data-dokument-oeffnen]");

  await expect(page.locator("[data-dokumenteingang-hinweis]")).toContainText(
    "konnte nicht geöffnet werden"
  );
  expect(pageErrors, "keine unbehandelten Seitenfehler").toEqual([]);
});

test("D4 Ohne Einreichungen erscheint eine klare Meldung", async ({ page }) => {
  await openAdmin(page, { rows: [] });
  await expect(page.locator("[data-dokumenteingang-supabase]")).toContainText(
    "Keine über das Mitarbeiterportal eingereichten Nachweise"
  );
});

test("D5 Fehlende Leseberechtigung wird ehrlich gemeldet, nichts erfunden", async ({ page }) => {
  await openAdmin(page, { dbError: true });
  const panel = page.locator("[data-dokumenteingang-supabase]");
  await expect(panel).toContainText("konnte nicht geladen werden");
  await expect(panel).toContainText("nur fuer Administratoren freigegeben");
  await expect(panel.locator("table")).toHaveCount(0);
});

test("D6 Notiz und Dateiname werden escaped ausgegeben", async ({ page }) => {
  await openAdmin(page, {
    rows: [{ ...BEISPIEL[0], note: '<img src=x onerror="window.__pwned=1">', file_name: '<b>x</b>.pdf' }]
  });

  const panel = page.locator("[data-dokumenteingang-supabase]");
  await expect(panel).toContainText("<img src=x");
  expect(await page.evaluate(() => window.__pwned)).toBeUndefined();
  expect(await panel.locator("img").count()).toBe(0);
  expect(await panel.locator("b").count()).toBe(0);
});
