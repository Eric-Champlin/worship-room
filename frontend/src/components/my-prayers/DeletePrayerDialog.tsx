import { useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { useFocusTrap } from '@/hooks/useFocusTrap'

interface DeletePrayerDialogProps {
  isOpen: boolean
  onClose: () => void
  onDelete: () => void
}

export function DeletePrayerDialog({ isOpen, onClose, onDelete }: DeletePrayerDialogProps) {
  const containerRef = useFocusTrap(isOpen, onClose)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [isOpen])

  const handleDelete = useCallback(() => {
    onDelete()
    onClose()
  }, [onDelete, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={containerRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-prayer-dialog-title"
        aria-describedby="delete-prayer-dialog-desc"
        className="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="delete-prayer-dialog-title"
          className="text-lg font-semibold text-text-dark"
        >
          Remove this prayer?
        </h2>
        <p
          id="delete-prayer-dialog-desc"
          className="mt-2 text-sm text-text-light"
        >
          This cannot be undone.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <button
            type="button"
            onClick={handleDelete}
            className="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  )
}
