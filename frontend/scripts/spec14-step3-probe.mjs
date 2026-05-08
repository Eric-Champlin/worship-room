// Spec 14 Step 3 — verify /ask cinematic mount + structural fixes
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

  await page.goto(`${baseURL}/ask`, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForSelector('[aria-labelledby="ask-hero-heading"]', { timeout: 10000 })

  const hero = await page.$('[aria-labelledby="ask-hero-heading"]')
  results.assertions.push({ name: `[${suffix}] hero exists`, pass: !!hero })

  if (hero) {
    const className = await hero.getAttribute('class')
    results.assertions.push({
      name: `[${suffix}] hero className contains 'relative'`,
      pass: className.includes('relative'),
      actual: className,
    })
    results.assertions.push({
      name: `[${suffix}] hero className contains 'pt-[145px]'`,
      pass: className.includes('pt-[145px]'),
    })
    results.assertions.push({
      name: `[${suffix}] hero className contains 'pb-12'`,
      pass: className.includes('pb-12'),
    })
    results.assertions.push({
      name: `[${suffix}] hero className does NOT contain 'sm:pt-40'`,
      pass: !className.includes('sm:pt-40'),
    })
    results.assertions.push({
      name: `[${suffix}] hero className does NOT contain 'sm:px-6' (canonical px-4 only)`,
      pass: !className.includes('sm:px-6'),
    })

    const cinematic = await page.$('[aria-labelledby="ask-hero-heading"] > [data-testid="cinematic-hero-background"]')
    results.assertions.push({ name: `[${suffix}] cinematic is direct child of hero`, pass: !!cinematic })

    // h1: relative z-10 AND animate-gradient-shift preserved
    const h1Class = await hero.$eval('h1', (el) => el.className)
    results.assertions.push({
      name: `[${suffix}] h1 has 'relative' and 'z-10'`,
      pass: h1Class.includes('relative') && h1Class.includes('z-10'),
      actual: h1Class,
    })
    results.assertions.push({
      name: `[${suffix}] h1 preserves 'animate-gradient-shift'`,
      pass: h1Class.includes('animate-gradient-shift'),
    })

    const pClass = await hero.$eval('p', (el) => el.className)
    results.assertions.push({
      name: `[${suffix}] subtitle <p> has 'relative' and 'z-10'`,
      pass: pClass.includes('relative') && pClass.includes('z-10'),
    })
  }

  // Regression check: textarea below hero still renders with violet glow
  const textarea = await page.$('#ask-input')
  results.assertions.push({ name: `[${suffix}] textarea #ask-input still renders`, pass: !!textarea })

  if (textarea) {
    const taClass = await textarea.getAttribute('class')
    // Look for violet box-shadow or violet border (the canonical glow pattern)
    const hasVioletGlow =
      taClass.includes('shadow-[0_0_20px') ||
      taClass.includes('border-violet-400/30') ||
      taClass.includes('rgba(167,139,250')
    results.assertions.push({
      name: `[${suffix}] textarea preserves canonical glow class`,
      pass: hasVioletGlow,
      actual: taClass,
    })
  }

  const hasHScroll = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  results.assertions.push({ name: `[${suffix}] no horizontal scroll`, pass: !hasHScroll })

  await page.screenshot({
    path: `playwright-screenshots/spec14-step3-ask-${suffix}.png`,
    fullPage: false,
  })

  await ctx.close()
}

await probe(1280, 900, '1280')
await probe(375, 812, '375')
await browser.close()

console.log('\n=== Spec 14 Step 3 probe results ===\n')
for (const a of results.assertions) {
  const verdict = a.pass ? 'PASS' : 'FAIL'
  console.log(`  [${verdict}] ${a.name}${!a.pass && a.actual !== undefined ? ` — actual: ${JSON.stringify(a.actual)}` : ''}`)
}
console.log(`\nNon-ignored errors: ${results.errors.length}`)
for (const e of results.errors) console.log(`  - ${e}`)

const failed = results.assertions.filter((a) => !a.pass)
process.exit(failed.length > 0 || results.errors.length > 0 ? 1 : 0)
