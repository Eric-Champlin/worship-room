#!/usr/bin/env node
/**
 * BB-40: generate the 14 OG card PNGs via Playwright headless Chromium.
 *
 * Why Playwright and not sharp/canvas: Playwright is already in the workspace
 * (`@playwright/test`), produces deterministic screenshots, and handles the
 * radial gradient + web font rendering faithfully. Running this script from a
 * clean checkout produces byte-identical PNGs (modulo font-rendering fudge),
 * so any future rewording is a one-line data change + `pnpm og-generate`.
 *
 * Sharp is then used ONLY for PNG quantization (palette reduction) to keep
 * each file under the 100 KB `og-check` ceiling. Chromium's raw PNG output
 * hovers around 300-500 KB for dark gradients; `sharp().png({ palette: true })`
 * brings it under 100 KB without visible artifacts.
 *
 * Run: `cd frontend && pnpm og-generate`
 * Validate: `cd frontend && pnpm og-check`
 *
 * Design spec source: `_plans/recon/bb40-seo-metadata.md` §5.1 (card list),
 * §5.2 (visual spec).
 */
import { chromium } from '@playwright/test'
import sharp from 'sharp'
import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'

// ─── Card definitions (matches _plans/recon/bb40-seo-metadata.md §5.1) ────

/**
 * Each entry is:
 *   path         — output path under public/og/
 *   title        — main title text (Inter 700, gradient)
 *   subtitle     — optional second line under the title (Inter 500, white 80%)
 *   titleSize    — override font size in px (default 88; drop to 76 for long titles)
 */
const CARDS = [
  // Homepage
  {
    path: 'home.png',
    title: 'Christian Emotional Healing',
    subtitle: 'Scripture, prayer, and quiet — free and ad-free',
    titleSize: 80,
  },

  // Bible section
  {
    path: 'bible-landing.png',
    title: 'Read the Bible',
    subtitle: 'The full World English Bible — free, no account needed',
  },
  {
    path: 'bible-chapter.png',
    title: 'Read Scripture',
    subtitle: 'From the World English Bible',
  },
  {
    path: 'my-bible.png',
    title: 'My Bible',
    subtitle: 'Your highlights, notes, and bookmarks',
  },
  {
    path: 'plans-browser.png',
    title: 'Reading Plans for Hard Days',
    subtitle: '7 to 30 days — no guilt, no streaks',
    titleSize: 72,
  },

  // Daily Hub tabs
  {
    path: 'daily-devotional.png',
    title: "Today's Devotional",
    subtitle: 'A short reading, a reflection, a closing prayer',
  },
  {
    path: 'daily-pray.png',
    title: 'Write a Prayer',
    subtitle: 'A Scripture-grounded prayer for this moment',
  },
  {
    path: 'daily-journal.png',
    title: 'Daily Journal',
    subtitle: 'Your entries stay yours, on your device',
  },
  {
    path: 'daily-meditate.png',
    title: 'Contemplative Prayer',
    subtitle: 'Six practices from the Christian tradition',
  },

  // Ask
  {
    path: 'ask.png',
    title: 'Ask the Bible',
    subtitle: 'Scripture-grounded answers for hard days',
  },

  // Reading plans (under /og/plans/)
  {
    path: 'plans/psalms-30-days.png',
    title: '30 Days in the Psalms',
    subtitle: 'A month in the prayer book of the Bible',
  },
  {
    path: 'plans/john-story-of-jesus.png',
    title: 'The Story of Jesus',
    subtitle: 'John 1–21, twenty-one days',
  },
  {
    path: 'plans/when-youre-anxious.png',
    title: "When You're Anxious",
    subtitle: 'Fourteen days of scripture that meets you',
  },
  {
    path: 'plans/when-you-cant-sleep.png',
    title: "When You Can't Sleep",
    subtitle: 'Seven short readings for late nights',
  },
]

// ─── HTML template ───────────────────────────────────────────────────────

/**
 * Build the HTML for a single card. The page uses Google Fonts for Caveat + Inter
 * (headless Chromium has network access). Font loading is awaited via
 * `document.fonts.ready` before screenshot capture.
 *
 * Colors / sizes all come from `_plans/recon/bb40-seo-metadata.md` §5.2:
 * - Canvas 1200×630, base #08051A
 * - Radial glow: rgba(139,92,246,0.35) → rgba(109,40,217,0.18) → transparent
 * - Wordmark: Caveat 700 @ 64px, white, y≈90
 * - Title: Inter 700 @ 80-88px (override per card), white→purple gradient
 * - Subtitle: Inter 500 @ 32px, white/80, y≈430
 */
function buildHtml({ title, subtitle, titleSize = 88 }) {
  // Escape HTML in user text. The card content is curated by BB-40, not
  // user-generated, but this is cheap safety insurance.
  const escape = (s) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

  const t = escape(title)
  const s = subtitle ? escape(subtitle) : ''

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@700&family=Inter:wght@500;700&display=swap" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      width: 1200px;
      height: 630px;
      overflow: hidden;
    }
    body {
      position: relative;
      font-family: 'Inter', system-ui, sans-serif;
      background: #08051A;
    }
    /* Radial glow layer — upper-center, emotional-peak intensity */
    .glow {
      position: absolute;
      inset: 0;
      background: radial-gradient(
        ellipse at 50% 38%,
        rgba(139, 92, 246, 0.35) 0%,
        rgba(109, 40, 217, 0.18) 40%,
        transparent 70%
      );
      pointer-events: none;
    }
    /* Safe zone container — center 1100×530, 50px margin */
    .safe-zone {
      position: absolute;
      inset: 50px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      padding: 40px 0 0 0;
    }
    /* Wordmark — Caveat 700 @ 64px, white, top */
    .wordmark {
      font-family: 'Caveat', cursive;
      font-weight: 700;
      font-size: 64px;
      line-height: 1;
      color: #ffffff;
      text-shadow: 0 0 24px rgba(109, 40, 217, 0.4);
      letter-spacing: 0.01em;
      margin: 0;
    }
    /* Title — Inter 700, white→purple gradient via background-clip: text */
    .title {
      font-family: 'Inter', sans-serif;
      font-weight: 700;
      font-size: ${titleSize}px;
      line-height: 1.05;
      margin: 0;
      padding: 0 20px;
      text-align: center;
      background: linear-gradient(180deg, #ffffff 0%, #8b5cf6 100%);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      -webkit-text-fill-color: transparent;
      /* Absolute centering via flex spacer */
      margin-top: auto;
    }
    /* Subtitle — Inter 500 @ 32px, white 80% */
    .subtitle {
      font-family: 'Inter', sans-serif;
      font-weight: 500;
      font-size: 30px;
      line-height: 1.3;
      color: rgba(255, 255, 255, 0.8);
      text-align: center;
      padding: 0 20px;
      max-width: 1000px;
      margin-top: 24px;
    }
    /* Flex spacer to push title + subtitle toward vertical center */
    .spacer-bottom {
      margin-top: auto;
      /* Offset so content sits slightly above visual center (aligns with 320/430 spec) */
      height: 60px;
    }
  </style>
</head>
<body>
  <div class="glow"></div>
  <div class="safe-zone">
    <h1 class="wordmark">Worship Room</h1>
    <h2 class="title">${t}</h2>
    ${s ? `<p class="subtitle">${s}</p>` : ''}
    <div class="spacer-bottom"></div>
  </div>
</body>
</html>`
}

// ─── Main ────────────────────────────────────────────────────────────────

const OG_DIR = resolve('public/og')
mkdirSync(OG_DIR, { recursive: true })
mkdirSync(join(OG_DIR, 'plans'), { recursive: true })

console.log(`og-generate: launching headless Chromium…`)
const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 1,
})
const page = await context.newPage()

const results = []

try {
  for (const card of CARDS) {
    const html = buildHtml(card)
    await page.setContent(html, { waitUntil: 'networkidle' })
    // Wait for web fonts to finish loading so the screenshot has final glyphs
    // eslint-disable-next-line no-undef -- runs in Playwright browser context
    await page.evaluate(() => document.fonts.ready)
    // A small settle tick for any final layout reflow
    await page.waitForTimeout(100)

    const rawBuffer = await page.screenshot({
      type: 'png',
      omitBackground: false,
      clip: { x: 0, y: 0, width: 1200, height: 630 },
    })

    // Quantize via sharp (palette PNG) to fit the 100 KB per-file ceiling.
    // Dark backgrounds with smooth gradients compress well under palette
    // quantization and the visual difference is imperceptible at card scale.
    const optimized = await sharp(rawBuffer)
      .png({
        palette: true,
        quality: 85,
        effort: 10,
        compressionLevel: 9,
      })
      .toBuffer()

    const outPath = join(OG_DIR, card.path)
    mkdirSync(dirname(outPath), { recursive: true })
    writeFileSync(outPath, optimized)

    const sizeKB = (optimized.length / 1024).toFixed(1)
    const marker = optimized.length > 100 * 1024 ? '⚠ ' : '  '
    console.log(`${marker}${card.path.padEnd(42)} ${sizeKB.padStart(7)} KB`)
    results.push({ path: card.path, size: optimized.length })
  }
} finally {
  await browser.close()
}

const totalKB = (results.reduce((a, r) => a + r.size, 0) / 1024).toFixed(1)
console.log(`\nog-generate: wrote ${results.length} files, ${totalKB} KB total`)

const oversized = results.filter((r) => r.size > 100 * 1024)
if (oversized.length > 0) {
  console.error(
    `og-generate: ${oversized.length} file(s) exceed the 100 KB ceiling — run pnpm og-check to see violations`,
  )
  process.exit(1)
}
if (!existsSync(OG_DIR)) {
  console.error('og-generate: output directory missing after generation')
  process.exit(1)
}
