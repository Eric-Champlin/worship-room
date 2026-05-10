import { test, expect, type Page } from '@playwright/test'

/**
 * Regression contract — `position: sticky` on BackgroundCanvas-mounted pages.
 *
 * History: Spec 14 (Cinematic Hero Rollout, 2026-05-07) introduced
 * `BackgroundCanvas` and used `overflow-hidden` on its root. That established a
 * scroll container which trapped descendants with `position: sticky` — they
 * scrolled with the body instead of clamping to viewport top. Caught during
 * Spec 4.8 verification on Prayer Wall, then confirmed site-wide on /daily and
 * /grow.
 *
 * Fix (post-Spec-4.8): `BackgroundCanvas` switched to `overflow-x-clip` (clip
 * does NOT establish a scroll container). This spec locks in that contract.
 *
 * If this spec fails, do NOT silence it — the sticky filter / tab bar UX is
 * load-bearing for those pages. Investigate any change to `BackgroundCanvas`
 * or to the consumer pages' overflow declarations.
 */
test.describe('Sticky descendants of BackgroundCanvas engage on scroll', () => {
  async function gotoAndScroll(page: Page, route: string) {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(route)
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForTimeout(500)
    await page.evaluate(() => window.scrollTo(0, 1500))
    await page.waitForTimeout(400)
  }

  async function topOfFirstSticky(page: Page) {
    return page.evaluate(() => {
      const sticky = Array.from(document.querySelectorAll<HTMLElement>('*')).find(
        (el) => window.getComputedStyle(el).position === 'sticky',
      )
      return sticky ? sticky.getBoundingClientRect().top : null
    })
  }

  test('/prayer-wall — RoomSelector + CategoryFilterBar wrapper sticks (Spec 4.8)', async ({
    page,
  }) => {
    await gotoAndScroll(page, '/prayer-wall')
    const top = await topOfFirstSticky(page)
    expect(top, 'no sticky element found on /prayer-wall').not.toBeNull()
    expect(top!).toBeLessThan(50)
    expect(top!).toBeGreaterThanOrEqual(-10)
  })

  test('/daily — Tab bar sticks (Daily Hub Visual Architecture)', async ({ page }) => {
    await gotoAndScroll(page, '/daily')
    const top = await topOfFirstSticky(page)
    expect(top, 'no sticky element found on /daily').not.toBeNull()
    expect(top!).toBeLessThan(50)
    expect(top!).toBeGreaterThanOrEqual(-10)
  })

  test('/grow — Filter bar sticks', async ({ page }) => {
    await gotoAndScroll(page, '/grow')
    const top = await topOfFirstSticky(page)
    expect(top, 'no sticky element found on /grow').not.toBeNull()
    expect(top!).toBeLessThan(50)
    expect(top!).toBeGreaterThanOrEqual(-10)
  })

  test('BackgroundCanvas root must NOT use overflow-hidden (use overflow-x-clip)', async ({
    page,
  }) => {
    // Smoke check on Prayer Wall — the BackgroundCanvas root must apply
    // overflow-x: clip so it constrains horizontal scroll without creating
    // a scroll container that traps sticky.
    await page.goto('/prayer-wall')
    await page.waitForLoadState('networkidle').catch(() => {})
    const overflow = await page.evaluate(() => {
      const canvas = document.querySelector('[data-testid="background-canvas"]')
      if (!canvas) return null
      const cs = window.getComputedStyle(canvas as HTMLElement)
      return { overflowX: cs.overflowX, overflowY: cs.overflowY }
    })
    expect(overflow, 'BackgroundCanvas not found on /prayer-wall').not.toBeNull()
    expect(overflow!.overflowY).toBe('visible')
    // overflow-x: clip is the canonical post-Spec-4.8 value.
    expect(['clip']).toContain(overflow!.overflowX)
  })

  test('No horizontal scrollbar on BackgroundCanvas pages at desktop width', async ({ page }) => {
    for (const route of ['/prayer-wall', '/daily', '/grow']) {
      await page.setViewportSize({ width: 1440, height: 900 })
      await page.goto(route)
      await page.waitForLoadState('networkidle').catch(() => {})
      await page.waitForTimeout(300)
      const sw = await page.evaluate(() => ({
        docW: document.documentElement.scrollWidth,
        winW: window.innerWidth,
      }))
      expect(sw.docW, `horizontal scrollbar on ${route}`).toBeLessThanOrEqual(sw.winW + 1)
    }
  })
})
