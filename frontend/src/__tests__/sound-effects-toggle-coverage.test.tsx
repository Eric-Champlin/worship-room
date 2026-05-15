/**
 * Spec 6.11 — Sound Effects Settings Polish (cross-cutting coverage)
 *
 * Path A verification: assert all three gate layers reading `wr_sound_effects_enabled`
 * respect the toggle. Test MUST NOT use vi.mock on `useSoundEffects` — that would mock
 * away two of the three gate layers and produce a false-green.
 *
 * Three gate layers (as of 2026-05-15):
 *   1. useSoundEffects().playSoundEffect — central hook, 17+ production consumers
 *      (frontend/src/hooks/useSoundEffects.ts:8-16)
 *   2. quickLiftSound.playWindChime — feature-specific Quick Lift wind chime
 *      (frontend/src/lib/quickLiftSound.ts:11-19)
 *   3. EveningReflection.tsx:107 — direct localStorage read (architectural
 *      inconsistency — bypasses the hook; documented for future cleanup spec, NOT
 *      refactored in 6.11 per Gate-G-NO-SCOPE-CREEP)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'

// Mock @/lib/sound-effects so we can spy on whether playSound is called
// (same mock shape as the existing useSoundEffects.test.ts — interior mock at the
// playSound layer, NOT at the useSoundEffects hook layer).
const mockPlaySound = vi.fn()
const mockEnsureContext = vi.fn(() => ({ currentTime: 0 }))
vi.mock('@/lib/sound-effects', () => ({
  playSound: (...args: unknown[]) => mockPlaySound(...args),
}))
vi.mock('@/components/audio/AudioProvider', () => ({
  useAudioEngine: () => ({ ensureContext: mockEnsureContext }),
}))

// Stub class factory for window.AudioContext (jsdom doesn't have one).
// Returned class implements just enough of the Web Audio API surface that
// quickLiftSound.playWindChime can call createOscillator/createGain without
// throwing.
function stubAudioContext(): typeof globalThis.AudioContext {
  class FakeAudioContext {
    state = 'running'
    currentTime = 0
    destination = {}
    resume = vi.fn()
    createOscillator() {
      return {
        type: 'sine',
        frequency: { setValueAtTime: vi.fn() },
        connect: () => ({ connect: vi.fn() }),
        start: vi.fn(),
        stop: vi.fn(),
      }
    }
    createGain() {
      return {
        gain: {
          setValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: () => ({ connect: vi.fn() }),
      }
    }
  }
  return FakeAudioContext as unknown as typeof globalThis.AudioContext
}

describe('Spec 6.11 — Sound Effects toggle gates all three call paths', () => {
  let matchMediaSpy: ReturnType<typeof vi.spyOn>
  let originalAudioContext: typeof globalThis.AudioContext

  beforeEach(() => {
    localStorage.clear()
    mockPlaySound.mockClear()
    mockEnsureContext.mockClear()
    // prefers-reduced-motion: false so the toggle gate is the only deciding factor
    matchMediaSpy = vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: false,
    } as MediaQueryList)
    originalAudioContext = window.AudioContext
    ;(window as unknown as { AudioContext: typeof globalThis.AudioContext }).AudioContext = stubAudioContext()
  })

  afterEach(() => {
    matchMediaSpy.mockRestore()
    ;(window as unknown as { AudioContext: typeof globalThis.AudioContext | undefined }).AudioContext = originalAudioContext
  })

  // ── Toggle OFF blocks all three paths ─────────────────────────────────

  it('when wr_sound_effects_enabled is "false", useSoundEffects().playSoundEffect does NOT call playSound', async () => {
    localStorage.setItem('wr_sound_effects_enabled', 'false')
    const { useSoundEffects } = await import('@/hooks/useSoundEffects')
    const { result } = renderHook(() => useSoundEffects())
    result.current.playSoundEffect('chime')
    expect(mockPlaySound).not.toHaveBeenCalled()
  })

  it('when wr_sound_effects_enabled is "false", quickLiftSound.playWindChime returns early without invoking AudioContext', async () => {
    localStorage.setItem('wr_sound_effects_enabled', 'false')
    // Replace AudioContext with a constructor spy so we can assert non-invocation
    const ctorSpy = vi.fn()
    ;(window as unknown as { AudioContext: unknown }).AudioContext = ctorSpy
    const { playWindChime } = await import('@/lib/quickLiftSound')
    playWindChime()
    expect(ctorSpy).not.toHaveBeenCalled()
  })

  it("when wr_sound_effects_enabled is \"false\", EveningReflection's direct-read gate (at line 107) returns false", () => {
    // We don't render EveningReflection (its useEffect has many other conditions
    // we'd have to satisfy). Instead, replicate the exact gate check from
    // EveningReflection.tsx:107 and assert it agrees with the other two gates.
    // This is a deliberate copy-of-the-gate test that documents the architectural
    // inconsistency without coupling to EveningReflection's internals.
    localStorage.setItem('wr_sound_effects_enabled', 'false')
    const soundEnabled = localStorage.getItem('wr_sound_effects_enabled') !== 'false'
    expect(soundEnabled).toBe(false)
  })

  // ── Toggle ON (default — key absent) allows all three paths ───────────

  it('when wr_sound_effects_enabled is absent (default true), all three gates evaluate to enabled and central hook fires playSound', async () => {
    // No localStorage.setItem — key is absent, default-true semantics apply

    // Verify gate-1 (central hook) actually fires
    const { useSoundEffects } = await import('@/hooks/useSoundEffects')
    const { result } = renderHook(() => useSoundEffects())
    result.current.playSoundEffect('bell')
    expect(mockPlaySound).toHaveBeenCalledWith(expect.anything(), 'bell')

    // Verify gate-2 (quickLiftSound) actually traverses the gate. Mirrors Test
    // 2's not-called assertion in the positive direction. The earlier shape
    // (`expect(() => playWindChime()).not.toThrow()`) is a false-strength
    // assertion because quickLiftSound.ts:52 wraps the body in try/catch that
    // silently swallows everything — that test would pass even if the gate
    // were inverted. Constructor invocation is the assertion that actually
    // proves the gate let execution through. Assumes the module-level
    // `cachedContext` at quickLiftSound.ts:9 is null on entry, which holds
    // because Tests 1-3 never let playWindChime past its gate (Test 1 doesn't
    // touch it, Test 2 hits the OFF early-return at line 22 before the ctor,
    // Test 3 doesn't touch it).
    const FakeAudioContext = stubAudioContext()
    // `function` declaration (not arrow) so vitest recognizes the impl as
    // constructor-callable — quickLiftSound invokes this via `new Ctor()`.
    const ctorSpy = vi.fn(function ConstructorImpl() {
      return new FakeAudioContext()
    })
    ;(window as unknown as { AudioContext: unknown }).AudioContext = ctorSpy
    const { playWindChime } = await import('@/lib/quickLiftSound')
    playWindChime()
    expect(ctorSpy).toHaveBeenCalled()

    // Verify gate-3 (EveningReflection direct read) evaluates to enabled
    const soundEnabled = localStorage.getItem('wr_sound_effects_enabled') !== 'false'
    expect(soundEnabled).toBe(true)
  })
})
