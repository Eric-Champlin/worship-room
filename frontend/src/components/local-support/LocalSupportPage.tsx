import { useState, useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Navbar } from '@/components/Navbar'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import { useAuth } from '@/hooks/useAuth'
import { useFaithPoints } from '@/hooks/useFaithPoints'
import { createLocalSupportService } from '@/services/local-support-service'
import { categoryToPlaceType } from '@/services/local-visit-storage'
import { calculateDistanceMiles } from '@/lib/geo'
import type { LocalSupportPlace, LocalSupportCategory, SortOption } from '@/types/local-support'
import { getMockPlacesByCategory } from '@/mocks/local-support-mock-data'
import { SiteFooter } from '@/components/SiteFooter'
import { LocalSupportHero } from './LocalSupportHero'
import { SearchControls } from './SearchControls'
import { ResultsList } from './ResultsList'
import { ResultsMap } from './ResultsMap'
import { SearchPrompt, NoResults, SearchError, ListingSkeleton } from './SearchStates'
import { List, Map as MapIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface LocalSupportPageConfig {
  category: LocalSupportCategory
  headingId: string
  title: string
  subtitle: string
  extraHeroContent?: ReactNode
  searchKeyword: string
  filterOptions: readonly string[] | null
  filterLabel: string | null
  disclaimer?: string
}

interface LocalSupportPageProps {
  config: LocalSupportPageConfig
}

const service = createLocalSupportService()
const MOCK_DATA_CENTER = { lat: 35.6151, lng: -87.0353 }

function LocalSupportPageContent({ config }: LocalSupportPageProps) {
  const { isAuthenticated } = useAuth()
  const authModal = useAuthModal()
  const { recordActivity } = useFaithPoints()
  const [searchParams, setSearchParams] = useSearchParams()

  const placeType = categoryToPlaceType(config.category)

  const handleVisit = useCallback((_placeId: string, _placeName: string) => {
    recordActivity('localVisit')
  }, [recordActivity])

  // Search state
  const [searchResults, setSearchResults] = useState<LocalSupportPlace[]>(() =>
    isAuthenticated ? [] : getMockPlacesByCategory(config.category),
  )
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(() =>
    isAuthenticated ? null : MOCK_DATA_CENTER,
  )
  const [radius, setRadius] = useState(25)
  const [sortOption, setSortOption] = useState<SortOption>('distance')
  const [filterValue, setFilterValue] = useState<string | null>(null)
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'search' | 'saved'>('search')
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list')
  const [searchState, setSearchState] = useState<'idle' | 'loading' | 'error' | 'success'>(() =>
    isAuthenticated ? 'idle' : 'success',
  )
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [loadMoreError, setLoadMoreError] = useState('')
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])


  // Bookmarks — only persist to localStorage for logged-in users (Q1: demo mode zero-persistence)
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(() => {
    if (!isAuthenticated) return new Set()
    try {
      const stored = localStorage.getItem(`wr_bookmarks_${config.category}`)
      if (stored) {
        const parsed: unknown = JSON.parse(stored)
        if (Array.isArray(parsed)) return new Set(parsed as string[])
      }
      return new Set()
    } catch {
      return new Set()
    }
  })

  // Persist bookmarks to localStorage only for logged-in users
  useEffect(() => {
    if (!isAuthenticated) return
    localStorage.setItem(
      `wr_bookmarks_${config.category}`,
      JSON.stringify([...bookmarkedIds]),
    )
  }, [bookmarkedIds, config.category, isAuthenticated])

  // Read URL params on mount — validate bounds to prevent invalid API calls
  const initialLat = useMemo(() => {
    const raw = searchParams.get('lat')
    if (raw === null) return undefined
    const v = Number(raw)
    return isFinite(v) && v >= -90 && v <= 90 ? v : undefined
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const initialLng = useMemo(() => {
    const raw = searchParams.get('lng')
    if (raw === null) return undefined
    const v = Number(raw)
    return isFinite(v) && v >= -180 && v <= 180 ? v : undefined
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const initialRadius = useMemo(() => {
    const raw = searchParams.get('radius')
    if (raw === null) return undefined
    const v = Number(raw)
    return isFinite(v) && v > 0 && v <= 500 ? v : undefined
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const deepLinkPlaceId = searchParams.get('placeId')

  // Auto-expand deep-linked place
  useEffect(() => {
    if (deepLinkPlaceId && searchResults.length > 0) {
      setSelectedPlaceId(deepLinkPlaceId)
    }
  }, [deepLinkPlaceId, searchResults])

  const handleSearch = useCallback(
    async (lat: number, lng: number, r: number) => {
      setUserCoords({ lat, lng })
      setRadius(r)
      setSearchState('loading')
      setPage(0)

      // Update URL params
      setSearchParams(
        { lat: lat.toFixed(4), lng: lng.toFixed(4), radius: r.toString() },
        { replace: true },
      )

      try {
        const result = await service.search(
          { lat, lng, radius: r, keyword: config.searchKeyword },
          0,
        )
        setSearchResults(result.places)
        setHasMore(result.hasMore)
        setSearchState('success')
      } catch {
        setErrorMessage("We're having trouble connecting to our search service. Please try again in a moment.")
        setSearchState('error')
      }
    },
    [config.searchKeyword, setSearchParams],
  )

  const handleGeocode = useCallback(
    async (query: string) => {
      return service.geocode(query)
    },
    [],
  )

  const handleLoadMore = useCallback(async () => {
    if (!userCoords) return
    setIsLoadingMore(true)
    setLoadMoreError('')
    try {
      const nextPage = page + 1
      const result = await service.search(
        { lat: userCoords.lat, lng: userCoords.lng, radius, keyword: config.searchKeyword },
        nextPage,
      )
      setSearchResults((prev) => [...prev, ...result.places])
      setHasMore(result.hasMore)
      setPage(nextPage)
    } catch {
      setLoadMoreError('Unable to load more results. Please try again.')
    } finally {
      setIsLoadingMore(false)
    }
  }, [userCoords, page, radius, config.searchKeyword])

  const handleToggleBookmark = useCallback((placeId: string) => {
    if (!isAuthenticated) {
      authModal?.openAuthModal('Sign in to bookmark listings')
      return
    }
    setBookmarkedIds((prev) => {
      const next = new Set(prev)
      if (next.has(placeId)) {
        next.delete(placeId)
      } else {
        next.add(placeId)
      }
      return next
    })
  }, [isAuthenticated, authModal])

  const handleRetry = useCallback(() => {
    if (userCoords) {
      handleSearch(userCoords.lat, userCoords.lng, radius)
    }
  }, [userCoords, radius, handleSearch])

  // Bookmarked places for saved tab
  const savedPlaces = useMemo(
    () => searchResults.filter((p) => bookmarkedIds.has(p.id)),
    [searchResults, bookmarkedIds],
  )

  // Distance map — single computation shared by ResultsList and ResultsMap (Q6)
  const distanceMap = useMemo(() => {
    if (!userCoords) return new Map<string, number>()
    const m = new Map<string, number>()
    searchResults.forEach((p) => {
      m.set(p.id, calculateDistanceMiles(userCoords.lat, userCoords.lng, p.lat, p.lng))
    })
    return m
  }, [searchResults, userCoords])

  const mapCenter = userCoords ?? MOCK_DATA_CENTER
  const currentPlaces = activeTab === 'saved' ? savedPlaces : searchResults

  return (
    <div className="flex min-h-screen flex-col bg-dashboard-dark font-sans">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[9999] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <Navbar transparent />
      <LocalSupportHero
        headingId={config.headingId}
        title={config.title}
        subtitle={config.subtitle}
        extraContent={config.extraHeroContent}
      />

        <main id="main-content" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">
          {/* Disclaimer (A9) */}
          {config.disclaimer && (
            <div
              role="note"
              aria-label="Disclaimer"
              className="mb-6 rounded-lg border border-amber-500/30 bg-amber-900/20 px-4 py-3 text-sm text-amber-200"
            >
              {config.disclaimer}
            </div>
          )}

          {/* Search Controls (Q2: pass geocode as prop) */}
          <SearchControls
            onSearch={handleSearch}
            onGeocode={handleGeocode}
            initialLat={initialLat}
            initialLng={initialLng}
            initialRadius={initialRadius}
            isLoading={searchState === 'loading'}
          />

          {/* Tabs (A2: role="tablist" + role="tab" + aria-selected + keyboard nav) */}
          <div className="mt-6 mb-6 flex gap-2" role="tablist" aria-label="Results view">
            {(isAuthenticated ? ['search', 'saved'] as const : ['search'] as const).map((tab, index, tabs) => (
              <button
                key={tab}
                ref={(el) => { tabRefs.current[index] = el }}
                id={`ls-tab-${tab}`}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                aria-controls="ls-tabpanel"
                tabIndex={activeTab === tab ? 0 : -1}
                onClick={() => {
                  setActiveTab(tab)
                }}
                onKeyDown={(e) => {
                  let nextIndex = index
                  if (e.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length
                  else if (e.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length
                  else if (e.key === 'Home') nextIndex = 0
                  else if (e.key === 'End') nextIndex = tabs.length - 1
                  else return
                  e.preventDefault()
                  setActiveTab(tabs[nextIndex])
                  tabRefs.current[nextIndex]?.focus()
                }}
                className={cn(
                  'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                  activeTab === tab
                    ? 'bg-primary/20 text-white'
                    : 'bg-white/10 text-white/60 hover:bg-white/15',
                )}
              >
                {tab === 'search' ? 'Search Results' : `Saved (${bookmarkedIds.size})`}
              </button>
            ))}
          </div>

          {/* Search states (A4: aria-live region) */}
          <div aria-live="polite" aria-atomic="true">
            {activeTab === 'search' && searchState === 'idle' && (
              <SearchPrompt category={config.category} />
            )}
            {activeTab === 'search' && searchState === 'loading' && <ListingSkeleton />}
            {activeTab === 'search' && searchState === 'error' && (
              <SearchError message={errorMessage} onRetry={handleRetry} />
            )}
            {activeTab === 'search' && searchState === 'success' && searchResults.length === 0 && (
              <NoResults radius={radius} category={config.category} />
            )}
            {activeTab === 'search' && searchState === 'success' && searchResults.length > 0 && (
              <span className="sr-only">{searchResults.length} results found</span>
            )}
          </div>

          {/* Results (search or saved) */}
          {((activeTab === 'search' && searchState === 'success' && searchResults.length > 0) ||
            activeTab === 'saved') && (
            <div role="tabpanel" id="ls-tabpanel" aria-labelledby={`ls-tab-${activeTab}`}>
              {/* Desktop: side-by-side */}
              <div className="hidden lg:grid lg:grid-cols-2 lg:gap-6">
                <div className="max-h-[calc(100vh-12rem)] overflow-y-auto pr-2">
                  <ResultsList
                    listId="desktop"
                    places={currentPlaces}
                    userCoords={userCoords}
                    distanceMap={distanceMap}
                    sortOption={sortOption}
                    onSortChange={setSortOption}
                    selectedPlaceId={selectedPlaceId}
                    showBookmark={isAuthenticated}
                    showVisitButton={isAuthenticated}
                    onVisit={handleVisit}
                    placeType={placeType}
                    bookmarkedIds={bookmarkedIds}
                    onToggleBookmark={handleToggleBookmark}
                    hasMore={activeTab === 'search' ? hasMore : false}
                    onLoadMore={handleLoadMore}
                    isLoadingMore={isLoadingMore}
                    loadMoreError={loadMoreError}
                    category={config.category}
                    filterValue={filterValue}
                    onFilterChange={setFilterValue}
                    filterOptions={config.filterOptions}
                    filterLabel={config.filterLabel}
                  />
                </div>
                <div className="sticky top-24 h-[calc(100vh-12rem)]">
                  <ResultsMap
                    places={currentPlaces}
                    center={mapCenter}
                    selectedPlaceId={selectedPlaceId}
                    onSelectPlace={setSelectedPlaceId}
                    distanceMap={distanceMap}
                  />
                </div>
              </div>

              {/* Mobile: toggle (A3: aria-pressed on view toggle buttons) */}
              <div className="lg:hidden">
                <div className="mb-4 flex gap-2">
                  <button
                    type="button"
                    aria-pressed={mobileView === 'list'}
                    onClick={() => setMobileView('list')}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                      mobileView === 'list'
                        ? 'bg-primary/20 text-white'
                        : 'bg-white/10 text-white/60 hover:bg-white/15',
                    )}
                  >
                    <List size={16} aria-hidden="true" />
                    List View
                  </button>
                  <button
                    type="button"
                    aria-pressed={mobileView === 'map'}
                    onClick={() => setMobileView('map')}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                      mobileView === 'map'
                        ? 'bg-primary/20 text-white'
                        : 'bg-white/10 text-white/60 hover:bg-white/15',
                    )}
                  >
                    <MapIcon size={16} aria-hidden="true" />
                    Map View
                  </button>
                </div>
                {mobileView === 'list' ? (
                  <ResultsList
                    listId="mobile"
                    places={currentPlaces}
                    userCoords={userCoords}
                    distanceMap={distanceMap}
                    sortOption={sortOption}
                    onSortChange={setSortOption}
                    selectedPlaceId={selectedPlaceId}
                    showBookmark={isAuthenticated}
                    showVisitButton={isAuthenticated}
                    onVisit={handleVisit}
                    placeType={placeType}
                    bookmarkedIds={bookmarkedIds}
                    onToggleBookmark={handleToggleBookmark}
                    hasMore={activeTab === 'search' ? hasMore : false}
                    onLoadMore={handleLoadMore}
                    isLoadingMore={isLoadingMore}
                    loadMoreError={loadMoreError}
                    category={config.category}
                    filterValue={filterValue}
                    onFilterChange={setFilterValue}
                    filterOptions={config.filterOptions}
                    filterLabel={config.filterLabel}
                  />
                ) : (
                  <ResultsMap
                    places={currentPlaces}
                    center={mapCenter}
                    selectedPlaceId={selectedPlaceId}
                    onSelectPlace={setSelectedPlaceId}
                    distanceMap={distanceMap}
                  />
                )}
              </div>
            </div>
          )}

          {/* Saved tab empty state */}
          {activeTab === 'saved' && savedPlaces.length === 0 && (
            <div className="flex flex-col items-center py-12 text-center">
              <p className="text-base text-white/60">
                No saved {config.category === 'celebrate-recovery' ? 'Celebrate Recovery groups' : config.category} yet.
                Bookmark listings to see them here.
              </p>
            </div>
          )}
        </main>
      <SiteFooter />
    </div>
  )
}

export function LocalSupportPage({ config }: LocalSupportPageProps) {
  return <LocalSupportPageContent config={config} />
}
