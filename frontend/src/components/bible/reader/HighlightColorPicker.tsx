import { X } from 'lucide-react'
import { HIGHLIGHT_EMOTIONS } from '@/constants/bible'
import type { HighlightColor } from '@/types/bible'
import type { VerseSelection } from '@/types/verse-actions'

interface HighlightColorPickerProps {
  selection: VerseSelection
  onBack: () => void
  onApply: (color: HighlightColor) => void
  onRemove: () => void
  currentColor: HighlightColor | null
  isMixedSelection: boolean
}

export function HighlightColorPicker({
  onApply,
  onRemove,
  currentColor,
  isMixedSelection,
}: HighlightColorPickerProps) {
  const showRemove = currentColor !== null && !isMixedSelection

  return (
    <div
      role="radiogroup"
      aria-label="Highlight color"
      className="flex items-start justify-center gap-3 px-4 py-6 sm:gap-4 sm:py-8"
    >
      {HIGHLIGHT_EMOTIONS.map((emotion) => {
        const isSelected = !isMixedSelection && currentColor === emotion.key
        return (
          <button
            key={emotion.key}
            type="button"
            aria-pressed={isSelected}
            aria-label={`${emotion.label} highlight`}
            onClick={() => onApply(emotion.key)}
            className="flex min-h-[44px] min-w-[44px] flex-col items-center gap-2"
          >
            <span
              className={`h-14 w-14 flex-shrink-0 rounded-full sm:h-16 sm:w-16 ${
                isSelected ? 'ring-2 ring-offset-2' : ''
              }`}
              style={{
                backgroundColor: `var(--highlight-${emotion.key})`,
                ...(isSelected
                  ? { '--tw-ring-color': `var(--highlight-${emotion.key})`, '--tw-ring-offset-color': 'rgb(15, 10, 30)' } as React.CSSProperties
                  : {}),
              }}
            />
            <span className="text-xs text-white/60">{emotion.label}</span>
          </button>
        )
      })}

      {showRemove && (
        <button
          type="button"
          aria-label="Remove highlight"
          onClick={onRemove}
          className="flex min-h-[44px] min-w-[44px] flex-col items-center gap-2"
        >
          <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full border border-white/20 sm:h-16 sm:w-16">
            <X className="h-6 w-6 text-white/60" />
          </span>
          <span className="text-xs text-white/60">Remove</span>
        </button>
      )}
    </div>
  )
}
