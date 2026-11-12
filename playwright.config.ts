import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  // The uncached Vite editor imports many modules on the 2 CPU test host.
  expect: { timeout: 15000 },
  use: {
    baseURL: 'http://127.0.0.1:5187',
    headless: true,
    locale: 'ru-RU',
    trace: 'retain-on-failure',
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5187 --strictPort',
    url: 'http://127.0.0.1:5187',
    reuseExistingServer: !process.env.CI,
  },
});
