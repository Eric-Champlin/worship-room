/**
 * Spec 6.2 — Quick Lift end-to-end roundtrip.
 *
 * Two scenarios:
 *   1. Happy-path (real 30-second wall-clock dwell — backstop scenario,
 *      verifies the server-authoritative timing actually fires).
 *   2. Reduced-motion variant — verifies the data-reduced-motion attribute
 *      and ring class swap when the OS reduced-motion flag is set.
 *
 * The wall-clock scenario takes ~32 seconds; that's acceptable for a feature
 * whose entire point is timing the dwell. A header-driven test-time override
 * is documented as a future optimization (R-CI in the plan) but not wired
 * into the production code path yet.
 *
 * Self-contained: signs in as the dev-seed user, creates a fresh post, then
 * Quick Lifts on it. No external test data required.
 *
 * Headless per repo convention (frontend/playwright.config.ts headless: true,
 * memory rule).
 */
import { test, expect, type Page } from '@playwright/test'
import {
  DEV_SEED_EMAIL,
  DEV_SEED_PASSWORD,
  seedSkipDashboardGates,
} from './fixtures'

const LOGIN_TIMEOUT_MS = 10_000
const DWELL_TIMEOUT_MS = 35_000

async function loginViaModal(page: Page) {
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
  await page.getByLabel('Email address').fill(DEV_SEED_EMAIL)
  await page.getByLabel('Password', { exact: true }).fill(DEV_SEED_PASSWORD)
  await page.getByRole('dialog').getByRole('button', { name: 'Log In' }).click()
  await expect(page.getByRole('button', { name: 'User menu' })).toBeVisible({
    timeout: LOGIN_TIMEOUT_MS,
  })
}

async function seedPostAndOpenWall(page: Page) {
  await page.goto('/prayer-wall')
  // If there are no posts visible, create one quickly via the composer.
  const card = page.locator('[data-testid="prayer-card"]').first()
  if (!(await card.isVisible({ timeout: 3_000 }).catch(() => false))) {
    const composer = page.getByRole('textbox', { name: /What's on your heart/i })
    if (await composer.count()) {
      await composer.fill('Quick Lift e2e seed post — please pray.')
      await page.getByRole('button', { name: /Share/i }).click()
      await expect(page.locator('[data-testid="prayer-card"]').first()).toBeVisible({
        timeout: 5_000,
      })
    }
  }
}

test.describe('Quick Lift (Spec 6.2)', () => {
  test('happy path — complete 30-second Quick Lift', async ({ page }) => {
    test.setTimeout(90_000)

    await loginViaModal(page)
    await seedPostAndOpenWall(page)

    const firstCard = page.locator('[data-testid="prayer-card"]').first()
    await expect(firstCard).toBeVisible()

    // Click the Quick Lift button on the card
    await firstCard.getByRole('button', { name: /Quick Lift in prayer/i }).click()

    // Overlay opens
    const overlay = page.locator('[role="dialog"][aria-modal="true"]').filter({
      hasText: 'Praying alongside',
    })
    await expect(overlay).toBeVisible({ timeout: 5_000 })

    // No countdown numbers anywhere in the overlay DOM (Gate-G-NO-COUNTDOWN-NUMBERS)
    const overlayText = (await overlay.textContent()) ?? ''
    expect(overlayText).not.toMatch(/\d+\s*(second|sec\b|%|left|remaining)/i)

    // Wait for completion message after the full 30 seconds + a small buffer
    await expect(overlay.getByText('Thank you.')).toBeVisible({
      timeout: DWELL_TIMEOUT_MS,
    })

    // Overlay auto-closes within ~2 seconds after completion
    await expect(overlay).toBeHidden({ timeout: 4_000 })
  })

  test('reduced motion variant — discrete ring animation', async ({ browser }) => {
    test.setTimeout(60_000)

    const context = await browser.newContext({
      reducedMotion: 'reduce',
    })
    const page = await context.newPage()

    await loginViaModal(page)
    await seedPostAndOpenWall(page)

    const firstCard = page.locator('[data-testid="prayer-card"]').first()
    await firstCard.getByRole('button', { name: /Quick Lift in prayer/i }).click()

    const overlay = page.locator('[role="dialog"][aria-modal="true"]').filter({
      hasText: 'Praying alongside',
    })
    await expect(overlay).toBeVisible({ timeout: 5_000 })

    // Inner panel carries data-reduced-motion="true"
    const panel = overlay.locator('[data-reduced-motion]')
    await expect(panel).toHaveAttribute('data-reduced-motion', 'true')

    // Ring carries the reduced-motion class
    const ring = overlay.locator('circle.quick-lift-ring--reduced')
    await expect(ring).toHaveCount(1)

    // No countdown numbers
    const overlayText = (await overlay.textContent()) ?? ''
    expect(overlayText).not.toMatch(/\d+\s*(second|sec\b|%|left|remaining)/i)

    // Close overlay manually rather than wait the full 30 seconds (faster).
    await overlay.getByTestId('quick-lift-overlay-close').click()
    await expect(overlay).toBeHidden({ timeout: 2_000 })

    await context.close()
  })
})
