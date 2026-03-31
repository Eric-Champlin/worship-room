import { useState, useRef, useCallback, useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import { CrisisBanner } from '@/components/daily/CrisisBanner'
import { CharacterCount } from '@/components/ui/CharacterCount'
import { AmbientSoundPill } from '@/components/daily/AmbientSoundPill'
import { DEFAULT_PRAYER_CHIPS } from '@/constants/daily-experience'

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
  const [text, setText] = useState('')
  const [selectedChip, setSelectedChip] = useState<string | null>(null)
  const [nudge, setNudge] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const autoExpand = useCallback((el: HTMLTextAreaElement) => {
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [])

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
            if (retryPrompt) onRetryPromptClear?.()
            autoExpand(e.target)
          }}
          onInput={(e) => autoExpand(e.target as HTMLTextAreaElement)}
          placeholder="Start typing here..."
          maxLength={500}
          rows={3}
          className="w-full resize-none rounded-lg border border-glow-cyan/30 bg-white/[0.06] px-4 py-3 text-white placeholder:text-white/50 motion-safe:animate-glow-pulse focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
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
          className="rounded-lg bg-primary px-8 py-3 font-semibold text-white transition-colors hover:bg-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Generate Prayer
        </button>
      </div>
    </>
  )
}
