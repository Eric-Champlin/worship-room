import { cn } from '@/lib/utils'
import { CATEGORY_COLORS, CATEGORY_LABELS, type ChallengeCategory } from '@/constants/categoryColors'

export interface CategoryTagProps {
  category: ChallengeCategory
  className?: string
}

export function CategoryTag({ category, className }: CategoryTagProps) {
  const tokens = CATEGORY_COLORS[category]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        tokens.bgClass,
        tokens.fgClass,
        className,
      )}
    >
      {CATEGORY_LABELS[category]}
    </span>
  )
}
