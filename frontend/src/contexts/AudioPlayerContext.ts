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
  SleepTimerInfo,
  VerseTimestamp,
} from '@/types/bible-audio'
import { SLEEP_FADE_DURATION_MS } from '@/lib/audio/sleep-timer'
import { findCurrentVerse } from '@/lib/audio/timestamps'

export type Action =
  | { type: 'LOAD_START'; track: PlayerTrack }
  | { type: 'LOAD_NEXT_CHAPTER_START'; track: PlayerTrack }
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
  | { type: 'SET_CONTINUOUS_PLAYBACK'; enabled: boolean }
  | { type: 'END_OF_BIBLE' }
  // BB-28 — sleep timer
  | { type: 'SET_SLEEP_TIMER'; timer: SleepTimerInfo }
  | { type: 'START_SLEEP_FADE' }
  | { type: 'CANCEL_SLEEP_TIMER' }
  // BB-44 — read-along verse highlighting
  | { type: 'SET_READ_ALONG'; enabled: boolean }
  | { type: 'SET_READ_ALONG_TIMESTAMPS'; timestamps: VerseTimestamp[] | null }

export const initialState: AudioPlayerState = {
  track: null,
  playbackState: 'idle',
  currentTime: 0,
  duration: 0,
  playbackSpeed: 1.0,
  sheetState: 'closed',
  errorMessage: null,
  continuousPlayback: true,
  endOfBible: false,
  sleepTimer: null,
  sleepFade: null,
  readAlongEnabled: true,
  readAlongTimestamps: null,
  readAlongVerse: null,
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
        endOfBible: false,
        readAlongTimestamps: null,
        readAlongVerse: null,
      }
    case 'LOAD_NEXT_CHAPTER_START':
      return {
        ...state,
        track: action.track,
        playbackState: 'loading',
        currentTime: 0,
        duration: 0,
        errorMessage: null,
        endOfBible: false,
        readAlongTimestamps: null,
        readAlongVerse: null,
        // sheetState intentionally preserved — auto-advance must not
        // re-expand a minimized sheet.
      }
    case 'LOAD_SUCCESS':
      return { ...state, duration: action.duration }
    case 'LOAD_ERROR':
      return { ...state, playbackState: 'error', errorMessage: action.message }
    case 'PLAY':
      return { ...state, playbackState: 'playing' }
    case 'PAUSE':
      return { ...state, playbackState: 'paused' }
    case 'TICK': {
      let sleepTimer = state.sleepTimer
      let sleepFade = state.sleepFade
      let fadeJustStarted = false

      // Duration timer countdown (ticks even during pause)
      if (sleepTimer?.type === 'duration') {
        const newRemaining = sleepTimer.remainingMs - 200
        if (newRemaining <= 0) {
          // Timer expired — transition to fade phase
          sleepTimer = null
          sleepFade = { remainingMs: SLEEP_FADE_DURATION_MS }
          fadeJustStarted = true
        } else {
          sleepTimer = { ...sleepTimer, remainingMs: newRemaining }
        }
      }

      // Fade countdown (skip on the tick that just created the fade)
      if (sleepFade && !fadeJustStarted) {
        const newRemaining = Math.max(0, sleepFade.remainingMs - 200)
        sleepFade = { remainingMs: newRemaining }
      }

      // BB-44 — read-along verse detection
      let readAlongVerse = state.readAlongVerse
      if (state.readAlongEnabled && state.readAlongTimestamps && state.readAlongTimestamps.length > 0) {
        const newVerse = findCurrentVerse(state.readAlongTimestamps, action.currentTime)
        if (newVerse !== readAlongVerse) {
          readAlongVerse = newVerse
        }
      } else if (readAlongVerse !== null) {
        readAlongVerse = null
      }

      return { ...state, currentTime: action.currentTime, sleepTimer, sleepFade, readAlongVerse }
    }
    case 'SEEK':
      return { ...state, currentTime: action.seconds }
    case 'SET_SPEED':
      return { ...state, playbackSpeed: action.speed }
    case 'STOP':
      return {
        ...state,
        playbackState: 'idle',
        currentTime: 0,
        sleepTimer: null,
        sleepFade: null,
        readAlongTimestamps: null,
        readAlongVerse: null,
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
        endOfBible: false,
        sleepTimer: null,
        sleepFade: null,
        readAlongTimestamps: null,
        readAlongVerse: null,
      }
    case 'DISMISS_ERROR':
      return { ...state, playbackState: 'idle', errorMessage: null }
    case 'SET_CONTINUOUS_PLAYBACK':
      return { ...state, continuousPlayback: action.enabled }
    case 'END_OF_BIBLE':
      return {
        ...state,
        playbackState: 'idle',
        currentTime: 0,
        endOfBible: true,
        sleepTimer: null,
        sleepFade: null,
        readAlongTimestamps: null,
        readAlongVerse: null,
        // track + sheetState preserved so "Revelation 22" stays visible.
      }
    // BB-28 — sleep timer actions
    case 'SET_SLEEP_TIMER':
      return { ...state, sleepTimer: action.timer, sleepFade: null }
    case 'START_SLEEP_FADE':
      return { ...state, sleepTimer: null, sleepFade: { remainingMs: SLEEP_FADE_DURATION_MS } }
    case 'CANCEL_SLEEP_TIMER':
      return { ...state, sleepTimer: null, sleepFade: null }
    // BB-44 — read-along actions
    case 'SET_READ_ALONG':
      return {
        ...state,
        readAlongEnabled: action.enabled,
        // If disabling mid-playback, clear the active verse immediately (spec req 21)
        readAlongVerse: action.enabled ? state.readAlongVerse : null,
      }
    case 'SET_READ_ALONG_TIMESTAMPS':
      return { ...state, readAlongTimestamps: action.timestamps, readAlongVerse: null }
    default:
      return state
  }
}

export interface AudioPlayerContextValue {
  state: AudioPlayerState
  actions: AudioPlayerActions
}

export const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null)
