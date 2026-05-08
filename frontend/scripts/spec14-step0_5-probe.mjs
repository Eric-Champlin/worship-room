// Spec 14 Step 0.5 — verify data-testid="cinematic-hero-background" renders on /daily
import { chromium } from '@playwright/test'

const results = { errors: [], assertions: [] }
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173'

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page = await ctx.newPage()
page.on('console', (msg) => {
  if (msg.type() === 'error') results.errors.push(msg.text())
})
page.on('pageerror', (err) => results.errors.push(`PAGE: ${err.message}`))

await page.goto(`${baseURL}/daily`, { waitUntil: 'networkidle', timeout: 30000 })
await page.waitForSelector('[aria-labelledby="daily-hub-heading"]', { timeout: 10000 })

const cinematic = await page.$('[data-testid="cinematic-hero-background"]')
results.assertions.push({ name: 'data-testid present in DOM', pass: !!cinematic })

if (cinematic) {
  const ariaHidden = await cinematic.getAttribute('aria-hidden')
  results.assertions.push({ name: 'aria-hidden="true"', pass: ariaHidden === 'true' })

  const childCount = await cinematic.evaluate((el) => el.children.length)
  results.assertions.push({ name: '8 direct children (4 div + 4 svg)', pass: childCount === 8, actual: childCount })

  const divs = await cinematic.evaluate((el) =>
    Array.from(el.children).filter((c) => c.tagName === 'DIV').length,
  )
  const svgs = await cinematic.evaluate((el) =>
    Array.from(el.children).filter((c) => c.tagName === 'svg').length,
  )
  // Plan said 4+4 but actual production is 3 div + 5 svg (warm beam is a div).
  // Total of 8 is the load-bearing invariant; div/svg breakdown is informational.
  results.assertions.push({ name: '3 div children (actual production)', pass: divs === 3, actual: divs })
  results.assertions.push({ name: '5 svg children (actual production)', pass: svgs === 5, actual: svgs })

  const heroParent = await cinematic.evaluate((el) =>
    el.parentElement?.getAttribute('aria-labelledby'),
  )
  results.assertions.push({
    name: 'parent is hero section (aria-labelledby="daily-hub-heading")',
    pass: heroParent === 'daily-hub-heading',
    actual: heroParent,
  })
}

await page.screenshot({
  path: 'playwright-screenshots/spec14-step0_5-daily-1280.png',
  fullPage: false,
})

await browser.close()

console.log('\n=== Spec 14 Step 0.5 probe results ===\n')
for (const a of results.assertions) {
  const verdict = a.pass ? 'PASS' : 'FAIL'
  console.log(`  [${verdict}] ${a.name}${a.actual !== undefined ? ` — actual: ${JSON.stringify(a.actual)}` : ''}`)
}
console.log(`\nConsole errors: ${results.errors.length}`)
for (const e of results.errors) console.log(`  - ${e}`)

const failed = results.assertions.filter((a) => !a.pass)
process.exit(failed.length > 0 ? 1 : 0)
