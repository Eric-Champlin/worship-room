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

type AudioDispatch = (action: AudioAction) => void

const AudioStateContext = createContext<AudioState | null>(null)
const AudioDispatchContext = createContext<AudioDispatch | null>(null)
const AudioEngineContext = createContext<AudioEngineService | null>(null)

export function AudioProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(audioReducer, initialAudioState)
  const engineRef = useRef<AudioEngineService | null>(null)
  const originalTitleRef = useRef('')
  const ariaLiveRef = useRef<HTMLDivElement>(null)
  const announcementTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const location = useLocation()
  const prevPathRef = useRef(location.pathname)

  // Lazy engine initialization
  function getEngine(): AudioEngineService {
    if (!engineRef.current) {
      engineRef.current = new AudioEngineService()
    }
    return engineRef.current
  }

  // Enhanced dispatch that syncs side effects to the audio engine
  const enhancedDispatch = useCallback<AudioDispatch>((action) => {
    const engine = getEngine()

    switch (action.type) {
      // ADD_SOUND: no engine call — useSoundToggle calls engine.addSound() directly
      // and dispatches ADD_SOUND only after async load succeeds.
      case 'REMOVE_SOUND':
        engine.removeSound(action.payload.soundId)
        break
      case 'SET_SOUND_VOLUME':
        engine.setSoundVolume(action.payload.soundId, action.payload.volume)
        break
      case 'SET_MASTER_VOLUME':
        engine.setMasterVolume(action.payload.volume)
        break
      case 'PLAY_ALL':
        engine.resumeAll()
        break
      case 'PAUSE_ALL':
        engine.pauseAll()
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
    }

    dispatch(action)
  }, [])

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

    if (state.currentSceneName && state.pillVisible) {
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
  }, [state.currentSceneName, state.pillVisible, enhancedDispatch])

  // Browser tab title — capture the page's title before we override it
  useEffect(() => {
    if (state.isPlaying && state.currentSceneName) {
      if (!originalTitleRef.current) {
        originalTitleRef.current = document.title
      }
      document.title = `\u25B6 ${state.currentSceneName} \u2014 Worship Room`
    } else if (!state.isPlaying && state.currentSceneName && state.pillVisible) {
      if (!originalTitleRef.current) {
        originalTitleRef.current = document.title
      }
      document.title = `\u23F8 ${state.currentSceneName} \u2014 Worship Room`
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
  }, [state.isPlaying, state.currentSceneName, state.pillVisible])

  // Route change auto-collapse
  useEffect(() => {
    if (location.pathname !== prevPathRef.current && state.drawerOpen) {
      dispatch({ type: 'CLOSE_DRAWER' })
    }
    prevPathRef.current = location.pathname
  }, [location.pathname, state.drawerOpen])

  // aria-live announcements (debounced)
  useEffect(() => {
    if (!ariaLiveRef.current) return
    if (!state.pillVisible) {
      ariaLiveRef.current.textContent = ''
      return
    }

    clearTimeout(announcementTimerRef.current)
    announcementTimerRef.current = setTimeout(() => {
      if (!ariaLiveRef.current) return
      const parts: string[] = []
      if (state.currentSceneName) {
        parts.push(
          `Now playing: ${state.currentSceneName}.`,
        )
      }
      if (state.activeSounds.length > 0) {
        parts.push(
          `${state.activeSounds.length} sound${state.activeSounds.length === 1 ? '' : 's'} active.`,
        )
      }
      if (!state.isPlaying && state.pillVisible) {
        parts.push('Paused.')
      }
      ariaLiveRef.current.textContent = parts.join(' ')
    }, 500)

    return () => clearTimeout(announcementTimerRef.current)
  }, [
    state.currentSceneName,
    state.activeSounds.length,
    state.isPlaying,
    state.pillVisible,
  ])

  return (
    <AudioStateContext.Provider value={state}>
      <AudioDispatchContext.Provider value={enhancedDispatch}>
        <AudioEngineContext.Provider value={getEngine()}>
          {children}
          <AudioPill />
          <AudioDrawer />
          <div
            ref={ariaLiveRef}
            aria-live="polite"
            className="sr-only"
            data-testid="audio-aria-live"
          />
        </AudioEngineContext.Provider>
      </AudioDispatchContext.Provider>
    </AudioStateContext.Provider>
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
