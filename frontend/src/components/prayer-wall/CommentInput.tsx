import { useState, useEffect, useRef } from 'react'
import { Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useAuthModal } from './AuthModalProvider'
import { containsCrisisKeyword, CRISIS_RESOURCES } from '@/constants/crisis-resources'
import { CharacterCount } from '@/components/ui/CharacterCount'

const MAX_COMMENT_LENGTH = 500

interface CommentInputProps {
  prayerId: string
  /**
   * Submit handler. Return `true` on success (input clears); `false` to keep
   * the value and idempotency key so a retry of the SAME content reuses the
   * SAME key (W5 + Spec 3.5 backend dedup contract).
   */
  onSubmit: (
    prayerId: string,
    content: string,
    idempotencyKey?: string
  ) => boolean | Promise<boolean>
  initialValue?: string
  onLoginClick?: () => void
}

export function CommentInput({
  prayerId,
  onSubmit,
  initialValue = '',
  onLoginClick,
}: CommentInputProps) {
  const { isAuthenticated } = useAuth()
  const authModal = useAuthModal()
  const [value, setValue] = useState(initialValue)
  const [crisisDetected, setCrisisDetected] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() =>
    typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`
  )
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (initialValue && inputRef.current) {
      setValue(initialValue)
      inputRef.current.focus()
    }
  }, [initialValue])

  if (!isAuthenticated) {
    return (
      <button
        type="button"
        onClick={onLoginClick ?? (() => authModal?.openAuthModal())}
        className="mt-3 block min-h-[44px] w-full rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-left text-sm text-white/50 transition-[colors,transform] duration-fast hover:border-primary active:scale-[0.98]"
      >
        Log in to comment
      </button>
    )
  }

  // Crisis keyword check is the client-side courtesy fast-path — backend's
  // CrisisAlertService is the canonical entry (Phase 3 Addendum #7).
  const handleSubmit = async () => {
    if (!value.trim()) return
    if (containsCrisisKeyword(value)) {
      setCrisisDetected(true)
      return
    }
    setIsSubmitting(true)
    try {
      const success = await onSubmit(prayerId, value.trim(), idempotencyKey)
      if (!success) return
      setValue('')
      setCrisisDetected(false)
      setIdempotencyKey(
        typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <>
      <div className="mt-3 flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            if (e.target.value.length <= MAX_COMMENT_LENGTH) {
              setValue(e.target.value)
              setCrisisDetected(false)
              // Bump idempotency key on edit so a fresh comment gets a fresh key.
              setIdempotencyKey(
                typeof crypto !== 'undefined' && crypto.randomUUID
                  ? crypto.randomUUID()
                  : `${Date.now()}`
              )
            }
          }}
          onKeyDown={handleKeyDown}
          maxLength={MAX_COMMENT_LENGTH}
          placeholder="Write a comment..."
          className="flex-1 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white placeholder:text-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Comment"
          aria-invalid={crisisDetected || undefined}
          aria-describedby={
            crisisDetected
              ? `comment-crisis-banner-${prayerId} comment-char-count-${prayerId}`
              : `comment-char-count-${prayerId}`
          }
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!value.trim() || isSubmitting}
          aria-busy={isSubmitting}
          className={cn(
            'flex min-h-[44px] min-w-[44px] items-center justify-center focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            value.trim() && !isSubmitting ? 'text-primary hover:text-primary-lt' : 'text-white/20'
          )}
          aria-label="Submit comment"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <div className="mt-1 flex justify-end">
        <CharacterCount
          current={value.length}
          max={500}
          warningAt={400}
          dangerAt={480}
          visibleAt={300}
          id={`comment-char-count-${prayerId}`}
        />
      </div>
      {crisisDetected && (
        <div
          id={`comment-crisis-banner-${prayerId}`}
          role="alert"
          className="mt-3 rounded-lg border border-danger/30 bg-danger/10 p-3"
        >
          <p className="mb-1 text-xs font-semibold text-danger">
            If you are in crisis, please reach out for help:
          </p>
          <ul className="space-y-0.5 text-xs text-white/90">
            <li>
              {CRISIS_RESOURCES.suicide_prevention.name}:{' '}
              <a
                href={`tel:${CRISIS_RESOURCES.suicide_prevention.phone}`}
                className="font-medium text-primary underline"
              >
                {CRISIS_RESOURCES.suicide_prevention.phone}
              </a>
            </li>
            <li>
              {CRISIS_RESOURCES.crisis_text.name}: {CRISIS_RESOURCES.crisis_text.text}
            </li>
            <li>
              {CRISIS_RESOURCES.samhsa.name}:{' '}
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
    </>
  )
}
