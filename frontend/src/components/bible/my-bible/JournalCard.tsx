import { useState, useCallback } from 'react'
import { HighlightedText } from './HighlightedText'
import type { JournalData } from '@/types/my-bible'

interface JournalCardProps {
  data: JournalData
  verseText: string | null
  searchQuery?: string
}

export function JournalCard({ data, verseText, searchQuery }: JournalCardProps) {
  const [expanded, setExpanded] = useState(false)

  const toggleExpand = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setExpanded((prev) => !prev)
  }, [])

  return (
    <div className="mt-2 space-y-1">
      {verseText ? (
        <p className="text-sm text-white/60">
          <HighlightedText text={verseText} query={searchQuery ?? ''} />
        </p>
      ) : (
        <div className="h-4 w-3/4 motion-safe:animate-pulse rounded bg-white/10" />
      )}
      <div className={expanded ? '' : 'line-clamp-3'}>
        <p className="text-sm text-white">
          <HighlightedText text={data.body} query={searchQuery ?? ''} />
        </p>
      </div>
      {data.body.length > 300 && (
        <button
          type="button"
          onClick={toggleExpand}
          className="cursor-pointer text-xs text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:rounded"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
      <p className="text-xs text-white/50">
        You journaled about this verse
      </p>
    </div>
  )
}
