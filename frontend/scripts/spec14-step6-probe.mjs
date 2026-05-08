// Spec 14 Step 6 — verify /prayer-wall BackgroundCanvas promotion (no cinematic, no PrayerWallHero changes)
import { chromium } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173'
const results = { errors: [], assertions: [] }

const browser = await chromium.launch({ headless: true })

async function probe(width, height, suffix) {
  const ctx = await browser.newContext({ viewport: { width, height } })
  const page = await ctx.newPage()
  page.on('pageerror', (err) => results.errors.push(`PAGE@${suffix}: ${err.message}`))
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const t = msg.text()
      if (t.includes('ERR_CONNECTION_REFUSED') || t.includes('Failed to load resource')) return
      results.errors.push(`CONSOLE@${suffix}: ${t}`)
    }
  })

  await page.goto(`${baseURL}/prayer-wall`, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForSelector('[aria-labelledby="prayer-wall-heading"]', { timeout: 10000 })

  // BackgroundCanvas at root
  const canvas = await page.$('[data-testid="background-canvas"]')
  results.assertions.push({ name: `[${suffix}] [data-testid="background-canvas"] exists`, pass: !!canvas })

  if (canvas) {
    const cls = await canvas.getAttribute('class')
    results.assertions.push({
      name: `[${suffix}] BackgroundCanvas className contains 'overflow-x-hidden'`,
      pass: cls.includes('overflow-x-hidden'),
      actual: cls,
    })
    results.assertions.push({
      name: `[${suffix}] BackgroundCanvas className does NOT contain 'bg-dashboard-dark'`,
      pass: !cls.includes('bg-dashboard-dark'),
    })
  }

  // PrayerWallHero unchanged in Step 6 (font-script "Wall" should still be present — Step 7 removes it)
  const heroFontScript = await page.$('[aria-labelledby="prayer-wall-heading"] .font-script')
  results.assertions.push({
    name: `[${suffix}] font-script "Wall" still present (Step 6 — Step 7 removes)`,
    pass: !!heroFontScript,
  })

  // Sticky CategoryFilterBar (z-30)
  const stickyBar = await page.$('.sticky.top-0.z-30')
  results.assertions.push({ name: `[${suffix}] sticky CategoryFilterBar (z-30) exists`, pass: !!stickyBar })

  const hasHScroll = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  results.assertions.push({ name: `[${suffix}] no horizontal scroll`, pass: !hasHScroll })

  await page.screenshot({
    path: `playwright-screenshots/spec14-step6-prayer-wall-${suffix}.png`,
    fullPage: false,
  })

  await ctx.close()
}

await probe(1280, 900, '1280')
await probe(375, 812, '375')
await browser.close()

console.log('\n=== Spec 14 Step 6 probe results ===\n')
for (const a of results.assertions) {
  const verdict = a.pass ? 'PASS' : 'FAIL'
  console.log(`  [${verdict}] ${a.name}${!a.pass && a.actual !== undefined ? ` — actual: ${JSON.stringify(a.actual)}` : ''}`)
}
console.log(`\nNon-ignored errors: ${results.errors.length}`)
for (const e of results.errors) console.log(`  - ${e}`)

const failed = results.assertions.filter((a) => !a.pass)
process.exit(failed.length > 0 || results.errors.length > 0 ? 1 : 0)
