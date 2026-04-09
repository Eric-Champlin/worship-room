import { HIGHLIGHT_EMOTIONS } from '@/constants/bible'
import type { HighlightData } from '@/types/my-bible'

interface HighlightCardProps {
  data: HighlightData
  verseText: string | null
}

export function HighlightCard({ data, verseText }: HighlightCardProps) {
  const emotion = HIGHLIGHT_EMOTIONS.find((e) => e.key === data.color)
  const hex = emotion?.hex ?? '#FDE047'
  const label = emotion?.label ?? data.color

  return (
    <div className="mt-2 space-y-2">
      {verseText ? (
        <p
          className="rounded-lg px-3 py-2 text-sm text-white"
          style={{ backgroundColor: `${hex}15` }}
        >
          {verseText}
        </p>
      ) : (
        <div className="h-4 w-3/4 animate-pulse rounded bg-white/10" />
      )}
      <span
        className="inline-block rounded-full px-2 py-0.5 text-xs font-medium"
        style={{ color: hex, backgroundColor: `${hex}20` }}
      >
        {label}
      </span>
    </div>
  )
}
