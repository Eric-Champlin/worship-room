/**
 * Spec 1.9 — Frontend AuthContext JWT Migration
 *
 * Visual + a11y capture for AuthModal's real-backend flow at 3 viewports.
 *
 * Unlike 1.9b (which had no production consumers and rendered primitives into
 * a capture region), 1.9 DOES have real production consumers — so we navigate
 * to real app routes and capture real app state. Backend endpoints are mocked
 * via page.route so this spec runs against a running dev server without
 * needing a live backend.
 *
 * axe-core runs on every captured viewport state with WCAG 2.1 AA tags.
 */
import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const SCREENSHOT_DIR = path.resolve(
  __dirname,
  '../playwright-screenshots/1-9',
)

const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
] as const

const SAMPLE_USER_SUMMARY = {
  id: 'uuid-e2e-sarah',
  email: 'sarah@example.com',
  displayName: 'Sarah',
  firstName: 'Sarah',
  lastName: 'Smith',
  isAdmin: false,
  timezone: 'America/Chicago',
}

const SAMPLE_USER_RESPONSE = {
  ...SAMPLE_USER_SUMMARY,
  displayNamePreference: 'first_only',
  customDisplayName: null,
  avatarUrl: null,
  bio: null,
  favoriteVerseReference: null,
  favoriteVerseText: null,
  isEmailVerified: true,
  joinedAt: '2026-04-01T00:00:00Z',
}

/** JWT-shaped dummy token (3 base64 segments) — not a real signed token. */
const DUMMY_JWT =
  'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1dWlkLWUyZS1zYXJhaCJ9.dummy'

interface AuthMocks {
  loginStatus?: number
  loginBody?: unknown
  registerStatus?: number
  registerBody?: unknown
  meStatus?: number
  meBody?: unknown
  loginDelayMs?: number
}

async function mockAuthEndpoints(page: Page, mocks: AuthMocks = {}) {
  const loginStatus = mocks.loginStatus ?? 200
  const loginBody = mocks.loginBody ?? {
    data: { token: DUMMY_JWT, user: SAMPLE_USER_SUMMARY },
    meta: { requestId: 'e2e-r-login' },
  }
  const registerStatus = mocks.registerStatus ?? 200
  const registerBody = mocks.registerBody ?? {
    data: { registered: true },
    meta: { requestId: 'e2e-r-reg' },
  }
  const meStatus = mocks.meStatus ?? 200
  const meBody = mocks.meBody ?? {
    data: SAMPLE_USER_RESPONSE,
    meta: { requestId: 'e2e-r-me' },
  }

  await page.route('**/api/v1/auth/login', async (route) => {
    if (mocks.loginDelayMs) {
      await new Promise((r) => setTimeout(r, mocks.loginDelayMs))
    }
    await route.fulfill({
      status: loginStatus,
      contentType: 'application/json',
      body: JSON.stringify(loginBody),
    })
  })

  await page.route('**/api/v1/auth/register', async (route) => {
    await route.fulfill({
      status: registerStatus,
      contentType: 'application/json',
      body: JSON.stringify(registerBody),
    })
  })

  await page.route('**/api/v1/auth/logout', async (route) => {
    await route.fulfill({ status: 204, body: '' })
  })

  await page.route('**/api/v1/users/me', async (route) => {
    await route.fulfill({
      status: meStatus,
      contentType: 'application/json',
      body: JSON.stringify(meBody),
    })
  })
}

async function screenshotAndScan(
  page: Page,
  name: string,
  viewport: (typeof VIEWPORTS)[number],
) {
  const file = path.join(SCREENSHOT_DIR, `${name}-${viewport.name}.png`)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  await page.screenshot({ path: file, fullPage: false })

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze()

  return results.violations
}

async function openAuthModalFromLanding(page: Page, view: 'login' | 'register') {
  // Landing has a Get Started CTA that opens the modal in register view.
  // The "No account? Create one!" / "Log in" toggle switches between views.
  await page.goto('/', { waitUntil: 'networkidle' })

  // Trigger the auth modal — find any control that opens it. Landing's
  // "Get Started" button (FinalCTA) opens in register view by default.
  const getStarted = page.getByRole('button', {
    name: /Get Started/i,
  })
  if (await getStarted.count()) {
    await getStarted.first().click()
  } else {
    // Fallback: navigate to /prayer-wall and try to post — triggers auth modal.
    await page.goto('/prayer-wall', { waitUntil: 'networkidle' })
  }

  // Wait for the dialog to render
  await page.waitForSelector('[role="dialog"][aria-modal="true"]', {
    timeout: 2000,
  })

  if (view === 'login') {
    const loginToggle = page.getByRole('button', { name: 'Log in' })
    if (await loginToggle.count()) {
      await loginToggle.first().click()
    }
  } else {
    const registerToggle = page.getByRole('button', { name: 'Create one!' })
    if (await registerToggle.count()) {
      await registerToggle.first().click()
    }
  }
}

test.describe('Spec 1.9 — AuthModal visual + a11y captures', () => {
  for (const viewport of VIEWPORTS) {
    test(`login view @ ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      })
      await mockAuthEndpoints(page)
      await openAuthModalFromLanding(page, 'login')

      const violations = await screenshotAndScan(
        page,
        'auth-modal-login-view',
        viewport,
      )
      if (violations.length > 0) {
        console.log(
          `[1-9] login-view @ ${viewport.name} violations:`,
          violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help })),
        )
      }
      expect(violations).toEqual([])
    })

    test(`register view @ ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      })
      await mockAuthEndpoints(page)
      await openAuthModalFromLanding(page, 'register')

      const violations = await screenshotAndScan(
        page,
        'auth-modal-register-view',
        viewport,
      )
      if (violations.length > 0) {
        console.log(
          `[1-9] register-view @ ${viewport.name} violations:`,
          violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help })),
        )
      }
      expect(violations).toEqual([])
    })

    test(`login form-error (401) @ ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      })
      await mockAuthEndpoints(page, {
        loginStatus: 401,
        loginBody: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password.',
          requestId: 'r-e2e-401',
        },
      })
      await openAuthModalFromLanding(page, 'login')

      await page.getByLabel('Email address').fill('wrong@example.com')
      await page.getByLabel('Password').fill('wrong-password-123')
      await page.getByRole('button', { name: 'Log In' }).click()

      // Wait for FormError to render
      await page.waitForSelector('[role="alert"]:has-text("don\'t match")', {
        timeout: 2000,
      })

      const violations = await screenshotAndScan(
        page,
        'auth-modal-login-form-error',
        viewport,
      )
      if (violations.length > 0) {
        console.log(
          `[1-9] login-form-error @ ${viewport.name} violations:`,
          violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help })),
        )
      }
      expect(violations).toEqual([])
    })
  }
})
