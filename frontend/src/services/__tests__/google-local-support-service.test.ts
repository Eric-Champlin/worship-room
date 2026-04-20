import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createGoogleService } from '../google-local-support-service'

vi.mock('@/lib/env', () => ({
  requireGoogleMapsApiKey: () => 'test-api-key',
}))

vi.mock('../geocode-cache', () => ({
  geocodeCache: {
    get: () => undefined,
    set: () => undefined,
  },
}))

describe('GoogleLocalSupportService.search', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ places: [], nextPageToken: undefined }),
        } as unknown as Response),
      ),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('sends locationBias.circle (not locationRestriction) because searchText only supports locationBias for circular geofencing', async () => {
    const service = createGoogleService()

    await service.search(
      { lat: 35.615, lng: -87.035, radius: 25, keyword: 'churches' },
      0,
    )

    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const [, init] = fetchMock.mock.calls[0]
    const body = JSON.parse((init as RequestInit).body as string)

    expect(body).toHaveProperty('locationBias')
    expect(body).not.toHaveProperty('locationRestriction')
    expect(body.locationBias).toEqual({
      circle: {
        center: { latitude: 35.615, longitude: -87.035 },
        radius: 25 * 1609.344,
      },
    })
  })

  it('filters out places beyond the requested radius (client-side hard cap)', async () => {
    // Search center: 35.615, -87.035 (Columbia, TN area)
    // Three mock places at roughly 5mi, 30mi, 100mi from the center.
    // With params.radius = 25, only the 5mi place should survive.
    const center = { lat: 35.615, lng: -87.035 }

    // Approx. 1 degree latitude ≈ 69 miles.
    const fivemi = { lat: center.lat + 5 / 69, lng: center.lng }
    const thirtymi = { lat: center.lat + 30 / 69, lng: center.lng }
    const hundredmi = { lat: center.lat + 100 / 69, lng: center.lng }

    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              places: [
                {
                  id: 'near',
                  displayName: { text: 'Near Church' },
                  formattedAddress: '1 Near St',
                  location: { latitude: fivemi.lat, longitude: fivemi.lng },
                },
                {
                  id: 'mid',
                  displayName: { text: 'Mid Church' },
                  formattedAddress: '1 Mid St',
                  location: { latitude: thirtymi.lat, longitude: thirtymi.lng },
                },
                {
                  id: 'far',
                  displayName: { text: 'Far Church' },
                  formattedAddress: '1 Far St',
                  location: {
                    latitude: hundredmi.lat,
                    longitude: hundredmi.lng,
                  },
                },
              ],
              nextPageToken: undefined,
            }),
        } as unknown as Response),
      ),
    )

    const service = createGoogleService()
    const result = await service.search(
      { lat: center.lat, lng: center.lng, radius: 25, keyword: 'churches' },
      0,
    )

    expect(result.places).toHaveLength(1)
    expect(result.places[0].id).toBe('near')
  })
})
