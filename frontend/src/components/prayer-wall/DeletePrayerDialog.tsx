import { useState, useCallback, useEffect, useRef } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useReducedMotion } from '@/hooks/useReducedMotion'

interface DeletePrayerDialogProps {
  onDelete: () => void
}

export function DeletePrayerDialog({ onDelete }: DeletePrayerDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const reducedMotion = useReducedMotion()
  const handleClose = useCallback(() => {
    if (reducedMotion) {
      setIsOpen(false)
      return
    }
    setIsClosing(true)
    closeTimeoutRef.current = setTimeout(() => {
      setIsClosing(false)
      setIsOpen(false)
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

  const handleDelete = () => {
    onDelete()
    setIsOpen(false)
    setIsClosing(false)
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
        className="flex items-center gap-1.5 text-sm font-medium text-danger hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:rounded"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        Delete
      </button>

      {visible && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 ${backdropClass}`}
          onClick={handleClose}
          role="presentation"
        >
          <div
            ref={containerRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
            aria-describedby="delete-dialog-desc"
            className={`mx-4 w-full max-w-sm rounded-xl border border-white/10 bg-[#1a0f2e] p-6 shadow-xl ${panelClass}`}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="delete-dialog-title"
              className="text-lg font-semibold text-white"
            >
              Delete Prayer Request
            </h2>
            <p
              id="delete-dialog-desc"
              className="mt-2 text-sm text-white/60"
            >
              Are you sure you want to delete this prayer request? This action
              cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClose}
              >
                Cancel
              </Button>
              <button
                type="button"
                onClick={handleDelete}
                className="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
