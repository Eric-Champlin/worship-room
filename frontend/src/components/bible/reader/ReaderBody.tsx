import { cn } from '@/lib/utils'
import {
  TYPE_SIZE_CLASSES,
  LINE_HEIGHT_CLASSES,
  FONT_FAMILY_CLASSES,
} from '@/hooks/useReaderSettings'
import { VerseJumpSentinel } from '@/components/bible/reader/VerseJumpPill'
import type { ReaderSettings } from '@/hooks/useReaderSettings'
import type { BibleVerse } from '@/types/bible'

interface ReaderBodyProps {
  verses: BibleVerse[]
  bookSlug: string
  chapter: number
  settings: ReaderSettings
  paragraphs?: number[]
}

export function ReaderBody({ verses, bookSlug, chapter, settings, paragraphs = [] }: ReaderBodyProps) {
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
          <span
            data-verse={String(verse.number)}
            data-book={bookSlug}
            data-chapter={String(chapter)}
            id={`verse-${verse.number}`}
          >
            <sup
              className="mr-1 align-super font-sans"
              style={{ fontSize: '0.7em', color: 'var(--reader-verse-num)' }}
            >
              {verse.number}
            </sup>
            {verse.text}{' '}
          </span>
          {/* Sentinel after verse 20 for verse jump pill visibility */}
          {showSentinel && verse.number === 20 && <VerseJumpSentinel />}
        </span>
      ))}
    </div>
  )
}
