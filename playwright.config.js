import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.js",
  fullyParallel: false,
  workers: 1,
  timeout: 120000,
  use: {
    baseURL: "http://localhost:3201",
    viewport: { width: 1366, height: 1000 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  reporter: "list",
  webServer: process.env.PW_EXTERNAL_SERVER
    ? undefined
    : {
        command: "node scripts/test-server.mjs",
        wait: { stdout: /Ready in/ },
        reuseExistingServer: false,
        timeout: 120000,
      },
});
