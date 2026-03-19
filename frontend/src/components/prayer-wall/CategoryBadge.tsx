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
        className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700"
        aria-label={`Filter by ${label}`}
      >
        {label}
      </button>
    )
  }

  return (
    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
      {label}
    </span>
  )
}
