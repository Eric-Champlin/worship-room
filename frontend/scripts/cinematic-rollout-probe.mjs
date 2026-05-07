// Cinematic rollout recon — Playwright probes for /daily mobile + reduced-motion
import { chromium } from '@playwright/test'

const SCREENSHOT_DIR = '/Users/Eric/worship-room/frontend/playwright-screenshots'
const URL = 'http://localhost:5173/daily'

async function probeMobile() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 2,
  })
  const page = await context.newPage()
  await page.goto(URL, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await page.screenshot({
    path: `${SCREENSHOT_DIR}/cinematic-rollout-recon-mobile-daily.png`,
    fullPage: false,
  })
  // Inspect the cinematic wrapper bbox + inner SVG sizes
  const data = await page.evaluate(() => {
    const cinematic = document.querySelector(
      '[aria-labelledby="daily-hub-heading"] > div[aria-hidden="true"]'
    )
    const hero = document.querySelector('[aria-labelledby="daily-hub-heading"]')
    const svgs = cinematic ? cinematic.querySelectorAll('svg') : []
    return {
      heroBox: hero?.getBoundingClientRect().toJSON(),
      cinematicBox: cinematic?.getBoundingClientRect().toJSON(),
      svgCount: svgs.length,
      svgViewBoxes: Array.from(svgs).map((s) => s.getAttribute('viewBox')),
      cinematicComputed: cinematic
        ? {
            height: getComputedStyle(cinematic).height,
            width: getComputedStyle(cinematic).width,
            maskImage: getComputedStyle(cinematic).maskImage,
          }
        : null,
    }
  })
  console.log('MOBILE_PROBE', JSON.stringify(data, null, 2))
  await browser.close()
}

async function probeReducedMotion() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    reducedMotion: 'reduce',
  })
  const page = await context.newPage()
  await page.goto(URL, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await page.screenshot({
    path: `${SCREENSHOT_DIR}/cinematic-rollout-recon-reduced-motion.png`,
    fullPage: false,
  })
  // Inspect computed animation-name on cinematic light beam, twinkle stars, glints
  const data = await page.evaluate(() => {
    const beam = document.querySelector('.cinematic-light-beam')
    const star = document.querySelector('.cinematic-star-twinkle')
    const glint = document.querySelector('.cinematic-glint-pulse')
    return {
      beam: beam
        ? {
            animationName: getComputedStyle(beam).animationName,
            animationDuration: getComputedStyle(beam).animationDuration,
          }
        : null,
      star: star
        ? {
            animationName: getComputedStyle(star).animationName,
            animationDuration: getComputedStyle(star).animationDuration,
          }
        : null,
      glint: glint
        ? {
            animationName: getComputedStyle(glint).animationName,
            animationDuration: getComputedStyle(glint).animationDuration,
          }
        : null,
      mediaQueryMatches: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    }
  })
  console.log('REDUCED_MOTION_PROBE', JSON.stringify(data, null, 2))
  await browser.close()
}

await probeMobile()
await probeReducedMotion()
console.log('DONE')
