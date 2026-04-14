/**
 * BB-36 Performance: Core flow timing measurements.
 *
 * These tests capture timing metrics for key user flows.
 * They do NOT assert thresholds — this is measurement only.
 *
 * Usage:
 *   pnpm dev &  # or pnpm preview
 *   npx playwright test tests/performance/
 */

import { test } from '@playwright/test'

function logTiming(name: string, ms: number) {
  const rounded = Math.round(ms)
  console.log(`[PERF] ${name}: ${rounded}ms`)
}

// Dismiss welcome dialog and other first-run UI
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('wr_first_run_completed', Date.now().toString())
  })
})

test.describe('Performance: Core Flows', () => {
  test('1. Cold load — Home page', async ({ page }) => {
    const start = Date.now()
    await page.goto('/', { waitUntil: 'load' })
    const loadTime = Date.now() - start

    const timing = await page.evaluate(() => {
      const t = performance.timing
      return {
        ttfb: t.responseStart - t.navigationStart,
        domContentLoaded: t.domContentLoadedEventEnd - t.navigationStart,
        load: t.loadEventEnd - t.navigationStart,
      }
    })

    // LCP via PerformanceObserver
    const lcp = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let lcpValue = 0
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          for (const entry of entries) {
            lcpValue = entry.startTime
          }
        })
        observer.observe({ type: 'largest-contentful-paint', buffered: true })
        // Give it a moment to collect buffered entries
        setTimeout(() => {
          observer.disconnect()
          resolve(Math.round(lcpValue))
        }, 1000)
      })
    })

    logTiming('Home — TTFB', timing.ttfb)
    logTiming('Home — DOMContentLoaded', timing.domContentLoaded)
    logTiming('Home — Load', timing.load)
    logTiming('Home — LCP', lcp)
    logTiming('Home — Total (wall clock)', loadTime)
  })

  test('2. Home to Bible navigation', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('a[href="/bible"]', { timeout: 10000 })

    const start = Date.now()
    await page.click('a[href="/bible"]')
    await page.waitForURL('/bible')
    await page.waitForSelector('h1, main', { timeout: 10000 })
    const elapsed = Date.now() - start

    logTiming('Home → Bible navigation', elapsed)
  })

  test('3. Bible chapter cold load', async ({ page }) => {
    const start = Date.now()
    await page.goto('/bible/john/3', { waitUntil: 'domcontentloaded' })
    // Wait for verse content — Bible reader renders verses as <span> elements
    await page.waitForSelector('[data-verse-number], .verse-text, span[id^="v"]', {
      timeout: 20000,
    })
    const elapsed = Date.now() - start

    logTiming('Bible chapter cold load (John 3)', elapsed)
  })

  test('4. Chapter-to-chapter navigation', async ({ page }) => {
    await page.goto('/bible/john/3', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('[data-verse-number], .verse-text, span[id^="v"]', {
      timeout: 20000,
    })

    // Navigate to chapter 4 via URL (more reliable than finding a button)
    const start = Date.now()
    await page.goto('/bible/john/4', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('[data-verse-number], .verse-text, span[id^="v"]', {
      timeout: 20000,
    })
    const elapsed = Date.now() - start

    logTiming('Chapter-to-chapter (John 3 → 4)', elapsed)
  })

  test('5. Daily Hub tab switching', async ({ page }) => {
    await page.goto('/daily', { waitUntil: 'domcontentloaded' })
    // Wait for initial tab content
    await page.waitForTimeout(500)

    const tabs = ['pray', 'journal', 'meditate', 'devotional']
    for (const tab of tabs) {
      const start = Date.now()
      const tabButton = page.locator(
        `button:has-text("${tab}"), a[href*="tab=${tab}"], [role="tab"]:has-text("${tab}")`,
      )
      if ((await tabButton.count()) > 0) {
        await tabButton.first().click()
      } else {
        await page.goto(`/daily?tab=${tab}`)
      }
      await page.waitForTimeout(300) // Allow transition
      const elapsed = Date.now() - start

      logTiming(`Daily Hub tab → ${tab}`, elapsed)
    }
  })

  test('6. Search query to results', async ({ page }) => {
    // Navigate directly to Bible search mode via ?mode=search
    await page.goto('/bible?mode=search', { waitUntil: 'domcontentloaded' })

    // Find the search input
    const searchInput = page.locator('#bible-search-input')
    await searchInput.waitFor({ timeout: 10000 })

    const start = Date.now()
    await searchInput.fill('love')
    // Wait for results — the count text shows "X verses found" or a result link appears
    await page.waitForSelector('a[href*="/bible/"]', { timeout: 60000 })
    const elapsed = Date.now() - start

    logTiming('Bible search "love" → first result', elapsed)
  })

  test('7. My Bible page load', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('wr_auth_simulated', 'true')
      localStorage.setItem('wr_user_name', 'Test User')
    })

    const start = Date.now()
    await page.goto('/bible/my', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('main, h1, h2', { timeout: 10000 })
    const elapsed = Date.now() - start

    logTiming('My Bible page load', elapsed)
  })
})
