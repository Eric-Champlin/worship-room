import { chromium } from '@playwright/test'

const BASE = 'http://localhost:5173'
const OUT = 'playwright-screenshots'

const browser = await chromium.launch({ headless: true })

async function captureConfirmDialog(viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: viewport.deviceScaleFactor,
  })
  const page = await context.newPage()

  // Use a public dark route as backdrop, then inject the dialog with the actual
  // production classes so we can visually verify the canonical frosted treatment
  // against the same hero-mid surface the real dialog renders on.
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })

  await page.evaluate(() => {
    const overlay = document.createElement('div')
    overlay.style.position = 'fixed'
    overlay.style.inset = '0'
    overlay.style.zIndex = '9999'
    overlay.style.display = 'flex'
    overlay.style.alignItems = 'center'
    overlay.style.justifyContent = 'center'
    overlay.innerHTML = `
      <div class="absolute inset-0 bg-black/60"></div>
      <div role="alertdialog" aria-modal="true" class="relative z-10 mx-4 w-full max-w-md rounded-2xl border border-white/10 bg-hero-mid/95 p-6 backdrop-blur-md">
        <h2 class="mb-2 text-lg font-semibold text-white">Mute Sarah?</h2>
        <p class="mb-6 text-sm text-white/70">Their posts won't appear in your feed. They won't know you've muted them. You can unmute anytime in Settings → Privacy.</p>
        <div class="flex flex-col-reverse gap-3 sm:flex-row">
          <button type="button" class="flex-1 rounded-lg border border-white/15 bg-white/10 px-4 py-3 text-sm text-white transition-colors hover:bg-white/15 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/30">Cancel</button>
          <button type="button" class="flex-1 rounded-lg px-4 py-3 font-medium transition-colors min-h-[44px] text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/30 border border-white/[0.20] bg-white/[0.12] text-white backdrop-blur-sm hover:border-white/[0.30] hover:bg-white/[0.18]">Mute</button>
        </div>
      </div>
    `
    document.body.appendChild(overlay)
  })
  await page.waitForTimeout(300)
  const file = `${OUT}/confirm-dialog-mute-${viewport.name}.png`
  await page.screenshot({ path: file, fullPage: false })
  console.log(`Wrote ${file}`)

  // Hover the confirm to capture hover state
  await page.locator('button:has-text("Mute")').hover()
  await page.waitForTimeout(250)
  const hover = `${OUT}/confirm-dialog-mute-${viewport.name}-hover.png`
  await page.screenshot({ path: hover, fullPage: false })
  console.log(`Wrote ${hover}`)

  await context.close()
}

async function captureToastAction(viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: viewport.deviceScaleFactor,
  })
  const page = await context.newPage()

  // Use the Toast preview/test route if it exists, else inject programmatically
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })

  // Inject a toast with an action button by mounting via window-exposed handle, if available,
  // otherwise fall back to console toggle. We use a small page.evaluate that walks the React
  // tree is not feasible without exposing the provider — so instead use the public DOM:
  // render a synthetic mirror with the same classes so we can visually verify the canonical pattern.
  await page.evaluate(() => {
    const el = document.createElement('div')
    el.style.position = 'fixed'
    el.style.top = '16px'
    el.style.right = '16px'
    el.style.zIndex = '9999'
    el.innerHTML = `
      <div role="status" class="rounded-lg border border-white/15 bg-white/10 px-4 py-3 shadow-lg backdrop-blur-md border-l-4 border-l-emerald-400" style="max-width: 360px;">
        <div class="flex items-center gap-2">
          <p class="text-sm text-white">Note deleted</p>
          <button type="button" class="ml-2 inline-flex shrink-0 items-center rounded-full bg-white px-3 py-1 text-xs font-semibold text-primary transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50">
            Undo
          </button>
        </div>
      </div>
    `
    document.body.appendChild(el)
  })
  await page.waitForTimeout(300)
  const file = `${OUT}/toast-action-undo-${viewport.name}.png`
  await page.screenshot({ path: file, fullPage: false, clip: { x: viewport.width - 380, y: 0, width: 380, height: 100 } })
  console.log(`Wrote ${file}`)
  await context.close()
}

const viewports = [
  { name: 'desktop-1440x900', width: 1440, height: 900, deviceScaleFactor: 1 },
  { name: 'mobile-375x812', width: 375, height: 812, deviceScaleFactor: 2 },
]

for (const vp of viewports) {
  await captureConfirmDialog(vp).catch((e) => console.error('confirm dialog error:', e.message))
  await captureToastAction(vp).catch((e) => console.error('toast error:', e.message))
}

await browser.close()
