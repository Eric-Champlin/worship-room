import { CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ResolvedBadgeProps {
  /** Optional className override for layout adjustments at the call site. */
  className?: string
}

/**
 * Spec 4.4 — "Most helpful" inline badge for a comment marked helpful by the
 * post author of a Question post. Visually adjacent to but semantically
 * separate from `AnsweredBadge` (which marks an answered prayer_request).
 *
 * Rendered inline next to the author name in `CommentItem` when
 * `comment.isHelpful === true`.
 */
export function ResolvedBadge({ className }: ResolvedBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-cyan-500/15 px-2 py-0.5 text-[11px] font-medium text-cyan-200/90',
        className,
      )}
      aria-label="Most helpful comment, marked by post author"
    >
      <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
      Most helpful
    </span>
  )
}
