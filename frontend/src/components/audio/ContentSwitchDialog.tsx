import { useFocusTrap } from '@/hooks/useFocusTrap'

interface ContentSwitchDialogProps {
  currentTitle: string
  remainingTime: number
  newTitle: string
  onSwitch: () => void
  onKeepListening: () => void
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function ContentSwitchDialog({
  currentTitle,
  remainingTime,
  newTitle,
  onSwitch,
  onKeepListening,
}: ContentSwitchDialogProps) {
  const containerRef = useFocusTrap(true, onKeepListening)

  return (
    <div className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/40">
      <div
        ref={containerRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="content-switch-title"
        className="mx-4 max-w-sm rounded-xl border border-white/10 p-6"
        style={{
          background: 'rgba(15, 10, 30, 0.95)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        <p id="content-switch-title" className="mb-6 text-sm leading-relaxed text-white/80">
          You&apos;re listening to{' '}
          <span className="font-semibold text-white">{currentTitle}</span> (
          {formatTime(remainingTime)} remaining). Start{' '}
          <span className="font-semibold text-white">{newTitle}</span> instead?
        </p>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={onSwitch}
            className="rounded-lg bg-primary px-8 py-3 font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt"
          >
            Switch
          </button>
          <button
            type="button"
            onClick={onKeepListening}
            className="rounded-lg border border-white/30 bg-white/10 px-8 py-3 font-medium text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt"
          >
            Keep Listening
          </button>
        </div>
      </div>
    </div>
  )
}
