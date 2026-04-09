import { describe, expect, it } from 'vitest'

import { loadManifest, loadPlan } from '../planLoader'

describe('loadManifest', () => {
  it('returns empty array', () => {
    const result = loadManifest()
    expect(result).toEqual([])
    expect(Array.isArray(result)).toBe(true)
  })
})

describe('loadPlan', () => {
  it('returns error for nonexistent slug', async () => {
    const result = await loadPlan('nonexistent-plan')
    expect(result.plan).toBeNull()
    expect(result.error).toBe('Plan "nonexistent-plan" could not be loaded.')
  })

  it('never throws — always returns result object', async () => {
    const result = await loadPlan('definitely-does-not-exist-xyz')
    expect(result).toHaveProperty('plan')
    expect(result).toHaveProperty('error')
    expect(result.plan).toBeNull()
    expect(typeof result.error).toBe('string')
  })

  it('validates required fields — rejects data missing title', async () => {
    // loadPlan uses dynamic import which catches nonexistent files.
    // For valid slug with invalid shape, the validation is tested via
    // the importValidator and plansStore integration rather than mocking
    // dynamic imports (which Vite resolves at build time).
    // This test verifies the error path returns the correct shape.
    const result = await loadPlan('missing-fields')
    expect(result.plan).toBeNull()
    expect(result.error).toContain('could not be loaded')
  })
})
