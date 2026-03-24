import { renderHook, act } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useAudioDucking } from '../useAudioDucking'

function createMockEngine() {
  return {
    setMasterVolume: vi.fn(),
  } as unknown as import('@/lib/audio-engine').AudioEngineService
}

describe('useAudioDucking', () => {
  it('duckForVerse ramps gain to 25% of current volume', () => {
    const engine = createMockEngine()
    const { result } = renderHook(() =>
      useAudioDucking({
        engine,
        activeSoundsCount: 3,
        masterVolume: 0.8,
        sleepTimerPhase: null,
      }),
    )

    act(() => {
      result.current.duckForVerse()
    })

    expect(engine.setMasterVolume).toHaveBeenCalledWith(0.8 * 0.25)
  })

  it('unduckForPause restores volume to original', () => {
    const engine = createMockEngine()
    const { result } = renderHook(() =>
      useAudioDucking({
        engine,
        activeSoundsCount: 3,
        masterVolume: 0.8,
        sleepTimerPhase: null,
      }),
    )

    act(() => {
      result.current.duckForVerse()
    })

    act(() => {
      result.current.unduckForPause()
    })

    expect(engine.setMasterVolume).toHaveBeenLastCalledWith(0.8)
  })

  it('unduckImmediate restores volume directly', () => {
    const engine = createMockEngine()
    const { result } = renderHook(() =>
      useAudioDucking({
        engine,
        activeSoundsCount: 3,
        masterVolume: 0.8,
        sleepTimerPhase: null,
      }),
    )

    act(() => {
      result.current.duckForVerse()
    })

    act(() => {
      result.current.unduckImmediate()
    })

    expect(engine.setMasterVolume).toHaveBeenLastCalledWith(0.8)
  })

  it('no-op when no ambient sounds', () => {
    const engine = createMockEngine()
    const { result } = renderHook(() =>
      useAudioDucking({
        engine,
        activeSoundsCount: 0,
        masterVolume: 0.8,
        sleepTimerPhase: null,
      }),
    )

    act(() => {
      result.current.duckForVerse()
    })

    expect(engine.setMasterVolume).not.toHaveBeenCalled()
  })

  it('no-op when volume already below 25%', () => {
    const engine = createMockEngine()
    const { result } = renderHook(() =>
      useAudioDucking({
        engine,
        activeSoundsCount: 3,
        masterVolume: 0.2,
        sleepTimerPhase: null,
      }),
    )

    act(() => {
      result.current.duckForVerse()
    })

    // Volume is 0.2 which is <= 0.25, so should not reduce further
    expect(engine.setMasterVolume).not.toHaveBeenCalled()
  })

  it('no-op when engine is null', () => {
    const { result } = renderHook(() =>
      useAudioDucking({
        engine: null,
        activeSoundsCount: 3,
        masterVolume: 0.8,
        sleepTimerPhase: null,
      }),
    )

    // Should not throw
    act(() => {
      result.current.duckForVerse()
      result.current.unduckForPause()
      result.current.unduckImmediate()
      result.current.unduckWithRamp()
    })
  })
})
