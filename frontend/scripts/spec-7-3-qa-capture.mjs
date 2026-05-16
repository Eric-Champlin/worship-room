// Spec 7.3 — QA evidence capture v2 (Step 1 + Step 2 partial)
//
// v2: Force pillVisible=true by dispatching ADD_SOUND via the React context.
// The audio engine in headless Chromium can't actually play silent placeholder
// MP3s through Web Audio, so we need to inject state directly. We expose a
// dev-only test hook by attaching dispatch via window in AudioProvider — OR,
// since AudioProvider doesn't currently expose it, we use React DevTools fiber
// traversal to find the dispatch function and call it.
//
// Also corrects the scroll-to-pinned strategy: scroll JUST PAST the sentinel,
// not past the entire content. Sticky elements unstick when the parent's
// bottom edge passes the viewport, so we scroll just enough to fire the
// IntersectionObserver and pin the filter row at top=0.
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const BASE_URL = 'http://localhost:5173'
const SCREENSHOT_DIR = fileURLToPath(
  new URL('../playwright-screenshots', import.meta.url),
)

const VIEWPORTS = [
  { name: '375', width: 375, height: 667 },
  { name: '768', width: 768, height: 1024 },
  { name: '1366', width: 1366, height: 900 },
]

function fmtRect(rect) {
  if (!rect) return null
  return {
    top: Math.round(rect.top),
    bottom: Math.round(rect.bottom),
    left: Math.round(rect.left),
    right: Math.round(rect.right),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  }
}

// Force pillVisible by reaching into the React fiber tree and dispatching
// ADD_SOUND via the AudioDispatchContext value. The dispatch function is
// stored as the context's value field for the provider node.
async function forceAudioPillVisible(page) {
  return await page.evaluate(() => {
    // Strategy: walk every fiber from the root, identify any Provider node by
    // checking type.$$typeof === Symbol.for('react.provider') (React 18 shape),
    // and inspect the inner _context.displayName on the type._context. Collect
    // all context providers found so we can pick the one we need.
    const root = document.getElementById('root')
    if (!root) return { ok: false, reason: 'no #root' }
    const containerKey = Object.keys(root).find((k) =>
      k.startsWith('__reactContainer$'),
    )
    if (!containerKey) return { ok: false, reason: 'no react container key' }
    const fiberRoot = root[containerKey]
    // The container fiber tree starts at fiberRoot.stateNode.current or fiberRoot itself
    const startFiber = fiberRoot.stateNode?.current ?? fiberRoot.current ?? fiberRoot

    const providerSym = Symbol.for('react.provider')
    const providerTransitionalSym = Symbol.for('react.provider_module')
    const allProviders = []
    const allFiberTypes = new Set()

    function walk(fiber, depth = 0) {
      if (!fiber || depth > 200) return
      const type = fiber.type
      if (type) {
        // Track all type names we see for diagnostics
        const tn =
          type.displayName ||
          type.name ||
          (typeof type === 'object'
            ? type.$$typeof?.toString?.() ?? 'object'
            : typeof type)
        allFiberTypes.add(tn)
      }
      if (type && (type.$$typeof === providerSym || type.$$typeof === providerTransitionalSym)) {
        const ctx = type._context
        if (ctx) {
          allProviders.push({
            displayName: ctx.displayName ?? '(no displayName)',
            currentValue: ctx._currentValue,
            propsValue: fiber.memoizedProps?.value ?? fiber.pendingProps?.value,
          })
        }
      }
      // Also check for ContextProvider per ReactInternals (alternate path)
      if (fiber.elementType?._context?.displayName === 'AudioDispatchContext') {
        allProviders.push({
          displayName: 'AudioDispatchContext (via elementType)',
          currentValue: fiber.elementType._context._currentValue,
          propsValue: fiber.memoizedProps?.value,
        })
      }
      walk(fiber.child, depth + 1)
      walk(fiber.sibling, depth + 1)
    }

    try {
      walk(startFiber)
    } catch (e) {
      return { ok: false, reason: 'walk error: ' + e.message }
    }

    // Try every provider whose memoized value is a function. The audioReducer
    // is pure and ignores unknown actions, so calling other dispatches with
    // ADD_SOUND is safe (they will no-op). The first one that flips pillVisible
    // wins.
    const candidates = allProviders.filter(
      (p) =>
        typeof p.propsValue === 'function' || typeof p.currentValue === 'function',
    )
    let invokedCount = 0
    const errors = []
    for (const c of candidates) {
      const dispatch = c.propsValue ?? c.currentValue
      if (typeof dispatch !== 'function') continue
      try {
        dispatch({
          type: 'ADD_SOUND',
          payload: {
            soundId: `spec-7-3-test-${invokedCount}`,
            volume: 0.5,
            label: 'Spec 7.3 Test Sound',
            url: '/audio/placeholder.mp3',
          },
        })
        invokedCount++
      } catch (err) {
        errors.push(`${c.displayName}: ${err.message}`)
      }
    }
    return {
      ok: invokedCount > 0,
      invokedCount,
      candidateCount: candidates.length,
      errorsSample: errors.slice(0, 5),
    }
  })
}

async function inspectAudioPill(page) {
  return await page.evaluate(() => {
    const nowPlaying = document.querySelector('[aria-label="Audio player"]')
    const routineShortcut = document.querySelector(
      '[aria-label="Routine shortcut"]',
    )
    const pill = nowPlaying ?? routineShortcut
    if (!pill) return { present: false }
    const rect = pill.getBoundingClientRect()
    const cs = getComputedStyle(pill)
    return {
      present: true,
      variant: nowPlaying ? 'now-playing' : 'routine-shortcut',
      ariaLabel: pill.getAttribute('aria-label'),
      className: pill.className,
      computedPosition: cs.position,
      computedBottom: cs.bottom,
      computedZIndex: cs.zIndex,
      rect: {
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left,
        right: rect.right,
        width: rect.width,
        height: rect.height,
      },
    }
  })
}

async function inspectStickyFilter(page) {
  return await page.evaluate(() => {
    const stickyDiv = document.querySelector('.xl\\:hidden .sticky')
    if (!stickyDiv) return { present: false, reason: 'sticky filter not in DOM at this viewport' }
    const rect = stickyDiv.getBoundingClientRect()
    const wrapper = stickyDiv.closest('.xl\\:hidden')
    const wrapperRect = wrapper.getBoundingClientRect()
    const display = getComputedStyle(wrapper).display
    return {
      present: display !== 'none',
      display,
      wrapperRect: {
        top: wrapperRect.top,
        bottom: wrapperRect.bottom,
        height: wrapperRect.height,
      },
      rect: {
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left,
        right: rect.right,
        width: rect.width,
        height: rect.height,
      },
    }
  })
}

async function scrollUntilFilterPins(page) {
  // Scroll incrementally until the sentinel exits the viewport (which sets
  // isFilterSticky=true). The sentinel is rendered before the sticky filter
  // in the same wrapper.
  const result = await page.evaluate(async () => {
    // Find the sentinel: it's an aria-hidden div immediately preceding the sticky.
    const stickyDiv = document.querySelector('.xl\\:hidden .sticky')
    if (!stickyDiv) return { scrolled: 0, reason: 'no sticky element' }
    const stickyTop = stickyDiv.getBoundingClientRect().top + window.scrollY
    // Scroll to just past where the sticky would naturally sit, so it pins to top=0.
    const target = Math.max(0, stickyTop + 50)
    window.scrollTo({ top: target, behavior: 'instant' })
    await new Promise((r) => setTimeout(r, 450))
    return {
      scrolled: window.scrollY,
      stickyTop,
      target,
    }
  })
  return result
}

async function captureViewport(page, viewport) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height })
  await page.waitForTimeout(300)
  await page.goto(`${BASE_URL}/prayer-wall`, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(700)

  // AudioPill should already be visible because startRealAudio() ran before.
  // Keep forceAudioPillVisible as backup if pill not present.
  let forceResult = { ok: 'skipped — pill already visible (via startRealAudio)' }
  const pillCheckBeforeForce = await page.evaluate(() =>
    !!(document.querySelector('[aria-label="Audio player"]') ??
       document.querySelector('[aria-label="Routine shortcut"]'))
  )
  if (!pillCheckBeforeForce) {
    forceResult = await forceAudioPillVisible(page)
  }
  await page.waitForTimeout(400)

  // Then scroll until the filter row pins.
  const scrollInfo = await scrollUntilFilterPins(page)

  const audioPill = await inspectAudioPill(page)
  const stickyFilter = await inspectStickyFilter(page)

  const screenshotPath = `${SCREENSHOT_DIR}/spec-7-3-qa5-${viewport.name}.png`
  await page.screenshot({ path: screenshotPath, fullPage: false })

  // Compute geometric overlap if both elements are present.
  let overlap = null
  if (audioPill.present && stickyFilter.present) {
    const pillTop = audioPill.rect.top
    const filterBottom = stickyFilter.rect.bottom
    const gap = pillTop - filterBottom
    overlap = {
      audioPillTop: Math.round(pillTop),
      audioPillBottom: Math.round(audioPill.rect.bottom),
      stickyFilterTop: Math.round(stickyFilter.rect.top),
      stickyFilterBottom: Math.round(filterBottom),
      verticalGapPx: Math.round(gap),
      overlapping: gap < 0,
    }
  } else if (!stickyFilter.present) {
    overlap = { note: 'sticky filter row not rendered (xl:hidden — desktop xl+)' }
  } else if (!audioPill.present) {
    overlap = {
      note: 'AudioPill not in DOM (dispatch injection failed)',
      forceResult,
      stickyFilterRect: stickyFilter.rect,
    }
  }

  return {
    viewport: viewport.name,
    screenshot: screenshotPath,
    forceAudioResult: forceResult,
    scrollInfo,
    audioPill,
    stickyFilter,
    overlap,
  }
}

async function exerciseQAFlow(page) {
  // QA-1..QA-4 — navigate through Prayer Wall routes; force AudioPill via
  // dispatch injection on each route since the audio engine cannot actually
  // play files in headless Chromium.
  const routes = [
    { name: 'QA-1: /prayer-wall (mock Music → PrayerWall)', url: '/prayer-wall' },
    { name: 'QA-2: /prayer-wall/:id (detail)', url: '/prayer-wall/1' },
    { name: 'QA-3: /prayer-wall (back to feed)', url: '/prayer-wall' },
    { name: 'QA-4a: /prayer-wall/dashboard (auth-gated → redirect)', url: '/prayer-wall/dashboard' },
    { name: 'QA-4b: /prayer-wall/user/:id', url: '/prayer-wall/user/1' },
  ]

  const results = []

  for (const route of routes) {
    await page.goto(`${BASE_URL}${route.url}`, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(500)
    // Force AudioPill via dispatch on each page mount to simulate "audio
    // playing from a prior session." In production, AudioProvider state
    // persists across routes naturally; in headless we re-inject because
    // audio engine can't load placeholder MP3s.
    const force = await forceAudioPillVisible(page)
    await page.waitForTimeout(400)
    const audioPill = await inspectAudioPill(page)
    results.push({
      step: route.name,
      requestedUrl: route.url,
      finalUrl: page.url(),
      forceDispatchCount: force.invokedCount,
      audioPillPresent: audioPill.present,
      audioPillVariant: audioPill.variant ?? null,
      audioPillRect: audioPill.rect ? fmtRect(audioPill.rect) : null,
    })
  }
  return results
}

async function exerciseDrawerToggle(page) {
  await page.setViewportSize({ width: 768, height: 1024 })
  await page.goto(`${BASE_URL}/prayer-wall`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  // Force ONE clean dispatch on the AudioDispatchContext only (find the one
  // whose function name matches enhancedDispatch shape). The 21-dispatch hack
  // from forceAudioPillVisible() leaves the AudioPill in an animating state
  // that breaks Playwright's stability check.
  await page.evaluate(() => {
    const root = document.getElementById('root')
    const containerKey = Object.keys(root).find((k) => k.startsWith('__reactContainer$'))
    const fiberRoot = root[containerKey]
    const startFiber = fiberRoot.stateNode?.current ?? fiberRoot.current ?? fiberRoot
    const providerSym = Symbol.for('react.provider')
    function walk(fiber, found = [], depth = 0) {
      if (!fiber || depth > 200) return found
      if (fiber.type?.$$typeof === providerSym) {
        const value = fiber.memoizedProps?.value ?? fiber.pendingProps?.value
        if (typeof value === 'function') found.push(value)
      }
      walk(fiber.child, found, depth + 1)
      walk(fiber.sibling, found, depth + 1)
      return found
    }
    const dispatches = walk(startFiber)
    // Fire ADD_SOUND on each; audioReducer accepts it, others ignore unknown action types
    for (const d of dispatches) {
      try {
        d({ type: 'ADD_SOUND', payload: { soundId: 'qa6', volume: 0.5, label: 'QA6', url: '/x' } })
      } catch {
        // Non-audio dispatch contexts may throw on unknown action types — that's fine, keep iterating.
      }
    }
  })
  await page.waitForTimeout(600)

  await page.evaluate(() => window.scrollTo({ top: 400, behavior: 'instant' }))
  await page.waitForTimeout(400)
  const scrollBefore = await page.evaluate(() => window.scrollY)

  const pillOpenBtn = page.locator('[aria-label="Open audio controls"]').first()
  let openResult = null
  let scrollAfterOpen = null
  let scrollAfterClose = null
  let drawerVisible = null
  let closeResult = null

  if ((await pillOpenBtn.count()) > 0) {
    try {
      await pillOpenBtn.click({ timeout: 5000, force: true })
      await page.waitForTimeout(700)
      openResult = 'clicked'
      scrollAfterOpen = await page.evaluate(() => window.scrollY)

      const drawerCheck = await page.evaluate(() => {
        const dialog = document.querySelector('[role="dialog"]')
        const ariaModal = document.querySelector('[aria-modal="true"]')
        // AudioDrawer renders with various selectors; check all.
        const drawerEl = document.querySelector('[data-testid="audio-drawer"]') ??
          document.querySelector('.audio-drawer') ??
          dialog ?? ariaModal
        return {
          dialogFound: !!dialog,
          ariaModalFound: !!ariaModal,
          drawerFound: !!drawerEl,
          dialogLabel: dialog?.getAttribute('aria-label') ?? null,
          ariaModalLabel: ariaModal?.getAttribute('aria-label') ?? null,
        }
      })
      drawerVisible = drawerCheck

      await page.keyboard.press('Escape')
      await page.waitForTimeout(500)
      closeResult = 'escape pressed'
      scrollAfterClose = await page.evaluate(() => window.scrollY)
    } catch (err) {
      openResult = `click failed: ${err.message.slice(0, 200)}`
    }
  } else {
    openResult = 'AudioPill not in DOM — dispatch injection failed'
  }

  return {
    scrollBefore,
    openResult,
    scrollAfterOpen,
    drawerVisibleAfterOpen: drawerVisible,
    closeResult,
    scrollAfterClose,
    scrollPreserved:
      scrollAfterClose !== null && Math.abs(scrollAfterClose - scrollBefore) < 5,
  }
}

async function startRealAudio(page) {
  // Navigate to /music and click a real "Play <name>" button. The sound engine
  // will try to load /audio/<id>.mp3 — even if the file is silent/placeholder,
  // engine.addSound() should resolve and useSoundToggle dispatches ADD_SOUND.
  await page.goto(`${BASE_URL}/music`, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(800)

  // Try the Ambient Sounds tab (sound cards are there).
  const ambientTab = page.locator('button[role="tab"]', { hasText: 'Ambient Sounds' }).first()
  if ((await ambientTab.count()) > 0) {
    try {
      await ambientTab.click({ timeout: 2000 })
      await page.waitForTimeout(600)
    } catch {
      // Tab click is best-effort; if it fails, the next selector will still find a Play button on the active tab.
    }
  }

  // Click any "Play <name>" button.
  const playBtn = page.locator('button[aria-label^="Play "]').first()
  const count = await playBtn.count()
  if (count === 0) {
    return { attempted: false, reason: 'no Play button found' }
  }
  const label = await playBtn.getAttribute('aria-label')
  try {
    await playBtn.click({ timeout: 3000 })
  } catch (err) {
    return { attempted: true, clicked: false, reason: err.message }
  }
  await page.waitForTimeout(1500)

  // Verify AudioPill rendered.
  const pillCheck = await page.evaluate(() => {
    const pill = document.querySelector('[aria-label="Audio player"]') ??
      document.querySelector('[aria-label="Routine shortcut"]')
    return {
      pillPresent: !!pill,
      pillAriaLabel: pill?.getAttribute('aria-label') ?? null,
    }
  })
  return { attempted: true, clicked: true, clickedLabel: label, ...pillCheck }
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--autoplay-policy=no-user-gesture-required',
      '--use-fake-ui-for-media-stream',
      '--disable-features=AudioServiceOutOfProcess',
    ],
  })
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } })
  const page = await ctx.newPage()

  const consoleErrors = []
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text())
  })
  page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`))

  const report = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    startAudio: null,
    viewportCaptures: [],
    navigationFlow: null,
    drawerToggle: null,
    consoleErrors: [],
  }

  // Start real audio on /music before viewport captures so AudioPill is visible.
  report.startAudio = await startRealAudio(page)

  for (const v of VIEWPORTS) {
    const capture = await captureViewport(page, v)
    report.viewportCaptures.push(capture)
  }

  await page.setViewportSize({ width: 768, height: 1024 })
  report.navigationFlow = await exerciseQAFlow(page)
  report.drawerToggle = await exerciseDrawerToggle(page)

  report.consoleErrors = consoleErrors.slice(0, 20)

  await browser.close()

  console.log(JSON.stringify(report, null, 2))
}

main().catch((err) => {
  console.error('FATAL', err)
  process.exit(1)
})
