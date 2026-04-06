import { useState, useRef, useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import { CrisisBanner } from '@/components/daily/CrisisBanner'
import { CharacterCount } from '@/components/ui/CharacterCount'
import { AmbientSoundPill } from '@/components/daily/AmbientSoundPill'
import { DEFAULT_PRAYER_CHIPS, PRAYER_DRAFT_KEY } from '@/constants/daily-experience'

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
        } else {
          localStorage.removeItem(PRAYER_DRAFT_KEY)
        }
      } catch {
        // localStorage failure is non-critical
      }
    }, 1000)
    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
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
            <button
              key={chip}
              type="button"
              onClick={() => handleChipClick(chip)}
              className="min-h-[44px] shrink-0 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/70 transition-colors hover:border-primary hover:text-primary"
            >
              {chip}
            </button>
          ))}
          <AmbientSoundPill context="pray" variant="dark" className="!mb-0 !w-auto" />
        </div>
      )}

      <div className="mb-4">
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
          maxLength={500}
          rows={8}
          className="w-full resize-y min-h-[200px] max-h-[500px] rounded-lg border border-glow-cyan/30 bg-white/[0.06] px-4 py-3 text-white placeholder:text-white/50 motion-safe:animate-glow-pulse focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
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
          onClick={handleSubmit}
          disabled={isLoading}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-8 py-3.5 text-base font-semibold text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)] transition-all duration-200 hover:bg-white/90 hover:shadow-[0_0_40px_rgba(255,255,255,0.30)] sm:text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg disabled:cursor-not-allowed disabled:opacity-50"
        >
          Help Me Pray
        </button>
      </div>
    </>
  )
}
