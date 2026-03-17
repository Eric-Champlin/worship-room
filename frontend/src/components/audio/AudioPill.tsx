import { useMemo } from 'react'
import { Play, Pause, Clock, Pencil } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAudioState, useAudioDispatch } from './AudioProvider'
import { WaveformBars } from './WaveformBars'
import { ProgressArc } from './ProgressArc'
import { useAuth } from '@/hooks/useAuth'
import { useRoutinePlayer } from '@/hooks/useRoutinePlayer'
import { storageService } from '@/services/storage-service'
import { ROUTINE_TEMPLATES } from '@/data/music/routines'
import type { RoutineDefinition } from '@/types/storage'

function getSuggestedRoutine(): RoutineDefinition | null {
  const userRoutines = storageService.getRoutines()
  const allRoutines = [...ROUTINE_TEMPLATES, ...userRoutines]
  if (allRoutines.length === 0) return null

  // Check listening history for most-used routine
  const sessions = storageService.getRecentSessions(100)
  const routineSessions = sessions.filter((s) => s.contentType === 'routine')

  if (routineSessions.length > 0) {
    // Find most frequent routine
    const counts = new Map<string, number>()
    for (const s of routineSessions) {
      counts.set(s.contentId, (counts.get(s.contentId) ?? 0) + 1)
    }
    let bestId = ''
    let bestCount = 0
    for (const [id, count] of counts) {
      if (count > bestCount) {
        bestId = id
        bestCount = count
      }
    }
    const found = allRoutines.find((r) => r.id === bestId)
    if (found) return found
  }

  // Default to Evening Peace template
  return ROUTINE_TEMPLATES.find((t) => t.id === 'template-evening-peace') ?? allRoutines[0]
}

export function AudioPill() {
  const state = useAudioState()
  const dispatch = useAudioDispatch()
  const { isAuthenticated } = useAuth()
  const { startRoutine } = useRoutinePlayer()

  // Only compute suggestion when needed (no audio playing + logged in)
  const suggested = useMemo(() => {
    if (state.pillVisible || !isAuthenticated) return null
    return getSuggestedRoutine()
  }, [state.pillVisible, isAuthenticated])

  // Routine shortcut mode: no audio playing, logged in
  if (!state.pillVisible) {
    if (!suggested) return null

    return (
      <div
        role="complementary"
        aria-label="Routine shortcut"
        className="fixed z-[9999] flex h-14 min-w-[44px] items-center gap-3 rounded-full border border-primary/40 px-4 transition-opacity duration-300 bottom-0 left-1/2 -translate-x-1/2 mb-[max(24px,calc(env(safe-area-inset-bottom)+8px))] lg:left-auto lg:right-6 lg:bottom-6 lg:translate-x-0 lg:mb-0"
        style={{
          background: 'rgba(15, 10, 30, 0.85)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        <button
          type="button"
          onClick={() => startRoutine(suggested)}
          aria-label={`Start ${suggested.name}`}
          className="flex flex-1 items-center gap-3 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt"
        >
          <Play size={16} className="shrink-0 text-white" />
          <span className="max-w-[150px] truncate text-sm font-medium text-white">
            Start {suggested.name}
          </span>
        </button>
        <Link
          to="/music/routines"
          aria-label="Edit routines"
          className="shrink-0 rounded-full p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt"
        >
          <Pencil size={12} />
        </Link>
      </div>
    )
  }

  // Normal now-playing mode
  const foregroundProgress =
    state.foregroundContent && state.foregroundContent.duration > 0
      ? state.foregroundContent.playbackPosition / state.foregroundContent.duration
      : 0

  function handlePlayPause(e: React.MouseEvent) {
    e.stopPropagation()
    dispatch({ type: state.isPlaying ? 'PAUSE_ALL' : 'PLAY_ALL' })
  }

  function handlePillClick() {
    dispatch({ type: 'OPEN_DRAWER' })
  }

  return (
    <div
      aria-label="Audio player"
      className="fixed z-[9999] flex h-14 min-w-[44px] items-center gap-3 rounded-full border border-primary/40 px-4 transition-opacity duration-300 bottom-0 left-1/2 -translate-x-1/2 mb-[max(24px,calc(env(safe-area-inset-bottom)+8px))] lg:left-auto lg:right-6 lg:bottom-6 lg:translate-x-0 lg:mb-0"
      style={{
        background: 'rgba(15, 10, 30, 0.85)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <ProgressArc progress={foregroundProgress} />

      <button
        type="button"
        onClick={handlePlayPause}
        aria-label={state.isPlaying ? 'Pause all audio' : 'Resume all audio'}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt"
      >
        {state.isPlaying ? <Pause size={18} /> : <Play size={18} />}
      </button>

      <button
        type="button"
        onClick={handlePillClick}
        aria-label="Open audio controls"
        className="flex flex-1 cursor-pointer items-center gap-3 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt"
      >
        <WaveformBars isPlaying={state.isPlaying} />

        {(state.foregroundContent?.title ?? state.currentSceneName) && (
          <span className="max-w-[150px] truncate text-sm font-medium text-white">
            {state.foregroundContent?.title ?? state.currentSceneName}
          </span>
        )}

        {state.sleepTimer?.isActive && !state.sleepTimer.isPaused && (
          <Clock size={14} className="shrink-0 text-white/60" aria-hidden="true" />
        )}
      </button>
    </div>
  )
}
