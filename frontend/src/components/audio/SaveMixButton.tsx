import { useState, useRef, useEffect } from 'react'
import { Save } from 'lucide-react'
import { useAudioState } from './AudioProvider'
import { useAuth } from '@/hooks/useAuth'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import { useSavedMixes } from '@/hooks/useSavedMixes'
import { useToast } from '@/components/ui/Toast'
import { SCENE_PRESETS } from '@/data/scenes'
import { SOUND_BY_ID } from '@/data/sound-catalog'

function isMixModified(
  activeSounds: { soundId: string; volume: number }[],
  sceneName: string | null,
): boolean {
  if (!sceneName) return true // No scene → custom mix → always saveable

  const scene = SCENE_PRESETS.find((s) => s.name === sceneName)
  if (!scene) return true

  if (activeSounds.length !== scene.sounds.length) return true

  const sceneMap = new Map(scene.sounds.map((s) => [s.soundId, s.volume]))
  return activeSounds.some(
    (s) => !sceneMap.has(s.soundId) || sceneMap.get(s.soundId) !== s.volume,
  )
}

function getSuggestedName(
  sceneName: string | null,
  activeSounds: { soundId: string; volume: number }[],
): string {
  if (sceneName) return `${sceneName} Custom`

  return activeSounds
    .slice(0, 3)
    .map((s) => SOUND_BY_ID.get(s.soundId)?.name ?? s.soundId)
    .join(' + ')
}

export function SaveMixButton() {
  const state = useAudioState()
  const { isAuthenticated } = useAuth()
  const authModal = useAuthModal()
  const { saveMix } = useSavedMixes()
  const { showToast } = useToast()

  const [showInput, setShowInput] = useState(false)
  const [name, setName] = useState('')
  const [announcement, setAnnouncement] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const announcementTimerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => () => clearTimeout(announcementTimerRef.current), [])

  const hasActiveSounds = state.activeSounds.length > 0
  const modified = isMixModified(state.activeSounds, state.currentSceneName)
  const visible = hasActiveSounds && modified

  useEffect(() => {
    if (showInput) {
      inputRef.current?.focus()
    }
  }, [showInput])

  if (!visible) return null

  function handleSaveClick() {
    if (!isAuthenticated) {
      authModal?.openAuthModal('Sign in to save your mix')
      return
    }

    const suggested = getSuggestedName(
      state.currentSceneName,
      state.activeSounds,
    )
    setName(suggested)
    setShowInput(true)
  }

  function handleSubmit() {
    const trimmed = name.trim()
    if (!trimmed) return

    saveMix(
      trimmed,
      state.activeSounds.map((s) => ({ soundId: s.soundId, volume: s.volume })),
    )
    showToast("Your mix is saved. It'll be here whenever you need it.")
    setAnnouncement(`Mix saved as ${trimmed}`)
    clearTimeout(announcementTimerRef.current)
    announcementTimerRef.current = setTimeout(() => setAnnouncement(''), 3000)
    setShowInput(false)
    setName('')
  }

  function handleCancel() {
    setShowInput(false)
    setName('')
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  return (
    <div className="space-y-2">
      <span className="sr-only" aria-live="polite">{announcement}</span>
      {!showInput && (
        <button
          type="button"
          onClick={handleSaveClick}
          aria-label="Save this mix"
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-white/60 transition-colors hover:bg-white/10 hover:text-white/80"
        >
          <Save size={16} aria-hidden="true" />
          <span>Save Mix</span>
        </button>
      )}

      {showInput && (
        <div className="space-y-2">
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={50}
            aria-label="Name your mix"
            className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-lt focus:ring-offset-1 focus:ring-offset-hero-mid"
            placeholder="Name your mix..."
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!name.trim()}
              className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-white transition-[colors,transform] duration-fast hover:bg-primary-lt disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt active:scale-[0.98]"
            >
              Save
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-3 py-1.5 text-sm text-white/50 transition-colors hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
