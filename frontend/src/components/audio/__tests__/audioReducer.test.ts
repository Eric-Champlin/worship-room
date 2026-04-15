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
        routineName: 'Test Routine',
        currentStepIndex: 0,
        phase: 'playing' as const,
        sleepTimerConfig: { durationMinutes: 30, fadeDurationMinutes: 10 },
        steps: [
          { stepId: 's1', type: 'scene' as const, contentId: 'still-waters', label: 'Step 1', icon: 'play', transitionGapMinutes: 0 },
          { stepId: 's2', type: 'scripture' as const, contentId: 'psalm-23', label: 'Step 2', icon: 'play', transitionGapMinutes: 2 },
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

    it('ADVANCE_ROUTINE_STEP resets phase to playing', () => {
      const gapState = stateWith({
        activeRoutine: { ...routineState.activeRoutine!, phase: 'transition-gap' as const },
      })
      const result = audioReducer(gapState, { type: 'ADVANCE_ROUTINE_STEP' })
      expect(result.activeRoutine?.phase).toBe('playing')
    })

    it('SKIP_ROUTINE_STEP resets phase to playing', () => {
      const gapState = stateWith({
        activeRoutine: { ...routineState.activeRoutine!, phase: 'transition-gap' as const },
      })
      const result = audioReducer(gapState, { type: 'SKIP_ROUTINE_STEP' })
      expect(result.activeRoutine?.phase).toBe('playing')
    })
  })

  describe('START_ROUTINE', () => {
    it('sets activeRoutine with phase playing', () => {
      const routine = {
        routineId: 'r1',
        routineName: 'Test Routine',
        currentStepIndex: 0,
        phase: 'playing' as const,
        sleepTimerConfig: { durationMinutes: 30, fadeDurationMinutes: 10 },
        steps: [
          { stepId: 's1', type: 'scene' as const, contentId: 'still-waters', label: 'Step 1', icon: 'play', transitionGapMinutes: 0 },
        ],
      }
      const result = audioReducer(initialAudioState, { type: 'START_ROUTINE', payload: routine })
      expect(result.activeRoutine).not.toBeNull()
      expect(result.activeRoutine?.phase).toBe('playing')
      expect(result.isPlaying).toBe(true)
      expect(result.pillVisible).toBe(true)
    })
  })

  describe('SET_ROUTINE_PHASE', () => {
    it('updates phase to transition-gap', () => {
      const state = stateWith({
        activeRoutine: {
          routineId: 'r1',
          routineName: 'Test Routine',
          currentStepIndex: 0,
          phase: 'playing' as const,
          sleepTimerConfig: { durationMinutes: 30, fadeDurationMinutes: 10 },
          steps: [
            { stepId: 's1', type: 'scene' as const, contentId: 'still-waters', label: 'Step 1', icon: 'play', transitionGapMinutes: 0 },
          ],
        },
      })
      const result = audioReducer(state, { type: 'SET_ROUTINE_PHASE', payload: { phase: 'transition-gap' } })
      expect(result.activeRoutine?.phase).toBe('transition-gap')
    })

    it('updates phase to ambient-only', () => {
      const state = stateWith({
        activeRoutine: {
          routineId: 'r1',
          routineName: 'Test Routine',
          currentStepIndex: 0,
          phase: 'playing' as const,
          sleepTimerConfig: { durationMinutes: 30, fadeDurationMinutes: 10 },
          steps: [
            { stepId: 's1', type: 'scene' as const, contentId: 'still-waters', label: 'Step 1', icon: 'play', transitionGapMinutes: 0 },
          ],
        },
      })
      const result = audioReducer(state, { type: 'SET_ROUTINE_PHASE', payload: { phase: 'ambient-only' } })
      expect(result.activeRoutine?.phase).toBe('ambient-only')
    })

    it('returns state unchanged when no routine active', () => {
      const result = audioReducer(initialAudioState, { type: 'SET_ROUTINE_PHASE', payload: { phase: 'transition-gap' } })
      expect(result).toBe(initialAudioState)
    })
  })

  describe('END_ROUTINE', () => {
    it('clears activeRoutine', () => {
      const state = stateWith({
        activeRoutine: {
          routineId: 'r1',
          routineName: 'Test Routine',
          currentStepIndex: 0,
          phase: 'playing' as const,
          sleepTimerConfig: { durationMinutes: 30, fadeDurationMinutes: 10 },
          steps: [
            { stepId: 's1', type: 'scene' as const, contentId: 'still-waters', label: 'Step 1', icon: 'play', transitionGapMinutes: 0 },
          ],
        },
      })
      const result = audioReducer(state, { type: 'END_ROUTINE' })
      expect(result.activeRoutine).toBeNull()
    })
  })

  describe('STOP_ALL clears activeRoutine', () => {
    it('nulls activeRoutine on STOP_ALL', () => {
      const state = stateWith({
        activeRoutine: {
          routineId: 'r1',
          routineName: 'Test Routine',
          currentStepIndex: 0,
          phase: 'playing' as const,
          sleepTimerConfig: { durationMinutes: 30, fadeDurationMinutes: 10 },
          steps: [
            { stepId: 's1', type: 'scene' as const, contentId: 'still-waters', label: 'Step 1', icon: 'play', transitionGapMinutes: 0 },
          ],
        },
      })
      const result = audioReducer(state, { type: 'STOP_ALL' })
      expect(result.activeRoutine).toBeNull()
    })
  })

  describe('SET_READING_CONTEXT / CLEAR_READING_CONTEXT (BB-20)', () => {
    it('SET_READING_CONTEXT sets context', () => {
      const result = audioReducer(initialAudioState, {
        type: 'SET_READING_CONTEXT',
        payload: { book: 'John', chapter: 3 },
      })
      expect(result.readingContext).toEqual({ book: 'John', chapter: 3 })
    })

    it('CLEAR_READING_CONTEXT clears context', () => {
      const state = stateWith({
        readingContext: { book: 'John', chapter: 3 },
      })
      const result = audioReducer(state, { type: 'CLEAR_READING_CONTEXT' })
      expect(result.readingContext).toBeNull()
    })

    it('initialAudioState has readingContext: null', () => {
      expect(initialAudioState.readingContext).toBeNull()
    })
  })

  describe('PAUSE_BY_BIBLE_AUDIO (BB-27)', () => {
    it('captures snapshot when ambient is playing', () => {
      const state = stateWith({
        activeSounds: [{ soundId: 'rain', volume: 0.6, label: 'Rain' }],
        masterVolume: 0.7,
        isPlaying: true,
        pillVisible: true,
      })
      const result = audioReducer(state, { type: 'PAUSE_BY_BIBLE_AUDIO' })
      expect(result.pausedByBibleAudio).toEqual({
        activeSounds: [{ soundId: 'rain', volume: 0.6, label: 'Rain' }],
        masterVolume: 0.7,
      })
      expect(result.isPlaying).toBe(false)
      // activeSounds preserved — sounds are suspended, not removed
      expect(result.activeSounds).toHaveLength(1)
    })

    it('is no-op when no ambient playing', () => {
      const state = stateWith({
        activeSounds: [],
        isPlaying: false,
      })
      const result = audioReducer(state, { type: 'PAUSE_BY_BIBLE_AUDIO' })
      expect(result.pausedByBibleAudio).toBeNull()
    })

    it('captures multiple sounds in snapshot', () => {
      const state = stateWith({
        activeSounds: [
          { soundId: 'rain', volume: 0.6, label: 'Rain' },
          { soundId: 'fire', volume: 0.4, label: 'Fireplace' },
        ],
        masterVolume: 0.8,
        isPlaying: true,
      })
      const result = audioReducer(state, { type: 'PAUSE_BY_BIBLE_AUDIO' })
      expect(result.pausedByBibleAudio?.activeSounds).toHaveLength(2)
      expect(result.pausedByBibleAudio?.masterVolume).toBe(0.8)
    })
  })

  describe('RESUME_FROM_BIBLE_AUDIO (BB-27)', () => {
    it('restores playback when snapshot exists', () => {
      const state = stateWith({
        activeSounds: [{ soundId: 'rain', volume: 0.6, label: 'Rain' }],
        isPlaying: false,
        pausedByBibleAudio: {
          activeSounds: [{ soundId: 'rain', volume: 0.6, label: 'Rain' }],
          masterVolume: 0.7,
        },
      })
      const result = audioReducer(state, { type: 'RESUME_FROM_BIBLE_AUDIO' })
      expect(result.pausedByBibleAudio).toBeNull()
      expect(result.isPlaying).toBe(true)
    })

    it('is no-op when snapshot is null', () => {
      const state = stateWith({ pausedByBibleAudio: null })
      const result = audioReducer(state, { type: 'RESUME_FROM_BIBLE_AUDIO' })
      expect(result.pausedByBibleAudio).toBeNull()
      expect(result.isPlaying).toBe(false)
    })

    it('is no-op when snapshot has empty activeSounds', () => {
      const state = stateWith({
        pausedByBibleAudio: {
          activeSounds: [],
          masterVolume: 0.8,
        },
      })
      const result = audioReducer(state, { type: 'RESUME_FROM_BIBLE_AUDIO' })
      expect(result.pausedByBibleAudio).toBeNull()
      expect(result.isPlaying).toBe(false)
    })
  })

  describe('BB-27 user-initiated actions clear pausedByBibleAudio', () => {
    const snapshotState = stateWith({
      activeSounds: [{ soundId: 'rain', volume: 0.6, label: 'Rain' }],
      pausedByBibleAudio: {
        activeSounds: [{ soundId: 'rain', volume: 0.6, label: 'Rain' }],
        masterVolume: 0.8,
      },
    })

    it('ADD_SOUND clears pausedByBibleAudio', () => {
      const result = audioReducer(snapshotState, {
        type: 'ADD_SOUND',
        payload: { soundId: 'waves', volume: 0.5, label: 'Waves', url: '/audio/waves.mp3' },
      })
      expect(result.pausedByBibleAudio).toBeNull()
    })

    it('REMOVE_SOUND clears pausedByBibleAudio', () => {
      const result = audioReducer(snapshotState, {
        type: 'REMOVE_SOUND',
        payload: { soundId: 'rain' },
      })
      expect(result.pausedByBibleAudio).toBeNull()
    })

    it('PLAY_ALL clears pausedByBibleAudio', () => {
      const result = audioReducer(snapshotState, { type: 'PLAY_ALL' })
      expect(result.pausedByBibleAudio).toBeNull()
    })

    it('PAUSE_ALL clears pausedByBibleAudio', () => {
      const result = audioReducer(snapshotState, { type: 'PAUSE_ALL' })
      expect(result.pausedByBibleAudio).toBeNull()
    })

    it('STOP_ALL clears pausedByBibleAudio', () => {
      const result = audioReducer(snapshotState, { type: 'STOP_ALL' })
      expect(result.pausedByBibleAudio).toBeNull()
    })

    it('SET_MASTER_VOLUME clears pausedByBibleAudio', () => {
      const result = audioReducer(snapshotState, {
        type: 'SET_MASTER_VOLUME',
        payload: { volume: 0.5 },
      })
      expect(result.pausedByBibleAudio).toBeNull()
    })

    it('SET_SOUND_VOLUME clears pausedByBibleAudio', () => {
      const result = audioReducer(snapshotState, {
        type: 'SET_SOUND_VOLUME',
        payload: { soundId: 'rain', volume: 0.3 },
      })
      expect(result.pausedByBibleAudio).toBeNull()
    })

    it('SET_SCENE_NAME clears pausedByBibleAudio', () => {
      const result = audioReducer(snapshotState, {
        type: 'SET_SCENE_NAME',
        payload: { sceneName: 'Garden', sceneId: 'garden' },
      })
      expect(result.pausedByBibleAudio).toBeNull()
    })

    it('START_FOREGROUND clears pausedByBibleAudio', () => {
      const result = audioReducer(snapshotState, {
        type: 'START_FOREGROUND',
        payload: { contentId: '1', contentType: 'scripture', title: 'Psalm 23', duration: 120 },
      })
      expect(result.pausedByBibleAudio).toBeNull()
    })

    it('PAUSE_FOREGROUND clears pausedByBibleAudio', () => {
      const stateWithFg = stateWith({
        ...snapshotState,
        foregroundContent: {
          contentId: '1',
          contentType: 'scripture' as const,
          title: 'Psalm 23',
          duration: 120,
          playbackPosition: 30,
          isPlaying: true,
        },
      })
      const result = audioReducer(stateWithFg, { type: 'PAUSE_FOREGROUND' })
      expect(result.pausedByBibleAudio).toBeNull()
    })

    it('SET_FOREGROUND_BACKGROUND_BALANCE clears pausedByBibleAudio', () => {
      const result = audioReducer(snapshotState, {
        type: 'SET_FOREGROUND_BACKGROUND_BALANCE',
        payload: { balance: 0.7 },
      })
      expect(result.pausedByBibleAudio).toBeNull()
    })
  })

  describe('BB-27 non-user actions do NOT clear pausedByBibleAudio', () => {
    const snapshotState = stateWith({
      pausedByBibleAudio: {
        activeSounds: [{ soundId: 'rain', volume: 0.6, label: 'Rain' }],
        masterVolume: 0.8,
      },
    })

    it('TICK_TIMER does not clear pausedByBibleAudio', () => {
      const result = audioReducer(snapshotState, { type: 'TICK_TIMER' })
      expect(result.pausedByBibleAudio).not.toBeNull()
    })

    it('OPEN_DRAWER does not clear pausedByBibleAudio', () => {
      const result = audioReducer(snapshotState, { type: 'OPEN_DRAWER' })
      expect(result.pausedByBibleAudio).not.toBeNull()
    })

    it('CLOSE_DRAWER does not clear pausedByBibleAudio', () => {
      const result = audioReducer(snapshotState, { type: 'CLOSE_DRAWER' })
      expect(result.pausedByBibleAudio).not.toBeNull()
    })

    it('SET_READING_CONTEXT does not clear pausedByBibleAudio', () => {
      const result = audioReducer(snapshotState, {
        type: 'SET_READING_CONTEXT',
        payload: { book: 'John', chapter: 3 },
      })
      expect(result.pausedByBibleAudio).not.toBeNull()
    })

    it('CLEAR_READING_CONTEXT does not clear pausedByBibleAudio', () => {
      const result = audioReducer(snapshotState, { type: 'CLEAR_READING_CONTEXT' })
      expect(result.pausedByBibleAudio).not.toBeNull()
    })
  })

  it('initialAudioState has pausedByBibleAudio: null (BB-27)', () => {
    expect(initialAudioState.pausedByBibleAudio).toBeNull()
  })
})
