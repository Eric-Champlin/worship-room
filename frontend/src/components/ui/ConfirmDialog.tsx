import { useId } from 'react'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { cn } from '@/lib/utils'

export interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  body: string
  confirmLabel: string
  cancelLabel?: string
  variant?: 'destructive' | 'default'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  isOpen,
  title,
  body,
  confirmLabel,
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const containerRef = useFocusTrap(isOpen, onCancel)
  const titleId = useId()
  const bodyId = useId()

  if (!isOpen) return null

  // Mobile (coarse pointer) requires explicit Cancel-button tap to dismiss.
  function handleBackdropClick() {
    const isCoarsePointer =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(pointer: coarse)').matches
    if (!isCoarsePointer) onCancel()
  }

  const confirmButtonClass = cn(
    'flex-1 rounded-lg px-4 py-3 font-medium transition-colors min-h-[44px] text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/30',
    variant === 'destructive'
      ? 'bg-red-500 text-white hover:bg-red-600'
      : 'bg-primary text-white hover:bg-primary-lt',
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center motion-safe:animate-backdrop-fade-in">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />
      <div
        ref={containerRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className="relative z-10 mx-4 w-full max-w-md rounded-2xl border border-white/10 bg-hero-mid/95 p-6 backdrop-blur-md motion-safe:animate-modal-spring-in"
      >
        <h2 id={titleId} className="mb-2 text-lg font-semibold text-white">
          {title}
        </h2>
        <p id={bodyId} className="mb-6 text-sm text-white/70">
          {body}
        </p>
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg border border-white/15 bg-white/10 px-4 py-3 text-sm text-white transition-colors hover:bg-white/15 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/30"
          >
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} className={confirmButtonClass}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
