import { Play } from 'lucide-react'
import { useTimeOfDayRecommendations } from '@/hooks/useTimeOfDayRecommendations'
import type { ContentRecommendation } from '@/hooks/useTimeOfDayRecommendations'

interface TimeOfDaySectionProps {
  onPlayScene?: (sceneId: string) => void
  onSwitchTab?: (tab: 'playlists' | 'sleep') => void
}

function RecommendationCard({
  item,
  onPlay,
}: {
  item: ContentRecommendation
  onPlay: () => void
}) {
  return (
    <button
      type="button"
      onClick={onPlay}
      className="group min-w-[200px] flex-shrink-0 snap-start overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md sm:min-w-0"
    >
      {item.artworkFilename && (
        <div className="relative aspect-video overflow-hidden">
          <img
            src={`/audio/artwork/${item.artworkFilename}`}
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/80 text-white">
              <Play size={16} fill="currentColor" />
            </div>
          </div>
        </div>
      )}
      <div className="p-3 text-left">
        <p className="text-sm font-semibold text-text-dark">{item.title}</p>
        {item.subtitle && (
          <p className="mt-0.5 line-clamp-1 text-xs text-text-light">
            {item.subtitle}
          </p>
        )}
      </div>
    </button>
  )
}

export function TimeOfDaySection({
  onPlayScene,
  onSwitchTab,
}: TimeOfDaySectionProps) {
  const { heading, items } = useTimeOfDayRecommendations()

  if (items.length === 0) return null

  function handlePlay(item: ContentRecommendation) {
    if (item.type === 'scene' && onPlayScene) {
      onPlayScene(item.id)
    } else if (item.type === 'sleep' && onSwitchTab) {
      onSwitchTab('sleep')
    } else if (item.type === 'playlist' && onSwitchTab) {
      onSwitchTab('playlists')
    }
  }

  return (
    <section
      aria-label="Suggested for this time of day"
      className="mx-auto max-w-6xl px-4 py-6 sm:px-6"
    >
      <h2 className="mb-3 text-lg font-bold text-text-dark sm:text-xl">
        {heading}
      </h2>
      <div className="scrollbar-none flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 sm:overflow-visible lg:grid-cols-4">
        {items.map((item) => (
          <RecommendationCard
            key={item.id}
            item={item}
            onPlay={() => handlePlay(item)}
          />
        ))}
      </div>
    </section>
  )
}
