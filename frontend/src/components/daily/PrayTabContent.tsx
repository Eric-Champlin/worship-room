import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import {
  Copy,
  Bookmark,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { BackgroundSquiggle, SQUIGGLE_MASK_STYLE } from '@/components/BackgroundSquiggle'
import { useToast } from '@/components/ui/Toast'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import { ReadAloudButton } from '@/components/daily/ReadAloudButton'
import { KaraokeText } from '@/components/daily/KaraokeText'
import { ShareButton } from '@/components/daily/ShareButton'
import { CrisisBanner } from '@/components/daily/CrisisBanner'
import { useAuth } from '@/hooks/useAuth'
import { useCompletionTracking } from '@/hooks/useCompletionTracking'
import { useFaithPoints } from '@/hooks/useFaithPoints'
import { DEFAULT_PRAYER_CHIPS } from '@/constants/daily-experience'
import {
  getMockPrayer,
  getClassicPrayers,
} from '@/mocks/daily-experience-mock-data'
import type { MockPrayer, ClassicPrayer } from '@/types/daily-experience'

interface PrayTabContentProps {
  onSwitchToJournal?: (topic: string) => void
}

export function PrayTabContent({ onSwitchToJournal }: PrayTabContentProps) {
  const { showToast } = useToast()
  const authModal = useAuthModal()
  const { isAuthenticated } = useAuth()
  const { markPrayComplete } = useCompletionTracking()
  const { recordActivity } = useFaithPoints()

  const [text, setText] = useState('')
  const [selectedChip, setSelectedChip] = useState<string | null>(null)
  const [nudge, setNudge] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [prayer, setPrayer] = useState<MockPrayer | null>(null)
  const [prayerWordIndex, setPrayerWordIndex] = useState(-1)
  const [classicOpen, setClassicOpen] = useState(false)
  const [classicReadAloudId, setClassicReadAloudId] = useState<string | null>(
    null,
  )
  const [classicWordIndex, setClassicWordIndex] = useState(-1)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const mobileMenuRef = useRef<HTMLDivElement>(null)

  // Close mobile overflow menu on outside click or Escape
  useEffect(() => {
    if (!mobileMenuOpen) return
    const handleClick = (e: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false)
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [mobileMenuOpen])

  const classicPrayers = useMemo(() => getClassicPrayers(), [])

  const autoExpand = useCallback((el: HTMLTextAreaElement) => {
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [])

  const handleChipClick = (chip: string) => {
    setSelectedChip(chip)
    setText(chip)
    setNudge(false)
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
        textareaRef.current.selectionStart = chip.length
        textareaRef.current.selectionEnd = chip.length
        autoExpand(textareaRef.current)
      }
    }, 0)
  }

  const handleGenerate = () => {
    if (!text.trim()) {
      setNudge(true)
      return
    }
    if (!isAuthenticated) {
      authModal?.openAuthModal('Sign in to generate a prayer')
      return
    }
    setNudge(false)
    setIsLoading(true)

    setTimeout(() => {
      const result = getMockPrayer(text)
      setPrayer(result)
      setIsLoading(false)
      markPrayComplete()
      recordActivity('pray')
    }, 1500)
  }

  const handleReset = () => {
    setPrayer(null)
    setText('')
    setSelectedChip(null)
    setNudge(false)
    setPrayerWordIndex(-1)
    setMobileMenuOpen(false)
  }

  const handleCopy = async () => {
    if (!prayer) return
    try {
      await navigator.clipboard.writeText(prayer.text)
      showToast('Prayer copied to clipboard')
    } catch {
      showToast('Failed to copy', 'error')
    }
  }

  const handleSave = () => {
    if (!isAuthenticated) {
      authModal?.openAuthModal('Sign in to save your prayers')
      return
    }
    showToast('Save feature coming soon')
  }

  const handleCopyClassic = async (p: ClassicPrayer) => {
    try {
      await navigator.clipboard.writeText(p.text)
      showToast('Copied to clipboard')
    } catch {
      showToast('Failed to copy', 'error')
    }
  }

  const extractTopic = () => {
    if (!text.trim()) return 'prayer'
    const lower = text.toLowerCase()
    const topics = [
      'anxiety',
      'grateful',
      'healing',
      'struggling',
      'forgive',
      'guidance',
      'grieving',
      'lost',
    ]
    return topics.find((t) => lower.includes(t)) ?? 'prayer'
  }

  const showChips = !selectedChip && !text

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
      <div className="relative">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={SQUIGGLE_MASK_STYLE}
        >
          <BackgroundSquiggle />
        </div>
        <div className="relative">

          {/* Loading State */}
          <div aria-live="polite">
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="mb-4 flex gap-1">
                  <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:0ms]" />
                  <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:150ms]" />
                  <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:300ms]" />
                </div>
                <p className="text-text-light">Generating prayer for you...</p>
              </div>
            )}
          </div>

          {/* Generated Prayer Display */}
          {prayer && !isLoading && (
            <div className="animate-fade-in">
              <p className="mb-2 text-sm font-medium text-text-light">
                Your prayer:
              </p>
              <div className="mb-6 rounded-lg bg-primary/5 p-6">
                <KaraokeText
                  text={prayer.text}
                  currentWordIndex={prayerWordIndex}
                  className="font-serif text-lg leading-relaxed text-text-dark"
                />
              </div>

              {/* Action Buttons */}
              <div className="mb-6 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-text-dark transition-colors hover:bg-gray-50"
                  aria-label="Copy prayer"
                >
                  <Copy className="h-4 w-4" />
                  <span className="hidden sm:inline">Copy</span>
                </button>

                <ReadAloudButton
                  text={prayer.text}
                  onWordIndexChange={setPrayerWordIndex}
                />

                <button
                  type="button"
                  onClick={handleSave}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-text-dark transition-colors hover:bg-gray-50"
                  aria-label="Save prayer"
                >
                  <Bookmark className="h-4 w-4" />
                  <span className="hidden sm:inline">Save</span>
                </button>

                {/* Mobile overflow menu */}
                <div ref={mobileMenuRef} className="relative sm:hidden">
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-2 text-sm text-text-dark transition-colors hover:bg-gray-50"
                    aria-label="More actions"
                    aria-expanded={mobileMenuOpen}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                  {mobileMenuOpen && (
                    <div
                      role="menu"
                      aria-label="More actions"
                      className="absolute right-0 top-full z-10 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
                    >
                      <ShareButton
                        shareUrl={`/prayer/${prayer.id}`}
                        shareTitle="A Prayer from Worship Room"
                        shareText={prayer.text.slice(0, 150)}
                        className="w-full"
                      />
                    </div>
                  )}
                </div>

                {/* Desktop share */}
                <div className="hidden sm:block">
                  <ShareButton
                    shareUrl={`/prayer/${prayer.id}`}
                    shareTitle="A Prayer from Worship Room"
                    shareText={prayer.text.slice(0, 150)}
                  />
                </div>
              </div>

              {/* Secondary CTAs */}
              <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                <button
                  type="button"
                  onClick={() => onSwitchToJournal?.(extractTopic())}
                  className="text-sm font-medium text-primary transition-colors hover:text-primary-light"
                >
                  Journal about this &rarr;
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-sm text-text-light underline transition-colors hover:text-text-dark"
                >
                  Pray about something else
                </button>
              </div>
            </div>
          )}

          {/* Input Section (hidden when prayer is displayed or loading) */}
          {!prayer && !isLoading && (
            <>
              <h2 className="mb-6 text-center font-sans text-2xl font-bold text-text-dark sm:text-3xl lg:text-4xl">
                What&apos;s On Your{' '}
                <span className="font-script text-3xl text-primary sm:text-4xl lg:text-5xl">
                  Heart?
                </span>
              </h2>

              {showChips && (
                <div className="mb-6 flex flex-wrap justify-center gap-2">
                  {DEFAULT_PRAYER_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => handleChipClick(chip)}
                      className="min-h-[44px] shrink-0 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-text-dark transition-colors hover:border-primary hover:text-primary"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              )}

              <div className="relative mb-4">
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value)
                    setNudge(false)
                    autoExpand(e.target)
                  }}
                  onInput={(e) => autoExpand(e.target as HTMLTextAreaElement)}
                  placeholder="Start typing here..."
                  maxLength={500}
                  rows={3}
                  className="w-full resize-none rounded-lg border border-glow-cyan/30 bg-white px-4 py-3 text-text-dark placeholder:text-text-light/60 animate-glow-pulse focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                  aria-label="Prayer request"
                  aria-describedby="pray-char-count"
                />
                <span id="pray-char-count" className="absolute bottom-2 right-3 text-xs text-text-light/60">
                  {text.length}/500
                </span>
              </div>

              <CrisisBanner text={text} />

              {nudge && (
                <p className="mb-4 text-sm text-warning" role="alert">
                  Tell God what&apos;s on your heart &mdash; even a few words is
                  enough.
                </p>
              )}

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleGenerate}
                  className="rounded-lg bg-primary px-8 py-3 font-semibold text-white transition-colors hover:bg-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  Generate Prayer
                </button>
              </div>
            </>
          )}

          {/* Classic Prayers Section — hidden; re-enable by removing false guard */}
          {false && (
          <div className="mt-12 border-t border-b border-gray-200 pt-8 pb-8">
            <button
              type="button"
              onClick={() => setClassicOpen(!classicOpen)}
              className="flex w-full items-center justify-between text-left"
              aria-expanded={classicOpen}
              aria-controls={classicOpen ? 'classic-prayers-panel' : undefined}
            >
              <h2 className="text-lg font-semibold text-text-dark">
                Classic Prayers
              </h2>
              {classicOpen ? (
                <ChevronUp className="h-5 w-5 text-text-light" />
              ) : (
                <ChevronDown className="h-5 w-5 text-text-light" />
              )}
            </button>

            {classicOpen && (
              <div id="classic-prayers-panel" className="mt-4 space-y-4">
                {classicPrayers.map((cp) => (
                  <ClassicPrayerCard
                    key={cp.id}
                    prayer={cp}
                    wordIndex={
                      classicReadAloudId === cp.id ? classicWordIndex : -1
                    }
                    onWordIndexChange={(idx) => {
                      setClassicReadAloudId(cp.id)
                      setClassicWordIndex(idx)
                    }}
                    onCopy={() => handleCopyClassic(cp)}
                  />
                ))}
              </div>
            )}
          </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ClassicPrayerCard({
  prayer,
  wordIndex,
  onWordIndexChange,
  onCopy,
}: {
  prayer: ClassicPrayer
  wordIndex: number
  onWordIndexChange: (idx: number) => void
  onCopy: () => void
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="mb-1 font-semibold text-text-dark">{prayer.title}</h3>
      <p className="mb-3 text-xs text-text-light">{prayer.attribution}</p>
      <KaraokeText
        text={prayer.text}
        currentWordIndex={wordIndex}
        className="whitespace-pre-wrap text-sm leading-relaxed text-text-dark"
      />
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-1 rounded border border-gray-200 px-2 py-1 text-xs text-text-dark hover:bg-gray-50"
          aria-label={`Copy ${prayer.title}`}
        >
          <Copy className="h-3 w-3" />
          Copy
        </button>
        <ReadAloudButton
          text={prayer.text}
          onWordIndexChange={onWordIndexChange}
        />
        <ShareButton
          shareUrl={`/prayer/classic-${prayer.id}`}
          shareTitle={prayer.title}
          shareText={prayer.text.slice(0, 150)}
        />
      </div>
    </div>
  )
}
