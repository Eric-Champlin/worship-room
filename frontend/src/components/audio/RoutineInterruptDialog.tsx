import { useFocusTrap } from '@/hooks/useFocusTrap'
import { Z } from '@/constants/z-index'

interface RoutineInterruptDialogProps {
  onConfirm: () => void
  onCancel: () => void
}

export function RoutineInterruptDialog({
  onConfirm,
  onCancel,
}: RoutineInterruptDialogProps) {
  const containerRef = useFocusTrap(true, onCancel)

  return (
    <div className={`fixed inset-0 z-[${Z.MODAL}] flex items-center justify-center bg-black/40`}>
      <div
        ref={containerRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="routine-interrupt-title"
        aria-describedby="routine-interrupt-desc"
        className="mx-4 max-w-sm rounded-xl border border-white/10 p-6"
        style={{
          background: 'rgba(15, 10, 30, 0.95)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        <h2 id="routine-interrupt-title" className="mb-2 text-sm font-semibold text-white">
          End Current Routine?
        </h2>
        <p id="routine-interrupt-desc" className="mb-6 text-sm leading-relaxed text-white/80">
          This will end your current routine. Continue?
        </p>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-primary px-8 py-3 font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt"
          >
            End Routine
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-white/30 bg-white/10 px-8 py-3 font-medium text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt"
          >
            Keep Routine
          </button>
        </div>
      </div>
    </div>
  )
}
