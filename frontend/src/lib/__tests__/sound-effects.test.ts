// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck -- Web Audio API mocks are intentionally loose-typed
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { playSound, SOUND_VOLUMES, _resetNoiseBufferCache } from '../sound-effects'
import type { SoundEffectId } from '../sound-effects'

// ── Web Audio API mocks ──────────────────────────────────────────────

function createMockGainNode() {
  return {
    gain: {
      value: 1,
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
    disconnect: vi.fn(),
  }
}

function createMockOscillator() {
  return {
    type: 'sine',
    frequency: { value: 0 },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  }
}

function createMockBufferSource() {
  return {
    buffer: null,
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  }
}

function createMockBiquadFilter() {
  return {
    type: 'lowpass',
    frequency: { value: 0 },
    Q: { value: 0 },
    connect: vi.fn(),
  }
}

function createMockAudioContext() {
  return {
    currentTime: 0,
    sampleRate: 44100,
    destination: { type: 'destination' },
    createOscillator: vi.fn(() => createMockOscillator()),
    createGain: vi.fn(() => createMockGainNode()),
    createBuffer: vi.fn((channels: number, length: number, sampleRate: number) => ({
      duration: length / sampleRate,
      length,
      sampleRate,
      numberOfChannels: channels,
      getChannelData: vi.fn(() => new Float32Array(length)),
    })),
    createBufferSource: vi.fn(() => createMockBufferSource()),
    createBiquadFilter: vi.fn(() => createMockBiquadFilter()),
  }
}

// ── Tests ────────────────────────────────────────────────────────────

describe('sound-effects', () => {
  let ctx: ReturnType<typeof createMockAudioContext>

  beforeEach(() => {
    ctx = createMockAudioContext()
    _resetNoiseBufferCache()
  })

  describe('SoundEffectId type coverage', () => {
    it('all 6 sound IDs are valid and can be played', () => {
      const ids: SoundEffectId[] = ['chime', 'ascending', 'harp', 'bell', 'whisper', 'sparkle']
      ids.forEach((id) => {
        expect(() => playSound(ctx as unknown as AudioContext, id)).not.toThrow()
      })
    })
  })

  describe('SOUND_VOLUMES', () => {
    it('has correct values for all sounds', () => {
      expect(SOUND_VOLUMES.chime).toBe(0.3)
      expect(SOUND_VOLUMES.ascending).toBe(0.3)
      expect(SOUND_VOLUMES.harp).toBe(0.3)
      expect(SOUND_VOLUMES.bell).toBe(0.3)
      expect(SOUND_VOLUMES.whisper).toBe(0.15)
      expect(SOUND_VOLUMES.sparkle).toBe(0.1)
    })
  })

  describe('chime', () => {
    it('creates oscillator with sine wave at 528Hz', () => {
      playSound(ctx as unknown as AudioContext, 'chime')
      expect(ctx.createOscillator).toHaveBeenCalledTimes(1)
      const osc = ctx.createOscillator.mock.results[0].value
      expect(osc.type).toBe('sine')
      expect(osc.frequency.value).toBe(528)
      expect(osc.connect).toHaveBeenCalled()
      expect(osc.start).toHaveBeenCalled()
      expect(osc.stop).toHaveBeenCalled()
    })
  })

  describe('ascending', () => {
    it('creates 3 oscillators at 396, 528, 660 Hz', () => {
      playSound(ctx as unknown as AudioContext, 'ascending')
      expect(ctx.createOscillator).toHaveBeenCalledTimes(3)
      const frequencies = ctx.createOscillator.mock.results.map(
        (r: { value: { frequency: { value: number } } }) => r.value.frequency.value,
      )
      expect(frequencies).toEqual([396, 528, 660])
    })
  })

  describe('harp', () => {
    it('creates triangle wave oscillators at 440 and 441 Hz (chorus)', () => {
      playSound(ctx as unknown as AudioContext, 'harp')
      expect(ctx.createOscillator).toHaveBeenCalledTimes(2)
      const oscs = ctx.createOscillator.mock.results.map(
        (r: { value: { type: string; frequency: { value: number } } }) => r.value,
      )
      expect(oscs[0].type).toBe('triangle')
      expect(oscs[0].frequency.value).toBe(440)
      expect(oscs[1].type).toBe('triangle')
      expect(oscs[1].frequency.value).toBe(441)
    })
  })

  describe('bell', () => {
    it('creates sine wave oscillator at 784Hz', () => {
      playSound(ctx as unknown as AudioContext, 'bell')
      expect(ctx.createOscillator).toHaveBeenCalledTimes(1)
      const osc = ctx.createOscillator.mock.results[0].value
      expect(osc.type).toBe('sine')
      expect(osc.frequency.value).toBe(784)
    })
  })

  describe('whisper', () => {
    it('creates noise buffer with bandpass filter at 800Hz', () => {
      playSound(ctx as unknown as AudioContext, 'whisper')
      expect(ctx.createBuffer).toHaveBeenCalledTimes(1)
      expect(ctx.createBufferSource).toHaveBeenCalledTimes(1)
      expect(ctx.createBiquadFilter).toHaveBeenCalledTimes(1)
      const filter = ctx.createBiquadFilter.mock.results[0].value
      expect(filter.type).toBe('bandpass')
      expect(filter.frequency.value).toBe(800)
      expect(filter.Q.value).toBe(2)
    })

    it('caches noise buffer on second call', () => {
      playSound(ctx as unknown as AudioContext, 'whisper')
      playSound(ctx as unknown as AudioContext, 'whisper')
      expect(ctx.createBuffer).toHaveBeenCalledTimes(1)
    })
  })

  describe('sparkle', () => {
    it('creates 2 sine oscillators at 1047 and 1319 Hz', () => {
      playSound(ctx as unknown as AudioContext, 'sparkle')
      expect(ctx.createOscillator).toHaveBeenCalledTimes(2)
      const frequencies = ctx.createOscillator.mock.results.map(
        (r: { value: { frequency: { value: number } } }) => r.value.frequency.value,
      )
      expect(frequencies).toEqual([1047, 1319])
    })
  })

  describe('error handling', () => {
    it('fails silently when AudioContext throws', () => {
      ctx.createOscillator.mockImplementation(() => {
        throw new Error('AudioContext not available')
      })
      expect(() => playSound(ctx as unknown as AudioContext, 'chime')).not.toThrow()
    })
  })
})
