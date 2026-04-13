import { HIGHLIGHT_EMOTIONS } from '@/constants/bible'
import { Layers } from 'lucide-react'
import { useMemorizationStore } from '@/hooks/bible/useMemorizationStore'
import { isCardForVerse, addCard, getCardForVerse, removeCard } from '@/lib/memorize'
import { HighlightedText } from './HighlightedText'
import type { HighlightData } from '@/types/my-bible'

interface HighlightCardProps {
  data: HighlightData
  verseText: string | null
  searchQuery?: string
  book?: string
  bookName?: string
  chapter?: number
  startVerse?: number
  endVerse?: number
}

export function HighlightCard({
  data,
  verseText,
  searchQuery,
  book,
  bookName,
  chapter,
  startVerse,
  endVerse,
}: HighlightCardProps) {
  // Subscribe to memorization store so inDeck recomputes on add/remove
  useMemorizationStore()

  const emotion = HIGHLIGHT_EMOTIONS.find((e) => e.key === data.color)
  const hex = emotion?.hex ?? '#FDE047'
  const label = emotion?.label ?? data.color

  const hasVerseInfo =
    book !== undefined &&
    bookName !== undefined &&
    chapter !== undefined &&
    startVerse !== undefined &&
    endVerse !== undefined
  const inDeck = hasVerseInfo
    ? isCardForVerse(book, chapter, startVerse, endVerse)
    : false

  const handleMemorize = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!hasVerseInfo || !verseText) return

    if (inDeck) {
      const existing = getCardForVerse(book, chapter, startVerse, endVerse)
      if (existing) removeCard(existing.id)
    } else {
      const reference =
        startVerse === endVerse
          ? `${bookName} ${chapter}:${startVerse}`
          : `${bookName} ${chapter}:${startVerse}\u2013${endVerse}`
      addCard({
        book,
        bookName,
        chapter,
        startVerse,
        endVerse,
        verseText,
        reference,
      })
    }
  }

  return (
    <div className="mt-2 space-y-2">
      {verseText ? (
        <p
          className="rounded-lg px-3 py-2 text-sm text-white"
          style={{ backgroundColor: `${hex}15` }}
        >
          <HighlightedText text={verseText} query={searchQuery ?? ''} />
        </p>
      ) : (
        <div className="h-4 w-3/4 animate-pulse rounded bg-white/10" />
      )}
      <div className="flex items-center gap-2">
        <span
          className="inline-block rounded-full px-2 py-0.5 text-xs font-medium"
          style={{ color: hex, backgroundColor: `${hex}20` }}
        >
          {label}
        </span>
        {hasVerseInfo && verseText && (
          <button
            type="button"
            onClick={handleMemorize}
            className="ml-auto flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-white/40 hover:text-white/70 transition-colors"
            aria-label={
              inDeck ? 'In memorization deck' : 'Add to memorization deck'
            }
          >
            {inDeck ? (
              <span className="text-xs text-white/50">In deck</span>
            ) : (
              <Layers size={14} />
            )}
          </button>
        )}
      </div>
    </div>
  )
}
