import type { SearchParams, SearchResult } from '@/types/local-support'
import { isGoogleMapsApiKeyConfigured } from '@/lib/env'
import { createMockService } from './mock-local-support-service'
import { createGoogleService } from './google-local-support-service'

export interface LocalSupportService {
  search(params: SearchParams, page: number): Promise<SearchResult>
  geocode(query: string): Promise<{ lat: number; lng: number } | null>
}

export function createLocalSupportService(): LocalSupportService {
  if (isGoogleMapsApiKeyConfigured()) {
    return createGoogleService()
  }
  return createMockService()
}
