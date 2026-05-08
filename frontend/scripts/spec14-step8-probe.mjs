// Spec 14 Step 8 — verify /prayer-wall cinematic mount + reduced-motion
import { chromium } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173'
const results = { errors: [], assertions: [] }

const browser = await chromium.launch({ headless: true })

async function probe(width, height, suffix, opts = {}) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    reducedMotion: opts.reducedMotion ?? 'no-preference',
  })
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

  const cinematic = await page.$('[aria-labelledby="prayer-wall-heading"] > [data-testid="cinematic-hero-background"]')
  results.assertions.push({ name: `[${suffix}] cinematic is direct child of hero`, pass: !!cinematic })

  const hero = await page.$('[aria-labelledby="prayer-wall-heading"]')
  if (hero) {
    const h1Class = await hero.$eval('h1', (el) => el.className)
    results.assertions.push({
      name: `[${suffix}] h1 has 'relative' and 'z-10'`,
      pass: h1Class.includes('relative') && h1Class.includes('z-10'),
    })
    const pClass = await hero.$eval('p', (el) => el.className)
    results.assertions.push({
      name: `[${suffix}] subtitle <p> has 'relative' and 'z-10'`,
      pass: pClass.includes('relative') && pClass.includes('z-10'),
    })

    // action wrapper has relative z-10
    const actionDiv = await hero.$('div.mt-6')
    if (actionDiv) {
      const actionClass = await actionDiv.getAttribute('class')
      results.assertions.push({
        name: `[${suffix}] action wrapper has 'relative' and 'z-10'`,
        pass: actionClass.includes('relative') && actionClass.includes('z-10'),
        actual: actionClass,
      })
    }
  }

  // Sticky CategoryFilterBar still pins
  const stickyBar = await page.$('.sticky.top-0.z-30')
  results.assertions.push({ name: `[${suffix}] sticky CategoryFilterBar (z-30) still pins`, pass: !!stickyBar })

  const hasHScroll = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  results.assertions.push({ name: `[${suffix}] no horizontal scroll`, pass: !hasHScroll })

  await page.screenshot({
    path: `playwright-screenshots/spec14-step8-prayer-wall-${suffix}.png`,
    fullPage: false,
  })

  await ctx.close()
}

await probe(1280, 900, '1280')
await probe(375, 812, '375')
await probe(1280, 900, 'reduced-motion-1280', { reducedMotion: 'reduce' })
await browser.close()

console.log('\n=== Spec 14 Step 8 probe results ===\n')
for (const a of results.assertions) {
  const verdict = a.pass ? 'PASS' : 'FAIL'
  console.log(`  [${verdict}] ${a.name}${!a.pass && a.actual !== undefined ? ` — actual: ${JSON.stringify(a.actual)}` : ''}`)
}
console.log(`\nNon-ignored errors: ${results.errors.length}`)
for (const e of results.errors) console.log(`  - ${e}`)

const failed = results.assertions.filter((a) => !a.pass)
process.exit(failed.length > 0 || results.errors.length > 0 ? 1 : 0)
