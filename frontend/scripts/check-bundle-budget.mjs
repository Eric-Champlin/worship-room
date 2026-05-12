#!/usr/bin/env node

/**
 * Spec 6.1 Gate-30 — Bundle budget check.
 *
 * Sums all *.js files in dist/assets/ (gzipped) and asserts the delta against
 * the pre-html2canvas baseline at scripts/bundle-budget-baseline.json is ≤ 30 KB.
 *
 * Usage:
 *   pnpm build && node scripts/check-bundle-budget.mjs
 *   node scripts/check-bundle-budget.mjs --update-baseline
 *
 * Run with --update-baseline ONCE during Step 1 to capture the pre-html2canvas
 * baseline. After that, the script reads the committed baseline JSON and asserts
 * the delta is within budget; non-zero exit on overrun.
 *
 * No external dependencies — Node builtins only.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, join, basename } from 'node:path'
import { gzipSync } from 'node:zlib'

const __dirname = import.meta.dirname
const DIST_DIR = resolve(__dirname, '../dist/assets')
const INDEX_HTML = resolve(__dirname, '../dist/index.html')
const BASELINE_PATH = resolve(__dirname, 'bundle-budget-baseline.json')
const BUDGET_BYTES = 30 * 1024 // 30 KB

function getGzipSize(filePath) {
  const content = readFileSync(filePath)
  return gzipSync(content).length
}

/**
 * Initial-load bundle = the main entry chunk + every modulepreload chunk
 * referenced in `dist/index.html`. Lazy-loaded chunks (dynamic imports,
 * route splits) are NOT in the initial bundle — they're fetched on demand
 * and don't count against Gate-30.
 *
 * Parse both `<script src="...">` and `<link rel="modulepreload" href="...">`
 * from dist/index.html.
 */
function sumJsGzipBytes() {
  if (!existsSync(DIST_DIR)) {
    console.error(`Error: ${DIST_DIR} does not exist. Run \`pnpm build\` first.`)
    process.exit(1)
  }
  if (!existsSync(INDEX_HTML)) {
    console.error(`Error: ${INDEX_HTML} not found. Run \`pnpm build\` first.`)
    process.exit(1)
  }

  const html = readFileSync(INDEX_HTML, 'utf8')
  const urlRegex = /(?:src|href)="(\/assets\/[^"]+\.js)"/g
  const urls = new Set()
  let m
  while ((m = urlRegex.exec(html)) !== null) {
    urls.add(m[1])
  }

  let total = 0
  const files = []
  for (const url of urls) {
    const name = basename(url)
    const fullPath = join(DIST_DIR, name)
    if (!existsSync(fullPath)) continue
    const gzip = getGzipSize(fullPath)
    total += gzip
    files.push({ name, gzip })
  }
  return { total, files }
}

function formatBytes(bytes) {
  const sign = bytes < 0 ? '-' : ''
  const abs = Math.abs(bytes)
  if (abs < 1024) return `${sign}${abs} B`
  return `${sign}${(abs / 1024).toFixed(2)} KB`
}

const updateBaseline = process.argv.includes('--update-baseline')

const { total, files } = sumJsGzipBytes()

if (updateBaseline) {
  const baseline = {
    totalGzipBytes: total,
    capturedAt: new Date().toISOString().slice(0, 10),
    note: 'Pre-html2canvas baseline for Gate-30 (Spec 6.1)',
  }
  writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2) + '\n')
  console.log(`Baseline captured: ${formatBytes(total)} (${total} bytes) across ${files.length} .js files`)
  console.log(`Written to ${BASELINE_PATH}`)
  process.exit(0)
}

if (!existsSync(BASELINE_PATH)) {
  console.error(`Error: ${BASELINE_PATH} not found. Run with --update-baseline first.`)
  process.exit(1)
}

const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'))
const delta = total - baseline.totalGzipBytes

console.log(`Current total: ${formatBytes(total)} (${total} bytes)`)
console.log(`Baseline:      ${formatBytes(baseline.totalGzipBytes)} (${baseline.totalGzipBytes} bytes) — captured ${baseline.capturedAt}`)
console.log(`Delta:         ${formatBytes(delta)} (${delta} bytes)`)
console.log(`Budget:        ${formatBytes(BUDGET_BYTES)}`)

if (delta > BUDGET_BYTES) {
  console.error('')
  console.error(`Gate-30 FAILED: delta ${formatBytes(delta)} exceeds budget ${formatBytes(BUDGET_BYTES)}`)
  console.error('See _plans/forums/spec-6-1-brief.md § Gate-30 for escalation paths.')
  process.exit(1)
}

console.log('')
console.log('Gate-30 PASSED.')
process.exit(0)
