import { AlertTriangle } from 'lucide-react'

import { SESSIONS_COPY } from '@/constants/sessions-copy'
import { useFocusTrap } from '@/hooks/useFocusTrap'

interface SignOutEverywhereDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}

/**
 * Spec 1.5g — confirmation modal for the "Sign out everywhere" action.
 *
 * Mirrors the {@link DeleteAccountModal} shape but with anti-pressure framing:
 * AlertTriangle icon, muted destructive styling on the confirm button, but
 * NO surveillance language. Copy lives in `sessions-copy.ts`.
 */
export function SignOutEverywhereDialog({
  isOpen,
  onClose,
  onConfirm,
}: SignOutEverywhereDialogProps) {
  const containerRef = useFocusTrap(isOpen, onClose)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />

      <div
        ref={containerRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="sign-out-everywhere-title"
        aria-describedby="sign-out-everywhere-desc"
        className="relative z-10 mx-4 w-full max-w-md rounded-2xl border border-white/10 bg-surface-dark p-6 backdrop-blur-md"
      >
        <div className="mb-2 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-300" aria-hidden="true" />
          <h2 id="sign-out-everywhere-title" className="text-lg font-semibold text-white">
            {SESSIONS_COPY.confirmEverywhereTitle}
          </h2>
        </div>
        <p id="sign-out-everywhere-desc" className="mb-6 text-sm text-white/70">
          {SESSIONS_COPY.confirmEverywhereBody}
        </p>

        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] flex-1 rounded-lg border border-white/15 bg-white/10 px-4 py-3 text-sm text-white transition-colors hover:bg-white/15"
          >
            {SESSIONS_COPY.confirmEverywhereCancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-[44px] flex-1 rounded-lg border border-red-400/30 bg-red-950/30 px-4 py-3 text-sm font-medium text-red-100 transition-colors hover:bg-red-900/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark"
          >
            {SESSIONS_COPY.confirmEverywhereAction}
          </button>
        </div>
      </div>
    </div>
  )
}
