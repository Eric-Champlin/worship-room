import { useMemo } from 'react'
import { SOUND_CATEGORIES } from '@/data/sound-catalog'
import { ScrollRow } from '@/components/ui/ScrollRow'
import { SectionHeader } from '@/components/ui/SectionHeader'
import {
  SOUND_CATEGORY_COLORS,
  SOUND_CATEGORY_LABELS,
} from '@/constants/soundCategoryColors'
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
  const categories = useMemo(
    () =>
      sounds
        ? SOUND_CATEGORIES.map((g) => ({
            ...g,
            sounds: g.sounds.filter((s) => sounds.some((fs) => fs.id === s.id)),
          })).filter((g) => g.sounds.length > 0)
        : SOUND_CATEGORIES,
    [sounds],
  )

  return (
    <div className="space-y-8">
      {categories.map((group) => {
        const tokens = SOUND_CATEGORY_COLORS[group.category]
        if (!tokens) return null
        const label = SOUND_CATEGORY_LABELS[group.category]
        const headerId = `category-${group.category}`
        return (
          <section key={group.category} aria-labelledby={headerId}>
            <SectionHeader as="h3" id={headerId}>
              {label}
            </SectionHeader>
            <ScrollRow ariaLabel={label} itemCount={group.sounds.length}>
              {group.sounds.map((sound) => (
                <SoundCard
                  key={sound.id}
                  sound={sound}
                  categoryTokens={tokens}
                  isActive={activeSoundIds.has(sound.id)}
                  isLoading={loadingSoundIds.has(sound.id)}
                  hasError={errorSoundIds.has(sound.id)}
                  onToggle={onToggle}
                />
              ))}
            </ScrollRow>
          </section>
        )
      })}
    </div>
  )
}
