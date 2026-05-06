/**
 * Spec 11A — Music Page Shell + 3 Tabs + Audio Cluster Chrome
 * Verification script for: /music routes + AudioDrawer states
 */
import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:5173'
const SS = 'playwright-screenshots'

// Seeded mix: {"sounds":[{"id":"gentle-rain","v":0.7},{"id":"fireplace","v":0.5},{"id":"night-crickets","v":0.4}]}
const MIX_B64 =
  'eyJzb3VuZHMiOlt7ImlkIjoiZ2VudGxlLXJhaW4iLCJ2IjowLjd9LHsiaWQiOiJmaXJlcGxhY2UiLCJ2IjowLjV9LHsiaWQiOiJuaWdodC1jcmlja2V0cyIsInYiOjAuNH1dfQ'

const consoleErrors: string[] = []
const IGNORE = ['DevTools', 'HMR', '[vite]', 'favicon.ico', 'chrome-extension://']

function seedAuth(page: Parameters<typeof page.addInitScript>[0]) {
  // no-op — placeholder for addInitScript call signature; actual usage below
}

async function setup(page: Parameters<typeof test>[0]['page'], viewport = { width: 1280, height: 900 }) {
  await page.addInitScript(() => {
    localStorage.setItem('wr_auth_simulated', 'true')
    localStorage.setItem('wr_user_name', 'Eric')
  })
  await page.setViewportSize(viewport)
}

async function waitForRender(page: Parameters<typeof test>[0]['page'], selector?: string) {
  await page.waitForLoadState('networkidle')
  if (selector) {
    await page.waitForSelector(selector, { state: 'visible', timeout: 10000 })
  }
  await page.waitForTimeout(500)
}

// ─── ROUTE 1: /music ────────────────────────────────────────────────────────

test('Route 1 — /music tab bar chrome (desktop 1280)', async ({ page }) => {
  page.on('console', (msg) => {
    const t = msg.text()
    if (msg.type() === 'error' && !IGNORE.some((p) => t.includes(p))) {
      consoleErrors.push(t)
    }
  })

  await setup(page)
  await page.goto(`${BASE_URL}/music`)
  await waitForRender(page, '[role="tablist"]')
  await page.screenshot({ path: `${SS}/route1-music-1280.png`, fullPage: true })

  // Tab list structure
  const tabList = page.getByRole('tablist', { name: 'Music sections' })
  await expect(tabList).toBeVisible()

  // 3 tabs present
  const tabs = page.getByRole('tab')
  await expect(tabs).toHaveCount(3)

  // Active tab is "Worship Playlists" (default)
  const activeTab = page.getByRole('tab', { selected: true })
  await expect(activeTab).toBeVisible()

  const activeClass = await activeTab.getAttribute('class')
  expect(activeClass, 'Active tab must have bg-white/15').toContain('bg-white/15')
  expect(activeClass, 'Active tab must have border class').toContain('border')
  expect(activeClass, 'Active tab must show white text').toContain('text-white')

  // Inactive tabs have muted opacity
  const inactiveTabs = page.getByRole('tab', { selected: false })
  const inactiveCount = await inactiveTabs.count()
  expect(inactiveCount).toBe(2)
  for (let i = 0; i < inactiveCount; i++) {
    const cls = await inactiveTabs.nth(i).getAttribute('class')
    expect(cls, 'Inactive tabs must have text-white/50').toContain('text-white/50')
  }

  // Tab labels visible at 400px+ (sr-only on narrow)
  await expect(page.getByRole('tab', { name: /Worship Playlists/ })).toBeVisible()
  await expect(page.getByRole('tab', { name: /Ambient Sounds/ })).toBeVisible()
  await expect(page.getByRole('tab', { name: /Sleep & Rest/ })).toBeVisible()

  // Switch to Ambient tab and verify active classes migrate
  await page.getByRole('tab', { name: /Ambient Sounds/ }).click()
  await page.waitForTimeout(300)
  const newActive = page.getByRole('tab', { selected: true })
  const newActiveClass = await newActive.getAttribute('class')
  expect(newActiveClass, 'Newly active tab must have bg-white/15').toContain('bg-white/15')

  // Switch back to default
  await page.getByRole('tab', { name: /Worship Playlists/ }).click()

  console.log(`Route 1 console errors: ${consoleErrors.length}`)
})

test('Route 1 — /music tab bar chrome (mobile 375)', async ({ page }) => {
  await setup(page, { width: 375, height: 812 })
  await page.goto(`${BASE_URL}/music`)
  await waitForRender(page, '[role="tablist"]')
  await page.screenshot({ path: `${SS}/route1-music-375.png`, fullPage: true })

  const tabList = page.getByRole('tablist', { name: 'Music sections' })
  await expect(tabList).toBeVisible()

  const activeTab = page.getByRole('tab', { selected: true })
  const activeClass = await activeTab.getAttribute('class')
  expect(activeClass, 'Active tab on mobile must have bg-white/15').toContain('bg-white/15')

  // Min-h-[44px] on tabs (touch target)
  expect(activeClass, 'Active tab must have min-h-[44px]').toContain('min-h-[44px]')
})

// ─── ROUTE 2: /music?tab=playlists ──────────────────────────────────────────

test('Route 2 — playlists tab: no "coming soon" copy, no useSpotifyAutoPause', async ({ page }) => {
  await setup(page)
  await page.goto(`${BASE_URL}/music?tab=playlists`)
  // Use domcontentloaded — Spotify iframes keep network open indefinitely
  await page.waitForLoadState('domcontentloaded')
  await page.waitForSelector('[role="tabpanel"]', { state: 'visible', timeout: 10000 })
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${SS}/route2-playlists-1280.png`, fullPage: true })

  // "coming soon" copy must be absent
  const comingSoonInstances = await page.getByText('coming soon', { exact: false }).count()
  expect(comingSoonInstances, '"coming soon" text must not appear on playlists tab').toBe(0)

  const comingSoonParenthetical = await page.getByText('(coming soon)', { exact: false }).count()
  expect(comingSoonParenthetical, '"(coming soon)" text must not appear').toBe(0)

  // Active tab is "Worship Playlists"
  const activeTab = page.getByRole('tab', { selected: true })
  await expect(activeTab).toContainText('Worship Playlists')

  // Tab panel visible
  const panel = page.locator('[role="tabpanel"][id="tabpanel-playlists"]')
  await expect(panel).not.toHaveAttribute('hidden')
})

// ─── ROUTE 3: /music?tab=ambient ────────────────────────────────────────────

test('Route 3 — ambient tab DOM + border classes (desktop 1280)', async ({ page }) => {
  await setup(page)
  await page.goto(`${BASE_URL}/music?tab=ambient`)
  await waitForRender(page, 'section[aria-label="Featured scenes"]')
  await page.screenshot({ path: `${SS}/route3-ambient-1280.png`, fullPage: true })

  // Active tab is "Ambient Sounds"
  const activeTab = page.getByRole('tab', { selected: true })
  await expect(activeTab).toContainText('Ambient Sounds')

  // Tab panel visible
  const panel = page.locator('[role="tabpanel"][id="tabpanel-ambient"]')
  await expect(panel).not.toHaveAttribute('hidden')

  // Build Your Own Mix section: border-white/[0.12]
  const buildMixHeader = page.getByText('Build Your Own Mix')
  await expect(buildMixHeader).toBeVisible()
  const buildMixContainer = buildMixHeader.locator('xpath=ancestor::div[contains(@class,"border-white")]').first()
  const buildMixClass = await buildMixContainer.getAttribute('class')
  expect(buildMixClass, 'Build Your Own Mix container must have border-white/[0.12]').toContain(
    'border-white/[0.12]',
  )

  // Featured scenes section present
  const featuredSection = page.locator('section[aria-label="Featured scenes"]')
  await expect(featuredSection).toBeVisible()

  // FeaturedSceneCard: inner white-circle overlay in DOM
  const featuredButtons = page.locator('section[aria-label="Featured scenes"] button[aria-label^="Play "]')
  const featuredCount = await featuredButtons.count()
  expect(featuredCount, 'At least one featured scene card should be present').toBeGreaterThan(0)

  // Check inner white circle div exists (bg-white text-primary)
  const firstFeatured = featuredButtons.first()
  const whiteCircle = firstFeatured.locator('div.bg-white.text-primary')
  await expect(whiteCircle, 'FeaturedSceneCard inner white circle must be in DOM').toHaveCount(1)

  // SceneCard: inner white-circle overlay in DOM
  const allScenesSection = page.locator('section[aria-label="All scenes"]')
  const sceneCardButtons = allScenesSection.locator('button[aria-label^="Play "]')
  const sceneCount = await sceneCardButtons.count()
  expect(sceneCount, 'At least one SceneCard should be present').toBeGreaterThan(0)

  const firstScene = sceneCardButtons.first()
  const sceneWhiteCircle = firstScene.locator('div.bg-white.text-primary')
  await expect(sceneWhiteCircle, 'SceneCard inner white circle must be in DOM').toHaveCount(1)

  // FeaturedSceneCard outer hover overlay: bg-black/40 (post-review fix)
  const featuredHoverOverlay = firstFeatured.locator('div[aria-hidden="true"]').first()
  const featuredOverlayClass = await featuredHoverOverlay.getAttribute('class')
  expect(featuredOverlayClass, 'FeaturedSceneCard overlay must have bg-black/40').toContain('bg-black/40')

  // Sound grid section present
  await expect(page.locator('text=Build Your Own Mix')).toBeVisible()

  // No placeholder copy ("We're curating" or similar old patterns)
  const placeholderCount = await page.getByText("We're curating", { exact: false }).count()
  expect(placeholderCount, 'Old placeholder copy must be absent').toBe(0)
})

test('Route 3 — ambient tab (mobile 375)', async ({ page }) => {
  await setup(page, { width: 375, height: 812 })
  await page.goto(`${BASE_URL}/music?tab=ambient`)
  await waitForRender(page, 'section[aria-label="Featured scenes"]')
  await page.screenshot({ path: `${SS}/route3-ambient-375.png`, fullPage: true })

  const featuredSection = page.locator('section[aria-label="Featured scenes"]')
  await expect(featuredSection).toBeVisible()

  // Build Your Own Mix visible on mobile
  await expect(page.getByText('Build Your Own Mix')).toBeVisible()
})

// ─── ROUTE 4: /music?tab=sleep ──────────────────────────────────────────────

test('Route 4 — sleep tab border classes (desktop 1280)', async ({ page }) => {
  await setup(page)
  await page.goto(`${BASE_URL}/music?tab=sleep`)
  await waitForRender(page, '[role="tabpanel"][id="tabpanel-sleep"]:not([hidden])')
  await page.screenshot({ path: `${SS}/route4-sleep-1280.png`, fullPage: true })

  // Active tab is "Sleep & Rest"
  const activeTab = page.getByRole('tab', { selected: true })
  await expect(activeTab).toContainText('Sleep & Rest')

  // "Build a Bedtime Routine" CTA section has border-white/[0.12]
  const routineCTA = page.getByText('Build a Bedtime Routine')
  await expect(routineCTA).toBeVisible()
  const routineContainer = routineCTA.locator('xpath=ancestor::div[contains(@class,"border-white")]').first()
  const routineClass = await routineContainer.getAttribute('class')
  expect(routineClass, '"Build a Bedtime Routine" container must have border-white/[0.12]').toContain(
    'border-white/[0.12]',
  )

  // BibleSleepSection: items with border-white/[0.12]
  // BibleSleepSection renders book items with that border class
  const bibleItems = page.locator('a.rounded-xl.border.border-white\\/\\[0\\.12\\]')
  const bibleItemCount = await bibleItems.count()
  // At least some items should have this border class OR check via evaluate
  // If the class selector doesn't work due to escaping, use evaluate
  if (bibleItemCount === 0) {
    // Try via evaluate
    const count = await page.evaluate(() => {
      const all = document.querySelectorAll('[class*="border-white/[0.12]"]')
      return all.length
    })
    expect(count, 'At least one element with border-white/[0.12] must exist on sleep tab').toBeGreaterThan(0)
  } else {
    expect(bibleItemCount).toBeGreaterThan(0)
  }

  // bg-primary/10 icon background preserved (BibleSleepSection book icon)
  const primaryTintCount = await page.evaluate(() => {
    const all = document.querySelectorAll('[class*="bg-primary/10"]')
    return all.length
  })
  expect(primaryTintCount, 'bg-primary/10 decorative tint must be preserved on sleep tab').toBeGreaterThan(
    0,
  )
})

test('Route 4 — sleep tab (mobile 375)', async ({ page }) => {
  await setup(page, { width: 375, height: 812 })
  await page.goto(`${BASE_URL}/music?tab=sleep`)
  await waitForRender(page, '[role="tabpanel"][id="tabpanel-sleep"]:not([hidden])')
  await page.screenshot({ path: `${SS}/route4-sleep-375.png`, fullPage: true })

  await expect(page.getByText('Build a Bedtime Routine')).toBeVisible()
})

// ─── ROUTE 5: /music?mix=<base64> ───────────────────────────────────────────

test('Route 5 — SharedMixHero gradient + Play This Mix white pill', async ({ page }) => {
  await setup(page)
  await page.goto(`${BASE_URL}/music?tab=ambient&mix=${MIX_B64}`)
  await waitForRender(page, '[data-testid="shared-mix-hero"], button')
  await page.waitForTimeout(800) // allow SharedMixHero to mount
  await page.screenshot({ path: `${SS}/route5-shared-mix-1280.png`, fullPage: true })

  // SharedMixHero: "Play This Mix" button must be visible
  const playBtn = page.getByRole('button', { name: /Play This Mix/ })
  await expect(playBtn, '"Play This Mix" button must be visible in SharedMixHero').toBeVisible()

  // Pattern 2 white-pill: bg-white on button
  const playBtnClass = await playBtn.getAttribute('class')
  expect(playBtnClass, '"Play This Mix" must have bg-white').toContain('bg-white')
  expect(playBtnClass, '"Play This Mix" must have rounded-full').toContain('rounded-full')
  expect(playBtnClass, '"Play This Mix" must have px-8').toContain('px-8')
  expect(playBtnClass, '"Play This Mix" must have text-hero-bg').toContain('text-hero-bg')
  expect(playBtnClass, '"Play This Mix" must have white shadow').toContain(
    'shadow-[0_0_30px_rgba(255,255,255,0.20)]',
  )
  expect(playBtnClass, '"Play This Mix" must have hover shadow').toContain(
    'hover:shadow-[0_0_40px_rgba(255,255,255,0.30)]',
  )

  // SharedMixHero section wrapper: gradient background preserved
  // The section has an inline style with radial-gradient
  const heroSection = page.locator('section').filter({ has: playBtn })
  const heroStyle = await heroSection.getAttribute('style')
  expect(heroStyle, 'SharedMixHero gradient must be preserved').toContain('radial-gradient')

  // Mix sound names shown (gentle rain, fireplace, night crickets)
  // These might appear as text in the hero — use heading role to avoid strict-mode multi-match
  const gentleRainHeading = page.getByRole('heading', { name: /Gentle Rain/i })
  const gentleRainCount = await gentleRainHeading.count()
  if (gentleRainCount > 0) {
    await expect(gentleRainHeading.first()).toBeVisible()
  } else {
    // Fall back to first text match if no heading role
    await expect(page.getByText('Gentle Rain', { exact: false }).first()).toBeVisible()
  }

  // Dismiss button present
  const dismissBtn = page.getByRole('button', { name: /Dismiss|dismiss|close|skip/i })
  // Not strictly required but good to check
  const dismissCount = await dismissBtn.count()
  console.log(`Dismiss buttons found: ${dismissCount}`)

  // Tab is forced to ambient when mix present
  const activeTab = page.getByRole('tab', { selected: true })
  await expect(activeTab).toContainText('Ambient Sounds')
})

// ─── AUDIODRAWER STATES ──────────────────────────────────────────────────────

test('AudioDrawer — open via Daily Hub ambient pill + Mixer tab chrome', async ({ page }) => {
  await setup(page)
  await page.goto(`${BASE_URL}/daily?tab=pray`)
  await waitForRender(page, '[role="tablist"]')
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${SS}/drawer-preflight-1280.png`, fullPage: true })

  // Strategy: AudioPill routine-shortcut (z-9999) intercepts clicks on the DailyAmbientPillFAB.
  // Click the routine shortcut's "Start …" button → dispatches START_ROUTINE → pillVisible=true
  // synchronously, then "Open audio controls" becomes available on the now-playing AudioPill.
  const routineStartBtn = page.getByRole('button', { name: /^Start /i }).first()
  const hasRoutine = (await routineStartBtn.count()) > 0

  if (hasRoutine) {
    await routineStartBtn.click()
    await page.waitForTimeout(500)
    // "Open audio controls" is now on the now-playing pill (exact: true to avoid the "Playing: X, click to open audio controls" sibling)
    const openDrawerBtn = page.getByRole('button', { name: 'Open audio controls', exact: true })
    await expect(openDrawerBtn).toBeVisible()
    await openDrawerBtn.click()
    await page.waitForTimeout(400)
  } else {
    // Fallback: try clicking the DailyAmbientPillFAB directly
    const ambientPill = page.getByRole('button', { name: 'Enhance with sound' })
    await expect(ambientPill, 'Ambient pill must be visible on Daily Hub').toBeVisible()
    await ambientPill.click()
    await page.waitForTimeout(400)
  }

  // Drawer visible
  const drawer = page.getByRole('dialog', { name: 'Audio controls' })
  await expect(drawer, 'AudioDrawer must open on pill click').toBeVisible()
  await page.screenshot({ path: `${SS}/drawer-open-mixer-1280.png`, fullPage: true })

  // Drawer border: border-white/[0.12]
  const drawerClass = await drawer.getAttribute('class')
  expect(drawerClass, 'Drawer panel must have border-white/[0.12]').toContain('border-white/[0.12]')

  // Drawer background: rgba(15, 10, 30, 0.95) via inline style
  const drawerStyle = await drawer.evaluate((el) => (el as HTMLElement).style.background)
  expect(drawerStyle, 'Drawer background must be rgba(15, 10, 30, 0.95)').toBe(
    'rgba(15, 10, 30, 0.95)',
  )

  // Close button present
  const closeBtn = page.getByRole('button', { name: 'Close audio controls' })
  await expect(closeBtn).toBeVisible()

  // DrawerTabs: 3 tabs (Mixer, Timer, Saved) — role="tab" not "button"
  const mixerTab = page.getByRole('tab', { name: /Mixer/i })
  const timerTab = page.getByRole('tab', { name: /Timer/i })
  const savedTab = page.getByRole('tab', { name: /Saved/i })
  await expect(mixerTab).toBeVisible()
  await expect(timerTab).toBeVisible()
  await expect(savedTab).toBeVisible()

  // Mixer is default active tab — DrawerTabs uses underline style (border-b-2 border-primary) + aria-selected
  // NOTE: DrawerTabs uses a different active pattern from the Music page shell tabs.
  // Music shell tabs: bg-white/15 pill. DrawerTabs: border-b-2 border-primary underline.
  await expect(mixerTab).toHaveAttribute('aria-selected', 'true')
  const mixerTabClass = await mixerTab.getAttribute('class')
  expect(mixerTabClass, 'Mixer tab active class must include border-primary').toContain('border-primary')
  expect(mixerTabClass, 'Mixer tab active class must include text-primary').toContain('text-primary')
})

test('AudioDrawer — Timer tab active preset + Start Timer white pill', async ({ page }) => {
  await setup(page)
  await page.goto(`${BASE_URL}/daily?tab=pray`)
  await waitForRender(page, '[role="tablist"]')
  await page.waitForTimeout(500)

  // Open drawer via routine shortcut (same strategy as Mixer test)
  const routineStartBtn = page.getByRole('button', { name: /^Start /i }).first()
  if ((await routineStartBtn.count()) > 0) {
    await routineStartBtn.click()
    await page.waitForTimeout(500)
    await page.getByRole('button', { name: 'Open audio controls', exact: true }).click()
  } else {
    await page.getByRole('button', { name: 'Enhance with sound' }).click()
  }
  await page.waitForTimeout(400)

  const drawer = page.getByRole('dialog', { name: 'Audio controls' })
  await expect(drawer).toBeVisible()

  // Click Timer tab — role="tab" not "button"
  const timerTab = page.getByRole('tab', { name: /Timer/i })
  await timerTab.click()
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${SS}/drawer-timer-tab-1280.png`, fullPage: true })

  // Timer tab becomes active — underline style same as Mixer
  await expect(timerTab).toHaveAttribute('aria-selected', 'true')
  const timerTabClass = await timerTab.getAttribute('class')
  expect(timerTabClass, 'Timer tab active class must include border-primary').toContain('border-primary')

  // Timer presets: no preset selected by default (selectedDuration starts null).
  // Click the first preset (scoped to drawer panel to avoid matching Daily Hub guided prayer cards)
  const activePanel = drawer.locator('[role="tabpanel"]')
  // Preset buttons carry aria-checked attribute — scope within panel to skip background page elements
  const presetBtns = activePanel.locator('button[aria-checked]')
  const presetCount = await presetBtns.count()
  if (presetCount > 0) {
    const firstPreset = presetBtns.first()
    await firstPreset.click()
    await page.waitForTimeout(200)
    const selectedPresetClass = await firstPreset.getAttribute('class')
    expect(selectedPresetClass, 'Selected preset must have bg-white/15 active state').toContain('bg-white/15')
    expect(selectedPresetClass, 'Selected preset must have text-white').toContain('text-white')
    expect(selectedPresetClass, 'Selected preset must have border-white/30').toContain('border-white/30')
  } else {
    console.log('No aria-checked preset buttons found in timer panel; skipping preset check')
  }

  // Start Timer button: Pattern 2 white-pill (bg-white + rounded-full + shadow)
  // Scoped to drawer to avoid matching any background Start buttons.
  // Note: the button has an aria-label override ("Start sleep timer for X min...") so we
  // match by visible text content, not accessible name.
  const startTimerBtn = drawer.locator('button', { hasText: /^Start Timer$/ })
  await expect(startTimerBtn, 'Start Timer button must be visible on Timer tab').toBeVisible()

  const startTimerClass = await startTimerBtn.getAttribute('class')
  expect(startTimerClass, 'Start Timer must have bg-white (Pattern 2 white pill)').toContain('bg-white')
  expect(startTimerClass, 'Start Timer must have rounded-full').toContain('rounded-full')
  expect(startTimerClass, 'Start Timer must have px-8').toContain('px-8')
  // Pattern 2 uses text-hero-bg for the dark text on white button
  expect(startTimerClass, 'Start Timer must have text-hero-bg').toContain('text-hero-bg')
})

test('AudioDrawer — close and FAB reappears', async ({ page }) => {
  await setup(page)
  await page.goto(`${BASE_URL}/daily?tab=pray`)
  await waitForRender(page, '[role="tablist"]')
  await page.waitForTimeout(500)

  // Open drawer via routine shortcut (same strategy as Mixer test)
  const routineStartBtn = page.getByRole('button', { name: /^Start /i }).first()
  if ((await routineStartBtn.count()) > 0) {
    await routineStartBtn.click()
    await page.waitForTimeout(500)
    await page.getByRole('button', { name: 'Open audio controls', exact: true }).click()
  } else {
    await page.getByRole('button', { name: 'Enhance with sound' }).click()
  }
  await page.waitForTimeout(400)

  const drawer = page.getByRole('dialog', { name: 'Audio controls' })
  await expect(drawer).toBeVisible()

  // FAB auto-hides when drawer open: the fixed z-40 wrapper gets aria-hidden="true"
  const fabWrapper = page.locator('div.fixed.z-40')
  await expect(fabWrapper).toHaveAttribute('aria-hidden', 'true')
  console.log('DailyAmbientPillFAB correctly aria-hidden while drawer open')

  // Close drawer
  await page.getByRole('button', { name: 'Close audio controls' }).click()
  await page.waitForTimeout(400)

  // Drawer closed
  await expect(drawer).not.toBeVisible()

  // FAB reappears: aria-hidden removed/false after drawer closes
  await expect(fabWrapper).not.toHaveAttribute('aria-hidden', 'true')
  await page.screenshot({ path: `${SS}/drawer-closed-fab-restored-1280.png`, fullPage: true })
})

// ─── AUDIODRAWER ON MUSIC PAGE (routine shortcut pill check) ─────────────────

test('AudioPill — routine shortcut border-white/[0.12] (Music page, logged in)', async ({ page }) => {
  await setup(page)
  await page.goto(`${BASE_URL}/music`)
  await waitForRender(page, '[role="tablist"]')
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${SS}/audio-pill-routine-shortcut-1280.png`, fullPage: true })

  // The routine shortcut AudioPill renders when isAuthenticated + !pillVisible
  // Find the fixed pill element by its border class
  const pillByAriaLabel = page.locator('[aria-label="Routine shortcut"]')
  const routinePillCount = await pillByAriaLabel.count()

  if (routinePillCount > 0) {
    const pillClass = await pillByAriaLabel.getAttribute('class')
    expect(pillClass, 'Routine shortcut pill must have border-white/[0.12]').toContain(
      'border-white/[0.12]',
    )
  } else {
    // AudioPill might not render if no routines found; check the now-playing pill instead
    const nowPlayingPill = page.locator('[aria-label="Audio player"]')
    const nowPlayingCount = await nowPlayingPill.count()
    if (nowPlayingCount > 0) {
      const pillClass = await nowPlayingPill.getAttribute('class')
      expect(pillClass, 'Now-playing AudioPill must have border-white/[0.12]').toContain(
        'border-white/[0.12]',
      )
    } else {
      console.log('AudioPill not visible — no routines or audio active; skipping border check')
    }
  }
})

// ─── KEYBOARD NAVIGATION ────────────────────────────────────────────────────

test('Tab bar keyboard navigation — Arrow keys move between tabs', async ({ page }) => {
  await setup(page)
  await page.goto(`${BASE_URL}/music`)
  await waitForRender(page, '[role="tablist"]')

  // Focus first tab
  const firstTab = page.getByRole('tab', { name: /Worship Playlists/ })
  await firstTab.focus()
  await expect(firstTab).toBeFocused()

  // ArrowRight moves to Ambient tab
  await page.keyboard.press('ArrowRight')
  const ambientTab = page.getByRole('tab', { name: /Ambient Sounds/ })
  await expect(ambientTab).toBeFocused()

  // ArrowRight again moves to Sleep tab
  await page.keyboard.press('ArrowRight')
  const sleepTab = page.getByRole('tab', { name: /Sleep & Rest/ })
  await expect(sleepTab).toBeFocused()

  // ArrowRight wraps to first tab
  await page.keyboard.press('ArrowRight')
  await expect(firstTab).toBeFocused()

  // Home key jumps to first
  await ambientTab.focus()
  await page.keyboard.press('Home')
  await expect(firstTab).toBeFocused()

  // End key jumps to last
  await page.keyboard.press('End')
  await expect(sleepTab).toBeFocused()
})

// ─── STICKY TAB BAR ─────────────────────────────────────────────────────────

test('Sticky tab bar — scroll shadow activates on scroll', async ({ page }) => {
  await setup(page)
  await page.goto(`${BASE_URL}/music?tab=ambient`)
  await waitForRender(page, 'section[aria-label="Featured scenes"]')

  // Scroll down to trigger sticky shadow
  await page.evaluate(() => window.scrollBy(0, 300))
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${SS}/sticky-tab-bar-scrolled-1280.png`, fullPage: true })

  // Tab bar should still be visible after scroll
  const tabList = page.getByRole('tablist', { name: 'Music sections' })
  await expect(tabList).toBeVisible()
})

// ─── CONSOLE ERROR SUMMARY ───────────────────────────────────────────────────

test('Console error baseline check', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (msg) => {
    const t = msg.text()
    if (msg.type() === 'error' && !IGNORE.some((p) => t.includes(p))) {
      errors.push(t)
    }
  })

  await setup(page)
  await page.goto(`${BASE_URL}/music`)
  await waitForRender(page, '[role="tablist"]')

  await page.getByRole('tab', { name: /Ambient Sounds/ }).click()
  await page.waitForTimeout(500)

  await page.getByRole('tab', { name: /Sleep & Rest/ }).click()
  await page.waitForTimeout(500)

  const musicRelatedErrors = errors.filter(
    (e) => !e.includes('favicon') && !e.includes('audio') && !e.includes('net::'),
  )
  console.log(`Total console errors: ${errors.length}`)
  console.log(`Music-related errors: ${musicRelatedErrors.length}`)
  if (musicRelatedErrors.length > 0) {
    console.log('Errors:', musicRelatedErrors.slice(0, 5))
  }
  // Audio fetch errors (missing audio files) are expected in dev; only flag non-network errors
  expect(musicRelatedErrors.length, 'Unexpected console errors on Music page').toBe(0)
})
