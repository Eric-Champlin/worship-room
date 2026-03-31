export type TimeRange = 'weekly' | 'allTime'

interface TimeToggleProps {
  activeRange: TimeRange
  onRangeChange: (range: TimeRange) => void
}

const RANGES: { id: TimeRange; label: string }[] = [
  { id: 'weekly', label: 'This Week' },
  { id: 'allTime', label: 'All Time' },
]

export function TimeToggle({ activeRange, onRangeChange }: TimeToggleProps) {
  return (
    <div role="radiogroup" aria-label="Time range" className="flex gap-1">
      {RANGES.map((range) => {
        const isActive = activeRange === range.id
        return (
          <button
            key={range.id}
            role="radio"
            aria-checked={isActive}
            onClick={() => onRangeChange(range.id)}
            className={`min-h-[44px] rounded-full px-3 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70 ${
              isActive
                ? 'bg-white/10 text-white'
                : 'text-white/50 hover:text-white/70'
            }`}
          >
            {range.label}
          </button>
        )
      })}
    </div>
  )
}
