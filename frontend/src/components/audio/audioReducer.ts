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
        activeRoutine: null,
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
      return {
        ...state,
        foregroundContent: {
          ...state.foregroundContent,
          isPlaying: false,
        },
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
      if (!state.sleepTimer || !state.sleepTimer.isActive) return state
      const remaining = state.sleepTimer.remainingSeconds - 1
      if (remaining <= 0) {
        return {
          ...state,
          sleepTimer: null,
          activeSounds: [],
          foregroundContent: null,
          isPlaying: false,
          pillVisible: false,
          drawerOpen: false,
          currentSceneName: null,
        }
      }
      return {
        ...state,
        sleepTimer: { ...state.sleepTimer, remainingSeconds: remaining },
      }
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
        activeRoutine: action.payload,
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
        },
      }
    }

    case 'SET_SCENE_NAME': {
      return { ...state, currentSceneName: action.payload.sceneName }
    }

    default:
      return state
  }
}
