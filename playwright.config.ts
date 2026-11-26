import { defineConfig } from '@playwright/test';
const port = Number(process.env.PLAYWRIGHT_PORT ?? '5187');
const baseURL = `http://127.0.0.1:${port}`;
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  // The uncached Vite editor imports many modules on the 2 CPU test host.
  expect: { timeout: 15000 },
  use: {
    baseURL,
    headless: true,
    locale: 'ru-RU',
    trace: 'retain-on-failure',
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
  },
  webServer: {
    command: `npm run ${process.env.PLAYWRIGHT_BUILT_EDITOR === 'true' ? 'preview' : 'dev'} -- --host 127.0.0.1 --port ${port} --strictPort`,
    url: baseURL,
    env: { VITE_FEATURE_EMAIL: process.env.VITE_FEATURE_EMAIL ?? 'true' },
    reuseExistingServer: false,
  },
});
