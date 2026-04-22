import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getFcbhReadiness, resetFcbhReadinessCache } from '../fcbh-readiness'

describe('getFcbhReadiness', () => {
  beforeEach(() => {
    resetFcbhReadinessCache()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    resetFcbhReadinessCache()
  })

  it('returns true when health reports fcbh.configured: true', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              status: 'ok',
              providers: { fcbh: { configured: true } },
            }),
        } as unknown as Response),
      ),
    )

    await expect(getFcbhReadiness()).resolves.toBe(true)
  })

  it('returns false when health reports fcbh.configured: false', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              status: 'ok',
              providers: { fcbh: { configured: false } },
            }),
        } as unknown as Response),
      ),
    )

    await expect(getFcbhReadiness()).resolves.toBe(false)
  })

  it('returns false when fetch rejects (network down)', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('network'))))

    await expect(getFcbhReadiness()).resolves.toBe(false)
  })

  it('returns false on non-200 response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) } as unknown as Response),
      ),
    )

    await expect(getFcbhReadiness()).resolves.toBe(false)
  })

  it('returns false on malformed body (no providers field)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        } as unknown as Response),
      ),
    )

    await expect(getFcbhReadiness()).resolves.toBe(false)
  })

  it('caches the result after first call (success OR failure — second call does NOT re-fetch)', async () => {
    // Unlike maps-readiness (which caches-on-success-only), fcbh-readiness
    // caches unconditionally — see module-level comment for rationale.
    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            providers: { fcbh: { configured: true } },
          }),
      } as unknown as Response),
    )
    vi.stubGlobal('fetch', mockFetch)

    await getFcbhReadiness()
    await getFcbhReadiness()
    await getFcbhReadiness()

    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('concurrent calls share a single inflight probe', async () => {
    const mockFetch = vi.fn(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: () =>
                  Promise.resolve({
                    providers: { fcbh: { configured: true } },
                  }),
              } as unknown as Response),
            20,
          ),
        ),
    )
    vi.stubGlobal('fetch', mockFetch)

    const results = await Promise.all([
      getFcbhReadiness(),
      getFcbhReadiness(),
      getFcbhReadiness(),
    ])

    expect(results).toEqual([true, true, true])
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
})
