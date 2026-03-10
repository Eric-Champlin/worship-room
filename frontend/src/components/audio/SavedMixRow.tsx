import { useState } from 'react'
import { MoreVertical } from 'lucide-react'
import { useAudioState, useAudioDispatch, useAudioEngine } from './AudioProvider'
import { useSavedMixes } from '@/hooks/useSavedMixes'
import { useToast } from '@/components/ui/Toast'
import { MixActionsMenu } from '@/components/music/MixActionsMenu'
import { DeleteMixDialog } from '@/components/music/DeleteMixDialog'
import { SOUND_BY_ID } from '@/data/sound-catalog'
import { AUDIO_BASE_URL } from '@/constants/audio'
import { getSoundIcon } from './sound-icon-map'
import type { SavedMix } from '@/types/storage'

const STAGGER_MS = 200

interface SavedMixRowProps {
  mix: SavedMix
  onShare: (mix: SavedMix) => void
}

export function SavedMixRow({ mix, onShare }: SavedMixRowProps) {
  const audioState = useAudioState()
  const dispatch = useAudioDispatch()
  const engine = useAudioEngine()
  const { updateName, deleteMix, duplicateMix } = useSavedMixes()
  const { showToast } = useToast()

  const [menuOpen, setMenuOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(mix.name)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  function handleLoad() {
    // Fade out each current sound individually (crossfade pattern)
    for (const sound of audioState.activeSounds) {
      dispatch({ type: 'REMOVE_SOUND', payload: { soundId: sound.soundId } })
    }

    // Clear scene name since this is a custom mix
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

  function handleEditSubmit() {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== mix.name) {
      updateName(mix.id, trimmed)
    }
    setEditing(false)
  }

  function handleEditKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleEditSubmit()
    } else if (e.key === 'Escape') {
      setEditValue(mix.name)
      setEditing(false)
    }
  }

  function handleDuplicate() {
    duplicateMix(mix.id)
    showToast('Mix duplicated!')
  }

  function handleDeleteConfirm() {
    deleteMix(mix.id)
    showToast('Mix deleted')
    setShowDeleteDialog(false)
  }

  // Collect sound icons for display
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
      <div className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-white/5">
        {/* Mix name or edit input */}
        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleEditKeyDown}
              onBlur={handleEditSubmit}
              maxLength={50}
              aria-label="Edit mix name"
              autoFocus
              className="w-full rounded-md border border-white/20 bg-white/10 px-2 py-1 text-sm text-white focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-lt focus:ring-offset-1 focus:ring-offset-hero-mid"
            />
          ) : (
            <button
              type="button"
              onClick={handleLoad}
              className="w-full truncate text-left text-sm font-medium text-white/90 hover:text-white"
            >
              {mix.name}
            </button>
          )}
        </div>

        {/* Sound icons */}
        <div className="flex items-center gap-1">
          {soundIcons.map(
            (si) =>
              si && (
                <si.Icon
                  key={si.id}
                  size={14}
                  className="text-white/40"
                  aria-hidden="true"
                />
              ),
          )}
          <span className="ml-1 text-xs text-white/30">
            {mix.sounds.length}
          </span>
        </div>

        {/* Three-dot menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={`Actions for ${mix.name}`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="rounded-md p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white/70"
          >
            <MoreVertical size={16} />
          </button>

          {menuOpen && (
            <MixActionsMenu
              mixName={mix.name}
              onLoad={() => {
                handleLoad()
                setMenuOpen(false)
              }}
              onEditName={() => {
                setEditing(true)
                setMenuOpen(false)
              }}
              onDuplicate={() => {
                handleDuplicate()
                setMenuOpen(false)
              }}
              onShare={() => {
                onShare(mix)
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

      {showDeleteDialog && (
        <DeleteMixDialog
          mixName={mix.name}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDeleteDialog(false)}
        />
      )}
    </>
  )
}
