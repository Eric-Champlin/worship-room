interface CachedGeocode {
  coords: { lat: number; lng: number } | null
  timestamp: number
}

/**
 * In-memory LRU cache for geocode results. Keyed by lowercased trimmed query.
 * Max size: 50 entries. Evicts oldest on overflow. Negative results cached to
 * prevent typo hammering. Session-scoped — reset on page reload.
 */
class GeocodeCache {
  private cache = new Map<string, CachedGeocode>()
  private readonly MAX_SIZE = 50

  get(query: string): { lat: number; lng: number } | null | undefined {
    const key = this.keyFor(query)
    const entry = this.cache.get(key)
    if (!entry) return undefined
    // Refresh recency (LRU): delete + re-insert moves to end
    this.cache.delete(key)
    this.cache.set(key, entry)
    return entry.coords
  }

  set(query: string, coords: { lat: number; lng: number } | null): void {
    const key = this.keyFor(query)
    if (this.cache.size >= this.MAX_SIZE && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value
      if (firstKey !== undefined) this.cache.delete(firstKey)
    }
    this.cache.set(key, { coords, timestamp: Date.now() })
  }

  clear(): void {
    this.cache.clear()
  }

  private keyFor(query: string): string {
    return query.trim().toLowerCase()
  }
}

export const geocodeCache = new GeocodeCache()
