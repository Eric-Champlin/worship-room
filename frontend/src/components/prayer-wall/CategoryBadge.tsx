import { CATEGORY_LABELS, type PrayerCategory } from '@/constants/prayer-categories'

interface CategoryBadgeProps {
  // Spec 4.3 — testimony posts pass null; renders nothing in that case.
  category: PrayerCategory | null
  onClick?: (category: PrayerCategory) => void
}

export function CategoryBadge({ category, onClick }: CategoryBadgeProps) {
  if (category === null) return null
  const label = CATEGORY_LABELS[category]

  if (onClick) {
    return (
      <button
        type="button"
        onClick={() => onClick(category)}
        className="min-h-[44px] rounded-full bg-white/[0.06] px-3 py-1 text-xs text-white/50 transition-[colors,transform] duration-fast hover:bg-white/10 hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 active:scale-[0.98]"
        aria-label={`Filter by ${label}`}
      >
        {label}
      </button>
    )
  }

  return (
    <span className="inline-flex min-h-[44px] items-center rounded-full bg-white/[0.06] px-3 py-1 text-xs text-white/60">
      {label}
    </span>
  )
}
