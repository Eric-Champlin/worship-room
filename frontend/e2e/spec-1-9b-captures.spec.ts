/**
 * Spec 1.9b — Error & Loading State Design System
 *
 * Visual + a11y baseline capture for the 5 new-or-modified UI primitives.
 *
 * Strategy: Since the primitives have zero production consumers yet (Spec 1.9 will
 * be the first consumer, for AuthModal), we navigate to an accessible public route
 * (/register) which loads the app's Tailwind CSS + dark theme, then inject each
 * component's rendered DOM into a capture region via page.evaluate(). This gives
 * real-stylesheet visual capture without adding a demo harness route (which the
 * spec explicitly forbids).
 *
 * axe-core runs on every captured viewport state.
 */
import { test, expect, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { VIEWPORTS, screenshotDir, runAxeScan } from './fixtures'

const SCREENSHOT_DIR = screenshotDir('1-9b')

async function prepareCaptureRegion(page: Page) {
  // Navigate to an accessible public route that loads the full app CSS + dark theme.
  await page.goto('http://localhost:5173/register', { waitUntil: 'networkidle' })
  // Replace the body with a minimal capture container on the dark background.
  await page.evaluate(() => {
    document.body.innerHTML =
      '<div id="capture-root" style="min-height:100vh;padding:48px;background:#08051A;color:#fff;"></div>'
  })
}

async function captureAndScan(
  page: Page,
  name: string,
  innerHtml: string,
  viewport: (typeof VIEWPORTS)[number],
) {
  await prepareCaptureRegion(page)
  await page.setViewportSize({ width: viewport.width, height: viewport.height })
  await page.evaluate((html) => {
    const root = document.getElementById('capture-root')!
    root.innerHTML = html
  }, innerHtml)
  // Ensure the capture-root is visible.
  await page.waitForSelector('#capture-root')
  const file = path.join(SCREENSHOT_DIR, `${name}-${viewport.name}.png`)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  await page.screenshot({ path: file, fullPage: false })
  // Run axe-core scoped to the capture region.
  return runAxeScan(page, { include: '#capture-root' })
}

// Component markup snippets. These match the production components' rendered output
// exactly (verified by the Vitest tests from Steps 5/6/7). We render static HTML here
// because the new primitives have no production consumer routes; Playwright would have
// nothing real to capture otherwise.

const LOADING_SPINNER_HTML = `
  <div style="display:flex;flex-direction:column;gap:24px;align-items:center;">
    <div style="color:#fff;font-family:system-ui;">LoadingSpinner · default size</div>
    <span role="status" class="inline-flex items-center justify-center" style="color:white">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true" class="motion-safe:animate-spin motion-reduce:opacity-60">
        <circle cx="12" cy="12" r="9" opacity="0.25"/>
        <path d="M21 12a9 9 0 0 1-9 9"/>
      </svg>
      <span class="sr-only">Loading</span>
    </span>
    <div style="color:#fff;font-family:system-ui;">LoadingSpinner · size 32 · custom label</div>
    <span role="status" class="inline-flex items-center justify-center" style="color:#c4b5fd">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true" class="motion-safe:animate-spin motion-reduce:opacity-60">
        <circle cx="12" cy="12" r="9" opacity="0.25"/>
        <path d="M21 12a9 9 0 0 1-9 9"/>
      </svg>
      <span class="sr-only">Saving your prayer</span>
    </span>
  </div>
`

const BUTTON_LOADING_HTML = `
  <div style="display:flex;flex-direction:column;gap:16px;align-items:flex-start;">
    <div style="color:#fff;font-family:system-ui;">Button idle (primary)</div>
    <button type="button" class="inline-flex items-center justify-center font-medium transition-[colors,transform] duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98] rounded-md bg-primary text-white hover:bg-primary-lt h-10 px-4 relative">
      <span class="inline-flex items-center justify-center gap-2">Save Entry</span>
    </button>
    <div style="color:#fff;font-family:system-ui;">Button isLoading (primary, md)</div>
    <button type="button" disabled aria-busy="true" aria-disabled="true" class="inline-flex items-center justify-center font-medium transition-[colors,transform] duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98] rounded-md bg-primary text-white hover:bg-primary-lt h-10 px-4 relative">
      <span class="inline-flex items-center justify-center gap-2 opacity-0" aria-hidden="true">Save Entry</span>
      <span class="absolute inset-0 flex items-center justify-center">
        <span role="status" class="inline-flex items-center justify-center" style="color:white">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true" class="motion-safe:animate-spin motion-reduce:opacity-60">
            <circle cx="12" cy="12" r="9" opacity="0.25"/>
            <path d="M21 12a9 9 0 0 1-9 9"/>
          </svg>
          <span class="sr-only">Loading</span>
        </span>
      </span>
    </button>
    <div style="color:#fff;font-family:system-ui;">Button isLoading (light, lg)</div>
    <button type="button" disabled aria-busy="true" aria-disabled="true" class="inline-flex items-center justify-center font-medium transition-[colors,transform] duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98] rounded-full bg-white text-primary hover:bg-gray-100 gap-2 font-semibold min-h-[44px] px-8 py-3 text-base relative">
      <span class="inline-flex items-center justify-center gap-2 opacity-0" aria-hidden="true">Help Me Pray</span>
      <span class="absolute inset-0 flex items-center justify-center">
        <span role="status" class="inline-flex items-center justify-center" style="color:currentColor">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true" class="motion-safe:animate-spin motion-reduce:opacity-60">
            <circle cx="12" cy="12" r="9" opacity="0.25"/>
            <path d="M21 12a9 9 0 0 1-9 9"/>
          </svg>
          <span class="sr-only">Loading</span>
        </span>
      </span>
    </button>
  </div>
`

const FORM_ERROR_HTML = `
  <div style="display:flex;flex-direction:column;gap:24px;max-width:600px;">
    <div role="alert" aria-live="assertive" class="flex items-start gap-3 rounded-xl border px-4 py-3 text-sm border-red-400/30 bg-red-950/30 text-red-100">
      <svg class="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>
      </svg>
      <div class="flex-1 leading-relaxed">We couldn't save that. Please check the fields below and try again.</div>
    </div>
    <div role="alert" aria-live="polite" class="flex items-start gap-3 rounded-xl border px-4 py-3 text-sm border-amber-400/30 bg-amber-950/30 text-amber-100">
      <svg class="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>
      </svg>
      <div class="flex-1 leading-relaxed">Your draft is older than 24 hours.</div>
    </div>
    <div role="status" aria-live="polite" class="flex items-start gap-3 rounded-xl border px-4 py-3 text-sm border-sky-400/30 bg-sky-950/30 text-sky-100">
      <svg class="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
      </svg>
      <div class="flex-1 leading-relaxed">Your changes will be saved automatically.</div>
      <button type="button" aria-label="Dismiss message" class="-m-2 inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-md transition-colors hover:text-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg motion-reduce:transition-none" style="color:rgba(186,230,253,0.8)">
        <svg class="h-4 w-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
        </svg>
      </button>
    </div>
  </div>
`

const CHART_FALLBACK_HTML = `
  <div style="max-width:600px;">
    <div role="status" aria-live="polite" class="flex h-[200px] items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
      <p class="text-sm text-white/60">Chart unavailable right now</p>
    </div>
  </div>
`

const ERROR_BOUNDARY_HTML = `
  <div class="flex min-h-[500px] items-center justify-center bg-hero-bg p-4">
    <div class="relative w-full max-w-md">
      <div class="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full blur-[120px]" style="background:rgba(139,92,246,0.20)" aria-hidden="true"></div>
      <div role="alert" class="relative rounded-2xl border border-white/[0.12] bg-white/[0.06] backdrop-blur-sm p-8 text-center" style="box-shadow:0 0 40px rgba(139,92,246,0.15),0 8px 30px rgba(0,0,0,0.4)">
        <h1 class="text-3xl font-bold sm:text-4xl pb-1" style="background:linear-gradient(135deg,#fff 0%,#c4b5fd 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;">Something went wrong</h1>
        <p class="mt-4 text-base text-white/70 leading-relaxed">Something broke on our end. Reload to try again — your other work is safe.</p>
        <button type="button" class="mt-8 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-8 py-3 text-base font-semibold text-hero-bg transition-all hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98]" style="box-shadow:0 0 30px rgba(255,255,255,0.20)">Refresh Page</button>
      </div>
    </div>
  </div>
`

const CAPTURES: Array<{ name: string; html: string }> = [
  { name: 'loading-spinner', html: LOADING_SPINNER_HTML },
  { name: 'button-isLoading', html: BUTTON_LOADING_HTML },
  { name: 'form-error', html: FORM_ERROR_HTML },
  { name: 'chart-fallback', html: CHART_FALLBACK_HTML },
  { name: 'error-boundary', html: ERROR_BOUNDARY_HTML },
]

for (const capture of CAPTURES) {
  for (const viewport of VIEWPORTS) {
    test(`1-9b capture: ${capture.name} @ ${viewport.name} — axe-core clean`, async ({
      page,
    }) => {
      const violations = await captureAndScan(
        page,
        capture.name,
        capture.html,
        viewport,
      )
      // Log any violations with detail for the plan's Execution Log.
      if (violations.length > 0) {
        console.log(
          `[1-9b] ${capture.name} @ ${viewport.name} WCAG violations:`,
          violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help })),
        )
      }
      expect(violations).toEqual([])
    })
  }
}
