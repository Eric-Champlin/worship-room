import { Link } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import { parseReference } from '@/lib/search/reference-parser'
import { cn } from '@/lib/utils'

interface ScriptureChipProps {
  reference: string
  className?: string
}

export function ScriptureChip({ reference, className }: ScriptureChipProps) {
  const parsed = parseReference(reference)

  if (!parsed) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full bg-violet-500/15 px-2.5 py-1 text-xs font-medium text-violet-200/90',
          className,
        )}
        aria-label="Scripture reference (unlinked)"
      >
        <BookOpen className="h-3 w-3" aria-hidden="true" />
        {reference}
      </span>
    )
  }

  const verseSuffix = parsed.verse !== undefined ? `?verse=${parsed.verse}` : ''
  const path = `/bible/${parsed.book}/${parsed.chapter}${verseSuffix}`

  return (
    <Link
      to={path}
      className={cn(
        'inline-flex min-h-[44px] items-center gap-1 rounded-full bg-violet-500/15 px-2.5 py-1 text-xs font-medium text-violet-200/90 transition-colors hover:bg-violet-500/25 hover:text-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300',
        className,
      )}
      aria-label={`Read ${reference} in the Bible`}
    >
      <BookOpen className="h-3 w-3" aria-hidden="true" />
      {reference}
    </Link>
  )
}
