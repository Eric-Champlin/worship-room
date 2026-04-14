#!/usr/bin/env node

/**
 * Bundle size measurement script for BB-36 Performance.
 *
 * Reads the dist/ directory after `pnpm build` and reports:
 * - Top 20 JS chunks by raw size
 * - Total JS, CSS, HTML sizes (raw + gzipped)
 * - Search index size
 * - dist/ total size
 *
 * Usage: pnpm build && node scripts/measure-bundle.mjs
 *
 * Outputs structured JSON to stdout, human-readable table to stderr.
 * No external dependencies — uses only Node.js builtins.
 */

import { readdirSync, statSync, readFileSync } from 'fs'
import { join, extname, relative } from 'path'
import { gzipSync } from 'zlib'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const DIST_DIR = join(__dirname, '..', 'dist')

function walkDir(dir) {
  const results = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...walkDir(fullPath))
    } else {
      results.push(fullPath)
    }
  }
  return results
}

function getGzipSize(filePath) {
  const content = readFileSync(filePath)
  return gzipSync(content).length
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function measure() {
  let allFiles
  try {
    allFiles = walkDir(DIST_DIR)
  } catch {
    console.error('Error: dist/ directory not found. Run `pnpm build` first.')
    process.exit(1)
  }

  const fileEntries = allFiles.map((f) => {
    const raw = statSync(f).size
    return {
      path: relative(DIST_DIR, f),
      raw,
      ext: extname(f).toLowerCase(),
    }
  })

  // Categorize files
  const jsFiles = fileEntries.filter((f) => f.ext === '.js')
  const cssFiles = fileEntries.filter((f) => f.ext === '.css')
  const htmlFiles = fileEntries.filter((f) => f.ext === '.html')

  // Compute gzip for JS and CSS files
  const jsWithGzip = jsFiles
    .map((f) => ({
      ...f,
      gzip: getGzipSize(join(DIST_DIR, f.path)),
    }))
    .sort((a, b) => b.raw - a.raw)

  const cssWithGzip = cssFiles.map((f) => ({
    ...f,
    gzip: getGzipSize(join(DIST_DIR, f.path)),
  }))

  const htmlWithGzip = htmlFiles.map((f) => ({
    ...f,
    gzip: getGzipSize(join(DIST_DIR, f.path)),
  }))

  // Top 20 JS chunks
  const top20 = jsWithGzip.slice(0, 20)

  // Totals
  const totalJsRaw = jsWithGzip.reduce((s, f) => s + f.raw, 0)
  const totalJsGzip = jsWithGzip.reduce((s, f) => s + f.gzip, 0)
  const totalCssRaw = cssWithGzip.reduce((s, f) => s + f.raw, 0)
  const totalCssGzip = cssWithGzip.reduce((s, f) => s + f.gzip, 0)
  const totalHtmlRaw = htmlWithGzip.reduce((s, f) => s + f.raw, 0)
  const totalHtmlGzip = htmlWithGzip.reduce((s, f) => s + f.gzip, 0)
  const totalDistRaw = fileEntries.reduce((s, f) => s + f.raw, 0)

  // Search index
  let searchIndex = null
  const searchPath = join(DIST_DIR, 'search', 'bible-index.json')
  try {
    const raw = statSync(searchPath).size
    const gzip = getGzipSize(searchPath)
    searchIndex = { path: 'search/bible-index.json', raw, gzip }
  } catch {
    // Search index may not exist
  }

  // Build JSON report
  const report = {
    timestamp: new Date().toISOString(),
    dist: {
      totalRaw: totalDistRaw,
      totalRawFormatted: formatBytes(totalDistRaw),
      fileCount: fileEntries.length,
    },
    js: {
      fileCount: jsFiles.length,
      totalRaw: totalJsRaw,
      totalRawFormatted: formatBytes(totalJsRaw),
      totalGzip: totalJsGzip,
      totalGzipFormatted: formatBytes(totalJsGzip),
      top20: top20.map((f) => ({
        path: f.path,
        raw: f.raw,
        rawFormatted: formatBytes(f.raw),
        gzip: f.gzip,
        gzipFormatted: formatBytes(f.gzip),
      })),
    },
    css: {
      fileCount: cssFiles.length,
      totalRaw: totalCssRaw,
      totalRawFormatted: formatBytes(totalCssRaw),
      totalGzip: totalCssGzip,
      totalGzipFormatted: formatBytes(totalCssGzip),
    },
    html: {
      fileCount: htmlFiles.length,
      totalRaw: totalHtmlRaw,
      totalRawFormatted: formatBytes(totalHtmlRaw),
      totalGzip: totalHtmlGzip,
      totalGzipFormatted: formatBytes(totalHtmlGzip),
    },
    searchIndex,
    jsCssHtmlGzip: totalJsGzip + totalCssGzip + totalHtmlGzip,
    jsCssHtmlGzipFormatted: formatBytes(totalJsGzip + totalCssGzip + totalHtmlGzip),
  }

  // Human-readable output to stderr
  console.error('\n=== Bundle Size Report ===\n')

  console.error(`dist/ total: ${formatBytes(totalDistRaw)} (${fileEntries.length} files)`)
  console.error('')

  console.error('--- Top 20 JS Chunks ---')
  console.error(`${'File'.padEnd(55)} ${'Raw'.padStart(12)} ${'Gzip'.padStart(12)}`)
  console.error('-'.repeat(80))
  for (const f of top20) {
    console.error(
      `${f.path.padEnd(55)} ${formatBytes(f.raw).padStart(12)} ${formatBytes(f.gzip).padStart(12)}`,
    )
  }
  console.error('')

  console.error('--- Totals ---')
  console.error(
    `JS:   ${jsFiles.length} files, ${formatBytes(totalJsRaw)} raw, ${formatBytes(totalJsGzip)} gzip`,
  )
  console.error(
    `CSS:  ${cssFiles.length} files, ${formatBytes(totalCssRaw)} raw, ${formatBytes(totalCssGzip)} gzip`,
  )
  console.error(
    `HTML: ${htmlFiles.length} files, ${formatBytes(totalHtmlRaw)} raw, ${formatBytes(totalHtmlGzip)} gzip`,
  )
  console.error(
    `JS+CSS+HTML gzip total: ${formatBytes(totalJsGzip + totalCssGzip + totalHtmlGzip)}`,
  )
  console.error('')

  if (searchIndex) {
    console.error(
      `Search index: ${formatBytes(searchIndex.raw)} raw, ${formatBytes(searchIndex.gzip)} gzip`,
    )
  }

  // JSON to stdout
  console.log(JSON.stringify(report, null, 2))
}

measure()
