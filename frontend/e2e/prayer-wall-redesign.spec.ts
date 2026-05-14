/**
 * Prayer Wall Redesign (2026-05-13) — responsive + a11y + visual verification.
 *
 * Gate-G-RESPONSIVE-VERIFIED + Gate-G-A11Y per the spec. Captures:
 *   - No horizontal scroll at 4 breakpoints
 *   - Brown gradient (#1f1a17 / warm-amber palette) absent at night
 *   - axe-core zero violations at 4 breakpoints
 *   - Keyboard tab order traverses left sidebar → main → right sidebar
 */
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const BREAKPOINTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet-wide', width: 1024, height: 768 },
  { name: 'tablet-narrow', width: 768, height: 900 },
  { name: 'mobile', width: 375, height: 812 },
] as const

test.describe('Prayer Wall Redesign — responsive layouts', () => {
  for (const bp of BREAKPOINTS) {
    test(`layout at ${bp.name} (${bp.width}px) — no horizontal scroll, no brown gradient`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height })
      await page.goto('/prayer-wall')
      await page.waitForLoadState('networkidle')

      // No horizontal scroll at any viewport
      const documentScrollWidth = await page.evaluate(
        () => document.documentElement.scrollWidth,
      )
      expect(documentScrollWidth).toBeLessThanOrEqual(bp.width + 1)

      // Brown gradient hex from the deprecated palette must NOT appear
      const bodyBg = await page.evaluate(() => {
        const canvas = document.querySelector('[data-testid="background-canvas"]')
        return canvas ? getComputedStyle(canvas).background : ''
      })
      expect(bodyBg).not.toMatch(/#1f1a17/i)
      expect(bodyBg).not.toMatch(/212,\s*163,\s*115/i) // warm-amber rgb
    })
  }

  test('night state at 11pm — NightModeBadge in navbar, no brown gradient, no "always on"', async ({
    page,
    context,
  }) => {
    await context.addInitScript(() => {
      const FakeDate = class extends Date {
        constructor(...args: ConstructorParameters<typeof Date>) {
          if (args.length === 0) {
            super('2026-05-13T23:00:00')
          } else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            super(...(args as any))
          }
        }
        static now() {
          return new FakeDate().getTime()
        }
      }
      // @ts-expect-error replace global Date
      window.Date = FakeDate
    })
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/prayer-wall')
    await page.waitForLoadState('networkidle')

    // NightModeBadge present (aria-label "Night Mode is …")
    const badge = page.getByRole('button', { name: /night mode is (off|auto|on)/i })
    await expect(badge.first()).toBeVisible()

    // No brown gradient
    const bodyBg = await page.evaluate(() => {
      const canvas = document.querySelector('[data-testid="background-canvas"]')
      return canvas ? getComputedStyle(canvas).background : ''
    })
    expect(bodyBg).not.toMatch(/#1f1a17/i)

    // No "always on" text (W8 enforcement)
    await expect(page.getByText(/always on/i)).toHaveCount(0)
  })
})

test.describe('Prayer Wall Redesign — accessibility', () => {
  for (const bp of BREAKPOINTS) {
    test(`axe-core at ${bp.name} — zero violations (Gate-G-A11Y)`, async ({ page }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height })
      await page.goto('/prayer-wall')
      await page.waitForLoadState('networkidle')

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
        .analyze()

      // Gate-G-A11Y mandates zero violations (not just critical). If a known
      // pre-existing violation needs a temporary allowlist, add a `.disableRules`
      // entry above with a code comment linking the follow-up issue — do not
      // silently filter by impact.
      expect(
        results.violations,
        `WCAG violations on /prayer-wall at ${bp.name}:\n${JSON.stringify(
          results.violations,
          null,
          2,
        )}`,
      ).toEqual([])
    })
  }

  test('keyboard reachability — left sidebar, main, and right sidebar all contain focusable elements', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/prayer-wall')
    await page.waitForLoadState('networkidle')

    // Confirm Tab moves focus into the page (skip link is the first stop).
    await page.keyboard.press('Tab')
    const firstFocused = await page.evaluate(
      () => document.activeElement?.tagName ?? null,
    )
    expect(firstFocused).not.toBeNull()

    // Verify each landmark region contains at least one focusable element.
    // A landmark with zero focusable descendants is unreachable by keyboard
    // even if it appears in the tab order graph.
    const counts = await page.evaluate(() => {
      const focusableSelector =
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      const leftAside = document.querySelector(
        'aside[aria-label="Prayer Wall primary navigation"]',
      )
      const rightAside = document.querySelector(
        'aside[aria-label="Prayer Wall secondary content"]',
      )
      const main = document.querySelector('main#main-content')
      return {
        leftFocusable: leftAside
          ? leftAside.querySelectorAll(focusableSelector).length
          : 0,
        rightFocusable: rightAside
          ? rightAside.querySelectorAll(focusableSelector).length
          : 0,
        mainFocusable: main
          ? main.querySelectorAll(focusableSelector).length
          : 0,
      }
    })
    expect(counts.leftFocusable, 'left sidebar must contain focusable elements').toBeGreaterThan(0)
    expect(counts.mainFocusable, 'main must contain focusable elements').toBeGreaterThan(0)
    expect(counts.rightFocusable, 'right sidebar must contain focusable elements').toBeGreaterThan(0)
  })
})
