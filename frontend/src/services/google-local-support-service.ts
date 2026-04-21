import type { LocalSupportCategory, SearchParams, SearchResult } from '@/types/local-support'
import type { LocalSupportService } from './local-support-service'
import { calculateDistanceMiles } from '@/lib/geo'
import { mapGooglePlaceToLocalSupport, type GooglePlace } from './google-places-mapper'
import { geocodeCache } from './geocode-cache'

const PROXY_BASE = `${import.meta.env.VITE_API_BASE_URL}/api/v1/proxy/maps`
const PROXY_PLACES_SEARCH_URL = `${PROXY_BASE}/places-search`
const PROXY_GEOCODE_URL = `${PROXY_BASE}/geocode`

// Backend upstream timeout is 10s; client gives an extra 5s of slack so the
// user-facing error is an actual upstream failure, not a preemptive abort.
const REQUEST_TIMEOUT_MS = 15000

// Module-level map of (searchParamsKey → nextPageToken). The backend is
// stateless; it returns nextPageToken per response and we pass it back in
// the subsequent "load more" request. Mirrors the pre-migration behavior so
// the UI contract is unchanged.
const pageTokens = new Map<string, string | null>()

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

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

async function readBackendError(response: Response): Promise<string> {
  // Backend errors follow the ProxyError shape: {code, message, requestId, timestamp}.
  // Read defensively — a misconfigured proxy or disconnected network might strip
  // the body or serve non-JSON content.
  try {
    const data = await response.json()
    return typeof data?.message === 'string'
      ? data.message
      : `Maps service error ${response.status}`
  } catch {
    return `Maps service error ${response.status}`
  }
}

class GoogleLocalSupportService implements LocalSupportService {
  async search(params: SearchParams, page: number): Promise<SearchResult> {
    const category = categoryFromKeyword(params.keyword)
    const cacheKey = paramKey(params)

    let pageToken: string | null | undefined
    if (page > 0) {
      pageToken = pageTokens.get(cacheKey)
      if (!pageToken) return { places: [], hasMore: false }
    }

    const body = {
      lat: params.lat,
      lng: params.lng,
      radiusMiles: params.radius,
      keyword: params.keyword,
      pageToken: pageToken ?? null,
    }

    const response = await fetchWithTimeout(PROXY_PLACES_SEARCH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error(await readBackendError(response))
    }

    const envelope = (await response.json()) as {
      data: { places?: GooglePlace[]; nextPageToken?: string | null }
      meta?: { requestId?: string }
    }

    const places = (envelope.data.places ?? [])
      .map((gp) => mapGooglePlaceToLocalSupport(gp, category))
      .filter((p): p is NonNullable<typeof p> => p !== null)

    // Google's locationBias is a soft preference, so we enforce the user's
    // chosen radius as a hard client-side cap. Backend passes the circle as
    // locationBias; this filter is unchanged from the pre-migration behavior.
    const filtered = places.filter((p) => {
      const dist = calculateDistanceMiles(params.lat, params.lng, p.lat, p.lng)
      return dist <= params.radius
    })

    pageTokens.set(cacheKey, envelope.data.nextPageToken ?? null)
    return { places: filtered, hasMore: Boolean(envelope.data.nextPageToken) }
  }

  async geocode(query: string): Promise<{ lat: number; lng: number } | null> {
    const cached = geocodeCache.get(query)
    if (cached !== undefined) return cached

    const url = `${PROXY_GEOCODE_URL}?query=${encodeURIComponent(query)}`
    const response = await fetchWithTimeout(url, { method: 'GET' })

    if (!response.ok) {
      throw new Error(await readBackendError(response))
    }

    const envelope = (await response.json()) as {
      data: { lat: number | null; lng: number | null }
      meta?: { requestId?: string }
    }

    const result =
      envelope.data.lat == null || envelope.data.lng == null
        ? null
        : { lat: envelope.data.lat, lng: envelope.data.lng }

    geocodeCache.set(query, result)
    return result
  }
}

export function createGoogleService(): LocalSupportService {
  return new GoogleLocalSupportService()
}

/** Test-only: clear the page-token map between tests. */
export function __resetPageTokensForTests(): void {
  pageTokens.clear()
}
