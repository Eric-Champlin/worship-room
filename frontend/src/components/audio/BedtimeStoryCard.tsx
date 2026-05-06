import { Play, Moon } from 'lucide-react'
import { FavoriteButton } from '@/components/music/FavoriteButton'
import type { BedtimeStory } from '@/types/music'

interface BedtimeStoryCardProps {
  story: BedtimeStory
  onPlay: (story: BedtimeStory) => void
}

function formatDuration(seconds: number): string {
  return `${Math.round(seconds / 60)} min`
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function BedtimeStoryCard({ story, onPlay }: BedtimeStoryCardProps) {
  return (
    <div className="relative h-full">
      <button
        type="button"
        aria-label={`Play ${story.title}, ${capitalize(story.lengthCategory)}, ${formatDuration(story.durationSeconds)}, ${story.voiceId} voice`}
        onClick={() => onPlay(story)}
        className="flex h-full w-full cursor-pointer flex-col rounded-xl border border-white/[0.12] bg-white/[0.06] p-4 pr-12 text-left transition-colors hover:border-white/20 hover:shadow-md hover:shadow-black/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt focus-visible:ring-offset-[#0f0a1e]"
      >
        <p className="text-sm font-medium text-white">{story.title}</p>
        <p className="mt-1 line-clamp-2 text-xs text-white/60">{story.description}</p>

        <div className="mt-auto pt-3 flex flex-wrap items-center gap-1">
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-white/70 whitespace-nowrap">
            {formatDuration(story.durationSeconds)}
          </span>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-white/70 whitespace-nowrap">
            {capitalize(story.lengthCategory)}
          </span>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-white/70 whitespace-nowrap">
            {story.voiceId === 'male' ? 'Male' : 'Female'}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/15 px-2 py-0.5 text-xs font-medium text-violet-300 whitespace-nowrap">
            <Moon size={10} aria-hidden="true" />
            Story
          </span>
          <span
            className="ml-auto flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white text-primary shadow-[0_0_12px_rgba(255,255,255,0.12)]"
            aria-hidden="true"
          >
            <Play size={14} fill="currentColor" aria-hidden="true" />
          </span>
        </div>
      </button>
      <FavoriteButton
        type="sleep_session"
        targetId={story.id}
        targetName={story.title}
        className="absolute right-2 top-2 z-10"
      />
    </div>
  )
}
