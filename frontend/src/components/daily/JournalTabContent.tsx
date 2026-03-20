import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowUpDown, BookOpen, Mic, MicOff, RefreshCw, Search, X } from 'lucide-react'
import { BackgroundSquiggle, SQUIGGLE_MASK_STYLE } from '@/components/BackgroundSquiggle'
import { useToast } from '@/components/ui/Toast'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import { CrisisBanner } from '@/components/daily/CrisisBanner'
import { useAuth } from '@/hooks/useAuth'
import { useVoiceInput } from '@/hooks/useVoiceInput'
import { useAnnounce } from '@/hooks/useAnnounce'
import { useCompletionTracking } from '@/hooks/useCompletionTracking'
import { useFaithPoints } from '@/hooks/useFaithPoints'
import {
  JOURNAL_DRAFT_KEY,
  JOURNAL_MILESTONES_KEY,
  JOURNAL_MODE_KEY,
} from '@/constants/daily-experience'
import {
  getJournalPrompts,
  getJournalReflection,
} from '@/mocks/daily-experience-mock-data'
import { cn } from '@/lib/utils'
import { AmbientSoundPill } from '@/components/daily/AmbientSoundPill'
import type { JournalMode, SavedJournalEntry, PrayContext } from '@/types/daily-experience'

function formatDateTime(date: Date) {
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' })
  const month = date.toLocaleDateString('en-US', { month: 'long' })
  const day = date.getDate()
  const year = date.getFullYear()
  const time = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
  return `${dayName}, ${month} ${day}, ${year} \u2014 ${time}`
}

const JOURNAL_MILESTONES: Record<number, string> = {
  10: '10 entries! Your journal is becoming a treasure.',
  25: '25 entries! You\'re building a beautiful record of growth.',
  50: '50 entries! Half a hundred conversations with God.',
  100: '100 entries! What an incredible journey of reflection.',
}

interface JournalTabContentProps {
  prayContext?: PrayContext | null
  onSwitchTab?: (tab: 'pray' | 'journal' | 'meditate') => void
}

export function JournalTabContent({ prayContext = null, onSwitchTab }: JournalTabContentProps) {
  const { showToast, showCelebrationToast } = useToast()
  const authModal = useAuthModal()
  const { isAuthenticated } = useAuth()
  const { markJournalComplete } = useCompletionTracking()
  const { recordActivity } = useFaithPoints()
  const location = useLocation()
  const navigate = useNavigate()
  const prayWallContext = (location.state as { prayWallContext?: string } | null)?.prayWallContext

  // Mode toggle
  const [mode, setMode] = useState<JournalMode>(() => {
    const saved = localStorage.getItem(JOURNAL_MODE_KEY)
    return saved === 'free' ? 'free' : 'guided'
  })

  // Text — Draft auto-save uses localStorage
  const [text, setText] = useState(() => {
    return localStorage.getItem(JOURNAL_DRAFT_KEY) ?? ''
  })

  // Voice input
  const { announce, AnnouncerRegion } = useAnnounce()

  const {
    isSupported: isVoiceSupported,
    isListening,
    isPermissionDenied,
    startListening,
    stopListening,
  } = useVoiceInput({
    onTranscript: (transcript) => {
      setText((prev) => {
        const separator = prev && !prev.endsWith(' ') ? ' ' : ''
        return prev + separator + transcript
      })
    },
    maxLength: 5000 - text.length,
    onMaxLengthReached: () => {
      showToast('Character limit reached.', 'warning')
    },
  })

  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening()
      showToast('Voice captured.', 'success')
      announce('Recording stopped')
    } else {
      startListening()
      showToast('Listening... speak your heart.', 'success')
      announce('Recording started')
    }
  }

  // Permission denied toast — fire once
  const prevPermissionDenied = useRef(false)
  useEffect(() => {
    if (isPermissionDenied && !prevPermissionDenied.current) {
      showToast('Microphone access is needed for voice input. Check your browser settings.', 'error')
      prevPermissionDenied.current = true
    }
  }, [isPermissionDenied, showToast])

  // Prompt
  const allPrompts = useMemo(() => getJournalPrompts(), [])
  const [promptIndex, setPromptIndex] = useState(() =>
    Math.floor(Math.random() * allPrompts.length),
  )

  // Context banner
  const [contextDismissed, setContextDismissed] = useState(false)

  // Draft save indicator
  const [draftSaved, setDraftSaved] = useState(false)
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Saved entries
  const [savedEntries, setSavedEntries] = useState<SavedJournalEntry[]>([])
  const [isDoneJournaling, setIsDoneJournaling] = useState(false)

  // Search & filter state (ephemeral — not persisted)
  const [searchText, setSearchText] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [modeFilter, setModeFilter] = useState<'all' | JournalMode>('all')
  const [sortDirection, setSortDirection] = useState<'newest' | 'oldest'>('newest')

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchText)
    }, 300)
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [searchText])

  const filteredEntries = useMemo(() => {
    let entries = savedEntries

    if (debouncedSearch.trim()) {
      const query = debouncedSearch.toLowerCase()
      entries = entries.filter(
        (e) =>
          e.content.toLowerCase().includes(query) ||
          (e.promptText && e.promptText.toLowerCase().includes(query)),
      )
    }

    if (modeFilter !== 'all') {
      entries = entries.filter((e) => e.mode === modeFilter)
    }

    if (sortDirection === 'oldest') {
      entries = [...entries].reverse()
    }

    return entries
  }, [savedEntries, debouncedSearch, modeFilter, sortDirection])

  const clearFilters = () => {
    setSearchText('')
    setDebouncedSearch('')
    setModeFilter('all')
    setSortDirection('newest')
  }

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const autoExpand = useCallback((el: HTMLTextAreaElement) => {
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [])

  // Debounced draft save
  useEffect(() => {
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
    draftTimerRef.current = setTimeout(() => {
      if (text.trim()) {
        localStorage.setItem(JOURNAL_DRAFT_KEY, text)
        setDraftSaved(true)
        setTimeout(() => setDraftSaved(false), 2000)
      }
    }, 1000)
    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
    }
  }, [text])

  // Switch to Guided mode when prayContext arrives (tab is always mounted)
  useEffect(() => {
    if (prayContext?.from === 'pray') {
      setMode('guided')
      setContextDismissed(false)
    }
  }, [prayContext])

  // Prayer Wall context: switch to guided mode with contextual prompt
  // Guard: only consume prayWallContext when this tab is active — all tabs are
  // always mounted, so without the guard PrayTabContent's effect clears
  // location.state before this effect can read it.
  const activeTab = new URLSearchParams(location.search).get('tab') || 'pray'
  const [prayWallPrompt, setPrayWallPrompt] = useState<string | null>(null)
  useEffect(() => {
    if (prayWallContext && activeTab === 'journal') {
      setMode('guided')
      setPrayWallPrompt(
        `Reflect on this prayer request: "${prayWallContext}". What feelings does it stir in you?`,
      )
      setContextDismissed(false)
      // Clear location state so back-navigation doesn't re-trigger
      navigate(location.pathname + location.search, { replace: true, state: null })
    }
  }, [prayWallContext, activeTab, navigate, location.pathname, location.search])

  const handleModeChange = useCallback((newMode: JournalMode) => {
    setMode(newMode)
    localStorage.setItem(JOURNAL_MODE_KEY, newMode)
  }, [])

  const handleTryDifferentPrompt = () => {
    if (allPrompts.length <= 1) return
    let next = Math.floor(Math.random() * allPrompts.length)
    while (next === promptIndex) {
      next = Math.floor(Math.random() * allPrompts.length)
    }
    setPromptIndex(next)
  }

  const currentPrompt = prayWallPrompt && !contextDismissed
    ? prayWallPrompt
    : prayContext?.from === 'pray' && !contextDismissed
      ? `Reflect on your prayer about ${prayContext.topic ?? 'what you shared'}. How did it feel to bring that before God? What comes up as you sit with it?`
      : allPrompts[promptIndex]?.text ?? ''

  const handleSave = () => {
    if (!text.trim()) return
    if (!isAuthenticated) {
      authModal?.openAuthModal('Sign in to save your journal entries')
      return
    }
    const entry: SavedJournalEntry = {
      id: `entry-${Date.now()}`,
      content: text,
      timestamp: new Date().toISOString(),
      mode,
      promptText: mode === 'guided' ? currentPrompt : undefined,
    }
    setSavedEntries((prev) => [entry, ...prev])
    setText('')
    localStorage.removeItem(JOURNAL_DRAFT_KEY)
    markJournalComplete()
    recordActivity('journal')
    showToast('Entry saved')

    // Milestone celebration check
    // savedEntries still reflects the pre-update array (state update is batched),
    // so savedEntries.length + 1 gives us the correct post-save total.
    const newCount = savedEntries.length + 1
    const milestoneMessage = JOURNAL_MILESTONES[newCount]
    if (milestoneMessage) {
      let celebrated: number[] = []
      try {
        celebrated = JSON.parse(localStorage.getItem(JOURNAL_MILESTONES_KEY) ?? '[]')
      } catch {
        celebrated = []
      }
      if (!celebrated.includes(newCount)) {
        celebrated.push(newCount)
        localStorage.setItem(JOURNAL_MILESTONES_KEY, JSON.stringify(celebrated))
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
    setText('')
    localStorage.removeItem(JOURNAL_DRAFT_KEY)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.focus()
    }
  }

  const hasSavedEntries = savedEntries.length > 0

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
      <AnnouncerRegion />

      {/* Squiggle background wrapper */}
      <div className="relative">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={SQUIGGLE_MASK_STYLE}
        >
          <BackgroundSquiggle />
        </div>
        <div className="relative">

          {/* Heading */}
          <h2 className="mb-4 text-center font-sans text-2xl font-bold text-text-dark sm:text-3xl lg:text-4xl">
            What&apos;s On Your{' '}
            <span className="font-script text-3xl text-primary sm:text-4xl lg:text-5xl">Mind?</span>
          </h2>

          <AmbientSoundPill context="journal" />

          {/* Mode Toggle */}
          <div className="mb-6 flex justify-center">
            <div className="inline-flex rounded-lg border border-gray-200" role="group" aria-label="Journal mode">
              <button
                type="button"
                onClick={() => handleModeChange('guided')}
                className={cn(
                  'rounded-l-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                  mode === 'guided'
                    ? 'bg-primary text-white'
                    : 'bg-white text-text-dark hover:bg-gray-50',
                )}
                aria-pressed={mode === 'guided'}
              >
                Guided
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('free')}
                className={cn(
                  'rounded-r-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                  mode === 'free'
                    ? 'bg-primary text-white'
                    : 'bg-white text-text-dark hover:bg-gray-50',
                )}
                aria-pressed={mode === 'free'}
              >
                Free Write
              </button>
            </div>
          </div>

          {/* Context Banner (Guided mode) */}
          <div aria-live="polite">
            {mode === 'guided' && prayContext?.from === 'pray' && !contextDismissed && (
              <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 p-3" role="status">
                <p className="text-sm text-text-dark">
                  Continuing from your prayer about{' '}
                  <span className="font-medium">{prayContext.topic ?? 'what you shared'}</span>
                </p>
                <button
                  type="button"
                  onClick={() => setContextDismissed(true)}
                  className="mt-1 text-xs text-primary underline hover:text-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  Write about something else
                </button>
              </div>
            )}
          </div>

          {/* Guided Mode Prompt Card */}
          {mode === 'guided' && (
            <div className="mb-4">
              <div className="rounded-lg border-l-4 border-primary bg-white p-6 shadow-sm">
                <p className="font-serif text-lg italic leading-relaxed text-text-dark sm:text-xl">
                  {currentPrompt}
                </p>
              </div>
              {!(prayContext?.from === 'pray' && !contextDismissed) && (
                <div className="mt-2 text-center">
                  <button
                    type="button"
                    onClick={handleTryDifferentPrompt}
                    className="inline-flex items-center gap-1.5 text-sm text-text-light transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    aria-label="New prompt"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Try a different prompt
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Free Write Context Note */}
          {mode === 'free' && prayContext?.from === 'pray' && !contextDismissed && (
            <p className="mb-4 text-sm text-text-light">
              Continuing from your prayer about {prayContext.topic ?? 'what you shared'}.{' '}
              <button
                type="button"
                onClick={() => setContextDismissed(true)}
                className="text-primary underline hover:text-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Dismiss
              </button>
            </p>
          )}

          {/* Textarea */}
          <div className="relative mb-2">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                autoExpand(e.target)
              }}
              onInput={(e) => autoExpand(e.target as HTMLTextAreaElement)}
              placeholder={mode === 'guided' ? 'Start writing your reflection...' : 'What\'s on your heart today?'}
              maxLength={5000}
              rows={6}
              className="min-h-[200px] w-full resize-none rounded-lg border border-gray-200 bg-white px-4 pb-10 pt-3 font-serif text-lg leading-relaxed text-text-dark placeholder:text-text-light/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
              aria-label="Journal entry"
              aria-describedby="journal-char-count"
            />
            <span
              id="journal-char-count"
              className="absolute bottom-2 left-3 text-xs text-text-light/60"
              aria-live={text.length >= 4500 ? 'polite' : 'off'}
              role="status"
            >
              {text.length.toLocaleString()}/5,000
            </span>
            {isAuthenticated && isVoiceSupported && (
              <button
                type="button"
                onClick={handleVoiceToggle}
                disabled={isPermissionDenied}
                className={cn(
                  'absolute bottom-2 right-2 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                  isPermissionDenied
                    ? 'cursor-not-allowed opacity-40'
                    : isListening
                      ? 'bg-red-500/20 text-red-400 motion-safe:animate-mic-pulse'
                      : 'bg-black/5 text-black/30 hover:bg-black/10 hover:text-black/50',
                )}
                aria-label={
                  isPermissionDenied
                    ? 'Voice input unavailable — microphone access denied'
                    : isListening
                      ? 'Stop voice input'
                      : 'Start voice input'
                }
              >
                {isListening ? (
                  <>
                    <MicOff className="h-5 w-5" />
                    <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-red-500" />
                  </>
                ) : (
                  <Mic className="h-5 w-5" />
                )}
              </button>
            )}
          </div>

          {/* Draft Saved Indicator */}
          <div className="mb-4 h-4" aria-live="polite">
            {draftSaved && (
              <p className="animate-fade-in text-xs text-text-light">
                Draft saved
              </p>
            )}
          </div>

          {/* Crisis Banner */}
          <CrisisBanner text={text} />

          {/* Save Button */}
          <div className="mb-8 text-center">
            <button
              type="button"
              onClick={handleSave}
              disabled={!text.trim()}
              className="rounded-lg bg-primary px-8 py-3 font-semibold text-white transition-colors hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Save Entry
            </button>
          </div>

        </div>
      </div>

      {/* Saved Entries */}
      {hasSavedEntries && (
        <section aria-labelledby="saved-entries-heading" className="space-y-6">
          <h3 id="saved-entries-heading" className="sr-only">
            Saved Entries
          </h3>

          {/* Write Another + Done Journaling */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleWriteAnother}
              className="text-sm font-medium text-primary transition-colors hover:text-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Write another
            </button>
            {!isDoneJournaling && (
              <button
                type="button"
                onClick={() => setIsDoneJournaling(true)}
                className="text-sm text-text-light underline transition-colors hover:text-text-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Done journaling
              </button>
            )}
          </div>

          {/* Done Journaling CTAs */}
          {isDoneJournaling && (
            <div className="animate-fade-in rounded-lg bg-primary/5 p-4">
              <p className="mb-3 text-sm font-medium text-text-dark">
                Beautiful time of reflection. Where to next?
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                <button
                  type="button"
                  onClick={() => onSwitchTab?.('meditate')}
                  className="rounded-lg bg-primary px-4 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  Continue to Meditate &rarr;
                </button>
                <Link
                  to="/prayer-wall"
                  className="text-sm text-primary transition-colors hover:text-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  Visit the Prayer Wall
                </Link>
              </div>
            </div>
          )}

          {/* Search & Filter Bar */}
          {savedEntries.length >= 2 && (
            <div className="rounded-xl border border-gray-200 bg-white/80 p-3 backdrop-blur-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                {/* Search input */}
                <div className="relative flex-1 sm:max-w-none lg:max-w-sm">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-light" aria-hidden="true" />
                  <input
                    type="text"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="Search your entries..."
                    aria-label="Search your entries"
                    className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-8 text-sm text-text-dark placeholder:text-text-light/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2"
                  />
                  {searchText && (
                    <button
                      type="button"
                      onClick={() => { setSearchText(''); setDebouncedSearch('') }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-text-light hover:text-text-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Mode pills + Sort toggle row */}
                <div className="flex items-center justify-between gap-3 sm:justify-start sm:gap-4">
                  {/* Mode filter pills */}
                  <div role="group" aria-label="Filter by journal mode" className="flex gap-1.5">
                    {(['all', 'guided', 'free'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setModeFilter(m)}
                        aria-pressed={modeFilter === m}
                        className={cn(
                          'min-h-[44px] rounded-full px-3 py-1 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                          modeFilter === m
                            ? 'bg-primary/20 text-primary'
                            : 'bg-gray-100 text-text-dark hover:bg-gray-200',
                        )}
                      >
                        {m === 'all' ? 'All' : m === 'guided' ? 'Guided' : 'Free Write'}
                      </button>
                    ))}
                  </div>

                  {/* Sort toggle */}
                  <button
                    type="button"
                    onClick={() => setSortDirection((d) => d === 'newest' ? 'oldest' : 'newest')}
                    aria-label={`Sort order: ${sortDirection === 'newest' ? 'newest first' : 'oldest first'}. Click to change.`}
                    className="inline-flex min-h-[44px] items-center gap-1 text-sm text-text-light hover:text-text-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    <ArrowUpDown className="h-3.5 w-3.5" />
                    {sortDirection === 'newest' ? 'Newest first' : 'Oldest first'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Empty filter state */}
          {filteredEntries.length === 0 && savedEntries.length >= 2 && (
            <div className="rounded-xl border border-gray-200 bg-white/80 p-6 text-center backdrop-blur-sm" role="status">
              <p className="text-sm text-text-light">No entries match your search</p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-2 text-sm text-primary underline hover:text-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Clear filters
              </button>
            </div>
          )}

          {/* Entry Cards */}
          {filteredEntries.map((entry) => (
            <article
              key={entry.id}
              className="rounded-lg border border-gray-200 bg-white p-4"
              aria-label={`Journal entry from ${formatDateTime(new Date(entry.timestamp))}`}
            >
              <p className="mb-2 text-xs text-text-light">
                {formatDateTime(new Date(entry.timestamp))}
                {entry.mode === 'guided' && (
                  <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-primary">
                    <span className="sr-only">Mode: </span>Guided
                  </span>
                )}
              </p>
              {entry.promptText && (
                <p className="mb-2 text-xs italic text-text-light">
                  Prompt: {entry.promptText}
                </p>
              )}
              <p className="whitespace-pre-wrap font-serif text-base leading-relaxed text-text-dark">
                {entry.content}
              </p>

              {entry.reflection ? (
                <div className="mt-3 rounded-lg bg-primary/5 p-3">
                  <p className="mb-1 text-xs font-medium text-primary">
                    Reflection
                  </p>
                  <p className="text-sm leading-relaxed text-text-dark">
                    {entry.reflection}
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleReflect(entry.id)}
                  className="mt-3 text-sm text-primary underline transition-colors hover:text-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  aria-label={`Reflect on entry from ${formatDateTime(new Date(entry.timestamp))}`}
                >
                  Reflect on my entry
                </button>
              )}
            </article>
          ))}
        </section>
      )}
    </div>
  )
}
