import { defineConfig } from '@playwright/test';

export default defineConfig({
  testMatch: ['e2e/**/*.spec.ts', 'tests/**/*.spec.ts'],
  use: {
    headless: true,
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173',
  },
});
