// Spec 14 Step 9 — verify /music MusicHero + BackgroundCanvas + cinematic
// Audio smoke per Eric Adjustment #3 — RELIABLE checks only.
// Inconclusive items (ambient/sleep playback) are NOT covered here; surfaced to Eric for manual verification.

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
      // Spotify iframe sandbox messages are pre-existing; ignore
      if (t.includes('spotify') || t.includes('iframe')) return
      results.errors.push(`CONSOLE@${suffix}: ${t}`)
    }
  })

  // === Chrome migration checks ===
  await page.goto(`${baseURL}/music`, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForSelector('[aria-labelledby="page-hero-heading"]', { timeout: 10000 })

  // BackgroundCanvas at root
  const canvas = await page.$('[data-testid="background-canvas"]')
  results.assertions.push({ name: `[${suffix}] [data-testid="background-canvas"] exists at root`, pass: !!canvas })

  if (canvas) {
    const cls = await canvas.getAttribute('class')
    results.assertions.push({
      name: `[${suffix}] BackgroundCanvas className does NOT contain 'bg-dashboard-dark'`,
      pass: !cls.includes('bg-dashboard-dark'),
      actual: cls,
    })
  }

  // Hero
  const hero = await page.$('[aria-labelledby="page-hero-heading"]')
  if (hero) {
    const className = await hero.getAttribute('class')
    results.assertions.push({
      name: `[${suffix}] hero className contains 'pt-[145px]'`,
      pass: className.includes('pt-[145px]'),
    })
    results.assertions.push({
      name: `[${suffix}] hero className contains 'pb-12'`,
      pass: className.includes('pb-12'),
    })

    const cinematic = await hero.$('[data-testid="cinematic-hero-background"]')
    results.assertions.push({ name: `[${suffix}] cinematic mounted in MusicHero`, pass: !!cinematic })

    // h1 with text 'Music', no font-script
    const h1 = await hero.$('h1')
    if (h1) {
      const h1Info = await h1.evaluate((el) => ({
        text: el.textContent.trim(),
        hasFontScript: !!el.querySelector('.font-script'),
        className: el.className,
      }))
      results.assertions.push({
        name: `[${suffix}] h1 text is 'Music'`,
        pass: h1Info.text === 'Music',
        actual: h1Info.text,
      })
      results.assertions.push({
        name: `[${suffix}] h1 has NO .font-script descendant`,
        pass: !h1Info.hasFontScript,
      })
      results.assertions.push({
        name: `[${suffix}] h1 has 'relative' and 'z-10'`,
        pass: h1Info.className.includes('relative') && h1Info.className.includes('z-10'),
      })
    }

    const p = await hero.$('p')
    if (p) {
      const pText = await p.textContent()
      results.assertions.push({
        name: `[${suffix}] subtitle text matches canonical`,
        pass: pText.includes('Worship, rest, and find peace'),
        actual: pText,
      })
    }
  }

  // Sticky tab bar (Music has z-40)
  const tabBar = await page.$('[role="tablist"][aria-label="Music sections"]')
  results.assertions.push({ name: `[${suffix}] sticky tab bar (tablist) renders`, pass: !!tabBar })

  // === Default tab is playlists; verify Spotify iframe renders ===
  const playlistsPanel = await page.$('#tabpanel-playlists')
  results.assertions.push({ name: `[${suffix}] playlists tabpanel exists`, pass: !!playlistsPanel })

  const isPlaylistVisible = await page.evaluate(() => {
    const el = document.querySelector('#tabpanel-playlists')
    return el && !el.hasAttribute('hidden')
  })
  results.assertions.push({ name: `[${suffix}] playlists tabpanel is visible (default tab)`, pass: isPlaylistVisible })

  // Wait briefly for Spotify iframes to start rendering
  await page.waitForTimeout(500)
  const spotifyIframes = await page.$$('iframe[src*="spotify"]')
  results.assertions.push({
    name: `[${suffix}] Spotify iframe(s) render`,
    pass: spotifyIframes.length > 0,
    actual: spotifyIframes.length,
  })

  // === Tab switching (DOM-only, no audio) ===
  const ambientTab = await page.$('button[role="tab"][id="tab-ambient"]')
  if (ambientTab) {
    await ambientTab.click()
    await page.waitForTimeout(300)
    const ambientUrl = page.url()
    results.assertions.push({
      name: `[${suffix}] tab switch playlists → ambient updates URL`,
      pass: ambientUrl.includes('tab=ambient'),
      actual: ambientUrl,
    })

    const ambientPanelVisible = await page.evaluate(() => {
      const el = document.querySelector('#tabpanel-ambient')
      return el && !el.hasAttribute('hidden')
    })
    results.assertions.push({
      name: `[${suffix}] ambient tabpanel becomes visible`,
      pass: ambientPanelVisible,
    })
  }

  const sleepTab = await page.$('button[role="tab"][id="tab-sleep"]')
  if (sleepTab) {
    await sleepTab.click()
    await page.waitForTimeout(300)
    results.assertions.push({
      name: `[${suffix}] tab switch ambient → sleep updates URL`,
      pass: page.url().includes('tab=sleep'),
    })
  }

  // === Route navigation: away to /daily and back ===
  await page.goto(`${baseURL}/daily`, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(300)
  await page.goto(`${baseURL}/music`, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(300)

  // Hero still mounts after navigation
  const heroAfterNav = await page.$('[aria-labelledby="page-hero-heading"]')
  results.assertions.push({ name: `[${suffix}] hero re-mounts after navigation back`, pass: !!heroAfterNav })

  const cinematicAfterNav = await page.$('[aria-labelledby="page-hero-heading"] > [data-testid="cinematic-hero-background"]')
  results.assertions.push({
    name: `[${suffix}] cinematic still present after navigation back`,
    pass: !!cinematicAfterNav,
  })

  // === Horizontal scroll check ===
  const hasHScroll = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  results.assertions.push({ name: `[${suffix}] no horizontal scroll`, pass: !hasHScroll })

  await page.screenshot({
    path: `playwright-screenshots/spec14-step9-music-${suffix}.png`,
    fullPage: false,
  })

  await ctx.close()
}

// === /routines regression check ===
async function probeRoutines() {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()
  page.on('pageerror', (err) => results.errors.push(`PAGE@routines: ${err.message}`))
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const t = msg.text()
      if (t.includes('ERR_CONNECTION_REFUSED') || t.includes('Failed to load resource')) return
      results.errors.push(`CONSOLE@routines: ${t}`)
    }
  })

  await page.goto(`${baseURL}/music/routines`, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(500)

  // /routines uses its own inline hero with aria-labelledby="routines-heading" + ATMOSPHERIC_HERO_BG
  // (NOTE: master plan said /routines uses the shared PageHero component, but RoutinesPage actually
  //  rolls its own hero. The substantive regression check is: ATMOSPHERIC_HERO_BG still present, no cinematic.)
  const routinesHero = await page.$('[aria-labelledby="routines-heading"]')
  results.assertions.push({ name: `[routines] hero with aria-labelledby="routines-heading" exists`, pass: !!routinesHero })

  if (routinesHero) {
    const inlineStyle = await routinesHero.evaluate((el) => el.getAttribute('style') ?? '')
    results.assertions.push({
      name: `[routines] hero retains inline background style (ATMOSPHERIC_HERO_BG)`,
      pass: inlineStyle.includes('background'),
      actual: inlineStyle,
    })

    // /routines should NOT have cinematic mounted
    const cinematic = await routinesHero.$('[data-testid="cinematic-hero-background"]')
    results.assertions.push({
      name: `[routines] NO cinematic mounted (regression check — /routines is out-of-scope)`,
      pass: cinematic === null,
    })
  }

  // /routines should NOT have BackgroundCanvas at root (it stays on rolls-own atmospheric)
  const routinesCanvas = await page.$('[data-testid="background-canvas"]')
  results.assertions.push({
    name: `[routines] NO BackgroundCanvas at root (regression check)`,
    pass: routinesCanvas === null,
  })

  await page.screenshot({
    path: `playwright-screenshots/spec14-step9-routines-regression-1280.png`,
    fullPage: false,
  })

  await ctx.close()
}

await probe(1280, 900, '1280')
await probe(375, 812, '375')
await probeRoutines()
await browser.close()

console.log('\n=== Spec 14 Step 9 probe results ===\n')
for (const a of results.assertions) {
  const verdict = a.pass ? 'PASS' : 'FAIL'
  console.log(`  [${verdict}] ${a.name}${!a.pass && a.actual !== undefined ? ` — actual: ${JSON.stringify(a.actual)}` : ''}`)
}
console.log(`\nNon-ignored errors: ${results.errors.length}`)
for (const e of results.errors) console.log(`  - ${e}`)

const failed = results.assertions.filter((a) => !a.pass)
process.exit(failed.length > 0 || results.errors.length > 0 ? 1 : 0)
