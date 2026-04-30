import { useCallback, useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { FormError } from '@/components/ui/FormError'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'
import { acceptLegalVersionsApi, type LegalVersions } from '@/services/api/legal-api'
import { ApiError } from '@/types/auth'

type ModalView = 'notice' | 'accept-form'

interface TermsUpdateModalProps {
  isOpen: boolean
  versions: LegalVersions
  /** Called after a successful 204 from /me/legal/accept. The provider refreshes user state and replays any queued action. */
  onAccepted: () => void
  /** Called on X / "Later" / Escape. Drops any queued action. */
  onDismiss: () => void
}

/**
 * Spec 1.10f. Boot-stale + gated-action modal.
 *
 * Two internal views:
 *   notice → "We updated our terms." with [Review and accept] / [Later]
 *   accept-form → 3 doc links + consent checkbox + [Accept] / [Cancel]
 *
 * Mobile backdrop tap is disabled (Spec Watch-for #12) — only X, "Later", or
 * Escape close. Desktop backdrop tap is fine. The modal uses the canonical
 * useFocusTrap hook for keyboard accessibility and focus restoration.
 */
export function TermsUpdateModal({
  isOpen,
  versions,
  onAccepted,
  onDismiss,
}: TermsUpdateModalProps) {
  const [view, setView] = useState<ModalView>('notice')
  const [hasReviewed, setHasReviewed] = useState(false)
  const [isAccepting, setIsAccepting] = useState(false)
  const [error, setError] = useState<{ code: string; message: string } | null>(null)

  const containerRef = useFocusTrap(isOpen, onDismiss)
  const reviewButtonRef = useRef<HTMLButtonElement>(null)

  // Reset internal state every time the modal closes so reopening starts at
  // the notice view with the checkbox unchecked.
  useEffect(() => {
    if (!isOpen) {
      setView('notice')
      setHasReviewed(false)
      setIsAccepting(false)
      setError(null)
    }
  }, [isOpen])

  // Initial focus on the "Review and accept" button when notice view opens.
  useEffect(() => {
    if (isOpen && view === 'notice') {
      // Small delay so useFocusTrap's autofocus doesn't race us.
      const id = window.setTimeout(() => {
        reviewButtonRef.current?.focus()
      }, 0)
      return () => window.clearTimeout(id)
    }
    return undefined
  }, [isOpen, view])

  const handleAccept = useCallback(async () => {
    setIsAccepting(true)
    setError(null)
    try {
      await acceptLegalVersionsApi(versions.termsVersion, versions.privacyVersion)
      onAccepted()
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'VERSION_MISMATCH') {
          setError({
            code: 'VERSION_MISMATCH',
            message:
              'The terms updated again while you were reading. Take another quick look.',
          })
        } else if (err.code === 'RATE_LIMITED') {
          setError({
            code: 'RATE_LIMITED',
            message:
              'Please slow down a moment. You can try again in a few minutes.',
          })
        } else {
          setError({ code: err.code, message: err.message })
        }
      } else {
        setError({
          code: 'NETWORK_ERROR',
          message: "We couldn't reach the server. Check your connection and try again.",
        })
      }
    } finally {
      setIsAccepting(false)
    }
  }, [versions, onAccepted])

  if (!isOpen) return null

  // Mobile backdrop tap dismissal is disabled per Spec Watch-for #12. The
  // backdrop is decorative on mobile; on desktop, clicking outside the modal
  // body still dismisses (matches AuthModal pattern). We detect "small viewport"
  // via the matchMedia API — when matchMedia(max-width: 768px) matches, we do
  // NOT call onDismiss from the backdrop click handler.
  const handleBackdropClick = () => {
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches) {
      return
    }
    onDismiss()
  }

  const whitePillClass =
    'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-primary transition-all hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50'
  const textPillClass =
    'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-white/20 bg-transparent px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98]'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background:
          'radial-gradient(circle at center, rgba(139, 92, 246, 0.12) 0%, transparent 60%), rgba(0, 0, 0, 0.7)',
      }}
      onClick={handleBackdropClick}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="terms-modal-title"
        className="mx-4 w-full max-w-md rounded-3xl border border-white/[0.12] bg-hero-bg/95 p-6 shadow-[0_0_40px_rgba(139,92,246,0.15),0_8px_30px_rgba(0,0,0,0.4)] backdrop-blur-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative flex items-start justify-center">
          <h2
            id="terms-modal-title"
            className="pb-1 text-center text-2xl font-bold sm:text-3xl"
            style={GRADIENT_TEXT_STYLE}
          >
            We updated our terms.
          </h2>
          <button
            type="button"
            onClick={onDismiss}
            className="absolute right-0 top-0 flex min-h-[44px] min-w-[44px] items-center justify-center text-white/50 transition-colors hover:text-white focus-visible:rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Close"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {view === 'notice' && (
          <div className="mt-4">
            <p className="text-center text-sm text-white/90">
              Take a moment to review the changes. By continuing to use Worship
              Room, you agree to the latest documents.
            </p>

            {error && (
              <div className="mt-4">
                <FormError severity="error" onDismiss={() => setError(null)}>
                  {error.message}
                </FormError>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3">
              <button
                ref={reviewButtonRef}
                type="button"
                onClick={() => setView('accept-form')}
                className={whitePillClass}
              >
                Review and accept
              </button>
              <button type="button" onClick={onDismiss} className={textPillClass}>
                Later
              </button>
            </div>
          </div>
        )}

        {view === 'accept-form' && (
          <div className="mt-4">
            <p className="text-sm text-white/90">
              Open each document in a new tab. When you're ready, check the box
              below and tap Accept.
            </p>

            <div className="mt-4 flex flex-col gap-2">
              <a
                href="/terms-of-service"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] items-center rounded-xl border border-white/[0.12] bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              >
                Terms of Service
              </a>
              <a
                href="/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] items-center rounded-xl border border-white/[0.12] bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              >
                Privacy Policy
              </a>
              <a
                href="/community-guidelines"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] items-center rounded-xl border border-white/[0.12] bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              >
                Community Guidelines
              </a>
            </div>

            <label className="mt-5 flex items-start gap-3 text-sm text-white/90">
              <input
                type="checkbox"
                checked={hasReviewed}
                onChange={(e) => setHasReviewed(e.target.checked)}
                aria-required="true"
                className="mt-1 h-4 w-4 rounded border-white/30 bg-white/10 text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              />
              <span>I have reviewed and agree to the updated documents.</span>
            </label>

            {error && (
              <div className="mt-4">
                <FormError severity="error" onDismiss={() => setError(null)}>
                  {error.message}
                </FormError>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3">
              <Button
                type="button"
                onClick={handleAccept}
                disabled={!hasReviewed || isAccepting}
                isLoading={isAccepting}
                className={whitePillClass}
              >
                Accept
              </Button>
              <button
                type="button"
                onClick={() => {
                  setView('notice')
                  setHasReviewed(false)
                  setError(null)
                }}
                className={textPillClass}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
