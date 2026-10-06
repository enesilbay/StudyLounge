import { defineConfig, devices } from '@playwright/test'

/**
 * Uçtan uca testler: çalışan bir backend ve demo verisi gerekir.
 *   backend: npm run seed && npm run start:dev
 *   web:     npm run test:e2e   (dev sunucusu yoksa kendisi başlatır)
 * Farklı adresler için E2E_BASE_URL ve VITE_BACKEND_URL verilebilir.
 */
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:5173'

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    locale: 'tr-TR',
    timezoneId: 'Europe/Istanbul',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run dev -- --port 5173 --strictPort',
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
      },
})
