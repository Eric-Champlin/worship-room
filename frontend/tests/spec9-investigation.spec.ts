/**
 * Spec 9 visual investigation: CONCERN 2 (textarea glow), CONCERN 3 (BackgroundCanvas),
 * and CONCERN 4 (screenshots A–G).
 */
import { test, expect, type Page } from '@playwright/test'

const BASE_URL = 'http://localhost:5173'
const DIR = 'playwright-screenshots/spec9'

const MOCK_ASK_RESPONSE = {
  data: {
    id: 'inv-response',
    answer: "God's Word offers profound comfort in suffering. Romans 8:28 reminds us that all things work together for those who love God.",
    verses: [
      {
        reference: 'Romans 8:28',
        text: 'We know that all things work together for good for those who love God, to those who are called according to his purpose.',
        explanation: 'This verse offers comfort that even difficult circumstances can be part of a greater purpose.',
        translation: 'WEB',
      },
      {
        reference: 'Psalm 34:18',
        text: 'Yahweh is near to those who have a broken heart, and saves those who have a crushed spirit.',
        explanation: 'A direct promise of God\'s nearness in emotional pain.',
        translation: 'WEB',
      },
    ],
    followUpQuestions: [
      'How can I find peace in hard times?',
      'What does the Bible say about comfort?',
      'How do I trust God when life is hard?',
    ],
    encouragement: 'Your pain is real and seen. God has not abandoned you.',
    prayer: 'Lord, be near to this hurting heart. Let your peace guard my mind.',
  },
  meta: { requestId: 'inv-req-1' },
}

async function interceptAsk(page: Page) {
  await page.route('**/api/v1/proxy/ai/ask', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_ASK_RESPONSE),
    }),
  )
}

async function mkdir(page: Page) {
  // Ensure screenshot dir exists via evaluate — we just need the path to work
}

// ---------------------------------------------------------------------------
// CONCERN 2 — Textarea violet glow inspection
// ---------------------------------------------------------------------------
test('CONCERN 2 — textarea box-shadow computed style matches canonical', async ({ page }) => {
  await interceptAsk(page)
  await page.goto(`${BASE_URL}/ask`)
  await page.waitForSelector('textarea#ask-input', { state: 'visible', timeout: 10000 })
  await page.waitForTimeout(300)

  const unfocusedStyles = await page.evaluate(() => {
    const el = document.getElementById('ask-input')
    if (!el) return null
    const cs = getComputedStyle(el)
    return {
      boxShadow: cs.getPropertyValue('box-shadow'),
      border: cs.getPropertyValue('border'),
      background: cs.getPropertyValue('background'),
      overflow: cs.getPropertyValue('overflow'),
    }
  })

  console.log('=== CONCERN 2: AskPage textarea computed styles (unfocused) ===')
  console.log(JSON.stringify(unfocusedStyles, null, 2))

  // Check parent overflow
  const parentOverflows = await page.evaluate(() => {
    let el = document.getElementById('ask-input')?.parentElement
    const overflows: string[] = []
    while (el && el !== document.body) {
      const ov = getComputedStyle(el).overflow
      if (ov !== 'visible') overflows.push(`${el.tagName}.${el.className.slice(0, 40)}: overflow=${ov}`)
      el = el.parentElement
    }
    return overflows
  })
  console.log('Parent overflow-hidden ancestors:', parentOverflows)

  // Focus and check
  await page.focus('textarea#ask-input')
  await page.waitForTimeout(300)

  const focusedStyles = await page.evaluate(() => {
    const el = document.getElementById('ask-input')
    if (!el) return null
    const cs = getComputedStyle(el)
    return {
      boxShadow: cs.getPropertyValue('box-shadow'),
      outline: cs.getPropertyValue('outline'),
    }
  })
  console.log('=== CONCERN 2: AskPage textarea computed styles (focused) ===')
  console.log(JSON.stringify(focusedStyles, null, 2))

  // Compare with Daily Hub pray textarea
  await page.goto(`${BASE_URL}/daily?tab=pray`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)

  const prayTextarea = page.locator('textarea').first()
  const prayStyles = await prayTextarea.evaluate((el) => {
    const cs = getComputedStyle(el)
    return {
      boxShadow: cs.getPropertyValue('box-shadow'),
      border: cs.getPropertyValue('border'),
    }
  }).catch(() => null)
  console.log('=== CONCERN 2: Daily Hub PrayerInput textarea computed styles ===')
  console.log(JSON.stringify(prayStyles, null, 2))

  // The box-shadow values should both contain rgba(167,139,250
  expect(unfocusedStyles?.boxShadow).toContain('167')
  expect(unfocusedStyles?.boxShadow).toContain('139')
  expect(unfocusedStyles?.boxShadow).toContain('250')
})

// ---------------------------------------------------------------------------
// CONCERN 3 — BackgroundCanvas DOM inspection
// ---------------------------------------------------------------------------
test('CONCERN 3 — BackgroundCanvas renders on /ask, no GlowBackground', async ({ page }) => {
  await page.goto(`${BASE_URL}/ask`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(300)

  const canvasInfo = await page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="background-canvas"]')
    if (!canvas) return { found: false }
    const cs = getComputedStyle(canvas)
    const bg = cs.getPropertyValue('background')
    return {
      found: true,
      background: bg.substring(0, 200), // truncate for logging
      overflowHidden: cs.getPropertyValue('overflow') === 'hidden',
      tagName: canvas.tagName,
    }
  })
  console.log('=== CONCERN 3: BackgroundCanvas on /ask ===')
  console.log(JSON.stringify(canvasInfo, null, 2))

  const glowBackgroundPresent = await page.evaluate(() =>
    !!document.querySelector('[class*="glow-background"], [data-glow-background]'),
  )
  console.log('GlowBackground present on /ask:', glowBackgroundPresent)

  // Compare with /bible (BibleLanding also uses BackgroundCanvas)
  await page.goto(`${BASE_URL}/bible`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(300)

  const bibleCanvasInfo = await page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="background-canvas"]')
    if (!canvas) return { found: false }
    const cs = getComputedStyle(canvas)
    return {
      found: true,
      background: cs.getPropertyValue('background').substring(0, 200),
    }
  })
  console.log('=== CONCERN 3: BackgroundCanvas on /bible ===')
  console.log(JSON.stringify(bibleCanvasInfo, null, 2))

  expect(canvasInfo.found).toBe(true)
  expect(glowBackgroundPresent).toBe(false)
})

// ---------------------------------------------------------------------------
// CONCERN 4 — Screenshots A through G
// ---------------------------------------------------------------------------

test('Screenshot A — /ask response with 4-action verse card row', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await interceptAsk(page)
  await page.goto(`${BASE_URL}/ask`)
  await page.waitForSelector('textarea#ask-input', { state: 'visible', timeout: 10000 })
  await page.locator('textarea#ask-input').fill('Why does God allow suffering?')
  await page.locator('button[aria-label="Find Answers"]').click()
  await page.waitForSelector('#latest-response-heading', { state: 'visible', timeout: 15000 })
  await page.waitForTimeout(600)
  await page.screenshot({ path: `${DIR}/A-response-verse-card-4actions-desktop.png`, fullPage: false })
  // Also scroll down to show verse card fully
  await page.locator('#latest-response-heading').scrollIntoViewIfNeeded()
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${DIR}/A-response-verse-card-fullpage.png`, fullPage: true })
})

test('Screenshot B — Memorize toggle state (Memorize / Memorized)', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await interceptAsk(page)
  await page.goto(`${BASE_URL}/ask`)
  await page.waitForSelector('textarea#ask-input', { state: 'visible', timeout: 10000 })
  await page.locator('textarea#ask-input').fill('What is faith?')
  await page.locator('button[aria-label="Find Answers"]').click()
  await page.waitForSelector('#latest-response-heading', { state: 'visible', timeout: 15000 })
  await page.waitForTimeout(600)

  // Capture default (Memorize) state
  await page.screenshot({ path: `${DIR}/B-memorize-default-state.png`, fullPage: true })

  // Click Memorize on first verse card → Memorized
  const memorizeBtn = page.locator('button[aria-label="Memorize this verse"]').first()
  const memorizeBtnVisible = await memorizeBtn.isVisible().catch(() => false)
  if (memorizeBtnVisible) {
    await memorizeBtn.click()
    await page.waitForTimeout(300)
    await page.screenshot({ path: `${DIR}/B-memorized-active-state.png`, fullPage: true })
    console.log('Memorize toggle: clicked — Memorized state captured')
  } else {
    console.log('Memorize button not visible for B screenshot')
  }
})

test('Screenshot C — /ask response mobile (375px) 4-action row wrap', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await interceptAsk(page)
  await page.goto(`${BASE_URL}/ask`)
  await page.waitForSelector('textarea#ask-input', { state: 'visible', timeout: 10000 })
  await page.locator('textarea#ask-input').fill('How do I forgive someone?')
  await page.locator('button[aria-label="Find Answers"]').click()
  await page.waitForSelector('#latest-response-heading', { state: 'visible', timeout: 15000 })
  await page.waitForTimeout(600)
  await page.screenshot({ path: `${DIR}/C-response-mobile-375-action-row.png`, fullPage: true })
})

test('Screenshot D — /bible/john/3 VerseActionSheet open with Ask action', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${BASE_URL}/bible/john/3`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1000)

  // Screenshot of BibleReader before opening sheet
  await page.screenshot({ path: `${DIR}/D-bible-reader-before-sheet.png`, fullPage: false })

  // Try to open VerseActionSheet by tapping verse 16
  const verseSpan = page.locator('span[data-verse="16"]').first()
  const verseVisible = await verseSpan.isVisible().catch(() => false)
  if (verseVisible) {
    await verseSpan.dispatchEvent('pointerdown')
    await page.waitForTimeout(100)
    await verseSpan.dispatchEvent('pointerup')
    await page.waitForTimeout(800)

    const sheet = page.locator('[role="dialog"]').first()
    const sheetOpen = await sheet.isVisible().catch(() => false)
    if (sheetOpen) {
      await page.screenshot({ path: `${DIR}/D-verse-action-sheet-open.png`, fullPage: false })
      console.log('Screenshot D: VerseActionSheet captured')

      // Find and log the Ask action
      const askAction = sheet.locator('text=Ask about this').first()
      const askVisible = await askAction.isVisible().catch(() => false)
      console.log('Ask about this action visible in sheet:', askVisible)
    } else {
      console.log('Screenshot D: Sheet did not open — capturing page state')
      await page.screenshot({ path: `${DIR}/D-sheet-not-opened.png`, fullPage: false })
    }
  } else {
    console.log('Screenshot D: verse span not visible')
    await page.screenshot({ path: `${DIR}/D-verse-not-visible.png`, fullPage: false })
  }
})

test('Screenshot E — /daily?tab=devotional Ask CTA inline placement', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${BASE_URL}/daily?tab=devotional`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(600)

  // Scroll to find the "Ask about this" CTA
  const askCta = page.locator('a[href*="/ask?q="]').first()
  const ctaVisible = await askCta.isVisible().catch(() => false)
  if (ctaVisible) {
    await askCta.scrollIntoViewIfNeeded()
    await page.waitForTimeout(300)
  }
  await page.screenshot({ path: `${DIR}/E-devotional-ask-cta-inline.png`, fullPage: false })

  // Also capture at mobile
  await page.setViewportSize({ width: 375, height: 812 })
  await page.waitForTimeout(300)
  if (ctaVisible) {
    await askCta.scrollIntoViewIfNeeded()
    await page.waitForTimeout(300)
  }
  await page.screenshot({ path: `${DIR}/E-devotional-ask-cta-mobile-375.png`, fullPage: false })
})

test('Screenshot F — /ask after bridge arrival from BibleReader prefilled question', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await interceptAsk(page)

  // Simulate navigation from BibleReader with prefilled ?q= param
  const prefilled = encodeURIComponent('Help me understand John 3:16: For God so loved the world, that he gave his one and only Son...')
  await page.goto(`${BASE_URL}/ask?q=${prefilled}`)
  await page.waitForLoadState('domcontentloaded')

  // Either textarea pre-filled or response already arrived
  await Promise.race([
    page.waitForSelector('textarea#ask-input', { state: 'visible', timeout: 8000 }).catch(() => null),
    page.waitForSelector('#latest-response-heading', { state: 'visible', timeout: 8000 }).catch(() => null),
  ])
  await page.waitForTimeout(600)
  await page.screenshot({ path: `${DIR}/F-ask-bridge-from-bible-reader.png`, fullPage: false })
  await page.screenshot({ path: `${DIR}/F-ask-bridge-from-bible-reader-full.png`, fullPage: true })
})

test('Screenshot G — /ask after bridge arrival from Daily Hub devotional', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await interceptAsk(page)

  // Navigate to devotional first to capture the actual ?q= URL that gets generated
  await page.goto(`${BASE_URL}/daily?tab=devotional`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(600)

  const askCta = page.locator('a[href*="/ask?q="]').first()
  const ctaVisible = await askCta.isVisible().catch(() => false)
  let askHref: string | null = null

  if (ctaVisible) {
    await askCta.scrollIntoViewIfNeeded()
    await page.waitForTimeout(200)
    askHref = await askCta.getAttribute('href')
    console.log('Ask about this href:', askHref)
  }

  // Navigate to the actual /ask?q= URL (simulates clicking the CTA)
  const target = askHref ? `${BASE_URL}${askHref}` : `${BASE_URL}/ask?q=What+does+this+passage+mean`
  await page.goto(target)
  await page.waitForLoadState('domcontentloaded')

  await Promise.race([
    page.waitForSelector('textarea#ask-input', { state: 'visible', timeout: 8000 }).catch(() => null),
    page.waitForSelector('#latest-response-heading', { state: 'visible', timeout: 8000 }).catch(() => null),
  ])
  await page.waitForTimeout(600)
  await page.screenshot({ path: `${DIR}/G-ask-bridge-from-daily-hub-devotional.png`, fullPage: false })
  await page.screenshot({ path: `${DIR}/G-ask-bridge-from-daily-hub-devotional-full.png`, fullPage: true })
})

// ---------------------------------------------------------------------------
// Textarea focused screenshot for CONCERN 2 visual confirmation
// ---------------------------------------------------------------------------
test('CONCERN 2 screenshot — textarea focused glow at 1440px', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${BASE_URL}/ask`)
  await page.waitForSelector('textarea#ask-input', { state: 'visible', timeout: 10000 })
  await page.waitForTimeout(300)

  // Unfocused state
  await page.screenshot({ path: `${DIR}/C2-textarea-unfocused.png`, fullPage: false })

  // Focus
  await page.focus('textarea#ask-input')
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${DIR}/C2-textarea-focused.png`, fullPage: false })

  // Daily Hub pray textarea for comparison
  await page.goto(`${BASE_URL}/daily?tab=pray`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)
  const prayTextarea = page.locator('textarea').first()
  await prayTextarea.focus().catch(() => {})
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${DIR}/C2-daily-hub-pray-textarea-focused.png`, fullPage: false })
})
