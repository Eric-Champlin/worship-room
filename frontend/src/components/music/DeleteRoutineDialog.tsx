import { useFocusTrap } from '@/hooks/useFocusTrap'

interface DeleteRoutineDialogProps {
  routineName: string
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteRoutineDialog({
  routineName,
  onConfirm,
  onCancel,
}: DeleteRoutineDialogProps) {
  const containerRef = useFocusTrap(true, onCancel)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        ref={containerRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-routine-title"
        aria-describedby="delete-routine-desc"
        className="mx-4 max-w-sm rounded-xl bg-white p-6 shadow-xl"
      >
        <h2 id="delete-routine-title" className="text-lg font-semibold text-text-dark">
          Delete {routineName}?
        </h2>
        <p id="delete-routine-desc" className="mt-2 text-sm text-text-light">
          This action cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-text-dark transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-red-700 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
