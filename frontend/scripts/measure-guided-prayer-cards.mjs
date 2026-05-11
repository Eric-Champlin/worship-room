import { chromium } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173'
const browser = await chromium.launch({ headless: true })

const viewports = [
  { name: 'desktop-1440x900', width: 1440, height: 900 },
  { name: 'tablet-768x1024', width: 768, height: 1024 },
]

for (const vp of viewports) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 2,
  })
  const page = await ctx.newPage()
  await page.goto(`${BASE_URL}/daily?tab=pray`, { waitUntil: 'networkidle' })
  await page.waitForSelector('#guided-prayer-heading', { timeout: 10_000 })
  await page.locator('#guided-prayer-section').scrollIntoViewIfNeeded()
  await page.waitForTimeout(500)

  const cards = page.locator('#guided-prayer-section button')
  const count = await cards.count()
  const measurements = []
  for (let i = 0; i < count; i += 1) {
    const card = cards.nth(i)
    const title = await card.locator('h3').textContent()
    const box = await card.boundingBox()
    measurements.push({ idx: i, title, height: box?.height, width: box?.width })
  }
  console.log(`\n=== ${vp.name} (no min-h floor) ===`)
  for (const m of measurements) {
    console.log(`  [${m.idx}] "${m.title}" — ${m.height?.toFixed(1)}px × ${m.width?.toFixed(1)}px`)
  }
  const max = Math.max(...measurements.map((m) => m.height ?? 0))
  console.log(`  Tallest: ${max.toFixed(2)}px (rounded up to 4px: ${Math.ceil(max / 4) * 4}px)`)

  await ctx.close()
}

await browser.close()
