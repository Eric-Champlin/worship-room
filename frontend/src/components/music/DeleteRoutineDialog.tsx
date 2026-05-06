import { AlertTriangle } from 'lucide-react'
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
        className="mx-4 max-w-sm rounded-2xl border border-white/[0.12] p-6"
        style={{ background: 'rgba(15, 10, 30, 0.95)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
      >
        <div className="flex items-center gap-3 mb-2">
          <AlertTriangle className="h-5 w-5 text-red-300 shrink-0" aria-hidden="true" />
          <h2 id="delete-routine-title" className="text-lg font-semibold text-white">
            Delete {routineName}?
          </h2>
        </div>
        <p id="delete-routine-desc" className="mt-2 text-sm text-white/70">
          This action cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[44px] rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-red-950/30 border border-red-400/30 text-red-100 hover:bg-red-900/40 px-6 py-2 text-sm font-semibold transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-dark"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
