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
    <div className="relative">
      <button
        type="button"
        aria-label={`Play ${story.title}, ${capitalize(story.lengthCategory)}, ${formatDuration(story.durationSeconds)}, ${story.voiceId} voice`}
        onClick={() => onPlay(story)}
        className="w-full cursor-pointer rounded-xl border border-gray-200 bg-white p-4 pr-12 text-left shadow-sm transition-colors hover:border-gray-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt"
      >
        <p className="text-sm font-medium text-text-dark">{story.title}</p>
        <p className="mt-1 line-clamp-2 text-xs text-text-light">{story.description}</p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-text-light">
            {formatDuration(story.durationSeconds)}
          </span>
          <span className="text-xs font-medium text-text-light">
            {capitalize(story.lengthCategory)}
          </span>
          <span className="text-xs text-text-light">
            {story.voiceId === 'male' ? 'Male voice' : 'Female voice'}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700">
            <Moon size={10} aria-hidden="true" />
            Story
          </span>
          <span
            className="ml-auto flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-white"
            aria-hidden="true"
          >
            <Play size={14} fill="currentColor" />
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
