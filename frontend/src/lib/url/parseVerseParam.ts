/**
 * BB-38: Pure parser and formatter for the ?verse= query parameter.
 *
 * Framework-agnostic — no React, no React Router, no external dependencies.
 * Safe to import from service workers or test utilities.
 */

export interface VerseRange {
  start: number
  end: number
}

/**
 * Parses the ?verse= query parameter value into a structured range.
 *
 * Valid inputs:
 *   "16"     → { start: 16, end: 16 }
 *   "16-18"  → { start: 16, end: 18 }
 *   "5-5"    → { start: 5, end: 5 }
 *
 * Invalid inputs return null (caller uses default state):
 *   null        → null (no parameter present)
 *   ""          → null (empty string)
 *   "abc"       → null (non-numeric)
 *   "-5"        → null (negative / leading dash)
 *   "0"         → null (zero — verses are 1-indexed)
 *   "5-3"       → null (reversed range)
 *   "5-"        → null (trailing dash)
 *   "16,18,20"  → null (non-contiguous — not supported in BB-38)
 *   "16.5"      → null (non-integer)
 *   " 16 "      → null (whitespace)
 *
 * Does NOT validate against a chapter's actual verse count — that's the reader's job.
 */
export function parseVerseParam(value: string | null): VerseRange | null {
  if (value === null || value === '') return null

  // Reject any character that isn't a digit or a single hyphen
  if (!/^[0-9]+(-[0-9]+)?$/.test(value)) return null

  const parts = value.split('-')

  if (parts.length === 1) {
    const n = parseInt(parts[0], 10)
    if (isNaN(n) || n < 1) return null
    return { start: n, end: n }
  }

  if (parts.length === 2) {
    const start = parseInt(parts[0], 10)
    const end = parseInt(parts[1], 10)
    if (isNaN(start) || isNaN(end)) return null
    if (start < 1 || end < 1) return null
    if (end < start) return null
    return { start, end }
  }

  return null
}

/**
 * Formats a VerseRange back to the query-string representation.
 * Single-verse ranges are formatted without a dash: { start: 16, end: 16 } → "16".
 */
export function formatVerseRange(range: VerseRange): string {
  if (range.start === range.end) return String(range.start)
  return `${range.start}-${range.end}`
}
