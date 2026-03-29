import { cn } from '@/lib/utils'
import { PRAYER_CATEGORIES, CATEGORY_LABELS, type PrayerCategory } from '@/constants/prayer-categories'

interface ChallengeFilterInfo {
  id: string
  title: string
  color: string
}

interface CategoryFilterBarProps {
  activeCategory: PrayerCategory | null
  onSelectCategory: (category: PrayerCategory | null) => void
  categoryCounts: Record<PrayerCategory, number>
  showCounts: boolean
  challengeFilter?: ChallengeFilterInfo | null
  isChallengeFilterActive?: boolean
  onToggleChallengeFilter?: () => void
}

export function CategoryFilterBar({
  activeCategory,
  onSelectCategory,
  categoryCounts,
  showCounts,
  challengeFilter,
  isChallengeFilterActive = false,
  onToggleChallengeFilter,
}: CategoryFilterBarProps) {
  return (
    <div
      role="toolbar"
      aria-label="Filter prayers by category"
      className="w-full border-b border-white/10 bg-hero-mid/90 backdrop-blur-sm"
    >
      <div className="mx-auto flex max-w-[720px] gap-2 overflow-x-auto px-4 py-3 scrollbar-none lg:flex-wrap lg:overflow-visible">
        <button
          type="button"
          onClick={() => {
            onSelectCategory(null)
            if (isChallengeFilterActive && onToggleChallengeFilter) onToggleChallengeFilter()
          }}
          className={cn(
            'min-h-[44px] shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors duration-150 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70',
            activeCategory === null && !isChallengeFilterActive
              ? 'border-primary/40 bg-primary/20 text-primary-lt'
              : 'border-white/15 bg-white/10 text-white/70 hover:bg-white/15 hover:text-white/90',
          )}
          aria-pressed={activeCategory === null && !isChallengeFilterActive}
        >
          All
        </button>

        {challengeFilter && onToggleChallengeFilter && (
          <button
            type="button"
            onClick={() => {
              if (!isChallengeFilterActive) {
                onSelectCategory(null)
              }
              onToggleChallengeFilter()
            }}
            className={cn(
              'min-h-[44px] shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors duration-150 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70',
              !isChallengeFilterActive && 'border-white/15 bg-white/10 text-white/70 hover:bg-white/15 hover:text-white/90',
            )}
            style={isChallengeFilterActive ? {
              color: challengeFilter.color,
              borderColor: `${challengeFilter.color}66`,
              backgroundColor: `${challengeFilter.color}33`,
            } : undefined}
            aria-pressed={isChallengeFilterActive}
          >
            {challengeFilter.title} Prayers
          </button>
        )}

        {PRAYER_CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => {
              onSelectCategory(cat)
              if (isChallengeFilterActive && onToggleChallengeFilter) onToggleChallengeFilter()
            }}
            className={cn(
              'min-h-[44px] shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors duration-150 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70',
              activeCategory === cat
                ? 'border-primary/40 bg-primary/20 text-primary-lt'
                : 'border-white/15 bg-white/10 text-white/70 hover:bg-white/15 hover:text-white/90',
            )}
            aria-pressed={activeCategory === cat}
          >
            {CATEGORY_LABELS[cat]}
            {showCounts && ` (${categoryCounts[cat]})`}
          </button>
        ))}
      </div>
    </div>
  )
}
