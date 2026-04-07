import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import { GlowBackground } from '@/components/homepage/GlowBackground'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import { PrayerInput } from '@/components/daily/PrayerInput'
import { PrayerResponse } from '@/components/daily/PrayerResponse'
import { GuidedPrayerSection } from '@/components/daily/GuidedPrayerSection'
import { GuidedPrayerPlayer } from '@/components/daily/GuidedPrayerPlayer'
import { saveMeditationSession } from '@/services/meditation-storage'
import { getLocalDateString } from '@/utils/date'
import { useAuth } from '@/hooks/useAuth'
import { useCompletionTracking } from '@/hooks/useCompletionTracking'
import { useFaithPoints } from '@/hooks/useFaithPoints'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useAudioState, useAudioDispatch } from '@/components/audio/AudioProvider'
import { useScenePlayer } from '@/hooks/useScenePlayer'
import { SCENE_BY_ID } from '@/data/scenes'
import { PRAYER_DRAFT_KEY } from '@/constants/daily-experience'
import { DevotionalPreviewPanel } from '@/components/daily/DevotionalPreviewPanel'
import { getPrayerPrefill } from '@/data/challenge-prefills'
import { getMockPrayer } from '@/mocks/daily-experience-mock-data'
import type { MockPrayer, PrayContext } from '@/types/daily-experience'
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
  const prayWallContext = (location.state as { prayWallContext?: string } | null)?.prayWallContext
  const challengeContext = (location.state as { challengeContext?: { actionType: string; dayTitle: string; dayNumber: number } } | null)?.challengeContext

  const [initialText, setInitialText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [prayer, setPrayer] = useState<MockPrayer | null>(null)
  const [autoPlayedAudio, setAutoPlayedAudio] = useState(false)
  const [retryPrompt, setRetryPrompt] = useState<string | null>(null)
  const [activeGuidedSession, setActiveGuidedSession] = useState<GuidedPrayerSession | null>(null)
  const [contextDismissed, setContextDismissed] = useState(false)

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
    setTimeout(() => {
      const result = getMockPrayer(inputText)
      setPrayer(result)
      setIsLoading(false)
      markPrayComplete()
      recordActivity('pray')
      try {
        localStorage.removeItem(PRAYER_DRAFT_KEY)
      } catch {
        // localStorage failure is non-critical
      }
    }, 1500)
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

  return (
    <>
      <GlowBackground variant="center" glowOpacity={0.30} className="!bg-transparent">
        <div className="mx-auto max-w-2xl px-4 pt-10 pb-4 sm:pt-14 sm:pb-6">
          {/* Devotional Preview Panel */}
          {prayContext?.from === 'devotional' && prayContext.devotionalSnapshot && !contextDismissed && !isLoading && !prayer && (
            <DevotionalPreviewPanel snapshot={prayContext.devotionalSnapshot} />
          )}

          {/* Devotional Context Banner */}
          {prayContext?.from === 'devotional' && prayContext.customPrompt && !contextDismissed && !isLoading && !prayer && (
            <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 p-3" role="status" aria-live="polite">
              <p className="text-sm text-white/80">
                Praying about today&apos;s devotional on{' '}
                <span className="font-medium">{prayContext.topic ?? 'today\u2019s reading'}</span>
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                <button
                  type="button"
                  onClick={() => setContextDismissed(true)}
                  className="inline-flex min-h-[44px] items-center text-xs text-primary underline hover:text-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:rounded"
                >
                  Pray about something else
                </button>
                <a
                  href="/daily?tab=devotional"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[44px] items-center gap-1 text-xs text-white/60 underline hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:rounded"
                >
                  View full devotional
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              </div>
            </div>
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

        {/* Guided Prayer Sessions — wider container for square cards */}
        <div className="mx-auto mt-6 max-w-4xl px-4 pb-10 sm:pb-14">
          <GuidedPrayerSection onStartSession={handleStartGuidedSession} />
        </div>
      </GlowBackground>

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
