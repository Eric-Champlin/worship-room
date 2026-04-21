import type { SearchParams, SearchResult } from '@/types/local-support'
import { getMapsReadiness } from './maps-readiness'
import { createMockService } from './mock-local-support-service'
import { createGoogleService } from './google-local-support-service'

export interface LocalSupportService {
  search(params: SearchParams, page: number): Promise<SearchResult>
  geocode(query: string): Promise<{ lat: number; lng: number } | null>
}

/**
 * Resolves to the real Google-backed service when the backend reports the
 * Maps API as configured, or the mock service otherwise. The readiness probe
 * hits {@code /api/v1/health} once at first call and caches the result for
 * the session; see {@link getMapsReadiness}.
 */
export async function createLocalSupportService(): Promise<LocalSupportService> {
  const ready = await getMapsReadiness()
  if (ready) {
    return createGoogleService()
  }
  return createMockService()
}
