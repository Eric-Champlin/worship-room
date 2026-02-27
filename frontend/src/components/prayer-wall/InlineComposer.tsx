import { useState, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { containsCrisisKeyword, CRISIS_RESOURCES } from '@/constants/crisis-resources'

interface InlineComposerProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (content: string, isAnonymous: boolean) => void
}

export function InlineComposer({ isOpen, onClose, onSubmit }: InlineComposerProps) {
  const [content, setContent] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [crisisDetected, setCrisisDetected] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = textarea.scrollHeight + 'px'
  }, [])

  // TODO(phase-3): replace keyword check with backend crisis detection API.
  // See .claude/rules/01-ai-safety.md — backend check is mandatory before production.
  const handleSubmit = useCallback(() => {
    if (!content.trim()) return
    if (containsCrisisKeyword(content)) {
      setCrisisDetected(true)
      return
    }
    onSubmit(content.trim(), isAnonymous)
    setContent('')
    setIsAnonymous(false)
    setCrisisDetected(false)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [content, isAnonymous, onSubmit])

  const handleCancel = useCallback(() => {
    setContent('')
    setIsAnonymous(false)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    onClose()
  }, [onClose])

  return (
    <div
      className={cn(
        'overflow-hidden transition-all duration-300 ease-in-out',
        isOpen ? 'visible mb-4 max-h-[600px] opacity-100' : 'invisible max-h-0 opacity-0',
      )}
      aria-hidden={!isOpen}
      {...(!isOpen && { inert: '' as unknown as string })}
    >
      <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
        <h2 className="mb-4 text-lg font-semibold text-text-dark">
          Share a Prayer Request
        </h2>

        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          placeholder="What's on your heart?"
          maxLength={1000}
          className="w-full resize-none rounded-lg border border-gray-200 p-3 leading-relaxed text-text-dark placeholder:text-text-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          style={{ minHeight: '120px' }}
          aria-label="Prayer request"
          aria-describedby={content.length >= 500 ? 'composer-char-count' : undefined}
        />

        <label className="mt-3 flex items-center gap-2">
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary focus-visible:ring-primary"
          />
          <span className="text-sm text-text-dark">Post anonymously</span>
        </label>

        <p className="mt-3 text-xs text-text-light">
          Your prayer will be shared with the community. Be kind and respectful.
        </p>

        <div className="mt-4 flex items-center justify-end gap-3">
          <Button type="button" variant="ghost" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={!content.trim() || content.length > 1000}
            onClick={handleSubmit}
          >
            Submit Prayer Request
          </Button>
        </div>

        {content.length >= 500 && (
          <p
            id="composer-char-count"
            aria-live="polite"
            className={cn('mt-2 text-xs', content.length >= 1000 ? 'text-danger' : 'text-text-light')}
          >
            {content.length}/1,000
          </p>
        )}

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
