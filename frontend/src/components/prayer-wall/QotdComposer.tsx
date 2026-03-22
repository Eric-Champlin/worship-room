import { useState, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { containsCrisisKeyword, CRISIS_RESOURCES } from '@/constants/crisis-resources'

interface QotdComposerProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (content: string) => void
}

export function QotdComposer({ isOpen, onClose, onSubmit }: QotdComposerProps) {
  const [content, setContent] = useState('')
  const [crisisDetected, setCrisisDetected] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = textarea.scrollHeight + 'px'
  }, [])

  const handleSubmit = useCallback(() => {
    if (!content.trim()) return
    if (containsCrisisKeyword(content)) {
      setCrisisDetected(true)
      return
    }
    onSubmit(content.trim())
    setContent('')
    setCrisisDetected(false)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [content, onSubmit])

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
        'overflow-hidden transition-all duration-300 ease-in-out',
        isOpen ? 'visible mt-3 max-h-[600px] opacity-100' : 'invisible max-h-0 opacity-0',
      )}
      aria-hidden={!isOpen}
      {...(!isOpen && { inert: '' as unknown as string })}
    >
      <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
        <h3 className="mb-3 text-base font-semibold text-text-dark">
          Share Your Thoughts
        </h3>

        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          placeholder="Share your thoughts..."
          maxLength={500}
          className="w-full resize-none rounded-lg border border-gray-200 p-3 leading-relaxed text-text-dark placeholder:text-text-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          style={{ minHeight: '100px' }}
          aria-label="Your response to the question of the day"
          aria-describedby={content.length >= 400 ? 'qotd-char-count' : undefined}
        />

        {content.length >= 400 && (
          <p
            id="qotd-char-count"
            aria-live="polite"
            className={cn('mt-2 text-xs', content.length >= 500 ? 'text-danger' : 'text-text-light')}
          >
            {content.length}/500
          </p>
        )}

        <div className="mt-3 flex items-center justify-end gap-3">
          <Button type="button" variant="ghost" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={!content.trim() || content.length > 500}
            onClick={handleSubmit}
          >
            Post Response
          </Button>
        </div>

        {crisisDetected && (
          <div role="alert" className="mt-4 rounded-lg border border-danger/30 bg-red-50 p-4">
            <p className="mb-2 text-sm font-semibold text-danger">
              It sounds like you may be going through a difficult time.
            </p>
            <p className="mb-3 text-sm text-text-dark">
              If you or someone you know is in crisis, please reach out for help:
            </p>
            <ul className="space-y-1 text-sm text-text-dark">
              <li>
                <strong>{CRISIS_RESOURCES.suicide_prevention.name}:</strong>{' '}
                <a href={`tel:${CRISIS_RESOURCES.suicide_prevention.phone}`} className="font-medium text-primary underline">
                  {CRISIS_RESOURCES.suicide_prevention.phone}
                </a>
              </li>
              <li>
                <strong>{CRISIS_RESOURCES.crisis_text.name}:</strong>{' '}
                {CRISIS_RESOURCES.crisis_text.text}
              </li>
              <li>
                <strong>{CRISIS_RESOURCES.samhsa.name}:</strong>{' '}
                <a href={`tel:${CRISIS_RESOURCES.samhsa.phone}`} className="font-medium text-primary underline">
                  {CRISIS_RESOURCES.samhsa.phone}
                </a>
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
