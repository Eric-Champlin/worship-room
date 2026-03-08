import { describe, it, expect } from 'vitest'
import { audioReducer, initialAudioState } from '../audioReducer'
import { AUDIO_CONFIG } from '@/constants/audio'
import type { AudioState } from '@/types/audio'

function stateWith(overrides: Partial<AudioState>): AudioState {
  return { ...initialAudioState, ...overrides }
}

describe('audioReducer', () => {
  it('returns initial state for unknown action', () => {
    const result = audioReducer(initialAudioState, { type: 'UNKNOWN' } as never)
    expect(result).toBe(initialAudioState)
  })

  describe('ADD_SOUND', () => {
    it('adds a sound and sets pillVisible and isPlaying', () => {
      const result = audioReducer(initialAudioState, {
        type: 'ADD_SOUND',
        payload: { soundId: 'rain', volume: 0.6, label: 'Rain', url: '/audio/rain.mp3' },
      })
      expect(result.activeSounds).toHaveLength(1)
      expect(result.activeSounds[0].soundId).toBe('rain')
      expect(result.isPlaying).toBe(true)
      expect(result.pillVisible).toBe(true)
    })

    it('does not add duplicate soundId', () => {
      const state = stateWith({
        activeSounds: [{ soundId: 'rain', volume: 0.6, label: 'Rain' }],
      })
      const result = audioReducer(state, {
        type: 'ADD_SOUND',
        payload: { soundId: 'rain', volume: 0.8, label: 'Rain', url: '/audio/rain.mp3' },
      })
      expect(result.activeSounds).toHaveLength(1)
    })

    it('enforces MAX_SIMULTANEOUS_SOUNDS', () => {
      const sounds = Array.from({ length: AUDIO_CONFIG.MAX_SIMULTANEOUS_SOUNDS }, (_, i) => ({
        soundId: `sound-${i}`,
        volume: 0.5,
        label: `Sound ${i}`,
      }))
      const state = stateWith({ activeSounds: sounds })
      const result = audioReducer(state, {
        type: 'ADD_SOUND',
        payload: { soundId: 'extra', volume: 0.5, label: 'Extra', url: '/audio/extra.mp3' },
      })
      expect(result.activeSounds).toHaveLength(AUDIO_CONFIG.MAX_SIMULTANEOUS_SOUNDS)
    })
  })

  describe('REMOVE_SOUND', () => {
    it('removes a sound by id', () => {
      const state = stateWith({
        activeSounds: [{ soundId: 'rain', volume: 0.6, label: 'Rain' }],
      })
      const result = audioReducer(state, {
        type: 'REMOVE_SOUND',
        payload: { soundId: 'rain' },
      })
      expect(result.activeSounds).toHaveLength(0)
    })
  })

  describe('SET_SOUND_VOLUME', () => {
    it('updates volume for a specific sound', () => {
      const state = stateWith({
        activeSounds: [{ soundId: 'rain', volume: 0.6, label: 'Rain' }],
      })
      const result = audioReducer(state, {
        type: 'SET_SOUND_VOLUME',
        payload: { soundId: 'rain', volume: 0.9 },
      })
      expect(result.activeSounds[0].volume).toBe(0.9)
    })
  })

  describe('SET_MASTER_VOLUME', () => {
    it('sets master volume', () => {
      const result = audioReducer(initialAudioState, {
        type: 'SET_MASTER_VOLUME',
        payload: { volume: 0.5 },
      })
      expect(result.masterVolume).toBe(0.5)
    })

    it('clamps to 0-1 range', () => {
      expect(
        audioReducer(initialAudioState, {
          type: 'SET_MASTER_VOLUME',
          payload: { volume: 1.5 },
        }).masterVolume,
      ).toBe(1)

      expect(
        audioReducer(initialAudioState, {
          type: 'SET_MASTER_VOLUME',
          payload: { volume: -0.3 },
        }).masterVolume,
      ).toBe(0)
    })
  })

  describe('PLAY_ALL', () => {
    it('sets isPlaying true and pillVisible true', () => {
      const state = stateWith({ isPlaying: false, pillVisible: false })
      const result = audioReducer(state, { type: 'PLAY_ALL' })
      expect(result.isPlaying).toBe(true)
      expect(result.pillVisible).toBe(true)
    })

    it('resumes foreground content', () => {
      const state = stateWith({
        foregroundContent: {
          contentId: '1',
          contentType: 'scripture',
          title: 'Psalm 23',
          duration: 120,
          playbackPosition: 30,
          isPlaying: false,
        },
      })
      const result = audioReducer(state, { type: 'PLAY_ALL' })
      expect(result.foregroundContent?.isPlaying).toBe(true)
    })
  })

  describe('PAUSE_ALL', () => {
    it('sets isPlaying false but keeps pillVisible true', () => {
      const state = stateWith({ isPlaying: true, pillVisible: true })
      const result = audioReducer(state, { type: 'PAUSE_ALL' })
      expect(result.isPlaying).toBe(false)
      expect(result.pillVisible).toBe(true)
    })
  })

  describe('STOP_ALL', () => {
    it('resets all playback state', () => {
      const state = stateWith({
        activeSounds: [{ soundId: 'rain', volume: 0.6, label: 'Rain' }],
        foregroundContent: {
          contentId: '1',
          contentType: 'scripture',
          title: 'Psalm 23',
          duration: 120,
          playbackPosition: 30,
          isPlaying: true,
        },
        isPlaying: true,
        pillVisible: true,
        drawerOpen: true,
        currentSceneName: 'Garden',
      })
      const result = audioReducer(state, { type: 'STOP_ALL' })
      expect(result.activeSounds).toHaveLength(0)
      expect(result.foregroundContent).toBeNull()
      expect(result.isPlaying).toBe(false)
      expect(result.pillVisible).toBe(false)
      expect(result.drawerOpen).toBe(false)
      expect(result.currentSceneName).toBeNull()
    })
  })

  describe('START_FOREGROUND', () => {
    it('starts foreground content at position 0', () => {
      const result = audioReducer(initialAudioState, {
        type: 'START_FOREGROUND',
        payload: {
          contentId: '1',
          contentType: 'scripture',
          title: 'Psalm 23',
          duration: 120,
        },
      })
      expect(result.foregroundContent?.playbackPosition).toBe(0)
      expect(result.foregroundContent?.isPlaying).toBe(true)
      expect(result.isPlaying).toBe(true)
      expect(result.pillVisible).toBe(true)
    })
  })

  describe('SEEK_FOREGROUND', () => {
    it('updates playback position', () => {
      const state = stateWith({
        foregroundContent: {
          contentId: '1',
          contentType: 'scripture',
          title: 'Psalm 23',
          duration: 120,
          playbackPosition: 0,
          isPlaying: true,
        },
      })
      const result = audioReducer(state, {
        type: 'SEEK_FOREGROUND',
        payload: { position: 45 },
      })
      expect(result.foregroundContent?.playbackPosition).toBe(45)
    })

    it('does nothing when no foreground content', () => {
      const result = audioReducer(initialAudioState, {
        type: 'SEEK_FOREGROUND',
        payload: { position: 45 },
      })
      expect(result.foregroundContent).toBeNull()
    })
  })

  describe('OPEN_DRAWER / CLOSE_DRAWER', () => {
    it('opens drawer', () => {
      const result = audioReducer(initialAudioState, { type: 'OPEN_DRAWER' })
      expect(result.drawerOpen).toBe(true)
    })

    it('closes drawer', () => {
      const state = stateWith({ drawerOpen: true })
      const result = audioReducer(state, { type: 'CLOSE_DRAWER' })
      expect(result.drawerOpen).toBe(false)
    })
  })

  describe('TICK_TIMER', () => {
    it('decrements remaining seconds', () => {
      const state = stateWith({
        sleepTimer: { isActive: true, remainingSeconds: 10, fadeDurationSeconds: 5 },
      })
      const result = audioReducer(state, { type: 'TICK_TIMER' })
      expect(result.sleepTimer?.remainingSeconds).toBe(9)
    })

    it('stops everything when timer reaches 0', () => {
      const state = stateWith({
        sleepTimer: { isActive: true, remainingSeconds: 1, fadeDurationSeconds: 5 },
        isPlaying: true,
        pillVisible: true,
        activeSounds: [{ soundId: 'rain', volume: 0.6, label: 'Rain' }],
      })
      const result = audioReducer(state, { type: 'TICK_TIMER' })
      expect(result.sleepTimer).toBeNull()
      expect(result.isPlaying).toBe(false)
      expect(result.pillVisible).toBe(false)
      expect(result.activeSounds).toHaveLength(0)
    })
  })

  describe('ADVANCE_ROUTINE_STEP / SKIP_ROUTINE_STEP', () => {
    const routineState = stateWith({
      activeRoutine: {
        routineId: 'r1',
        currentStepIndex: 0,
        steps: [
          { stepId: 's1', label: 'Step 1', icon: 'play' },
          { stepId: 's2', label: 'Step 2', icon: 'play' },
        ],
      },
    })

    it('advances to next step', () => {
      const result = audioReducer(routineState, { type: 'ADVANCE_ROUTINE_STEP' })
      expect(result.activeRoutine?.currentStepIndex).toBe(1)
    })

    it('clears routine when advancing past last step', () => {
      const state = stateWith({
        activeRoutine: { ...routineState.activeRoutine!, currentStepIndex: 1 },
      })
      const result = audioReducer(state, { type: 'ADVANCE_ROUTINE_STEP' })
      expect(result.activeRoutine).toBeNull()
    })

    it('skip behaves same as advance', () => {
      const result = audioReducer(routineState, { type: 'SKIP_ROUTINE_STEP' })
      expect(result.activeRoutine?.currentStepIndex).toBe(1)
    })
  })
})
