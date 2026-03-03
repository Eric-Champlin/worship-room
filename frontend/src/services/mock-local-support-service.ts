import type { SearchParams, SearchResult, LocalSupportCategory } from '@/types/local-support'
import type { LocalSupportService } from './local-support-service'
import { getMockPlacesByCategory } from '@/mocks/local-support-mock-data'

const PAGE_SIZE = 10

class MockLocalSupportService implements LocalSupportService {
  async search(params: SearchParams, page: number): Promise<SearchResult> {
    // Simulate network delay
    await new Promise((r) => setTimeout(r, 300))

    // Determine category from keyword
    const category = this.keywordToCategory(params.keyword)
    const allPlaces = getMockPlacesByCategory(category)

    const start = page * PAGE_SIZE
    const end = start + PAGE_SIZE
    const places = allPlaces.slice(start, end)

    return {
      places,
      hasMore: end < allPlaces.length,
    }
  }

  async geocode(_query: string): Promise<{ lat: number; lng: number } | null> {
    // Simulate network delay
    await new Promise((r) => setTimeout(r, 200))

    // Phase 1: always return Columbia, TN regardless of input
    return { lat: 35.6151, lng: -87.0353 }
  }

  private keywordToCategory(keyword: string): LocalSupportCategory {
    const lower = keyword.toLowerCase()
    if (lower.includes('celebrate recovery')) return 'celebrate-recovery'
    if (lower.includes('counselor') || lower.includes('therapist')) return 'counselors'
    return 'churches'
  }
}

export function createMockService(): LocalSupportService {
  return new MockLocalSupportService()
}
