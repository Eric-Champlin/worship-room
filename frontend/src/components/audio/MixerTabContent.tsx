import { MousePointerClick, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAudioState, useAudioDispatch } from './AudioProvider'
import { useAuth } from '@/hooks/useAuth'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import { SOUND_BY_ID } from '@/data/sound-catalog'
import { MixerSoundRow } from './MixerSoundRow'

export function MixerTabContent() {
  const { activeSounds } = useAudioState()
  const dispatch = useAudioDispatch()
  const { isAuthenticated } = useAuth()
  const authModal = useAuthModal()
  const navigate = useNavigate()

  function handleVolumeChange(soundId: string, volume: number) {
    dispatch({ type: 'SET_SOUND_VOLUME', payload: { soundId, volume } })
  }

  function handleRemove(soundId: string) {
    dispatch({ type: 'REMOVE_SOUND', payload: { soundId } })
  }

  function handleAddSoundClick() {
    if (!isAuthenticated) {
      authModal?.openAuthModal('Sign in to play ambient sounds')
      return
    }
    navigate('/music/ambient')
  }

  if (activeSounds.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center" role="status">
        <MousePointerClick className="text-white/30" size={32} aria-hidden="true" />
        <p className="text-sm text-white/60">
          Tap a sound on the Ambient Sounds page to start your mix
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div role="list" aria-label="Active sounds">
      {activeSounds.map((sound) => {
        const catalogEntry = SOUND_BY_ID.get(sound.soundId)
        return (
          <MixerSoundRow
            key={sound.soundId}
            sound={sound}
            iconName={catalogEntry?.lucideIcon ?? 'Music'}
            onVolumeChange={handleVolumeChange}
            onRemove={handleRemove}
          />
        )
      })}
      </div>
      <button
        type="button"
        className="mt-4 flex items-center gap-2 rounded text-sm text-primary-lt transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt"
        onClick={handleAddSoundClick}
      >
        <Plus size={16} aria-hidden="true" /> Add Sound
      </button>
    </div>
  )
}
