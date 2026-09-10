// playwright.config.mjs
//
// Browsertests fuer das Mitarbeiterportal.
// Nutzt den auf dem Rechner vorhandenen Chrome (channel), damit kein
// zusaetzlicher Browser heruntergeladen werden muss. Der Testserver bindet
// ausschliesslich an 127.0.0.1.

import { defineConfig } from "@playwright/test";

const PORT = 8787;

export default defineConfig({
  testDir: ".",
  testMatch: "**/*.spec.mjs",
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    channel: "chrome",
    headless: true,
    viewport: { width: 1280, height: 900 }
  },
  webServer: {
    command: `node "${new URL("static-server.mjs", import.meta.url).pathname.replace(/^\//, "")}" ${PORT}`,
    url: `http://127.0.0.1:${PORT}/fahrer/mitarbeiter.html`,
    reuseExistingServer: true,
    timeout: 20_000
  }
});
