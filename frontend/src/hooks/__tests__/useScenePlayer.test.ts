import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useScenePlayer } from '../useScenePlayer'
import type { ScenePreset } from '@/types/music'
import type { AudioState } from '@/types/audio'

// ── Mocks ────────────────────────────────────────────────────────────

const mockOpenAuthModal = vi.fn()
const mockDispatch = vi.fn()

const mockEngine = {
  addSound: vi.fn().mockResolvedValue(undefined),
  removeSound: vi.fn(),
  isBufferCached: vi.fn().mockReturnValue(false),
}

let mockIsAuthenticated = false
let mockActiveSounds: AudioState['activeSounds'] = []
let mockIsPlaying = false
let mockCurrentSceneName: string | null = null
let mockForegroundContent: AudioState['foregroundContent'] = null
let mockActiveRoutine: AudioState['activeRoutine'] = null

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, isAuthenticated: mockIsAuthenticated }),
}))

vi.mock('@/components/prayer-wall/AuthModalProvider', () => ({
  useAuthModal: () => ({ openAuthModal: mockOpenAuthModal }),
}))

vi.mock('@/components/audio/AudioProvider', () => ({
  useAudioState: () => ({
    activeSounds: mockActiveSounds,
    masterVolume: 0.8,
    isPlaying: mockIsPlaying,
    pillVisible: false,
    drawerOpen: false,
    foregroundContent: mockForegroundContent,
    foregroundBackgroundBalance: 0.5,
    sleepTimer: null,
    activeRoutine: mockActiveRoutine,
    currentSceneName: mockCurrentSceneName,
  }),
  useAudioDispatch: () => mockDispatch,
  useAudioEngine: () => mockEngine,
}))

vi.mock('@/data/sound-catalog', () => ({
  SOUND_BY_ID: new Map([
    ['night-crickets', { id: 'night-crickets', name: 'Night Crickets', filename: 'night-crickets.mp3', category: 'nature', lucideIcon: 'Bug', loopDurationMs: 240000, tags: { mood: ['peaceful'], activity: ['sleep'], intensity: 'very_calm' } }],
    ['gentle-wind', { id: 'gentle-wind', name: 'Gentle Wind', filename: 'wind-gentle.mp3', category: 'nature', lucideIcon: 'Wind', loopDurationMs: 240000, tags: { mood: ['peaceful'], activity: ['relaxation'], intensity: 'very_calm' } }],
    ['night-garden', { id: 'night-garden', name: 'Night Garden', filename: 'night-garden.mp3', category: 'nature', lucideIcon: 'Flower2', loopDurationMs: 240000, tags: { mood: ['peaceful'], activity: ['sleep'], intensity: 'very_calm' } }],
    ['singing-bowl', { id: 'singing-bowl', name: 'Singing Bowl', filename: 'singing-bowl.mp3', category: 'instruments', lucideIcon: 'Circle', loopDurationMs: 120000, tags: { mood: ['contemplative'], activity: ['prayer'], intensity: 'very_calm' } }],
  ]),
}))

// ── Test data ────────────────────────────────────────────────────────

const GARDEN_SCENE: ScenePreset = {
  id: 'garden-of-gethsemane',
  name: 'Garden of Gethsemane',
  description: 'Olive trees rustle in a warm evening breeze.',
  artworkFilename: 'garden-of-gethsemane.svg',
  sounds: [
    { soundId: 'night-crickets', volume: 0.55 },
    { soundId: 'gentle-wind', volume: 0.35 },
    { soundId: 'night-garden', volume: 0.45 },
    { soundId: 'singing-bowl', volume: 0.15 },
  ],
  tags: {
    mood: ['contemplative'],
    activity: ['prayer'],
    intensity: 'very_calm',
    scriptureTheme: ['trust'],
  },
  animationCategory: 'pulse',
}

// ── Tests ────────────────────────────────────────────────────────────

describe('useScenePlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mockIsAuthenticated = false
    mockActiveSounds = []
    mockIsPlaying = false
    mockCurrentSceneName = null
    mockForegroundContent = null
    mockActiveRoutine = null
    mockEngine.addSound.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('opens auth modal when user is not logged in', () => {
    mockIsAuthenticated = false
    const { result } = renderHook(() => useScenePlayer())

    act(() => {
      result.current.loadScene(GARDEN_SCENE)
    })

    expect(mockOpenAuthModal).toHaveBeenCalledWith('Sign in to play ambient scenes')
    expect(mockDispatch).not.toHaveBeenCalled()
  })

  it('loads scene sounds at preset volumes (not default 0.6)', async () => {
    mockIsAuthenticated = true
    const { result } = renderHook(() => useScenePlayer())

    act(() => {
      result.current.loadScene(GARDEN_SCENE)
    })

    // Advance through staggered loading (4 sounds * 200ms = 800ms)
    await act(async () => {
      vi.advanceTimersByTime(1000)
    })

    // Verify ADD_SOUND dispatches use scene preset volumes
    const addSoundCalls = mockDispatch.mock.calls.filter(
      (call) => call[0].type === 'ADD_SOUND',
    )

    expect(addSoundCalls).toHaveLength(4)
    expect(addSoundCalls[0][0].payload.volume).toBe(0.55) // night-crickets
    expect(addSoundCalls[1][0].payload.volume).toBe(0.35) // gentle-wind
    expect(addSoundCalls[2][0].payload.volume).toBe(0.45) // night-garden
    expect(addSoundCalls[3][0].payload.volume).toBe(0.15) // singing-bowl
  })

  it('dispatches SET_SCENE_NAME with scene name', async () => {
    mockIsAuthenticated = true
    const { result } = renderHook(() => useScenePlayer())

    act(() => {
      result.current.loadScene(GARDEN_SCENE)
    })

    const sceneNameCalls = mockDispatch.mock.calls.filter(
      (call) => call[0].type === 'SET_SCENE_NAME',
    )

    expect(sceneNameCalls).toHaveLength(1)
    expect(sceneNameCalls[0][0].payload.sceneName).toBe('Garden of Gethsemane')
  })

  it('undo is available for 5 seconds after scene switch', async () => {
    mockIsAuthenticated = true
    // Simulate existing active sounds (a scene switch scenario)
    mockActiveSounds = [
      { soundId: 'gentle-wind', volume: 0.5, label: 'Gentle Wind' },
    ]

    const { result } = renderHook(() => useScenePlayer())

    act(() => {
      result.current.loadScene(GARDEN_SCENE)
    })

    expect(result.current.undoAvailable).toBe(true)

    // Advance to just before undo expiry
    act(() => {
      vi.advanceTimersByTime(4900)
    })
    expect(result.current.undoAvailable).toBe(true)

    // Advance past undo window
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(result.current.undoAvailable).toBe(false)
  })

  it('undo restores previous mix and scene name', async () => {
    mockIsAuthenticated = true
    mockCurrentSceneName = 'Still Waters'
    mockActiveSounds = [
      { soundId: 'gentle-wind', volume: 0.5, label: 'Gentle Wind' },
    ]

    const { result } = renderHook(() => useScenePlayer())

    act(() => {
      result.current.loadScene(GARDEN_SCENE)
    })

    // Clear dispatch history from the scene load
    mockDispatch.mockClear()

    // Now set activeSounds to what the new scene would have loaded
    mockActiveSounds = [
      { soundId: 'night-crickets', volume: 0.55, label: 'Night Crickets' },
      { soundId: 'gentle-wind', volume: 0.35, label: 'Gentle Wind' },
      { soundId: 'night-garden', volume: 0.45, label: 'Night Garden' },
      { soundId: 'singing-bowl', volume: 0.15, label: 'Singing Bowl' },
    ]

    act(() => {
      result.current.undoSceneSwitch()
    })

    expect(result.current.undoAvailable).toBe(false)

    // Should have removed current scene sounds
    const removeCalls = mockDispatch.mock.calls.filter(
      (call) => call[0].type === 'REMOVE_SOUND',
    )
    expect(removeCalls.length).toBeGreaterThan(0)

    // Should restore previous sounds
    const addCalls = mockDispatch.mock.calls.filter(
      (call) => call[0].type === 'ADD_SOUND',
    )
    expect(addCalls).toHaveLength(1)
    expect(addCalls[0][0].payload.soundId).toBe('gentle-wind')
    expect(addCalls[0][0].payload.volume).toBe(0.5)

    // Should restore previous scene name
    const sceneNameCalls = mockDispatch.mock.calls.filter(
      (call) => call[0].type === 'SET_SCENE_NAME',
    )
    expect(sceneNameCalls).toHaveLength(1)
    expect(sceneNameCalls[0][0].payload.sceneName).toBe('Still Waters')
  })

  it('sets pendingRoutineInterrupt when routine is active', () => {
    mockIsAuthenticated = true
    mockActiveRoutine = {
      routineId: 'r1',
      routineName: 'Test Routine',
      currentStepIndex: 0,
      phase: 'playing',
      sleepTimerConfig: { durationMinutes: 30, fadeDurationMinutes: 10 },
      steps: [
        { stepId: 's1', type: 'scene', contentId: 'still-waters', label: 'Still Waters', icon: 'Mountain', transitionGapMinutes: 0 },
      ],
    }

    const { result } = renderHook(() => useScenePlayer())

    act(() => {
      result.current.loadScene(GARDEN_SCENE)
    })

    expect(result.current.pendingRoutineInterrupt).not.toBeNull()
    expect(result.current.pendingRoutineInterrupt?.scene.id).toBe('garden-of-gethsemane')
    expect(mockDispatch).not.toHaveBeenCalled()
  })
})
