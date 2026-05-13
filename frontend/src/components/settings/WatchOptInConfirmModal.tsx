import { useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { WATCH_OPT_IN_MODAL_COPY } from '@/constants/watch-copy'

interface WatchOptInConfirmModalProps {
  isOpen: boolean
  /**
   * Called when the user explicitly confirms via "Yes, turn on" primary action.
   * Persistence to settings happens in the caller (WatchToggle).
   */
  onConfirm: () => void
  /**
   * Called when the user declines via "Not right now" secondary action or
   * Esc key (W33). Caller MUST revert the pending toggle state to the
   * previous value.
   *
   * Note: backdrop click does NOT dismiss. For a safety-related opt-IN
   * confirmation, requiring an explicit Esc or button press matches the
   * W3C alertdialog convention and prevents accidental backdrop clicks
   * from unwinding deliberate user intent.
   */
  onDecline: () => void
}

/**
 * Spec 6.4 — Watch opt-in confirmation modal.
 *
 * Opens when user taps the "On" or "Auto" radio in WatchToggle. Does NOT open
 * for the "Off" radio (D-OptOutFriction — opt-out is friction-free).
 *
 * Accessibility (W31-W33 + Gate-G-A11Y):
 *   - role="alertdialog" (safety-related decision; announces immediately)
 *   - aria-modal="true"
 *   - aria-labelledby points to header; aria-describedby points to body
 *   - Focus trap via useFocusTrap(isOpen, onDecline)
 *   - Focus moves to PRIMARY action on open (W32) — override useFocusTrap's
 *     default-first behavior with explicit primary-button focus
 *   - Esc key triggers onDecline (W33 — treated as user declining, not silent cancel)
 *
 * Copy: D-ConfirmationModalCopy — pre-approved by Eric.
 */
export function WatchOptInConfirmModal({
  isOpen,
  onConfirm,
  onDecline,
}: WatchOptInConfirmModalProps) {
  const containerRef = useFocusTrap(isOpen, onDecline)

  useEffect(() => {
    if (!isOpen) return
    // Move focus to the primary action on open (W32). useFocusTrap focuses the
    // first focusable element; we override that here to focus the primary.
    // `containerRef` is a stable useRef object — excluded from deps.
    const primaryButton = containerRef.current?.querySelector<HTMLButtonElement>(
      '[data-watch-modal-primary]',
    )
    primaryButton?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 motion-safe:animate-fade-in">
      <div
        className="absolute inset-0 bg-hero-bg/80 backdrop-blur-sm"
        aria-hidden="true"
      />
      <div
        ref={containerRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="watch-opt-in-heading"
        aria-describedby="watch-opt-in-body"
        className="relative w-full max-w-md rounded-3xl border border-white/[0.12] bg-hero-bg/95 p-6 shadow-2xl"
      >
        <h2
          id="watch-opt-in-heading"
          className="mb-3 text-xl font-semibold text-white"
        >
          {WATCH_OPT_IN_MODAL_COPY.header}
        </h2>
        <p
          id="watch-opt-in-body"
          className="mb-6 text-[15px] leading-[1.7] text-white/80"
        >
          {WATCH_OPT_IN_MODAL_COPY.body}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="subtle"
            onClick={onDecline}
            className="sm:order-1"
          >
            {WATCH_OPT_IN_MODAL_COPY.secondaryActionLabel}
          </Button>
          <Button
            variant="gradient"
            size="lg"
            onClick={onConfirm}
            data-watch-modal-primary=""
            className="sm:order-2"
          >
            {WATCH_OPT_IN_MODAL_COPY.primaryActionLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
