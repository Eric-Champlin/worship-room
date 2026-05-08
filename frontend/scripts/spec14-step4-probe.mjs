// Spec 14 Step 4 — verify /grow BackgroundCanvas promotion (no cinematic yet)
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

  await page.goto(`${baseURL}/grow`, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForSelector('[aria-labelledby="grow-heading"]', { timeout: 10000 })

  // BackgroundCanvas at root
  const canvas = await page.$('[data-testid="background-canvas"]')
  results.assertions.push({ name: `[${suffix}] [data-testid="background-canvas"] exists`, pass: !!canvas })

  // Hero
  const hero = await page.$('[aria-labelledby="grow-heading"]')
  if (hero) {
    const className = await hero.getAttribute('class')
    results.assertions.push({
      name: `[${suffix}] hero className contains 'pt-[145px]'`,
      pass: className.includes('pt-[145px]'),
      actual: className,
    })
    results.assertions.push({
      name: `[${suffix}] hero className contains 'pb-12'`,
      pass: className.includes('pb-12'),
    })
    results.assertions.push({
      name: `[${suffix}] hero className does NOT contain 'sm:pt-36' (responsive padding removed)`,
      pass: !className.includes('sm:pt-36'),
    })

    // Inline style for ATMOSPHERIC_HERO_BG removed
    const inlineStyle = await hero.evaluate((el) => el.getAttribute('style') ?? '')
    results.assertions.push({
      name: `[${suffix}] hero inline style does NOT include 'background' (no ATMOSPHERIC_HERO_BG)`,
      pass: !inlineStyle.includes('background'),
      actual: inlineStyle,
    })

    // Cinematic NOT yet mounted (Step 4 only — Step 5 adds it)
    const heroChildren = await hero.evaluate((el) =>
      Array.from(el.children).map((c) => ({
        tag: c.tagName,
        testid: c.getAttribute('data-testid'),
      })),
    )
    const hasCinematic = heroChildren.some((c) => c.testid === 'cinematic-hero-background')
    results.assertions.push({
      name: `[${suffix}] hero has NO cinematic child yet (Step 4 — preceeds Step 5)`,
      pass: !hasCinematic,
      actual: heroChildren,
    })
  }

  // Sticky tab bar
  const stickyBar = await page.$('.sticky.top-0.z-40')
  results.assertions.push({ name: `[${suffix}] sticky tab bar exists`, pass: !!stickyBar })

  // Verify outer wrapper does NOT have bg-dashboard-dark
  const outerClass = await page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="background-canvas"]')
    return canvas?.getAttribute('class') ?? ''
  })
  results.assertions.push({
    name: `[${suffix}] BackgroundCanvas outer wrapper className does NOT contain 'bg-dashboard-dark'`,
    pass: !outerClass.includes('bg-dashboard-dark'),
    actual: outerClass,
  })

  // Tab switch smoke: default plans → challenges
  await page.click('button[role="tab"][id="tab-challenges"]').catch(() => {})
  await page.waitForTimeout(300)
  const challengesUrl = page.url()
  results.assertions.push({
    name: `[${suffix}] tab switch to challenges updates URL`,
    pass: challengesUrl.includes('tab=challenges'),
    actual: challengesUrl,
  })

  const hasHScroll = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  results.assertions.push({ name: `[${suffix}] no horizontal scroll`, pass: !hasHScroll })

  await page.screenshot({
    path: `playwright-screenshots/spec14-step4-grow-${suffix}.png`,
    fullPage: false,
  })

  await ctx.close()
}

await probe(1280, 900, '1280')
await probe(375, 812, '375')
await browser.close()

console.log('\n=== Spec 14 Step 4 probe results ===\n')
for (const a of results.assertions) {
  const verdict = a.pass ? 'PASS' : 'FAIL'
  console.log(`  [${verdict}] ${a.name}${!a.pass && a.actual !== undefined ? ` — actual: ${JSON.stringify(a.actual)}` : ''}`)
}
console.log(`\nNon-ignored errors: ${results.errors.length}`)
for (const e of results.errors) console.log(`  - ${e}`)

const failed = results.assertions.filter((a) => !a.pass)
process.exit(failed.length > 0 || results.errors.length > 0 ? 1 : 0)
