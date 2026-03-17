import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useRoutinePlayer } from '../useRoutinePlayer'
import type { AudioState } from '@/types/audio'
import type { RoutineDefinition } from '@/types/storage'

// ── Mocks ────────────────────────────────────────────────────────────

const mockOpenAuthModal = vi.fn()
const mockDispatch = vi.fn()
const mockShowToast = vi.fn()

const mockEngine = {
  addSound: vi.fn().mockResolvedValue(undefined),
  removeSound: vi.fn(),
  playForeground: vi.fn().mockReturnValue({
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }),
  crossfadeOutForeground: vi.fn(),
  breatheUpAmbient: vi.fn(),
  getForegroundElement: vi.fn().mockReturnValue(null),
}

let mockIsAuthenticated = false
let mockAudioState: Partial<AudioState> = {}

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, isAuthenticated: mockIsAuthenticated }),
}))

vi.mock('@/components/prayer-wall/AuthModalProvider', () => ({
  useAuthModal: () => ({ openAuthModal: mockOpenAuthModal }),
}))

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}))

vi.mock('@/components/audio/AudioProvider', () => ({
  useAudioState: () => ({
    activeSounds: [],
    masterVolume: 0.8,
    isPlaying: false,
    pillVisible: false,
    drawerOpen: false,
    foregroundContent: null,
    foregroundBackgroundBalance: 0.5,
    sleepTimer: null,
    activeRoutine: null,
    currentSceneName: null,
    currentSceneId: null,
    ...mockAudioState,
  }),
  useAudioDispatch: () => mockDispatch,
  useAudioEngine: () => mockEngine,
}))

vi.mock('@/data/sound-catalog', () => ({
  SOUND_BY_ID: new Map([
    ['flowing-stream', { id: 'flowing-stream', name: 'Flowing Stream', filename: 'flowing-stream.mp3', category: 'nature', lucideIcon: 'Waves', loopDurationMs: 240000, tags: { mood: ['peaceful'], activity: ['prayer'], intensity: 'very_calm' } }],
    ['gentle-wind', { id: 'gentle-wind', name: 'Gentle Wind', filename: 'wind-gentle.mp3', category: 'nature', lucideIcon: 'Wind', loopDurationMs: 240000, tags: { mood: ['peaceful'], activity: ['relaxation'], intensity: 'very_calm' } }],
    ['forest-birds', { id: 'forest-birds', name: 'Forest Birds', filename: 'forest-birds.mp3', category: 'nature', lucideIcon: 'Bird', loopDurationMs: 240000, tags: { mood: ['uplifting'], activity: ['prayer'], intensity: 'moderate' } }],
    ['gentle-harp', { id: 'gentle-harp', name: 'Gentle Harp', filename: 'gentle-harp.mp3', category: 'instruments', lucideIcon: 'Music', loopDurationMs: 180000, tags: { mood: ['peaceful'], activity: ['relaxation'], intensity: 'very_calm' } }],
  ]),
}))

vi.mock('@/services/storage-service', () => ({
  storageService: {
    logListeningSession: vi.fn(),
  },
}))

// ── Test data ────────────────────────────────────────────────────────

const TEST_ROUTINE: RoutineDefinition = {
  id: 'template-evening-peace',
  name: 'Evening Peace',
  description: 'Ease into rest',
  isTemplate: true,
  steps: [
    { id: 'ep-1', type: 'scene', contentId: 'still-waters', transitionGapMinutes: 0 },
    { id: 'ep-2', type: 'scripture', contentId: 'psalm-23', transitionGapMinutes: 2 },
  ],
  sleepTimer: { durationMinutes: 45, fadeDurationMinutes: 15 },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

describe('useRoutinePlayer', () => {
  beforeEach(() => {
    mockIsAuthenticated = false
    mockAudioState = {}
    vi.clearAllMocks()
  })

  it('shows auth modal when startRoutine called while logged out', () => {
    const { result } = renderHook(() => useRoutinePlayer())

    act(() => {
      result.current.startRoutine(TEST_ROUTINE)
    })

    expect(mockOpenAuthModal).toHaveBeenCalledWith(
      'Sign in to use bedtime routines',
    )
    expect(mockDispatch).not.toHaveBeenCalled()
  })

  it('dispatches START_ROUTINE when logged in', () => {
    mockIsAuthenticated = true

    const { result } = renderHook(() => useRoutinePlayer())

    act(() => {
      result.current.startRoutine(TEST_ROUTINE)
    })

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'START_ROUTINE',
        payload: expect.objectContaining({
          routineId: 'template-evening-peace',
          currentStepIndex: 0,
          phase: 'playing',
        }),
      }),
    )
  })

  it('endRoutine dispatches END_ROUTINE', () => {
    mockIsAuthenticated = true
    mockAudioState = {
      activeRoutine: {
        routineId: 'r1',
        routineName: 'Test Routine',
        currentStepIndex: 0,
        phase: 'playing',
        sleepTimerConfig: { durationMinutes: 30, fadeDurationMinutes: 10 },
        steps: [
          { stepId: 's1', type: 'scene', contentId: 'still-waters', label: 'Still Waters', icon: 'Landscape', transitionGapMinutes: 0 },
        ],
      },
    }

    const { result } = renderHook(() => useRoutinePlayer())

    act(() => {
      result.current.endRoutine()
    })

    expect(mockDispatch).toHaveBeenCalledWith({ type: 'END_ROUTINE' })
  })

  it('skipStep calls advanceToNextStep', () => {
    mockIsAuthenticated = true
    mockAudioState = {
      activeRoutine: {
        routineId: 'r1',
        routineName: 'Test Routine',
        currentStepIndex: 0,
        phase: 'playing',
        sleepTimerConfig: { durationMinutes: 30, fadeDurationMinutes: 10 },
        steps: [
          { stepId: 's1', type: 'scene', contentId: 'still-waters', label: 'Still Waters', icon: 'Landscape', transitionGapMinutes: 0 },
          { stepId: 's2', type: 'scripture', contentId: 'psalm-23', label: 'Psalm 23', icon: 'BookOpen', transitionGapMinutes: 2 },
        ],
      },
    }

    const { result } = renderHook(() => useRoutinePlayer())

    act(() => {
      result.current.skipStep()
    })

    expect(mockDispatch).toHaveBeenCalledWith({ type: 'ADVANCE_ROUTINE_STEP' })
  })

  it('isRoutineActive reflects state', () => {
    mockAudioState = {
      activeRoutine: {
        routineId: 'r1',
        routineName: 'Test Routine',
        currentStepIndex: 0,
        phase: 'playing',
        sleepTimerConfig: { durationMinutes: 30, fadeDurationMinutes: 10 },
        steps: [
          { stepId: 's1', type: 'scene', contentId: 'still-waters', label: 'Still Waters', icon: 'Landscape', transitionGapMinutes: 0 },
        ],
      },
    }

    const { result } = renderHook(() => useRoutinePlayer())
    expect(result.current.isRoutineActive).toBe(true)
  })

  it('isRoutineActive false when no routine', () => {
    const { result } = renderHook(() => useRoutinePlayer())
    expect(result.current.isRoutineActive).toBe(false)
  })

  it('START_ROUTINE payload maps step labels and icons correctly', () => {
    mockIsAuthenticated = true

    const { result } = renderHook(() => useRoutinePlayer())

    act(() => {
      result.current.startRoutine(TEST_ROUTINE)
    })

    const payload = mockDispatch.mock.calls[0][0].payload
    expect(payload.steps[0].icon).toBe('Mountain')
    expect(payload.steps[1].icon).toBe('BookOpen')
    expect(payload.steps[0].label).toBe('Still Waters')
  })
})
