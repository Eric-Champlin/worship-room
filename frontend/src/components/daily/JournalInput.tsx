import { useState, useRef, useCallback, useEffect } from 'react'
import { Mic, MicOff, RefreshCw } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import { useAuth } from '@/hooks/useAuth'
import { CrisisBanner } from '@/components/daily/CrisisBanner'
import { CharacterCount } from '@/components/ui/CharacterCount'
import { UnsavedChangesModal } from '@/components/ui/UnsavedChangesModal'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import { useVoiceInput } from '@/hooks/useVoiceInput'
import { useAnnounce } from '@/hooks/useAnnounce'
import { AmbientSoundPill } from '@/components/daily/AmbientSoundPill'
import { JOURNAL_DRAFT_KEY } from '@/constants/daily-experience'
import { cn } from '@/lib/utils'
import type { JournalMode, PrayContext } from '@/types/daily-experience'

export interface JournalInputProps {
  mode: JournalMode
  onModeChange: (mode: JournalMode) => void
  currentPrompt: string
  onTryDifferentPrompt: () => void
  showPromptRefresh: boolean
  prayContext?: PrayContext | null
  contextDismissed: boolean
  onDismissContext: () => void
  onSave: (entry: { content: string; mode: JournalMode; promptText?: string }) => void
  onTextareaRef?: (ref: HTMLTextAreaElement | null) => void
}

export function JournalInput({
  mode,
  onModeChange,
  currentPrompt,
  onTryDifferentPrompt,
  showPromptRefresh,
  prayContext,
  contextDismissed,
  onDismissContext,
  onSave,
  onTextareaRef,
}: JournalInputProps) {
  const { showToast } = useToast()
  const authModal = useAuthModal()
  const { isAuthenticated } = useAuth()
  const { announce, AnnouncerRegion } = useAnnounce()

  const [text, setText] = useState(() => {
    return localStorage.getItem(JOURNAL_DRAFT_KEY) ?? ''
  })
  const lastSavedTextRef = useRef(text)
  const { showModal, confirmLeave, cancelLeave } = useUnsavedChanges(text !== lastSavedTextRef.current)

  const [draftSaved, setDraftSaved] = useState(false)
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const textareaCallbackRef = useCallback((el: HTMLTextAreaElement | null) => {
    (textareaRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el
    onTextareaRef?.(el)
  }, [onTextareaRef])

  // Voice input
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

  const handleSave = () => {
    if (!text.trim()) return
    if (!isAuthenticated) {
      authModal?.openAuthModal('Sign in to save your journal entries')
      return
    }
    onSave({
      content: text,
      mode,
      promptText: mode === 'guided' ? currentPrompt : undefined,
    })
    setText('')
    lastSavedTextRef.current = ''
    localStorage.removeItem(JOURNAL_DRAFT_KEY)
  }

  return (
    <>
      <AnnouncerRegion />

      {/* Heading */}
      <h2 className="mb-4 text-center font-sans text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
        What&apos;s On Your{' '}
        <span className="font-script text-3xl text-primary sm:text-4xl lg:text-5xl">Mind?</span>
      </h2>

      <AmbientSoundPill context="journal" variant="dark" />

      {/* Mode Toggle */}
      <div className="mb-6 flex justify-center">
        <div className="inline-flex rounded-lg border border-white/10" role="group" aria-label="Journal mode">
          <button
            type="button"
            onClick={() => onModeChange('guided')}
            className={cn(
              'rounded-l-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
              mode === 'guided'
                ? 'bg-primary/20 text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/15',
            )}
            aria-pressed={mode === 'guided'}
          >
            Guided
          </button>
          <button
            type="button"
            onClick={() => onModeChange('free')}
            className={cn(
              'rounded-r-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
              mode === 'free'
                ? 'bg-primary/20 text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/15',
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
            <p className="text-sm text-white/80">
              Continuing from your prayer about{' '}
              <span className="font-medium">{prayContext.topic ?? 'what you shared'}</span>
            </p>
            <button
              type="button"
              onClick={onDismissContext}
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
          <div className="rounded-lg border-l-2 border-primary bg-white/[0.06] p-6">
            <p className="font-serif text-lg italic leading-relaxed text-white/80 sm:text-xl">
              {currentPrompt}
            </p>
          </div>
          {showPromptRefresh && (
            <div className="mt-2 text-center">
              <button
                type="button"
                onClick={onTryDifferentPrompt}
                className="inline-flex items-center gap-1.5 text-sm text-white/50 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
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
        <p className="mb-4 text-sm text-white/50">
          Continuing from your prayer about {prayContext.topic ?? 'what you shared'}.{' '}
          <button
            type="button"
            onClick={onDismissContext}
            className="text-primary underline hover:text-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Dismiss
          </button>
        </p>
      )}

      {/* Textarea */}
      <div className="relative mb-2">
        <textarea
          ref={textareaCallbackRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            autoExpand(e.target)
          }}
          onInput={(e) => autoExpand(e.target as HTMLTextAreaElement)}
          placeholder={mode === 'guided' ? 'Start writing your reflection...' : 'What\'s on your heart today?'}
          maxLength={5000}
          rows={6}
          className="min-h-[200px] w-full resize-none rounded-lg border border-glow-cyan/30 bg-white/[0.06] px-4 pb-10 pt-3 font-serif text-lg leading-relaxed text-white placeholder:text-white/40 motion-safe:animate-glow-pulse focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
          aria-label="Journal entry"
          aria-describedby="journal-char-count"
        />
        <CharacterCount
          current={text.length}
          max={5000}
          warningAt={4000}
          dangerAt={4800}
          id="journal-char-count"
          className="absolute bottom-2 left-3"
        />
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
                  : 'bg-white/10 text-white/30 hover:bg-white/15 hover:text-white/50',
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
          <p className="motion-safe:animate-fade-in text-xs text-white/50">
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

      <UnsavedChangesModal isOpen={showModal} onLeave={confirmLeave} onStay={cancelLeave} />
    </>
  )
}
