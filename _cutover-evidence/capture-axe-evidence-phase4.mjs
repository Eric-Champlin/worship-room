#!/usr/bin/env node
/**
 * Phase 4 cutover (Spec 4.8) — Universal Rule 17 axe-core evidence.
 *
 * Runs against the local dev server on http://localhost:5173 across the three
 * Spec 4.8 surfaces and writes the combined results to phase4-a11y-smoke.json.
 *
 * Phase 4 is purely frontend, so no Railway scan is required at this stage.
 * Re-run against the deployed frontend post-merge if a production audit is
 * desired.
 *
 * Invocation: node _cutover-evidence/capture-axe-evidence-phase4.mjs
 */
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'
import fs from 'node:fs/promises'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FRONTEND_DIR = path.resolve(__dirname, '..', 'frontend')
const OUTPUT_FILE = path.join(__dirname, 'phase4-a11y-smoke.json')
const FRONTEND_URL = process.env.PHASE4_AXE_URL ?? 'http://localhost:5173'
const ROUTES = [
  '/prayer-wall',
  '/prayer-wall?postType=testimony',
  '/prayer-wall?postType=encouragement&category=mental-health',
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
    await page.goto(url, { waitUntil: 'networkidle' })
    await page.evaluate(() => {
      try {
        localStorage.removeItem('wr_jwt_token')
      } catch {
        // no-op
      }
    })
    const axeResult = await new AxeBuilder({ page }).analyze()
    results[route] = axeResult
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
  cutoverSpec: '4.8 — Room Selector and Phase 4 Cutover',
  frontendUrl: FRONTEND_URL,
  results,
}

await fs.writeFile(OUTPUT_FILE, JSON.stringify(payload, null, 2) + '\n', 'utf8')
process.stdout.write(`[axe] wrote ${OUTPUT_FILE}\n`)
process.stdout.write(
  `[axe] summary: ${totalViolations} total violations, ${totalCritical} critical\n`,
)

process.exit(totalCritical === 0 ? 0 : 1)
