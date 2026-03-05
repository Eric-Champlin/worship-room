import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { PageHero } from '@/components/PageHero'
import { SiteFooter } from '@/components/SiteFooter'
import { SongPickSection } from '@/components/SongPickSection'
import { JourneySection } from '@/components/JourneySection'
import { BackgroundSquiggle, SQUIGGLE_MASK_STYLE } from '@/components/BackgroundSquiggle'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import {
  AuthModalProvider,
  useAuthModal,
} from '@/components/prayer-wall/AuthModalProvider'
import { CrisisBanner } from '@/components/daily/CrisisBanner'
import { useAuth } from '@/hooks/useAuth'
import { useCompletionTracking } from '@/hooks/useCompletionTracking'
import {
  JOURNAL_DRAFT_KEY,
  JOURNAL_MODE_KEY,
} from '@/constants/daily-experience'
import {
  getJournalPrompts,
  getJournalReflection,
} from '@/mocks/daily-experience-mock-data'
import { cn } from '@/lib/utils'
import type { JournalMode, SavedJournalEntry, PrayContext } from '@/types/daily-experience'

// C6: Pure utility — no closure deps, lives at module scope
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

function JournalContent() {
  const location = useLocation()
  const { showToast } = useToast()
  const authModal = useAuthModal()
  const { isLoggedIn } = useAuth()
  const { markJournalComplete } = useCompletionTracking()

  const prayContext = (location.state as PrayContext | null) ?? null

  // Mode toggle
  const [mode, setMode] = useState<JournalMode>(() => {
    if (prayContext?.from === 'pray') return 'guided'
    const saved = localStorage.getItem(JOURNAL_MODE_KEY)
    return saved === 'free' ? 'free' : 'guided'
  })

  // Text — Draft auto-save uses localStorage for all users as an approved UX
  // exception to the Demo Mode "session-only" policy. Losing in-progress
  // writing on accidental refresh is worse than the minor privacy trade-off.
  const [text, setText] = useState(() => {
    return localStorage.getItem(JOURNAL_DRAFT_KEY) ?? ''
  })

  // Prompt — C3: memoize static list
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

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-expand textarea
  const autoExpand = useCallback((el: HTMLTextAreaElement) => {
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [])

  // Debounced draft save — uses localStorage so drafts persist across
  // browser sessions. Users won't lose their in-progress writing.
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

  // Save mode preference — C5b: memoized
  const handleModeChange = useCallback((newMode: JournalMode) => {
    setMode(newMode)
    localStorage.setItem(JOURNAL_MODE_KEY, newMode)
  }, [])

  // Shuffle prompt — C5: early return for edge cases
  const handleTryDifferentPrompt = () => {
    if (allPrompts.length <= 1) return
    let next = Math.floor(Math.random() * allPrompts.length)
    while (next === promptIndex) {
      next = Math.floor(Math.random() * allPrompts.length)
    }
    setPromptIndex(next)
  }

  // Get current prompt
  const currentPrompt = prayContext?.from === 'pray' && !contextDismissed
    ? `Reflect on your prayer about ${prayContext.topic ?? 'what you shared'}. How did it feel to bring that before God? What comes up as you sit with it?`
    : allPrompts[promptIndex]?.text ?? ''

  // Save entry
  const handleSave = () => {
    if (!text.trim()) return
    if (!isLoggedIn) {
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
    showToast('Entry saved')
  }

  // Reflect on entry
  const handleReflect = (entryId: string) => {
    if (!isLoggedIn) {
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

  // Write another
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
    <div className="flex min-h-screen flex-col bg-neutral-bg font-sans">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:text-primary focus:shadow-lg"
      >
        Skip to content
      </a>
      <Navbar transparent />
      <PageHero title="Journal" subtitle="Put your thoughts into words." />

      <main id="main-content" className="flex-1">
        <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">

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
              <h2 className="mb-6 text-center font-sans text-2xl font-bold text-text-dark sm:text-3xl lg:text-4xl">
                What&apos;s On Your{' '}
                <span className="font-script text-3xl text-primary sm:text-4xl lg:text-5xl">Mind?</span>
              </h2>

              {/* Mode Toggle */}
              <div className="mb-6 flex justify-center">
                <div className="inline-flex rounded-lg border border-gray-200" role="group" aria-label="Journal mode">
                  <button
                    type="button"
                    onClick={() => handleModeChange('guided')}
                    className={cn(
                      'rounded-l-lg px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
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
                      'rounded-r-lg px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
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

              {/* Context Banner (Guided mode) — A6: wrapped in aria-live */}
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
                      className="mt-1 text-xs text-primary underline hover:text-primary-light focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    >
                      Write about something else
                    </button>
                  </div>
                )}
              </div>

              {/* Guided Mode Prompt Card */}
              {mode === 'guided' && (
                <div className="relative mb-4 rounded-lg border-l-4 border-primary bg-white p-6 shadow-sm">
                  <p className="font-serif text-[22px] italic leading-relaxed text-text-dark sm:text-2xl">
                    {currentPrompt}
                  </p>
                  {!(prayContext?.from === 'pray' && !contextDismissed) && (
                    <button
                      type="button"
                      onClick={handleTryDifferentPrompt}
                      className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full text-text-light transition-colors hover:bg-gray-100 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                      aria-label="New prompt"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
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
                    className="text-primary underline hover:text-primary-light focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  >
                    Dismiss
                  </button>
                </p>
              )}

              {/* Textarea — A1: visible focus ring */}
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
                  className="min-h-[200px] w-full resize-none rounded-lg border border-gray-200 bg-white px-4 py-3 font-serif text-lg leading-relaxed text-text-dark placeholder:text-text-light/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  aria-label="Journal entry"
                  aria-describedby="journal-char-count"
                />
                {/* A5: aria-live announces character count near limit */}
                <span
                  id="journal-char-count"
                  className="absolute bottom-2 right-3 text-xs text-text-light/60"
                  aria-live={text.length >= 4500 ? 'polite' : 'off'}
                  role="status"
                >
                  {text.length.toLocaleString()}/5,000
                </span>
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

              {/* Save Button — A3: focus ring */}
              <div className="mb-8 text-center">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!text.trim()}
                  className="rounded-lg bg-primary px-8 py-3 font-semibold text-white transition-colors hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                >
                  Save Entry
                </button>
              </div>

            </div>
          </div>

          {/* Saved Entries — A4: semantic section with heading */}
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
                  className="text-sm font-medium text-primary transition-colors hover:text-primary-light focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                >
                  Write another
                </button>
                {!isDoneJournaling && (
                  <button
                    type="button"
                    onClick={() => setIsDoneJournaling(true)}
                    className="text-sm text-text-light underline transition-colors hover:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
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
                    <Link
                      to="/daily"
                      className="rounded-lg bg-primary px-4 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    >
                      Return to Daily &rarr;
                    </Link>
                    <Link
                      to="/meditate"
                      className="text-sm text-primary transition-colors hover:text-primary-light focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    >
                      Continue to Meditate
                    </Link>
                    <Link
                      to="/prayer-wall"
                      className="text-sm text-primary transition-colors hover:text-primary-light focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    >
                      Visit the Prayer Wall
                    </Link>
                  </div>
                </div>
              )}

              {/* Entry Cards — A4: article elements */}
              {savedEntries.map((entry) => (
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

                  {/* Reflection */}
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
                      className="mt-3 text-sm text-primary underline transition-colors hover:text-primary-light focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
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

        {/* Full-width sections */}
        <SongPickSection />
        <JourneySection />
      </main>

      <SiteFooter />
    </div>
  )
}

export function Journal() {
  return (
    <ToastProvider>
      <AuthModalProvider>
        <JournalContent />
      </AuthModalProvider>
    </ToastProvider>
  )
}
