import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HIGHLIGHT_COLORS } from '@/constants/bible'
import { loadChapter, getBookBySlug } from '@/data/bible'
import type { BibleHighlight, BibleNote } from '@/types/bible'

interface HighlightsNotesSectionProps {
  highlights: BibleHighlight[]
  notes: BibleNote[]
}

interface FeedItem {
  type: 'highlight' | 'note'
  book: string
  chapter: number
  verseNumber: number
  createdAt: string
  color?: string
  noteText?: string
  noteId?: string
}

const ITEMS_PER_PAGE = 20

export function HighlightsNotesSection({
  highlights,
  notes,
}: HighlightsNotesSectionProps) {
  const navigate = useNavigate()
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE)
  const [verseTexts, setVerseTexts] = useState<Record<string, string>>({})
  const loadedChaptersRef = useRef<Set<string>>(new Set())

  // Build feed: merge highlights and notes, sort newest first
  const feed = useMemo<FeedItem[]>(() => [
    ...highlights.map((h) => ({
      type: 'highlight' as const,
      book: h.book,
      chapter: h.chapter,
      verseNumber: h.verseNumber,
      createdAt: h.createdAt,
      color: h.color,
    })),
    ...notes.map((n) => ({
      type: 'note' as const,
      book: n.book,
      chapter: n.chapter,
      verseNumber: n.verseNumber,
      createdAt: n.createdAt,
      noteText: n.text,
      noteId: n.id,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [highlights, notes])

  const totalCount = feed.length
  const visibleFeed = feed.slice(0, visibleCount)

  // Lazy load verse text for visible feed items
  useEffect(() => {
    const chaptersToLoad = new Set<string>()
    for (const item of visibleFeed) {
      const key = `${item.book}:${item.chapter}`
      if (!loadedChaptersRef.current.has(key)) {
        chaptersToLoad.add(key)
      }
    }

    if (chaptersToLoad.size === 0) return

    for (const key of chaptersToLoad) {
      loadedChaptersRef.current.add(key)
      const [bookSlug, chapterStr] = key.split(':')
      const chapter = parseInt(chapterStr, 10)

      loadChapter(bookSlug, chapter).then((data) => {
        if (!data?.verses) return
        const texts: Record<string, string> = {}
        for (const v of data.verses) {
          texts[`${bookSlug}:${chapter}:${v.number}`] = v.text
        }
        setVerseTexts((prev) => ({ ...prev, ...texts }))
      }).catch(() => {
        // Allow retry on next render if load fails
        loadedChaptersRef.current.delete(key)
      })
    }
  }, [feed, visibleCount])

  const handleShowMore = useCallback(() => {
    setVisibleCount((prev) => prev + ITEMS_PER_PAGE)
  }, [])

  const handleItemClick = useCallback(
    (item: FeedItem) => {
      navigate(`/bible/${item.book}/${item.chapter}#verse-${item.verseNumber}`)
    },
    [navigate],
  )

  const getBookName = (slug: string): string => {
    return getBookBySlug(slug)?.name ?? slug
  }

  const getColorName = (hex: string): string => {
    return HIGHLIGHT_COLORS.find((c) => c.hex === hex)?.name.toLowerCase() ?? 'color'
  }

  if (totalCount === 0) return null

  return (
    <section className="mt-8" aria-label="My Highlights and Notes">
      <div className="mb-4 flex items-baseline gap-2">
        <h2 className="text-xl font-semibold text-white">My Highlights &amp; Notes</h2>
        <span className="text-sm text-white/40">{totalCount} items</span>
      </div>

      <div className="space-y-3">
        {visibleFeed.map((item, index) => {
          const verseKey = `${item.book}:${item.chapter}:${item.verseNumber}`
          const verseText = verseTexts[verseKey]
          const bookName = getBookName(item.book)
          const reference = `${bookName} ${item.chapter}:${item.verseNumber}`

          return (
            <button
              key={`${item.type}-${item.book}-${item.chapter}-${item.verseNumber}-${index}`}
              type="button"
              onClick={() => handleItemClick(item)}
              className="w-full cursor-pointer rounded-xl border border-white/10 bg-white/5 p-4 text-left transition-colors hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <div className="flex items-start gap-3">
                {/* Color dot for highlights */}
                {item.type === 'highlight' && item.color && (
                  <span
                    className="mt-1 block h-2 w-2 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: item.color }}
                    aria-label={`Highlighted in ${getColorName(item.color)}`}
                  />
                )}

                <div className="min-w-0 flex-1">
                  {/* Verse text */}
                  {verseText ? (
                    <p className="line-clamp-2 font-serif text-sm text-white/80">
                      {verseText}
                    </p>
                  ) : (
                    <div className="h-10 animate-pulse rounded bg-white/5" />
                  )}

                  {/* Reference */}
                  <p className="mt-1 text-xs text-white/40">{reference}</p>

                  {/* Note preview */}
                  {item.type === 'note' && item.noteText && (
                    <p className="mt-1 line-clamp-1 text-xs italic text-white/50">
                      {item.noteText}
                    </p>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {visibleCount < totalCount && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={handleShowMore}
            className="text-sm text-primary hover:text-primary-lt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Show more
          </button>
        </div>
      )}
    </section>
  )
}
