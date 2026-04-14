import { useState, useEffect, useRef, useCallback } from 'react'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useReducedMotion } from '@/hooks/useReducedMotion'

interface UnsavedChangesModalProps {
  isOpen: boolean
  onLeave: () => void
  onStay: () => void
}

export function UnsavedChangesModal({ isOpen, onLeave, onStay }: UnsavedChangesModalProps) {
  const [isClosing, setIsClosing] = useState(false)
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const reducedMotion = useReducedMotion()

  const handleStay = useCallback(() => {
    if (reducedMotion) {
      onStay()
      return
    }
    setIsClosing(true)
    closeTimeoutRef.current = setTimeout(() => {
      setIsClosing(false)
      onStay()
    }, 150)
  }, [reducedMotion, onStay])

  const handleLeave = useCallback(() => {
    if (reducedMotion) {
      onLeave()
      return
    }
    setIsClosing(true)
    closeTimeoutRef.current = setTimeout(() => {
      setIsClosing(false)
      onLeave()
    }, 150)
  }, [reducedMotion, onLeave])

  const containerRef = useFocusTrap(isOpen, handleStay)

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false)
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [isOpen])

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current)
    }
  }, [])

  const visible = isOpen || isClosing
  if (!visible) return null

  const backdropClass = isClosing
    ? 'motion-safe:animate-backdrop-fade-out'
    : 'motion-safe:animate-backdrop-fade-in'
  const panelClass = isClosing
    ? 'motion-safe:animate-modal-spring-out'
    : 'motion-safe:animate-modal-spring-in'

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 ${backdropClass}`}
      onClick={handleStay}
      role="presentation"
    >
      <div
        ref={containerRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="unsaved-dialog-title"
        aria-describedby="unsaved-dialog-desc"
        className={`mx-4 w-full max-w-md rounded-2xl border border-white/10 bg-surface-dark p-6 shadow-xl ${panelClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="unsaved-dialog-title" className="text-lg font-semibold text-white">
          Unsaved Changes
        </h2>
        <p id="unsaved-dialog-desc" className="mt-2 text-sm text-white/70">
          You have unsaved changes. Leave without saving?
        </p>
        <div className="mt-6 flex gap-3 justify-end">
          <button
            type="button"
            onClick={handleLeave}
            className="rounded-lg border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white transition-[colors,transform] duration-fast hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow-cyan focus-visible:rounded-lg active:scale-[0.98]"
          >
            Leave without saving
          </button>
          <button
            type="button"
            onClick={handleStay}
            autoFocus
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-[colors,transform] duration-fast hover:bg-primary-lt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow-cyan focus-visible:rounded-lg active:scale-[0.98]"
          >
            Keep editing
          </button>
        </div>
      </div>
    </div>
  )
}
