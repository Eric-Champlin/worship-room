import { chromium } from '@playwright/test'

const URL = 'http://localhost:5175/daily'
const OUT = 'playwright-screenshots'

const browser = await chromium.launch({ headless: true })

const viewports = [
  { name: 'desktop-1440x900', width: 1440, height: 900, deviceScaleFactor: 1 },
  { name: 'mobile-375x812', width: 375, height: 812, deviceScaleFactor: 2 },
]

for (const vp of viewports) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.deviceScaleFactor,
  })
  const page = await context.newPage()
  await page.goto(URL, { waitUntil: 'networkidle' })

  // Scroll to the Follow Our Playlist button
  const link = page.getByRole('link', { name: /follow our playlist/i })
  await link.waitFor({ state: 'visible', timeout: 8000 })
  await link.scrollIntoViewIfNeeded()
  await page.waitForTimeout(400)

  // Measure
  const box = await link.boundingBox()
  console.log(`[${vp.name}] button bounds: x=${box?.x.toFixed(1)} y=${box?.y.toFixed(1)} w=${box?.width.toFixed(1)} h=${box?.height.toFixed(1)}`)

  // Tight-crop screenshot of the song-pick section (find heading and frame)
  const heading = page.getByRole('heading', { level: 2 })
  const headingBox = await heading.boundingBox()
  const sectionBox = box && headingBox ? {
    x: 0,
    y: Math.max(0, headingBox.y - 20),
    width: vp.width,
    height: Math.min(vp.height, (box.y + box.height + 80) - Math.max(0, headingBox.y - 20)),
  } : null

  const full = `${OUT}/follow-playlist-${vp.name}.png`
  await page.screenshot({ path: full, fullPage: false, clip: sectionBox ?? undefined })
  console.log(`Wrote ${full}`)

  // Hover state screenshot
  await link.hover()
  await page.waitForTimeout(250)
  const hover = `${OUT}/follow-playlist-${vp.name}-hover.png`
  await page.screenshot({ path: hover, fullPage: false, clip: sectionBox ?? undefined })
  console.log(`Wrote ${hover}`)

  await context.close()
}

await browser.close()
