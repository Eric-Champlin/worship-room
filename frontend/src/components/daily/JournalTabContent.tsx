import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { BookOpen, PenLine } from 'lucide-react'
import { BackgroundSquiggle, SQUIGGLE_MASK_STYLE } from '@/components/BackgroundSquiggle'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/hooks/useAuth'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import { useCompletionTracking } from '@/hooks/useCompletionTracking'
import { useFaithPoints } from '@/hooks/useFaithPoints'
import {
  JOURNAL_MILESTONES_KEY,
  JOURNAL_MODE_KEY,
  JOURNAL_DRAFT_KEY,
} from '@/constants/daily-experience'
import {
  getJournalPrompts,
  getJournalReflection,
} from '@/mocks/daily-experience-mock-data'
import { FeatureEmptyState } from '@/components/ui/FeatureEmptyState'
import { JournalInput } from '@/components/daily/JournalInput'
import { SavedEntriesList } from '@/components/daily/SavedEntriesList'
import type { JournalMode, SavedJournalEntry, PrayContext } from '@/types/daily-experience'

const JOURNAL_MILESTONES: Record<number, string> = {
  10: '10 entries! Your journal is becoming a treasure.',
  25: '25 entries! You\'re building a beautiful record of growth.',
  50: '50 entries! Half a hundred conversations with God.',
  100: '100 entries! What an incredible journey of reflection.',
}

interface JournalTabContentProps {
  prayContext?: PrayContext | null
  onSwitchTab?: (tab: 'pray' | 'journal' | 'meditate') => void
  urlPrompt?: string | null
}

export function JournalTabContent({ prayContext = null, onSwitchTab, urlPrompt }: JournalTabContentProps) {
  const { showToast, showCelebrationToast } = useToast()
  const authModal = useAuthModal()
  const { isAuthenticated } = useAuth()
  const { markJournalComplete } = useCompletionTracking()
  const { recordActivity } = useFaithPoints()
  const location = useLocation()
  const navigate = useNavigate()
  const prayWallContext = (location.state as { prayWallContext?: string } | null)?.prayWallContext
  const challengeContext = (location.state as { challengeContext?: { actionType: string; dailyAction: string } } | null)?.challengeContext

  // Mode toggle
  const [mode, setMode] = useState<JournalMode>(() => {
    try {
      const saved = localStorage.getItem(JOURNAL_MODE_KEY)
      return saved === 'free' ? 'free' : 'guided'
    } catch (_e) {
      return 'guided'
    }
  })

  // Context banner
  const [contextDismissed, setContextDismissed] = useState(false)

  // Prompt
  const allPrompts = useMemo(() => getJournalPrompts(), [])
  const [promptIndex, setPromptIndex] = useState(() =>
    Math.floor(Math.random() * allPrompts.length),
  )

  // Saved entries
  const [savedEntries, setSavedEntries] = useState<SavedJournalEntry[]>([])

  // Parent textarea ref for scroll-to-focus
  const parentTextareaRef = useRef<HTMLTextAreaElement | null>(null)

  // Context prompt (from Prayer Wall / challenge / URL)
  const [contextPrompt, setContextPrompt] = useState<string | null>(null)

  // Switch to Guided mode when prayContext arrives
  useEffect(() => {
    if (prayContext?.from === 'pray') {
      setMode('guided')
      setContextDismissed(false)
    }
  }, [prayContext])

  // Prayer Wall context
  const activeTab = new URLSearchParams(location.search).get('tab') || 'pray'
  useEffect(() => {
    if (prayWallContext && activeTab === 'journal') {
      setMode('guided')
      setContextPrompt(
        `Reflect on this prayer request: "${prayWallContext}". What feelings does it stir in you?`,
      )
      setContextDismissed(false)
      navigate(location.pathname + location.search, { replace: true, state: null })
    }
  }, [prayWallContext, activeTab, navigate, location.pathname, location.search])

  // Challenge context
  useEffect(() => {
    if (challengeContext && challengeContext.actionType === 'journal' && activeTab === 'journal') {
      setMode('guided')
      setContextPrompt(challengeContext.dailyAction)
      setContextDismissed(false)
      navigate(location.pathname + location.search, { replace: true, state: null })
    }
  }, [challengeContext, activeTab, navigate, location.pathname, location.search])

  // URL prompt param
  const urlPromptConsumed = useRef(false)
  useEffect(() => {
    if (urlPrompt && !urlPromptConsumed.current && activeTab === 'journal') {
      urlPromptConsumed.current = true
      setMode('guided')
      setContextPrompt(urlPrompt)
      setContextDismissed(false)
    }
  }, [urlPrompt, activeTab])

  const handleModeChange = useCallback((newMode: JournalMode) => {
    setMode(newMode)
    try {
      localStorage.setItem(JOURNAL_MODE_KEY, newMode)
    } catch (_e) {
      // localStorage write failure is non-critical
    }
  }, [])

  const handleTryDifferentPrompt = () => {
    if (allPrompts.length <= 1) return
    let next = Math.floor(Math.random() * allPrompts.length)
    while (next === promptIndex) {
      next = Math.floor(Math.random() * allPrompts.length)
    }
    setPromptIndex(next)
  }

  const currentPrompt = contextPrompt && !contextDismissed
    ? contextPrompt
    : prayContext?.from === 'pray' && !contextDismissed
      ? `Reflect on your prayer about ${prayContext.topic ?? 'what you shared'}. How did it feel to bring that before God? What comes up as you sit with it?`
      : allPrompts[promptIndex]?.text ?? ''

  const showPromptRefresh = !(prayContext?.from === 'pray' && !contextDismissed)

  const handleEntrySave = (entry: { content: string; mode: JournalMode; promptText?: string }) => {
    const savedEntry: SavedJournalEntry = {
      id: `entry-${Date.now()}`,
      content: entry.content,
      timestamp: new Date().toISOString(),
      mode: entry.mode,
      promptText: entry.promptText,
    }
    setSavedEntries((prev) => [savedEntry, ...prev])
    markJournalComplete()
    recordActivity('journal')
    showToast('Entry saved')

    // Milestone celebration check
    const newCount = savedEntries.length + 1
    const milestoneMessage = JOURNAL_MILESTONES[newCount]
    if (milestoneMessage) {
      let celebrated: number[] = []
      try {
        celebrated = JSON.parse(localStorage.getItem(JOURNAL_MILESTONES_KEY) ?? '[]')
      } catch (_e) {
        celebrated = []
      }
      if (!celebrated.includes(newCount)) {
        celebrated.push(newCount)
        try {
          localStorage.setItem(JOURNAL_MILESTONES_KEY, JSON.stringify(celebrated))
        } catch (_e) {
          // localStorage write failure is non-critical
        }
        const milestoneIcon = (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
            <BookOpen className="h-4 w-4 text-primary-lt" />
          </div>
        )
        showCelebrationToast(
          'Journal Milestone',
          milestoneMessage,
          'celebration-confetti',
          milestoneIcon,
        )
      }
    }
  }

  const handleReflect = (entryId: string) => {
    if (!isAuthenticated) {
      authModal?.openAuthModal('Sign in to reflect on your entry')
      return
    }
    const reflection = getJournalReflection()
    setSavedEntries((prev) =>
      prev.map((e) =>
        e.id === entryId ? { ...e, reflection: reflection.text } : e,
      ),
    )
  }

  const handleWriteAnother = () => {
    try {
      localStorage.removeItem(JOURNAL_DRAFT_KEY)
    } catch (_e) {
      // localStorage removal failure is non-critical
    }
    if (parentTextareaRef.current) {
      parentTextareaRef.current.style.height = 'auto'
      parentTextareaRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      parentTextareaRef.current.focus()
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
      {/* Squiggle background wrapper */}
      <div className="relative">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={SQUIGGLE_MASK_STYLE}
        >
          <BackgroundSquiggle />
        </div>
        <div className="relative">
          <JournalInput
            mode={mode}
            onModeChange={handleModeChange}
            currentPrompt={currentPrompt}
            onTryDifferentPrompt={handleTryDifferentPrompt}
            showPromptRefresh={showPromptRefresh}
            prayContext={prayContext}
            contextDismissed={contextDismissed}
            onDismissContext={() => setContextDismissed(true)}
            onSave={handleEntrySave}
            onTextareaRef={(ref) => { parentTextareaRef.current = ref }}
          />
        </div>
      </div>

      {/* Saved Entries */}
      {savedEntries.length > 0 && (
        <SavedEntriesList
          entries={savedEntries}
          onWriteAnother={handleWriteAnother}
          onReflect={handleReflect}
          onSwitchTab={onSwitchTab}
        />
      )}

      {/* Empty state for no saved entries */}
      {savedEntries.length === 0 && isAuthenticated && (
        <FeatureEmptyState
          icon={PenLine}
          heading="Your journal is waiting"
          description="Every thought you write becomes a conversation with God. Start with whatever's on your heart."
          ctaLabel="Write your first entry"
          onCtaClick={() => {
            parentTextareaRef.current?.scrollIntoView({ behavior: 'smooth' })
            parentTextareaRef.current?.focus()
          }}
        />
      )}
    </div>
  )
}
