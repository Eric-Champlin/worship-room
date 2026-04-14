import { X } from 'lucide-react'

interface ActivePlanReaderBannerProps {
  planTitle: string
  currentDay: number
  isDayCompleted: boolean
  onMarkComplete: () => void
  onDismiss: () => void
  chromeOpacity: number
  chromePointerEvents: 'auto' | 'none'
  chromeTransitionMs: number
}

export function ActivePlanReaderBanner({
  planTitle,
  currentDay,
  isDayCompleted,
  onMarkComplete,
  onDismiss,
  chromeOpacity,
  chromePointerEvents,
  chromeTransitionMs,
}: ActivePlanReaderBannerProps) {
  return (
    <div
      className="mx-auto max-w-2xl px-5 sm:px-6"
      style={{
        opacity: chromeOpacity,
        pointerEvents: chromePointerEvents,
        transition: `opacity ${chromeTransitionMs}ms ease`,
      }}
    >
      <div
        className="flex items-center justify-between gap-3 rounded-xl px-4 py-3"
        style={{
          background: 'rgba(15, 10, 30, 0.95)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white">
            Day {currentDay} of {planTitle}
          </p>
          <p className="text-sm text-white/60">You&apos;re reading today&apos;s passage</p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {!isDayCompleted && (
            <button
              onClick={onMarkComplete}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-primary hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark"
            >
              Mark day complete
            </button>
          )}

          <button
            onClick={onDismiss}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Dismiss plan banner"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
