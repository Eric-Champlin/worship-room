import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { BookOpen, PenLine } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/hooks/useAuth'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import { useCompletionTracking } from '@/hooks/useCompletionTracking'
import { useFaithPoints } from '@/hooks/useFaithPoints'
import {
  JOURNAL_MILESTONES_KEY,
  JOURNAL_MODE_KEY,
  JOURNAL_DRAFT_KEY,
  VERSE_FRAMINGS,
} from '@/constants/daily-experience'
import { getJournalPrompts } from '@/mocks/daily-experience-mock-data'
import { fetchJournalReflection } from '@/services/journal-reflection-service'
import { FeatureEmptyState } from '@/components/ui/FeatureEmptyState'
import { JournalInput } from '@/components/daily/JournalInput'
import { SavedEntriesList } from '@/components/daily/SavedEntriesList'
import { VersePromptCard, VersePromptSkeleton } from '@/components/daily/VersePromptCard'
import { useVerseContextPreload } from '@/hooks/dailyHub/useVerseContextPreload'
import { getAllJournalEntries, createJournalEntry, JournalStorageFullError } from '@/lib/bible/journalStore'
import type { JournalMode, SavedJournalEntry, PrayContext, JournalVerseContext } from '@/types/daily-experience'

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
  const { verseContext, isHydrating, clearVerseContext } = useVerseContextPreload('journal')
  const prayWallContext = (location.state as { prayWallContext?: string } | null)?.prayWallContext
  const challengeContext = (location.state as { challengeContext?: { actionType: string; dailyAction: string } } | null)?.challengeContext

  const journalVerseContext: JournalVerseContext | null = verseContext
    ? { book: verseContext.book, chapter: verseContext.chapter, startVerse: verseContext.startVerse, endVerse: verseContext.endVerse, reference: verseContext.reference }
    : null

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

  // Per-entry reflection loading state. Set<string> of entry IDs currently
  // fetching a reflection — supports multiple concurrent reflects (one per entry).
  const [reflectingIds, setReflectingIds] = useState<Set<string>>(new Set())

  // Saved entries — load from persistent store on mount
  const [savedEntries, setSavedEntries] = useState<SavedJournalEntry[]>(() => {
    try {
      return getAllJournalEntries()
        .sort((a, b) => b.createdAt - a.createdAt)
        .map((e) => ({
          id: e.id,
          content: e.body,
          timestamp: new Date(e.createdAt).toISOString(),
          mode: 'free' as JournalMode,
          ...(e.verseContext && { verseContext: e.verseContext }),
        }))
    } catch {
      return []
    }
  })

  // Parent textarea ref for scroll-to-focus
  const parentTextareaRef = useRef<HTMLTextAreaElement | null>(null)

  // Context prompt (from Prayer Wall / challenge / URL)
  const [contextPrompt, setContextPrompt] = useState<string | null>(null)

  // Draft conflict dialog state
  const [draftConflictPending, setDraftConflictPending] = useState(false)
  const [draftClearSignal, setDraftClearSignal] = useState(0)

  // Switch to Guided mode when prayContext arrives
  useEffect(() => {
    if (prayContext?.from === 'pray') {
      setMode('guided')
      setContextDismissed(false)
    }
  }, [prayContext])

  // Switch to Guided mode when devotional context arrives
  useEffect(() => {
    if (prayContext?.from === 'devotional' && prayContext.customPrompt) {
      const existingDraft = localStorage.getItem(JOURNAL_DRAFT_KEY)
      if (existingDraft && existingDraft.trim().length > 0) {
        setDraftConflictPending(true)
      } else {
        setMode('guided')
        setContextDismissed(false)
        window.scrollTo(0, 0)
      }
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

  const handleStartFresh = useCallback(() => {
    setDraftConflictPending(false)
    localStorage.removeItem(JOURNAL_DRAFT_KEY)
    setDraftClearSignal((c) => c + 1)
    setMode('guided')
    setContextDismissed(false)
    window.scrollTo(0, 0)
  }, [])

  const handleKeepDraft = useCallback(() => {
    setDraftConflictPending(false)
    setContextDismissed(true)
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
    : prayContext?.from === 'devotional' && prayContext.customPrompt && !contextDismissed
      ? prayContext.customPrompt
      : prayContext?.from === 'pray' && !contextDismissed
        ? `Reflect on your prayer about ${prayContext.topic ?? 'what you shared'}. How did it feel to bring that before God? What comes up as you sit with it?`
        : allPrompts[promptIndex]?.text ?? ''

  const showPromptRefresh = !(
    (prayContext?.from === 'pray' && !contextDismissed) ||
    (prayContext?.from === 'devotional' && prayContext.customPrompt && !contextDismissed)
  )

  const handleEntrySave = (entry: { content: string; mode: JournalMode; promptText?: string }) => {
    // Persist to journal store
    let storeEntry: { id: string; createdAt: number }
    try {
      storeEntry = createJournalEntry(
        entry.content,
        journalVerseContext ?? undefined,
      )
    } catch (e) {
      if (e instanceof JournalStorageFullError) {
        showToast('Storage full — clear some journal entries to free space.')
      }
      storeEntry = { id: `entry-${Date.now()}`, createdAt: Date.now() }
    }

    const savedEntry: SavedJournalEntry = {
      id: storeEntry.id,
      content: entry.content,
      timestamp: new Date(storeEntry.createdAt).toISOString(),
      mode: entry.mode,
      promptText: entry.promptText,
      ...(journalVerseContext && { verseContext: journalVerseContext }),
    }
    setSavedEntries((prev) => [savedEntry, ...prev])
    markJournalComplete()
    recordActivity('journal', 'journal')
    showToast('Your words are safe. Well done today.')

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
    const entry = savedEntries.find((e) => e.id === entryId)
    if (!entry) return

    setReflectingIds((prev) => {
      const next = new Set(prev)
      next.add(entryId)
      return next
    })

    // fetchJournalReflection never rejects — it always resolves with a
    // JournalReflection, falling through to the mock on any error. No .catch needed.
    fetchJournalReflection(entry.content).then((reflection) => {
      setSavedEntries((prev) =>
        prev.map((e) =>
          e.id === entryId ? { ...e, reflection: reflection.text } : e,
        ),
      )
      setReflectingIds((prev) => {
        const next = new Set(prev)
        next.delete(entryId)
        return next
      })
    })
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
    <div>
      <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
        {draftConflictPending && prayContext?.from === 'devotional' && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="draft-conflict-title"
            className="mb-6 rounded-2xl border border-white/[0.12] bg-white/[0.06] p-6 backdrop-blur-sm shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)]"
          >
            <h3 id="draft-conflict-title" className="mb-2 text-lg font-semibold text-white">
              You have an unsaved draft
            </h3>
            <p className="mb-4 text-sm text-white/80">
              Would you like to start fresh with today&apos;s devotional prompt, or keep working on your current draft?
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleStartFresh}
                className="min-h-[44px] rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Start fresh
              </button>
              <button
                type="button"
                onClick={handleKeepDraft}
                className="min-h-[44px] rounded-lg border border-white/[0.12] bg-transparent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                autoFocus
              >
                Keep my current draft
              </button>
            </div>
          </div>
        )}

        {/* Verse Prompt Card (from Bible bridge) */}
        {isHydrating && <VersePromptSkeleton />}
        {verseContext && (
          <VersePromptCard
            context={verseContext}
            onRemove={clearVerseContext}
            framingLine={VERSE_FRAMINGS.journal}
          />
        )}

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
          draftClearSignal={draftClearSignal}
        />

        {/* Saved Entries */}
        {savedEntries.length > 0 && (
          <SavedEntriesList
            entries={savedEntries}
            onWriteAnother={handleWriteAnother}
            onReflect={handleReflect}
            onSwitchTab={onSwitchTab}
            reflectingIds={reflectingIds}
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
    </div>
  )
}
