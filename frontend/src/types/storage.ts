export type FavoriteType = 'scene' | 'sleep_session' | 'custom_mix'

export interface Favorite {
  type: FavoriteType
  targetId: string
  createdAt: string // ISO date
}

export interface SavedMix {
  id: string // crypto.randomUUID()
  name: string
  sounds: { soundId: string; volume: number }[]
  createdAt: string
  updatedAt: string
}

export interface ListeningSession {
  id: string
  contentType: 'ambient' | 'scene' | 'scripture' | 'story' | 'routine'
  contentId: string
  startedAt: string
  durationSeconds: number
  completed: boolean
}

export interface SessionState {
  activeSounds: { soundId: string; volume: number }[]
  foregroundContentId: string | null
  foregroundPosition: number
  masterVolume: number
  savedAt: string
}

export interface SharedMixData {
  sounds: { id: string; v: number }[]
}

export interface RoutineDefinition {
  id: string
  name: string
  description?: string
  isTemplate: boolean
  steps: {
    id: string
    type: 'scene' | 'scripture' | 'story'
    contentId: string
    transitionGapMinutes: number
  }[]
  sleepTimer: { durationMinutes: number; fadeDurationMinutes: number }
  createdAt: string
  updatedAt: string
}
