import { useFocusTrap } from '@/hooks/useFocusTrap'

interface NudgeDialogProps {
  friendName: string
  onConfirm: () => void
  onCancel: () => void
}

export function NudgeDialog({ friendName, onConfirm, onCancel }: NudgeDialogProps) {
  const containerRef = useFocusTrap(true, onCancel)

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) {
      onCancel()
    }
  }

  function handleConfirm(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    onConfirm()
  }

  function handleCancel(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    onCancel()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleBackdropClick}
    >
      <div
        ref={containerRef}
        role="alertdialog"
        aria-labelledby="nudge-dialog-title"
        aria-describedby="nudge-dialog-body"
        className="mx-4 w-full max-w-sm rounded-2xl border border-white/15 bg-hero-mid p-6 shadow-lg"
      >
        <h2 id="nudge-dialog-title" className="text-lg font-semibold text-white">
          Send a nudge
        </h2>
        <p id="nudge-dialog-body" className="mt-2 text-sm text-white/60">
          Let {friendName} know you&apos;re thinking of them. They&apos;ll receive a gentle reminder.
        </p>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            onClick={handleCancel}
            className="min-h-[44px] px-6 py-2.5 text-sm text-white/60 transition-colors hover:text-white/80"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="min-h-[44px] rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-[colors,transform] duration-fast hover:bg-primary-lt active:scale-[0.98]"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
