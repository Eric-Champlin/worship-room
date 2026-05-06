import { useState } from 'react'
import { Play, MoreVertical } from 'lucide-react'
import { useAudioDispatch, useAudioState, useAudioEngine } from '@/components/audio/AudioProvider'
import { useSavedMixes } from '@/hooks/useSavedMixes'
import { useToast } from '@/components/ui/Toast'
import { FavoriteButton } from '@/components/music/FavoriteButton'
import { MixActionsMenu } from '@/components/music/MixActionsMenu'
import { DeleteMixDialog } from '@/components/music/DeleteMixDialog'
import { getSoundIcon } from '@/components/audio/sound-icon-map'
import { SOUND_BY_ID } from '@/data/sound-catalog'
import { AUDIO_BASE_URL } from '@/constants/audio'
import type { SavedMix } from '@/types/storage'

const STAGGER_MS = 200

interface SavedMixCardProps {
  mix: SavedMix
  onShare?: (mix: SavedMix) => void
}

export function SavedMixCard({ mix, onShare }: SavedMixCardProps) {
  const audioState = useAudioState()
  const dispatch = useAudioDispatch()
  const engine = useAudioEngine()
  const { updateName, deleteMix, duplicateMix } = useSavedMixes()
  const { showToast } = useToast()

  const [menuOpen, setMenuOpen] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(mix.name)

  function handlePlay() {
    // Crossfade: remove current sounds individually
    for (const sound of audioState.activeSounds) {
      dispatch({ type: 'REMOVE_SOUND', payload: { soundId: sound.soundId } })
    }

    dispatch({ type: 'SET_SCENE_NAME', payload: { sceneName: null, sceneId: null } })

    // Stagger-add saved mix sounds
    mix.sounds.forEach((s, index) => {
      const catalogSound = SOUND_BY_ID.get(s.soundId)
      if (!catalogSound) return

      setTimeout(() => {
        const url = AUDIO_BASE_URL + catalogSound.filename
        engine?.addSound(s.soundId, url, s.volume)
        dispatch({
          type: 'ADD_SOUND',
          payload: {
            soundId: s.soundId,
            volume: s.volume,
            label: catalogSound.name,
            url,
          },
        })
      }, index * STAGGER_MS)
    })
  }

  const soundIcons = mix.sounds
    .slice(0, 4)
    .map((s) => {
      const sound = SOUND_BY_ID.get(s.soundId)
      if (!sound) return null
      const Icon = getSoundIcon(sound.lucideIcon)
      return { id: s.soundId, Icon, name: sound.name }
    })
    .filter(Boolean)

  return (
    <>
      <div className="group relative rounded-xl border border-white/[0.12] bg-white/[0.06] p-4 transition-shadow motion-reduce:transition-none hover:shadow-md hover:shadow-black/20">
        {/* Favorite button */}
        <FavoriteButton
          type="custom_mix"
          targetId={mix.id}
          targetName={mix.name}
          className="absolute right-2 top-2"
        />

        {/* Mix name */}
        {editing ? (
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                const trimmed = editValue.trim()
                if (trimmed && trimmed !== mix.name) updateName(mix.id, trimmed)
                setEditing(false)
              }
              if (e.key === 'Escape') {
                setEditValue(mix.name)
                setEditing(false)
              }
            }}
            onBlur={() => {
              const trimmed = editValue.trim()
              if (trimmed && trimmed !== mix.name) updateName(mix.id, trimmed)
              setEditing(false)
            }}
            maxLength={50}
            aria-label="Edit mix name"
            autoFocus
            className="w-full rounded-md bg-white/[0.06] border border-white/10 px-2 py-1 pr-10 text-sm text-white focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-lt"
          />
        ) : (
          <h3 className="pr-10 text-sm font-semibold text-white">
            {mix.name}
          </h3>
        )}

        {/* Sound icons */}
        <div className="mt-2 flex items-center gap-1.5">
          {soundIcons.map(
            (si) =>
              si && (
                <si.Icon
                  key={si.id}
                  size={14}
                  className="text-white/50"
                  aria-hidden="true"
                />
              ),
          )}
          <span className="text-xs text-white/50">
            {mix.sounds.length} sounds
          </span>
        </div>

        {/* Actions row */}
        <div className="mt-3 flex items-center justify-between">
          <button
            type="button"
            onClick={handlePlay}
            aria-label={`Play ${mix.name}`}
            className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-violet-300 transition-colors hover:bg-primary/20 hover:text-violet-200"
          >
            <Play size={12} fill="currentColor" aria-hidden="true" />
            Play
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={`Actions for ${mix.name}`}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-white/50 transition-colors hover:bg-white/10 hover:text-white"
            >
              <MoreVertical size={16} />
            </button>

            {menuOpen && (
              <MixActionsMenu
                mixName={mix.name}
                onLoad={() => {
                  handlePlay()
                  setMenuOpen(false)
                }}
                onEditName={() => {
                  setEditing(true)
                  setMenuOpen(false)
                }}
                onDuplicate={() => {
                  duplicateMix(mix.id)
                  showToast('Mix duplicated.')
                  setMenuOpen(false)
                }}
                onShare={() => {
                  onShare?.(mix)
                  setMenuOpen(false)
                }}
                onDelete={() => {
                  setShowDeleteDialog(true)
                  setMenuOpen(false)
                }}
                onClose={() => setMenuOpen(false)}
              />
            )}
          </div>
        </div>
      </div>

      {showDeleteDialog && (
        <DeleteMixDialog
          mixName={mix.name}
          onConfirm={() => {
            deleteMix(mix.id)
            showToast('Mix removed.')
            setShowDeleteDialog(false)
          }}
          onCancel={() => setShowDeleteDialog(false)}
        />
      )}
    </>
  )
}
