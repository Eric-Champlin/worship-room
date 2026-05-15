import { useEffect, useRef } from 'react'
import { FrostedCard } from '@/components/homepage/FrostedCard'
import { Button } from '@/components/ui/Button'
import { timeAgo } from '@/lib/time'

export interface RestoreDraftPromptProps {
  /** Timestamp (ms) when the draft was last updated. Drives the relative label. */
  draftTimestamp: number
  /** Called when the user taps "Restore draft". Caller is responsible for
   *  applying the draft content to its own state. */
  onRestore: () => void
  /** Called when the user taps "Start fresh". Caller is responsible for
   *  discarding the draft from storage. */
  onDiscard: () => void
}

export function RestoreDraftPrompt({
  draftTimestamp,
  onRestore,
  onDiscard,
}: RestoreDraftPromptProps) {
  const restoreButtonRef = useRef<HTMLButtonElement>(null)

  // Move focus to the primary button when the prompt appears so keyboard
  // users land on the recommended action. NOT a focus trap — the prompt is
  // a status announcement, not a modal.
  //
  // Deferred via requestAnimationFrame so the focus call wins the race
  // against a closing modal's `useFocusTrap` cleanup. When the prompt
  // mounts because the user picked a post type from ComposerChooser, that
  // chooser's `useFocusTrap` (frontend/src/hooks/useFocusTrap.ts) restores
  // focus to its trigger button ("Share something") on close — a passive
  // effect cleanup that can fire after our synchronous focus() call and
  // override us. Waiting one frame lets the chooser settle before we focus.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      restoreButtonRef.current?.focus()
    })
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-3 motion-safe:animate-fade-in"
    >
      <FrostedCard variant="default" as="div" className="p-4">
        <p className="text-sm text-white/80">
          You have a saved draft from{' '}
          {timeAgo(new Date(draftTimestamp).toISOString())}. Restore it?
        </p>
        <div className="mt-3 flex items-center gap-2">
          <Button
            ref={restoreButtonRef}
            type="button"
            variant="gradient"
            size="sm"
            onClick={onRestore}
            className="min-h-[44px]"
          >
            Restore draft
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onDiscard}
            className="min-h-[44px]"
          >
            Start fresh
          </Button>
        </div>
      </FrostedCard>
    </div>
  )
}
