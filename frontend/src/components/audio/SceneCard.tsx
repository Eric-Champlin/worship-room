import { Play } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatTagValue } from '@/lib/format-tag'
import { FavoriteButton } from '@/components/music/FavoriteButton'
import { getSceneBackground } from '@/data/scene-backgrounds'
import type { ScenePreset } from '@/types/music'

interface SceneCardProps {
  scene: ScenePreset
  isActive: boolean
  onPlay: (scene: ScenePreset) => void
}

export function SceneCard({ scene, isActive, onPlay }: SceneCardProps) {
  // Show first mood tag + first activity tag
  const tagChips = [
    scene.tags.mood[0],
    scene.tags.activity[0],
  ].filter(Boolean)

  const bgStyle = getSceneBackground(scene.id)

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`Play ${scene.name} — ${scene.description}`}
        onClick={() => onPlay(scene)}
        style={bgStyle}
        className={cn(
          'group relative aspect-square w-full cursor-pointer overflow-hidden rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt',
          isActive && 'ring-2 ring-primary/60',
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="text-sm font-semibold text-white">{scene.name}</h3>
          <div className="mt-1 flex flex-wrap gap-1">
            {tagChips.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/60"
              >
                {formatTagValue(tag)}
              </span>
            ))}
          </div>
        </div>
        <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/80 text-white">
            <Play size={20} />
          </div>
        </div>
      </button>
      <FavoriteButton
        type="scene"
        targetId={scene.id}
        targetName={scene.name}
        className="absolute right-2 top-2 z-10"
      />
    </div>
  )
}
