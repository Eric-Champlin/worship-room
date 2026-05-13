/**
 * Spec 6.3 — Night Mode end-to-end coverage.
 *
 * Scenarios:
 *   1. Initial render at a night hour (23:00, fresh localStorage) applies the
 *      Night Mode attribute and shows the NightWatchChip.
 *   2. Initial render at a day hour (14:00) shows no night-mode attribute and
 *      no chip.
 *   3. Cross-route scope (Gate-G-SCOPE-PRAYER-WALL-ONLY): `/daily` at 23:00 has
 *      no `data-night-mode='on'` anywhere and no inline-script `data-prayer-wall-
 *      night-mode-pending` on `<html>`.
 *   4. No-FOUC: at 23:00, the inline `index.html` script applies
 *      `data-prayer-wall-night-mode-pending='on'` to `<html>` BEFORE React
 *      hydrates, so the document carries the attribute on DOMContentLoaded.
 *   5. Accessibility: axe-core finds zero critical violations in the night-active
 *      state across desktop and mobile viewports.
 *
 * Live hour-boundary transitions (the 60s polling tick re-evaluating active state
 * mid-session) are covered by the unit tests at `useNightMode.test.ts`. We
 * deliberately do NOT re-test that path here — the unit tests with fake timers
 * are more reliable than mocking time inside a browser context.
 */
import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

// Mock the browser's clock so the inline no-FOUC script + useNightMode hook
// see a fixed hour. Must run via addInitScript so it executes BEFORE any page
// script, including the inline IIFE in index.html.
async function mockHour(page: Page, hour: number) {
  await page.addInitScript(
    (h: number) => {
      const RealDate = Date
      class MockDate extends RealDate {
        constructor(...args: ConstructorParameters<typeof Date>) {
          if (args.length === 0) {
            super(2026, 4, 13, h, 0, 0)
          } else {
            // @ts-expect-error: forwarding args to RealDate
            super(...args)
          }
        }
        getHours() {
          return h
        }
        static now() {
          return new MockDate().getTime()
        }
      }
      // @ts-expect-error: monkey-patch the global
      window.Date = MockDate
    },
    hour,
  )
}

async function clearStorage(page: Page) {
  await page.addInitScript(() => {
    try {
      localStorage.clear()
    } catch (_) {
      /* ignored */
    }
  })
}

test.describe('Spec 6.3 — Night Mode', () => {
  test('at 23:00 with fresh localStorage, /prayer-wall renders night-mode attribute and chip', async ({
    page,
  }) => {
    await clearStorage(page)
    await mockHour(page, 23)
    await page.goto('/prayer-wall')
    await page.waitForLoadState('networkidle')

    await expect(
      page.locator('[data-testid="background-canvas"]').first(),
    ).toHaveAttribute('data-night-mode', 'on')

    // Computed-style assertion — the night-mode CSS rule MUST actually win
    // against BackgroundCanvas's inline `style={{ background: ... }}` (which
    // applies the day-state violet gradient via inline style, specificity
    // 1,0,0,0). Without `!important` on the night override, the attribute
    // selector loses and night mode silently fails to paint. Regression guard
    // for that exact specificity bug — check the resolved background-image
    // contains the warm amber bloom rgba (`rgba(212, 163, 115, …)`) rather
    // than the day-state violet (`rgba(167, 139, 250, …)`).
    const computedBg = await page
      .locator('[data-testid="background-canvas"]')
      .first()
      .evaluate((el) => getComputedStyle(el).backgroundImage)
    expect(computedBg).toContain('212, 163, 115')
    expect(computedBg).not.toContain('167, 139, 250')

    // Hero subtitle uses the night variant.
    await expect(
      page.getByText("It's quiet here. You're awake."),
    ).toBeVisible()

    // Night Watch chip is mounted.
    await expect(
      page.getByRole('button', { name: /night mode active/i }),
    ).toBeVisible()

    // Browser tab title gets the night-state " • Night • " segment (Helmet
    // flushes after hydration — wait until the title contains "Night").
    await expect.poll(() => page.title(), { timeout: 2000 }).toContain('Night')
    expect(await page.title()).toContain('Prayer Wall')
    expect(await page.title()).toContain('Worship Room')
  })

  test('at 14:00, /prayer-wall renders day-state with no chip', async ({
    page,
  }) => {
    await clearStorage(page)
    await mockHour(page, 14)
    await page.goto('/prayer-wall')
    await page.waitForLoadState('networkidle')

    await expect(
      page.locator('[data-testid="background-canvas"]').first(),
    ).toHaveAttribute('data-night-mode', 'off')

    // Hero subtitle uses the day variant.
    await expect(
      page.getByText('What weighs on you today?'),
    ).toBeVisible()

    // No chip rendered.
    await expect(
      page.getByRole('button', { name: /night mode active/i }),
    ).toHaveCount(0)
  })

  test('cross-route scope: /daily at 23:00 has no night-mode attribute (Gate-G-SCOPE-PRAYER-WALL-ONLY)', async ({
    page,
  }) => {
    await clearStorage(page)
    await mockHour(page, 23)
    await page.goto('/daily')
    await page.waitForLoadState('networkidle')

    // Daily Hub has its own BackgroundCanvas but no night-mode wiring.
    await expect(page.locator('[data-night-mode="on"]')).toHaveCount(0)
    // <html> never carries the pending attribute outside /prayer-wall(/...) routes.
    const pendingAttr = await page.evaluate(() =>
      document.documentElement.getAttribute('data-prayer-wall-night-mode-pending'),
    )
    expect(pendingAttr).toBeNull()
  })

  test('no-FOUC: at 23:00 the inline script sets data-prayer-wall-night-mode-pending="on" on <html> before hydration', async ({
    page,
  }) => {
    await clearStorage(page)
    await mockHour(page, 23)
    // domcontentloaded fires after the inline IIFE runs but before React hydrates.
    await page.goto('/prayer-wall', { waitUntil: 'domcontentloaded' })
    const pendingAttr = await page.evaluate(() =>
      document.documentElement.getAttribute('data-prayer-wall-night-mode-pending'),
    )
    expect(pendingAttr).toBe('on')
  })

  test('accessibility: zero critical axe-core violations at /prayer-wall in night state (desktop + mobile)', async ({
    page,
  }) => {
    await clearStorage(page)
    await mockHour(page, 23)

    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 768, height: 1024 },
      { width: 375, height: 812 },
    ]) {
      await page.setViewportSize(viewport)
      await page.goto('/prayer-wall')
      await page.waitForLoadState('networkidle')
      const results = await new AxeBuilder({ page }).analyze()
      const critical = results.violations.filter((v) => v.impact === 'critical')
      expect(
        critical,
        `Critical axe violations at ${viewport.width}×${viewport.height}:\n${JSON.stringify(critical, null, 2)}`,
      ).toEqual([])
    }
  })
})
