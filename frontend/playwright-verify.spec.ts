import { test, expect, type Page } from '@playwright/test'

const BASE_URL = 'http://localhost:5173'
const SCREENSHOT_DIR = 'playwright-screenshots'

const BREAKPOINTS = {
  mobileS: { width: 375, height: 812 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1440, height: 900 },
}

const consoleErrors: { page: string; text: string }[] = []
const consoleWarnings: { page: string; text: string }[] = []
const networkFailures: { url: string; status: number; method: string }[] = []
const IGNORE_PATTERNS = [
  'DevTools',
  'HMR',
  '[vite]',
  'favicon.ico',
  'chrome-extension://',
  'Download the React DevTools',
]

function shouldIgnore(text: string): boolean {
  return IGNORE_PATTERNS.some((p) => text.includes(p))
}

async function seedAuth(page: Page) {
  await page.addInitScript(() => {
    try {
      localStorage.clear()
    } catch {}
    localStorage.setItem('wr_auth_simulated', 'true')
    localStorage.setItem('wr_user_name', 'Eric')
  })
}

async function attachDiagnostics(page: Page, label: string) {
  page.on('console', (msg) => {
    const t = msg.text()
    if (shouldIgnore(t)) return
    if (msg.type() === 'error') consoleErrors.push({ page: label, text: t })
    if (msg.type() === 'warning') consoleWarnings.push({ page: label, text: t })
  })
  page.on('pageerror', (err) => {
    consoleErrors.push({ page: label, text: `PAGEERROR: ${err.message}` })
  })
  page.on('response', (resp) => {
    if (resp.status() >= 400 && !shouldIgnore(resp.url())) {
      networkFailures.push({ url: resp.url(), status: resp.status(), method: resp.request().method() })
    }
  })
}

async function waitForRender(page: Page, selector?: string) {
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
  if (selector) {
    await page.waitForSelector(selector, { state: 'visible', timeout: 10000 })
  }
  await page.waitForTimeout(400)
}

type Reactions = Record<string, { prayerId: string; isPraying: boolean; isBookmarked: boolean }>

async function readStorageReactions(page: Page): Promise<Reactions | null> {
  return page.evaluate(() => {
    const raw = localStorage.getItem('wr_prayer_reactions')
    return raw ? JSON.parse(raw) : null
  })
}

function diffChangedPrayerId(before: Reactions | null, after: Reactions | null, field: 'isPraying' | 'isBookmarked'): string | null {
  if (!after) return null
  for (const [id, reaction] of Object.entries(after)) {
    const prev = before?.[id]
    if (!prev || prev[field] !== reaction[field]) {
      return id
    }
  }
  return null
}

test.describe('Prayer reactions reactive store verification', () => {
  test('cross-page reaction persistence + localStorage write-through', async ({ browser }) => {
    const context = await browser.newContext({ viewport: BREAKPOINTS.desktop })
    const page = await context.newPage()
    await attachDiagnostics(page, 'desktop')
    await seedAuth(page)

    // ---- STEP 1: Load /prayer-wall and verify seed from mock ----
    await page.goto(`${BASE_URL}/prayer-wall`)
    await waitForRender(page, 'main')
    await page.screenshot({ path: `${SCREENSHOT_DIR}/step1-prayer-wall-initial-1440x900.png`, fullPage: true })

    const initialReactions = await readStorageReactions(page)
    expect(initialReactions, 'Store should seed from mock on first load').not.toBeNull()
    expect(initialReactions?.['prayer-1'], 'prayer-1 should be in seeded mock reactions').toBeDefined()
    expect(initialReactions?.['prayer-1'].isPraying, 'prayer-1.isPraying should be true from mock').toBe(true)
    expect(initialReactions?.['prayer-1'].isBookmarked, 'prayer-1.isBookmarked should be true from mock').toBe(true)
    console.log(`[STEP 1 OK] Seed loaded. Keys: ${Object.keys(initialReactions!).length}`)

    // ---- STEP 2: Tap the first "Pray for this request" button (an unpraying card) ----
    const prayButtons = page.getByRole('button', { name: /Pray for this request/i })
    const prayCount = await prayButtons.count()
    console.log(`[STEP 2] Found ${prayCount} unpraying buttons on feed`)
    expect(prayCount, 'Should have at least one unpraying prayer on feed').toBeGreaterThan(0)

    await prayButtons.first().scrollIntoViewIfNeeded()
    await prayButtons.first().click()
    await page.waitForTimeout(500) // let ceremony animation settle

    const afterPrayToggle = await readStorageReactions(page)
    const toggledPrayerId = diffChangedPrayerId(initialReactions, afterPrayToggle, 'isPraying')
    console.log(`[STEP 2 OK] Toggled prayerId=${toggledPrayerId}, store now has ${Object.keys(afterPrayToggle!).length} keys`)
    expect(toggledPrayerId, 'A prayerId should have flipped its isPraying flag').not.toBeNull()
    expect(afterPrayToggle![toggledPrayerId!].isPraying).toBe(true)

    // ---- STEP 3: Navigate to /prayer-wall/:id for the toggled prayer ----
    await page.goto(`${BASE_URL}/prayer-wall/${toggledPrayerId}`)
    await waitForRender(page, 'main')
    await page.screenshot({ path: `${SCREENSHOT_DIR}/step3-detail-page-1440x900.png`, fullPage: true })

    // The detail page for a praying prayer should have a "Stop praying" button (aria-pressed=true)
    const stopPrayingOnDetail = await page.getByRole('button', { name: /Stop praying/i }).count()
    console.log(`[STEP 3] Detail page: "Stop praying" buttons = ${stopPrayingOnDetail}`)
    expect(stopPrayingOnDetail, 'Detail page should show praying state (Stop praying button)').toBeGreaterThan(0)
    console.log('[STEP 3 OK] Reactive store propagates state from feed → detail page')

    // ---- STEP 4: Navigate back to /prayer-wall, verify toggled state survives ----
    await page.goto(`${BASE_URL}/prayer-wall`)
    await waitForRender(page, 'main')
    await page.screenshot({ path: `${SCREENSHOT_DIR}/step4-back-to-feed-1440x900.png`, fullPage: true })

    const stopPrayingOnFeed = await page.getByRole('button', { name: /Stop praying/i }).count()
    console.log(`[STEP 4] Feed: "Stop praying" buttons = ${stopPrayingOnFeed}`)
    // Should be >= 2: at least the original prayer-1 + our newly toggled one
    expect(stopPrayingOnFeed, 'Feed should show multiple praying states').toBeGreaterThanOrEqual(2)
    console.log('[STEP 4 OK] Toggle survives navigation back to feed')

    // ---- STEP 5: /prayer-wall/dashboard ----
    await page.goto(`${BASE_URL}/prayer-wall/dashboard`)
    await waitForRender(page, 'main')
    await page.screenshot({ path: `${SCREENSHOT_DIR}/step5-dashboard-1440x900.png`, fullPage: true })
    const dashStorage = await readStorageReactions(page)
    expect(dashStorage, 'Dashboard should still read from same reactions store').not.toBeNull()
    expect(dashStorage![toggledPrayerId!]?.isPraying, 'Toggled prayer state consistent on dashboard').toBe(true)
    console.log('[STEP 5 OK] /prayer-wall/dashboard loads, store consistent')

    // ---- STEP 6: /prayer-wall/user/user-1 ----
    await page.goto(`${BASE_URL}/prayer-wall/user/user-1`)
    await waitForRender(page, 'main')
    await page.screenshot({ path: `${SCREENSHOT_DIR}/step6-user-profile-1440x900.png`, fullPage: true })
    const profStorage = await readStorageReactions(page)
    expect(profStorage, 'User profile page should still read from same reactions store').not.toBeNull()
    console.log('[STEP 6 OK] /prayer-wall/user/user-1 loads, store consistent')

    // ---- STEP 7: Bookmark toggle + page.reload() persistence ----
    await page.goto(`${BASE_URL}/prayer-wall`)
    await waitForRender(page, 'main')

    const beforeBookmark = await readStorageReactions(page)

    const bookmarkButtons = page.getByRole('button', { name: /Bookmark this prayer/i })
    const bookmarkBtnCount = await bookmarkButtons.count()
    console.log(`[STEP 7] Unbookmarked buttons on feed: ${bookmarkBtnCount}`)
    expect(bookmarkBtnCount, 'Should have at least one unbookmarked prayer to toggle').toBeGreaterThan(0)

    await bookmarkButtons.first().scrollIntoViewIfNeeded()
    await bookmarkButtons.first().click()
    await page.waitForTimeout(400)

    const afterBookmark = await readStorageReactions(page)
    const bookmarkedId = diffChangedPrayerId(beforeBookmark, afterBookmark, 'isBookmarked')
    console.log(`[STEP 7] Bookmarked prayerId=${bookmarkedId}`)
    expect(bookmarkedId, 'A prayerId should have flipped its isBookmarked flag').not.toBeNull()
    expect(afterBookmark![bookmarkedId!].isBookmarked).toBe(true)

    const bookmarkedCountBefore = Object.values(afterBookmark!).filter((r) => r.isBookmarked).length
    console.log(`[STEP 7] bookmarked count before reload: ${bookmarkedCountBefore}`)

    await page.reload()
    await waitForRender(page, 'main')

    const afterReload = await readStorageReactions(page)
    const bookmarkedCountAfter = Object.values(afterReload!).filter((r) => r.isBookmarked).length
    console.log(`[STEP 7] bookmarked count after reload: ${bookmarkedCountAfter}`)
    expect(bookmarkedCountAfter, 'Bookmark count must persist across page reload').toBe(bookmarkedCountBefore)
    expect(afterReload![bookmarkedId!]?.isBookmarked, 'Specific bookmarked prayer state must persist').toBe(true)

    // Verify UI reflects the persisted state — count "Remove bookmark" buttons
    const removeBookmarkAfterReload = await page.getByRole('button', { name: /Remove bookmark/i }).count()
    console.log(`[STEP 7] "Remove bookmark" buttons after reload: ${removeBookmarkAfterReload}`)
    expect(removeBookmarkAfterReload, 'UI should render bookmarked state after reload').toBeGreaterThan(0)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/step7-after-reload-1440x900.png`, fullPage: true })
    console.log('[STEP 7 OK] Bookmark toggle persists across page reload via localStorage')

    // ---- STEP 8: Responsive screenshots of feed ----
    for (const [name, vp] of Object.entries(BREAKPOINTS)) {
      await page.setViewportSize(vp)
      await page.waitForTimeout(500)
      await page.screenshot({ path: `${SCREENSHOT_DIR}/feed-responsive-${name}-${vp.width}x${vp.height}.png`, fullPage: true })
    }
    console.log('[STEP 8 OK] Responsive screenshots captured at 375 / 768 / 1440')

    // ---- Diagnostics summary ----
    console.log(`\n=== DIAGNOSTICS ===`)
    console.log(`Console errors: ${consoleErrors.length}`)
    consoleErrors.forEach((e) => console.log(`  [${e.page}] ${e.text.slice(0, 200)}`))
    console.log(`Console warnings: ${consoleWarnings.length}`)
    consoleWarnings.forEach((e) => console.log(`  [${e.page}] ${e.text.slice(0, 200)}`))
    console.log(`Network failures: ${networkFailures.length}`)
    networkFailures.forEach((n) => console.log(`  ${n.method} ${n.url} ${n.status}`))

    await context.close()
  })
})
