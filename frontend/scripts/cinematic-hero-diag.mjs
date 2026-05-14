import { chromium } from '@playwright/test'

const URL = 'http://localhost:5173/daily'
const SCREENSHOTS_DIR = '/Users/Eric/worship-room/frontend/playwright-screenshots'

async function main() {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()

  const results = {}

  // Listen for console errors for diagnostic value
  const consoleMsgs = []
  page.on('console', (m) => {
    if (m.type() === 'error') consoleMsgs.push(m.text())
  })

  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 })
  // wait a moment for atmospheric layers/fonts to settle
  await page.waitForTimeout(800)

  // --- Section 3: DOM inspection ---
  results.scrollY = await page.evaluate(() => window.scrollY)
  results.viewport = await page.evaluate(() => ({
    w: window.innerWidth,
    h: window.innerHeight,
    dpr: window.devicePixelRatio,
  }))

  results.heroSection = await page.evaluate(() => {
    const el = document.querySelector('section[aria-labelledby="daily-hub-heading"]')
    if (!el) return { error: 'hero <section> not found' }
    const cs = getComputedStyle(el)
    const rect = el.getBoundingClientRect()
    return {
      className: el.className,
      rect: {
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left,
        right: rect.right,
        width: rect.width,
        height: rect.height,
      },
      computed: {
        backgroundColor: cs.backgroundColor,
        background: cs.background.slice(0, 200),
        overflow: cs.overflow,
        position: cs.position,
        zIndex: cs.zIndex,
        display: cs.display,
        flexDirection: cs.flexDirection,
        alignItems: cs.alignItems,
        justifyContent: cs.justifyContent,
        paddingTop: cs.paddingTop,
        paddingBottom: cs.paddingBottom,
        minHeight: cs.minHeight,
      },
      childrenCount: el.children.length,
      childrenTags: Array.from(el.children).map((c) => c.tagName + (c.className ? '.' + String(c.className).slice(0, 60).replace(/\s+/g, '.') : '')),
    }
  })

  results.heroFirstChild = await page.evaluate(() => {
    const el = document.querySelector('section[aria-labelledby="daily-hub-heading"]')
    if (!el || !el.children[0]) return { error: 'no first child' }
    const c = el.children[0]
    const cs = getComputedStyle(c)
    const rect = c.getBoundingClientRect()
    return {
      tag: c.tagName,
      className: String(c.className).slice(0, 200),
      rect: {
        top: rect.top,
        bottom: rect.bottom,
        height: rect.height,
        width: rect.width,
      },
      computed: {
        position: cs.position,
        backgroundColor: cs.backgroundColor,
        zIndex: cs.zIndex,
        height: cs.height,
        top: cs.top,
        inset: cs.inset,
        overflow: cs.overflow,
      },
      style: c.getAttribute('style'),
    }
  })

  // CinematicHeroBackground = the div with pointer-events-none + absolute inset-x-0 top-0 + style height calc(100% + 200px)
  results.cinematicBg = await page.evaluate(() => {
    const hero = document.querySelector('section[aria-labelledby="daily-hub-heading"]')
    if (!hero) return { error: 'no hero' }
    // find the cinematic background — it's the absolute positioned div with overflow-hidden + style height calc
    const candidates = Array.from(hero.querySelectorAll('div[aria-hidden="true"]'))
    const candidate = candidates.find((c) => {
      const s = c.getAttribute('style') || ''
      return s.includes('calc') && s.includes('200px')
    }) || candidates[0]
    if (!candidate) return { error: 'cinematic bg not found', heroAriaHiddenCount: candidates.length }
    const cs = getComputedStyle(candidate)
    const rect = candidate.getBoundingClientRect()
    return {
      className: candidate.className,
      style: candidate.getAttribute('style'),
      rect: {
        top: rect.top,
        bottom: rect.bottom,
        height: rect.height,
        width: rect.width,
      },
      computed: {
        position: cs.position,
        height: cs.height,
        width: cs.width,
        inset: cs.inset,
        top: cs.top,
        bottom: cs.bottom,
        backgroundColor: cs.backgroundColor,
        zIndex: cs.zIndex,
        overflow: cs.overflow,
        pointerEvents: cs.pointerEvents,
      },
      childCount: candidate.children.length,
    }
  })

  // Element immediately after the hero in DOM order (the sentinel div, then sticky tab bar wrapper)
  results.afterHero = await page.evaluate(() => {
    const hero = document.querySelector('section[aria-labelledby="daily-hub-heading"]')
    if (!hero) return { error: 'no hero' }
    const sib = hero.nextElementSibling
    if (!sib) return { error: 'no next sibling' }
    const cs = getComputedStyle(sib)
    const rect = sib.getBoundingClientRect()
    const out = {
      tag: sib.tagName,
      className: String(sib.className || '').slice(0, 200),
      ariaHidden: sib.getAttribute('aria-hidden'),
      rect: { top: rect.top, bottom: rect.bottom, height: rect.height, width: rect.width },
      computed: {
        position: cs.position,
        backgroundColor: cs.backgroundColor,
        marginTop: cs.marginTop,
        boxShadow: cs.boxShadow,
        zIndex: cs.zIndex,
        height: cs.height,
        backdropFilter: cs.backdropFilter,
      },
    }
    // also check the sibling AFTER that (the actual sticky tab bar wrapper)
    const sib2 = sib.nextElementSibling
    if (sib2) {
      const cs2 = getComputedStyle(sib2)
      const rect2 = sib2.getBoundingClientRect()
      out.afterAfter = {
        tag: sib2.tagName,
        className: String(sib2.className || '').slice(0, 200),
        rect: { top: rect2.top, bottom: rect2.bottom, height: rect2.height, width: rect2.width },
        computed: {
          position: cs2.position,
          backgroundColor: cs2.backgroundColor,
          marginTop: cs2.marginTop,
          boxShadow: cs2.boxShadow,
          zIndex: cs2.zIndex,
          backdropFilter: cs2.backdropFilter,
          top: cs2.top,
        },
      }
    }
    return out
  })

  // BackgroundCanvas root
  results.backgroundCanvas = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="background-canvas"]')
    if (!el) return { error: 'no background canvas' }
    const cs = getComputedStyle(el)
    const rect = el.getBoundingClientRect()
    return {
      className: el.className,
      rect: { top: rect.top, bottom: rect.bottom, height: rect.height, width: rect.width },
      computed: {
        position: cs.position,
        background: cs.background.slice(0, 400),
        backgroundColor: cs.backgroundColor,
        overflow: cs.overflow,
        minHeight: cs.minHeight,
      },
    }
  })

  // Greeting h1
  results.greeting = await page.evaluate(() => {
    const el = document.getElementById('daily-hub-heading')
    if (!el) return { error: 'no greeting' }
    const rect = el.getBoundingClientRect()
    const parent = el.parentElement
    const parentCS = parent ? getComputedStyle(parent) : null
    const parentRect = parent ? parent.getBoundingClientRect() : null
    return {
      text: el.textContent,
      className: String(el.className || '').slice(0, 200),
      rect: { top: rect.top, bottom: rect.bottom, height: rect.height, width: rect.width },
      parent: {
        tag: parent?.tagName,
        className: String(parent?.className || '').slice(0, 200),
        rect: parentRect ? { top: parentRect.top, bottom: parentRect.bottom, height: parentRect.height } : null,
        computed: parentCS ? {
          display: parentCS.display,
          flexDirection: parentCS.flexDirection,
          alignItems: parentCS.alignItems,
          justifyContent: parentCS.justifyContent,
          paddingTop: parentCS.paddingTop,
          paddingBottom: parentCS.paddingBottom,
          minHeight: parentCS.minHeight,
          height: parentCS.height,
        } : null,
      },
    }
  })

  // Pixel sampling at the seam — use html2canvas-style by reading screenshot pixels.
  // Take a screenshot, save it, then sample pixel colors via Sharp-less approach:
  // re-render the page region as a screenshot and read its bytes via a Node decoder.
  // Simpler: we just take the screenshot for visual reference and use page.evaluate to grab
  // computed background colors at three Y points by querying elementFromPoint.

  await page.screenshot({ path: `${SCREENSHOTS_DIR}/cinematic-hero-diagnostic-1280.png`, fullPage: false })

  // Pixel-color sampling via elementFromPoint + computed bg + a canvas-based
  // approach: paint document.body as image is not possible without html2canvas.
  // We approximate the "what's painted at Y" question by reading the topmost element
  // at three X,Y points and reporting their computed bg + position.
  results.elementsAtSeam = await page.evaluate(() => {
    const heroSection = document.querySelector('section[aria-labelledby="daily-hub-heading"]')
    if (!heroSection) return { error: 'no hero' }
    const heroRect = heroSection.getBoundingClientRect()
    const seamY = heroRect.bottom
    const xs = [320, 640, 960]
    const offsets = [-5, 0, +5]
    const samples = []
    for (const dy of offsets) {
      for (const x of xs) {
        const y = seamY + dy
        const el = document.elementFromPoint(x, y)
        if (!el) {
          samples.push({ x, y, dy, miss: true })
          continue
        }
        const cs = getComputedStyle(el)
        // walk up the chain to find the first element with a non-transparent backgroundColor
        let bgEl = el
        let bgColor = cs.backgroundColor
        while (bgEl && (bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'transparent')) {
          bgEl = bgEl.parentElement
          if (!bgEl) break
          bgColor = getComputedStyle(bgEl).backgroundColor
        }
        samples.push({
          x,
          y,
          dy,
          tag: el.tagName,
          className: String(el.className || '').slice(0, 100),
          ownBg: cs.backgroundColor,
          ownBgImage: cs.backgroundImage.slice(0, 200),
          firstOpaqueBgTag: bgEl?.tagName,
          firstOpaqueBgClass: bgEl ? String(bgEl.className || '').slice(0, 100) : null,
          firstOpaqueBgColor: bgColor,
        })
      }
    }
    return { seamY, samples }
  })

  // Now use puppeteer/playwright screenshot pixel reading via page.evaluate + canvas + drawImage of a snapshot? Not viable cross-origin.
  // Alternative: capture a screenshot of a 30px tall band at the seam and read its central column pixel via Node Buffer + PNG decoder.
  // Use sharp if available; otherwise PNG header has no easy decode in pure node.
  // Try sharp:
  let sharpAvailable = false
  let sharp
  try {
    sharp = (await import('sharp')).default
    sharpAvailable = true
  } catch {
    sharpAvailable = false
  }

  if (sharpAvailable) {
    const heroBottom = results.elementsAtSeam.seamY
    const yStart = Math.max(0, Math.floor(heroBottom - 30))
    const cropPath = `${SCREENSHOTS_DIR}/cinematic-hero-seam-band.png`
    await page.screenshot({
      path: cropPath,
      clip: { x: 0, y: yStart, width: 1280, height: 60 },
    })
    const img = sharp(cropPath)
    const { data, info } = await img.raw().toBuffer({ resolveWithObject: true })
    // info.width, info.height, info.channels
    const sample = (xPx, yPx) => {
      const idx = (yPx * info.width + xPx) * info.channels
      return [data[idx], data[idx + 1], data[idx + 2], info.channels >= 4 ? data[idx + 3] : 255]
    }
    // seam local Y in this crop = heroBottom - yStart
    const localSeamY = Math.floor(heroBottom - yStart)
    const samples = {
      meta: { width: info.width, height: info.height, channels: info.channels, yStart, heroBottom, localSeamY },
      points: [],
    }
    const xs = [320, 640, 960]
    for (const x of xs) {
      samples.points.push({
        x,
        above5: sample(x, Math.max(0, localSeamY - 5)),
        atSeam: sample(x, Math.min(info.height - 1, localSeamY)),
        below5: sample(x, Math.min(info.height - 1, localSeamY + 5)),
      })
    }
    results.pixelSamples = samples
  } else {
    results.pixelSamples = { sharpAvailable: false, note: 'sharp not installed; visual inspection only' }
  }

  // Save full-page screenshot as well
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/cinematic-hero-diagnostic-fullpage.png`, fullPage: true })

  // Console errors
  results.consoleErrors = consoleMsgs.slice(0, 20)

  console.log(JSON.stringify(results, null, 2))
  await browser.close()
}

main().catch((e) => {
  console.error('FATAL:', e)
  process.exit(1)
})
