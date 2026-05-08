// Spec 14 Step 1 — verify /bible cinematic mount
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
      // Ignore unrelated backend connection errors (no backend running locally)
      if (t.includes('ERR_CONNECTION_REFUSED') || t.includes('Failed to load resource')) return
      results.errors.push(`CONSOLE@${suffix}: ${t}`)
    }
  })

  await page.goto(`${baseURL}/bible`, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForSelector('[aria-labelledby="bible-hero-heading"]', { timeout: 10000 })

  const hero = await page.$('[aria-labelledby="bible-hero-heading"]')
  results.assertions.push({ name: `[${suffix}] hero exists`, pass: !!hero })

  if (hero) {
    const className = await hero.getAttribute('class')
    results.assertions.push({
      name: `[${suffix}] hero className contains pt-[145px]`,
      pass: className.includes('pt-[145px]'),
      actual: className,
    })
    results.assertions.push({
      name: `[${suffix}] hero className contains pb-12`,
      pass: className.includes('pb-12'),
    })
    results.assertions.push({
      name: `[${suffix}] hero className contains relative`,
      pass: className.includes('relative'),
    })
    results.assertions.push({
      name: `[${suffix}] hero className does NOT contain sm:pt-32 (responsive padding removed)`,
      pass: !className.includes('sm:pt-32'),
    })

    // Verify cinematic is FIRST child of hero
    const firstChild = await hero.evaluate((el) => {
      const fc = el.firstElementChild
      return {
        tag: fc?.tagName,
        testid: fc?.getAttribute('data-testid'),
      }
    })
    results.assertions.push({
      name: `[${suffix}] cinematic is first child (data-testid="cinematic-hero-background")`,
      pass: firstChild.testid === 'cinematic-hero-background',
      actual: firstChild,
    })

    const cinematic = await page.$('[aria-labelledby="bible-hero-heading"] > [data-testid="cinematic-hero-background"]')
    results.assertions.push({ name: `[${suffix}] cinematic via descendant selector`, pass: !!cinematic })

    if (cinematic) {
      const heightStyle = await cinematic.evaluate((el) => el.style.height)
      results.assertions.push({
        name: `[${suffix}] cinematic style.height = calc(100% + 200px)`,
        pass: heightStyle === 'calc(100% + 200px)',
        actual: heightStyle,
      })
    }

    // Verify h1 carries relative z-10
    const h1Class = await hero.$eval('h1', (el) => el.className)
    results.assertions.push({
      name: `[${suffix}] h1 carries relative z-10`,
      pass: h1Class.includes('relative') && h1Class.includes('z-10'),
      actual: h1Class,
    })
  }

  // Horizontal scroll check
  const hasHScroll = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  results.assertions.push({
    name: `[${suffix}] no horizontal scroll`,
    pass: !hasHScroll,
  })

  await page.screenshot({
    path: `playwright-screenshots/spec14-step1-bible-${suffix}.png`,
    fullPage: false,
  })

  await ctx.close()
}

await probe(1280, 900, '1280')
await probe(375, 812, '375')
await browser.close()

console.log('\n=== Spec 14 Step 1 probe results ===\n')
for (const a of results.assertions) {
  const verdict = a.pass ? 'PASS' : 'FAIL'
  console.log(`  [${verdict}] ${a.name}${!a.pass && a.actual !== undefined ? ` — actual: ${JSON.stringify(a.actual)}` : ''}`)
}
console.log(`\nNon-ignored errors: ${results.errors.length}`)
for (const e of results.errors) console.log(`  - ${e}`)

const failed = results.assertions.filter((a) => !a.pass)
process.exit(failed.length > 0 || results.errors.length > 0 ? 1 : 0)
