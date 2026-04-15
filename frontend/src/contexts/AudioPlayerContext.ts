/**
 * BB-26 — AudioPlayerContext (pure module)
 *
 * Types, reducer, initial state, and the context object. No JSX and no
 * React components — splitting this out of the provider file resolves
 * the react-refresh/only-export-components lint warning AND makes the
 * reducer easier to unit-test in isolation.
 *
 * The provider component lives in `AudioPlayerProvider.tsx` and is the
 * only place that wires the reducer + engine lifecycle together.
 */

import { createContext } from 'react'
import type {
  AudioPlayerActions,
  AudioPlayerState,
  PlaybackSpeed,
  PlayerTrack,
} from '@/types/bible-audio'

export type Action =
  | { type: 'LOAD_START'; track: PlayerTrack }
  | { type: 'LOAD_SUCCESS'; duration: number }
  | { type: 'LOAD_ERROR'; message: string }
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'TICK'; currentTime: number }
  | { type: 'SEEK'; seconds: number }
  | { type: 'SET_SPEED'; speed: PlaybackSpeed }
  | { type: 'STOP' }
  | { type: 'EXPAND' }
  | { type: 'MINIMIZE' }
  | { type: 'CLOSE' }
  | { type: 'DISMISS_ERROR' }

export const initialState: AudioPlayerState = {
  track: null,
  playbackState: 'idle',
  currentTime: 0,
  duration: 0,
  playbackSpeed: 1.0,
  sheetState: 'closed',
  errorMessage: null,
}

export function reducer(state: AudioPlayerState, action: Action): AudioPlayerState {
  switch (action.type) {
    case 'LOAD_START':
      return {
        ...state,
        track: action.track,
        playbackState: 'loading',
        currentTime: 0,
        duration: 0,
        sheetState: 'expanded',
        errorMessage: null,
      }
    case 'LOAD_SUCCESS':
      return { ...state, duration: action.duration }
    case 'LOAD_ERROR':
      return { ...state, playbackState: 'error', errorMessage: action.message }
    case 'PLAY':
      return { ...state, playbackState: 'playing' }
    case 'PAUSE':
      return { ...state, playbackState: 'paused' }
    case 'TICK':
      return { ...state, currentTime: action.currentTime }
    case 'SEEK':
      return { ...state, currentTime: action.seconds }
    case 'SET_SPEED':
      return { ...state, playbackSpeed: action.speed }
    case 'STOP':
      return {
        ...state,
        playbackState: 'idle',
        currentTime: 0,
      }
    case 'EXPAND':
      return { ...state, sheetState: 'expanded' }
    case 'MINIMIZE':
      return { ...state, sheetState: 'minimized' }
    case 'CLOSE':
      return {
        ...state,
        track: null,
        playbackState: 'idle',
        currentTime: 0,
        duration: 0,
        sheetState: 'closed',
        errorMessage: null,
      }
    case 'DISMISS_ERROR':
      return { ...state, playbackState: 'idle', errorMessage: null }
    default:
      return state
  }
}

export interface AudioPlayerContextValue {
  state: AudioPlayerState
  actions: AudioPlayerActions
}

export const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null)
