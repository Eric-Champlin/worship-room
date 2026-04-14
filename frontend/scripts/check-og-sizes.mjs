#!/usr/bin/env node
/**
 * BB-40 build-time guard: validates OG card PNG file sizes.
 *
 * Rules:
 * - Each PNG under `public/og/` (recursively) must be ≤ 100 KB (102400 bytes)
 * - Total size of all PNGs under `public/og/` must be ≤ 1.5 MB (1572864 bytes)
 *
 * Exits non-zero with a human-readable violation list if either rule fails.
 * Not wired to CI — runnable locally via `pnpm og-check`, and in Step 10's
 * final sweep before declaring BB-40 shippable.
 *
 * Pre-existing `public/og-default.png` is NOT checked (it lives at the public
 * root, not under `public/og/`).
 */
import { readdirSync, statSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

const OG_DIR = resolve('public/og')
const MAX_FILE_BYTES = 100 * 1024 // 100 KB per file
const MAX_TOTAL_BYTES = 1500 * 1024 // 1.5 MB total

function walk(dir) {
  const entries = readdirSync(dir, { withFileTypes: true })
  return entries.flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  )
}

function formatKB(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`
}

try {
  if (!existsSync(OG_DIR)) {
    console.log(`og-check: ${OG_DIR} does not exist yet — nothing to check.`)
    process.exit(0)
  }

  const files = walk(OG_DIR).filter((f) => f.endsWith('.png'))
  const violations = []
  let total = 0

  for (const f of files) {
    const size = statSync(f).size
    total += size
    if (size > MAX_FILE_BYTES) {
      violations.push(`${f} — ${formatKB(size)} (limit: ${formatKB(MAX_FILE_BYTES)})`)
    }
  }

  if (total > MAX_TOTAL_BYTES) {
    violations.push(`TOTAL — ${formatKB(total)} (limit: ${formatKB(MAX_TOTAL_BYTES)})`)
  }

  if (violations.length > 0) {
    console.error('OG card size violations:')
    for (const v of violations) {
      console.error(`  - ${v}`)
    }
    process.exit(1)
  }

  console.log(
    `og-check: OK — ${files.length} file${files.length === 1 ? '' : 's'}, ${formatKB(total)} total (limit: ${formatKB(MAX_TOTAL_BYTES)})`,
  )
  process.exit(0)
} catch (err) {
  console.error('og-check failed:', err.message)
  process.exit(1)
}
