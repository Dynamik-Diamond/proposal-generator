import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 420_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  globalSetup: "./tests/e2e/global-setup.ts",
  use: { baseURL: "http://localhost:3100", trace: "retain-on-failure", actionTimeout: 30_000 },
  webServer: {
    // Port 3100 so tests don't collide with other local dev servers on 3000.
    command: "npm run build && npx next start -p 3100",
    url: "http://localhost:3100/login",
    env: { NEXT_PUBLIC_APP_URL: "http://localhost:3100", NEXT_DIST_DIR: ".next-e2e" },
    reuseExistingServer: true,
    timeout: 300_000,
  },
});
