import { useState, useRef, useEffect, useCallback } from 'react'
import { Flag } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { CharacterCount } from '@/components/ui/CharacterCount'
import { FrostedCard } from '@/components/homepage/FrostedCard'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useAuth } from '@/hooks/useAuth'
import { useAuthModal } from './AuthModalProvider'
import { useToast } from '@/components/ui/Toast'
import { ApiError } from '@/types/auth'
import type { ReportReason } from '@/services/api/reports-api'
import { cn } from '@/lib/utils'

interface ReportDialogProps {
  prayerId: string
  /**
   * Spec 3.8: signature is now async and accepts the structured reason +
   * optional details. Previous string-only signature is gone.
   */
  onReport?: (
    prayerId: string,
    reason: ReportReason,
    details?: string,
  ) => Promise<void>
}

const REASON_OPTIONS: Array<{ value: ReportReason; label: string }> = [
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'hate', label: 'Hate speech' },
  { value: 'self_harm', label: 'Self-harm' },
  { value: 'sexual', label: 'Inappropriate content' },
  { value: 'other', label: 'Other' },
]

export function ReportDialog({ prayerId, onReport }: ReportDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [details, setDetails] = useState('')
  const [selectedReason, setSelectedReason] = useState<ReportReason>('other')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const reducedMotion = useReducedMotion()

  const { isAuthenticated } = useAuth()
  const authModal = useAuthModal()
  const { showToast } = useToast()

  const handleClose = useCallback(() => {
    if (reducedMotion) {
      setIsOpen(false)
      setDetails('')
      setSelectedReason('other')
      setSubmitted(false)
      return
    }
    setIsClosing(true)
    closeTimeoutRef.current = setTimeout(() => {
      setIsClosing(false)
      setIsOpen(false)
      setDetails('')
      setSelectedReason('other')
      setSubmitted(false)
    }, 150)
  }, [reducedMotion])
  const containerRef = useFocusTrap(isOpen, handleClose)

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false)
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [isOpen])

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current)
    }
  }, [])

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleOpenClick = () => {
    if (!isAuthenticated) {
      authModal?.openAuthModal()
      return
    }
    setIsOpen(true)
  }

  const handleSubmit = async () => {
    if (submitting) return
    setSubmitting(true)
    try {
      await onReport?.(prayerId, selectedReason, details.trim() || undefined)
      setSubmitted(true)
      setSubmitting(false)
      setTimeout(() => {
        setIsOpen(false)
        setSubmitted(false)
        setDetails('')
        setSelectedReason('other')
        setIsClosing(false)
      }, 1500)
    } catch (e) {
      setSubmitting(false)
      if (e instanceof ApiError) {
        if (e.status === 401) {
          // apiFetch already cleared token + dispatched wr:auth-invalidated;
          // AuthModal opens via global listener. No toast needed.
          return
        }
        if (e.status === 404) {
          showToast('This content is no longer available.', 'error')
          return
        }
        if (e.status === 429) {
          showToast(
            e.message || 'Please slow down a moment. You can report again soon.',
            'error',
          )
          return
        }
        if (e.status === 400 && e.code === 'SELF_REPORT') {
          showToast("You can't report your own posts.", 'error')
          return
        }
      }
      showToast('Something went wrong. Try again in a moment.', 'error')
    }
  }

  const visible = isOpen || isClosing
  const backdropClass = isClosing
    ? 'motion-safe:animate-backdrop-fade-out'
    : 'motion-safe:animate-backdrop-fade-in'
  const panelClass = isClosing
    ? 'motion-safe:animate-modal-spring-out'
    : 'motion-safe:animate-modal-spring-in'

  return (
    <>
      <button
        type="button"
        onClick={handleOpenClick}
        className="flex min-h-[44px] items-center gap-1 px-2 text-xs text-white/50 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:rounded sm:min-h-0 sm:px-0"
      >
        <Flag className="h-3 w-3" aria-hidden="true" />
        Report
      </button>

      {visible && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 ${backdropClass}`}
          onClick={handleClose}
          role="presentation"
        >
          <div
            ref={containerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-dialog-title"
            onClick={(e) => e.stopPropagation()}
            className={cn('mx-4 w-full max-w-sm', panelClass)}
          >
            <FrostedCard variant="default" as="div">
              {submitted ? (
                <p role="status" className="text-center text-sm font-medium text-success">
                  Report submitted. Thank you for keeping this safe.
                </p>
              ) : (
                <>
                  <h2
                    id="report-dialog-title"
                    className="text-lg font-semibold text-white"
                  >
                    Report Prayer Request
                  </h2>
                  <fieldset className="mt-3">
                    <legend className="text-sm text-white/70">Reason:</legend>
                    <div role="radiogroup" className="mt-2 grid grid-cols-2 gap-2">
                      {REASON_OPTIONS.map((option) => (
                        <label
                          key={option.value}
                          className="flex min-h-[44px] items-center gap-2 text-sm text-white"
                        >
                          <input
                            type="radio"
                            name="report-reason"
                            value={option.value}
                            checked={selectedReason === option.value}
                            onChange={() => setSelectedReason(option.value)}
                            className="h-4 w-4 accent-primary"
                          />
                          {option.label}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <p className="mt-4 text-sm text-white/60">Tell us more (optional):</p>
                  <textarea
                    ref={textareaRef}
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="Add more context..."
                    maxLength={500}
                    className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-white/[0.06] p-3 text-sm text-white placeholder:text-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    rows={3}
                    aria-label="Report reason"
                    aria-describedby="report-char-count"
                  />
                  <div className="mt-1">
                    <CharacterCount current={details.length} max={500} visibleAt={300} id="report-char-count" />
                  </div>
                  <div className="mt-4 flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClose}
                      disabled={submitting}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleSubmit}
                      isLoading={submitting}
                    >
                      {submitting ? 'Submitting...' : 'Submit Report'}
                    </Button>
                  </div>
                </>
              )}
            </FrostedCard>
          </div>
        </div>
      )}
    </>
  )
}
