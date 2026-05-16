#!/usr/bin/env node
/**
 * Phase 6 cutover (Spec 6.12) — Universal Rule 17 axe-core evidence.
 *
 * Runs against the local dev server on http://localhost:5173 across the Phase 6
 * routes (Prayer Wall family, Settings, Daily Hub, Dashboard) and writes the
 * combined results to phase6-a11y-smoke.json. Runs logged-out (no JWT) — the
 * pages render publicly (logged-out experience) under the mock-mode default
 * `VITE_USE_BACKEND_PRAYER_WALL=false`.
 *
 * Invocation: node _cutover-evidence/capture-axe-evidence-phase6.mjs
 */
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'
import fs from 'node:fs/promises'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FRONTEND_DIR = path.resolve(__dirname, '..', 'frontend')
const OUTPUT_FILE = path.join(__dirname, 'phase6-a11y-smoke.json')
const FRONTEND_URL = process.env.PHASE6_AXE_URL ?? 'http://localhost:5173'

// Routes from cutover checklist Section C. /prayer-wall/:id and
// /prayer-wall/user/:userId are excluded — they require specific mock IDs that
// are seeded only when the mock-data feed renders posts, so scanning a
// placeholder ID would scan the NotFound page rather than the real detail
// surface. The Section C checkbox for those two routes remains
// HUMAN-REQUIRED in the cutover artifact.
const ROUTES = [
  '/prayer-wall',
  '/prayer-wall/answered',
  '/prayer-wall/answered?category=health',
  '/prayer-wall/dashboard',
  '/settings',
  '/daily?tab=pray',
  '/daily?tab=pray&length=5',
  '/',
]

const require = createRequire(import.meta.url)
async function importFromFrontend(specifier) {
  const resolved = require.resolve(specifier, { paths: [FRONTEND_DIR] })
  return import(pathToFileURL(resolved).href)
}

const playwrightMod = await importFromFrontend('@playwright/test')
const { chromium } = playwrightMod.default ?? playwrightMod
const axeModule = await importFromFrontend('@axe-core/playwright')
const AxeBuilder = axeModule.default ?? axeModule

const browser = await chromium.launch({ headless: true })
const results = {}
let totalViolations = 0
let totalCritical = 0

try {
  const context = await browser.newContext()
  const page = await context.newPage()

  for (const route of ROUTES) {
    const url = `${FRONTEND_URL}${route}`
    process.stdout.write(`[axe] ${url} ... `)
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
    } catch (e) {
      process.stdout.write(`navigation error: ${e.message}\n`)
      results[route] = { error: e.message, violations: [] }
      continue
    }
    await page.evaluate(() => {
      try {
        localStorage.removeItem('wr_jwt_token')
        localStorage.removeItem('wr_auth_simulated')
      } catch {
        // no-op
      }
    })
    // Re-navigate after clearing localStorage so the logged-out state renders
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
    const axeResult = await new AxeBuilder({ page }).analyze()
    results[route] = {
      url: axeResult.url,
      timestamp: axeResult.timestamp,
      violations: axeResult.violations,
      incomplete: axeResult.incomplete,
      testEngine: axeResult.testEngine,
    }
    const critical = axeResult.violations.filter((v) => v.impact === 'critical')
    totalViolations += axeResult.violations.length
    totalCritical += critical.length
    process.stdout.write(
      `${axeResult.violations.length} violation(s), ${critical.length} critical\n`,
    )
  }
} finally {
  await browser.close()
}

const payload = {
  captured: new Date().toISOString(),
  cutoverSpec: '6.12 — Phase 6 Cutover',
  frontendUrl: FRONTEND_URL,
  results,
}

await fs.writeFile(OUTPUT_FILE, JSON.stringify(payload, null, 2) + '\n', 'utf8')
process.stdout.write(`[axe] wrote ${OUTPUT_FILE}\n`)
process.stdout.write(
  `[axe] summary: ${totalViolations} total violations, ${totalCritical} critical\n`,
)

process.exit(totalCritical === 0 ? 0 : 1)
