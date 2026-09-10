// admin-krankmeldungen.spec.mjs
//
// Browsertests fuer die Admin-Ansicht der eingegangenen Krankmeldungen
// (admin/abwesenheiten.html, Modul admin/krankmeldungen-supabase.js).
//
// Isolation
//   supabase-config.js und supabase-auth.js werden durch Stubs ersetzt. Es
//   wird nie eine echte Supabase-Verbindung aufgebaut und nichts geschrieben.

import { test, expect } from "@playwright/test";

const SEITE = "/admin/abwesenheiten.html";

const CONFIG_STUB = `window.TaxiSupabaseConfig = {
  url: "http://127.0.0.1/not-used",
  publishableKey: "test-only",
  isConfigured: true,
  client: null
};`;

/* Minimaler Supabase-Client-Ersatz. Unterstuetzt genau die Aufrufketten,
   die auth.js und krankmeldungen-supabase.js verwenden. */
const AUTH_STUB = `
(() => {
  function builder(table) {
    const T = window.__TG_ADMIN || {};
    const api = {
      select: () => api,
      eq: () => api,
      order: () => api,
      limit: () => api,
      maybeSingle: async () => {
        if (table === "profiles") return { data: T.profile || null, error: null };
        return { data: null, error: null };
      },
      then: (resolve) => {
        if (table === "sickness_reports") {
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
      getSession: async () => ({
        data: { session: { user: { id: "44444444-4444-4444-8444-444444444444" } } },
        error: null
      }),
      signOut: async () => ({ error: null })
    },
    from: (table) => builder(table)
  };

  window.TaxiSupabaseClient = fakeClient;
  window.TaxiSupabaseAuth = {
    readStoredSession: () => null,
    saveStoredSession: () => ({}),
    clearStoredSession: () => {},
    getClient: async () => fakeClient,
    getSharedClient: () => fakeClient,
    signInWithPassword: async () => ({}),
    restoreSupabaseSession: async () => ({}),
    signOut: async () => true,
    mapProfileRoleToAdminRole: (r) => r
  };
})();
`;

async function openAdmin(page, { rows = [], dbError = false } = {}) {
  await page.route("**/admin/supabase-config.js", (route) =>
    route.fulfill({ status: 200, contentType: "text/javascript", body: CONFIG_STUB })
  );
  await page.route("**/admin/supabase-auth.js", (route) =>
    route.fulfill({ status: 200, contentType: "text/javascript", body: AUTH_STUB })
  );

  await page.addInitScript((cfg) => { window.__TG_ADMIN = cfg; }, {
    rows,
    dbError,
    profile: { role: "admin", active: true, display_name: "TESTDATA Admin" }
  });

  await page.goto(SEITE);
}

const BEISPIEL = [
  {
    id: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
    employee_id: "e0000000-0000-4000-8000-0000000000e1",
    start_date: "2099-06-01",
    expected_end_date: "2099-06-04",
    note: "Erreichbar per Mobil",
    submission_source: "Mitarbeiterportal",
    status: "submitted",
    created_at: "2099-05-31T08:00:00Z",
    employees: { first_name: "Test", last_name: "Mitarbeiter" }
  }
];

test("A1 Admin sieht die eingegangene Krankmeldung mit allen Feldern", async ({ page }) => {
  await openAdmin(page, { rows: BEISPIEL });

  const panel = page.locator("[data-krankmeldungen-supabase]");
  await expect(panel).toContainText("Test Mitarbeiter");
  await expect(panel).toContainText("01.06.2099 bis 04.06.2099");
  await expect(panel).toContainText("Eingegangen");
  await expect(panel).toContainText("Mitarbeiterportal");
  await expect(panel).toContainText("Erreichbar per Mobil");

  /* Der fehlende Nachweis muss sichtbar sein und darf nicht suggeriert werden */
  await expect(panel).toContainText("Nicht übermittelt");
  await expect(panel).toContainText("Nachweise werden vom Portal derzeit nicht mitgesendet");
});

test("A2 Ohne Eintraege erscheint eine klare Meldung statt einer leeren Tabelle", async ({ page }) => {
  await openAdmin(page, { rows: [] });
  await expect(page.locator("[data-krankmeldungen-supabase]")).toContainText(
    "Keine über das Mitarbeiterportal eingegangenen Krankmeldungen"
  );
});

test("A3 Bei fehlender Berechtigung wird das ehrlich gemeldet, nicht erfunden", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));

  await openAdmin(page, { dbError: true });

  const panel = page.locator("[data-krankmeldungen-supabase]");
  await expect(panel).toContainText("konnten nicht geladen werden");
  await expect(panel).toContainText("nur fuer Administratoren freigegeben");
  /* Keine erfundenen Zeilen */
  await expect(panel.locator("table")).toHaveCount(0);
  expect(pageErrors, "keine unbehandelten Seitenfehler").toEqual([]);
});

test("A4 Notizfeld wird als Text ausgegeben, nicht als Markup", async ({ page }) => {
  await openAdmin(page, {
    rows: [{ ...BEISPIEL[0], note: '<img src=x onerror="window.__pwned=1">' }]
  });

  const panel = page.locator("[data-krankmeldungen-supabase]");
  await expect(panel).toContainText("<img src=x");
  expect(await page.evaluate(() => window.__pwned)).toBeUndefined();
  expect(await panel.locator("img").count()).toBe(0);
});
