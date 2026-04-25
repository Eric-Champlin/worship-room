import { defineConfig } from '@playwright/test'

export default defineConfig({
  testMatch: ['e2e/**/*.spec.ts', 'tests/**/*.spec.ts'],
  // Retry once in CI to absorb genuine flake; never in local dev so that
  // intermittent failures surface immediately for debugging.
  retries: process.env.CI === 'true' ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    headless: true,
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },
})
