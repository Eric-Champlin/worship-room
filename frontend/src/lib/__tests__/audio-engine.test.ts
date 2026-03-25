// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck -- Web Audio API mocks are intentionally loose-typed
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AudioEngineService } from '../audio-engine'
import { AUDIO_CONFIG } from '@/constants/audio'

// ── Web Audio API mocks ──────────────────────────────────────────────

function createMockGainNode() {
  return {
    gain: {
      value: 1,
      linearRampToValueAtTime: vi.fn(),
      cancelScheduledValues: vi.fn(),
      setValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
    disconnect: vi.fn(),
  }
}

function createMockSourceNode() {
  return {
    buffer: null as AudioBuffer | null,
    loop: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  }
}

function createMockMediaElementSource() {
  return {
    connect: vi.fn(),
  }
}

const FAKE_BUFFER = {
  duration: 240,
  length: 240 * 44100,
  numberOfChannels: 2,
  sampleRate: 44100,
  getChannelData: vi.fn(),
  copyFromChannel: vi.fn(),
  copyToChannel: vi.fn(),
} as unknown as AudioBuffer

function createMockAudioElement() {
  return {
    src: '',
    loop: false,
    crossOrigin: null as string | null,
    currentTime: 0,
    duration: 0,
    play: vi.fn(() => Promise.resolve()),
    pause: vi.fn(),
    removeAttribute: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }
}

function createMockAudioContext(masterGain: ReturnType<typeof createMockGainNode>) {
  const ctx = {
    state: 'running' as string,
    currentTime: 0,
    destination: {},
    createGain: vi.fn(() => createMockGainNode()),
    createBufferSource: vi.fn(() => createMockSourceNode()),
    createMediaElementSource: vi.fn(() => createMockMediaElementSource()),
    decodeAudioData: vi.fn().mockResolvedValue(FAKE_BUFFER),
    suspend: vi.fn(() => Promise.resolve()),
    resume: vi.fn(() => Promise.resolve()),
    close: vi.fn(() => Promise.resolve()),
  }
  // First createGain call returns the master gain
  ctx.createGain.mockReturnValueOnce(masterGain as unknown as GainNode)
  return ctx
}

describe('AudioEngineService', () => {
  let service: AudioEngineService
  let mockMasterGain: ReturnType<typeof createMockGainNode>
  let mockCtx: ReturnType<typeof createMockAudioContext>
  let originalAudioContext: typeof globalThis.AudioContext
  let originalAudio: typeof globalThis.Audio
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    mockMasterGain = createMockGainNode()
    mockCtx = createMockAudioContext(mockMasterGain)

    originalAudioContext = globalThis.AudioContext
    originalAudio = globalThis.Audio
    originalFetch = globalThis.fetch

    const MockAudioContextCtor = function (this: typeof mockCtx) {
      Object.assign(this, mockCtx)
    } as unknown as typeof AudioContext
    globalThis.AudioContext = MockAudioContextCtor

    const MockAudioCtor = function (this: ReturnType<typeof createMockAudioElement>, url?: string) {
      const el = createMockAudioElement()
      if (url) el.src = url
      Object.assign(this, el)
    } as unknown as typeof Audio
    globalThis.Audio = MockAudioCtor

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
    })

    service = new AudioEngineService()
  })

  afterEach(() => {
    globalThis.AudioContext = originalAudioContext
    globalThis.Audio = originalAudio
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  // ── ensureContext ──────────────────────────────────────────────────

  describe('ensureContext', () => {
    it('creates AudioContext lazily on first call', () => {
      const ctx = service.ensureContext()
      expect(ctx).toBeDefined()
      expect(ctx.createGain).toBeDefined()
    })

    it('returns the same context on subsequent calls', () => {
      const ctx1 = service.ensureContext()
      const ctx2 = service.ensureContext()
      expect(ctx1).toBe(ctx2)
    })

    it('creates master GainNode connected to destination', () => {
      service.ensureContext()
      expect(mockCtx.createGain).toHaveBeenCalled()
      expect(mockMasterGain.connect).toHaveBeenCalledWith(mockCtx.destination)
    })

    it('resumes suspended AudioContext', () => {
      mockCtx.state = 'suspended'
      service.ensureContext()
      service.ensureContext()
      expect(mockCtx.resume).toHaveBeenCalled()
    })
  })

  // ── setMasterVolume ────────────────────────────────────────────────

  describe('setMasterVolume', () => {
    it('calls linearRampToValueAtTime with correct ramp', () => {
      service.ensureContext()
      service.setMasterVolume(0.5)
      expect(mockMasterGain.gain.cancelScheduledValues).toHaveBeenCalledWith(0)
      expect(mockMasterGain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(
        0.5,
        AUDIO_CONFIG.VOLUME_RAMP_MS / 1000,
      )
    })

    it('does nothing if context not initialized', () => {
      service.setMasterVolume(0.5)
      expect(mockMasterGain.gain.linearRampToValueAtTime).not.toHaveBeenCalled()
    })
  })

  // ── addSound (async, AudioBufferSourceNode) ────────────────────────

  describe('addSound', () => {
    it('fetches and decodes audio when buffer not cached', async () => {
      await service.addSound('rain', '/audio/rain.mp3', 0.6)

      expect(globalThis.fetch).toHaveBeenCalledWith('/audio/rain.mp3')
      expect(mockCtx.decodeAudioData).toHaveBeenCalled()
    })

    it('reuses cached buffer on second call with same soundId (after remove)', async () => {
      vi.useFakeTimers()
      await service.addSound('rain', '/audio/rain.mp3', 0.6)
      service.removeSound('rain')

      vi.advanceTimersByTime(AUDIO_CONFIG.SOUND_FADE_OUT_MS + 100)
      vi.mocked(globalThis.fetch).mockClear()
      vi.mocked(mockCtx.decodeAudioData).mockClear()

      await service.addSound('rain', '/audio/rain.mp3', 0.6)

      expect(globalThis.fetch).not.toHaveBeenCalled()
      expect(mockCtx.decodeAudioData).not.toHaveBeenCalled()
      vi.useRealTimers()
    })

    it('creates AudioBufferSourceNode connected to gain and master', async () => {
      await service.addSound('rain', '/audio/rain.mp3', 0.6)

      expect(mockCtx.createBufferSource).toHaveBeenCalled()
      const source = mockCtx.createBufferSource.mock.results[0]!.value
      expect(source.connect).toHaveBeenCalled()
      expect(source.start).toHaveBeenCalledWith(0)
    })

    it('starts source with gain ramp from 0 to volume over 1s', async () => {
      await service.addSound('rain', '/audio/rain.mp3', 0.6)

      // Second createGain call is the per-sound gain (first is master)
      const perSoundGain = mockCtx.createGain.mock.results[1]!.value
      expect(perSoundGain.gain.setValueAtTime).toHaveBeenCalledWith(0, expect.any(Number))
      expect(perSoundGain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(
        0.6,
        expect.any(Number),
      )
    })

    it('does not re-add existing sound (updates volume instead)', async () => {
      await service.addSound('rain', '/audio/rain.mp3', 0.6)
      await service.addSound('rain', '/audio/rain.mp3', 0.8)

      // createBufferSource should only be called once (not re-added)
      expect(mockCtx.createBufferSource).toHaveBeenCalledTimes(1)
    })

    it('increments sound count', async () => {
      expect(service.getSoundCount()).toBe(0)
      await service.addSound('rain', '/audio/rain.mp3', 0.6)
      expect(service.getSoundCount()).toBe(1)
    })

    it('throws on fetch failure', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response)

      await expect(service.addSound('rain', '/audio/rain.mp3', 0.6)).rejects.toThrow(
        'Failed to fetch /audio/rain.mp3: 404',
      )
    })
  })

  // ── removeSound ────────────────────────────────────────────────────

  describe('removeSound', () => {
    it('clears loop timer and fades out gain over 1s', async () => {
      vi.useFakeTimers()
      const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout')

      await service.addSound('rain', '/audio/rain.mp3', 0.6)
      service.removeSound('rain')

      // Loop timer cleared
      expect(clearTimeoutSpy).toHaveBeenCalled()

      // Gain ramp to 0 scheduled
      const perSoundGain = mockCtx.createGain.mock.results[1]!.value
      expect(perSoundGain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(
        0,
        expect.any(Number),
      )

      // After fade completes, source is disconnected
      vi.advanceTimersByTime(AUDIO_CONFIG.SOUND_FADE_OUT_MS + 100)
      const source = mockCtx.createBufferSource.mock.results[0]!.value
      expect(source.disconnect).toHaveBeenCalled()
      expect(perSoundGain.disconnect).toHaveBeenCalled()
      expect(service.getSoundCount()).toBe(0)

      clearTimeoutSpy.mockRestore()
      vi.useRealTimers()
    })

    it('does not clear buffer cache', async () => {
      await service.addSound('rain', '/audio/rain.mp3', 0.6)
      service.removeSound('rain')

      expect(service.isBufferCached('rain')).toBe(true)
    })

    it('does nothing for unknown soundId', () => {
      service.ensureContext()
      service.removeSound('nonexistent')
      // No error thrown
    })
  })

  // ── setSoundVolume ─────────────────────────────────────────────────

  describe('setSoundVolume', () => {
    it('updates stored volume and ramps gain', async () => {
      await service.addSound('rain', '/audio/rain.mp3', 0.6)
      service.setSoundVolume('rain', 0.8)

      const perSoundGain = mockCtx.createGain.mock.results[1]!.value
      const rampCalls = perSoundGain.gain.linearRampToValueAtTime.mock.calls
      const lastCall = rampCalls[rampCalls.length - 1]
      expect(lastCall[0]).toBe(0.8)
    })
  })

  // ── stopAll ────────────────────────────────────────────────────────

  describe('stopAll', () => {
    it('clears all loop timers and disconnects all sources', async () => {
      vi.useFakeTimers()
      const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout')

      await service.addSound('rain', '/audio/rain.mp3', 0.6)
      await service.addSound('wind', '/audio/wind.mp3', 0.5)

      service.stopAll()

      expect(clearTimeoutSpy).toHaveBeenCalled()
      expect(service.getSoundCount()).toBe(0)
      // Buffer cache preserved
      expect(service.isBufferCached('rain')).toBe(true)

      clearTimeoutSpy.mockRestore()
      vi.useRealTimers()
    })

    it('suspends AudioContext', () => {
      service.ensureContext()
      service.stopAll()
      expect(mockCtx.suspend).toHaveBeenCalled()
    })
  })

  // ── pauseAll / resumeAll ───────────────────────────────────────────

  describe('pauseAll / resumeAll', () => {
    it('suspends AudioContext on pauseAll', () => {
      service.ensureContext()
      service.pauseAll()
      expect(mockCtx.suspend).toHaveBeenCalled()
    })

    it('resumes AudioContext on resumeAll', () => {
      const ctx = service.ensureContext()
      service.pauseAll()
      // Simulate the context being suspended (pauseAll calls suspend)
      ;(ctx as unknown as { state: string }).state = 'suspended'
      service.resumeAll()
      expect(ctx.resume).toHaveBeenCalled()
    })
  })

  // ── foreground playback (unchanged — still uses <audio>) ──────────

  describe('playForeground', () => {
    it('creates foreground audio element', () => {
      service.ensureContext()
      const el = service.playForeground('/audio/scripture/psalm23.mp3')
      expect(el).toBeDefined()
    })

    it('connects through foreground gain to master', () => {
      service.ensureContext()
      const fgGain = createMockGainNode()
      mockCtx.createGain.mockReturnValueOnce(fgGain as unknown as GainNode)

      service.playForeground('/audio/scripture/psalm23.mp3')
      expect(fgGain.connect).toHaveBeenCalledWith(mockMasterGain)
    })
  })

  describe('seekForeground', () => {
    it('sets currentTime on foreground element', () => {
      service.ensureContext()
      const el = service.playForeground('/audio/scripture/psalm23.mp3')
      service.seekForeground(30)
      expect((el as unknown as ReturnType<typeof createMockAudioElement>).currentTime).toBe(30)
    })
  })

  // ── isBufferCached ─────────────────────────────────────────────────

  describe('isBufferCached', () => {
    it('returns false for uncached sound', () => {
      expect(service.isBufferCached('rain')).toBe(false)
    })

    it('returns true after sound is loaded', async () => {
      await service.addSound('rain', '/audio/rain.mp3', 0.6)
      expect(service.isBufferCached('rain')).toBe(true)
    })
  })

  // ── scheduleSleepFade ──────────────────────────────────────────────

  describe('scheduleSleepFade', () => {
    it('schedules smart fade on foreground + ambient', async () => {
      service.ensureContext()
      service.playForeground('/audio/scripture/psalm23.mp3')
      await service.addSound('rain', '/audio/rain.mp3', 0.6)

      service.scheduleSleepFade(60, true, true)

      // Foreground gain: ramp to 0 at 60% of 60s = 36s
      const fgGain = mockCtx.createGain.mock.results[1]!.value
      expect(fgGain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0, 60 * 0.6)

      // Ambient gain: hold at 40% (24s), ramp to 0 at 60s
      const ambientGain = mockCtx.createGain.mock.results[2]!.value
      const rampCalls = ambientGain.gain.linearRampToValueAtTime.mock.calls
      const lastRamp = rampCalls[rampCalls.length - 1]
      expect(lastRamp[0]).toBe(0)
      expect(lastRamp[1]).toBe(60)
    })

    it('uses full-duration linear fade with only ambient', async () => {
      service.ensureContext()
      await service.addSound('rain', '/audio/rain.mp3', 0.6)

      service.scheduleSleepFade(30, false, true)

      const ambientGain = mockCtx.createGain.mock.results[1]!.value
      const rampCalls = ambientGain.gain.linearRampToValueAtTime.mock.calls
      const lastRamp = rampCalls[rampCalls.length - 1]
      expect(lastRamp[0]).toBe(0)
      expect(lastRamp[1]).toBe(30)
    })

    it('uses full-duration linear fade with only foreground', () => {
      service.ensureContext()
      service.playForeground('/audio/scripture/psalm23.mp3')

      service.scheduleSleepFade(30, true, false)

      const fgGain = mockCtx.createGain.mock.results[1]!.value
      expect(fgGain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0, 30)
    })

    it('does nothing if no audio context', () => {
      // Don't call ensureContext
      expect(() => service.scheduleSleepFade(30, true, true)).not.toThrow()
    })
  })

  // ── freezeFades ────────────────────────────────────────────────────

  describe('freezeFades', () => {
    it('cancels scheduled values and returns current gains', async () => {
      service.ensureContext()
      service.playForeground('/audio/scripture/psalm23.mp3')
      await service.addSound('rain', '/audio/rain.mp3', 0.6)

      const result = service.freezeFades()

      // Foreground gain: cancelScheduledValues was called
      const fgGain = mockCtx.createGain.mock.results[1]!.value
      expect(fgGain.gain.cancelScheduledValues).toHaveBeenCalled()

      // Ambient gain: cancelScheduledValues was called
      const ambientGain = mockCtx.createGain.mock.results[2]!.value
      expect(ambientGain.gain.cancelScheduledValues).toHaveBeenCalled()

      expect(result.foregroundGain).toBeTypeOf('number')
      expect(result.ambientGains).toBeInstanceOf(Map)
      expect(result.ambientGains.has('rain')).toBe(true)
    })
  })

  // ── breatheUpAmbient ───────────────────────────────────────────────

  describe('breatheUpAmbient', () => {
    it('ramps each sound to stored volume', async () => {
      service.ensureContext()
      await service.addSound('rain', '/audio/rain.mp3', 0.6)
      await service.addSound('wind', '/audio/wind.mp3', 0.4)

      service.breatheUpAmbient(5000)

      // Each sound gain should ramp to its stored volume
      const rainGain = mockCtx.createGain.mock.results[1]!.value
      const rainRampCalls = rainGain.gain.linearRampToValueAtTime.mock.calls
      const lastRainRamp = rainRampCalls[rainRampCalls.length - 1]
      expect(lastRainRamp[0]).toBe(0.6)
      expect(lastRainRamp[1]).toBe(5) // 5000ms / 1000

      const windGain = mockCtx.createGain.mock.results[2]!.value
      const windRampCalls = windGain.gain.linearRampToValueAtTime.mock.calls
      const lastWindRamp = windRampCalls[windRampCalls.length - 1]
      expect(lastWindRamp[0]).toBe(0.4)
      expect(lastWindRamp[1]).toBe(5)
    })
  })
})
