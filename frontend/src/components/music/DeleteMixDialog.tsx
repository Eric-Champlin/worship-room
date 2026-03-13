import { useFocusTrap } from '@/hooks/useFocusTrap'

interface DeleteMixDialogProps {
  mixName: string
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteMixDialog({
  mixName,
  onConfirm,
  onCancel,
}: DeleteMixDialogProps) {
  const containerRef = useFocusTrap(true, onCancel)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        ref={containerRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-desc"
        className="mx-4 max-w-sm rounded-xl bg-white p-6 shadow-xl"
      >
        <h2 id="delete-dialog-title" className="text-lg font-semibold text-text-dark">
          Delete {mixName}?
        </h2>
        <p id="delete-dialog-desc" className="mt-2 text-sm text-text-light">
          This action cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-text-dark transition-colors hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-red-700 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-800"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
