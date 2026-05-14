import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { ANIMATION_DURATIONS } from '@/constants/animation'
import { Button } from '@/components/ui/Button'
import { FrostedCard } from '@/components/homepage/FrostedCard'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { cn } from '@/lib/utils'
import {
  UNMARK_ANSWERED_LABEL,
  UNMARK_ANSWERED_CONFIRM,
} from '@/constants/answered-wall-copy'

interface UnmarkAnsweredDialogProps {
  /** Called when the user confirms the un-mark. */
  onConfirm: () => void
}

/**
 * Spec 6.6b — Un-mark answered confirmation dialog (AlertDialog Pattern per
 * `09-design-system.md`). Mirrors {@link DeletePrayerDialog}'s shape — a
 * trigger button + focus-trapped modal panel with a destructive primary
 * action.
 *
 * The action is reversible (the user can mark the prayer answered again), so
 * the destructive treatment is muted relative to delete: `AlertTriangle` icon
 * instead of `Trash2`, "Un-mark" copy instead of "Remove forever".
 */
export function UnmarkAnsweredDialog({ onConfirm }: UnmarkAnsweredDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const reducedMotion = useReducedMotion()

  const handleClose = useCallback(() => {
    if (reducedMotion) {
      setIsOpen(false)
      return
    }
    setIsClosing(true)
    closeTimeoutRef.current = setTimeout(() => {
      setIsClosing(false)
      setIsOpen(false)
    }, ANIMATION_DURATIONS.fast)
  }, [reducedMotion])

  const containerRef = useFocusTrap(isOpen, handleClose)

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false)
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [isOpen])

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current)
    }
  }, [])

  const handleConfirm = () => {
    onConfirm()
    setIsOpen(false)
    setIsClosing(false)
  }

  const visible = isOpen || isClosing
  const backdropClass = isClosing
    ? 'motion-safe:animate-backdrop-fade-out'
    : 'motion-safe:animate-backdrop-fade-in'
  const panelClass = isClosing
    ? 'motion-safe:animate-modal-spring-out'
    : 'motion-safe:animate-modal-spring-in'

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-white/[0.12] bg-white/[0.05] px-3 py-2 text-sm font-medium text-white/70 transition-colors duration-fast hover:bg-white/[0.10] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
      >
        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
        {UNMARK_ANSWERED_LABEL}
      </button>

      {visible && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 ${backdropClass}`}
          onClick={handleClose}
          role="presentation"
        >
          <div
            ref={containerRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="unmark-dialog-title"
            aria-describedby="unmark-dialog-desc"
            onClick={(e) => e.stopPropagation()}
            className={cn('mx-4 w-full max-w-sm', panelClass)}
          >
            <FrostedCard variant="default" as="div">
              <h2
                id="unmark-dialog-title"
                className="flex items-center gap-2 text-lg font-semibold text-white"
              >
                <AlertTriangle
                  className="h-5 w-5 text-amber-300"
                  aria-hidden="true"
                />
                {UNMARK_ANSWERED_LABEL}
              </h2>
              <p
                id="unmark-dialog-desc"
                className="mt-3 text-sm leading-relaxed text-white/70"
              >
                {UNMARK_ANSWERED_CONFIRM}
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <Button variant="subtle" size="sm" onClick={handleClose}>
                  Cancel
                </Button>
                {/* AlertDialog Pattern per 09-design-system.md — muted
                    destructive treatment (bg-red-950/30 / border-red-400/30 /
                    text-red-100). The Button component lacks an explicit
                    "alertdialog" variant today, so the canonical class string
                    is inlined here. */}
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="inline-flex min-h-[44px] items-center rounded-md border border-red-400/30 bg-red-950/30 px-4 py-2 text-sm font-medium text-red-100 transition-colors duration-fast hover:bg-red-900/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg"
                >
                  {UNMARK_ANSWERED_LABEL}
                </button>
              </div>
            </FrostedCard>
          </div>
        </div>
      )}
    </>
  )
}
