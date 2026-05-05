// Spec 5 visual verification sweep — captures screenshots of the 3 Local Support
// routes at 3 breakpoints, plus computed-style assertions on BackgroundCanvas
// and the hero gradient h1. Runs against the local dev server (port 5173).
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SCREENSHOT_DIR = join(__dirname, '..', 'playwright-screenshots')
const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173'

mkdirSync(SCREENSHOT_DIR, { recursive: true })

const ROUTES = [
  { name: 'churches', url: `${BASE}/local-support/churches`, headingId: 'churches-heading' },
  { name: 'counselors', url: `${BASE}/local-support/counselors`, headingId: 'counselors-heading' },
  { name: 'cr', url: `${BASE}/local-support/celebrate-recovery`, headingId: 'celebrate-recovery-heading' },
]

const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
]

const browser = await chromium.launch({ headless: true })

for (const route of ROUTES) {
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } })
    const page = await ctx.newPage()
    const consoleErrors = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })
    try {
      await page.goto(route.url, { waitUntil: 'networkidle', timeout: 15000 })
      await page.waitForSelector(`h1#${route.headingId}`, { timeout: 5000 })
      await page.waitForTimeout(500)
      const fname = `spec-5-${route.name}-${vp.name}-${vp.width}x${vp.height}.png`
      await page.screenshot({ path: `${SCREENSHOT_DIR}/${fname}`, fullPage: true })
      console.log(`✓ ${route.name} @ ${vp.width}x${vp.height} — ${fname}`)
      if (consoleErrors.length > 0) {
        console.log(`  ⚠️ ${consoleErrors.length} console errors:`, consoleErrors.slice(0, 3))
      }
    } catch (e) {
      console.log(`✗ ${route.name} @ ${vp.width}x${vp.height} — ${e.message}`)
    }
    await ctx.close()
  }
}

// Computed-style verification on /local-support/churches
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()
await page.goto(`${BASE}/local-support/churches`, { waitUntil: 'networkidle' })

const verification = await page.evaluate(() => {
  const out = {}
  // BackgroundCanvas
  const main = document.querySelector('main')
  let cursor = main?.parentElement
  while (cursor && !(cursor.className?.includes('min-h-screen') && cursor.className?.includes('overflow-hidden'))) {
    cursor = cursor.parentElement
  }
  if (cursor) {
    const cs = window.getComputedStyle(cursor)
    out.backgroundCanvas = {
      classes: cursor.className,
      backgroundImageStart: cs.backgroundImage.substring(0, 80),
      hasRadialGradient: cs.backgroundImage.includes('radial-gradient'),
      hasLinearGradient: cs.backgroundImage.includes('linear-gradient'),
    }
  }
  // Hero h1 gradient
  const h1 = document.querySelector('h1#churches-heading')
  if (h1) {
    const cs = window.getComputedStyle(h1)
    out.heroH1 = {
      backgroundImage: cs.backgroundImage.substring(0, 80),
      webkitBackgroundClip: cs.webkitBackgroundClip,
      color: cs.color,
    }
  }
  // Use My Location button (subtle Button)
  const useLoc = document.querySelector('button[aria-label="Use my current location"]')
  if (useLoc) {
    out.useLocationButton = {
      classes: useLoc.className.substring(0, 200),
      hasBgWhite007: useLoc.className.includes('bg-white/[0.07]'),
      hasTextWhite: useLoc.className.includes('text-white'),
      hasMinH44: useLoc.className.includes('min-h-[44px]'),
      // Check icon inside has text-sky-300
      iconClass: useLoc.querySelector('svg')?.getAttribute('class') ?? null,
    }
  }
  // Tab bar wrapper
  const tablist = document.querySelector('[role="tablist"]')
  if (tablist) {
    out.tabBar = {
      classes: tablist.className,
      hasVioletPattern: tablist.className.includes('bg-white/[0.07]') && tablist.className.includes('rounded-full'),
    }
  }
  // Active tab button
  const activeTab = document.querySelector('[role="tab"][aria-selected="true"]')
  if (activeTab) {
    out.activeTab = {
      classes: activeTab.className.substring(0, 300),
      hasVioletActive: activeTab.className.includes('bg-violet-500/[0.13]'),
    }
  }
  // Mobile view toggle won't be visible at desktop; not asserted here
  return out
})
console.log('\n=== Computed-style verification ===')
console.log(JSON.stringify(verification, null, 2))

// Inline element positional verification: SearchControls horizontal row at 1440px
const layout = await page.evaluate(() => {
  const useLoc = document.querySelector('button[aria-label="Use my current location"]')
  const input = document.querySelector('#location-input')
  const search = document.querySelector('button[aria-label="Search"]')
  if (!useLoc || !input || !search) return { error: 'missing elements' }
  const ulY = useLoc.getBoundingClientRect().y
  const inY = input.getBoundingClientRect().y
  const seY = search.getBoundingClientRect().y
  return {
    useLocationY: ulY,
    inputY: inY,
    searchY: seY,
    ulInputDelta: Math.abs(ulY - inY),
    ulSearchDelta: Math.abs(ulY - seY),
    sameRow: Math.abs(ulY - inY) < 50 && Math.abs(ulY - seY) < 50,
  }
})
console.log('\n=== Inline-row positional check (SearchControls @ 1440px) ===')
console.log(JSON.stringify(layout, null, 2))

await ctx.close()

// CR-specific: verify FrostedCard subdued chrome
const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page2 = await ctx2.newPage()
await page2.goto(`${BASE}/local-support/celebrate-recovery`, { waitUntil: 'networkidle' })
const crVerification = await page2.evaluate(() => {
  // Find the heading "What is Celebrate Recovery?"
  const heading = Array.from(document.querySelectorAll('p')).find(
    (p) => p.textContent?.match(/what is celebrate recovery\?/i),
  )
  if (!heading) return { error: 'CR heading not found' }
  let cursor = heading.parentElement
  while (cursor && !cursor.className?.includes('bg-white/[0.05]')) {
    cursor = cursor.parentElement
  }
  if (!cursor) return { error: 'FrostedCard subdued wrapper not found' }
  return {
    classes: cursor.className,
    hasBgWhite005: cursor.className.includes('bg-white/[0.05]'),
    hasRounded3xl: cursor.className.includes('rounded-3xl'),
    hasMaxW2xl: cursor.className.includes('max-w-2xl'),
    hasMxAuto: cursor.className.includes('mx-auto'),
  }
})
console.log('\n=== CR FrostedCard subdued verification ===')
console.log(JSON.stringify(crVerification, null, 2))

await ctx2.close()
await browser.close()
console.log('\n✅ Visual sweep complete')
