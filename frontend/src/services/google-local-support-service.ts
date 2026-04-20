import type { LocalSupportCategory, SearchParams, SearchResult } from '@/types/local-support'
import type { LocalSupportService } from './local-support-service'
import { requireGoogleMapsApiKey } from '@/lib/env'
import { calculateDistanceMiles } from '@/lib/geo'
import { mapGooglePlaceToLocalSupport, type GooglePlace } from './google-places-mapper'
import { geocodeCache } from './geocode-cache'

const PLACES_TEXT_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText'
const GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json'

const REQUESTED_FIELDS = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.nationalPhoneNumber',
  'places.internationalPhoneNumber',
  'places.websiteUri',
  'places.location',
  'places.rating',
  'places.photos',
  'places.editorialSummary',
  'places.regularOpeningHours',
  'places.types',
  'places.businessStatus',
].join(',')

// Module-level token cache keyed by (lat, lng, radius, keyword). Persists
// across calls within a page load so pagination doesn't re-issue the whole
// search.
const paginationTokens = new Map<string, string | null>()

function paramKey(params: SearchParams): string {
  const normalizedKeyword = params.keyword.trim().toLowerCase()
  return `${params.lat.toFixed(4)},${params.lng.toFixed(4)}:${params.radius}:${normalizedKeyword}`
}

function categoryFromKeyword(keyword: string): LocalSupportCategory {
  const lower = keyword.toLowerCase()
  if (lower.includes('celebrate recovery')) return 'celebrate-recovery'
  if (lower.includes('counselor') || lower.includes('therapist')) return 'counselors'
  return 'churches'
}

function milesToMeters(miles: number): number {
  return miles * 1609.344
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = 10000,
): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

class GoogleLocalSupportService implements LocalSupportService {
  async search(params: SearchParams, page: number): Promise<SearchResult> {
    const apiKey = requireGoogleMapsApiKey()
    const category = categoryFromKeyword(params.keyword)
    const cacheKey = paramKey(params)

    let pageToken: string | null | undefined
    if (page > 0) {
      pageToken = paginationTokens.get(cacheKey)
      if (!pageToken) return { places: [], hasMore: false }
    }

    const body: Record<string, unknown> = {
      textQuery: params.keyword,
      locationBias: {
        circle: {
          center: { latitude: params.lat, longitude: params.lng },
          radius: milesToMeters(params.radius),
        },
      },
      maxResultCount: 20,
    }
    if (pageToken) body.pageToken = pageToken

    const response = await fetchWithTimeout(PLACES_TEXT_SEARCH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': `${REQUESTED_FIELDS},nextPageToken`,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      if (import.meta.env.DEV) {
        const errorText = await response.text().catch(() => '(no body)')
        throw new Error(`Places API error ${response.status}: ${errorText}`)
      }
      throw new Error(`Places API error ${response.status}`)
    }

    const data = (await response.json()) as {
      places?: GooglePlace[]
      nextPageToken?: string
    }

    const places = (data.places ?? [])
      .map((gp) => mapGooglePlaceToLocalSupport(gp, category, apiKey))
      .filter((p): p is NonNullable<typeof p> => p !== null)

    // Google Places API's searchText endpoint only accepts locationBias
    // (soft preference) with a circle — not locationRestriction.circle.
    // To enforce the user's chosen radius as a hard cap, we filter results
    // here. See:
    // https://developers.google.com/maps/documentation/places/web-service/text-search
    const filtered = places.filter((p) => {
      const dist = calculateDistanceMiles(params.lat, params.lng, p.lat, p.lng)
      return dist <= params.radius
    })

    paginationTokens.set(cacheKey, data.nextPageToken ?? null)

    return { places: filtered, hasMore: Boolean(data.nextPageToken) }
  }

  async geocode(query: string): Promise<{ lat: number; lng: number } | null> {
    const cached = geocodeCache.get(query)
    if (cached !== undefined) return cached

    const apiKey = requireGoogleMapsApiKey()
    const url = `${GEOCODE_URL}?address=${encodeURIComponent(query)}&key=${encodeURIComponent(apiKey)}`
    const response = await fetchWithTimeout(url, { method: 'GET' })

    if (!response.ok) {
      throw new Error(`Geocoding API error ${response.status}`)
    }

    const data = (await response.json()) as {
      status: string
      results?: Array<{ geometry: { location: { lat: number; lng: number } } }>
    }

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      geocodeCache.set(query, null)
      return null
    }

    const coords = data.results[0].geometry.location
    geocodeCache.set(query, coords)
    return coords
  }
}

export function createGoogleService(): LocalSupportService {
  return new GoogleLocalSupportService()
}
