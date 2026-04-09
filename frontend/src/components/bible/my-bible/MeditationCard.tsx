import { HighlightedText } from './HighlightedText'
import type { MeditationData } from '@/types/my-bible'

interface MeditationCardProps {
  data: MeditationData
  verseText: string | null
  searchQuery?: string
}

export function MeditationCard({ data, verseText, searchQuery }: MeditationCardProps) {
  return (
    <div className="mt-2 space-y-1">
      {verseText ? (
        <p className="text-sm text-white/60">
          <HighlightedText text={verseText} query={searchQuery ?? ''} />
        </p>
      ) : (
        <div className="h-4 w-3/4 animate-pulse rounded bg-white/10" />
      )}
      <p className="text-xs text-white/50">
        You meditated on this verse &middot; {data.durationMinutes} min
      </p>
    </div>
  )
}
