/**
 * Runtime verification for the Local Support facelift.
 * - Navigates to /local-support/churches|counselors|celebrate-recovery at
 *   375px / 768px / 1440px.
 * - Captures computed styles on hero h1, subtitle, glow orbs, white-pill CTAs,
 *   tab row, listing card phone/address/photo/Get-Directions.
 * - Screenshots each route at each breakpoint.
 * - Verifies boundingBox().y alignment for inline rows where the plan
 *   documents expectations.
 *
 * Exits non-zero on any mismatch.
 */
import { chromium } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const BASE_URL = 'http://localhost:5173'
const OUT_DIR = 'playwright-screenshots/local-support-facelift'
const ROUTES = [
  { name: 'churches', path: '/local-support/churches' },
  { name: 'counselors', path: '/local-support/counselors' },
  { name: 'celebrate-recovery', path: '/local-support/celebrate-recovery' },
]
const BREAKPOINTS = [
  { label: 'mobile', width: 375, height: 800 },
  { label: 'tablet', width: 768, height: 1024 },
  { label: 'desktop', width: 1440, height: 900 },
]

fs.mkdirSync(OUT_DIR, { recursive: true })

const failures = []
const pass = (msg) => console.log('✓', msg)
const fail = (msg) => { failures.push(msg); console.log('✗', msg) }

const browser = await chromium.launch({ headless: true })
try {
  for (const route of ROUTES) {
    for (const bp of BREAKPOINTS) {
      const context = await browser.newContext({ viewport: { width: bp.width, height: bp.height } })
      const page = await context.newPage()
      await page.goto(`${BASE_URL}${route.path}`, { waitUntil: 'networkidle' })

      // Hero h1
      const h1 = await page.locator('h1').first()
      await h1.waitFor({ state: 'visible', timeout: 5000 })
      const h1Style = await h1.evaluate((el) => {
        const cs = window.getComputedStyle(el)
        return {
          backgroundClip: cs.backgroundClip || cs.webkitBackgroundClip,
          textFillColor: cs.webkitTextFillColor,
          fontFamily: cs.fontFamily,
        }
      })
      if ((h1Style.backgroundClip || '').includes('text') || (h1Style.textFillColor || '').includes('rgba(0, 0, 0, 0)') || (h1Style.textFillColor || '').includes('transparent')) {
        pass(`[${route.name}/${bp.label}] h1 has gradient text (background-clip or transparent fill)`)
      } else {
        fail(`[${route.name}/${bp.label}] h1 missing gradient: clip=${h1Style.backgroundClip} fill=${h1Style.textFillColor}`)
      }

      // No font-script descendant
      const scriptCount = await page.locator('h1 .font-script').count()
      if (scriptCount === 0) pass(`[${route.name}/${bp.label}] no .font-script in h1`)
      else fail(`[${route.name}/${bp.label}] h1 has ${scriptCount} font-script descendant(s)`)

      // Subtitle — white, non-italic, Inter
      const subtitle = await page.locator('section p').first()
      const subStyle = await subtitle.evaluate((el) => {
        const cs = window.getComputedStyle(el)
        return {
          color: cs.color,
          fontStyle: cs.fontStyle,
          fontFamily: cs.fontFamily,
        }
      })
      if (subStyle.color === 'rgb(255, 255, 255)') pass(`[${route.name}/${bp.label}] subtitle is rgb(255,255,255)`)
      else fail(`[${route.name}/${bp.label}] subtitle color is ${subStyle.color}, expected rgb(255, 255, 255)`)
      if (subStyle.fontStyle === 'normal') pass(`[${route.name}/${bp.label}] subtitle fontStyle=normal`)
      else fail(`[${route.name}/${bp.label}] subtitle fontStyle=${subStyle.fontStyle}`)
      if (/inter/i.test(subStyle.fontFamily)) pass(`[${route.name}/${bp.label}] subtitle fontFamily contains Inter`)
      else fail(`[${route.name}/${bp.label}] subtitle fontFamily=${subStyle.fontFamily}`)

      // Glow orbs
      const orbCount = await page.locator('[data-testid="glow-orb"]').count()
      if (orbCount === 2) pass(`[${route.name}/${bp.label}] 2 glow orbs present`)
      else fail(`[${route.name}/${bp.label}] expected 2 glow orbs, got ${orbCount}`)

      // Use My Location button — canonical white pill
      const useLocBtn = page.getByRole('button', { name: 'Use my current location' })
      await useLocBtn.waitFor({ state: 'visible', timeout: 3000 })
      const useLocStyle = await useLocBtn.evaluate((el) => {
        const cs = window.getComputedStyle(el)
        return {
          backgroundColor: cs.backgroundColor,
          color: cs.color,
          borderRadius: cs.borderRadius,
          boxShadow: cs.boxShadow,
        }
      })
      if (useLocStyle.backgroundColor === 'rgb(255, 255, 255)') pass(`[${route.name}/${bp.label}] Use My Location bg=white`)
      else fail(`[${route.name}/${bp.label}] Use My Location bg=${useLocStyle.backgroundColor}`)
      if (useLocStyle.color === 'rgb(109, 40, 217)') pass(`[${route.name}/${bp.label}] Use My Location text-primary`)
      else fail(`[${route.name}/${bp.label}] Use My Location text=${useLocStyle.color}`)
      if (useLocStyle.borderRadius === '9999px') pass(`[${route.name}/${bp.label}] Use My Location rounded-full`)
      else fail(`[${route.name}/${bp.label}] Use My Location borderRadius=${useLocStyle.borderRadius}`)
      if ((useLocStyle.boxShadow || '').includes('rgba(255, 255, 255, 0.15)')) pass(`[${route.name}/${bp.label}] Use My Location has glow`)
      else fail(`[${route.name}/${bp.label}] Use My Location boxShadow=${useLocStyle.boxShadow}`)

      // Active Search Results tab is a white pill
      const activeTab = page.getByRole('tab', { name: /Search Results/ })
      const tabStyle = await activeTab.evaluate((el) => {
        const cs = window.getComputedStyle(el)
        return {
          backgroundColor: cs.backgroundColor,
          color: cs.color,
          borderRadius: cs.borderRadius,
        }
      })
      if (tabStyle.backgroundColor === 'rgb(255, 255, 255)') pass(`[${route.name}/${bp.label}] Active tab bg=white`)
      else fail(`[${route.name}/${bp.label}] Active tab bg=${tabStyle.backgroundColor}`)
      if (tabStyle.color === 'rgb(109, 40, 217)') pass(`[${route.name}/${bp.label}] Active tab text-primary`)
      else fail(`[${route.name}/${bp.label}] Active tab text=${tabStyle.color}`)

      // Listing card address + phone (mock data is present for logged-out users)
      const addressP = page.locator('p').filter({ hasText: /Columbia|Nashville|TN/ }).first()
      const addrCount = await addressP.count()
      if (addrCount > 0) {
        const addrColor = await addressP.evaluate((el) => window.getComputedStyle(el).color)
        if (addrColor === 'rgb(255, 255, 255)') pass(`[${route.name}/${bp.label}] Address color=white`)
        else fail(`[${route.name}/${bp.label}] Address color=${addrColor}`)
      }

      // Photo wrapper visible at all breakpoints (pick a VISIBLE article —
      // LocalSupportPage mounts cards twice at < lg for the mobile list/map
      // toggle, so the first article is inside the hidden lg:grid wrapper)
      const photoCheck = await page.evaluate(() => {
        const articles = Array.from(document.querySelectorAll('article'))
        const visible = articles.find((a) => a.getBoundingClientRect().width > 0)
        if (!visible) return { status: 'no-visible-article' }
        const photo = visible.querySelector(':scope > div > div.shrink-0')
        if (!photo) return { status: 'no-photo-wrapper' }
        // Photo wrapper sizes to its child; check the child's box
        const child = photo.firstElementChild
        if (!child) return { status: 'no-photo-child' }
        const rect = child.getBoundingClientRect()
        return {
          status: 'ok',
          childWidth: rect.width,
          childHeight: rect.height,
          childClass: child.className,
        }
      })
      if (photoCheck.status === 'ok' && photoCheck.childWidth > 0 && photoCheck.childHeight > 0) {
        pass(`[${route.name}/${bp.label}] Photo wrapper visible (${photoCheck.childWidth}×${photoCheck.childHeight})`)
      } else {
        fail(`[${route.name}/${bp.label}] Photo wrapper check failed: ${JSON.stringify(photoCheck)}`)
      }

      // Inline y-alignment: at ≥ 640px, Use My Location, input, Search should share y
      if (bp.width >= 640) {
        const form = page.locator('form').first()
        const formBox = await form.boundingBox()
        if (formBox) {
          const ys = await form.evaluate((el) => {
            const kids = Array.from(el.querySelectorAll(':scope > button, :scope > div > button, :scope > div'))
            return kids.filter((k) => k instanceof HTMLElement).map((k) => (k).getBoundingClientRect().y)
          })
          const maxY = Math.max(...ys)
          const minY = Math.min(...ys)
          if (maxY - minY <= 5) pass(`[${route.name}/${bp.label}] Search controls inline y alignment (Δ=${(maxY - minY).toFixed(1)}px)`)
          else fail(`[${route.name}/${bp.label}] Search controls wrapped: Δ=${(maxY - minY).toFixed(1)}px`)
        }
      }

      // Screenshot
      const shotPath = path.join(OUT_DIR, `${route.name}-${bp.label}.png`)
      await page.screenshot({ path: shotPath, fullPage: false })
      pass(`[${route.name}/${bp.label}] screenshot saved → ${shotPath}`)

      await context.close()
    }
  }

  // Emulated reduced-motion check
  const ctxRm = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
  })
  const pageRm = await ctxRm.newPage()
  await pageRm.goto(`${BASE_URL}/local-support/churches`, { waitUntil: 'networkidle' })
  const rmOrbAnim = await pageRm.locator('[data-testid="glow-orb"]').first().evaluate((el) => {
    const cs = window.getComputedStyle(el)
    return { animationName: cs.animationName, animationDuration: cs.animationDuration }
  })
  // Global CSS rule sets animation-duration to 0.01ms under reduced-motion
  if (rmOrbAnim.animationDuration === '0.01ms' || rmOrbAnim.animationName === 'none') {
    pass(`[reduced-motion] glow orb animation-duration=${rmOrbAnim.animationDuration} name=${rmOrbAnim.animationName}`)
  } else {
    fail(`[reduced-motion] orb still animates: ${JSON.stringify(rmOrbAnim)}`)
  }
  await ctxRm.close()
} finally {
  await browser.close()
}

if (failures.length > 0) {
  console.log(`\n❌ ${failures.length} failure(s):`)
  failures.forEach((f) => console.log('  -', f))
  process.exit(1)
} else {
  console.log('\n✅ All checks passed')
}
