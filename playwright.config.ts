import { defineConfig, devices } from "@playwright/test";

// Screen tests run against a production build that talks to a fake API with fixed data.
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: "http://localhost:3100", trace: "retain-on-failure" },
  projects: [{ name: "mobile", use: { ...devices["Pixel 7"] } }],
  webServer: [
    {
      command: "node tests/e2e/fake-api.mjs",
      url: "http://localhost:4011/__health",
      reuseExistingServer: false,
    },
    {
      command: "npm run build && npx next start -p 3100",
      url: "http://localhost:3100",
      env: { API_URL: "http://localhost:4011", STORE_WHATSAPP: "5511900000000" },
      timeout: 240_000,
      // Never reuse: a server left running from an older build would test old code.
      reuseExistingServer: false,
    },
  ],
});
