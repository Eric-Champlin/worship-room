import { Moon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface EveningReflectionBannerProps {
  onReflectNow: () => void
  onDismiss: () => void
  animate?: boolean
}

export function EveningReflectionBanner({ onReflectNow, onDismiss, animate }: EveningReflectionBannerProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-indigo-400/20 bg-indigo-900/30 p-4 md:p-6',
        animate && 'motion-safe:animate-widget-enter',
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-start gap-3 sm:items-center">
          <Moon className="mt-0.5 h-6 w-6 shrink-0 text-indigo-300 sm:mt-0" aria-hidden="true" />
          <div>
            <h3 className="text-lg font-semibold text-white">Evening Reflection</h3>
            <p className="text-sm text-white/70">Take a moment to close your day with God.</p>
          </div>
        </div>
        <div className="flex flex-col items-center gap-2 sm:items-end">
          <button
            type="button"
            onClick={onReflectNow}
            className="w-full rounded-lg bg-primary px-8 py-3 font-semibold text-white transition-colors hover:bg-primary-lt focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-dashboard-dark sm:w-auto"
          >
            Reflect Now
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="min-h-[44px] text-sm text-white/40 transition-colors hover:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/30 focus:rounded"
          >
            Not tonight
          </button>
        </div>
      </div>
    </div>
  )
}
