import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getAdjacentChapter } from '@/data/bible'

interface ReaderChapterNavProps {
  bookSlug: string
  currentChapter: number
  // BB-5 focus mode
  chromeOpacity?: number
  chromePointerEvents?: 'auto' | 'none'
  chromeTransitionMs?: number
}

const NAV_BTN =
  'inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-6 py-3 text-sm font-medium text-white/70 transition-colors hover:bg-white/15'

export function ReaderChapterNav({
  bookSlug,
  currentChapter,
  chromeOpacity,
  chromePointerEvents,
  chromeTransitionMs,
}: ReaderChapterNavProps) {
  const prev = getAdjacentChapter(bookSlug, currentChapter, 'prev')
  const next = getAdjacentChapter(bookSlug, currentChapter, 'next')

  return (
    <div
      style={{
        opacity: chromeOpacity ?? 1,
        pointerEvents: (chromePointerEvents ?? 'auto') as React.CSSProperties['pointerEvents'],
        transition: `opacity ${chromeTransitionMs ?? 200}ms ease`,
      }}
    >
      <nav
        className="mx-auto max-w-2xl px-5 py-8 sm:px-6"
        aria-label="Chapter navigation"
      >
        <div
          className="border-t pt-8"
          style={{ borderColor: 'var(--reader-divider)' }}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            {prev ? (
              <Link
                to={`/bible/${prev.bookSlug}/${prev.chapter}`}
                className={NAV_BTN}
              >
                <ChevronLeft className="h-4 w-4" />
                <span>{prev.bookName} {prev.chapter}</span>
              </Link>
            ) : (
              <div />
            )}

            {next ? (
              <Link
                to={`/bible/${next.bookSlug}/${next.chapter}`}
                className={`${NAV_BTN} sm:ml-auto`}
              >
                <span>{next.bookName} {next.chapter}</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            ) : (
              <div />
            )}
          </div>
        </div>
      </nav>
    </div>
  )
}
