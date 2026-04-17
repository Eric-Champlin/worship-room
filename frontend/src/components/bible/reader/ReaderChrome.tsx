import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, BookOpen, ChevronDown, Eye, EyeOff, Type, Volume2 } from 'lucide-react'
import { useBibleDrawer } from '@/components/bible/BibleDrawerProvider'
import { cn } from '@/lib/utils'
import { AudioPlayButton } from '@/components/audio/AudioPlayButton'

const ICON_BTN =
  'flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white'

interface ReaderChromeProps {
  bookName: string
  bookSlug: string
  chapter: number
  onTypographyToggle: () => void
  isTypographyOpen: boolean
  aaRef: React.RefObject<HTMLButtonElement | null>
  // BB-5 focus mode
  chromeOpacity: number
  chromePointerEvents: 'auto' | 'none'
  chromeTransitionMs: number
  focusEnabled: boolean
  onFocusEnabledToggle: () => void
  // BB-20 ambient audio
  ambientAudioVisible: boolean
  isAudioPlaying: boolean
  onAudioToggle: () => void
  audioButtonRef: React.RefObject<HTMLButtonElement | null>
  isAudioPickerOpen: boolean
  reducedMotion: boolean
}

export function ReaderChrome({
  bookName,
  bookSlug,
  chapter,
  onTypographyToggle,
  isTypographyOpen,
  aaRef,
  chromeOpacity,
  chromePointerEvents,
  chromeTransitionMs,
  focusEnabled,
  onFocusEnabledToggle,
  ambientAudioVisible,
  isAudioPlaying,
  onAudioToggle,
  audioButtonRef,
  isAudioPickerOpen,
  reducedMotion,
}: ReaderChromeProps) {
  const bibleDrawer = useBibleDrawer()
  const centerRef = useRef<HTMLButtonElement>(null)
  const booksRef = useRef<HTMLButtonElement>(null)

  const handleCenterClick = () => {
    bibleDrawer.triggerRef.current = centerRef.current
    bibleDrawer.open({ type: 'chapters', bookSlug })
  }

  const handleBooksClick = () => {
    bibleDrawer.triggerRef.current = booksRef.current
    bibleDrawer.open()
  }

  return (
    <nav
      aria-label="Reader controls"
      className="fixed left-0 right-0 top-0 z-30"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        opacity: chromeOpacity,
        pointerEvents: chromePointerEvents,
        transition: `opacity ${chromeTransitionMs}ms ease`,
      }}
    >
      {/* Chrome background */}
      <div className="bg-hero-bg/80 backdrop-blur-md">
        <div className="flex h-14 items-center justify-between px-4">
          {/* Left: Back button only */}
          <Link to="/bible" className={ICON_BTN} aria-label="Back to Study Bible">
            <ArrowLeft className="h-5 w-5" />
          </Link>

          {/* Right: Chapter selector + Aa + Audio + Focus + Books + Audio Play */}
          <div className="flex items-center gap-1">
            <button
              ref={centerRef}
              type="button"
              className="flex min-h-[44px] items-center gap-1 rounded-full px-3 text-sm font-medium text-white/90 transition-colors hover:bg-white/10 hover:text-white sm:text-base"
              aria-label="Open chapter picker"
              onClick={handleCenterClick}
            >
              <span>
                {bookName} {chapter}
              </span>
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
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
            {ambientAudioVisible && (
              <button
                ref={audioButtonRef as React.RefObject<HTMLButtonElement>}
                type="button"
                className={cn(ICON_BTN, 'relative')}
                aria-label={
                  isAudioPlaying
                    ? 'Ambient audio playing — tap to open sound controls'
                    : 'Open ambient sounds'
                }
                aria-expanded={isAudioPickerOpen}
                onClick={onAudioToggle}
              >
                <Volume2
                  className={cn(
                    'h-5 w-5',
                    isAudioPlaying
                      ? reducedMotion
                        ? 'text-primary-lt'
                        : 'text-white'
                      : 'opacity-50',
                  )}
                />
                {isAudioPlaying && !reducedMotion && (
                  <span
                    className="pointer-events-none absolute inset-0 rounded-full animate-audio-pulse"
                    style={{ boxShadow: '0 0 0 2px rgba(139, 92, 246, 0.4)' }}
                    aria-hidden="true"
                  />
                )}
              </button>
            )}
            <button
              type="button"
              className={cn(
                ICON_BTN,
                'relative transition-colors duration-fast ease-sharp',
                focusEnabled && 'bg-white/10 text-white',
              )}
              aria-label={
                focusEnabled
                  ? 'Disable focus mode (keep toolbar visible)'
                  : 'Enable focus mode (auto-hide toolbar)'
              }
              aria-pressed={focusEnabled}
              onClick={onFocusEnabledToggle}
            >
              {focusEnabled ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
            <button
              ref={booksRef}
              type="button"
              className={ICON_BTN}
              aria-label="Browse books"
              onClick={handleBooksClick}
            >
              <BookOpen className="h-5 w-5" />
            </button>
            {/* BB-26 — FCBH audio play button. Renders null when DBP audio
                is unavailable or FCBH key is not configured. */}
            <AudioPlayButton
              bookSlug={bookSlug}
              bookDisplayName={bookName}
              chapter={chapter}
            />
          </div>
        </div>
      </div>

      {/* Gradient fade below chrome */}
      <div className="h-4 bg-gradient-to-b from-hero-bg/80 to-transparent" />
    </nav>
  )
}
