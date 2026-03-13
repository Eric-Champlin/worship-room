import { X } from 'lucide-react'
import { getSoundIcon } from './sound-icon-map'
import { VolumeSlider } from './VolumeSlider'
import type { ActiveSound } from '@/types/audio'

interface MixerSoundRowProps {
  sound: ActiveSound
  iconName: string
  onVolumeChange: (soundId: string, volume: number) => void
  onRemove: (soundId: string) => void
}

export function MixerSoundRow({
  sound,
  iconName,
  onVolumeChange,
  onRemove,
}: MixerSoundRowProps) {
  const Icon = getSoundIcon(iconName)

  return (
    <div role="listitem" className="flex items-center gap-2">
      <Icon size={16} className="shrink-0 text-white/70" aria-hidden="true" />
      <span className="min-w-0 truncate text-sm text-white/90">{sound.label}</span>
      <div className="ml-auto flex-1">
        <VolumeSlider
          value={Math.round(sound.volume * 100)}
          onChange={(v) => onVolumeChange(sound.soundId, v / 100)}
          ariaLabel={`${sound.label} volume`}
        />
      </div>
      <button
        type="button"
        aria-label={`Remove ${sound.label}`}
        onClick={() => onRemove(sound.soundId)}
        className="flex h-11 w-11 shrink-0 items-center justify-center text-white/60 transition-colors hover:text-white"
      >
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  )
}
