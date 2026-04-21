import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  __resetPageTokensForTests,
  createGoogleService,
} from '../google-local-support-service'

// Mock the in-memory geocode cache so we can observe cache hits/misses
// deterministically. We reset state between tests.
let geocodeCacheStore = new Map<string, { lat: number; lng: number } | null | undefined>()
vi.mock('../geocode-cache', () => ({
  geocodeCache: {
    get: (k: string) => geocodeCacheStore.get(k),
    set: (k: string, v: { lat: number; lng: number } | null) =>
      geocodeCacheStore.set(k, v),
  },
}))

function mockFetchResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response
}

function stubOk(body: unknown) {
  const fn = vi.fn(() => Promise.resolve(mockFetchResponse(body)))
  vi.stubGlobal('fetch', fn)
  return fn
}

describe('GoogleLocalSupportService.search', () => {
  beforeEach(() => {
    __resetPageTokensForTests()
    geocodeCacheStore = new Map()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('calls the backend proxy with the correct URL and body shape', async () => {
    const fetchSpy = stubOk({ data: { places: [], nextPageToken: null }, meta: {} })

    const service = createGoogleService()
    await service.search(
      { lat: 35.615, lng: -87.035, radius: 25, keyword: 'churches' },
      0,
    )

    const [url, init] = fetchSpy.mock.calls[0]
    expect(url).toContain('/api/v1/proxy/maps/places-search')
    expect(init.method).toBe('POST')
    const parsedBody = JSON.parse(init.body)
    expect(parsedBody).toEqual({
      lat: 35.615,
      lng: -87.035,
      radiusMiles: 25,
      keyword: 'churches',
      pageToken: null,
    })
  })

  it('maps results and applies the hard client-side radius filter', async () => {
    const nearPlace = {
      id: 'near',
      displayName: { text: 'Near Church' },
      formattedAddress: '123 Near St',
      location: { latitude: 35.615, longitude: -87.035 }, // same as query center
      photos: [{ name: 'places/near/photos/1' }],
    }
    const farPlace = {
      id: 'far',
      displayName: { text: 'Far Church' },
      formattedAddress: '999 Far Ave',
      // Paris — far outside any reasonable Middle-TN search radius.
      location: { latitude: 48.85, longitude: 2.35 },
    }
    stubOk({ data: { places: [nearPlace, farPlace], nextPageToken: null }, meta: {} })

    const service = createGoogleService()
    const result = await service.search(
      { lat: 35.615, lng: -87.035, radius: 25, keyword: 'churches' },
      0,
    )

    expect(result.places.map((p) => p.id)).toEqual(['near'])
    expect(result.hasMore).toBe(false)
  })

  it('persists nextPageToken for page 0 and sends it on page 1', async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(mockFetchResponse({
        data: { places: [], nextPageToken: 'PAGE_2_TOKEN' },
        meta: {},
      }))
      .mockResolvedValueOnce(mockFetchResponse({
        data: { places: [], nextPageToken: null },
        meta: {},
      }))
    vi.stubGlobal('fetch', fetchSpy)

    const service = createGoogleService()
    const params = { lat: 35.615, lng: -87.035, radius: 25, keyword: 'churches' }
    await service.search(params, 0)
    await service.search(params, 1)

    const page2Body = JSON.parse(fetchSpy.mock.calls[1][1].body)
    expect(page2Body.pageToken).toBe('PAGE_2_TOKEN')
  })

  it('returns empty result when page > 0 but no token is stored (user requested load-more without first page)', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    const service = createGoogleService()
    const result = await service.search(
      { lat: 35.615, lng: -87.035, radius: 25, keyword: 'churches' },
      1,
    )

    expect(result.places).toEqual([])
    expect(result.hasMore).toBe(false)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('distinct keywords get distinct pagination tokens (isolated state)', async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(mockFetchResponse({
        data: { places: [], nextPageToken: 'CHURCH_TOKEN' },
        meta: {},
      }))
      .mockResolvedValueOnce(mockFetchResponse({
        data: { places: [], nextPageToken: 'COUNSELOR_TOKEN' },
        meta: {},
      }))
      .mockResolvedValueOnce(mockFetchResponse({
        data: { places: [], nextPageToken: null },
        meta: {},
      }))
    vi.stubGlobal('fetch', fetchSpy)

    const service = createGoogleService()
    await service.search({ lat: 1, lng: 1, radius: 10, keyword: 'churches' }, 0)
    await service.search({ lat: 1, lng: 1, radius: 10, keyword: 'counselors' }, 0)
    await service.search({ lat: 1, lng: 1, radius: 10, keyword: 'churches' }, 1)

    const churchesPage2Body = JSON.parse(fetchSpy.mock.calls[2][1].body)
    expect(churchesPage2Body.pageToken).toBe('CHURCH_TOKEN')
  })

  it('propagates backend error message on 400', async () => {
    const fn = vi.fn(() =>
      Promise.resolve(mockFetchResponse(
        { code: 'INVALID_INPUT', message: 'lat: must be >= -90', requestId: 'r' },
        false,
        400,
      )),
    )
    vi.stubGlobal('fetch', fn)

    const service = createGoogleService()
    await expect(
      service.search({ lat: 35.615, lng: -87.035, radius: 25, keyword: 'x' }, 0),
    ).rejects.toThrow('lat: must be >= -90')
  })

  it('propagates backend error message on 429 rate limit', async () => {
    const fn = vi.fn(() =>
      Promise.resolve(mockFetchResponse(
        { code: 'RATE_LIMITED', message: 'Rate limit exceeded. Try again in 42s.', requestId: 'r' },
        false,
        429,
      )),
    )
    vi.stubGlobal('fetch', fn)

    const service = createGoogleService()
    await expect(
      service.search({ lat: 1, lng: 1, radius: 10, keyword: 'x' }, 0),
    ).rejects.toThrow('Rate limit exceeded')
  })

  it('propagates backend 502 UPSTREAM_ERROR message', async () => {
    const fn = vi.fn(() =>
      Promise.resolve(mockFetchResponse(
        { code: 'UPSTREAM_ERROR', message: 'Maps service is temporarily unavailable. Please try again.', requestId: 'r' },
        false,
        502,
      )),
    )
    vi.stubGlobal('fetch', fn)

    const service = createGoogleService()
    await expect(
      service.search({ lat: 1, lng: 1, radius: 10, keyword: 'x' }, 0),
    ).rejects.toThrow('temporarily unavailable')
  })

  it('propagates backend 504 UPSTREAM_TIMEOUT message', async () => {
    const fn = vi.fn(() =>
      Promise.resolve(mockFetchResponse(
        { code: 'UPSTREAM_TIMEOUT', message: 'Maps service timed out. Please try again.', requestId: 'r' },
        false,
        504,
      )),
    )
    vi.stubGlobal('fetch', fn)

    const service = createGoogleService()
    await expect(
      service.search({ lat: 1, lng: 1, radius: 10, keyword: 'x' }, 0),
    ).rejects.toThrow('timed out')
  })

  it('falls back to generic message when backend error body is not JSON', async () => {
    const fn = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('not json')),
      } as unknown as Response),
    )
    vi.stubGlobal('fetch', fn)

    const service = createGoogleService()
    await expect(
      service.search({ lat: 1, lng: 1, radius: 10, keyword: 'x' }, 0),
    ).rejects.toThrow('Maps service error 500')
  })

  it('propagates network errors from fetch', async () => {
    const fn = vi.fn(() => Promise.reject(new Error('Failed to fetch')))
    vi.stubGlobal('fetch', fn)

    const service = createGoogleService()
    await expect(
      service.search({ lat: 1, lng: 1, radius: 10, keyword: 'x' }, 0),
    ).rejects.toThrow('Failed to fetch')
  })

  it('propagates AbortError when fetch is cancelled', async () => {
    // The abort-on-timeout path: fetch rejects with AbortError after the
    // AbortController fires. The service doesn't catch/translate it, so
    // the AbortError propagates out of search().
    const fn = vi.fn(() =>
      Promise.reject(
        Object.assign(new Error('The operation was aborted'), { name: 'AbortError' }),
      ),
    )
    vi.stubGlobal('fetch', fn)

    const service = createGoogleService()
    await expect(
      service.search({ lat: 1, lng: 1, radius: 10, keyword: 'x' }, 0),
    ).rejects.toThrow(/aborted/i)
  })

  it('passes an AbortSignal to fetch so REQUEST_TIMEOUT_MS can cancel it', async () => {
    // fetchWithTimeout wires an AbortController.signal into the fetch init
    // and schedules AbortController.abort() after REQUEST_TIMEOUT_MS. We
    // verify the signal is actually propagated to fetch — that's the
    // wiring that makes the 15s timeout effective in production.
    const fn = vi.fn(() => Promise.resolve(mockFetchResponse(
      { data: { places: [], nextPageToken: null }, meta: {} },
    )))
    vi.stubGlobal('fetch', fn)

    const service = createGoogleService()
    await service.search({ lat: 1, lng: 1, radius: 10, keyword: 'x' }, 0)

    const init = fn.mock.calls[0][1] as RequestInit
    expect(init.signal).toBeInstanceOf(AbortSignal)
    expect(init.signal?.aborted).toBe(false)
  })

  it('resets page tokens via __resetPageTokensForTests helper', async () => {
    stubOk({ data: { places: [], nextPageToken: 'TOK1' }, meta: {} })
    const service = createGoogleService()
    const params = { lat: 1, lng: 1, radius: 10, keyword: 'churches' }
    await service.search(params, 0)

    __resetPageTokensForTests()

    // After reset, page 1 without a prior page 0 should return empty immediately
    const result = await service.search(params, 1)
    expect(result.places).toEqual([])
    expect(result.hasMore).toBe(false)
  })
})

describe('GoogleLocalSupportService.geocode', () => {
  beforeEach(() => {
    __resetPageTokensForTests()
    geocodeCacheStore = new Map()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('calls the backend proxy with URL-encoded query', async () => {
    const fetchSpy = stubOk({ data: { lat: 35.75, lng: -86.93 }, meta: {} })

    const service = createGoogleService()
    await service.geocode('Spring Hill, TN')

    const [url, init] = fetchSpy.mock.calls[0]
    expect(url).toContain('/api/v1/proxy/maps/geocode?query=Spring%20Hill%2C%20TN')
    expect(init.method).toBe('GET')
  })

  it('returns coords on success', async () => {
    stubOk({ data: { lat: 35.75, lng: -86.93 }, meta: {} })
    const service = createGoogleService()
    await expect(service.geocode('Spring Hill')).resolves.toEqual({
      lat: 35.75,
      lng: -86.93,
    })
  })

  it('returns null when backend reports null pair (ZERO_RESULTS)', async () => {
    stubOk({ data: { lat: null, lng: null }, meta: {} })
    const service = createGoogleService()
    await expect(service.geocode('nowhere')).resolves.toBeNull()
  })

  it('treats missing lat/lng fields same as explicit null (backend non-null Jackson omission)', async () => {
    stubOk({ data: {}, meta: {} })
    const service = createGoogleService()
    await expect(service.geocode('nowhere')).resolves.toBeNull()
  })

  it('short-circuits via the client-side cache on repeat lookups', async () => {
    const fetchSpy = stubOk({ data: { lat: 1, lng: 2 }, meta: {} })
    const service = createGoogleService()
    await service.geocode('same query')
    await service.geocode('same query')
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('caches null results too (negative cache)', async () => {
    const fetchSpy = stubOk({ data: { lat: null, lng: null }, meta: {} })
    const service = createGoogleService()
    await service.geocode('typo-xyzzy')
    await service.geocode('typo-xyzzy')
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('propagates 502 UPSTREAM_ERROR from backend', async () => {
    const fn = vi.fn(() =>
      Promise.resolve(mockFetchResponse(
        { code: 'UPSTREAM_ERROR', message: 'Maps service is temporarily unavailable. Please try again.', requestId: 'r' },
        false,
        502,
      )),
    )
    vi.stubGlobal('fetch', fn)

    const service = createGoogleService()
    await expect(service.geocode('anywhere')).rejects.toThrow('temporarily unavailable')
  })
})
