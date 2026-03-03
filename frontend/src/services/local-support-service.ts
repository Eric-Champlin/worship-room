import type { SearchParams, SearchResult } from '@/types/local-support'
import { createMockService } from './mock-local-support-service'

export interface LocalSupportService {
  search(params: SearchParams, page: number): Promise<SearchResult>
  geocode(query: string): Promise<{ lat: number; lng: number } | null>
}

// Factory: returns mock service for Phase 1, Google service when API key is available
export function createLocalSupportService(): LocalSupportService {
  // Phase 2: check for Google API key and return Google service if available
  return createMockService()
}
