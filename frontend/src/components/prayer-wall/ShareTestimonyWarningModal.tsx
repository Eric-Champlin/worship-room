import { Button } from '@/components/ui/Button'
import {
  SHARE_WARNING_BODY,
  SHARE_WARNING_CANCEL,
  SHARE_WARNING_CONFIRM,
  SHARE_WARNING_TITLE,
} from '@/constants/testimony-share-copy'
import { useFocusTrap } from '@/hooks/useFocusTrap'

/**
 * Spec 6.7 — One-time "irreversibility" warning modal (master plan AC#1).
 *
 * Shown the first time a user taps "Share as image" on a testimony post.
 * Dismissed-sticky via `wr_settings.prayerWall.dismissedShareWarning` so
 * subsequent shares skip the modal.
 *
 * Pattern mirrors `PrayerReceiptModal` (canonical project modal):
 *   - role="dialog" + aria-modal="true" + labelled-by the title element
 *   - useFocusTrap() — first focusable element receives focus on open;
 *     Tab cycles within the modal; Esc closes; previous focus restored.
 *   - Backdrop click dismisses via onCancel.
 *
 * Visual treatment is FrostedCard tier-1 + Button gradient/subtle pair
 * (Plan-Time Divergence #1 — informational, NOT destructive — so the
 * AlertDialog Pattern would mis-frame this moment).
 */
export interface ShareTestimonyWarningModalProps {
  open: boolean
  /** Sets `dismissedShareWarning=true` AND continues to share. */
  onConfirm: () => void
  /** Closes modal; does NOT share, does NOT set the flag. */
  onCancel: () => void
}

const TITLE_ID = 'share-testimony-warning-title'

export function ShareTestimonyWarningModal({
  open,
  onConfirm,
  onCancel,
}: ShareTestimonyWarningModalProps) {
  const containerRef = useFocusTrap(open, onCancel)
  if (!open) return null
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={TITLE_ID}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onCancel}
      data-testid="share-testimony-warning-modal"
    >
      <div
        ref={containerRef}
        className="relative w-full max-w-md rounded-3xl border border-violet-400/70 bg-hero-bg p-6 text-white shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={TITLE_ID} className="text-xl font-semibold text-white mb-3">
          {SHARE_WARNING_TITLE}
        </h2>
        <p className="text-white/80 leading-relaxed mb-6">{SHARE_WARNING_BODY}</p>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <Button
            variant="subtle"
            onClick={onCancel}
            data-testid="share-warning-cancel"
          >
            {SHARE_WARNING_CANCEL}
          </Button>
          <Button
            variant="gradient"
            size="lg"
            onClick={onConfirm}
            data-testid="share-warning-confirm"
          >
            {SHARE_WARNING_CONFIRM}
          </Button>
        </div>
      </div>
    </div>
  )
}
