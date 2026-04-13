import { useRef, useState, useEffect } from 'react'
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
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showFade, setShowFade] = useState(false)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const checkOverflow = () => {
      const hasOverflow = el.scrollWidth > el.clientWidth
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1
      setShowFade(hasOverflow && !atEnd)
    }

    checkOverflow()
    el.addEventListener('scroll', checkOverflow, { passive: true })
    const observer = new ResizeObserver(checkOverflow)
    observer.observe(el)

    return () => {
      el.removeEventListener('scroll', checkOverflow)
      observer.disconnect()
    }
  }, [])

  return (
    <div
      role="toolbar"
      aria-label="Filter prayers by category"
      className="w-full border-b border-white/10 bg-hero-mid/90 backdrop-blur-sm"
    >
      <div className="relative mx-auto max-w-5xl">
        <div
          ref={scrollRef}
          className="flex flex-nowrap gap-2 overflow-x-auto scroll-smooth px-4 py-3 scrollbar-none"
        >
          <button
            type="button"
            onClick={() => {
              onSelectCategory(null)
              if (isChallengeFilterActive && onToggleChallengeFilter) onToggleChallengeFilter()
            }}
            className={cn(
              'min-h-[44px] shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-[colors,transform] duration-fast whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70 active:scale-[0.98]',
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
                'min-h-[44px] shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-[colors,transform] duration-fast whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70 active:scale-[0.98]',
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
                'min-h-[44px] shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-[colors,transform] duration-fast whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70 active:scale-[0.98]',
                activeCategory === cat
                  ? 'border-primary/40 bg-primary/20 text-primary-lt'
                  : 'border-white/15 bg-white/10 text-white/70 hover:bg-white/15 hover:text-white/90',
              )}
              aria-pressed={activeCategory === cat}
            >
              {CATEGORY_LABELS[cat]}
              {showCounts && activeCategory === cat && ` (${categoryCounts[cat]})`}
            </button>
          ))}
        </div>

        {showFade && (
          <div
            className="pointer-events-none absolute right-0 top-0 bottom-0 w-10"
            style={{
              background: 'linear-gradient(to right, transparent, rgba(30, 11, 62, 0.9))',
            }}
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  )
}
