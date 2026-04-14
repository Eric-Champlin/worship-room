import type { AudioState, AudioAction } from '@/types/audio'
import { AUDIO_CONFIG } from '@/constants/audio'

export const initialAudioState: AudioState = {
  activeSounds: [],
  foregroundContent: null,
  masterVolume: AUDIO_CONFIG.DEFAULT_MASTER_VOLUME,
  foregroundBackgroundBalance: AUDIO_CONFIG.DEFAULT_FG_BG_BALANCE,
  isPlaying: false,
  sleepTimer: null,
  activeRoutine: null,
  pillVisible: false,
  drawerOpen: false,
  currentSceneName: null,
  currentSceneId: null,
  foregroundEndedCounter: 0,
  readingContext: null,
}

export function audioReducer(state: AudioState, action: AudioAction): AudioState {
  switch (action.type) {
    case 'ADD_SOUND': {
      if (state.activeSounds.length >= AUDIO_CONFIG.MAX_SIMULTANEOUS_SOUNDS) {
        return state
      }
      if (state.activeSounds.some((s) => s.soundId === action.payload.soundId)) {
        return state
      }
      const { url: _url, ...sound } = action.payload
      return {
        ...state,
        activeSounds: [...state.activeSounds, sound],
        isPlaying: true,
        pillVisible: true,
      }
    }

    case 'REMOVE_SOUND': {
      const filtered = state.activeSounds.filter(
        (s) => s.soundId !== action.payload.soundId,
      )
      const hasContent = filtered.length > 0 || state.foregroundContent !== null
      return {
        ...state,
        activeSounds: filtered,
        pillVisible: hasContent ? state.pillVisible : false,
        isPlaying: hasContent ? state.isPlaying : false,
      }
    }

    case 'SET_SOUND_VOLUME': {
      return {
        ...state,
        activeSounds: state.activeSounds.map((s) =>
          s.soundId === action.payload.soundId
            ? { ...s, volume: action.payload.volume }
            : s,
        ),
      }
    }

    case 'SET_MASTER_VOLUME': {
      return {
        ...state,
        masterVolume: Math.round(Math.max(0, Math.min(1, action.payload.volume)) * 100) / 100,
      }
    }

    case 'PLAY_ALL': {
      return {
        ...state,
        isPlaying: true,
        pillVisible: true,
        foregroundContent: state.foregroundContent
          ? { ...state.foregroundContent, isPlaying: true }
          : null,
      }
    }

    case 'PAUSE_ALL': {
      return {
        ...state,
        isPlaying: false,
        foregroundContent: state.foregroundContent
          ? { ...state.foregroundContent, isPlaying: false }
          : null,
      }
    }

    case 'STOP_ALL': {
      return {
        ...state,
        activeSounds: [],
        foregroundContent: null,
        isPlaying: false,
        pillVisible: false,
        drawerOpen: false,
        currentSceneName: null,
        currentSceneId: null,
        activeRoutine: null,
        sleepTimer: null,
      }
    }

    case 'START_FOREGROUND': {
      return {
        ...state,
        foregroundContent: {
          ...action.payload,
          playbackPosition: 0,
          isPlaying: true,
        },
        isPlaying: true,
        pillVisible: true,
      }
    }

    case 'PAUSE_FOREGROUND': {
      if (!state.foregroundContent) return state
      const hasAmbient = state.activeSounds.length > 0
      return {
        ...state,
        isPlaying: hasAmbient ? state.isPlaying : false,
        foregroundContent: {
          ...state.foregroundContent,
          isPlaying: false,
        },
      }
    }

    case 'FOREGROUND_ENDED': {
      if (!state.foregroundContent) return state
      const hasAmbientSounds = state.activeSounds.length > 0
      return {
        ...state,
        isPlaying: hasAmbientSounds ? state.isPlaying : false,
        foregroundContent: {
          ...state.foregroundContent,
          isPlaying: false,
        },
        foregroundEndedCounter: state.foregroundEndedCounter + 1,
      }
    }

    case 'SEEK_FOREGROUND': {
      if (!state.foregroundContent) return state
      return {
        ...state,
        foregroundContent: {
          ...state.foregroundContent,
          playbackPosition: action.payload.position,
        },
      }
    }

    case 'UPDATE_FOREGROUND_POSITION': {
      if (!state.foregroundContent) return state
      return {
        ...state,
        foregroundContent: {
          ...state.foregroundContent,
          playbackPosition: action.payload.position,
        },
      }
    }

    case 'SET_FOREGROUND_BACKGROUND_BALANCE': {
      return {
        ...state,
        foregroundBackgroundBalance: Math.max(
          0,
          Math.min(1, action.payload.balance),
        ),
      }
    }

    case 'SET_SLEEP_TIMER': {
      return { ...state, sleepTimer: action.payload }
    }

    case 'TICK_TIMER': {
      // Legacy action kept for backward compat — no-op with new wall-clock timer.
      // Timer logic now lives in useSleepTimer hook.
      return state
    }

    case 'OPEN_DRAWER': {
      return { ...state, drawerOpen: true }
    }

    case 'CLOSE_DRAWER': {
      return { ...state, drawerOpen: false }
    }

    case 'START_ROUTINE': {
      return {
        ...state,
        activeRoutine: { ...action.payload, phase: 'playing' },
        isPlaying: true,
        pillVisible: true,
      }
    }

    case 'ADVANCE_ROUTINE_STEP': {
      if (!state.activeRoutine) return state
      const nextIndex = state.activeRoutine.currentStepIndex + 1
      if (nextIndex >= state.activeRoutine.steps.length) {
        return { ...state, activeRoutine: null }
      }
      return {
        ...state,
        activeRoutine: {
          ...state.activeRoutine,
          currentStepIndex: nextIndex,
          phase: 'playing',
        },
      }
    }

    case 'SKIP_ROUTINE_STEP': {
      if (!state.activeRoutine) return state
      const skipIndex = state.activeRoutine.currentStepIndex + 1
      if (skipIndex >= state.activeRoutine.steps.length) {
        return { ...state, activeRoutine: null }
      }
      return {
        ...state,
        activeRoutine: {
          ...state.activeRoutine,
          currentStepIndex: skipIndex,
          phase: 'playing',
        },
      }
    }

    case 'SET_ROUTINE_PHASE': {
      if (!state.activeRoutine) return state
      return {
        ...state,
        activeRoutine: { ...state.activeRoutine, phase: action.payload.phase },
      }
    }

    case 'END_ROUTINE': {
      return { ...state, activeRoutine: null }
    }

    case 'SET_SCENE_NAME': {
      return {
        ...state,
        currentSceneName: action.payload.sceneName,
        currentSceneId: action.payload.sceneId,
      }
    }

    case 'START_SLEEP_TIMER': {
      return {
        ...state,
        sleepTimer: {
          isActive: true,
          isPaused: false,
          totalDurationMs: action.payload.totalDurationMs,
          fadeDurationMs: action.payload.fadeDurationMs,
          startTime: Date.now(),
          pausedElapsedMs: 0,
          phase: 'full-volume',
        },
      }
    }

    case 'PAUSE_SLEEP_TIMER': {
      if (!state.sleepTimer || !state.sleepTimer.isActive) return state
      const now = Date.now()
      return {
        ...state,
        sleepTimer: {
          ...state.sleepTimer,
          isPaused: true,
          pausedElapsedMs:
            state.sleepTimer.pausedElapsedMs + (now - state.sleepTimer.startTime),
        },
      }
    }

    case 'RESUME_SLEEP_TIMER': {
      if (!state.sleepTimer || !state.sleepTimer.isActive || !state.sleepTimer.isPaused) return state
      return {
        ...state,
        sleepTimer: {
          ...state.sleepTimer,
          isPaused: false,
          startTime: Date.now(),
        },
      }
    }

    case 'CANCEL_SLEEP_TIMER': {
      return { ...state, sleepTimer: null }
    }

    case 'COMPLETE_SLEEP_TIMER': {
      return {
        ...state,
        sleepTimer: null,
        isPlaying: false,
        foregroundContent: state.foregroundContent
          ? { ...state.foregroundContent, isPlaying: false }
          : null,
      }
    }

    case 'UPDATE_TIMER_PHASE': {
      if (!state.sleepTimer) return state
      return {
        ...state,
        sleepTimer: {
          ...state.sleepTimer,
          phase: action.payload.phase,
        },
      }
    }

    case 'SET_READING_CONTEXT':
      return { ...state, readingContext: action.payload }

    case 'CLEAR_READING_CONTEXT':
      return { ...state, readingContext: null }

    default:
      return state
  }
}
