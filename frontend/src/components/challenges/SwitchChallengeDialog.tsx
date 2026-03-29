import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

interface SwitchChallengeDialogProps {
  isOpen: boolean
  currentChallengeName: string
  currentDay: number
  newChallengeTitle: string
  themeColor: string
  onConfirm: () => void
  onCancel: () => void
}

export function SwitchChallengeDialog({
  isOpen,
  currentChallengeName,
  currentDay,
  newChallengeTitle,
  themeColor,
  onConfirm,
  onCancel,
}: SwitchChallengeDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  // Focus trap + escape key
  useEffect(() => {
    if (!isOpen) return

    previousFocusRef.current = document.activeElement as HTMLElement

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
        return
      }

      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        )
        const first = focusable[0]
        const last = focusable[focusable.length - 1]

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last?.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first?.focus()
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    // Focus the primary button
    requestAnimationFrame(() => {
      const primary = dialogRef.current?.querySelector<HTMLElement>('[data-primary]')
      primary?.focus()
    })

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previousFocusRef.current?.focus()
    }
  }, [isOpen, onCancel])

  if (!isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Switch challenges"
    >
      <div
        ref={dialogRef}
        className="mx-4 w-full max-w-sm rounded-2xl border border-white/15 bg-hero-mid p-6"
      >
        <h2 className="text-lg font-semibold text-white">Switch Challenges?</h2>
        <p className="mt-3 text-sm text-white/70">
          You&apos;re on Day {currentDay} of {currentChallengeName}. Joining this challenge
          will pause your current one. You can resume it later.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse">
          <button
            type="button"
            data-primary
            onClick={onConfirm}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70"
            style={{ backgroundColor: themeColor }}
          >
            Join {newChallengeTitle}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-white/20 px-6 py-3 text-sm font-medium text-white/70 transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70"
          >
            Keep current challenge
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
