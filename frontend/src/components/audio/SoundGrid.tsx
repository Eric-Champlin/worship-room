import { useState, useRef, useCallback, useMemo } from 'react'
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

  // Flatten all sounds across categories for linear keyboard navigation
  const allSounds = useMemo(
    () => categories.flatMap((g) => g.sounds),
    [categories],
  )

  const [focusedIndex, setFocusedIndex] = useState(0)
  const gridRef = useRef<HTMLDivElement>(null)

  const focusSound = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(index, allSounds.length - 1))
      setFocusedIndex(clamped)
      const btn = gridRef.current?.querySelector<HTMLElement>(
        `[data-sound-id="${allSounds[clamped].id}"]`,
      )
      btn?.focus()
    },
    [allSounds],
  )

  function handleKeyDown(e: React.KeyboardEvent) {
    // Estimate columns from viewport: 3 mobile, 4 sm, 6 lg
    const w = window.innerWidth
    const cols = w >= 1024 ? 6 : w >= 640 ? 4 : 3

    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault()
        focusSound(focusedIndex + 1)
        break
      case 'ArrowLeft':
        e.preventDefault()
        focusSound(focusedIndex - 1)
        break
      case 'ArrowDown':
        e.preventDefault()
        focusSound(focusedIndex + cols)
        break
      case 'ArrowUp':
        e.preventDefault()
        focusSound(focusedIndex - cols)
        break
      case 'Home':
        e.preventDefault()
        focusSound(0)
        break
      case 'End':
        e.preventDefault()
        focusSound(allSounds.length - 1)
        break
    }
  }

  // Build a lookup of flat index by sound id
  const soundIndexMap = useMemo(() => {
    const map = new Map<string, number>()
    allSounds.forEach((s, i) => map.set(s.id, i))
    return map
  }, [allSounds])

  return (
    <div ref={gridRef} className="space-y-8" onKeyDown={handleKeyDown}>
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
            <div
              role="group"
              aria-label={group.label}
              className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6"
            >
              {group.sounds.map((sound) => {
                const flatIndex = soundIndexMap.get(sound.id) ?? 0
                return (
                  <SoundCard
                    key={sound.id}
                    sound={sound}
                    isActive={activeSoundIds.has(sound.id)}
                    isLoading={loadingSoundIds.has(sound.id)}
                    hasError={errorSoundIds.has(sound.id)}
                    onToggle={onToggle}
                    tabIndex={flatIndex === focusedIndex ? 0 : -1}
                  />
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
