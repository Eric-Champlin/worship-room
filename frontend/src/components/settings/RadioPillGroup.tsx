import { useRef } from 'react'
import { cn } from '@/lib/utils'

interface RadioPillGroupProps {
  label: string
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
}

export function RadioPillGroup({ label, options, value, onChange }: RadioPillGroupProps) {
  const groupRef = useRef<HTMLDivElement>(null)

  function handleKeyDown(e: React.KeyboardEvent, index: number) {
    let nextIndex: number | null = null
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      nextIndex = (index + 1) % options.length
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      nextIndex = (index - 1 + options.length) % options.length
    }

    if (nextIndex !== null) {
      onChange(options[nextIndex].value)
      const buttons = groupRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
      buttons?.[nextIndex]?.focus()
    }
  }

  return (
    <div>
      <p className="text-sm font-medium text-white/80 mb-2">{label}</p>
      <div
        ref={groupRef}
        role="radiogroup"
        aria-label={label}
        className="flex gap-2 flex-wrap"
      >
        {options.map((option, index) => {
          const selected = value === option.value
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(option.value)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium transition-colors min-h-[44px]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark',
                selected
                  ? 'bg-white/15 text-white border border-white/30'
                  : 'bg-white/5 border border-white/15 text-white/60 hover:bg-white/10',
              )}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
