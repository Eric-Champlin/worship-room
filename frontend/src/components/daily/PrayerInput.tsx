import { useState, useRef, useEffect } from 'react'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { CrisisBanner } from '@/components/daily/CrisisBanner'
import { CharacterCount } from '@/components/ui/CharacterCount'
import { Button } from '@/components/ui/Button'
import {
  DEFAULT_PRAYER_CHIPS,
  PRAYER_DRAFT_KEY,
  PRAYER_MAX_LENGTH,
  PRAYER_WARNING_THRESHOLD,
  PRAYER_DANGER_THRESHOLD,
} from '@/constants/daily-experience'

export interface PrayerInputProps {
  onSubmit: (text: string) => void
  isLoading: boolean
  initialText?: string
  retryPrompt?: string | null
  onRetryPromptClear?: () => void
}

export function PrayerInput({
  onSubmit,
  isLoading,
  initialText,
  retryPrompt,
  onRetryPromptClear,
}: PrayerInputProps) {
  const [text, setText] = useState(() => {
    try {
      return localStorage.getItem(PRAYER_DRAFT_KEY) ?? ''
    } catch {
      return ''
    }
  })
  const [selectedChip, setSelectedChip] = useState<string | null>(null)
  const [nudge, setNudge] = useState(false)
  const [draftSaved, setDraftSaved] = useState(false)
  const draftFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Sync from parent's initialText (pre-fill from Prayer Wall, challenge, cross-feature CTA)
  useEffect(() => {
    if (initialText !== undefined && initialText !== '') {
      setText(initialText)
      setSelectedChip(null)
      setNudge(false)
    }
  }, [initialText])

  // Focus textarea when retryPrompt appears
  useEffect(() => {
    if (retryPrompt) {
      setTimeout(() => {
        textareaRef.current?.focus()
        textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
    }
  }, [retryPrompt])

  // Debounced draft save to localStorage
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
    draftTimerRef.current = setTimeout(() => {
      try {
        if (text.trim()) {
          localStorage.setItem(PRAYER_DRAFT_KEY, text)
          setDraftSaved(true)
          draftFeedbackTimerRef.current = setTimeout(() => setDraftSaved(false), 2000)
        } else {
          localStorage.removeItem(PRAYER_DRAFT_KEY)
        }
      } catch {
        // localStorage failure is non-critical
      }
    }, 1000)
    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
      if (draftFeedbackTimerRef.current) clearTimeout(draftFeedbackTimerRef.current)
    }
  }, [text])

  const handleChipClick = (chip: string) => {
    setSelectedChip(chip)
    setText(chip)
    setNudge(false)
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
        textareaRef.current.selectionStart = chip.length
        textareaRef.current.selectionEnd = chip.length
      }
    }, 0)
  }

  const handleSubmit = () => {
    if (!text.trim()) {
      setNudge(true)
      return
    }
    onSubmit(text)
  }

  const showChips = !selectedChip && !text

  return (
    <>
      {retryPrompt && (
        <p className="mb-2 text-center text-sm text-white/50">
          {retryPrompt}
        </p>
      )}

      {showChips && (
        <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
          {DEFAULT_PRAYER_CHIPS.map((chip) => (
            <Button
              key={chip}
              variant="subtle"
              size="sm"
              type="button"
              onClick={() => handleChipClick(chip)}
            >
              {chip}
            </Button>
          ))}
        </div>
      )}

      <div className="mb-2">
        <textarea
          id="pray-textarea"
          ref={textareaRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setNudge(false)
            if (retryPrompt) onRetryPromptClear?.()
          }}
          placeholder="Start typing here..."
          maxLength={PRAYER_MAX_LENGTH}
          rows={8}
          className="w-full resize-y min-h-[200px] max-h-[500px] rounded-lg border border-violet-400/30 bg-white/[0.04] px-4 py-3 text-white placeholder:text-white/40 shadow-[0_0_20px_rgba(167,139,250,0.18),0_0_40px_rgba(167,139,250,0.10)] focus:border-violet-400/60 focus:outline-none focus:ring-2 focus:ring-violet-400/30"
          aria-label="Prayer request"
          aria-describedby={nudge ? 'pray-error pray-char-count' : 'pray-char-count'}
          aria-invalid={nudge ? 'true' : undefined}
        />
        <div className="mt-1 flex justify-end">
          <CharacterCount
            current={text.length}
            max={PRAYER_MAX_LENGTH}
            warningAt={PRAYER_WARNING_THRESHOLD}
            dangerAt={PRAYER_DANGER_THRESHOLD}
            id="pray-char-count"
          />
        </div>
      </div>

      <div className="mb-1 flex h-4 items-center justify-end" aria-live="polite">
        {draftSaved && (
          <p className="motion-safe:animate-fade-in flex items-center gap-1 text-xs text-white/50">
            <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden="true" />
            Draft saved
          </p>
        )}
      </div>

      <CrisisBanner text={text} />

      {nudge && (
        <p id="pray-error" className="mb-2 flex items-center gap-1.5 text-sm text-red-400" role="alert">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          Tell God what&apos;s on your heart — even a few words is enough.
        </p>
      )}

      <div className="text-center">
        <Button
          variant="gradient"
          size="lg"
          type="button"
          onClick={handleSubmit}
          isLoading={isLoading}
        >
          Help Me Pray
        </Button>
      </div>
    </>
  )
}
