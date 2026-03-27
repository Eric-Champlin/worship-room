import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'

// Mock audio engine
const mockEnsureContext = vi.fn(() => ({ currentTime: 0 }))
vi.mock('@/components/audio/AudioProvider', () => ({
  useAudioEngine: () => ({ ensureContext: mockEnsureContext }),
}))

// Mock playSound
const mockPlaySound = vi.fn()
vi.mock('@/lib/sound-effects', () => ({
  playSound: (...args: unknown[]) => mockPlaySound(...args),
}))

import { useSoundEffects } from '../useSoundEffects'

describe('useSoundEffects', () => {
  let matchMediaSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    localStorage.clear()
    mockEnsureContext.mockClear()
    mockPlaySound.mockClear()
    matchMediaSpy = vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: false,
    } as MediaQueryList)
  })

  afterEach(() => {
    matchMediaSpy.mockRestore()
  })

  it('returns playSoundEffect function', () => {
    const { result } = renderHook(() => useSoundEffects())
    expect(typeof result.current.playSoundEffect).toBe('function')
  })

  it('plays sound when enabled and no reduced motion', () => {
    const { result } = renderHook(() => useSoundEffects())
    result.current.playSoundEffect('chime')
    expect(mockPlaySound).toHaveBeenCalledWith(expect.anything(), 'chime')
  })

  it('does not play when wr_sound_effects_enabled is "false"', () => {
    localStorage.setItem('wr_sound_effects_enabled', 'false')
    const { result } = renderHook(() => useSoundEffects())
    result.current.playSoundEffect('chime')
    expect(mockPlaySound).not.toHaveBeenCalled()
  })

  it('does not play when prefers-reduced-motion is reduce', () => {
    matchMediaSpy.mockReturnValue({ matches: true } as MediaQueryList)
    const { result } = renderHook(() => useSoundEffects())
    result.current.playSoundEffect('chime')
    expect(mockPlaySound).not.toHaveBeenCalled()
  })

  it('does not play when both disabled', () => {
    localStorage.setItem('wr_sound_effects_enabled', 'false')
    matchMediaSpy.mockReturnValue({ matches: true } as MediaQueryList)
    const { result } = renderHook(() => useSoundEffects())
    result.current.playSoundEffect('chime')
    expect(mockPlaySound).not.toHaveBeenCalled()
  })

  it('plays when wr_sound_effects_enabled not set (default true)', () => {
    // No localStorage key set — should default to enabled
    const { result } = renderHook(() => useSoundEffects())
    result.current.playSoundEffect('bell')
    expect(mockPlaySound).toHaveBeenCalledWith(expect.anything(), 'bell')
  })

  it('fails silently when engine.ensureContext throws', () => {
    mockEnsureContext.mockImplementation(() => {
      throw new Error('AudioContext failed')
    })
    const { result } = renderHook(() => useSoundEffects())
    expect(() => result.current.playSoundEffect('chime')).not.toThrow()
    expect(mockPlaySound).not.toHaveBeenCalled()
  })

  it('calls engine.ensureContext to get AudioContext', () => {
    const { result } = renderHook(() => useSoundEffects())
    result.current.playSoundEffect('sparkle')
    expect(mockEnsureContext).toHaveBeenCalled()
  })
})
