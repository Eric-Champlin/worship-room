// Spec 14 Step 7 — verify /prayer-wall hero cleanup (no cinematic yet — Step 8)
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

  // No font-script
  const fontScript = await page.$('[aria-labelledby="prayer-wall-heading"] .font-script')
  results.assertions.push({
    name: `[${suffix}] font-script removed (Step 7 cleanup)`,
    pass: fontScript === null,
  })

  // No font-serif italic
  const fontSerifItalic = await page.$('[aria-labelledby="prayer-wall-heading"] .font-serif.italic')
  results.assertions.push({
    name: `[${suffix}] font-serif italic removed (Step 7 cleanup)`,
    pass: fontSerifItalic === null,
  })

  const hero = await page.$('[aria-labelledby="prayer-wall-heading"]')
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
      name: `[${suffix}] hero className does NOT contain 'sm:pt-36'`,
      pass: !className.includes('sm:pt-36'),
    })

    // Inline style for ATMOSPHERIC_HERO_BG removed
    const inlineStyle = await hero.evaluate((el) => el.getAttribute('style') ?? '')
    results.assertions.push({
      name: `[${suffix}] hero inline style does NOT include 'background' (no ATMOSPHERIC_HERO_BG)`,
      pass: !inlineStyle.includes('background'),
      actual: inlineStyle,
    })

    // h1 text is exactly 'Prayer Wall' (no <span> child)
    const h1Info = await hero.$eval('h1', (el) => ({
      text: el.textContent.trim(),
      childElementCount: el.childElementCount,
    }))
    results.assertions.push({
      name: `[${suffix}] h1 text is 'Prayer Wall' (no <span>)`,
      pass: h1Info.text === 'Prayer Wall' && h1Info.childElementCount === 0,
      actual: h1Info,
    })

    // Subtitle <p>: text-white, no font-serif, no italic
    const pClass = await hero.$eval('p', (el) => el.className)
    results.assertions.push({
      name: `[${suffix}] subtitle <p> contains 'text-white'`,
      pass: /\btext-white\b/.test(pClass) && !pClass.includes('text-white/60'),
      actual: pClass,
    })
    results.assertions.push({
      name: `[${suffix}] subtitle <p> does NOT contain 'font-serif'`,
      pass: !pClass.includes('font-serif'),
    })
    results.assertions.push({
      name: `[${suffix}] subtitle <p> does NOT contain 'italic'`,
      pass: !pClass.includes('italic'),
    })

    // No cinematic yet (Step 8 adds it)
    const cinematic = await hero.$('[data-testid="cinematic-hero-background"]')
    results.assertions.push({
      name: `[${suffix}] hero has NO cinematic yet (Step 7 — Step 8 adds)`,
      pass: cinematic === null,
    })
  }

  // Action wrapper still renders (logged-out → Share button only)
  const actionWrapper = await page.$('[aria-labelledby="prayer-wall-heading"] .mt-6')
  results.assertions.push({ name: `[${suffix}] action wrapper still renders`, pass: !!actionWrapper })

  // Sticky CategoryFilterBar still pins
  const stickyBar = await page.$('.sticky.top-0.z-30')
  results.assertions.push({ name: `[${suffix}] sticky CategoryFilterBar still pins`, pass: !!stickyBar })

  await page.screenshot({
    path: `playwright-screenshots/spec14-step7-prayer-wall-${suffix}.png`,
    fullPage: false,
  })

  await ctx.close()
}

await probe(1280, 900, '1280')
await probe(375, 812, '375')
await browser.close()

console.log('\n=== Spec 14 Step 7 probe results ===\n')
for (const a of results.assertions) {
  const verdict = a.pass ? 'PASS' : 'FAIL'
  console.log(`  [${verdict}] ${a.name}${!a.pass && a.actual !== undefined ? ` — actual: ${JSON.stringify(a.actual)}` : ''}`)
}
console.log(`\nNon-ignored errors: ${results.errors.length}`)
for (const e of results.errors) console.log(`  - ${e}`)

const failed = results.assertions.filter((a) => !a.pass)
process.exit(failed.length > 0 || results.errors.length > 0 ? 1 : 0)
