import { useState, useMemo, useCallback, useEffect, lazy, Suspense } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMyBibleView, type MyBibleViewId } from '@/hooks/url/useMyBibleView'
import { BookOpen, Paintbrush, PenLine, Bookmark as BookmarkIcon, Filter, Flame, X } from 'lucide-react'
import { StreakDetailModal } from '@/components/bible/streak/StreakDetailModal'
import { useStreakStore } from '@/hooks/bible/useStreakStore'
import { Navbar } from '@/components/Navbar'
import { SiteFooter } from '@/components/SiteFooter'
import { BackgroundCanvas } from '@/components/ui/BackgroundCanvas'
import { SEO, SITE_URL } from '@/components/SEO'
import { MY_BIBLE_METADATA } from '@/lib/seo/routeMetadata'
import { BibleDrawerProvider, useBibleDrawer } from '@/components/bible/BibleDrawerProvider'
import { BibleDrawer } from '@/components/bible/BibleDrawer'
import { DrawerViewRouter } from '@/components/bible/DrawerViewRouter'
import { Button } from '@/components/ui/Button'
import { FeatureEmptyState } from '@/components/ui/FeatureEmptyState'
import { ActivityCard } from '@/components/bible/my-bible/ActivityCard'
import { ActivityActionMenu } from '@/components/bible/my-bible/ActivityActionMenu'
import { ActivityFilterBar } from '@/components/bible/my-bible/ActivityFilterBar'
import { ColorFilterStrip } from '@/components/bible/my-bible/ColorFilterStrip'
import { EmptySearchResults } from '@/components/bible/my-bible/EmptySearchResults'
import { useLongPress } from '@/hooks/bible/useLongPress'
import { useActivityFeed } from '@/hooks/bible/useActivityFeed'
import { navigateToActivityItem } from '@/lib/bible/navigateToActivityItem'
import { BIBLE_BOOKS } from '@/constants/bible'
import { useBibleProgress } from '@/hooks/useBibleProgress'
import { ReadingHeatmap } from '@/components/bible/my-bible/ReadingHeatmap'
import { BibleProgressMap } from '@/components/bible/my-bible/BibleProgressMap'
import { MemorizationDeck } from '@/components/memorize/MemorizationDeck'
import {
  getDailyActivityForLastYear,
  getBibleCoverage,
  countActiveDays,
  countTotalChaptersRead,
  countBooksVisited,
} from '@/lib/heatmap'
import type { ActivityItem, ActivityFilter } from '@/types/my-bible'
import { useAuth } from '@/hooks/useAuth'
import { FrostedCard } from '@/components/homepage/FrostedCard'
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'

const DEVICE_STORAGE_SEEN_KEY = 'wr_mybible_device_storage_seen'

function DeviceLocalStorageBanner() {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(DEVICE_STORAGE_SEEN_KEY) === 'true'
  })

  if (dismissed) return null

  const handleDismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(DEVICE_STORAGE_SEEN_KEY, 'true')
    } catch {
      // localStorage may be unavailable — fail silently
    }
  }

  return (
    <div className="relative z-10 mx-auto max-w-2xl px-4 pt-6">
      <FrostedCard variant="subdued" className="relative">
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss device-local-storage notice"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/[0.06] hover:text-white/80"
        >
          <X size={16} aria-hidden="true" />
        </button>
        <div className="flex flex-col gap-3 pr-10 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-white/70 sm:text-base">
            Your data lives on this device. Sign in to keep it safe across devices.
          </p>
          <Button variant="subtle" size="sm" asChild className="flex-shrink-0">
            <Link to="/?auth=login">Sign in</Link>
          </Button>
        </div>
      </FrostedCard>
    </div>
  )
}

const BibleSettingsModal = lazy(() =>
  import('@/components/bible/my-bible/BibleSettingsModal').then((m) => ({
    default: m.BibleSettingsModal,
  }))
)

const myBibleBreadcrumbs = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
    { '@type': 'ListItem', position: 2, name: 'Study Bible', item: `${SITE_URL}/bible` },
    { '@type': 'ListItem', position: 3, name: 'My Bible' },
  ],
}

const STAT_CARDS = [
  { key: 'highlights' as const, label: 'Highlights', icon: Paintbrush, filterType: 'highlights' as const },
  { key: 'notes' as const, label: 'Notes', icon: PenLine, filterType: 'notes' as const },
  { key: 'bookmarks' as const, label: 'Bookmarks', icon: BookmarkIcon, filterType: 'bookmarks' as const },
] as const

function MyBiblePageInner() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const { isOpen: drawerOpen, close: closeDrawer } = useBibleDrawer()
  const {
    items,
    filter,
    sort,
    setFilter,
    setSort,
    totalCounts,
    bookCounts,
    isEmpty,
    isFilteredEmpty,
    clearFilters,
    getVerseText,
  } = useActivityFeed()

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [streakModalOpen, setStreakModalOpen] = useState(false)
  const { streak: streakRecord, atRisk } = useStreakStore()
  const { progress } = useBibleProgress()
  const [actionMenu, setActionMenu] = useState<{ item: ActivityItem; x: number; y: number } | null>(null)

  // BB-43: Heatmap + Progress Map data
  const dailyActivity = useMemo(() => getDailyActivityForLastYear(), [])
  const activeDays = useMemo(() => countActiveDays(dailyActivity), [dailyActivity])
  const coverage = useMemo(() => getBibleCoverage(progress), [progress])
  const totalChaptersRead = useMemo(() => countTotalChaptersRead(progress), [progress])
  const booksVisited = useMemo(() => countBooksVisited(progress), [progress])

  // BB-38: URL-driven filter type via ?view=<section>. Syncs both directions —
  // URL changes flow into `filter.type` via the useEffect below, and filter
  // type changes from the UI flow back to URL via `handleFilterTypeChange`.
  const { view, setView } = useMyBibleView()

  // Sync URL → filter.type (handles cold-load + browser back/forward)
  useEffect(() => {
    if (filter.type !== view) {
      setFilter({ ...filter, type: view, color: view !== 'highlights' ? 'all' : filter.color })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view])

  // Intercept filter changes from the ActivityFilterBar: if the type changed,
  // route through setView (URL write) — the useEffect above then syncs the
  // filter state. Other filter field changes (book, color, searchQuery) pass
  // through directly.
  const handleFilterChange = useCallback(
    (newFilter: ActivityFilter) => {
      if (newFilter.type !== filter.type) {
        setView(newFilter.type as MyBibleViewId)
      } else {
        setFilter(newFilter)
      }
    },
    [filter.type, setFilter, setView],
  )

  const handleImportComplete = useCallback(() => {
    window.location.reload()
  }, [])

  const handleOpenMenu = useCallback((item: ActivityItem, x: number, y: number) => {
    setActionMenu({ item, x, y })
  }, [])

  const handleCloseMenu = useCallback(() => {
    setActionMenu(null)
  }, [])

  // Derive dynamic subhead
  const subhead = useMemo(() => {
    if (isEmpty) return 'Start reading to build your collection.'
    const parts: string[] = []
    if (totalCounts.highlights > 0) parts.push(`${totalCounts.highlights} highlight${totalCounts.highlights === 1 ? '' : 's'}`)
    if (totalCounts.notes > 0) parts.push(`${totalCounts.notes} note${totalCounts.notes === 1 ? '' : 's'}`)
    if (totalCounts.bookmarks > 0) parts.push(`${totalCounts.bookmarks} bookmark${totalCounts.bookmarks === 1 ? '' : 's'}`)
    const booksCount = totalCounts.booksSet.size
    if (booksCount > 0) parts.push(`across ${booksCount} book${booksCount === 1 ? '' : 's'}`)
    return parts.join(', ')
  }, [isEmpty, totalCounts])

  // Filter type name for empty state
  const filterTypeName = useMemo(() => {
    switch (filter.type) {
      case 'highlights': return 'highlights'
      case 'notes': return 'notes'
      case 'bookmarks': return 'bookmarks'
      case 'daily-hub': return 'meditations'
      default: return 'items'
    }
  }, [filter.type])

  const filterBookName = useMemo(() => {
    if (filter.book === 'all') return 'all books'
    return BIBLE_BOOKS.find((b) => b.slug === filter.book)?.name ?? filter.book
  }, [filter.book])

  const handleColorChange = useCallback(
    (color: ActivityFilter['color']) => {
      setFilter({ ...filter, color })
    },
    [filter, setFilter],
  )

  return (
    <BackgroundCanvas className="flex flex-col font-sans">
      <Navbar transparent />
      <SEO {...MY_BIBLE_METADATA} jsonLd={myBibleBreadcrumbs} />

      <main id="main-content" className="relative z-10 flex-1">
        <section className="relative z-10 w-full px-4 pt-28 pb-12">
          <div className="mx-auto max-w-2xl text-center">
            <h1
              className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl pb-2"
              style={GRADIENT_TEXT_STYLE}
            >
              My Bible
            </h1>
            <p className="mt-3 text-base text-white/60 sm:text-lg">{subhead}</p>
          </div>
        </section>

        {/* Section divider */}
        <div className="mx-auto max-w-6xl border-t border-white/[0.08]" />

        {/* Device-local-storage banner — logged-out only (Spec 8B Change 2c) */}
        {!isAuthenticated && <DeviceLocalStorageBanner />}

        {/* Heatmap + Progress Map (BB-43) */}
        <div className="relative z-10 mx-auto max-w-2xl px-4">
          <div className="py-8">
            <ReadingHeatmap
              dailyActivity={dailyActivity}
              currentStreak={streakRecord.currentStreak}
              activeDays={activeDays}
            />
          </div>

          <div className="border-t border-white/[0.08]" />

          <div className="py-8">
            <BibleProgressMap
              coverage={coverage}
              totalChaptersRead={totalChaptersRead}
              booksVisited={booksVisited}
            />
          </div>

          <div className="border-t border-white/[0.08]" />
        </div>

        {/* BB-45: Memorization Deck */}
        <div className="relative z-10 mx-auto max-w-2xl px-4">
          <div className="py-8">
            <MemorizationDeck />
          </div>
          <div className="border-t border-white/[0.08]" />
        </div>

        {/* Main content */}
        <div className="relative z-10 mx-auto max-w-2xl px-4 pb-16">
          {/* Quick stats row */}
          {!isEmpty && (
            <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto py-6 scrollbar-hide sm:justify-center sm:overflow-visible">
              {STAT_CARDS.map(
                (stat) =>
                  totalCounts[stat.key] > 0 && (
                    <FrostedCard
                      key={stat.key}
                      as="button"
                      onClick={() => setView(stat.filterType as MyBibleViewId)}
                      className="flex min-w-[100px] flex-shrink-0 snap-start flex-col items-center gap-1 rounded-xl !p-3"
                    >
                      <stat.icon size={16} className="text-white/40" aria-hidden="true" />
                      <span className="text-xl font-bold text-white">{totalCounts[stat.key]}</span>
                      <span className="text-xs text-white/50">{stat.label}</span>
                    </FrostedCard>
                  ),
              )}
              {totalCounts.booksSet.size > 0 && (
                <FrostedCard className="flex min-w-[100px] flex-shrink-0 snap-start flex-col items-center gap-1 rounded-xl !p-3">
                  <BookOpen size={16} className="text-white/40" aria-hidden="true" />
                  <span className="text-xl font-bold text-white">{totalCounts.booksSet.size}</span>
                  <span className="text-xs text-white/50">Books</span>
                </FrostedCard>
              )}
              {totalCounts.streak > 0 && (
                <FrostedCard
                  as="button"
                  onClick={() => setStreakModalOpen(true)}
                  className="flex min-w-[100px] flex-shrink-0 snap-start flex-col items-center gap-1 rounded-xl !p-3"
                  aria-label={`Reading streak: ${totalCounts.streak} days. Tap for details.`}
                >
                  <Flame size={16} className="text-white/40" aria-hidden="true" />
                  <span className="text-xl font-bold text-white">{totalCounts.streak}</span>
                  <span className="text-xs text-white/50">Streak</span>
                </FrostedCard>
              )}
            </div>
          )}

          {/* Filter bar */}
          {!isEmpty && (
            <ActivityFilterBar
              filter={filter}
              sort={sort}
              onFilterChange={handleFilterChange}
              onSortChange={setSort}
              bookCounts={bookCounts}
              searchQuery={filter.searchQuery}
              onSearchChange={(q) => setFilter((prev) => ({ ...prev, searchQuery: q }))}
            />
          )}

          {/* Color filter strip */}
          {filter.type === 'highlights' && (
            <ColorFilterStrip activeColor={filter.color} onColorChange={handleColorChange} />
          )}

          {/* Activity feed */}
          {isEmpty ? (
            <div className="py-16">
              <FeatureEmptyState
                icon={BookOpen}
                heading="Your Bible highlights will show up here"
                description="Tap any verse in the reader to highlight, bookmark, or add a note. They'll all be collected here for you."
                ctaLabel="Open the reader"
                ctaHref="/bible"
              />
            </div>
          ) : isFilteredEmpty && filter.searchQuery.trim() ? (
            <EmptySearchResults
              query={filter.searchQuery.trim()}
              onClear={() => setFilter((prev) => ({ ...prev, searchQuery: '' }))}
            />
          ) : isFilteredEmpty ? (
            <div className="py-16">
              <FeatureEmptyState
                icon={Filter}
                heading="No matches"
                description={`No ${filterTypeName} in ${filterBookName} match this filter.`}
                compact
              >
                <Button variant="subtle" size="sm" onClick={clearFilters} className="mt-3">
                  Clear filters
                </Button>
              </FeatureEmptyState>
            </div>
          ) : (
            <div className="space-y-3 pt-4">
              {items.map((item) => (
                <ActivityCardWithActions
                  key={`${item.type}-${item.id}`}
                  item={item}
                  verseText={getVerseText(item.book, item.chapter, item.startVerse, item.endVerse)}
                  onNavigate={() => navigateToActivityItem(navigate, item)}
                  onOpenMenu={handleOpenMenu}
                  searchQuery={filter.searchQuery}
                />
              ))}
            </div>
          )}

          {/* Footer trust signal */}
          <p className="py-8 text-center text-xs text-white/40">
            Stored on this device. Export anytime in{' '}
            <button
              type="button"
              className="text-white/60 underline underline-offset-2 hover:text-white/80"
              onClick={() => setSettingsOpen(true)}
            >
              Settings
            </button>
            .
          </p>
        </div>
      </main>

      <SiteFooter />

      {/* Action menu */}
      {actionMenu && (
        <ActivityActionMenu
          item={actionMenu.item}
          position={{ x: actionMenu.x, y: actionMenu.y }}
          onClose={handleCloseMenu}
          onMutate={handleCloseMenu}
        />
      )}

      {/* Books drawer */}
      <BibleDrawer isOpen={drawerOpen} onClose={closeDrawer} ariaLabel="Books of the Bible">
        <DrawerViewRouter onClose={closeDrawer} />
      </BibleDrawer>

      {/* Settings modal (lazy-loaded) */}
      <Suspense fallback={null}>
        <BibleSettingsModal
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          onImportComplete={handleImportComplete}
        />
      </Suspense>

      {/* Streak detail modal */}
      {streakModalOpen && (
        <StreakDetailModal
          isOpen={streakModalOpen}
          onClose={() => setStreakModalOpen(false)}
          streak={streakRecord}
          atRisk={atRisk}
        />
      )}
    </BackgroundCanvas>
  )
}

interface ActivityCardWithActionsProps {
  item: ActivityItem
  verseText: string | null
  onNavigate: () => void
  onOpenMenu: (item: ActivityItem, x: number, y: number) => void
  searchQuery?: string
}

function ActivityCardWithActions({ item, verseText, onNavigate, onOpenMenu, searchQuery }: ActivityCardWithActionsProps) {
  const longPress = useLongPress((e) => {
    onOpenMenu(item, e.clientX, e.clientY)
  })

  return (
    <ActivityCard
      item={item}
      verseText={verseText}
      onClick={onNavigate}
      onContextMenu={(e) => {
        e.preventDefault()
        onOpenMenu(item, e.clientX, e.clientY)
      }}
      onPointerDown={longPress.onPointerDown}
      onPointerUp={longPress.onPointerUp}
      onPointerMove={longPress.onPointerMove}
      onPointerCancel={longPress.onPointerCancel}
      searchQuery={searchQuery}
    />
  )
}

export default function MyBiblePage() {
  return (
    <BibleDrawerProvider>
      <MyBiblePageInner />
    </BibleDrawerProvider>
  )
}
