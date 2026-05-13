/**
 * Spec 6.2b — Prayer Length Options end-to-end.
 *
 * Coverage:
 *   1. Picker visible on /daily?tab=pray.
 *   2. Deep-link ?length=1 starts a session directly (picker bypassed).
 *   3. Deep-link ?length=invalid is graceful — picker visible, no session, no toast.
 *   4. 1-minute session happy-path (~62s wall-clock) reaches Amen and resets URL.
 *   5. Mid-session End-early transitions to Amen.
 *   6. Axe scan on the picker view.
 *   7. Axe scan during prompt-visible phase.
 *   8. Axe scan on the Amen screen.
 *
 * Headless per repo convention (frontend/playwright.config.ts headless: true).
 */
import { test, expect, type Page } from '@playwright/test'
import {
  DEV_SEED_EMAIL,
  DEV_SEED_PASSWORD,
  seedSkipDashboardGates,
  runAxeScan,
} from './fixtures'

const LOGIN_TIMEOUT_MS = 10_000
const SESSION_1MIN_TIMEOUT_MS = 90_000 // 60s session + 3s amen + buffer

// Spread the 8-scenario suite's logins across 3 verified dev-seed users so we
// fit inside each user's 5/15min per-email login rate limit. All dev-seed
// users share the canonical dev password; see backend/src/main/resources/db/
// changelog/contexts/dev-seed.xml.
const LOGIN_USERS = {
  sarah: 'sarah@worshiproom.dev',
  bob: 'bob@worshiproom.dev',
  mikey: 'mikey@worshiproom.dev',
} as const
void DEV_SEED_EMAIL // retained for future tests that need the canonical user

async function loginViaModal(page: Page, email: string = LOGIN_USERS.sarah) {
  await page.goto('/')
  await seedSkipDashboardGates(page)
  await page
    .getByRole('button', { name: /Get Started/i })
    .first()
    .click()
  await page.waitForSelector('[role="dialog"][aria-modal="true"]', { timeout: 5_000 })
  const loginToggle = page.getByRole('dialog').getByRole('button', { name: 'Log in' })
  if (await loginToggle.count()) {
    await loginToggle.first().click()
  }
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(DEV_SEED_PASSWORD)
  await page.getByRole('dialog').getByRole('button', { name: 'Log In' }).click()
  await expect(page.getByRole('button', { name: 'User menu' })).toBeVisible({
    timeout: LOGIN_TIMEOUT_MS,
  })
  // Spec 1.10f — Sarah's accepted legal versions are out of date in the dev
  // DB, so the soft-enforcement TermsUpdateModal mounts post-login as an
  // overlay above any deep-linked page. "Later" dismisses for the session.
  // Blocks pointer events on whatever's beneath it, so tests that click
  // anything else (End-early, etc.) must dismiss it first.
  const tosLater = page.getByRole('dialog', { name: /We updated our terms/i }).getByRole('button', { name: 'Later' })
  if (await tosLater.isVisible({ timeout: 1_500 }).catch(() => false)) {
    await tosLater.click()
  }
}

test.describe('Spec 6.2b — Prayer Length Options', () => {
  test('PrayLengthPicker is visible on /daily?tab=pray', async ({ page }) => {
    await loginViaModal(page, LOGIN_USERS.bob)
    await page.goto('/daily?tab=pray')
    await expect(page.getByRole('heading', { name: 'Start a timed session' })).toBeVisible()
    await expect(page.getByRole('button', { name: '1 minute, Quick pause' })).toBeVisible()
    await expect(page.getByRole('button', { name: '5 minutes, Settled prayer' })).toBeVisible()
    await expect(page.getByRole('button', { name: '10 minutes, Deep sit' })).toBeVisible()
  })

  test('Deep-link ?length=1 mounts PraySession directly (picker bypassed)', async ({ page }) => {
    await loginViaModal(page, LOGIN_USERS.bob)
    await page.goto('/daily?tab=pray&length=1')
    await expect(page.getByRole('button', { name: 'End prayer session early' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Start a timed session' })).not.toBeVisible()
  })

  test('Deep-link ?length=invalid shows picker silently (Gate-G-DEEP-LINK-GRACEFUL)', async ({ page }) => {
    await loginViaModal(page, LOGIN_USERS.bob)
    await page.goto('/daily?tab=pray&length=invalid')
    await expect(page.getByRole('heading', { name: 'Start a timed session' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'End prayer session early' })).not.toBeVisible()
    // No error toast (no [role="alert"] in DOM).
    expect(await page.getByRole('alert').count()).toBe(0)
  })

  test('1-minute session happy-path end-to-end (~62s wall-clock)', async ({ page }) => {
    test.setTimeout(SESSION_1MIN_TIMEOUT_MS)
    await loginViaModal(page, LOGIN_USERS.mikey)
    await page.goto('/daily?tab=pray&length=1')
    await expect(page.getByRole('button', { name: 'End prayer session early' })).toBeVisible()
    // Wait for the session to complete naturally and the Amen screen to appear.
    await expect(page.getByText('Amen.')).toBeVisible({ timeout: 75_000 })
    // After Amen 3s hold, URL strips ?length= and the picker returns.
    await expect(page.getByRole('heading', { name: 'Start a timed session' })).toBeVisible({
      timeout: 10_000,
    })
  })

  test('Early exit mid-session records activity and transitions to Amen', async ({ page }) => {
    test.setTimeout(60_000)
    await loginViaModal(page, LOGIN_USERS.mikey)
    await page.goto('/daily?tab=pray&length=5')
    await expect(page.getByRole('button', { name: 'End prayer session early' })).toBeVisible()
    // Brief dwell so promptsSeen has ticked.
    await page.waitForTimeout(3_000)
    await page.getByRole('button', { name: 'End prayer session early' }).click()
    await expect(page.getByText('Amen.')).toBeVisible()
    // 3s amen hold → picker returns.
    await expect(page.getByRole('heading', { name: 'Start a timed session' })).toBeVisible({
      timeout: 10_000,
    })
  })

  test('Axe-core: PrayLengthPicker view passes a11y scan', async ({ page }) => {
    await loginViaModal(page, LOGIN_USERS.mikey)
    await page.goto('/daily?tab=pray')
    await expect(page.getByRole('heading', { name: 'Start a timed session' })).toBeVisible()
    const violations = await runAxeScan(page)
    expect(violations).toEqual([])
  })

  test('Axe-core: PraySession during prompt-visible phase passes a11y scan', async ({ page }) => {
    await loginViaModal(page, LOGIN_USERS.mikey)
    await page.goto('/daily?tab=pray&length=5')
    // Wait for the first fixed prompt to be visible (post-fade-in).
    await expect(page.getByText('Settle. Notice your breath.')).toBeVisible({ timeout: 5_000 })
    const violations = await runAxeScan(page)
    expect(violations).toEqual([])
  })

  test('Axe-core: Amen screen passes a11y scan', async ({ page }) => {
    await loginViaModal(page, LOGIN_USERS.bob)
    await page.goto('/daily?tab=pray&length=1')
    await expect(page.getByRole('button', { name: 'End prayer session early' })).toBeVisible()
    // Fast-forward to the Amen screen via End-early.
    await page.getByRole('button', { name: 'End prayer session early' }).click()
    await expect(page.getByText('Amen.')).toBeVisible()
    const violations = await runAxeScan(page)
    expect(violations).toEqual([])
  })
})
