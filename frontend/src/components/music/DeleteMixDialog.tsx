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
        className="mx-4 max-w-sm rounded-2xl border border-white/10 p-6"
        style={{ background: 'rgba(15, 10, 30, 0.95)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
      >
        <h2 id="delete-dialog-title" className="text-lg font-semibold text-white">
          Delete {mixName}?
        </h2>
        <p id="delete-dialog-desc" className="mt-2 text-sm text-white/70">
          This action cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70"
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
