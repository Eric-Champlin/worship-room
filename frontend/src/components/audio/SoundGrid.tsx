import { SOUND_CATEGORIES } from '@/data/sound-catalog'
import { SoundCard } from './SoundCard'
import type { Sound } from '@/types/music'

interface SoundGridProps {
  activeSoundIds: Set<string>
  loadingSoundIds: Set<string>
  errorSoundIds: Set<string>
  onToggle: (sound: Sound) => void
  sounds?: Sound[]
}

export function SoundGrid({
  activeSoundIds,
  loadingSoundIds,
  errorSoundIds,
  onToggle,
  sounds,
}: SoundGridProps) {
  const categories = sounds
    ? SOUND_CATEGORIES.map((g) => ({
        ...g,
        sounds: g.sounds.filter((s) => sounds.some((fs) => fs.id === s.id)),
      })).filter((g) => g.sounds.length > 0)
    : SOUND_CATEGORIES

  return (
    <div className="space-y-8">
      {categories.map((group) => {
        const headerId = `category-${group.category}`
        return (
          <section key={group.category} aria-labelledby={headerId}>
            <h3
              id={headerId}
              className="mb-3 text-base font-medium text-white"
            >
              {group.label}
            </h3>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {group.sounds.map((sound) => (
                <SoundCard
                  key={sound.id}
                  sound={sound}
                  isActive={activeSoundIds.has(sound.id)}
                  isLoading={loadingSoundIds.has(sound.id)}
                  hasError={errorSoundIds.has(sound.id)}
                  onToggle={onToggle}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
