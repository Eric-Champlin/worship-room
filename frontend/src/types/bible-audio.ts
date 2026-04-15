/**
 * BB-26 — Bible Audio type definitions
 *
 * Types for the FCBH Digital Bible Platform v4 client, the audio cache
 * layer, the AudioPlayerContext state, and the Media Session metadata.
 *
 * This file is intentionally separate from `frontend/src/types/audio.ts`
 * which holds the legacy music AudioProvider's types. The two subsystems
 * are parallel — do not merge them. See _plans/2026-04-14-bb-26-fcbh-
 * audio-bible-integration.md § "Architecture Context / Pattern collisions"
 * for the rationale.
 */

/** DBP v4 "bibles list" response entry. */
export interface DbpBible {
  id: string // e.g. "ENGWWH" — the bible abbreviation
  name: string
  language: string
  languageCode: string // e.g. "eng"
  filesets: DbpFileset[]
}

/** DBP v4 fileset entry — one audio package within a bible. */
export interface DbpFileset {
  id: string
  type: 'audio' | 'audio_drama' | 'text_plain' | 'text_format'
  size: 'C' | 'NT' | 'OT' // Complete / New Testament / Old Testament
  codec?: string // e.g. "mp3", "aac"
  bitrate?: string
}

/** DBP v4 chapter audio response — one URL per chapter. */
export interface DbpChapterAudio {
  book: string // DBP book code, e.g. "GEN", "JHN"
  chapter: number
  url: string
  durationSeconds?: number
}

/** Typed error from the DBP client. */
export interface DbpError {
  kind: 'network' | 'http' | 'parse' | 'timeout' | 'missing-key'
  status?: number
  message: string
}

/** Audio cache entry shape (stored in `bb26-v1:audioBibles`). */
export interface AudioBiblesCacheEntry {
  v: 1
  createdAt: number
  bibles: DbpBible[]
}

/** Current audio player state (ephemeral, not persisted). */
export type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'error'

/** Allowed playback speeds — tuple ensures type-safe setSpeed calls. */
export type PlaybackSpeed = 0.75 | 1.0 | 1.25 | 1.5 | 2.0

/** A single loaded track. */
export interface PlayerTrack {
  filesetId: string
  book: string // project slug, e.g. "john"
  bookDisplayName: string // "John"
  chapter: number
  translation: string // "World English Bible"
  url: string
}

export type SheetState = 'closed' | 'minimized' | 'expanded'

/** BB-28 — sleep timer countdown state. */
export interface SleepTimerInfo {
  type: 'duration' | 'end-of-chapter' | 'end-of-book'
  remainingMs: number
  preset: string
}

/** BB-28 — sleep fade-out state. */
export interface SleepFadeInfo {
  remainingMs: number
}

/** BB-44 — verse-level timing entry from DBP /timestamps endpoint. */
export interface VerseTimestamp {
  verse: number // verse number (parsed from string)
  timestamp: number // start time in seconds
}

export interface AudioPlayerState {
  track: PlayerTrack | null
  playbackState: PlaybackState
  currentTime: number // seconds
  duration: number // seconds
  playbackSpeed: PlaybackSpeed
  sheetState: SheetState
  errorMessage: string | null
  // BB-29 — continuous playback / auto-advance
  continuousPlayback: boolean
  endOfBible: boolean
  // BB-28 — sleep timer
  sleepTimer: SleepTimerInfo | null
  sleepFade: SleepFadeInfo | null
  // BB-44 — read-along verse highlighting
  readAlongEnabled: boolean
  readAlongTimestamps: VerseTimestamp[] | null
  readAlongVerse: number | null
}

/**
 * Action API exposed by AudioPlayerContext. Consumers import via
 * `useAudioPlayer()` and destructure as needed.
 */
export interface AudioPlayerActions {
  play: (track: PlayerTrack) => Promise<void>
  pause: () => void
  toggle: () => void
  seek: (seconds: number) => void
  setSpeed: (speed: PlaybackSpeed) => void
  stop: () => void
  expand: () => void
  minimize: () => void
  close: () => void
  dismissError: () => void
  // BB-29 — continuous playback / auto-advance
  setContinuousPlayback: (enabled: boolean) => void
  startFromGenesis: () => Promise<void>
  // BB-28 — sleep timer
  setSleepTimer: (timer: SleepTimerInfo) => void
  cancelSleepTimer: () => void
  // BB-44 — read-along
  setReadAlong: (enabled: boolean) => void
}
