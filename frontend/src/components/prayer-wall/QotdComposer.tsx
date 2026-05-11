import { useState, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { CharacterCount } from '@/components/ui/CharacterCount'
import { FrostedCard } from '@/components/homepage/FrostedCard'
import { containsCrisisKeyword, CRISIS_RESOURCES } from '@/constants/crisis-resources'
import { QOTD_MAX_LENGTH, QOTD_WARNING_THRESHOLD } from '@/constants/content-limits'

interface QotdComposerProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (content: string, idempotencyKey?: string) => boolean | Promise<boolean>
}

export function QotdComposer({ isOpen, onClose, onSubmit }: QotdComposerProps) {
  const [content, setContent] = useState('')
  const [crisisDetected, setCrisisDetected] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() =>
    typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`
  )
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
    setIdempotencyKey(
      typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`
    )
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = textarea.scrollHeight + 'px'
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!content.trim()) return
    if (containsCrisisKeyword(content)) {
      setCrisisDetected(true)
      return
    }
    setIsSubmitting(true)
    try {
      const success = await onSubmit(content.trim(), idempotencyKey)
      if (!success) return
      setContent('')
      setCrisisDetected(false)
      setIdempotencyKey(
        typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`
      )
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    } finally {
      setIsSubmitting(false)
    }
  }, [content, onSubmit, idempotencyKey])

  const handleCancel = useCallback(() => {
    setContent('')
    setCrisisDetected(false)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    onClose()
  }, [onClose])

  return (
    <div
      className={cn(
        'overflow-hidden transition-all duration-base ease-standard motion-reduce:transition-none',
        isOpen ? 'visible mt-3 max-h-[600px] opacity-100' : 'invisible max-h-0 opacity-0'
      )}
      aria-hidden={!isOpen}
      {...(!isOpen && { inert: '' as unknown as string })}
    >
      <FrostedCard variant="default" as="div">
        <h3 className="mb-3 text-base font-semibold text-white">Share Your Thoughts</h3>

        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          placeholder="Share your thoughts..."
          maxLength={QOTD_MAX_LENGTH}
          className="w-full resize-none rounded-lg border border-white/10 bg-white/5 p-3 leading-relaxed text-white placeholder:text-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          style={{ minHeight: '100px' }}
          aria-label="Your response to the question of the day"
          aria-invalid={content.length > QOTD_MAX_LENGTH ? 'true' : undefined}
          aria-describedby="qotd-char-count"
        />

        <div className="mt-2">
          <CharacterCount
            current={content.length}
            max={QOTD_MAX_LENGTH}
            visibleAt={QOTD_WARNING_THRESHOLD}
            id="qotd-char-count"
          />
        </div>

        <div className="mt-3 flex items-center justify-end gap-3">
          <Button type="button" variant="ghost" onClick={handleCancel} className="min-h-[44px]">
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={!content.trim() || content.length > QOTD_MAX_LENGTH}
            onClick={handleSubmit}
            isLoading={isSubmitting}
            className="min-h-[44px]"
          >
            Post Response
          </Button>
        </div>

        {crisisDetected && (
          <div role="alert" className="mt-4 rounded-lg border border-danger/30 bg-danger/10 p-4">
            <p className="mb-2 text-sm font-semibold text-danger">
              It sounds like you may be going through a difficult time.
            </p>
            <p className="mb-3 text-sm text-white/90">
              If you or someone you know is in crisis, please reach out for help:
            </p>
            <ul className="space-y-1 text-sm text-white/90">
              <li>
                <strong>{CRISIS_RESOURCES.suicide_prevention.name}:</strong>{' '}
                <a
                  href={`tel:${CRISIS_RESOURCES.suicide_prevention.phone}`}
                  className="font-medium text-primary underline"
                >
                  {CRISIS_RESOURCES.suicide_prevention.phone}
                </a>
              </li>
              <li>
                <strong>{CRISIS_RESOURCES.crisis_text.name}:</strong>{' '}
                {CRISIS_RESOURCES.crisis_text.text}
              </li>
              <li>
                <strong>{CRISIS_RESOURCES.samhsa.name}:</strong>{' '}
                <a
                  href={`tel:${CRISIS_RESOURCES.samhsa.phone}`}
                  className="font-medium text-primary underline"
                >
                  {CRISIS_RESOURCES.samhsa.phone}
                </a>
              </li>
            </ul>
          </div>
        )}
      </FrostedCard>
    </div>
  )
}
