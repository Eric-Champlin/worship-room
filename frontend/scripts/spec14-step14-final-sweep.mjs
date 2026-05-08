// Spec 14 Step 14 — final cumulative Playwright sweep
// Verifies all 8 cinematic-mounting pages + /daily regression + /routines regression
import { chromium } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173'
const results = { errors: [], assertions: [] }

const ROUTES = [
  { path: '/daily', heroLabelledby: 'daily-hub-heading', name: 'daily' },
  { path: '/bible', heroLabelledby: 'bible-hero-heading', name: 'bible' },
  { path: '/local-support/churches', heroLabelledbyContains: 'churches', name: 'churches' },
  { path: '/local-support/counselors', heroLabelledbyContains: 'counselors', name: 'counselors' },
  { path: '/local-support/celebrate-recovery', heroLabelledbyContains: 'celebrate', name: 'celebrate-recovery' },
  { path: '/ask', heroLabelledby: 'ask-hero-heading', name: 'ask' },
  { path: '/grow', heroLabelledby: 'grow-heading', name: 'grow' },
  { path: '/prayer-wall', heroLabelledby: 'prayer-wall-heading', name: 'prayer-wall' },
  { path: '/music', heroLabelledby: 'page-hero-heading', name: 'music' },
]

const browser = await chromium.launch({ headless: true })

async function checkCinematic(routeInfo, width, height) {
  const tag = `${routeInfo.name}@${width}`
  const ctx = await browser.newContext({ viewport: { width, height } })
  const page = await ctx.newPage()
  page.on('pageerror', (err) => results.errors.push(`PAGE@${tag}: ${err.message}`))
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const t = msg.text()
      if (t.includes('ERR_CONNECTION_REFUSED') || t.includes('Failed to load resource')) return
      if (t.includes('spotify') || t.includes('iframe') || t.includes('Maps') || t.includes('places')) return
      results.errors.push(`CONSOLE@${tag}: ${t}`)
    }
  })

  await page.goto(`${baseURL}${routeInfo.path}`, { waitUntil: 'networkidle', timeout: 30000 })

  // Wait for cinematic
  await page.waitForSelector('[data-testid="cinematic-hero-background"]', { timeout: 10000 }).catch(() => {})

  const cinematic = await page.$('[data-testid="cinematic-hero-background"]')
  results.assertions.push({ name: `[${tag}] cinematic mounted`, pass: !!cinematic })

  if (cinematic) {
    // Verify 8 layers (3 div + 5 svg)
    const childCount = await cinematic.evaluate((el) => el.children.length)
    results.assertions.push({ name: `[${tag}] 8 atmospheric layers`, pass: childCount === 8, actual: childCount })

    // Verify aria-hidden + pointer-events-none
    const ariaHidden = await cinematic.getAttribute('aria-hidden')
    const className = await cinematic.getAttribute('class')
    results.assertions.push({ name: `[${tag}] aria-hidden=true`, pass: ariaHidden === 'true' })
    results.assertions.push({ name: `[${tag}] pointer-events-none`, pass: className?.includes('pointer-events-none') ?? false })

    // Verify parent hero has navbar-compensated padding
    const parentClass = await cinematic.evaluate((el) => el.parentElement?.className ?? '')
    results.assertions.push({
      name: `[${tag}] hero parent has pt-[145px] pb-12`,
      pass: parentClass.includes('pt-[145px]') && parentClass.includes('pb-12'),
      actual: parentClass,
    })
  }

  // No horizontal scroll
  const hasHScroll = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  results.assertions.push({ name: `[${tag}] no horizontal scroll`, pass: !hasHScroll })

  await page.screenshot({
    path: `playwright-screenshots/spec14-step14-${routeInfo.name}-${width}.png`,
    fullPage: false,
  })

  await ctx.close()
}

// /routines regression check
async function checkRoutinesRegression() {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()
  page.on('pageerror', (err) => results.errors.push(`PAGE@routines: ${err.message}`))

  await page.goto(`${baseURL}/music/routines`, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(500)

  // /routines should NOT have cinematic
  const cinematic = await page.$('[data-testid="cinematic-hero-background"]')
  results.assertions.push({
    name: `[routines] NO cinematic mounted (out-of-scope regression check)`,
    pass: cinematic === null,
  })

  // /routines should NOT have BackgroundCanvas at root
  const canvas = await page.$('[data-testid="background-canvas"]')
  results.assertions.push({
    name: `[routines] NO BackgroundCanvas at root (out-of-scope regression check)`,
    pass: canvas === null,
  })

  // /routines hero exists with rolls-own ID
  const routinesHero = await page.$('[aria-labelledby="routines-heading"]')
  results.assertions.push({
    name: `[routines] hero with aria-labelledby="routines-heading" exists`,
    pass: !!routinesHero,
  })
  if (routinesHero) {
    const inlineStyle = await routinesHero.evaluate((el) => el.getAttribute('style') ?? '')
    results.assertions.push({
      name: `[routines] hero retains inline ATMOSPHERIC_HERO_BG`,
      pass: inlineStyle.includes('background'),
    })
  }

  await page.screenshot({
    path: `playwright-screenshots/spec14-step14-routines-regression-1280.png`,
    fullPage: false,
  })

  await ctx.close()
}

for (const route of ROUTES) {
  await checkCinematic(route, 1280, 900)
  await checkCinematic(route, 375, 812)
}
await checkRoutinesRegression()

await browser.close()

console.log('\n=== Spec 14 Step 14 final sweep ===\n')
let pass = 0
let fail = 0
for (const a of results.assertions) {
  const verdict = a.pass ? 'PASS' : 'FAIL'
  if (a.pass) pass++
  else fail++
  if (!a.pass) console.log(`  [${verdict}] ${a.name}${a.actual !== undefined ? ` — actual: ${JSON.stringify(a.actual)}` : ''}`)
}
console.log(`\nSummary: ${pass} PASS, ${fail} FAIL across ${results.assertions.length} assertions`)
console.log(`Non-ignored errors: ${results.errors.length}`)
for (const e of results.errors) console.log(`  - ${e}`)

process.exit(fail > 0 || results.errors.length > 0 ? 1 : 0)
