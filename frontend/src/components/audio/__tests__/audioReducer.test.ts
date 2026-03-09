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

    it('sets pillVisible=false when removing the last sound and no foreground content', () => {
      const state = stateWith({
        activeSounds: [{ soundId: 'rain', volume: 0.6, label: 'Rain' }],
        pillVisible: true,
        isPlaying: true,
        foregroundContent: null,
      })
      const result = audioReducer(state, {
        type: 'REMOVE_SOUND',
        payload: { soundId: 'rain' },
      })
      expect(result.pillVisible).toBe(false)
      expect(result.isPlaying).toBe(false)
    })

    it('keeps pillVisible=true when foreground content is active', () => {
      const state = stateWith({
        activeSounds: [{ soundId: 'rain', volume: 0.6, label: 'Rain' }],
        pillVisible: true,
        isPlaying: true,
        foregroundContent: {
          contentId: '1',
          contentType: 'scripture',
          title: 'Psalm 23',
          duration: 120,
          playbackPosition: 30,
          isPlaying: true,
        },
      })
      const result = audioReducer(state, {
        type: 'REMOVE_SOUND',
        payload: { soundId: 'rain' },
      })
      expect(result.pillVisible).toBe(true)
      expect(result.isPlaying).toBe(true)
    })

    it('keeps isPlaying=true when other sounds remain', () => {
      const state = stateWith({
        activeSounds: [
          { soundId: 'rain', volume: 0.6, label: 'Rain' },
          { soundId: 'fire', volume: 0.5, label: 'Fireplace' },
        ],
        pillVisible: true,
        isPlaying: true,
      })
      const result = audioReducer(state, {
        type: 'REMOVE_SOUND',
        payload: { soundId: 'rain' },
      })
      expect(result.activeSounds).toHaveLength(1)
      expect(result.pillVisible).toBe(true)
      expect(result.isPlaying).toBe(true)
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

  describe('TICK_TIMER (legacy)', () => {
    it('returns state unchanged (backward-compat no-op)', () => {
      const state = stateWith({
        sleepTimer: {
          isActive: true,
          isPaused: false,
          totalDurationMs: 60000,
          fadeDurationMs: 10000,
          startTime: Date.now(),
          pausedElapsedMs: 0,
          phase: 'full-volume',
        },
      })
      const result = audioReducer(state, { type: 'TICK_TIMER' })
      expect(result).toBe(state)
    })
  })

  describe('START_SLEEP_TIMER', () => {
    it('creates active timer with correct fields', () => {
      const before = Date.now()
      const result = audioReducer(initialAudioState, {
        type: 'START_SLEEP_TIMER',
        payload: { totalDurationMs: 3600000, fadeDurationMs: 600000 },
      })
      expect(result.sleepTimer).not.toBeNull()
      expect(result.sleepTimer!.isActive).toBe(true)
      expect(result.sleepTimer!.isPaused).toBe(false)
      expect(result.sleepTimer!.totalDurationMs).toBe(3600000)
      expect(result.sleepTimer!.fadeDurationMs).toBe(600000)
      expect(result.sleepTimer!.startTime).toBeGreaterThanOrEqual(before)
      expect(result.sleepTimer!.pausedElapsedMs).toBe(0)
      expect(result.sleepTimer!.phase).toBe('full-volume')
    })
  })

  describe('PAUSE_SLEEP_TIMER', () => {
    it('sets isPaused and accumulates elapsed time', () => {
      const startTime = Date.now() - 5000
      const state = stateWith({
        sleepTimer: {
          isActive: true,
          isPaused: false,
          totalDurationMs: 60000,
          fadeDurationMs: 10000,
          startTime,
          pausedElapsedMs: 0,
          phase: 'full-volume',
        },
      })
      const result = audioReducer(state, { type: 'PAUSE_SLEEP_TIMER' })
      expect(result.sleepTimer!.isPaused).toBe(true)
      expect(result.sleepTimer!.pausedElapsedMs).toBeGreaterThanOrEqual(5000)
    })

    it('does nothing when no timer active', () => {
      const result = audioReducer(initialAudioState, { type: 'PAUSE_SLEEP_TIMER' })
      expect(result.sleepTimer).toBeNull()
    })
  })

  describe('RESUME_SLEEP_TIMER', () => {
    it('clears pause state and sets new startTime', () => {
      const state = stateWith({
        sleepTimer: {
          isActive: true,
          isPaused: true,
          totalDurationMs: 60000,
          fadeDurationMs: 10000,
          startTime: Date.now() - 10000,
          pausedElapsedMs: 8000,
          phase: 'full-volume',
        },
      })
      const before = Date.now()
      const result = audioReducer(state, { type: 'RESUME_SLEEP_TIMER' })
      expect(result.sleepTimer!.isPaused).toBe(false)
      expect(result.sleepTimer!.startTime).toBeGreaterThanOrEqual(before)
      expect(result.sleepTimer!.pausedElapsedMs).toBe(8000)
    })

    it('does nothing when not paused', () => {
      const state = stateWith({
        sleepTimer: {
          isActive: true,
          isPaused: false,
          totalDurationMs: 60000,
          fadeDurationMs: 10000,
          startTime: Date.now(),
          pausedElapsedMs: 0,
          phase: 'full-volume',
        },
      })
      const result = audioReducer(state, { type: 'RESUME_SLEEP_TIMER' })
      expect(result.sleepTimer).toBe(state.sleepTimer)
    })
  })

  describe('CANCEL_SLEEP_TIMER', () => {
    it('clears sleepTimer to null', () => {
      const state = stateWith({
        sleepTimer: {
          isActive: true,
          isPaused: false,
          totalDurationMs: 60000,
          fadeDurationMs: 10000,
          startTime: Date.now(),
          pausedElapsedMs: 0,
          phase: 'full-volume',
        },
      })
      const result = audioReducer(state, { type: 'CANCEL_SLEEP_TIMER' })
      expect(result.sleepTimer).toBeNull()
    })
  })

  describe('COMPLETE_SLEEP_TIMER', () => {
    it('clears timer, pauses audio, keeps pillVisible', () => {
      const state = stateWith({
        sleepTimer: {
          isActive: true,
          isPaused: false,
          totalDurationMs: 60000,
          fadeDurationMs: 10000,
          startTime: Date.now() - 60000,
          pausedElapsedMs: 0,
          phase: 'fading',
        },
        isPlaying: true,
        pillVisible: true,
        activeSounds: [{ soundId: 'rain', volume: 0.6, label: 'Rain' }],
      })
      const result = audioReducer(state, { type: 'COMPLETE_SLEEP_TIMER' })
      expect(result.sleepTimer).toBeNull()
      expect(result.isPlaying).toBe(false)
      expect(result.pillVisible).toBe(true)
    })
  })

  describe('UPDATE_TIMER_PHASE', () => {
    it('updates phase field', () => {
      const state = stateWith({
        sleepTimer: {
          isActive: true,
          isPaused: false,
          totalDurationMs: 60000,
          fadeDurationMs: 10000,
          startTime: Date.now(),
          pausedElapsedMs: 0,
          phase: 'full-volume',
        },
      })
      const result = audioReducer(state, {
        type: 'UPDATE_TIMER_PHASE',
        payload: { phase: 'fading' },
      })
      expect(result.sleepTimer!.phase).toBe('fading')
    })

    it('does nothing when no timer', () => {
      const result = audioReducer(initialAudioState, {
        type: 'UPDATE_TIMER_PHASE',
        payload: { phase: 'fading' },
      })
      expect(result.sleepTimer).toBeNull()
    })
  })

  describe('STOP_ALL clears sleepTimer', () => {
    it('clears sleepTimer along with everything else', () => {
      const state = stateWith({
        sleepTimer: {
          isActive: true,
          isPaused: false,
          totalDurationMs: 60000,
          fadeDurationMs: 10000,
          startTime: Date.now(),
          pausedElapsedMs: 0,
          phase: 'full-volume',
        },
        isPlaying: true,
        pillVisible: true,
      })
      const result = audioReducer(state, { type: 'STOP_ALL' })
      expect(result.sleepTimer).toBeNull()
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
