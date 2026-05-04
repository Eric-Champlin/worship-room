import { Moon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { FrostedCard } from '@/components/homepage/FrostedCard'
import { cn } from '@/lib/utils'

export interface EveningReflectionBannerProps {
  onReflectNow: () => void
  onDismiss: () => void
  animate?: boolean
}

export function EveningReflectionBanner({ onReflectNow, onDismiss, animate }: EveningReflectionBannerProps) {
  return (
    <FrostedCard
      variant="default"
      as="section"
      className={cn(animate && 'motion-safe:animate-widget-enter')}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-start gap-3 sm:items-center">
          <Moon className="mt-0.5 h-6 w-6 shrink-0 text-violet-300 sm:mt-0" aria-hidden="true" />
          <div>
            <h3 className="text-lg font-semibold text-white">Evening Reflection</h3>
            <p className="text-sm text-white/70">Take a moment to close your day with God.</p>
          </div>
        </div>
        <div className="flex flex-col items-center gap-2 sm:items-end">
          <Button
            variant="subtle"
            size="md"
            onClick={onReflectNow}
            className="w-full sm:w-auto"
          >
            Reflect Now
          </Button>
          <button
            type="button"
            onClick={onDismiss}
            className="min-h-[44px] text-sm text-white/50 transition-colors hover:text-white/70 focus:outline-none focus:ring-2 focus:ring-white/30 focus:rounded"
          >
            Not tonight
          </button>
        </div>
      </div>
    </FrostedCard>
  )
}
