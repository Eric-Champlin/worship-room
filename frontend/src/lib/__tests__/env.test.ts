import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Tests for BB-26 FCBH env helpers. The env.ts module reads
// `import.meta.env.VITE_FCBH_API_KEY` at module load. To make assertions work
// across isolated key states, we reset module state between tests via
// `vi.resetModules()` and use `vi.stubEnv()` to set the env var before
// re-importing.

describe('requireFcbhApiKey / isFcbhApiKeyConfigured / getFcbhApiKey (BB-26)', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('requireFcbhApiKey throws when key is absent', async () => {
    vi.stubEnv('VITE_FCBH_API_KEY', '')
    const mod = await import('@/lib/env')
    expect(() => mod.requireFcbhApiKey()).toThrowError(
      /VITE_FCBH_API_KEY.*\.env\.local/s,
    )
  })

  it('requireFcbhApiKey returns the value when set', async () => {
    vi.stubEnv('VITE_FCBH_API_KEY', 'test-key-abc123')
    const mod = await import('@/lib/env')
    expect(mod.requireFcbhApiKey()).toBe('test-key-abc123')
  })

  it('isFcbhApiKeyConfigured returns false when absent', async () => {
    vi.stubEnv('VITE_FCBH_API_KEY', '')
    const mod = await import('@/lib/env')
    expect(mod.isFcbhApiKeyConfigured()).toBe(false)
  })

  it('isFcbhApiKeyConfigured returns true when set', async () => {
    vi.stubEnv('VITE_FCBH_API_KEY', 'some-key')
    const mod = await import('@/lib/env')
    expect(mod.isFcbhApiKeyConfigured()).toBe(true)
  })

  it('getFcbhApiKey returns the string when set', async () => {
    vi.stubEnv('VITE_FCBH_API_KEY', 'some-key')
    const mod = await import('@/lib/env')
    expect(mod.getFcbhApiKey()).toBe('some-key')
  })

  it('getFcbhApiKey returns undefined when absent', async () => {
    vi.stubEnv('VITE_FCBH_API_KEY', '')
    const mod = await import('@/lib/env')
    expect(mod.getFcbhApiKey()).toBeUndefined()
  })
})
