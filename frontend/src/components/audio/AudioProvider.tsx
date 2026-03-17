import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
} from 'react'
import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import type { AudioState, AudioAction } from '@/types/audio'
import { audioReducer, initialAudioState } from './audioReducer'
import { AudioEngineService } from '@/lib/audio-engine'
import { AudioPill } from './AudioPill'
import { AudioDrawer } from './AudioDrawer'
import { ListeningLogger } from './ListeningLogger'
import { ListenTracker } from './ListenTracker'
import { SessionAutoSave } from './SessionAutoSave'
import { useSleepTimer } from '@/hooks/useSleepTimer'
import type { SleepTimerControls } from '@/hooks/useSleepTimer'
import { useAnnounce } from '@/hooks/useAnnounce'

type AudioDispatch = (action: AudioAction) => void

const AudioStateContext = createContext<AudioState | null>(null)
const AudioDispatchContext = createContext<AudioDispatch | null>(null)
const SleepTimerControlsContext = createContext<SleepTimerControls | null>(null)
const AudioEngineContext = createContext<AudioEngineService | null>(null)

export function AudioProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(audioReducer, initialAudioState)
  const engineRef = useRef<AudioEngineService | null>(null)
  const originalTitleRef = useRef('')
  const { announce, AnnouncerRegion } = useAnnounce()
  const stateRef = useRef(state)
  stateRef.current = state
  const location = useLocation()
  const prevPathRef = useRef(location.pathname)

  // Lazy engine initialization
  function getEngine(): AudioEngineService {
    if (!engineRef.current) {
      engineRef.current = new AudioEngineService()
    }
    return engineRef.current
  }

  // Enhanced dispatch that syncs side effects to the audio engine + screen reader announcements
  const enhancedDispatch = useCallback<AudioDispatch>((action) => {
    const engine = getEngine()
    const current = stateRef.current

    switch (action.type) {
      // ADD_SOUND: no engine call — useSoundToggle calls engine.addSound() directly
      // and dispatches ADD_SOUND only after async load succeeds.
      case 'ADD_SOUND': {
        const count = current.activeSounds.length + 1
        announce(`${action.payload.label} added to mix. ${count} of 6 sounds active.`)
        break
      }
      case 'REMOVE_SOUND': {
        engine.removeSound(action.payload.soundId)
        const removed = current.activeSounds.find((s) => s.soundId === action.payload.soundId)
        const count = current.activeSounds.length - 1
        if (removed) {
          announce(`${removed.label} removed from mix. ${count} of 6 sounds active.`)
        }
        break
      }
      case 'SET_SOUND_VOLUME':
        engine.setSoundVolume(action.payload.soundId, action.payload.volume)
        // Do NOT announce volume changes during drag
        break
      case 'SET_MASTER_VOLUME':
        engine.setMasterVolume(action.payload.volume)
        // Do NOT announce volume changes during drag
        break
      case 'PLAY_ALL':
        engine.resumeAll()
        announce('Audio resumed.')
        break
      case 'PAUSE_ALL':
        engine.pauseAll()
        announce('Audio paused.')
        break
      case 'STOP_ALL':
        engine.stopAll()
        break
      case 'SEEK_FOREGROUND':
        engine.seekForeground(action.payload.position)
        break
      case 'SET_FOREGROUND_BACKGROUND_BALANCE':
        engine.setForegroundBalance(action.payload.balance)
        break
      case 'SET_SCENE_NAME':
        if (action.payload.sceneName) {
          const soundCount = current.activeSounds.length
          announce(`Now playing: ${action.payload.sceneName}. ${soundCount} sound${soundCount === 1 ? '' : 's'} active.`)
        }
        break
      case 'START_FOREGROUND':
        announce(`Now playing: ${action.payload.title}.`)
        break
      case 'START_ROUTINE': {
        const r = action.payload
        const firstStep = r.steps[0]
        announce(`${r.routineName} routine started. Step 1 of ${r.steps.length}: ${firstStep?.label ?? 'Unknown'}.`)
        break
      }
      case 'ADVANCE_ROUTINE_STEP': {
        const routine = current.activeRoutine
        if (routine) {
          const nextIdx = routine.currentStepIndex + 1
          const step = routine.steps[nextIdx]
          if (step) {
            announce(`Step ${nextIdx + 1} of ${routine.steps.length}: ${step.label}.`)
          }
        }
        break
      }
      case 'END_ROUTINE': {
        const routine = current.activeRoutine
        if (routine) {
          announce(`${routine.routineName} routine complete. Ambient continuing with sleep timer.`)
        }
        break
      }
      case 'START_SLEEP_TIMER': {
        const totalMin = Math.round(action.payload.totalDurationMs / 60000)
        const fadeMin = Math.round(action.payload.fadeDurationMs / 60000)
        announce(`Sleep timer set for ${totalMin} minutes with ${fadeMin} minute fade.`)
        break
      }
      case 'COMPLETE_SLEEP_TIMER':
        announce('Sleep timer complete. Audio paused.', 'assertive')
        break
      case 'UPDATE_TIMER_PHASE':
        if (action.payload.phase === 'fading') {
          const timer = current.sleepTimer
          if (timer) {
            const fadeMin = Math.round(timer.fadeDurationMs / 60000)
            announce(`Sleep timer fading in ${fadeMin} minutes.`, 'assertive')
          }
        }
        break
    }

    dispatch(action)
  }, [announce])

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (document.activeElement?.tagName ?? '').toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return
      if (document.activeElement?.getAttribute('contenteditable') === 'true')
        return

      if (e.code === 'Space') {
        e.preventDefault()
        enhancedDispatch({ type: state.isPlaying ? 'PAUSE_ALL' : 'PLAY_ALL' })
      } else if (e.code === 'ArrowUp') {
        e.preventDefault()
        enhancedDispatch({
          type: 'SET_MASTER_VOLUME',
          payload: { volume: Math.min(1, state.masterVolume + 0.05) },
        })
      } else if (e.code === 'ArrowDown') {
        e.preventDefault()
        enhancedDispatch({
          type: 'SET_MASTER_VOLUME',
          payload: { volume: Math.max(0, state.masterVolume - 0.05) },
        })
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [state.isPlaying, state.masterVolume, enhancedDispatch])

  // Media Session API
  useEffect(() => {
    if (!('mediaSession' in navigator)) return

    if (state.foregroundContent && state.pillVisible) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: state.foregroundContent.title,
        artist: 'Worship Room',
        album:
          state.foregroundContent.contentType === 'scripture'
            ? 'Scripture Readings'
            : 'Bedtime Stories',
      })
    } else if (state.currentSceneName && state.pillVisible) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: state.currentSceneName,
        artist: 'Worship Room',
      })
    }

    navigator.mediaSession.setActionHandler('play', () => {
      enhancedDispatch({ type: 'PLAY_ALL' })
    })
    navigator.mediaSession.setActionHandler('pause', () => {
      enhancedDispatch({ type: 'PAUSE_ALL' })
    })
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      enhancedDispatch({ type: 'SKIP_ROUTINE_STEP' })
    })
  }, [state.foregroundContent, state.currentSceneName, state.pillVisible, enhancedDispatch])

  // Browser tab title — capture the page's title before we override it
  useEffect(() => {
    const displayName = state.foregroundContent?.title ?? state.currentSceneName
    if (state.isPlaying && displayName) {
      if (!originalTitleRef.current) {
        originalTitleRef.current = document.title
      }
      document.title = `\u25B6 ${displayName} \u2014 Worship Room`
    } else if (!state.isPlaying && displayName && state.pillVisible) {
      if (!originalTitleRef.current) {
        originalTitleRef.current = document.title
      }
      document.title = `\u23F8 ${displayName} \u2014 Worship Room`
    } else {
      if (originalTitleRef.current) {
        document.title = originalTitleRef.current
        originalTitleRef.current = ''
      }
    }

    return () => {
      if (originalTitleRef.current) {
        document.title = originalTitleRef.current
      }
    }
  }, [state.isPlaying, state.currentSceneName, state.foregroundContent, state.pillVisible])

  // Route change auto-collapse
  useEffect(() => {
    if (location.pathname !== prevPathRef.current && state.drawerOpen) {
      dispatch({ type: 'CLOSE_DRAWER' })
    }
    prevPathRef.current = location.pathname
  }, [location.pathname, state.drawerOpen])

  // Screen reader announcements are now handled via useAnnounce in enhancedDispatch

  return (
    <AudioStateContext.Provider value={state}>
      <AudioDispatchContext.Provider value={enhancedDispatch}>
        <AudioEngineContext.Provider value={getEngine()}>
          <SleepTimerBridge>
            {children}
            <AudioDrawer />
            <ListeningLogger />
            <ListenTracker />
            <SessionAutoSave />
          </SleepTimerBridge>
          <AudioPill />
          <AnnouncerRegion />
        </AudioEngineContext.Provider>
      </AudioDispatchContext.Provider>
    </AudioStateContext.Provider>
  )
}

/**
 * Inner component that initializes useSleepTimer within the AudioProvider
 * context tree, then provides its controls via SleepTimerControlsContext.
 */
function SleepTimerBridge({ children }: { children: ReactNode }) {
  const controls = useSleepTimer()
  return (
    <SleepTimerControlsContext.Provider value={controls}>
      {children}
    </SleepTimerControlsContext.Provider>
  )
}

export function useAudioState(): AudioState {
  const ctx = useContext(AudioStateContext)
  if (!ctx) {
    throw new Error('useAudioState must be used within an AudioProvider')
  }
  return ctx
}

export function useAudioDispatch(): AudioDispatch {
  const ctx = useContext(AudioDispatchContext)
  if (!ctx) {
    throw new Error('useAudioDispatch must be used within an AudioProvider')
  }
  return ctx
}

export function useAudioEngine(): AudioEngineService | null {
  return useContext(AudioEngineContext)
}

export function useSleepTimerControls(): SleepTimerControls {
  const ctx = useContext(SleepTimerControlsContext)
  if (!ctx) {
    throw new Error('useSleepTimerControls must be used within an AudioProvider')
  }
  return ctx
}
