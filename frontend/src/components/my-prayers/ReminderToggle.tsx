import { useId } from 'react'
import { cn } from '@/lib/utils'

interface ReminderToggleProps {
  enabled: boolean
  time: string
  onToggle: (enabled: boolean) => void
  onTimeChange: (time: string) => void
}

export function ReminderToggle({
  enabled,
  time,
  onToggle,
  onTimeChange,
}: ReminderToggleProps) {
  const tooltipId = useId()

  return (
    <div className="mb-3">
      <div className="flex min-h-[44px] items-center gap-2">
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Remind me"
          onClick={() => onToggle(!enabled)}
          className={cn(
            'relative inline-flex h-[22px] w-10 min-w-[40px] shrink-0 cursor-pointer items-center rounded-full transition-colors',
            enabled ? 'bg-primary' : 'bg-white/20',
          )}
        >
          <span
            className={cn(
              'inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform motion-reduce:transition-none',
              enabled ? 'translate-x-5' : 'translate-x-0.5',
            )}
          />
        </button>
        <span className="text-sm text-white/70">Remind me</span>
      </div>

      {enabled && (
        <div className="mt-2 flex items-center gap-2">
          <input
            type="time"
            value={time}
            onChange={(e) => onTimeChange(e.target.value)}
            className="rounded border border-white/15 bg-white/5 px-2 py-1 text-sm text-white"
            aria-label="Reminder time"
            aria-describedby={tooltipId}
          />
          <span
            id={tooltipId}
            className="cursor-help text-xs text-white/60"
            title="Push notification timing coming soon. For now, you'll see reminders when you open the app."
          >
            ?
          </span>
        </div>
      )}
    </div>
  )
}
