import { X, Play } from 'lucide-react'
import { FavoriteButton } from './FavoriteButton'
import { getSoundIcon } from '@/components/audio/sound-icon-map'
import { SOUND_BY_ID } from '@/data/sound-catalog'
import type { SharedMixData } from '@/types/storage'

interface SharedMixHeroProps {
  mixData: SharedMixData
  onPlay: () => void
  onDismiss: () => void
}

export function SharedMixHero({
  mixData,
  onPlay,
  onDismiss,
}: SharedMixHeroProps) {
  // Look up sound names for display
  const soundItems = mixData.sounds
    .map((s) => {
      const sound = SOUND_BY_ID.get(s.id)
      if (!sound) return null
      const Icon = getSoundIcon(sound.lucideIcon)
      return { id: s.id, name: sound.name, volume: s.v, Icon }
    })
    .filter(Boolean)

  const mixName = soundItems
    .slice(0, 3)
    .map((s) => s!.name)
    .join(' + ')

  // Generate a stable ID for favorites from the encoded data
  const mixId = mixData.sounds.map((s) => `${s.id}:${s.v}`).join('|')

  return (
    <section
      aria-labelledby="shared-mix-title"
      className="relative overflow-hidden"
      style={{
        background:
          'radial-gradient(100% 80% at 50% 0%, #3B0764 0%, transparent 60%), linear-gradient(#0D0620 0%, #1E0B3E 30%, #4A1D96 55%, #F5F5F5 100%)',
      }}
    >
      <div className="mx-auto max-w-2xl px-4 py-10 text-center sm:py-14">
        {/* Dismiss button */}
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss shared mix"
          className="absolute right-4 top-4 rounded-full p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70"
        >
          <X size={20} />
        </button>

        {/* Mix name */}
        <h2 id="shared-mix-title" className="text-xl font-bold text-white sm:text-2xl">
          {mixName}
        </h2>

        {/* Sound list */}
        <div className="mx-auto mt-6 flex flex-wrap justify-center gap-3">
          {soundItems.map(
            (s) =>
              s && (
                <div
                  key={s.id}
                  className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5"
                >
                  <s.Icon size={14} className="text-white/60" aria-hidden="true" />
                  <span className="text-sm text-white/80">{s.name}</span>
                  <div className="h-1.5 w-12 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-primary-lt"
                      style={{ width: `${Math.round(s.volume * 100)}%` }}
                    />
                  </div>
                </div>
              ),
          )}
        </div>

        {/* Favorite button */}
        <div className="mt-4 flex justify-center">
          <FavoriteButton
            type="custom_mix"
            targetId={mixId}
            targetName={mixName}
          />
        </div>

        {/* Play button */}
        <button
          type="button"
          onClick={onPlay}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-4 text-lg font-semibold text-white transition-colors hover:bg-primary-lt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70"
        >
          <Play size={20} fill="currentColor" />
          Play This Mix
        </button>
      </div>
    </section>
  )
}
