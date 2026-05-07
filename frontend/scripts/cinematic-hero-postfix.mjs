import { chromium } from '@playwright/test'

const URL = 'http://localhost:5173/daily'
const OUT_DIR = '/Users/Eric/worship-room/frontend/playwright-screenshots'

async function main() {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()

  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(1200)

  // Full-viewport screenshot at top
  await page.screenshot({
    path: `${OUT_DIR}/cinematic-postfix-top.png`,
    fullPage: false,
  })

  // Measure where the seam used to be — capture full page
  await page.screenshot({
    path: `${OUT_DIR}/cinematic-postfix-fullpage.png`,
    fullPage: true,
  })

  // Inspect h1 vertical centering
  const center = await page.evaluate(() => {
    const section = document.querySelector('section[aria-labelledby="daily-hub-heading"]')
    const h1 = document.getElementById('daily-hub-heading')
    if (!section || !h1) return { error: 'missing element' }
    const sr = section.getBoundingClientRect()
    const hr = h1.getBoundingClientRect()
    return {
      sectionTop: sr.top,
      sectionBottom: sr.bottom,
      sectionHeight: sr.height,
      h1Top: hr.top,
      h1Bottom: hr.bottom,
      h1Height: hr.height,
      spaceAbove: hr.top - sr.top,
      spaceBelow: sr.bottom - hr.bottom,
    }
  })
  console.log('Centering measurements:', JSON.stringify(center, null, 2))

  // Inspect the cinematic outer wrapper computed style
  const cinematicWrapper = await page.evaluate(() => {
    // The aria-hidden sibling of the h1 inside the hero section
    const all = document.querySelectorAll('section[aria-labelledby="daily-hub-heading"] [aria-hidden="true"]')
    const wrapper = all[0]
    if (!wrapper) return { error: 'cinematic wrapper not found' }
    const cs = getComputedStyle(wrapper)
    return {
      maskImage: cs.maskImage,
      webkitMaskImage: cs.webkitMaskImage,
      childCount: wrapper.children.length,
    }
  })
  console.log('Cinematic wrapper:', JSON.stringify(cinematicWrapper, null, 2))

  // Sample pixel colors at hero/body boundary to detect seam
  const seamColors = await page.evaluate(() => {
    const section = document.querySelector('section[aria-labelledby="daily-hub-heading"]')
    if (!section) return null
    const sr = section.getBoundingClientRect()
    return {
      heroBottomY: sr.bottom,
    }
  })
  console.log('Hero bottom Y:', JSON.stringify(seamColors))

  await browser.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
