import { useEffect, useState, useCallback } from 'react'
import { X, ListMusic, Timer, StopCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useAudioState, useAudioDispatch, useReadingContext } from '@/components/audio/AudioProvider'
import { useSoundToggle } from '@/hooks/useSoundToggle'
import { VolumeSlider } from '@/components/audio/VolumeSlider'
import { getSoundIcon } from '@/components/audio/sound-icon-map'
import { SOUND_BY_ID } from '@/data/sound-catalog'
import { storageService } from '@/services/storage-service'
import type { Sound } from '@/types/music'

interface AmbientAudioPickerProps {
  isOpen: boolean
  onClose: () => void
  anchorRef: React.RefObject<HTMLButtonElement | null>
  bookName: string
  chapter: number
  onVolumeChange?: (volume: number) => void
}

const PANEL_STYLE = {
  background: 'rgba(15, 10, 30, 0.95)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
} as const

const CURATED_DEFAULTS = ['gentle-rain', 'ocean-waves', 'fireplace', 'soft-piano']

function getQuickRowSounds(): Sound[] {
  const history = storageService.getListeningHistory()
  const recentIds: string[] = []

  for (const session of history) {
    if (session.contentType === 'ambient' && !recentIds.includes(session.contentId)) {
      recentIds.push(session.contentId)
      if (recentIds.length === 4) break
    }
  }

  for (const id of CURATED_DEFAULTS) {
    if (!recentIds.includes(id) && recentIds.length < 4) {
      recentIds.push(id)
    }
  }

  return recentIds
    .map((id) => SOUND_BY_ID.get(id))
    .filter((s): s is Sound => s !== undefined)
}

export function AmbientAudioPicker({
  isOpen,
  onClose,
  anchorRef,
  bookName,
  chapter,
  onVolumeChange,
}: AmbientAudioPickerProps) {
  const audioState = useAudioState()
  const dispatch = useAudioDispatch()
  const readingContextControl = useReadingContext()
  const { toggleSound } = useSoundToggle()
  const isDesktop = useIsDesktop()
  const sounds = getQuickRowSounds()

  const panelRef = useFocusTrap(isOpen, onClose)

  // Click-outside handler for desktop popover
  useEffect(() => {
    if (!isOpen || !isDesktop) return

    function handleClick(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen, isDesktop, onClose, anchorRef])

  const handleSoundTap = useCallback(
    (sound: Sound) => {
      const isActive = audioState.activeSounds.some((s) => s.soundId === sound.id)
      if (isActive) {
        dispatch({ type: 'PAUSE_ALL' })
      } else {
        toggleSound(sound)
        readingContextControl.setReadingContext({ book: bookName, chapter })
      }
    },
    [audioState.activeSounds, dispatch, toggleSound, readingContextControl, bookName, chapter],
  )

  const handleVolumeChange = useCallback(
    (v: number) => {
      dispatch({ type: 'SET_MASTER_VOLUME', payload: { volume: v / 100 } })
      onVolumeChange?.(v)
    },
    [dispatch, onVolumeChange],
  )

  const handleBrowse = useCallback(() => {
    onClose()
    dispatch({ type: 'OPEN_DRAWER' })
  }, [onClose, dispatch])

  const handleStop = useCallback(() => {
    dispatch({ type: 'STOP_ALL' })
  }, [dispatch])

  if (!isOpen) return null

  const volumeValue = Math.round(audioState.masterVolume * 100)
  const hasAudio = audioState.activeSounds.length > 0 || audioState.isPlaying

  const pickerContent = (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white">Sounds</h3>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Close sound picker"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Quick row */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {sounds.map((sound) => {
          const Icon = getSoundIcon(sound.lucideIcon)
          const isActive = audioState.activeSounds.some((s) => s.soundId === sound.id)
          return (
            <button
              key={sound.id}
              type="button"
              onClick={() => handleSoundTap(sound)}
              className={cn(
                'flex min-h-[72px] min-w-[72px] flex-col items-center justify-center gap-1 rounded-xl border p-2 transition-all',
                'cursor-pointer bg-white/[0.06]',
                isActive
                  ? 'border-primary/60 bg-white/[0.10]'
                  : 'border-white/[0.12] hover:bg-white/[0.10]',
              )}
              aria-label={`${isActive ? 'Pause' : 'Play'} ${sound.name}`}
              aria-pressed={isActive}
            >
              <Icon
                className={cn(
                  'h-5 w-5',
                  isActive ? 'text-primary-lt' : 'text-white/60',
                )}
              />
              <span className="line-clamp-1 text-center text-xs text-white/80">
                {sound.name}
              </span>
            </button>
          )
        })}
      </div>

      {/* Volume slider */}
      <VolumeSlider
        value={volumeValue}
        onChange={handleVolumeChange}
        ariaLabel="Master volume"
      />

      {/* Links */}
      <div className="flex flex-col">
        <button
          type="button"
          onClick={handleBrowse}
          className="flex items-center gap-2 py-2 text-sm text-white/60 transition-colors hover:text-white"
        >
          <ListMusic className="h-4 w-4" />
          Browse all sounds
        </button>
        <button
          type="button"
          onClick={handleBrowse}
          className="flex items-center gap-2 py-2 text-sm text-white/60 transition-colors hover:text-white"
        >
          <Timer className="h-4 w-4" />
          Set a sleep timer
        </button>
      </div>

      {/* Stop button */}
      {hasAudio && (
        <button
          type="button"
          onClick={handleStop}
          className="flex items-center gap-2 py-2 text-sm text-white/50 transition-colors hover:text-white"
        >
          <StopCircle className="h-4 w-4" />
          Stop sound
        </button>
      )}
    </div>
  )

  // Desktop: popover anchored below icon
  if (isDesktop && anchorRef.current) {
    const rect = anchorRef.current.getBoundingClientRect()
    return (
      <div
        ref={panelRef}
        style={{
          ...PANEL_STYLE,
          position: 'fixed',
          top: rect.bottom + 8,
          right: Math.max(16, window.innerWidth - rect.right),
          zIndex: 50,
        }}
        className="w-80 rounded-2xl border border-white/10 p-4"
        role="dialog"
        aria-label="Ambient sound picker"
      >
        {pickerContent}
      </div>
    )
  }

  // Mobile/Tablet: bottom sheet with scrim
  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/30"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        style={PANEL_STYLE}
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 max-h-[60vh] overflow-y-auto rounded-t-2xl border-t border-white/10 p-4',
          'sm:inset-x-auto sm:left-1/2 sm:w-[480px] sm:-translate-x-1/2',
        )}
        role="dialog"
        aria-label="Ambient sound picker"
      >
        {pickerContent}
      </div>
    </>
  )
}

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(min-width: 1024px)').matches
      : false,
  )

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    setIsDesktop(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return isDesktop
}
