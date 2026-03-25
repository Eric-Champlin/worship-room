import { cn } from '@/lib/utils'

interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: string
  id: string
}

export function ToggleSwitch({ checked, onChange, label, description, id }: ToggleSwitchProps) {
  const labelId = `${id}-label`
  const descId = description ? `${id}-desc` : undefined

  return (
    <div className="flex items-start justify-between gap-4 min-h-[44px]">
      <div className="min-w-0 flex-1">
        <span id={labelId} className="text-sm font-medium text-white">
          {label}
        </span>
        {description && (
          <p id={descId} className="mt-0.5 text-xs text-white/40">
            {description}
          </p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        aria-describedby={descId}
        onClick={() => onChange(!checked)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            onChange(!checked)
          }
        }}
        className={cn(
          'relative inline-flex h-6 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors self-center p-0',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark',
          checked ? 'bg-primary' : 'bg-white/20',
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-150 motion-reduce:transition-none',
            checked ? 'translate-x-[26px]' : 'translate-x-[2px]',
          )}
        />
      </button>
    </div>
  )
}
