import { createContext } from 'react'
import type { AudioState, AudioAction } from '@/types/audio'
import { initialAudioState } from '../audioReducer'

export type AudioDispatch = (action: AudioAction) => void

// Re-export for convenience
export { initialAudioState }

export function createTestState(overrides: Partial<AudioState> = {}): AudioState {
  return { ...initialAudioState, ...overrides }
}

// Contexts exported for test wrappers that need direct context control
export const TestAudioStateContext = createContext<AudioState | null>(null)
export const TestAudioDispatchContext = createContext<AudioDispatch | null>(null)
