import { cn } from '@/lib/utils'
import { PRAYER_CATEGORIES, CATEGORY_LABELS, type PrayerCategory } from '@/constants/prayer-categories'

interface CategoryFilterBarProps {
  activeCategory: PrayerCategory | null
  onSelectCategory: (category: PrayerCategory | null) => void
  categoryCounts: Record<PrayerCategory, number>
  showCounts: boolean
}

export function CategoryFilterBar({
  activeCategory,
  onSelectCategory,
  categoryCounts,
  showCounts,
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
          onClick={() => onSelectCategory(null)}
          className={cn(
            'min-h-[44px] shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors duration-150 whitespace-nowrap',
            activeCategory === null
              ? 'border-primary/40 bg-primary/20 text-primary-lt'
              : 'border-white/15 bg-white/10 text-white/70 hover:bg-white/15 hover:text-white/90',
          )}
          aria-pressed={activeCategory === null}
        >
          All
        </button>
        {PRAYER_CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => onSelectCategory(cat)}
            className={cn(
              'min-h-[44px] shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors duration-150 whitespace-nowrap',
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
