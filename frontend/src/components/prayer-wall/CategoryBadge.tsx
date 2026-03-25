import { CATEGORY_LABELS, type PrayerCategory } from '@/constants/prayer-categories'

interface CategoryBadgeProps {
  category: PrayerCategory
  onClick?: (category: PrayerCategory) => void
}

export function CategoryBadge({ category, onClick }: CategoryBadgeProps) {
  const label = CATEGORY_LABELS[category]

  if (onClick) {
    return (
      <button
        type="button"
        onClick={() => onClick(category)}
        className="rounded-full bg-white/[0.06] px-2 py-0.5 text-xs text-white/40 transition-colors hover:bg-white/10 hover:text-white/60"
        aria-label={`Filter by ${label}`}
      >
        {label}
      </button>
    )
  }

  return (
    <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-xs text-white/40">
      {label}
    </span>
  )
}
