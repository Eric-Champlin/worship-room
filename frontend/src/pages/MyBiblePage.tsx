import { useState, useMemo, useCallback, useEffect, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMyBibleView, type MyBibleViewId } from '@/hooks/url/useMyBibleView'
import { BookOpen, Paintbrush, PenLine, Bookmark as BookmarkIcon, Filter, Flame } from 'lucide-react'
import { StreakDetailModal } from '@/components/bible/streak/StreakDetailModal'
import { useStreakStore } from '@/hooks/bible/useStreakStore'
import { Layout } from '@/components/Layout'
import { SEO, SITE_URL } from '@/components/SEO'
import { MY_BIBLE_METADATA } from '@/lib/seo/routeMetadata'
import { BibleLandingOrbs } from '@/components/bible/landing/BibleLandingOrbs'
import { BibleDrawerProvider, useBibleDrawer } from '@/components/bible/BibleDrawerProvider'
import { BibleDrawer } from '@/components/bible/BibleDrawer'
import { DrawerViewRouter } from '@/components/bible/DrawerViewRouter'
import { SectionHeading } from '@/components/homepage/SectionHeading'
import { FeatureEmptyState } from '@/components/ui/FeatureEmptyState'
import { ATMOSPHERIC_HERO_BG } from '@/components/PageHero'
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
    { '@type': 'ListItem', position: 2, name: 'Bible', item: `${SITE_URL}/bible` },
    { '@type': 'ListItem', position: 3, name: 'My Bible' },
  ],
}

const STAT_CARDS = [
  { key: 'highlights' as const, label: 'Highlights', icon: Paintbrush, filterType: 'highlights' as const },
  { key: 'notes' as const, label: 'Notes', icon: PenLine, filterType: 'notes' as const },
  { key: 'bookmarks' as const, label: 'Bookmarks', icon: BookmarkIcon, filterType: 'bookmarks' as const },
] as const

function MyBiblePageInner() {
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
    if (isEmpty) return 'Nothing yet. Tap a verse in the reader to start.'
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
    <Layout>
      <SEO {...MY_BIBLE_METADATA} jsonLd={myBibleBreadcrumbs} />
      <div className="relative min-h-screen max-w-[100vw] overflow-hidden bg-dashboard-dark">
        <BibleLandingOrbs />

        {/* Hero section */}
        <section className="relative z-10 w-full px-4 pb-8 pt-24 sm:pt-28" style={ATMOSPHERIC_HERO_BG}>
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="sr-only">My Bible</h1>
            <SectionHeading topLine="My Bible" bottomLine="everything you've marked" className="[&_span:last-child]:max-w-full [&_span:last-child]:break-words [&_span:last-child]:!text-3xl [&_span:last-child]:sm:!text-4xl" />
            <p className="mt-3 text-base text-white/60 sm:text-lg">{subhead}</p>
          </div>
        </section>

        {/* Section divider */}
        <div className="mx-auto max-w-6xl border-t border-white/[0.08]" />

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
                    <button
                      key={stat.key}
                      type="button"
                      onClick={() => setView(stat.filterType as MyBibleViewId)}
                      className="flex min-w-[100px] flex-shrink-0 snap-start flex-col items-center gap-1 rounded-xl border border-white/[0.12] bg-white/[0.06] px-4 py-3 backdrop-blur-sm transition-[colors,transform] duration-fast hover:border-white/[0.18] hover:bg-white/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 active:scale-[0.98]"
                    >
                      <stat.icon size={16} className="text-white/40" aria-hidden="true" />
                      <span className="text-xl font-bold text-white">{totalCounts[stat.key]}</span>
                      <span className="text-xs text-white/50">{stat.label}</span>
                    </button>
                  ),
              )}
              {totalCounts.booksSet.size > 0 && (
                <div className="flex min-w-[100px] flex-shrink-0 snap-start flex-col items-center gap-1 rounded-xl border border-white/[0.12] bg-white/[0.06] px-4 py-3 backdrop-blur-sm">
                  <BookOpen size={16} className="text-white/40" aria-hidden="true" />
                  <span className="text-xl font-bold text-white">{totalCounts.booksSet.size}</span>
                  <span className="text-xs text-white/50">Books</span>
                </div>
              )}
              {totalCounts.streak > 0 && (
                <button
                  type="button"
                  onClick={() => setStreakModalOpen(true)}
                  className="flex min-w-[100px] flex-shrink-0 snap-start flex-col items-center gap-1 rounded-xl border border-white/[0.12] bg-white/[0.06] px-4 py-3 backdrop-blur-sm transition-[colors,transform] duration-fast hover:bg-white/[0.09] min-h-[44px] active:scale-[0.98]"
                  aria-label={`Reading streak: ${totalCounts.streak} days. Tap for details.`}
                >
                  <Flame size={16} className="text-white/40" aria-hidden="true" />
                  <span className="text-xl font-bold text-white">{totalCounts.streak}</span>
                  <span className="text-xs text-white/50">Streak</span>
                </button>
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
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-3 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-[colors,transform] duration-fast hover:bg-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 active:scale-[0.98]"
                >
                  Clear filters
                </button>
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
      </div>

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
    </Layout>
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
