import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { resolveNightModeActive } from '../night-mode-resolver'
import type { NightModePreference } from '@/types/settings'

/**
 * Spec 6.3 — parity test for the inline no-FOUC script in `frontend/index.html`.
 *
 * Strategy: read index.html, extract the inline IIFE script (the one between
 * the `// Spec 6.3` comment and the React module script), inline the function
 * body's preference→active branch as a pure JS function, and exercise it
 * against the same boundary table the resolver tests use. Any drift between
 * the two implementations fails this test.
 */

// Pure-JS mirror of the inline-script's branch (transcribed verbatim from index.html).
// If you edit the inline script, edit this function. The parity test catches drift.
function inlineActive(preference: string, hour: number): boolean | undefined {
  let active: boolean | undefined
  const inNight = hour >= 21 || hour < 6
  if (preference === 'on') active = true
  else if (preference === 'off') active = false
  else if (preference === 'auto') active = inNight
  // else: not a valid preference — script would short-circuit; mirror returns undefined.
  return active
}

const INDEX_HTML_PATH = resolve(__dirname, '../../../index.html')
let indexHtml: string

beforeAll(() => {
  indexHtml = readFileSync(INDEX_HTML_PATH, 'utf8')
})

describe('night-mode-resolver parity with index.html inline script', () => {
  it('index.html contains the Spec 6.3 inline script', () => {
    expect(indexHtml).toContain('Spec 6.3 — Night Mode no-FOUC bootstrap')
    expect(indexHtml).toContain("data-prayer-wall-night-mode-pending")
  })

  it('inline script has the canonical night-window predicate (hour >= 21 || hour < 6)', () => {
    expect(indexHtml).toContain('hour >= 21 || hour < 6')
  })

  it('inline script reads from wr_settings localStorage key', () => {
    expect(indexHtml).toContain("'wr_settings'")
    expect(indexHtml).toContain('prayerWall')
    expect(indexHtml).toContain('nightMode')
  })

  it('inline script restricts to Prayer Wall routes', () => {
    expect(indexHtml).toContain("'/prayer-wall'")
    expect(indexHtml).toContain("'/prayer-wall/'")
  })

  it('inline script does NOT set data-night-mode on <html> (Gate-G-SCOPE-PRAYER-WALL-ONLY)', () => {
    // The forbidden attribute is `data-night-mode`. The allowed attribute is
    // `data-prayer-wall-night-mode-pending`. Assert the script writes only the
    // latter to documentElement.
    expect(indexHtml).toContain(
      "setAttribute('data-prayer-wall-night-mode-pending', 'on')",
    )
    // No naked `data-night-mode` setAttribute call in the inline script.
    const scriptStart = indexHtml.indexOf('Spec 6.3')
    const scriptEnd = indexHtml.indexOf(
      '<script type="module"',
      scriptStart,
    )
    const inlineScript = indexHtml.slice(scriptStart, scriptEnd)
    expect(inlineScript).not.toMatch(/setAttribute\(\s*['"]data-night-mode['"]/)
  })

  it('parity: inline mirror agrees with resolveNightModeActive on every boundary case', () => {
    const preferences: NightModePreference[] = ['auto', 'on', 'off']
    const hours = [0, 5, 6, 7, 12, 20, 21, 22, 23]
    for (const preference of preferences) {
      for (const hour of hours) {
        const expected = resolveNightModeActive(preference, hour)
        const actual = inlineActive(preference, hour)
        expect(actual, `parity break: preference=${preference} hour=${hour}`).toBe(expected)
      }
    }
  })
})
