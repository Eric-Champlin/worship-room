import { cn } from '@/lib/utils'
import { HIGHLIGHT_EMOTIONS } from '@/constants/bible'
import type { HighlightColor } from '@/types/bible'

interface ColorFilterStripProps {
  activeColor: HighlightColor | 'all'
  onColorChange: (color: HighlightColor | 'all') => void
}

export function ColorFilterStrip({ activeColor, onColorChange }: ColorFilterStripProps) {
  return (
    <div className="flex items-center gap-3 overflow-x-auto py-3 scrollbar-hide sm:justify-center sm:overflow-visible">
      {/* All colors chip */}
      <button
        type="button"
        onClick={() => onColorChange('all')}
        className={cn(
          'flex flex-shrink-0 flex-col items-center gap-1 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
        )}
        aria-label="All colors"
        aria-pressed={activeColor === 'all'}
      >
        <div
          className={cn(
            'h-8 w-8 rounded-full',
            'bg-gradient-to-br from-[#7DD3FC] via-[#FDE047] to-[#6EE7B7]',
            activeColor === 'all' && 'ring-2 ring-white/60',
          )}
        />
        <span className="text-xs text-white/60">All</span>
      </button>

      {HIGHLIGHT_EMOTIONS.map((emotion) => (
        <button
          key={emotion.key}
          type="button"
          onClick={() => onColorChange(emotion.key)}
          className="flex flex-shrink-0 flex-col items-center gap-1 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          aria-label={emotion.label}
          aria-pressed={activeColor === emotion.key}
        >
          <div
            className={cn(
              'h-8 w-8 rounded-full',
              activeColor === emotion.key && 'ring-2 ring-white/60',
            )}
            style={{ backgroundColor: emotion.hex }}
          />
          <span className="text-xs text-white/60">{emotion.label}</span>
        </button>
      ))}
    </div>
  )
}
