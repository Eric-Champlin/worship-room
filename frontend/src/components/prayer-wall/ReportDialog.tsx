import { useState, useRef, useEffect, useCallback } from 'react'
import { Flag } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useReducedMotion } from '@/hooks/useReducedMotion'

interface ReportDialogProps {
  prayerId: string
  onReport?: (prayerId: string, reason: string) => void
}

export function ReportDialog({ prayerId, onReport }: ReportDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const reducedMotion = useReducedMotion()
  const handleClose = useCallback(() => {
    if (reducedMotion) {
      setIsOpen(false)
      setReason('')
      setSubmitted(false)
      return
    }
    setIsClosing(true)
    closeTimeoutRef.current = setTimeout(() => {
      setIsClosing(false)
      setIsOpen(false)
      setReason('')
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

  const handleSubmit = () => {
    onReport?.(prayerId, reason.trim())
    setSubmitted(true)
    setTimeout(() => {
      setIsOpen(false)
      setSubmitted(false)
      setReason('')
      setIsClosing(false)
    }, 1500)
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
        onClick={() => setIsOpen(true)}
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
            className={`mx-4 w-full max-w-sm rounded-xl border border-white/10 bg-surface-dark p-6 shadow-xl ${panelClass}`}
            onClick={(e) => e.stopPropagation()}
          >
            {submitted ? (
              <p role="status" className="text-center text-sm font-medium text-success">
                Report submitted. Thank you.
              </p>
            ) : (
              <>
                <h2
                  id="report-dialog-title"
                  className="text-lg font-semibold text-white"
                >
                  Report Prayer Request
                </h2>
                <p className="mt-1 text-sm text-white/60">
                  Please describe why you are reporting this content (optional):
                </p>
                <textarea
                  ref={textareaRef}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason for reporting..."
                  className="mt-3 w-full resize-none rounded-lg border border-white/10 bg-white/[0.06] p-3 text-sm text-white placeholder:text-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  rows={3}
                  aria-label="Report reason"
                />
                <div className="mt-4 flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClose}
                  >
                    Cancel
                  </Button>
                  <Button variant="primary" size="sm" onClick={handleSubmit}>
                    Submit Report
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
