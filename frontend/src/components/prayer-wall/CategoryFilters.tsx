import { cn } from '@/lib/utils'
import { CATEGORY_LABELS, type PrayerCategory } from '@/constants/prayer-categories'
import { POST_TYPES, type PostType } from '@/constants/post-types'

// 8 topics per brief Section 3. Excludes 'discussion' (also a post type — UX
// confusion) and 'other' (catch-all, no user-friendly meaning).
const TOPIC_FILTERS: ReadonlyArray<PrayerCategory> = [
  'health',
  'mental-health',
  'family',
  'work',
  'grief',
  'gratitude',
  'praise',
  'relationships',
]

interface CategoryFiltersProps {
  activeCategory: PrayerCategory | null
  activePostType: PostType | null
  onSelectCategory: (category: PrayerCategory | null) => void
  onSelectPostType: (postType: PostType | null) => void
  /** 'desktop' renders stacked sidebar list; 'mobile' renders horizontal chip row. */
  variant: 'desktop' | 'mobile'
}

/**
 * Prayer Wall Redesign (2026-05-13) — unified post-type + topic filter.
 * Single-select. Tapping any specific filter clears the OTHER axis (post-type
 * clears active topic and vice versa). Tapping "All" clears both.
 */
export function CategoryFilters({
  activeCategory,
  activePostType,
  onSelectCategory,
  onSelectPostType,
  variant,
}: CategoryFiltersProps) {
  const noneActive = activeCategory === null && activePostType === null

  const handleAll = () => {
    onSelectCategory(null)
    onSelectPostType(null)
  }

  const handleType = (t: PostType) => {
    onSelectCategory(null)
    onSelectPostType(t)
  }

  const handleTopic = (c: PrayerCategory) => {
    onSelectPostType(null)
    onSelectCategory(c)
  }

  if (variant === 'mobile') {
    return (
      <nav aria-label="Filter prayer wall posts" className="w-full">
        <div className="flex flex-nowrap gap-2 overflow-x-auto scroll-smooth px-4 py-3 scrollbar-none">
          <FilterChip
            label="All"
            active={noneActive}
            onClick={handleAll}
            ariaPressed={noneActive}
          />
          {POST_TYPES.filter((t) => t.enabled).map((t) => (
            <FilterChip
              key={t.id}
              label={t.pluralLabel}
              active={activePostType === t.id}
              onClick={() => handleType(t.id)}
              ariaPressed={activePostType === t.id}
            />
          ))}
          {TOPIC_FILTERS.map((c) => (
            <FilterChip
              key={c}
              label={CATEGORY_LABELS[c]}
              active={activeCategory === c}
              onClick={() => handleTopic(c)}
              ariaPressed={activeCategory === c}
            />
          ))}
        </div>
      </nav>
    )
  }

  return (
    <nav aria-label="Filter prayer wall posts" className="flex flex-col gap-1">
      <h3 className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-white/50">
        Filter posts
      </h3>
      <FilterRow
        label="All posts"
        active={noneActive}
        onClick={handleAll}
        ariaPressed={noneActive}
      />

      <h4 className="mt-4 px-3 pb-1 text-xs font-medium uppercase tracking-wider text-white/40">
        By type
      </h4>
      {POST_TYPES.filter((t) => t.enabled).map((t) => (
        <FilterRow
          key={t.id}
          label={t.pluralLabel}
          active={activePostType === t.id}
          onClick={() => handleType(t.id)}
          ariaPressed={activePostType === t.id}
        />
      ))}

      <h4 className="mt-4 px-3 pb-1 text-xs font-medium uppercase tracking-wider text-white/40">
        By topic
      </h4>
      {TOPIC_FILTERS.map((c) => (
        <FilterRow
          key={c}
          label={CATEGORY_LABELS[c]}
          active={activeCategory === c}
          onClick={() => handleTopic(c)}
          ariaPressed={activeCategory === c}
        />
      ))}
    </nav>
  )
}

interface FilterButtonProps {
  label: string
  active: boolean
  onClick: () => void
  ariaPressed: boolean
}

function FilterRow({ label, active, onClick, ariaPressed }: FilterButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ariaPressed}
      className={cn(
        'w-full text-left rounded-lg px-3 py-2 text-sm font-medium min-h-[44px] transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
        active
          ? 'bg-white/15 text-white border border-white/30'
          : 'text-white/70 hover:bg-white/[0.06] hover:text-white border border-transparent',
      )}
    >
      {label}
    </button>
  )
}

function FilterChip({ label, active, onClick, ariaPressed }: FilterButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ariaPressed}
      className={cn(
        'min-h-[44px] shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 active:scale-[0.98]',
        active
          ? 'bg-white/15 text-white border-white/30'
          : 'border-white/15 bg-white/10 text-white/70 hover:bg-white/15 hover:text-white/90',
      )}
    >
      {label}
    </button>
  )
}
