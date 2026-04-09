import { useState, useRef, useEffect, useMemo } from 'react'
import {
  Copy,
  Bookmark,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  Heart,
  RefreshCw,
  PenLine,
  ListPlus,
  Check,
} from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import { useAuth } from '@/hooks/useAuth'
import { ReadAloudButton } from '@/components/daily/ReadAloudButton'
import { KaraokeText } from '@/components/daily/KaraokeText'
import { KaraokeTextReveal } from '@/components/daily/KaraokeTextReveal'
import { ShareButton } from '@/components/daily/ShareButton'
import { SaveToPrayerListForm } from '@/components/daily/SaveToPrayerListForm'
import { getPrayers, MAX_PRAYERS } from '@/services/prayer-list-storage'
import { cn } from '@/lib/utils'
import { getClassicPrayers } from '@/mocks/daily-experience-mock-data'
import type { MockPrayer, ClassicPrayer, PrayerVerseContext } from '@/types/daily-experience'

export interface PrayerResponseProps {
  prayer: MockPrayer | null
  isLoading: boolean
  topic: string
  onReset: () => void
  onRetryPrompt: (prompt: string) => void
  onSwitchToJournal: (topic: string) => void
  autoPlayedAudio: boolean
  audioActiveSounds: number
  onToggleAudioDrawer: () => void
  onStopAudio: () => void
  /** Verse context from Bible bridge — forward-compatible prop for Phase 3 save flow */
  verseContext?: PrayerVerseContext | null
}

export function PrayerResponse({
  prayer,
  isLoading,
  topic,
  onReset,
  onRetryPrompt,
  onSwitchToJournal,
  autoPlayedAudio,
  audioActiveSounds,
  onToggleAudioDrawer,
  onStopAudio,
  verseContext,
}: PrayerResponseProps) {
  const { showToast } = useToast()
  const authModal = useAuthModal()
  const { isAuthenticated } = useAuth()

  const [prayerWordIndex, setPrayerWordIndex] = useState(-1)
  const [revealComplete, setRevealComplete] = useState(false)
  const [forceRevealComplete, setForceRevealComplete] = useState(false)
  const [reflectionVisible, setReflectionVisible] = useState(false)
  const [reflectionDismissed, setReflectionDismissed] = useState(false)
  const [resonatedMessage, setResonatedMessage] = useState(false)
  const [resonatedFading, setResonatedFading] = useState(false)
  const [sectionFading, setSectionFading] = useState(false)
  const [saveToListOpen, setSaveToListOpen] = useState(false)
  const [savedToList, setSavedToList] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [classicOpen, setClassicOpen] = useState(false)
  const [classicReadAloudId, setClassicReadAloudId] = useState<string | null>(null)
  const [classicWordIndex, setClassicWordIndex] = useState(-1)

  const mobileMenuRef = useRef<HTMLDivElement>(null)
  const resonatedTimersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const classicPrayers = useMemo(() => getClassicPrayers(), [])

  // Cleanup resonated timers on unmount
  useEffect(() => {
    return () => {
      resonatedTimersRef.current.forEach(clearTimeout)
    }
  }, [])

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

  // Show reflection prompt after reveal completes
  useEffect(() => {
    if (revealComplete && prayer && !reflectionDismissed) {
      const timer = setTimeout(() => setReflectionVisible(true), 500)
      return () => clearTimeout(timer)
    }
  }, [revealComplete, prayer, reflectionDismissed])

  const clearResonatedTimers = () => {
    resonatedTimersRef.current.forEach(clearTimeout)
    resonatedTimersRef.current = []
  }

  const handleCopy = async () => {
    if (!prayer) return
    try {
      await navigator.clipboard.writeText(prayer.text)
      showToast('Prayer copied — share it with someone who needs it.')
    } catch (_e) {
      showToast("We couldn't copy that. Try again.", 'error')
    }
  }

  const handleSave = () => {
    if (!isAuthenticated) {
      authModal?.openAuthModal('Sign in to save your prayers')
      return
    }
    showToast('Saving prayers is coming soon. For now, try copying it.')
  }

  const handleSaveToList = () => {
    if (!isAuthenticated) {
      authModal?.openAuthModal('Sign in to save prayers to your list.')
      return
    }
    if (getPrayers().length >= MAX_PRAYERS) {
      showToast(
        "You've reached the 200 prayer limit. Consider archiving answered prayers to make room.",
        'error',
      )
      return
    }
    setSaveToListOpen(true)
  }

  const handleResonated = () => {
    clearResonatedTimers()
    setResonatedMessage(true)
    const RESONATED_FADE_START_MS = 3000
    const SECTION_FADE_START_MS = 3500
    const SECTION_DISMISS_MS = 4000
    resonatedTimersRef.current.push(
      setTimeout(() => setResonatedFading(true), RESONATED_FADE_START_MS),
      setTimeout(() => setSectionFading(true), SECTION_FADE_START_MS),
      setTimeout(() => {
        setReflectionDismissed(true)
        setReflectionVisible(false)
        setResonatedMessage(false)
        setResonatedFading(false)
        setSectionFading(false)
      }, SECTION_DISMISS_MS),
    )
  }

  const handleSomethingDifferent = () => {
    clearResonatedTimers()
    setReflectionDismissed(true)
    onReset()
    onRetryPrompt('Try describing what\'s on your heart differently.')
  }

  const handleJournalReflection = () => {
    setReflectionDismissed(true)
    onSwitchToJournal(topic)
  }

  const handleCopyClassic = async (p: ClassicPrayer) => {
    try {
      await navigator.clipboard.writeText(p.text)
      showToast('Copied — ready to share.')
    } catch (_e) {
      showToast("We couldn't copy that. Try again.", 'error')
    }
  }

  return (
    <>
      {/* Loading State */}
      <div aria-live="polite">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 flex gap-1">
              <span className="inline-block h-2 w-2 motion-safe:animate-bounce motion-reduce:animate-none rounded-full bg-primary [animation-delay:0ms]" />
              <span className="inline-block h-2 w-2 motion-safe:animate-bounce motion-reduce:animate-none rounded-full bg-primary [animation-delay:150ms]" />
              <span className="inline-block h-2 w-2 motion-safe:animate-bounce motion-reduce:animate-none rounded-full bg-primary [animation-delay:300ms]" />
            </div>
            <p className="text-white/50">Generating prayer for you...</p>
          </div>
        )}
      </div>

      {/* Generated Prayer Display */}
      {prayer && !isLoading && (
        <div className="motion-safe:animate-fade-in" aria-live="polite">
          <p className="mb-2 text-sm font-medium text-white/50">
            Your prayer:
          </p>
          <div className="mb-6 rounded-2xl bg-white/[0.06] backdrop-blur-sm border border-white/10 p-6">
            {/* Full text for screen readers (hidden visually during animation) */}
            <span className="sr-only">{prayer.text}</span>
            <div aria-hidden="true">
              {revealComplete ? (
                <KaraokeText
                  text={prayer.text}
                  currentWordIndex={prayerWordIndex}
                  className="font-serif text-lg leading-relaxed text-white/80"
                />
              ) : (
                <KaraokeTextReveal
                  text={prayer.text}
                  msPerWord={80}
                  forceComplete={forceRevealComplete}
                  onRevealComplete={() => setRevealComplete(true)}
                  className="font-serif text-lg leading-relaxed text-white/80"
                />
              )}
            </div>
          </div>

          {/* Skip link during reveal */}
          {!revealComplete && (
            <div className="mb-2 text-center">
              <button
                type="button"
                onClick={() => setForceRevealComplete(true)}
                className="text-xs text-white/50 underline transition-colors hover:text-white/70"
              >
                Skip
              </button>
            </div>
          )}

          {/* Sound Indicator */}
          {autoPlayedAudio && audioActiveSounds > 0 && (
            <div className="mb-4 text-center sm:text-left">
              <span className="text-xs text-white/60">
                Sound: The Upper Room
                <span className="mx-1 text-white/20">&middot;</span>
                <button
                  type="button"
                  onClick={onToggleAudioDrawer}
                  className="text-xs text-white/50 underline transition-colors hover:text-white/70"
                >
                  Change
                </button>
                <span className="mx-1 text-white/20">&middot;</span>
                <button
                  type="button"
                  onClick={onStopAudio}
                  className="text-xs text-white/50 underline transition-colors hover:text-white/70"
                >
                  Stop
                </button>
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mb-6 flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/15"
              aria-label="Copy prayer"
            >
              <Copy className="h-4 w-4" />
              <span className="hidden sm:inline">Copy</span>
            </button>

            <span
              role="presentation"
              onClickCapture={() => { if (!revealComplete) setForceRevealComplete(true) }}
            >
              <ReadAloudButton
                text={prayer.text}
                onWordIndexChange={setPrayerWordIndex}
              />
            </span>

            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/15"
              aria-label="Save prayer"
            >
              <Bookmark className="h-4 w-4" />
              <span className="hidden sm:inline">Save</span>
            </button>

            {/* Save to prayer list */}
            {!savedToList ? (
              <button
                type="button"
                onClick={handleSaveToList}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/15"
                aria-label="Save to prayer list"
              >
                <ListPlus className="h-4 w-4" />
                <span className="hidden sm:inline">Save to List</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-sm text-success">
                <Check className="h-4 w-4" />
                <span className="hidden sm:inline">Saved</span>
              </span>
            )}

            {/* Mobile overflow menu */}
            <div ref={mobileMenuRef} className="relative sm:hidden">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="inline-flex items-center rounded-lg bg-white/10 px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/15"
                aria-label="More actions"
                aria-expanded={mobileMenuOpen}
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {mobileMenuOpen && (
                <div
                  role="menu"
                  aria-label="More actions"
                  className="absolute right-0 top-full z-10 mt-1 w-48 rounded-lg border border-white/10 bg-dashboard-dark py-1 shadow-lg"
                >
                  {!savedToList && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMobileMenuOpen(false)
                        handleSaveToList()
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-white/70 hover:bg-white/10"
                    >
                      <ListPlus className="h-4 w-4" />
                      Save to List
                    </button>
                  )}
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

          {/* Save to prayer list form */}
          {saveToListOpen && prayer && (
            <SaveToPrayerListForm
              topicText={topic}
              prayerText={prayer.text}
              onSave={() => {
                setSaveToListOpen(false)
                setSavedToList(true)
                showToast('Added to your prayer list.')
              }}
              onCancel={() => setSaveToListOpen(false)}
              verseContext={verseContext}
            />
          )}

          {/* Post-prayer reflection prompt */}
          {reflectionVisible && !reflectionDismissed && (
            <div className={cn(
              'mb-4 mt-6',
              !sectionFading && 'animate-fade-in',
              sectionFading && 'opacity-0 transition-opacity duration-500',
            )}>
              <p className="mb-3 text-sm font-medium text-white">
                How did that prayer land?
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                <button
                  type="button"
                  onClick={handleResonated}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-white/70 transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  aria-label="It resonated — show encouraging message"
                >
                  <Heart className="h-4 w-4" aria-hidden="true" />
                  It resonated
                </button>
                <button
                  type="button"
                  onClick={handleSomethingDifferent}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-white/70 transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  aria-label="Something different — try a new prayer"
                >
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  Something different
                </button>
                <button
                  type="button"
                  onClick={handleJournalReflection}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-white/70 transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  aria-label="Journal about this prayer"
                >
                  <PenLine className="h-4 w-4" aria-hidden="true" />
                  Journal about this
                </button>
              </div>

              {resonatedMessage && (
                <p
                  className={cn(
                    'mt-3 text-center text-sm italic text-white/50 transition-opacity duration-300',
                    resonatedFading ? 'opacity-0' : 'opacity-100',
                  )}
                  aria-live="polite"
                >
                  We&apos;re glad. Carry this prayer with you today.
                </p>
              )}
            </div>
          )}

          {/* Secondary CTAs */}
          <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <button
              type="button"
              onClick={() => onSwitchToJournal(topic)}
              className="text-sm font-medium text-primary transition-colors hover:text-primary-light"
            >
              Journal about this &rarr;
            </button>
            <button
              type="button"
              onClick={onReset}
              className="text-sm text-white/50 underline transition-colors hover:text-white"
            >
              Pray about something else
            </button>
          </div>
        </div>
      )}

      {/* Classic Prayers Section — hidden; re-enable by removing false guard */}
      {false && (
      <div className="mt-12 border-t border-b border-white/10 pt-8 pb-8">
        <button
          type="button"
          onClick={() => setClassicOpen(!classicOpen)}
          className="flex w-full items-center justify-between text-left"
          aria-expanded={classicOpen}
          aria-controls={classicOpen ? 'classic-prayers-panel' : undefined}
        >
          <h2 className="text-lg font-semibold text-white">
            Classic Prayers
          </h2>
          {classicOpen ? (
            <ChevronUp className="h-5 w-5 text-white/50" />
          ) : (
            <ChevronDown className="h-5 w-5 text-white/50" />
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
    </>
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
    <div className="rounded-lg border border-white/10 bg-white/[0.06] p-4">
      <h3 className="mb-1 font-semibold text-white">{prayer.title}</h3>
      <p className="mb-3 text-xs text-white/50">{prayer.attribution}</p>
      <KaraokeText
        text={prayer.text}
        currentWordIndex={wordIndex}
        className="whitespace-pre-wrap text-sm leading-relaxed text-white/80"
      />
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-1 rounded bg-white/10 px-2 py-1 text-xs text-white/70 hover:bg-white/15"
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
