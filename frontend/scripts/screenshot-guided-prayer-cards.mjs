import { chromium } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.resolve(__dirname, '..', 'playwright-screenshots')
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173'

const VIEWPORTS = [
  { name: 'mobile-375x812', width: 375, height: 812 },
  { name: 'tablet-768x1024', width: 768, height: 1024 },
  { name: 'desktop-1440x900', width: 1440, height: 900 },
]

const browser = await chromium.launch({ headless: true })

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 2,
  })
  const page = await ctx.newPage()
  await page.goto(`${BASE_URL}/daily?tab=pray`, { waitUntil: 'networkidle' })

  // Wait for section heading to be present
  await page.waitForSelector('#guided-prayer-heading', { timeout: 10_000 })

  // Scroll the section into view
  await page.locator('#guided-prayer-section').scrollIntoViewIfNeeded()
  // brief pause for any post-scroll layout settling
  await page.waitForTimeout(400)

  // Full-section screenshot
  const section = page.locator('#guided-prayer-section')
  const sectionPath = path.join(OUT_DIR, `guided-prayer-section-${vp.name}.png`)
  await section.screenshot({ path: sectionPath })
  console.log(`Wrote ${sectionPath}`)

  // On mobile, also capture the longest-title card ("Forgiveness Release", 6th session)
  // The mobile layout is a horizontal carousel — scroll the carousel to expose it.
  if (vp.name.startsWith('mobile')) {
    const longestCard = page.getByRole('button', { name: /Forgiveness Release/i })
    await longestCard.scrollIntoViewIfNeeded()
    await page.waitForTimeout(300)
    const cardPath = path.join(OUT_DIR, `guided-prayer-longest-card-${vp.name}.png`)
    await longestCard.screenshot({ path: cardPath })
    console.log(`Wrote ${cardPath}`)
  }

  await ctx.close()
}

await browser.close()
console.log('Done.')
