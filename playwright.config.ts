import { defineConfig } from "@playwright/test";
if (!process.env.DB_NAME?.endsWith("_test"))
  throw Error("Browser checks require a dedicated seeded _test database.");
export default defineConfig({
  testDir: "tests",
  testMatch: "browser.spec.ts",
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:4178",
    launchOptions: { executablePath: process.env.BROWSER_BINARY },
  },
  webServer: {
    command: "node server/index.js",
    url: "http://127.0.0.1:4178/api/v1/health",
    reuseExistingServer: false,
    env: { PORT: "4178", APP_ORIGIN: "http://127.0.0.1:4178" },
  },
});
