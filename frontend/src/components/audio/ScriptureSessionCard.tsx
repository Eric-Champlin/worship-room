import { Play, BookOpen } from 'lucide-react'
import { FavoriteButton } from '@/components/music/FavoriteButton'
import type { ScriptureReading } from '@/types/music'

interface ScriptureSessionCardProps {
  reading: ScriptureReading
  onPlay: (reading: ScriptureReading) => void
}

function formatDuration(seconds: number): string {
  return `${Math.round(seconds / 60)} min`
}

export function ScriptureSessionCard({ reading, onPlay }: ScriptureSessionCardProps) {
  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`Play ${reading.scriptureReference}: ${reading.title}, ${formatDuration(reading.durationSeconds)}, ${reading.voiceId} voice`}
        onClick={() => onPlay(reading)}
        className="w-full min-w-[220px] shrink-0 snap-start cursor-pointer rounded-xl border border-white/10 bg-gradient-to-br from-hero-mid/50 to-primary/10 p-4 pr-12 text-left transition-colors hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt"
      >
        <p className="text-sm font-medium text-white">{reading.title}</p>
        <p className="mt-0.5 text-xs text-white/60">{reading.scriptureReference}</p>

        <div className="mt-3 flex items-center gap-2">
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/70">
            {formatDuration(reading.durationSeconds)}
          </span>
          <span className="text-xs text-white/50">
            {reading.voiceId === 'male' ? 'Male voice' : 'Female voice'}
          </span>
          <span className="flex items-center gap-1 rounded-full bg-primary/20 px-2 py-0.5 text-xs text-primary-lt">
            <BookOpen size={10} aria-hidden="true" />
            Scripture
          </span>
          <span
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white"
            aria-hidden="true"
          >
            <Play size={14} fill="currentColor" />
          </span>
        </div>
      </button>
      <FavoriteButton
        type="sleep_session"
        targetId={reading.id}
        targetName={reading.title}
        className="absolute right-2 top-2 z-10"
      />
    </div>
  )
}
