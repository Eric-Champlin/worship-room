import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, BookOpen, Type } from 'lucide-react'
import { useBibleDrawer } from '@/components/bible/BibleDrawerProvider'
import { useChromeDim } from '@/hooks/useChromeDim'

const ICON_BTN =
  'flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white'

interface ReaderChromeProps {
  bookName: string
  chapter: number
  onTypographyToggle: () => void
  isTypographyOpen: boolean
  aaRef: React.RefObject<HTMLButtonElement | null>
}

export function ReaderChrome({
  bookName,
  chapter,
  onTypographyToggle,
  isTypographyOpen,
  aaRef,
}: ReaderChromeProps) {
  const bibleDrawer = useBibleDrawer()
  const { opacity } = useChromeDim()
  const centerRef = useRef<HTMLButtonElement>(null)
  const booksRef = useRef<HTMLButtonElement>(null)

  const handleOpenDrawer = (el: HTMLButtonElement | null) => {
    bibleDrawer.triggerRef.current = el
    bibleDrawer.open()
  }

  return (
    <div
      className="fixed left-0 right-0 top-0 z-30"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        opacity,
        transition: 'opacity 500ms ease',
      }}
    >
      {/* Chrome background */}
      <div className="bg-hero-bg/80 backdrop-blur-md">
        <div className="flex h-14 items-center justify-between px-4">
          {/* Left: Back button */}
          <Link to="/bible" className={ICON_BTN} aria-label="Back to Bible">
            <ArrowLeft className="h-5 w-5" />
          </Link>

          {/* Center: Book + Chapter label */}
          <button
            ref={centerRef}
            type="button"
            className="flex min-h-[44px] items-center text-base font-medium text-white/90 transition-colors hover:text-white"
            aria-label="Open chapter picker"
            onClick={() => handleOpenDrawer(centerRef.current)}
          >
            <span className="text-sm sm:text-base">
              {bookName} {chapter}
            </span>
          </button>

          {/* Right: Aa + Books icons */}
          <div className="flex items-center gap-1">
            <button
              ref={aaRef as React.RefObject<HTMLButtonElement>}
              type="button"
              className={ICON_BTN}
              aria-label="Typography settings"
              aria-expanded={isTypographyOpen}
              onClick={onTypographyToggle}
            >
              <Type className="h-5 w-5" />
            </button>
            <button
              ref={booksRef}
              type="button"
              className={ICON_BTN}
              aria-label="Browse books"
              onClick={() => handleOpenDrawer(booksRef.current)}
            >
              <BookOpen className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Gradient fade below chrome */}
      <div className="h-4 bg-gradient-to-b from-hero-bg/80 to-transparent" />
    </div>
  )
}
