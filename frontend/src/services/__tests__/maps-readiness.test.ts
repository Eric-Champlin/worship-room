import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  __resetMapsReadinessForTests,
  getMapsReadiness,
} from '../maps-readiness'

describe('getMapsReadiness', () => {
  beforeEach(() => {
    __resetMapsReadinessForTests()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    __resetMapsReadinessForTests()
  })

  it('returns true when health reports googleMaps.configured: true', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              status: 'ok',
              providers: { googleMaps: { configured: true } },
            }),
        } as unknown as Response),
      ),
    )

    await expect(getMapsReadiness()).resolves.toBe(true)
  })

  it('returns false when health reports googleMaps.configured: false', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              status: 'ok',
              providers: { googleMaps: { configured: false } },
            }),
        } as unknown as Response),
      ),
    )

    await expect(getMapsReadiness()).resolves.toBe(false)
  })

  it('returns false when fetch rejects (network down)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('network'))),
    )

    await expect(getMapsReadiness()).resolves.toBe(false)
  })

  it('caches the result after first success (second call does NOT re-fetch)', async () => {
    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            providers: { googleMaps: { configured: true } },
          }),
      } as unknown as Response),
    )
    vi.stubGlobal('fetch', mockFetch)

    await getMapsReadiness()
    await getMapsReadiness()
    await getMapsReadiness()

    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('retries on every call after a failure (does not cache false)', async () => {
    // First probe fails (e.g., backend not ready at page load); second call
    // must re-probe rather than return the stale false. Spec §
    // "services/maps-readiness.ts" — "retries indefinitely on probe failure
    // (network down at app load shouldn't permanently fall back to mock)".
    const mockFetch = vi
      .fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            providers: { googleMaps: { configured: true } },
          }),
      } as unknown as Response)
    vi.stubGlobal('fetch', mockFetch)

    await expect(getMapsReadiness()).resolves.toBe(false)
    await expect(getMapsReadiness()).resolves.toBe(true)
    expect(mockFetch).toHaveBeenCalledTimes(2)
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
                    providers: { googleMaps: { configured: true } },
                  }),
              } as unknown as Response),
            20,
          ),
        ),
    )
    vi.stubGlobal('fetch', mockFetch)

    const results = await Promise.all([
      getMapsReadiness(),
      getMapsReadiness(),
      getMapsReadiness(),
    ])

    expect(results).toEqual([true, true, true])
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
})
