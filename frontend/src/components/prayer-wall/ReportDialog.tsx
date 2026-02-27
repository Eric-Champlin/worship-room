import { useState, useRef, useEffect, useCallback } from 'react'
import { Flag } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useFocusTrap } from '@/hooks/useFocusTrap'

interface ReportDialogProps {
  prayerId: string
  onReport?: (prayerId: string, reason: string) => void
}

export function ReportDialog({ prayerId, onReport }: ReportDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const handleClose = useCallback(() => {
    setIsOpen(false)
    setReason('')
    setSubmitted(false)
  }, [])
  const containerRef = useFocusTrap(isOpen, handleClose)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [isOpen])
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // useFocusTrap already focuses the first focusable element (the textarea)

  const handleSubmit = () => {
    onReport?.(prayerId, reason.trim())
    setSubmitted(true)
    setTimeout(() => {
      setIsOpen(false)
      setSubmitted(false)
      setReason('')
    }, 1500)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex min-h-[44px] items-center gap-1 px-2 text-xs text-text-light hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:rounded sm:min-h-0 sm:px-0"
      >
        <Flag className="h-3 w-3" aria-hidden="true" />
        Report
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => {
            setIsOpen(false)
            setReason('')
            setSubmitted(false)
          }}
          role="presentation"
        >
          <div
            ref={containerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-dialog-title"
            className="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
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
                  className="text-lg font-semibold text-text-dark"
                >
                  Report Prayer Request
                </h2>
                <p className="mt-1 text-sm text-text-light">
                  Please describe why you are reporting this content (optional):
                </p>
                <textarea
                  ref={textareaRef}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason for reporting..."
                  className="mt-3 w-full resize-none rounded-lg border border-gray-200 p-3 text-sm text-text-dark placeholder:text-text-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  rows={3}
                  aria-label="Report reason"
                />
                <div className="mt-4 flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsOpen(false)
                      setReason('')
                    }}
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
