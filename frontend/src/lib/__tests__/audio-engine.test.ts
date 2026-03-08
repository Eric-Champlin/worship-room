// @ts-nocheck -- Web Audio API mocks are intentionally loose-typed
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AudioEngineService } from '../audio-engine'
import { AUDIO_CONFIG } from '@/constants/audio'

// --- Web Audio API mocks ---

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
    connect: vi.fn(),
    disconnect: vi.fn(),
  }
}

function createMockAudioContext(masterGain: ReturnType<typeof createMockGainNode>) {
  const ctx = {
    state: 'running' as string,
    currentTime: 0,
    destination: {},
    createGain: vi.fn(() => createMockGainNode()),
    createMediaElementSource: vi.fn(() => createMockSourceNode()),
    suspend: vi.fn(() => Promise.resolve()),
    resume: vi.fn(() => Promise.resolve()),
    close: vi.fn(() => Promise.resolve()),
  }
  // First createGain call returns the master gain
  ctx.createGain.mockReturnValueOnce(masterGain as unknown as GainNode)
  return ctx
}

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

describe('AudioEngineService', () => {
  let service: AudioEngineService
  let mockMasterGain: ReturnType<typeof createMockGainNode>
  let mockCtx: ReturnType<typeof createMockAudioContext>
  let originalAudioContext: typeof globalThis.AudioContext
  let originalAudio: typeof globalThis.Audio

  beforeEach(() => {
    mockMasterGain = createMockGainNode()
    mockCtx = createMockAudioContext(mockMasterGain)

    originalAudioContext = globalThis.AudioContext
    originalAudio = globalThis.Audio

    // Must use a real constructor function for `new AudioContext()` to work
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

    service = new AudioEngineService()
  })

  afterEach(() => {
    globalThis.AudioContext = originalAudioContext
    globalThis.Audio = originalAudio
    vi.restoreAllMocks()
  })

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
      service.ensureContext() // second call — context already exists but suspended
      expect(mockCtx.resume).toHaveBeenCalled()
    })
  })

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

  describe('addSound', () => {
    it('creates audio element and connects to context', () => {
      service.ensureContext()
      service.addSound('rain', '/audio/ambient/rain.mp3', 0.6)

      expect(mockCtx.createMediaElementSource).toHaveBeenCalled()
      expect(service.getSoundCount()).toBe(1)
    })

    it('creates per-sound GainNode and connects to master', () => {
      service.ensureContext()

      const perSoundGain = createMockGainNode()
      mockCtx.createGain.mockReturnValueOnce(perSoundGain as unknown as GainNode)

      service.addSound('rain', '/audio/ambient/rain.mp3', 0.6)

      expect(perSoundGain.connect).toHaveBeenCalledWith(mockMasterGain)
    })

    it('fades in with linearRampToValueAtTime', () => {
      service.ensureContext()

      const perSoundGain = createMockGainNode()
      mockCtx.createGain.mockReturnValueOnce(perSoundGain as unknown as GainNode)

      service.addSound('rain', '/audio/ambient/rain.mp3', 0.6)

      expect(perSoundGain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(
        0.6,
        AUDIO_CONFIG.SOUND_FADE_IN_MS / 1000,
      )
    })

    it('does not re-add existing sound', () => {
      service.ensureContext()
      service.addSound('rain', '/audio/ambient/rain.mp3', 0.6)
      service.addSound('rain', '/audio/ambient/rain.mp3', 0.8)

      // createMediaElementSource should only be called once for this soundId
      expect(mockCtx.createMediaElementSource).toHaveBeenCalledTimes(1)
    })

    it('increments sound count', () => {
      service.ensureContext()
      expect(service.getSoundCount()).toBe(0)
      service.addSound('rain', '/audio/ambient/rain.mp3', 0.6)
      expect(service.getSoundCount()).toBe(1)
    })
  })

  describe('removeSound', () => {
    it('fades out and disconnects after delay', () => {
      vi.useFakeTimers()
      service.ensureContext()

      const perSoundGain = createMockGainNode()
      mockCtx.createGain.mockReturnValueOnce(perSoundGain as unknown as GainNode)
      const sourceNode = createMockSourceNode()
      mockCtx.createMediaElementSource.mockReturnValueOnce(
        sourceNode as unknown as MediaElementAudioSourceNode,
      )

      service.addSound('rain', '/audio/ambient/rain.mp3', 0.6)
      service.removeSound('rain')

      expect(perSoundGain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(
        0,
        AUDIO_CONFIG.SOUND_FADE_OUT_MS / 1000,
      )

      vi.advanceTimersByTime(AUDIO_CONFIG.SOUND_FADE_OUT_MS)

      expect(sourceNode.disconnect).toHaveBeenCalled()
      expect(perSoundGain.disconnect).toHaveBeenCalled()
      expect(service.getSoundCount()).toBe(0)

      vi.useRealTimers()
    })

    it('does nothing for unknown soundId', () => {
      service.ensureContext()
      service.removeSound('nonexistent')
      // No error thrown
    })
  })

  describe('stopAll', () => {
    it('suspends AudioContext', () => {
      service.ensureContext()
      service.stopAll()
      expect(mockCtx.suspend).toHaveBeenCalled()
    })
  })

  describe('pauseAll / resumeAll', () => {
    it('pauses all audio elements', () => {
      service.ensureContext()
      const el = service.addSound('rain', '/audio/ambient/rain.mp3', 0.6)
      service.pauseAll()
      expect((el as unknown as ReturnType<typeof createMockAudioElement>).pause).toHaveBeenCalled()
    })

    it('resumes all audio elements', () => {
      service.ensureContext()
      const el = service.addSound('rain', '/audio/ambient/rain.mp3', 0.6)
      service.pauseAll()
      service.resumeAll()
      // play called once on add, once on resume
      expect((el as unknown as ReturnType<typeof createMockAudioElement>).play).toHaveBeenCalledTimes(2)
    })
  })

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
})
