import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Paintbrush, PenLine, Bookmark as BookmarkIcon, Filter, Flame } from 'lucide-react'
import { Layout } from '@/components/Layout'
import { SEO, SITE_URL } from '@/components/SEO'
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
import { useLongPress } from '@/hooks/bible/useLongPress'
import { useActivityFeed } from '@/hooks/bible/useActivityFeed'
import { navigateToActivityItem } from '@/lib/bible/navigateToActivityItem'
import { BIBLE_BOOKS } from '@/constants/bible'
import type { ActivityItem, ActivityFilter } from '@/types/my-bible'

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

  const [actionMenu, setActionMenu] = useState<{ item: ActivityItem; x: number; y: number } | null>(null)

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
      <SEO
        title="My Bible"
        description="Your highlights, notes, and bookmarks — all in one place. Stored locally, no account needed."
        jsonLd={myBibleBreadcrumbs}
      />
      <div className="relative min-h-screen max-w-[100vw] overflow-hidden bg-dashboard-dark">
        <BibleLandingOrbs />

        {/* Hero section */}
        <section className="relative z-10 w-full px-4 pb-8 pt-24 sm:pt-28" style={ATMOSPHERIC_HERO_BG}>
          <div className="mx-auto max-w-2xl text-center">
            <SectionHeading topLine="My Bible" bottomLine="everything you've marked" />
            <p className="mt-3 text-base text-white/60 sm:text-lg">{subhead}</p>
          </div>
        </section>

        {/* Section divider */}
        <div className="mx-auto max-w-6xl border-t border-white/[0.08]" />

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
                      onClick={() => setFilter({ ...filter, type: stat.filterType })}
                      className="flex min-w-[100px] flex-shrink-0 snap-start flex-col items-center gap-1 rounded-xl border border-white/[0.12] bg-white/[0.06] px-4 py-3 backdrop-blur-sm transition-colors hover:border-white/[0.18] hover:bg-white/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                    >
                      <stat.icon size={16} className="text-white/40" />
                      <span className="text-xl font-bold text-white">{totalCounts[stat.key]}</span>
                      <span className="text-xs text-white/50">{stat.label}</span>
                    </button>
                  ),
              )}
              {totalCounts.booksSet.size > 0 && (
                <div className="flex min-w-[100px] flex-shrink-0 snap-start flex-col items-center gap-1 rounded-xl border border-white/[0.12] bg-white/[0.06] px-4 py-3 backdrop-blur-sm">
                  <BookOpen size={16} className="text-white/40" />
                  <span className="text-xl font-bold text-white">{totalCounts.booksSet.size}</span>
                  <span className="text-xs text-white/50">Books</span>
                </div>
              )}
              {totalCounts.streak > 0 && (
                <div className="flex min-w-[100px] flex-shrink-0 snap-start flex-col items-center gap-1 rounded-xl border border-white/[0.12] bg-white/[0.06] px-4 py-3 backdrop-blur-sm">
                  <Flame size={16} className="text-white/40" />
                  <span className="text-xl font-bold text-white">{totalCounts.streak}</span>
                  <span className="text-xs text-white/50">Streak</span>
                </div>
              )}
            </div>
          )}

          {/* Filter bar */}
          {!isEmpty && (
            <ActivityFilterBar
              filter={filter}
              sort={sort}
              onFilterChange={setFilter}
              onSortChange={setSort}
              bookCounts={bookCounts}
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
                heading="Nothing here yet."
                description="Tap a verse in the reader and choose Highlight, Bookmark, or Note. They'll show up here."
                ctaLabel="Open the reader"
                ctaHref="/bible"
              />
            </div>
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
                  className="mt-3 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
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
                />
              ))}
            </div>
          )}

          {/* Footer trust signal */}
          <p className="py-8 text-center text-xs text-white/40">
            Stored on this device. Export anytime in Settings.
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
    </Layout>
  )
}

interface ActivityCardWithActionsProps {
  item: ActivityItem
  verseText: string | null
  onNavigate: () => void
  onOpenMenu: (item: ActivityItem, x: number, y: number) => void
}

function ActivityCardWithActions({ item, verseText, onNavigate, onOpenMenu }: ActivityCardWithActionsProps) {
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
