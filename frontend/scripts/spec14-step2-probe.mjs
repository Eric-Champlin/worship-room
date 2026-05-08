// Spec 14 Step 2 — verify /local-support/* cinematic mount across 3 routes
import { chromium } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173'
const results = { errors: [], assertions: [] }

const ROUTES = [
  { path: '/local-support/churches', slug: 'churches' },
  { path: '/local-support/counselors', slug: 'counselors' },
  { path: '/local-support/celebrate-recovery', slug: 'celebrate-recovery' },
]

const browser = await chromium.launch({ headless: true })

async function probe(routeInfo, width, height) {
  const tag = `${routeInfo.slug}@${width}`
  const ctx = await browser.newContext({ viewport: { width, height } })
  const page = await ctx.newPage()
  page.on('pageerror', (err) => results.errors.push(`PAGE@${tag}: ${err.message}`))
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const t = msg.text()
      if (t.includes('ERR_CONNECTION_REFUSED') || t.includes('Failed to load resource')) return
      // Google Maps API errors are pre-existing; ignore
      if (t.includes('Maps') || t.includes('places')) return
      results.errors.push(`CONSOLE@${tag}: ${t}`)
    }
  })

  await page.goto(`${baseURL}${routeInfo.path}`, { waitUntil: 'networkidle', timeout: 30000 })

  // Wait for hero — heading IDs vary by page, so look for cinematic
  await page.waitForSelector('[data-testid="cinematic-hero-background"]', { timeout: 10000 })

  const cinematic = await page.$('[data-testid="cinematic-hero-background"]')
  results.assertions.push({ name: `[${tag}] cinematic exists`, pass: !!cinematic })

  if (cinematic) {
    // Verify cinematic is first child of a hero section
    const parentInfo = await cinematic.evaluate((el) => {
      const parent = el.parentElement
      return {
        tag: parent?.tagName,
        ariaLabelledby: parent?.getAttribute('aria-labelledby'),
        className: parent?.className,
      }
    })
    results.assertions.push({
      name: `[${tag}] cinematic parent is <section> with aria-labelledby`,
      pass: parentInfo.tag === 'SECTION' && !!parentInfo.ariaLabelledby,
      actual: parentInfo,
    })
    results.assertions.push({
      name: `[${tag}] hero className contains pt-[145px]`,
      pass: parentInfo.className?.includes('pt-[145px]') ?? false,
    })
    results.assertions.push({
      name: `[${tag}] hero className contains pb-12`,
      pass: parentInfo.className?.includes('pb-12') ?? false,
    })
    results.assertions.push({
      name: `[${tag}] hero className does NOT contain sm:pt-36`,
      pass: !parentInfo.className?.includes('sm:pt-36'),
    })

    // Verify cinematic is first element child
    const isFirst = await cinematic.evaluate(
      (el) => el.parentElement?.firstElementChild === el,
    )
    results.assertions.push({ name: `[${tag}] cinematic is first child`, pass: isFirst })

    // h1 + p relative z-10
    const h1Info = await cinematic.evaluate((el) => {
      const h1 = el.parentElement?.querySelector('h1')
      return h1 ? { className: h1.className } : null
    })
    if (h1Info) {
      results.assertions.push({
        name: `[${tag}] h1 has relative z-10`,
        pass: h1Info.className.includes('relative') && h1Info.className.includes('z-10'),
        actual: h1Info.className,
      })
    } else {
      results.assertions.push({ name: `[${tag}] h1 found`, pass: false })
    }

    const pInfo = await cinematic.evaluate((el) => {
      const p = el.parentElement?.querySelector('p')
      return p ? { className: p.className } : null
    })
    if (pInfo) {
      results.assertions.push({
        name: `[${tag}] subtitle <p> has relative z-10`,
        pass: pInfo.className.includes('relative') && pInfo.className.includes('z-10'),
      })
    }
  }

  const hasHScroll = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  results.assertions.push({ name: `[${tag}] no horizontal scroll`, pass: !hasHScroll })

  await page.screenshot({
    path: `playwright-screenshots/spec14-step2-${routeInfo.slug}-${width}.png`,
    fullPage: false,
  })

  await ctx.close()
}

for (const route of ROUTES) {
  await probe(route, 1280, 900)
  await probe(route, 375, 812)
}
await browser.close()

console.log('\n=== Spec 14 Step 2 probe results ===\n')
for (const a of results.assertions) {
  const verdict = a.pass ? 'PASS' : 'FAIL'
  console.log(`  [${verdict}] ${a.name}${!a.pass && a.actual !== undefined ? ` — actual: ${JSON.stringify(a.actual)}` : ''}`)
}
console.log(`\nNon-ignored errors: ${results.errors.length}`)
for (const e of results.errors) console.log(`  - ${e}`)

const failed = results.assertions.filter((a) => !a.pass)
process.exit(failed.length > 0 || results.errors.length > 0 ? 1 : 0)
