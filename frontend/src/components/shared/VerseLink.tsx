import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { parseVerseReferences } from '@/lib/parse-verse-references'
import { cn } from '@/lib/utils'

interface VerseLinkProps {
  reference: string
  className?: string
  children?: React.ReactNode
}

export function VerseLink({ reference, className, children }: VerseLinkProps) {
  const parsed = useMemo(() => {
    const refs = parseVerseReferences(reference)
    return refs.length > 0 ? refs[0] : null
  }, [reference])

  if (!parsed) {
    return <span className={className}>{children ?? reference}</span>
  }

  return (
    <Link
      to={`/bible/${parsed.bookSlug}/${parsed.chapter}#verse-${parsed.verseStart}`}
      className={cn(className ?? 'text-primary-lt', 'transition-colors hover:text-primary hover:underline')}
    >
      {children ?? reference}
    </Link>
  )
}
