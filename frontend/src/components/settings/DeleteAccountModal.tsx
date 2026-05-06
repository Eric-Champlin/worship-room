import { AlertTriangle } from 'lucide-react'
import { useFocusTrap } from '@/hooks/useFocusTrap'

interface DeleteAccountModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}

export function DeleteAccountModal({ isOpen, onClose, onConfirm }: DeleteAccountModalProps) {
  const containerRef = useFocusTrap(isOpen, onClose)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />

      {/* Modal */}
      <div
        ref={containerRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-title"
        aria-describedby="delete-desc"
        className="relative z-10 rounded-2xl border border-white/10 bg-surface-dark backdrop-blur-md p-6 max-w-md w-full mx-4"
      >
        <div className="flex items-center gap-3 mb-2">
          <AlertTriangle className="h-5 w-5 text-red-300 shrink-0" aria-hidden="true" />
          <h2 id="delete-title" className="text-lg font-semibold text-white">
            Delete Your Account?
          </h2>
        </div>
        <p id="delete-desc" className="text-sm text-white/70 mb-6">
          This will permanently delete all your Worship Room data including mood entries, journal
          drafts, badges, friends, and settings. This action cannot be undone.
          We&apos;ll miss you.
        </p>

        {/* Desktop: side by side, Mobile: stacked */}
        <div className="flex flex-col-reverse sm:flex-row gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-white/10 text-white border border-white/15 rounded-lg px-4 py-3 hover:bg-white/15 transition-colors min-h-[44px] text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 bg-red-950/30 border border-red-400/30 text-red-100 hover:bg-red-900/40 rounded-lg px-4 py-3 transition-colors font-medium min-h-[44px] text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark"
          >
            Delete Everything
          </button>
        </div>
      </div>
    </div>
  )
}
