import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import { PrayerInput } from '@/components/daily/PrayerInput'
import { PrayerResponse } from '@/components/daily/PrayerResponse'
import { GuidedPrayerSection } from '@/components/daily/GuidedPrayerSection'
import { GuidedPrayerPlayer } from '@/components/daily/GuidedPrayerPlayer'
import { FriendPrayersToday } from '@/components/daily/FriendPrayersToday'
import { saveMeditationSession } from '@/services/meditation-storage'
import { getLocalDateString } from '@/utils/date'
import { useAuth } from '@/hooks/useAuth'
import { useCompletionTracking } from '@/hooks/useCompletionTracking'
import { useFaithPoints } from '@/hooks/useFaithPoints'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useAudioState, useAudioDispatch } from '@/components/audio/AudioProvider'
import { useScenePlayer } from '@/hooks/useScenePlayer'
import { SCENE_BY_ID } from '@/data/scenes'
import { PRAYER_DRAFT_KEY, VERSE_FRAMINGS } from '@/constants/daily-experience'
import { DevotionalPreviewPanel } from '@/components/daily/DevotionalPreviewPanel'
import { PrayLengthPicker } from '@/components/daily/PrayLengthPicker'
import { VersePromptCard, VersePromptSkeleton } from '@/components/daily/VersePromptCard'
import { useVerseContextPreload } from '@/hooks/dailyHub/useVerseContextPreload'
import { getPrayerPrefill } from '@/data/challenge-prefills'
import { fetchPrayer } from '@/services/prayer-service'
import type { MockPrayer, PrayContext, PrayerVerseContext } from '@/types/daily-experience'
import type { GuidedPrayerSession } from '@/types/guided-prayer'

interface PrayTabContentProps {
  onSwitchToJournal?: (topic: string) => void
  initialContext?: string | null
  prayContext?: PrayContext | null
}

export function PrayTabContent({ onSwitchToJournal, initialContext, prayContext }: PrayTabContentProps) {
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
  const { verseContext, isHydrating, clearVerseContext } = useVerseContextPreload('pray')
  const prayWallContext = (location.state as { prayWallContext?: string } | null)?.prayWallContext
  const challengeContext = (location.state as { challengeContext?: { actionType: string; dayTitle: string; dayNumber: number } } | null)?.challengeContext

  const [initialText, setInitialText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [prayer, setPrayer] = useState<MockPrayer | null>(null)
  const [autoPlayedAudio, setAutoPlayedAudio] = useState(false)
  const [retryPrompt, setRetryPrompt] = useState<string | null>(null)
  const [activeGuidedSession, setActiveGuidedSession] = useState<GuidedPrayerSession | null>(null)
  const [contextDismissed, setContextDismissed] = useState(false)

  const prayerVerseContext: PrayerVerseContext | null = verseContext
    ? { book: verseContext.book, chapter: verseContext.chapter, startVerse: verseContext.startVerse, endVerse: verseContext.endVerse, reference: verseContext.reference }
    : null

  const submittedTextRef = useRef('')
  const initialContextConsumed = useRef(false)

  // Pre-fill textarea when navigating from Prayer Wall
  const activeTab = new URLSearchParams(location.search).get('tab') || 'pray'
  useEffect(() => {
    if (prayWallContext && activeTab === 'pray') {
      setInitialText(prayWallContext)
      navigate(location.pathname + location.search, { replace: true, state: null })
    }
  }, [prayWallContext, activeTab, navigate, location.pathname, location.search])

  // Pre-fill from URL context param (cross-feature CTA)
  useEffect(() => {
    if (initialContext && !initialContextConsumed.current && activeTab === 'pray') {
      initialContextConsumed.current = true
      setInitialText(initialContext)
    }
  }, [initialContext, activeTab])

  // Pre-fill from challenge context
  useEffect(() => {
    if (challengeContext && challengeContext.actionType === 'pray' && activeTab === 'pray') {
      setInitialText(getPrayerPrefill(challengeContext.dayTitle, challengeContext.dayNumber))
      navigate(location.pathname + location.search, { replace: true, state: null })
    }
  }, [challengeContext, activeTab, navigate, location.pathname, location.search])

  // Pre-fill from devotional context
  const devotionalContextConsumed = useRef(false)
  useEffect(() => {
    if (
      prayContext?.from === 'devotional' &&
      prayContext.customPrompt &&
      !devotionalContextConsumed.current &&
      activeTab === 'pray'
    ) {
      devotionalContextConsumed.current = true
      setInitialText(prayContext.customPrompt)
      window.scrollTo(0, 0)
    }
  }, [prayContext, activeTab])

  // Reset context dismissed when prayContext changes
  useEffect(() => {
    if (prayContext?.from === 'devotional' && prayContext.customPrompt) {
      setContextDismissed(false)
    }
  }, [prayContext])

  const extractTopic = () => {
    if (!submittedTextRef.current.trim()) return 'prayer'
    const lower = submittedTextRef.current.toLowerCase()
    const topics = [
      'anxiety', 'grateful', 'healing', 'struggling',
      'forgive', 'guidance', 'grieving', 'lost',
    ]
    return topics.find((t) => lower.includes(t)) ?? 'prayer'
  }

  const handleGenerate = (inputText: string) => {
    if (!isAuthenticated) {
      const subtitle = inputText.trim()
        ? 'Sign in to pray together. Your draft is safe — we\u2019ll bring it back after.'
        : 'Sign in to generate a prayer'
      authModal?.openAuthModal(subtitle)
      return
    }
    submittedTextRef.current = inputText

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

    setIsLoading(true)
    fetchPrayer(inputText).then((result) => {
      setPrayer(result)
      setIsLoading(false)
      markPrayComplete()
      recordActivity('pray', 'daily_hub')
      try {
        localStorage.removeItem(PRAYER_DRAFT_KEY)
      } catch {
        // localStorage failure is non-critical
      }
    })
  }

  const handleReset = () => {
    setPrayer(null)
    setInitialText('')
    submittedTextRef.current = ''
    setAutoPlayedAudio(false)
    setRetryPrompt(null)
  }

  // --- Guided Prayer handlers ---

  const handleStartGuidedSession = (session: GuidedPrayerSession) => {
    setActiveGuidedSession(session)
  }

  const handleGuidedSessionComplete = () => {
    if (!activeGuidedSession) return
    recordActivity('pray', 'daily_hub')
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

  return (
    <>
      <div>
        <div className="mx-auto max-w-2xl px-4 pt-10 pb-4 sm:pt-14 sm:pb-6">
          {/* Spec 6.2b — Length picker. Renders when no AI prayer is loading or
              displayed (same condition as PrayerInput below). DailyHub mounts a
              PraySession overlay above this content when ?length= is valid, so
              the picker is visually hidden during a session. */}
          {!prayer && !isLoading && <PrayLengthPicker />}

          {/* Devotional Preview Panel */}
          {prayContext?.from === 'devotional' && prayContext.devotionalSnapshot && !contextDismissed && !isLoading && !prayer && (
            <DevotionalPreviewPanel
              snapshot={prayContext.devotionalSnapshot}
              onDismiss={() => setContextDismissed(true)}
            />
          )}

          {/* Verse Prompt Card (from Bible bridge) */}
          {isHydrating && !isLoading && !prayer && <VersePromptSkeleton />}
          {verseContext && !isLoading && !prayer && (
            <VersePromptCard context={verseContext} onRemove={clearVerseContext} framingLine={VERSE_FRAMINGS.pray} />
          )}

          {/* Prayer Response (loading + display + actions) */}
          {(isLoading || prayer) && (
            <PrayerResponse
              key={prayer?.id ?? 'loading'}
              prayer={prayer}
              isLoading={isLoading}
              topic={extractTopic()}
              onReset={handleReset}
              onRetryPrompt={(prompt) => setRetryPrompt(prompt)}
              onSwitchToJournal={(t) => onSwitchToJournal?.(t)}
              autoPlayedAudio={autoPlayedAudio}
              audioActiveSounds={audioState.activeSounds.length}
              onToggleAudioDrawer={() => audioDispatch({ type: audioState.drawerOpen ? 'CLOSE_DRAWER' : 'OPEN_DRAWER' })}
              onStopAudio={() => { audioDispatch({ type: 'STOP_ALL' }); setAutoPlayedAudio(false) }}
              verseContext={prayerVerseContext}
            />
          )}

          {/* Input Section (hidden when prayer is displayed or loading) */}
          {!prayer && !isLoading && (
            <PrayerInput
              onSubmit={handleGenerate}
              isLoading={isLoading}
              initialText={initialText}
              retryPrompt={retryPrompt}
              onRetryPromptClear={() => setRetryPrompt(null)}
            />
          )}

        </div>

        {/* Spec 7.4 — Friend prayer surfacing. Component handles its own auth gate
            and empty states. Mounts between PrayerInput and the Guided Prayer
            Sessions. */}
        <FriendPrayersToday />

        {/* Guided Prayer Sessions — wider container for square cards */}
        <div className="mx-auto mt-6 max-w-4xl px-4 pb-10 sm:pb-14">
          <GuidedPrayerSection onStartSession={handleStartGuidedSession} />
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
    </>
  )
}
