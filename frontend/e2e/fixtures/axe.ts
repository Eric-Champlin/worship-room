import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import type { Result } from 'axe-core'

/**
 * Standard WCAG 2.1 AA tag set used by Worship Room E2E a11y scans.
 * NOTE: project target per CLAUDE.md is WCAG 2.2 AA; bump the wcag22aa tag
 * here when @axe-core/playwright supports it.
 */
export const STANDARD_AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa'] as const

interface RunAxeScanOptions {
  /** Optional CSS selector to scope the scan to a specific region. */
  include?: string
}

/**
 * Run an axe-core WCAG 2.1 AA scan and return the violations array.
 * Replaces the multi-line AxeBuilder boilerplate currently inlined in
 * spec-1-9, spec-1-9b, and full-site-audit.
 */
export async function runAxeScan(
  page: Page,
  opts: RunAxeScanOptions = {},
): Promise<Result[]> {
  let builder = new AxeBuilder({ page }).withTags([...STANDARD_AXE_TAGS])
  if (opts.include) {
    builder = builder.include(opts.include)
  }
  const results = await builder.analyze()
  return results.violations
}
