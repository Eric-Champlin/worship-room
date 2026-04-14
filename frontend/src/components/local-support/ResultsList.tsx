import { useState, useMemo, useCallback } from 'react'
import { Loader2, SearchX } from 'lucide-react'
import type { LocalSupportPlace, SortOption, LocalSupportCategory } from '@/types/local-support'
import { FeatureEmptyState } from '@/components/ui/FeatureEmptyState'
import { ListingCard } from './ListingCard'
import { ListingShareDropdown, tryWebShare } from './ListingShareDropdown'

interface ResultsListProps {
  listId: string
  places: LocalSupportPlace[]
  userCoords: { lat: number; lng: number } | null
  distanceMap: Map<string, number>
  sortOption: SortOption
  onSortChange: (sort: SortOption) => void
  selectedPlaceId: string | null
  showBookmark?: boolean
  showVisitButton?: boolean
  onVisit?: (placeId: string, placeName: string) => void
  placeType?: 'church' | 'counselor' | 'cr'
  bookmarkedIds: Set<string>
  onToggleBookmark: (placeId: string) => void
  hasMore: boolean
  onLoadMore: () => void
  isLoadingMore: boolean
  loadMoreError?: string
  category: LocalSupportCategory
  filterValue: string | null
  onFilterChange: (value: string | null) => void
  filterOptions: readonly string[] | null
  filterLabel: string | null
}

export function ResultsList({
  listId,
  places,
  distanceMap,
  sortOption,
  onSortChange,
  selectedPlaceId,
  showBookmark = true,
  showVisitButton = false,
  onVisit,
  placeType,
  bookmarkedIds,
  onToggleBookmark,
  hasMore,
  onLoadMore,
  isLoadingMore,
  loadMoreError,
  category,
  filterValue,
  onFilterChange,
  filterOptions,
  filterLabel,
}: ResultsListProps) {
  const [expandedPlaceId, setExpandedPlaceId] = useState<string | null>(null)
  const [shareOpenId, setShareOpenId] = useState<string | null>(null)

  // Filter places
  const filteredPlaces = useMemo(() => {
    if (!filterValue) return places
    return places.filter((place) => {
      if (category === 'churches' && place.denomination) {
        return place.denomination.toLowerCase().includes(filterValue.toLowerCase())
      }
      if (category === 'counselors' && place.specialties) {
        return place.specialties.some((s) =>
          s.toLowerCase().includes(filterValue.toLowerCase()),
        )
      }
      return true
    })
  }, [places, filterValue, category])

  // Sort places
  const sortedPlaces = useMemo(() => {
    const sorted = [...filteredPlaces]
    switch (sortOption) {
      case 'distance':
        sorted.sort((a, b) => {
          const da = distanceMap.get(a.id) ?? Infinity
          const db = distanceMap.get(b.id) ?? Infinity
          return da - db
        })
        break
      case 'rating':
        sorted.sort((a, b) => {
          const ra = a.rating ?? -1
          const rb = b.rating ?? -1
          return rb - ra
        })
        break
      case 'alphabetical':
        sorted.sort((a, b) => a.name.localeCompare(b.name))
        break
    }
    return sorted
  }, [filteredPlaces, sortOption, distanceMap])

  const handleShare = useCallback(
    async (placeId: string) => {
      const place = places.find((p) => p.id === placeId)
      if (!place) return
      const used = await tryWebShare(place.name, category, placeId)
      if (!used) {
        setShareOpenId((prev) => (prev === placeId ? null : placeId))
      }
    },
    [places, category],
  )

  const handleExpand = useCallback((placeId: string) => {
    setExpandedPlaceId((prev) => (prev === placeId ? null : placeId))
  }, [])

  const sortSelectId = `${listId}-sort-select`
  const filterSelectId = `${listId}-filter-select`

  return (
    <div>
      {/* Controls row */}
      <div className="mb-4 flex items-center gap-3">
        <div>
          <label htmlFor={sortSelectId} className="sr-only">Sort by</label>
          <select
            id={sortSelectId}
            value={sortOption}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="rounded-lg border border-white/10 bg-white/[0.08] px-3 py-2 text-sm text-white focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
          >
            <option value="distance">Distance</option>
            <option value="rating">Rating</option>
            <option value="alphabetical">A-Z</option>
          </select>
        </div>

        {filterOptions && filterLabel && (
          <div>
            <label htmlFor={filterSelectId} className="sr-only">{filterLabel}</label>
            <select
              id={filterSelectId}
              value={filterValue ?? ''}
              onChange={(e) => onFilterChange(e.target.value || null)}
              className="rounded-lg border border-white/10 bg-white/[0.08] px-3 py-2 text-sm text-white focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
            >
              <option value="">All {filterLabel}s</option>
              {filterOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Card list */}
      <div className="space-y-4">
        {sortedPlaces.map((place) => (
          <div key={place.id} className="relative">
            <ListingCard
              place={place}
              distance={distanceMap.get(place.id) ?? null}
              isBookmarked={bookmarkedIds.has(place.id)}
              isHighlighted={selectedPlaceId === place.id}
              showBookmark={showBookmark}
              showVisitButton={showVisitButton}
              onVisit={onVisit}
              placeType={placeType}
              category={category}
              onToggleBookmark={onToggleBookmark}
              onShare={handleShare}
              onExpand={handleExpand}
              isExpanded={expandedPlaceId === place.id}
              listId={listId}
            />
            {shareOpenId === place.id && (
              <ListingShareDropdown
                placeId={place.id}
                placeName={place.name}
                category={category}
                isOpen={true}
                onClose={() => setShareOpenId(null)}
              />
            )}
          </div>
        ))}
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-6 py-3 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 disabled:opacity-50"
          >
            {isLoadingMore && <Loader2 size={16} className="motion-safe:animate-spin" aria-hidden="true" />}
            Load More
          </button>
          {loadMoreError && (
            <p role="alert" className="mt-2 text-sm text-danger">
              {loadMoreError}
            </p>
          )}
        </div>
      )}

      {/* Empty filtered state */}
      {sortedPlaces.length === 0 && places.length > 0 && (
        <FeatureEmptyState
          icon={SearchX}
          heading="No matching results"
          description={`No results match the selected filter. Try selecting a different ${filterLabel?.toLowerCase() ?? 'option'}.`}
          compact
        />
      )}
    </div>
  )
}
