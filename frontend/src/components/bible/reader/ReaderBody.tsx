import type React from 'react'
import { cn } from '@/lib/utils'
import { ANIMATION_EASINGS } from '@/constants/animation'
import {
  TYPE_SIZE_CLASSES,
  LINE_HEIGHT_CLASSES,
  FONT_FAMILY_CLASSES,
} from '@/hooks/useReaderSettings'
import { VerseJumpSentinel } from '@/components/bible/reader/VerseJumpPill'
import type { ReaderSettings } from '@/hooks/useReaderSettings'
import { VerseBookmarkMarker } from '@/components/bible/reader/VerseBookmarkMarker'
import { VerseNoteMarker } from '@/components/bible/reader/VerseNoteMarker'
import type { BibleVerse, Bookmark, Highlight, Note } from '@/types/bible'

interface ReaderBodyProps {
  verses: BibleVerse[]
  bookSlug: string
  chapter: number
  settings: ReaderSettings
  paragraphs?: number[]
  /** Verse numbers currently selected for the action sheet (empty = no selection) */
  selectedVerses?: number[]
  /** Full highlight data for this chapter (for background color + ring color) */
  chapterHighlights?: Highlight[]
  /** Whether the selection is actively visible (false = fading out) */
  selectionVisible?: boolean
  /** Bookmark data for this chapter */
  chapterBookmarks?: Bookmark[]
  /** Note data for this chapter */
  chapterNotes?: Note[]
  /** Verse numbers that just received a highlight (for pulse animation) */
  freshHighlightVerses?: number[]
  /** Verse numbers glowing from ?scroll-to= arrival (VOTD "Read in context" and similar one-shot scroll targets; legacy ?highlight= is still read but deprecated) */
  arrivalHighlightVerses?: number[]
  /** Whether user prefers reduced motion */
  reducedMotion?: boolean
  /** BB-44 — verse number currently being narrated by audio (null = no read-along active) */
  readAlongVerse?: number | null
}

export function ReaderBody({
  verses,
  bookSlug,
  chapter,
  settings,
  paragraphs = [],
  selectedVerses,
  chapterHighlights,
  chapterBookmarks,
  chapterNotes,
  selectionVisible = true,
  freshHighlightVerses,
  arrivalHighlightVerses,
  reducedMotion,
  readAlongVerse,
}: ReaderBodyProps) {
  const paragraphSet = new Set(paragraphs)
  const filteredVerses = verses.filter((v) => v.text.trim() !== '')
  const showSentinel = filteredVerses.length > 40

  return (
    <div
      className={cn(
        TYPE_SIZE_CLASSES[settings.typeSize],
        LINE_HEIGHT_CLASSES[settings.lineHeight],
        FONT_FAMILY_CLASSES[settings.fontFamily],
      )}
      style={{ color: 'var(--reader-text)' }}
    >
      {filteredVerses.map((verse, index) => (
        <span key={verse.number}>
          {/* Paragraph break before this verse (skip first verse) */}
          {index > 0 && paragraphSet.has(verse.number) && (
            <>
              <br />
              <br />
            </>
          )}
          {(() => {
            const hl = chapterHighlights?.find(
              (h) => verse.number >= h.startVerse && verse.number <= h.endVerse,
            )
            const isHighlighted = !!hl
            const isSelected = selectedVerses?.includes(verse.number)
            const isFresh = freshHighlightVerses?.includes(verse.number)
            const isArrivalHighlight = arrivalHighlightVerses?.includes(verse.number)
            const isReadAlong = readAlongVerse === verse.number
            const isBookmarked = !!chapterBookmarks?.find(
              (b) => verse.number >= b.startVerse && verse.number <= b.endVerse,
            )
            const hasNote = !!chapterNotes?.find(
              (n) => verse.number >= n.startVerse && verse.number <= n.endVerse,
            )

            return (
              <span
                data-verse={String(verse.number)}
                data-book={bookSlug}
                data-chapter={String(chapter)}
                id={`verse-${verse.number}`}
                className={cn(
                  isHighlighted && 'rounded-sm',
                  isSelected && !isHighlighted && selectionVisible && 'bg-primary/[0.15] rounded-sm',
                  isSelected && isHighlighted && selectionVisible && 'outline outline-2 outline-offset-1 rounded-sm',
                  isSelected && !selectionVisible && 'transition-colors duration-base',
                  isFresh && !reducedMotion && 'animate-highlight-pulse',
                  isArrivalHighlight && 'rounded',
                  isReadAlong && 'transition-colors duration-fast',
                )}
                style={(() => {
                  // Base style from existing features
                  const baseStyle: React.CSSProperties | undefined = isArrivalHighlight
                    ? {
                        boxShadow: '0 0 12px 2px rgba(139, 92, 246, 0.4)',
                        transition: reducedMotion ? 'none' : `box-shadow 1.5s ${ANIMATION_EASINGS.decelerate}`,
                      }
                    : isHighlighted
                      ? {
                          backgroundColor: `var(--highlight-${hl!.color}-bg)`,
                          WebkitBoxDecorationBreak: 'clone' as const,
                          boxDecorationBreak: 'clone' as const,
                          ...(isSelected && selectionVisible
                            ? { outlineColor: `var(--highlight-${hl!.color}-ring)` }
                            : {}),
                        }
                      : undefined

                  // BB-44 — read-along layer (bg tint + left accent bar)
                  // When a user highlight exists, preserve its backgroundColor and
                  // only add the left accent bar. The user's highlight color wins.
                  if (!isReadAlong) return baseStyle
                  const readAlongStyle: React.CSSProperties = {
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                    boxShadow: 'inset 3px 0 0 0 rgba(109, 40, 217, 0.6)',
                  }
                  if (baseStyle) {
                    return { ...baseStyle, boxShadow: readAlongStyle.boxShadow }
                  }
                  return readAlongStyle
                })()}
                aria-current={isReadAlong ? 'true' : undefined}
                aria-label={
                  isBookmarked && hasNote
                    ? `${bookSlug} ${chapter}:${verse.number}, bookmarked, has a note`
                    : isBookmarked
                      ? `${bookSlug} ${chapter}:${verse.number}, bookmarked`
                      : hasNote
                        ? `${bookSlug} ${chapter}:${verse.number}, has a note`
                        : undefined
                }
              >
                {isBookmarked && <VerseBookmarkMarker />}
                <sup
                  className="mr-1 align-super font-sans"
                  style={{ fontSize: '0.7em', color: 'var(--reader-verse-num)' }}
                >
                  {verse.number}
                </sup>
                {hasNote && <VerseNoteMarker />}
                {verse.text}{' '}
              </span>
            )
          })()}
          {/* Sentinel after verse 20 for verse jump pill visibility */}
          {showSentinel && verse.number === 20 && <VerseJumpSentinel />}
        </span>
      ))}
    </div>
  )
}
