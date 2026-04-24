#!/usr/bin/env node
/**
 * One-off Playwright + axe-core capture for Phase 1 cutover (Rule 17).
 * Runs against the deployed Railway frontend, logged-out, on / and /prayer-wall.
 * Writes combined WCAG 2.1 AA results to phase1-a11y-smoke.json next to this file.
 *
 * Invocation: node _cutover-evidence/capture-axe-evidence.mjs
 */
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'
import fs from 'node:fs/promises'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FRONTEND_DIR = path.resolve(__dirname, '..', 'frontend')
const OUTPUT_FILE = path.join(__dirname, 'phase1-a11y-smoke.json')
const FRONTEND_URL = 'https://worship-room-frontend-production.up.railway.app'
const ROUTES = ['/', '/prayer-wall']
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa']

// Resolve modules from frontend/node_modules so this script runs from the repo root.
const require = createRequire(import.meta.url)
async function importFromFrontend(specifier) {
  const resolved = require.resolve(specifier, { paths: [FRONTEND_DIR] })
  return import(pathToFileURL(resolved).href)
}

// createRequire resolves @playwright/test to its CJS index.js (not index.mjs),
// which exposes the Playwright namespace as the single `default` export.
// Destructure from `.default` to get `chromium`.
const playwrightMod = await importFromFrontend('@playwright/test')
const { chromium } = playwrightMod.default ?? playwrightMod
const axeModule = await importFromFrontend('@axe-core/playwright')
const AxeBuilder = axeModule.default ?? axeModule

const browser = await chromium.launch({ headless: true })
const results = {}
let totalViolations = 0

try {
  const context = await browser.newContext()
  const page = await context.newPage()

  // Logged-out posture: ensure no JWT is seeded in localStorage before each nav.
  for (const route of ROUTES) {
    const url = `${FRONTEND_URL}${route}`
    process.stdout.write(`[axe] ${url} ... `)
    await page.goto(url, { waitUntil: 'networkidle' })
    await page.evaluate(() => {
      try {
        localStorage.removeItem('wr_jwt_token')
      } catch {
        // no-op: private browsing / storage disabled
      }
    })
    const axeResult = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()
    results[route] = axeResult
    totalViolations += axeResult.violations.length
    process.stdout.write(`${axeResult.violations.length} violation(s)\n`)
  }
} finally {
  await browser.close()
}

const payload = {
  captured: new Date().toISOString(),
  frontendUrl: FRONTEND_URL,
  results,
}

await fs.writeFile(OUTPUT_FILE, JSON.stringify(payload, null, 2) + '\n', 'utf8')
process.stdout.write(`[axe] wrote ${OUTPUT_FILE}\n`)

for (const route of ROUTES) {
  const vs = results[route].violations
  process.stdout.write(`[axe] ${route}: ${vs.length} violation(s)\n`)
  for (const v of vs) {
    process.stdout.write(`  - ${v.id} (${v.impact}) :: ${v.help}\n`)
    for (const node of v.nodes) {
      process.stdout.write(`      target: ${node.target.join(' ')}\n`)
    }
  }
}

process.exit(totalViolations === 0 ? 0 : 1)
