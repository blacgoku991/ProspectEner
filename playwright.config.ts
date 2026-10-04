import { defineConfig, devices } from "@playwright/test";
import { E2E_BASE_URL, E2E_ENV, E2E_PORT } from "./tests/e2e/config";

/**
 * Tests de bout en bout : application compilée (next build + next start) sur une base dédiée.
 * PLAYWRIGHT_CHROMIUM_EXECUTABLE permet d'utiliser un Chromium déjà installé.
 */
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: E2E_BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: { executablePath, args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel: undefined }, testIgnore: /mobile\.spec\.ts/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /mobile\.spec\.ts/ },
  ],
  webServer: {
    command: process.env.E2E_SKIP_BUILD ? `npx next start -p ${E2E_PORT}` : `npx next build && npx next start -p ${E2E_PORT}`,
    url: `${E2E_BASE_URL}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 600_000,
    env: { ...E2E_ENV, NODE_ENV: "production" },
  },
});
