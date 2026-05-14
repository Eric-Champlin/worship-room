import { chromium } from '@playwright/test'

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page = await ctx.newPage()
await page.goto('http://localhost:5173/daily', { waitUntil: 'networkidle', timeout: 30000 })
await page.waitForTimeout(800)

const r = await page.evaluate(() => {
  const navbar = document.querySelector('nav') || document.querySelector('header') || document.querySelector('[class*="Navbar"]')
  const main = document.getElementById('main-content')
  const navbarRect = navbar ? navbar.getBoundingClientRect() : null
  const navbarCS = navbar ? getComputedStyle(navbar) : null

  // Layer 8 fade-to-body: the LAST div child of cinematic bg.
  const cb = document.querySelector('section[aria-labelledby="daily-hub-heading"] > div[aria-hidden="true"]')
  const layers = cb ? Array.from(cb.children) : []
  const lastLayer = layers[layers.length - 1]
  const lastLayerStyle = lastLayer ? lastLayer.getAttribute('style') : null

  return {
    navbar: navbar ? {
      tag: navbar.tagName,
      className: String(navbar.className).slice(0, 200),
      rect: { top: navbarRect.top, bottom: navbarRect.bottom, height: navbarRect.height },
      computed: { position: navbarCS.position, zIndex: navbarCS.zIndex, top: navbarCS.top },
    } : null,
    mainTop: main ? main.getBoundingClientRect().top : null,
    cinematicLayerCount: layers.length,
    cinematicLayers: layers.map((l, i) => ({
      i,
      tag: l.tagName,
      className: String(l.className || '').slice(0, 80),
      style: l.getAttribute('style')?.slice(0, 250),
    })),
    lastLayerStyle,
  }
})
console.log(JSON.stringify(r, null, 2))
await browser.close()
