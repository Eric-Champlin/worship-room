/**
 * Universal Rule 17 — Phase 4 a11y smoke (Spec 4.8 cutover gate).
 *
 * axe-core scans on three Prayer Wall routes covering the dual-filter URL
 * surface. Asserts zero CRITICAL violations. MEDIUM/MINOR violations are
 * captured in the JSON evidence file for later review (see
 * `_cutover-evidence/phase4-a11y-smoke.json`).
 */
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const ROUTES = [
  '/prayer-wall',
  '/prayer-wall?postType=testimony',
  '/prayer-wall?postType=encouragement&category=mental-health',
]

test.describe('Universal Rule 17 — Phase 4 a11y smoke', () => {
  for (const route of ROUTES) {
    test(`${route} — zero CRITICAL violations`, async ({ page }) => {
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      const results = await new AxeBuilder({ page }).analyze()
      const critical = results.violations.filter((v) => v.impact === 'critical')
      expect(
        critical,
        `Critical violations on ${route}:\n${JSON.stringify(critical, null, 2)}`,
      ).toEqual([])
    })
  }
})
