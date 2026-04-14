import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getSoundIcon } from './sound-icon-map'
import type { Sound } from '@/types/music'

interface SoundCardProps {
  sound: Sound
  isActive: boolean
  isLoading: boolean
  hasError: boolean
  onToggle: (sound: Sound) => void
  tabIndex?: number
}

function getAriaLabel(sound: Sound, isActive: boolean, isLoading: boolean, hasError: boolean): string {
  if (isLoading) return `Loading ${sound.name}`
  if (hasError) return `Couldn't load ${sound.name} — tap to retry`
  if (isActive) return `${sound.name} — playing, tap to remove`
  return `${sound.name} — tap to add to mix`
}

export function SoundCard({ sound, isActive, isLoading, hasError, onToggle, tabIndex }: SoundCardProps) {
  const Icon = getSoundIcon(sound.lucideIcon)

  return (
    <button
      type="button"
      aria-pressed={isActive}
      aria-busy={isLoading}
      aria-label={getAriaLabel(sound, isActive, isLoading, hasError)}
      tabIndex={tabIndex}
      data-sound-id={sound.id}
      onClick={() => onToggle(sound)}
      className={cn(
        'relative flex w-20 h-20 sm:w-[90px] sm:h-[90px] flex-col items-center justify-center gap-1 rounded-xl bg-white/[0.06] transition-shadow motion-reduce:transition-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0a1e]',
        isActive && 'shadow-[0_0_12px_rgba(147,51,234,0.4)] motion-safe:animate-sound-pulse',
      )}
    >
      {/* Error dot */}
      {hasError && !isLoading && (
        <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-warning" />
      )}

      {/* Icon area */}
      <div className="relative flex items-center justify-center">
        <Icon
          size={24}
          aria-hidden="true"
          className={cn(
            'transition-colors',
            isActive ? 'text-primary' : 'text-white/50',
          )}
        />
        {isLoading && (
          <Loader2
            size={20}
            aria-hidden="true"
            className="absolute motion-safe:animate-spin text-white/40"
          />
        )}
      </div>

      {/* Sound name */}
      <span className="mt-0.5 line-clamp-2 text-center text-xs leading-tight text-white/80">
        {sound.name}
      </span>
    </button>
  )
}
