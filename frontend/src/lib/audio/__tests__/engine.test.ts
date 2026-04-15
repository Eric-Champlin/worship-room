import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock howler. We use vi.hoisted so we can capture the Howl constructor spy
// and also rewrite its behavior per-test (e.g., to fire onload callbacks with
// specific durations, or to return a missing _sounds field).

const hoisted = vi.hoisted(() => {
  type Options = Record<string, unknown>
  const howlInstances: Array<{
    options: Options
    play: ReturnType<typeof vi.fn>
    pause: ReturnType<typeof vi.fn>
    stop: ReturnType<typeof vi.fn>
    seek: ReturnType<typeof vi.fn>
    rate: ReturnType<typeof vi.fn>
    duration: ReturnType<typeof vi.fn>
    unload: ReturnType<typeof vi.fn>
    _sounds?: Array<{ _node?: HTMLAudioElement }>
  }> = []

  const Howl = vi.fn().mockImplementation(function (this: unknown, options: Options) {
    const fakeNode = { crossOrigin: '' } as unknown as HTMLAudioElement
    Object.setPrototypeOf(fakeNode, HTMLAudioElement.prototype)
    const instance = {
      options,
      play: vi.fn(),
      pause: vi.fn(),
      stop: vi.fn(),
      seek: vi.fn().mockReturnValue(0),
      rate: vi.fn(),
      duration: vi.fn().mockReturnValue(180),
      unload: vi.fn(),
      _sounds: [{ _node: fakeNode }],
    }
    howlInstances.push(instance)
    // Return the mutable instance so tests can fire onload etc.
    return instance
  })

  return { Howl, howlInstances }
})

vi.mock('howler', () => ({
  Howl: hoisted.Howl,
}))

import {
  createEngineInstance,
  __resetHowlCtorForTests,
  STALL_ERROR_MESSAGE,
} from '@/lib/audio/engine'

describe('audio engine (BB-26)', () => {
  beforeEach(() => {
    __resetHowlCtorForTests()
    hoisted.howlInstances.length = 0
    hoisted.Howl.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('lazy-loads Howler on first call and caches the constructor on second', async () => {
    const events = {}
    await createEngineInstance('https://cdn.example.com/a.mp3', events)
    const first = hoisted.Howl.mock.calls.length
    await createEngineInstance('https://cdn.example.com/b.mp3', events)
    const second = hoisted.Howl.mock.calls.length
    expect(second).toBe(first + 1)
    // The second call reuses the cached constructor — no "re-import" happens.
  })

  it('engine instance exposes typed methods', async () => {
    const engine = await createEngineInstance('https://cdn.example.com/a.mp3', {})
    expect(typeof engine.play).toBe('function')
    expect(typeof engine.pause).toBe('function')
    expect(typeof engine.stop).toBe('function')
    expect(typeof engine.seek).toBe('function')
    expect(typeof engine.setRate).toBe('function')
    expect(typeof engine.destroy).toBe('function')
    expect(typeof engine.getCurrentTime).toBe('function')
    expect(typeof engine.getDuration).toBe('function')
  })

  it('play triggers Howl.play', async () => {
    const engine = await createEngineInstance('https://cdn.example.com/a.mp3', {})
    engine.play()
    const inst = hoisted.howlInstances[0]
    expect(inst.play).toHaveBeenCalledTimes(1)
  })

  it('pause triggers Howl.pause', async () => {
    const engine = await createEngineInstance('https://cdn.example.com/a.mp3', {})
    engine.pause()
    expect(hoisted.howlInstances[0].pause).toHaveBeenCalledTimes(1)
  })

  it('setRate triggers Howl.rate(r)', async () => {
    const engine = await createEngineInstance('https://cdn.example.com/a.mp3', {})
    engine.setRate(1.5)
    expect(hoisted.howlInstances[0].rate).toHaveBeenCalledWith(1.5)
  })

  it('onPlay event fires through to events hook', async () => {
    const onPlay = vi.fn()
    await createEngineInstance('https://cdn.example.com/a.mp3', { onPlay })
    // Simulate Howler firing its internal onplay — we pull the callback from
    // the captured options object.
    const options = hoisted.howlInstances[0].options as Record<string, () => void>
    options.onplay()
    expect(onPlay).toHaveBeenCalledTimes(1)
  })

  it('onLoad passes duration to events', async () => {
    const onLoad = vi.fn()
    await createEngineInstance('https://cdn.example.com/a.mp3', { onLoad })
    const options = hoisted.howlInstances[0].options as Record<string, () => void>
    options.onload()
    expect(onLoad).toHaveBeenCalledWith(180)
  })

  it('CORS taint: crossOrigin attribute is set on internal audio element', async () => {
    await createEngineInstance('https://cdn.example.com/a.mp3', {})
    const inst = hoisted.howlInstances[0]
    const node = inst._sounds?.[0]?._node
    expect(node?.crossOrigin).toBe('anonymous')
  })

  it('CORS taint: Howler instantiated with html5: true', async () => {
    await createEngineInstance('https://cdn.example.com/a.mp3', {})
    const options = hoisted.howlInstances[0].options as { html5?: boolean }
    expect(options.html5).toBe(true)
  })

  it('Howler instantiated with format: ["mp3"] to override MIME sniffing', async () => {
    await createEngineInstance('https://cdn.example.com/a.mp3', {})
    const options = hoisted.howlInstances[0].options as { format?: string[] }
    expect(options.format).toEqual(['mp3'])
  })

  it('stall timeout: fires onLoadError after 10s of no response', async () => {
    vi.useFakeTimers()
    const onLoadError = vi.fn()
    await createEngineInstance('https://cdn.example.com/a.mp3', { onLoadError })
    vi.advanceTimersByTime(10_000)
    expect(onLoadError).toHaveBeenCalledWith(STALL_ERROR_MESSAGE)
  })

  it('stall timeout: cleared by onload', async () => {
    vi.useFakeTimers()
    const onLoadError = vi.fn()
    await createEngineInstance('https://cdn.example.com/a.mp3', { onLoadError })
    // Fire Howler onload at 2s
    vi.advanceTimersByTime(2000)
    const options = hoisted.howlInstances[0].options as Record<string, () => void>
    options.onload()
    vi.advanceTimersByTime(20_000)
    expect(onLoadError).not.toHaveBeenCalled()
  })

  it('stall timeout: cleared by destroy()', async () => {
    vi.useFakeTimers()
    const onLoadError = vi.fn()
    const engine = await createEngineInstance('https://cdn.example.com/a.mp3', {
      onLoadError,
    })
    vi.advanceTimersByTime(2000)
    engine.destroy()
    vi.advanceTimersByTime(20_000)
    expect(onLoadError).not.toHaveBeenCalled()
  })

  it('CORS failure path is defensive when _sounds is missing', async () => {
    // Override the mock for this test only — Howl returns a stripped instance
    hoisted.Howl.mockImplementationOnce(function (options: Record<string, unknown>) {
      const instance = {
        options,
        play: vi.fn(),
        pause: vi.fn(),
        stop: vi.fn(),
        seek: vi.fn().mockReturnValue(0),
        rate: vi.fn(),
        duration: vi.fn().mockReturnValue(0),
        unload: vi.fn(),
        // _sounds intentionally missing
      }
      hoisted.howlInstances.push(instance)
      return instance
    })
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await expect(
      createEngineInstance('https://cdn.example.com/a.mp3', {}),
    ).resolves.toBeDefined()
    expect(warnSpy).toHaveBeenCalled()
    warnSpy.mockRestore()
  })

  it('CORS taint: warns when _sounds[0]._node is not an HTMLAudioElement', async () => {
    // Override the mock — Howl returns an instance whose _node is a plain
    // object (simulating a Howler version change exposing a different
    // element type). The instanceof check should fail and the diagnostic
    // else-branch should fire a specific warning.
    hoisted.Howl.mockImplementationOnce(function (options: Record<string, unknown>) {
      const plainNode = { crossOrigin: '' } as unknown as HTMLAudioElement
      // Deliberately NOT setting the HTMLAudioElement prototype — instanceof
      // check must fail.
      const instance = {
        options,
        play: vi.fn(),
        pause: vi.fn(),
        stop: vi.fn(),
        seek: vi.fn().mockReturnValue(0),
        rate: vi.fn(),
        duration: vi.fn().mockReturnValue(0),
        unload: vi.fn(),
        _sounds: [{ _node: plainNode }],
      }
      hoisted.howlInstances.push(instance)
      return instance
    })
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await expect(
      createEngineInstance('https://cdn.example.com/a.mp3', {}),
    ).resolves.toBeDefined()
    expect(warnSpy).toHaveBeenCalledWith(
      '[BB-26] Howler _sounds[0]._node is not HTMLAudioElement; BB-27 ducking may be affected.',
    )
    warnSpy.mockRestore()
  })
})
