import { Play } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ScenePreset } from '@/types/music'

interface FeaturedSceneCardProps {
  scene: ScenePreset
  isActive: boolean
  onPlay: (scene: ScenePreset) => void
}

export function FeaturedSceneCard({ scene, isActive, onPlay }: FeaturedSceneCardProps) {
  return (
    <button
      type="button"
      aria-label={`Play ${scene.name} — ${scene.description}`}
      onClick={() => onPlay(scene)}
      className={cn(
        'group relative aspect-video w-full min-w-[280px] flex-shrink-0 snap-start overflow-hidden rounded-xl sm:min-w-[340px]',
        isActive && 'ring-2 ring-primary/60',
      )}
    >
      <img
        src={`/audio/artwork/${scene.artworkFilename}`}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-white sm:text-xl">{scene.name}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-white/70">{scene.description}</p>
      </div>
      <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/80 text-white">
          <Play size={20} />
        </div>
      </div>
    </button>
  )
}
