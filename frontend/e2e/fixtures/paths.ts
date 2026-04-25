import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Returns the canonical screenshot directory for a given spec slug.
 * Encapsulates the import.meta.url / fileURLToPath / path.dirname dance so
 * each spec doesn't reimplement it.
 *
 * Example: screenshotDir('1-9') → '<repo>/frontend/playwright-screenshots/1-9'
 */
export function screenshotDir(specSlug: string): string {
  const fixturesFile = fileURLToPath(import.meta.url)
  const fixturesDir = path.dirname(fixturesFile)
  // fixturesDir is .../frontend/e2e/fixtures; go up two to frontend/, then
  // into playwright-screenshots/<slug>. Matches the inline construction in
  // spec-1-9-auth-flow.spec.ts and spec-1-9b-captures.spec.ts.
  return path.resolve(fixturesDir, '..', '..', 'playwright-screenshots', specSlug)
}
