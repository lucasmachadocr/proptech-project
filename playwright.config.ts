import { defineConfig, devices } from '@playwright/test';

// Local: builds and serves the app. Live: BASE_URL=https://<user>.github.io/proptech-zaragoza-mvp/ npm run e2e
const live = process.env.BASE_URL;

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  retries: live ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: live ?? 'http://localhost:4173/',
    screenshot: 'only-on-failure',
    viewport: { width: 1366, height: 900 },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 900 } } }],
  webServer: live
    ? undefined
    : { command: 'npm run build && npm run preview', url: 'http://localhost:4173/', reuseExistingServer: true, timeout: 120_000 },
});
