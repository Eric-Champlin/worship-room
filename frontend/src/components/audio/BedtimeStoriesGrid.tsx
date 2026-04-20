import { BEDTIME_STORIES } from '@/data/music/bedtime-stories'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { BedtimeStoryCard } from './BedtimeStoryCard'
import type { BedtimeStory } from '@/types/music'

interface BedtimeStoriesGridProps {
  onPlay: (story: BedtimeStory) => void
}

export function BedtimeStoriesGrid({ onPlay }: BedtimeStoriesGridProps) {
  return (
    <section className="space-y-4">
      <SectionHeader>Bedtime Stories</SectionHeader>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {BEDTIME_STORIES.map((story) => (
          <BedtimeStoryCard key={story.id} story={story} onPlay={onPlay} />
        ))}
      </div>
    </section>
  )
}
