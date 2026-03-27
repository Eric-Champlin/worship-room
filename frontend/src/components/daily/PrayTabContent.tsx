import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
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
  AlertCircle,
} from 'lucide-react'
import { BackgroundSquiggle, SQUIGGLE_MASK_STYLE } from '@/components/BackgroundSquiggle'
import { useToast } from '@/components/ui/Toast'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import { ReadAloudButton } from '@/components/daily/ReadAloudButton'
import { KaraokeText } from '@/components/daily/KaraokeText'
import { KaraokeTextReveal } from '@/components/daily/KaraokeTextReveal'
import { ShareButton } from '@/components/daily/ShareButton'
import { CrisisBanner } from '@/components/daily/CrisisBanner'
import { CharacterCount } from '@/components/ui/CharacterCount'
import { SaveToPrayerListForm } from '@/components/daily/SaveToPrayerListForm'
import { GuidedPrayerSection } from '@/components/daily/GuidedPrayerSection'
import { GuidedPrayerPlayer } from '@/components/daily/GuidedPrayerPlayer'
import { getPrayers, MAX_PRAYERS } from '@/services/prayer-list-storage'
import { saveMeditationSession } from '@/services/meditation-storage'
import { getLocalDateString } from '@/utils/date'
import { useAuth } from '@/hooks/useAuth'
import { useCompletionTracking } from '@/hooks/useCompletionTracking'
import { useFaithPoints } from '@/hooks/useFaithPoints'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useAudioState, useAudioDispatch } from '@/components/audio/AudioProvider'
import { useScenePlayer } from '@/hooks/useScenePlayer'
import { SCENE_BY_ID } from '@/data/scenes'
import { cn } from '@/lib/utils'
import { AmbientSoundPill } from '@/components/daily/AmbientSoundPill'
import { DEFAULT_PRAYER_CHIPS } from '@/constants/daily-experience'
import { getPrayerPrefill } from '@/data/challenge-prefills'
import {
  getMockPrayer,
  getClassicPrayers,
} from '@/mocks/daily-experience-mock-data'
import type { MockPrayer, ClassicPrayer } from '@/types/daily-experience'
import type { GuidedPrayerSession } from '@/types/guided-prayer'

interface PrayTabContentProps {
  onSwitchToJournal?: (topic: string) => void
  initialContext?: string | null
}

export function PrayTabContent({ onSwitchToJournal, initialContext }: PrayTabContentProps) {
  const { showToast } = useToast()
  const authModal = useAuthModal()
  const { isAuthenticated } = useAuth()
  const { markPrayComplete, markGuidedPrayerComplete } = useCompletionTracking()
  const { recordActivity } = useFaithPoints()
  const prefersReduced = useReducedMotion()
  const audioState = useAudioState()
  const audioDispatch = useAudioDispatch()
  const { loadScene } = useScenePlayer()
  const location = useLocation()
  const navigate = useNavigate()
  const prayWallContext = (location.state as { prayWallContext?: string } | null)?.prayWallContext
  const challengeContext = (location.state as { challengeContext?: { actionType: string; dayTitle: string; dayNumber: number } } | null)?.challengeContext

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
  const [autoPlayedAudio, setAutoPlayedAudio] = useState(false)
  const [revealComplete, setRevealComplete] = useState(false)
  const [forceRevealComplete, setForceRevealComplete] = useState(false)
  const [reflectionVisible, setReflectionVisible] = useState(false)
  const [reflectionDismissed, setReflectionDismissed] = useState(false)
  const [resonatedMessage, setResonatedMessage] = useState(false)
  const [resonatedFading, setResonatedFading] = useState(false)
  const [sectionFading, setSectionFading] = useState(false)
  const [retryPrompt, setRetryPrompt] = useState<string | null>(null)
  const [saveToListOpen, setSaveToListOpen] = useState(false)
  const [savedToList, setSavedToList] = useState(false)
  const [activeGuidedSession, setActiveGuidedSession] = useState<GuidedPrayerSession | null>(null)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const mobileMenuRef = useRef<HTMLDivElement>(null)
  const resonatedTimersRef = useRef<ReturnType<typeof setTimeout>[]>([])

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

  // Pre-fill textarea when navigating from Prayer Wall
  // Guard: only consume prayWallContext when this tab is active — all tabs are
  // always mounted, so without the guard the first effect to fire clears
  // location.state before the target tab can read it.
  const activeTab = new URLSearchParams(location.search).get('tab') || 'pray'
  useEffect(() => {
    if (prayWallContext && activeTab === 'pray') {
      setText(prayWallContext)
      setSelectedChip(null)
      setNudge(false)
      // Clear location state so back-navigation doesn't re-fill
      navigate(location.pathname + location.search, { replace: true, state: null })
    }
  }, [prayWallContext, activeTab, navigate, location.pathname, location.search])

  // Pre-fill from URL context param (cross-feature CTA)
  const initialContextConsumed = useRef(false)
  useEffect(() => {
    if (initialContext && !initialContextConsumed.current && activeTab === 'pray' && !text) {
      initialContextConsumed.current = true
      setText(initialContext)
      setSelectedChip(null)
      setNudge(false)
    }
  }, [initialContext, activeTab, text])

  // Pre-fill from challenge context
  useEffect(() => {
    if (challengeContext && challengeContext.actionType === 'pray' && activeTab === 'pray') {
      setText(getPrayerPrefill(challengeContext.dayTitle, challengeContext.dayNumber))
      setSelectedChip(null)
      setNudge(false)
      navigate(location.pathname + location.search, { replace: true, state: null })
    }
  }, [challengeContext, activeTab, navigate, location.pathname, location.search])

  // Show reflection prompt after reveal completes
  useEffect(() => {
    if (revealComplete && prayer && !reflectionDismissed) {
      const timer = setTimeout(() => setReflectionVisible(true), 500)
      return () => clearTimeout(timer)
    }
  }, [revealComplete, prayer, reflectionDismissed])

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

    // Auto-play ambient sound if no audio playing and no reduced motion
    if (
      !prefersReduced &&
      audioState.activeSounds.length === 0 &&
      !audioState.pillVisible &&
      !audioState.activeRoutine
    ) {
      audioDispatch({ type: 'SET_MASTER_VOLUME', payload: { volume: 0.4 } })
      const upperRoom = SCENE_BY_ID.get('the-upper-room')
      if (upperRoom) {
        loadScene(upperRoom)
        setAutoPlayedAudio(true)
      }
    } else {
      setAutoPlayedAudio(false)
    }

    clearResonatedTimers()
    setIsLoading(true)
    setRevealComplete(false)
    setForceRevealComplete(false)
    setReflectionVisible(false)
    setReflectionDismissed(false)
    setResonatedMessage(false)
    setResonatedFading(false)
    setSectionFading(false)

    setTimeout(() => {
      const result = getMockPrayer(text)
      setPrayer(result)
      setIsLoading(false)
      markPrayComplete()
      recordActivity('pray')
    }, 1500)
  }

  const handleReset = () => {
    clearResonatedTimers()
    setPrayer(null)
    setText('')
    setSelectedChip(null)
    setNudge(false)
    setPrayerWordIndex(-1)
    setMobileMenuOpen(false)
    setAutoPlayedAudio(false)
    setRevealComplete(false)
    setForceRevealComplete(false)
    setReflectionVisible(false)
    setReflectionDismissed(false)
    setResonatedMessage(false)
    setResonatedFading(false)
    setSectionFading(false)
    setRetryPrompt(null)
    setSaveToListOpen(false)
    setSavedToList(false)
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

  const handleCopyClassic = async (p: ClassicPrayer) => {
    try {
      await navigator.clipboard.writeText(p.text)
      showToast('Copied to clipboard')
    } catch {
      showToast('Failed to copy', 'error')
    }
  }

  const clearResonatedTimers = () => {
    resonatedTimersRef.current.forEach(clearTimeout)
    resonatedTimersRef.current = []
  }

  const handleResonated = () => {
    clearResonatedTimers()
    setResonatedMessage(true)
    resonatedTimersRef.current.push(
      setTimeout(() => setResonatedFading(true), 3000),
      setTimeout(() => setSectionFading(true), 3500),
      setTimeout(() => {
        setReflectionDismissed(true)
        setReflectionVisible(false)
        setResonatedMessage(false)
        setResonatedFading(false)
        setSectionFading(false)
      }, 4000),
    )
  }

  const handleSomethingDifferent = () => {
    clearResonatedTimers()
    setReflectionDismissed(true)
    setPrayer(null)
    setText('')
    setSelectedChip(null)
    setNudge(false)
    setPrayerWordIndex(-1)
    setRevealComplete(false)
    setForceRevealComplete(false)
    setReflectionVisible(false)
    setAutoPlayedAudio(false)
    setRetryPrompt('Try describing what\'s on your heart differently.')
    setTimeout(() => {
      textareaRef.current?.focus()
      textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 100)
  }

  const handleJournalReflection = () => {
    setReflectionDismissed(true)
    onSwitchToJournal?.(extractTopic())
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

  // --- Guided Prayer handlers ---

  const handleStartGuidedSession = (session: GuidedPrayerSession) => {
    setActiveGuidedSession(session)
  }

  const handleGuidedSessionComplete = () => {
    if (!activeGuidedSession) return
    recordActivity('pray')
    markGuidedPrayerComplete(activeGuidedSession.id)
    saveMeditationSession({
      id: `guided-prayer-${activeGuidedSession.id}-${Date.now()}`,
      type: 'guided-prayer',
      date: getLocalDateString(new Date()),
      durationMinutes: activeGuidedSession.durationMinutes,
      completedAt: new Date().toISOString(),
    })
  }

  const handleGuidedPlayerClose = () => {
    setActiveGuidedSession(null)
  }

  const handleGuidedJournal = () => {
    const theme = activeGuidedSession?.theme ?? 'prayer'
    setActiveGuidedSession(null)
    onSwitchToJournal?.(theme)
  }

  const handleGuidedTryAnother = () => {
    setActiveGuidedSession(null)
    setTimeout(() => {
      document.getElementById('guided-prayer-section')?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  const showChips = !selectedChip && !text

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
      <div className="relative">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
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
            <div className="motion-safe:animate-fade-in">
              <p className="mb-2 text-sm font-medium text-white/50">
                Your prayer:
              </p>
              <div className="mb-6 rounded-2xl bg-white/[0.06] backdrop-blur-sm border border-white/10 p-6">
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

              {/* Skip link during reveal */}
              {!revealComplete && (
                <div className="mb-2 text-center">
                  <button
                    type="button"
                    onClick={() => setForceRevealComplete(true)}
                    className="text-xs text-white/40 underline transition-colors hover:text-white/70"
                  >
                    Skip
                  </button>
                </div>
              )}

              {/* Sound Indicator */}
              {autoPlayedAudio && audioState.activeSounds.length > 0 && (
                <div className="mb-4 text-center sm:text-left">
                  <span className="text-xs text-white/40">
                    Sound: The Upper Room
                    <span className="mx-1 text-white/20">&middot;</span>
                    <button
                      type="button"
                      onClick={() => audioDispatch({ type: audioState.drawerOpen ? 'CLOSE_DRAWER' : 'OPEN_DRAWER' })}
                      className="text-xs text-white/40 underline transition-colors hover:text-white/70"
                    >
                      Change
                    </button>
                    <span className="mx-1 text-white/20">&middot;</span>
                    <button
                      type="button"
                      onClick={() => {
                        audioDispatch({ type: 'STOP_ALL' })
                        setAutoPlayedAudio(false)
                      }}
                      className="text-xs text-white/40 underline transition-colors hover:text-white/70"
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
                  topicText={text}
                  prayerText={prayer.text}
                  onSave={() => {
                    setSaveToListOpen(false)
                    setSavedToList(true)
                    showToast('Added to your prayer list.')
                  }}
                  onCancel={() => setSaveToListOpen(false)}
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
                  onClick={() => onSwitchToJournal?.(extractTopic())}
                  className="text-sm font-medium text-primary transition-colors hover:text-primary-light"
                >
                  Journal about this &rarr;
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-sm text-white/50 underline transition-colors hover:text-white"
                >
                  Pray about something else
                </button>
              </div>
            </div>
          )}

          {/* Input Section (hidden when prayer is displayed or loading) */}
          {!prayer && !isLoading && (
            <>
              <h2 className="mb-4 text-center font-sans text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
                What&apos;s On Your{' '}
                <span className="font-script text-3xl text-primary sm:text-4xl lg:text-5xl">
                  Heart?
                </span>
              </h2>

              <AmbientSoundPill context="pray" variant="dark" />

              {retryPrompt && (
                <p className="mb-2 text-center text-sm text-white/50">
                  {retryPrompt}
                </p>
              )}

              {showChips && (
                <div className="mb-6 flex flex-wrap justify-center gap-2">
                  {DEFAULT_PRAYER_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => handleChipClick(chip)}
                      className="min-h-[44px] shrink-0 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/70 transition-colors hover:border-primary hover:text-primary"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              )}

              <div className="mb-4">
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value)
                    setNudge(false)
                    if (retryPrompt) setRetryPrompt(null)
                    autoExpand(e.target)
                  }}
                  onInput={(e) => autoExpand(e.target as HTMLTextAreaElement)}
                  placeholder="Start typing here..."
                  maxLength={500}
                  rows={3}
                  className="w-full resize-none rounded-lg border border-glow-cyan/30 bg-white/[0.06] px-4 py-3 text-white placeholder:text-white/40 motion-safe:animate-glow-pulse focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                  aria-label="Prayer request"
                  aria-describedby={nudge ? 'pray-error pray-char-count' : 'pray-char-count'}
                  aria-invalid={nudge ? 'true' : undefined}
                />
                <div className="mt-1 flex justify-end">
                  <CharacterCount current={text.length} max={500} warningAt={400} dangerAt={480} id="pray-char-count" />
                </div>
              </div>

              <CrisisBanner text={text} />

              {nudge && (
                <p id="pray-error" className="mb-4 flex items-center gap-1.5 text-sm text-red-400" role="alert">
                  <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                  Tell God what&apos;s on your heart — even a few words is enough.
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

          {/* Guided Prayer Sessions — always visible */}
          <div className="mt-12">
            <GuidedPrayerSection onStartSession={handleStartGuidedSession} />
          </div>
        </div>
      </div>

      {/* Player overlay (fixed positioning, visually covers full viewport) */}
      {activeGuidedSession && (
        <GuidedPrayerPlayer
          session={activeGuidedSession}
          onClose={handleGuidedPlayerClose}
          onComplete={handleGuidedSessionComplete}
          onJournalAboutThis={handleGuidedJournal}
          onTryAnother={handleGuidedTryAnother}
        />
      )}
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
