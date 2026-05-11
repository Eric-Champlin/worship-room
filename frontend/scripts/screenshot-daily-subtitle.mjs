import { chromium } from '@playwright/test'

const URL = 'http://localhost:5173/daily'
const OUT = 'playwright-screenshots'

const browser = await chromium.launch({ headless: true })

const viewports = [
  { name: 'desktop-1280x900', width: 1280, height: 900, deviceScaleFactor: 1 },
  { name: 'mobile-375x812', width: 375, height: 812, deviceScaleFactor: 2 },
]

for (const vp of viewports) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.deviceScaleFactor,
  })
  const page = await context.newPage()
  await page.goto(URL, { waitUntil: 'networkidle' })
  // Wait for the subtitle to render
  await page.waitForSelector('text=What\'s on your mind today?', { timeout: 5000 })
  // Brief pause so cinematic stars settle
  await page.waitForTimeout(500)
  const file = `${OUT}/daily-subtitle-${vp.name}.png`
  await page.screenshot({ path: file, fullPage: false })
  console.log(`Wrote ${file}`)

  // Bounding-box position dump
  const subtitleBox = await page.locator('text=What\'s on your mind today?').boundingBox()
  const greetingBox = await page.locator('h1#daily-hub-heading').boundingBox()
  console.log(`  greeting y=${greetingBox?.y.toFixed(1)} h=${greetingBox?.height.toFixed(1)}`)
  console.log(`  subtitle y=${subtitleBox?.y.toFixed(1)} h=${subtitleBox?.height.toFixed(1)}`)
  console.log(`  gap=${(subtitleBox.y - (greetingBox.y + greetingBox.height)).toFixed(1)}px`)
  await context.close()
}

await browser.close()
