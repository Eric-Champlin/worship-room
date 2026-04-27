import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Tests for the typed env-accessor module at `lib/env.ts`.
//
// `lib/env.ts` reads `import.meta.env.VITE_*` values into module-scope
// constants at first import. To exercise different env values, each test:
//   1. Calls `vi.stubEnv(name, value)` to set the value (or undefined to delete)
//   2. Dynamically imports the module via `loadEnv()` so the constants are
//      reinitialized from the freshly stubbed env
//
// `vi.resetModules()` in beforeEach drops the cached module so the next
// dynamic import re-evaluates module-scope code. `vi.unstubAllEnvs()` in
// afterEach restores the env to the pre-test state, isolating tests from one
// another regardless of what was in the developer's local `.env.local`.
//
// Pattern matches `lib/audio/__tests__/dbp-client.test.ts` and
// `lib/bible/__tests__/streakStore.test.ts`.

async function loadEnv() {
  return await import('../env')
}

describe('isBackendActivityEnabled (Spec 2.7 — Frontend Activity Dual-Write)', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it("returns true for the exact string 'true'", async () => {
    vi.stubEnv('VITE_USE_BACKEND_ACTIVITY', 'true')
    const { isBackendActivityEnabled } = await loadEnv()
    expect(isBackendActivityEnabled()).toBe(true)
  })

  it("returns false for the exact string 'false'", async () => {
    vi.stubEnv('VITE_USE_BACKEND_ACTIVITY', 'false')
    const { isBackendActivityEnabled } = await loadEnv()
    expect(isBackendActivityEnabled()).toBe(false)
  })

  it('returns false for the empty string (fail-closed)', async () => {
    vi.stubEnv('VITE_USE_BACKEND_ACTIVITY', '')
    const { isBackendActivityEnabled } = await loadEnv()
    expect(isBackendActivityEnabled()).toBe(false)
  })

  it('returns false when the env variable is unset (fail-closed)', async () => {
    // Explicitly delete the env entry rather than relying on whatever the
    // developer's local .env.local contains. Vitest 4.x's stubEnv signature
    // accepts `undefined` to delete the key.
    vi.stubEnv('VITE_USE_BACKEND_ACTIVITY', undefined)
    const { isBackendActivityEnabled } = await loadEnv()
    expect(isBackendActivityEnabled()).toBe(false)
  })

  it("returns false for 'TRUE' (case-sensitive comparison)", async () => {
    vi.stubEnv('VITE_USE_BACKEND_ACTIVITY', 'TRUE')
    const { isBackendActivityEnabled } = await loadEnv()
    expect(isBackendActivityEnabled()).toBe(false)
  })

  it("returns false for '1' (no implicit truthy-string coercion)", async () => {
    vi.stubEnv('VITE_USE_BACKEND_ACTIVITY', '1')
    const { isBackendActivityEnabled } = await loadEnv()
    expect(isBackendActivityEnabled()).toBe(false)
  })

  it("returns false for 'yes' (no alternate truthy spellings)", async () => {
    vi.stubEnv('VITE_USE_BACKEND_ACTIVITY', 'yes')
    const { isBackendActivityEnabled } = await loadEnv()
    expect(isBackendActivityEnabled()).toBe(false)
  })
})

describe('isBackendFriendsEnabled (Spec 2.5.4 — Frontend Friends Dual-Write)', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it("returns true for the exact string 'true'", async () => {
    vi.stubEnv('VITE_USE_BACKEND_FRIENDS', 'true')
    const { isBackendFriendsEnabled } = await loadEnv()
    expect(isBackendFriendsEnabled()).toBe(true)
  })

  it("returns false for the exact string 'false'", async () => {
    vi.stubEnv('VITE_USE_BACKEND_FRIENDS', 'false')
    const { isBackendFriendsEnabled } = await loadEnv()
    expect(isBackendFriendsEnabled()).toBe(false)
  })

  it('returns false for the empty string (fail-closed)', async () => {
    vi.stubEnv('VITE_USE_BACKEND_FRIENDS', '')
    const { isBackendFriendsEnabled } = await loadEnv()
    expect(isBackendFriendsEnabled()).toBe(false)
  })

  it('returns false when the env variable is unset (fail-closed)', async () => {
    vi.stubEnv('VITE_USE_BACKEND_FRIENDS', undefined)
    const { isBackendFriendsEnabled } = await loadEnv()
    expect(isBackendFriendsEnabled()).toBe(false)
  })

  it("returns false for 'TRUE' (case-sensitive comparison)", async () => {
    vi.stubEnv('VITE_USE_BACKEND_FRIENDS', 'TRUE')
    const { isBackendFriendsEnabled } = await loadEnv()
    expect(isBackendFriendsEnabled()).toBe(false)
  })

  it("returns false for '1' (no implicit truthy-string coercion)", async () => {
    vi.stubEnv('VITE_USE_BACKEND_FRIENDS', '1')
    const { isBackendFriendsEnabled } = await loadEnv()
    expect(isBackendFriendsEnabled()).toBe(false)
  })
})
