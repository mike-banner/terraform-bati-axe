import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      // Le Chromium bundle de Playwright ne se lance pas dans le sandbox
      // (dette connue) — on utilise le Chrome système installé.
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
    {
      // P9 — QA mobile : mêmes specs passées en viewport mobile (390×844,
      // iPhone 12-14) pour détecter les régressions responsives.
      name: 'mobile-chromium',
      use: { ...devices['Pixel 7'], channel: 'chrome' },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 90_000,
  },
})
