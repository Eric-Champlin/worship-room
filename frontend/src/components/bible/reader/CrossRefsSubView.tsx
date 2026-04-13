import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Link2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatReference } from '@/lib/bible/verseActionRegistry'
import { getBookBySlug } from '@/data/bible'
import { loadChapterWeb } from '@/data/bible'
import {
  loadCrossRefsForBook,
  collectCrossRefsForRange,
  getCachedBook,
  getDeduplicatedCrossRefCount,
} from '@/lib/bible/crossRefs/loader'
import { sortByStrength, sortByCanonicalOrder } from '@/lib/bible/crossRefs/sort'
import { buildCrossRefRoute } from '@/lib/bible/crossRefs/navigation'
import type { CrossRef } from '@/types/bible'
import type { VerseSelection, VerseActionContext } from '@/types/verse-actions'

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function LoadingSkeleton() {
  return (
    <div className="space-y-1 px-2 py-2">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-3">
          <div className="flex-1 space-y-2">
            <span className="block h-4 w-1/3 motion-safe:animate-pulse rounded bg-white/[0.08]" />
            <span className="block h-3 w-3/4 motion-safe:animate-pulse rounded bg-white/[0.08]" />
          </div>
          <span className="h-1.5 w-1.5 rounded-full bg-white/[0.08]" />
          <ChevronRight className="h-4 w-4 text-white/10" />
        </div>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <Link2 className="mb-4 h-10 w-10 text-white/20" />
      <p className="text-sm font-medium text-white">No cross-references for this verse.</p>
      <p className="mt-1 text-xs text-white/50">
        Not every verse has direct connections in the Treasury of Scripture Knowledge.
      </p>
    </div>
  )
}

function CrossRefRow({
  crossRef,
  verseText,
  onTap,
}: {
  crossRef: CrossRef
  verseText: string | undefined
  onTap: (ref: CrossRef) => void
}) {
  const bookName = getBookBySlug(crossRef.parsed.book)?.name ?? crossRef.parsed.book

  // Rank indicator opacity: rank 1 = 1.0, rank 2 = 0.6, rank 3 = 0.4, rank 4+ = 0.2
  const rankOpacity =
    crossRef.rank === 1 ? 1 : crossRef.rank === 2 ? 0.6 : crossRef.rank === 3 ? 0.4 : 0.2

  return (
    <button
      onClick={() => onTap(crossRef)}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-3 min-h-[44px] text-left text-white transition-colors hover:bg-white/[0.06]"
    >
      <div className="min-w-0 flex-1">
        <span className="text-sm font-medium text-white">
          {bookName} {crossRef.parsed.chapter}:{crossRef.parsed.verse}
        </span>
        {verseText !== undefined ? (
          <span className="mt-0.5 block text-xs text-white/50 line-clamp-2">{verseText}</span>
        ) : (
          <span className="mt-1 block h-3 w-3/4 motion-safe:animate-pulse rounded bg-white/[0.08]" />
        )}
      </div>
      {/* Rank indicator */}
      <span
        className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-white"
        style={{ opacity: rankOpacity }}
        aria-hidden="true"
        data-testid="rank-indicator"
      />
      <ChevronRight className="h-4 w-4 flex-shrink-0 text-white/30" aria-hidden="true" />
    </button>
  )
}

// ---------------------------------------------------------------------------
// CrossRefBadge — exported for use in verseActionRegistry
// ---------------------------------------------------------------------------

export function CrossRefBadge({ selection }: { selection: VerseSelection }) {
  const [count, setCount] = useState<number | null>(() => {
    const cached = getCachedBook(selection.book)
    if (!cached) return null
    return getDeduplicatedCrossRefCount(
      cached,
      selection.chapter,
      selection.startVerse,
      selection.endVerse,
    )
  })

  useEffect(() => {
    if (count !== null) return
    let cancelled = false
    loadCrossRefsForBook(selection.book).then((map) => {
      if (cancelled) return
      setCount(
        getDeduplicatedCrossRefCount(
          map,
          selection.chapter,
          selection.startVerse,
          selection.endVerse,
        ),
      )
    })
    return () => {
      cancelled = true
    }
  }, [selection, count])

  // Loading state: pulsing dot
  if (count === null) {
    return (
      <span
        className="inline-block h-2 w-2 rounded-full bg-white/40 motion-safe:animate-pulse"
        aria-label="Loading cross-reference count"
      />
    )
  }

  // Zero: hidden
  if (count === 0) return null

  // Count badge
  return (
    <span className="inline-flex items-center justify-center rounded-full bg-white/[0.12] px-1.5 py-0.5 text-xs tabular-nums text-white/70">
      {count > 99 ? '99+' : count}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface CrossRefsSubViewProps {
  selection: VerseSelection
  onBack: () => void
  context?: VerseActionContext
}

export function CrossRefsSubView({ selection, context }: CrossRefsSubViewProps) {
  const [crossRefs, setCrossRefs] = useState<CrossRef[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sortMode, setSortMode] = useState<'strength' | 'canonical'>('strength')
  const [verseTexts, setVerseTexts] = useState<Map<string, string>>(new Map())
  const navigate = useNavigate()

  // Load cross-refs on mount
  useEffect(() => {
    let cancelled = false
    setIsLoading(true)

    loadCrossRefsForBook(selection.book).then((map) => {
      if (cancelled) return
      const refs = collectCrossRefsForRange(
        map,
        selection.chapter,
        selection.startVerse,
        selection.endVerse,
      )
      setCrossRefs(refs)
      setIsLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [selection])

  // Load verse preview texts in parallel by destination book+chapter
  useEffect(() => {
    if (crossRefs.length === 0) return
    let cancelled = false

    // Group cross-refs by destination book+chapter
    const chapterKeys = new Map<string, CrossRef[]>()
    for (const ref of crossRefs) {
      const key = `${ref.parsed.book}.${ref.parsed.chapter}`
      const group = chapterKeys.get(key) ?? []
      group.push(ref)
      chapterKeys.set(key, group)
    }

    // Load each unique chapter in parallel
    for (const [key, refs] of chapterKeys) {
      const bookSlug = key.substring(0, key.lastIndexOf('.'))
      const chapterStr = key.substring(key.lastIndexOf('.') + 1)
      loadChapterWeb(bookSlug, parseInt(chapterStr, 10)).then((chapterData) => {
        if (cancelled || !chapterData) return
        setVerseTexts((prev) => {
          const next = new Map(prev)
          for (const ref of refs) {
            const verse = chapterData.verses.find((v) => v.number === ref.parsed.verse)
            if (verse) next.set(ref.ref, verse.text)
          }
          return next
        })
      })
    }

    return () => {
      cancelled = true
    }
  }, [crossRefs])

  // Sorted refs
  const sortedRefs = useMemo(() => {
    return sortMode === 'strength' ? sortByStrength(crossRefs) : sortByCanonicalOrder(crossRefs)
  }, [crossRefs, sortMode])

  // Handle row tap → navigate
  const handleRefTap = useCallback(
    (ref: CrossRef) => {
      const route = buildCrossRefRoute(ref.parsed.book, ref.parsed.chapter, ref.parsed.verse)
      context?.closeSheet({ navigating: true })
      navigate(route, { replace: true })
    },
    [context, navigate],
  )

  return (
    <div>
      {/* Subtitle */}
      <div className="px-4 py-1.5">
        <span className="text-xs text-white/50">for {formatReference(selection)}</span>
      </div>

      {/* Context strip — source verse text preview, 2 lines max */}
      <div className="px-4 py-2">
        <p className="line-clamp-2 text-sm text-white/40">
          {selection.verses.map((v) => v.text).join(' ')}
        </p>
      </div>

      <div className="border-t border-white/[0.08]" />

      {/* Sort toggle (only if refs exist) */}
      {crossRefs.length > 0 && (
        <div className="flex gap-1 px-4 py-2">
          <button
            onClick={() => setSortMode('strength')}
            className={cn(
              'flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              sortMode === 'strength'
                ? 'bg-white/[0.12] text-white'
                : 'text-white/50 hover:text-white/70',
            )}
          >
            Strongest first
          </button>
          <button
            onClick={() => setSortMode('canonical')}
            className={cn(
              'flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              sortMode === 'canonical'
                ? 'bg-white/[0.12] text-white'
                : 'text-white/50 hover:text-white/70',
            )}
          >
            Canonical order
          </button>
        </div>
      )}

      <div className="border-t border-white/[0.08]" />

      {/* Loading state */}
      {isLoading && <LoadingSkeleton />}

      {/* Empty state */}
      {!isLoading && crossRefs.length === 0 && <EmptyState />}

      {/* Cross-reference list */}
      {!isLoading && crossRefs.length > 0 && (
        <div className="px-2 py-1">
          {sortedRefs.map((ref) => (
            <CrossRefRow
              key={ref.ref}
              crossRef={ref}
              verseText={verseTexts.get(ref.ref)}
              onTap={handleRefTap}
            />
          ))}
        </div>
      )}

      {/* Footer */}
      {!isLoading && crossRefs.length > 0 && (
        <>
          <div className="border-t border-white/[0.08]" />
          <div className="px-4 py-3 text-center">
            <span className="text-xs text-white/40">
              Cross-references from Treasury of Scripture Knowledge · Public Domain
            </span>
          </div>
        </>
      )}
    </div>
  )
}
